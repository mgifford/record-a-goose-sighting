const version = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev'

const STEPS = ['start', 'liked', 'type', 'date', 'check', 'done']
const STORAGE_KEY = 'paca-sighting-parity:v1'

const HEADINGS = {
  start: 'Report a paca sighting',
  liked: 'Do you like pacas?',
  type: 'What type of paca did you see?',
  date: 'When did you see the paca?',
  check: 'Check your answers before sending your sighting',
  done: 'Sighting recorded'
}

const EMPTY = {
  liked: '',
  type: '',
  dateDay: '',
  dateMonth: '',
  dateYear: ''
}

const shadowStyles = `
  :host { display: block; margin: 1.5rem 0; }
  h2 { font-size: 1.375rem; margin: 2rem 0 0.75rem; }
  h3 { font-size: 1.125rem; }
  p, li { max-width: 42rem; }
  a { color: #1d70b8; }
  a:focus-visible, button:focus-visible, input:focus-visible, textarea:focus-visible, [tabindex]:focus-visible {
    outline: 3px solid #0b0c0c; outline-offset: 2px; background: #ffdd00; color: #0b0c0c;
  }
  .step-progress { color: #3f4245; font-size: 0.9375rem; }
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
  .error-summary { border: 3px solid #d4351c; padding: 1rem; margin: 1rem 0 2rem; }
  .error-summary h2 { margin-top: 0; }
  .error-summary ul { margin-bottom: 0; }
  .form-group--error { border-left: 4px solid #d4351c; padding-left: 1rem; }
  .error-message { color: #d4351c; font-weight: 600; margin: 0.5rem 0; }
  .visually-hidden { position: absolute; width: 1px; height: 1px; margin: 0; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
  [hidden] { display: none !important; }
`

function element (tag, attributes = {}, text = '') {
  const node = document.createElement(tag)
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value)
  if (text) node.textContent = text
  return node
}

function stepFromUrl () {
  const value = new URLSearchParams(window.location.search).get('step')
  return STEPS.includes(value) ? value : 'start'
}

function loadAnswers () {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    const value = raw ? JSON.parse(raw) : null
    return value && typeof value === 'object' && !Array.isArray(value)
      ? { ...EMPTY, ...value }
      : { ...EMPTY }
  } catch {
    return { ...EMPTY }
  }
}

function saveAnswers (answers) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(answers))
  } catch {
    // Storage may be unavailable. The journey still works without persistence.
  }
}

function formatDate (answers) {
  if (!answers.dateDay || !answers.dateMonth || !answers.dateYear) return 'Not provided'
  return `${answers.dateDay} / ${answers.dateMonth} / ${answers.dateYear}`
}

function validate (step, answers) {
  const errors = {}

  if ((step === 'liked' || step === 'check' || step === 'done') && !answers.liked) {
    errors.liked = 'Select yes or no'
  }

  if ((step === 'type' || step === 'check' || step === 'done') && !answers.type.trim()) {
    errors.type = 'Enter the type of paca'
  }

  if (step === 'date' || step === 'check' || step === 'done') {
    const day = Number(answers.dateDay)
    const month = Number(answers.dateMonth)
    const year = Number(answers.dateYear)
    const date = new Date(Date.UTC(year, month - 1, day))

    if (!answers.dateDay || !answers.dateMonth || !answers.dateYear ||
        !Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year) ||
        year < 1000 || date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      errors.date = 'Enter a real date'
    }
  }

  return errors
}

function stepHref (step) {
  const url = new URL(window.location.href)
  if (step === 'start') url.searchParams.delete('step')
  else url.searchParams.set('step', step)
  return `${url.pathname}${url.search}`
}

class PacaSighting extends HTMLElement {
  constructor () {
    super()

    const params = new URLSearchParams(window.location.search)
    const shadowMode = params.get('shadow') === 'closed' ? 'closed' : 'open'
    const nested = params.get('shadow') === 'nested'
    const role = params.get('role') === 'valid' ? 'button' : 'goose'

    this.shadowMode = shadowMode
    this.nested = nested
    this.roleValue = role
    this.step = stepFromUrl()
    this.answers = loadAnswers()
    this.errors = {}

    const shadow = this.attachShadow({ mode: shadowMode })
    const style = element('style')
    style.textContent = shadowStyles
    shadow.append(style)

    this.status = element('p', { class: 'visually-hidden', role: 'status', 'aria-live': 'polite' })
    this.progress = element('p', { class: 'step-progress' })
    this.errorSummary = element('div', { class: 'error-summary', role: 'alert', tabindex: '-1', hidden: '' })
    this.errorSummary.append(element('h2', {}, 'There is a problem'), element('ul', { id: 'error-list' }))
    this.content = element('div')

    this.sections = {}
    this.buildJourney()

    shadow.append(this.status, this.progress, this.errorSummary, this.content)

    this.experiment = this.buildExperiment()
    if (nested) {
      const innerHost = element('div', { id: 'nested-host' })
      const inner = innerHost.attachShadow({ mode: 'open' })
      inner.append(style.cloneNode(true), this.experiment)
      shadow.append(innerHost)
    } else {
      shadow.append(this.experiment)
    }

    this.dataset.shadowMode = nested ? 'nested-open' : shadowMode
    this.dataset.role = role
    this.dataset.testReady = 'true'
    this.dataset.labState = `${role}-${nested ? 'nested-open' : shadowMode}`

    window.addEventListener('popstate', () => {
      this.errors = {}
      this.step = stepFromUrl()
      this.render()
    })
  }

  connectedCallback () {
    this.pageHeading = this.closest('main')?.querySelector('h1') || null
    this.render()
  }

  buildJourney () {
    this.sections.start = this.buildStart()
    this.sections.liked = this.buildLiked()
    this.sections.type = this.buildType()
    this.sections.date = this.buildDate()
    this.sections.check = this.buildCheck()
    this.sections.done = this.buildDone()

    for (const section of Object.values(this.sections)) {
      section.hidden = true
      this.content.append(section)
    }
  }

  buildStart () {
    const section = element('section', { id: 'step-start' })
    section.append(
      element('p', {}, 'Use this fictional service to tell us about a paca sighting. No answer is sent anywhere.'),
      element('ul', {}, ''),
      this.button('Start now', () => this.go('liked'), 'primary')
    )
    const list = section.querySelector('ul')
    list.append(
      element('li', {}, 'whether you like pacas'),
      element('li', {}, 'what type you saw'),
      element('li', {}, 'the date you saw it')
    )
    return section
  }

  buildLiked () {
    const section = element('section', { id: 'step-liked' })
    const group = element('div', { class: 'form-group' })
    const fieldset = element('fieldset', { class: 'form-group' })
    fieldset.append(element('legend', { class: 'visually-hidden' }, 'Do you like pacas?'))

    this.likedYes = element('input', { id: 'liked-yes', type: 'radio', name: 'liked', value: 'yes' })
    this.likedNo = element('input', { id: 'liked-no', type: 'radio', name: 'liked', value: 'no' })
    const yesRow = element('div', { class: 'form-row' })
    yesRow.append(this.labelWrap(this.likedYes, 'Yes'))
    const noRow = element('div', { class: 'form-row' })
    noRow.append(this.labelWrap(this.likedNo, 'No'))
    fieldset.append(yesRow, noRow)

    this.likedError = element('p', { class: 'error-message', id: 'liked-error', hidden: '' })
    group.append(fieldset, this.likedError)
    section.append(group, this.actions('start', 'type', 'Continue'))
    this.likedGroup = group
    this.likedFieldset = fieldset

    this.likedYes.addEventListener('change', () => this.update('liked', 'yes'))
    this.likedNo.addEventListener('change', () => this.update('liked', 'no'))
    return section
  }

  buildType () {
    const section = element('section', { id: 'step-type' })
    const group = element('div', { class: 'form-group' })
    const row = element('div', { class: 'form-row' })
    const label = element('label', { for: 'type' }, 'Tell us what type of paca it was')
    const hint = element('p', { class: 'meta', id: 'type-hint' }, 'For example, a mountain paca.')
    this.typeInput = element('input', { id: 'type', type: 'text' })
    this.typeError = element('p', { class: 'error-message', id: 'type-error', hidden: '' })
    row.append(label, hint, this.typeInput)
    group.append(row, this.typeError)
    section.append(group, this.actions('liked', 'date', 'Continue'))
    this.typeGroup = group

    this.typeInput.addEventListener('input', (event) => this.update('type', event.target.value))
    return section
  }

  buildDate () {
    const section = element('section', { id: 'step-date' })
    const group = element('div', { class: 'form-group' })
    const fieldset = element('fieldset', { class: 'form-group' })
    fieldset.append(element('legend', { class: 'visually-hidden' }, 'When did you see the paca?'))

    const hint = element('p', { class: 'meta', id: 'date-hint' }, 'For example, 16 4 2017.')
    fieldset.append(hint)

    const fields = [
      ['date-day', 'Day', 'dateDay'],
      ['date-month', 'Month', 'dateMonth'],
      ['date-year', 'Year', 'dateYear']
    ]
    this.dateInputs = {}
    for (const [id, labelText, key] of fields) {
      const row = element('div', { class: 'form-row' })
      const input = element('input', { id, type: 'text', inputmode: 'numeric' })
      row.append(element('label', { for: id }, labelText), input)
      fieldset.append(row)
      this.dateInputs[key] = input
      input.addEventListener('input', (event) => this.update(key, event.target.value))
    }

    this.dateError = element('p', { class: 'error-message', id: 'date-error', hidden: '' })
    group.append(fieldset, this.dateError)
    section.append(group, this.actions('type', 'check', 'Continue'))
    this.dateGroup = group
    this.dateFieldset = fieldset
    return section
  }

  buildCheck () {
    const section = element('section', { id: 'step-check' })
    const table = element('table', { class: 'summary' })
    table.append(element('caption', { class: 'visually-hidden' }, 'Your paca sighting answers'))
    const body = element('tbody')
    this.summaryCells = {}

    const rows = [
      ['liked', 'You like pacas', 'whether you like pacas'],
      ['type', 'Type of paca', 'the type of paca'],
      ['date', 'Date you saw it', 'the date you saw the paca']
    ]

    for (const [key, labelText, hiddenText] of rows) {
      const row = element('tr')
      const cell = element('td')
      this.summaryCells[key] = cell
      const change = element('a', { href: stepHref(key === 'date' ? 'date' : key) }, 'Change')
      change.append(element('span', { class: 'visually-hidden' }, ` ${hiddenText}`))
      change.addEventListener('click', (event) => {
        event.preventDefault()
        this.go(key === 'date' ? 'date' : key)
      })
      const action = element('td')
      action.append(change)
      row.append(element('th', { scope: 'row' }, labelText), cell, action)
      body.append(row)
    }

    table.append(body)
    section.append(
      table,
      element('p', {}, 'By sending this sighting you confirm that the details are correct.'),
      this.actions('date', 'done', 'Send the sighting')
    )
    return section
  }

  buildDone () {
    const section = element('section', { id: 'step-done' })
    const done = element('div', { class: 'done' })
    done.append(
      element('p', {}, 'Your paca sighting has been recorded in this browser only.'),
      element('p', {}, 'Reference number PP-2026.')
    )
    done.append(this.button('Report another sighting', () => this.reset(), 'primary'))
    section.append(done)
    return section
  }

  buildExperiment () {
    const experiment = element('section', { class: 'fixture', 'aria-labelledby': 'experiment-heading' })
    experiment.append(
      element('h2', { id: 'experiment-heading' }, 'ACT experiment: ARIA role inside a shadow root'),
      element('p', { class: 'meta' }, 'Rule 674b10: role attribute has valid value (approved). Expected outcome: passed for role=valid, failed for role=invalid. Review status: unreviewed hypothesis. This is an experimental example, not a verified ACT verdict.')
    )
    const target = element('div', { id: 'test-target', role: this.roleValue, tabindex: '0' }, 'Review paca sighting')
    experiment.append(target)
    return experiment
  }

  labelWrap (input, text) {
    const label = element('label')
    label.append(input, document.createTextNode(` ${text}`))
    return label
  }

  button (text, handler, className = '') {
    const node = element('button', { type: 'button', ...(className ? { class: className } : {}) }, text)
    node.addEventListener('click', handler)
    return node
  }

  actions (backTarget, nextTarget, nextLabel) {
    const actions = element('div', { class: 'actions' })
    actions.append(
      this.button('Back', () => this.go(backTarget)),
      this.button(nextLabel, () => this.advance(nextTarget), 'primary')
    )
    return actions
  }

  update (field, value) {
    this.answers = { ...this.answers, [field]: value }
    saveAnswers(this.answers)
    if (this.errors[field]) {
      const next = { ...this.errors }
      delete next[field]
      this.errors = next
      this.renderErrors()
    }
  }

  go (next) {
    this.errors = {}
    this.step = next
    const url = new URL(window.location.href)
    if (next === 'start') url.searchParams.delete('step')
    else url.searchParams.set('step', next)
    window.history.pushState({ step: next }, '', url)
    this.render()
  }

  advance (next) {
    const problems = validate(this.step, this.answers)
    if (Object.keys(problems).length > 0) {
      this.errors = problems
      this.status.textContent = 'There is a problem with the form'
      this.render()
      return
    }
    this.go(next)
  }

  reset () {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // Nothing to clear.
    }
    this.answers = { ...EMPTY }
    this.go('start')
  }

  render () {
    for (const [name, section] of Object.entries(this.sections)) {
      section.hidden = name !== this.step
    }

    this.progress.textContent = `Step ${STEPS.indexOf(this.step) + 1} of ${STEPS.length} · Web Components`
    this.status.textContent = `${HEADINGS[this.step]} step`
    document.title = `${HEADINGS[this.step]} - Report a paca sighting`

    if (this.pageHeading) {
      this.pageHeading.textContent = HEADINGS[this.step]
      this.pageHeading.setAttribute('tabindex', '-1')
    }

    this.likedYes.checked = this.answers.liked === 'yes'
    this.likedNo.checked = this.answers.liked === 'no'
    this.typeInput.value = this.answers.type
    this.dateInputs.dateDay.value = this.answers.dateDay
    this.dateInputs.dateMonth.value = this.answers.dateMonth
    this.dateInputs.dateYear.value = this.answers.dateYear

    this.summaryCells.liked.textContent = this.answers.liked === 'yes'
      ? 'Yes'
      : this.answers.liked === 'no' ? 'No' : 'Not provided'
    this.summaryCells.type.textContent = this.answers.type || 'Not provided'
    this.summaryCells.date.textContent = formatDate(this.answers)

    this.renderErrors()

    if (Object.keys(this.errors).length > 0) {
      this.errorSummary.focus()
    } else {
      this.pageHeading?.focus()
    }
  }

  renderErrors () {
    const hasErrors = Object.keys(this.errors).length > 0
    this.errorSummary.hidden = !hasErrors

    const list = this.errorSummary.querySelector('#error-list')
    list.replaceChildren()
    const links = {
      liked: ['liked-yes', this.errors.liked],
      type: ['type', this.errors.type],
      date: ['date-day', this.errors.date]
    }
    for (const [id, message] of Object.values(links)) {
      if (!message) continue
      const item = element('li')
      item.append(element('a', { href: `#${id}` }, message))
      list.append(item)
    }

    this.likedError.hidden = !this.errors.liked
    this.likedError.textContent = this.errors.liked || ''
    this.likedGroup.className = this.errors.liked ? 'form-group--error' : 'form-group'
    this.likedYes.setAttribute('aria-invalid', String(Boolean(this.errors.liked)))
    this.likedNo.setAttribute('aria-invalid', String(Boolean(this.errors.liked)))
    if (this.errors.liked) this.likedFieldset.setAttribute('aria-describedby', 'liked-error')
    else this.likedFieldset.removeAttribute('aria-describedby')

    this.typeError.hidden = !this.errors.type
    this.typeError.textContent = this.errors.type || ''
    this.typeGroup.className = this.errors.type ? 'form-group--error' : 'form-group'
    this.typeInput.setAttribute('aria-invalid', String(Boolean(this.errors.type)))
    this.typeInput.setAttribute('aria-describedby', this.errors.type ? 'type-hint type-error' : 'type-hint')

    this.dateError.hidden = !this.errors.date
    this.dateError.textContent = this.errors.date || ''
    this.dateGroup.className = this.errors.date ? 'form-group--error' : 'form-group'
    for (const input of Object.values(this.dateInputs)) {
      input.setAttribute('aria-invalid', String(Boolean(this.errors.date)))
    }
  }
}

customElements.define('paca-sighting', PacaSighting)
