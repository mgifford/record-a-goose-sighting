/**
 * Validates the ACT laboratory manifest, adds deterministic content
 * provenance and publishes the manifest, review index and provenance with the
 * build.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = path.join(ROOT, 'services/lab/fixtures.json')
const DIST = path.join(ROOT, 'dist-lab')
const OUTPUT = path.join(DIST, 'lab/fixtures.json')
const PROVENANCE_OUTPUT = path.join(DIST, 'lab/provenance.json')
const REVIEWS_SOURCE = path.join(ROOT, 'services/lab/reviews')
const REVIEWS_OUTPUT = path.join(DIST, 'lab/reviews')
const UPSTREAM_METADATA = path.join(ROOT, 'services/lab/upstream/metadata.json')

const OUTCOMES = new Set(['passed', 'failed', 'inapplicable'])
const REVIEW_STATES = new Set(['unreviewed', 'reviewed', 'disputed'])
const RULE_STATUSES = new Set(['approved', 'proposed', 'deprecated'])
const SCOPES = new Set(['light-dom', 'open-shadow', 'closed-shadow'])
const EXECUTION_STATES = new Set(['executed', 'unsupported', 'notRun', 'error'])

const BASE = normalizeBase(process.env.SITE_BASE || '/record-a-goose-sighting/')

function normalizeBase (value) {
  const inner = String(value || '/').replace(/^\/+|\/+$/g, '')
  return inner === '' ? '/' : `/${inner}/`
}

function sha256Buffer (buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

function sha256File (file) {
  return sha256Buffer(fs.readFileSync(file))
}

function readJson (file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function reviewFile (recordPath, root) {
  if (typeof recordPath !== 'string' || !recordPath.startsWith('lab/reviews/records/') || recordPath.includes('..')) {
    return null
  }
  return path.join(root, 'services', recordPath)
}

function validateReviewRecord (entry, root) {
  const errors = []
  const where = `case ${entry.id}`

  if (!entry.reviewRecord) {
    return [`${where}: missing reviewRecord`]
  }

  const file = reviewFile(entry.reviewRecord, root)
  if (!file || !fs.existsSync(file)) {
    return [`${where}: review record does not exist: ${entry.reviewRecord}`]
  }

  let record
  try {
    record = readJson(file)
  } catch (error) {
    return [`${where}: review record is not valid JSON: ${error.message}`]
  }

  if (record.schemaVersion !== 'fixture-review/1') errors.push(`${where}: review schemaVersion must be fixture-review/1`)
  if (record.fixtureId !== entry.id) errors.push(`${where}: review fixtureId does not match`)
  if (record.status !== entry.review) errors.push(`${where}: review status does not match manifest`)
  if (record.expectedOutcome !== entry.expected) errors.push(`${where}: review expectedOutcome does not match manifest`)
  if (entry.scenarioId && record.scenarioId !== entry.scenarioId) errors.push(`${where}: review scenarioId does not match manifest`)

  if (!Array.isArray(record.methods)) errors.push(`${where}: review methods must be an array`)
  if (!Array.isArray(record.evidence)) errors.push(`${where}: review evidence must be an array`)
  if (!Array.isArray(record.limitations)) errors.push(`${where}: review limitations must be an array`)

  if (record.status === 'reviewed') {
    if (!record.reviewer) errors.push(`${where}: reviewed record needs a reviewer`)
    if (!record.reviewedAt || Number.isNaN(Date.parse(record.reviewedAt))) {
      errors.push(`${where}: reviewed record needs a valid reviewedAt date`)
    }
    if (!Array.isArray(record.methods) || record.methods.length === 0) {
      errors.push(`${where}: reviewed record needs at least one method`)
    }
    if (!Array.isArray(record.evidence) || record.evidence.length === 0) {
      errors.push(`${where}: reviewed record needs at least one evidence reference`)
    }
  }

  if (record.status === 'unreviewed') {
    if (record.reviewer !== null) errors.push(`${where}: unreviewed record must not name a reviewer`)
    if (record.reviewedAt !== null) errors.push(`${where}: unreviewed record must not have a review date`)
  }

  if (record.status === 'disputed' && !record.rationale) {
    errors.push(`${where}: disputed record needs a rationale`)
  }

  return errors
}

export function validateManifest (manifest, root = ROOT) {
  const errors = []

  if (manifest.schemaVersion !== 'act-lab-fixture/2') {
    errors.push('schemaVersion must be act-lab-fixture/2')
  }

  if (!Array.isArray(manifest.cases) || manifest.cases.length === 0) {
    errors.push('cases must be a non-empty array')
    return errors
  }

  const seen = new Set()
  const targets = new Map()

  for (const [index, entry] of manifest.cases.entries()) {
    const where = `cases[${index}]${entry.id ? ` (${entry.id})` : ''}`

    if (!/^[a-z0-9-]+$/.test(entry.id || '')) errors.push(`${where}: invalid id`)
    if (seen.has(entry.id)) errors.push(`${where}: duplicate id`)
    seen.add(entry.id)

    if (entry.category !== undefined && !/^[a-z0-9-]+$/.test(entry.category)) {
      errors.push(`${where}: invalid category`)
    }
    if (entry.scenarioId !== undefined && !/^[a-z0-9-]+$/.test(entry.scenarioId)) {
      errors.push(`${where}: invalid scenarioId`)
    }
    if (entry.target?.targetId !== undefined && !/^[a-z0-9-]+$/.test(entry.target.targetId)) {
      errors.push(`${where}: invalid target.targetId`)
    }
    if (entry.stateId !== undefined && !/^[a-z0-9-]+$/.test(entry.stateId)) {
      errors.push(`${where}: invalid stateId`)
    }
    if (typeof entry.title !== 'string' || entry.title.trim() === '') {
      errors.push(`${where}: missing title`)
    }
    if (entry.target?.hostPath !== undefined) {
      if (!Array.isArray(entry.target.hostPath) || entry.target.hostPath.length === 0 ||
          entry.target.hostPath.some((selector) => typeof selector !== 'string' || selector.length === 0)) {
        errors.push(`${where}: hostPath must be a non-empty array of selectors`)
      }
    }
    if (entry.interaction !== undefined) {
      if (!entry.interaction || typeof entry.interaction !== 'object') {
        errors.push(`${where}: interaction must be an object`)
      } else {
        if (!['click', 'submit', 'focus', 'press'].includes(entry.interaction.action)) {
          errors.push(`${where}: unsupported interaction action`)
        }
        if (!entry.interaction.selector) errors.push(`${where}: interaction needs a selector`)
      }
    }

    if (!OUTCOMES.has(entry.expected) && entry.expected !== null) {
      errors.push(`${where}: expected must be passed, failed, inapplicable or null`)
    }

    if (entry.expected === null && !EXECUTION_STATES.has(entry.execution)) {
      errors.push(`${where}: a case without an expected outcome needs an execution status`)
    }

    if (!REVIEW_STATES.has(entry.review)) errors.push(`${where}: invalid review status`)

    const act = entry.act || {}
    if (!/^[a-z0-9]{6}$/.test(act.ruleId || '')) errors.push(`${where}: invalid ACT rule ID`)
    if (!RULE_STATUSES.has(act.ruleStatus)) errors.push(`${where}: invalid ACT rule status`)
    if (!act.ruleRevision || !/^\d{4}-\d{2}-\d{2}$/.test(act.ruleRevision)) {
      errors.push(`${where}: missing or invalid rule revision date`)
    }

    const ruleRoot = `https://www.w3.org/WAI/standards-guidelines/act/rules/${act.ruleId}/`
    const expectedRuleUrl = act.ruleStatus === 'proposed' ? `${ruleRoot}proposed/` : ruleRoot
    if (act.ruleUrl !== expectedRuleUrl) {
      errors.push(`${where}: ruleUrl must match the ${act.ruleStatus} rule URL`)
    }

    if (!SCOPES.has(entry.target?.scope)) errors.push(`${where}: invalid target scope`)
    if (entry.target?.scope === 'light-dom' || entry.target?.scope === 'open-shadow') {
      if (!entry.target.selector) errors.push(`${where}: missing target selector`)
    }
    if (entry.target?.scope !== 'light-dom' && !entry.target.host && !entry.target.hostPath) {
      errors.push(`${where}: shadow-root targets need a host selector or hostPath`)
    }
    if (entry.target?.scope === 'closed-shadow' && entry.target.selector !== null) {
      errors.push(`${where}: closed shadow targets cannot have an internal selector`)
    }

    if (!entry.readySelector || typeof entry.readySelector !== 'string') {
      errors.push(`${where}: missing ready selector`)
    }

    if (typeof entry.urlPath !== 'string' || entry.urlPath.startsWith('/') || entry.urlPath.includes('..')) {
      errors.push(`${where}: invalid relative URL path`)
    } else {
      const pathname = entry.urlPath.split('?')[0]
      const file = path.join(root, 'services', pathname, 'index.html')
      if (!fs.existsSync(file)) errors.push(`${where}: missing entry ${path.relative(root, file)}`)

      if (entry.target?.frame !== undefined) {
        if (!Array.isArray(entry.target.frame) || entry.target.frame.length === 0 ||
            entry.target.frame.some((frame) => typeof frame !== 'string' || frame.startsWith('/') || frame.includes('..'))) {
          errors.push(`${where}: frame must be a non-empty array of relative frame paths`)
        } else {
          let directory = path.dirname(file)
          for (const frame of entry.target.frame) {
            const frameFile = path.join(directory, frame)
            if (!fs.existsSync(frameFile)) {
              errors.push(`${where}: frame file does not exist: ${path.relative(root, frameFile)}`)
              break
            }
            directory = path.dirname(frameFile)
          }
        }
      }
    }

    if (entry.target?.targetId && typeof entry.urlPath === 'string') {
      const key = `${entry.urlPath.split('?')[0]}|${entry.target.targetId}`
      const signature = JSON.stringify({
        scope: entry.target.scope,
        selector: entry.target.selector ?? null,
        host: entry.target.host ?? null
      })
      const previous = targets.get(key)

      if (previous !== undefined && previous !== signature) {
        errors.push(`${where}: targetId ${entry.target.targetId} resolves to conflicting target definitions`)
      }
      targets.set(key, signature)
    }

    if (!entry.provenance?.sourceFile) {
      errors.push(`${where}: missing provenance.sourceFile`)
    } else if (!fs.existsSync(path.join(root, entry.provenance.sourceFile))) {
      errors.push(`${where}: provenance source does not exist: ${entry.provenance.sourceFile}`)
    }

    errors.push(...validateReviewRecord(entry, root))
  }

  return errors
}

function localAssetPath (url) {
  if (typeof url !== 'string' || !url.startsWith(BASE)) return null

  const relative = decodeURIComponent(url.slice(BASE.length).split(/[?#]/)[0])
  if (!relative || relative.includes('..')) return null

  const file = path.join(DIST, relative)
  if (!file.startsWith(DIST + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    return null
  }

  return { relative, file }
}

function pageProvenance (entry, cache) {
  const pathname = entry.urlPath.split('?')[0]
  const pageFile = path.join(DIST, pathname, 'index.html')

  if (!fs.existsSync(pageFile)) {
    throw new Error(`Rendered fixture page is missing: ${path.relative(ROOT, pageFile)}`)
  }

  const framePaths = entry.target?.frame || []
  const cacheKey = `${pageFile}|${framePaths.join('|')}`
  if (cache.has(cacheKey)) return cache.get(cacheKey)

  const htmlFiles = [{ file: pageFile, isFrame: false }]
  let directory = path.dirname(pageFile)
  for (const frame of framePaths) {
    const frameFile = path.join(directory, frame)
    if (!fs.existsSync(frameFile)) {
      throw new Error(`Rendered frame is missing: ${path.relative(ROOT, frameFile)}`)
    }
    htmlFiles.push({ file: frameFile, isFrame: true })
    directory = path.dirname(frameFile)
  }

  const pageHtml = fs.readFileSync(pageFile)
  const renderedHtmlHash = sha256Buffer(pageHtml)
  const assets = new Map()

  for (const { file, isFrame } of htmlFiles) {
    if (isFrame) {
      const relative = path.relative(DIST, file).split(path.sep).join('/')
      assets.set(relative, { path: relative, sha256: sha256File(file) })
    }

    const htmlText = fs.readFileSync(file, 'utf8')
    for (const match of htmlText.matchAll(/<(?:script|img|link)\b[^>]*?\b(?:src|href)="([^"]+)"/gi)) {
      const asset = localAssetPath(match[1])
      if (!asset || assets.has(asset.relative)) continue
      assets.set(asset.relative, {
        path: asset.relative,
        sha256: sha256File(asset.file)
      })
    }
  }

  const sortedAssets = [...assets.values()].sort((first, second) => first.path.localeCompare(second.path))
  const contentFingerprint = sha256Buffer(Buffer.from(JSON.stringify({
    renderedHtmlHash,
    assets: sortedAssets
  })))

  const result = { renderedHtmlHash, assets: sortedAssets, contentFingerprint }
  cache.set(cacheKey, result)
  return result
}

function buildProvenance (publishedCases) {
  let repositoryCommit = process.env.GITHUB_SHA || null
  if (!repositoryCommit) {
    try {
      repositoryCommit = execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim()
    } catch {
      repositoryCommit = null
    }
  }

  let viteVersion = null
  try {
    viteVersion = readJson(path.join(ROOT, 'node_modules/vite/package.json')).version
  } catch {
    viteVersion = null
  }

  let upstream = null
  try {
    const metadata = readJson(UPSTREAM_METADATA)
    upstream = {
      path: 'services/lab/upstream/metadata.json',
      snapshotSha256: metadata.checksum?.snapshotSha256 ?? null,
      retrievedAt: metadata.source?.retrievedAt ?? null
    }
  } catch {
    upstream = null
  }

  const fixtures = publishedCases.map((entry) => ({
    id: entry.id,
    scenarioId: entry.scenarioId ?? null,
    urlPath: entry.urlPath,
    renderedHtmlHash: entry.provenance.renderedHtmlHash,
    contentFingerprint: entry.provenance.contentFingerprint
  }))

  const aggregateFingerprint = sha256Buffer(Buffer.from(JSON.stringify(
    fixtures
      .map(({ id, contentFingerprint }) => ({ id, contentFingerprint }))
      .sort((first, second) => first.id.localeCompare(second.id))
  )))

  return {
    schemaVersion: 'act-lab-provenance/1',
    repositoryCommit,
    manifest: {
      path: 'services/lab/fixtures.json',
      sha256: sha256File(SOURCE)
    },
    build: {
      node: process.version,
      vite: viteVersion,
      base: BASE
    },
    upstreamAct: upstream,
    fixtures,
    aggregateFingerprint
  }
}

function publishReviews () {
  fs.rmSync(REVIEWS_OUTPUT, { recursive: true, force: true })
  fs.mkdirSync(REVIEWS_OUTPUT, { recursive: true })
  fs.copyFileSync(path.join(REVIEWS_SOURCE, 'schema.json'), path.join(REVIEWS_OUTPUT, 'schema.json'))
  fs.cpSync(path.join(REVIEWS_SOURCE, 'records'), path.join(REVIEWS_OUTPUT, 'records'), { recursive: true })

  const recordsDir = path.join(REVIEWS_SOURCE, 'records')
  const files = fs.readdirSync(recordsDir).filter((file) => file.endsWith('.json'))

  const index = {
    schemaVersion: 'fixture-review-index/1',
    records: files.map((file) => {
      const record = readJson(path.join(recordsDir, file))
      return {
        fixtureId: record.fixtureId,
        scenarioId: record.scenarioId ?? null,
        status: record.status,
        expectedOutcome: record.expectedOutcome,
        path: `lab/reviews/records/${file}`
      }
    }).sort((first, second) => first.fixtureId.localeCompare(second.fixtureId))
  }

  fs.writeFileSync(path.join(REVIEWS_OUTPUT, 'index.json'), JSON.stringify(index, null, 2) + '\n')
}

function main () {
  const manifest = JSON.parse(fs.readFileSync(SOURCE, 'utf8'))
  const errors = validateManifest(manifest)

  if (errors.length > 0) {
    for (const error of errors) console.error(`- ${error}`)
    throw new Error(`ACT manifest is invalid (${errors.length} problem(s))`)
  }

  const pageCache = new Map()
  const published = {
    ...manifest,
    cases: manifest.cases.map((entry) => ({
      ...entry,
      provenance: {
        ...entry.provenance,
        contentHash: sha256File(path.join(ROOT, entry.provenance.sourceFile)),
        ...pageProvenance(entry, pageCache)
      }
    }))
  }

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true })
  fs.writeFileSync(OUTPUT, JSON.stringify(published, null, 2) + '\n')

  const provenance = buildProvenance(published.cases)
  fs.writeFileSync(PROVENANCE_OUTPUT, JSON.stringify(provenance, null, 2) + '\n')

  publishReviews()

  console.log(`Published ${published.cases.length} ACT fixtures to dist-lab/lab/fixtures.json`)
  console.log(`Published provenance and ${published.cases.length} fixture review records`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main()
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
