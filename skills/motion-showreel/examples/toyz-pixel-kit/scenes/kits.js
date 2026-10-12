// kits (2 bars; 3 in the 30): change the kit, everything follows. The wall of six turns over frame by frame (a card flip
// a sixteenth apart) from 숨결 요가 스튜디오 to 모래알 베이커리 on beat 1 and to PADO Coffee Roasters on beat 5: every
// size redrawn by the app in the new kit's colours, type and logo, with that kit's own design. The kit's card from
// the app sits top right. The headline: 킷을 바꾸면 전부 함께 바뀌어요.
(() => {
  const P = PK, SEQ = [['soom', 1], ['morae', 0], ['pado', 2]], FLIPS = [1, 5];
  SCENES['kits'] = {
    draw(ctx, t, env) {
      const lt = env.lt, B = env.beatSec, outAt = env.dur - env.outSec, out = env.phase.out;
      P.studio(ctx, t, { gx: 1500, gy: 120, glow: 0.14 });
      const slots = P.wall(1.0, 960, 350);
      slots.forEach(([x, y, w, h], i) => {
        let k = 0, flip = null;
        FLIPS.forEach((b, j) => { const a = b * B + i * 0.25 * B, p = clamp((lt - a) / (0.5 * B)); if (lt >= a + 0.25 * B) k = j + 1; if (p > 0 && p < 1) flip = p < 0.5 ? p * 2 : (p - 1) * 2; });
        P.frame(ctx, SEQ[k][0] + '_' + i, x, y, w, h, { flip: flip ?? 0 });
      });
      // the active kit's card (the app's own), crossfading with the wall
      let kk = 0; FLIPS.forEach((b, j) => { if (lt >= b * B + 0.6 * B) kk = j + 1; });
      const ce = styleSpring(lt - 0.15, { f: 2.2, z: 0.7 }); ctx.save(); ctx.globalAlpha *= clamp(ce * 1.6) * (1 - out);
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 30; rr(ctx, 1380, 120, 300 * 1.45, 102 * 1.45, 12); ctx.fillStyle = '#17151A'; ctx.fill(); ctx.shadowColor = 'transparent';
      const sw = FLIPS.map((b) => clamp((lt - b * B - 0.6 * B) / 0.25)); const cardOf = (j) => 'kitcards_' + SEQ[j][1];
      P.draw(ctx, cardOf(Math.max(0, kk - 1)), 1380, 120, 1.45, { alpha: kk === 0 ? 1 : 1 - sw[kk - 1] }); if (kk > 0) P.draw(ctx, cardOf(kk), 1380, 120, 1.45, { alpha: sw[kk - 1] });
      ctx.restore();
      P.label(ctx, '03 · BRAND KITS · 3', 124, 110, { size: 20, alpha: clamp(rm(lt, 0.05, 0.3)) * (1 - out) });
      P.headline(ctx, ['킷을 바꾸면 전부 함께 바뀌어요.'], 116, 230, lt - 0.1, { size: 84, out: { at: outAt } });
    },
  };
})();
