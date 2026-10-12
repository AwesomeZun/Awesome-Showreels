// pins (2 bars; 3 in the 30): pins on the work. The app's sample landing page (v2) on the dark desk with its crop
// marks and width. A cursor drags out a region over the metal card and 준서's blue pin 5 drops on its corner; then
// 하은's orange 6 lands on the client logos and 민지's lime 7 on the login button. Each brings its real comment card
// (captured from the app's panel) into the column on the left. The headline: 같은 화면 위에 / 핀을 찍어 모아요.
(() => {
  const F = F1, MX = 700, MY = 214, K = 0.78, CK = 1.45;
  const P = [{ n: 5, x: 0.555, y: 0.176, w: 0.378, h: 0.469, c: '#3D7BFF', card: 'cards_v2_0', at: 2 }, { n: 6, x: 0.32, y: 0.84, c: '#FF5A1F', card: 'cards_v2_1', at: 3.5 }, { n: 7, x: 0.876, y: 0.057, c: '#C6FF3D', card: 'cards_v2_2', at: 5 }];
  const ax = (u) => MX + u * 1440 * K, ay = (v) => MY + v * 1024 * K;
  function cursor(ctx, x, y, press) { ctx.save(); ctx.translate(x, y); ctx.scale(1.3 * (1 - 0.12 * press), 1.3 * (1 - 0.12 * press)); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 30); ctx.lineTo(8, 23); ctx.lineTo(13, 34); ctx.lineTo(18, 32); ctx.lineTo(13, 21); ctx.lineTo(23, 21); ctx.closePath(); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.shadowColor = 'transparent'; ctx.strokeStyle = '#0B0B0C'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore(); }
  SCENES['pins'] = {
    draw(ctx, t, env) {
      const lt = env.lt, B = env.beatSec, outAt = env.dur - env.outSec, out = env.phase.out;
      F.desk(ctx, t, { gx: 1260, gy: 600 });
      const e = styleSpring(lt + 0.06, { f: 2.2, z: 0.7 });
      ctx.save(); ctx.globalAlpha *= clamp(e * 1.6); ctx.translate(0, (1 - e) * 60);
      ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 26; ctx.fillStyle = '#0B0B0C'; ctx.fillRect(MX, MY, 1440 * K, 1024 * K); ctx.shadowColor = 'transparent';
      F.draw(ctx, 'mock_landing_v2', MX, MY, K); F.marks(ctx, MX, MY, 1440 * K, 1024 * K, { dim: '1440 × 1024', dimP: Ease.outC(clamp(rm(lt, 0.3, 0.8))) });
      // the region is dragged out first, then each pin drops on its beat
      const r = P[0], rg = Ease.ioC(clamp((lt - 1 * B) / B));
      if (lt > B) F.region(ctx, ax(r.x), ay(r.y), r.w * 1440 * K, r.h * 1024 * K, r.c, rg);
      P.forEach((p, i) => { const at = p.at * B, s = styleSpring(lt - at, { f: 3, z: 0.5 }); if (lt < at) return;
        const hot = env.dur > 10 * B && lt > 8 * B && Math.floor((lt - 8 * B) / B) % 3 === i;
        F.pin(ctx, ax(p.x), ay(p.y), p.n, p.c, { s: 38, p: s, sel: hot }); });
      ctx.restore();
      // the cursor: drag the region, then click where each pin goes
      const stops = [[0.6 * B, ax(r.x), ay(r.y)], [2 * B, ax(r.x + r.w), ay(r.y + r.h)], [3.5 * B, ax(P[1].x), ay(P[1].y)], [5 * B, ax(P[2].x), ay(P[2].y)]];
      let cx = 1900, cy = 1100; for (let i = 0; i < stops.length; i++) { const [t1, x1, y1] = stops[i], [t0, x0, y0] = i ? stops[i - 1] : [0, 1900, 1100];
        if (lt >= t0) { const u = Ease.ioC(clamp((lt - t0) / Math.max(0.2, (t1 - t0) * (i === 1 ? 1 : 0.8)))); cx = lerp(x0, x1, u); cy = lerp(y0, y1, u); } }
      if (lt > 5.6 * B) { const u = Ease.ioC(clamp((lt - 5.6 * B) / 0.6)); cx = lerp(stops[3][1], 1900, u); cy = lerp(stops[3][2], 1100, u); }
      const press = [B, 2 * B, 3.5 * B, 5 * B].some(tp => lt > tp - 0.06 && lt < tp + 0.1) || (lt > B && lt < 2 * B) ? 1 : 0;
      cursor(ctx, cx + 3, cy + 3, press);
      // the cards, each with a dashed lead to its pin
      P.forEach((p, i) => { const at = p.at * B + 0.1, c = styleSpring(lt - at, { f: 2.2, z: 0.72 }); if (lt < at) return; const y = 430 + i * 192, a = clamp(c * 1.6) * (1 - out);
        ctx.save(); ctx.globalAlpha *= a * 0.4; ctx.setLineDash([6, 6]); ctx.strokeStyle = p.c; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(120 + 351 * CK + 6, y + 88); ctx.lineTo(ax(p.x), ay(p.y)); ctx.stroke(); ctx.restore();
        ctx.save(); ctx.globalAlpha *= a; ctx.translate((1 - c) * -80, 0); rr(ctx, 120, y, 351 * CK, 121.75 * CK, 14); ctx.fillStyle = '#101012'; ctx.fill(); F.draw(ctx, p.card, 120, y, CK); ctx.restore(); });
      kinetic(ctx, '같은 화면 위에', 116, 250, lt - 0.12, { size: 78, fam: 'display', weight: 800, color: '#EDEDEF', ls: -3.2, stagger: 0.022, dur: 0.45, rise: 24, blur: 6, out: { at: outAt } });
      kinetic(ctx, '핀을 찍어 모아요.', 116, 342, lt - 0.3, { size: 78, fam: 'display', weight: 800, color: '#EDEDEF', ls: -3.2, stagger: 0.022, dur: 0.45, rise: 24, blur: 6, out: { at: outAt } });
      F.label(ctx, 'SONAR NOTES · 랜딩 · 히어로 · V2', 120, 160, { size: 20, alpha: clamp(rm(lt, 0.05, 0.3)) * (1 - out) });
    },
  };
})();
