# Baseline audit

Recorded before the defect registry and the subtractive comparison fixtures were added.
This document is the Phase 0 baseline: what existed, which defects were already declared,
what evidence supported them, and which capabilities were missing.

- Audit date: 2026-11-26
- Repository: `mgifford/record-a-goose-sighting` at `fd3da8e` (master, clean tree)
- Environment: macOS, Node 22.20.0, npm 11.18.0, Playwright 1.65.1, Chromium (bundled)
- Commands: `npm ci`, `npm run build`, `npm run test:ci`

## What the repository already contained

| Area | Baseline |
| :--- | :--- |
| Original exercise | 9 Nunjucks pages built by `scripts/build.mjs`, including the six-step Goose journey |
| Original defect inventory | `docs/original-goose-issues.json`: 19 issues, each with an answer-key number, WCAG claim, DOM assertion and stated test |
| WCAG claim mix | 11 failures, 7 best-practice notes, 1 manual concern |
| Controlled laboratory | 37 ACT fixture cases across 5 approved ACT rules and 27 scenarios |
| Fixture outcomes | 14 passed, 20 failed, 2 inapplicable, 1 unsupported (closed shadow root) |
| Frameworks | 30 HTML, 2 React, 2 Vue, 3 Web Components |
| DOM contexts | light DOM, open and closed shadow roots, single and nested iframes, dynamic states, interaction-dependent targets |
| Upstream ACT snapshot | 1,211 W3C test cases across 87 rules, checksummed in `services/lab/upstream/metadata.json` |
| Review records | 37 fixture review records, all `unreviewed`, with schema and governance rules |
| Publication pipeline | Vite laboratory build merged into the Goose `dist/`; merge verifies every pre-existing file is byte-identical |
| Existing tests | 20 Playwright spec files guarding defects, fixtures, provenance, static build, catalogue, parity and the blind-spots page |

## Strengths worth preserving

- The original exercise is treated as a preservation artefact: the answer page and the
  regression suite are deliberately coupled, and the count of 19 is asserted.
- The ACT manifest has real validation: duplicate identifiers, conflicting target ids,
  missing provenance, frame files, review records and closed-shadow restrictions.
- Expected outcomes are explicitly hypotheses. Review records distinguish "the DOM
  condition exists" from "a person experienced this barrier".
- Content provenance is content-addressed: rendered HTML and assets are hashed and the
  merge refuses to change existing files.

## Gaps identified

1. **No single registry.** The original inventory and the ACT manifest use different
   schemas and are never joined. A consumer cannot ask "which defects exist, where, and
   what is their review state" without reading two files and knowing both formats.
2. **No element-level locators for the original exercise.** The inventory stores a DOM
   assertion and a test name, not a CSS selector, XPath or role locator. The selectors exist
   only inside the regression test.
3. **Answers embedded in fixture pages.** Laboratory pages print "Expected outcome: failed,
   unreviewed" in their own markup. This is appropriate for a declared ACT case but it
   cannot support a blind evaluation.
4. **Boolean detection model.** The original inventory records `detected: true/false` for
   automation only. There is no vocabulary for "detectable with a different method",
   "partial detection" or engine observations.
5. **No locator verification.** Nothing resolves a declared target in a browser and reports
   "not found", "ambiguous", "hidden" or "detached". A renamed id fails a test, but there is
   no evidence artefact and no filterable verification command.
6. **No assistive-technology procedures.** The manual scripts describe keyboard, screen
   reader, zoom and forced-colours checks, but no per-defect procedure, environment matrix
   or "not executed" state that a reviewer can pick up.
7. **Coverage is manually maintained.** `docs/DETECTION-MATRIX.md` and
   `docs/COVERAGE-MATRIX.md` are hand-written and can drift from the manifests.
8. **No comparison controls for the original exercise.** The ACT fixtures pair passing and
   failing cases in some scenarios, but most original defects have no correctly implemented
   counterpart.
9. **No blind-evaluation contract.** The catalogue exposes answers and there is no written
   boundary describing what an evaluator may receive.
10. **Sparse subtle-defect coverage.** Before this change there were no defects for focus
    loss after item removal, silent status updates, an indefinitely set busy state,
    unassociated validation errors, stale `aria-expanded`, pointer-only custom switches,
    instructions hidden from the accessibility tree, or visual-only headings.

## Baseline reproducible commands

```bash
npm ci
npm run build                       # 37 ACT fixtures, 37 review records, 1,211 upstream cases
npx playwright test                 # 285 chromium tests after this change; 190 before
node scripts/defects.mjs validate   # registry command added by this change
```

## Decision recorded from this audit

The original inventory and the ACT manifest remain authoritative for their own records.
A generated registry joins them, adds curated metadata for the original exercise, and
holds new non-ACT defects as hand-authored records. That decision and its consequences are
recorded in [ADR-0001-unified-defect-registry.md](ADR-0001-unified-defect-registry.md).
