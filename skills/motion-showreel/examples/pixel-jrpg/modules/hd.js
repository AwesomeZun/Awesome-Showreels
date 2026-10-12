// hd: the Lanternforge HD-2D kit (a project module). Pixel art stays pixel art: every layer and sprite from
// assets/px/ (gen-src/pixelize.py: one shared 40-colour palette, hard alpha) is pre-scaled 5x with nearest
// neighbour and cached, so its pixels stay square and crisp; the camera then moves over those layers smoothly, the way
// a 3D camera moves over pixel sprites. On top: a light map (ambient + coloured lights, multiplied), bloom (additive
// glows), light shafts, dust that is visible only inside the light, depth-of-field blur per layer, a teal-and-amber
// grade and a vignette. Text is pixel text: the pixel faces drawn at screen size and thresholded. Exposes window.HD.
(() => {
  const S = 5;                                              // screen pixels per art pixel
  const cache = new Map();
  const img = (name) => IMG[name] || ASSET('px/' + name + '.png');
  // a layer pre-scaled to screen size (nearest), optionally blurred (cached per blur step)
  function scaled(name, blur = 0) {
    const key = name + '|' + blur;
    let c = cache.get(key);
    if (!c) {
      const im = img(name); if (!im) return null;
      const b = makeBuf(im.width * S + blur * 4, im.height * S + blur * 4), g = b.g;
      g.imageSmoothingEnabled = false;
      if (blur) g.filter = `blur(${blur}px)`;
      g.drawImage(im, blur * 2, blur * 2, im.width * S, im.height * S);
      c = { c: b.c, pad: blur * 2, w: im.width * S, h: im.height * S }; cache.set(key, c);
    }
    return c;
  }
  // draw a layer: x, y = top-left in screen px; o.blur in px (rounded to steps of 2); o.a alpha
  function layer(ctx, name, x, y, o = {}) {
    const L = scaled(name, Math.round((o.blur || 0) / 2) * 2); if (!L) return;
    ctx.save(); ctx.globalAlpha *= o.a ?? 1; if (o.op) ctx.globalCompositeOperation = o.op;
    ctx.drawImage(L.c, x - L.pad, y - L.pad); ctx.restore();
  }
  const size = (name) => { const im = img(name); return im ? [im.width * S, im.height * S] : [0, 0]; };
  // a frame of a sprite sheet (meta from assets/px/meta.json), feet at (x, y) in screen px
  let META = null;
  const meta = () => (META || (META = ASSET('px/meta.json')));
  function sprite(ctx, sheet, frame, x, y, o = {}) {
    const m = meta().sheets[sheet], [f0, f1] = m.frames[((frame % m.frames.length) + m.frames.length) % m.frames.length];
    const L = scaled(sheet, 0); if (!L) return;
    const w = (f1 - f0) * S, h = m.size[1] * S;
    ctx.save(); ctx.globalAlpha *= o.a ?? 1;
    if (o.flip) { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.translate(-x, 0); }
    if (o.filter) ctx.filter = o.filter;
    const lift = m.foot ? (m.size[1] - m.foot) * S : 0;   // the sheet's empty rows under the feet
    ctx.drawImage(L.c, f0 * S, 0, w, h, Math.round(x - w / 2), Math.round(y - h + lift), w, h);
    ctx.restore();
    return [w, h];
  }
  // ───────── light: a half-resolution light map multiplied over the frame, then additive glows
  const LM = makeBuf(W / 2, H / 2);
  function lightmap(ctx, ambient, lights) {
    const g = LM.g; g.globalCompositeOperation = 'source-over'; g.fillStyle = ambient; g.fillRect(0, 0, W / 2, H / 2);
    g.globalCompositeOperation = 'lighter';
    for (const L of lights) {
      const r = L.r / 2; g.fillStyle = radial(g, L.x / 2, L.y / 2, 0, r, [[0, rgba(L.color, L.i ?? 1)], [0.35, rgba(L.color, (L.i ?? 1) * 0.55)], [1, rgba(L.color, 0)]]);
      g.fillRect(L.x / 2 - r, L.y / 2 - r, r * 2, r * 2);
    }
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.imageSmoothingEnabled = true; ctx.drawImage(LM.c, 0, 0, W, H); ctx.restore();
  }
  function glow(ctx, x, y, r, color, a = 1) {
    if (a <= 0.003) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = radial(ctx, x, y, 0, r, [[0, rgba(color, 0.55 * a)], [0.2, rgba(color, 0.25 * a)], [1, rgba(color, 0)]]);
    ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
  }
  // a light shaft: a soft quad from (x0, y0) of width w0 fanning to width w1 at (x1, y1)
  function shaft(ctx, x0, y0, w0, x1, y1, w1, color, a = 1) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.filter = 'blur(10px)';
    ctx.fillStyle = linear(ctx, x0, y0, x1, y1, [[0, rgba(color, 0.32 * a)], [1, rgba(color, 0)]]);
    ctx.beginPath(); ctx.moveTo(x0 - w0 / 2, y0); ctx.lineTo(x0 + w0 / 2, y0); ctx.lineTo(x1 + w1 / 2, y1); ctx.lineTo(x1 - w1 / 2, y1); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // dust: art-pixel motes drifting; lit only near the given lights
  function dust(ctx, t, lights, o = {}) {
    const n = o.n ?? 140; ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const sx = hash(i * 3.17) * W, sy = hash(i * 7.31) * H, sp = 6 + hash(i * 1.9) * 14;
      const x = (sx + Math.sin(t * 0.3 + i) * 30 + t * sp) % W, y = (sy - t * sp * 0.6 + H * 4) % H;
      let lit = 0; for (const L of lights) { const d = Math.hypot(x - L.x, y - L.y) / L.r; lit = Math.max(lit, (1 - d) * (L.i ?? 1)); }
      if (lit <= 0.02) continue;
      ctx.fillStyle = rgba(o.color || '#FFE2A8', Math.min(1, lit * 1.2) * (0.5 + 0.5 * Math.sin(t * 2 + i)));
      ctx.fillRect(Math.round(x / S) * S, Math.round(y / S) * S, S, S);
    }
    ctx.restore();
  }
  // final grade: lift shadows toward teal, warm the lights (soft-light), then a vignette
  function grade(ctx, o = {}) {
    ctx.save(); ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = linear(ctx, 0, 0, 0, H, [[0, rgba(o.top || '#2A6F8F', o.a ?? 0.45)], [1, rgba(o.bottom || '#E0902F', o.a ?? 0.45)]]); ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = radial(ctx, W / 2, H / 2, H * 0.35, W * 0.75, [[0, 'rgba(255,255,255,1)'], [1, rgba('#1B1530', o.vig ?? 0.85)]]); ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  // ───────── pixel text, cached per string and style. The face is drawn at screen size and thresholded there: these
  // faces' own blocks are not one art pixel (DotGothic16 draws on a 74/1000 em grid that its advances leave, Pixelify
  // Sans has no exact grid), so drawn at art size and scaled up their letters break. DotGothic16's size is nudged
  // until one of its dots is a whole number of screen pixels. The outline, the shadow, the padding and the gold bands
  // stay in art pixels (K screen pixels each).
  const GRID = { DotGothic16: 74 / 1000 };
  const tc = new Map();
  // grow a mask by r pixels in every direction (a square, like the eight neighbours of one art pixel): rows, then columns
  function dilate(on, w, h, r) {
    const a = new Uint8Array(w * h), out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) { let last = -1e9; for (let x = 0; x < w; x++) { if (on[y * w + x]) last = x; if (x - last <= r) a[y * w + x] = 1; }
      last = 1e9; for (let x = w - 1; x >= 0; x--) { if (on[y * w + x]) last = x; if (last - x <= r) a[y * w + x] = 1; } }
    for (let x = 0; x < w; x++) { let last = -1e9; for (let y = 0; y < h; y++) { if (a[y * w + x]) last = y; if (y - last <= r) out[y * w + x] = 1; }
      last = 1e9; for (let y = h - 1; y >= 0; y--) { if (a[y * w + x]) last = y; if (last - y <= r) out[y * w + x] = 1; } }
    return out;
  }
  function ptext(ctx, s, x, y, o = {}) {
    const fam = o.fam || 'Pixelify Sans', size = o.size || 12, wt = o.weight || 600, K = S * (o.k || 1), key = [s, fam, size, wt, o.fill, o.outline, o.shadow, o.gold, K].join('|');
    let v = tc.get(key);
    if (!v) {
      const P = 3 * K, gr = GRID[fam], fs = gr ? Math.round(size * K * gr) / gr : size * K, font = `${wt} ${fs}px "${fam}"`;
      const m = makeBuf(4, 4); m.g.font = font; const tw = Math.ceil(m.g.measureText(s).width), w = tw + 2 * P, h = Math.ceil(size * 1.5 * K) + 2 * P;
      const b = makeBuf(w, h), g = b.g; g.font = font; g.textBaseline = 'top'; g.fillStyle = '#000'; g.fillText(s, P, P);
      const id = g.getImageData(0, 0, w, h), d = id.data, on = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) on[i] = d[i * 4 + 3] > 127 ? 1 : 0;
      const near = o.outline ? dilate(on, w, h, K) : null;
      const out = g.createImageData(w, h), od = out.data, put = (i, c) => { const [r, gg, bb] = parseColor(c); od[i * 4] = r; od[i * 4 + 1] = gg; od[i * 4 + 2] = bb; od[i * 4 + 3] = 255; };
      let top = h, bot = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (on[y * w + x]) { top = Math.min(top, y); bot = Math.max(bot, y); }
      const rows = Math.max(1, Math.floor((bot - top) / K));
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (on[i]) {
          let c = o.fill || '#FFFFFF';
          if (o.gold) { const u = Math.floor((y - top) / K) / rows; c = u < 0.18 ? '#FFF3B0' : u < 0.5 ? '#F7C948' : u < 0.8 ? '#E08A1E' : '#A8461E'; }
          put(i, c);
        } else if (o.outline) {
          if (near[i]) put(i, o.outline);
          else if (o.shadow && y >= 2 * K && x >= K && on[(y - 2 * K) * w + (x - K)]) put(i, o.shadow);
        }
      }
      g.clearRect(0, 0, w, h); g.putImageData(out, 0, 0);
      v = { c: b.c, w: tw, h, K }; tc.set(key, v);
    }
    const x0 = o.align === 'center' ? x - v.w / 2 : o.align === 'right' ? x - v.w : x;
    ctx.save(); ctx.globalAlpha *= o.a ?? 1;
    if (o.reveal !== undefined) { ctx.beginPath(); ctx.rect(x0 - 3 * v.K, y - 3 * v.K, (v.w + 6 * v.K) * clamp(o.reveal), v.h); ctx.clip(); }
    ctx.drawImage(v.c, Math.round(x0 - 3 * v.K), Math.round(y - 3 * v.K)); ctx.restore();
    return v.w;
  }
  // the classic window, at art scale: stepped navy-to-royal fill, white double border, rounded corners
  function win(ctx, x, y, w, h, a = 1) {
    ctx.save(); ctx.globalAlpha *= a;
    const band = ['#2E4FB0', '#2A47A0', '#243D8C', '#1E3478', '#1A2C66'];
    for (let i = 0; i < band.length; i++) { ctx.fillStyle = band[i]; ctx.fillRect(x + S, y + S + Math.floor((h - 2 * S) * i / band.length / S) * S, w - 2 * S, Math.ceil((h - 2 * S) / band.length / S + 1) * S); }
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x + S, y, w - 2 * S, S); ctx.fillRect(x + S, y + h - S, w - 2 * S, S); ctx.fillRect(x, y + S, S, h - 2 * S); ctx.fillRect(x + w - S, y + S, S, h - 2 * S);
    ctx.fillStyle = '#9AA3B8'; ctx.fillRect(x + 2 * S, y + 2 * S, w - 4 * S, S); ctx.fillRect(x + 2 * S, y + 2 * S, S, h - 4 * S);
    ctx.restore();
  }
  window.HD = { S, img, scaled, layer, size, sprite, meta, lightmap, glow, shaft, dust, grade, ptext, win };
})();
