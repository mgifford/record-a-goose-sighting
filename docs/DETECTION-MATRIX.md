# Detection matrix

The [detection matrix page](../app/views/blind-spots.html) — published at
`/blind-spots/` — shows, for each of the 19 described issues, whether automated
tools detect it, which manual techniques expose it, and why automation misses it.

## Why it exists

The exercise is intended to teach review, not tool operation. Most of its
defects are invisible to the Accessibility Insights Fast Pass and other axe-based scanners:

- automated checks are good at missing names, empty titles, contrast and simple
  structure;
- they cannot judge whether a heading is meaningful, whether a link reads well
  out of context, whether focus is visible, whether every control is reachable
  by keyboard, whether a placeholder is the only instruction, or whether an
  animation can be paused.

The matrix makes that gap explicit so a clean automated report is not mistaken
for a usable page.

## Source of truth

`docs/original-goose-issues.json` is the machine-readable inventory. Each issue
has a `detection` object:

```json
{
  "automated": { "detected": false, "tools": [], "note": "..." },
  "manual": { "methods": ["keyboard"], "test": "..." },
  "whyMissed": "..."
}
```

The Nunjucks page reads that file at build time, so the page and the inventory
cannot drift apart. The Playwright test in `tests/blind-spots.spec.js` checks
the row count, the automated/manual split and the accessible table markup.

## Current split

| Detection | Count | Examples |
| :--- | ---: | :--- |
| Automated | 4 | missing title, low contrast, skipped heading level, missing image alternative |
| Manual only | 15 | focus visibility, keyboard reachability, link purpose, new tab, placeholder-only hint, animation control |

Automated coverage was assessed against the axe-core 4.14 checks used by
Accessibility Insights for Web Fast Pass. It is a snapshot, not a permanent property: rules change, and a missing
finding is not a pass.

## Maintaining it

1. Add or change an issue in `docs/original-goose-issues.json`.
2. Update its `detection` fields and the guarding test reference.
3. Rebuild (`npm run build`) and run `npm test`.
4. Review the rendered table at `/blind-spots/` at desktop and mobile widths.

If a tool starts or stops detecting an issue, change the matrix deliberately
and record why; do not let a tool update silently change what the exercise
claims.

## What the laboratory adds

The matrix above covers the original journey. The laboratory adds isolated
cases where the question is not only "did a tool find it?" but "what kind of
claim can this evidence support?".

| Case family | Example | What manual testing adds |
|---|---|---|
| Correlation | two images with the same class, one target with two rules | whether the targets are genuinely distinct and whether each rule question applies |
| Frames | same `#target` in two frames | whether the frame context changes what a user hears or can reach |
| Dynamic | React/Vue async name, replaced node | whether the name is available when the user needs it, not only after settling |
| Shadow DOM | nested open shadow roots | what the accessibility tree exposes across shadow boundaries |
| Interaction | disclosure reveals an unnamed control | whether the target exists, is reachable and is named after the action |
| Interpretation | link text, wrong alternative, CSS order, status message | whether the result is a WCAG failure, best practice, usability concern or context-dependent |

### Classification, not just pass/fail

- **ACT outcome** — the declared target's result for one ACT rule.
- **WCAG failure** — a person confirmed a criterion failure with evidence.
- **Best practice** — useful improvement, not a failure by itself.
- **Usability concern** — affects the experience but may not fail a specific criterion.
- **Context-dependent / disputed** — the conclusion depends on context or reviewers disagree.
- **Needs more testing** — the evidence cannot settle it.

A clean automated scan does not establish WCAG conformance. A missing finding
does not establish a pass. Record the method and the observation in
[`services/lab/reviews/`](../services/lab/reviews/README.md).
