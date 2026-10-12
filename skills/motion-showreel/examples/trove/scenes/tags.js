// tags (3 bars, the 30 only): auto tags and summary, from the real link form. A memo is already typed (three
// sentences); the six words the app picked light up one after another, its own one-sentence summary sweeps in under
// the memo (요약 · 지식 그래프 입문 글이에요.), and each picked word flies down into its suggestion chip. The headline on
// the right says it plainly: 태그와 요약은 / 알아서 붙어요. Everything inside the card is the captured form.
(() => {
  const T = TROVE, K = 1.24, CROP = [0, 296, 718, 404];                         // the lower part of the form
  const WORDS = [[66.5, 102.5], [37.5, 60], [107.5, 131], [235, 271], [194, 218], [346, 370]];   // 그래프 지식 입문 키워드 태그 관계 in the memo
  const CHIPS = [[285, 351], [356, 411.5], [417, 471.5], [477.5, 544], [549, 603.5], [609, 665]];
  const WY = [404, 417], CY = [654.5, 682.5], SUM = [24, 509, 670, 40];
  SCENES['tags'] = {
    draw(ctx, t, env) {
      const lt = env.lt, P = env.palette, B = env.beatSec, out = env.phase.out;
      T.stage(ctx, t, { glowX: 520, glowY: 560 });
      const e = styleSpring(lt - 0.05, { f: 1.8, z: 0.7 });
      const ox = 96 + Math.sin(lt * 0.5) * 5, oy = 268 + (1 - e) * 80 + Math.cos(lt * 0.45) * 4;
      const sx = (x) => ox + (x - CROP[0]) * K, sy = (y) => oy + (y - CROP[1]) * K;
      ctx.save(); ctx.globalAlpha *= clamp(e * 1.4);
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 24;
      rr(ctx, ox - 4, oy - 30, CROP[2] * K + 8, CROP[3] * K + 50, 18); ctx.fillStyle = '#111215'; ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1.5; ctx.stroke();
      // the form without the summary and the suggestion chips (they arrive below)
      ctx.save(); ctx.beginPath(); ctx.rect(ox, oy, CROP[2] * K, (505 - CROP[1]) * K); ctx.rect(ox, sy(552), CROP[2] * K, (650 - 552) * K); ctx.rect(ox, sy(650), (282 - CROP[0]) * K, 36 * K); ctx.clip();
      T.draw(ctx, 'form', ox - CROP[0] * K, oy - CROP[1] * K, K); ctx.restore();
      ctx.restore();
      T.label(ctx, 'LINK FORM · 메모', ox + 4, oy - 48, { size: 20, color: P.muted, alpha: clamp(e * 1.4) });
      // the words the app picked light up
      WORDS.forEach(([a, b], i) => {
        const at = 2 * B + i * 0.11, p = Ease.outC(clamp((lt - at) / 0.2)); if (p <= 0) return;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(198,244,50,0.28)';
        rr(ctx, sx(a - 2), sy(WY[0] - 3), (b - a + 4) * K * p, (WY[1] - WY[0] + 6) * K, 4); ctx.fill(); ctx.restore();
        ctx.fillStyle = P.accent; ctx.fillRect(sx(a - 2), sy(WY[1] + 4), (b - a + 4) * K * p, 3);
      });
      // the summary sweeps in
      const sp = Ease.ioC(clamp((lt - 3.5 * B) / 0.5));
      if (sp > 0) {
        ctx.save(); ctx.beginPath(); ctx.rect(sx(SUM[0]), sy(SUM[1]), SUM[2] * K * sp, SUM[3] * K); ctx.clip();
        T.draw(ctx, 'form', ox - CROP[0] * K, oy - CROP[1] * K, K); ctx.restore();
        if (sp < 1) { ctx.fillStyle = P.accent; ctx.fillRect(sx(SUM[0]) + SUM[2] * K * sp - 2, sy(SUM[1]), 3, SUM[3] * K); }
      }
      // the suggestion label, then each word flies into its chip
      const lp = clamp((lt - 4.6 * B) / 0.2);
      if (lp > 0) { ctx.save(); ctx.globalAlpha *= lp; ctx.beginPath(); ctx.rect(sx(234), sy(650), 50 * K, 36 * K); ctx.clip(); T.draw(ctx, 'form', ox - CROP[0] * K, oy - CROP[1] * K, K); ctx.restore(); }
      CHIPS.forEach(([a, b], i) => {
        const at = 5 * B + i * 0.25 * B, p = clamp((lt - at + 0.3) / 0.3); if (p <= 0) return;
        const w = WORDS[i], fx = sx((w[0] + w[1]) / 2), fy = sy((WY[0] + WY[1]) / 2), tx = sx((a + b) / 2), ty = sy((CY[0] + CY[1]) / 2);
        const f = Ease.ioC(p), x = lerp(fx, tx, f), y = lerp(fy, ty, f) - Math.sin(Math.PI * f) * 70;
        if (p < 1) { ctx.save(); ctx.fillStyle = P.accent; ctx.shadowColor = P.accent; ctx.shadowBlur = 18; circle(ctx, x, y, 7); ctx.fill(); ctx.restore(); }
        else {
          const pop = styleSpring(lt - at, { f: 3, z: 0.45 }), glow = 0.5 + 0.5 * Math.sin(lt * 3 - i * 0.9);
          ctx.save(); ctx.translate(tx, ty); ctx.scale(0.7 + 0.3 * pop, 0.7 + 0.3 * pop); ctx.translate(-tx, -ty);
          ctx.beginPath(); ctx.rect(sx(a - 1), sy(CY[0] - 1), (b - a + 2) * K, (CY[1] - CY[0] + 2) * K); ctx.clip();
          T.draw(ctx, 'form', ox - CROP[0] * K, oy - CROP[1] * K, K); ctx.restore();
          ctx.save(); ctx.globalAlpha *= 0.35 * glow * clamp((lt - at) / 0.4); rr(ctx, sx(a), sy(CY[0]), (b - a) * K, (CY[1] - CY[0]) * K, 8); ctx.strokeStyle = P.accent; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
        }
      });
      // the headline on the right
      T.label(ctx, 'AUTO TAGS · SUMMARY', 1196, 384, { size: 22, color: P.muted, alpha: clamp(rm(lt, 0.2, 0.5)) * (1 - out) });
      T.headline(ctx, ['태그와 요약은', '알아서 붙어요.'], 1192, 508, lt - 0.3, { size: 92, colors: [P.ink, P.accent], out: { at: env.dur - env.outSec } });
      kinetic(ctx, '서버 없이, 이 브라우저 안에서 뽑아요', 1196, 718, lt - 1.1, { size: 32, fam: 'sans', weight: 500, color: P.ink2, ls: -0.5, stagger: 0.018, dur: 0.45, rise: 14, blur: 4, out: { at: env.dur - env.outSec } });
    },
  };
})();
