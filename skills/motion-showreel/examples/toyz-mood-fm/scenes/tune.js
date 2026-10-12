// tune (2 bars; 3 in the 30): tune your mood. The app's on-air stage, full frame: the needle leaves 비 93.1 for 몽글
// 98.3 and then 들뜸 106.1 (in the 30, 산책 103.5 on the way), the frequency rolling, the station and its mood words
// changing, a new track title each time (the app's own name generator), the puck crossing the mood pad, and the
// whole frame turning from wet teal to cloud pink to neon coral: every colour is the app's paletteAt for that point.
// The headline: 기분에 주파수를 맞추면, / 색과 음악이 함께 바뀌어요.
(() => {
  const M = MF;
  function dial(lt, B, long) { const S = long ? [[0, 1, 2, 4], [4.5, 6, 4, 6], [8, 9.5, 6, 7]] : [[0, 1, 2, 4], [4.5, 6, 4, 7]];
    let v = 2; for (const [a, b, x, y] of S) { if (lt < a * B) break; v = lerp(x, y, Ease.ioC(clamp((lt - a * B) / ((b - a) * B)))); } return v; }
  SCENES['tune'] = {
    draw(ctx, t, env) {
      const lt = env.lt, B = env.beatSec, outAt = env.dur - env.outSec, long = env.dur > 10 * B;
      const dt = dial(lt, B, long), mood = M.dialToMood(dt), pal = M.paletteAt(mood.x, mood.y), ink = M.inkColor(pal), f = M.dialToFreq(dt), st = M.nearest(mood.x, mood.y);
      M.stage(ctx, 0, 0, W, H, pal);
      const tr = M.track(0x5A00 + M.STATIONS.indexOf(st) * 977, st);
      M.ticker(ctx, st, f, tr.title, 1, ink);
      kinetic(ctx, '기분에 주파수를 맞추면,', 118, 168, lt - 0.1, { size: 70, fam: 'display', weight: 800, color: ink, ls: -2.8, stagger: 0.02, dur: 0.45, rise: 24, blur: 6, out: { at: outAt } });
      kinetic(ctx, '색과 음악이 함께 바뀌어요.', 118, 252, lt - 0.3, { size: 70, fam: 'display', weight: 800, color: ink, ls: -2.8, stagger: 0.02, dur: 0.45, rise: 24, blur: 6, out: { at: outAt } });
      M.label(ctx, `STATION ${String(M.STATIONS.indexOf(st) + 1).padStart(2, '0')} OF 08`, 124, 356, { size: 20, color: ink });
      M.freq(ctx, f, 108, 560, 220, ink, 1);
      ctx.save(); ctx.fillStyle = ink; ctx.font = `800 92px ${FAM.display}`; ctx.fillText(st.name, 118, 688); const nw = ctx.measureText(st.name).width;
      ctx.font = `600 24px ${FAM.mono}`; ctx.fillText(st.en, 118 + nw + 18, 686); const ew = ctx.measureText(st.en).width;
      const ds = M.describe(mood.x, mood.y); ctx.font = `700 24px ${FAM.display}`; const dw = ctx.measureText(ds).width + 28, dx = 118 + nw + 18 + ew + 22;
      rr(ctx, dx, 652, dw, 42, 21); ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillText(ds, dx + 14, 681);
      M.label(ctx, 'NOW PLAYING', 124, 760, { size: 18, color: ink }); ctx.font = `700 40px ${FAM.display}`; ctx.fillText(tr.title, 118, 812);
      ctx.restore();
      M.pad(ctx, 1300, 160, 500, mood, ink);
      M.tuner(ctx, f, ink, { t: dt });
    },
  };
})();
