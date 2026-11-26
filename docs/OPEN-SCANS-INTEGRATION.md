# Open Scans integration

Open Scans and this repository have different jobs. Keeping them separate is what makes a
comparison between engines meaningful.

## Responsibility boundary

| This repository owns | Open Scans owns |
| :--- | :--- |
| Fixtures and fictional services | Multi-engine execution |
| Declared intentional defects | ACT rule execution and mapping |
| Stable defect identifiers | Automated interaction execution |
| Reference expectations (hypotheses) | Observed findings |
| Reproduction procedures | Cross-engine comparison and deduplication |
| Element locators and contexts | Historical scan results |
| Reviewed evidence | Benchmark comparisons |
| Comparison controls | Trend reporting |

This repository must not grow a second multi-engine scanning stack. Open Scans must not
become a prerequisite for building or using this project.

## Published manifest

`npm run build` publishes:

- `/defects/manifest.json` — `known-defects-published/1`
- `/defects/index.html` — the answer-key catalogue
- `/lab/fixtures.json` — the existing ACT manifest, unchanged
- `/lab/provenance.json`, `/lab/reviews/index.json`, `/lab/reviews/records/*.json`

The defect manifest is generated from `data/known-defects.json` and carries the registry
version, the site URL, source digests, counts and the full defect list.

```json
{
  "schemaVersion": "known-defects-published/1",
  "registryVersion": "known-defects/1",
  "siteUrl": "https://mgifford.github.io/record-a-goose-sighting/",
  "sources": [{ "path": "...", "kind": "...", "sha256": "..." }],
  "counts": { "defects": 52, "byService": { "...": 1 } },
  "defects": [
    {
      "id": "focus-lost-after-item-removal",
      "url": "lab/subtle/focus-removal/",
      "locators": [{ "type": "css", "value": "#remove-a-2", "phase": "before" }],
      "interactionSteps": [{ "action": "focus", "selector": "#remove-a-2" }],
      "reviewStatus": { "lifecycle": "reproduced-automatically", "dimensions": { "...": "..." } }
    }
  ]
}
```

## What a consumer can decide from the manifest

- **Static scan target:** a record with no `interactionSteps`, no `environment` and only
  light-DOM locators.
- **Interaction-dependent target:** `interactionSteps` is non-empty. Execute the steps before
  evaluating.
- **Environmental target:** `environment` sets a viewport, colour scheme, forced colours or
  reduced motion.
- **Manual-only procedure:** `manualTests` is non-empty and `detection.expectedMethods`
  contains only manual or assistive-technology methods.
- **Assistive-technology procedure:** `assistiveTechnologyTests` is non-empty. Status
  `not-run` means no observation exists.
- **Review requirement:** `reviewStatus.dimensions.independentReview` distinguishes reviewed
  from unreviewed expectations.

## Compatibility rules

- Do not remove or rename a defect identifier. Deprecate it with
  `reviewStatus.lifecycle: "deprecated"`.
- Changing an expected outcome invalidates earlier comparisons. Say so in the record and in
  the release notes.
- A new required field needs a new `schemaVersion`.
- The manifest is deterministic; `sources[].sha256` lets a consumer detect fixture churn.
- The registry never contains observed engine results. Those belong in Open Scans. The
  `detection.observed` array exists for contributors who record an observation, but the
  generated registry ships none.

## Blind evaluation

The answer key is public. Secrecy cannot come from hiding URLs; it comes from controlling
what an evaluator receives.

A blind runner should be given only:

- target URLs;
- a general task description;
- permitted browser environments and interaction constraints.

It should **not** receive: `data/known-defects.json`, `docs/KNOWN-DEFECTS.md`, the
`/defects/` catalogue, review records, or fixture page source comments. The comparison
step reads the registry separately, after findings are captured.

Comparing results:

1. Run the evaluator without the answer key and capture findings.
2. Resolve each reported element to a locator.
3. Match findings to registry defects by element and context, not by title.
4. Treat unmatched findings as **unexpected**, not automatically false positives. They may
   be undocumented defects or genuine false positives.
5. Do not calculate specificity or false-positive rates without a negative comparison
   population, and do not infer WCAG coverage from fixture counts.

## Version history

| Version | Change |
| :--- | :--- |
| `known-defects/1` | Initial generated registry: imported Goose defects, derived ACT failures, curated subtle defects. |
