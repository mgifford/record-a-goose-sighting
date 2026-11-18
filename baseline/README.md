# Baseline: the original Express application

This directory is the reference snapshot used to prove that the static
migration preserved the exercise. It was captured **before** any template was
changed, from commit `3f23c97` (the tip of `master` at the time), and must not
be regenerated casually.

## What was captured

| Path | Contents |
|---|---|
| `html/*.html` | Rendered DOM of all nine URLs after page load |
| `screenshots/desktop/*.jpg` | Full-page screenshots at 1280 × 720 |
| `screenshots/mobile/*.jpg` | Full-page screenshots at 375 × 667 |
| `metrics.json` | Per page: title, headings, landmarks, links, forms, fields, images, `tabindex`, computed styles, focus styles, related-link order, keyboard focus sequence, axe results, failed requests and console errors |

Capture method: Chromium 159 (Playwright), axe-core 4.14.1 with the
`wcag2a, wcag2aa, wcag21a, wcag21aa, best-practice` rule sets. The tooling is in
`tests/tools/capture.mjs`; the comparison tool is `tests/tools/compare.mjs`.

## Toolchain caveat

The original `package.json` dev-dependencies include `node-sass` 4.14.1 and
`gulp-sass` 4, which have no prebuilt binary for a supported Node.js release
(Node 22.20 was used here). `npm install --ignore-scripts` installs the
JavaScript dependencies, but `gulp generate-assets` cannot run.

Gulp's only role in this repository was compiling Sass and copying assets, so
the baseline stylesheet was compiled directly from the **unchanged**
`app/assets/sass/unbranded.scss` with dart-sass 1.108.2. This substitution did
not affect rendering: the static build (also compiled with dart-sass) produced
byte-identical screenshots and identical computed styles at both viewports.

## What the baseline contains

| Page | Described issues | axe findings |
|---|---:|---|
| Instructions (`/`) | — | none |
| Start | 5 | `region` |
| Do you like geese? | 4 | `color-contrast`, `document-title` |
| What type of goose? | 3 | none |
| When did you see the goose? | 0 | none |
| Check your answers | 2 | `heading-order` |
| Confirmation | 4 | `image-alt` |
| Worksheet | — | none |
| Answers | — | none |
| **Total described** | **18** | |

The keyboard focus order confirms several of the plantings: the related links
are reached in DOM order (Wikipedia → More → RSPB) while appearing in a
different visual order (Wikipedia → RSPB → More), and the geese-liked Continue
button is never reached by Tab (`tabindex="-1"`).

## The 18-versus-19 discrepancy

The answers page says "There are 19 issues in total" and then describes 18
issues. This is not a migration regression; git history explains it.

- Commit `66a64cb` ("Add role=button to start button and removes from answers
  page", March 2020) removed the answer that read *"`Role="button"` missing on
  link to next page"* and added `role="button"` to the link in
  `app/views/index.html`.
- The count in the answers page was never updated.

**Recommendation (not applied in this migration):** change the sentence to
"18 issues". The alternative — adding a nineteenth described issue — would
require adding a new planted defect, which is out of scope. The migration
preserves the text exactly, and
`tests/accessibility-regression.spec.js` asserts that the page still says 19
while listing 18, so the discrepancy cannot be silently "fixed" without a
deliberate decision.

## Intentional problems vs. unexpected ones

The baseline also records defects that are **not** part of the answer sheet.
These were preserved behaviourally, but they should not be mistaken for
teaching material:

- Malformed markup: a stray `</p>` in `steps/start.html` and `</p></p>` in
  `steps/end.html`.
- `role="button"` on two `<a>` elements (`index.html` and `steps/start.html`).
  This was added deliberately in `66a64cb`, but Space does not activate a link,
  so the accessible role promises behaviour the element does not provide.
- Four of the six step pages have no Back link; the step pages deliberately use
  the unbranded layout, so there is no service header or footer.
- The confirmation page's remote GIF is 352px wide and has no `max-width`, so
  the page scrolls horizontally below roughly 368px. This is pre-existing and is
  recorded by the reflow test as an allowed, explained exception.
- The `mask-icon` link pointed at a file that did not exist
  (`gov.uk_logotype_crown.svg`). The static build points it at the
  `govuk-mask-icon.svg` file that is actually shipped. This has no visual effect.

## Migration parity result

After the migration the same capture was run against the static build
(`SITE_BASE=/record-a-goose-sighting/`), and `tests/tools/compare.mjs` reported:

```text
0 difference(s) between metrics.json and metrics.json
```

All 18 screenshots (nine pages × two viewports) were byte-identical. The only
observed difference was the removal of Google Analytics beacons, which is an
explicit goal of the migration.

## Recapturing the original baseline

The original application is no longer in the working tree, but it is in git
history. If you ever need to recapture it:

```bash
git worktree add ../goose-legacy 3f23c97
cd ../goose-legacy
npm install --ignore-scripts
mkdir -p public/stylesheets public/javascripts public/images
node_modules/.bin/sass app/assets/sass/unbranded.scss \
  public/stylesheets/unbranded.css --load-path=.
cp app/assets/javascripts/*.js public/javascripts/
cp app/assets/images/* public/images/
node -e "require('./server.js').listen(3999, '127.0.0.1')"
```

Then, from the migrated checkout:

```bash
node tests/tools/capture.mjs http://127.0.0.1:3999 baseline
```

Note that this overwrites the committed evidence. Only do it if you are
deliberately re-baselining, and record why.
