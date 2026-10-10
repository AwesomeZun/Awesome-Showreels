// cover (2 bars, 3 in the 30): the notebook opens on the project. A print of the organoid in cross-section (a generated
// watercolour-and-ink illustration) drops onto the right page and two strips of tape slap on; the pen fills the header
// and writes the title on the left page in its own hand. In the 30 it adds the authors, the question, and the margin
// sketches of the tools (pipette, plate, dome). On the last beat the right page turns.
(() => {
  const TITLE = ['A timed WNT pulse', 'doubles mature enterocytes', 'in human intestinal', 'organoids'];
  function right(g, b, n) {
    BOOK.print(g, 70, 150, 660, 500, -0.025, (b - 0.3) / 0.6, { img: BOOK.ill('cover') });
    BOOK.tape(g, 96, 158, 150, -0.62, (b - 0.9) / 0.25); BOOK.tape(g, 702, 640, 150, -0.55, (b - 1.1) / 0.25);
    if (n >= 12) {
      for (const [name, x, y, w, t0] of [['pipette', 80, 700, 90, 6], ['plate', 220, 730, 250, 6.6], ['dish', 520, 740, 220, 7.2]]) {
        const im = BOOK.ill(name), k = clamp((b - t0) / 0.9); if (!im || k <= 0) continue;
        const h = w * im.naturalHeight / im.naturalWidth;
        g.save(); g.beginPath(); g.rect(x, y, w * Ease.ioC(k), h); g.clip(); g.globalAlpha = 0.85; g.drawImage(im, x, y, w, h); g.restore();
      }
    }
  }
  SCENES['cover'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, n = Math.round(env.dur / B), lt = env.lt;
      BOOK.desk(ctx); BOOK.spread(ctx, { pages: [1, 2] });
      BOOK.onPage(ctx, 'R', g => right(g, b, n));
      let head = null;
      BOOK.onPage(ctx, 'L', g => {
        const items = [{ s: 'WNT timing', x: 130, y: 54, t0: 0.15 * B, cps: 22, size: 30 }, { s: 'day 0', x: 522, y: 54, t0: 0.45 * B, cps: 22, size: 30 }];
        TITLE.forEach((s, i) => items.push({ s, x: 60, y: 230 + i * 86, t0: (1.3 + i * 0.75) * B, cps: 20, size: 70, weight: 600 }));
        if (n >= 12) {
          items.push({ s: 'Lindqvist, Mehta, Costa & Demir', x: 60, y: 640, t0: 5 * B, cps: 24, size: 36, color: '#5A5248' });
          items.push({ s: 'Q: does the day of one pulse matter?', x: 60, y: 740, t0: 7 * B, cps: 22, size: 40, color: BOOK.MAG });
        }
        head = BOOK.notes(g, items, lt);
        BOOK.inkLine(g, [[60, 560], [380, 556], [690, 562]], (b - 4.4) / 0.6, { color: BOOK.MAG, w: 3 });
        const p = BOOK.PG.L; if (head) head = [head[0] + p.x, head[1] + p.y];
      });
      if (head) BOOK.pen(ctx, head[0], head[1], { rot: 0.05 });
      const tk = clamp((b - (n - 0.8)) / 0.8); BOOK.turn(ctx, tk, g => right(g, n, n), 4);
    },
  };
})();
