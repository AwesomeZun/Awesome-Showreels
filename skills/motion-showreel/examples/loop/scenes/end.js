// end (1 bar; 3 in the 30): the end card: the wordmark, its rings settling with a turn, the app's line, the address and
// where it comes from (toyz original, Chrome Club collection).
(() => {
  const L = LP;
  SCENES['end'] = {
    draw(ctx, t, env) {
      const lt = env.lt;
      L.page(ctx, t, { gx: 960 + Math.sin(lt * 0.6) * 200, gy: 420 }); L.strip(ctx);
      const e = styleSpring(lt + 0.12, { f: 2.4, z: 0.58 });
      ctx.save(); ctx.globalAlpha *= clamp(e * 2); L.wordmark(ctx, 960, 520 + (1 - e) * 24, 220, { align: 'center', spin: (1 - e) * -1.6 + Math.sin(lt * 1.2) * 0.04 }); ctx.restore();
      kinetic(ctx, '혼자 시작해서 함께 완성하는 루틴', 960, 620, lt - 0.02, { size: 52, fam: 'display', weight: 800, color: '#16264A', ls: -2, align: 'center', stagger: 0.01, dur: 0.3, rise: 14, blur: 3 });
      const up = Ease.outC(clamp(rm(lt, 0.1, 0.42)));
      ctx.save(); ctx.globalAlpha *= up; ctx.font = `600 34px ${FAM.mono}`; const url = 'loop.toyz.kr', w = ctx.measureText(url).width + 84, y = 680 + (1 - up) * 14;
      rr(ctx, 960 - w / 2, y, w, 66, 33); ctx.fillStyle = '#16264A'; ctx.fill(); ctx.strokeStyle = 'rgba(185,204,240,0.6)'; ctx.stroke(); ctx.fillStyle = '#B9CCF0'; circle(ctx, 960 - w / 2 + 34, y + 33, 6); ctx.fill();
      ctx.fillStyle = '#F7F9FD'; ctx.textAlign = 'center'; ctx.fillText(url, 960 + 12, y + 45); ctx.restore();
      L.label(ctx, 'TOYZ ORIGINAL · CHROME CLUB', 960, 990, { size: 24, align: 'center', alpha: clamp(rm(lt, 0.2, 0.45)) });
    },
  };
})();
