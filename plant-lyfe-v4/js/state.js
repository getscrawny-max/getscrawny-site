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
    discoveredPlants: [],
    discoveredMutations: [],
    rewardedDiscoveries: [],
    seedPacks: [],
    lastTick:  Date.now(),
  };
}

function normalizeRewardState() {
  if (!window.G) return;
  if (!Array.isArray(window.G.discoveredMutations)) window.G.discoveredMutations = [];
  if (!Array.isArray(window.G.rewardedDiscoveries)) window.G.rewardedDiscoveries = [];
  if (!Array.isArray(window.G.seedPacks)) window.G.seedPacks = [];
  const mutationIds = new Set(Object.values(PLANT_MUTATIONS).map(m => m.id));
  window.G.discoveredMutations = [...new Set(window.G.discoveredMutations.filter(id => mutationIds.has(id)))];
  window.G.rewardedDiscoveries = [...new Set(window.G.rewardedDiscoveries)];
}

function normalizeDiscoveries() {
  if (!window.G) return [];
  normalizeRewardState();
  if (!Array.isArray(window.G.discoveredPlants)) window.G.discoveredPlants = [];
  const valid = new Set(ALL_PLANTS.map(p => p.id));
  window.G.discoveredPlants = [...new Set(window.G.discoveredPlants.filter(id => valid.has(id)))];
  return window.G.discoveredPlants;
}

function isPlantDiscovered(plantId) {
  return normalizeDiscoveries().includes(plantId);
}

function markPlantDiscovered(plantId) {
  if (!plantId || !window.G) return false;
  const found = normalizeDiscoveries();
  if (found.includes(plantId)) return false;
  found.push(plantId);
  return true;
}

function markMutationDiscovered(mutationId) {
  if (!mutationId || !window.G) return false;
  normalizeRewardState();
  if (window.G.discoveredMutations.includes(mutationId)) return false;
  window.G.discoveredMutations.push(mutationId);
  return true;
}

function grantDiscoveryReward(kind, id, reward) {
  if (!window.G || !reward) return null;
  normalizeRewardState();
  const key = `${kind}:${id}`;
  if (window.G.rewardedDiscoveries.includes(key)) return null;
  window.G.rewardedDiscoveries.push(key);
  window.G.money = (window.G.money || 0) + reward.money;
  window.G.rep = (window.G.rep || 0) + reward.rep;
  for (let i = 0; i < reward.packs; i++) {
    window.G.seedPacks.push({
      label: reward.label,
      createdAt: Date.now(),
      source: key
    });
  }
  return reward;
}

function syncDiscoveriesFromState() {
  if (!window.G) return [];
  const newlyFound = [];
  const addIfNew = (slot) => {
    if (!slot || !slot.pid) return;
    if ((slot.mature || slot.displayedAt) && markPlantDiscovered(slot.pid)) {
      newlyFound.push(slot.pid);
    }
  };
  (window.G.slots || []).forEach(addIfNew);
  (window.G.display || []).forEach(addIfNew);
  return newlyFound;
}

// ─── Load / Save ──────────────────────────────────────────────
function loadUser(name) {
  try {
    const raw = localStorage.getItem(userKey(name));
    if (raw) {
      const d = JSON.parse(raw);
      if (d && Array.isArray(d.slots)) {
        if (!Array.isArray(d.discoveredPlants)) d.discoveredPlants = [];
        if (!Array.isArray(d.discoveredMutations)) d.discoveredMutations = [];
        if (!Array.isArray(d.rewardedDiscoveries)) d.rewardedDiscoveries = [];
        if (!Array.isArray(d.seedPacks)) d.seedPacks = [];
        return d;
      }
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
