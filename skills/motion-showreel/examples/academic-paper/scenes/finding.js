// finding (2 bars, end card): the claim, as big as the data allows. The KRT8+ nuclei from the niche come back as a
// slowly orbiting cluster on the right (their tissue positions, magnified, breathing); the number counts up to 3.2x
// on beat 1 in the accent, the sentence rises under it (2), the hedge line in the serif (2.5), and the citation
// block with the fictional-data notice settles at the foot (3). Hold: the cluster keeps drifting; nothing else moves.
(() => {
  const A = window.ATLAS;
  let NICHE = null;
  SCENES['finding'] = {
    draw(ctx, t, env) {
      const P = env.palette, lt = env.lt, bs = env.beatSec, at = (b) => (lt - b * bs) / bs;
      ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
      const D = A.data(), [nx, ny, nr] = D.niche;
      if (!NICHE) { NICHE = []; for (let i = 0; i < D.n; i++) { const d = Math.hypot(D.sx[i] - nx, D.sy[i] - ny); if (d < nr * 1.25) NICHE.push(i); } }
      // the niche, magnified 2.2x around (1470, 540), rotating very slowly; KRT8+ in full colour, the rest grey
      const CX = 1470, CY = 540, S = 2.2, rot = lt * 0.05, c = Math.cos(rot), s = Math.sin(rot), inK = Ease.outC(clamp(at(0) * 1.2));
      ctx.save(); ctx.globalAlpha = 0.9;
      for (const i of NICHE) {
        const dx = (D.sx[i] - nx) * S, dy = (D.sy[i] - ny) * S, x = CX + dx * c - dy * s, y = CY + dx * s + dy * c;
        const k = D.k[i], b = Math.sin(t * 0.8 + i) * 2, hero = k === 1;
        const sp = A.dot(hero ? D.colors[1] : (k === 5 || k === 7 ? toHex(mix(D.colors[k], '#FFFFFF', 0.45)) : '#D3D8E0'), hero ? 7 : 5);
        ctx.globalAlpha = inK * (hero ? 0.95 : 0.7) * clamp(1.4 - Math.hypot(dx, dy) / (nr * S * 1.2));
        ctx.drawImage(sp.c, x - sp.R, y - sp.R + b, sp.R * 2, sp.R * 2);
      }
      ctx.restore();
      ctx.save(); ctx.setLineDash([12, 10]); ctx.lineDashOffset = -lt * 10; ctx.strokeStyle = rgba(P.accent, 0.6 * inK); ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(CX, CY, nr * S * 1.1, nr * S * 0.9, rot, 0, TAU); ctx.stroke(); ctx.restore();
      A.chrome(ctx, env, 'Halden et al. 2026', 1);
      // the number
      const n = clamp(at(1) / 1.2);
      if (n > 0) {
        const v = (3.2 * Ease.outQuint(n)).toFixed(1);
        A.rise(ctx, v + '×', 104, 470, clamp(at(1) * 3), { size: 260, weight: 780, color: P.accent, ls: -10 });
      }
      A.rise(ctx, 'KRT8⁺ transitional cells gather', 112, 590, clamp(at(2) * 2), { size: 54, weight: 680, color: P.ink, ls: -1.2 });
      A.rise(ctx, 'at the injury niche.', 112, 654, clamp(at(2.2) * 2), { size: 54, weight: 680, color: P.ink, ls: -1.2 });
      A.rise(ctx, 'Repair stalls where CTHRC1⁺ fibroblasts and SPP1⁺ macrophages crowd in.', 112, 716, clamp(at(2.5) * 2), { size: 26, weight: 400, fam: 'S', color: P.ink2, ls: 0 });
      // citation block
      const cb = clamp(at(3) * 1.6);
      if (cb > 0) {
        ctx.fillStyle = P.line; ctx.fillRect(112, 880, (W - 224) * Ease.outQuint(cb), 1);
        A.txt(ctx, 'Halden, M. K., Seo, J., Ferreira, A. P., Lindqvist, T. & Adeyemi, R. O.  A spatial multiome atlas of human alveolar repair', 112, 924, { size: 19, weight: 400, fam: 'S', color: P.ink2, a: cb, ls: 0 });
        A.txt(ctx, 'resolves a KRT8⁺ transitional niche.  Article, 2026.', 112, 952, { size: 19, weight: 400, fam: 'S', color: P.ink2, a: cb, ls: 0 });
        A.txt(ctx, 'FICTIONAL MANUSCRIPT · ILLUSTRATIVE DATA', W - 112, 1010, { size: 15, weight: 650, color: P.muted, align: 'right', a: cb, ls: 1.5 });
      }
    },
  };
})();
