// end (2 bars, 3 in the 30): the end card. The chrome torus lands at the top centre and keeps turning, its lime
// reflection running round; the name in chrome type below it, the app's one-liner (흩어진 링크를 하나의 지식으로), the
// address in a lime-ruled pill and, at the foot, where it comes from (toyz original, Play Objects collection).
(() => {
  const T = TROVE;
  SCENES['end'] = {
    draw(ctx, t, env) {
      const lt = env.lt, P = env.palette;
      T.stage(ctx, t, { glowX: 960, glowY: 330, drift: 6 });
      const e = styleSpring(lt + 0.18, { f: 1.7, z: 0.66 });
      T.torus(ctx, 960, 318 + (1 - e) * 40, 2.55 * (0.7 + 0.3 * e), { rot: -0.3 + 0.18 * Math.sin(lt * 0.8), lime: 0.75 + lt * 1.3, tilt: 0.62 + 0.06 * Math.sin(lt * 0.6), alpha: clamp(e * 1.5) });
      onBeats(env, 2, (i, dt) => { const k = Math.exp(-dt * 4), a = 0.4 + i * 1.9; sparkle(ctx, 960 + Math.cos(a) * 158, 318 + Math.sin(a) * 98, 24 * k, k, a, '#E6FF8A'); }, { from: 'start' });
      const nk = styleSpring(lt - 0.3, { f: 1.9, z: 0.72 });
      ctx.save(); ctx.globalAlpha *= clamp(rm(lt, 0.3, 0.6)); ctx.translate(0, (1 - nk) * 50);
      T.chromeText(ctx, 'Trove', 960, 704, 176, { align: 'center', sheen: clamp(rm(lt, 0.7, 2.1)) });
      ctx.restore();
      kinetic(ctx, '흩어진 링크를 하나의 지식으로', 960, 792, lt - 0.6, { size: 50, fam: 'display', weight: 700, color: P.ink, ls: -1.6, align: 'center', stagger: 0.022, dur: 0.5, rise: 20, blur: 5 });
      // the address pill
      const up = Ease.outC(clamp(rm(lt, 1.0, 1.5)));
      ctx.save(); ctx.globalAlpha *= up; ctx.font = `600 30px ${FAM.mono}`; const url = 'trove.toyz.kr', w = ctx.measureText(url).width + 64;
      rr(ctx, 960 - w / 2, 850 + (1 - up) * 16, w, 60, 30); ctx.fillStyle = '#111215'; ctx.fill(); ctx.strokeStyle = P.accent; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = P.accent; ctx.textAlign = 'center'; ctx.fillText(url, 960, 890 + (1 - up) * 16); ctx.restore();
      T.label(ctx, 'TOYZ ORIGINAL · PLAY OBJECTS', 960, 1000, { size: 22, color: P.muted, align: 'center', alpha: clamp(rm(lt, 1.3, 1.7)) });
    },
  };
})();
