// finding (2 bars; the end card): panel d. Two bars of tumour-cell killing, control guides vs the triple knockout,
// with each of the nine donors as a dot dropping onto its bar (beats 0-1.5); +45% counts up between them (1); the
// claim rises (2-3) and the citation block with the fictional-preprint note settles (3). Hold: the dots breathe.
(() => {
  SCENES['finding'] = {
    draw(ctx, t, env) {
      const S = window.PS, B = env.beatSec, b = env.lt / B, D = S.data();
      S.bg(ctx); S.chrome(ctx, 'd', 'Tumour-cell killing in co-culture (% lysis, 9 donors)');
      const base = 820, sc = 9, bars = [['Control guides', D.killing.control, '#475569'], ['TOX + NR4A1 + ARID1A KO', D.killing['triple KO'], '#E879F9']];
      bars.forEach(([lab, v, c], k) => {
        const m = v.reduce((s, x) => s + x, 0) / v.length, x = 250 + k * 330, g = Ease.outExpo(clamp((b - k * 0.3) / 0.8)), h = m * sc * g;
        ctx.fillStyle = rgba(c, 0.85); ctx.fillRect(x, base - h, 200, h);
        v.forEach((d, i) => { const dp = clamp((b - 0.6 - i * 0.08) * 3), y = base - d * sc - (1 - Ease.outExpo(dp)) * 120 + Math.sin(t * 1.5 + i) * 1.5; if (dp > 0) { ctx.fillStyle = C.ink; circle(ctx, x + 30 + i * 18, y, 6); ctx.fill(); } });
        S.txt(ctx, lab, x + 100, base + 40, { size: 20, color: C.ink2, align: 'center' });
      });
      const gp = clamp((b - 1) / 1.2);
      if (gp > 0) S.txt(ctx, `+${(D.gain * Ease.outExpo(gp)).toFixed(0)}%`, 690, 330, { size: 120, weight: 600, mono: true, color: C.accent });
      S.rise(ctx, 'One small hub holds exhaustion in place.', 1000, 420, clamp((b - 2) * 2), { size: 44, weight: 600 });
      S.rise(ctx, 'Knock it out and the cells kill again.', 1000, 480, clamp((b - 2.3) * 2), { size: 44, weight: 600, color: C.accentInk });
      if (b > 3) {
        const a = Ease.outExpo(clamp((b - 3) * 2)); ctx.fillStyle = rgba(C.line, a); ctx.fillRect(1000, 600, 820, 1.5);
        S.txt(ctx, 'Okafor, D. R. et al. Genome-scale Perturb-seq maps the', 1000, 646, { size: 20, color: C.ink2, a });
        S.txt(ctx, 'regulators of T-cell exhaustion. Preprint, 2026.', 1000, 676, { size: 20, color: C.ink2, a });
        S.txt(ctx, 'FICTIONAL MANUSCRIPT · SIMULATED DATA', 1000, 730, { size: 16, mono: true, color: C.muted, ls: 1.5, a });
      }
    },
  };
})();
