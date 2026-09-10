// ============ Game state ============
const W = 720, H = 300, GY = 262, PX = 130;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const S = {};
let hi = 0; try { hi = +localStorage.getItem('dj_hi') || 0; } catch (e) {}
let tut = 0; try { tut = +localStorage.getItem('dj_tut') || 0; } catch (e) {}
function saveTut(n) { if (n > tut) { tut = n; try { localStorage.setItem('dj_tut', tut); } catch (e) {} } }
const TUT_TEXT = ['KLIK TUŻ PRZED WIERZCHOŁKIEM', '2× KLIK = BACKFLIP', '3× KLIK = TAILWHIP', 'DUŻY KICKER = MIEJSCE NA 2 TRIKI'];

function resetGame() {
  Object.assign(S, {
    state: 'idle', time: 0, dist: 0, vx: T.v0, score: 0, pending: 0,
    hgt: 0, vy: 0, angle: 0, onGround: true, tr: null,
    launch: null, trick: null, lastClick: null, jumpTricks: [],
    landT: 0, launchT: 0, wheel: 0, kickers: [], clouds: [], floaters: [],
    nextK: 0, nSpawn: 0, cleared: 0, reason: '', overT: 0, hintPulse: 0, shownHint3: false,
  });
  S.nextK = 520;
  for (let i = 0; i < 3; i++) S.clouds.push({ x: 200 + i * 260 + Math.random() * 120, y: 40 + Math.random() * 90 });
}

function spawnKickers() {
  while (S.nextK < S.dist + W + 300) {
    const n = S.nSpawn, r = Math.random();
    const type = n < 3 ? 'S' : n < 7 ? (r < 0.5 ? 'S' : 'M') : (r < 0.25 ? 'S' : r < 0.7 ? 'M' : 'L');
    const k = makeKicker(type, S.vx); k.x = S.nextK; renderKicker(k);
    S.kickers.push(k); S.nSpawn++;
    const flat = Math.max(220, 620 - n * 12) * (0.75 + Math.random() * 0.5);
    S.nextK = k.x + k.total + Math.round(flat);
  }
  S.kickers = S.kickers.filter(k => k.x + k.total > S.dist - 200);
}

function terrain(wx) {
  for (const k of S.kickers) {
    if (wx < k.x || wx >= k.x + k.total) continue;
    const r = wx - k.x;
    if (r < k.L) { const t = r / k.L; return { h: rampH(k, t), slope: 1.7 * k.H * Math.pow(t, 0.7) / k.L, kind: 'ramp', k, t }; }
    if (r < k.L + k.gap) return { h: -Infinity, slope: 0, kind: 'gap', k };
    const u = (r - k.L - k.gap) / k.lL; return { h: k.lH * (1 - u), slope: -k.lH / k.lL, kind: 'lander', k, u };
  }
  return { h: 0, slope: 0, kind: 'flat', k: null };
}

// ============ Scoring / events ============
function floater(text, dy = -50) { S.floaters.push({ text, x: PX, y: GY - S.hgt + dy, t: 0 }); }
const readout = document.getElementById('readout');
function quality(dtLip) {
  const win = T.win / 1000, far = win + 0.32;
  if (dtLip <= win) return 1;
  if (dtLip >= far) return 0.35;
  return 1 - 0.65 * Math.pow((dtLip - win) / (far - win), 0.9);
}
function rate(q, dtLip) {
  let txt = q >= 0.97 ? 'PERFECT +50' : q >= 0.7 ? 'DOBRZE' : 'ZA WCZEŚNIE';
  if (q >= 0.97) S.pending += 50;
  floater(txt, -58);
  if (q >= 0.7) saveTut(1);
  const k = S.launch && S.launch.k;
  const air = k ? (2 * S.vy / T.g) : (2 * S.vy / T.g);
  readout.innerHTML = `Ostatnie wybicie: jakość <b>${q.toFixed(2)}</b> · ${Math.round(dtLip * 1000)} ms przed wierzchołkiem<br>`
    + (k ? `kicker ${k.type} (H ${k.H} px, dziura ${k.gap} px) · ` : 'bunny hop · ')
    + `czas lotu ok. ${air.toFixed(2)} s · prędkość ${Math.round(S.vx)} px/s`;
}
function launch(q, k, dtLip) {
  S.onGround = false; S.vy = q * vyMax(k); S.launchT = 0;
  S.launch = { k, clicked: true, q, tLip: S.time + dtLip };
  S.jumpTricks = []; S.lastClick = null;
  rate(q, dtLip);
}
function finishTrick(sketchy) {
  const t = S.trick; const base = t.type === 'flip' ? 100 : 150;
  const pts = Math.round(base * (S.jumpTricks.length + 1) * (sketchy ? 0.5 : 1));
  S.jumpTricks.push(t.type); S.pending += pts;
  floater((t.type === 'flip' ? 'BACKFLIP' : 'TAILWHIP') + (sketchy ? ' (KRZYWO)' : '') + ' +' + pts, -62);
  saveTut(t.type === 'flip' ? 2 : 3);
  if (S.jumpTricks.length >= 2) saveTut(4);
  S.trick = null; S.angle = 0;
}
function land(tr) {
  if (S.trick) { if (S.trick.p < 0.85) { crash('TRIK NIEDOKOŃCZONY'); return; } finishTrick(true); }
  S.onGround = true; S.hgt = tr.h; S.vy = 0; S.angle = -Math.atan(tr.slope); S.landT = 0.15;
  S.score += S.pending; S.pending = 0;
  if (S.launch && S.launch.k && (tr.kind === 'lander' || tr.kind === 'flat')) { S.vx = Math.min(520, S.vx + 6); S.cleared++; }
  S.launch = null; S.lastClick = null;
}
function crash(reason) {
  S.state = 'over'; S.reason = reason; S.overT = 0; S.trick = null;
  if (S.score > hi) { hi = Math.floor(S.score); try { localStorage.setItem('dj_hi', hi); } catch (e) {} }
}

// ============ Input ============
function click() {
  if (S.state === 'idle') { S.state = 'run'; return; }
  if (S.state === 'over') { if (S.overT > 0.45) { resetGame(); S.state = 'run'; } return; }
  const now = S.time, tr = terrain(S.dist);
  if (S.onGround) {
    if (tr.kind === 'ramp') { const dtLip = (tr.k.x + tr.k.L - S.dist) / S.vx; launch(quality(dtLip), tr.k, dtLip); }
    else { // bunny hop
      S.onGround = false; S.vy = Math.sqrt(2 * T.g * 34); S.launchT = 0; S.launch = { k: null, clicked: true, q: 0, tLip: 0 }; S.jumpTricks = []; S.lastClick = null;
      readout.innerHTML = `Bunny hop: wysokość 34 px, czas lotu ${(2 * S.vy / T.g).toFixed(2)} s · prędkość ${Math.round(S.vx)} px/s`;
    }
    return;
  }
  // airborne
  if (S.launch && !S.launch.clicked && now - S.launch.tLip < 0.07) { // late click right after the lip
    S.launch.clicked = true; S.launch.q = 0.9; S.vy = Math.max(S.vy, 0.9 * vyMax(S.launch.k)); rate(0.9, 0); return;
  }
  if (S.trick) {
    if (S.trick.type === 'flip' && now - S.trick.t0 < 0.3) S.trick = { type: 'whip', p: 0, dur: T.whip, t0: S.trick.t0 };
    return;
  }
  if (S.lastClick != null && now - S.lastClick < 0.3) { S.trick = { type: 'flip', p: 0, dur: T.flip, t0: now }; S.lastClick = null; }
  else S.lastClick = now;
}
canvas.addEventListener('pointerdown', e => { e.preventDefault(); canvas.focus({ preventScroll: true }); click(); });
window.addEventListener('keydown', e => {
  if (e.repeat) return;
  if (e.code === 'Space' || e.code === 'ArrowUp') { if (e.target === document.body || e.target === canvas) { e.preventDefault(); click(); } }
});

// ============ Update ============
function update(dt) {
  S.time += dt; S.hintPulse += dt;
  for (const f of S.floaters) f.t += dt;
  S.floaters = S.floaters.filter(f => f.t < 1.2);
  if (S.state === 'over') { S.overT += dt; return; }
  if (S.state !== 'run') return;
  S.dist += S.vx * dt; S.score += S.vx * dt / 45; S.wheel += S.vx * dt;
  if (S.landT > 0) S.landT -= dt; S.launchT += dt;
  for (const c of S.clouds) { c.x -= S.vx * dt * 0.3; if (c.x < -60) { c.x = W + 40 + Math.random() * 200; c.y = 40 + Math.random() * 90; } }
  spawnKickers();
  const tr = terrain(S.dist); S.tr = tr;
  if (S.onGround) {
    if (tr.kind === 'gap') { // rolled off the lip without pumping
      const k = tr.k; S.onGround = false; S.vy = 0.35 * vyMax(k); S.hgt = k.H; S.launchT = 0;
      S.launch = { k, clicked: false, q: 0.35, tLip: S.time }; S.jumpTricks = []; S.lastClick = null;
    } else { S.hgt = tr.h; S.angle = -Math.atan(tr.slope); }
  } else {
    S.vy -= T.g * dt; S.hgt += S.vy * dt;
    if (S.trick) { S.trick.p += dt / S.trick.dur; if (S.trick.p >= 1) finishTrick(false); }
    if (S.trick && S.trick.type === 'flip') S.angle = -2 * Math.PI * S.trick.p;
    else S.angle += (0 - S.angle) * Math.min(1, dt * 4);
    if (S.launch && !S.launch.clicked && S.time - S.launch.tLip > 0.07 && !S.launch.rated) { S.launch.rated = true; floater('BEZ WYBICIA', -58); }
    if (tr.kind === 'gap') { if (S.hgt <= 0) crash('DZIURA!'); }
    else if (S.hgt <= tr.h) { if (tr.h - S.hgt > 10) crash('ZA NISKO — CASE'); else land(tr); }
  }
}
