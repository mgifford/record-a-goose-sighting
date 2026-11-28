# Contributing a defect or comparison fixture

This repository is an accessibility benchmark. A defect is useful only if another person
can reproduce it, find the element, and see which requirement is claimed. This guide is the
contract for adding one.

Start by reading [FIXTURE-CONTRACT.md](FIXTURE-CONTRACT.md) and
[ADR-0001](ADR-0001-unified-defect-registry.md). Do not add a parallel list of defects.

## Before you write code

1. **Search the registry.** `npm run defects:coverage` and
   [KNOWN-DEFECTS.md](KNOWN-DEFECTS.md) show what exists. Prefer strengthening an existing
   fixture or adding a meaningful variation over a near-duplicate.
2. **Decide what kind of case it is.**
   - An approved ACT rule with a failed outcome belongs in `services/lab/fixtures.json`.
   - A defect that is not an ACT case belongs in `data/defects/<id>.json`.
   - A preserved original-exercise defect belongs in `docs/original-goose-issues.json`.
3. **Name it.** Use a lowercase kebab-case identifier that describes the behaviour, for
   example `focus-lost-after-item-removal`. Identifiers are permanent. Do not encode a
   WCAG number, a status or a tool name in the id.
4. **Plan the control.** If a comparison is meaningful, build a visually similar correctly
   implemented variant and record it in `relatedElements` (same page) or
   `controlFixtureId` (separate fixture). A defect without a control is still allowed; say
   so rather than pretending one exists.

## Writing the fixture page

- Put the page under `services/lab/...` or an existing fictional service. Extend an
  existing service before adding a new one.
- Add the entry to `vite.config.mjs`; pages are built from an explicit list.
- Link `/lab/lab-styles.css`. Keep the surrounding interface accessible.
- **Do not reveal the answer in the page.** No `data-defect` attributes, no ids such as
  `#broken-button`, no comments or visible text naming the expected failure. Use realistic
  ids (`#continue`, `#observation-date`).
- Keep the defect and its control visually near-identical. The accessibility-relevant
  implementation should be the only difference.
- Make state deterministic. Avoid real clocks, random values, network calls and animation
  that depends on timing. If a delay is needed, use a short fixed timeout.
- Do not introduce dangerous flashing, large media or third-party trackers.

## Writing the registry record

Copy [templates/defect-record.json](templates/defect-record.json) to
`data/defects/<id>.json` and fill in every field.

- `locators`: at least one resolvable locator (CSS, XPath, role or text). Add an absolute
  XPath only as diagnostic evidence; it is fragile. Declare `framePath` and `shadowPath`
  when the target is inside a frame or an open shadow root. A closed shadow root uses
  `document-scope` and must be marked `exploratory`.
- `phase`: use `before` when the interaction removes the target, `after` when the target
  only appears after the interaction. Otherwise omit it.
- `preconditions` and `interactionSteps`: enough for a stranger to reproduce the state.
- `wcag[].status`: start with `candidate` or `informative`, not `confirmed`. `confirmed`
  requires an independent review.
- `detection.expectedMethods`: use the controlled vocabulary in the schema. Do not claim a
  method has been run unless `detection.observed` has a real, dated observation.
- `assistiveTechnologyTests`: record the procedure with status `not-run` until someone runs
  it. Never invent screen-reader output.
- `reviewStatus`: leave the dimensions at `not-run` except `automatedReproduction` after
  your regression test passes.
- `notApplicable`: list fields that genuinely do not apply, and leave them null or empty.

## Writing the regression test

Add assertions to the relevant spec under `tests/`. Preserve both halves:

```js
// Preserves the intentional defect.
await expect(page.locator('#switch-a')).toHaveAttribute('aria-checked', 'false')

// Preserves the control.
await expect(page.locator('#switch-b')).toHaveAttribute('aria-checked', 'true')
```

Name the test after the behaviour, not the fix. A test that silently accepts a repaired
defect makes every later comparison wrong.

## Validate and generate

```bash
npm run defects:validate        # schema, references, coherence
npm run defects:generate        # rewrite registry, Markdown, coverage and catalogue
npm run defects:check-sync      # fail if generated files are stale
npm run defects:verify -- --id <id>   # resolve the locator in Chromium and write evidence
npx playwright test tests/<spec>.spec.js
```

`defects:verify` writes `test-results/defect-verification.json`. Include the relevant
excerpt in your pull request description; do not commit large evidence files.

## Review checklist

- [ ] The page is visually credible and the surrounding interface is accessible.
- [ ] The defect is subtle: a mouse user at a desktop viewport may not notice it.
- [ ] The page does not expose the answer key.
- [ ] The control differs only in the accessibility-relevant implementation.
- [ ] Exactly one identifier is introduced, and it matches the file name.
- [ ] Every locator resolves uniquely (or the limitation is recorded).
- [ ] Frame, shadow-root and interaction context are declared.
- [ ] WCAG and ACT mappings are evidence-based; best practice is not labelled a failure.
- [ ] Unreviewed expectations are explicitly unreviewed.
- [ ] No assistive-technology result is claimed without a recorded procedure and evidence.
- [ ] `npm run defects:check-sync` and the relevant Playwright specs pass.

## When a dependency repairs an intentional defect

Do not quietly change the expected outcome.

1. Identify the dependency change and version.
2. Record the observation in the defect's `reviewStatus.note` and in your pull request.
3. Decide whether to preserve, revise or deprecate the fixture.
4. Update the expectation deliberately and explain why earlier comparisons are no longer
   comparable.
5. Keep the historical observation rather than overwriting it.

## Deprecating a defect

Set `reviewStatus.lifecycle` to `deprecated` and keep the record. Do not delete it: external
comparisons and scan history reference its identifier.
