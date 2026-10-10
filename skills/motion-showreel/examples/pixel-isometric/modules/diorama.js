// diorama: the Pebble & Bean renderer (a project module). The shop is a cosy isometric diorama in exactly the 16
// pastels of source/palette.txt. Every asset in assets/px/ is already those 16 colours (gen-src/pixelize.py), so each
// is read back as palette indices and composed into one index buffer at art resolution (640 x 360, the world at 3x).
// Light changes colours along hand-made ramps instead of mixing new ones: dusk moves every colour one stop cooler
// (cream to sky, latte to dusk, caramel to plum) and lamplight one stop warmer (latte to sand, sand to cream, cream to
// glow), through a 4x4 ordered dither, so evenings and lamp pools stay inside the palette; glow pixels are lamps and
// stay lit. At night only, soft additive halos sit on top for bulbs and windows ("evenings, the windows glow"). The
// camera shows the buffer at a whole-number scale (3x wide, 4x, 6x close) and moves in whole art pixels; a second
// buffer holds the interface (cards, the menu, progress), fixed on screen at 5x whatever the camera does. Sprites
// animate on a step clock of six steps a beat; positions move every frame, rounded to whole art pixels.
(() => {
  const AW = 640, AH = 360, N = AW * AH;
  const NAMES = ['cream', 'latte', 'caramel', 'espresso', 'ink', 'sage', 'mint', 'sky', 'dusk', 'plum', 'peach', 'rose', 'brick', 'sand', 'leaf', 'glow'];
  const I = Object.fromEntries(NAMES.map((n, i) => [n, i]));
  let PAL = null, RGB = null;
  const pal = () => {
    if (!PAL) { const m = ASSET('px/meta.json').palette; PAL = NAMES.map(n => m[n]); RGB = PAL.map(h => [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16))); }
    return RGB;
  };
  // one stop cooler (dusk) and one stop warmer (lamplight), by name
  const NIGHT = { cream: 'sky', sand: 'sky', glow: 'glow', mint: 'sage', sky: 'dusk', latte: 'dusk', peach: 'rose', sage: 'dusk', rose: 'plum',
    caramel: 'plum', leaf: 'dusk', dusk: 'plum', brick: 'plum', plum: 'ink', espresso: 'ink', ink: 'ink' };
  const WARM = { ink: 'espresso', espresso: 'brick', brick: 'caramel', caramel: 'latte', latte: 'sand', sand: 'cream', cream: 'glow', glow: 'glow',
    mint: 'cream', sage: 'mint', leaf: 'sage', sky: 'cream', dusk: 'sky', plum: 'rose', rose: 'peach', peach: 'glow' };
  const ramp = (M) => { const r = [Uint8Array.from(NAMES.map((_, i) => i))]; for (let k = 1; k <= 3; k++) r.push(Uint8Array.from(NAMES.map((_, i) => I[M[NAMES[r[k - 1][i]]]]))); return r; };
  const DARK = ramp(NIGHT), LIT = ramp(WARM);
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const TH = new Float32Array(N);
  for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) TH[y * AW + x] = (BAY[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
  const R = Math.round, ci = (v, a, b) => (v < a ? a : v > b ? b : v);

  // ───────── the frame: palette indices t (255 = nothing), light field L in stops, emissive flags
  const UW = 384, UH = 216, US = 5;                                   // the interface: its own buffer, shown at 5x
  const WORLD = new Uint8Array(N), UI = new Uint8Array(UW * UH), L = new Float32Array(N), EM = new Uint8Array(N);
  let t = WORLD, BW = AW, BH = AH;
  // draw into the world (moves with the camera) or into the UI (fixed on screen at 5x, 255 = see-through)
  const target = (w) => { if (w === 'ui') { t = UI; BW = UW; BH = UH; } else { t = WORLD; BW = AW; BH = AH; } };
  let CX0 = 0, CY0 = 0, CX1 = 1e9, CY1 = 1e9;
  const clip = (x0, y0, x1, y1) => { CX0 = R(x0); CY0 = R(y0); CX1 = R(x1); CY1 = R(y1); };
  const unclip = () => { CX0 = 0; CY0 = 0; CX1 = 1e9; CY1 = 1e9; };
  function px(x, y, c, em) {
    x = R(x); y = R(y);
    if (x >= CX0 && x < CX1 && y >= CY0 && y < CY1 && x >= 0 && y >= 0 && x < BW && y < BH) { const i = y * BW + x; t[i] = c; if (em !== undefined && t === WORLD) EM[i] = em; }
  }
  function rect(x, y, w, h, c) { for (let j = R(y); j < R(y + h); j++) for (let i = R(x); i < R(x + w); i++) px(i, j, c); }
  function fill(c) { t.fill(c); if (t === WORLD) EM.fill(0); }
  // a dithered fill between two colours at level 0..1 (anchored to the buffer, so it never swims)
  function dith(x, y, w, h, a, b, level) { for (let j = R(y); j < R(y + h); j++) for (let i = R(x); i < R(x + w); i++) if (i >= 0 && i < AW && j >= 0 && j < AH) px(i, j, TH[j * AW + i] < level ? b : a); }
  function line(x0, y0, x1, y1, c) {
    x0 = R(x0); y0 = R(y0); x1 = R(x1); y1 = R(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
    for (let k = 0; k < 2000; k++) { px(x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  }
  const inPoly = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
  const snap = () => WORLD.slice();

  // ───────── sprites: assets/px/*.png read back as palette indices (cached)
  const SPR = new Map();
  function spr(name) {
    let s = SPR.get(name); if (s) return s;
    const im = ASSET('px/' + name + '.png'); if (!im) return null;
    const w = im.naturalWidth || im.width, h = im.naturalHeight || im.height, b = makeBuf(w, h);
    b.g.drawImage(im, 0, 0);
    const d = b.g.getImageData(0, 0, w, h).data, a = new Uint8Array(w * h), rgb = pal();
    for (let i = 0; i < w * h; i++) {
      if (d[i * 4 + 3] < 128) { a[i] = 255; continue; }
      let best = 0, bd = 1e9;
      for (let k = 0; k < 16; k++) { const q = rgb[k], e = (q[0] - d[i * 4]) ** 2 + (q[1] - d[i * 4 + 1]) ** 2 + (q[2] - d[i * 4 + 2]) ** 2; if (e < bd) { bd = e; best = k; } }
      a[i] = best;
    }
    const m = ASSET('px/meta.json').items[name];
    s = { w, h, t: a, foot: m ? m.foot : [w >> 1, h - 1] }; SPR.set(name, s); return s;
  }
  // draw a sprite with its foot at (x, y); o.sx / o.sy scale about the foot (nearest), o.flip, o.map (colour remap),
  // o.em (emissive), o.cut (only rows above this many pixels from the foot: an item rising out of a box)
  function item(name, x, y, o = {}) {
    const s = spr(name); if (!s) return;
    const sx = o.sx ?? 1, sy = o.sy ?? 1, w = Math.max(1, R(s.w * sx)), h = Math.max(1, R(s.h * sy));
    const fx = s.foot[0] * sx, fy = s.foot[1] * sy, ox = R(x - fx), oy = R(y - fy);
    for (let j = 0; j < h; j++) {
      if (o.cut !== undefined && oy + j > y - o.cut) break;
      const sj = Math.min(s.h - 1, Math.floor(j / sy));
      for (let i = 0; i < w; i++) {
        let si = Math.min(s.w - 1, Math.floor(i / sx)); if (o.flip) si = s.w - 1 - si;
        const v = s.t[sj * s.w + si]; if (v !== 255) px(ox + i, oy + j, o.map ? o.map[v] : v, o.em ? 1 : 0);
      }
    }
  }
  // a whole layer at its top-left corner
  function layer(name, x, y, o = {}) {
    const s = spr(name); if (!s) return;
    x = R(x); y = R(y);
    for (let j = Math.max(0, -y); j < s.h && y + j < AH; j++) for (let i = Math.max(0, -x); i < s.w && x + i < AW; i++) {
      const v = s.t[j * s.w + i]; if (v !== 255) px(x + i, y + j, o.map ? o.map[v] : v, 0);
    }
  }

  // ───────── light: stops along the ramps, through the ordered dither
  const ambient = (v) => L.fill(v);
  function lamp(x, y, r, s, o = {}) {
    const sy = o.sy || 0.6, p = o.pow || 1;
    for (let j = Math.max(0, Math.floor(y - r * sy)); j <= Math.min(AH - 1, y + r * sy); j++) for (let i = Math.max(0, Math.floor(x - r)); i <= Math.min(AW - 1, x + r); i++) {
      const d = Math.hypot(i - x, (j - y) / sy) / r; if (d < 1) L[j * AW + i] += s * Math.pow(1 - d * d, p);
    }
  }
  function lightPoly(P, s) {
    const xs = P.map(p => p[0]), ys = P.map(p => p[1]);
    for (let j = Math.max(0, Math.floor(Math.min(...ys))); j <= Math.min(AH - 1, Math.max(...ys)); j++) for (let i = Math.max(0, Math.floor(Math.min(...xs))); i <= Math.min(AW - 1, Math.max(...xs)); i++)
      if (inPoly(i + 0.5, j + 0.5, P)) L[j * AW + i] += s;
  }
  function shade() {
    for (let i = 0; i < N; i++) {
      const l = L[i], c = WORLD[i]; if (l === 0 || c === 255 || EM[i]) continue;
      if (l < 0) { const k = Math.min(3, Math.floor(-l + TH[i])); if (k > 0) WORLD[i] = DARK[k][c]; }
      else { const k = Math.min(3, Math.floor(l + TH[i])); if (k > 0) WORLD[i] = LIT[k][c]; }
    }
    L.fill(0);
  }

  // ───────── pixel text in Jersey 10 (drawn at art size and thresholded), with the house sign's caramel shadow
  const TXT = new Map();
  function mask(s, size) {
    const key = s + '|' + size; let m = TXT.get(key); if (m) return m;
    const b = makeBuf(1024, size * 2), g = b.g;
    g.font = `${size}px "Jersey 10"`; g.textBaseline = 'top'; g.fillStyle = '#fff'; g.fillText(s, 0, 0);
    const w = Math.min(1024, Math.ceil(g.measureText(s).width) + 1), d = g.getImageData(0, 0, w, size * 2).data;
    const a = new Uint8Array(w * size * 2); let y1 = 0;
    for (let j = 0; j < size * 2; j++) for (let i = 0; i < w; i++) if (d[(j * w + i) * 4 + 3] >= 128) { a[j * w + i] = 1; y1 = Math.max(y1, j); }
    m = { w, h: y1 + 1, a }; TXT.set(key, m); return m;
  }
  const textW = (s, size = 10) => mask(s, size).w;
  // o: size (10 or 20), c colour, shadow colour or null, n characters (a typewriter), align 'l' | 'c' | 'r',
  // skew (y per x), em
  function text(s, x, y, o = {}) {
    const size = o.size || 10, c = o.c ?? I.espresso, sh = o.shadow === undefined ? I.caramel : o.shadow;
    const str = o.n === undefined ? s : s.slice(0, Math.max(0, Math.floor(o.n)));
    if (!str) return;
    const m = mask(str, size), full = mask(s, size), w = full.w;
    const x0 = R(o.align === 'c' ? x - w / 2 : o.align === 'r' ? x - w : x), sk = o.skew || 0;
    const put = (dx, dy, col) => { for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) if (m.a[j * m.w + i]) px(x0 + i + dx, R(y + j + dy + i * sk), col, o.em ? 1 : 0); };
    if (sh !== null) put(1, 1, sh);
    put(0, 0, c);
  }
  // a cosy-game window: caramel frame, cream inside, a sand inner line, rounded corners
  function win(x, y, w, h, o = {}) {
    x = R(x); y = R(y); w = R(w); h = R(h); if (w < 4 || h < 4) return;
    rect(x + 2, y + h, w - 2, 1, o.shadow ?? I.latte);
    rect(x + 1, y, w - 2, h, o.frame ?? I.caramel); rect(x, y + 1, w, h - 2, o.frame ?? I.caramel);
    rect(x + 1, y + 1, w - 2, h - 2, o.fill ?? I.cream);
    rect(x + 2, y + 2, w - 4, 1, o.line ?? I.sand);
  }

  // ───────── present: indices to colours, the camera at a whole-number scale, halos on top
  const buf = makeBuf(AW, AH), img = buf.g.createImageData(AW, AH);
  const ubuf = makeBuf(UW, UH), uimg = ubuf.g.createImageData(UW, UH);
  function present(ctx, cam, halos = []) {
    const rgb = pal(), d = img.data, ud = uimg.data;
    let anyUI = false;
    for (let i = 0, j = 0; i < N; i++, j += 4) { const c = rgb[WORLD[i] === 255 ? 0 : WORLD[i]]; d[j] = c[0]; d[j + 1] = c[1]; d[j + 2] = c[2]; d[j + 3] = 255; }
    for (let i = 0, j = 0; i < UW * UH; i++, j += 4) {
      const u = UI[i]; if (u !== 255) { const q = rgb[u]; ud[j] = q[0]; ud[j + 1] = q[1]; ud[j + 2] = q[2]; ud[j + 3] = 255; anyUI = true; } else ud[j + 3] = 0;
    }
    buf.g.putImageData(img, 0, 0);
    if (anyUI) ubuf.g.putImageData(uimg, 0, 0);
    const s = cam.s, vw = W / s, vh = H / s, sx = ci(R(cam.cx - vw / 2), 0, AW - vw), sy = ci(R(cam.cy - vh / 2), 0, AH - vh);
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buf.c, sx, sy, vw, vh, 0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (const h of halos) {
      const X = (h.x - sx) * s, Y = (h.y - sy) * s, r = h.r * s;
      ctx.fillStyle = radial(ctx, X, Y, 0, r, [[0, rgba(h.color || '#FFE8A3', h.a ?? 0.35)], [0.45, rgba(h.color || '#FFE8A3', (h.a ?? 0.35) * 0.35)], [1, rgba(h.color || '#FFE8A3', 0)]]);
      ctx.fillRect(X - r, Y - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
    if (anyUI) ctx.drawImage(ubuf.c, 0, 0, UW, UH, 0, 0, UW * US, UH * US);
    ctx.restore();
    UI.fill(255); target('world');
    return { sx, sy };
  }
  UI.fill(255);
  const span = (b, a, c) => ci((b - a) / (c - a), 0, 1);
  const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const STEPS = 6;                                                    // animation steps per beat
  const step = (b) => Math.floor(b * STEPS + 1e-6);
  window.DIO = { AW, AH, I, NAMES, TH, clip, unclip, px, rect, fill, dith, line, inPoly, snap, spr, item, layer, ambient, lamp, lightPoly, shade,
    text, textW, win, present, span, hash, step, STEPS, L, EM, ci, target, world: () => WORLD, UW, UH };
})();
