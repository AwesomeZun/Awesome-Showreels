// orbit: the Orbit Note reel's shared kit (a project module). The canvas is rebuilt from the app's own parts: the
// empty space (blue grid and orbit ribbons, captured with the cards hidden), each card as an alpha layer at its own
// box, and every link as the very SVG path the app draws (its d, screen matrix and length read from the DOM into
// geo.txt), stroked here so it can draw on. A camera {x, y, z} looks at that 1600 x 1000 capture space.
(() => {
  const K = 1.2;                                          // 1600 CSS px of the capture fill the 1920 frame
  const HOLO = ['#9FE9FF', '#B9C4FF', '#E2B9FF', '#FFC6E6', '#FFF1B8', '#B2F7DD'];
  let G0 = null, G1 = null;
  const geo = () => (G0 || (G0 = JSON.parse(ASSET('captures/ui/app/geo.txt'))));
  const geoLinked = () => (G1 || (G1 = JSON.parse(ASSET('captures/ui/app/geo_linked.txt'))));
  const meta = {};
  function layer(name) {
    const base = name.replace(/_\d+$/, ''), m = name.match(/_\d+$/), has = (n) => ('captures/ui/app/' + n + '.json') in ASSETS;
    if (!meta[name]) meta[name] = (m && has(base)) ? ASSET('captures/ui/app/' + base + '.json') : ASSET('captures/ui/app/' + name + '.json');
    const j = meta[name], L = j && j.layers ? (j.layers.find(l => l.file === name + '.png') || j.layers[0]) : j;
    return { img: IMG['captures/ui/app/' + name], L };
  }
  // camera: capture px -> frame px
  const cam0 = { x: 800, y: 500, z: 1 };
  const mapper = (c) => ({ x: (x) => (x - c.x) * c.z * K + W / 2, y: (y) => (y - c.y) * c.z * K + H / 2, s: c.z * K });
  // the empty space, under the camera
  function space(ctx, c, o = {}) {
    const { img } = layer('space'); ctx.fillStyle = '#0B2FE6'; ctx.fillRect(0, 0, W, H); if (!img) return;
    const M = mapper(c), X0 = M.x(0), Y0 = M.y(0), w = 1600 * M.s, h = 1000 * M.s;
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
    // the capture, mirrored across its edges so the camera never runs out of space
    for (let iy = -1; iy <= 1; iy++) for (let ix = -1; ix <= 1; ix++) {
      const x = X0 + ix * w, y = Y0 + iy * h; if (x > W || y > H || x + w < 0 || y + h < 0) continue;
      ctx.save(); ctx.translate(x + (ix % 2 ? w : 0), y + (iy % 2 ? h : 0)); ctx.scale(ix % 2 ? -1 : 1, iy % 2 ? -1 : 1); ctx.drawImage(img, 0, 0, w, h); ctx.restore();
    }
    ctx.restore();
  }
  // a capture layer at its own box (or at a given centre / scale), under the camera
  function drawLayer(ctx, name, c, o = {}) {
    const { img, L } = layer(name); if (!img || !L) return null;
    const M = mapper(c), r = L.rect, k = (o.k ?? 1) * M.s;
    const cx = o.cx ?? r.x + r.w / 2, cy = o.cy ?? r.y + r.h / 2;
    const X = M.x(cx), Y = M.y(cy), w = r.w * k, h = r.h * k;
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
    if (o.rot) { ctx.translate(X, Y); ctx.rotate(o.rot); ctx.translate(-X, -Y); }
    if (o.blur) ctx.filter = `blur(${o.blur.toFixed(1)}px)`;
    ctx.drawImage(img, X - w / 2, Y - h / 2, w, h); ctx.restore();
    return { x: X - w / 2, y: Y - h / 2, w, h, cx: X, cy: Y };
  }
  // a link along its real path, drawn on to p (0..1); wiki links dashed like the app's
  function link(ctx, L, c, p, o = {}) {
    if (p <= 0) return;
    const M = mapper(c), m = L.m;
    const path = (L._p || (L._p = new Path2D(L.d))), arrow = L.arrow ? (L._a || (L._a = new Path2D(L.arrow))) : null;
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
    // path units -> capture CSS px (the app's screen matrix) -> frame px (the camera)
    ctx.setTransform(m[0] * M.s, m[1] * M.s, m[2] * M.s, m[3] * M.s, M.x(m[4]), M.y(m[5]));
    const u = M.s * m[0], len = L.len, dashed = L.kind === 'wiki';
    ctx.lineCap = 'round';
    const dash = (on) => {
      if (!dashed) return p < 1 ? [len * p, len * 2] : [];
      const a = []; let acc = 0; const d = 7, g = 6;
      while (acc + d < len * p) { a.push(d, g); acc += d + g; }
      a.push(Math.max(0.01, len * p - acc), len * 2); return a;
    };
    ctx.setLineDash(dash(true));
    ctx.strokeStyle = o.glow || 'rgba(159,233,255,0.35)'; ctx.lineWidth = 9 / u; ctx.stroke(path);
    ctx.strokeStyle = o.color || 'rgba(255,255,255,0.92)'; ctx.lineWidth = 2.2 / u; ctx.stroke(path);
    if (p >= 1 && arrow) { ctx.setLineDash([]); ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fill(arrow); ctx.lineWidth = 1.5 / u; ctx.strokeStyle = '#FFFFFF'; ctx.stroke(arrow); }
    ctx.restore();
    // the head of the line: a bright spark while drawing
    if (p > 0 && p < 1 && o.spark !== false) {
      const t = ctx.getTransform(); ctx.save(); ctx.setTransform(t);
      const pt = pointOnPath(L, p), X = M.x(pt[0]), Y = M.y(pt[1]);
      const g = ctx.createRadialGradient(X, Y, 0, X, Y, 26); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.3, 'rgba(159,233,255,0.6)'); g.addColorStop(1, 'rgba(159,233,255,0)');
      ctx.fillStyle = g; ctx.fillRect(X - 26, Y - 26, 52, 52); ctx.restore();
    }
  }
  // a point along a link at u (capture CSS px), from the SVG path sampled once
  function pointOnPath(L, u) {
    if (!L._pts) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'path'); svg.setAttribute('d', L.d);
      const n = 60, pts = []; let total = 0;
      try { total = svg.getTotalLength(); for (let i = 0; i <= n; i++) { const q = svg.getPointAtLength(total * i / n); pts.push([q.x, q.y]); } } catch (e) { pts.push([0, 0]); }
      const m = L.m; L._pts = pts.map(([x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]);
    }
    const P = L._pts, f = clamp(u) * (P.length - 1), i = Math.min(P.length - 2, Math.floor(f)), k = f - i;
    return [lerp(P[i][0], P[i + 1][0], k), lerp(P[i][1], P[i + 1][1], k)];
  }
  // headline: white first line, holographic second line glyph by glyph
  function holoAt(u) { const f = clamp(u) * (HOLO.length - 1), i = Math.min(HOLO.length - 2, Math.floor(f)); return mix(HOLO[i], HOLO[i + 1], f - i); }
  function headline(ctx, lines, x, y, lt, o = {}) {
    const size = o.size || 100, gap = o.gap ?? size * 1.14;
    lines.forEach((s, i) => {
      const n = [...s].length, holo = (o.holo ?? [false, true])[i];
      kinetic(ctx, s, x, y + i * gap, lt - (o.step ?? 0.32) * i, { size, fam: 'display', weight: o.weight || 850, color: '#FFFFFF', ls: -0.04 * size,
        colorFn: holo ? ((k) => holoAt(((k / Math.max(1, n - 1)) + (o.shift || 0)) % 1)) : undefined,
        stagger: 0.03, dur: 0.6, rise: 0.45 * size, blur: 8, align: o.align, out: o.out, alpha: o.alpha, glow: holo ? 'rgba(159,233,255,0.35)' : undefined, glowBlur: 24 });
    });
  }
  function label(ctx, s, x, y, o = {}) {
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.font = `${o.weight || 600} ${o.size || 22}px ${FAM.mono}`; ctx.fillStyle = o.color || '#C9D2FF';
    const ls = (o.size || 22) * 0.16; let w = 0; for (const ch of s) w += ctx.measureText(ch).width + ls; w -= ls;
    let cx = o.align === 'center' ? x - w / 2 : x; for (const ch of s) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + ls; }
    ctx.restore(); return w;
  }
  // a soft deep-blue wash for text over the canvas
  // (cached per y0 / a / x1: vertical fade from y0 down, and a horizontal fade out by x1)
  const WASH = {};
  function wash(ctx, y0, a = 0.9, x1 = W) {
    const key = y0 + '|' + a + '|' + x1; let b = WASH[key];
    if (!b) {
      b = WASH[key] = makeBuf(W, H); const g = b.g;
      const v = g.createLinearGradient(0, y0, 0, H); v.addColorStop(0, 'rgba(3,11,74,0)'); v.addColorStop(0.5, `rgba(3,11,74,${a * 0.75})`); v.addColorStop(1, `rgba(3,11,74,${a})`);
      g.fillStyle = v; g.fillRect(0, y0, W, H - y0);
      if (x1 < W) { g.globalCompositeOperation = 'destination-in'; const hgr = g.createLinearGradient(0, 0, x1, 0); hgr.addColorStop(0, '#000'); hgr.addColorStop(0.7, '#000'); hgr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = hgr; g.fillRect(0, 0, W, H); }
    }
    ctx.drawImage(b.c, 0, 0);
  }
  window.ORBIT = { K, HOLO, geo, geoLinked, layer, mapper, cam0, space, drawLayer, link, pointOnPath, headline, holoAt, label, wash };
})();
