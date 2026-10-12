// end (1 bar, 2 in the 30): the end card. The chrome wordmark, the app's line, the address in a lime pill, the
// collection at the foot, and the LED row still counting the music.
(() => {
  const T = TINY, WM = [0, 0, 545, 118];
  SCENES['end'] = {
    draw(ctx, t, env) {
      const lt = env.lt, P = env.palette, k = 1.9;
      T.stage(ctx, t, { glowX: 960, glowY: 420, glow: 0.06 + 0.04 * beatPulse(env, 5) });
      const e = styleSpring(lt + 0.12, { f: 2.4, z: 0.6 });
      ctx.save(); ctx.globalAlpha *= clamp(e * 1.5); ctx.translate(0, (1 - e) * 30);
      T.draw(ctx, 'title', (W - WM[2] * k) / 2 - WM[0] * k, 250 - WM[1] * k, k, { crop: WM }); ctx.restore();
      kinetic(ctx, '매일 한 곡, 나만의 리듬.', 960, 600, lt - 0.3, { size: 54, fam: 'display', weight: 700, color: P.ink, ls: -2, align: 'center', stagger: 0.025, dur: 0.45, rise: 20, blur: 5 });
      const up = Ease.outC(clamp(rm(lt, 0.7, 1.1)));
      ctx.save(); ctx.globalAlpha *= up; ctx.font = `700 30px ${FAM.mono}`; const url = 'tiny-beat.toyz.kr', w = ctx.measureText(url).width + 64;
      rr(ctx, 960 - w / 2, 670 + (1 - up) * 14, w, 60, 30); ctx.fillStyle = P.accent; ctx.fill();
      ctx.fillStyle = '#0D1100'; ctx.textAlign = 'center'; ctx.fillText(url, 960, 710 + (1 - up) * 14); ctx.restore();
      ctx.save(); ctx.globalAlpha *= clamp(rm(lt, 0.4, 0.7)); T.leds(ctx, 560, 820, 800, t, env, { fill: true }); ctx.restore();
      T.label(ctx, 'TOYZ ORIGINAL · PLAY OBJECTS', 960, 960, { size: 22, align: 'center', alpha: clamp(rm(lt, 1.0, 1.4)) });
    },
  };
})();
