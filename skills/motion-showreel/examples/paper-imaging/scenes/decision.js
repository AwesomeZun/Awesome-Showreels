// decision (2 bars; the end card): panel d. The claim at full size: 8 hpf in reporter green with the two-hour lead
// counting up beside it, the four lineages' commitment times as a dot plot with marker onset shown as hollow rings
// (the gap is the finding), the sentence and the citation. Hold: a few notochord nuclei glow and drift at the edge.
(() => {
  SCENES['decision'] = {
    draw(ctx, t, env) {
      const E = window.EMB, D = E.data(), B = env.beatSec, b = env.lt / B;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 40; i++) { const a = t * 0.1 + i, x = 1500 + Math.sin(a * 0.7 + i) * 260, y = 540 + Math.cos(a * 0.5 + i * 1.3) * 380; E.glow(ctx, x, y, E.CH.noto, 6, 0.35); }
      ctx.restore(); ctx.globalAlpha = 1;
      E.label(ctx, 'd', 'Commitment comes before the marker', clamp(b * 2));
      E.rise(ctx, '8 hpf', 96, 360, clamp(b * 2), { size: 180, weight: 800, color: E.CH.noto, ls: -6 });
      const lead = 2 * Ease.ioSine(clamp((b - 1) / 1));
      if (b > 1) E.txt(ctx, `${lead.toFixed(1)} h before the reporter`, 640, 330, { size: 40, weight: 600, mono: true, color: '#FFFFFF' });
      // dot plot: commitment (filled) vs marker onset (ring), per lineage
      const onset = D.commit.map((c, i) => c + (i === 0 ? 2.0 : 0.6 + i * 0.2)), X0 = 260, X1 = 1180, hx = (h) => X0 + (h - 6) / 10 * (X1 - X0);
      D.lineages.forEach((l, i) => {
        const y = 500 + i * 70, a = clamp((b - 1.5 - i * 0.15) * 2);
        E.txt(ctx, l, 96, y + 8, { size: 22, mono: true, color: C.ink2, a });
        ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = rgba('#FFFFFF', 0.2); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx(D.commit[i]), y); ctx.lineTo(hx(onset[i]), y); ctx.stroke();
        ctx.fillStyle = E.LIN[i]; circle(ctx, hx(D.commit[i]), y, 9); ctx.fill(); ctx.strokeStyle = E.LIN[i]; ctx.lineWidth = 2.5; circle(ctx, hx(onset[i]), y, 9); ctx.stroke(); ctx.restore();
      });
      E.txt(ctx, '● commitment (lineage)   ○ marker onset', 260, 800, { size: 18, mono: true, color: C.muted, a: clamp(b - 2) });
      if (b > 3) {
        const a = clamp((b - 3) * 2); ctx.fillStyle = rgba('#FFFFFF', 0.25 * a); ctx.fillRect(96, 880, 1100, 1.5);
        E.txt(ctx, 'Albrecht, I. et al. Light-sheet tracking of every cell in the zebrafish embryo reveals an early notochord decision. 2026.', 96, 924, { size: 19, color: C.ink2, a });
        E.txt(ctx, 'FICTIONAL MANUSCRIPT · SIMULATED DATA', 96, 966, { size: 16, mono: true, color: C.muted, ls: 1.5, a });
      }
    },
  };
})();
