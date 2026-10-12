// readroom: the Read Room reel's shared kit (a project module). The desk, and the app's real essay page drawn twice:
// once with every reader's highlight hidden (paper_plain) and once as the app shows it (paper). A highlight "draws on"
// by revealing the real page inside the real line boxes the app gave each mark (geo.txt), left to right at pen speed.
// The page moves under a camera {y: the page line at the top of the view, s: scale}.
(() => {
  const meta = {};
  function layer(name) {
    const has = (n) => ('captures/ui/app/' + n + '.json') in ASSETS, base = name.replace(/_\d+$/, '');
    if (!meta[name]) meta[name] = has(name) ? ASSET('captures/ui/app/' + name + '.json') : has(base) ? ASSET('captures/ui/app/' + base + '.json') : null;
    const j = meta[name], L = j && j.layers ? (j.layers.find(l => l.file === name + '.png' || l.file === name + '.webp') || j.layers[0]) : j;
    return { img: IMG['captures/ui/app/' + name], L };
  }
  function draw(ctx, name, x, y, k = 1, o = {}) {
    const { img, L } = layer(name); if (!img) return;
    const d = L ? img.width / L.rect.w : 2;
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
    if (o.crop) { const [cx, cy, cw, ch] = o.crop; ctx.drawImage(img, cx * d, cy * d, cw * d, ch * d, x, y, cw * k, ch * k); }
    else ctx.drawImage(img, x, y, img.width / d * k, img.height / d * k);
    ctx.restore();
  }
  let G = null; const geo = () => (G || (G = JSON.parse(ASSET('captures/ui/app/geo.txt'))));
  // marks in page-layer coordinates (the layer adds 24 px of padding around the sheet)
  function marks() { return geo().marks.map(m => ({ ...m, x: m.x + 24, y: m.y + 24 })); }
  function desk(ctx, t) {
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#E9EAEC'); g.addColorStop(1, '#D9DBDF'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const r = ctx.createRadialGradient(700, 200, 0, 700, 200, 1200); r.addColorStop(0, 'rgba(255,255,255,0.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
  }
  // the page at (x, y0) on screen, scale s, page line cy at the top; marks: {hlName: progress 0..1}
  function page(ctx, x, y0, s, cy, viewH, prog = {}, o = {}) {
    const { L } = layer('paper'), w = L.rect.w, h = Math.min(L.rect.h - cy, viewH / s);
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
    ctx.shadowColor = 'rgba(23,25,29,0.18)'; ctx.shadowBlur = 50 * s; ctx.shadowOffsetY = 20 * s; ctx.fillStyle = '#FBFBFA';
    rr(ctx, x + 24 * s, y0 + Math.max(0, 24 - cy) * s, (w - 48) * s, (h - Math.max(0, 24 - cy)) * s, 6 * s); ctx.fill(); ctx.restore();
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
    draw(ctx, o.full ? 'paper' : 'paper_plain', x, y0, s, { crop: [0, cy, w, h] });
    if (!o.full) for (const m of marks()) {
      const key = m.hl.split(' ').pop(), p = prog[key] ?? (o.allOn ? 1 : 0); if (p <= 0) continue;
      // the line's share of the mark's progress: lines of one mark draw one after another
      const lines = marks().filter(n => n.hl.split(' ').pop() === key), i = lines.indexOf(lines.find(n => n.x === m.x && n.y === m.y)), per = 1 / lines.length;
      const q = clamp((p - i * per) / per); if (q <= 0) continue;
      const sy = y0 + (m.y - 3 - cy) * s; if (sy < y0 - 40 || sy > y0 + viewH) continue;
      ctx.save(); ctx.beginPath(); ctx.rect(x + (m.x - 3) * s, sy, (m.w + 6) * q * s, (m.h + 6) * s); ctx.clip();
      draw(ctx, 'paper', x, y0, s, { crop: [0, cy, w, h] }); ctx.restore();
      if (q < 1) { ctx.fillStyle = '#17191D'; ctx.fillRect(x + (m.x + m.w * q) * s, sy + 2 * s, 2.5, (m.h + 2) * s); }
    }
    ctx.restore();
  }
  function label(ctx, s, x, y, o = {}) {
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.font = `${o.weight || 600} ${o.size || 22}px ${FAM.mono}`; ctx.fillStyle = o.color || '#585D66';
    const ls = (o.size || 22) * 0.16; let w = 0; for (const ch of s) w += ctx.measureText(ch).width + ls; w -= ls;
    let cx = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x; for (const ch of s) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + ls; }
    ctx.restore(); return w;
  }
  // a headline line with an orange highlighter swept behind it (the app's hero treatment); returns its width
  function marker(ctx, s, x, y, size, lt, o = {}) {
    ctx.save(); ctx.font = `900 ${size}px ${FAM.display}`; if ('letterSpacing' in ctx) ctx.letterSpacing = `${-0.045 * size}px`; const w = ctx.measureText(s).width; ctx.restore();
    const p = Ease.ioC(clamp((lt - (o.markAt ?? 0.4)) / (o.markDur ?? 0.5))), x0 = o.align === 'center' ? x - w / 2 : x;
    if (p > 0) { ctx.save(); ctx.globalAlpha *= (o.alpha ?? 1) * 0.92; ctx.fillStyle = o.markColor || '#FF9A3D'; ctx.beginPath();
      ctx.moveTo(x0 - 8, y - size * 0.36); ctx.lineTo(x0 - 8 + (w + 20) * p, y - size * 0.39); ctx.lineTo(x0 - 8 + (w + 20) * p, y + size * 0.1); ctx.lineTo(x0 - 8, y + size * 0.12); ctx.closePath(); ctx.fill(); ctx.restore(); }
    kinetic(ctx, s, x, y, lt, { size, fam: 'display', weight: 900, color: '#17191D', ls: -0.045 * size, stagger: 0.028, dur: 0.55, rise: 0.4 * size, blur: 6, align: o.align, out: o.out, alpha: o.alpha });
    return w;
  }
  window.RR = { layer, draw, geo, marks, desk, page, label, marker };
})();
