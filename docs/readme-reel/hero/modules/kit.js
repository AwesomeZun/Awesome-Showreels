// kit: the shared look of the README reel (a project module, P/modules/*.js). Every scene is a seamless 3-bar loop
// built around one large moving element: the stage, the index label and the brand mark below are drawn the same way in
// each one, so the six README previews read as one series. The README's bold line above each preview carries the
// headline, so the frames hold no headline and no provenance footer; everything meant to be read is at least 32 px on
// the 1920-px canvas (12 CSS px at the README's 720 px). Pure functions of their arguments; nothing here assigns SCENES.
//
//   KIT.loop(env)                      loop time u in [0, LOOP) and the beat/bar helpers of that loop
//   KIT.stage(ctx, P)                  the static stage (crust, two soft glows, a fine dot grid), cached
//   KIT.header(ctx, P, o)              index label (o.index, o.label) top left, brand mark top right (o.light: on a light stage)
//   KIT.panel(ctx, x, y, w, h, o)      glass panel; KIT.label / KIT.tag / KIT.arrow / KIT.pill / KIT.keycap
//   KIT.image(ctx, name, x, y, w, h, o) an asset image, cover-fit and clipped to a rounded rect
(() => {
  const LOOP_BEATS = 12;                                     // 3 bars of 4/4: 6.0 s at the reel's 120 BPM
  const M = () => (STYLE.layout && STYLE.layout.margin) || 96;
  const BRIGHT = () => mix(C.ink, '#FFFFFF', 0.45);          // display white: ink lifted for the headline
  const cache = {};

  function loop(env) {
    const beat = env.beatSec, L = LOOP_BEATS * beat;
    const u = ((env.lt % L) + L) % L;                        // transitions draw neighbours at lt < 0 or > dur
    return { u, L, beat, b: u / beat, at: (beats) => u - beats * beat, bar: 4 * beat };
  }

  // ───────── stage ─────────
  function stage(ctx, P) {
    const key = 'stage' + P.bg;
    if (!cache[key]) {
      const b = makeBuf(W, H), g = b.g;
      g.fillStyle = P.bg; g.fillRect(0, 0, W, H);
      g.fillStyle = radial(g, W * 0.12, H * 0.02, 0, W * 0.62, [[0, rgba(P.accent, 0.13)], [0.55, rgba(P.accent, 0.035)], [1, rgba(P.accent, 0)]]);
      g.fillRect(0, 0, W, H);
      g.fillStyle = radial(g, W * 0.96, H * 1.02, 0, W * 0.55, [[0, rgba(P.accent3, 0.11)], [0.6, rgba(P.accent3, 0.025)], [1, rgba(P.accent3, 0)]]);
      g.fillRect(0, 0, W, H);
      g.fillStyle = radial(g, W * 0.62, H * 0.42, 0, W * 0.4, [[0, rgba(P.accent2, 0.035)], [1, rgba(P.accent2, 0)]]);
      g.fillRect(0, 0, W, H);
      const step = 40 * UNIT;                                // a fine dot grid, brighter toward the top left
      for (let y = step / 2; y < H; y += step) for (let x = step / 2; x < W; x += step) {
        const a = 0.05 + 0.05 * (1 - Math.min(1, Math.hypot(x / W, y / H)));
        g.fillStyle = rgba(P.ink, a); g.fillRect(Math.round(x), Math.round(y), 2 * UNIT, 2 * UNIT);
      }
      cache[key] = b.c;
    }
    ctx.drawImage(cache[key], 0, 0);
  }

  // ───────── type ─────────
  // A line of segments [[text, color], ...] at one size and weight; returns the width.
  function segs(ctx, parts, x, y, o) {
    let cx = x;
    for (const [s, color, extra] of parts) {
      text(ctx, s, cx, y, { ...o, color, ...(extra || {}) });
      cx += measure(ctx, s, o);
    }
    return cx - x;
  }
  function header(ctx, P, o) {
    const m = M(), y = 92 * UNIT, sz = 34 * UNIT, light = !!o.light;
    const ink = o.ink || (light ? '#46303D' : P.ink2), acc = o.accent || P.accent;
    // brand mark, top right: a play glyph and the project name
    const name = 'AWESOME SHOWREELS', ns = 32 * UNIT, nls = ns * 0.14;
    const nw = measure(ctx, name, { size: ns, weight: 700, fam: 'mono', ls: nls });
    text(ctx, name, W - m, y, { size: ns, weight: 700, fam: 'mono', color: ink, ls: nls, align: 'right', alpha: 0.8 });
    const gx = W - m - nw - 38 * UNIT, gy = y - 11 * UNIT;
    ctx.save(); ctx.fillStyle = linear(ctx, gx - 12, gy - 14, gx + 14, gy + 14, [[0, acc], [1, o.accent2 || P.accent2]]);
    ctx.beginPath(); ctx.moveTo(gx - 11 * UNIT, gy - 14 * UNIT); ctx.lineTo(gx + 14 * UNIT, gy); ctx.lineTo(gx - 11 * UNIT, gy + 14 * UNIT); ctx.closePath(); ctx.fill(); ctx.restore();
    // index label: the number on an accent chip, then the short label
    const ls = sz * 0.14, iw = measure(ctx, o.index, { size: sz, weight: 700, fam: 'mono', ls }) + 26 * UNIT;
    rr(ctx, m, y - sz * 0.98, iw, sz * 1.36, 8 * UNIT); ctx.fillStyle = acc; ctx.fill();
    text(ctx, o.index, m + 13 * UNIT + ls / 2, y, { size: sz, weight: 700, fam: 'mono', color: o.onAccent || P.bg, ls });
    text(ctx, o.label, m + iw + 22 * UNIT, y, { size: sz, weight: 700, fam: 'mono', color: ink, ls });
  }

  // ───────── panels and small parts ─────────
  function panel(ctx, x, y, w, h, o = {}) {
    const r = (o.r ?? 18) * UNIT;
    ctx.save();
    if (o.shadow !== false) { ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 44 * UNIT; ctx.shadowOffsetY = 18 * UNIT; }
    rr(ctx, x, y, w, h, r); ctx.fillStyle = o.fill || rgba(C.surface, 0.92); ctx.fill();
    ctx.restore();
    ctx.save();
    rr(ctx, x + 0.75, y + 0.75, w - 1.5, h - 1.5, r);
    ctx.strokeStyle = o.stroke || rgba(C.ink, 0.1); ctx.lineWidth = (o.lw || 1.5) * UNIT; ctx.stroke();
    if (o.glow) {                                            // focus ring in the accent colour
      ctx.shadowColor = rgba(o.glowColor || C.accent, 0.9 * o.glow); ctx.shadowBlur = 26 * UNIT;
      ctx.strokeStyle = rgba(o.glowColor || C.accent, 0.95 * o.glow); ctx.lineWidth = 3 * UNIT; ctx.stroke();
    }
    ctx.restore();
  }
  function label(ctx, s, x, y, o = {}) {
    const sz = (o.size || 24) * UNIT;
    return text(ctx, s, x, y, { size: sz, weight: o.weight || 700, fam: 'mono', color: o.color || C.muted, ls: sz * (o.track ?? 0.14), align: o.align, alpha: o.alpha });
  }
  // squarish tag (the README's badges are flat-square): returns its width
  function tag(ctx, s, x, y, o = {}) {
    const sz = (o.size || 26) * UNIT, fam = o.fam || 'mono', wt = o.weight || 600, ls = o.ls ?? 0;
    const padX = (o.padX ?? 16) * UNIT, h = (o.h || 50) * UNIT;
    const tw = measure(ctx, s, { size: sz, weight: wt, fam, ls });
    const dot = o.dot ? 24 * UNIT : 0, w = tw + padX * 2 + dot;
    const x0 = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x;
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    rr(ctx, x0, y - h / 2, w, h, (o.r ?? 8) * UNIT);
    ctx.fillStyle = o.bg || rgba(C.surface, 0.95); ctx.fill();
    if (o.stroke !== false) { ctx.strokeStyle = o.stroke || rgba(C.ink, 0.12); ctx.lineWidth = 1.5 * UNIT; ctx.stroke(); }
    if (o.dot) { circle(ctx, x0 + padX + 7 * UNIT, y, 7 * UNIT); ctx.fillStyle = o.dot; ctx.fill(); }
    ctx.restore();
    text(ctx, s, x0 + padX + dot, y + sz * 0.35, { size: sz, weight: wt, fam, color: o.color || C.ink, ls, alpha: o.alpha });
    return w;
  }
  function arrow(ctx, x0, y0, x1, y1, o = {}) {
    const a = Math.atan2(y1 - y0, x1 - x0), hl = (o.head || 14) * UNIT;
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    ctx.strokeStyle = o.color || C.line; ctx.fillStyle = o.color || C.line; ctx.lineWidth = (o.lw || 3) * UNIT; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - Math.cos(a) * hl * 0.6, y1 - Math.sin(a) * hl * 0.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - Math.cos(a - 0.5) * hl, y1 - Math.sin(a - 0.5) * hl); ctx.lineTo(x1 - Math.cos(a + 0.5) * hl, y1 - Math.sin(a + 0.5) * hl);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // segmented control: items [labels], active index k (fractional while it slides)
  function pill(ctx, items, x, y, k, o = {}) {
    const sz = (o.size || 24) * UNIT, h = (o.h || 54) * UNIT, pad = 22 * UNIT;
    const ws = items.map(s => measure(ctx, s, { size: sz, weight: 700, fam: 'sans' }) + pad * 2);
    const total = ws.reduce((a, b) => a + b, 0) + 8 * UNIT;
    const x0 = o.align === 'right' ? x - total : x;
    rr(ctx, x0, y - h / 2, total, h, h / 2); ctx.fillStyle = rgba(C.surface, 0.95); ctx.fill();
    ctx.strokeStyle = rgba(C.ink, 0.12); ctx.lineWidth = 1.5 * UNIT; ctx.stroke();
    const xs = []; let acc = x0 + 4 * UNIT;
    for (const w of ws) { xs.push(acc); acc += w; }
    const i0 = Math.floor(clamp(k, 0, items.length - 1)), i1 = Math.min(items.length - 1, i0 + 1), f = k - i0;
    const hx = lerp(xs[i0], xs[i1], f), hw = lerp(ws[i0], ws[i1], f);
    rr(ctx, hx, y - h / 2 + 4 * UNIT, hw, h - 8 * UNIT, (h - 8 * UNIT) / 2);
    ctx.fillStyle = linear(ctx, hx, 0, hx + hw, 0, [[0, o.c0 || C.accent], [1, o.c1 || C.accent2]]); ctx.fill();
    items.forEach((s, i) => {
      const on = 1 - Math.min(1, Math.abs(k - i));
      text(ctx, s, xs[i] + ws[i] / 2, y + sz * 0.36, { size: sz, weight: 700, fam: 'sans', align: 'center', color: mix(C.ink2, C.onAccent || C.bg, on) });
    });
    return total;
  }
  // a keyboard key, pressed by p (0 up .. 1 down)
  function keycap(ctx, s, x, y, p, o = {}) {
    const w = (o.w || 74) * UNIT, h = (o.h || 74) * UNIT, d = 8 * UNIT * (1 - p);
    ctx.save();
    rr(ctx, x - w / 2, y - h / 2 + 8 * UNIT, w, h, 14 * UNIT); ctx.fillStyle = mix(C.bg, '#000000', 0.3); ctx.fill();
    rr(ctx, x - w / 2, y - h / 2 + 8 * UNIT - d, w, h, 14 * UNIT);
    ctx.fillStyle = mix(C.surface, C.accent, 0.18 * (o.lit || 0)); ctx.fill();
    ctx.strokeStyle = rgba(o.lit ? C.accent : C.ink, o.lit ? 0.35 + 0.6 * o.lit : 0.16); ctx.lineWidth = 2 * UNIT; ctx.stroke();
    if (o.lit) { ctx.shadowColor = rgba(C.accent, 0.7 * o.lit); ctx.shadowBlur = 28 * UNIT; ctx.stroke(); ctx.shadowBlur = 0; }
    text(ctx, s, x, y + 8 * UNIT - d + 12 * UNIT, { size: 34 * UNIT, weight: 700, fam: 'mono', align: 'center', color: o.lit ? mix(C.ink, C.accent, 0.5 * o.lit) : C.ink2 });
    ctx.restore();
  }
  function image(ctx, name, x, y, w, h, o = {}) {
    const im = IMG[name];
    if (!im) return;
    drawImageFit(ctx, im, x, y, w, h, { fit: o.fit || 'cover', ax: o.ax ?? 0.5, ay: o.ay ?? 0, radius: (o.r ?? 12) * UNIT, alpha: o.alpha });
  }

  window.KIT = { LOOP_BEATS, loop, stage, header, panel, label, tag, arrow, pill, keycap, image, segs, bright: BRIGHT, margin: M };
})();
