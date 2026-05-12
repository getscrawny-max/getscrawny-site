const oneRmWeight = document.querySelector('[data-one-rm-weight]');
const oneRmReps = document.querySelector('[data-one-rm-reps]');
const oneRmUnit = document.querySelector('[data-one-rm-unit]');
const oneRmResult = document.querySelector('[data-one-rm-result]');
const oneRmCalculate = document.querySelector('[data-one-rm-calculate]');
const standardLift = document.querySelector('[data-standard-lift]');
const standardWeight = document.querySelector('[data-standard-weight]');
const standardLifted = document.querySelector('[data-standard-lifted]');
const standardUnit = document.querySelector('[data-standard-unit]');
const standardResult = document.querySelector('[data-standard-result]');
const standardCalculate = document.querySelector('[data-standard-calculate]');

const standardRatios = {
  bench: { label: 'bench press', beginner: 0.55, intermediate: 0.95, advanced: 1.35 },
  squat: { label: 'squat', beginner: 0.80, intermediate: 1.35, advanced: 1.85 },
  deadlift: { label: 'deadlift', beginner: 1.00, intermediate: 1.65, advanced: 2.25 }
};

function formatLoad(value, unit) {
  return Math.round(value) + ' ' + unit;
}

function updateOneRm() {
  const weight = Number(oneRmWeight.value);
  const reps = Number(oneRmReps.value);
  const unit = oneRmUnit?.value || 'lb';
  if (!weight || !reps) {
    oneRmResult.textContent = 'Enter a hard set of 10 reps or fewer to estimate your max and useful training loads.';
    return;
  }
  const cappedReps = Math.min(Math.max(reps, 1), 10);
  const estimated = Math.round(weight * (1 + cappedReps / 30));
  const loads = [90, 85, 80, 75].map((percent) => percent + '% ' + formatLoad(estimated * (percent / 100), unit)).join(' | ');
  oneRmResult.textContent = 'Estimated 1RM: ' + formatLoad(estimated, unit) + ' using Epley. Working loads: ' + loads + '.';
}

function updateStandard() {
  const bodyweight = Number(standardWeight.value);
  const lifted = Number(standardLifted.value);
  const unit = standardUnit?.value || 'lb';
  if (!bodyweight || !lifted) {
    standardResult.textContent = 'Enter bodyweight and best lift to see broad beginner, intermediate, and advanced reference ranges.';
    return;
  }
  const standard = standardRatios[standardLift.value];
  const ratio = lifted / bodyweight;
  const label = ratio < standard.beginner ? 'building foundation' : ratio < standard.intermediate ? 'beginner range' : ratio < standard.advanced ? 'intermediate range' : 'advanced range';
  const ranges = 'Beginner about ' + formatLoad(bodyweight * standard.beginner, unit) + ', intermediate about ' + formatLoad(bodyweight * standard.intermediate, unit) + ', advanced about ' + formatLoad(bodyweight * standard.advanced, unit) + '.';
  standardResult.textContent = 'Your ' + standard.label + ' is ' + ratio.toFixed(2) + 'x bodyweight, roughly ' + label + '. ' + ranges;
}


[oneRmWeight, oneRmReps, oneRmUnit].forEach((el) => el?.addEventListener('input', updateOneRm));
[standardLift, standardWeight, standardLifted, standardUnit].forEach((el) => el?.addEventListener('input', updateStandard));
oneRmCalculate?.addEventListener('click', updateOneRm);
standardCalculate?.addEventListener('click', updateStandard);
