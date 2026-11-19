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
