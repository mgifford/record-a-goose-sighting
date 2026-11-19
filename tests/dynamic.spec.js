import { test, expect } from '@playwright/test'

async function manifest (request) {
  const response = await request.get('lab/fixtures.json')
  expect(response.status()).toBe(200)
  return response.json()
}

test.describe('dynamic states', () => {
  test('React supplies the name after mount', async ({ page }) => {
    await page.goto('hedgehog/?state=async')

    await expect(page.locator('#app')).toHaveAttribute('data-lab-state', 'async-ready')
    await expect(page.locator('#test-target')).toHaveAccessibleName('Review hedgehog sighting')
  })

  test('React replaces the target node', async ({ page }) => {
    await page.goto('hedgehog/?state=replaced')

    await expect(page.locator('#app')).toHaveAttribute('data-lab-state', 'replaced-pending')
    await expect(page.locator('#test-target')).toHaveAttribute('data-node-version', '0')
    expect(await page.locator('#test-target').ariaSnapshot()).toBe('- button')

    await page.evaluate(() => { window.__beforeTarget = document.querySelector('#test-target') })
    await page.getByRole('button', { name: 'Replace the example target' }).click()

    await expect(page.locator('#app')).toHaveAttribute('data-lab-state', 'replaced')
    await expect(page.locator('#test-target')).toHaveAttribute('data-node-version', '1')
    await expect(page.locator('#test-target')).toHaveAccessibleName('Review hedgehog sighting')
    expect(await page.evaluate(() => window.__beforeTarget !== document.querySelector('#test-target'))).toBe(true)
  })

  test('Vue supplies the name after mount', async ({ page }) => {
    await page.goto('wombat/?state=async')

    await expect(page.locator('#app')).toHaveAttribute('data-lab-state', 'async-ready')
    await expect(page.locator('#test-target')).toHaveAccessibleName('Review wombat sighting')
  })

  test('Paca exposes a nested open shadow target', async ({ page }) => {
    await page.goto('paca/?role=valid&shadow=nested')

    await expect(page.locator('paca-sighting')).toHaveAttribute('data-test-ready', 'true')
    await expect(page.locator('paca-sighting')).toHaveAttribute('data-lab-state', 'button-nested-open')

    const target = page.locator('paca-sighting').locator('#nested-host').locator('#test-target')
    await expect(target).toHaveCount(1)
    await expect(target).toHaveAttribute('role', 'button')
    await expect(target).toHaveAccessibleName('Review paca sighting')
  })

  test('records dynamic expectations and interactions', async ({ request }) => {
    const data = await manifest(request)
    const asyncCases = data.cases.filter((entry) => entry.stateId === 'async')
    const replaced = data.cases.find((entry) => entry.id === 'react-button-replaced')
    const nested = data.cases.find((entry) => entry.id === 'paca-valid-nested')

    expect(asyncCases.map((entry) => entry.expected)).toEqual(['passed', 'passed'])
    expect(asyncCases.every((entry) => entry.review === 'unreviewed')).toBe(true)
    expect(replaced.nodePreserved).toBe(false)
    expect(replaced.interaction).toEqual({ action: 'click', selector: '#replace-target' })
    expect(nested.target.scope).toBe('open-shadow')
    expect(nested.target.hostPath).toEqual(['paca-sighting', '#nested-host'])
  })
})

test.describe('interaction-triggered fixture', () => {
  test('the target is absent until the disclosure opens', async ({ page }) => {
    await page.goto('lab/interaction/reveal-target/')

    const target = page.locator('#target')
    await expect(target).toBeHidden()

    await page.getByRole('button', { name: 'Show the example target' }).click()
    await expect(page.locator('#reveal')).toHaveAttribute('aria-expanded', 'true')
    await expect(page.locator('#panel')).toHaveAttribute('data-reveal-state', 'revealed')
    await expect(target).toBeVisible()
    expect(await target.ariaSnapshot()).toBe('- button')

    await page.getByRole('button', { name: 'Hide the example target' }).click()
    await expect(target).toBeHidden()
  })

  test('records the reveal interaction', async ({ request }) => {
    const data = await manifest(request)
    const entry = data.cases.find((item) => item.id === 'interaction-reveal-target')

    expect(entry.expected).toBe('failed')
    expect(entry.interaction).toEqual({ action: 'click', selector: '#reveal' })
    expect(entry.readySelector).toBe('[data-reveal-state="revealed"]')
  })
})
