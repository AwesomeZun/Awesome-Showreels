// dive (1 bar, 2 in the 30): into the tumour. The camera pushes slowly into the tissue: the backdrop, a far T cell
// (soft), the tumour cluster and, nearest, an exhausted T cell move at their own depths, with bokeh drifting through.
// The tired cell's receptors pulse magenta on the beat. The preprint's title rises line by line, then the problem in
// one sentence, and two lab labels name the cells. On the last beat the camera dives into the T cell's nucleus and the
// frame goes to a cyan glow (the DNA scene opens from it).
(() => {
  SCENES['dive'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, n = Math.round(env.dur / B), lt = env.lt;
      const dive = clamp((b - (n - 1)) / 1), push = 1 + 0.06 * Ease.ioSine(clamp(b / n));
      const P = (depth) => ({ s: push + (push - 1) * depth * 1.5, dx: -lt * 6 * depth });
      ctx.fillStyle = '#05070D'; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.translate(W / 2, H / 2);
      let q = P(0.2); ctx.save(); ctx.scale(q.s, q.s); PS.layer(ctx, 'tme_bg', q.dx, 0, 1.04, { blur: 1.5 }); ctx.restore();
      PS.bokeh(ctx, lt, 26, { seed: 1, a: 0.12, r: 6, rMax: 26, px: -W / 2, py: -H / 2 });
      q = P(0.45); ctx.save(); ctx.scale(q.s, q.s); PS.layer(ctx, 'tcell', 140 + q.dx, -250, 0.34, { blur: 3, a: 0.75 }); ctx.restore();
      q = P(0.7); ctx.save(); ctx.scale(q.s, q.s); PS.layer(ctx, 'tumor_cluster', 430 + q.dx, -30, 0.6); ctx.restore();
      // the exhausted T cell, nearest; on the last beat the camera dives into it
      q = P(1); const dz = 1 + 9 * Math.pow(dive, 2.2), cx = -400 + q.dx, cy = 70;
      ctx.save(); ctx.scale(q.s, q.s); ctx.translate(cx, cy); ctx.scale(dz, dz); ctx.translate(-cx, -cy);
      PS.layer(ctx, 'tcell_tired', cx, cy, 0.86);
      const pulse = Math.exp(-((b % 1)) * 4);
      for (const [rx, ry] of [[-0.3, -0.26], [0.36, -0.12], [-0.33, 0.24], [0.3, 0.33]]) PS.glow(ctx, cx + rx * 620, cy + ry * 640, 34, PS.MAG, 0.25 + 0.55 * pulse);
      ctx.restore();
      ctx.restore();
      PS.bokeh(ctx, lt * 1.4, 7, { seed: 9, a: 0.1, r: 40, rMax: 90, c1: '#5EEAD4', c2: '#F472B6' });
      PS.vignette(ctx, 0.6);
      // words, over a dark band so they read on the tissue
      const tA = 1 - dive;
      if (tA > 0) {
        ctx.save(); ctx.globalAlpha *= tA;
        ctx.fillStyle = linear(ctx, 0, 0, 0, 470, [[0, 'rgba(3,6,12,0.82)'], [0.62, 'rgba(3,6,12,0.55)'], [1, 'rgba(3,6,12,0)']]); ctx.fillRect(0, 0, W, 470);
        ctx.fillStyle = linear(ctx, 0, 0, 1100, 0, [[0, 'rgba(3,6,12,0.35)'], [1, 'rgba(3,6,12,0)']]); ctx.fillRect(0, 0, 1100, 470);
        const k0 = clamp((b - 0.15) / 0.5);
        if (k0 > 0) { ctx.strokeStyle = rgba(PS.MAG, 0.8 * k0); ctx.lineWidth = 1.5; rr(ctx, 110, 104, 132, 34, 17); ctx.stroke(); PS.txt(ctx, 'PREPRINT', 176, 128, { size: 17, mono: true, color: PS.MAG, align: 'center', ls: 2, a: k0 }); }
        PS.rise(ctx, 'Genome-scale Perturb-seq maps', 110, 214, (b - 0.3) / 0.6, { size: 62, weight: 600 });
        PS.rise(ctx, 'the regulators of T-cell exhaustion', 110, 290, (b - 0.55) / 0.6, { size: 62, weight: 600 });
        PS.rise(ctx, 'Chronically stimulated T cells lose their ability to kill.', 112, 356, (b - 1.2) / 0.6, { size: 30, color: '#CBD5E1' });
        PS.label(ctx, 330, 760, 150, 960, 'exhausted CD8+ T cell', (b - 1.6) / 0.6, { color: '#C7D2FE', size: 24 });
        PS.label(ctx, 1450, 700, 1560, 960, 'tumour cells', (b - 2) / 0.6, { color: '#FECDD3', size: 24 });
        ctx.restore();
      }
      if (dive > 0.4) { ctx.fillStyle = rgba('#0B1A2A', clamp((dive - 0.4) / 0.5)); ctx.fillRect(0, 0, W, H); PS.glow(ctx, W / 2, H / 2, 900 * dive, '#22D3EE', clamp((dive - 0.5) * 2) * 0.6); }
    },
  };
})();
