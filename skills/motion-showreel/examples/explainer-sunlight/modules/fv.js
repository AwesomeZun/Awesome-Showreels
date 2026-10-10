// fv: the explainer's kit (a project module). Saturated flat vector on a dark violet universe: star fields that move
// at their own depth, stepped halo rings and additive glows around every light source, round things shaded flat (a
// shadow crescent from an offset circle, a soft shine), white pill labels that spring open, bold rounded Nunito words
// that pop in one after another. It draws the recurring characters of the story as objects, not mascots: the light
// itself (a warm white point with a gold halo and a four-point flare), the Sun (banded body, drifting granulation,
// sunspots, breathing prominences) and the Earth (continents and clouds turning, a night side, a thin blue rim).
// Exposes window.FV.
(() => {
  const C = {
    space0: '#140C2E', space1: '#231551', space2: '#3B2275', nebula: '#8A2D91', violet: '#8F6BFF',
    white: '#FFFFFF', ink: '#1B1240', ink2: '#D9CCFF', cream: '#FFF6E2', pink: '#FF4F8B', cyan: '#38D6FF',
    sun0: '#FFF6C9', sun1: '#FFD84A', sun2: '#FFA22B', sun3: '#FF6A2B', sun4: '#E8432E', sun5: '#A8221F',
    photon: '#FFFBE8', glow: '#FFD95A',
    ocean: '#2F7BE0', ocean2: '#1D56B0', land: '#4CC46C', land2: '#2E9A52', cloud: '#F4F7FF', air: '#7CC8FF',
    leaf: '#56BE45', leaf2: '#3A9A36', leaf3: '#26742A', leafL: '#A6E05E',
    wheat: '#F3C04C', wheat2: '#DE9E2E', wheat3: '#B9781F', stalk: '#E2C15A',
    crust: '#B8662B', crust2: '#8C4920', crumb: '#F6DBA9', crumb2: '#EBC285', butter: '#FFE27A',
  };
  const FONT = '"Nunito", sans-serif';
  const rnd = (i, k = 0) => hash(i * 1.618 + k * 7.31 + 0.5);
  const lerp = (a, b, k) => a + (b - a) * k;
  // ───────── type
  function font(ctx, size, weight = 800) { ctx.font = `${weight} ${size}px ${FONT}`; }
  function width(ctx, s, size, weight = 800, ls = 0) { ctx.save(); font(ctx, size, weight); if ('letterSpacing' in ctx) ctx.letterSpacing = ls + 'px'; const w = ctx.measureText(s).width; ctx.restore(); return w; }
  function txt(ctx, s, x, y, o = {}) {
    const size = o.size || 32; ctx.save(); font(ctx, size, o.weight || 800); if ('letterSpacing' in ctx) ctx.letterSpacing = (o.ls || 0) + 'px';
    ctx.textAlign = o.align || 'left'; ctx.globalAlpha *= o.a ?? 1;
    if (o.shadow !== false) { ctx.shadowColor = o.shadowColor || 'rgba(10,6,24,0.45)'; ctx.shadowBlur = o.blur ?? size * 0.25; ctx.shadowOffsetY = size * 0.06; }
    ctx.fillStyle = o.color || C.white; ctx.fillText(s, x, y); ctx.restore();
  }
  // words (or [text, colour] runs) pop in one after another: each rises a little and overshoots its size
  function pop(ctx, s, x, y, p, o = {}) {
    if (p <= 0) return; const size = o.size || 40, weight = o.weight || 800, ls = o.ls || 0;
    const runs = Array.isArray(s) ? s : [[s, o.color || C.white]], items = [];
    runs.forEach(([t, col]) => t.split(/(\s+)/).forEach(w => { if (w) items.push([w, col]); }));
    const ws = items.map(([w]) => width(ctx, w, size, weight, ls)), tot = ws.reduce((a, b) => a + b, 0);
    let cx = o.align === 'left' ? x : o.align === 'right' ? x - tot : x - tot / 2; const words = items.filter(([w]) => w.trim()).length; let j = 0;
    items.forEach(([w, col], i) => {
      if (w.trim()) {
        const k = clamp((p * (words + 2) - j++) / 2.2);
        if (k > 0) { const e = Ease.outBack(k), cxw = cx + ws[i] / 2; ctx.save(); ctx.translate(cxw, y - size * 0.3); ctx.scale(0.6 + 0.4 * e, 0.6 + 0.4 * e); txt(ctx, w, 0, size * 0.3 + (1 - Ease.outC(k)) * size * 0.5, { ...o, size, weight, ls, color: col, align: 'center', a: (o.a ?? 1) * clamp(k * 3) }); ctx.restore(); }
      }
      cx += ws[i];
    });
  }
  // a title: capitals with wide tracking, letters dropping in with an overshoot
  function title(ctx, s, x, y, p, o = {}) {
    if (p <= 0) return; const size = o.size || 110, ls = o.ls ?? size * 0.08, n = s.length;
    ctx.save(); font(ctx, size, 900); if ('letterSpacing' in ctx) ctx.letterSpacing = ls + 'px'; const tot = ctx.measureText(s).width; ctx.restore();
    let cx = o.align === 'left' ? x : x - tot / 2;
    for (let i = 0; i < n; i++) {
      const ch = s[i], w = width(ctx, ch, size, 900, ls), k = clamp((p * (n + 6) - i) / 6);
      if (ch !== ' ' && k > 0) { const e = Ease.outBack(k); ctx.save(); ctx.translate(cx + w / 2, y - size * 0.35); ctx.scale(e, e); txt(ctx, ch, 0, size * 0.35 - (1 - k) * size * 0.4, { size, weight: 900, color: o.color || C.white, align: 'center', a: (o.a ?? 1) * clamp(k * 2.5), blur: size * 0.3 }); ctx.restore(); }
      cx += w;
    }
  }
  // a caption under everything: a soft dark plate the width of the line, the words popping in
  function caption(ctx, s, p, o = {}) {
    if (p <= 0) return; const size = o.size || 38, y = o.y ?? 1000, a = o.a ?? 1;
    const plain = Array.isArray(s) ? s.map(r => r[0]).join('') : s, w = width(ctx, plain, size, 800);
    ctx.save(); ctx.globalAlpha *= a * clamp(p * 4); ctx.fillStyle = rgba(C.space0, o.plate ?? 0.5); rr(ctx, W / 2 - w / 2 - 34, y - size * 1.05, w + 68, size * 1.6, size * 0.8); ctx.fill(); ctx.restore();
    pop(ctx, s, W / 2, y, p, { size, a, weight: 800 });
  }
  // a white pill label; o.to = [x, y] draws a leader to the thing it names
  function pill(ctx, s, x, y, k, o = {}) {
    if (k <= 0) return; const size = o.size || 30, w = width(ctx, s, size, 800) + size * 1.2, h = size * 1.6, e = Ease.outBack(clamp(k)), a = (o.a ?? 1) * clamp(k * 3);
    if (o.to) {
      const [tx, ty] = o.to, ex = x + (tx - x) * clamp(k * 1.5), ey = y + (ty - y) * clamp(k * 1.5);
      ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = o.line || C.white; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.fillStyle = o.line || C.white; circle(ctx, ex, ey, 7 * clamp(k * 2 - 0.5)); ctx.fill(); ctx.restore();
    }
    ctx.save(); ctx.translate(x, y); ctx.scale(e, e); ctx.globalAlpha *= a;
    ctx.shadowColor = 'rgba(10,6,24,0.35)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
    ctx.fillStyle = o.bg || C.white; rr(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.fill(); ctx.shadowColor = 'transparent';
    font(ctx, size, 800); ctx.fillStyle = o.color || C.ink; ctx.textAlign = 'center'; ctx.fillText(s, 0, size * 0.36); ctx.restore();
  }
  // ───────── light
  function glow(ctx, x, y, r, col, a = 1) {
    if (a <= 0 || r <= 0) return; ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = radial(ctx, x, y, 0, r, [[0, rgba(col, a)], [0.22, rgba(col, a * 0.5)], [0.55, rgba(col, a * 0.14)], [1, rgba(col, 0)]]); ctx.fillRect(x - r, y - r, 2 * r, 2 * r); ctx.restore();
  }
  // stepped halo: flat rings, each a little fainter than the one inside it
  function rings(ctx, x, y, r, col, steps = [1.14, 1.32, 1.56, 1.88, 2.35], a = 0.1) {
    ctx.save(); steps.forEach((s, i) => { ctx.fillStyle = rgba(col, a * (1 - i / (steps.length + 1))); circle(ctx, x, y, r * s); ctx.fill(); }); ctx.restore();
  }
  // a soft-edged disc, like an out-of-focus light in front of the lens
  function bokeh(ctx, x, y, r, col, a = 0.3) { ctx.save(); ctx.fillStyle = radial(ctx, x, y, 0, r, [[0, rgba(col, a)], [0.72, rgba(col, a * 0.85)], [1, rgba(col, 0)]]); ctx.fillRect(x - r, y - r, 2 * r, 2 * r); ctx.restore(); }
  // the travelling light: a warm white point, a gold halo and a slowly turning four-point flare
  function photon(ctx, x, y, s = 1, t = 0, o = {}) {
    const a = o.a ?? 1; if (a <= 0) return;
    glow(ctx, x, y, 110 * s, o.col || C.glow, 0.5 * a); glow(ctx, x, y, 34 * s, '#FFFFFF', 0.9 * a);
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.5 + (o.rot || 0)); ctx.globalCompositeOperation = 'lighter';
    for (const [L, w, al] of [[70, 3.2, 0.75], [40, 2.2, 0.5]]) { ctx.fillStyle = rgba('#FFF2C4', al * a); for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.ellipse(0, 0, L * s, w * s, i * Math.PI / 2 + (L < 60 ? Math.PI / 4 : 0), 0, TAU); ctx.fill(); } }
    ctx.restore(); ctx.fillStyle = rgba('#FFFFFF', a); circle(ctx, x, y, 7.5 * s); ctx.fill();
  }
  // a tapered streak behind something fast
  function streak(ctx, x0, y0, x1, y1, col, w, a = 1, o = {}) {
    if (a <= 0) return; const L = Math.hypot(x1 - x0, y1 - y0); if (L < 1) return; const nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
    ctx.save(); if (o.add !== false) ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = linear(ctx, x0, y0, x1, y1, [[0, rgba(col, 0)], [1, rgba(col, a)]]);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 + nx * w / 2, y1 + ny * w / 2); ctx.lineTo(x1 - nx * w / 2, y1 - ny * w / 2); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  // ───────── space
  let STARS = null;
  const starList = () => STARS || (STARS = Array.from({ length: 560 }, (_, i) => ({ x: rnd(i, 1) * W, y: rnd(i, 2) * H, z: 0.15 + 0.85 * rnd(i, 3) ** 2, r: 0.7 + 2.3 * rnd(i, 4) ** 3, ph: rnd(i, 5) * TAU, sp: rnd(i, 6) < 0.05, c: rnd(i, 7) })));
  // o.dx, o.dy: how far the nearest stars have moved (px); o.streak: motion blur length at the nearest depth
  function stars(ctx, o = {}) {
    const t = o.t || 0, a0 = o.a ?? 1, sk = o.streak || 0; if (a0 <= 0) return;
    ctx.save();
    for (const s of starList()) {
      const x = (((s.x - (o.dx || 0) * s.z) % W) + W) % W, y = (((s.y - (o.dy || 0) * s.z) % H) + H) % H, tw = 0.6 + 0.4 * Math.sin(t * (1.5 + s.c * 2) + s.ph), a = a0 * tw * (0.35 + 0.65 * s.z);
      const col = s.c < 0.15 ? '#FFD9F0' : s.c < 0.3 ? '#CFE6FF' : '#FFFFFF';
      if (sk > 1) { ctx.strokeStyle = rgba(col, a); ctx.lineWidth = s.r * 0.9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + sk * s.z * (o.sx ?? 1), y + sk * s.z * (o.sy ?? 0)); ctx.stroke(); continue; }
      ctx.fillStyle = rgba(col, a); circle(ctx, x, y, s.r); ctx.fill();
      if (s.sp) { ctx.fillStyle = rgba(col, a * 0.8); ctx.beginPath(); ctx.ellipse(x, y, s.r * 5, s.r * 0.6, 0, 0, TAU); ctx.ellipse(x, y, s.r * 0.6, s.r * 5, 0, 0, TAU); ctx.fill(); }
    }
    ctx.restore();
  }
  // the universe behind it all: violet depth, two nebula clouds, stars
  function space(ctx, o = {}) {
    ctx.fillStyle = linear(ctx, 0, 0, 0, H, [[0, C.space1], [1, C.space0]]); ctx.fillRect(0, 0, W, H);
    const nx = o.nx || 0;
    for (const [x, y, r, col, a] of [[W * 0.78, H * 0.25, 620, C.nebula, 0.28], [W * 0.2, H * 0.8, 700, C.violet, 0.2], [W * 0.5, H * 0.55, 900, C.space2, 0.35]]) {
      const X = (((x - nx * 0.25) % (W * 1.6)) + W * 1.6) % (W * 1.6) - W * 0.3; ctx.fillStyle = radial(ctx, X, y, 0, r, [[0, rgba(col, a)], [1, rgba(col, 0)]]); ctx.fillRect(X - r, y - r, 2 * r, 2 * r);
    }
    stars(ctx, { t: o.t, dx: nx, dy: o.ny, streak: o.streak, a: o.starA });
  }
  // ───────── round things, shaded flat
  // the shadow crescent of a ball lit from angle ang: everything inside the disc but outside an offset copy of it
  function shade(ctx, x, y, r, ang, k, col, a = 1) {
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
    ctx.beginPath(); ctx.rect(x - r - 2, y - r - 2, 2 * r + 4, 2 * r + 4); ctx.arc(x + Math.cos(ang) * r * k, y + Math.sin(ang) * r * k, r * (1 + k * 0.15), 0, TAU, true);
    ctx.fillStyle = rgba(col, a); ctx.fill(); ctx.restore();
  }
  function shine(ctx, x, y, r, ang, a = 0.35) { ctx.save(); ctx.fillStyle = rgba('#FFFFFF', a); ctx.beginPath(); ctx.ellipse(x + Math.cos(ang) * r * 0.48, y + Math.sin(ang) * r * 0.48, r * 0.2, r * 0.11, ang + Math.PI / 2, 0, TAU); ctx.fill(); ctx.restore(); }
  function ball(ctx, x, y, r, base, dark, o = {}) {
    const ang = o.ang ?? -2.4; ctx.fillStyle = base; circle(ctx, x, y, r); ctx.fill();
    shade(ctx, x, y, r, ang, o.k ?? 0.32, dark, 1); if (o.shine !== false) shine(ctx, x, y, r, ang, o.shineA ?? 0.3);
  }
  // ───────── the Sun: halo rings, a glow, a banded body with drifting granulation, two sunspots, breathing prominences
  function sun(ctx, x, y, r, t, o = {}) {
    rings(ctx, x, y, r, C.sun2, [1.1, 1.26, 1.48, 1.78, 2.2, 2.8], o.ringA ?? 0.11); glow(ctx, x, y, r * 2.6, C.sun1, 0.32);
    // prominences behind the limb
    const proms = [[-0.6, 0.22], [2.3, 0.3], [0.9, 0.18]];
    proms.forEach(([a0, span], i) => {
      const br = 1 + 0.18 + 0.05 * Math.sin(t * 0.8 + i * 2), p0 = [x + Math.cos(a0) * r * 0.97, y + Math.sin(a0) * r * 0.97], p1 = [x + Math.cos(a0 + span) * r * 0.97, y + Math.sin(a0 + span) * r * 0.97];
      const cp = [x + Math.cos(a0 + span / 2) * r * (br + 0.18), y + Math.sin(a0 + span / 2) * r * (br + 0.18)];
      ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = rgba(C.sun3, 0.85); ctx.lineWidth = r * 0.045; ctx.shadowColor = C.sun3; ctx.shadowBlur = r * 0.08;
      ctx.beginPath(); ctx.moveTo(...p0); ctx.quadraticCurveTo(...cp, ...p1); ctx.stroke(); ctx.lineWidth = r * 0.018; ctx.strokeStyle = rgba(C.sun1, 0.8); ctx.stroke(); ctx.restore();
    });
    // the body in close bands (a hot rim, then gentler and gentler yellows), each nudged toward the upper left
    const bands = [[1, C.sun4], [0.975, C.sun3], [0.94, C.sun2], [0.86, '#FFB838'], [0.72, '#FFC540'], [0.52, C.sun1]];
    bands.forEach(([k, col]) => { ctx.fillStyle = col; circle(ctx, x - (1 - k) * r * 0.08, y - (1 - k) * r * 0.08, r * k); ctx.fill(); });
    ctx.save(); ctx.strokeStyle = rgba('#FFF3B0', 0.5); ctx.lineWidth = r * 0.02; ctx.beginPath(); ctx.arc(x, y, r * 0.955, -2.9, -1.3); ctx.stroke(); ctx.restore();
    // granulation: bright cells over the bands, drifting slowly
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r * 0.98, 0, TAU); ctx.clip();
    const n = o.cells ?? 230;
    for (let i = 0; i < n; i++) {
      const u = rnd(i, 11) * TAU, v = Math.sqrt(rnd(i, 12)), cx = x + Math.cos(u + t * 0.02) * v * r, cy = y + Math.sin(u + t * 0.02) * v * r, cr = r * (0.028 + 0.03 * rnd(i, 13)) * (1 - 0.4 * v * v);
      ctx.fillStyle = rgba(C.sun0, 0.12 + 0.12 * Math.sin(t * 1.3 + i)); ctx.beginPath(); ctx.ellipse(cx, cy, cr * (1 - 0.5 * v * v * Math.abs(Math.cos(u))), cr, u, 0, TAU); ctx.fill();
    }
    for (const [u, v, s] of [[0.6, 0.45, 0.07], [3.6, 0.6, 0.05]]) { const sx = x + Math.cos(u + t * 0.02) * v * r, sy = y + Math.sin(u + t * 0.02) * v * r; ctx.fillStyle = rgba(C.sun4, 0.9); circle(ctx, sx, sy, r * s); ctx.fill(); ctx.fillStyle = rgba(C.sun5, 0.95); circle(ctx, sx, sy, r * s * 0.55); ctx.fill(); }
    ctx.restore();
  }
  // ───────── the Earth: ocean, continents and clouds turning (o.rot), lit from the left, a thin blue rim
  const LANDS = [[0.2, 0.55, 0.42], [0.45, 0.25, 0.3], [0.65, -0.2, 0.36], [1.9, 0.4, 0.5], [2.3, -0.35, 0.3], [3.1, 0.15, 0.22], [4.2, 0.5, 0.4], [4.5, -0.3, 0.32], [5.4, -0.55, 0.28], [5.9, 0.7, 0.3]];
  function earth(ctx, x, y, r, t, o = {}) {
    const rot = o.rot ?? t * 0.15, lightAng = o.ang ?? Math.PI;
    glow(ctx, x, y, r * 1.5, C.air, 0.25);
    ctx.fillStyle = rgba(C.air, 0.35); circle(ctx, x, y, r * 1.045); ctx.fill();
    ctx.fillStyle = C.ocean; circle(ctx, x, y, r); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
    const proj = (lon, lat) => { const c = Math.cos(lon - rot); return [x + Math.sin(lon - rot) * Math.cos(lat) * r, y - Math.sin(lat) * r, c]; };
    // continents: smooth closed blobs on the sphere (points behind the limb are pressed onto it)
    const blob = (lon, lat, s, i, col) => {
      const pts = []; let vis = 0;
      for (let j = 0; j < 12; j++) { const a = j / 12 * TAU, rho = s * (0.55 + 0.45 * rnd(i * 12 + j, 21)), L = lon + Math.cos(a) * rho, Bt = lat + Math.sin(a) * rho * 0.75, c = Math.cos(L - rot); if (c > 0) vis++; const sx = c > 0 ? Math.sin(L - rot) : Math.sign(Math.sin(L - rot)); pts.push([x + sx * Math.cos(Bt) * r, y - Math.sin(Bt) * r]); }
      if (!vis) return; ctx.fillStyle = col; ctx.beginPath();
      pts.forEach((p, j) => { const q = pts[(j + 1) % 12], m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; j ? ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]) : ctx.moveTo(m[0], m[1]); }); ctx.closePath(); ctx.fill();
    };
    LANDS.forEach(([lon, lat, s], i) => { blob(lon, lat, s, i, C.land); blob(lon + s * 0.12, lat - s * 0.1, s * 0.5, i + 40, C.land2); });
    for (let i = 0; i < 9; i++) {
      const lon = rnd(i, 31) * TAU, lat = (rnd(i, 32) - 0.5) * 2.2, [px, py, c] = proj(lon + t * 0.03, lat); if (c <= 0) continue;
      ctx.strokeStyle = rgba(C.cloud, 0.85); ctx.lineCap = 'round'; ctx.lineWidth = r * 0.05; ctx.beginPath(); ctx.ellipse(px, py, r * 0.22 * c, r * 0.05, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = rgba(C.cloud, 0.9); ctx.beginPath(); ctx.ellipse(x, y - r * 0.93, r * 0.33, r * 0.08, 0, 0, TAU); ctx.fill();
    shade(ctx, x, y, r, lightAng, o.k ?? 0.42, '#0B0A2A', o.night ?? 0.62);
    ctx.save(); ctx.strokeStyle = rgba(C.air, 0.7); ctx.lineWidth = r * 0.025; ctx.beginPath(); ctx.arc(x, y, r * 1.01, lightAng - 1.4, lightAng + 1.4); ctx.stroke(); ctx.restore();
  }
  // Mercury (grey, cratered) and Venus (cream, banded), lit from the left
  function planet(ctx, x, y, r, kind, o = {}) {
    const ang = o.ang ?? Math.PI;
    if (kind === 'venus') {
      ctx.fillStyle = '#F2D59A'; circle(ctx, x, y, r); ctx.fill(); ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
      for (let i = 0; i < 5; i++) { ctx.fillStyle = rgba(i % 2 ? '#E6B86E' : '#FBE7BC', 0.7); ctx.beginPath(); ctx.ellipse(x, y - r * 0.7 + i * r * 0.36, r * 1.2, r * 0.1, 0.1, 0, TAU); ctx.fill(); } ctx.restore();
    } else {
      ctx.fillStyle = '#A99C92'; circle(ctx, x, y, r); ctx.fill(); ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
      for (let i = 0; i < 9; i++) { const cx = x + (rnd(i, 41) - 0.5) * r * 1.6, cy = y + (rnd(i, 42) - 0.5) * r * 1.6, cr = r * (0.08 + 0.12 * rnd(i, 43)); ctx.fillStyle = '#8C7F76'; circle(ctx, cx, cy, cr); ctx.fill(); ctx.fillStyle = '#BDB2A8'; circle(ctx, cx - cr * 0.25, cy - cr * 0.25, cr * 0.55); ctx.fill(); } ctx.restore();
    }
    shade(ctx, x, y, r, ang, 0.38, '#0B0A2A', 0.6); shine(ctx, x, y, r, ang + 0.4, 0.25);
  }
  // ───────── diagram pieces
  // a thick rounded arrow (flat), from (x0, y0) to (x1, y1)
  function farrow(ctx, x0, y0, x1, y1, col, w = 12, o = {}) {
    const k = o.k ?? 1; if (k <= 0) return; const ex = x0 + (x1 - x0) * k, ey = y0 + (y1 - y0) * k, L = Math.hypot(ex - x0, ey - y0); if (L < 2) return;
    const ux = (ex - x0) / L, uy = (ey - y0) / L, hl = Math.min(w * 2.2, L * 0.6), hw = w * 2;
    ctx.save(); ctx.globalAlpha *= o.a ?? 1; ctx.strokeStyle = ctx.fillStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(ex - ux * hl * 0.8, ey - uy * hl * 0.8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - ux * hl - uy * hw / 2, ey - uy * hl + ux * hw / 2); ctx.lineTo(ex - ux * hl + uy * hw / 2, ey - uy * hl - ux * hw / 2); ctx.closePath(); ctx.lineJoin = 'round'; ctx.lineWidth = w * 0.4; ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  // scale everything drawn by fn about (cx, cy)
  function zoom(ctx, cx, cy, z, fn) { ctx.save(); ctx.translate(cx, cy); ctx.scale(z, z); ctx.translate(-cx, -cy); fn(); ctx.restore(); }
  // mm:ss
  const clock = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  // the scene before this one in the current cut
  function prev(env) { const S = REEL.plan.scenes, j = S.findIndex(s => s.id === env.id); return j > 0 ? S[j - 1].id : null; }
  window.FV = { C, rnd, lerp, font, width, txt, pop, title, caption, pill, glow, rings, bokeh, photon, streak, stars, space, shade, shine, ball, sun, earth, planet, farrow, zoom, clock, prev };
})();
