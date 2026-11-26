# Defect backlog

A persistent record of what this benchmark covers, what it does not, and what should be
built next. It is deliberately longer than the implementation: the repository is a
benchmark, not a checklist to complete.

Status values: **existing** (covered before this change), **added** (first tranche,
2026-11-26), **partial**, **not started**.

## Coverage at a glance

| Measure | Value |
| :--- | ---: |
| Declared defects | 52 |
| Preserved original defects | 19 |
| ACT fixture defects | 21 |
| New subtle defects | 12 |
| Comparison controls linked to a defect | 10 |
| Interaction-dependent defects | 9 |
| Independently reviewed defects | 0 |
| Recorded AT procedures (all unexecuted) | 11 |

## Families

| Family | Status | What exists | Main gap | Next tranche |
| :--- | :--- | :--- | :--- | :--- |
| A. Accessible names and descriptions | partial | ACT name fixtures; misleading label; control | No wrong `aria-labelledby` target, name order, stale name after interaction, verbose name, localised name | 8 defects with paired controls across buttons, links and fields |
| B. Keyboard interaction | partial | Original tabindex, focusable hidden content; pointer-only switch | No keyboard trap, positive tabindex, roving tabindex, single-character shortcuts, drag alternative | Trap in a widget and a modal; roving-tabindex tabs; shortcut that cannot be remapped |
| C. Focus management | partial | Focus lost after removal; error summary not focused; original focus-order and focus-style defects | No dialog focus, focus restoration, nested dialog, sticky-header obscuring, focus after Back | Dialog open/close/restore trio, nested dialogs, sticky header overlap |
| D. Screen reader reading and navigation | partial | Original heading and legend defects; visual-only heading; hidden hint | No incorrect landmark structure, `aria-owns`, virtualised list, conflicting reading order | Landmark noise, virtualised observations list, CSS-generated content |
| E. Dynamic content and status messages | partial | Silent save; uncleared busy state; existing reveal fixture | No assertive overuse, competing regions, stale status, auto-updating content | Two competing live regions; status removed before review; stale count |
| F. Forms and error recovery | partial | Four new error defects; original field-level defects | No conditional question, multi-step data loss, autocomplete token, timeout, password-manager block | Multi-step form that loses data; conditional field not announced; paste-blocked confirmation |
| G. Complex ARIA widgets | partial | Disclosure with stale state; switch; ACT role fixtures | No combobox, listbox, menu, tabs, tree, grid, date picker, slider | Combobox with stale `aria-activedescendant`; tabs with wrong roving tabindex; grid with wrong row count |
| H. Images, graphics and alternative text | existing | Original missing alt, file-name alt; ACT image fixtures | No charts, maps, SVG names, icon-only controls, paired visual comparisons | Chart with a data-table alternative; SVG with misleading title; icon-only button |
| I. Tables and structured data | not started | - | No header association, sorting, responsive or virtualised table cases | Mis-associated headers; stale `aria-sort`; layout table exposed as data |
| J. Responsive accessibility and reflow | existing (manual) | 320px text-spacing page; manual scripts | No defect that only appears at 320px, zoom or magnification | Clipped dialog at 320px; sticky footer overlap; content lost at 200% |
| K. Text spacing and typography | existing | Fixed-height containers and text-spacing page; justified text | No clipping measured under 1.4.12 overrides | Clipped label at letter-spacing; truncated control; contrast under custom spacing |
| L. Forced colours, themes and preferences | existing (manual) | Forced-colours focus comparison; reduced-motion page | No automated behavioural check; no dark-mode contrast pair | `forced-color-adjust: none` misuse; focus cue lost in dark mode |
| M. Motion, animation and time | existing | Uncontrollable GIF; reduced-motion comparison | No auto-advancing carousel, timeout or disappearing notification | Carousel with pause; session timeout; toast removed too quickly |
| N. Audio, video and multimedia | not started | - | No captions, audio description or media controls | Short local clip with mis-timed captions; audio-only with no transcript |
| O. Language and internationalisation | not started | - | No wrong page language, mixed-language passage or bidi example | Wrong `lang`; untranslated accessible name; RTL reading order |
| P. Cognitive accessibility and comprehension | partial | Original content defects; usability-concern classification | No jargon, inconsistent terminology, memory burden or confirmation ambiguity | Three-step process with inconsistent labels; help text in the wrong place |
| Q. Voice control and alternative input | partial | Pointer-only switch; label-in-name mismatch | No overlay numbers, drag-only, small targets, gesture-only | Drag-and-drop without an alternative; 24×24 target; multipoint gesture |
| R. JavaScript lifecycle and dynamic state | partial | React/Vue async name; node replacement | No hydration mismatch, duplicate ids, lost listeners, route-change title | Hydration that drops a name; duplicate ids from a repeated component; Back-state mismatch |
| S. Web Components, shadow DOM and iframes | existing | Open, closed, nested shadow roots; single, nested and multiple frames | No cross-root `aria-labelledby`, focus delegation or slotted semantics | Named slot that loses its label; focus restore across frame boundaries |
| T. Multi-page journeys | not started | Original six-step Goose journey (defects are page-level) | No journey-only failure, conditional trap, progress indicator or correction loop | New fictional service with a conditional keyboard trap and a correction workflow |

## Deliberate non-goals for now

- Hazardous flashing content. Use static or documented non-rendered specimens only.
- Large media files or third-party embeds.
- A single accessibility score. Interaction-effort and detection data stay per-defect.
- Claiming WCAG conformance from fixture counts.

## Suggested order

1. **Review the first tranche.** Twelve defects and ten controls are unreviewed. Independent
   review, then manual reproduction, is worth more than twenty more fixtures.
2. **Journeys (T).** Extend one existing fictional service with a conditional, multi-page
   failure. This is the largest gap for realistic evaluation.
3. **Tables and widgets (I, G).** High real-world value and often missed by automation.
4. **Responsive and preference defects (J, L).** Add behavioural checks that record
   measured results separately from confirmed failures.
5. **Media and language (N, O).** Small, original assets; keep resource use low.

## How to claim a backlog item

Open an issue using the "New proposed defect" template, reference the family, and follow
[CONTRIBUTING-DEFECTS.md](CONTRIBUTING-DEFECTS.md). Update this table in the same pull
request when the status changes.
