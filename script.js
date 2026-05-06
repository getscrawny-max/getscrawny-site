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
const storedTheme = localStorage.getItem("get-scrawny-theme");
const defaultTheme = document.querySelector(".lessons-page") ? "dark" : "light";
const themes = ["light", "dark"];
const initialTheme = themes.includes(storedTheme) ? storedTheme : defaultTheme;
let activeTag = "";
let submittedTerms = [];

document.documentElement.dataset.theme = initialTheme;

const syncThemeToggle = () => {
  if (!themeToggle) return;
  const currentTheme = document.documentElement.dataset.theme;
  const nextTheme = themes[(themes.indexOf(currentTheme) + 1) % themes.length];
  themeToggle.setAttribute("aria-label", "Switch to " + nextTheme + " mode");
  themeToggle.setAttribute("aria-pressed", currentTheme !== "light" ? "true" : "false");
};

syncThemeToggle();

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

const playThemeClick = () => {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  clickAudioContext ||= new AudioContextClass();
  const now = clickAudioContext.currentTime;
  const oscillator = clickAudioContext.createOscillator();
  const clickGain = clickAudioContext.createGain();
  const buffer = clickAudioContext.createBuffer(1, clickAudioContext.sampleRate * 0.028, clickAudioContext.sampleRate);
  const data = buffer.getChannelData(0);
  const noise = clickAudioContext.createBufferSource();
  const noiseGain = clickAudioContext.createGain();

  for (let index = 0; index < data.length; index += 1) {
    data[index] = (Math.random() * 2 - 1) * (1 - index / data.length);
  }

  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(940, now);
  oscillator.frequency.exponentialRampToValueAtTime(180, now + 0.032);
  clickGain.gain.setValueAtTime(0.0001, now);
  clickGain.gain.exponentialRampToValueAtTime(0.038, now + 0.003);
  clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.038);

  noise.buffer = buffer;
  noiseGain.gain.setValueAtTime(0.025, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.028);

  oscillator.connect(clickGain);
  clickGain.connect(clickAudioContext.destination);
  noise.connect(noiseGain);
  noiseGain.connect(clickAudioContext.destination);
  oscillator.start(now);
  noise.start(now);
  oscillator.stop(now + 0.04);
  noise.stop(now + 0.03);
};

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    playThemeClick();
    const currentTheme = document.documentElement.dataset.theme;
    const nextTheme = themes[(themes.indexOf(currentTheme) + 1) % themes.length];
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem("get-scrawny-theme", nextTheme);
    syncThemeToggle();
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
