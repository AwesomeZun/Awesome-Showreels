// pocket: the Ridgeline Pocket screen, shared by every scene (a project module). The brand's rules are the renderer's
// rules (source/brand-notes.md): a 240 x 135 grid shown at exactly 8x (1920 x 1080), four greens and never a fifth,
// dithering instead of gradients, the in-house 5x7 bitmap font, motion that steps at 9 fps (a 108-BPM beat is exactly 5
// steps), and an LCD that keeps a faint ghost of the previous step. A frame is a buffer of tone indices 0..3 (shadow,
// moss, lichen, paper). The art in assets/px/ is pixel art already limited to those four greens (gen-src/pixelize.py),
// so every layer is read back as tones and copied in at whole pixels. Light is tonal as well: a light field, in tone
// steps, is added to each pixel through a 4x4 ordered dither, so a sunrise, a light shaft or a campfire raises and
// lowers tones in dithered rings instead of glowing (the brand forbids glow and gradients). Scenes draw with
// POCKET.present(ctx, env, (f, T, b) => ...): f is this API, T the stepped scene time in seconds, b the same in beats.
// Each scene also registers its painter in POCKET.screens, so the next scene can rebuild the outgoing screen's last
// step for a push, a dissolve or an iris. Pure in time.
(() => {
  const GW = 240, GH = 135, N = GW * GH, SC = 8, STEP = 9;
  const PAL = ['#1B2B1A', '#3E5E2E', '#8FAE3A', '#D4E59A'];
  const RGB = PAL.map(h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)));
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const TH = new Float32Array(N);                       // the dither threshold of every pixel, in (0, 1)
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) TH[y * GW + x] = (BAY[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
  const ci = (v, a, b) => (v < a ? a : v > b ? b : v);
  const R = Math.round;

  // ───────── the frame: tones t, light field L (tone steps), a clip rectangle
  const t = new Uint8Array(N), L = new Float32Array(N);
  let X0 = 0, Y0 = 0, X1 = GW, Y1 = GH;
  function clip(x0, y0, x1, y1) { X0 = ci(R(x0), 0, GW); Y0 = ci(R(y0), 0, GH); X1 = ci(R(x1), 0, GW); Y1 = ci(R(y1), 0, GH); }
  function unclip() { X0 = 0; Y0 = 0; X1 = GW; Y1 = GH; }
  function fill(v) { for (let y = Y0; y < Y1; y++) t.fill(v, y * GW + X0, y * GW + X1); }
  function px(x, y, v) { x = R(x); y = R(y); if (x >= X0 && x < X1 && y >= Y0 && y < Y1) t[y * GW + x] = v; }
  function get(x, y) { x = R(x); y = R(y); return x >= 0 && x < GW && y >= 0 && y < GH ? t[y * GW + x] : 255; }
  function rect(x, y, w, h, v) {
    const xa = Math.max(X0, R(x)), xb = Math.min(X1, R(x) + R(w)), ya = Math.max(Y0, R(y)), yb = Math.min(Y1, R(y) + R(h));
    for (let j = ya; j < yb; j++) if (xb > xa) t.fill(v, j * GW + xa, j * GW + xb);
  }
  function frame(x, y, w, h, v) { rect(x, y, w, 1, v); rect(x, y + h - 1, w, 1, v); rect(x, y, 1, h, v); rect(x + w - 1, y, 1, h, v); }
  // a dithered fill: colour b over a at level 0..1, anchored to the screen so it never swims
  function dith(x, y, w, h, a, b, level) {
    const xa = Math.max(X0, R(x)), xb = Math.min(X1, R(x) + R(w)), ya = Math.max(Y0, R(y)), yb = Math.min(Y1, R(y) + R(h));
    for (let j = ya; j < yb; j++) for (let i = xa; i < xb; i++) t[j * GW + i] = TH[j * GW + i] < level ? b : a;
  }
  // Bresenham; dash = [on, off] in pixels along the line; n = how many pixels to draw (a line drawing on)
  function line(x0, y0, x1, y1, v, dash, n = Infinity) {
    x0 = R(x0); y0 = R(y0); x1 = R(x1); y1 = R(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy, k = 0;
    for (let i = 0; i < 4000 && k < n; i++, k++) {
      if (!dash || k % (dash[0] + dash[1]) < dash[0]) px(x0, y0, v);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; }
    }
    return k;
  }
  // a polyline drawn on up to length n (pixels); returns the end point reached
  function path(pts, v, n = Infinity, dash) {
    let used = 0, end = pts[0];
    for (let i = 0; i + 1 < pts.length && used < n; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1], len = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) + 1;
      const k = Math.min(len, n - used);
      line(ax, ay, bx, by, v, dash, k); used += len;
      end = [ax + (bx - ax) * (k - 1) / Math.max(1, len - 1), ay + (by - ay) * (k - 1) / Math.max(1, len - 1)];
    }
    return end;
  }
  function disc(cx, cy, r, v) {
    for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++)
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) px(x, y, v);
  }
  const snap = () => t.slice();
  const put = (a) => t.set(a);

  // ───────── tone layers: assets/px/*.png read back as tone indices (255 = transparent), cached
  const LAY = new Map();
  function tones(name) {
    let Ly = LAY.get(name); if (Ly) return Ly;
    const im = ASSET('px/' + name + '.png'); if (!im) return null;
    const w = im.naturalWidth || im.width, h = im.naturalHeight || im.height, b = makeBuf(w, h);
    b.g.drawImage(im, 0, 0);
    const d = b.g.getImageData(0, 0, w, h).data, a = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) { const g = d[i * 4 + 1]; a[i] = d[i * 4 + 3] < 128 ? 255 : g < 68 ? 0 : g < 134 ? 1 : g < 202 ? 2 : 3; }
    Ly = { w, h, t: a }; LAY.set(name, Ly); return Ly;
  }
  // copy a layer in at a whole-pixel offset; o.map remaps tones (e.g. [0, 0, 1, 2] one step darker)
  function layer(name, x, y, o = {}) {
    const Ly = tones(name); if (!Ly) return;
    x = R(x); y = R(y);
    const { w, h, t: s } = Ly, m = o.map;
    const xa = Math.max(X0, x), xb = Math.min(X1, x + w), ya = Math.max(Y0, y), yb = Math.min(Y1, y + h);
    for (let j = ya; j < yb; j++) {
      let si = (j - y) * w + (xa - x), di = j * GW + xa;
      for (let i = xa; i < xb; i++, si++, di++) { const v = s[si]; if (v !== 255) t[di] = m ? m[v] : v; }
    }
  }
  // put back a snapshot's pixels wherever a layer is opaque (a foreground layer drawn again over a sprite)
  function restore(a, name, x, y) {
    const Ly = tones(name); if (!Ly) return;
    x = R(x); y = R(y);
    for (let j = Math.max(0, y); j < Math.min(GH, y + Ly.h); j++) for (let i = Math.max(0, x); i < Math.min(GW, x + Ly.w); i++)
      if (Ly.t[(j - y) * Ly.w + (i - x)] !== 255) t[j * GW + i] = a[j * GW + i];
  }
  const size = (name) => { const Ly = tones(name); return Ly ? [Ly.w, Ly.h] : [0, 0]; };
  // a sprite-sheet frame (meta from assets/px/meta.json) with its feet at (x, y); o.flip, o.outline (a tone drawn as a
  // one-pixel line around the silhouette, so a dark sprite reads on dark ground), o.map, o.rim
  let META = null;
  const meta = () => (META || (META = ASSET('px/meta.json')));
  const RIM = new Map();
  function sprite(sheet, fr, x, y, o = {}) {
    const m = meta().sheets[sheet], Ly = tones(sheet); if (!m || !Ly) return;
    const k = ((fr % m.frames.length) + m.frames.length) % m.frames.length, [f0, f1] = m.frames[k], fw = f1 - f0;
    const ox = R(x - fw / 2), oy = R(y) - m.foot;
    const at = (i, j) => Ly.t[j * Ly.w + f0 + (o.flip ? fw - 1 - i : i)];
    if (o.outline !== undefined) {
      const key = sheet + k + (o.flip ? 'f' : '');
      let rim = RIM.get(key);
      if (!rim) {
        rim = [];
        for (let j = -1; j <= m.foot; j++) for (let i = -1; i <= fw; i++) {
          const inside = (a, b) => a >= 0 && a < fw && b >= 0 && b < m.foot && at(a, b) !== 255;
          if (inside(i, j)) continue;
          if (inside(i - 1, j) || inside(i + 1, j) || inside(i, j - 1) || inside(i, j + 1)) rim.push([i, j]);
        }
        RIM.set(key, rim);
      }
      for (const [i, j] of rim) px(ox + i, oy + j, o.outline);
    }
    for (let j = 0; j < m.foot; j++) for (let i = 0; i < fw; i++) { const v = at(i, j); if (v !== 255) px(ox + i, oy + j, o.map ? o.map[v] : v); }
    // o.rim = [dx, tone]: light catching the edge that faces a light (silhouette pixels whose neighbour that way is empty)
    if (o.rim) for (let j = 0; j < m.foot; j++) for (let i = 0; i < fw; i++) {
      const n = i + o.rim[0];
      if (at(i, j) !== 255 && (n < 0 || n >= fw || at(n, j) === 255)) px(ox + i, oy + j, o.rim[1]);
    }
  }
  // icons and small art: rows of '.' (transparent) and '0'..'3'; o.k whole-number scale, o.map, o.flip
  function icon(rows, x, y, o = {}) {
    const k = o.k || 1; x = R(x); y = R(y);
    rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { const ch = o.flip ? r[r.length - 1 - i] : r[i]; if (ch !== '.') { const v = o.map ? o.map[+ch] : +ch; for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) px(x + i * k + b, y + j * k + a, v); } } });
  }

  // ───────── light: a field in tone steps, applied through the ordered dither
  function ambient(v) { L.fill(v); }
  // a round light: s tone steps at the centre falling to 0 at radius r (o.pow shapes the falloff)
  function lamp(x, y, r, s, o = {}) {
    const p = o.pow || 1, xa = Math.max(0, Math.floor(x - r)), xb = Math.min(GW - 1, Math.ceil(x + r)), ya = Math.max(0, Math.floor(y - r * (o.sy || 1))), yb = Math.min(GH - 1, Math.ceil(y + r * (o.sy || 1)));
    for (let j = ya; j <= yb; j++) for (let i = xa; i <= xb; i++) {
      const d = Math.hypot(i - x, (j - y) / (o.sy || 1)) / r; if (d < 1) L[j * GW + i] += s * Math.pow(1 - d * d, p);
    }
  }
  // a light shaft: a band through (x, y) along direction (dx, dy), half-width w, s tone steps at its centre line;
  // from = how far along the band it starts (pixels before (x, y) stay dark)
  function shaft(x, y, dx, dy, w, s, from = -1e9) {
    const l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l;
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      const rx = i - x, ry = j - y, along = rx * ux + ry * uy, d = Math.abs(rx * uy - ry * ux);
      if (d < w && along > from) L[j * GW + i] += s * (1 - d / w);
    }
  }
  function lightRect(x, y, w, h, s) {
    for (let j = Math.max(0, R(y)); j < Math.min(GH, R(y + h)); j++) for (let i = Math.max(0, R(x)); i < Math.min(GW, R(x + w)); i++) L[j * GW + i] += s;
  }
  // apply the light field to the tones drawn so far (UI drawn afterwards stays unlit)
  function shade() {
    for (let i = 0; i < N; i++) { const l = L[i]; if (l !== 0) t[i] = ci(t[i] + Math.floor(l + TH[i]), 0, 3); }
    L.fill(0);
  }
  // dissolve: keep the snapshot a where the dither threshold is above k (k 0 -> all a, 1 -> all of the new frame)
  function dissolve(a, k) { for (let i = 0; i < N; i++) if (TH[i] >= k) t[i] = a[i]; }
  // push: the snapshot a slides out to the left by p pixels while the new frame comes in from the right
  function push(a, p) {
    p = ci(R(p), 0, GW); const b = t.slice();
    for (let y = 0; y < GH; y++) { const r = y * GW; for (let x = 0; x < GW; x++) t[r + x] = x < GW - p ? a[r + x + p] : b[r + x - (GW - p)]; }
  }
  // iris: outside the circle shows a (a snapshot or a tone)
  function iris(cx, cy, r, a) {
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) { const i = y * GW + x; t[i] = typeof a === 'number' ? a : a[i]; }
    }
  }

  // ───────── the 5x7 bitmap font (rows top to bottom, bit 4 = left column), uppercase, tabular digits
  const F = {
    A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14], D: [28, 18, 17, 17, 17, 18, 28],
    E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16], G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17],
    I: [14, 4, 4, 4, 4, 4, 14], J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
    M: [17, 27, 21, 21, 17, 17, 17], N: [17, 17, 25, 21, 19, 17, 17], O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16],
    Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17], S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4],
    U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17],
    Y: [17, 17, 17, 10, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
    0: [14, 17, 19, 21, 25, 17, 14], 1: [4, 12, 4, 4, 4, 4, 14], 2: [14, 17, 1, 2, 4, 8, 31], 3: [31, 2, 4, 2, 1, 17, 14],
    4: [2, 6, 10, 18, 31, 2, 2], 5: [31, 16, 30, 1, 1, 17, 14], 6: [6, 8, 16, 30, 17, 17, 14], 7: [31, 1, 2, 4, 8, 8, 8],
    8: [14, 17, 17, 14, 17, 17, 14], 9: [14, 17, 17, 15, 1, 2, 12],
    ' ': [0, 0, 0, 0, 0, 0, 0], '.': [0, 0, 0, 0, 0, 12, 12], ',': [0, 0, 0, 0, 12, 4, 8], ':': [0, 12, 12, 0, 12, 12, 0],
    '!': [4, 4, 4, 4, 4, 0, 4], '?': [14, 17, 1, 2, 4, 0, 4], '-': [0, 0, 0, 31, 0, 0, 0], '+': [0, 4, 4, 31, 4, 4, 0],
    '/': [0, 1, 2, 4, 8, 16, 0], '%': [24, 25, 2, 4, 8, 19, 3], "'": [4, 4, 8, 0, 0, 0, 0], '>': [8, 4, 2, 1, 2, 4, 8],
    '<': [2, 4, 8, 16, 8, 4, 2], '#': [10, 10, 31, 10, 31, 10, 10], '(': [2, 4, 8, 8, 8, 4, 2], ')': [8, 4, 2, 2, 2, 4, 8],
    '=': [0, 0, 31, 0, 31, 0, 0], '·': [0, 0, 0, 4, 0, 0, 0], '▶': [8, 12, 14, 15, 14, 12, 8], '▲': [0, 0, 4, 14, 31, 0, 0],
    '▼': [0, 0, 31, 14, 4, 0, 0], '&': [12, 18, 20, 8, 21, 18, 13],
  };
  const textW = (s, k = 1) => (String(s).length ? (String(s).length * 6 - 1) * k : 0);
  // n = characters shown (a typewriter); o.bold doubles every column
  function text(s, x, y, v, k = 1, n = Infinity, o = {}) {
    s = String(s).toUpperCase(); x = R(x); y = R(y);
    for (let i = 0; i < Math.min(n, s.length); i++) {
      const r = F[s[i]] || F['?'];
      for (let j = 0; j < 7; j++) for (let b = 0; b < 5; b++) if (r[j] & (16 >> b)) {
        rect(x + (i * 6 + b) * k, y + j * k, k + (o.bold ? 1 : 0), k, v);
      }
    }
  }
  const textC = (s, cx, y, v, k = 1, n, o) => text(s, cx - Math.floor(textW(s, k) / 2), y, v, k, n, o);
  const textR = (s, rx, y, v, k = 1, n, o) => text(s, rx - textW(s, k), y, v, k, n, o);

  // ───────── UI pieces in the app's own look
  // a window: shadow border, paper inside, a one-pixel drop shadow, clipped corners; o.title adds a header strip
  function win(x, y, w, h, o = {}) {
    x = R(x); y = R(y); w = R(w); h = R(h);
    if (w < 3 || h < 3) return;
    rect(x + 2, y + h, w - 1, 1, o.shadow ?? 1); rect(x + w, y + 2, 1, h - 1, o.shadow ?? 1);
    rect(x + 1, y, w - 2, h, 0); rect(x, y + 1, w, h - 2, 0);
    rect(x + 1, y + 1, w - 2, h - 2, o.fill ?? 3);
    if (o.title && h > 12) { rect(x + 1, y + 1, w - 2, 10, 0); text(o.title, x + 4, y + 3, 3, 1, o.titleN); }
  }
  // a window opening in whole steps from a point: k 0..1
  function winOpen(x, y, w, h, k, from = [x + w / 2, y + h / 2], o = {}) {
    k = ci(k, 0, 1); if (k <= 0) return null;
    const e = 1 - Math.pow(1 - k, 2);
    const nx = from[0] + (x - from[0]) * e, ny = from[1] + (y - from[1]) * e, nw = Math.max(3, w * e), nh = Math.max(3, h * e);
    win(nx, ny, nw, nh, k >= 1 ? o : { ...o, title: null });
    return k >= 1;
  }
  const ICON = {
    sig: (n) => [0, 1, 2, 3].map(i => ({ x: i * 2, h: 2 + i, on: i < n })),
    pin: ['.000.', '00300', '03330', '00300', '.000.', '..0..', '..0..'],
    flag: ['00000', '03330', '03330', '00000', '0....', '0....', '0....'],
    up: ['..0..', '.000.', '0.0.0', '..0..', '..0..', '..0..', '..0..'],
    clock: ['.000.', '0.0.0', '0.0.0', '0.000', '0...0', '0...0', '.000.'],
    drop: ['..0..', '..0..', '.000.', '.0000', '00000', '00000', '.000.'],
    path: ['0....', '.0...', '..00.', '....0', '...0.', '.00..', '0....'],
    check: ['....0', '...00', '0.00.', '000..', '.0...'],
    warn: ['...0...', '..000..', '..030..', '.00300.', '.00000.', '0003000', '0000000'],
    sync: ['.000.', '0...0', '0.000', '0..0.', '000..', '.....', '.....'],
    tent: ['...0...', '..000..', '.00300.', '0003000'],
  };
  // the status bar: clock, a centre tag, signal bars, GPS, battery; o.y slides it (0 = in place, -9 = hidden)
  function hud(o) {
    const y = R(o.y ?? 0); if (y <= -9) return;
    rect(0, y, GW, 9, 0);
    text(o.time || '00:00', 3, y + 1, 3);
    if (o.tag && o.tagOn !== false) { const w = textW(o.tag) + 6, x = R(GW / 2 - w / 2) - 10; rect(x, y, w, 9, 3); text(o.tag, x + 3, y + 1, 0); }
    let x = GW - 72;
    for (const b of ICON.sig(o.sig ?? 4)) { if (b.on) rect(x + b.x, y + 7 - b.h, 1, b.h, 3); else px(x + b.x, y + 6, 2); }
    if ((o.sig ?? 4) === 0) { line(x - 1, y + 2, x + 7, y + 6, 3); }
    x += 12; text('GPS', x, y + 1, o.gps === false ? 1 : 3);
    x += 22; frame(x, y + 2, 11, 5, 3); rect(x + 11, y + 3, 1, 3, 3); rect(x + 2, y + 4, R(7 * ci((o.bat ?? 100) / 100, 0, 1)), 1, 3);
    textR((o.bat ?? 100) + '%', GW - 2, y + 1, 3);
  }
  // the brand mark: two peaks with a snowcap and the trail climbing them, 25 x 13 at k = 1
  const MARK = [
    '..........0..............',
    '.........000.............',
    '........00300............',
    '.......0033300...........',
    '......003333300....0.....',
    '.....0000000000...000....',
    '....000000000000.00300...',
    '...0000002000000000000...',
    '..000000020000000000000..',
    '.0000000002200000000000..',
    '00000000000022000000000..',
    '0000000000000022200000000',
    '0000000000000000000000000',
  ];
  function logo(cx, y, o = {}) {
    const k = o.k || 2, word = 'RIDGELINE', ww = textW(word, k);
    icon(MARK, R(cx - 25 * (o.markK || 1) / 2), y, { k: o.markK || 1, map: o.map });
    const ty = y + 13 * (o.markK || 1) + 4;
    text(word, R(cx - ww / 2), ty, o.ink ?? 0, k);
    const tw = textW('POCKET') + 8, tx = R(cx - tw / 2), py = ty + 7 * k + 4;
    rect(tx, py, tw, 11, o.ink ?? 0); text('POCKET', tx + 4, py + 2, o.paper ?? 3);
    return { x0: R(cx - ww / 2), y0: y, x1: R(cx + ww / 2), y1: py + 11 };
  }
  // stepped helpers: k over [a, b] in beats; a deterministic hash for flicker and stars
  const span = (b, a, c) => ci((b - a) / (c - a), 0, 1);
  const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  // the hiker: 8-frame walk at one frame per step; frame 2 is the standing pose
  const STAND = 2;
  const walkFrame = (T) => Math.floor(T * STEP + 1e-6) % 8;

  // ───────── present: the previous step ghosts under the current one, 8x, an LCD grid and the pixels' drop shadow
  const SCREENS = {};
  const api = { GW, GH, STEP, PAL, TH, clip, unclip, fill, px, get, rect, frame, dith, line, path, disc, snap, put, tones, layer, restore, size,
    sprite, icon, ambient, lamp, shaft, lightRect, shade, dissolve, push, iris, text, textC, textR, textW, win, winOpen, hud, logo,
    ICON, MARK, span, hash, walkFrame, STAND, ci, prev: null };
  function render(draw, T, env) { unclip(); L.fill(0); t.fill(3); draw(api, T, T / env.beatSec); unclip(); }
  // the outgoing scene's last step, rebuilt from its painter (for pushes, dissolves and irises)
  function prevFrame(env) {
    const P = REEL.plan, i = P ? P.scenes.findIndex(s => s.id === env.id) : -1, s = i > 0 ? P.scenes[i - 1] : null;
    const saved = t.slice(), savedL = L.slice();
    let out;
    if (!s || !SCREENS[s.id]) { out = new Uint8Array(N).fill(0); }
    else {
      const T = Math.floor((s.dur - 1e-4) * STEP) / STEP, e = { ...env, id: s.id, dur: s.dur, lt: T, prevOf: env.id };
      unclip(); L.fill(0); t.fill(3); SCREENS[s.id](api, T, e); unclip(); out = t.slice();
    }
    t.set(saved); L.set(savedL);
    return out;
  }
  api.prevFrame = prevFrame;
  api.prevId = (env) => { const P = REEL.plan, i = P ? P.scenes.findIndex(s => s.id === env.id) : -1; return i > 0 ? P.scenes[i - 1].id : null; };
  const small = makeBuf(GW, GH), shadowB = makeBuf(GW, GH), img = small.g.createImageData(GW, GH), simg = shadowB.g.createImageData(GW, GH);
  const prevT = new Uint8Array(N);
  let grid = null;
  const PREV_CACHE = { key: null, a: null };
  function present(ctx, env, draw) {
    const T = Math.floor(env.lt * STEP + 1e-6) / STEP;
    // the outgoing screen is the same for the whole transition: rebuild it once per scene and cut
    const key = (REEL.cut || '') + '|' + env.id;
    if (PREV_CACHE.key !== key) { PREV_CACHE.key = key; PREV_CACHE.a = null; }
    api.prev = () => (PREV_CACHE.a || (PREV_CACHE.a = prevFrame(env)));
    render(draw, Math.max(0, T - 1 / STEP), env); prevT.set(t);
    render(draw, T, env);
    const d = img.data, sd = simg.data;
    for (let i = 0, j = 0; i < N; i++, j += 4) {
      const c = RGB[t[i]], p = RGB[prevT[i]];
      d[j] = c[0] * 0.8 + p[0] * 0.2; d[j + 1] = c[1] * 0.8 + p[1] * 0.2; d[j + 2] = c[2] * 0.8 + p[2] * 0.2; d[j + 3] = 255;
      sd[j] = RGB[0][0]; sd[j + 1] = RGB[0][1]; sd[j + 2] = RGB[0][2]; sd[j + 3] = (3 - t[i]) * 22;
    }
    small.g.putImageData(img, 0, 0); shadowB.g.putImageData(simg, 0, 0);
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(small.c, 0, 0, GW * SC, GH * SC);
    ctx.globalAlpha = 0.5; ctx.drawImage(shadowB.c, 2, 2, GW * SC, GH * SC); ctx.globalAlpha = 1;   // pixels cast a shadow
    if (!grid) {
      const b = makeBuf(GW * SC, GH * SC), q = b.g;
      q.fillStyle = 'rgba(212,229,154,0.13)';
      for (let x = 0; x < GW * SC; x += SC) q.fillRect(x, 0, 1, GH * SC);
      for (let y = 0; y < GH * SC; y += SC) q.fillRect(0, y, GW * SC, 1);
      grid = b.c;
    }
    ctx.drawImage(grid, 0, 0);
    ctx.restore();
  }
  window.POCKET = Object.assign(api, { present, screens: SCREENS, SC });
})();
