// focus (2 bars; 3 in the 30): only one task and the time. The room, closer: 시작 is pressed on beat 1 and the app's
// own running state takes over (FOCUS / RUNNING, 일시정지); the clock runs in time-lapse from 25:00 to 00:00 while the
// chrome ring closes round the task, the knob riding its tip; at the end the ring glows once. The headline is the app's
// own sentence: 지금 할 일 하나와 / 시간만 남아요.
(() => {
  const F = FS, K = 1.2, AX = 1000, AY = 46, BTN = [119.86, 463.27, 168, 60];
  SCENES['focus'] = {
    draw(ctx, t, env) {
      const lt = env.lt, B = env.beatSec, outAt = env.dur - env.outSec;
      F.room(ctx, t, { gx: 1300 });
      const start = 1 * B, end = env.dur - 0.9 * B, p = Ease.ioQ(clamp((lt - start - 0.3) / (end - start - 0.3)));
      const e = styleSpring(lt + 0.1, { f: 2, z: 0.75 }), run = clamp((lt - start) / 0.25);
      ctx.save(); ctx.globalAlpha *= clamp(e * 1.6);
      F.arch(ctx, 'arch_ready', AX, AY, K, p, 25 * 60 * (1 - p), { alpha: 1 - run });
      if (run > 0) F.arch(ctx, 'arch_run', AX, AY, K, p, 25 * 60 * (1 - p), { alpha: run, glow: Math.max(0, Math.sin(clamp((lt - end) / (0.8 * B)) * Math.PI)) });
      // the press on 시작
      const pr = lt > start - 0.06 && lt < start + 0.1; if (pr) { ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.18)'; rr(ctx, AX + (40 + BTN[0]) * K, AY + (40 + BTN[1]) * K, BTN[2] * K, BTN[3] * K, BTN[3] * K / 2); ctx.fill(); ctx.restore(); }
      const ring = clamp((lt - start) / 0.6); if (ring > 0 && ring < 1) { ctx.save(); ctx.globalAlpha *= 1 - ring; ctx.strokeStyle = '#D6DCCD'; ctx.lineWidth = 3; const g = 16 * ring; rr(ctx, AX + (40 + BTN[0]) * K - g, AY + (40 + BTN[1]) * K - g, BTN[2] * K + 2 * g, BTN[3] * K + 2 * g, BTN[3] * K / 2 + g); ctx.stroke(); ctx.restore(); }
      ctx.restore();
      F.label(ctx, 'FOCUS · 25분 · ×' + (p > 0 && p < 1 ? '300' : '1'), 124, 300, { size: 22, alpha: clamp(rm(lt, 0.1, 0.4)) * (1 - env.phase.out) });
      F.headline(ctx, ['지금 할 일 하나와', '시간만 남아요.'], 116, 430, lt - 0.1, { size: 84, out: { at: outAt } });
      kinetic(ctx, '모래섬 스튜디오 제안서 다듬기', 122, 620, lt - 0.7, { size: 38, fam: 'display', weight: 700, color: '#BCC7B6', ls: -1, stagger: 0.016, dur: 0.45, rise: 12, blur: 4, out: { at: outAt } });
    },
  };
})();
