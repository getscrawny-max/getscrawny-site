(() => {
  const canvas = document.querySelector('[data-octa-canvas]');
  if (!canvas || !window.THREE) return;

  const hud = {
    score: document.querySelector('[data-octa-score]'),
    level: document.querySelector('[data-octa-level]'),
    countdown: document.querySelector('[data-octa-countdown]'),
    start: document.querySelector('[data-octa-start]'),
    restart: document.querySelector('[data-octa-restart]'),
    fullscreen: document.querySelector('[data-octa-fullscreen]'),
    levelPick: document.querySelector('[data-octa-level-pick]'),
    hardMode: document.querySelector('[data-octa-hard]'),
    shell: document.querySelector('.octarun-shell'),
    stage: document.querySelector('[data-octa-stage]'),
    spaceVideo: document.querySelector('.octarun-space-video'),
    pathPalette: document.querySelector('[data-octa-path-palette]'),
    music: document.querySelector('[data-octa-music]'),
    fx: document.querySelector('[data-octa-fx]'),
    overlay: document.querySelector('[data-octa-overlay]'),
    overlayStart: document.querySelector('[data-octa-overlay-start]')
  };

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
  scene.fog = new THREE.FogExp2(0x030615, 0.026);
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
  const levelConfigs = [
    { level: 1, duration: 30, speed: 5.15, hazards: [2, 2], wallChance: 0.14, gapRunChance: 0.08, safeStart: 7, copy: 'Level 2 opens up after 30 seconds with more lane reads.' },
    { level: 2, duration: 60, speed: 5.95, hazards: [2, 3], wallChance: 0.22, gapRunChance: 0.16, safeStart: 7, copy: 'Level 3 runs 90 seconds and asks for cleaner jumps.' },
    { level: 3, duration: 90, speed: 6.75, hazards: [3, 4], wallChance: 0.23, gapRunChance: 0.48, safeStart: 6, copy: 'Level 4 stretches to two minutes with tighter timing.' },
    { level: 4, duration: 120, speed: 7.55, hazards: [4, 5], wallChance: 0.40, gapRunChance: 0.22, safeStart: 5, copy: 'Level 5 is the two-and-a-half-minute final run.' },
    { level: 5, duration: 150, speed: 8.35, hazards: [5, 6], wallChance: 0.48, gapRunChance: 0.18, safeStart: 5, copy: 'You cleared the full OctaRun set.' }
  ];

  const levelPalettes = [
    [0x2d6cdf, 0x4fb5df, 0x7c4fd9, 0xb83fd8, 0x22306d],
    [0x18b7ff, 0x763cff, 0xf24cff, 0x2f6dff, 0x102a7a],
    [0x20d6ff, 0x3f7bff, 0xff3dd2, 0x8a5cff, 0x151d62],
    [0xff4fd8, 0x6c4cff, 0x27d9ff, 0x3759ff, 0x24105f],
    [0xffffff, 0x48d7ff, 0xff47f0, 0x714cff, 0x10112f]
  ];

  const cautionLevelPalettes = [
    [0xff5c5c, 0xf8ff61, 0xffb861, 0xa8ff61, 0xff5c5c, 0xf8ff61, 0xffb861, 0xa8ff61],
    [0xf8ff61, 0xffb861, 0xa8ff61, 0xff5c5c, 0xf8ff61, 0xffb861, 0xa8ff61, 0xff5c5c],
    [0xffb861, 0xa8ff61, 0xff5c5c, 0xf8ff61, 0xffb861, 0xa8ff61, 0xff5c5c, 0xf8ff61],
    [0xa8ff61, 0xff5c5c, 0xf8ff61, 0xffb861, 0xa8ff61, 0xff5c5c, 0xf8ff61, 0xffb861],
    [0xff5c5c, 0xffb861, 0xf8ff61, 0xa8ff61, 0xff5c5c, 0xffb861, 0xf8ff61, 0xa8ff61]
  ];
  let pathPaletteMode = 'neon';

  function activeLevelPalettes() {
    return pathPaletteMode === 'caution' ? cautionLevelPalettes : levelPalettes;
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
    const z0 = -0.82;
    const z1 = 0.82;
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

  function makeWallXGeometry(lane, flip) {
    const edgeInset = 0.082;
    const a0 = -laneArc / 2 + edgeInset;
    const a1 = laneArc / 2 - edgeInset;
    const outer = radius + 0.11;
    const inner = radius - 1.16;
    const z = 0.84;
    const da = 0.04;
    const dr = 0.12;
    const pA = flip ? { a: a1, r: outer } : { a: a0, r: outer };
    const pB = flip ? { a: a0, r: inner } : { a: a1, r: inner };
    const verts = [
      ...lanePoint(lane, pA.a - da, pA.r - dr, z),
      ...lanePoint(lane, pA.a + da, pA.r + dr, z),
      ...lanePoint(lane, pB.a + da, pB.r + dr, z),
      ...lanePoint(lane, pB.a - da, pB.r - dr, z)
    ];
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geom.setIndex([0, 1, 2, 0, 2, 3]);
    geom.computeVertexNormals();
    return geom;
  }

  const panelGeometries = Array.from({ length: lanes }, (_, lane) => makeLaneSurfaceGeometry(lane));
  const wallGeometries = Array.from({ length: lanes }, (_, lane) => makeLaneWallGeometry(lane));
  const wallXGeometries = Array.from({ length: lanes }, (_, lane) => [makeWallXGeometry(lane, false), makeWallXGeometry(lane, true)]);
  const colors = [0x31a6ff, 0xa838ff, 0x4db8ff, 0xd23dff, 0x385dcb];
  const materials = colors.map((color) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.33, roughness: 0.38, metalness: 0.18, side: THREE.DoubleSide, flatShading: true }));
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xffd23c, emissive: 0xff8a00, emissiveIntensity: 0.58, roughness: 0.34, metalness: 0.08, side: THREE.DoubleSide, flatShading: true });
  const wallXMaterial = new THREE.MeshBasicMaterial({ color: 0x050505, transparent: false, opacity: 1, side: THREE.DoubleSide, depthWrite: false });

  function applyLevelPalette() {
    const caution = pathPaletteMode === 'caution';
    const palettes = activeLevelPalettes();
    const palette = palettes[levelIndex] || palettes[0];
    materials.forEach((material, index) => {
      const color = palette[index % palette.length];
      material.color.setHex(color);
      material.emissive.setHex(color);
      material.needsUpdate = true;
    });
    const fogColor = palette[4] || palette[0];
    scene.fog.color.setHex(fogColor);

    if (caution) {
      wallMaterial.color.setHex(0x176dff);
      wallMaterial.emissive.setHex(0x1a7dff);
      wallMaterial.emissiveIntensity = 0.5;
      wallXMaterial.color.setHex(0xff4fd8);
    } else {
      wallMaterial.color.setHex(0xffd23c);
      wallMaterial.emissive.setHex(0xff8a00);
      wallMaterial.emissiveIntensity = 0.58;
      wallXMaterial.color.setHex(0x050505);
    }
    wallMaterial.needsUpdate = true;
    wallXMaterial.needsUpdate = true;
  }
  const textureLoader = new THREE.TextureLoader();
  const playerMaterial = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.05, depthTest: true, depthWrite: false, toneMapped: false });
  const player = new THREE.Mesh(new THREE.PlaneGeometry(2.02, 2.02), playerMaterial);
  const playerGlow = new THREE.Mesh(new THREE.SphereGeometry(0.71, 40, 20), new THREE.MeshBasicMaterial({ color: 0x67e8ff, transparent: true, opacity: 0.34, blending: THREE.AdditiveBlending, depthWrite: false }));
  const trail = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.04, 8, 72), new THREE.MeshBasicMaterial({ color: 0x35d7ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending }));
  player.renderOrder = 4;
  playerGlow.renderOrder = 2;
  trail.renderOrder = 1;
  const world = new THREE.Group();
  scene.add(world);
  scene.add(player);
  scene.add(playerGlow);
  scene.add(trail);
  scene.add(new THREE.AmbientLight(0x6b86ff, 0.52));
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
  let ballColorIndex = 0;
  let ballFrameIndex = 0;
  let ballFrameTimer = 0;
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
  const ballFrameRate = 18;
  const ballFrameDuration = 1 / ballFrameRate;
  let musicOn = true;
  let fxOn = true;
  let audioContext = null;
  let activeMusic = null;
  let activeMusicIndex = -1;
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

  const currentConfig = () => levelConfigs[levelIndex];
  const levelProgress = () => levelElapsed;
  const levelSecondsLeft = () => Math.max(0, Math.ceil(currentConfig().duration - levelProgress()));
  const unlockStorageKey = 'octarunUnlockedLevel';

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

  function speedForLevel() {
    const config = currentConfig();
    const progress = Math.min(1, levelProgress() / config.duration);
    const baseSpeed = config.speed + progress * 1.15;
    return hardMode ? baseSpeed * 1.5 : baseSpeed;
  }

  function clearInputBuffers() {
    movementQueue = [];
    jumpQueued = false;
    laneInputCooldown = 0;
  }

  function controlsMarkup() {
    return '<p>Level 1 runs 30 seconds. Each unlocked level lasts longer and asks for quicker reads.</p><div class="octarun-controls-list"><span>Arrow Keys or A/D = Move</span><span>W or Spacebar = Jump</span><span>Enter = Restart / Continue</span><span>Esc = Pause</span><span>M = Toggle Music</span><span>F = Toggle FX</span></div>';
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
        const wall = new THREE.Mesh(wallGeometries[lane], wallMaterial);
        wall.position.z = z;
        group.add(wall);
        wallXGeometries[lane].forEach((geom) => {
          const mark = new THREE.Mesh(geom, wallXMaterial);
          mark.position.z = z;
          group.add(mark);
        });
      }
    });
    world.add(group);
    return { group, states, z, checked: false };
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
    ballFrameIndex = 0;
    ballFrameTimer = 0;
    applyBallColor();
    trailEnergy = 0;
    applyLevelPalette();
    seedChunks();
    state = 'ready';
    clearInputBuffers();
    updateHud();
    setOverlay('Ready', 'Find the safe lane.', controlsMarkup(), true, 'Start Level ' + currentConfig().level);
    syncStartButton();
    syncMusic();
  }

  function setOverlay(kicker, title, copy, visible, buttonText) {
    if (!hud.overlay) return;
    hud.overlay.classList.toggle('is-visible', visible);
    hud.overlay.innerHTML = '<p class="eyebrow">' + kicker + '</p><h2>' + title + '</h2><div class="octarun-overlay-copy">' + copy + '</div><button type="button" data-octa-overlay-start>' + (buttonText || (state === 'dead' ? 'Restart Run' : 'Start Run')) + '</button>';
    const overlayButton = hud.overlay.querySelector('[data-octa-overlay-start]');
    if (overlayButton) overlayButton.addEventListener('click', handlePrimaryAction);
  }

  function syncStartButton() {
    if (!hud.start) return;
    hud.start.textContent = state === 'playing' ? 'Pause' : 'Start';
    hud.start.setAttribute('aria-pressed', String(state === 'playing'));
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
    syncStartButton();
  }

  function updateHud() {
    if (hud.score) hud.score.textContent = String(Math.floor(score));
    if (hud.level) hud.level.textContent = String(currentConfig().level);
    if (hud.countdown) {
      const secondsLeft = levelSecondsLeft();
      hud.countdown.textContent = String(secondsLeft);
      hud.countdown.classList.toggle('is-urgent', secondsLeft <= 10);
    }
    syncLevelSelect();
    if (hud.hardMode) {
      hud.hardMode.textContent = hardMode ? 'Hard' : 'Normal';
      hud.hardMode.setAttribute('aria-pressed', String(hardMode));
      hud.hardMode.classList.toggle('is-active', hardMode);
    }
    if (hud.pathPalette) {
      const caution = pathPaletteMode === 'caution';
      hud.pathPalette.textContent = caution ? 'Star Burst' : 'Neon Path';
      hud.pathPalette.setAttribute('aria-pressed', String(caution));
      hud.pathPalette.classList.toggle('is-active', caution);
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
    setOverlay('Ready', 'Find the safe lane.', controlsMarkup(), true, 'Start Level ' + currentConfig().level);
    syncStartButton();
  }

  function rotate(dir) {
    if (state !== 'playing') return;
    laneIndex = (laneIndex + dir + lanes) % lanes;
    laneStep += dir;
    targetAngle = laneStep * laneArc;
    ballSpinVel += -dir * 13;
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
        if (!chunk.checked && Math.abs(chunk.z) < 0.62) {
          chunk.checked = true;
          const cell = chunk.states[laneIndex];
          if ((cell === 1 && jump < 0.18) || (cell === 2 && jump < 0.48)) die();
        }
      });
      const first = chunks[0];
      if (first && first.z > 8) {
        world.remove(first.group);
        chunks.shift();
        const lastChunk = chunks[chunks.length - 1];
        chunks.push(makeChunk(lastChunk.z - chunkSpacing, chunkSerial++));
      }
      if (state === 'playing' && levelProgress() >= currentConfig().duration) completeLevel();
      updateHud();
    }
    visualAngle += (targetAngle - visualAngle) * Math.min(1, dt * 12);
    const r = radius - 0.88 - jump;
    world.rotation.z = -visualAngle;
    player.position.set(0, -r, 0.18);
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
    if (state === 'running') ballRollAngle += dt * Math.max(8, speed * 2.1);
    ballFrameTimer += dt;
    while (ballTextures.length && ballFrameTimer >= ballFrameDuration) {
      ballFrameTimer -= ballFrameDuration;
      ballFrameIndex = (ballFrameIndex + 1) % ballTextures.length;
      playerMaterial.map = ballTextures[ballFrameIndex];
      playerMaterial.needsUpdate = true;
    }
    player.rotation.set(0, 0, ballRollAngle + ballSpin - Math.PI / 2);
    if (shake > 0) shake = Math.max(0, shake - dt);
    camera.position.x = (Math.random() - 0.5) * shake;
    camera.position.y = (Math.random() - 0.5) * shake;
    stars.rotation.z += dt * 0.025;
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('fullscreenchange', () => {
    if (hud.fullscreen) hud.fullscreen.textContent = document.fullscreenElement ? 'Exit Fullscreen' : 'Fullscreen';
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
  hud.start?.addEventListener('click', () => {
    primeSpaceVideo();
    if (state === 'playing') pause();
    else start();
  });
  hud.restart?.addEventListener('click', () => { reset(); beginLevel(levelIndex); });
  hud.levelPick?.addEventListener('click', cycleSelectedLevel);
  hud.hardMode?.addEventListener('click', () => {
    hardMode = !hardMode;
    updateHud();
    playTone(hardMode ? 720 : 430, 0.065, 'square', 0.018);
  });
  hud.fullscreen?.addEventListener('click', toggleFullscreen);
  hud.overlayStart?.addEventListener('click', () => { primeSpaceVideo(); start(); });
  hud.music?.addEventListener('click', toggleMusic);
  hud.fx?.addEventListener('click', toggleFX);

  const ballGlowColor = 0x8eeaff;
  const ballFrameFiles = 'ABCDEFGHIJKLMNOPQR'.split('').map((letter) => 'assets/dball/' + letter + '.png');

  function prepareBallTexture(texture) {
    if ('colorSpace' in texture && THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
    else if ('encoding' in texture && THREE.sRGBEncoding) texture.encoding = THREE.sRGBEncoding;
    if (renderer.capabilities && typeof renderer.capabilities.getMaxAnisotropy === 'function') {
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    }
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }

  const ballTextures = ballFrameFiles.map((path) => prepareBallTexture(textureLoader.load(encodeURI(path))));

  function applyBallColor() {
    playerMaterial.map = ballTextures[ballFrameIndex] || null;
    playerMaterial.color.setHex(0xffffff);
    playerMaterial.opacity = 1;
    playerMaterial.needsUpdate = true;
    playerGlow.material.color.setHex(ballGlowColor);
    trail.material.color.setHex(ballGlowColor);
  }

  function stepBallColor(direction = 1) {
    ballColorIndex = (ballColorIndex + direction + ballTextures.length) % Math.max(1, ballTextures.length);
    ballFrameIndex = ballColorIndex % Math.max(1, ballTextures.length);
    ballFrameTimer = 0;
    applyBallColor();
    ballSpinVel += direction * 8;
    playTone(560, 0.055, 'triangle', 0.022);
  }

  hud.pathPalette?.addEventListener('click', () => {
    pathPaletteMode = pathPaletteMode === 'caution' ? 'neon' : 'caution';
    applyLevelPalette();
    updateHud();
    playTone(pathPaletteMode === 'caution' ? 360 : 620, 0.065, 'square', 0.018);
  });
  applyBallColor();
  applyLevelPalette();
  resize();
  reset();
  requestAnimationFrame(loop);
})();
