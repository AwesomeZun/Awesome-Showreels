// releases (2 bars, the 30 only): release notes that know the next version. The app's real release log panel rises
// on the left, its rows (v1.4.2 Moss Timer, v0.9.0 Kite Forms, v0.6.1 Loopdeck, the v1.4.1 rollback, v1.4.0) lit one
// by one; on the right an odometer rolls Moss Timer's last version v1.4.2 to the one the app suggests, v1.4.3 (the
// largest version's patch plus one, as the README says). Headline: 배포 메모는 / 다음 버전까지.
(() => {
  const K = PULSE, LX = 116, LY = 300, LS = 1.18;
  SCENES['releases'] = {
    draw(ctx, t, env) {
      const lt = env.lt, P = env.palette, B = env.beatSec, out = env.phase.out;
      K.stage(ctx, t, { lightX: 700 });
      const e = styleSpring(lt + 0.05, { f: 2.4, z: 0.62 });
      ctx.save(); ctx.globalAlpha *= clamp(e * 1.5); ctx.translate(0, (1 - e) * 60); K.draw(ctx, 'panel_4', LX, LY, LS); ctx.restore();
      // rows lit in turn
      for (let i = 0; i < 5; i++) {
        const at = 0.5 * B + i * 0.25 * B, k = clamp((lt - at) / 0.4); if (k <= 0 || k >= 1) continue;
        const y = LY + (125 + i * 47) * LS;
        ctx.save(); ctx.globalAlpha *= (1 - k) * 0.8; ctx.fillStyle = P.accent; ctx.fillRect(LX + 22 * LS, y, 4, 40 * LS); ctx.restore();
      }
      // the odometer
      const rx = 1000, ry = 600, size = 150;
      K.label(ctx, 'MOSS TIMER · NEXT VERSION', rx + 4, ry - 190, { size: 24, color: P.muted, alpha: clamp(rm(lt, 1.6 * B, 2 * B)) });
      const roll = Ease.outBack(clamp((lt - 2.5 * B) / (1.0 * B)), 1.4);
      if (lt > 1.6 * B) {
        ctx.save(); ctx.globalAlpha *= clamp(rm(lt, 1.6 * B, 2 * B)) * (1 - Ease.inC(out));
        ctx.font = `800 ${size}px ${FAM.mono}`; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = P.ink;
        const pre = 'v1.4.', w = ctx.measureText(pre).width; ctx.fillText(pre, rx, ry);
        const dw = ctx.measureText('8').width;
        ctx.save(); ctx.beginPath(); ctx.rect(rx + w - 6, ry - size * 0.95, dw + 12, size * 1.2); ctx.clip();
        ctx.fillStyle = P.ink; ctx.fillText('2', rx + w, ry - roll * size * 1.1);
        ctx.fillStyle = P.accent; ctx.fillText('3', rx + w, ry + size * 1.1 - roll * size * 1.1);
        ctx.restore();
        rr(ctx, rx, ry + 40, 560, 6, 3); ctx.fillStyle = 'rgba(13,14,17,0.12)'; ctx.fill();
        rr(ctx, rx, ry + 40, 560 * clamp((lt - 2.5 * B) / B), 6, 3); ctx.fillStyle = P.accent; ctx.fill();
        ctx.restore();
      }
      const ok = clamp((lt - 3.5 * B) / 0.3);
      if (ok > 0) { ctx.save(); ctx.globalAlpha *= ok * (1 - out); ctx.font = `700 34px ${FAM.sans}`; ctx.fillStyle = P.accent3; ctx.fillText('patch +1 · 미리 적어 둬요', rx + 4, ry + 110); ctx.restore(); }
      K.headline(ctx, ['배포 메모는', '다음 버전까지.'], 1000, 200, lt - 0.2, { size: 88, colors: [P.ink, P.accent], out: { at: env.dur - env.outSec } });
    },
  };
})();
