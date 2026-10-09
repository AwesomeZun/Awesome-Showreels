// cut (2 bars, 3 in the 30): the guide and the cut. A DNA double helix scrolls across the frame (two strands and
// their rungs); the 20-nt guide types above its target (beats 0-2) with the NGG PAM lit in amber; on beat 3 two
// blades close and the helix breaks with a flash and the two halves spring apart; the title rises line by line
// (4-5), then the authors. 30-s hold: the cut ends keep fraying, the guide blinks its PAM on the beat.
(() => {
  const GUIDE = 'GACCTGTAGCTTACGCAGTA', PAM = 'TGG';
  SCENES['cut'] = {
    draw(ctx, t, env) {
      const S = window.PS, B = env.beatSec, b = env.lt / B;
      S.bg(ctx);
      const cutK = b >= 3 ? Ease.outExpo(clamp((b - 3) / 0.6)) : 0, gap = 70 * cutK, y0 = 330, scroll = env.lt * 60;
      // the helix
      for (let s = 0; s < 2; s++) {
        ctx.beginPath();
        for (let x = 0; x <= W; x += 6) {
          const off = x < W / 2 ? -gap : gap, ph = (x + scroll) * 0.012 + s * Math.PI, y = y0 + Math.sin(ph) * 46;
          if (x === 0 || (x >= W / 2 && x - 6 < W / 2 && cutK > 0)) ctx.moveTo(x + off, y); else ctx.lineTo(x + off, y);
        }
        ctx.strokeStyle = s ? rgba(C.accent2, 0.85) : rgba(C.accent, 0.85); ctx.lineWidth = 4; ctx.stroke();
      }
      for (let x = 0; x <= W; x += 22) {
        const off = x < W / 2 ? -gap : gap, ph = (x + scroll) * 0.012, ya = y0 + Math.sin(ph) * 46, yb = y0 + Math.sin(ph + Math.PI) * 46;
        ctx.strokeStyle = rgba(C.ink2, 0.25 + 0.2 * Math.abs(Math.cos(ph))); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + off, ya); ctx.lineTo(x + off, yb); ctx.stroke();
      }
      // the guide above its target, PAM in amber
      const gx = W / 2 - 330, n = Math.min(GUIDE.length, b * 10);
      S.txt(ctx, "5'-", gx - 60, 200, { size: 30, mono: true, color: C.muted });
      S.txt(ctx, GUIDE, gx, 200, { size: 30, mono: true, color: C.ink, n, ls: 6 });
      if (n >= GUIDE.length) { const pa = b < 3 || Math.floor(b * 2) % 2 === 0 ? 1 : 0.4; S.txt(ctx, PAM, gx + 20 * 30.5, 200, { size: 30, mono: true, weight: 600, color: C.accent3, ls: 6, a: pa }); S.txt(ctx, '-3\'', gx + 23 * 30.5 + 10, 200, { size: 30, mono: true, color: C.muted }); }
      S.txt(ctx, 'sgRNA  ·  Cas9', W / 2, 150, { size: 18, mono: true, color: C.muted, align: 'center', ls: 2, a: clamp(b) });
      // the blades close on beat 3
      if (b > 2.2) {
        const c = Ease.inExpo(clamp((b - 2.2) / 0.8)), open = (1 - c) * 0.9;
        ctx.save(); ctx.translate(W / 2, y0 - 120); ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.lineCap = 'round';
        for (const sgn of [-1, 1]) { ctx.save(); ctx.rotate(sgn * open); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 150); ctx.stroke(); ctx.restore(); }
        ctx.restore();
      }
      if (b > 3 && b < 3.5) { ctx.fillStyle = rgba('#FFFFFF', 0.5 * (1 - (b - 3) * 2)); ctx.fillRect(0, 0, W, H); }
      // title
      S.rise(ctx, 'Genome-scale Perturb-seq maps the', 96, 560, clamp((b - 4) * 2), { size: 66, weight: 600, ls: -1.5 });
      S.rise(ctx, 'regulators of T-cell exhaustion', 96, 640, clamp((b - 4.3) * 2), { size: 66, weight: 600, ls: -1.5, color: C.accentInk });
      S.rise(ctx, 'Dana R. Okafor, Lin Wei, Priya Raman & Mateo Ferreyra', 96, 712, clamp((b - 5) * 2), { size: 24, color: C.ink2 });
      S.rise(ctx, 'PREPRINT · 2026 · FICTIONAL MANUSCRIPT, SIMULATED DATA', 96, 752, clamp((b - 5.3) * 2), { size: 17, mono: true, color: C.muted, ls: 1.5 });
    },
  };
})();
