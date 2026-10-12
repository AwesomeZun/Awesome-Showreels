// gauge (2 bars, 3 in the 30; the drop): today's instrument panel. The headline lands first: 할 일과 배포가 / 계기판
// 하나에. Then the app's six real gauges (지난 마감 3, 오늘 마감 2, 이번 주 마감 7, 진행 중 3, 이번 주 완료 1, 배포·30일 9)
// snap into a row one per half beat, and three real panels rise under them: progress rings per project, the 12-week
// activity heatmap (revealed week by week) and the latest releases. A scan line sweeps the gauges on every bar of the
// hold and the overdue gauge's dot blinks in orange. Every gauge and panel is the captured app (sample data).
(() => {
  const K = PULSE, KS = 1.3, KX = 124, KY = 392;
  const PANELS = [['panel_3', 150, 640, 0.8], ['panel_1', 838, 640, 0.8], ['panel_4', 1318, 640, 0.8]];
  SCENES['gauge'] = {
    draw(ctx, t, env) {
      const lt = env.lt, P = env.palette, B = env.beatSec, out = env.phase.out;
      K.stage(ctx, t, { lightX: 960 });
      env.fx.zoom = (env.fx.zoom || 1) * (1 + Math.min(0.035, 0.007 * Math.max(0, lt)));
      K.label(ctx, 'PULSE · 2026.10.12 MON · W42', 128, 112, { size: 22, color: P.muted, alpha: clamp(rm(lt, 0, 0.3)) });
      K.headline(ctx, ['할 일과 배포가', '계기판 하나에.'], 120, 218, lt + 0.4, { size: 96, gap: 104, colors: [P.ink, P.accent], out: { at: env.dur - env.outSec } });
      // gauges
      for (let i = 0; i < 6; i++) {
        const at = 0.15 * B + i * 0.25 * B, e = styleSpring(lt - at, { f: 3.2, z: 0.5 }); if (lt < at) continue;
        const { L } = K.layer('kpi_' + i), x = KX + (L.rect.x - 281) * KS;
        ctx.save(); ctx.globalAlpha *= clamp((lt - at) / 0.12); ctx.translate(0, (1 - e) * -36);
        K.draw(ctx, 'kpi_' + i, x, KY, KS); ctx.restore();
      }
      // scan line over the gauges on each bar, and the overdue dot
      onBars(env, 1, (i, dt) => { const k = clamp(dt / 0.9); if (k >= 1) return; const x = KX + k * 1672;
        const g = ctx.createLinearGradient(x - 120, 0, x, 0); g.addColorStop(0, 'rgba(240,90,40,0)'); g.addColorStop(1, 'rgba(240,90,40,0.22)');
        ctx.fillStyle = g; ctx.fillRect(x - 120, KY + 4, 120, 164); ctx.fillStyle = P.accent; ctx.fillRect(x, KY + 4, 2, 164); }, { from: 'start' });
      if (lt > 0.5 * B) { const bl = 0.5 + 0.5 * Math.cos(t * Math.PI * 2 / B); ctx.save(); ctx.globalAlpha *= bl; ctx.fillStyle = P.accent; circle(ctx, KX + 92 * KS, KY + 26 * KS, 7); ctx.fill(); ctx.restore(); }
      // panels
      PANELS.forEach(([name, x, y, s], i) => {
        const at = 3.5 * B + i * 0.5 * B, e = styleSpring(lt - at, { f: 2.4, z: 0.62 }); if (lt < at) return;
        const { L } = K.layer(name);
        ctx.save(); ctx.globalAlpha *= clamp((lt - at) / 0.2); ctx.translate(0, (1 - e) * 60);
        if (name === 'panel_1') {                                              // the heatmap fills week by week
          K.draw(ctx, name, x, y, s, { crop: [0, 0, L.rect.w, 116] });
          const w = clamp((lt - at - 0.2) / (1.5 * B));
          K.draw(ctx, name, x, y, s, { crop: [0, 116, 60 + (L.rect.w - 60) * w, L.rect.h - 116] });
        } else K.draw(ctx, name, x, y, s);
        ctx.restore();
      });
    },
  };
})();
