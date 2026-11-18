/* global GOVUKFrontend */

// Initialise the GOV.UK Frontend components used by the exercise
// (currently the Details component on the check-your-answers page).
document.addEventListener('DOMContentLoaded', function () {
  if (typeof GOVUKFrontend !== 'undefined' && typeof GOVUKFrontend.initAll === 'function') {
    GOVUKFrontend.initAll()
  }
})
