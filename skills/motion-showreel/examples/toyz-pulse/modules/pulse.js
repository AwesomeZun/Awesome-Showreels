// pulse: the Pulse reel's shared kit (a project module). The stage is the app's brushed-aluminium panel (its light
// tokens, a fine noise and a soft top light) with an instrument ruler; the level meter is the app's ten-step meter;
// the chrome X is the app's own ChromeBlob, captured. Captures draw at their CSS size; labels are the app's
// monospaced capitals; headlines are near-black with the second line in orange.
(() => {
  const meta = {};
  function layer(name) {
    const base = name.replace(/_(\d+|empty)$/, ''), m = name.match(/_(\d+|empty)$/);
    const has = (n) => ('captures/ui/app/' + n + '.json') in ASSETS;
    if (!meta[name]) meta[name] = has(base) ? ASSET('captures/ui/app/' + base + '.json') : has(name) ? ASSET('captures/ui/app/' + name + '.json') : null;
    const j = meta[name];
    const L = j && j.layers ? (j.layers.find(l => l.file === name + '.png') || j.layers[0]) : j;
    return { img: IMG['captures/ui/app/' + name], L, w: L ? L.rect.w : 0, h: L ? L.rect.h : 0 };
  }
  // draw a capture at (x, y), k screen px per CSS px; o.crop = [x, y, w, h] in CSS px
  function draw(ctx, name, x, y, k = 1, o = {}) {
    const { img, L } = layer(name); if (!img) return;
    const d = (L && L.dpr) || 2;
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
    if (o.crop) { const [cx, cy, cw, ch] = o.crop; ctx.drawImage(img, cx * d, cy * d, cw * d, ch * d, x + cx * k, y + cy * k, cw * k, ch * k); }
    else ctx.drawImage(img, x, y, img.width / d * k, img.height / d * k);
    ctx.restore();
  }
  function label(ctx, s, x, y, o = {}) {
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
    ctx.font = `${o.weight || 600} ${o.size || 22}px ${FAM.mono}`; ctx.fillStyle = o.color || C.muted; ctx.textBaseline = 'alphabetic';
    const ls = (o.size || 22) * (o.ls ?? 0.16); let w = 0; for (const ch of s) w += ctx.measureText(ch).width + ls; w -= ls;
    let cx = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
    for (const ch of s) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + ls; }
    ctx.restore(); return w;
  }
  function headline(ctx, lines, x, y, lt, o = {}) {
    const size = o.size || 104, gap = o.gap ?? size * 1.14;
    lines.forEach((s, i) => kinetic(ctx, s, x, y + i * gap, lt - (o.step ?? 0.3) * i, {
      size, fam: 'display', weight: o.weight || 900, color: (o.colors || [])[i] || C.ink, ls: -0.045 * size,
      stagger: o.stagger ?? 0.026, dur: 0.5, rise: 0.45 * size, blur: 6, align: o.align, out: o.out, alpha: o.alpha }));
  }
  // a fine, fixed noise tile (deterministic) for the aluminium
  let noise = null;
  function noiseTile() {
    if (noise) return noise;
    const b = makeBuf(256, 256), g = b.g, id = g.createImageData(256, 256);
    for (let i = 0; i < 256 * 256; i++) { const v = hash(i * 1.37 + 7) * 255; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 20; }
    g.putImageData(id, 0, 0); noise = b.c; return noise;
  }
  // the stage: aluminium with a soft top light, fine noise, brushed streaks and an instrument ruler along the foot
  function stage(ctx, t, o = {}) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#F1F2F5'); g.addColorStop(0.55, '#E9EAEE'); g.addColorStop(1, '#DCDEE3');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const lx = o.lightX ?? 1300, r = ctx.createRadialGradient(lx, -200, 0, lx, -200, 1200); r.addColorStop(0, 'rgba(255,255,255,0.75)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.fillStyle = ctx.createPattern(noiseTile(), 'repeat'); ctx.fillRect(0, 0, W, H); ctx.restore();
    if (o.ruler !== false) ruler(ctx, t, o.rulerY ?? 1040, o);
  }
  // an instrument scale: minor ticks every 12 px, majors every 120 with mono numbers, drifting with time
  function ruler(ctx, t, y, o = {}) {
    const off = -((t * (o.speed ?? 60)) % 120);
    ctx.save(); ctx.strokeStyle = 'rgba(13,14,17,0.28)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = off; x < W + 120; x += 12) { const major = Math.round((x - off) / 12) % 10 === 0; ctx.moveTo(Math.round(x) + 0.5, y); ctx.lineTo(Math.round(x) + 0.5, y - (major ? 18 : 8)); }
    ctx.stroke(); ctx.fillStyle = 'rgba(13,14,17,0.38)'; ctx.font = `500 14px ${FAM.mono}`;
    const base = Math.floor(t * (o.speed ?? 60) / 120);
    for (let x = off, i = 0; x < W + 120; x += 120, i++) ctx.fillText(String((base + i) * 10).padStart(3, '0'), x + 4, y - 22);
    ctx.fillStyle = 'rgba(13,14,17,0.18)'; ctx.fillRect(0, y, W, 1); ctx.restore();
  }
  // the app's ten-step level meter: n of 10 lit, the lit ones in ink (or orange when hot)
  function meter(ctx, x, y, w, h, level, o = {}) {
    const n = 10, gap = w * 0.035, bw = (w - gap * (n - 1)) / n;
    for (let i = 0; i < n; i++) {
      const lit = i < level, hh = h * (0.45 + 0.55 * (i + 1) / n);
      ctx.fillStyle = lit ? (o.hot ? '#F05A28' : '#0D0E11') : 'rgba(13,14,17,0.14)';
      ctx.fillRect(Math.round(x + i * (bw + gap)), Math.round(y + h - hh), Math.max(1, Math.round(bw)), Math.round(hh));
    }
  }
  // the chrome X (the app's ChromeBlob), centred at (x, y), height h, rotation rot, with its floor shadow
  function chromeX(ctx, x, y, h, o = {}) {
    const { img, L } = layer('blob'); if (!img) return;
    const k = h / L.rect.h, w = L.rect.w * k;
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
    const sh = ctx.createRadialGradient(x, y + h * 0.48, 0, x, y + h * 0.48, w * 0.45); sh.addColorStop(0, 'rgba(13,14,17,0.22)'); sh.addColorStop(1, 'rgba(13,14,17,0)');
    ctx.save(); ctx.translate(x, y + h * 0.48); ctx.scale(1, 0.16); ctx.translate(-x, -(y + h * 0.48)); ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(x, y + h * 0.48, w * 0.45, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(o.sx ?? 1, o.sy ?? 1);
    ctx.drawImage(img, -w / 2, -h / 2 - h * 0.04, w, h);
    ctx.restore();
  }
  // the brand: Pulse with its orange dot
  function wordmark(ctx, x, y, size, o = {}) {
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.font = `900 ${size}px ${FAM.display}`; ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'alphabetic';
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${-0.055 * size}px`;
    const w = ctx.measureText('Pulse').width, x0 = o.align === 'center' ? x - w / 2 : x;
    ctx.fillStyle = '#0D0E11'; ctx.fillText('Pulse', x, y);
    const dk = o.dot ?? 1; ctx.fillStyle = '#F05A28'; circle(ctx, x0 + w + size * 0.07, y - size * 0.66, size * 0.075 * dk); ctx.fill();
    ctx.restore(); return w;
  }
  window.PULSE = { layer, draw, label, headline, stage, ruler, meter, chromeX, wordmark };
})();
