<script setup>
import { computed, nextTick, onMounted, ref, watch, version as vueVersion } from 'vue'

const queryState = new URLSearchParams(window.location.search).get('state')
const appVersion = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev'

const STEPS = ['start', 'liked', 'type', 'date', 'check', 'done']
const STORAGE_KEY = 'wombat-sighting-parity:v1'

const HEADINGS = {
  start: 'Report a wombat sighting',
  liked: 'Do you like wombats?',
  type: 'What type of wombat did you see?',
  date: 'When did you see the wombat?',
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
    errors.type = 'Enter the type of wombat'
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

const step = ref(stepFromUrl())
const answers = ref(loadAnswers())
const errors = ref({})
const status = ref('')

const named = ref(queryState === 'updated')
const phase = ref(queryState === 'async' ? 'async-pending' : 'ready')

const heading = ref(null)
const errorSummary = ref(null)

const stepHeading = computed(() => HEADINGS[step.value])
const stepNumber = computed(() => STEPS.indexOf(step.value) + 1)
const errorList = computed(() => Object.entries(errors.value))

function markReady () {
  const app = document.getElementById('app')
  app.dataset.testReady = 'true'
  app.dataset.labState = queryState === 'async'
    ? phase.value
    : named.value ? 'updated' : 'initial'
}

watch(answers, (value) => saveAnswers(value), { deep: true })

watch(step, async () => {
  document.title = `${HEADINGS[step.value]} - Report a wombat sighting`
  await nextTick()
  heading.value?.focus()
  status.value = `${HEADINGS[step.value]} step`
})

watch(errors, async () => {
  if (Object.keys(errors.value).length > 0) {
    await nextTick()
    errorSummary.value?.focus()
  }
}, { deep: true })

watch([named, phase], markReady)

onMounted(async () => {
  if (queryState === 'async') {
    queueMicrotask(() => {
      named.value = true
      phase.value = 'async-ready'
      markReady()
    })
  }
  markReady()
  document.title = `${HEADINGS[step.value]} - Report a wombat sighting`
  await nextTick()
  heading.value?.focus()
  status.value = `${HEADINGS[step.value]} step`

  window.addEventListener('popstate', () => {
    errors.value = {}
    step.value = stepFromUrl()
  })
})

function go (next) {
  errors.value = {}
  step.value = next
  const url = new URL(window.location.href)
  if (next === 'start') url.searchParams.delete('step')
  else url.searchParams.set('step', next)
  window.history.pushState({ step: next }, '', url)
}

function advance (next) {
  const problems = validate(step.value, answers.value)
  if (Object.keys(problems).length > 0) {
    errors.value = problems
    status.value = 'There is a problem with the form'
    return
  }
  go(next)
}

function update (field, value) {
  answers.value = { ...answers.value, [field]: value }
  if (errors.value[field]) {
    const next = { ...errors.value }
    delete next[field]
    errors.value = next
  }
}

function compareHref (target) {
  const url = new URL(`../${target}/`, window.location.href)
  if (target === 'paca') {
    url.searchParams.set('role', 'valid')
    url.searchParams.set('shadow', 'open')
  }
  if (step.value !== 'start') url.searchParams.set('step', step.value)
  return `${url.pathname}${url.search}`
}

function reset () {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to clear.
  }
  answers.value = { ...EMPTY }
  go('start')
}
</script>

<template>
  <p class="step-progress">Step {{ stepNumber }} of 6 · Vue</p>
  <h1 id="page-heading" ref="heading" tabindex="-1">{{ stepHeading }}</h1>
  <p class="visually-hidden" role="status" aria-live="polite">{{ status }}</p>

  <nav class="compare-frameworks" aria-label="Compare this step">
    <p><strong>Compare this step:</strong>
      <a :href="compareHref('hedgehog')">React</a> ·
      <a :href="compareHref('wombat')" aria-current="page">Vue</a> ·
      <a :href="compareHref('paca')">Web Components</a>
    </p>
  </nav>

  <div v-if="errorList.length > 0" class="error-summary" role="alert" tabindex="-1" ref="errorSummary">
    <h2>There is a problem</h2>
    <ul>
      <li v-if="errors.liked"><a href="#liked-yes">{{ errors.liked }}</a></li>
      <li v-if="errors.type"><a href="#type">{{ errors.type }}</a></li>
      <li v-if="errors.date"><a href="#date-day">{{ errors.date }}</a></li>
    </ul>
  </div>

  <template v-if="step === 'start'">
    <p>Use this fictional service to tell us about a wombat sighting. No answer is sent anywhere.</p>
    <ul>
      <li>whether you like wombats</li>
      <li>what type you saw</li>
      <li>the date you saw it</li>
    </ul>
    <button type="button" class="primary" @click="go('liked')">Start now</button>
  </template>

  <template v-else-if="step === 'liked'">
    <div :class="errors.liked ? 'form-group--error' : undefined">
      <fieldset class="form-group" :aria-describedby="errors.liked ? 'liked-error' : undefined">
        <legend class="visually-hidden">Do you like wombats?</legend>
        <div class="form-row">
          <label>
            <input id="liked-yes" type="radio" name="liked" value="yes" :checked="answers.liked === 'yes'" :aria-invalid="Boolean(errors.liked)" @change="update('liked', 'yes')"> Yes
          </label>
        </div>
        <div class="form-row">
          <label>
            <input id="liked-no" type="radio" name="liked" value="no" :checked="answers.liked === 'no'" :aria-invalid="Boolean(errors.liked)" @change="update('liked', 'no')"> No
          </label>
        </div>
      </fieldset>
      <p v-if="errors.liked" class="error-message" id="liked-error">{{ errors.liked }}</p>
    </div>
    <div class="actions">
      <button type="button" @click="go('start')">Back</button>
      <button type="button" class="primary" @click="advance('type')">Continue</button>
    </div>
  </template>

  <template v-else-if="step === 'type'">
    <div :class="errors.type ? 'form-group--error' : undefined">
      <div class="form-row">
        <label for="type">Tell us what type of wombat it was</label>
        <p class="meta" id="type-hint">For example, a common wombat.</p>
        <input id="type" type="text" :value="answers.type" :aria-invalid="Boolean(errors.type)" :aria-describedby="errors.type ? 'type-hint type-error' : 'type-hint'" @input="update('type', $event.target.value)">
      </div>
      <p v-if="errors.type" class="error-message" id="type-error">{{ errors.type }}</p>
    </div>
    <div class="actions">
      <button type="button" @click="go('liked')">Back</button>
      <button type="button" class="primary" @click="advance('date')">Continue</button>
    </div>
  </template>

  <template v-else-if="step === 'date'">
    <div :class="errors.date ? 'form-group--error' : undefined">
      <fieldset class="form-group" :aria-describedby="errors.date ? 'date-hint date-error' : 'date-hint'">
        <legend class="visually-hidden">When did you see the wombat?</legend>
        <p class="meta" id="date-hint">For example, 16 4 2017.</p>
        <div class="form-row">
          <label for="date-day">Day</label>
          <input id="date-day" type="text" inputmode="numeric" :value="answers.dateDay" :aria-invalid="Boolean(errors.date)" @input="update('dateDay', $event.target.value)">
        </div>
        <div class="form-row">
          <label for="date-month">Month</label>
          <input id="date-month" type="text" inputmode="numeric" :value="answers.dateMonth" :aria-invalid="Boolean(errors.date)" @input="update('dateMonth', $event.target.value)">
        </div>
        <div class="form-row">
          <label for="date-year">Year</label>
          <input id="date-year" type="text" inputmode="numeric" :value="answers.dateYear" :aria-invalid="Boolean(errors.date)" @input="update('dateYear', $event.target.value)">
        </div>
      </fieldset>
      <p v-if="errors.date" class="error-message" id="date-error">{{ errors.date }}</p>
    </div>
    <div class="actions">
      <button type="button" @click="go('type')">Back</button>
      <button type="button" class="primary" @click="advance('check')">Continue</button>
    </div>
  </template>

  <template v-else-if="step === 'check'">
    <table class="summary">
      <caption class="visually-hidden">Your wombat sighting answers</caption>
      <tbody>
        <tr>
          <th scope="row">You like wombats</th>
          <td>{{ answers.liked === 'yes' ? 'Yes' : answers.liked === 'no' ? 'No' : 'Not provided' }}</td>
          <td><a :href="stepHref('liked')" @click.prevent="go('liked')">Change<span class="visually-hidden"> whether you like wombats</span></a></td>
        </tr>
        <tr>
          <th scope="row">Type of wombat</th>
          <td>{{ answers.type || 'Not provided' }}</td>
          <td><a :href="stepHref('type')" @click.prevent="go('type')">Change<span class="visually-hidden"> the type of wombat</span></a></td>
        </tr>
        <tr>
          <th scope="row">Date you saw it</th>
          <td>{{ formatDate(answers) }}</td>
          <td><a :href="stepHref('date')" @click.prevent="go('date')">Change<span class="visually-hidden"> the date you saw the wombat</span></a></td>
        </tr>
      </tbody>
    </table>
    <p>By sending this sighting you confirm that the details are correct.</p>
    <div class="actions">
      <button type="button" @click="go('date')">Back</button>
      <button type="button" class="primary" @click="advance('done')">Send the sighting</button>
    </div>
  </template>

  <template v-else>
    <div class="done">
      <p>Your wombat sighting has been recorded in this browser only.</p>
      <p>Reference number <strong>WW-2026</strong>.</p>
      <button type="button" class="primary" @click="reset">Report another sighting</button>
    </div>
  </template>

  <section class="fixture" aria-labelledby="experiment-heading">
    <h2 id="experiment-heading">ACT experiment: reactive button name</h2>
    <p class="meta">Rule <a href="https://www.w3.org/WAI/standards-guidelines/act/rules/97a4e1/">97a4e1: Button has non-empty accessible name</a> (approved). Expected outcome: failed in the initial state, passed in the updated state. Review status: unreviewed hypothesis. This is an experimental example, not a verified ACT verdict.</p>
    <button type="button" id="test-target" :aria-label="named ? 'Review wombat sighting' : ''"><span aria-hidden="true">↪</span></button>
    <p>
      <button type="button" @click="named = !named">
        {{ named ? 'Remove the example accessible name' : 'Add the example accessible name' }}
      </button>
    </p>
    <p class="meta">Stable states: <code>?state=initial</code>, <code>?state=updated</code> and <code>?state=async</code>. Journey states use <code>?step=</code>.</p>
  </section>

  <p class="meta">Vue {{ vueVersion }}. Wombat service version {{ appVersion }}.</p>
</template>
