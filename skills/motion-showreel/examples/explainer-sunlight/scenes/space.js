// space (2 bars in the 15, 3 in the 30, 4 in the 60): eight minutes and twenty seconds. The camera rides with the
// light: the Sun falls behind and shrinks, stars stream past at their own depths, Mercury and Venus slide by as the
// clock passes the time their orbits take (3:13, 6:01), and the Earth grows ahead. The clock along the top runs from
// 0:00 to 8:20 and the distance under it to 150 million km; a pill gives the speed, 300,000 km every second. When the
// clock lands on 8:20 it pulses and a pill spells it out.
(() => {
  const { C } = FV;
  SCENES['space'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, n = Math.round(env.dur / B), end = n - 1.5;
      const u = Ease.ioSine(clamp((b - 0.4) / (end - 0.4))), secs = 500 * u;
      const scroll = 5200 * u + 60 * b;
      FV.space(ctx, { t, nx: scroll, streak: 26 + 30 * Math.sin(Math.PI * u), sx: -1 });
      // the Sun behind, shrinking
      const sk = Ease.outC(clamp(b / (n * 0.7))), sx = FV.lerp(820 - 480, -180, sk), sr = FV.lerp(330, 120, sk);
      FV.sun(ctx, sx, 560, sr, t, { cells: 120 });
      // Mercury and Venus slide by as the clock passes their orbits
      const pass = (u0, y, r, kind, name) => {
        const d = (u - u0) * 5, x = 1250 - d * 1250; if (x < -300 || x > W + 300) return;
        FV.planet(ctx, x, y, r, kind); FV.pill(ctx, name, x, y - r - 46, clamp(1.6 - Math.abs(d) * 1.2), { size: 26 });
      };
      pass(0.387, 800, 72, 'mercury', 'Mercury'); pass(0.723, 330, 112, 'venus', 'Venus');
      // the Earth ahead
      const ek = clamp((u - 0.78) / 0.22), er = FV.lerp(14, 300, Ease.inC(ek)), ex = FV.lerp(1700, 1500, ek);
      if (u > 0.6) FV.earth(ctx, ex, 560, er, t, { ang: Math.PI });
      // the light, riding along
      const px = 720 + 30 * Math.sin(b * 0.9), py = 560 + 14 * Math.sin(b * 1.3);
      FV.streak(ctx, px - 520, py, px, py, '#FFF2C4', 16, 0.75); FV.photon(ctx, px, py, 1.15, t);
      FV.pill(ctx, '300,000 km every second', px, py + 120, clamp((b - 1.2) / 0.6) * (1 - clamp((b - end + 1.6) / 0.5)), { size: 28 });
      // the clock and the distance
      const land = clamp((b - end) / 0.6), pulse = 1 + 0.12 * Math.sin(clamp((b - end) / 0.8) * Math.PI);
      ctx.save(); ctx.translate(W / 2, 150); ctx.scale(pulse, pulse);
      FV.txt(ctx, FV.clock(secs), 0, 0, { size: 150, weight: 900, align: 'center', color: land > 0 ? toHex(mix(C.white, C.sun1, land)) : C.white, ls: 4 });
      ctx.restore();
      FV.txt(ctx, Math.round(150 * u).toLocaleString('en-US') + ' million km', W / 2, 232, { size: 40, weight: 800, align: 'center', color: C.ink2 });
      FV.pill(ctx, '8 minutes 20 seconds', W / 2, 330, clamp((b - end - 0.2) / 0.6), { size: 36, bg: C.sun1 });
      // the trip so far, as a line: the Sun, Mercury's and Venus's orbits, the Earth
      const bx0 = 420, bx1 = 1500, by = 1000, ba = clamp((b - 0.6) / 0.6);
      ctx.save(); ctx.globalAlpha = ba; ctx.lineCap = 'round';
      ctx.strokeStyle = rgba(C.white, 0.25); ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(bx0, by); ctx.lineTo(bx1, by); ctx.stroke();
      ctx.strokeStyle = C.sun1; ctx.beginPath(); ctx.moveTo(bx0, by); ctx.lineTo(FV.lerp(bx0, bx1, u), by); ctx.stroke();
      [[0, 'Sun', C.sun2, 15], [0.387, 'Mercury', '#A99C92', 8], [0.723, 'Venus', '#F2D59A', 10], [1, 'Earth', C.ocean, 13]].forEach(([f, name, col, r]) => { const x = FV.lerp(bx0, bx1, f); ctx.fillStyle = col; circle(ctx, x, by, r); ctx.fill(); FV.txt(ctx, name, x, by + 46, { size: 24, weight: 800, align: 'center', color: u >= f ? C.white : C.ink2 }); });
      ctx.restore(); if (ba > 0) FV.photon(ctx, FV.lerp(bx0, bx1, u), by, 0.4, t);
    },
  };
})();
