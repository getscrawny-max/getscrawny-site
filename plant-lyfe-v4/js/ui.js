// ─── Pause UI ─────────────────────────────────────────────────
function applyOuterHudMode() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('embedded')) return;
  document.documentElement.classList.add('plantlyfe-outer-hud');
  document.body?.classList.add('plantlyfe-outer-hud');
}

function postOuterHudSnapshot() {
  if (window.parent === window) return;
  const read = (selector, fallback = '—') => document.querySelector(selector)?.textContent?.trim() || fallback;
  window.parent.postMessage({
    type: 'plantlyfe:hud',
    payload: {
      active: !!window.currentUser && !!window.G,
      user: read('#hud-user'),
      money: read('#hud-money', '0'),
      rep: read('#hud-rep', '0'),
      rank: read('#rep-rank-label', 'SPROUT'),
      repNext: read('#rep-next-label', '0/10'),
      repFill: document.querySelector('#rep-fill')?.style.width || '0%',
      sold: read('#hud-sold', '0'),
      plants: read('#hud-discovery-count', '0/0'),
      pause: read('#pause-btn', 'PAUSE')
    }
  }, '*');
}

applyOuterHudMode();

function isPaused() {
  return !!window.G?.paused;
}

function updatePauseUI() {
  const paused = isPaused();
  const overlay = document.getElementById('pause-overlay');
  const btn = document.getElementById('pause-btn');
  if (overlay) {
    overlay.classList.toggle('is-open', paused);
    overlay.setAttribute('aria-hidden', paused ? 'false' : 'true');
  }
  if (btn) btn.textContent = paused ? 'RESUME' : 'PAUSE';
  document.body.classList.toggle('plantlyfe-paused', paused);
  postOuterHudSnapshot();
}

function pauseGame() {
  setPausedState(true);
  updatePauseUI();
  toast('PAUSED.', 'tw');
}

function resumeGame() {
  setPausedState(false);
  updatePauseUI();
  renderAll();
  toast('RESUMED.', 'tp');
}

function togglePause() {
  if (isPaused()) resumeGame();
  else pauseGame();
}

// ─── Grow Shelf ───────────────────────────────────────────────
const GROW_PER_ROW = 2;
const INFO_PANEL_KEYS = ['requests', 'details', 'rank', 'log'];
const INFO_PANEL_SESSION_KEY = 'plantlyfe-panel-state-v1';
const INFO_PANEL_MAX_EXPANDED = 2;
const PANEL_FLASH_MS = 2200;
const ZOGTON_PANEL_COOLDOWN_MS = {
  requestNew: 26000,
  requestUrgent: 34000,
  requestReady: 28000,
  detailWater: 32000,
  detailMature: 32000,
  detailDead: 42000,
  rank: 36000,
  log: 30000
};
const DEFAULT_INFO_PANEL_STATE = {
  requests: true,
  details: true,
  rank: false,
  log: false
};

let infoPanelExpandedOrder = [];
let infoPanelState = loadInfoPanelState();
let lastRequestIds = new Set();
let hasTrackedRequests = false;
let lastRenderedRep = null;
let hasTrackedRep = false;
let lastRequestAttention = { urgent: false, ready: false };
let lastDetailAttentionKey = '';
let zogtonPanelCommentTimes = {};

function loadInfoPanelState() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(INFO_PANEL_SESSION_KEY) || '{}');
    const next = normalizeInfoPanelState({ ...DEFAULT_INFO_PANEL_STATE, ...saved }, saved._order);
    infoPanelExpandedOrder = normalizeInfoPanelOrder(saved._order, next);
    return next;
  } catch (err) {
    const next = normalizeInfoPanelState({ ...DEFAULT_INFO_PANEL_STATE });
    infoPanelExpandedOrder = normalizeInfoPanelOrder([], next);
    return next;
  }
}

function saveInfoPanelState() {
  try {
    sessionStorage.setItem(INFO_PANEL_SESSION_KEY, JSON.stringify({
      ...infoPanelState,
      _order: infoPanelExpandedOrder
    }));
  } catch (err) {}
}

function shortPanelText(text, limit = 28) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  return clean.length > limit ? clean.slice(0, limit - 1) + '…' : clean;
}

function getExpandedPanelKeys(state = infoPanelState) {
  return INFO_PANEL_KEYS.filter(key => state[key] !== false);
}

function normalizeInfoPanelOrder(order = [], state = infoPanelState) {
  const expanded = getExpandedPanelKeys(state);
  const seen = new Set();
  const ordered = [];
  [...(Array.isArray(order) ? order : []), ...expanded].forEach(key => {
    if (!INFO_PANEL_KEYS.includes(key) || !expanded.includes(key) || seen.has(key)) return;
    seen.add(key);
    ordered.push(key);
  });
  return ordered.slice(0, INFO_PANEL_MAX_EXPANDED);
}

function normalizeInfoPanelState(state = {}, preferredOrder = []) {
  const next = { ...DEFAULT_INFO_PANEL_STATE, ...state };
  let expanded = getExpandedPanelKeys(next);

  while (expanded.length < INFO_PANEL_MAX_EXPANDED) {
    const fillKey = INFO_PANEL_KEYS.find(key => !expanded.includes(key));
    if (!fillKey) break;
    next[fillKey] = true;
    expanded.push(fillKey);
  }

  if (expanded.length > INFO_PANEL_MAX_EXPANDED) {
    const ordered = normalizeInfoPanelOrder(preferredOrder, next);
    const keep = new Set(ordered.length ? ordered : expanded.slice(0, INFO_PANEL_MAX_EXPANDED));
    INFO_PANEL_KEYS.forEach(key => {
      next[key] = keep.has(key);
    });
  }

  return next;
}

function shortTimer(seconds) {
  const safe = Math.max(0, Math.round(seconds || 0));
  const mins = Math.floor(safe / 60);
  const secs = (safe % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

function getRequestPanelSummary() {
  const requests = window.G?.requests || [];
  if (!requests.length) return 'NO CUSTOMERS';
  const now = Date.now();
  const ready = requests.filter(r => (window.G.display || []).some(d => d && d.pid === r.plantId)).length;
  const first = requests[0];
  const plant = ALL_PLANTS.find(p => p.id === first.plantId);
  const time = shortTimer((first.expiresAt - now) / 1000);
  if (ready) return `${ready} READY · ${requests.length} ACTIVE`;
  return `${requests.length} ACTIVE · ${plant ? plant.name : 'REQUEST'} · ${time}`;
}

function getDetailPanelSummary() {
  const sel = window.G?.sel;
  if (!sel) return 'NO SELECTION';

  if (sel.startsWith('disp:')) {
    const i = parseInt(sel.split(':')[1]);
    const slot = (window.G.display || [])[i];
    if (!slot) return `DISPLAY ${i + 1} EMPTY`;
    const p = ALL_PLANTS.find(x => x.id === slot.pid);
    const name = p ? plantDisplayName(p, slot) : 'PLANT';
    return shortPanelText(`${name} · READY TO SELL`, 34);
  }

  if (sel.startsWith('grow:')) {
    const i = parseInt(sel.split(':')[1]);
    const slot = window.G.slots?.[i];
    if (!slot) return `GROW ${i + 1} EMPTY`;
    const p = ALL_PLANTS.find(x => x.id === slot.pid);
    const name = p ? plantDisplayName(p, slot) : 'PLANT';
    const status = getSlotStatus(slot).toUpperCase();
    return shortPanelText(`${name} · ${status}`, 34);
  }

  return 'NO SELECTION';
}

function getRankPanelSummary() {
  const money = window.G?.money ?? 0;
  const rep = window.G?.rep || 0;
  const rank = getRank(rep);
  const next = getNextRank(rep);
  return next ? `$${money} · ${rank.name} · ${rep}/${next.rep} REP` : `$${money} · ${rank.name} · MAX`;
}

function getLogPanelSummary() {
  const first = document.querySelector('#log-box .log-entry');
  return first ? shortPanelText(first.textContent, 34) : 'NO ENTRIES';
}

function updatePanelSummaries() {
  const summaries = {
    requests: getRequestPanelSummary,
    details: getDetailPanelSummary,
    rank: getRankPanelSummary,
    log: getLogPanelSummary
  };

  INFO_PANEL_KEYS.forEach(key => {
    const el = document.querySelector(`[data-panel-summary="${key}"]`);
    if (el && summaries[key]) el.textContent = summaries[key]();
  });
}

function queuePanelSummaryUpdate() {
  window.requestAnimationFrame?.(updatePanelSummaries) || setTimeout(updatePanelSummaries, 0);
}

function getInfoPanel(key) {
  return document.querySelector(`[data-panel-key="${key}"]`);
}

function setPanelAttention(key, states = {}) {
  const panel = getInfoPanel(key);
  if (!panel) return;
  ['new', 'urgent', 'ready', 'water', 'mature', 'dead'].forEach(name => {
    panel.classList.toggle(`panel-attn-${name}`, states[name] === true);
  });
}

function flashPanel(key, className) {
  const panel = getInfoPanel(key);
  if (!panel) return;
  window.clearTimeout(panel._panelFlashTimer);
  panel.classList.remove(className);
  void panel.offsetWidth;
  panel.classList.add(className);
  panel._panelFlashTimer = window.setTimeout(() => {
    panel.classList.remove(className);
  }, PANEL_FLASH_MS);
}

function maybeZogtonPanelComment(kind, text, mood = 'idle', chance = 0.45) {
  const now = Date.now();
  const last = zogtonPanelCommentTimes[kind] || 0;
  const cooldown = ZOGTON_PANEL_COOLDOWN_MS[kind] || 30000;
  if (now - last < cooldown) return;
  if (Math.random() > chance) return;
  zogtonPanelCommentTimes[kind] = now;
  if (typeof showZogtonMessage === 'function') {
    showZogtonMessage(text, mood, { duration: 6200 });
  } else if (typeof tellZogton === 'function') {
    tellZogton(text, mood, { duration: 6200 });
  }
}

function updateRequestPanelAttention(requests = window.G?.requests || []) {
  const now = Date.now();
  const ids = new Set(requests.map(r => String(r.id)));
  const hasNew = hasTrackedRequests && requests.some(r => !lastRequestIds.has(String(r.id)));
  const urgent = requests.some(r => (r.expiresAt - now) / 1000 <= 60);
  const ready = requests.some(r => (window.G.display || []).some(d => d && d.pid === r.plantId));

  setPanelAttention('requests', { urgent, ready });
  if (hasNew) {
    flashPanel('requests', 'panel-flash-new');
    maybeZogtonPanelComment('requestNew', 'A human has requested foliage. Profitable behavior.', 'thinking', 0.55);
  }
  if (urgent && !lastRequestAttention.urgent) {
    maybeZogtonPanelComment('requestUrgent', 'Customer patience is shrinking. A fascinating Earth timer.', 'warning', 0.5);
  }
  if (ready && !lastRequestAttention.ready) {
    maybeZogtonPanelComment('requestReady', 'A requested plant is ready. Commerce window detected.', 'science', 0.55);
  }

  lastRequestIds = ids;
  lastRequestAttention = { urgent, ready };
  hasTrackedRequests = true;
}

function updateDetailPanelAttention() {
  const sel = window.G?.sel;
  const clear = () => {
    setPanelAttention('details', {});
    lastDetailAttentionKey = '';
  };
  if (!sel) { clear(); return; }

  const noteDetailAttention = nextKey => {
    if (nextKey && nextKey !== lastDetailAttentionKey) {
      if (nextKey === 'water') {
        maybeZogtonPanelComment('detailWater', 'Hydration warning. The specimen is becoming dramatic.', 'worried', 0.55);
      } else if (nextKey === 'mature') {
        maybeZogtonPanelComment('detailMature', 'Growth complete. Prepare the sales ritual.', 'celebration', 0.55);
      } else if (nextKey === 'dead') {
        maybeZogtonPanelComment('detailDead', 'Specimen loss recorded. Clear the slot and begin again.', 'worried', 0.55);
      }
    }
    lastDetailAttentionKey = nextKey || '';
  };

  if (sel.startsWith('disp:')) {
    const i = parseInt(sel.split(':')[1]);
    const slot = (window.G.display || [])[i];
    setPanelAttention('details', { mature: !!slot });
    noteDetailAttention(slot ? 'mature' : '');
    return;
  }

  if (sel.startsWith('grow:')) {
    const i = parseInt(sel.split(':')[1]);
    const slot = window.G.slots?.[i];
    if (!slot) { clear(); return; }
    const ss = getSlotStatus(slot);
    const attentionKey = ss === 'dead' ? 'dead'
      : ss === 'mature' ? 'mature'
      : (ss === 'thirsty' || ss === 'dry') ? 'water'
      : '';
    setPanelAttention('details', {
      water: ss === 'thirsty' || ss === 'dry',
      mature: ss === 'mature',
      dead: ss === 'dead'
    });
    noteDetailAttention(attentionKey);
    return;
  }

  clear();
}

function applyInfoPanelState() {
  infoPanelState = normalizeInfoPanelState(infoPanelState, infoPanelExpandedOrder);
  infoPanelExpandedOrder = normalizeInfoPanelOrder(infoPanelExpandedOrder, infoPanelState);
  const expandedKeys = getExpandedPanelKeys(infoPanelState);
  const panelDeck = document.querySelector('.info-panel');
  if (panelDeck) {
    panelDeck.classList.remove('expanded-count-0', 'expanded-count-1', 'expanded-count-2');
    panelDeck.classList.add(`expanded-count-${Math.min(expandedKeys.length, 2)}`);
    panelDeck.dataset.expandedPanels = expandedKeys.join(' ');
  }

  INFO_PANEL_KEYS.forEach(key => {
    const expanded = infoPanelState[key] !== false;
    const panel = document.querySelector(`[data-panel-key="${key}"]`);
    const btn = document.querySelector(`[data-panel-toggle="${key}"]`);
    const content = document.querySelector(`[data-panel-content="${key}"]`);
    if (panel) {
      panel.classList.toggle('is-collapsed', !expanded);
      panel.classList.toggle('is-expanded', expanded);
      const expandedIndex = infoPanelExpandedOrder.indexOf(key);
      panel.dataset.panelSlot = expanded ? String(expandedIndex + 1) : 'tab';
      panel.style.order = expanded ? String(expandedIndex + 1) : String(20 + INFO_PANEL_KEYS.indexOf(key));
    }
    if (btn) {
      btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      btn.setAttribute('aria-disabled', expanded ? 'true' : 'false');
    }
    if (content) content.hidden = !expanded;
    const caret = btn?.querySelector('.panel-caret');
    if (caret) caret.textContent = expanded ? '' : '+';
  });
  updatePanelSummaries();
}

function initInfoPanels() {
  INFO_PANEL_KEYS.forEach(key => {
    const btn = document.querySelector(`[data-panel-toggle="${key}"]`);
    if (!btn || btn.dataset.panelBound) return;
    btn.dataset.panelBound = 'true';
    btn.addEventListener('click', () => {
      const expandedKeys = normalizeInfoPanelOrder(infoPanelExpandedOrder, infoPanelState);
      const isExpanded = infoPanelState[key] !== false;

      if (isExpanded) {
        return;
      }

      if (expandedKeys.length >= INFO_PANEL_MAX_EXPANDED) {
        const collapseKey = expandedKeys[0];
        infoPanelState[collapseKey] = false;
      }
      infoPanelState[key] = true;
      infoPanelExpandedOrder = [...expandedKeys.filter(panelKey => infoPanelState[panelKey] !== false), key]
        .filter((panelKey, index, all) => all.indexOf(panelKey) === index)
        .slice(-INFO_PANEL_MAX_EXPANDED);

      infoPanelState = normalizeInfoPanelState(infoPanelState, infoPanelExpandedOrder);
      infoPanelExpandedOrder = normalizeInfoPanelOrder(infoPanelExpandedOrder, infoPanelState);
      saveInfoPanelState();
      applyInfoPanelState();
    });
  });
  applyInfoPanelState();
}

function renderGrowShelf() {
  const el = document.getElementById('grow-shelf');
  if (!el) return;
  el.innerHTML = '';

  for (let r = 0; r < SLOTS / GROW_PER_ROW; r++) {
    const row = document.createElement('div');
    row.className = 'grow-shelf-row';

    for (let c = 0; c < GROW_PER_ROW; c++) {
      const i     = r * GROW_PER_ROW + c;
      const slot  = window.G.slots[i];
      const ss    = getSlotStatus(slot);
      const isP   = !slot && window.G.heldSeed;
      const isSel = window.G.sel === `grow:${i}`;

      const div = document.createElement('div');
      div.className = 'grow-slot grow-' + (isP ? 'planting' : ss) + (isSel ? ' grow-selected' : '');
      div.dataset.growIndex = i;

      if (slot) {
        const lastStatuses = renderGrowShelf._lastStatuses || [];
        if (lastStatuses[i] && lastStatuses[i] !== ss) {
          div.classList.add('fx-stage-change');
        }
      }

      if (slot) {
        const gr     = Math.round(slot.growProgress || 0);
        const water  = Math.round(slot.water  || 0);
        const health = Math.round(slot.health || 0);
        const mutation = getMutation(slot.pid, slot.mutationId);
        if (mutation) div.classList.add('grow-mutated', mutation.className);

        if      (ss === 'mature')  div.innerHTML += `<span class="gslot-badge badge-ready">READY!</span>`;
        else if (ss === 'dry')     div.innerHTML += `<span class="gslot-badge badge-dry">DRY!</span>`;
        else if (ss === 'thirsty') div.innerHTML += `<span class="gslot-badge badge-thirsty">THIRSTY</span>`;
        else if (ss === 'dead')    div.innerHTML += `<span class="gslot-badge badge-dead">DEAD</span>`;
        if (mutation) div.innerHTML += `<span class="mutation-badge">${mutation.tag}</span>`;

        const svgWrap = document.createElement('div');
        svgWrap.className = 'gslot-svg' + (mutation ? ` mutated-plant ${mutation.className}` : '');
        svgWrap.appendChild(drawPlantSVG(slot.pid, (slot.growProgress||0)/100, slot.dead));
        div.appendChild(svgWrap);

        const growColor  = ss==='mature' ? 'var(--amber2)' : 'var(--leaf)';
        const waterColor = water<20 ? 'var(--rust)' : water<40 ? 'var(--amber)' : 'var(--sky2)';
        const hColor     = health<30 ? 'var(--rust)' : health<60 ? 'var(--amber)' : 'var(--leaf2)';
        div.innerHTML += `
          <div class="gslot-bars">
            <div class="mini-bar mini-growth" title="Growth ${gr}%"><span>G</span><div class="mini-fill" style="width:${gr}%;background:${growColor}"></div></div>
            <div class="mini-bar mini-water" title="Water ${water}%"><span>W</span><div class="mini-fill" style="width:${water}%;background:${waterColor}"></div></div>
            ${!slot.mature ? `<div class="mini-bar mini-health" title="Health ${health}%"><span>H</span><div class="mini-fill" style="width:${health}%;background:${hColor}"></div></div>` : ''}
          </div>`;
      } else if (isP) {
        div.innerHTML = `<div class="gslot-svg gslot-hint">🌱<br><span>PLANT HERE</span></div>`;
      } else {
        div.innerHTML = `<div class="gslot-svg gslot-empty">+</div>`;
      }

      div.addEventListener('click', () => clickGrowSlot(i));
      row.appendChild(div);
    }

    el.appendChild(row);
  }

  renderGrowShelf._lastStatuses = window.G.slots.map(slot => slot ? getSlotStatus(slot) : 'empty');
}

// ─── Display Shelf ────────────────────────────────────────────
function renderDisplayShelf() {
  const el = document.getElementById('display-shelf');
  if (!el) return;
  el.innerHTML = '';
  if (!window.G.display) window.G.display = Array(DISPLAY_SLOTS).fill(null);

  for (let i = 0; i < DISPLAY_SLOTS; i++) {
    const slot  = window.G.display[i];
    const isSel = window.G.sel === `disp:${i}`;
    const hasReq = slot && (window.G.requests||[]).some(r => r.plantId === slot.pid && r.expiresAt > Date.now());

    const div = document.createElement('div');
    div.className = 'disp-slot'
      + (slot ? ' disp-occupied' : ' disp-empty')
      + (isSel ? ' disp-selected' : '')
      + (hasReq ? ' disp-wanted' : '');
    div.dataset.displayIndex = i;

    if (slot) {
      const p = ALL_PLANTS.find(x => x.id === slot.pid);
      const mutation = getMutation(slot.pid, slot.mutationId);
      const displayName = plantDisplayName(p, slot);
      if (hasReq) div.innerHTML += `<span class="disp-badge disp-badge-req">WANTED!</span>`;
      if (mutation) {
        div.classList.add('disp-mutated', mutation.className);
        div.innerHTML += `<span class="mutation-badge">${mutation.tag}</span>`;
      }

      const svgWrap = document.createElement('div');
      svgWrap.className = 'disp-svg' + (mutation ? ` mutated-plant ${mutation.className}` : '');
      svgWrap.appendChild(drawPlantSVG(slot.pid, 1.0, false));
      div.appendChild(svgWrap);

      const baseSell = plantSellValue(p, slot);
      const price = hasReq
        ? baseSell + ((window.G.requests.find(r => r.plantId === slot.pid && r.expiresAt > Date.now())?.bonus || p.sell) - p.sell)
        : baseSell;

      div.innerHTML += `<div class="disp-name">${displayName}</div>`;
      div.innerHTML += `<div class="disp-price">$${price}${hasReq ? `<span class="disp-bonus">★</span>` : ''}</div>`;
    } else {
      div.innerHTML = `<div class="disp-empty-label">EMPTY</div>`;
    }

    div.addEventListener('click', () => clickDisplaySlot(i));
    el.appendChild(div);
  }
}

// ─── Detail Panel ─────────────────────────────────────────────
function renderDetail() {
  queuePanelSummaryUpdate();
  updateDetailPanelAttention();
  const head = document.getElementById('detail-head');
  const body = document.getElementById('detail-body');
  const sel  = window.G.sel;

  if (!sel) {
    head.textContent = '— SELECT A PLANT —';
    body.innerHTML = `<div class="detail-empty"><div style="font-size:30px">🪴</div><div>CLICK A GROW SLOT<br>OR DISPLAY PLANT</div></div>`;
    return;
  }

  if (sel.startsWith('disp:')) {
    const i    = parseInt(sel.split(':')[1]);
    const slot = (window.G.display || [])[i];
    if (!slot) {
      head.textContent = `DISPLAY ${i+1} — EMPTY`;
      body.innerHTML = `<div class="detail-empty"><div style="font-size:24px">🛒</div><div>MOVE A MATURE PLANT<br>FROM GROW SHELF</div></div>`;
      return;
    }
    const p       = ALL_PLANTS.find(x => x.id === slot.pid);
    const matched = (window.G.requests||[]).find(r => r.plantId === slot.pid && r.expiresAt > Date.now());
    const mutation = getMutation(slot.pid, slot.mutationId);
    const displayName = plantDisplayName(p, slot);
    const baseSell = plantSellValue(p, slot);
    const price   = matched ? baseSell + (matched.bonus - p.sell) : baseSell;
    const bonus   = matched ? matched.bonus - p.sell : 0;
    const mutationBonus = baseSell - p.sell;

    head.textContent = `FOR SALE — ${displayName}`;
    body.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
        <div class="detail-svg-big${mutation ? ` mutated-plant ${mutation.className}` : ''}"></div>
        <div>
          <div class="detail-name">${displayName}</div>
          <div class="detail-stage" style="color:var(--amber2)">${mutation ? 'RARE MUTATION · READY' : 'MATURE · READY'}</div>
          <div style="font-size:5px;color:var(--muted2);margin-top:4px;line-height:1.9">${p.desc}</div>
        </div>
      </div>
      <div class="detail-chips">
        <div class="dchip"><strong>$${p.sell}</strong>BASE</div>
        <div class="dchip"><strong style="color:${mutation?'var(--amber2)':'var(--muted)'}">+$${mutationBonus}</strong>MUTATE</div>
        <div class="dchip"><strong style="color:var(--amber2)">$${price}</strong>YOU GET</div>
      </div>
      ${matched ? `<div class="req-match-banner">★ ${matched.name.toUpperCase()} WANTS THIS! +$${bonus} REQUEST ★</div>` : ''}
      <div class="action-row">
        <button class="px-btn-sm btn-sell" onclick="doSellDisplay(${i})">★ SELL FOR $${price}</button>
      </div>`;
    const svgWrap = body.querySelector('.detail-svg-big');
    if (svgWrap) svgWrap.appendChild(drawPlantSVG(slot.pid, 1.0));
    return;
  }

  if (sel.startsWith('grow:')) {
    const i    = parseInt(sel.split(':')[1]);
    const slot = window.G.slots[i];
    if (!slot) {
      head.textContent = `GROW SLOT ${i+1} — EMPTY`;
      body.innerHTML = `<div class="detail-empty"><div style="font-size:24px">${window.G.heldSeed ? '🌱' : '+'}</div><div>${window.G.heldSeed ? 'CLICK TO PLANT HERE' : 'BUY A SEED FIRST'}</div></div>`;
      return;
    }

    const p      = ALL_PLANTS.find(x => x.id === slot.pid);
    const ss     = getSlotStatus(slot);
    const mutation = getMutation(slot.pid, slot.mutationId);
    const displayName = plantDisplayName(p, slot);
    const baseSell = plantSellValue(p, slot);
    const gr     = Math.round(slot.growProgress || 0);
    const water  = Math.round(slot.water  || 0);
    const health = Math.round(slot.health !== undefined ? slot.health : HEALTH_MAX);

    const stateColors = {
      seed:'var(--wood3)', growing:'var(--leaf2)', thirsty:'var(--amber2)',
      dry:'var(--rust2)', mature:'var(--amber2)', dead:'var(--rust2)'
    };
    const stateMsgs = {
      seed:    'JUST PLANTED — WATER SOON!',
      growing: 'GROWING NICELY.',
      thirsty: 'GETTING THIRSTY — WATER IT!',
      dry:     'CRITICALLY DRY — HEALTH DRAINING!',
      mature:  'FULLY GROWN — MOVE TO DISPLAY!',
      dead:    'THIS PLANT DIED.'
    };

    const wColor = water<20?'var(--rust)':water<40?'var(--amber)':'var(--sky2)';
    const hColor = health<30?'var(--rust)':health<60?'var(--amber)':'var(--leaf2)';
    const gColor = ss==='mature'?'var(--amber2)':'var(--leaf)';

    let btns = '';
    if (!slot.dead && !slot.mature) btns += `<button class="px-btn-sm btn-water" onclick="doWaterFx(${i}, event)">💧 WATER</button>`;
    if (slot.mature)                btns += `<button class="px-btn-sm btn-move"  onclick="doMoveToDisplay(${i})">🛒 MOVE TO DISPLAY</button>`;
    if (slot.dead)                  btns += `<button class="px-btn-sm btn-clear" onclick="doClear(${i})">✕ REMOVE</button>`;

    head.textContent = `GROW ${i+1} — ${displayName}`;
    body.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
        <div class="detail-svg-big${mutation ? ` mutated-plant ${mutation.className}` : ''}"></div>
        <div>
          <div class="detail-name">${displayName}</div>
          <div class="detail-stage" style="color:${mutation ? 'var(--amber2)' : (stateColors[ss]||'var(--muted2)')}">${mutation ? `RARE ${mutation.tag}` : ss.toUpperCase()}</div>
          <div style="font-size:5px;color:var(--muted2);margin-top:3px;line-height:2">${stateMsgs[ss]||''}</div>
        </div>
      </div>
      <div class="px-bar-label">GROWTH ${gr}%</div>
      <div class="px-bar-wrap">
        <div class="px-bar-fill" style="width:${gr}%;background:${gColor}"></div>
        <span class="px-bar-pct">${gr}%</span>
      </div>
      <div class="px-bar-label">WATER ${water}%</div>
      <div class="px-bar-wrap">
        <div class="px-bar-fill" style="width:${water}%;background:${wColor}"></div>
        <span class="px-bar-pct">${water}%</span>
      </div>
      <div class="px-bar-label">HEALTH ${health}%</div>
      <div class="px-bar-wrap" style="margin-bottom:8px">
        <div class="px-bar-fill" style="width:${health}%;background:${hColor}"></div>
        <span class="px-bar-pct">${health}%</span>
      </div>
      <div class="detail-chips">
        <div class="dchip"><strong style="color:var(--amber)">$${baseSell}</strong>VALUE</div>
        <div class="dchip"><strong style="color:var(--dusk2)">+${p.rep}★</strong>REP</div>
        <div class="dchip"><strong style="color:var(--leaf2)">$${baseSell-p.cost}</strong>PROFIT</div>
      </div>
      <div class="action-row">${btns}</div>`;

    const svgWrap = body.querySelector('.detail-svg-big');
    if (svgWrap) svgWrap.appendChild(drawPlantSVG(slot.pid, (slot.growProgress||0)/100, slot.dead));
  }
}

// ─── Seed Shop ────────────────────────────────────────────────
function renderShop() {
  const el  = document.getElementById('seed-list');
  el.innerHTML = '';
  const rep = window.G.rep || 0;
  normalizeRewardState();

  if (window.G.seedPacks.length) {
    const pack = window.G.seedPacks[0];
    const div = document.createElement('div');
    div.className = 'seed-row seed-pack-row';
    div.innerHTML = `
      <span class="seed-sprite">🎁</span>
      <div class="seed-info">
        <div class="seed-name">${pack.label}</div>
        <div class="seed-sub">FREE SEED REWARD</div>
        <span class="tier-tag">OPEN ${window.G.seedPacks.length} PACK${window.G.seedPacks.length === 1 ? '' : 'S'}</span>
      </div>
      <div class="seed-price">OPEN</div>`;
    div.addEventListener('click', openSeedPack);
    el.appendChild(div);
  }

  ALL_PLANTS.forEach(p => {
    const isUnlocked = rep >= p.unlock;
    const can        = isUnlocked && window.G.money >= p.cost;
    const isSel      = window.G.heldSeed === p.id;

    const div = document.createElement('div');
    div.className = 'seed-row'
      + (isUnlocked ? ' unlocked' : ' locked')
      + (isSel  ? ' sel-seed' : '')
      + (isUnlocked && !can ? ' broke' : '');
    div.dataset.plantId = p.id;

    if (isUnlocked) {
      div.innerHTML = `
        <span class="seed-sprite">${p.s2}</span>
        <div class="seed-info">
          <div class="seed-name">${p.name}</div>
          <div class="seed-sub">${p.desc}</div>
          <span class="tier-tag tier-${p.tier}">${p.tierName}</span>
        </div>
        <div style="text-align:right">
          <div class="seed-price">$${p.cost}</div>
          <div style="font-size:4.5px;color:var(--dusk2);margin-top:2px">+${p.rep}★ REP</div>
        </div>`;
      div.addEventListener('click', () => buySeed(p.id));
    } else {
      const needed = p.unlock - rep;
      div.innerHTML = `
        <span class="seed-sprite" style="filter:grayscale(1);opacity:.35">${p.s2}</span>
        <div class="seed-info">
          <div class="seed-name" style="color:var(--muted)">${p.name}</div>
          <div class="seed-sub">${p.desc}</div>
          <span class="tier-tag tier-${p.tier}">${p.tierName}</span>
          <div class="unlock-req">NEEDS ${p.unlock}★ REP (${needed} MORE)</div>
        </div>
        <div class="lock-badge"><span class="lock-icon">🔒</span></div>`;
    }
    el.appendChild(div);
  });
}

function openSeedPack() {
  if (isPaused()) return;
  normalizeRewardState();
  if (!window.G.seedPacks.length) return;
  if (window.G.heldSeed) {
    toast('PLANT OR RETURN HELD SEED FIRST.', 'tw');
    return;
  }
  const unlocked = ALL_PLANTS.filter(p => (window.G.rep || 0) >= p.unlock);
  const pool = unlocked.length ? unlocked : ALL_PLANTS.filter(p => p.unlock === 0);
  const plant = pool[Math.floor(Math.random() * pool.length)];
  window.G.seedPacks.shift();
  window.G.heldSeed = plant.id;
  saveGame();
  renderAll();
  toast(`SEED PACK OPENED: ${plant.name}!`, 'tp');
  log(`SEED PACK GAVE ${plant.name}`, 'rep');
}

// ─── Customer Requests ────────────────────────────────────────
function renderRequests() {
  queuePanelSummaryUpdate();
  const el = document.getElementById('request-list');
  if (!el) return;
  const requests = window.G.requests || [];
  const now = Date.now();
  updateRequestPanelAttention(requests);

  if (!requests.length) {
    el.innerHTML = `<div class="req-empty">NO CUSTOMERS RIGHT NOW.\nCHECK BACK SOON...</div>`;
    return;
  }
  el.innerHTML = '';

  requests.forEach((r, idx) => {
    const p         = ALL_PLANTS.find(x => x.id === r.plantId);
    if (!p) return;
    const remaining = Math.max(0, Math.round((r.expiresAt - now) / 1000));
    const mins      = Math.floor(remaining / 60);
    const secs      = (remaining % 60).toString().padStart(2, '0');
    const urgency   = remaining < 60 ? 'req-urgent' : remaining < 120 ? 'req-warn' : '';
    const bonus     = r.bonus - r.basePrice;
    const tc        = ['var(--leaf2)','var(--sky2)','var(--dusk2)','var(--amber2)','var(--blush2)'];
    const hasOnDisplay = (window.G.display||[]).some(d => d && d.pid === r.plantId);

    const card = document.createElement('div');
    card.className = `req-card ${idx === 0 ? 'req-active' : ''} ${urgency} ${hasOnDisplay ? 'req-fillable' : ''}`;
    card.dataset.requestId = String(r.id);
    card.dataset.expiresAt = String(r.expiresAt);
    card.innerHTML = `
      <div class="req-header">
        <span class="req-name" style="color:${tc[r.tier]}">${idx === 0 ? '<b>ACTIVE</b> ' : ''}${r.name}</span>
        <span class="req-timer ${remaining<60?'req-timer-urgent':''}" data-request-timer="${r.id}">${mins}:${secs}</span>
      </div>
      <div class="req-msg">"${r.msg}"</div>
      <div class="req-plant">
        <span class="req-sprite">${p.s2}</span>
        <div class="req-plant-info">
          <div class="req-plant-name"><span>NEED</span> ${p.name}</div>
          <div class="req-pay">BASE $${r.basePrice} <span class="req-bonus">+$${bonus} BONUS</span></div>
          <div class="req-total">PAYS $${r.bonus}</div>
        </div>
        ${hasOnDisplay ? `<div class="req-ready-badge">SELL!</div>` : ''}
      </div>`;
    el.appendChild(card);
  });
}

function refreshRequestCountdowns() {
  if (!window.G || window.G.paused) return;
  const requests = window.G.requests || [];
  if (!requests.length) {
    queuePanelSummaryUpdate();
    return;
  }

  const now = Date.now();
  requests.forEach(r => {
    const remaining = Math.max(0, Math.ceil((r.expiresAt - now) / 1000));
    const mins = Math.floor(remaining / 60);
    const secs = (remaining % 60).toString().padStart(2, '0');
    const timer = document.querySelector(`[data-request-timer="${r.id}"]`);
    const card = document.querySelector(`[data-request-id="${r.id}"]`);
    if (timer) {
      timer.textContent = `${mins}:${secs}`;
      timer.classList.toggle('req-timer-urgent', remaining < 60);
    }
    if (card) {
      card.classList.toggle('req-urgent', remaining < 60);
      card.classList.toggle('req-warn', remaining >= 60 && remaining < 120);
    }
  });

  updateRequestPanelAttention(requests);
  queuePanelSummaryUpdate();
}

// ─── Rank Panel ───────────────────────────────────────────────
function renderRank() {
  queuePanelSummaryUpdate();
  const rep  = window.G.rep || 0;
  const rank = getRank(rep);
  const next = getNextRank(rep);
  const pct  = next ? Math.round(((rep-rank.rep)/(next.rep-rank.rep))*100) : 100;
  if (hasTrackedRep && rep !== lastRenderedRep) {
    flashPanel('rank', 'panel-flash-rank');
    maybeZogtonPanelComment('rank', 'Your greenhouse status has improved.', 'happy', 0.65);
  }
  lastRenderedRep = rep;
  hasTrackedRep = true;

  document.getElementById('rank-display').innerHTML = `
    <div class="rank-name" style="color:${rank.color}">${rank.name}</div>
    <div class="rank-sub">${rank.desc}</div>
    ${next
      ? `<div class="rank-next">NEXT: <span>${next.name}</span> AT <span>${next.rep}★</span><br>PROGRESS: <span>${rep-rank.rep}/${next.rep-rank.rep} REP</span></div>`
      : `<div class="rank-next" style="color:var(--blush2)">★ MAX RANK ACHIEVED ★</div>`}`;

  document.getElementById('hud-rep').textContent        = rep;
  document.getElementById('rep-fill').style.width       = pct + '%';
  document.getElementById('rep-rank-label').textContent = rank.name;
  document.getElementById('rep-next-label').textContent = next ? `${rep}/${next.rep}` : 'MAX';
}

// ─── Plant Encyclopedia ───────────────────────────────────────
function renderEncyclopedia() {
  const grid = document.getElementById('encyclopedia-grid');
  if (!grid || !window.G) return;
  const discovered = normalizeDiscoveries();
  const found = discovered.length;
  const total = ALL_PLANTS.length;
  const pct = total ? Math.round((found / total) * 100) : 0;

  const hudCount = document.getElementById('hud-discovery-count');
  if (hudCount) hudCount.textContent = `${found}/${total}`;
  document.getElementById('encyclopedia-percent').textContent = `${pct}%`;
  document.getElementById('encyclopedia-total').textContent = `${found} / ${total}`;

  grid.innerHTML = '';
  ALL_PLANTS.forEach(p => {
    const known = discovered.includes(p.id);
    const card = document.createElement('div');
    card.className = 'encyclopedia-card' + (known ? ' discovered' : ' undiscovered');

    const art = document.createElement('div');
    art.className = 'encyclopedia-art';
    if (known) {
      art.appendChild(drawPlantSVG(p.id, 1.0, false));
    } else {
      const silhouette = document.createElement('div');
      silhouette.className = 'encyclopedia-silhouette';
      silhouette.textContent = p.s2;
      art.appendChild(silhouette);
    }

    card.appendChild(art);
    card.innerHTML += known
      ? `<div class="encyclopedia-name">${p.name}</div>
         <div class="encyclopedia-meta">${p.tierName} · $${p.sell} · +${p.rep}★</div>`
      : `<div class="encyclopedia-name">?????</div>
         <div class="encyclopedia-meta">GROW TO MATURITY</div>`;
    grid.appendChild(card);
  });
}

function openEncyclopedia() {
  renderEncyclopedia();
  const modal = document.getElementById('encyclopedia-modal');
  if (!modal) return;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeEncyclopedia() {
  const modal = document.getElementById('encyclopedia-modal');
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
}

function showNewDiscovery(plant) {
  if (!plant) return;
  const reward = grantDiscoveryReward('species', plant.id, discoveryRewardForPlant(plant));
  showDiscoveryFlash(plant, reward);
  toast(`NEW DISCOVERY: ${plant.name}!`, 'tp');
  log(`NEW DISCOVERY: ${plant.name}${reward ? ` | +$${reward.money} | +${reward.rep} REP | +${reward.packs} PACK` : ''}`, 'rep');
  saveGame();
  renderShop();
  updateHUD();
  renderEncyclopedia();
}

function showMutationFound(mutation, plant, isNewMutation = false) {
  if (!mutation || !plant) return;
  const reward = isNewMutation ? grantDiscoveryReward('mutation', mutation.id, discoveryRewardForMutation(plant, mutation)) : null;
  showMutationFlash(mutation, plant, reward);
  toast(`RARE MUTATION: ${mutation.name}!`, 'tp');
  log(`RARE MUTATION: ${mutation.name}${reward ? ` | +$${reward.money} | +${reward.rep} REP | +${reward.packs} PACKS` : ''}`, 'rep');
  if (typeof showZogtonMessage === 'function') showZogtonMessage(`${mutation.name}! Rare genetic sparkle detected.`, 'shocked', {
    important: true,
    duration: 11000,
  });
  saveGame();
  renderShop();
  updateHUD();
  renderGrowShelf();
  renderDetail();
}

function flushDiscoveryNotifications() {
  const ids = window.pendingDiscoveries || [];
  window.pendingDiscoveries = [];
  ids.forEach(id => showNewDiscovery(ALL_PLANTS.find(p => p.id === id)));
}

function flushMutationNotifications() {
  const pending = window.pendingMutations || [];
  window.pendingMutations = [];
  pending.forEach(item => {
    const plant = ALL_PLANTS.find(p => p.id === item.pid);
    const mutation = getMutation(item.pid, item.mutationId);
    showMutationFound(mutation, plant, item.isNew);
  });
}

// ─── HUD ──────────────────────────────────────────────────────
function updateHUD() {
  document.getElementById('hud-money').textContent = window.G.money;
  document.getElementById('hud-sold').textContent  = window.G.sold;
  updateRequestPanelAttention();
  renderRank();
  renderEncyclopedia();
  postOuterHudSnapshot();
}

function animateMoney() {
  const el = document.getElementById('hud-money');
  el.textContent = window.G.money;
  el.classList.remove('money-pop');
  void el.offsetWidth;
  el.classList.add('money-pop');
}

function updateHint() {
  const h = document.getElementById('shelf-hint');
  if (window.G.heldSeed) {
    const p = ALL_PLANTS.find(x => x.id === window.G.heldSeed);
    h.textContent = `[${p.name} — CLICK EMPTY SLOT]`;
    return;
  }
  if (window.G.sel && window.G.sel.startsWith('grow:')) {
    const i  = parseInt(window.G.sel.split(':')[1]);
    const ss = getSlotStatus(window.G.slots[i]);
    const msgs = {
      mature:'[MOVE TO DISPLAY!]', thirsty:'[WATER IT!]',
      dry:'[CRITICALLY DRY!]', dead:'[REMOVE PLANT]'
    };
    h.textContent = msgs[ss] || '[INSPECTING]';
    return;
  }
  h.textContent = 'SELECT A SLOT';
}

// ─── Tiny action FX hooks ─────────────────────────────────────
function addFx(el, cls, ms=700) {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}

function playSeedBuyFx(plantId) {
  addFx(document.querySelector(`.seed-row[data-plant-id="${plantId}"]`), 'fx-buy-seed', 650);
  addFx(document.querySelector('.panel-left'), 'fx-shop-pulse', 650);
}

function playPlantFx(i) {
  addFx(document.querySelector(`.grow-slot[data-grow-index="${i}"]`), 'fx-plant-pop', 760);
  addFx(document.querySelector('.grow-shelf'), 'fx-shelf-pulse', 760);
}

function playWaterFx(i) {
  addFx(document.querySelector(`.grow-slot[data-grow-index="${i}"]`), 'fx-watered', 720);
}

function playDisplayMoveFx(i) {
  addFx(document.querySelector(`.disp-slot[data-display-index="${i}"]`), 'fx-display-stocked', 760);
  addFx(document.querySelector('.display-shelf-wrap'), 'fx-shelf-pulse', 760);
}

function playSellFx() {
  addFx(document.querySelector('.display-shelf-wrap'), 'fx-sold-shelf', 720);
  addFx(document.querySelector('.hud'), 'fx-sale-hud', 720);
}

function playRequestCompleteFx() {
  addFx(document.querySelector('.info-panel > .info-section:first-child'), 'fx-request-complete', 850);
  addFx(document.querySelector('#rank-display'), 'fx-rank-pop', 850);
}

// ─── Water ripple FX ─────────────────────────────────────────
function doWaterFx(i, event) {
  const before = window.G?.slots?.[i]?.watered || 0;
  doWater(i);
  const after = window.G?.slots?.[i]?.watered || 0;
  if (after === before) return;
  playWaterFx(i);
  // ripple on the plant slot, even when watering from the detail panel button
  const slot = document.querySelector(`.grow-slot[data-grow-index="${i}"]`);
  if (slot) {
    const ripple = document.createElement('div');
    ripple.className = 'water-ripple';
    ripple.style.left = '50%';
    ripple.style.top  = '40%';
    slot.appendChild(ripple);
    setTimeout(() => ripple.remove(), 700);
  }
}

// ─── Sell sparkle FX ─────────────────────────────────────────
function spawnSellSparkles(x, y) {
  const emojis = ['✨','⭐','💰','🌟','💫'];
  emojis.forEach((e, i) => {
    const el = document.createElement('div');
    el.className = 'sparkle';
    el.textContent = e;
    el.style.left = (x + (Math.random()-0.5)*60) + 'px';
    el.style.top  = (y + (Math.random()-0.5)*40) + 'px';
    el.style.animationDelay = (i * 0.08) + 's';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  });
}

// ─── Unlock splash ────────────────────────────────────────────
function showUnlock(plant) {
  const div = document.createElement('div');
  div.className = 'unlock-flash';
  div.innerHTML = `
    <div class="unlock-box">
      <div class="unlock-title">★ UNLOCKED ★</div>
      <div class="unlock-plant">${plant.s2}</div>
      <div class="unlock-desc">${plant.name} IS NOW IN THE SHOP!\n${plant.desc}</div>
    </div>`;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 2800);
  log(`UNLOCKED: ${plant.name}!`, 'rep');
}

function showRequestFulfilled(req, plant, earned, bonus) {
  const div = document.createElement('div');
  div.className = 'unlock-flash';
  div.style.background = 'rgba(45,35,10,.65)';
  div.innerHTML = `
    <div class="unlock-box" style="border-color:var(--amber2)">
      <div class="unlock-title" style="color:var(--amber2)">★ REQUEST FILLED! ★</div>
      <div class="unlock-plant">${plant.s2}</div>
      <div class="unlock-desc">${req.name} IS DELIGHTED!\nEARNED $${earned}\n(+$${bonus} BONUS CASH)</div>
    </div>`;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 2800);
}

function rewardLine(reward) {
  if (!reward) return 'REWARD ALREADY CLAIMED.';
  return `+$${reward.money} CASH\n+${reward.rep} REP\n+${reward.packs} ${reward.label}${reward.packs === 1 ? '' : 'S'}`;
}

function showDiscoveryFlash(plant, reward) {
  const div = document.createElement('div');
  div.className = 'unlock-flash discovery-flash';
  div.innerHTML = `
    <div class="unlock-box discovery-box">
      <div class="unlock-title">★ NEW DISCOVERY ★</div>
      <div class="unlock-plant">${plant.s2}</div>
      <div class="unlock-desc">${plant.name} RECORDED IN THE ENCYCLOPEDIA.\n${rewardLine(reward)}</div>
    </div>`;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 2800);
}

function showMutationFlash(mutation, plant, reward) {
  const div = document.createElement('div');
  div.className = 'unlock-flash mutation-flash';
  div.innerHTML = `
    <div class="unlock-box mutation-box">
      <div class="unlock-title">★ RARE MUTATION ★</div>
      <div class="unlock-plant">${plant.s2}</div>
      <div class="unlock-desc">${mutation.name} APPEARED!\nSELL VALUE x${mutation.multiplier.toFixed(1)}\n${rewardLine(reward)}</div>
    </div>`;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 2800);
}

// ─── Log ──────────────────────────────────────────────────────
function log(msg, type='') {
  const el  = document.getElementById('log-box');
  if (!el) return;
  const now = new Date();
  const ts  = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
  const div = document.createElement('div');
  div.className   = 'log-entry' + (type ? ' ' + type : '');
  div.textContent = `[${ts}] ${msg}`;
  el.insertBefore(div, el.firstChild);
  while (el.children.length > 60) el.removeChild(el.lastChild);
  updatePanelSummaries();
  flashPanel('log', 'panel-flash-log');
  maybeZogtonPanelComment('log', 'I have recorded this event for science.', 'science', 0.28);
}

function setTip(t) { /* removed in v3+ layout */ }

// ─── Toast ────────────────────────────────────────────────────
function toast(msg, cls='') {
  const el = document.createElement('div');
  el.className   = 'toast' + (cls ? ' ' + cls : '');
  el.textContent = '> ' + msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3100);
}

// ─── Render All ───────────────────────────────────────────────
function renderAll() {
  renderGrowShelf();
  renderDisplayShelf();
  renderDetail();
  renderShop();
  renderRank();
  renderRequests();
  updateHUD();
  updateHint();
  initInfoPanels();
}

// ─── Login ────────────────────────────────────────────────────
function renderLoginSaved() {
  const sec   = document.getElementById('saved-section');
  const users = allUsers();
  if (!users.length) {
    sec.innerHTML = '<div class="saved-label">NO SAVED GAMES YET.</div>';
    return;
  }
  sec.innerHTML = `<div class="saved-label">CONTINUE AS:</div><div class="saved-users" id="user-chips"></div>`;
  const chips = document.getElementById('user-chips');
  users.forEach(u => {
    const rank = getRank(u.data.rep || 0);
    const div  = document.createElement('div');
    div.className = 'user-chip';
    div.innerHTML = `
      <span class="user-chip-name">${u.name.toUpperCase()}</span>
      <span class="user-chip-info">$${u.data.money||0} · ${rank.name} · ${u.data.sold||0} SOLD</span>
      <span class="user-del" title="Delete save">✕</span>`;
    div.querySelector('.user-chip-name').addEventListener('click', () => startGame(u.name));
    div.querySelector('.user-chip-info').addEventListener('click', () => startGame(u.name));
    div.querySelector('.user-del').addEventListener('click', e => {
      e.stopPropagation();
      localStorage.removeItem(userKey(u.name));
      renderLoginSaved();
    });
    chips.appendChild(div);
  });
}

initInfoPanels();
