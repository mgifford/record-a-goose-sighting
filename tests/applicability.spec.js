import path from 'node:path'

import { test, expect } from '@playwright/test'

const AXE_PATH = path.resolve(import.meta.dirname, '../node_modules/axe-core/axe.min.js')

async function manifest (request) {
  const response = await request.get('lab/fixtures.json')
  expect(response.status()).toBe(200)
  return response.json()
}

async function axe (page) {
  await page.addScriptTag({ path: AXE_PATH })
  return page.evaluate(async () => {
    const result = await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }
    })
    return result.violations.map((violation) => violation.id)
  })
}

test.describe('inapplicable ACT cases', () => {
  test('the no-button page has no applicable target', async ({ page, request }) => {
    await page.goto('lab/applicability/no-buttons/')

    await expect(page.locator('button')).toHaveCount(0)
    await expect(page.locator('[data-test-ready="true"]')).toBeVisible()
    expect(await axe(page)).toEqual([])

    const data = await manifest(request)
    const entry = data.cases.find((item) => item.id === 'applicability-no-buttons')
    expect(entry.expected).toBe('inapplicable')
    expect(entry.target.scope).toBe('document')
    expect(entry.target.selector).toBeUndefined()
    expect(entry.review).toBe('unreviewed')
  })

  test('the no-image page has no applicable target', async ({ page, request }) => {
    await page.goto('lab/applicability/no-images/')

    await expect(page.locator('img')).toHaveCount(0)
    expect(await axe(page)).toEqual([])

    const data = await manifest(request)
    const entry = data.cases.find((item) => item.id === 'applicability-no-images')
    expect(entry.expected).toBe('inapplicable')
    expect(entry.target.scope).toBe('document')
  })

  test('the catalogue displays inapplicable cases and document scope', async ({ page }) => {
    await page.goto('lab/catalogue/')

    await page.getByLabel('Expected outcome', { exact: true }).selectOption('inapplicable')
    await expect(page.locator('.catalogue-card:not([hidden])')).toHaveCount(2)
    await expect(page.locator('.catalogue-card:not([hidden])').first()).toContainText('no applicable targets')
  })
})
