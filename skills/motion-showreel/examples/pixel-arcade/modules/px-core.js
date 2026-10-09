// px-core: the ONE CREDIT JAM console, shared by every scene (a project module, P/modules/*.js).
//
// The jam's rules are the renderer's rules (source/README.md):
//   rule 2  16 colours: every pixel of the game canvas is one of the 16 CREDIT-16 colours (style.json pixel.palette,
//           in index order). OCJ.finish() snaps the canvas to the palette after drawing, so nothing else survives.
//   rule 3  320 x 180, whole-number scaling only: scenes draw on a 320 x 180 canvas in whole pixels; px-crt.js shows it
//           x6 through a CRT. Nothing on the canvas is ever scaled smoothly or rotated.
// Motion runs on a 12-fps step clock on the 60-fps timeline (style.json pixel.stepFps): at 144 BPM a beat is exactly
// 5 steps, so stepped poses land on the beat grid. Effects of the display (scanlines, curvature, power on/off) run at
// 60 fps in px-crt.js.
//
// Globals (prefixed with the project): OCJ. Modules load after compositor.js and before the scenes; this file never
// assigns SCENES. Everything is a pure function of its arguments (scenes pass env.lt); no state is carried between
// frames except caches keyed by their inputs.
(() => {
  const SPEC = STYLE.pixel || {};
  const CW = (SPEC.canvas && SPEC.canvas[0]) || 320, CH = (SPEC.canvas && SPEC.canvas[1]) || 180;
  const FALLBACK = ['#0B0A16', '#1E1B3A', '#4C5170', '#A8ADC6', '#FFF6E3', '#8C3327', '#F0263E', '#FF8A1F', '#FFD93D', '#17603F',
    '#6CE24A', '#2B49E8', '#62C3FF', '#5B2A86', '#FF5FB5', '#FFB98A'];
  const KEYS = SPEC.palette || ['void', 'night', 'slate', 'fog', 'bone', 'rust', 'cherry', 'ember', 'gold', 'pine', 'lime', 'cobalt',
    'sky', 'grape', 'bubble', 'peach'];
  const HEX = KEYS.map((k, i) => toHex(STYLE.palette[k] || FALLBACK[i]).toUpperCase());
  const RGB = HEX.map(h => parseColor(h).slice(0, 3));
  const IDX = {};
  KEYS.forEach((k, i) => { IDX[k.toUpperCase()] = i; IDX[k] = i; });
  const C = {};                                   // C.GOLD = '#FFD93D' ...
  KEYS.forEach((k, i) => { C[k.toUpperCase()] = HEX[i]; });
  const STEP_FPS = SPEC.stepFps || 12;

  // ───────── palette ramps (README "Ramps that work") ─────────
  // one step darker / lighter for every index: NES-style fades walk these, never alpha
  const N = IDX;
  const DARKER = [];
  DARKER[N.VOID] = N.VOID; DARKER[N.NIGHT] = N.VOID; DARKER[N.SLATE] = N.NIGHT; DARKER[N.FOG] = N.SLATE; DARKER[N.BONE] = N.FOG;
  DARKER[N.RUST] = N.NIGHT; DARKER[N.CHERRY] = N.RUST; DARKER[N.EMBER] = N.RUST; DARKER[N.GOLD] = N.EMBER;
  DARKER[N.PINE] = N.VOID; DARKER[N.LIME] = N.PINE; DARKER[N.COBALT] = N.NIGHT; DARKER[N.SKY] = N.COBALT;
  DARKER[N.GRAPE] = N.NIGHT; DARKER[N.BUBBLE] = N.GRAPE; DARKER[N.PEACH] = N.EMBER;
  const LIGHTER = [];
  LIGHTER[N.VOID] = N.NIGHT; LIGHTER[N.NIGHT] = N.SLATE; LIGHTER[N.SLATE] = N.FOG; LIGHTER[N.FOG] = N.BONE; LIGHTER[N.BONE] = N.BONE;
  LIGHTER[N.RUST] = N.CHERRY; LIGHTER[N.CHERRY] = N.EMBER; LIGHTER[N.EMBER] = N.GOLD; LIGHTER[N.GOLD] = N.BONE;
  LIGHTER[N.PINE] = N.LIME; LIGHTER[N.LIME] = N.BONE; LIGHTER[N.COBALT] = N.SKY; LIGHTER[N.SKY] = N.BONE;
  LIGHTER[N.GRAPE] = N.BUBBLE; LIGHTER[N.BUBBLE] = N.PEACH; LIGHTER[N.PEACH] = N.BONE;
  const walk = (tab, i, k) => { for (let j = 0; j < k; j++) i = tab[i]; return i; };

  // ───────── the canvas ─────────
  let SCR = null;
  function screen() {
    if (!SCR) {
      const c = document.createElement('canvas');
      c.width = CW; c.height = CH;
      const g = c.getContext('2d', { willReadFrequently: true });
      const t = document.createElement('canvas');           // scratch for mosaic
      t.width = CW; t.height = CH;
      SCR = { c, g, t, tg: t.getContext('2d', { willReadFrequently: true }) };
    }
    const g = SCR.g;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
    g.imageSmoothingEnabled = false; g.shadowBlur = 0; g.shadowColor = 'transparent';
    g.textBaseline = 'alphabetic'; g.textAlign = 'left'; g.letterSpacing = '0px';
    g.fillStyle = HEX[N.VOID]; g.fillRect(0, 0, CW, CH);
    return SCR;
  }
  const col = c => (typeof c === 'number' ? HEX[c] : C[c] || c);
  function rect(g, x, y, w, h, c) { g.fillStyle = col(c); g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function px(g, x, y, c) { g.fillStyle = col(c); g.fillRect(Math.round(x), Math.round(y), 1, 1); }
  // pixel line (Bresenham), 1 px wide
  function line(g, x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    g.fillStyle = col(c);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (let n = 0; n < 2000; n++) {
      g.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e;
      if (e2 >= dy) { e += dy; x0 += sx; }
      if (e2 <= dx) { e += dx; y0 += sy; }
    }
  }
  // filled pixel disc (centre on a pixel centre when r is whole)
  function disc(g, cx, cy, r, c) {
    g.fillStyle = col(c);
    const R = Math.max(0, r);
    for (let y = -Math.ceil(R); y <= Math.ceil(R); y++) {
      const hw = Math.floor(Math.sqrt(Math.max(0, R * R - y * y)) + 0.35);
      if (R * R - y * y < 0) continue;
      g.fillRect(Math.round(cx - hw), Math.round(cy + y), hw * 2 + 1, 1);
    }
  }
  function ring(g, cx, cy, r, c) {
    g.fillStyle = col(c);
    const steps = Math.max(12, Math.ceil(r * 7));
    let last = '';
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * TAU, x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r), k = x + ',' + y;
      if (k !== last) g.fillRect(x, y, 1, 1);
      last = k;
    }
  }
  // ordered 4x4 Bayer dither
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
  // fill a rect with colour b over colour a at level 0..16 (0 = all a, 16 = all b)
  function dither(g, x, y, w, h, a, b, level) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    const L = Math.round(clamp(level, 0, 16));
    rect(g, x, y, w, h, a);
    if (L <= 0) return;
    if (L >= 16) { rect(g, x, y, w, h, b); return; }
    g.fillStyle = col(b);
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (bayer(xx, yy) < L) g.fillRect(xx, yy, 1, 1);
  }
  // vertical bands: stops [[y, colour], ...] top to bottom; dithered transitions `soft` px tall around each stop
  function bands(g, x, y, w, h, stops, soft = 8) {
    for (let i = 0; i < stops.length; i++) {
      const y0 = i === 0 ? y : stops[i][0], y1 = i + 1 < stops.length ? stops[i + 1][0] : y + h;
      rect(g, x, y0, w, y1 - y0, stops[i][1]);
    }
    for (let i = 1; i < stops.length; i++) {
      const sy = stops[i][0], a = stops[i - 1][1], b = stops[i][1];
      for (let k = 0; k < soft; k++) {
        const yy = sy - soft / 2 + k;
        if (yy < y || yy >= y + h) continue;
        const lv = Math.round(((k + 0.5) / soft) * 16);
        g.fillStyle = col(k < soft / 2 ? b : a);
        for (let xx = x; xx < x + w; xx++) {
          const useB = bayer(xx, yy) < lv;
          if (k < soft / 2 ? useB : !useB) g.fillRect(xx, yy, 1, 1);
        }
      }
    }
  }

  // ───────── time ─────────
  // whole steps of the 12-fps clock since the scene started (epsilon: lt is a sum of floats)
  const step = lt => Math.floor(lt * STEP_FPS + 1e-3);
  const stepT = lt => step(lt) / STEP_FPS;
  const stepsPerBeat = env => Math.round(env.beatSec * STEP_FPS);
  // step index of a beat count (beats may be fractional: 0.2 beat = 1 step at 144 BPM)
  const sb = (env, beats) => Math.round(beats * env.beatSec * STEP_FPS);
  // steps until the scene's out-phase starts / ends (both whole at 144 BPM)
  const outStep = env => Math.round((env.dur - env.outSec) * STEP_FPS);
  const endStep = env => Math.round(env.dur * STEP_FPS);
  // blink: on for `on` steps of every `period` (phase in steps)
  const blink = (s, period, on, phase = 0) => (((s - phase) % period) + period) % period < on;
  // ballistic jump on the step grid: height (px) at step s of a jump that lasts `dur` steps and peaks at `h`
  const arc = (s, dur, h) => (s < 0 || s > dur ? 0 : Math.round(4 * h * (s / dur) * (1 - s / dur)));
  // fall under gravity that lands at step `land` from `h` px above (0 at the landing, never below)
  const fall = (s, land, h, dur) => (s >= land ? 0 : Math.round(h * Math.pow(clamp((land - s) / dur), 2)));
  // squash after a landing: [sx, sy] whole-pixel deltas for a sprite (2 steps flat, then back)
  const squash = ds => (ds < 0 ? 0 : ds < 1 ? 2 : ds < 2 ? 1 : 0);
  // screen shake in whole pixels for `ds` steps after a hit (the world moves, the HUD stays)
  const SHAKE = [[0, -3], [2, 2], [-2, 1], [1, -1], [-1, 0], [0, 0]];
  const shakeAt = (ds, k = 1) => (ds < 0 || ds >= SHAKE.length ? [0, 0] : [Math.round(SHAKE[ds][0] * k), Math.round(SHAKE[ds][1] * k)]);
  // deterministic pseudo-random (scene code never uses Math.random)
  const rnd = (a, b = 0) => hsh2(a * 1.731 + 0.37, b * 3.117 + 1.9);

  // ───────── text: the jam's two faces at whole multiples of their pixel grid ─────────
  const FONTS = {
    P: { fam: '"Press Start 2P", monospace', em: 8, cap: 7, top: 8, adv: 8 },   // caps sit in the top 7 rows of the 8-px cell
    S: { fam: '"Silkscreen", monospace', em: 8, cap: 5, top: 5, adv: null },
    B: { fam: '"Silkscreen", monospace', em: 8, cap: 5, top: 5, adv: null, weight: 700 },
  };
  function setFont(g, f, k) { g.font = `${f.weight || 400} ${f.em * k}px ${f.fam}`; }
  function textW(g, s, o = {}) {
    const f = FONTS[o.font || 'P'], k = o.scale || 1;
    g.save(); setFont(g, f, k); g.letterSpacing = (o.ls || 0) * k + 'px';
    const w = Math.round(g.measureText(s).width); g.restore();
    return w;
  }
  // y = top of the capitals. o: font P|S|B, scale (whole), color, shadow (colour; 1 px down-right x scale),
  // outline (colour; 8 neighbours), align left|center|right, ls (extra px per glyph, x scale)
  function text(g, s, x, y, o = {}) {
    const f = FONTS[o.font || 'P'], k = Math.max(1, Math.round(o.scale || 1));
    g.save();
    setFont(g, f, k); g.textBaseline = 'alphabetic'; g.textAlign = 'left'; g.letterSpacing = (o.ls || 0) * k + 'px';
    const w = Math.round(g.measureText(s).width);
    let x0 = Math.round(x);
    if (o.align === 'center') x0 = Math.round(x - w / 2);
    else if (o.align === 'right') x0 = Math.round(x - w);
    const base = Math.round(y) + f.top * k;
    if (o.outline !== undefined && o.outline !== null) {
      g.fillStyle = col(o.outline);
      for (const [dx, dy] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]) g.fillText(s, x0 + dx * k, base + dy * k);
      if (o.shadow !== undefined && o.shadow !== null) { g.fillStyle = col(o.shadow); g.fillText(s, x0 + 2 * k, base + 2 * k); }
    } else if (o.shadow !== undefined && o.shadow !== null) {
      g.fillStyle = col(o.shadow); g.fillText(s, x0 + k, base + k);
    }
    g.fillStyle = col(o.color ?? N.BONE);
    if (o.colorFn) {                      // per-glyph colour (palette cycling)
      let cx = x0;
      [...s].forEach((ch, i) => { g.fillStyle = col(o.colorFn(i, ch)); g.fillText(ch, cx, base); cx += g.measureText(ch).width + (o.ls || 0) * k; });
    } else g.fillText(s, x0, base);
    g.restore();
    return w;
  }
  // typing reveal: first n glyphs (n from steps since start, `rate` glyphs per step)
  const typed = (s, ds, rate = 1) => (ds < 0 ? '' : [...s].slice(0, Math.floor(ds * rate) + 1).join(''));
  // zero-padded score
  const pad = (v, n = 6) => String(Math.max(0, Math.floor(v))).padStart(n, '0');

  // ───────── big type with the jam's logo treatment (README: "EMBER: the middle of every logo") ─────────
  // A word set at a whole multiple of the font grid, painted in horizontal bands (BONE cap, GOLD, EMBER, CHERRY base),
  // extruded `depth` px down-right in RUST and VOID and outlined 1 px in NIGHT. Cached per word/scale/ramp.
  const LOGO_CACHE = new Map();
  const RAMPS = {
    fire: [N.BONE, N.GOLD, N.GOLD, N.EMBER, N.EMBER, N.CHERRY, N.CHERRY],
    ice: [N.BONE, N.SKY, N.SKY, N.SKY, N.COBALT, N.COBALT, N.COBALT],
    lime: [N.BONE, N.LIME, N.LIME, N.LIME, N.PINE, N.PINE, N.PINE],
    candy: [N.BONE, N.PEACH, N.BUBBLE, N.BUBBLE, N.BUBBLE, N.GRAPE, N.GRAPE],
    gold: [N.BONE, N.GOLD, N.GOLD, N.GOLD, N.GOLD, N.EMBER, N.EMBER],
    bone: [N.BONE, N.BONE, N.BONE, N.BONE, N.FOG, N.FOG, N.FOG],
  };
  function bigWord(s, k, o = {}) {
    const ramp = o.ramp || 'fire', depth = o.depth ?? Math.max(2, k + 1), key = `${s}|${k}|${ramp}|${depth}|${o.outline ?? 'n'}|${o.font || 'P'}`;
    if (LOGO_CACHE.has(key)) return LOGO_CACHE.get(key);
    const f = FONTS[o.font || 'P'];
    const meas = document.createElement('canvas').getContext('2d');
    setFont(meas, f, k);
    const tw = Math.ceil(meas.measureText(s).width), th = f.top * k;
    const W0 = tw + depth + 4, H0 = th + depth + 4;
    const m = document.createElement('canvas'); m.width = W0; m.height = H0;
    const mg = m.getContext('2d', { willReadFrequently: true });
    setFont(mg, f, k); mg.fillStyle = '#FFFFFF'; mg.textBaseline = 'alphabetic';
    mg.fillText(s, 1, 1 + th);
    const src = mg.getImageData(0, 0, W0, H0).data;
    const face = new Uint8Array(W0 * H0);
    for (let i = 0; i < W0 * H0; i++) face[i] = src[i * 4 + 3] > 127 ? 1 : 0;
    const out = document.createElement('canvas'); out.width = W0; out.height = H0;
    const og = out.getContext('2d');
    const occ = new Uint8Array(W0 * H0);
    const put = (x, y, ci) => { og.fillStyle = HEX[ci]; og.fillRect(x, y, 1, 1); };
    const R = RAMPS[ramp] || RAMPS.fire;
    // extrusion, far to near
    for (let d = depth; d >= 1; d--) {
      const ci = d === depth ? N.VOID : o.side ?? N.RUST;
      for (let y = 0; y < H0; y++) for (let x = 0; x < W0; x++) {
        if (!face[y * W0 + x]) continue;
        const X = x + d, Y = y + d;
        if (X < W0 && Y < H0) { put(X, Y, ci); occ[Y * W0 + X] = 1; }
      }
    }
    // outline around face + extrusion
    if (o.outline !== false) {
      const oc = o.outline ?? N.NIGHT;
      for (let y = 0; y < H0; y++) for (let x = 0; x < W0; x++) {
        const i = y * W0 + x;
        if (face[i] || occ[i]) continue;
        let near = false;
        for (let j = -1; j <= 1 && !near; j++) for (let q = -1; q <= 1; q++) {
          const xx = x + q, yy = y + j;
          if (xx >= 0 && yy >= 0 && xx < W0 && yy < H0 && (face[yy * W0 + xx] || occ[yy * W0 + xx])) { near = true; break; }
        }
        if (near) put(x, y, oc);
      }
    }
    // face in bands: one band per font row (k px), the ramp spread over the cap height
    for (let y = 0; y < H0; y++) for (let x = 0; x < W0; x++) {
      if (!face[y * W0 + x]) continue;
      const row = Math.floor((y - 1) / k), bi = clamp(Math.floor((row / Math.max(1, f.cap)) * R.length), 0, R.length - 1);
      put(x, y, R[bi]);
    }
    const res = { c: out, w: W0, h: H0, tw, th, face, W0, H0 };
    LOGO_CACHE.set(key, res);
    return res;
  }
  // draw a bigWord with its top-left of the caps at (x, y); o.shine: x of a 3-px diagonal BONE band across the face
  function drawWord(g, word, x, y, o = {}) {
    const W0 = word.W0;
    g.drawImage(word.c, Math.round(x) - 1, Math.round(y) - 1);
    if (o.shine !== undefined && o.shine !== null) {
      g.fillStyle = HEX[N.BONE];
      for (let yy = 0; yy < word.H0; yy++) for (let xx = 0; xx < W0; xx++) {
        if (!word.face[yy * W0 + xx]) continue;
        const d = xx + yy * 0.6 - o.shine;
        if (d >= 0 && d < (o.width || 3)) g.fillRect(Math.round(x) - 1 + xx, Math.round(y) - 1 + yy, 1, 1);
      }
    }
  }

  // ───────── finish: palette snap + the console's own transitions ─────────
  // o.fade 0..1 (walk DARKER up to 4 steps: VOID at 1), o.flash 0..1 (walk LIGHTER up to 4 steps: BONE at 1),
  // o.mosaic block size in px (1 = off; whole numbers), o.cut: [y0, y1) rows painted VOID (blinds), o.iris {x, y, r}
  const snapCache = new Map();
  function nearest(r, g_, b) {
    const key = (r << 16) | (g_ << 8) | b;
    let v = snapCache.get(key);
    if (v !== undefined) return v;
    let best = 0, bd = 1e9;
    for (let i = 0; i < 16; i++) {
      const dr = r - RGB[i][0], dg = g_ - RGB[i][1], db = b - RGB[i][2];
      const d = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
      if (d < bd) { bd = d; best = i; }
    }
    snapCache.set(key, best);
    return best;
  }
  function finish(scr, o = {}) {
    const { c, g, t, tg } = scr;
    const mos = Math.max(1, Math.round(o.mosaic || 1));
    if (mos > 1) {                         // SNES-style mosaic: each block takes its top-left pixel
      tg.setTransform(1, 0, 0, 1, 0, 0); tg.imageSmoothingEnabled = false;
      tg.clearRect(0, 0, CW, CH); tg.drawImage(c, 0, 0);
      const ox = o.mosaicX ?? CW / 2, oy = o.mosaicY ?? CH / 2;
      const x0 = Math.round(ox - Math.ceil(ox / mos) * mos), y0 = Math.round(oy - Math.ceil(oy / mos) * mos);
      g.imageSmoothingEnabled = false;
      for (let y = y0; y < CH; y += mos) for (let x = x0; x < CW; x += mos) {
        const sx = clamp(x, 0, CW - 1), sy = clamp(y, 0, CH - 1);
        g.drawImage(t, sx, sy, 1, 1, x, y, mos, mos);
      }
    }
    const im = g.getImageData(0, 0, CW, CH), d = im.data;
    const fk = o.fade ? Math.round(clamp(o.fade) * 4) : 0, lk = o.flash ? Math.round(clamp(o.flash) * 4) : 0;
    const iris = o.iris, cut = o.cut;
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      let ci = nearest(d[i], d[i + 1], d[i + 2]);
      if (fk) ci = walk(DARKER, ci, fk);
      if (lk) ci = walk(LIGHTER, ci, lk);
      if (iris || cut) {
        const x = p % CW, y = (p / CW) | 0;
        if (iris) { const dx = x + 0.5 - iris.x, dy = y + 0.5 - iris.y; if (dx * dx + dy * dy > iris.r * iris.r) ci = N.VOID; }
        if (cut && cut(x, y)) ci = N.VOID;
      }
      const q = RGB[ci];
      d[i] = q[0]; d[i + 1] = q[1]; d[i + 2] = q[2]; d[i + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    return scr;
  }

  // ───────── shared HUD row (1UP / HI-SCORE / 2UP) ─────────
  function hudTop(g, o = {}) {
    const top = o.y ?? 4;
    text(g, '1UP', 16, top, { color: N.CHERRY });
    text(g, pad(o.score ?? 0), 16, top + 10, { color: N.BONE });
    text(g, 'HI-SCORE', CW / 2, top, { color: N.CHERRY, align: 'center' });
    text(g, pad(o.hi ?? 72016), CW / 2, top + 10, { color: N.GOLD, align: 'center' });
    if (o.twoUp !== false) text(g, '2UP', CW - 16, top, { color: N.SKY, align: 'right' });
  }

  // ───────── starfield: three layers drifting left in whole pixels, twinkling on the step clock ─────────
  function stars(g, s, o = {}) {
    const n = o.n ?? 90, y0 = o.y0 ?? 0, y1 = o.y1 ?? CH, speed = o.speed ?? 1;
    for (let i = 0; i < n; i++) {
      const layer = i % 3, v = [0.25, 0.5, 1][layer] * speed;
      const x = Math.floor((((rnd(i, 1) * CW - s * v) % CW) + CW) % CW), y = Math.floor(y0 + rnd(i, 2) * (y1 - y0));
      const tw = blink(s, 9 + (i % 7), 1, i * 3);
      const ci = layer === 2 ? (tw ? N.SLATE : N.BONE) : layer === 1 ? (tw ? N.NIGHT : N.FOG) : N.SLATE;
      px(g, x, y, ci);
      if (layer === 2 && i % 9 === 0 && !tw) { px(g, x - 1, y, N.SLATE); px(g, x + 1, y, N.SLATE); px(g, x, y - 1, N.SLATE); px(g, x, y + 1, N.SLATE); }
    }
  }

  // ───────── pixel particles: square debris on gravity arcs, quantized to whole pixels ─────────
  function burst(g, x, y, ds, o = {}) {
    if (ds < 0) return;
    const n = o.n ?? 10, life = o.life ?? 7, cols = o.colors || [N.GOLD, N.BONE, N.EMBER], seed = o.seed ?? 1;
    for (let i = 0; i < n; i++) {
      const a = (o.up ? -Math.PI : 0) + (o.spread ?? TAU) * (rnd(seed, i) - 0.5) + (o.up ? 0 : rnd(seed + 3, i) * TAU);
      const sp = (o.speed ?? 3) * (0.5 + rnd(seed + 7, i));
      const L = Math.round(life * (0.6 + 0.4 * rnd(seed + 9, i)));
      if (ds > L) continue;
      const px_ = x + Math.cos(a) * sp * ds, py = y + Math.sin(a) * sp * ds + (o.grav ?? 0.45) * ds * ds;
      const size = ds < L * 0.5 ? (o.size ?? 2) : 1;
      rect(g, px_, py, size, size, cols[i % cols.length]);
    }
  }
  // floating score pop (+100): rises 1 px per step for `life` steps, blinks out
  function pop(g, s, x, y, ds, o = {}) {
    const life = o.life ?? 9;
    if (ds < 0 || ds > life) return;
    if (ds > life - 3 && ds % 2) return;
    text(g, s, x, y - Math.min(ds, 6), { font: o.font || 'S', color: o.color ?? N.BONE, shadow: o.shadow ?? N.VOID, align: 'center', scale: o.scale || 1 });
  }

  // ───────── the jam logo lockup (source/media/logo.png): ONE CREDIT at x2 over JAM at x4 ─────────
  // cx = centre x, y = top of the ONE CREDIT caps. o.dyTop / o.dyJam: per-word vertical offsets (drops),
  // o.shine: x of the diagonal shine band (or null). Returns the lockup box.
  function logo(g, cx, y, o = {}) {
    const top = bigWord('ONE CREDIT', 2, { ramp: 'fire', depth: 2 }), jam = bigWord('JAM', 4, { ramp: 'fire', depth: 4 });
    const xt = Math.round(cx - top.tw / 2), xj = Math.round(cx - jam.tw / 2);
    const yt = Math.round(y + (o.dyTop || 0)), yj = Math.round(y + 19 + (o.dyJam || 0));
    if (o.showJam !== false) drawWord(g, jam, xj, yj, { shine: o.shine !== undefined && o.shine !== null ? o.shine - (xj - xt) : null, width: o.shineW || 4 });
    if (o.showTop !== false) drawWord(g, top, xt, yt, { shine: o.shine, width: o.shineW || 4 });
    return { x: xt, y: Math.round(y), w: top.tw, h: 19 + jam.th, jamX: xj, jamY: yj, jamW: jam.tw };
  }

  // ───────── raster bars: copper-style colour bars on VOID (hiscore's backdrop, the cabinet's attract screen) ─────────
  const BARS = [
    [N.NIGHT, N.GRAPE, N.BUBBLE, N.PEACH, N.BONE],
    [N.NIGHT, N.COBALT, N.SKY, N.BONE],
    [N.RUST, N.CHERRY, N.EMBER, N.GOLD, N.BONE],
    [N.VOID, N.PINE, N.LIME, N.BONE],
  ];
  // x, y, w, h: the region; s: step; o.unit: px per colour row; o.n: bars; o.amp: travel (px); o.dim: 0..1 (walk darker)
  function raster(g, x, y, w, h, s, o = {}) {
    const u = o.unit || 2, n = o.n || 4, amp = o.amp ?? h * 0.36;
    rect(g, x, y, w, h, N.VOID);
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    for (let i = 0; i < n; i++) {
      const ramp = BARS[i % BARS.length], rows = [...ramp, ...ramp.slice(0, -1).reverse()];
      const cy = y + h / 2 + Math.round(amp * Math.sin(s * 0.21 + i * 1.7));
      const top = Math.round(cy - (rows.length * u) / 2);
      rows.forEach((ci, k) => rect(g, x, top + k * u, w, u, o.dim ? walk(DARKER, ci, o.dim) : ci));
    }
    g.restore();
  }

  window.OCJ = {
    W: CW, H: CH, SCALE: (SPEC.scale || 6), STEP_FPS, HEX, RGB, KEYS, C, I: IDX, N, DARKER, LIGHTER, RAMPS,
    screen, rect, px, line, disc, ring, dither, bands, bayer,
    step, stepT, stepsPerBeat, sb, outStep, endStep, blink, arc, fall, squash, shakeAt, rnd,
    FONTS, text, textW, typed, pad, bigWord, drawWord, finish, hudTop, stars, burst, pop, col, walk, logo, raster, BARS,
  };
})();
