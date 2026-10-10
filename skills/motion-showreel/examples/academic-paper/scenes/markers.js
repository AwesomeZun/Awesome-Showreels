// markers (1 bar, the 30 only): Fig. 1d, the marker dot plot, on a glass card floating over the atlas (the UMAP still
// turning behind it, out of focus). Rows are the eight cell types with their colours, columns the sixteen marker
// genes in italics; each dot is a shaded sphere sized by the fraction of nuclei expressing the gene and darkened by
// its mean expression. The columns fill left to right; then the KRT8, CLDN4 and SFN block and the KRT8+ row are
// boxed in coral, with size and colour legends under the plot.
(() => {
  let BUF = null;
  SCENES['markers'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, d = LG.data(), u = SCENES['umap'];
      LG.bg(ctx, t, { air: 0.6, px: b * 5 });
      // the atlas behind, still turning, softly out of focus
      const cam = LG.camera(u.orbit(12 + b));
      if (!BUF) BUF = makeBuf(W, H); BUF.g.clearRect(0, 0, W, H); LG.cloud(BUF.g, cam, (i, c) => LG.umapW(c), (i, c) => ({ color: LG.colOf(c[0]), r: 0.085 }));
      ctx.save(); ctx.filter = 'blur(5px)'; ctx.globalAlpha = 0.55; ctx.drawImage(BUF.c, 0, 0); ctx.restore();
      const k = clamp(b / 0.6), x0 = 360, y0 = 190, cw = 1200, ch = 720;
      LG.card(ctx, x0, y0, cw, ch, k);
      if (k <= 0) return;
      ctx.save(); ctx.globalAlpha *= clamp(k * 2);
      LG.panel(ctx, 'd', 'Marker genes', x0 + 40, y0 + 62);
      const gx = x0 + 330, gy = y0 + 180, dx = 54, dy = 54, G = d.genes, hl = clamp((b - 2.4) / 0.5);
      G.forEach((g, j) => { ctx.save(); ctx.translate(gx + j * dx, gy - 26); ctx.rotate(-0.7); LG.txt(ctx, g, 0, 0, { size: 21, it: true, color: ['KRT8', 'CLDN4', 'SFN'].includes(g) && hl > 0 ? toHex(mix(LG.INK, LG.CORAL, hl)) : LG.INK }); ctx.restore(); });
      d.clusters.forEach((cl, i) => { const y = gy + 30 + i * dy; LG.nuc(ctx, x0 + 60, y - 7, 9, cl.color); ctx.globalAlpha = 1; LG.txt(ctx, cl.short === 'KRT8+' ? 'KRT8⁺ transitional' : cl.label, x0 + 80, y, { size: 22, weight: i === 1 && hl > 0 ? 700 : 500, color: i === 1 && hl > 0 ? toHex(mix(LG.INK, LG.CORAL, hl)) : LG.INK }); });
      for (const [gj, ci, m, p] of d.dot) {
        const kk = Ease.outBack(clamp((b - 0.3 - gj * 0.11) / 0.45)); if (kk <= 0) continue;
        const col = toHex(mix('#E3E5EE', '#1F2433', Math.pow(m, 0.8))), r = (4 + 17 * Math.sqrt(p)) * kk;
        LG.nuc(ctx, gx + gj * dx, gy + 30 + ci * dy - 7, r, col); ctx.globalAlpha = 1;
      }
      if (hl > 0) {
        const j0 = G.indexOf('KRT8'), bx = gx + j0 * dx - dx / 2, by = gy + 30 - dy / 2 - 7;
        ctx.strokeStyle = rgba(LG.CORAL, hl); ctx.lineWidth = 3; rr(ctx, bx, by, dx * 3, dy * 8, 14); ctx.stroke();
        ctx.fillStyle = rgba(LG.CORAL, 0.08 * hl); rr(ctx, x0 + 40, gy + 30 + dy - dy / 2 - 7, gx + 16 * dx - x0 - 60, dy, 12); ctx.fill();
        LG.pill(ctx, 'the transitional state’s markers', x0 + cw - 210, y0 + 56, clamp((b - 2.7) / 0.5), { dot: LG.CORAL, size: 22 });
      }
      // legends
      const ly = y0 + ch - 50; LG.txt(ctx, '% expressing', x0 + 330, ly, { size: 19, color: LG.INK2 });
      [0.2, 0.5, 0.9].forEach((p, i) => { LG.nuc(ctx, x0 + 480 + i * 50, ly - 7, 4 + 17 * Math.sqrt(p), '#7D8496'); ctx.globalAlpha = 1; });
      LG.txt(ctx, 'mean expression', x0 + 760, ly, { size: 19, color: LG.INK2 });
      ctx.fillStyle = linear(ctx, x0 + 920, 0, x0 + 1120, 0, [[0, '#E3E5EE'], [1, '#1F2433']]); rr(ctx, x0 + 920, ly - 16, 200, 14, 7); ctx.fill();
      ctx.restore();
      LG.motes(ctx, t, 0.7, b * 8);
    },
  };
})();
