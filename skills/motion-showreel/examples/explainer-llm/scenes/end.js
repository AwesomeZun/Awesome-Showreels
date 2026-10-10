// end (1 bar, 2 in the 60): the loop goes on. The sentence comes down to the middle of the page and keeps going, a word
// at a time, each new word flashing yellow as it is drawn: "The cat sat on the mat and purred." Then the idea in three
// short lines (words are arrows, context bends them, the next word points the same way) and the note that this was a
// two-dimensional toy. In the 60 the whole loop is laid out first: tokens, arrows, attention, scores, softmax, a draw.
(() => {
  const L = ['The', 'cat', 'sat', 'on', 'the', 'mat', 'and', 'purred.'];
  const STEPS = [['tokens', VM.INK], ['arrows', VM.KIND.person], ['attention', VM.TEAL], ['scores', VM.YELLOW], ['softmax', VM.KIND.place], ['draw a word', VM.PINK]];
  SCENES['end'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, n = Math.round(env.dur / B), X = Math.max(0, n - 4), bo = b - X;
      VM.bg(ctx);
      // behind it all, the plane and its arrows turning slowly away
      const spin = env.lt / env.dur, cam = { ox: W / 2, oy: H / 2 + 40, u: 150 + 30 * spin, M: VM.rot(0.05 + 0.22 * spin) }, ga = 0.16 + 0.1 * clamp(b / 1.2);
      VM.plane(ctx, cam, { a: ga * 1.4 });
      Object.keys(VM.toy().vocab).forEach(w => VM.vec(ctx, cam, VM.xy(w), VM.colOf(w), { w: 3.5, tip: 18, a: ga * 1.6 }));
      ctx.fillStyle = radial(ctx, W / 2, H / 2, 0, W * 0.6, [[0, rgba(VM.BG, 0.75)], [1, rgba(VM.BG, 0.2)]]); ctx.fillRect(0, 0, W, H);
      const hp = VM.headPos(ctx), lp = VM.words(ctx, L, W / 2, X ? 380 : 430, 68, { gap: 12 }), m = Ease.ioC(clamp(b / 0.9));
      L.forEach((w, i) => {
        if (i < 6) { const x = VM.lerp(hp[i].x, lp[i].x, m), y = VM.lerp(VM.HEAD.y, lp[i].y, m); VM.txt(ctx, w, x, y, { size: VM.lerp(VM.HEAD.size, 68, m) }); return; }
        const k = clamp((b - 0.75 - (i - 6) * 0.38) / 0.45); if (k <= 0) return;
        const fl = 1 - clamp((b - 1.2 - (i - 6) * 0.38) / 0.6);
        ctx.fillStyle = rgba(VM.YELLOW, fl * 0.9); ctx.beginPath(); ctx.moveTo(lp[i].c, lp[i].y - 78); ctx.lineTo(lp[i].c - 10, lp[i].y - 96); ctx.lineTo(lp[i].c + 10, lp[i].y - 96); ctx.closePath(); ctx.fill();
        VM.write(ctx, w, lp[i].x, lp[i].y, k, { size: 68, color: toHex(mix(VM.INK, VM.YELLOW, fl)) });
      });
      // (the 60) the loop, laid out
      if (X) {
        const ws = STEPS.map(([s]) => VM.width(ctx, s, { size: 36 })), gap = 64, tot = ws.reduce((a, c) => a + c, 0) + gap * (STEPS.length - 1); let x = W / 2 - tot / 2; const y = 560;
        STEPS.forEach(([s, col], i) => {
          const k = clamp((b - 1.2 - i * 0.42) / 0.6); VM.write(ctx, s, x, y, k, { size: 36, color: col });
          if (i < STEPS.length - 1 && k > 0.5) VM.arrowS(ctx, x + ws[i] + 12, y - 12, x + ws[i] + gap - 12, y - 12, VM.DIM, { w: 2.5, tip: 12, a: clamp((k - 0.5) * 2) });
          x += ws[i] + gap;
        });
        const lk = Ease.ioC(clamp((b - 3.9) / 0.9));
        if (lk > 0) { const xa = W / 2 + tot / 2 - ws[ws.length - 1] / 2, xb = W / 2 - tot / 2 + ws[0] / 2; ctx.save(); ctx.strokeStyle = rgba(VM.DIM, 0.8); ctx.lineWidth = 2.5; ctx.setLineDash([2000 * lk, 3000]); ctx.beginPath(); ctx.moveTo(xa, y + 18); ctx.bezierCurveTo(xa, y + 90, xb, y + 90, xb, y + 22); ctx.stroke(); ctx.restore(); if (lk > 0.95) VM.arrowS(ctx, xb, y + 40, xb, y + 18, VM.DIM, { w: 2.5, tip: 12 }); VM.write(ctx, 'and again, for every next word', W / 2, y + 118, clamp((b - 4.4) / 0.8), { size: 28, it: true, align: 'center', color: VM.DIM }); }
      }
      // the idea, in three short lines
      const y0 = X ? 790 : 640;
      VM.writeSeg(ctx, [['Words are ', VM.INK], ['arrows', VM.KIND.person], ['. ', VM.INK], ['Context', VM.TEAL], [' bends them.', VM.INK]], W / 2, y0, clamp((bo - 1.2) / 1.0), { size: 50, align: 'center' });
      VM.writeSeg(ctx, [['The ', VM.INK], ['next word', VM.YELLOW], [' is one that points the same way.', VM.INK]], W / 2, y0 + 74, clamp((bo - 1.7) / 1.0), { size: 50, align: 'center' });
      VM.write(ctx, 'A two-dimensional toy: real models use thousands of dimensions and learn their arrows from text.', W / 2, 1018, clamp((bo - 2.4) / 0.9), { size: 26, align: 'center', color: VM.MUTED });
    },
  };
})();
