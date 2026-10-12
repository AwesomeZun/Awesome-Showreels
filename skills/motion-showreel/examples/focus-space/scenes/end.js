// end (1 bar; 3 in the 30): the end card: the stacked wordmark beside a small ring turning slowly to full, the app's
// line, the address and where it comes from (toyz original, Chrome Club collection).
(() => {
  const F = FS;
  SCENES['end'] = {
    draw(ctx, t, env) {
      const lt = env.lt;
      F.room(ctx, t, { gx: 960 });
      const e = styleSpring(lt + 0.15, { f: 2, z: 0.7 });
      ctx.save(); ctx.globalAlpha *= clamp(e * 1.8); F.ring(ctx, 1170, 200, 1.05, clamp(0.25 + lt * 0.12)); ctx.restore();
      F.wordmark(ctx, 330, 240, 176, lt + 0.1);
      kinetic(ctx, '해야 할 일 하나에 집중하는 작은 방', 960, 740, lt - 0.02, { size: 50, fam: 'display', weight: 700, color: '#D6DCCD', ls: -1.6, align: 'center', stagger: 0.01, dur: 0.32, rise: 14, blur: 4 });
      const up = Ease.outC(clamp(rm(lt, 0.1, 0.42)));
      ctx.save(); ctx.globalAlpha *= up; ctx.font = `600 34px ${FAM.mono}`; const url = 'focus-space.toyz.kr', w = ctx.measureText(url).width + 84, y = 800 + (1 - up) * 14;
      rr(ctx, 960 - w / 2, y, w, 66, 33); ctx.fillStyle = '#0E1A12'; ctx.fill(); ctx.strokeStyle = 'rgba(214,220,205,0.3)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#D0DCC5'; circle(ctx, 960 - w / 2 + 34, y + 33, 6); ctx.fill(); ctx.fillStyle = '#E9EDE3'; ctx.textAlign = 'center'; ctx.fillText(url, 960 + 12, y + 45); ctx.restore();
      F.label(ctx, 'TOYZ ORIGINAL · CHROME CLUB', 960, 1000, { size: 24, align: 'center', alpha: clamp(rm(lt, 0.2, 0.45)) });
    },
  };
})();
