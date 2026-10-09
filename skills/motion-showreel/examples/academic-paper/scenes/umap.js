// umap (2 bars): Fig. 1a then 1b. The dissociated cells from the title page fly into their UMAP positions
// (beats 0-2, staggered by a per-cell hash so clusters condense out of the field rather than marching); the panel
// letter, axis arrows and the legend arrive with them; cluster names land on the plot one per eighth (2-3.75).
// Hold (from beat 4): panel b. Everything outside the epithelium dims; the AT2 -> KRT8+ -> AT1 continuum recolours
// by pseudotime in a sweep from its root, and the trajectory arrow draws along it with a colour bar. Out: the
// pseudotime colours give way to cell types again (the next scene starts from this exact frame).
(() => {
  const A = window.ATLAS;
  SCENES['umap'] = {
    draw(ctx, t, env) {
      const P = env.palette, lt = env.lt, bs = env.beatSec, at = (b) => (lt - b * bs) / bs, ph = env.phase;
      ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
      const D = A.data(), t0 = t - lt;                                         // scene start in reel time
      const bMode = Ease.ioC(clamp(at(4) * 1.2)) * (1 - Ease.ioC(ph.out));     // 0 = cell types, 1 = pseudotime
      A.chrome(ctx, env, 'Fig. 1 | A cell atlas of the repairing alveolus', 1);
      A.letter(ctx, bMode > 0.5 ? 'b' : 'a', 112, 196, 1);
      A.txt(ctx, bMode > 0.5 ? 'Pseudotime along the repair trajectory' : 'Nuclei coloured by cell type', 160, 194, { size: 24, weight: 600, color: P.ink, ls: -0.2 });
      A.axes(ctx, 150, 950, 80, clamp(at(0.5) * 1.5));
      const sweep = clamp(at(4.2) / 2.2);                                       // how far the pseudotime colour has run
      A.cells(ctx, (i) => {
        const k = D.k[i], fly = Ease.ioC(clamp(at(D.h[i] * 0.9) / 1.3));
        const [sx, sy] = A.scatterXY(i, t0), [ux, uy] = A.umapXY(i);
        // a curved flight: lift sideways a little, so streams cross instead of sliding in straight lines
        const mx = (sx + ux) / 2 + (D.h[i] - 0.5) * 160, my = (sy + uy) / 2 - 60 * (1 - Math.abs(D.h[i] - 0.5));
        const x = (1 - fly) * (1 - fly) * sx + 2 * (1 - fly) * fly * mx + fly * fly * ux, y = (1 - fly) * (1 - fly) * sy + 2 * (1 - fly) * fly * my + fly * fly * uy;
        const epi = k <= 2, pt = D.pt[i];
        let col = D.colors[k], a = 0.9;
        if (bMode > 0) {
          if (!epi) a = lerp(0.9, 0.1, bMode);
          else if (pt <= sweep * 1.05) col = A.ptColor(pt);
          else col = toHex(mix(D.colors[k], '#D5DAE2', 0.7 * bMode));
        }
        const br = fly >= 1 ? 1.2 : 0;                                         // settled cells breathe a little
        return [x + br * Math.sin(t * 1.3 + D.h[i] * 40), y + br * Math.cos(t * 1.1 + D.h[i] * 23), col, a, 3.1 + 0.5 * fly];
      });
      // cluster names on the plot (white halo), one per eighth
      D.clusters.forEach((c, k) => {
        const p = clamp(at(2 + k * 0.25) * 3), [cx, cy] = A.umapPt(D.cen[k][0], D.cen[k][1]);
        const dim = k <= 2 ? 1 : 1 - 0.8 * bMode;
        const off = { 0: [-30, -86], 1: [0, -70], 2: [40, -78], 3: [-20, 64], 4: [0, 70], 5: [0, 62], 6: [0, 76], 7: [0, 58] }[k];
        if (p > 0) A.halo(ctx, c.short, cx + off[0], cy + off[1] + (1 - Ease.outQuint(p)) * 10, { size: 21, weight: 650, color: k === 1 ? P.accentInk : P.ink, a: p * dim });
      });
      // legend (right column): swatch, name, nucleus count
      const LX = 1330;
      D.clusters.forEach((c, k) => {
        const p = Ease.outQuint(clamp(at(0.8 + k * 0.12) * 2)), y = 230 + k * 50;
        if (p <= 0) return;
        const dim = bMode > 0 && k > 2 ? 1 - 0.65 * bMode : 1;
        ctx.save(); ctx.globalAlpha *= p * dim;
        ctx.fillStyle = c.color; circle(ctx, LX + 10, y - 7, 9); ctx.fill();
        A.txt(ctx, c.label, LX + 34, y, { size: 22, weight: k === 1 ? 650 : 500, color: P.ink, ls: -0.1 });
        A.txt(ctx, (Math.round(c.n * 84.25)).toLocaleString('en-US'), W - 112, y, { size: 20, weight: 500, color: P.muted, align: 'right', ls: 0 });
        ctx.restore();
      });
      const tot = clamp(at(1.6) * 1.2);
      if (tot > 0) {
        ctx.fillStyle = P.line; ctx.fillRect(LX, 640, W - 112 - LX, 1);
        A.txt(ctx, 'Nuclei', LX, 680, { size: 20, weight: 500, color: P.muted, a: tot, ls: 0 });
        A.txt(ctx, Math.round(412806 * Ease.outQuint(tot)).toLocaleString('en-US'), W - 112, 680, { size: 22, weight: 650, color: P.ink, align: 'right', a: tot, ls: 0 });
        A.txt(ctx, 'Donors', LX, 716, { size: 20, weight: 500, color: P.muted, a: tot, ls: 0 });
        A.txt(ctx, '14', W - 112, 716, { size: 22, weight: 650, color: P.ink, align: 'right', a: tot, ls: 0 });
      }
      // panel b: the trajectory arrow along the continuum and a pseudotime colour bar
      if (bMode > 0.01) {
        const dp = Ease.ioC(clamp(at(4.4) / 2));
        const pts = []; for (let i = 0; i <= 60; i++) { const u = 0.03 + 0.94 * i / 60, q = A.arcUMAP(u); pts.push(A.umapPt(q[0], q[1])); }
        ctx.save(); ctx.globalAlpha *= bMode; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 11; polyStroke(ctx, pts, dp); ctx.stroke();
        ctx.strokeStyle = P.ink; ctx.lineWidth = 4; polyStroke(ctx, pts, dp); ctx.stroke();
        if (dp > 0.05) {
          const n = Math.max(1, Math.floor(dp * 60)), a = pts[n - 1], b = pts[n], ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
          ctx.save(); ctx.translate(b[0], b[1]); ctx.rotate(ang); ctx.fillStyle = P.ink; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-12, -10); ctx.lineTo(-12, 10); ctx.closePath(); ctx.fill(); ctx.restore();
        }
        // in the hold, a light runs along the trajectory once per bar, AT2 -> AT1
        const cm = ((lt - 6.4 * bs) / (4 * bs)) % 1;
        if (lt > 6.4 * bs && dp >= 1) {
          for (let k = 0; k < 14; k++) {
            const u = clamp(cm - k * 0.012), q = pts[Math.min(60, Math.floor(u * 60))];
            ctx.globalAlpha = bMode * (1 - k / 14) * 0.9; ctx.fillStyle = k ? A.ptColor(u) : '#FFFFFF';
            circle(ctx, q[0], q[1], 9 - k * 0.5); ctx.fill();
          }
          ctx.globalAlpha = bMode;
        }
        // colour bar under the legend
        const cb = clamp(at(4.6) * 1.5), y = 790;
        A.txt(ctx, 'Pseudotime', LX, y, { size: 20, weight: 600, color: P.ink, a: cb, ls: 0 });
        for (let i = 0; i < 100; i++) { if (i / 100 > cb) break; ctx.fillStyle = A.ptColor(i / 99); ctx.fillRect(LX + i * ((W - 112 - LX) / 100), y + 16, (W - 112 - LX) / 100 + 0.6, 14); }
        A.txt(ctx, 'AT2', LX, y + 58, { size: 18, weight: 600, color: P.muted, a: cb, ls: 0 });
        A.txt(ctx, 'KRT8⁺', (LX + W - 112) / 2, y + 58, { size: 18, weight: 650, color: P.accentInk, align: 'center', a: cb, ls: 0 });
        A.txt(ctx, 'AT1', W - 112, y + 58, { size: 18, weight: 600, color: P.muted, align: 'right', a: cb, ls: 0 });
        ctx.restore();
      }
    },
  };
})();
