// jrpg: the Lanternforge screen kit, shared by every scene (a project module).
// Rules from source/RELEASE.md: a 384 x 216 canvas at exactly 5x, the 32-colour palette in ramps of four, classic
// blue windows with a white double border, the DotGothic16 face. Text is rendered once per string and thresholded so
// every glyph pixel is either on or off. The Mode-7 plane samples a generated overworld tilemap per scanline. Sprites
// step at 10 fps. Exposes window.LF. Pure in time; caches are keyed by inputs.
(() => {
  const GW = 384, GH = 216, SCALE = 5, STEP = 10;
  const P = { night: '#0D0B1E', deep: '#1B1A3A', navy: '#24306E', royal: '#2E4FB0', azure: '#4A86E8', sky: '#8EC5FF', ice: '#D7ECFF', white: '#FFFFFF',
    moss: '#1E4D2B', grass: '#2F7D3B', leaf: '#5DB547', lime: '#A6E05A', sand: '#E9D59A', gold: '#F2B33D', amber: '#E07B24', rust: '#A8461E',
    wine: '#5A1F3A', crimson: '#B8203C', rose: '#F0607A', pink: '#FFB3C1', plum: '#4B2A6B', violet: '#7A4FD6', lilac: '#B9A0FF', mist: '#E8E0FF',
    soil: '#4A3326', bark: '#7A5236', stone: '#6E7387', slate: '#9AA3B8', shadow: '#2A2A3A', ink: '#141420', bone: '#F4EBD9', ember: '#FF8A3D' };
  const col = (c) => P[c] || c;
  const buf = makeBuf(GW, GH); buf.g.imageSmoothingEnabled = false;
  const rect = (g, x, y, w, h, c) => { g.fillStyle = col(c); g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
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
  // vertical ramp in hard steps (16-bit skies and windows never blend)
  function bands(g, x, y, w, h, ramp) { const n = ramp.length; for (let i = 0; i < n; i++) rect(g, x, y + Math.floor(h * i / n), w, Math.ceil(h / n) + 1, ramp[i]); }
  // ───────── crisp pixel text (DotGothic16 at its 16-px design size, or 8 px), thresholded, cached
  const tcache = new Map();
  function glyphs(s, size, c, outline) {
    const key = s + '|' + size + '|' + c + '|' + (outline || '');
    let v = tcache.get(key);
    if (!v) {
      const m = makeBuf(8, 8); m.g.font = `${size}px "DotGothic16", monospace`;
      const w = Math.ceil(m.g.measureText(s).width) + 4, h = size + 6;
      const b = makeBuf(w, h), g = b.g;
      g.font = `${size}px "DotGothic16", monospace`; g.textBaseline = 'top'; g.fillStyle = '#000'; g.fillText(s, 2, 2);
      const id = g.getImageData(0, 0, w, h), d = id.data, [r, gg, bb] = parseColor(col(c)), on = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) on[i] = d[i * 4 + 3] > 110 ? 1 : 0;
      const out = g.createImageData(w, h), o = out.data;
      if (outline) { const [orr, og, ob] = parseColor(col(outline)); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (on[y * w + x]) continue; let n = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < w && Y < h && on[Y * w + X]) n++; } if (n) { const k = (y * w + x) * 4; o[k] = orr; o[k + 1] = og; o[k + 2] = ob; o[k + 3] = 255; } } }
      for (let i = 0; i < w * h; i++) if (on[i]) { o[i * 4] = r; o[i * 4 + 1] = gg; o[i * 4 + 2] = bb; o[i * 4 + 3] = 255; }
      g.clearRect(0, 0, w, h); g.putImageData(out, 0, 0);
      v = { c: b.c, w: w - 4 }; tcache.set(key, v);
    }
    return v;
  }
  function text(g, s, x, y, c = 'white', o = {}) {
    const n = o.n ?? Infinity, str = String(s).slice(0, n === Infinity ? undefined : Math.max(0, Math.floor(n)));
    if (!str) return 0;
    const v = glyphs(str, o.size || 16, c, o.outline), k = o.k || 1, full = glyphs(String(s), o.size || 16, c, o.outline);
    const x0 = o.align === 'center' ? x - Math.floor(full.w * k / 2) : o.align === 'right' ? x - full.w * k : x;
    g.drawImage(v.c, Math.round(x0) - 2 * k, Math.round(y) - 2 * k, v.c.width * k, v.c.height * k);
    return v.w * k;
  }
  // ───────── the classic window: navy-to-royal steps, white double border, rounded corners
  function win(g, x, y, w, h) {
    x = Math.round(x); y = Math.round(y);
    bands(g, x + 2, y + 2, w - 4, h - 4, ['royal', 'royal', 'navy', 'navy', 'deep']);
    rect(g, x + 1, y, w - 2, 1, 'white'); rect(g, x + 1, y + h - 1, w - 2, 1, 'white'); rect(g, x, y + 1, 1, h - 2, 'white'); rect(g, x + w - 1, y + 1, 1, h - 2, 'white');
    rect(g, x + 2, y + 2, w - 4, 1, 'slate'); rect(g, x + 2, y + h - 3, w - 4, 1, 'slate'); rect(g, x + 2, y + 2, 1, h - 4, 'slate'); rect(g, x + w - 3, y + 2, 1, h - 4, 'slate');
  }
  function cursor(g, x, y, T) { const dx = Math.floor(T * 4) % 2; poly(g, [[x + dx, y], [x + dx + 6, y + 4], [x + dx, y + 8]], 'white'); }
  // ───────── Mode 7: a generated overworld (grass, forests, rivers, roads, towns) sampled per scanline
  let tex = null;
  function overworld() {
    if (tex) return tex;
    const N = 256, d = new Uint8ClampedArray(N * N * 4), put = (i, c) => { const [r, g, b] = parseColor(P[c]); d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = 255; };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x, h = Math.sin(x * 0.05) * Math.cos(y * 0.043) + 0.5 * Math.sin((x + y) * 0.09) + 0.25 * Math.sin(x * 0.21 + y * 0.17);
      let c = h > 0.95 ? 'stone' : h > 0.6 ? 'moss' : h > -0.6 ? ((x >> 3) + (y >> 3)) % 2 ? 'grass' : 'leaf' : h > -0.85 ? 'sand' : 'royal';
      if (Math.abs(((x + Math.sin(y * 0.05) * 18) % 64) - 32) < 1.5) c = 'sand';                    // roads
      if (Math.abs(((y + Math.sin(x * 0.04) * 20) % 96) - 48) < 2.5 && h < 0.6) c = 'azure';          // rivers
      if ((x % 64 > 26 && x % 64 < 38) && (y % 64 > 26 && y % 64 < 38)) c = (x + y) % 3 ? 'rust' : 'bone';  // towns
      put(i, c);
    }
    tex = { N, d };
    return tex;
  }
  const m7img = makeBuf(GW, GH).g.createImageData(GW, GH);
  function mode7(g, o) {
    const { N, d } = overworld(), hz = o.horizon, out = m7img.data, ca = Math.cos(o.angle), sa = Math.sin(o.angle);
    out.fill(0);
    for (let y = hz + 1; y < GH; y++) {
      const z = o.height / (y - hz), fog = Math.min(1, (y - hz) / 40);
      for (let x = 0; x < GW; x++) {
        const sx = (x - GW / 2) * z * 0.02, sz = z;
        const wx = o.x + sx * ca - sz * sa, wy = o.y + sx * sa + sz * ca;
        const tx = ((Math.floor(wx) % N) + N) % N, ty = ((Math.floor(wy) % N) + N) % N, si = (ty * N + tx) * 4, k = (y * GW + x) * 4;
        // distance haze toward the horizon in two hard steps
        const mixk = fog < 0.35 ? 0.5 : fog < 0.6 ? 0.25 : 0;
        out[k] = d[si] + (142 - d[si]) * mixk; out[k + 1] = d[si + 1] + (197 - d[si + 1]) * mixk; out[k + 2] = d[si + 2] + (255 - d[si + 2]) * mixk; out[k + 3] = 255;
      }
    }
    const tmp = makeBuf.m7 || (makeBuf.m7 = makeBuf(GW, GH));
    tmp.g.putImageData(m7img, 0, 0); g.drawImage(tmp.c, 0, 0);
  }
  // ───────── characters, built from whole-pixel parts; frame 0/1 bob
  function hero(g, x, y, f = 0, kind = 'hero', face = 1) {
    x = Math.round(x); y = Math.round(y) - (f % 2);
    const C = { hero: ['crimson', 'gold', 'bark'], mage: ['violet', 'lilac', 'plum'], knight: ['slate', 'azure', 'stone'] }[kind];
    rect(g, x + 4, y + 14, 3, 4, 'ink'); rect(g, x + 9, y + 14, 3, 4, 'ink');            // legs
    rect(g, x + 3, y + 7, 10, 8, 'ink'); rect(g, x + 4, y + 8, 8, 6, C[0]);               // body
    rect(g, x + 4, y + 1, 8, 7, 'ink'); rect(g, x + 5, y + 2, 6, 5, 'pink');              // head
    rect(g, x + 4, y, 8, 3, C[2]);                                                         // hair / hood
    rect(g, x + 6 + face, y + 4, 1, 1, 'ink');                                             // eye
    if (kind === 'hero') { rect(g, x + 13, y + 3 - (f % 2), 1, 11, 'ice'); rect(g, x + 12, y + 11, 3, 1, 'gold'); }   // sword
    if (kind === 'mage') { rect(g, x + 1, y + 2, 1, 16, 'bark'); rect(g, x, y + 1, 3, 3, f % 2 ? 'gold' : 'ember'); } // staff
    if (kind === 'knight') { rect(g, x + 12, y + 7, 4, 7, 'azure'); rect(g, x + 13, y + 8, 2, 5, 'ice'); }           // shield
    rect(g, x + 5, y + 8, 6, 1, C[1]);
  }
  function present(ctx, env, draw) {
    const T = Math.floor(env.lt * STEP + 1e-6) / STEP;
    draw(buf.g, T, T / env.beatSec);
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(buf.c, 0, 0, GW * SCALE, GH * SCALE); ctx.restore();
  }
  window.LF = { GW, GH, STEP, P, col, rect, poly, bands, text, win, cursor, mode7, hero, present };
})();
