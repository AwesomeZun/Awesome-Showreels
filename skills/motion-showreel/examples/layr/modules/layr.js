// layr: the LAYR reel's shared kit (a project module). The stage is the app's near-black with a soft steel light; the
// glass layer stack is the app's own hero drawing (LayerStack.tsx: five isometric plates, their glass and edge
// gradients, the memo chips on them, the numbered labels) ported to canvas with its drop-in timing (each plate falls
// 34 px and fades in over 0.85 s on cubic-bezier(0.16, 0.84, 0.3, 1), the bottom one first); the brand mark is
// Brand.tsx. The notes, the projects and the layer each note landed on are the app's own result after 모두 수락
// (captured as state_projects.txt).
(() => {
  const meta = {};
  function layer(name) {
    const has = (n) => ('captures/ui/app/' + n + '.json') in ASSETS;
    if (!meta[name]) meta[name] = has(name) ? ASSET('captures/ui/app/' + name + '.json') : null;
    const j = meta[name], L = j && j.layers ? j.layers[0] : j;
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
  // the app's data after 모두 수락: projects (name, colour, keywords) and every note with its project and layer
  let S = null;
  function state() {
    if (S) return S;
    const d = JSON.parse(ASSET('captures/ui/app/state_projects.txt'));
    const clean = (s) => s.replace(/- \[[ x]\] /g, '').replace(/\*\*/g, '').replace(/#\S+/g, '').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim();
    d.notes.forEach((n, i) => { n.i = i; n.short = clean(n.text); n.p = d.projects.findIndex(p => p.id === n.projectId); });
    return (S = d);
  }
  const PCOL = ['#9FB0C8', '#E2C69A', '#8CCFDB'], INBOX = '#5E6675';
  const LAYERS = [['context', '배경 · 문제', '배경', '왜 시작했는지, 무엇이 불편한지'], ['idea', '아이디어', '아이디어', '해 보고 싶은 기능과 방향'], ['todo', '할 일', '할 일', '다음에 실제로 움직일 것'],
    ['reference', '참고', '참고', '링크, 자료, 남이 만든 것'], ['question', '질문', '질문', '아직 답을 정하지 못한 것']];
  const LCOL = ['#E6EBF2', '#B9C6D8', '#8C9BB2', '#64728A', '#434D5E'];
  // the stage: near-black, a soft steel light, a faint drifting dot grid
  function stage(ctx, t, o = {}) {
    ctx.fillStyle = '#0B0B0C'; ctx.fillRect(0, 0, W, H);
    const lx = o.lightX ?? 1400, ly = o.lightY ?? 300, r = ctx.createRadialGradient(lx, ly, 0, lx, ly, o.lightR ?? 1100);
    r.addColorStop(0, 'rgba(86,99,122,0.38)'); r.addColorStop(0.5, 'rgba(42,47,58,0.22)'); r.addColorStop(1, 'rgba(11,11,12,0)');
    ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.fillStyle = 'rgba(201,211,227,0.07)'; const off = (t * 8) % 40;
    for (let y = 20 - off; y < H; y += 40) for (let x = 20 - off; x < W; x += 40) ctx.fillRect(Math.round(x), Math.round(y), 1.5, 1.5);
    ctx.restore();
  }
  // the app's metal gradient (125deg: #14171D, #2A2F3A 36%, #56637A 70%, #9FB0C8) on a rounded card
  function metal(ctx, x, y, w, h, r = 18, o = {}) {
    const a = 125 * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a), L = (Math.abs(w * dx) + Math.abs(h * dy)) / 2, cx = x + w / 2, cy = y + h / 2;
    const g = ctx.createLinearGradient(cx - dx * L, cy - dy * L, cx + dx * L, cy + dy * L);
    g.addColorStop(0, '#14171D'); g.addColorStop(0.36, '#2A2F3A'); g.addColorStop(0.7, '#56637A'); g.addColorStop(1, '#9FB0C8');
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; rr(ctx, x, y, w, h, r); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
  }
  // the glass layer stack (LayerStack.tsx, viewBox 420 x 320, CX 150, plate half-width 124, half-height 58, thickness 6),
  // its top-left at (x, y), k px per unit. o.drop(i) -> 0..1 drop-in progress of plate i, o.gap extra spacing between
  // plates (units), o.chips[i] = [[u, v, s, hot], ...], o.labels false hides labels, o.label(i) -> text after the number,
  // o.count(i) -> a number shown at the end of the label, o.hot -> index of the plate to light in lime.
  const CX = 150, PW = 124, PH = 58, PT = 6, YS = [78, 118, 158, 198, 238], LW = [62, 86, 62, 62, 62];
  const CHIPS = [[[-0.5, -0.3, 14], [0.2, -0.5, 12], [0.1, 0.3, 16, 1]], [[-0.2, 0.5, 13]], [[0.5, 0.4, 12]], [[-0.5, 0.5, 12]], [[0.4, 0.6, 14]]];
  const dropEase = (p) => bez(0.16, 0.84, 0.3, 1)(clamp(p));
  const _bz = {}; function bez(x1, y1, x2, y2) { const key = [x1, y1, x2, y2].join(); if (_bz[key]) return _bz[key];
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const X = (t) => ((ax * t + bx) * t + cx) * t, Y = (t) => ((ay * t + by) * t + cy) * t, dX = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return (_bz[key] = (x) => { let t = x; for (let i = 0; i < 8; i++) { const d = X(t) - x, s = dX(t); if (Math.abs(d) < 1e-5 || Math.abs(s) < 1e-6) break; t -= d / s; } return Y(clamp(t)); }); }
  function plateY(i, o = {}) { return YS[i] + (o.gap || 0) * (i - 2) * 1; }
  function stack(ctx, x, y, k, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    for (let i = 4; i >= 0; i--) {
      const p = o.drop ? clamp(o.drop(i)) : 1; if (p <= 0) continue;
      const e = dropEase(p), py = plateY(i, o) - 34 * (1 - e);
      ctx.save(); ctx.globalAlpha *= e * (o.alpha ?? 1);
      const top = [[CX, py - PH], [CX + PW, py], [CX, py + PH], [CX - PW, py]];
      const poly = (pts, fill, a = 1) => { ctx.beginPath(); pts.forEach(([u, v], j) => j ? ctx.lineTo(u, v) : ctx.moveTo(u, v)); ctx.closePath(); ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = fill; ctx.fill(); ctx.restore(); };
      poly([[CX - PW, py], [CX, py + PH], [CX, py + PH + PT], [CX - PW, py + PT]], '#161A21', 0.9);
      poly([[CX, py + PH], [CX + PW, py], [CX + PW, py + PT], [CX, py + PH + PT]], '#232935', 0.9);
      const isTop = i === 0, hot = o.hot === i;
      const g = ctx.createLinearGradient(CX - PW, py - PH, CX + PW, py + PH);
      if (isTop || hot) { g.addColorStop(0, 'rgba(238,242,248,0.9)'); g.addColorStop(0.45, 'rgba(159,176,200,0.55)'); g.addColorStop(1, 'rgba(42,47,58,0.5)'); }
      else { g.addColorStop(0, 'rgba(159,176,200,0.34)'); g.addColorStop(1, 'rgba(42,47,58,0.28)'); }
      poly(top, g);
      const eg = ctx.createLinearGradient(CX - PW, 0, CX + PW, 0); eg.addColorStop(0, 'rgba(255,255,255,0.9)'); eg.addColorStop(0.5, 'rgba(159,176,200,0.5)'); eg.addColorStop(1, 'rgba(255,255,255,0.15)');
      ctx.beginPath(); top.forEach(([u, v], j) => j ? ctx.lineTo(u, v) : ctx.moveTo(u, v)); ctx.closePath(); ctx.strokeStyle = hot ? '#D9F55B' : eg; ctx.lineWidth = hot ? 1.6 : 1; ctx.stroke();
      // chips on the plate
      (o.chips ? o.chips[i] : CHIPS[i]).forEach(([u, v, s, h, a = 1]) => {
        const cx = CX + (u - v) * PW * 0.5, cy = py + (u + v) * PH * 0.5;
        ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.5); ctx.lineTo(cx + s, cy); ctx.lineTo(cx, cy + s * 0.5); ctx.lineTo(cx - s, cy); ctx.closePath();
        ctx.save(); ctx.globalAlpha *= (isTop || hot || o.bright ? 0.95 : 0.5) * a; ctx.fillStyle = h ? '#D9F55B' : '#E6EBF2'; ctx.fill(); ctx.restore();
      });
      if (o.labels !== false) {
        const txt = o.label ? o.label(i) : LAYERS[i][2], cnt = o.count ? o.count(i) : null;
        ctx.font = `650 12px ${FAM.sans}`; const tw = ctx.measureText(txt).width;
        ctx.font = `500 10.5px ${FAM.mono}`; const nw = ctx.measureText('00 ').width, cw = cnt != null ? ctx.measureText(' ' + cnt).width + 4 : 0;
        const lw = Math.max(LW[i], 9 + nw + tw + cw + 9);
        ctx.strokeStyle = 'rgba(230,235,242,0.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(CX + PW, py); ctx.lineTo(CX + PW + 20, py); ctx.stroke();
        rr(ctx, CX + PW + 20, py - 11, lw, 22, 5); ctx.fillStyle = 'rgba(11,11,12,0.74)'; ctx.fill(); ctx.strokeStyle = hot ? '#D9F55B' : 'rgba(255,255,255,0.2)'; ctx.stroke();
        ctx.fillStyle = '#9FB0C8'; ctx.fillText(String(i + 1).padStart(2, '0'), CX + PW + 29, py + 4);
        ctx.font = `650 12px ${FAM.sans}`; ctx.fillStyle = '#FFFFFF'; ctx.fillText(txt, CX + PW + 29 + nw, py + 4);
        if (cnt != null) { ctx.font = `600 10.5px ${FAM.mono}`; ctx.fillStyle = '#D9F55B'; ctx.fillText(String(cnt), CX + PW + 29 + nw + tw + 6, py + 4); }
      }
      ctx.restore();
    }
    ctx.restore();
  }
  // where (u, v) on plate i sits on screen, for a stack drawn at (x, y, k) with the same o
  function onPlate(i, u, v, x, y, k, o = {}) { const py = plateY(i, o); return [x + (CX + (u - v) * PW * 0.5) * k, y + (py + (u + v) * PH * 0.5) * k]; }
  // the brand mark (Brand.tsx, viewBox 32): three plates stacked, the top one steel, a lime edge
  function mark(ctx, x, y, s, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s / 32, s / 32); ctx.globalAlpha *= o.alpha ?? 1;
    const d = (ty) => { ctx.beginPath(); ctx.moveTo(16, 20.5 + ty); ctx.lineTo(4, 14.5 + ty); ctx.lineTo(16, 8.5 + ty); ctx.lineTo(28, 14.5 + ty); ctx.closePath(); };
    const sp = o.spread ?? 1;
    d(5 * sp); ctx.fillStyle = '#2A2F3A'; ctx.fill(); ctx.strokeStyle = '#6B7A92'; ctx.lineWidth = 0.8; ctx.stroke();
    d(0.5 * sp); ctx.fillStyle = '#4A5467'; ctx.fill(); ctx.strokeStyle = '#9FB0C8'; ctx.stroke();
    const g = ctx.createLinearGradient(4, 4.5 - 4 * sp, 28, 16.5 - 4 * sp); g.addColorStop(0, '#E9EEF6'); g.addColorStop(0.5, '#9FB0C8'); g.addColorStop(1, '#3B4353');
    d(-4 * sp); ctx.fillStyle = g; ctx.fill();
    ctx.beginPath(); ctx.moveTo(4, 14.5 - 4 * sp); ctx.lineTo(16, 8.5 - 4 * sp); ctx.lineTo(28, 14.5 - 4 * sp); ctx.strokeStyle = '#D9F55B'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
    if (o.edge != null) ctx.setLineDash([o.edge * 27, 40]); ctx.stroke(); ctx.restore();
  }
  // a note as the app draws it in lists: dark surface, hairline, a project dot, one line of text (cut with …)
  function note(ctx, s, x, y, w, o = {}) {
    const h = o.h ?? 46, size = o.size ?? 21;
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
    if (o.rot) { ctx.translate(x + w / 2, y + h / 2); ctx.rotate(o.rot); ctx.translate(-x - w / 2, -y - h / 2); }
    rr(ctx, x, y, w, h, 10); ctx.fillStyle = o.fill || '#121317'; ctx.fill(); ctx.strokeStyle = o.stroke || 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = o.dot || INBOX; circle(ctx, x + 18, y + h / 2, 5); ctx.fill();
    ctx.font = `500 ${size}px ${FAM.sans}`; ctx.fillStyle = o.color || '#B7BFCB';
    let t = s; const max = w - 44; if (ctx.measureText(t).width > max) { while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1); t += '…'; }
    ctx.fillText(t, x + 32, y + h / 2 + size * 0.36); ctx.restore();
  }
  function label(ctx, s, x, y, o = {}) {
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.font = `${o.weight || 500} ${o.size || 22}px ${FAM.mono}`; ctx.fillStyle = o.color || '#8D96A5';
    const ls = (o.size || 22) * 0.14; let w = 0; for (const ch of s) w += ctx.measureText(ch).width + ls; w -= ls;
    let cx = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
    if (o.dot) { ctx.save(); ctx.fillStyle = '#D9F55B'; ctx.shadowColor = '#D9F55B'; ctx.shadowBlur = 10; circle(ctx, cx - 18, y - (o.size || 22) * 0.34, 5); ctx.fill(); ctx.restore(); }
    for (const ch of s) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + ls; }
    ctx.restore(); return w;
  }
  // a two-line headline in the app's hero type (850, -0.05em), one colour
  function headline(ctx, lines, x, y, lt, o = {}) {
    const size = o.size || 84, gap = o.gap ?? size * 1.08;
    lines.forEach((s, i) => kinetic(ctx, s, x, y + i * gap, lt - (o.step ?? 0.22) * i, { size, fam: 'display', weight: 850, color: o.color || '#F3F5F8', ls: -0.05 * size,
      stagger: o.stagger ?? 0.026, dur: 0.55, rise: 0.4 * size, blur: 8, align: o.align, out: o.out }));
  }
  window.LAYR = { layer, draw, state, PCOL, INBOX, LAYERS, LCOL, stage, metal, stack, onPlate, plateY, mark, note, label, headline, bez };
})();
