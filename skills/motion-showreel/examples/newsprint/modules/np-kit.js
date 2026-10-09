// np-kit: the Tamsin Valley Courier's print kit, shared by every scene (a project module, P/modules/*.js).
//
// Everything a press could print, and nothing else: newsprint, two inks (Courier Black and Courier Red), rules,
// type set as slugs, justified columns, a teletype tape, and the press itself.
//
//   NP.ink(hex)                      ink tone that lands exactly on hex after it is multiplied onto newsprint
//   NP.layer(id)                     a cleared W x H ink layer per scene: { c, g } (transparent; draw ink only)
//   NP.paper(ctx, m, o)              newsprint (tileable texture: mottle, fibres, specks) under camera matrix m
//   NP.print(ctx, L, o)              prints an ink layer onto the paper: ink voids, then multiply. o.clipY (only
//                                    what the cylinder has passed), o.dy and o.smear (a sheet pulled off the press)
//   NP.cylinder(ctx, y, o)           the inked press cylinder rolling across the frame at screen y
//   NP.pressIn(env, o) / pressOut    the press-roll transition, timed in beats from env (see below)
//   NP.rule / NP.vrule / NP.oxford   rules that draw on (0.5-pt column rules, the 4-over-1 Oxford rule)
//   NP.slug(g, s, x, y, k, o)        a line of type landing like a cast slug: k = seconds since it lands
//   NP.flag(g, label, x, y, o)       a red section flag with the label reversed out (paper shows through)
//   NP.columns(g, spec) / NP.hy(s)   justified, hyphenated columns (cached layout) / soft hyphens for long words
//   NP.tape(g, x, y, w, text, lt, o) the Valley Wire teletype tape: one character per 16th note
//   NP.cam(k, fx, fy, ox, oy)        camera matrix: scale k about focus (fx, fy) placed at screen (ox, oy)
//
// The press roll (stylebook: "Pages change the way the press changes them, by rolling"): the outgoing page is
// pulled off upward with its own edge and motion smear (pressOut over the scene's out-phase), the compositor cuts
// on the bar line, and the incoming page is printed by an inked cylinder that rolls down the fresh sheet (pressIn:
// only what the cylinder has passed carries ink). Both halves share these functions, so the seam is exact.
// Pure functions of their arguments; textures are built once from hash() and cached.
(() => {
  const NP = (window.NP = window.NP || {});
  const PAPER = '#E4E0D6';

  // ───────── colour ─────────
  // Multiply darkens: ink drawn as hex / paper (per channel) lands on hex over the paper's base colour.
  const inkCache = new Map();
  NP.ink = (hex, paper = PAPER) => {
    const k = hex + paper;
    if (inkCache.has(k)) return inkCache.get(k);
    const [r, g, b] = parseColor(hex), [pr, pg, pb] = parseColor(paper);
    const out = toHex([Math.min(255, (r * 255) / pr), Math.min(255, (g * 255) / pg), Math.min(255, (b * 255) / pb)]);
    inkCache.set(k, out);
    return out;
  };

  // ───────── layers ─────────
  const layers = {};
  NP.layer = (id) => {
    if (!layers[id]) layers[id] = makeBuf(W, H);
    const L = layers[id], g = L.g;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.filter = 'none';
    g.letterSpacing = '0px'; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    g.clearRect(0, 0, W, H);
    return L;
  };
  let scratch = null;
  const scratchBuf = () => (scratch || (scratch = makeBuf(W, H)));

  // ───────── newsprint ─────────
  let tile = null, voids = null;
  function wrapDraw(S, x, y, r, fn) {           // draw near-edge features again on the far side: a seamless tile
    for (const dx of [0, x < r ? S : x > S - r ? -S : 0]) for (const dy of [0, y < r ? S : y > S - r ? -S : 0]) fn(x + dx, y + dy);
  }
  // Newsprint is an even, light sheet: a faint formation (cloudiness about +-1.5 %), short fibres, a few specks
  // of recycled fibre and a per-pixel tooth. Gradients fade to the SAME colour at alpha 0 (canvas interpolates
  // unpremultiplied, so a fade to transparent black would darken every blob's rim). The tile is 2048 px wide, so
  // a frame never shows it twice; its mean stays on the paper colour (light and dark features balance).
  function paperTile() {
    if (tile) return tile;
    const S = 2048, b = makeBuf(S, S), g = b.g;
    g.fillStyle = PAPER; g.fillRect(0, 0, S, S);
    const blob = (X, Y, r, rgb, a) => {
      g.fillStyle = radial(g, X, Y, 0, r, [[0, `rgba(${rgb},${a})`], [0.55, `rgba(${rgb},${a * 0.45})`], [1, `rgba(${rgb},0)`]]);
      g.fillRect(X - r, Y - r, r * 2, r * 2);
    };
    for (let i = 0; i < 2600; i++) {                                  // formation: fine, low-contrast flocs
      const x = hash(i * 3.17) * S, y = hash(i * 7.31 + 2) * S, r = 10 + Math.pow(hash(i * 1.93), 1.6) * 46, light = hash(i * 5.7) < 0.5;
      const a = 0.010 + hash(i * 9.1) * 0.014;
      wrapDraw(S, x, y, r, (X, Y) => blob(X, Y, r, light ? '255,253,246' : '96,86,70', a));
    }
    g.lineCap = 'round';
    for (let i = 0; i < 5200; i++) {                                  // fibres: short, curved, mostly darker
      const x = hash(i * 1.71 + 9) * S, y = hash(i * 2.39 + 4) * S, L = 3 + Math.pow(hash(i * 4.47), 2.2) * 16, a0 = hash(i * 6.13) * TAU;
      const bend = (hash(i * 8.9) - 0.5) * 0.9, dark = hash(i * 3.3) < 0.7;
      g.strokeStyle = dark ? `rgba(92,80,62,${0.035 + hash(i * 2.2) * 0.05})` : `rgba(255,253,246,${0.06 + hash(i * 2.2) * 0.08})`;
      g.lineWidth = 0.45 + hash(i * 5.5) * 0.5;
      wrapDraw(S, x, y, 24, (X, Y) => {
        g.beginPath(); g.moveTo(X, Y);
        g.quadraticCurveTo(X + Math.cos(a0 + bend) * L * 0.6, Y + Math.sin(a0 + bend) * L * 0.6, X + Math.cos(a0) * L, Y + Math.sin(a0) * L);
        g.stroke();
      });
    }
    for (let i = 0; i < 520; i++) {                                   // specks of recycled fibre (a few dark, most faint)
      const x = hash(i * 9.71 + 1) * S, y = hash(i * 4.11 + 7) * S, r = 0.35 + Math.pow(hash(i * 2.9), 4) * 1.3;
      g.fillStyle = `rgba(52,45,36,${0.12 + Math.pow(hash(i * 6.6), 2) * 0.4})`;
      circle(g, x, y, r); g.fill();
    }
    const im = g.getImageData(0, 0, S, S), d = im.data;              // tooth: a fine per-pixel grain baked in the sheet
    let sum = 0;
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      const n = (hash(p * 0.6180339 + 0.5) - 0.5) * 6;
      d[i] = clamp(d[i] + n, 0, 255); d[i + 1] = clamp(d[i + 1] + n, 0, 255); d[i + 2] = clamp(d[i + 2] + n * 0.9, 0, 255);
      sum += d[i + 1];
    }
    const [, pg] = parseColor(PAPER), shift = pg - sum / (S * S);       // keep the sheet's mean on the paper colour
    if (Math.abs(shift) > 0.4) for (let i = 0; i < d.length; i += 4) { d[i] += shift; d[i + 1] += shift; d[i + 2] += shift; }
    g.putImageData(im, 0, 0);
    return (tile = b.c);
  }
  function voidTile() {                                               // where the ink did not take: specks and fibre lines
    if (voids) return voids;
    const S = 512, b = makeBuf(S, S), g = b.g;
    g.clearRect(0, 0, S, S);
    for (let i = 0; i < 2600; i++) {
      const x = hash(i * 2.13 + 3) * S, y = hash(i * 5.07 + 1) * S, r = 0.3 + Math.pow(hash(i * 7.7), 2) * 1.1;
      g.fillStyle = `rgba(0,0,0,${0.2 + hash(i * 1.9) * 0.45})`; circle(g, x, y, r); g.fill();
    }
    g.lineCap = 'round';
    for (let i = 0; i < 500; i++) {
      const x = hash(i * 3.9 + 5) * S, y = hash(i * 6.3 + 8) * S, L = 4 + hash(i * 2.7) * 14, a = hash(i * 8.1) * TAU;
      g.strokeStyle = `rgba(0,0,0,${0.12 + hash(i * 4.4) * 0.18})`; g.lineWidth = 0.6;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke();
    }
    return (voids = b.c);
  }
  const patterns = new WeakMap();
  function patternFor(ctx, img) {
    let m = patterns.get(ctx);
    if (!m) patterns.set(ctx, (m = new Map()));
    if (!m.has(img)) m.set(img, ctx.createPattern(img, 'repeat'));
    return m.get(img);
  }
  // Fill the frame with newsprint. m = camera DOMMatrix (page -> screen); o.dy shifts the sheet (screen px);
  // o.smear = vertical motion blur in px (a sheet moving fast).
  NP.paper = (ctx, m = null, o = {}) => {
    const pat = patternFor(ctx, paperTile());
    const base = m ? DOMMatrix.fromMatrix(m) : new DOMMatrix();
    const n = o.smear > 1 ? Math.min(9, Math.ceil(o.smear / 6)) : 1;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < n; i++) {
      const off = n > 1 ? (i / (n - 1) - 0.5) * o.smear : 0;
      pat.setTransform(new DOMMatrix().translate(0, (o.dy || 0) + off).multiply(base));
      ctx.globalAlpha = i === 0 ? 1 : 1 / (i + 1);
      ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  };
  // Print ink layer L onto ctx (which already holds the paper). o.m: camera matrix (moves the void texture with
  // the page); o.clipY: only y < clipY is printed (the cylinder's wake); o.dy, o.smear: the sheet pulled off;
  // o.edge: draw the sheet's lower edge at screen y o.edge (a sheet leaving the press); o.voids (0..1, default 0.55).
  NP.print = (ctx, L, o = {}) => {
    const g = L.g, va = o.voids ?? 0.55;
    if (va > 0) {
      const pat = patternFor(g, voidTile());
      pat.setTransform(o.m ? DOMMatrix.fromMatrix(o.m) : new DOMMatrix());
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'destination-out'; g.globalAlpha = va;
      g.fillStyle = pat; g.fillRect(0, 0, W, H);
      g.restore();
    }
    ctx.save();
    if (o.clipY != null) { ctx.beginPath(); ctx.rect(0, -10, W, Math.max(0, o.clipY + 10)); ctx.clip(); }
    ctx.globalCompositeOperation = 'multiply';
    const dy = o.dy || 0, sm = o.smear || 0, n = sm > 1 ? Math.min(10, Math.ceil(sm / 5)) : 1;
    for (let i = 0; i < n; i++) {
      const off = n > 1 ? (i / (n - 1) - 0.5) * sm : 0;
      ctx.globalAlpha = (o.alpha ?? 1) * (n > 1 ? 1.6 / n : 1);
      ctx.drawImage(L.c, 0, dy + off);
    }
    ctx.restore();
  };
  // The sheet being pulled off the press: the old page (paper + ink) moves up by -dy, smeared, over the fresh sheet.
  // drawPage(ctx2) paints the old page (paper and ink) into a scratch buffer at rest.
  NP.pullSheet = (ctx, drawPage, st) => {
    if (st.dy >= 0 || -st.dy < H + 40) {
      const S = scratchBuf();
      S.g.setTransform(1, 0, 0, 1, 0, 0); S.g.globalCompositeOperation = 'source-over'; S.g.globalAlpha = 1; S.g.clearRect(0, 0, W, H);
      drawPage(S.g);
      const n = st.smear > 1 ? Math.min(12, Math.ceil(st.smear / 5)) : 1;
      ctx.save();
      for (let i = 0; i < n; i++) {
        const off = n > 1 ? (i / (n - 1) - 0.5) * st.smear : 0;
        ctx.globalAlpha = n > 1 ? (i === 0 ? 1 : 1 / (i + 1)) : 1;
        ctx.drawImage(S.c, 0, st.dy + off);
      }
      ctx.restore();
      const ey = H + st.dy;                                            // its lower edge: a crisp line and a soft contact
      if (ey > -20 && ey < H + 20) {
        ctx.save();
        ctx.fillStyle = linear(ctx, 0, ey, 0, ey + 26, [[0, 'rgba(29,27,24,0.16)'], [1, 'rgba(29,27,24,0)']]);
        ctx.fillRect(0, ey, W, 26);
        ctx.fillStyle = 'rgba(29,27,24,0.28)'; ctx.fillRect(0, ey - 1, W, 1.5);
        ctx.restore();
      }
    }
  };

  // ───────── the press ─────────
  // The inked cylinder seen from above: a band across the frame at screen y (its axis), o.h tall, o.t rotates
  // the ink film (rolling), o.k scales it with the camera.
  NP.cylinder = (ctx, y, o = {}) => {
    const h = (o.h ?? 92) * (o.k ?? 1), t = o.t ?? 0, top = y - h / 2;
    if (top > H + 60 || top + h < -60) return;
    ctx.save();
    ctx.fillStyle = linear(ctx, 0, top - 46, 0, top, [[0, 'rgba(29,27,24,0)'], [1, 'rgba(29,27,24,0.22)']]);   // contact shade
    ctx.fillRect(0, top - 46, W, 46);
    ctx.fillStyle = linear(ctx, 0, top + h, 0, top + h + 60, [[0, 'rgba(29,27,24,0.3)'], [1, 'rgba(29,27,24,0)']]);
    ctx.fillRect(0, top + h, W, 60);
    ctx.fillStyle = linear(ctx, 0, top, 0, top + h, [[0, '#0B0A09'], [0.18, '#2A2723'], [0.34, '#57524B'], [0.42, '#2B2824'], [0.7, '#141311'], [1, '#050505']]);
    ctx.fillRect(0, top, W, h);
    for (let i = 0; i < 7; i++) {                                     // the ink film turning: seams that travel round
      const ph = (((t * 0.9 + i / 7) % 1) + 1) % 1, a = Math.sin(Math.PI * ph);
      const yy = top + h * (0.5 - 0.5 * Math.cos(Math.PI * ph));
      ctx.fillStyle = `rgba(255,255,255,${0.05 * a})`; ctx.fillRect(0, yy, W, 1.2 + 1.6 * a);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(0, top + h * 0.3, W, Math.max(1, h * 0.035));      // specular line
    ctx.restore();
  };
  // pressIn: the cylinder rolls from above the frame to below it over o.beats (from o.at beats), on an ease that
  // starts with momentum. Returns { y (cylinder axis, screen), clipY (printed above), t (rotation), done }.
  NP.pressIn = (env, o = {}) => {
    const b = env.beatSec, at = (o.at ?? 0) * b, dur = (o.beats ?? 1.5) * b, y0 = o.from ?? -46, y1 = o.to ?? H + 120;
    const p = clamp((env.lt - at) / dur), e = 1 - Math.pow(1 - p, 2.2);   // already rolling when it enters
    const y = lerp(y0, y1, e);
    return { y, clipY: p >= 1 ? null : y, t: (y - y0) / 90, done: p >= 1, p };
  };
  // pressOut over the scene's out-phase: the printed sheet is pulled off upward, accelerating (inCubic), with a
  // motion smear proportional to its speed. Returns { dy (<= 0), smear }.
  NP.pressOut = (env, o = {}) => {
    const q = env.phase.out, dist = o.dist ?? H * 1.15, outSec = Math.max(1e-3, env.outSec);
    const dy = -dist * Math.pow(q, 3), v = (3 * dist * q * q) / outSec;   // px/s
    return { dy, smear: Math.min(90, (v / FPS) * 0.9), q };
  };

  // ───────── rules ─────────
  // Horizontal rule from x, width w, line weight lw, drawn on by p (0..1) from the left (o.from 'left'|'center').
  NP.rule = (g, x, y, w, lw, p = 1, color = NP.ink('#1D1B18'), o = {}) => {
    if (p <= 0) return;
    const e = clamp(p), ww = w * e, x0 = o.from === 'center' ? x + (w - ww) / 2 : o.from === 'right' ? x + w - ww : x;
    g.fillStyle = color; g.fillRect(x0, y - lw / 2, ww, lw);
  };
  NP.vrule = (g, x, y, h, lw, p = 1, color = NP.ink('#1D1B18')) => {
    if (p <= 0) return;
    g.fillStyle = color; g.fillRect(x - lw / 2, y, lw, h * clamp(p));
  };
  NP.oxford = (g, x, y, w, p = 1, color = NP.ink('#1D1B18'), o = {}) => {   // 4 pt over 1 pt, scaled
    const k = o.k ?? 1;
    NP.rule(g, x, y, w, 5 * k, p, color, o);
    NP.rule(g, x, y + 7.5 * k, w, 1.5 * k, clamp(p * 1.08 - 0.08), color, o);
  };

  // ───────── type ─────────
  // A slug lands: k = seconds since impact (negative before). It descends the last 0.12 s (scale 1.07 -> 1,
  // accelerating, so the hit is at k = 0), then the ink spreads for a moment. o: size, weight, fam, color, ls,
  // align, spread (px of extra stroke at impact), from (descent seconds). Returns the line width.
  NP.slug = (g, s, x, y, k, o = {}) => {
    const pre = o.from ?? 0.12;
    if (k < -pre) return 0;
    const size = o.size || 48, p = clamp((k + pre) / pre), e = Ease.inQ(p), sc = lerp(o.scale0 ?? 1.07, 1, e);
    g.save();
    g.font = font(size, o.weight ?? 800, o.fam || 'display');
    g.letterSpacing = (o.ls ?? 0) + 'px';
    g.textAlign = o.align || 'left'; g.textBaseline = 'alphabetic';
    const w = g.measureText(s).width;
    const ax = o.align === 'center' ? x : o.align === 'right' ? x - w / 2 : x + w / 2;   // scale about the line centre
    g.translate(ax, y - size * 0.35); g.scale(sc, sc); g.translate(-ax, -(y - size * 0.35));
    g.globalAlpha *= clamp(p * 2.2) * (o.alpha ?? 1);
    g.fillStyle = o.color || NP.ink('#1D1B18');
    g.fillText(s, x, y);
    const spread = (o.spread ?? Math.max(1, size * 0.018)) * Math.exp(-Math.max(0, k) * 16) * (k >= 0 ? 1 : 0);
    if (spread > 0.05) { g.strokeStyle = g.fillStyle; g.lineWidth = spread; g.lineJoin = 'round'; g.strokeText(s, x, y); }
    g.restore();
    return w;
  };
  // Red section flag, label reversed out of the red (the paper shows through). Returns the flag width.
  NP.flag = (g, label, x, y, o = {}) => {
    const size = o.size ?? 15, padX = size * 0.62, h = size * 1.75;
    g.save();
    g.font = font(size, 800, 'sans'); g.letterSpacing = size * 0.1 + 'px';
    const w = g.measureText(label).width - size * 0.1 + padX * 2;
    const p = o.p ?? 1, ww = w * clamp(p);
    g.fillStyle = o.color || NP.ink('#B9202A'); g.fillRect(x, y - h, ww, h);
    if (p >= 1) {
      g.globalCompositeOperation = 'destination-out';
      g.fillStyle = '#000'; g.textBaseline = 'alphabetic';
      g.fillText(label, x + padX, y - h * 0.29);
    }
    g.restore();
    return w;
  };

  // Soft hyphens for long words (VC|CV and V|CV breaks, at least 3 letters on each side): narrow columns justify
  // without rivers. Words in o.keep are never broken.
  const V = /[aeiouyAEIOUY]/;
  NP.hy = (s) => s.replace(/[A-Za-z’']{8,}/g, (w) => {
    if (/[’']/.test(w) || /^[A-Z]/.test(w)) return w;
    let out = '', last = 0;
    for (let i = 3; i <= w.length - 3; i++) {
      const a = w[i - 1], b = w[i], c = w[i + 1] || '';
      const brk = (V.test(a) && !V.test(b) && c && !V.test(c) && b !== c ? i + 1 : V.test(a) && !V.test(b) && V.test(c) ? i : -1);
      if (brk > 0 && brk - last >= 3 && w.length - brk >= 3 && brk >= 3) { out += w.slice(last, brk) + '­'; last = brk; i = brk; }
    }
    return out + w.slice(last);
  });
  // Justified columns. spec: { paras: [{ text, dateline? }], x, y, colW, gutter, cols, lineH, size, weight, fam,
  // maxLines (per column), indent (px, every paragraph but the first), dateline: { fam, weight, size, ls } }.
  // Returns lines [{ col, x, y, words: [{s, w, f}], gap, last }]. Cached by spec (measured once).
  const colCache = new Map();
  NP.columns = (g, spec) => {
    const key = JSON.stringify(spec);
    if (colCache.has(key)) return colCache.get(key);
    const f = font(spec.size, spec.weight ?? 400, spec.fam || 'serif');
    const D = spec.dateline || {}, fd = font(D.size ?? spec.size * 0.86, D.weight ?? 800, D.fam || 'sans');
    g.save(); g.letterSpacing = '0px';
    const mw = (s, ff, ls = 0) => { g.font = ff; g.letterSpacing = ls + 'px'; const w = g.measureText(s.replace(/­/g, '')).width; g.letterSpacing = '0px'; return w; };
    g.font = f;
    const space = g.measureText(' ').width;
    const lines = [];
    spec.paras.forEach((para, pi) => {
      const words = [];
      if (para.dateline) words.push({ s: para.dateline, w: mw(para.dateline, fd, D.ls ?? spec.size * 0.05), f: 'd' });
      for (const t of para.text.split(/\s+/).filter(Boolean)) words.push({ s: t, w: mw(t, f), f: 'b' });
      const indent = pi > 0 && !para.dateline ? (spec.indent ?? spec.size) : 0;
      let line = [], width = 0, first = true;
      const avail = () => spec.colW - (first ? indent : 0);
      const push = (last) => { lines.push({ words: line, nat: width, last, indent: first ? indent : 0 }); line = []; width = 0; first = false; };
      for (let wi = 0; wi < words.length; wi++) {
        const wd = words[wi], add = (line.length ? space : 0) + wd.w;
        if (width + add <= avail() || !line.length) { line.push(wd); width += add; continue; }
        // try a hyphen break of the word at a soft hyphen
        const parts = wd.s.split('­');
        let done = false;
        if (parts.length > 1 && wd.f === 'b') {
          for (let k = parts.length - 1; k >= 1; k--) {
            const head = parts.slice(0, k).join('') + '-', hw = mw(head, f);
            if (width + space + hw <= avail()) {
              line.push({ s: head, w: hw, f: 'b' }); width += space + hw; push(false);
              const tail = parts.slice(k).join('­');
              words.splice(wi + 1, 0, { s: tail, w: mw(tail, f), f: 'b' });
              done = true; break;
            }
          }
        }
        if (!done) { push(false); line.push(wd); width = wd.w; }
      }
      if (line.length) push(true);
    });
    g.restore();
    const out = [], per = spec.maxLines ?? 999;
    lines.forEach((ln, i) => {
      const col = Math.floor(i / per), row = i % per;
      if (col >= (spec.cols ?? 1)) return;
      const n = ln.words.length, slack = spec.colW - ln.indent - ln.nat, just = !ln.last && n > 1 && slack < spec.colW * 0.45;
      let gap = space, ls = 0;
      if (just) {
        const chars = ln.words.reduce((a, w) => a + [...w.s.replace(/\u00AD/g, '')].length, 0);
        gap = Math.min(space + slack / (n - 1), space * 1.9);
        ls = Math.min(spec.size * 0.05, (slack - (gap - space) * (n - 1)) / Math.max(1, chars));
        gap = space + (slack - ls * chars) / (n - 1);
      }
      out.push({ col, row, x: spec.x + col * (spec.colW + spec.gutter) + ln.indent, y: spec.y + row * spec.lineH, words: ln.words, gap, ls, last: ln.last });
    });
    colCache.set(key, out);
    if (colCache.size > 40) colCache.delete(colCache.keys().next().value);
    return out;
  };
  // Draw laid-out column lines. o.reveal(i, line) -> 0..1 (line visibility; default 1); o.color, o.dateColor.
  NP.drawColumns = (g, lines, spec, o = {}) => {
    const f = font(spec.size, spec.weight ?? 400, spec.fam || 'serif');
    const D = spec.dateline || {}, fd = font(D.size ?? spec.size * 0.86, D.weight ?? 800, D.fam || 'sans');
    g.save(); g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    const col = o.color || NP.ink('#1D1B18');
    lines.forEach((ln, i) => {
      const a = o.reveal ? o.reveal(i, ln) : 1;
      if (a <= 0) return;
      g.globalAlpha = a;
      let x = ln.x;
      for (const wd of ln.words) {
        if (wd.f === 'd') { g.font = fd; g.letterSpacing = (D.ls ?? spec.size * 0.05) + 'px'; g.fillStyle = o.dateColor || col; }
        else { g.font = f; g.letterSpacing = '0px'; g.fillStyle = col; }
        g.fillText(wd.s.replace(/­/g, ''), x, ln.y);
        x += wd.w + ln.gap;
      }
    });
    g.restore();
  };

  // ───────── the Valley Wire tape ─────────
  // A strip of tape with Courier Prime capitals that steps left one character per 16th note, like a teletype.
  // lt: seconds on the scene clock; o: size, h, label (red box at the left), lead (characters already printed at
  // lt = 0), step (beats per character, default 1/4), beatSec. Returns the tape's character index.
  NP.tape = (g, x, y, w, text, lt, o = {}) => {
    const size = o.size ?? 26, h = o.h ?? size * 2.1, step = (o.step ?? 0.25) * o.beatSec, adv = size * 0.6;
    g.save();
    g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.fillStyle = NP.ink(o.tapeColor || '#EFECE4'); g.fillRect(x, y, w, h);
    NP.rule(g, x, y + 0.75, w, 1.5); NP.rule(g, x, y + h - 0.75, w, 1.5);
    const k = lt / step, n = Math.floor(k), f = k - n, slide = Ease.outQuint(clamp(f / 0.35));   // a quick step, then still
    const lead = o.lead ?? 0, pos = n + slide + lead;
    const unit = text + '   ·   ', ulen = [...unit].length;
    g.font = font(size, o.weight ?? 700, 'mono'); g.textBaseline = 'middle'; g.fillStyle = NP.ink('#1D1B18');
    const lw = o.labelW ?? 0, x0 = x + w - pos * adv;                  // characters enter at the right edge (the print head)
    const first = Math.max(0, Math.floor((x + lw - x0) / adv) - 1), last = Math.min(Math.ceil(pos), first + Math.ceil(w / adv) + 2);
    for (let i = first; i < last; i++) {
      const ch = unit[((i % ulen) + ulen) % ulen];
      if (ch === ' ') continue;
      g.fillText(ch, x0 + i * adv, y + h / 2 + 1);
    }
    g.restore();
    if (o.label) {
      g.save();
      const lab = o.label, ls = size * 0.5 * 0.1;
      g.fillStyle = NP.ink('#B9202A'); g.fillRect(x, y, lw, h);
      g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000';
      g.font = font(size * 0.56, 800, 'sans'); g.letterSpacing = ls * 1.6 + 'px'; g.textBaseline = 'middle'; g.textAlign = 'center';
      g.fillText(lab, x + lw / 2, y + h / 2 + 1);
      g.restore();
    }
    return pos;
  };

  // ───────── camera ─────────
  // Page coordinates -> screen: scale k about the page point (fx, fy), which lands at screen (ox, oy).
  NP.cam = (k, fx, fy, ox = W / 2, oy = H / 2) => new DOMMatrix().translate(ox, oy).scale(k).translate(-fx, -fy);
  NP.apply = (m, x, y) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
})();
