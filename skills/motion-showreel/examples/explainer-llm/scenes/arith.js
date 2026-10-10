// arith (2 bars, 3 in the 60): directions carry meaning. The camera moves to the people; the step from man to woman
// draws as a yellow arrow, then slides, unchanged, to start at king's tip and lands next to queen. The formula above
// morphs as it happens: woman − man, then king − man + woman, then ≈ queen. A parallelogram closes. In the 60 copies
// of the same step fill the plane: one direction, one meaning, wherever it starts.
(() => {
  const CA = { ox: 600, oy: 610, u: 150 };
  SCENES['arith'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, n = Math.round(env.dur / B);
      const cam = VM.lerpCam(VM.CAM, CA, Ease.ioC(clamp(b / 1.1))), all = Object.keys(VM.toy().vocab);
      cam.u *= 1 + VM.PUSH * b;
      const man = VM.xy('man'), woman = VM.xy('woman'), king = VM.xy('king'), queen = VM.xy('queen'), d = [woman[0] - man[0], woman[1] - man[1]], kmw = VM.toy().kmw;
      VM.bg(ctx);
      VM.plane(ctx, cam);
      const fade = 1 - 0.8 * Ease.ioC(clamp(b / 1.0)), people = ['man', 'woman', 'king', 'queen'];
      // the field of copies (the 60)
      if (n > 8) {
        const fk = clamp((b - 8.1) / 1.6);
        for (let i = -5; i <= 6; i += 2) for (let j = -2; j <= 5; j += 2) {
          const p = [i - 0.4, j + 0.2], k = clamp(fk * 2.2 - Math.hypot(i - 2, j - 1) * 0.12); if (k <= 0) continue;
          VM.vec(ctx, cam, [p[0] + d[0] * 0.5, p[1] + d[1] * 0.5], VM.YELLOW, { from: p, k, w: 3, tip: 14, a: 0.55 });
        }
      }
      const ek = Ease.ioC(clamp(b / 1.0)), SW = ['the', 'cat', 'sat', 'on'];
      all.forEach(w => {
        const isP = people.includes(w), was = SW.includes(w), qk = w === 'queen' ? Math.sin(clamp((b - 4.7) / 1.1) * Math.PI) : 0;
        const lw = isP ? VM.lerp(3.5, 5.5, ek) : was ? VM.lerp(5.5, 3.5, ek) : 3.5, sz = isP ? VM.lerp(27, 34, ek) : was ? VM.lerp(31, 27, ek) : 27;
        VM.vec(ctx, cam, VM.xy(w), VM.colOf(w), { w: lw + qk * 2.5, tip: isP ? VM.lerp(18, 24, ek) : was ? VM.lerp(24, 18, ek) : 18, a: isP ? 1 : fade, glow: qk * 22 });
        VM.tipLabel(ctx, cam, VM.xy(w), w, VM.colOf(w), { size: sz + qk * 6, a: isP ? 1 : fade, glow: qk * 18 });
      });
      VM.head(ctx, { a: 1 - clamp(b / 0.6) });
      // the step: from man's tip to woman's, then slid to king's tip
      const g = clamp((b - 1.4) / 0.9), sl = Ease.ioC(clamp((b - 2.6) / 1.4));
      if (sl > 0) VM.vec(ctx, cam, woman, VM.YELLOW, { from: man, w: 4, tip: 20, a: 0.35 });
      const from = VM.lerp2(man, king, sl), to = [from[0] + d[0], from[1] + d[1]];
      VM.vec(ctx, cam, to, VM.YELLOW, { from, k: g, w: 5, glow: 10 });
      if (g > 0.5) { const [x, y] = VM.S(cam, [from[0] + d[0] * 0.5, from[1] + d[1] * 0.5]); VM.label(ctx, 'woman − man', x - 116, y + 12, VM.YELLOW, { size: 30, a: clamp(g * 2 - 1) * (1 - clamp((b - 4.2) * 2)) }); }
      // where it lands, and queen next to it
      const lk = clamp((b - 4.0) / 0.6);
      if (lk > 0) {
        const [x, y] = VM.S(cam, kmw); ctx.fillStyle = VM.YELLOW; circle(ctx, x, y, 8 * Ease.outBack(lk)); ctx.fill();
        const r = clamp((b - 4.0) / 1.2); ctx.strokeStyle = rgba(VM.YELLOW, 1 - r); ctx.lineWidth = 3; circle(ctx, x, y, 10 + r * 60); ctx.stroke();
      }
      // the parallelogram closes
      const pk = Ease.ioC(clamp((b - 5.3) / 0.9));
      if (pk > 0) {
        ctx.save(); ctx.setLineDash([10, 10]); ctx.strokeStyle = rgba(VM.INK, 0.45); ctx.lineWidth = 2;
        for (const [p0, p1] of [[man, king], [woman, kmw]]) { const A = VM.S(cam, p0), Bq = VM.S(cam, VM.lerp2(p0, p1, pk)); ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(Bq[0], Bq[1]); ctx.stroke(); }
        ctx.restore();
      }
      // the formula
      const Y = VM.YELLOW, BL = VM.KIND.person;
      const f1 = VM.F(ctx, { seq: [{ s: 'woman', id: 'woman', col: Y }, { s: ' − ', id: 'minus', col: Y }, { s: 'man', id: 'man', col: Y }] }, 60, 1300, 190, { align: 'center' });
      const f2 = VM.F(ctx, { seq: [{ s: 'king', id: 'king', col: BL }, { s: ' − ', id: 'minus', col: Y }, { s: 'man', id: 'man', col: Y }, { s: ' + ', id: 'plus', col: Y }, { s: 'woman', id: 'woman', col: Y }] }, 60, 1300, 190, { align: 'center' });
      const f3 = VM.F(ctx, { seq: [{ s: 'king', id: 'king', col: BL }, { s: ' − ', id: 'minus', col: Y }, { s: 'man', id: 'man', col: Y }, { s: ' + ', id: 'plus', col: Y }, { s: 'woman', id: 'woman', col: Y }, { s: '  ≈  ', id: 'approx' }, { s: 'queen', id: 'queen', col: BL }] }, 60, 1300, 190, { align: 'center' });
      const m1 = clamp((b - 2.6) / 1.2), m2 = clamp((b - 4.6) / 1.0), fa = clamp((b - 1.4) * 3);
      VM.panel(ctx, m2 > 0 ? f3 : m1 > 0 ? f2 : f1, fa * 0.9);
      if (m2 > 0) VM.morph(ctx, f2, f3, m2); else if (m1 > 0) VM.morph(ctx, f1, f2, m1); else VM.drawF(ctx, f1, clamp((b - 1.4) / 0.9));
      VM.caption(ctx, [['The step from ', VM.INK], ['man', BL], [' to ', VM.INK], ['woman', BL], [' also takes ', VM.INK], ['king', BL], [' to ', VM.INK], ['queen', BL], [': directions carry meaning.', VM.INK]], clamp((b - 5.2) / 1.3), { a: n > 8 ? 1 - clamp((b - 8.0) / 0.5) : 1 });
      if (n > 8) VM.caption(ctx, [['One ', VM.INK], ['direction', VM.YELLOW], [', one meaning, wherever it starts.', VM.INK]], clamp((b - 8.6) / 1.2));
    },
  };
})();
