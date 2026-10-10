// core (1 bar, 2 in the 30 and 60): where the light is made. Inside the Sun's core, plasma in flat layers drifts at
// three depths while hydrogen nuclei dash about; two meet in the middle, a flash, and out of it comes the light the
// whole story follows: a warm white point with a gold halo. The title drops in letter by letter, and a pill says
// where we are: the Sun's core, about 15 million °C. In the longer cuts a line adds that the Sun turns about 4
// million tonnes of matter into energy every second, with more flashes going off behind.
(() => {
  const { C } = FV;
  const BLOBS = Array.from({ length: 96 }, (_, i) => ({ x: FV.rnd(i, 1) * W, y: FV.rnd(i, 2) * H, r: 20 + 120 * FV.rnd(i, 3) ** 2, z: 1 + Math.floor(FV.rnd(i, 4) * 3), c: [C.sun1, C.sun2, C.sun3, C.sun4, '#FFE58A'][Math.floor(FV.rnd(i, 5) * 5)], ph: FV.rnd(i, 6) * TAU }));
  const NUC = Array.from({ length: 26 }, (_, i) => ({ x: FV.rnd(i, 7) * W, y: FV.rnd(i, 8) * H, a: FV.rnd(i, 9) * TAU, v: 160 + 220 * FV.rnd(i, 10) }));
  function nucleus(ctx, x, y, r, a = 1) {
    ctx.save(); ctx.globalAlpha *= a; FV.ball(ctx, x, y, r, '#FFF1C9', '#FF9B3D', { ang: -2.3, shineA: 0.5 });
    ctx.strokeStyle = C.sun4; ctx.lineWidth = r * 0.22; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - r * 0.42, y); ctx.lineTo(x + r * 0.42, y); ctx.moveTo(x, y - r * 0.42); ctx.lineTo(x, y + r * 0.42); ctx.stroke(); ctx.restore();
  }
  // the newborn light, and where it drifts (surface picks it up from here)
  const birth = [960, 452], drift = (b) => [birth[0] + Math.max(0, b - 0.9) * 22, birth[1] - Math.max(0, b - 0.9) * 14 + Math.sin(b * 1.7) * 6];
  SCENES['core'] = {
    birth, drift,
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, n = Math.round(env.dur / B), z = 1 + 0.006 * b;
      FV.zoom(ctx, W / 2, H / 2, z, () => {
        ctx.fillStyle = radial(ctx, 960, 470, 0, 1250, [[0, '#FFE07A'], [0.3, '#FF9A33'], [0.62, '#D8401F'], [1, '#5E1020']]); ctx.fillRect(-100, -100, W + 200, H + 200);
        // plasma, back to front
        for (let d = 1; d <= 3; d++) for (const p of BLOBS) {
          if (p.z !== d) continue;
          const x = (p.x + Math.sin(t * 0.3 * d + p.ph) * 40 * d + t * 12 * d) % (W + 300) - 150, y = p.y + Math.cos(t * 0.25 * d + p.ph) * 30 * d - t * 6 * d;
          ctx.fillStyle = rgba(p.c, 0.1 + 0.08 * d); circle(ctx, x, ((y % (H + 300)) + H + 300) % (H + 300) - 150, p.r * (0.6 + 0.25 * d)); ctx.fill();
        }
        // nuclei dashing about
        for (const q of NUC) { const x = ((q.x + Math.cos(q.a) * q.v * t) % W + W) % W, y = ((q.y + Math.sin(q.a) * q.v * t) % H + H) % H; nucleus(ctx, x, y, 11, 0.85); }
        // more fusion behind (the longer cuts)
        if (n > 4) for (let i = 0; i < 4; i++) { const tb = 4.5 + i, k = clamp((b - tb) / 0.6); if (k <= 0 || k >= 1) continue; const x = 300 + FV.rnd(i, 51) * 1320, y = 200 + FV.rnd(i, 52) * 500; FV.glow(ctx, x, y, 160 * k, '#FFFFFF', 0.8 * (1 - k)); ctx.strokeStyle = rgba('#FFFFFF', 0.7 * (1 - k)); ctx.lineWidth = 4; circle(ctx, x, y, 90 * Ease.outC(k)); ctx.stroke(); }
        // two nuclei meet in the middle
        const m = Ease.inQ(clamp((b - 0.15) / 0.75));
        if (b < 0.9) { nucleus(ctx, FV.lerp(640, birth[0] - 16, m), birth[1] + Math.sin(m * 3) * 20, 22); nucleus(ctx, FV.lerp(1280, birth[0] + 16, m), birth[1] - Math.sin(m * 3) * 20, 22); }
        else { const f = clamp((b - 0.9) / 1.2); nucleus(ctx, birth[0] - 14 - f * 40, birth[1] + 10 + f * 60, 22); nucleus(ctx, birth[0] + 14 - f * 40, birth[1] + 10 + f * 60, 22); }
        const fk = clamp((b - 0.9) / 1.0);
        if (fk > 0 && fk < 1) { FV.glow(ctx, birth[0], birth[1], 520 * Ease.outC(fk), '#FFFFFF', 1 - fk); for (let i = 0; i < 3; i++) { const k = clamp(fk * 1.4 - i * 0.18); ctx.strokeStyle = rgba('#FFFFFF', 0.8 * (1 - k)); ctx.lineWidth = 6 - i * 1.5; circle(ctx, birth[0], birth[1], 30 + 380 * Ease.outC(k)); ctx.stroke(); } }
        if (b >= 0.9) { const [x, y] = drift(b); FV.photon(ctx, x, y, 1.3 * Ease.outBack(clamp((b - 0.9) / 0.5)), t); }
      });
      FV.title(ctx, 'SUNLIGHT FOR BREAKFAST', W / 2, 760, clamp((b - 1.0) / 1.3), { size: 96 });
      FV.pill(ctx, 'The Sun’s core · about 15 million °C', W / 2, 870, clamp((b - 2.1) / 0.6), { size: 30 });
      if (n > 4) FV.caption(ctx, 'Every second it turns about 4 million tonnes of matter into energy.', clamp((b - 4.4) / 1.6), { size: 36 });
    },
  };
})();
