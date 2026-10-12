// templates (4 bars, the 30 only): thirteen templates. The app's thirteen templates (its own thumbnails, drawn in the
// 숨결 kit) are dealt onto the table one per quarter beat from the first, in two rows, each landing with a small bounce; on the last
// bar they light in turn. The headline: 템플릿 13종이 / 비율에 맞춰 알아서.
(() => {
  const P = PK, TW = 190, TH = 238, GX = 22;
  SCENES['templates'] = {
    draw(ctx, t, env) {
      const lt = env.lt, B = env.beatSec, outAt = env.dur - env.outSec, out = env.phase.out;
      P.studio(ctx, t, { gx: 960, gy: 900, glow: 0.12 });
      for (let i = 0; i < 13; i++) { const r = i < 7 ? 0 : 1, c = r ? i - 7 : i, n = r ? 6 : 7, x0 = 960 - (n * TW + (n - 1) * GX) / 2, x = x0 + c * (TW + GX), y = 470 + r * (TH + 30);
        const at = (0.25 + i * 0.25) * B, e = styleSpring(lt - at, { f: 3, z: 0.5 }); if (lt < at) continue;
        const hot = lt > 12 * B && Math.floor((lt - 12 * B) / (0.25 * B)) % 13 === i;
        ctx.save(); ctx.globalAlpha *= clamp((lt - at) * 6); ctx.translate(x + TW / 2, y + TH / 2 + (1 - e) * 200); ctx.rotate((1 - e) * (i % 2 ? 0.4 : -0.4)); ctx.scale(hot ? 1.06 : 1, hot ? 1.06 : 1);
        ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10; rr(ctx, -TW / 2, -TH / 2, TW, TH, 8); ctx.fillStyle = '#17151A'; ctx.fill(); ctx.shadowColor = 'transparent';
        ctx.save(); rr(ctx, -TW / 2, -TH / 2, TW, TH, 8); ctx.clip(); P.draw(ctx, 'tpl_' + i, -TW / 2, -TH / 2, TW / 115); ctx.restore();
        ctx.strokeStyle = hot ? '#E5B5E0' : 'rgba(255,255,255,0.12)'; ctx.lineWidth = hot ? 3 : 1; rr(ctx, -TW / 2, -TH / 2, TW, TH, 8); ctx.stroke(); ctx.restore(); }
      P.label(ctx, 'TEMPLATES · 13', 124, 150, { size: 20, alpha: clamp(rm(lt, 0.05, 0.3)) * (1 - out) });
      P.headline(ctx, ['템플릿 13종이', '비율에 맞춰 알아서.'], 116, 260, lt - 0.1, { size: 80, out: { at: outAt } });
    },
  };
})();
