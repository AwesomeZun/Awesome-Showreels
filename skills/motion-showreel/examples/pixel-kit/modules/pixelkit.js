// pixelkit: the PIXEL KIT reel's shared kit (a project module). The app's dark studio (near-black with fine noise and
// an orchid light), its mark (Icon.tsx BrandMark: three chrome pixels and one orchid, the fourth rounded and faint),
// and the wall of six sizes laid out like its consistency board. The designs inside the frames are the app's own
// renderer's output, captured from its consistency board for three sample kits.
(() => {
  const SIZES = [['정사각', '1080×1080'], ['세로', '1080×1350'], ['스토리', '1080×1920'], ['링크 카드', '1200×630'], ['영상 썸네일', '1280×720'], ['가로 배너', '1500×500']];
  // the wall: frame i -> [x, y, w, h] in layout units (1340 x 623), scaled to fit
  const LAY = [[0, 0, 330, 330], [350, 0, 264, 330], [634, 0, 186, 330], [840, 0, 500, 262], [840, 282, 500, 281], [0, 350, 820, 273]];
  function wall(k = 1.075, cx = 960, top = 330) { const W0 = 1340 * k, ox = cx - W0 / 2; return LAY.map(([x, y, w, h]) => [ox + x * k, top + y * k, w * k, h * k]); }
  function img(name) { return IMG['captures/ui/app/' + name]; }
  // a design frame: the capture fitted into [x, y, w, h], with a fine border and shadow; flip in -1..1 squashes it
  function frame(ctx, name, x, y, w, h, o = {}) {
    const im = img(name); if (!im) return; const sx = o.flip != null ? Math.abs(Math.cos(o.flip * Math.PI / 2)) : 1;
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.translate(x + w / 2, y + h / 2); ctx.rotate(o.rot || 0); ctx.scale(sx * (o.s ?? 1), o.s ?? 1);
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18; ctx.fillStyle = '#111013'; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.shadowColor = 'transparent';
    ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1; ctx.strokeRect(-w / 2 + 0.5, -h / 2 + 0.5, w - 1, h - 1);
    if (o.label) { ctx.font = `600 16px ${FAM.mono}`; const tw = ctx.measureText(o.label).width + 16; ctx.fillStyle = 'rgba(11,10,12,0.78)'; rr(ctx, -w / 2 + 8, h / 2 - 34, tw, 26, 5); ctx.fill(); ctx.fillStyle = '#F3EFF4'; ctx.fillText(o.label, -w / 2 + 16, h / 2 - 16); }
    ctx.restore();
  }
  let noise = null; function noiseTile() { if (noise) return noise; const b = makeBuf(180, 180), id = b.g.createImageData(180, 180);
    for (let i = 0; i < 32400; i++) { const v = hash(i * 2.71 + 9) * 255; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 16; } b.g.putImageData(id, 0, 0); return (noise = b.c); }
  function studio(ctx, t, o = {}) { ctx.fillStyle = '#0B0A0C'; ctx.fillRect(0, 0, W, H);
    const gx = (o.gx ?? 1500) + Math.sin(t * 0.4) * 120, gy = (o.gy ?? 200) + Math.cos(t * 0.3) * 60, g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 1100);
    g.addColorStop(0, `rgba(229,181,224,${o.glow ?? 0.16})`); g.addColorStop(1, 'rgba(229,181,224,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.fillStyle = ctx.createPattern(noiseTile(), 'repeat'); ctx.fillRect(0, 0, W, H); ctx.restore(); }
  // the mark (viewBox 32); p 0..1 assembles its four pixels
  function mark(ctx, x, y, s, p = 1, o = {}) {
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.translate(x, y); ctx.scale(s / 32, s / 32);
    const g = ctx.createLinearGradient(0, 0, 32, 32); [[0, '#fbfbfd'], [0.3, '#9d9da8'], [0.55, '#f4f4f7'], [0.8, '#6f6f7a'], [1, '#e9e9ee']].forEach(([q, c]) => g.addColorStop(q, c));
    const cell = (i, cx, cy, r, fill, a = 1) => { const q = clamp(p * 1.6 - i * 0.2), e = Ease.outBack ? Ease.outBack(q) : q; if (q <= 0) return; ctx.save(); ctx.globalAlpha *= a * clamp(q * 2); ctx.translate(cx + 6.5, cy + 6.5); ctx.scale(e, e); rr(ctx, -6.5, -6.5, 13, 13, r); ctx.fillStyle = fill; ctx.fill(); ctx.restore(); };
    cell(0, 2, 2, 2.5, g); cell(1, 17, 2, 2.5, '#e5b5e0'); cell(2, 2, 17, 2.5, g); cell(3, 17, 17, 6.5, g, 0.55); ctx.restore();
  }
  function spaced(ctx, s, x, y, size, ls, align) { let w = 0; for (const ch of s) w += ctx.measureText(ch).width + size * ls; w -= size * ls; let cx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x; for (const ch of s) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + size * ls; } return w; }
  function label(ctx, s, x, y, o = {}) { ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.font = `${o.weight || 600} ${o.size || 20}px ${FAM.mono}`; ctx.fillStyle = o.color || '#958C9B'; const w = spaced(ctx, s, x, y, o.size || 20, 0.14, o.align); ctx.restore(); return w; }
  function headline(ctx, lines, x, y, lt, o = {}) { const size = o.size || 84, gap = o.gap ?? size * 1.12;
    lines.forEach((s, i) => kinetic(ctx, s, x, y + i * gap, lt - (o.step ?? 0.2) * i, { size, fam: 'display', weight: 800, color: o.color || '#F3EFF4', ls: -0.045 * size, stagger: 0.022, dur: 0.45, rise: 0.36 * size, blur: 6, align: o.align, out: o.out })); }
  function draw(ctx, name, x, y, k = 1, o = {}) { const im = img(name); if (!im) return; const g = ASSET('captures/ui/app/' + name.replace(/_\d+$/, '') + '.json'); const r = (g.layers ? g.layers.find(l => l.file === name + '.png') || g.layers[0] : g).rect;
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.drawImage(im, x, y, r.w * k, r.h * k); ctx.restore(); }
  window.PK = { SIZES, LAY, wall, frame, studio, mark, label, headline, draw, spaced };
})();
