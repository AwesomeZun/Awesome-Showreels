// form01: the FORM / 01 reel's shared kit (a project module). The app's inspection desk: its metal plate (118deg
// #E7E8EA to #8E9096 with a white sheen and fine noise) with rulers along the top and left edge, crop marks and
// dimension lines around an artboard, and its pins (board.css .pin: a 50% 50% 50% 3px teardrop in the reviewer's
// colour, anchored at its sharp bottom-left corner, a white ring, the number in white or black for contrast) and
// regions (a dashed rectangle with a 9% wash). Mockups and panels are the app's own (see style.json).
(() => {
  const RV = { haeun: ['하은', '#FF5A1F'], junseo: ['준서', '#3D7BFF'], minji: ['민지', '#C6FF3D'] };
  const meta = {};
  function rect(name) {
    if (meta[name]) return meta[name];
    const has = (n) => ('captures/ui/app/' + n + '.json') in ASSETS;
    let r = null; if (has(name)) r = ASSET('captures/ui/app/' + name + '.json').rect;
    else { const g = name.replace(/_\d+$/, ''); if (has(g)) { const j = ASSET('captures/ui/app/' + g + '.json'); const L = (j.layers || []).find(l => l.file === name + '.png'); r = L ? L.rect : null; } }
    return (meta[name] = r);
  }
  function draw(ctx, name, x, y, k = 1, o = {}) {
    const img = IMG['captures/ui/app/' + name], r = rect(name); if (!img || !r) return; const d = img.width / r.w;
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
    if (o.crop) { const [cx, cy, cw, ch] = o.crop; ctx.drawImage(img, cx * d, cy * d, cw * d, ch * d, x, y, cw * k, ch * k); } else ctx.drawImage(img, x, y, r.w * k, r.h * k);
    ctx.restore();
  }
  let noise = null;
  function noiseTile() { if (noise) return noise; const b = makeBuf(160, 160), id = b.g.createImageData(160, 160);
    for (let i = 0; i < 25600; i++) { const v = hash(i * 2.13 + 5) * 255; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v < 128 ? 0 : 255; id.data[i * 4 + 3] = 10; } b.g.putImageData(id, 0, 0); return (noise = b.c); }
  // the metal plate (home.css .hero-metal) over a rect, with rulers
  function plate(ctx, x, y, w, h, o = {}) {
    ctx.save(); if (o.r) { rr(ctx, x, y, w, h, o.r); ctx.clip(); }
    const a = 118 * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a), L = (Math.abs(w * dx) + Math.abs(h * dy)) / 2, cx = x + w / 2, cy = y + h / 2;
    const g = ctx.createLinearGradient(cx - dx * L, cy - dy * L, cx + dx * L, cy + dy * L);
    [[0, '#e7e8ea'], [0.28, '#d9dadc'], [0.58, '#bfc1c5'], [0.82, '#a2a4a9'], [1, '#8e9096']].forEach(([p, c]) => g.addColorStop(p, c)); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.save(); ctx.translate(x + w * 0.18, y); ctx.scale(w * 1.2, h * 0.9); const r = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); r.addColorStop(0, 'rgba(255,255,255,0.55)'); r.addColorStop(0.55, 'rgba(255,255,255,0)'); ctx.fillStyle = r; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
    ctx.fillStyle = ctx.createPattern(noiseTile(), 'repeat'); ctx.fillRect(x, y, w, h);
    if (o.rulers !== false) { const off = o.drift || 0; ctx.globalAlpha *= 0.55; ctx.fillStyle = 'rgba(11,11,12,0.7)';
      for (let rx = x + 28 + (off % 48); rx < x + w; rx += 48) ctx.fillRect(Math.round(rx), y, 1, 16 * (o.k || 1));
      ctx.fillStyle = 'rgba(11,11,12,0.5)'; for (let rx = x + 28 + (off % 8); rx < x + w; rx += 8) ctx.fillRect(Math.round(rx), y, 1, 7 * (o.k || 1));
      ctx.fillStyle = 'rgba(11,11,12,0.7)'; for (let ry = y + 16; ry < y + h; ry += 48) ctx.fillRect(x, Math.round(ry), 16 * (o.k || 1), 1);
      ctx.fillStyle = 'rgba(11,11,12,0.5)'; for (let ry = y + 16; ry < y + h; ry += 8) ctx.fillRect(x, Math.round(ry), 7 * (o.k || 1), 1); }
    ctx.restore();
  }
  // the dark desk (the board view's stage) with a fine grid
  function desk(ctx, t, o = {}) { ctx.fillStyle = '#0B0B0C'; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(o.gx ?? 1200, o.gy ?? 500, 0, o.gx ?? 1200, o.gy ?? 500, 1100); g.addColorStop(0, 'rgba(217,218,220,0.07)'); g.addColorStop(1, 'rgba(217,218,220,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.05)'; for (let y = 24; y < H; y += 48) for (let x = 24; x < W; x += 48) ctx.fillRect(x, y, 1.5, 1.5); ctx.restore(); }
  // crop marks at an artboard's corners and its dimension line above (and/or beside)
  function marks(ctx, x, y, w, h, o = {}) { ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.strokeStyle = o.color || 'rgba(237,237,239,0.55)'; ctx.lineWidth = 1; const m = 18, gp = 8; ctx.beginPath();
    [[x, y, -1, -1], [x + w, y, 1, -1], [x, y + h, -1, 1], [x + w, y + h, 1, 1]].forEach(([cx, cy, sx, sy]) => { ctx.moveTo(cx + sx * gp, cy); ctx.lineTo(cx + sx * (gp + m), cy); ctx.moveTo(cx, cy + sy * gp); ctx.lineTo(cx, cy + sy * (gp + m)); }); ctx.stroke();
    if (o.dim) { const dy = y - 24, p = o.dimP ?? 1, cx = x + w / 2; ctx.beginPath(); ctx.moveTo(cx - w / 2 * p, dy); ctx.lineTo(cx + w / 2 * p, dy); ctx.moveTo(x, dy - 5); ctx.lineTo(x, dy + 5); ctx.moveTo(x + w, dy - 5); ctx.lineTo(x + w, dy + 5); ctx.stroke();
      if (p > 0.6) { ctx.font = `600 ${o.dimSize || 16}px ${FAM.mono}`; const tw = ctx.measureText(o.dim).width + 12; ctx.fillStyle = o.dimBg || '#0B0B0C'; ctx.fillRect(cx - tw / 2, dy - 10, tw, 20); ctx.fillStyle = o.color || 'rgba(237,237,239,0.8)'; ctx.textAlign = 'center'; ctx.fillText(o.dim, cx, dy + 5.5); } }
    ctx.restore(); }
  const inkOn = (c) => { const n = parseInt(c.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255, L = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; return L > 0.55 ? '#0B0B0C' : '#FFFFFF'; };
  // a pin anchored at (x, y): its sharp corner is the point it marks; s = size, p = drop progress (spring)
  function pin(ctx, x, y, n, color, o = {}) {
    const s = o.s || 34, p = o.p ?? 1; if (p <= 0) return; const sc = (o.sel ? 1.24 : 1) * p;
    ctx.save(); ctx.globalAlpha *= clamp(p * 3) * (o.alpha ?? 1); ctx.translate(x, y); ctx.scale(sc, sc);
    const shape = () => { ctx.beginPath(); const r = s / 2, c = 3; ctx.moveTo(c, 0); ctx.lineTo(s - r, 0); ctx.arc(s - r, -r, r, Math.PI / 2, 0, true); ctx.arc(s - r, -s + r, r, 0, -Math.PI / 2, true); ctx.arc(r, -s + r, r, -Math.PI / 2, -Math.PI, true); ctx.lineTo(0, -c); ctx.quadraticCurveTo(0, 0, c, 0); ctx.closePath(); };
    ctx.shadowColor = 'rgba(0,0,0,0.75)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 8; shape(); ctx.fillStyle = color; ctx.fill(); ctx.shadowColor = 'transparent';
    if (o.sel) { ctx.save(); ctx.globalAlpha *= 0.42; ctx.strokeStyle = color; ctx.lineWidth = 12; shape(); ctx.stroke(); ctx.restore(); }
    ctx.strokeStyle = o.resolved ? '#8E9096' : '#FFFFFF'; ctx.lineWidth = o.resolved ? 1.5 : 2.5; shape(); ctx.stroke();
    ctx.font = `800 ${s * 0.44}px ${FAM.sans}`; ctx.fillStyle = o.resolved ? '#EDEDEF' : inkOn(color); ctx.textAlign = 'center'; ctx.fillText(o.resolved ? '✓' : String(n), s / 2, -s / 2 + s * 0.16); ctx.restore();
  }
  function region(ctx, x, y, w, h, color, p = 1) { if (p <= 0) return; ctx.save(); ctx.fillStyle = color + '17'; ctx.fillRect(x, y, w * p, h * p); ctx.setLineDash([7, 5]); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.strokeRect(x, y, w * p, h * p); ctx.restore(); }
  function spaced(ctx, s, x, y, size, ls, align) { let w = 0; for (const ch of s) w += ctx.measureText(ch).width + size * ls; w -= size * ls; let cx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    for (const ch of s) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + size * ls; } return w; }
  function label(ctx, s, x, y, o = {}) { ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.font = `${o.weight || 600} ${o.size || 20}px ${FAM.mono}`; ctx.fillStyle = o.color || '#8C8D93'; const w = spaced(ctx, s, x, y, o.size || 20, 0.14, o.align); ctx.restore(); return w; }
  // FORM / 01 as the app sets it: 860, -0.058em, the slash at 300 in half-black
  function title(ctx, x, y, size, color, o = {}) { ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; if ('letterSpacing' in ctx) ctx.letterSpacing = `${-0.058 * size}px`;
    ctx.font = `860 ${size}px ${FAM.display}`; const a = ctx.measureText('FORM').width, b = ctx.measureText('01').width; ctx.font = `300 ${size}px ${FAM.display}`; const s = ctx.measureText('/').width;
    const w = a + s + b + size * 0.04, x0 = o.align === 'center' ? x - w / 2 : x;
    ctx.font = `860 ${size}px ${FAM.display}`; ctx.fillStyle = color; ctx.fillText('FORM', x0, y); ctx.font = `300 ${size}px ${FAM.display}`; ctx.fillStyle = o.slash || 'rgba(11,11,12,0.5)'; ctx.fillText('/', x0 + a + size * 0.02, y - size * 0.02);
    ctx.font = `860 ${size}px ${FAM.display}`; ctx.fillStyle = color; ctx.fillText('01', x0 + a + s + size * 0.04, y); ctx.restore(); return w; }
  window.F1 = { RV, rect, draw, plate, desk, marks, pin, region, label, title, spaced, inkOn };
})();
