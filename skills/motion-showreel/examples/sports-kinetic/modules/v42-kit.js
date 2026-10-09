// v42-kit: the VELMORA 42 brand devices as drawing helpers, shared by every scene (a project module, P/modules/*.js).
//
// Everything here comes from source/brand/BRAND.md and tokens.css, drawn in code:
//   the lean        12 degrees for plates, stripes and wipes (--lean: -12deg); the italic type leans 7 inside it
//   race stripes    three leaning bars, Signal Orange, Bib White, Signal Orange
//   speed lines     thin Bib White streaks, 2 to 6 px, running right to left behind anything that moves
//   the stinger     a stripe wipe that crosses a hard cut: the outgoing scene draws its first half, the incoming
//                   scene its second half, both from the same time function, so the pixels meet exactly at the cut
//   tabular digits  "A running clock never changes width": canvas cannot switch on tnum, so digits are laid out on
//                   a fixed advance (the widest digit), and changed digits roll like a race clock
//   the slam        "A number never fades in. It lands." Text punches in from 1.7x (ease-in, 0.12 s), lands on its
//                   beat, squashes once, and asks the compositor for a 0.25 s frame shake (env.fx)
// Pure functions of their arguments (time comes in as a parameter); caches are keyed by inputs only.
// Globals: window.V42 only. Never assigns SCENES.
(() => {
  const DEG = Math.PI / 180;
  const LEAN = Math.tan(12 * DEG);
  const V = {};
  V.LEAN = LEAN;
  // Barlow Condensed italic faces are requested with a style prefix; font() passes the weight string through.
  V.BLACK = 'italic 900';
  V.XBOLD = 'italic 800';
  V.BOLDI = 'italic 700';
  V.LABEL = '600';

  // ───────── geometry ─────────
  // Leaning parallelogram path. (x, y) is the bottom-left corner; the top edge is shifted right by h * lean.
  V.plate = (ctx, x, y, w, h, lean = LEAN) => {
    const s = h * lean;
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x + s, y - h); ctx.lineTo(x + s + w, y - h); ctx.lineTo(x + w, y); ctx.closePath();
  };
  // Skew the following drawing forward around the baseline point (x, y).
  V.leanAt = (ctx, x, y, lean = LEAN) => { ctx.translate(x, y); ctx.transform(1, 0, -lean, 1, 0, 0); ctx.translate(-x, -y); };

  // Race stripes: three leaning bars (bottom-left at x, y), height h. o.colors, o.w (bar width), o.gap.
  V.raceStripes = (ctx, x, y, h, o = {}) => {
    const cols = o.colors, w = o.w ?? h * 0.22, gap = o.gap ?? w * 0.5;
    cols.forEach((c, i) => { if (!c) return; V.plate(ctx, x + i * (w + gap), y, w, h); ctx.fillStyle = c; ctx.fill(); });
    return cols.length * w + (cols.length - 1) * gap + h * LEAN;
  };

  // ───────── speed lines ─────────
  // Deterministic streaks running right to left. t: seconds; o: {n, color, alpha, y0, y1, speed, seed, density 0..1,
  // minLen, maxLen}. Each streak has its own speed (1.8-4.4 k px/s by default) and a 2-6 px thickness.
  V.speedLines = (ctx, t, o = {}) => {
    const n = Math.round((o.n ?? 34) * clamp(o.density ?? 1)), seed = o.seed ?? 1, a = o.alpha ?? 1;
    if (n <= 0 || a <= 0) return;
    const y0 = o.y0 ?? 0, y1 = o.y1 ?? H, sp = o.speed ?? 1, minL = o.minLen ?? 90, maxL = o.maxLen ?? 520;
    ctx.save();
    ctx.fillStyle = o.color || '#FFFFFF';
    for (let i = 0; i < n; i++) {
      const h1 = hash(i * 7.13 + seed * 1.7), h2 = hash(i * 3.71 + seed * 2.9), h3 = hash(i * 9.97 + seed * 0.37);
      const len = minL + h1 * (maxL - minL), th = 2 + Math.round(h2 * 4), v = (1800 + h3 * 2600) * sp;
      const span = W + len + 260, x = W + 130 - ((((t * v + h2 * span) % span) + span) % span);
      const y = Math.round(y0 + (y1 - y0) * hash(i * 1.37 + seed * 5.3));
      ctx.globalAlpha = a * (0.1 + 0.42 * h1);
      ctx.fillRect(x, y, len, th);
    }
    ctx.restore();
  };

  // ───────── the stinger (stripe wipe across a hard cut) ─────────
  // k: 0 (band right of the frame) .. 0.5 (the field covers the frame: the cut) .. 1 (band gone to the left).
  // The band moves right to left: lead stripes, a field wider than the frame, trail stripes. Linear in k with the same
  // speed on both halves, so the motion does not stop at the cut. o: {field, lead: [[color, w], ...], trail: [...], gap}.
  V.stingerBand = (o) => {
    const skew = H * LEAN, gap = o.gap ?? 14;
    const lead = o.lead || [], trail = o.trail || [];
    const lw = lead.reduce((s, [, w]) => s + w + gap, 0), tw = trail.reduce((s, [, w]) => s + w + gap, 0);
    const F = W + skew + 40;                                       // field width at the bottom edge
    return { skew, gap, lead, trail, lw, tw, F, X0: W + lw, Xh: -skew - 20, X1: -skew - F - tw - 20 };
  };
  V.stingerX = (b, k) => (k <= 0.5 ? lerp(b.X0, b.Xh, k / 0.5) : lerp(b.Xh, b.X1, (k - 0.5) / 0.5));
  V.stinger = (ctx, k, o = {}) => {
    if (k <= 0 || k >= 1) return;
    const b = V.stingerBand(o), X = V.stingerX(b, k);
    ctx.save();
    let x = X;                                                     // lead stripes sit left of the field
    for (let i = b.lead.length - 1; i >= 0; i--) {
      const [c, w] = b.lead[i];
      x -= b.gap + w;
      if (c) { V.plate(ctx, x, H + 2, w, H + 4, LEAN); ctx.fillStyle = c; ctx.fill(); }
    }
    V.plate(ctx, X, H + 2, b.F, H + 4, LEAN); ctx.fillStyle = o.field; ctx.fill();
    x = X + b.F;
    for (const [c, w] of b.trail) {
      x += b.gap;
      if (c) { V.plate(ctx, x, H + 2, w, H + 4, LEAN); ctx.fillStyle = c; ctx.fill(); }
      x += w;
    }
    ctx.restore();
  };
  // Stinger progress for the two sides of a boundary, from the scene's own clock (D = half-length in seconds).
  V.stingerOut = (env, D) => 0.5 + (env.lt - env.dur) / (2 * D);  // outgoing: reaches 0.5 at the scene end
  V.stingerIn = (env, D) => 0.5 + env.lt / (2 * D);               // incoming: 0.5 at its first frame

  // ───────── tabular digits ─────────
  const ADV = new Map();
  const fontOf = (o) => font(o.size || 64, o.weight || V.BLACK, o.fam || 'display');
  // Widest digit advance for a font (cached by font string).
  V.digitAdvance = (ctx, o) => {
    const f = fontOf(o);
    let w = ADV.get(f);
    if (w === undefined) {
      ctx.save(); ctx.font = f; ctx.letterSpacing = '0px';
      w = 0; for (const d of '0123456789') w = Math.max(w, ctx.measureText(d).width);
      ctx.restore(); ADV.set(f, w);
    }
    return w;
  };
  const isDigit = (c) => c >= '0' && c <= '9';
  // Cell layout of s: [{ch, x, w}] from x = 0, digits on the fixed advance, other glyphs on their own (+ o.ls).
  V.cells = (ctx, s, o = {}) => {
    const adv = V.digitAdvance(ctx, o), ls = o.ls || 0, out = [];
    ctx.save(); ctx.font = fontOf(o); ctx.letterSpacing = '0px';
    let x = 0;
    for (const ch of [...s]) {
      const w = isDigit(ch) ? adv : ctx.measureText(ch).width;
      out.push({ ch, x, w }); x += w + ls;
    }
    ctx.restore();
    out.width = Math.max(0, x - ls);
    return out;
  };
  V.tabWidth = (ctx, s, o = {}) => V.cells(ctx, s, o).width;
  // Tabular text. o: size, weight, fam, color, align ('left' | 'center' | 'right'), ls, alpha. Returns the width.
  V.tab = (ctx, s, x, y, o = {}) => {
    const cells = V.cells(ctx, s, o), w = cells.width;
    const x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
    ctx.save();
    ctx.font = fontOf(o); ctx.letterSpacing = '0px'; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'center';
    ctx.fillStyle = o.color || '#FFFFFF';
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    for (const c of cells) ctx.fillText(c.ch, x0 + c.x + c.w / 2, y);
    ctx.restore();
    return w;
  };
  // Race-clock roll: from `prev` to `next` (same layout), changed glyphs slide up out of their cell while the new ones
  // slide in from below, over k 0..1. Unchanged glyphs stay put. o as tab() (+ o.h: cell height, default 1.0 x size).
  V.roll = (ctx, prev, next, k, x, y, o = {}) => {
    if (k >= 1 || prev === next || !prev) return V.tab(ctx, next, x, y, o);
    const A = V.cells(ctx, prev, o), B = V.cells(ctx, next, o), w = B.width, size = o.size || 64;
    if (A.length !== B.length) return V.tab(ctx, next, x, y, o);
    const x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
    const ch = (o.h ?? 1.0) * size, e = Ease.outExpo(clamp(k));
    ctx.save();
    ctx.font = fontOf(o); ctx.letterSpacing = '0px'; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'center';
    ctx.fillStyle = o.color || '#FFFFFF';
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    for (let i = 0; i < B.length; i++) {
      const c = B[i], cx = x0 + c.x + c.w / 2;
      if (A[i].ch === c.ch) { ctx.fillText(c.ch, cx, y); continue; }
      ctx.save();
      ctx.beginPath(); ctx.rect(x0 + c.x - size * 0.3, y - size * 0.86, c.w + size * 0.6, size * 1.02); ctx.clip();
      ctx.fillText(A[i].ch, cx, y - ch * e);
      ctx.fillText(c.ch, cx, y + ch * (1 - e));
      ctx.restore();
    }
    ctx.restore();
    return w;
  };

  // ───────── the slam ─────────
  // tl: seconds since the landing (negative while it flies in). Before the landing the text punches in from o.from
  // (1.7x) with an ease-in over o.approach (0.12 s) from the right (o.dx px); on the landing it squashes once
  // (no bounce). Returns {s, land} where land = tl clamped >= 0 (for shakes and secondary motion), or null when
  // nothing is drawn. o.draw(ctx) draws the text centred on (0, 0) in the transformed frame; o.ax/o.ay anchor.
  V.slam = (ctx, tl, x, y, draw, o = {}) => {
    const A = o.approach ?? 0.12;
    if (tl < -A) return null;
    ctx.save();
    if (tl < 0) {
      const u = Ease.inQ(clamp((tl + A) / A)), s = lerp(o.from ?? 1.7, 1, u), dx = lerp(o.dx ?? 240, 0, u);
      ctx.translate(x + dx, y); ctx.scale(s, s);
      ctx.globalAlpha *= clamp((tl + A) / (A * 0.35));            // 2 frames of opacity ramp at 1.7x: no visible fade
    } else {
      const q = Math.exp(-tl * 22), sq = (o.squash ?? 0.07) * q;   // one squash, critically damped
      ctx.translate(x, y); ctx.scale(1 + sq * 0.6, 1 - sq);
    }
    draw(ctx);
    ctx.restore();
    return { land: Math.max(0, tl) };
  };
  // Frame accents for a landing at local time tl (s since the landing): a quarter-second shake, a small zoom kick.
  V.impact = (env, tl, o = {}) => {
    if (!env.fx || tl < 0 || tl > 0.5) return;
    const amp = o.shake ?? 16, d = Math.exp(-tl * (o.decay ?? 14));
    env.fx.shake = Math.max(env.fx.shake, amp * d);
    if (o.zoom) env.fx.zoom *= 1 + o.zoom * Math.exp(-tl * 16);
    if (o.flash) { env.fx.flash = Math.max(env.fx.flash, o.flash * Math.exp(-tl * 18)); env.fx.flashColor = o.flashColor || '#FFFFFF'; }
  };
  // Seconds since beat b of this scene (negative before it).
  V.at = (env, b) => env.lt - b * env.beatSec;

  // ───────── race data ─────────
  // The 42 splits of BIB 2417 (assets/data/bib-2417-splits.csv, a byte-identical copy of source/data/; DEMO DATA).
  let SPL = null;
  V.splits = () => {
    if (SPL) return SPL;
    const raw = ASSET('data/bib-2417-splits.csv');
    if (!raw) return null;
    const lines = String(raw).trim().split(/\r?\n/), head = lines[0].split(',');
    SPL = lines.slice(1).map((ln) => {
      const v = ln.split(','), r = {};
      head.forEach((k, i) => { r[k] = v[i] ?? ''; });
      r.split_s = +r.split_s; r.elapsed_s = +r.elapsed_s; r.vs_plan_s = +r.vs_plan_s; r.km = +r.km;
      return r;
    });
    return SPL;
  };
  // h:mm:ss and m:ss as the app prints them; tenths for the start clock.
  V.hms = (s) => { s = Math.floor(s + 1e-6); return `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
  V.hmsT = (s) => { const d = Math.floor(s * 10 + 1e-6); return V.hms(d / 10) + '.' + (d % 10); };

  window.V42 = V;
})();
