// code (2 bars; 3 in the 30): what you see is what runs. The app's code view (the confetti's JS tab) and its control
// panel slam in. On beat 2 a cursor takes the first slider (조각 수); on beat 3 it drags it from 36 to 72 while the same
// number counts up inside the code (count: 36 → 72) and a dashed wire runs from the slider's row to it; on beat 4 that
// very code fires, 72 pieces, from the number. The headline: 보이는 코드가 / 곧 실행되는 코드. The panels are the
// captured app; only the moving thumb and the two numbers are redrawn in the app's own styles while they change.
(() => {
  const M = MK, CK = 1.5, CX = 120, CY = 430, CROP = [0, 0, 640, 330];      // the code panel
  const PK = 1.45, PXX = 1196, PY = 316;                                       // the control panel
  const NUM = [157, 136, 17, 14], NUM_C = [165, 143];                          // "36" in the code, CSS px
  SCENES['code'] = {
    draw(ctx, t, env) {
      const lt = env.lt, B = env.beatSec, P = env.palette, outAt = env.dur - env.outSec;
      M.paperStage(ctx, t, { lightX: 1600 });
      const ec = styleSpring(lt + 0.16, { f: 2, z: 0.6 }), ep = styleSpring(lt + 0.08, { f: 2, z: 0.6 });
      const v = lerp(36, 72, Ease.ioC(clamp((lt - 3 * B) / B)));
      const hot = clamp((lt - 3 * B + 0.1) / 0.15) * (1 - clamp((lt - 6 * B) / 0.5));
      // the code panel
      const cy = CY + (1 - ec) * 420;
      ctx.save(); ctx.globalAlpha *= clamp(ec * 1.5);
      ctx.shadowColor = 'rgba(10,13,31,0.3)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 24; rr(ctx, CX, cy, CROP[2] * CK, CROP[3] * CK, 18); ctx.fillStyle = '#0A0D24'; ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.save(); rr(ctx, CX, cy, CROP[2] * CK, CROP[3] * CK, 18); ctx.clip();
      M.draw(ctx, v >= 72 ? 'code_72' : 'code_36', CX, cy, CK, { crop: CROP });
      // the count line lights while the value moves; the number counts with the slider
      if (hot > 0) { ctx.save(); ctx.globalAlpha *= 0.5 * hot; ctx.fillStyle = '#0B2FE6'; ctx.fillRect(CX, cy + 132 * CK, CROP[2] * CK, 22 * CK); ctx.restore(); }
      if (v > 36 && v < 72) {
        ctx.fillStyle = hot > 0 ? '#1A2BA0' : '#0A0D25'; ctx.fillRect(CX + NUM[0] * CK, cy + NUM[1] * CK, NUM[2] * CK, NUM[3] * CK);
        ctx.font = `400 ${13 * CK}px ${FAM.mono}`; ctx.fillStyle = '#FFFFFF'; ctx.fillText(String(Math.round(v)), CX + 158.3 * CK, cy + 147 * CK);
      }
      ctx.restore(); ctx.restore();
      // the dashed wire from the slider's row to the number in the code (it runs under the panel)
      const px = PXX + (1 - ep) * 700;
      const th = [px + 12 * PK, PY + M.THUMB_Y * PK], nm = [CX + NUM_C[0] * CK + 20, cy + NUM_C[1] * CK];
      const tie = clamp((lt - 2.8 * B) / 0.4) * (1 - clamp((lt - outAt + 0.2) / 0.3));
      if (tie > 0) {
        ctx.save(); ctx.strokeStyle = P.accent; ctx.lineWidth = 3; ctx.setLineDash([10, 9]); ctx.lineDashOffset = -lt * 60; ctx.globalAlpha *= 0.85;
        ctx.beginPath(); const N = 40; for (let i = 0; i <= N * tie; i++) { const s = i / N, m = 1 - s;
          const qx = m * m * th[0] + 2 * m * s * (th[0] - 160) + s * s * nm[0], qy = m * m * th[1] + 2 * m * s * th[1] + s * s * nm[1];
          i ? ctx.lineTo(qx, qy) : ctx.moveTo(qx, qy); } ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = P.accent; circle(ctx, nm[0], nm[1], 6 * tie); ctx.fill(); ctx.restore();
      }
      // the control panel
      ctx.save(); ctx.globalAlpha *= clamp(ep * 1.5);
      ctx.shadowColor = 'rgba(10,13,31,0.18)'; ctx.shadowBlur = 44; ctx.shadowOffsetY = 20; rr(ctx, px + 8 * PK, PY + 8 * PK, 388 * PK, 254 * PK, 16 * PK); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.shadowColor = 'transparent';
      M.controls(ctx, px, PY, PK, v);
      ctx.restore();
      // the code runs: 72 pieces from the number (again on the last bar in the 30)
      M.confetti(ctx, CX + NUM_C[0] * CK, cy + NUM_C[1] * CK, (lt - 4 * B) * 1000, 2.3, 11, { count: 72 });
      if (env.dur > 10 * B) M.confetti(ctx, CX + NUM_C[0] * CK, cy + NUM_C[1] * CK, (lt - 8 * B) * 1000, 2.3, 23, { count: 72 });
      // the cursor: in, onto the thumb, drag, let go
      const tb = [px + M.thumbX(v) * PK, PY + M.THUMB_Y * PK];
      const ca = Ease.ioC(clamp((lt - 1.2 * B) / (1.6 * B))), cl = Ease.ioC(clamp((lt - 4.3 * B) / 0.6));
      const cxp = lerp(lerp(1900, tb[0], ca), 1900, cl), cyp = lerp(lerp(1120, tb[1], ca), 1100, cl);
      M.cursor(ctx, cxp + 2, cyp + 4, 1.5, lt > 2.9 * B && lt < 4.1 * B ? 1 : 0);
      // the headline and its line
      kinetic(ctx, '보이는 코드가', 118, 200, lt - 0.2, { size: 92, fam: 'display', weight: 900, ls: -4, stagger: 0.03, dur: 0.45, rise: 36, blur: 5, color: P.ink, out: { at: outAt } });
      kinetic(ctx, '곧 실행되는 코드.', 118, 310, lt - 0.42, { size: 92, fam: 'display', weight: 900, ls: -4, stagger: 0.03, dur: 0.45, rise: 36, blur: 5,
        colorFn: (i, ch) => ch === '.' ? '#FF6A2B' : P.ink, out: { at: outAt } });
      kinetic(ctx, '값을 바꾸면 코드가 그대로 바뀌어요', 1200, 790, lt - 1.0, { size: 40, fam: 'sans', weight: 600, ls: -0.5, stagger: 0.015, dur: 0.4, rise: 14, blur: 4, color: P.ink2, out: { at: outAt } });
    },
  };
})();
