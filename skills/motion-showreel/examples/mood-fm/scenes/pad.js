// pad (2 bars, the 30 only): drag your mood. The app's mood pad, large: a hand drags the chrome puck across it (dark to
// bright, calm to energetic) and the frame's colour follows the app's palette at every point while the mood words
// (the app's describeMood) and the nearest station change. The headline is the pad's own hint: 끌어서 기분에 / 주파수를
// 맞춰요.
(() => {
  const M = MF, PX = 1000, PY = 150, S = 780;
  const path = (u) => ({ x: 0.84 - 0.62 * Math.sin(u * Math.PI * 0.95) * (1 - u * 0.3), y: 0.92 - 0.7 * u + 0.12 * Math.sin(u * Math.PI * 3) });
  SCENES['pad'] = {
    draw(ctx, t, env) {
      const lt = env.lt, B = env.beatSec, outAt = env.dur - env.outSec, u = Ease.ioQ(clamp((lt - 0.6 * B) / (env.dur - 2 * B)));
      const mood = path(u), pal = M.paletteAt(mood.x, mood.y), ink = M.inkColor(pal), st = M.nearest(mood.x, mood.y);
      M.stage(ctx, 0, 0, W, H, pal);
      M.ticker(ctx, st, st.freq, M.track(0x7B1 + M.STATIONS.indexOf(st) * 131, st).title, 1, ink);
      const e = styleSpring(lt + 0.05, { f: 2, z: 0.7 });
      M.pad(ctx, PX + (1 - e) * 300, PY, S, mood, ink, { alpha: clamp(e * 1.6), puck: 1.1 });
      // the hand on the puck
      const hx = PX + (1 - e) * 300 + mood.x * S, hy = PY + (1 - mood.y) * S;
      ctx.save(); ctx.globalAlpha *= clamp((lt - 0.3 * B) * 4); ctx.translate(hx + 14, hy + 12); ctx.rotate(-0.35); ctx.fillStyle = '#F6F2EE'; ctx.strokeStyle = '#0b0b0c'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 40); ctx.lineTo(10, 31); ctx.lineTo(17, 46); ctx.lineTo(24, 43); ctx.lineTo(17, 28); ctx.lineTo(30, 28); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
      kinetic(ctx, '끌어서 기분에', 118, 236, lt - 0.1, { size: 84, fam: 'display', weight: 800, color: ink, ls: -3.4, stagger: 0.022, dur: 0.45, rise: 26, blur: 6, out: { at: outAt } });
      kinetic(ctx, '주파수를 맞춰요.', 118, 330, lt - 0.3, { size: 84, fam: 'display', weight: 800, color: ink, ls: -3.4, stagger: 0.022, dur: 0.45, rise: 26, blur: 6, out: { at: outAt } });
      ctx.save(); ctx.globalAlpha *= clamp(rm(lt, 0.6, 0.9)) * (1 - env.phase.out); ctx.fillStyle = ink;
      M.label(ctx, 'MOOD', 124, 520, { size: 20, color: ink }); ctx.font = `800 96px ${FAM.display}`; ctx.fillText(M.describe(mood.x, mood.y), 116, 622);
      M.label(ctx, `BRIGHTNESS ${mood.x.toFixed(2)}   ENERGY ${mood.y.toFixed(2)}`, 124, 690, { size: 22, color: ink });
      ctx.font = `700 34px ${FAM.display}`; ctx.fillText(`가까운 스테이션 · ${st.name} ${st.freq.toFixed(1)}`, 118, 770); ctx.restore();
    },
  };
})();
