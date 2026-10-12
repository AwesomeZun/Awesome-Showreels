// hook (2 bars): the name and the ring. On the app's periwinkle page, its wordmark (the O O are two linked chrome
// rings) and its line, 혼자 시작해서 함께 완성하는 루틴; on the right the app's chrome ring, drawn from its own code,
// fills its first third on beat 1 (1/3 · 33% DONE), as the app's today screen opens.
(() => {
  const L = LP;
  SCENES['hook'] = {
    draw(ctx, t, env) {
      const lt = env.lt, B = env.beatSec, outAt = env.dur - env.outSec, out = env.phase.out;
      L.page(ctx, t, { gx: 1460, gy: 420 }); L.strip(ctx);
      const e = styleSpring(lt + 0.06, { f: 2.4, z: 0.6 });
      ctx.save(); ctx.globalAlpha *= clamp(e * 1.8); ctx.translate(-out * 80, (1 - e) * 30); L.wordmark(ctx, 116, 470, 214, { spin: (1 - e) * -1.2 + Math.sin(lt * 1.3) * 0.05 }); ctx.restore();
      kinetic(ctx, '혼자 시작해서 함께 완성하는 루틴', 122, 600, lt - 0.28, { size: 62, fam: 'display', weight: 800, color: '#16264A', ls: -2.6, stagger: 0.016, dur: 0.4, rise: 20, blur: 5, out: { at: outAt } });
      L.label(ctx, 'TODAY / W42', 124, 300, { size: 20, alpha: clamp(rm(lt, 0.05, 0.3)) * (1 - out) });
      const re = styleSpring(lt - 0.2, { f: 2, z: 0.66 }), v = Ease.ioC(clamp((lt - B) / (0.9 * B))) / 3;
      const cx = 1460, cy = 560, s = 560 * (0.85 + 0.15 * re);
      L.ring(ctx, cx, cy, s, s * 0.16, v, { alpha: clamp(re * 1.6) });
      ctx.save(); ctx.globalAlpha *= clamp(rm(lt, 0.5, 0.8)); ctx.fillStyle = '#16264A'; ctx.textAlign = 'center';
      ctx.font = `850 ${s * 0.2}px ${FAM.display}`; ctx.fillText(String(Math.round(v * 3)), cx - s * 0.04, cy + s * 0.04); ctx.font = `700 ${s * 0.07}px ${FAM.display}`; ctx.fillText('/3', cx + s * 0.07, cy + s * 0.04);
      L.label(ctx, `${Math.round(v * 100)}% DONE`, cx, cy + s * 0.12, { size: 22, align: 'center', color: '#3D4F78' }); ctx.restore();
    },
  };
})();
