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

test.describe('Vue journey parity', () => {
  test('addresses every step and keeps the answers on reload', async ({ page }) => {
    await page.goto('wombat/?state=updated')
    await page.getByRole('button', { name: 'Start now' }).click()
    await expect(page).toHaveURL(/step=liked/)

    await page.locator('#liked-yes').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.fill('#type', 'Common wombat')
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.fill('#date-day', '18')
    await page.fill('#date-month', '11')
    await page.fill('#date-year', '2026')
    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page).toHaveURL(/step=check/)
    await page.reload()
    await expect(page.locator('.summary')).toContainText('Common wombat')
    await expect(page.locator('.summary')).toContainText('18 / 11 / 2026')
  })

  test('clears the answers when reporting another sighting', async ({ page }) => {
    await page.goto('wombat/?state=updated&step=liked')
    await page.locator('#liked-no').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.fill('#type', 'Temporary wombat')
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.fill('#date-day', '18')
    await page.fill('#date-month', '11')
    await page.fill('#date-year', '2026')
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByRole('button', { name: 'Send the sighting' }).click()

    await page.getByRole('button', { name: 'Report another sighting' }).click()
    await expect(page).toHaveURL(/wombat\/\?state=updated$/)
    await expect(page.locator('#page-heading')).toHaveText('Report a wombat sighting')
    await page.getByRole('button', { name: 'Start now' }).click()
    await expect(page.locator('#liked-yes')).not.toBeChecked()
    await expect(page.locator('#liked-no')).not.toBeChecked()
  })

  test('has no unexpected violations on the journey steps', async ({ page }) => {
    await page.goto('wombat/?state=updated')
    const found = []

    found.push(...await violations(page))
    await page.getByRole('button', { name: 'Start now' }).click()
    found.push(...await violations(page))
    await page.locator('#liked-yes').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    found.push(...await violations(page))
    await page.fill('#type', 'Common wombat')
    await page.getByRole('button', { name: 'Continue' }).click()
    found.push(...await violations(page))
    await page.fill('#date-day', '18')
    await page.fill('#date-month', '11')
    await page.fill('#date-year', '2026')
    await page.getByRole('button', { name: 'Continue' }).click()
    found.push(...await violations(page))

    expect(found).toEqual([])
  })

  test('validates an impossible date and renders a direct check link', async ({ page }) => {
    await page.goto('wombat/?step=date')
    await page.fill('#date-day', '31')
    await page.fill('#date-month', '2')
    await page.fill('#date-year', '2026')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.locator('.error-summary')).toContainText('Enter a real date')

    await page.goto('wombat/?step=check')
    await expect(page.locator('#page-heading')).toHaveText('Check your answers before sending your sighting')
    await expect(page.locator('.summary')).toContainText('Not provided')
  })
})
