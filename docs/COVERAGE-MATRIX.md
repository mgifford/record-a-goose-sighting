# Coverage matrix

This matrix describes what the laboratory currently covers. It is not a claim
of WCAG or ACT completeness.

Generated counts are in `/lab/coverage.json`; the human-readable catalogue is
`/lab/catalogue/`. The source of truth remains `services/lab/fixtures.json`.

## Current fixture coverage

| Dimension | Coverage |
|---|---|
| Fixtures | 37 |
| ACT rules | 5 (all approved) |
| Passed | 14 |
| Failed | 20 |
| Inapplicable | 2 |
| No outcome (closed-shadow exploratory) | 1 |
| Reviewed | 0 |
| Unreviewed | 37 |

### By ACT rule

| Rule | Name | Cases | Outcomes |
|---|---|---:|---|
| `97a4e1` | Button has non-empty accessible name | 21 | passed, failed, inapplicable |
| `674b10` | Role attribute has valid value | 7 | passed, failed, no outcome (closed shadow) |
| `23a2a8` | Image has non-empty accessible name | 5 | passed, failed, inapplicable |
| `c487ae` | Link has non-empty accessible name | 2 | passed, failed |
| `e086e5` | Form field has non-empty accessible name | 2 | passed, failed |

### By dimension

| Dimension | Values represented |
|---|---|
| Source technology | HTML (30), React (2), Vue (2), Web Components (3) |
| DOM context | Light DOM (31), open shadow (3), closed shadow (1), document (2), iframe (4 fixture cases) |
| Interaction | Static (35), action required (2) |
| Target complexity | One target, several targets at one URL, two rules on one target, repeated targets |
| Review status | Unreviewed (37) |
| Manual relevance | Automated ACT rule, manual-only interpretation, preference rendering |

## ACT outcome categories

The normative example outcomes are `passed`, `failed` and `inapplicable`.

- **Passed** — an applicable target meets the rule expectation.
- **Failed** — an applicable target does not meet it.
- **Inapplicable** — the test subject has no applicable target. This is not the
  same as a scanner that did not run.
- **Cannot tell** — a review result that is explicitly inconclusive; it is not a
  fixture outcome category.
- **Untested** — no outcome has been established. It is missing evaluation, not
  a pass.

The laboratory currently has two inapplicable fixtures (`97a4e1` and `23a2a8`)
and no cannot-tell fixture. A closed-shadow case remains exploratory and has no
expected ACT outcome.

## Preference scenarios

`/lab/preferences/` contains reduced-motion, forced-colours and text-spacing
pages. They are manual rendering comparisons, not ACT fixtures. They do not
establish WCAG 2.2.2, 1.4.3 or 1.4.10 conformance on their own.

## Keeping this current

1. Add or change a case in `services/lab/fixtures.json`.
2. Run `npm run build`; this regenerates `coverage.json`, `catalogue.json` and
   the catalogue page.
3. Update this document deliberately when the counts or coverage claims change.
4. Do not turn fixture counts into a claim about tool accuracy or WCAG
   conformance.
