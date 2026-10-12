// end (1 bar; 3 in the 30): the end card on the app's electric blue. The knot turns at the top; a last confetti burst
// from behind the name; the name, the app's promise, the address in a white pill and, at the foot, where it comes from
// (toyz original, Play Objects collection). Everything is up by 0.4 s so the one-bar cut still reads.
(() => {
  const M = MK;
  SCENES['end'] = {
    draw(ctx, t, env) {
      const lt = env.lt;
      M.blueStage(ctx, t, { lightX: 960 });
      const e = styleSpring(lt + 0.12, { f: 1.8, z: 0.6 });
      M.knot(ctx, 960, 318 + (1 - e) * 40, 60 * (0.7 + 0.3 * e), { yaw: Math.PI + Math.sin(lt * 0.8) * 0.2, pitch: 0.22, roll: lt * 0.2 - (1 - e) * 0.6, twist: 1.2 + lt * 0.9, flow: lt * 0.25, alpha: clamp(e * 1.8) });
      M.confetti(ctx, 960, 560, (lt - 0.05) * 1000, 2.8, 41);
      kinetic(ctx, 'Motion Kit', 960, 660, lt + 0.08, { size: 150, fam: 'display', weight: 900, color: '#FFFFFF', ls: -6, align: 'center', stagger: 0.02, dur: 0.32, rise: 50, blur: 5, pop: true });
      kinetic(ctx, '클릭 한 번에 작은 즐거움을.', 960, 752, lt - 0.06, { size: 52, fam: 'display', weight: 800, ls: -2, align: 'center', stagger: 0.012, dur: 0.3, rise: 18, blur: 4,
        colorFn: (i, ch) => ch === '.' ? '#FF6A2B' : '#FFFFFF' });
      const up = Ease.outC(clamp(rm(lt, 0.1, 0.42)));
      ctx.save(); ctx.globalAlpha *= up; ctx.font = `700 36px ${FAM.mono}`; const url = 'motion-kit.toyz.kr', w = ctx.measureText(url).width + 84, y = 806 + (1 - up) * 16;
      rr(ctx, 960 - w / 2, y, w, 70, 35); ctx.fillStyle = '#FFFFFF'; ctx.fill();
      ctx.fillStyle = '#FF6A2B'; circle(ctx, 960 - w / 2 + 34, y + 35, 7); ctx.fill();
      ctx.fillStyle = '#0B2FE6'; ctx.textAlign = 'center'; ctx.fillText(url, 960 + 12, y + 47); ctx.restore();
      M.label(ctx, 'TOYZ ORIGINAL · PLAY OBJECTS', 960, 1000, { size: 24, color: '#C9D2FF', align: 'center', alpha: clamp(rm(lt, 0.2, 0.45)) });
    },
  };
})();
