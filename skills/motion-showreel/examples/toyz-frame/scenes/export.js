// export (2 bars, 3 in the 30; the drop): one file. The app's real export card lands on the left, its estimated size
// 2.02 MB and the line under it (HTML 1 · 이미지 12장 (985 KB) · 외부 참조 0) ringed in orange. Its "HTML 파일
// 내려받기" button is pressed: a single file tile (이로아-portfolio.html) springs out of it, arcs to the right and
// lands; a window opens from the tile and shows the finished portfolio (the app's preview, which is the exported
// HTML). Headline: 이미지까지 담아 / HTML 파일 하나로.
(() => {
  const F = FRAME, CX = 116, CY = 520, CK = 1.32;
  const BTN = [9, 158, 444, 64], STATS = [6, 34, 440, 92];             // the size and its line (CSS px in the card)
  function fileTile(ctx, x, y, s, a) {
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(s, s);
    ctx.shadowColor = 'rgba(11,11,13,0.25)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 14;
    ctx.beginPath(); ctx.moveTo(-70, -90); ctx.lineTo(40, -90); ctx.lineTo(70, -60); ctx.lineTo(70, 90); ctx.lineTo(-70, 90); ctx.closePath(); ctx.fillStyle = '#FFFFFF'; ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.strokeStyle = '#D4D5DA'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(40, -90); ctx.lineTo(40, -60); ctx.lineTo(70, -60); ctx.fillStyle = '#ECEDF0'; ctx.fill(); ctx.stroke();
    rr(ctx, -50, 10, 100, 40, 6); ctx.fillStyle = '#FF5A1F'; ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.font = `800 26px ${FAM.mono}`; ctx.textAlign = 'center'; ctx.fillText('HTML', 0, 40);
    ctx.fillStyle = '#0B0B0D'; ctx.fillRect(-46, -56, 60, 6); ctx.fillStyle = '#C7C9CF'; ctx.fillRect(-46, -40, 80, 5); ctx.fillRect(-46, -28, 70, 5); ctx.fillRect(-46, -16, 76, 5);
    ctx.restore();
  }
  SCENES['export'] = {
    draw(ctx, t, env) {
      const lt = env.lt, P = env.palette, B = env.beatSec, out = env.phase.out;
      F.stage(ctx, t, { lightX: 500 });
      // the card
      const e = styleSpring(lt + 0.05, { f: 2.4, z: 0.62 });
      ctx.save(); ctx.globalAlpha *= clamp(e * 1.4); ctx.translate((1 - e) * -120, 0);
      F.draw(ctx, 'export_card', CX, CY, CK);
      const ring = (r, at) => { const k = clamp((lt - at) / 0.3); if (k > 0) F.corners(ctx, CX + r[0] * CK - 8, CY + r[1] * CK - 8, r[2] * CK + 16, r[3] * CK + 16, k, { from: 40, len: 18, lw: 4 }); };
      ring(STATS, 0.6 * B);
      // the press
      const pr = 2 * B, press = lt >= pr ? Math.exp(-(lt - pr) * 7) : 0;
      if (press > 0.01) { ctx.save(); ctx.globalAlpha *= press * 0.35; rr(ctx, CX + BTN[0] * CK, CY + BTN[1] * CK, BTN[2] * CK, BTN[3] * CK, 8); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.restore(); }
      ctx.restore();
      // the file flies out and lands
      const fly = clamp((lt - 2.25 * B) / (1.25 * B)), land = 3.5 * B;
      if (lt > 2.25 * B) {
        const f = Ease.ioC(fly), x0 = CX + 230 * CK, y0 = CY + 190 * CK, x1 = 1010, y1 = 640;
        const x = lerp(x0, x1, f), y = lerp(y0, y1, f) - Math.sin(Math.PI * f) * 260, s = lerp(0.5, 1, f) * (1 + 0.08 * Math.exp(-Math.max(0, lt - land) * 9) * (lt > land ? 1 : 0));
        const open = clamp((lt - 4.5 * B) / (1.0 * B));
        fileTile(ctx, x, y, s, 1 - Ease.inC(clamp(open * 1.6)));
        if (lt > land) F.label(ctx, '이로아-portfolio.html', x1, y1 + 140, { size: 22, align: 'center', color: P.ink2, alpha: (1 - open) * clamp((lt - land) / 0.3) });
        // the window opens from the tile
        if (open > 0) {
          const o = Ease.outC(open), w = lerp(160, 860, o), h = lerp(200, 600, o), wx = lerp(x1 - 80, 980, o), wy = lerp(y1 - 100, 190, o);
          const c = F.windowFrame(ctx, wx, wy, w, h, { title: o > 0.6 ? '이로아-portfolio.html' : '', bar: lerp(20, 44, o) });
          ctx.save(); ctx.beginPath(); ctx.rect(c.x, c.y, c.w, c.h); ctx.clip(); const k = c.w / 1044; F.draw(ctx, 'tpl_grid', c.x - 20 * k, c.y - 20 * k, k); ctx.restore();
          F.corners(ctx, wx - 14, wy - 14, w + 28, h + 72, clamp((open - 0.6) / 0.4), { from: 80, len: 40, lw: 6 });
        }
      }
      F.label(ctx, '04 EXPORT', 120, 160, { size: 22, color: P.accent, alpha: clamp(rm(lt, 0.05, 0.3)) * (1 - out) });
      F.headline(ctx, ['이미지까지 담아', 'HTML 파일 하나로.'], 114, 270, lt - 0.1, { size: 84, out: { at: env.dur - env.outSec } });
    },
  };
})();
