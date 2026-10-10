// grow (2 bars, 4 in the 30): seven days in a taped print. The brightfield print on the left page is alive: one stem
// cell divides into a cluster, the cluster hollows into a cyst, and from day 2 crypt buds push out on the days the
// growth data gives, under a phase halo, with the day stamp running. On the right the pen keeps the log as the days
// pass, and draws the growth curve (diameter by day) as far as today. On the last beat the page turns.
(() => {
  const LOG = [[0, 'd0  one LGR5+ cell in a dome'], [1, 'd1  a hollow cyst'], [2, 'd2  first crypt buds!'], [4, 'd4  five buds, growing fast'], [6.9, 'd7  560 µm, budding']];
  function right(g, day, lt, B) {
    const items = [{ s: 'WNT timing', x: 130, y: 54, t0: 0, cps: 99, size: 30 }, { s: 'days 0-7', x: 522, y: 54, t0: 0, cps: 99, size: 30 }];
    LOG.forEach(([d, s], i) => { const t0 = dayTime(d, B); items.push({ s, x: 50, y: 170 + i * 66, t0, cps: 22, size: 42 }); });
    // the curve: axes, then diameter by day up to today
    const X0 = 90, Y0 = 860, CW = 620, CH = 340;
    BOOK.inkLine(g, [[X0, Y0 - CH], [X0, Y0], [X0 + CW, Y0]], clamp(lt / (0.8 * B)), { w: 2.2, seed: 5 });
    g.font = `500 15px ${FAM.mono}`; g.fillStyle = 'rgba(38,34,29,0.7)'; g.textAlign = 'center';
    for (let d = 0; d <= 7; d++) g.fillText(String(d), X0 + d / 7 * CW, Y0 + 24);
    g.textAlign = 'left'; g.fillText('diameter, µm', X0 + 8, Y0 - CH - 10); g.fillText('day', X0 + CW - 30, Y0 + 46);
    const pts = []; for (let d = 0; d <= day + 1e-6; d += 0.125) pts.push([X0 + d / 7 * CW, Y0 - BOOK.diameter(d) / 600 * CH]);
    if (pts.length > 1) BOOK.inkLine(g, pts, 1, { color: BOOK.MAG, w: 3, amp: 0.5, seed: 9 });
    return BOOK.notes(g, items, lt) || (pts.length ? pts[pts.length - 1] : null);
  }
  let dayTime = () => 0;
  SCENES['grow'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, n = Math.round(env.dur / B), lt = env.lt;
      const span = n - 1.2, day = 7 * Ease.ioSine(clamp((b - 0.2) / span));
      dayTime = (d) => (0.2 + span * Math.acos(1 - 2 * clamp(d / 7)) / Math.PI) * B;   // when the clock reaches day d
      BOOK.desk(ctx); BOOK.spread(ctx, { pages: [3, 4] });
      BOOK.onPage(ctx, 'L', g => {
        BOOK.write(g, 'brightfield, every 6 h', 230, 122, 99, { size: 34, color: '#5A5248' });
        BOOK.print(g, 50, 150, 700, 620, 0.015, clamp(b / 0.5) + 0.001, { draw: (q, w, h) => BOOK.field(q, w, h, day), foot: 26, caption: 'organoid 14 · well C4' });
        BOOK.tape(g, 70, 160, 140, -0.7, clamp(b / 0.3)); BOOK.tape(g, 732, 760, 140, -0.62, clamp(b / 0.3));
      });
      let head = null;
      BOOK.onPage(ctx, 'R', g => { head = right(g, day, lt, B); const p = BOOK.PG.R; if (head) head = [head[0] + p.x, head[1] + p.y]; });
      if (head && b < n - 0.8) BOOK.pen(ctx, head[0], head[1], { rot: 0.05 });
      const tk = clamp((b - (n - 0.8)) / 0.8); BOOK.turn(ctx, tk, g => right(g, 7, 1e9, B), 6);
    },
  };
})();
