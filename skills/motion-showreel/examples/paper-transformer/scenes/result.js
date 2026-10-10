// result (2 bars; the end): what it did. A typeset result: WMT 2014 English to German, the best earlier system (an
// ensemble) at 26.36 BLEU and the big Transformer at 28.4, the bars drawing in and the difference marked; the cost (3.5
// days on 8 P100 GPUs). Then the citation in full and the note: an unofficial explainer, not affiliated with the
// authors; the toy model and the drawings are ours.
(() => {
  SCENES['result'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, n = Math.round(env.dur / B), cam = { z: 1.03 - 0.03 * Ease.ioSine(clamp(b / n)) };
      TX.page(ctx, cam);
      TX.onPage(ctx, cam, (g) => {
        TX.txt(g, '5  Result (from the paper)', 140, 150, { size: 30, weight: 600, color: TX.RED });
        TX.txt(g, 'WMT 2014 English → German, BLEU', 140, 260, { size: 40, weight: 600, a: clamp(b * 2) });
        const rows = [['best earlier system (ensemble)', 26.36, '#8C857A'], ['Transformer (big)', 28.4, TX.RED]];
        rows.forEach(([name, v, col], i) => {
          const y = 340 + i * 110, k = Ease.outExpo(clamp((b - 0.5 - i * 0.4) / 0.9)), w = (v - 20) / 10 * 900 * k;
          TX.txt(g, name, 140, y + 34, { size: 30, it: i === 0, a: clamp((b - 0.5 - i * 0.4) * 2) });
          g.fillStyle = rgba(col, 0.85); g.fillRect(640, y + 4, w, 44);
          TX.txt(g, v.toFixed(i ? 1 : 2), 660 + w, y + 38, { size: 32, weight: 600, color: col, a: k });
        });
        const dk = clamp((b - 1.8) / 0.6);
        if (dk > 0) { const x0 = 640 + 0.636 * 900, x1 = 640 + 0.84 * 900; g.strokeStyle = rgba(TX.RED, dk); g.lineWidth = 2; g.beginPath(); g.moveTo(x0, 330); g.lineTo(x0, 318); g.lineTo(x1, 318); g.lineTo(x1, 330); g.stroke(); TX.txt(g, '+2.0', (x0 + x1) / 2, 306, { size: 30, weight: 600, color: TX.RED, align: 'center', a: dk }); }
        TX.txt(g, '3.5 days of training on 8 NVIDIA P100 GPUs', 140, 640, { size: 34, it: true, a: clamp((b - 2.4) * 2) });
        const ek = clamp((b - 3.6) / 0.8);
        g.fillStyle = rgba(TX.INK, ek); g.fillRect(140, 730, 1640 * Ease.outExpo(ek), 1.5);
        TX.txt(g, 'Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., Kaiser, Ł. & Polosukhin, I.', 140, 790, { size: 26, a: ek });
        TX.txt(g, 'Attention Is All You Need. Advances in Neural Information Processing Systems 30 (2017). arXiv:1706.03762', 140, 830, { size: 26, it: true, a: clamp((b - 3.9) * 2) });
        TX.txt(g, 'An unofficial explainer, not affiliated with the authors. The toy model and the drawings are ours.', 140, 900, { size: 24, color: '#5A554C', a: clamp((b - 4.3) * 2) });
      });
    },
  };
})();
