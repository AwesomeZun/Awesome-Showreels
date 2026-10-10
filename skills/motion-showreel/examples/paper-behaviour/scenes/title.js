// title (1 bar, 2 in the 30): the question. A white lab mouse (a generated illustration with a real alpha channel)
// walks in from the left and stops; the gut bacteria drift on the right, giving off the small molecules the paper is
// about; the title rises over them, then the design in one line. In the 30 the design is drawn out: antibiotics,
// vehicle or BXM-2 for 14 days, then behaviour.
(() => {
  SCENES['title'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, n = Math.round(env.dur / B), lt = env.lt;
      BH.bg(ctx);
      const mic = BH.ill('microbes'), ms = BH.ill('mouse_side');
      if (mic) { const s = 0.95, w = mic.naturalWidth * s, h = mic.naturalHeight * s; ctx.save(); ctx.globalAlpha = Ease.outC(clamp(b / 1)); ctx.translate(1380 + Math.sin(lt * 0.6) * 10 - w / 2, 640 + Math.cos(lt * 0.5) * 8 - h / 2); ctx.drawImage(mic, 0, 0, w, h); ctx.restore(); }
      const walkK = Ease.outC(clamp(b / 1.4));
      if (ms) { const s = 0.62, w = ms.naturalWidth * s, h = ms.naturalHeight * s, x = -500 + 760 * walkK, y = 720 + Math.abs(Math.sin(lt * 9)) * 4 * (1 - walkK); ctx.drawImage(ms, x, y - h, w, h); }
      BH.txt(ctx, 'ARTICLE · NEUROSCIENCE', 110, 150, { size: 18, mono: true, color: BH.BLUE, ls: 2, a: clamp(b * 2) });
      BH.rise(ctx, 'A gut bacterial metabolite eases', 110, 236, (b - 0.3) / 0.6, { size: 64, weight: 700 });
      BH.rise(ctx, 'anxiety-like behaviour in mice', 110, 314, (b - 0.5) / 0.6, { size: 64, weight: 700, color: BH.BLUE });
      BH.rise(ctx, 'Open field · water maze · 12 mice per group', 112, 376, (b - 1.2) / 0.6, { size: 26, color: BH.INK2 });
      if (n >= 8) {
        const steps = [['antibiotics', BH.SLATE], ['vehicle or BXM-2, 14 days', BH.BLUE], ['behaviour', BH.INK]];
        steps.forEach(([s, c], i) => {
          const k = clamp((b - 2.6 - i * 0.6) / 0.5), x = 112 + i * 360, y = 470;
          if (k <= 0) return;
          ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = BH.LINE; ctx.lineWidth = 1.5; rr(ctx, x, y - 34, 320, 50, 25); ctx.fill(); ctx.stroke(); ctx.restore();
          BH.txt(ctx, s, x + 160, y, { size: 21, color: c, align: 'center', weight: 600, a: k });
          if (i < 2) BH.txt(ctx, '→', x + 340, y, { size: 26, color: BH.INK2, align: 'center', a: k });
        });
      }
      BH.welfare(ctx, clamp((b - 1.6) * 2));
    },
  };
})();
