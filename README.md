# Record a goose sighting

> **This is a fictional government service used for accessibility training. It
> deliberately contains accessibility problems. Do not copy this code as an
> example of accessible markup — and do not "fix" the problems you find here
> without reading [Intentional accessibility problems](#intentional-accessibility-problems).**

A static rebuild of the [Ministry of Justice](https://github.com/ministryofjustice/record-a-goose-sighting)
GOV.UK Prototype Kit exercise. The exercise has been migrated from a
continuously running Express application to a static site built with Nunjucks
and hosted on GitHub Pages. The exercise itself — its content, appearance,
journey and planted accessibility problems — is unchanged.

**Hosted exercise:** <https://mgifford.github.io/record-a-goose-sighting/>

## What the exercise is

You are asked to review a made-up service for recording goose sightings. The
service uses GOV.UK Design System components, but they have been misused in a
number of places. Your task is to find as many of the accessibility problems as
you can in about 20 minutes, using the keyboard, WAVE and the browser
developer tools.

The journey has six pages:

1. Start page
2. Do you like geese?
3. What type of goose did you see?
4. When did you see the goose?
5. Check your answers
6. Confirmation

There is a [worksheet](https://mgifford.github.io/record-a-goose-sighting/steps/worksheet/)
for recording findings and an [answers page](https://mgifford.github.io/record-a-goose-sighting/steps/answers/)
describing the planted problems.

### 18 issues are described, but the answers page says 19

The answers page originally said "There are 19 issues in total" and then
described **18** issues. The sentence now reads "There are 19 issues in total
(likely 18)" so that learners are not misled by a stale count.

The discrepancy is a content defect in the original exercise, not a migration
defect. Commit `66a64cb` removed a nineteenth answer when the underlying problem
was "fixed", but the total was never updated. See
[baseline/README.md](baseline/README.md) for the history and the remaining
recommendation to settle on a single number.

## Running the site locally

Requirements: Node.js 22 LTS and npm.

```bash
git clone https://github.com/mgifford/record-a-goose-sighting.git
cd record-a-goose-sighting

npm ci
npm run build
npm run preview
```

`npm run preview` serves the generated site at
<http://127.0.0.1:4173/record-a-goose-sighting/>, matching the GitHub Pages
subpath.

To preview at the domain root instead (useful when comparing with the original
application):

```bash
SITE_BASE=/ npm run build
SITE_BASE=/ npm run preview
```

On PowerShell, set the variable first: `$env:SITE_BASE="/"`.

`dist/` is generated and is not committed. `npm run build` fails if an
intentional defect has been removed from the templates or stylesheet, if a
root-relative URL has crept in, or if a required asset is missing.

## Running the tests

```bash
npx playwright install chromium
npm test
```

`npm test` rebuilds the site, starts the local preview server and runs the
Playwright suite:

| File | What it covers |
|---|---|
| `tests/journey.spec.js` | The six page journey, persistence, editing, refresh, back/forward, HTML injection, storage failure, no-JavaScript fallback, reflow at 320px/375px/640px |
| `tests/accessibility-regression.spec.js` | Every intentional accessibility problem, plus axe results compared with the original application's baseline |
| `tests/static-build.spec.js` | All nine URLs, assets, internal links, absence of server runtime or analytics, dependency limits |

To run the suite in all three Playwright engines:

```bash
npx playwright install
BROWSERS=all npx playwright test
```

GitHub Actions runs the suite in Chromium, Firefox and WebKit on every push and
pull request.

### Baseline tooling

`baseline/` contains a captured snapshot of the original Express application:
rendered HTML, screenshots at desktop and mobile sizes, keyboard focus order,
computed styles and axe results. Two tools support it:

```bash
# Capture the current site (writes to a new directory)
node tests/tools/capture.mjs http://127.0.0.1:4173/record-a-goose-sighting/ my-capture

# Compare two captures
node tests/tools/compare.mjs baseline/metrics.json my-capture/metrics.json
```

## Deployment

`.github/workflows/pages.yml` builds, tests and publishes the site:

- Pull requests targeting `master` build and run the full test suite but do not
  publish.
- Pushes to `master` (the default branch) deploy, as does the manual
  `workflow_dispatch` trigger.
- No repository secrets are required.

**Required one-time setup:** open the repository **Settings → Pages** and set
**Build and deployment → Source** to **GitHub Actions**. Committing the workflow
is not sufficient on its own, and Pages is not enabled for this repository at
the time of writing. Once enabled, the workflow publishes to
<https://mgifford.github.io/record-a-goose-sighting/>.

The deployment path is set in two places, both of which must change together if
the repository is renamed:

- `SITE_BASE: /record-a-goose-sighting/` in `.github/workflows/pages.yml`
- `BASE_PATH` in `playwright.config.js`

### Repository protections

Dependency updates are handled by Dependabot
([`.github/dependabot.yml`](.github/dependabot.yml)). `govuk-frontend` is
excluded from automated updates: changing its major version is a separate
project (see [docs/govuk-frontend-upgrade.md](docs/govuk-frontend-upgrade.md)).

Branch protection is a repository setting rather than a file. To require the
test job on pull requests while keeping direct pushes to `master` working:

```bash
gh api -X PUT repos/mgifford/record-a-goose-sighting/branches/master/protection \
  --input - <<'JSON'
{
  "required_status_checks": { "strict": false, "contexts": ["Build and test"] },
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
```

## Architecture

```text
app/
  assets/images/          favicon and touch icons
  assets/javascripts/
    application.js        initialises GOV.UK Frontend
    goose-session.js      sessionStorage persistence for form answers
  assets/sass/
    unbranded.scss        the single stylesheet (including planted defects)
  views/
    layout_unbranded.html GOV.UK template with branding suppressed
    includes/scripts.html script order
    index.html            instructions
    steps/*.html          the six exercise pages, worksheet and answers
scripts/
  build.mjs               Nunjucks rendering, Sass compilation, asset copying
  serve.mjs               static preview server for the Pages subpath
tests/
  *.spec.js               Playwright suites
  baseline/axe.json       recorded axe findings from the original application
  tools/                  capture and comparison utilities
baseline/                 snapshot of the original Express application
dist/                     generated output (not committed)
```

- **Templates:** the existing Nunjucks templates are rendered at build time. No
  template engine runs in the browser.
- **Styling:** [GOV.UK Frontend](https://github.com/alphagov/govuk-frontend)
  3.15.0, compiled with dart-sass. The frontend major version is pinned
  deliberately: upgrading it could change the markup and behaviour that the
  exercise depends on. That would be a separate project.
- **No backend:** there is no Express server, database or API. The generated
  `dist/` directory contains only HTML, CSS, JavaScript, fonts, images and
  `.nojekyll`.
- **Answers:** form values are kept in `sessionStorage` under the key
  `goose-sighting-exercise:v1`, scoped to the browser tab. The check-your-answers
  page fills its summary from that storage using `textContent`, so submitted
  text is never interpreted as HTML. If the browser blocks storage (for example
  after a privacy setting), the pages still navigate but answers are not
  retained — that limitation is deliberate and documented rather than worked
  around with a server or cookies.
- **Navigation:** forms use `method="get"` so that they degrade to normal
  navigation without JavaScript. When JavaScript is available, submission is
  intercepted, the answers are saved, and the browser navigates to a clean URL —
  answers do not appear in the query string.

### Why no jQuery or Prototype Kit runtime

The original application loaded jQuery 1.11.3 and a Prototype Kit
`auto-store-data` script that posted every form to the server. Neither is
needed: GOV.UK Frontend 3 is dependency-free, and `goose-session.js` replaces
the session middleware. Removing them changed no rendered output: at migration
time the screenshot comparison was pixel-identical to the original at both
desktop and mobile widths (see [baseline/](baseline/)).

Two deliberate follow-up changes now diverge from that snapshot: the answers
page annotates the stale count, and the confirmation page uses a locally
generated GIF instead of one hotlinked from giphy.com.

## Intentional accessibility problems

The following problems are part of the exercise. The tests in
`tests/accessibility-regression.spec.js` **fail if they are fixed**, because a
silent fix would reduce the value of the exercise and would contradict the
answers page.

| Page | Planted problem |
|---|---|
| Start | Two `<h1>` elements |
| Start | DOM order of the related links differs from their visual order (CSS `order`) |
| Start | Link opens in a new tab (`target="_blank"`) without warning |
| Start | Ambiguous "More" link text |
| Start | Focus indicator removed from the related links (`.link:focus`) |
| Do you like geese? | Empty page `<title>` |
| Do you like geese? | Radio group has no `<legend>` (the question sits outside the fieldset) |
| Do you like geese? | Continue button excluded from keyboard focus (`tabindex="-1"`) |
| Do you like geese? | Hint text fails contrast (`#9d9da1` on white) |
| What type of goose? | Page title is "Boop - Record a goose sighting" |
| What type of goose? | Visually hidden "Ghost goose" text is keyboard focusable (`tabindex="0"`) |
| What type of goose? | Instructions only available as placeholder text |
| When did you see the goose? | None — this page is intentionally clean |
| Check your answers | Visually hidden Change-link text reads "biscuits" / "cake" |
| Check your answers | Heading hierarchy jumps from `<h1>` to `<h3>` |
| Confirmation | Uppercase heading "GOOSE RECORDED" |
| Confirmation | Justified paragraph |
| Confirmation | Animated GIF with no `alt` attribute |
| Confirmation | Animation cannot be paused or stopped |

If you change any of these on purpose — for example to modernise the exercise —
update the answers page, this table, `tests/accessibility-regression.spec.js`
and `tests/baseline/axe.json` in the same change. Do not run an accessibility
tool with autofix enabled.

Note that automated tools only detect a subset of these problems: the axe
baseline contains five rule types (`region`, `color-contrast`,
`document-title`, `heading-order`, `image-alt`). The others need keyboard and
visual checks, which is part of the lesson.

## Privacy

- Answers typed into the exercise stay in the browser tab's `sessionStorage`.
  They are never sent to a server and disappear when the tab is closed.
- Google Analytics has been removed. The original application loaded GA4
  (`G-S0FNENEJGR`) on every page; the static site loads no analytics.
- Every asset is served from this site, including the confirmation-page GIF.
  The GIF is generated for this repository by
  `scripts/art/make-goose-gif.py`, so there is no third-party image request and
  no image licensing ambiguity. The GIF is animated and has no alternative text
  because that is part of the exercise.
- Pages carry `<meta name="robots" content="noindex">` and `robots.txt` contains
  `Disallow: /`. These reproduce the original `X-Robots-Tag: noindex` *intent*
  as best GitHub Pages allows. They are advisory; they are not access control.

## Licence and attribution

Released under the MIT Licence — see [LICENCE.txt](LICENCE.txt). The licence
notice (Crown Copyright, Government Digital Service) is preserved in
`dist/LICENCE.txt`.

The original exercise was created by the Ministry of Justice:
<https://github.com/ministryofjustice/record-a-goose-sighting>. This repository
is a static rebuild of that work. Other versions of the exercise include the
[NHS accessibility exercise](https://github.com/nhsuk/accessibility-training)
and the Co-op's [Report a leaky bag of flour](https://github.com/coopdigital/return-a-leaky-bag-of-flour).

## Contributing

Feedback and corrections are welcome — open an issue or a pull request. When
contributing, please keep the migration's central constraint in mind: **the
fictional service is supposed to be inaccessible**. Improvements to the testing
infrastructure, documentation, build or deployment are welcome; improvements to
the exercise pages are changes to the exercise and need to be discussed first.
