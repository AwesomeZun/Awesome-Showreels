// daily (1 bar, 2 in the 30; the drop): today's beat. The app's real "오늘의 비트" panel on the left: on every beat
// its genre switches (로파이, 하우스, 브레이크, 앰비언트, round again in the 30) and on the right the app's real console and
// sequencer switch with it, each to the beat the app made for that genre today (its LCD shows the name and tempo,
// 073 for lo-fi, 125 for house), still playing in time. Headline: 매일 다른 / 오늘의 비트.
(() => {
  const T = TINY, G = [['lofi', 'daily', 'console', 'seq_lofi'], ['house', 'daily_house', 'console_house', 'seq_house'], ['break', 'daily_break', 'console_break', 'seq_break'], ['ambient', 'daily_ambient', 'console_ambient', 'seq_ambient']];
  SCENES['daily'] = {
    draw(ctx, t, env) {
      const lt = env.lt, P = env.palette, B = env.beatSec, out = env.phase.out;
      T.stage(ctx, t, { glowX: 1300, glowY: 600 });
      const gi = Math.max(0, Math.floor(lt / B + 1e-6)) % 4, sw = clamp((lt - Math.floor(lt / B + 1e-6) * B) / 0.09), g = G[gi];
      const e = styleSpring(lt + 0.1, { f: 2.6, z: 0.6 });
      ctx.save(); ctx.globalAlpha *= clamp(e * 1.4); ctx.translate((1 - e) * -80, 0);
      T.draw(ctx, g[1], 96, 420, 1.24); ctx.restore();
      ctx.save(); ctx.globalAlpha *= clamp(e * 1.4); ctx.translate((1 - e) * 80, 0);
      T.draw(ctx, g[2], 940, 190, 0.66);
      T.sequencer(ctx, g[3], 940, 400, 0.84, t, env, { genre: g[0] });
      if (sw < 1 && lt > 0.05) { ctx.save(); ctx.globalAlpha *= (1 - sw) * 0.16; ctx.fillStyle = '#E2FF7A'; ctx.fillRect(940, 190, 900, 640); ctx.restore(); }
      ctx.restore();
      T.headline(ctx, ['매일 다른', '오늘의 비트.'], 100, 200, lt + 0.15, { size: 92, gap: 104, out: { at: env.dur - env.outSec } });
      kinetic(ctx, '같은 날, 같은 장르면 어디서든 같은 비트', 102, 900, lt - 0.6, { size: 32, fam: 'sans', weight: 600, color: P.ink2, ls: -0.5, stagger: 0.016, dur: 0.4, rise: 12, blur: 3, out: { at: env.dur - env.outSec } });
    },
  };
})();
