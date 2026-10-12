// records (3 bars, the 30 only): the days add up. The app's sixteen-week heatmap (captured): it sweeps in from June to
// today, the days that were filled in navy, the rest day hatched, today ringed; the app's own footnote counts them
// (35일 중 20일을 모두 채웠어요). The headline: 이어 온 날들이 / 기록으로 쌓여요.
(() => {
  const L = LP, K = 1.38, HX = 160, HY = 330;
  SCENES['records'] = {
    draw(ctx, t, env) {
      const lt = env.lt, B = env.beatSec, outAt = env.dur - env.outSec;
      L.page(ctx, t, { gx: 960, gy: 700 }); L.strip(ctx);
      const e = styleSpring(lt + 0.05, { f: 2.2, z: 0.7 }), w = 1160 * K, h = 522.5 * K, y = HY + (1 - e) * 80;
      ctx.save(); ctx.globalAlpha *= clamp(e * 1.6); L.card(ctx, HX, y, w, h, { r: 18 * K });
      const sweep = Ease.ioC(clamp((lt - 0.5 * B) / (3 * B)));
      ctx.save(); ctx.globalAlpha *= 0.45; L.draw(ctx, 'heatmap', HX, y, K); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.rect(HX, y, w * (0.04 + 0.96 * sweep), h); ctx.clip(); L.draw(ctx, 'heatmap', HX, y, K); ctx.restore();
      if (sweep >= 1) { const r = clamp((lt - 3.5 * B) / 0.8), cx = HX + 878 * K, cy = y + 116 * K; if (r > 0 && r < 1) { ctx.save(); ctx.globalAlpha *= 1 - r; ctx.strokeStyle = '#1F3566'; ctx.lineWidth = 3; rr(ctx, cx - 28 * K - 18 * r, cy - 28 * K - 18 * r, 56 * K + 36 * r, 56 * K + 36 * r, 10); ctx.stroke(); ctx.restore(); } }
      ctx.restore();
      kinetic(ctx, '이어 온 날들이', 116, 170, lt - 0.1, { size: 76, fam: 'display', weight: 800, color: '#16264A', ls: -3.2, stagger: 0.022, dur: 0.45, rise: 22, blur: 5, out: { at: outAt } });
      kinetic(ctx, '기록으로 쌓여요.', 116, 258, lt - 0.28, { size: 76, fam: 'display', weight: 800, color: '#16264A', ls: -3.2, stagger: 0.022, dur: 0.45, rise: 22, blur: 5, out: { at: outAt } });
    },
  };
})();
