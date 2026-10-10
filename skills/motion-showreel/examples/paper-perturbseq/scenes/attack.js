// attack (2 bars, 3 in the 30; the end): back in the tissue, with the hub knocked out. A healthy T cell (a generated
// render, its granules gathered at a flattened contact face) reaches the tumour cell on beat 1; magenta granules stream
// across the synapse, and the tumour cell dies: it shrinks, darkens and throws off blebs that drift away. The result
// slides in: killing in co-culture, control against the triple knockout, every donor a dot, +45% counting up. The end
// card holds the title, the authors and the honest note: a fictional manuscript with simulated data.
(() => {
  SCENES['attack'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, n = Math.round(env.dur / B), lt = env.lt, D = PS.data();
      const end = clamp((b - (n - 2.2)) / 0.8);
      ctx.fillStyle = '#05070D'; ctx.fillRect(0, 0, W, H);
      PS.layer(ctx, 'tme_bg', W / 2 - lt * 8, H / 2, 1.08, { blur: 5, filter: 'brightness(0.55) saturate(0.8)' });
      PS.bokeh(ctx, lt, 20, { seed: 3, a: 0.1 });
      const appr = Ease.outExpo(clamp(b / 1.1)), tx = 360 + 300 * appr, death = clamp((b - 1.8) / 2.2);
      // the tumour cell, dying
      const ts = 0.96 * (1 - 0.28 * Ease.ioC(death)), tx2 = 1260, ty = 560;
      PS.layer(ctx, 'tumor_single', tx2, ty, ts, { filter: `saturate(${1 - 0.6 * death}) brightness(${1 - 0.45 * death})`, rot: Math.sin(lt * 7) * 0.01 * death });
      for (let i = 0; i < 14; i++) {                                       // blebs drifting off
        const st = 2 + hash(i) * 2, k = clamp((b - st) / 2.4); if (k <= 0) continue;
        const a = hash(i + 3) * TAU, r0 = 300 * ts, d = r0 + k * (120 + hash(i + 9) * 160), r = (10 + hash(i + 5) * 22) * (1 - k * 0.5);
        const x = tx2 + Math.cos(a) * d, y = ty + Math.sin(a) * d * 0.9;
        ctx.save(); ctx.globalAlpha = (1 - k) * 0.9; ctx.fillStyle = radial(ctx, x - r * 0.3, y - r * 0.3, 0, r, [[0, '#FBCFE8'], [0.5, '#DB2777'], [1, '#701A75']]); circle(ctx, x, y, r); ctx.fill(); ctx.restore();
      }
      // the T cell and its granules
      PS.layer(ctx, 'tcell_attack', tx, 560, 0.82);
      if (b > 1) for (let i = 0; i < 40; i++) {
        const u = ((lt - B) * 0.9 + hash(i)) % 1, k = clamp((b - 1 - hash(i + 2) * 0.6) / 0.4); if (k <= 0) continue;
        const x0 = tx + 300, y0 = 560 + (hash(i + 4) - 0.5) * 160, x = x0 + u * 260, y = y0 + Math.sin(u * 5 + i) * 18;
        PS.glow(ctx, x, y, 16, PS.MAG, 0.7 * k * (1 - u) * (1 - end));
      }
      PS.vignette(ctx, 0.55);
      // the result
      const rk = Ease.outExpo(clamp((b - 3) / 0.8)) * (1 - end);
      if (rk > 0) {
        const x = 1180 + (1 - rk) * 600, y = 640, w = 600, h = 340;
        ctx.save(); ctx.globalAlpha = rk; ctx.fillStyle = 'rgba(8,12,20,0.82)'; rr(ctx, x, y, w, h, 18); ctx.fill(); ctx.strokeStyle = rgba('#94A3B8', 0.25); ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
        PS.txt(ctx, 'd  Killing in co-culture', x + 30, y + 48, { size: 24, weight: 600, a: rk });
        const groups = [['control guides', D.killing.control, '#64748B'], ['TOX + NR4A1 + ARID1A KO', D.killing['triple KO'], PS.MAG]];
        groups.forEach(([name, v, c], g) => {
          const mean = v.reduce((s, q) => s + q, 0) / v.length, gy = y + 110 + g * 104, bw = (w - 260) * (mean / 60) * Ease.outExpo(clamp((b - 3.4 - g * 0.3) / 0.8));
          ctx.globalAlpha = rk; ctx.fillStyle = rgba(c, 0.85); rr(ctx, x + 30, gy, Math.max(0, bw), 34, 6); ctx.fill(); ctx.globalAlpha = 1;
          v.forEach((q, i) => { const dx = x + 30 + (w - 260) * (q / 60), dy = gy + 17 + (hash(i * 3 + g) - 0.5) * 22; ctx.fillStyle = rgba('#F8FAFC', 0.85 * rk * clamp((b - 3.8 - g * 0.3) * 2)); circle(ctx, dx, dy, 4.5); ctx.fill(); });
          PS.txt(ctx, name, x + 30, gy - 10, { size: 18, color: C.ink2, a: rk });
          PS.txt(ctx, mean.toFixed(1) + '%', x + w - 210, gy + 26, { size: 22, mono: true, color: g ? '#F5D0FE' : C.ink2, a: rk * clamp((b - 3.6 - g * 0.3) * 2) });
        });
        const g = clamp((b - 4.2) / 1.2);
        PS.txt(ctx, '+' + Math.round(D.gain * Ease.outQuint(g)) + '%', x + w - 30, y + 60, { size: 54, weight: 700, mono: true, color: PS.MAG, align: 'right', a: rk * clamp(g * 3), glow: rgba(PS.MAG, 0.6), glowR: 24 });
        PS.txt(ctx, '9 donors, each a dot', x + 30, y + h - 22, { size: 16, mono: true, color: C.muted, a: rk });
      }
      PS.rise(ctx, 'Free them, and they kill again.', 110, 200, (b - 2.6) / 0.6, { size: 52, weight: 600, a: 1 - end });
      // the end card
      if (end > 0) {
        ctx.fillStyle = rgba('#04070E', 0.82 * end); ctx.fillRect(0, 0, W, H);
        const k = Ease.outExpo(end);
        PS.txt(ctx, 'PREPRINT', 960, 360, { size: 18, mono: true, color: PS.MAG, align: 'center', ls: 3, a: k });
        PS.rise(ctx, 'Genome-scale Perturb-seq maps', 960, 450, end * 1.5, { size: 60, weight: 600, align: 'center' });
        PS.rise(ctx, 'the regulators of T-cell exhaustion', 960, 524, end * 1.5 - 0.15, { size: 60, weight: 600, align: 'center' });
        PS.txt(ctx, 'Okafor, Wei, Raman & Ferreyra', 960, 600, { size: 26, color: C.ink2, align: 'center', a: clamp(end * 2 - 0.4) });
        PS.txt(ctx, 'TOX · NR4A1 · ARID1A', 960, 660, { size: 26, mono: true, color: PS.MAG, align: 'center', a: clamp(end * 2 - 0.6) });
        PS.txt(ctx, 'A fictional manuscript made for this example · all data simulated', 960, 760, { size: 20, color: C.muted, align: 'center', a: clamp(end * 2 - 0.8) });
      }
    },
  };
})();
