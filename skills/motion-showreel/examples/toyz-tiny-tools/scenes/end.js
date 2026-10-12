// end (1 bar; 3 in the 30): the end card. The app's logo, its name with the lilac dot, its README's one-liner, the
// address in a dark pill and, at the foot, where it comes from (toyz original, Chrome Club collection).
(() => {
  const T = TT;
  SCENES['end'] = {
    draw(ctx, t, env) {
      const lt = env.lt;
      T.stage(ctx, t, { glowX: 960 + Math.sin(lt * 0.7) * 160, glowY: 380 + Math.cos(lt * 0.5) * 60, glowR: 900, strip: false });
      const e = styleSpring(lt + 0.14, { f: 2.6, z: 0.55 });
      ctx.save(); ctx.globalAlpha *= clamp(e * 2); T.logo(ctx, 960 - 80, 150 + (1 - e) * 30 + Math.sin(lt * 1.6) * 6, 160, { dot: e }); ctx.restore();
      T.word(ctx, 960, 520, 150, { align: 'center', alpha: clamp(rm(lt, -0.1, 0.2)) });
      kinetic(ctx, '매일 쓰는 개발 도구, 필요한 만큼만.', 960, 612, lt - 0.02, { size: 48, fam: 'display', weight: 750, color: '#BDB9DC', ls: -1.8, align: 'center', stagger: 0.01, dur: 0.3, rise: 14, blur: 4 });
      const up = Ease.outC(clamp(rm(lt, 0.1, 0.42)));
      ctx.save(); ctx.globalAlpha *= up; ctx.font = `600 34px ${FAM.mono}`; const url = 'tiny-tools.toyz.kr', w = ctx.measureText(url).width + 84, y = 680 + (1 - up) * 14;
      rr(ctx, 960 - w / 2, y, w, 66, 33); ctx.fillStyle = '#13131C'; ctx.fill(); ctx.strokeStyle = 'rgba(168,155,255,0.45)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.save(); ctx.fillStyle = '#58E3A6'; ctx.shadowColor = '#58E3A6'; ctx.shadowBlur = 10; circle(ctx, 960 - w / 2 + 34, y + 33, 6); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#F4F3FF'; ctx.textAlign = 'center'; ctx.fillText(url, 960 + 12, y + 45); ctx.restore();
      T.label(ctx, 'TOYZ ORIGINAL · CHROME CLUB', 960, 990, { size: 24, color: '#908CB1', align: 'center', alpha: clamp(rm(lt, 0.2, 0.45)) });
    },
  };
})();
