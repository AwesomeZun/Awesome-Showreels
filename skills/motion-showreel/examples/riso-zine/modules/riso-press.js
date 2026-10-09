// riso-press: the PAPER JAM print engine, shared by every scene (a project module, P/modules/*.js).
//
// The house style says every frame of a PAPER JAM video must "look printed: same two inks, same paper, same wobble.
// re-print, don't re-render" and move "stop-motion only, about 10 to 12 frames a second". So nothing here is drawn
// straight to the screen. A scene builds a display list of items; PJ.print() runs the list once per drum into a
// grayscale separation (pink, blue), mottles and specks the ink, colours it, and multiplies it onto newsprint with
// the blue drum off register. Registration, ink texture and paper are re-rolled on every stop-motion step, so each
// step is a new print (the riso-flipbook boil), and nothing moves between steps.
//
//   const items = [PJ.flood('blue'), PJ.scrap({...}), (g, ink) => { if (ink === 'pink') PJ.stamp(g, ...) }];
//   PJ.print(ctx, env, items, { view, sweep });
//
// Items are functions (g, ink, env) called once per drum in list order (later items print over earlier ones); they
// draw coverage in black (alpha = ink), knock out with PJ.knock / {knock: true}, and tint with PJ.tint (halftone
// dots, never opacity). Parameters come from style.json: palette.paper/pink/blue, print.{screen, misregisterPx,
// jitterPx, inkDensity, specks, doubleHit}, motion.stopMotion.{stepBeats, boilPx}, fonts.{display, stamp, mono, hand}.
//
// Double hit (house style: "pink words people have to read get a double hit"): PJ.dbl(item) marks an item whose pink
// is printed twice. When a list holds one, print() runs a third pass, 'pink2', through the pink drum with its own
// registration: marked items draw their pink again, every other item is called with ink 'pink2' and only knocks out
// (so a scrap pasted on top still covers the second hit). Items therefore test the ink explicitly
// (`ink === 'pink'`, `ink === 'blue'`), never with a bare else.
// Pure in (t, env): textures are built once from a seeded generator at load; per-frame variety comes from hash()
// of the step index. Globals: PJ only. Never assigns SCENES.
(() => {
  const PAL = STYLE.palette, PR = STYLE.print || {}, SM = (STYLE.motion && STYLE.motion.stopMotion) || {};
  const INK = { pink: PAL.pink || PAL.accent, blue: PAL.blue || PAL.accent2 };
  const PAPER = PAL.paper || PAL.bg;
  const F = {
    shout: STYLE.fonts.display, stamp: STYLE.fonts.stamp || STYLE.fonts.serif,
    type: STYLE.fonts.mono, hand: STYLE.fonts.hand || 'cursive',
  };
  const PITCH = (PR.screen && PR.screen.pitchPx) || 9;
  const ANG = Object.assign({ pink: 15, blue: 75 }, PR.screen && PR.screen.angles);
  const MIS = Object.assign({ pink: [0, 0], blue: [5, -3], pink2: [-3, 2] }, PR.misregisterPx);
  const JIT = PR.jitterPx ?? 1.5, DENS = PR.inkDensity || [0.82, 1], SPECK = PR.specks ?? 0.025;
  const STEP_BEATS = SM.stepBeats || 0.25, BOIL = SM.boilPx ?? 1.5;
  const DEG = Math.PI / 180;
  const MB = 24;                       // separation margin: floods reach past the frame, so misregistration never shows a gap
  const MT = 64;                       // texture margin: textures are offset per step
  const SW = W + 2 * MB, SH = H + 2 * MB;
  const NTEX = 3;

  // ───────── seeded generator (load-time textures only) ─────────
  function prng(seed) {
    let a = (seed * 2654435761) >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // smooth value noise on a lattice (cell px), 0..1
  function lattice(w, h, cell, rnd) {
    const gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2, g = new Float32Array(gw * gh);
    for (let i = 0; i < g.length; i++) g[i] = rnd();
    return (x, y) => {
      const fx = x / cell, fy = y / cell, ix = fx | 0, iy = fy | 0, tx = fx - ix, ty = fy - iy;
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty), o = iy * gw + ix;
      const a = g[o], b = g[o + 1], c = g[o + gw], d = g[o + gw + 1];
      return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    };
  }

  // ───────── load-time textures: ink (density + specks) and newsprint ─────────
  const TEX = [];
  let PAPERC = null;
  function inkTexture(seed) {
    const w = SW + 2 * MT, h = SH + 2 * MT, b = makeBuf(w, h), rnd = prng(seed);
    const n1 = lattice(w, h, 190, rnd), n2 = lattice(w, h, 34, rnd), n3 = lattice(w, h, 9, rnd), band = lattice(8, h, 46, rnd);
    const im = b.g.createImageData(w, h), d = im.data;
    const sp = new Float32Array(((w >> 1) + 1) * ((h >> 1) + 1));
    for (let i = 0; i < sp.length; i++) sp[i] = rnd();
    const spw = (w >> 1) + 1;
    for (let y = 0; y < h; y++) {
      const bs = 1 - 0.05 * Math.max(0, band(3, y) * 2 - 1);                       // faint roller streaks
      for (let x = 0; x < w; x++) {
        const a = n1(x, y), m = n2(x, y), f = n3(x, y);
        let dens = DENS[0] + (DENS[1] - DENS[0]) * clamp(0.5 * a + 0.32 * m + 0.18 * f + 0.05);
        const starve = clamp(1.6 - 2.2 * a) * clamp(1.4 - 2 * m);                     // specks cluster where ink is thin
        const r = sp[(y >> 1) * spw + (x >> 1)], thr = SPECK * (0.12 + 1.3 * starve);
        if (r < thr) { const q = r / thr; dens *= 0.04 + 0.7 * q * q; }              // 2x2 px specks, some only half starved
        else if (r > 0.9988) dens *= 0.35;
        const o = (y * w + x) * 4;
        d[o + 3] = Math.round(255 * dens * bs);
      }
    }
    b.g.putImageData(im, 0, 0);
    return b.c;
  }
  function paperTexture() {
    const w = SW + 2 * MT, h = SH + 2 * MT, b = makeBuf(w, h), g = b.g, rnd = prng(901);
    g.fillStyle = PAPER; g.fillRect(0, 0, w, h);
    const n1 = lattice(w, h, 260, rnd), n2 = lattice(w, h, 6, rnd);
    const im = g.getImageData(0, 0, w, h), d = im.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = 1 + 0.022 * (n1(x, y) - 0.5) + 0.03 * (n2(x, y) - 0.5) + 0.018 * (rnd() - 0.5), o = (y * w + x) * 4;
      d[o] = clamp(d[o] * v, 0, 255); d[o + 1] = clamp(d[o + 1] * v, 0, 255); d[o + 2] = clamp(d[o + 2] * (v - 0.004), 0, 255);
    }
    g.putImageData(im, 0, 0);
    g.lineCap = 'round';
    for (let i = 0; i < 2600; i++) {                                                  // newsprint fibres
      const x = rnd() * w, y = rnd() * h, L = 4 + rnd() * 16, a = rnd() * Math.PI, bend = (rnd() - 0.5) * 8;
      g.strokeStyle = rnd() < 0.7 ? 'rgba(120,108,92,0.10)' : 'rgba(255,255,255,0.35)';
      g.lineWidth = 0.5 + rnd() * 0.7;
      g.beginPath(); g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a) * L * 0.5 + bend, y + Math.sin(a) * L * 0.5 - bend, x + Math.cos(a) * L, y + Math.sin(a) * L);
      g.stroke();
    }
    for (let i = 0; i < 260; i++) {                                                   // pulp inclusions
      g.fillStyle = `rgba(70,60,52,${0.08 + rnd() * 0.16})`;
      circle(g, rnd() * w, rnd() * h, 0.5 + rnd() * 1.1); g.fill();
    }
    return b.c;
  }
  window.REEL_MODULES.push({
    name: 'riso-press',
    load() {
      for (let k = 0; k < NTEX; k++) TEX.push(inkTexture(11 + k * 17));
      PAPERC = paperTexture();
    },
  });

  // ───────── stop-motion clock ─────────
  const stepSec = (env) => env.beatSec * STEP_BEATS;
  const stepOf = (env, lt = env.lt) => Math.floor(lt / stepSec(env) + 1e-6);
  const stepped = (env, lt = env.lt) => stepOf(env, lt) * stepSec(env);
  // steps since beat b (negative before it); b must sit on the step grid
  const stepsSince = (env, b) => stepOf(env) - Math.round(b / STEP_BEATS);
  // per-step jitter of one hand-placed element
  function boil(env, seed = 1, amt = 1) {
    const k = stepOf(env);
    return { bx: (hash(k * 13.17 + seed * 7.71) - 0.5) * 2 * BOIL * amt, by: (hash(k * 9.31 + seed * 3.13) - 0.5) * 2 * BOIL * amt,
      br: (hash(k * 5.77 + seed * 1.91) - 0.5) * 0.008 * amt };
  }
  // "one frame in the air, one frame squashed, then still (ish)": the pose of an element that lands at `beat`.
  // n = steps since landing; null before it. o.amp scales the throw, o.from = [dx, dy] direction of the throw.
  function slap(env, beat, o = {}) {
    const n = stepsSince(env, beat);
    if (n < 0) return null;
    const seed = o.seed ?? beat * 3.7 + 1, amp = o.amp ?? 1, bo = boil(env, seed, o.boil ?? 1);
    const fx = (o.from && o.from[0]) ?? -0.7, fy = (o.from && o.from[1]) ?? -1;
    if (n === 0) return { n, s: 1 + 0.12 * amp, r: (hash(seed) < 0.5 ? -1 : 1) * (0.05 + 0.04 * hash(seed + 2)) * amp, dx: 16 * fx * amp, dy: 16 * fy * amp, sh: 2.4 };
    if (n === 1) return { n, s: 1 - 0.03 * amp, r: (hash(seed + 1) - 0.5) * 0.02 * amp, dx: -2 * fx, dy: -2 * fy, sh: 0.5 };
    return { n, s: 1, r: bo.br, dx: bo.bx, dy: bo.by, sh: 1 };
  }
  const REST = { n: 9, s: 1, r: 0, dx: 0, dy: 0, sh: 1 };

  // ───────── separations ─────────
  const SEP = {};
  const sep = (ink) => SEP[ink] || (SEP[ink] = makeBuf(SW, SH));
  // the view that zooms the page by s about the page point (fx, fy) (that point stays where it is on screen)
  const zoomAt = (fx, fy, s) => ({ x: fx + (W / 2 - fx) / s, y: fy + (H / 2 - fy) / s, s });
  function applyView(g, v) {
    // v = {x, y, s, r}: the page point (x, y) sits at the frame centre, zoomed s, rotated r (rad)
    g.translate(W / 2, H / 2); g.scale(v.s || 1, v.s || 1); if (v.r) g.rotate(v.r); g.translate(-(v.x ?? W / 2), -(v.y ?? H / 2));
  }
  function drawPaper(ctx, k, view) {
    if (!PAPERC) { ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H); return; }
    const ox = Math.floor(hash(k * 3.19 + 0.7) * 2 * MT), oy = Math.floor(hash(k * 4.41 + 0.2) * 2 * MT);
    ctx.save();
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
    if (view) applyView(ctx, view);
    ctx.drawImage(PAPERC, -MB - ox, -MB - oy);
    ctx.restore();
  }
  // a print pass in progress: only the part of the sheet that has gone under the drum carries ink (left to right)
  function sweepMask(g, p, k) {
    if (p >= 1) return;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'destination-in';
    g.beginPath();
    const x = lerp(-10, SW + 10, clamp(p));
    g.moveTo(0, 0); g.lineTo(x, 0);
    for (let y = 0; y <= SH; y += 18) g.lineTo(x + (hash(y * 0.37 + k * 1.3) - 0.5) * 22, y);
    g.lineTo(x, SH); g.lineTo(0, SH); g.closePath();
    g.fillStyle = '#000'; g.fill();
    g.restore();
  }
  // Run the display list through both drums and multiply them onto newsprint.
  // o: {view, sweep: {pink, blue} 0..1, paper: false, seed}
  function print(ctx, env, items, o = {}) {
    const k = stepOf(env) + (o.seed || 0);
    if (o.paper !== false) drawPaper(ctx, k, o.view);
    for (const ink of ['pink', 'blue']) {
      if (o.sweep && o.sweep[ink] !== undefined && o.sweep[ink] <= 0) continue;
      const b = sep(ink), g = b.g;
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.filter = 'none';
      g.clearRect(0, 0, SW, SH);
      g.translate(MB, MB);
      if (o.view) applyView(g, o.view);
      for (const it of items) {
        if (!it) continue;
        g.save(); g.fillStyle = '#000'; g.strokeStyle = '#000';
        it(g, ink, env);
        g.restore();
      }
      if (o.sweep && o.sweep[ink] !== undefined) sweepMask(g, o.sweep[ink], k);
      g.setTransform(1, 0, 0, 1, 0, 0);
      const T = TEX[(k * 2 + (ink === 'blue' ? 1 : 0)) % NTEX];
      if (T) {
        g.globalCompositeOperation = 'destination-in';
        g.drawImage(T, -Math.floor(hash(k * 1.37 + (ink === 'blue' ? 0.61 : 0.1)) * 2 * MT), -Math.floor(hash(k * 2.71 + (ink === 'blue' ? 0.83 : 0.3)) * 2 * MT));
      }
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = INK[ink]; g.fillRect(0, 0, SW, SH);
      g.globalCompositeOperation = 'source-over';
      const m = MIS[ink] || [0, 0], sd = ink === 'blue' ? 11.3 : 3.7;
      const jx = (hash(k * 7.31 + sd) - 0.5) * 2 * JIT, jy = (hash(k * 5.17 + sd * 0.7) - 0.5) * 2 * JIT;
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(b.c, Math.round(m[0] + jx) - MB, Math.round(m[1] + jy) - MB);
      ctx.restore();
    }
  }

  // ───────── halftone screens ─────────
  const PATS = new WeakMap();
  function dotTile(level) {
    const P = PITCH * 2, b = makeBuf(P, P), g = b.g;                                 // 2x supersampled tile, drawn scaled
    g.fillStyle = '#000';
    if (level <= 0.5) { circle(g, P / 2, P / 2, P * Math.sqrt(level / Math.PI)); g.fill(); }
    else {
      g.fillRect(0, 0, P, P);
      g.globalCompositeOperation = 'destination-out';
      const r = P * Math.sqrt((1 - level) / Math.PI);
      for (const [x, y] of [[0, 0], [P, 0], [0, P], [P, P]]) { circle(g, x, y, r); g.fill(); }
    }
    return b.c;
  }
  // CanvasPattern of round dots for coverage `level` at the ink's screen angle (cached per context and level)
  function tint(g, ink, level) {
    const q = Math.round(clamp(level) * 20) / 20;
    let m = PATS.get(g);
    if (!m) PATS.set(g, (m = {}));
    const key = ink + q;
    if (!m[key]) {
      const p = g.createPattern(dotTile(q), 'repeat');
      p.setTransform(new DOMMatrix().rotateSelf(ANG[ink] || 45).scaleSelf(0.5, 0.5));
      m[key] = p;
    }
    return m[key];
  }
  // A continuous-tone drawing turned into dots once (art moves with the dots printed on it).
  // drawTone(g, w, h) paints ink amount as darkness (black = solid ink) on white.
  const ARTS = {};
  function halftoneArt(key, w, h, ink, drawTone, o = {}) {
    if (ARTS[key]) return ARTS[key];
    const b = makeBuf(w, h), g = b.g;
    g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, h);
    drawTone(g, w, h);
    const im = g.getImageData(0, 0, w, h), d = im.data, a = (ANG[ink] || 45) * DEG, ca = Math.cos(a), sa = Math.sin(a), P = o.pitch || PITCH;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, tone = 1 - (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;
      const u = x * ca + y * sa, v = -x * sa + y * ca;
      const s = (Math.cos((TAU * u) / P) + Math.cos((TAU * v) / P) + 2) / 4;
      const cov = tone < 0.02 ? 0 : tone > 0.985 ? 1 : clamp((tone - (1 - s)) * 7 + 0.5);
      d[i] = d[i + 1] = d[i + 2] = 0; d[i + 3] = Math.round(cov * 255);
    }
    g.putImageData(im, 0, 0);
    return (ARTS[key] = b.c);
  }

  // ───────── paper and paste-up ─────────
  const PATHS = {};
  // a torn rectangle centred on 0,0 (w x h), deterministic per seed
  function torn(w, h, seed, rough = 7) {
    const key = `${w | 0}|${h | 0}|${seed}|${rough}`;
    if (PATHS[key]) return PATHS[key];
    const p = new Path2D(), corners = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
    let first = true, drift = 0, j = 0;
    for (let e = 0; e < 4; e++) {
      const [x0, y0] = corners[e], [x1, y1] = corners[(e + 1) % 4], L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(4, Math.round(L / 10));
      const nx = (y1 - y0) / L, ny = -(x1 - x0) / L;
      for (let i = 0; i < n; i++, j++) {
        const t = i / n, r1 = hash(seed * 31.7 + j * 1.913), r2 = hash(seed * 17.3 + j * 3.71);
        drift = 0.68 * drift + (r1 - 0.5) * rough * 0.9;
        const off = drift + (r2 < 0.13 ? (hash(seed + j * 7.1) - 0.5) * rough * 2.6 : 0);
        const x = x0 + (x1 - x0) * t + nx * off, y = y0 + (y1 - y0) * t + ny * off;
        if (first) { p.moveTo(x, y); first = false; } else p.lineTo(x, y);
      }
    }
    p.closePath();
    return (PATHS[key] = p);
  }
  function knock(g, path) {
    const op = g.globalCompositeOperation;
    g.globalCompositeOperation = 'destination-out';
    if (path) g.fill(path); else g.fill();
    g.globalCompositeOperation = op;
  }
  // a flood of one ink over a rect (default: the whole sheet, past the frame edges)
  function flood(ink, r = null, level = 1) {
    return (g, k) => {
      if (k !== ink) return;
      g.fillStyle = level < 1 ? tint(g, ink, level) : '#000';
      if (r) g.fillRect(r.x, r.y, r.w, r.h); else g.fillRect(-MB - 40, -MB - 40, W + 2 * MB + 80, H + 2 * MB + 80);
    };
  }
  // A torn scrap pasted on the page: knocks out what is under it in both drums, prints a halftone shadow in blue,
  // then its own fill and content. o: {x, y, w, h, rot (deg), seed, fill: 'pink'|'blue'|'paper', tint 0..1,
  // rough, rim, pose (from slap), shadow (false | level), shadowInk, outline, content(g, ink)} in scrap-local coordinates.
  function scrap(o) {
    const rim = o.rim ?? 5, rough = o.rough ?? 7;
    const P = torn(o.w, o.h, o.seed, rough), I = torn(o.w - 2 * rim, o.h - 2 * rim, o.seed + 0.37, rough * 0.8);
    return (g, ink) => {
      const ps = o.pose || REST;
      if (!ps) return;
      g.translate(o.x + ps.dx, o.y + ps.dy); g.rotate((o.rot || 0) * DEG + ps.r); g.scale(ps.s, ps.s);
      if (o.shadow !== false && ink === (o.shadowInk || 'blue')) {
        g.save(); g.translate(8 * ps.sh, 10 * ps.sh); g.fillStyle = tint(g, ink, o.shadow ?? 0.42); g.fill(P); g.restore();
      }
      knock(g, P);
      if (o.fill === 'paper' || !o.fill) {
        if (ink === 'blue' && o.outline !== false) { g.lineWidth = 1.7; g.globalAlpha = 0.9; g.stroke(P); g.globalAlpha = 1; }
      } else if (o.fill === ink) {
        g.fillStyle = o.tint !== undefined && o.tint < 1 ? tint(g, ink, o.tint) : '#000';
        g.fill(I);
      }
      if (o.content) { g.save(); o.content(g, ink); g.restore(); }
    };
  }
  // A full-sheet paste-over with one torn edge: covers the frame from `side` up to fraction k (0..1).
  // fill: 'paper' | 'pink' | 'blue'. Used for the out-phase of a scene and the first frame of the next (a match).
  function sheet(k, o = {}) {
    if (k <= 0) return null;
    const side = o.side || 'bottom', seed = o.seed || 5, fill = o.fill || 'paper';
    const big = 2600;
    return (g, ink) => {
      const pos = side === 'bottom' ? [W / 2, lerp(H + big / 2 + 30, H / 2 + big / 2 - H / 2 - 60, k)]
        : side === 'top' ? [W / 2, lerp(-big / 2 - 30, -big / 2 + H + 60, k)]
          : side === 'right' ? [lerp(W + big / 2 + 30, big / 2 - 60, k), H / 2] : [lerp(-big / 2 - 30, W - big / 2 + 60, k), H / 2];
      const rot = (o.rot ?? -2.5) * (1 - k * 0.6);
      scrap({ x: pos[0], y: pos[1], w: big, h: big, rot, seed, fill, rough: 16, rim: 9, shadow: o.shadow ?? 0.5 })(g, ink);
    };
  }

  // ───────── type: stamps, typewriter, marker ─────────
  const fam = (f) => F[f] || f;
  function measureT(s, size, f, ls = 0) {
    const g = sep('pink').g;
    g.save(); g.font = font(size, 400, fam(f)); g.letterSpacing = ls + 'px';
    const w = g.measureText(s).width; g.restore();
    return w;
  }
  // plain text into a separation; o.knock punches it out of what is printed below
  function text(g, s, x, y, o = {}) {
    g.save();
    g.font = font(o.size || 40, o.weight || 400, fam(o.fam || 'type'));
    g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'alphabetic';
    g.letterSpacing = (o.ls || 0) + 'px';
    if (o.knock) { g.globalCompositeOperation = 'destination-out'; g.fillText(s, x, y); }
    else { g.fillStyle = o.fill || '#000'; g.fillText(s, x, y); }
    g.restore();
  }
  // A rubber stamp, cached: Alfa Slab lettering in a double border, inked unevenly (pressure falls off to one side,
  // clumps and voids). Returns {c, w, h}; draw it centred with stampAt().
  const STAMPS = {};
  function stampCanvas(s, o = {}) {
    const size = o.size || 64, f = o.fam || 'stamp', border = o.border ?? 2, seed = o.seed ?? 3, ls = size * (o.ls ?? 0.06);
    const key = [s, size, f, border, seed, ls].join('|');
    if (STAMPS[key]) return STAMPS[key];
    const tw = measureT(s, size, f, ls), padX = size * 0.42, padY = size * 0.3, lw = Math.max(3, size * 0.075);
    const w = Math.ceil(tw + padX * 2 + lw * 4), h = Math.ceil(size * 1.0 + padY * 2 + lw * 4), b = makeBuf(w + 8, h + 8), g = b.g;
    g.translate(4, 4);
    g.fillStyle = '#000'; g.strokeStyle = '#000';
    if (border >= 1) { g.lineWidth = lw; g.strokeRect(lw / 2, lw / 2, w - lw, h - lw); }
    if (border >= 2) { g.lineWidth = lw * 0.45; g.strokeRect(lw * 2.1, lw * 2.1, w - lw * 4.2, h - lw * 4.2); }
    g.font = font(size, 400, fam(f)); g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.letterSpacing = ls + 'px';
    g.fillText(s, w / 2 + ls / 2, h / 2 + size * 0.36);
    // uneven inking
    const W2 = b.c.width, H2 = b.c.height, im = g.getImageData(0, 0, W2, H2), d = im.data, rnd = prng(seed * 97 + s.length);
    const cl = lattice(W2, H2, Math.max(6, size * 0.12), rnd), lo = lattice(W2, H2, Math.max(30, size * 0.8), rnd);
    const side = o.side ?? (hash(seed) < 0.5 ? 1 : -1);
    for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
      const i = (y * W2 + x) * 4 + 3;
      if (!d[i]) continue;
      const press = clamp(0.62 + 0.5 * (side > 0 ? x / W2 : 1 - x / W2) + 0.25 * (lo(x, y) - 0.5));
      const clump = cl(x, y), r = rnd();
      let a = press;
      if (clump < 0.3 && r < 0.75) a *= 0.12;                                       // dry clumps
      else if (r < 0.05) a *= 0.2;                                                    // pin voids
      d[i] = Math.round(d[i] * clamp(a * 1.15));
    }
    g.putImageData(im, 0, 0);
    return (STAMPS[key] = { c: b.c, w: W2, h: H2 });
  }
  function stampAt(g, s, x, y, o = {}) {
    const st = stampCanvas(s, o), ps = o.pose || REST;
    g.save();
    g.translate(x + ps.dx, y + ps.dy); g.rotate((o.rot || 0) * DEG + ps.r); g.scale(ps.s * (o.scale || 1), ps.s * (o.scale || 1));
    if (o.knock) g.globalCompositeOperation = 'destination-out';
    g.drawImage(st.c, -st.w / 2, -st.h / 2);
    g.restore();
    return st;
  }
  // Typewriter: the first n characters of s, one strike each (density and baseline vary per key)
  function typed(g, s, x, y, n, o = {}) {
    const size = o.size || 40, f = fam(o.fam || 'type'), seed = o.seed || 1;
    g.save();
    g.font = font(size, o.weight || 700, f); g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    const adv = g.measureText('M').width + (o.ls || 0), chars = [...s], N = Math.min(chars.length, Math.max(0, Math.floor(n)));
    let x0 = x;
    if (o.align === 'center') x0 = x - (chars.length * adv) / 2;
    else if (o.align === 'right') x0 = x - chars.length * adv;
    if (o.knock) g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < N; i++) {
      const ch = chars[i];
      if (ch === ' ') continue;
      const h1 = hash(seed * 13.1 + i * 2.37), h2 = hash(seed * 7.7 + i * 5.13);
      g.globalAlpha = o.knock ? 1 : 0.78 + 0.22 * h1;
      g.fillText(ch, x0 + i * adv + (h2 - 0.5) * 1.2, y + (h1 - 0.5) * 2.2);
      if (!o.knock && h2 > 0.93) { g.globalAlpha = 0.35; g.fillText(ch, x0 + i * adv + 1.4, y + 0.8); }   // double strike
    }
    g.restore();
    return { w: chars.length * adv, adv };
  }
  // Marker handwriting revealed left to right (p 0..1, stepped by the caller)
  function scrawl(g, s, x, y, p, o = {}) {
    if (p <= 0) return;
    const size = o.size || 56, f = fam(o.fam || 'hand');
    g.save();
    g.translate(x, y); g.rotate((o.rot || 0) * DEG);
    g.font = font(size, 400, f); g.textAlign = o.align || 'left'; g.textBaseline = 'alphabetic';
    const w = g.measureText(s).width, x0 = o.align === 'center' ? -w / 2 : o.align === 'right' ? -w : 0;
    g.beginPath(); g.rect(x0 - 10, -size * 1.2, (w + 20) * clamp(p), size * 1.8); g.clip();
    if (o.knock) g.globalCompositeOperation = 'destination-out';
    g.fillText(s, 0, 0);
    g.restore();
  }
  // A marker stroke along pts (p 0..1 of its length), with a little wobble baked into the points by the caller
  function marker(g, pts, p, o = {}) {
    if (p <= 0) return;
    g.save();
    g.lineWidth = o.w || 9; g.lineCap = 'round'; g.lineJoin = 'round';
    if (o.knock) g.globalCompositeOperation = 'destination-out';
    polyStroke(g, pts, clamp(p)); g.stroke();
    g.restore();
  }
  // an arrow head at the end of pts
  function arrowHead(g, pts, o = {}) {
    const n = pts.length, [x1, y1] = pts[n - 1], [x0, y0] = pts[n - 2], a = Math.atan2(y1 - y0, x1 - x0), L = o.len || 30;
    g.save(); g.lineWidth = o.w || 9; g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x1 + Math.cos(a + 2.6) * L, y1 + Math.sin(a + 2.6) * L); g.lineTo(x1, y1); g.lineTo(x1 + Math.cos(a - 2.6) * L, y1 + Math.sin(a - 2.6) * L);
    g.stroke(); g.restore();
  }
  // a printer's registration target, printed by both drums (so the misregistration shows)
  function regMark(x, y, r = 16) {
    return (g) => {
      g.lineWidth = 1.6;
      circle(g, x, y, r); g.stroke();
      g.beginPath(); g.moveTo(x - r * 1.7, y); g.lineTo(x + r * 1.7, y); g.moveTo(x, y - r * 1.7); g.lineTo(x, y + r * 1.7); g.stroke();
    };
  }
  // crop marks at the corners of a rect
  function cropMarks(r, L = 34, gap = 12) {
    return (g) => {
      g.lineWidth = 1.5; g.beginPath();
      for (const [x, y, sx, sy] of [[r.x, r.y, -1, -1], [r.x + r.w, r.y, 1, -1], [r.x, r.y + r.h, -1, 1], [r.x + r.w, r.y + r.h, 1, 1]]) {
        g.moveTo(x + sx * gap, y); g.lineTo(x + sx * (gap + L), y); g.moveTo(x, y + sy * gap); g.lineTo(x, y + sy * (gap + L));
      }
      g.stroke();
    };
  }
  // a staple (blue, with its printed shadow)
  function staple(x, y, rot = 90, len = 64) {
    return (g, ink) => {
      if (ink !== 'blue') return;
      g.translate(x, y); g.rotate(rot * DEG);
      g.save(); g.translate(3, 4); g.fillStyle = tint(g, 'blue', 0.45); g.fillRect(-len / 2, -4, len, 8); g.restore();
      g.lineWidth = 5; g.lineCap = 'butt'; g.beginPath(); g.moveTo(-len / 2, 4); g.lineTo(-len / 2, -2); g.lineTo(len / 2, -2); g.lineTo(len / 2, 4); g.stroke();
    };
  }

  // a group of items under one transform {x, y, s, r (deg)} (+ an optional pose)
  function group(tx, items) {
    return (g, ink, env) => {
      const ps = tx.pose || REST;
      g.translate(tx.x + ps.dx, tx.y + ps.dy); g.rotate(((tx.r || 0) * DEG) + ps.r); g.scale((tx.s || 1) * ps.s, (tx.s || 1) * ps.s);
      for (const it of items) { if (!it) continue; g.save(); it(g, ink, env); g.restore(); }
    };
  }
  const CAPS = {};
  function capH(f, size) {
    const key = f + size;
    if (CAPS[key]) return CAPS[key];
    const g = sep('pink').g;
    g.save(); g.font = font(size, 400, fam(f));
    const m = g.measureText('HAMPER'); g.restore();
    return (CAPS[key] = m.actualBoundingBoxAscent || size * 0.7);
  }

  // ───────── the PAPER JAM cover parts (the hook prints them; the finale's zine copies reuse them) ─────────
  // Ransom-note masthead, letter by letter as on source/issue07-cover-scan.jpg: [char, face, scrap fill, letter ink]
  const RANSOM = [
    ['P', 'shout', 'pink', 'knock'], ['A', 'stamp', 'paper', 'blue'], ['P', 'typeb', 'blue', 'knock'], ['E', 'shout', 'pink50', 'blue'],
    ['R', 'stamp', 'paper', 'pink'], ['J', 'stamp', 'blue', 'knock'], ['A', 'shout', 'pink', 'knock'], ['M', 'typeb', 'paper', 'blue'],
  ];
  // one ransom letter on its torn scrap; o: {i (index in RANSOM), x, y, w, h, rot, pose, seed}
  function ransom(o) {
    const [ch, face, fill, ink] = RANSOM[o.i], f = face === 'typeb' ? 'type' : face, weight = face === 'typeb' ? 700 : 400;
    const size = o.h * (face === 'shout' ? 0.86 : face === 'stamp' ? 0.66 : 0.84), base = capH(f, size) / 2;
    const scrapFill = fill === 'pink50' ? 'pink' : fill;
    return scrap({
      x: o.x, y: o.y, w: o.w, h: o.h, rot: o.rot, seed: o.seed ?? 40 + o.i * 7, pose: o.pose, fill: scrapFill,
      tint: fill === 'pink50' ? 0.5 : undefined, rough: o.rough ?? 6, rim: o.rim ?? 5, shadow: o.shadow,
      content: (g, k) => {
        if (ink === 'knock') { if (k === scrapFill) text(g, ch, 0, base, { size, fam: f, weight, align: 'center', knock: true }); }
        else if (k === ink) text(g, ch, 0, base, { size, fam: f, weight, align: 'center' });
      },
    });
  }
  // the halftone speaker cone: blue cone and ridges, pink surround and dust cap. o: {x, y, R, pulse (scale), pose}
  function speakerArt() {
    return halftoneArt('speaker', 760, 760, 'blue', (g, w, h) => {
      const c = w / 2, R = 300;
      // cone: darker toward the rim and on the lower right (light from the upper left)
      for (let r = R; r > R * 0.26; r -= 2) {
        const u = r / R, ridge = Math.pow(Math.abs(Math.sin(r / 9.5)), 14);
        const grad = g.createLinearGradient(c - r, c - r, c + r, c + r);
        const base = 0.16 + 0.42 * u + 0.22 * ridge;
        grad.addColorStop(0, `rgb(${Array(3).fill(Math.round(255 * (1 - clamp(base - 0.14)))).join(',')})`);
        grad.addColorStop(1, `rgb(${Array(3).fill(Math.round(255 * (1 - clamp(base + 0.2)))).join(',')})`);
        g.fillStyle = grad; circle(g, c, c, r); g.fill();
      }
      g.fillStyle = '#FFFFFF'; circle(g, c, c, R * 0.26); g.fill();                     // the cap is drawn by itself
      // dust cap shading (lower right)
      const cg = g.createRadialGradient(c - R * 0.08, c - R * 0.08, 2, c, c, R * 0.27);
      cg.addColorStop(0, '#FFFFFF'); cg.addColorStop(0.6, '#D8D8D8'); cg.addColorStop(1, '#7A7A7A');
      g.fillStyle = cg; circle(g, c, c, R * 0.25); g.fill();
    });
  }
  function speaker(o) {
    return (g, ink) => {
      const ps = o.pose || REST, s = (o.R || 300) / 300 * ps.s * (o.pulse || 1);
      g.translate(o.x + ps.dx, o.y + ps.dy); g.rotate(ps.r); g.scale(s, s);
      if (ink === 'blue') {
        g.drawImage(speakerArt(), -380, -380);
        g.lineWidth = 6; circle(g, 0, 0, 300 * 0.86); g.stroke();
        g.lineWidth = 3; circle(g, 0, 0, 300 * 0.62); g.stroke();
        g.lineWidth = 10; circle(g, 0, 0, 300 + 48); g.stroke();                       // the outer rim
      } else {
        g.fillStyle = tint(g, 'pink', 0.42);
        g.beginPath(); g.arc(0, 0, 300 + 43, 0, TAU); g.arc(0, 0, 300, 0, TAU, true); g.fill('evenodd');
        g.fillStyle = '#000'; circle(g, 0, 0, 300 * 0.26); g.fill();
      }
    };
  }

  window.PJ = {
    INK, PAPER, F, PITCH, DEG, RANSOM,
    stepSec, stepOf, stepped, stepsSince, boil, slap, REST, zoomAt,
    print, tint, halftoneArt, torn, knock, flood, scrap, sheet, group,
    text, measureT, capH, stampCanvas, stampAt, typed, scrawl, marker, arrowHead, regMark, cropMarks, staple,
    ransom, speaker,
  };
})();
