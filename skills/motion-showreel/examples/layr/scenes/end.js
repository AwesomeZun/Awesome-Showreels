// end (1 bar; 3 in the 30): the end card. The brand mark (Brand.tsx) large at the top: its three plates part and settle
// and its lime edge draws on; the name in steel, the app's line, the address in a dark pill with the lime dot and, at
// the foot, where it comes from (toyz original, Chrome Club collection). Everything is up by 0.45 s.
(() => {
  const L = LAYR;
  SCENES['end'] = {
    draw(ctx, t, env) {
      const lt = env.lt, P = env.palette;
      L.stage(ctx, t, { lightX: 960, lightY: 300, lightR: 900 });
      const e = styleSpring(lt + 0.1, { f: 2, z: 0.62 });
      L.mark(ctx, 960 - 105, 150 + (1 - e) * 30, 210, { alpha: clamp(e * 1.7), spread: 1 + 0.5 * Math.sin(clamp(lt / 1.2) * Math.PI) * (1 - clamp(lt / 1.2)) + (1 - e) * 1.2, edge: clamp(rm(lt, 0.15, 0.6)) });
      ctx.save(); const g = ctx.createLinearGradient(0, -110, 0, 0); g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.6, '#DCE3EE'); g.addColorStop(1, '#9FB0C8');
      kinetic(ctx, 'LAYR', 960, 590, lt + 0.06, { size: 150, fam: 'display', weight: 850, color: g, ls: 4, align: 'center', stagger: 0.04, dur: 0.38, rise: 40, blur: 6 }); ctx.restore();
      kinetic(ctx, '흩어진 메모를 층으로 쌓아 프로젝트로.', 960, 676, lt - 0.04, { size: 46, fam: 'display', weight: 750, color: P.ink, ls: -1.6, align: 'center', stagger: 0.01, dur: 0.32, rise: 14, blur: 4 });
      const up = Ease.outC(clamp(rm(lt, 0.12, 0.45)));
      ctx.save(); ctx.globalAlpha *= up; ctx.font = `600 34px ${FAM.mono}`; const url = 'layr.toyz.kr', w = ctx.measureText(url).width + 84, y = 736 + (1 - up) * 14;
      rr(ctx, 960 - w / 2, y, w, 66, 33); ctx.fillStyle = '#121317'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.save(); ctx.fillStyle = '#D9F55B'; ctx.shadowColor = '#D9F55B'; ctx.shadowBlur = 12; circle(ctx, 960 - w / 2 + 34, y + 33, 6); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#F3F5F8'; ctx.textAlign = 'center'; ctx.fillText(url, 960 + 12, y + 45); ctx.restore();
      L.label(ctx, 'TOYZ ORIGINAL · CHROME CLUB', 960, 1000, { size: 24, color: '#8D96A5', align: 'center', alpha: clamp(rm(lt, 0.2, 0.45)) });
    },
  };
})();
