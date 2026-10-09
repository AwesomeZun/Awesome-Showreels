// bean: the Pebble & Bean diorama kit, shared by every scene (a project module).
// House style (source/README.md, source/palette.txt): 16 pastels and never black, an isometric 2:1 diorama, pixel
// signage with a one-pixel caramel shadow. The grid is 320 x 180 shown at exactly 6x; anything can be drawn at a
// whole-number scale S (S = 2 for the close-up), so pixels stay square. Motion steps at 8 fps. Dusk swaps the whole
// palette to its evening ramp in four steps; the glow colour never darkens (windows, lamps). Pure in time.
(() => {
  const GW = 320, GH = 180, SCALE = 6, STEP = 8;
  const DAY = { cream: '#FFF4E0', latte: '#E8C9A0', caramel: '#C98F5A', espresso: '#5B3A29', ink: '#3B2F3F', sage: '#A8C3A0', mint: '#CFE7D1',
    sky: '#BFD9F0', dusk: '#7A86B8', plum: '#8E6A9E', peach: '#F6B59B', rose: '#E88A8A', brick: '#B5654A', sand: '#F7E3C3', leaf: '#6E9A6A', glow: '#FFE8A3' };
  const NIGHT = '#4B4A7A';
  let duskLevel = 0;                                     // 0..3, set per frame by the scene
  const ramp = {};
  function col(name) {
    if (name[0] === '#') return name;
    if (name === 'glow' || duskLevel === 0) return DAY[name];
    const k = name + duskLevel;
    return ramp[k] || (ramp[k] = toHex(mix(DAY[name], NIGHT, duskLevel * 0.17 + (name === 'sky' ? duskLevel * 0.12 : 0))));
  }
  const buf = makeBuf(GW, GH); buf.g.imageSmoothingEnabled = false;
  function rect(g, x, y, w, h, c) { g.fillStyle = col(c); g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function poly(g, pts, c) {
    const ys = pts.map(p => p[1]), y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(GH - 1, Math.ceil(Math.max(...ys)));
    g.fillStyle = col(c);
    for (let y = y0; y <= y1; y++) {
      const xs = [], yc = y + 0.5;
      for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + (yc - ay) / (by - ay) * (bx - ax)); }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) g.fillRect(Math.round(xs[k]), y, Math.round(xs[k + 1]) - Math.round(xs[k]), 1);
    }
  }
  // ───────── isometric: a tile is 16 x 8 at S = 1; z in pixels (8 per storey unit)
  function iso(cam, gx, gy, gz = 0) { const S = cam.S; return [cam.ox + (gx - gy) * 8 * S, cam.oy + (gx + gy) * 4 * S - gz * S]; }
  function top(g, cam, gx, gy, gz, c, w = 1, d = 1) {
    const a = iso(cam, gx, gy, gz), b = iso(cam, gx + w, gy, gz), e = iso(cam, gx + w, gy + d, gz), f = iso(cam, gx, gy + d, gz);
    poly(g, [a, b, e, f], c);
  }
  // a box from (gx, gy, gz) of w x d tiles and h pixels tall: top, left face (front-left) and right face (front-right)
  function box(g, cam, gx, gy, gz, w, d, h, cTop, cLeft, cRight) {
    const p = (x, y, z) => iso(cam, x, y, z);
    poly(g, [p(gx, gy + d, gz + h), p(gx + w, gy + d, gz + h), p(gx + w, gy + d, gz), p(gx, gy + d, gz)], cLeft);
    poly(g, [p(gx + w, gy, gz + h), p(gx + w, gy + d, gz + h), p(gx + w, gy + d, gz), p(gx + w, gy, gz)], cRight);
    top(g, cam, gx, gy, gz + h, cTop, w, d);
  }
  // sprites: rows of single letters mapped to colour names; drawn at scale S
  function sprite(g, rows, map, x, y, S = 1, flip = false) {
    rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { const ch = flip ? r[r.length - 1 - i] : r[i]; if (ch !== '.') { g.fillStyle = col(map[ch]); g.fillRect(Math.round(x) + i * S, Math.round(y) + j * S, S, S); } } });
  }
  // people: two-frame walk / idle, 6 x 12
  const PERSON = [['.hh...', 'hffh..', '.ff...', 'ssss..', 'sssss.', 'ssss..', '.ss...', '.pp...', '.pp...', '.p.p..', 'p...p.', 'k...k.'],
                  ['.hh...', 'hffh..', '.ff...', 'ssss..', 'sssss.', 'ssss..', '.ss...', '.pp...', '.pp...', '.pp...', '.pp...', '.kk...']];
  function person(g, x, y, frame, shirt, hair = 'espresso', S = 1, flip = false) {
    sprite(g, PERSON[frame % 2], { h: hair, f: 'peach', s: shirt, p: 'ink', k: 'espresso' }, x, y, S, flip);
  }
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
  function text(g, s, x, y, c, k = 1, n = Infinity, shadow = false) {
    s = String(s).toUpperCase(); x = Math.round(x); y = Math.round(y);
    const draw = (ox, oy, cc) => { g.fillStyle = col(cc); for (let i = 0; i < Math.min(n, s.length); i++) { const r = F[s[i]] || F['?']; for (let j = 0; j < 7; j++) for (let b = 0; b < 5; b++) if (r[j] & (16 >> b)) g.fillRect(ox + (i * 6 + b) * k, oy + j * k, k, k); } };
    if (shadow) draw(x + k, y + k, 'caramel');
    draw(x, y, c);
  }
  const textW = (s, k = 1) => (String(s).length * 6 - 1) * k;
  const textC = (g, s, cx, y, c, k = 1, n, shadow) => text(g, s, cx - Math.floor(textW(s, k) / 2), y, c, k, n, shadow);
  // steam: single pixels rising and swaying, pure in T
  function steam(g, x, y, T, n = 6, S = 1) {
    for (let i = 0; i < n; i++) { const a = ((T * 0.9 + i / n) % 1), px = x + Math.round(Math.sin(a * 6 + i) * 2) * S, py = y - Math.round(a * 14) * S; if (a < 0.85) rect(g, px, py, S, S, a < 0.5 ? 'cream' : 'sand'); }
  }
  function present(ctx, env, draw) {
    const T = Math.floor(env.lt * STEP + 1e-6) / STEP;
    duskLevel = 0;
    draw(buf.g, T, T / env.beatSec);
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(buf.c, 0, 0, GW * SCALE, GH * SCALE); ctx.restore();
  }
  window.BEAN = { GW, GH, STEP, col, rect, poly, iso, top, box, sprite, person, text, textC, textW, steam, present, setDusk: (d) => { duskLevel = Math.max(0, Math.min(3, Math.round(d))); } };
})();
