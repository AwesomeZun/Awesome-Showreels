// end (1 bar; 3 in the 30): the end card on the stage, its colour drifting slowly between 몽글 and 맑음 by the app's
// palette: the logo with its needle easing round, the name, the app's line, the address and where it comes from (toyz
// original, Chrome Club collection).
(() => {
  const M = MF;
  SCENES['end'] = {
    draw(ctx, t, env) {
      const lt = env.lt, u = 0.5 + 0.5 * Math.sin(lt * 0.6 - 1.2), mood = { x: lerp(0.7, 0.86, u), y: lerp(0.26, 0.54, u) }, pal = M.paletteAt(mood.x, mood.y), ink = M.inkColor(pal);
      M.stage(ctx, 0, 0, W, H, pal);
      const e = styleSpring(lt + 0.14, { f: 2.2, z: 0.6 });
      ctx.save(); ctx.globalAlpha *= clamp(e * 2); M.logo(ctx, 960 - 85, 170 + (1 - e) * 30, 170, { angle: -0.9 + Math.sin(lt * 0.8) * 0.5 }); ctx.restore();
      ctx.save(); ctx.globalAlpha *= clamp(rm(lt, -0.1, 0.2)); M.word(ctx, 960, 540, 160, ink, { align: 'center' }); ctx.restore();
      kinetic(ctx, '오늘의 기분으로 고르는 플레이리스트', 960, 628, lt - 0.02, { size: 50, fam: 'display', weight: 800, color: ink, ls: -1.8, align: 'center', stagger: 0.01, dur: 0.3, rise: 14, blur: 4 });
      const up = Ease.outC(clamp(rm(lt, 0.1, 0.42)));
      ctx.save(); ctx.globalAlpha *= up; ctx.font = `600 34px ${FAM.mono}`; const url = 'mood-fm.toyz.kr', w = ctx.measureText(url).width + 84, y = 690 + (1 - up) * 14;
      rr(ctx, 960 - w / 2, y, w, 66, 33); ctx.fillStyle = 'rgba(11,11,12,0.85)'; ctx.fill();
      M.lamp(ctx, 960 - w / 2 + 34, y + 33, 6, 1); ctx.fillStyle = '#F6F2EE'; ctx.textAlign = 'center'; ctx.fillText(url, 960 + 12, y + 45); ctx.restore();
      M.label(ctx, 'TOYZ ORIGINAL · CHROME CLUB', 960, 990, { size: 24, color: ink, align: 'center', alpha: clamp(rm(lt, 0.2, 0.45)) });
    },
  };
})();
