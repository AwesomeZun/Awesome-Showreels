// heatmap (2 bars, 3 in the 30): panel b. 60 perturbations (rows, clustered by programme) x 40 programme genes
// (columns, five blocks of eight). Rows fill top to bottom on a scan (beats 0-3), the programme bars above the
// columns and the module stripes at the left draw on; on beat 3 a dendrogram grows at the left; on beat 4 the three
// hub rows lock with a bracket and their names (TOX, NR4A1, ARID1A). Hold: a scan line keeps passing over the matrix.
(() => {
  SCENES['heatmap'] = {
    draw(ctx, t, env) {
      const S = window.PS, B = env.beatSec, b = env.lt / B, D = S.data();
      S.bg(ctx); S.chrome(ctx, 'b', 'Effect of each knockout on the five programmes (log2 FC)');
      const X0 = 420, Y0 = 210, CW = 28, RH = 12.5, nr = D.perts.length, nc = D.genes.length;
      // programme bars over the columns
      D.programs.forEach((p, k) => { const a = clamp((b - k * 0.2) * 2); ctx.fillStyle = rgba(S.PROG[k], 0.9 * a); ctx.fillRect(X0 + k * 8 * CW + 2, Y0 - 34, 8 * CW - 4, 8); S.txt(ctx, p, X0 + k * 8 * CW + 4 * CW, Y0 - 44, { size: 18, color: S.PROG[k], align: 'center', a }); });
      // the matrix, row by row
      const rowsShown = Math.min(nr, b / 3 * nr);
      for (let i = 0; i < rowsShown; i++) {
        const a = clamp(rowsShown - i);
        for (let j = 0; j < nc; j++) { ctx.fillStyle = S.div(D.effects[i][j]); ctx.globalAlpha = a; ctx.fillRect(X0 + j * CW, Y0 + i * RH, CW - 1, RH - 1); }
        ctx.globalAlpha = 1; ctx.fillStyle = S.PROG[D.module[i]]; ctx.fillRect(X0 - 14, Y0 + i * RH, 8, RH - 1);
      }
      // dendrogram (from beat 3): one bracket per programme, then their joins
      if (b > 3) {
        const g = Ease.outExpo(clamp((b - 3) / 0.8)); ctx.strokeStyle = rgba(C.ink2, 0.7); ctx.lineWidth = 2;
        let start = 0; const mids = [];
        for (let k = 0; k < 5; k++) { const n = D.module.filter(m => m === k).length, y1 = Y0 + start * RH, y2 = Y0 + (start + n) * RH; const x = X0 - 24 - 40 * g; ctx.beginPath(); ctx.moveTo(X0 - 22, y1 + 4); ctx.lineTo(x, y1 + 4); ctx.lineTo(x, y2 - 4); ctx.lineTo(X0 - 22, y2 - 4); ctx.stroke(); mids.push((y1 + y2) / 2); start += n; }
        const xj = X0 - 64 - 60 * g; ctx.beginPath(); mids.forEach((m) => { ctx.moveTo(X0 - 64 - 40 * g + 40 * g * 0, m); ctx.lineTo(xj, m); }); ctx.moveTo(xj, mids[0]); ctx.lineTo(xj, mids[4]); ctx.stroke();
      }
      // hub rows
      if (b > 4) {
        const a = Ease.outExpo(clamp((b - 4) / 0.5));
        D.hub.forEach((h) => { const i = D.perts.indexOf(h); ctx.strokeStyle = rgba(C.accent3, a); ctx.lineWidth = 3; ctx.strokeRect(X0 - 2, Y0 + i * RH - 2, nc * CW + 2, RH + 2); S.txt(ctx, h, X0 + nc * CW + 20, Y0 + i * RH + 11, { size: 20, mono: true, weight: 600, color: C.accent3, a }); });
        S.txt(ctx, 'the exhaustion hub', X0 + nc * CW + 20, Y0 + 3 * RH + 40, { size: 20, color: C.ink2, a });
      }
      // the scan line in the hold
      if (b > 5) { const y = Y0 + ((b - 5) % 2) / 2 * nr * RH; ctx.fillStyle = rgba('#FFFFFF', 0.25); ctx.fillRect(X0, y, nc * CW, 2); }
      // colour bar
      for (let i = 0; i < 100; i++) { ctx.fillStyle = S.div(-2 + i * 0.04); ctx.fillRect(X0 + i * 3, Y0 + nr * RH + 40, 3.2, 12); }
      S.txt(ctx, '−2', X0, Y0 + nr * RH + 76, { size: 16, mono: true, color: C.muted }); S.txt(ctx, '+2 log2 FC', X0 + 300, Y0 + nr * RH + 76, { size: 16, mono: true, color: C.muted, align: 'right' });
    },
  };
})();
