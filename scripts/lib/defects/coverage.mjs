/**
 * Derives the coverage matrices that are published alongside the registry.
 * Coverage here means "which requirements and testing methods are represented
 * by at least one declared defect". It is not a claim of WCAG conformance and
 * it is not a score.
 */

function increment (counts, key) {
  counts[key] = (counts[key] || 0) + 1
}

function sorted (counts) {
  return Object.fromEntries(Object.entries(counts).sort(([first], [second]) => first.localeCompare(second)))
}

export function buildCoverage (registry, manifest) {
  const frameworkByFixture = new Map(manifest.cases.map((entry) => [entry.id, entry.framework || 'html']))

  const byCapability = {}
  const byDetectionMethod = {}
  const byWcagCriterion = {}
  const byWcagStatus = {}
  const byActRule = {}
  const byFramework = {}
  const byInteraction = { none: 0, required: 0 }
  const byControl = { 'has-comparison-control': 0, 'no-comparison-control': 0 }
  const atByStatus = {}
  const atByEnvironment = {}
  const reviewDimensions = {
    automatedReproduction: {},
    manualReproduction: {},
    assistiveTechnology: {},
    independentReview: {}
  }

  let defectsWithAssistiveTechnologyTests = 0
  let assistiveTechnologyTests = 0
  let interactionDefects = 0

  for (const defect of registry.defects) {
    for (const capability of defect.affectedCapabilities) increment(byCapability, capability)
    for (const method of defect.detection.expectedMethods) increment(byDetectionMethod, method)
    for (const mapping of defect.wcag) {
      increment(byWcagCriterion, mapping.criterion)
      increment(byWcagStatus, mapping.status)
    }
    for (const mapping of defect.actRules) increment(byActRule, mapping.ruleId)
    increment(byFramework, frameworkByFixture.get(defect.fixtureId) || (defect.service === 'goose' ? 'nunjucks' : 'html'))

    if (defect.interactionSteps.length > 0 || defect.preconditions.length > 0) {
      byInteraction.required += 1
      interactionDefects += 1
    } else {
      byInteraction.none += 1
    }

    const hasComparison = Boolean(defect.controlFixtureId) ||
      defect.relatedElements.some((element) => element.purpose === 'comparison-control')
    increment(byControl, hasComparison ? 'has-comparison-control' : 'no-comparison-control')

    for (const [dimension, value] of Object.entries(defect.reviewStatus.dimensions)) {
      increment(reviewDimensions[dimension], value)
    }

    if (defect.assistiveTechnologyTests.length > 0) {
      defectsWithAssistiveTechnologyTests += 1
      for (const test of defect.assistiveTechnologyTests) {
        assistiveTechnologyTests += 1
        increment(atByStatus, test.status)
        increment(atByEnvironment, `${test.platform} / ${test.browser} / ${test.assistiveTechnology}`)
      }
    }
  }

  const reviewed = registry.defects.filter((defect) => defect.reviewStatus.dimensions.independentReview === 'reviewed')

  return {
    schemaVersion: 'defect-coverage/1',
    source: 'data/known-defects.json',
    note: 'Coverage counts declared defects, not WCAG success criteria achieved. ACT rule coverage is not WCAG coverage, and a clean scan is not a conformance claim.',
    totals: {
      defects: registry.defects.length,
      services: new Set(registry.defects.map((defect) => defect.service)).size,
      categories: new Set(registry.defects.map((defect) => defect.category)).size,
      wcagCriteria: Object.keys(byWcagCriterion).length,
      actRules: Object.keys(byActRule).length,
      capabilities: Object.keys(byCapability).length,
      detectionMethods: Object.keys(byDetectionMethod).length,
      withComparisonControl: registry.defects.filter((defect) =>
        defect.controlFixtureId ||
        defect.relatedElements.some((element) => element.purpose === 'comparison-control')
      ).length,
      interactionDependent: interactionDefects,
      independentlyReviewed: reviewed.length,
      unreviewed: registry.defects.length - reviewed.length,
      assistiveTechnologyTests,
      defectsWithAssistiveTechnologyTests
    },
    byService: registry.counts.byService,
    byCategory: registry.counts.byCategory,
    byClassification: registry.counts.byClassification,
    byReviewLifecycle: registry.counts.byReviewLifecycle,
    byCapability: sorted(byCapability),
    byDetectionMethod: sorted(byDetectionMethod),
    byWcagCriterion: sorted(byWcagCriterion),
    byWcagStatus: sorted(byWcagStatus),
    byActRule: sorted(byActRule),
    byFramework: sorted(byFramework),
    byInteraction,
    byControl: sorted(byControl),
    reviewDimensions,
    assistiveTechnology: {
      tests: assistiveTechnologyTests,
      defects: defectsWithAssistiveTechnologyTests,
      byStatus: sorted(atByStatus),
      byEnvironment: sorted(atByEnvironment)
    }
  }
}
