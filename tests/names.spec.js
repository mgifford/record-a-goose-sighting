import path from 'node:path'

import { test, expect } from '@playwright/test'

const AXE_PATH = path.resolve(import.meta.dirname, '../node_modules/axe-core/axe.min.js')

async function manifest (request) {
  const response = await request.get('lab/fixtures.json')
  expect(response.status()).toBe(200)
  return response.json()
}

async function axe (page) {
  await page.addScriptTag({ path: AXE_PATH })
  return page.evaluate(async () => {
    const result = await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }
    })
    return result.violations.map((violation) => ({ id: violation.id, nodes: violation.nodes.length }))
  })
}

test.describe('link accessible name', () => {
  test('the unnamed link has no accessible name and one link-name finding', async ({ page }) => {
    await page.goto('lab/names/link-unnamed/')

    const target = page.locator('#target')
    await expect(target).toHaveCount(1)
    expect(await target.ariaSnapshot()).toContain('- link')
    expect(await axe(page)).toEqual([{ id: 'link-name', nodes: 1 }])
  })

  test('the named link passes and has no unrelated findings', async ({ page }) => {
    await page.goto('lab/names/link-named/')

    await expect(page.locator('#target')).toHaveAccessibleName('Read the goose exercise guidance')
    expect(await axe(page)).toEqual([])
  })

  test('the manifest records the link rule and both outcomes', async ({ request }) => {
    const data = await manifest(request)
    const failed = data.cases.find((item) => item.id === 'link-unnamed')
    const passed = data.cases.find((item) => item.id === 'link-named')

    expect(failed.act.ruleId).toBe('c487ae')
    expect(failed.expected).toBe('failed')
    expect(passed.expected).toBe('passed')
    expect(failed.act.ruleRevision).toBe('2023-08-31')
  })
})

test.describe('form field accessible name', () => {
  test('the unnamed field has no label and one label finding', async ({ page }) => {
    await page.goto('lab/names/field-unnamed/')

    const target = page.locator('#target')
    await expect(target).toHaveCount(1)
    await expect(page.locator('label')).toHaveCount(0)
    expect(await axe(page)).toEqual([{ id: 'label', nodes: 1 }])
  })

  test('the named field has a label and no unrelated findings', async ({ page }) => {
    await page.goto('lab/names/field-named/')

    await expect(page.locator('#target')).toHaveAccessibleName('Where did you see the goose?')
    expect(await axe(page)).toEqual([])
  })

  test('the manifest records the form-field rule and both outcomes', async ({ request }) => {
    const data = await manifest(request)
    const failed = data.cases.find((item) => item.id === 'field-unnamed')
    const passed = data.cases.find((item) => item.id === 'field-named')

    expect(failed.act.ruleId).toBe('e086e5')
    expect(failed.expected).toBe('failed')
    expect(passed.expected).toBe('passed')
    expect(failed.act.ruleRevision).toBe('2023-08-31')
  })
})
