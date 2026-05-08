const navToggle = document.querySelector("[data-nav-toggle]");
const nav = document.querySelector("[data-nav]");
const form = document.querySelector("[data-contact-form]");
const formNote = document.querySelector("[data-form-note]");
const themeToggle = document.querySelector("[data-theme-toggle]");
const lessonMap = document.querySelector("[data-lesson-map]");
const lessonCards = Array.from(document.querySelectorAll("[data-lesson-card]"));
const lessonSort = document.querySelector("[data-lesson-sort]");
const lessonSearch = document.querySelector("[data-lesson-search]");
const lessonSubmit = document.querySelector("[data-lesson-submit]");
const lessonClear = document.querySelector("[data-lesson-clear]");
const hashtagFilter = document.querySelector("[data-hashtag-filter]");
const tagClear = document.querySelector("[data-tag-clear]");
const lessonCount = document.querySelector("[data-lesson-count]");
const readStoredTheme = () => {
  const fromUrl = new URLSearchParams(window.location.search).get("theme");
  if (fromUrl) return fromUrl;

  try {
    const fromStorage = localStorage.getItem("get-scrawny-theme") || sessionStorage.getItem("get-scrawny-theme");
    if (fromStorage) return fromStorage;
  } catch {
    // Keep going; local file previews can be picky about storage.
  }

  const cookieTheme = document.cookie
    .split("; ")
    .find((item) => item.startsWith("get-scrawny-theme="))
    ?.split("=")[1];
  return cookieTheme ? decodeURIComponent(cookieTheme) : null;
};
const writeStoredTheme = (theme) => {
  try {
    localStorage.setItem("get-scrawny-theme", theme);
    sessionStorage.setItem("get-scrawny-theme", theme);
  } catch {
    // Theme still updates for the current page even when storage is unavailable.
  }
  document.cookie = "get-scrawny-theme=" + encodeURIComponent(theme) + "; path=/; max-age=31536000; SameSite=Lax";
};
const storedTheme = readStoredTheme();
const defaultTheme = "dark";
const themes = ["light", "dark"];
const initialTheme = themes.includes(storedTheme) ? storedTheme : defaultTheme;
let activeTag = "";
let submittedTerms = [];

document.documentElement.dataset.theme = initialTheme;
writeStoredTheme(initialTheme);

const syncThemeLinks = () => {
  const currentTheme = document.documentElement.dataset.theme;
  document.querySelectorAll('a[href^="index.html"], a[href^="lessons.html"], a[href^="keyboard-flight.html"]').forEach((link) => {
    const rawHref = link.getAttribute("href");
    if (!rawHref || rawHref.includes("assets/")) return;
    const url = new URL(rawHref, window.location.href);
    url.searchParams.set("theme", currentTheme);
    link.setAttribute("href", url.pathname.split("/").pop() + url.search + url.hash);
  });
};

const syncThemeToggle = () => {
  if (!themeToggle) return;
  const currentTheme = document.documentElement.dataset.theme;
  const nextTheme = themes[(themes.indexOf(currentTheme) + 1) % themes.length];
  themeToggle.setAttribute("aria-label", "Switch to " + nextTheme + " mode");
  themeToggle.setAttribute("aria-pressed", currentTheme !== "light" ? "true" : "false");
};

syncThemeToggle();
syncThemeLinks();

if (navToggle && nav) {
  navToggle.addEventListener("click", () => {
    const isOpen = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!isOpen));
    navToggle.setAttribute("aria-label", isOpen ? "Open home page directory" : "Close home page directory");
    nav.classList.toggle("is-open", !isOpen);
  });

  nav.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.setAttribute("aria-label", "Open home page directory");
      nav.classList.remove("is-open");
    }
  });
}

let clickAudioContext;

const playMechanicalClick = () => {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  clickAudioContext ||= new AudioContextClass();
  const now = clickAudioContext.currentTime;
  const oscillator = clickAudioContext.createOscillator();
  const clickGain = clickAudioContext.createGain();
  const buffer = clickAudioContext.createBuffer(1, Math.floor(clickAudioContext.sampleRate * 0.045), clickAudioContext.sampleRate);
  const data = buffer.getChannelData(0);
  const noise = clickAudioContext.createBufferSource();
  const noiseGain = clickAudioContext.createGain();

  for (let index = 0; index < data.length; index += 1) {
    data[index] = (Math.random() * 2 - 1) * (1 - index / data.length);
  }

  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(1180, now);
  oscillator.frequency.exponentialRampToValueAtTime(260, now + 0.024);
  clickGain.gain.setValueAtTime(0.0001, now);
  clickGain.gain.exponentialRampToValueAtTime(0.052, now + 0.002);
  clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.046);

  noise.buffer = buffer;
  noiseGain.gain.setValueAtTime(0.04, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.036);

  oscillator.connect(clickGain);
  clickGain.connect(clickAudioContext.destination);
  noise.connect(noiseGain);
  noiseGain.connect(clickAudioContext.destination);
  oscillator.start(now);
  noise.start(now);
  oscillator.stop(now + 0.05);
  noise.stop(now + 0.04);
};

document.querySelectorAll(".page-menu-control a, .page-menu-toggle, .site-nav a, .library-link, .theme-toggle, .game-controls button, .hero-actions a").forEach((control) => {
  control.addEventListener("pointerdown", () => playMechanicalClick());
});

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const currentTheme = document.documentElement.dataset.theme;
    const nextTheme = themes[(themes.indexOf(currentTheme) + 1) % themes.length];
    document.documentElement.dataset.theme = nextTheme;
    writeStoredTheme(nextTheme);
    syncThemeToggle();
    syncThemeLinks();
  });
}

const normalizeTag = (value) => value.trim().toLowerCase().replace(/^#+/, "");

const getLessonTags = (card) =>
  (card.dataset.tags || "")
    .split(",")
    .map(normalizeTag)
    .filter(Boolean);

const readSearchTerms = () => {
  if (!lessonSearch) return [];
  return lessonSearch.value
    .replace(/#/g, " #")
    .split(/[,\s]+/)
    .map(normalizeTag)
    .filter((term) => term.length > 1);
};

const clearLibraryFilters = ({ resetSort = false } = {}) => {
  activeTag = "";
  submittedTerms = [];
  if (lessonSearch) lessonSearch.value = "";
  if (resetSort && lessonSort) lessonSort.value = "date-desc";
  syncLibrary();
};

const syncLibrary = () => {
  if (!lessonMap || !lessonCards.length) return;

  const searchTerms = submittedTerms;
  const sortMode = lessonSort ? lessonSort.value : "date-desc";
  const isFiltered = Boolean(activeTag || searchTerms.length);
  let visibleCount = 0;

  const cardMatches = (card) => {
    const tags = getLessonTags(card);
    const searchable = [card.dataset.title || "", ...tags].join(" ").toLowerCase();
    const matchesSearch = !searchTerms.length || searchTerms.some((term) => searchable.includes(term));
    const matchesTag = !activeTag || tags.includes(activeTag);

    return matchesSearch && matchesTag;
  };

  const compareCards = (a, b) => {
    if (sortMode === "alpha-asc") {
      return (a.dataset.title || "").localeCompare(b.dataset.title || "");
    }

    if (sortMode === "pages-asc") {
      return Number(a.dataset.pages || 0) - Number(b.dataset.pages || 0);
    }

    if (sortMode === "pages-desc") {
      return Number(b.dataset.pages || 0) - Number(a.dataset.pages || 0);
    }

    if (sortMode === "date-asc") {
      return new Date(a.dataset.added || 0) - new Date(b.dataset.added || 0);
    }

    return new Date(b.dataset.added || 0) - new Date(a.dataset.added || 0);
  };

  const sortedCards = [...lessonCards].sort((a, b) => {
    if (isFiltered) {
      const matchRank = Number(cardMatches(b)) - Number(cardMatches(a));
      if (matchRank !== 0) return matchRank;
    }

    return compareCards(a, b);
  });

  sortedCards.forEach((card) => {
    const isVisible = cardMatches(card);

    card.hidden = false;
    card.classList.toggle("is-dimmed", isFiltered && !isVisible);
    lessonMap.append(card);
    if (isVisible) visibleCount += 1;
  });

  if (lessonCount) {
    const totalCount = lessonCards.length;
    const noun = totalCount === 1 ? "lesson" : "lessons";
    lessonCount.textContent = isFiltered ? `${visibleCount}/${totalCount} matching ${noun}` : `${visibleCount}/${totalCount} ${noun} showing`;
  }

  if (hashtagFilter) {
    hashtagFilter.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.tag === activeTag);
    });
  }
};

if (lessonMap && lessonCards.length) {
  const tags = [...new Set(lessonCards.flatMap(getLessonTags))].sort();

  if (hashtagFilter) {
    tags.forEach((tag) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.tag = tag;
      button.textContent = `#${tag}`;
      button.addEventListener("click", () => {
        activeTag = activeTag === tag ? "" : tag;
        syncLibrary();
      });
      hashtagFilter.append(button);
    });
  }

  lessonSort?.addEventListener("change", syncLibrary);
  lessonSubmit?.addEventListener("click", () => {
    activeTag = "";
    submittedTerms = readSearchTerms();
    syncLibrary();
  });
  lessonSearch?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      activeTag = "";
      submittedTerms = readSearchTerms();
      syncLibrary();
    }
  });
  lessonClear?.addEventListener("click", () => {
    clearLibraryFilters({ resetSort: true });
  });
  tagClear?.addEventListener("click", () => clearLibraryFilters());
  document.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("[data-tag-clear]")) {
      clearLibraryFilters();
    }
  });

  syncLibrary();
}

if (form && formNote) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const relationship = String(formData.get("relationship") || "").trim();
    const message = String(formData.get("message") || "").trim();
    const subjectName = name || "Get Scrawny inquiry";
    const body = [
      "New Get Scrawny inquiry",
      "",
      "Name: " + name,
      "Email: " + email,
      "Phone: " + phone,
      "Reaching out as: " + relationship,
      "",
      "Message:",
      message,
    ].join("\n");
    const mailto = "mailto:getscrawny@gmail.com?subject=" + encodeURIComponent("Get Scrawny inquiry from " + subjectName) + "&body=" + encodeURIComponent(body);
    formNote.textContent = "Opening your email app with a formatted inquiry.";
    window.location.href = mailto;
  });
}

const gameCanvas = document.querySelector("[data-game-canvas]");
const gameStart = document.querySelector("[data-game-start]");
const gamePause = document.querySelector("[data-game-pause]");
const gameReset = document.querySelector("[data-game-reset]");
const gameFullscreen = document.querySelector("[data-game-fullscreen]");
const flightDeck = document.querySelector(".flight-deck");
const gameLives = document.querySelector("[data-game-lives]");
const lifeSelect = document.querySelector("[data-life-select]");
const gameMisfires = document.querySelector("[data-game-misfires]");
const gameScore = document.querySelector("[data-game-score]");
const gameStreak = document.querySelector("[data-game-streak]");
const gameStatus = document.querySelector("[data-game-status]");
const gameOverlay = document.querySelector("[data-game-overlay]");
const gameMute = document.querySelector("[data-game-mute]");
const startAudio = document.querySelector("[data-start-audio]");
const gameOverAudio = document.querySelector("[data-game-over-audio]");

if (gameCanvas) {
  const ctx = gameCanvas.getContext("2d");
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const columns = [0.16, 0.3, 0.44, 0.58, 0.72, 0.86];
  const types = [
    { name: "asteroid", size: 62, letters: 1, speed: 44, weight: 7, stage: 1 },
    { name: "debris", size: 52, letters: 1, speed: 50, weight: 5, stage: 1 },
    { name: "satellite", size: 76, letters: 2, speed: 42, weight: 3, stage: 2 },
    { name: "ship", size: 78, letters: 2, speed: 40, weight: 2, stage: 2 },
    { name: "planet", size: 98, letters: 3, speed: 34, weight: 1, stage: 3 },
  ];
  let width = 1280;
  let height = 760;
  let dpr = 1;
  let startingLives = 5;
  let infiniteLives = false;
  let lives = 5;
  let score = 0;
  let streak = 0;
  let misfires = 0;
  let running = false;
  let ended = false;
  let lastTime = 0;
  let spawnTimer = 0;
  let nextSpawn = 1.8;
  let obstacles = [];
  let stars = [];
  let wisps = [];
  let ufoShake = 0;
  let gameMuted = localStorage.getItem("alienAlphabetMuted") === "true";
  const encouragements = [
    "Great key targeting.",
    "Nice calm timing.",
    "Sharp eyes and steady hands.",
    "Clean clear.",
    "Great focus.",
    "That one opened the lane.",
    "Smooth response.",
    "Strong keyboard work.",
  ];

  const getStage = () => {
    if (score >= 240) return 3;
    if (score >= 90) return 2;
    return 1;
  };

  const getSpeedBonus = () => {
    const stage = getStage();
    return (stage - 1) * 12 + Math.min(score * 0.055, 36);
  };

  const randomEncouragement = () => encouragements[Math.floor(Math.random() * encouragements.length)];

  const syncMuteButton = () => {
    if (!gameMute) return;
    gameMute.setAttribute("aria-pressed", String(gameMuted));
    gameMute.setAttribute("aria-label", gameMuted ? "Turn game sounds on" : "Mute game sounds");
    gameMute.innerHTML = '<span aria-hidden="true">♪</span>';
  };

  const playAudioFile = (audio) => {
    if (gameMuted || !audio) return;
    audio.currentTime = 0;
    audio.volume = 0.42;
    audio.play().catch(() => {});
  };

  const playUfoStartSound = () => {
    if (startAudio) {
      playAudioFile(startAudio);
      return;
    }
    if (gameMuted) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    clickAudioContext ||= new AudioContextClass();
    const now = clickAudioContext.currentTime;
    const master = clickAudioContext.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.055, now + 0.018);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);
    master.connect(clickAudioContext.destination);

    [0, 0.055, 0.11].forEach((offset, index) => {
      const oscillator = clickAudioContext.createOscillator();
      const gain = clickAudioContext.createGain();
      oscillator.type = index === 1 ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(180 + index * 46, now + offset);
      oscillator.frequency.exponentialRampToValueAtTime(520 + index * 60, now + offset + 0.18);
      oscillator.frequency.exponentialRampToValueAtTime(260 + index * 34, now + offset + 0.36);
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.36 / (index + 1), now + offset + 0.026);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.42);
      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start(now + offset);
      oscillator.stop(now + offset + 0.46);
    });
  };

  const chooseType = () => {
    const stage = getStage();
    const available = types.filter((type) => type.stage <= stage);
    const total = available.reduce((sum, type) => sum + type.weight, 0);
    let roll = Math.random() * total;
    return available.find((type) => (roll -= type.weight) <= 0) || available[0];
  };

  const randomLetters = (count) => {
    let value = "";
    while (value.length < count) {
      const letter = letters[Math.floor(Math.random() * letters.length)];
      if (!value.includes(letter)) value += letter;
    }
    return value;
  };

  const resizeGame = () => {
    const rect = gameCanvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(680, Math.floor(rect.width));
    height = Math.max(500, Math.floor(rect.height));
    gameCanvas.width = Math.floor(width * dpr);
    gameCanvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: 150 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.7 + 0.35,
      s: Math.random() * 10 + 4,
      a: Math.random() * 0.58 + 0.24,
    }));
    wisps = Array.from({ length: 5 }, (_, index) => ({
      x: width * (0.15 + index * 0.18),
      y: height * (0.18 + Math.random() * 0.56),
      r: width * (0.16 + Math.random() * 0.12),
      hue: index % 2 ? "83, 106, 124" : "143, 181, 208",
      phase: Math.random() * Math.PI * 2,
    }));
  };

  const readLifeSetting = () => {
    const value = lifeSelect?.value || "5";
    infiniteLives = value === "infinite";
    startingLives = infiniteLives ? Infinity : Number(value);
  };

  const updateStats = () => {
    if (gameLives) gameLives.textContent = infiniteLives ? "∞" : String(lives);
    if (gameScore) gameScore.textContent = String(score);
    if (gameStreak) gameStreak.textContent = String(streak);
    if (gameMisfires) gameMisfires.textContent = String(misfires);
  };

  const setStatus = (message) => {
    if (gameStatus) gameStatus.textContent = message;
  };

  const setOverlay = (visible, label = "Ready", title = "Click Start, then use your keyboard.") => {
    if (!gameOverlay) return;
    gameOverlay.hidden = !visible;
    gameOverlay.innerHTML = '<p class="eyebrow">' + label + '</p><h3>' + title + '</h3>';
  };

  const resetGame = () => {
    if (lifeSelect) lifeSelect.disabled = false;
    readLifeSetting();
    lives = infiniteLives ? Infinity : startingLives;
    score = 0;
    streak = 0;
    misfires = 0;
    running = false;
    ended = false;
    lastTime = 0;
    spawnTimer = 0;
    nextSpawn = 1.65;
    ufoShake = 0;
    obstacles = [];
    updateStats();
    setStatus("Press the letter shown on each falling object. Multi-letter objects can be cleared in any order.");
    setOverlay(true);
    draw();
  };

  const spawnObstacle = () => {
    const type = chooseType();
    const column = columns[Math.floor(Math.random() * columns.length)];
    const jitter = (Math.random() - 0.5) * Math.min(70, width * 0.055);
    obstacles.push({
      id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Math.random()),
      type: type.name,
      x: width * column + jitter,
      y: -type.size - Math.random() * 90,
      size: type.size,
      speed: type.speed + Math.random() * 10 + getSpeedBonus(),
      palette: Math.floor(Math.random() * 4),
      letters: type.letters,
      code: randomLetters(type.letters),
      hitFlash: 0,
      wobble: Math.random() * Math.PI * 2,
    });
    nextSpawn = Math.max(0.82, 2.45 - score * 0.0035 - getStage() * 0.16 - Math.random() * 0.36);
  };

  const drawStars = (delta = 0) => {
    ctx.fillStyle = "#03050a";
    ctx.fillRect(0, 0, width, height);
    const deepGlow = ctx.createRadialGradient(width * 0.5, height * 0.74, 0, width * 0.5, height * 0.74, width * 0.72);
    deepGlow.addColorStop(0, "rgba(83, 106, 124, 0.2)");
    deepGlow.addColorStop(1, "rgba(3, 5, 10, 0)");
    ctx.fillStyle = deepGlow;
    ctx.fillRect(0, 0, width, height);
    wisps.forEach((wisp) => {
      wisp.phase += delta * 0.16;
      const x = wisp.x + Math.cos(wisp.phase) * 16;
      const y = wisp.y + Math.sin(wisp.phase * 0.8) * 10;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, wisp.r);
      gradient.addColorStop(0, "rgba(" + wisp.hue + ", 0.14)");
      gradient.addColorStop(0.45, "rgba(" + wisp.hue + ", 0.055)");
      gradient.addColorStop(1, "rgba(" + wisp.hue + ", 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(x, y, wisp.r * 1.25, wisp.r * 0.38, wisp.phase * 0.16, 0, Math.PI * 2);
      ctx.fill();
    });
    stars.forEach((star) => {
      star.y += star.s * delta;
      if (star.y > height + 4) {
        star.y = -4;
        star.x = Math.random() * width;
      }
      ctx.globalAlpha = star.a;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  };

  const drawUfo = (delta = 0) => {
    ufoShake = Math.max(0, ufoShake - delta);
    const shake = ufoShake > 0 ? Math.sin(ufoShake * 90) * 7 : 0;
    const x = width * 0.5 + shake;
    const y = height - 76;
    ctx.save();
    ctx.shadowColor = "rgba(143, 181, 208, 0.78)";
    ctx.shadowBlur = 28;
    ctx.fillStyle = "rgba(143, 181, 208, 0.2)";
    ctx.beginPath();
    ctx.ellipse(x, y + 42, 118, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#b9c9d5";
    ctx.beginPath();
    ctx.ellipse(x, y + 9, 82, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f7fbff";
    ctx.beginPath();
    ctx.ellipse(x, y - 10, 42, 33, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "#7bd66f";
    ctx.beginPath();
    ctx.arc(x, y - 18, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(5, 5, 5, 0.24)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = "#7bd66f";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 29);
    ctx.lineTo(x - 15, y - 39);
    ctx.moveTo(x + 8, y - 29);
    ctx.lineTo(x + 15, y - 39);
    ctx.stroke();
    ctx.fillStyle = "#050505";
    ctx.beginPath();
    ctx.arc(x - 5, y - 20, 2.6, 0, Math.PI * 2);
    ctx.arc(x + 5, y - 20, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#050505";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y - 16, 6, 0.15, Math.PI - 0.15);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.82)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y - 14, 22, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.fillStyle = "#8fb5d0";
    [-42, 0, 42].forEach((dot) => {
      ctx.beginPath();
      ctx.arc(x + dot, y + 9, 6, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  };

  const drawLabel = (obstacle) => {
    const fontSize = Math.max(30, obstacle.size * 0.5);
    ctx.save();
    ctx.translate(obstacle.x, obstacle.y);
    ctx.font = "900 " + fontSize + "px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (obstacle.type === "asteroid" || obstacle.type === "debris") {
      ctx.lineWidth = Math.max(5, fontSize * 0.15);
      ctx.strokeStyle = "rgba(0, 0, 0, 0.92)";
      ctx.strokeText(obstacle.code, 0, 2);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(obstacle.code, 0, 2);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(189, 247, 180, 0.85)";
      ctx.strokeText(obstacle.code, 0, 2);
      ctx.restore();
      return;
    }
    const badgeWidth = Math.max(obstacle.size * 0.84, obstacle.code.length * fontSize * 0.78 + 18);
    const badgeHeight = fontSize + 16;
    ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
    ctx.strokeStyle = "rgba(143, 181, 208, 0.92)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-badgeWidth / 2, -badgeHeight / 2, badgeWidth, badgeHeight, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#050505";
    ctx.fillText(obstacle.code, 0, 1);
    ctx.restore();
  };

  const drawObstacle = (obstacle) => {
    ctx.save();
    ctx.translate(obstacle.x, obstacle.y);
    ctx.rotate(Math.sin(obstacle.wobble) * 0.08);
    const s = obstacle.size;
    if (obstacle.type === "planet") {
      const palettes = [
        ["#4f7e9b", "#9fd18b", "#d8c17d"],
        ["#715a9a", "#d78fc7", "#8fb5d0"],
        ["#9a694f", "#e0a35f", "#f0d39a"],
        ["#526a7c", "#7bd66f", "#b9c9d5"],
      ];
      const palette = palettes[obstacle.palette % palettes.length];
      ctx.fillStyle = palette[0];
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.56, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = palette[1];
      ctx.beginPath();
      ctx.ellipse(-s * 0.12, -s * 0.12, s * 0.28, s * 0.13, -0.4, 0, Math.PI * 2);
      ctx.ellipse(s * 0.17, s * 0.12, s * 0.22, s * 0.1, 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = palette[2];
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, 3, s * 0.82, s * 0.2, -0.25, 0, Math.PI * 2);
      ctx.stroke();
    } else if (obstacle.type === "satellite") {
      const panelGradient = ctx.createLinearGradient(-s * 0.9, 0, s * 0.9, 0);
      panelGradient.addColorStop(0, "#6f95ad");
      panelGradient.addColorStop(0.5, "#c9d6df");
      panelGradient.addColorStop(1, "#6f95ad");
      ctx.strokeStyle = "#8fb5d0";
      ctx.lineWidth = 3;
      ctx.fillStyle = "rgba(143, 181, 208, 0.2)";
      ctx.beginPath();
      ctx.roundRect(-s * 0.94, -s * 0.24, s * 0.42, s * 0.48, 4);
      ctx.roundRect(s * 0.52, -s * 0.24, s * 0.42, s * 0.48, 4);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.32)";
      ctx.lineWidth = 1.4;
      [-0.82, -0.68, 0.66, 0.8].forEach((offset) => {
        ctx.beginPath();
        ctx.moveTo(s * offset, -s * 0.2);
        ctx.lineTo(s * offset, s * 0.2);
        ctx.stroke();
      });
      ctx.fillStyle = panelGradient;
      ctx.beginPath();
      ctx.roundRect(-s * 0.3, -s * 0.24, s * 0.6, s * 0.48, 8);
      ctx.fill();
      ctx.strokeStyle = "#d9e0e4";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#2c4558";
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#bdf7b4";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.24);
      ctx.lineTo(0, -s * 0.55);
      ctx.moveTo(s * 0.3, 0);
      ctx.lineTo(s * 0.52, 0);
      ctx.moveTo(-s * 0.3, 0);
      ctx.lineTo(-s * 0.52, 0);
      ctx.stroke();
      ctx.fillStyle = "#f7fbff";
      ctx.beginPath();
      ctx.arc(0, -s * 0.58, s * 0.08, 0, Math.PI * 2);
      ctx.fill();
    } else if (obstacle.type === "ship") {
      ctx.fillStyle = "#d9e0e4";
      ctx.beginPath();
      ctx.moveTo(-s * 0.56, -s * 0.32);
      ctx.lineTo(s * 0.56, 0);
      ctx.lineTo(-s * 0.56, s * 0.32);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#8fb5d0";
      ctx.fillRect(-s * 0.34, -s * 0.12, s * 0.32, s * 0.24);
    } else {
      ctx.save();
      ctx.rotate(-0.35);
      const tail = ctx.createLinearGradient(-s * 1.35, 0, -s * 0.2, 0);
      tail.addColorStop(0, "rgba(255, 172, 86, 0)");
      tail.addColorStop(0.45, "rgba(255, 172, 86, 0.22)");
      tail.addColorStop(1, "rgba(255, 238, 184, 0.46)");
      ctx.fillStyle = tail;
      ctx.beginPath();
      ctx.moveTo(-s * 1.38, -s * 0.18);
      ctx.lineTo(-s * 0.26, -s * 0.4);
      ctx.lineTo(-s * 0.18, s * 0.34);
      ctx.lineTo(-s * 1.38, s * 0.18);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      const rockGradient = ctx.createRadialGradient(-s * 0.18, -s * 0.22, s * 0.06, 0, 0, s * 0.64);
      rockGradient.addColorStop(0, obstacle.type === "debris" ? "#e2d4c4" : "#d0b99d");
      rockGradient.addColorStop(0.38, obstacle.type === "debris" ? "#a9957e" : "#8f775e");
      rockGradient.addColorStop(0.72, "#5f5147");
      rockGradient.addColorStop(1, "#2d2825");
      ctx.fillStyle = rockGradient;
      ctx.beginPath();
      const points = obstacle.type === "debris" ? 9 : 13;
      for (let i = 0; i < points; i += 1) {
        const angle = (Math.PI * 2 * i) / points;
        const ridge = 0.42 + ((i * 13 + obstacle.palette * 5) % 6) * 0.052;
        const radius = s * ridge;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 2;
      ctx.stroke();
      const craters = obstacle.type === "debris"
        ? [[-0.14, -0.1, 0.08], [0.14, 0.08, 0.055]]
        : [[-0.2, -0.16, 0.09], [0.16, 0.05, 0.075], [-0.05, 0.22, 0.06], [0.04, -0.28, 0.045]];
      craters.forEach((crater) => {
        ctx.fillStyle = "rgba(20, 25, 30, 0.36)";
        ctx.beginPath();
        ctx.arc(s * crater[0], s * crater[1], s * crater[2], 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
        ctx.lineWidth = 1.2;
        ctx.stroke();
      });
    }
    if (obstacle.hitFlash > 0) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.78, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    drawLabel(obstacle);
  };

  const draw = (delta = 0) => {
    drawStars(delta);
    const safeLine = height - 74;
    ctx.strokeStyle = "rgba(143, 181, 208, 0.22)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 10]);
    ctx.beginPath();
    ctx.moveTo(40, safeLine);
    ctx.lineTo(width - 40, safeLine);
    ctx.stroke();
    ctx.setLineDash([]);
    drawUfo(delta);
    obstacles.forEach(drawObstacle);
  };

  const loseLife = (missedObstacle) => {
    if (!infiniteLives) lives = Math.max(0, lives - 1);
    streak = 0;
    ufoShake = missedObstacle && missedObstacle.code.length > 1 ? 0.48 : 0.28;
    updateStats();
    if (infiniteLives) {
      setStatus("An object reached the UFO. Infinite lives are on, so keep going.");
      return;
    }
    setStatus(lives > 0 ? "An object reached the UFO. Reset your hands and keep going." : "Flight ended. Reset or start again when ready.");
    if (lives <= 0) {
      running = false;
      ended = true;
      playAudioFile(gameOverAudio);
      setOverlay(true, "Game over", "Score " + score + ". Misfires " + misfires + ". Press Reset to try another flight.");
    }
  };

  const update = (time) => {
    if (!running) {
      draw(0);
      return;
    }
    if (!lastTime) lastTime = time;
    const delta = Math.min((time - lastTime) / 1000, 0.033);
    lastTime = time;
    spawnTimer += delta;
    if (spawnTimer > nextSpawn) {
      spawnTimer = 0;
      spawnObstacle();
    }
    const boundary = height - 70;
    obstacles.forEach((obstacle) => {
      obstacle.y += obstacle.speed * delta;
      obstacle.wobble += delta * 1.5;
      obstacle.hitFlash = Math.max(0, obstacle.hitFlash - delta);
    });
    const missed = obstacles.filter((obstacle) => obstacle.y + obstacle.size * 0.5 >= boundary);
    obstacles = obstacles.filter((obstacle) => obstacle.y + obstacle.size * 0.5 < boundary);
    missed.forEach((obstacle) => loseLife(obstacle));
    draw(delta);
    requestAnimationFrame(update);
  };

  const startGame = () => {
    if (ended) resetGame();
    if (running) return;
    if (lifeSelect) lifeSelect.disabled = true;
    playUfoStartSound();
    running = true;
    lastTime = 0;
    setOverlay(false);
    setStatus("Flight active. Press the keys on the falling objects before they reach the UFO.");
    requestAnimationFrame(update);
  };

  const pauseGame = () => {
    if (!running) return;
    running = false;
    setOverlay(true, "Paused", "Press Start to continue the flight.");
    setStatus("Paused.");
  };

  const updateFullscreenButton = () => {
    if (!gameFullscreen) return;
    gameFullscreen.textContent = document.fullscreenElement === flightDeck ? "Exit full" : "Fullscreen";
  };

  const toggleFullscreen = () => {
    if (!flightDeck || !document.fullscreenEnabled) return;
    if (document.fullscreenElement === flightDeck) {
      document.exitFullscreen?.();
      return;
    }
    flightDeck.requestFullscreen?.();
  };

  const handleKey = (event) => {
    if (!running || event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.key.toUpperCase();
    if (!letters.includes(key) || key.length !== 1) return;
    event.preventDefault();
    const candidates = obstacles
      .filter((obstacle) => obstacle.code.includes(key))
      .sort((a, b) => b.y - a.y);
    if (!candidates.length) {
      misfires += 1;
      streak = 0;
      updateStats();
      setStatus(key + " is not falling right now. Misfire " + misfires + ".");
      return;
    }
    const target = candidates[0];
    target.code = target.code.replace(key, "");
    target.hitFlash = 0.22;
    if (!target.code) {
      obstacles = obstacles.filter((obstacle) => obstacle !== target);
      const progress = Math.min(Math.max(target.y / (height - 70), 0), 1);
      const timingMultiplier = 1.35 - progress * 0.75;
      const baseScore = target.letters * 14 + 8;
      const earned = Math.max(4, Math.round(baseScore * timingMultiplier + streak));
      score += earned;
      streak += 1;
      setStatus(randomEncouragement() + " +" + earned);
    } else {
      const partialEarned = Math.max(2, Math.round((target.letters + 1) * 2));
      score += partialEarned;
      streak += 1;
      setStatus(randomEncouragement() + " " + target.code.length + " more key" + (target.code.length === 1 ? "" : "s") + ". +" + partialEarned);
    }
    updateStats();
  };

  window.addEventListener("resize", resizeGame);
  window.addEventListener("keydown", handleKey);
  document.addEventListener("fullscreenchange", () => {
    updateFullscreenButton();
    resizeGame();
    draw();
  });
  gameStart?.addEventListener("click", startGame);
  gamePause?.addEventListener("click", pauseGame);
  gameReset?.addEventListener("click", resetGame);
  gameFullscreen?.addEventListener("click", toggleFullscreen);
  gameMute?.addEventListener("click", () => {
    gameMuted = !gameMuted;
    localStorage.setItem("alienAlphabetMuted", String(gameMuted));
    syncMuteButton();
  });
  lifeSelect?.addEventListener("change", () => {
    resetGame();
    updateStats();
  });
  syncMuteButton();
  updateFullscreenButton();
  resizeGame();
  resetGame();
}
