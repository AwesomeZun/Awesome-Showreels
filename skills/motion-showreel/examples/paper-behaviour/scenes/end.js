// end (2 bars, 3 in the 30): the finding and the animals. A BXM-2 mouse explores its arena over its group's faint
// occupancy map, crossing the centre, and the finding rises beside it: BXM-2 brings back exploration, memory unchanged.
// Then the 3Rs, each in a line, the authors, and the note that the article and its data are fictional.
(() => {
  const RS = [['Replacement', 'screened in cultured neurons first'], ['Reduction', 'n = 12 per group, from a power calculation'], ['Refinement', 'tunnel handling, habituation, enrichment']];
  SCENES['end'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, n = Math.round(env.dur / B), lt = env.lt;
      BH.bg(ctx);
      // the BXM-2 arena under its own occupancy, faint, and a mouse exploring it along its track (the centre lit)
      const d = BH.data(), S = 11, X0 = 1240, Y0 = 250, Hm = d.heat['BXM-2'], k = clamp(b / 0.6);
      BH.card(ctx, X0 - 40, Y0 - 90, 40 * S + 80, 40 * S + 150, k);
      BH.txt(ctx, 'BXM-2', X0, Y0 - 36, { size: 26, weight: 700, color: BH.BLUE, a: k });
      BH.arena(ctx, X0, Y0, S, k);
      ctx.save(); ctx.globalAlpha = 0.5 * k;
      for (let r = 0; r < 40; r++) for (let c = 0; c < 40; c++) { ctx.fillStyle = BH.heatCol(Hm[r][c], '#60A5FA'); ctx.fillRect(X0 + c * S, Y0 + r * S, S + 0.5, S + 0.5); }
      ctx.restore();
      ctx.setLineDash([8, 8]); ctx.strokeStyle = rgba(BH.BLUE, 0.7 * k); ctx.lineWidth = 2; ctx.strokeRect(X0 + 10 * S, Y0 + 10 * S, 20 * S, 20 * S); ctx.setLineDash([]);
      BH.runner(ctx, 'BXM-2', X0, Y0, S, lt, { a: k, from: 1500, span: 900, tail: 120 });
      BH.rise(ctx, 'BXM-2 brings back exploration.', 110, 250, (b - 0.2) / 0.6, { size: 60, weight: 700 });
      BH.rise(ctx, 'Anxiety-like behaviour eases; memory is unchanged.', 112, 316, (b - 0.6) / 0.6, { size: 30, color: BH.INK2 });
      RS.forEach(([h1, s], i) => {
        const k = (b - 1.4 - i * 0.4) / 0.5, y0 = 460 + i * 92;
        BH.rise(ctx, h1, 112, y0, k, { size: 30, weight: 700, color: BH.BLUE });
        BH.rise(ctx, s, 112, y0 + 36, k - 0.2, { size: 22, color: BH.INK2 });
      });
      BH.rise(ctx, 'Okonkwo, Haas, Tanabe & Farahani', 112, 830, (b - 3) / 0.5, { size: 24, weight: 600 });
      BH.rise(ctx, 'A fictional article made for this example · all data simulated · approved protocol (fictional)', 112, 870, (b - 3.3) / 0.5, { size: 19, mono: true, color: '#94A3B8' });
    },
  };
})();
