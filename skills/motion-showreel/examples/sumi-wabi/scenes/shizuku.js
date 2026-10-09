// shizuku (一滴): the hook. One drop of sumi falls onto washi and blooms on beat 0.5; the tagline soaks in as two
// vertical columns read right to left: 墨がにじむ速さで、/ すごす宿。 Hold (longer cuts): the bloom keeps creeping and a
// second, smaller drop lands on the bar line (the same cue as its sound) so the two wet fronts meet. Out: the text
// clears like mist while the scroll pans on (the next scene's dissolve).
(() => {
  const at = (env, b) => env.lt - b * env.beatSec;                    // seconds since beat b
  const DROP = { key: 'shizuku-a', x: 742, y: 590, R: 176, seed: 11, tone: 0.93, sat: 10, fall: 1.0, creep: 1.6 };
  const DROP2 = { key: 'shizuku-b', x: 922, y: 722, R: 62, seed: 23, tone: 0.86, sat: 5, fall: 0.75, creep: 0.8 };
  const COL1 = '墨がにじむ速さで、', COL2 = 'すごす宿。';
  const SIZE = 52, LS = 0.22, X1 = 1470, X2 = 1378, TOP = 250;
  SCENES['shizuku'] = {
    draw(ctx, t, env) {
      const P = env.palette, lt = env.lt, cam = SUMI.cam(env, { fx: 980, fy: 560 });
      ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
      SUMI.ground(ctx, env, cam);                                       // paper and daylight, then the camera for the ink
      // the drop (impact on beat 0.5) and, when the cut gives a hold bar line, the second drop on that cue
      SUMI.drop(ctx, DROP, at(env, 0.5), env);
      const q2 = env.cues.find(q => String(q.sfx).startsWith('plink soft'));
      if (q2) SUMI.drop(ctx, DROP2, lt - q2.lt, env);
      // tagline: two columns, right to left; the second column starts two characters lower (chirashi)
      const outAt = env.dur - env.outSec;
      const step = SIZE * (1 + LS), o = { size: SIZE, ls: LS, color: P.ink, stagger: 0.075, dur: 0.75 };
      SUMI.vtext(ctx, COL1, X1, TOP, at(env, 1), { ...o, out: { at: outAt - 1 * env.beatSec, stagger: 0.035, dur: 0.9 } });
      SUMI.vtext(ctx, COL2, X2, TOP + 2 * step, at(env, 1.5), { ...o, out: { at: outAt - 1.5 * env.beatSec + 0.1, stagger: 0.035, dur: 0.9 } });
      SUMI.end(ctx);
    },
  };
})();
