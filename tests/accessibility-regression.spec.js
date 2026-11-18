/**
 * Guards the accessibility problems that the exercise teaches.
 *
 * These assertions are deliberately the inverse of an accessibility test
 * suite: they fail if someone fixes the defects. Where a defect is visual or
 * behavioural (focus order, contrast, justification, animation) the test
 * measures the rendered result rather than only reading an attribute.
 */
import fs from 'node:fs'
import path from 'node:path'

import { test, expect } from '@playwright/test'

import { BASE_PATH, contrastRatio, focusOrder } from './support/exercise.js'

const ROOT = path.resolve(import.meta.dirname, '..')

const AXE_PATH = path.join(ROOT, 'node_modules/axe-core/axe.min.js')
const AXE_BASELINE = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'tests/baseline/axe.json'), 'utf8')
)

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']

const PAGES = {
  index: '',
  'steps-start': 'steps/start/',
  'steps-geese-liked': 'steps/geese-liked/',
  'steps-goose-type': 'steps/goose-type/',
  'steps-date-saw-goose': 'steps/date-saw-goose/',
  'steps-check-your-answers': 'steps/check-your-answers/',
  'steps-end': 'steps/end/',
  'steps-worksheet': 'steps/worksheet/',
  'steps-answers': 'steps/answers/'
}

async function runAxe (page) {
  await page.addScriptTag({ path: AXE_PATH })

  return page.evaluate(async (tags) => {
    const result = await window.axe.run(document, {
      runOnly: { type: 'tag', values: tags }
    })

    return result.violations.map((violation) => violation.id).sort()
  }, AXE_TAGS)
}

test.describe('start page defects', () => {
  test('keeps two first-level headings', async ({ page }) => {
    await page.goto(PAGES['steps-start'])

    await expect(page.locator('h1')).toHaveCount(2)
    await expect(page.locator('h1').nth(1)).toHaveText('Information about Geese')
  })

  test('keeps the related links in a different visual order to the DOM', async ({ page }) => {
    await page.goto(PAGES['steps-start'])

    const links = page.locator('.custom-list > li')

    const domOrder = await links.evaluateAll((items) =>
      items.map((item) => item.querySelector('a').textContent.trim())
    )

    const visualOrder = await links.evaluateAll((items) =>
      items
        .map((item) => ({
          text: item.querySelector('a').textContent.trim(),
          order: Number(getComputedStyle(item).order)
        }))
        .sort((first, second) => first.order - second.order)
        .map((entry) => entry.text)
    )

    expect(domOrder).toEqual([
      'Read about geese on Wikipedia',
      'More',
      'Visit the RSPB website'
    ])

    expect(visualOrder).toEqual([
      'Read about geese on Wikipedia',
      'Visit the RSPB website',
      'More'
    ])

    expect(visualOrder).not.toEqual(domOrder)
  })

  test('keeps an external link that opens a new tab without warning', async ({ page }) => {
    await page.goto(PAGES['steps-start'])

    const link = page.locator('a[target="_blank"]')

    await expect(link).toHaveCount(1)
    await expect(link).toHaveAttribute('href', 'https://www.rspb.org.uk/')
    await expect(link).toHaveAccessibleName('Visit the RSPB website')
    expect(await link.getAttribute('aria-describedby')).toBeNull()
  })

  test('keeps the ambiguous "More" link text', async ({ page }) => {
    await page.goto(PAGES['steps-start'])

    const link = page.getByRole('link', { name: 'More', exact: true })
    await expect(link).toHaveAttribute('href', 'https://www.wildlondon.org.uk/')
  })

  test('keeps the invisible focus indicator on the related links', async ({ page }) => {
    await page.goto(PAGES['steps-start'])

    const link = page.locator('a.link').first()
    await link.focus()

    const style = await link.evaluate((element) => {
      const computed = getComputedStyle(element)
      return {
        outlineStyle: computed.outlineStyle,
        outlineWidth: computed.outlineWidth,
        backgroundColor: computed.backgroundColor,
        boxShadow: computed.boxShadow
      }
    })

    expect(style.outlineStyle).toBe('none')
    expect(style.backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(style.boxShadow).toBe('none')
  })

  test('keeps keyboard order following the DOM, not the visual order', async ({ page }) => {
    await page.goto(PAGES['steps-start'])

    const order = (await focusOrder(page, 7)).map((stop) => stop.text)

    expect(order).toEqual([
      'Skip to main content',
      'Home',
      'Environment and Countryside',
      'Wildlife and Biodiversity',
      'Start now',
      'Read about geese on Wikipedia',
      'More'
    ])
  })
})

test.describe('do you like geese? defects', () => {
  test('keeps the empty page title', async ({ page }) => {
    await page.goto(PAGES['steps-geese-liked'])
    expect(await page.title()).toBe('')
  })

  test('keeps the empty radio group legend', async ({ page }) => {
    await page.goto(PAGES['steps-geese-liked'])

    // GOV.UK Frontend 3 omits the legend entirely when no legend text is
    // supplied, so the radio group has no accessible name at all.
    const fieldset = page.locator('fieldset')
    await expect(fieldset).toHaveCount(1)
    await expect(fieldset.locator('legend')).toHaveCount(0)

    // The question is outside the fieldset, so it is not the group's label.
    const headingInFieldset = page.locator('fieldset h1')
    await expect(headingInFieldset).toHaveCount(0)
  })

  test('keeps the Continue button out of sequential keyboard focus', async ({ page }) => {
    await page.goto(PAGES['steps-geese-liked'])

    const button = page.locator('button.govuk-button')
    await expect(button).toHaveAttribute('tabindex', '-1')

    const stops = await focusOrder(page, 6)
    expect(stops.some((stop) => stop.text === 'Continue')).toBe(false)
  })

  test('keeps the low-contrast hint text', async ({ page }) => {
    await page.goto(PAGES['steps-geese-liked'])

    const hint = page.locator('.goose-liked-hint')
    const colour = await hint.evaluate((element) => getComputedStyle(element).color)

    expect(colour).toBe('rgb(157, 157, 161)')

    const ratio = await contrastRatio(page, colour, 'rgb(255, 255, 255)')
    expect(ratio).toBeLessThan(4.5)
  })
})

test.describe('goose type defects', () => {
  test('keeps the "Boop" page title', async ({ page }) => {
    await page.goto(PAGES['steps-goose-type'])
    expect(await page.title()).toBe('Boop - Record a goose sighting')
  })

  test('keeps the focusable, visually hidden ghost goose', async ({ page }) => {
    await page.goto(PAGES['steps-goose-type'])

    const ghost = page.getByText('Ghost goose', { exact: true })
    await expect(ghost).toHaveAttribute('tabindex', '0')

    const box = await ghost.boundingBox()
    expect(box.width).toBeLessThanOrEqual(1)
    expect(box.height).toBeLessThanOrEqual(1)

    const stops = (await focusOrder(page, 3)).map((stop) => stop.text)
    expect(stops[0]).toBe('Skip to main content')
    expect(stops[1]).toBe('Ghost goose')
  })

  test('keeps the placeholder as the only formatting instruction', async ({ page }) => {
    await page.goto(PAGES['steps-goose-type'])

    const input = page.locator('input[name="goose-type"]')
    await expect(input).toHaveAttribute('placeholder', 'Black spur-winged goose')

    const describedBy = await input.getAttribute('aria-describedby')
    expect(describedBy).toBeNull()
  })
})

test.describe('date page is intentionally clean', () => {
  test('keeps a single meaningful heading and properly labelled inputs', async ({ page }) => {
    await page.goto(PAGES['steps-date-saw-goose'])

    expect(await page.title()).toBe('When did you see the goose - Record a goose sighting')
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('h1')).toHaveText('When did you see the goose?')

    await expect(page.locator('label[for="date-saw-goose-day"]')).toHaveText(/Day/)
    await expect(page.locator('label[for="date-saw-goose-month"]')).toHaveText(/Month/)
    await expect(page.locator('label[for="date-saw-goose-year"]')).toHaveText(/Year/)

    await expect(page.locator('[tabindex]')).toHaveCount(0)
    await expect(page.locator('a[target="_blank"]')).toHaveCount(0)
    await expect(page.locator('.govuk-hint')).toHaveText('For example, 16 4 2017')
  })
})

test.describe('check your answers defects', () => {
  test('keeps the incorrect visually hidden Change-link text', async ({ page }) => {
    await page.goto(PAGES['steps-check-your-answers'])

    const hidden = page.locator('.govuk-visually-hidden')
    await expect(hidden.filter({ hasText: 'biscuits' })).toHaveCount(1)
    await expect(hidden.filter({ hasText: 'cake' })).toHaveCount(1)
  })

  test('keeps the incorrect heading hierarchy', async ({ page }) => {
    await page.goto(PAGES['steps-check-your-answers'])

    const levels = await page.locator('h1,h2,h3').evaluateAll((headings) =>
      headings.map((heading) => Number(heading.tagName.slice(1)))
    )

    expect(levels.slice(0, 2)).toEqual([1, 3])
  })

  test('keeps the summary list structure', async ({ page }) => {
    await page.goto(PAGES['steps-check-your-answers'])

    await expect(page.locator('.govuk-summary-list__row')).toHaveCount(3)
    await expect(page.locator('.govuk-summary-list__key')).toHaveCount(3)
  })
})

test.describe('confirmation page defects', () => {
  test('keeps the uppercase confirmation heading', async ({ page }) => {
    await page.goto(PAGES['steps-end'])

    const heading = page.locator('.govuk-panel__title')
    await expect(heading).toHaveText('GOOSE RECORDED')
  })

  test('keeps the justified text', async ({ page }) => {
    await page.goto(PAGES['steps-end'])

    const paragraph = page.locator('.justified-text')
    await expect(paragraph).toHaveCount(1)

    const alignment = await paragraph.evaluate((element) => getComputedStyle(element).textAlign)
    expect(alignment).toBe('justify')
  })

  test('keeps the animated GIF without alternative text', async ({ page }) => {
    await page.goto(PAGES['steps-end'])

    const image = page.locator('img[src*="giphy.com"]')
    await expect(image).toHaveCount(1)

    const hasAlt = await image.evaluate((element) => element.hasAttribute('alt'))
    expect(hasAlt).toBe(false)
  })

  test('keeps the animation uncontrollable', async ({ page }) => {
    await page.goto(PAGES['steps-end'])

    expect(await page.getByRole('button', { name: /pause|stop|hide/i }).count()).toBe(0)

    const image = page.locator('img[src*="giphy.com"]')
    await expect(image).toHaveAttribute('src', /giphy\.gif$/)
    await expect(image).not.toHaveAttribute('controls', /.*/)
  })
})

test.describe('answer sheet integrity', () => {
  test('still claims 19 issues while describing 18', async ({ page }) => {
    await page.goto(PAGES['steps-answers'])

    // The published count and the number of described issues are recorded as
    // they were found. Correcting either is a separate content decision.
    await expect(page.locator('p').first()).toContainText('There are 19 issues in total')
    await expect(page.locator('dt')).toHaveCount(18)
  })

  test('keeps the worksheet available', async ({ page }) => {
    await page.goto(PAGES['steps-worksheet'])

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Worksheet')
    await expect(page.getByText('Testing checklist')).toBeVisible()
  })
})

test.describe('axe baseline', () => {
  for (const [slug, route] of Object.entries(PAGES)) {
    test(`${slug} introduces no new automated findings`, async ({ page }) => {
      await page.goto(route)

      const found = await runAxe(page)
      const expected = AXE_BASELINE[slug] || []

      const unexpected = found.filter((rule) => !expected.includes(rule))

      expect(
        unexpected,
        `${slug} has new axe violations that are not part of the exercise: ${unexpected.join(', ')}`
      ).toEqual([])

      const fixed = expected.filter((rule) => !found.includes(rule))
      expect(
        fixed,
        `${slug} no longer reproduces these recorded findings: ${fixed.join(', ')}`
      ).toEqual([])
    })
  }
})

test.describe('base path', () => {
  test('all internal links stay within the published base path', async ({ page }) => {
    for (const route of Object.values(PAGES)) {
      await page.goto(route)

      const hrefs = await page.locator('a[href^="/"]').evaluateAll((links) =>
        links.map((link) => link.getAttribute('href'))
      )

      for (const href of hrefs) {
        expect(href.startsWith(BASE_PATH), `${route}: ${href}`).toBe(true)
      }
    }
  })
})
