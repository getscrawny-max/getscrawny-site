// ─── Plant Definitions ────────────────────────────────────────
const ALL_PLANTS = [
  {
    id: 'cactus',    name: 'CACTUS',    s0: '🌱', s1: '🪴', s2: '🌵',
    cost: 3,  sell: 8,  rep: 1,
    growSec: 240, drainRate: 0.28, tier: 0, unlock: 0,
    desc: 'STARTER / DRY OK', tierName: 'COMMON'
  },
  {
    id: 'succulent', name: 'SUCCULENT', s0: '🌱', s1: '🪴', s2: '🪴',
    cost: 4,  sell: 11, rep: 1,
    growSec: 200, drainRate: 0.45, tier: 0, unlock: 0,
    desc: 'STARTER / RESILIENT', tierName: 'COMMON'
  },
  {
    id: 'fern',      name: 'FERN',      s0: '🌱', s1: '🌿', s2: '🌿',
    cost: 5,  sell: 14, rep: 2,
    growSec: 160, drainRate: 1.0,  tier: 0, unlock: 0,
    desc: 'STARTER / THIRSTY', tierName: 'COMMON'
  },
  {
    id: 'sunflower', name: 'SUNFLWR',   s0: '🌱', s1: '🌿', s2: '🌻',
    cost: 6,  sell: 18, rep: 2,
    growSec: 140, drainRate: 0.8,  tier: 1, unlock: 10,
    desc: 'FAST / CHEERFUL', tierName: 'UNCOMMON'
  },
  {
    id: 'flower',    name: 'FLOWER',    s0: '🌱', s1: '🌱', s2: '🌸',
    cost: 7,  sell: 20, rep: 2,
    growSec: 180, drainRate: 0.95, tier: 1, unlock: 10,
    desc: 'MED / BLOOMER', tierName: 'UNCOMMON'
  },
  {
    id: 'bamboo',    name: 'BAMBOO',    s0: '🌱', s1: '🌿', s2: '🎋',
    cost: 9,  sell: 28, rep: 3,
    growSec: 300, drainRate: 0.75, tier: 2, unlock: 30,
    desc: 'SLOW / PREMIUM', tierName: 'RARE'
  },
  {
    id: 'mushroom',  name: 'MUSHROOM',  s0: '🌱', s1: '🍄', s2: '🍄',
    cost: 11, sell: 35, rep: 4,
    growSec: 260, drainRate: 0.55, tier: 2, unlock: 30,
    desc: 'RARE / SHADY', tierName: 'RARE'
  },
  {
    id: 'orchid',    name: 'ORCHID',    s0: '🌱', s1: '🌸', s2: '🪷',
    cost: 14, sell: 48, rep: 5,
    growSec: 320, drainRate: 1.2,  tier: 3, unlock: 60,
    desc: 'EXOTIC / DELICATE', tierName: 'EXOTIC'
  },
  {
    id: 'lotus',     name: 'LOTUS',     s0: '🌱', s1: '🌸', s2: '🪷',
    cost: 16, sell: 55, rep: 5,
    growSec: 350, drainRate: 1.0,  tier: 3, unlock: 60,
    desc: 'EXOTIC / RARE', tierName: 'EXOTIC'
  },
  {
    id: 'rainbow',   name: 'RAINBOW',   s0: '🌱', s1: '🌿', s2: '🌈',
    cost: 20, sell: 80, rep: 8,
    growSec: 400, drainRate: 0.9,  tier: 4, unlock: 100,
    desc: 'LEGENDARY / UNIQUE', tierName: 'LEGENDARY'
  },
];

// ─── Rank Definitions ─────────────────────────────────────────
const RANKS = [
  { name: 'SPROUT',   rep: 0,   color: 'var(--green2)',  desc: 'JUST STARTING OUT.\nKEEP GROWING!' },
  { name: 'GARDENER', rep: 10,  color: 'var(--blue2)',   desc: 'REGULARS TRUST YOUR\nFRESH SELECTIONS.' },
  { name: 'BOTANIST', rep: 30,  color: 'var(--purple2)', desc: 'YOUR SHOP HAS REAL\nCHARACTER NOW.' },
  { name: 'FLORIST',  rep: 60,  color: 'var(--gold)',    desc: 'PEOPLE COME FROM\nFAR AWAY TO VISIT.' },
  { name: 'VERDANT',  rep: 100, color: 'var(--pink2)',   desc: 'LEGENDARY PLANT KEEPER.\nA LIVING MUSEUM.' },
];

// ─── Constants ────────────────────────────────────────────────
const SLOTS        = 12;
const PER_ROW      = 4;
const WATER_MAX    = 100;
const HEALTH_MAX   = 100;
const HEALTH_DRAIN = 1.5;   // health lost per second when water = 0
const WATER_REFILL = 65;    // water added per manual watering
const TICK_MS      = 2000;  // game tick interval

const DISPLAY_SLOTS = 6;
