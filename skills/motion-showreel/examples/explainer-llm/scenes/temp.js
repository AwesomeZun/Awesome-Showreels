// temp (3 bars, the 60 only): temperature. The softmax formula gains a /T in both exponents (a morph), a thermometer
// for T rises beside the chart, and the chart follows it live: turned down to T = 0.4 the model nearly always says
// mat; turned up to T = 2.5 the rarer words rise and the other ten words together get a real share; then back to 1.
(() => {
  const TX = 1700, TY0 = 820, TY1 = 380, TMAX = 3;
  const ty = (T) => TY0 - (T / TMAX) * (TY0 - TY1);
  // T: down to 0.4, drifting lower, up to 2.5, drifting higher, back to 1 (never quite still)
  const KEYS = [[0, 1], [2.6, 1], [4.8, 0.42], [5.4, 0.36], [8.0, 2.45], [8.9, 2.6], [11.3, 1], [12, 1]];
  function tOf(b) {
    for (let i = 1; i < KEYS.length; i++) { const [b0, v0] = KEYS[i - 1], [b1, v1] = KEYS[i]; if (b <= b1) return VM.lerp(v0, v1, Ease.ioSine(clamp((b - b0) / (b1 - b0)))); }
    return 1;
  }
  SCENES['temp'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, T = tOf(b);
      VM.bg(ctx);
      VM.chart(ctx, VM.chartP(T), { hl: 'mat' });
      // the thermometer
      const k = Ease.ioC(clamp((b - 1.4) / 1.0));
      if (k > 0) {
        ctx.save(); ctx.globalAlpha *= k;
        ctx.fillStyle = rgba(VM.INK, 0.08); rr(ctx, TX - 14, TY1 - 20, 28, TY0 - TY1 + 40, 14); ctx.fill();
        ctx.strokeStyle = rgba(VM.INK, 0.5); ctx.lineWidth = 2; rr(ctx, TX - 14, TY1 - 20, 28, TY0 - TY1 + 40, 14); ctx.stroke();
        const yk = VM.lerp(TY0, ty(T), k);
        ctx.fillStyle = linear(ctx, 0, TY0, 0, TY1, [[0, '#58C4DD'], [0.35, '#B189D9'], [1, VM.PINK]]); rr(ctx, TX - 8, yk, 16, TY0 + 12 - yk, 8); ctx.fill();
        for (let v = 0.5; v <= TMAX + 1e-6; v += 0.5) { const y = ty(v); ctx.fillStyle = rgba(VM.INK, 0.6); ctx.fillRect(TX + 20, y - 1, Number.isInteger(v) ? 18 : 10, 2); if (Number.isInteger(v)) VM.txt(ctx, String(v), TX + 46, y + 9, { size: 26, color: VM.DIM }); }
        ctx.fillStyle = VM.PINK; circle(ctx, TX, yk, 17); ctx.fill(); ctx.strokeStyle = VM.BG; ctx.lineWidth = 4; circle(ctx, TX, yk, 10); ctx.stroke();
        const fT = VM.F(ctx, { seq: [{ s: 'T', it: true, col: VM.PINK }, ' = ' + T.toFixed(2)] }, 40, TX - 40, yk + 14, { align: 'right' }); VM.drawF(ctx, fT, 1);
        VM.txt(ctx, 'temperature', TX, TY0 + 64, { size: 28, it: true, align: 'center', color: VM.DIM });
        ctx.restore();
      }
      VM.head(ctx);
      const F = VM.formulas(ctx), m = clamp((b - 0.5) / 1.2);
      VM.panel(ctx, m > 0 ? F.pT : F.p, 1);
      if (m > 0 && m < 1) VM.morph(ctx, F.p, F.pT, m); else VM.drawF(ctx, m >= 1 ? F.pT : F.p, 1);
      VM.caption(ctx, [['Turned down, it nearly always says ', VM.INK], ['mat', VM.KIND.place], ['.', VM.INK]], clamp((b - 3.0) / 1.0), { a: 1 - clamp((b - 5.4) / 0.4) });
      VM.caption(ctx, [['Turned up, rarer words get a real chance.', VM.INK]], clamp((b - 6.0) / 1.0), { a: 1 - clamp((b - 9.0) / 0.4) });
      VM.caption(ctx, [['Temperature ', VM.PINK], ['divides every score before softmax.', VM.INK]], clamp((b - 9.6) / 1.2));
    },
  };
})();
