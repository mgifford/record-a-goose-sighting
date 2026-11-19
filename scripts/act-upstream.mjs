#!/usr/bin/env node
/**
 * Imports the official W3C ACT test-case metadata.
 *
 * The download is an explicit, reviewed action (`npm run act:import`), never
 * part of a normal build. The committed snapshot is used for reproducible
 * comparisons; the build only validates and publishes it.
 *
 * Usage:
 *   node scripts/act-upstream.mjs --import   fetch and replace the snapshot
 *   node scripts/act-upstream.mjs --check    validate the committed snapshot
 *   node scripts/act-upstream.mjs            validate and publish for the build
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIRECTORY = path.join(ROOT, 'services/lab/upstream')
const SNAPSHOT = path.join(DIRECTORY, 'testcases.json')
const METADATA = path.join(DIRECTORY, 'metadata.json')
const PUBLISHED = path.join(ROOT, 'dist-lab/lab/upstream')

const SOURCE_URL = 'https://www.w3.org/WAI/content-assets/wcag-act-rules/testcases.json'
const LICENSE = {
  name: 'W3C Document License',
  url: 'https://www.w3.org/copyright/document-license-2023/',
  copyright: 'Copyright © 2026 World Wide Web Consortium (W3C)'
}

const REQUIRED_FIELDS = ['ruleId', 'ruleName', 'testcaseId', 'expected', 'url', 'rulePage']
const ALLOWED_OUTCOMES = new Set(['passed', 'failed', 'inapplicable'])

function sha256 (buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

function isRulePage (entry) {
  // The dataset can point at either the current or the proposed rule page even
  // when the rule is approved, so only the rule identity is enforced here.
  return typeof entry.rulePage === 'string' &&
    entry.rulePage.startsWith(`https://www.w3.org/WAI/standards-guidelines/act/rules/${entry.ruleId}/`)
}

function validateCases (cases) {
  const errors = []
  const ids = new Set()

  if (!Array.isArray(cases) || cases.length === 0) {
    return ['test cases must be a non-empty array']
  }

  for (const [index, entry] of cases.entries()) {
    const where = `cases[${index}]`

    for (const field of REQUIRED_FIELDS) {
      if (!Object.hasOwn(entry, field)) errors.push(`${where}: missing ${field}`)
    }

    if (!/^[a-z0-9]{6}$/.test(entry.ruleId || '')) errors.push(`${where}: invalid ruleId`)
    if (typeof entry.ruleName !== 'string' || entry.ruleName.length === 0) errors.push(`${where}: missing ruleName`)
    if (typeof entry.testcaseId !== 'string' || entry.testcaseId.length === 0) errors.push(`${where}: invalid testcaseId`)
    // The same test-case hash can legitimately be used by several rules.
    const key = `${entry.ruleId}:${entry.testcaseId}`
    if (ids.has(key)) errors.push(`${where}: duplicate test case ${key}`)
    ids.add(key)

    if (!ALLOWED_OUTCOMES.has(entry.expected)) {
      errors.push(`${where}: invalid expected outcome ${entry.expected}`)
    }

    if (entry.approved !== true && entry.approved !== false && entry.approved !== null && entry.approved !== undefined) {
      errors.push(`${where}: approved must be a boolean when present`)
    }

    if (typeof entry.url !== 'string' || !entry.url.startsWith('https://www.w3.org/')) {
      errors.push(`${where}: invalid test case URL`)
    }

    if (!isRulePage(entry)) errors.push(`${where}: rulePage does not match ruleId`)
  }

  return errors
}

function countsFor (cases) {
  const byExpected = { passed: 0, failed: 0, inapplicable: 0 }
  const rules = new Set()
  let approved = 0
  let notApproved = 0
  let approvalMissing = 0

  for (const entry of cases) {
    byExpected[entry.expected] += 1
    rules.add(entry.ruleId)
    if (entry.approved === true) approved += 1
    else if (entry.approved === false) notApproved += 1
    else approvalMissing += 1
  }

  return { testcases: cases.length, approved, notApproved, approvalMissing, rules: rules.size, byExpected }
}

function readJson (file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

async function importSnapshot () {
  const response = await fetch(SOURCE_URL, {
    headers: {
      'user-agent': 'record-a-goose-sighting ACT fixture importer (https://github.com/mgifford/record-a-goose-sighting)'
    }
  })

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`)
  }

  const bytes = Buffer.from(await response.arrayBuffer())
  const parsed = JSON.parse(bytes.toString('utf8'))
  const sourceCases = Array.isArray(parsed) ? parsed : parsed.testcases

  const errors = validateCases(sourceCases)
  if (errors.length > 0) {
    throw new Error(`Upstream data changed shape:\n${errors.slice(0, 20).join('\n')}`)
  }

  // Keep only the metadata needed for reproducibility, provenance and rule
  // mapping. The test-case HTML itself is not mirrored.
  const cases = sourceCases.map((entry) => ({
    ruleId: entry.ruleId,
    ruleName: entry.ruleName,
    testcaseId: entry.testcaseId,
    expected: entry.expected,
    // Upstream omits the flag for some cases; record that explicitly.
    approved: entry.approved === true ? true : (entry.approved === false ? false : null),
    rulePage: entry.rulePage,
    url: entry.url,
    rulePage: entry.rulePage,
    relativePath: entry.relativePath ?? null
  }))

  const snapshot = {
    schemaVersion: 'act-upstream-testcases/1',
    sourceUrl: SOURCE_URL,
    cases
  }

  const snapshotBuffer = Buffer.from(JSON.stringify(snapshot, null, 2) + '\n')

  fs.mkdirSync(DIRECTORY, { recursive: true })
  fs.writeFileSync(SNAPSHOT, snapshotBuffer)

  const metadata = {
    schemaVersion: 'act-upstream-metadata/1',
    source: {
      url: SOURCE_URL,
      retrievedAt: new Date().toISOString(),
      http: {
        etag: response.headers.get('etag'),
        lastModified: response.headers.get('last-modified'),
        contentType: response.headers.get('content-type')
      }
    },
    checksum: {
      downloadedBytes: bytes.length,
      downloadedSha256: sha256(bytes),
      snapshotSha256: sha256(snapshotBuffer)
    },
    license: LICENSE,
    counts: countsFor(cases),
    fields: [
      'ruleId',
      'ruleName',
      'testcaseId',
      'expected',
      'approved',
      'url',
      'rulePage',
      'relativePath'
    ],
    notes: [
      'Test-case metadata is reproduced from the W3C ACT Rules test-case dataset for reproducible comparisons.',
      'The upstream approved flag and rulePage can disagree: some approved cases still point at a proposed rule page. Rule status is not derived from rulePage here.',
      'The test-case HTML is not mirrored; only identifiers, expected outcomes, approval flags and source URLs are retained.',
      'This snapshot is not an official W3C publication and must not be presented as one.',
      'W3C test cases are published under the W3C Document License; the copyright notice and source URL are retained.'
    ]
  }

  fs.writeFileSync(METADATA, Buffer.from(JSON.stringify(metadata, null, 2) + '\n'))

  console.log(`Imported ${cases.length} W3C ACT test cases (${metadata.counts.rules} rules)`)
  console.log(`Snapshot SHA-256: ${metadata.checksum.snapshotSha256}`)
}

function checkSnapshot () {
  if (!fs.existsSync(SNAPSHOT) || !fs.existsSync(METADATA)) {
    throw new Error('ACT upstream snapshot is missing. Run `npm run act:import` deliberately, then commit the result.')
  }

  const snapshotBuffer = fs.readFileSync(SNAPSHOT)
  const snapshot = JSON.parse(snapshotBuffer.toString('utf8'))
  const metadata = readJson(METADATA)
  const cases = snapshot.cases || []

  const problems = validateCases(cases)

  if (snapshot.schemaVersion !== 'act-upstream-testcases/1') problems.push('unexpected snapshot schemaVersion')
  if (snapshot.sourceUrl !== SOURCE_URL) problems.push('snapshot sourceUrl is not the official URL')
  if (metadata.schemaVersion !== 'act-upstream-metadata/1') problems.push('unexpected metadata schemaVersion')
  if (metadata.source?.url !== SOURCE_URL) problems.push('metadata source URL is not the official URL')
  if (!metadata.license?.name || !metadata.license?.url) problems.push('metadata is missing license information')
  if (Number.isNaN(Date.parse(metadata.source?.retrievedAt || ''))) problems.push('metadata retrieval date is invalid')
  if (metadata.checksum?.snapshotSha256 !== sha256(snapshotBuffer)) problems.push('snapshot checksum does not match metadata')
  if (metadata.counts?.testcases !== cases.length) problems.push('metadata count does not match the snapshot')
  if (!(metadata.counts?.approved > 0)) problems.push('snapshot contains no approved test cases')

  const expectedCounts = countsFor(cases)
  for (const key of ['testcases', 'approved', 'notApproved', 'approvalMissing', 'rules']) {
    if (metadata.counts?.[key] !== expectedCounts[key]) problems.push(`metadata ${key} count is stale`)
  }
  for (const [outcome, count] of Object.entries(expectedCounts.byExpected)) {
    if (metadata.counts?.byExpected?.[outcome] !== count) problems.push(`metadata ${outcome} count is stale`)
  }

  for (const ruleId of ['674b10', '97a4e1']) {
    if (!cases.some((entry) => entry.ruleId === ruleId)) problems.push(`snapshot is missing rule ${ruleId}`)
  }

  if (problems.length > 0) {
    throw new Error(`ACT upstream data is invalid:\n${problems.slice(0, 20).join('\n')}`)
  }

  return { snapshot, metadata, cases }
}

function publish () {
  const { cases, metadata } = checkSnapshot()

  fs.mkdirSync(PUBLISHED, { recursive: true })
  fs.copyFileSync(SNAPSHOT, path.join(PUBLISHED, 'testcases.json'))
  fs.copyFileSync(METADATA, path.join(PUBLISHED, 'metadata.json'))

  console.log(`Published ${cases.length} W3C ACT test-case records and provenance to dist-lab/lab/upstream/`)
}

async function main () {
  const mode = process.argv[2]

  if (mode === '--import') {
    return await importSnapshot()
  }

  if (mode === '--check') {
    const { cases } = checkSnapshot()
    console.log(`ACT upstream snapshot is valid: ${cases.length} test cases`)
    return
  }

  if (mode) throw new Error(`Unknown option: ${mode}`)

  publish()
}

main().catch((error) => {
  console.error(`\nACT upstream data error: ${error.message}\n`)
  process.exitCode = 1
})
