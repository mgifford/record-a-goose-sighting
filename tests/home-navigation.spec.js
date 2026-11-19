import path from 'node:path'

import { test, expect } from '@playwright/test'

const AXE_PATH = path.resolve(import.meta.dirname, '../node_modules/axe-core/axe.min.js')

test.describe('home page laboratory navigation', () => {
  test('links to the catalogue and all sibling services', async ({ page, request }) => {
    await page.goto('./')

    const nav = page.getByRole('navigation', { name: 'Accessibility laboratory services' })
    await expect(nav).toBeVisible()

    const links = [
      ['Laboratory catalogue', 'lab/catalogue/'],
      ['Report a hedgehog (React)', 'hedgehog/'],
      ['Report a wombat (Vue)', 'wombat/'],
      ['Report a paca (Web Components)', 'paca/']
    ]

    for (const [name, path] of links) {
      const link = nav.getByRole('link', { name, exact: true })
      await expect(link).toHaveAttribute('href', `/record-a-goose-sighting/${path}`)
      expect((await request.get(path)).status(), path).toBe(200)
    }
  })

  test('keeps the exercise entry point and does not overflow at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    await page.goto('./')

    await expect(page.locator('a.govuk-button--start')).toHaveAttribute(
      'href',
      '/record-a-goose-sighting/steps/start/'
    )

    const width = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth
    }))
    expect(width.scroll).toBeLessThanOrEqual(width.client + 1)
  })

  test('adds no automated accessibility problems to the home page', async ({ page }) => {
    await page.goto('./')
    await page.addScriptTag({ path: AXE_PATH })

    const violations = await page.evaluate(async () => {
      const result = await window.axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }
      })
      return result.violations.map((violation) => violation.id)
    })

    expect(violations).toEqual([])
  })
})
