// end (2 bars, 3 in the 30): the end card. The app's logo, its line, the address on the blue of its ZIP button, and
// the collection at the foot; a few file names still drift up the edges.
(() => {
  const D = DK;
  SCENES['end'] = {
    draw(ctx, t, env) {
      const lt = env.lt, P = env.palette;
      D.stage(ctx, t, { drift: 30 });
      const F = D.files();
      for (let i = 0; i < 10; i++) { const x = i % 2 ? 1700 - (i % 3) * 60 : 220 + (i % 3) * 60, y = H + 60 - (((lt + 3) * 120 + i * 210) % (H + 160)); D.chip(ctx, F[(i * 3) % F.length], x, y, 0.7, { alpha: 0.35 }); }
      const e = styleSpring(lt + 0.1, { f: 3, z: 0.55 }), { L } = D.layer('brand'), k = 3.2 * (0.9 + 0.1 * e);
      ctx.save(); ctx.globalAlpha *= clamp(e * 1.6); D.draw(ctx, 'brand', 960 - L.rect.w * k / 2, 360 - L.rect.h * k / 2, k); ctx.restore();
      kinetic(ctx, '작은 제품을 세상에 내놓는 도구.', 960, 570, lt - 0.3, { size: 50, fam: 'display', weight: 800, color: P.ink, ls: -1.8, align: 'center', stagger: 0.018, dur: 0.4, rise: 18, blur: 4 });
      const up = Ease.outC(clamp(rm(lt, 0.6, 1.0)));
      ctx.save(); ctx.globalAlpha *= up; ctx.font = `700 30px ${FAM.mono}`; const url = 'deploy-kit.toyz.kr', w = ctx.measureText(url).width + 64;
      rr(ctx, 960 - w / 2, 650 + (1 - up) * 14, w, 62, 12); ctx.fillStyle = P.accent; ctx.fill();
      ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.fillText(url, 960, 691 + (1 - up) * 14); ctx.restore();
      D.label(ctx, 'TOYZ ORIGINAL · PLAY OBJECTS', 960, 980, { size: 22, align: 'center', alpha: clamp(rm(lt, 0.9, 1.3)) });
    },
  };
})();
