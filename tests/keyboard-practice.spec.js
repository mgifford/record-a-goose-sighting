import path from 'node:path'

import { test, expect } from '@playwright/test'

const AXE_PATH = path.resolve(import.meta.dirname, '../node_modules/axe-core/axe.min.js')

function contrast (foreground, background) {
  const luminance = (rgb) => {
    const values = rgb.map((value) => {
      const channel = value / 255
      return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2]
  }
  const first = luminance(foreground)
  const second = luminance(background)
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

test.describe('keyboard focus practice', () => {
  test('is linked from the home, worksheet and answers pages', async ({ page }) => {
    await page.goto('')
    await expect(page.getByRole('link', { name: 'focus practice page' })).toHaveAttribute(
      'href',
      '/record-a-goose-sighting/steps/keyboard-practice/'
    )

    await page.goto('steps/worksheet/')
    await expect(page.getByRole('link', { name: 'keyboard focus practice page' })).toBeVisible()

    await page.goto('steps/answers/')
    await expect(page.getByRole('link', { name: 'keyboard focus practice page' })).toBeVisible()
  })

  test('the no-focus link really removes the focus indicator', async ({ page }) => {
    await page.goto('steps/keyboard-practice/')

    const link = page.locator('#practice-no-focus')
    await link.focus()
    const style = await link.evaluate((element) => {
      const computed = getComputedStyle(element)
      return {
        outline: computed.outlineStyle,
        background: computed.backgroundColor,
        shadow: computed.boxShadow
      }
    })

    expect(style.outline).toBe('none')
    expect(style.background).toBe('rgba(0, 0, 0, 0)')
    expect(style.shadow).toBe('none')
  })

  test('the low-contrast focus outline has less than 3:1 against the page', async ({ page }) => {
    await page.goto('steps/keyboard-practice/')

    const button = page.locator('#practice-low-contrast')
    await button.focus()
    const style = await button.evaluate((element) => ({
      outline: getComputedStyle(element).outlineColor,
      background: getComputedStyle(document.body).backgroundColor
    }))

    const parse = (value) => value.match(/\d+/g).slice(0, 3).map(Number)
    const outline = parse(style.outline)
    const background = parse(style.background)

    expect(style.outline).toBe('rgb(243, 242, 241)')
    expect(contrast(outline, background)).toBeLessThan(3)
  })

  test('the fixed banner obscures the focused link', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('steps/keyboard-practice/')

    const target = page.locator('#practice-obscured-target')
    await target.focus()

    const result = await page.evaluate(() => {
      const link = document.querySelector('#practice-obscured-target').getBoundingClientRect()
      const banner = document.querySelector('#practice-banner').getBoundingClientRect()
      const overlap = Math.max(0, Math.min(link.bottom, banner.bottom) - Math.max(link.top, banner.top))
      const centre = document.elementFromPoint(
        link.left + link.width / 2,
        link.top + link.height / 2
      )
      return {
        overlap,
        centreTag: centre?.tagName ?? null,
        centreId: centre?.id ?? null,
        bannerId: centre?.closest('#practice-banner')?.id ?? null
      }
    })

    expect(result.overlap).toBeGreaterThan(0)
    expect(result.bannerId).toBe('practice-banner')
  })

  test('Fast Pass-style axe checks do not report the focus failures', async ({ page }) => {
    await page.goto('steps/keyboard-practice/')
    await page.addScriptTag({ path: AXE_PATH })

    const violations = await page.evaluate(async () => {
      const result = await window.axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }
      })
      return result.violations.map((violation) => violation.id)
    })

    expect(violations).toEqual([])
  })

  test('does not overflow at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    await page.goto('steps/keyboard-practice/')

    const width = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth
    }))

    expect(width.scroll).toBeLessThanOrEqual(width.client + 1)
  })
})

test.describe('Accessibility Insights guidance', () => {
  test('replaces WAVE guidance on the home and worksheet pages', async ({ page }) => {
    await page.goto('')
    await expect(page.getByRole('link', { name: 'Accessibility Insights for Web' })).toBeVisible()
    await expect(page.locator('main')).not.toContainText('WAVE')

    await page.goto('steps/worksheet/')
    await expect(page.locator('main')).toContainText('Fast Pass')
    await expect(page.locator('main')).toContainText('Tab stops')
    await expect(page.locator('main')).not.toContainText('WAVE')
  })
})
