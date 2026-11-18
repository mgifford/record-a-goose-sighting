/**
 * Captures a behavioural and visual baseline of the exercise.
 *
 * Usage:
 *   node tests/tools/capture.mjs <url-base> <output-dir>
 *
 * Examples:
 *   node tests/tools/capture.mjs http://127.0.0.1:3999 baseline
 *   node tests/tools/capture.mjs http://127.0.0.1:4173/record-a-goose-sighting/ baseline-static
 *
 * The same script is used against the legacy Express app and the static
 * build so that the two sets of measurements can be compared directly.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from '@playwright/test'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

const urlBase = (process.argv[2] || 'http://127.0.0.1:3999').replace(/\/?$/, '/')
const outDir = path.resolve(ROOT, process.argv[3] || 'baseline')

const pages = [
  { slug: 'index', route: '' },
  { slug: 'steps-start', route: 'steps/start' },
  { slug: 'steps-geese-liked', route: 'steps/geese-liked' },
  { slug: 'steps-goose-type', route: 'steps/goose-type' },
  { slug: 'steps-date-saw-goose', route: 'steps/date-saw-goose' },
  { slug: 'steps-check-your-answers', route: 'steps/check-your-answers' },
  { slug: 'steps-end', route: 'steps/end' },
  { slug: 'steps-worksheet', route: 'steps/worksheet' },
  { slug: 'steps-answers', route: 'steps/answers' }
]

const styleSelectors = [
  'body',
  'h1',
  'h2',
  'h3',
  '.govuk-hint',
  '.goose-liked-hint',
  '.govuk-button',
  '.govuk-link',
  '.govuk-panel__title',
  '.justified-text',
  '.custom-list',
  '.custom-list li',
  '.govuk-visually-hidden',
  '.govuk-summary-list__key',
  '.govuk-summary-list__value',
  '.govuk-input',
  '.govuk-label',
  '.govuk-fieldset__legend',
  '.app-banner--warning',
  '.govuk-date-input__input',
  '.govuk-radios__input',
  '.govuk-radios__label'
]

const styleProps = [
  'color',
  'backgroundColor',
  'outlineStyle',
  'outlineWidth',
  'outlineColor',
  'boxShadow',
  'textAlign',
  'order',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'textDecorationLine'
]

const axePath = path.join(ROOT, 'node_modules/axe-core/axe.min.js')

function writeJson (file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n')
}

async function measure (page) {
  return page.evaluate(({ styleSelectors, styleProps }) => {
    const clean = (text) => (text || '').replace(/\s+/g, ' ').trim().slice(0, 120)

    const describe = (element) => {
      if (!element) return null
      const rect = element.getBoundingClientRect()
      return {
        tag: element.tagName.toLowerCase(),
        id: element.id || null,
        class: element.className && typeof element.className === 'string' ? element.className : null,
        type: element.getAttribute('type'),
        name: element.getAttribute('name'),
        text: clean(element.textContent),
        href: element.getAttribute('href'),
        target: element.getAttribute('target'),
        tabindex: element.getAttribute('tabindex'),
        rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) }
      }
    }

    const styles = {}
    for (const selector of styleSelectors) {
      const element = document.querySelector(selector)
      if (!element) {
        styles[selector] = null
        continue
      }
      const computed = getComputedStyle(element)
      const entry = {}
      for (const prop of styleProps) {
        entry[prop] = computed[prop]
      }
      styles[selector] = entry
    }

    const focus = {}
    const focusSelectors = ['a', 'a.link', 'a.govuk-link', 'button', 'input']
    for (const selector of focusSelectors) {
      const element = document.querySelector(selector)
      if (!element) {
        focus[selector] = null
        continue
      }
      element.focus()
      const computed = getComputedStyle(element)
      const entry = {}
      for (const prop of ['outlineStyle', 'outlineWidth', 'outlineColor', 'backgroundColor', 'boxShadow', 'textDecorationLine']) {
        entry[prop] = computed[prop]
      }
      entry.matchesFocusSelector = element.matches(':focus')
      focus[selector] = entry
      element.blur()
    }

    const relatedList = [...document.querySelectorAll('.custom-list > li')].map((item) => ({
      class: item.className,
      order: getComputedStyle(item).order,
      text: clean(item.textContent),
      href: item.querySelector('a') ? item.querySelector('a').getAttribute('href') : null
    }))

    return {
      title: document.title,
      lang: document.documentElement.getAttribute('lang'),
      headings: [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((element) => ({
        level: Number(element.tagName.slice(1)),
        text: clean(element.textContent),
        class: element.className
      })),
      landmarks: [...document.querySelectorAll('main,header,footer,nav,aside,[role]')].map((element) => ({
        tag: element.tagName.toLowerCase(),
        role: element.getAttribute('role'),
        label: element.getAttribute('aria-label'),
        labelledby: element.getAttribute('aria-labelledby')
      })),
      links: [...document.querySelectorAll('a')].map((element) => ({
        text: clean(element.textContent),
        href: element.getAttribute('href'),
        target: element.getAttribute('target'),
        rel: element.getAttribute('rel'),
        class: element.className,
        role: element.getAttribute('role')
      })),
      forms: [...document.querySelectorAll('form')].map((form) => ({
        action: form.getAttribute('action'),
        method: (form.getAttribute('method') || 'get').toLowerCase(),
        fields: [...form.querySelectorAll('input,select,textarea,button')].map(describe),
        fieldsets: [...form.querySelectorAll('fieldset')].map((fieldset) => ({
          legend: fieldset.querySelector('legend') ? clean(fieldset.querySelector('legend').textContent) : null
        }))
      })),
      images: [...document.querySelectorAll('img')].map((img) => ({
        src: img.getAttribute('src'),
        hasAlt: img.hasAttribute('alt'),
        alt: img.getAttribute('alt'),
        width: img.getAttribute('width'),
        height: img.getAttribute('height')
      })),
      tabindex: [...document.querySelectorAll('[tabindex]')].map(describe),
      headingsHtml: document.querySelectorAll('h1,h2,h3,h4,h5,h6').length,
      styles,
      relatedList,
      focusStyle: focus,
      bodyText: clean(document.body.innerText).slice(0, 400)
    }
  }, { styleSelectors, styleProps })
}

async function focusSequence (page, limit = 40) {
  await page.evaluate(() => window.scrollTo(0, 0))
  const sequence = []
  for (let index = 0; index < limit; index += 1) {
    await page.keyboard.press('Tab')
    const current = await page.evaluate(() => {
      const element = document.activeElement
      if (!element || element === document.body) return { tag: 'body' }
      return {
        tag: element.tagName.toLowerCase(),
        id: element.id || null,
        class: typeof element.className === 'string' ? element.className : null,
        text: (element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60),
        name: element.getAttribute('name'),
        type: element.getAttribute('type'),
        href: element.getAttribute('href')
      }
    })
    sequence.push(current)
    if (current.tag === 'body') break
  }
  return sequence
}

async function runAxe (page) {
  await page.addScriptTag({ path: axePath })
  const results = await page.evaluate(async () => {
    const result = await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] }
    })
    const simplify = (items) => items.map((item) => ({
      id: item.id,
      impact: item.impact,
      help: item.help,
      nodes: item.nodes.length,
      targets: item.nodes.slice(0, 3).map((node) => node.target.join(' '))
    }))
    return {
      violations: simplify(result.violations),
      incomplete: simplify(result.incomplete),
      passes: result.passes.length
    }
  })
  return results
}

async function capturePage (browser, definition) {
  const url = new URL(definition.route ? urlBase + definition.route : urlBase).href
  const slug = definition.slug
  const record = { slug, url }

  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
    const page = await context.newPage()
    const failed = []
    const consoleErrors = []
    page.on('requestfailed', (request) => failed.push({ url: request.url(), error: request.failure()?.errorText }))
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 200))
    })

    await page.goto(url, { waitUntil: 'load', timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(300)

    record.measure = await measure(page)

    fs.mkdirSync(path.join(outDir, 'html'), { recursive: true })
    fs.writeFileSync(path.join(outDir, 'html', `${slug}.html`), await page.content(), 'utf8')

    // measure() moves focus, which changes the browser's sequential focus
    // starting point. A fresh page gives a clean keyboard sequence.
    const probe = await context.newPage()
    await probe.goto(url, { waitUntil: 'load', timeout: 30000 }).catch(() => {})
    record.focus = await focusSequence(probe)

    record.axe = await runAxe(probe)
    await probe.close()
    record.failedRequests = failed
    record.consoleErrors = consoleErrors

    fs.mkdirSync(path.join(outDir, 'screenshots/desktop'), { recursive: true })
    await page.screenshot({
      path: path.join(outDir, 'screenshots/desktop', `${slug}.jpg`),
      fullPage: true,
      type: 'jpeg',
      quality: 70,
      animations: 'disabled'
    })

    await context.close()
  }

  {
    const context = await browser.newContext({ viewport: { width: 375, height: 667 }, deviceScaleFactor: 1 })
    const page = await context.newPage()
    await page.goto(url, { waitUntil: 'load', timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(200)
    fs.mkdirSync(path.join(outDir, 'screenshots/mobile'), { recursive: true })
    await page.screenshot({
      path: path.join(outDir, 'screenshots/mobile', `${slug}.jpg`),
      fullPage: true,
      type: 'jpeg',
      quality: 70,
      animations: 'disabled'
    })
    await context.close()
  }

  return record
}

fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch()
const records = []
for (const definition of pages) {
  process.stdout.write(`capturing ${definition.slug} `)
  const record = await capturePage(browser, definition)
  records.push(record)
  const violations = record.axe.violations.length
  console.log(`violations=${violations} focus=${record.focus.length}`)
}
await browser.close()

writeJson(path.join(outDir, 'metrics.json'), {
  capturedAt: new Date().toISOString(),
  urlBase,
  pages: records
})

console.log(`\nBaseline written to ${path.relative(ROOT, outDir)}/`)
