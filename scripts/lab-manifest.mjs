/**
 * Validates the ACT laboratory manifest, adds source hashes and publishes it
 * with the build. The source manifest is committed; the published copy gains
 * provenance hashes so a comparison run can prove which fixture it measured.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = path.join(ROOT, 'services/lab/fixtures.json')
const OUTPUT = path.join(ROOT, 'dist-lab/lab/fixtures.json')

const OUTCOMES = new Set(['passed', 'failed', 'inapplicable'])
const REVIEW_STATES = new Set(['unreviewed', 'reviewed', 'disputed'])
const RULE_STATUSES = new Set(['approved', 'proposed', 'deprecated'])
const SCOPES = new Set(['light-dom', 'open-shadow', 'closed-shadow'])
const EXECUTION_STATES = new Set(['executed', 'unsupported', 'notRun', 'error'])

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

  for (const [index, entry] of manifest.cases.entries()) {
    const where = `cases[${index}]${entry.id ? ` (${entry.id})` : ''}`

    if (!/^[a-z0-9-]+$/.test(entry.id || '')) errors.push(`${where}: invalid id`)
    if (seen.has(entry.id)) errors.push(`${where}: duplicate id`)
    seen.add(entry.id)

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
    if (entry.target?.scope !== 'light-dom' && !entry.target.host) {
      errors.push(`${where}: shadow-root targets need a host selector`)
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
    }

    if (!entry.provenance?.sourceFile) {
      errors.push(`${where}: missing provenance.sourceFile`)
    } else if (!fs.existsSync(path.join(root, entry.provenance.sourceFile))) {
      errors.push(`${where}: provenance source does not exist: ${entry.provenance.sourceFile}`)
    }
  }

  return errors
}

function sha256 (file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
}

function main () {
  const manifest = JSON.parse(fs.readFileSync(SOURCE, 'utf8'))
  const errors = validateManifest(manifest)

  if (errors.length > 0) {
    for (const error of errors) console.error(`- ${error}`)
    throw new Error(`ACT manifest is invalid (${errors.length} problem(s))`)
  }

  const published = {
    ...manifest,
    cases: manifest.cases.map((entry) => ({
      ...entry,
      provenance: {
        ...entry.provenance,
        contentHash: sha256(path.join(ROOT, entry.provenance.sourceFile))
      }
    }))
  }

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true })
  fs.writeFileSync(OUTPUT, JSON.stringify(published, null, 2) + '\n')
  console.log(`Published ${published.cases.length} ACT fixtures to dist-lab/lab/fixtures.json`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main()
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
