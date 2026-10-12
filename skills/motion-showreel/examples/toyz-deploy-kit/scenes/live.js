// live (3 bars, 4 in the 30): what you type is what ships. Left, the app's real identity form; right, its real live
// output tray. The project name is cleared and retyped (Moss, then Moss Timer), each stage captured: the tray marks
// every file it re-made UPDATED, says so itself (방금 12개 파일이 다시 만들어졌어요) and its OG image and favicon follow
// the new name (Moss Timer, MT). Blue ticks pulse down the updated rows. Headline: 적는 대로 / 출시 파일이 바뀌어요.
(() => {
  const D = DK, IK = 1.2, IX = 96, IY = 476, TK = 1.05, TX = 1444, TY = 64;
  SCENES['live'] = {
    draw(ctx, t, env) {
      const lt = env.lt, P = env.palette, B = env.beatSec, out = env.phase.out;
      D.stage(ctx, t);
      const ist = lt < 2 * B ? 'identity' : lt < 5 * B ? 'identity_0' : lt < 6.5 * B ? 'identity_1' : 'identity_2';
      const tst = lt < 2 * B ? 'live' : lt < 6.5 * B ? 'live_0' : 'live_2';
      const e = styleSpring(lt + 0.1, { f: 3, z: 0.6 });
      ctx.save(); ctx.globalAlpha *= clamp(e * 1.5); ctx.translate((1 - e) * -100, 0);
      ctx.shadowColor = 'rgba(10,11,16,0.12)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12; D.draw(ctx, ist, IX, IY, IK); ctx.restore();
      ctx.save(); ctx.globalAlpha *= clamp(e * 1.5); ctx.translate((1 - e) * 100, 0);
      ctx.shadowColor = 'rgba(10,11,16,0.3)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 20; D.draw(ctx, tst, TX, TY, TK); ctx.restore();
      // UPDATED rows pulse in turn after each change
      const rows = [0, 3, 6, 7, 8, 9, 10, 14, 15, 16, 17, 18];                // the rows the app marks UPDATED
      [[2, 'live_0'], [6.5, 'live_2']].forEach(([at]) => {
        const k = (lt - at * B) / (1.6 * B); if (k < 0 || k > 1.3) return;
        rows.forEach((r, i) => { const a = clamp(1 - Math.abs(k * 12 - i) / 2); if (a <= 0) return;
          const y = TY + (267 + r * 30.05) * TK; ctx.save(); ctx.globalAlpha *= a * 0.9; ctx.fillStyle = '#D4FF3A'; ctx.fillRect(TX + 14 * TK, y, 4, 16 * TK); ctx.globalAlpha *= 0.3; ctx.fillRect(TX + 18 * TK, y, 336 * TK, 16 * TK); ctx.restore(); });
      });
      if (lt > 6.5 * B) {                                                      // the tray's own line, ringed
        const k = clamp((lt - 6.9 * B) / 0.3); ctx.save(); ctx.globalAlpha *= k; ctx.strokeStyle = '#D4FF3A'; ctx.lineWidth = 3; rr(ctx, TX + 14 * TK, TY + 57 * TK, 214 * TK, 22 * TK, 6); ctx.stroke(); ctx.restore();
      }
      D.label(ctx, '01 SETUP · IDENTITY', 104, 450, { size: 20, alpha: clamp(e) * (1 - out) });
      D.headline(ctx, ['적는 대로', '출시 파일이 바뀌어요.'], 100, 214, lt - 0.1, { size: 92, gap: 104, out: { at: env.dur - env.outSec } });
    },
  };
})();
