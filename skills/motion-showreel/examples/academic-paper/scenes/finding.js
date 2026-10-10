// finding (1 bar, 2 in the 30; the end): the claim beside the cells it is about. Left: 3.2x counting up in coral,
// the sentence in Source Serif 4 (KRT8+ transitional cells gather at the injury niche, where differentiation
// stalls), the figure reference and, at the foot, the citation and the notice that the manuscript is fictional and
// its data simulated. Right: a generated illustration of the niche's three cells, a stretched coral transitional cell
// between a sage fibroblast and a slate macrophage, floating in the airspace, each named by a pill. Slow push.
(() => {
  SCENES['finding'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, n = Math.round(env.dur / B), X = Math.max(0, n - 4), meta = ASSET('ill/meta.json').niche, M = LG.ill('niche');
      LG.bg(ctx, t, { air: 0.7, px: b * 5 });
      const iw = 1000, ih = iw * meta.size[1] / meta.size[0], ix = 1370 - iw / 2, iy = 520 - ih / 2 + 8 * Math.sin(t * 0.8), z = 1 + 0.02 * b / n, fk = Ease.outExpo(clamp(b / 1.2));
      ctx.save(); ctx.translate(1370, 520); ctx.scale(z, z); ctx.translate(-1370, -520); ctx.globalAlpha = fk; if (M) ctx.drawImage(M, ix, iy + (1 - fk) * 40, iw, ih); ctx.restore();
      const at = (p) => [1370 + (ix + p[0] * iw / meta.size[0] - 1370) * z, 520 + (iy + p[1] * ih / meta.size[1] - 520) * z];
      const l0 = n - 2.4;
      [['CTHRC1⁺ fibroblast', 'fibroblast', '#5E9A4B', 0, 230], ['KRT8⁺ transitional cell', 'transitional', LG.CORAL, 0.25, -190], ['SPP1⁺ macrophage', 'macrophage', '#56687C', 0.5, 210]].forEach(([s, key, col, dl, dy]) => { const p = at(meta.cells[key]); LG.pill(ctx, s, p[0], p[1] + dy, clamp((b - l0 - dl) / 0.5), { dot: col, size: 22, to: [p[0], p[1] + Math.sign(dy) * 40] }); });
      LG.motes(ctx, t, 0.7, b * 8);
      // the claim
      const ck = clamp((b - 0.15) / 1.0), v = 1 + 2.23 * Ease.outC(ck);
      LG.rise(ctx, v.toFixed(1) + '×', 150, 420, ck, { size: 200, weight: 800, color: LG.CORAL });
      LG.rise(ctx, 'KRT8⁺ transitional cells gather', 150, 530, clamp((b - 0.7) / 0.9), { size: 48, weight: 600, serif: true });
      LG.rise(ctx, 'at the injury niche, where', 150, 590, clamp((b - 0.9) / 0.9), { size: 48, weight: 600, serif: true });
      LG.rise(ctx, 'differentiation stalls.', 150, 650, clamp((b - 1.1) / 0.9), { size: 48, weight: 600, serif: true });
      LG.rise(ctx, 'Fig. 1e · within 175 µm of injury foci · 14 donors', 150, 712, clamp((b - 1.5) / 0.8), { size: 22, color: LG.INK2 });
      const fa = clamp((b - (n - 1.8)) / 0.8);
      LG.txt(ctx, 'Halden, M. K., Seo, J., Ferreira, A. P., Lindqvist, T. & Adeyemi, R. O. A spatial multiome atlas of human alveolar repair', 150, 960, { size: 18, color: LG.INK2, a: fa });
      LG.txt(ctx, 'resolves a KRT8⁺ transitional niche. (2026). Fictional manuscript written for this example; all data are simulated (paper-src/simulate.py).', 150, 988, { size: 18, color: LG.MUTED, a: fa });
    },
  };
})();
