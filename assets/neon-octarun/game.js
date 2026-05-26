(() => {
  const canvas = document.querySelector('[data-octa-canvas]');
  if (!canvas || !window.THREE) return;

  const hud = {
    score: document.querySelector('[data-octa-score]'),
    level: document.querySelector('[data-octa-level]'),
    countdown: document.querySelector('[data-octa-countdown]'),
    start: document.querySelector('[data-octa-start]'),
    modeToggle: document.querySelector('[data-octa-mode-toggle]'),
    restart: document.querySelector('[data-octa-restart]'),
    fullscreen: document.querySelector('[data-octa-fullscreen]'),
    ballColor: document.querySelector('[data-octa-ball-color]'),
    ballColorInput: document.querySelector('[data-octa-ball-color-input]'),
    ballSwatch: document.querySelector('[data-octa-ball-swatch]'),
    levelPick: document.querySelector('[data-octa-level-pick]'),
    shell: document.querySelector('.octarun-shell'),
    stage: document.querySelector('[data-octa-stage]'),
    spaceVideo: document.querySelector('.octarun-space-video'),
    pathPalette: document.querySelector('[data-octa-path-palette]'),
    music: document.querySelector('[data-octa-music]'),
    fx: document.querySelector('[data-octa-fx]'),
    scoreForm: document.querySelector('[data-octa-score-form]'),
    initials: document.querySelector('[data-octa-initials]'),
    scoreList: document.querySelector('[data-octa-score-list]'),
    overlay: document.querySelector('[data-octa-overlay]'),
    overlayStart: document.querySelector('[data-octa-overlay-start]')
  };

  function ensureHudControl(selector, createControl) {
    let control = document.querySelector(selector);
    if (control || !hud.restart?.parentElement) return control;
    control = createControl();
    hud.restart.parentElement.insertBefore(control, hud.restart);
    return control;
  }

  hud.start = ensureHudControl('[data-octa-start]', () => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'octarun-start-button';
    button.dataset.octaStart = '';
    button.textContent = 'Start';
    return button;
  });

  hud.modeToggle = ensureHudControl('[data-octa-mode-toggle]', () => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'octarun-mode-toggle';
    button.dataset.octaModeToggle = '';
    button.setAttribute('aria-pressed', 'false');
    button.textContent = 'Normal';
    return button;
  });

  const mobileJumpButton = document.createElement('button');
  mobileJumpButton.type = 'button';
  mobileJumpButton.className = 'octarun-jump-button';
  mobileJumpButton.textContent = 'Jump';
  mobileJumpButton.setAttribute('aria-label', 'Jump');
  hud.stage?.appendChild(mobileJumpButton);

  const THREE = window.THREE;

  function supportsWebGL() {
    try {
      const probe = document.createElement('canvas');
      return Boolean(window.WebGLRenderingContext && (probe.getContext('webgl') || probe.getContext('experimental-webgl')));
    } catch (_) {
      return false;
    }
  }

  function showWebGLFallback(message) {
    if (!hud.stage) return;
    hud.stage.classList.add('is-reduced-graphics');
    hud.stage.innerHTML = '<div class="octarun-overlay is-visible octarun-webgl-fallback"><p class="eyebrow">Graphics unavailable</p><h2>OctaRun needs WebGL.</h2><div class="octarun-overlay-copy"><p>' + message + '</p><p>Try a current version of Chrome, Safari, Firefox, or Edge with hardware acceleration enabled.</p></div></div>';
  }

  if (!supportsWebGL()) {
    showWebGLFallback('This browser could not start a WebGL graphics context.');
    return;
  }

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x030615, 0.016);
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 260);
  camera.position.set(0, 0, 9.5);
  camera.lookAt(0, 0, -16);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: window.matchMedia ? !window.matchMedia('(pointer: coarse)').matches : true,
      alpha: true,
      powerPreference: 'high-performance'
    });
  } catch (_) {
    showWebGLFallback('The graphics context could not be created on this device.');
    return;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.matchMedia && window.matchMedia('(pointer: coarse)').matches ? 1.5 : 2));

  const lanes = 8;
  const radius = 4.15;
  const chunkSpacing = 3.34;
  const chunkDepth = 3.34;
  const laneArc = (Math.PI * 2) / lanes;
  const playerZ = 0.18;
  const playerCollisionRadius = 0.58;
  const gapFrontCollisionDepth = chunkDepth / 2 + 0.16 + playerCollisionRadius;
  const gapBackCollisionDepth = chunkDepth / 2 - 0.42;
  const wallHalfDepth = 0.22;
  const wallCollisionDepth = 0.34;
  const gapClearance = 0.42;
  const wallClearance = 0.72;
  const levelConfigs = [
    { level: 1, duration: 30, speed: 5.15, hazards: [2, 2], wallChance: 0.14, gapRunChance: 0.08, safeStart: 7, copy: 'Level 2 opens up after 30 seconds with more lane reads.' },
    { level: 2, duration: 60, speed: 5.95, hazards: [2, 3], wallChance: 0.22, gapRunChance: 0.16, safeStart: 7, copy: 'Level 3 runs 90 seconds and asks for cleaner jumps.' },
    { level: 3, duration: 90, speed: 6.75, hazards: [3, 4], wallChance: 0.23, gapRunChance: 0.48, safeStart: 6, copy: 'Level 4 stretches to two minutes with tighter timing.' },
    { level: 4, duration: 120, speed: 7.55, hazards: [4, 5], wallChance: 0.40, gapRunChance: 0.22, safeStart: 5, copy: 'Level 5 is the two-and-a-half-minute final run.' },
    { level: 5, duration: Infinity, speed: 8.35, hazards: [5, 6], wallChance: 0.48, gapRunChance: 0.18, safeStart: 5, copy: 'Level 5 runs endlessly. Chase the highest score you can hold.' }
  ];

  const pathPalettes = [
    { id: 'neon', name: 'Neon', colors: [0xfe0000, 0xfdfe02, 0x0bff01, 0x011efe, 0xfe00f6] },
    { id: 'bursting-star', name: 'Bursting Star', colors: [0xff0000, 0xff43af, 0xff8600, 0xfff105, 0xff9bd9] },
    { id: 'citeh', name: 'Citeh', colors: [0xeeeeee, 0xa2d2ff, 0x99c2db, 0x5887d6, 0x606060] },
    { id: 'fiona', name: 'Fiona', colors: [0x1e5b0b, 0xc8d707, 0x7cc427, 0xba0012, 0xf0c17f] },
    { id: 'barca', name: 'Barca', colors: [0xa50044, 0x004d98, 0xedbb00, 0xffed02, 0xdb0030] },
    { id: 'color-blind', name: 'Color Blind', colors: [0xd55e00, 0xcc79a7, 0x0072b2, 0xf0e442, 0x009e73] },
    { id: 'plucky-parrot', name: 'Plucky Parrot', colors: [0xfdd413, 0xf6a716, 0x91bf7e, 0x1cafec, 0x216a8d] },
    { id: 'omni-vincible', name: 'Omni-Vincible', colors: [0xffe556, 0x00bcf0, 0x303539, 0xc8412d, 0xe1ebed] }
  ];
  let pathPaletteMode = 'neon';

  function allPaletteColors() {
    return [...new Set(pathPalettes.flatMap((palette) => palette.colors))];
  }

  function activePathPalette() {
    return pathPalettes.find((palette) => palette.id === pathPaletteMode) || pathPalettes[0];
  }

  function lanePoint(lane, edgeOffset, radial, z) {
    const angle = lane * laneArc + edgeOffset;
    return [Math.sin(angle) * radial, -Math.cos(angle) * radial, z];
  }

  function makeLaneSurfaceGeometry(lane, depth = chunkDepth) {
    const overlap = 0.008;
    const a0 = -laneArc / 2 - overlap;
    const a1 = laneArc / 2 + overlap;
    const z0 = -depth / 2 - 0.16;
    const z1 = depth / 2 + 0.16;
    const panelRadius = radius + 0.1;
    const verts = [
      ...lanePoint(lane, a0, panelRadius, z0),
      ...lanePoint(lane, a1, panelRadius, z0),
      ...lanePoint(lane, a1, panelRadius, z1),
      ...lanePoint(lane, a0, panelRadius, z1)
    ];
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geom.setIndex([0, 1, 2, 0, 2, 3]);
    geom.computeVertexNormals();
    return geom;
  }

  function makeLaneWallGeometry(lane) {
    const edgeInset = 0.04;
    const a0 = -laneArc / 2 + edgeInset;
    const a1 = laneArc / 2 - edgeInset;
    const z0 = -wallHalfDepth;
    const z1 = wallHalfDepth;
    const outer = radius + 0.06;
    const inner = radius - 1.34;
    const verts = [
      ...lanePoint(lane, a0, outer, z0),
      ...lanePoint(lane, a1, outer, z0),
      ...lanePoint(lane, a1, inner, z0),
      ...lanePoint(lane, a0, inner, z0),
      ...lanePoint(lane, a0, outer, z1),
      ...lanePoint(lane, a1, outer, z1),
      ...lanePoint(lane, a1, inner, z1),
      ...lanePoint(lane, a0, inner, z1)
    ];
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geom.setIndex([
      0, 1, 2, 0, 2, 3,
      4, 6, 5, 4, 7, 6,
      0, 4, 5, 0, 5, 1,
      1, 5, 6, 1, 6, 2,
      2, 6, 7, 2, 7, 3,
      3, 7, 4, 3, 4, 0
    ]);
    geom.computeVertexNormals();
    return geom;
  }

  function makeWallStripeGeometry(lane, centerRatio) {
    const edgeInset = 0.082;
    const a0 = -laneArc / 2 + edgeInset;
    const a1 = laneArc / 2 - edgeInset;
    const outer = radius + 0.11;
    const inner = radius - 1.16;
    const z = wallHalfDepth + 0.02;
    const stripeRadius = inner + (outer - inner) * centerRatio;
    const stripeHalfHeight = 0.065;
    const verts = [
      ...lanePoint(lane, a0, stripeRadius - stripeHalfHeight, z),
      ...lanePoint(lane, a1, stripeRadius - stripeHalfHeight, z),
      ...lanePoint(lane, a1, stripeRadius + stripeHalfHeight, z),
      ...lanePoint(lane, a0, stripeRadius + stripeHalfHeight, z)
    ];
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geom.setIndex([0, 1, 2, 0, 2, 3]);
    geom.computeVertexNormals();
    return geom;
  }

  const panelGeometries = Array.from({ length: lanes }, (_, lane) => makeLaneSurfaceGeometry(lane));
  const wallGeometries = Array.from({ length: lanes }, (_, lane) => makeLaneWallGeometry(lane));
  const wallStripeGeometries = Array.from({ length: lanes }, (_, lane) => [0.28, 0.5, 0.72].map((ratio) => makeWallStripeGeometry(lane, ratio)));
  const colors = [0x31a6ff, 0xa838ff, 0x4db8ff, 0xd23dff, 0x385dcb];
  const materials = colors.map((color) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.33, roughness: 0.38, metalness: 0.18, side: THREE.DoubleSide, flatShading: true }));
  const wallMaterials = Array.from({ length: materials.length }, () => new THREE.MeshStandardMaterial({ color: 0xffd23c, emissive: 0xff8a00, emissiveIntensity: 0.48, roughness: 0.34, metalness: 0.08, side: THREE.DoubleSide, flatShading: true }));
  const wallStripeMaterials = Array.from({ length: materials.length }, () => new THREE.MeshBasicMaterial({ color: 0x050505, transparent: false, opacity: 1, side: THREE.DoubleSide, depthWrite: false }));

  function colorLuminance(hex) {
    const color = new THREE.Color(hex);
    const channels = [color.r, color.g, color.b].map((channel) => {
      return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  }

  function contrastRatio(colorA, colorB) {
    const bright = Math.max(colorLuminance(colorA), colorLuminance(colorB));
    const dark = Math.min(colorLuminance(colorA), colorLuminance(colorB));
    return (bright + 0.05) / (dark + 0.05);
  }

  function contrastingPaletteColor(candidates, trackColor) {
    return candidates.reduce((best, candidate) => {
      const score = contrastRatio(candidate, trackColor);
      return score > best.score ? { color: candidate, score } : best;
    }, { color: candidates[0], score: -1 }).color;
  }

  function applyLevelPalette() {
    const activePalette = activePathPalette();
    const palette = activePalette.colors;
    const trackColors = materials.map((_, index) => palette[(levelIndex + index) % palette.length]);
    const trackColorSet = new Set(trackColors);
    const barrierCandidates = allPaletteColors().filter((color) => !trackColorSet.has(color));
    materials.forEach((material, index) => {
      const color = trackColors[index];
      material.color.setHex(color);
      material.emissive.setHex(color);
      material.needsUpdate = true;
    });
    const fogColor = new THREE.Color(palette[(levelIndex + 4) % palette.length] || palette[0]).lerp(new THREE.Color(0x030615), 0.72);
    scene.fog.color.copy(fogColor);

    wallMaterials.forEach((material, index) => {
      const barrierColor = contrastingPaletteColor(barrierCandidates, trackColors[index]);
      material.color.setHex(barrierColor);
      material.emissive.setHex(barrierColor);
      material.emissiveIntensity = 0.48;
      material.needsUpdate = true;
      const markerColor = contrastRatio(0x050505, barrierColor) > contrastRatio(0xffffff, barrierColor) ? 0x050505 : 0xffffff;
      wallStripeMaterials[index].color.setHex(markerColor);
      wallStripeMaterials[index].needsUpdate = true;
    });
  }
  let ballGlowColor = 0x8eeaff;
  const player = new THREE.Group();
  const playerRoll = new THREE.Group();
  const playerFallback = new THREE.Mesh(
    new THREE.CircleGeometry(0.62, 64),
    new THREE.MeshStandardMaterial({
      color: ballGlowColor,
      emissive: 0x2ddcff,
      emissiveIntensity: 0.34,
      roughness: 0.26,
      metalness: 0.2,
      side: THREE.DoubleSide
    })
  );
  player.add(playerRoll);
  playerRoll.add(playerFallback);
  const playerGlow = new THREE.Mesh(new THREE.SphereGeometry(0.78, 40, 20), new THREE.MeshBasicMaterial({ color: ballGlowColor, transparent: true, opacity: 0.24, blending: THREE.AdditiveBlending, depthWrite: false }));
  const trail = new THREE.Mesh(new THREE.TorusGeometry(1.26, 0.035, 8, 72), new THREE.MeshBasicMaterial({ color: ballGlowColor, transparent: true, opacity: 0, blending: THREE.AdditiveBlending }));
  player.renderOrder = 4;
  playerFallback.renderOrder = 4;
  playerGlow.renderOrder = 2;
  trail.renderOrder = 1;
  const world = new THREE.Group();
  scene.add(world);
  scene.add(player);
  scene.add(playerGlow);
  scene.add(trail);
  scene.add(new THREE.AmbientLight(0x6b86ff, 0.72));
  const keyLight = new THREE.PointLight(0x44e8ff, 3.2, 35);
  keyLight.position.set(0, 3, 5);
  scene.add(keyLight);

  const starGeom = new THREE.BufferGeometry();
  const starPositions = [];
  for (let i = 0; i < 420; i++) starPositions.push((Math.random() - 0.5) * 70, (Math.random() - 0.5) * 42, -Math.random() * 170 - 10);
  starGeom.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(starGeom, new THREE.PointsMaterial({ color: 0xbbe9ff, size: 0.08, transparent: true, opacity: 0.72 }));
  scene.add(stars);

  let chunks = [];
  let state = 'ready';
  let score = 0;
  let neonOn = true;
  let hardMode = false;
  let speed = levelConfigs[0].speed;
  let levelIndex = 0;
  let levelElapsed = 0;
  let chunkSerial = 0;
  let previousGapLanes = [];
  let laneIndex = 0;
  let laneStep = 0;
  let targetAngle = 0;
  let visualAngle = 0;
  let jump = 0;
  let jumpVel = 0;
  let shake = 0;
  let trailEnergy = 0;
  let ballSpin = 0;
  let ballSpinVel = 0;
  let ballRollAngle = 0;
  let musicOn = true;
  let fxOn = true;
  let audioContext = null;
  let activeMusic = null;
  let activeMusicIndex = -1;
  let pendingScore = 0;
  let movementQueue = [];
  let jumpQueued = false;
  let laneInputCooldown = 0;
  const laneInputDelay = 0.075;
  let last = performance.now();

  const musicTracks = ['OctoRun.mp3', 'OctoRun-2.mp3', 'OctoRun-3.mp3', 'OctoRun-4.mp3'].map((file) => {
    const audio = new Audio('assets/octarun_music/' + file);
    audio.preload = 'auto';
    audio.volume = 0.28;
    audio.addEventListener('ended', () => playNextMusicTrack());
    return audio;
  });
  const gameOverAudio = new Audio('assets/game-over.mp3');
  gameOverAudio.preload = 'auto';
  gameOverAudio.volume = 0.46;
  const levelCompleteAudio = new Audio('assets/octarun_music/LevelComplete_Cheer.mp3');
  levelCompleteAudio.preload = 'auto';
  levelCompleteAudio.volume = 0.5;

  const hardModeMultiplier = () => (hardMode ? 1.5 : 1);
  const currentConfig = () => levelConfigs[levelIndex];
  const isEndlessLevel = () => !Number.isFinite(currentConfig().duration);
  const levelProgress = () => levelElapsed * hardModeMultiplier();
  const levelSecondsLeft = () => isEndlessLevel() ? null : Math.max(0, Math.ceil(currentConfig().duration - levelProgress()));
  const unlockStorageKey = 'octarunUnlockedLevel';
  const leaderboardStorageKey = 'octarunLeaderboard';

  function clampLevelNumber(value) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return 1;
    return Math.max(1, Math.min(levelConfigs.length, parsed));
  }

  function readUnlockedLevel() {
    try {
      return clampLevelNumber(sessionStorage.getItem(unlockStorageKey) || '1');
    } catch (_) {
      return 1;
    }
  }

  let unlockedLevel = readUnlockedLevel();

  function saveUnlockedLevel(levelNumber) {
    unlockedLevel = Math.max(unlockedLevel, clampLevelNumber(levelNumber));
    try {
      sessionStorage.setItem(unlockStorageKey, String(unlockedLevel));
    } catch (_) {}
  }

  function unlockNextLevel() {
    saveUnlockedLevel(Math.min(levelConfigs.length, currentConfig().level + 1));
  }

  function readLeaderboard() {
    try {
      const parsed = JSON.parse(localStorage.getItem(leaderboardStorageKey) || '[]');
      return Array.isArray(parsed) ? parsed.filter((entry) => entry && entry.initials && Number.isFinite(entry.score)) : [];
    } catch (_) {
      return [];
    }
  }

  function saveLeaderboard(entries) {
    try {
      localStorage.setItem(leaderboardStorageKey, JSON.stringify(entries.slice(0, 10)));
    } catch (_) {}
  }

  function cleanInitials(value) {
    return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
  }

  function renderLeaderboard() {
    if (!hud.scoreList) return;
    const entries = readLeaderboard().sort((a, b) => b.score - a.score).slice(0, 10);
    hud.scoreList.innerHTML = entries.length
      ? entries.map((entry) => '<li><span>' + entry.initials + '</span><strong>' + entry.score + '</strong></li>').join('')
      : '<li class="is-empty"><span>-----</span><strong>0</strong></li>';
    const submitButton = hud.scoreForm?.querySelector('button');
    if (submitButton) submitButton.disabled = pendingScore <= 0;
  }

  function submitScore(event) {
    event.preventDefault();
    const initials = cleanInitials(hud.initials?.value);
    if (!initials || pendingScore <= 0) return;
    const entries = readLeaderboard();
    entries.push({ initials, score: pendingScore });
    entries.sort((a, b) => b.score - a.score);
    saveLeaderboard(entries);
    pendingScore = 0;
    if (hud.initials) hud.initials.value = '';
    renderLeaderboard();
  }

  function speedForLevel() {
    const config = currentConfig();
    const progress = Math.min(1, levelProgress() / config.duration);
    const baseSpeed = config.speed + progress * 1.15;
    return hardMode ? baseSpeed * 1.65 : baseSpeed;
  }

  function clearInputBuffers() {
    movementQueue = [];
    jumpQueued = false;
    laneInputCooldown = 0;
  }

  function controlsMarkup() {
    return '<p>Level 1 runs 30 seconds. Each unlocked level lasts longer and asks for quicker reads.</p><div class="octarun-controls-list"><span>Arrow Keys or A/D = Move</span><span>W or Spacebar = Jump</span><span>Enter = Restart / Continue</span><span>Esc = Pause</span><span>M = Toggle Music</span><span>F = Toggle FX</span></div>';
  }

  function startModeButtonsMarkup() {
    return '';
  }

  function readyOverlayCopy() {
    return controlsMarkup() + startModeButtonsMarkup();
  }

  function canReceivePlayInput() {
    return state === 'playing';
  }

  function queueRotate(dir) {
    if (!canReceivePlayInput()) return;
    if (movementQueue[movementQueue.length - 1] === dir && movementQueue.length >= 2) return;
    movementQueue.push(dir);
    if (movementQueue.length > 3) movementQueue.shift();
  }

  function queueJump() {
    if (!canReceivePlayInput()) return;
    jumpQueued = true;
  }

  function consumeInputBuffer(dt) {
    laneInputCooldown = Math.max(0, laneInputCooldown - dt);
    if (movementQueue.length && laneInputCooldown <= 0) {
      rotate(movementQueue.shift());
      laneInputCooldown = laneInputDelay;
    }
    if (jumpQueued) {
      jumpQueued = false;
      doJump();
    }
  }

  function restartCurrentLevel() {
    const targetLevel = levelIndex;
    score = 0;
    beginLevel(targetLevel);
  }

  function continueAfterLevel() {
    if (levelIndex >= levelConfigs.length - 1) {
      reset();
      return;
    }
    beginLevel(levelIndex + 1);
  }

  function handlePrimaryAction() {
    if (state === 'dead') {
      restartCurrentLevel();
      return;
    }
    if (state === 'level-complete') {
      continueAfterLevel();
      return;
    }
    if (state === 'ready' || state === 'paused') start();
  }

  function startWithMode(mode) {
    primeSpaceVideo();
    if (state === 'ready') {
      hardMode = mode === 'hard';
      enterMobileFullscreen();
      beginLevel(levelIndex);
      return;
    }
    if (state !== 'playing' && state !== 'paused') hardMode = mode === 'hard';
    start();
  }
  window.octaStartMode = startWithMode;

  function handleStartHash() {
    if (window.location.hash === '#octarun-start-easy') startWithMode('easy');
    if (window.location.hash === '#octarun-start-hard') startWithMode('hard');
    if (window.location.hash === '#octarun-start-easy' || window.location.hash === '#octarun-start-hard') {
      try {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      } catch (_) {}
    }
  }

  function isEditableTarget(target) {
    return Boolean(target && target.closest && target.closest('input, textarea, select, [contenteditable="true"]'));
  }

  function isSpaceKey(event) {
    const key = event.key || '';
    const code = event.code || '';
    const normalized = key.toLowerCase();
    return code === 'Space' || normalized === ' ' || normalized === 'spacebar';
  }

  function blurOctaRunButton(target) {
    if (!target || !target.closest) return;
    const button = target.closest('button');
    if (button && (hud.shell?.contains(button) || hud.stage?.contains(button))) button.blur();
  }

  function makeChunkStates(index) {
    const config = currentConfig();
    const states = Array(lanes).fill(0);
    if (index < config.safeStart) {
      previousGapLanes = [];
      return states;
    }
    const [minHazards, maxHazards] = config.hazards;
    const hazardCount = minHazards + Math.floor(Math.random() * (maxHazards - minHazards + 1));
    const blocked = new Set();
    const forcedGaps = new Set();
    const protectLane = laneIndex;
    const protectLeft = (laneIndex + lanes - 1) % lanes;
    const protectRight = (laneIndex + 1) % lanes;
    if (previousGapLanes.length && Math.random() < (config.gapRunChance || 0)) {
      previousGapLanes.forEach((lane) => {
        if (blocked.size < Math.max(1, hazardCount - 1)) {
          blocked.add(lane);
          forcedGaps.add(lane);
        }
      });
    }
    while (blocked.size < hazardCount && blocked.size < lanes - 2) {
      const lane = Math.floor(Math.random() * lanes);
      if (index < config.safeStart + 3 && (lane === protectLane || lane === protectLeft || lane === protectRight)) continue;
      blocked.add(lane);
    }
    const gapLanes = [];
    blocked.forEach((lane) => {
      const makeWall = !forcedGaps.has(lane) && Math.random() < config.wallChance;
      states[lane] = makeWall ? 2 : 1;
      if (!makeWall) gapLanes.push(lane);
    });
    previousGapLanes = gapLanes.slice(0, 2);
    if (states.filter((cell) => cell === 0).length < 2) {
      const candidates = Array.from({ length: lanes }, (_, lane) => lane).sort(() => Math.random() - 0.5);
      for (const lane of candidates) {
        if (states[lane] !== 0) states[lane] = 0;
        if (states.filter((cell) => cell === 0).length >= 2) break;
      }
    }
    return states;
  }

  function makeChunk(z, index) {
    const group = new THREE.Group();
    const states = makeChunkStates(index);
    states.forEach((cell, lane) => {
      if (cell !== 1) {
        const band = (lane + levelIndex) % materials.length;
        const panel = new THREE.Mesh(panelGeometries[lane], materials[band]);
        panel.position.z = z;
        group.add(panel);
      }
      if (cell === 2) {
        const band = (lane + levelIndex) % materials.length;
        const wall = new THREE.Mesh(wallGeometries[lane], wallMaterials[band]);
        wall.position.z = z;
        group.add(wall);
        wallStripeGeometries[lane].forEach((geom) => {
          const stripe = new THREE.Mesh(geom, wallStripeMaterials[band]);
          stripe.position.z = z;
          group.add(stripe);
        });
      }
    });
    world.add(group);
    return { group, states, z, passed: false };
  }

  function ensureAudio() {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;
    if (!audioContext) audioContext = new AudioCtor();
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    return audioContext;
  }

  function playTone(frequency, duration = 0.08, type = 'square', volume = 0.035) {
    if (!fxOn) return;
    const context = ensureAudio();
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }

  function stopMusic() {
    musicTracks.forEach((track) => {
      track.pause();
      track.currentTime = 0;
    });
    activeMusic = null;
  }

  function playNextMusicTrack() {
    if (!musicOn || state !== 'playing' || !musicTracks.length) return;
    const choices = musicTracks.map((_, index) => index).filter((index) => index !== activeMusicIndex);
    activeMusicIndex = choices[Math.floor(Math.random() * choices.length)] ?? 0;
    activeMusic = musicTracks[activeMusicIndex];
    activeMusic.currentTime = 0;
    activeMusic.play().catch(() => {});
  }

  function syncMusic() {
    if (!musicOn || state !== 'playing') {
      stopMusic();
      return;
    }
    if (!activeMusic || activeMusic.paused) playNextMusicTrack();
  }

  function playGameOverSound() {
    if (!fxOn) return;
    gameOverAudio.currentTime = 0;
    gameOverAudio.play().catch(() => {});
  }

  function playLevelCompleteSound() {
    if (!fxOn) return;
    levelCompleteAudio.currentTime = 0;
    levelCompleteAudio.play().catch(() => {});
  }

  function clearChunks() {
    chunks.forEach((chunk) => world.remove(chunk.group));
    chunks = [];
  }

  function seedChunks() {
    clearChunks();
    chunkSerial = 0;
    for (let i = 0; i < 34; i++) chunks.push(makeChunk(-i * chunkSpacing - 10, chunkSerial++));
  }

  function reset() {
    const selectedLevel = Math.min(levelIndex, unlockedLevel - 1);
    score = 0;
    levelIndex = selectedLevel;
    levelElapsed = 0;
    speed = currentConfig().speed;
    laneIndex = 0;
    laneStep = 0;
    targetAngle = 0;
    visualAngle = 0;
    jump = 0;
    jumpVel = 0;
    shake = 0;
    ballSpin = 0;
    ballSpinVel = 0;
    ballRollAngle = 0;
    player.rotation.set(0, 0, 0);
    playerRoll.rotation.set(0, 0, 0);
    applyBallColor();
    trailEnergy = 0;
    applyLevelPalette();
    seedChunks();
    state = 'ready';
    clearInputBuffers();
    updateHud();
    setOverlay('Ready', 'Find the safe lane.', readyOverlayCopy(), true, null);
    syncStartButton();
    syncMusic();
  }

  function setOverlay(kicker, title, copy, visible, buttonText) {
    if (!hud.overlay) return;
    hud.overlay.classList.toggle('is-visible', visible);
    const buttonMarkup = buttonText === null ? '' : '<button type="button" data-octa-overlay-start>' + (buttonText || (state === 'dead' ? 'Restart Run' : 'Start Run')) + '</button>';
    hud.overlay.innerHTML = '<p class="eyebrow">' + kicker + '</p><h2>' + title + '</h2><div class="octarun-overlay-copy">' + copy + '</div>' + buttonMarkup;
    const overlayButton = hud.overlay.querySelector('[data-octa-overlay-start]');
    if (overlayButton) overlayButton.addEventListener('click', handlePrimaryAction);
  }

  function syncStartButton() {
    if (hud.start) {
      const label = state === 'paused' ? 'Resume' : state === 'dead' ? 'Restart' : state === 'level-complete' ? 'Continue' : 'Start';
      hud.start.textContent = label;
      hud.start.disabled = state === 'playing';
      hud.start.setAttribute('aria-disabled', String(state === 'playing'));
    }
    if (hud.modeToggle) {
      hud.modeToggle.textContent = hardMode ? 'Hard' : 'Normal';
      hud.modeToggle.classList.toggle('is-hard', hardMode);
      hud.modeToggle.classList.toggle('is-normal', !hardMode);
      hud.modeToggle.setAttribute('aria-pressed', String(hardMode));
      const locked = state === 'playing' || state === 'paused';
      hud.modeToggle.disabled = locked;
      hud.modeToggle.setAttribute('aria-disabled', String(locked));
    }
  }

  function beginLevel(nextIndex) {
    clearInputBuffers();
    const maxUnlockedIndex = Math.max(0, unlockedLevel - 1);
    levelIndex = Math.min(levelConfigs.length - 1, Math.max(0, Math.min(nextIndex, maxUnlockedIndex)));
    levelElapsed = 0;
    laneIndex = 0;
    laneStep = 0;
    targetAngle = 0;
    visualAngle = 0;
    jump = 0;
    jumpVel = 0;
    ballSpin = 0;
    ballSpinVel = 0;
    ballRollAngle = 0;
    player.rotation.set(0, 0, 0);
    playerRoll.rotation.set(0, 0, 0);
    trailEnergy = 0;
    applyLevelPalette();
    seedChunks();
    state = 'playing';
    last = performance.now();
    hud.overlay?.classList.remove('is-visible');
    updateHud();
    syncStartButton();
    syncMusic();
  }

  function isMobileRunLayout() {
    return window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;
  }

  async function enterMobileFullscreen() {
    const target = hud.shell || hud.stage;
    if (!target || !isMobileRunLayout() || !document.fullscreenEnabled || document.fullscreenElement) return;
    try { await target.requestFullscreen(); } catch (_) {}
    window.setTimeout(resize, 80);
  }

  function start() {
    enterMobileFullscreen();
    if (state === 'dead') {
      restartCurrentLevel();
      return;
    }
    if (state === 'level-complete') {
      continueAfterLevel();
      return;
    }
    if (state === 'paused') {
      state = 'playing';
      hud.overlay?.classList.remove('is-visible');
      syncStartButton();
      syncMusic();
      return;
    }
    if (state === 'ready') beginLevel(levelIndex);
  }

  function pause() {
    if (state === 'playing') {
      state = 'paused';
      stopMusic();
      setOverlay('Paused', 'Run paused.', '<p>Press Escape, Enter, or Start to continue.</p>', true, 'Resume Run');
      syncStartButton();
    } else if (state === 'paused') {
      start();
    }
  }

  function completeLevel() {
    if (state !== 'playing') return;
    state = 'level-complete';
    stopMusic();
    unlockNextLevel();
    pendingScore = Math.max(pendingScore, Math.floor(score));
    playTone(740, 0.11, 'triangle', 0.03);
    playTone(980, 0.16, 'triangle', 0.025);
    playLevelCompleteSound();
    const config = currentConfig();
    const isFinal = levelIndex >= levelConfigs.length - 1;
    const title = isFinal ? 'All five levels cleared.' : 'Level ' + config.level + ' clear.';
    const copy = isFinal ? '<p>Final score: ' + Math.floor(score) + '. Press Enter to return to the menu.</p>' : '<p>' + config.copy + '</p><p>Press Enter to continue.</p>';
    const button = isFinal ? 'Back to Menu' : 'Start Level ' + (config.level + 1);
    setOverlay(isFinal ? 'Complete' : 'Level complete', title, copy, true, button);
    syncStartButton();
    updateHud();
    renderLeaderboard();
  }

  function die() {
    if (state !== 'playing') return;
    state = 'dead';
    clearInputBuffers();
    shake = 0.45;
    stopMusic();
    playTone(92, 0.32, 'sawtooth', 0.055);
    playGameOverSound();
    updateHud();
    setOverlay('Run ended', 'The tunnel caught you.', '<p>Press Enter or Spacebar to restart this level. Look one lane ahead; the safe path always exists.</p>', true, 'Restart Run');
    pendingScore = Math.max(pendingScore, Math.floor(score));
    renderLeaderboard();
    syncStartButton();
  }

  function updateHud() {
    if (hud.score) hud.score.textContent = String(Math.floor(score));
    if (hud.level) hud.level.textContent = String(currentConfig().level);
    if (hud.countdown) {
      const secondsLeft = levelSecondsLeft();
      hud.countdown.textContent = secondsLeft === null ? '∞' : String(secondsLeft);
      hud.countdown.classList.toggle('is-urgent', secondsLeft !== null && secondsLeft <= 10);
    }
    syncLevelSelect();
    syncStartButton();
    if (hud.pathPalette) {
      const activePalette = activePathPalette();
      hud.pathPalette.textContent = activePalette.name;
      hud.pathPalette.setAttribute('aria-pressed', pathPaletteMode !== 'neon' ? 'true' : 'false');
      hud.pathPalette.classList.toggle('is-active', pathPaletteMode !== 'neon');
    }
  }

  function syncLevelSelect() {
    if (!hud.levelPick) return;
    const locked = state === 'playing' || state === 'paused';
    hud.levelPick.textContent = 'Level ' + currentConfig().level;
    hud.levelPick.disabled = locked;
    hud.levelPick.setAttribute('aria-disabled', String(locked));
    hud.levelPick.title = unlockedLevel > 1 ? 'Click to choose unlocked levels' : 'Beat Level 1 to unlock Level 2';
  }

  function cycleSelectedLevel() {
    if (state === 'playing' || state === 'paused') return;
    levelIndex = (levelIndex + 1) % unlockedLevel;
    levelElapsed = 0;
    applyLevelPalette();
    seedChunks();
    updateHud();
    setOverlay('Ready', 'Find the safe lane.', readyOverlayCopy(), true, null);
    syncStartButton();
  }

  function rotate(dir) {
    if (state !== 'playing') return;
    laneIndex = (laneIndex + dir + lanes) % lanes;
    laneStep += dir;
    targetAngle = laneStep * laneArc;
    ballSpinVel += -dir * 5;
    trailEnergy = 1;
    playTone(420 + Math.abs(dir) * 90, 0.045, 'square', 0.024);
  }

  function doJump() {
    if (state !== 'playing' || jump > 0.03) return;
    jumpVel = 7.4;
    playTone(620, 0.075, 'triangle', 0.028);
  }

  function resize() {
    const parent = canvas.parentElement || hud.stage || canvas;
    const rect = parent.getBoundingClientRect();
    const width = Math.max(320, Math.floor(rect.width || window.innerWidth || 320));
    const height = Math.max(360, Math.floor(rect.height || 420));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobileRunLayout() ? 1.5 : 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  async function toggleFullscreen() {
    const target = hud.shell || hud.stage;
    if (!target) return;
    try {
      if (!document.fullscreenElement) await target.requestFullscreen();
      else await document.exitFullscreen();
    } catch (_) {}
    window.setTimeout(resize, 80);
  }

  function loop(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000 || 0));
    last = now;
    if (state === 'playing') {
      consumeInputBuffer(dt);
      speed = speedForLevel();
      score += dt * speed * 8;
      levelElapsed += dt;
      jumpVel -= 18 * dt;
      jump = Math.max(0, jump + jumpVel * dt);
      if (jump === 0 && jumpVel < 0) jumpVel = 0;
      chunks.forEach((chunk) => {
        chunk.z += speed * dt;
        chunk.group.children.forEach((mesh) => { mesh.position.z += speed * dt; });
        const cell = chunk.states[laneIndex];
        if (!chunk.passed && cell !== 0) {
          const offsetFromPlayer = chunk.z - playerZ;
          const collisionDepth = cell === 1
            ? (offsetFromPlayer < 0 ? gapFrontCollisionDepth : gapBackCollisionDepth)
            : wallCollisionDepth;
          const clearance = cell === 1 ? gapClearance : wallClearance;
          if (Math.abs(offsetFromPlayer) <= collisionDepth && jump < clearance) die();
        }
        const passDepth = cell === 1 ? gapBackCollisionDepth : wallCollisionDepth;
        if (!chunk.passed && chunk.z > playerZ + passDepth) {
          chunk.passed = true;
        }
      });
      const first = chunks[0];
      if (first && first.z > 8) {
        world.remove(first.group);
        chunks.shift();
        const lastChunk = chunks[chunks.length - 1];
        chunks.push(makeChunk(lastChunk.z - chunkSpacing, chunkSerial++));
      }
      if (state === 'playing' && !isEndlessLevel() && levelProgress() >= currentConfig().duration) completeLevel();
      updateHud();
    }
    visualAngle += (targetAngle - visualAngle) * Math.min(1, dt * 12);
    world.rotation.z = -visualAngle;
    player.position.set(0, -radius + 0.88 + jump, playerZ);
    player.rotation.set(0, 0, 0);
    playerRoll.position.set(0, 0, 0);
    playerGlow.position.copy(player.position);
    playerGlow.position.z = 0.09;
    trail.position.copy(player.position);
    trail.position.z = 0.11;
    trail.rotation.z += dt * (8 + trailEnergy * 20);
    playerGlow.visible = neonOn;
    trail.visible = neonOn;
    const glowPulse = Math.max(0, trailEnergy);
    playerGlow.scale.setScalar(1 + glowPulse * 0.09);
    playerGlow.material.opacity = neonOn ? 0.12 + glowPulse * 0.11 : 0;
    trail.material.opacity = neonOn ? Math.max(0, glowPulse * 0.5) : 0;
    trailEnergy = Math.max(0, trailEnergy - dt * 1.8);
    ballSpin += ballSpinVel * dt;
    ballSpinVel *= Math.pow(0.035, dt);
    if (state === 'playing') ballRollAngle += dt * Math.max(8, speed * 2.1);
    playerRoll.rotation.set(0, 0, ballRollAngle + ballSpin);
    if (shake > 0) shake = Math.max(0, shake - dt);
    camera.position.x = (Math.random() - 0.5) * shake;
    camera.position.y = (Math.random() - 0.5) * shake;
    stars.rotation.z += dt * 0.025;
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('fullscreenchange', () => {
    if (hud.fullscreen) {
      hud.fullscreen.classList.toggle('is-active', Boolean(document.fullscreenElement));
      hud.fullscreen.setAttribute('aria-label', document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen');
      hud.fullscreen.setAttribute('aria-pressed', String(Boolean(document.fullscreenElement)));
    }
    window.setTimeout(resize, 80);
  });
  if ('ResizeObserver' in window && hud.stage) {
    const resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(hud.stage);
  }
  window.addEventListener('orientationchange', () => window.setTimeout(resize, 160), { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state === 'playing') pause();
    last = performance.now();
  });
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    state = 'paused';
    clearInputBuffers();
    stopMusic();
    setOverlay('Graphics paused', 'WebGL context was interrupted.', '<p>Press Enter to continue after the browser restores graphics.</p>', true, 'Continue');
  }, false);
  canvas.addEventListener('webglcontextrestored', () => {
    resize();
    applyBallColor();
    applyLevelPalette();
    setOverlay('Ready', 'Graphics restored.', '<p>Press Enter to continue.</p>', true, 'Continue');
  }, false);
  function toggleMusic() {
    musicOn = !musicOn;
    hud.music?.classList.toggle('is-off', !musicOn);
    hud.music?.setAttribute('aria-pressed', String(musicOn));
    if (musicOn) syncMusic(); else stopMusic();
  }

  function toggleFX() {
    fxOn = !fxOn;
    hud.fx?.classList.toggle('is-off', !fxOn);
    hud.fx?.setAttribute('aria-pressed', String(fxOn));
  }

  window.addEventListener('keydown', (event) => {
    if (!isSpaceKey(event) || isEditableTarget(event.target)) return;
    event.preventDefault();
    blurOctaRunButton(document.activeElement);
  }, { capture: true, passive: false });

  window.addEventListener('keydown', (event) => {
    const key = event.key || '';
    const code = event.code || '';
    const normalized = key.toLowerCase();
    const gameKey = key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown' || key === 'Escape' || key === 'Enter' || code === 'Space' || normalized === ' ' || normalized === 'spacebar' || code === 'KeyA' || code === 'KeyD' || code === 'KeyW' || code === 'KeyM' || code === 'KeyF' || normalized === 'a' || normalized === 'd' || normalized === 'w' || normalized === 'm' || normalized === 'f';
    if (gameKey && !isEditableTarget(event.target)) event.preventDefault();
    if (event.repeat && gameKey) return;
    if (key === 'ArrowLeft' || normalized === 'a' || code === 'KeyA') {
      queueRotate(-1);
      return;
    }
    if (key === 'ArrowRight' || normalized === 'd' || code === 'KeyD') {
      queueRotate(1);
      return;
    }
    if (isSpaceKey(event) || normalized === 'w' || code === 'KeyW') {
      if (state === 'dead') restartCurrentLevel();
      else if (state === 'playing') queueJump();
      return;
    }
    if (key === 'Enter') {
      handlePrimaryAction();
      return;
    }
    if (key === 'Escape') {
      pause();
      return;
    }
    if (normalized === 'm' || code === 'KeyM') {
      toggleMusic();
      return;
    }
    if (normalized === 'f' || code === 'KeyF') toggleFX();
  }, { passive: false });
  window.addEventListener('keyup', (event) => {
    if (!isSpaceKey(event) || isEditableTarget(event.target)) return;
    event.preventDefault();
    blurOctaRunButton(document.activeElement);
  }, { capture: true, passive: false });
  hud.shell?.addEventListener('click', (event) => blurOctaRunButton(event.target));
  let touchStart = null;
  canvas.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    touchStart = { x: event.clientX, y: event.clientY, time: performance.now() };
  }, { passive: false });
  canvas.addEventListener('pointerup', (event) => {
    event.preventDefault();
    if (!touchStart) return;
    const dy = event.clientY - touchStart.y;
    if (dy < -34) queueJump();
    else queueRotate(event.clientX < window.innerWidth / 2 ? -1 : 1);
    touchStart = null;
  }, { passive: false });
  mobileJumpButton.addEventListener('pointerdown', (event) => event.preventDefault());
  mobileJumpButton.addEventListener('click', (event) => {
    event.preventDefault();
    queueJump();
  });
  hud.start?.addEventListener('click', handlePrimaryAction);
  hud.modeToggle?.addEventListener('click', () => {
    if (state === 'playing' || state === 'paused') return;
    hardMode = !hardMode;
    updateHud();
    playTone(hardMode ? 220 : 520, 0.06, 'square', 0.018);
  });
  hud.restart?.addEventListener('click', () => {
    reset();
  });
  hud.levelPick?.addEventListener('click', cycleSelectedLevel);
  hud.fullscreen?.addEventListener('click', toggleFullscreen);
  hud.ballColor?.addEventListener('click', () => {
    hud.ballColorInput?.click();
  });
  hud.ballColorInput?.addEventListener('input', (event) => {
    setBallColor(event.target.value);
  });
  hud.initials?.addEventListener('input', (event) => {
    event.target.value = cleanInitials(event.target.value);
  });
  hud.scoreForm?.addEventListener('submit', submitScore);
  hud.overlayStart?.addEventListener('click', () => { primeSpaceVideo(); start(); });
  window.addEventListener('hashchange', handleStartHash);
  hud.music?.addEventListener('click', toggleMusic);
  hud.fx?.addEventListener('click', toggleFX);

  function normalizeHexColor(value) {
    const hex = String(value || '').trim();
    return /^#[0-9a-f]{6}$/i.test(hex) ? hex.toLowerCase() : null;
  }

  function setBallColor(value) {
    const hex = normalizeHexColor(value);
    if (!hex) return;
    ballGlowColor = Number.parseInt(hex.slice(1), 16);
    applyBallColor();
  }

  function applyBallColor() {
    playerGlow.material.color.setHex(ballGlowColor);
    trail.material.color.setHex(ballGlowColor);
    if (playerFallback.material) {
      playerFallback.material.color.setHex(ballGlowColor);
      playerFallback.material.emissive.setHex(ballGlowColor);
      playerFallback.material.needsUpdate = true;
    }
    const hex = '#' + ballGlowColor.toString(16).padStart(6, '0');
    if (hud.ballColorInput && hud.ballColorInput.value.toLowerCase() !== hex) hud.ballColorInput.value = hex;
  }

  function stepBallColor(direction = 1) {
    ballSpinVel += direction * 3;
    playTone(560, 0.055, 'triangle', 0.022);
  }

  hud.pathPalette?.addEventListener('click', () => {
    const currentIndex = Math.max(0, pathPalettes.findIndex((palette) => palette.id === pathPaletteMode));
    pathPaletteMode = pathPalettes[(currentIndex + 1) % pathPalettes.length].id;
    applyLevelPalette();
    updateHud();
    playTone(pathPaletteMode === 'neon' ? 620 : 420, 0.065, 'square', 0.018);
  });
  applyBallColor();
  applyLevelPalette();
  renderLeaderboard();
  resize();
  reset();
  requestAnimationFrame(loop);
})();
