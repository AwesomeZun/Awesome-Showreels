// attend (2 bars, 3 in the 60): attention pulls the arrow. The sentence comes back along the top; its last word, the,
// looks back at every word so far: arcs drawn from it as thick as its attention weights (3%, 18%, 32%, 41%, 6%,
// computed from the toy's queries and keys). Each word's suggestion, its value arrow scaled by its weight, is added
// tip to tail from the tip of the's own arrow; the sum is the new arrow h, yellow, pointing toward the places. The
// formula h = x + Σ aⱼvⱼ writes alongside. In the 60 the weights' own formula comes first: aⱼ = softmax(q·kⱼ/√2).
(() => {
  const CT = { ox: 1010, oy: 440, u: 135 }, CA = { ox: 600, oy: 610, u: 150 };
  const SENT = ['The', 'cat', 'sat', 'on', 'the'], SW = ['the', 'cat', 'sat', 'on'];
  SCENES['attend'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, n = Math.round(env.dur / B), X = Math.max(0, n - 8), bo = b - X;
      const T = VM.toy(), A = T.attention, all = Object.keys(T.vocab), x0 = VM.xy('the'), h = T.h;
      const cam = VM.lerpCam(VM.prev(env) === 'arith' ? { ...CA, u: CA.u * VM.pushOf('arith') } : VM.CAM, CT, Ease.ioC(clamp(b / 1.0)));
      cam.u *= 1 + VM.PUSH * b;
      VM.bg(ctx);
      VM.plane(ctx, cam);
      // the chain of suggestions, tip to tail from the tip of the
      const chain = [x0]; SENT.forEach((w, j) => { const v = T.values[w], c = chain[j]; chain.push([c[0] + A[j] * v[0], c[1] + A[j] * v[1]]); });
      const hk = clamp((bo - 5.0) / 0.9), pk = Ease.ioC(clamp((bo - 5.8) / 0.8));
      all.forEach(w => {
        if (SW.includes(w)) return; const pl = VM.kindOf(w) === 'place', a = pl ? 0.55 + 0.45 * pk : 0.22;
        VM.vec(ctx, cam, VM.xy(w), VM.colOf(w), { w: 3.5, tip: 18, a, glow: pl ? pk * 10 : 0 });
        VM.tipLabel(ctx, cam, VM.xy(w), w, VM.colOf(w), { size: pl ? 28 : 26, a, glow: pl ? pk * 12 : 0 });
      });
      ['cat', 'sat', 'on'].forEach(w => { VM.vec(ctx, cam, VM.xy(w), VM.colOf(w), { w: 4.5, a: 0.5 }); VM.tipLabel(ctx, cam, VM.xy(w), w, VM.colOf(w), { size: 28, a: 0.6 }); });
      const ind = Math.sin(clamp((b - 0.8) / 0.7) * Math.PI), tf = 1 - 0.65 * clamp((bo - 5.0) / 0.6);
      VM.vec(ctx, cam, x0, VM.colOf('the'), { w: 5.5 + ind * 2.5, a: tf, glow: ind * 16 });
      VM.tipLabel(ctx, cam, x0, 'the', VM.colOf('the'), { size: 31 + ind * 5, a: tf, glow: ind * 12, dy: -6 });
      SENT.forEach((w, j) => {
        const k = clamp((bo - 2.6 - j * 0.42) / 0.55), p0 = chain[j], p1 = chain[j + 1]; if (k <= 0) return;
        VM.vec(ctx, cam, p1, VM.TEAL, { from: p0, k, w: 5, tip: 18, glow: 6 });
        const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
        if (len > 0.15) { const m = VM.S(cam, VM.lerp2(p0, p1, 0.5)), d = [p1[0] - p0[0], p1[1] - p0[1]], nx = d[1] / len, ny = d[0] / len; VM.label(ctx, w, m[0] + nx * 30, m[1] + ny * 30 + 9, VM.TEAL, { size: 25, it: true, a: clamp(k * 2 - 1) }); }
      });
      // the new arrow
      if (hk > 0) {
        VM.vec(ctx, cam, h, VM.YELLOW, { k: hk, w: 6, tip: 26, glow: 14 });
        VM.tipLabel(ctx, cam, h, 'the, in context', VM.YELLOW, { size: 31, a: clamp(hk * 2 - 1), dx: -96, dy: 14 });
      }
      // along the top: the sentence, the arcs from its last word and the weights
      ctx.fillStyle = linear(ctx, 0, 0, 0, 260, [[0, rgba(VM.BG, 0.96)], [0.78, rgba(VM.BG, 0.9)], [1, rgba(VM.BG, 0)]]); ctx.fillRect(0, 0, W, 260);
      const pos = VM.head(ctx, { hl: 4, hlA: clamp((b - 0.6) / 0.4) }), from = pos[4];
      ctx.save(); ctx.lineCap = 'round';
      SENT.forEach((w, j) => {
        const k = Ease.ioC(clamp((b - 1.2 - (4 - j) * 0.16) / 0.7)); if (k <= 0) return;
        const to = pos[j], a = A[j], y0 = VM.HEAD.y - 44, pulse = Math.sin(clamp((bo - 2.6 - j * 0.42) / 0.55) * Math.PI);
        ctx.strokeStyle = rgba(VM.TEAL, 0.35 + 0.65 * Math.sqrt(a)); ctx.lineWidth = 1.5 + 11 * a + pulse * 3; ctx.beginPath();
        if (j === 4) { const r = 15; for (let s = 0; s <= 40 * k; s++) { const th = Math.PI / 2 + (s / 40) * TAU; ctx.lineTo(from.c + Math.cos(th) * r, y0 - r + Math.sin(th) * r); } }
        else { const x1 = from.c, x2 = to.c, hgt = 14 + 0.07 * (x1 - x2), mx = (x1 + x2) / 2; ctx.moveTo(x1, y0); for (let s = 1; s <= 30 * k; s++) { const u = s / 30; ctx.lineTo((1 - u) * (1 - u) * x1 + 2 * (1 - u) * u * mx + u * u * x2, (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * (y0 - hgt * 2) + u * u * y0); } }
        ctx.stroke();
        // a dot runs from the to each word, once a beat, as bright as the weight
        if (k >= 1) { const u = (b * 0.9 + j * 0.13) % 1, x1 = from.c, x2 = to.c, hgt = 14 + 0.07 * (x1 - x2), mx = (x1 + x2) / 2;
          const px = j === 4 ? from.c + Math.cos(Math.PI / 2 + u * TAU) * 15 : (1 - u) * (1 - u) * x1 + 2 * (1 - u) * u * mx + u * u * x2, py = j === 4 ? y0 - 15 + Math.sin(Math.PI / 2 + u * TAU) * 15 : (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * (y0 - hgt * 2) + u * u * y0;
          ctx.fillStyle = rgba('#FFFFFF', 0.35 + 0.65 * Math.sqrt(a)); circle(ctx, px, py, 2.5 + 5 * Math.sqrt(a)); ctx.fill(); }
        VM.txt(ctx, Math.round(a * 100) + '%', to.c, VM.HEAD.y + 58, { size: 27 + pulse * 4, align: 'center', color: VM.TEAL, a: clamp((b - 1.5 - (4 - j) * 0.16) / 0.4) });
      });
      ctx.restore();
      // the formulas
      const fh = VM.F(ctx, { seq: [{ s: 'h', it: true, col: VM.YELLOW, id: 'h' }, ' = ', { sub: [{ s: 'x', it: true }, { s: 'the' }] }, ' + ', { sub: [{ s: 'Σ', big: 1.3 }, { s: 'j', it: true }] }, ' ', { sub: [{ s: 'a', it: true, col: VM.TEAL }, { s: 'j', it: true }] }, { sub: [{ s: 'v', it: true, col: VM.TEAL }, { s: 'j', it: true }] }] }, 50, 1585, 790, { align: 'center' });
      const fk = clamp((bo - 2.6) / 1.0); VM.panel(ctx, fh, clamp(fk * 3)); VM.drawF(ctx, fh, fk);
      if (X) {
        const fa = VM.F(ctx, { seq: [{ sub: [{ s: 'a', it: true, col: VM.TEAL }, { s: 'j', it: true }] }, ' = softmax(', { s: 'q', it: true }, ' ⋅ ', { sub: [{ s: 'k', it: true }, { s: 'j', it: true }] }, ' / √2)'] }, 44, 1560, 470, { align: 'center' });
        const ak = clamp((b - 2.8) / 1.0); VM.panel(ctx, fa, clamp(ak * 3) * 0.95, 30); VM.drawF(ctx, fa, ak);
        VM.write(ctx, 'how well each word’s key matches the query', 1560, 540, clamp((b - 3.7) / 1.0), { size: 26, align: 'center', color: VM.DIM, it: true });
      }
      VM.caption(ctx, [['Attention: “the” looks back, and its arrow is pulled toward ', VM.INK], ['places', VM.KIND.place], ['.', VM.INK]], clamp((bo - 6.1) / 1.2));
    },
  };
})();
