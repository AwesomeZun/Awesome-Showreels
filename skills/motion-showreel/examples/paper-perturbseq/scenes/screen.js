// screen (2 bars, the 30 only): the pooled screen. A microfluidic chip as a glass slab with glowing channels: edited T
// cells (each with a dot in its guide's programme colour) flow in from the left, barcode beads come down from the top,
// and at the junction the oil pinches off one droplet per cell and bead; the droplets squeeze along the outlet and are
// read, each read leaving a barcode line that scrolls up the right edge. The count runs up to 1.2 million cells; 612
// guides, 9 donors.
(() => {
  const Y = 560, JX = 1000, X1 = 1580;
  SCENES['screen'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, lt = env.lt, D = PS.data();
      PS.bg(ctx); PS.chrome(ctx, 'a', 'Pooled screen: one droplet, one cell, one barcode', clamp(b * 2));
      const k = Ease.outExpo(clamp(b / 1.2));
      // the chip: a glass slab, channels cut into it, ports at the ends
      ctx.save(); ctx.globalAlpha = k;
      ctx.fillStyle = 'rgba(56,189,248,0.045)'; rr(ctx, 90, 190, X1 - 10, 660, 36); ctx.fill();
      ctx.strokeStyle = 'rgba(125,211,252,0.22)'; ctx.lineWidth = 2; ctx.stroke();
      const chan = (pts, w) => {
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.strokeStyle = 'rgba(14,116,144,0.55)'; ctx.lineWidth = w + 6; ctx.stroke();
        ctx.strokeStyle = 'rgba(8,47,73,0.95)'; ctx.lineWidth = w; ctx.stroke();
      };
      chan([[170, Y], [JX, Y]], 84); chan([[JX - 110, 250], [JX - 110, Y]], 64); chan([[JX, 290], [JX, Y - 40]], 36); chan([[JX, 830], [JX, Y + 40]], 36); chan([[JX, Y], [X1, Y]], 104);
      for (const [x, y, r] of [[170, Y, 54], [JX - 110, 250, 44], [JX, 290, 30], [JX, 830, 30], [X1, Y, 62]]) { ctx.strokeStyle = 'rgba(125,211,252,0.5)'; ctx.lineWidth = 3; circle(ctx, x, y, r); ctx.stroke(); }
      ctx.restore();
      PS.txt(ctx, 'edited T cells', 170, Y - 80, { size: 22, mono: true, color: '#A5F3FC', align: 'center', a: k });
      PS.txt(ctx, 'barcode beads', JX - 110, 200, { size: 22, mono: true, color: PS.AMBER, align: 'center', a: k });
      PS.txt(ctx, 'oil', JX + 40, 300, { size: 22, mono: true, color: C.muted, a: k });
      const rate = 2.6;                                                    // droplets per second, all from one clock
      for (let i = -24; i < 70; i++) {
        const born = i / rate, age = lt - born; if (age < -4 || age > 7) continue;
        const prog = PS.PROG[D.module[(i % 60 + 60) % 60]], wob = Math.sin(i * 2.1) * 10;
        if (age < 0) {                                                     // a cell and a bead on their way to the junction
          const x = JX - 30 + age * 250; if (x < 200) continue;
          PS.glow(ctx, x, Y + wob, 40, '#22D3EE', 0.3);
          ctx.fillStyle = radial(ctx, x - 5, Y + wob - 5, 0, 18, [[0, '#CFFAFE'], [0.6, '#22D3EE'], [1, '#0E7490']]); circle(ctx, x, Y + wob, 17); ctx.fill();
          ctx.fillStyle = rgba('#0C4A6E', 0.8); circle(ctx, x + 2, Y + wob + 2, 7); ctx.fill();
          ctx.fillStyle = prog; circle(ctx, x + 10, Y + wob - 9, 5); ctx.fill();
          const by = Y - 10 + age * 260; if (by > 280) { ctx.fillStyle = radial(ctx, JX - 114, by - 4, 0, 13, [[0, '#FEF3C7'], [1, '#D97706']]); circle(ctx, JX - 110, by, 12); ctx.fill(); }
        } else {                                                           // a droplet holding both
          const x = JX + 30 + age * 200; if (x > X1 - 20) continue;
          const r = 46 * clamp(age * 3 + 0.2), sq = 1 + 0.08 * Math.sin(age * 9 + i);
          ctx.save(); ctx.translate(x, Y); ctx.scale(sq, 1 / sq);
          ctx.fillStyle = 'rgba(14,165,233,0.13)'; circle(ctx, 0, 0, r); ctx.fill();
          ctx.strokeStyle = 'rgba(186,230,253,0.75)'; ctx.lineWidth = 2.5; circle(ctx, 0, 0, r); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r * 0.78, -2.4, -1.6); ctx.stroke();
          ctx.fillStyle = radial(ctx, -14, -2, 0, 16, [[0, '#CFFAFE'], [0.6, '#22D3EE'], [1, '#0E7490']]); circle(ctx, -10, 2, 15); ctx.fill();
          ctx.fillStyle = prog; circle(ctx, -2, -8, 4.5); ctx.fill();
          ctx.fillStyle = radial(ctx, 15, -10, 0, 11, [[0, '#FEF3C7'], [1, '#D97706']]); circle(ctx, 18, -8, 10); ctx.fill();
          ctx.restore();
          if (x > X1 - 140) PS.glow(ctx, x, Y, 110, PS.MAG, clamp((x - X1 + 140) / 120) * 0.45);
        }
      }
      // reads scrolling up the right edge
      for (let i = 0; i < 24; i++) {
        const cyc = Math.floor((lt * 100 + i * 37) / 900), y = 1000 - ((lt * 100 + i * 37) % 900); if (y < 150) continue;
        let s = ''; for (let q = 0; q < 14; q++) s += 'ACGT'[Math.floor(hash(i * 31 + q + cyc * 7) * 4)];
        PS.txt(ctx, s, 1700, y, { size: 19, mono: true, color: i % 5 === 0 ? PS.MAG : '#64748B', a: clamp(b - 1) * clamp((y - 150) / 120) });
      }
      const c = clamp((b - 1) / 5);
      PS.txt(ctx, Math.round(1200000 * Ease.outQuint(c)).toLocaleString('en-US'), 120, 940, { size: 66, mono: true, weight: 600, color: C.ink, a: clamp((b - 1) * 2) });
      PS.txt(ctx, 'cells read, each with its guide', 560, 934, { size: 26, color: C.ink2, a: clamp((b - 1) * 2) });
      PS.txt(ctx, '612 guides · 9 donors', 560, 972, { size: 24, mono: true, color: PS.MAG, a: clamp((b - 2.5) * 2) });
      PS.vignette(ctx, 0.35);
    },
  };
})();
