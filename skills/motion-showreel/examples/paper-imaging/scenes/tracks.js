// tracks (2 bars): 6 to 24 hours in one sweep. The clock runs and every one of the 4,812 cells moves along its own path
// (Catmull-Rom through the six time points): the cap of cells spreads over the yolk, gathers on the dorsal side and
// stretches into a body, its tail lifting off. Nine hundred of the tracks draw on behind their cells in their lineage's
// colour, with light pulsing along them; at 8 hpf the notochord's tracks flare once, the moment its precursors commit.
// The camera turns slowly to follow the axis.
(() => {
  let TR = null;
  function trails() {
    if (TR) return TR;
    const d = LS.data(), S = 36, segs = [], U = [], cols = [];
    for (const c of d.tracks) {
      const dim = d.lineage[c] === 3 ? 0.4 : 1, col = parseColor(LS.LINC[d.lineage[c]]).slice(0, 3).map(v => v / 255 * dim), pts = [];   // skin quieter, so the axis reads
      for (let k = 0; k <= S; k++) { const t = 6 + 18 * k / S, P = LS.at(t); pts.push([P[c * 3], P[c * 3 + 1], P[c * 3 + 2]]); }
      for (let k = 0; k < S; k++) { segs.push(pts[k], pts[k + 1]); U.push(k / S, (k + 1) / S); cols.push(col); }
    }
    const m = segs.length / 2, s = new Float32Array(m * 6), u = new Float32Array(U), c0 = new Float32Array(m * 3);
    for (let i = 0; i < m; i++) { s.set(segs[i * 2], i * 6); s.set(segs[i * 2 + 1], i * 6 + 3); c0.set(cols[i], i * 3); }
    const noto = []; d.tracks.forEach((c, j) => { if (d.lineage[c] === 0) for (let k = 0; k < S; k++) noto.push(j * S + k); });
    TR = { all: GL.lines(s, { u, colors: c0 }), notoSegs: noto };
    return TR;
  }
  SCENES['tracks'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, n = Math.round(env.dur / B), lt = env.lt;
      const hpf = 6 + 18 * Ease.ioSine(clamp((b - 0.3) / (n - 1.2))), CL = LS.clouds(), pos = LS.at(hpf);
      const cam = LS.cam({ yaw: 0.45 + 0.45 * clamp(b / n), pitch: 0.3, dist: 4.6, shiftX: 0.08 });
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      CL.lin.setPositions(pos);
      const flare = Math.exp(-Math.pow((hpf - 8) / 0.35, 2));
      GL.begin({ hdr: true, exposure: 1.3 });
      GL.drawLines(trails().all, { cam, width: 1.4, glow: 0.85, alpha: 0.42, draw: (hpf - 6) / 18, drawSoft: 0.01, time: lt, pulse: { amount: 0.7, speed: 0.3, width: 0.035, color: '#FFFFFF', spread: 1 } });
      GL.drawCloud(CL.lin, { cam, alpha: 0.9, twinkle: 0 });
      if (flare > 0.02) { CL.noto.setPositions(LS.notoPos(pos)); GL.drawCloud(CL.noto, { cam, alpha: 2.2 * flare, size: 1.6, twinkle: 0 }); }
      GL.blit(ctx);
      LS.stamp(ctx, hpf, 1);
      LS.txt(ctx, 'c   Every cell, tracked from 6 to 24 hpf', 96, 96, { size: 26, weight: 600 });
      const L = [['notochord', 0], ['muscle', 1], ['neural', 2], ['skin', 3]];
      L.forEach(([s, i], k) => { ctx.fillStyle = LS.LINC[i]; circle(ctx, 108, 150 + k * 32, 7); ctx.fill(); LS.txt(ctx, s, 126, 157 + k * 32, { size: 20, mono: true, color: 'rgba(255,255,255,0.8)' }); });
      if (flare > 0.05) LS.txt(ctx, 'notochord precursors commit · 8 hpf', 96, 980, { size: 30, mono: true, color: LS.COL.noto, a: Math.min(1, flare * 1.5), glow: rgba(LS.COL.noto, 0.6) });
      LS.rise(ctx, '4,812 cells · 1.9 million positions', 96, 1020, (b - 1) / 0.6, { size: 24, mono: true, color: 'rgba(255,255,255,0.8)' });
      LS.scaleBar(ctx, W - 300, 1000, 100, 360, 1);
    },
  };
})();
