// wheat (1 bar in the 15, 2 in the 30, 4 in the 60): a season in a few seconds. A field grows in time-lapse, green
// shoots to golden heads, swaying, while a small sun arcs over it again and again; a pill says a field keeps only about
// 1% of the sunlight that falls on it. In the longer cuts one wheat head fills the frame, its grains glowing (the sugar
// stored as starch), and in the 60 the field rolls in the wind at golden hour. It ends on grain, flour and bread
// popping in a row, joined by arrows.
(() => {
  const { C } = FV;
  // rows from the back (d = 0: small, hazy, many) to the front (d = 4: tall, few, cut by the frame)
  const ROWS = [[0, 70, 0.32], [1, 46, 0.52], [2, 30, 0.85], [3, 16, 1.5], [4, 8, 2.6]];
  const PLANTS = ROWS.flatMap(([d, n, s]) => Array.from({ length: n }, (_, i) => ({ d, x: (i + 0.5 * FV.rnd(i + d * 100, 161)) / n * (W + 120) - 60, s: s * (0.9 + 0.2 * FV.rnd(i + d * 100, 163)), ph: FV.rnd(i + d * 100, 162) * TAU })));
  function field(ctx, t, grow, ripe, sky, glowK = 0) {
    ctx.fillStyle = linear(ctx, 0, 0, 0, H, sky); ctx.fillRect(0, 0, W, H);
    const haze = sky[sky.length - 1][1];
    [[600, 0.0035, 40, 0.55], [650, 0.0028, 50, 0.3]].forEach(([y0, f, amp, hz], k) => { ctx.fillStyle = toHex(mix(toHex(mix('#7CC456', '#E7C25A', ripe)), haze, hz)); ctx.beginPath(); ctx.moveTo(0, H); for (let x = 0; x <= W; x += 40) ctx.lineTo(x, y0 + Math.sin(x * f + k * 1.7) * amp); ctx.lineTo(W, H); ctx.closePath(); ctx.fill(); });
    ctx.fillStyle = toHex(mix('#6DB548', '#D9AE45', ripe)); ctx.fillRect(0, 760, W, H - 760);
    for (const p of PLANTS) {
      const y = 700 + p.d * 95 + p.d * p.d * 6, wind = Math.sin(t * 1.6 - p.x * 0.004 + p.ph * 0.3) * (0.08 + 0.02 * p.d) + 0.04;
      TH.stalk(ctx, p.x, y, 220 * p.s, { grow, ripe, sway: wind, alpha: 1, glow: glowK * (p.d / 4), awns: p.d > 1 });
      if (p.d < 2) { ctx.fillStyle = rgba(haze, 0.0); }
    }
    ctx.fillStyle = linear(ctx, 0, 560, 0, 800, [[0, rgba(haze, 0.35)], [1, rgba(haze, 0)]]); ctx.fillRect(0, 560, W, 240);
  }
  SCENES['wheat'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, n = Math.round(env.dur / B), X = Math.max(0, n - 4), h = b - 2, bo = b - X;
      const days = b * 3.2;
      if (bo < 2.0) {
        const grow = Ease.outC(clamp(0.2 + b / 2.0)), ripe = Ease.ioSine(clamp((b - 0.6) / 1.6)), gold = n > 8 ? Ease.ioC(clamp((h - 5.0) / 1.5)) : 0;
        const day = (0.5 + 0.5 * Math.cos(days * TAU * 0.25)) * (1 - gold);
        field(ctx, t, grow, ripe, [[0, toHex(mix(toHex(mix('#3E7FD8', '#7FC4FF', day)), '#FF8A6A', gold))], [0.55, toHex(mix(toHex(mix('#8CC8F5', '#CDEBFF', day)), '#FFB27A', gold))], [1, toHex(mix(toHex(mix('#FFC27A', '#E6F6FF', day)), '#FFDB94', gold))]], gold * 0.25);
        // the sun arcing over, again and again (in the 60 it settles low for the golden hour)
        const ang = gold > 0 ? FV.lerp(Math.PI * ((days * 0.25) % 1), Math.PI * 0.9, gold) : Math.PI * ((days * 0.25) % 1), sx = W / 2 - Math.cos(ang) * 820, sy = 720 - Math.sin(ang) * 560;
        FV.glow(ctx, sx, sy, 260, C.sun1, 0.7); ctx.fillStyle = '#FFF2B0'; circle(ctx, sx, sy, 46); ctx.fill();
        FV.pill(ctx, 'a field keeps about 1% of the sunlight on it', W / 2, 170, clamp((b - 0.8) / 0.6) * (X ? 1 - clamp((h - 1.6) / 0.4) : 1), { size: 32 });
        if (X > 0 && h > 1.8 && (n <= 8 || h < 5.4)) {
          // one head, close: the grains glow (starch)
          const k = clamp((h - 1.8) / 0.6) * (n > 8 ? 1 - clamp((h - 4.8) / 0.6) : 1); ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = rgba('#3A2A10', 0.55); ctx.fillRect(0, 0, W, H);
          TH.head(ctx, W / 2 - 40, 900, 640 * Ease.outBack(k), 1, -Math.PI / 2 + 0.1 * Math.sin(t), { glow: clamp((h - 2.4) / 0.8) });
          FV.pill(ctx, 'stored as starch in the grain', 1380, 380, clamp((h - 2.6) / 0.6), { size: 30, bg: C.sun1 }); ctx.restore();
        }
        if (n > 8) FV.caption(ctx, 'A season of sunlight, packed into every grain.', clamp((h - 6.0) / 1.4));
        if (bo < 2.0) return;
      }
      // (out) grain, flour, bread
      const k = bo - 2;
      ctx.fillStyle = radial(ctx, W / 2, H / 2, 0, 1300, [[0, '#FFE7B8'], [1, '#E9B566']]); ctx.fillRect(0, 0, W, H);
      const items = [[420, (x, y, s) => TH.grain(ctx, x, y, 300 * s)], [960, (x, y, s) => TH.flour(ctx, x, y, 330 * s)], [1500, (x, y, s) => TH.loaf(ctx, x, y, 380 * s)]];
      items.forEach(([x, fn], i) => { const s = Ease.outBack(clamp((k - i * 0.45) / 0.5)); if (s > 0) fn(x, 640, s); if (i < 2) FV.farrow(ctx, x + 180, 560, x + 360, 560, C.crust, 14, { k: clamp((k - i * 0.45 - 0.3) / 0.4) }); });
      ['grain', 'flour', 'bread'].forEach((s, i) => FV.pill(ctx, s, items[i][0], 770, clamp((k - i * 0.45 - 0.2) / 0.5), { size: 30 }));
    },
  };
})();
