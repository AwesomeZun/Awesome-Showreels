// modules/panel-kit.js: the kit panel (LB.panels.kit), drawn from the kit scene's clock (30-s cut).
// "3 markers. 3 jobs." Three whiteboard markers drop in on the beat and pop their caps; black writes "words", blue
// boxes "structure" and points at it, orange stars "the ONE thing". Hold: a pen note, the markers bob on the beat.
(() => {
  const K = LB.COPY;
  const COL = [420, 960, 1500], REST_Y = 420, MK = { len: 330, scale: 1.05 };
  const T = {                                       // beats from the kit scene's start
    head: 1.5, headCps: 24,
    land: [2.5, 4.0, 5.5], drop: 0.42, cap: [2.75, 4.25, 5.75],
    words: [3.0, 13], structure: [4.25, 20], boxS: [4.75, 5.25], arrowS: [5.25, 5.6],
    one: [5.5, 22], star: [6.0, 6.5],
    note: [0, 30],                                  // from the first hold bar line, seconds offset, cps
  };
  const colors = () => [C.markerBlack || C.ink, C.markerBlue || C.accent2, C.markerOrange || C.accent];
  const since = (S, b) => S.t - (S.T.kit.t0 + b * S.T.kit.beat);
  const JOB = { size: 80, weight: 600, y: 680 };
  const geomS = () => { const w = SN.textWidth(K.jobs[1], { size: JOB.size, weight: JOB.weight, fam: 'sans' }); return { x: COL[1] - w / 2 - 26, y: JOB.y - JOB.size * 0.95, w: w + 52, h: JOB.size * 1.35 }; };
  const arrowS = (boil) => SN.arrow([[COL[1] - 150, JOB.y + 150], [COL[1] - 60, JOB.y + 112], [COL[1] - 14, JOB.y + 52]], { seed: 207, boil, head: 22 });
  const starP = () => { const w = SN.textWidth(K.jobs[2], { size: 64, weight: JOB.weight, fam: 'sans' }); return { x: COL[2] - w / 2 - 70, y: JOB.y - 24, r: 44 }; };
  function holdBar(S) {
    const k = S.T.kit, he = k.t0 + k.dur - k.outSec, bl = k.t0 + Math.ceil((k.inSec - 1e-6) / k.bar) * k.bar;
    return bl < he - 1e-6 && S.t >= bl ? bl : null;
  }

  function ink(g, S) {
    if (!S.T.kit) return;
    const boil = S.boil, b = S.T.kit.beat;
    SN.write(g, K.kitHead, 150, 236, SN.kAt(since(S, T.head), 0, T.headCps), { size: 120, weight: 800, fam: 'display', color: C.ink, seed: 201, boil, tilt: 0.02 });
    SN.write(g, K.jobs[0], COL[0], JOB.y, SN.kAt(since(S, T.words[0]), 0, T.words[1]), { size: JOB.size + 10, weight: 700, fam: 'sans', color: C.ink, seed: 203, boil, align: 'center' });
    SN.write(g, K.jobs[1], COL[1], JOB.y, SN.kAt(since(S, T.structure[0]), 0, T.structure[1]), { size: JOB.size, weight: JOB.weight, fam: 'sans', color: C.ink, seed: 205, boil, align: 'center' });
    const gs = geomS();
    SN.stroke(g, SN.box(gs.x, gs.y, gs.w, gs.h, { seed: 206, boil }), Ease.ioQ(rm(since(S, T.boxS[0]) / b, 0, T.boxS[1] - T.boxS[0])), { color: C.accent2, width: 8 });
    const a = arrowS(boil), ak = rm(since(S, T.arrowS[0]) / b, 0, T.arrowS[1] - T.arrowS[0]);
    SN.stroke(g, a.shaft, Ease.ioQ(ak), { color: C.accent2, width: 8 }); SN.stroke(g, a.head, rm(since(S, T.arrowS[1]) / b, 0, 0.18), { color: C.accent2, width: 8 });
    SN.write(g, K.jobs[2], COL[2] + 30, JOB.y, SN.kAt(since(S, T.one[0]), 0, T.one[1]), { size: 64, weight: JOB.weight, fam: 'sans', color: C.ink, seed: 209, boil, align: 'center', colorFn: (i) => (i >= 4 && i < 7 ? C.ink : null) });
    const sp = starP(), sk = Ease.ioQ(rm(since(S, T.star[0]) / b, 0, T.star[1] - T.star[0]));
    if (sk > 0) {
      const hit = since(S, T.star[1]), pop = hit > 0 ? 1 + 0.18 * wob(hit, 2.6, 6) : 1;
      g.save(); g.translate(sp.x, sp.y); g.scale(pop, pop); g.translate(-sp.x, -sp.y);
      SN.stroke(g, SN.star(sp.x, sp.y, sp.r, { seed: 211, boil }), sk, { color: C.accent, width: 9 });
      g.restore();
    }
    const hb = holdBar(S);
    if (hb !== null) SN.write(g, K.kitNote, 960, 900, SN.kAt(S.t - hb, T.note[0], T.note[1]), { size: 56, weight: 600, fam: 'pen', color: C.ink2, seed: 215, boil, align: 'center' });
  }

  function props(ctx, S, P) {
    if (!S.T.kit) return;
    const cam = S.cam, b = S.T.kit.beat, cols = colors(), boil = S.boil;
    const wpt = (x, y) => [cam.sx(P.x + x), cam.sy(P.y + y)];
    cols.forEach((col, i) => {
      const tl = since(S, T.land[i]);
      if (tl < -T.drop * b) return;
      // drop in on the beat (rest pose: lying flat, nib to the left), squash on landing, bob on the beat after
      const fall = tl < 0 ? Ease.inQ(1 + tl / (T.drop * b)) : 1;
      let x = COL[i] - MK.len * MK.scale * 0.5, y = lerp(REST_Y - 700, REST_Y, fall);
      const land = tl > 0 ? wob(tl, 3, 7) : 0;
      const bob = tl > b ? Math.abs(Math.sin(Math.PI * ((S.t / b + i * 0.5) % 1))) * 6 * rm(tl, b, 2 * b) : 0;
      let ang = 0.04 * land - 0.02 * i, lift = tl < 0 ? 0.9 : 0.15;
      // pen jobs: black writes "words", blue boxes "structure" and draws the arrow, orange draws the star
      const job = penJob(S, i, boil);
      if (job) { const k = job.k; x = lerp(x, job.x - 0, k); y = lerp(y - bob, job.y, k); ang = lerp(ang, -0.95, k); lift = lerp(lift, 0, k); }
      const capOn = S.t < S.T.kit.t0 + T.cap[i] * b;
      const [sx, sy] = wpt(x, y - bob * (job ? 1 - job.k : 1) - land * 6);
      SN.marker(ctx, sx, sy, { color: col, ang, lift, scale: cam.z * MK.scale, len: MK.len, cap: capOn ? 'on' : 'none' });
      const tc = since(S, T.cap[i]);                                  // the cap pops off and tumbles away
      if (tc > 0 && tc < 1.2) {
        const cx = COL[i] - MK.len * MK.scale * 0.5 + 30 - 300 * tc, cy = REST_Y - 6 - 620 * tc + 0.5 * 2600 * tc * tc;
        const [px, py] = wpt(cx, cy);
        SN.cap(ctx, px, py, { color: col, ang: -6 * tc, scale: cam.z * MK.scale });
      }
    });
  }
  // Where marker i is during its job (k = how far it has left its rest pose, 0..1), or null.
  function penJob(S, i, boil) {
    const b = S.T.kit.beat, lt = (t) => S.t - (S.T.kit.t0 + t * b);
    const ease = (t0, t1) => Math.min(Ease.ioC(rm(S.t, S.T.kit.t0 + t0 * b - 0.18, S.T.kit.t0 + t0 * b)), 1 - Ease.ioC(rm(S.t, S.T.kit.t0 + t1 * b, S.T.kit.t0 + t1 * b + 0.25)));
    if (i === 0) {
      const k0 = T.words[0], u = SN.textUnits(K.jobs[0], { fam: 'sans', weight: 700 }), k1 = k0 + u / T.words[1] / b;
      const k = ease(k0, k1);
      if (k <= 0) return null;
      const p = SN.penAt(K.jobs[0], COL[0], JOB.y, SN.kAt(lt(k0), 0, T.words[1]), { size: JOB.size + 10, weight: 700, fam: 'sans', seed: 203, boil, align: 'center' });
      return { x: p[0], y: p[1], k };
    }
    if (i === 1) {
      const k = ease(T.boxS[0], T.arrowS[1] + 0.18);
      if (k <= 0) return null;
      const gs = geomS(), box = SN.box(gs.x, gs.y, gs.w, gs.h, { seed: 206 }), a = arrowS(0), bt = (S.t - S.T.kit.t0) / b;
      let q;
      if (bt < T.boxS[1]) q = pointAt(box, Ease.ioQ(rm(bt, T.boxS[0], T.boxS[1])));
      else if (bt < T.arrowS[0]) { const e = box[box.length - 1], s0 = a.shaft[0], m = rm(bt, T.boxS[1], T.arrowS[0]); q = { x: lerp(e[0], s0[0], Ease.ioQ(m)), y: lerp(e[1], s0[1], Ease.ioQ(m)) }; }
      else if (bt < T.arrowS[1]) q = pointAt(a.shaft, Ease.ioQ(rm(bt, T.arrowS[0], T.arrowS[1])));
      else q = pointAt(a.head, rm(bt, T.arrowS[1], T.arrowS[1] + 0.18));
      return { x: q.x, y: q.y, k };
    }
    const k = ease(T.star[0], T.star[1]);
    if (k <= 0) return null;
    const sp = starP(), st = SN.star(sp.x, sp.y, sp.r, { seed: 211 }), q = pointAt(st, Ease.ioQ(rm((S.t - S.T.kit.t0) / b, T.star[0], T.star[1])));
    return { x: q.x, y: q.y, k };
  }

  LB.panels.kit = { ink, props };
})();
