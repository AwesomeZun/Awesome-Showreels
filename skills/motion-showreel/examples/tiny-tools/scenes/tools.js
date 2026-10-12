// tools (4 bars, the 30 only): fourteen in one place. On the left the headline (14가지 도구가 / 한곳에.) over the app's
// list of tools, two columns, the one on screen lit; on the right four more of the app's tools, a bar each, slide in
// as captured: 02 컬러 (conversions, WCAG contrast, palettes), 03 텍스트 비교, 08 정규식, 12 cron 설명.
(() => {
  const T = TT, K = 0.86, CX = 790, CY = 236;
  const SHOW = [['tool_color', 1], ['tool_diff', 2], ['tool_regex', 7], ['tool_cron', 11]];
  SCENES['tools'] = {
    draw(ctx, t, env) {
      const lt = env.lt, B = env.beatSec, outAt = env.dur - env.outSec, k = Math.min(3, Math.floor(lt / (4 * B)));
      T.stage(ctx, t, { glowX: 1350, glowY: 560 });
      // the cards: the current one in, the last one up and away
      [k - 1, k].forEach(j => { if (j < 0) return; const t0 = j * 4 * B, inP = Ease.outQuint(clamp((lt - t0) / 0.5)), outP = j < k ? Ease.inC(clamp((lt - (k * 4 * B)) / 0.3)) : 0; if (outP >= 1) return;
        const y = CY + (1 - inP) * 380 - outP * 300, a = clamp(inP * 2) * (1 - outP) * (1 - outP);
        ctx.save(); ctx.globalAlpha *= a; ctx.shadowColor = 'rgba(0,0,0,0.65)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 24; rr(ctx, CX, y, 1260 * K, 760 * K, 14); ctx.fillStyle = '#0B0B12'; ctx.fill(); ctx.shadowColor = 'transparent';
        ctx.save(); rr(ctx, CX, y, 1260 * K, 760 * K, 14); ctx.clip(); T.draw(ctx, SHOW[j][0], CX, y, K, { crop: [0, 0, 1260, 760] }); ctx.restore();
        ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1.5; rr(ctx, CX, y, 1260 * K, 760 * K, 14); ctx.stroke(); ctx.restore(); });
      // fade the card's foot into the stage
      const g = ctx.createLinearGradient(0, H - 180, 0, H); g.addColorStop(0, 'rgba(7,7,11,0)'); g.addColorStop(1, 'rgba(7,7,11,0.95)'); ctx.fillStyle = g; ctx.fillRect(0, H - 180, W, 180);
      // the list
      T.TOOLS.forEach(([no, name], i) => { const c = Math.floor(i / 7), r = i % 7, x = 124 + c * 300, y = 470 + r * 66, on = SHOW[k][1] === i, a = clamp(rm(lt, 0.3 + i * 0.03, 0.6 + i * 0.03)) * (1 - env.phase.out);
        ctx.save(); ctx.globalAlpha *= a; if (on) { rr(ctx, x - 16, y - 40, 280, 56, 10); ctx.fillStyle = 'rgba(91,69,240,0.35)'; ctx.fill(); ctx.strokeStyle = '#A89BFF'; ctx.lineWidth = 1.5; ctx.stroke(); }
        ctx.font = `600 20px ${FAM.mono}`; ctx.fillStyle = on ? '#CFC7FF' : '#908CB1'; ctx.fillText(no, x, y - 4); ctx.font = `${on ? 750 : 600} 30px ${FAM.display}`; ctx.fillStyle = on ? '#FFFFFF' : '#BDB9DC'; ctx.fillText(name, x + 40, y - 2); ctx.restore(); });
      T.headline(ctx, ['14가지 도구가', '한곳에.'], 114, 220, lt - 0.12, { size: 92, gap: 104, out: { at: outAt } });
    },
  };
})();
