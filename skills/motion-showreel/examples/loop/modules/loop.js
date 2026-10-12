// loop: the LOOP reel's shared kit (a project module). The app's chrome ring (Rings.tsx ChromeRing and app.css): a
// torus filled with its conic chrome (from 205deg, white through #2B3656), two soft highlights, its inner shade, a
// navy inlay track and the progress arc in its navy gradient with a fine white edge, and, when the last loop closes,
// its celebration: one glint round the ring (conic, rotating -30deg to 330deg over 1.8 s) and a small pop. Also the
// wordmark (L, two linked chrome rings, P) and the app's periwinkle page.
(() => {
  const CH = [[0, '#ffffff'], [0.05, '#dfe7f6'], [0.13, '#8d9ab6'], [0.2, '#2b3656'], [0.25, '#7f8dab'], [0.33, '#eef3fb'], [0.37, '#ffffff'], [0.45, '#c3cee4'], [0.55, '#5d6a88'], [0.62, '#aebbd6'], [0.69, '#ffffff'], [0.78, '#9ba8c3'], [0.86, '#34405f'], [0.93, '#b9c6de'], [1, '#ffffff']];
  function annulus(ctx, cx, cy, R, r) { ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.arc(cx, cy, r, 0, Math.PI * 2, true); }
  // ring centred at (cx, cy), outer size s, band thickness th, value v (0..1), glint g (seconds since it started, or -1)
  function ring(ctx, cx, cy, s, th, v, o = {}) {
    const R = s / 2, r0 = R - th, g = o.glint ?? -1;
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
    // floor shadow
    ctx.save(); ctx.translate(cx, cy + R * 0.98); ctx.scale(1, 0.2); const sh = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.8); sh.addColorStop(0, 'rgba(22,38,74,0.34)'); sh.addColorStop(0.75, 'rgba(22,38,74,0)'); ctx.fillStyle = sh; ctx.fillRect(-R, -R, 2 * R, 2 * R); ctx.restore();
    // torus
    ctx.save(); annulus(ctx, cx, cy, R, r0); ctx.clip('evenodd');
    const cg = ctx.createConicGradient((205 - 90) * Math.PI / 180, cx, cy); CH.forEach(([p, c]) => cg.addColorStop(p, c)); ctx.fillStyle = cg; ctx.fillRect(cx - R, cy - R, s, s);
    const hl = (px, py, rx, ry, a) => { ctx.save(); ctx.translate(cx - R + px * s, cy - R + py * s); ctx.scale(rx * s, ry * s); const h = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); h.addColorStop(0, `rgba(255,255,255,${a})`); h.addColorStop(0.7, 'rgba(255,255,255,0)'); ctx.fillStyle = h; ctx.fillRect(-1, -1, 2, 2); ctx.restore(); };
    hl(0.3, 0.14, 0.38, 0.26, 0.95); hl(0.78, 0.88, 0.3, 0.2, 0.55);
    const t = th / R, sd = ctx.createRadialGradient(cx, cy, 0, cx, cy, R); sd.addColorStop(Math.max(0, 1 - t), 'rgba(16,28,56,0.42)'); sd.addColorStop(1 - t * 0.66, 'rgba(255,255,255,0.28)'); sd.addColorStop(1 - t * 0.42, 'rgba(255,255,255,0)'); sd.addColorStop(1, 'rgba(16,28,56,0.46)');
    ctx.fillStyle = sd; ctx.fillRect(cx - R, cy - R, s, s);
    if (g >= 0 && g < 1.8) { const p = bez(0.3, 0.6, 0.2, 1)(g / 1.8), rot = (-30 + 360 * p) * Math.PI / 180, a = p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85;
      const gl = ctx.createConicGradient(-Math.PI / 2 + rot, cx, cy); gl.addColorStop(0, 'rgba(255,255,255,0)'); gl.addColorStop(0.62, 'rgba(255,255,255,0)'); gl.addColorStop(0.76, `rgba(255,255,255,${0.95 * a})`); gl.addColorStop(0.88, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gl; ctx.fillRect(cx - R, cy - R, s, s); }
    ctx.restore();
    // the inlay: track, arc, fine edge
    const rr0 = (s - th) / 2, inl = Math.max(6, th * 0.46);
    ctx.lineWidth = inl; ctx.strokeStyle = 'rgba(22,38,74,0.22)'; ctx.beginPath(); ctx.arc(cx, cy, rr0, 0, Math.PI * 2); ctx.stroke();
    if (v > 0) { const ag = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R); ag.addColorStop(0, '#2B4A8C'); ag.addColorStop(0.55, '#1F3566'); ag.addColorStop(1, '#14254A');
      ctx.strokeStyle = ag; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(cx, cy, rr0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, v)); ctx.stroke();
      const c = 2 * Math.PI * rr0, edge = Math.max(0, c * v - inl) / rr0; ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, cy, rr0 - inl * 0.18, -88 * Math.PI / 180, -88 * Math.PI / 180 + edge); ctx.stroke(); }
    ctx.restore();
  }
  const _b = {}; function bez(x1, y1, x2, y2) { const k = [x1, y1, x2, y2].join(); if (_b[k]) return _b[k]; const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const X = (t) => ((ax * t + bx) * t + cx) * t, Y = (t) => ((ay * t + by) * t + cy) * t, dX = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return (_b[k] = (x) => { let t = x; for (let i = 0; i < 8; i++) { const d = X(t) - x, s = dX(t); if (Math.abs(d) < 1e-5 || Math.abs(s) < 1e-6) break; t -= d / s; } return Y(clamp(t)); }); }
  // the wordmark (App.tsx): L, two linked chrome rings (viewBox 44 x 24, 1.5em wide), P; size = font size
  function wordmark(ctx, x, y, size, o = {}) {
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.font = `900 ${size}px ${FAM.display}`; if ('letterSpacing' in ctx) ctx.letterSpacing = `${-0.04 * size}px`; ctx.fillStyle = '#16264A';
    const wl = ctx.measureText('L').width, rw = 1.5 * size, rh = 0.78 * size, wp = ctx.measureText('P').width, w = wl + rw + 0.05 * size + wp, x0 = o.align === 'center' ? x - w / 2 : x;
    ctx.fillText('L', x0, y); ctx.fillText('P', x0 + wl + rw + 0.05 * size, y);
    ctx.save(); ctx.translate(x0 + wl + 0.03 * size, y - size * 0.36 - rh / 2); ctx.scale(rw / 44, rh / 24); if (o.spin) { ctx.translate(22, 12); ctx.rotate(o.spin); ctx.translate(-22, -12); }
    ctx.shadowColor = 'rgba(22,38,74,0.28)'; ctx.shadowBlur = 2 * 44 / rw * 2; ctx.shadowOffsetY = 2 * 24 / rh;
    const g = ctx.createLinearGradient(0, 0, 44, 24); [[0, '#FFFFFF'], [0.24, '#9AA5B8'], [0.44, '#34405A'], [0.6, '#E9EDF4'], [0.8, '#6F7A90'], [1, '#D5DBE5']].forEach(([p, c]) => g.addColorStop(p, c));
    [12, 31].forEach(c => { ctx.strokeStyle = g; ctx.lineWidth = 5.2; ctx.beginPath(); ctx.arc(c, 12, 8.4, 0, Math.PI * 2); ctx.stroke(); });
    ctx.shadowColor = 'transparent'; [12, 31].forEach(c => { ctx.strokeStyle = 'rgba(22,38,74,0.55)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(c, 12, 11, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(c, 12, 5.8, 0, Math.PI * 2); ctx.stroke(); });
    ctx.strokeStyle = g; ctx.lineWidth = 5.2; ctx.beginPath(); ctx.arc(12, 12, 8.4, Math.atan2(4.73 - 12, 16.2 - 12), 0); ctx.stroke();
    ctx.restore(); ctx.restore(); return w;
  }
  // the app's page: #E6ECF7 with soft periwinkle light
  function page(ctx, t, o = {}) { ctx.fillStyle = '#E6ECF7'; ctx.fillRect(0, 0, W, H);
    const gx = (o.gx ?? 1400) + Math.sin(t * 0.45) * 140, gy = (o.gy ?? 300) + Math.cos(t * 0.35) * 70, g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 1100); g.addColorStop(0, 'rgba(185,204,240,0.85)'); g.addColorStop(1, 'rgba(185,204,240,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const h = ctx.createRadialGradient(300, 1000, 0, 300, 1000, 800); h.addColorStop(0, 'rgba(247,249,253,0.9)'); h.addColorStop(1, 'rgba(247,249,253,0)'); ctx.fillStyle = h; ctx.fillRect(0, 0, W, H); }
  // the top strip (TOYZ · TOYZ / LOOP · date)
  function strip(ctx) { ctx.fillStyle = '#16264A'; ctx.fillRect(0, 0, W, 36); ctx.font = `600 15px ${FAM.mono}`; ctx.fillStyle = 'rgba(231,237,249,0.75)'; spaced(ctx, 'TOYZ', 28, 24, 15, 0.14); ctx.fillStyle = '#E7EDF9'; spaced(ctx, 'TOYZ / LOOP', W / 2, 24, 15, 0.14, 'center'); ctx.fillStyle = 'rgba(231,237,249,0.75)'; spaced(ctx, '2026.10.12 MON · W42', W - 28, 24, 15, 0.14, 'right'); }
  function spaced(ctx, s, x, y, size, ls, align) { let w = 0; for (const ch of s) w += ctx.measureText(ch).width + size * ls; w -= size * ls; let cx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x; for (const ch of s) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + size * ls; } return w; }
  function label(ctx, s, x, y, o = {}) { ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.font = `${o.weight || 600} ${o.size || 20}px ${FAM.mono}`; ctx.fillStyle = o.color || '#3D4F78'; const w = spaced(ctx, s, x, y, o.size || 20, 0.14, o.align); ctx.restore(); return w; }
  function draw(ctx, name, x, y, k = 1, o = {}) { const img = IMG['captures/ui/app/' + name]; if (!img) return; const has = ('captures/ui/app/' + name + '.json') in ASSETS;
    let r = has ? ASSET('captures/ui/app/' + name + '.json').rect : null; if (!r) { const g = ASSET('captures/ui/app/' + name.replace(/_\d+$/, '') + '.json'); r = (g.layers.find(l => l.file === name + '.png') || g.layers[0]).rect; }
    const d = img.width / r.w; ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; if (o.crop) { const [cx, cy, cw, ch] = o.crop; ctx.drawImage(img, cx * d, cy * d, cw * d, ch * d, x, y, cw * k, ch * k); } else ctx.drawImage(img, x, y, r.w * k, r.h * k); ctx.restore(); }
  function card(ctx, x, y, w, h, o = {}) { ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.shadowColor = 'rgba(22,38,74,0.22)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18; rr(ctx, x, y, w, h, o.r ?? 18); ctx.fillStyle = o.fill || '#F7F9FD'; ctx.fill(); ctx.restore(); }
  window.LP = { ring, wordmark, page, strip, label, spaced, draw, card, bez };
})();
