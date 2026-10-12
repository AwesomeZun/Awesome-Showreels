// hook (2 bars): on air. The frame is the app's stage in the colour of its first station, 고요 88.1; on beat 1 the
// lamp goes coral (ON AIR) and the dial starts to turn, the needle sliding to 비 93.1 and the whole frame's colour
// following the app's own palette as it goes. The logo's needle turns with it; the name and the app's line sit in
// the middle: MOOD FM / 오늘의 기분으로 고르는 플레이리스트.
(() => {
  const M = MF;
  SCENES['hook'] = {
    draw(ctx, t, env) {
      const lt = env.lt, B = env.beatSec, outAt = env.dur - env.outSec;
      const dt = 2 * Ease.ioC(clamp((lt - B) / (env.dur - 1.6 * B))), mood = M.dialToMood(dt), pal = M.paletteAt(mood.x, mood.y), ink = M.inkColor(pal), f = M.dialToFreq(dt);
      const st = M.nearest(mood.x, mood.y), on = lt > B ? 1 : 0;
      M.stage(ctx, 0, 0, W, H, pal);
      M.ticker(ctx, st, f, M.track(0xC274, st).title, on, ink);
      // logo, name and line
      const e = styleSpring(lt + 0.1, { f: 2, z: 0.65 }), ang = -Math.PI * 0.75 + (f - 87.5) / 20.5 * Math.PI * 1.5;
      ctx.save(); ctx.globalAlpha *= clamp(e * 1.8); M.logo(ctx, 120, 250 + (1 - e) * 30, 190, { angle: ang }); ctx.restore();
      ctx.save(); ctx.globalAlpha *= clamp(rm(lt, 0.05, 0.3)); M.word(ctx, 350, 410, 190, ink); ctx.restore();
      kinetic(ctx, '오늘의 기분으로 고르는 플레이리스트', 124, 560, lt - 0.3, { size: 64, fam: 'display', weight: 800, color: ink, ls: -2.6, stagger: 0.016, dur: 0.4, rise: 22, blur: 5, out: { at: outAt } });
      // the big frequency, small here
      ctx.save(); ctx.globalAlpha *= clamp(rm(lt, 0.6, 0.9)); const fw = M.freq(ctx, f, 120, 760, 120, ink, on), sx = 120 + fw + 130;
      ctx.font = `800 52px ${FAM.display}`; ctx.fillStyle = ink; ctx.fillText(st.name, sx, 752); const sw = ctx.measureText(st.name).width; ctx.font = `600 22px ${FAM.mono}`; ctx.fillText(st.en, sx + sw + 12, 750); ctx.restore();
      M.tuner(ctx, f, ink, { t: dt, alpha: clamp(rm(lt, 0.2, 0.5)) });
    },
  };
})();
