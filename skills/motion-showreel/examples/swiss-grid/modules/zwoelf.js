// zwoelf: the drawing system of the Büro Zwölf brand sheet (source/brand-sheet.md), shared by every scene of this
// project (a project module, P/modules/*.js; it never assigns SCENES).
//
// Everything here follows the sheet: one grid (12 columns of 122 px, 24 px gutters, 96/72 px margins, 6 rows of
// 136 px; read from style.json layout), three colours (env.palette bg / ink / accent), one typeface in two weights,
// motion that snaps along grid lines (expo-out over one eighth of a beat, no overshoot), wipes that run along the
// columns, numbers that roll digit by digit, and the drawing marks of an architect's section (dash-dot axes with
// numbered circles, filled level triangles, dimension chains with 45-degree ticks).
// Pure functions of their arguments: no randomness, no clock, no state between frames.
(() => {
  const Z = (window.ZW = {});

  // ───────── grid ─────────
  let GEO = null;
  // Column/row geometry in px at the reel size. x(i) / xr(i): left / right edge of column i (0-based); y(j) / yb(j):
  // top / bottom of row j; span(k): width of k columns with their gutters.
  Z.geo = () => {
    if (GEO) return GEO;
    const L = STYLE.layout || {};
    const mx = (L.margin ?? 96) * UNIT, my = (L.marginY ?? 72) * UNIT, n = L.grid || 12, g = (L.gutter ?? 24) * UNIT;
    const rows = L.rows || 6, cw = (W - 2 * mx - (n - 1) * g) / n, rh = (H - 2 * my - (rows - 1) * g) / rows;
    GEO = {
      mx, my, n, g, cw, pitch: cw + g, rows, rh, rpitch: rh + g, base: (L.baseline ?? 8) * UNIT,
      x: (i) => mx + i * (cw + g), xr: (i) => mx + i * (cw + g) + cw,
      y: (j) => my + j * (rh + g), yb: (j) => my + j * (rh + g) + rh,
      span: (k) => k * cw + (k - 1) * g, right: W - mx, bottom: H - my,
    };
    return GEO;
  };

  // ───────── time ─────────
  Z.at = (env, b) => env.lt - b * env.beatSec;                         // seconds since beat b of this scene
  Z.snapSec = (env) => ((env.style.motion && env.style.motion.snapBeats) || 0.125) * env.beatSec;
  // A snap: expo-out from 0 to 1 over dur, then a dead stop (no overshoot, no settle).
  Z.snap = (dt, dur) => (dt <= 0 ? 0 : dt >= dur ? 1 : Ease.outExpo(dt / dur));
  // Global beat index from reel time: continuous across hard cuts (scenes start on bar lines).
  Z.beatIndex = (env) => Math.floor(env.t / env.beatSec + 1e-6);

  // ───────── type ─────────
  // Tracking from the sheet: display -0.03 em, numerals -0.045 em, text 0.
  Z.track = (size, kind) => (kind === 'num' ? -0.045 : kind === 'display' ? -0.03 : 0) * size;
  function setFont(ctx, size, weight, ls) {
    ctx.font = font(size, weight, 'display');
    ctx.letterSpacing = `${ls || 0}px`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }
  Z.width = (ctx, s, o = {}) => {
    ctx.save(); setFont(ctx, o.size || 24, o.weight || 500, o.ls); const w = ctx.measureText(s).width; ctx.restore();
    return w;
  };
  // Distance from the pen position to the first ink of s (negative when the glyph has a left side bearing): drawing at
  // x + inkLeft puts the ink, not the side bearing, on the column line.
  Z.inkLeft = (ctx, s, o = {}) => {
    ctx.save(); setFont(ctx, o.size || 24, o.weight || 700, o.ls); const v = ctx.measureText(s).actualBoundingBoxLeft; ctx.restore();
    return v;
  };
  // Flush-left text, no effects.
  Z.text = (ctx, s, x, y, o = {}) => {
    ctx.save(); setFont(ctx, o.size || 24, o.weight || 500, o.ls);
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    ctx.fillStyle = o.color; ctx.fillText(s, x, y); ctx.restore();
  };
  // Mask reveal: the line rises into its own line box from below the baseline (p 0..1, a snap), and leaves upward
  // (o.out 0..1). Nothing blurs, nothing fades.
  Z.reveal = (ctx, s, x, y, p, o = {}) => {
    const q = o.out || 0;
    if (p <= 0 || q >= 1) return;
    const size = o.size || 24, asc = size * (o.asc ?? 0.98), desc = size * (o.desc ?? 0.3), h = asc + desc;
    ctx.save();
    ctx.beginPath(); ctx.rect(x - size * 0.2, y - asc, Z.width(ctx, s, o) + size * 0.6, h); ctx.clip();
    Z.text(ctx, s, x, y + (1 - p) * h - q * h, o);
    ctx.restore();
  };
  // A two-part label: number in Bold, title in Medium ("01  Raster / Grid").
  Z.kicker = (ctx, num, title, x, y, p, o = {}) => {
    const size = o.size || 20, gap = o.gap ?? size * 1.1;
    const nw = Z.width(ctx, num, { size, weight: 700 });
    Z.reveal(ctx, num, x, y, p, { size, weight: 700, color: o.color, out: o.out });
    Z.reveal(ctx, title, x + nw + gap, y, o.p2 ?? p, { size, weight: 500, color: o.color, out: o.out });
  };

  // ───────── numerals ─────────
  // Proportional numerals that roll in glyph by glyph from below a mask at the baseline (dt: seconds since start).
  // Returns the set width.
  Z.numeral = (ctx, s, x, y, dt, o = {}) => {
    const size = o.size, wt = o.weight || 700, ls = o.ls ?? Z.track(size, 'num');
    ctx.save(); setFont(ctx, size, wt, ls);
    const m = ctx.measureText(s), total = m.width;
    if (o.optical) x += m.actualBoundingBoxLeft;                       // the ink, not the side bearing, sits on the column line
    if (dt > 0) {
      const top = y - size * (o.asc ?? 0.78), bot = y + size * (o.desc ?? 0.03), hh = bot - top;
      ctx.beginPath(); ctx.rect(x - size * 0.3, top, total + size * 0.6, hh); ctx.clip();
      ctx.fillStyle = o.color;
      if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
      const chars = [...s], step = o.stagger ?? 0, dur = o.dur ?? 0.06, q = o.out || 0;
      let acc = '';
      for (let i = 0; i < chars.length; i++) {
        const px = x + ctx.measureText(acc).width;
        acc += chars[i];
        if (chars[i] === ' ') continue;
        const p = Z.snap(dt - i * step, dur);
        if (p <= 0) continue;
        ctx.fillText(chars[i], px, y + (1 - p) * hh * 1.05 - q * hh * 1.05);
      }
    }
    ctx.restore();
    return total;
  };
  // A number line that changes in place: every glyph whose character or position changes rolls (the old glyph leaves
  // upward, the new one rises from below, both inside the line's mask), the last glyph first, `stagger` apart.
  // Proportional figures, flush left: the left edge never moves.
  Z.rollText = (ctx, a, b, x, y, dt, o = {}) => {
    const size = o.size, ls = o.ls ?? Z.track(size, 'num');
    ctx.save(); setFont(ctx, size, o.weight || 700, ls);
    const pos = (s) => { const out = []; let acc = ''; for (const c of [...s]) { out.push(ctx.measureText(acc).width); acc += c; } return out; };
    const A = [...a], Bc = [...b], xa = pos(a), xb = pos(b), n = Math.max(A.length, Bc.length);
    const top = y - size * 0.78, bot = y + size * 0.03, hh = bot - top;
    ctx.beginPath(); ctx.rect(x - size * 0.3, top, Math.max(ctx.measureText(a).width, ctx.measureText(b).width) + size * 0.6, hh); ctx.clip();
    ctx.fillStyle = o.color;
    const step = o.stagger ?? 0, dur = o.dur ?? 0.06;
    for (let i = 0; i < n; i++) {
      const ca = A[i], cb = Bc[i];
      const same = ca !== undefined && ca === cb && Math.abs(xa[i] - xb[i]) < 0.5;
      if (same) { ctx.fillText(cb, x + xb[i], y); continue; }
      const p = Z.snap(dt - (n - 1 - i) * step, dur);
      if (ca !== undefined && ca !== ' ' && p < 1) ctx.fillText(ca, x + xa[i], y - p * hh * 1.05);
      if (cb !== undefined && cb !== ' ' && p > 0) ctx.fillText(cb, x + xb[i], y + (1 - p) * hh * 1.05);
    }
    ctx.restore();
  };
  // Tabular slot layout for numbers that change in place: every slot is as wide as the widest glyph it ever holds
  // (digits and signs share the font's tabular advance), each glyph centred in its slot, so a changing digit never
  // pushes its neighbours. strs: all values the line will show, right-aligned to one length.
  Z.slotLayout = (ctx, strs, o) => {
    const size = o.size, len = Math.max(...strs.map((s) => [...s].length));
    const padded = strs.map((s) => ' '.repeat(len - [...s].length) + s);
    ctx.save(); setFont(ctx, size, o.weight || 700, 0);
    const tab = Math.max(...'0123456789+±'.split('').map((c) => ctx.measureText(c).width));
    const widths = [];
    for (let i = 0; i < len; i++) {
      let w = 0;
      for (const s of padded) { const c = [...s][i]; w = Math.max(w, c === ' ' ? 0 : /[0-9+±]/.test(c) ? tab : ctx.measureText(c).width); }
      widths.push(w + (o.ls ?? Z.track(size, 'num')));
    }
    ctx.restore();
    return { padded, widths, size, weight: o.weight || 700 };
  };
  // Draw a slot line rolling from string a to string b (both padded to the layout): every slot that changes rolls up
  // (old glyph out above, new glyph in from below) within the line's mask, slot by slot from the right, `step` apart.
  Z.slots = (ctx, lay, a, b, x, y, dt, o = {}) => {
    const size = lay.size, top = y - size * 0.78, bot = y + size * 0.03, hh = bot - top;
    const A = [...a], Bc = [...b], n = lay.widths.length;
    ctx.save(); setFont(ctx, size, lay.weight, 0);
    let total = 0;
    for (const w of lay.widths) total += w;
    ctx.beginPath(); ctx.rect(x - size * 0.3, top, total + size * 0.6, hh); ctx.clip();
    ctx.fillStyle = o.color;
    const step = o.stagger ?? 0, dur = o.dur ?? 0.06;
    let cx = x;
    for (let i = 0; i < n; i++) {
      const w = lay.widths[i], ca = A[i] || ' ', cb = Bc[i] || ' ';
      const rank = n - 1 - i;                                                  // the last digit moves first
      const p = ca === cb ? 1 : Z.snap(dt - rank * step, dur);
      const draw = (c, dy) => { if (c !== ' ') { const gw = ctx.measureText(c).width; ctx.fillText(c, cx + (w - gw) / 2, y + dy); } };
      if (ca === cb) draw(cb, 0);
      else { if (p < 1) draw(ca, -p * hh * 1.05); if (p > 0) draw(cb, (1 - p) * hh * 1.05); }
      cx += w;
    }
    ctx.restore();
    return total;
  };

  // ───────── fields, wipes, rules ─────────
  // The grid fields of a construction drawing (6 % ink): 12 columns x 6 rows of modules (o.columnsOnly: 12 strips).
  Z.fields = (ctx, color, o = {}) => {
    const G = Z.geo();
    ctx.save(); ctx.fillStyle = color;
    for (let i = 0; i < G.n; i++) {
      if (o.columnsOnly) { ctx.fillRect(G.x(i), G.my, G.cw, G.bottom - G.my); continue; }
      for (let j = 0; j < G.rows; j++) ctx.fillRect(G.x(i), G.y(j), G.cw, G.rh);
    }
    ctx.restore();
  };
  // Running head of every content page: the project, flush left on column 9, on the kicker's baseline.
  Z.head = (ctx, env, p, o = {}) => {
    const G = Z.geo(), P = env.palette;
    Z.reveal(ctx, 'Haus für Musik', G.x(8), G.my + 14, p, { size: 20, weight: 700, color: o.color || P.ink });
    Z.reveal(ctx, 'Büro Zwölf Architekten', G.x(10), G.my + 14, p, { size: 20, weight: 500, color: o.muted || P.muted });
  };
  // Column wipe along the grid. Slice i (left to right) starts i * step after dt = 0 and snaps over dur.
  //   mode 'cover':   a solid falls from the top edge to the bottom edge (p 0 -> 1 covers the slice)
  //   mode 'uncover': the solid retracts from the bottom edge up into the top edge (p 0 -> 1 clears the slice)
  // o.columns: grid columns only (the gutters and margins stay open); otherwise 12 slices tile the whole frame
  // (each a column plus half its gutters; the outer slices reach the frame edge).
  Z.wipe = (ctx, env, dt, o = {}) => {
    const G = Z.geo(), n = G.n, step = o.step ?? env.beatSec / 16, dur = o.dur ?? env.beatSec / 4;
    const y0 = o.y0 ?? (o.columns ? G.my : 0), y1 = o.y1 ?? (o.columns ? G.bottom : H), h = y1 - y0;
    ctx.save(); ctx.fillStyle = o.color || env.palette.ink;
    for (let i = 0; i < n; i++) {
      const p = Z.snap(dt - i * step, dur);
      const k = o.mode === 'uncover' ? 1 - p : p;
      if (k <= 0) continue;
      const x0 = o.columns ? G.x(i) : i === 0 ? 0 : G.x(i) - G.g / 2, x1 = o.columns ? G.xr(i) : i === n - 1 ? W : G.xr(i) + G.g / 2;
      ctx.fillRect(x0, y0, x1 - x0, h * k);
    }
    ctx.restore();
  };
  // A rule that draws on from x0 to x1 (p 0..1).
  Z.hrule = (ctx, x0, x1, y, p, w, color) => {
    if (p <= 0) return;
    ctx.fillStyle = color; ctx.fillRect(x0, y - w / 2, (x1 - x0) * p, w);
  };
  Z.vrule = (ctx, x, y0, y1, p, w, color) => {             // grows from y0 toward y1 (either direction)
    if (p <= 0) return;
    const a = Math.min(y0, y0 + (y1 - y0) * p), b = Math.max(y0, y0 + (y1 - y0) * p);
    ctx.fillStyle = color; ctx.fillRect(x - w / 2, a, w, b - a);
  };
  Z.square = (ctx, x, y, s, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, s, s); };

  // ───────── drawing marks ─────────
  // Axis: a dash-dot line from yBottom up to yTop (drawn upward over p), then its numbered circle on top (pop at pb).
  Z.axis = (ctx, x, yTop, yBottom, p, label, pb, o = {}) => {
    const P = o.palette, r = o.r ?? 17;
    if (p > 0) {
      ctx.save();
      ctx.beginPath(); ctx.rect(x - 4, yBottom - (yBottom - yTop - r) * p, 8, (yBottom - yTop - r) * p); ctx.clip();
      ctx.strokeStyle = o.color || P.ink; ctx.lineWidth = o.lw ?? 1.5; ctx.setLineDash([16, 5, 2.5, 5]); ctx.lineDashOffset = 0;
      ctx.beginPath(); ctx.moveTo(x, yTop + r); ctx.lineTo(x, yBottom); ctx.stroke();
      ctx.restore();
    }
    if (pb > 0) {
      const on = o.active || 0;                                           // 0..1: the beat cursor fills the circle
      const s = 0.6 + 0.4 * pb;
      ctx.save(); ctx.translate(x, yTop); ctx.scale(s, s);
      circle(ctx, 0, 0, r); ctx.fillStyle = on > 0.5 ? (o.color || P.ink) : P.bg; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = o.color || P.ink; ctx.stroke();
      ctx.restore();
      if (pb > 0.5) {
        const size = o.size || 17, w = Z.width(ctx, label, { size, weight: 500 });
        Z.text(ctx, label, x - w / 2, yTop + size * 0.36, { size, weight: 500, color: on > 0.5 ? P.bg : (o.color || P.ink) });
      }
    }
  };
  // Level mark: a filled triangle standing on the level line (apex down at x, y) and the level in Medium.
  Z.level = (ctx, x, y, label, p, o = {}) => {
    if (p <= 0) return;
    const P = o.palette, s = o.s ?? 13, size = o.size ?? 20;
    ctx.save();
    ctx.beginPath(); ctx.rect(x - s, y - Math.max(s, size) - 8, 200, Math.max(s, size) + 10); ctx.clip();
    const dy = (1 - p) * (Math.max(s, size) + 10);
    ctx.fillStyle = o.color || P.ink;
    ctx.beginPath(); ctx.moveTo(x, y + dy); ctx.lineTo(x - s * 0.62, y - s + dy); ctx.lineTo(x + s * 0.62, y - s + dy); ctx.closePath(); ctx.fill();
    Z.text(ctx, label, x + s * 0.62 + 7, y - 2 + dy, { size, weight: 500, color: o.color || P.ink });
    ctx.restore();
  };
  // Dimension chain along y between the given x ticks: the line draws on over p, every tick (a 45-degree slash and a
  // short extension line) snaps in as the line reaches it, labels pop at pl (0..1 across the bays, left to right).
  Z.chain = (ctx, xs, y, p, labels, pl, o = {}) => {
    const P = o.palette, col = o.color || P.ink, x0 = xs[0], x1 = xs[xs.length - 1], reach = x0 - 14 + (x1 - x0 + 28) * p;
    if (p > 0) {
      ctx.fillStyle = col; ctx.fillRect(x0 - 14, y - 0.75, reach - (x0 - 14), 1.5);
      ctx.save(); ctx.strokeStyle = col; ctx.lineCap = 'butt';
      for (const x of xs) {
        if (x > reach + 0.5) break;
        ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y - 14); ctx.lineTo(x, y + 14); ctx.stroke();
        ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x - 7, y + 7); ctx.lineTo(x + 7, y - 7); ctx.stroke();
      }
      ctx.restore();
    }
    if (labels && pl > 0) {
      const n = labels.length, size = o.size ?? 20;
      for (let i = 0; i < n; i++) {
        const k = clamp(pl * n - i);
        if (k <= 0) break;
        const cx = (xs[i] + xs[i + 1]) / 2, w = Z.width(ctx, labels[i], { size, weight: o.weight ?? 500 });
        Z.reveal(ctx, labels[i], cx - w / 2, y - 9, Z.snap(k, 1), { size, weight: o.weight ?? 500, color: col });
      }
    }
  };

  // ───────── the beat column ─────────
  // During a hold the beat lights one grid column at a time (6 % ink on paper, 6 % paper on black): beat k of the reel
  // lights column k mod 12, the same cell the strip marks below it. A hard cut on every beat, never a fade.
  Z.pulse = (ctx, env, color, o = {}) => {
    if (env.lt < (o.from ?? env.inSec)) return;
    const G = Z.geo(), k = ((Z.beatIndex(env) % G.n) + G.n) % G.n;
    ctx.fillStyle = color; ctx.fillRect(G.x(k), G.my, G.cw, G.bottom - G.my);
  };

  // ───────── the beat strip ─────────
  // A running footer in the bottom margin: one cell per column; the cell of the current beat is solid. Beat k of the
  // reel lights column k mod 12, so the strip runs on across hard cuts. Grid for space, beat for time.
  Z.strip = (ctx, env, o = {}) => {
    const G = Z.geo(), y = o.y ?? G.bottom + 26, h = o.h ?? 8, k = ((Z.beatIndex(env) % G.n) + G.n) % G.n;
    ctx.save();
    for (let i = 0; i < G.n; i++) {
      ctx.fillStyle = i === k ? o.on : o.off;
      ctx.fillRect(G.x(i), y, G.cw, h);
    }
    ctx.restore();
  };
})();
