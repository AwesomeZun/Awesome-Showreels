// modules/ink.js: the ink kit (global SN), copied unchanged from the sketchnote example (examples/sketchnote/modules),
// where it is documented; here it writes the lab notebook's handwriting.
// Everything is a pure function of time; caches are keyed by inputs only.
//  - Ink layer: strokes and letters are drawn into an offscreen layer, which is then multiplied onto the board, so
//    marker ink overlaps like ink, a felt eraser can remove it (destination-out) and leaves ghost streaks behind.
//  - Hand-drawn geometry: rough lines, boxes whose corners overshoot, circling loops, one-stroke stars, arrows and
//    doodles. Line boil: the wobble is re-drawn 8 times a second, like hand-drawn animation.
//  - Handwriting that writes itself: each glyph of the real font is thinned to its centre line once (Zhang-Suen),
//    traced into ordered pen strokes and revealed through a marker-wide mask along them, so letters are drawn
//    stroke by stroke (no blur-ins, no wipes).
//  - Props: whiteboard markers (the pen at a stroke head, the cap that pops off), the felt eraser, vote stickers.
(() => {
  const SN = (window.SN = {});
  const BOIL_FPS = 8;
  SN.BOIL_FPS = BOIL_FPS;
  SN.boilStep = t => Math.floor(t * BOIL_FPS + 1e-6);

  // ───────── fonts ─────────
  const penStack = () => joinStack((STYLE.fonts && STYLE.fonts.pen) || '"Caveat", cursive', FAM.sans);
  SN.famStack = k => (k === 'pen' ? penStack() : FAM[k] || k || FAM.sans);

  // ───────── small math ─────────
  const vnoise = (x, seed) => {                   // smooth value noise in -1..1
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return lerp(hsh2(seed, i), hsh2(seed, i + 1), u) * 2 - 1;
  };
  SN.vnoise = vnoise;
  // Resample a polyline every `step` px, keeping both ends.
  function resampleKeep(pts, step) {
    if (pts.length < 2) return pts.map(p => [p[0], p[1]]);
    const out = [[pts[0][0], pts[0][1]]];
    let carry = 0;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], L = Math.hypot(x1 - x0, y1 - y0);
      let d = step - carry;
      while (d <= L) { const k = d / L; out.push([lerp(x0, x1, k), lerp(y0, y1, k)]); d += step; }
      carry = L - (d - step);
    }
    const last = pts[pts.length - 1], q = out[out.length - 1];
    if (Math.hypot(last[0] - q[0], last[1] - q[1]) > step * 0.2) out.push([last[0], last[1]]);
    return out;
  }
  SN.resample = resampleKeep;
  // Catmull-Rom through points -> dense polyline.
  function spline(P, per = 12) {
    if (P.length < 3) return P.map(p => [p[0], p[1]]);
    const out = [];
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
      for (let j = 0; j < per; j++) {
        const t = j / per, t2 = t * t, t3 = t2 * t;
        out.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
      }
    }
    out.push([P[P.length - 1][0], P[P.length - 1][1]]);
    return out;
  }
  SN.spline = spline;
  // Hand wobble: resample, then push every point along the normal by smooth noise (fixed by seed) plus a small boil
  // term that changes BOIL_FPS times a second. o: {seed, amp, boil (step), boilAmp, step, lam}
  function hand(pts, o = {}) {
    const step = o.step ?? 5, P = resampleKeep(pts, step), n = P.length, seed = o.seed ?? 1;
    const amp = o.amp ?? 2.2, bAmp = o.boilAmp ?? 0.9, lam = o.lam ?? 170, b = o.boil ?? 0;
    const out = new Array(n);
    let s = 0;
    for (let i = 0; i < n; i++) {
      if (i) s += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
      const a = P[Math.max(0, i - 1)], c = P[Math.min(n - 1, i + 1)];
      let nx = -(c[1] - a[1]), ny = c[0] - a[0];
      const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
      const off = amp * (0.7 * vnoise(s / lam, seed) + 0.3 * vnoise(s / (lam * 0.31), seed + 17)) + bAmp * vnoise(s / 60, seed * 13 + b * 7.31);
      out[i] = [P[i][0] + nx * off, P[i][1] + ny * off];
    }
    return out;
  }
  SN.hand = hand;
  const len = pathLen;

  // ───────── hand-drawn geometry (world px; each returns a point list) ─────────
  // A slightly bowed straight line.
  SN.line = (x0, y0, x1, y1, o = {}) => {
    const L = Math.hypot(x1 - x0, y1 - y0) || 1, bow = (o.bow ?? (hash((o.seed ?? 1) * 3.3) - 0.5) * 0.04) * L;
    const mx = (x0 + x1) / 2 - ((y1 - y0) / L) * bow, my = (y0 + y1) / 2 + ((x1 - x0) / L) * bow, P = [];
    for (let i = 0; i <= 16; i++) P.push(qbez([x0, y0], [mx, my], [x1, y1], i / 16));
    return hand(P, o);
  };
  // A box drawn in one go: starts left of the top-left corner, goes clockwise, and the last side runs up past the
  // start so the corner crosses (the lesson: "corners can overshoot. Overshoot = alive.").
  SN.box = (x, y, w, h, o = {}) => {
    const sd = o.seed ?? 1, j = k => (hash(sd * 7.1 + k) - 0.5) * (o.jit ?? 7), ov = o.overshoot ?? 22;
    const c = [[x + j(1) - ov * 0.7, y + j(2) + 2], [x + w + j(3) + 3, y + j(4) - 2], [x + w + j(5) + 2, y + h + j(6) + 2], [x + j(7) - 2, y + h + j(8) + 3], [x + j(9) + 2, y + j(10) - ov]];
    const P = [];
    for (let i = 0; i < 4; i++) {
      const a = c[i], b = c[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), bow = (hash(sd * 3.7 + i) - 0.5) * 0.035 * L;
      const m = [(a[0] + b[0]) / 2 - ((b[1] - a[1]) / L) * bow, (a[1] + b[1]) / 2 + ((b[0] - a[0]) / L) * bow];
      for (let k = i ? 1 : 0; k <= 14; k++) P.push(qbez(a, m, b, k / 14));
    }
    return hand(P, { amp: 1.6, ...o });
  };
  // A circling loop around a rect (cx, cy, rx, ry): starts upper left, ~1.12 turns, slight spiral so it overshoots.
  SN.loop = (cx, cy, rx, ry, o = {}) => {
    const sd = o.seed ?? 1, turns = o.turns ?? 1.12, a0 = o.start ?? -2.45, P = [];
    for (let i = 0; i <= 72; i++) {
      const u = i / 72, a = a0 + u * turns * TAU, gr = 1 + (u - 0.5) * (o.spiral ?? 0.09) + 0.03 * vnoise(u * 5, sd);
      P.push([cx + Math.cos(a) * rx * gr, cy + Math.sin(a) * ry * gr]);
    }
    return hand(P, { amp: 1.4, ...o });
  };
  // A star in one stroke, like the lesson teaches: bottom left, up to the top, down to the right foot, up to the
  // left arm, across to the right arm, back to the start.
  SN.star = (cx, cy, r, o = {}) => {
    const sd = o.seed ?? 1, rot = o.rot ?? -0.06;
    const v = k => { const a = -Math.PI / 2 + rot + (k * TAU) / 5; return [cx + Math.cos(a) * r * (1 + (hash(sd + k) - 0.5) * 0.08), cy + Math.sin(a) * r * (1 + (hash(sd + k + 9) - 0.5) * 0.08)]; };
    const P = [v(3), v(0), v(2), v(4), v(1), v(3)];
    return hand(P, { amp: 0.9, step: 4, lam: 120, ...o });
  };
  // Arrow: a smooth shaft through `ctrl` points and a head (one V stroke) at the end. Returns {shaft, head, tip, dir}.
  SN.arrow = (ctrl, o = {}) => {
    const shaft = hand(spline(ctrl, 14), o), n = shaft.length, tip = shaft[n - 1];
    let k = n - 1; while (k > 0 && Math.hypot(tip[0] - shaft[k][0], tip[1] - shaft[k][1]) < 18) k--;
    const dir = Math.atan2(tip[1] - shaft[k][1], tip[0] - shaft[k][0]), hl = o.head ?? 30, sp = o.spread ?? 0.52;
    const L = [tip[0] - Math.cos(dir - sp) * hl, tip[1] - Math.sin(dir - sp) * hl], R = [tip[0] - Math.cos(dir + sp) * hl, tip[1] - Math.sin(dir + sp) * hl];
    const head = hand([L, [tip[0] + Math.cos(dir) * 2, tip[1] + Math.sin(dir) * 2], R], { amp: 0.6, step: 3, seed: (o.seed ?? 1) + 5, boil: o.boil, boilAmp: 0.5 });
    return { shaft, head, tip, dir };
  };
  SN.underline = (x0, x1, y, o = {}) => {
    const sd = o.seed ?? 1, P = [];
    for (let i = 0; i <= 20; i++) { const u = i / 20; P.push([lerp(x0, x1, u), y + Math.sin(u * Math.PI) * (o.sag ?? 6) + (u > 0.85 ? -(u - 0.85) * 60 * (o.flick ?? 1) : 0) + vnoise(u * 3, sd) * 2]); }
    return hand(P, { amp: 1.1, ...o });
  };
  SN.check = (x, y, s, o = {}) => hand([[x - s * 0.5, y], [x - s * 0.12, y + s * 0.38], [x + s * 0.55, y - s * 0.45]], { amp: 0.8, step: 3, ...o });
  // Polyline (or several) scaled from a unit design: strokes = [[[x, y], ...], ...] in 0..1 box -> world.
  SN.fit = (strokes, x, y, s, o = {}) => strokes.map((st, i) => hand((st.length > 4 ? spline(st, 6) : st).map(p => [x + p[0] * s, y + p[1] * s]), { amp: (o.amp ?? 1) * s / 100, step: 3, seed: (o.seed ?? 1) + i * 3, boil: o.boil, boilAmp: o.boilAmp ?? 0.6, lam: 80 }));
  // Doodles in a 0..1 box (list of strokes), drawn in order.
  const circ = (cx, cy, r, a0 = -1.9, turns = 1.06, n = 28) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (i / n) * turns * TAU; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
  SN.DOODLE = {
    clock: [circ(0.5, 0.5, 0.46), [[0.5, 0.2], [0.5, 0.52], [0.72, 0.64]]],
    people: [circ(0.3, 0.3, 0.14), [[0.04, 0.86], [0.08, 0.6], [0.3, 0.5], [0.52, 0.6], [0.56, 0.86]], circ(0.72, 0.3, 0.14), [[0.48, 0.86], [0.52, 0.6], [0.72, 0.5], [0.92, 0.6], [0.96, 0.86]]],
    bulb: [[[0.38, 0.72], [0.36, 0.6], [0.22, 0.46], [0.2, 0.3], [0.32, 0.12], [0.5, 0.06], [0.68, 0.12], [0.8, 0.3], [0.78, 0.46], [0.64, 0.6], [0.62, 0.72], [0.38, 0.72]],
      [[0.4, 0.82], [0.6, 0.82]], [[0.43, 0.92], [0.57, 0.92]], [[0.5, -0.12], [0.5, -0.24]], [[0.12, 0.04], [0.02, -0.04]], [[0.88, 0.04], [0.98, -0.04]]],
    face: [circ(0.5, 0.5, 0.46, -1.6, 1.04, 32), [[0.28, 0.42], [0.34, 0.47], [0.4, 0.42]], [[0.6, 0.42], [0.66, 0.47], [0.72, 0.42]], circ(0.5, 0.7, 0.06, 0, 1, 10)],
    z: [[[0.0, 0.0], [0.8, 0.0], [0.0, 0.9], [0.85, 0.9]]],
  };
  SN.doodle = (kind, x, y, s, o = {}) => SN.fit(SN.DOODLE[kind], x, y, s, o);

  // ───────── ink rendering ─────────
  // Draw a polyline up to fraction u (by length) as marker ink. g is the ink layer, already in world units.
  // Returns the head point {x, y, a} (or null when nothing is drawn).
  SN.stroke = (g, pts, u, o = {}) => {
    if (!pts || pts.length < 1 || u <= 0) return null;
    u = Math.min(1, u);
    g.save();
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = g.fillStyle = o.color || C.ink;
    const w = o.width ?? 9;
    g.lineWidth = w;
    if (o.alpha !== undefined) g.globalAlpha *= o.alpha;
    if (pts.length === 1) { circle(g, pts[0][0], pts[0][1], w * 0.5); g.fill(); g.restore(); return { x: pts[0][0], y: pts[0][1], a: 0 }; }
    polyStroke(g, pts, u); g.stroke();
    circle(g, pts[0][0], pts[0][1], w * 0.56); g.fill();         // ink pools where the nib touches down
    const hd = pointAt(pts, u);
    g.restore();
    return hd;
  };
  // Several strokes drawn one after the other over u (0..1 across their total length).
  SN.strokes = (g, list, u, o = {}) => {
    const lens = list.map(p => Math.max(1, len(p))), T = lens.reduce((a, b) => a + b, 0);
    let left = clamp(u) * T, head = null;
    for (let i = 0; i < list.length && left > 0; i++) {
      const k = Math.min(1, left / lens[i]);
      head = SN.stroke(g, list[i], k, o) || head;
      left -= lens[i];
    }
    return head;
  };

  // Ink layers: a small stack of offscreen W x H buffers (a scene may draw a nested scene through a portal).
  const LAYERS = [];
  let depth = 0;
  SN.beginInk = () => {
    if (!LAYERS[depth]) LAYERS[depth] = makeBuf(W, H);
    const b = LAYERS[depth++], g = b.g;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.filter = 'none';
    g.clearRect(0, 0, W, H);
    return b;
  };
  // Multiply the ink layer onto the board with a faint grain, anchored to the board (moves with the camera).
  let GRAIN = null;
  function inkGrain() {
    if (GRAIN) return GRAIN;
    const S = 256, b = makeBuf(S, S), im = b.g.createImageData(S, S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const v = 0.55 * vnoise(x / 9 + vnoise(y / 41, 5) * 1.5, 11 + Math.floor(y / 3)) + 0.45 * vnoise((x + y * 0.3) / 3.2, 23 + y);   // streaky fibres
      const a = clamp(0.5 + 0.5 * v);
      im.data[(y * S + x) * 4 + 3] = Math.round(255 * Math.pow(a, 3));
    }
    b.g.putImageData(im, 0, 0);
    return (GRAIN = b);
  }
  SN.endInk = (ctx, b, view, o = {}) => {
    depth = Math.max(0, depth - 1);
    const g = b.g;
    if ((o.grain ?? 0.14) > 0 && view) {
      const pat = g.createPattern(inkGrain().c, 'repeat'), z = view.z;
      pat.setTransform(new DOMMatrix([z, 0, 0, z, W / 2 - view.cx * z, H / 2 - view.cy * z]));
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'destination-out'; g.globalAlpha = o.grain ?? 0.14;
      g.fillStyle = pat; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(b.c, 0, 0);
    ctx.restore();
  };
  // Felt eraser on the ink layer: removes ink along pts up to u, leaves a ghost (~6 %) with streaks.
  SN.erase = (g, pts, u, o = {}) => {
    if (!pts || u <= 0) return;
    const w = o.width ?? 110;
    g.save();
    g.globalCompositeOperation = 'destination-out';
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = '#000';
    g.globalAlpha = o.strength ?? 0.94; g.lineWidth = w;
    polyStroke(g, pts, u); g.stroke();
    g.globalAlpha = 0.55;
    for (let i = 0; i < 6; i++) {                                // streaks across the felt
      const off = (i / 5 - 0.5) * w * 0.8, P = pts.map((p, j) => {
        const a = pts[Math.max(0, j - 1)], c = pts[Math.min(pts.length - 1, j + 1)], dx = c[0] - a[0], dy = c[1] - a[1], l = Math.hypot(dx, dy) || 1;
        return [p[0] - (dy / l) * off, p[1] + (dx / l) * off];
      });
      g.lineWidth = 3 + hash(i * 3.1 + (o.seed ?? 1)) * 9;
      polyStroke(g, P, u); g.stroke();
    }
    g.restore();
  };

  // ───────── handwriting ─────────
  const REF = 120;
  const GLY = new Map();
  let MEAS = null, SCR = null;
  function measCtx() { if (!MEAS) MEAS = makeBuf(8, 8); return MEAS.g; }
  function scratch(w, h) {
    if (!SCR || SCR.c.width < w || SCR.c.height < h) SCR = makeBuf(Math.max(w, SCR ? SCR.c.width : 0, 256), Math.max(h, SCR ? SCR.c.height : 0, 256));
    return SCR;
  }
  // Zhang-Suen thinning of a 0/1 grid, in place.
  function thin(im, w, h) {
    const del = [];
    for (let changed = true; changed;) {
      changed = false;
      for (let pass = 0; pass < 2; pass++) {
        del.length = 0;
        for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
          const i = y * w + x;
          if (!im[i]) continue;
          const p2 = im[i - w], p3 = im[i - w + 1], p4 = im[i + 1], p5 = im[i + w + 1], p6 = im[i + w], p7 = im[i + w - 1], p8 = im[i - 1], p9 = im[i - w - 1];
          const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
          if (B < 2 || B > 6) continue;
          const A = (!p2 && p3) + (!p3 && p4) + (!p4 && p5) + (!p5 && p6) + (!p6 && p7) + (!p7 && p8) + (!p8 && p9) + (!p9 && p2);
          if (A !== 1) continue;
          if (pass === 0 ? p2 * p4 * p6 || p4 * p6 * p8 : p2 * p4 * p8 || p2 * p6 * p8) continue;
          del.push(i);
        }
        for (const i of del) im[i] = 0;
        if (del.length) changed = true;
      }
    }
  }
  // Trace a 1-px skeleton into strokes in a writing order: start at the top-left-most free end, keep going straight.
  function trace(im, w, h) {
    const N8 = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [-1, -1], [1, -1]];
    const pts = [];
    for (let i = 0; i < w * h; i++) if (im[i]) pts.push(i);
    const nb = i => { const x = i % w, y = (i / w) | 0, out = []; for (const [dx, dy] of N8) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < w && Y < h && im[Y * w + X]) out.push(Y * w + X); } return out; };
    const key = i => (i % w) + ((i / w) | 0) * 0.55;
    const vis = new Uint8Array(w * h), strokes = [];
    const walk = s => {
      const path = [s]; vis[s] = 1;
      let cur = s, pdx = 0, pdy = 0;
      for (;;) {
        const cand = nb(cur).filter(n => !vis[n]);
        if (!cand.length) { const j = nb(cur).find(n => vis[n] && n !== path[path.length - 2] && nb(n).length > 2); if (j !== undefined && path.length > 3) path.push(j); break; }
        const cx = cur % w, cy = (cur / w) | 0;
        let best = cand[0], bs = -1e9;
        for (const n of cand) {
          const dx = (n % w) - cx, dy = ((n / w) | 0) - cy, l = Math.hypot(dx, dy), pl = Math.hypot(pdx, pdy);
          const sc = (pl ? (dx * pdx + dy * pdy) / (l * pl) : 0) - (l > 1.1 ? 0.12 : 0);
          if (sc > bs) { bs = sc; best = n; }
        }
        pdx = 0.55 * pdx + ((best % w) - cx); pdy = 0.55 * pdy + (((best / w) | 0) - cy);
        vis[best] = 1; path.push(best); cur = best;
      }
      return path;
    };
    const ends = pts.filter(i => nb(i).length === 1).sort((a, b) => key(a) - key(b));
    for (const e of ends) if (!vis[e]) strokes.push(walk(e));
    for (let guard = 0; guard < 400; guard++) {
      const rest = pts.filter(i => !vis[i]);
      if (!rest.length) break;
      rest.sort((a, b) => key(a) - key(b));
      const s = rest.find(i => nb(i).some(n => vis[n])) ?? rest[0];
      const j = nb(s).find(n => vis[n]), p = walk(s);
      if (j !== undefined) p.unshift(j);
      strokes.push(p);
    }
    return strokes.map(p => p.map(i => [i % w, (i / w) | 0]));
  }
  function smooth(p) {
    if (p.length < 5) return p;
    const out = p.map((q, i) => {
      if (i === 0 || i === p.length - 1) return q;
      let sx = 0, sy = 0, n = 0;
      for (let k = -2; k <= 2; k++) { const r = p[Math.max(0, Math.min(p.length - 1, i + k))]; sx += r[0]; sy += r[1]; n++; }
      return [sx / n, sy / n];
    });
    return out;
  }
  // Glyph data: advance, raster box, ordered centre-line strokes (REF px, origin = baseline left), mask width.
  function glyph(famKey, weight, ch) {
    const k = famKey + '|' + weight + '|' + ch;
    let d = GLY.get(k);
    if (d) return d;
    const fam = SN.famStack(famKey), f = `${weight} ${REF}px ${fam}`, mg = measCtx();
    mg.font = f;
    const m = mg.measureText(ch), adv = m.width;
    if (!ch.trim()) { d = { adv, strokes: [], lens: [], total: 0, space: true }; GLY.set(k, d); return d; }
    const L = Math.ceil(m.actualBoundingBoxLeft) + 6, A = Math.ceil(m.actualBoundingBoxAscent) + 6;
    const w = Math.max(8, L + Math.ceil(m.actualBoundingBoxRight) + 6), h = Math.max(8, A + Math.ceil(m.actualBoundingBoxDescent) + 6);
    const b = makeBuf(w, h), g = b.g;
    g.font = f; g.fillStyle = '#000'; g.textBaseline = 'alphabetic'; g.fillText(ch, L, A);
    const px = g.getImageData(0, 0, w, h).data, im = new Uint8Array(w * h);
    let area = 0;
    for (let i = 0; i < w * h; i++) if (px[i * 4 + 3] > 120) { im[i] = 1; area++; }
    thin(im, w, h);
    let skel = 0;
    for (let i = 0; i < w * h; i++) skel += im[i];
    const thick = area / Math.max(1, skel);
    const strokes = trace(im, w, h).map(p => smooth(p.map(([x, y]) => [x + 0.5 - L, y + 0.5 - A])));
    const lens = strokes.map(p => Math.max(thick * 0.5, len(p)));
    d = { adv, L, A, w, h, strokes, lens, total: lens.reduce((a, c) => a + c, 0), thick, mw: thick * 1.45 + 3 };
    GLY.set(k, d);
    return d;
  }
  SN.glyph = glyph;
  // Lay out a line: glyph advances from prefix measurements (kerning kept). Cached per string and font.
  const LAY = new Map();
  function layout(s, famKey, weight) {
    const k = famKey + '|' + weight + '|' + s;
    let r = LAY.get(k);
    if (r) return r;
    const mg = measCtx(), chars = [...s];
    mg.font = `${weight} ${REF}px ${SN.famStack(famKey)}`;
    let acc = '', units = 0;
    const items = chars.map((ch, i) => {
      const x = mg.measureText(acc).width;
      acc += ch;
      const gd = glyph(famKey, weight, ch), u0 = units;
      units += gd.space ? 0.35 : 1;
      return { ch, x, gd, u0, i };
    });
    r = { items, width: mg.measureText(s).width, units };
    LAY.set(k, r);
    return r;
  }
  SN.textWidth = (s, o = {}) => layout(s, o.fam || 'sans', o.weight || 500).width * ((o.size || 40) / REF);
  SN.textUnits = (s, o = {}) => layout(s, o.fam || 'sans', o.weight || 500).units;
  // Head of a glyph at progress p (REF px, glyph-local).
  function glyphHead(d, p) {
    let left = clamp(p) * d.total;
    for (let i = 0; i < d.strokes.length; i++) {
      if (left <= d.lens[i] || i === d.strokes.length - 1) { const st = d.strokes[i]; if (st.length < 2) return [st[0][0], st[0][1]]; const q = pointAt(st, clamp(left / d.lens[i])); return [q.x, q.y]; }
      left -= d.lens[i];
    }
    return [0, 0];
  }
  // A glyph partly written: the real glyph seen through a marker-wide mask along its centre-line strokes.
  function partialGlyph(g, d, ch, famKey, weight, size, p, color) {
    const m = g.getTransform(), zs = Math.hypot(m.a, m.b) || 1, s = (size / REF) * zs, pad = 3;
    const cw = Math.ceil(d.w * s) + pad * 2, chh = Math.ceil(d.h * s) + pad * 2, b = scratch(cw, chh), sg = b.g;
    sg.setTransform(1, 0, 0, 1, 0, 0); sg.globalCompositeOperation = 'source-over'; sg.globalAlpha = 1; sg.clearRect(0, 0, cw, chh);
    sg.setTransform(s, 0, 0, s, pad + d.L * s, pad + d.A * s);
    sg.lineCap = 'round'; sg.lineJoin = 'round'; sg.lineWidth = d.mw; sg.strokeStyle = sg.fillStyle = '#000';
    let left = clamp(p) * d.total;
    for (let i = 0; i < d.strokes.length && left > 0; i++) {
      const st = d.strokes[i], L = d.lens[i];
      if (st.length < 2) { circle(sg, st[0][0], st[0][1], d.mw * 0.55); sg.fill(); }
      else { polyStroke(sg, st, clamp(left / L)); sg.stroke(); circle(sg, st[0][0], st[0][1], d.mw * 0.5); sg.fill(); }
      left -= L;
    }
    sg.setTransform(1, 0, 0, 1, pad + d.L * s, pad + d.A * s);
    sg.globalCompositeOperation = 'source-in';
    sg.font = `${weight} ${size * zs}px ${SN.famStack(famKey)}`; sg.fillStyle = color; sg.textBaseline = 'alphabetic';
    sg.fillText(ch, 0, 0);
    g.drawImage(b.c, 0, 0, cw, chh, -(pad + d.L * s) / zs, -(pad + d.A * s) / zs, cw / zs, chh / zs);
  }
  // Placement of glyph `it` of a laid-out line: hand wobble, tilt and boil jitter. Shared by write() and penAt().
  function place(it, x0, y, size, o) {
    const seed = o.seed ?? 1, b = o.boil ?? 0, jit = o.jitter ?? 1, sc = size / REF, wob = (o.wob ?? 0.022) * size;
    const dy = wob * vnoise(it.i * 0.83 + 0.5, seed) + (o.slope ?? 0) * it.x * sc;
    const rot = (o.tilt ?? 0.03) * vnoise(it.i * 1.31 + 3.7, seed + 5) + jit * 0.008 * vnoise(b * 2.3 + it.i, seed + 31);
    const bx = jit * size * 0.007 * vnoise(b * 1.7 + it.i * 0.61, seed + 11), by = jit * size * 0.007 * vnoise(b * 1.9 + it.i * 0.47, seed + 23);
    return { x: x0 + it.x * sc + bx, y: y + dy + by, rot, sc };
  }
  const lineX0 = (lay, x, size, align) => { const wpx = lay.width * (size / REF); return align === 'center' ? x - wpx / 2 : align === 'right' ? x - wpx : x; };
  // Handwriting. k = glyph units written so far (a letter is 1 unit, a space 0.35); k >= SN.textUnits(s) = done.
  // o: {size, weight, fam ('sans' | 'display' | 'pen'), color, align ('left'|'center'|'right'), seed, boil, jitter,
  //     wob (baseline wobble), tilt, slope, skip: Set of char indices not to draw, colorFn(i, ch)}.
  // Returns {w, head: [x, y] world | null, done}.
  SN.write = (g, s, x, y, k, o = {}) => {
    const famKey = o.fam || 'sans', weight = o.weight || 500, size = o.size || 40;
    const lay = layout(s, famKey, weight), x0 = lineX0(lay, x, size, o.align);
    let head = null;
    if (k <= 0) return { w: lay.width * (size / REF), head, done: false };
    g.save();
    g.font = `${weight} ${size}px ${SN.famStack(famKey)}`; g.textBaseline = 'alphabetic';
    for (const it of lay.items) {
      if (it.gd.space || (o.skip && o.skip.has(it.i))) continue;
      const p = clamp(k - it.u0);
      if (p <= 0) break;
      const col = (o.colorFn && o.colorFn(it.i, it.ch)) || o.color || C.ink, q = place(it, x0, y, size, o);
      g.save();
      g.translate(q.x, q.y); g.rotate(q.rot);
      g.fillStyle = col;
      if (p >= 1) g.fillText(it.ch, 0, 0);
      else {
        partialGlyph(g, it.gd, it.ch, famKey, weight, size, p, col);
        const hp = glyphHead(it.gd, p), cs = Math.cos(q.rot), sn = Math.sin(q.rot);
        head = [q.x + (hp[0] * cs - hp[1] * sn) * q.sc, q.y + (hp[0] * sn + hp[1] * cs) * q.sc];
      }
      g.restore();
    }
    g.restore();
    return { w: lay.width * (size / REF), head, done: k >= lay.units };
  };
  // Where the pen is at progress k (world), also between letters and across spaces (it glides to the next letter).
  SN.penAt = (s, x, y, k, o = {}) => {
    const famKey = o.fam || 'sans', weight = o.weight || 500, size = o.size || 40;
    const lay = layout(s, famKey, weight), x0 = lineX0(lay, x, size, o.align), its = lay.items.filter(it => !it.gd.space);
    if (!its.length) return [x, y];
    const at = (it, p) => { const q = place(it, x0, y, size, o), hp = glyphHead(it.gd, p), cs = Math.cos(q.rot), sn = Math.sin(q.rot); return [q.x + (hp[0] * cs - hp[1] * sn) * q.sc, q.y + (hp[0] * sn + hp[1] * cs) * q.sc]; };
    for (let i = 0; i < its.length; i++) {
      const it = its[i], p = k - it.u0;
      if (p < 0) { if (i === 0) return at(it, 0); const a = at(its[i - 1], 1), b = at(it, 0), prev = its[i - 1], gap = it.u0 - (prev.u0 + 1); const f = gap > 0 ? clamp((k - prev.u0 - 1) / gap) : 1; return [lerp(a[0], b[0], Ease.ioQ(f)), lerp(a[1], b[1], Ease.ioQ(f))]; }
      if (p < 1) return at(it, p);
    }
    return at(its[its.length - 1], 1);
  };
  // Glyph-unit progress for writing at `cps` letters per second starting at t0 (seconds), for SN.write's k.
  SN.kAt = (lt, t0, cps) => Math.max(0, (lt - t0) * cps);

  // ───────── props (screen space) ─────────
  // A whiteboard marker: nib at (x, y), body extends up and right along `ang` (radians, default -0.95 rad).
  // o: {color, ang, lift 0..1 (shadow offset), len, cap ('posted' | 'on' | 'none'), alpha, scale}
  SN.marker = (ctx, x, y, o = {}) => {
    const s = o.scale ?? 1, Lb = (o.len ?? 300) * s, wB = 34 * s, col = o.color || C.ink, ang = o.ang ?? -0.95, lift = o.lift ?? 0;
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    ctx.translate(x, y); ctx.rotate(ang);
    // body points along +x from the nib
    const shadowOff = 6 + 26 * lift;
    ctx.save();
    ctx.translate(shadowOff * 0.5, shadowOff);
    ctx.filter = `blur(${(4 + 10 * lift) * s}px)`;
    ctx.fillStyle = 'rgba(30,32,36,0.22)';
    rr(ctx, 6 * s, -wB / 2, Lb - 6 * s, wB, wB * 0.4); ctx.fill();
    ctx.restore();
    ctx.fillStyle = col; rr(ctx, -2 * s, -4.5 * s, 16 * s, 9 * s, 4 * s); ctx.fill();                  // nib
    ctx.fillStyle = linear(ctx, 0, -wB / 2, 0, wB / 2, [[0, '#E9ECEF'], [0.5, '#C9CED4'], [1, '#9EA5AD']]);    // cone
    ctx.beginPath(); ctx.moveTo(12 * s, -6 * s); ctx.lineTo(46 * s, -wB * 0.42); ctx.lineTo(46 * s, wB * 0.42); ctx.lineTo(12 * s, 6 * s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = linear(ctx, 0, -wB / 2, 0, wB / 2, [[0, '#FFFFFF'], [0.55, '#F1F3F5'], [1, '#CDD2D8']]);   // barrel
    rr(ctx, 44 * s, -wB / 2, Lb - 44 * s - 60 * s, wB, 5 * s); ctx.fill();
    ctx.fillStyle = col; ctx.globalAlpha *= 0.92;
    rr(ctx, Lb * 0.36, -wB / 2 + 6 * s, Lb * 0.28, wB - 12 * s, 3 * s); ctx.fill();                         // label band
    ctx.globalAlpha /= 0.92;
    if (o.cap === 'on') {                                                                                    // cap on the nib
      ctx.fillStyle = linear(ctx, 0, -wB / 2 - 3 * s, 0, wB / 2 + 3 * s, [[0, mix(col, '#FFFFFF', 0.35)], [0.45, col], [1, mix(col, '#000000', 0.35)]]);
      rr(ctx, -10 * s, -wB / 2 - 3 * s, 84 * s, wB + 6 * s, 9 * s); ctx.fill();
      ctx.fillStyle = mix(col, '#000000', 0.25); rr(ctx, 10 * s, wB / 2 - 1 * s, 54 * s, 9 * s, 3 * s); ctx.fill();
    } else if ((o.cap ?? 'posted') === 'posted') {                                                           // posted cap
      const c0 = Lb - 70 * s;
      ctx.fillStyle = linear(ctx, 0, -wB / 2 - 3 * s, 0, wB / 2 + 3 * s, [[0, mix(col, '#FFFFFF', 0.35)], [0.45, col], [1, mix(col, '#000000', 0.35)]]);
      rr(ctx, c0, -wB / 2 - 3 * s, 74 * s, wB + 6 * s, 8 * s); ctx.fill();
      ctx.fillStyle = mix(col, '#000000', 0.25); rr(ctx, c0 + 8 * s, wB / 2 - 1 * s, 52 * s, 9 * s, 3 * s); ctx.fill();   // clip
    }
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; rr(ctx, 48 * s, -wB / 2 + 4 * s, Lb - 160 * s, 4 * s, 2 * s); ctx.fill();   // highlight
    ctx.restore();
  };
  // The cap on its own (popping off): centre (x, y), angle, colour.
  SN.cap = (ctx, x, y, o = {}) => {
    const s = o.scale ?? 1, col = o.color || C.ink, w = 74 * s, h = 40 * s;
    ctx.save(); if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    ctx.translate(x, y); ctx.rotate(o.ang ?? 0);
    ctx.save(); ctx.translate(4, 10); ctx.filter = `blur(${6 * s}px)`; ctx.fillStyle = 'rgba(30,32,36,0.2)'; rr(ctx, -w / 2, -h / 2, w, h, 8 * s); ctx.fill(); ctx.restore();
    ctx.fillStyle = linear(ctx, 0, -h / 2, 0, h / 2, [[0, mix(col, '#FFFFFF', 0.35)], [0.45, col], [1, mix(col, '#000000', 0.35)]]);
    rr(ctx, -w / 2, -h / 2, w, h, 8 * s); ctx.fill();
    ctx.fillStyle = mix(col, '#000000', 0.25); rr(ctx, -w / 2 + 10 * s, h / 2 - 4 * s, 50 * s, 9 * s, 3 * s); ctx.fill();
    ctx.restore();
  };
  // Felt eraser seen from above, centre (x, y), angle.
  SN.eraserProp = (ctx, x, y, o = {}) => {
    const s = o.scale ?? 1, w = 250 * s, h = 104 * s, lift = o.lift ?? 0.3;
    ctx.save(); if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    ctx.translate(x, y); ctx.rotate(o.ang ?? 0);
    ctx.save(); ctx.translate(8 + 20 * lift, 14 + 24 * lift); ctx.filter = `blur(${(8 + 10 * lift) * s}px)`; ctx.fillStyle = 'rgba(30,32,36,0.28)'; rr(ctx, -w / 2, -h / 2, w, h, 16 * s); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#5E636B'; rr(ctx, -w / 2, -h / 2 + 8 * s, w, h - 8 * s, 14 * s); ctx.fill();                        // felt edge
    ctx.fillStyle = linear(ctx, 0, -h / 2, 0, h / 2, [[0, '#4C5A70'], [1, '#2E3644']]);                                   // handle
    rr(ctx, -w / 2, -h / 2, w, h - 14 * s, 16 * s); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.16)'; rr(ctx, -w / 2 + 14 * s, -h / 2 + 10 * s, w - 28 * s, 12 * s, 6 * s); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = `700 ${22 * s}px ${SN.famStack('sans')}`; ctx.textAlign = 'center'; ctx.fillText('ERASER', 0, 6 * s);
    ctx.restore();
  };
  // A vinyl dot sticker (dot voting): pops in with a squash.
  SN.sticker = (ctx, x, y, r, col, k = 1) => {
    if (k <= 0) return;
    const sc = Ease.outBack(clamp(k / 0.35), 2.6);
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    ctx.save(); ctx.translate(2, 4); ctx.filter = 'blur(3px)'; ctx.fillStyle = 'rgba(30,32,36,0.25)'; circle(ctx, 0, 0, r); ctx.fill(); ctx.restore();
    ctx.fillStyle = radial(ctx, -r * 0.3, -r * 0.35, 0, r * 1.2, [[0, mix(col, '#FFFFFF', 0.28)], [1, col]]); circle(ctx, 0, 0, r); ctx.fill();
    ctx.restore();
  };

  // ───────── camera ─────────
  // view: world point (cx, cy) at the frame centre, zoom z. apply(g) sets g's transform to world units.
  SN.view = (cx, cy, z) => ({
    cx, cy, z,
    apply(g) { g.setTransform(z, 0, 0, z, W / 2 - cx * z, H / 2 - cy * z); },
    sx(x) { return W / 2 + (x - cx) * z; },
    sy(y) { return H / 2 + (y - cy) * z; },
  });
  SN.lerpView = (a, b, k) => {                // zoom in log space so a move feels even
    const z = Math.exp(lerp(Math.log(a.z), Math.log(b.z), k));
    return SN.view(lerp(a.cx, b.cx, k), lerp(a.cy, b.cy, k), z);
  };
})();
