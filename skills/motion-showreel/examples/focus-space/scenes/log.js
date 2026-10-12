// log (1 bar; 2 in the 30): the days add up. The app's log (captured): the last seven days' bars rise from the floor
// and the twelve-week heatmap fills in from July to today. The headline: 집중한 시간은 / 기록으로 남아요.
(() => {
  const F = FS, K = 1.12;
  SCENES['log'] = {
    draw(ctx, t, env) {
      const lt = env.lt, B = env.beatSec, outAt = env.dur - env.outSec, sp = env.dur * 0.5;
      F.room(ctx, t, { gx: 1200 });
      const x0 = 120, x1 = 120 + 690 * K + 24, y = 470, w = 690 * K, h = 453.38 * K * 0.86;
      [[0, x0], [1, x1]].forEach(([i, x]) => { const e = styleSpring(lt + 0.05 - i * 0.12, { f: 2, z: 0.75 }); if (e <= 0) return; ctx.save(); ctx.globalAlpha *= clamp(e * 1.6); ctx.translate(0, (1 - e) * 60);
        ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 20; rr(ctx, x, y, w, 453.38 * K, 24); ctx.fillStyle = '#1A2E20'; ctx.fill(); ctx.shadowColor = 'transparent';
        ctx.save(); ctx.globalAlpha *= 0.3; F.draw(ctx, 'logcards_' + i, x, y, K); ctx.restore();
        const p = Ease.ioC(clamp((lt - 0.15 - i * 0.2) / sp));
        ctx.save(); ctx.beginPath(); if (i === 0) ctx.rect(x, y + (453.38 * K) * (1 - p), w, 453.38 * K * p); else ctx.rect(x, y, w * (0.12 + 0.88 * p), 453.38 * K); ctx.clip(); F.draw(ctx, 'logcards_' + i, x, y, K); ctx.restore();
        ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, 70 * K); ctx.clip(); F.draw(ctx, 'logcards_' + i, x, y, K); ctx.restore();
        ctx.restore(); });
      F.headline(ctx, ['집중한 시간은', '기록으로 남아요.'], 116, 220, lt - 0.05, { size: 84, out: { at: outAt } });
    },
  };
})();
