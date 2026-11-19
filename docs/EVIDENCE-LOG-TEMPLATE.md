# Evidence log template

Copy this table into the worksheet, a document, or an issue. One row per
observation. Keep the observation factual and reproducible.

| # | Page | Issue | Method | What I did | What happened | Who it affects | WCAG status | Priority |
| ---: | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Start | Related-link focus | Keyboard | Tabbed through the links on the right | The order was Wikipedia → More → RSPB while the screen showed Wikipedia → RSPB → More; focus was not visible on any of them | Keyboard and magnifier users can lose their place | Not a WCAG 2.1 AA failure for order alone; focus visibility relates to 2.4.7 | High |
| 2 | Do you like geese? | Continue button | Keyboard | Tabbed from the radios | Continue was never focused; Enter on a radio submitted the form | Keyboard users may feel trapped or assume the page is broken | 2.1.1 | High |
| 3 | Confirmation | GIF | Screen reader | Listened to the page | The image announced its file path; no description was available | Screen reader users miss the only celebratory content | 1.1.1 | Medium |

## Method names

Use one of:

- `Automated` — Accessibility Insights Fast Pass, axe, Lighthouse or another scanner
- `Keyboard`
- `Screen reader` — name the screen reader and browser
- `Zoom` / `Reflow`
- `Magnifier`
- `Forced colours`
- `Reduced motion`
- `Content review`
- `Cognitive walkthrough`

## Status language

Use the status recorded in
[original-goose-issues.json](original-goose-issues.json):

- `failure` — a WCAG 2.1 AA failure (state the criterion);
- `best-practice` — useful to fix, but not a conformance failure;
- `manual-concern` — a judgement about usability or context.

Do not label every finding a WCAG failure. If you are unsure, say so and keep
the observation.

## Laboratory fixtures

For a fixture from `/lab/`, add these columns or fields:

| Fixture ID | Scenario | State | Classification | Target | Method | Expected observation | Actual observation | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `correlation-single-image` | `single-image` | default | ACT failed | `#missing-alt` | Screen reader | The image has no announced name | Replace with what you observed | Link to a log, screenshot or recording |

Use the classification labels from
[MANUAL-LAB-SCRIPTS.md](MANUAL-LAB-SCRIPTS.md): ACT outcome, verified WCAG
failure, best practice, usability, context-dependent, or needs more testing.
Record an ACT outcome separately from a WCAG verdict.

The machine-readable record format is
[`services/lab/reviews/schema.json`](../services/lab/reviews/schema.json).

## Reporting

- Lead with the barrier and its impact, then the criterion.
- One observation per row; do not merge unrelated problems.
- Link the page and, where possible, the element.
- Record the browser, viewport and assistive technology versions.
- A missing automated finding is not a pass.
