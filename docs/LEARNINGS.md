# Learnings and next steps

A record of what this build taught us, written at the end of the first three tranches
(2026-11-26). It complements [BACKLOG.md](BACKLOG.md), which lists the remaining defect
families, and [BASELINE-AUDIT.md](BASELINE-AUDIT.md), which records the starting point.

## Where the benchmark stands

| Measure | Value |
| :--- | ---: |
| Declared defects | 65 |
| Preserved original defects | 19 |
| ACT fixture defects | 21 |
| New journey, table, widget, responsive, SPA and language defects | 25 |
| Defects with a comparison control | 35 |
| Interaction- or environment-dependent defects | 19 |
| Playwright tests | 351 (chromium locally) |
| Locators verified in a browser | 64 resolved, 1 documented closed-shadow limitation |
| Recorded axe-core observations | 25 (1 detected, 24 not detected) |
| Assistive-technology procedures executed | 0 (24 recorded as `not-run`) |
| Independently reviewed expectations | 0 |

## What we learned

### 1. A registry must be generated, not curated twice

The moment the original inventory, the ACT manifest and the new records were joined by
hand, three copies of every fact appeared. Generating `data/known-defects.json` from
authoritative sources, then checking it byte for byte, was the single highest-value
decision. `defects:check-sync` caught drift during development (the Markdown had to be
regenerated after a renderer change) before it could reach a commit.

### 2. Entity extraction needs phases, not just selectors

A locator that is verified after an interaction is not the same as one verified before it.
The focus-removal defect's target is deliberately destroyed by the interaction, and the
status message only appears afterwards. Adding `phase` (`before`, `after`, `either`) and
recording both passes turned "not found" into usable evidence ("resolved before, removed by
interaction") without weakening the rule that an unresolved locator is never a pass.

### 3. Accessible name computation still surprises experienced reviewers

The first version of the hidden-hint fixture assumed that `aria-hidden` on an element
referenced by `aria-describedby` would remove the description. It does not: directly
referenced hidden text still contributes. The fixture was wrong and was rebuilt as an
unassociated hint. This is exactly the kind of false assumption the benchmark is meant to
expose, and it is why the records distinguish the accessible name, the accessibility tree
and what a screen reader actually says.

### 4. Absence is evidence

`aria-hidden` targets produce an empty ARIA snapshot. Treating that as a capture failure
would have made the step indicator unverifiable. The verifier now records
`ariaHidden: true` and the test accepts an empty snapshot only in that case — the absence
itself is the evidence.

### 5. Automated blind spots are measurable, not rhetorical

With axe-core 4.14.1 on the default page state:

| Case | Detected? |
| :--- | :--- |
| Visible label contradicts the accessible name | yes, `label-content-name-mismatch` |
| Focus lost after removing the focused item | no |
| Confirmation shown without a live region | no |
| `aria-busy` never cleared | no |
| Stale `aria-expanded` | no |
| Pointer-only switch | no |
| Stale combobox active descendant | no |
| Stale `aria-sort` | no |
| Stale grid `aria-rowcount` | no |
| Client-side route with a stale title | no |
| French passage without `lang` | no |
| Stacked table loses column headers at 320px | no |

That is one detection out of twenty-five recorded cases. The assertions are
version-sensitive on purpose: if a future axe release starts detecting one of these, the
test fails and a person must decide whether the observation changes.

### 6. Fixtures can carry their own accidental defects

Two mistakes in the surrounding fixture pages were found by running axe on them:

- the service's phase banner sat outside any landmark (`region`);
- two SPA navigation landmarks had the same accessible name (`landmark-unique`).

Both were ordinary accessibility bugs in the *non-defective* part of the fixture. Running
the scanner on fixtures is therefore part of building them, not only part of evaluating
them.

### 7. Shared pages create shared state

Two client-side view switchers on one page cannot both own `document.title` and the URL
hash: the correct variant updated the title during the defective variant's test. The fix was
to scope navigation per variant and not mutate the title on initial render. Comparison
fixtures need explicit isolation of any global state (title, hash, storage, focus).

### 8. Classification discipline is harder than writing the defect

It is tempting to call every difference a WCAG failure. The tabs are the clearest example:
the defective tab set is still operable with Tab and Enter, so missing roving tabindex and
arrow keys are best-practice gaps (with an informational mapping), not 2.1.1 failures.
Similarly, a broken error-summary link is a usability concern when the error is still
identified in text. The registry's `classification` and `wcag[].status` fields exist to make
that judgement visible and reviewable.

### 9. Responsive defects need environment-driven verification

Hiding a table header at 320 CSS pixels is invisible to a default-viewport scan. Recording
`environment.viewport` in the registry lets `defects:verify` reproduce the condition, and
the preservation test sets the same viewport. Viewport emulation is still not the same as
browser zoom or OS magnification; the record says so.

### 10. Environment and tooling notes

- The machine's npm cache was not writable from the sandbox; installing with a
  workspace-local cache (`npm ci --cache .npm-cache`) worked and is already gitignored.
- Chromium was available locally; Firefox and WebKit are exercised only by CI.
- Long-lived preview servers can hold a pipeline's stdout open; background runs should log
  to a file rather than rely on a piped `tail`.

## Next steps, in priority order

1. **Independent review.** Twenty-five new expectations have no review. A second person
   reproducing five of them is worth more than twenty more fixtures. Record reviewer,
   method, observation and limitation in the record; do not flip expectations to make a
   test pass.
2. **Assistive-technology evidence.** Run the recorded VoiceOver and NVDA procedures and
   capture actual output. Every procedure is currently `not-run`; that is honest but it
   means no claim about speech has been verified.
3. **Journey depth.** Add a conditional keyboard trap and a correction loop that cannot be
   completed, then test the journey as a process rather than page by page.
4. **Tables and virtualisation.** Grouped headers with `colspan`/`rowspan`, a grid that
   recycles rows, and a layout table exposed as data.
5. **Responsive and zoom.** A dialog whose close button falls outside a 320px viewport,
   sticky overlap, and a measured 200% zoom check kept separate from viewport emulation.
6. **Language and RTL.** Wrong document `lang`, an untranslated accessible name, and a
   right-to-left reading-order case.
7. **JavaScript lifecycle.** Hydration that drops an accessible name, duplicate ids from a
   repeated component, and Back-navigation state mismatch.
8. **Blind runner.** Publish the rule that an evaluator receives URLs and task instructions
   only, then run one external evaluation and compare element-level findings with the
   registry.
9. **Open Scans handshake.** Confirm a consumer can classify static, interaction,
   environmental, manual and assistive-technology targets from `defects/manifest.json`
   without reading the catalogue.

## What not to do next

- Do not add fixtures without locators and a reproduction path.
- Do not describe a fixture as a WCAG failure because a scanner flags it.
- Do not record screen-reader output that nobody heard.
- Do not treat a clean axe run as a pass.
- Do not inflate the count with near-duplicates; strengthen an existing case instead.
