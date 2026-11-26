/**
 * Builds the unified, canonical known-defect registry.
 *
 * There is one logical source of truth per defect, not one file:
 *
 *   docs/original-goose-issues.json  authoritative inventory of the 19
 *                                    preserved Ministry of Justice defects
 *   services/lab/fixtures.json       authoritative ACT fixture manifest
 *   data/defects/*.json              authoritative records for defects that are
 *                                    not ACT cases (subtle comparison fixtures)
 *   data/defect-annotations.json     curated enrichment for imported records
 *
 * The registry is generated from those files. It is never edited by hand:
 * `npm run defects:generate` rewrites it, `npm run defects:check-sync` fails
 * when the committed copy has drifted.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

export const SCHEMA_PATH = 'data/schemas/known-defects.schema.json'
export const REGISTRY_PATH = 'data/known-defects.json'
export const COVERAGE_PATH = 'data/defect-coverage.json'
export const MARKDOWN_PATH = 'docs/KNOWN-DEFECTS.md'
export const COVERAGE_MARKDOWN_PATH = 'docs/DEFECT-COVERAGE.md'

export const REGISTRY_VERSION = 'known-defects/1'

const GOOSE_INVENTORY = 'docs/original-goose-issues.json'
export const FIXTURE_MANIFEST = 'services/lab/fixtures.json'
const ANNOTATIONS = 'data/defect-annotations.json'
const DEFECT_DIRECTORY = 'data/defects'

export const DETECTION_METHODS = [
  'static-markup-analysis',
  'dom-inspection',
  'accessibility-tree-inspection',
  'computed-style-analysis',
  'automated-keyboard-interaction',
  'automated-pointer-interaction',
  'environment-emulation',
  'browser-geometry-inspection',
  'mutation-observation',
  'assisted-visual-review',
  'heuristic-analysis',
  'ai-text-evaluation',
  'ai-image-evaluation',
  'manual-keyboard-evaluation',
  'screen-reader-evaluation',
  'voice-control-evaluation',
  'switch-control-evaluation',
  'user-testing'
]

export const CAPABILITIES = [
  'screen-reader',
  'keyboard-only',
  'switch-control',
  'voice-control',
  'screen-magnification',
  'braille',
  'forced-colours',
  'increased-text-spacing',
  'colour-scheme',
  'reduced-motion',
  'cognitive',
  'low-vision',
  'deaf-or-hard-of-hearing',
  'pointer-precision'
]

const MANUAL_METHOD_MAP = {
  'visual inspection': 'assisted-visual-review',
  'heading outline': 'accessibility-tree-inspection',
  keyboard: 'manual-keyboard-evaluation',
  'links list': 'screen-reader-evaluation',
  'content review': 'heuristic-analysis',
  'screen reader': 'screen-reader-evaluation',
  'computed styles': 'computed-style-analysis',
  'forms mode': 'screen-reader-evaluation',
  'cognitive walkthrough': 'heuristic-analysis',
  'dyslexia-aware review': 'heuristic-analysis',
  'motion sensitivity review': 'heuristic-analysis',
  'images list': 'screen-reader-evaluation'
}

const CLASSIFICATION_BY_WCAG_STATUS = {
  failure: 'wcag-failure',
  'best-practice': 'best-practice',
  'manual-concern': 'usability-concern'
}

const RULE_META = {
  '97a4e1': {
    category: 'accessible-name',
    component: 'button',
    impact: 'A control without an accessible name is announced without its purpose, so screen-reader, voice-control and switch users cannot identify it reliably.',
    capabilities: ['screen-reader', 'voice-control', 'switch-control'],
    methods: ['dom-inspection', 'accessibility-tree-inspection'],
    manual: 'Open the accessibility tree for the target and confirm that the button exposes a non-empty, meaningful accessible name.'
  },
  c487ae: {
    category: 'accessible-name',
    component: 'link',
    impact: 'A link without an accessible name appears in a screen reader links list as an unlabelled item, and voice-control users cannot activate it by name.',
    capabilities: ['screen-reader', 'voice-control'],
    methods: ['dom-inspection', 'accessibility-tree-inspection'],
    manual: 'List the links on the page and confirm that the target link has an accessible name that describes its destination.'
  },
  e086e5: {
    category: 'accessible-name',
    component: 'form field',
    impact: 'A form field without an accessible name gives no indication of what to enter, so screen-reader and voice-control users cannot complete the field confidently.',
    capabilities: ['screen-reader', 'voice-control', 'cognitive'],
    methods: ['dom-inspection', 'accessibility-tree-inspection'],
    manual: 'Navigate to the field in forms mode and confirm that it announces a label.'
  },
  '23a2a8': {
    category: 'image-alternative',
    component: 'image',
    impact: 'An image without an accessible name is announced as an unlabelled graphic, so screen-reader users lose the information it conveys.',
    capabilities: ['screen-reader'],
    methods: ['dom-inspection', 'accessibility-tree-inspection'],
    manual: 'Open the images list and confirm that the target image exposes a text alternative.'
  },
  '674b10': {
    category: 'aria-validity',
    component: 'element with a role attribute',
    impact: 'An invalid role is ignored by browsers, so the element exposes an unintended implicit role and assistive-technology users receive the wrong interaction model.',
    capabilities: ['screen-reader'],
    methods: ['dom-inspection', 'accessibility-tree-inspection'],
    manual: 'Inspect the attribute and the computed role, and confirm that the role token is valid.'
  }
}

export function readJson (root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'))
}

export function sha256File (root, relativePath) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(path.join(root, relativePath)))
    .digest('hex')
}

function sortedEntries (object) {
  return Object.fromEntries(Object.entries(object).sort(([first], [second]) => first.localeCompare(second)))
}

function countBy (items, select) {
  const counts = {}
  for (const item of items) {
    for (const value of select(item)) {
      counts[value] = (counts[value] || 0) + 1
    }
  }
  return sortedEntries(counts)
}

function uniqueMethods (values) {
  return [...new Set(values)].sort()
}

function gooseDetectionMethods (issue) {
  const methods = (issue.detection?.manual?.methods || [])
    .map((method) => MANUAL_METHOD_MAP[method])
    .filter(Boolean)
  return uniqueMethods(methods)
}

function buildGooseRecord (issue, annotation, root) {
  const errors = []
  const where = `goose issue ${issue.id}`

  if (!annotation) errors.push(`${where}: missing curated annotation`)
  for (const field of ['component', 'locators', 'expectedBehaviour', 'userImpact', 'affectedCapabilities']) {
    if (!annotation?.[field] || (Array.isArray(annotation[field]) && annotation[field].length === 0)) {
      errors.push(`${where}: annotation is missing ${field}`)
    }
  }

  const record = {
    id: issue.id,
    aliases: [`answer-key:${issue.answerKeyNumber}`],
    title: issue.title,
    description: [issue.evidence.assertion, issue.detection.whyMissed].filter(Boolean).join(' '),
    service: 'goose',
    fixtureId: null,
    component: annotation?.component ?? null,
    category: issue.category,
    classification: CLASSIFICATION_BY_WCAG_STATUS[issue.wcag.status] ?? 'usability-concern',
    url: issue.route,
    fragment: null,
    locators: annotation?.locators ?? [],
    relatedElements: annotation?.relatedElements ?? [],
    preconditions: [],
    interactionSteps: [],
    environment: null,
    expectedBehaviour: annotation?.expectedBehaviour ?? '',
    actualBehaviour: issue.evidence.assertion,
    userImpact: annotation?.userImpact ?? '',
    affectedCapabilities: annotation?.affectedCapabilities ?? [],
    wcag: issue.wcag.criteria.map((criterion) => ({
      criterion,
      status: 'claimed',
      note: 'Documented as a failure in the original exercise. No independent conformance review is recorded.'
    })),
    actRules: [],
    detection: {
      expectedMethods: gooseDetectionMethods(issue),
      observed: [],
      note: issue.detection.whyMissed ?? null
    },
    manualTests: issue.detection.manual.test ? [issue.detection.manual.test] : [],
    assistiveTechnologyTests: [],
    evidence: {
      assertions: [issue.evidence.assertion],
      tests: [issue.evidence.test],
      artifacts: [],
      commands: ['npx playwright test tests/accessibility-regression.spec.js']
    },
    controlFixtureId: null,
    reviewStatus: {
      lifecycle: 'reproduced-automatically',
      dimensions: {
        automatedReproduction: 'verified',
        manualReproduction: 'not-run',
        assistiveTechnology: 'not-run',
        independentReview: 'not-run'
      },
      note: 'Automated reproduction asserts the DOM or rendered condition. That is not an assistive-technology observation and it does not independently confirm the WCAG claim.'
    },
    sources: annotation?.sources ?? [],
    introducedIn: `${issue.page}@original-goose-3f23c97`,
    lastVerified: null,
    provenance: {
      origin: 'imported',
      derivedFrom: [GOOSE_INVENTORY, ANNOTATIONS]
    },
    notApplicable: ['fixtureId', 'actRules', 'controlFixtureId']
  }

  return { record, errors }
}

function labLocators (entry) {
  if (entry.execution === 'unsupported' || entry.target?.scope === 'closed-shadow') {
    return [{
      type: 'document-scope',
      value: null,
      note: 'The target lives in a closed shadow root. Ordinary DOM locators cannot resolve it; accessibility-tree access must be reported separately.'
    }]
  }

  const locator = {
    type: 'css',
    value: entry.target?.selector ?? null
  }
  if (entry.target?.frame?.length) locator.framePath = entry.target.frame
  if (entry.target?.scope === 'open-shadow') {
    locator.shadowPath = entry.target.hostPath ?? (entry.target.host ? [entry.target.host] : null)
  }
  return [locator]
}

function buildLabRecord (entry, annotation, manifest) {
  const rule = entry.act || {}
  const meta = RULE_META[rule.ruleId]
  const errors = []
  const where = `lab fixture ${entry.id}`

  if (!meta) {
    errors.push(`${where}: no detection metadata is registered for ACT rule ${rule.ruleId}`)
  }

  const exploratory = entry.execution === 'unsupported'
  const scenarioHasControl = manifest.cases.some((candidate) =>
    candidate.id !== entry.id &&
    candidate.expected === 'passed' &&
    candidate.urlPath === entry.urlPath &&
    (candidate.scenarioId ?? candidate.id) === (entry.scenarioId ?? entry.id)
  )

  const record = {
    id: entry.id,
    aliases: [],
    title: entry.title,
    description: entry.notes,
    service: entry.service,
    fixtureId: entry.id,
    component: meta?.component ?? null,
    category: meta?.category ?? 'act-fixture',
    classification: exploratory ? 'exploratory' : 'act-rule-failure',
    url: entry.urlPath,
    fragment: null,
    locators: labLocators(entry),
    relatedElements: [],
    preconditions: entry.interaction ? ['The fixture is loaded in its default state.'] : [],
    interactionSteps: entry.interaction
      ? [{ action: entry.interaction.action, selector: entry.interaction.selector, note: 'Record the state before and after the interaction.' }]
      : [],
    environment: null,
    expectedBehaviour: meta
      ? `The target satisfies ACT rule ${rule.ruleId}: ${rule.ruleName}.`
      : `The target satisfies ACT rule ${rule.ruleId}.`,
    actualBehaviour: exploratory
      ? `${entry.notes} No ACT outcome is claimed.`
      : `The target does not satisfy ACT rule ${rule.ruleId} (${rule.ruleName}). ${entry.notes}`,
    userImpact: meta?.impact ?? 'Not recorded.',
    affectedCapabilities: meta?.capabilities ?? [],
    wcag: [],
    actRules: [{
      ruleId: rule.ruleId,
      status: entry.expected ?? 'unknown',
      ruleName: rule.ruleName,
      ruleUrl: rule.ruleUrl
    }],
    detection: {
      expectedMethods: meta?.methods ?? [],
      observed: [],
      note: 'ACT rule outcome only. A WCAG mapping has not been reviewed for this fixture.'
    },
    manualTests: meta ? [meta.manual] : [],
    assistiveTechnologyTests: [],
    evidence: {
      assertions: [],
      tests: [],
      artifacts: entry.reviewRecord ? [entry.reviewRecord] : [],
      commands: ['npm run defects:verify -- --id ' + entry.id]
    },
    controlFixtureId: annotation?.controlFixtureId ?? (scenarioHasControl
      ? manifest.cases.find((candidate) =>
        candidate.id !== entry.id &&
          candidate.expected === 'passed' &&
          candidate.urlPath === entry.urlPath &&
          (candidate.scenarioId ?? candidate.id) === (entry.scenarioId ?? entry.id)
      ).id
      : null),
    reviewStatus: {
      lifecycle: 'reproduced-automatically',
      dimensions: {
        automatedReproduction: 'verified',
        manualReproduction: 'not-run',
        assistiveTechnology: 'not-run',
        independentReview: entry.review === 'reviewed' ? 'reviewed' : 'not-run'
      },
      note: 'Locator resolution and the declared fixture state are asserted automatically. The ACT outcome remains an unreviewed hypothesis until a person records a review.'
    },
    sources: rule.ruleUrl ? [{ title: `${rule.ruleName} (ACT rule ${rule.ruleId})`, url: rule.ruleUrl }] : [],
    introducedIn: null,
    lastVerified: null,
    provenance: {
      origin: 'derived',
      derivedFrom: [FIXTURE_MANIFEST, ANNOTATIONS]
    },
    notApplicable: annotation?.notApplicable ?? []
  }

  if (exploratory) {
    record.notApplicable = [...new Set([...record.notApplicable, 'controlFixtureId'])]
  }

  return { record, errors }
}

function buildCuratedRecord (record, file) {
  return {
    ...record,
    fixtureId: record.fixtureId ?? null,
    component: record.component ?? null,
    fragment: record.fragment ?? null,
    aliases: record.aliases ?? [],
    relatedElements: record.relatedElements ?? [],
    preconditions: record.preconditions ?? [],
    interactionSteps: record.interactionSteps ?? [],
    environment: record.environment ?? null,
    wcag: record.wcag ?? [],
    actRules: record.actRules ?? [],
    controlFixtureId: record.controlFixtureId ?? null,
    sources: record.sources ?? [],
    introducedIn: record.introducedIn ?? null,
    lastVerified: record.lastVerified ?? null,
    provenance: {
      origin: 'curated',
      derivedFrom: [file],
      note: 'Hand-authored record. Its expected behaviour is a hypothesis until an independent review records evidence.'
    }
  }
}

function sumCounts (defects) {
  return {
    defects: defects.length,
    byService: countBy(defects, (defect) => [defect.service]),
    byCategory: countBy(defects, (defect) => [defect.category]),
    byClassification: countBy(defects, (defect) => [defect.classification]),
    byReviewLifecycle: countBy(defects, (defect) => [defect.reviewStatus.lifecycle]),
    wcagCriteria: countBy(defects, (defect) => defect.wcag.map((mapping) => mapping.criterion)),
    actRules: countBy(defects, (defect) => defect.actRules.map((mapping) => mapping.ruleId))
  }
}

/**
 * Build the registry in memory. Returns the registry object and any build
 * errors. No files are written.
 */
export function buildRegistry (root = ROOT) {
  const errors = []
  const inventory = readJson(root, GOOSE_INVENTORY)
  const manifest = readJson(root, FIXTURE_MANIFEST)
  const annotations = readJson(root, ANNOTATIONS)

  const defects = []
  const ids = new Set()

  for (const issue of inventory.issues) {
    const result = buildGooseRecord(issue, annotations.goose?.[issue.id], root)
    errors.push(...result.errors)
    defects.push(result.record)
  }

  for (const entry of manifest.cases) {
    if (entry.expected !== 'failed' && entry.execution !== 'unsupported') continue
    const result = buildLabRecord(entry, annotations.lab?.[entry.id], manifest)
    errors.push(...result.errors)
    defects.push(result.record)
  }

  const curatedDirectory = path.join(root, DEFECT_DIRECTORY)
  const curatedFiles = fs.existsSync(curatedDirectory)
    ? fs.readdirSync(curatedDirectory).filter((file) => file.endsWith('.json')).sort()
    : []

  for (const file of curatedFiles) {
    const relative = `${DEFECT_DIRECTORY}/${file}`
    const raw = readJson(root, relative)
    const record = buildCuratedRecord(raw, relative)
    if (`${record.id}.json` !== file) {
      errors.push(`${relative}: record id "${record.id}" does not match the file name`)
    }
    defects.push(record)
  }

  for (const defect of defects) {
    if (ids.has(defect.id)) errors.push(`duplicate defect id: ${defect.id}`)
    ids.add(defect.id)
  }

  defects.sort((first, second) => {
    if (first.service !== second.service) return first.service.localeCompare(second.service)
    if (first.id !== second.id) return first.id.localeCompare(second.id)
    return 0
  })

  const sourceFiles = [
    { path: GOOSE_INVENTORY, kind: 'goose-inventory', description: 'Authoritative inventory of the preserved original exercise defects.' },
    { path: FIXTURE_MANIFEST, kind: 'act-fixture-manifest', description: 'Authoritative ACT fixture manifest; failed and unsupported cases become defect records.' },
    { path: ANNOTATIONS, kind: 'annotation', description: 'Curated locators, expected behaviour and impact for imported records.' },
    ...curatedFiles.map((file) => ({
      path: `${DEFECT_DIRECTORY}/${file}`,
      kind: 'defect-record',
      description: 'Hand-authored defect record for a defect that is not an ACT fixture case.'
    })),
    { path: SCHEMA_PATH, kind: 'schema', description: 'JSON Schema for this registry.' }
  ]

  const sources = sourceFiles.map((source) => ({
    ...source,
    sha256: sha256File(root, source.path)
  }))

  const registry = {
    schemaVersion: REGISTRY_VERSION,
    description: 'Canonical machine-readable registry of every intentional accessibility defect in this project. Generated from the authoritative source records listed in `sources`; do not edit by hand.',
    generatedBy: 'npm run defects:generate',
    sources,
    counts: sumCounts(defects),
    defects
  }

  return { registry, errors, curatedFiles, manifest }
}
