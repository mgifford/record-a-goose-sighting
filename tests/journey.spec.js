import { test, expect } from '@playwright/test'

import { ROUTES, completeJourney, startJourney, submitForm } from './support/exercise.js'

test.describe('exercise journey', () => {
  test('completes the six page journey and reaches the confirmation page', async ({ page }) => {
    await completeJourney(page)

    await expect(page.locator('[data-answer="geese-liked"]')).toHaveText('yes')
    await expect(page.locator('[data-answer="goose-type"]')).toHaveText('Canada goose')
    await expect(page.locator('[data-answer-date]')).toHaveText('18 / 11 / 2026')

    expect(new URL(page.url()).search).toBe('')

    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForURL(/steps\/end\//)

    await expect(page.getByRole('heading', { name: 'GOOSE RECORDED' })).toBeVisible()
    await expect(page.locator('img[src*="giphy.com"]')).toBeVisible()
  })

  test('retains answers when the summary page is refreshed', async ({ page }) => {
    await completeJourney(page)

    await page.reload()

    await expect(page.locator('[data-answer="goose-type"]')).toHaveText('Canada goose')
    await expect(page.locator('[data-answer-date]')).toHaveText('18 / 11 / 2026')
  })

  test('restores answers when navigating backwards and forwards', async ({ page }) => {
    await completeJourney(page)

    await page.goBack()
    await expect(page.locator('input[name="date-saw-goose-day"]')).toHaveValue('18')

    await page.goForward()
    await expect(page.locator('[data-answer="geese-liked"]')).toHaveText('yes')
  })

  test('allows an earlier answer to be changed', async ({ page }) => {
    await completeJourney(page)

    await page.getByRole('link', { name: /Change/ }).first().click()
    await page.waitForURL(/steps\/geese-liked\//)

    await page.check('input[name="geese-liked"][value="no"]')
    await submitForm(page, /steps\/goose-type\//)

    await expect(page.locator('input[name="goose-type"]')).toHaveValue('Canada goose')
    await submitForm(page, /steps\/date-saw-goose\//)

    await expect(page.locator('input[name="date-saw-goose-day"]')).toHaveValue('18')
    await submitForm(page, /steps\/check-your-answers\//)

    await expect(page.locator('[data-answer="geese-liked"]')).toHaveText('no')
  })

  for (const liked of ['yes', 'no']) {
    test(`records the "${liked}" radio choice`, async ({ page }) => {
      await completeJourney(page, { liked })
      await expect(page.locator('[data-answer="geese-liked"]')).toHaveText(liked)
    })
  }

  test('treats stored answers as text, never as HTML', async ({ page }) => {
    const payload = '<img src=x onerror="window.__gooseXss = true">'

    await completeJourney(page, { type: payload })

    await expect(page.locator('[data-answer="goose-type"]')).toHaveText(payload)
    await expect(page.locator('[data-answer="goose-type"] img')).toHaveCount(0)
    expect(await page.evaluate(() => window.__gooseXss)).toBeUndefined()
  })

  test('does not POST or leak answers into URLs', async ({ page }) => {
    const requests = []
    page.on('request', (request) => requests.push(request))

    await completeJourney(page)

    expect(requests.filter((request) => request.method() !== 'GET')).toEqual([])

    const externalHosts = requests
      .map((request) => new URL(request.url()).hostname)
      .filter((host) => host !== '127.0.0.1' && host !== 'localhost')

    expect(externalHosts).not.toContain('www.google-analytics.com')
    expect(externalHosts).not.toContain('www.googletagmanager.com')

    for (const url of [page.url()]) {
      expect(new URL(url).search).toBe('')
    }
  })

  test('refuses to navigate outside the exercise base path', async ({ page }) => {
    await page.goto('steps/geese-liked/')

    const warnings = []
    page.on('console', (message) => {
      if (message.type() === 'warning') warnings.push(message.text())
    })

    for (const action of ['https://example.com/', '/outside-the-exercise/']) {
      await page.locator('form.form').evaluate((form, value) => {
        form.setAttribute('action', value)
      }, action)

      await page.getByRole('button', { name: 'Continue' }).click()
      await page.waitForTimeout(200)

      await expect(page).toHaveURL(/steps\/geese-liked\//)
    }

    expect(warnings.join(' ')).toContain('Blocked navigation')
  })

  test('keeps the journey usable when browser storage is unavailable', async ({ page, context }) => {
    await context.addInitScript(() => {
      const disabled = () => { throw new Error('storage disabled') }
      Storage.prototype.getItem = disabled
      Storage.prototype.setItem = disabled
    })

    await completeJourney(page)

    // Navigation still works; answers cannot be retained.
    await expect(page.locator('[data-answer="geese-liked"]')).toHaveText('')
    await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible()
  })

  test('ignores malformed stored data', async ({ page, context }) => {
    await context.addInitScript(() => {
      window.sessionStorage.setItem('goose-sighting-exercise:v1', '{not valid json')
    })

    await page.goto('steps/check-your-answers/')

    await expect(page.locator('[data-answer="geese-liked"]')).toHaveText('')
    await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible()
  })

  test('submits an empty form without adding validation that did not exist', async ({ page }) => {
    await startJourney(page)

    await submitForm(page, /steps\/goose-type\//)
    await page.fill('input[name="goose-type"]', 'Greylag goose')
    await submitForm(page, /steps\/date-saw-goose\//)
    await submitForm(page, /steps\/check-your-answers\//)

    await expect(page.locator('[data-answer="geese-liked"]')).toHaveText('')
    await expect(page.locator('[data-answer-date]')).toHaveText(' /  / ')
  })

  test('remains readable without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()

    await page.goto('steps/geese-liked/')
    await expect(page.getByRole('heading', { name: 'Do you like geese?' })).toBeVisible()

    await page.check('input[name="geese-liked"][value="yes"]')
    await page.getByRole('button', { name: 'Continue' }).click()

    await page.waitForURL(/steps\/goose-type\//)
    expect(new URL(page.url()).search).toContain('geese-liked=yes')
    await expect(page.getByRole('heading', { name: 'What type of goose did you see?' })).toBeVisible()

    await context.close()
  })

  test.describe('layout', () => {
    for (const viewport of [
      { name: 'mobile 375px', width: 375, height: 667 },
      { name: 'reflow 320px', width: 320, height: 640 },
      { name: '200% zoom equivalent', width: 640, height: 360 }
    ]) {
      test(`does not overflow horizontally at ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })

        for (const route of ROUTES) {
          await page.goto(route.path)

          const overflow = await page.evaluate(() => {
            const clientWidth = document.documentElement.clientWidth
            const offenders = [...document.querySelectorAll('*')]
              .filter((element) => element.getBoundingClientRect().right > clientWidth + 1)
              .map((element) => ({
                tag: element.tagName,
                src: element.getAttribute('src')
              }))

            return {
              scrollWidth: document.documentElement.scrollWidth,
              clientWidth,
              offenders
            }
          })

          if (overflow.scrollWidth > overflow.clientWidth + 1) {
            // The confirmation page hotlinks an animated GIF that is wider than
            // a 320px viewport. That was true of the original Express app too,
            // and changing it would be a remediation outside this migration.
            expect(route.path, 'unexpected horizontal overflow').toBe('steps/end/')
            expect(
              overflow.offenders.every(
                (element) => element.tag === 'IMG' && element.src.includes('media.giphy.com')
              ),
              `${route.path} overflows because of ${JSON.stringify(overflow.offenders)}`
            ).toBe(true)
          }
        }
      })
    }
  })
})
