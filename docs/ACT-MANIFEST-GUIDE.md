# How to work with the ACT manifest

The ACT manifest is the list of **declared test cases** in
`services/lab/fixtures.json`. It is not a list of every page, every journey
state or every scanner finding.

The published copy is `/lab/fixtures.json`. The catalogue and coverage files
are generated from it.

## One case = one rule question

A case answers one question:

> For this ACT rule, on this target, in this state, is the outcome passed,
> failed or inapplicable?

That means each case needs:

| Field | Meaning |
|---|---|
| `id` | Stable fixture identifier, never reused |
| `title` | Human-readable name |
| `act` | Approved rule ID, name, revision and URL |
| `expected` | `passed`, `failed`, `inapplicable` (or `null` only for an explicitly unsupported exploratory case) |
| `review` | `unreviewed`, `reviewed` or `disputed` |
| `target` | Scope and selector, frame path or shadow host path |
| `urlPath` | Page and query state that contains the target |
| `readySelector` | Marker that shows the state is ready |
| `reviewRecord` | Link to the evidence record |
| `provenance.sourceFile` | Source file used to verify the fixture |

## What does not belong in the manifest

- **Whole journeys.** A six-step reporting journey is a process fixture, not an
  ACT case. The catalogue lists journey pages, but they do not get a manifest
  case unless a specific target tests a specific rule.
- **Every button on a page.** A named Submit button is not automatically worth
  a `97a4e1` case. Add it only if it is a deliberate control target with a
  documented expected outcome.
- **Scanner predictions.** Do not write “axe will fail this” or “ALFA will
  report that”. Open Scans owns observations.
- **Unreviewed claims presented as facts.** All new cases start `unreviewed`.
- **A verdict for a rule that is not approved.** Check the W3C ACT rule page
  first. If no approved rule fits, keep the case manual or best-practice only.

## When a journey state becomes a case

Only when all of these are true:

1. there is an approved ACT rule;
2. the target exists in that state and has a stable selector;
3. the state is reproducible from a clean browser context;
4. the expected outcome is independently justified;
5. a review record exists (it may still be `unreviewed`).

The existing React/Vue/Paca experiment targets are cases. Their surrounding
journey steps are not.

## Adding a case

1. Create or choose the page state. Make the state addressable with
   `?step=` or `?state=`.
2. Add a stable target ID.
3. Add the case to `services/lab/fixtures.json`.
4. Add `services/lab/reviews/records/<id>.json` with status `unreviewed`.
5. Run `npm run build`. The validator checks the rule, URL, target, review
   record and provenance.
6. Run the fixture tests and the catalogue tests.
7. Only mark `reviewed` after recording methods and evidence.

Minimal shape:

```json
{
  "id": "example-button-name",
  "title": "Button with an accessible name",
  "category": "isolated-act",
  "scenarioId": "example",
  "urlPath": "lab/example/",
  "act": {
    "ruleId": "97a4e1",
    "ruleName": "Button has non-empty accessible name",
    "ruleStatus": "approved",
    "ruleRevision": "2023-08-31",
    "ruleUrl": "https://www.w3.org/WAI/standards-guidelines/act/rules/97a4e1/"
  },
  "expected": "passed",
  "review": "unreviewed",
  "target": {
    "scope": "light-dom",
    "selector": "#target",
    "targetId": "target"
  },
  "readySelector": "[data-test-ready='true']",
  "provenance": {
    "sourceFile": "services/lab/example/index.html"
  },
  "reviewRecord": "lab/reviews/records/example-button-name.json"
}
```

## Inapplicable cases

Use `"expected": "inapplicable"` and a document-scope target:

```json
"target": { "scope": "document" }
```

No selector and no target ID. The page must genuinely have no eligible target.
This is different from a scanner that failed to run.

## Review records

`reviewed` requires a reviewer, date, method and evidence. `unreviewed` must not
name a reviewer or date. See
[`services/lab/reviews/README.md`](../services/lab/reviews/README.md).

## What Open Scans sees

Open Scans reads the published manifest, runs the declared rule on the declared
target, and decides what its engines observed. The fixture site supplies the
truth; Open Scans supplies the observations.

## Checklist

- [ ] Approved ACT rule and correct revision.
- [ ] One target and one rule question.
- [ ] Stable, deterministic state.
- [ ] Expected outcome justified.
- [ ] Review record present.
- [ ] `npm run build` passes.
- [ ] Catalogue shows the case.
