// ============ Panel: sliders ============
const tuneEl = document.getElementById('tune');
function saveTune() { try { localStorage.setItem('dj_tune', JSON.stringify(T)); } catch (e) {} }
function fmt(key, v) { return key === 'flip' || key === 'whip' ? v.toFixed(2) : key === 'boost' ? v.toFixed(1) : String(Math.round(v)); }
function buildTune() {
  tuneEl.innerHTML = '';
  for (const [key, label, min, max, step, unit] of TUNE_META) {
    const id = 'tune-' + key;
    const lab = document.createElement('label'); lab.htmlFor = id; lab.textContent = label;
    const inp = document.createElement('input'); inp.type = 'range'; inp.id = id; inp.min = min; inp.max = max; inp.step = step; inp.value = T[key];
    const out = document.createElement('output'); out.htmlFor = id; out.textContent = fmt(key, T[key]) + ' ' + unit;
    inp.addEventListener('input', () => { T[key] = +inp.value; out.textContent = fmt(key, T[key]) + ' ' + unit; if (S.state === 'idle') S.vx = T.v0; saveTune(); buildKickerPanel(); });
    tuneEl.append(lab, inp, out);
  }
}
document.getElementById('reset').addEventListener('click', () => { T = Object.assign({}, TUNE_DEF); saveTune(); buildTune(); buildKickerPanel(); if (S.state === 'idle') S.vx = T.v0; });

// ============ Panel: sprite gallery ============
const FRAMES = [
  ['Jazda', (c, t) => { const b = SPR.bike[Math.floor(t * 8) % 2]; c.drawImage(b.img, b.x0, b.y0); blit(c, SPR.rider.stand, 0, 0); }],
  ['Najazd (crouch)', c => { const b = SPR.bike[0]; c.save(); c.translate(0, -14); c.rotate(-0.42); c.translate(0, 14); c.drawImage(b.img, b.x0, b.y0); blit(c, SPR.rider.crouch, 0, 0); c.restore(); }],
  ['Wybicie (extend)', c => { const b = SPR.bike[0]; c.save(); c.translate(0, -14); c.rotate(-0.25); c.translate(0, 14); c.drawImage(b.img, b.x0, b.y0); blit(c, SPR.rider.extend, 0, 0); c.restore(); }],
  ['Lot', c => { const b = SPR.bike[1]; c.drawImage(b.img, b.x0, b.y0); blit(c, SPR.rider.air, 0, 0); }],
  ['Backflip 2×', (c, t) => { const b = SPR.bike[0]; const p = (t / 1.6) % 1; c.save(); c.translate(0, -16); c.rotate(-2 * Math.PI * p); c.translate(0, 16); c.drawImage(b.img, b.x0, b.y0); blit(c, SPR.rider.flip, 0, 0); c.restore(); }],
  ['Tailwhip 3×', (c, t) => { const b = SPR.bike[0]; const phi = 2 * Math.PI * ((t / 1.4) % 1); let k = Math.cos(phi); if (Math.abs(k) < 0.06) k = k < 0 ? -0.06 : 0.06;
    const drawB = () => { c.save(); c.translate(12, -23); c.scale(k, 1); c.rotate(0.35 * Math.sin(phi)); c.translate(-12, 23); c.drawImage(b.img, b.x0, b.y0); c.restore(); };
    if (Math.sin(phi) > 0) { drawB(); blit(c, SPR.rider.whip, 0, 0); } else { blit(c, SPR.rider.whip, 0, 0); drawB(); } }],
  ['Crash', c => { const b = SPR.bike[0]; c.save(); c.translate(20, -12); c.rotate(-1.75); c.translate(0, 13); c.drawImage(b.img, b.x0, b.y0); c.restore(); blit(c, SPR.rider.down, 0, 0); }],
];
const galleryCtx = [];
function buildGallery() {
  const g = document.getElementById('gallery'); g.innerHTML = ''; galleryCtx.length = 0;
  for (const [label, fn] of FRAMES) {
    const wrap = document.createElement('div'); wrap.className = 'frame';
    const cv = document.createElement('canvas'); cv.width = 75 * 3; cv.height = 70 * 3;
    const sp = document.createElement('span'); sp.textContent = label; wrap.append(cv, sp); g.append(wrap);
    galleryCtx.push([cv.getContext('2d'), fn]);
  }
}
function drawGallery(t) {
  for (const [c, fn] of galleryCtx) {
    c.setTransform(3, 0, 0, 3, 0, 0); c.imageSmoothingEnabled = false; c.clearRect(0, 0, 75, 70);
    c.fillStyle = pal.i; c.fillRect(4, 58, 67, 1);
    c.save(); c.translate(37, 58); fn(c, t); c.restore();
  }
}

// ============ Panel: kickers ============
function buildKickerPanel() {
  const box = document.getElementById('kickers'); box.innerHTML = '';
  const rows = [];
  for (const type of ['S', 'M', 'L']) {
    const k = makeKicker(type, T.v0, false); renderKicker(k);
    const cv = document.createElement('canvas'); cv.width = k.img.width + 20; cv.height = k.img.height + 16;
    cv.style.width = Math.round(cv.width * 1.6) + 'px';
    const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
    c.drawImage(k.img, 10, 8); c.fillStyle = pal.i; c.fillRect(0, 8 + k.img.height - 1, 10, 1); c.fillRect(10 + k.img.width, 8 + k.img.height - 1, 10, 1);
    const wrap = document.createElement('div'); wrap.className = 'frame';
    const sp = document.createElement('span'); sp.textContent = `${type} · H ${k.H} px · dziura ${k.gap} px`;
    wrap.append(sp, cv); box.append(wrap);
    const T_air = 2 * vyMax(k) / T.g, hmax = k.H * T.boost;
    rows.push([type, k.H, k.L, k.gap, Math.round(hmax), T_air.toFixed(2), Math.round(T.v0 * T_air), Math.floor(T_air / T.flip + 0.1), Math.floor(T_air / T.whip + 0.1)]);
  }
  const tbl = document.getElementById('ktable');
  tbl.innerHTML = '<thead><tr><th>Kicker</th><th>H [px]</th><th>Najazd [px]</th><th>Dziura [px]</th><th>Lot max [px]</th><th>Czas lotu [s]</th><th>Dystans [px]</th><th>Backflipy</th><th>Tailwhipy</th></tr></thead>'
    + '<tbody>' + rows.map(r => '<tr>' + r.map(v => `<td>${v}</td>`).join('') + '</tr>').join('') + '</tbody>';
}

// ============ Boot ============
function rebuildAll() { readPalette(); buildSprites(); for (const k of S.kickers) renderKicker(k); buildKickerPanel(); }
function start() {
  readPalette(); buildSprites(); resetGame(); buildTune(); buildGallery(); buildKickerPanel(); resize();
  window.addEventListener('resize', resize);
  const mq = window.matchMedia('(prefers-color-scheme: dark)'); mq.addEventListener('change', rebuildAll);
  new MutationObserver(rebuildAll).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  if (document.fonts && document.fonts.load) Promise.all([document.fonts.load(`11px ${FONT}`), document.fonts.load('20px VT323')]).catch(() => {});
  let gt = 0; setInterval(() => { gt += 0.1; drawGallery(gt); }, 100);
  requestAnimationFrame(frame);
}
if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(start); else start();
})();
</script>
