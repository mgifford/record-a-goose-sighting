import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import vue from '@vitejs/plugin-vue'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
const base = process.env.SITE_BASE || '/record-a-goose-sighting/'

// The laboratory is built separately from the Goose exercise and merged into
// `dist/` afterwards. `dist-lab/` is never published on its own.
const entries = [
  'lab/index.html',
  'lab/aria/role-valid/index.html',
  'lab/aria/role-invalid/index.html',
  'lab/names/button-named/index.html',
  'lab/names/button-unnamed/index.html',
  'lab/interpretation/index.html',
  'hedgehog/index.html',
  'wombat/index.html',
  'paca/index.html'
]

export default defineConfig({
  root: resolve('services'),
  base,
  publicDir: resolve('services/public'),
  plugins: [react(), vue()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  build: {
    outDir: resolve('dist-lab'),
    emptyOutDir: true,
    assetsDir: 'lab-assets',
    rollupOptions: {
      input: Object.fromEntries(entries.map((file) => [
        file.replace(/\/index\.html$/, '').replace(/\.html$/, '').replace(/\//g, '-'),
        resolve('services', file)
      ]))
    }
  }
})
