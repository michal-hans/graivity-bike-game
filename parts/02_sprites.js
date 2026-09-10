<script>
(function(){
'use strict';
// ============ Tunables ============
const TUNE_DEF = { g: 620, v0: 330, flip: 0.80, whip: 0.65, win: 80, boost: 2.6 };
const TUNE_META = [
  ['g',    'Grawitacja',        400, 900, 10,   'px/s²'],
  ['v0',   'Prędkość startowa', 250, 450, 5,    'px/s'],
  ['boost','Mnożnik wysokości', 1.8, 3.6, 0.1,  '× H'],
  ['flip', 'Czas backflipu',    0.5, 1.2, 0.05, 's'],
  ['whip', 'Czas tailwhipa',    0.4, 1.0, 0.05, 's'],
  ['win',  'Okno „perfect”',    40,  200, 10,   'ms'],
];
let T = Object.assign({}, TUNE_DEF);
try { Object.assign(T, JSON.parse(localStorage.getItem('dj_tune') || '{}')); } catch (e) {}

// ============ Palette (from CSS tokens) ============
const pal = { i: '#535353', l: '#8a8a8a', w: '#ffffff', bg: '#f7f7f7' };
function readPalette() {
  const cs = getComputedStyle(document.documentElement);
  pal.i = cs.getPropertyValue('--ink').trim() || pal.i;
  pal.l = cs.getPropertyValue('--ink-2').trim() || pal.l;
  pal.w = cs.getPropertyValue('--hi').trim() || pal.w;
  pal.bg = cs.getPropertyValue('--bg').trim() || pal.bg;
}

// ============ Pixel DSL ============
class Pix {
  constructor() { this.m = new Map(); }
  set(x, y, c) { this.m.set(((x | 0) + 512) * 4096 + ((y | 0) + 512), c); }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); }
  line(x0, y0, x1, y1, c, w = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const steep = Math.abs(y1 - y0) > Math.abs(x1 - x0);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      for (let k = 0; k < w; k++) { const o = k - Math.floor((w - 1) / 2); if (steep) this.set(x0 + o, y0, c); else this.set(x0, y0 + o, c); }
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  disc(cx, cy, r, c) { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.5) this.set(cx + x, cy + y, c); }
  ring(cx, cy, r, c) {
    let x = r, y = 0, d = 1 - r;
    while (x >= y) {
      for (const [a, b] of [[x, y], [y, x], [-y, x], [-x, y], [-x, -y], [-y, -x], [y, -x], [x, -y]]) this.set(cx + a, cy + b, c);
      y++; if (d < 0) d += 2 * y + 1; else { x--; d += 2 * (y - x) + 1; }
    }
  }
  text(rows, ox, oy, map) { // string art: '.' empty, other chars map to colors
    rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const ch = row[i]; if (ch !== '.' && ch !== ' ') this.set(ox + i, oy + j, map[ch] || 'i'); } });
  }
  render() {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const k of this.m.keys()) { const x = Math.floor(k / 4096) - 512, y = (k % 4096) - 512; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const cv = document.createElement('canvas'); cv.width = x1 - x0 + 1; cv.height = y1 - y0 + 1;
    const c = cv.getContext('2d');
    for (const [k, col] of this.m) { const x = Math.floor(k / 4096) - 512, y = (k % 4096) - 512; c.fillStyle = pal[col]; c.fillRect(x - x0, y - y0, 1, 1); }
    return { img: cv, x0, y0 };
  }
}
function blit(ctx, s, x, y) { ctx.drawImage(s.img, Math.round(x) + s.x0, Math.round(y) + s.y0); }

// ============ Bike (local coords: origin = ground midpoint between wheels, y up is negative) ============
function drawBike(p, spoke) {
  for (const cx of [-15, 15]) {
    p.ring(cx, -6, 6, 'i'); p.ring(cx, -6, 5, 'i'); p.disc(cx, -6, 1, 'i');
    if (spoke === 0) { p.line(cx - 4, -6, cx + 4, -6, 'l'); p.line(cx, -10, cx, -2, 'l'); }
    else { p.line(cx - 3, -9, cx + 3, -3, 'l'); p.line(cx - 3, -3, cx + 3, -9, 'l'); }
    for (const [a, b] of [[0, -7], [0, 7], [-7, 0], [7, 0], [5, 5], [-5, 5], [5, -5], [-5, -5]]) p.set(cx + a, -6 + b, 'i'); // knobs
  }
  p.line(-15, -6, -1, -9, 'i');        // chainstay
  p.line(-15, -6, -8, -16, 'i');       // seat stay
  p.line(-1, -9, -9, -17, 'i', 2);     // seat tube
  p.line(-8, -17, 10, -20, 'i');       // top tube
  p.line(-1, -9, 11, -19, 'i', 2);     // down tube
  p.line(-12, -19, -6, -19, 'i', 2);   // seat
  p.line(10, -21, 11, -18, 'i', 2);    // head tube
  p.line(11, -18, 15, -6, 'i', 2);     // fork
  p.line(10, -21, 11, -23, 'i');       // stem
  p.line(9, -23, 15, -23, 'i');        // bars
  p.rect(14, -24, 2, 2, 'i');          // grip
  p.disc(-1, -9, 2, 'i');              // chainring
  p.line(-4, -9, 2, -9, 'i');          // cranks
  p.rect(-6, -9, 2, 1, 'i'); p.rect(2, -9, 2, 1, 'i'); // pedals
}

// ============ Rider poses (joints) ============
const POSES = {
  stand:  { hip: [-5, -25], knee: [3, -18], foot: [0, -10], sh: [6, -32], head: [10, -37], hand: [12, -23] },
  crouch: { hip: [-6, -21], knee: [4, -16], foot: [0, -10], sh: [5, -28], head: [10, -32], hand: [12, -23] },
  extend: { hip: [-3, -29], knee: [1, -20], foot: [0, -10], sh: [8, -36], head: [12, -40], hand: [12, -23] },
  air:    { hip: [-5, -24], knee: [3, -17], foot: [0, -10], sh: [6, -31], head: [10, -36], hand: [12, -23] },
  flip:   { hip: [-9, -24], knee: [0, -17], foot: [0, -10], sh: [3, -32], head: [7, -36], hand: [12, -23] },
  whip:   { hip: [-1, -27], knee: [0, -19], foot: [1, -12], sh: [7, -34], head: [11, -38], hand: [12, -23] },
  down:   { hip: [-14, -4], knee: [-8, -7], foot: [-2, -4], sh: [-23, -5], head: [-28, -6], hand: [-18, -2] },
};
function drawRider(p, pose) {
  const P = POSES[pose];
  p.line(...P.hip, ...P.knee, 'i', 3);
  p.line(...P.knee, ...P.foot, 'i', 3);
  p.rect(P.foot[0] - 2, P.foot[1] - 1, 5, 2, 'i');     // boot
  p.line(...P.hip, ...P.sh, 'i', 4);                   // torso
  p.line(...P.sh, ...P.hand, 'i', 2);                  // arm
  const [hx, hy] = P.head;
  p.disc(hx, hy, 4, 'i');                              // helmet
  p.line(hx + 2, hy - 4, hx + 6, hy - 4, 'i');         // peak
  p.rect(hx + 1, hy - 2, 4, 2, 'w');                   // goggles
  p.rect(hx + 3, hy + 1, 3, 2, 'i');                   // chin bar
}

const CLOUD = [
  '.......######.......',
  '.....##......##.....',
  '....#..........#....',
  '...#............##..',
  '..#...............#.',
  '.#.................#',
  '#...................#',
  '#####################',
];

const SPR = { bike: [], rider: {}, cloud: null };
function buildSprites() {
  SPR.bike = [0, 1].map(s => { const p = new Pix(); drawBike(p, s); return p.render(); });
  for (const k in POSES) { const p = new Pix(); drawRider(p, k); SPR.rider[k] = p.render(); }
  const c = new Pix(); c.text(CLOUD, 0, 0, { '#': 'l' }); SPR.cloud = c.render();
}

// ============ Kickers ============
const KBASE = { S: 24, M: 40, L: 58 };
function vyMax(k) { return Math.sqrt(2 * T.g * k.H * T.boost); }
function rampH(k, t) { return k.H * Math.pow(t, 1.7); }
function makeKicker(type, vx, jitter = true) {
  const Hk = Math.round(KBASE[type] * (jitter ? 0.88 + Math.random() * 0.24 : 1));
  const k = { type, H: Hk };
  k.L = Math.round(Hk * 2.4 + 30);
  const Tp = 2 * vyMax(k) / T.g;
  k.gap = Math.round(0.58 * vx * Tp);
  k.lH = Math.round(Hk * 0.55);
  k.lL = Math.round(k.lH * 3 + 20);
  k.total = k.L + k.gap + k.lL;
  k.x = 0; k.img = null;
  return k;
}
function renderKicker(k) {
  const CH = k.H + 4, cv = document.createElement('canvas');
  cv.width = k.total + 2; cv.height = CH;
  const c = cv.getContext('2d'); const gy = CH - 1;
  const px = (x, y, col) => { c.fillStyle = pal[col]; c.fillRect(x, y, 1, 1); };
  // ramp
  for (let x = 0; x <= k.L; x++) {
    const h = rampH(k, x / k.L), top = Math.round(gy - h);
    px(x, top, 'i'); px(x, top + 1, 'i');
    for (let y = top + 3; y <= gy; y++) if ((x + 2 * y) % 5 === 0) px(x, y, 'i');
  }
  for (let y = Math.round(gy - k.H); y <= gy; y++) { px(k.L, y, 'i'); px(k.L + 1, y, 'i'); } // lip face
  px(k.L - 1, gy - k.H - 1, 'i'); px(k.L, gy - k.H - 1, 'i'); // lip edge
  // gap: jagged edges
  const g0 = k.L + 2, g1 = k.L + k.gap;
  for (let i = 0; i < 4; i++) { px(g0 + i, gy + 0, 'i'); px(g1 - 1 - i, gy, 'i'); }
  for (let x = g0 + 4; x < g1 - 4; x += 7) { px(x, gy + 0, 'l'); }
  // lander
  const l0 = k.L + k.gap;
  for (let y = Math.round(gy - k.lH); y <= gy; y++) { px(l0, y, 'i'); px(l0 + 1, y, 'i'); }
  for (let x = 0; x <= k.lL; x++) {
    const h = k.lH * (1 - x / k.lL), top = Math.round(gy - h);
    px(l0 + x, top, 'i'); px(l0 + x, top + 1, 'i');
    for (let y = top + 3; y <= gy; y++) if ((x + 2 * y) % 5 === 0) px(l0 + x, y, 'i');
  }
  k.img = cv;
}
