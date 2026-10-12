// frame: the Frame reel's shared kit (a project module). A light studio stage (the app's greys with a soft top light),
// orange viewfinder corners that snap onto what matters, a browser window drawn around the app's real live-preview
// capture (with the filename the app gives the export), the wordmark with its orange period, mono labels and the
// two-line headline (second line orange).
(() => {
  const meta = {};
  function layer(name) {
    const has = (n) => ('captures/ui/app/' + n + '.json') in ASSETS;
    if (!meta[name]) meta[name] = has(name) ? ASSET('captures/ui/app/' + name + '.json') : null;
    const j = meta[name], L = j && j.layers ? j.layers[0] : j;
    return { img: IMG['captures/ui/app/' + name], L, w: L ? L.rect.w : 0, h: L ? L.rect.h : 0 };
  }
  function draw(ctx, name, x, y, k = 1, o = {}) {
    const { img } = layer(name); if (!img) return;
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
    if (o.crop) { const [cx, cy, cw, ch] = o.crop; ctx.drawImage(img, cx * 2, cy * 2, cw * 2, ch * 2, x + cx * k, y + cy * k, cw * k, ch * k); }
    else ctx.drawImage(img, x, y, img.width / 2 * k, img.height / 2 * k);
    ctx.restore();
  }
  function stage(ctx, t, o = {}) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#F2F3F5'); g.addColorStop(1, '#E2E3E7'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const lx = o.lightX ?? 960, r = ctx.createRadialGradient(lx, -100, 0, lx, -100, 1100); r.addColorStop(0, 'rgba(255,255,255,0.8)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
    // a fine 12-column guide, as in the app's editorial template
    if (o.grid !== false) { ctx.save(); ctx.strokeStyle = 'rgba(11,11,13,0.045)'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i <= 12; i++) { const x = Math.round(120 + i * (W - 240) / 12) + 0.5; ctx.moveTo(x, 0); ctx.lineTo(x, H); } ctx.stroke(); ctx.restore(); }
  }
  // orange viewfinder corners around a box; p 0..1 snaps them in from further out
  function corners(ctx, x, y, w, h, p, o = {}) {
    const len = o.len ?? 46, lw = o.lw ?? 6, off = (1 - Ease.outBack(clamp(p), 1.6)) * (o.from ?? 140);
    ctx.save(); ctx.globalAlpha *= clamp(p * 3) * (o.alpha ?? 1); ctx.strokeStyle = o.color || '#FF5A1F'; ctx.lineWidth = lw; ctx.lineCap = 'square';
    const c = [[x - off, y - off, 1, 1], [x + w + off, y - off, -1, 1], [x + w + off, y + h + off, -1, -1], [x - off, y + h + off, 1, -1]];
    for (const [cx, cy, sx, sy] of c) { ctx.beginPath(); ctx.moveTo(cx, cy + sy * len); ctx.lineTo(cx, cy); ctx.lineTo(cx + sx * len, cy); ctx.stroke(); }
    ctx.restore();
  }
  // a browser window around a capture: bar with lights and the file name; returns the content box
  function windowFrame(ctx, x, y, w, h, o = {}) {
    const bar = o.bar ?? 44;
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
    ctx.shadowColor = 'rgba(11,11,13,0.28)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 28;
    rr(ctx, x, y, w, h + bar, 14); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#D4D5DA'; ctx.lineWidth = 1.5; ctx.stroke();
    const g = ctx.createLinearGradient(0, y, 0, y + bar); g.addColorStop(0, '#FAFAFB'); g.addColorStop(1, '#ECEDF0');
    ctx.save(); rr(ctx, x, y, w, h + bar, 14); ctx.clip(); ctx.fillStyle = g; ctx.fillRect(x, y, w, bar); ctx.restore();
    ['#FF5F57', '#FEBC2E', '#28C840'].forEach((c, i) => { ctx.fillStyle = c; circle(ctx, x + 22 + i * 20, y + bar / 2, 6); ctx.fill(); });
    if (o.title) { const tw = Math.min(w * 0.5, 420); rr(ctx, x + w / 2 - tw / 2, y + 9, tw, bar - 18, 7); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.strokeStyle = '#E2E3E7'; ctx.stroke();
      ctx.fillStyle = '#62636B'; ctx.font = `500 ${Math.round(bar * 0.36)}px ${FAM.mono}`; ctx.textAlign = 'center'; ctx.fillText(o.title, x + w / 2, y + bar * 0.64); }
    ctx.restore();
    return { x, y: y + bar, w, h };
  }
  function wordmark(ctx, x, y, size, o = {}) {
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.font = `900 ${size}px ${FAM.display}`; ctx.textBaseline = 'alphabetic'; if ('letterSpacing' in ctx) ctx.letterSpacing = `${-0.05 * size}px`;
    const w = ctx.measureText('Frame').width, x0 = o.align === 'center' ? x - (w + size * 0.2) / 2 : x;
    ctx.fillStyle = '#0B0B0D'; ctx.fillText('Frame', x0, y);
    const d = o.dot ?? 1; ctx.fillStyle = '#FF5A1F'; ctx.fillRect(x0 + w + size * 0.03, y - size * 0.17 * d, size * 0.17 * d, size * 0.17 * d);
    ctx.restore(); return w;
  }
  function label(ctx, s, x, y, o = {}) {
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.font = `${o.weight || 600} ${o.size || 22}px ${FAM.mono}`; ctx.fillStyle = o.color || '#5A5B63';
    const ls = (o.size || 22) * 0.16; let w = 0; for (const ch of s) w += ctx.measureText(ch).width + ls; w -= ls;
    let cx = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x; for (const ch of s) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + ls; }
    ctx.restore(); return w;
  }
  function headline(ctx, lines, x, y, lt, o = {}) {
    const size = o.size || 100, gap = o.gap ?? size * 1.14;
    lines.forEach((s, i) => kinetic(ctx, s, x, y + i * gap, lt - (o.step ?? 0.3) * i, { size, fam: 'display', weight: 900, color: (o.colors || ['#0B0B0D', '#FF5A1F'])[i], ls: -0.045 * size,
      stagger: 0.026, dur: 0.5, rise: 0.45 * size, blur: 6, align: o.align, out: o.out, alpha: o.alpha }));
  }
  // the portfolio's chrome-ball avatar (cropped from the preview, clipped to its disc), centred at (x, y), d across
  function ball(ctx, x, y, d, o = {}) {
    const { img } = layer('view_3'); if (!img) return;
    const C = [100.5, 131.5], R = 39, k = d / (2 * R);
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
    ctx.shadowColor = 'rgba(11,11,13,0.22)'; ctx.shadowBlur = 30 * k; ctx.shadowOffsetY = 12 * k;
    ctx.beginPath(); ctx.arc(x, y, R * k, 0, Math.PI * 2); ctx.fillStyle = '#F3F3F3'; ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.clip(); ctx.drawImage(img, (C[0] - R) * 2, (C[1] - R) * 2, R * 4, R * 4, x - R * k, y - R * k, 2 * R * k, 2 * R * k);
    ctx.restore();
  }
  window.FRAME = { layer, draw, stage, corners, windowFrame, wordmark, label, headline, ball };
})();
