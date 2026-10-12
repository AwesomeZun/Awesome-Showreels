// og (4 bars, the 30 only): the share card and the icons come along. The app's real OG image preview (1200 x 630, the
// kit's title over its brand blue and knot) on the left; its four layout cards light one by one on the beat (포스터,
// 분할, 그리드, 카드); then its favicon sizes pop in a row (16, 32, 180, 192, 512). Headline right: OG 이미지와 /
// 파비콘까지.
(() => {
  const D = DK, OG = [380, 320, 820, 470], LAYOUTS = [[380, 840, 196, 160], [590, 840, 196, 160], [800, 840, 196, 160], [1010, 840, 196, 160]], FAV = [380, 616, 820, 160];
  SCENES['og'] = {
    draw(ctx, t, env) {
      const lt = env.lt, P = env.palette, B = env.beatSec, out = env.phase.out;
      D.stage(ctx, t, { glowX: 500 });
      const e = styleSpring(lt + 0.05, { f: 2.6, z: 0.6 }), k = 1.12;
      ctx.save(); ctx.globalAlpha *= clamp(e * 1.4); ctx.translate(0, (1 - e) * 60);
      ctx.shadowColor = 'rgba(11,47,230,0.3)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 20; D.draw(ctx, 'og_page', 96, 110, k, { crop: OG }); ctx.restore();
      LAYOUTS.forEach((r, i) => {
        const at = 4 * B + i * B, p = styleSpring(lt - (2.5 * B + i * 0.12), { f: 3, z: 0.6 }); if (lt < 2.5 * B + i * 0.12) return;
        const x = 96 + i * 232, y = 680;
        ctx.save(); ctx.globalAlpha *= clamp(p * 1.5); D.draw(ctx, 'og_page', x, y + (1 - p) * 30, 1.12, { crop: r }); ctx.restore();
        const on = lt >= at && lt < at + B * (i === 3 ? 99 : 1);
        if (on) { ctx.save(); ctx.strokeStyle = P.accent; ctx.lineWidth = 4; rr(ctx, x - 4, y - 4, r[2] * 1.12 + 8, r[3] * 1.12 + 8, 10); ctx.stroke(); ctx.restore(); }
      });
      // favicon sizes
      const fp = clamp((lt - 8.6 * B) / 0.3);
      if (fp > 0) { ctx.save(); ctx.globalAlpha *= fp; ctx.shadowColor = 'rgba(10,11,16,0.12)'; ctx.shadowBlur = 30; D.draw(ctx, 'fav_page', 1060, 700, 0.95, { crop: FAV }); ctx.restore(); }
      D.label(ctx, '03 OG IMAGE · 04 FAVICON', 1064, 200, { size: 22, color: P.accent, alpha: clamp(rm(lt, 0.1, 0.4)) * (1 - out) });
      D.headline(ctx, ['OG 이미지와', '파비콘까지.'], 1060, 320, lt - 0.2, { size: 92, gap: 104, out: { at: env.dur - env.outSec } });
      kinetic(ctx, '1200×630 · 레이아웃 4종 · 16~512px', 1064, 560, lt - 0.8, { size: 30, fam: 'sans', weight: 600, color: P.ink2, ls: -0.4, stagger: 0.012, dur: 0.35, rise: 12, blur: 3, out: { at: env.dur - env.outSec } });
    },
  };
})();
