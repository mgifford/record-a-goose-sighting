# Manual laboratory scripts

These scripts reproduce the laboratory cases by hand. They complement
[MANUAL-TEST-SCRIPTS.md](MANUAL-TEST-SCRIPTS.md), which covers the original
Goose journey.

Every script is a prompt. Record what you observed; do not mark a case
`reviewed` without evidence. The review format is in
[`services/lab/reviews/schema.json`](../services/lab/reviews/schema.json) and
[`MANUAL-EVIDENCE.md`](../services/lab/reviews/MANUAL-EVIDENCE.md).

## Classify before you record

| Label | Meaning |
|---|---|
| ACT failed / passed | The declared target's outcome for the named ACT rule |
| Verified WCAG failure | A person confirmed a WCAG 2.1/2.2 failure with evidence |
| Best-practice concern | Useful improvement, not a WCAG failure by itself |
| Usability concern | Affects the experience but may not fail a specific criterion |
| Context-dependent / disputed | The conclusion depends on context or reviewers disagree |
| Needs more testing | The available evidence cannot settle the outcome |

An ACT pass is not a WCAG pass. A missing automated finding is not a pass.

## 1. Image alternatives — correlation fixtures

**Pages:** `/lab/correlation/two-images/`, `/lab/correlation/single-image/`, and the original `/steps/end/`.

**Setup:** a screen reader and a browser you support.

1. Open the two-image page. List the images in the screen reader's images list.
2. Record the announced alternative for `missing-alt-a`, `missing-alt-b` and `named-image-control`.
3. Open the single-image page and repeat for the one image.
4. Open the original confirmation page. Listen to the image announcement and compare it with the surrounding instructions.
5. Compare what you heard with what is visible.

**Expected:** the two failing images have no accessible name; the control announces "A goose beside a pond".

**Record:** the announced text, the page, the screen reader/browser versions, and whether the alternative is equivalent to the image's purpose.

## 2. Two rules on one target

**Page:** `/lab/correlation/multiple-rules-one-target/`.

**Setup:** keyboard and a screen reader or accessibility inspector.

1. Tab to the button. Record its announced role and name.
2. Open the accessibility inspector and inspect the computed role and the `role` attribute.
3. Confirm that the invalid `role="goose"` is ignored and the implicit button role remains.
4. Record the two separate rule questions: is there a non-empty name, and is the role value valid?

**Expected:** one element, two independent failures.

**Do not** record the invalid role as a second accessible-name failure; they are different rules on the same target.

## 3. Frames

**Pages:** `/lab/frames/single-frame/`, `/lab/frames/nested-frame/`, `/lab/frames/two-frames/`.

**Setup:** keyboard and screen reader frame navigation.

1. Tab into the frame from the page. Record where focus enters and whether the frame is announced.
2. Use the screen reader's frame list. Record the frame titles and the number of frames.
3. In the nested page, navigate to the inner frame and find the button.
4. In the two-frame page, find both buttons. Confirm that they are in different frames even though both have `id="target"`.
5. Record whether the frame title helps identify the content.

**Expected:** the single and nested targets are unnamed; the two same-ID buttons are different browsing contexts.

## 4. React async and replaced states

**Pages:** `/hedgehog/?state=async` and `/hedgehog/?state=replaced`.

**Setup:** keyboard, screen reader, browser accessibility inspector.

1. Reload `?state=async`. Observe the button before and after the `data-lab-state` becomes `async-ready`. Record what the name is at each point.
2. Reload `?state=replaced`. Record the target's `data-node-version` and accessible name.
3. Activate "Replace the example target". Record the new version and name.
4. Inspect the accessibility tree before and after. Confirm the visible label has not changed but the accessible name has.

**Expected:** the async state gains a name after mount; the replaced state produces a new DOM node with a name.

## 5. Paca nested open shadow root

**Page:** `/paca/?role=valid&shadow=nested`.

**Setup:** browser accessibility inspector.

1. Inspect the custom element. Find `#nested-host` inside its open shadow root.
2. Inspect the inner shadow root and locate `#test-target`.
3. Record its role, name and tab position.
4. Compare what the DOM inspector can see with what the accessibility tree exposes.

**Expected:** `role="button"` and an accessible name inside two open shadow roots.

**Do not** generalize this to closed shadow roots. The existing closed-shadow case is exploratory and makes no engine-visibility claim.

## 6. Interaction reveal

**Page:** `/lab/interaction/reveal-target/`.

**Setup:** keyboard and screen reader.

1. Before interacting, inspect the panel and the button target. Confirm the target is not rendered.
2. Tab to "Show the example target" and press Enter.
3. Confirm `aria-expanded` is `true` and the panel is revealed.
4. Tab to the new button. Record its name.
5. Activate "Hide the example target" and confirm the target is no longer reachable.

**Expected:** the unnamed button exists only after the disclosure opens.

## 7. Interpretation page

**Page:** `/lab/interpretation/`.

**Setup:** keyboard, screen reader and visual inspection.

1. For each case, read the stated tool output and review conclusion.
2. Use the "How to test" steps.
3. Check the link and image cases in a screen reader's lists.
4. Tab through the visual-order example and compare with the visual order.
5. Activate the status button with a screen reader running and listen to the announcement.
6. Record which label from the classification table applies.

**Expected:** some cases are failures, some are best practice, some are usability concerns, and some cannot be settled without context.

## Record the evidence

A review record needs:

- fixture ID and scenario ID;
- ACT rule or WCAG reference, when relevant;
- the classification above;
- reviewer, date, browser/OS, assistive technology and version;
- viewport, zoom and preferences;
- exact steps, expected observation and actual observation;
- evidence references;
- limitations and unresolved questions.

Do not invent an observation. If you did not run it, leave the record `unreviewed`.
