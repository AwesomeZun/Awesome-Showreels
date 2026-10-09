// deco-kit.js: THE EMERALD FAN's drawing kit, a project module (loads before every scene, never assigns SCENES).
// Everything the house style asks for (source/house-style.md), as pure functions of their arguments:
//   gold leaf type with a travelling sheen and leaf seams, centre-out letter reveals, gilded line draws with a bright
//   nib, stepped (setback) frames, sunbursts that rise from the bottom edge, the fan mark (seven gold ribs, emerald
//   between), the full-frame fan iris that closes over a cut and parts on the next downbeat, the bandstand's stepped
//   arches lit from the inside out, the emerald door leaves swinging in perspective, champagne coupes, gold dust, and
//   swing timing (the off-beat falls two thirds through the beat).
// Colours come from env.palette (style.json): accent gold, goldLight, goldShade, emerald, emeraldDeep, ink (ivory).
// Caches are keyed by their inputs only (sizes, strings), never by time.
(() => {
  const FAN = {};
  const PI = Math.PI;

  // ───────── timing: beats and the swing ─────────
  FAN.inQuint = (t) => t * t * t * t * t;                             // the engine's Ease has outQuint only
  FAN.SWING = 2 / 3;                                                   // a swung eighth: the 'and' at 2/3 of the beat
  FAN.at = (env, b) => env.lt - b * env.beatSec;                       // seconds since beat b (negative before it)
  // Decaying pulse on every beat and a lighter one on each swung 'and'.
  FAN.swingPulse = (env, k = 9, and = 0.45) => {
    if (env.lt < 0) return 0;
    const b = env.lt / env.beatSec, f = b - Math.floor(b);
    const onBeat = Math.exp(-k * f * env.beatSec), g = f - FAN.SWING;
    return Math.max(onBeat, g >= 0 ? and * Math.exp(-k * g * env.beatSec) : 0);
  };
  // The Charleston figure: accents on beat 1 and the swung 'and' of 2 of every bar.
  FAN.charleston = (env, k = 7) => {
    if (env.lt < 0) return 0;
    const bb = env.lt / env.beatSec, f = bb - Math.floor(bb / 4) * 4;     // position in the bar (beats)
    const hit = (p, a) => (f >= p ? a * Math.exp(-k * (f - p) * env.beatSec) : 0);
    return Math.max(hit(0, 1), hit(1 + FAN.SWING, 0.8));
  };

  // ───────── colour helpers ─────────
  FAN.golds = (P) => ({ hi: P.goldLight || P.accent3, mid: P.accent, lo: P.goldShade || mix(P.accent, '#000000', 0.45) });
  // Metallic gold gradient across a box: light top, a dark horizon below the middle, light again: brushed leaf.
  FAN.goldGrad = (ctx, x0, y0, x1, y1, P, o = {}) => {
    const G = FAN.golds(P), w = o.warm ?? 0;
    return linear(ctx, x0, y0, x1, y1, [
      [0, mix(G.hi, '#FFFFFF', 0.25)], [0.22, G.hi], [0.46, mix(G.mid, G.hi, 0.15 + w)], [0.56, G.lo],
      [0.64, G.mid], [0.86, mix(G.hi, G.mid, 0.3)], [1, mix(G.mid, G.lo, 0.35)]]);
  };
  FAN.lacquerGrad = (ctx, x0, y0, x1, y1, P, dark = 0) => {
    const e = P.emerald || P.accent2, d = P.emeraldDeep || mix(e, '#000000', 0.5);
    return linear(ctx, x0, y0, x1, y1, [[0, mix(d, '#000000', 0.25 + dark * 0.4)], [0.42, mix(e, '#000000', dark * 0.5)],
      [0.5, mix(mix(e, '#FFFFFF', 0.12), '#000000', dark * 0.5)], [0.58, mix(e, '#000000', dark * 0.5)], [1, mix(d, '#000000', 0.3 + dark * 0.4)]]);
  };

  // ───────── scratch buffers (one per size; every call clears what it uses) ─────────
  const pool = new Map();
  FAN.buf = (key, w, h) => {
    const k = `${key}:${w}x${h}`;
    let b = pool.get(k);
    if (!b) { b = makeBuf(w, h); pool.set(k, b); }
    b.g.setTransform(1, 0, 0, 1, 0, 0); b.g.globalCompositeOperation = 'source-over'; b.g.globalAlpha = 1; b.g.filter = 'none';
    b.g.shadowColor = 'transparent'; b.g.shadowBlur = 0; b.g.clearRect(0, 0, w, h);
    return b;
  };

  // ───────── type ─────────
  // Glyph layout with letter spacing that never adds a trailing gap (so centring is exact).
  FAN.layout = (ctx, s, size, weight, fam, ls) => {
    ctx.save(); ctx.font = font(size, weight, fam); ctx.letterSpacing = '0px';
    const chars = [...s], xs = [], ws = [];
    let acc = '';
    for (let i = 0; i < chars.length; i++) { xs.push(ctx.measureText(acc).width + ls * i); acc += chars[i]; ws.push(ctx.measureText(chars[i]).width); }
    const total = ctx.measureText(s).width + ls * Math.max(0, chars.length - 1);
    const m = ctx.measureText('H');
    ctx.restore();
    return { chars, xs, ws, total, asc: m.actualBoundingBoxAscent || size * 0.72 };
  };
  // Per-glyph reveal from the centre outward (symmetric): glyph i starts at |i - mid| * stagger seconds, slides out
  // from a compressed tracking and fades in; o.out = {at, dur} folds them back to the centre. Returns per-glyph state.
  FAN.spreadState = (n, lt, o = {}) => {
    const st = o.stagger ?? 0.045, dur = o.dur ?? 0.5, mid = (n - 1) / 2, out = [];
    for (let i = 0; i < n; i++) {
      const d = Math.abs(i - mid), t0 = (o.order === 'ltr' ? i : d) * st;
      let p = Ease.outQuint(rm(lt, t0, t0 + dur));
      if (o.out) p *= 1 - Ease.inC(rm(lt, o.out.at + (mid - d) * (o.out.stagger ?? 0.01), o.out.at + (mid - d) * (o.out.stagger ?? 0.01) + (o.out.dur ?? 0.3)));
      out.push(p);
    }
    return out;
  };
  // Draw text with a centre-out reveal. o: size, weight, fam (role or stack), ls (px), align ('center' default),
  // color, alpha, gold (metallic fill), sheen (0..1 sweep progress), seams (leaf squares), glow, lt (seconds since the
  // reveal starts; omit for fully shown), stagger, dur, squeeze (start tracking factor), rise (px), out.
  // Returns {w, x0, x1, top, bottom}.
  FAN.text = (ctx, s, x, y, o = {}) => {
    const size = o.size || 48, weight = o.weight || 400, fam = o.fam || 'display', ls = o.ls ?? 0;
    const L = FAN.layout(ctx, s, size, weight, fam, ls), n = L.chars.length;
    const x0 = o.align === 'left' ? x : o.align === 'right' ? x - L.total : x - L.total / 2, xc = x0 + L.total / 2;
    const ps = o.lt === undefined ? L.chars.map(() => (o.out ? FAN.spreadState(n, 1e6, o)[0] : 1)) : FAN.spreadState(n, o.lt, o);
    const res = { w: L.total, x0, x1: x0 + L.total, top: y - L.asc, bottom: y + size * 0.22 };
    if (!ps.some(p => p > 0.002)) return res;
    const squeeze = o.squeeze ?? 0.86, rise = o.rise ?? 0, blurMax = o.blur ?? 6;
    const glyphs = (g, ox, oy, fill) => {
      g.font = font(size, weight, fam); g.letterSpacing = '0px'; g.textBaseline = 'alphabetic'; g.fillStyle = fill;
      for (let i = 0; i < n; i++) {
        const p = ps[i], ch = L.chars[i];
        if (p <= 0.002 || ch === ' ') continue;
        const gx = xc + (x0 + L.xs[i] - xc) * lerp(squeeze, 1, p);
        g.save(); g.globalAlpha *= p;
        const bl = (1 - p) * blurMax;
        if (bl > 0.3) g.filter = `blur(${bl.toFixed(1)}px)`;
        g.fillText(ch, gx - ox, y - oy + (1 - p) * rise);
        g.restore();
      }
    };
    const a = o.alpha ?? 1;
    if (!o.gold) {                                                     // flat colour: straight onto ctx
      ctx.save(); ctx.globalAlpha *= a;
      if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowBlur ?? 18; }
      glyphs(ctx, 0, 0, o.color || '#FFFFFF');
      ctx.restore();
      return res;
    }
    // metallic: glyphs into a buffer, gold through source-in, sheen and seams through source-atop, then a glow blit
    const P = o.palette || C, pad = Math.ceil(size * 0.5);
    const bx = Math.floor(x0 - pad - L.total * 0.1), by = Math.floor(y - L.asc - pad), bw = Math.ceil(L.total * 1.2 + pad * 2), bh = Math.ceil(L.asc + size * 0.35 + pad * 2);
    const B = FAN.buf('gold', bw, bh), g = B.g;
    glyphs(g, bx, by, '#FFFFFF');
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = FAN.goldGrad(g, 0, y - L.asc - by - size * 0.06, 0, y - by + size * 0.1, P); g.fillRect(0, 0, bw, bh);
    g.globalCompositeOperation = 'source-atop';
    if (o.seams !== false) {                                           // gold leaf laid in squares: faint seams
      const q = Math.max(10, Math.round(size * 0.34));
      g.globalAlpha = 0.16; g.fillStyle = P.goldShade || mix(P.accent, '#000000', 0.4);
      for (let gx = ((x0 - bx) % q + q) % q; gx < bw; gx += q) g.fillRect(gx, 0, 1, bh);
      for (let gy = ((y - by) % q + q) % q; gy < bh; gy += q) g.fillRect(0, gy, bw, 1);
      g.globalAlpha = 0.1;
      for (let gx = 0, i = 0; gx < bw; gx += q, i++) for (let gy = 0, j = 0; gy < bh; gy += q, j++) {
        const h = hsh2(i + 3, j + 7);
        if (h > 0.62) { g.fillStyle = h > 0.85 ? '#FFFFFF' : P.goldShade || '#000000'; g.fillRect(gx + 1, gy + 1, q - 1, q - 1); }
      }
      g.globalAlpha = 1;
    }
    const sh = o.sheen;
    if (sh > 0 && sh < 1) {                                            // a specular band crossing the letters
      const band = o.sheenWidth ?? size * 0.7, sx = lerp(x0 - bx - band * 2, x0 - bx + L.total + band * 2, Ease.ioQ(sh));
      g.save(); g.translate(sx, 0); g.transform(1, 0, -0.42, 1, 0, 0);
      g.fillStyle = linear(g, -band, 0, band, 0, [[0, 'rgba(255,250,235,0)'], [0.5, 'rgba(255,250,235,0.95)'], [1, 'rgba(255,250,235,0)']]);
      g.fillRect(-band, -bh, band * 2, bh * 3); g.restore();
    }
    g.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.globalAlpha *= a;
    if (o.glow !== false) { ctx.shadowColor = rgba(P.accent, o.glowA ?? 0.32); ctx.shadowBlur = o.glowBlur ?? size * 0.22; }
    ctx.drawImage(B.c, bx, by);
    ctx.restore();
    return res;
  };
  // Tracked capitals (the labels): letter spacing = em x size, exact centring.
  FAN.label = (ctx, s, x, y, o = {}) => FAN.text(ctx, s, x, y, { fam: 'sans', weight: 600, ...o, ls: (o.em ?? (STYLE.type.trackingWide || 0.33)) * (o.size || 24) });

  // ───────── lines ─────────
  // Stroke the first u (0..1) of a polyline as a gold rule; a bright nib glows at the drawing head while it moves.
  FAN.gild = (ctx, pts, u, P, o = {}) => {
    if (u <= 0 || pts.length < 2) return;
    ctx.save();
    ctx.lineCap = o.cap || 'butt'; ctx.lineJoin = o.join || 'miter';
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    polyStroke(ctx, pts, u);
    ctx.strokeStyle = o.color || P.accent; ctx.lineWidth = o.lw || 2;
    if (o.glow) { ctx.shadowColor = rgba(P.accent, o.glow); ctx.shadowBlur = o.glowBlur ?? 12; }
    ctx.stroke();
    ctx.restore();
    if (u < 1 && o.nib !== false) {
      const h = pointAt(pts, u), a = (o.alpha ?? 1) * (o.nibA ?? 1);
      softBlob(ctx, h.x, h.y, (o.lw || 2) * 9 + 10, P.goldLight || P.accent3, 0.55 * a);
      sparkle(ctx, h.x, h.y, (o.lw || 2) * 3.2 + 6, a, h.a, '#FFF8E6');
    }
  };
  // A path drawn from the centre line outward on both sides at once (pts = the right half, starting on the axis).
  FAN.gildMirror = (ctx, pts, cx, u, P, o = {}) => {
    FAN.gild(ctx, pts, u, P, o);
    FAN.gild(ctx, pts.map(([px, py]) => [2 * cx - px, py]), u, P, o);
  };
  // Horizontal rule drawn from the centre outward with a lozenge in the middle.
  FAN.rule = (ctx, cx, y, halfW, u, P, o = {}) => {
    if (u <= 0) return;
    const gap = o.gap ?? 22, d = o.diamond ?? 7;
    FAN.gildMirror(ctx, [[cx + gap, y], [cx + gap + halfW, y]], cx, u, P, { lw: o.lw || 1.5, nib: o.nib, alpha: o.alpha });
    if (d > 0) {
      const k = Ease.outBack(clamp(u * 2.2), 2.2);
      ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.translate(cx, y); ctx.rotate(PI / 4); ctx.scale(k, k);
      ctx.fillStyle = FAN.goldGrad(ctx, 0, -d, 0, d, P); ctx.fillRect(-d / 2, -d / 2, d, d); ctx.restore();
    }
  };
  // Stepped (setback) rectangle as a closed path that starts on the top centre and runs clockwise: the right half is
  // the first half of the points (for mirrored draws use FAN.steppedHalf).
  FAN.steppedHalf = (cx, x0, y0, x1, y1, step, n) => {
    // right half: top centre -> top right setbacks -> right side -> bottom right setbacks -> bottom centre
    const pts = [[cx, y0]];
    pts.push([x1 - n * step, y0]);
    for (let k = 0; k < n; k++) { pts.push([x1 - (n - k) * step, y0 + (k + 1) * step]); pts.push([x1 - (n - k - 1) * step, y0 + (k + 1) * step]); }
    pts.push([x1, y1 - n * step]);
    for (let k = 0; k < n; k++) { pts.push([x1 - (k + 1) * step, y1 - (n - k) * step]); pts.push([x1 - (k + 1) * step, y1 - (n - k - 1) * step]); }
    pts.push([cx, y1]);
    return pts;
  };
  // Double gold frame with stepped corners, drawn from the top centre down both sides to the bottom centre.
  FAN.steppedFrame = (ctx, cx, x0, y0, x1, y1, u, P, o = {}) => {
    const step = o.step ?? 14, n = o.n ?? 3, gap = o.gap ?? 12;
    FAN.gildMirror(ctx, FAN.steppedHalf(cx, x0, y0, x1, y1, step, n), cx, u, P, { lw: o.lw ?? 2.2, glow: o.glow, alpha: o.alpha });
    FAN.gildMirror(ctx, FAN.steppedHalf(cx, x0 + gap, y0 + gap, x1 - gap, y1 - gap, step, n), cx, clamp(u * 1.06 - 0.06), P,
      { lw: o.lw2 ?? 1, nib: false, alpha: (o.alpha ?? 1) * 0.9 });
    if (o.keystones !== false && u >= 1) {                             // chevron keystones on the centre line
      const k = Ease.outQuint(clamp((u - 0.999) * 1000));
      for (const [ky, s] of [[y0, 1], [y1, -1]]) {
        ctx.save(); ctx.globalAlpha *= (o.alpha ?? 1) * k; ctx.strokeStyle = P.accent; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(cx - 22, ky); ctx.lineTo(cx, ky + s * 15); ctx.lineTo(cx + 22, ky); ctx.moveTo(cx - 12, ky); ctx.lineTo(cx, ky + s * 7); ctx.lineTo(cx + 12, ky); ctx.stroke();
        ctx.restore();
      }
    }
  };

  // ───────── sunburst ─────────
  // Rays from (cx, cy) across angles a0..a1 (canvas radians; default the upper half), alternating gold and nothing.
  // o.reveal 0..1 grows them from the middle ray outward; o.rot turns them; o.alpha; o.rays (even count).
  FAN.sunburst = (ctx, cx, cy, r, P, o = {}) => {
    const n = o.rays || 36, a0 = o.a0 ?? PI, a1 = o.a1 ?? TAU, rev = o.reveal ?? 1, rot = o.rot || 0;
    if (rev <= 0) return;
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 0.1;
    ctx.fillStyle = o.fill || (o.gradient === false ? P.accent : radial(ctx, cx, cy, r * 0.05, r, [[0, rgba(P.goldLight || P.accent, 1)], [0.35, rgba(P.accent, 0.8)], [1, rgba(P.accent, 0)]]));
    ctx.beginPath();
    const mid = (n - 1) / 2;
    for (let i = 0; i < n; i += 2) {
      const d = Math.abs(i + 0.5 - mid) / (mid + 0.5), k = Ease.outQuint(clamp((rev - d * 0.6) / 0.4));
      if (k <= 0) continue;
      const b0 = lerp(a0, a1, i / n) + rot, b1 = lerp(a0, a1, (i + 1) / n) + rot, rr0 = r * k;
      ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(b0) * rr0, cy + Math.sin(b0) * rr0); ctx.lineTo(cx + Math.cos(b1) * rr0, cy + Math.sin(b1) * rr0); ctx.closePath();
    }
    ctx.fill();
    ctx.restore();
  };

  // ───────── the fan mark ─────────
  // Seven gold ribs opening upward from one pivot with emerald lacquer between and a gold rim. open 0..1 spreads the
  // ribs from a closed bundle (vertical) to the half circle. o: ribs (7), rimA, glint (0..1 sheen), alpha, base.
  FAN.mark = (ctx, cx, cy, r, open, P, o = {}) => {
    const n = o.ribs || 7, phi = (PI / 2) * clamp(open), alpha = o.alpha ?? 1;
    if (alpha <= 0.002 || r <= 1) return;
    const ang = i => -PI / 2 + phi * (2 * i / (n - 1) - 1);
    ctx.save(); ctx.globalAlpha *= alpha;
    // panels
    for (let i = 0; i < n - 1; i++) {
      const b0 = ang(i), b1 = ang(i + 1);
      if (b1 - b0 < 1e-4) continue;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, b0, b1); ctx.closePath();
      const e = i % 2 === 0 ? (P.emerald || P.accent2) : (P.emeraldDeep || mix(P.accent2, '#000000', 0.45));
      const am = (b0 + b1) / 2;
      ctx.fillStyle = linear(ctx, cx + Math.cos(b0) * r * 0.6, cy + Math.sin(b0) * r * 0.6, cx + Math.cos(b1) * r * 0.6, cy + Math.sin(b1) * r * 0.6,
        [[0, mix(e, '#000000', 0.35)], [0.5, mix(e, '#FFFFFF', 0.08)], [1, mix(e, '#000000', 0.35)]]);
      ctx.fill();
      ctx.save(); ctx.clip();                                          // lacquer highlight near the rim
      ctx.fillStyle = radial(ctx, cx + Math.cos(am) * r * 0.82, cy + Math.sin(am) * r * 0.82, 0, r * 0.35, [[0, 'rgba(255,255,255,0.10)'], [1, 'rgba(255,255,255,0)']]);
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2); ctx.restore();
    }
    // concentric inlay arcs
    if (phi > 0.01) for (const f of o.inlay || [0.42, 0.7]) {
      ctx.beginPath(); ctx.arc(cx, cy, r * f, ang(0), ang(n - 1));
      ctx.strokeStyle = rgba(P.accent, 0.85); ctx.lineWidth = Math.min(2.4, Math.max(1, r * 0.012)); ctx.stroke();
    }
    // ribs: gold with a bright bevel line
    const rw = o.ribW ?? Math.max(2, r * 0.034);
    for (let i = 0; i < n; i++) {
      const a = ang(i), ex = cx + Math.cos(a) * r * 1.0, ey = cy + Math.sin(a) * r * 1.0;
      ctx.lineCap = 'round';
      ctx.strokeStyle = P.goldShade || P.accent; ctx.lineWidth = rw * 1.5; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = P.accent; ctx.lineWidth = rw; ctx.stroke();
      ctx.strokeStyle = rgba(P.goldLight || P.accent3, 0.85); ctx.lineWidth = rw * 0.32; ctx.stroke();
    }
    // rims
    if (phi > 0.01) {
      ctx.beginPath(); ctx.arc(cx, cy, r, ang(0), ang(n - 1)); ctx.strokeStyle = FAN.goldGrad(ctx, 0, cy - r, 0, cy, P); ctx.lineWidth = Math.max(2, r * 0.05); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, r * 1.1, ang(0), ang(n - 1)); ctx.strokeStyle = rgba(P.accent, o.rimA ?? 0.9); ctx.lineWidth = Math.max(1, r * 0.014); ctx.stroke();
    }
    // base line and hub
    const bl = (o.base ?? 1) * Ease.outQuint(clamp(open));
    if (bl > 0.01) { ctx.strokeStyle = P.accent; ctx.lineWidth = Math.max(1.5, r * 0.028); ctx.beginPath(); ctx.moveTo(cx - r * 1.24 * bl, cy); ctx.lineTo(cx + r * 1.24 * bl, cy); ctx.stroke(); }
    circle(ctx, cx, cy, r * 0.095); ctx.fillStyle = radial(ctx, cx - r * 0.03, cy - r * 0.03, 0, r * 0.1, [[0, '#FFF8E2'], [0.6, P.goldLight || P.accent3], [1, P.accent]]); ctx.fill();
    ctx.strokeStyle = P.goldShade || P.accent; ctx.lineWidth = Math.max(1, r * 0.012); ctx.stroke();
    // glint travelling along the rim
    if (o.glint > 0 && o.glint < 1 && phi > 0.2) {
      const a = lerp(ang(0), ang(n - 1), Ease.ioQ(o.glint)), gx = cx + Math.cos(a) * r, gy = cy + Math.sin(a) * r;
      softBlob(ctx, gx, gy, r * 0.22, P.goldLight || '#FFFFFF', 0.6 * Math.sin(PI * o.glint));
      sparkle(ctx, gx, gy, r * 0.09, Math.sin(PI * o.glint), a, '#FFF8E6');
    }
    ctx.restore();
  };

  // ───────── the fan iris: the mark at full-frame scale, closing over a cut ─────────
  // Pivot below the bottom edge, radius beyond the corners. cover(k): spread from a vertical bundle (k 0 -> 1 covers
  // the frame). part(k): the closed fan's halves swing apart from the centre line (k 0 -> 1 uncovers it).
  FAN.IRIS = { cx: W / 2, cy: H + 70, R: Math.hypot(W / 2, H + 70) * 1.12 };
  function irisPanels(ctx, P, spans, o = {}) {
    const { cx, cy, R } = FAN.IRIS;
    // spans: [[b0, b1, side, idx]] canvas angles of each panel
    for (const [b0, b1, , idx] of spans) {
      if (b1 - b0 < 1e-4) continue;
      const e = idx % 2 === 0 ? (P.emerald || P.accent2) : (P.emeraldDeep || mix(P.accent2, '#000000', 0.45)), am = (b0 + b1) / 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, b0, b1); ctx.closePath();
      const lx = Math.cos(am + PI / 2), ly = Math.sin(am + PI / 2), m = R * 0.55;
      ctx.fillStyle = linear(ctx, cx + Math.cos(am) * m - lx * m * 0.6, cy + Math.sin(am) * m - ly * m * 0.6, cx + Math.cos(am) * m + lx * m * 0.6, cy + Math.sin(am) * m + ly * m * 0.6,
        [[0, mix(e, '#000000', 0.42)], [0.5, mix(e, '#FFFFFF', 0.07)], [1, mix(e, '#000000', 0.42)]]);
      ctx.fill();
    }
    // inlay arcs and ribs
    ctx.lineCap = 'butt';
    for (const [b0, b1] of spans) {
      if (b1 - b0 < 1e-4) continue;
      for (const f of [0.34, 0.56, 0.78]) {
        ctx.beginPath(); ctx.arc(cx, cy, R * f, b0, b1); ctx.strokeStyle = rgba(P.accent, 0.9); ctx.lineWidth = 2.2; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, R * f + 9, b0, b1); ctx.strokeStyle = rgba(P.accent, 0.45); ctx.lineWidth = 1; ctx.stroke();
      }
    }
    const ribs = new Set();
    for (const [b0, b1] of spans) { ribs.add(b0.toFixed(5)); ribs.add(b1.toFixed(5)); }
    for (const a of [...ribs].map(Number)) {
      const ex = cx + Math.cos(a) * R, ey = cy + Math.sin(a) * R;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey);
      ctx.strokeStyle = P.goldShade || P.accent; ctx.lineWidth = 15; ctx.stroke();
      ctx.strokeStyle = P.accent; ctx.lineWidth = 10; ctx.stroke();
      ctx.strokeStyle = rgba(P.goldLight || P.accent3, 0.9); ctx.lineWidth = 3; ctx.stroke();
    }
    // hub peeking over the bottom edge
    const hub = o.hub ?? 1;
    if (hub > 0.01) {
      ctx.save(); ctx.globalAlpha *= hub;
      circle(ctx, cx, cy, 150); ctx.fillStyle = FAN.goldGrad(ctx, 0, cy - 150, 0, cy, P); ctx.fill();
      circle(ctx, cx, cy, 128); ctx.strokeStyle = P.goldShade || P.accent; ctx.lineWidth = 3; ctx.stroke();
      for (let i = 0; i < 18; i++) { const a = PI + (i + 0.5) * PI / 18; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 40, cy + Math.sin(a) * 40); ctx.lineTo(cx + Math.cos(a) * 118, cy + Math.sin(a) * 118); ctx.strokeStyle = rgba(P.goldShade || '#000', 0.7); ctx.lineWidth = 2; ctx.stroke(); }
      ctx.restore();
    }
  }
  const IRIS_N = 6;                                                    // panels (seven ribs)
  FAN.irisCover = (ctx, k, P, o = {}) => {
    if (k <= 0) return;
    const phi = (PI / 2) * clamp(k), spans = [];
    for (let i = 0; i < IRIS_N; i++) {
      const b0 = -PI / 2 + phi * (2 * i / IRIS_N - 1), b1 = -PI / 2 + phi * (2 * (i + 1) / IRIS_N - 1);
      spans.push([b0, b1, i < IRIS_N / 2 ? -1 : 1, i]);
    }
    ctx.save(); irisPanels(ctx, P, spans, { hub: Ease.outQuint(clamp(k * 1.4)) * (o.hub ?? 1) }); ctx.restore();
  };
  FAN.irisPart = (ctx, k, P, o = {}) => {
    if (k >= 1) return;
    const psi = (PI / 2 + 0.06) * clamp(k), spans = [], step = PI / IRIS_N;
    for (let i = 0; i < IRIS_N; i++) {
      const side = i < IRIS_N / 2 ? -1 : 1, b0 = -PI + i * step + side * psi, b1 = -PI + (i + 1) * step + side * psi;
      spans.push([b0, b1, side, i]);
    }
    ctx.save(); irisPanels(ctx, P, spans, { hub: 1 - Ease.inQ(clamp(k * 1.3)) }); ctx.restore();
  };

  // ───────── bandstand arches ─────────
  // A stepped arch: legs from the base up to the spring line, a half circle over the top, a setback step at each foot.
  // Returns the right half (from the crown down to the right foot) for mirrored draws.
  FAN.archHalf = (cx, baseY, r, spring, step = 16) => {
    const pts = [];
    for (let i = 0; i <= 24; i++) { const a = -PI / 2 + (i / 24) * (PI / 2); pts.push([cx + Math.cos(a) * r, baseY - spring + Math.sin(a) * r]); }
    pts.push([cx + r, baseY - step]); pts.push([cx + r + step, baseY - step]); pts.push([cx + r + step, baseY]);
    return pts;
  };

  // ───────── door leaf in perspective ─────────
  // Draw a leaf texture (canvas) swinging inward on its hinge. hingeX is the leaf's outer edge, w its closed width,
  // side -1 (left leaf, hinge on the left) or 1; theta 0 (shut) .. ~PI/2 (open); horizon y for the perspective.
  FAN.leaf = (ctx, tex, hingeX, y0, y1, w, side, theta, o = {}) => {
    const c = Math.cos(theta), s = Math.sin(theta), hz = o.horizon ?? (y0 + y1) / 2, depth = o.depth ?? 0.42;
    const sc = 1 / (1 + s * depth);                                    // the free edge recedes
    const freeX = side < 0 ? hingeX + w * c : hingeX - w * c;
    const ft = hz + (y0 - hz) * sc, fb = hz + (y1 - hz) * sc;
    const quad = side < 0 ? [[hingeX, y0], [freeX, ft], [freeX, fb], [hingeX, y1]] : [[freeX, ft], [hingeX, y0], [hingeX, y1], [freeX, fb]];
    if (Math.abs(freeX - hingeX) < 0.5) return quad;
    Quad.drawQuad(ctx, tex, quad, { opaque: true });
    const shade = o.shade ?? 0.75 * s;                                 // turning away from the light
    if (shade > 0.01) {
      ctx.save(); ctx.beginPath(); quad.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath();
      ctx.fillStyle = `rgba(0,0,0,${clamp(shade)})`; ctx.fill(); ctx.restore();
    }
    return quad;
  };

  // ───────── champagne coupe ─────────
  // A coupe in gold line with an optional champagne fill (0..1) and bubbles; (x, y) = the foot's centre; s = bowl
  // half-width. o.t (seconds) animates the bubbles; o.alpha.
  FAN.coupe = (ctx, x, y, s, fill, P, o = {}) => {
    const top = y - s * 1.6, bowlD = s * 0.6, stemTop = top + bowlD;
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
    const bowl = (g) => { g.beginPath(); g.moveTo(x - s, top); g.bezierCurveTo(x - s * 0.95, top + bowlD * 0.9, x - s * 0.25, stemTop, x, stemTop); g.bezierCurveTo(x + s * 0.25, stemTop, x + s * 0.95, top + bowlD * 0.9, x + s, top); g.closePath(); };
    // glass
    bowl(ctx); ctx.fillStyle = rgba(P.goldLight || '#FFFFFF', 0.06); ctx.fill();
    if (fill > 0.001) {                                                // champagne from the bottom of the bowl up
      ctx.save(); bowl(ctx); ctx.clip();
      const ly = lerp(stemTop, top + s * 0.06, Ease.outQ(clamp(fill)));
      ctx.fillStyle = linear(ctx, 0, ly, 0, stemTop, [[0, rgba(P.goldLight || P.accent3, 0.95)], [0.4, rgba(P.accent, 0.92)], [1, rgba(P.goldShade || P.accent, 0.95)]]);
      ctx.fillRect(x - s * 1.1, ly, s * 2.2, stemTop - ly + 2);
      ctx.fillStyle = rgba('#FFF8E6', 0.85); ctx.fillRect(x - s * 1.1, ly - 1.2, s * 2.2, 2.4);       // meniscus
      const t = o.t || 0;
      for (let i = 0; i < 7; i++) {                                    // bubbles
        const h = hash(i * 7.3 + (o.seed || 0)), bx = x + (h - 0.5) * s * 1.2, per = 0.9 + h * 0.8, q = ((t / per + h) % 1);
        const by = lerp(stemTop - 2, ly + 3, q);
        if (by > ly + 2) { circle(ctx, bx + Math.sin(t * 3 + i) * 2, by, 1.2 + h * 1.6); ctx.fillStyle = rgba('#FFF8E6', 0.75 * (1 - q * 0.5)); ctx.fill(); }
      }
      ctx.restore();
    }
    bowl(ctx); ctx.strokeStyle = P.accent; ctx.lineWidth = o.lw ?? 2.4; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - s * 0.82, top + s * 0.1); ctx.quadraticCurveTo(x - s * 0.6, top + bowlD * 0.75, x - s * 0.15, top + bowlD * 0.92);
    ctx.strokeStyle = rgba('#FFF8E6', 0.55); ctx.lineWidth = 1.4; ctx.stroke();                  // glass highlight
    // stem and foot
    ctx.beginPath(); ctx.moveTo(x, stemTop); ctx.lineTo(x, y - s * 0.12); ctx.strokeStyle = P.accent; ctx.lineWidth = o.lw ?? 2.4; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x, y - s * 0.06, s * 0.46, s * 0.09, 0, 0, TAU); ctx.fillStyle = rgba(P.accent, 0.35); ctx.fill(); ctx.stroke();
    circle(ctx, x, stemTop + s * 0.12, s * 0.05); ctx.fillStyle = P.accent; ctx.fill();
    ctx.restore();
    return { top, stemTop, rimL: [x - s, top], rimR: [x + s, top] };
  };

  // ───────── gold dust ─────────
  FAN.dust = (ctx, t, P, o = {}) => {
    const n = o.n ?? 40, a = o.alpha ?? 1, x0 = o.x0 ?? 0, x1 = o.x1 ?? W, y0 = o.y0 ?? 0, y1 = o.y1 ?? H, seed = o.seed || 0;
    for (let i = 0; i < n; i++) {
      const h1 = hash(i * 3.17 + seed), h2 = hash(i * 7.31 + seed + 1), h3 = hash(i * 1.91 + seed + 2);
      const sp = (o.speed ?? 14) * (0.5 + h2), span = y1 - y0 + 60;
      const y = y1 + 30 - (((h1 * span) + t * sp) % span), x = x0 + h3 * (x1 - x0) + Math.sin(t * (0.5 + h2) + i) * 14;
      const tw = 0.55 + 0.45 * Math.sin(t * (1.6 + h1 * 2.4) + i * 1.7), r = (o.size ?? 2.2) * (0.5 + h2);
      softBlob(ctx, x, y, r * 4, P.goldLight || P.accent, 0.16 * a * tw);
      circle(ctx, x, y, r * 0.7); ctx.fillStyle = rgba(P.goldLight || P.accent, 0.8 * a * tw); ctx.fill();
    }
  };

  // ───────── the lacquer ground ─────────
  // Lacquer black with a warm lift, a faint sunburst rising from the middle of the bottom edge (house style), and
  // optional vertical fluting. o: lift (centre of the warm glow), rays, rot, alpha.
  FAN.ground = (ctx, env, P, o = {}) => {
    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
    const lx = o.liftX ?? W / 2, ly = o.liftY ?? H * 0.55;
    ctx.fillStyle = radial(ctx, lx, ly, 0, o.liftR ?? 1100, [[0, rgba(mix(P.bg2, P.accent, 0.08), 1)], [0.6, rgba(P.bg2, 0.6)], [1, rgba(P.bg, 0)]]);
    ctx.fillRect(0, 0, W, H);
    FAN.sunburst(ctx, W / 2, H + 40, Math.hypot(W, H), P, { rays: o.rays ?? 44, rot: o.rot ?? Math.sin(env.lt * 0.25) * 0.012, alpha: o.alpha ?? 0.07 });
    if (o.fluting) {
      ctx.save(); ctx.globalAlpha *= o.fluting;
      for (let i = 0; i < 26; i++) { const x = 40 + i * 72; ctx.fillStyle = rgba(P.accent, i % 2 ? 0.05 : 0.09); ctx.fillRect(x, 0, 1.2, H); }
      ctx.restore();
    }
  };

  window.FAN = FAN;
})();
