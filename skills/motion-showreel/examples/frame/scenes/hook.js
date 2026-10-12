// hook (1 bar, 2 in the 30): framed. Four orange viewfinder corners fly in from the frame's edges and lock around the
// centre, where the name lands (Frame, its square orange period dropping in last) with the kicker above and the app's
// one-liner below: 내 작업을 담는 가장 빠른 포트폴리오. A chrome ball (the portfolio's own avatar image) floats beside it.
// The corners breathe on each beat of the hold.
(() => {
  const F = FRAME;
  SCENES['hook'] = {
    draw(ctx, t, env) {
      const lt = env.lt, P = env.palette;
      F.stage(ctx, t);
      const box = { x: 300, y: 300, w: 1320, h: 480 }, pulse = beatPulse(env, 6);
      F.corners(ctx, box.x - pulse * 8, box.y - pulse * 8, box.w + pulse * 16, box.h + pulse * 16, clamp(0.25 + lt / 0.35), { from: 420, len: 70, lw: 8 });
      // the chrome ball, cropped from the preview's avatar
      const bk = styleSpring(lt - 0.2, { f: 2, z: 0.6 }), by = 430 + Math.sin(lt * 1.6) * 10;
      F.ball(ctx, 1440, by, 210 * bk, { alpha: clamp((lt - 0.2) / 0.2) });
      F.label(ctx, 'PORTFOLIO BUILDER', 412, 420, { size: 26, alpha: clamp(rm(lt, 0.15, 0.4)) });
      const nk = styleSpring(lt + 0.05, { f: 2.4, z: 0.6 });
      ctx.save(); ctx.globalAlpha *= clamp(rm(lt, -0.05, 0.15)); ctx.translate(0, (1 - nk) * 50);
      F.wordmark(ctx, 400, 600, 210, { dot: Ease.outBack(clamp(rm(lt, 0.5, 0.75)), 3) }); ctx.restore();
      kinetic(ctx, '내 작업을 담는 가장 빠른 포트폴리오', 408, 704, lt - 0.5, { size: 56, fam: 'display', weight: 700, color: P.ink, ls: -2, stagger: 0.022, dur: 0.45, rise: 22, blur: 5 });
    },
  };
})();
