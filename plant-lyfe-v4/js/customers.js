// ─── Customer Data ────────────────────────────────────────────
// Names and flavour messages for customer cards
const CUSTOMER_NAMES = [
  'MARTA', 'JIN', 'THEO', 'PRIYA', 'SAM', 'FELIX', 'NOUR',
  'CELESTE', 'OMAR', 'HANA', '루이', 'DANI', 'YUSUF', 'NINA',
];

const REQUEST_MESSAGES = {
  cactus:    ['MOVING INTO A NEW PLACE!', 'LOW MAINTENANCE PLEASE.', 'FOR MY DESK.'],
  succulent: ['GIFT FOR A FRIEND.', 'CUTE AND SMALL PLS!', 'FOR MY WINDOWSILL.'],
  fern:      ['SOMETHING LEAFY!', 'MY OFFICE IS DRY.', 'LUSH AND GREEN PLS.'],
  sunflower: ['BRIGHTENS MY DAY!', 'FOR MY BALCONY.', 'CHEER ME UP!'],
  flower:    ['FOR MY MUM.', 'SOMETHING PRETTY!', 'DATE NIGHT GIFT.'],
  bamboo:    ['GOOD LUCK PLANT!', 'FOR MY STUDIO.', 'ZEN VIBES ONLY.'],
  mushroom:  ['SO UNIQUE!!!', 'FOR A TERRARIUM.', 'MY FRIEND WILL LOVE IT.'],
  orchid:    ['SPECIAL OCCASION.', 'MY ANNIVERSARY GIFT.', 'SO ELEGANT!!'],
  lotus:     ['FOUND ONE ONLINE.', 'FOR MEDITATION SPACE.', 'RARE AND BEAUTIFUL.'],
  rainbow:   ['I CANNOT BELIEVE THIS EXISTS.', 'MUST HAVE IT!!!', 'ONCE IN A LIFETIME!'],
};

// Bonus multiplier over base sell price (e.g. 1.5 = 50% bonus)
const BONUS_MULT = {
  0: 1.5,   // common   — +50%
  1: 1.6,   // uncommon — +60%
  2: 1.75,  // rare     — +75%
  3: 2.0,   // exotic   — +100%
  4: 2.5,   // legendary — +150%
};

// How long a request lasts (seconds)
const REQUEST_TTL = 5 * 60; // 5 minutes
const MAX_REQUESTS = 3;

// How often to try spawning a new request (ticks)
// One tick = TICK_MS ms. Spawn check every ~30s.
const SPAWN_INTERVAL_TICKS = 15;

// ─── Request Generation ───────────────────────────────────────
function generateRequest() {
  const rep      = window.G.rep || 0;
  const available = ALL_PLANTS.filter(p => rep >= p.unlock);
  if (!available.length) return null;

  // Weight toward rarer plants for higher-rep players
  const pick = available[Math.floor(Math.random() * available.length)];
  const name = CUSTOMER_NAMES[Math.floor(Math.random() * CUSTOMER_NAMES.length)];
  const msgs = REQUEST_MESSAGES[pick.id] || ['LOOKING FOR THIS PLANT.'];
  const msg  = msgs[Math.floor(Math.random() * msgs.length)];
  const bonus = Math.round(pick.sell * BONUS_MULT[pick.tier]);

  return {
    id:        Date.now() + Math.random(), // unique key
    plantId:   pick.id,
    name,
    msg,
    bonus,
    basePrice: pick.sell,
    expiresAt: Date.now() + REQUEST_TTL * 1000,
    tier:      pick.tier,
  };
}

// ─── Tick Integration ─────────────────────────────────────────
// Called from gameTick() every tick. Prunes expired requests,
// spawns new ones, returns true if anything changed.
function tickRequests(tickCount) {
  if (!window.G.requests) window.G.requests = [];

  const now     = Date.now();
  const before  = window.G.requests.length;

  // Prune expired
  window.G.requests = window.G.requests.filter(r => r.expiresAt > now);

  const pruned = before - window.G.requests.length;
  if (pruned > 0) log(`${pruned} CUSTOMER REQUEST(S) EXPIRED.`, 'warn');

  // Try to spawn
  let spawned = false;
  if (
    tickCount % SPAWN_INTERVAL_TICKS === 0 &&
    window.G.requests.length < MAX_REQUESTS
  ) {
    const req = generateRequest();
    if (req) {
      window.G.requests.push(req);
      spawned = true;
      toast(`NEW REQUEST: ${req.name} WANTS A ${ALL_PLANTS.find(p=>p.id===req.plantId).name}!`, 'tp');
      log(`NEW REQUEST FROM ${req.name}: ${ALL_PLANTS.find(p=>p.id===req.plantId).name} FOR $${req.bonus}`, 'rep');
    }
  }

  return pruned > 0 || spawned;
}

// ─── Match on Sell ────────────────────────────────────────────
// Called from doSell(). Returns the matched request or null.
// Mutates G.requests by removing the matched entry.
function matchRequest(plantId) {
  if (!window.G.requests || !window.G.requests.length) return null;
  const now = Date.now();
  const idx = window.G.requests.findIndex(
    r => r.plantId === plantId && r.expiresAt > now
  );
  if (idx === -1) return null;
  const matched = window.G.requests[idx];
  window.G.requests.splice(idx, 1);
  return matched;
}

// ─── Force-spawn first request on new game ───────────────────
function maybeSpawnInitialRequest() {
  if (!window.G.requests) window.G.requests = [];
  if (window.G.requests.length === 0) {
    const req = generateRequest();
    if (req) window.G.requests.push(req);
  }
}
