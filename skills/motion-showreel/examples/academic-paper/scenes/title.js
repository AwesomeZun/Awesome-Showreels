// title (1 bar, 2 in the 30): the article's first page beside the organ it is about. On the left, as a journal sets
// it: the ARTICLE tag and running head, the title rising line by line in Source Serif 4 (KRT8+ in coral), authors and
// affiliations. On the right a generated illustration of the alveoli floats in soft daylight over an out-of-focus
// airspace, motes drifting in front; its injured sac pulses coral and a pill names it. In the 30 three chips give the
// atlas's size and the abstract's first sentence follows. In the last beat the camera pushes toward the injury.
(() => {
  SCENES['title'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, n = Math.round(env.dur / B), X = Math.max(0, n - 4);
      const push = Ease.inC(clamp((b - (n - 1.2)) / 1.2)), M = LG.ill('alveoli'), meta = ASSET('ill/meta.json').alveoli;
      LG.bg(ctx, t, { air: 0.6, px: b * 6 });
      // the alveoli, floating; the push heads for the injured sac
      const iw = 820, ih = iw * meta.size[1] / meta.size[0], ix = 1380 - iw / 2, iy = 560 - ih / 2 + 10 * Math.sin(t * 0.7);
      const inj = [ix + meta.injury[0] * iw / meta.size[0], iy + meta.injury[1] * ih / meta.size[1]], z = 1 + 0.03 * b / n + 1.4 * push;
      ctx.save(); ctx.translate(inj[0], inj[1]); ctx.scale(z, z); ctx.translate(-inj[0], -inj[1]);
      ctx.fillStyle = radial(ctx, 1380, 560 + ih * 0.48, 0, iw * 0.5, [[0, 'rgba(120,60,80,0.22)'], [1, 'rgba(120,60,80,0)']]); ctx.beginPath(); ctx.ellipse(1380, 560 + ih * 0.48, iw * 0.45, 60, 0, 0, TAU); ctx.fill();
      const fk = Ease.outExpo(clamp(b / 1.6)); ctx.globalAlpha = fk; if (M) ctx.drawImage(M, ix, iy + (1 - fk) * 40, iw, ih); ctx.globalAlpha = 1;
      const pk = clamp((b - 2.4) / 0.6); if (pk > 0) { const pr = 70 + 18 * Math.sin(t * 3); ctx.fillStyle = radial(ctx, inj[0], inj[1], 0, pr * 1.6, [[0, rgba(LG.CORAL, 0.35 * pk)], [1, rgba(LG.CORAL, 0)]]); ctx.fillRect(inj[0] - pr * 2, inj[1] - pr * 2, pr * 4, pr * 4); ctx.strokeStyle = rgba(LG.CORAL, 0.8 * pk); ctx.lineWidth = 2.5; ctx.setLineDash([6, 8]); circle(ctx, inj[0], inj[1], pr); ctx.stroke(); ctx.setLineDash([]); }
      ctx.restore();
      LG.pill(ctx, 'injured alveolus', inj[0] + 40, inj[1] + 170, clamp((b - 2.6) / 0.6) * (1 - push), { dot: LG.CORAL, to: [inj[0] + 10, inj[1] + 70] });
      LG.motes(ctx, t, 0.8, b * 10);
      // the page
      const a = 1 - push;
      LG.pill(ctx, 'ARTICLE', 214, 196, clamp(b / 0.4) * a, { size: 20, bg: LG.CORAL, color: '#FFFFFF' });
      LG.txt(ctx, 'Spatial omics · 2026 · fictional manuscript for this example', 300, 203, { size: 20, color: LG.MUTED, a: clamp(b / 0.6) * a });
      const L = [['A spatial multiome atlas of', null], ['human alveolar repair resolves', null], ['a ', 'KRT8⁺', ' transitional niche']];
      L.forEach((ln, i) => {
        const p = clamp((b - 0.35 - i * 0.32) / 0.9), y = 330 + i * 84;
        if (ln[1] === null) LG.rise(ctx, ln[0], 150, y, p, { size: 66, weight: 600, serif: true, a });
        else { const w0 = LG.width(ctx, ln[0], 66, 600, true), w1 = LG.width(ctx, ln[1], 66, 600, true); LG.rise(ctx, ln[0], 150, y, p, { size: 66, weight: 600, serif: true, a }); LG.rise(ctx, ln[1], 150 + w0, y, p, { size: 66, weight: 600, serif: true, color: LG.CORAL, a }); LG.rise(ctx, ln[2], 150 + w0 + w1, y, p, { size: 66, weight: 600, serif: true, a }); }
      });
      LG.rise(ctx, 'Mira K. Halden, Joon-ho Seo, Ana P. Ferreira, Tomas Lindqvist & Ruth O. Adeyemi', 150, 600, clamp((b - 1.7) / 0.8), { size: 23, weight: 500, color: LG.INK2, a });
      LG.rise(ctx, 'Institute for Lung Regeneration (fictional) · Spatial Omics Core', 150, 636, clamp((b - 1.95) / 0.8), { size: 19, color: LG.MUTED, a });
      if (X) {
        [['412,806 nuclei', '#2F6FDB'], ['14 donors', '#13A39A'], ['8 cell types', LG.CORAL]].forEach(([s, c], i) => LG.pill(ctx, s, 150 + [96, 290, 452][i], 720, clamp((b - 4.2 - i * 0.25) / 0.6) * a, { dot: c, size: 24 }));
        LG.rise(ctx, 'After injury, the alveolus rebuilds its gas-exchange surface', 150, 812, clamp((b - 5.0) / 1.0), { size: 30, serif: true, it: true, color: LG.INK2, a });
        LG.rise(ctx, 'from surviving type 2 cells.', 150, 852, clamp((b - 5.3) / 1.0), { size: 30, serif: true, it: true, color: LG.INK2, a });
      }
    },
  };
})();
