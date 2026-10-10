// channels (1 bar, 2 in the 30): three colours, one embryo. The finished 10-hpf volume turns on its axis; the channels
// come on one after another: nuclei magenta, then membranes cyan, then the notochord reporter green, added on top of
// each other so where they overlap the light burns white. The channel list ticks on like the acquisition software's,
// and a leader names the notochord running down the dorsal side.
(() => {
  SCENES['channels'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, n = Math.round(env.dur / B), lt = env.lt;
      const CL = LS.clouds(), pos = LS.at(10), step = 1;
      const cam = LS.cam({ yaw: 0.55 + 0.3 * lt, pitch: 0.25, shiftX: -0.05, dist: 4.1 });
      const cm = clamp((b - step) / 0.5), cn = clamp((b - 2 * step) / 0.5);
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      CL.nuc.setPositions(pos); CL.mem.setPositions(LS.membranes(pos)); CL.noto.setPositions(LS.notoPos(pos));
      GL.begin({ hdr: true, exposure: 1.35 });
      GL.drawCloud(CL.nuc, { cam, alpha: 0.95, twinkle: 0 });
      if (cm > 0) GL.drawCloud(CL.mem, { cam, alpha: 0.45 * cm, twinkle: 0 });
      if (cn > 0) GL.drawCloud(CL.noto, { cam, alpha: 1.4 * cn, twinkle: 0, size: 1 + 0.4 * Math.exp(-(b - 2 * step) * 3) });
      GL.blit(ctx);
      LS.stamp(ctx, 10, 1, [['nuclei · H2B', LS.COL.nuc, 1], ['membranes · CAAX', LS.COL.mem, cm], ['notochord · reporter', LS.COL.noto, cn]]);
      LS.scaleBar(ctx, 110, 980, 100, 380, 1);
      LS.txt(ctx, 'a   Three channels, one volume', 96, 96, { size: 26, weight: 600 });
      if (cn > 0) {
        const I = LS.clouds().notoIdx, c = I[Math.floor(I.length * 0.55)], p = GL.project(cam, [pos[c * 3], pos[c * 3 + 1], pos[c * 3 + 2]]);
        if (p[3]) { const e = Ease.outExpo(clamp((b - 2 * step - 0.3) / 0.6)); ctx.strokeStyle = rgba(LS.COL.noto, 0.8 * e); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] + (1500 - p[0]) * e, p[1] + (760 - p[1]) * e); ctx.stroke(); LS.txt(ctx, 'notochord', 1512, 768, { size: 26, mono: true, color: LS.COL.noto, a: e }); }
      }
    },
  };
})();
