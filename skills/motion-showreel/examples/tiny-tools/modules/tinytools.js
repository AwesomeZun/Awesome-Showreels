// tinytools: the tiny.tools reel's shared kit (a project module). The stage is the app's near-black with its violet
// glow and its top strip (ALL LOCAL · NO SERVER · NO TRACKING); the logo is the app's own SVG (Logo in Shell.tsx:
// a violet-to-lilac rounded square with a white t and a dot); headlines are the app's hero type (800, -0.055em) with
// its lilac caret. Captures are the real app at 2x.
(() => {
  const TOOLS = [['01', 'JSON', 'CORE'], ['02', '컬러', 'CORE'], ['03', '텍스트 비교', 'CORE'], ['04', 'Base64', 'ENCODE'], ['05', 'URL', 'ENCODE'], ['06', 'JWT', 'ENCODE'], ['07', '해시', 'ENCODE'],
    ['08', '정규식', 'TEXT'], ['09', '케이스 변환', 'TEXT'], ['10', '글자 수', 'TEXT'], ['11', '타임스탬프', 'TIME'], ['12', 'cron 설명', 'TIME'], ['13', 'UUID', 'GENERATE'], ['14', '한글 Lorem', 'GENERATE']];
  function draw(ctx, name, x, y, k = 1, o = {}) {
    const img = IMG['captures/ui/app/' + name]; if (!img) return; const j = ASSET('captures/ui/app/' + name + '.json'), d = img.width / j.rect.w;
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
    if (o.crop) { const [cx, cy, cw, ch] = o.crop; ctx.drawImage(img, cx * d, cy * d, cw * d, ch * d, x, y, cw * k, ch * k); } else ctx.drawImage(img, x, y, j.rect.w * k, j.rect.h * k);
    ctx.restore();
  }
  let noise = null;
  function noiseTile() { if (noise) return noise; const b = makeBuf(200, 200), id = b.g.createImageData(200, 200);
    for (let i = 0; i < 40000; i++) { const v = hash(i * 1.71 + 3) * 255; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 14; } b.g.putImageData(id, 0, 0); return (noise = b.c); }
  // the stage: near-black, a violet glow, a fine grain, the app's top strip
  function stage(ctx, t, o = {}) {
    ctx.fillStyle = '#07070B'; ctx.fillRect(0, 0, W, H);
    const gx = o.glowX ?? 1400, gy = o.glowY ?? 300, g = ctx.createRadialGradient(gx, gy, 0, gx, gy, o.glowR ?? 1000);
    g.addColorStop(0, 'rgba(91,69,240,0.32)'); g.addColorStop(0.5, 'rgba(91,69,240,0.1)'); g.addColorStop(1, 'rgba(91,69,240,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.fillStyle = ctx.createPattern(noiseTile(), 'repeat'); ctx.fillRect(0, 0, W, H); ctx.restore();
    if (o.strip !== false) { ctx.fillStyle = '#0B0B12'; ctx.fillRect(0, 0, W, 44); ctx.fillStyle = 'rgba(255,255,255,0.075)'; ctx.fillRect(0, 44, W, 1);
      ctx.font = `600 16px ${FAM.mono}`; ctx.fillStyle = '#908CB1'; spaced(ctx, 'TOYZ', 28, 28, 16, 0.14);
      ctx.save(); ctx.fillStyle = '#58E3A6'; ctx.shadowColor = '#58E3A6'; ctx.shadowBlur = 8; circle(ctx, W / 2 - 200, 22, 4); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#BDB9DC'; spaced(ctx, 'ALL LOCAL · NO SERVER · NO TRACKING', W / 2 - 184, 28, 16, 0.14); ctx.fillStyle = '#908CB1'; spaced(ctx, 'TINY.TOOLS / V1.0', W - 28, 28, 16, 0.14, 'right'); }
  }
  function spaced(ctx, s, x, y, size, ls, align) { let w = 0; for (const ch of s) w += ctx.measureText(ch).width + size * ls; w -= size * ls;
    let cx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x; for (const ch of s) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + size * ls; } return w; }
  function label(ctx, s, x, y, o = {}) { ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.font = `${o.weight || 600} ${o.size || 22}px ${FAM.mono}`; ctx.fillStyle = o.color || '#908CB1';
    const w = spaced(ctx, s, x, y, o.size || 22, 0.14, o.align); ctx.restore(); return w; }
  // the app's logo (viewBox 32) at (x, y), size s
  function logo(ctx, x, y, s, o = {}) {
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.translate(x, y); ctx.scale(s / 32, s / 32);
    ctx.shadowColor = 'rgba(91,69,240,0.45)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6;
    const g = ctx.createLinearGradient(1, 1, 31, 31); g.addColorStop(0, '#5B45F0'); g.addColorStop(1, '#A89BFF'); rr(ctx, 1, 1, 30, 30, 8); ctx.fillStyle = g; ctx.fill(); ctx.shadowColor = 'transparent';
    const h = ctx.createLinearGradient(0, 1, 0, 31); h.addColorStop(0, 'rgba(255,255,255,0.55)'); h.addColorStop(0.5, 'rgba(255,255,255,0)'); rr(ctx, 1, 1, 30, 30, 8); ctx.fillStyle = h; ctx.fill();
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(11, 8.5); ctx.lineTo(11, 20.7); ctx.bezierCurveTo(11, 22.6, 12, 23.5, 13.8, 23.5); ctx.lineTo(16, 23.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(7.5, 13); ctx.lineTo(15.5, 13); ctx.stroke(); ctx.fillStyle = '#FFFFFF'; circle(ctx, 22.5, 21.5, 2.4 * (o.dot ?? 1)); ctx.fill(); ctx.restore();
  }
  // the word mark: tiny.tools with the lilac dot
  function word(ctx, x, y, size, o = {}) { ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.font = `800 ${size}px ${FAM.display}`; ctx.textAlign = 'left';
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${-0.05 * size}px`; const a = ctx.measureText('tiny').width, b = ctx.measureText('.').width, w = a + b + ctx.measureText('tools').width;
    const x0 = o.align === 'center' ? x - w / 2 : x; ctx.fillStyle = '#F4F3FF'; ctx.fillText('tiny', x0, y); ctx.fillStyle = '#A89BFF'; ctx.fillText('.', x0 + a, y); ctx.fillStyle = '#F4F3FF'; ctx.fillText('tools', x0 + a + b, y);
    ctx.restore(); return w; }
  // headline lines in the app's hero type; o.caret puts the lilac caret after the last line (blinking)
  function headline(ctx, lines, x, y, lt, o = {}) { const size = o.size || 96, gap = o.gap ?? size * 1.08; let end = 0;
    lines.forEach((s, i) => { const w = kinetic(ctx, s, x, y + i * gap, lt - (o.step ?? 0.2) * i, { size, fam: 'display', weight: 800, color: o.color || '#F4F3FF', ls: -0.055 * size, stagger: o.stagger ?? 0.022, dur: 0.42, rise: 0.36 * size, blur: 6, align: o.align, out: o.out }); if (i === lines.length - 1) end = w; });
    if (o.caret) { const n = [...lines[lines.length - 1]].length, at = (o.step ?? 0.2) * (lines.length - 1) + n * (o.stagger ?? 0.022) + 0.3, on = lt > at && (Math.floor((lt - at) / 0.55) % 2 === 0);
      if (on && !(o.out && lt > o.out.at)) { const cx = (o.align === 'center' ? x + end / 2 : x + end) + 0.06 * size, cy = y + (lines.length - 1) * gap;
        ctx.save(); ctx.fillStyle = '#A89BFF'; ctx.shadowColor = 'rgba(168,155,255,0.6)'; ctx.shadowBlur = 18; ctx.fillRect(cx, cy - 0.11 * size, 0.42 * size, 0.11 * size); ctx.restore(); } } }
  // a key cap (⌘, V, ↵ …)
  function key(ctx, s, x, y, h, press = 0, o = {}) { ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.font = `700 ${h * 0.42}px ${FAM.mono}`; const w = Math.max(h, ctx.measureText(s).width + h * 0.6);
    ctx.translate(x, y + press * h * 0.08); ctx.fillStyle = '#1C1A2E'; rr(ctx, -w / 2, -h / 2 + h * 0.1, w, h, h * 0.22); ctx.fill();
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, '#2E2A4A'); g.addColorStop(1, '#1E1B33'); ctx.fillStyle = g; rr(ctx, -w / 2, -h / 2 - (1 - press) * h * 0.06, w, h * 0.94, h * 0.22); ctx.fill();
    ctx.strokeStyle = 'rgba(207,199,255,0.35)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillStyle = '#F4F3FF'; ctx.textAlign = 'center'; ctx.fillText(s, 0, h * 0.13 - (1 - press) * h * 0.03); ctx.restore(); return w; }
  window.TT = { TOOLS, draw, stage, spaced, label, logo, word, headline, key };
})();
