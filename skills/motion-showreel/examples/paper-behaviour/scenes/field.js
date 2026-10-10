// field (2 bars, 3 in the 30): ten minutes in the open field, side by side. Two arenas seen from above, vehicle on the
// left and BXM-2 on the right; one mouse in each runs its simulated track (10 minutes in the scene's length, the clock
// running), turned to its heading, its path drawn behind it in the group's colour. The vehicle mouse hugs the walls;
// the BXM-2 mouse crosses the centre zone. Each arena counts its mouse's time in the centre as it goes.
(() => {
  const S = 14, Y = 230, XS = { vehicle: 250, 'BXM-2': 1110 };
  SCENES['field'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, n = Math.round(env.dur / B), d = BH.data();
      BH.bg(ctx);
      const prog = clamp((b - 0.5) / (n - 1)), N = d.example.vehicle.length, upto = Math.max(1, Math.floor(prog * (N - 1)));
      BH.txt(ctx, 'b   Open field, 10 minutes, tracked from above', 96, 96, { size: 26, weight: 600 });
      BH.txt(ctx, `${String(Math.floor(prog * 10)).padStart(2, '0')}:${String(Math.floor((prog * 600) % 60)).padStart(2, '0')} / 10:00`, W - 96, 96, { size: 26, mono: true, align: 'right', color: BH.INK2 });
      for (const g of d.groups) {
        const x0 = XS[g], tr = d.example[g], col = BH.GCOL[g];
        BH.card(ctx, x0 - 40, Y - 90, d.box * S + 80, d.box * S + 190, clamp(b / 0.5));
        BH.txt(ctx, g === 'vehicle' ? 'vehicle' : 'BXM-2', x0, Y - 40, { size: 30, weight: 700, color: col, a: clamp(b * 2) });
        BH.arena(ctx, x0, Y, S, clamp((b - 0.2) / 0.5));
        // the path so far, then the mouse at its head
        ctx.save(); ctx.lineWidth = 1.8; ctx.strokeStyle = rgba(col, 0.6); ctx.lineJoin = 'round'; BH.track(ctx, tr, 0, upto, x0, Y, S); ctx.restore();
        const p = tr[upto], q = tr[Math.max(0, upto - 3)], ang = Math.atan2(p[1] - q[1], p[0] - q[0]);
        const cc = (v) => clamp(v, 3.5, d.box - 3.5);                     // a body, not a point: keep it inside
        if (b > 0.5) BH.mouseTop(ctx, x0 + cc(p[0]) * S, Y + cc(p[1]) * S, ang, 8 * S);
        let inC = 0; for (let i = 0; i <= upto; i++) if (Math.abs(tr[i][0] - 20) < 10 && Math.abs(tr[i][1] - 20) < 10) inC++;
        BH.txt(ctx, 'time in centre', x0, Y + d.box * S + 54, { size: 20, color: BH.INK2, a: clamp(b - 0.5) });
        BH.txt(ctx, `${(inC / (upto + 1) * 100).toFixed(1)}%`, x0 + d.box * S, Y + d.box * S + 58, { size: 34, mono: true, weight: 700, color: col, align: 'right', a: clamp(b - 0.5) });
      }
      BH.txt(ctx, `×${Math.round(600 / ((n - 1) * B))} speed`, W / 2, Y + 290, { size: 18, mono: true, color: '#94A3B8', align: 'center', a: clamp(b - 0.5) });
      BH.welfare(ctx);
    },
  };
})();
