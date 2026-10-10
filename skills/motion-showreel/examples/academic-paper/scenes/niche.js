// niche (2 bars): Fig. 1c and 1e, back in the tissue. Every nucleus flies home from the UMAP to its place in the
// section, in its type's colour now, as the camera settles level over the tissue and the section fades in under
// them. The camera closes in on the injury: a dashed ring at 175 um draws round it, everything but the niche's three
// types (KRT8+ transitional cells, fibroblasts, macrophages) dims, and the transitional cells swell a little. On the
// right, panel e: enrichment inside the ring for each type, bars growing against a dashed line at 1x, the KRT8+ bar
// last and labelled 3.2x. The caption gives the claim with its numbers.
(() => {
  SCENES['niche'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, d = LG.data(), from = LG.prev(env) === 'markers' ? 16 : 8;
      const home = Ease.ioC(clamp(b / 2.6)), close = Ease.ioC(clamp((b - 2.8) / 1.6)), nw = [(d.niche[0] - 800) / LG.UM, -(d.niche[1] - 450) / LG.UM, 0];
      const flat = { dist: 31, target: [0, 0, 0] }, near = { dist: 17, target: nw, cx: 640, cy: 560 };
      const cam = LG.camera(LG.lerpCam(LG.lerpCam(SCENES['umap'].orbit(from), flat, home), near, close));
      const keep = (k) => k === 1 || k === 5 || k === 7;
      LG.bg(ctx, t, { air: 0.5 - 0.2 * home, px: b * 4 });
      LG.section(ctx, cam, clamp((b - 1.4) / 1.2), t);
      // the ring
      const ra = clamp((b - 3.4) / 0.9);
      if (ra > 0) {
        const c = cam.project(nw), r = d.niche[2] * c[3] / LG.UM;
        ctx.save(); ctx.strokeStyle = rgba(LG.INK, 0.8); ctx.lineWidth = 3; ctx.setLineDash([10, 10]); ctx.lineDashOffset = -t * 20; ctx.beginPath(); ctx.arc(c[0], c[1], r, -Math.PI / 2, -Math.PI / 2 + TAU * Ease.ioC(ra)); ctx.stroke(); ctx.restore();
        LG.pill(ctx, '175 µm', c[0] + r * 0.72, c[1] - r * 0.72 - 30, clamp((b - 4.0) / 0.5), { size: 22 });
      }
      const dim = clamp((b - 3.6) / 0.8);
      LG.cloud(ctx, cam, (i, c) => { const k = Ease.ioC(clamp((b - 0.1 - 1.2 * hash(i * 5.9)) / 1.4)), U = LG.umapW(c), T = LG.tissueW(c); return [LG.lerp(U[0], T[0], k), LG.lerp(U[1], T[1], k), LG.lerp(U[2], T[2], k) + Math.sin(Math.PI * k) * 1.5]; },
        (i, c) => ({ color: LG.colOf(c[0]), a: keep(c[0]) ? 1 : 1 - 0.78 * dim, r: c[0] === 1 ? 0.085 + 0.03 * dim : 0.085 }), { shadow: 0.5 * home });
      // panel e: enrichment inside the ring
      const ek = clamp((b - 4.3) / 0.6), x0 = 1230, y0 = 210, cw = 600, ch = 640;
      LG.card(ctx, x0, y0, cw, ch, ek);
      if (ek > 0) {
        LG.panel(ctx, 'e', 'Enrichment in the niche', x0 + 34, y0 + 58, clamp(ek * 2));
        const order = d.clusters.map((c, k) => k).sort((a, z) => d.enrich[z] - d.enrich[a]), bx = x0 + 230, bw = 300, sc = bw / 3.6;
        ctx.save(); ctx.strokeStyle = rgba(LG.INK, 0.5 * ek); ctx.setLineDash([5, 6]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(bx + sc, y0 + 100); ctx.lineTo(bx + sc, y0 + ch - 70); ctx.stroke(); ctx.restore();
        LG.txt(ctx, '1×', bx + sc, y0 + ch - 40, { size: 18, color: LG.MUTED, align: 'center', a: ek });
        order.forEach((k, j) => {
          const y = y0 + 120 + j * 60, cl = d.clusters[k], g = Ease.outExpo(clamp((b - 4.6 - (7 - j) * 0.14) / 0.7)), v = d.enrich[k];
          LG.txt(ctx, cl.short === 'KRT8+' ? 'KRT8⁺' : cl.label, bx - 20, y + 8, { size: 21, align: 'right', weight: k === 1 ? 700 : 500, a: ek });
          ctx.fillStyle = rgba(cl.color, 0.9); rr(ctx, bx, y - 12, Math.max(3, v * sc * g), 26, 8); ctx.fill();
          if (g > 0.6) LG.txt(ctx, v.toFixed(1) + '×', bx + v * sc * g + 12, y + 8, { size: k === 1 ? 26 : 20, weight: k === 1 ? 800 : 500, color: k === 1 ? LG.CORAL : LG.INK2, a: clamp((g - 0.6) * 3) });
        });
      }
      LG.panel(ctx, 'c', 'Back in the tissue: every nucleus in its place', 120, 86, clamp((b - 1.6) / 0.5) * (1 - clamp((b - 3.0) / 0.5)));
      LG.caption(ctx, 'KRT8⁺ transitional cells are 3.2-fold enriched within 175 µm of injury.', clamp((b - 5.4) / 1.0));
      LG.motes(ctx, t, 0.6, b * 8);
    },
  };
})();
