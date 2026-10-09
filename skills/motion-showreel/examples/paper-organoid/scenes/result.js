// result (2 bars; the end card): panel d. Day-7 enterocyte share: control vs day-4 pulse, each well a dot over its
// bar; 2.0x counts up; on the right a villin-stained organoid (brush border magenta, nuclei blue) breathes in its
// field; the sentence and the citation. Hold: the stained organoid turns slowly, the dots settle.
(() => {
  SCENES['result'] = {
    draw(ctx, t, env) {
      const O = window.ORG, D = O.data(), B = env.beatSec, b = env.lt / B;
      O.page(ctx);
      O.txt(ctx, 'd', 200, 120, { size: 40, weight: 700, color: C.accent }); O.txt(ctx, 'Mature enterocytes on day 7 (% villin+)', 244, 118, { size: 28, weight: 600 });
      const base = 760, sc = 10;
      [['control', D.control, '#B7AEA0'], ['day-4 pulse', D.day4, '#C2185B']].forEach(([lab, v, c], k) => {
        const m = v.reduce((s, x) => s + x, 0) / v.length, x = 260 + k * 300, g = Ease.ioSine(clamp((b - k * 0.3) / 0.9));
        ctx.fillStyle = rgba(c, 0.8); ctx.fillRect(x, base - m * sc * g, 180, m * sc * g);
        v.forEach((d, i) => { const p = clamp((b - 0.8 - i * 0.04) * 3); if (p <= 0) return; ctx.fillStyle = C.ink; ctx.globalAlpha = p; circle(ctx, x + 20 + (i % 8) * 20, base - d * sc + Math.sin(t + i) * 1.2, 5); ctx.fill(); ctx.globalAlpha = 1; });
        O.txt(ctx, lab, x + 90, base + 40, { size: 22, mono: true, align: 'center', color: C.ink2 });
      });
      const mc = D.means.control, m4 = D.means['day 4'], gp = clamp((b - 1) / 1.2);
      if (gp > 0) O.txt(ctx, `${(m4 / mc * Ease.ioSine(gp)).toFixed(1)}×`, 400, 300, { size: 110, weight: 700, color: C.accent });
      // the stained organoid
      O.field(ctx, 1080, 180, 640, 460, () => {
        ctx.save(); ctx.fillStyle = '#0D0B14'; ctx.fillRect(1080, 180, 640, 460); ctx.restore();
        const cx = 1400, cy = 410, r = 150, rot = t * 0.08;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 90; i++) { const a = rot + (i / 90) * TAU, bump = 1 + 0.18 * Math.max(0, Math.sin(a * 5)); const x = cx + Math.cos(a) * r * bump, y = cy + Math.sin(a) * r * bump; ctx.fillStyle = rgba('#3D6FB6', 0.8); circle(ctx, x * 0.98 + cx * 0.02, y, 7); ctx.fill(); }
        ctx.lineWidth = 6; ctx.strokeStyle = rgba('#E0337A', 0.9); ctx.beginPath();
        for (let i = 0; i <= 180; i++) { const a = rot + (i / 180) * TAU, bump = 1 + 0.18 * Math.max(0, Math.sin(a * 5)), x = cx + Math.cos(a) * r * bump * 0.86, y = cy + Math.sin(a) * r * bump * 0.86; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.stroke(); ctx.restore();
      });
      O.txt(ctx, 'villin', 1100, 670, { size: 18, mono: true, color: '#C2185B' }); O.txt(ctx, 'DAPI', 1180, 670, { size: 18, mono: true, color: '#3D6FB6' });
      O.rise(ctx, 'Pulse WNT on day 4, after the first buds,', 1080, 760, clamp((b - 2) * 1.5), { size: 34, weight: 600 });
      O.rise(ctx, 'and twice as many cells grow up.', 1080, 808, clamp((b - 2.3) * 1.5), { size: 34, weight: 600, color: C.accentInk });
      if (b > 3) { const a = clamp((b - 3) * 2); ctx.fillStyle = rgba(C.ink, 0.25 * a); ctx.fillRect(200, 880, 1520, 1.5); O.txt(ctx, 'Lindqvist, R. et al. A timed WNT pulse doubles mature enterocytes in human intestinal organoids. 2026.', 200, 924, { size: 20, color: C.ink2, a }); O.txt(ctx, 'FICTIONAL MANUSCRIPT · SIMULATED DATA', 200, 962, { size: 16, mono: true, color: C.muted, ls: 1.5, a }); }
    },
  };
})();
