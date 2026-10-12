// hook (2 bars): the room. The app's stacked wordmark on the left (생산성 · TOYZ, FOCUS, SPACE in its chrome) with its
// line, 해야 할 일 하나에 집중하는 작은 방; on the right its arched room rises out of the dark, its chrome ring empty at
// 25:00 and one task pinned in the middle (모래섬 스튜디오 제안서 다듬기). On the last beat the camera moves into the door.
(() => {
  const F = FS, K = 1.12, AX = 1040, AY = 70;
  SCENES['hook'] = {
    draw(ctx, t, env) {
      const lt = env.lt, B = env.beatSec, outAt = env.dur - env.outSec, out = Ease.inC(env.phase.out);
      F.room(ctx, t, { gx: 1300 });
      const e = styleSpring(lt - 0.15, { f: 1.6, z: 0.78 });
      ctx.save(); ctx.globalAlpha *= clamp(e * 1.4); ctx.translate(0, (1 - e) * 90);
      F.arch(ctx, 'arch_ready', AX, AY, K, 0, 25 * 60);
      ctx.restore();
      F.label(ctx, '생산성 · TOYZ', 124, 250, { size: 22, alpha: clamp(rm(lt, 0.05, 0.4)) * (1 - out) });
      ctx.save(); ctx.translate(-out * 60, 0); F.wordmark(ctx, 112, 290, 188, lt, { out: { at: outAt } }); ctx.restore();
      kinetic(ctx, '해야 할 일 하나에 집중하는 작은 방', 122, 790, lt - 0.5, { size: 50, fam: 'display', weight: 700, color: '#D6DCCD', ls: -1.6, stagger: 0.02, dur: 0.5, rise: 16, blur: 6, out: { at: outAt } });
    },
  };
})();
