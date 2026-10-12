// thread (3 bars, the 30 only): answer and close. The landing page v1 with 하은's pin 1 on the headline, selected; on
// the right the app's own panel with that comment's thread (captured): her question, 준서's answer revealed line by
// line, and the comment marked 해결됨; the pin turns to the app's resolved style. The headline: 답글로 이어 가고, /
// 해결로 닫아요.
(() => {
  const F = F1, MX = 120, MY = 300, K = 0.66, TK = 1.42, TX = 1280, TY = 150, CROP = [0, 0, 372, 470];
  SCENES['thread'] = {
    draw(ctx, t, env) {
      const lt = env.lt, B = env.beatSec, outAt = env.dur - env.outSec, done = lt > 6 * B;
      F.desk(ctx, t, { gx: 700, gy: 640 });
      const e = styleSpring(lt + 0.05, { f: 2.2, z: 0.7 });
      ctx.save(); ctx.globalAlpha *= clamp(e * 1.6);
      ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 22; ctx.fillStyle = '#0B0B0C'; ctx.fillRect(MX, MY, 1440 * K, 1024 * K); ctx.shadowColor = 'transparent';
      F.draw(ctx, 'mock_landing_v1', MX, MY, K); F.marks(ctx, MX, MY, 1440 * K, 1024 * K, {});
      F.pin(ctx, MX + 0.18 * 1440 * K, MY + 0.335 * 1024 * K, 1, '#FF5A1F', { s: 38, sel: !done, resolved: done });
      ctx.restore();
      // the thread panel: the reply block is revealed, then the status settles
      const pe = styleSpring(lt - 0.1, { f: 2, z: 0.72 });
      ctx.save(); ctx.globalAlpha *= clamp(pe * 1.6); ctx.translate((1 - pe) * 300, 0);
      ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 22; rr(ctx, TX, TY, CROP[2] * TK, CROP[3] * TK, 16); ctx.fillStyle = '#0B0B0C'; ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.save(); rr(ctx, TX, TY, CROP[2] * TK, CROP[3] * TK, 16); ctx.clip(); F.draw(ctx, 'thread', TX, TY, TK, { crop: CROP });
      const rv = clamp((lt - 2.5 * B) / (1.5 * B)), ry0 = 342, ry1 = 420;                 // the reply block (CSS px in the panel)
      if (rv < 1) { ctx.fillStyle = '#16161A'; ctx.fillRect(TX + 40 * TK, TY + (ry0 + (ry1 - ry0) * rv) * TK, 320 * TK, (ry1 - ry0) * (1 - rv) * TK); }
      ctx.restore();
      const ring = clamp((lt - 6 * B) / 0.6); if (ring > 0 && ring < 1) { ctx.save(); ctx.globalAlpha *= 1 - ring; ctx.strokeStyle = '#C6FF3D'; ctx.lineWidth = 3; rr(ctx, TX + (270 - 6 * ring) * TK, TY + (192 - 6 * ring) * TK, (70 + 12 * ring) * TK, (20 + 12 * ring) * TK, 10); ctx.stroke(); ctx.restore(); }
      ctx.restore();
      kinetic(ctx, '답글로 이어 가고,', 116, 170, lt - 0.12, { size: 72, fam: 'display', weight: 800, color: '#EDEDEF', ls: -3, stagger: 0.022, dur: 0.45, rise: 22, blur: 6, out: { at: outAt } });
      kinetic(ctx, '해결로 닫아요.', 116, 254, lt - 0.3, { size: 72, fam: 'display', weight: 800, color: '#EDEDEF', ls: -3, stagger: 0.022, dur: 0.45, rise: 22, blur: 6, out: { at: outAt } });
    },
  };
})();
