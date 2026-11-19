# Original Goose baseline

This document records the state of the original Express application before the
static migration. It is the reference for the preservation work in
[`baseline/`](../baseline/README.md) and
[`docs/original-goose-issues.json`](original-goose-issues.json).

## Provenance

| Item | Value |
|---|---|
| Repository | `mgifford/record-a-goose-sighting` |
| Commit | `3f23c97` (tip of `master` before the migration) |
| Captured | 18 November 2026 |
| Browser | Chromium 159 via Playwright 1.65 |
| Accessibility engine | axe-core 4.14.1, tags `wcag2a, wcag2aa, wcag21a, wcag21aa, best-practice` |
| Viewports | 1280 × 720 and 375 × 667 |
| Artifacts | `baseline/metrics.json`, `baseline/html/`, `baseline/screenshots/` |

The application was run from a pristine checkout of that commit. The only
toolchain substitution was the Sass compiler: `node-sass` 4 has no binary for a
supported Node.js release, so the unchanged `unbranded.scss` was compiled with
dart-sass. The resulting screenshots and computed styles were byte-identical to
the migrated build, so the substitution did not affect rendering.

## Routes

```text
/
/steps/start/
/steps/geese-liked/
/steps/goose-type/
/steps/date-saw-goose/
/steps/check-your-answers/
/steps/end/
/steps/worksheet/
/steps/answers/
```

## What the baseline records

For every route: page title, DOM order and visual order of related links, all
links (text, href, target), forms (action, method, fields, labels, legends),
images and `alt` attributes, every `tabindex`, computed styles for the elements
that carry the deliberate problems (including focus styles), the full keyboard
focus sequence, axe violations, failed requests and console errors.

Screenshots exist at desktop and mobile widths. The capture and comparison
tools are `tests/tools/capture.mjs` and `tests/tools/compare.mjs`.

## Intentional problems

`docs/original-goose-issues.json` enumerates the 18 issues described by the
answer key, with:

- the answer-key position (1–18), route and short title;
- WCAG criteria and whether the item is a failure, a best practice, or a
  manual concern (several are explicitly not WCAG 2.1 AA failures);
- the evidence type (DOM, computed style, keyboard, axe, manual);
- the regression test that guards it;
- the baseline artifact for that page.

They are kept separate from the ACT fixtures. Most of these problems have no
approved ACT rule, and mapping them to one just because they are accessibility
defects would be incorrect.

## Accidental problems in the original

These were present in the original application but are **not** part of the
answer key. They are recorded so that they are not confused with teaching
material:

- Stray closing tags (`</p>` in `steps/start.html`, `</p></p>` in
  `steps/end.html`).
- `role="button"` on two anchors, which promises Space-key activation that a
  link does not provide.
- No Back link on four of the six step pages, and no service header, because the
  step pages deliberately use the unbranded layout.
- The confirmation GIF was 352 px wide with no `max-width`, so the page scrolled
  horizontally below roughly 368 px.
- A `mask-icon` link pointed at a file that did not exist.

The static migration preserved the first four behaviours. The missing mask icon
was pointed at the icon that is actually shipped; this has no visual effect.

## The 19-versus-18 discrepancy

The answer key says "19 issues in total" and describes 18. Commit `66a64cb`
removed the nineteenth entry (*`Role="button"` missing on link to next page*)
when the attribute was added to the start link, but the total was not updated.
The page now says "19 issues in total (likely 18)" so learners are not misled.
No nineteenth defect has been invented. See
[`baseline/README.md`](../baseline/README.md) for the git history.

## Preservation guarantees

- `tests/accessibility-regression.spec.js` asserts every intentional problem
  and compares axe results with the recorded baseline.
- `scripts/merge-lab.mjs` refuses to publish if any pre-existing Goose file
  changes when the laboratory is merged.
- `tests/services.spec.js` checks that `/` remains the Goose instructions page
  and that the lab catalogue is additive.

## Recapturing

The original application is not in the working tree. If a recapture is ever
needed, use the git worktree instructions in
[`baseline/README.md`](../baseline/README.md); they also explain the Sass
substitution and the exact capture command.
