// network (2 bars, 3 in the 30): the heatmap becomes the network (a match cut). Each sorted row collapses into a dot at
// its left end, and the sixty dots fly to the force layout computed in paper-src/simulate.py; edges draw in, strongest
// first, magenta where two knockouts change the same genes the same way and cyan where they oppose. Node colour is the
// programme, node size the number of links. The three hub nodes (TOX, NR4A1, ARID1A) light up with rings on the beat
// and their names; signals travel their edges. In the 30 the camera leans in on the hub.
(() => {
  const CX = 1180, CY = 590, R = 330;
  // the force layout scaled to the screen, then pushed apart until no two nodes sit closer than 42 px (deterministic)
  const SPREAD = new Map();
  function spread(D, zoom) {
    const key = zoom.toFixed(3); if (SPREAD.has(key)) return SPREAD.get(key);
    const hubI = D.hub.map(h => D.perts.indexOf(h)), hc = hubI.reduce((s, i) => [s[0] + D.pos[i][0] / 3, s[1] + D.pos[i][1] / 3], [0, 0]);
    const P = D.pos.map(([x, y]) => [CX + (x - hc[0] * (zoom - 1) / zoom) * R * zoom, CY + (y - hc[1] * (zoom - 1) / zoom) * R * zoom]);
    for (let it = 0; it < 240; it++) for (let a = 0; a < P.length; a++) for (let c = a + 1; c < P.length; c++) {
      let dx = P[c][0] - P[a][0], dy = P[c][1] - P[a][1];
      if (Math.hypot(dx, dy) < 0.5) { const th = hash(a * 31 + c) * TAU; dx = Math.cos(th); dy = Math.sin(th); }   // coincident: part them
      const d = Math.hypot(dx, dy), m = 42 * Math.sqrt(zoom);
      if (d < m) { const k = (m - d) / 2 / d; P[a][0] -= dx * k; P[a][1] -= dy * k; P[c][0] += dx * k; P[c][1] += dy * k; }
    }
    SPREAD.set(key, P); return P;
  }
  SCENES['network'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, n = Math.round(env.dur / B), long = n >= 12, lt = env.lt;
      const D = PS.data(), S = HEAT.slotOf(), N = D.perts.length;
      PS.bg(ctx); PS.chrome(ctx, 'c', 'Regulatory network from shared effects', 1);
      const col = Ease.ioC(clamp(b / 0.6));
      if (b < 1.2) HEAT.drawHeat(ctx, b, { fill: 60, bands: 1 - col, sort: () => 1, dendro: 1 - col, brackets: 1 - col, hub: 1 - col, collapse: col, a: 1 - clamp((b - 0.6) / 0.6) });
      // where each node is
      const fly = (r) => Ease.outExpo(clamp((b - 0.5 - (S[r] / 60) * 0.4) / 0.9));
      const zoom = long ? 1 + 0.32 * Ease.ioC(clamp((b - 8) / 1.5)) : 1;
      const hubI = D.hub.map(h => D.perts.indexOf(h)), hc = hubI.reduce((s, i) => [s[0] + D.pos[i][0] / 3, s[1] + D.pos[i][1] / 3], [0, 0]);
      const node = (r) => {
        const k = fly(r), sx = HEAT.X0, sy = HEAT.Y0 + (S[r] + 0.5) * HEAT.CH;
        const nx = CX + (D.pos[r][0] - hc[0] * (zoom - 1) / zoom) * R * zoom, ny = CY + (D.pos[r][1] - hc[1] * (zoom - 1) / zoom) * R * zoom;
        return [sx + (nx - sx) * k, sy + (ny - sy) * k, k];
      };
      const P = Array.from({ length: N }, (_, r) => node(r));
      const F = spread(D, zoom);                                          // the settled layout without overlaps
      for (let r = 0; r < N; r++) { const k = P[r][2]; P[r][0] += (F[r][0] - (CX + (D.pos[r][0] - hc[0] * (zoom - 1) / zoom) * R * zoom)) * k; P[r][1] += (F[r][1] - (CY + (D.pos[r][1] - hc[1] * (zoom - 1) / zoom) * R * zoom)) * k; }
      const deg = new Array(N).fill(0); D.edges.forEach(([a, c]) => { deg[a]++; deg[c]++; });
      // edges, strongest first
      const E = D.edges.slice().sort((p, q) => Math.abs(q[2]) - Math.abs(p[2]));
      const ek = clamp((b - 1.4) / 2);
      ctx.save(); ctx.lineCap = 'round';
      E.forEach(([a, c, r], i) => {
        const p = clamp(ek * E.length * 1.15 - i) ; if (p <= 0) return;
        const [ax, ay] = P[a], [cx, cy] = P[c], hub = hubI.includes(a) && hubI.includes(c);
        ctx.strokeStyle = rgba(r > 0 ? PS.MAG : PS.CYAN, (0.1 + Math.abs(r) * 0.35) * (hub ? 2 : 1)); ctx.lineWidth = hub ? 3 : 1 + (Math.abs(r) - 0.6) * 3;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + (cx - ax) * p, ay + (cy - ay) * p); ctx.stroke();
      });
      ctx.restore();
      // signals along the hub's edges
      if (b > 3.6) E.forEach(([a, c, r]) => {
        if (!(hubI.includes(a) || hubI.includes(c)) || Math.abs(r) < 0.75) return;
        const u = (lt * 0.9 + hash(a * 7 + c)) % 1, [ax, ay] = P[a], [cx, cy] = P[c];
        PS.glow(ctx, ax + (cx - ax) * u, ay + (cy - ay) * u, 14, r > 0 ? PS.MAG : PS.CYAN, 0.8);
      });
      // nodes
      const hk = clamp((b - 3.4) / 0.6), pulse = Math.exp(-((b % 1)) * 3.5);
      for (let r = 0; r < N; r++) {
        const [x, y, k] = P[r]; if (k <= 0 && b > 1.2) continue;
        const hub = hubI.includes(r), rad = (hub ? 15 : 4 + Math.min(5, deg[r] * 0.3)) * (0.4 + 0.6 * k);
        if (hub && hk > 0) { PS.glow(ctx, x, y, 46 * hk, PS.MAG, 0.55 * hk); ctx.strokeStyle = rgba(PS.MAG, (1 - pulse) * hk * 0.9); ctx.lineWidth = 2; circle(ctx, x, y, rad + 6 + 22 * pulse); ctx.stroke(); }
        ctx.fillStyle = PS.PROG[D.module[r]]; circle(ctx, x, y, rad); ctx.fill();
        if (hub && hk > 0) { ctx.fillStyle = rgba('#FFF1F2', hk); circle(ctx, x, y, rad * 0.45); ctx.fill(); ctx.strokeStyle = rgba('#FDF4FF', hk); ctx.lineWidth = 2.5; circle(ctx, x, y, rad); ctx.stroke(); }
        if (hub && hk > 0) {                                                // names fanned out on leaders, never on top of each other
          const j = hubI.indexOf(r), lx = 1640, ly = 470 + j * 64, e = Ease.outExpo(hk);
          ctx.strokeStyle = rgba('#F5D0FE', 0.7 * hk); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (lx - 14 - x) * e, y + (ly - 8 - y) * e); ctx.stroke();
          PS.txt(ctx, D.perts[r], lx, ly, { size: 28, mono: true, weight: 600, color: '#F5D0FE', a: hk, glow: rgba(PS.MAG, 0.6) });
        }
      }
      // the left column
      PS.rise(ctx, 'Knockouts that change', 110, 250, (b - 1.4) / 0.6, { size: 34, weight: 600 });
      PS.rise(ctx, 'the same genes are linked.', 110, 296, (b - 1.6) / 0.6, { size: 34, weight: 600 });
      const lk = clamp((b - 2) / 0.6);
      if (lk > 0) {
        ctx.lineWidth = 3; ctx.strokeStyle = rgba(PS.MAG, lk); ctx.beginPath(); ctx.moveTo(110, 350); ctx.lineTo(160, 350); ctx.stroke();
        PS.txt(ctx, 'same direction', 176, 357, { size: 20, color: C.ink2, a: lk });
        ctx.strokeStyle = rgba(PS.CYAN, lk); ctx.beginPath(); ctx.moveTo(110, 386); ctx.lineTo(160, 386); ctx.stroke();
        PS.txt(ctx, 'opposite', 176, 393, { size: 20, color: C.ink2, a: lk });
        ['exhaustion drivers', 'effector', 'memory', 'cell cycle', 'stress'].forEach((s, i) => { ctx.fillStyle = rgba(PS.PROG[i], lk); circle(ctx, 118, 446 + i * 32, 7); ctx.fill(); PS.txt(ctx, s, 136, 453 + i * 32, { size: 19, color: C.ink2, a: lk }); });
      }
      PS.rise(ctx, 'A hub of three holds', 110, 700, (b - 3.6) / 0.6, { size: 34, weight: 600, color: PS.MAG });
      PS.rise(ctx, 'exhaustion in place.', 110, 746, (b - 3.8) / 0.6, { size: 34, weight: 600, color: PS.MAG });
      PS.vignette(ctx, 0.3);
    },
  };
})();
