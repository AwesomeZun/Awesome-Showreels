// hook (1 bar): the device wakes. On black, the app's own chrome wordmark (Tiny Beat. with its lime dot, as
// captured) lands large, the kicker above it, and the app's line below it: 매일 한 곡, 나만의 리듬. Under it a row of
// sixteen LEDs counts the steps of the reel's own music, one step per sixteenth, the current one hot.
(() => {
  const T = TINY, WM = [0, 0, 545, 118];                                     // the wordmark inside the capture (CSS px)
  SCENES['hook'] = {
    draw(ctx, t, env) {
      const lt = env.lt, P = env.palette, k = 2.4;
      T.stage(ctx, t, { glowX: 960, glowY: 480, glow: 0.06 + 0.04 * beatPulse(env, 5) });
      const e = styleSpring(lt + 0.04, { f: 2.6, z: 0.55 });
      const x = (W - WM[2] * k) / 2, y = 300;
      T.label(ctx, 'WEB AUDIO GROOVEBOX', 960, 300, { size: 26, align: 'center', color: P.accent, alpha: clamp(rm(lt, 0.05, 0.3)) });
      ctx.save(); ctx.globalAlpha *= clamp(lt * 5 + 0.2); ctx.translate(960, y + 150); ctx.scale(0.9 + 0.1 * e, 0.9 + 0.1 * e); ctx.translate(-960, -(y + 150));
      T.draw(ctx, 'title', x - WM[0] * k, y + 20 - WM[1] * k, k, { crop: WM }); ctx.restore();
      kinetic(ctx, '매일 한 곡, 나만의 리듬.', 960, 700, lt - 0.35, { size: 64, fam: 'display', weight: 700, color: P.ink, ls: -2.4, align: 'center', stagger: 0.03, dur: 0.5, rise: 24, blur: 6 });
      ctx.save(); ctx.globalAlpha *= clamp(rm(lt, 0.6, 0.9)); T.leds(ctx, 480, 820, 960, t, env, { fill: true }); ctx.restore();
    },
  };
})();
