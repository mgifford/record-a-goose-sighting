<script setup>
import { computed, nextTick, onMounted, ref, watch, version as vueVersion } from 'vue'

const queryState = new URLSearchParams(window.location.search).get('state')
const appVersion = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev'
const named = ref(queryState === 'updated')
const phase = ref(queryState === 'async' ? 'async-pending' : 'ready')
const step = ref('form')
const place = ref('')
const date = ref('')
const activity = ref('')
const statusMessage = ref('')
const reviewHeading = ref(null)
const doneHeading = ref(null)

const label = computed(() => (named.value ? 'Review wombat sighting' : ''))

function markReady () {
  const app = document.getElementById('app')
  app.dataset.testReady = 'true'
  app.dataset.labState = queryState === 'async'
    ? phase.value
    : named.value ? 'updated' : 'initial'
}

onMounted(() => {
  if (queryState === 'async') {
    queueMicrotask(() => {
      named.value = true
      phase.value = 'async-ready'
      markReady()
    })
  } else {
    markReady()
  }
})
watch(named, markReady)

watch(step, async (value) => {
  await nextTick()
  if (value === 'review') {
    statusMessage.value = 'Review your sighting before confirming.'
    reviewHeading.value?.focus()
  }
  if (value === 'done') {
    statusMessage.value = 'Sighting recorded.'
    doneHeading.value?.focus()
  }
  if (value === 'form') {
    statusMessage.value = 'Sighting form.'
  }
})

function reset () {
  place.value = ''
  date.value = ''
  activity.value = ''
  step.value = 'form'
}
</script>

<template>
  <p class="visually-hidden" role="status" aria-live="polite">{{ statusMessage }}</p>

  <section class="fixture" aria-labelledby="experiment-heading">
    <h2 id="experiment-heading">ACT experiment: reactive button name</h2>
    <p class="meta">Rule <a href="https://www.w3.org/WAI/standards-guidelines/act/rules/97a4e1/">97a4e1: Button has non-empty accessible name</a> (approved). Expected outcome: failed in the initial state, passed in the updated state. Review status: unreviewed hypothesis. This is an experimental example, not a verified ACT verdict.</p>
    <button type="button" id="test-target" :aria-label="label"><span aria-hidden="true">↪</span></button>
    <p>
      <button type="button" @click="named = !named">
        {{ named ? 'Remove the example accessible name' : 'Add the example accessible name' }}
      </button>
    </p>
    <p class="meta">Stable states: <code>?state=initial</code>, <code>?state=updated</code> and <code>?state=async</code>.</p>
  </section>

  <form v-if="step === 'form'" @submit.prevent="step = 'review'">
    <h2>Sighting details</h2>
    <div class="form-row">
      <label for="place">Where did you see the wombat?</label>
      <input id="place" name="place" v-model="place" required>
    </div>
    <div class="form-row">
      <label for="date">When did you see it?</label>
      <input id="date" name="date" type="date" v-model="date" required>
    </div>
    <div class="form-row">
      <label for="activity">What was it doing? (optional)</label>
      <textarea id="activity" name="activity" v-model="activity"></textarea>
    </div>
    <button class="primary" type="submit">Review the sighting</button>
  </form>

  <section v-else-if="step === 'review'" aria-labelledby="review-heading">
    <h2 id="review-heading" ref="reviewHeading" tabindex="-1">Review your sighting</h2>
    <table class="summary">
      <caption class="visually-hidden">Sighting details to confirm</caption>
      <tbody>
        <tr><th scope="row">Location</th><td>{{ place }}</td></tr>
        <tr><th scope="row">Date</th><td>{{ date }}</td></tr>
        <tr><th scope="row">Activity</th><td>{{ activity || 'Not provided' }}</td></tr>
      </tbody>
    </table>
    <div class="actions">
      <button type="button" @click="step = 'form'">Edit details</button>
      <button class="primary" type="button" @click="step = 'done'">Confirm sighting</button>
    </div>
  </section>

  <section v-else class="done" aria-labelledby="done-heading">
    <h2 id="done-heading" ref="doneHeading" tabindex="-1">Sighting recorded</h2>
    <p>The fictional wombat sighting has been recorded in this browser only.</p>
    <button type="button" @click="reset">Report another sighting</button>
  </section>

  <p class="meta">Vue {{ vueVersion }}. Wombat service version {{ appVersion }}.</p>
</template>
