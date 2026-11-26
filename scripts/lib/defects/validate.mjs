/**
 * Semantic validation for the known-defect registry.
 *
 * Schema validation proves the shape. These checks prove the registry is
 * internally consistent and that every reference resolves inside this
 * repository, so a broken locator or a stale fixture identifier fails the
 * build rather than producing plausible-looking documentation.
 */
import fs from 'node:fs'
import path from 'node:path'

import { validateAgainstSchema } from '../json-schema.mjs'
import {
  CAPABILITIES,
  DETECTION_METHODS,
  FIXTURE_MANIFEST,
  SCHEMA_PATH,
  readJson
} from './registry.mjs'

const LOCATOR_VALUE_TYPES = new Set(['css', 'xpath', 'absolute-xpath', 'id', 'text', 'dom-fingerprint'])

function sourcePageExists (root, defect) {
  const pathname = defect.url.split('?')[0].split('#')[0]
  if (pathname === '') return true

  if (defect.service === 'goose') {
    const relative = pathname.replace(/\/$/, '.html')
    return fs.existsSync(path.join(root, 'app/views', relative))
  }

  return fs.existsSync(path.join(root, 'services', pathname, 'index.html'))
}

function isEmptyValue (value) {
  if (value === null || value === undefined) return true
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

export function validateRegistry (registry, root, { manifest } = {}) {
  const errors = []
  const schema = readJson(root, SCHEMA_PATH)

  errors.push(...validateAgainstSchema(schema, registry).map((error) => `schema: ${error}`))

  const loadedManifest = manifest ?? readJson(root, FIXTURE_MANIFEST)
  const fixtureIds = new Set(loadedManifest.cases.map((entry) => entry.id))
  const registryIds = new Set()
  const aliasOwners = new Map()

  for (const [index, defect] of registry.defects.entries()) {
    const where = `defects[${index}] (${defect.id || 'missing id'})`

    if (registryIds.has(defect.id)) errors.push(`${where}: duplicate id`)
    registryIds.add(defect.id)

    for (const alias of defect.aliases || []) {
      if (aliasOwners.has(alias)) {
        errors.push(`${where}: alias "${alias}" is already used by ${aliasOwners.get(alias)}`)
      }
      aliasOwners.set(alias, defect.id)
    }

    if (defect.fixtureId !== null && !fixtureIds.has(defect.fixtureId)) {
      errors.push(`${where}: fixtureId "${defect.fixtureId}" is not in the fixture manifest`)
    }

    if (!sourcePageExists(root, defect)) {
      errors.push(`${where}: url "${defect.url}" does not resolve to a source page`)
    }

    if (defect.fragment !== null && !defect.url.endsWith('/') && !defect.url.includes('/')) {
      errors.push(`${where}: fragment requires a page URL`)
    }

    if (!defect.locators.some((locator) => locator.type !== 'document-scope')) {
      if (defect.classification !== 'exploratory') {
        errors.push(`${where}: a non-exploratory defect needs at least one resolvable locator`)
      }
    }

    for (const [locatorIndex, locator] of defect.locators.entries()) {
      if (LOCATOR_VALUE_TYPES.has(locator.type) && (typeof locator.value !== 'string' || locator.value.trim() === '')) {
        errors.push(`${where}: locators[${locatorIndex}] (${locator.type}) needs a value`)
      }
      if (locator.type === 'role' && !locator.role) {
        errors.push(`${where}: locators[${locatorIndex}] (role) needs a role`)
      }
    }

    const seenCriteria = new Set()
    for (const mapping of defect.wcag) {
      if (seenCriteria.has(mapping.criterion)) {
        errors.push(`${where}: duplicate WCAG criterion ${mapping.criterion}`)
      }
      seenCriteria.add(mapping.criterion)

      if (mapping.status === 'confirmed' && defect.reviewStatus.dimensions.independentReview !== 'reviewed') {
        errors.push(`${where}: WCAG ${mapping.criterion} is confirmed but no independent review is recorded`)
      }
    }

    if (defect.classification === 'wcag-failure' && defect.wcag.length === 0) {
      errors.push(`${where}: a WCAG failure needs at least one WCAG mapping`)
    }

    for (const method of defect.detection.expectedMethods) {
      if (!DETECTION_METHODS.includes(method)) errors.push(`${where}: unknown detection method ${method}`)
    }

    for (const capability of defect.affectedCapabilities) {
      if (!CAPABILITIES.includes(capability)) errors.push(`${where}: unknown capability ${capability}`)
    }

    const properties = schema.$defs.defect.properties
    for (const field of defect.notApplicable) {
      if (!(field in properties)) {
        errors.push(`${where}: notApplicable names unknown field "${field}"`)
      } else if (!isEmptyValue(defect[field])) {
        errors.push(`${where}: field "${field}" is listed as not applicable but has a value`)
      }
    }

    if (defect.reviewStatus.lifecycle === 'independently-reviewed' &&
        defect.reviewStatus.dimensions.independentReview !== 'reviewed') {
      errors.push(`${where}: independently-reviewed lifecycle needs an independentReview dimension`)
    }

    if (defect.reviewStatus.lifecycle === 'assistive-technology-verified' &&
        defect.reviewStatus.dimensions.assistiveTechnology !== 'verified') {
      errors.push(`${where}: AT-verified lifecycle needs a verified assistiveTechnology dimension`)
    }

    for (const test of defect.assistiveTechnologyTests) {
      if (test.status === 'verified' && !test.evidence) {
        errors.push(`${where}: an assistive-technology test marked verified needs evidence`)
      }
    }

    for (const source of defect.sources) {
      if (!/^https?:\/\//.test(source.url)) errors.push(`${where}: source URL must be absolute: ${source.url}`)
    }

    if (defect.service === 'goose' && defect.actRules.length > 0) {
      errors.push(`${where}: goose defects are not ACT cases; use an ACT fixture instead`)
    }
  }

  // Every failed or unsupported ACT fixture must appear in the registry.
  for (const entry of loadedManifest.cases) {
    if (entry.expected === 'failed' || entry.execution === 'unsupported') {
      if (!registryIds.has(entry.id)) errors.push(`missing registry record for ACT fixture ${entry.id}`)
    }
  }

  // Controls may be registry defects or passing fixture cases.
  for (const defect of registry.defects) {
    if (defect.controlFixtureId === null) continue
    if (!registryIds.has(defect.controlFixtureId) && !fixtureIds.has(defect.controlFixtureId)) {
      errors.push(`${defect.id}: controlFixtureId "${defect.controlFixtureId}" does not resolve`)
    }
  }

  for (const [field, counts] of Object.entries(registry.counts)) {
    if (field === 'defects') continue
    for (const [key, value] of Object.entries(counts)) {
      if (value < 1) errors.push(`counts.${field}.${key}: must be a positive integer`)
    }
  }

  return errors
}
