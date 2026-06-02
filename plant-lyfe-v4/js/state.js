// ─── Save Key ─────────────────────────────────────────────────
const SAVE_PREFIX = 'plantlyfe_v5_';

function userKey(name) {
  return SAVE_PREFIX + name.toLowerCase().trim();
}

// ─── Default State ────────────────────────────────────────────
function mkState(name) {
  return {
    username:  name,
    money:     25,
    rep:       0,
    slots:     Array(SLOTS).fill(null),
    heldSeed:  null,
    sel:       null,
    sold:      0,
    earned:    0,
    lastTick:  Date.now(),
  };
}

// ─── Load / Save ──────────────────────────────────────────────
function loadUser(name) {
  try {
    const raw = localStorage.getItem(userKey(name));
    if (raw) {
      const d = JSON.parse(raw);
      if (d && Array.isArray(d.slots)) return d;
    }
  } catch (e) {}
  return mkState(name);
}

function saveGame() {
  if (!window.currentUser || !window.G) return;
  window.G.lastTick = Date.now();
  localStorage.setItem(userKey(window.currentUser), JSON.stringify(window.G));
}

// ─── List all saved users ─────────────────────────────────────
function allUsers() {
  const out = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(SAVE_PREFIX)) {
      try {
        const d = JSON.parse(localStorage.getItem(k));
        if (d && d.money !== undefined) {
          out.push({ name: d.username || k.replace(SAVE_PREFIX, ''), data: d });
        }
      } catch (e) {}
    }
  }
  return out;
}

// ─── Rank helpers ─────────────────────────────────────────────
function getRank(rep) {
  let r = RANKS[0];
  for (const rank of RANKS) {
    if (rep >= rank.rep) r = rank;
  }
  return r;
}

function getNextRank(rep) {
  for (const rank of RANKS) {
    if (rep < rank.rep) return rank;
  }
  return null;
}
