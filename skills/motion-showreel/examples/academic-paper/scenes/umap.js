// umap (2 bars, 3 in the 30): Fig. 1a then 1b. The lifted nuclei fly into a three-dimensional UMAP (each on its own
// clock and a slight arc), turning from grey to their cell type's colour as they land, while the camera swings from
// the tilted tissue view into a slow orbit. A small axis triad, the panel label and a pill per cluster arrive. Then
// the repair path: everything outside the AT2, KRT8+ and AT1 continuum fades back, the continuum recolours by
// pseudotime (AT2 blue through coral to AT1 teal), and a lit path with travelling beads runs along it from AT2 to AT1,
// with a colour bar. The caption: AT2 cells become AT1 cells through a KRT8+ transitional state.
(() => {
  const arcP = (s) => { const a = Math.PI * (0.95 - 0.9 * s); return [-1.6 + 7.4 * Math.cos(a), 1.2 + 3.0 * Math.sin(a) - 1.2 * s, 2.4 * Math.sin(Math.PI * s) - 0.9]; };
  const ptCol = (s) => s < 0.5 ? toHex(mix('#2F6FDB', '#E8553A', s * 2)) : toHex(mix('#E8553A', '#13A39A', (s - 0.5) * 2));
  let CEN = null;
  function centroids() {
    if (CEN) return CEN; const d = LG.data(), acc = d.clusters.map(() => [0, 0, 0, 0]);
    d.cells.forEach(c => { const p = LG.umapW(c), q = acc[c[0]]; q[0] += p[0]; q[1] += p[1]; q[2] += p[2]; q[3]++; });
    return (CEN = acc.map(q => [q[0] / q[3], q[1] / q[3], q[2] / q[3]]));
  }
  const CL = { pitch: 0.9, yaw: -0.35, dist: 34, target: [0, 0, 1.5] };
  SCENES['umap'] = {
    orbit: (b) => ({ pitch: 0.28, yaw: 0.42 + 0.035 * b, dist: 31.5, target: [0.4, 0.2, 0], cx: 860 }),
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, n = Math.round(env.dur / B);
      const d = LG.data(), fly = Ease.ioC(clamp(b / 3.0)), cam = LG.camera(LG.lerpCam(CL, SCENES['umap'].orbit(b), fly));
      const tr = Ease.ioC(clamp((b - 4.6) / 1.2));
      LG.bg(ctx, t, { air: 0.6, px: b * 5 });
      LG.cloud(ctx, cam, (i, c) => {
        const k = Ease.ioC(clamp((b - 0.1 - 1.3 * hash(i * 7.1)) / 1.6)), A = LG.tissueW(c), U = LG.umapW(c);
        A[2] = LG.liftOf(i); return [LG.lerp(A[0], U[0], k), LG.lerp(A[1], U[1], k) + Math.sin(Math.PI * k) * 1.2, LG.lerp(A[2], U[2], k) + Math.sin(Math.PI * k) * 2];
      }, (i, c) => {
        const k = clamp((b - 0.9 - 1.3 * hash(i * 7.1)) / 1.0), epi = c[0] <= 2, base = LG.colOf(c[0]);
        if (tr > 0) return epi ? { color: base, color2: ptCol(c[5]), mix: tr, r: 0.085 + 0.02 * tr } : { color: base, a: 1 - 0.8 * tr, r: 0.085 };
        return { color: LG.GREY, color2: base, mix: k, r: 0.085 };
      });
      // the repair path, lit, with beads running from AT2 to AT1
      if (tr > 0) {
        const pts = Array.from({ length: 61 }, (_, j) => cam.project(arcP(j / 60).map((v, m) => (v - [-0.6, -1.4, 0.6][m]) * 1.08)));
        const dk = clamp((b - 5.0) / 1.4), last = Math.max(2, Math.floor(dk * 60) + 1);
        ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (const [w, col] of [[18, 'rgba(255,255,255,0.55)'], [6, 'rgba(31,36,51,0.85)']]) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); pts.slice(0, last).forEach((p, j) => (j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); }
        if (dk >= 1) { const p = pts[60], q = pts[56], ang = Math.atan2(p[1] - q[1], p[0] - q[0]); ctx.fillStyle = LG.INK; ctx.beginPath(); ctx.moveTo(p[0] + Math.cos(ang) * 16, p[1] + Math.sin(ang) * 16); ctx.lineTo(p[0] + Math.cos(ang + 2.5) * 16, p[1] + Math.sin(ang + 2.5) * 16); ctx.lineTo(p[0] + Math.cos(ang - 2.5) * 16, p[1] + Math.sin(ang - 2.5) * 16); ctx.fill(); }
        for (let j = 0; j < 6; j++) { const s = ((t * 0.18 + j / 6) % 1) * dk, p = pts[Math.round(s * 60)]; ctx.fillStyle = '#FFFFFF'; circle(ctx, p[0], p[1], 7); ctx.fill(); ctx.fillStyle = ptCol(s); circle(ctx, p[0], p[1], 4.5); ctx.fill(); }
        ctx.restore();
        // the colour bar
        const ba = clamp((b - 5.2) / 0.6); LG.card(ctx, 1520, 300, 300, 150, ba);
        if (ba > 0) { ctx.globalAlpha = ba; ctx.fillStyle = linear(ctx, 1550, 0, 1790, 0, [[0, '#2F6FDB'], [0.5, '#E8553A'], [1, '#13A39A']]); rr(ctx, 1550, 370, 240, 16, 8); ctx.fill(); ctx.globalAlpha = 1; LG.txt(ctx, 'pseudotime', 1550, 350, { size: 22, weight: 600, a: ba }); [['AT2', 1550, 'left'], ['KRT8⁺', 1670, 'center'], ['AT1', 1790, 'right']].forEach(([s, x, al]) => LG.txt(ctx, s, x, 420, { size: 20, color: LG.INK2, align: al, a: ba })); }
      }
      // labels: one pill per cluster, over its centroid
      const C = centroids();
      d.clusters.forEach((cl, k) => { const p = cam.project(C[k]), a = clamp((b - 2.4 - k * 0.16) / 0.5) * (k <= 2 ? 1 : 1 - 0.7 * tr); LG.pill(ctx, cl.short === 'KRT8+' ? 'KRT8⁺' : cl.label, p[0], p[1] - 70, a, { dot: cl.color, size: 22 }); });
      // panel label and the axis triad
      const pa = clamp((b - 1.4) / 0.5); LG.panel(ctx, tr > 0.5 ? 'b' : 'a', tr > 0.5 ? 'The repair trajectory (pseudotime)' : 'Cell types, 4,900 nuclei (UMAP, three axes)', 120, 86, pa);
      const o = [-10.5, -5.2, -3], ax = [[2.4, 0, 0, 'UMAP 1'], [0, 2.4, 0, 'UMAP 2'], [0, 0, 2.4, 'UMAP 3']], O = cam.project(o);
      ctx.save(); ctx.globalAlpha = pa; ctx.strokeStyle = LG.INK2; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ax.forEach(([x, y, z, s]) => { const Q = cam.project([o[0] + x, o[1] + y, o[2] + z]); ctx.beginPath(); ctx.moveTo(O[0], O[1]); ctx.lineTo(Q[0], Q[1]); ctx.stroke(); LG.txt(ctx, s, Q[0] + 6, Q[1] - 6, { size: 18, weight: 600, color: LG.INK2 }); });
      ctx.restore();
      LG.caption(ctx, 'AT2 cells become AT1 cells through a KRT8⁺ transitional state.', clamp((b - 5.6) / 1.0));
      LG.motes(ctx, t, 0.7, b * 8);
    },
  };
})();
