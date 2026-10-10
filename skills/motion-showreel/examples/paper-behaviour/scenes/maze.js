// maze (2 bars, the 30 only): memory, not anxiety. Two pools from above with the hidden platform: each group's day-1
// swim draws as a long search around the wall, then its day-5 swim goes almost straight to the platform. Beside them
// the escape latencies over five days fall the same way for both groups (means of twelve mice with their spread), so
// the metabolite changed how they explore, not how they learn.
(() => {
  const R = 150, CY = 420, XS = { vehicle: 330, 'BXM-2': 760 };
  SCENES['maze'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, d = BH.data(), sc = R / d.pool;
      BH.bg(ctx);
      BH.txt(ctx, 'd   Water maze: escape to a hidden platform, 5 days', 96, 96, { size: 26, weight: 600 });
      for (const g of d.groups) {
        const cx = XS[g], col = BH.GCOL[g];
        BH.card(ctx, cx - R - 40, CY - R - 90, 2 * R + 80, 2 * R + 220, 1);
        BH.txt(ctx, g, cx - R, CY - R - 40, { size: 24, weight: 700, color: col });
        ctx.fillStyle = '#E0F2FE'; circle(ctx, cx, CY, R); ctx.fill(); ctx.strokeStyle = '#7DD3FC'; ctx.lineWidth = 4; ctx.stroke();
        ctx.fillStyle = 'rgba(15,23,42,0.18)'; rr(ctx, cx + d.platform[0] * sc - 9, CY + d.platform[1] * sc - 9, 18, 18, 4); ctx.fill();
        for (let q = 0; q < 3; q++) { const life = ((env.lt * 0.35 + q / 3 + (g === 'vehicle' ? 0 : 0.17)) % 1), rr2 = R * (0.2 + life * 0.85); ctx.strokeStyle = `rgba(14,165,233,${0.18 * (1 - life)})`; ctx.lineWidth = 2; circle(ctx, cx, CY, rr2); ctx.stroke(); }   // ripples
        for (const [day, t0, a] of [['1', 0.3, 0.45], ['5', 2.2, 1]]) {
          const P = d.swim[g][day], loop = day === '5' && b > 3.8 ? ((b - 3.8) / 1.6) % 1 : null, k = loop !== null ? loop : clamp((b - t0) / 1.6), m = Math.max(1, Math.floor(P.length * k));
          if (k <= 0) continue;
          ctx.save(); ctx.strokeStyle = rgba(col, a); ctx.lineWidth = day === '5' ? 3 : 1.8; ctx.beginPath();
          for (let i = 0; i < m; i++) { const [x, y] = P[i]; i ? ctx.lineTo(cx + x * sc, CY + y * sc) : ctx.moveTo(cx + x * sc, CY + y * sc); }
          ctx.stroke(); ctx.restore();
          if (k < 1 || loop !== null) { const [x, y] = P[m - 1], [px, py] = P[Math.max(0, m - 3)]; BH.mouseTop(ctx, cx + x * sc, CY + y * sc, Math.atan2(y - py, x - px), 28); }
        }
        BH.txt(ctx, b < 2.2 ? 'day 1' : 'day 1 (light) · day 5 (bold)', cx - R, CY + R + 60, { size: 18, mono: true, color: BH.INK2 });
      }
      // latency curves
      const X = 1180, Y0 = 820, Hh = 420, Wd = 560, k = clamp((b - 1) / 0.6), xs = (dd) => X + (dd - 1) / 4 * Wd, ys = (v) => Y0 - v / 60 * Hh;
      BH.card(ctx, X - 70, Y0 - Hh - 90, Wd + 140, Hh + 190, clamp((b - 0.8) / 0.5));
      if (k > 0) {
        BH.txt(ctx, 'escape latency, s', X - 20, Y0 - Hh - 40, { size: 22, weight: 600, color: BH.INK2, a: k });
        ctx.strokeStyle = BH.LINE; ctx.lineWidth = 1.5; for (let v = 0; v <= 60; v += 20) { ctx.beginPath(); ctx.moveTo(X, ys(v)); ctx.lineTo(X + Wd, ys(v)); ctx.stroke(); BH.txt(ctx, String(v), X - 14, ys(v) + 6, { size: 16, mono: true, color: '#94A3B8', align: 'right' }); }
        for (let dd = 1; dd <= 5; dd++) BH.txt(ctx, `day ${dd}`, xs(dd), Y0 + 32, { size: 17, mono: true, color: '#94A3B8', align: 'center' });
        d.groups.forEach((g, gi) => {
          const L = d.latency[g], col = BH.GCOL[g], dk = clamp((b - 1.4 - gi * 0.4) / 1.4);
          const mean = [0, 1, 2, 3, 4].map(i => L.reduce((s, l) => s + l[i], 0) / L.length), sd = [0, 1, 2, 3, 4].map(i => Math.sqrt(L.reduce((s, l) => s + (l[i] - mean[i]) ** 2, 0) / L.length) / Math.sqrt(L.length));
          ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 3.5; ctx.beginPath();
          const nPts = 1 + dk * 4; for (let i = 0; i < Math.floor(nPts) + 1 && i < 5; i++) { const f = Math.min(1, nPts - i); const xx = xs(i + 1), yy = ys(mean[i]); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
          ctx.stroke();
          for (let i = 0; i < 5; i++) if (i <= nPts - 1) { ctx.fillStyle = col; circle(ctx, xs(i + 1) + gi * 6, ys(mean[i]), 7); ctx.fill(); ctx.fillRect(xs(i + 1) + gi * 6 - 1, ys(mean[i] + sd[i]), 2, ys(mean[i] - sd[i]) - ys(mean[i] + sd[i])); }
          ctx.restore();
          BH.txt(ctx, g, X + Wd - 10, Y0 - Hh + 30 + gi * 30, { size: 20, weight: 600, color: col, align: 'right', a: dk });
        });
        BH.rise(ctx, 'They learn alike.', X - 30, Y0 + 84, (b - 4.4) / 0.5, { size: 30, weight: 700 });
      }
      BH.welfare(ctx);
    },
  };
})();
