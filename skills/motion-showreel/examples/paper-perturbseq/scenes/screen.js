// screen (2 bars, 3 in the 30): panel a, the pooled screen. A field of T cells in a well (left); one guide per cell,
// each cell taking its barcode colour in a sweep (beats 0-2); the cells stream right through a microfluidic channel
// and are caught one by one in droplets (2-4), counters for 612 regulators, 9 donors and 1.2 M cells rolling up.
(() => {
  SCENES['screen'] = {
    draw(ctx, t, env) {
      const S = window.PS, B = env.beatSec, b = env.lt / B, D = S.data();
      S.bg(ctx); S.chrome(ctx, 'a', 'Pooled CRISPR knockout, read out cell by cell');
      // the well
      const WX = 330, WY = 560, WR = 260;
      ctx.strokeStyle = rgba(C.ink2, 0.5); ctx.lineWidth = 2; circle(ctx, WX, WY, WR); ctx.stroke();
      for (let i = 0; i < 220; i++) {
        const a = hash(i * 3.1) * TAU, r = Math.sqrt(hash(i * 7.7)) * (WR - 16), x = WX + Math.cos(a) * r + Math.sin(t * 0.8 + i) * 2, y = WY + Math.sin(a) * r + Math.cos(t * 0.7 + i) * 2;
        const got = b > (x - (WX - WR)) / (2 * WR) * 2, c = got ? S.PROG[i % 5] : '#334155';
        ctx.fillStyle = rgba(c, 0.9); circle(ctx, x, y, 7); ctx.fill();
        if (got) { ctx.fillStyle = C.bg; ctx.fillRect(x - 3, y - 1, 6, 2); }
      }
      S.txt(ctx, '612 guides, one per cell', WX, WY + WR + 50, { size: 22, color: C.ink2, align: 'center', a: clamp(b - 0.5) });
      // the channel and the droplets
      const CY = 560, X0 = WX + WR + 40, X1 = 1500;
      ctx.strokeStyle = rgba(C.ink2, 0.35); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X0, CY - 24); ctx.lineTo(X1, CY - 24); ctx.moveTo(X0, CY + 24); ctx.lineTo(X1, CY + 24); ctx.stroke();
      if (b > 2) for (let k = 0; k < 14; k++) {
        const u = ((env.lt - 2 * B) * 0.35 + k / 14) % 1, x = X0 + u * (X1 - X0 + 300);
        if (x > X1 + 260) continue;
        const caught = x > X1 - 120, dx = caught ? X1 - 120 + (x - X1 + 120) * 0.6 : x;
        ctx.fillStyle = rgba(S.PROG[k % 5], 0.95); circle(ctx, dx, CY, 8); ctx.fill();
        if (caught) { ctx.strokeStyle = rgba(C.accent2, 0.7); ctx.lineWidth = 2.5; circle(ctx, dx, CY, 22); ctx.stroke(); }
      }
      // counters (right)
      const cx = 1580, rows = [['612', 'regulators'], ['9', 'donors'], [`${(1.2 * Ease.outExpo(clamp((b - 3) / 1.5))).toFixed(2)} M`, 'cells']];
      rows.forEach(([v, l], i) => { const p = clamp((b - 1 - i * 0.6) * 2); S.rise(ctx, v, cx, 380 + i * 140, p, { size: 72, weight: 600, mono: true, color: i === 2 ? C.accent : C.ink }); S.rise(ctx, l, cx, 418 + i * 140, p, { size: 22, color: C.muted }); });
    },
  };
})();
