// brief (3 bars, the 30 only): one page. The one-page brief the app wrote for the project (its own sheet, captured:
// 목표 요약, 핵심 아이디어, 다음 할 일, 열린 질문) slides up on the right; its four sections light in turn on the beat,
// a lime bar at their edge and their ↗ source links pulsing (every line in the brief points back to the note it came
// from). The headline: 한 장짜리 브리프로 / 바로 정리돼요.
(() => {
  const L = LAYR, K = 1.3, BX = 684, BY = 172;
  const NAMES = ['목표 요약', '핵심 아이디어', '다음 할 일', '열린 질문'];
  const SEC = [[180, 265], [265, 385], [385, 505], [505, 590]];
  const LINKS = [[[425, 233], [452, 233]], [[787, 294], [752, 324], [522, 354]], [[502, 414], [563, 445], [396, 475]], [[786, 535]]];
  SCENES['brief'] = {
    draw(ctx, t, env) {
      const lt = env.lt, B = env.beatSec, P = env.palette, outAt = env.dur - env.outSec;
      L.stage(ctx, t, { lightX: 1350, lightY: 560, lightR: 1300 });
      const e = styleSpring(lt + 0.05, { f: 1.8, z: 0.74 }), y = BY + (1 - e) * 500 + Math.sin(lt * 1.1) * 3;
      ctx.save(); ctx.globalAlpha *= clamp(e * 1.5);
      ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 70; ctx.shadowOffsetY = 30; rr(ctx, BX, y, 880 * K, 618 * K, 16); ctx.fillStyle = '#EEF2F8'; ctx.fill(); ctx.shadowColor = 'transparent';
      L.draw(ctx, 'brief', BX, y, K);
      // the sections light in turn
      SEC.forEach(([a, b], i) => {
        const at = (3 + 1.5 * i) * B, p = clamp((lt - at) / 0.25); if (p <= 0) return;
        const live = 1 - clamp((lt - at - 1.5 * B) / 0.3) * (i < 3 ? 1 : 0), w = live * p;
        ctx.save(); ctx.globalAlpha *= 0.16 * w; ctx.fillStyle = '#D9F55B'; ctx.fillRect(BX + 40 * K, y + a * K, 800 * K, (b - a) * K); ctx.restore();
        ctx.fillStyle = '#11140A'; ctx.fillRect(BX + 30 * K, y + (a + 12) * K, 5 * K * p, (b - a - 24) * K);
        LINKS[i].forEach(([lx, ly], k) => { const q = clamp((lt - at - 0.12 * k) / 0.3); if (q <= 0) return;
          const r = (1 - q) * 22 * K; ctx.save(); ctx.globalAlpha *= (1 - q) * w; ctx.strokeStyle = '#7A9A00'; ctx.lineWidth = 2.5; rr(ctx, BX + (lx - 12) * K - r, y + (ly - 11) * K - r, 24 * K + 2 * r, 22 * K + 2 * r, 6 + r); ctx.stroke(); ctx.restore();
          ctx.save(); ctx.globalAlpha *= w; rr(ctx, BX + (lx - 12) * K, y + (ly - 11) * K, 24 * K, 22 * K, 5 * K); ctx.fillStyle = '#D9F55B'; ctx.fill();
          ctx.fillStyle = '#11140A'; ctx.font = `700 ${13 * K}px ${FAM.sans}`; ctx.textAlign = 'center'; ctx.fillText('↗', BX + lx * K, y + (ly + 5) * K); ctx.restore(); });
      });
      ctx.restore();
      // the four sections, listed on the left and lit with the sheet
      NAMES.forEach((s, i) => { const at = (3 + 1.5 * i) * B, on = clamp((lt - at) / 0.25) * (1 - clamp((lt - at - 1.5 * B) / 0.3) * (i < 3 ? 1 : 0));
        const a = clamp(rm(lt, 0.9 + i * 0.08, 1.3 + i * 0.08)) * (1 - env.phase.out), y = 560 + i * 92; if (a <= 0) return;
        ctx.save(); ctx.globalAlpha *= a;
        ctx.font = `500 24px ${FAM.mono}`; ctx.fillStyle = on > 0.5 ? '#D9F55B' : '#56637A'; ctx.fillText(String(i + 1).padStart(2, '0'), 124, y);
        ctx.font = `750 40px ${FAM.display}`; ctx.fillStyle = on > 0.5 ? '#F3F5F8' : '#56637A'; ctx.fillText(s, 176, y + 2);
        if (on > 0) { ctx.fillStyle = '#D9F55B'; ctx.fillRect(176, y + 18, ctx.measureText(s).width * on, 3); }
        ctx.restore(); });
      L.label(ctx, 'PROJECT / 01 · BRIEF', 148, 150, { size: 22, color: '#9FB0C8', dot: true, alpha: clamp(rm(lt, 0.05, 0.35)) * (1 - env.phase.out) });
      L.headline(ctx, ['한 장짜리', '브리프로 정리돼요.'], 120, 262, lt - 0.15, { size: 66, gap: 78, out: { at: outAt } });
      kinetic(ctx, '항목마다 출처 메모가 붙어요', 124, 400, lt - 0.8, { size: 36, fam: 'sans', weight: 600, color: P.ink2, ls: -0.5, stagger: 0.012, dur: 0.4, rise: 12, blur: 4, out: { at: outAt } });
    },
  };
})();
