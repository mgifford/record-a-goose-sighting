/**
 * Verifies that every declared locator still resolves in a real browser.
 *
 * An unresolved locator is never reported as a pass. Closed shadow roots are
 * asserted separately as an explicit limitation, because no ordinary DOM
 * locator can reach inside them.
 */
import fs from 'node:fs'
import path from 'node:path'

import { test, expect } from '@playwright/test'

import {
  FAILURE_STATUSES,
  RESOLVED,
  RESOLVED_AFTER_INTERACTION,
  SHADOW_ROOT_INACCESSIBLE,
  verifyDefect
} from '../scripts/lib/defects/verify.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const REGISTRY = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/known-defects.json'), 'utf8'))

const resolvable = REGISTRY.defects.filter((defect) =>
  defect.locators.some((locator) => locator.type !== 'document-scope')
)

test.describe('registry locators resolve', () => {
  for (const defect of resolvable) {
    test(`${defect.id} resolves and records evidence`, async ({ page }) => {
      const result = await verifyDefect(page, defect)

      expect(result.navigated, result.error).toBe(true)
      expect(result.locators.length).toBe(defect.locators.length)

      const failures = result.locators.filter((locator) => FAILURE_STATUSES.has(locator.status))
      expect(
        failures,
        `${defect.id}: ${failures.map((failure) => `${failure.type} ${failure.value} -> ${failure.status}`).join('; ')}`
      ).toEqual([])

      const resolved = result.locators.filter((locator) =>
        locator.status === RESOLVED || locator.status === RESOLVED_AFTER_INTERACTION
      )
      expect(resolved.length, `${defect.id} resolved no locator`).toBeGreaterThan(0)

      for (const locator of resolved) {
        if (locator.type === 'document-title') continue
        expect(locator.evidence?.absoluteXPath, `${defect.id}: missing XPath evidence`).toBeTruthy()

        if (locator.evidence?.ariaHidden) {
          // A target hidden from the accessibility tree is expected to expose an
          // empty snapshot; that absence is the evidence, not a capture failure.
          expect(locator.accessibility?.snapshot, `${defect.id}: hidden target should have no snapshot`).toBe('')
        } else {
          expect(locator.accessibility?.snapshot, `${defect.id}: missing ARIA snapshot`).toBeTruthy()
        }
      }
    })
  }
})

test.describe('verification limitations', () => {
  test('reports a closed shadow root as a limitation, not a resolved target', async ({ page }) => {
    const defect = REGISTRY.defects.find((entry) => entry.id === 'paca-invalid-closed')
    expect(defect).toBeTruthy()

    const result = await verifyDefect(page, defect)

    expect(result.locators).toHaveLength(1)
    expect(result.locators[0].status).toBe(SHADOW_ROOT_INACCESSIBLE)
    expect(result.limitations.join(' ')).toContain('Closed shadow root')
  })

  test('records focus before and after an interaction', async ({ page }) => {
    const defect = REGISTRY.defects.find((entry) => entry.id === 'focus-lost-after-item-removal')
    const result = await verifyDefect(page, defect)

    expect(result.focus.afterInteraction.tag).toBe('BODY')
    expect(result.locators[0].removedByInteraction).toBe(true)
  })
})
