// result (2 bars; the end): the notochord, glowing. The 24-hpf embryo turns slowly with every cell dimmed to a haze but
// the notochord's, a green rod along the body; the finding comes in very large (8 hpf), the claim in a sentence under
// it, then the authors, the open data and the honest note: a fictional article with simulated data.
(() => {
  SCENES['result'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, n = Math.round(env.dur / B), lt = env.lt;
      const CL = LS.clouds(), pos = LS.at(24);
      const cam = LS.cam({ yaw: 1.45 + 0.12 * lt, pitch: 0.22, dist: 4.4, shiftX: 0.32 });
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      CL.nuc.setPositions(pos); CL.noto.setPositions(LS.notoPos(pos)); CL.mem.setPositions(LS.membranes(pos));
      GL.begin({ hdr: true, exposure: 1.4 });
      GL.drawCloud(CL.mem, { cam, alpha: 0.08, twinkle: 0 });
      GL.drawCloud(CL.nuc, { cam, alpha: 0.22, twinkle: 0 });
      GL.drawCloud(CL.noto, { cam, alpha: 1.5 * Ease.outC(clamp(b / 1.2)), size: 1.25, twinkle: 0.2, time: lt });
      GL.blit(ctx);
      const k = Ease.outExpo(clamp((b - 0.5) / 0.8));
      LS.txt(ctx, '8 hpf', 96, 470, { size: 230, weight: 800, color: LS.COL.noto, a: k, glow: rgba(LS.COL.noto, 0.45), glowR: 40, ls: -6 });
      LS.rise(ctx, 'Notochord precursors commit two hours', 104, 560, (b - 1.2) / 0.6, { size: 34, weight: 600 });
      LS.rise(ctx, 'before their marker, among future muscle.', 104, 604, (b - 1.4) / 0.6, { size: 34, weight: 600 });
      LS.rise(ctx, 'Albrecht, Rivera, Sato & Mensah · open data and tracking pipeline', 104, 690, (b - 2.4) / 0.6, { size: 22, color: 'rgba(226,232,240,0.8)' });
      LS.rise(ctx, 'A fictional article made for this example · all data simulated', 104, 730, (b - 2.8) / 0.6, { size: 20, mono: true, color: 'rgba(148,163,184,0.9)' });
      LS.stamp(ctx, 24, clamp(b));
    },
  };
})();
