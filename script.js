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
const defaultTheme = document.querySelector(".lessons-page") ? "dark" : "light";
const themes = ["light", "dark"];
const initialTheme = themes.includes(storedTheme) ? storedTheme : defaultTheme;
let activeTag = "";
let submittedTerms = [];

document.documentElement.dataset.theme = initialTheme;
writeStoredTheme(initialTheme);

const syncThemeLinks = () => {
  const currentTheme = document.documentElement.dataset.theme;
  document.querySelectorAll('a[href^="index.html"], a[href^="lessons.html"]').forEach((link) => {
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

document.querySelectorAll(".page-menu-control a, .page-menu-toggle, .site-nav a, .library-link, .theme-toggle").forEach((control) => {
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
    const relationship = String(formData.get("relationship") || "").trim();
    const message = String(formData.get("message") || "").trim();
    const subjectName = name || "Get Scrawny inquiry";
    const body = [
      "New Get Scrawny inquiry",
      "",
      "Name: " + name,
      "Email: " + email,
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
