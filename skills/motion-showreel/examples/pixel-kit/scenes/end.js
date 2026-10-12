// end (1 bar; 3 in the 30): the end card: the mark, PIXEL KIT, the app's promise (브랜드 킷 하나로 모든 크기를 같은 얼굴로),
// the address and where it comes from (toyz original, Chrome Club collection).
(() => {
  const P = PK;
  SCENES['end'] = {
    draw(ctx, t, env) {
      const lt = env.lt;
      P.studio(ctx, t, { gx: 960, gy: 380, glow: 0.18 });
      P.mark(ctx, 960 - 60, 170 + Math.sin(lt * 1.4) * 5, 120, clamp((lt + 0.3) / 0.5));
      kinetic(ctx, 'PIXEL KIT', 960, 500, lt + 0.08, { size: 156, fam: 'display', weight: 850, color: '#F3EFF4', ls: -6, align: 'center', stagger: 0.03, dur: 0.32, rise: 40, blur: 5 });
      kinetic(ctx, '브랜드 킷 하나로, 모든 크기를 같은 얼굴로', 960, 600, lt - 0.02, { size: 50, fam: 'display', weight: 750, color: '#E5B5E0', ls: -1.8, align: 'center', stagger: 0.01, dur: 0.3, rise: 14, blur: 4 });
      const up = Ease.outC(clamp(rm(lt, 0.1, 0.42)));
      ctx.save(); ctx.globalAlpha *= up; ctx.font = `600 34px ${FAM.mono}`; const url = 'pixel-kit.toyz.kr', w = ctx.measureText(url).width + 84, y = 670 + (1 - up) * 14;
      rr(ctx, 960 - w / 2, y, w, 66, 33); ctx.fillStyle = '#17151A'; ctx.fill(); ctx.strokeStyle = 'rgba(229,181,224,0.45)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#E5B5E0'; rr(ctx, 960 - w / 2 + 28, y + 27, 12, 12, 2.5); ctx.fill(); ctx.fillStyle = '#F3EFF4'; ctx.textAlign = 'center'; ctx.fillText(url, 960 + 12, y + 45); ctx.restore();
      P.label(ctx, 'TOYZ ORIGINAL · CHROME CLUB', 960, 990, { size: 24, align: 'center', alpha: clamp(rm(lt, 0.2, 0.45)) });
    },
  };
})();
