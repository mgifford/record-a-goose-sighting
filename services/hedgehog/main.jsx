import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

const queryState = new URLSearchParams(window.location.search).get('state')
const version = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev'

function App () {
  const [step, setStep] = useState('form')
  const [named, setNamed] = useState(queryState === 'updated')
  const [nodeKey, setNodeKey] = useState(0)
  const [phase, setPhase] = useState(
    queryState === 'async' ? 'async-pending' : queryState === 'replaced' ? 'replaced-pending' : 'ready'
  )
  const [place, setPlace] = useState('')
  const [date, setDate] = useState('')
  const [activity, setActivity] = useState('')

  const reviewHeading = useRef(null)
  const doneHeading = useRef(null)

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
    if (step === 'review') reviewHeading.current?.focus()
    if (step === 'done') doneHeading.current?.focus()
  }, [step])

  function reset () {
    setPlace('')
    setDate('')
    setActivity('')
    setStep('form')
  }

  return (
    <>
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
        <p className="meta">Stable states: <code>?state=initial</code>, <code>?state=updated</code>, <code>?state=async</code> and <code>?state=replaced</code>.</p>
      </section>

      {step === 'form' && (
        <form onSubmit={(event) => { event.preventDefault(); setStep('review') }}>
          <h2>Sighting details</h2>
          <div className="form-row">
            <label htmlFor="place">Where did you see the hedgehog?</label>
            <input id="place" name="place" value={place} onChange={(event) => setPlace(event.target.value)} required />
          </div>
          <div className="form-row">
            <label htmlFor="date">When did you see it?</label>
            <input id="date" name="date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
          </div>
          <div className="form-row">
            <label htmlFor="activity">What was it doing? (optional)</label>
            <textarea id="activity" name="activity" value={activity} onChange={(event) => setActivity(event.target.value)} />
          </div>
          <button className="primary" type="submit">Review the sighting</button>
        </form>
      )}

      {step === 'review' && (
        <section aria-labelledby="review-heading">
          <h2 id="review-heading" tabIndex={-1} ref={reviewHeading}>Review your sighting</h2>
          <table className="summary">
            <caption className="visually-hidden">Sighting details to confirm</caption>
            <tbody>
              <tr><th scope="row">Location</th><td>{place}</td></tr>
              <tr><th scope="row">Date</th><td>{date}</td></tr>
              <tr><th scope="row">Activity</th><td>{activity || 'Not provided'}</td></tr>
            </tbody>
          </table>
          <div className="actions">
            <button type="button" onClick={() => setStep('form')}>Edit details</button>
            <button className="primary" type="button" onClick={() => setStep('done')}>Confirm sighting</button>
          </div>
        </section>
      )}

      {step === 'done' && (
        <section className="done" aria-labelledby="done-heading">
          <h2 id="done-heading" tabIndex={-1} ref={doneHeading}>Sighting recorded</h2>
          <p>The fictional hedgehog sighting has been recorded in this browser only.</p>
          <button type="button" onClick={reset}>Report another sighting</button>
        </section>
      )}

      <p className="meta">React {React.version}. Hedgehog service version {version}.</p>
    </>
  )
}

createRoot(document.getElementById('app')).render(<App />)
