# Fixture contract and correlation experiments

This document records the fixture-contract audit (PR 1) and the correlation
fixtures added to the laboratory (PR 2). It is the handoff for Open Scans and
for anyone authoring fixtures.

## Existing implementation

- `services/lab/fixtures.json` is the source manifest, published by
  `scripts/lab-manifest.mjs` as `/lab/fixtures.json`.
- The published contract remains **`act-lab-fixture/2`**. New fields are
  additive and optional, so existing consumers keep working.
- Each case declares an ACT rule, expected outcome, review status, target scope,
  selector or shadow host, readiness selector and source provenance.
- `scripts/act-upstream.mjs` pins the W3C ACT test-case metadata separately.
- `scripts/merge-lab.mjs` verifies that the Goose output is byte-identical
  after the laboratory is merged.
- Playwright suites verify the Goose defects, the laboratory services, the
  manifest and the interpretation page.

## Boundary with Open Scans

| Record a Goose owns | Open Scans owns |
|---|---|
| Fixture truth and expected outcomes | Engine execution and versions |
| Stable IDs, scenarios and target identity | ACT-to-engine rule mappings |
| DOM conditions and readiness | Location resolution and correlation |
| Review status and manual evidence | Duplicate detection and comparisons |
| Fixture provenance and change history | Historical observations and reports |

No engine names or predicted detection results appear in the manifest.

## Identity model

| Identity | Field | Notes |
|---|---|---|
| Fixture | `id` | Unique across the manifest |
| Scenario | `scenarioId` | Shared by cases that belong to one experiment |
| Target | `target.targetId` | Stable within a scenario/page |
| Rule | `act.ruleId` | Six-character W3C ACT rule |
| Page | `urlPath` | Relative to the laboratory site root |
| State | `stateId`, `urlPath` query + `readySelector` | Deterministic; no session inheritance |
| Frame | `target.frame` | Ordered list of relative frame documents |
| Shadow path | `target.hostPath` | Ordered host selectors for nested shadow roots |
| Interaction | `interaction.action` + `selector` | Optional action required before the target state |

Several cases may share a URL, a scenario and even a target. That is
intentional: one element can fail two different ACT rules.

The validator rejects conflicting definitions for the same
`urlPath + targetId`. It does not claim that a CSS selector resolves uniquely in
the DOM; the Playwright tests for each scenario assert target resolution.

## Correlation fixtures

| Route | Scenario | Cases | Purpose |
|---|---|---|---|
| `/lab/correlation/two-images/` | `two-distinct-images` | 3 | Two failing images with the same class, plus a passing control |
| `/lab/correlation/single-image/` | `single-image` | 1 | One failing image, the simplest shared-target case |
| `/lab/correlation/multiple-rules-one-target/` | `single-target-two-rules` | 2 | One button failing both 97a4e1 and 674b10 |
| `/lab/correlation/repeated-controls/` | `repeated-controls` | 5 | Three equivalent failures and two passing controls |
| `/lab/frames/single-frame/` | `single-frame` | 1 | Unnamed button in one same-origin frame |
| `/lab/frames/nested-frame/` | `nested-frame` | 1 | Unnamed button two browsing contexts deep |
| `/lab/frames/two-frames/` | `two-frames` | 2 | Same `#target` selector in two different frames |
| `/hedgehog/?state=async` | `react-async` | 1 | Accessible name supplied after mount |
| `/hedgehog/?state=replaced` | `react-replaced` | 1 | Target node replaced, with an explicit action |
| `/wombat/?state=async` | `vue-async` | 1 | Reactive accessible name after mount |
| `/paca/?role=valid&shadow=nested` | `paca-nested-open` | 1 | Target inside a shadow root inside a shadow root |
| `/lab/interaction/reveal-target/` | `reveal-target` | 1 | Target absent until a disclosure opens |

Every target has a stable `targetId`. The two-image cases share a class and
differ in `id` and image resource. The repeated controls share a class and
differ only by `id` and accessible name. The frame cases deliberately reuse
`#target` in different browsing contexts, so the frame path is part of the
target identity. The nested-shadow case uses `hostPath` rather than a single
host selector.

The fixtures do **not** predict how many findings an engine will produce. They
declare the targets and outcomes that a scanner must resolve.

## Provenance

The build adds deterministic per-case provenance to the published manifest:

- `contentHash` — source HTML;
- `renderedHtmlHash` — published page HTML;
- `assets` — SHA-256 for each directly referenced local script, stylesheet and image;
- `contentFingerprint` — SHA-256 of the rendered HTML hash plus the sorted asset hashes.

The repository commit, manifest checksum, Node and Vite versions and the
upstream ACT snapshot checksum are published separately at
`/lab/provenance.json`. Build metadata is not mixed into the content
fingerprint, and no timestamps are hashed.

A fingerprint changes when a fixture's rendered HTML, a frame document, or a
directly referenced asset changes. It does **not** yet follow transitive
dependencies (for example an image referenced from CSS). That limitation is
documented rather than guessed at.

## Reviews

Every fixture has a record under `services/lab/reviews/records/`. The build
publishes the records, a schema and an index at `/lab/reviews/`.

- `unreviewed` records must not name a reviewer or a review date.
- `reviewed` records require a reviewer, an ISO date, at least one method and at
  least one evidence reference.
- `disputed` records require a rationale and are kept visible.

The rules are enforced by `scripts/lab-manifest.mjs`; a reviewed status cannot
be created by adding a field alone. See
[`services/lab/reviews/README.md`](../services/lab/reviews/README.md).

## Validation

`npm run build` runs `scripts/lab-manifest.mjs`, which checks:

- schema version and unique fixture IDs;
- ACT rule IDs, statuses, revisions and canonical URLs;
- expected outcomes and review states;
- target scopes and selectors;
- conflicting `urlPath + targetId` definitions;
- readiness selectors;
- relative URLs and source files;
- optional `category`, `scenarioId` and `targetId` formats.

The published manifest adds a SHA-256 of each case's source file. Playwright
tests independently inspect the rendered targets; a manifest claim alone does
not make a test pass.

## Compatibility and future schema

`act-lab-fixture/2` remains the published contract. The new fields are optional
and additive:

```json
{
  "category": "target-correlation",
  "scenarioId": "two-distinct-images",
  "target": { "scope": "light-dom", "selector": "#missing-alt-a", "targetId": "missing-alt-a" }
}
```

A future `act-lab-fixture/3` should only be introduced if a breaking change is
unavoidable. In that case:

1. document the migration;
2. keep a v2 export until Open Scans has migrated;
3. update the validator, published outputs, tests and consumer docs together.

## Known limitations

- All expectations are `unreviewed`; they are hypotheses until a person records
  evidence.
- The validator cannot prove selector uniqueness in the DOM; targeted
  Playwright tests do.
- Closed-shadow expectations remain separate from engine capability claims.
  Open Scans decides whether an engine can inspect a closed root.
- Content fingerprints cover the rendered HTML and directly referenced assets,
  not transitive CSS dependencies or the full framework bundle graph.
- No fixture has been independently reviewed; every record is `unreviewed`.
- These fixtures are same-origin, static GitHub Pages resources. No server,
  database or scanner dependency is introduced.
