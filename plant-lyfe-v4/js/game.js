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

function tryMutateSlot(slot, p) {
  if (!slot || slot.dead || slot.mature || slot.mutationChecked || slot.mutationId) return null;
  if ((slot.growProgress || 0) < MUTATION_ROLL_AT) return null;
  slot.mutationChecked = true;
  const mutation = getMutation(p.id);
  if (!mutation || Math.random() >= MUTATION_CHANCE) return null;
  slot.mutationId = mutation.id;
  return mutation;
}

// ─── Time Simulation ──────────────────────────────────────────
function applyTimeToSlot(slot, p, dtSec) {
  if (slot.mature || slot.dead) return;
  const eff = dtSec * (slot.water > 10 ? 1.0 : 0.3);
  slot.growProgress = Math.min(100, (slot.growProgress || 0) + (eff / p.growSec) * 100);
  tryMutateSlot(slot, p);
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
  const discoveries = [];
  const mutations = [];
  window.G.slots.forEach(slot => {
    if (!slot || slot.dead || slot.mature) return;
    const p = ALL_PLANTS.find(x => x.id === slot.pid);
    if (p) {
      applyTimeToSlot(slot, p, dt);
      if (slot.mutationId && !slot._notifyMutation) {
        slot._notifyMutation = true;
        mutations.push({ pid: p.id, mutationId: slot.mutationId, isNew: markMutationDiscovered(slot.mutationId) });
      }
      if (slot.mature && markPlantDiscovered(p.id)) discoveries.push(p.id);
    }
  });
  if (discoveries.length) window.pendingDiscoveries = (window.pendingDiscoveries || []).concat(discoveries);
  if (mutations.length) window.pendingMutations = (window.pendingMutations || []).concat(mutations);
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
    if (slot.mutationId && !slot._notifyMutation) {
      slot._notifyMutation = true;
      notify.push({ mutation: getMutation(p.id, slot.mutationId), plant: p, isNewMutation: markMutationDiscovered(slot.mutationId) });
    }
    if (slot.mature && !slot._notifyMature) {
      slot._notifyMature = true;
      notify.push({ msg: `${p.name} READY! MOVE TO DISPLAY.`, t: '', i });
      if (markPlantDiscovered(p.id)) notify.push({ discovery: p });
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
    if (n.mutation) {
      showMutationFound(n.mutation, n.plant, n.isNewMutation);
      return;
    }
    if (n.discovery) {
      showNewDiscovery(n.discovery);
      return;
    }
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
  playPlantFx(i);
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
  playDisplayMoveFx(free);
  const p = ALL_PLANTS.find(x => x.id === slot.pid);
  const displayName = plantDisplayName(p, slot);
  toast(`${displayName} MOVED TO DISPLAY!`);
  log(`${displayName} DISPLAYED FOR SALE`, 'good');
}

function doSellDisplay(i) {
  if (!window.G.display) return;
  const slot = window.G.display[i];
  if (!slot) return;

  const p        = ALL_PLANTS.find(x => x.id === slot.pid);
  const prevRep  = window.G.rep;
  const prevRank = getRank(prevRep);

  const matched = matchRequest(slot.pid);
  const baseSell = plantSellValue(p, slot);
  const earned  = matched ? baseSell + (matched.bonus - p.sell) : baseSell;
  const bonus   = matched ? matched.bonus - p.sell : 0;
  const displayName = plantDisplayName(p, slot);

  window.G.money  += earned;
  window.G.sold   += 1;
  window.G.earned += earned;
  window.G.rep    = (window.G.rep || 0) + p.rep;
  window.G.display[i] = null;
  window.G.sel = null;

  const newRank       = getRank(window.G.rep);
  const newlyUnlocked = ALL_PLANTS.filter(pl => pl.unlock > prevRep && pl.unlock <= window.G.rep);

  saveGame(); animateMoney(); renderAll();
  playSellFx();
  spawnCustomerAnimation({ ...p, name: displayName }, matched);
  spawnSellSparkles(window.innerWidth/2, 80);

  if (matched) {
    playRequestCompleteFx();
    toast(`${matched.name} LOVED IT! +$${earned} (+$${bonus} BONUS!)`, 'tp');
    log(`REQUEST FILLED: ${matched.name} | +$${earned} | +${p.rep} REP`, 'rep');
    showRequestFulfilled(matched, { ...p, name: displayName }, earned, bonus);
  } else {
    toast(`SOLD ${displayName}! +$${earned} +${p.rep}★`);
    log(`SOLD ${displayName} | +$${earned} | +${p.rep} REP`, 'good');
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
  let boughtSeed = false;
  if (window.G.heldSeed) {
    const prev = ALL_PLANTS.find(x => x.id === window.G.heldSeed);
    window.G.money += prev.cost;
  }
  if (window.G.heldSeed === plantId) {
    window.G.heldSeed = null; toast('SEED RETURNED.');
  } else {
    window.G.money -= p.cost; window.G.heldSeed = plantId;
    boughtSeed = true;
    toast(`${p.name} SELECTED!`);
    setTip('CLICK AN EMPTY GROW\nSLOT TO PLANT!');
  }
  saveGame(); renderAll();
  if (boughtSeed) playSeedBuyFx(plantId);
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
