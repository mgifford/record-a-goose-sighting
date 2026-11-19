import path from 'node:path'

import { test, expect } from '@playwright/test'

const AXE_PATH = path.resolve(import.meta.dirname, '../node_modules/axe-core/axe.min.js')

async function violations (page) {
  await page.addScriptTag({ path: AXE_PATH })
  return page.evaluate(async () => {
    const result = await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }
    })
    return result.violations.map((violation) => violation.id)
  })
}

test.describe('React journey parity', () => {
  test('addresses every step and keeps the answers on reload', async ({ page }) => {
    await page.goto('hedgehog/?state=updated')
    await page.getByRole('button', { name: 'Start now' }).click()
    await expect(page).toHaveURL(/step=liked/)

    await page.locator('#liked-yes').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.fill('#type', 'European hedgehog')
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.fill('#date-day', '18')
    await page.fill('#date-month', '11')
    await page.fill('#date-year', '2026')
    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page).toHaveURL(/step=check/)
    await page.reload()
    await expect(page.locator('.summary')).toContainText('European hedgehog')
    await expect(page.locator('.summary')).toContainText('18 / 11 / 2026')
  })

  test('clears the answers when reporting another sighting', async ({ page }) => {
    await page.goto('hedgehog/?state=updated&step=liked')
    await page.locator('#liked-no').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.fill('#type', 'Temporary hedgehog')
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.fill('#date-day', '18')
    await page.fill('#date-month', '11')
    await page.fill('#date-year', '2026')
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByRole('button', { name: 'Send the sighting' }).click()

    await page.getByRole('button', { name: 'Report another sighting' }).click()
    await expect(page).toHaveURL(/hedgehog\/\?state=updated$/)
    await expect(page.locator('#page-heading')).toHaveText('Report a hedgehog sighting')
    await page.getByRole('button', { name: 'Start now' }).click()
    await expect(page.locator('#liked-yes')).not.toBeChecked()
    await expect(page.locator('#liked-no')).not.toBeChecked()
  })

  test('has no unexpected violations on the journey steps', async ({ page }) => {
    await page.goto('hedgehog/?state=updated')
    const found = []

    found.push(...await violations(page))
    await page.getByRole('button', { name: 'Start now' }).click()
    found.push(...await violations(page))
    await page.locator('#liked-yes').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    found.push(...await violations(page))
    await page.fill('#type', 'European hedgehog')
    await page.getByRole('button', { name: 'Continue' }).click()
    found.push(...await violations(page))
    await page.fill('#date-day', '18')
    await page.fill('#date-month', '11')
    await page.fill('#date-year', '2026')
    await page.getByRole('button', { name: 'Continue' }).click()
    found.push(...await violations(page))

    expect(found).toEqual([])
  })
})
