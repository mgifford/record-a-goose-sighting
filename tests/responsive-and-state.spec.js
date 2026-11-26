/**
 * Preserves the grid, responsive-table, single-page-application and language
 * comparison fixtures, including their controls.
 */
import { test, expect } from '@playwright/test'

test.describe('grid row count after expanding', () => {
  test('keeps the alpha row count stale', async ({ page }) => {
    await page.goto('lab/subtle/grid/')

    await expect(page.locator('#grid-a')).toHaveAttribute('aria-rowcount', '5')
    await expect(page.locator('#grid-a [role="row"]:visible')).toHaveCount(5)

    await page.locator('#show-a').click()

    await expect(page.locator('#grid-a [role="row"]:visible')).toHaveCount(13)
    await expect(page.locator('#grid-a')).toHaveAttribute('aria-rowcount', '5')
    await expect(page.locator('#show-a')).toBeHidden()
  })

  test('keeps the control row count accurate', async ({ page }) => {
    await page.goto('lab/subtle/grid/')

    await expect(page.locator('#grid-b')).toHaveAttribute('aria-rowcount', '5')
    await page.locator('#show-b').click()

    await expect(page.locator('#grid-b [role="row"]:visible')).toHaveCount(13)
    await expect(page.locator('#grid-b')).toHaveAttribute('aria-rowcount', '13')
  })
})

test.describe('responsive table headers', () => {
  test('keeps the alpha headers out of the accessibility tree at 320 pixels', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    await page.goto('lab/subtle/responsive-table/')

    await expect(page.locator('#attendance-a thead')).toBeHidden()
    await expect(page.locator('#attendance-a').getByRole('columnheader')).toHaveCount(0)
    await expect(page.locator('#attendance-a').getByRole('rowheader')).toHaveCount(3)
  })

  test('keeps the control headers available at 320 pixels', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    await page.goto('lab/subtle/responsive-table/')

    await expect(page.locator('#attendance-b thead')).not.toBeHidden()
    await expect(page.locator('#attendance-b').getByRole('columnheader')).toHaveCount(3)
    await expect(page.locator('#attendance-b').getByRole('rowheader')).toHaveCount(3)
  })

  test('shows column headers in both versions at a wide width', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto('lab/subtle/responsive-table/')

    await expect(page.locator('#attendance-a').getByRole('columnheader')).toHaveCount(3)
    await expect(page.locator('#attendance-b').getByRole('columnheader')).toHaveCount(3)
  })
})

test.describe('client-side route change', () => {
  test('keeps the alpha page title and announcement stale', async ({ page }) => {
    await page.goto('lab/subtle/spa/')

    await expect(page).toHaveTitle('Observation records: latest and about')
    await page.locator('#a-link-about').click()

    await expect(page.locator('#a-title')).toHaveText('About the records')
    await expect(page).toHaveTitle('Observation records: latest and about')
    await expect(page.locator('#a-status')).toHaveText('')
    await expect(page.locator('#a-link-about')).toHaveAttribute('aria-current', 'page')
  })

  test('keeps the control title and announcement current', async ({ page }) => {
    await page.goto('lab/subtle/spa/')

    await page.locator('#b-link-about').click()
    await expect(page.locator('#b-title')).toHaveText('About the records')
    await expect(page).toHaveTitle('About the records - Observation records')
    await expect(page.locator('#b-status')).toHaveText('Showing about the records.')

    await page.locator('#b-link-records').click()
    await expect(page.locator('#b-title')).toHaveText('Latest records')
    await expect(page).toHaveTitle('Latest records - Observation records')
    await expect(page.locator('#b-status')).toHaveText('Showing latest records.')
    await expect(page.locator('#b-link-records')).toHaveAttribute('aria-current', 'page')
  })

  test('switches views in both versions', async ({ page }) => {
    await page.goto('lab/subtle/spa/')

    await page.locator('#a-link-about').click()
    await expect(page.locator('#a-view')).toContainText('verified by a site warden')

    await page.locator('#b-link-about').click()
    await expect(page.locator('#b-view')).toContainText('verified by a site warden')
  })
})

test.describe('language of parts', () => {
  const french = "La passerelle du marais est fermée aujourd'hui en raison d'une inondation. Merci de votre compréhension."

  test('keeps the alpha French passage without a language', async ({ page }) => {
    await page.goto('lab/subtle/language/')

    await expect(page.locator('#notice-a')).toHaveText(french)
    expect(await page.locator('#notice-a').getAttribute('lang')).toBeNull()
    expect(await page.locator('html').getAttribute('lang')).toBe('en')
  })

  test('keeps the control French passage identified', async ({ page }) => {
    await page.goto('lab/subtle/language/')

    await expect(page.locator('#notice-b')).toHaveText(french)
    await expect(page.locator('#notice-b')).toHaveAttribute('lang', 'fr')
  })
})
