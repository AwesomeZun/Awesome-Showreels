// versions (2 bars; 3 in the 30): compare. The app's version bar (v1, v2, 새 버전, 비교, v1 핀 가져오기) over the two
// real versions of the landing page; a divider sweeps from v1 across to v2 and settles in the middle, so the new
// headline, the trial CTA and the lime login button show against the old ones. The headline: 버전을 쌓아 / 나란히
// 비교해요.
(() => {
  const F = F1, MX = 700, MY = 236, K = 0.76;
  SCENES['versions'] = {
    draw(ctx, t, env) {
      const lt = env.lt, B = env.beatSec, outAt = env.dur - env.outSec, out = env.phase.out;
      F.desk(ctx, t, { gx: 1250, gy: 640 });
      const e = styleSpring(lt + 0.06, { f: 2.2, z: 0.7 }), w = 1440 * K, h = 1024 * K;
      // divider: all v1, sweep to all v2, back to the middle (and in the 30, one more pass)
      let d = 1; const sw = (a, b, x, y) => { if (lt >= a * B) d = lerp(x, y, Ease.ioC(clamp((lt - a * B) / ((b - a) * B)))); };
      sw(1, 3, 1, 0); sw(3.5, 4.75, 0, 0.5); if (env.dur > 10 * B) { sw(7, 8.5, 0.5, 0.15); sw(9, 10.2, 0.15, 0.5); }
      ctx.save(); ctx.globalAlpha *= clamp(e * 1.6); ctx.translate(0, (1 - e) * 60);
      ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 26; ctx.fillStyle = '#0B0B0C'; ctx.fillRect(MX, MY, w, h); ctx.shadowColor = 'transparent';
      F.draw(ctx, 'mock_landing_v2', MX, MY, K);
      ctx.save(); ctx.beginPath(); ctx.rect(MX, MY, w * d, h); ctx.clip(); F.draw(ctx, 'mock_landing_v1', MX, MY, K); ctx.restore();
      const dx = MX + w * d; ctx.fillStyle = '#FFFFFF'; ctx.fillRect(dx - 1.5, MY, 3, h);
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 12; circle(ctx, dx, MY + h / 2, 22); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.restore();
      ctx.strokeStyle = '#0B0B0C'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(dx - 6, MY + h / 2 - 7); ctx.lineTo(dx - 12, MY + h / 2); ctx.lineTo(dx - 6, MY + h / 2 + 7); ctx.moveTo(dx + 6, MY + h / 2 - 7); ctx.lineTo(dx + 12, MY + h / 2); ctx.lineTo(dx + 6, MY + h / 2 + 7); ctx.stroke();
      [['V1', MX + 18, d > 0.08], ['V2', MX + w - 18, d < 0.92]].forEach(([s, x, on]) => { if (!on) return; ctx.font = `700 20px ${FAM.mono}`; const tw = ctx.measureText(s).width + 24, bx = s === 'V1' ? x : x - tw;
        rr(ctx, bx, MY + 18, tw, 34, 8); ctx.fillStyle = 'rgba(11,11,12,0.8)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; ctx.stroke(); ctx.fillStyle = '#EDEDEF'; ctx.fillText(s, bx + 12, MY + 42); });
      F.marks(ctx, MX, MY, w, h, {});
      ctx.restore();
      ctx.save(); ctx.globalAlpha *= clamp(rm(lt, 0.2, 0.5)) * (1 - out); F.draw(ctx, 'versions', MX, 140, 1.3); ctx.restore();
      kinetic(ctx, '버전을 쌓아', 116, 330, lt - 0.12, { size: 76, fam: 'display', weight: 800, color: '#EDEDEF', ls: -3.2, stagger: 0.022, dur: 0.45, rise: 24, blur: 6, out: { at: outAt } });
      kinetic(ctx, '나란히 비교해요.', 116, 420, lt - 0.3, { size: 76, fam: 'display', weight: 800, color: '#EDEDEF', ls: -3.2, stagger: 0.022, dur: 0.45, rise: 24, blur: 6, out: { at: outAt } });
      kinetic(ctx, '남은 핀은 새 버전으로 가져와요', 120, 510, lt - 0.7, { size: 34, fam: 'sans', weight: 600, color: '#B6B7BC', ls: -0.5, stagger: 0.012, dur: 0.4, rise: 12, blur: 4, out: { at: outAt } });
    },
  };
})();
