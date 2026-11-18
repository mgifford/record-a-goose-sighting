/**
 * Compares two capture runs produced by tests/tools/capture.mjs.
 *
 * The legacy app served pages from the site root; the static build serves them
 * from a subpath. URL values are normalised before comparison so that only
 * meaningful differences are reported.
 *
 * Usage:
 *   node tests/tools/compare.mjs baseline/metrics.json baseline-static/metrics.json
 */
import fs from 'node:fs'
import path from 'node:path'

const [beforePath, afterPath] = process.argv.slice(2)

if (!beforePath || !afterPath) {
  console.error('Usage: node tests/tools/compare.mjs <before.json> <after.json>')
  process.exit(1)
}

const before = JSON.parse(fs.readFileSync(beforePath, 'utf8'))
const after = JSON.parse(fs.readFileSync(afterPath, 'utf8'))

const bases = [before.urlBase, after.urlBase].flatMap((base) => {
  if (!base) return []
  try {
    return [base, new URL(base).pathname]
  } catch {
    return [base]
  }
}).sort((a, b) => b.length - a.length)

function normaliseUrl (value) {
  if (typeof value !== 'string') return value

  let result = value

  for (const base of bases) {
    if (base && base !== '/' && result.startsWith(base)) {
      result = '/' + result.slice(base.length)
      break
    }
  }

  result = result.replace(/^https?:\/\/[^/]+/, '')
  result = result.replace(/\/+$/, '')

  return result === '' ? '/' : result
}

function pick (value, keys) {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map((item) => pick(item, keys))

  return Object.fromEntries(
    keys.filter((key) => Object.hasOwn(value, key)).map((key) => [key, value[key]])
  )
}

function normalisePage (record) {
  const measure = record.measure

  return {
    title: measure.title,
    lang: measure.lang,
    headings: measure.headings,
    links: measure.links.map((link) => ({
      text: link.text,
      href: normaliseUrl(link.href),
      target: link.target,
      role: link.role
    })),
    forms: measure.forms.map((form) => ({
      action: normaliseUrl(form.action),
      fields: form.fields.map((field) => pick(field, ['tag', 'type', 'name', 'text', 'tabindex'])),
      fieldsets: form.fieldsets
    })),
    images: measure.images.map((image) => ({
      src: image.src,
      hasAlt: image.hasAlt,
      alt: image.alt
    })),
    tabindex: measure.tabindex.map((element) => pick(element, ['tag', 'text', 'tabindex'])),
    styles: measure.styles,
    relatedList: measure.relatedList,
    focusStyle: measure.focusStyle,
    axe: record.axe.violations.map((violation) => violation.id).sort(),
    focus: record.focus.map((stop) => pick(stop, ['tag', 'text', 'name', 'type'])),
    // The legacy app loaded Google Analytics. Beacons aborted by the capture
    // browser are not part of the exercise, and tracking is deliberately
    // removed from the static site.
    failedRequests: record.failedRequests.filter(
      (request) => !/(google-analytics|googletagmanager)\.com/.test(request.url)
    )
  }
}

function diff (a, b, trail = '') {
  const lines = []

  if (a === b) return lines

  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') {
    lines.push(`${trail}: ${JSON.stringify(a)} -> ${JSON.stringify(b)}`)
    return lines
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    const left = Array.isArray(a) ? a : []
    const right = Array.isArray(b) ? b : []
    const length = Math.max(left.length, right.length)

    for (let index = 0; index < length; index += 1) {
      lines.push(...diff(left[index], right[index], `${trail}[${index}]`))
    }

    return lines
  }

  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const key of keys) {
    lines.push(...diff(a[key], b[key], trail ? `${trail}.${key}` : key))
  }

  return lines
}

const beforePages = new Map(before.pages.map((page) => [page.slug, page]))
const afterPages = new Map(after.pages.map((page) => [page.slug, page]))

let total = 0

for (const slug of new Set([...beforePages.keys(), ...afterPages.keys()])) {
  const left = beforePages.get(slug)
  const right = afterPages.get(slug)

  if (!left || !right) {
    console.log(`\n## ${slug}\nMISSING IN ${left ? 'AFTER' : 'BEFORE'}`)
    total += 1
    continue
  }

  const differences = diff(
    normalisePage(left),
    normalisePage(right),
    slug
  )

  if (differences.length > 0) {
    console.log(`\n## ${slug}`)
    for (const line of differences) console.log(`  ${line}`)
    total += differences.length
  }
}

console.log(`\n${total} difference(s) between ${path.basename(beforePath)} and ${path.basename(afterPath)}`)
process.exitCode = total > 0 ? 1 : 0
