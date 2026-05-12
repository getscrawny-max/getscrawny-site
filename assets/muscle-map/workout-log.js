const { muscleGroups, stretches } = window.MUSCLE_MAP_DATA;

let exerciseId = 0;
let stretchId = 0;

const workoutBlocks = document.querySelector('#workout-blocks');
const workoutForm = document.querySelector('#workout-form');
const receipt = document.querySelector('#workout-receipt');
const exerciseOptions = document.querySelector('#exercise-options');
const stretchOptions = document.querySelector('#stretch-options');
const printButton = document.querySelector('#print-workout');
const savePdfButton = document.querySelector('#save-pdf');
const addSectionButtons = document.querySelectorAll('[data-add-section]');

const exerciseLookup = new Map();
const exerciseNames = [...new Set(
  Object.values(muscleGroups).flatMap((muscle) =>
    muscle.exercises.map((exercise) => {
      exerciseLookup.set(exercise.name.toLowerCase(), exercise);
      return exercise.name;
    })
  )
)].sort((a, b) => a.localeCompare(b));

const stretchNames = stretches.map((stretch) => stretch.name).sort((a, b) => a.localeCompare(b));
const sectionTemplates = {};

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renumberSections() {
  workoutBlocks.querySelectorAll('.workout-block').forEach((block, index) => {
    block.querySelector('.section-heading > span').textContent = String(index + 1).padStart(2, '0');
  });
}

function moveBlock(block, direction) {
  if (direction === 'up' && block.previousElementSibling) {
    workoutBlocks.insertBefore(block, block.previousElementSibling);
  }

  if (direction === 'down' && block.nextElementSibling) {
    workoutBlocks.insertBefore(block.nextElementSibling, block);
  }

  renumberSections();
  renderReceipt();
}

function resetBlock(block) {
  block.querySelectorAll('input, textarea').forEach((field) => {
    field.value = '';
  });
  block.querySelectorAll('select').forEach((field) => {
    field.selectedIndex = 0;
  });
  block.querySelectorAll('.exercise-rows').forEach((rows) => {
    rows.innerHTML = '';
  });
}

function initializeFreshBlock(block) {
  initializeBlock(block);
  if (block.dataset.sectionType === 'exercise') {
    addExerciseRow(block.querySelector('.exercise-rows'));
  }
  if (block.dataset.sectionType === 'stretch') {
    addStretchRow(block.querySelector('.exercise-rows'));
  }
}

function addSection(type) {
  const template = sectionTemplates[type];
  if (!template) return;
  const block = template.cloneNode(true);
  resetBlock(block);
  workoutBlocks.append(block);
  initializeFreshBlock(block);
  renumberSections();
  renderReceipt();
}

function initializeBlock(block) {
  block.querySelectorAll('[data-section-move]').forEach((button) => {
    button.addEventListener('click', () => moveBlock(block, button.dataset.sectionMove));
  });

  block.querySelector('[data-remove-section]')?.addEventListener('click', () => {
    block.remove();
    renumberSections();
    renderReceipt();
  });

  block.querySelector('[data-add-exercise]')?.addEventListener('click', () => {
    addExerciseRow(block.querySelector('.exercise-rows'));
  });

  block.querySelector('[data-add-stretch]')?.addEventListener('click', () => {
    addStretchRow(block.querySelector('.exercise-rows'));
  });

  block.querySelectorAll('[data-exercise-row]').forEach(initializeExerciseRow);
  block.querySelectorAll('[data-stretch-row]').forEach(initializeStretchRow);
}

function addExerciseRow(container) {
  exerciseId += 1;
  const row = document.createElement('article');
  row.className = 'exercise-row';
  row.dataset.exerciseRow = String(exerciseId);
  row.innerHTML = `
    <label>
      <span>Exercise Name</span>
      <input type="search" list="exercise-options" data-field="name" placeholder="Search or type exercise" />
    </label>
    <label>
      <span>Select Exercise</span>
      <select data-field="selectedName">
        <option value="">Choose from list</option>
        ${exerciseNames.map((name) => `<option>${escapeHtml(name)}</option>`).join('')}
      </select>
    </label>
    <div class="equipment-preview" data-equipment-preview></div>
    <label>
      <span>Sets</span>
      <input type="number" min="0" step="1" data-field="sets" placeholder="3" />
    </label>
    <label>
      <span>Reps</span>
      <input type="number" min="0" step="1" data-field="reps" placeholder="10" />
    </label>
    <label>
      <span>Weight</span>
      <input type="text" inputmode="decimal" data-field="weight" placeholder="135 lb" />
    </label>
    <label>
      <span>How did it feel?</span>
      <input type="hidden" data-field="feeling" value="neutral" />
      <div class="feeling-picker" aria-label="How did it feel?">
        <button class="feeling-face sad" type="button" data-feeling-value="sad" aria-label="Difficult or bad"><span class="feeling-glyph">:(</span></button>
        <button class="feeling-face neutral active" type="button" data-feeling-value="neutral" aria-label="Okay"><span class="feeling-glyph">:|</span></button>
        <button class="feeling-face happy" type="button" data-feeling-value="happy" aria-label="Good"><span class="feeling-glyph">:)</span></button>
      </div>
    </label>
    <label class="exercise-notes">
      <span>Notes</span>
      <input type="text" data-field="notes" placeholder="Form cues, pain, PR, tempo..." />
    </label>
    <div class="exercise-row-actions row-tools">
      <button class="move-row" type="button" data-move="up">Move Up</button>
      <button class="move-row" type="button" data-move="down">Move Down</button>
      <button class="remove-exercise" type="button">Remove</button>
    </div>
  `;

  initializeExerciseRow(row);
  container.append(row);
  renderReceipt();
}

function addStretchRow(container) {
  stretchId += 1;
  const row = document.createElement('article');
  row.className = 'exercise-row stretch-row';
  row.dataset.stretchRow = String(stretchId);
  row.innerHTML = `
    <label>
      <span>Stretch Name</span>
      <input type="search" list="stretch-options" data-field="name" placeholder="Search or type stretch" />
    </label>
    <label>
      <span>Select Stretch</span>
      <select data-field="selectedName">
        <option value="">Choose from list</option>
        ${stretchNames.map((name) => `<option>${escapeHtml(name)}</option>`).join('')}
      </select>
    </label>
    <label>
      <span>Target Muscle</span>
      <input type="text" data-field="target" placeholder="Hamstrings" />
    </label>
    <label>
      <span>Hold Time</span>
      <input type="text" data-field="hold" placeholder="30 sec each side" />
    </label>
    <label class="exercise-notes">
      <span>Notes</span>
      <input type="text" data-field="notes" placeholder="Tightness, side-to-side difference, breathing..." />
    </label>
    <div class="exercise-row-actions row-tools">
      <button class="move-row" type="button" data-move="up">Move Up</button>
      <button class="move-row" type="button" data-move="down">Move Down</button>
      <button class="remove-exercise" type="button">Remove</button>
    </div>
  `;

  initializeStretchRow(row);
  container.append(row);
  renderReceipt();
}

function initializeExerciseRow(row) {
  const nameInput = row.querySelector('[data-field="name"]');
  const selectInput = row.querySelector('[data-field="selectedName"]');
  selectInput?.addEventListener('change', (event) => {
    nameInput.value = event.target.value;
    renderEquipmentTags(row);
  });
  nameInput?.addEventListener('input', () => renderEquipmentTags(row));
  row.querySelectorAll('[data-feeling-value]').forEach((button) => {
    button.addEventListener('click', () => updateFeelingStyle(row, button.dataset.feelingValue));
  });
  initializeRowTools(row);
}

function initializeStretchRow(row) {
  row.querySelector('[data-field="selectedName"]')?.addEventListener('change', (event) => {
    const selected = stretches.find((stretch) => stretch.name === event.target.value);
    row.querySelector('[data-field="name"]').value = event.target.value;
    if (selected) {
      row.querySelector('[data-field="target"]').value = selected.target;
      row.querySelector('[data-field="hold"]').value = selected.hold;
    }
  });
  initializeRowTools(row);
}

function initializeRowTools(row) {
  row.querySelector('.remove-exercise')?.addEventListener('click', () => {
    row.remove();
    renderReceipt();
  });

  row.querySelectorAll('[data-move]').forEach((button) => {
    button.addEventListener('click', () => moveRow(row, button.dataset.move));
  });
}

function moveRow(row, direction) {
  if (direction === 'up' && row.previousElementSibling) {
    row.parentElement.insertBefore(row, row.previousElementSibling);
  }
  if (direction === 'down' && row.nextElementSibling) {
    row.parentElement.insertBefore(row.nextElementSibling, row);
  }
  renderReceipt();
}

function renderEquipmentTags(row) {
  const name = row.querySelector('[data-field="name"]').value.trim().toLowerCase();
  const preview = row.querySelector('[data-equipment-preview]');
  const exercise = exerciseLookup.get(name);
  preview.innerHTML = exercise
    ? exercise.equipment.map((item) => `<span>${escapeHtml(item)}</span>`).join('')
    : '';
}

function updateFeelingStyle(row, feeling) {
  row.querySelector('[data-field="feeling"]').value = feeling;
  row.querySelectorAll('[data-feeling-value]').forEach((button) => {
    button.classList.toggle('active', button.dataset.feelingValue === feeling);
  });
  renderReceipt();
}

function fieldValue(scope, selector) {
  return scope.querySelector(selector)?.value.trim() || '';
}

function collectWorkout() {
  const sections = [...workoutBlocks.querySelectorAll('.workout-block')].map((block) => {
    const type = block.dataset.sectionType;
    if (type === 'cardio') {
      const cardio = {};
      block.querySelectorAll('[data-cardio-field]').forEach((field) => {
        cardio[field.dataset.cardioField] = field.value.trim();
      });
      return { type: 'cardio', cardio };
    }

    if (type === 'exercise') {
      const exercises = [...block.querySelectorAll('[data-exercise-row]')]
        .map((row) => {
          const value = (field) => fieldValue(row, `[data-field="${field}"]`);
          const name = value('name') || value('selectedName');
          const exercise = exerciseLookup.get(name.toLowerCase());
          return {
            name,
            sets: value('sets'),
            reps: value('reps'),
            weight: value('weight'),
            feeling: value('feeling') || 'neutral',
            notes: value('notes'),
            equipment: exercise?.equipment || []
          };
        })
        .filter((exercise) => exercise.name || exercise.sets || exercise.reps || exercise.weight || exercise.notes);
      return { type: 'exercise', exercises };
    }

    const loggedStretches = [...block.querySelectorAll('[data-stretch-row]')]
      .map((row) => {
        const value = (field) => fieldValue(row, `[data-field="${field}"]`);
        return {
          name: value('name') || value('selectedName'),
          target: value('target'),
          hold: value('hold'),
          notes: value('notes')
        };
      })
      .filter((stretch) => stretch.name || stretch.target || stretch.hold || stretch.notes);
    return { type: 'stretch', stretches: loggedStretches };
  });

  return { sections };
}

function hasCardio(cardio) {
  return Object.values(cardio).some(Boolean);
}

function receiptRow(label, value) {
  if (!value) return '';
  return `<div class="receipt-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function feelingIcon(feeling) {
  if (feeling === 'sad') return ':(';
  if (feeling === 'happy') return ':)';
  return ':|';
}

function receiptData() {
  return {
    workout: collectWorkout(),
    date: new Date().toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit'
    })
  };
}

function renderReceipt() {
  const { workout, date } = receiptData();
  receipt.innerHTML = `
    <div class="receipt-title">MUSCLE MAP</div>
    <div class="receipt-muted">${escapeHtml(date)}</div>
    <div class="receipt-divider"></div>
    ${workout.sections.map(renderReceiptSection).join('<div class="receipt-divider"></div>')}
    <div class="receipt-divider"></div>
    <div class="receipt-footer">GET SCRAWNY</div>
    <div class="receipt-muted">Workout saved. Keep showing up.</div>
  `;
}

function renderReceiptSection(section) {
  if (section.type === 'cardio') {
    return hasCardio(section.cardio)
      ? `
        <div class="receipt-section-title">Cardio</div>
        ${receiptRow('Type', section.cardio.type)}
        ${receiptRow('Duration', section.cardio.duration)}
        ${receiptRow('Distance', section.cardio.distance)}
        ${receiptRow('Speed', section.cardio.speed)}
        ${receiptRow('Incline', section.cardio.incline)}
        ${receiptRow('Resistance', section.cardio.resistance)}
        ${receiptRow('Calories', section.cardio.calories)}
        ${receiptRow('Heart Rate', section.cardio.heartRate)}
        ${section.cardio.notes ? `<div>Notes: ${escapeHtml(section.cardio.notes)}</div>` : ''}
      `
      : '<div class="receipt-section-title">Cardio</div><div>No cardio entered.</div>';
  }

  if (section.type === 'exercise') {
    return `
      <div class="receipt-section-title">Strength</div>
      ${section.exercises.length
        ? section.exercises.map(renderExerciseReceipt).join('')
        : '<div>No strength exercises entered.</div>'}
    `;
  }

  return `
    <div class="receipt-section-title">Stretches</div>
    ${section.stretches.length
      ? section.stretches.map(renderStretchReceipt).join('')
      : '<div>No stretches entered.</div>'}
  `;
}

function renderExerciseReceipt(exercise, index) {
  return `
    <div class="receipt-exercise">
      <strong>${index + 1}. ${escapeHtml(exercise.name || 'Exercise')}</strong>
      ${exercise.equipment.length ? `<div>Equipment: ${escapeHtml(exercise.equipment.join(', '))}</div>` : ''}
      ${receiptRow('Sets', exercise.sets)}
      ${receiptRow('Reps', exercise.reps)}
      ${receiptRow('Weight', exercise.weight)}
      ${receiptRow('Feeling', `${feelingIcon(exercise.feeling)} ${exercise.feeling}`)}
      ${exercise.notes ? `<div>Notes: ${escapeHtml(exercise.notes)}</div>` : ''}
      <div class="feeling-line ${escapeHtml(exercise.feeling)}"></div>
    </div>
  `;
}

function renderStretchReceipt(stretch, index) {
  return `
    <div class="receipt-exercise">
      <strong>${index + 1}. ${escapeHtml(stretch.name || 'Stretch')}</strong>
      ${receiptRow('Target', stretch.target)}
      ${receiptRow('Hold', stretch.hold)}
      ${stretch.notes ? `<div>Notes: ${escapeHtml(stretch.notes)}</div>` : ''}
    </div>
  `;
}

function printWorkout() {
  renderReceipt();
  window.print();
}

function saveWorkoutPdf() {
  renderReceipt();
  const pdfApi = window.jspdf?.jsPDF;
  if (!pdfApi) {
    window.print();
    return;
  }

  const { workout, date } = receiptData();
  const doc = new pdfApi({ unit: 'pt', format: [226, 900] });
  let y = 28;
  doc.setFont('courier', 'bold');
  doc.setFontSize(12);
  doc.text('MUSCLE MAP', 113, y, { align: 'center' });
  y += 16;
  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.text(date, 113, y, { align: 'center' });
  y = addDivider(doc, y + 10);

  workout.sections.forEach((section) => {
    if (section.type === 'cardio') y = addPdfCardio(doc, y, section.cardio);
    if (section.type === 'exercise') y = addPdfExercises(doc, y, section.exercises);
    if (section.type === 'stretch') y = addPdfStretches(doc, y, section.stretches);
    y = addDivider(doc, y + 4);
  });

  doc.setFont('courier', 'bold');
  doc.text('GET SCRAWNY', 113, y + 10, { align: 'center' });
  doc.setFont('courier', 'normal');
  doc.text('Workout saved. Keep showing up.', 113, y + 24, { align: 'center' });
  doc.save(`muscle-map-workout-${new Date().toISOString().slice(0, 10)}.pdf`);
}

function addPdfCardio(doc, y, cardio) {
  y = addPdfSection(doc, y, 'Cardio');
  if (!hasCardio(cardio)) return addPdfText(doc, y, 'No cardio entered.');
  for (const [label, value] of Object.entries(cardio)) {
    if (value) y = addPdfLine(doc, y, label.replace(/([A-Z])/g, ' $1'), value);
  }
  return y;
}

function addPdfExercises(doc, y, exercises) {
  y = addPdfSection(doc, y, 'Strength');
  if (!exercises.length) return addPdfText(doc, y, 'No strength exercises entered.');
  exercises.forEach((exercise, index) => {
    y = addPdfText(doc, y, `${index + 1}. ${exercise.name || 'Exercise'}`, true);
    if (exercise.equipment.length) y = addPdfText(doc, y, `Equipment: ${exercise.equipment.join(', ')}`);
    if (exercise.sets) y = addPdfLine(doc, y, 'Sets', exercise.sets);
    if (exercise.reps) y = addPdfLine(doc, y, 'Reps', exercise.reps);
    if (exercise.weight) y = addPdfLine(doc, y, 'Weight', exercise.weight);
    y = addPdfLine(doc, y, 'Feeling', `${feelingIcon(exercise.feeling)} ${exercise.feeling}`);
    if (exercise.notes) y = addPdfText(doc, y, `Notes: ${exercise.notes}`);
    doc.setDrawColor(exercise.feeling === 'sad' ? '#ff5c4d' : exercise.feeling === 'happy' ? '#1fbf75' : '#ffc400');
    doc.setLineWidth(3);
    doc.line(16, y, 210, y);
    y += 12;
  });
  return y;
}

function addPdfStretches(doc, y, loggedStretches) {
  y = addPdfSection(doc, y, 'Stretches');
  if (!loggedStretches.length) return addPdfText(doc, y, 'No stretches entered.');
  loggedStretches.forEach((stretch, index) => {
    y = addPdfText(doc, y, `${index + 1}. ${stretch.name || 'Stretch'}`, true);
    if (stretch.target) y = addPdfLine(doc, y, 'Target', stretch.target);
    if (stretch.hold) y = addPdfLine(doc, y, 'Hold', stretch.hold);
    if (stretch.notes) y = addPdfText(doc, y, `Notes: ${stretch.notes}`);
    y += 4;
  });
  return y;
}

function addDivider(doc, y) {
  doc.setDrawColor('#111111');
  doc.setLineWidth(0.7);
  doc.line(16, y, 210, y);
  return y + 14;
}

function addPdfSection(doc, y, title) {
  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.text(title.toUpperCase(), 16, y);
  return y + 12;
}

function addPdfLine(doc, y, label, value) {
  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.text(String(label), 16, y);
  doc.text(String(value), 210, y, { align: 'right', maxWidth: 112 });
  return y + 11;
}

function addPdfText(doc, y, text, bold = false) {
  doc.setFont('courier', bold ? 'bold' : 'normal');
  doc.setFontSize(8);
  const lines = doc.splitTextToSize(String(text), 194);
  doc.text(lines, 16, y);
  return y + lines.length * 10 + 2;
}

exerciseOptions.innerHTML = exerciseNames.map((name) => `<option value="${escapeHtml(name)}"></option>`).join('');
stretchOptions.innerHTML = stretchNames.map((name) => `<option value="${escapeHtml(name)}"></option>`).join('');

workoutBlocks.querySelectorAll('.workout-block').forEach((block) => {
  sectionTemplates[block.dataset.sectionType] = block.cloneNode(true);
});
workoutBlocks.querySelectorAll('.workout-block').forEach(initializeBlock);
workoutBlocks.querySelectorAll('[data-section-type="exercise"] .exercise-rows').forEach(addExerciseRow);
addSectionButtons.forEach((button) => {
  button.addEventListener('click', () => addSection(button.dataset.addSection));
});
renumberSections();
workoutForm.addEventListener('input', renderReceipt);
workoutForm.addEventListener('change', renderReceipt);
printButton.addEventListener('click', printWorkout);
savePdfButton.addEventListener('click', saveWorkoutPdf);
renderReceipt();
