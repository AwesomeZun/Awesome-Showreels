// spatial (2 bars): Fig. 1c and 1e. Opens on the UMAP exactly as the last scene left it; on beat 0 every nucleus
// leaves its UMAP position for its place in the tissue section (beats 0-2, staggered by distance so the section
// fills in from the injury niche outward). The section's frame, scale bar and the alveolar sac outlines draw on
// (beat 2); on beat 3 the injury niche is ringed (dashed) and everything but the niche's three cell types dims.
// Hold: panel e, the niche enrichment per cell type, bars growing one per eighth with the KRT8+ bar last and
// labelled 3.2x. Out (1 beat): cut to the dot plot.
(() => {
  const A = window.ATLAS;
  const R = A.SECTION_RECT;
  SCENES['spatial'] = {
    draw(ctx, t, env) {
      const P = env.palette, lt = env.lt, bs = env.beatSec, at = (b) => (lt - b * bs) / bs;
      ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
      const D = A.data(), [nx, ny, nr] = D.niche, [NX, NY] = A.spacePt(nx, ny), NR = nr / D.section[0] * R[2];
      const settle = clamp(at(2) * 1.5);
      A.chrome(ctx, env, 'Fig. 1 | A cell atlas of the repairing alveolus', 1);
      const isE = at(4.4) > 0;
      A.letter(ctx, 'c', 112, 196, 1);
      A.txt(ctx, 'The same nuclei in tissue · section 1.6 × 0.9 mm', 160, 194, { size: 24, weight: 600, color: P.ink, ls: -0.2, a: 1 });
      // the section: a pale tissue ground, then the frame
      const fr = Ease.outQuint(settle);
      if (fr > 0) {
        ctx.save(); ctx.globalAlpha *= fr;
        rr(ctx, R[0] - 6, R[1] - 6, R[2] + 12, R[3] + 12, 8); ctx.fillStyle = P.bg2; ctx.fill();
        ctx.strokeStyle = P.line; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.restore();
      }
      // alveolar sacs (drawn on) and the airway
      const sac = clamp(at(2) / 1.2);
      if (sac > 0) {
        ctx.save(); ctx.strokeStyle = rgba(P.muted, 0.35); ctx.lineWidth = 1;
        D.alveoli.forEach(([x, y, r], j) => {
          const q = clamp(sac * 1.6 - hash(j * 3.1) * 0.6); if (q <= 0) return;
          const [cx, cy] = A.spacePt(x, y), rr0 = r / D.section[0] * R[2];
          ctx.beginPath(); ctx.arc(cx, cy, rr0, -Math.PI / 2, -Math.PI / 2 + TAU * Ease.outC(q)); ctx.stroke();
        });
        const [ax, ay] = A.spacePt(250, 450), arx = 200 / D.section[0] * R[2];
        ctx.strokeStyle = rgba(P.muted, 0.5); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(ax, ay, arx, arx / 1.6, 0, 0, TAU * Ease.outC(sac)); ctx.stroke();
        A.txt(ctx, 'airway', ax, ay + 6, { size: 18, weight: 600, color: P.muted, align: 'center', a: sac, ls: 0.4 });
        ctx.restore();
      }
      // cells: UMAP -> tissue, the niche first; dim outside the niche types after beat 3
      const focus = Ease.ioC(clamp(at(3) * 1.4));
      A.cells(ctx, (i) => {
        const k = D.k[i], [ux, uy] = A.umapXY(i), [sx, sy] = A.spaceXY(i);
        const d = Math.hypot(D.sx[i] - nx, D.sy[i] - ny) / 900;
        const mv = Ease.ioC(clamp((at(0) - d * 0.8 - D.h[i] * 0.25) / 1.1));
        const lift = Math.sin(Math.PI * mv) * (40 + 60 * D.h[i]);
        const x = lerp(ux, sx, mv), y = lerp(uy, sy, mv) - lift;
        const hero = k === 1 || k === 5 || k === 7;
        const a = lerp(0.92, hero ? 0.95 : 0.16, focus);
        return [x, y, D.colors[k], a, lerp(3.4, 2.6, mv) + (k === 1 ? focus * 0.9 : 0)];
      });
      // niche ring (dashed, slow rotation) and its label
      const nk = Ease.outQuint(clamp(at(3) * 1.6));
      if (nk > 0) {
        ctx.save(); ctx.setLineDash([10, 8]); ctx.lineDashOffset = -lt * 14; ctx.strokeStyle = P.accent; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.ellipse(NX, NY, NR * 1.15 * lerp(1.3, 1, nk), NR * 0.95 * lerp(1.3, 1, nk), 0, 0, TAU); ctx.globalAlpha = nk; ctx.stroke();
        ctx.restore();
        A.halo(ctx, 'injury niche', NX, NY - NR * 0.95 - 26, { size: 22, weight: 700, color: P.accentInk, a: nk });
      }
      // scale bar
      if (settle > 0) {
        const L = 200 / D.section[0] * R[2], x0 = R[0] + R[2] - L - 18, y0 = R[1] + R[3] - 22;
        ctx.fillStyle = P.ink; ctx.globalAlpha = settle; ctx.fillRect(x0, y0, L, 4); ctx.globalAlpha = 1;
        A.txt(ctx, '200 µm', x0 + L / 2, y0 - 10, { size: 17, weight: 600, color: P.ink, align: 'center', a: settle, ls: 0 });
      }
      // panel e: enrichment in the niche (right column)
      const LX = 1400, y0 = 300, rowH = 66, maxV = 3.6, bw = W - 112 - LX - 70;
      const eIn = clamp(at(3.6) * 1.6);
      if (eIn > 0) {
        A.letter(ctx, 'e', LX, 252, eIn);
        A.txt(ctx, 'Enrichment in the niche', LX + 40, 250, { size: 21, weight: 600, color: P.ink, a: eIn, ls: -0.2 });
        // order: the others first, the hero last (it lands on the downbeat of the hold)
        const order = [0, 2, 6, 3, 4, 7, 5, 1];
        const x1 = LX + 74 + (bw - 74) / maxV;                                    // the 1x reference line
        ctx.fillStyle = P.line; ctx.fillRect(x1, y0 - 26, 1.5, rowH * order.length + 10);
        A.txt(ctx, '1×', x1, y0 + rowH * order.length + 6, { size: 16, weight: 600, color: P.muted, align: 'center', a: eIn, ls: 0 });
        order.forEach((k, j) => {
          const v = D.enrich[k], p = Ease.outQuint(clamp(at(4 + j * 0.42) * 1.8)), y = y0 + j * rowH;
          const c = D.clusters[k];
          A.txt(ctx, c.short, LX, y + 6, { size: 19, weight: k === 1 ? 700 : 500, color: k === 1 ? P.accentInk : P.ink2, a: eIn, ls: 0 });
          const bx = LX + 74, w = (bw - 74) * Math.min(v, maxV) / maxV * p;
          ctx.fillStyle = k === 1 ? P.accent : rgba(c.color, 0.55); rr(ctx, bx, y - 12, Math.max(0, w), 22, 3); ctx.fill();
          if (p > 0.6) A.txt(ctx, v.toFixed(1) + '×', bx + w + 10, y + 6, { size: k === 1 ? 24 : 17, weight: k === 1 ? 750 : 500, color: k === 1 ? P.accentInk : P.muted, a: (p - 0.6) / 0.4, ls: 0 });
        });
      }
    },
  };
})();
