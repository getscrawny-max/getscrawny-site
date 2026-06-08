// Zogton asset map.
const ZOGTON_ASSET_VERSION = 'zogton-sprites-1';
const ZOGTON_BASE = `${window.location.protocol === 'file:' ? '..' : ''}/assets/Pixel%20Zogton%20Character/`;
const ZOGTON_DEFAULT_MESSAGE = 'Greetings, human. I am Zogton. Let us study Earth plants.';
const ZOGTON_HIDE_MS = 280;

function zogtonAsset(filename) {
  return `${ZOGTON_BASE}${filename}?v=${ZOGTON_ASSET_VERSION}`;
}

const ZOGTON_ASSETS = {
  sad: zogtonAsset('zogton_sad.PNG'),
  farmer: zogtonAsset('zogton_farmer.PNG'),
  happy: zogtonAsset('zogton_happy.PNG'),
  worried: zogtonAsset('zogton_worried.PNG'),
  shocked: zogtonAsset('zogton_shocked.PNG'),
  thinking: zogtonAsset('zogton_thinking.PNG'),
  peace: zogtonAsset('zogton_peace.PNG'),
  scientist: zogtonAsset('zogton_scientist.PNG'),
  cosmic: zogtonAsset('zogton_cosmic.PNG'),
  idle: zogtonAsset('zogton_idle.PNG'),
  doctor: zogtonAsset('zogton_doctor.PNG'),
  wizard: zogtonAsset('zogton_wizard.PNG'),
  excited: zogtonAsset('zogton_excited.PNG'),
  angry: zogtonAsset('zogton_angry.PNG'),
};

const ZOGTON_MOOD_MAP = {
  idle: 'idle',
  happy: 'happy',
  excited: 'excited',
  shocked: 'shocked',
  worried: 'worried',
  annoyed: 'angry',
  thinking: 'thinking',
  science: 'scientist',
  cosmic: 'cosmic',
  farmer: 'farmer',
  wizard: 'wizard',
  celebration: 'excited',
  warning: 'worried',
  mystery: 'cosmic',
};

const ZOGTON_IDLE_MESSAGES = [
  ['Most Earth leaves are tiny solar panels. Delightfully efficient.', 'science'],
  ['Root systems are the hidden architecture. I respect quiet builders.', 'thinking'],
  ['I am monitoring chlorophyll activity. The plants are showing off.', 'science'],
  ['A calm greenhouse grows better stories.', 'idle'],
  ['These plants appear friendly. Mostly.', 'mystery'],
  ['Tiny reminder: steady water beats heroic panic watering.', 'farmer'],
  ['If a cactus could wave, it would do so very carefully.', 'happy'],
  ['Excellent posture, human. The seedlings are taking notes.', 'celebration'],
  ['Good shopkeeping is science with a cash drawer.', 'cosmic'],
  ['Breathe in. Count leaves. Continue being magnificent.', 'peace'],
];

const ZOGTON_POPUP_STATE = {
  active: false,
  important: false,
  hideTimer: null,
  removeTimer: null,
  idleTimer: null,
};

function getZogtonAssetForMood(mood) {
  const requestedMood = String(mood || 'idle');
  const assetKey = ZOGTON_MOOD_MAP[requestedMood] || ZOGTON_MOOD_MAP.idle;
  return ZOGTON_ASSETS[assetKey] || ZOGTON_ASSETS.idle;
}

function setZogtonSprite(mood) {
  const img = document.getElementById('zogton-sprite');
  const fallback = document.getElementById('zogton-fallback');
  if (!img) return;

  const requestedMood = String(mood || 'idle');
  const nextSrc = getZogtonAssetForMood(mood);
  img.hidden = false;
  if (fallback) fallback.hidden = true;

  img.onerror = () => {
    if (img.dataset.assetKey !== 'idle') {
      img.dataset.assetKey = 'idle';
      img.src = ZOGTON_ASSETS.idle;
      return;
    }

    img.hidden = true;
    if (fallback) fallback.hidden = false;
  };
  img.onload = () => {
    img.hidden = false;
    if (fallback) fallback.hidden = true;
  };

  img.dataset.assetKey = ZOGTON_MOOD_MAP[requestedMood] || 'idle';
  img.src = nextSrc;
  img.dataset.mood = ZOGTON_MOOD_MAP[requestedMood] ? requestedMood : 'idle';
}

function dismissZogtonMessage() {
  const guide = document.querySelector('.zogton-guide');
  if (!guide || guide.hidden) return;

  guide.classList.remove('is-visible');
  guide.classList.add('is-hiding');
  ZOGTON_POPUP_STATE.active = false;
  ZOGTON_POPUP_STATE.important = false;

  clearTimeout(ZOGTON_POPUP_STATE.removeTimer);
  ZOGTON_POPUP_STATE.removeTimer = setTimeout(() => {
    guide.hidden = true;
    guide.classList.remove('is-hiding');
  }, ZOGTON_HIDE_MS);
}

function showZogtonMessage(text, mood = 'idle', options = {}) {
  const guide = document.querySelector('.zogton-guide');
  const bubble = document.querySelector('.zogton-bubble');
  if (!guide) return;

  const important = options.important === true;
  if (ZOGTON_POPUP_STATE.active && ZOGTON_POPUP_STATE.important && !important) return;

  const message = typeof text === 'string' && text.trim()
    ? text
    : ZOGTON_DEFAULT_MESSAGE;
  const duration = Math.max(2500, options.duration || (important ? 10000 : 7600));

  clearTimeout(ZOGTON_POPUP_STATE.hideTimer);
  clearTimeout(ZOGTON_POPUP_STATE.removeTimer);

  if (bubble) bubble.textContent = message;
  setZogtonSprite(mood);

  guide.hidden = false;
  guide.classList.remove('is-hiding');
  void guide.offsetWidth;
  guide.classList.add('is-visible');

  ZOGTON_POPUP_STATE.active = true;
  ZOGTON_POPUP_STATE.important = important;
  ZOGTON_POPUP_STATE.hideTimer = setTimeout(dismissZogtonMessage, duration);
}

function scheduleZogtonIdleMessage() {
  clearTimeout(ZOGTON_POPUP_STATE.idleTimer);
  const delay = 60000 + Math.floor(Math.random() * 60000);
  ZOGTON_POPUP_STATE.idleTimer = setTimeout(() => {
    const gameVisible = document.getElementById('game-screen')?.style.display !== 'none';
    if (gameVisible && !ZOGTON_POPUP_STATE.active) {
      const pick = ZOGTON_IDLE_MESSAGES[Math.floor(Math.random() * ZOGTON_IDLE_MESSAGES.length)];
      showZogtonMessage(pick[0], pick[1], { duration: 6500 });
    }
    scheduleZogtonIdleMessage();
  }, delay);
}

function startZogtonGuide() {
  showZogtonMessage('Greenhouse interface online. I will keep my antennae helpful.', 'idle', {
    important: true,
    duration: 9000,
  });
  scheduleZogtonIdleMessage();
}

window.ZOGTON_ASSETS = ZOGTON_ASSETS;
window.ZOGTON_MOOD_MAP = ZOGTON_MOOD_MAP;
window.showZogtonMessage = showZogtonMessage;
window.dismissZogtonMessage = dismissZogtonMessage;
window.startZogtonGuide = startZogtonGuide;
