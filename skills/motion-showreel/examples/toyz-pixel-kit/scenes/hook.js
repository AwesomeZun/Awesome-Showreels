// hook (2 bars): the name. The app's mark assembles pixel by pixel, PIXEL KIT and the app's line, 작은 브랜드를 위한 이미지
// 제작 도구, while on the right the three sample kits' portrait designs (the app's own renders) fan out like cards.
(() => {
  const P = PK, CARDS = [['morae_1', -0.14, -250], ['pado_1', 0.12, 250], ['soom_1', -0.02, 0]];
  SCENES['hook'] = {
    draw(ctx, t, env) {
      const lt = env.lt, B = env.beatSec, outAt = env.dur - env.outSec, out = env.phase.out;
      P.studio(ctx, t, { gx: 1450, gy: 420 });
      CARDS.forEach(([n, rot, dx], i) => { const e = styleSpring(lt - 0.2 - i * 0.5 * B, { f: 2.4, z: 0.6 }); if (lt < 0.2 + i * 0.5 * B) return;
        const w = 352, h = 440, x = 1470 + dx * e - w / 2, y = 320 + (1 - e) * 120 + Math.sin(lt * 1.2 + i) * 6;
        P.frame(ctx, n, x, y, w, h, { rot: rot * e + (1 - e) * 0.3, alpha: clamp(e * 2) }); });
      P.mark(ctx, 120, 300, 104, clamp(lt / 0.6));
      kinetic(ctx, 'PIXEL KIT', 116, 530, lt - 0.1, { size: 156, fam: 'display', weight: 850, color: '#F3EFF4', ls: -6, stagger: 0.035, dur: 0.4, rise: 50, blur: 6, out: { at: outAt } });
      kinetic(ctx, '작은 브랜드를 위한 이미지 제작 도구', 122, 640, lt - 0.32, { size: 54, fam: 'display', weight: 750, color: '#E5B5E0', ls: -2, stagger: 0.016, dur: 0.4, rise: 18, blur: 5, out: { at: outAt } });
      P.label(ctx, 'BRAND KIT · 13 TEMPLATES · 6 SIZES', 124, 730, { size: 22, alpha: clamp(rm(lt, 0.9, 1.2)) * (1 - out) });
    },
  };
})();
