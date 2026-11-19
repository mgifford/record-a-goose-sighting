import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import { test, expect } from '@playwright/test'

const ROOT = path.resolve(import.meta.dirname, '..')
const SNAPSHOT = path.join(ROOT, 'services/lab/upstream/testcases.json')
const METADATA = path.join(ROOT, 'services/lab/upstream/metadata.json')
const INVENTORY = path.join(ROOT, 'docs/original-goose-issues.json')
const REGRESSION_SUITE = path.join(ROOT, 'tests/accessibility-regression.spec.js')

function sha256 (buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

function readJson (file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

test.describe('W3C ACT upstream snapshot', () => {
  test('has provenance, a matching checksum and consistent counts', () => {
    const buffer = fs.readFileSync(SNAPSHOT)
    const snapshot = JSON.parse(buffer.toString('utf8'))
    const metadata = readJson(METADATA)

    expect(metadata.source.url).toBe('https://www.w3.org/WAI/content-assets/wcag-act-rules/testcases.json')
    expect(Number.isNaN(Date.parse(metadata.source.retrievedAt))).toBe(false)
    expect(metadata.checksum.snapshotSha256).toBe(sha256(buffer))
    expect(metadata.checksum.downloadedSha256).toMatch(/^[a-f0-9]{64}$/)
    expect(metadata.license.name).toBe('W3C Document License')
    expect(metadata.license.url).toBe('https://www.w3.org/copyright/document-license-2023/')
    expect(metadata.license.copyright).toContain('World Wide Web Consortium')

    const counts = {
      testcases: snapshot.cases.length,
      approved: snapshot.cases.filter((entry) => entry.approved === true).length,
      notApproved: snapshot.cases.filter((entry) => entry.approved === false).length,
      approvalMissing: snapshot.cases.filter((entry) => entry.approved === null).length,
      rules: new Set(snapshot.cases.map((entry) => entry.ruleId)).size
    }

    for (const [key, value] of Object.entries(counts)) {
      expect(metadata.counts[key], key).toBe(value)
    }

    for (const outcome of ['passed', 'failed', 'inapplicable']) {
      expect(metadata.counts.byExpected[outcome]).toBe(
        snapshot.cases.filter((entry) => entry.expected === outcome).length
      )
    }
  })

  test('keeps only metadata fields and valid ACT values', () => {
    const snapshot = readJson(SNAPSHOT)
    const fields = ['approved', 'expected', 'relativePath', 'ruleId', 'ruleName', 'rulePage', 'testcaseId', 'url']
    const seen = new Set()

    for (const entry of snapshot.cases) {
      expect(Object.keys(entry).sort()).toEqual(fields)
      expect(entry.ruleId).toMatch(/^[a-z0-9]{6}$/)
      expect(['passed', 'failed', 'inapplicable']).toContain(entry.expected)
      expect([true, false, null]).toContain(entry.approved)
      expect(entry.url.startsWith('https://www.w3.org/')).toBe(true)
      expect(entry.rulePage).toContain(entry.ruleId)

      const key = `${entry.ruleId}:${entry.testcaseId}`
      expect(seen.has(key), key).toBe(false)
      seen.add(key)
    }

    const covered = new Set(snapshot.cases.map((entry) => entry.ruleId))
    expect(covered.has('674b10')).toBe(true)
    expect(covered.has('97a4e1')).toBe(true)
  })

  test('is published unchanged at the lab base path', async ({ request }) => {
    const snapshotResponse = await request.get('lab/upstream/testcases.json')
    const metadataResponse = await request.get('lab/upstream/metadata.json')

    expect(snapshotResponse.status()).toBe(200)
    expect(metadataResponse.status()).toBe(200)

    expect(await snapshotResponse.text()).toBe(fs.readFileSync(SNAPSHOT, 'utf8'))
    expect(await metadataResponse.text()).toBe(fs.readFileSync(METADATA, 'utf8'))

    await request.get('lab/')
  })
})

test.describe('original Goose preservation inventory', () => {
  test('lists all 19 described issues', () => {
    const inventory = readJson(INVENTORY)

    expect(inventory.schemaVersion).toBe('goose-preservation/1')
    expect(inventory.counts.documentedTotal).toBe(19)
    expect(inventory.counts.enumerated).toBe(19)
    expect(inventory.issues).toHaveLength(19)

    const ids = new Set()
    const numbers = new Set()

    for (const issue of inventory.issues) {
      expect(ids.has(issue.id), issue.id).toBe(false)
      ids.add(issue.id)
      expect(numbers.has(issue.answerKeyNumber), String(issue.answerKeyNumber)).toBe(false)
      numbers.add(issue.answerKeyNumber)

      expect(issue.answerKeyNumber).toBeGreaterThanOrEqual(1)
      expect(issue.answerKeyNumber).toBeLessThanOrEqual(19)
      expect(issue.route).toMatch(/^steps\/[a-z-]+\/$/)
      expect(['failure', 'best-practice', 'manual-concern']).toContain(issue.wcag.status)
      expect(Array.isArray(issue.wcag.criteria)).toBe(true)
      expect(issue.evidence.test).toContain('tests/accessibility-regression.spec.js')
    }
  })

  test('every inventory route and evidence reference still exists', async ({ request }) => {
    const inventory = readJson(INVENTORY)
    const suite = fs.readFileSync(REGRESSION_SUITE, 'utf8')

    for (const issue of inventory.issues) {
      const response = await request.get(issue.route)
      expect(response.status(), `${issue.id} -> ${issue.route}`).toBe(200)

      const assertion = issue.evidence.test.split(': ')[1]
      expect(suite, `${issue.id} is not covered by its stated test`).toContain(assertion)

      expect(issue.evidence.type.split('+').length).toBeGreaterThan(0)
    }
  })

  test('keeps the baseline artifacts it references', () => {
    const inventory = readJson(INVENTORY)
    const metrics = readJson(path.join(ROOT, inventory.source.baseline))

    expect(metrics.pages).toHaveLength(9)
    expect(fs.existsSync(path.join(ROOT, inventory.source.screenshots, 'desktop'))).toBe(true)
    expect(fs.existsSync(path.join(ROOT, inventory.source.screenshots, 'mobile'))).toBe(true)

    for (const issue of inventory.issues) {
      expect(metrics.pages.some((page) => page.slug === issue.page.replaceAll('/', '-'))).toBe(true)
    }
  })
})
