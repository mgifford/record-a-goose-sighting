import path from 'node:path'

import { test, expect } from '@playwright/test'

const AXE_PATH = path.resolve(import.meta.dirname, '../node_modules/axe-core/axe.min.js')

test.describe('interpreting tool results', () => {
  test('presents six deliberate interpretation cases', async ({ page }) => {
    await page.goto('lab/interpretation/')

    await expect(page).toHaveTitle('Interpreting tool results')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Interpreting tool results')
    await expect(page.locator('.interpretation-case')).toHaveCount(6)

    await expect(page.getByRole('heading', { level: 2 })).toHaveCount(6)
    await expect(page.getByText('best-practice finding, not a WCAG failure')).toBeVisible()
    await expect(page.getByText('tool pass that fails review: invisible focus')).toBeVisible()
  })

  test('matches the recorded axe observations', async ({ page }) => {
    await page.goto('lab/interpretation/')
    await page.addScriptTag({ path: AXE_PATH })

    const result = await page.evaluate(async () => {
      const run = await window.axe.run(document, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']
        }
      })
      return {
        violations: run.violations.map((violation) => violation.id).sort(),
        incomplete: run.incomplete.map((item) => item.id).sort()
      }
    })

    // The heading sequence is the intentional best-practice example.
    expect(result.violations).toEqual(['heading-order'])
    // Contrast over a background gradient cannot be decided automatically.
    expect(result.incomplete).toContain('color-contrast')
  })

  test('the focus example really removes the focus indicator', async ({ page }) => {
    await page.goto('lab/interpretation/')

    const link = page.getByRole('link', { name: 'A link whose focus indicator has been removed' })
    await link.focus()

    const style = await link.evaluate((element) => {
      const computed = getComputedStyle(element)
      return {
        outlineStyle: computed.outlineStyle,
        backgroundColor: computed.backgroundColor,
        boxShadow: computed.boxShadow
      }
    })

    expect(style.outlineStyle).toBe('none')
    expect(style.backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(style.boxShadow).toBe('none')
  })

  test('distinguishes decorative and unhelpful image alternatives', async ({ page }) => {
    await page.goto('lab/interpretation/')

    const images = page.locator('.fixture img')
    await expect(images).toHaveCount(2)

    const alternatives = await images.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('alt'))
    )

    expect(alternatives).toEqual(['', 'goose-mark.svg'])
  })

  test('keeps the hidden-instruction example hidden', async ({ page }) => {
    await page.goto('lab/interpretation/')

    const hint = page.locator('#hidden-hint')
    await expect(hint).toHaveAttribute('hidden', '')
    await expect(page.locator('#hidden-hint-input')).toHaveAttribute('aria-describedby', 'hidden-hint')
  })

  test('is linked from the laboratory catalogue', async ({ page }) => {
    await page.goto('lab/')

    await expect(
      page.getByRole('link', { name: 'Interpreting tool results' })
    ).toHaveAttribute('href', 'interpretation/')
  })

  test('does not overflow at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    await page.goto('lab/interpretation/')

    const width = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth
    }))

    expect(width.scroll).toBeLessThanOrEqual(width.client + 1)
  })
})
