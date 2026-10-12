// check (3 bars, the 30 only): nothing forgotten. The app's real launch checklist: its dark progress panel (15%, seven
// categories with bars) and its first items drifting up; a light sweeps the panel on each bar. Headline: 출시 전
// 42가지, / 빠짐없이.
(() => {
  const D = DK, PANEL = [380, 316, 1170, 170], LIST = [380, 540, 1170, 460];
  SCENES['check'] = {
    draw(ctx, t, env) {
      const lt = env.lt, P = env.palette, B = env.beatSec, out = env.phase.out;
      D.stage(ctx, t);
      const e = styleSpring(lt + 0.05, { f: 2.6, z: 0.6 }), k = 1.18;
      ctx.save(); ctx.globalAlpha *= clamp(e * 1.4); ctx.translate(0, (1 - e) * 60);
      D.draw(ctx, 'check_page', 300, 330, k, { crop: PANEL });
      const scroll = Math.max(0, lt - 3 * B) * 16;                            // the list drifts up through the hold
      ctx.beginPath(); ctx.rect(300, 560, LIST[2] * k, 470); ctx.clip(); D.draw(ctx, 'check_page', 300, 560 - scroll, k, { crop: LIST });
      ctx.restore();
      // a light sweeps the progress panel on each bar
      onBars(env, 1, (i, dt) => { const q = clamp(dt / 0.8); if (q >= 1) return; const x = 300 + q * PANEL[2] * k; const g = ctx.createLinearGradient(x - 160, 0, x, 0);
        g.addColorStop(0, 'rgba(11,47,230,0)'); g.addColorStop(1, 'rgba(120,150,255,0.35)'); ctx.fillStyle = g; ctx.fillRect(x - 160, 330, 160, PANEL[3] * k); }, { from: 'start' });
      D.headline(ctx, ['출시 전 42가지,', '빠짐없이.'], 100, 170, lt - 0.1, { size: 84, gap: 96, out: { at: env.dur - env.outSec } });
    },
  };
})();
