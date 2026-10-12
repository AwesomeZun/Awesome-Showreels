// hook (2 bars): the app's own hero, the metal plate. Rulers along its edges, its eyebrow (DESIGN REVIEW BOARD — PIN ·
// THREAD · VERSION), FORM / 01 in black with the light slash, and the app's line, 디자이너를 위한 가벼운 피드백 보드. On
// the right the app's sample landing page and phone screen land with their dimension lines (1440, 390), and four
// reviewers' pins drop onto them on the beat, as on the app's front page.
(() => {
  const F = F1;
  const LX = 1150, LY = 214, LK = 0.48, PXX = 1040, PYY = 430, PK = 0.29;
  const PINS = [[2, 'mobile', 0.07, 0.23, '#FF5A1F'], [5, 'landing', 0.555, 0.176, '#3D7BFF'], [6, 'landing', 0.32, 0.84, '#FF5A1F'], [7, 'landing', 0.876, 0.057, '#C6FF3D']];
  SCENES['hook'] = {
    draw(ctx, t, env) {
      const lt = env.lt, B = env.beatSec, outAt = env.dur - env.outSec, out = env.phase.out;
      F.plate(ctx, 0, 0, W, H, { k: 1.4, drift: lt * 6 });
      F.label(ctx, 'DESIGN REVIEW BOARD — PIN · THREAD · VERSION', 112, 150, { size: 20, color: 'rgba(11,11,12,0.7)', alpha: clamp(rm(lt, 0.05, 0.3)) });
      const e = styleSpring(lt + 0.05, { f: 2.2, z: 0.66 });
      ctx.save(); ctx.globalAlpha *= clamp(e * 1.6); ctx.translate(-out * 60, (1 - e) * 30); F.title(ctx, 100, 470, 204, '#0B0B0C'); ctx.restore();
      kinetic(ctx, '디자이너를 위한 가벼운 피드백 보드', 108, 580, lt - 0.3, { size: 56, fam: 'display', weight: 750, color: '#1F2023', ls: -2, stagger: 0.016, dur: 0.4, rise: 18, blur: 4, out: { at: outAt } });
      // the mockups
      const m = styleSpring(lt - 0.35, { f: 2, z: 0.7 });
      ctx.save(); ctx.globalAlpha *= clamp(m * 1.6); ctx.translate((1 - m) * 160, 0);
      ctx.shadowColor = 'rgba(11,11,12,0.45)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 24; ctx.fillStyle = '#0B0B0C'; ctx.fillRect(LX, LY, 1440 * LK, 1024 * LK); ctx.shadowColor = 'transparent';
      F.draw(ctx, 'mock_landing_v2', LX, LY, LK); F.marks(ctx, LX, LY, 1440 * LK, 1024 * LK, { color: 'rgba(11,11,12,0.6)', dim: '1440', dimBg: '#D3D4D6', dimP: Ease.outC(clamp(rm(lt, 0.7, 1.2))) });
      ctx.save(); ctx.shadowColor = 'rgba(11,11,12,0.5)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 20; rr(ctx, PXX - 6, PYY - 6, 780 * PK + 12, 1688 * PK + 12, 34); ctx.fillStyle = '#F0F1F3'; ctx.fill(); ctx.restore();
      ctx.save(); rr(ctx, PXX, PYY, 780 * PK, 1688 * PK, 28); ctx.clip(); F.draw(ctx, 'mock_mobile', PXX, PYY, PK); ctx.restore();
      const dp = Ease.outC(clamp(rm(lt, 0.9, 1.4))), dy = PYY + 1688 * PK + 30, cx = PXX + 390 * PK;
      ctx.strokeStyle = 'rgba(11,11,12,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx - 390 * PK * dp, dy); ctx.lineTo(cx + 390 * PK * dp, dy); ctx.stroke();
      if (dp > 0.6) { ctx.font = `600 16px ${FAM.mono}`; ctx.fillStyle = '#D3D4D6'; ctx.fillRect(cx - 22, dy - 10, 44, 20); ctx.fillStyle = 'rgba(11,11,12,0.8)'; ctx.textAlign = 'center'; ctx.fillText('390', cx, dy + 5.5); ctx.textAlign = 'left'; }
      // the pins drop on the beat
      PINS.forEach(([n, on, x, y, c], i) => { const at = (2 + i * 0.5) * B, p = styleSpring(lt - at, { f: 3, z: 0.5 }); if (lt < at) return;
        const [ax, ay] = on === 'landing' ? [LX + x * 1440 * LK, LY + y * 1024 * LK] : [PXX + x * 780 * PK, PYY + y * 1688 * PK];
        if (n === 5) F.region(ctx, ax, ay, 0.378 * 1440 * LK, 0.469 * 1024 * LK, c, Ease.outC(clamp((lt - at + 0.3) / 0.3)));
        F.pin(ctx, ax, ay, n, c, { s: 34, p }); });
      ctx.restore();
    },
  };
})();
