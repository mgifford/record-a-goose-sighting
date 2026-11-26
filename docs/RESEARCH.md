# Research and sources

The benchmark exists to test testing methods, not to settle conformance questions. Each
source below informs a defect family, a detection limit, or the review process.

## How this list was verified

- Verification date: 2026-11-26.
- Method: `curl -L --max-time 20` from the repository environment; every URL below
  returned HTTP 200 on that date.
- A live URL is not an endorsement and does not prove that the page's claims are correct.
  Where publication metadata was checked, it is stated. Where it was not, the entry says so.
- Normative W3C specifications are marked **normative**. Everything else is informative.
- Examples in this repository are original. No third-party example implementation is
  copied. W3C pattern guidance is referenced, not reproduced.

## Normative specifications

| Source | Type | What it informs |
| :--- | :--- | :--- |
| [W3C Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/) | normative | Success criteria and conformance requirements. Verified as a W3C Recommendation dated 12 December 2024. |
| [WAI-ARIA 1.2](https://www.w3.org/TR/wai-aria-1.2/) | normative | Roles, states, properties and the `aria-busy` semantics used by the status fixtures. |
| [Accessible Name and Description Computation 1.2](https://www.w3.org/TR/accname-1.2/) | normative | Why a hidden element referenced by `aria-describedby` can still contribute a description, and why the registry distinguishes names from descriptions. |

## W3C guidance and pattern material

| Source | Type | What it informs |
| :--- | :--- | :--- |
| [Understanding WCAG 2.2](https://www.w3.org/WAI/WCAG22/Understanding/) | informative | The normative reading of each success criterion. Used for the `wcag[].status` rationale. |
| [Techniques for WCAG 2.2](https://www.w3.org/WAI/WCAG22/Techniques/) | informative | Sufficient and advisory techniques, including H42 (headings) and H71 (fieldset and legend). |
| [W3C ACT Rules](https://www.w3.org/WAI/standards-guidelines/act/rules/) | informative | The rule identifiers preserved from the existing ACT manifest. |
| [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/) | informative | Interaction models for disclosure, switch and combobox patterns. APG patterns are guidance, not WCAG requirements; the registry states that distinction explicitly. |
| [Making Content Usable for People with Cognitive and Learning Disabilities](https://www.w3.org/TR/coga-usable/) | informative | Cognitive and comprehension defect families, and the classification of usability concerns. |
| [ARIA in HTML](https://www.w3.org/TR/html-aria/) | informative | Which roles are valid on which elements, relevant to the ARIA validity fixtures. |

## Automated testing research

| Source | Type | What it informs |
| :--- | :--- | :--- |
| Jonathan Robert Pool, [Accessibility Metatesting: Comparing Nine Testing Tools](https://arxiv.org/abs/2304.07591) (arXiv:2304.07591, submitted 15 April 2023, CC BY 4.0) | peer-reviewed preprint | Evidence that comprehensive tools duplicate little and each finds instances others miss. Justifies engine observations rather than a single score. |
| [Coverage of Web Accessibility Guidelines Provided by Automated Checking Tools](https://link.springer.com/article/10.1007/s10209-025-01263-x) (Universal Access in the Information Society) | journal article | Coverage claims for automated tools; supports the warning that a clean scan is not a conformance claim. Publication metadata not independently re-verified. |
| Equal Entry, [What Automated Accessibility Testing Misses](https://equalentry.com/what-automated-accessibility-testing-misses/) | practitioner article | The detection-boundary categories used in `docs/DETECTION-MATRIX.md`. Publication metadata not independently verified. |
| Equal Entry, [Comparison of Automated Testing Tools](https://equalentry.com/digital-accessibility-automated-testing-tools-comparison/) | practitioner article | Engine comparison expectations for the Open Scans boundary. Publication metadata not independently verified. |

## Component libraries and practical guidance

| Source | Type | What it informs |
| :--- | :--- | :--- |
| [TetraLogical Accessible Components Library](https://tetralogical.com/blog/2026/10/14/accessible-components-library/) | practitioner article | Correctly implemented comparison patterns for disclosures, switches and status messages. |
| [DWP Accessibility Manual](https://accessibility-manual.dwp.gov.uk/) | government guidance | Form error recovery, focus management and content conventions used by the fictional services. |
| [Accessibility Insights for Web](https://github.com/microsoft/accessibility-insights-web) | open-source tool | The Fast Pass model referenced by the original exercise documentation. |
| [GOV.UK Design System: Error summary](https://design-system.service.gov.uk/components/error-summary/) | design system guidance | The expected error-summary behaviour that variant B of the errors fixture implements. |
| [Ministry of Justice: Record a goose sighting](https://github.com/ministryofjustice/record-a-goose-sighting) | original exercise | The 19 preserved defects and their provenance. |

## Assistive technology automation

| Source | Type | What it informs |
| :--- | :--- | :--- |
| [Guidepup](https://www.guidepup.dev/) and [guidepup/guidepup](https://github.com/guidepup/guidepup) | open-source project | A candidate for repeatable screen-reader interaction. Not adopted here: no procedure in this repository claims Guidepup coverage, and no recorded output exists. |

## How sources map to defect families

| Defect family | Primary sources |
| :--- | :--- |
| Accessible names and descriptions | AccName 1.2, WCAG 2.2 4.1.2 and 2.5.3, ACT rules 97a4e1, c487ae, e086e5 |
| ARIA validity and state | WAI-ARIA 1.2, ARIA in HTML, APG |
| Focus management | WCAG 2.2 2.4.3 and 2.4.7, DWP manual, APG |
| Dynamic content and status messages | WCAG 2.2 4.1.3, WAI-ARIA `aria-busy`, TetraLogical examples |
| Forms and error recovery | WCAG 2.2 3.3.1 to 3.3.3, GOV.UK error summary guidance, DWP manual |
| Keyboard and alternative input | WCAG 2.2 2.1.1 and 2.1.2, APG keyboard models |
| Structure and reading order | WCAG 2.2 1.3.1 and 2.4.6, techniques H42 and H71 |
| Images and alternative text | WCAG 2.2 1.1.1, ACT rule 23a2a8, WAI images tutorial |
| Motion, timing and preferences | WCAG 2.2 2.2.2 and 2.3.3, `prefers-reduced-motion` |
| Detection limits | Pool 2023, Springer coverage study, Equal Entry articles |

## Attribution rules for new material

- Do not copy a third-party component implementation into a fixture.
- If a fixture is inspired by a published pattern, say so in the record's `sources` with a
  note describing what was learned, not what was copied.
- Do not reproduce long excerpts from articles. Link and summarise.
- Media must be original or appropriately licensed and recorded in the fixture source.
- Distinguish normative requirements from informative guidance in `wcag[].status`.
