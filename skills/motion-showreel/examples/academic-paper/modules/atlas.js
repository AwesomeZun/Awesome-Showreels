// atlas: the fictional article's Figure 1 as live data, shared by every scene of this example (a project module).
//
// assets/data/atlas.json (paper-src/simulate.py) holds 4,900 sampled nuclei. Each keeps its identity through the
// whole reel: a dissociated cell on the title page, a point in the UMAP (panel a/b), a point in the tissue section
// (panel c), so scenes meet in match cuts on the same points. Layouts are pure functions of the cell and of t.
// Exposes window.ATLAS.
(() => {
  let D = null;
  const sprites = new Map();
  function data() {
    if (D) return D;
    const A = ASSET('data/atlas.json');
    if (!A) throw new Error('atlas: assets/data/atlas.json missing (python3 paper-src/simulate.py)');
    const n = A.cells.length, k = new Uint8Array(n), ux = new Float32Array(n), uy = new Float32Array(n),
      sx = new Float32Array(n), sy = new Float32Array(n), pt = new Float32Array(n), h = new Float32Array(n);
    A.cells.forEach((c, i) => { k[i] = c[0]; ux[i] = c[1]; uy[i] = c[2]; sx[i] = c[3]; sy[i] = c[4]; pt[i] = c[5]; h[i] = hash(i * 1.618 + 0.3); });
    // cluster centroids in UMAP space (for on-plot labels)
    const cen = A.clusters.map(() => [0, 0, 0]);
    for (let i = 0; i < n; i++) { cen[k[i]][0] += ux[i]; cen[k[i]][1] += uy[i]; cen[k[i]][2]++; }
    cen.forEach(c => { c[0] /= c[2]; c[1] /= c[2]; });
    D = { ...A, n, k, ux, uy, sx, sy, pt, h, cen, colors: A.clusters.map(c => c.color) };
    return D;
  }

  // Layouts: panel rects in screen px.
  const UMAP_RECT = [150, 250, 1080, 690];               // x, y, w, h
  const SECTION_RECT = [112, 252, 1216, 684];            // 1600 x 900 um -> 0.76 px/um
  function umapXY(i, rect = UMAP_RECT) {
    const d = data(), [x0, x1, y0, y1] = [-12, 13, -10.5, 7];
    return [rect[0] + (d.ux[i] - x0) / (x1 - x0) * rect[2], rect[1] + (1 - (d.uy[i] - y0) / (y1 - y0)) * rect[3]];
  }
  const umapPt = (ux, uy, rect = UMAP_RECT) => [rect[0] + (ux + 12) / 25 * rect[2], rect[1] + (1 - (uy + 10.5) / 17.5) * rect[3]];
  function spaceXY(i, rect = SECTION_RECT) {
    const d = data();
    return [rect[0] + d.sx[i] / d.section[0] * rect[2], rect[1] + d.sy[i] / d.section[1] * rect[3]];
  }
  const spacePt = (x, y, rect = SECTION_RECT) => [rect[0] + x / data().section[0] * rect[2], rect[1] + y / data().section[1] * rect[3]];
  // dissociated cells on the title page: a loose field on the right that drifts (pure in global t)
  function scatterXY(i, t) {
    const d = data(), a = hash(i * 7.31 + 2), b = hash(i * 3.17 + 9);
    const x = 1010 + a * 840 + Math.sin(t * (0.3 + d.h[i] * 0.4) + i) * 9;
    const y = 120 + Math.pow(b, 0.95) * 860 + Math.cos(t * (0.25 + d.h[i] * 0.35) + i * 1.7) * 9;
    return [x, y];
  }

  // a dot sprite per colour and radius: filled disc with a hairline darker rim (like a scanpy figure at 300 dpi)
  function dot(col, r) {
    const key = col + '|' + r.toFixed(1);
    let s = sprites.get(key);
    if (!s) {
      const res = 3, R = Math.ceil(r + 1.5), b = makeBuf(R * 2 * res, R * 2 * res), g = b.g;
      g.scale(res, res);
      g.fillStyle = col; circle(g, R, R, r); g.fill();
      g.strokeStyle = rgba(mix(col, '#000000', 0.35), 0.55); g.lineWidth = 0.5; g.stroke();
      s = { c: b.c, R };
      sprites.set(key, s);
    }
    return s;
  }
  // draw every cell: f(i) -> [x, y, colour, alpha, r] or null
  function cells(ctx, f) {
    const d = data();
    ctx.save();
    for (let i = 0; i < d.n; i++) {
      const v = f(i);
      if (!v || v[3] <= 0.004) continue;
      const s = dot(v[2], v[4] ?? 3.2);
      ctx.globalAlpha = v[3];
      ctx.drawImage(s.c, v[0] - s.R, v[1] - s.R, s.R * 2, s.R * 2);
    }
    ctx.restore();
  }

  // pseudotime colour map (viridis-like, but warmer at the end so AT1 reads teal-gold)
  const PT = ['#3B2A7A', '#2F6FDB', '#13A39A', '#7BC55A', '#F2C53D'];
  function ptColor(u) {
    u = clamp(u) * (PT.length - 1);
    const i = Math.min(PT.length - 2, Math.floor(u));
    return toHex(mix(PT[i], PT[i + 1], u - i));
  }
  // the repair arc's centre line in UMAP units (the same curve simulate.py samples)
  function arcUMAP(s) { const a = Math.PI * (0.95 - 0.9 * s); return [-1.6 + 7.4 * Math.cos(a), 1.2 + 3.0 * Math.sin(a) - 1.2 * s]; }

  // ── typography and chrome
  function txt(ctx, s, x, y, o = {}) {
    ctx.save();
    ctx.font = font(o.size || 24, o.weight || 400, o.fam || 'P');
    ctx.fillStyle = o.color || C.ink; ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'alphabetic';
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${o.ls ?? (o.size || 24) * -0.01}px`;
    ctx.globalAlpha *= o.a ?? 1;
    ctx.fillText(s, x, y);
    const w = ctx.measureText(s).width;
    ctx.restore();
    return w;
  }
  // a line that rises out of a mask (journal-clean reveal), p 0..1
  function rise(ctx, s, x, y, p, o = {}) {
    if (p <= 0) return;
    const size = o.size || 24, e = Ease.outQuint(clamp(p));
    ctx.save(); ctx.beginPath(); ctx.rect(x - 20, y - size * 1.05, 4000, size * 1.4); if (o.align === 'center') { ctx.beginPath(); ctx.rect(0, y - size * 1.05, W, size * 1.4); } ctx.clip();
    txt(ctx, s, x, y + (1 - e) * size * 1.1, { ...o, a: (o.a ?? 1) * clamp(p * 3) });
    ctx.restore();
  }
  // running head on every figure scene: "Halden et al. · Article" left, figure ref right, hairline below
  function chrome(ctx, env, right, a = 1) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a;
    txt(ctx, 'ARTICLE', 112, 92, { size: 15, weight: 700, color: C.accent, ls: 1.6 });
    txt(ctx, 'Halden et al. · Spatial multiome atlas of alveolar repair', 210, 92, { size: 17, weight: 500, color: C.muted, ls: 0 });
    txt(ctx, right, W - 112, 92, { size: 17, weight: 600, color: C.ink2, align: 'right', ls: 0 });
    ctx.fillStyle = C.line; ctx.fillRect(112, 112, (W - 224) * Ease.outQuint(clamp(a * 1.2)), 1);
    ctx.restore();
  }
  // bold lowercase panel letter, as in the legend (a-e)
  function letter(ctx, s, x, y, p) {
    if (p <= 0) return;
    txt(ctx, s, x, y, { size: 44, weight: 800, color: C.ink, a: clamp(p * 2), ls: 0 });
  }
  // small L-shaped axis arrows with labels (UMAP 1 / UMAP 2), p draws them on
  function axes(ctx, x, y, len, p, l1 = 'UMAP 1', l2 = 'UMAP 2') {
    if (p <= 0) return;
    const e = Ease.outQuint(clamp(p));
    ctx.save(); ctx.strokeStyle = C.ink2; ctx.fillStyle = C.ink2; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y - len * e); ctx.lineTo(x, y); ctx.lineTo(x + len * e, y); ctx.stroke();
    const head = (hx, hy, ang) => { ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-9, -5); ctx.lineTo(-9, 5); ctx.closePath(); ctx.fill(); ctx.restore(); };
    head(x + len * e, y, 0); head(x, y - len * e, -Math.PI / 2);
    ctx.restore();
    txt(ctx, l1, x, y + 26, { size: 17, weight: 500, color: C.muted, a: clamp(p * 2 - 1), ls: 0 });
    ctx.save(); ctx.translate(x - 14, y); ctx.rotate(-Math.PI / 2);
    txt(ctx, l2, 0, 0, { size: 17, weight: 500, color: C.muted, a: clamp(p * 2 - 1), ls: 0 });
    ctx.restore();
  }
  // a label with a white halo (on-plot cluster names)
  function halo(ctx, s, x, y, o = {}) {
    ctx.save();
    ctx.font = font(o.size || 20, o.weight || 650, 'P'); ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'middle';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.globalAlpha *= o.a ?? 1;
    ctx.lineJoin = 'round'; ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(255,255,255,0.92)'; ctx.strokeText(s, x, y);
    ctx.fillStyle = o.color || C.ink; ctx.fillText(s, x, y);
    ctx.restore();
  }

  window.ATLAS = { data, UMAP_RECT, SECTION_RECT, umapXY, umapPt, spaceXY, spacePt, scatterXY, dot, cells, ptColor, arcUMAP, txt, rise, chrome, letter, axes, halo };
})();
