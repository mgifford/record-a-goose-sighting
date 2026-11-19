# Contributing to the exercise

This repository is a training fixture, not a normal service. Changes must
preserve the teaching content, including the defects.

## Invariants

- Do not fix a Goose accessibility defect unless the change is explicitly a
  redesign of the exercise, reviewed as such.
- Do not replace the Goose home page with the laboratory or a starter page.
- Do not change existing URLs without redirects and verification.
- Do not remove the worksheet or answers.
- Do not run an auto-fix or mass formatter over the Goose templates.
- Do not upgrade GOV.UK Frontend as part of an unrelated change; see
  [govuk-frontend-upgrade.md](govuk-frontend-upgrade.md).
- Do not invent a nineteenth issue to match the stale count. The count and the
  18 enumerated issues are documented in
  [original-goose-baseline.md](original-goose-baseline.md).

## How to change an existing issue

1. Edit the relevant template or stylesheet. Keep the defect observable.
2. Update `docs/original-goose-issues.json` if the evidence, route, status or
   detection method changed.
3. Update the guarding test in `tests/accessibility-regression.spec.js` if the
   assertion changed. The test must still prove the defect exists.
4. Update `tests/blind-spots.spec.js` only if the automated/manual split
   changed. Do not silently relabel a manual issue as automated.
5. Update the answers page if the learner-facing description changed.
6. Run `npm run build` and `npm test`.

## How to add an issue

Adding a nineteenth issue is a content decision, not a bug fix. It changes the
answer key, the stated total and the detection split. If approved:

1. Add the defect to a Goose page and keep the journey completable.
2. Add an entry to `docs/original-goose-issues.json`:
   - stable `id`, answer-key number, route and title;
   - WCAG criteria and status (`failure`, `best-practice` or `manual-concern`);
   - evidence type and the guarding test;
   - `detection.automated` and `detection.manual`, with `whyMissed` when no
     automated rule detects it.
3. Describe it on the answers page.
4. Update the stated total deliberately. The page and inventory both list 19
   issues; keep them in step when adding or resolving one.
5. Add or update a Playwright assertion.
6. Check the rendered detection matrix at `/blind-spots/`.

## How to add a laboratory fixture

See [FIXTURE-CONTRACT.md](FIXTURE-CONTRACT.md) for identity fields, the
correlation scenarios and the compatibility rules. Every new case needs a
distinct `id`, a declared target, an independently verified DOM condition and a
Playwright assertion.


The animal laboratory is separate from the Goose exercise. Fixtures and their
contract are described in the Open Scans
[ACT laboratory documentation](https://github.com/mgifford/open-scans/blob/main/act-lab/README.md).
In this repository, fixtures live under `services/` and are built with Vite.
Keep the surrounding interface accessible; only the declared target should be
broken.

## Build and test

```bash
npm ci
npm run build
npm test
```

The build renders the Goose pages, compiles the laboratory and merges it. It
fails if an intentional defect disappears, a root-relative URL appears, or an
existing Goose file changes during the merge.

## Pull requests

- Create a branch and open a pull request; do not push to `master`.
- The protected branch requires the `Build and test` check.
- Describe what changed, which defects were preserved, and what was run.
- Do not merge a change that makes the exercise's automated results cleaner by
  removing a defect.

## Documentation to update

| Change | Update |
| :--- | :--- |
| An issue's evidence or route | `docs/original-goose-issues.json` |
| Detection coverage | `docs/DETECTION-MATRIX.md` and `/blind-spots/` |
| Facilitator behaviour | `docs/FACILITATOR-GUIDE.md` |
| Manual technique | `docs/MANUAL-TEST-SCRIPTS.md` |
| Architecture or deployment | `README.md` |
