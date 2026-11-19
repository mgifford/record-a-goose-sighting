import path from 'node:path'

import { test, expect } from '@playwright/test'

const AXE_PATH = path.resolve(import.meta.dirname, '../node_modules/axe-core/axe.min.js')

async function json (request, url) {
  const response = await request.get(url)
  expect(response.status(), url).toBe(200)
  return response.json()
}

test.describe('laboratory catalogue', () => {
  test('renders every manifest case as a static card', async ({ page, request }) => {
    const manifest = await json(request, 'lab/fixtures.json')
    await page.goto('lab/catalogue/')

    await expect(page).toHaveTitle('Fixture catalogue')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fixture catalogue')
    await expect(page.locator('.catalogue-card')).toHaveCount(manifest.cases.length)

    const titles = await page.locator('.catalogue-card h3').allTextContents()
    expect(titles.sort()).toEqual(manifest.cases.map((entry) => entry.title).sort())
    await expect(page.getByRole('link', { name: 'Fixtures by category' })).toHaveCount(0)
  })

  test('filters cards by outcome and by rule, and resets', async ({ page, request }) => {
    const manifest = await json(request, 'lab/fixtures.json')
    await page.goto('lab/catalogue/')

    const failed = manifest.cases.filter((entry) => entry.expected === 'failed').length
    const buttons = manifest.cases.filter((entry) => entry.act.ruleId === '97a4e1').length

    await page.getByLabel('Expected outcome').selectOption('failed')
    await expect(page.locator('.catalogue-card:not([hidden])')).toHaveCount(failed)
    await expect(page.locator('#catalogue-result')).toContainText(`${failed} of ${manifest.cases.length}`)

    await page.getByRole('button', { name: 'Reset filters' }).click()
    await expect(page.locator('.catalogue-card:not([hidden])')).toHaveCount(manifest.cases.length)

    await page.getByLabel('ACT rule').selectOption('97a4e1')
    await expect(page.locator('.catalogue-card:not([hidden])')).toHaveCount(buttons)
  })

  test('has labelled filters and a live result count', async ({ page }) => {
    await page.goto('lab/catalogue/')

    for (const label of ['ACT rule', 'Expected outcome', 'Framework', 'Category', 'DOM context', 'Review status', 'Interaction']) {
      await expect(page.getByLabel(label, { exact: true })).toHaveCount(1)
    }

    await expect(page.locator('#catalogue-result')).toHaveAttribute('role', 'status')
    await expect(page.locator('#catalogue-result')).toHaveAttribute('aria-live', 'polite')
  })

  test('is accessible and does not overflow at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    await page.goto('lab/catalogue/')
    await page.addScriptTag({ path: AXE_PATH })

    const result = await page.evaluate(async () => {
      const axe = await window.axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }
      })
      return {
        violations: axe.violations.map((violation) => violation.id),
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth
      }
    })

    expect(result.violations).toEqual([])
    expect(result.scroll).toBeLessThanOrEqual(result.client + 1)
  })

  test('is linked from the laboratory catalogue page', async ({ page }) => {
    await page.goto('lab/')
    await expect(page.getByRole('link', { name: 'Browse all fixtures' })).toHaveAttribute('href', 'catalogue/')
  })
})

test.describe('derived catalogue indexes', () => {
  test('catalogue, scenario, coverage and manifest data agree', async ({ request }) => {
    const [manifest, catalogue, scenarios, coverage] = await Promise.all([
      json(request, 'lab/fixtures.json'),
      json(request, 'lab/catalogue.json'),
      json(request, 'lab/scenarios.json'),
      json(request, 'lab/coverage.json')
    ])

    expect(catalogue.schemaVersion).toBe('lab-catalogue/1')
    expect(catalogue.cases).toHaveLength(manifest.cases.length)
    expect(catalogue.cases.map((entry) => entry.id)).toEqual(manifest.cases.map((entry) => entry.id))

    for (const entry of catalogue.cases) {
      const source = manifest.cases.find((item) => item.id === entry.id)
      expect(entry.title).toBe(source.title)
      expect(entry.act.ruleId).toBe(source.act.ruleId)
      expect(entry.expected).toBe(source.expected)
      expect(entry.url).toMatch(/^\/record-a-goose-sighting\//)
      expect(entry.evidence).toContain(`/lab/reviews/records/${entry.id}.json`)
      expect(entry.source).toMatch(/^https:\/\/github.com\/mgifford\/record-a-goose-sighting\//)
    }

    expect(scenarios.schemaVersion).toBe('lab-scenarios/1')
    const scenarioCaseIds = scenarios.scenarios.flatMap((scenario) => scenario.cases)
    expect(scenarioCaseIds.sort()).toEqual(manifest.cases.map((entry) => entry.id).sort())
    expect(new Set(scenarioCaseIds).size).toBe(manifest.cases.length)

    expect(coverage.schemaVersion).toBe('lab-coverage/1')
    expect(coverage.totals.cases).toBe(manifest.cases.length)
    expect(Object.keys(coverage.byRule)).toHaveLength(5)
    expect(Object.values(coverage.byRule).reduce((sum, rule) => sum + rule.cases, 0)).toBe(manifest.cases.length)
    expect(coverage.byContext.iframe).toBe(4)
    expect(coverage.byInteraction.required).toBe(2)
    expect(coverage.byContext.document).toBe(2)
    expect(coverage.byOutcome.inapplicable).toBe(2)
  })

  test('rule coverage distinguishes outcomes and review status', async ({ request }) => {
    const coverage = await json(request, 'lab/coverage.json')

    expect(coverage.note).toContain('not WCAG coverage')
    for (const rule of Object.values(coverage.byRule)) {
      expect(rule.ruleStatus).toBe('approved')
      expect(rule.ruleRevision).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(rule.outcomes.passed + rule.outcomes.failed + rule.outcomes.inapplicable + rule.outcomes.unknown).toBe(rule.cases)
    }

    expect(coverage.totals.reviewed).toBe(0)
    expect(coverage.totals.unreviewed).toBe(37)
    expect(coverage.totals.disputed).toBe(0)
  })
})
