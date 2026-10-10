// beh: the behaviour article's kit (a project module). Clean white panels like the lab's tracking software: the
// treatment in blue, the vehicle in slate grey, Instrument Sans for words and JetBrains Mono for every number. The
// arenas are drawn in code at a fixed scale (centimetres to pixels) and the mice are generated illustrations with a
// real alpha channel, turned to their heading as they run along the simulated tracks (assets/data/behaviour.json).
// Exposes window.BH.
(() => {
  let D = null, M = null;
  const data = () => (D || (D = ASSET('data/behaviour.json')));
  const meta = () => (M || (M = ASSET('ill/meta.json')));
  const ill = (n) => ASSET('ill/' + n + '.webp');
  const BLUE = '#2563EB', SLATE = '#64748B', INK = '#0F172A', INK2 = '#475569', LINE = '#E2E8F0', BG = '#F5F7FA';
  const GCOL = { vehicle: SLATE, 'BXM-2': BLUE };
  function txt(ctx, s, x, y, o = {}) {
    ctx.save(); ctx.font = `${o.weight || 500} ${o.size || 24}px ${o.mono ? FAM.mono : FAM.sans}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${o.ls ?? 0}px`;
    ctx.textAlign = o.align || 'left'; ctx.fillStyle = o.color || INK; ctx.globalAlpha *= o.a ?? 1;
    const str = o.n !== undefined ? String(s).slice(0, Math.max(0, Math.floor(o.n))) : String(s);
    ctx.fillText(str, x, y); ctx.restore();
  }
  function rise(ctx, s, x, y, p, o = {}) {
    if (p <= 0) return; const e = Ease.outExpo(clamp(p)), size = o.size || 24;
    ctx.save(); ctx.beginPath(); ctx.rect(0, y - size * 1.15, W, size * 1.5); ctx.clip();
    txt(ctx, s, x, y + (1 - e) * size * 1.1, { ...o, a: (o.a ?? 1) * clamp(p * 3) }); ctx.restore();
  }
  function bg(ctx) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(148,163,184,0.12)'; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  }
  // a white card with a hairline border and a soft shadow; k rises it in
  function card(ctx, x, y, w, h, k = 1) {
    if (k <= 0) return; const e = Ease.outExpo(clamp(k));
    ctx.save(); ctx.globalAlpha *= clamp(k * 2.5); ctx.translate(0, (1 - e) * 40);
    ctx.shadowColor = 'rgba(15,23,42,0.10)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
    ctx.fillStyle = '#FFFFFF'; rr(ctx, x, y, w, h, 18); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.strokeStyle = LINE; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
  }
  // the 3R line at the foot of every panel
  function welfare(ctx, a = 1) { txt(ctx, 'n = 12 per group · 3Rs: replacement, reduction, refinement · approved protocol (fictional)', W / 2, H - 34, { size: 17, mono: true, color: '#94A3B8', align: 'center', a }); }
  // the open-field box at (x, y), s px per cm: walls, floor grid, the centre zone
  function arena(ctx, x, y, s, k = 1, o = {}) {
    if (k <= 0) return; const box = data().box, w = box * s;
    ctx.save(); ctx.globalAlpha *= clamp(k * 2);
    ctx.fillStyle = '#FBFCFE'; ctx.fillRect(x, y, w, w);
    ctx.strokeStyle = 'rgba(148,163,184,0.25)'; ctx.lineWidth = 1;
    for (let c = 10; c < box; c += 10) { ctx.beginPath(); ctx.moveTo(x + c * s, y); ctx.lineTo(x + c * s, y + w); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y + c * s); ctx.lineTo(x + w, y + c * s); ctx.stroke(); }
    ctx.setLineDash([8, 8]); ctx.strokeStyle = o.zone || 'rgba(37,99,235,0.6)'; ctx.lineWidth = 2; ctx.strokeRect(x + 10 * s, y + 10 * s, 20 * s, 20 * s); ctx.setLineDash([]);
    if (o.fill) { ctx.fillStyle = o.fill; ctx.fillRect(x + 10 * s, y + 10 * s, 20 * s, 20 * s); }
    ctx.strokeStyle = '#94A3B8'; ctx.lineWidth = 6; ctx.strokeRect(x - 3, y - 3, w + 6, w + 6);
    ctx.restore();
  }
  // a mouse seen from above with its body's middle at (x, y), heading ang (radians, 0 = +x), body length len px
  function mouseTop(ctx, x, y, ang, len, o = {}) {
    const im = ill('mouse_top'), m = meta().mouse_top; if (!im) return;
    const s = len / m.body;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang + Math.PI / 2); ctx.globalAlpha *= o.a ?? 1;
    ctx.shadowColor = 'rgba(15,23,42,0.25)'; ctx.shadowBlur = 8 * s * 4; ctx.shadowOffsetY = 3;
    ctx.drawImage(im, -m.pivot[0] * s, -m.pivot[1] * s, m.size[0] * s, m.size[1] * s);
    ctx.restore();
  }
  // a sequential colour for the occupancy heatmaps: white to the group colour to deep navy
  function heatCol(v, base) {
    v = clamp(v); return v < 0.5 ? toHex(mix('#FFFFFF', base, v * 2)) : toHex(mix(base, '#0B1B4A', (v - 0.5) * 2 * 0.85));
  }
  // a track drawn smooth (quadratic curves through the midpoints of its samples), from sample i0 to i1
  function track(ctx, tr, i0, i1, x0, y0, s) {
    if (i1 - i0 < 2) return;
    ctx.beginPath(); ctx.moveTo(x0 + tr[i0][0] * s, y0 + tr[i0][1] * s);
    for (let i = i0 + 1; i < i1; i++) { const [ax, ay] = tr[i], [bx, by] = tr[i + 1]; ctx.quadraticCurveTo(x0 + ax * s, y0 + ay * s, x0 + (ax + bx) / 2 * s, y0 + (ay + by) / 2 * s); }
    ctx.stroke();
  }
  // a mouse running its group's example track, looping over a window of it (for holds)
  function runner(ctx, g, x0, y0, s, lt, o = {}) {
    const tr = data().example[g], i0 = o.from ?? 600, span = o.span ?? 700, i = i0 + Math.floor((lt * (o.rate ?? 25)) % span);
    ctx.save(); ctx.strokeStyle = rgba(GCOL[g], o.trail ?? 0.6); ctx.lineWidth = o.w ?? 2.4; ctx.lineJoin = 'round'; track(ctx, tr, Math.max(i0, i - (o.tail ?? 80)), i, x0, y0, s); ctx.restore();
    const p = tr[i], q = tr[Math.max(0, i - 4)], c = (v) => clamp(v, 3.5, data().box - 3.5);   // a body, not a point: keep it inside
    mouseTop(ctx, x0 + c(p[0]) * s, y0 + c(p[1]) * s, Math.atan2(p[1] - q[1], p[0] - q[0]), 8 * s, { a: o.a ?? 1 });
  }
  window.BH = { data, meta, ill, BLUE, SLATE, INK, INK2, LINE, GCOL, txt, rise, bg, card, welfare, arena, mouseTop, heatCol, track, runner };
})();
