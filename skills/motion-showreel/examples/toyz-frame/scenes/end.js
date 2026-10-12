// end (2 bars, 3 in the 30): the end card. Orange corners frame the centre; the name with its period, the app's
// one-liner, the address in a black pill and, at the foot, where it comes from (toyz original, Play Objects).
(() => {
  const F = FRAME;
  SCENES['end'] = {
    draw(ctx, t, env) {
      const lt = env.lt, P = env.palette;
      F.stage(ctx, t);
      const pulse = beatPulse(env, 5);
      F.corners(ctx, 480 - pulse * 10, 300 - pulse * 10, 960 + pulse * 20, 440 + pulse * 20, clamp(0.2 + lt / 0.35), { from: 360, len: 60, lw: 7 });
      // the chrome ball floats over the top right corner; an orange rule slides under the line
      const bk = styleSpring(lt - 0.3, { f: 2, z: 0.6 });
      F.ball(ctx, 1440 + Math.cos(lt * 0.9) * 14, 300 + Math.sin(lt * 1.3) * 12, 150 * bk, { alpha: clamp((lt - 0.3) / 0.2) });
      const rl = 0.5 + 0.5 * Math.sin(lt * 1.1); ctx.fillStyle = P.accent; ctx.fillRect(960 - 60 + rl * 40 - 20, 690, 80, 5);
      const nk = styleSpring(lt - 0.15, { f: 2.4, z: 0.6 });
      ctx.save(); ctx.globalAlpha *= clamp(rm(lt, 0.15, 0.35)); ctx.translate(0, (1 - nk) * 40);
      F.wordmark(ctx, 960, 560, 190, { align: 'center', dot: Ease.outBack(clamp(rm(lt, 0.45, 0.7)), 3) }); ctx.restore();
      kinetic(ctx, '내 작업을 담는 가장 빠른 포트폴리오', 960, 650, lt - 0.45, { size: 48, fam: 'display', weight: 700, color: P.ink, ls: -1.6, align: 'center', stagger: 0.02, dur: 0.45, rise: 18, blur: 4 });
      const up = Ease.outC(clamp(rm(lt, 0.9, 1.3)));
      ctx.save(); ctx.globalAlpha *= up; ctx.font = `600 30px ${FAM.mono}`; const url = 'frame.toyz.kr', w = ctx.measureText(url).width + 64;
      rr(ctx, 960 - w / 2, 818 + (1 - up) * 14, w, 60, 8); ctx.fillStyle = P.ink; ctx.fill();
      ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.fillText(url, 960, 858 + (1 - up) * 14); ctx.restore();
      F.label(ctx, 'TOYZ ORIGINAL · PLAY OBJECTS', 960, 990, { size: 22, align: 'center', alpha: clamp(rm(lt, 1.2, 1.6)) });
    },
  };
})();
