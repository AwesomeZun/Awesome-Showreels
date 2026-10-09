// veyrande-type.js (project module): the house's typographic grammar for screens, from source/identity-notes.md.
// "Type is revealed from behind a mask, never typed out letter by letter and never scrambled." Hairline rules in
// champagne. Capitals tracked at 0.3 em. Exposes window.VEYRANDE.type (all pure in their inputs):
//   maskRise(ctx, s, x, y, lt, o)    a line rises from behind a mask at its baseline; glyphs staggered from the
//                                    centre outward (o.from 'center' | 'left'); o.ls letter-spacing px (may animate)
//   maskFall(ctx, s, x, y, k, o)     the same line sinking back behind its mask, k 0..1 (exits)
//   caps(ctx, s, x, y, o)            Jost capitals, tracked (o.track em, default style.type.trackingCaps)
//   hairline(ctx, cx, y, w, p, o)    a rule drawn from the centre outward, p 0..1; o.glint 0..1 runs a light along it
//   foil(ctx, draw, box, k, o)       champagne foil: draw() paints the shape, k 0..1 sweeps a specular band across it
//   paper(ctx, P, o)                 the ivory page: tone, a soft lamp falloff and a fibre texture (cached)
//   motes(ctx, t, o)                 dust in the lamplight: soft specks drifting upward, deterministic in t
//   aperture(ctx, r, p, fn, o)       a plate opening from a vertical slit (p 0..1); fn(ctx) draws its content
(() => {
  const V = (window.VEYRANDE = window.VEYRANDE || {});
  const TR = () => (STYLE.type && STYLE.type.trackingCaps) || 0.3;
  const layout = (ctx, s, size, weight, fam, ls) => {
    ctx.save();
    ctx.font = font(size, weight, fam);
    ctx.letterSpacing = '0px';
    const chars = [...s], xs = [];
    let acc = '';
    for (let i = 0; i < chars.length; i++) { xs.push(ctx.measureText(acc).width + ls * i); acc += chars[i]; }
    const widths = chars.map(ch => ctx.measureText(ch).width);
    const total = ctx.measureText(s).width + ls * (chars.length - 1);
    ctx.restore();
    return { chars, xs, widths, total };
  };
  // Masked rise: each glyph slides up from below the baseline mask (no blur, no scale: the letter is never animated on
  // its own, the line arrives as one gesture). lt: seconds since the line starts.
  function maskRise(ctx, s, x, y, lt, o = {}) {
    const size = o.size || 64, weight = o.weight || TYPE.displayWeight || 400, fam = o.fam || 'display', ls = o.ls || 0;
    const L = layout(ctx, s, size, weight, fam, ls);
    let x0 = x;
    if (o.align === 'center') x0 = x - L.total / 2;
    else if (o.align === 'right') x0 = x - L.total;
    if (lt <= 0) return L.total;
    const n = L.chars.length, st = o.stagger ?? 0.035, dur = o.dur ?? 0.9, rise = o.rise ?? size * 1.0;
    const top = y - size * (o.above ?? 1.05), bot = y + size * (o.below ?? 0.3);
    ctx.save();
    ctx.beginPath(); ctx.rect(x0 - size, top, L.total + size * 2, bot - top); ctx.clip();
    ctx.font = font(size, weight, fam);
    ctx.letterSpacing = '0px';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = o.color || C.ink;
    const base = ctx.globalAlpha * (o.alpha ?? 1);
    for (let i = 0; i < n; i++) {
      const ch = L.chars[i];
      if (ch === ' ') continue;
      const ord = o.from === 'left' ? i : Math.abs(i - (n - 1) / 2);
      const k = Ease.outQuint(rm(lt, ord * st, ord * st + dur));
      if (k <= 0) continue;
      ctx.globalAlpha = base * clamp(k * 1.6);
      if (o.colorFn) ctx.fillStyle = o.colorFn(i, ch) || o.color || C.ink;
      ctx.fillText(ch, x0 + L.xs[i], y + (1 - k) * rise);
    }
    ctx.restore();
    return L.total;
  }
  function maskFall(ctx, s, x, y, k, o = {}) {
    if (k >= 1) return 0;
    if (k <= 0) return maskRise(ctx, s, x, y, 1e6, o);
    const size = o.size || 64;
    ctx.save();
    const w = layout(ctx, s, size, o.weight || TYPE.displayWeight || 400, o.fam || 'display', o.ls || 0).total;
    const x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
    ctx.beginPath(); ctx.rect(x0 - size, y - size * (o.above ?? 1.05), w + size * 2, size * ((o.above ?? 1.05) + (o.below ?? 0.3))); ctx.clip();
    const e = k * k * k * k * k;
    maskRise(ctx, s, x, y - e * size * 1.15, 1e6, { ...o, above: 9, below: 9, alpha: (o.alpha ?? 1) * (1 - e * 0.6) });
    ctx.restore();
    return w;
  }
  function caps(ctx, s, x, y, o = {}) {
    const size = o.size || 20, ls = size * (o.track ?? TR());
    // trailing tracking would push centred caps left: centre on the ink, not on the advance
    const w = measure(ctx, s, { size, weight: o.weight || TYPE.bodyWeight || 500, fam: o.fam || 'sans', ls }) - ls;
    const xx = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
    if (o.rise !== undefined) {                                               // masked rise of the whole label
      const k = Ease.outQuint(clamp(o.rise));
      if (k <= 0) return w;
      ctx.save();
      ctx.beginPath(); ctx.rect(xx - 20, y - size * 1.2, w + 40, size * 1.55); ctx.clip();
      text(ctx, s, xx, y + (1 - k) * size * 1.3, { size, weight: o.weight || TYPE.bodyWeight || 500, fam: o.fam || 'sans', ls, color: o.color || C.muted, alpha: (o.alpha ?? 1) * clamp(k * 1.5) });
      ctx.restore();
      return w;
    }
    text(ctx, s, xx, y, { size, weight: o.weight || TYPE.bodyWeight || 500, fam: o.fam || 'sans', ls, color: o.color || C.muted, alpha: o.alpha });
    return w;
  }
  function hairline(ctx, cx, y, w, p, o = {}) {
    const k = Ease.ioQuint(clamp(p));
    if (k <= 0) return;
    const half = (w / 2) * k, lw = o.lw || 1.5;
    ctx.save();
    ctx.globalAlpha *= o.alpha ?? 1;
    ctx.fillStyle = o.color || C.accent;
    ctx.fillRect(cx - half, y - lw / 2, half * 2, lw);
    if (o.glint > 0 && o.glint < 1) {                                          // a light running along the rule
      const gx = lerp(cx - w / 2 - 60, cx + w / 2 + 60, Ease.ioSine(o.glint));
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = linear(ctx, gx - 70, 0, gx + 70, 0, [[0, 'rgba(255,250,236,0)'], [0.5, 'rgba(255,250,236,0.95)'], [1, 'rgba(255,250,236,0)']]);
      ctx.beginPath(); ctx.rect(Math.max(cx - half, gx - 70), y - lw, Math.min(cx + half, gx + 70) - Math.max(cx - half, gx - 70), lw * 2); ctx.fill();
      softBlob(ctx, gx, y, 26, 'rgba(255,248,230,1)', 0.5 * Math.sin(Math.PI * o.glint));
    }
    ctx.restore();
  }
  // Champagne foil: the shape in a vertical champagne gradient, a fine dark edge (the stamp's bite into the card) and a
  // specular band that sweeps across it as k goes 0 -> 1.
  const foilBuf = {};
  function foil(ctx, draw, box, k, o = {}) {
    const P = o.P || C, key = `${Math.ceil(box.w)}x${Math.ceil(box.h)}`;
    const b = foilBuf[key] || (foilBuf[key] = makeBuf(Math.ceil(box.w) + 8, Math.ceil(box.h) + 8));
    const g = b.g;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, b.c.width, b.c.height);
    g.translate(4 - box.x, 4 - box.y);
    g.fillStyle = linear(g, 0, box.y, 0, box.y + box.h, [[0, mix(P.accent, '#FFFFFF', 0.35)], [0.45, P.accent], [0.55, mix(P.accent, P.accent3, 0.6)], [1, mix(P.accent, '#FFFFFF', 0.15)]]);
    g.strokeStyle = g.fillStyle;
    draw(g);
    g.globalCompositeOperation = 'source-atop';
    if (k > 0 && k < 1) {
      const x = lerp(box.x - box.w * 0.5, box.x + box.w * 1.5, Ease.ioSine(k)), band = o.band || box.w * 0.22;
      g.save(); g.translate(x, box.y + box.h / 2); g.transform(1, 0, -0.45, 1, 0, 0);
      g.fillStyle = linear(g, -band, 0, band, 0, [[0, 'rgba(255,252,242,0)'], [0.5, 'rgba(255,252,242,0.92)'], [1, 'rgba(255,252,242,0)']]);
      g.fillRect(-band, -box.h, band * 2, box.h * 2);
      g.restore();
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    ctx.save();
    ctx.globalAlpha *= o.alpha ?? 1;
    ctx.shadowColor = rgba(P.accent3, 0.35); ctx.shadowBlur = 1.5; ctx.shadowOffsetY = 0.8;   // the bite into the card
    ctx.drawImage(b.c, box.x - 4, box.y - 4);
    ctx.restore();
  }
  // The page: ivory tone, a soft warm falloff from the lamp (lx, ly in frame fractions) and fibres. The fibre layer is
  // built once per palette; it drifts with the camera, never with time.
  let fib = null, fibKey = '';
  function paper(ctx, P, o = {}) {
    const base = o.color || P.bg;
    ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
    const lx = (o.lx ?? 0.36) * W, ly = (o.ly ?? 0.28) * H;
    ctx.fillStyle = radial(ctx, lx, ly, 0, Math.hypot(W, H) * 0.85, [[0, rgba(mix(base, '#FFFFFF', 0.55), 0.75)], [0.45, rgba(base, 0)], [1, rgba(mix(base, P.accent3, 0.35), 0.55)]]);
    ctx.fillRect(0, 0, W, H);
    const key = base + P.ink2;
    if (!fib || fibKey !== key) {
      fibKey = key;
      fib = makeBuf(W, H);
      const g = fib.g;
      for (let i = 0; i < 2600; i++) {                                         // short paper fibres
        const x = hash(i * 1.37) * W, y = hash(i * 2.91 + 0.5) * H, a = hash(i * 4.13) * Math.PI, l = 3 + hash(i * 7.7) * 12;
        g.strokeStyle = rgba(hash(i * 3.3) > 0.5 ? P.ink2 : '#FFFFFF', 0.035 + hash(i * 5.1) * 0.05);
        g.lineWidth = 0.6 + hash(i * 6.2) * 0.6;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + 2, y + Math.sin(a) * l * 0.5 - 1, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
      }
    }
    ctx.save(); ctx.globalAlpha *= o.fibre ?? 1;
    ctx.drawImage(fib.c, o.dx || 0, o.dy || 0);
    ctx.restore();
  }
  function motes(ctx, t, o = {}) {
    const n = o.n ?? 26, col = o.color || '#FFF8EA';
    ctx.save();
    for (let i = 0; i < n; i++) {
      const h1 = hash(i * 3.71 + 1.1), h2 = hash(i * 5.13 + 2.7), h3 = hash(i * 9.31 + 0.3);
      const sp = 9 + h2 * 16, x = (h1 * (W + 200) + Math.sin(t * (0.18 + h3 * 0.2) + i) * 40) % (W + 200) - 100;
      const y = H + 60 - ((h2 * (H + 120) + t * sp) % (H + 120));
      const r = 1.6 + h3 * 4.2, depth = 0.35 + 0.65 * h3;
      const tw = 0.55 + 0.45 * Math.sin(t * (0.9 + h1) + i * 2.1);
      const inLight = o.lx === undefined ? 1 : Math.exp(-((x - o.lx * W) ** 2 + (y - o.ly * H) ** 2) / (2 * (o.lr || 600) ** 2));
      softBlob(ctx, x, y, r * 2.4, col, (o.alpha ?? 0.5) * tw * depth * (0.25 + 0.75 * inLight));
    }
    ctx.restore();
  }
  function aperture(ctx, r, p, fn, o = {}) {
    const k = Ease.ioQuint(clamp(p));
    if (k <= 0) return;
    const w = r.w * k, x = r.x + (r.w - w) / 2;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, r.y, w, r.h); ctx.clip();
    const s = lerp(o.zoom ?? 1.08, 1, Ease.outQuint(clamp(p)));
    ctx.translate(r.x + r.w / 2, r.y + r.h / 2); ctx.scale(s, s); ctx.translate(-(r.x + r.w / 2), -(r.y + r.h / 2));
    fn(ctx);
    ctx.restore();
    if (k < 1 && o.edge !== false) {                                         // the two edges of the opening, in champagne
      ctx.save(); ctx.fillStyle = rgba(o.edgeColor || C.accent, 0.8 * (1 - k));
      ctx.fillRect(x - 0.75, r.y, 1.5, r.h); ctx.fillRect(x + w - 0.75, r.y, 1.5, r.h);
      ctx.restore();
    }
  }
  V.type = { maskRise, maskFall, caps, hairline, foil, paper, motes, aperture, layout };
})();
