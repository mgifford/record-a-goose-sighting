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
  'lab/correlation/two-images/index.html',
  'lab/correlation/single-image/index.html',
  'lab/correlation/multiple-rules-one-target/index.html',
  'lab/correlation/repeated-controls/index.html',
  'lab/frames/single-frame/index.html',
  'lab/frames/single-frame/frame.html',
  'lab/frames/nested-frame/index.html',
  'lab/frames/nested-frame/outer.html',
  'lab/frames/nested-frame/inner.html',
  'lab/frames/two-frames/index.html',
  'lab/frames/two-frames/first.html',
  'lab/frames/two-frames/second.html',
  'lab/interaction/reveal-target/index.html',
  'lab/applicability/no-buttons/index.html',
  'lab/applicability/no-images/index.html',
  'lab/names/link-named/index.html',
  'lab/names/link-unnamed/index.html',
  'lab/names/field-named/index.html',
  'lab/names/field-unnamed/index.html',
  'lab/preferences/reduced-motion/index.html',
  'lab/preferences/forced-colors/index.html',
  'lab/preferences/text-spacing/index.html',
  'lab/subtle/names/index.html',
  'lab/subtle/focus-removal/index.html',
  'lab/subtle/status/index.html',
  'lab/subtle/errors/index.html',
  'lab/subtle/aria-state/index.html',
  'lab/subtle/keyboard-toggle/index.html',
  'lab/subtle/reading/index.html',
  'lab/subtle/tables/index.html',
  'lab/subtle/combobox/index.html',
  'lab/subtle/tabs/index.html',
  'kestrel/index.html',
  'kestrel/details.html',
  'kestrel/confirmation.html',
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
