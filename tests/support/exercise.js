/**
 * Shared helpers for the Playwright tests.
 *
 * The exercise intentionally excludes one submit button from sequential
 * keyboard focus, so form submission in tests uses requestSubmit() rather than
 * a real Tab + Enter sequence. That limitation is asserted separately in the
 * accessibility regression suite.
 */

export const BASE_PATH = '/record-a-goose-sighting/'

export const ROUTES = [
  { path: '', name: 'instructions' },
  { path: 'steps/start/', name: 'start' },
  { path: 'steps/geese-liked/', name: 'geese-liked' },
  { path: 'steps/goose-type/', name: 'goose-type' },
  { path: 'steps/date-saw-goose/', name: 'date' },
  { path: 'steps/check-your-answers/', name: 'check-your-answers' },
  { path: 'steps/end/', name: 'end' },
  { path: 'steps/worksheet/', name: 'worksheet' },
  { path: 'steps/answers/', name: 'answers' },
  { path: 'steps/keyboard-practice/', name: 'keyboard-practice' },
  { path: 'blind-spots/', name: 'blind-spots' }
]

export const DEFAULT_ANSWERS = {
  liked: 'yes',
  type: 'Canada goose',
  day: '18',
  month: '11',
  year: '2026'
}

export async function submitForm (page, expectedUrl) {
  const navigation = page.waitForURL(expectedUrl)
  await page.locator('form.form').evaluate((form) => form.requestSubmit())
  await navigation
}

export async function startJourney (page) {
  await page.goto('')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Start now' }).click()
  await page.waitForURL(/steps\/geese-liked\//)
}

/**
 * Walks the six page journey, returning once the answers page is displayed.
 */
export async function completeJourney (page, answers = {}) {
  const values = { ...DEFAULT_ANSWERS, ...answers }

  await startJourney(page)

  await page.check(`input[name="geese-liked"][value="${values.liked}"]`)
  await submitForm(page, /steps\/goose-type\//)

  await page.fill('input[name="goose-type"]', values.type)
  await submitForm(page, /steps\/date-saw-goose\//)

  await page.fill('input[name="date-saw-goose-day"]', values.day)
  await page.fill('input[name="date-saw-goose-month"]', values.month)
  await page.fill('input[name="date-saw-goose-year"]', values.year)
  await submitForm(page, /steps\/check-your-answers\//)
}

/**
 * Records the sequential keyboard focus order for the current page.
 */
export async function focusOrder (page, limit = 25, browserName = 'chromium') {
  const order = []

  // WebKit (like Safari on macOS) only tabs to links with the "Press Tab to
  // highlight each item on a webpage" preference enabled. Playwright's WebKit
  // mirrors that default, so use Option+Tab there.
  const key = browserName === 'webkit' ? 'Alt+Tab' : 'Tab'

  for (let index = 0; index < limit; index += 1) {
    await page.keyboard.press(key)

    const stop = await page.evaluate(() => {
      const element = document.activeElement

      if (!element || element === document.body) {
        return null
      }

      return {
        tag: element.tagName.toLowerCase(),
        text: (element.textContent || '').replace(/\s+/g, ' ').trim(),
        name: element.getAttribute('name'),
        type: element.getAttribute('type'),
        id: element.id || null
      }
    })

    if (!stop) break
    order.push(stop)
  }

  return order
}

/**
 * WCAG relative-luminance contrast ratio for two rgb() colours.
 */
export function contrastRatio (page, foreground, background) {
  return page.evaluate(({ foreground, background }) => {
    const parse = (value) => value.match(/\d+/g).slice(0, 3).map(Number)
    const luminance = ([r, g, b]) => {
      const channel = (value) => {
        const normalised = value / 255
        return normalised <= 0.03928
          ? normalised / 12.92
          : ((normalised + 0.055) / 1.055) ** 2.4
      }
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
    }

    const first = luminance(parse(foreground))
    const second = luminance(parse(background))
    const lighter = Math.max(first, second)
    const darker = Math.min(first, second)

    return (lighter + 0.05) / (darker + 0.05)
  }, { foreground, background })
}
