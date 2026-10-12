// end (2 bars): the end card. The chrome X turns slowly at the top centre; the name with its orange dot below it, the
// app's one-liner, the address in a black pill and, at the foot, where it comes from (toyz original, Play Objects).
(() => {
  const K = PULSE;
  SCENES['end'] = {
    draw(ctx, t, env) {
      const lt = env.lt, P = env.palette;
      K.stage(ctx, t, { lightX: 960, ruler: false });
      const e = styleSpring(lt + 0.15, { f: 2.2, z: 0.55 });
      K.chromeX(ctx, 960, 330 + (1 - e) * 60, 380 * (0.8 + 0.2 * e), { rot: Math.sin(lt * 0.9) * 0.12 + (1 - e) * 0.8, alpha: clamp(e * 1.6) });
      const nk = styleSpring(lt - 0.25, { f: 2.4, z: 0.6 });
      ctx.save(); ctx.globalAlpha *= clamp(rm(lt, 0.25, 0.45)); ctx.translate(0, (1 - nk) * 40);
      K.wordmark(ctx, 960, 700, 168, { align: 'center', dot: Ease.outBack(clamp(rm(lt, 0.55, 0.8)), 3) }); ctx.restore();
      kinetic(ctx, '메이커를 위한 작고 선명한 대시보드', 960, 790, lt - 0.55, { size: 48, fam: 'display', weight: 700, color: P.ink, ls: -1.5, align: 'center', stagger: 0.02, dur: 0.45, rise: 18, blur: 4 });
      const up = Ease.outC(clamp(rm(lt, 0.95, 1.4)));
      ctx.save(); ctx.globalAlpha *= up; ctx.font = `600 30px ${FAM.mono}`; const url = 'pulse.toyz.kr', w = ctx.measureText(url).width + 72;
      rr(ctx, 960 - w / 2, 846 + (1 - up) * 14, w, 62, 31); ctx.fillStyle = P.ink; ctx.fill();
      ctx.fillStyle = P.accent; circle(ctx, 960 - w / 2 + 30, 877 + (1 - up) * 14, 6); ctx.fill();
      ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.fillText(url, 960 + 10, 887 + (1 - up) * 14); ctx.restore();
      K.label(ctx, 'TOYZ ORIGINAL · PLAY OBJECTS', 960, 1000, { size: 22, color: P.muted, align: 'center', alpha: clamp(rm(lt, 1.2, 1.6)) });
      K.ruler(ctx, t, 1060);
    },
  };
})();
