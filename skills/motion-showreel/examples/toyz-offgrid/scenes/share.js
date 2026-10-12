// share (2 bars, the 30 only): one link. The walk stays drawn on the map, the camera easing back a little; the app's
// own share dialog rises (코스 1개 · 장소 5곳을 링크 하나에 담았어요), its link (as it reads on the deployed app) is swept
// in lime, and 링크 복사 is pressed on the beat. The headline: 링크 하나로 / 그대로 나눠요.
(() => {
  const M = OG, R = M.ROUTES[0], K = 1.18, DX = 1120, DY = 300;
  SCENES['share'] = {
    draw(ctx, t, env) {
      const lt = env.lt, B = env.beatSec, P = env.palette, outAt = env.dur - env.outSec, p = Ease.ioC(clamp(lt / env.dur));
      const cam = { lat: 37.5440, lng: lerp(127.0520, 127.0532, p), z: lerp(17.4, 17.05, p) };
      M.map(ctx, cam, { lift: 1.15 });
      const pts = R.points.map(([la, ln]) => M.project(cam, la, ln)); M.line(ctx, pts, 1, { k: 1.7 });
      M.PLACES.forEach(pl => { const k = R.places.indexOf(pl.i); if (k < 0) return; const [x, y] = M.project(cam, pl.lat, pl.lng); M.pin(ctx, x, y, pl, { k: 1.5, label: 0 }); });
      ctx.fillStyle = 'rgba(11,11,12,0.45)'; ctx.fillRect(0, 0, W, H);
      M.scrim(ctx, 'left', 0.85, 900);
      const e = styleSpring(lt - 0.2, { f: 2, z: 0.7 });
      ctx.save(); ctx.globalAlpha *= clamp(e * 1.6); ctx.translate(0, (1 - e) * 80);
      ctx.shadowColor = 'rgba(0,0,0,0.75)'; ctx.shadowBlur = 70; ctx.shadowOffsetY = 26; rr(ctx, DX, DY, 560 * K, 414 * K, 16); ctx.fillStyle = '#141416'; ctx.fill(); ctx.shadowColor = 'transparent';
      M.draw(ctx, 'share', DX, DY, K);
      // a lime sweep along the link, then 링크 복사 pressed on beat 4
      const sw = clamp((lt - 1.5 * B) / (1.6 * B)); if (sw > 0 && sw < 1) { ctx.save(); ctx.beginPath(); ctx.rect(DX + 18 * K, DY + 155 * K, 524 * K, 80 * K); ctx.clip();
        const gx = DX + (18 + 560 * sw) * K, g = ctx.createLinearGradient(gx - 120, 0, gx + 20, 0); g.addColorStop(0, 'rgba(215,247,91,0)'); g.addColorStop(1, 'rgba(215,247,91,0.35)'); ctx.fillStyle = g; ctx.fillRect(gx - 120, DY + 155 * K, 140, 80 * K); ctx.restore(); }
      const pr = lt > 4 * B - 0.04 && lt < 4 * B + 0.14 ? 1 : 0, ring = clamp((lt - 4 * B) / 0.5);
      if (pr) { ctx.save(); ctx.fillStyle = 'rgba(11,11,12,0.25)'; rr(ctx, DX + 18 * K, DY + 285 * K, 203 * K, 32 * K, 9 * K); ctx.fill(); ctx.restore(); }
      if (ring > 0 && ring < 1) { ctx.save(); ctx.globalAlpha *= 1 - ring; ctx.strokeStyle = M.LIME; ctx.lineWidth = 3; rr(ctx, DX + 18 * K - 14 * ring, DY + 285 * K - 14 * ring, 203 * K + 28 * ring, 32 * K + 28 * ring, 12); ctx.stroke(); ctx.restore(); }
      ctx.restore();
      M.label(ctx, 'SHARE / 성수 붉은벽돌 골목 한 바퀴', 148, 150, { size: 22, color: '#C4C4BC', dot: true, alpha: clamp(rm(lt, 0.05, 0.35)) * (1 - env.phase.out) });
      M.headline(ctx, ['링크 하나로', '그대로 나눠요.'], 118, 252, lt - 0.1, { size: 84, gap: 94, out: { at: outAt } });
      kinetic(ctx, '서버에 올리지 않고, 주소 안에 담아요', 122, 440, lt - 0.8, { size: 36, fam: 'sans', weight: 600, color: P.ink2, ls: -0.5, stagger: 0.012, dur: 0.4, rise: 12, blur: 4, out: { at: outAt } });
      M.credit(ctx);
    },
  };
})();
