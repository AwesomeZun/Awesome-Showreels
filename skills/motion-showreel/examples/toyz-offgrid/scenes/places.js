// places (1 bar; 2 in the 30): alley places. The push goes on into Seongsu at street level; the app's seven Seongsu
// places stand on the map as its own pins and bounce in turn (category icon, dashed for 가고 싶어요, a lime dot for favourites)
// with their names; 붉은벽돌 커피 lights up as selected and its card (the app's own, captured) slides in on the left.
// The headline: 골목 가게를 / 지도에 남겨요.
(() => {
  const M = OG;
  const C0 = { lat: 37.5446, lng: 127.0455, z: 15.55 }, C1 = { lat: 37.5440, lng: 127.0472, z: 16.05 };
  const SEONG = [6, 0, 1, 3, 4, 2, 5];                                               // drop order (east cluster first)
  SCENES['places'] = {
    draw(ctx, t, env) {
      const lt = env.lt, B = env.beatSec, P = env.palette, outAt = env.dur - env.outSec, p = Ease.ioC(clamp(lt / env.dur));
      const cam = { lat: lerp(C0.lat, C1.lat, p), lng: lerp(C0.lng, C1.lng, p), z: lerp(C0.z, C1.z, p) };
      M.map(ctx, cam, { lift: 1.15 });
      const selAt = env.dur > 3 ? 2.5 * B : 2.25 * B;
      M.PLACES.forEach(pl => { const [x, y] = M.project(cam, pl.lat, pl.lng); if (x < -80 || x > W + 80 || y < -80 || y > H + 80) return;
        const k = SEONG.indexOf(pl.i); if (k < 0) { M.pin(ctx, x, y, pl, { k: 1.5, alpha: 0.5, label: 0 }); return; }
        // the pins arrive from the hook already standing; each bounces in turn on its beat
        const at = (0.25 + 0.25 * k) * B, d = lt - at, bump = d > 0 ? Math.exp(-d * 6) * Math.sin(Math.min(d * 14, Math.PI)) : 0;
        M.pin(ctx, x, y, pl, { k: 1.5 + 0.05 * clamp(lt / 0.5), pop: 1 + 0.35 * bump, label: 1, selected: pl.i === 0 && lt > selAt }); });
      M.scrim(ctx, 'left', 0.85, 900);
      // the place's own card
      const ce = styleSpring(lt - selAt + 0.12, { f: 2, z: 0.7 });
      if (lt > selAt - 0.12) { ctx.save(); ctx.globalAlpha *= clamp(ce * 1.6) * (1 - env.phase.out); ctx.translate((1 - ce) * -420, 0);
        ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 20; rr(ctx, 120, 390, 396 * 0.98, 520 * 0.98, 14); ctx.fillStyle = '#0F0F11'; ctx.fill(); ctx.shadowColor = 'transparent';
        M.draw(ctx, 'detail', 120, 390, 0.98, { crop: [0, 0, 396, 520] }); ctx.restore(); }
      M.label(ctx, '01 SEONGSU · 성수 7곳', 148, 150, { size: 22, color: '#C4C4BC', dot: true, alpha: clamp(rm(lt, 0.02, 0.3)) * (1 - env.phase.out) });
      M.headline(ctx, ['골목 가게를', '지도에 남겨요.'], 118, 252, lt + 0.05, { size: 84, gap: 94, out: { at: outAt } });
      M.credit(ctx);
    },
  };
})();
