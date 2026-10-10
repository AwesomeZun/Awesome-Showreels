// sky (2 bars in the 30, 3 in the 60): the air. The Earth's edge from space, its blue rim of air; ten rays of
// sunlight come down, and three of them bounce off the clouds straight back to space (pill: about 3 in 10). Then the
// camera drops through the air: the horizon flattens, the sky turns from violet to morning blue as the rays shed blue
// light in every direction, and a sunrise glows over a field of young wheat. In the 60 a line adds where the rest goes.
(() => {
  const { C } = FV;
  const RAYS = Array.from({ length: 10 }, (_, i) => ({ x: 260 + i * 150 + 30 * FV.rnd(i, 121), back: [2, 5, 8].includes(i) }));
  const BLUE = Array.from({ length: 160 }, (_, i) => ({ ray: i % 10, s: FV.rnd(i, 122), a: FV.rnd(i, 123) * TAU, v: 40 + 120 * FV.rnd(i, 124), d: FV.rnd(i, 125) }));
  SCENES['sky'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, n = Math.round(env.dur / B);
      const dive = Ease.ioC(clamp((b - 3.8) / 2.2)), R = FV.lerp(1700, 26000, dive), hz = FV.lerp(640, 760, dive), cy = hz + R;
      // sky: space violet to morning
      ctx.fillStyle = linear(ctx, 0, 0, 0, hz, [[0, toHex(mix(C.space1, '#3F8FE6', dive))], [0.7, toHex(mix(C.space0, '#8FD0FF', dive))], [1, toHex(mix('#2B5BA8', '#FFE1A8', dive))]]); ctx.fillRect(0, 0, W, H);
      FV.stars(ctx, { t, a: 1 - dive * 1.4 });
      FV.glow(ctx, 260, hz, 700, '#FFC46B', 0.55 * dive);
      // the planet's edge: air, then ground
      ctx.fillStyle = rgba(C.air, 0.45 * (1 - dive) + 0.2); circle(ctx, W / 2, cy, R + FV.lerp(70, 300, dive)); ctx.fill();
      ctx.fillStyle = rgba('#BFE6FF', 0.35 * (1 - dive)); circle(ctx, W / 2, cy, R + 30); ctx.fill();
      ctx.fillStyle = toHex(mix(C.ocean, '#6DBA4A', dive)); circle(ctx, W / 2, cy, R); ctx.fill();
      // land and clouds on the disc (seen from space)
      if (dive < 1) {
        ctx.save(); ctx.beginPath(); ctx.arc(W / 2, cy, R, 0, TAU); ctx.clip(); ctx.globalAlpha = 1 - dive;
        // land: irregular smooth blobs, flattened toward the horizon
        for (let i = 0; i < 4; i++) {
          const x = 260 + i * 470 + 120 * FV.rnd(i, 128), y = hz + 150 + 140 * FV.rnd(i, 129), s = 150 + 90 * FV.rnd(i, 130);
          for (const [col, k, dx] of [[C.land, 1, 0], [C.land2, 0.5, 30]]) { const pts = Array.from({ length: 12 }, (_, j) => { const a = j / 12 * TAU, rho = s * k * (0.6 + 0.4 * FV.rnd(i * 13 + j, 134)); return [x + dx + Math.cos(a) * rho * 1.4, y + Math.sin(a) * rho * 0.38]; }); ctx.fillStyle = col; ctx.beginPath(); pts.forEach((p, j) => { const q = pts[(j + 1) % 12], m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; j ? ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]) : ctx.moveTo(m[0], m[1]); }); ctx.closePath(); ctx.fill(); }
        }
        ctx.fillStyle = rgba('#0B0A2A', 0.2); ctx.fillRect(0, hz, W, H);
        // clouds: long white wisps
        for (let i = 0; i < 12; i++) { const x = 60 + i * 160 + 80 * FV.rnd(i, 126), y = hz + 30 + 260 * FV.rnd(i, 127) ** 1.4, l = 90 + 90 * FV.rnd(i, 131), th = 10 + 10 * FV.rnd(i, 135); ctx.fillStyle = rgba(C.cloud, 0.92); rr(ctx, x - l / 2, y - th / 2, l, th, th / 2); ctx.fill(); rr(ctx, x - l * 0.25, y - th * 1.4, l * 0.5, th, th / 2); ctx.fill(); }
        ctx.restore();
      }
      // the ground: rolling hills in layers, young wheat in front
      if (dive > 0.3) {
        const ga = clamp((dive - 0.3) * 2); ctx.save(); ctx.globalAlpha = ga;
        [[hz - 20, '#8CCB6A', 0.004, 60], [hz + 40, '#6DBA4A', 0.003, 80], [hz + 120, '#56A83C', 0.0025, 90]].forEach(([y0, col, f, amp], k) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H); for (let x = 0; x <= W; x += 40) ctx.lineTo(x, y0 + Math.sin(x * f + k * 2) * amp); ctx.lineTo(W, H); ctx.closePath(); ctx.fill(); });
        for (let i = 0; i < 28; i++) { const x = i * 72 + 20 * FV.rnd(i, 132), sw = 0.07 * Math.sin(t * 1.2 + i * 0.5); TH.stalk(ctx, x, H + 40, 420 + 140 * FV.rnd(i, 133), { grow: 0.85, ripe: 0.08, sway: sw, awns: true }); }
        ctx.restore();
      }
      // the rays
      for (let i = 0; i < RAYS.length; i++) {
        const r = RAYS[i], k = clamp((b - 0.3 - i * 0.07) / 0.8), hitY = cy - Math.sqrt(Math.max(0, R * R - (r.x - W / 2) ** 2)) - 10, x0 = r.x - 420, y0 = -100;
        if (k <= 0) continue; const ex = FV.lerp(x0, r.x, Ease.inQ(k)), ey = FV.lerp(y0, hitY, Ease.inQ(k)), fade = 1 - dive;
        FV.streak(ctx, x0, y0, ex, ey, '#FFE9A0', 10, 0.75 * fade);
        if (k >= 1 && r.back) { const kb = clamp((b - 1.1 - i * 0.07) / 0.9); FV.streak(ctx, r.x, hitY, r.x + 380 * Ease.outQ(kb), hitY - 560 * Ease.outQ(kb), '#FFFFFF', 9, 0.85 * fade); }
        if (k >= 1 && !r.back) FV.glow(ctx, r.x, hitY + 10, 60, '#FFE9A0', 0.35 * fade);
      }
      // blue light scattered every which way as the rays cross the air
      const sc = clamp((b - 3.2) / 2.0);
      if (sc > 0) for (const p of BLUE) { const r = RAYS[p.ray], lt = (t * 0.5 + p.d) % 1, x = FV.lerp(r.x - 300, r.x, p.s) + Math.cos(p.a) * p.v * lt * 3, y = FV.lerp(80, hz - 40, p.s) + Math.sin(p.a) * p.v * lt * 3; const a = sc * (1 - lt) * (0.5 + 0.5 * (1 - dive * 0.5)); ctx.fillStyle = rgba('#7CC4FF', 0.95 * a); circle(ctx, x, y, 7); ctx.fill(); FV.glow(ctx, x, y, 22, '#9FD4FF', 0.5 * a); }
      FV.pill(ctx, 'about 3 in 10 bounce back to space', 1420, 200, clamp((b - 1.6) / 0.6) * (1 - clamp((b - 3.6) / 0.4)), { size: 30 });
      FV.caption(ctx, [['Blue light scatters the most: that’s why the sky is ', C.white], ['blue', '#9FD4FF'], ['.', C.white]], clamp((b - 4.8) / 1.4), { a: n > 8 ? 1 - clamp((b - 8.0) / 0.4) : 1 });
      if (n > 8) FV.caption(ctx, 'The rest warms the land and the sea, and feeds every plant.', clamp((b - 8.4) / 1.4));
    },
  };
})();
