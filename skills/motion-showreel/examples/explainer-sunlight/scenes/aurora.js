// aurora (4 bars, the 60 only): not everything the Sun sends is light. First the Earth in its magnetic field (cyan
// loops, squeezed on the Sun's side and stretched behind) while the solar wind, a stream of pink particles, arrives
// from the left, piles against an arc and slides around it, a few riding the field lines down to the poles, where
// green rings light up. Then down to a polar night: snowy ranges in layers, a frozen lake, and the curtains of an
// aurora waving across the sky, green below and red on top, reflected in the ice. Pills name the oxygen behind each
// colour.
(() => {
  const { C } = FV;
  const EX = 1330, EY = 560, ER = 190;
  const WIND = Array.from({ length: 150 }, (_, i) => ({ y: FV.rnd(i, 101) * H, sp: 0.6 + 0.6 * FV.rnd(i, 102), ph: FV.rnd(i, 103), r: 3 + 4 * FV.rnd(i, 104) }));
  const RANGES = [[0.62, '#21456A', 0.5, 7], [0.7, '#183652', 0.75, 5], [0.8, '#0F2440', 1, 4]].map(([y, c, a, n], k) => ({ y, c, pts: Array.from({ length: 14 }, (_, i) => [i / 13, y - (0.05 + 0.12 * FV.rnd(i + k * 20, 111)) * (i % 2 ? 0.55 : 1) * (1.2 - k * 0.25)]) }));
  function field(ctx, a, t) {
    ctx.save(); ctx.globalAlpha *= a; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (const L of [1.5, 2.1, 2.9, 3.9]) for (const side of [-1, 1]) {
      const sq = side < 0 ? 0.78 : 1.55; ctx.strokeStyle = rgba(C.cyan, 0.5 - L * 0.07); ctx.beginPath();
      for (let i = 0; i <= 60; i++) { const th = 0.12 + (Math.PI - 0.24) * i / 60, r = L * ER * Math.sin(th) ** 2; const x = EX + side * r * Math.sin(th) * sq, y = EY - r * Math.cos(th); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
      const s = ((t * 0.25 + L) % 1), th = 0.12 + (Math.PI - 0.24) * s, r = L * ER * Math.sin(th) ** 2; ctx.fillStyle = rgba(C.cyan, 0.8); circle(ctx, EX + side * r * Math.sin(th) * sq, EY - r * Math.cos(th), 4); ctx.fill();
    }
    ctx.restore();
  }
  function curtain(ctx, t, y0, hgt, ph, a, mirror) {
    const N = 80, edge = (i) => { const x = -100 + (W + 200) * i / N; return [x, y0 + 40 * Math.sin(x * 0.004 + t * 0.6 + ph) + 18 * Math.sin(x * 0.011 - t * 0.9 + ph * 2)]; };
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= a;
    if (mirror) { ctx.translate(0, mirror); ctx.scale(1, -1); ctx.translate(0, -mirror); }
    ctx.beginPath(); for (let i = 0; i <= N; i++) { const [x, y] = edge(i); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } for (let i = N; i >= 0; i--) { const [x, y] = edge(i); ctx.lineTo(x + 30 * Math.sin(i + t), y - hgt); } ctx.closePath();
    ctx.fillStyle = linear(ctx, 0, y0 + 60, 0, y0 - hgt, [[0, 'rgba(90,255,160,0)'], [0.08, 'rgba(90,255,160,0.75)'], [0.45, 'rgba(60,230,140,0.28)'], [0.75, 'rgba(255,70,130,0.22)'], [1, 'rgba(255,70,130,0)']]); ctx.fill();
    for (let i = 0; i < N; i += 2) { const [x, y] = edge(i), k = 0.5 + 0.5 * Math.sin(i * 1.7 + t * 2 + ph); ctx.strokeStyle = `rgba(160,255,200,${0.18 * k})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 20 * Math.sin(i + t), y - hgt * (0.4 + 0.4 * k)); ctx.stroke(); }
    ctx.restore();
  }
  SCENES['aurora'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, sw = Ease.ioC(clamp((b - 6.2) / 1.2));
      if (sw < 1) {
        ctx.save(); ctx.globalAlpha = 1 - sw;
        FV.space(ctx, { t });
        // the bow: where the wind meets the field
        ctx.strokeStyle = rgba(C.cyan, 0.3); ctx.lineWidth = 6; ctx.beginPath(); for (let i = -30; i <= 30; i++) { const y = EY + i * 16, x = EX - 470 + (i * 16) ** 2 / 1300; i > -30 ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
        field(ctx, clamp((b - 0.8) / 1.0), t);
        // the wind: pink particles arriving, sliding around the bow, a few down to the poles
        for (const p of WIND) {
          const u = ((t * 0.12 * p.sp + p.ph) % 1), x = -40 + u * 1400, bowX = EX - 470 + (p.y - EY) ** 2 / 1300;
          let px = x, py = p.y, a = clamp(b * 1.5);
          if (x > bowX) { const k = (x - bowX) / 300; py = p.y + Math.sign(p.y - EY || 1) * k * 140; a *= 1 - clamp(k); }
          if (a <= 0) continue; ctx.fillStyle = rgba(p.r > 5 ? C.pink : '#FFB0C8', 0.85 * a); circle(ctx, px, py, p.r); ctx.fill();
        }
        FV.earth(ctx, EX, EY, ER, t, { ang: Math.PI });
        const pole = clamp((b - 2.4) / 1.2); for (const s of [-1, 1]) { ctx.strokeStyle = rgba('#5DFFA0', 0.85 * pole * (0.7 + 0.3 * Math.sin(t * 6))); ctx.lineWidth = 7; ctx.beginPath(); ctx.ellipse(EX, EY + s * ER * 0.86, ER * 0.36, ER * 0.1, 0, 0, TAU); ctx.stroke(); FV.glow(ctx, EX, EY + s * ER * 0.9, 90, '#5DFFA0', 0.5 * pole); }
        FV.pill(ctx, 'solar wind: particles, not light', 420, 250, clamp((b - 0.8) / 0.6), { size: 28 });
        FV.pill(ctx, 'takes a few days', 420, 320, clamp((b - 1.6) / 0.6), { size: 26, bg: C.pink, color: C.white });
        FV.pill(ctx, 'magnetic field', EX + 300, EY - 330, clamp((b - 2.0) / 0.6), { size: 26, bg: C.cyan });
        FV.caption(ctx, 'Not everything the Sun sends is light.', clamp((b - 0.3) / 1.2));
        ctx.restore();
      }
      if (sw > 0) {
        ctx.save(); ctx.globalAlpha = sw;
        ctx.fillStyle = linear(ctx, 0, 0, 0, H, [[0, '#050B22'], [0.6, '#0E2B45'], [0.75, '#1B4A5E'], [1, '#0A1828']]); ctx.fillRect(0, 0, W, H);
        FV.stars(ctx, { t, a: 0.7, dx: t * 6 });
        curtain(ctx, t, 520, 380, 0, 0.9); curtain(ctx, t * 1.1, 430, 300, 2.1, 0.6); curtain(ctx, t * 0.9, 600, 260, 4.2, 0.45);
        // the ranges, the ice and the reflection
        for (const r of RANGES) { ctx.fillStyle = r.c; ctx.beginPath(); ctx.moveTo(0, H); r.pts.forEach(([u, v]) => ctx.lineTo(u * W, v * H)); ctx.lineTo(W, H); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(205,232,246,0.45)'; r.pts.forEach(([u, v], i) => { if (i % 2 || i === 0 || i === r.pts.length - 1) return; const P = [u * W, v * H], A = [r.pts[i - 1][0] * W, r.pts[i - 1][1] * H], Bp = [r.pts[i + 1][0] * W, r.pts[i + 1][1] * H], k = 0.3, a1 = [P[0] + (A[0] - P[0]) * k, P[1] + (A[1] - P[1]) * k], b1 = [P[0] + (Bp[0] - P[0]) * k, P[1] + (Bp[1] - P[1]) * k]; ctx.beginPath(); ctx.moveTo(...P); ctx.lineTo(...a1); ctx.lineTo((a1[0] + P[0]) / 2 + 8, a1[1] - 10); ctx.lineTo(P[0], (a1[1] + b1[1]) / 2 - 4); ctx.lineTo((b1[0] + P[0]) / 2 - 6, b1[1] - 12); ctx.lineTo(...b1); ctx.closePath(); ctx.fill(); }); }
        const lake = 0.86 * H; ctx.save(); ctx.beginPath(); ctx.rect(0, lake, W, H - lake); ctx.clip(); ctx.fillStyle = '#0B1E33'; ctx.fillRect(0, lake, W, H - lake); curtain(ctx, t, 520, 380, 0, 0.35, lake); ctx.fillStyle = 'rgba(255,255,255,0.12)'; for (let i = 0; i < 8; i++) ctx.fillRect(100 + i * 230, lake + 20 + (i % 3) * 30, 140, 3); ctx.restore();
        FV.pill(ctx, 'oxygen glows green', 1420, 640, clamp((b - 8.6) / 0.6), { size: 28, bg: '#5DFFA0' });
        FV.pill(ctx, 'higher up, oxygen glows red', 640, 170, clamp((b - 9.6) / 0.6), { size: 28, bg: '#FF6B9A', color: C.white });
        FV.caption(ctx, 'Near the poles, it makes the air glow.', clamp((b - 7.2) / 1.2));
        ctx.restore();
      }
    },
  };
})();
