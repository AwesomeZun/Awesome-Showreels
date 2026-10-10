// vm: the explainer's kit (a project module). A dark navy page and the tools of a mathematical animation: a coordinate
// plane that draws itself from the middle out and can be carried through any linear map (a 2x2 matrix), arrows that
// grow from the origin, labels on dark backings, text that writes its outlines before it fills, and a small formula
// typesetter whose terms can morph into the next formula (matching terms glide to their new places, the rest fade).
// One colour per kind of meaning. The toy model's numbers come from assets/data/toy.json (model-src/toy.py); the
// probabilities at any temperature are computed here from its scores. Exposes window.VM.
(() => {
  const BG = '#0C1424', INK = '#ECF1F8', DIM = '#A9B6C9', MUTED = '#6F809C', GRID = '#5896DC';
  const KIND = { small: '#A9B6C9', animal: '#83C167', action: '#FC6255', person: '#58C4DD', place: '#F0AC5F' };
  const YELLOW = '#F7D94C', TEAL = '#5CD0B3', PINK = '#E58FB8';
  let D = null;
  const toy = () => (D || (D = ASSET('data/toy.json')));
  const xy = (w) => toy().vocab[w].xy, kindOf = (w) => toy().vocab[w].kind, colOf = (w) => KIND[kindOf(w)] || INK;
  const lerp = (a, b, k) => a + (b - a) * k, lerp2 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  // p(w) = softmax(score / T) over the whole vocabulary
  function probs(T = 1) {
    const sc = toy().scores, ws = Object.keys(sc), m = Math.max(...ws.map(w => sc[w] / T)), e = ws.map(w => Math.exp(sc[w] / T - m)), s = e.reduce((a, b) => a + b, 0);
    const out = {}; ws.forEach((w, i) => (out[w] = e[i] / s)); return out;
  }
  // ───────── the page
  function bg(ctx) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = radial(ctx, W * 0.5, H * 0.46, 0, W * 0.72, [[0, 'rgba(34,58,104,0.34)'], [1, 'rgba(34,58,104,0)']]); ctx.fillRect(0, 0, W, H);
  }
  // ───────── the plane: cam = {ox, oy, u, M}; plane point p -> screen, through the 2x2 matrix M (row-major)
  const CAM = { ox: 960, oy: 585, u: 112 };
  const I2 = [1, 0, 0, 1];
  const mul = (A, B) => [A[0] * B[0] + A[1] * B[2], A[0] * B[1] + A[1] * B[3], A[2] * B[0] + A[3] * B[2], A[2] * B[1] + A[3] * B[3]];
  const rot = (th) => [Math.cos(th), -Math.sin(th), Math.sin(th), Math.cos(th)];
  function S(cam, p) { const M = cam.M || I2, x = M[0] * p[0] + M[1] * p[1], y = M[2] * p[0] + M[3] * p[1]; return [cam.ox + cam.u * x, cam.oy - cam.u * y]; }
  const lerpCam = (a, b, k) => ({ ox: lerp(a.ox, b.ox, k), oy: lerp(a.oy, b.oy, k), u: lerp(a.u, b.u, k), M: (a.M || b.M) ? (a.M || I2).map((v, i) => lerp(v, (b.M || I2)[i], k)) : undefined });
  // the grid: every line grows from the axis outward, the outer ones a little later; axes first and brightest
  function plane(ctx, cam, o = {}) {
    const k = o.k ?? 1, a = o.a ?? 1, R = o.R ?? 15; if (k <= 0 || a <= 0) return;
    ctx.save(); ctx.lineCap = 'butt';
    const seg = (p0, p1, kk, style, lw) => {
      if (kk <= 0) return; const A = S(cam, p0), B = S(cam, p1), m = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], e = Ease.ioC(clamp(kk));
      ctx.strokeStyle = style; ctx.lineWidth = lw; ctx.beginPath();
      ctx.moveTo(m[0] + (A[0] - m[0]) * e, m[1] + (A[1] - m[1]) * e); ctx.lineTo(m[0] + (B[0] - m[0]) * e, m[1] + (B[1] - m[1]) * e); ctx.stroke();
    };
    const minor = rgba(GRID, 0.11 * a), major = rgba(GRID, 0.3 * a);
    for (let i = -R; i < R; i++) {
      const kk = clamp(k * 1.8 - (Math.abs(i + 0.5) / R) * 0.8 - 0.1);
      seg([i + 0.5, -R], [i + 0.5, R], kk, minor, 1); seg([-R, i + 0.5], [R, i + 0.5], kk, minor, 1);
    }
    for (let i = -R; i <= R; i++) {
      if (!i) continue; const kk = clamp(k * 1.8 - (Math.abs(i) / R) * 0.8);
      seg([i, -R], [i, R], kk, major, 1.6); seg([-R, i], [R, i], kk, major, 1.6);
    }
    const ax = rgba(INK, 0.78 * a * (o.axes ?? 1));
    seg([-R, 0], [R, 0], clamp(k * 2.2), ax, 2.6); seg([0, -R], [0, R], clamp(k * 2.2), ax, 2.6);
    ctx.restore();
  }
  // ───────── arrows
  function arrowS(ctx, x0, y0, x1, y1, color, o = {}) {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy); if (L < 0.5) return;
    const w = o.w ?? 5, tl = Math.min(o.tip ?? 24, L * 0.5), tw = tl * 0.86, ux = dx / L, uy = dy / L, bx = x1 - ux * tl, by = y1 - uy * tl;
    ctx.save(); ctx.globalAlpha *= o.a ?? 1; ctx.strokeStyle = ctx.fillStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
    if (o.glow) { ctx.shadowColor = color; ctx.shadowBlur = o.glow; }
    if (o.dash) ctx.setLineDash(o.dash);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(bx + ux * 2, by + uy * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(bx - uy * tw / 2, by + ux * tw / 2); ctx.lineTo(bx + uy * tw / 2, by - ux * tw / 2); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // an arrow in the plane from o.from (default the origin) to p, grown to the fraction o.k (eased here)
  function vec(ctx, cam, p, color, o = {}) {
    const k = o.k ?? 1; if (k <= 0) return null;
    const f = o.from || [0, 0], A = S(cam, f), B = S(cam, p), e = o.raw ? k : Ease.ioC(clamp(k));
    arrowS(ctx, A[0], A[1], A[0] + (B[0] - A[0]) * e, A[1] + (B[1] - A[1]) * e, color, o);
    return [A[0] + (B[0] - A[0]) * e, A[1] + (B[1] - A[1]) * e];
  }
  // ───────── type: KaTeX Main for words, KaTeX Math (an italic face, registered upright) for variables
  const FM = '"KaTeX_Main", serif', FX = '"KaTeX_Math", "KaTeX_Main", serif';
  function font(ctx, o = {}) { const sz = o.size || 32; ctx.font = o.math ? `400 ${sz}px ${FX}` : `${o.it ? 'italic ' : ''}${o.bold ? 700 : 400} ${sz}px ${FM}`; }
  function width(ctx, s, o) { ctx.save(); font(ctx, o); const w = ctx.measureText(s).width; ctx.restore(); return w; }
  function txt(ctx, s, x, y, o = {}) {
    ctx.save(); font(ctx, o); ctx.textAlign = o.align || 'left'; ctx.fillStyle = o.color || INK; ctx.globalAlpha *= o.a ?? 1;
    if (o.glow) { ctx.shadowColor = o.color || INK; ctx.shadowBlur = o.glow; }
    ctx.fillText(s, x, y); ctx.restore();
  }
  // write: each glyph traces its outline (a growing dash on every contour), then fills as the outline fades; the
  // glyphs start one after another (lag = the share of the time over which the starts are spread)
  function write(ctx, s, x, y, p, o = {}) {
    if (p <= 0) return; if (p >= 1) return txt(ctx, s, x, y, o);
    ctx.save(); font(ctx, o); ctx.textAlign = 'left';
    const size = o.size || 32, total = ctx.measureText(s).width, x0 = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
    const n = s.length, lag = o.lag ?? Math.min(0.7, 0.2 + n * 0.02), L = size * 7, color = o.color || INK, ga = ctx.globalAlpha * (o.a ?? 1);
    ctx.lineWidth = Math.max(1, size * 0.032); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineJoin = 'round';
    for (let i = 0; i < n; i++) {
      const ch = s[i]; if (ch === ' ') continue;
      const k = clamp((p - (n > 1 ? i / (n - 1) : 0) * lag) / (1 - lag)); if (k <= 0) continue;
      const xi = x0 + ctx.measureText(s.slice(0, i)).width, ks = Ease.outQ(clamp(k / 0.62)), kf = Ease.ioQ(clamp((k - 0.38) / 0.62));
      if (kf < 1) { ctx.globalAlpha = ga * (1 - kf * kf); ctx.setLineDash([ks * L, L * 2]); ctx.strokeText(ch, xi, y); }
      if (kf > 0) { ctx.globalAlpha = ga * kf; ctx.setLineDash([]); ctx.fillText(ch, xi, y); }
    }
    ctx.restore();
  }
  // write a line made of coloured runs [[text, colour], ...]; the runs start in turn, as if one string
  function writeSeg(ctx, segs, x, y, p, o = {}) {
    if (p <= 0) return; const size = o.size || 32, ws = segs.map(([s]) => width(ctx, s, { size, it: o.it })), tot = ws.reduce((a, b) => a + b, 0), N = segs.reduce((a, [s]) => a + s.length, 0) || 1;
    let cx = o.align === 'center' ? x - tot / 2 : o.align === 'right' ? x - tot : x, c0 = 0;
    // every glyph starts at its place in the whole line (as one string would), so the runs follow on from each other
    segs.forEach(([s, col], j) => { const sp = (Math.max(1, s.length) - 1) / N * 0.6, st = (c0 / N) * 0.6, du = sp + 0.4; write(ctx, s, cx, y, clamp((p - st) / du), { ...o, size, color: col || o.color, align: 'left', lag: sp / du }); cx += ws[j]; c0 += s.length; });
  }
  // a column vector [x; y] centred on cx, top row's baseline at y: brackets draw, the numbers write in
  const num2 = (v) => (v < 0 ? '−' : '') + Math.abs(v).toFixed(2);
  function colVec(ctx, v, cx, y, k, o = {}) {
    if (k <= 0) return; const size = o.size || 26, col = o.color || INK, w = Math.max(...v.map(x => width(ctx, num2(x), { size }))), lh = size * 1.25, top = y - size * 0.9, bot = y + lh * (v.length - 1) + size * 0.35, e = Ease.ioC(clamp(k * 1.6));
    ctx.save(); ctx.strokeStyle = rgba(col, 0.85 * e); ctx.lineWidth = 2; const xl = cx - w / 2 - 10, xr = cx + w / 2 + 10, m = (top + bot) / 2, hh = (bot - top) / 2 * e;
    ctx.beginPath(); ctx.moveTo(xl + 7, m - hh); ctx.lineTo(xl, m - hh); ctx.lineTo(xl, m + hh); ctx.lineTo(xl + 7, m + hh); ctx.moveTo(xr - 7, m - hh); ctx.lineTo(xr, m - hh); ctx.lineTo(xr, m + hh); ctx.lineTo(xr - 7, m + hh); ctx.stroke(); ctx.restore();
    v.forEach((x, i) => write(ctx, num2(x), cx + w / 2, y + i * lh, clamp(k * 1.4 - 0.25 - i * 0.15), { size, align: 'right', color: col, a: o.a }));
  }
  // a label centred at (x, y) (baseline) on a dark backing, so it reads over grid lines and other arrows
  function label(ctx, s, x, y, color, o = {}) {
    const size = o.size || 30; ctx.save(); font(ctx, o); const w = ctx.measureText(s).width; ctx.globalAlpha *= o.a ?? 1;
    if (o.bg !== false) { ctx.fillStyle = rgba(BG, o.bga ?? 0.72); rr(ctx, x - w / 2 - size * 0.22, y - size * 0.8, w + size * 0.44, size * 1.08, 6); ctx.fill(); }
    if (o.glow) { ctx.shadowColor = color; ctx.shadowBlur = o.glow; }
    ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.fillText(s, x, y); ctx.restore();
  }
  // where a word's label sits: just beyond its arrow's tip, along the arrow's screen direction (the label's centre)
  function tipPos(ctx, cam, p, s, o = {}) {
    const A = S(cam, o.from || [0, 0]), B = o.at || S(cam, p); let dx = B[0] - A[0], dy = B[1] - A[1]; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
    const size = o.size || 30, w = width(ctx, s, { size, ...o }), off = o.off ?? 12;
    return [B[0] + dx * (off + (w / 2 + size * 0.2) * Math.abs(dx)) + (o.dx ?? 0), B[1] + dy * (off + size * 0.55 * Math.abs(dy)) + (o.dy ?? 0)];
  }
  function tipLabel(ctx, cam, p, s, color, o = {}) {
    const [cx, cy] = tipPos(ctx, cam, p, s, o), size = o.size || 30;
    label(ctx, s, cx, cy + size * 0.32, color, { size, a: o.a, bg: o.bg, glow: o.glow, it: o.it }); return [cx, cy];
  }
  // a line of words centred on cx: their boxes (x, w, centre c)
  function words(ctx, list, cx, y, size, o = {}) {
    ctx.save(); font(ctx, { size, ...o }); const sp = ctx.measureText(' ').width + (o.gap || 0), ws = list.map(w => ctx.measureText(w).width); ctx.restore();
    const tot = ws.reduce((a, b) => a + b, 0) + sp * (list.length - 1); let x = cx - tot / 2;
    return list.map((s, i) => { const r = { s, x, w: ws[i], c: x + ws[i] / 2, y, size }; x += ws[i] + sp; return r; });
  }
  // ───────── formulas. Nodes: string | {s, it?, col?, id?, big?} | {seq: []} | {sup: [base, sup]} | {sub: [base, sub]}
  // | {frac: [num, den], id?}. lay() measures; atoms() flattens to positioned glyph runs and rules, each with a key
  // (its id, else its text and the how-many-th time that text occurs) so two formulas can be matched for a morph.
  function lay(ctx, nd, size) {
    if (typeof nd === 'string') nd = { s: nd };                       // (a bare string has .big, .sub and .sup methods)
    if (nd.s !== undefined) {
      const s = nd.s, sz = size * (nd.big || 1), o = { size: sz, math: !!nd.it };
      ctx.save(); font(ctx, o); const w = ctx.measureText(s).width + (nd.it ? sz * 0.04 : 0); ctx.restore();
      return { kind: 'text', s, o, w: w + (nd.pad || 0) * size, asc: sz * 0.72, desc: sz * 0.22, sh: nd.big ? sz * 0.1 : 0, id: nd.id, col: nd.col };
    }
    if (nd.seq) {
      const kids = nd.seq.map(k => lay(ctx, k, size)); let x = 0;
      kids.forEach(k => { k.dx = x; k.dy = 0; x += k.w; });
      return { kind: 'seq', kids, w: x, asc: Math.max(...kids.map(k => k.asc)), desc: Math.max(...kids.map(k => k.desc)), id: nd.id };
    }
    if (nd.sup || nd.sub) {
      const [b, s] = nd.sup || nd.sub, B = lay(ctx, b, size), Sx = lay(ctx, s, size * 0.64);
      B.dx = 0; B.dy = 0; Sx.dx = B.w + size * 0.04; Sx.dy = nd.sup ? -size * 0.44 : size * 0.22;
      return { kind: 'seq', kids: [B, Sx], w: B.w + Sx.w + size * 0.08, asc: Math.max(B.asc, nd.sup ? Sx.asc + size * 0.44 : 0), desc: Math.max(B.desc, nd.sub ? Sx.desc + size * 0.22 : 0), id: nd.id };
    }
    if (nd.frac) {
      const [n, d] = nd.frac, Nn = lay(ctx, n, size * 0.9), Dd = lay(ctx, d, size * 0.9), w = Math.max(Nn.w, Dd.w) + size * 0.36, axis = -size * 0.27;
      Nn.dx = (w - Nn.w) / 2; Nn.dy = axis - size * 0.16 - Nn.desc; Dd.dx = (w - Dd.w) / 2; Dd.dy = axis + size * 0.16 + Dd.asc;
      return { kind: 'frac', kids: [Nn, Dd], w, axis, asc: -Nn.dy + Nn.asc, desc: Dd.dy + Dd.desc, id: nd.id, size };
    }
    throw new Error('formula node');
  }
  function atoms(box, x, y) {
    const out = [], seen = {};
    const keyOf = (base) => { const n = (seen[base] = (seen[base] ?? -1) + 1); return base + '#' + n; };
    (function walk(b, bx, by) {
      if (b.kind === 'text') { out.push({ key: b.id || keyOf(b.s), s: b.s, o: b.o, x: bx, y: by + b.sh, w: b.w, col: b.col }); return; }
      if (b.kind === 'frac') out.push({ key: b.id ? b.id + '#rule' : keyOf('rule'), rule: true, x: bx + b.size * 0.06, y: by + b.axis - 1.3, w: b.w - b.size * 0.12, h: 2.6 });
      b.kids && b.kids.forEach(k => walk(k, bx + k.dx, by + k.dy));
    })(box, x, y);
    return out;
  }
  // a formula laid out with its left edge at x (or centred on x with o.align 'center'), baseline y: {atoms, w, x}
  function F(ctx, nd, size, x, y, o = {}) { const box = lay(ctx, nd, size), x0 = o.align === 'center' ? x - box.w / 2 : o.align === 'right' ? x - box.w : x; return { atoms: atoms(box, x0, y), w: box.w, x: x0, y, asc: box.asc, desc: box.desc }; }
  function drawAtom(ctx, t, color, a, o = {}) {
    if (a <= 0) return;
    if (t.rule) { ctx.save(); ctx.fillStyle = rgba(color, a); const w = t.w * (o.grow ?? 1); ctx.fillRect(t.x + (t.w - w) / 2, t.y, w, t.h); ctx.restore(); return; }
    if (o.write !== undefined && o.write < 1) return write(ctx, t.s, t.x, t.y, o.write, { ...t.o, color, a, lag: 0 });
    ctx.save(); font(ctx, t.o); ctx.fillStyle = color; ctx.globalAlpha *= a; if (o.glow) { ctx.shadowColor = color; ctx.shadowBlur = o.glow; } ctx.fillText(t.s, t.x, t.y); ctx.restore();
  }
  // draw a formula, written in atom by atom over p; o.colorOf(key) may recolour; o.a fades the whole
  function drawF(ctx, f, p = 1, o = {}) {
    const n = f.atoms.length;
    f.atoms.forEach((t, i) => {
      const k = clamp((p * (n + 2.5) - i) / 3.5), color = (o.colorOf && o.colorOf(t.key)) || t.col || o.color || INK;
      drawAtom(ctx, t, color, o.a ?? 1, { write: k, grow: Ease.ioC(k), glow: o.glow && o.glow(t.key) });
    });
  }
  // morph formula A into formula B: atoms with the same key glide (position, size, colour), A's others fade out early
  // and B's new ones write in late
  function morph(ctx, A, B, p, o = {}) {
    const e = Ease.ioC(clamp(p)), inB = new Map(B.atoms.map(t => [t.key, t])), inA = new Set(A.atoms.map(t => t.key)), a0 = o.a ?? 1;
    const colA = (t) => (o.colorOf && o.colorOf(t.key)) || t.col || o.color || INK, colB = (t) => (o.colorOfB && o.colorOfB(t.key)) || (o.colorOf && o.colorOf(t.key)) || t.col || o.color || INK;
    for (const a of A.atoms) {
      const b = inB.get(a.key);
      if (b) {
        const c = toHex(mix(colA(a), colB(b), e)), x = lerp(a.x, b.x, e), y = lerp(a.y, b.y, e);
        if (a.rule) drawAtom(ctx, { ...a, x, y, w: lerp(a.w, b.w, e) }, c, a0);
        else if (a.s !== b.s) {                                        // same place, new glyph (= becomes ∝): crossfade
          drawAtom(ctx, { ...a, x, y, o: { ...a.o, size: lerp(a.o.size, b.o.size, e) } }, c, a0 * (1 - e));
          drawAtom(ctx, { ...b, x: x + (a.w - b.w) * (1 - e) / 2, y, o: { ...b.o, size: lerp(a.o.size, b.o.size, e) } }, c, a0 * e);
        } else drawAtom(ctx, { ...a, x, y, o: { ...a.o, size: lerp(a.o.size, b.o.size, e) } }, c, a0);
      } else drawAtom(ctx, { ...a, y: a.y - 14 * clamp(p * 2.2) }, colA(a), a0 * (1 - clamp(p * 2.2)));
    }
    const nNew = B.atoms.filter(t => !inA.has(t.key)).length; let j = 0;
    for (const b of B.atoms) if (!inA.has(b.key)) { const k = clamp(((p - 0.42) / 0.58) * (nNew + 1.5) - j++ * 0.6); drawAtom(ctx, b, colB(b), a0, { write: k, grow: Ease.ioC(k) }); }
  }
  // the box of one atom in a laid formula (for underlines, highlights and leaders)
  function atomBox(f, key) { const t = f.atoms.find(a => a.key === key); return t ? { x: t.x, y: t.y, w: t.w, size: t.o ? t.o.size : 20 } : null; }
  // ───────── the probability chart (probs, temp, sample): the five places and every other word together
  const CH = { x0: 420, base: 850, bw: 120, gap: 60, scale: 520 };
  function chartWords() { return [...toy().rank.slice(0, 5), 'others']; }
  function chartP(T = 1) { const P = probs(T), r = toy().rank, out = {}; r.slice(0, 5).forEach(w => (out[w] = P[w])); out.others = r.slice(5).reduce((s, w) => s + P[w], 0); return out; }
  const pct = (p) => (p >= 0.0995 ? Math.round(p * 100) + '%' : p >= 0.0005 ? (p * 100).toFixed(1) + '%' : '<0.1%');
  const chartCol = (w) => (w === 'others' ? MUTED : colOf(w));
  function barRect(i, p) { const x = CH.x0 + i * (CH.bw + CH.gap); return [x, CH.base - p * CH.scale, CH.bw, p * CH.scale]; }
  // bars at their rectangles (from barRect or interpolated by the caller), each word under its bar, its share above
  function bar(ctx, r, color, o = {}) {
    const [x, y, w, h] = r; if (h <= 0 && !o.base) return;
    ctx.save(); ctx.globalAlpha *= o.a ?? 1;
    ctx.fillStyle = linear(ctx, 0, y, 0, y + Math.max(1, h), [[0, rgba(color, 0.62)], [1, rgba(color, 0.3)]]); ctx.fillRect(x, y, w, Math.max(0, h));
    ctx.fillStyle = color; ctx.fillRect(x, y, w, Math.min(Math.max(0, h), 5));
    ctx.strokeStyle = rgba(color, 0.95); ctx.lineWidth = 2.5; ctx.strokeRect(x, y, w, Math.max(0, h));
    if (o.glow) { ctx.shadowColor = color; ctx.shadowBlur = o.glow; ctx.strokeRect(x, y, w, Math.max(0, h)); }
    ctx.restore();
  }
  function chart(ctx, P, o = {}) {
    const ws = chartWords(), k = o.k ?? 1, a = o.a ?? 1;
    ctx.save(); ctx.strokeStyle = rgba(INK, 0.6 * a * clamp(k * 3)); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(CH.x0 - 40, CH.base); ctx.lineTo(CH.x0 + ws.length * (CH.bw + CH.gap) - CH.gap + 40, CH.base); ctx.stroke(); ctx.restore();
    ws.forEach((w, i) => {
      const kk = Ease.ioC(clamp(k * 1.6 - i * 0.12)), p = P[w] * kk, r = barRect(i, p), col = chartCol(w), hl = o.hl === w;
      bar(ctx, r, col, { a: a * clamp(kk * 3), glow: hl ? 18 : 0 });
      label(ctx, w === 'others' ? 'other 10' : w, r[0] + CH.bw / 2, CH.base + 46, col, { size: 32, a: a * clamp(kk * 3), bg: false });
      if (o.pct !== false) txt(ctx, pct(P[w]), r[0] + CH.bw / 2, r[1] - 16, { size: 30, align: 'center', color: hl ? YELLOW : INK, a: a * clamp(kk * 2 - 0.6) * (o.pctA ?? 1) });
    });
  }
  // ───────── the sentence along the top of the page, with a slot for the word to come (reserved at the width of mat)
  const SENT = ['The', 'cat', 'sat', 'on', 'the', 'mat'], HEAD = { y: 118, size: 46 };
  const headPos = (ctx, y = HEAD.y, size = HEAD.size) => words(ctx, SENT, W / 2, y, size, { gap: size * 0.42 });
  // o.a fades it, o.fill (0..1) writes mat into the slot, o.hl = a word to box in yellow, o.word replaces mat
  function head(ctx, o = {}) {
    const a = o.a ?? 1, pos = headPos(ctx, o.y, o.size), size = o.size || HEAD.size; if (a <= 0) return pos;
    for (let i = 0; i < 5; i++) txt(ctx, SENT[i], pos[i].x, pos[i].y, { size, a, color: o.colorOf ? o.colorOf(i) : INK });
    const s = pos[5], f = o.fill ?? 0;
    ctx.save(); ctx.fillStyle = rgba(YELLOW, a * (1 - f) * (0.55 + 0.45 * (o.caret ?? 1))); ctx.fillRect(s.x - 4, s.y + 8, s.w + 8, 3); ctx.restore();
    if (f > 0) write(ctx, o.word || 'mat', s.x, s.y, f, { size, a, color: toHex(mix(YELLOW, INK, clamp((f - 0.6) / 0.4) * (o.settle ?? 1))) });
    if (o.hl !== undefined && (o.hlA ?? 1) > 0) { const r = pos[o.hl]; ctx.save(); ctx.strokeStyle = rgba(YELLOW, a * (o.hlA ?? 1)); ctx.lineWidth = 3; rr(ctx, r.x - 10, r.y - size * 0.86, r.w + 20, size * 1.18, 8); ctx.stroke(); ctx.restore(); }
    return pos;
  }
  // the scene before this one in the current cut (scenes pick up where it left off)
  function prev(env) { const S = REEL.plan.scenes, j = S.findIndex(s => s.id === env.id); return j > 0 ? S[j - 1].id : null; }
  const has = (id) => REEL.plan.scenes.some(s => s.id === id);
  // scenes that hold drift in slowly (a push of PUSH per beat); the next scene starts from where the push ended
  const PUSH = 0.006;
  function pushOf(id) { const s = REEL.plan.scenes.find(x => x.id === id); return s ? 1 + PUSH * Math.round(s.dur / REEL.plan.beatSec) : 1; }
  // a caption along the bottom, written in, on a band that keeps it clear of the grid
  function caption(ctx, s, p, o = {}) {
    if (p <= 0) return; const y = o.y ?? 1028, a = o.a ?? 1;
    ctx.save(); ctx.globalAlpha *= a * clamp(p * 4); ctx.fillStyle = linear(ctx, 0, y - 70, 0, H, [[0, rgba(BG, 0)], [0.35, rgba(BG, 0.86)], [1, rgba(BG, 0.92)]]); ctx.fillRect(0, y - 70, W, H - y + 70); ctx.restore();
    if (Array.isArray(s)) writeSeg(ctx, s, W / 2, y, p, { size: o.size || 34, align: 'center', a, it: o.it });
    else write(ctx, s, W / 2, y, p, { size: o.size || 34, align: 'center', color: o.color || INK, a, it: o.it });
  }
  // the formulas of the last steps, laid out centred at the top of the page (probs, temp and sample morph between them)
  const FY = 262, FS = 54;
  function formulas(ctx) {
    const h = (id = 'h') => ({ s: 'h', it: true, col: YELLOW, id }), dot = (id = 'dot') => ({ s: ' ⋅ ', id }), it = (s, id, col) => ({ s, it: true, id, col });
    const lhs = (eq) => [it('p', 'p'), { s: '(', id: 'lp' }, it('w', 'w0'), { s: ')', id: 'rp' }, { s: eq, id: 'eq' }];
    const ex = (T) => ({ sup: [it('e', 'e'), { seq: [h(), dot(), it('w', 'w'), ...(T ? [{ s: ' / ', id: 'sl' }, it('T', 'T', PINK)] : [])] }] });
    const den = (T) => ({ seq: [{ sub: [{ s: 'Σ', id: 'sum', big: 1.3 }, it('w′', 'wp0')] }, { s: ' ', id: 'sp' }, { sup: [it('e', 'e2'), { seq: [h('h2'), dot('dot2'), it('w′', 'w2'), ...(T ? [{ s: ' / ', id: 'sl2' }, it('T', 'T2', PINK)] : [])] }] }] });
    const at = (nd) => F(ctx, nd, FS, W / 2, FY, { align: 'center' });
    return {
      score: at({ seq: [{ s: 'score', id: 'score' }, { s: '(', id: 'lp' }, it('w', 'w0'), { s: ')', id: 'rp' }, { s: ' = ', id: 'eq' }, h(), dot(), it('w', 'w')] }),
      exp: at({ seq: [...lhs(' ∝ '), ex(false)] }),
      p: at({ seq: [...lhs(' = '), { frac: [ex(false), den(false)], id: 'fr' }] }),
      pT: at({ seq: [...lhs(' = '), { frac: [ex(true), den(true)], id: 'fr' }] }),
    };
  }
  // a dark panel behind a formula so it reads over the grid
  function panel(ctx, f, a = 1, pad = 26) { if (a <= 0) return; ctx.save(); ctx.fillStyle = rgba(BG, 0.82 * a); rr(ctx, f.x - pad, f.y - f.asc - pad, f.w + pad * 2, f.asc + f.desc + pad * 2, 12); ctx.fill(); ctx.strokeStyle = rgba(GRID, 0.25 * a); ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore(); }
  window.VM = {
    BG, INK, DIM, MUTED, GRID, KIND, YELLOW, TEAL, PINK, toy, xy, kindOf, colOf, probs, lerp, lerp2, bg, CAM, I2, mul, rot, S, lerpCam, plane,
    arrowS, vec, font, width, txt, write, writeSeg, colVec, label, tipPos, tipLabel, words, lay, atoms, F, drawAtom, drawF, morph, atomBox,
    CH, chartWords, chartP, pct, chartCol, barRect, bar, chart, SENT, HEAD, headPos, head, prev, has, PUSH, pushOf, caption, formulas, panel, FY, FS,
  };
})();
