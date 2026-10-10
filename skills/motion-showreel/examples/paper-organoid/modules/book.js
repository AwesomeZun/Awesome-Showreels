// book: the lab notebook (a project module). The reel is one notebook on the bench, a spread per scene: warm paper with
// a faint blue grid and printed header fields, the gutter's shadow, the page edges of the rest of the book. Prints are
// taped in (washi tape slapped on at the corners, a shadow under each print), the pen writes the notes by itself
// (Caveat through the ink kit's self-writing handwriting, with the pen drawn at the stroke's head), and at the end of a
// scene the right page turns over the gutter. The organoid is drawn in code as a brightfield image: one stem cell, a
// cluster, a hollow cyst, then crypt buds pushing out on the days the growth data gives, with a phase halo. The 96-well
// plate fills well by well from the plate data. Exposes window.BOOK.
(() => {
  let D = null, M = null;
  const data = () => (D || (D = ASSET('data/organoid.json')));
  const meta = () => (M || (M = ASSET('ill/meta.json')));
  const ill = (n) => ASSET('ill/' + n + '.webp');
  const PAPER = '#F4EFE4', GRID = '#3D6FB6', INK = '#26221D', MAG = '#C2185B', GRN = '#2E7D32', BLUE = '#3D6FB6';
  const PG = { L: { x: 150, y: 70, w: 800, h: 940 }, R: { x: 970, y: 70, w: 800, h: 940 } };
  // ───────── the bench and the spread
  let PAPERTEX = null;
  function paperTex() {                                               // grain, made once
    if (PAPERTEX) return PAPERTEX;
    const b = makeBuf(800, 940), g = b.g; g.fillStyle = PAPER; g.fillRect(0, 0, 800, 940);
    const im = g.getImageData(0, 0, 800, 940), d = im.data;
    for (let i = 0; i < d.length; i += 4) { const n = (hash(i * 0.37) - 0.5) * 9; d[i] += n; d[i + 1] += n; d[i + 2] += n * 0.9; }
    g.putImageData(im, 0, 0);
    g.strokeStyle = rgba(GRID, 0.13); g.lineWidth = 1;
    for (let x = 40; x < 800; x += 24) { g.beginPath(); g.moveTo(x, 110); g.lineTo(x, 920); g.stroke(); }
    for (let y = 110; y < 930; y += 24) { g.beginPath(); g.moveTo(40, y); g.lineTo(780, y); g.stroke(); }
    PAPERTEX = b.c; return b.c;
  }
  function desk(ctx) {
    ctx.fillStyle = '#2D2924'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = radial(ctx, W * 0.32, H * 0.2, 0, W * 0.9, [[0, 'rgba(255,236,206,0.10)'], [1, 'rgba(0,0,0,0.35)']]); ctx.fillRect(0, 0, W, H);
  }
  // the blank page with its printed header; o.page number
  function page(ctx, side, o = {}) {
    const p = PG[side];
    ctx.save(); ctx.translate(p.x, p.y);
    ctx.drawImage(paperTex(), 0, 0);
    ctx.fillStyle = rgba(BLUE, 0.55); ctx.font = `600 13px ${FAM.mono}`; if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
    ctx.fillText('PROJECT', 40, 58); ctx.fillText('DATE', 470, 58); ctx.fillText('PAGE', 690, 58);
    ctx.fillStyle = rgba(BLUE, 0.4); ctx.fillRect(128, 62, 320, 1.2); ctx.fillRect(520, 62, 150, 1.2); ctx.fillRect(740, 62, 40, 1.2);
    if (o.page) { ctx.fillStyle = rgba(BLUE, 0.7); ctx.font = `500 17px ${FAM.mono}`; ctx.fillText(String(o.page), 744, 58); }
    // the gutter's shadow on this page
    const gx = side === 'L' ? 800 : 0, gw = 70;
    ctx.fillStyle = linear(ctx, gx, 0, side === 'L' ? gx - gw : gx + gw, 0, [[0, 'rgba(60,40,20,0.22)'], [1, 'rgba(60,40,20,0)']]);
    ctx.fillRect(side === 'L' ? gx - gw : 0, 0, gw, 940);
    ctx.restore();
  }
  function spread(ctx, o = {}) {
    // the rest of the book under the spread: a few page edges and the cover's shadow
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.filter = 'blur(18px)'; ctx.fillRect(140, 86, 1640, 946); ctx.restore();
    ctx.fillStyle = '#5B3A29'; rr(ctx, 132, 60, 1656, 966, 10); ctx.fill();
    for (let k = 4; k >= 1; k--) { ctx.fillStyle = k % 2 ? '#E7E0D2' : '#EFE9DC'; ctx.fillRect(150 - k * 2, 70 + k * 2, 800, 940); ctx.fillRect(970 + k * 2, 70 + k * 2, 800, 940); }
    page(ctx, 'L', { page: o.pages && o.pages[0] }); page(ctx, 'R', { page: o.pages && o.pages[1] });
  }
  // ctx in a page's own coordinates (origin top left of the page)
  function onPage(ctx, side, fn) { const p = PG[side]; ctx.save(); ctx.translate(p.x, p.y); fn(ctx); ctx.restore(); }
  // ───────── tape, prints, the pen
  function tape(ctx, x, y, w, rot, k = 1) {
    if (k <= 0) return; const e = Ease.outBack(clamp(k)), s = 1.25 - 0.25 * e;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.globalAlpha *= clamp(k * 3);
    ctx.fillStyle = 'rgba(240,226,160,0.78)'; ctx.beginPath();
    const h = 34; ctx.moveTo(-w / 2, -h / 2);
    for (let i = 0; i <= 6; i++) ctx.lineTo(-w / 2 + (i % 2 ? 4 : 0), -h / 2 + (i / 6) * h);
    ctx.lineTo(w / 2, h / 2);
    for (let i = 6; i >= 0; i--) ctx.lineTo(w / 2 - (i % 2 ? 4 : 0), -h / 2 + (i / 6) * h);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(-w / 2, -h / 2 + 4, w, 5);
    ctx.restore();
  }
  // a print taped to the page: o.img (an image) or o.draw(g, w, h) (live content), a white border, a soft shadow;
  // k drops it in
  function print(ctx, x, y, w, h, rot, k, o = {}) {
    if (k <= 0) return; const e = Ease.outExpo(clamp(k)), lift = 1 - e;
    ctx.save(); ctx.translate(x + w / 2, y + h / 2 - lift * 120); ctx.rotate(rot + lift * 0.12); ctx.globalAlpha *= clamp(k * 2.5);
    ctx.save(); ctx.translate(6 + lift * 20, 10 + lift * 30); ctx.filter = `blur(${8 + lift * 14}px)`; ctx.fillStyle = 'rgba(40,28,14,0.35)'; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.restore();
    ctx.fillStyle = o.border || '#FBF9F4'; ctx.fillRect(-w / 2, -h / 2, w, h);
    const m = o.margin ?? 14;
    ctx.save(); ctx.beginPath(); ctx.rect(-w / 2 + m, -h / 2 + m, w - 2 * m, h - 2 * m - (o.foot || 0)); ctx.clip();
    ctx.translate(-w / 2 + m, -h / 2 + m);
    if (o.img) { const im = o.img, s = Math.max((w - 2 * m) / im.naturalWidth, (h - 2 * m - (o.foot || 0)) / im.naturalHeight); ctx.drawImage(im, (w - 2 * m - im.naturalWidth * s) / 2, (h - 2 * m - (o.foot || 0) - im.naturalHeight * s) / 2, im.naturalWidth * s, im.naturalHeight * s); }
    if (o.draw) o.draw(ctx, w - 2 * m, h - 2 * m - (o.foot || 0));
    ctx.restore();
    if (o.caption) { ctx.fillStyle = 'rgba(38,34,29,0.75)'; ctx.font = `500 16px ${FAM.mono}`; ctx.fillText(o.caption, -w / 2 + m, h / 2 - 14); }
    ctx.restore();
  }
  function pen(ctx, x, y, o = {}) {
    const im = ill('pen'), m = meta().pen, s = o.s ?? 0.62; if (!im) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? 0);
    ctx.save(); ctx.translate(14, 18); ctx.filter = 'blur(10px)'; ctx.globalAlpha = 0.28; ctx.drawImage(im, -m.tip[0] * s, -m.tip[1] * s, m.size[0] * s, m.size[1] * s); ctx.restore();
    ctx.drawImage(im, -m.tip[0] * s, -m.tip[1] * s, m.size[0] * s, m.size[1] * s);
    ctx.restore();
  }
  // handwriting: the ink kit's self-writing text in Caveat; returns the pen head (or null) and whether it is done
  const write = (ctx, s, x, y, k, o = {}) => SN.write(ctx, s, x, y, k, { fam: 'pen', weight: o.weight || 500, size: o.size || 44, color: o.color || INK, seed: o.seed || 3, wob: 0.03, tilt: 0.03, ...o });
  const units = (s, o = {}) => SN.textUnits(s, { fam: 'pen', weight: o.weight || 500 });
  // a pen-drawn line (with a little wobble) revealed to progress k
  function inkLine(ctx, pts, k, o = {}) {
    if (k <= 0) return; const P = SN.hand(pts, { amp: o.amp ?? 0.8, step: 4, seed: o.seed || 1 });
    const n = Math.max(2, Math.floor(P.length * clamp(k)));
    ctx.save(); ctx.strokeStyle = o.color || INK; ctx.lineWidth = o.w || 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha *= o.a ?? 0.92;
    ctx.beginPath(); for (let i = 0; i < n; i++) (i ? ctx.lineTo(P[i][0], P[i][1]) : ctx.moveTo(P[i][0], P[i][1])); ctx.stroke(); ctx.restore();
    return P[n - 1];
  }
  // ───────── the page turn: the right page swings over the gutter; front = its content, back = blank paper
  function turn(ctx, k, front, next) {
    if (k <= 0) return; const a = Ease.ioC(clamp(k)) * Math.PI, c = Math.cos(a), p = PG.R;
    page(ctx, 'R', { page: next });                                    // the next page, under the one that turns
    ctx.save();
    if (c > 0) {
      const b = turn.buf || (turn.buf = makeBuf(p.w, p.h)); b.g.setTransform(1, 0, 0, 1, 0, 0); b.g.clearRect(0, 0, p.w, p.h);
      b.g.drawImage(paperTex(), 0, 0); front(b.g);
      ctx.fillStyle = `rgba(30,20,10,${0.25 * c})`; ctx.fillRect(p.x, p.y, p.w, p.h);  // the next page, in the turning page's shade
      ctx.translate(p.x, p.y); ctx.scale(c, 1); ctx.drawImage(b.c, 0, 0);
      ctx.fillStyle = `rgba(40,25,10,${0.35 * (1 - c)})`; ctx.fillRect(0, 0, p.w, p.h);
    } else {
      ctx.translate(p.x - 20, p.y); ctx.scale(c, 1); ctx.drawImage(paperTex(), 0, 0);
      ctx.fillStyle = `rgba(40,25,10,${0.3 * (1 + c)})`; ctx.fillRect(0, 0, p.w, p.h);
    }
    ctx.restore();
  }
  // ───────── the organoid in brightfield, day 0..7 (growth data: diameter in um, crypt-bud count)
  const BUDA = [0.35, 2.45, 4.15, 1.35, 5.25, 3.3, 0.85, 4.75];
  function diameter(day) { const g = data().growth; for (let i = 1; i < g.length; i++) if (day <= g[i][0]) { const [d0, v0] = g[i - 1], [d1, v1] = g[i]; return v0 + (v1 - v0) * (day - d0) / (d1 - d0); } return g[g.length - 1][1]; }
  function outline(day, R) {
    const n = 220, pts = [], buds = clamp(Math.floor((day - 1.8) * 1.6), 0, 8);
    for (let i = 0; i < n; i++) {
      const th = i / n * TAU; let r = R * (1 + 0.035 * Math.sin(5 * th + 1.3) + 0.02 * Math.sin(9 * th + 0.4));
      for (let k = 0; k < 8; k++) {
        const born = 1.8 + k / 1.6, L = R * 0.5 * Ease.outC(clamp((day - born) / 1.7)); if (L <= 0) continue;
        let dth = Math.atan2(Math.sin(th - BUDA[k]), Math.cos(th - BUDA[k])); const w = 0.2 + 0.05 * Math.sin(k);
        if (Math.abs(dth) < w) r += L * Math.sqrt(1 - (dth / w) ** 2);
      }
      pts.push([Math.cos(th) * r, Math.sin(th) * r]);
    }
    return { pts, buds };
  }
  function organoid(ctx, cx, cy, day, umPx) {
    const R = diameter(day) / 2 * umPx;
    ctx.save(); ctx.translate(cx, cy);
    if (day < 1.1) {                                                   // one cell, then a cluster
      const n = Math.min(12, Math.round(Math.pow(2, day * 3.6))), rc = Math.max(10, R * 0.42);
      for (let i = 0; i < n; i++) {
        const a = i * 2.39996, d = i ? Math.sqrt(i) * rc * 0.62 : 0, x = Math.cos(a) * d, y = Math.sin(a) * d;
        ctx.fillStyle = 'rgba(255,255,255,0.7)'; circle(ctx, x, y, rc + 3); ctx.fill();
        ctx.fillStyle = '#C9C1B4'; circle(ctx, x, y, rc); ctx.fill(); ctx.strokeStyle = '#6E665C'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#7D7468'; circle(ctx, x + rc * 0.15, y - rc * 0.1, rc * 0.38); ctx.fill();
      }
      ctx.restore(); if (day < 0.85) return; ctx.save(); ctx.translate(cx, cy); ctx.globalAlpha = clamp((day - 0.85) / 0.25);
    }
    const { pts } = outline(day, R), t = R * 0.2;
    const path = (scale) => { ctx.beginPath(); pts.forEach(([x, y], i) => { const r = Math.hypot(x, y), k = Math.max(0.1, (r - scale) / r); i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k); }); ctx.closePath(); };
    ctx.save(); ctx.filter = 'blur(5px)'; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 9; path(-5); ctx.stroke(); ctx.restore();   // the phase halo
    ctx.fillStyle = '#CFC8BC'; path(0); ctx.fill();
    ctx.fillStyle = '#B4AB9D'; path(t); ctx.fill();                    // the lumen
    for (let i = 0; i < 40; i++) { const a = hash(i) * TAU, d = hash(i + 7) * R * 0.55; ctx.fillStyle = 'rgba(90,80,70,0.35)'; circle(ctx, Math.cos(a) * d, Math.sin(a) * d, 2 + hash(i + 3) * 4); ctx.fill(); }
    ctx.strokeStyle = 'rgba(92,84,74,0.45)'; ctx.lineWidth = 1.2;     // cell walls, radial
    for (let i = 0; i < pts.length; i += 3) { const [x, y] = pts[i], r = Math.hypot(x, y), k = (r - t) / r; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x * k, y * k); ctx.stroke(); }
    ctx.fillStyle = 'rgba(96,86,74,0.7)';                              // nuclei near the basal side
    for (let i = 1; i < pts.length; i += 3) { const [x, y] = pts[i], r = Math.hypot(x, y), k = (r - t * 0.35) / r; circle(ctx, x * k, y * k, Math.max(1.5, t * 0.16)); ctx.fill(); }
    ctx.strokeStyle = '#5C544A'; ctx.lineWidth = 2; path(0); ctx.stroke(); path(t); ctx.stroke();
    ctx.restore();
  }
  // the brightfield field as a live print: round field, Matrigel speckles, the organoid, a scale bar, the day stamp
  function field(ctx, w, h, day) {
    ctx.fillStyle = '#C8C2B6'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = radial(ctx, w / 2, h / 2, 0, Math.min(w, h) * 0.6, [[0, '#E7E2D8'], [0.75, '#D6D0C4'], [1, '#A9A296']]); ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) { ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; circle(ctx, hash(i * 3.3) * w, hash(i * 5.7) * h, 4 + hash(i) * 10); ctx.stroke(); }
    organoid(ctx, w / 2, h / 2, day, Math.min(w, h) * 0.55 / 700);
    ctx.fillStyle = 'rgba(30,26,22,0.85)'; ctx.fillRect(w - 20 - 100 * Math.min(w, h) * 0.55 / 700, h - 26, 100 * Math.min(w, h) * 0.55 / 700, 4);
    ctx.font = `500 15px ${FAM.mono}`; ctx.fillStyle = 'rgba(30,26,22,0.85)'; ctx.textAlign = 'right'; ctx.fillText('100 µm', w - 20, h - 34);
    ctx.textAlign = 'left'; ctx.font = `600 18px ${FAM.mono}`; ctx.fillText(`day ${day.toFixed(2)}`, 14, 26);
  }
  // the 96-well plate: k = wells filled (0..96, column by column), o.hi = columns to ring
  const COLS = ['ctrl', 'ctrl', 'd2', 'd2', 'd2', 'd3', 'd3', 'd3', 'd4', 'd4', 'd5', 'd5'];
  function plate(ctx, x, y, w, k, o = {}) {
    const d = data(), cw = w / 13, h = cw * 9.4;
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = INK; ctx.lineWidth = 2.2; rr(ctx, 0, 0, w, h, 22); ctx.stroke();
    ctx.font = `500 15px ${FAM.mono}`; ctx.fillStyle = rgba(INK, 0.7); ctx.textAlign = 'center';
    for (let c = 0; c < 12; c++) ctx.fillText(String(c + 1), cw * (c + 1.25), cw * 0.62);
    for (let r = 0; r < 8; r++) ctx.fillText('ABCDEFGH'[r], cw * 0.45, cw * (r + 1.32));
    for (let c = 0; c < 12; c++) for (let r = 0; r < 8; r++) {
      const i = c * 8 + r, v = d.plate[r * 12 + c][3], cx = cw * (c + 1.25), cy = cw * (r + 1.1), f = clamp(k - i);
      ctx.strokeStyle = rgba(INK, 0.55); ctx.lineWidth = 1.4; circle(ctx, cx, cy, cw * 0.36); ctx.stroke();
      if (f > 0) { ctx.fillStyle = rgba(MAG, (0.12 + 0.88 * clamp((v - 8) / 42)) * f); circle(ctx, cx, cy, cw * 0.34 * Ease.outBack(f)); ctx.fill(); }
    }
    for (let c = 0; c < 12; c++) if (c === 0 || COLS[c] !== COLS[c - 1]) {
      let e = c; while (e + 1 < 12 && COLS[e + 1] === COLS[c]) e++;
      ctx.fillStyle = rgba(INK, 0.75); ctx.font = `600 16px ${FAM.mono}`; ctx.fillText(COLS[c], cw * ((c + e) / 2 + 1.25), h - cw * 0.3);
    }
    ctx.restore();
    return { cw, h, wellAt: (c, r) => [x + cw * (c + 1.25), y + cw * (r + 1.1)] };
  }
  // several notes written one after another: items [{s, x, y, t0 (s), cps, size, color, weight}]; returns where the pen
  // is (the head of the note being written, else the end of the last one written), or null before the first starts
  function notes(ctx, items, lt) {
    let pen = null;
    for (const it of items) {
      const k = SN.kAt(lt, it.t0, it.cps || 16); if (k <= 0) continue;
      const r = write(ctx, it.s, it.x, it.y, k, it);
      pen = r.head || SN.penAt(it.s, it.x, it.y, Math.min(k, units(it.s, it)), { fam: 'pen', weight: it.weight || 500, size: it.size || 44, seed: it.seed || 3, wob: 0.03, tilt: 0.03, align: it.align });
    }
    return pen;
  }
  window.BOOK = { data, meta, ill, PG, INK, MAG, GRN, BLUE, desk, page, spread, onPage, tape, print, pen, write, units, notes, inkLine, turn, organoid, field, plate, diameter };
})();
