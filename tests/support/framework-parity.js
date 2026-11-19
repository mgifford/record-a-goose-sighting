import { expect } from '@playwright/test'

export const FRAMEWORKS = [
  {
    key: 'react',
    path: 'hedgehog',
    label: 'React',
    root: 'hedgehog/?state=updated',
    heading: '#page-heading',
    resetUrl: /hedgehog\/\?state=updated$/,
    resetHeading: 'Report a hedgehog sighting',
    startHeading: 'Report a hedgehog sighting'
  },
  {
    key: 'vue',
    path: 'wombat',
    label: 'Vue',
    root: 'wombat/?state=updated',
    heading: '#page-heading',
    resetUrl: /wombat\/\?state=updated$/,
    resetHeading: 'Report a wombat sighting',
    startHeading: 'Report a wombat sighting'
  },
  {
    key: 'paca',
    path: 'paca',
    label: 'Web Components',
    root: 'paca/?role=valid&shadow=open',
    heading: 'main h1',
    resetUrl: /paca\/\?role=valid&shadow=open$/,
    resetHeading: 'Report a paca sighting',
    startHeading: 'Report a paca sighting'
  }
]

export const STEP_HEADINGS = {
  liked: /Do you like (hedgehogs|wombats|pacas)\?/,
  check: 'Check your answers before sending your sighting',
  done: 'Sighting recorded'
}

export async function startJourney (page, framework) {
  await page.goto(framework.root)
  await expect(page.locator(framework.heading)).toHaveText(framework.startHeading)
  await page.getByRole('button', { name: 'Start now' }).click()
  await expect(page).toHaveURL(/step=liked/)
  await expect(page.locator(framework.heading)).toBeFocused()
  await expect(page.locator(framework.heading)).toHaveText(STEP_HEADINGS.liked)
}

export async function fillToCheck (page, framework) {
  await page.locator('#liked-yes').check()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.fill('#type', `${framework.label} example`)
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.fill('#date-day', '18')
  await page.fill('#date-month', '11')
  await page.fill('#date-year', '2026')
  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page).toHaveURL(/step=check/)
  await expect(page.locator(framework.heading)).toHaveText(STEP_HEADINGS.check)
}
