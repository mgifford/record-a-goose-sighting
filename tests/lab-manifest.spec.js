import fs from 'node:fs'
import path from 'node:path'

import { test, expect } from '@playwright/test'

import { validateManifest } from '../scripts/lab-manifest.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const manifest = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'services/lab/fixtures.json'), 'utf8')
)

test.describe('fixture manifest validation', () => {
  test('accepts the committed manifest', () => {
    expect(validateManifest(manifest, ROOT)).toEqual([])
  })

  test('rejects duplicate fixture IDs', () => {
    const copy = structuredClone(manifest)
    copy.cases[1].id = copy.cases[0].id

    expect(validateManifest(copy, ROOT)).toContainEqual(
      expect.stringContaining('duplicate id')
    )
  })

  test('rejects conflicting definitions for one target ID', () => {
    const copy = structuredClone(manifest)
    const caseA = copy.cases.find((entry) => entry.id === 'correlation-multi-rule-button-name')
    const caseB = copy.cases.find((entry) => entry.id === 'correlation-multi-rule-role-value')

    caseB.target.selector = '#different-target'

    expect(caseA.target.targetId).toBe(caseB.target.targetId)
    expect(validateManifest(copy, ROOT)).toContainEqual(
      expect.stringContaining('conflicting target definitions')
    )
  })

  test('rejects a missing source file reference', () => {
    const copy = structuredClone(manifest)
    copy.cases[0].provenance.sourceFile = 'services/lab/does-not-exist.html'

    expect(validateManifest(copy, ROOT)).toContainEqual(
      expect.stringContaining('provenance source does not exist')
    )
  })
})

test.describe('review evidence requirements', () => {
  const tempPath = path.join(ROOT, 'services/lab/reviews/records/__test-reviewed.json')

  test.afterEach(() => {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath)
  })

  test('rejects a reviewed record without methods or evidence', () => {
    const copy = structuredClone(manifest)
    const entry = copy.cases[0]

    entry.review = 'reviewed'
    entry.reviewRecord = 'lab/reviews/records/__test-reviewed.json'

    fs.writeFileSync(tempPath, JSON.stringify({
      schemaVersion: 'fixture-review/1',
      fixtureId: entry.id,
      scenarioId: entry.scenarioId ?? null,
      status: 'reviewed',
      expectedOutcome: entry.expected,
      reviewedAt: '2026-11-19T00:00:00.000Z',
      reviewer: 'test-reviewer',
      methods: [],
      evidence: [],
      limitations: []
    }, null, 2))

    const errors = validateManifest(copy, ROOT)
    expect(errors).toContainEqual(expect.stringContaining('needs at least one method'))
    expect(errors).toContainEqual(expect.stringContaining('needs at least one evidence reference'))
  })

  test('rejects a record whose fixtureId does not match', () => {
    const copy = structuredClone(manifest)
    const entry = copy.cases[0]

    entry.reviewRecord = 'lab/reviews/records/__test-reviewed.json'

    fs.writeFileSync(tempPath, JSON.stringify({
      schemaVersion: 'fixture-review/1',
      fixtureId: 'different-fixture',
      scenarioId: entry.scenarioId ?? null,
      status: 'unreviewed',
      expectedOutcome: entry.expected,
      reviewedAt: null,
      reviewer: null,
      methods: [],
      evidence: [],
      limitations: []
    }, null, 2))

    expect(validateManifest(copy, ROOT)).toContainEqual(
      expect.stringContaining('review fixtureId does not match')
    )
  })
})
