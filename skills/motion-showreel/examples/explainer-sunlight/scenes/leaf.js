// leaf (1 bar in the 15, 3 in the 30, 5 in the 60): light becomes sugar. A wheat leaf in morning light; the light
// dives into it and the camera follows. In the longer cuts: the leaf's cells, packed with green chloroplasts that
// stream around; one chloroplast up close, its stacked discs catching red and blue light while green bounces off
// (that's why leaves look green); the equation, 6 CO₂ + 6 H₂O + light, giving C₆H₁₂O₆ + 6 O₂, with the molecules
// drifting in and out; in the 60, the oxygen bubbling out of the leaf into the air. Every cut ends on a ring of sugar,
// glowing.
(() => {
  const { C } = FV;
  const HIT = [990, 560];
  function cells(ctx, t, z) {
    ctx.fillStyle = '#2E7D32'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
    for (let r = -1; r < 7; r++) for (let c = -1; c < 9; c++) {
      const x = c * 250 + (r % 2) * 125 - 40, y = r * 165 - 40, w = 236, h = 150;
      ctx.fillStyle = '#9BD86A'; rr(ctx, x, y, w, h, 34); ctx.fill(); ctx.fillStyle = '#C8F08E'; rr(ctx, x + 9, y + 9, w - 18, h - 18, 28); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; rr(ctx, x + 50, y + 34, w - 100, h - 68, 22); ctx.fill();
      if ((r * 9 + c) % 3 === 0) { ctx.fillStyle = '#B48AD8'; circle(ctx, x + w * 0.22, y + h * 0.5, 17); ctx.fill(); ctx.fillStyle = '#8E62B8'; circle(ctx, x + w * 0.22, y + h * 0.5, 7); ctx.fill(); }
      for (let k = 0; k < 7; k++) { const a = t * 0.5 + k / 7 * TAU + r + c, px = x + w / 2 + Math.cos(a) * (w * 0.36), py = y + h / 2 + Math.sin(a) * (h * 0.3); ctx.fillStyle = '#3E9E3A'; ctx.beginPath(); ctx.ellipse(px, py, 20, 12, a + Math.PI / 2, 0, TAU); ctx.fill(); ctx.fillStyle = '#2C7A2E'; ctx.beginPath(); ctx.ellipse(px, py, 12, 6, a + Math.PI / 2, 0, TAU); ctx.fill(); }
    }
    ctx.restore();
  }
  function chloroplast(ctx, t, a = 1, hit = 0) {
    ctx.save(); ctx.globalAlpha *= a;
    ctx.fillStyle = '#1F6B2A'; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 14; i++) FV.bokeh(ctx, FV.rnd(i, 131) * W, FV.rnd(i, 132) * H, 60 + 90 * FV.rnd(i, 133), '#58B848', 0.25);
    ctx.fillStyle = 'rgba(10,40,14,0.35)'; ctx.beginPath(); ctx.ellipse(985, 600, 700, 330, -0.08, 0, TAU); ctx.fill();
    ctx.fillStyle = '#5DAE3B'; ctx.beginPath(); ctx.ellipse(960, 560, 712, 342, -0.08, 0, TAU); ctx.fill();
    ctx.fillStyle = '#8FD05A'; ctx.beginPath(); ctx.ellipse(960, 560, 694, 324, -0.08, 0, TAU); ctx.fill();
    ctx.fillStyle = '#A6DE6E'; ctx.beginPath(); ctx.ellipse(960, 560, 676, 306, -0.08, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.ellipse(960, 560, 676, 306, -0.08, 0, TAU); ctx.clip(); ctx.fillStyle = 'rgba(46,125,50,0.18)'; ctx.beginPath(); ctx.ellipse(1010, 700, 700, 260, -0.08, 0, TAU); ctx.fill(); ctx.restore();
    ctx.strokeStyle = 'rgba(46,125,50,0.6)'; ctx.lineWidth = 6; ctx.beginPath(); for (let i = 0; i < 6; i++) { const y = 420 + i * 55; ctx.moveTo(380, y + Math.sin(i) * 20); ctx.bezierCurveTo(700, y - 40, 1200, y + 40, 1540, y); } ctx.stroke();
    for (let g = 0; g < 7; g++) { const gx = 470 + g * 165, gy = 560 + Math.sin(g * 1.9) * 120; for (let d = 0; d < 6; d++) { const yy = gy - 60 + d * 22, glow = hit * (g === 3 ? 1 : 0.3); ctx.fillStyle = '#2C7A2E'; ctx.beginPath(); ctx.ellipse(gx, yy + 5, 62, 14, 0, 0, TAU); ctx.fill(); ctx.fillStyle = toHex(mix('#3E9E3A', '#B8FF7A', glow)); ctx.beginPath(); ctx.ellipse(gx, yy, 62, 13, 0, 0, TAU); ctx.fill(); } }
    ctx.restore();
  }
  SCENES['leaf'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, n = Math.round(env.dur / B), X = Math.max(0, n - 4), h = b - 2, bo = b - X;
      // (in) the leaf in morning light, the light diving in
      if (b < 2) {
        const zk = Ease.inC(clamp((b - 0.9) / 1.2)), z = 1 + 7 * zk;
        FV.zoom(ctx, HIT[0], HIT[1], z, () => {
          ctx.fillStyle = linear(ctx, 0, 0, 0, H, [[0, '#7CC7FF'], [0.6, '#CFEFFF'], [1, '#FFE3A8']]); ctx.fillRect(0, 0, W, H);
          for (let i = 0; i < 18; i++) FV.bokeh(ctx, FV.rnd(i, 141) * W, FV.rnd(i, 142) * H, 50 + 110 * FV.rnd(i, 143), i % 3 ? '#9BD86A' : '#FFE08A', 0.35);
          TH.blade(ctx, -120, 1020, 2080, 120, 190, { bend: 40 * Math.sin(t * 0.8) });
          TH.blade(ctx, 300, 1200, 1500, -100, 90, { bend: -30, base: '#4DAE3E', dark: '#2C7A2E', light: '#8FD05A' });
        });
        const k = clamp(b / 0.9), px = FV.lerp(250, HIT[0], Ease.inQ(k)), py = FV.lerp(-60, HIT[1], Ease.inQ(k));
        if (b < 0.9) { FV.streak(ctx, 250, -60, px, py, '#FFF2C4', 14, 0.8); FV.photon(ctx, px, py, 1.1, t); }
        else { const f = clamp((b - 0.9) / 0.8); FV.glow(ctx, HIT[0], HIT[1], 400 * Ease.outC(f), '#FFFFFF', 1 - f); }
        if (b >= 1.6) { ctx.fillStyle = rgba('#2E7D32', clamp((b - 1.6) / 0.4)); ctx.fillRect(0, 0, W, H); }
        return;
      }
      // (hold, the 30 and 60) cells, a chloroplast, the equation; (the 60) oxygen leaves the leaf
      if (X > 0 && bo < 2) {
        if (h < 2.8) {
          const z = 1 + 1.6 * Ease.inC(clamp((h - 1.6) / 1.2)); cells(ctx, t, z);
          FV.pill(ctx, 'a leaf cell', 620, 300, clamp((h - 0.3) / 0.6) * (1 - clamp((h - 1.8) / 0.4)), { size: 30 });
          FV.pill(ctx, 'chloroplasts', 1300, 760, clamp((h - 0.8) / 0.6) * (1 - clamp((h - 1.8) / 0.4)), { size: 30, bg: C.leafL });
          if (h > 2.3) { ctx.fillStyle = rgba('#1F6B2A', clamp((h - 2.3) / 0.5)); ctx.fillRect(0, 0, W, H); }
        } else if (h < 5.4) {
          const k = h - 2.8, hit = clamp((k - 1.0) / 0.4) * (1 - clamp((k - 2.0) / 0.6) * 0.5);
          chloroplast(ctx, t, clamp(k / 0.4), hit);
          const ray = (col, x0, y0, x1, y1, bounce, d) => { const kk = clamp((k - d) / 0.8); if (kk <= 0) return; const ex = FV.lerp(x0, x1, Ease.inQ(kk)), ey = FV.lerp(y0, y1, Ease.inQ(kk)); FV.streak(ctx, x0, y0, ex, ey, col, 16, 1, { add: false }); if (kk >= 1 && bounce) { const kb = clamp((k - d - 0.8) / 0.7); FV.streak(ctx, x1, y1, x1 + 500 * Ease.outQ(kb), y1 - 520 * Ease.outQ(kb), col, 16, 1, { add: false }); } if (kk >= 1 && !bounce) { const f = 1 - clamp((k - d - 0.8) / 0.8); ctx.fillStyle = rgba(col, 0.55 * f); circle(ctx, x1, y1, 40 + 40 * (1 - f)); ctx.fill(); } };
          ray('#FF4B4B', 200, -60, 900, 560, false, 0.2); ray('#4BA3FF', 420, -80, 1060, 500, false, 0.35); ray('#5BFF6A', 640, -80, 1240, 470, true, 0.5);
          FV.pill(ctx, 'chlorophyll takes in red and blue', 560, 930, clamp((k - 1.0) / 0.5), { size: 30 });
          FV.pill(ctx, 'green bounces off', 1560, 210, clamp((k - 1.5) / 0.5), { size: 30, bg: '#5BFF6A' });
          FV.caption(ctx, 'That’s why leaves look green.', clamp((k - 1.9) / 0.8), { y: 1040 });
        } else if (h < 8) {
          const k = h - 5.4; chloroplast(ctx, t, 1, 0.3);
          // the equation, on a white card
          const card = Ease.outBack(clamp(k / 0.6)); ctx.save(); ctx.translate(W / 2, 170); ctx.scale(card, card); ctx.fillStyle = C.white; rr(ctx, -720, -70, 1440, 140, 70); ctx.fill(); ctx.restore();
          if (card > 0.5) { FV.txt(ctx, '6 CO₂ + 6 H₂O + light', W / 2 - 110, 190, { size: 50, weight: 900, align: 'right', color: C.ink, shadow: false }); FV.farrow(ctx, W / 2 - 80, 172, W / 2 + 60, 172, C.sun2, 12); FV.txt(ctx, 'C₆H₁₂O₆ + 6 O₂', W / 2 + 90, 190, { size: 50, weight: 900, color: C.ink, shadow: false }); }
          for (let i = 0; i < 3; i++) { const kk = clamp((k - 0.4 - i * 0.2) / 1.6); TH.mol(ctx, 'co2', FV.lerp(-100, 700, kk), 480 + i * 110, 22, { rot: t + i, a: 1 - clamp((kk - 0.9) * 10) }); TH.mol(ctx, 'h2o', FV.lerp(-100, 760, clamp(kk - 0.1)), 540 + i * 110, 22, { rot: -t + i }); }
          const sk = clamp((k - 1.6) / 0.8); TH.mol(ctx, 'sugar', 1180, 600, 26 * Ease.outBack(sk), { glow: sk, rot: t * 0.3 });
          for (let i = 0; i < 3; i++) { const ok = clamp((k - 1.8 - i * 0.2) / 1.2); if (ok > 0) TH.mol(ctx, 'o2', 1450 + i * 90, FV.lerp(760, 300, ok), 20, { rot: t * 2 + i, a: 1 - clamp((ok - 0.8) * 5) }); }
          FV.pill(ctx, 'sugar', 1180, 790, clamp((k - 2.0) / 0.5), { size: 30, bg: C.sun1 }); FV.pill(ctx, 'oxygen', 1560, 860, clamp((k - 2.2) / 0.5), { size: 26 });
        } else {
          // (the 60) the oxygen leaves the leaf through its pores and rises into the air
          const k = h - 8;
          ctx.fillStyle = linear(ctx, 0, 0, 0, H, [[0, '#7CC7FF'], [1, '#D9F3FF']]); ctx.fillRect(0, 0, W, H);
          TH.blade(ctx, -200, 1180, 2200, 700, 330, { bend: 20 * Math.sin(t) });
          for (let i = 0; i < 6; i++) { const sx = 300 + i * 260, sy = 960 - i * 47; ctx.fillStyle = '#2C7A2E'; ctx.beginPath(); ctx.ellipse(sx, sy, 26, 12, -0.2, 0, TAU); ctx.fill(); ctx.fillStyle = '#A6DE6E'; ctx.beginPath(); ctx.ellipse(sx, sy, 22, 5, -0.2, 0, TAU); ctx.fill(); }
          for (let i = 0; i < 24; i++) { const s0 = i % 6, lt = ((k * 0.22 + FV.rnd(i, 151)) % 1), sx = 300 + s0 * 260 + Math.sin(lt * 9 + i) * 30, sy = 960 - s0 * 47 - lt * 900; TH.mol(ctx, 'o2', sx, sy, 16, { rot: lt * 6 + i, a: clamp(k * 2) * (1 - lt) }); }
          FV.pill(ctx, 'stomata: the leaf’s pores', 900, 820, clamp((k - 0.6) / 0.6), { size: 28 });
          FV.caption(ctx, 'The oxygen it lets go is the air you breathe.', clamp((k - 1.0) / 1.4), { y: 120, plate: 0.35 });
        }
        return;
      }
      // (out) a ring of sugar, glowing
      const k = bo - 2; chloroplast(ctx, t, 1, 0.2); ctx.fillStyle = rgba('#0E3A16', 0.45); ctx.fillRect(0, 0, W, H);
      const sk = clamp((k + 0.2) / 0.6); TH.mol(ctx, 'sugar', W / 2, 500, 40 * Ease.outBack(sk), { glow: 1, rot: t * 0.25 });
      FV.pill(ctx, 'sugar', W / 2, 760, clamp((k - 0.2) / 0.5), { size: 34, bg: C.sun1 });
      FV.caption(ctx, 'Light became sugar.', clamp((k - 0.3) / 0.9), { size: 44 });
    },
  };
})();
