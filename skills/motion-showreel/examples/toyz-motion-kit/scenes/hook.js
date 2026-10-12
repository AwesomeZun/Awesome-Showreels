// hook (2 bars): the app's hero, moving. Electric blue with the app's own holographic ribbon knot (src/lib/knot.ts,
// ported) turning on the right; the name lands in white at once and the app's one-line promise under it by 0.5 s. On
// beat 2 a cursor presses the name: it squashes like the app's jelly press and the app's confetti recipe bursts from the
// press. On bar 2 the facts from the hero's foot roll in: 27 interactions, 0 dependencies, vanilla HTML·CSS·JS.
(() => {
  const M = MK;
  const CLICK = [600, 400];
  SCENES['hook'] = {
    draw(ctx, t, env) {
      const lt = env.lt, B = env.beatSec, out = Ease.inC(env.phase.out);
      M.blueStage(ctx, t);
      const e = styleSpring(lt + 0.05, { f: 1.4, z: 0.62 });
      M.knot(ctx, 1460 + out * 200, 590, 116 * (0.62 + 0.38 * e), { yaw: Math.PI + Math.sin(lt * 0.9) * 0.24, pitch: 0.22, roll: -0.9 * (1 - e) + lt * 0.22, twist: 1.2 + lt * 1.1, flow: lt * 0.3, alpha: clamp(e * 2) });
      // the name: pops in per glyph, then a jelly press where the cursor lands
      const tc = 2 * B, dj = lt - tc, jelly = dj > 0 ? Math.exp(-dj * 7) * Math.sin(dj * 26) : 0, press = dj > -0.06 && dj < 0.1 ? 1 : 0;
      ctx.save(); ctx.translate(CLICK[0], 410); ctx.scale(1 + 0.05 * jelly + 0.03 * press, 1 - 0.07 * jelly - 0.05 * press); ctx.translate(-CLICK[0], -410); ctx.translate(-out * 120, 0);
      M.label(ctx, 'TOYZ / MOTION KIT', 124, 300, { size: 26, color: '#C9D2FF', alpha: clamp(rm(lt, 0.05, 0.3)) });
      kinetic(ctx, 'Motion Kit', 116, 470, lt, { size: 164, fam: 'display', weight: 900, color: '#FFFFFF', ls: -7, stagger: 0.035, dur: 0.42, rise: 70, blur: 6, pop: true });
      ctx.restore();
      ctx.save(); ctx.translate(-out * 120, 0);
      kinetic(ctx, '클릭 한 번에 작은 즐거움을.', 122, 600, lt - 0.28, { size: 76, fam: 'display', weight: 800, ls: -3, stagger: 0.016, dur: 0.38, rise: 30, blur: 5,
        colorFn: (i, ch) => ch === '.' ? '#FF6A2B' : '#FFFFFF' });
      ctx.restore();
      // the confetti from the press
      M.confetti(ctx, CLICK[0], CLICK[1], (lt - tc) * 1000, 2.5, 3);
      // the cursor: in from the foot, press, away
      const ca = Ease.ioC(clamp((lt - 0.25) / (tc - 0.25))), cl = Ease.ioC(clamp((lt - tc - 0.35) / 0.9));
      const cx = lerp(lerp(1080, CLICK[0], ca), 900, cl), cy = lerp(lerp(1020, CLICK[1], ca), 1150, cl);
      if (lt > 0.2) M.cursor(ctx, cx, cy, 1.5, press);
      // the hero's foot: a hairline and three facts; 27 rolls up from 00
      const fa = Ease.outC(clamp(rm(lt, 4 * B - 0.3, 4 * B + 0.1))) * (1 - out);
      if (fa > 0) {
        ctx.save(); ctx.globalAlpha *= fa; ctx.translate(0, (1 - fa) * 24);
        ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(120, 860, 1680 * Ease.outC(clamp(rm(lt, 4 * B - 0.3, 4 * B + 0.4))), 1.5);
        const n = Math.round(27 * Ease.outC(clamp(rm(lt, 4 * B, 4 * B + 0.6))));
        [['INTERACTIONS', String(n).padStart(2, '0')], ['DEPENDENCIES', '0'], ['VANILLA', 'HTML·CSS·JS']].forEach(([k, v], i) => {
          const x = 124 + i * 420; M.label(ctx, k, x, 940, { size: 24, color: '#C9D2FF' });
          ctx.font = `800 44px ${FAM.display}`; ctx.fillStyle = '#FFFFFF'; ctx.fillText(v, x + (k.length * 24 * 0.76) + 22, 944);
        });
        ctx.restore();
      }
    },
  };
})();
