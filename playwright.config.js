import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.PORT || 4173)
const BASE_PATH = '/record-a-goose-sighting/'
const baseURL = `http://127.0.0.1:${PORT}${BASE_PATH}`

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: process.env.BROWSERS === 'all'
    ? [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
        { name: 'webkit', use: { ...devices['Desktop Safari'] } }
      ]
    : [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
      ],
  webServer: {
    command: `PORT=${PORT} SITE_BASE=${BASE_PATH} node scripts/serve.mjs`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 30000
  }
})
