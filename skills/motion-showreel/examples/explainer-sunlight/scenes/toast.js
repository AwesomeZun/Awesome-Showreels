// toast (2 bars in the 15 and 30, 4 in the 60): breakfast. A morning table in a shaft of window light; the light
// slides down the beam and soaks into a slice of toast on a plate, butter melting, steam curling. A pill: one slice is
// about 80 kcal; a line: sunlight, stored. In the 60 the toast moves aside for a glowing brain and a light bulb: your
// cells burn its sugar with oxygen, and the brain alone runs on about 20 watts. It ends on the journey in one line of
// pictures (the Sun, the Earth, a leaf, a wheat head, the toast) joined by a dashed path the light runs along, under
// the title and the line: made in the Sun more than ten thousand years ago, on your plate this morning.
(() => {
  const { C } = FV;
  function table(ctx, t, a = 1) {
    ctx.save(); ctx.globalAlpha *= a;
    ctx.fillStyle = linear(ctx, 0, 0, 0, H, [[0, '#F7D9A8'], [0.55, '#F0C483'], [0.56, '#B9733A'], [1, '#8E5226']]); ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 9; i++) { ctx.fillStyle = rgba('#7A4420', 0.18); ctx.fillRect(0, 610 + i * 52 + (i % 2) * 10, W, 4); }
    ctx.fillStyle = '#FFFFFF'; rr(ctx, 1260, 120, 420, 360, 24); ctx.fill(); ctx.fillStyle = '#BFE6FF'; rr(ctx, 1280, 140, 380, 320, 16); ctx.fill(); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(1466, 140, 8, 320); ctx.fillRect(1280, 296, 380, 8);
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = linear(ctx, 1470, 300, 700, 900, [[0, 'rgba(255,236,170,0.5)'], [1, 'rgba(255,236,170,0)']]); ctx.beginPath(); ctx.moveTo(1280, 140); ctx.lineTo(1660, 460); ctx.lineTo(1100, 1100); ctx.lineTo(380, 900); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function plate(ctx, x, y, s) { ctx.fillStyle = 'rgba(80,40,10,0.25)'; ctx.beginPath(); ctx.ellipse(x + 14, y + 22, 360 * s, 120 * s, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.ellipse(x, y, 360 * s, 118 * s, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#E9EEF8'; ctx.beginPath(); ctx.ellipse(x, y + 6, 270 * s, 80 * s, 0, 0, TAU); ctx.fill(); }
  function steam(ctx, x, y, t, a) { ctx.save(); ctx.strokeStyle = rgba('#FFFFFF', 0.55 * a); ctx.lineWidth = 8; ctx.lineCap = 'round'; for (let i = 0; i < 3; i++) { ctx.beginPath(); for (let k = 0; k <= 20; k++) { const u = k / 20, px = x + (i - 1) * 50 + Math.sin(u * 6 + t * 2 + i) * 18, py = y - u * 200 - ((t * 40) % 40); k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); } ctx.restore(); }
  function leafIcon(ctx, x, y, s) { TH.blade(ctx, x - 70 * s, y + 50 * s, x + 70 * s, y - 50 * s, 40 * s, { bend: 10 * s }); }
  SCENES['toast'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, n = Math.round(env.dur / B), X = Math.max(0, n - 8), h = b - 4, bo = b - X;
      if (bo < 4.3) {
        const aside = X ? Ease.ioC(clamp((h - 0.2) / 1.0)) * (1 - Ease.ioC(clamp((h - 7.0) / 1.0))) : 0;
        table(ctx, t);
        const tx = 860 - 380 * aside, ty = 640;
        // a mug on the right, steaming
        { const mx = 1440 + 120 * aside, my = 700; ctx.save(); ctx.globalAlpha = 1 - aside; ctx.fillStyle = 'rgba(80,40,10,0.25)'; ctx.beginPath(); ctx.ellipse(mx + 10, my + 150, 150, 30, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#E2577A'; ctx.lineWidth = 26; ctx.beginPath(); ctx.arc(mx + 120, my + 50, 56, -1.2, 1.2); ctx.stroke(); ctx.fillStyle = '#FF6F91'; rr(ctx, mx - 120, my - 70, 240, 220, 40); ctx.fill(); ctx.fillStyle = '#E2577A'; rr(ctx, mx + 40, my - 70, 80, 220, 40); ctx.fill(); ctx.fillStyle = '#FF8FA8'; ctx.beginPath(); ctx.ellipse(mx, my - 70, 120, 28, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#6B3A1E'; ctx.beginPath(); ctx.ellipse(mx, my - 66, 100, 20, 0, 0, TAU); ctx.fill(); steam(ctx, mx, my - 90, t * 0.8 + 1, 0.7); ctx.restore(); }
        plate(ctx, tx, ty + 120, 1);
        TH.slice(ctx, tx, ty - 20, 300, { toast: 0.85, butter: clamp((b - 0.8) / 2.5), rot: -0.06 });
        steam(ctx, tx, ty - 230, t, clamp(b / 1.0));
        // the light along the beam, into the toast
        const k = clamp(b / 0.9); if (k < 1) { const px = FV.lerp(1460, tx, Ease.inQ(k)), py = FV.lerp(300, ty - 40, Ease.inQ(k)); FV.streak(ctx, 1460, 300, px, py, '#FFF2C4', 12, 0.8); FV.photon(ctx, px, py, 1.0, t); }
        else FV.glow(ctx, tx, ty - 20, 320, C.sun1, 0.55 * (1 - clamp((b - 0.9) / 1.5)) + 0.12);
        FV.pill(ctx, 'one slice ≈ 80 kcal', tx + 330, ty - 260, clamp((b - 1.3) / 0.6) * (1 - aside), { size: 32 });
        FV.caption(ctx, 'Sunlight, stored.', clamp((b - 2.0) / 0.9) * (1 - aside), { size: 46 });
        if (X > 0 && aside > 0) {
          // (the 60) the brain and the bulb
          const k2 = clamp((h - 0.8) / 0.8); TH.brain(ctx, 1080, 520, 150 * Ease.outBack(k2), { glow: 0.6 + 0.4 * Math.sin(t * 3) }); TH.bulb(ctx, 1520, 440, 90 * Ease.outBack(clamp((h - 1.4) / 0.8)), clamp((h - 2.0) / 0.6));
          FV.pill(ctx, 'about 20 W', 1520, 730, clamp((h - 2.2) / 0.5), { size: 32, bg: C.sun1 });
          FV.caption(ctx, 'Your cells burn its sugar with oxygen. Your brain alone runs on about 20 watts.', clamp((h - 1.2) / 1.6) * (1 - clamp((h - 6.8) / 0.4)), { size: 34 });
        }
        if (bo < 4.0) return;
      }
      // (out) the journey in one line of pictures
      const k = bo - 4, e = Ease.ioC(clamp(k / 0.6));
      ctx.save(); ctx.globalAlpha = e; FV.space(ctx, { t }); ctx.restore();
      const xs = [250, 610, 960, 1310, 1670], y = 560, pts = [];
      for (let i = 0; i <= 100; i++) { const u = i / 100, x = FV.lerp(xs[0], xs[4], u); pts.push([x, y + Math.sin(u * Math.PI * 4) * 30]); }
      const pk = clamp((k - 0.3) / 2.6);
      ctx.save(); ctx.setLineDash([4, 16]); ctx.lineCap = 'round'; ctx.strokeStyle = rgba(C.white, 0.7 * e); ctx.lineWidth = 5; ctx.beginPath(); pts.slice(0, Math.max(2, Math.floor(pk * 100) + 1)).forEach(([x, yy], i) => (i ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy))); ctx.stroke(); ctx.restore();
      const icon = (i, fn) => { const s = Ease.outBack(clamp((k - 0.2 - i * 0.45) / 0.5)); if (s > 0) { ctx.save(); ctx.translate(xs[i], y); ctx.scale(s, s); ctx.translate(-xs[i], -y); fn(); ctx.restore(); } };
      icon(0, () => FV.sun(ctx, xs[0], y, 92, t, { cells: 60 })); icon(1, () => FV.earth(ctx, xs[1], y, 80, t, { ang: Math.PI }));
      icon(2, () => leafIcon(ctx, xs[2], y, 1.3)); icon(3, () => TH.head(ctx, xs[3] - 10, y + 90, 220, 1, -Math.PI / 2 + 0.15));
      icon(4, () => TH.slice(ctx, xs[4], y, 150, { toast: 0.85, butter: 1 }));
      const [px, py] = pts[Math.min(100, Math.floor(pk * 100))]; if (pk > 0) FV.photon(ctx, px, py, 0.9, t);
      FV.title(ctx, 'SUNLIGHT FOR BREAKFAST', W / 2, 260, clamp((k - 0.5) / 1.2), { size: 88 });
      FV.pop(ctx, [['Made in the Sun more than ten thousand years ago. ', C.ink2], ['On your plate this morning.', C.white]], W / 2, 860, clamp((k - 1.6) / 1.4), { size: 38 });
    },
  };
})();
