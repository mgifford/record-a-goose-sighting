import fs from 'node:fs'
import path from 'node:path'

import { test, expect } from '@playwright/test'

import { BASE_PATH, focusOrder } from './support/exercise.js'

const ROOT = path.resolve(import.meta.dirname, '..')
const AXE_PATH = path.join(ROOT, 'node_modules/axe-core/axe.min.js')
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

async function runAxe (page) {
  await page.addScriptTag({ path: AXE_PATH })

  return page.evaluate(async (tags) => {
    const result = await window.axe.run(document, {
      runOnly: { type: 'tag', values: tags }
    })

    return result.violations.map((violation) => ({
      id: violation.id,
      targets: violation.nodes.map((node) => node.target.join(' '))
    }))
  }, AXE_TAGS)
}

function violationIds (violations) {
  return violations.map((violation) => violation.id)
}

test.describe('laboratory catalogue', () => {
  test('is the new entry point and leaves the Goose homepage untouched', async ({ page }) => {
    await page.goto('')
    await expect(page).toHaveTitle('Instructions - Record a goose sighting')

    await page.goto('lab/')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Animal reporting laboratory')

    for (const name of ['Report a hedgehog', 'Report a wombat', 'Report a paca']) {
      await expect(page.getByRole('link', { name })).toBeVisible()
    }

    await expect(page.getByRole('link', { name: /Valid ARIA role/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Button without an accessible name/ })).toBeVisible()
  })

  test('has no automated accessibility problems itself', async ({ page }) => {
    await page.goto('lab/')

    const violations = await runAxe(page)
    expect(violationIds(violations)).toEqual([])
  })

  test('links to the published manifest', async ({ request }) => {
    const response = await request.get('lab/fixtures.json')
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('application/json')
  })
})

test.describe('isolated ACT fixtures', () => {
  const fixtures = [
    {
      path: 'lab/aria/role-valid/',
      rule: '674b10',
      expected: 'passed',
      text: 'Report an animal',
      markup: 'role="button"'
    },
    {
      path: 'lab/aria/role-invalid/',
      rule: '674b10',
      expected: 'failed',
      text: 'Report an animal',
      markup: 'role="goose"'
    },
    {
      path: 'lab/names/button-named/',
      rule: '97a4e1',
      expected: 'passed',
      name: 'Report an animal'
    },
    {
      path: 'lab/names/button-unnamed/',
      rule: '97a4e1',
      expected: 'failed'
    }
  ]

  for (const fixture of fixtures) {
    test(`${fixture.path} is a single unreviewed ${fixture.rule} case`, async ({ page }) => {
      await page.goto(fixture.path)

      const target = page.locator('#test-target')
      await expect(target).toHaveCount(1)

      if (fixture.markup) {
        await expect(target).toHaveAttribute('role', fixture.expected === 'passed' ? 'button' : 'goose')
      }

      if (fixture.name) {
        expect(await target.ariaSnapshot()).toContain(fixture.name)
      }

      await expect(page.locator('.meta').first()).toContainText(fixture.rule)
      await expect(page.getByText('unreviewed hypothesis').first()).toBeVisible()
      await expect(page.getByText('approved').first()).toBeVisible()
    })
  }

  test('the valid role is reported as passing by axe', async ({ page }) => {
    await page.goto('lab/aria/role-valid/')
    expect(violationIds(await runAxe(page))).toEqual([])
  })

  test('the invalid role is reported as failing by axe', async ({ page }) => {
    await page.goto('lab/aria/role-invalid/')

    const violations = await runAxe(page)
    expect(violationIds(violations)).toContain('aria-roles')
    expect(violations.find((violation) => violation.id === 'aria-roles').targets.join(' ')).toContain('#test-target')
  })

  test('the named button is reported as passing by axe', async ({ page }) => {
    await page.goto('lab/names/button-named/')
    expect(violationIds(await runAxe(page))).not.toContain('button-name')
  })

  test('the unnamed button is reported as failing by axe', async ({ page }) => {
    await page.goto('lab/names/button-unnamed/')

    const violations = await runAxe(page)
    expect(violationIds(violations)).toContain('button-name')
    expect(violations.find((violation) => violation.id === 'button-name').targets.join(' ')).toContain('#test-target')
  })
})

test.describe('report a hedgehog (React)', () => {
  test('keeps the ACT states addressable', async ({ page }) => {
    await page.goto('hedgehog/?state=initial')
    await expect(page.locator('#app')).toHaveAttribute('data-lab-state', 'initial')
    expect(await page.locator('#test-target').ariaSnapshot()).toBe('- button')

    await page.goto('hedgehog/?state=updated')
    await expect(page.locator('#app')).toHaveAttribute('data-lab-state', 'updated')
    expect(await page.locator('#test-target').ariaSnapshot()).toContain('Review hedgehog sighting')
  })

  test('the initial state is an unreviewed 97a4e1 failure', async ({ page }) => {
    await page.goto('hedgehog/?state=initial')
    await expect(page.locator('[data-test-ready="true"]')).toBeVisible()

    const violations = await runAxe(page)
    expect(violationIds(violations)).toContain('button-name')
  })

  test('completes the review and confirmation journey', async ({ page }) => {
    await page.goto('hedgehog/?state=updated')

    await page.fill('#place', 'Under the shed')
    await page.fill('#date', '2026-11-18')
    await page.fill('#activity', 'Snuffling')
    await page.getByRole('button', { name: 'Review the sighting' }).click()

    await expect(page.locator('#review-heading')).toBeFocused()
    const summary = page.locator('.summary')
    await expect(summary).toContainText('Under the shed')
    await expect(summary).toContainText('2026-11-18')
    await expect(summary).toContainText('Snuffling')

    await page.getByRole('button', { name: 'Confirm sighting' }).click()
    await expect(page.locator('#done-heading')).toBeFocused()
    await expect(page.getByText('The fictional hedgehog sighting has been recorded in this browser only.')).toBeVisible()
  })

  test('can edit before confirming', async ({ page }) => {
    await page.goto('hedgehog/?state=initial')

    await page.fill('#place', 'First place')
    await page.fill('#date', '2026-11-18')
    await page.getByRole('button', { name: 'Review the sighting' }).click()
    await page.getByRole('button', { name: 'Edit details' }).click()

    await expect(page.locator('#place')).toHaveValue('First place')
    await page.fill('#place', 'Second place')
    await page.getByRole('button', { name: 'Review the sighting' }).click()
    await expect(page.locator('.summary')).toContainText('Second place')
  })
})

test.describe('report a wombat (Vue)', () => {
  test('keeps the ACT states addressable', async ({ page }) => {
    await page.goto('wombat/?state=initial')
    await expect(page.locator('#app')).toHaveAttribute('data-lab-state', 'initial')
    expect(await page.locator('#test-target').ariaSnapshot()).toBe('- button')

    await page.goto('wombat/?state=updated')
    await expect(page.locator('#app')).toHaveAttribute('data-lab-state', 'updated')
    expect(await page.locator('#test-target').ariaSnapshot()).toContain('Review wombat sighting')
  })

  test('announces the review step and completes the journey', async ({ page }) => {
    await page.goto('wombat/?state=updated')

    await page.fill('#place', 'Burrow entrance')
    await page.fill('#date', '2026-11-18')
    await page.fill('#activity', 'Digging')
    await page.getByRole('button', { name: 'Review the sighting' }).click()

    await expect(page.locator('#review-heading')).toBeFocused()
    await expect(page.locator('[role="status"]')).toHaveText('Review your sighting before confirming.')
    await expect(page.locator('.summary')).toContainText('Burrow entrance')

    await page.getByRole('button', { name: 'Confirm sighting' }).click()
    await expect(page.locator('#done-heading')).toBeFocused()
    await expect(page.getByText('The fictional wombat sighting has been recorded in this browser only.')).toBeVisible()
  })
})

test.describe('report a paca (Web Components)', () => {
  test('exposes an open shadow target for the valid role', async ({ page }) => {
    await page.goto('paca/?role=valid&shadow=open')

    await expect(page.locator('#test-host')).toHaveAttribute('data-shadow-mode', 'open')
    expect(await page.locator('#test-target').ariaSnapshot()).toContain('Review paca sighting')
    expect(violationIds(await runAxe(page))).toEqual([])
  })

  test('reports the invalid role inside the open shadow root', async ({ page }) => {
    await page.goto('paca/?role=invalid&shadow=open')

    const violations = await runAxe(page)
    expect(violationIds(violations)).toContain('aria-roles')
  })

  test('does not expose a closed shadow root to automation', async ({ page }) => {
    await page.goto('paca/?role=invalid&shadow=closed')

    const host = page.locator('#test-host')
    await expect(host).toHaveAttribute('data-shadow-mode', 'closed')
    await expect(host).toHaveAttribute('data-test-ready', 'true')

    expect(await host.evaluate((element) => element.shadowRoot)).toBeNull()
    expect(await page.locator('#test-target').count()).toBe(0)
  })

  test('completes the review and confirmation journey in the open shadow root', async ({ page }) => {
    await page.goto('paca/?role=valid&shadow=open')

    await page.locator('#place').fill('Beside the path')
    await page.locator('#date').fill('2026-11-18')
    await page.getByRole('button', { name: 'Review the sighting' }).click()

    await expect(page.locator('#review-heading')).toBeFocused()
    await expect(page.locator('.summary')).toContainText('Beside the path')

    await page.getByRole('button', { name: 'Confirm sighting' }).click()
    await expect(page.locator('#done-heading')).toBeFocused()
  })
})

test.describe('fixture manifest', () => {
  test('publishes a schema-valid manifest with approved rules and source hashes', async ({ request }) => {
    const response = await request.get('lab/fixtures.json')
    const manifest = await response.json()

    expect(manifest.schemaVersion).toBe('act-lab-fixture/2')
    expect(manifest.cases.length).toBeGreaterThanOrEqual(11)

    const ids = new Set()

    for (const entry of manifest.cases) {
      expect(ids.has(entry.id), entry.id).toBe(false)
      ids.add(entry.id)

      expect(['approved', 'proposed', 'deprecated']).toContain(entry.act.ruleStatus)
      expect(entry.act.ruleStatus).toBe('approved')
      expect(entry.act.ruleUrl).toBe(
        `https://www.w3.org/WAI/standards-guidelines/act/rules/${entry.act.ruleId}/`
      )
      expect(entry.act.ruleRevision).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(['passed', 'failed', 'inapplicable', null]).toContain(entry.expected)
      expect(['unreviewed', 'reviewed', 'disputed']).toContain(entry.review)
      expect(entry.provenance.contentHash).toMatch(/^[a-f0-9]{64}$/)
    }

    for (const id of [
      'html-valid-role',
      'html-invalid-role',
      'html-button-named',
      'html-button-unnamed',
      'react-button-initial',
      'react-button-updated',
      'vue-button-initial',
      'vue-button-updated',
      'paca-valid-open',
      'paca-invalid-open',
      'paca-invalid-closed'
    ]) {
      expect(ids.has(id), id).toBe(true)
    }

    const closed = manifest.cases.find((entry) => entry.id === 'paca-invalid-closed')
    expect(closed.expected).toBeNull()
    expect(closed.execution).toBe('unsupported')
    expect(closed.target.scope).toBe('closed-shadow')

    expect(manifest.cases.some((entry) => entry.expected === 'unknown')).toBe(false)
  })

  test('the committed manifest matches the published one apart from hashes', () => {
    const source = JSON.parse(fs.readFileSync(path.join(ROOT, 'services/lab/fixtures.json'), 'utf8'))
    const published = JSON.parse(fs.readFileSync(path.join(ROOT, 'dist/lab/fixtures.json'), 'utf8'))

    const strip = (manifest) => ({
      ...manifest,
      cases: manifest.cases.map((entry) => ({
        ...entry,
        provenance: { sourceFile: entry.provenance.sourceFile }
      }))
    })

    expect(strip(published)).toEqual(source)
  })
})

test.describe('laboratory output', () => {
  test('all new pages and assets resolve under the base path', async ({ request }) => {
    const pages = [
      'lab/',
      'lab/aria/role-valid/',
      'lab/aria/role-invalid/',
      'lab/names/button-named/',
      'lab/names/button-unnamed/',
      'hedgehog/',
      'wombat/',
      'paca/',
      'lab/lab-styles.css',
      'lab/fixtures.json'
    ]

    for (const page of pages) {
      const response = await request.get(page)
      expect(response.status(), page).toBe(200)
    }
  })

  test('new pages do not hotlink scripts or images', async ({ request }) => {
    const pages = [
      'lab/',
      'lab/aria/role-valid/',
      'lab/names/button-unnamed/',
      'hedgehog/',
      'wombat/',
      'paca/'
    ]

    for (const page of pages) {
      const html = await (await request.get(page)).text()

      for (const match of html.matchAll(/(?:src|href)="(https?:)?\/\/[^"]+"/g)) {
        // Only the lab catalogue links to W3C and GitHub, and those are anchors.
        expect(match[0], `${page}: ${match[0]}`).not.toMatch(/src=/)
      }

      const rootRelative = [...html.matchAll(/(?:src|href)="(\/(?!\/)[^"]*)"/g)]
        .map((match) => match[1])
        .filter((url) => !url.startsWith(BASE_PATH))

      expect(rootRelative, `${page} has root-relative references`).toEqual([])
    }
  })

  test('service pages have no automated accessibility problems in their passing states', async ({ page }) => {
    for (const route of ['hedgehog/?state=updated', 'wombat/?state=updated', 'paca/?role=valid&shadow=open']) {
      await page.goto(route)
      const violations = await runAxe(page)
      expect(violationIds(violations), route).toEqual([])
    }
  })

  test('new pages do not overflow horizontally at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 })

    for (const route of ['lab/', 'hedgehog/?state=updated', 'wombat/?state=updated', 'paca/?role=valid&shadow=open']) {
      await page.goto(route)
      const width = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth
      }))
      expect(width.scroll, route).toBeLessThanOrEqual(width.client + 1)
    }
  })

  test('the lab interface keeps a logical focus order', async ({ page, browserName }) => {
    await page.goto('lab/')

    const stops = (await focusOrder(page, 8, browserName)).map((stop) => stop.text)

    expect(stops[0]).toBe('Record a goose sighting')
    expect(stops).toContain('Report a hedgehog')
    expect(stops).toContain('Report a wombat')
    expect(stops).toContain('Report a paca')
  })
})
