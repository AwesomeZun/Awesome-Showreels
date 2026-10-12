// palette (2 bars, the 30 only): ⌘K. Two keycaps press on the left (⌘ then K) and the app's real command palette
// drops in on the right; an orange selection ring steps down its rows on the beat (대시보드, 프로젝트 목록, 전체 할 일,
// 배포 타임라인, 설정과 데이터, then the projects). The headline: ⌘K 하나로 / 어디든 바로. The palette is the capture.
(() => {
  const K = PULSE, PX = 1060, PY = 112, PS = 1.04;
  const ROWS = [149, 187, 229, 271, 313, 385, 426, 469];
  function keycap(ctx, x, y, s, glyph, press, P) {
    ctx.save(); ctx.translate(x, y + press * 8);
    ctx.fillStyle = 'rgba(13,14,17,0.18)'; rr(ctx, -s / 2 + 4, -s / 2 + 14 - press * 6, s, s, 26); ctx.fill();
    const g = ctx.createLinearGradient(0, -s / 2, 0, s / 2); g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.5, '#ECEEF1'); g.addColorStop(1, '#C9CCD3');
    rr(ctx, -s / 2, -s / 2, s, s, 26); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#B4B8C0'; ctx.lineWidth = 2; ctx.stroke();
    rr(ctx, -s / 2 + 12, -s / 2 + 10, s - 24, s - 30, 18); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fill();
    ctx.fillStyle = press > 0.2 ? P.accent : P.ink; ctx.font = `800 ${s * 0.46}px ${FAM.sans}`; ctx.textAlign = 'center'; ctx.fillText(glyph, 0, s * 0.12);
    ctx.restore();
  }
  SCENES['palette'] = {
    draw(ctx, t, env) {
      const lt = env.lt, P = env.palette, B = env.beatSec, out = env.phase.out;
      K.stage(ctx, t, { lightX: 400 });
      const pr = (b) => (lt >= b * B ? Math.exp(-(lt - b * B) * 6) * 0.6 + 0.4 * clamp(1 - (lt - b * B - 1.2)) : 0);
      const ap = styleSpring(lt + 0.1, { f: 2.6, z: 0.55 });
      ctx.save(); ctx.globalAlpha *= clamp(ap * 1.5);
      keycap(ctx, 230, 330, 170, '⌘', pr(0.25), P); keycap(ctx, 430, 330, 170, 'K', pr(0.5), P); ctx.restore();
      // the palette drops in
      const e = styleSpring(lt - 0.75 * B, { f: 2.6, z: 0.6 });
      if (lt > 0.75 * B) {
        ctx.save(); ctx.globalAlpha *= clamp((lt - 0.75 * B) / 0.15); ctx.translate(0, (1 - e) * -50);
        const { L } = K.layer('palette'); ctx.translate(PX + L.rect.w * PS / 2, PY); ctx.scale(0.94 + 0.06 * e, 0.94 + 0.06 * e); ctx.translate(-(PX + L.rect.w * PS / 2), -PY);
        K.draw(ctx, 'palette', PX, PY, PS);
        // the selection ring steps down on the beat
        const step = clamp((lt - 2 * B) / (0.25 * B * (ROWS.length - 1)));
        if (lt > 2 * B) {
          const f = step * (ROWS.length - 1), i = Math.min(ROWS.length - 2, Math.floor(f)), k = Ease.ioC(f - i), y = lerp(ROWS[i], ROWS[i + 1], k);
          const hold = lt > 2 * B + 0.25 * B * (ROWS.length - 1) ? ROWS[ROWS.length - 1] : y;
          ctx.strokeStyle = P.accent; ctx.lineWidth = 3; rr(ctx, PX + 38 * PS, PY + (hold - 19) * PS, 644 * PS, 38 * PS, 10); ctx.stroke();
        }
        ctx.restore();
      }
      K.headline(ctx, ['⌘K 하나로', '어디든 바로.'], 120, 600, lt - 0.3, { size: 104, colors: [P.ink, P.accent], out: { at: env.dur - env.outSec } });
      kinetic(ctx, '이동 · 할 일 추가 · 배포 메모 · 내보내기', 126, 820, lt - 1.0, { size: 34, fam: 'sans', weight: 600, color: P.ink2, ls: -0.6, stagger: 0.018, dur: 0.45, rise: 14, blur: 4, out: { at: env.dur - env.outSec } });
    },
  };
})();
