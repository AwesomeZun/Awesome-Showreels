// title (2 bars): the article's first page as a modern journal sets it. Running head and the ARTICLE tag tick in
// (beat 0); the title rises line by line out of a mask (beats 1-2.5), the author line and affiliations follow
// (3-3.5), then the first sentence of the abstract. On the right the 4,900 dissociated nuclei of the atlas hang in
// a loose field, drifting, all one neutral grey: from beat 4 their identities light up type by type (the colours of
// Fig. 1a), which is what the next scene sorts. Out: the text column slides away; the cells stay (match cut).
(() => {
  const A = window.ATLAS;
  const TITLE = ['A spatial multiome atlas', 'of human alveolar repair', 'resolves a KRT8⁺', 'transitional niche'];
  SCENES['title'] = {
    draw(ctx, t, env) {
      const P = env.palette, lt = env.lt, bs = env.beatSec, at = (b) => (lt - b * bs) / bs, ph = env.phase;
      ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
      const D = A.data(), outE = Ease.inQ(ph.out);
      // the dissociated cells: neutral first, identity colour arrives cluster by cluster (beats 4-5.5)
      A.cells(ctx, (i) => {
        const [x, y] = A.scatterXY(i, t), k = D.k[i];
        const appear = clamp(at(0.3 + D.h[i] * 2.2) * 2);
        const id = Ease.outC(clamp(at(4 + k * 0.18 + D.h[i] * 0.25) * 2.5));
        return [x, y, id > 0.5 ? D.colors[k] : '#B8BEC8', appear * (0.55 + 0.45 * id), 3.0];
      });
      ctx.save(); ctx.translate(-outE * 160, 0); ctx.globalAlpha *= 1 - outE;
      // a soft white column behind the text so dots never fight the type
      ctx.fillStyle = linear(ctx, 0, 0, 1060, 0, [[0, 'rgba(255,255,255,1)'], [0.82, 'rgba(255,255,255,0.96)'], [1, 'rgba(255,255,255,0)']]);
      ctx.fillRect(0, 0, 1060, H);
      A.chrome(ctx, env, 'Published 9 October 2026', Ease.outQuint(clamp(at(0) * 2)));
      // tags row
      const tg = Ease.outQuint(clamp(at(0.5) * 2));
      if (tg > 0) {
        ctx.save(); ctx.globalAlpha *= tg;
        rr(ctx, 112, 196, 112, 34, 17); ctx.fillStyle = P.accent; ctx.fill();
        A.txt(ctx, 'Article', 168, 219, { size: 17, weight: 650, color: '#FFFFFF', align: 'center', ls: 0.2 });
        rr(ctx, 236, 196, 136, 34, 17); ctx.strokeStyle = P.line; ctx.lineWidth = 1.5; ctx.stroke();
        A.txt(ctx, 'Open access', 304, 219, { size: 17, weight: 550, color: P.ink2, align: 'center', ls: 0.2 });
        A.txt(ctx, 'Single-cell genomics · Spatial transcriptomics', 392, 219, { size: 17, weight: 500, color: P.muted, ls: 0 });
        ctx.restore();
      }
      TITLE.forEach((ln, i) => A.rise(ctx, ln, 108, 340 + i * 84, clamp(at(1 + i * 0.4) * 1.6), { size: 74, weight: 680, color: P.ink, ls: -1.8 }));
      // highlight the hero term once the title is set
      const hl = Ease.outQuint(clamp(at(2.9) * 2));
      if (hl > 0) {
        ctx.save(); ctx.font = font(74, 680, 'P'); if ('letterSpacing' in ctx) ctx.letterSpacing = '-1.8px';
        const x0 = 108 + ctx.measureText('resolves a ').width, w = ctx.measureText('KRT8⁺').width;
        ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = P.highlight; ctx.fillRect(x0 - 8, 508 - 60, (w + 16) * hl, 78);
        ctx.fillStyle = P.accent; ctx.fillRect(x0 - 8, 508 + 14, (w + 16) * hl, 4);
        ctx.restore();
      }
      A.rise(ctx, 'Mira K. Halden, Joon-ho Seo, Ana P. Ferreira, Tomas Lindqvist & Ruth O. Adeyemi', 112, 712, clamp(at(3) * 2), { size: 24, weight: 400, fam: 'S', color: P.ink2, ls: 0 });
      A.rise(ctx, 'Institute for Lung Regeneration · Spatial Omics Core', 112, 750, clamp(at(3.25) * 2), { size: 18, weight: 500, color: P.muted, ls: 0 });
      const ab = clamp(at(3.6) * 1.5);
      if (ab > 0) {
        ctx.fillStyle = P.line; ctx.fillRect(112, 800, 820 * Ease.outQuint(ab), 1);
        A.rise(ctx, 'Abstract', 112, 846, ab, { size: 17, weight: 700, color: P.ink, ls: 1.2 });
        ['Paired snRNA + ATAC profiles of 412,806 nuclei from 14 donors, aligned to', 'subcellular spatial maps, resolve an AT2 → AT1 repair trajectory that stalls', 'in a KRT8⁺ transitional state at the injury niche.']
          .forEach((l, j) => A.rise(ctx, l, 112, 884 + j * 34, clamp(at(3.8 + j * 0.15) * 2), { size: 22, weight: 400, fam: 'S', color: P.ink2, ls: 0 }));
      }
      ctx.restore();
    },
  };
})();
