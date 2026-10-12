// end (1 bar; 3 in the 30): the end card on the metal plate: FORM / 01, the app's line, a lime pin dropping onto the
// name, the address and where it comes from (toyz original, Chrome Club collection).
(() => {
  const F = F1;
  SCENES['end'] = {
    draw(ctx, t, env) {
      const lt = env.lt, B = env.beatSec;
      F.plate(ctx, 0, 0, W, H, { k: 1.4, drift: lt * 6 });
      const e = styleSpring(lt + 0.12, { f: 2.2, z: 0.62 });
      ctx.save(); ctx.globalAlpha *= clamp(e * 2); const tw = F.title(ctx, 960, 520 + (1 - e) * 24, 220, '#0B0B0C', { align: 'center' }); ctx.restore();
      F.pin(ctx, 960 + tw / 2 + 14, 360, 1, '#C6FF3D', { s: 56, p: styleSpring(lt - 0.25, { f: 3, z: 0.45 }) });
      kinetic(ctx, '디자이너를 위한 가벼운 피드백 보드', 960, 616, lt - 0.02, { size: 50, fam: 'display', weight: 750, color: '#1F2023', ls: -1.8, align: 'center', stagger: 0.01, dur: 0.3, rise: 14, blur: 3 });
      const up = Ease.outC(clamp(rm(lt, 0.1, 0.42)));
      ctx.save(); ctx.globalAlpha *= up; ctx.font = `600 34px ${FAM.mono}`; const url = 'form-01.toyz.kr', w = ctx.measureText(url).width + 84, y = 680 + (1 - up) * 14;
      rr(ctx, 960 - w / 2, y, w, 66, 33); ctx.fillStyle = '#0B0B0C'; ctx.fill(); ctx.fillStyle = '#FF5A1F'; circle(ctx, 960 - w / 2 + 34, y + 33, 6); ctx.fill();
      ctx.fillStyle = '#EDEDEF'; ctx.textAlign = 'center'; ctx.fillText(url, 960 + 12, y + 45); ctx.restore();
      F.label(ctx, 'TOYZ ORIGINAL · CHROME CLUB', 960, 990, { size: 24, color: 'rgba(11,11,12,0.7)', align: 'center', alpha: clamp(rm(lt, 0.2, 0.45)) });
    },
  };
})();
