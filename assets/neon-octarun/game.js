(() => {
  const canvas = document.querySelector('[data-octa-canvas]');
  if (!canvas || !window.THREE) return;

  const hud = {
    score: document.querySelector('[data-octa-score]'),
    level: document.querySelector('[data-octa-level]'),
    start: document.querySelector('[data-octa-start]'),
    restart: document.querySelector('[data-octa-restart]'),
    fullscreen: document.querySelector('[data-octa-fullscreen]'),
    hardMode: document.querySelector('[data-octa-hard]'),
    shell: document.querySelector('.octarun-shell'),
    stage: document.querySelector('[data-octa-stage]'),
    ballNext: document.querySelector('[data-octa-ball-next]'),
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
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x030615, 0.026);
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 260);
  camera.position.set(0, 0, 9.5);
  camera.lookAt(0, 0, -16);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const lanes = 8;
  const radius = 4.15;
  const chunkSpacing = 3.34;
  const chunkDepth = 3.34;
  const laneArc = (Math.PI * 2) / lanes;
  const levelConfigs = [
    { level: 1, duration: 45, speed: 5.15, hazards: [2, 2], wallChance: 0.14, safeStart: 7, copy: 'Level 2 opens up after 90 seconds with more lane reads.' },
    { level: 2, duration: 90, speed: 5.95, hazards: [2, 3], wallChance: 0.22, safeStart: 7, copy: 'Level 3 runs two full minutes and asks for cleaner jumps.' },
    { level: 3, duration: 120, speed: 6.75, hazards: [3, 4], wallChance: 0.31, safeStart: 6, copy: 'Level 4 stretches to two and a half minutes with tighter timing.' },
    { level: 4, duration: 150, speed: 7.55, hazards: [4, 5], wallChance: 0.40, safeStart: 5, copy: 'Level 5 is the three-minute final run.' },
    { level: 5, duration: 180, speed: 8.35, hazards: [5, 6], wallChance: 0.48, safeStart: 5, copy: 'You cleared the full OctaRun set.' }
  ];

  const levelPalettes = [
    [0x2d6cdf, 0x4fb5df, 0x7c4fd9, 0xb83fd8, 0x22306d],
    [0x18b7ff, 0x763cff, 0xf24cff, 0x2f6dff, 0x102a7a],
    [0x20d6ff, 0x3f7bff, 0xff3dd2, 0x8a5cff, 0x151d62],
    [0xff4fd8, 0x6c4cff, 0x27d9ff, 0x3759ff, 0x24105f],
    [0xffffff, 0x48d7ff, 0xff47f0, 0x714cff, 0x10112f]
  ];

  function lanePoint(lane, edgeOffset, radial, z) {
    const angle = lane * laneArc + edgeOffset;
    return [Math.sin(angle) * radial, -Math.cos(angle) * radial, z];
  }

  function makeLaneSurfaceGeometry(lane, depth = chunkDepth) {
    const overlap = 0.045;
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
    const edgeInset = 0.024;
    const a0 = -laneArc / 2 + edgeInset;
    const a1 = laneArc / 2 - edgeInset;
    const z0 = -0.82;
    const z1 = 0.82;
    const outer = radius + 0.06;
    const inner = radius - 2.72;
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
    const edgeInset = 0.065;
    const a0 = -laneArc / 2 + edgeInset;
    const a1 = laneArc / 2 - edgeInset;
    const outer = radius + 0.11;
    const inner = radius - 2.48;
    const z = 0.9;
    const da = 0.04;
    const dr = 0.18;
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
    const palette = levelPalettes[levelIndex] || levelPalettes[0];
    materials.forEach((material, index) => {
      const color = palette[index % palette.length];
      material.color.setHex(color);
      material.emissive.setHex(color);
    });
    const fogColor = palette[4] || palette[0];
    scene.fog.color.setHex(fogColor);
  }
  const textureLoader = new THREE.TextureLoader();
  const playerMaterial = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.05, depthTest: true, depthWrite: false, toneMapped: false });
  const player = new THREE.Mesh(new THREE.PlaneGeometry(1.22, 1.22), playerMaterial);
  const playerGlow = new THREE.Mesh(new THREE.SphereGeometry(1.05, 40, 20), new THREE.MeshBasicMaterial({ color: 0x67e8ff, transparent: true, opacity: 0.34, blending: THREE.AdditiveBlending, depthWrite: false }));
  const trail = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.034, 8, 72), new THREE.MeshBasicMaterial({ color: 0x35d7ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending }));
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
  let ballColorIndex = 0;
  let laneIndex = 0;
  let targetAngle = 0;
  let visualAngle = 0;
  let jump = 0;
  let jumpVel = 0;
  let shake = 0;
  let trailEnergy = 0;
  let ballSpin = 0;
  let ballSpinVel = 0;
  let musicOn = true;
  let fxOn = true;
  let audioContext = null;
  let activeMusic = null;
  let activeMusicIndex = -1;
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

  const currentConfig = () => levelConfigs[levelIndex];
  const levelProgress = () => levelElapsed;

  function speedForLevel() {
    const config = currentConfig();
    const progress = Math.min(1, levelProgress() / config.duration);
    const baseSpeed = config.speed + progress * 1.15;
    return hardMode ? baseSpeed * 1.3 : baseSpeed;
  }

  function makeChunkStates(index) {
    const config = currentConfig();
    const states = Array(lanes).fill(0);
    if (index < config.safeStart) return states;
    const [minHazards, maxHazards] = config.hazards;
    const hazardCount = minHazards + Math.floor(Math.random() * (maxHazards - minHazards + 1));
    const blocked = new Set();
    const protectLane = laneIndex;
    const protectLeft = (laneIndex + lanes - 1) % lanes;
    const protectRight = (laneIndex + 1) % lanes;
    while (blocked.size < hazardCount && blocked.size < lanes - 2) {
      const lane = Math.floor(Math.random() * lanes);
      if (index < config.safeStart + 3 && (lane === protectLane || lane === protectLeft || lane === protectRight)) continue;
      blocked.add(lane);
    }
    blocked.forEach((lane) => { states[lane] = Math.random() < config.wallChance ? 2 : 1; });
    if (!states.some((cell) => cell === 0)) states[Math.floor(Math.random() * lanes)] = 0;
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
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
  }

  function playTone(frequency, duration = 0.08, type = 'square', volume = 0.035) {
    if (!fxOn) return;
    ensureAudio();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    gain.gain.setValueAtTime(volume, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
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
    score = 0;
    levelIndex = 0;
    levelElapsed = 0;
    speed = currentConfig().speed;
    laneIndex = 0;
    targetAngle = 0;
    visualAngle = 0;
    jump = 0;
    jumpVel = 0;
    shake = 0;
    ballSpin = 0;
    ballSpinVel = 0;
    trailEnergy = 0;
    applyLevelPalette();
    seedChunks();
    state = 'ready';
    updateHud();
    setOverlay('Ready', 'Find the safe lane.', 'Level 1 runs 45 seconds. Arrow keys rotate. Space jumps. On mobile, tap left or right and use the Jump button.', true, 'Start Level 1');
    syncStartButton();
    syncMusic();
  }

  function setOverlay(kicker, title, copy, visible, buttonText) {
    if (!hud.overlay) return;
    hud.overlay.classList.toggle('is-visible', visible);
    hud.overlay.innerHTML = '<p class="eyebrow">' + kicker + '</p><h2>' + title + '</h2><p>' + copy + '</p><button type="button" data-octa-overlay-start>' + (buttonText || (state === 'dead' ? 'Restart Run' : 'Start Run')) + '</button>';
    hud.overlay.querySelector('[data-octa-overlay-start]').addEventListener('click', start);
  }

  function syncStartButton() {
    if (!hud.start) return;
    hud.start.textContent = state === 'playing' ? 'Pause' : 'Start';
    hud.start.setAttribute('aria-pressed', String(state === 'playing'));
  }

  function beginLevel(nextIndex) {
    levelIndex = Math.min(levelConfigs.length - 1, nextIndex);
    levelElapsed = 0;
    laneIndex = 0;
    targetAngle = 0;
    visualAngle = 0;
    jump = 0;
    jumpVel = 0;
    trailEnergy = 0;
    applyLevelPalette();
    seedChunks();
    state = 'playing';
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
      reset();
      beginLevel(0);
      return;
    }
    if (state === 'level-complete') {
      if (levelIndex >= levelConfigs.length - 1) {
        reset();
        beginLevel(0);
      } else {
        beginLevel(levelIndex + 1);
      }
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
      setOverlay('Paused', 'Run paused.', 'Press Escape or Start to continue.', true, 'Resume Run');
      syncStartButton();
    } else if (state === 'paused') {
      start();
    }
  }

  function completeLevel() {
    if (state !== 'playing') return;
    state = 'level-complete';
    stopMusic();
    playTone(740, 0.11, 'triangle', 0.03);
    playTone(980, 0.16, 'triangle', 0.025);
    const config = currentConfig();
    const isFinal = levelIndex >= levelConfigs.length - 1;
    const title = isFinal ? 'All five levels cleared.' : 'Level ' + config.level + ' clear.';
    const copy = isFinal ? 'Final score: ' + Math.floor(score) + '. Restart when you want another run.' : config.copy;
    const button = isFinal ? 'Run Again' : 'Start Level ' + (config.level + 1);
    setOverlay(isFinal ? 'Complete' : 'Level complete', title, copy, true, button);
    syncStartButton();
    updateHud();
  }

  function die() {
    if (state !== 'playing') return;
    state = 'dead';
    shake = 0.45;
    stopMusic();
    playTone(92, 0.32, 'sawtooth', 0.055);
    playGameOverSound();
    updateHud();
    setOverlay('Run ended', 'The tunnel caught you.', 'Press Spacebar to reset, then look one lane ahead. The safe path always exists.', true, 'Restart Run');
    syncStartButton();
  }

  function updateHud() {
    if (hud.score) hud.score.textContent = String(Math.floor(score));
    if (hud.level) hud.level.textContent = String(currentConfig().level);
    if (hud.hardMode) {
      hud.hardMode.textContent = hardMode ? 'Hard' : 'Normal';
      hud.hardMode.setAttribute('aria-pressed', String(hardMode));
      hud.hardMode.classList.toggle('is-active', hardMode);
    }
  }

  function rotate(dir) {
    if (state !== 'playing') return;
    laneIndex = (laneIndex + dir + lanes) % lanes;
    targetAngle = laneIndex * laneArc;
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
    const rect = canvas.parentElement.getBoundingClientRect();
    renderer.setSize(Math.max(320, rect.width), Math.max(360, rect.height), false);
    camera.aspect = rect.width / rect.height;
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
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    if (state === 'playing') {
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
          if ((cell === 1 && jump < 0.18) || (cell === 2 && jump < 0.82)) die();
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
    visualAngle += ((((targetAngle - visualAngle + Math.PI) % (Math.PI * 2)) - Math.PI) * Math.min(1, dt * 12));
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
    playerGlow.scale.setScalar(1 + glowPulse * 0.18);
    playerGlow.material.opacity = neonOn ? 0.24 + glowPulse * 0.22 : 0;
    trail.material.opacity = neonOn ? Math.max(0, glowPulse * 0.5) : 0;
    trailEnergy = Math.max(0, trailEnergy - dt * 1.8);
    ballSpin += ballSpinVel * dt;
    ballSpinVel *= Math.pow(0.035, dt);
    player.rotation.set(0, 0, ballSpin);
    if (shake > 0) shake = Math.max(0, shake - dt);
    camera.position.x = (Math.random() - 0.5) * shake;
    camera.position.y = (Math.random() - 0.5) * shake;
    stars.rotation.z += dt * 0.025;
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', resize);
  document.addEventListener('fullscreenchange', () => {
    if (hud.fullscreen) hud.fullscreen.textContent = document.fullscreenElement ? 'Exit Fullscreen' : 'Fullscreen';
    window.setTimeout(resize, 80);
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') rotate(-1);
    if (event.key === 'ArrowRight') rotate(1);
    if (event.code === 'Space') {
      event.preventDefault();
      if (state === 'dead') { reset(); beginLevel(0); return; }
      if (state === 'ready' || state === 'level-complete' || state === 'paused') { start(); return; }
      doJump();
    }
    if (event.key === 'Escape') pause();
  });
  let touchStart = null;
  canvas.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    touchStart = { x: event.clientX, y: event.clientY, time: performance.now() };
  });
  canvas.addEventListener('pointerup', (event) => {
    event.preventDefault();
    if (!touchStart) return;
    const dy = event.clientY - touchStart.y;
    if (dy < -34) doJump();
    else rotate(event.clientX < window.innerWidth / 2 ? -1 : 1);
    touchStart = null;
  });
  mobileJumpButton.addEventListener('pointerdown', (event) => event.preventDefault());
  mobileJumpButton.addEventListener('click', (event) => {
    event.preventDefault();
    doJump();
  });
  hud.start?.addEventListener('click', () => {
    if (state === 'playing') pause();
    else start();
  });
  hud.restart?.addEventListener('click', () => { reset(); beginLevel(0); });
  hud.hardMode?.addEventListener('click', () => {
    hardMode = !hardMode;
    updateHud();
    playTone(hardMode ? 720 : 430, 0.065, 'square', 0.018);
  });
  hud.fullscreen?.addEventListener('click', toggleFullscreen);
  hud.overlayStart?.addEventListener('click', start);
  hud.music?.addEventListener('click', () => {
    musicOn = !musicOn;
    hud.music.classList.toggle('is-off', !musicOn);
    hud.music.setAttribute('aria-pressed', String(musicOn));
    if (musicOn) syncMusic(); else stopMusic();
  });
  hud.fx?.addEventListener('click', () => {
    fxOn = !fxOn;
    hud.fx.classList.toggle('is-off', !fxOn);
    hud.fx.setAttribute('aria-pressed', String(fxOn));
  });

  const ballPalettes = [
    { file: 'teal sphere.PNG', glow: 0x45f0ff },
    { file: 'blue sphere.PNG', glow: 0x3b8dff },
    { file: 'pink sphere.PNG', glow: 0xff61df },
    { file: 'white sphere.PNG', glow: 0xffffff },
    { file: 'green sphere.PNG', glow: 0x75ff99 },
    { file: 'yellow sphere.PNG', glow: 0xffde55 },
    { file: 'red sphere.PNG', glow: 0xff4d5d }
  ];

  const ballTextures = ballPalettes.map((palette) => {
    const texture = textureLoader.load(encodeURI('assets/neon octorun spheres/' + palette.file));
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  });

  function applyBallColor() {
    const palette = ballPalettes[ballColorIndex];
    playerMaterial.map = ballTextures[ballColorIndex];
    playerMaterial.color.setHex(0xffffff);
    playerMaterial.opacity = 1;
    playerMaterial.needsUpdate = true;
    playerGlow.material.color.setHex(palette.glow);
    trail.material.color.setHex(palette.glow);
  }

  function stepBallColor(direction = 1) {
    ballColorIndex = (ballColorIndex + direction + ballPalettes.length) % ballPalettes.length;
    applyBallColor();
    ballSpinVel += direction * 8;
    playTone(520 + ballColorIndex * 70, 0.055, 'triangle', 0.022);
  }

  hud.ballNext?.addEventListener('click', () => stepBallColor(1));
  applyBallColor();
  applyLevelPalette();
  resize();
  reset();
  requestAnimationFrame(loop);
})();
