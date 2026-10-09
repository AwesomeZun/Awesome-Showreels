// modules/panel-notes.js: the notes panel of the big board (LB.panels.notes), drawn from two scenes' clocks.
//  wall   (hook): a wall of meeting notes writes itself, "Notes nobody reads?" in black marker, "nobody" circled in
//                 orange; with a hold (30-s cut) a sleepy reader nods off beside it.
//  rescue (hero): the eraser wipes the question, the blue marker boxes three phrases inside the wall, the boxes lift,
//                 the rest is erased (ghosts stay), the boxes land as a diagram, two arrows ("why?", "so"), ONE orange
//                 star, "Notes people see." over the ghost of the question. Hold (30 s): icons, a margin note, dot votes,
//                 and the reader wakes up.
// Timings are beats from each scene's start (STORYBOARD.md section 6.1 / 6.2).
(() => {
  const K = LB.COPY;
  const HEAD = { x: 150, y: 236, size: 128, weight: 800 };
  const PARA = { x: 152, y0: 404, lh: 61, size: 39, weight: 500 };
  const TAG = { y: 962, size: 40, weight: 700 };
  const FACE = { x: 1590, y: 640, s: 190 };
  // diagram: centres of the three boxes and the text size there
  const DIA = { size: 50, c: [[468, 474], [968, 712], [1466, 474]] };
  const PHRASE_SEED = 29;

  // layout cache (needs the loaded fonts; built on first use)
  let L = null;
  function lay() {
    if (L) return L;
    const o = { size: PARA.size, weight: PARA.weight, fam: 'sans' };
    const lines = K.wall.map((s, i) => ({ s, x: PARA.x, y: PARA.y0 + i * PARA.lh, units: SN.textUnits(s, o), w: SN.textWidth(s, o) }));
    const ph = K.phrases.map((p, i) => {
      const ln = lines[p.line], a = ln.s.indexOf(p.text), b = a + p.text.length;
      const x0 = PARA.x + SN.textWidth(ln.s.slice(0, a), o), w = SN.textWidth(p.text, o);
      const skipOut = new Set(), skipIn = new Set();
      [...ln.s].forEach((_, k) => (k >= a && k < b ? skipIn : skipOut).add(k));
      const box = { x: x0 - 16, y: ln.y - PARA.size * 0.95, w: w + 32, h: PARA.size * 1.36 };
      return { ...p, a, b, x0, w, ln, box, cx: x0 + w / 2, cy: ln.y - PARA.size * 0.32, skipIn, skipOut, seed: PHRASE_SEED + i * 7 };
    });
    const hw = SN.textWidth(K.hook, { size: HEAD.size, weight: HEAD.weight, fam: 'display' });
    const nb0 = SN.textWidth(K.hook.slice(0, K.hook.indexOf(K.hookCircle)), { size: HEAD.size, weight: HEAD.weight, fam: 'display' });
    const nbw = SN.textWidth(K.hookCircle, { size: HEAD.size, weight: HEAD.weight, fam: 'display' });
    L = { lines, ph, hw, nobody: { cx: HEAD.x + nb0 + nbw / 2, cy: HEAD.y - HEAD.size * 0.3, rx: nbw / 2 + 34, ry: HEAD.size * 0.5 } };
    return L;
  }

  // ───────── clocks ─────────
  // wall: paragraph lines start (s), letters per second; headline; circle. rescue: beats.
  const WALL = { lineT0: i => -0.55 + i * 0.12, cps: 36, head: 0.25, headCps: 22, circle: [2.0, 2.5], face: [3.5, 4.25], zs: [4.5, 5.0, 5.5] };
  const R = {
    erase1: [-0.5, 0.0, 0.95, 1.35],                 // enter, wipe from, wipe to, gone (beats)
    boxes: [[1.0, 1.5], [1.55, 2.0], [2.05, 2.5]],
    lift: 2.75, erase2: [2.85, 3.0, 4.0, 4.4], fly: [3.7, 4.5],
    arrow1: [5.0, 5.5], arrow2: [5.7, 6.05], heads: 0.18,
    star: [6.35, 6.85], starHit: 7.0, sparks: [7.0, 7.3],
    see: 7.25, seeCps: 26,
    tags: [1.25, 5.0, 7.0],
    in: 9,
  };
  // rescue hold, from the first hold bar line (30-s cut): icons, then the reader wakes, then a margin note + dots.
  const HOLD = { icons: [[0, 0.5], [0.5, 1.0], [1.0, 1.5]], wake: [2.0, 2.4], margin: [4.0, 4.8], dots: [5.0, 5.5, 6.0] };

  const beatT = (T, id, b) => T[id].t0 + b * T[id].beat;
  // seconds since beat b of scene id (negative before)
  const since = (S, id, b) => (S.T[id] ? S.t - beatT(S.T, id, b) : -1e9);

  // Geometry of the hook eraser (wipes the question and the circle, exits over the z's) and the wall eraser.
  function hookEraserPath() {
    const l = lay(), x1 = HEAD.x + l.hw + 60;
    return SN.spline([[2140, 120], [x1, 150], [HEAD.x - 10, 170], [x1 - 80, 250], [HEAD.x + 40, 278], [x1 - 260, 230], [1700, 400], [1860, 560], [2200, 640]], 10);
  }
  function wallEraserPath() {
    // horizontal passes (a zig-zag of diagonals left un-erased triangles at the line ends)
    const P = [[-260, 372]], x0 = 40, x1 = 1420;
    for (let i = 0; i < 5; i++) { const y = 378 + i * 106; P.push(...(i % 2 ? [[x1, y], [x0, y]] : [[x0, y], [x1, y]])); }
    P.push([x1 + 120, 900], [2200, 980]);
    return SN.spline(P, 8);
  }
  // Card position for phrase i during the lift and flight (rescue clock).
  function cardPose(S, i) {
    const l = lay(), p = l.ph[i], tl = since(S, 'rescue', R.lift), b = S.T.rescue.beat;
    if (!S.T.rescue || tl < 0) return null;
    const f0 = R.fly[0] + i * 0.12, f1 = R.fly[1] + (i - 1) * 0.08;
    const kf = rm(since(S, 'rescue', 0) / b, f0, f1), e = Ease.ioC(kf);
    const tx = DIA.c[i][0], ty = DIA.c[i][1], s1 = DIA.size / PARA.size;
    const liftK = Ease.outBack(rm(tl, 0, 0.22), 2.2) * (1 - rm(kf, 0.82, 1));
    const landT = since(S, 'rescue', f1), squash = landT > 0 ? wob(landT, 3.2, 7) * 0.07 : 0;
    const x = lerp(p.cx, tx, e), y = lerp(p.cy, ty, e) - Math.sin(Math.PI * e) * 120;
    const s = lerp(1, s1, e) * (1 + 0.05 * liftK) * (1 + squash), rot = (i - 1) * 0.04 * Math.sin(Math.PI * e) + (hash(i * 3.3) - 0.5) * 0.03 * liftK;
    return { x, y, s, rot, lift: liftK, landed: kf >= 1, sy: 1 - squash * 0.6 };
  }
  // The phrase line drawn as a card: the same glyphs as in the wall (same line, same seed), only the phrase kept.
  function drawCard(g, S, i, pose, o = {}) {
    const l = lay(), p = l.ph[i], boil = S.boil;
    g.save();
    g.translate(pose.x, pose.y); g.rotate(pose.rot); g.scale(pose.s, pose.s * (pose.sy ?? 1)); g.translate(-p.cx, -p.cy);
    SN.write(g, p.ln.s, p.ln.x, p.ln.y, 999, { size: PARA.size, weight: PARA.weight, fam: 'sans', color: C.ink, seed: 3 + p.line, boil, skip: p.skipOut });
    const bx = p.box, pts = SN.box(bx.x, bx.y, bx.w, bx.h, { seed: p.seed, boil });
    SN.stroke(g, pts, 1, { color: C.accent2, width: 7 / Math.max(1, pose.s * 0.75) });
    g.restore();
  }

  function ink(g, S) {
    const l = lay(), T = S.T, boil = S.boil;
    if (!T.wall && !T.rescue) return;
    const lw = T.wall ? S.t - T.wall.t0 : 1e9;                        // wall clock (s)
    const wb = T.wall ? T.wall.beat : T.rescue.beat;
    const rb = T.rescue ? since(S, 'rescue', 0) / T.rescue.beat : -1e9;   // rescue clock (beats)
    const lifted = T.rescue && rb >= R.lift;

    // 1. the wall of text, line by line, all at once (a wall piling up)
    l.lines.forEach((ln, i) => {
      const k = SN.kAt(lw, WALL.lineT0(i), WALL.cps);
      const ph = l.ph.find(p => p.line === i);
      SN.write(g, ln.s, ln.x, ln.y, k, { size: PARA.size, weight: PARA.weight, fam: 'sans', color: C.ink, seed: 3 + i, boil, skip: lifted && ph ? ph.skipIn : null });
    });
    // 2. the question, and "nobody" circled in orange
    const kh = SN.kAt(lw, WALL.head * wb, WALL.headCps);
    SN.write(g, K.hook, HEAD.x, HEAD.y, kh, { size: HEAD.size, weight: HEAD.weight, fam: 'display', color: C.ink, seed: 7, boil, tilt: 0.02 });
    const nb = l.nobody;
    SN.stroke(g, SN.loop(nb.cx, nb.cy, nb.rx, nb.ry, { seed: 11, boil, start: -2.6 }), Ease.ioQ(rm(lw / wb, WALL.circle[0], WALL.circle[1])), { color: C.accent, width: 10 });
    // 3. the sleepy reader (only when the wall had a hold to draw it in) ... wakes up in the rescue hold
    const faceOn = T.wall && T.wall.dur - T.wall.inSec - T.wall.outSec > 2 * wb - 1e-6;
    if (faceOn) {
      const kf = rm(lw / wb, WALL.face[0], WALL.face[1]);
      const hb = holdBar(S), wakeK = hb === null ? 0 : rm((S.t - hb) / T.rescue.beat, HOLD.wake[0], HOLD.wake[1]);
      const D = SN.DOODLE.face, fs = SN.fit([D[0], D[3]], FACE.x - FACE.s / 2, FACE.y - FACE.s / 2, FACE.s, { seed: 51, boil });
      SN.strokes(g, fs, kf, { color: C.ink, width: 7 });
      if (kf >= 1) {
        const eyesClosed = SN.fit([D[1], D[2]], FACE.x - FACE.s / 2, FACE.y - FACE.s / 2, FACE.s, { seed: 53, boil });
        SN.strokes(g, eyesClosed, 1, { color: C.ink, width: 7 });
      }
      WALL.zs.forEach((b0, j) => {                                   // z z z, each a little bigger and higher
        const k = rm(lw / wb, b0, b0 + 0.3), s = 34 + j * 14, rise = Math.min(1, Math.max(0, since(S, 'wall', b0)) * 0.6) * 10;
        if (k > 0) SN.stroke(g, SN.fit(SN.DOODLE.z, FACE.x + 70 + j * 46, FACE.y - 120 - j * 52 - rise, s, { seed: 60 + j, boil })[0], k, { color: C.ink, width: 6 });
      });
      if (wakeK > 0) {                                               // open eyes, smile
        SN.stroke(g, SN.line(FACE.x - 52, FACE.y + 18, FACE.x + 48, FACE.y + 30, { seed: 71, boil, bow: 0.25 }), rm(wakeK, 0.5, 1), { color: C.ink, width: 7 });
        for (const ex of [-0.5, 0.5]) { const k = rm(wakeK, 0.1, 0.45); if (k > 0) { g.save(); g.fillStyle = C.ink; circle(g, FACE.x + ex * 62, FACE.y - 22, 9 * Ease.outBack(k, 3)); g.fill(); g.restore(); } }
      }
    }
    if (!T.rescue) return;
    // 4. the hook eraser and, later, the wall eraser (ink removed, ghosts left)
    const er1 = R.erase1, er2 = R.erase2;
    const e1 = rm(rb, er1[1], er1[2]);
    if (e1 > 0) { g.save(); SN.erase(g, hookEraserPath(), Ease.ioQ(e1), { width: 126, seed: 3 }); g.restore(); }
    if (faceOn && e1 > 0) {                                          // the closed eyes get wiped when the reader wakes
      const hb = holdBar(S);
      if (hb !== null) { const k = rm((S.t - hb) / T.rescue.beat, HOLD.wake[0], HOLD.wake[0] + 0.2); if (k > 0) SN.erase(g, [[FACE.x - 90, FACE.y - 24], [FACE.x + 90, FACE.y - 24]], k, { width: 44, seed: 9 }); }
    }
    // 5. boxes drawn around the three phrases, inside the wall
    l.ph.forEach((p, i) => {
      if (lifted) return;
      const k = Ease.ioQ(rm(rb, R.boxes[i][0], R.boxes[i][1]));
      if (k > 0) SN.stroke(g, SN.box(p.box.x, p.box.y, p.box.w, p.box.h, { seed: p.seed, boil }), k, { color: C.accent2, width: 7 });
    });
    const e2 = rm(rb, er2[1], er2[2]);
    if (e2 > 0) SN.erase(g, wallEraserPath(), Ease.ioQ(e2), { width: 124, seed: 5 });
    // 6. the landed cards are ink again
    l.ph.forEach((p, i) => { const q = cardPose(S, i); if (q && q.landed) drawCard(g, S, i, q); });
    // 7. arrows, labels, the star, the new headline, the method line
    const a1 = SN.arrow([[DIA.c[0][0] + 150, DIA.c[0][1] + 60], [DIA.c[0][0] + 210, DIA.c[0][1] + 150], [DIA.c[1][0] - 330, DIA.c[1][1] - 40], [DIA.c[1][0] - 300, DIA.c[1][1] - 10]], { seed: 81, boil, head: 26 });
    const a2 = SN.arrow([[DIA.c[1][0] + 340, DIA.c[1][1] - 6], [DIA.c[1][0] + 470, DIA.c[1][1] - 40], [DIA.c[2][0] - 70, DIA.c[2][1] + 120], [DIA.c[2][0] - 40, DIA.c[2][1] + 58]], { seed: 83, boil, head: 26 });
    const arr = (a, w) => { const k = Ease.ioQ(rm(rb, w[0], w[1])); SN.stroke(g, a.shaft, k, { color: C.accent2, width: 8 }); SN.stroke(g, a.head, rm(rb, w[1], w[1] + R.heads), { color: C.accent2, width: 8 }); };
    arr(a1, R.arrow1); arr(a2, R.arrow2);
    SN.write(g, K.why, DIA.c[0][0] + 250, DIA.c[0][1] + 150, SN.kAt(since(S, 'rescue', R.arrow1[0] + 0.25), 0, 14), { size: 54, weight: 600, fam: 'pen', color: C.ink2, seed: 85, boil });
    SN.write(g, K.so, DIA.c[1][0] + 470, DIA.c[1][1] - 74, SN.kAt(since(S, 'rescue', R.arrow2[0] + 0.2), 0, 12), { size: 54, weight: 600, fam: 'pen', color: C.ink2, seed: 87, boil });
    const st = starGeom(), sk = Ease.ioQ(rm(rb, R.star[0], R.star[1]));
    if (sk > 0) {
      const hit = since(S, 'rescue', R.starHit), pop = hit > 0 ? 1 + 0.16 * wob(hit, 2.6, 6) : 1;
      g.save(); g.translate(st.x, st.y); g.scale(pop, pop); g.translate(-st.x, -st.y);
      SN.stroke(g, SN.star(st.x, st.y, st.r, { seed: 91, boil }), sk, { color: C.accent, width: 10 });
      g.restore();
      const sp = rm(rb, R.sparks[0], R.sparks[1]);                  // emphasis ticks around the star
      if (sp > 0) for (let j = 0; j < 4; j++) {
        const a = -2.2 + j * 0.62, r0 = st.r + 18, r1 = st.r + 46;
        SN.stroke(g, SN.line(st.x + Math.cos(a) * r0, st.y + Math.sin(a) * r0, st.x + Math.cos(a) * r1, st.y + Math.sin(a) * r1, { seed: 95 + j, boil, amp: 0.6 }), rm(sp, j * 0.12, j * 0.12 + 0.5), { color: C.accent, width: 7 });
      }
    }
    SN.write(g, K.see, HEAD.x, HEAD.y, SN.kAt(since(S, 'rescue', R.see), 0, R.seeCps), { size: HEAD.size, weight: HEAD.weight, fam: 'display', color: C.ink, seed: 13, boil, tilt: 0.02 });
    methodLine(g, S, rb, boil);
    // 8. rescue hold (30-s cut): icons, a margin note, three green dot votes go on as props
    const hb = holdBar(S);
    if (hb !== null) {
      const hbb = (S.t - hb) / T.rescue.beat, IC = iconPlaces();
      ['clock', 'people', 'bulb'].forEach((kind, i) => {
        const k = rm(hbb, HOLD.icons[i][0], HOLD.icons[i][1] + 0.2);
        if (k > 0) SN.strokes(g, SN.doodle(kind, IC[i][0], IC[i][1], IC[i][2], { seed: 101 + i, boil }), Ease.ioQ(k), { color: C.ink, width: 6 });
      });
      SN.write(g, K.margin, DIA.c[2][0] - 20, DIA.c[2][1] + 150, SN.kAt(hbb * T.rescue.beat, HOLD.margin[0] * T.rescue.beat, 24), { size: 50, weight: 600, fam: 'pen', color: C.ink2, seed: 111, boil, align: 'center' });
    }
  }
  function starGeom() { return { x: DIA.c[2][0] + 262, y: DIA.c[2][1] - 70, r: 52 }; }
  function iconPlaces() { return [[DIA.c[0][0] - 330, DIA.c[0][1] + 92, 96], [DIA.c[1][0] - 420, DIA.c[1][1] - 34, 104], [DIA.c[2][0] + 300, DIA.c[2][1] + 36, 100]]; }
  // First bar line of the rescue hold (absolute s), or null if the hold has none.
  function holdBar(S) {
    const T = S.T.rescue;
    if (!T) return null;
    const hs = T.t0 + T.inSec, he = T.t0 + T.dur - T.outSec, bl = T.t0 + Math.ceil((T.inSec - 1e-6) / T.bar) * T.bar;
    return bl < he - 1e-6 && bl >= hs - 1e-6 && S.t >= bl ? bl : null;
  }
  // BOX IT → ARROW IT → STAR IT, each written when its move happens; a small icon in the move's colour before it.
  function methodLine(g, S, rb, boil) {
    let x = 150;
    K.moves.forEach((m, i) => {
      const t0 = R.tags[i], k = SN.kAt(since(S, 'rescue', t0), 0.18, 20), ik = rm(rb, t0, t0 + 0.4);
      const iconW = 46;
      if (ik > 0) {
        if (i === 0) SN.stroke(g, SN.box(x, TAG.y - 34, 40, 34, { seed: 121, boil, overshoot: 8, jit: 2 }), ik, { color: C.accent2, width: 6 });
        if (i === 1) { const a = SN.arrow([[x, TAG.y - 16], [x + 22, TAG.y - 26], [x + 42, TAG.y - 16]], { seed: 123, boil, head: 13 }); SN.stroke(g, a.shaft, ik, { color: C.accent2, width: 6 }); SN.stroke(g, a.head, rm(ik, 0.7, 1), { color: C.accent2, width: 6 }); }
        if (i === 2) SN.stroke(g, SN.star(x + 21, TAG.y - 18, 22, { seed: 125, boil }), ik, { color: C.accent, width: 6 });
      }
      const r = SN.write(g, m, x + iconW + 14, TAG.y, k, { size: TAG.size, weight: TAG.weight, fam: 'display', color: C.ink, seed: 130 + i, boil });
      x += iconW + 14 + r.w + 70;
    });
  }

  // ───────── props: pens, erasers, lifted cards, dot stickers ─────────
  function props(ctx, S, P) {
    const l = lay(), T = S.T, cam = S.cam;
    if (!T.wall && !T.rescue) return;
    const ox = P.x, oy = P.y, w2 = (pt) => [pt[0] + ox, pt[1] + oy];
    const wb = (T.wall || T.rescue).beat;
    // black pen: the question (wall), then "Notes people see." (rescue)
    const jobsK = [];
    if (T.wall) {
      const t0 = T.wall.t0 + WALL.head * wb, u = SN.textUnits(K.hook, { fam: 'display', weight: HEAD.weight });
      jobsK.push({ t0, t1: t0 + u / WALL.headCps, at: tt => w2(SN.penAt(K.hook, HEAD.x, HEAD.y, (tt - t0) * WALL.headCps, { size: HEAD.size, weight: HEAD.weight, fam: 'display', seed: 7, boil: S.boil, tilt: 0.02 })) });
    }
    let poseK = LB.penPose(jobsK, S.t, { home: [ox + 2100, oy + 900], away: [ox + 2150, oy - 300] });
    if (T.rescue) {
      const t0 = beatT(T, 'rescue', R.see), u = SN.textUnits(K.see, { fam: 'display', weight: HEAD.weight });
      const j = [{ t0, t1: t0 + u / R.seeCps, at: tt => w2(SN.penAt(K.see, HEAD.x, HEAD.y, (tt - t0) * R.seeCps, { size: HEAD.size, weight: HEAD.weight, fam: 'display', seed: 13, boil: S.boil, tilt: 0.02 })) }];
      poseK = poseK || LB.penPose(j, S.t, { home: [ox + 2100, oy + 300], away: [ox + 2150, oy - 300] });
    }
    // orange pen: the circle (wall), the star (rescue)
    const jobsO = [];
    if (T.wall) {
      const nb = l.nobody, loop = SN.loop(nb.cx, nb.cy, nb.rx, nb.ry, { seed: 11, start: -2.6 }), t0 = T.wall.t0 + WALL.circle[0] * wb, t1 = T.wall.t0 + WALL.circle[1] * wb;
      jobsO.push({ t0, t1, at: tt => { const p = pointAt(loop, Ease.ioQ(rm(tt, t0, t1))); return w2([p.x, p.y]); } });
    }
    let poseO = LB.penPose(jobsO, S.t, { home: [ox + 1500, oy - 400], away: [ox + 2100, oy - 200] });
    if (T.rescue) {
      const st = starGeom(), sp = SN.star(st.x, st.y, st.r, { seed: 91 }), t0 = beatT(T, 'rescue', R.star[0]), t1 = beatT(T, 'rescue', R.star[1]);
      poseO = poseO || LB.penPose([{ t0, t1, at: tt => { const p = pointAt(sp, Ease.ioQ(rm(tt, t0, t1))); return w2([p.x, p.y]); } }], S.t, { home: [ox + 2100, oy - 200], away: [ox + 2150, oy - 300] });
    }
    // blue pen: three boxes, two arrows
    if (T.rescue) {
      const jobs = [];
      l.ph.forEach((p, i) => {
        const pts = SN.box(p.box.x, p.box.y, p.box.w, p.box.h, { seed: p.seed }), t0 = beatT(T, 'rescue', R.boxes[i][0]), t1 = beatT(T, 'rescue', R.boxes[i][1]);
        jobs.push({ t0, t1, at: tt => { const q = pointAt(pts, Ease.ioQ(rm(tt, t0, t1))); return w2([q.x, q.y]); } });
      });
      const a1 = SN.arrow([[DIA.c[0][0] + 150, DIA.c[0][1] + 60], [DIA.c[0][0] + 210, DIA.c[0][1] + 150], [DIA.c[1][0] - 330, DIA.c[1][1] - 40], [DIA.c[1][0] - 300, DIA.c[1][1] - 10]], { seed: 81, head: 26 });
      const a2 = SN.arrow([[DIA.c[1][0] + 340, DIA.c[1][1] - 6], [DIA.c[1][0] + 470, DIA.c[1][1] - 40], [DIA.c[2][0] - 70, DIA.c[2][1] + 120], [DIA.c[2][0] - 40, DIA.c[2][1] + 58]], { seed: 83, head: 26 });
      for (const [a, w] of [[a1, R.arrow1], [a2, R.arrow2]]) {
        const t0 = beatT(T, 'rescue', w[0]), t1 = beatT(T, 'rescue', w[1]), t2 = beatT(T, 'rescue', w[1] + R.heads);
        jobs.push({ t0, t1: t2, at: tt => { if (tt <= t1) { const q = pointAt(a.shaft, Ease.ioQ(rm(tt, t0, t1))); return w2([q.x, q.y]); } const q = pointAt(a.head, rm(tt, t1, t2)); return w2([q.x, q.y]); } });
      }
      LB.drawPen(ctx, cam, LB.penPose(jobs, S.t, { enter: 0.3, home: [ox + 2100, oy + 1300], away: [ox + 2100, oy + 1350] }), C.accent2);
    }
    LB.drawPen(ctx, cam, poseO, C.accent);
    LB.drawPen(ctx, cam, poseK, C.ink);
    if (!T.rescue) return;
    const rb = since(S, 'rescue', 0) / T.rescue.beat;
    // erasers
    const eraser = (path, w, mv) => {
      const [a, w0, w1, z] = w;
      if (rb < a || rb > z) return;
      let pt, ang = 0;
      if (rb < w0) { const k = Ease.outC(rm(rb, a, w0)); pt = [lerp(path[0][0] + 400, path[0][0], k), lerp(path[0][1] - 80, path[0][1], k)]; }
      else if (rb <= w1) { const q = pointAt(path, Ease.ioQ(rm(rb, w0, w1))); pt = [q.x, q.y]; ang = Math.sin(q.a * 2) * 0.12; }
      else { const e = path[path.length - 1], k = Ease.inC(rm(rb, w1, z)); pt = [e[0] + mv[0] * k, e[1] + mv[1] * k]; }
      SN.eraserProp(ctx, cam.sx(pt[0] + ox), cam.sy(pt[1] + oy), { scale: cam.z * 0.62, ang: -0.05 + ang, lift: rb < w0 || rb > w1 ? 0.8 : 0.1 });
    };
    eraser(hookEraserPath(), R.erase1, [500, 260]);
    eraser(wallEraserPath(), R.erase2, [-500, 300]);
    // lifted cards (props until they land)
    l.ph.forEach((p, i) => {
      const q = cardPose(S, i);
      if (!q || q.landed) return;
      ctx.save();
      ctx.setTransform(cam.z, 0, 0, cam.z, W / 2 - cam.cx * cam.z, H / 2 - cam.cy * cam.z); ctx.translate(ox, oy);
      ctx.shadowColor = rgba('#1E2024', 0.2 * q.lift); ctx.shadowBlur = 16 * q.lift * cam.z; ctx.shadowOffsetX = 8 * q.lift * cam.z; ctx.shadowOffsetY = 14 * q.lift * cam.z;
      drawCard(ctx, S, i, q);
      ctx.restore();
    });
    // dot votes on the starred box (30-s hold)
    const hb = holdBar(S);
    if (hb !== null) {
      const hbb = (S.t - hb) / T.rescue.beat, st = starGeom();
      HOLD.dots.forEach((b0, j) => SN.sticker(ctx, cam.sx(ox + st.x - 150 + j * 44), cam.sy(oy + DIA.c[2][1] + 78 + (j % 2) * 8), 15 * cam.z, C.dotGreen || C.ok, (hbb - b0) * T.rescue.beat));
    }
  }

  LB.panels.notes = { ink, props };
})();
