# Keyboard focus practice

`/steps/keyboard-practice/` is an optional extension to the six-page exercise.
It is not one of the six pages and is not included in the 19-item answer key.

The page deliberately contains three focus problems that an Accessibility
Insights **Fast Pass** does not report. They require using **Tab stops**,
tabbing with the keyboard, and inspecting the rendered focus state.

## The three examples

| Example | What to observe | Classification |
|---|---|---|
| Link with no visible focus | Tab to it; the focus indicator disappears | WCAG 2.4.7 failure |
| Button with a low-contrast focus outline | Tab to it; the outline is nearly the same colour as the page | Best practice / 2.4.7 judgement; focus appearance is not assessed by Fast Pass |
| Link covered by a fixed banner | Tab to it; the fixed banner covers the link and its indicator | WCAG 2.4.11 (2.2 AA) focus-not-obscured failure; possibly 2.4.7 |

The low-contrast example is deliberately classified as a judgement rather than
an automatic failure: WCAG 2.4.7 requires a visible focus indicator, and
whether this outline is sufficiently visible depends on the person and display.
WCAG 2.4.13 Focus Appearance is AAA and is not the main teaching point.

## Before you start

1. Install [Accessibility Insights for Web](https://accessibilityinsights.io/docs/web/overview/) in Edge or Chrome.
2. Open the practice page.
3. Start **Fast Pass**. It should report no automated errors for these examples.
4. Turn on **Tab stops**.
5. Tab through the page and record what happens.

## What to record

- The browser, operating system and zoom.
- The order of focus.
- Whether the focus indicator was visible at each stop.
- For the low-contrast example, the outline and page colours.
- For the obscured example, which part of the link or indicator was covered.
- Whether a screen reader announced the focused link.

Do not mark a review `reviewed` without evidence. Use the format in
[`services/lab/reviews/schema.json`](../services/lab/reviews/schema.json).

## Why Fast Pass misses them

Accessibility Insights Fast Pass runs automated axe-based checks. It does not
tab through the page, simulate keyboard focus, measure the contrast of a focus
indicator, or test whether a fixed element covers the focused control.
