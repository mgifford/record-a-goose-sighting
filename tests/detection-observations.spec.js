/**
 * Records what a real automated engine sees.
 *
 * The assertions below are deliberately version-sensitive. If axe-core begins
 * to detect one of these interaction-dependent defects, or stops detecting the
 * label mismatch, the test fails and a person must decide whether the recorded
 * observation in `data/defects/*.json` should change. That is the point: a
 * dependency update that silently repairs or changes detection must not be
 * absorbed without review.
 */
import fs from 'node:fs'
import path from 'node:path'

import { test, expect } from '@playwright/test'

const ROOT = path.resolve(import.meta.dirname, '..')
const AXE_SOURCE = fs.readFileSync(path.join(ROOT, 'node_modules/axe-core/axe.min.js'), 'utf8')
const AXE_VERSION = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'node_modules/axe-core/package.json'), 'utf8')
).version

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']

async function scan (page, route) {
  await page.goto(route)
  await page.addScriptTag({ content: AXE_SOURCE })

  return page.evaluate(async (tags) => {
    const result = await window.axe.run(document, {
      runOnly: { type: 'tag', values: tags }
    })
    return result.violations.map((violation) => violation.id).sort()
  }, AXE_TAGS)
}

test.describe(`axe-core ${AXE_VERSION} observations (recorded 2026-11-26)`, () => {
  test('the answer-key catalogue has no automated violations', async ({ page }) => {
    const violations = await scan(page, 'defects/')
    expect(violations).toEqual([])
  })

  test('detects the label mismatch', async ({ page }) => {
    const violations = await scan(page, 'lab/subtle/names/')
    expect(violations).toContain('label-content-name-mismatch')
  })

  test('does not detect the lost focus after item removal', async ({ page }) => {
    const violations = await scan(page, 'lab/subtle/focus-removal/')
    expect(violations).toEqual([])
  })

  test('does not detect the silent status message', async ({ page }) => {
    const violations = await scan(page, 'lab/subtle/status/')
    expect(violations).toEqual([])
  })

  test('does not detect the pointer-only switch', async ({ page }) => {
    const violations = await scan(page, 'lab/subtle/keyboard-toggle/')
    expect(violations).toEqual([])
  })

  test('does not detect the stale expanded state', async ({ page }) => {
    const violations = await scan(page, 'lab/subtle/aria-state/')
    expect(violations).toEqual([])
  })
})
