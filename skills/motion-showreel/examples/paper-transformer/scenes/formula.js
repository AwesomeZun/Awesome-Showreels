// formula (2 bars, 3 in the 30): every term becomes its matrix. The paper's attention formula is set large; then, for
// one head of the toy model (the one that looks one word back), each term grows its real matrix below it: Q, K
// transposed, the scaled scores, the softmax weights (each row sums to one) and V, with fine leaders from the symbols
// to the matrices. The weights show the head's habit as a band just under the diagonal, and a note says so.
(() => {
  const F = { seq: [{ s: 'Attention', id: 'att' }, '(', { it: true, s: 'Q', id: 'q' }, ', ', { it: true, s: 'K' }, ', ', { it: true, s: 'V' }, ')  =  ', { s: 'softmax', id: 'sm' }, ' ',
    { frac: [{ seq: [{ it: true, s: 'Q', id: 'q2' }, { sup: [{ it: true, s: 'K', id: 'k2' }, { s: 'T' }] }] }, { sqrt: { sub: [{ it: true, s: 'd', id: 'dk' }, { it: true, s: 'k' }] } }], id: 'frac' }, '  ', { it: true, s: 'V', id: 'v2' }] };
  SCENES['formula'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, n = Math.round(env.dur / B), cam = { z: 1 + 0.02 * clamp(b / n) };
      const M = TX.matrices(0);
      TX.page(ctx, cam);
      TX.onPage(ctx, cam, (g) => {
        TX.txt(g, '2  Scaled dot-product attention', 140, 150, { size: 30, weight: 600, color: TX.RED });
        const box = TX.lay(g, F, 72), fx = W / 2 - box.w / 2, fy = 300;
        const ids = TX.setFormula(g, box, fx, fy, { p: clamp(b / 1.2) });
        const c = 15, Y = 520, items = [
          ['q2', M.Q, 200, 'Q', 1.4], ['k2', M.KT, 520, 'Kᵀ', 1.8], ['frac', M.S, 900, 'QKᵀ/√dₖ', 2.4], ['sm', M.A, 1220, 'softmax(·)', 3.2], ['v2', M.V, 1540, 'V', 3.8]];
        for (const [id, m, x, label, t0] of items) {
          const k = clamp((b - t0) / 0.8); if (k <= 0) continue;
          const at = ids[id]; if (at) { g.strokeStyle = rgba(TX.INK, 0.35 * k); g.lineWidth = 1.2; g.setLineDash([4, 6]); g.beginPath(); g.moveTo(at[0] + at[2] / 2, at[1] + at[4] + 10); g.lineTo(x + m[0].length * c / 2, Y - 34); g.stroke(); g.setLineDash([]); }
          TX.matrix(g, m, x, Y, c, k, { max: id === 'sm' ? 1 : undefined, ink: id === 'sm' ? TX.RED : TX.INK });
          TX.txt(g, label, x + m[0].length * c / 2, Y + m.length * c + 44, { size: 28, it: true, align: 'center', a: k });
        }
        const nk = clamp((b - 4.6) / 0.6);
        if (nk > 0) {
          TX.txt(g, 'This head’s weights sit just under the diagonal: each word looks one word back.', W / 2, 960, { size: 32, it: true, align: 'center', a: nk });
          TX.txt(g, 'Every row of weights sums to 1.', W / 2, 1006, { size: 26, align: 'center', color: '#5A554C', a: clamp((b - 5.2) * 2) });
        }
      });
    },
  };
})();
