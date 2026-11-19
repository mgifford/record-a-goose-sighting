import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import { test, expect } from '@playwright/test'

const ROOT = path.resolve(import.meta.dirname, '..')
const DIST = path.join(ROOT, 'dist')

function sha256 (buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

async function json (request, url) {
  const response = await request.get(url)
  expect(response.status(), url).toBe(200)
  return response.json()
}

test.describe('fixture provenance', () => {
  test('publishes a deterministic provenance document', async ({ request }) => {
    const provenance = await json(request, 'lab/provenance.json')
    const manifest = await json(request, 'lab/fixtures.json')

    expect(provenance.schemaVersion).toBe('act-lab-provenance/1')
    expect(provenance.repositoryCommit === null || /^[a-f0-9]{40}$/.test(provenance.repositoryCommit)).toBe(true)
    expect(provenance.manifest.sha256).toMatch(/^[a-f0-9]{64}$/)
    expect(provenance.build.node).toMatch(/^v\d+/)
    expect(provenance.upstreamAct?.snapshotSha256).toMatch(/^[a-f0-9]{64}$/)
    expect(provenance.fixtures).toHaveLength(manifest.cases.length)
    expect(provenance.aggregateFingerprint).toMatch(/^[a-f0-9]{64}$/)

    const expectedAggregate = sha256(JSON.stringify(
      provenance.fixtures
        .map(({ id, contentFingerprint }) => ({ id, contentFingerprint }))
        .sort((first, second) => first.id.localeCompare(second.id))
    ))
    expect(provenance.aggregateFingerprint).toBe(expectedAggregate)
  })

  test('fingerprints match the rendered files and their direct assets', async ({ request }) => {
    const provenance = await json(request, 'lab/provenance.json')
    const manifest = await json(request, 'lab/fixtures.json')

    for (const entry of manifest.cases) {
      const pagePath = path.join(DIST, entry.urlPath.split('?')[0], 'index.html')
      const html = fs.readFileSync(pagePath)

      expect(entry.provenance.renderedHtmlHash, entry.id).toBe(sha256(html))

      const assets = entry.provenance.assets.map(({ path: assetPath }) => assetPath)
      expect(new Set(assets).size, entry.id).toBe(assets.length)

      for (const asset of entry.provenance.assets) {
        expect(asset.sha256, `${entry.id} ${asset.path}`).toBe(
          sha256(fs.readFileSync(path.join(DIST, asset.path)))
        )
      }

      const fingerprint = sha256(JSON.stringify({
        renderedHtmlHash: entry.provenance.renderedHtmlHash,
        assets: entry.provenance.assets
      }))
      expect(entry.provenance.contentFingerprint, entry.id).toBe(fingerprint)

      const provenanceEntry = provenance.fixtures.find((fixture) => fixture.id === entry.id)
      expect(provenanceEntry.contentFingerprint).toBe(entry.provenance.contentFingerprint)
    }
  })

  test('keeps provenance out of the source manifest', async () => {
    const source = JSON.parse(fs.readFileSync(path.join(ROOT, 'services/lab/fixtures.json'), 'utf8'))
    expect(source.cases.every((entry) => entry.provenance.contentFingerprint === undefined)).toBe(true)
    expect(source.cases.every((entry) => entry.reviewRecord.startsWith('lab/reviews/records/'))).toBe(true)
  })
})

test.describe('fixture reviews', () => {
  test('publishes an index and a record for every fixture', async ({ request }) => {
    const index = await json(request, 'lab/reviews/index.json')
    const manifest = await json(request, 'lab/fixtures.json')

    expect(index.schemaVersion).toBe('fixture-review-index/1')
    expect(index.records).toHaveLength(manifest.cases.length)

    const ids = new Set(index.records.map((record) => record.fixtureId))
    expect(ids.size).toBe(manifest.cases.length)

    for (const record of index.records) {
      expect(record.status).toBe('unreviewed')
      expect(record.expectedOutcome).toBe(
        manifest.cases.find((entry) => entry.id === record.fixtureId).expected
      )

      const response = await request.get(record.path)
      expect(response.status(), record.path).toBe(200)
      const body = await response.json()
      expect(body.fixtureId).toBe(record.fixtureId)
      expect(body.reviewedAt).toBeNull()
      expect(body.reviewer).toBeNull()
      expect(body.methods).toEqual([])
      expect(body.evidence).toEqual([])
    }
  })

  test('publishes the review schema', async ({ request }) => {
    const response = await request.get('lab/reviews/schema.json')
    expect(response.status()).toBe(200)
    const schema = await response.json()
    expect(schema.properties.status.enum).toEqual(['unreviewed', 'reviewed', 'disputed'])
  })
})
