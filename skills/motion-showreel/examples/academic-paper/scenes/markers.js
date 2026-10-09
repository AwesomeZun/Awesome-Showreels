// markers (1 bar): Fig. 1d, the marker dot plot. Rows are the eight cell types, columns the sixteen marker genes in
// italics (gene-name convention). The columns fill left to right, one per sixteenth (beats 0-2), each dot growing to
// its fraction-expressing size and darkening with mean expression; on beat 2.5 the KRT8 / CLDN4 / SFN block is
// boxed in the accent and its row label lights up. Size and colour legends sit under the plot.
(() => {
  const A = window.ATLAS;
  SCENES['markers'] = {
    draw(ctx, t, env) {
      const P = env.palette, lt = env.lt, bs = env.beatSec, at = (b) => (lt - b * bs) / bs;
      ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
      const D = A.data(), G = D.genes, K = D.clusters.length;
      A.chrome(ctx, env, 'Fig. 1 | A cell atlas of the repairing alveolus', 1);
      A.letter(ctx, 'd', 112, 196, 1);
      A.txt(ctx, 'Marker genes per cell type', 160, 194, { size: 24, weight: 600, color: P.ink, ls: -0.2 });
      const X0 = 420, Y0 = 330, CW = 82, RH = 66, cmap = (v) => toHex(mix('#E7EBF1', '#1B2340', Math.pow(v, 0.8)));
      // row labels with the type colour
      D.clusters.forEach((c, k) => {
        const y = Y0 + k * RH, hl = k === 1 ? Ease.outQuint(clamp(at(2.5) * 2)) : 0;
        ctx.fillStyle = c.color; circle(ctx, 140, y - 7, 8); ctx.fill();
        A.txt(ctx, c.label, 160, y, { size: 21, weight: hl > 0.5 ? 700 : 500, color: hl > 0.5 ? P.accentInk : P.ink, ls: -0.1 });
      });
      // gene headers (italic, rotated 45°) and dots, column by column
      G.forEach((g, j) => {
        const p = clamp(at(j * 0.125) * 4), x = X0 + j * CW;
        ctx.save(); ctx.translate(x - 6, Y0 - 52); ctx.rotate(-Math.PI / 4);
        ctx.font = `italic 500 20px ${FAM.sans}`; if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
        ctx.globalAlpha = clamp(p * 2); ctx.fillStyle = P.ink; ctx.fillText(g, 0, 0); ctx.restore();
        for (let k = 0; k < K; k++) {
          const d = D.dot[j * K + k], m = d[2], pct = d[3], e = Ease.outQuint(clamp((at(j * 0.125 + k * 0.03)) * 3));
          if (e <= 0) continue;
          const r = (4 + 24 * Math.sqrt(pct)) * e * (1 + 0.04 * Math.sin(t * 2.2 + j * 0.7 + k));
          ctx.fillStyle = cmap(m * e); circle(ctx, x, Y0 + k * RH - 8, r); ctx.fill();
          if (pct > 0.3) { ctx.strokeStyle = 'rgba(17,20,24,0.25)'; ctx.lineWidth = 1; ctx.stroke(); }
        }
      });
      // hold: one gene per beat lights its column, walking the whole panel
      if (at(3) > 0) {
        const gj = Math.floor(at(3)) % G.length, x = X0 + gj * CW, a = 0.5 + 0.5 * Math.exp(-(at(3) % 1) * 3);
        ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = rgba(P.accent2, 0.1 * a);
        rr(ctx, x - CW / 2 + 4, Y0 - 40, CW - 8, RH * K + 10, 8); ctx.fill(); ctx.restore();
      }
      // the KRT8 / CLDN4 / SFN block
      const bx = Ease.outQuint(clamp(at(2.5) * 2));
      if (bx > 0) {
        const j0 = G.indexOf('KRT8'), x = X0 + j0 * CW - CW / 2, y = Y0 - 40, w = CW * 3, h = RH * K + 10;
        ctx.save(); ctx.strokeStyle = P.accent; ctx.lineWidth = 3; ctx.globalAlpha = bx;
        rr(ctx, x - 6 * (1 - bx), y - 6 * (1 - bx), w + 12 * (1 - bx), h + 12 * (1 - bx), 10); ctx.stroke();
        ctx.restore();
        A.txt(ctx, 'transitional program', x + w / 2, y + h + 34, { size: 19, weight: 650, color: P.accentInk, align: 'center', a: bx, ls: 0 });
      }
      // legends
      const ly = 930, lg = clamp(at(1.5) * 2);
      if (lg > 0) {
        A.txt(ctx, 'Fraction of nuclei', 140, ly - 4, { size: 18, weight: 600, color: P.ink2, a: lg, ls: 0 });
        [0.2, 0.5, 0.9].forEach((v, i) => { const r = 4 + 24 * Math.sqrt(v), x = 360 + i * 76; ctx.globalAlpha = lg; ctx.fillStyle = '#9AA3B2'; circle(ctx, x, ly - 10, r); ctx.fill(); ctx.globalAlpha = 1; A.txt(ctx, Math.round(v * 100) + '%', x, ly + 36, { size: 15, weight: 500, color: P.muted, align: 'center', a: lg, ls: 0 }); });
        A.txt(ctx, 'Mean expression', 700, ly - 4, { size: 18, weight: 600, color: P.ink2, a: lg, ls: 0 });
        for (let i = 0; i < 100; i++) { ctx.globalAlpha = lg; ctx.fillStyle = cmap(i / 99); ctx.fillRect(880 + i * 2.6, ly - 22, 2.8, 16); }
        ctx.globalAlpha = 1;
        A.txt(ctx, 'low', 880, ly + 18, { size: 15, weight: 500, color: P.muted, a: lg, ls: 0 });
        A.txt(ctx, 'high', 880 + 260, ly + 18, { size: 15, weight: 500, color: P.muted, align: 'right', a: lg, ls: 0 });
      }
    },
  };
})();
