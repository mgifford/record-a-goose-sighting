/**
 * Minimal static file server for local preview and Playwright.
 *
 * Serves `dist/` under the same base path that the build used, so that the
 * preview behaves like GitHub Pages at a repository subpath.
 *
 * Usage:
 *   node scripts/serve.mjs
 *   PORT=4173 SITE_BASE=/record-a-goose-sighting/ node scripts/serve.mjs
 */
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')
const PORT = Number(process.env.PORT || 4173)
const HOST = process.env.HOST || '127.0.0.1'

function normalizeBase (value) {
  const inner = String(value || '/').trim().replace(/^\/+|\/+$/g, '')
  return inner === '' ? '/' : `/${inner}/`
}

const base = normalizeBase(process.env.SITE_BASE || '/record-a-goose-sighting/')

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
}

function resolveFile (pathname) {
  let route = pathname

  if (base !== '/') {
    if (route === base.slice(0, -1)) route = base
    if (!route.startsWith(base)) return null
    route = route.slice(base.length)
  } else {
    route = route.replace(/^\//, '')
  }

  const decoded = decodeURIComponent(route)
  const target = path.resolve(DIST, decoded)

  if (target !== DIST && !target.startsWith(DIST + path.sep)) return null

  return target
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`)
  let target = resolveFile(url.pathname)

  if (target === null) {
    if (url.pathname === '/' && base !== '/') {
      response.writeHead(302, { Location: base })
      response.end()
      return
    }

    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    response.end('Not found')
    return
  }

  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    target = path.join(target, 'index.html')
  }

  if (!fs.existsSync(target)) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    response.end('Not found')
    return
  }

  const extension = path.extname(target).toLowerCase()
  response.writeHead(200, {
    'Content-Type': contentTypes[extension] || 'application/octet-stream',
    'Cache-Control': 'no-store'
  })
  fs.createReadStream(target).pipe(response)
})

server.listen(PORT, HOST, () => {
  console.log(`Preview: http://${HOST}:${PORT}${base}`)
})
