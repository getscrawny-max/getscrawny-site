// ─── Slot Status ──────────────────────────────────────────────
function getSlotStatus(slot) {
  if (!slot)        return 'empty';
  if (slot.dead)    return 'dead';
  if (slot.mature)  return 'mature';
  const gr = slot.growProgress || 0;
  if (slot.water <= 0)  return 'dry';
  if (slot.water < 20)  return 'thirsty';
  if (gr < 12)          return 'seed';
  return 'growing';
}

// ─── Time Simulation ──────────────────────────────────────────
function applyTimeToSlot(slot, p, dtSec) {
  if (slot.mature || slot.dead) return;
  const eff = dtSec * (slot.water > 10 ? 1.0 : 0.3);
  slot.growProgress = Math.min(100, (slot.growProgress || 0) + (eff / p.growSec) * 100);
  if (slot.growProgress >= 100) { slot.growProgress = 100; slot.mature = true; return; }
  slot.water = Math.max(0, (slot.water || WATER_MAX) - p.drainRate * dtSec);
  if (slot.water <= 0) {
    slot.health = Math.max(0, (slot.health || HEALTH_MAX) - HEALTH_DRAIN * dtSec);
    if (slot.health <= 0) { slot.dead = true; slot.health = 0; }
  }
}

// ─── Catch-Up ─────────────────────────────────────────────────
function catchUp() {
  const now = Date.now();
  const dt  = (now - (window.G.lastTick || now)) / 1000;
  if (dt < 2) return;
  window.G.slots.forEach(slot => {
    if (!slot || slot.dead || slot.mature) return;
    const p = ALL_PLANTS.find(x => x.id === slot.pid);
    if (p) applyTimeToSlot(slot, p, dt);
  });
  window.G.lastTick = now;
}

// ─── Game Tick ────────────────────────────────────────────────
let _tickCount = 0;

function gameTick() {
  _tickCount++;
  const now = Date.now();
  const dt  = (now - (window.G.lastTick || now)) / 1000;
  window.G.lastTick = now;

  const notify = [];
  let displayChanged = false;

  window.G.slots.forEach((slot, i) => {
    if (!slot || slot.dead || slot.mature) return;
    const p = ALL_PLANTS.find(x => x.id === slot.pid);
    if (!p) return;
    const wasThirsty = slot.water < 20;
    applyTimeToSlot(slot, p, dt);
    if (slot.mature && !slot._notifyMature) {
      slot._notifyMature = true;
      notify.push({ msg: `${p.name} READY! MOVE TO DISPLAY.`, t: '', i });
      displayChanged = true;
    }
    if (slot.dead && !slot._notifyDead) {
      slot._notifyDead = true;
      notify.push({ msg: `${p.name} DIED! REMOVE IT.`, t: 'te', i });
    }
    if (!wasThirsty && slot.water < 20 && !slot.dead && !slot.mature) {
      notify.push({ msg: `${p.name} IS THIRSTY!`, t: 'tw', i });
    }
  });

  const requestsChanged = tickRequests(_tickCount);
  saveGame();

  notify.forEach(n => {
    toast(n.msg, n.t);
    log(n.msg, n.t === 'te' ? 'bad' : n.t === 'tw' ? 'warn' : 'good');
  });

  renderGrowShelf();
  if (window.G.sel !== null) renderDetail();
  if (displayChanged || requestsChanged) {
    renderDisplayShelf();
    renderRequests();
  }
  updateHUD();
}

// ─── Player Actions ───────────────────────────────────────────
function clickGrowSlot(i) {
  const slot = window.G.slots[i];
  if (window.G.heldSeed && !slot) { doPlant(i); return; }
  if (window.G.heldSeed && slot)  { toast('SLOT IS OCCUPIED!', 'tw'); return; }
  window.G.sel = window.G.sel === `grow:${i}` ? null : `grow:${i}`;
  renderGrowShelf();
  renderDetail();
  updateHint();
}

function clickDisplaySlot(i) {
  window.G.sel = window.G.sel === `disp:${i}` ? null : `disp:${i}`;
  renderDisplayShelf();
  renderDetail();
}

function doPlant(i) {
  const p = ALL_PLANTS.find(x => x.id === window.G.heldSeed);
  window.G.slots[i] = {
    pid: window.G.heldSeed, planted: Date.now(),
    growProgress: 0, water: WATER_MAX, health: HEALTH_MAX,
    watered: 0, mature: false, dead: false,
  };
  window.G.heldSeed = null;
  window.G.sel = `grow:${i}`;
  saveGame(); renderAll();
  toast(`${p.name} PLANTED!`);
  log(`PLANTED ${p.name} IN GROW SLOT ${i + 1}`, 'good');
  setTip('WATER YOUR PLANT\nBEFORE IT DRIES OUT!');
}

function doWater(i) {
  const slot = window.G.slots[i];
  if (!slot) return;
  if (slot.dead)   { toast('PLANT IS DEAD!', 'te'); return; }
  if (slot.mature) { toast('MOVE TO DISPLAY SHELF!', 'tw'); return; }
  slot.water  = Math.min(WATER_MAX,  (slot.water  || 0) + WATER_REFILL);
  slot.health = Math.min(HEALTH_MAX, (slot.health || 0) + 10);
  slot.watered = (slot.watered || 0) + 1;
  saveGame(); renderGrowShelf(); renderDetail();
  toast('WATERED! +GROWTH');
  log('WATERED PLANT', 'good');
}

// Move mature plant from grow shelf → display shelf
function doMoveToDisplay(i) {
  const slot = window.G.slots[i];
  if (!slot || !slot.mature) { toast('NOT READY YET!', 'tw'); return; }
  if (!window.G.display) window.G.display = Array(DISPLAY_SLOTS).fill(null);
  const free = window.G.display.findIndex(d => !d);
  if (free === -1) { toast('DISPLAY SHELF FULL! SELL FIRST.', 'tw'); return; }
  window.G.display[free] = { ...slot, displayedAt: Date.now() };
  window.G.slots[i] = null;
  window.G.sel = `disp:${free}`;
  saveGame(); renderAll();
  const p = ALL_PLANTS.find(x => x.id === slot.pid);
  toast(`${p.name} MOVED TO DISPLAY!`);
  log(`${p.name} DISPLAYED FOR SALE`, 'good');
}

function doSellDisplay(i) {
  if (!window.G.display) return;
  const slot = window.G.display[i];
  if (!slot) return;

  const p        = ALL_PLANTS.find(x => x.id === slot.pid);
  const prevRep  = window.G.rep;
  const prevRank = getRank(prevRep);

  const matched = matchRequest(slot.pid);
  const earned  = matched ? matched.bonus : p.sell;
  const bonus   = matched ? matched.bonus - p.sell : 0;

  window.G.money  += earned;
  window.G.sold   += 1;
  window.G.earned += earned;
  window.G.rep    = (window.G.rep || 0) + p.rep;
  window.G.display[i] = null;
  window.G.sel = null;

  const newRank       = getRank(window.G.rep);
  const newlyUnlocked = ALL_PLANTS.filter(pl => pl.unlock > prevRep && pl.unlock <= window.G.rep);

  saveGame(); animateMoney(); renderAll();
  spawnCustomerAnimation(p, matched);
  spawnSellSparkles(window.innerWidth/2, 80);

  if (matched) {
    toast(`${matched.name} LOVED IT! +$${earned} (+$${bonus} BONUS!)`, 'tp');
    log(`REQUEST FILLED: ${matched.name} | +$${earned} | +${p.rep} REP`, 'rep');
    showRequestFulfilled(matched, p, earned, bonus);
  } else {
    toast(`SOLD ${p.name}! +$${p.sell} +${p.rep}★`);
    log(`SOLD ${p.name} | +$${p.sell} | +${p.rep} REP`, 'good');
  }

  if (newRank.name !== prevRank.name) {
    log(`RANK UP! NOW ${newRank.name}!`, 'rep');
    toast(`RANK UP! ${newRank.name}!`, 'tp');
  }
  if (newlyUnlocked.length) setTimeout(() => newlyUnlocked.forEach(pl => showUnlock(pl)), 400);
  setTip('GREAT SALE!\nBUY MORE SEEDS.');
}

function doClear(i) {
  window.G.slots[i] = null;
  if (window.G.sel === `grow:${i}`) window.G.sel = null;
  saveGame(); renderAll();
  toast('SLOT CLEARED.', 'tw');
  log('REMOVED DEAD PLANT', 'warn');
}

function buySeed(plantId) {
  const p   = ALL_PLANTS.find(x => x.id === plantId);
  const rep = window.G.rep || 0;
  if (rep < p.unlock) { toast('NOT UNLOCKED YET!', 'te'); return; }
  if (window.G.money < p.cost) { toast('NOT ENOUGH MONEY!', 'te'); return; }
  if (window.G.heldSeed) {
    const prev = ALL_PLANTS.find(x => x.id === window.G.heldSeed);
    window.G.money += prev.cost;
  }
  if (window.G.heldSeed === plantId) {
    window.G.heldSeed = null; toast('SEED RETURNED.');
  } else {
    window.G.money -= p.cost; window.G.heldSeed = plantId;
    toast(`${p.name} SELECTED!`);
    setTip('CLICK AN EMPTY GROW\nSLOT TO PLANT!');
  }
  saveGame(); renderAll();
}

// ─── Customer walk-in animation ───────────────────────────────
function spawnCustomerAnimation(plant, request) {
  const walkway = document.getElementById('walkway');
  if (!walkway) return;
  const emojis = ['🧑','👩','🧓','👨','🧒','👧'];
  const cust = document.createElement('div');
  cust.className = 'customer' + (request ? ' customer-happy' : '');
  cust.innerHTML = `
    <div class="cust-bubble">${request ? `"${request.msg}"` : 'NICE PLANT!'}</div>
    <div class="cust-sprite">${emojis[Math.floor(Math.random()*emojis.length)]}</div>
    <div class="cust-plant">${plant.s2}</div>
  `;
  walkway.appendChild(cust);
  setTimeout(() => cust.remove(), 4000);
}
