/**
 * Builds the static version of the 'Record a goose sighting' exercise.
 *
 * The site is rendered from the existing Nunjucks templates at build time.
 * Nothing in the generated output needs a server: form answers are retained
 * in the browser with sessionStorage (see app/assets/javascripts/goose-session.js).
 *
 * Usage:
 *   node scripts/build.mjs
 *   SITE_BASE=/record-a-goose-sighting/ node scripts/build.mjs
 *   SITE_BASE=/ node scripts/build.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

import nunjucks from 'nunjucks'
import * as sass from 'sass'

const require = createRequire(import.meta.url)

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')
const CACHE = path.join(ROOT, '.cache')
const GOVUK_ROOT = path.join(ROOT, 'node_modules/govuk-frontend')

const pkg = require('../package.json')
const govukPkg = require('govuk-frontend/package.json')

/**
 * Normalise the deployment path so that both a repository subpath and a
 * domain root work. Always returns a value with a leading and trailing slash.
 */
function normalizeBase (value) {
  const trimmed = String(value || '/').trim()
  const inner = trimmed.replace(/^\/+|\/+$/g, '')

  if (inner === '') return '/'

  if (inner.includes('\\') || inner.split('/').includes('..')) {
    throw new Error(`SITE_BASE must be a simple path, received: ${value}`)
  }

  return `/${inner}/`
}

const baseUrl = normalizeBase(process.env.SITE_BASE || '/record-a-goose-sighting/')

function siteUrl (route = '') {
  return baseUrl + String(route).replace(/^\/+/, '')
}

const PAGES = [
  'index',
  'steps/start',
  'steps/geese-liked',
  'steps/goose-type',
  'steps/date-saw-goose',
  'steps/check-your-answers',
  'steps/end',
  'steps/worksheet',
  'steps/answers'
]

/**
 * Sass assets. The repository keeps GOV.UK Frontend 3 so that the intentional
 * accessibility problems are unchanged. `$govuk-assets-path` is injected here
 * because the stylesheet must work under a GitHub Pages subpath, where the
 * frontend's default `/assets/` URL would 404.
 */
function buildStyles () {
  fs.mkdirSync(CACHE, { recursive: true })
  const entry = path.join(CACHE, 'unbranded.build.scss')
  fs.writeFileSync(entry, [
    `$govuk-assets-path: "${siteUrl('public/')}";`,
    '@import "unbranded";',
    ''
  ].join('\n'))

  const result = sass.compile(entry, {
    loadPaths: [ROOT, path.join(ROOT, 'app/assets/sass')],
    style: 'expanded',
    quietDeps: true,
    silenceDeprecations: ['import']
  })

  const expectedSelectors = [
    '.goose-liked-hint',
    '.justified-text',
    '.link:focus',
    '.custom-list',
    '.govuk-panel--confirmation',
    '.app-banner--warning'
  ]

  for (const selector of expectedSelectors) {
    if (!result.css.includes(selector)) {
      throw new Error(`Compiled stylesheet is missing required rule: ${selector}`)
    }
  }

  const destination = path.join(DIST, 'public/stylesheets/unbranded.css')
  fs.mkdirSync(path.dirname(destination), { recursive: true })
  fs.writeFileSync(destination, result.css)

  return { bytes: Buffer.byteLength(result.css), entry }
}

function copyDirectory (source, target, { overwrite = true } = {}) {
  if (!fs.existsSync(source)) {
    throw new Error(`Missing asset directory: ${source}`)
  }

  fs.mkdirSync(target, { recursive: true })

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (entry.name === '.DS_Store') continue

    const from = path.join(source, entry.name)
    const to = path.join(target, entry.name)

    if (entry.isDirectory()) {
      copyDirectory(from, to, { overwrite })
      continue
    }

    if (!overwrite && fs.existsSync(to)) continue

    fs.copyFileSync(from, to)
  }
}

function copyAssets () {
  const assets = [
    [path.join(GOVUK_ROOT, 'govuk/assets/images'), path.join(DIST, 'public/images')],
    [path.join(ROOT, 'app/assets/images'), path.join(DIST, 'public/images')],
    [path.join(GOVUK_ROOT, 'govuk/assets/fonts'), path.join(DIST, 'public/fonts')],
    [path.join(ROOT, 'app/assets/javascripts'), path.join(DIST, 'public/javascripts')]
  ]

  for (const [source, target] of assets) {
    copyDirectory(source, target)
  }

  const frontendScript = path.join(GOVUK_ROOT, 'govuk/all.js')
  const frontendTarget = path.join(DIST, 'public/javascripts/govuk-frontend.js')

  if (!fs.existsSync(frontendScript)) {
    throw new Error(`Missing GOV.UK Frontend script: ${frontendScript}`)
  }

  fs.copyFileSync(frontendScript, frontendTarget)

  return { frontendBrand: govukPkg.version }
}

function createEnvironment () {
  const loader = new nunjucks.FileSystemLoader([
    path.join(ROOT, 'app/views'),
    GOVUK_ROOT
  ], { noCache: true })

  const env = new nunjucks.Environment(loader, { autoescape: true })
  env.addGlobal('siteUrl', siteUrl)

  return env
}

function buildPages (env) {
  const context = {
    serviceName: 'Record a goose sighting',
    baseUrl,
    asset_path: siteUrl('public/'),
    releaseVersion: `v${pkg.version}`,
    useAutoStoreData: false,
    extensionConfig: {
      scripts: [],
      stylesheets: []
    }
  }

  const rendered = []

  for (const page of PAGES) {
    const template = `${page}.html`
    const output = page === 'index' ? 'index.html' : `${page}/index.html`
    const target = path.join(DIST, output)

    let html
    try {
      html = env.render(template, context)
    } catch (error) {
      throw new Error(`Failed to render ${template}: ${error.message}`)
    }

    const problems = []

    if (html.includes('{{') || html.includes('{%')) {
      problems.push('unrendered Nunjucks syntax')
    }

    const rootRelative = [...html.matchAll(/(?:href|src|action)="(\/(?!\/)[^"]*)"/g)]
      .map((match) => match[1])
      .filter((url) => !url.startsWith(baseUrl))

    if (rootRelative.length > 0) {
      problems.push(`root-relative URLs: ${[...new Set(rootRelative)].join(', ')}`)
    }

    if (problems.length > 0) {
      throw new Error(`Invalid output for ${template}: ${problems.join('; ')}`)
    }

    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, html, 'utf8')
    rendered.push({ page, target, bytes: Buffer.byteLength(html) })
  }

  return rendered
}

function validateExerciseMarkup () {
  const read = (page) => fs.readFileSync(
    path.join(DIST, page === 'index' ? 'index.html' : `${page}/index.html`),
    'utf8'
  )

  const expectations = [
    {
      page: 'steps/start',
      name: 'two first-level headings',
      test: (html) => (html.match(/<h1/g) || []).length === 2
    },
    {
      page: 'steps/geese-liked',
      name: 'empty page title',
      test: (html) => /<title>\s*<\/title>/.test(html)
    },
    {
      page: 'steps/geese-liked',
      name: 'Continue button removed from tab order',
      test: (html) => /<button class="govuk-button" tabindex="-1">/.test(html)
    },
    {
      page: 'steps/goose-type',
      name: 'focusable ghost goose',
      test: (html) => /<p class="govuk-visually-hidden" tabindex="0">Ghost goose<\/p>/.test(html)
    },
    {
      page: 'steps/goose-type',
      name: 'placeholder used as instruction',
      test: (html) => /placeholder="Black spur-winged goose"/.test(html)
    },
    {
      page: 'steps/end',
      name: 'animated GIF without alt text',
      test: (html) => /<img src="[^"]*goose-celebration\.gif"\s*\/?>/.test(html)
    },
    {
      page: 'steps/check-your-answers',
      name: 'incorrect hidden Change-link text',
      test: (html) => html.includes('biscuits') && html.includes('cake')
    }
  ]

  for (const expectation of expectations) {
    if (!expectation.test(read(expectation.page))) {
      throw new Error(`Intentional exercise defect missing: ${expectation.name} (${expectation.page})`)
    }
  }
}

function writeSupportFiles () {
  fs.writeFileSync(path.join(DIST, '.nojekyll'), '')
  fs.writeFileSync(path.join(DIST, 'robots.txt'), 'User-agent: *\nDisallow: /\n')

  const licence = path.join(ROOT, 'LICENCE.txt')
  if (fs.existsSync(licence)) {
    fs.copyFileSync(licence, path.join(DIST, 'LICENCE.txt'))
  }
}

function validateOutput () {
  const required = [
    'public/stylesheets/unbranded.css',
    'public/javascripts/application.js',
    'public/javascripts/goose-session.js',
    'public/javascripts/govuk-frontend.js',
    'public/images/favicon.ico',
    'public/images/apple-touch-icon.png',
    '.nojekyll'
  ]

  for (const file of required) {
    const full = path.join(DIST, file)
    if (!fs.existsSync(full)) {
      throw new Error(`Build output is missing a required file: ${file}`)
    }

    if (file !== '.nojekyll' && fs.statSync(full).size === 0) {
      throw new Error(`Build output contains an empty required file: ${file}`)
    }
  }

  if (!fs.existsSync(path.join(DIST, 'public/fonts'))) {
    throw new Error('Build output is missing GOV.UK Frontend fonts')
  }
}

function main () {
  fs.rmSync(DIST, { recursive: true, force: true })
  fs.mkdirSync(DIST, { recursive: true })

  const styles = buildStyles()
  copyAssets()
  const env = createEnvironment()
  const rendered = buildPages(env)

  if (rendered.length !== PAGES.length) {
    throw new Error(`Expected ${PAGES.length} pages, generated ${rendered.length}`)
  }

  validateExerciseMarkup()
  writeSupportFiles()
  validateOutput()

  console.log(`Static build complete: ${rendered.length} pages, ${styles.bytes} bytes of CSS`)
  console.log(`Base URL: ${baseUrl}`)
  console.log(`Output: ${path.relative(ROOT, DIST)}/`)
}

try {
  main()
} catch (error) {
  console.error(`\nBuild failed: ${error.message}\n`)
  process.exitCode = 1
}
