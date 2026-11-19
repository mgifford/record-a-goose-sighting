import { test, expect } from '@playwright/test'

async function manifest (request) {
  const response = await request.get('lab/fixtures.json')
  expect(response.status()).toBe(200)
  return response.json()
}

test.describe('same-origin frame fixtures', () => {
  test('declares four frame targets, including two in one page', async ({ request }) => {
    const data = await manifest(request)
    const cases = data.cases.filter((entry) => entry.category === 'iframe')

    expect(cases).toHaveLength(4)
    expect(new Set(cases.map((entry) => entry.id)).size).toBe(4)
    expect(cases.filter((entry) => entry.scenarioId === 'two-frames')).toHaveLength(2)
    expect(new Set(cases.filter((entry) => entry.scenarioId === 'two-frames').map((entry) => entry.target.targetId))).toEqual(
      new Set(['first-target', 'second-target'])
    )
    expect(cases.filter((entry) => entry.scenarioId === 'two-frames').every((entry) => entry.target.selector === '#target')).toBe(true)
    expect(cases.find((entry) => entry.id === 'frame-nested-target').target.frame).toEqual(['outer.html', 'inner.html'])
  })

  test('finds the single-frame target', async ({ page }) => {
    await page.goto('lab/frames/single-frame/')

    const frame = page.frameLocator('iframe[title="Frame containing one unnamed button"]')
    const target = frame.locator('#target')

    await expect(target).toHaveCount(1)
    await expect(target).toBeVisible()
    await expect(target).toHaveText('')
    expect(await target.ariaSnapshot()).toBe('- button')
  })

  test('finds the target two frames deep', async ({ page }) => {
    await page.goto('lab/frames/nested-frame/')

    const outer = page.frameLocator('iframe[title="Outer frame containing a nested frame"]')
    const inner = outer.frameLocator('iframe[title="Inner frame containing the unnamed button"]')
    const target = inner.locator('#target')

    await expect(target).toHaveCount(1)
    await expect(target).toBeVisible()
    expect(await target.ariaSnapshot()).toBe('- button')
  })

  test('keeps the two same-ID frame targets distinct', async ({ page }) => {
    await page.goto('lab/frames/two-frames/')

    const first = page.frameLocator('iframe[title="First frame with an unnamed button"]').locator('#target')
    const second = page.frameLocator('iframe[title="Second frame with an unnamed button"]').locator('#target')

    await expect(first).toHaveCount(1)
    await expect(second).toHaveCount(1)
    expect(await first.ariaSnapshot()).toBe('- button')
    expect(await second.ariaSnapshot()).toBe('- button')

    const frames = page.frames().map((frame) => frame.url())
    expect(frames.some((url) => url.endsWith('/first.html'))).toBe(true)
    expect(frames.some((url) => url.endsWith('/second.html'))).toBe(true)
  })

  test('does not overflow at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 })

    for (const route of [
      'lab/frames/single-frame/',
      'lab/frames/nested-frame/',
      'lab/frames/two-frames/'
    ]) {
      await page.goto(route)
      const width = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth
      }))
      expect(width.scroll, route).toBeLessThanOrEqual(width.client + 1)
    }
  })
})
