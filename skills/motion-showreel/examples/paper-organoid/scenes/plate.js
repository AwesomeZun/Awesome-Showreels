// plate (2 bars, 3 in the 30): panel c. The protocol as a notebook timeline (ENR medium days 0-7, the 24-h WNT pulse
// drawn as a block that slides to day 2, 3, 4, 5 with the columns it belongs to), and the 96-well plate under it
// filling well by well in a sweep (beats 2-4.5), each well's colour its enterocyte share; on beat 5 the day-4 columns
// ring and the best condition is marked. Hold: a highlight passes over the plate row by row.
(() => {
  const CONDCOLS = { control: [1, 2], 'day 2': [3, 4, 5], 'day 3': [6, 7, 8], 'day 4': [9, 10], 'day 5': [11, 12] };
  const shade = (v) => toHex(mix('#F6E4EC', '#8E0F43', clamp((v - 10) / 40)));
  SCENES['plate'] = {
    draw(ctx, t, env) {
      const O = window.ORG, D = O.data(), B = env.beatSec, b = env.lt / B;
      O.page(ctx);
      O.txt(ctx, 'c', 200, 120, { size: 40, weight: 700, color: C.accent }); O.txt(ctx, 'One 24-h WNT pulse, moved day by day', 244, 118, { size: 28, weight: 600 });
      // timeline
      const TX = 260, TW = 1300, TY = 230, dx = (d) => TX + d / 7 * TW;
      ctx.fillStyle = rgba(C.accent2, 0.18); ctx.fillRect(TX, TY, TW, 34); O.txt(ctx, 'ENR medium', TX + 12, TY + 24, { size: 20, mono: true, color: C.accent2 });
      for (let d = 0; d <= 7; d++) { ctx.fillStyle = C.ink; ctx.fillRect(dx(d), TY + 40, 1.5, 10); O.txt(ctx, `D${d}`, dx(d), TY + 74, { size: 18, mono: true, align: 'center' }); }
      const pd = 2 + Math.min(3, Math.floor(clamp(b / 2) * 4)), pulseX = dx(pd);
      ctx.fillStyle = C.accent; ctx.fillRect(pulseX, TY - 6, TW / 7, 46); O.txt(ctx, `WNT pulse · day ${pd}`, pulseX + 8, TY + 24, { size: 20, mono: true, weight: 600, color: '#FFFFFF' });
      // the plate
      const PX = 420, PY = 400, CW = 76, RH = 58;
      rr(ctx, PX - 40, PY - 50, 12 * CW + 80, 8 * RH + 90, 22); ctx.fillStyle = rgba('#FFFFFF', 0.7); ctx.fill(); ctx.strokeStyle = rgba(C.ink, 0.35); ctx.lineWidth = 2; ctx.stroke();
      for (let c = 1; c <= 12; c++) O.txt(ctx, `${c}`, PX + (c - 0.5) * CW, PY - 18, { size: 18, mono: true, align: 'center', color: C.muted });
      'ABCDEFGH'.split('').forEach((r, i) => O.txt(ctx, r, PX - 22, PY + (i + 0.6) * RH, { size: 18, mono: true, align: 'center', color: C.muted }));
      D.plate.forEach(([r, c, cond, v], k) => {
        const i = r.charCodeAt(0) - 65, x = PX + (c - 0.5) * CW, y = PY + (i + 0.5) * RH, p = clamp((b - 2 - (c - 1) * 0.15 - i * 0.03) * 3);
        ctx.fillStyle = rgba('#FFFFFF', 1); circle(ctx, x, y, 24); ctx.fill(); ctx.strokeStyle = rgba(C.ink, 0.3); ctx.lineWidth = 1.5; ctx.stroke();
        if (p > 0) { ctx.fillStyle = shade(v); ctx.globalAlpha = p; circle(ctx, x, y, 22 * Ease.ioSine(p)); ctx.fill(); ctx.globalAlpha = 1; }
      });
      // column labels and the best condition
      Object.entries(CONDCOLS).forEach(([k, cols]) => { const x0 = PX + (cols[0] - 1) * CW, x1 = PX + cols[cols.length - 1] * CW; O.txt(ctx, k, (x0 + x1) / 2, PY + 8 * RH + 30, { size: 18, mono: true, align: 'center', color: k === 'day 4' ? C.accentInk : C.ink2, a: clamp(b - 3) }); });
      if (b > 5) { const a = Ease.ioSine(clamp((b - 5) / 0.6)), x0 = PX + 8 * CW, w = 2 * CW; ctx.strokeStyle = rgba(C.accent, a); ctx.lineWidth = 4; rr(ctx, x0 + 4, PY - 4, w - 8, 8 * RH + 8, 16); ctx.stroke(); O.note(ctx, 'best: pulse on day 4', x0 + w + 40, PY + 4 * RH, clamp((b - 5.2) * 1.5), { size: 26, color: C.accentInk }); }
      if (b > 6) { const r = Math.floor((b - 6) * 4) % 8; ctx.fillStyle = rgba('#FFFFFF', 0.25); ctx.fillRect(PX, PY + r * RH, 12 * CW, RH); }
      for (let i = 0; i < 6; i++) { ctx.fillStyle = shade(10 + i * 8); ctx.fillRect(1500 + i * 40, 480, 40, 18); } O.txt(ctx, 'enterocytes 10–50%', 1500, 530, { size: 18, mono: true, color: C.muted });
    },
  };
})();
