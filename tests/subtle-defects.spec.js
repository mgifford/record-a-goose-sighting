/**
 * Preserves the subtle comparison fixtures.
 *
 * Like tests/accessibility-regression.spec.js, these assertions are the
 * inverse of a conformance suite: each test fails if the intentional defect is
 * repaired, and each control assertion fails if the correctly implemented
 * counterpart starts behaving like the defect. Both halves are needed to keep
 * false-positive and false-negative comparisons meaningful.
 */
import fs from 'node:fs'
import path from 'node:path'

import { test, expect } from '@playwright/test'

const ROOT = path.resolve(import.meta.dirname, '..')
const REGISTRY = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/known-defects.json'), 'utf8'))
const PAGES = [
  'lab/subtle/names/',
  'lab/subtle/focus-removal/',
  'lab/subtle/status/',
  'lab/subtle/errors/',
  'lab/subtle/aria-state/',
  'lab/subtle/keyboard-toggle/',
  'lab/subtle/reading/',
  'lab/subtle/tables/',
  'lab/subtle/combobox/',
  'lab/subtle/tabs/',
  'lab/subtle/grid/',
  'lab/subtle/responsive-table/',
  'lab/subtle/spa/',
  'lab/subtle/language/',
  'kestrel/index.html',
  'kestrel/details.html',
  'kestrel/confirmation.html'
]

test.describe('subtle fixtures do not leak the answer key', () => {
  for (const route of PAGES) {
    test(`${route} carries realistic identifiers and no defect metadata`, async ({ page }) => {
      await page.goto(route)

      const text = await page.locator('main').innerText()
      expect(text.toLowerCase()).not.toContain('defect')
      expect(text.toLowerCase()).not.toContain('expected outcome')
      expect(text.toLowerCase()).not.toContain('fails wcag')

      const attributes = await page.locator('main *').evaluateAll((elements) =>
        elements.flatMap((element) => [...element.attributes].map((attribute) => `${attribute.name}=${attribute.value}`))
      )
      expect(attributes.some((attribute) => /data-defect|broken|goose-/i.test(attribute))).toBe(false)

      const ids = await page.locator('[id]').evaluateAll((elements) => elements.map((element) => element.id))
      const registryIds = new Set(REGISTRY.defects.map((defect) => defect.id))
      expect(ids.filter((id) => registryIds.has(id))).toEqual([])
    })
  }
})

test.describe('accessible name contradicts the visible label', () => {
  test('keeps the misleading accessible name on variant A', async ({ page }) => {
    await page.goto('lab/subtle/names/')

    const button = page.locator('#delete-a')
    await expect(button).toHaveText('Delete observation')
    await expect(button).toHaveAccessibleName('Save observation')
  })

  test('keeps the visible label as the accessible name on the control', async ({ page }) => {
    await page.goto('lab/subtle/names/')

    const button = page.locator('#delete-b')
    await expect(button).toHaveText('Delete observation')
    await expect(button).toHaveAccessibleName('Delete observation')
  })

  test('deletes the record and shows the same confirmation in both variants', async ({ page }) => {
    await page.goto('lab/subtle/names/')

    await page.locator('#delete-a').click()
    await expect(page.locator('#record-a')).toBeHidden()
    await expect(page.locator('#result-a')).toBeVisible()

    await page.locator('#delete-b').click()
    await expect(page.locator('#record-b')).toBeHidden()
    await expect(page.locator('#result-b')).toBeVisible()
  })
})

test.describe('focus after removing an item', () => {
  test('keeps losing focus in variant A', async ({ page }) => {
    await page.goto('lab/subtle/focus-removal/')

    await page.locator('#remove-a-2').focus()
    await page.locator('#remove-a-2').click()

    await expect(page.locator('#list-a li')).toHaveCount(2)
    const activeElement = await page.evaluate(() => document.activeElement?.tagName)
    expect(activeElement).toBe('BODY')
  })

  test('keeps moving focus to the next control in the control', async ({ page }) => {
    await page.goto('lab/subtle/focus-removal/')

    await page.locator('#remove-b-2').focus()
    await page.locator('#remove-b-2').click()

    await expect(page.locator('#list-b li')).toHaveCount(2)
    await expect(page.locator('#remove-b-3')).toBeFocused()
    await expect(page.locator('#count-b')).toHaveText('2 attendees selected')
  })
})

test.describe('status messages', () => {
  test('keeps the silent confirmation in variant A', async ({ page }) => {
    await page.goto('lab/subtle/status/')

    const output = page.locator('#saved-a')
    await expect(output).toBeHidden()
    expect(await output.getAttribute('role')).toBeNull()

    await page.locator('#save-a').click()
    await expect(output).toBeVisible()
    await expect(output).toHaveText('Draft saved. Last saved 14:32.')
  })

  test('keeps a persistent status region in the control', async ({ page }) => {
    await page.goto('lab/subtle/status/')

    const output = page.locator('#saved-b')
    await expect(output).toHaveAttribute('role', 'status')
    await expect(output).toBeHidden()

    await page.locator('#save-b').click()
    await expect(output).toBeVisible()
    await expect(output).toHaveText('Draft saved. Last saved 14:32.')
  })

  test('keeps the busy state set in variant A', async ({ page }) => {
    await page.goto('lab/subtle/status/')

    await page.locator('#check-a').click()
    await expect(page.locator('#results-a')).toHaveText('4 sessions available in the next seven days.')
    await expect(page.locator('#results-a')).toHaveAttribute('aria-busy', 'true')
  })

  test('clears the busy state in the control', async ({ page }) => {
    await page.goto('lab/subtle/status/')

    await page.locator('#check-b').click()
    await expect(page.locator('#results-b')).toHaveText('4 sessions available in the next seven days.')
    await expect(page.locator('#results-b')).not.toHaveAttribute('aria-busy', 'true')
  })
})

test.describe('form error recovery', () => {
  test('keeps variant A errors unassociated, unfocused and linked to nothing', async ({ page }) => {
    await page.goto('lab/subtle/errors/')

    await page.locator('#submit-a').click()

    await expect(page.locator('#summary-a')).toBeVisible()
    await expect(page.locator('#error-a')).toBeVisible()

    const input = page.locator('#date-a')
    await expect(input).not.toHaveAttribute('aria-invalid', 'true')
    await expect(input).not.toHaveAttribute('required', '')
    expect(await input.getAttribute('aria-describedby')).toBeNull()

    const href = await page.locator('#summary-a a').getAttribute('href')
    expect(href).toBe('#date-a-field')
    expect(await page.locator('#date-a-field').count()).toBe(0)

    const activeElement = await page.evaluate(() => document.activeElement?.id)
    expect(activeElement).toBe('submit-a')
  })

  test('keeps the control associated, required and focused on the summary', async ({ page }) => {
    await page.goto('lab/subtle/errors/')

    await page.locator('#submit-b').click()

    await expect(page.locator('#summary-b')).toBeVisible()
    await expect(page.locator('#error-b')).toBeVisible()

    const input = page.locator('#date-b')
    await expect(input).toHaveAttribute('aria-invalid', 'true')
    await expect(input).toHaveAttribute('required', '')
    await expect(input).toHaveAttribute('aria-describedby', /\berror-b\b/)
    await expect(page.locator('#summary-b a')).toHaveAttribute('href', '#date-b')
    await expect(page.locator('#summary-b-heading')).toBeFocused()
  })
})

test.describe('disclosure state', () => {
  test('keeps the expanded state stale in variant A', async ({ page }) => {
    await page.goto('lab/subtle/aria-state/')

    const button = page.locator('#toggle-a')
    await expect(button).toHaveAttribute('aria-expanded', 'false')
    await button.click()

    await expect(page.locator('#panel-a')).toBeVisible()
    await expect(button).toHaveText('Hide filters')
    await expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  test('keeps the expanded state accurate in the control', async ({ page }) => {
    await page.goto('lab/subtle/aria-state/')

    const button = page.locator('#toggle-b')
    await button.click()

    await expect(page.locator('#panel-b')).toBeVisible()
    await expect(button).toHaveAttribute('aria-expanded', 'true')

    await button.click()
    await expect(page.locator('#panel-b')).toBeHidden()
    await expect(button).toHaveAttribute('aria-expanded', 'false')
  })
})

test.describe('keyboard operability of a switch', () => {
  test('keeps the pointer-only switch inoperable from the keyboard', async ({ page }) => {
    await page.goto('lab/subtle/keyboard-toggle/')

    const control = page.locator('#switch-a')
    await expect(control).toHaveAccessibleName('Morning alert emails')
    await control.focus()

    await page.keyboard.press('Space')
    await expect(control).toHaveAttribute('aria-checked', 'false')

    await page.keyboard.press('Enter')
    await expect(control).toHaveAttribute('aria-checked', 'false')

    await control.click()
    await expect(control).toHaveAttribute('aria-checked', 'true')
  })

  test('keeps the native button switch keyboard operable in the control', async ({ page }) => {
    await page.goto('lab/subtle/keyboard-toggle/')

    const control = page.locator('#switch-b')
    await expect(control).toHaveAccessibleName('Morning alert emails')
    await control.focus()

    await page.keyboard.press('Space')
    await expect(control).toHaveAttribute('aria-checked', 'true')

    await page.keyboard.press('Enter')
    await expect(control).toHaveAttribute('aria-checked', 'false')
  })
})

test.describe('content hidden from the accessibility tree', () => {
  test('keeps the hint hidden from assistive technology in variant A', async ({ page }) => {
    await page.goto('lab/subtle/reading/')

    await expect(page.locator('#hint-a')).toHaveAttribute('aria-hidden', 'true')
    await expect(page.locator('#reference-a')).toHaveAccessibleDescription('')
  })

  test('keeps the hint available to assistive technology in the control', async ({ page }) => {
    await page.goto('lab/subtle/reading/')

    await expect(page.locator('#hint-b')).not.toHaveAttribute('aria-hidden', 'true')
    await expect(page.locator('#reference-b')).toHaveAccessibleDescription('Your reference code is on the confirmation email we sent you.')
  })

  test('keeps the visual-only heading out of the heading list in variant A', async ({ page }) => {
    await page.goto('lab/subtle/reading/')

    const variantA = page.locator('section[aria-labelledby="variant-a"]')
    await expect(variantA.getByRole('heading', { name: 'What happens next', exact: true })).toHaveCount(0)
    await expect(page.locator('.heading-3')).toHaveText('What happens next')
  })

  test('keeps a real heading in the control', async ({ page }) => {
    await page.goto('lab/subtle/reading/')

    const variantB = page.locator('section[aria-labelledby="variant-b"]')
    await expect(variantB.getByRole('heading', { name: 'What happens next', exact: true })).toHaveCount(1)
  })
})
