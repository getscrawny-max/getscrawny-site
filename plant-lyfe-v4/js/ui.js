// ─── Grow Shelf ───────────────────────────────────────────────
const GROW_PER_ROW = 2;

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

      if (slot) {
        const gr     = Math.round(slot.growProgress || 0);
        const water  = Math.round(slot.water  || 0);
        const health = Math.round(slot.health || 0);

        if      (ss === 'mature')  div.innerHTML += `<span class="gslot-badge badge-ready">READY!</span>`;
        else if (ss === 'dry')     div.innerHTML += `<span class="gslot-badge badge-dry">DRY!</span>`;
        else if (ss === 'thirsty') div.innerHTML += `<span class="gslot-badge badge-thirsty">THIRSTY</span>`;
        else if (ss === 'dead')    div.innerHTML += `<span class="gslot-badge badge-dead">DEAD</span>`;

        const svgWrap = document.createElement('div');
        svgWrap.className = 'gslot-svg';
        svgWrap.appendChild(drawPlantSVG(slot.pid, (slot.growProgress||0)/100, slot.dead));
        div.appendChild(svgWrap);

        const growColor  = ss==='mature' ? 'var(--amber2)' : 'var(--leaf)';
        const waterColor = water<20 ? 'var(--rust)' : water<40 ? 'var(--amber)' : 'var(--sky2)';
        const hColor     = health<30 ? 'var(--rust)' : health<60 ? 'var(--amber)' : 'var(--leaf2)';
        div.innerHTML += `
          <div class="gslot-bars">
            <div class="mini-bar"><div class="mini-fill" style="width:${gr}%;background:${growColor}"></div></div>
            <div class="mini-bar"><div class="mini-fill" style="width:${water}%;background:${waterColor}"></div></div>
            ${!slot.mature ? `<div class="mini-bar"><div class="mini-fill" style="width:${health}%;background:${hColor}"></div></div>` : ''}
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

    if (slot) {
      const p = ALL_PLANTS.find(x => x.id === slot.pid);
      if (hasReq) div.innerHTML += `<span class="disp-badge disp-badge-req">WANTED!</span>`;

      const svgWrap = document.createElement('div');
      svgWrap.className = 'disp-svg';
      svgWrap.appendChild(drawPlantSVG(slot.pid, 1.0, false));
      div.appendChild(svgWrap);

      const price = hasReq
        ? (window.G.requests.find(r => r.plantId === slot.pid && r.expiresAt > Date.now())?.bonus || p.sell)
        : p.sell;

      div.innerHTML += `<div class="disp-name">${p.name}</div>`;
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
    const price   = matched ? matched.bonus : p.sell;
    const bonus   = matched ? matched.bonus - p.sell : 0;

    head.textContent = `FOR SALE — ${p.name}`;
    body.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
        <div class="detail-svg-big"></div>
        <div>
          <div class="detail-name">${p.name}</div>
          <div class="detail-stage" style="color:var(--amber2)">MATURE · READY</div>
          <div style="font-size:5px;color:var(--muted2);margin-top:4px;line-height:1.9">${p.desc}</div>
        </div>
      </div>
      <div class="detail-chips">
        <div class="dchip"><strong>$${p.sell}</strong>BASE</div>
        <div class="dchip"><strong style="color:${matched?'var(--amber2)':'var(--muted)'}">+$${bonus}</strong>BONUS</div>
        <div class="dchip"><strong style="color:var(--amber2)">$${price}</strong>YOU GET</div>
      </div>
      ${matched ? `<div class="req-match-banner">★ ${matched.name.toUpperCase()} WANTS THIS! ★</div>` : ''}
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

    head.textContent = `GROW ${i+1} — ${p.name}`;
    body.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
        <div class="detail-svg-big"></div>
        <div>
          <div class="detail-name">${p.name}</div>
          <div class="detail-stage" style="color:${stateColors[ss]||'var(--muted2)'}">${ss.toUpperCase()}</div>
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
        <div class="dchip"><strong style="color:var(--amber)">$${p.sell}</strong>VALUE</div>
        <div class="dchip"><strong style="color:var(--dusk2)">+${p.rep}★</strong>REP</div>
        <div class="dchip"><strong style="color:var(--leaf2)">$${p.sell-p.cost}</strong>PROFIT</div>
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

  ALL_PLANTS.forEach(p => {
    const isUnlocked = rep >= p.unlock;
    const can        = isUnlocked && window.G.money >= p.cost;
    const isSel      = window.G.heldSeed === p.id;

    const div = document.createElement('div');
    div.className = 'seed-row'
      + (isUnlocked ? ' unlocked' : ' locked')
      + (isSel  ? ' sel-seed' : '')
      + (isUnlocked && !can ? ' broke' : '');

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

// ─── Customer Requests ────────────────────────────────────────
function renderRequests() {
  const el = document.getElementById('request-list');
  if (!el) return;
  const requests = window.G.requests || [];
  const now = Date.now();

  if (!requests.length) {
    el.innerHTML = `<div class="req-empty">NO CUSTOMERS RIGHT NOW.\nCHECK BACK SOON...</div>`;
    return;
  }
  el.innerHTML = '';

  requests.forEach(r => {
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
    card.className = `req-card ${urgency} ${hasOnDisplay ? 'req-fillable' : ''}`;
    card.innerHTML = `
      <div class="req-header">
        <span class="req-name" style="color:${tc[r.tier]}">${r.name}</span>
        <span class="req-timer ${remaining<60?'req-timer-urgent':''}">${mins}:${secs}</span>
      </div>
      <div class="req-msg">"${r.msg}"</div>
      <div class="req-plant">
        <span class="req-sprite">${p.s2}</span>
        <div class="req-plant-info">
          <div class="req-plant-name">${p.name}</div>
          <div class="req-pay">$${r.basePrice} <span class="req-bonus">+$${bonus} BONUS</span></div>
          <div class="req-total">PAYS $${r.bonus}</div>
        </div>
        ${hasOnDisplay ? `<div class="req-ready-badge">SELL!</div>` : ''}
      </div>`;
    el.appendChild(card);
  });
}

// ─── Rank Panel ───────────────────────────────────────────────
function renderRank() {
  const rep  = window.G.rep || 0;
  const rank = getRank(rep);
  const next = getNextRank(rep);
  const pct  = next ? Math.round(((rep-rank.rep)/(next.rep-rank.rep))*100) : 100;

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

// ─── HUD ──────────────────────────────────────────────────────
function updateHUD() {
  document.getElementById('hud-money').textContent = window.G.money;
  document.getElementById('hud-sold').textContent  = window.G.sold;
  renderRank();
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

// ─── Water ripple FX ─────────────────────────────────────────
function doWaterFx(i, event) {
  doWater(i);
  // ripple at click point inside the slot
  const slot = event.currentTarget || event.target.closest('.grow-slot');
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
