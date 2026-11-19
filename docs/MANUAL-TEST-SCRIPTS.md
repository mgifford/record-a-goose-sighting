# Manual test scripts

Use these scripts alongside the [worksheet](https://mgifford.github.io/record-a-goose-sighting/steps/worksheet/).
They are written for the six-page Goose journey and point at the issues each
technique exposes. Issue IDs refer to
[original-goose-issues.json](original-goose-issues.json).

The scripts are prompts, not a checklist to complete mechanically. Record what
you observed, not only pass/fail.

## 1. Keyboard only

**Setup:** hide or unplug the mouse; use Tab, Shift+Tab, Enter, Space and arrow
keys.

1. From the start page, Tab through every link. List the order and compare it
   with the visual order.
2. Watch for a visible focus indicator on every stop.
3. On the related links, compare the order you tab through with the order on
   screen.
4. Activate the RSPB link with Enter. Note that a new tab opens without warning.
5. On "Do you like geese?", Tab from the address bar to the radios, then try to
   reach Continue. Record whether you can.
6. On "What type of goose did you see?", Tab once. Note where focus goes and
   whether you can see it.
7. Complete the journey with the keyboard only. Record any point where you had
   to guess.

**Exposes:** `start-dom-visual-order`, `start-focus-style`, `start-new-tab`,
`geese-tabindex`, `goose-type-ghost-goose`.

**Why automation misses it:** automated rules do not evaluate the rendered
focus order, the visibility of the indicator, or whether every control is
reachable.

## 2. Screen reader

**Setup:** NVDA with Firefox or Chrome on Windows, or VoiceOver with Safari on
macOS/iOS. Use the browser and screen reader pair you normally support.

1. Load each page and listen to the page title announcement.
2. Open the headings list and read the outline.
3. Open the links list on the start page and read the related links out of
   context.
4. Open the form controls list on "Do you like geese?" and listen to the radio
   group name.
5. On "What type of goose did you see?", type a value and check whether the
   instruction is still available.
6. On check your answers, read each Change link in the links list.
7. On the confirmation page, listen to the image announcement.

**Exposes:** `geese-empty-title`, `goose-type-boop-title`, `start-ambiguous-link`,
`geese-missing-legend`, `check-hidden-change-text`, `start-two-h1`,
`check-heading-order`, `end-gif-alt`, `goose-type-placeholder`.

**Why automation misses it:** tools can confirm that a title, name or heading
exists; they cannot judge whether it is meaningful, or what a user actually
hears.

## 3. Zoom, reflow and text spacing

**Setup:** browser at 200% and 400%; then a 320 CSS-pixel viewport.

1. At 200%, check that content does not overlap or disappear.
2. At 400% (or 320 px), check that content reflows into one column without
   horizontal scrolling, except for genuinely two-dimensional content such as
   data tables.
3. Read the justified paragraph on the confirmation page. Check the word
   spacing at narrow widths.
4. Apply increased text spacing (line height 1.5, paragraph spacing 2em, letter
   spacing 0.12em, word spacing 0.16em) and check for clipping.
5. Use a screen magnifier and follow focus through the related links.

**Exposes:** `end-justified-text`, `start-dom-visual-order`,
`start-focus-style` (focus can move off-screen).

**Why automation misses it:** reflow and spacing depend on rendering at
specific widths; most tools do not test them.

## 4. Forced colours and high contrast

**Setup:** Windows high contrast / forced-colours mode, or the browser's
forced-colours emulation.

1. Tab through the start page and the form pages.
2. Check that focus remains visible when backgrounds and colours are replaced.
3. Check that the hint text is still distinguishable from its background.
4. Check that no information is conveyed by background colour alone.

**Exposes:** `start-focus-style`, `goose-type-ghost-goose`,
`geese-low-contrast` (depending on the forced palette).

**Why automation misses it:** most scanners evaluate the default colour scheme,
not the user's forced-colours palette.

## 5. Reduced motion

**Setup:** set the operating system or browser to reduce motion.

1. Load the confirmation page and watch the animated image.
2. Look for a pause, stop or hide control.
3. Check whether the animation respects `prefers-reduced-motion`.

**Exposes:** `end-animation-control`.

**Why automation misses it:** the element is an image; whether it loops or can
be stopped is not part of its markup.

## 6. Content and cognitive review

Read the service as a person would, without a testing tool.

1. Read the start page list. Is each item a complete instruction?
2. Read the related links. Would "More" make sense on its own?
3. On "Do you like geese?", type an answer, then check whether the hint is
   still visible.
4. On the confirmation page, read the heading in capitals and the justified
   paragraph. Notice how they affect reading rhythm.
5. Look for instructions that depend on memory, or on remembering a placeholder.
6. Check whether every action is announced in advance (new tabs, timeouts,
   changes of context).

**Exposes:** `start-ambiguous-link`, `start-new-tab`, `goose-type-placeholder`,
`end-uppercase-heading`, `end-justified-text`, `check-hidden-change-text`.

**Why automation misses it:** these are judgements about language, memory and
reading, not properties a scanner can measure.

## 7. Automation triage

Run axe, WAVE or Lighthouse. Then:

1. For every automated finding, check whether it is in the
   [detection matrix](https://mgifford.github.io/record-a-goose-sighting/blind-spots/).
2. For every issue the matrix marks "Not detected", decide which manual script
   above would find it.
3. Record engine-specific findings separately from ACT/WCAG outcomes. A rule
   that is not mapped to an ACT rule is still evidence, but it is not ACT
   coverage.
4. Do not convert a missing finding into a pass.

**Exposes:** the gap between tool output and a usable review.

## Recording findings

Use the [evidence log template](EVIDENCE-LOG-TEMPLATE.md). Keep the observation
concrete: page, element, action, result. Do not record only a rule name or a
tool score.

## Limits

These scripts are not a WCAG conformance evaluation. They do not cover every
success criterion, every assistive technology combination, or every user. State
that limit in any report you produce.
