// tracks (2 bars, 3 in the 30): panel c. The embryo seen from the back (dorsal view); 300 lineage tracks grow from
// 6 to 24 hpf with a running clock (beats 0-4.5), each a fading trail with a bright head, coloured by lineage
// (notochord green, muscle magenta, neural cyan, skin grey), converging on the midline. On beat 5 the notochord
// tracks lock (the others dim) and the commitment timeline below marks 8 hpf. Hold: the heads keep breathing.
(() => {
  SCENES['tracks'] = {
    draw(ctx, t, env) {
      const E = window.EMB, D = E.data(), B = env.beatSec, b = env.lt / B;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      E.label(ctx, 'c', 'Every tracked cell, 6 to 24 hpf, by lineage', clamp(b * 2));
      const u = clamp(b / 4.5), k = u * 18, hpf = 6 + u * 18, focus = Ease.ioSine(clamp((b - 5) / 0.8));
      const CX = 860, CY = 470, SC = 420, pr = (p) => E.proj(p, 0, Math.PI / 2 - 0.25, CX, CY, SC);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      D.tracks.forEach(([lin, pts], i) => {
        const col = E.LIN[lin], dim = lin === 0 ? 1 : 1 - 0.75 * focus, n = Math.floor(k);
        ctx.strokeStyle = rgba(col, 0.32 * dim); ctx.lineWidth = lin === 0 ? 2.4 : 1.6;
        ctx.beginPath();
        for (let j = 0; j <= Math.min(18, n + 1); j++) {
          const f = j <= n ? 1 : k - n, a = pts[Math.max(0, j - 1)], c = pts[j], p = [lerp(a[0], c[0], f), lerp(a[1], c[1], f), lerp(a[2], c[2], f)];
          const [x, y] = pr(p); j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          if (j === Math.min(18, n + 1)) { ctx.stroke(); E.glow(ctx, x, y, col, lin === 0 ? 5 : 3.5, (0.8 + 0.2 * Math.sin(t * 2 + i)) * dim); ctx.globalAlpha = 1; }
        }
      });
      ctx.restore(); ctx.globalAlpha = 1;
      E.stamp(ctx, `${hpf.toFixed(1)} hpf`, 1580, 200, clamp(b * 2));
      E.scalebar(ctx, 1580, 300, 140, '100 µm', clamp(b * 2));
      D.lineages.forEach((l, i) => { ctx.fillStyle = E.LIN[i]; ctx.fillRect(1580, 380 + i * 38 - 12, 14, 14); E.txt(ctx, l, 1606, 380 + i * 38, { size: 20, mono: true, color: C.ink2 }); });
      // the commitment timeline (bottom), from beat 5
      if (b > 4.6) {
        const a = Ease.ioSine(clamp((b - 4.6) / 0.6)), X0 = 260, X1 = 1460, Y = 920, hx = (h) => X0 + (h - 6) / 18 * (X1 - X0);
        ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = rgba('#FFFFFF', 0.3); ctx.fillRect(X0, Y, X1 - X0, 2);
        for (let h = 6; h <= 24; h += 2) { ctx.fillRect(hx(h), Y - 6, 2, 12); E.txt(ctx, `${h}`, hx(h), Y + 34, { size: 16, mono: true, color: C.muted, align: 'center' }); }
        D.commit.forEach((c, i) => { ctx.fillStyle = E.LIN[i]; circle(ctx, hx(c), Y - 24 - i * 0, i === 0 ? 10 : 6); ctx.fill(); });
        ctx.restore();
        E.txt(ctx, 'notochord commits at 8 hpf', hx(D.commit[0]) + 18, Y - 44, { size: 22, weight: 600, color: E.CH.noto, a });
        E.txt(ctx, 'hpf', X1 + 20, Y + 6, { size: 18, mono: true, color: C.muted, a });
      }
    },
  };
})();
