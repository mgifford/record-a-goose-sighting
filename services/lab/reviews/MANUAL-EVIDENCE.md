# Recording manual evidence

This page explains how to turn a manual test into a review record. It does not
contain test results.

## Format

Use the JSON shape in [`schema.json`](schema.json). The minimum fields are:

```json
{
  "schemaVersion": "fixture-review/1",
  "fixtureId": "correlation-single-image",
  "scenarioId": "single-image",
  "status": "reviewed",
  "expectedOutcome": "failed",
  "reviewedAt": "2026-11-19T14:00:00.000Z",
  "reviewer": "reviewer-handle",
  "methods": ["screen reader", "source inspection"],
  "evidence": ["https://example.org/evidence/fixture-review-001"],
  "limitations": ["Single browser and screen reader pair."]
}
```

Every `evidence` entry must point at something a second person can inspect:
a committed log, screenshot, recording, transcript or issue comment. A
description alone is not evidence.

## What counts as evidence

| Method | What to record |
|---|---|
| Keyboard | the sequence of keys, focus location and visible indicator at each step |
| Screen reader | the screen reader and browser, announced name/role/state, and the exact navigation method |
| Accessibility inspector | the computed role, name, description and relevant attributes |
| Source inspection | the element and attribute, plus the rendered target path |
| Visual review | the viewport, zoom, preferences and what was observed |

Automated fixture-integrity tests can support a review. They do not replace the
manual observation.

## Before marking reviewed

- Reproduce the case from a clean browser context.
- Record the exact URL and state.
- Record the classification: ACT outcome, verified WCAG failure, best practice,
  usability, context-dependent, or needs more testing.
- Do not change the expected outcome to make a test pass.
- If the outcome changes, note the old value and say that earlier comparisons
  are no longer comparable.

## Disputed outcomes

Keep both positions in the record, set `status` to `disputed`, and provide a
`rationale`. Do not overwrite an earlier review.
