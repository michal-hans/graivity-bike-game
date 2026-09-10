// ============ Render ============
const FONT = '"Press Start 2P", "Courier New", monospace';
function text(str, x, y, size, align = 'left', alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = pal.i; ctx.font = `${size}px ${FONT}`; ctx.textBaseline = 'top'; ctx.textAlign = align;
  ctx.fillText(str, Math.round(x), Math.round(y)); ctx.restore();
}
function pad5(n) { return String(Math.floor(n)).padStart(5, '0'); }
function hash(i) { let h = (i * 2654435761) >>> 0; h ^= h >>> 13; h = (h * 1597334677) >>> 0; return h >>> 0; }

function drawGround() {
  ctx.fillStyle = pal.i;
  // ground line, skipping gaps
  let x = 0;
  const gaps = S.kickers.map(k => [k.x + k.L + 2 - S.dist + PX, k.x + k.L + k.gap - S.dist + PX]).filter(g => g[1] > 0 && g[0] < W).sort((a, b) => a[0] - b[0]);
  for (const g of gaps) { if (g[0] > x) ctx.fillRect(x, GY, Math.min(W, g[0]) - x, 1); x = Math.max(x, g[1]); }
  if (x < W) ctx.fillRect(x, GY, W - x, 1);
  // pebbles
  const seg0 = Math.floor((S.dist - PX) / 48), seg1 = Math.floor((S.dist - PX + W) / 48);
  for (let i = seg0; i <= seg1; i++) {
    const h = hash(i); const wx = i * 48 + (h % 48); const sx = wx - S.dist + PX;
    const tr = terrain(wx); if (tr.kind !== 'flat') continue;
    ctx.fillRect(Math.round(sx), GY + 3 + (h >> 8) % 5, 1 + ((h >> 4) % 3), 1);
  }
}
function drawKickers() {
  for (const k of S.kickers) {
    const sx = Math.round(k.x - S.dist + PX); if (sx > W || sx + k.total < 0) continue;
    ctx.drawImage(k.img, sx, GY - k.img.height + 1);
    if (tut === 0 && S.state === 'run') { // timing hint at lip
      const lx = sx + k.L, ly = GY - k.H;
      if (Math.floor(S.hintPulse * 4) % 2 === 0) { ctx.fillStyle = pal.i; ctx.fillRect(lx - 3, ly - 16, 5, 2); ctx.fillRect(lx - 2, ly - 14, 3, 2); ctx.fillRect(lx - 1, ly - 12, 1, 3); }
      text(TUT_TEXT[0], lx, ly - 30, 8, 'center');
    }
  }
}
function drawClouds() { for (const c of S.clouds) blit(ctx, SPR.cloud, c.x, c.y); }
function pickPose() {
  if (S.onGround) { if (S.landT > 0) return 'crouch'; if (S.tr && S.tr.kind === 'ramp' && S.tr.t > 0.35) return 'crouch'; return 'stand'; }
  if (S.trick) return S.trick.type;
  if (S.launchT < 0.18) return 'extend';
  return 'air';
}
function drawPlayer() {
  const bike = SPR.bike[Math.floor(S.wheel / 40) % 2];
  ctx.save(); ctx.translate(PX, GY - Math.round(S.hgt));
  if (S.state === 'over') {
    ctx.save(); ctx.translate(20, -12); ctx.rotate(-1.75); ctx.translate(0, 13); ctx.drawImage(bike.img, bike.x0, bike.y0); ctx.restore();
    blit(ctx, SPR.rider.down, 0, 0);
    ctx.restore(); return;
  }
  const pose = pickPose();
  ctx.translate(0, -16); ctx.rotate(S.angle); ctx.translate(0, 16);
  if (S.trick && S.trick.type === 'whip') {
    const phi = 2 * Math.PI * S.trick.p; let c = Math.cos(phi); if (Math.abs(c) < 0.06) c = c < 0 ? -0.06 : 0.06;
    const drawB = () => { ctx.save(); ctx.translate(12, -23); ctx.scale(c, 1); ctx.rotate(0.35 * Math.sin(phi)); ctx.translate(-12, 23); ctx.drawImage(bike.img, bike.x0, bike.y0); ctx.restore(); };
    if (Math.sin(phi) > 0) { drawB(); blit(ctx, SPR.rider.whip, 0, 0); } else { blit(ctx, SPR.rider.whip, 0, 0); drawB(); }
  } else { ctx.drawImage(bike.img, bike.x0, bike.y0); blit(ctx, SPR.rider[pose], 0, 0); }
  ctx.restore();
}
function drawFloaters() { for (const f of S.floaters) text(f.text, f.x, f.y - f.t * 28, 8, 'center', Math.max(0, 1 - f.t / 1.2)); }
function drawHUD() {
  text(`HI ${pad5(hi)} ${pad5(S.score)}`, W - 16, 14, 11, 'right');
  if (S.state === 'run' && !S.onGround && S.jumpTricks.length) text('×' + (S.jumpTricks.length + 1), 16, 14, 11);
  if (S.state === 'run' && !S.onGround && S.launch && S.launch.k && S.launch.q >= 0.7 && tut >= 1 && tut <= 3 && S.launchT > 0.12) {
    const idx = tut === 1 ? 1 : tut === 2 ? 2 : 3;
    if (idx < 3 || S.launch.k.type === 'L') text(TUT_TEXT[idx], W / 2, 52, 9, 'center');
  }
}
function drawRestartIcon(x, y) {
  ctx.save(); ctx.strokeStyle = pal.i; ctx.fillStyle = pal.i; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, 14, -Math.PI * 0.35, Math.PI * 1.45); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 2, y - 20); ctx.lineTo(x + 14, y - 12); ctx.lineTo(x + 2, y - 4); ctx.closePath(); ctx.fill(); ctx.restore();
}
function drawOverlay() {
  if (S.state === 'idle') {
    text('DIRT JUMPER', W / 2, 78, 18, 'center');
    text('KLIKNIJ ALBO SPACJA, ABY RUSZYĆ', W / 2, 112, 9, 'center', Math.floor(S.time * 2) % 2 ? 1 : 0.35);
    text('1× KLIK PRZED WIERZCHOŁKIEM = SKOK   2× = BACKFLIP   3× = TAILWHIP', W / 2, 140, 7, 'center');
  } else if (S.state === 'over') {
    text('G A M E   O V E R', W / 2, 92, 13, 'center');
    text(S.reason, W / 2, 118, 8, 'center');
    drawRestartIcon(W / 2, 162);
  }
}
function render() {
  ctx.fillStyle = pal.bg; ctx.fillRect(0, 0, W, H);
  drawClouds(); drawGround(); drawKickers(); drawPlayer(); drawFloaters(); drawHUD(); drawOverlay();
}

// ============ Loop & sizing ============
function resize() {
  const cssW = canvas.clientWidth || W; const dpr = Math.min(3, window.devicePixelRatio || 1);
  const scale = Math.max(1, Math.round(cssW * dpr / W * 2) / 2); // half-step scale keeps pixels even-ish
  canvas.width = Math.round(W * scale); canvas.height = Math.round(H * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0); ctx.imageSmoothingEnabled = false;
}
let last = 0;
function frame(ts) {
  if (!last) last = ts; let dt = (ts - last) / 1000; last = ts; if (dt > 0.05) dt = 0.05;
  update(dt); render(); requestAnimationFrame(frame);
}
