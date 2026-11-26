# Record a Goose Sighting

An intentionally inaccessible fictional government service and testing playground for exploring accessibility barriers, false positives, false negatives, and the limitations of automated accessibility testing.

This project is a fork of the original [Record a Goose Sighting](https://github.com/ministryofjustice/record-a-goose-sighting) exercise created by the UK Ministry of Justice. It builds on that work by introducing additional test cases, modern web technologies, and opportunities to compare human and automated accessibility testing.

**[Explore the live playground](https://mgifford.github.io/record-a-goose-sighting/)**

> **Important:** This project deliberately contains accessibility problems. They are maintained for educational and research purposes. Do not copy the defective implementations into production or fix intentional defects without reviewing the [contribution guidance](docs/CONTRIBUTING-EXERCISE.md).

## Explore the playground

Everything can be explored directly in your browser, without installing anything.

- **[Record a Goose Sighting](https://mgifford.github.io/record-a-goose-sighting/)**: Find accessibility barriers in a fictional government service.
- **[Accessibility testing laboratory](https://mgifford.github.io/record-a-goose-sighting/lab/)**: Explore controlled test cases involving HTML, React, Vue, Web Components, ARIA, dynamic content, and different DOM contexts.
- **[Automated testing blind spots](https://mgifford.github.io/record-a-goose-sighting/blind-spots/)**: Investigate problems automated tools miss and those requiring human judgment.
- **[Testing worksheet](https://mgifford.github.io/record-a-goose-sighting/steps/worksheet/)**: Record your observations before consulting the [answer key](https://mgifford.github.io/record-a-goose-sighting/steps/answers/).

The original exercise takes approximately 20 minutes. The laboratory supports more detailed experimentation and research.

## Defect registry and answer key

Every intentional defect is declared in one generated registry, with a stable identifier,
element locators, expected and actual behaviour, affected capabilities, detection limits and
review status.

- **[Known defect catalogue](https://mgifford.github.io/record-a-goose-sighting/defects/)**:
  filter the 52 declared defects by service, category, WCAG criterion, ACT rule, capability
  and review status.
- [`data/known-defects.json`](data/known-defects.json): the canonical machine-readable registry.
- [`docs/KNOWN-DEFECTS.md`](docs/KNOWN-DEFECTS.md) and
  [`docs/DEFECT-COVERAGE.md`](docs/DEFECT-COVERAGE.md): generated human-readable forms.

The registry is generated from authoritative source records; Markdown, the catalogue and the
manifest are never maintained by hand. `npm run defects:check-sync` fails when they drift, and
`npm run defects:verify` resolves every declared locator in Chromium and reports unresolved,
ambiguous or hidden targets. See
[CONTRIBUTING-DEFECTS.md](docs/CONTRIBUTING-DEFECTS.md) before adding a defect.

The catalogue is the answer key. Do not give it to an evaluator during a blind comparison;
see [OPEN-SCANS-INTEGRATION.md](docs/OPEN-SCANS-INTEGRATION.md).

## What are we testing?

Automated accessibility tools are valuable, but their findings require interpretation.

This project provides reproducible examples for investigating:

- **True positives:** Genuine accessibility failures correctly identified by automated tools.
- **False positives:** Findings reported as failures that do not actually violate the applicable rule or requirement.
- **False negatives:** Accessibility failures that automated tools fail to identify.
- **Inapplicable tests:** Rules that do not apply to a particular element or page.
- **Human judgment:** Issues involving meaning, context, usability, or interpretation that automation cannot reliably resolve.
- **Testing complexity:** Dynamic content, component frameworks, shadow DOM, iframes, user preferences, and interaction states.

Not every reported issue is a WCAG failure, and not every clean automated scan indicates an accessible experience.

The playground is designed for both human testers and automated testing engines. It encourages investigation, disagreement, and evidence-based conclusions rather than treating any single tool as authoritative.

Test cases include documented expected outcomes and review status. Unreviewed expectations are hypotheses, not verified conclusions.

## Human and automated testing

The project supports complementary approaches.

**Human testers** can explore user journeys, keyboard interactions, assistive technology behaviour, visual presentation, and the context of reported issues.

**Automated tools** can evaluate reproducible test cases, compare results against expected outcomes, and help identify differences between testing engines.

[Open Scans](https://github.com/mgifford/open-scans) complements this work:

- **Record a Goose Sighting** maintains test cases, intentional defects, expected outcomes, and manual testing evidence.
- **Open Scans** manages scanner execution, ACT mappings, duplicate detection, cross-engine comparisons, and historical reporting.

Together, these projects provide a foundation for investigating the strengths and weaknesses of automated accessibility testing.

Neither project should be interpreted as providing a definitive ranking of accessibility tools or establishing WCAG conformance.

## Get involved

**Contributions are welcome from developers, accessibility specialists, researchers, designers, content authors, and people interested in improving accessibility testing.**

You can help by:

- Identifying and documenting suspected false positives or false negatives.
- Reviewing test cases and validating their expected outcomes.
- Providing manual testing evidence, including keyboard and assistive technology observations.
- Suggesting realistic accessibility edge cases or more complex testing scenarios.
- Improving the clarity and accessibility of the playground itself.
- Testing different tools and reporting unexpected results.
- Improving documentation, exercises, and workshop materials.

[Report a problem or suggest an improvement](https://github.com/mgifford/record-a-goose-sighting/issues)

[Review the contribution guidelines](docs/CONTRIBUTING-EXERCISE.md)

Intentional accessibility defects must remain reproducible and documented. Changes should preserve consistency between test cases, expected outcomes, documentation, and automated regression tests.

## Getting started locally

**You do not need to run this project locally to use the playground.** The [GitHub Pages site](https://mgifford.github.io/record-a-goose-sighting/) provides direct access to the exercises and laboratory.

Local development is intended for people who want to modify the examples, experiment with new scenarios, or contribute code.

You need Node.js 22 or a compatible newer version and npm.

```bash
git clone https://github.com/mgifford/record-a-goose-sighting.git
cd record-a-goose-sighting
npm ci
npm run build
npm run preview
```

Open `http://127.0.0.1:4173/record-a-goose-sighting/` in your browser.

To run the automated tests:

```bash
npx playwright install chromium
npm test
```

Playwright tests help preserve intentional defects, validate laboratory fixtures, and detect unintended regressions.

See the [documentation](docs/README.md) for detailed development and testing guidance.

## Project status and limitations

This is an experimental educational and research project, not a production government service.

The original Ministry of Justice exercise remains the foundation. This fork adds a static GitHub Pages implementation, additional fictional services, and an expanding laboratory of accessibility testing scenarios.

Test fixtures and automated checks can establish reproducible technical conditions, but they cannot independently establish every accessibility outcome. Human review and supporting evidence remain essential.

Accessibility issues in the exercise and declared laboratory targets are intentional. Unexpected accessibility barriers in the surrounding playground are not and should be reported.

## AI use

Generative AI is used to assist with the creation and ongoing maintenance of this repository, including code, documentation, testing, and development activities.

AI-generated content may contain errors or omissions. Maintainers remain responsible for accepting changes, and AI-generated conclusions are not substitutes for independent verification.

Accessibility findings and expected outcomes should be supported by reproducible evidence. Community review, corrections, and contributions are encouraged.

## Documentation

The [documentation index](docs/README.md) provides more detailed information, including:

- [Facilitator guide](docs/FACILITATOR-GUIDE.md)
- [Manual testing scripts](docs/MANUAL-TEST-SCRIPTS.md)
- [ACT fixture guidance](docs/ACT-MANIFEST-GUIDE.md)
- [Detection matrix](docs/DETECTION-MATRIX.md)
- [Fixture coverage and limitations](docs/COVERAGE-MATRIX.md)
- [Original exercise and preservation history](docs/original-goose-baseline.md)

## License and attribution

This project is available under the [MIT License](LICENCE.txt).

It is a fork of [Record a Goose Sighting](https://github.com/ministryofjustice/record-a-goose-sighting), originally developed by the UK Ministry of Justice using the GOV.UK Design System.

The original exercise demonstrates how accessibility barriers can be introduced even when teams use established design systems.

This fork preserves that educational foundation while extending it into a broader playground for human and automated accessibility testing, including the investigation of false positives, false negatives, and ambiguous results.

Contributions and improvements are welcome.
