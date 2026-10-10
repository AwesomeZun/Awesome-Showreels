// title (1 bar, 2 in the 30): the paper, typeset. On cream paper under a desk lamp, AN UNOFFICIAL EXPLAINER in spaced
// vermilion capitals, then the title set letter by letter like type, a caret at the insertion point; the authors and
// the venue in italic, a rule drawing under them. In the 30 the idea follows in one line.
(() => {
  SCENES['title'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, n = Math.round(env.dur / B), cam = { z: 1 + 0.03 * Ease.ioSine(clamp(b / n)) };
      TX.page(ctx, cam);
      TX.onPage(ctx, cam, (g) => {
        TX.txt(g, 'AN UNOFFICIAL EXPLAINER', W / 2, 300, { size: 24, weight: 600, color: TX.RED, align: 'center', ls: 6, a: clamp(b * 3) });
        TX.typeset(g, 'Attention Is All You Need', W / 2, 452, clamp((b - 0.2) / 1.4), { size: 112, weight: 600, align: 'center' });
        const r = Ease.outExpo(clamp((b - 1.5) / 0.8)); g.fillStyle = TX.INK; g.fillRect(W / 2 - 360 * r, 500, 720 * r, 2);
        TX.txt(g, 'Vaswani, Shazeer, Parmar, Uszkoreit, Jones, Gomez, Kaiser & Polosukhin', W / 2, 562, { size: 32, it: true, align: 'center', a: clamp((b - 1.7) * 2.5) });
        TX.txt(g, 'NeurIPS 2017 · arXiv:1706.03762', W / 2, 610, { size: 28, align: 'center', color: '#5A554C', a: clamp((b - 2) * 2.5) });
        if (n >= 8) TX.typeset(g, 'No recurrence, no convolution: every word attends to every other word.', W / 2, 760, clamp((b - 3.2) / 2.4), { size: 40, it: true, align: 'center' });
      });
    },
  };
})();
