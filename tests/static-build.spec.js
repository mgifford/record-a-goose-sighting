import fs from 'node:fs'
import path from 'node:path'

import { test, expect } from '@playwright/test'

import { BASE_PATH, ROUTES } from './support/exercise.js'

const ROOT = path.resolve(import.meta.dirname, '..')
const DIST = path.join(ROOT, 'dist')

const ASSETS = [
  'public/stylesheets/unbranded.css',
  'public/javascripts/govuk-frontend.js',
  'public/javascripts/application.js',
  'public/javascripts/goose-session.js',
  'public/images/favicon.ico',
  'public/images/apple-touch-icon.png',
  'public/images/goose-celebration.gif',
  'public/fonts/bold-b542beb274-v2.woff2'
]

test.describe('static build', () => {
  test('every exercise page is served as HTML', async ({ request }) => {
    for (const route of ROUTES) {
      const response = await request.get(route.path)
      expect(response.status(), route.path).toBe(200)
      expect(response.headers()['content-type']).toContain('text/html')

      const html = await response.text()
      expect(html, route.path).toContain('<html lang="en"')
    }
  })

  test('all required assets are available', async ({ request }) => {
    for (const asset of ASSETS) {
      const response = await request.get(asset)
      expect(response.status(), asset).toBe(200)
    }

    const css = await (await request.get('public/stylesheets/unbranded.css')).text()
    expect(css).toContain(`${BASE_PATH}public/fonts/`)
    expect(css).not.toContain('url("/assets/')
  })

  test('pages contain no root-relative or legacy references', async ({ request }) => {
    for (const route of ROUTES) {
      const html = await (await request.get(route.path)).text()

      const rootRelative = [...html.matchAll(/(?:href|src|action)="(\/(?!\/)[^"]*)"/g)]
        .map((match) => match[1])
        .filter((url) => !url.startsWith(BASE_PATH))

      expect(rootRelative, `${route.path} has root-relative URLs`).toEqual([])

      const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((match) => match[1])
      for (const script of scripts) {
        expect(script.startsWith(BASE_PATH), `${route.path}: ${script}`).toBe(true)
      }

      expect(html, `${route.path} must not load analytics`).not.toContain('googletagmanager')
      expect(html, `${route.path} must not load jQuery`).not.toContain('jquery')
      expect(html, `${route.path} must not use the auto-store middleware`).not.toContain('auto-store-data')
    }
  })

  test('all images are served from this site', async ({ request }) => {
    for (const route of ROUTES) {
      const html = await (await request.get(route.path)).text()
      const sources = [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map((match) => match[1])

      for (const source of sources) {
        expect(source.startsWith(BASE_PATH), `${route.path} hotlinks ${source}`).toBe(true)

        const response = await request.get(source.slice(BASE_PATH.length))
        expect(response.status(), source).toBe(200)
      }
    }
  })

  test('every internal link resolves', async ({ request }) => {
    const internal = new Set()

    for (const route of ROUTES) {
      const html = await (await request.get(route.path)).text()

      for (const match of html.matchAll(/href="(\/[^"#]+)"/g)) {
        if (match[1].startsWith(BASE_PATH)) internal.add(match[1])
      }
    }

    expect(internal.size).toBeGreaterThan(ROUTES.length)

    for (const href of internal) {
      const response = await request.get(href.slice(BASE_PATH.length))
      expect(response.status(), href).toBe(200)
    }
  })

  test('unknown pages return 404', async ({ request }) => {
    const response = await request.get('steps/not-a-real-page/')
    expect(response.status()).toBe(404)
  })

  test('build output contains no server runtime', () => {
    const forbidden = [
      'server.js',
      'start.js',
      'listen-on-port.js',
      'package.json',
      'node_modules',
      'Dockerfile',
      'Procfile'
    ]

    for (const entry of forbidden) {
      expect(fs.existsSync(path.join(DIST, entry)), entry).toBe(false)
    }

    expect(fs.existsSync(path.join(DIST, '.nojekyll'))).toBe(true)
    expect(fs.readFileSync(path.join(DIST, 'robots.txt'), 'utf8')).toContain('Disallow: /')
    expect(fs.existsSync(path.join(DIST, 'LICENCE.txt'))).toBe(true)

    const files = fs.readdirSync(DIST, { recursive: true })
      .filter((file) => fs.statSync(path.join(DIST, file)).isFile())

    for (const file of files) {
      expect(file).not.toMatch(/\.(mjs|md|tpl)$/)
      expect(file).not.toMatch(/package-lock\.json$/)
    }
  })

  test('runtime dependencies are limited to build-time packages', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))

    expect(Object.keys(pkg.dependencies).sort()).toEqual(['govuk-frontend', 'nunjucks'])
    expect(pkg.devDependencies).not.toHaveProperty('express')
    expect(pkg.devDependencies).not.toHaveProperty('gulp')
  })
})
