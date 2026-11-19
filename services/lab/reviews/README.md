# Fixture reviews

Each fixture has a review record under `records/`. The record connects the
fixture's expected outcome to the evidence that supports it.

## Status values

| Status | Meaning |
|---|---|
| `unreviewed` | The DOM condition is verified by repository tests, but no independent outcome review has been recorded |
| `reviewed` | A person reviewed the case and supplied methods, evidence, reviewer and date |
| `disputed` | A review exists but its conclusion is contested; keep the rationale and do not overwrite the earlier evidence |

A record with `status: "reviewed"` must have:

- `reviewedAt` — ISO 8601 date-time;
- `reviewer` — an identifier (name or handle);
- `methods` — at least one method, for example `keyboard`, `screen reader`, `source inspection`, `manual ACT rule review`;
- `evidence` — at least one reference: a path, URL, screenshot or observation log.

Repository tests and fixture-integrity assertions are useful evidence that the
DOM condition exists. They are **not** proof that a person experienced a
particular barrier, and they do not by themselves establish an ACT outcome.

## Governance

- Anyone may submit a review record with evidence.
- A review must state the method, the observation and the limitation.
- Reviewers must not change an expected outcome to make a test pass.
- If a review changes an expected outcome, record the change in the record and
  in the fixture history. Previous scan comparisons become incomparable; say so.
- Conflicting reviews are kept as `disputed` records with both positions.
- Reviewed status is never inferred from an automated test result.

## Conflicts and comparability

Changing an expected outcome changes the meaning of any earlier comparison that
used the old outcome. Retain the old value in the record's rationale or in a
linked changelog rather than silently rewriting history.

## Machine-readable index

The build publishes:

- `/lab/reviews/index.json` — all records with status and expected outcome;
- `/lab/reviews/records/<fixture-id>.json` — the individual records;
- `/lab/reviews/schema.json` — the JSON Schema above.
