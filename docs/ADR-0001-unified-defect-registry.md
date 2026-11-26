# ADR-0001: One generated defect registry with authoritative source records

- Status: accepted
- Date: 2026-11-26
- Deciders: repository maintainers
- Supersedes: none

## Context

The repository already had two machine-readable records of intentional defects:

1. `docs/original-goose-issues.json` — 19 preserved defects from the Ministry of Justice
   exercise, with WCAG claims, DOM assertions and detection notes. It is not an ACT
   manifest and most entries do not map to an approved ACT rule.
2. `services/lab/fixtures.json` — 37 ACT fixture cases with identifiers, targets, expected
   outcomes, provenance and review records.

Both are consumed by existing integrations (tests, the published laboratory, Open Scans)
and must not change shape or lose identifiers. But no artefact answered the question
"what defects does this project declare?" for the project as a whole, and new subtle
defects are not ACT cases at all.

Adding a third hand-maintained list would create three places to update, three chances to
drift, and no guarantee that Markdown, HTML and JSON agree.

## Decision

Generate one canonical registry, `data/known-defects.json`, from authoritative source
records:

| Source | Authority for | Kind |
| :--- | :--- | :--- |
| `docs/original-goose-issues.json` | The 19 preserved original defects | imported |
| `services/lab/fixtures.json` | Failed and unsupported ACT cases (21 records) | derived |
| `data/defect-annotations.json` | Curated locators, expected behaviour and impact for imported records; comparison-control links | curated |
| `data/defects/*.json` | Defects that are not ACT cases (12 records at the time of writing) | curated |

Everything else is generated and never hand-edited:

- `data/known-defects.json` — canonical registry (`known-defects/1`)
- `data/defect-coverage.json` — coverage matrices
- `docs/KNOWN-DEFECTS.md` — human-readable answer key
- `docs/DEFECT-COVERAGE.md` — WCAG, ACT, capability, detection and AT coverage
- `dist/defects/index.html` — accessible, filterable catalogue (the answer key)
- `dist/defects/manifest.json` — versioned machine-readable manifest for Open Scans

`npm run defects:check-sync` regenerates the committed files in memory and fails if any
byte differs. CI runs it before the build.

### Identifier rules

- Existing identifiers are preserved verbatim and are never renumbered
  (`html-button-unnamed`, `start-two-h1`).
- The original answer-key number is retained as the alias `answer-key:<n>`.
- New identifiers are lowercase kebab-case slugs that describe the behaviour
  (`focus-lost-after-item-removal`). They are introduced once and never renamed; a rename
  would break external comparisons.
- Every record has one `id`. Aliases exist only to map legacy numbering.

### Field semantics

- `null` means **not recorded**. It is not a value judgement.
- `notApplicable` lists fields that genuinely do not apply (for example `fixtureId` and
  `actRules` for an original-exercise defect). A field listed there must be empty or null,
  and validation enforces that.
- `wcag[].status` distinguishes `claimed` (the project's existing claim), `candidate`,
  `confirmed`, `best-practice`, `disputed` and `informational`. `confirmed` requires a
  recorded independent review.
- `reviewStatus` separates a lifecycle from four dimensions: automated reproduction,
  manual reproduction, assistive technology, and independent review. A record cannot be
  `independently-reviewed` or `assistive-technology-verified` without the matching
  dimension.
- `detection.observed` is only for real engine observations with a date, engine, version and
  result. Curated records may carry a dated observation (for example an axe-core run on
  2026-11-26); imported records carry none until someone records one.

### Schema and validation

- JSON Schema draft 2020-12 subset at `data/schemas/known-defects.schema.json`, versioned
  as `known-defects/1`. A new field or a changed meaning needs a new version.
- Validation is implemented in-repository (`scripts/lib/json-schema.mjs`) so that
  `npm run defects:validate` needs no additional dependency. Unsupported schema keywords
  are rejected rather than ignored, and the three defect test files prove that malformed
  data fails.
- Semantic validation checks identifier uniqueness, source-page existence, fixture
  references, comparison-control references, WCAG/classification coherence, AT claims,
  and the `notApplicable` invariant.

## Consequences

### Positive

- One artefact answers coverage and traceability questions; Markdown, HTML and JSON cannot
  disagree.
- Adding a defect has one obvious place to write and one command to run.
- The original inventory and ACT manifest keep their existing contracts, so current tests
  and Open Scans consumers are unaffected.
- The registry can carry non-ACT defects (focus, status, error recovery, keyboard) without
  pretending they are ACT cases.
- Deterministic output (stable ordering, no timestamps) means generated diffs are reviewable.

### Negative

- Two files are needed to understand one imported record (source plus annotation). The
  registry carries `provenance.derivedFrom` so this is visible in every entry.
- The in-repository schema validator is less complete than a full implementation. The
  supported keyword list is explicit and tested; a future migration to a standard library
  is possible without changing the schema.
- Generated Markdown is long (about 1,000 lines). It is intended for review and diffing,
  not for reading end to end.

## Alternatives rejected

1. **Hand-maintain `data/known-defects.json`.** Simple at first, but duplicates the two
   authoritative sources and would drift immediately.
2. **Move the original inventory into the registry and delete the old file.** Breaks the
   preservation boundary and existing tests that assert the inventory's own schema.
3. **Convert new defects into ACT fixture cases.** Most are not ACT cases; using the ACT
   manifest would imply rule mappings that were not reviewed.
4. **Add `ajv` for validation.** Adds a dependency and a lockfile change for a schema
   subset this repository controls. The in-repository validator is tested and sufficient.
5. **Generate documentation only at build time and not commit it.** Reviewers and
   consumers would have no stable diff and no offline answer key.
