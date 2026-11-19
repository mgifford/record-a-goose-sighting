import path from 'node:path'

import { test, expect } from '@playwright/test'

const AXE_PATH = path.resolve(import.meta.dirname, '../node_modules/axe-core/axe.min.js')

async function axe (page) {
  await page.addScriptTag({ path: AXE_PATH })
  return page.evaluate(async () => {
    const result = await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }
    })
    return result.violations.map((violation) => violation.id)
  })
}

test.describe('preference scenarios', () => {
  test('reduced motion stops only the respectful animation', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('lab/preferences/reduced-motion/')

    const safe = await page.locator('#motion-safe').evaluate((element) => getComputedStyle(element).animationName)
    const always = await page.locator('#motion-always').evaluate((element) => getComputedStyle(element).animationName)

    expect(safe).toBe('none')
    expect(always).toBe('spin')
    expect(await axe(page)).toEqual([])
  })

  test('forced colours expose the background-image focus failure', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' })
    await page.goto('lab/preferences/forced-colors/')

    const forced = await page.evaluate(() => matchMedia('(forced-colors: active)').matches)
    expect(forced).toBe(true)

    await page.locator('#outline-focus').focus()
    const outline = await page.locator('#outline-focus').evaluate((element) => getComputedStyle(element).outlineStyle)
    expect(outline).toBe('solid')

    await page.locator('#background-focus').focus()
    const background = await page.locator('#background-focus').evaluate((element) => ({
      image: getComputedStyle(element).backgroundImage,
      outline: getComputedStyle(element).outlineStyle
    }))
    expect(background.image).toBe('none')
    expect(background.outline).toBe('none')
  })

  test('text spacing at 320px does not overflow', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    await page.goto('lab/preferences/text-spacing/')

    await page.addStyleTag({
      content: '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p, li { margin-bottom: 2em !important; }'
    })

    const width = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth
    }))

    expect(width.scroll).toBeLessThanOrEqual(width.client + 1)
    expect(await axe(page)).toEqual([])
  })
})
