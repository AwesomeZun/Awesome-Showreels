// seed (2 bars, 3 in the 30): panel a and the title. A culture well seen from above, a Matrigel dome glistening in
// it; single stem cells drop into the dome one per half beat (beats 1-3), each a tiny brightfield cell with its halo,
// drifting a little; the title is written on the notebook page on the right (4-5), the date stamp and the
// fictional-data note. Hold: the cells breathe, the dome's highlight slides.
(() => {
  SCENES['seed'] = {
    draw(ctx, t, env) {
      const O = window.ORG, B = env.beatSec, b = env.lt / B;
      O.page(ctx);
      const CX = 560, CY = 540, R = 330;
      ctx.fillStyle = rgba('#FFFFFF', 0.6); circle(ctx, CX, CY, R + 30); ctx.fill(); ctx.strokeStyle = rgba(C.ink, 0.35); ctx.lineWidth = 3; ctx.stroke();      // the well
      ctx.fillStyle = radial(ctx, CX - 60, CY - 70, 10, R, [[0, '#F3EEE6'], [0.7, '#E2DCCF'], [1, '#D3CCBE']]); circle(ctx, CX, CY, R); ctx.fill();            // the dome
      const hl = (t * 0.05) % 1; ctx.save(); ctx.filter = 'blur(18px)'; ctx.fillStyle = rgba('#FFFFFF', 0.6); ctx.beginPath(); ctx.ellipse(CX - 120 + hl * 60, CY - 150, 120, 40, -0.5, 0, TAU); ctx.fill(); ctx.restore();
      for (let i = 0; i < 9; i++) {
        const p = clamp((b - 1 - i * 0.25) * 3); if (p <= 0) continue;
        const a = hash(i * 3.7) * TAU, d = Math.sqrt(hash(i * 1.9)) * R * 0.7, x = CX + Math.cos(a) * d + Math.sin(t * 0.6 + i) * 3, y = CY + Math.sin(a) * d - (1 - Ease.ioSine(p)) * 120 + Math.cos(t * 0.5 + i) * 3;
        ctx.globalAlpha = p; O.organoid(ctx, x, y, 11 + Math.sin(t + i) * 0.5, [], { wob: i }); ctx.globalAlpha = 1;
      }
      O.note(ctx, 'D0 · 1 LGR5+ cell / dome', 250, 950, clamp((b - 3.2) * 1.5), { size: 24 });
      O.txt(ctx, 'a', 1040, 220, { size: 40, weight: 700, color: C.accent, a: clamp(b - 4) });
      O.rise(ctx, 'A timed WNT pulse', 1040, 330, clamp((b - 4) * 1.5), { size: 64, weight: 650, ls: -1 });
      O.rise(ctx, 'doubles mature enterocytes', 1040, 410, clamp((b - 4.3) * 1.5), { size: 64, weight: 650, ls: -1 });
      O.rise(ctx, 'in human intestinal organoids', 1040, 490, clamp((b - 4.6) * 1.5), { size: 64, weight: 650, ls: -1, color: C.accentInk });
      O.rise(ctx, 'Lindqvist, Mehta, Costa & Demir · 2026', 1040, 560, clamp((b - 5.2) * 1.5), { size: 26, color: C.ink2 });
      O.rise(ctx, 'FICTIONAL MANUSCRIPT · SIMULATED DATA', 1040, 600, clamp((b - 5.5) * 1.5), { size: 17, mono: true, color: C.muted, ls: 1.5 });
    },
  };
})();
