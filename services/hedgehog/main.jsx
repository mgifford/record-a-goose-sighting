import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

const query = new URLSearchParams(window.location.search)
const queryState = query.get('state')
const version = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev'

const STEPS = ['start', 'liked', 'type', 'date', 'check', 'done']
const STORAGE_KEY = 'hedgehog-sighting-parity:v1'

const HEADINGS = {
  start: 'Report a hedgehog sighting',
  liked: 'Do you like hedgehogs?',
  type: 'What type of hedgehog did you see?',
  date: 'When did you see the hedgehog?',
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
    errors.type = 'Enter the type of hedgehog'
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

function App () {
  const [step, setStep] = useState(stepFromUrl)
  const [answers, setAnswers] = useState(loadAnswers)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('')

  // ACT experiment state, independent of the journey step.
  const [named, setNamed] = useState(queryState === 'updated')
  const [nodeKey, setNodeKey] = useState(0)
  const [phase, setPhase] = useState(
    queryState === 'async' ? 'async-pending' : queryState === 'replaced' ? 'replaced-pending' : 'ready'
  )

  const headingRef = useRef(null)
  const errorRef = useRef(null)

  useEffect(() => {
    saveAnswers(answers)
  }, [answers])

  useEffect(() => {
    document.title = `${HEADINGS[step]} - Report a hedgehog sighting`
    headingRef.current?.focus()
    setStatus(`${HEADINGS[step]} step`)
  }, [step])

  useEffect(() => {
    if (Object.keys(errors).length > 0) errorRef.current?.focus()
  }, [errors])

  useEffect(() => {
    if (queryState === 'async') {
      queueMicrotask(() => {
        setNamed(true)
        setPhase('async-ready')
      })
    }
  }, [])

  useEffect(() => {
    const app = document.getElementById('app')
    const labState = queryState === 'async' || queryState === 'replaced'
      ? phase
      : named ? 'updated' : 'initial'
    app.dataset.testReady = 'true'
    app.dataset.labState = labState
  }, [named, phase])

  useEffect(() => {
    const onPopState = () => {
      setErrors({})
      setStep(stepFromUrl())
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  function go (next) {
    setErrors({})
    setStep(next)
    const url = new URL(window.location.href)
    if (next === 'start') url.searchParams.delete('step')
    else url.searchParams.set('step', next)
    window.history.pushState({ step: next }, '', url)
  }

  function advance (next) {
    const problems = validate(step, answers)
    if (Object.keys(problems).length > 0) {
      setErrors(problems)
      setStatus('There is a problem with the form')
      return
    }
    go(next)
  }

  function update (field, value) {
    setAnswers((current) => ({ ...current, [field]: value }))
    if (errors[field]) {
      setErrors((current) => {
        const next = { ...current }
        delete next[field]
        return next
      })
    }
  }

  function compareHref (target) {
    const url = new URL(`../${target}/`, window.location.href)
  if (target === 'paca') {
    url.searchParams.set('role', 'valid')
    url.searchParams.set('shadow', 'open')
  }
    if (step !== 'start') url.searchParams.set('step', step)
    return `${url.pathname}${url.search}`
  }

  function reset () {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // Nothing to clear.
    }
    setAnswers({ ...EMPTY })
    go('start')
  }

  const errorList = Object.entries(errors)
  const stepNumber = STEPS.indexOf(step) + 1

  return (
    <>
      <p className="step-progress">Step {stepNumber} of {STEPS.length} · React</p>
      <h1 id="page-heading" ref={headingRef} tabIndex={-1}>{HEADINGS[step]}</h1>
      <p className="visually-hidden" role="status" aria-live="polite">{status}</p>

      <nav className="compare-frameworks" aria-label="Compare this step">
        <p><strong>Compare this step:</strong>{' '}
          <a href={compareHref('hedgehog')} aria-current="page">React</a>{' · '}
          <a href={compareHref('wombat')}>Vue</a>{' · '}
          <a href={compareHref('paca')}>Web Components</a>
        </p>
      </nav>

      {errorList.length > 0 && (
        <div className="error-summary" role="alert" tabIndex={-1} ref={errorRef}>
          <h2>There is a problem</h2>
          <ul>
            {errors.liked && <li><a href="#liked-yes">{errors.liked}</a></li>}
            {errors.type && <li><a href="#type">{errors.type}</a></li>}
            {errors.date && <li><a href="#date-day">{errors.date}</a></li>}
          </ul>
        </div>
      )}

      {step === 'start' && (
        <>
          <p>Use this fictional service to tell us about a hedgehog sighting. No answer is sent anywhere.</p>
          <ul>
            <li>whether you like hedgehogs</li>
            <li>what type you saw</li>
            <li>the date you saw it</li>
          </ul>
          <button type="button" className="primary" onClick={() => go('liked')}>Start now</button>
        </>
      )}

      {step === 'liked' && (
        <>
          <div className={errors.liked ? 'form-group--error' : undefined}>
            <fieldset className="form-group" aria-describedby={errors.liked ? 'liked-error' : undefined}>
              <legend className="visually-hidden">Do you like hedgehogs?</legend>
              <div className="form-row">
                <label>
                  <input
                    id="liked-yes"
                    name="liked"
                    type="radio"
                    value="yes"
                    checked={answers.liked === 'yes'}
                    aria-invalid={Boolean(errors.liked)}
                    onChange={() => update('liked', 'yes')}
                  /> Yes
                </label>
              </div>
              <div className="form-row">
                <label>
                  <input
                    id="liked-no"
                    name="liked"
                    type="radio"
                    value="no"
                    checked={answers.liked === 'no'}
                    aria-invalid={Boolean(errors.liked)}
                    onChange={() => update('liked', 'no')}
                  /> No
                </label>
              </div>
            </fieldset>
            {errors.liked && <p className="error-message" id="liked-error">{errors.liked}</p>}
          </div>
          <div className="actions">
            <button type="button" onClick={() => go('start')}>Back</button>
            <button type="button" className="primary" onClick={() => advance('type')}>Continue</button>
          </div>
        </>
      )}

      {step === 'type' && (
        <>
          <div className={errors.type ? 'form-group--error' : undefined}>
            <div className="form-row">
              <label htmlFor="type">Tell us what type of hedgehog it was</label>
              <p className="meta" id="type-hint">For example, a European hedgehog.</p>
              <input
                id="type"
                name="type"
                type="text"
                value={answers.type}
                aria-invalid={Boolean(errors.type)}
                aria-describedby={errors.type ? 'type-hint type-error' : 'type-hint'}
                onChange={(event) => update('type', event.target.value)}
              />
            </div>
            {errors.type && <p className="error-message" id="type-error">{errors.type}</p>}
          </div>
          <div className="actions">
            <button type="button" onClick={() => go('liked')}>Back</button>
            <button type="button" className="primary" onClick={() => advance('date')}>Continue</button>
          </div>
        </>
      )}

      {step === 'date' && (
        <>
          <div className={errors.date ? 'form-group--error' : undefined}>
            <fieldset className="form-group" aria-describedby={errors.date ? 'date-hint date-error' : 'date-hint'}>
              <legend className="visually-hidden">When did you see the hedgehog?</legend>
              <p className="meta" id="date-hint">For example, 16 4 2017.</p>
              <div className="form-row">
                <label htmlFor="date-day">Day</label>
                <input
                  id="date-day"
                  name="date-day"
                  type="text"
                  inputMode="numeric"
                  value={answers.dateDay}
                  aria-invalid={Boolean(errors.date)}
                  onChange={(event) => update('dateDay', event.target.value)}
                />
              </div>
              <div className="form-row">
                <label htmlFor="date-month">Month</label>
                <input
                  id="date-month"
                  name="date-month"
                  type="text"
                  inputMode="numeric"
                  value={answers.dateMonth}
                  aria-invalid={Boolean(errors.date)}
                  onChange={(event) => update('dateMonth', event.target.value)}
                />
              </div>
              <div className="form-row">
                <label htmlFor="date-year">Year</label>
                <input
                  id="date-year"
                  name="date-year"
                  type="text"
                  inputMode="numeric"
                  value={answers.dateYear}
                  aria-invalid={Boolean(errors.date)}
                  onChange={(event) => update('dateYear', event.target.value)}
                />
              </div>
            </fieldset>
            {errors.date && <p className="error-message" id="date-error">{errors.date}</p>}
          </div>
          <div className="actions">
            <button type="button" onClick={() => go('type')}>Back</button>
            <button type="button" className="primary" onClick={() => advance('check')}>Continue</button>
          </div>
        </>
      )}

      {step === 'check' && (
        <>
          <table className="summary">
            <caption className="visually-hidden">Your hedgehog sighting answers</caption>
            <tbody>
              <tr>
                <th scope="row">You like hedgehogs</th>
                <td>{answers.liked === 'yes' ? 'Yes' : answers.liked === 'no' ? 'No' : 'Not provided'}</td>
                <td><a href={stepHref('liked')} onClick={(event) => { event.preventDefault(); go('liked') }}>Change<span className="visually-hidden"> whether you like hedgehogs</span></a></td>
              </tr>
              <tr>
                <th scope="row">Type of hedgehog</th>
                <td>{answers.type || 'Not provided'}</td>
                <td><a href={stepHref('type')} onClick={(event) => { event.preventDefault(); go('type') }}>Change<span className="visually-hidden"> the type of hedgehog</span></a></td>
              </tr>
              <tr>
                <th scope="row">Date you saw it</th>
                <td>{formatDate(answers)}</td>
                <td><a href={stepHref('date')} onClick={(event) => { event.preventDefault(); go('date') }}>Change<span className="visually-hidden"> the date you saw the hedgehog</span></a></td>
              </tr>
            </tbody>
          </table>
          <p>By sending this sighting you confirm that the details are correct.</p>
          <div className="actions">
            <button type="button" onClick={() => go('date')}>Back</button>
            <button type="button" className="primary" onClick={() => advance('done')}>Send the sighting</button>
          </div>
        </>
      )}

      {step === 'done' && (
        <div className="done">
          <p>Your hedgehog sighting has been recorded in this browser only.</p>
          <p>Reference number <strong>HH-2026</strong>.</p>
          <button type="button" className="primary" onClick={reset}>Report another sighting</button>
        </div>
      )}

      <section className="fixture" aria-labelledby="experiment-heading">
        <h2 id="experiment-heading">ACT experiment: dynamically supplied button name</h2>
        <p className="meta">Rule <a href="https://www.w3.org/WAI/standards-guidelines/act/rules/97a4e1/">97a4e1: Button has non-empty accessible name</a> (approved). Expected outcome: failed in the initial state, passed in the updated state. Review status: unreviewed hypothesis. This is an experimental example, not a verified ACT verdict.</p>
        <button
          key={nodeKey}
          type="button"
          id="test-target"
          data-node-version={nodeKey}
          aria-label={named ? 'Review hedgehog sighting' : ''}
        >
          <span aria-hidden="true">↪</span>
        </button>
        <p>
          <button type="button" onClick={() => setNamed(!named)}>
            {named ? 'Remove the example accessible name' : 'Add the example accessible name'}
          </button>
        </p>
        {queryState === 'replaced' && (
          <p>
            <button
              type="button"
              id="replace-target"
              onClick={() => {
                setNodeKey((value) => value + 1)
                setNamed(true)
                setPhase('replaced')
              }}
            >
              Replace the example target
            </button>
          </p>
        )}
        <p className="meta">Stable states: <code>?state=initial</code>, <code>?state=updated</code>, <code>?state=async</code> and <code>?state=replaced</code>. Journey states use <code>?step=</code>.</p>
      </section>

      <p className="meta">React {React.version}. Hedgehog service version {version}.</p>
    </>
  )
}

createRoot(document.getElementById('app')).render(<App />)
