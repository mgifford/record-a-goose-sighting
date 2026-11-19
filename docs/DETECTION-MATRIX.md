# Detection matrix

The [detection matrix page](../app/views/blind-spots.html) — published at
`/blind-spots/` — shows, for each of the 18 described issues, whether automated
tools detect it, which manual techniques expose it, and why automation misses it.

## Why it exists

The exercise is intended to teach review, not tool operation. Most of its
defects are invisible to axe-core and WAVE:

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
| Manual only | 14 | focus visibility, keyboard reachability, link purpose, new tab, placeholder-only hint, animation control |

Automated coverage was assessed against axe-core 4.14 and WAVE's published
checks. It is a snapshot, not a permanent property: rules change, and a missing
finding is not a pass.

## Maintaining it

1. Add or change an issue in `docs/original-goose-issues.json`.
2. Update its `detection` fields and the guarding test reference.
3. Rebuild (`npm run build`) and run `npm test`.
4. Review the rendered table at `/blind-spots/` at desktop and mobile widths.

If a tool starts or stops detecting an issue, change the matrix deliberately
and record why; do not let a tool update silently change what the exercise
claims.
