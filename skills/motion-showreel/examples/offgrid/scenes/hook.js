// hook (2 bars): from Seoul to an alley. The app's dark map of Seoul with its four neighbourhoods (01 성수 · 02 연남 ·
// 03 을지로 · 04 서촌, each a cluster of lime dots); the camera pushes east and down into Seongsu in one continuous move
// across the captured zooms while the dots become pins. On the left the app's lime title slab drops in at once:
// OFFGRID, and the app's line, 관광지 밖에서 찾는 / 나만의 로컬 지도.
(() => {
  const M = OG;
  const HOODS = [['01', '성수', 'SEONGSU', 37.5442, 127.0478, 7], ['02', '연남', 'YEONNAM', 37.5632, 126.925, 7], ['03', '을지로', 'EULJIRO', 37.5675, 126.993, 6], ['04', '서촌', 'SEOCHON', 37.5812, 126.9688, 6]];
  const C0 = { lat: 37.5655, lng: 126.968, z: 13.75 }, C1 = { lat: 37.5446, lng: 127.0455, z: 15.55 };
  SCENES['hook'] = {
    cam(lt, dur) { const p = Ease.ioC(clamp((lt - 0.9) / (dur - 1.0))); const z = lerp(C0.z, C1.z, p), f = (Math.pow(2, z - C0.z) - 1) / (Math.pow(2, C1.z - C0.z) - 1);
      return { lat: lerp(C0.lat, C1.lat, f), lng: lerp(C0.lng, C1.lng, f), z }; },
    draw(ctx, t, env) {
      const lt = env.lt, B = env.beatSec, out = Ease.inC(env.phase.out), cam = this.cam(lt, env.dur);
      M.map(ctx, cam, { lift: 1.15 });
      // places: dots far away, pins up close
      const near = clamp((cam.z - 14.9) / 0.5);
      M.PLACES.forEach(pl => { const [x, y] = M.project(cam, pl.lat, pl.lng); if (x < -60 || x > W + 60 || y < -60 || y > H + 60) return;
        if (near < 1) { ctx.save(); ctx.globalAlpha *= (1 - near) * clamp(rm(lt, 0.1 + pl.i * 0.012, 0.4 + pl.i * 0.012)); ctx.fillStyle = M.LIME; ctx.shadowColor = M.LIME; ctx.shadowBlur = 8; circle(ctx, x, y, 5); ctx.fill(); ctx.restore(); }
        if (near > 0) M.pin(ctx, x, y, pl, { k: 1.2 + 0.3 * near, pop: Ease.outBack(near, 2), alpha: near, label: clamp((cam.z - 15.3) / 0.25) }); });
      // the neighbourhood tags (as the app labels them), fading as we arrive
      HOODS.forEach(([no, ko, en, la, ln, n], i) => { const [x, y] = M.project(cam, la, ln), a = clamp(rm(lt, 0.3 + i * 0.12, 0.6 + i * 0.12)) * (1 - near) * (i === 0 ? 1 : 1 - clamp((cam.z - 14.3) / 0.4)); if (a <= 0) return;
        ctx.save(); ctx.globalAlpha *= a;
        ctx.font = `600 18px ${FAM.mono}`; const w1 = ctx.measureText(no + ' ').width; ctx.font = `800 24px ${FAM.sans}`; const w2 = ctx.measureText(ko + ' ').width; ctx.font = `500 16px ${FAM.mono}`; const w3 = ctx.measureText(en + '  ' + n + '곳').width;
        const tw = w1 + w2 + w3 + 30, flip = x + 40 + tw > W - 40, tx = flip ? x - 40 - tw : x + 40, ty = y - 70;   // the tag goes left near the right edge
        ctx.strokeStyle = 'rgba(215,247,91,0.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(flip ? tx + tw : tx, ty + 18); ctx.stroke();
        rr(ctx, tx, ty, tw, 38, 8); ctx.fillStyle = 'rgba(11,11,12,0.9)'; ctx.fill(); ctx.strokeStyle = 'rgba(215,247,91,0.55)'; ctx.stroke();
        ctx.font = `600 18px ${FAM.mono}`; ctx.fillStyle = M.LIME; ctx.fillText(no, tx + 12, ty + 26); ctx.font = `800 24px ${FAM.sans}`; ctx.fillStyle = '#F3F3EE'; ctx.fillText(ko, tx + 12 + w1, ty + 27);
        ctx.font = `500 16px ${FAM.mono}`; ctx.fillStyle = '#95958D'; ctx.fillText(en + '  ' + n + '곳', tx + 12 + w1 + w2, ty + 26); ctx.restore(); });
      M.scrim(ctx, 'left', 0.8, 1100);
      // the slab: the name and the line
      const e = styleSpring(lt + 0.12, { f: 2.2, z: 0.62 }), sx = 120 - out * 900, sy = 268 + (1 - e) * -60;
      ctx.save(); ctx.globalAlpha *= clamp(e * 2);
      M.slab(ctx, sx, sy, 760, 470, 2);
      kinetic(ctx, 'OFFGRID', sx + 34, sy + 222, lt - 0.06, { size: 178, fam: 'display', weight: 900, color: '#0B0B0C', ls: -0.062 * 178, stagger: 0.035, dur: 0.38, rise: 40, blur: 4 });
      kinetic(ctx, '관광지 밖에서 찾는', sx + 40, sy + 330, lt - 0.32, { size: 56, fam: 'display', weight: 800, color: '#0B0B0C', ls: -2, stagger: 0.016, dur: 0.36, rise: 18, blur: 3 });
      kinetic(ctx, '나만의 로컬 지도.', sx + 40, sy + 400, lt - 0.42, { size: 56, fam: 'display', weight: 800, color: '#0B0B0C', ls: -2, stagger: 0.016, dur: 0.36, rise: 18, blur: 3 });
      ctx.restore();
      M.credit(ctx);
    },
  };
})();
