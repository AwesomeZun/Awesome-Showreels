// hook (1 bar, 2 in the 30): the panel powers on. The app's chrome X drops in from above spinning, lands with a thud
// and settles; its floor shadow tightens. On the left the name lands (Pulse, with the orange dot), the kicker above
// it and by 0.6 s the app's own one-liner below: 메이커를 위한 작고 선명한 대시보드. A ten-step level meter under the
// line sweeps up and then pulses on every beat, like a meter reading the music; a tick ruler runs along the foot.
(() => {
  const K = PULSE;
  SCENES['hook'] = {
    draw(ctx, t, env) {
      const lt = env.lt, P = env.palette, out = Ease.inC(env.phase.out);
      K.stage(ctx, t, { lightX: 1400 });
      // the X
      const drop = styleSpring(lt - 0.02, { f: 2.2, z: 0.48 });
      const spin = (1 - Ease.outC(clamp(lt / 0.9))) * -2.6 + Math.sin(lt * 1.3) * 0.06;
      K.chromeX(ctx, 1400, lerp(60, 520, drop) - 10 * out, 600, { rot: spin, sx: 1 + 0.04 * Math.exp(-Math.max(0, lt - 0.3) * 8) * Math.sin(lt * 30), alpha: 1 });
      // name block
      K.label(ctx, 'MAKER DASHBOARD', 146, 372, { size: 24, color: P.muted, alpha: clamp(rm(lt, 0.1, 0.35)) });
      const nk = styleSpring(lt - 0.15, { f: 2.4, z: 0.55 });
      ctx.save(); ctx.globalAlpha *= clamp(rm(lt, 0.15, 0.35)); ctx.translate(0, (1 - nk) * 50);
      K.wordmark(ctx, 136, 588, 232, { dot: Ease.outBack(clamp(rm(lt, 0.45, 0.7)), 3) }); ctx.restore();
      kinetic(ctx, '메이커를 위한 작고 선명한 대시보드', 144, 690, lt - 0.5, { size: 56, fam: 'display', weight: 700, color: P.ink, ls: -2, stagger: 0.022, dur: 0.45, rise: 22, blur: 5 });
      // the meter: sweeps up, then reads the beat
      const sweep = clamp(rm(lt, 0.27, 0.8)), pulse = beatPulse(env, 6);
      const lvl = sweep < 1 ? Math.round(sweep * 10) : Math.round(6 + 4 * pulse);
      ctx.save(); ctx.globalAlpha *= clamp(rm(lt, 0.25, 0.4)); K.meter(ctx, 146, 760, 430, 66, lvl, { hot: lvl >= 9 });
      K.label(ctx, 'LIVE', 606, 824, { size: 20, color: P.accent }); circle(ctx, 596, 817, 6 * (0.6 + 0.4 * pulse)); ctx.fillStyle = P.accent; ctx.fill(); ctx.restore();
    },
  };
})();
