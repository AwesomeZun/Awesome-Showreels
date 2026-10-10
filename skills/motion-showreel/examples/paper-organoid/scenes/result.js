// result (2 bars, 3 in the 30; the end): two times the enterocytes. A stained organoid drops onto the left page (a
// generated illustration in the style of immunofluorescence, and labelled as an illustration); on the right the pen
// draws the result as a bar chart (control 21%, day-4 pulse 42%, every well a dot), writes 2x and rings it, and notes
// that stem cells hold. The last lines are the article's: the authors, and that it is fictional with simulated data.
(() => {
  SCENES['result'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, n = Math.round(env.dur / B), lt = env.lt, D = BOOK.data();
      BOOK.desk(ctx); BOOK.spread(ctx, { pages: [7, 8] });
      let head = null;
      BOOK.onPage(ctx, 'L', g => {
        BOOK.print(g, 80, 150, 640, 640, -0.02, (b - 0.2) / 0.6, { img: BOOK.ill('stained'), border: '#111', margin: 0, foot: 0 });
        BOOK.tape(g, 110, 160, 150, -0.66, (b - 0.7) / 0.25); BOOK.tape(g, 690, 778, 150, -0.6, (b - 0.85) / 0.25);
        g.font = `500 17px ${FAM.mono}`; g.fillStyle = 'rgba(38,34,29,0.8)';
        if (b > 1) { g.fillText('illustration · day 7, day-4 pulse', 80, 830); g.fillStyle = BOOK.MAG; g.fillText('villin', 80, 858); g.fillStyle = BOOK.GRN; g.fillText('LGR5', 160, 858); g.fillStyle = BOOK.BLUE; g.fillText('DNA', 230, 858); }
      });
      BOOK.onPage(ctx, 'R', g => {
        const X0 = 120, Y0 = 640, Hh = 380, bw = 170, k = (i) => Ease.outC(clamp((b - 1.2 - i * 0.4) / 0.7));
        BOOK.inkLine(g, [[X0 - 30, Y0 - Hh], [X0 - 30, Y0], [X0 + 520, Y0]], clamp((b - 0.9) / 0.4), { w: 2.2, seed: 7 });
        [[D.means.control, D.control, '#8A8174', 'control'], [D.means['day 4'], D.day4, BOOK.MAG, 'd4 pulse']].forEach(([m, pts, col, name], i) => {
          const x = X0 + i * 280, h = m / 50 * Hh * k(i);
          g.fillStyle = rgba(col, 0.55); g.fillRect(x, Y0 - h, bw, h);
          g.strokeStyle = rgba('#26221D', 0.8); g.lineWidth = 2; g.strokeRect(x, Y0 - h, bw, h);
          pts.forEach((v, j) => { if (k(i) < 1) return; g.fillStyle = 'rgba(38,34,29,0.8)'; circle(g, x + 25 + (j % 8) * 17 + (hash(j + i) - 0.5) * 6, Y0 - v / 50 * Hh, 4); g.fill(); });
          if (k(i) > 0.05) { g.font = `600 22px ${FAM.mono}`; g.fillStyle = col; g.globalAlpha = clamp(k(i) * 2); g.fillText(`${Math.round(m)}%`, x + 52, Y0 - h - 44); g.globalAlpha = 1; }
        });
        const items = [{ s: 'control', x: X0 + 40, y: Y0 + 48, t0: 1.4 * B, cps: 22, size: 36 }, { s: 'd4 pulse', x: X0 + 310, y: Y0 + 48, t0: 1.8 * B, cps: 22, size: 36, color: BOOK.MAG },
          { s: '2×', x: 560, y: 260, t0: 2.8 * B, cps: 8, size: 120, weight: 700, color: BOOK.MAG },
          { s: 'stem cells unchanged', x: 60, y: 790, t0: 3.6 * B, cps: 24, size: 38, color: '#5A5248' },
          { s: 'Lindqvist et al. · fictional, simulated data', x: 60, y: 880, t0: (n - 2.2) * B, cps: 30, size: 30, color: '#8A8174' }];
        head = BOOK.notes(g, items, lt);
        const ring = clamp((b - 3.2) / 0.5); if (ring > 0) { const pts = []; for (let a = -2; a < -2 + TAU * 1.05; a += 0.12) pts.push([610 + Math.cos(a) * 110, 220 + Math.sin(a) * 80]); BOOK.inkLine(g, pts, ring, { color: BOOK.MAG, w: 3.2, seed: 6 }); }
        const p = BOOK.PG.R; if (head) head = [head[0] + p.x, head[1] + p.y];
      });
      if (head) BOOK.pen(ctx, head[0], head[1], { rot: 0.05 });
    },
  };
})();
