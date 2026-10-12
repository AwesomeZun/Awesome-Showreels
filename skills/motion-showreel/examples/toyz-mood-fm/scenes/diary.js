// diary (1 bar; 2 in the 30): moods kept as colour. The app's archive for September 2026, captured: every day it was
// played is painted in that day's mood. It starts drained of colour and the days light up one by one in date order,
// each popping back to the app's own swatch. The headline: 들은 무드는 / 색으로 남아요.
(() => {
  const M = MF, K = 1.3, CX = 900, CY = 200;
  let G = null; const geo = () => (G || (G = JSON.parse(ASSET('captures/ui/app/cal_geo.txt'))));
  SCENES['diary'] = {
    draw(ctx, t, env) {
      const lt = env.lt, B = env.beatSec, outAt = env.dur - env.outSec, img = IMG['captures/ui/app/calendar'], j = ASSET('captures/ui/app/calendar.json'), d = img.width / j.rect.w;
      ctx.fillStyle = '#0B0B0C'; ctx.fillRect(0, 0, W, H);
      const pal = M.paletteAt(0.62, 0.5), g = ctx.createRadialGradient(1400, 560, 0, 1400, 560, 1000); g.addColorStop(0, pal.colors[1] + '55'); g.addColorStop(1, pal.colors[1] + '00'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const e = styleSpring(lt + 0.08, { f: 2.2, z: 0.7 }), cy = CY + (1 - e) * 60;
      ctx.save(); ctx.globalAlpha *= clamp(e * 1.8);
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 20; rr(ctx, CX, cy, j.rect.w * K, j.rect.h * K, 24); ctx.fillStyle = '#141416'; ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.save(); ctx.filter = 'grayscale(1) brightness(0.55)'; ctx.drawImage(img, CX, cy, j.rect.w * K, j.rect.h * K); ctx.restore();
      const cells = geo().cells.filter(c => c.entry); const span = Math.min(1.1, env.dur * 0.42);
      cells.forEach((c, i) => { const at = 0.15 + i * span / cells.length, p = styleSpring(lt - at, { f: 3, z: 0.5 }); if (lt < at) return; const s = 0.8 + 0.2 * p;
        ctx.save(); ctx.translate(CX + (c.x + c.w / 2) * K, cy + (c.y + c.h / 2) * K); ctx.scale(s, s); ctx.globalAlpha *= clamp((lt - at) * 8);
        ctx.drawImage(img, c.x * d, c.y * d, c.w * d, c.h * d, -c.w * K / 2, -c.h * K / 2, c.w * K, c.h * K); ctx.restore(); });
      ctx.restore();
      kinetic(ctx, '들은 무드는', 118, 430, lt - 0.05, { size: 92, fam: 'display', weight: 800, color: '#F6F2EE', ls: -3.6, stagger: 0.022, dur: 0.42, rise: 28, blur: 6, out: { at: outAt } });
      kinetic(ctx, '색으로 남아요.', 118, 532, lt - 0.2, { size: 92, fam: 'display', weight: 800, color: '#F6F2EE', ls: -3.6, stagger: 0.022, dur: 0.42, rise: 28, blur: 6, out: { at: outAt } });
      kinetic(ctx, '한 줄 메모와 함께, 달력에', 122, 628, lt - 0.5, { size: 38, fam: 'sans', weight: 600, color: '#D2CCC6', ls: -0.6, stagger: 0.012, dur: 0.4, rise: 12, blur: 4, out: { at: outAt } });
      M.label(ctx, '03 / ARCHIVE · 2026년 9월', 124, 320, { size: 20, color: '#F08464', alpha: clamp(rm(lt, 0.05, 0.3)) });
    },
  };
})();
