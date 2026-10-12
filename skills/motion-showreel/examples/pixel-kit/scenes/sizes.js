// sizes (3 bars; 4 in the 30): same face, every size. One design (숨결 요가 스튜디오's 10월 저녁 클래스 소개, the app's
// split layout) is dealt into the six sizes of the app's consistency board one per half beat, each frame the app's own
// render for that size, its size in the corner. The headline is the board's own heading: 같은 얼굴, / 모든 크기.
(() => {
  const P = PK;
  SCENES['sizes'] = {
    draw(ctx, t, env) {
      const lt = env.lt, B = env.beatSec, outAt = env.dur - env.outSec, out = env.phase.out;
      P.studio(ctx, t, { gx: 960, gy: 700, glow: 0.12 });
      const slots = P.wall(1.075, 960, 330);
      slots.forEach(([x, y, w, h], i) => { const at = (0.5 + i * 0.5) * B, e = styleSpring(lt - at, { f: 2.8, z: 0.55 }); if (lt < at) return;
        const fx = 960 - w / 2, fy = 1180;
        P.frame(ctx, 'soom_' + i, lerp(fx, x, Math.min(1, e)), lerp(fy, y, Math.min(1, e)), w, h, { s: 0.9 + 0.1 * e, rot: (1 - e) * (i % 2 ? 0.2 : -0.2), label: P.SIZES[i][1], alpha: clamp((lt - at) * 6) }); });
      P.label(ctx, '02 · CONSISTENCY BOARD · 숨결 요가 스튜디오', 124, 110, { size: 20, alpha: clamp(rm(lt, 0.05, 0.3)) * (1 - out) });
      P.headline(ctx, ['같은 얼굴, 모든 크기.'], 116, 230, lt - 0.1, { size: 96, out: { at: outAt } });
    },
  };
})();
