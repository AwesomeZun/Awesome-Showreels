// tissue (1 bar, 2 in the 30): Fig. 1c, the place. One section of repairing lung (1.6 x 0.9 mm) seen from above:
// alveolar airspaces cut out of pink walls, the airway at the left, the thickened injury niche; on it all 4,900
// nuclei as grey shaded spheres, their identities not yet known. The camera pulls back from the niche to the whole
// section; panel label and a 200 um scale bar arrive. In the 30 pills name the airway, an alveolus and the injury and
// a caption says what is measured. In the last two beats the tissue is dissociated: the camera tilts away, the
// section fades and every nucleus lifts off it, each to its own height.
(() => {
  SCENES['tissue'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, n = Math.round(env.dur / B), X = Math.max(0, n - 4), bo = b - X;
      const d = LG.data(), nw = [(d.niche[0] - 800) / LG.UM, -(d.niche[1] - 450) / LG.UM, 0];
      const pull = Ease.ioC(clamp(b / 2.0)), lift = Ease.ioC(clamp((bo - 2.0) / 1.9));
      const c0 = { dist: 11, target: nw }, c1 = { dist: 31, target: [0, 0, 0] }, c2 = { dist: 34, pitch: 0.9, yaw: -0.35, target: [0, 0, 1.5] };
      const cam = LG.camera(LG.lerpCam(LG.lerpCam(c0, c1, pull), c2, lift));
      LG.bg(ctx, t, { air: 0.35 + 0.25 * lift, px: b * 4 });
      LG.section(ctx, cam, 1 - lift, t);
      LG.cloud(ctx, cam, (i, c) => { const p = LG.tissueW(c), k = clamp(lift * 1.4 - hash(i * 3.3) * 0.4); return [p[0], p[1], LG.liftOf(i) * Ease.ioC(k)]; }, () => ({ color: LG.GREY, r: 0.085 }), { shadow: 0.6 * (1 - lift) });
      // furniture: panel label, scale bar (the camera ends level at 1 px per um)
      const fa = clamp((b - 1.0) / 0.5) * (1 - clamp(lift * 3));
      LG.panel(ctx, 'c', 'One section of repairing lung · 1.6 × 0.9 mm', 120, 86, fa);
      const sb = cam.project([0, 0, 0])[3] / LG.UM * 200; ctx.globalAlpha = fa; ctx.fillStyle = LG.INK; ctx.fillRect(1620 - sb, 1012, sb, 6); ctx.globalAlpha = 1; LG.txt(ctx, '200 µm', 1620 - sb / 2, 996, { size: 20, weight: 600, align: 'center', a: fa });
      if (X) {
        const P = (sx, sy) => cam.project([(sx - 800) / LG.UM, -(sy - 450) / LG.UM, 0]), lk = (b - 2.2), hide = 1 - clamp((bo - 1.8) / 0.4);
        const aw = P(250, 450), al = P(d.alveoli[5][0], d.alveoli[5][1]), nc = P(d.niche[0], d.niche[1]);
        LG.pill(ctx, 'airway', aw[0], aw[1] - 160, clamp(lk / 0.5) * hide, { dot: '#8A63D2', to: [aw[0], aw[1] - 100] });
        LG.pill(ctx, 'alveolus', al[0] + 40, al[1] - 110, clamp((lk - 0.3) / 0.5) * hide, { dot: '#13A39A', to: [al[0], al[1] - 30] });
        LG.pill(ctx, 'injury', nc[0] + 120, nc[1] - 200, clamp((lk - 0.6) / 0.5) * hide, { dot: LG.CORAL, to: [nc[0] + 20, nc[1] - 40] });
      }
      LG.caption(ctx, '4,900 nuclei, each profiled for RNA and open chromatin.', clamp((b - (X ? 3.0 : 1.4)) / 1.0) * (1 - clamp((bo - 2.0) / 0.4)));
      LG.caption(ctx, 'Dissociate the tissue; read every nucleus.', clamp((bo - 2.3) / 1.0));
      LG.motes(ctx, t, 0.6, b * 8);
    },
  };
})();
