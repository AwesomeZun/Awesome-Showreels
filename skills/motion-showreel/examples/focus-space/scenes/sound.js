// sound (2 bars, the 30 only): a room that sounds like rain. The app's ambient mixer (captured off, on, and with its
// sliders moved): the switch turns on on beat 1, then rain, wind and cafe ease up one row at a time on the beat (fire
// stays at 25), each row's change a quick crossfade between the app's own states. The headline: 빗소리와 모닥불, /
// 직접 섞어 켜요.
(() => {
  const F = FS, K = 2.0, MX = 1180, MY = 160, ROWS = [112.5, 159, 205, 251, 298], RH = 23;
  SCENES['sound'] = {
    draw(ctx, t, env) {
      const lt = env.lt, B = env.beatSec, outAt = env.dur - env.outSec;
      F.room(ctx, t, { gx: 1400 });
      const e = styleSpring(lt + 0.05, { f: 2, z: 0.75 });
      ctx.save(); ctx.globalAlpha *= clamp(e * 1.6); ctx.translate((1 - e) * 200, 0);
      // the switch: off -> on (header rows only crossfade; the channel rows of the two states are identical)
      const on = clamp((lt - B) / 0.2), HDR = 90;
      ctx.save(); ctx.beginPath(); ctx.rect(MX, MY, 300 * K, HDR * K); ctx.clip(); F.draw(ctx, 'mixer_0', MX, MY, K, { alpha: 1 - on }); F.draw(ctx, 'mixer_1', MX, MY, K, { alpha: on }); ctx.restore();
      // each channel row: the old state or the new one (a quick complementary crossfade, so no thumb shows twice)
      const CH = [[0, 2], [1, -1], [2, 3], [3, -1], [4, 4]];
      CH.forEach(([row, beat]) => { const f = beat < 0 ? 0 : Ease.ioC(clamp((lt - beat * B) / 0.3)), y0 = ROWS[row] - RH;
        ctx.save(); ctx.beginPath(); ctx.rect(MX, MY + y0 * K, 300 * K, 2 * RH * K); ctx.clip();
        if (f < 1) F.draw(ctx, 'mixer_1', MX, MY, K, { alpha: 1 - f }); if (f > 0) F.draw(ctx, 'mixer_2', MX, MY, K, { alpha: f }); ctx.restore(); });
      ctx.save(); ctx.beginPath(); ctx.rect(MX, MY + (ROWS[4] + RH) * K, 300 * K, 80 * K); ctx.clip(); F.draw(ctx, 'mixer_1', MX, MY, K); ctx.restore();
      // soft sound lines from the channels that are on
      [[0, 2], [3, 1], [2, 3], [4, 4]].forEach(([row, beat], i) => { const a = clamp((lt - beat * B) / 0.4) * on; if (a <= 0) return; const y = MY + ROWS[row] * K;
        ctx.save(); ctx.globalAlpha *= 0.35 * a; ctx.strokeStyle = '#D0DCC5'; ctx.lineWidth = 2; ctx.beginPath();
        for (let x = 0; x <= 160; x += 4) { const yy = y + Math.sin(x * 0.08 + lt * (3 + i) + i) * 7 * Math.sin(x / 160 * Math.PI); x ? ctx.lineTo(MX - 40 - x, yy) : ctx.moveTo(MX - 40, yy); } ctx.stroke(); ctx.restore(); });
      ctx.restore();
      F.label(ctx, 'AMBIENT / 녹음 없이 합성한 소리 5종', 124, 300, { size: 22, alpha: clamp(rm(lt, 0.1, 0.4)) * (1 - env.phase.out) });
      F.headline(ctx, ['빗소리와 모닥불,', '직접 섞어 켜요.'], 116, 430, lt - 0.1, { size: 84, out: { at: outAt } });
    },
  };
})();
