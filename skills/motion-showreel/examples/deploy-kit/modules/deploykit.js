// deploykit: the Deploy Kit reel's shared kit (a project module). The launch bench stage (the app's #ECEEF5 with a fine
// grid), the captured panels, the kit's own file list (read from the app's output tray, files.txt, plus its six image
// assets), mono file chips, the ZIP crate and the two-line headline (second line electric blue).
(() => {
  const meta = {};
  function layer(name) {
    const has = (n) => ('captures/ui/app/' + n + '.json') in ASSETS;
    if (!meta[name]) meta[name] = has(name) ? ASSET('captures/ui/app/' + name + '.json') : null;
    const j = meta[name], L = j && j.layers ? j.layers[0] : j;
    return { img: IMG['captures/ui/app/' + name], L, w: L ? L.rect.w : 0, h: L ? L.rect.h : 0 };
  }
  function draw(ctx, name, x, y, k = 1, o = {}) {
    const { img, L } = layer(name); if (!img) return;
    const d = L ? img.width / L.rect.w : 2;
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
    if (o.crop) { const [cx, cy, cw, ch] = o.crop; ctx.drawImage(img, cx * d, cy * d, cw * d, ch * d, x, y, cw * k, ch * k); }
    else ctx.drawImage(img, x, y, img.width / d * k, img.height / d * k);
    ctx.restore();
  }
  let F = null;
  function files() {
    if (F) return F;
    const lines = (ASSET('captures/ui/app/files.txt') || '').split('\n').map(s => s.trim()).filter(Boolean), out = [];
    for (let i = 0; i + 1 < lines.length; i += 2) out.push(lines[i]);
    F = out.concat(['og.png', 'favicon.svg', 'favicon-32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png']);
    return F;
  }
  function stage(ctx, t, o = {}) {
    ctx.fillStyle = '#ECEEF5'; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(o.glowX ?? 1500, -100, 0, o.glowX ?? 1500, -100, 1100); g.addColorStop(0, 'rgba(255,255,255,0.85)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.strokeStyle = 'rgba(10,11,16,0.05)'; ctx.lineWidth = 1; ctx.beginPath();
    const off = (t * (o.drift ?? 0)) % 48; for (let x = 0; x < W; x += 48) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); } for (let y = -48 + off; y < H; y += 48) { ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(W, Math.round(y) + 0.5); }
    ctx.stroke(); ctx.restore();
    // the app's top strip: SHIP CLUB — DEPLOY KIT · LAUNCH BENCH
    if (o.strip !== false) { ctx.fillStyle = '#0A0B10'; ctx.fillRect(0, 0, W, 34); label(ctx, 'SHIP CLUB — DEPLOY KIT · LAUNCH BENCH', 960, 23, { size: 14, align: 'center', color: '#8A8FA0' });
      ctx.fillStyle = '#D4FF3A'; circle(ctx, W - 120, 17, 4); ctx.fill(); label(ctx, 'LIVE', W - 108, 23, { size: 14, color: '#C9CCD6' }); }
  }
  // a file chip: mono name on a white card with a blue tick
  function chip(ctx, name, x, y, s = 1, o = {}) {
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(s, s);
    ctx.font = `600 22px ${FAM.mono}`; const w = ctx.measureText(name).width + 60;
    ctx.shadowColor = 'rgba(10,11,16,0.16)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
    rr(ctx, -w / 2, -22, w, 44, 10); ctx.fillStyle = o.dark ? '#0A0B10' : '#FFFFFF'; ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.strokeStyle = o.dark ? 'rgba(255,255,255,0.12)' : '#DCDFE8'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#0B2FE6'; rr(ctx, -w / 2 + 14, -7, 14, 14, 3); ctx.fill();
    ctx.fillStyle = o.dark ? '#E9EBF2' : '#0A0B10'; ctx.textBaseline = 'middle'; ctx.fillText(name, -w / 2 + 40, 1);
    ctx.restore(); return w * s;
  }
  // the ZIP crate: a blue box with a zipper down the front, the name on its label and a count
  function crate(ctx, x, y, s, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.shadowColor = 'rgba(11,47,230,0.35)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 24;
    const g = ctx.createLinearGradient(0, -170, 0, 170); g.addColorStop(0, '#2748FF'); g.addColorStop(1, '#0720B0');
    rr(ctx, -200, -170, 400, 340, 28); ctx.fillStyle = g; ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.save(); rr(ctx, -200, -170, 400, 340, 28); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(-200, -170, 400, 60); ctx.restore();
    // zipper
    const open = o.open ?? 0;
    for (let i = 0; i < 14; i++) { const yy = -150 + i * 20, dx = (i % 2 ? 1 : -1) * (5 + open * (1 - i / 14) * 30);
      ctx.fillStyle = '#C9D2FF'; ctx.fillRect(-4 + dx - 6, yy, 12, 10); }
    ctx.fillStyle = '#FFFFFF'; ctx.font = `900 96px ${FAM.display}`; ctx.textAlign = 'center'; ctx.fillText('ZIP', 0, 70);
    if (o.count !== undefined) { rr(ctx, 110, -150, 76, 54, 12); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.fillStyle = '#0B2FE6'; ctx.font = `800 34px ${FAM.mono}`; ctx.fillText(String(o.count), 148, -111); }
    if (o.name) { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = `600 22px ${FAM.mono}`; ctx.fillText(o.name, 0, 130); }
    ctx.restore();
  }
  function label(ctx, s, x, y, o = {}) {
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.font = `${o.weight || 600} ${o.size || 22}px ${FAM.mono}`; ctx.fillStyle = o.color || '#5C6172'; ctx.textBaseline = 'alphabetic';
    const ls = (o.size || 22) * 0.16; let w = 0; for (const ch of s) w += ctx.measureText(ch).width + ls; w -= ls;
    let cx = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x; for (const ch of s) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + ls; }
    ctx.restore(); return w;
  }
  function headline(ctx, lines, x, y, lt, o = {}) {
    const size = o.size || 100, gap = o.gap ?? size * 1.14;
    lines.forEach((s, i) => kinetic(ctx, s, x, y + i * gap, lt - (o.step ?? 0.22) * i, { size, fam: 'display', weight: 900, color: (o.colors || ['#0A0B10', '#0B2FE6'])[i], ls: -0.045 * size,
      stagger: 0.02, dur: 0.4, rise: 0.45 * size, blur: 5, align: o.align, out: o.out, alpha: o.alpha }));
  }
  window.DK = { layer, draw, files, stage, chip, crate, label, headline };
})();
