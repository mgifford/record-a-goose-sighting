/**
 * Preserves the table, combobox and tabs comparison fixtures.
 *
 * Each pair looks the same and produces the same visible result. The asserted
 * difference is the accessibility implementation, so these tests fail if the
 * defect is repaired or if the control regresses.
 */
import { test, expect } from '@playwright/test'

test.describe('table header association', () => {
  test('keeps the alpha column headings as plain cells', async ({ page }) => {
    await page.goto('lab/subtle/tables/')

    await expect(page.locator('#attendance-a thead th')).toHaveCount(0)
    await expect(page.locator('#attendance-a thead td')).toHaveCount(3)
    await expect(page.locator('#attendance-a thead td').first()).toHaveText('Session')
  })

  test('keeps the control column headings as column headers', async ({ page }) => {
    await page.goto('lab/subtle/tables/')

    await expect(page.locator('#attendance-b thead th')).toHaveCount(3)
    await expect(page.locator('#attendance-b thead th').first()).toHaveAttribute('scope', 'col')
  })
})

test.describe('table sort state', () => {
  test('keeps the alpha sort state stale', async ({ page }) => {
    await page.goto('lab/subtle/tables/')

    await expect(page.locator('#sort-a-header')).toHaveAttribute('aria-sort', 'none')
    await page.locator('#sort-a-button').click()

    await expect(page.locator('#sort-a tbody tr').first()).toHaveAttribute('data-date', '2026-11-15')
    await expect(page.locator('#sort-a-header')).toHaveAttribute('aria-sort', 'none')

    await page.locator('#sort-a-button').click()
    await expect(page.locator('#sort-a tbody tr').first()).toHaveAttribute('data-date', '2026-11-20')
    await expect(page.locator('#sort-a-header')).toHaveAttribute('aria-sort', 'none')
  })

  test('keeps the control sort state accurate', async ({ page }) => {
    await page.goto('lab/subtle/tables/')

    await expect(page.locator('#sort-b-header')).toHaveAttribute('aria-sort', 'none')
    await page.locator('#sort-b-button').click()
    await expect(page.locator('#sort-b-header')).toHaveAttribute('aria-sort', 'ascending')

    await page.locator('#sort-b-button').click()
    await expect(page.locator('#sort-b-header')).toHaveAttribute('aria-sort', 'descending')
    await expect(page.locator('#sort-b tbody tr').first()).toHaveAttribute('data-date', '2026-11-20')
  })
})

test.describe('combobox active descendant', () => {
  test('keeps the alpha active descendant on a filtered-out option', async ({ page }) => {
    await page.goto('lab/subtle/combobox/')

    await page.locator('#species-a').fill('mag')

    await expect(page.locator('#species-a-option-mallard')).toBeHidden()
    await expect(page.locator('#species-a')).toHaveAttribute('aria-activedescendant', 'species-a-option-mallard')
    await expect(page.locator('#species-a')).toHaveAttribute('aria-expanded', 'true')
  })

  test('keeps the control active descendant on a visible option', async ({ page }) => {
    await page.goto('lab/subtle/combobox/')

    await page.locator('#species-b').fill('mag')

    await expect(page.locator('#species-b-option-magpie')).toBeVisible()
    await expect(page.locator('#species-b')).toHaveAttribute('aria-activedescendant', 'species-b-option-magpie')
    await expect(page.locator('#species-b-option-magpie')).toHaveAttribute('aria-selected', 'true')
  })
})

test.describe('tabs keyboard model', () => {
  test('keeps every alpha tab in the tab order', async ({ page }) => {
    await page.goto('lab/subtle/tabs/')

    for (const id of ['tab-a-latest', 'tab-a-pending', 'tab-a-archive']) {
      await expect(page.locator(`#${id}`)).toHaveAttribute('tabindex', '0')
    }
  })

  test('keeps alpha arrow navigation missing', async ({ page }) => {
    await page.goto('lab/subtle/tabs/')

    await page.locator('#tab-a-latest').focus()
    await page.keyboard.press('ArrowRight')

    await expect(page.locator('#tab-a-latest')).toBeFocused()
    await expect(page.locator('#tab-a-latest')).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('#panel-a-pending')).toBeHidden()
  })

  test('keeps the control roving tabindex', async ({ page }) => {
    await page.goto('lab/subtle/tabs/')

    await expect(page.locator('#tab-b-latest')).toHaveAttribute('tabindex', '0')
    await expect(page.locator('#tab-b-pending')).toHaveAttribute('tabindex', '-1')
    await expect(page.locator('#tab-b-archive')).toHaveAttribute('tabindex', '-1')
  })

  test('keeps control arrow navigation working', async ({ page }) => {
    await page.goto('lab/subtle/tabs/')

    await page.locator('#tab-b-latest').focus()
    await page.keyboard.press('ArrowRight')

    await expect(page.locator('#tab-b-pending')).toBeFocused()
    await expect(page.locator('#tab-b-pending')).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('#panel-b-pending')).toBeVisible()
    await expect(page.locator('#panel-b-latest')).toBeHidden()
    await expect(page.locator('#tab-b-pending')).toHaveAttribute('tabindex', '0')
    await expect(page.locator('#tab-b-latest')).toHaveAttribute('tabindex', '-1')
  })

  test('keeps clicking working in both tab sets', async ({ page }) => {
    await page.goto('lab/subtle/tabs/')

    await page.locator('#tab-a-archive').click()
    await expect(page.locator('#panel-a-archive')).toBeVisible()

    await page.locator('#tab-b-archive').click()
    await expect(page.locator('#panel-b-archive')).toBeVisible()
  })
})
