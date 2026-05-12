const { educationContent } = window.MUSCLE_MAP_DATA;

const educationContentEl = document.querySelector('#education-content');

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

educationContentEl.innerHTML = Object.entries(educationContent)
  .map(
    ([id, content]) => `
      <section class="content-section education-section" id="${escapeHtml(id)}">
        <div class="content-section-header">
          <div>
            <span>Scrawny Basics</span>
            <h2>${escapeHtml(content.title)}</h2>
            <p>${escapeHtml(content.intro)}</p>
          </div>
        </div>
        <div class="education-section-grid">
          ${content.sections
            .map(
              (section) => `
                <article class="education-topic-card education-collapsible" role="button" tabindex="0" aria-expanded="false">
                  <h3>${escapeHtml(section.heading)}</h3>
                  <p>${escapeHtml(section.body)}</p>
                </article>
              `
            )
            .join('')}
        </div>
      </section>
    `
  )
  .join('');

educationContentEl.innerHTML = `
    <section class="content-section education-section tool-section" id="tools">
      <div class="content-section-header">
        <div>
          <span>Nutrition Tools</span>
          <h2>Calories + macro calculators</h2>
          <p>Simple local estimates for nutrition planning. Use them as starting points, not medical advice.</p>
        </div>
      </div>
      <div class="tool-panel-grid nutrition-tool-grid">
        <article class="education-topic-card tool-card">
          <h3>Total Daily Energy Expenditure Calculator</h3>
          <label>Bodyweight <input data-tdee-weight type="number" min="0" step="1" placeholder="180"></label>
          <label>Unit <select data-tdee-unit><option value="lb">lb/in</option><option value="kg">kg/cm</option></select></label>
          <label>Height <input data-tdee-height type="number" min="0" step="1" placeholder="70"></label>
          <label>Age <input data-tdee-age type="number" min="0" step="1" placeholder="30"></label>
          <label>Formula profile <select data-tdee-profile><option value="neutral">Neutral average</option><option value="female">Female equation</option><option value="male">Male equation</option></select></label>
          <label>Activity <select data-tdee-activity><option value="1.2">Low activity</option><option value="1.375">Light training</option><option value="1.55">Moderate training</option><option value="1.725">High training</option></select></label>
          <label>Goal <select data-tdee-goal><option value="0">Maintain</option><option value="-300">Slow fat loss</option><option value="250">Slow muscle gain</option></select></label>
          <button class="tool-calc-button" type="button" data-tdee-calculate>Calculate calories</button>
          <p class="tool-result" data-tdee-result>Choose bodyweight, height, age, activity, and goal.</p>
        </article>
        <article class="education-topic-card tool-card">
          <h3>Macro Target Calculator</h3>
          <label>Bodyweight <input data-macro-weight type="number" min="0" step="1" placeholder="180"></label>
          <label>Unit <select data-macro-unit><option value="lb">lb</option><option value="kg">kg</option></select></label>
          <label>Daily calories <input data-macro-calories type="number" min="0" step="25" placeholder="2200"></label>
          <label>Training goal <select data-macro-goal><option value="balanced">Balanced training</option><option value="fat-loss">Fat loss support</option><option value="muscle-gain">Muscle gain support</option></select></label>
          <label>Protein target <select data-macro-protein><option value="0.70">Moderate protein</option><option value="0.85">Higher protein</option><option value="1.00">Very high protein</option></select></label>
          <label>Fat target <select data-macro-fat><option value="0.25">Balanced fats</option><option value="0.20">Lower fat</option><option value="0.30">Higher fat</option></select></label>
          <button class="tool-calc-button" type="button" data-macro-calculate>Calculate macros</button>
          <p class="tool-result" data-macro-result>Enter bodyweight and calories to estimate protein, carbs, and fats.</p>
        </article>
      </div>
    </section>
  ` + educationContentEl.innerHTML;

const tdeeWeight = document.querySelector('[data-tdee-weight]');
const tdeeUnit = document.querySelector('[data-tdee-unit]');
const tdeeHeight = document.querySelector('[data-tdee-height]');
const tdeeAge = document.querySelector('[data-tdee-age]');
const tdeeProfile = document.querySelector('[data-tdee-profile]');
const tdeeActivity = document.querySelector('[data-tdee-activity]');
const tdeeGoal = document.querySelector('[data-tdee-goal]');
const tdeeResult = document.querySelector('[data-tdee-result]');
const tdeeCalculate = document.querySelector('[data-tdee-calculate]');
const macroWeight = document.querySelector('[data-macro-weight]');
const macroUnit = document.querySelector('[data-macro-unit]');
const macroCalories = document.querySelector('[data-macro-calories]');
const macroGoal = document.querySelector('[data-macro-goal]');
const macroProtein = document.querySelector('[data-macro-protein]');
const macroFat = document.querySelector('[data-macro-fat]');
const macroResult = document.querySelector('[data-macro-result]');
const macroCalculate = document.querySelector('[data-macro-calculate]');

function updateTdee() {
  const weight = Number(tdeeWeight.value);
  const height = Number(tdeeHeight.value);
  const age = Number(tdeeAge.value);
  if (!weight || !height || !age) {
    tdeeResult.textContent = 'Choose bodyweight, height, age, activity, and goal.';
    return;
  }
  const kg = tdeeUnit.value === 'kg' ? weight : weight / 2.20462;
  const cm = tdeeUnit.value === 'kg' ? height : height * 2.54;
  const femaleBmr = 10 * kg + 6.25 * cm - 5 * age - 161;
  const maleBmr = 10 * kg + 6.25 * cm - 5 * age + 5;
  const bmr = tdeeProfile.value === 'female' ? femaleBmr : tdeeProfile.value === 'male' ? maleBmr : (femaleBmr + maleBmr) / 2;
  const maintenance = Math.round(bmr * Number(tdeeActivity.value));
  const target = Math.max(900, maintenance + Number(tdeeGoal.value));
  const low = Math.max(900, target - 150);
  const high = target + 150;
  const direction = Number(tdeeGoal.value) < 0 ? 'fat-loss target' : Number(tdeeGoal.value) > 0 ? 'muscle-gain target' : 'maintenance target';
  tdeeResult.textContent = `Estimated BMR: ${Math.round(bmr)}. Maintenance: ${maintenance - 150}-${maintenance + 150} calories/day. Suggested ${direction}: ${low}-${high} calories/day.`;
}

function updateMacros() {
  const weight = Number(macroWeight.value);
  const calories = Number(macroCalories.value);
  if (!weight || !calories) {
    macroResult.textContent = 'Enter bodyweight and calories to estimate protein, carbs, and fats.';
    return;
  }
  const pounds = macroUnit.value === 'kg' ? weight * 2.20462 : weight;
  const proteinGrams = Math.round(pounds * Number(macroProtein.value));
  const proteinCalories = proteinGrams * 4;
  const fatCalories = calories * Number(macroFat.value);
  const carbCalories = Math.max(0, calories - proteinCalories - fatCalories);
  const goalCopy = {
    balanced: 'Use this as a steady starting point and adjust from energy, hunger, and recovery.',
    'fat-loss': 'Keep the deficit modest, keep protein steady, and watch training energy.',
    'muscle-gain': 'A small surplus works best when strength, sleep, and appetite are trending well.'
  };
  macroResult.textContent = `Targets: ${proteinGrams}g protein, ${Math.round(carbCalories / 4)}g carbs, ${Math.round(fatCalories / 9)}g fat. ${goalCopy[macroGoal.value]}`;
}

[tdeeWeight, tdeeUnit, tdeeHeight, tdeeAge, tdeeProfile, tdeeActivity, tdeeGoal].forEach((el) => el.addEventListener('input', updateTdee));
[macroWeight, macroUnit, macroCalories, macroGoal, macroProtein, macroFat].forEach((el) => el.addEventListener('input', updateMacros));
tdeeCalculate.addEventListener('click', updateTdee);
macroCalculate.addEventListener('click', updateMacros);

educationContentEl.addEventListener('click', (event) => {
  const card = event.target.closest('.education-collapsible');
  if (!card) return;
  const expanded = card.classList.toggle('is-expanded');
  card.setAttribute('aria-expanded', String(expanded));
});

educationContentEl.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const card = event.target.closest('.education-collapsible');
  if (!card) return;
  event.preventDefault();
  card.click();
});
