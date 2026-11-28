#!/usr/bin/env node
/**
 * Defect registry command line interface.
 *
 *   npm run defects:generate     rewrite every generated representation
 *   npm run defects:validate     validate the registry without writing
 *   npm run defects:check-sync   fail when committed output has drifted
 *   npm run defects:coverage     print the coverage summary
 *   npm run defects:verify       resolve locators in a real browser
 *
 * The canonical registry is generated, never hand-edited. Sources are listed
 * in `data/known-defects.json`.
 */
import fs from 'node:fs'
import path from 'node:path'

import { buildCoverage } from './lib/defects/coverage.mjs'
import {
  COVERAGE_MARKDOWN_PATH,
  COVERAGE_PATH,
  MARKDOWN_PATH,
  REGISTRY_PATH,
  ROOT,
  buildRegistry,
  readJson
} from './lib/defects/registry.mjs'
import {
  normalizeBase,
  normalizeSiteUrl,
  renderAll,
  renderCatalogue,
  renderManifest
} from './lib/defects/render.mjs'
import { validateRegistry } from './lib/defects/validate.mjs'

const COMMANDS = new Set(['generate', 'validate', 'check-sync', 'coverage', 'verify'])

function parseArguments (argv) {
  const [command, ...rest] = argv
  const options = { command }

  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index]
    if (!argument.startsWith('--')) continue
    const key = argument.slice(2)
    const next = rest[index + 1]
    const value = next && !next.startsWith('--') ? next : true
    if (value !== true) index += 1
    options[key] = value
  }

  return options
}

function reportErrors (errors) {
  for (const error of errors) console.error(`- ${error}`)
}

function load () {
  const { registry, errors: buildErrors } = buildRegistry(ROOT)
  const validationErrors = validateRegistry(registry, ROOT)
  return { registry, errors: [...buildErrors, ...validationErrors] }
}

function writeFile (relativePath, content) {
  const target = path.join(ROOT, relativePath)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, content)
}

function generate ({ registry, coverage }, { siteUrl, base }) {
  const rendered = renderAll(registry, coverage, { siteUrl })

  for (const [relativePath, content] of rendered) {
    const target = path.join(ROOT, relativePath)
    const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null
    if (current !== content) {
      writeFile(relativePath, content)
      console.log(`Wrote ${relativePath}`)
    }
  }

  writeFile('dist-lab/defects/index.html', renderCatalogue(registry, { base, siteUrl }))
  writeFile('dist-lab/defects/manifest.json', renderManifest(registry, { siteUrl }))
  writeFile('dist-lab/defects/known-defects.json', renderAll(registry, coverage, { siteUrl }).get(REGISTRY_PATH))

  return rendered
}

function runGenerate (options) {
  const loaded = load()
  if (loaded.errors.length > 0) {
    reportErrors(loaded.errors)
    console.error(`\nRegistry is invalid (${loaded.errors.length} problem(s)); nothing was written.`)
    process.exitCode = 1
    return
  }

  const coverage = buildCoverage(loaded.registry, readJson(ROOT, 'services/lab/fixtures.json'))
  const siteUrl = normalizeSiteUrl(options['site-url'])
  const base = normalizeBase(options.base ?? process.env.SITE_BASE)

  generate({ registry: loaded.registry, coverage }, { siteUrl, base })

  console.log(`Registry: ${loaded.registry.defects.length} defects from ${loaded.registry.sources.length} sources`)
  console.log(`Catalogue: dist-lab/defects/index.html (base ${base}, site ${siteUrl})`)
}

function runValidate ({ quiet = false } = {}) {
  const loaded = load()
  if (loaded.errors.length > 0) {
    reportErrors(loaded.errors)
    console.error(`Registry is invalid (${loaded.errors.length} problem(s))`)
    process.exitCode = 1
    return false
  }
  if (!quiet) {
    console.log(`Registry is valid: ${loaded.registry.defects.length} defects, ${loaded.registry.sources.length} sources`)
  }
  return true
}

function runCheckSync (options) {
  if (!runValidate({ quiet: true })) return

  const loaded = load()
  const coverage = buildCoverage(loaded.registry, readJson(ROOT, 'services/lab/fixtures.json'))
  const rendered = renderAll(loaded.registry, coverage, { siteUrl: normalizeSiteUrl(options['site-url']) })

  const drifted = []
  for (const [relativePath, content] of rendered) {
    const target = path.join(ROOT, relativePath)
    const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null
    if (current !== content) drifted.push(relativePath)
  }

  if (drifted.length > 0) {
    console.error('Generated defect documentation is out of sync with its sources:')
    for (const file of drifted) console.error(`- ${file}`)
    console.error('\nRun `npm run defects:generate` and commit the result.')
    process.exitCode = 1
    return
  }

  console.log(`Generated defect documentation is in sync (${rendered.size} files)`)
}

function runCoverage (options) {
  if (!runValidate({ quiet: true })) return
  const loaded = load()
  const coverage = buildCoverage(loaded.registry, readJson(ROOT, 'services/lab/fixtures.json'))

  if (options.json) {
    console.log(JSON.stringify(coverage, null, 2))
    return
  }

  const { totals } = coverage
  console.log(`Defects: ${totals.defects}`)
  console.log(`Services: ${totals.services}; categories: ${totals.categories}`)
  console.log(`WCAG criteria: ${totals.wcagCriteria}; ACT rules: ${totals.actRules}`)
  console.log(`Capabilities: ${totals.capabilities}; detection methods: ${totals.detectionMethods}`)
  console.log(`Comparison controls: ${totals.withComparisonControl}; interaction-dependent: ${totals.interactionDependent}`)
  console.log(`Independently reviewed: ${totals.independentlyReviewed}; unreviewed: ${totals.unreviewed}`)
  console.log(`Assistive-technology procedures: ${totals.assistiveTechnologyTests} across ${totals.defectsWithAssistiveTechnologyTests} defects`)
}

async function runVerify (options) {
  const { runVerification } = await import('./lib/defects/verify.mjs')
  process.exitCode = await runVerification(options)
}

async function main () {
  const options = parseArguments(process.argv.slice(2))

  if (!COMMANDS.has(options.command)) {
    console.error('Usage: node scripts/defects.mjs <generate|validate|check-sync|coverage|verify> [options]')
    process.exitCode = 1
    return
  }

  switch (options.command) {
    case 'generate':
      runGenerate(options)
      break
    case 'validate':
      runValidate()
      break
    case 'check-sync':
      runCheckSync(options)
      break
    case 'coverage':
      runCoverage(options)
      break
    case 'verify':
      await runVerify(options)
      break
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
