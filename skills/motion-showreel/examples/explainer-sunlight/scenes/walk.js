// walk (4 bars, the 60 only): the slow part. The Sun cut open like a cake: the yellow core, the orange layer where
// light only diffuses, the boiling outer third with its turning cells. A marker creeps out from the core while a
// magnifier shows what it is doing: absorbed and given off again, each time in a random direction, a zig-zag that
// barely gets anywhere, scattering flashes at every turn. A counter spins through the years and settles on the range
// of estimates (about 10,000 to 170,000 years); then a rising cell of hot gas carries the marker to the surface.
(() => {
  const { C } = FV;
  const SX = 560, SY = 580, SR = 430, MX = 1390, MY = 470, MR = 300;
  // the random walk in the magnifier: a few hundred short steps, deterministic
  const PATH = (() => { const p = [[0, 0]]; let x = 0, y = 0; for (let i = 0; i < 420; i++) { const a = FV.rnd(i, 61) * TAU, l = 18 + 26 * FV.rnd(i, 62); x += Math.cos(a) * l; y += Math.sin(a) * l; x *= 0.985; y *= 0.985; p.push([x, y]); } return p; })();
  const DOTS = Array.from({ length: 140 }, (_, i) => [FV.rnd(i, 63) * 2 - 1, FV.rnd(i, 64) * 2 - 1, FV.rnd(i, 65)]);
  // where the marker is on the cut-away, as a fraction of the radius, at beat b
  const rad = (b) => b < 2 ? 0.1 : b < 9.5 ? 0.1 + 0.6 * Ease.ioSine((b - 2) / 7.5) + 0.02 * Math.sin(b * 9) : b < 13.5 ? 0.7 + 0.3 * Ease.ioC((b - 9.5) / 4) : 1;
  const ANG = -0.78;
  SCENES['walk'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4;
      FV.space(ctx, { t, starA: 0.7 });
      // the cut-away Sun: the outside where the wedge is not, the layers inside the wedge (the upper-right quarter)
      const open = Ease.ioC(clamp(b / 1.2)), w0 = -Math.PI / 2 - 0.1, w1 = w0 + (Math.PI / 2 + 0.2) * open;
      FV.rings(ctx, SX, SY, SR, C.sun2, [1.1, 1.26, 1.48, 1.78], 0.1); FV.glow(ctx, SX, SY, SR * 2.2, C.sun1, 0.25);
      FV.sun(ctx, SX, SY, SR, t, { ringA: 0, cells: 180 });
      ctx.save(); ctx.beginPath(); ctx.moveTo(SX, SY); ctx.arc(SX, SY, SR * 1.01, w0, w1); ctx.closePath(); ctx.clip();
      ctx.fillStyle = '#5E1020'; circle(ctx, SX, SY, SR * 1.02); ctx.fill();
      ctx.fillStyle = C.sun4; circle(ctx, SX, SY, SR); ctx.fill();
      // convection cells in the outer third
      for (let i = 0; i < 9; i++) { const a = w0 + (i + 0.5) / 9 * (Math.PI / 2 + 0.2), cx = SX + Math.cos(a) * SR * 0.85, cy = SY + Math.sin(a) * SR * 0.85; ctx.strokeStyle = rgba(C.sun2, 0.55); ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(cx, cy, SR * 0.1, t * 1.5 + i, t * 1.5 + i + 4.4); ctx.stroke(); }
      ctx.fillStyle = C.sun3; circle(ctx, SX, SY, SR * 0.7); ctx.fill();
      for (let k = 0.3; k < 0.7; k += 0.06) { ctx.strokeStyle = rgba(C.sun1, 0.18); ctx.lineWidth = 2; circle(ctx, SX, SY, SR * k); ctx.stroke(); }
      ctx.fillStyle = C.sun1; circle(ctx, SX, SY, SR * 0.25); ctx.fill(); FV.glow(ctx, SX, SY, SR * 0.4, '#FFFFFF', 0.5);
      ctx.restore();
      const lab = clamp((b - 1.0) / 0.6);
      FV.pill(ctx, 'core', SX + 40, SY - 40, lab, { size: 24 }); FV.pill(ctx, 'light diffuses', SX + SR * 0.5 * Math.cos(-0.9) + 30, SY + SR * 0.5 * Math.sin(-0.9) - 20, clamp((b - 1.2) / 0.6), { size: 24 });
      FV.pill(ctx, 'hot gas boils', SX + SR * 0.86 * Math.cos(-0.25) + 70, SY + SR * 0.86 * Math.sin(-0.25) - 10, clamp((b - 1.4) / 0.6), { size: 24 });
      // the marker on the cut-away
      const r = rad(b), mx = SX + Math.cos(ANG) * SR * r, my = SY + Math.sin(ANG) * SR * r;
      // the magnifier and its leader
      const mk = Ease.outBack(clamp((b - 1.2) / 0.8));
      if (mk > 0) {
        ctx.save(); ctx.strokeStyle = rgba(C.white, 0.7); ctx.lineWidth = 3; ctx.setLineDash([2, 10]); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(MX - MR * 0.9 * mk, MY + MR * 0.3); ctx.stroke(); ctx.restore();
        ctx.save(); ctx.translate(MX, MY); ctx.scale(mk, mk); ctx.beginPath(); ctx.arc(0, 0, MR, 0, TAU); ctx.clip();
        const conv = clamp((b - 9.5) / 0.8);
        ctx.fillStyle = conv > 0 ? toHex(mix('#FF8E2E', C.sun4, conv)) : '#FF8E2E'; ctx.fillRect(-MR, -MR, 2 * MR, 2 * MR);
        if (conv < 1) {
          ctx.globalAlpha = 1 - conv;
          for (const [u, v, s] of DOTS) { ctx.fillStyle = rgba(s < 0.5 ? '#FFD27A' : '#FFB04A', 0.75); circle(ctx, u * MR, v * MR, 5 + 6 * s); ctx.fill(); }
          const steps = Math.floor(clamp((b - 2.0) / 7.5) * PATH.length), sc = 0.9;
          ctx.strokeStyle = rgba('#FFFFFF', 0.75); ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); PATH.slice(0, steps + 1).forEach(([x, y], i) => (i ? ctx.lineTo(x * sc, y * sc) : ctx.moveTo(x * sc, y * sc))); ctx.stroke();
          const [hx, hy] = PATH[Math.min(steps, PATH.length - 1)]; for (let j = Math.max(0, steps - 4); j < steps; j++) { const [x, y] = PATH[j]; FV.glow(ctx, x * sc, y * sc, 30, '#FFFFFF', 0.25); }
          FV.photon(ctx, hx * sc, hy * sc, 0.75, t);
          ctx.globalAlpha = 1;
        }
        if (conv > 0) {
          // rising cells of hot gas, the light riding one up
          ctx.globalAlpha = conv;
          for (let i = 0; i < 5; i++) { const cx = -MR + (i + 0.5) * MR * 0.4, cy = MR * 0.6 - ((b * 60 + i * 80) % (MR * 1.8)); ctx.fillStyle = rgba(i % 2 ? C.sun2 : C.sun3, 0.85); circle(ctx, cx, cy, MR * 0.22); ctx.fill(); ctx.strokeStyle = rgba(C.sun1, 0.8); ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, MR * 0.14, t * 2 + i, t * 2 + i + 4.2); ctx.stroke(); }
          FV.photon(ctx, 0, MR * 0.4 - Ease.ioC(clamp((b - 9.8) / 3.6)) * MR * 1.0, 0.75, t); ctx.globalAlpha = 1;
        }
        ctx.restore();
        ctx.save(); ctx.translate(MX, MY); ctx.scale(mk, mk); ctx.strokeStyle = C.white; ctx.lineWidth = 10; circle(ctx, 0, 0, MR); ctx.stroke(); ctx.strokeStyle = rgba(C.space0, 0.4); ctx.lineWidth = 4; circle(ctx, 0, 0, MR - 7); ctx.stroke(); ctx.restore();
      }
      FV.photon(ctx, mx, my, 0.55, t);
      if (b >= 13.5) { const k = clamp((b - 13.5) / 1.2); FV.glow(ctx, mx, my, 220 * Ease.outC(k), '#FFFFFF', 0.9 * (1 - k)); }
      // the years
      const ck = clamp((b - 2.0) / 7.2), settled = clamp((b - 9.2) / 0.6);
      if (ck > 0) {
        const y = MY + MR + 92;
        if (settled < 1) { const v = Math.floor(Ease.inQ(ck) * 99999 + (b * 7919) % 997); FV.txt(ctx, v.toLocaleString('en-US'), MX, y, { size: 64, weight: 900, align: 'center', a: 1 - settled, color: C.sun0 }); }
        FV.pop(ctx, [['10,000 – 170,000', C.sun1], [' years', C.white]], MX, y, settled, { size: 56, weight: 900 });
        FV.txt(ctx, 'not the same photon all the way: the same energy, passed on', MX, y + 50, { size: 24, weight: 700, align: 'center', color: C.ink2, a: settled });
      }
      FV.caption(ctx, 'Absorbed and given off again, each time in a random direction.', clamp((b - 2.6) / 1.6), { a: 1 - clamp((b - 9.6) / 0.5) });
      FV.caption(ctx, 'Then rising hot gas carries it the last stretch.', clamp((b - 10.2) / 1.4));
    },
  };
})();
