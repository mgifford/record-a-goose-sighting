/**
 * Element-level locator verification.
 *
 * A registry entry is only reproducible if its locator still resolves to the
 * element it describes. This module resolves every declared locator in a real
 * browser and records targeted evidence. It never reports an unresolved or
 * ambiguous locator as a pass.
 *
 * Ordinary XPath cannot cross iframe document boundaries or shadow roots, so
 * those contexts are declared separately and resolved by chaining Playwright
 * locators instead. Closed shadow roots are recorded as an explicit
 * limitation rather than treated as a resolved target.
 *
 * Locators may declare a `phase`. A locator that disappears as a result of the
 * interaction (for example a removed list item) is verified before the
 * interaction; a locator that only appears afterwards is verified after it.
 * Both passes are recorded so that a "resolved before, detached after" change
 * is evidence rather than an unexplained failure.
 */
import { execSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import { ROOT, buildRegistry } from './registry.mjs'

export const RESOLVED = 'resolved'
export const RESOLVED_AFTER_INTERACTION = 'resolved after interaction'
export const MULTIPLE_MATCHES = 'multiple matches'
export const NOT_FOUND = 'not found'
export const HIDDEN = 'hidden'
export const DETACHED = 'detached'
export const FRAME_INACCESSIBLE = 'frame inaccessible'
export const SHADOW_ROOT_INACCESSIBLE = 'shadow root inaccessible'
export const INTERACTION_FAILED = 'interaction failed'
export const ENVIRONMENT_UNAVAILABLE = 'environment unavailable'
export const MANUAL_VERIFICATION_REQUIRED = 'manual verification required'

export const FAILURE_STATUSES = new Set([
  MULTIPLE_MATCHES,
  NOT_FOUND,
  HIDDEN,
  DETACHED,
  FRAME_INACCESSIBLE,
  INTERACTION_FAILED,
  ENVIRONMENT_UNAVAILABLE
])

function locatorChain (locator) {
  return [...(locator.shadowPath || []), locator.value].join(' >> ')
}

function rootFor (page, locator) {
  let root = page
  for (const frame of locator.framePath || []) {
    // Frame paths in the fixture manifest are relative file names; match them
    // against the iframe src rather than treating them as CSS selectors.
    root = root.frameLocator(`iframe[src$="${frame}"]`)
  }
  return root
}

function buildLocator (page, locator) {
  const root = rootFor(page, locator)

  switch (locator.type) {
    case 'css':
    case 'dom-fingerprint':
      return root.locator(locatorChain(locator))
    case 'id':
      return root.locator(locatorChain({ ...locator, value: `#${locator.value}` }))
    case 'xpath':
    case 'absolute-xpath':
      return root.locator(`xpath=${locator.value}`)
    case 'role':
      return root.getByRole(locator.role, locator.name ? { name: locator.name } : {})
    case 'text':
      return root.getByText(locator.value, { exact: true })
    default:
      return null
  }
}

async function describeAccessibility (locator) {
  try {
    const snapshot = await locator.ariaSnapshot({ timeout: 2000 })
    const first = snapshot.split('\n')[0].trim()
    const match = first.match(/^-\s+([a-z]+)(?:\s+"([^"]*)")?/)
    return {
      snapshot,
      role: match ? match[1] : null,
      name: match && match[2] ? match[2] : ''
    }
  } catch {
    return { snapshot: null, role: null, name: null }
  }
}

async function elementEvidence (locator) {
  const handle = await locator.elementHandle({ timeout: 2000 }).catch(() => null)
  if (!handle) return null

  return handle.evaluate((element) => {
    const walk = (node) => {
      if (!node || node.nodeType !== 1) return null
      if (node === document.documentElement) return '/html'
      const parent = node.parentElement || node.getRootNode()?.host || null
      if (!parent) return null
      const siblings = parent.children ? [...parent.children] : []
      const index = siblings.indexOf(node) + 1
      const tag = node.tagName.toLowerCase()
      const base = walk(parent)
      if (!base) return null
      return node.getRootNode() !== document
        ? `shadow:${base}/${tag}[${index}]`
        : `${base}/${tag}[${index}]`
    }

    const style = getComputedStyle(element)
    const rect = element.getBoundingClientRect()

    return {
      html: element.outerHTML.length > 2000 ? `${element.outerHTML.slice(0, 2000)}…` : element.outerHTML,
      absoluteXPath: walk(element),
      computed: {
        display: style.display,
        visibility: style.visibility,
        color: style.color,
        backgroundColor: style.backgroundColor,
        outlineStyle: style.outlineStyle,
        outlineColor: style.outlineColor
      },
      boundingBox: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      },
      connected: element.isConnected,
      ariaHidden: Boolean(element.closest('[aria-hidden="true"]'))
    }
  })
}

async function resolveLocator (page, defect, locator, { screenshots, artifactDirectory, pass }) {
  if (locator.type === 'document-title') {
    const title = await page.title()
    const hasTitleElement = await page.locator('title').count() > 0
    const entry = {
      type: locator.type,
      value: title,
      count: hasTitleElement ? 1 : 0,
      status: hasTitleElement ? RESOLVED : NOT_FOUND,
      evidence: { title, empty: title.trim() === '' }
    }
    if (!hasTitleElement) entry.status = NOT_FOUND
    return entry
  }

  if (locator.type === 'document-scope') {
    return {
      type: locator.type,
      value: null,
      status: SHADOW_ROOT_INACCESSIBLE,
      note: locator.note ?? 'A closed shadow root cannot be resolved with ordinary DOM locators.'
    }
  }

  const handle = buildLocator(page, locator)
  const entry = {
    type: locator.type,
    value: locator.value ?? locator.role ?? null,
    framePath: locator.framePath ?? null,
    shadowPath: locator.shadowPath ?? null
  }

  if (!handle) {
    return { ...entry, status: MANUAL_VERIFICATION_REQUIRED }
  }

  try {
    const count = await handle.count()
    entry.count = count

    if (count === 0) {
      entry.status = NOT_FOUND
      return entry
    }
    if (count > 1) {
      entry.status = MULTIPLE_MATCHES
      return entry
    }
    if (!(await handle.first().isVisible())) {
      entry.status = HIDDEN
      return entry
    }

    entry.status = pass === 'after' && (defect.interactionSteps?.length ?? 0) > 0 ? RESOLVED_AFTER_INTERACTION : RESOLVED
    entry.accessibility = await describeAccessibility(handle.first())
    entry.evidence = await elementEvidence(handle.first())
    if (entry.evidence && !entry.evidence.connected) entry.status = DETACHED

    if (screenshots && artifactDirectory) {
      fs.mkdirSync(artifactDirectory, { recursive: true })
      const file = path.join(artifactDirectory, `${defect.id}-${pass}-${locator.type}.png`)
      await handle.first().screenshot({ path: file }).catch(() => {})
      entry.screenshot = path.relative(ROOT, file)
    }

    return entry
  } catch (error) {
    const message = error.message.split('\n')[0]
    return {
      ...entry,
      status: /frame/i.test(message) ? FRAME_INACCESSIBLE : ENVIRONMENT_UNAVAILABLE,
      error: message
    }
  }
}

async function resolveAll (page, defect, options) {
  const entries = []
  for (const locator of defect.locators) {
    entries.push(await resolveLocator(page, defect, locator, options))
  }
  return entries
}

async function performInteractions (page, defect) {
  const performed = []
  for (const step of defect.interactionSteps || []) {
    const target = step.selector ? page.locator(step.selector) : null
    switch (step.action) {
      case 'click':
        await target.click()
        break
      case 'focus':
        await target.focus()
        break
      case 'press':
        if (target) {
          await target.press(step.key)
        } else {
          await page.keyboard.press(step.key)
        }
        break
      case 'type':
        await target.fill(step.value ?? '')
        break
      case 'waitFor':
      case 'assert':
        if (target) await target.waitFor({ state: step.state || 'visible' })
        break
      default:
        break
    }
    performed.push(`${step.action}${step.selector ? ` ${step.selector}` : ''}${step.key ? ` ${step.key}` : ''}`)
  }
  return performed
}

function environmentLabel (environment) {
  if (!environment) return 'default browser environment'
  const parts = []
  if (environment.viewport) parts.push(`${environment.viewport.width}x${environment.viewport.height}`)
  if (environment.colorScheme) parts.push(`colour-scheme:${environment.colorScheme}`)
  if (environment.reducedMotion) parts.push(`reduced-motion:${environment.reducedMotion}`)
  if (environment.forcedColors) parts.push(`forced-colors:${environment.forcedColors}`)
  return parts.join(', ') || 'default browser environment'
}

async function applyEnvironment (page, environment) {
  if (!environment) return
  if (environment.viewport) await page.setViewportSize(environment.viewport)
  if (environment.colorScheme || environment.reducedMotion || environment.forcedColors) {
    await page.emulateMedia({
      colorScheme: environment.colorScheme ?? null,
      reducedMotion: environment.reducedMotion ?? null,
      forcedColors: environment.forcedColors ?? null
    })
  }
}

/**
 * Resolve one defect in an already-open page. Returns structured evidence for
 * every locator, the interaction steps and the focus transition.
 */
export async function verifyDefect (page, defect, { baseUrl = null, screenshots = false, artifactDirectory = null } = {}) {
  const target = baseUrl ? new URL(defect.url, baseUrl).href : defect.url
  const result = {
    id: defect.id,
    url: defect.url,
    target,
    environment: environmentLabel(defect.environment),
    timestamp: new Date().toISOString(),
    navigated: false,
    interactions: [],
    focus: { before: null, afterInteraction: null },
    locators: [],
    limitations: [],
    consoleErrors: []
  }

  const onConsole = (message) => {
    if (message.type() === 'error') result.consoleErrors.push(message.text())
  }
  page.on('console', onConsole)

  try {
    await applyEnvironment(page, defect.environment)
    await page.goto(target, { waitUntil: 'load' })
    result.navigated = true
    result.finalUrl = page.url()
    result.title = await page.title()
    result.viewport = page.viewportSize()
    result.devicePixelRatio = await page.evaluate(() => window.devicePixelRatio)
    result.userPreferences = await page.evaluate(() => ({
      colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduce' : 'no-preference',
      forcedColors: window.matchMedia('(forced-colors: active)').matches ? 'active' : 'none'
    }))

    result.focus.before = await page.evaluate(() => ({
      id: document.activeElement?.id || null,
      tag: document.activeElement?.tagName || null
    }))

    const before = await resolveAll(page, defect, { screenshots, artifactDirectory, pass: 'before' })

    try {
      result.interactions = await performInteractions(page, defect)
    } catch (error) {
      result.limitations.push(`Interaction failed: ${error.message.split('\n')[0]}`)
      result.interactionStatus = INTERACTION_FAILED
    }

    const after = await resolveAll(page, defect, { screenshots, artifactDirectory, pass: 'after' })

    result.focus.afterInteraction = await page.evaluate(() => ({
      id: document.activeElement?.id || null,
      tag: document.activeElement?.tagName || null
    }))

    result.locators = defect.locators.map((locator, index) => {
      const phase = locator.phase ?? 'either'
      const pre = before[index]
      const post = after[index]
      const preferred = phase === 'before'
        ? pre
        : phase === 'after'
          ? post
          : ([RESOLVED, RESOLVED_AFTER_INTERACTION].includes(post.status) ? post : pre)

      return {
        ...preferred,
        phase,
        before: pre.status,
        after: post.status,
        ...(phase === 'before' && post.status === NOT_FOUND ? { removedByInteraction: true } : {})
      }
    })

    if (result.locators.some((locator) => locator.status === SHADOW_ROOT_INACCESSIBLE)) {
      result.limitations.push('Closed shadow root: the internal target cannot be resolved with an ordinary locator.')
    }

    result.limitations = [...new Set(result.limitations)]
  } catch (error) {
    result.navigated = false
    result.error = error.message.split('\n')[0]
    result.locators.push({
      type: 'page',
      value: defect.url,
      status: ENVIRONMENT_UNAVAILABLE,
      error: result.error
    })
  } finally {
    page.off('console', onConsole)
  }

  return result
}

export function summarize (results) {
  const summary = { total: results.length, ok: 0, failed: 0, limitations: 0 }
  for (const result of results) {
    const statuses = result.locators.map((locator) => locator.status)
    if (statuses.some((status) => FAILURE_STATUSES.has(status)) || result.interactionStatus === INTERACTION_FAILED) {
      summary.failed += 1
    } else if (statuses.every((status) => status === SHADOW_ROOT_INACCESSIBLE)) {
      summary.limitations += 1
    } else {
      summary.ok += 1
    }
  }
  return summary
}

export function selectDefects (defects, options = {}) {
  return defects.filter((defect) => {
    if (options.id && defect.id !== options.id) return false
    if (options.service && defect.service !== options.service) return false
    if (options.category && defect.category !== options.category) return false
    return true
  })
}

async function waitForServer (url, attempts = 60) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url)
      if (response.ok) return true
    } catch {
      // Server not ready yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  return false
}

function repositoryCommit () {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA
  try {
    return execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim()
  } catch {
    return null
  }
}

function printResults (results) {
  for (const result of results) {
    const statuses = result.locators.map((locator) => `${locator.type}: ${locator.status}`).join('; ')
    const failed = result.locators.some((locator) => FAILURE_STATUSES.has(locator.status))
    const flag = failed ? 'FAIL' : 'ok  '
    console.log(`${flag} ${result.id} — ${statuses}${result.interactions.length > 0 ? ` (interaction: ${result.interactions.join(', ')})` : ''}`)
    for (const limitation of result.limitations) console.log(`     limitation: ${limitation}`)
  }
}

export async function runVerification (options = {}) {
  const { chromium } = await import('playwright')
  const { registry } = buildRegistry(ROOT)
  const defects = selectDefects(registry.defects, options)

  if (defects.length === 0) {
    console.error('No defects matched the requested filters.')
    return 1
  }

  if (!fs.existsSync(path.join(ROOT, 'dist/index.html'))) {
    console.error('The built site is missing. Run `npm run build` first.')
    return 1
  }

  const port = Number(process.env.PORT || 4174)
  const base = '/record-a-goose-sighting/'
  const server = spawn(process.execPath, ['scripts/serve.mjs'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), SITE_BASE: base },
    stdio: 'ignore'
  })

  const baseUrl = `http://127.0.0.1:${port}${base}`
  const ready = await waitForServer(baseUrl)

  try {
    if (!ready) {
      console.error(`Preview server did not start at ${baseUrl}`)
      return 1
    }

    const browser = await chromium.launch()
    const context = await browser.newContext()
    const page = await context.newPage()
    const results = []

    for (const defect of defects) {
      results.push(await verifyDefect(page, defect, {
        baseUrl,
        screenshots: Boolean(options.screenshots),
        artifactDirectory: path.join(ROOT, 'test-results/defect-screenshots')
      }))
    }

    await browser.close()

    const summary = summarize(results)
    printResults(results)

    const artifactDirectory = path.join(ROOT, 'test-results')
    fs.mkdirSync(artifactDirectory, { recursive: true })
    const jsonPath = options.json ? path.resolve(ROOT, options.json) : path.join(artifactDirectory, 'defect-verification.json')
    fs.mkdirSync(path.dirname(jsonPath), { recursive: true })
    fs.writeFileSync(jsonPath, `${JSON.stringify({
      schemaVersion: 'defect-verification/1',
      repositoryCommit: repositoryCommit(),
      generatedAt: new Date().toISOString(),
      baseUrl,
      selector: { id: options.id ?? null, service: options.service ?? null, category: options.category ?? null },
      summary,
      results
    }, null, 2)}\n`)

    console.log(`\n${summary.ok} verified, ${summary.failed} failed, ${summary.limitations} limitation(s). Evidence: ${path.relative(ROOT, jsonPath)}`)
    return summary.failed > 0 ? 1 : 0
  } finally {
    server.kill('SIGTERM')
  }
}
