/**
 * Preserves the journey-only defects in the fictional Wildlife observation
 * service, and the correct behaviour of the beta path.
 *
 * These defects cannot be found by scanning a single page in isolation: the
 * lost selection needs a Back navigation, and the conditional question needs
 * an interaction and a screen-reader announcement.
 */
import fs from 'node:fs'
import path from 'node:path'

import { test, expect } from '@playwright/test'

const ROOT = path.resolve(import.meta.dirname, '..')
const REGISTRY = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/known-defects.json'), 'utf8'))

const index = (variant) => `kestrel/index.html?path=${variant}`
const details = (variant) => `kestrel/details.html?path=${variant}`

test.describe('wildlife observation service journey', () => {
  test('hides the step indicator from assistive technology on the alpha path', async ({ page }) => {
    await page.goto(index('alpha'))

    await expect(page.locator('#step')).toHaveText('Step 1 of 3')
    await expect(page.locator('#step')).toHaveAttribute('aria-hidden', 'true')

    await page.goto(details('alpha'))
    await expect(page.locator('#step')).toHaveText('Step 2 of 3')
    await expect(page.locator('#step')).toHaveAttribute('aria-hidden', 'true')
  })

  test('exposes the step indicator on the beta path', async ({ page }) => {
    await page.goto(index('beta'))
    await expect(page.locator('#step')).not.toHaveAttribute('aria-hidden', 'true')

    await page.goto(details('beta'))
    await expect(page.locator('#step')).not.toHaveAttribute('aria-hidden', 'true')
  })

  test('loses the selected session when the first step is revisited on the alpha path', async ({ page }) => {
    await page.goto(index('alpha'))
    await expect(page.locator('#session-morning')).not.toBeChecked()

    await page.locator('#session-morning').check()
    await page.locator('#continue-session').click()
    await page.waitForURL(/details\.html/)

    await page.locator('#back').click()
    await page.waitForURL(/index\.html/)

    await expect(page.locator('#session-morning')).not.toBeChecked()
    expect(await page.evaluate(() => window.sessionStorage.getItem('kestrel-booking'))).toBeNull()
  })

  test('keeps the selected session when the first step is revisited on the beta path', async ({ page }) => {
    await page.goto(index('beta'))
    await page.locator('#session-evening').check()
    await page.locator('#continue-session').click()
    await page.waitForURL(/details\.html/)

    await page.locator('#back').click()
    await page.waitForURL(/index\.html/)

    await expect(page.locator('#session-evening')).toBeChecked()
  })

  test('reveals the conditional question silently on the alpha path', async ({ page }) => {
    await page.goto(details('alpha'))

    await expect(page.locator('#access-details-wrapper')).toBeHidden()
    await page.locator('#access-yes').check()

    await expect(page.locator('#access-details-wrapper')).toBeVisible()
    await expect(page.locator('#journey-status')).toHaveCount(0)
    await expect(page.locator('#access-yes')).toBeFocused()
  })

  test('announces the conditional question and moves focus on the beta path', async ({ page }) => {
    await page.goto(details('beta'))

    await page.locator('#access-yes').check()

    await expect(page.locator('#access-details-wrapper')).toBeVisible()
    await expect(page.locator('#journey-status')).toHaveText('An extra question was added below.')
    await expect(page.locator('#journey-status')).toHaveAttribute('role', 'status')
    await expect(page.locator('#access-details')).toBeFocused()
  })

  test('completes the journey and shows the chosen session in both paths', async ({ page }) => {
    for (const variant of ['alpha', 'beta']) {
      await page.goto(index(variant))
      await page.locator('#session-afternoon').check()
      await page.locator('#continue-session').click()
      await page.waitForURL(/details\.html/)

      await page.locator('#full-name').fill('Alex Morgan')
      await page.locator('#email').fill('alex@example.test')
      await page.locator('#access-yes').check()
      await page.locator('#access-details').fill('A step-free route, please.')
      await page.locator('#continue-details').click()
      await page.waitForURL(/confirmation\.html/)

      await expect(page.locator('#confirmed-session')).toHaveText('Afternoon wetland walk, 2pm to 4pm')
      await expect(page.locator('#confirmed-name')).toHaveText('Alex Morgan')
      await expect(page.locator('#confirmed-access')).toHaveText('A step-free route, please.')
      await expect(page.locator('#reference')).toHaveText('KST-4821')
    }
  })

  test('does not declare a defect identifier in the journey markup', async ({ page }) => {
    for (const route of ['kestrel/index.html', 'kestrel/details.html', 'kestrel/confirmation.html']) {
      await page.goto(route)

      const ids = await page.locator('[id]').evaluateAll((elements) => elements.map((element) => element.id))
      const known = new Set(REGISTRY.defects.map((defect) => defect.id))
      expect(ids.filter((id) => known.has(id))).toEqual([])

      const text = (await page.locator('main').innerText()).toLowerCase()
      expect(text).not.toContain('defect')
      expect(text).not.toContain('expected outcome')
    }
  })
})
