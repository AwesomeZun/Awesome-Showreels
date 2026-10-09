// modules/panel-title.js: the title panel (LB.panels.title), drawn from the endcard scene's clock.
// A blue banner, "Box it. Arrow it. Star it." in black marker, the orange star on "Star it.", Thursday's details,
// then the camera steps back (endcard scene). Hold (30-s cut): the three markers drop into the tray, a sign-off.
(() => {
  const K = LB.COPY;
  const TI = { y: 520, size: 112, weight: 800 };
  const B = {                                       // beats from the endcard's start
    kicker: [1.5, 26], band: [1.75, 2.7], tails: [2.7, 3.05], title: [2.55, 4.05], star: [4.0, 4.4], starHit: 4.5,
    when: [4.5, 30], bring: [5.0, 26], dots: [5.5, 5.75, 6.0], fiction: 4.5,
    drop: [0, 0.5, 1.0], signoff: 2.0,               // from the first hold bar line (beats)
  };
  const since = (S, b) => S.t - (S.T.endcard.t0 + b * S.T.endcard.beat);
  let G = null;
  function geom() {
    if (G) return G;
    const tw = SN.textWidth(K.title, { size: TI.size, weight: TI.weight, fam: 'display' });
    const x0 = 960 - tw / 2 - 78, x1 = 960 + tw / 2 + 78, y0 = TI.y - TI.size * 0.98 - 26, y1 = TI.y + TI.size * 0.3 + 30;
    const sag = 16, band = [];
    for (let i = 0; i <= 24; i++) band.push([lerp(x0, x1, i / 24), y0 + Math.sin(Math.PI * i / 24) * -sag]);
    for (let i = 0; i <= 6; i++) band.push([x1 + Math.sin(i / 6 * Math.PI) * 4, lerp(y0, y1, i / 6)]);
    for (let i = 0; i <= 24; i++) band.push([lerp(x1, x0, i / 24), y1 + Math.sin(Math.PI * i / 24) * -sag]);
    for (let i = 0; i <= 6; i++) band.push([x0 - Math.sin(i / 6 * Math.PI) * 4, lerp(y1, y0, i / 6)]);
    band.push([x0 + 26, y0 - 3]);
    const h = y1 - y0, td = 64, tl = 150;
    const tailL = [[x0 + 10, y1], [x0 + 10, y1 + td * 0.55], [x0 - tl * 0.25, y1 + td * 0.55], [x0 - tl, y1 + td * 0.55], [x0 - tl + 46, y0 + h * 0.5 + td * 0.55], [x0 - tl, y0 + td * 0.55], [x0 - 2, y0 + td * 0.55]];
    const tailR = [[x1 - 10, y1], [x1 - 10, y1 + td * 0.55], [x1 + tl * 0.25, y1 + td * 0.55], [x1 + tl, y1 + td * 0.55], [x1 + tl - 46, y0 + h * 0.5 + td * 0.55], [x1 + tl, y0 + td * 0.55], [x1 + 2, y0 + td * 0.55]];
    const sw = SN.textWidth('Star it.', { size: TI.size, weight: TI.weight, fam: 'display' });
    G = { tw, x0, x1, y0, y1, band, tailL, tailR, star: { x: 960 + tw / 2 - sw * 0.55, y: y0 - 58, r: 54 } };
    return G;
  }
  function holdBar(S) {
    const e = S.T.endcard, bl = e.t0 + Math.ceil((e.inSec - 1e-6) / e.bar) * e.bar;
    return bl < e.t0 + e.dur - 1e-6 && S.t >= bl ? bl : null;
  }

  function ink(g, S) {
    if (!S.T.endcard) return;
    const gm = geom(), boil = S.boil, b = S.T.endcard.beat, bt = (S.t - S.T.endcard.t0) / b;
    SN.write(g, K.kicker, 960, gm.y0 - 120, SN.kAt(since(S, B.kicker[0]), 0, B.kicker[1]), { size: 64, weight: 600, fam: 'pen', color: C.ink2, seed: 301, boil, align: 'center' });
    const hb = (pts, w, seed) => SN.stroke(g, SN.hand(pts, { seed, boil, amp: 1.4 }), Ease.ioQ(rm(bt, w[0], w[1])), { color: C.accent2, width: 10 });
    hb(gm.band, B.band, 303); hb(gm.tailL, B.tails, 305); hb(gm.tailR, B.tails, 307);
    SN.write(g, K.title, 960, TI.y, titleK(S), { size: TI.size, weight: TI.weight, fam: 'display', color: C.ink, seed: 309, boil, align: 'center', tilt: 0.02 });
    const st = gm.star, sk = Ease.ioQ(rm(bt, B.star[0], B.star[1]));
    if (sk > 0) {
      const hit = since(S, B.starHit), pop = hit > 0 ? 1 + 0.2 * wob(hit, 2.4, 5.5) : 1;
      g.save(); g.translate(st.x, st.y); g.scale(pop, pop); g.rotate(hit > 0 ? 0.08 * wob(hit, 2.4, 5.5) : 0); g.translate(-st.x, -st.y);
      SN.stroke(g, SN.star(st.x, st.y, st.r, { seed: 311, boil }), sk, { color: C.accent, width: 11 });
      g.restore();
      const sp = rm(bt, B.starHit, B.starHit + 0.5);
      if (sp > 0) for (let j = 0; j < 4; j++) {
        const a = -2.6 + j * 0.55, r0 = st.r + 16, r1 = st.r + 44;
        SN.stroke(g, SN.line(st.x + Math.cos(a) * r0, st.y + Math.sin(a) * r0, st.x + Math.cos(a) * r1, st.y + Math.sin(a) * r1, { seed: 313 + j, boil, amp: 0.6 }), rm(sp, j * 0.12, j * 0.12 + 0.5), { color: C.accent, width: 7 });
      }
    }
    SN.write(g, K.when, 960, gm.y1 + 150, SN.kAt(since(S, B.when[0]), 0, B.when[1]), { size: 68, weight: 600, fam: 'sans', color: C.ink, seed: 315, boil, align: 'center' });
    const r = SN.write(g, K.bring, 960 - 60, gm.y1 + 262, SN.kAt(since(S, B.bring[0]), 0, B.bring[1]), { size: 62, weight: 600, fam: 'pen', color: C.ink2, seed: 317, boil, align: 'center' });
    [C.markerBlack || C.ink, C.markerBlue || C.accent2, C.markerOrange || C.accent].forEach((col, i) => {
      const k = rm(bt, B.dots[i], B.dots[i] + 0.3);
      if (k <= 0) return;
      const x = 960 - 60 + r.w / 2 + 40 + i * 44, y = gm.y1 + 244;
      SN.stroke(g, SN.loop(x, y, 13, 13, { seed: 321 + i, boil, turns: 2.2, spiral: -0.8 }), Ease.outQ(k), { color: col, width: 11 });
    });
    const h = holdBar(S);
    if (h !== null) SN.write(g, K.signoff, gm.x1 + 40, gm.y1 + 380, SN.kAt(S.t - h - B.signoff * b, 0, 24), { size: 56, weight: 600, fam: 'pen', color: C.ink2, seed: 331, boil, align: 'right' });
  }
  function titleK(S) {
    const b = S.T.endcard.beat, u = SN.textUnits(K.title, { fam: 'display', weight: TI.weight }), cps = u / ((B.title[1] - B.title[0]) * b);
    return SN.kAt(since(S, B.title[0]), 0, cps);
  }

  function props(ctx, S, P) {
    if (!S.T.endcard) return;
    const gm = geom(), cam = S.cam, b = S.T.endcard.beat, t0 = S.T.endcard.t0;
    const w2 = (p) => [p[0] + P.x, p[1] + P.y];
    // black pen: the title
    const u = SN.textUnits(K.title, { fam: 'display', weight: TI.weight }), cps = u / ((B.title[1] - B.title[0]) * b), ts = t0 + B.title[0] * b;
    LB.drawPen(ctx, cam, LB.penPose([{ t0: ts, t1: ts + u / cps, at: tt => w2(SN.penAt(K.title, 960, TI.y, (tt - ts) * cps, { size: TI.size, weight: TI.weight, fam: 'display', seed: 309, boil: S.boil, align: 'center', tilt: 0.02 })) }], S.t, { home: [P.x + 2300, P.y + 1300], away: [P.x + 2300, P.y + 1400] }), C.ink);
    // blue pen: the banner; orange pen: the star
    const bandJobs = [[gm.band, B.band], [gm.tailL, B.tails]].map(([pts, w]) => { const a = t0 + w[0] * b, z = t0 + w[1] * b; return { t0: a, t1: z, at: tt => { const q = pointAt(pts, Ease.ioQ(rm(tt, a, z))); return w2([q.x, q.y]); } }; });
    LB.drawPen(ctx, cam, LB.penPose(bandJobs, S.t, { home: [P.x - 400, P.y + 1400], away: [P.x - 500, P.y + 1400] }), C.accent2);
    const sp = SN.star(gm.star.x, gm.star.y, gm.star.r, { seed: 311 }), sa = t0 + B.star[0] * b, sz = t0 + B.star[1] * b;
    LB.drawPen(ctx, cam, LB.penPose([{ t0: sa, t1: sz, at: tt => { const q = pointAt(sp, Ease.ioQ(rm(tt, sa, sz))); return w2([q.x, q.y]); } }], S.t, { home: [P.x + 2200, P.y - 300], away: [P.x + 2300, P.y - 400] }), C.accent);
    // the tray: an eraser lies there; in the hold the three markers drop in
    const lay = S.lay, ty = lay.board.y1 + 30, ex = P.x + 1500;
    SN.eraserProp(ctx, cam.sx(ex), cam.sy(ty - 6), { scale: cam.z * 0.55, ang: 0.02, lift: 0 });
    const h = holdBar(S);
    [C.markerBlack || C.ink, C.markerBlue || C.accent2, C.markerOrange || C.accent].forEach((col, i) => {
      if (h === null) return;
      const dt = S.t - h - B.drop[i] * b;
      if (dt < -0.4) return;
      const y = dt < 0 ? lerp(ty - 900, ty - 14, Ease.inQ(1 + dt / 0.4)) : ty - 14 - Math.abs(wob(dt, 2.5, 6)) * 26;
      SN.marker(ctx, cam.sx(P.x + 520 + i * 300), cam.sy(y), { color: col, ang: 0.02 * (i - 1), lift: dt < 0 ? 0.8 : 0.05, scale: cam.z * 0.85, len: 300, cap: 'on' });
    });
  }
  // Screen-space footnote: the fictional disclaimer, from the star's landing to the end.
  function overlay(ctx, S) {
    if (!S.T.endcard) return;
    const a = rm(since(S, B.fiction), 0, 0.35);
    if (a <= 0) return;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = a;
    ctx.font = `600 22px ${SN.famStack('sans')}`; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
    const tw = ctx.measureText(K.fiction).width;
    ctx.fillStyle = rgba(C.bg, 0.92); rr(ctx, W - 64 - tw - 22, H - 64 - 30, tw + 44, 44, 10); ctx.fill();
    ctx.fillStyle = C.muted; ctx.fillText(K.fiction, W - 64, H - 64);
    ctx.restore();
  }
  // Where the camera ends: the whole board (30-s cut, three panels) or the title with the notes beside it (short).
  function finalView(lay) {
    const P = lay.P.title;
    if (lay.kit) { const B0 = lay.board; return SN.view((B0.x0 + B0.x1) / 2, (B0.y0 + B0.y1) / 2 + 40, 0.43); }
    return SN.view(P.cx - 170, P.cy + 80, 0.72);
  }

  LB.panels.title = { ink, props, overlay, finalView };
})();
