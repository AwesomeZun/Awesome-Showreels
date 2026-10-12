// end (1 bar; 3 in the 30): the end card over the app's dark map of Seoul, drifting slowly: its lime title slab with the
// name and the app's line, the address in a dark pill and, at the foot, where it comes from (toyz original, Chrome Club
// collection). Up by 0.4 s so the one-bar cut still reads.
(() => {
  const M = OG;
  SCENES['end'] = {
    draw(ctx, t, env) {
      const lt = env.lt;
      M.map(ctx, { lat: 37.5600 - lt * 0.0004, lng: 126.995 + lt * 0.0012, z: 13.85 + lt * 0.02 }, { lift: 1.0 });
      M.PLACES.forEach(pl => { const [x, y] = M.project({ lat: 37.5600 - lt * 0.0004, lng: 126.995 + lt * 0.0012, z: 13.85 + lt * 0.02 }, pl.lat, pl.lng);
        ctx.save(); ctx.fillStyle = M.LIME; ctx.shadowColor = M.LIME; ctx.shadowBlur = 8; ctx.globalAlpha *= 0.8; circle(ctx, x, y, 4.5); ctx.fill(); ctx.restore(); });
      ctx.fillStyle = 'rgba(11,11,12,0.55)'; ctx.fillRect(0, 0, W, H);
      const e = styleSpring(lt + 0.12, { f: 2.2, z: 0.62 }), w = 860, h = 430, x = W / 2 - w / 2, y = 150 + (1 - e) * -40;
      ctx.save(); ctx.globalAlpha *= clamp(e * 2);
      M.slab(ctx, x, y, w, h, 2);
      kinetic(ctx, 'OFFGRID', W / 2, y + 236, lt + 0.06, { size: 200, fam: 'display', weight: 900, color: '#0B0B0C', ls: -0.062 * 200, align: 'center', stagger: 0.03, dur: 0.32, rise: 36, blur: 4 });
      kinetic(ctx, '관광지 밖에서 찾는 나만의 로컬 지도.', W / 2, y + 352, lt - 0.02, { size: 46, fam: 'display', weight: 800, color: '#0B0B0C', ls: -1.6, align: 'center', stagger: 0.01, dur: 0.3, rise: 14, blur: 3 });
      ctx.restore();
      const up = Ease.outC(clamp(rm(lt, 0.1, 0.42)));
      ctx.save(); ctx.globalAlpha *= up; ctx.font = `600 34px ${FAM.mono}`; const url = 'offgrid.toyz.kr', uw = ctx.measureText(url).width + 84, uy = 640 + (1 - up) * 14;
      rr(ctx, W / 2 - uw / 2, uy, uw, 66, 33); ctx.fillStyle = 'rgba(11,11,12,0.92)'; ctx.fill(); ctx.strokeStyle = 'rgba(215,247,91,0.45)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.save(); ctx.fillStyle = M.LIME; ctx.shadowColor = M.LIME; ctx.shadowBlur = 12; circle(ctx, W / 2 - uw / 2 + 34, uy + 33, 6); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#F3F3EE'; ctx.textAlign = 'center'; ctx.fillText(url, W / 2 + 12, uy + 45); ctx.restore();
      M.label(ctx, 'TOYZ ORIGINAL · CHROME CLUB', W / 2, 990, { size: 24, color: '#C4C4BC', align: 'center', alpha: clamp(rm(lt, 0.2, 0.45)) });
      M.credit(ctx);
    },
  };
})();
