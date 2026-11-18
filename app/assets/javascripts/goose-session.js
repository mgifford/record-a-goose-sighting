/**
 * Keeps the exercise answers in sessionStorage while the user moves through
 * the static pages. There is no server, and no answer is transmitted anywhere.
 *
 * A note on URLs: with JavaScript disabled (or if storage is blocked) the forms
 * fall back to a normal GET submission, so answers travel in the query string
 * and are not retained. When this script runs, submission is intercepted and
 * answers are never added to the URL.
 */
(() => {
  'use strict'

  const STORAGE_KEY = 'goose-sighting-exercise:v1'
  const DEFAULT_BASE = '/'

  const baseMeta = document.querySelector('meta[name="goose-base"]')
  const base = baseMeta && baseMeta.content ? baseMeta.content : DEFAULT_BASE

  function getAnswers () {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY)
      const value = raw ? JSON.parse(raw) : {}

      return value && typeof value === 'object' && !Array.isArray(value)
        ? value
        : {}
    } catch (error) {
      return {}
    }
  }

  function saveAnswers (answers) {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(answers))
      return true
    } catch (error) {
      return false
    }
  }

  function collectFormValues (form) {
    const values = {}
    const formData = new FormData(form)

    for (const [name, value] of formData.entries()) {
      const stringValue = String(value)

      if (Object.hasOwn(values, name)) {
        values[name] = [].concat(values[name], stringValue)
      } else {
        values[name] = stringValue
      }
    }

    // A checkbox that was unchecked is absent from FormData. Remember the
    // empty state so an old answer is not silently restored later.
    for (const field of form.querySelectorAll('input[type="checkbox"][name]')) {
      if (!Object.hasOwn(values, field.name)) {
        values[field.name] = []
      }
    }

    return values
  }

  function saveForm (form) {
    const answers = getAnswers()
    const values = collectFormValues(form)

    for (const [name, value] of Object.entries(values)) {
      answers[name] = value
    }

    return saveAnswers(answers)
  }

  function restoreField (field, value) {
    if (field.type === 'checkbox') {
      field.checked = Array.isArray(value)
        ? value.map(String).includes(field.value)
        : value === true || String(value) === field.value
      return
    }

    if (field.type === 'radio') {
      field.checked = String(value) === field.value
      return
    }

    if (typeof value === 'string') {
      field.value = value
    }
  }

  function restoreFields () {
    const answers = getAnswers()

    for (const field of document.querySelectorAll('input[name], select[name], textarea[name]')) {
      if (!Object.hasOwn(answers, field.name)) continue
      restoreField(field, answers[field.name])
    }
  }

  function formatDate (answers) {
    return [
      answers['date-saw-goose-day'],
      answers['date-saw-goose-month'],
      answers['date-saw-goose-year']
    ].map((value) => (typeof value === 'string' ? value : '')).join(' / ')
  }

  function populateSummary () {
    const answers = getAnswers()

    for (const element of document.querySelectorAll('[data-answer]')) {
      const value = answers[element.dataset.answer]
      element.textContent = typeof value === 'string' ? value : ''
    }

    const date = document.querySelector('[data-answer-date]')
    if (date) {
      date.textContent = formatDate(answers)
    }
  }

  function isAllowedDestination (destination) {
    return destination.origin === window.location.origin &&
      destination.pathname.startsWith(base)
  }

  function onSubmit (event) {
    const form = event.target

    if (!form || form.tagName !== 'FORM') return

    event.preventDefault()

    const destination = new URL(form.getAttribute('action') || '', window.location.href)

    if (!isAllowedDestination(destination)) {
      console.warn('Blocked navigation outside the exercise base path.')
      return
    }

    if (!saveForm(form)) {
      // Storage is unavailable. Navigation still works; answers are not kept.
      console.warn('Exercise answers could not be saved in this browser.')
    }

    window.location.assign(destination.href)
  }

  function init () {
    restoreFields()
    populateSummary()
    document.addEventListener('submit', onSubmit)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
