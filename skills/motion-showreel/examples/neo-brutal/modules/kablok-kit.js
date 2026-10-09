// kablok-kit: the neo-brutal drawing kit shared by every scene of the kablok reel (a project module, P/modules/*.js).
//
// Everything is built from one component, the brand's box (source/kablok.css .box): a flat fill, an ink border and a
// hard ink shadow with zero blur. Motion follows BRAND.md "Motion" through style.json motion.ui: a press moves a box
// into its shadow in 80 ms and springs back with one overshoot; a pop scales in from 60 % with one overshoot; a dropped
// block falls with no easing in the air and squashes 6 % on landing; nothing fades longer than 120 ms; nothing blurs.
// Px values are the page's tokens scaled 1.33x (1440-px page -> 1920-px frame): style.json layout.border/shadow/radius.
//
// Globals: window.KB (helpers, colours, the page geometry and the cursor hand-offs between scenes). Loader: registers
// the shipped Archivo variable font once more with its width range, so canvas fonts like 'expanded 900 200px Archivo'
// reach the wdth axis (the runtime loads fonts.files at normal width only). Never assigns SCENES.
(() => {
  const LY = STYLE.layout || {}, MO = STYLE.motion || {}, UI = MO.ui || {}, SHD = LY.shadow || {};
  // Named colours straight from style.json: the engine's palette C re-derives reference aliases (C.lilac, C.mint are
  // tints of accent2/ok there), so the material's own lilac and mint are read from STYLE.palette.
  const SP = STYLE.palette || {};
  const K = {
    BW: LY.border ?? 6, SH: SHD.x ?? 10, R: LY.radius ?? 16, PRESS: SHD.press ?? 8, LIFT: SHD.lift ?? 6,
    INK: C.ink, PAPER: SP.paper || C.bg, WHITE: C.surface, LEMON: SP.lemon || C.accent, LILAC: SP.lilac || C.accent2,
    MINT: SP.mint || C.accent3, TOMATO: SP.tomato || '#FF5A36', DOTS: SP.dots || mix(C.bg, C.ink, 0.16), MUTED: C.muted, INK2: C.ink2,
    SF: (MO.spring && MO.spring.f) || 4.5, SZ: (MO.spring && MO.spring.z) || 0.55,
    POP_FROM: UI.popFrom ?? 0.6, SQUASH: UI.squash ?? 0.06, PRESS_SEC: UI.pressSec ?? 0.08, MARQ: UI.marqueePxPerSec ?? 107,
    STICK_DEG: UI.stickerMaxDeg ?? 8,
  };
  const KB = (window.KB = { K });

  // ───────── time ─────────
  KB.at = (env, b) => env.lt - b * env.beatSec;                       // seconds since beat b of this scene
  KB.pop = (t, f = K.SF, z = K.SZ) => (t <= 0 ? 0 : spring(t, f, z));  // the brand pop: one overshoot, then dead still
  KB.popScale = t => (t <= 0 ? 0 : K.POP_FROM + (1 - K.POP_FROM) * KB.pop(t));
  // Press: into the shadow in pressSec (outQ), held, then released with one overshoot. Returns lift in px (<= 0 pressed).
  KB.press = (t, o = {}) => {
    const depth = o.depth ?? K.PRESS, down = o.down ?? K.PRESS_SEC, hold = o.hold ?? 0.1;
    if (t <= 0) return 0;
    if (t < down) return -depth * Ease.outQ(t / down);
    if (o.stay || t < down + hold) return -depth;
    return -depth * (1 - spring(t - down - hold, o.f ?? 3.6, o.z ?? 0.42));
  };
  // A fall with no easing in the air that lands at t = 0 (t = seconds relative to the landing; negative = in the air).
  // Returns {y: offset above the rest position, sx, sy (squash about the bottom edge after the landing)}.
  KB.fall = (t, height, o = {}) => {
    const dur = o.dur ?? 0.24;
    if (t < 0) return { y: height * (1 - Ease.inQ(clamp(1 + t / dur))), sx: 1, sy: 1, air: true };
    const sq = (o.squash ?? K.SQUASH) * Math.exp(-t * 16) * Math.cos(t * 30);
    return { y: 0, sx: 1 + sq * 0.7, sy: 1 - sq, air: false };
  };
  // Slam for words: appears at full size x from, lands in fall s (accelerating), squashes on the baseline, rebounds once.
  KB.slam = (t, o = {}) => {
    const fall = o.fall ?? 0.1;
    if (t < 0) return null;
    if (t < fall) return { s: lerp(o.from ?? 1.22, 1, Ease.inQ(t / fall)), sx: 1, sy: 1 };
    const q = t - fall, sq = (o.squash ?? 0.09) * Math.exp(-q * 17) * Math.cos(q * 34);
    return { s: 1, sx: 1 + sq * 0.55, sy: 1 - sq };
  };
  // Frame accent for a landing (through the compositor: shake and a 1 % zoom kick, never a chroma split or a flash).
  KB.thunk = (env, t, amt = 1) => {
    if (!env.fx || t < 0 || t > 0.45) return;
    env.fx.shake = Math.max(env.fx.shake, 7 * amt * Math.exp(-t * 14));
    env.fx.zoom *= 1 + 0.012 * amt * Math.exp(-t * 16);
  };

  // ───────── the box ─────────
  // (x, y, w, h): rest rectangle. o.lift px: + rises out of the shadow (hover/picked), - sinks into it (press).
  // o.sx, o.sy, o.rot transform the box about the anchor (o.ax, o.ay fractions; default centre); the shadow takes the
  // same shape, offset in screen space. o.content(ctx, w, h) draws inside, in the box's frame, clipped to it.
  KB.box = (ctx, x, y, w, h, o = {}) => {
    if (w <= 0 || h <= 0) return;
    const bw = o.bw ?? K.BW, r = Math.min(o.r ?? K.R, w / 2, h / 2), sh = o.sh ?? K.SH, lift = clamp(o.lift ?? 0, -sh, 60);
    const ax = (o.ax ?? 0.5) * w, ay = (o.ay ?? 0.5) * h, sx = o.sx ?? 1, sy = o.sy ?? 1, rot = o.rot || 0;
    const local = (ox, oy) => { ctx.translate(ox + ax, oy + ay); if (rot) ctx.rotate(rot); if (sx !== 1 || sy !== 1) ctx.scale(sx, sy); ctx.translate(-ax, -ay); };
    const shape = o.path || ((g) => rr(g, 0, 0, w, h, r));
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    if (sh > 0 && o.shadow !== false) {
      ctx.save(); local(x + sh, y + sh); shape(ctx); ctx.fillStyle = o.shadowColor || K.INK; ctx.fill(); ctx.restore();
    }
    ctx.save(); local(x - lift, y - lift);
    shape(ctx); ctx.fillStyle = o.fill || K.WHITE; ctx.fill();
    if (o.content) { ctx.save(); shape(ctx); ctx.clip(); o.content(ctx, w, h); ctx.restore(); }
    if (bw > 0) {
      ctx.save(); shape(ctx); ctx.clip();                              // border inside the edge
      shape(ctx); ctx.lineWidth = bw * 2; ctx.lineJoin = 'round'; ctx.strokeStyle = o.ink || K.INK; ctx.stroke(); ctx.restore();
    }
    ctx.restore();
    ctx.restore();
  };

  // ───────── type ─────────
  // Archivo at any width keyword the font covers (condensed .. expanded) through the font shorthand.
  const wt = o => `${o.width ? o.width + ' ' : ''}${o.weight ?? 900}`;
  KB.font = (size, o = {}) => font(size, wt(o), o.fam || 'display');
  KB.text = (ctx, s, x, y, o = {}) => text(ctx, s, x, y, { size: o.size || 60, weight: wt(o), fam: o.fam || 'display', color: o.color || K.INK,
    align: o.align, ls: o.ls ?? (o.fam === 'mono' ? 0.08 : -0.02) * (o.size || 60), alpha: o.alpha, base: o.base });
  KB.measure = (ctx, s, o = {}) => measure(ctx, s, { size: o.size || 60, weight: wt(o), fam: o.fam || 'display',
    ls: o.ls ?? (o.fam === 'mono' ? 0.08 : -0.02) * (o.size || 60) });
  // Mono label (Martian Mono 700, uppercase, +8 % tracking).
  KB.label = (ctx, s, x, y, o = {}) => KB.text(ctx, String(s).toUpperCase(), x, y, { size: o.size || 20, weight: o.weight ?? 700, fam: 'mono', color: o.color, align: o.align, alpha: o.alpha });
  KB.labelW = (ctx, s, o = {}) => KB.measure(ctx, String(s).toUpperCase(), { size: o.size || 20, weight: o.weight ?? 700, fam: 'mono' });

  // Words that slam in one by one at their beats. words: [{s, beat, mark}] laid out from (x, y) (baseline, left) with
  // one space between; mark draws the source's highlight (a white band behind the lower third, index.html h1 mark),
  // wiped in hard after the word lands. Returns the line width.
  KB.slamLine = (ctx, env, words, x, y, o = {}) => {
    const size = o.size || 160, opt = { size, weight: o.weight ?? 900, width: o.width };
    const sp = KB.measure(ctx, ' ', opt) * 0.9;
    let cx = x;
    if (o.align === 'center') {
      const tot = words.reduce((a, w, i) => a + KB.measure(ctx, w.s, opt) + (i ? sp : 0), 0);
      cx = x - tot / 2;
    }
    const x0 = cx;
    for (const w of words) {
      const ww = KB.measure(ctx, w.s, opt), t = KB.at(env, w.beat) + (o.fall ?? 0.1), k = KB.slam(t, { fall: o.fall, from: w.from ?? o.from });
      if (k) {
        const mid = size * 0.36, ax = w.anchor === 'left' ? 0 : ww / 2;   // scale about the x-height centre (or left edge)
        ctx.save();
        ctx.translate(cx + ax, y - mid);
        ctx.scale(k.s * k.sx, k.s * k.sy);
        if (w.mark) {                                                         // the highlight wipes in hard after the landing
          const mk = Ease.outExpo(rm(t, (o.fall ?? 0.1) + 0.06, (o.fall ?? 0.1) + 0.26));
          if (mk > 0) { ctx.fillStyle = w.markColor || o.markColor || K.WHITE; ctx.fillRect(-ax - size * 0.04, mid - size * 0.3, (ww + size * 0.08) * mk, size * 0.34); }
        }
        KB.text(ctx, w.s, -ax, mid, { ...opt, color: w.color || o.color || K.INK });
        ctx.restore();
      }
      cx += ww + sp;
    }
    return cx - sp - x0;
  };

  // ───────── stickers ─────────
  // Slapped on: from 1.7x it lands in 0.09 s, then the rotation wobbles to rest (within the brand's 8 degrees).
  // t = seconds since the landing (the slap starts at t = -0.09), so a sticker cued on a beat lands on it.
  KB.SLAP = 0.09;
  KB.slap = t => {
    const fall = KB.SLAP;
    if (t < -fall) return null;
    const k = t < 0 ? Ease.inQ(1 + t / fall) : 1;
    return { s: lerp(1.7, 1, k) * (1 + (t > 0 ? 0.05 * wob(t, 4, 9) : 0)), rot: t > 0 ? 0.06 * wob(t, 3, 6) : 0.22 * (1 - k) };
  };
  // Pill sticker centred at (x, y): mono label, border, hard shadow; o.deg rest rotation.
  KB.sticker = (ctx, x, y, label, t, o = {}) => {
    const k = KB.slap(t);
    if (!k) return;
    const size = o.size || 22, w = KB.labelW(ctx, label, { size }) + size * 1.6 + (o.star ? size * 1.3 : 0), h = size * 2.5;
    KB.box(ctx, x - w / 2, y - h / 2, w, h, { r: h / 2, bw: o.bw ?? 5, sh: o.sh ?? 7, fill: o.fill || K.WHITE, sx: k.s, sy: k.s,
      rot: ((o.deg ?? -5) * Math.PI) / 180 + k.rot + (o.wiggle || 0), lift: o.lift,
      content: (g) => {
        let tx = size * 0.8;
        if (o.star) { KB.star(g, tx + size * 0.45, h / 2, size * 0.5, size * 0.22, 5, -Math.PI / 2); g.fillStyle = K.INK; g.fill(); tx += size * 1.3; }
        KB.label(g, label, tx, h / 2 + size * 0.36, { size });
      } });
  };
  // Starburst path (n points) centred at (x, y).
  KB.star = (ctx, x, y, ro, ri, n = 5, rot = -Math.PI / 2) => {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) { const a = rot + (i * Math.PI) / n, r = i % 2 ? ri : ro; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    ctx.closePath();
  };
  // Starburst badge ("LIVE"): a 14-point burst with border and hard shadow, slapped on like a sticker.
  KB.burst = (ctx, x, y, r, label, t, o = {}) => {
    const k = KB.slap(t);
    if (!k) return;
    const n = o.points ?? 14, path = g => KB.star(g, r, r, r, r * 0.8, n, -Math.PI / 2);
    KB.box(ctx, x - r, y - r, r * 2, r * 2, { path, fill: o.fill || K.LEMON, bw: 6, sh: 9, sx: k.s, sy: k.s,
      rot: ((o.deg ?? 10) * Math.PI) / 180 + k.rot + (o.wiggle || 0), lift: o.lift,
      content: g => KB.text(g, label, r, r + r * 0.17, { size: r * 0.46, weight: 900, width: 'semi-expanded', align: 'center' }) });
  };

  // ───────── cursor ─────────
  // A chunky arrow (white, ink border, hard shadow); (x, y) is the tip. o.press 0..1 shrinks it into its shadow;
  // o.click (s since a click) pops three action lines out of the tip; o.s scale; o.rot.
  const ARROW = [[0, 0], [0, 66], [16, 52], [28, 80], [42, 74], [30, 47], [52, 47]];
  KB.cursor = (ctx, x, y, o = {}) => {
    const p = clamp(o.press ?? 0), s = (o.s ?? 1) * (1 - 0.1 * p), rot = o.rot ?? -0.1, sh = 8 * (1 - 0.75 * p);
    const shape = g => { g.beginPath(); ARROW.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); g.closePath(); };
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    if (o.click !== undefined && o.click >= 0 && o.click < 0.32) {                 // action lines (comic "click" marks)
      const q = o.click / 0.32, out = Ease.outExpo(clamp(q * 1.6)), back = Ease.inQ(clamp((q - 0.45) / 0.55));
      ctx.save(); ctx.translate(x, y); ctx.strokeStyle = K.INK; ctx.lineWidth = 7; ctx.lineCap = 'round';
      for (const a of [-2.55, -1.95, -1.35]) {
        const r0 = 24 + 26 * back, r1 = 24 + 42 * out;
        if (r1 - r0 > 1) { ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.stroke(); }
      }
      ctx.restore();
    }
    ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.save(); ctx.translate(sh, sh); shape(ctx); ctx.fillStyle = K.INK; ctx.fill(); ctx.restore();
    shape(ctx); ctx.fillStyle = K.WHITE; ctx.fill();
    ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.strokeStyle = K.INK; ctx.stroke();
    ctx.restore();
  };
  // Cursor path: keys [[beat, x, y, ease?]]; holds the last key with a small hand sway. Returns [x, y].
  KB.path = (env, keys, o = {}) => {
    const lt = env.lt, b = env.beatSec;
    let x = keys[0][1], y = keys[0][2];
    for (let i = 1; i < keys.length; i++) {
      const [b0, x0, y0] = keys[i - 1], [b1, x1, y1, e] = keys[i];
      if (lt <= b0 * b) break;
      const k = (Ease[e || 'outQuint'] || Ease.outQuint)(rm(lt, b0 * b, b1 * b));
      x = lerp(x0, x1, k); y = lerp(y0, y1, k) - (o.arc ?? 0) * Math.sin(Math.PI * k);
    }
    const sw = o.sway ?? 1;
    return [x + Math.sin(lt * 2.1) * 3 * sw, y + Math.cos(lt * 1.7) * 2.5 * sw];
  };

  // ───────── backgrounds and transitions ─────────
  KB.field = (ctx, color) => { ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); };
  // Editor canvas dots, fixed to the screen (so a slab that reveals them lines up with the next scene exactly).
  let DOTB = null;
  KB.dots = (ctx, o = {}) => {
    const step = o.step ?? 32, r = o.r ?? 2.4;
    if (!DOTB) {
      DOTB = makeBuf(W, H);
      DOTB.g.fillStyle = K.DOTS;
      for (let yy = step / 2; yy < H; yy += step) for (let xx = step / 2; xx < W; xx += step) { DOTB.g.beginPath(); DOTB.g.arc(xx, yy, r, 0, TAU); DOTB.g.fill(); }
    }
    ctx.drawImage(DOTB.c, 0, 0);
  };
  // Slabs that slide up from below, staggered; the last one becomes the next stage. t: s since the wipe started,
  // dur: s until the last slab covers the frame. fills: colours; o.inside(ctx, i) paints screen-fixed content on slab i.
  KB.slabsUp = (ctx, t, dur, fills, o = {}) => {
    const n = fills.length, st = o.stagger ?? 0.07, d = dur - st * (n - 1), bw = K.BW + 2;
    fills.forEach((f, i) => {
      const k = Ease.ioQuint(rm(t, i * st, i * st + d));
      if (k <= 0) return;
      const top = lerp(H + 4, -bw - 4, k);
      ctx.save(); ctx.beginPath(); ctx.rect(0, top, W, H - top + 4); ctx.clip();
      ctx.fillStyle = f; ctx.fillRect(0, top, W, H - top + 4);
      if (o.inside) o.inside(ctx, i);
      ctx.restore();
      ctx.fillStyle = K.INK; ctx.fillRect(0, top, W, bw);
    });
  };
  // Cards stacking from the top: each slab falls with no easing in the air and lands at the bottom edge; the last one
  // covers the frame at t = dur. Returns the time since the last landing (for a thunk), or -1 before it.
  KB.slabsDown = (ctx, t, dur, fills, o = {}) => {
    const n = fills.length, st = o.stagger ?? 0.09, fallD = o.fall ?? 0.26, bw = K.BW + 2;
    let landed = -1;
    fills.forEach((f, i) => {
      const tl = dur - (n - 1 - i) * st;                                   // landing time of slab i
      const k = Ease.inQ(rm(t, tl - fallD, tl));
      if (k <= 0) return;
      const bottom = lerp(-bw - 4, H + bw + 4, k);
      ctx.fillStyle = f; ctx.fillRect(0, 0, W, bottom - bw);
      if (o.inside) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, bottom - bw); ctx.clip(); o.inside(ctx, i); ctx.restore(); }
      ctx.fillStyle = K.INK; ctx.fillRect(0, bottom - bw, W, bw);
      if (t >= tl) landed = t - tl;
    });
    return landed;
  };
  // The one button takes the screen: rect r0 grows past every edge by k = 1 (accelerating, no easing at the end).
  KB.flood = (ctx, r0, k, fill) => {
    if (k <= 0) return;
    const e = Ease.inC(clamp(k)), pad = K.BW * 3;
    const x0 = lerp(r0.x, -pad, e), y0 = lerp(r0.y, -pad, e), x1 = lerp(r0.x + r0.w, W + pad, e), y1 = lerp(r0.y + r0.h, H + pad, e);
    KB.box(ctx, x0, y0, x1 - x0, y1 - y0, { fill, r: lerp(K.R, 0, e), sh: lerp(K.SH, 0, e) });
  };

  // ───────── marquee (index.html .marquee: ink band, lemon mono caps, ✦ separators) ─────────
  KB.marquee = (ctx, y, h, items, offset, o = {}) => {
    const size = o.size || 30, gap = size * 1.2, starR = size * 0.36;
    const seg = items.map(s => KB.labelW(ctx, s, { size, weight: 800 }) + gap * 2 + starR * 2);
    const total = seg.reduce((a, b) => a + b, 0);
    ctx.save();
    ctx.fillStyle = K.INK; ctx.fillRect(0, y, W, h);
    ctx.beginPath(); ctx.rect(0, y, W, h); ctx.clip();
    let x = -(((offset % total) + total) % total);
    while (x < W) {
      items.forEach((s, i) => {
        if (x < W && x + seg[i] > 0) {
          KB.label(ctx, s, x, y + h / 2 + size * 0.36, { size, weight: 800, color: o.color || K.LEMON });
          const sx = x + seg[i] - gap - starR;
          KB.star(ctx, sx, y + h / 2, starR, starR * 0.32, 4, -Math.PI / 2); ctx.fillStyle = o.color || K.LEMON; ctx.fill();
        }
        x += seg[i];
      });
    }
    ctx.restore();
  };

  // ───────── icons (thick ink strokes, like the brand's 5 px borders) ─────────
  KB.icon = (ctx, kind, x, y, s, o = {}) => {
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = o.color || K.INK; ctx.fillStyle = o.color || K.INK;
    ctx.lineWidth = o.lw ?? Math.max(3, s * 0.13); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const r = s / 2;
    if (kind === 'arrow') {                                         // ↗
      ctx.beginPath(); ctx.moveTo(-r * 0.55, r * 0.55); ctx.lineTo(r * 0.55, -r * 0.55); ctx.moveTo(-r * 0.25, -r * 0.55); ctx.lineTo(r * 0.55, -r * 0.55); ctx.lineTo(r * 0.55, r * 0.25); ctx.stroke();
    } else if (kind === 'link') {                                  // two chain links
      ctx.save(); ctx.rotate(-Math.PI / 4);
      rr(ctx, -r * 0.95, -r * 0.32, r * 1.1, r * 0.64, r * 0.32); ctx.stroke();
      rr(ctx, -r * 0.15, -r * 0.32, r * 1.1, r * 0.64, r * 0.32); ctx.stroke();
      ctx.restore();
    } else if (kind === 'cup') {                                   // tip jar
      ctx.beginPath(); ctx.moveTo(-r * 0.7, -r * 0.35); ctx.lineTo(r * 0.45, -r * 0.35); ctx.lineTo(r * 0.36, r * 0.65); ctx.lineTo(-r * 0.6, r * 0.65); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.arc(r * 0.52, r * 0.08, r * 0.26, -Math.PI / 2, Math.PI / 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 0.62); ctx.lineTo(-r * 0.3, -r * 0.82); ctx.moveTo(0, -r * 0.58); ctx.lineTo(0, -r * 0.86); ctx.stroke();
    } else if (kind === 'tag') {                                   // merch drop
      ctx.beginPath(); ctx.moveTo(-r * 0.8, -r * 0.8); ctx.lineTo(r * 0.05, -r * 0.8); ctx.lineTo(r * 0.85, 0); ctx.lineTo(0, r * 0.85); ctx.lineTo(-r * 0.8, r * 0.05); ctx.closePath(); ctx.stroke();
      circle(ctx, -r * 0.35, -r * 0.35, r * 0.13); ctx.fill();
    } else if (kind === 'mail') {                                  // newsletter
      rr(ctx, -r * 0.85, -r * 0.58, r * 1.7, r * 1.16, r * 0.12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-r * 0.8, -r * 0.5); ctx.lineTo(0, r * 0.1); ctx.lineTo(r * 0.8, -r * 0.5); ctx.stroke();
    } else if (kind === 'play') {                                  // video
      circle(ctx, 0, 0, r * 0.85); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-r * 0.22, -r * 0.38); ctx.lineTo(r * 0.42, 0); ctx.lineTo(-r * 0.22, r * 0.38); ctx.closePath(); ctx.fill();
    } else if (kind === 'clock') {                                 // countdown
      circle(ctx, 0, r * 0.08, r * 0.78); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, r * 0.08); ctx.lineTo(0, -r * 0.38); ctx.moveTo(0, r * 0.08); ctx.lineTo(r * 0.32, r * 0.25); ctx.moveTo(-r * 0.25, -r * 0.92); ctx.lineTo(r * 0.25, -r * 0.92); ctx.stroke();
    } else if (kind === 'check') {
      ctx.beginPath(); ctx.moveTo(-r * 0.6, 0); ctx.lineTo(-r * 0.15, r * 0.45); ctx.lineTo(r * 0.65, -r * 0.5); ctx.stroke();
    }
    ctx.restore();
  };

  // ───────── the material: the block library and Mara's page (index.html) ─────────
  // Library tiles (index.html "The library"; the Video tile is paper instead of lilac so it reads on the lilac stage).
  KB.TILES = [
    { kind: 'link', label: 'Link', line: 'Any URL, big and loud.', fill: K.LEMON, icon: 'link' },
    { kind: 'tip', label: 'Tip jar', line: 'Let fans chip in.', fill: K.MINT, icon: 'cup' },
    { kind: 'merch', label: 'Merch drop', line: 'A countdown, then chaos.', fill: K.TOMATO, icon: 'tag' },
    { kind: 'news', label: 'Newsletter', line: 'Collect emails. Own your list.', fill: K.WHITE, icon: 'mail' },
    { kind: 'video', label: 'Video', line: 'Plays right on the page.', fill: K.PAPER, icon: 'play' },
    { kind: 'count', label: 'Countdown', line: 'Drops, launches, birthdays.', fill: K.WHITE, icon: 'clock' },
  ];
  KB.tileContent = (tile) => (g, w, h) => {
    KB.icon(g, tile.icon, 52, 54, 46);
    const lines = wrapText(g, tile.line, w - 52, { size: 19, weight: 700, fam: 'sans' });
    const y1 = h - 26 - (lines.length - 1) * 24;
    KB.text(g, tile.label, 26, y1 - 40, { size: fitSize(g, tile.label, w - 52, { size: 36, weight: 900, fam: 'display' }), weight: 900 });
    lines.forEach((ln, i) => KB.text(g, ln, 26, y1 + i * 24, { size: 19, weight: 700, fam: 'sans' }));
  };
  // The page card (index.html .page-demo) at 1.24x: a white card, a profile header and four block slots.
  const PG = { w: 520, pad: 26, head: 84, gap: 22, bh: 100, step: 120, r: 28, sh: 16 };
  KB.PG = PG;
  KB.pageGeom = (x, y) => {
    const slots = [0, 1, 2, 3].map(i => ({ x: x + PG.pad, y: y + PG.pad + PG.head + PG.gap + i * PG.step, w: PG.w - PG.pad * 2, h: PG.bh }));
    return { x, y, w: PG.w, h: PG.pad * 2 + PG.head + PG.gap + 3 * PG.step + PG.bh, slots };
  };
  KB.pageFrame = (ctx, g, o = {}) => {
    KB.box(ctx, g.x, g.y, g.w, g.h, { fill: o.fill || K.WHITE, r: PG.r, sh: PG.sh, sx: o.sx, sy: o.sy, ax: 0.5, ay: 1, lift: o.lift,
      content: (c) => {
        const cy = PG.pad + PG.head / 2;
        KB.box(c, PG.pad, cy - 38, 76, 76, { r: 38, bw: 5, sh: 5, fill: K.LILAC,
          content: (cc) => KB.text(cc, 'M', 38, 52, { size: 42, weight: 900, align: 'center' }) });
        KB.text(c, '@mara.makes', PG.pad + 100, cy - 4, { size: 30, weight: 900 });
        KB.text(c, 'zines, prints & tiny comics', PG.pad + 100, cy + 30, { size: 21, weight: 700, fam: 'sans', color: K.INK2 });
      } });
  };
  // The countdown on the merch block ticks down from the page's 04:12:33, one second of scene time per second.
  KB.timer = sec => {
    const v = Math.max(0, 4 * 3600 + 12 * 60 + 33 - Math.floor(Math.max(0, sec)));
    return [Math.floor(v / 3600), Math.floor(v / 60) % 60, v % 60].map(n => String(n).padStart(2, '0')).join(':');
  };
  // One block of Mara's page with its verbatim copy. o: lift, sx, sy, rot, ax, ay, timer (string), chip (index pressed,
  // with o.chipLift), sub (Subscribe lift).
  KB.BLOCKS = { link: { fill: K.LEMON }, tip: { fill: K.MINT }, merch: { fill: K.LILAC }, news: { fill: K.WHITE } };
  KB.block = (ctx, kind, x, y, w, h, o = {}) => {
    KB.box(ctx, x, y, w, h, { fill: KB.BLOCKS[kind].fill, lift: o.lift, sx: o.sx, sy: o.sy, rot: o.rot, ax: o.ax ?? 0.5, ay: o.ay ?? 1, alpha: o.alpha,
      content: (g) => KB.blockContent(g, kind, w, h, o) });
  };
  KB.blockContent = (g, kind, w, h, o = {}) => {
    const ty = h / 2 + 11;
    if (kind === 'link') {
      KB.text(g, 'My new zine', 26, ty, { size: 31, weight: 900 });
      KB.icon(g, 'arrow', w - 46, h / 2, 34);
    } else if (kind === 'tip') {
      KB.text(g, 'Tip jar', 26, ty, { size: 31, weight: 900 });
      const chips = ['$3', '$5', '$10'], cws = chips.map(s => KB.labelW(g, s, { size: 18 }) + 28);
      let cx = w - 26 - cws.reduce((a, v) => a + v, 0) - 10 * (chips.length - 1);
      chips.forEach((s, i) => {
        KB.box(g, cx, h / 2 - 21, cws[i], 42, { r: 21, bw: 4, sh: 4, fill: o.chip === i && o.chipOn ? K.LEMON : K.WHITE, lift: o.chip === i ? o.chipLift : 0,
          content: (c) => KB.label(c, s, 14, 28, { size: 18 }) });
        cx += cws[i] + 10;
      });
    } else if (kind === 'merch') {
      KB.text(g, 'Merch drop', 26, ty, { size: 31, weight: 900 });
      KB.text(g, o.timer || '04:12:33', w - 26, ty - 1, { size: 26, weight: 700, fam: 'mono', align: 'right', ls: 1 });
    } else if (kind === 'news') {
      KB.text(g, 'Sunday Scraps', 26, ty, { size: 31, weight: 900 });
      const bw2 = 150;
      KB.box(g, w - 26 - bw2, h / 2 - 25, bw2, 50, { r: 12, bw: 4, sh: 5, fill: K.TOMATO, lift: o.sub || 0,
        content: (c) => KB.text(c, 'Subscribe', bw2 / 2, 33, { size: 22, weight: 900, align: 'center' }) });
    }
  };
  // The page with all four blocks at rest (order top to bottom); per-block overrides in o.blocks[kind].
  KB.ORDER = ['link', 'tip', 'merch', 'news'];
  KB.page = (ctx, g, o = {}) => {
    KB.pageFrame(ctx, g, o.frame || {});
    KB.ORDER.forEach((kind, i) => {
      const s = g.slots[i], b = (o.blocks && o.blocks[kind]) || {};
      if (b.hide) return;
      KB.block(ctx, kind, s.x + (b.dx || 0), s.y + (b.dy || 0), s.w, s.h, { ...o.common, ...b });
    });
  };
  // Toasts (index.html .activity) with an icon each.
  KB.TOASTS = [
    { s: 'Jo sent a tip', fill: K.MINT, icon: 'cup' },
    { s: 'Sam subscribed', fill: K.LILAC, icon: 'mail' },
    { s: 'Zine #4 sold out', fill: K.LEMON, icon: 'tag' },
  ];
  KB.toast = (ctx, tst, x, y, o = {}) => {
    const w = o.w || 470, h = o.h || 86;
    KB.box(ctx, x, y, w, h, { fill: tst.fill, rot: o.rot, sx: o.sx, sy: o.sy, ax: 0.5, ay: 1, lift: o.lift,
      content: (g) => { KB.icon(g, tst.icon, 46, h / 2, 34); KB.text(g, tst.s, 84, h / 2 + 11, { size: 31, weight: 900 }); } });
  };
  // Scene kicker (index.html .card .num + .label): a numbered pill, slapped on.
  KB.kicker = (ctx, x, y, num, word, t) => {
    const k = KB.slap(t);
    if (!k) return;
    const size = 22, w1 = KB.labelW(ctx, num, { size }) + 30, w2 = KB.labelW(ctx, word, { size }) + 34, h = 54;
    KB.box(ctx, x, y - h / 2, w1 + w2, h, { r: h / 2, bw: 5, sh: 7, fill: K.WHITE, sx: k.s, sy: k.s, ax: 0, ay: 0.5, rot: -0.035 + k.rot,
      content: (g) => {
        g.fillStyle = K.LEMON; g.fillRect(0, 0, w1, h); g.fillStyle = K.INK; g.fillRect(w1 - 2.5, 0, 5, h);
        KB.label(g, num, 15, h / 2 + 8, { size });
        KB.label(g, word, w1 + 17, h / 2 + 8, { size });
      } });
  };

  // ───────── hand-offs between scenes (the cursor and the held block never leave the screen) ─────────
  // pick -> stack: the Link tile is carried across the slab wipe to HELD; stack's page sits at PAGE.
  KB.TILE = { w: 284, h: 224 };
  KB.HELD = { x: 668, y: 700, gx: 176, gy: 140 };             // tile top-left at the cut; the cursor tip grabs it at +gx, +gy
  KB.PAGE = { x: 1200, y: 236 };                              // Mara's page in stack and ship
  KB.PUBLISH = { x: 1596, y: 22, w: 228, h: 64 };             // the toolbar button in stack; the flood starts here
  KB.PRESSED_AT = { x: 1726, y: 66 };                         // where the cursor presses Publish (and where ship starts)

  // ───────── fonts: Archivo's width axis ─────────
  window.REEL_MODULES.push({
    name: 'kablok-type',
    async load(M) {
      const f = (M.fonts || []).find(e => (Array.isArray(e) ? e[0] : e.family) === 'Archivo');
      if (!f) return;
      const url = Array.isArray(f) ? f[1] : f.url;
      try {
        const ff = new FontFace('Archivo', `url(${url})`, { weight: '100 900', stretch: '62% 125%' });
        await ff.load();
        document.fonts.add(ff);
      } catch (e) { console.warn(`[kablok] Archivo width axis unavailable (${e.message || e}); words stay at normal width`); }
    },
  });
})();
