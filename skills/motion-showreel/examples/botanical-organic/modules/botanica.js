// botanica.js: the Mistfold drawing kit (a project module, P/modules/*.js), shared by every scene of this reel.
//
// The brand notes ask for a field-journal look: "a fine loam ink line, then watercolour washes that pool darker at
// their edges and let the oat paper show through. Leaves keep their real serrated margins and alternate up the stem."
// This module draws that look and nothing else; it never assigns SCENES. Everything is a pure function of its
// arguments (randomness only through the engine's hash/hsh2), and every costly picture (paper, light, leaf and seal
// sprites, plant geometry) is cached by its inputs, never by time.
//
//   MISTFOLD.paper(ctx, kind)                    oat or night paper: mottling, fibres, oat flecks (screen-fixed)
//   MISTFOLD.light(ctx, t, o)                     dappled leaf light drifting over the paper (+ a warm sun patch)
//   MISTFOLD.lsys(axiom, rules, n)                bracketed L-system rewriting
//   MISTFOLD.shoot(spec) / drawShoot(ctx, sh, T, o)   an L-system tea shoot (turtle) and its growth, one leaf per beat
//   MISTFOLD.leafSprite(key, L, w, look) / drawLeaf(...)   serrated watercolour leaves
//   MISTFOLD.inkText / label / softReveal         type that soaks into the paper; tracked labels; feathered sublines
//   MISTFOLD.flood(ctx, k, o) / bloom(ctx, k, o)  wet-colour transitions: night floods in from the edges, oat blooms out
//   MISTFOLD.seal(ctx, x, y, r, o)                the seal from images/seal.svg path data, pressed like a stamp
//   MISTFOLD.motes(ctx, t, o) / fireflies(ctx, t, o)   pollen in the light; fireflies at dusk
(() => {
  const MF = {};
  window.MISTFOLD = MF;
  const CACHE = new Map();
  const memo = (key, fn) => { if (!CACHE.has(key)) CACHE.set(key, fn()); return CACHE.get(key); };
  MF.memo = memo;

  // ───────── noise (smooth value noise on the engine's hash) ─────────
  const sstep = (t) => t * t * (3 - 2 * t);
  function vnoise(x, y, seed = 0) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = sstep(x - ix), fy = sstep(y - iy);
    const h = (a, b) => hsh2(a + seed * 17.131, b - seed * 9.713);
    return lerp(lerp(h(ix, iy), h(ix + 1, iy), fx), lerp(h(ix, iy + 1), h(ix + 1, iy + 1), fx), fy);
  }
  function fbm(x, y, seed = 0, oct = 4) {
    let a = 0.5, s = 0, n = 0;
    for (let i = 0; i < oct; i++) { s += a * vnoise(x, y, seed + i * 3.17); n += a; x = x * 2.03 + 7.3; y = y * 2.03 - 3.9; a *= 0.5; }
    return s / n;
  }
  MF.vnoise = vnoise; MF.fbm = fbm;
  // keyframes [[t, v], ...] with an ease per segment (default ioQ): piecewise, clamped at both ends
  MF.keys = (K, t, ease = Ease.ioQ) => {
    if (t <= K[0][0]) return K[0][1];
    for (let i = 1; i < K.length; i++) if (t <= K[i][0]) return lerp(K[i - 1][1], K[i][1], ease(rm(t, K[i - 1][0], K[i][0])));
    return K[K.length - 1][1];
  };

  // ───────── palette helpers ─────────
  // The light reel palette and the evening palette as the scenes need them, whatever env.palette is.
  MF.day = () => C;
  MF.night = () => C2 || C;
  // ink look for illustrations on each paper
  MF.look = (night) => night ? {
    paper: (C2 || C).bg, ink: (C2 || C).ink, leaf: '#4A6139', leaf2: '#7E9868', edge: '#20301C', young: '#7E9868', young2: '#A9BE92', stemTip: '#7E9868',
    stem: '#8C7A60', gold: (C2 || C).liquor || '#E3B65E', terracotta: (C2 || C).accent3, inkA: 0.55,
  } : {
    paper: C.bg, ink: C.ink, leaf: mix(C.leaf || '#7F9868', C.accent, 0.42), leaf2: mix(C.leaf || '#7F9868', C.accent2, 0.5), edge: mix(C.accent, '#2B3A1F', 0.3),
    young: mix(mix(C.accent2, C.liquor || '#D4A24A', 0.3), C.accent, 0.12), young2: mix(C.bud || '#B9C6A4', C.liquor || '#D4A24A', 0.18), stemTip: mix(C.accent2, C.accent, 0.4),
    stem: C.stem || '#5B4A36', gold: C.liquor || '#D4A24A', terracotta: C.accent3, inkA: 0.72,
  };

  // ───────── paper ─────────
  function noiseCanvas(cw, ch, seed, dark, light) {
    const n = makeBuf(cw, ch), im = n.g.createImageData(cw, ch);
    const [dr, dg, db] = parseColor(dark), [lr, lg, lb] = parseColor(light);
    for (let i = 0; i < cw * ch; i++) {
      const x = i % cw, y = Math.floor(i / cw), v = fbm(x * 0.35, y * 0.35, seed, 3) - 0.5, k = i * 4;
      if (v < 0) { im.data[k] = dr; im.data[k + 1] = dg; im.data[k + 2] = db; } else { im.data[k] = lr; im.data[k + 1] = lg; im.data[k + 2] = lb; }
      im.data[k + 3] = Math.min(255, Math.abs(v) * 4.2 * 255);
    }
    n.g.putImageData(im, 0, 0);
    return n.c;
  }
  function paperBuf(kind) {
    return memo('paper:' + kind, () => {
      const night = kind === 'night', P = night ? MF.night() : MF.day();
      const b = makeBuf(W, H), g = b.g;
      g.fillStyle = P.bg; g.fillRect(0, 0, W, H);
      const dark = night ? '#0C120A' : mix(P.bg, P.stem || '#5B4A36', 0.55), light = night ? mix(P.bg, '#4C5B42', 0.9) : '#FFFCF3';
      // mottling: soft clouds of slightly darker and lighter pulp at three scales
      for (const [cw, ch, a, blur, sd] of [[20, 12, night ? 0.1 : 0.04, 80, 1], [64, 36, night ? 0.08 : 0.035, 24, 2], [240, 135, night ? 0.07 : 0.055, 3, 3]]) {
        const c = noiseCanvas(cw, ch, sd + (night ? 40 : 0), dark, light);
        g.save(); g.globalAlpha = a; g.filter = `blur(${blur}px)`; g.imageSmoothingQuality = 'high';
        g.drawImage(c, -80, -80, W + 160, H + 160); g.restore();
      }
      // fibres: short curved hairs of pulp, lighter and darker than the sheet
      g.lineCap = 'round';
      for (let i = 0; i < 3200; i++) {
        const x = hash(i * 1.31 + 0.7) * W, y = hash(i * 2.17 + 5.3) * H, L = 5 + Math.pow(hash(i * 3.7), 2) * 42, a0 = hash(i * 5.1) * TAU;
        const cv = (hash(i * 7.9) - 0.5) * 0.9, lit = hash(i * 9.3) > 0.5;
        g.strokeStyle = rgba(lit ? light : dark, (lit ? (night ? 0.07 : 0.16) : (night ? 0.16 : 0.07)) + hash(i * 4.4) * 0.06);
        g.lineWidth = 0.45 + hash(i * 6.6) * 0.8;
        g.beginPath(); g.moveTo(x, y);
        const mx = x + Math.cos(a0) * L * 0.5 - Math.sin(a0) * cv * L * 0.35, my = y + Math.sin(a0) * L * 0.5 + Math.cos(a0) * cv * L * 0.35;
        g.quadraticCurveTo(mx, my, x + Math.cos(a0) * L, y + Math.sin(a0) * L);
        g.stroke();
      }
      // flecks: oat husk and leaf matter pressed into the sheet
      for (let i = 0; i < 520; i++) {
        const x = hash(i * 11.3 + 2.1) * W, y = hash(i * 13.7 + 9.9) * H, husk = hash(i * 3.3) > 0.82;
        const r = husk ? 2.2 + hash(i * 5.7) * 4.5 : 0.5 + Math.pow(hash(i * 5.7), 2) * 1.8, ry = husk ? r * (0.22 + hash(i * 7.1) * 0.2) : r * (0.6 + hash(i * 7.1) * 0.4);
        const col = night ? (hash(i * 2.9) > 0.5 ? '#0A0F08' : '#56664A') : (hash(i * 2.9) > 0.35 ? mix(P.stem || '#5B4A36', '#3A2E20', hash(i * 8.8)) : mix(P.leaf || '#7F9868', '#5B4A36', 0.5));
        g.fillStyle = rgba(col, (husk ? 0.22 : 0.32) + hash(i * 1.9) * 0.3);
        g.beginPath(); g.ellipse(x, y, r, ry, hash(i * 4.2) * TAU, 0, TAU); g.fill();
      }
      return b.c;
    });
  }
  MF.paperBuf = paperBuf;
  MF.paper = (ctx, kind = 'oat') => { ctx.drawImage(paperBuf(kind), 0, 0); };

  // ───────── dappled light ─────────
  function dappleBuf() {
    return memo('dapple', () => {
      const s = 0.5, w = Math.ceil(W * 1.4 * s), h = Math.ceil(H * 1.4 * s), b = makeBuf(w, h), g = b.g;
      g.fillStyle = mix(C.stem || '#5B4A36', C.ink, 0.4); g.strokeStyle = g.fillStyle;
      g.filter = 'blur(1.6px)';
      // three branches of a tea bush above the paper, entering from the top corners; their leaves cast the shadows
      const branches = [[[-0.02, 0.05], 0.42, 0.32, 1], [[1.02, -0.02], 2.55, 0.36, 2], [[0.55, -0.04], 1.75, 0.2, 3]];
      for (const [[bx, by], ang, len, sd] of branches) {
        let x = bx * w, y = by * h, a = ang;
        const L = len * w, steps = 16;
        g.lineWidth = 3.5; g.globalAlpha = 0.5; g.beginPath(); g.moveTo(x, y);
        const pts = [];
        for (let i = 1; i <= steps; i++) { a += (hash(sd * 13 + i) - 0.5) * 0.18; x += Math.cos(a) * L / steps; y += Math.sin(a) * L / steps; g.lineTo(x, y); pts.push([x, y, a]); }
        g.stroke();
        pts.forEach(([px, py, pa], i) => {
          if (i % 1 !== 0) return;
          const side = i % 2 ? 1 : -1, la = pa + side * (0.9 + hash(sd + i * 3.1) * 0.5), ll = (34 + hash(sd * 7 + i) * 26) * 1.0, lw = ll * 0.3;
          g.save(); g.translate(px, py); g.rotate(la); g.globalAlpha = 0.55 + hash(i * 5.5 + sd) * 0.4;
          g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(ll * 0.45, -lw, ll, 0); g.quadraticCurveTo(ll * 0.45, lw, 0, 0); g.fill();
          g.restore();
        });
      }
      return b.c;
    });
  }
  // t: seconds (any continuous clock); o.a shadow strength, o.sun [x, y, r] warm patch, o.sunA its strength
  MF.light = (ctx, t, o = {}) => {
    const a = o.a ?? 0.08;
    if (a > 0.002) {
      const c = dappleBuf(), w = W * 1.4, h = H * 1.4;
      const dx = Math.sin(t * 0.23) * 22 + Math.sin(t * 0.61 + 1.3) * 7, dy = Math.cos(t * 0.19) * 10 + Math.sin(t * 0.47) * 4, rot = Math.sin(t * 0.31) * 0.012;
      ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = a;
      ctx.translate(W * 0.5, -H * 0.1); ctx.rotate(rot); ctx.translate(-W * 0.5, H * 0.1);
      ctx.drawImage(c, -W * 0.2 + dx, -H * 0.2 + dy, w, h);
      ctx.restore();
    }
    if (o.sun && (o.sunA ?? 0.12) > 0) {
      const [x, y, r] = o.sun, k = o.sunA ?? 0.12, br = 1 + 0.04 * Math.sin(t * 0.7);
      ctx.save(); ctx.globalCompositeOperation = 'soft-light';
      softBlob(ctx, x + Math.sin(t * 0.17) * 30, y + Math.cos(t * 0.13) * 20, r * br, C.liquor || '#D4A24A', k * 2.2);
      ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      softBlob(ctx, x + Math.sin(t * 0.17) * 30, y + Math.cos(t * 0.13) * 20, r * 0.8 * br, '#FFF2D2', k * 0.55);
      ctx.restore();
    }
  };

  // ───────── granulation tile (pigment settling in the paper's tooth) ─────────
  function grainTile() {
    return memo('grainTile', () => {
      const s = 256, b = makeBuf(s, s), im = b.g.createImageData(s, s);
      for (let i = 0; i < s * s; i++) {
        const x = i % s, y = Math.floor(i / s);
        const v = 0.55 * vnoise(x * 0.45, y * 0.45, 77) + 0.45 * hash(i * 0.913 + 3.1), c = Math.round(255 - 150 * Math.pow(v, 1.6));
        im.data[i * 4] = c; im.data[i * 4 + 1] = c; im.data[i * 4 + 2] = c; im.data[i * 4 + 3] = 255;
      }
      b.g.putImageData(im, 0, 0);
      return b.c;
    });
  }
  MF.grainTile = grainTile;

  // ───────── leaves ─────────
  // A tea leaf pointing along +x from its base at (0, 0): elliptic, widest a little below the middle, acuminate tip,
  // forward-pointing serrations on the outer 80 % of both margins. Returns the outline and the vein lines.
  // Leaf outline from a per-leaf "genome" (o.seed): where the blade is widest, how asymmetric the two halves are,
  // the drip tip, a wavy margin, irregular forward-pointing teeth, the midrib's bend, the vein count, and now and
  // then an insect bite. No two seeds give the same leaf, so a bush never reads as one sprite repeated.
  function leafGeo(L, w, o = {}) {
    const sd = o.seed ?? 1, R = (k) => hash(sd * 13.37 + k * 7.91);
    const n = o.n ?? 64, serr0 = o.serr ?? 0.06, tip = o.tip ?? 0.4;
    const teeth = Math.max(0, Math.round((o.teeth ?? 13) * (0.8 + 0.4 * R(1)))), serr = serr0 * (0.7 + 0.6 * R(2));
    const bend = (o.bend ?? 0.07) * (R(3) < 0.5 ? -1 : 1) * (0.5 + 0.9 * R(4));
    const wp = 0.74 + 0.22 * R(5), base = 0.65 + 0.4 * R(9), asym = (R(6) - 0.5) * 0.18, wave = 0.03 * R(8) * (o.wave ?? 1);
    const drip = o.drip ?? (0.05 + 0.09 * R(7));
    const bite = R(10) < (o.bite ?? 0.16) ? { u: 0.35 + 0.4 * R(11), side: R(12) < 0.5 ? 1 : -1, r: 0.055 + 0.04 * R(13), d: 0.28 + 0.2 * R(14) } : null;
    const shape = (u) => {
      let f = Math.pow(Math.sin(Math.PI * Math.pow(clamp(u), wp)), base) * (1 - tip * Math.pow(u, 2.6));
      if (u > 1 - drip) f *= Math.pow((1 - u) / drip, 0.35) * 0.85 + 0.15 * ((1 - u) / drip);   // the drawn-out drip tip
      return f * (1 + wave * Math.sin(u * TAU * 2.5 + sd));
    };
    const half = (u) => w * shape(u);
    const ctr = (u) => bend * L * Math.sin(Math.PI * u) * 0.6 + bend * L * 0.12 * Math.sin(Math.PI * 2 * u) * (R(15) - 0.5);
    const Rt = [], Lf = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, c = ctr(u);
      for (const [side, arr] of [[1, Rt], [-1, Lf]]) {
        let hw = half(u) * (1 + side * asym), tooth = 0;
        if (u > 0.14 && u < 0.95 && serr > 0 && teeth > 0) {
          const ph = ((u - 0.14) / 0.81) * teeth + (side > 0 ? 0 : 0.37) + 0.18 * Math.sin(u * 19 + sd * 3);
          const j = Math.floor(ph), depth = 0.6 + 0.8 * hash(j * 4.1 + sd + side * 9);
          tooth = serr * w * Math.pow(ph - j, 1.4) * (1 - 0.6 * u) * depth;
        }
        if (bite && side === bite.side) { const q = (u - bite.u) / bite.r; if (Math.abs(q) < 1) hw *= 1 - bite.d * Math.sqrt(1 - q * q); }
        arr.push([u * L, c + side * (hw + tooth)]);
      }
    }
    const poly = Rt.concat(Lf.reverse());
    const mid = [];
    for (let i = 0; i <= 24; i++) { const u = (i / 24) * 0.97; mid.push([u * L, ctr(u)]); }
    const veins = [], nv = 6 + Math.floor(R(16) * 3);
    for (let k = 0; k < nv; k++) {
      for (const side of [1, -1]) {
        const u0 = 0.08 + k * (0.8 / nv) + (hash(k * 3.3 + side + sd) - 0.5) * 0.03, u1 = Math.min(u0 + 0.12 + 0.05 * hash(k + sd * 2 + side), 0.94);
        veins.push([[u0 * L, ctr(u0)], [(u0 + 0.045) * L, ctr(u0) + side * half(u0) * 0.45], [u1 * L, ctr(u1) + side * half(u1) * (0.7 + 0.1 * hash(k * 7 + sd))]]);
      }
    }
    return { poly, mid, veins, half, ctr, R, bite };
  }
  MF.leafGeo = leafGeo;
  function pathOf(pts, ox, oy, amp, seed, scale = 0.05) {
    const p = new Path2D();
    pts.forEach(([x, y], i) => {
      const nz = amp ? (vnoise(x * scale + seed, y * scale * 2 + seed * 0.5, seed) - 0.5) * 2 * amp : 0;
      const X = ox + x, Y = oy + y + nz * (y >= 0 ? 1 : -1);
      if (i) p.lineTo(X, Y); else p.moveTo(X, Y);
    });
    p.closePath();
    return p;
  }
  // look: {fill, fill2, edge, ink, inkA, seed, hairs, teeth, serr, tip, bend, night}
  function leafSprite(key, L, w, look) {
    return memo('leaf:' + key, () => {
      const res = look.res ?? 2, pad = Math.ceil(w * 0.6 + 14), cw = Math.ceil(L + pad * 2), ch = Math.ceil(w * 2.8 + pad * 2), b = makeBuf(cw * res, ch * res), g = b.g;
      g.scale(res, res);                                   // supersampled: crisp under a 2x camera
      const ox = pad, oy = ch / 2, sd = look.seed ?? 1, geo = leafGeo(L, w, look), R = geo.R;
      // per-leaf colour: some leaves a touch warmer (sun side, older), some cooler and bluer (shade side)
      const shift = R(20) - 0.5, tone = shift > 0 ? (look.night ? '#5B5A2E' : '#B3A34E') : (look.night ? '#1C2C2A' : '#3D6656');
      look = { ...look, fill: mix(look.fill, tone, Math.abs(shift) * 0.32), fill2: mix(look.fill2, tone, Math.abs(shift) * 0.22) };
      const p1 = pathOf(geo.poly, ox, oy, w * 0.07, sd + 1), p2 = pathOf(geo.poly, ox + 1.5, oy - 1, w * 0.12, sd + 2), pInk = pathOf(geo.poly, ox, oy, w * 0.025, sd + 5, 0.12);
      // an opaque underlayer so overlapping leaves hide each other (watercolour on top of it, not see-through)
      g.save(); g.filter = 'blur(0.6px)'; g.fillStyle = mix(look.fill, look.night ? '#101710' : (look.paper || C.bg), look.night ? 0.2 : 0.18); g.fill(p1); g.restore();
      // wash 1: the body, darker at the base, lighter towards the tip
      g.save(); g.filter = 'blur(0.8px)'; g.globalAlpha = look.night ? 0.92 : 0.86;
      g.fillStyle = linear(g, ox, 0, ox + L, 0, [[0, look.fill], [0.55, mix(look.fill, look.fill2, 0.35)], [1, look.fill2]]);
      g.fill(p1); g.restore();
      // wash 2: a second, wetter layer that does not quite register
      g.save(); g.filter = 'blur(1.6px)'; g.globalAlpha = 0.34; g.fillStyle = look.fill2; g.fill(p2); g.restore();
      // inside the leaf: granulation, pooled edge, a dry-brush light streak where the paper shows through
      g.save(); g.clip(p1);
      g.globalCompositeOperation = 'multiply'; g.globalAlpha = look.night ? 0.2 : 0.26;
      g.fillStyle = g.createPattern(grainTile(), 'repeat'); g.fillRect(0, 0, cw, ch);
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = look.night ? 0.55 : 0.5; g.filter = 'blur(2.2px)';
      g.strokeStyle = look.edge; g.lineWidth = Math.max(3.5, w * 0.16); g.stroke(p1);
      g.filter = 'blur(5px)'; g.globalCompositeOperation = 'destination-out'; g.globalAlpha = look.night ? 0.16 : 0.3;
      g.beginPath();
      for (let i = 0; i <= 16; i++) { const u = 0.12 + (i / 16) * 0.7; const y = geo.ctr(u) - geo.half(u) * 0.48; if (i) g.lineTo(ox + u * L, oy + y); else g.moveTo(ox + u * L, oy + y); }
      g.lineWidth = w * 0.32; g.lineCap = 'round'; g.stroke();
      g.restore();
      // age marks on some leaves: a brown edge where the blade dried, a few rust speckles
      if (!look.clean) {
        g.save(); g.clip(p1); g.globalCompositeOperation = 'source-atop';
        if (R(21) < 0.12) {
          const u = 0.55 + 0.35 * R(22), side = R(23) < 0.5 ? 1 : -1, x = ox + u * L, y = oy + geo.ctr(u) + side * geo.half(u);
          g.filter = 'blur(4px)'; g.fillStyle = rgba(look.night ? '#5A4630' : '#9C7A45', 0.22); circle(g, x, y, w * (0.35 + 0.3 * R(24))); g.fill(); g.filter = 'none';
        }
        if (R(25) < 0.15) {
          for (let i = 0; i < 2 + Math.floor(R(26) * 3); i++) {
            const u = 0.2 + 0.65 * hash(i * 2.7 + sd), v = (hash(i * 5.1 + sd) - 0.5) * 1.3, r = 0.8 + 1.8 * hash(i * 9.3 + sd);
            g.fillStyle = rgba(look.night ? '#4E3B24' : '#8A6A3C', 0.2 + 0.15 * hash(i + sd)); circle(g, ox + u * L, oy + geo.ctr(u) + v * geo.half(u), r); g.fill();
          }
        }
        g.restore();
      }
      // ink: outline, midrib and veins, thin and a little unsteady (a pen nib, never heavier)
      g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
      g.strokeStyle = rgba(look.ink, look.inkA ?? 0.7); g.lineWidth = Math.max(0.9, Math.min(1.6, L / 150)); g.stroke(pInk);
      g.beginPath(); geo.mid.forEach(([x, y], i) => (i ? g.lineTo(ox + x, oy + y) : g.moveTo(ox + x, oy + y)));
      g.strokeStyle = rgba(look.ink, (look.inkA ?? 0.7) * 0.8); g.lineWidth = Math.max(0.9, L / 130); g.stroke();
      g.strokeStyle = rgba(look.ink, (look.inkA ?? 0.7) * 0.42); g.lineWidth = Math.max(0.6, L / 260);
      for (const [a, c, d] of geo.veins) { g.beginPath(); g.moveTo(ox + a[0], oy + a[1]); g.quadraticCurveTo(ox + c[0], oy + c[1], ox + d[0], oy + d[1]); g.stroke(); }
      if (look.hairs) {                                       // young leaves and buds are downy: fine silver hairs at the margin
        g.strokeStyle = rgba(look.night ? '#F2EBDA' : '#FFFFFF', 0.55); g.lineWidth = 0.6;
        for (let i = 0; i < geo.poly.length; i += 2) {
          const [x, y] = geo.poly[i], dir = y >= 0 ? 1 : -1, l = 2 + hash(i * 1.7 + sd) * 3.5;
          g.beginPath(); g.moveTo(ox + x, oy + y); g.lineTo(ox + x + l * 0.6, oy + y + dir * l); g.stroke();
        }
      }
      g.restore();
      return { c: b.c, ox, oy, L, w, res };
    });
  }
  MF.leafSprite = leafSprite;
  MF.drawLeaf = (ctx, spr, x, y, ang, sx = 1, sy = 1, a = 1) => {
    if (a <= 0.003 || sx <= 0.001 || Math.abs(sy) <= 0.001) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(sx, sy); ctx.globalAlpha *= a;
    const r = spr.res || 1;
    ctx.drawImage(spr.c, -spr.ox, -spr.oy, spr.c.width / r, spr.c.height / r);
    ctx.restore();
  };

  // ───────── L-system shoots ─────────
  MF.lsys = (axiom, rules, n) => {
    let s = axiom;
    for (let i = 0; i < n; i++) {
      let o = '';
      for (const ch of s) { const r = rules[ch]; o += r === undefined ? ch : typeof r === 'function' ? r(i) : r; }
      s = o;
    }
    return s;
  };
  // Tea shoot grammar. A and B are the apex (the next leaf goes left or right: alternate phyllotaxy), I a new
  // internode that matures into F, L a leaf; after n rewrites the apex becomes the bud K.
  MF.SHOOT_RULES = { A: 'I[+L]B', B: 'I[-L]A', I: 'F' };
  // spec: {x, y, heading, n, len, decay, young, lens (explicit internode lengths: a parametric L-system), bend,
  // bends (per internode), bendJit, leafAng, sizes: [[L, w, kind, dAng], ...], seed, first: '+'|'-', sched}
  MF.shoot = (spec) => memo('shoot:' + JSON.stringify(spec), () => {
    let str = MF.lsys(spec.first === '-' ? 'B' : 'A', MF.SHOOT_RULES, spec.n);
    str = str.replace(/[AB]$/, 'K');
    let x = spec.x, y = spec.y, h = spec.heading ?? -Math.PI / 2, s = 0, fi = 0, side = 0;
    const pts = [[x, y, 0, h]], leaves = [];
    let bud = null;
    for (const ch of str) {
      if (ch === 'F' || ch === 'I') {
        const len = spec.lens ? spec.lens[Math.min(fi, spec.lens.length - 1)]
          : spec.len * (ch === 'I' ? spec.young ?? 0.7 : 1) * Math.pow(spec.decay ?? 0.88, fi) * (1 + (hash(fi * 3.7 + (spec.seed || 0)) - 0.5) * 0.2);
        const bnd = spec.bends ? spec.bends[Math.min(fi, spec.bends.length - 1)] : spec.bend ?? 0;
        const steps = 10, turn = bnd + (hash(fi * 5.3 + (spec.seed || 0) * 2) - 0.5) * (spec.bendJit ?? 0.12);
        for (let k = 1; k <= steps; k++) { h += turn / steps; x += Math.cos(h) * len / steps; y += Math.sin(h) * len / steps; s += len / steps; pts.push([x, y, s, h]); }
        fi++;
      } else if (ch === '+') side = -1;
      else if (ch === '-') side = 1;
      else if (ch === 'L') {
        const k = leaves.length, sz = (spec.sizes && spec.sizes[Math.min(k, spec.sizes.length - 1)]) || [120, 34, 'mature'];
        leaves.push({ k, s, fi: fi - 1, side, L: sz[0], w: sz[1], kind: sz[2], ang: (spec.leafAng ?? 0.95) + (sz[3] ?? 0) + (hash(k * 9.1 + (spec.seed || 0)) - 0.5) * 0.2, foldF: sz[4] ?? (sz[2] === 'young' ? 0.3 : 0.06) });
      } else if (ch === 'K') bud = { s };
    }
    return { spec, str, pts, leaves, bud: bud || { s }, S: s };
  });
  // The tea plant of this reel (grow raises it; steep picks its flush). Five leaves alternate up the stem, the last two
  // young, then the bud: 'two leaves and a bud'. Schedule in beats: the stem surges between nodes and every leaf
  // lands fully open on a beat (2, 3, 4, 5, 6), the brand's 'one leaf per beat'.
  MF.TEA_PLANT = {
    x: 600, y: 922, heading: -Math.PI / 2 - 0.06, n: 5, lens: [120, 200, 168, 134, 92], bends: [0.05, 0.08, 0.09, 0.1, 0.12], bendJit: 0.05,
    leafAng: 1.0, seed: 4, first: '-', budL: 84, budW: 13,
    sizes: [[272, 72, 'mature', 0.24], [252, 66, 'mature', 0.14], [216, 57, 'mature', 0.04], [176, 44, 'young', -0.16, 0.24], [146, 36, 'young', -0.3, 0.55]],
    sched: { front: [[0, 714]], leaves: [0, 0, 0, 0, 0], bud: [0, 0] },
    // the new season's flush breaks from the bud at the top of last year's wood (internodes 0-1, leaves 0-1 are old):
    // in beats; the three new internodes overlap, each leaf comes out folded and opens over about two beats
    grow: { base: 2, scales: [0.4, 1.3], inter: [null, null, [0.7, 3.0], [1.5, 4.1], [2.3, 5.0]], leaves: [null, null, [0.8, 1.7, 3.3], [1.7, 2.8, 4.6], [2.6, 4.0, 5.6]], bud: [0.3, 5.4] },
  };
  MF.FLUSH_CUT = 560;                                     // the pick: the stem is snapped between leaf 3 and leaf 4
  // the flush's centre in world space (no sway): where grow's camera ends and steep's begins
  MF.flushAnchor = () => memo('flushAnchor', () => {
    const sh = MF.shoot(MF.TEA_PLANT), a = MF.at(sh.pts, MF.FLUSH_CUT), b = sh.pts[sh.pts.length - 1];
    return [lerp(a[0], b[0], 0.55) + 18, lerp(a[1], b[1], 0.55) - 10];
  });
  MF.FLUSH_VIEW = { x: 960, y: 520, z: 2.0 };             // the flush on screen at the grow -> steep match cut
  // Sampled stem with sway: cumulative bend grows towards the tip. Returns [[x, y, s, heading], ...] in world space.
  MF.swayPts = (sh, sway = 0, t = 0, o = {}) => {
    const P = sh.pts, out = [[P[0][0], P[0][1], 0, P[0][3]]];
    let x = P[0][0], y = P[0][1], prevH = P[0][3];
    const amp = sway, S = sh.S || 1, ph = o.phase ?? 0;
    for (let i = 1; i < P.length; i++) {
      const s = P[i][2], u = s / S, ang = amp * (Math.sin(t * 0.9 + ph) * 0.7 + Math.sin(t * 1.7 + ph * 1.3) * 0.3) * Math.pow(u, 1.6);
      const dx = P[i][0] - P[i - 1][0], dy = P[i][1] - P[i - 1][1], c = Math.cos(ang), sn = Math.sin(ang);
      x += dx * c - dy * sn; y += dx * sn + dy * c;
      out.push([x, y, s, P[i][3] + ang]);
      prevH = P[i][3] + ang;
    }
    return out;
  };
  MF.at = (pts, s) => {
    if (s <= 0) return pts[0];
    for (let i = 1; i < pts.length; i++) if (pts[i][2] >= s) {
      const a = pts[i - 1], b = pts[i], k = (s - a[2]) / (b[2] - a[2] || 1);
      return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), s, lerp(a[3], b[3], k)];
    }
    return pts[pts.length - 1];
  };
  // Tapered stem from s0 to s1 (the growing tip is pointed). look: {stem, ink, inkA}, w0/w1 widths at base/tip.
  MF.drawStem = (ctx, pts, s0, s1, w0, w1, look, a = 1, o = {}) => {
    if (s1 <= s0 + 0.5 || a <= 0.003) return;
    const S = pts[pts.length - 1][2] || 1, Lp = [], Rp = [], taper = o.taper ?? true;
    const sample = [];
    for (const p of pts) if (p[2] > s0 && p[2] < s1) sample.push(p);
    sample.unshift(MF.at(pts, s0)); sample.push(MF.at(pts, s1));
    sample.forEach((p) => {
      const u = p[2] / S, tipK = taper ? clamp((s1 - p[2]) / 14) : 1, wv = lerp(w0, w1, u) * (0.25 + 0.75 * tipK) / 2;
      const nx = -Math.sin(p[3]), ny = Math.cos(p[3]);
      Lp.push([p[0] + nx * wv, p[1] + ny * wv]); Rp.push([p[0] - nx * wv, p[1] - ny * wv]);
    });
    ctx.save(); ctx.globalAlpha *= a;
    ctx.beginPath(); Lp.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); for (let i = Rp.length - 1; i >= 0; i--) ctx.lineTo(Rp[i][0], Rp[i][1]); ctx.closePath();
    // colour by absolute position on the stem (woody brown below, green towards the tip), so split draws meet seamlessly
    const colAt = (u) => (look.stemTip ? mix(look.stem, look.stemTip, clamp((u - 0.55) / 0.4)) : look.stem);
    const b0 = MF.at(pts, s0), b1 = MF.at(pts, s1);
    ctx.fillStyle = linear(ctx, b0[0], b0[1], b1[0] + 0.01, b1[1] + 0.01, [[0, colAt(s0 / S)], [0.5, colAt((s0 + s1) / 2 / S)], [1, colAt(s1 / S)]]);
    ctx.fill();
    ctx.lineJoin = 'round'; ctx.strokeStyle = rgba(look.ink, (look.inkA ?? 0.7) * 0.75); ctx.lineWidth = 1;
    ctx.beginPath(); Rp.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
    ctx.restore();
  };
  // Draw a shoot grown to beat T. sched: {front: [[beat, s], ...], leaves: [beat each leaf is fully open], bud: [b0, b1]}.
  // o: {sway, t, look, night, from (s where the drawing starts: a picked flush), alpha, alphaFn(s) per part, w0, w1}
  MF.drawShoot = (ctx, sh, T, o = {}) => {
    const look = o.look || MF.look(o.night), sched = sh.spec.sched, from = o.from ?? 0, to = o.to ?? Infinity;
    const front = Math.min(sh.S, MF.keys(sched.front, T, Ease.ioQ));
    const pts = MF.swayPts(sh, o.sway ?? 0, o.t ?? 0, { phase: sh.spec.seed || 0 });
    const af = o.alphaFn || (() => 1), A = o.alpha ?? 1;
    MF.drawStem(ctx, pts, from, Math.min(front, to), o.w0 ?? 7, o.w1 ?? 2.2, look, A * af(from), { taper: front < to });
    const out = { pts, front, leaves: [] };
    for (const lf of sh.leaves) {
      if (lf.s < from - 0.5 || lf.s >= to) continue;
      const b = sched.leaves[lf.k] ?? 99, u = rm(T, b - (o.unfurl ?? 0.9), b);
      if (u <= 0 || lf.s > front + 1) continue;
      const node = MF.at(pts, lf.s), e = Ease.outQuint(u);
      const flutter = Math.sin((o.t ?? 0) * 1.3 + lf.k * 1.9) * 0.035 * (o.sway ? 1 : 0);
      const ang = node[3] + lf.side * lf.ang * lerp(0.15, 1, e) + flutter;
      MF.leafDev(ctx, sh, lf, node[0], node[1], ang, { len: lerp(0.3, 1, e), wid: lerp(0.6, 1, e), fold: lerp(1.4, lf.foldF, Ease.outC(u)), ripe: 1, a: A * af(lf.s) * Ease.outC(rm(u, 0, 0.18)) }, look, o);
      out.leaves.push({ k: lf.k, x: node[0], y: node[1], ang, u });
    }
    if (sh.bud && sched.bud && to >= sh.S && front > 2) {
      const u = rm(T, sched.bud[0], sched.bud[1]), e = Ease.outQuint(u), grow0 = clamp(front / 30);
      const tipP = MF.at(pts, front), BL = sh.spec.budL ?? 80, BW = sh.spec.budW ?? 12, sc = lerp(0.42, 1, e) * grow0;
      MF.budDev(ctx, sh, tipP[0], tipP[1], tipP[3] - 0.04, sc, A * af(sh.S), look, o);
      out.bud = { x: tipP[0] + Math.cos(tipP[3]) * BL * sc, y: tipP[1] + Math.sin(tipP[3]) * BL * sc, ang: tipP[3], u };
    }
    return out;
  };

  // ───────── development: how a real leaf and shoot grow (used by every shoot, grown or growing) ─────────
  // A tea leaf comes out of the bud folded along its midrib (conduplicate), pressed against the stem, narrow and
  // pale, then elongates, spreads away from the stem and opens like a book while it widens and darkens. It is never a
  // small copy of the grown leaf: the two halves are drawn separately and each is rotated about the midrib.
  // st: {len (0..1 of final length), wid (width factor: young leaves are narrow), fold (rad, 0 = flat, 1.5 = shut),
  // ripe (0 young colours .. 1 mature colours), a}
  function leafSprites(sh, lf, look, o) {
    const lseed = lf.k * 17 + (sh.spec.seed || 0) * 101 + 3, n = o.night ? 'n' : 'd', mature = lf.kind !== 'young';
    const base = { ink: look.ink, inkA: look.inkA, seed: lseed, night: !!o.night };
    const young = leafSprite(`dev:y:${lseed}:${Math.round(lf.L)}:${n}:${look.young}`, lf.L, lf.w * (mature ? 0.92 : 1), { ...base, fill: look.young, fill2: look.young2, edge: look.leaf, hairs: true, teeth: 10, serr: 0.045, bite: 0, clean: true });
    const ripe = mature ? leafSprite(`dev:m:${lseed}:${Math.round(lf.L)}:${n}:${look.leaf}:${look.edge}`, lf.L, lf.w, { ...base, fill: look.leaf, fill2: look.leaf2, edge: look.edge, teeth: 13, serr: 0.06, bite: 0.2 }) : null;
    return { young, ripe };
  }
  // one sprite drawn as two halves folded about the midrib; we look at the fold from slightly to one side (beta), so a
  // shut leaf shows both halves stacked on one side and an open one shows them spread
  function foldDraw(ctx, spr, x, y, ang, sx, wsc, side, fold, a, filterB) {
    if (a <= 0.003 || sx <= 0.001) return;
    const beta = 0.42, sA = Math.cos(fold - beta), sB = Math.cos(fold + beta), r = spr.res || 1, cw = spr.c.width / r, ch = spr.c.height / r;
    const half = (top, sy, under) => {
      if (Math.abs(sy) < 0.01) return;
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(sx, side * wsc * sy); ctx.globalAlpha *= a;
      ctx.beginPath(); ctx.rect(-spr.ox, top ? -spr.oy : 0, cw, spr.oy + 0.5); ctx.clip();
      if (under) ctx.filter = filterB;                                     // the underside: paler, greyer, matt
      ctx.drawImage(spr.c, -spr.ox, -spr.oy, cw, ch);
      ctx.restore();
    };
    half(true, sA, false);
    half(false, sB, sB < 0);
  }
  MF.leafDev = (ctx, sh, lf, x, y, ang, st, look, o = {}) => {
    const S = leafSprites(sh, lf, look, o), ripe = S.ripe ? clamp(st.ripe ?? 1) : 0, a = st.a ?? 1;
    const under = o.night ? 'brightness(1.12) saturate(0.7)' : 'brightness(1.1) saturate(0.65) contrast(0.92)';
    if (ripe < 1) foldDraw(ctx, S.young, x, y, ang, st.len, st.wid, lf.side, st.fold, a, under);
    if (ripe > 0) foldDraw(ctx, S.ripe, x, y, ang, st.len, st.wid, lf.side, st.fold, a * ripe, under);
  };
  // the terminal bud: a rolled, downy spear (a leaf still shut tight), silver at the edge
  MF.budDev = (ctx, sh, x, y, ang, sc, a, look, o = {}) => {
    const BL = sh.spec.budL ?? 80, BW = sh.spec.budW ?? 12;
    const spr = leafSprite(`bud:${BL}:${o.night ? 'n' : 'd'}:${look.young}:${look.young2}`, BL, BW * 1.6, { fill: look.young, fill2: look.young2, edge: look.leaf, ink: look.ink, inkA: look.inkA, seed: 9, hairs: true, night: !!o.night, teeth: 0, serr: 0, tip: 0.7, bend: 0.03, bite: 0, clean: true, drip: 0.04 });
    foldDraw(ctx, spr, x, y, ang, sc, lerp(0.8, 1, sc), 1, 1.32, a, 'brightness(1.15) saturate(0.6)');
  };

  // A growing shoot. spec.grow: {inter: [[b0, b1] | null per internode], leaves: [[emerge, open0, open1] | null],
  // bud: [b0, b1], scales: [b0, b1] (bud break at the base of the new growth)}. Old internodes/leaves (null) stand
  // from the start. Each new internode elongates on its own logistic curve, so the leaves already out are carried up
  // as the stem stretches below them (the tip is not 'drawn'); the growing zone nods in a slow ellipse
  // (circumnutation) and leans to the light, then stiffens as it matures. At full growth this is exactly MF.shoot.
  MF.drawGrowing = (ctx, spec, T, o = {}) => {
    const sh = MF.shoot(spec), G = spec.grow, look = o.look || MF.look(o.night), t = o.t ?? 0;
    const g = spec.lens.map((_, i) => (G.inter[i] ? Ease.ioSine(rm(T, G.inter[i][0], G.inter[i][1])) : 1));
    const active = g.map((v, i) => (G.inter[i] ? Math.sin(Math.PI * v) : 0));
    // rebuild the stem with stretched internodes (same turns and jitter as MF.shoot)
    let str = sh.str, x = spec.x, y = spec.y, h = spec.heading ?? -Math.PI / 2, s = 0, fi = 0;
    const pts = [[x, y, 0, h]], nodeS = [];
    for (const ch of str) {
      if (ch !== 'F' && ch !== 'I') continue;
      const len = spec.lens[Math.min(fi, spec.lens.length - 1)] * (0.035 + 0.965 * g[fi]);
      const bnd = spec.bends[Math.min(fi, spec.bends.length - 1)], steps = 10;
      let turn = bnd + (hash(fi * 5.3 + (spec.seed || 0) * 2) - 0.5) * (spec.bendJit ?? 0.12);
      turn = turn * (0.4 + 0.6 * g[fi]) + active[fi] * (0.16 * Math.sin(t * 2.3 + fi * 0.9) + 0.07);    // nutation + lean
      for (let k = 1; k <= steps; k++) { h += turn / steps; x += Math.cos(h) * len / steps; y += Math.sin(h) * len / steps; s += len / steps; pts.push([x, y, s, h]); }
      nodeS.push(s); fi++;
    }
    const cur = { pts, S: s, spec };
    const sp = MF.swayPts(cur, o.sway ?? 0, t, { phase: spec.seed || 0 });
    const from = o.from ?? 0, to = o.to ?? Infinity, A = o.alpha ?? 1;
    MF.drawStem(ctx, sp, from, Math.min(s, to), o.w0 ?? 7, o.w1 ?? 2.2, look, A, { taper: to >= s });
    // bud break: two brown scales and a small 'fish leaf' peel back at the base of the new growth
    if (G.scales && from <= nodeS[G.base - 1] + 1) {
      const q = Ease.outC(rm(T, G.scales[0], G.scales[1])), n0 = MF.at(sp, nodeS[G.base - 1]);
      const sc = leafSprite(`scale:${o.night ? 'n' : 'd'}`, 34, 14, { fill: mix(look.stem, look.young, 0.35), fill2: mix(look.stem, look.young2, 0.5), edge: look.stem, ink: look.ink, inkA: look.inkA, seed: 5, teeth: 0, serr: 0, tip: 0.5, bite: 0, clean: true });
      for (const sd of [-1, 1]) foldDraw(ctx, sc, n0[0], n0[1], n0[3] + sd * lerp(0.08, 0.95, q), 1, 1, sd, lerp(1.3, 0.5, q), A, 'brightness(1.1)');
    }
    const out = { pts: sp, front: s, leaves: [], g };
    for (const lf of sh.leaves) {
      const ns = nodeS[lf.fi] ?? lf.s;
      if (ns < from - 0.5 || ns >= to) continue;
      const L = G.leaves[lf.k], node = MF.at(sp, ns);
      let st, spread;
      if (!L) { st = { len: 1, wid: 1, fold: lf.foldF, ripe: 1, a: A }; spread = 1; }
      else {
        if (T < L[0]) continue;
        const grow = rm(T, L[0], L[2] + 0.4), open = Ease.ioC(rm(T, L[1], L[2]));
        st = { len: lerp(0.2, 1, Ease.outC(grow)), wid: lerp(0.5, 1, Ease.ioC(grow)), fold: lerp(1.45, lf.foldF, open), ripe: rm(T, L[2] - 0.4, L[2] + 1.2), a: A * Ease.outC(rm(T, L[0], L[0] + 0.3)) };
        spread = lerp(0.08, 1, open);
      }
      const flutter = Math.sin(t * 1.3 + lf.k * 1.9) * 0.035 * (o.sway ? 1 : 0);
      const ang = node[3] + lf.side * lf.ang * spread + flutter;
      MF.leafDev(ctx, sh, lf, node[0], node[1], ang, st, look, o);
      out.leaves.push({ k: lf.k, x: node[0], y: node[1], ang });
    }
    if (s >= from - 0.5 && s <= to) {
      const tipP = sp[sp.length - 1], bs = lerp(0.45, 1, Ease.ioC(rm(T, G.bud[0], G.bud[1])));
      MF.budDev(ctx, sh, tipP[0], tipP[1], tipP[3] - 0.04, bs, A, look, o);
      const BL = spec.budL ?? 80;
      out.bud = { x: tipP[0] + Math.cos(tipP[3]) * BL * bs, y: tipP[1] + Math.sin(tipP[3]) * BL * bs, ang: tipP[3] };
    }
    return out;
  };

  // A tapered ink brush stroke along pts (screen or world space), drawn on to fraction p. w: max width.
  MF.brush = (ctx, pts, w, color, p = 1, o = {}) => {
    if (p <= 0) return;
    const n = pts.length, last = Math.max(1, Math.floor((n - 1) * clamp(p))), L = [], R = [];
    for (let i = 0; i <= last; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const u = i / (n - 1), prof = Math.pow(Math.sin(Math.PI * clamp(u * (o.head ?? 1.15))), 0.55) * (1 - 0.35 * u) * (0.8 + 0.2 * vnoise(i * 0.3, 1, o.seed ?? 3));
      const tipK = clamp((last - i) / 4 + (p >= 1 ? 1 : 0)), ww = w * prof * (0.3 + 0.7 * tipK) / 2;
      L.push([pts[i][0] - Math.sin(ang) * ww, pts[i][1] + Math.cos(ang) * ww]); R.push([pts[i][0] + Math.sin(ang) * ww, pts[i][1] - Math.cos(ang) * ww]);
    }
    ctx.save(); ctx.globalAlpha *= o.a ?? 1; ctx.fillStyle = color;
    ctx.beginPath(); L.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
    ctx.closePath(); ctx.fill(); ctx.restore();
  };
  // A watercolour wash sprite (cached): layered wobbly fills, pooled edge, granulation. shape(g) builds a Path2D in a
  // w x h box; returns the canvas.
  MF.washSprite = (key, w, h, shape, col, o = {}) => memo('wash:' + key, () => {
    const pad = o.pad ?? 30, b = makeBuf(Math.ceil(w + pad * 2), Math.ceil(h + pad * 2)), g = b.g;
    g.translate(pad, pad);
    const p = shape(0), p2 = shape(1);
    g.save(); g.filter = `blur(${o.blur ?? 1.5}px)`; g.globalAlpha = o.a1 ?? 0.75; g.fillStyle = col; g.fill(p); g.restore();
    g.save(); g.filter = `blur(${(o.blur ?? 1.5) * 2.5}px)`; g.globalAlpha = o.a2 ?? 0.3; g.fillStyle = o.col2 || col; g.fill(p2); g.restore();
    g.save(); g.clip(p);
    g.globalCompositeOperation = 'multiply'; g.globalAlpha = o.grain ?? 0.22; g.fillStyle = g.createPattern(grainTile(), 'repeat'); g.fillRect(-pad, -pad, w + pad * 2, h + pad * 2);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = o.edgeA ?? 0.45; g.filter = `blur(${o.edgeBlur ?? 3}px)`; g.strokeStyle = o.edge || mix(col, '#000000', 0.25); g.lineWidth = o.edgeW ?? 8; g.stroke(p);
    g.restore();
    return { c: b.c, pad };
  });
  // A watercolour wash in a Path2D: two pigment layers that do not quite register, mottled lighter and darker
  // blooms inside, a crisp tide line where the pigment dried at the edge, granulation. Draws straight into g.
  MF.wcWash = (g, path, col, o = {}) => {
    const box = o.box || [0, 0, W, H], a = o.a ?? 0.22, sd = o.seed ?? 1;
    g.save();
    g.globalAlpha = a; g.filter = 'blur(1.2px)'; g.fillStyle = col; g.fill(path);
    if (o.path2) { g.globalAlpha = a * 0.45; g.filter = 'blur(3px)'; g.fillStyle = o.col2 || col; g.fill(o.path2); }
    g.filter = 'none';
    g.clip(path);
    for (let i = 0; i < (o.blooms ?? 9); i++) {               // blooms: wetter (lighter) and heavier (darker) passages
      const x = box[0] + hash(sd * 3.1 + i * 7.3) * box[2], y = box[1] + hash(sd * 5.7 + i * 2.9) * box[3], r = (0.12 + hash(i * 4.4 + sd) * 0.22) * Math.max(box[2], box[3]);
      if (i % 3 === 0) { g.globalCompositeOperation = 'destination-out'; softBlob(g, x, y, r, '#000000', 0.22); g.globalCompositeOperation = 'source-over'; }
      else softBlob(g, x, y, r, o.dark || mix(col, '#000000', 0.18), a * 0.35);
    }
    g.globalCompositeOperation = 'multiply'; g.globalAlpha = o.grain ?? 0.2; g.fillStyle = g.createPattern(grainTile(), 'repeat'); g.fillRect(box[0], box[1], box[2], box[3]);
    g.globalCompositeOperation = 'source-over';
    const edge = o.edge || mix(col, '#000000', 0.25);
    g.globalAlpha = (o.edgeA ?? 0.5) * 0.45; g.filter = 'blur(7px)'; g.lineWidth = 22; g.strokeStyle = edge; g.stroke(path);
    g.globalAlpha = o.edgeA ?? 0.5; g.filter = 'blur(1.2px)'; g.lineWidth = 3; g.stroke(path);
    g.restore();
  };
  // ───────── type ─────────
  const fontOf = (size, weight, fam, italic) => `${italic ? 'italic ' : ''}${weight} ${size}px ${FAM[fam] || fam}`;
  // Ink soaking into paper, glyph by glyph: each glyph sharpens from a blurred, slightly spread bleed; no bounce.
  // o: {size, weight, fam, italic, color, colorFn(i, ch), align, ls (px), stagger, dur, rise, blur, out: {at, dur, stagger}}
  // misty folded hills: ridge layers (far = pale) with mist bands between, drifting at different speeds (parallax)
  MF.hills = (ctx, t, o = {}) => {
    const a = o.a ?? 1, night = !!o.night, y0 = o.y0 ?? 610;
    if (a <= 0.003) return;
    const base = night ? ['#1E2A1C', '#25331F', '#2E3D25', '#36472A'] : ['#C9D2BC', '#AEBD9C', '#8FA47D', '#738C61'];
    const LAY = [[0.0, 0.18, 6], [70, 0.3, 11], [150, 0.48, 18], [240, 0.7, 28]];
    for (let i = 0; i < LAY.length; i++) {
      const [dy, alpha, speed] = LAY[i];
      const buf = memo(`hill:${i}:${night ? 'n' : 'd'}`, () => {
        const b = makeBuf(W + 800, 700), g = b.g, h = 700;
        g.beginPath(); g.moveTo(0, h);
        for (let x = 0; x <= W + 800; x += 8) {
          const yy = 260 - 150 * fbm(x * 0.0016 + i * 3.7, i * 1.3, 11 + i, 4) - 40 * Math.sin(x * 0.0021 + i);
          g.lineTo(x, yy);
        }
        g.lineTo(W + 800, h); g.closePath();
        const gr = g.createLinearGradient(0, 120, 0, h);
        gr.addColorStop(0, base[i]); gr.addColorStop(1, mix(base[i], night ? '#0E140D' : '#F3EEDF', 0.55));
        g.fillStyle = gr; g.fill();
        g.globalCompositeOperation = 'destination-out';                  // feather the ridge into mist
        const mg = g.createLinearGradient(0, h - 260, 0, h);
        mg.addColorStop(0, 'rgba(0,0,0,0)'); mg.addColorStop(1, 'rgba(0,0,0,0.9)');
        g.fillStyle = mg; g.fillRect(0, h - 260, W + 800, 260);
        return b.c;
      });
      const off = ((t * speed) % 800 + 800) % 800;
      ctx.save(); ctx.globalAlpha *= a * alpha;
      ctx.drawImage(buf, -off, y0 + dy - 260);
      ctx.restore();
      // a mist band drifting across each fold
      ctx.save(); ctx.globalAlpha *= a * 0.5;
      const my = y0 + dy + 40, mx = ((t * speed * 1.7 + i * 500) % (W + 1200)) - 600;
      ctx.fillStyle = radial(ctx, 0, 0, 0, 1, [[0, rgba(night ? '#6E7F66' : '#FBF8EF', 0.55)], [1, rgba(night ? '#6E7F66' : '#FBF8EF', 0)]]);
      ctx.translate(mx, my); ctx.scale(700, 70); circle(ctx, 0, 0, 1); ctx.fill();
      ctx.restore();
    }
  };

  // a morning mist veil: soft paper-white cloud banks (fbm-shaped blobs) on a wide buffer; slide it across the frame
  // and fade it to part the mist. k picks one of two banks so two veils can drift apart in opposite directions.
  MF.mistVeil = (ctx, x, a, k = 0) => {
    if (a <= 0.003) return;
    const buf = memo('mist:' + k, () => {
      const b = makeBuf(W * 2, H), g = b.g, col = mix(C.bg, '#FFFFFF', 0.35);
      for (let i = 0; i < 90; i++) {
        const u = hash(i * 3.7 + k * 11), v = hash(i * 5.3 + k * 7);
        const cx = u * W * 2, cy = H * (0.1 + 0.85 * v), rx = 220 + 380 * hash(i * 9.1 + k), ry = rx * (0.28 + 0.2 * hash(i * 2.9));
        const al = 0.25 + 0.5 * fbm(cx * 0.002, cy * 0.003, 5 + k, 3);
        g.save(); g.translate(cx, cy); g.scale(rx, ry);
        g.fillStyle = radial(g, 0, 0, 0, 1, [[0, rgba(col, al)], [0.55, rgba(col, al * 0.55)], [1, rgba(col, 0)]]);
        circle(g, 0, 0, 1); g.fill(); g.restore();
      }
      return b.c;
    });
    ctx.save(); ctx.globalAlpha *= a; ctx.drawImage(buf, x, 0); ctx.restore();
  };

  // a tea bush: overlapping watercolour domes with darker undersides and a faint ink contour
  function bushSprite(key, r, col, seed) {
    return memo('bush:' + key, () => {
      const b = makeBuf(Math.ceil(r * 3.2), Math.ceil(r * 2.2)), g = b.g, cx = r * 1.6, cy = r * 1.5;
      const n = 7;
      for (let k = 0; k < n; k++) {
        const u = k / (n - 1), x = cx + (u - 0.5) * r * 1.9 + (hash(seed + k) - 0.5) * r * 0.3;
        const y = cy - Math.sin(u * Math.PI) * r * 0.55 + (hash(seed * 3 + k) - 0.5) * r * 0.15, rr = r * (0.42 + 0.22 * Math.sin(u * Math.PI));
        g.fillStyle = radial(g, x - rr * 0.3, y - rr * 0.4, 0, rr * 1.2, [[0, mix(col, '#F4F1E2', 0.4)], [0.65, col], [1, mix(col, '#1D2A17', 0.25)]]);
        g.beginPath(); g.ellipse(x, y, rr, rr * 0.58, 0, 0, TAU); g.fill();
      }
      g.globalCompositeOperation = 'source-atop';                       // leaf texture flecks
      for (let k = 0; k < 90; k++) {
        g.fillStyle = rgba(hash(k * 2.3 + seed) > 0.5 ? '#2F4527' : '#C7D5A8', 0.25);
        g.beginPath(); g.ellipse(hash(k * 5.1 + seed) * b.c.width, hash(k * 7.7 + seed) * b.c.height, r * 0.06, r * 0.025, hash(k) * 3, 0, TAU); g.fill();
      }
      return b.c;
    });
  }
  // terraced tea rows following the hill's contour, far rows small and pale
  MF.terraces = (ctx, t, o = {}) => {
    const a = o.a ?? 1;
    if (a <= 0.003) return;
    // each row is one continuous clipped hedge following the contour, built once from many different bush domes
    // (four variants per row, varied size and height, a shadow line at the foot, pickers' paths now and then)
    const ROWS = [[650, 20, '#B7C4A3', 0.45, 6], [700, 30, '#A3B58E', 0.55, 10], [770, 44, '#8DA578', 0.65, 15], [865, 62, '#7A9666', 0.75, 22]];
    const SW = W + 800;
    ROWS.forEach(([y0, r, col, al, speed], i) => {
      const strip = memo(`hedge:${i}`, () => {
        const top = r * 2.2, hgt = Math.ceil(top + r * 1.6 + 160), b = makeBuf(SW, hgt), g = b.g;
        const yAt = (x) => top + 60 + Math.sin((x + i * 300) * 0.0022) * (18 + i * 6);
        const vars = [0, 1, 2, 3].map(v => bushSprite(`row${i}:${v}`, r * (0.9 + 0.12 * v), mix(col, v % 2 ? '#5E7A4E' : '#C2CFA8', 0.12 + 0.06 * v), 40 + i * 9 + v * 31));
        g.save(); g.filter = `blur(${(3 + i * 2).toFixed(0)}px)`; g.strokeStyle = rgba('#3E5232', 0.22); g.lineWidth = r * 0.5;
        g.beginPath(); for (let x = 0; x <= SW; x += 12) { const y = yAt(x) + r * 0.32; if (x) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke(); g.restore();
        let x = -r;
        while (x < SW + r) {
          const k = Math.round(x * 7.13), gap = hash(k * 0.37 + i * 5) > 0.975;
          if (gap) { x += r * 2.6; continue; }
          const spr = vars[Math.floor(hash(k * 1.91 + i) * 4)], sc = 0.78 + 0.42 * hash(k * 2.7 + i * 3), w = spr.width * sc, h = spr.height * sc;
          g.drawImage(spr, x - w / 2, yAt(x) - h * 0.68 + (hash(k * 4.3) - 0.5) * r * 0.25, w, h);
          x += r * (0.55 + 0.35 * hash(k * 5.9 + i));
        }
        return { c: b.c, top: top + 60 };
      });
      const off = ((t * speed) % 800 + 800) % 800;
      ctx.save(); ctx.globalAlpha *= a * al;
      ctx.drawImage(strip.c, -off, y0 - strip.top);
      ctx.restore();
    });
  };
  // the foreground bush the new flush grows out of (anchored to the bottom edge)
  MF.foreBush = (ctx, cx, cy, s, a = 1, t = 0) => {
    // a mound of real tea leaves (the same watercolour sprites as the shoot), back leaves darker and softer
    const L = MF.look(false);
    const pool = (pass) => Array.from({ length: 10 }, (_, j) => {
      const Ls = 104 + 34 * hash(j * 3.9 + pass * 7), ws = Ls * (0.36 + 0.07 * hash(j * 2.3 + pass));
      return leafSprite(`fore:${pass}:${j}`, Ls, ws, pass === 0
        ? { fill: mix(L.leaf, '#1D2A17', 0.22 + 0.12 * hash(j)), fill2: L.leaf, edge: L.edge, ink: L.ink, inkA: 0.3, seed: 300 + j, teeth: 11, serr: 0.06, tip: 0.3, bend: 0.07 }
        : { fill: L.leaf, fill2: L.leaf2, edge: L.edge, ink: L.ink, inkA: 0.5, seed: 400 + j, teeth: 12, serr: 0.06, tip: 0.3, bend: 0.07 });
    });
    const POOL = [pool(0), pool(1)];
    ctx.save(); ctx.globalAlpha *= a;
    for (let pass = 0; pass < 2; pass++) {
      ctx.save(); if (pass === 0) ctx.filter = 'blur(2.5px)';
      const n = pass === 0 ? 46 : 30;
      for (let k = 0; k < n; k++) {
        const u = hash(k * 7.1 + pass * 31), v = hash(k * 3.7 + pass * 17);
        const x = cx + (u - 0.5) * 900 * s, dome = Math.sqrt(Math.max(0, 1 - ((u - 0.5) * 2) ** 2));
        const y = cy - dome * (pass === 0 ? 150 : 110) * s * (0.6 + 0.4 * v) + 30 * s;
        const ang = -Math.PI / 2 + (u - 0.5) * 2.2 + (v - 0.5) * 0.8 + 0.03 * Math.sin(t * 0.8 + k);
        MF.drawLeaf(ctx, POOL[pass][k % 10], x, y, ang, s * (0.8 + 0.4 * v), (k % 2 ? 1 : -1) * s * (0.85 + 0.3 * u), 1);
      }
      ctx.restore();
    }
    ctx.restore();
  };


  MF.inkText = (ctx, s, x, y, lt, o = {}) => {
    const chars = [...s], size = o.size || 96, ls = o.ls ?? track(size), st = o.stagger ?? Math.min(0.05, 0.75 / chars.length), dur = o.dur ?? 0.95;
    ctx.save();
    ctx.font = fontOf(size, o.weight ?? TYPE.displayWeight ?? 400, o.fam || 'display', o.italic);
    ctx.letterSpacing = '0px'; ctx.textBaseline = 'alphabetic';
    const total = ctx.measureText(s).width + ls * (chars.length - 1);
    let x0 = x;
    if (o.align === 'center') x0 = x - total / 2; else if (o.align === 'right') x0 = x - total;
    let acc = '';
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i], px = x0 + ctx.measureText(acc).width + ls * i;
      acc += ch;
      if (ch === ' ') continue;
      const p = Ease.outQuint(rm(lt, i * st, i * st + dur));
      let q = 0;
      if (o.out) { const os = o.out.stagger ?? 0.012, od = o.out.dur ?? 0.45; q = Ease.inQ(rm(lt, o.out.at + i * os, o.out.at + i * os + od)); }
      const a = p * (1 - q);
      if (a <= 0.003) continue;
      const col = (o.colorFn ? o.colorFn(i, ch) : o.color) || C.ink;
      ctx.save();
      ctx.globalAlpha *= a;
      const blur = (1 - p) * (o.blur ?? 7) + q * 5;
      if (blur > 0.35) ctx.filter = `blur(${blur.toFixed(2)}px)`;
      if (p < 0.999) { ctx.shadowColor = rgba(col, 0.32 * (1 - p)); ctx.shadowBlur = size * 0.16 * (1 - p); }
      ctx.fillStyle = col;
      ctx.fillText(ch, px, y + (1 - p) * (o.rise ?? size * 0.045) - q * size * 0.03);
      ctx.restore();
    }
    ctx.restore();
    return total;
  };
  MF.measure = (ctx, s, size, weight, fam, italic, ls = 0) => {
    ctx.save(); ctx.font = fontOf(size, weight, fam, italic); ctx.letterSpacing = '0px';
    const w = ctx.measureText(s).width + ls * ([...s].length - 1); ctx.restore(); return w;
  };
  // Tracked capitals (labels, kickers): letters settle in one by one with a short blur.
  MF.label = (ctx, s, x, y, lt, o = {}) => {
    const size = o.size ?? 20;
    return MF.inkText(ctx, s.toUpperCase(), x, y, lt, { size, weight: o.weight ?? 500, fam: o.fam || 'sans', ls: o.ls ?? size * (TYPE.trackingLabel ?? 0.12),
      stagger: o.stagger ?? 0.018, dur: o.dur ?? 0.5, rise: 0, blur: 3, color: o.color, align: o.align, out: o.out });
  };
  // A subline revealed by a feathered wipe, like a wash running along the line. p: 0..1. Cached text raster per string.
  MF.softReveal = (ctx, s, x, y, p, o = {}) => {
    if (p <= 0) return;
    const size = o.size ?? 34, weight = o.weight ?? 400, fam = o.fam || 'serif', col = o.color || C.ink2, italic = !!o.italic;
    const key = `rev:${s}:${size}:${weight}:${fam}:${col}:${italic}`;
    const R = memo(key, () => {
      const w = Math.ceil(MF.measure(ctx, s, size, weight, fam, italic) + size), h = Math.ceil(size * 1.6), b = makeBuf(w, h);
      b.g.font = fontOf(size, weight, fam, italic); b.g.fillStyle = col; b.g.textBaseline = 'alphabetic'; b.g.fillText(s, size * 0.25, size * 1.15);
      return { c: b.c, w, h, base: size * 1.15, pad: size * 0.25 };
    });
    const tmp = memo('revTmp', () => makeBuf(W, 200));
    const g = tmp.g;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, 200);
    g.drawImage(R.c, 0, 0);
    const feather = o.feather ?? 160, edge = lerp(-feather, R.w + 10, Ease.outQuint(clamp(p)));
    g.globalCompositeOperation = 'destination-in';
    g.fillStyle = linear(g, edge, 0, edge + feather, 0, [[0, 'rgba(0,0,0,1)'], [1, 'rgba(0,0,0,0)']]);
    g.fillRect(0, 0, R.w, R.h);
    g.globalCompositeOperation = 'source-over';
    let x0 = x - R.pad;
    if (o.align === 'center') x0 = x - R.w / 2; else if (o.align === 'right') x0 = x - R.w + R.pad;
    ctx.save(); if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    ctx.drawImage(tmp.c, 0, 0, R.w, R.h, x0, y - R.base + (1 - Ease.outQuint(clamp(p))) * size * 0.08, R.w, R.h);
    ctx.restore();
  };

  // ───────── wet-colour transitions ─────────
  // A wobbly closed wash outline around (cx, cy) at radius r: low-frequency lobes plus cauliflower fringes.
  function washPath(cx, cy, r, seed, k, o = {}) {
    const p = new Path2D(), n = o.n ?? 220, amp = o.amp ?? 0.14, fr = o.fringe ?? 0.035;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU, ca = Math.cos(a), sa = Math.sin(a);
      const lobe = (fbm(ca * 1.3 + seed, sa * 1.3 - seed, seed, 3) - 0.5) * 2;
      const fringe = (vnoise(ca * 9 + seed * 2 + k * 3, sa * 9 - seed + k * 3, seed + 5) - 0.5) * 2;
      const rr = r * (1 + amp * lobe) + r * fr * fringe;
      const X = cx + ca * rr, Y = cy + sa * rr * (o.squash ?? 1);
      if (i) p.lineTo(X, Y); else p.moveTo(X, Y);
    }
    p.closePath();
    return p;
  }
  MF.washPath = washPath;
  // Soft half-resolution mask of one or more wash outlines (feathered edge, cauliflower lobes); reused buffers.
  function softMask(paths, blur) {
    const m = memo('mask:buf', () => makeBuf(W / 2, H / 2)), g = m.g;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.clearRect(0, 0, W / 2, H / 2);
    g.setTransform(0.5, 0, 0, 0.5, 0, 0);
    for (const [p, a, bl] of paths) { g.filter = `blur(${bl ?? blur}px)`; g.globalAlpha = a; g.fillStyle = '#000'; g.fill(p); }
    g.filter = 'none'; g.globalAlpha = 1;
    return m.c;
  }
  function frameBuf() { return memo('mask:frame', () => makeBuf(W, H)); }
  // Night floods in from every edge towards (o.x, o.y), the last light; k 0..1. At k = 1 the frame is the night paper.
  MF.flood = (ctx, k, o = {}) => {
    if (k <= 0) return;
    const night = paperBuf('night');
    if (k >= 1) { ctx.drawImage(night, 0, 0); return; }
    const cx = o.x ?? W / 2, cy = o.y ?? H / 2, far = Math.max(Math.hypot(cx, cy), Math.hypot(W - cx, cy), Math.hypot(cx, H - cy), Math.hypot(W - cx, H - cy));
    const e = Ease.ioQ(k), r = lerp(far * 1.3, 0, e), seed = o.seed ?? 3;
    const hole = washPath(cx, cy, r, seed, k, { amp: 0.17, fringe: 0.05 });
    const holes = [[hole, 1, 3], [washPath(cx, cy, r * 1.03 + 8, seed + 1, k, { amp: 0.17, fringe: 0.09 }), 0.45, 6], [washPath(cx, cy, r * 1.07 + 16, seed + 2, k, { amp: 0.18, fringe: 0.12 }), 0.25, 10]];
    const F = frameBuf(), g = F.g;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.filter = 'none';
    g.drawImage(night, 0, 0);
    g.globalCompositeOperation = 'destination-out'; g.drawImage(softMask(holes, 3), 0, 0, W, H);
    g.globalCompositeOperation = 'source-over';
    ctx.drawImage(F.c, 0, 0);
    // pigment pools along the wet front (on the night side), with a darker tide line
    const outer = new Path2D(); outer.rect(-10, -10, W + 20, H + 20); outer.addPath(hole);
    ctx.save(); ctx.clip(outer, 'evenodd');
    ctx.filter = 'blur(6px)'; ctx.lineWidth = 18; ctx.strokeStyle = rgba('#060A05', 0.5); ctx.stroke(hole);
    ctx.filter = 'blur(2px)'; ctx.lineWidth = 3; ctx.strokeStyle = rgba('#050805', 0.35); ctx.stroke(hole);
    ctx.restore();
  };
  // Oat paper blooms out of (o.x, o.y); k 0..1. At k = 1 the frame is the oat paper (o.kind: 'oat').
  MF.bloom = (ctx, k, o = {}) => {
    if (k <= 0) return;
    const paper = paperBuf(o.kind || 'oat');
    if (k >= 1) { ctx.drawImage(paper, 0, 0); return; }
    const cx = o.x ?? W / 2, cy = o.y ?? H / 2, far = Math.max(Math.hypot(cx, cy), Math.hypot(W - cx, cy), Math.hypot(cx, H - cy), Math.hypot(W - cx, H - cy));
    const e = Ease.ioSine(k), r = lerp(o.r0 ?? 8, far * 1.3, e), seed = o.seed ?? 7;
    const blob = washPath(cx, cy, r, seed, k, { amp: 0.15, fringe: 0.05 });
    const blobs = [[blob, 1, 3], [washPath(cx, cy, r * 1.04 + 10, seed + 1, k, { amp: 0.16, fringe: 0.1 }), 0.4, 7], [washPath(cx, cy, r * 1.09 + 20, seed + 2, k, { amp: 0.17, fringe: 0.13 }), 0.2, 12]];
    const F = frameBuf(), g = F.g;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.filter = 'none';
    g.drawImage(paper, 0, 0);
    g.globalCompositeOperation = 'destination-in'; g.drawImage(softMask(blobs, 3), 0, 0, W, H);
    g.globalCompositeOperation = 'source-over';
    ctx.drawImage(F.c, 0, 0);
    // the wet front: a faint gold tide line just inside the bloom, and the morning glow behind it
    ctx.save(); ctx.clip(blob);
    ctx.filter = 'blur(5px)'; ctx.lineWidth = 16; ctx.strokeStyle = rgba(mix(C.bg, C.liquor || '#D4A24A', 0.5), 0.4); ctx.stroke(blob);
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.45 * Math.sin(Math.PI * clamp(k));
    softBlob(ctx, cx, cy, r * 0.8 + 60, '#FFE6B4', 0.5); ctx.restore();
  };

  // ───────── pollen, fireflies ─────────
  MF.motes = (ctx, t, o = {}) => {
    const n = o.n ?? 26, a0 = o.a ?? 1, col = o.color || mix(C.liquor || '#D4A24A', '#FFFFFF', 0.25);
    if (a0 <= 0.003) return;
    for (let i = 0; i < n; i++) {
      const h1 = hash(i * 3.71 + 0.3), h2 = hash(i * 5.13 + 1.1), h3 = hash(i * 7.77 + 2.2), sp = 9 + h3 * 16;
      const x = ((h1 * (W + 200) + t * sp * (h2 > 0.5 ? 1 : -0.6)) % (W + 200) + W + 200) % (W + 200) - 100 + Math.sin(t * (0.4 + h2 * 0.5) + i) * 24;
      const y = ((h2 * (H + 200) - t * (6 + h1 * 10)) % (H + 200) + H + 200) % (H + 200) - 100 + Math.cos(t * (0.3 + h3 * 0.4) + i * 2) * 18;
      const r = 1.2 + h3 * 2.4, tw = 0.55 + 0.45 * Math.sin(t * (0.8 + h1 * 1.4) + i * 1.7);
      ctx.save(); ctx.globalAlpha = a0 * (0.35 + 0.4 * tw);
      softBlob(ctx, x, y, r * 4.5, col, 0.35);
      ctx.fillStyle = col; circle(ctx, x, y, r); ctx.fill();
      ctx.restore();
    }
  };
  MF.fireflies = (ctx, t, o = {}) => {
    const n = o.n ?? 16, a0 = o.a ?? 1, col = o.color || (MF.night().liquor || '#E3B65E');
    if (a0 <= 0.003) return;
    for (let i = 0; i < n; i++) {
      const h1 = hash(i * 2.31 + 9.1), h2 = hash(i * 4.47 + 3.3), h3 = hash(i * 6.61 + 7.7);
      const bx = o.box ? o.box[0] + h1 * o.box[2] : h1 * W, by = o.box ? o.box[1] + h2 * o.box[3] : 120 + h2 * (H - 240);
      const x = bx + Math.sin(t * (0.21 + h3 * 0.2) + i * 1.3) * 70 + Math.sin(t * (0.53 + h1 * 0.3) + i) * 22;
      const y = by + Math.cos(t * (0.17 + h2 * 0.2) + i * 0.7) * 46 + Math.sin(t * (0.61 + h3 * 0.2) + i * 2) * 14;
      const blink = Math.pow(0.5 + 0.5 * Math.sin(t * (0.9 + h3 * 1.1) + i * 2.3), 2.2), b = a0 * (0.15 + 0.85 * blink) * (o.boost ? 1 + o.boost : 1);
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      softBlob(ctx, x, y, 26 + 10 * blink, col, 0.4 * b);
      softBlob(ctx, x, y, 7, '#FFF3CF', 0.9 * b);
      ctx.restore();
    }
  };

  // ───────── the seal (images/seal.svg, 400 x 400 units) ─────────
  const SEAL = {
    stem: 'M196 312 C 198 268, 206 214, 204 136',
    bud: 'M204 142 C 190 120, 194 92, 213 66 C 224 94, 221 124, 204 142 Z',
    sheath: 'M203 150 C 188 142, 182 124, 186 108 C 196 118, 203 132, 203 150 Z',
    leafU: 'M208 176 C 252 186, 289 147, 301 104 C 258 103, 211 128, 208 176 Z',
    leafL: 'M196 238 C 153 254, 112 222, 95 181 C 139 174, 188 192, 196 238 Z',
    ribs: ['M212 170 Q 255 142 292 111', 'M192 232 Q 146 206 104 186', 'M206 132 Q 207 104 212 78'],
    sprig: [200, 202, 0.84, 198, 189],                    // translate(200 202) scale(0.84) translate(-198 -189)
  };
  MF.SEAL = SEAL;
  function arcText(g, s, r, size, ls, top) {
    g.font = fontOf(size, 500, 'sans');
    const chars = [...s], wsum = chars.reduce((a, ch) => a + g.measureText(ch).width, 0) + ls * (chars.length - 1), span = wsum / r;
    let a = top ? -Math.PI / 2 - span / 2 : Math.PI / 2 + span / 2;
    for (const ch of chars) {
      const cw = g.measureText(ch).width, da = (cw / 2) / r;
      a += top ? da : -da;
      g.save(); g.translate(200 + Math.cos(a) * r, 200 + Math.sin(a) * r); g.rotate(top ? a + Math.PI / 2 : a - Math.PI / 2);
      g.textAlign = 'center'; g.fillText(ch, 0, 0); g.restore();
      a += top ? da + ls / r : -(da + ls / r);
    }
  }
  // the seal as ink (transparent paper): col = Terracotta (on oat) or Oat (on night moss), never other colours
  function sealSprite(col, px) {
    return memo(`seal:${col}:${px}`, () => {
      const b = makeBuf(px, px), g = b.g, k = px / 400;
      g.scale(k, k); g.fillStyle = col; g.strokeStyle = col;
      g.lineWidth = 10; circle(g, 200, 200, 186); g.stroke();
      g.lineWidth = 3; circle(g, 200, 200, 134); g.stroke();
      arcText(g, 'MISTFOLD', 150, 34, 8, true);
      arcText(g, 'TEA GARDEN · 1962', 160, 21, 6, false);
      circle(g, 41, 200, 4.5); g.fill(); circle(g, 359, 200, 4.5); g.fill();
      g.save();
      const [tx, ty, s, ox, oy] = SEAL.sprig; g.translate(tx, ty); g.scale(s, s); g.translate(-ox, -oy);
      g.lineWidth = 7; g.lineCap = 'round'; g.stroke(new Path2D(SEAL.stem));
      for (const d of [SEAL.bud, SEAL.sheath, SEAL.leafU, SEAL.leafL]) g.fill(new Path2D(d));
      g.globalCompositeOperation = 'destination-out'; g.lineWidth = 3.2;
      for (const d of SEAL.ribs) g.stroke(new Path2D(d));
      g.restore();
      return b.c;
    });
  }
  // stamp-ink texture: the print is a little uneven, ink thinner where the paper's tooth stood up
  function sealInked(col, px) {
    return memo(`sealInk:${col}:${px}`, () => {
      const src = sealSprite(col, px), b = makeBuf(px, px), g = b.g;
      g.drawImage(src, 0, 0);
      g.globalCompositeOperation = 'destination-out';
      const im = makeBuf(px, px), d = im.g.createImageData(px, px);
      for (let i = 0; i < px * px; i++) {
        const x = i % px, y = Math.floor(i / px), v = 0.6 * fbm(x * 0.06, y * 0.06, 21, 3) + 0.4 * hash(i * 0.77 + 1.3);
        d.data[i * 4 + 3] = v > 0.62 ? Math.min(255, (v - 0.62) * 900) : 0;
      }
      im.g.putImageData(d, 0, 0);
      g.globalAlpha = 0.85; g.drawImage(im.c, 0, 0);
      return b.c;
    });
  }
  // o: {col, press (0..1 since contact: the ink spreads then settles), a, sy (perspective squash), rot}
  MF.seal = (ctx, x, y, r, o = {}) => {
    const col = o.col || C.accent3, px = Math.min(1024, Math.ceil(r * 2 * 1.5 / 64) * 64), spr = sealInked(col, px), a = o.a ?? 1;
    if (a <= 0.003) return;
    ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); ctx.scale(1, o.sy ?? 1); ctx.globalAlpha *= a;
    if (o.multiply) ctx.globalCompositeOperation = 'multiply';
    const sp = o.press === undefined ? 0 : Math.exp(-Math.max(0, o.press) * 4.5);
    if (sp > 0.01) { ctx.save(); ctx.globalAlpha *= 0.55 * sp; ctx.filter = `blur(${(3 + 6 * sp).toFixed(1)}px)`; ctx.drawImage(spr, -r * 1.02, -r * 1.02, r * 2.04, r * 2.04); ctx.restore(); }
    ctx.drawImage(spr, -r, -r, r * 2, r * 2);
    ctx.restore();
  };
  MF.sealSprite = sealSprite;

  // ───────── the tea flower ─────────
  // A camellia flower seen three-quarter: five broad cupped petals (white, washed cream at the base, a fine ink edge)
  // and a dense boss of gold stamens. k 0..1 opens it (petals spread, the boss lifts); o: {r, rot, night, a, t}.
  const petalShape = (r, i) => memo(`petal:${Math.round(r)}:${i}`, () => {
    const p = new Path2D(), n = 36, w = r * 0.56;
    for (let j = 0; j <= n; j++) {
      const u = j / n, a = TAU * u, rx = r * 0.5, ry = w * (0.9 + 0.1 * Math.cos(a));
      const notch = 1 - 0.1 * Math.exp(-Math.pow(Math.atan2(Math.sin(a), Math.cos(a)) / 0.18, 2));
      const wob = 1 + (vnoise(Math.cos(a) * 2 + i * 5, Math.sin(a) * 2, 17) - 0.5) * 0.12;
      const X = rx + Math.cos(a) * rx * notch * wob, Y = Math.sin(a) * ry * wob;
      if (j) p.lineTo(X, Y); else p.moveTo(X, Y);
    }
    p.closePath(); return p;
  });
  MF.flower = (ctx, x, y, k, o = {}) => {
    if (k <= 0.002) return;
    const r = o.r ?? 70, night = !!o.night, P = night ? MF.night() : MF.day(), e = Ease.outQuint(clamp(k)), t = o.t ?? 0;
    const white = night ? '#E9E4D2' : '#FBF8EE', cream = mix(P.liquor || '#D4A24A', '#FFFFFF', 0.62), ink = night ? '#0E140C' : P.ink;
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? 0); ctx.scale(1, o.sy ?? 0.82); ctx.globalAlpha *= o.a ?? 1;
    for (let i = 0; i < 5; i++) {
      const base = (i / 5) * TAU + 0.3, ang = base + (1 - e) * 0.5 * (i % 2 ? 1 : -1), rr = r * lerp(0.3, 1, e) * (0.94 + 0.06 * Math.sin(i * 2.1));
      const breathe = 1 + 0.015 * Math.sin(t * 1.1 + i);
      ctx.save(); ctx.rotate(ang); ctx.scale(rr / r * breathe, lerp(0.45, 1, e));
      const pp = petalShape(r, i);
      ctx.fillStyle = linear(ctx, 0, 0, r, 0, [[0, cream], [0.45, white], [1, white]]); ctx.fill(pp);
      ctx.save(); ctx.clip(pp); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha *= 0.1; ctx.fillStyle = ctx.createPattern(grainTile(), 'repeat'); ctx.fillRect(0, -r, r * 1.2, r * 2); ctx.restore();
      ctx.strokeStyle = rgba(mix(P.liquor || '#D4A24A', '#8C7A60', 0.4), 0.25); ctx.lineWidth = 1;
      for (let v = -2; v <= 2; v++) { ctx.beginPath(); ctx.moveTo(r * 0.08, 0); ctx.quadraticCurveTo(r * 0.5, v * r * 0.07, r * 0.86, v * r * 0.15); ctx.stroke(); }
      ctx.strokeStyle = rgba(ink, 0.5); ctx.lineWidth = 1.2; ctx.stroke(pp);
      ctx.restore();
    }
    // the boss: stamens on fine filaments, anthers gold
    const st = Ease.outC(clamp((k - 0.25) / 0.75)), gold = P.liquor || '#D4A24A';
    softBlob(ctx, 0, 0, r * 0.42 * st + 1, mix(gold, '#FFFFFF', 0.3), 0.5 * st);
    for (let i = 0; i < 34; i++) {
      const a = hash(i * 3.7 + 1) * TAU, L = r * (0.2 + hash(i * 5.3) * 0.22) * st, sw = Math.sin(t * 1.4 + i) * 0.03;
      const ex = Math.cos(a + sw) * L, ey = Math.sin(a + sw) * L;
      ctx.strokeStyle = rgba(mix(gold, '#FFFFFF', 0.5), 0.9 * st); ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.fillStyle = rgba(mix(gold, '#8C5A1F', hash(i * 9.1) * 0.35), st); circle(ctx, ex, ey, 2.4 + hash(i) * 1.4); ctx.fill();
    }
    ctx.restore();
  };
  // a single fallen petal, drifting (for the hold); p 0..1 of its fall from (x, y) by dy
  MF.petal = (ctx, x, y, r, rot, a, night) => {
    const P = night ? MF.night() : MF.day(), white = night ? '#E9E4D2' : '#FBF8EE', cream = mix(P.liquor || '#D4A24A', '#FFFFFF', 0.62);
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, 0.6 + 0.4 * Math.cos(rot * 1.7)); ctx.globalAlpha *= a;
    const pp = petalShape(r, 3); ctx.translate(-r * 0.5, 0);
    ctx.fillStyle = linear(ctx, 0, 0, r, 0, [[0, cream], [0.5, white]]); ctx.fill(pp);
    ctx.strokeStyle = rgba(night ? '#0E140C' : P.ink, 0.4); ctx.lineWidth = 1; ctx.stroke(pp);
    ctx.restore();
  };
})();
