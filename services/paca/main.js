const version = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev'

const shadowStyles = `
  :host { display: block; margin: 1.5rem 0; }
  h2 { font-size: 1.375rem; margin: 2rem 0 0.75rem; }
  h3 { font-size: 1.125rem; }
  p, li { max-width: 42rem; }
  a { color: #1d70b8; }
  a:focus-visible, button:focus-visible, input:focus-visible, textarea:focus-visible, [tabindex]:focus-visible {
    outline: 3px solid #0b0c0c; outline-offset: 2px; background: #ffdd00; color: #0b0c0c;
  }
  .fixture { border: 2px solid #0b0c0c; padding: 1rem; margin: 1rem 0 2rem; background: #f3f2f1; }
  .fixture button { min-width: 3rem; min-height: 2.75rem; font: inherit; padding: 0.5rem; cursor: pointer; }
  .meta { color: #3f4245; font-size: 0.9375rem; }
  form { margin: 1rem 0 2rem; }
  .form-row { margin-bottom: 1.25rem; }
  label { display: block; font-weight: 600; margin-bottom: 0.25rem; }
  input, textarea { font: inherit; max-width: 100%; padding: 0.4rem; border: 2px solid #0b0c0c; background: #fff; }
  textarea { width: 32rem; min-height: 5rem; }
  button { font: inherit; padding: 0.55rem 1rem; border: 2px solid #0b0c0c; background: #fff; color: #0b0c0c; cursor: pointer; }
  button.primary { background: #0b0c0c; color: #fff; }
  .actions { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 1rem; }
  .summary { border-collapse: collapse; margin: 1rem 0; width: 100%; max-width: 32rem; }
  .summary th, .summary td { border-bottom: 1px solid #b1b4b6; padding: 0.5rem 0.5rem 0.5rem 0; text-align: left; vertical-align: top; }
  .summary th { width: 40%; }
  .done { border: 4px solid #00703c; padding: 1rem; margin: 1rem 0; }
  .visually-hidden { position: absolute; width: 1px; height: 1px; margin: 0; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
  [hidden] { display: none !important; }
`

function element (tag, attributes = {}, text = '') {
  const node = document.createElement(tag)
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value)
  if (text) node.textContent = text
  return node
}

class PacaSighting extends HTMLElement {
  constructor () {
    super()

    const params = new URLSearchParams(window.location.search)
    const shadowMode = params.get('shadow') === 'closed' ? 'closed' : 'open'
    const role = params.get('role') === 'valid' ? 'button' : 'goose'

    this.dataset.shadowMode = shadowMode
    this.dataset.role = role

    const shadow = this.attachShadow({ mode: shadowMode })
    const style = element('style')
    style.textContent = shadowStyles
    shadow.append(style)

    const status = element('p', { class: 'visually-hidden', role: 'status', 'aria-live': 'polite' })

    // ACT target: an explicit ARIA role inside a shadow root.
    const experiment = element('section', { class: 'fixture', 'aria-labelledby': 'experiment-heading' })
    experiment.append(
      element('h2', { id: 'experiment-heading' }, 'ACT experiment: ARIA role inside a shadow root'),
      element('p', { class: 'meta' }, 'Rule 674b10: role attribute has valid value (approved). Expected outcome: passed for role=valid, failed for role=invalid. Review status: unreviewed hypothesis. This is an experimental example, not a verified ACT verdict.'),
      (() => {
        const target = element('div', { id: 'test-target', role, tabindex: '0' }, 'Review paca sighting')
        return target
      })()
    )

    const form = element('form', { id: 'sighting-form' })
    form.append(element('h2', {}, 'Sighting details'))

    const fields = [
      { id: 'place', label: 'Where did you see the paca?', type: 'text' },
      { id: 'date', label: 'When did you see it?', type: 'date' },
      { id: 'activity', label: 'What was it doing? (optional)', type: 'textarea' }
    ]

    const inputs = {}
    for (const field of fields) {
      const row = element('div', { class: 'form-row' })
      row.append(element('label', { for: field.id }, field.label))
      const input = field.type === 'textarea'
        ? element('textarea', { id: field.id, name: field.id })
        : element('input', { id: field.id, name: field.id, type: field.type, required: '' })
      row.append(input)
      inputs[field.id] = input
      form.append(row)
    }

    form.append(element('button', { class: 'primary', type: 'submit' }, 'Review the sighting'))

    const review = element('section', { id: 'review', hidden: '', 'aria-labelledby': 'review-heading' })
    const reviewHeading = element('h2', { id: 'review-heading', tabindex: '-1' }, 'Review your sighting')
    const summary = element('table', { class: 'summary' })
    const caption = element('caption', { class: 'visually-hidden' }, 'Sighting details to confirm')
    const body = element('tbody')
    const rows = {}
    for (const [key, label] of [['place', 'Location'], ['date', 'Date'], ['activity', 'Activity']]) {
      const tr = element('tr')
      tr.append(element('th', { scope: 'row' }, label))
      const cell = element('td')
      tr.append(cell)
      rows[key] = cell
      body.append(tr)
    }
    summary.append(caption, body)

    const reviewActions = element('div', { class: 'actions' })
    const editButton = element('button', { type: 'button' }, 'Edit details')
    const confirmButton = element('button', { class: 'primary', type: 'button' }, 'Confirm sighting')
    reviewActions.append(editButton, confirmButton)
    review.append(reviewHeading, summary, reviewActions)

    const done = element('section', { id: 'done', class: 'done', hidden: '', 'aria-labelledby': 'done-heading' })
    const doneHeading = element('h2', { id: 'done-heading', tabindex: '-1' }, 'Sighting recorded')
    const doneText = element('p', {}, 'The fictional paca sighting has been recorded in this browser only.')
    const resetButton = element('button', { type: 'button' }, 'Report another sighting')
    done.append(doneHeading, doneText, resetButton)

    shadow.append(status, experiment, form, review, done)

    form.addEventListener('submit', (event) => {
      event.preventDefault()
      for (const key of Object.keys(rows)) {
        rows[key].textContent = key === 'activity'
          ? (inputs[key].value || 'Not provided')
          : inputs[key].value
      }
      form.hidden = true
      review.hidden = false
      status.textContent = 'Review your sighting before confirming.'
      reviewHeading.focus()
    })

    editButton.addEventListener('click', () => {
      review.hidden = true
      form.hidden = false
      status.textContent = 'Sighting form.'
      inputs.place.focus()
    })

    confirmButton.addEventListener('click', () => {
      review.hidden = true
      done.hidden = false
      status.textContent = 'Sighting recorded.'
      doneHeading.focus()
    })

    resetButton.addEventListener('click', () => {
      done.hidden = true
      form.hidden = false
      form.reset()
      status.textContent = 'Sighting form.'
      inputs.place.focus()
    })

    this.dataset.testReady = 'true'
    this.dataset.labState = `${role}-${shadowMode}`
    this.dataset.appVersion = version
  }
}

customElements.define('paca-sighting', PacaSighting)
