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

test.describe('Web Components journey parity', () => {
  test('addresses every step and keeps the answers on reload', async ({ page }) => {
    await page.goto('paca/?role=valid&shadow=open')
    await page.getByRole('button', { name: 'Start now' }).click()
    await expect(page).toHaveURL(/step=liked/)

    await page.locator('#liked-yes').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.locator('#type').fill('Mountain paca')
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.locator('#date-day').fill('18')
    await page.locator('#date-month').fill('11')
    await page.locator('#date-year').fill('2026')
    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page).toHaveURL(/step=check/)
    await page.reload()
    await expect(page.locator('.summary')).toContainText('Mountain paca')
    await expect(page.locator('.summary')).toContainText('18 / 11 / 2026')
  })

  test('clears the answers when reporting another sighting', async ({ page }) => {
    await page.goto('paca/?role=valid&shadow=open&step=liked')
    await page.locator('#liked-no').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.locator('#type').fill('Temporary paca')
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.locator('#date-day').fill('18')
    await page.locator('#date-month').fill('11')
    await page.locator('#date-year').fill('2026')
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByRole('button', { name: 'Send the sighting' }).click()

    await page.getByRole('button', { name: 'Report another sighting' }).click()
    await expect(page).toHaveURL(/paca\/\?role=valid&shadow=open$/)
    await expect(page.locator('main h1')).toHaveText('Report a paca sighting')
    await page.getByRole('button', { name: 'Start now' }).click()
    await expect(page.locator('#liked-yes')).not.toBeChecked()
    await expect(page.locator('#liked-no')).not.toBeChecked()
  })

  test('has no unexpected violations on the journey steps', async ({ page }) => {
    await page.goto('paca/?role=valid&shadow=open')
    const found = []

    found.push(...await violations(page))
    await page.getByRole('button', { name: 'Start now' }).click()
    found.push(...await violations(page))
    await page.locator('#liked-yes').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    found.push(...await violations(page))
    await page.locator('#type').fill('Mountain paca')
    await page.getByRole('button', { name: 'Continue' }).click()
    found.push(...await violations(page))
    await page.locator('#date-day').fill('18')
    await page.locator('#date-month').fill('11')
    await page.locator('#date-year').fill('2026')
    await page.getByRole('button', { name: 'Continue' }).click()
    found.push(...await violations(page))

    expect(found).toEqual([])
  })

  test('validates an impossible date and renders a direct check link', async ({ page }) => {
    await page.goto('paca/?role=valid&shadow=open&step=date')
    await page.locator('#date-day').fill('31')
    await page.locator('#date-month').fill('2')
    await page.locator('#date-year').fill('2026')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.locator('.error-summary')).toContainText('Enter a real date')

    await page.goto('paca/?role=valid&shadow=open&step=check')
    await expect(page.locator('main h1')).toHaveText('Check your answers before sending your sighting')
    await expect(page.locator('.summary')).toContainText('Not provided')
  })
})
