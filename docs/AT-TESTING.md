# Assistive-technology testing

Automated checks in this repository do not establish whether a screen reader, switch,
voice-control or magnification user can complete a task. This document defines how those
observations are recorded.

**Status: no assistive-technology procedure in this repository has been executed.** Every
procedure is recorded with `status: "not-run"`. No screen-reader output is fabricated, and
no `verified` AT result exists in `data/known-defects.json`.

## Environment matrix

Candidate environments. Availability is expected to vary by contributor.

| Platform | Browser | Assistive technology | Priority |
| :--- | :--- | :--- | :--- |
| macOS | Safari | VoiceOver | high |
| macOS | Chrome | VoiceOver | medium |
| macOS | Safari or Chrome | Voice Control | high |
| Windows | Firefox | NVDA | high |
| Windows | Chrome | NVDA | high |
| Windows | Edge | Narrator | medium |
| Windows | Chrome or Edge | JAWS | medium |
| Windows | Supported browsers | Magnifier and contrast themes | medium |
| iOS | Safari | VoiceOver | low |
| Android | Chrome | TalkBack | low |

Prioritise environments a contributor can actually access. A small amount of real evidence
in one environment is worth more than a table of unexecuted claims.

## Recording a result

For each procedure, record:

- platform, browser and assistive-technology version;
- initial focus and navigation mode (browse, forms, quick navigation);
- the interaction performed and the expected announcement or information;
- the observed announcement or information, transcribed where possible;
- whether the task could be completed;
- unexpected focus movement, missing context, repeated information, incorrect semantics, or
  extra interactions required;
- the evidence reference (recording, transcript, screenshot or observation log).

The registry fields are `assistiveTechnologyTests[]`. The example below is illustrative;
no entry in this repository currently has `status: "verified"`.

```json
{
  "platform": "Windows",
  "browser": "Firefox",
  "assistiveTechnology": "NVDA 2026.1",
  "procedure": "Focus the second Remove button and activate it. Listen for confirmation and the next focus position.",
  "status": "verified",
  "evidence": "evidence/nvda-focus-removal-2026-11-26.txt",
  "note": "Focus moved to the body; no confirmation was announced."
}
```

`status` is one of `not-run`, `verified`, `unavailable`, `transcribed`. A `verified` entry
without `evidence` fails validation.

## What the evidence does and does not prove

Keep these distinct. Do not use one as a substitute for another:

- the accessible name computed from markup;
- the accessibility tree exposed by one browser;
- a Playwright ARIA snapshot;
- an emulated screen reader;
- a predicted announcement;
- actual speech or braille output;
- a person's experience of completing the task.

A Playwright assertion that `aria-expanded` stays `false` is evidence of a stale state. It
is **not** evidence of what NVDA says. Both are useful; they answer different questions.

## Procedures already attached to defects

Every new subtle defect carries at least one procedure (see `docs/KNOWN-DEFECTS.md` and
`data/known-defects.json`). Example focuses:

| Defect | Procedure focus |
| :--- | :--- |
| `status-message-not-announced` | Save a draft and listen for a confirmation. |
| `busy-state-not-cleared` | Check availability and listen for the result count. |
| `focus-lost-after-item-removal` | Remove the second attendee and listen for focus position. |
| `switch-pointer-only` | Focus the switch and press Space. |
| `name-contradicts-visible-label` | Compare the spoken name with the visible label. |
| `error-not-associated-with-field` | Submit empty, move to the field and listen for the error. |

## Automation with Guidepup

[Guidepup](https://www.guidepup.dev/) is a candidate for repeatable screen-reader
interaction. It is **not** integrated here:

- no Guidepup dependency exists in this project;
- no Guidepup run has been recorded;
- the procedures above are written so that a Guidepup script could implement them later
  without rewriting the expectations.

If you add Guidepup, keep it optional. Building and testing this project must not require a
screen reader or a specific operating system. Record automation separately from human AT
evidence, and never describe automated speech capture as a user test.

## Unavailable environments

If an environment is unavailable:

- leave the procedure recorded with `status: "not-run"` or `"unavailable"`;
- state the required environment in the pull request;
- do not mark the defect reviewed;
- welcome independent community verification.

Contributions from people who use assistive technology are especially valuable. If you use
a screen reader, switch or voice control, an observation that contradicts the expected
behaviour is a useful finding, not a problem to work around.
