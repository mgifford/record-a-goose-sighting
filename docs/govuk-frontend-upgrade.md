# GOV.UK Frontend 4/5 upgrade — separate project

**Status:** assessed, not started. This document scopes the upgrade so it can be
done deliberately rather than as a side effect of another change.

The exercise currently pins **GOV.UK Frontend 3.15.0**. Upgrading to the
current major version (5.x) is worthwhile, but it will change rendered markup,
typography, spacing and focus styling. That means the committed
[baseline](../baseline/README.md) and several of the planted accessibility
problems must be re-verified. It must not be folded into routine maintenance.

## Why it is a separate project

- **It invalidates the baseline.** The baseline proves parity with the original
  Express app. A major upgrade changes the visual output by design, so a new
  baseline must be captured and reviewed.
- **It can change the taught defects.** The exercise depends on component
  behaviours (missing legend, summary list, date input, panel, focus styling).
  Each of the 19 described issues must be re-checked against the new component
  output — and still preserved.
- **It changes the JavaScript loading model.** GOV.UK Frontend 5 ships an ES
  module, so `application.js` and the script tags change shape.
- **It is not required for the GitHub Pages migration.** 3.15.0 is stable,
  works offline, and is pinned in `package-lock.json`.

## Feasibility findings (spike, GOV.UK Frontend 5.14.0)

Verified by inspecting the published npm package:

| Area | Finding |
|---|---|
| Nunjucks templates | Shipped under `dist/govuk/` — 76 `.njk` files, including `dist/govuk/template.njk`, so build-time rendering is still possible |
| Sass entry point | `dist/govuk/index.scss` (the old `dist/govuk/all.scss` still exists but is deprecated and warns) |
| Prototype Kit shim | `dist/govuk-prototype-kit/init.scss` exists; it shows the supported way to configure `$govuk-assets-path` and `$govuk-global-styles` |
| Settings | Still plain `!default` Sass variables, so a wrapper stylesheet can set `$govuk-assets-path` before importing the index |
| JavaScript | `dist/govuk/govuk-frontend.min.js` is an ES module; `initAll` must be imported rather than read from a global |
| Assets | Images and fonts move to `dist/govuk/assets` |
| Missing legend | `dist/govuk/components/fieldset/template.njk` still omits `<legend>` when there is no legend text, so the geese-liked defect survives unchanged |
| Inline radios | `govuk-radios--inline` is still present in `components/radios/_index.scss` |
| Confirmation panel | `govuk-panel--confirmation` still exists |

## Known differences to expect

Review the v4.0.0 and v5.0.0 release notes before starting. For this exercise,
the likely visible differences are:

- Typography and spacing are expressed in `rem` rather than `px`, changing
  heading and body sizes slightly.
- Focus styling is thicker/darker; the deliberately broken `.link:focus`
  override must still defeat it.
- Several override classes and component options are deprecated or renamed;
  the templates only use a small subset, but each one needs checking.
- The panel, summary list and date input markup may change subtly; the tests in
  `tests/accessibility-regression.spec.js` assert rendered behaviour, so they
  will identify anything that moves.

## Work plan

1. **Branch and pin.** Create a branch, upgrade to `govuk-frontend@5.14.0` (or
   the then-current 5.x) and commit the lockfile separately from code changes.
2. **Build plumbing.** Point the Nunjucks loader at
   `node_modules/govuk-frontend/dist`, copy assets from `dist/govuk/assets`, and
   compile a wrapper that sets `$govuk-assets-path` then imports
   `govuk/index` (mirroring `dist/govuk-prototype-kit/init.scss`).
3. **JavaScript.** Convert `app/assets/javascripts/application.js` to an ES
   module that imports `initAll` from the frontend bundle, and update
   `includes/scripts.html` to load it with `type="module"`. Keep
   `goose-session.js` independent of the component library.
4. **Fix build validations.** `scripts/build.mjs` asserts specific markup (for
   example the GIF without `alt` and the empty page title). Update only the
   assertions that changed for a legitimate upgrade reason.
5. **Re-run the regression suite.** Every intentional-defect test must still
   pass. Where a component's output legitimately changed, adjust the assertion
   so it still proves the defect (for example, if a legend is now emitted empty
   rather than omitted).
6. **Re-capture the baseline.** Run `tests/tools/capture.mjs` against the
   upgraded build, review every page at both viewports, and replace
   `tests/baseline/axe.json` only for justified rule changes. Store the new
   evidence separately from the historical Express baseline.
7. **Accessibility review.** Re-check the five axe-detectable issues and the
   behavioural ones (focus visibility, tab order, animation, contrast).
   Confirm the answers page still describes the site accurately.
8. **Documentation.** Update the README architecture section, the pinned
   version note, and this document's status.

## Acceptance criteria

- All nine pages render and the six-page journey works.
- All 19 described issues are still present and detectable.
- The axe baseline has been reviewed, not merely regenerated.
- Screenshots at desktop and mobile have been reviewed by a human.
- The build remains static and reproducible; `npm ci && npm run build && npm test`
  passes in Chromium, Firefox and WebKit.
- No new third-party runtime dependency is introduced.

## Rollback

The upgrade lands on its own branch and pull request. Reverting the PR restores
3.15.0; the historical baseline in `baseline/` is unaffected throughout.

## Decision needed before starting

Confirm that a deliberate visual change is acceptable. If the exercise must
remain visually identical to the 2020 original, stay on 3.15.0 and treat this
document as a record of the assessment.
