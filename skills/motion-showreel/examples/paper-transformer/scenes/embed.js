// embed (2 bars, the 30 only): sixteen numbers per word. The sentence sets in; under every word a column of sixteen
// cells fills, eight for what kind of word it is (one cell inked) and eight for where it stands: the paper's position
// code, computed (sines and cosines of the position at four frequencies). The code's first two waves are drawn through
// the positions so the pattern shows, and the formula sits beside them.
(() => {
  SCENES['embed'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, cam = { z: 1.02 - 0.02 * clamp(b / 8), dy: -10 * clamp(b / 8) };
      TX.page(ctx, cam);
      TX.onPage(ctx, cam, (g) => {
        TX.txt(g, '1  Words become numbers', 140, 150, { size: 30, weight: 600, color: TX.RED });
        const pos = TX.wordsAt(260, 1660, 280, 44);
        pos.forEach((p, i) => TX.txt(g, TX.WORDS[i], p.x, p.y, { size: 44, a: clamp((b - i * 0.08) * 3) }));
        const c = 22;
        pos.forEach((p, i) => {
          const col = TX.X[i].map(v => [v]);
          const kind = col.slice(0, 8), place = col.slice(8);
          TX.matrix(g, kind, p.c - c / 2, 320, c, clamp((b - 0.8 - i * 0.06) / 0.6), { max: 1 });
          TX.matrix(g, place, p.c - c / 2, 320 + 8 * c + 14, c, clamp((b - 2 - i * 0.06) / 0.6), { max: 1, ink: '#2C4A9A' });
        });
        TX.txt(g, 'kind', 140, 320 + 4 * c + 8, { size: 26, it: true, color: '#5A554C', a: clamp(b - 0.8) });
        TX.txt(g, 'position', 140, 320 + 12 * c + 22, { size: 26, it: true, color: '#2C4A9A', a: clamp(b - 2) });
        // the first two waves of the position code, through the ten positions
        const wk = clamp((b - 3.4) / 1.6), y0 = 860, A = 70;
        if (wk > 0) for (const [f, col] of [[1, '#2C4A9A'], [0.1, '#1F7A7A']]) {
          g.save(); g.strokeStyle = rgba(col, 0.85); g.lineWidth = 3; g.beginPath();
          const x0 = pos[0].c, x1 = pos[9].c;
          for (let s = 0; s <= 400 * wk; s++) { const u = s / 400, P = u * 9, x = x0 + (x1 - x0) * u, y = y0 - Math.sin(P * f) * A; s ? g.lineTo(x, y) : g.moveTo(x, y); }
          g.stroke();
          for (let i = 0; i < 10 && i <= 9 * wk; i++) { g.fillStyle = col; circle(g, pos[i].c, y0 - Math.sin(i * f) * A, 6); g.fill(); }
          g.restore();
        }
        const fk = clamp((b - 4.6) / 1.2);
        if (fk > 0) { const box = TX.lay(g, { seq: ['PE(', { it: true, s: 'pos' }, ', 2', { it: true, s: 'i' }, ') = sin(', { it: true, s: 'pos' }, ' / ', { sup: ['10000', { seq: ['2', { it: true, s: 'i' }, '/', { it: true, s: 'd' }] }] }, ')'] }, 40); TX.setFormula(g, box, W / 2 - box.w / 2, 1000, { p: fk }); }
      });
    },
  };
})();
