# Framework parity contract

The Goose journey is the process reference. The React (Hedgehog), Vue (Wombat)
and Web Components (Paca) services reproduce the **process**, not the Goose
content or its 19 defects.

## Level of parity

This project targets **process parity plus explicit ACT targets**:

- the same steps, fields and transitions;
- the same validation and check/change behaviour;
- deterministic, addressable states;
- explicit ACT targets with declared outcomes;
- no accidental accessibility defects in the surrounding journey.

It does **not** copy every Goose problem into every framework. Those problems
belong to the original exercise and its inventory. Framework-specific defects
must be declared as fixture targets with their own evidence.

## Steps

| Step | Purpose | Required data | Transition |
|---|---|---|---|
| `start` | Introduce the service | none | `liked` |
| `liked` | Ask whether the user likes the animal | `liked` | `type` |
| `type` | Ask what type was seen | `type` | `date` |
| `date` | Ask when it was seen | `dateDay`, `dateMonth`, `dateYear` | `check` |
| `check` | Review answers and change them | all of the above | `done` |
| `done` | Confirmation and reset | all of the above | `start` |

## Addressability

Each state is addressable with a query parameter:

```text
/hedgehog/?step=liked
/wombat/?step=check
/paca/?step=date
```

- The default is `start`.
- The ACT experiment state remains `?state=...` and is independent of `?step=`.
- Steps work on GitHub Pages without a server fallback.
- Each step can be opened directly; saved answers come from session storage.
- A direct deep link with no saved answers must render the step, not crash.

## Data and persistence

- Answers are stored in session storage under a framework-specific key.
- Answers are never sent to a server.
- A reset clears the answers and returns to `start`.
- Query parameters do not contain personal answers; they identify the step only.

## Validation and errors

- `liked`, `type` and a real calendar date are required.
- Validation happens when advancing, not on every keystroke.
- On failure:
  - an error summary receives focus;
  - each error link points to the field;
  - the field has `aria-invalid="true"` and an associated error message;
  - the error summary uses `role="alert"`.
- On success, the next step's heading receives focus.

## Focus, status and headings

- Each step has one `h1`.
- Moving to a new step updates the document title and moves focus to the `h1`.
- A polite live region announces the step change.
- The ACT experiment heading is an `h2` below the page `h1`.
- Back and Change actions preserve the answers.

## Check and change

- The check step uses a table with a caption.
- Each answer has a Change control that returns to the relevant step.
- Continuing from check validates all required answers, including when the
  check step was opened directly.

## ACT targets

The existing ACT experiment stays in every framework:

- target `#test-target`;
- rule 97a4e1 where the name is the subject;
- `?state=initial|updated` and the framework-specific dynamic states;
- readiness markers are deterministic.

The journey must not accidentally give the target a name or change its state.

## Non-goals

- Copying the Goose content verbatim.
- Copying all 18 Goose defects.
- Replacing the original exercise.
- Introducing a server, router dependency or new framework.

## Verification

Parity tests will run the same scripted journey against each framework:

1. start → liked with validation failure and success;
2. liked → type → date with invalid and valid dates;
3. check shows the values and Change returns with answers preserved;
4. done is reached and reset returns to start;
5. direct deep links are deterministic;
6. focus and error-summary behaviour match the contract;
7. the ACT target remains unchanged.

## Implementation status

| Framework | Status |
|---|---|
| React (Hedgehog) | Reference implementation |
| Vue (Wombat) | Ported to the same contract |
| Web Components (Paca) | Ported to the same contract |

All three implementations now follow the same contract. React remains the reference.
