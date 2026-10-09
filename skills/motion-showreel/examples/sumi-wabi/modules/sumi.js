// sumi.js: the washi-and-ink kit of 余白庵 (a project module, P/modules/*.js, loaded before every scene).
//
// Every rule here comes from source/brand/shitsurae.md: paper and ink colours from the palette (never pure white or
// black), vermilion only for the one seal, vertical Mincho, nothing bounces or shakes, things appear the way ink
// soaks into paper and leave the way mist clears, scene changes open like a picture scroll from right to left, and
// the paper and the mist always move a little. Scenes call:
//
//   SUMI.cam(env, o)                     camera: scroll pan inside dissolve windows + a slow breath and push
//   SUMI.begin(ctx, cam) / SUMI.end(ctx) apply / remove the camera (world = paper + ink, moved together)
//   SUMI.paper(ctx, env, cam)            full-frame washi: kozo fibres, cloudy formation, bark flecks
//   SUMI.light(ctx, env, o)              daylight through shoji: a slow, soft light breath (screen space)
//   SUMI.stroke(ctx, spec, s, env)       a brush stroke s seconds after the brush touched down (kasure, nijimi, drying)
//   SUMI.drop(ctx, spec, s, env)         an ink drop: falling, impact, bloom with tide line, capillaries, satellites
//   SUMI.ridge(ctx, spec, p, env)        a wet wash ridge (mountains) swept in by p (0..1)
//   SUMI.mist(ctx, env, o)               drifting mist bands (paper coloured)
//   SUMI.vtext(ctx, s, x, y, lt, o)      tategaki with an ink-bleed reveal and a mist-clearing exit
//   SUMI.seal(ctx, x, y, size, s, env)   the vermilion seal 「余白」, pressed s seconds ago
//
// Pure in (t, env): randomness comes from hash(); heavy layers are cached per key and palette, never per time.
(() => {
  const S = {};
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const vn = (x, seed = 0) => {
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return lerp(hash(i * 0.7310 + seed * 17.13), hash((i + 1) * 0.7310 + seed * 17.13), u);
  };
  const vnP = (x, per, seed = 0) => {                       // periodic value noise (period in lattice cells)
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f), i0 = ((i % per) + per) % per, i1 = (i0 + 1) % per;
    return lerp(hash(i0 * 0.7310 + seed * 17.13), hash(i1 * 0.7310 + seed * 17.13), u);
  };
  const fbm = (x, seed = 0, oct = 4) => {
    let s = 0, a = 1, n = 0, f = 1;
    for (let k = 0; k < oct; k++) { s += a * vn(x * f, seed + k * 3.7); n += a; a *= 0.5; f *= 2.03; }
    return s / n;
  };
  S.sstep = sstep; S.vn = vn; S.fbm = fbm;

  // ───────── geometry ─────────
  function spline(pts, sub = 14) {                           // Catmull-Rom through the control points
    const n = pts.length, out = [];
    for (let i = 0; i < n - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
      for (let k = 0; k < sub; k++) {
        const t = k / sub, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map(j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 +
          (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
      }
    }
    out.push(pts[n - 1].slice());
    return out;
  }
  function even(pts, step) {                                 // even spacing, both ends kept
    const d = [0];
    for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const L = d[d.length - 1], n = Math.max(2, Math.round(L / step) + 1), out = [];
    let j = 0;
    for (let i = 0; i < n; i++) {
      const s = (i / (n - 1)) * L;
      while (j < d.length - 2 && d[j + 1] < s) j++;
      const k = (s - d[j]) / ((d[j + 1] - d[j]) || 1);
      out.push([lerp(pts[j][0], pts[j + 1][0], k), lerp(pts[j][1], pts[j + 1][1], k)]);
    }
    return { p: out, L };
  }
  const sampleArr = (arr, u) => {                            // values spread evenly over u 0..1, linear between
    if (arr.length === 1) return arr[0];
    const x = clamp(u) * (arr.length - 1), i = Math.min(arr.length - 2, Math.floor(x));
    return lerp(arr[i], arr[i + 1], x - i);
  };
  S.spline = spline; S.even = even;

  // ───────── camera: the picture scroll ─────────
  // Scene changes are compositor dissolves; inside their window both scenes pan the world to the right by PAN px with
  // the same curve, so the camera seems to travel leftwards along one scroll (shitsurae: 右から左へ). Outside the
  // windows a slow breath and push keep paper and ink moving together. Everything is a function of env.lt, so an
  // in-phase is identical in every cut.
  const PAN = 260;
  function windows(env) {
    const L = (typeof REEL !== 'undefined' && REEL.plan) ? REEL.plan.scenes : [];
    const me = L[env.index] && L[env.index].id === env.id ? L[env.index] : L.find(s => s.id === env.id);
    const next = me ? L[me.i + 1] : null;
    const isPan = s => s && s.trans && (s.trans.type === 'dissolve');
    return {
      inOn: !!(me && me.i > 0 && isPan(me)), inPre: me && me.trans ? me.trans.pre : 0, inPost: me && me.trans ? me.trans.post : 0,
      outOn: !!(next && isPan(next)), outPre: next && next.trans ? next.trans.pre : 0, outPost: next && next.trans ? next.trans.post : 0,
    };
  }
  S.cam = (env, o = {}) => {
    const lt = env.lt, w = windows(env), D = o.pan ?? PAN;
    let x = 0;
    if (w.inOn) x += D * (Ease.ioSine(rm(lt, -w.inPre, w.inPost)) - 1);
    if (w.outOn) x += D * Ease.ioSine(rm(lt - env.dur, -w.outPre, w.outPost));
    const r = Ease.ioSine(rm(lt, 0, 3));                     // the breath fades in: frame 0 of a scene is the layout
    const bx = r * (6 * Math.sin(lt * 0.23) + 2.5 * Math.sin(lt * 0.61 + 1.3));
    const by = r * (3.5 * Math.sin(lt * 0.19 + 0.6) + 1.5 * Math.sin(lt * 0.47 + 2.1));
    const push = (o.push ?? 0.0022) * Math.max(0, lt);       // ~0.2 %/s: a long hold leans in, never jumps
    return { x: x + bx, y: by, z: 1 + push + r * 0.003 * Math.sin(lt * 0.17), fx: o.fx ?? W * 0.5, fy: o.fy ?? H * 0.5, pan: x };
  };
  S.begin = (ctx, cam) => {
    ctx.save();
    ctx.translate(cam.fx + cam.x, cam.fy + cam.y); ctx.scale(cam.z, cam.z); ctx.translate(-cam.fx, -cam.fy);
  };
  S.end = (ctx) => ctx.restore();

  // ───────── paper ─────────
  const TW = 1600, TH = H + 240;                            // tile (periodic horizontally), drawn under the camera
  let PAPER = null;
  function paperTile(P) {
    if (PAPER && PAPER.key === P.bg) return PAPER.c;
    const b = makeBuf(TW, TH), g = b.g;
    g.fillStyle = P.bg; g.fillRect(0, 0, TW, TH);
    const wrap = (x, r, fn) => { for (const dx of [-TW, 0, TW]) if (x + dx + r > 0 && x + dx - r < TW) fn(x + dx); };
    // formation: the uneven thickness of hand-made paper (lighter and darker clouds)
    for (let i = 0; i < 340; i++) {
      const x = hash(i * 3.17 + 1) * TW, y = hash(i * 5.31 + 2) * TH, r = 50 + Math.pow(hash(i * 7.7 + 3), 1.6) * 260;
      const light = hash(i * 1.9 + 4) > 0.45, a = 0.05 + hash(i * 2.3 + 5) * 0.09;
      wrap(x, r, xx => softBlob(g, xx, y, r, light ? P.surface : P.bg2, a));
    }
    // kozo fibres: long, thin, wavy; mostly lighter than the sheet, a few darker
    g.lineCap = 'round';
    for (let i = 0; i < 2100; i++) {
      const x = hash(i * 1.13 + 7) * TW, y = hash(i * 2.39 + 8) * TH, L = 10 + Math.pow(hash(i * 3.71 + 9), 2.6) * 220;
      const a0 = (hash(i * 4.07 + 10) - 0.5) * Math.PI * 1.15 + (hash(i * 9.1) > 0.5 ? 0 : Math.PI), bend = (hash(i * 5.3 + 11) - 0.5) * 0.9;
      const dark = hash(i * 6.67 + 12) > 0.86, lw = 0.45 + hash(i * 7.9 + 13) * (dark ? 0.7 : 1.3);
      const col = dark ? rgba(mix(P.bg, P.ink, 0.5), 0.08 + hash(i * 8.3) * 0.1) : rgba(P.surface, 0.22 + hash(i * 8.7) * 0.34);
      wrap(x, L, xx => {
        g.strokeStyle = col; g.lineWidth = lw;
        const ex = xx + Math.cos(a0) * L, ey = y + Math.sin(a0) * L;
        const mx = (xx + ex) / 2 + Math.cos(a0 + Math.PI / 2) * bend * L * 0.5, my = (y + ey) / 2 + Math.sin(a0 + Math.PI / 2) * bend * L * 0.5;
        g.beginPath(); g.moveTo(xx, y); g.quadraticCurveTo(mx, my, ex, ey); g.stroke();
      });
    }
    // bark flecks (chiri)
    for (let i = 0; i < 170; i++) {
      const x = hash(i * 9.71 + 21) * TW, y = hash(i * 8.13 + 22) * TH, r = 0.6 + Math.pow(hash(i * 3.3 + 23), 3) * 2.4;
      wrap(x, r, xx => {
        g.fillStyle = rgba(mix(P.bg, P.ink, 0.62), 0.16 + hash(i * 4.4) * 0.3);
        g.beginPath(); g.ellipse(xx, y, r * (1 + hash(i * 5.5) * 1.6), r, hash(i * 6.6) * Math.PI, 0, TAU); g.fill();
      });
    }
    PAPER = { key: P.bg, c: b.c };
    return b.c;
  }
  // The sheet under the camera, then the daylight on it (screen space), then the camera again for the ink:
  // SUMI.ground(ctx, env, cam) replaces begin + paper. Light never lies on top of ink (ink stays black).
  S.ground = (ctx, env, cam, o = {}) => {
    S.begin(ctx, cam); S.paper(ctx, env); S.end(ctx);
    S.light(ctx, env, o.light);
    S.begin(ctx, cam);
  };
  // Draw the sheet under the current transform (call between begin/end). Covers the frame for pans up to 2 x PAN.
  S.paper = (ctx, env) => {
    const P = env.palette, tile = paperTile(P);
    ctx.fillStyle = P.bg; ctx.fillRect(-PAN * 2 - 200, -200, W + PAN * 4 + 400, H + 400);
    for (let x = -TW; x < W + TW; x += TW) ctx.drawImage(tile, x - 40, -120);
  };
  // Screen-space daylight: a soft light from the upper left that breathes, a cooler shade at the lower right.
  S.light = (ctx, env, o = {}) => {
    const P = env.palette, lt = env.lt;
    const x = (o.x ?? W * 0.3) + Math.sin(lt * 0.11) * 90, y = (o.y ?? H * 0.12) + Math.cos(lt * 0.09) * 50;
    softBlob(ctx, x, y, o.r ?? 1500, P.surface, (o.a ?? 0.42) + 0.06 * Math.sin(lt * 0.37));
    softBlob(ctx, W * 0.98, H * 1.05, 900, mix(P.bg2, P.ink, 0.08), 0.22 + 0.04 * Math.sin(lt * 0.29 + 1));
  };
  // Fibre mask (tileable): short kozo fibres at random angles. Ink that wicks beyond a wet edge follows them, so
  // halos are drawn through this mask (destination-in) and look fibrous instead of blurred.
  let FIB = null;
  S.fibres = () => {
    if (FIB) return FIB;
    const N = 512, b = makeBuf(N, N), g = b.g;
    g.fillStyle = 'rgba(0,0,0,0.38)'; g.fillRect(0, 0, N, N);              // a floor: the wet paper takes some ink everywhere
    g.lineCap = 'round';
    for (let i = 0; i < 3400; i++) {
      const x = hash(i * 1.91 + 301) * N, y = hash(i * 2.73 + 302) * N, L = 3 + Math.pow(hash(i * 3.37 + 303), 2.2) * 22;
      const a = hash(i * 4.19 + 304) * Math.PI, bend = (hash(i * 5.03 + 305) - 0.5) * 0.8;
      g.strokeStyle = `rgba(0,0,0,${0.25 + hash(i * 6.11 + 306) * 0.6})`; g.lineWidth = 0.5 + hash(i * 7.07 + 307) * 0.9;
      for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) {
        const sx = x + dx, sy = y + dy, ex = sx + Math.cos(a) * L, ey = sy + Math.sin(a) * L;
        if (Math.max(sx, ex) < -2 || Math.min(sx, ex) > N + 2 || Math.max(sy, ey) < -2 || Math.min(sy, ey) > N + 2) continue;
        g.beginPath(); g.moveTo(sx, sy);
        g.quadraticCurveTo((sx + ex) / 2 - Math.sin(a) * bend * L * 0.4, (sy + ey) / 2 + Math.cos(a) * bend * L * 0.4, ex, ey); g.stroke();
      }
    }
    const soft = makeBuf(N, N);                                             // a touch of blur: fibres, not hatching
    soft.g.filter = 'blur(0.7px)';
    for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) soft.g.drawImage(b.c, dx, dy);
    FIB = soft.c;
    return FIB;
  };
  const FIBT = {};
  S.fibresTinted = (col) => {                                // the fibre mask filled with a colour (cached per colour)
    if (FIBT[col]) return FIBT[col];
    const src = S.fibres(), b = makeBuf(src.width, src.height);
    b.g.drawImage(src, 0, 0); b.g.globalCompositeOperation = 'source-in'; b.g.fillStyle = col; b.g.fillRect(0, 0, src.width, src.height);
    return (FIBT[col] = b.c);
  };
  // Scratch buffers shared by the halo passes (sized up on demand).
  const SCR = {};
  const scratch = (name, w, h) => {
    let b = SCR[name];
    if (!b || b.c.width < w || b.c.height < h) b = SCR[name] = makeBuf(Math.max(w, b ? b.c.width : 0), Math.max(h, b ? b.c.height : 0));
    b.g.setTransform(1, 0, 0, 1, 0, 0); b.g.globalCompositeOperation = 'source-over'; b.g.globalAlpha = 1; b.g.filter = 'none';
    b.g.clearRect(0, 0, w, h);
    return b;
  };
  // Draw shape(g) (in world coordinates, bbox x, y, w, h) blurred and broken up by the fibre mask, at alpha a.
  S.fibrousHalo = (ctx, x, y, w, h, shape, a, o = {}) => {
    const b = scratch('halo', Math.ceil(w), Math.ceil(h)), g = b.g;
    g.translate(-x, -y); g.filter = `blur(${o.blur ?? 5}px)`; shape(g); g.filter = 'none';
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'destination-in';
    const pat = g.createPattern(S.fibres(), 'repeat'), ox = ((o.seed ?? 0) * 97) % 512;
    g.translate(-ox, -ox * 0.6); g.fillStyle = pat; g.fillRect(ox, ox * 0.6, w, h); g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    withAlpha(ctx, a, () => ctx.drawImage(b.c, 0, 0, Math.ceil(w), Math.ceil(h), x, y, Math.ceil(w), Math.ceil(h)));
  };

  // ───────── brush strokes ─────────
  // spec: {key, pts [[x, y]...], w (px at pressure 1), press [..] (pressure along the stroke), dur (s), ease (Ease
  //        name: the brush speed), tone / toneEnd (body opacity at start / end), toneMode ('chord' | 'conic' with cx,
  //        cy, a0), dry (0..1 kasure) + dryFrom (u where the ink runs out), streak (px), end ('taper' | 'stop'),
  //        tail (u of the lift), headW (width at the touch-down), head (pooling 0..1), side (1 | -1: darker edge),
  //        bleed (0..1 capillaries), bleedBlur (px), seed, ink (colour)}
  const STK = {};
  function buildStroke(spec, P) {
    const ink = spec.ink || P.ink, key = spec.key + '|' + ink;
    if (STK[key]) return STK[key];
    const { p: c, L } = even(spline(spec.pts, 16), 2);
    const n = c.length, seed = spec.seed ?? 1, W0 = spec.w, press = spec.press || [1];
    const nx = new Float32Array(n), ny = new Float32Array(n), w = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = c[Math.max(0, i - 2)], b = c[Math.min(n - 1, i + 2)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      nx[i] = -dy / l; ny[i] = dx / l;
      const u = i / (n - 1);
      let ww = W0 * sampleArr(press, u) * (1 + 0.12 * (vn((i * 2) / 46, seed) - 0.5));
      ww *= lerp(spec.headW ?? 0.8, 1, sstep(0, spec.attack ?? 0.05, u));
      if (spec.end === 'stop') ww *= lerp(1, 0.9, sstep(0.93, 1, u));
      else ww *= Math.pow(1 - sstep(1 - (spec.tail ?? 0.2), 1.002, u), 0.75);
      w[i] = Math.max(0.5, ww);
    }
    const Lp = [], Rp = [];
    const edgeN = (i, sd) => (vn((i * 2) / 31, sd) - 0.5) * 2 * (0.035 * W0 + 0.6) + (vn((i * 2) / 11, sd + 1) - 0.5) * 2 * (0.018 * W0 + 0.4) +
      (vn((i * 2) / 3.1, sd + 2) - 0.5) * 0.8 + Math.pow(vn((i * 2) / 6.3, sd + 3), 6) * 0.06 * W0;   // rare fibre bumps
    for (let i = 0; i < n; i++) {
      const h = w[i] / 2, k = Math.min(1, w[i] / (W0 * 0.6));
      const eL = edgeN(i, seed + 5) * k, eR = edgeN(i, seed + 8) * k;
      Lp.push([c[i][0] + nx[i] * (h + eL), c[i][1] + ny[i] * (h + eL)]);
      Rp.push([c[i][0] - nx[i] * (h + eR), c[i][1] - ny[i] * (h + eR)]);
    }
    // touch-down cap (and a round stop): half a disc behind the first sample, ahead of the last
    const cap = (i, dir) => {
      const r0 = w[i] / 2, a0 = Math.atan2(dir > 0 ? ny[i] : -ny[i], dir > 0 ? nx[i] : -nx[i]), out = [];
      for (let k = 1; k < 10; k++) {
        const a = a0 - (k / 10) * Math.PI, rr2 = r0 * (0.92 + 0.12 * vn(k * 0.9, seed + 13 + dir));   // +n -> +t -> -n (end), -n -> -t -> +n (start)
        out.push([c[i][0] + Math.cos(a) * rr2, c[i][1] + Math.sin(a) * rr2]);
      }
      return { out };
    };
    const capStart = cap(0, -1), capEnd = spec.end === 'stop' ? cap(n - 1, 1) : null;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const q of Lp.concat(Rp)) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
    const pad = 46;
    x0 = Math.floor(x0 - pad); y0 = Math.floor(y0 - pad);
    const bw = Math.ceil(x1 + pad - x0), bh = Math.ceil(y1 + pad - y0);
    const body = (g) => {
      g.beginPath();
      Lp.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])));
      if (capEnd) capEnd.out.forEach(q => g.lineTo(q[0], q[1]));
      for (let i = n - 1; i >= 0; i--) g.lineTo(Rp[i][0], Rp[i][1]);
      capStart.out.forEach(q => g.lineTo(q[0], q[1]));
      g.closePath();
    };
    const tone = spec.tone ?? 0.93, toneEnd = spec.toneEnd ?? tone * 0.8;
    const toneFill = (g, k = 1) => {
      if (spec.toneMode === 'conic') {
        const cg = g.createConicGradient(spec.a0 ?? 0, spec.cx, spec.cy);
        cg.addColorStop(0, rgba(ink, tone * k)); cg.addColorStop(0.92, rgba(ink, toneEnd * k)); cg.addColorStop(1, rgba(ink, tone * k));
        return cg;
      }
      return linear(g, c[0][0], c[0][1], c[n - 1][0], c[n - 1][1], [[0, rgba(ink, tone * k)], [1, rgba(ink, toneEnd * k)]]);
    };
    // core: body, darker brush-tip side, start pooling, kasure and bristle streaks, pigment edge
    const core = makeBuf(bw, bh), g = core.g;
    g.translate(-x0, -y0);
    body(g); g.fillStyle = toneFill(g); g.fill();
    const side = spec.side ?? 1;
    g.save(); body(g); g.clip();
    g.beginPath();
    for (let i = 0; i < n; i++) { const q = side > 0 ? Lp[i] : Rp[i]; i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }
    for (let i = n - 1; i >= 0; i--) g.lineTo(c[i][0] + nx[i] * side * w[i] * 0.05, c[i][1] + ny[i] * side * w[i] * 0.05);
    g.closePath(); g.fillStyle = rgba(ink, 0.16 * tone); g.fill();
    if ((spec.head ?? 0.6) > 0) softBlob(g, c[0][0], c[0][1], w[0] * 0.75, ink, 0.32 * (spec.head ?? 0.6));
    g.restore();
    g.globalCompositeOperation = 'destination-out'; g.lineCap = 'round'; g.lineJoin = 'round';
    const B = spec.bristles ?? Math.round(clamp(W0 / 2.0, 10, 44)), dry = spec.dry ?? 0;
    const runs = (b, ob, test, lw, alpha) => {
      let run = null;
      const flush = () => {
        if (run && run.length > 2) { g.strokeStyle = `rgba(0,0,0,${alpha})`; g.lineWidth = lw; g.beginPath(); run.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.stroke(); }
        run = null;
      };
      for (let i = 0; i < n; i++) {
        const px = c[i][0] + nx[i] * ob * w[i] * 0.5, py = c[i][1] + ny[i] * ob * w[i] * 0.5;
        if (test(i / (n - 1), i)) (run || (run = [])).push([px, py]); else flush();
      }
      flush();
    };
    for (let b = 0; b < B; b++) {
      const ob = -0.97 + (1.94 * (b + 0.5)) / B + (hash(b * 3.1 + seed) - 0.5) * (1.4 / B), edge = Math.abs(ob);
      const lw = (W0 / B) * (0.7 + hash(b * 5.3 + seed) * 0.9);
      if (dry > 0) {
        const cap = dry * (0.45 + 0.75 * edge * edge + 0.4 * hash(b * 7.7 + seed));
        runs(b, ob, (u, i) => {
          const d = cap * sstep(spec.dryFrom ?? 0.45, 1.04, u) + (vn((i * 2) / (spec.streak ?? 30) + b * 13.37, seed + 21) - 0.5) * 0.85 * dry +
            0.12 * (vn((i * 2) / 8 + b * 3.3, seed + 33) - 0.5);
          return d > 0.4;
        }, lw, 0.9);
      }
      runs(b, ob, (u, i) => vn((i * 2) / 18 + b * 7.31, seed + 41) > (spec.hair ?? 0.72) - 0.1 * edge, lw * 0.55, 0.16);   // hairline bristle marks
    }
    g.globalCompositeOperation = 'source-atop';
    g.strokeStyle = rgba(ink, 0.3 * tone * (spec.edge ?? 1)); g.lineWidth = 2.2; g.filter = 'blur(0.7px)';
    for (const side2 of [Lp, Rp]) { g.beginPath(); side2.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.stroke(); }
    g.filter = 'none'; g.globalCompositeOperation = 'source-over';
    // nijimi: the body's wet edge wicking into the paper, broken up by the fibre mask (and a few long fibres)
    const bleed = makeBuf(bw, bh), h = bleed.g;
    const fibrous = (blur, k, off) => {
      const tmp = makeBuf(bw, bh), q = tmp.g;
      q.translate(-x0, -y0); q.filter = `blur(${blur}px)`; body(q); q.fillStyle = toneFill(q, k); q.fill(); q.filter = 'none';
      q.setTransform(1, 0, 0, 1, 0, 0); q.globalCompositeOperation = 'destination-in';
      q.translate(-off, -off * 0.7); q.fillStyle = q.createPattern(S.fibres(), 'repeat'); q.fillRect(off, off * 0.7, bw, bh);
      h.drawImage(tmp.c, 0, 0);
    };
    fibrous(spec.bleedBlur ?? 3.2, 0.62 * (spec.bleed ?? 0.6) + 0.15, (seed * 53) % 512);
    fibrous((spec.bleedBlur ?? 3.2) * 2.4, 0.3 * (spec.bleed ?? 0.6), (seed * 71 + 200) % 512);
    h.translate(-x0, -y0); h.lineCap = 'round';
    const nCap = Math.round((L / 26) * (spec.bleed ?? 0.6));
    for (let k = 0; k < nCap; k++) {
      const i = Math.floor(hash(k * 1.37 + seed * 3.1) * n), u = i / (n - 1), sd = hash(k * 2.71 + seed) > 0.5 ? 1 : -1;
      if (hash(k * 4.4 + seed) > 1 - 0.85 * dry * sstep(0.35, 1, u)) continue;            // dry parts wick less
      const e = sd > 0 ? Lp[i] : Rp[i], a0 = Math.atan2(ny[i] * sd, nx[i] * sd) + (hash(k * 5.9 + seed) - 0.5) * 2.2;
      const len = 3 + Math.pow(hash(k * 6.1 + seed), 2) * (10 + w[i] * 0.3), bend = (hash(k * 7.3) - 0.5) * 1.2;
      h.strokeStyle = rgba(ink, 0.1 + 0.16 * hash(k * 8.2 + seed)); h.lineWidth = 0.45 + hash(k * 9.3 + seed) * 0.5;
      h.beginPath(); h.moveTo(e[0] - Math.cos(a0) * 2, e[1] - Math.sin(a0) * 2);
      h.quadraticCurveTo(e[0] + Math.cos(a0 + bend) * len * 0.55, e[1] + Math.sin(a0 + bend) * len * 0.55, e[0] + Math.cos(a0) * len, e[1] + Math.sin(a0) * len);
      h.stroke();
    }
    const halo = makeBuf(bw, bh), hg = halo.g;                                           // the slow creep
    hg.translate(-x0, -y0); hg.filter = 'blur(10px)'; body(hg); hg.fillStyle = toneFill(hg, 0.3); hg.fill(); hg.filter = 'none';
    // timing: brush progress u(s) = ease(s / dur); chunks remember when the brush passed them
    const ease = Ease[spec.ease || 'ioSine'] || Ease.ioSine, dur = spec.dur ?? 0.8;
    const nC = Math.max(4, Math.ceil(L / 9)), tC = new Float32Array(nC + 1);
    for (let j = 0; j <= nC; j++) {                                                     // invert the ease by bisection
      const target = j / nC; let a = 0, b2 = 1;
      for (let it = 0; it < 22; it++) { const m = (a + b2) / 2; if (ease(m) < target) a = m; else b2 = m; }
      tC[j] = ((a + b2) / 2) * dur;
    }
    const st = { c, n, L, w, x0, y0, bw, bh, core: core.c, bleed: bleed.c, halo: halo.c, mask: makeBuf(bw, bh), lay: makeBuf(bw, bh),
      nC, tC, dur, ease, tail: spec.end !== 'stop' };
    STK[key] = st;
    return st;
  }
  // Masked copy of src into the scratch layer: chunk j gets alpha fn(j) (0 = hidden); widths follow the stroke.
  function masked(st, src, alphaOf, widen, upto) {
    const m = st.mask.g, L = st.lay.g;
    m.setTransform(1, 0, 0, 1, 0, 0); m.globalCompositeOperation = 'source-over'; m.clearRect(0, 0, st.bw, st.bh);
    m.translate(-st.x0, -st.y0); m.lineCap = 'round'; m.lineJoin = 'round'; m.strokeStyle = '#000';
    const per = (st.n - 1) / st.nC;
    let any = false;
    for (let j = 0; j < st.nC; j++) {
      const a = alphaOf(j);
      if (a <= 0.003) continue;
      const i0 = Math.round(j * per), i1 = Math.min(Math.round((j + 1) * per), upto);
      if (i1 < i0) break;
      let wmax = 0;
      for (let i = i0; i <= i1; i++) wmax = Math.max(wmax, st.w[i]);
      m.globalAlpha = Math.min(1, a); m.lineWidth = wmax * 1.06 + widen;
      m.beginPath(); m.moveTo(st.c[i0][0], st.c[i0][1]);
      for (let i = i0 + 1; i <= i1; i++) m.lineTo(st.c[i][0], st.c[i][1]);
      if (i1 === i0) m.lineTo(st.c[i0][0] + 0.01, st.c[i0][1]);
      m.stroke(); any = true;
    }
    m.globalAlpha = 1;
    if (!any) return null;
    L.setTransform(1, 0, 0, 1, 0, 0); L.globalCompositeOperation = 'source-over'; L.clearRect(0, 0, st.bw, st.bh);
    L.drawImage(src, 0, 0); L.globalCompositeOperation = 'destination-in'; L.drawImage(st.mask.c, 0, 0);
    L.globalCompositeOperation = 'source-over';
    return st.lay.c;
  }
  // s: seconds since the brush touched down. o.alpha fades the whole stroke (exits).
  S.stroke = (ctx, spec, s, env, o = {}) => {
    if (s <= 0) return;
    const P = env.palette, st = buildStroke(spec, P), u = st.ease(clamp(s / st.dur));
    const upto = Math.min(st.n - 1, Math.round(u * (st.n - 1))), headJ = Math.floor(u * st.nC - 1e-9);
    const age = j => s - st.tC[Math.min(j + 1, st.nC)];                                    // seconds since chunk j was painted
    const alpha = o.alpha ?? 1;
    if (alpha <= 0.003) return;
    ctx.save(); ctx.globalAlpha *= alpha;
    const settled = s > st.dur + 2.2;
    const creep = sstep(0, 6, s - st.dur * 0.5) * (spec.creep ?? 1);
    if (creep > 0.003) { ctx.globalAlpha *= 1; withAlpha(ctx, creep, () => (settled ? ctx.drawImage(st.halo, st.x0, st.y0) : (() => { const im = masked(st, st.halo, j => (j <= headJ ? 1 : 0), 34, upto); if (im) ctx.drawImage(im, st.x0, st.y0); })())); }
    if (settled) { ctx.drawImage(st.bleed, st.x0, st.y0); ctx.drawImage(st.core, st.x0, st.y0); ctx.restore(); return; }
    let im = masked(st, st.bleed, j => (j <= headJ ? sstep(-0.05, 0.55, age(j)) : 0), 30, upto);
    if (im) ctx.drawImage(im, st.x0, st.y0);
    im = masked(st, st.core, j => (j <= headJ ? 1 : j === headJ + 1 ? 1 : 0), 3, upto);
    if (im) ctx.drawImage(im, st.x0, st.y0);
    im = masked(st, st.core, j => (j <= headJ + 1 ? 0.32 * Math.exp(-Math.max(0, age(j)) / 0.5) : 0), 2, upto);   // wet sheen, drying
    if (im) ctx.drawImage(im, st.x0, st.y0);
    ctx.restore();
  };
  S.strokeInfo = (spec, env) => buildStroke(spec, env.palette);

  // ───────── ink drop ─────────
  // spec: {key, x, y, R, seed, tone, sat (satellites), fall (s of approach), creep (px/s)}; s: seconds since impact.
  const DROP = {};
  function dropShape(spec) {
    if (DROP[spec.key]) return DROP[spec.key];
    const seed = spec.seed ?? 3, H2 = [];
    for (let k = 2; k <= 15; k++) H2.push([k, (0.075 / Math.pow(k, 0.8)) * (0.45 + hash(k * 3.3 + seed)), hash(k * 7.1 + seed) * TAU]);
    const fib = [];
    for (let i = 0; i < 190; i++) fib.push({ th: hash(i * 1.71 + seed) * TAU, len: 3 + Math.pow(hash(i * 2.9 + seed), 2.6) * 40,
      w: 0.45 + hash(i * 3.7 + seed) * 0.9, a: 0.16 + hash(i * 4.1 + seed) * 0.3, bend: (hash(i * 5.3 + seed) - 0.5) * 0.8, delay: hash(i * 6.7 + seed) * 0.5 });
    const sat = [];
    for (let j = 0; j < (spec.sat ?? 9); j++) {
      const th = hash(j * 9.1 + seed) * TAU, d = 1.15 + Math.pow(hash(j * 3.3 + seed), 1.4) * 1.3;
      sat.push({ th, d, r: 1.8 + Math.pow(hash(j * 5.7 + seed), 2) * 7.5, t: 0.025 + d * 0.035 });
    }
    const blobs = [];
    for (let j = 0; j < 7; j++) blobs.push({ x: (hash(j * 2.2 + seed) - 0.5) * 1.1, y: (hash(j * 3.4 + seed) - 0.5) * 1.1, r: 0.25 + hash(j * 4.6 + seed) * 0.45, dark: hash(j * 5.8 + seed) > 0.5, a: 0.05 + hash(j * 6.9 + seed) * 0.08 });
    return (DROP[spec.key] = { H2, fib, sat, blobs });
  }
  function blotPath(ctx, x, y, r, sh, amp, n = 300, fine = 1) {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const th = (i / n) * TAU;
      let rho = 1;
      for (const [k, A, ph] of sh.H2) rho += amp * A * Math.cos(k * th + ph);
      rho += fine * (0.02 * (vnP((i / n) * 48, 48, 77) - 0.5) + 0.011 * (vnP((i / n) * 150, 150, 78) - 0.5) + 0.006 * (vnP((i / n) * 300, 300, 79) - 0.5));
      const rr2 = r * rho;
      i ? ctx.lineTo(x + Math.cos(th) * rr2, y + Math.sin(th) * rr2) : ctx.moveTo(x + Math.cos(th) * rr2, y + Math.sin(th) * rr2);
    }
    ctx.closePath();
  }
  S.dropRadius = (spec, s) => spec.R * (0.1 + 0.9 * Math.pow(1 - Math.exp(-Math.max(0, s) / (spec.tau ?? 0.42)), 0.85)) + (spec.creep ?? 1.4) * Math.max(0, s);
  S.drop = (ctx, spec, s, env, o = {}) => {
    const P = env.palette, ink = spec.ink || P.ink, sh = dropShape(spec), fall = spec.fall ?? 0.8, x = spec.x, y = spec.y;
    const alpha = o.alpha ?? 1;
    if (s < -fall || alpha <= 0.003) return;
    ctx.save(); ctx.globalAlpha *= alpha;
    if (s < 0) {                                           // approach: an out-of-focus drop above the sheet and its shadow
      const k = 1 + s / fall, e = k * k;
      const sx = x + lerp(150, 0, Ease.inQ(k)), sy = y + lerp(96, 0, Ease.inQ(k));
      ctx.filter = `blur(${lerp(16, 2.5, e).toFixed(1)}px)`;
      ctx.fillStyle = rgba(ink, lerp(0.05, 0.2, e)); ctx.beginPath(); ctx.ellipse(sx, sy, lerp(30, 11, e), lerp(22, 10, e), 0.6, 0, TAU); ctx.fill();
      ctx.filter = `blur(${lerp(22, 0.6, e).toFixed(1)}px)`;
      ctx.fillStyle = rgba(ink, lerp(0.1, 0.92, e)); circle(ctx, x, y, lerp(44, 9, e)); ctx.fill();
      ctx.filter = 'none'; ctx.restore(); return;
    }
    const r = S.dropRadius(spec, s), g1 = 1 - Math.exp(-s / 0.5), amp = 0.35 + 0.65 * g1, tone = spec.tone ?? 0.95;
    const dryK = sstep(0.25, 3.5, s), wick = sstep(0.02, 1.6, s);
    const box = r * 1.5 + 40, bx = x - box, by = y - box, bw = box * 2;
    // water front: the paper darkens a little beyond the pigment
    ctx.filter = 'blur(10px)'; blotPath(ctx, x, y, r * 1.16 + 8, sh, amp * 1.1, 160, 0); ctx.fillStyle = rgba(ink, 0.05); ctx.fill(); ctx.filter = 'none';
    // nijimi: diluted ink wicking along the fibres past the edge (two passes, broken up by the fibre mask)
    const fill = (rr, a2) => (g) => { blotPath(g, x, y, rr, sh, a2, 220, 0); g.fillStyle = ink; g.fill(); };
    S.fibrousHalo(ctx, bx, by, bw, bw, fill(r * (1.03 + 0.05 * wick) + 3 + 6 * wick, amp * 1.05), 0.5 * (0.4 + 0.6 * wick), { blur: 4.5, seed: (spec.seed ?? 3) + 1 });
    S.fibrousHalo(ctx, bx, by, bw, bw, fill(r * (1.06 + 0.08 * wick) + 6 + 10 * wick, amp * 1.15), 0.22 * wick, { blur: 9, seed: (spec.seed ?? 3) + 2 });
    // stray long fibres that carried ink further
    ctx.lineCap = 'round';
    const hairK = clamp((spec.R - 14) / 60);                         // tiny drops (moss dots) carry no long fibres
    if (hairK > 0) sh.fib.forEach((f, i) => {
      if (i % 6) return;
      const gk = sstep(f.delay * 0.4, 1.8 + f.delay, s);
      if (gk <= 0) return;
      let rho = 1; for (const [k, A, ph] of sh.H2) rho += amp * A * Math.cos(k * f.th + ph);
      const r0 = r * rho - 3, len = (6 + f.len * 1.1) * gk * (r / spec.R) * hairK, a1 = f.th + f.bend * 0.9;
      ctx.strokeStyle = rgba(ink, f.a * 0.8 * hairK); ctx.lineWidth = f.w;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(f.th) * r0, y + Math.sin(f.th) * r0);
      ctx.quadraticCurveTo(x + Math.cos(f.th) * (r0 + len * 0.6), y + Math.sin(f.th) * (r0 + len * 0.6), x + Math.cos(f.th) * r0 + Math.cos(a1) * len, y + Math.sin(f.th) * r0 + Math.sin(a1) * len);
      ctx.stroke();
    });
    // the pigment: nearly black, a little lighter toward the edge, the tide line darker again
    ctx.filter = 'blur(0.8px)';
    blotPath(ctx, x, y, r, sh, amp);
    ctx.fillStyle = radial(ctx, x, y, 0, r * 1.02, [[0, rgba(ink, tone)], [0.72, rgba(ink, tone * 0.98)], [0.9, rgba(ink, tone * 0.92 - 0.03 * dryK)], [0.975, rgba(ink, tone * 0.9 - 0.04 * dryK)], [1, rgba(ink, tone * 0.97)]]);
    ctx.fill();
    ctx.filter = 'none';
    ctx.save(); blotPath(ctx, x, y, r, sh, amp); ctx.clip();          // paper fibres faintly through the ink
    withAlpha(ctx, 0.035 + 0.03 * dryK, () => {
      ctx.fillStyle = ctx.createPattern(S.fibresTinted(P.bg), 'repeat');
      ctx.save(); ctx.translate(x * 0.37, y * 0.21); ctx.fillRect(x - r * 1.2 - x * 0.37, y - r * 1.2 - y * 0.21, r * 2.4, r * 2.4); ctx.restore();
    });
    for (const b of sh.blobs) softBlob(ctx, x + b.x * r, y + b.y * r, b.r * r, b.dark ? ink : mix(P.bg, ink, 0.5), b.a * 0.6 * (0.4 + 0.6 * dryK));
    ctx.restore();
    ctx.filter = 'blur(1.6px)'; blotPath(ctx, x, y, r * 0.995, sh, amp);
    ctx.strokeStyle = rgba(ink, 0.16 + 0.24 * dryK); ctx.lineWidth = 2 + 1.2 * dryK; ctx.stroke(); ctx.filter = 'none';
    // satellites thrown on impact
    for (const q of sh.sat) {
      const ds = s - q.t;
      if (ds < 0) continue;
      const rr2 = q.r * (0.55 + 0.75 * (1 - Math.exp(-ds / 0.3))), d = q.d * spec.R;
      const qx = x + Math.cos(q.th) * d, qy = y + Math.sin(q.th) * d;
      ctx.filter = 'blur(2.5px)'; ctx.fillStyle = rgba(ink, 0.12 * sstep(0, 1.2, ds)); circle(ctx, qx, qy, rr2 * 1.9 + 2.5); ctx.fill();
      ctx.filter = 'blur(0.5px)'; ctx.fillStyle = rgba(ink, tone * 0.9);
      ctx.beginPath(); ctx.ellipse(qx, qy, rr2 * 1.15, rr2 * 0.9, q.th, 0, TAU); ctx.fill(); ctx.filter = 'none';
    }
    // the splash crown seen from above, only on the hit
    if (s < 0.22) {
      const k = s / 0.22;
      ctx.strokeStyle = rgba(ink, 0.3 * (1 - k)); ctx.lineWidth = 3 * (1 - k) + 0.5;
      ctx.beginPath(); ctx.arc(x, y, lerp(r * 0.4, spec.R * 0.95, Ease.outC(k)), 0, TAU); ctx.stroke();
    }
    ctx.restore();
  };

  // ───────── wash ridges (mountains) ─────────
  // spec: {key, x0, x1, base, amp, scale, seed, tone, fade, bumps [[x, h, w]], texture (0..1 dry marks on the ridge)}
  const RID = {};
  function buildRidge(spec, P) {
    const ink = spec.ink || P.ink, key = spec.key + '|' + ink;
    if (RID[key]) return RID[key];
    const x0 = spec.x0, x1 = spec.x1, seed = spec.seed ?? 5, fade = spec.fade ?? 220, pts = [];
    let top = 1e9;
    for (let x = x0; x <= x1; x += 4) {
      let hgt = spec.amp * fbm(x / (spec.scale ?? 260), seed, 5);
      for (const [bx, bh, bw] of spec.bumps || []) hgt += bh * Math.exp(-((x - bx) * (x - bx)) / (2 * bw * bw));
      const edge = sstep(x0, x0 + 140, x) * (1 - sstep(x1 - 140, x1, x));                // the wash thins out at both ends
      const y = spec.base - hgt * (0.25 + 0.75 * edge);
      pts.push([x, y]); top = Math.min(top, y);
    }
    const pad = 30, bx = Math.floor(x0 - pad), by = Math.floor(top - pad), bw = Math.ceil(x1 - x0 + 2 * pad), bh = Math.ceil(spec.base + fade - top + 2 * pad);
    const b = makeBuf(bw, bh), g = b.g;
    g.translate(-bx, -by);
    const tone = spec.tone ?? 0.3;
    const shape = () => { g.beginPath(); g.moveTo(x0, spec.base + fade); pts.forEach(q => g.lineTo(q[0], q[1])); g.lineTo(x1, spec.base + fade); g.closePath(); };
    g.filter = 'blur(1.6px)'; shape();
    g.fillStyle = linear(g, 0, top, 0, spec.base + fade, [[0, rgba(ink, tone)], [0.35, rgba(ink, tone * 0.8)], [0.75, rgba(ink, tone * 0.25)], [1, rgba(ink, 0)]]);
    g.fill(); g.filter = 'none';
    g.save(); shape(); g.clip();
    g.filter = 'blur(2.5px)'; g.strokeStyle = rgba(ink, tone * 0.55); g.lineWidth = 7;           // wet edge along the ridge
    g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(q[0], q[1] + 3) : g.moveTo(q[0], q[1] + 3))); g.stroke(); g.filter = 'none';
    g.globalCompositeOperation = 'destination-out';                                              // uneven wash
    for (let i = 0; i < 46; i++) {
      const xx = lerp(x0, x1, hash(i * 2.7 + seed)), yy = spec.base - spec.amp * 0.4 + hash(i * 3.9 + seed) * (fade + spec.amp * 0.4);
      softBlob(g, xx, yy, 30 + hash(i * 5.1 + seed) * 110, '#000', 0.12 + hash(i * 6.3 + seed) * 0.22);
    }
    g.globalCompositeOperation = 'source-atop';
    if (spec.texture) {                                                                          // dry texture strokes (shun)
      g.lineCap = 'round';
      for (let i = 0; i < 70 * spec.texture; i++) {
        const k = Math.floor(hash(i * 1.9 + seed) * pts.length), q = pts[k], len = 14 + hash(i * 2.8 + seed) * 46;
        const a = Math.PI * 0.5 + (hash(i * 3.6 + seed) - 0.5) * 0.9;
        g.strokeStyle = rgba(ink, 0.18 + hash(i * 4.4 + seed) * 0.3); g.lineWidth = 1 + hash(i * 5.2 + seed) * 2.5;
        g.beginPath(); g.moveTo(q[0], q[1] + 2); g.lineTo(q[0] + Math.cos(a) * len * 0.4, q[1] + Math.sin(a) * len); g.stroke();
      }
    }
    g.restore();
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'destination-in';          // the wash thins out at both ends
    const fl = spec.fadeL ?? 220, fr = spec.fadeR ?? 220;
    g.fillStyle = linear(g, 0, 0, bw, 0, [[0, 'rgba(0,0,0,0)'], [clamp(fl / bw), '#000'], [clamp(1 - fr / bw), '#000'], [1, 'rgba(0,0,0,0)']]);
    g.fillRect(0, 0, bw, bh); g.globalCompositeOperation = 'source-over';
    return (RID[key] = { c: b.c, x: bx, y: by, w: bw, h: bh, pts });
  }
  S.ridgeY = (spec, env, x) => {
    const r = buildRidge(spec, env.palette), i = clamp(Math.round((x - spec.x0) / 4), 0, r.pts.length - 1);
    return r.pts[i][1];
  };
  // Reveal a cached layer (canvas drawn at x, y) with a feathered wet edge sweeping across it.
  // p: 0..1; o.dir 1 = left to right, -1 = right to left, 2 = top to bottom; o.feather px; o.alpha.
  let SW = null;
  S.sweep = (ctx, layer, x, y, p, o = {}) => {
    if (p <= 0) return;
    const w = layer.width, h = layer.height, feather = o.feather ?? 320, dir = o.dir ?? -1;
    if (p >= 1) { withAlpha(ctx, o.alpha ?? 1, () => ctx.drawImage(layer, x, y)); return; }
    if (!SW || SW.c.width < w || SW.c.height < h) SW = makeBuf(Math.max(w, SW ? SW.c.width : 0), Math.max(h, SW ? SW.c.height : 0));
    const g = SW.g;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, SW.c.width, SW.c.height);
    g.drawImage(layer, 0, 0);
    g.globalCompositeOperation = 'destination-in';
    const span = (dir === 2 ? h : w) + feather, head = p * span;
    const on = '#000', off = 'rgba(0,0,0,0)';
    if (dir === 2) g.fillStyle = linear(g, 0, head - feather, 0, head, [[0, on], [1, off]]);
    else if (dir > 0) g.fillStyle = linear(g, head - feather, 0, head, 0, [[0, on], [1, off]]);
    else g.fillStyle = linear(g, w - head, 0, w - head + feather, 0, [[0, off], [1, on]]);
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'source-over';
    withAlpha(ctx, o.alpha ?? 1, () => ctx.drawImage(SW.c, 0, 0, w, h, x, y, w, h));
  };
  // A cached layer built once by fn(g) in a w x h canvas whose origin sits at (x, y) in the world.
  const LAY = {};
  S.layer = (key, x, y, w, h, fn) => {
    if (LAY[key]) return LAY[key];
    const b = makeBuf(Math.ceil(w), Math.ceil(h));
    b.g.translate(-x, -y); fn(b.g); b.g.setTransform(1, 0, 0, 1, 0, 0);
    return (LAY[key] = { c: b.c, x, y, w, h });
  };
  // p: 0..1 sweep; o.dir 1 = left to right, -1 = right to left; o.alpha.
  S.ridge = (ctx, spec, p, env, o = {}) => {
    const r = buildRidge(spec, env.palette);
    S.sweep(ctx, r.c, r.x, r.y, p, o);
  };

  // ───────── mist ─────────
  const MW = 2400, MH = 300;
  let MIST = null;
  function mistTile(P) {
    if (MIST && MIST.key === P.bg) return MIST.c;
    const b = makeBuf(MW, MH), g = b.g;
    for (let i = 0; i < 90; i++) {
      const x = hash(i * 4.3 + 61) * MW, y = MH * 0.5 + (hash(i * 5.9 + 62) - 0.5) * MH * 0.45, rx = 120 + hash(i * 6.1 + 63) * 320;
      for (const dx of [-MW, 0, MW]) {
        if (x + dx + rx < 0 || x + dx - rx > MW) continue;
        g.save(); g.translate(x + dx, y); g.scale(1, 0.22 + hash(i * 7.7) * 0.18);
        softBlob(g, 0, 0, rx, P.surface, 0.22 + hash(i * 8.8 + 64) * 0.3); g.restore();
      }
    }
    MIST = { key: P.bg, c: b.c };
    return b.c;
  }
  // o: {y (band centre), h (band height), a (opacity), v (px/s, + = rightwards), phase (px)}
  S.mist = (ctx, env, o = {}) => {
    const tile = mistTile(env.palette), v = o.v ?? 14, h = o.h ?? 260, y = (o.y ?? H * 0.6) - h / 2;
    const off = ((((o.phase ?? 0) + env.lt * v) % MW) + MW) % MW;
    withAlpha(ctx, o.a ?? 0.8, () => { for (let x = off - MW; x < W + PAN * 2; x += MW) ctx.drawImage(tile, x - PAN, y, MW, h); });
  };

  // ───────── tategaki (vertical Japanese) ─────────
  // Vertical presentation forms that Shippori Mincho B1 carries (its own 'vert' glyphs, positioned for columns);
  // what has no codepoint (ー, dashes) is rotated; small kana sit a little up and right.
  const VMAP = { '、': '︑', '。': '︒', '「': '﹁', '」': '﹂', '『': '﹃', '』': '﹄', '（': '︵', '）': '︶', '…': '︙', '，': '︐' };
  const ROT = new Set([...'ー〜～‥―－-〈〉《》【】〔〕［］｛｝()[]']);
  const SMALL = new Set([...'ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ']);
  // Lay out a column: [{ch, x, y (cell centre), rot, dx, dy}], step = size * (1 + ls).
  S.vlayout = (s, x, y, size, ls = 0.2) => {
    const step = size * (1 + ls), out = [];
    [...s].forEach((ch0, i) => {
      const ch = VMAP[ch0] || ch0, cy = y + i * step + step / 2, sm = SMALL.has(ch0);
      out.push({ ch, src: ch0, x, y: cy, rot: ROT.has(ch0), dx: sm ? size * 0.08 : 0, dy: sm ? -size * 0.08 : 0 });
    });
    return { cells: out, h: [...s].length * step, step };
  };
  function glyph(ctx, c) {
    ctx.save(); ctx.translate(c.x + c.dx, c.y + c.dy);
    if (c.rot) ctx.rotate(Math.PI / 2);
    ctx.fillText(c.ch, 0, 0);
    ctx.restore();
  }
  // lt: seconds since the column starts. o: size, color, ls, fam, weight, stagger (s/char), dur (s/char), halo,
  // out: {at (s, local to lt), stagger, dur} mist-clearing exit; alpha.
  S.vtext = (ctx, s, x, y, lt, o = {}) => {
    const size = o.size ?? 52, col = o.color, lay = S.vlayout(s, x, y, size, o.ls ?? 0.2);
    const st = o.stagger ?? 0.11, d = o.dur ?? 0.8, fnt = font(size, o.weight ?? 400, o.fam ?? 'display');
    ctx.save();
    ctx.font = fnt; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    lay.cells.forEach((c, i) => {
      const q = rm(lt, i * st, i * st + d);
      if (q <= 0) return;
      let gone = 0;
      if (o.out) gone = rm(lt, o.out.at + i * (o.out.stagger ?? 0.05), o.out.at + i * (o.out.stagger ?? 0.05) + (o.out.dur ?? 0.7));
      if (gone >= 1) return;
      const k = 1 - gone;
      // the ink lands as a soft grey blot that condenses into the glyph (nijimi in reverse), then keeps a faint halo
      const soft = Math.sin(Math.PI * Math.min(1, q * 1.1)) * 0.5 + 0.12 * q;
      ctx.save();
      ctx.filter = `blur(${(lerp(7, 1.6, Ease.outC(q)) + gone * 6).toFixed(2)}px)`;
      ctx.globalAlpha *= soft * (o.halo ?? 1) * k;
      ctx.fillStyle = col;
      const sc = 1 + 0.07 * (1 - Ease.outC(q)) + 0.05 * gone;
      ctx.translate(c.x, c.y); ctx.scale(sc, sc); ctx.translate(-c.x, -c.y);
      glyph(ctx, c);
      ctx.restore();
      const sharp = Math.pow(sstep(0.18, 1, q), 1.3) * Math.pow(k, 1.6);
      if (sharp > 0.003) {
        ctx.save(); ctx.globalAlpha *= sharp; ctx.fillStyle = col;
        if (gone > 0) ctx.filter = `blur(${(gone * 3.5).toFixed(2)}px)`;
        glyph(ctx, c); ctx.restore();
      }
    });
    ctx.restore();
    return lay;
  };
  S.vheight = (s, size, ls = 0.2) => [...s].length * size * (1 + ls);

  // ───────── the seal (落款) ─────────
  let SEAL = null;
  function sealImage(P) {
    const ver = (P.seal || P.accent) + '|' + P.bg;
    if (SEAL && SEAL.key === ver) return SEAL.c;
    const N = 360, b = makeBuf(N, N), g = b.g, red = P.seal || P.accent;
    const edge = (u, sd) => (vnP(u * 26, 26, 90 + sd) - 0.5) * 7 + (vnP(u * 80, 80, 95 + sd) - 0.5) * 3;
    g.beginPath();                                                    // a hand-cut square: slightly uneven, soft corners
    const m = 16, side = N - 2 * m, steps = 90;
    for (let sd = 0; sd < 4; sd++) for (let i = 0; i < steps; i++) {
      const u = i / steps, along = m + 10 + u * (side - 20), off = m + edge(u, sd);
      const [px, py] = sd === 0 ? [along, off] : sd === 1 ? [N - off, along] : sd === 2 ? [N - along, N - off] : [off, N - along];
      (sd || i) ? g.lineTo(px, py) : g.moveTo(px, py);
    }
    g.closePath(); g.fillStyle = red; g.fill();
    // 白文: 余 (right) and 白 (left), condensed to share the square, cut out of the red
    g.globalCompositeOperation = 'destination-out';
    g.font = font(250, 400, 'display'); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#000';
    g.strokeStyle = '#000'; g.lineJoin = 'round'; g.lineWidth = 11;
    for (const [ch, cx] of [['余', N * 0.735], ['白', N * 0.27]]) {
      g.save(); g.translate(cx, N * 0.515); g.scale(0.56, 1.06);
      g.fillText(ch, 0, 0); g.strokeText(ch, 0, 0); g.restore();
    }
    // ink transfer: specks where the stone missed the paper, a lighter patch, worn edges
    for (let i = 0; i < 420; i++) {
      const x = hash(i * 3.3 + 101) * N, y = hash(i * 4.7 + 102) * N, r = 0.6 + Math.pow(hash(i * 5.9 + 103), 3) * 4.5;
      g.fillStyle = `rgba(0,0,0,${0.3 + hash(i * 6.1) * 0.6})`; g.beginPath(); g.ellipse(x, y, r * 1.4, r, hash(i * 7.3) * 3, 0, TAU); g.fill();
    }
    softBlob(g, N * 0.3, N * 0.78, N * 0.32, '#000', 0.22);
    softBlob(g, N * 0.82, N * 0.2, N * 0.22, '#000', 0.14);
    g.globalCompositeOperation = 'source-over';
    SEAL = { key: ver, c: b.c };
    return b.c;
  }
  // s: seconds since the stone touched the paper (cue it on a beat). No tilt, no bounce: a press and the ink settles.
  S.seal = (ctx, x, y, size, s, env, o = {}) => {
    if (s < 0) return;
    const P = env.palette, img = sealImage(P), k = sstep(0, 0.07, s), settle = sstep(0, 0.45, s);
    ctx.save();
    ctx.globalAlpha *= (o.alpha ?? 1);
    if (s < 0.6) {                                                    // the paper dips under the stone for a moment
      const dip = (1 - sstep(0.05, 0.6, s)) * k;
      ctx.save(); ctx.filter = 'blur(6px)'; ctx.fillStyle = rgba(P.ink, 0.1 * dip);
      ctx.fillRect(x - size * 0.56, y - size * 0.54, size * 1.12, size * 1.14); ctx.restore();
    }
    ctx.globalAlpha *= k * lerp(0.8, 0.94, settle);
    const sc = lerp(1.012, 1, settle);
    ctx.translate(x, y); ctx.scale(sc, sc);
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
    ctx.restore();
  };

  window.SUMI = S;
})();
