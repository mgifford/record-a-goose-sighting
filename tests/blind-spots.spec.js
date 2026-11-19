import fs from 'node:fs'
import path from 'node:path'

import { test, expect } from '@playwright/test'

const ROOT = path.resolve(import.meta.dirname, '..')
const AXE_PATH = path.join(ROOT, 'node_modules/axe-core/axe.min.js')
const INVENTORY = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'docs/original-goose-issues.json'), 'utf8')
)

test.describe('what automation misses', () => {
  test('lists every described issue with its detection method', async ({ page }) => {
    await page.goto('blind-spots/')

    await expect(page).toHaveTitle('What automation misses - Record a goose sighting')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('What automation misses')

    await expect(page.locator('.app-detection')).toHaveCount(INVENTORY.issues.length)

    const automated = INVENTORY.issues.filter((issue) => issue.detection.automated.detected)
    await expect(page.locator('.govuk-tag--green')).toHaveCount(automated.length)
    await expect(page.locator('.govuk-tag--red')).toHaveCount(INVENTORY.issues.length - automated.length)

    for (const issue of INVENTORY.issues) {
      await expect(page.getByRole('link', { name: issue.title, exact: true })).toBeVisible()
    }
  })

  test('explains the automation gap in the summary', async ({ page }) => {
    await page.goto('blind-spots/')

    const automated = INVENTORY.issues.filter((issue) => issue.detection.automated.detected).length

    await expect(page.locator('.govuk-inset-text')).toContainText(`Automated checks catch ${automated} of them`)
    await expect(page.locator('.govuk-inset-text')).toContainText(
      `The other ${INVENTORY.issues.length - automated} need manual checks`
    )
  })

  test('links back to the answers and each page', async ({ page }) => {
    await page.goto('blind-spots/')

    await expect(page.getByRole('link', { name: 'Back to the answers' })).toHaveAttribute(
      'href',
      '/record-a-goose-sighting/steps/answers/'
    )

    await page.goto('steps/answers/')
    await expect(page.getByRole('link', { name: /which issues need manual testing/ })).toHaveAttribute(
      'href',
      '/record-a-goose-sighting/blind-spots/'
    )
  })

  test('has no automated accessibility problems', async ({ page }) => {
    await page.goto('blind-spots/')
    await page.addScriptTag({ path: AXE_PATH })

    const violations = await page.evaluate(async () => {
      const result = await window.axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }
      })
      return result.violations.map((violation) => violation.id)
    })

    expect(violations).toEqual([])
  })
})

test.describe('detection inventory integrity', () => {
  test('every issue has a detection method and a manual technique', () => {
    expect(INVENTORY.issues).toHaveLength(18)

    for (const issue of INVENTORY.issues) {
      expect(issue.detection, issue.id).toBeTruthy()
      expect(Array.isArray(issue.detection.manual.methods)).toBe(true)
      expect(issue.detection.manual.methods.length, issue.id).toBeGreaterThan(0)
      expect(typeof issue.detection.automated.detected, issue.id).toBe('boolean')

      if (issue.detection.automated.detected) {
        expect(issue.detection.automated.tools.length, issue.id).toBeGreaterThan(0)
      } else {
        expect(issue.detection.whyMissed, issue.id).not.toBe('')
      }
    }
  })

  test('the automated subset matches the recorded axe baseline', () => {
    const automated = INVENTORY.issues
      .filter((issue) => issue.detection.automated.detected)
      .map((issue) => issue.id)
      .sort()

    expect(automated).toEqual([
      'check-heading-order',
      'end-gif-alt',
      'geese-empty-title',
      'geese-low-contrast'
    ])
  })
})
