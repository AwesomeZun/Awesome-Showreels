// plate (2 bars, 3 in the 30): the protocol and the plate. On the left page the pen draws the week as a line and the
// four ways to give the 24-hour WNT pulse (day 2, 3, 4 or 5) as bars under it, with seeding and the day-7 readout. On
// the right a 96-well plate map fills column by column from the plate data (deeper magenta = more mature enterocytes)
// while the pipette sketch moves from well to well; then the pen rings the day-4 columns. The page turns at the end.
(() => {
  const PULSES = [['pulse d2', 2], ['pulse d3', 3], ['pulse d4', 4], ['pulse d5', 5]];
  function right(g, b, lt, B, pp) {
    const k = clamp((b - 1) / 3.2) * 96, P = BOOK.plate(g, 60, 190, 680, k);
    g.font = `600 18px ${FAM.mono}`; g.fillStyle = 'rgba(38,34,29,0.75)'; g.fillText('villin+ enterocytes, day 7', 60, 160);
    if (pp && k > 0 && k < 96) {                                       // the pipette over the well being filled
      const i = Math.floor(k), c = Math.floor(i / 8), r = i % 8, [x, y] = P.wellAt(c, r), im = BOOK.ill('pipette');
      if (im) { const h = 300, w = h * im.naturalWidth / im.naturalHeight; g.save(); g.globalAlpha = 0.9; g.drawImage(im, x - w * 0.72, y - h + 4, w, h); g.restore(); }
    }
    const ring = clamp((b - 4.4) / 0.6);
    if (ring > 0) {
      const [x0, y0] = P.wellAt(8, 0), [x1, y1] = P.wellAt(9, 7), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = (x1 - x0) / 2 + 40, ry = (y1 - y0) / 2 + 40;
      const pts = []; for (let a = -1.9; a < -1.9 + TAU * 1.05; a += 0.12) pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
      BOOK.inkLine(g, pts, ring, { color: BOOK.MAG, w: 3.4, seed: 4 });
    }
    return BOOK.notes(g, [{ s: 'd4: most enterocytes!', x: 420, y: 880, t0: 5 * B, cps: 22, size: 44, color: BOOK.MAG }], lt);
  }
  SCENES['plate'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, n = Math.round(env.dur / B), lt = env.lt;
      BOOK.desk(ctx); BOOK.spread(ctx, { pages: [5, 6] });
      let head = null;
      BOOK.onPage(ctx, 'L', g => {
        const items = [{ s: 'Protocol', x: 60, y: 170, t0: 0.1 * B, cps: 20, size: 60, weight: 600 }];
        const X0 = 90, X1 = 720, Y = 330, dx = (d) => X0 + d / 7 * (X1 - X0);
        BOOK.inkLine(g, [[X0, Y], [X1, Y]], clamp((b - 0.6) / 0.6), { w: 3, seed: 2 });
        g.font = `500 16px ${FAM.mono}`; g.fillStyle = 'rgba(38,34,29,0.75)'; g.textAlign = 'center';
        for (let d = 0; d <= 7; d++) if (b > 0.6 + d * 0.08) { g.fillRect(dx(d) - 1, Y - 8, 2, 16); g.fillText('d' + d, dx(d), Y + 32); }
        g.textAlign = 'left';
        items.push({ s: 'seed', x: dx(0) - 20, y: Y - 26, t0: 1.1 * B, cps: 20, size: 30 }, { s: 'read', x: dx(7) - 34, y: Y - 26, t0: 1.3 * B, cps: 20, size: 30 });
        PULSES.forEach(([s, d], i) => {
          const y = 420 + i * 84, k = clamp((b - 1.6 - i * 0.35) / 0.4), hi = d === 4;
          if (k > 0) { g.fillStyle = rgba(hi ? BOOK.MAG : '#8A8174', 0.75); g.fillRect(dx(d), y - 18, (dx(d + 1) - dx(d)) * Ease.outC(k), 26); }
          items.push({ s, x: 60, y: y + 4, t0: (1.6 + i * 0.35) * B, cps: 24, size: 34, color: hi ? BOOK.MAG : '#26221D' });
        });
        items.push({ s: 'one 24-h pulse of WNT per column', x: 60, y: 800, t0: 3.4 * B, cps: 24, size: 36, color: '#5A5248' });
        head = BOOK.notes(g, items, lt); const p = BOOK.PG.L; if (head) head = [head[0] + p.x, head[1] + p.y];
      });
      let headR = null;
      BOOK.onPage(ctx, 'R', g => { headR = right(g, b, lt, B, true); const p = BOOK.PG.R; if (headR) headR = [headR[0] + p.x, headR[1] + p.y]; });
      const ph = b >= 4.4 ? headR : head;
      if (ph && b < n - 0.8) BOOK.pen(ctx, ph[0], ph[1], { rot: 0.05 });
      const tk = clamp((b - (n - 0.8)) / 0.8); BOOK.turn(ctx, tk, g => right(g, 99, 1e9, B, false), 8);
    },
  };
})();
