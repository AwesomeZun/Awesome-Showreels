// heat (2 bars): where they spent their time. The two example tracks give way to the occupancy heatmaps of all twelve
// mice per group, blooming from the walls inward (each 1-cm bin coloured by how long the mice stayed there): the
// vehicle group's heat lies along the walls, the BXM-2 group's reaches into the centre. Then every mouse's time in the
// centre is a dot, the means draw as bars (8.9% and 19.2%) with the t-test, and a note that both groups walked as far.
(() => {
  const S = 9, Y = 210, XS = { vehicle: 160, 'BXM-2': 620 };
  SCENES['heat'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, d = BH.data();
      BH.bg(ctx);
      BH.txt(ctx, 'c   Occupancy, all 12 mice per group', 96, 96, { size: 26, weight: 600 });
      for (const g of d.groups) {
        const x0 = XS[g], col = BH.GCOL[g], H = d.heat[g], bloom = clamp((b - 0.2) / 1.6);
        BH.card(ctx, x0 - 30, Y - 70, 40 * S + 60, 40 * S + 120, 1);
        BH.txt(ctx, g, x0, Y - 24, { size: 26, weight: 700, color: col });
        for (let r = 0; r < 40; r++) for (let c = 0; c < 40; c++) {
          const edge = Math.min(r, c, 39 - r, 39 - c) / 19.5, k = clamp((bloom * 1.4 - edge) / 0.4);
          ctx.fillStyle = k > 0 ? BH.heatCol(H[r][c] * k, g === 'vehicle' ? '#94A3B8' : '#60A5FA') : '#FBFCFE';
          ctx.fillRect(x0 + c * S, Y + r * S, S + 0.5, S + 0.5);
        }
        ctx.setLineDash([8, 8]); ctx.strokeStyle = 'rgba(15,23,42,0.6)'; ctx.lineWidth = 2; ctx.strokeRect(x0 + 10 * S, Y + 10 * S, 20 * S, 20 * S); ctx.setLineDash([]);
        if (b > 1.4) BH.runner(ctx, g, x0, Y, S, env.lt, { a: clamp((b - 1.4) * 2), trail: 0.5, w: 2 });   // the example mouse keeps exploring
        ctx.strokeStyle = '#94A3B8'; ctx.lineWidth = 5; ctx.strokeRect(x0 - 2, Y - 2, 40 * S + 4, 40 * S + 4);
      }
      // centre time: a dot per mouse, then the means
      const X = 1180, Y0 = 760, Hh = 480, sc = (v) => Y0 - v / 30 * Hh, k = clamp((b - 2) / 0.8);
      BH.card(ctx, X - 60, Y0 - Hh - 80, 640, Hh + 180, clamp((b - 1.6) / 0.5));
      if (k > 0) {
        BH.txt(ctx, 'time in centre, %', X, Y0 - Hh - 30, { size: 22, weight: 600, color: BH.INK2, a: k });
        ctx.strokeStyle = BH.LINE; ctx.lineWidth = 1.5;
        for (let v = 0; v <= 30; v += 10) { ctx.beginPath(); ctx.moveTo(X, sc(v)); ctx.lineTo(X + 520, sc(v)); ctx.stroke(); BH.txt(ctx, String(v), X - 14, sc(v) + 6, { size: 16, mono: true, color: '#94A3B8', align: 'right' }); }
        d.groups.forEach((g, gi) => {
          const cx = X + 130 + gi * 260, col = BH.GCOL[g], vals = d.centre[g], mean = vals.reduce((s, v) => s + v, 0) / vals.length, bk = Ease.outExpo(clamp((b - 2.6 - gi * 0.3) / 0.6));
          ctx.fillStyle = rgba(col, 0.18); ctx.fillRect(cx - 60, sc(mean * bk), 120, Y0 - sc(mean * bk));
          ctx.fillStyle = col; ctx.fillRect(cx - 60, sc(mean * bk) - 2, 120, 4);
          vals.forEach((v, i) => { const dk = clamp((b - 2 - i * 0.04) / 0.3); if (dk <= 0) return; ctx.fillStyle = rgba(col, 0.9 * dk); circle(ctx, cx - 36 + (i % 6) * 14 + (hash(i + gi * 7) - 0.5) * 6, sc(v), 6); ctx.fill(); });
          BH.txt(ctx, `${mean.toFixed(1)}%`, cx + 72, sc(mean) + 10, { size: 28, mono: true, weight: 700, color: col, a: bk });
          BH.txt(ctx, g, cx, Y0 + 36, { size: 22, weight: 600, color: col, align: 'center', a: k });
        });
        const tk = clamp((b - 3.6) / 0.5), p = d.test.centre.p;
        if (tk > 0) { ctx.strokeStyle = rgba(BH.INK, tk); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X + 130, sc(27)); ctx.lineTo(X + 130, sc(28)); ctx.lineTo(X + 390, sc(28)); ctx.lineTo(X + 390, sc(27)); ctx.stroke(); BH.txt(ctx, p < 0.001 ? 'p < 0.001' : `p = ${p}`, X + 260, sc(28) - 12, { size: 20, mono: true, align: 'center', a: tk }); }
        const dist = d.distance, mv = (g) => (dist[g].reduce((s, v) => s + v, 0) / 12).toFixed(1);
        BH.rise(ctx, `distance walked: ${mv('vehicle')} m vs ${mv('BXM-2')} m (p = ${d.test.distance.p})`, X - 30, Y0 + 82, (b - 4.4) / 0.5, { size: 19, mono: true, color: BH.INK2 });
      }
      BH.welfare(ctx);
    },
  };
})();
