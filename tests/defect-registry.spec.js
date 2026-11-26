/**
 * Guards the defect registry contract.
 *
 * These are data-integrity tests, not accessibility tests. They prove that the
 * committed registry is generated from its sources, that it validates against
 * the versioned schema, that broken references fail validation, and that the
 * published catalogue and manifest are served unchanged.
 */
import fs from 'node:fs'
import path from 'node:path'

import { test, expect } from '@playwright/test'

import { buildCoverage } from '../scripts/lib/defects/coverage.mjs'
import {
  COVERAGE_MARKDOWN_PATH,
  COVERAGE_PATH,
  FIXTURE_MANIFEST,
  MARKDOWN_PATH,
  REGISTRY_PATH,
  SCHEMA_PATH,
  buildRegistry,
  readJson
} from '../scripts/lib/defects/registry.mjs'
import { renderAll } from '../scripts/lib/defects/render.mjs'
import { validateRegistry } from '../scripts/lib/defects/validate.mjs'
import { validateAgainstSchema } from '../scripts/lib/json-schema.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const committed = readJson(ROOT, REGISTRY_PATH)
const manifest = readJson(ROOT, FIXTURE_MANIFEST)

function clone (value) {
  return structuredClone(value)
}

test.describe('generated registry', () => {
  test('is byte-identical to a fresh generation', () => {
    const { registry, errors } = buildRegistry(ROOT)
    expect(errors).toEqual([])
    expect(validateRegistry(registry, ROOT)).toEqual([])

    const coverage = buildCoverage(registry, manifest)
    const rendered = renderAll(registry, coverage)

    for (const [relativePath, content] of rendered) {
      const current = fs.readFileSync(path.join(ROOT, relativePath), 'utf8')
      expect(current, `${relativePath} is out of sync; run npm run defects:generate`).toBe(content)
    }
  })

  test('is valid against the versioned schema', () => {
    const schema = readJson(ROOT, SCHEMA_PATH)
    expect(validateAgainstSchema(schema, committed)).toEqual([])
  })

  test('has consistent counts and unique identifiers', () => {
    expect(committed.counts.defects).toBe(committed.defects.length)

    const ids = new Set()
    const aliases = new Set()
    for (const defect of committed.defects) {
      expect(ids.has(defect.id), defect.id).toBe(false)
      ids.add(defect.id)

      for (const alias of defect.aliases) {
        expect(aliases.has(alias), alias).toBe(false)
        aliases.add(alias)
      }
    }

    expect(Object.values(committed.counts.byService).reduce((total, value) => total + value, 0)).toBe(committed.defects.length)
  })

  test('represents every failed ACT fixture and every preserved Goose issue', () => {
    const ids = new Set(committed.defects.map((defect) => defect.id))

    for (const entry of manifest.cases) {
      if (entry.expected === 'failed' || entry.execution === 'unsupported') {
        expect(ids.has(entry.id), entry.id).toBe(true)
      }
    }

    const inventory = readJson(ROOT, 'docs/original-goose-issues.json')
    for (const issue of inventory.issues) {
      expect(ids.has(issue.id), issue.id).toBe(true)
    }
  })

  test('keeps comparison controls resolvable', () => {
    const ids = new Set(committed.defects.map((defect) => defect.id))
    const fixtureIds = new Set(manifest.cases.map((entry) => entry.id))
    const linked = committed.defects.filter((defect) => defect.controlFixtureId)

    expect(linked.length).toBeGreaterThan(0)
    for (const defect of linked) {
      expect(ids.has(defect.controlFixtureId) || fixtureIds.has(defect.controlFixtureId), defect.id).toBe(true)
    }
  })

  test('does not claim confirmations that no review supports', () => {
    for (const defect of committed.defects) {
      if (defect.reviewStatus.dimensions.independentReview !== 'reviewed') {
        expect(defect.wcag.some((mapping) => mapping.status === 'confirmed'), defect.id).toBe(false)
      }
      if (defect.reviewStatus.dimensions.assistiveTechnology !== 'verified') {
        expect(defect.assistiveTechnologyTests.every((procedure) => procedure.status !== 'verified'), defect.id).toBe(true)
      }
    }
  })
})

test.describe('registry validation rejects broken data', () => {
  const schema = readJson(ROOT, SCHEMA_PATH)

  test('rejects a missing required field', () => {
    const broken = clone(committed)
    delete broken.defects[0].title
    expect(validateAgainstSchema(schema, broken)).toContainEqual(
      expect.stringContaining('missing required property "title"')
    )
  })

  test('rejects an unexpected field', () => {
    const broken = clone(committed)
    broken.defects[0].answer = 'fixed'
    expect(validateAgainstSchema(schema, broken)).toContainEqual(
      expect.stringContaining('unexpected property "answer"')
    )
  })

  test('rejects a duplicate identifier', () => {
    const broken = clone(committed)
    broken.defects[1].id = broken.defects[0].id
    expect(validateRegistry(broken, ROOT)).toContainEqual(expect.stringContaining('duplicate id'))
  })

  test('rejects a not-applicable field that has a value', () => {
    const broken = clone(committed)
    broken.defects[0].notApplicable = [...broken.defects[0].notApplicable, 'title']
    expect(validateRegistry(broken, ROOT)).toContainEqual(
      expect.stringContaining('listed as not applicable but has a value')
    )
  })

  test('rejects an unresolvable comparison control', () => {
    const broken = clone(committed)
    broken.defects[0].controlFixtureId = 'does-not-exist'
    expect(validateRegistry(broken, ROOT)).toContainEqual(expect.stringContaining('controlFixtureId "does-not-exist"'))
  })

  test('rejects a URL with no source page', () => {
    const broken = clone(committed)
    const goose = broken.defects.find((defect) => defect.service === 'goose')
    goose.url = 'steps/does-not-exist/'
    expect(validateRegistry(broken, ROOT)).toContainEqual(expect.stringContaining('does not resolve to a source page'))
  })

  test('rejects a confirmed WCAG mapping without an independent review', () => {
    const broken = clone(committed)
    const goose = broken.defects.find((defect) => defect.service === 'goose')
    goose.wcag = [{ criterion: '1.1.1', status: 'confirmed', note: null }]
    expect(validateRegistry(broken, ROOT)).toContainEqual(
      expect.stringContaining('confirmed but no independent review is recorded')
    )
  })
})

test.describe('published outputs', () => {
  test('serves the catalogued manifest unchanged', async ({ request }) => {
    const response = await request.get('defects/manifest.json')
    expect(response.status()).toBe(200)

    const published = await response.json()
    expect(published.schemaVersion).toBe('known-defects-published/1')
    expect(published.registryVersion).toBe(committed.schemaVersion)
    expect(published.defects).toEqual(committed.defects)
  })

  test('serves the answer-key catalogue with a readable, filterable list', async ({ request }) => {
    const response = await request.get('defects/')
    expect(response.status()).toBe(200)

    const html = await response.text()
    expect(html).toContain('<h1>Known defect catalogue</h1>')
    expect(html).toContain('id="catalogue-filters"')
    expect(html).toContain('aria-live="polite"')

    for (const defect of committed.defects) {
      expect(html, defect.id).toContain(`id="defect-${defect.id}"`)
    }

    for (const label of ['Service', 'Category', 'WCAG criterion', 'ACT rule', 'Affected capability', 'Review status']) {
      expect(html).toContain(`>${label}</label>`)
    }
  })

  test('generates the coverage matrices referenced by the registry documentation', () => {
    const coverage = readJson(ROOT, COVERAGE_PATH)
    expect(coverage.totals.defects).toBe(committed.counts.defects)
    expect(coverage.note).toContain('not WCAG success criteria achieved')

    const markdown = fs.readFileSync(path.join(ROOT, COVERAGE_MARKDOWN_PATH), 'utf8')
    expect(markdown).toContain('# Defect coverage')
    expect(markdown).toContain('## Defects by WCAG criterion')

    const known = fs.readFileSync(path.join(ROOT, MARKDOWN_PATH), 'utf8')
    expect(known).toContain('# Known defects')
    for (const defect of committed.defects) {
      expect(known, defect.id).toContain(`\`${defect.id}\``)
    }
  })
})
