import path from 'node:path'

import { test, expect } from '@playwright/test'

import { FRAMEWORKS, STEP_HEADINGS, fillToCheck, startJourney } from './support/framework-parity.js'

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

for (const framework of FRAMEWORKS) {
  test.describe(`${framework.label} parity`, () => {
    test('validates, preserves answers and reaches confirmation', async ({ page }) => {
      await startJourney(page, framework)

      await page.getByRole('button', { name: 'Continue' }).click()
      await expect(page.locator('.error-summary')).toBeFocused()
      await expect(page.locator('.error-summary')).toContainText('Select yes or no')

      await page.locator('#liked-yes').check()
      await page.getByRole('button', { name: 'Continue' }).click()
      await expect(page.locator('#type')).toHaveValue('')

      await page.fill('#type', `${framework.label} example`)
      await page.getByRole('button', { name: 'Continue' }).click()
      await page.fill('#date-day', '18')
      await page.fill('#date-month', '11')
      await page.fill('#date-year', '2026')
      await page.getByRole('button', { name: 'Continue' }).click()

      await expect(page.locator('.summary')).toContainText(`${framework.label} example`)
      await page.reload()
      await expect(page.locator('.summary')).toContainText(`${framework.label} example`)
      await expect(page.locator('.summary')).toContainText('18 / 11 / 2026')

      await page.getByRole('button', { name: 'Send the sighting' }).click()
      await expect(page.locator(framework.heading)).toBeFocused()
      await expect(page.locator(framework.heading)).toHaveText(STEP_HEADINGS.done)
    })

    test('clears the answers when reporting another sighting', async ({ page }) => {
      await page.goto(`${framework.root}&step=liked`)
      await page.locator('#liked-no').check()
      await page.getByRole('button', { name: 'Continue' }).click()
      await page.fill('#type', 'Temporary example')
      await page.getByRole('button', { name: 'Continue' }).click()
      await page.fill('#date-day', '18')
      await page.fill('#date-month', '11')
      await page.fill('#date-year', '2026')
      await page.getByRole('button', { name: 'Continue' }).click()
      await page.getByRole('button', { name: 'Send the sighting' }).click()

      await page.getByRole('button', { name: 'Report another sighting' }).click()
      await expect(page).toHaveURL(framework.resetUrl)
      await expect(page.locator(framework.heading)).toHaveText(framework.resetHeading)
      await page.getByRole('button', { name: 'Start now' }).click()
      await expect(page.locator('#liked-yes')).not.toBeChecked()
    })

    test('has no unexpected violations on the journey steps', async ({ page }) => {
      await startJourney(page, framework)
      const found = []

      found.push(...await violations(page))
      await page.locator('#liked-yes').check()
      await page.getByRole('button', { name: 'Continue' }).click()
      found.push(...await violations(page))
      await page.fill('#type', `${framework.label} example`)
      await page.getByRole('button', { name: 'Continue' }).click()
      found.push(...await violations(page))
      await page.fill('#date-day', '18')
      await page.fill('#date-month', '11')
      await page.fill('#date-year', '2026')
      await page.getByRole('button', { name: 'Continue' }).click()
      found.push(...await violations(page))

      expect(found).toEqual([])
    })

    test('links to the same step in the other frameworks', async ({ page }) => {
      await page.goto(`${framework.root}&step=check`)

      const nav = page.getByRole('navigation', { name: 'Compare this step' })
      await expect(nav).toBeVisible()
      await expect(nav.getByRole('link', { name: framework.label, exact: true })).toHaveAttribute('aria-current', 'page')

      for (const target of FRAMEWORKS.filter((item) => item.key !== framework.key)) {
        const link = nav.getByRole('link', { name: target.label, exact: true })
        await expect(link).toHaveAttribute('href', new RegExp(`/${target.path}/`))
        await expect(link).toHaveAttribute('href', /step=check/)
        if (target.key === 'paca') {
          await expect(link).toHaveAttribute('href', /role=valid/)
          await expect(link).toHaveAttribute('href', /shadow=open/)
        }
      }
    })

    test('renders a direct check state without previous answers', async ({ page }) => {
      await page.goto(`${framework.root}&step=check`)
      await expect(page.locator(framework.heading)).toHaveText(STEP_HEADINGS.check)
      await expect(page.locator('.summary')).toContainText('Not provided')
    })
  })
}

test.describe('cross-framework navigation', () => {
  test('moves from React check to the Vue check state', async ({ page }) => {
    await page.goto('hedgehog/?state=updated&step=check')
    await page.getByRole('navigation', { name: 'Compare this step' }).getByRole('link', { name: 'Vue', exact: true }).click()

    await expect(page).toHaveURL(/wombat\/\?step=check/)
    await expect(page.locator('#page-heading')).toHaveText(STEP_HEADINGS.check)
    await expect(page.getByRole('navigation', { name: 'Compare this step' })).toBeVisible()
  })
})
