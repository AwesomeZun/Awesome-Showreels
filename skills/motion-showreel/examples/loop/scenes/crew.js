// crew (2 bars; 4 in the 30): together, with links. The example crew 새벽 루프's board as the app shows it this week
// (captured): me at 100% and three members from their latest check-in cards (하늘 100%, 도윤 50%, 서아 75%), popping in
// one by one; then a cheer from 서아 arrives (the app's own cheer card). The headline: 서버 없이, 링크로 / 크루와 함께
// 이어요.
(() => {
  const L = LP, K = 1.0, MX = 712, MY = 350, CK = 1.2;
  SCENES['crew'] = {
    draw(ctx, t, env) {
      const lt = env.lt, B = env.beatSec, outAt = env.dur - env.outSec, out = env.phase.out;
      L.page(ctx, t, { gx: 1250, gy: 520 }); L.strip(ctx);
      for (let i = 0; i < 4; i++) { const a = (0.5 + i * 0.5) * B - 0.1, p = styleSpring(lt - a, { f: 2.6, z: 0.55 }); if (lt < a) continue; const lift = env.dur > 10 * B && lt > 5 * B ? Math.max(0, Math.sin(Math.PI * clamp(((lt - 5 * B) / B - i) % 4))) * 14 : 0, x = MX + i * (278 * K + 18), y = MY + (1 - p) * 60 - lift;
        ctx.save(); ctx.globalAlpha *= clamp((lt - a) * 5); ctx.translate(x + 139 * K, y + 242 * K); ctx.scale(0.9 + 0.1 * p, 0.9 + 0.1 * p); ctx.translate(-139 * K, -242 * K);
        L.card(ctx, 0, 0, 278 * K, 484.75 * K, { r: 20 }); L.draw(ctx, 'members_' + i, 0, 0, K); ctx.restore(); }
      const ce = styleSpring(lt - 3 * B, { f: 2.2, z: 0.7 });
      if (lt > 3 * B) { ctx.save(); ctx.globalAlpha *= clamp(ce * 1.6) * (1 - out); ctx.translate((1 - ce) * -200, 0); L.card(ctx, 120, 540, 376 * CK, 179.91 * CK, { r: 18 }); L.draw(ctx, 'cheer', 120, 540, CK); ctx.restore(); }
      L.label(ctx, 'TOGETHER / CREW BOARD · 새벽 루프', 124, 220, { size: 20, alpha: clamp(rm(lt, 0.05, 0.3)) * (1 - out) });
      kinetic(ctx, '서버 없이, 링크로', 116, 322, lt - 0.1, { size: 64, fam: 'display', weight: 800, color: '#16264A', ls: -2.6, stagger: 0.022, dur: 0.45, rise: 22, blur: 5, out: { at: outAt } });
      kinetic(ctx, '크루와 함께 이어요.', 116, 400, lt - 0.28, { size: 64, fam: 'display', weight: 800, color: '#16264A', ls: -2.6, stagger: 0.022, dur: 0.45, rise: 22, blur: 5, out: { at: outAt } });
    },
  };
})();
