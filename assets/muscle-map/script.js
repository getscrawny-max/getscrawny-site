const { educationContent, muscleGroups, muscleOrder, stretches } = window.MUSCLE_MAP_DATA;

let selectedMuscle = null;
let exerciseSort = 'popular';
let stretchSort = 'popular';
let currentView = 'front';
let exerciseQuery = '';
let stretchQuery = '';

const bodyStage = document.querySelector('#body-stage');
const viewButtons = document.querySelectorAll('[data-view]');
const nameEl = document.querySelector('#muscle-name');
const summaryEl = document.querySelector('#muscle-summary');
const selectedDot = document.querySelector('#selected-dot');
const exerciseList = document.querySelector('#exercise-list');
const quickSelect = document.querySelector('#quick-select');
const diagram = document.querySelector('#muscle-diagram');
const modalBackdrop = document.querySelector('#modal-backdrop');
const modalTitle = document.querySelector('#modal-title');
const modalBody = document.querySelector('#modal-body');
const modalClose = document.querySelector('#modal-close');
const exerciseSortEl = document.querySelector('#exercise-sort');
const exerciseSearchEl = document.querySelector('#exercise-search');
const pageStretchSortEl = document.querySelector('#page-stretch-sort');
const stretchSearchEl = document.querySelector('#stretch-search');
const pageStretchGrid = document.querySelector('#page-stretch-grid');
const frontMuscles = new Set(['chest', 'abs', 'biceps', 'quads', 'calves']);

const searchAliases = {
  legs: ['quads', 'hamstrings', 'calves', 'squat', 'lunge', 'deadlift', 'leg'],
  leg: ['quads', 'hamstrings', 'calves', 'squat', 'lunge', 'deadlift', 'leg'],
  arms: ['biceps', 'triceps', 'curl', 'extension', 'press', 'row'],
  arm: ['biceps', 'triceps', 'curl', 'extension', 'press', 'row'],
  pecs: ['chest', 'bench', 'push-up', 'press', 'fly'],
  pec: ['chest', 'bench', 'push-up', 'press', 'fly'],
  stomach: ['core', 'abs', 'plank', 'dead bug', 'crunch'],
  belly: ['core', 'abs', 'plank', 'dead bug', 'crunch'],
  glutes: ['quads', 'hamstrings', 'squat', 'deadlift', 'lunge'],
  butt: ['quads', 'hamstrings', 'squat', 'deadlift', 'lunge'],
  shoulders: ['press', 'row', 'chest', 'back', 'triceps'],
  shoulder: ['press', 'row', 'chest', 'back', 'triceps'],
  back: ['back', 'row', 'pull', 'deadlift'],
  abs: ['core', 'abs', 'plank', 'dead bug', 'crunch'],
  core: ['core', 'abs', 'plank', 'dead bug', 'crunch']
};

function matchesSearch(haystack, query) {
  if (!query) return true;
  if (haystack.includes(query)) return true;
  const tokens = query.split(/[\s,]+/).filter(Boolean);
  return tokens.every((token) => {
    if (haystack.includes(token)) return true;
    return (searchAliases[token] || []).some((alias) => haystack.includes(alias));
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function selectMuscle(id, options = {}) {
  const shouldClear = options.toggle && selectedMuscle === id;
  selectedMuscle = shouldClear ? null : id;
  const muscle = selectedMuscle ? muscleGroups[selectedMuscle] : null;

  nameEl.textContent = muscle ? muscle.name : 'All Muscle Groups';
  summaryEl.textContent = muscle
    ? muscle.summary
    : 'Browse bodyweight, equipment-based, powerlifting, and Olympic-style movements across the full exercise library.';
  selectedDot.style.background = muscle ? muscle.color : 'var(--accent)';

  document.querySelectorAll('[data-muscle]').forEach((region) => {
    const isActive = muscle && region.dataset.muscle === selectedMuscle;
    region.classList.toggle('active', Boolean(isActive));
    if (region.classList.contains('hotspot')) {
      region.style.background = isActive ? muscle.color : '';
    }
  });
  document.querySelectorAll('[data-muscle-glow]').forEach((region) => {
    const isActive = muscle && region.dataset.muscleGlow === selectedMuscle;
    region.classList.toggle('active', Boolean(isActive));
    region.style.borderColor = isActive ? muscle.color : '';
  });

  quickSelect.querySelectorAll('.chip').forEach((button) => {
    button.classList.toggle('active', muscle && button.dataset.muscle === selectedMuscle);
  });

  const exerciseSource = muscle
    ? muscle.exercises.map((exercise) => ({ ...exercise, groupName: muscle.name }))
    : muscleOrder.flatMap((muscleId) =>
        muscleGroups[muscleId].exercises.map((exercise) => ({ ...exercise, groupName: muscleGroups[muscleId].name }))
      );

  const filteredExercises = sortItems(exerciseSource, exerciseSort).filter((exercise) => {
    const haystack = `${exercise.name} ${exercise.description} ${exercise.groupName} ${(exercise.equipment || []).join(' ')}`.toLowerCase();
    return matchesSearch(haystack, exerciseQuery);
  });

  exerciseList.innerHTML = filteredExercises
    .map((exercise) => {
      const roleClass = exercise.role === 'Primary muscle' ? 'primary' : 'secondary';
      const equipment = (exercise.equipment || []).map((item) => `<span>${escapeHtml(item)}</span>`).join('');
      return `
        <article class="exercise-card expandable" tabindex="0" role="button" aria-expanded="false">
          <div class="exercise-card-title">
            <div>
              <h4>${escapeHtml(exercise.name)}</h4>
              <p class="exercise-group-label">${escapeHtml(exercise.groupName)}</p>
            </div>
            <span class="role-badge ${roleClass}">${escapeHtml(exercise.role)}</span>
          </div>
          <div class="equipment-tags">${equipment}</div>
          <p class="exercise-preview">${escapeHtml(exercise.description)}</p>
          <div class="exercise-detail">
            <p>Use this as a movement option for ${escapeHtml(exercise.groupName)}. Choose a version and load that lets the body practice control before intensity.</p>
          </div>
        </article>
      `;
    })
    .join('') || '<p class="empty-state">No exercises match that search.</p>';

  if (muscle) {
    renderDiagram(muscle);
    setView(frontMuscles.has(selectedMuscle) ? 'front' : 'back');
  } else {
    diagram.innerHTML = '<span class="mini-label all-muscle-label">ALL</span>';
  }
}

function sortItems(items, sortMode) {
  const roleRank = (role) => (role === 'Primary muscle' ? 0 : 1);
  return [...items].sort((a, b) => {
    if (sortMode === 'alpha') {
      return a.name.localeCompare(b.name);
    }

    if (sortMode === 'primary-first') {
      return roleRank(a.role) - roleRank(b.role) || b.popularity - a.popularity || a.name.localeCompare(b.name);
    }

    if (sortMode === 'secondary-first') {
      return roleRank(b.role) - roleRank(a.role) || b.popularity - a.popularity || a.name.localeCompare(b.name);
    }

    return b.popularity - a.popularity || a.name.localeCompare(b.name);
  });
}

function renderQuickSelect() {
  quickSelect.innerHTML = muscleOrder
    .map((id) => `<button class="chip" type="button" data-muscle="${id}">${muscleGroups[id].name}</button>`)
    .join('');

  quickSelect.addEventListener('click', (event) => {
    const button = event.target.closest('[data-muscle]');
    if (button) {
      selectMuscle(button.dataset.muscle, { toggle: true });
    }
  });
}

function renderDiagram(muscle) {
  const active = {
    chest: ['mini-torso'],
    back: ['mini-torso'],
    abs: ['mini-core'],
    biceps: ['mini-left-arm', 'mini-right-arm'],
    triceps: ['mini-left-arm', 'mini-right-arm'],
    quads: ['mini-left-leg', 'mini-right-leg'],
    hamstrings: ['mini-left-leg', 'mini-right-leg'],
    calves: ['mini-left-leg', 'mini-right-leg']
  }[muscle.id] || [];
  const part = (name) => `<span class="mini-part ${name} ${active.includes(name) ? 'active' : ''}"></span>`;
  diagram.style.setProperty('--mini-color', muscle.color);
  diagram.innerHTML = `
    ${part('mini-torso')}
    ${part('mini-core')}
    ${part('mini-left-arm')}
    ${part('mini-right-arm')}
    ${part('mini-left-leg')}
    ${part('mini-right-leg')}
    <span class="mini-label">${escapeHtml(muscle.name)}</span>
  `;
}

function setView(view) {
  currentView = view;
  if (bodyStage) {
    bodyStage.classList.toggle('front-view', view === 'front');
    bodyStage.classList.toggle('back-view', view === 'back');
  }
  viewButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.view === view);
  });
}

function openModal(type) {
  modalBackdrop.classList.remove('hidden');

  if (type === 'stretches') {
    modalTitle.textContent = 'Stretches';
    modalBody.innerHTML = `
      <div class="modal-tools">
        <label class="sort-control">
          <span>Sort stretches</span>
          <select id="stretch-sort">
            <option value="popular"${stretchSort === 'popular' ? ' selected' : ''}>Most popular</option>
            <option value="alpha"${stretchSort === 'alpha' ? ' selected' : ''}>Alphabetical</option>
            <option value="muscle-asc"${stretchSort === 'muscle-asc' ? ' selected' : ''}>Muscle A-Z</option>
            <option value="muscle-desc"${stretchSort === 'muscle-desc' ? ' selected' : ''}>Muscle Z-A</option>
          </select>
        </label>
      </div>
      <div class="stretch-grid">
        ${sortStretches(stretches, stretchSort)
          .map(
            (stretch) => `
              <article class="stretch-card">
                <div>
                  <span class="stretch-group">${escapeHtml(stretch.group)}</span>
                  <h3>${escapeHtml(stretch.name)}</h3>
                </div>
                <p>${escapeHtml(stretch.instructions)}</p>
                <div class="stretch-meta">${escapeHtml(stretch.target)} - ${escapeHtml(stretch.hold)}</div>
              </article>
            `
          )
          .join('')}
      </div>
    `;
    modalBody.querySelector('#stretch-sort').addEventListener('change', (event) => {
      stretchSort = event.target.value;
      openModal('stretches');
    });
    return;
  }

  const content = educationContent[type];
  modalTitle.textContent = content.title;
  modalBody.innerHTML = `
    <div class="education-copy">
      <p class="modal-intro">${escapeHtml(content.intro)}</p>
      ${content.sections
        .map(
          (section) => `
            <section>
              <h3>${escapeHtml(section.heading)}</h3>
              <p>${escapeHtml(section.body)}</p>
            </section>
          `
        )
        .join('')}
    </div>
  `;
}

function sortStretches(items, sortMode) {
  return [...items].sort((a, b) => {
    if (sortMode === 'alpha') {
      return a.name.localeCompare(b.name);
    }

    if (sortMode === 'muscle-asc') {
      return a.group.localeCompare(b.group) || b.popularity - a.popularity;
    }

    if (sortMode === 'muscle-desc') {
      return b.group.localeCompare(a.group) || b.popularity - a.popularity;
    }

    return b.popularity - a.popularity || a.group.localeCompare(b.group);
  });
}

function closeModal() {
  modalBackdrop.classList.add('hidden');
}

document.querySelectorAll('.map-muscle').forEach((region) => {
  region.addEventListener('click', (event) => {
    event.stopPropagation();
    selectMuscle(region.dataset.muscle);
  });
  region.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectMuscle(region.dataset.muscle);
    }
  });
});

document.querySelectorAll('[data-modal]').forEach((button) => {
  button.addEventListener('click', () => openModal(button.dataset.modal));
});

function renderPageStretches() {
  if (!pageStretchGrid) {
    return;
  }

  const filteredStretches = sortStretches(stretches, pageStretchSortEl.value).filter((stretch) => {
    const haystack = `${stretch.group} ${stretch.name} ${stretch.target} ${stretch.instructions}`.toLowerCase();
    return matchesSearch(haystack, stretchQuery);
  });

  pageStretchGrid.innerHTML = filteredStretches
    .map(
      (stretch) => `
        <article class="stretch-card expandable" tabindex="0" role="button" aria-expanded="false">
          <div>
            <span class="stretch-group">${escapeHtml(stretch.group)}</span>
            <h3>${escapeHtml(stretch.name)}</h3>
          </div>
          <p class="stretch-preview">${escapeHtml(stretch.instructions)}</p>
          <div class="stretch-meta">${escapeHtml(stretch.target)} - ${escapeHtml(stretch.hold)}</div>
          <ol class="stretch-steps">
            ${stretchSteps(stretch).map((step) => `<li>${escapeHtml(step)}</li>`).join('')}
          </ol>
        </article>
      `
    )
    .join('') || '<p class="empty-state">No stretches match that search.</p>';
}

function stretchSteps(stretch) {
  return [
    `Set up for ${stretch.name} with enough space and stable support if needed.`,
    `Find the target area: ${stretch.target}.`,
    'Place your joints in a comfortable starting position.',
    stretch.instructions,
    'Move slowly until you feel a gentle stretch, not sharp pain.',
    'Breathe steadily and keep your face, jaw, and shoulders relaxed.',
    `Hold for ${stretch.hold}.`,
    'Ease out slowly before switching sides or repeating.'
  ];
}

pageStretchSortEl?.addEventListener('change', renderPageStretches);
stretchSearchEl?.addEventListener('input', (event) => {
  stretchQuery = event.target.value.trim().toLowerCase();
  renderPageStretches();
});
pageStretchGrid?.addEventListener('click', (event) => {
  const card = event.target.closest('.stretch-card');
  if (card) {
    const expanded = !card.classList.contains('expanded');
    card.classList.toggle('expanded', expanded);
    card.setAttribute('aria-expanded', String(expanded));
  }
});
pageStretchGrid?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    const card = event.target.closest('.stretch-card');
    if (card) {
      event.preventDefault();
      const expanded = !card.classList.contains('expanded');
      card.classList.toggle('expanded', expanded);
      card.setAttribute('aria-expanded', String(expanded));
    }
  }
});
exerciseList?.addEventListener('click', (event) => {
  const card = event.target.closest('.exercise-card');
  if (card) {
    const expanded = !card.classList.contains('expanded');
    card.classList.toggle('expanded', expanded);
    card.setAttribute('aria-expanded', String(expanded));
  }
});
exerciseList?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    const card = event.target.closest('.exercise-card');
    if (card) {
      event.preventDefault();
      const expanded = !card.classList.contains('expanded');
      card.classList.toggle('expanded', expanded);
      card.setAttribute('aria-expanded', String(expanded));
    }
  }
});
viewButtons.forEach((button) => {
  button.addEventListener('click', () => setView(button.dataset.view));
});

if (window.location.hash) {
  const modalType = window.location.hash.slice(1);
  if (educationContent[modalType]) {
    openModal(modalType);
  }
}

exerciseSortEl.addEventListener('change', (event) => {
  exerciseSort = event.target.value;
  selectMuscle(selectedMuscle);
});
exerciseSearchEl.addEventListener('input', (event) => {
  exerciseQuery = event.target.value.trim().toLowerCase();
  selectMuscle(selectedMuscle);
});

modalClose.addEventListener('click', closeModal);
modalBackdrop.addEventListener('mousedown', (event) => {
  if (event.target === modalBackdrop) {
    closeModal();
  }
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeModal();
  }
});

renderQuickSelect();
selectMuscle(selectedMuscle);
renderPageStretches();
