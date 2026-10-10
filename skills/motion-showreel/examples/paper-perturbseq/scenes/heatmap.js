// heatmap (2 bars, 3 in the 30): the screen's result, sorted by the real clustering. Sixty knockouts (rows, in library
// order: the order they were screened) against forty programme genes (columns, five programmes under coloured bands)
// fill in row by row in the diverging scale. Then every row slides to its place in the clustering computed in
// paper-src/simulate.py (average linkage on correlation distance), top rows settling first; the dendrogram grows out of
// the leaves to the root; the five programmes are bracketed; and the three rows of the hub (TOX, NR4A1, ARID1A) are
// outlined. In the 30 the hold reads them: exhaustion genes down, effector genes up.
(() => {
  const X0 = 720, Y0 = 186, CW = 21, CH = 12;
  const NAMES = ['exhaustion drivers', 'effector', 'memory', 'cell cycle', 'stress'];
  let SLOT = null;
  const slotOf = () => { if (!SLOT) { const D = PS.data(); SLOT = []; D.clusterOrder.forEach((r, k) => { SLOT[r] = k; }); } return SLOT; };
  // the heatmap at a state: o.fill (rows shown, 0..60), o.sort (0..1 per row through f(r)), o.dendro (0..1),
  // o.brackets, o.hub (0..1), o.collapse (0..1: every row shrinks to a dot at its left end, for the network's match
  // cut), o.a
  function drawHeat(ctx, b, o = {}) {
    const D = PS.data(), S = slotOf(), n = D.perts.length;
    const y = (r) => Y0 + CH * (r + (S[r] - r) * (o.sort ? o.sort(r) : 0));
    ctx.save(); ctx.globalAlpha *= o.a ?? 1;
    // programme bands and their names
    D.programs.forEach((p, i) => {
      const k = clamp((o.bands ?? 1) * 1.5 - i * 0.12);
      ctx.fillStyle = rgba(PS.PROG[i], 0.9 * k); ctx.fillRect(X0 + i * 8 * CW + 1, Y0 - 16, 8 * CW - 2, 7);
      PS.txt(ctx, p, X0 + i * 8 * CW + 4 * CW, Y0 - 26, { size: 17, weight: 600, color: PS.PROG[i], align: 'center', a: k });
    });
    // cells
    for (let r = 0; r < n; r++) {
      const vis = clamp((o.fill ?? 60) - r); if (vis <= 0) continue;
      const yy = y(r), cl = o.collapse || 0;
      for (let c = 0; c < 40; c++) {
        const x = X0 + c * CW * (1 - cl);
        ctx.globalAlpha = (o.a ?? 1) * vis * (1 - cl * 0.7);
        ctx.fillStyle = PS.div(D.effects[r][c]); ctx.fillRect(x, yy, CW * (1 - cl) - (cl ? 0 : 1), CH - 1);
      }
      ctx.globalAlpha = o.a ?? 1;
      const hub = D.hub.includes(D.perts[r]);
      PS.txt(ctx, D.perts[r], X0 + 40 * CW * (1 - cl) + 12, yy + 10, { size: 11, mono: true, color: hub && (o.hub || 0) > 0 ? PS.MAG : '#94A3B8', a: vis * (1 - cl) });
      if (hub && (o.hub || 0) > 0 && !cl) {
        const k = Ease.outExpo(o.hub);
        ctx.strokeStyle = rgba(PS.MAG, k); ctx.lineWidth = 2; ctx.shadowColor = PS.MAG; ctx.shadowBlur = 12 * k;
        ctx.strokeRect(X0 - 2, yy - 1, (40 * CW + 2) * k, CH + 1); ctx.shadowBlur = 0;
      }
    }
    // the dendrogram, leaves first
    if ((o.dendro || 0) > 0) {
      ctx.strokeStyle = rgba('#94A3B8', 0.85); ctx.lineWidth = 1.5; ctx.beginPath();
      for (const [x0, y0, x1, y1] of D.dendro) {
        if (Math.max(x0, x1) > o.dendro * 1.02) continue;
        ctx.moveTo(X0 - 8 - x0 * 170, Y0 + (y0 + 0.5) * CH); ctx.lineTo(X0 - 8 - x1 * 170, Y0 + (y1 + 0.5) * CH);
      }
      ctx.stroke();
    }
    // the programme brackets (rows are contiguous once sorted)
    if ((o.brackets || 0) > 0) {
      let start = 0;
      const ord = D.clusterOrder;
      for (let k = 1; k <= ord.length; k++) {
        if (k < ord.length && D.module[ord[k]] === D.module[ord[start]]) continue;
        const m = D.module[ord[start]], ya = Y0 + start * CH, yb = Y0 + k * CH - 2, p = clamp(o.brackets * 1.6 - m * 0.15);
        ctx.fillStyle = rgba(PS.PROG[m], p); ctx.fillRect(X0 + 40 * CW + 92, ya, 5, (yb - ya) * Ease.outExpo(p));
        PS.txt(ctx, NAMES[m], X0 + 40 * CW + 106, (ya + yb) / 2 + 7, { size: 18, color: PS.PROG[m], a: p });
        start = k;
      }
    }
    ctx.restore();
  }
  window.HEAT = { drawHeat, X0, Y0, CW, CH, slotOf };
  SCENES['heatmap'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, n = Math.round(env.dur / B), long = n >= 12;
      const S = slotOf();
      PS.bg(ctx); PS.chrome(ctx, 'b', 'Effect of each knockout on 40 programme genes', clamp(b * 2));
      const sort = (r) => { const k = clamp((b - 1.9 - (S[r] / 60) * 0.7) / 0.9); return Ease.ioC(k); };
      drawHeat(ctx, b, { fill: clamp(b / 1.5) * 60, bands: clamp((b - 0.2) / 1), sort, dendro: clamp((b - 3.5) / 0.9), brackets: clamp((b - 4.4) / 0.8), hub: clamp((b - 5.6) / 0.6) });
      // the left column: what you are looking at, the scale
      PS.rise(ctx, '60 knockouts × 40 genes', 110, 230, (b - 0.3) / 0.6, { size: 34, weight: 600 });
      PS.rise(ctx, 'Rows start in screening order,', 110, 280, (b - 0.6) / 0.6, { size: 23, color: C.ink2 });
      PS.rise(ctx, 'then take their place in the clustering.', 110, 312, (b - 0.8) / 0.6, { size: 23, color: C.ink2 });
      const lk = clamp((b - 1) / 0.6);
      if (lk > 0) {
        for (let i = 0; i < 200; i++) { ctx.fillStyle = PS.div(-2 + 4 * i / 199); ctx.globalAlpha = lk; ctx.fillRect(110 + i * 1.6, 372, 2, 16); }
        ctx.globalAlpha = 1;
        PS.txt(ctx, '−2', 110, 414, { size: 17, mono: true, color: C.muted, a: lk }); PS.txt(ctx, '0', 270, 414, { size: 17, mono: true, color: C.muted, align: 'center', a: lk }); PS.txt(ctx, '+2', 430, 414, { size: 17, mono: true, color: C.muted, align: 'right', a: lk });
        PS.txt(ctx, 'log2 fold change vs control guides', 110, 446, { size: 17, color: C.muted, a: lk });
      }
      PS.rise(ctx, '5 programmes', 110, 560, (b - 4.5) / 0.6, { size: 34, weight: 600, color: C.ink });
      PS.rise(ctx, 'One hub: TOX, NR4A1, ARID1A', 110, 650, (b - 5.7) / 0.6, { size: 30, weight: 600, color: PS.MAG });
      if (long) {
        PS.rise(ctx, 'Knock out any one of them:', 110, 730, (b - 7.6) / 0.6, { size: 23, color: C.ink2 });
        PS.rise(ctx, 'exhaustion genes ↓   effector genes ↑', 110, 764, (b - 8) / 0.6, { size: 23, color: C.ink, mono: true });
        const k = clamp((b - 8) / 0.6);
        if (k > 0) { ctx.save(); ctx.strokeStyle = rgba(PS.CYAN, k); ctx.lineWidth = 2; ctx.strokeRect(X0 - 3, Y0 - 3, 8 * CW + 4, 14 * CH + 4); ctx.strokeStyle = rgba(PS.MAG, k); ctx.strokeRect(X0 + 8 * CW - 1, Y0 - 3, 8 * CW + 2, 14 * CH + 4); ctx.restore(); }
      }
      PS.vignette(ctx, 0.3);
    },
  };
})();
