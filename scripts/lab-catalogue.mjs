/**
 * Builds the static laboratory catalogue and derived JSON indexes from the
 * published manifest. The catalogue is usable without JavaScript; the filter
 * form is a progressive enhancement.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist-lab')
const MANIFEST = path.join(DIST, 'lab/fixtures.json')
const REVIEWS = path.join(DIST, 'lab/reviews/index.json')
const OUT = path.join(DIST, 'lab/catalogue')

const BASE = normalizeBase(process.env.SITE_BASE || '/record-a-goose-sighting/')

function normalizeBase (value) {
  const inner = String(value || '/').replace(/^\/+|\/+$/g, '')
  return inner === '' ? '/' : `/${inner}/`
}

function url (route) {
  return BASE + String(route).replace(/^\/+/, '')
}

function escapeHtml (value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

const CATEGORY_ORDER = [
  'isolated-act',
  'applicability',
  'target-correlation',
  'shared-target',
  'multi-rule-target',
  'repeated-targets',
  'iframe',
  'dynamic-state',
  'shadow-dom',
  'interaction'
]

const CATEGORY_LABELS = {
  'isolated-act': 'Isolated ACT fixtures',
  applicability: 'Applicability',
  'target-correlation': 'Target correlation',
  'shared-target': 'Shared target',
  'multi-rule-target': 'Multiple rules, one target',
  'repeated-targets': 'Repeated targets',
  iframe: 'Frames',
  'dynamic-state': 'Dynamic states',
  'shadow-dom': 'Shadow DOM',
  interaction: 'Interaction'
}

const CONTEXT_LABELS = {
  'light-dom': 'Light DOM',
  'open-shadow': 'Open shadow root',
  'closed-shadow': 'Closed shadow root',
  document: 'Document'
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
const reviewIndex = JSON.parse(fs.readFileSync(REVIEWS, 'utf8'))
const reviews = new Map(reviewIndex.records.map((record) => [record.fixtureId, record]))

function categoryOf (entry) {
  if (entry.category) return entry.category
  return 'isolated-act'
}

function contextOf (entry) {
  if (entry.target?.frame?.length) return 'iframe'
  return entry.target?.scope || 'light-dom'
}

function contextLabel (entry) {
  if (entry.target?.scope === 'document') return 'Document (no applicable targets)'
  if (entry.target?.frame?.length) {
    return `Iframe: ${entry.target.frame.join(' > ')}`
  }
  if (entry.target?.hostPath?.length) {
    return `${CONTEXT_LABELS[entry.target.scope] || entry.target.scope}: ${entry.target.hostPath.join(' > ')}`
  }
  if (entry.target?.host) {
    return `${CONTEXT_LABELS[entry.target.scope] || entry.target.scope}: ${entry.target.host}`
  }
  return CONTEXT_LABELS[entry.target?.scope] || entry.target?.scope || 'Light DOM'
}

function interactionOf (entry) {
  return entry.interaction ? 'required' : 'none'
}

function cases () {
  return manifest.cases.map((entry) => {
    const review = reviews.get(entry.id)
    const frame = entry.target?.frame?.length ? entry.target.frame.join(' > ') : null
    return {
      id: entry.id,
      title: entry.title,
      description: entry.notes,
      path: entry.urlPath,
      url: url(entry.urlPath),
      category: categoryOf(entry),
      framework: entry.framework || 'html',
      scenarioId: entry.scenarioId || entry.id,
      stateId: entry.stateId || null,
      expected: entry.expected,
      review: review?.status || entry.review,
      act: entry.act,
      target: {
        scope: entry.target?.scope,
        selector: entry.target?.selector ?? null,
        targetId: entry.target?.targetId ?? null,
        frame,
        host: entry.target?.host ?? null,
        hostPath: entry.target?.hostPath ?? null
      },
      context: contextOf(entry),
      contextLabel: contextLabel(entry),
      interaction: entry.interaction || null,
      interactionState: interactionOf(entry),
      contentFingerprint: entry.provenance?.contentFingerprint ?? null,
      evidence: url(`lab/reviews/records/${entry.id}.json`),
      source: `https://github.com/mgifford/record-a-goose-sighting/blob/master/${entry.provenance.sourceFile}`
    }
  })
}

function countBy (items, key) {
  return items.reduce((counts, item) => {
    const value = item[key] || 'none'
    counts[value] = (counts[value] || 0) + 1
    return counts
  }, {})
}

function coverage (items) {
  const rules = {}
  for (const item of items) {
    const id = item.act.ruleId
    rules[id] ||= {
      ruleId: id,
      ruleName: item.act.ruleName,
      ruleStatus: item.act.ruleStatus,
      ruleRevision: item.act.ruleRevision,
      ruleUrl: item.act.ruleUrl,
      cases: 0,
      outcomes: { passed: 0, failed: 0, inapplicable: 0, unknown: 0 }
    }
    rules[id].cases += 1
    const outcome = item.expected ?? 'unknown'
    rules[id].outcomes[outcome] = (rules[id].outcomes[outcome] || 0) + 1
  }

  return {
    schemaVersion: 'lab-coverage/1',
    dimensions: [
      'rule',
      'expected outcome',
      'framework',
      'category',
      'DOM context',
      'interaction',
      'review status'
    ],
    note: 'ACT rule coverage is not WCAG coverage. Inapplicable cases and unreviewed hypotheses are counted explicitly.',
    totals: {
      cases: items.length,
      rules: Object.keys(rules).length,
      reviewed: items.filter((item) => item.review === 'reviewed').length,
      unreviewed: items.filter((item) => item.review === 'unreviewed').length,
      disputed: items.filter((item) => item.review === 'disputed').length
    },
    byRule: rules,
    byOutcome: countBy(items, 'expected'),
    byFramework: countBy(items, 'framework'),
    byCategory: countBy(items, 'category'),
    byContext: countBy(items, 'context'),
    byInteraction: countBy(items, 'interactionState'),
    byReview: countBy(items, 'review')
  }
}

function scenarios (items) {
  const grouped = new Map()
  for (const item of items) {
    grouped.set(item.scenarioId, [...(grouped.get(item.scenarioId) || []), item])
  }

  return [...grouped.entries()].map(([scenarioId, group]) => ({
    scenarioId,
    title: group.length === 1 ? group[0].title : scenarioId.replaceAll('-', ' '),
    category: group[0].category,
    cases: group.map((item) => item.id),
    paths: [...new Set(group.map((item) => item.path))]
  })).sort((first, second) => first.scenarioId.localeCompare(second.scenarioId))
}

function badge (expected) {
  const label = expected ?? 'no outcome'
  return `<span class="badge badge-${escapeHtml(expected ?? 'unknown')}">${escapeHtml(label)}</span>`
}

function card (item) {
  const rule = item.act
  const interaction = item.interaction
    ? `${item.interaction.action} ${item.interaction.selector}`
    : 'None'

  return `<article class="catalogue-card" data-rule="${escapeHtml(rule.ruleId)}" data-outcome="${escapeHtml(item.expected ?? 'unknown')}" data-framework="${escapeHtml(item.framework)}" data-category="${escapeHtml(item.category)}" data-context="${escapeHtml(item.context)}" data-review="${escapeHtml(item.review)}" data-interaction="${escapeHtml(item.interactionState)}">
  <h3><a href="${escapeHtml(item.url)}">${escapeHtml(item.title)}</a></h3>
  <p class="catalogue-description">${escapeHtml(item.description)}</p>
  <dl class="catalogue-meta">
    <dt>ACT rule</dt><dd>${badge(item.expected)} <a href="${escapeHtml(rule.ruleUrl)}">${escapeHtml(rule.ruleId)}: ${escapeHtml(rule.ruleName)}</a> (${escapeHtml(rule.ruleStatus)}, ${escapeHtml(rule.ruleRevision)})</dd>
    <dt>Review</dt><dd>${escapeHtml(item.review)} · <a href="${escapeHtml(item.evidence)}">evidence record</a></dd>
    <dt>Framework</dt><dd>${escapeHtml(item.framework)}</dd>
    <dt>Category</dt><dd>${escapeHtml(CATEGORY_LABELS[item.category] || item.category)}</dd>
    <dt>Context</dt><dd>${escapeHtml(item.contextLabel)}</dd>
    <dt>Target</dt><dd>${item.target.scope === 'document' ? 'Document scope — no applicable targets' : `<code>${escapeHtml(item.target.selector ?? item.target.host ?? 'closed shadow root')}</code>${item.target.targetId ? ` (${escapeHtml(item.target.targetId)})` : ''}`}</dd>
    <dt>Interaction</dt><dd>${escapeHtml(interaction)}</dd>
    <dt>State</dt><dd>${escapeHtml(item.stateId || 'default')}</dd>
    <dt>Source</dt><dd><a href="${escapeHtml(item.source)}">Fixture source</a> · <a href="${escapeHtml(item.url)}">Open fixture</a></dd>
  </dl>
</article>`
}

function options (items, key, label) {
  const values = [...new Set(items.map((item) => item[key]).filter(Boolean))].sort()
  return `<option value="">All ${escapeHtml(label.toLowerCase())}</option>` +
    values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(String(value))}</option>`).join('')
}

function render (items, coverageData, scenarioData) {
  const grouped = new Map()
  for (const item of items) {
    grouped.set(item.category, [...(grouped.get(item.category) || []), item])
  }

  const categoryOrder = [
    ...CATEGORY_ORDER.filter((category) => grouped.has(category)),
    ...[...grouped.keys()].filter((category) => !CATEGORY_ORDER.includes(category)).sort()
  ]

  const sections = categoryOrder.map((category) => {
    const group = grouped.get(category)
    return `<section aria-labelledby="category-${escapeHtml(category)}">
  <h2 id="category-${escapeHtml(category)}">${escapeHtml(CATEGORY_LABELS[category] || category)} <span class="catalogue-count">(${group.length})</span></h2>
  ${group.map(card).join('\n')}
</section>`
  }).join('\n')

  const ruleOptions = [...new Map(items.map((item) => [item.act.ruleId, item.act.ruleName])).entries()]
    .sort((first, second) => first[0].localeCompare(second[0]))
    .map(([id, name]) => `<option value="${escapeHtml(id)}">${escapeHtml(id)} — ${escapeHtml(name)}</option>`)
    .join('')

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Fixture catalogue</title>
  <meta name="description" content="Browse the accessibility fixtures by ACT rule, expected outcome, framework, context, interaction and review status.">
  <link rel="stylesheet" href="${url('lab/lab-styles.css')}">
  <style>
    .catalogue-filters { display: grid; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); gap: 1rem; border: 2px solid #0b0c0c; padding: 1rem; margin: 1.5rem 0; }
    .catalogue-filters label { display: block; font-weight: 600; margin-bottom: 0.25rem; }
    .catalogue-filters select { width: 100%; padding: 0.4rem; border: 2px solid #0b0c0c; background: #fff; }
    .catalogue-filters .filter-actions { align-self: end; }
    .catalogue-card { border: 2px solid #0b0c0c; padding: 1rem; margin: 1rem 0 2rem; background: #fff; }
    .catalogue-card h3 { margin-top: 0; }
    .catalogue-description { max-width: 48rem; }
    .catalogue-meta { display: grid; grid-template-columns: max-content 1fr; gap: 0.35rem 1rem; }
    .catalogue-meta dt { font-weight: 600; }
    .catalogue-meta dd { margin: 0; }
    .catalogue-count { font-weight: 400; }
    .badge { display: inline-block; padding: 0.1rem 0.5rem; border: 1px solid #0b0c0c; font-size: 0.875rem; }
    .badge-passed { background: #cce2d8; }
    .badge-failed { background: #f6d7d2; }
    .badge-inapplicable { background: #e8e8e8; }
    .badge-unknown { background: #fff7bf; }
    @media (max-width: 40rem) { .catalogue-meta { grid-template-columns: 1fr; } .catalogue-meta dt { margin-top: 0.5rem; } }
  </style>
</head>
<body>
  <header>
    <nav aria-label="Site">
      <a href="${url('')}">Record a goose sighting</a>
      <a href="${url('lab/')}">Laboratory</a>
    </nav>
  </header>
  <main>
    <h1>Fixture catalogue</h1>
    <p class="notice">Browse the ${items.length} declared fixtures by ACT rule, expected outcome, framework, context, interaction and review status. Every entry is generated from <a href="${url('lab/fixtures.json')}">the manifest</a>; the catalogue does not predict scanner results.</p>
    <p><strong>${items.length}</strong> fixtures across <strong>${Object.keys(coverageData.byRule).length}</strong> ACT rules. Reviewed: <strong>${coverageData.totals.reviewed}</strong>; unreviewed: <strong>${coverageData.totals.unreviewed}</strong>; disputed: <strong>${coverageData.totals.disputed}</strong>.</p>

    <form class="catalogue-filters" id="catalogue-filters">
      <div>
        <label for="filter-rule">ACT rule</label>
        <select id="filter-rule" name="rule"><option value="">All rules</option>${ruleOptions}</select>
      </div>
      <div>
        <label for="filter-outcome">Expected outcome</label>
        <select id="filter-outcome" name="outcome">${options(items, 'expected', 'outcomes')}</select>
      </div>
      <div>
        <label for="filter-framework">Framework</label>
        <select id="filter-framework" name="framework">${options(items, 'framework', 'frameworks')}</select>
      </div>
      <div>
        <label for="filter-category">Category</label>
        <select id="filter-category" name="category"><option value="">All categories</option>${categoryOrder.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(CATEGORY_LABELS[category] || category)}</option>`).join('')}</select>
      </div>
      <div>
        <label for="filter-context">DOM context</label>
        <select id="filter-context" name="context">${options(items, 'context', 'contexts')}</select>
      </div>
      <div>
        <label for="filter-review">Review status</label>
        <select id="filter-review" name="review">${options(items, 'review', 'review statuses')}</select>
      </div>
      <div>
        <label for="filter-interaction">Interaction</label>
        <select id="filter-interaction" name="interaction"><option value="">Any interaction</option><option value="required">Action required</option><option value="none">No action</option></select>
      </div>
      <div class="filter-actions">
        <button type="reset">Reset filters</button>
      </div>
    </form>
    <p id="catalogue-result" role="status" aria-live="polite">Showing all ${items.length} fixtures.</p>
    <noscript><p>Filters require JavaScript. Use the category headings below, or read the <a href="${url('lab/catalogue.json')}">catalogue JSON</a>.</p></noscript>

    ${sections}

    <h2>Machine-readable indexes</h2>
    <ul>
      <li><a href="${url('lab/catalogue.json')}">Catalogue (JSON)</a></li>
      <li><a href="${url('lab/scenarios.json')}">Scenarios (JSON)</a></li>
      <li><a href="${url('lab/coverage.json')}">Coverage (JSON)</a></li>
      <li><a href="${url('lab/fixtures.json')}">Fixture manifest (JSON)</a></li>
      <li><a href="${url('lab/provenance.json')}">Provenance (JSON)</a></li>
      <li><a href="${url('lab/reviews/index.json')}">Review index (JSON)</a></li>
    </ul>
    <p>Scenarios: ${scenarioData.length}. A scenario may contain several targets or several cases for one target.</p>
  </main>
  <footer>
    <p>Part of the animal-reporting laboratory. <a href="${url('lab/')}">Back to the laboratory</a>.</p>
  </footer>
  <script>
    const form = document.getElementById('catalogue-filters')
    const cards = Array.from(document.querySelectorAll('.catalogue-card'))
    const result = document.getElementById('catalogue-result')
    const fields = ['rule', 'outcome', 'framework', 'category', 'context', 'review', 'interaction']

    function applyFilters () {
      const values = Object.fromEntries(fields.map((field) => [field, form.elements[field].value]))
      let visible = 0
      for (const card of cards) {
        const show = fields.every((field) => !values[field] || card.dataset[field] === values[field])
        card.hidden = !show
        if (show) visible += 1
      }
      result.textContent = visible === cards.length
        ? 'Showing all ' + cards.length + ' fixtures.'
        : 'Showing ' + visible + ' of ' + cards.length + ' fixtures.'
    }

    form.addEventListener('change', applyFilters)
    form.addEventListener('reset', () => requestAnimationFrame(applyFilters))
  </script>
</body>
</html>
`
}

function main () {
  const items = cases()
  const coverageData = coverage(items)
  const scenarioData = scenarios(items)

  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(path.join(OUT, 'index.html'), render(items, coverageData, scenarioData))

  const catalogue = {
    schemaVersion: 'lab-catalogue/1',
    source: 'lab/fixtures.json',
    cases: items,
    scenarios: scenarioData
  }
  fs.writeFileSync(path.join(DIST, 'lab/catalogue.json'), JSON.stringify(catalogue, null, 2) + '\n')
  fs.writeFileSync(path.join(DIST, 'lab/coverage.json'), JSON.stringify(coverageData, null, 2) + '\n')
  fs.writeFileSync(path.join(DIST, 'lab/scenarios.json'), JSON.stringify({
    schemaVersion: 'lab-scenarios/1',
    source: 'lab/fixtures.json',
    scenarios: scenarioData
  }, null, 2) + '\n')

  console.log(`Generated catalogue for ${items.length} fixtures and ${scenarioData.length} scenarios`)
}

main()
