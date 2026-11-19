import path from 'node:path'

import { test, expect } from '@playwright/test'

const AXE_PATH = path.resolve(import.meta.dirname, '../node_modules/axe-core/axe.min.js')

const PAGES = {
  twoImages: 'lab/correlation/two-images/',
  singleImage: 'lab/correlation/single-image/',
  multiRule: 'lab/correlation/multiple-rules-one-target/',
  repeated: 'lab/correlation/repeated-controls/'
}

async function runAxe (page) {
  await page.addScriptTag({ path: AXE_PATH })

  return page.evaluate(async () => {
    const result = await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }
    })

    return result.violations.map((violation) => ({
      id: violation.id,
      nodes: violation.nodes.length,
      targets: violation.nodes.map((node) => node.target.join(' '))
    }))
  })
}

async function manifest (request) {
  const response = await request.get('lab/fixtures.json')
  expect(response.status()).toBe(200)
  return response.json()
}

test.describe('two distinct image failures', () => {
  test('keeps three separate image targets', async ({ page }) => {
    await page.goto(PAGES.twoImages)
    await expect(page.locator('[data-test-ready="true"]')).toBeVisible()

    const images = page.locator('.fixture-image')
    await expect(images).toHaveCount(3)

    for (const id of ['#missing-alt-a', '#missing-alt-b', '#named-image-control']) {
      await expect(page.locator(id)).toHaveCount(1)
    }

    await expect(page.locator('#missing-alt-a')).not.toHaveAttribute('alt')
    await expect(page.locator('#missing-alt-b')).not.toHaveAttribute('alt')
    await expect(page.locator('#named-image-control')).toHaveAttribute('alt', 'A goose beside a pond')

    const classes = await images.evaluateAll((elements) =>
      elements.map((element) => element.className)
    )
    expect(classes).toEqual(['fixture-image', 'fixture-image', 'fixture-image'])

    const sources = await images.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('src'))
    )
    expect(new Set(sources).size).toBe(3)
  })

  test('records three targets for one scenario', async ({ request }) => {
    const data = await manifest(request)
    const cases = data.cases.filter((entry) => entry.scenarioId === 'two-distinct-images')

    expect(cases).toHaveLength(3)
    expect(new Set(cases.map((entry) => entry.id)).size).toBe(3)
    expect(new Set(cases.map((entry) => entry.target.targetId))).toEqual(
      new Set(['missing-alt-a', 'missing-alt-b', 'named-image-control'])
    )
    expect(new Set(cases.map((entry) => entry.urlPath))).toEqual(
      new Set(['lab/correlation/two-images/'])
    )
    expect(cases.map((entry) => entry.expected).sort()).toEqual(['failed', 'failed', 'passed'])
    expect(cases.every((entry) => entry.review === 'unreviewed')).toBe(true)
  })

  test('only the two intended images fail the rule', async ({ page }) => {
    await page.goto(PAGES.twoImages)
    const violations = await runAxe(page)

    expect(violations.map((violation) => violation.id)).toEqual(['image-alt'])
    expect(violations[0].nodes).toBe(2)
    expect(violations[0].targets.join(' ')).toContain('#missing-alt-a')
    expect(violations[0].targets.join(' ')).toContain('#missing-alt-b')
  })
})

test.describe('one image with no accessible name', () => {
  test('has one target and links to the original example', async ({ page }) => {
    await page.goto(PAGES.singleImage)

    const image = page.locator('#missing-alt')
    await expect(image).toHaveCount(1)
    await expect(image).not.toHaveAttribute('alt')

    const link = page.getByRole('link', { name: 'confirmation page' })
    await expect(link).toHaveAttribute('href', '../../../steps/end/')
  })

  test('records one unreviewed failing case', async ({ request }) => {
    const data = await manifest(request)
    const cases = data.cases.filter((entry) => entry.scenarioId === 'single-image')

    expect(cases).toHaveLength(1)
    expect(cases[0].expected).toBe('failed')
    expect(cases[0].target.targetId).toBe('missing-alt')
    expect(cases[0].review).toBe('unreviewed')
  })

  test('has exactly one image-alt finding', async ({ page }) => {
    await page.goto(PAGES.singleImage)
    const violations = await runAxe(page)

    expect(violations.map((violation) => violation.id)).toEqual(['image-alt'])
    expect(violations[0].nodes).toBe(1)
  })
})

test.describe('two rules on one target', () => {
  test('uses the same element for both rules', async ({ page, request }) => {
    await page.goto(PAGES.multiRule)

    const button = page.locator('#target')
    await expect(button).toHaveCount(1)
    await expect(button).toHaveAttribute('role', 'goose')
    await expect(button).toHaveText('')
    await expect(button).not.toHaveAttribute('aria-label')
    expect(await button.ariaSnapshot()).toBe('- button')

    const data = await manifest(request)
    const cases = data.cases.filter((entry) => entry.scenarioId === 'single-target-two-rules')

    expect(cases).toHaveLength(2)
    expect(cases.map((entry) => entry.act.ruleId).sort()).toEqual(['674b10', '97a4e1'])
    expect(cases.every((entry) => entry.target.selector === '#target')).toBe(true)
    expect(cases.every((entry) => entry.target.targetId === 'target')).toBe(true)
    expect(cases.every((entry) => entry.expected === 'failed')).toBe(true)
  })

  test('produces both intended failures on the same target', async ({ page }) => {
    await page.goto(PAGES.multiRule)
    const violations = await runAxe(page)

    expect(violations.map((violation) => violation.id).sort()).toEqual(['aria-roles', 'button-name'])
    for (const violation of violations) {
      expect(violation.targets.join(' ')).toContain('#target')
    }
  })
})

test.describe('repeated controls', () => {
  test('declares five separate targets', async ({ page, request }) => {
    await page.goto(PAGES.repeated)

    const controls = page.locator('.fixture-control')
    await expect(controls).toHaveCount(5)

    const snapshots = await controls.evaluateAll((elements) => elements.map((element) => element.id))
    expect(new Set(snapshots).size).toBe(5)

    expect(await page.locator('#unnamed-a').ariaSnapshot()).toBe('- button')
    expect(await page.locator('#unnamed-b').ariaSnapshot()).toBe('- button')
    expect(await page.locator('#unnamed-c').ariaSnapshot()).toBe('- button')
    expect(await page.locator('#named-a').ariaSnapshot()).toContain('Save draft')
    expect(await page.locator('#named-b').ariaSnapshot()).toContain('Publish draft')

    const data = await manifest(request)
    const cases = data.cases.filter((entry) => entry.scenarioId === 'repeated-controls')

    expect(cases).toHaveLength(5)
    expect(new Set(cases.map((entry) => entry.target.targetId))).toEqual(
      new Set(['unnamed-a', 'unnamed-b', 'unnamed-c', 'named-a', 'named-b'])
    )
    expect(cases.filter((entry) => entry.expected === 'failed')).toHaveLength(3)
    expect(cases.filter((entry) => entry.expected === 'passed')).toHaveLength(2)
  })

  test('reports only the three unnamed buttons', async ({ page }) => {
    await page.goto(PAGES.repeated)
    const violations = await runAxe(page)

    expect(violations.map((violation) => violation.id)).toEqual(['button-name'])
    expect(violations[0].nodes).toBe(3)
  })
})

test.describe('correlation pages', () => {
  const routes = Object.values(PAGES)

  test('do not overflow at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 })

    for (const route of routes) {
      await page.goto(route)
      const width = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth
      }))
      expect(width.scroll, route).toBeLessThanOrEqual(width.client + 1)
    }
  })

  test('are linked from the laboratory catalogue', async ({ page }) => {
    await page.goto('lab/')

    await expect(page.getByRole('link', { name: 'Two distinct image failures' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Two rules on one target' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Repeated controls' })).toBeVisible()
  })
})
