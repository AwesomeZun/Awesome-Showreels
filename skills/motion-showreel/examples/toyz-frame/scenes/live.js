// live (2 bars, 3 in the 30): what you type is the portfolio. The headline lands top left (적는 즉시 / 포트폴리오가
// 돼요.), the app's real name field below it; on the right a window holds the app's real live preview. The name is
// typed one syllable per beat (이, 이로, 이로아): each time the field and the preview change together, captured at
// that very stage, and orange corners snap onto the name in the preview. A click lands on the last letter.
(() => {
  const F = FRAME, VK = 0.86, FX = 124, FY = 620, FK = 1.5;
  const NAME = [66, 234, 283, 313];                                         // the name in the preview (CSS px)
  SCENES['live'] = {
    draw(ctx, t, env) {
      const lt = env.lt, P = env.palette, B = env.beatSec, out = env.phase.out;
      F.stage(ctx, t, { lightX: 1300 });
      const st = lt < 2 * B ? 0 : lt < 3 * B ? 1 : lt < 4 * B ? 2 : 3;
      // the window with the live preview
      const e = styleSpring(lt - 0.1, { f: 2.2, z: 0.66 });
      const { L } = F.layer('view_' + st), vw = L.rect.w * VK, vh = L.rect.h * VK;
      const wx = 870 + (1 - e) * 200 + Math.sin(lt * 0.5) * 4, wy = 150 + Math.cos(lt * 0.45) * 3;
      ctx.save(); ctx.globalAlpha *= clamp(e * 1.5);
      const c = F.windowFrame(ctx, wx, wy, vw, vh - 30, { title: '이로아-portfolio.html' });
      ctx.save(); ctx.beginPath(); ctx.rect(c.x, c.y, c.w, c.h); ctx.clip(); F.draw(ctx, 'view_' + st, c.x - 20 * VK, c.y - 20 * VK, VK); ctx.restore();
      ctx.restore();
      if (st > 0) {
        const at = (st + 1) * B, k = clamp((lt - at) / 0.3), nx = c.x + (NAME[0] - 20) * VK, ny = c.y + (NAME[1] - 20) * VK;
        const nw = (NAME[2] - NAME[0]) * VK * (st / 3) + 30, nh = (NAME[3] - NAME[1]) * VK;
        F.corners(ctx, nx - 10, ny - 10, nw + 20, nh + 20, k, { from: 50, len: 22, lw: 4 });
      }
      // the field
      const fe = styleSpring(lt - 0.35, { f: 2.4, z: 0.62 });
      ctx.save(); ctx.globalAlpha *= clamp((lt - 0.35) / 0.2); ctx.translate(0, (1 - fe) * 40);
      ctx.shadowColor = 'rgba(11,11,13,0.14)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
      F.draw(ctx, 'field_' + st, FX, FY, FK); ctx.restore();
      if (lt > 2 * B - 0.2 && Math.floor(lt * 3.73) % 2 === 0) { const cx = FX + ([21, 34, 46, 59][st] + 2) * FK; ctx.fillStyle = P.accent; ctx.fillRect(cx, FY + 46 * FK, 3, 22 * FK); }
      F.label(ctx, '01 PROFILE · 이름', FX + 4, FY - 20, { size: 20, alpha: clamp((lt - 0.35) / 0.2) * (1 - out) });
      F.label(ctx, 'LIVE', 1700, 125, { size: 20, color: P.accent, alpha: clamp(e) });
      ctx.fillStyle = P.accent; circle(ctx, 1688, 118, 6 * (0.6 + 0.4 * beatPulse(env, 4))); ctx.fill();
      F.headline(ctx, ['적는 즉시', '포트폴리오가 돼요.'], 116, 300, lt - 0.05, { size: 84, out: { at: env.dur - env.outSec } });
    },
  };
})();
