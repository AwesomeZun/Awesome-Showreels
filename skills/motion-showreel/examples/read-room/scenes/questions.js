// questions (2 bars, the 30 only): bring a question. The page dims behind; the app's real discussion panel rises on the
// right with its three questions, each linked to a paragraph (문단 8, 11, 15), the last already ticked 다뤘어요; each
// question lights on the beat. Headline left: 질문을 올리고, / 모임에서 다뤄요.
(() => {
  const R = RR, PX = 1120, PY = 70, PK = 1.38;
  SCENES['questions'] = {
    draw(ctx, t, env) {
      const lt = env.lt, P = env.palette, B = env.beatSec, out = env.phase.out;
      R.desk(ctx, t);
      R.page(ctx, -60, 0, 0.9, 1100, H, {}, { full: true, alpha: 0.35 });
      const e = styleSpring(lt + 0.05, { f: 1.8, z: 0.75 });
      ctx.save(); ctx.globalAlpha *= clamp(e * 1.4); ctx.translate(0, (1 - e) * 80);
      ctx.shadowColor = 'rgba(23,25,29,0.2)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 20;
      R.draw(ctx, 'questions', PX, PY, PK, { crop: [1160, 65, 440, 720] }); ctx.restore();
      [555, 660, 765].forEach((qy, i) => { const at = 2 * B + i * 0.5 * B, k = clamp((lt - at) / 0.3); if (k <= 0) return;
        ctx.save(); ctx.globalAlpha *= k * (0.65 + 0.35 * Math.sin(lt * 3 + i)); ctx.strokeStyle = '#FF9A3D'; ctx.lineWidth = 3; rr(ctx, PX + 14 * PK, PY + (qy - 65 - 22) * PK + (1 - e) * 80, 412 * PK, 92 * PK, 12); ctx.stroke(); ctx.restore(); });
      kinetic(ctx, '질문을 올리고,', 120, 440, lt - 0.2, { size: 92, fam: 'display', weight: 900, color: P.ink, ls: -4, stagger: 0.03, dur: 0.55, rise: 36, blur: 6, out: { at: env.dur - env.outSec } });
      R.marker(ctx, '모임에서 다뤄요.', 128, 548, 92, lt - 0.5, { markAt: 0.6, out: { at: env.dur - env.outSec }, alpha: 1 - Ease.inC(out) });
    },
  };
})();
