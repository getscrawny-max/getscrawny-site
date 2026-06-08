// ─── Global State ─────────────────────────────────────────────
window.currentUser = null;
window.G           = null;
window.ticker      = null;

// ─── Start / Stop Game ────────────────────────────────────────
function startGame(name) {
  window.currentUser = name.trim();
  window.G           = loadUser(window.currentUser);
  window.G.username  = window.currentUser;
  window.G.lastTick  = window.G.lastTick || Date.now();
  window.G.rep       = window.G.rep || 0;
  if (!window.G.display) window.G.display = Array(DISPLAY_SLOTS).fill(null);
  normalizePauseState();
  normalizeRewardState();
  normalizeDiscoveries();

  if (!window.G.paused) catchUp();
  const syncedDiscoveries = syncDiscoveriesFromState();
  if (syncedDiscoveries.length) {
    window.pendingDiscoveries = (window.pendingDiscoveries || []).concat(syncedDiscoveries);
  }
  maybeSpawnInitialRequest();
  saveGame();

  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('game-screen').style.display  = 'flex';
  document.getElementById('hud-user').textContent        = window.currentUser.toUpperCase();

  renderAll();
  updatePauseUI();
  flushMutationNotifications();
  flushDiscoveryNotifications();
  if (typeof startZogtonGuide === 'function') startZogtonGuide();

  if (window.ticker) clearInterval(window.ticker);
  window.ticker = setInterval(gameTick, TICK_MS);

  log(`WELCOME BACK, ${window.currentUser.toUpperCase()}!`, 'good');
}

function logout() {
  saveGame();
  if (window.ticker) clearInterval(window.ticker);
  window.ticker      = null;
  window.currentUser = null;
  window.G           = null;

  document.getElementById('game-screen').style.display  = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('name-input').value = '';

  renderLoginSaved();
}

// ─── Events ───────────────────────────────────────────────────
document.getElementById('play-btn').addEventListener('click', () => {
  const val = document.getElementById('name-input').value.trim();
  if (!val) { document.getElementById('name-input').focus(); return; }
  startGame(val);
});
document.getElementById('name-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('play-btn').click();
});
document.getElementById('logout-btn').addEventListener('click', logout);
document.getElementById('pause-btn').addEventListener('click', togglePause);
document.getElementById('pause-resume-btn').addEventListener('click', resumeGame);
document.getElementById('encyclopedia-btn').addEventListener('click', openEncyclopedia);
document.getElementById('encyclopedia-close').addEventListener('click', closeEncyclopedia);
document.getElementById('encyclopedia-modal').addEventListener('click', e => {
  if (e.target.id === 'encyclopedia-modal') closeEncyclopedia();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeEncyclopedia();
});
window.addEventListener('beforeunload', saveGame);

// ─── Boot ─────────────────────────────────────────────────────
renderLoginSaved();
