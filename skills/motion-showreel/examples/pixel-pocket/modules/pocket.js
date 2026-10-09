// pocket: the Ridgeline Pocket screen, shared by every scene (a project module).
// The brand's rules are the renderer's rules (source/brand-notes.md): a 240 x 135 grid shown at exactly 8x (1920 x
// 1080), four greens and never a fifth (indices 0 shadow .. 3 paper), dithering instead of gradients, a 5x7 bitmap
// font drawn pixel by pixel, motion that steps at 9 fps (a 108-BPM beat is 5 steps), and an LCD that keeps a faint
// ghost of the previous step and shows its pixel grid. Scenes draw into the grid with POCKET.present(ctx, env, fn);
// fn(g, T, b) receives the stepped scene time T (s) and beat b. Pure in time: caches are keyed by inputs only.
(() => {
  const GW = 240, GH = 135, SCALE = 8, STEP = 9;
  const PAL = ['#1B2B1A', '#3E5E2E', '#8FAE3A', '#D4E59A'];
  const bufs = [makeBuf(GW, GH), makeBuf(GW, GH)];
  bufs.forEach(b => { b.g.imageSmoothingEnabled = false; });
  // ───────── primitives (whole pixels only)
  const col = (c) => PAL[c] || c;
  function cls(g, c) { g.fillStyle = col(c); g.fillRect(0, 0, GW, GH); }
  function rect(g, x, y, w, h, c) { g.fillStyle = col(c); g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function px(g, x, y, c) { g.fillStyle = col(c); g.fillRect(Math.round(x), Math.round(y), 1, 1); }
  function line(g, x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
    g.fillStyle = col(c);
    for (let i = 0; i < 2000; i++) { g.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  }
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  // level 0..1 of colour b over colour a with a 4x4 ordered dither (anchored to the grid, so it never swims)
  function dither(g, x, y, w, h, a, b, level, ox = 0) {
    x = Math.round(x); y = Math.round(y);
    rect(g, x, y, w, h, a);
    g.fillStyle = col(b); const th = level * 16;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (BAYER[(((y + j) & 3) << 2) | ((x + i + ox) & 3)] < th) g.fillRect(x + i, y + j, 1, 1);
  }
  // polygon fill by scanline (any simple polygon); pattern: optional fn(x, y) -> colour for dithered faces
  function poly(g, pts, c, pattern) {
    const ys = pts.map(p => p[1]), y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(GH - 1, Math.ceil(Math.max(...ys)));
    for (let y = y0; y <= y1; y++) {
      const xs = [], yc = y + 0.5;
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + (yc - ay) / (by - ay) * (bx - ax));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const xa = Math.max(0, Math.round(xs[k])), xb = Math.min(GW, Math.round(xs[k + 1]));
        if (!pattern) { g.fillStyle = col(c); g.fillRect(xa, y, xb - xa, 1); }
        else for (let x = xa; x < xb; x++) { g.fillStyle = col(pattern(x, y)); g.fillRect(x, y, 1, 1); }
      }
    }
  }
  const dith = (x, y, level) => BAYER[((y & 3) << 2) | (x & 3)] < level * 16;
  // ───────── 5x7 bitmap font (rows top to bottom, bit 4 = left column)
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
    '^': [0, 4, 14, 31, 0, 0, 0], '*': [0, 1, 2, 20, 8, 0, 0], '`': [0, 0, 0, 4, 0, 0, 0], '#': [10, 10, 31, 10, 31, 10, 10],
  };
  function textW(s, k = 1) { return s.length ? (s.length * 6 - 1) * k : 0; }
  // k: whole-number scale; n: characters shown (typewriter)
  function text(g, s, x, y, c, k = 1, n = Infinity) {
    s = String(s).toUpperCase(); g.fillStyle = col(c); x = Math.round(x); y = Math.round(y);
    for (let i = 0; i < Math.min(n, s.length); i++) {
      const r = F[s[i]] || F['?'];
      for (let j = 0; j < 7; j++) for (let b = 0; b < 5; b++) if (r[j] & (16 >> b)) g.fillRect(x + (i * 6 + b) * k, y + j * k, k, k);
    }
  }
  const textC = (g, s, cx, y, c, k = 1, n) => text(g, s, cx - Math.floor(textW(s, k) / 2), y, c, k, n);
  // a framed window like the handheld UIs: shadow border, paper inside, a 1-px drop shadow
  function box(g, x, y, w, h, o = {}) {
    rect(g, x + 1, y + 1, w, h, o.shadow ?? 1);
    rect(g, x, y, w, h, o.border ?? 0); rect(g, x + 1, y + 1, w - 2, h - 2, o.fill ?? 3);
  }
  // sprite rows: '.' transparent, '0'..'3' palette index
  function sprite(g, rows, x, y, flip = false) {
    x = Math.round(x); y = Math.round(y);
    rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { const ch = flip ? r[r.length - 1 - i] : r[i]; if (ch !== '.') { g.fillStyle = PAL[+ch]; g.fillRect(x + i, y + j, 1, 1); } } });
  }
  // ───────── the hiker: 8x12, four walking frames (two steps each at 9 fps)
  const TOP = ['...00...', '..0330..', '..0330..', '...00...', '.11000..', '.110000.', '.11000.0', '..1000.0', '...00..0'];
  const HIKER = [
    [...TOP, '..0..0.0', '.0....0.', '00....00'], [...TOP.slice(0, 8), '...00...', '...00..0', '...00...', '..0.00..'],
    [...TOP, '..0..0.0', '..0..0..', '.00..00.'], [...TOP.slice(0, 8), '...00...', '...00..0', '...00...', '..00.0..'],
  ];
  const hiker = (g, x, y, T, still = false) => sprite(g, HIKER[still ? 0 : Math.floor(T * STEP / 2) % 4], x, y);
  // ───────── present: two stepped renders (the previous step ghosts under the current one), 8x, LCD grid
  let grid = null;
  function present(ctx, env, draw) {
    const B = env.beatSec, T = Math.floor(env.lt * STEP + 1e-6) / STEP, Tp = T - 1 / STEP;
    draw(bufs[0].g, Tp, Tp / B); draw(bufs[1].g, T, T / B);
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bufs[0].c, 0, 0, GW * SCALE, GH * SCALE);
    ctx.globalAlpha = 0.8; ctx.drawImage(bufs[1].c, 0, 0, GW * SCALE, GH * SCALE); ctx.globalAlpha = 1;
    if (!grid) {
      const b = makeBuf(W, H), q = b.g; q.fillStyle = rgba(PAL[0], 0.09);
      for (let x = 0; x < W; x += SCALE) q.fillRect(x, 0, 1, H);
      for (let y = 0; y < H; y += SCALE) q.fillRect(0, y, W, 1);
      grid = b.c;
    }
    ctx.drawImage(grid, 0, 0);
    ctx.restore();
  }
  window.POCKET = { GW, GH, STEP, PAL, cls, rect, px, line, dither, dith, poly, text, textC, textW, box, sprite, hiker, present };
})();
