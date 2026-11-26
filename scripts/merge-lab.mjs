/**
 * Merges the separately built animal laboratory into the Goose exercise.
 *
 * The Goose output is the source of truth: this script refuses to run without
 * it, refuses to copy a lab root index over it, and verifies that every file
 * that existed before the merge is byte-identical afterwards.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')
const LAB = path.join(ROOT, 'dist-lab')

const MERGED_DIRECTORIES = ['lab', 'hedgehog', 'wombat', 'paca', 'lab-assets', 'defects']

const REQUIRED_OUTPUT = [
  'index.html',
  'steps/start/index.html',
  'steps/answers/index.html',
  'lab/index.html',
  'lab/fixtures.json',
  'lab/aria/role-valid/index.html',
  'lab/aria/role-invalid/index.html',
  'lab/names/button-named/index.html',
  'lab/names/button-unnamed/index.html',
  'hedgehog/index.html',
  'wombat/index.html',
  'paca/index.html',
  'defects/index.html',
  'defects/manifest.json'
]

function walk (directory, base = directory) {
  const files = []

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...walk(full, base))
    } else if (entry.isFile()) {
      files.push(path.relative(base, full))
    }
  }

  return files
}

function hashFile (file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
}

function snapshot (directory) {
  const snapshot = new Map()
  for (const relative of walk(directory)) {
    snapshot.set(relative, hashFile(path.join(directory, relative)))
  }
  return snapshot
}

function main () {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    throw new Error('Goose output is missing. Run the Goose build before merging the laboratory.')
  }

  if (!fs.existsSync(path.join(LAB, 'lab/index.html'))) {
    throw new Error('Laboratory output is missing. Run the laboratory build before merging.')
  }

  if (fs.existsSync(path.join(LAB, 'index.html'))) {
    throw new Error('Refusing to merge: the laboratory build contains a root index.html')
  }

  const before = snapshot(DIST)

  for (const name of MERGED_DIRECTORIES) {
    const source = path.join(LAB, name)
    if (!fs.existsSync(source)) {
      throw new Error(`Laboratory build is missing the "${name}" directory`)
    }

    const target = path.join(DIST, name)
    fs.rmSync(target, { recursive: true, force: true })
    fs.cpSync(source, target, { recursive: true })
  }

  for (const relative of REQUIRED_OUTPUT) {
    if (!fs.existsSync(path.join(DIST, relative))) {
      throw new Error(`Merged output is missing ${relative}`)
    }
  }

  const after = snapshot(DIST)

  for (const [relative, hash] of before) {
    if (!after.has(relative)) throw new Error(`Merge removed an existing file: ${relative}`)
    if (after.get(relative) !== hash) throw new Error(`Merge changed an existing file: ${relative}`)
  }

  const added = [...after.keys()].filter((relative) => !before.has(relative))

  console.log(`Merged laboratory into dist/: ${added.length} new files, ${before.size} existing files unchanged`)
}

try {
  main()
} catch (error) {
  console.error(`\nMerge failed: ${error.message}\n`)
  process.exitCode = 1
}
