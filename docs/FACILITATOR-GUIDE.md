# Facilitator guide

This guide is for people running the **Record a goose sighting** exercise in a
workshop, classroom or team session. It is not needed by learners. Do not hand
it out before the exercise: it discusses the answers.

## What the exercise is for

The service is deliberately inaccessible. Learners review six pages, find as
many problems as they can, and then compare their findings with the answer key.
The point is not to produce a clean automated score. It is to practise
reviewing a service the way a person would use it.

The exercise contains 19 described issues.
discrepancy is explained in [original-goose-baseline.md](original-goose-baseline.md).
Do not present it as 19 without explaining that the list enumerates 18.

## Formats

| Format | Time | Structure |
| :--- | ---: | :--- |
| Solo practice | 20 min | 15 min review, 5 min self-check against the answers |
| Team workshop | 60 min | Intro, 20 min review, 20 min debrief, 10 min automation gap, wrap |
| Deep dive | 90 min | Team workshop plus a screen-reader walkthrough and ACT lab discussion |

### 60-minute plan

| Time | Activity | Notes |
| ---: | :--- | :--- |
| 0–5 | Frame the exercise | It is fictional; defects are intentional; no blame |
| 5–10 | Tools and constraints | Keyboard, browser, Accessibility Insights; ask people to try keyboard-only first |
| 10–30 | Review in pairs | One drives, one records; swap after 10 minutes |
| 30–50 | Debrief by page | Use the prompts below; collect findings before revealing answers |
| 50–58 | Automation gap | Show [/blind-spots/](https://mgifford.github.io/record-a-goose-sighting/blind-spots/) and the 4/14 split |
| 58–60 | Wrap | One thing to change in their next review |

Do not let the group open the answers during the review. The worksheet is at
`/steps/worksheet/`; the answer key is at `/steps/answers/`.

## Before the session

- Open the service at <https://mgifford.github.io/record-a-goose-sighting/> in
  a current browser.
- Have Accessibility Insights for Web installed
  (<https://accessibilityinsights.io/docs/web/overview/>), but do not
  require it.
- If screen reader testing is part of the session, test the route with the
  screen reader and browser pair you will demonstrate. Announcements vary.
- Give learners the worksheet ahead of time if they need to prepare.
- Make clear that the exercise is not a simulation of a disabled person's
  experience; it is a review of a deliberately broken service.

## Debrief prompts by page

### Start page

- How many first-level headings are there? Does that matter to a user?
- Tab through the related links. Does the focus order match what you see?
- Can you see where focus is?
- What does the "More" link tell you out of context?
- What happens when you open the RSPB link?

### Do you like geese?

- What is announced when the page loads?
- How is the radio group named?
- Can you reach Continue with the keyboard?
- Is the hint readable against the background?

### What type of goose did you see?

- What is the page called in the tab or title bar?
- Tab once. Where did focus go, and can you see it?
- Type something. Where did the instruction go?

### When did you see the goose?

- This page is intentionally clean. Why is it useful to include a page with no
  deliberate issues?
- What would you check here anyway?

### Check your answers

- Read the Change links out of context. What do they change?
- What is the heading outline?

### Confirmation

- What is the image announcing?
- Can you pause the animation?
- Read the paragraph: do the spaces between words look even?

## Common traps

- **"The tool passed it."** Automated checks catch 4 of the 19 described
  issues. Show the detection matrix: a clean report is not a clean page.
- **"I tabbed through and it worked."** Reaching a control is not the same as
  seeing where focus is, or knowing what it does.
- **"The screen reader read it, so it is fine."** A screen reader will read a
  poor link or a meaningless title accurately. Judge the output, not whether
  sound came out.
- **Treating every finding as a WCAG failure.** The inventory records whether
  each issue is a failure, a best practice, or a manual concern. Do not
  overclaim.
- **Testing only at desktop width.** Reflow at 320 CSS pixels (roughly 400% at
  1280) exposes different problems.
- **Colour contrast in isolation.** Check focus indicators and forced-colours
  mode too.

## Handling disagreement

Ask the group to record:

1. the page and element;
2. what they did;
3. what happened;
4. who it affects and how;
5. whether it is a WCAG failure, a best practice, or a judgement call.

If two people disagree, keep both observations. The exercise is a starting
point for review practice, not a certification.

## Accessibility of the session itself

- Share materials in advance in an accessible format.
- Caption live sessions; describe what you are doing when demonstrating.
- Offer keyboard-only and screen-reader routes rather than requiring one.
- Allow extra time; do not cold-call people to describe "what they see".
- Avoid disability simulations as the main teaching method. Reviewing barriers
  is the point; simulating a disability is not required and can mislead.
- Provide the worksheet in plain text if the HTML form is difficult to use.

## After the session

Send learners:

- the [worksheet](https://mgifford.github.io/record-a-goose-sighting/steps/worksheet/)
- the [answers](https://mgifford.github.io/record-a-goose-sighting/steps/answers/)
- the [detection matrix](https://mgifford.github.io/record-a-goose-sighting/blind-spots/)
- the [manual test scripts](MANUAL-TEST-SCRIPTS.md)
- the [laboratory](https://mgifford.github.io/record-a-goose-sighting/lab/) if
  they want isolated ACT cases and the framework variants

Suggest one follow-up: review a real service they own using the same five
questions from the disagreement section above.
