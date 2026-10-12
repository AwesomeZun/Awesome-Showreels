// hook (2 bars): the app's own front page, in motion. Its logo and name, its eyebrow (SMALL TOOLS. NOTHING MORE.) and
// its line typed in with the lilac caret: 필요한 만큼만, / 매일 쓰는 도구. Its three facts count up (14 도구 · 0 서버 요청 ·
// 100% 브라우저 처리) while on the right the fourteen tools snap into a grid an eighth of a beat apart, grouped as the app
// groups them; on the last beat 01 JSON lights, the tool the next scene opens.
(() => {
  const T = TT;
  SCENES['hook'] = {
    draw(ctx, t, env) {
      const lt = env.lt, B = env.beatSec, P = env.palette, outAt = env.dur - env.outSec, out = env.phase.out;
      T.stage(ctx, t, { glowX: 1500, glowY: 360 });
      const e = styleSpring(lt + 0.08, { f: 2.6, z: 0.55 });
      ctx.save(); ctx.globalAlpha *= clamp(e * 2) * (1 - out); T.logo(ctx, 120, 150 + (1 - e) * 20, 92, { dot: e }); ctx.restore();
      T.word(ctx, 232, 226, 92, { alpha: clamp(rm(lt, 0.05, 0.25)) * (1 - out) });
      T.label(ctx, 'SMALL TOOLS. NOTHING MORE.', 124, 344, { size: 22, alpha: clamp(rm(lt, 0.15, 0.4)) * (1 - out) });
      T.headline(ctx, ['필요한 만큼만,', '매일 쓰는 도구.'], 114, 492, lt - 0.2, { size: 112, gap: 120, caret: true, out: { at: outAt } });
      // the facts
      const fa = clamp(rm(lt, 1.0, 1.3)) * (1 - out), cnt = Ease.outC(clamp((lt - 1.0) / 0.8));
      if (fa > 0) { ctx.save(); ctx.globalAlpha *= fa; ctx.fillStyle = 'rgba(255,255,255,0.075)'; ctx.fillRect(120, 720, 640 * Ease.outC(clamp((lt - 1.0) / 0.5)), 1);
        [[String(Math.round(14 * cnt)), '도구'], ['0', '서버 요청'], [Math.round(100 * cnt) + '%', '브라우저 처리']].forEach(([n, l], i) => { const x = 124 + i * 230;
          ctx.font = `500 60px ${FAM.mono}`; ctx.fillStyle = '#F4F3FF'; ctx.fillText(n, x, 806); ctx.font = `500 24px ${FAM.sans}`; ctx.fillStyle = '#908CB1'; ctx.fillText(l, x + 2, 846); }); ctx.restore(); }
      // the fourteen tools
      const TW = 330, TH = 88, GX = 1180, GY = 176;
      T.TOOLS.forEach(([no, name, grp], i) => {
        const c = i % 2, r = Math.floor(i / 2), at = 1 * B + i * 0.125 * B - 0.06, p = styleSpring(lt - at, { f: 3.2, z: 0.5 }); if (lt < at) return;
        const x = GX + c * (TW + 18), y = GY + r * (TH + 16) + (1 - p) * 40, hot = i === 0 && lt > 6 * B;
        ctx.save(); ctx.globalAlpha *= clamp((lt - at) * 6) * (1 - out); ctx.translate(x + TW / 2, y + TH / 2); ctx.scale(0.85 + 0.15 * p, 0.85 + 0.15 * p); ctx.translate(-TW / 2, -TH / 2);
        rr(ctx, 0, 0, TW, TH, 12); ctx.fillStyle = hot ? 'rgba(91,69,240,0.35)' : 'rgba(255,255,255,0.045)'; ctx.fill(); ctx.strokeStyle = hot ? '#A89BFF' : 'rgba(255,255,255,0.1)'; ctx.lineWidth = hot ? 2 : 1; ctx.stroke();
        if (hot) { ctx.save(); ctx.globalAlpha *= 0.5 + 0.5 * Math.sin(lt * 8); ctx.shadowColor = '#7A66FF'; ctx.shadowBlur = 30; ctx.stroke(); ctx.restore(); }
        ctx.font = `600 20px ${FAM.mono}`; ctx.fillStyle = '#A89BFF'; ctx.fillText(no, 22, 54); ctx.font = `750 32px ${FAM.display}`; ctx.fillStyle = '#F4F3FF'; ctx.fillText(name, 66, 56);
        ctx.font = `500 14px ${FAM.mono}`; ctx.fillStyle = '#908CB1'; ctx.textAlign = 'right'; ctx.fillText(grp, TW - 18, 52); ctx.restore();
      });
    },
  };
})();
