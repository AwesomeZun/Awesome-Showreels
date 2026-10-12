// demos (3 bars; 4 in the 30): try them. A stack of the app's live demo stages on the right; a cursor taps each, and
// each plays its real animation from frames captured in the app (its iframe paused and stepped every 50 ms): the
// confetti burst, the ripple, the heart that ticks 128 to 129. After each one the top stage swipes away like the app's
// own stack swipe. The headline on the left: 인터랙션 27종을 / 직접 눌러 보세요. In the 30 the last stage settles into
// a wall of all 27 cards (captured from the app's showcase).
(() => {
  const M = MK, K = 1.25, CW = 640 * K + 32, CH = 96 + 420 * K + 16, X0 = 990, Y0 = 236;
  const ST = [
    { p: 'confetti', n: 25, no: '03', en: 'CONFETTI BURST', ko: '컨페티 버스트', tap: 1, off: 3.6 },
    { p: 'ripple', n: 15, no: '02', en: 'RIPPLE', ko: '리플 버튼', tap: 4.5, off: 6.6 },
    { p: 'heart', n: 19, no: '08', en: 'HEART BURST', ko: '좋아요 하트 파티클', tap: 7.5, off: 99 },
  ];
  const BTN = [320, 262], CR = [110, 90, 420, 276], KZ = 640 * K / 420;   // the stage, zoomed on its button
  function stageCard(ctx, s, x, y, ms, o = {}) {
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
    ctx.translate(x + CW / 2, y + CH / 2); ctx.rotate(o.rot || 0); ctx.scale(o.sc ?? 1, o.sc ?? 1); ctx.translate(-CW / 2, -CH / 2);
    ctx.shadowColor = 'rgba(10,13,31,0.16)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 22;
    rr(ctx, 0, 0, CW, CH, 26); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(10,13,31,0.1)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#0B2FE6'; circle(ctx, 30, 40, 6); ctx.fill();
    M.label(ctx, s.no + ' · ' + s.en, 48, 48, { size: 22, color: '#555B7C' });
    ctx.font = `800 36px ${FAM.display}`; ctx.fillStyle = '#0A0D1F'; ctx.textAlign = 'right'; ctx.fillText(s.ko, CW - 28, 52); ctx.textAlign = 'left';
    ctx.save(); rr(ctx, 16, 80, 640 * K, 420 * K, 16); ctx.clip(); M.flip(ctx, s.p, s.n, ms, 16, 80, KZ, { crop: CR }); ctx.restore();
    ctx.restore();
  }
  SCENES['demos'] = {
    draw(ctx, t, env) {
      const lt = env.lt, B = env.beatSec, P = env.palette, outAt = env.dur - env.outSec;
      const wall = env.dur > 14 * B, tw = 11.5 * B;
      M.paperStage(ctx, t, { lightX: 1700 });
      // the headline
      M.label(ctx, '27 INTERACTIONS', 124, 360, { size: 26, color: P.muted, alpha: clamp(rm(lt, 0.1, 0.4)) * (1 - env.phase.out) });
      kinetic(ctx, '인터랙션 27종을', 118, 480, lt - 0.15, { size: 92, fam: 'display', weight: 900, ls: -4, stagger: 0.03, dur: 0.45, rise: 36, blur: 5,
        colorFn: (i) => (i >= 5 && i <= 7) ? P.accent : P.ink, out: { at: outAt } });
      kinetic(ctx, '직접 눌러 보세요.', 118, 590, lt - 0.4, { size: 92, fam: 'display', weight: 900, ls: -4, stagger: 0.03, dur: 0.45, rise: 36, blur: 5, color: P.ink, out: { at: outAt } });
      kinetic(ctx, '버튼 · 카드 · 입력 · 텍스트 · 피드백', 122, 700, lt - 0.9, { size: 40, fam: 'sans', weight: 600, ls: -0.5, stagger: 0.015, dur: 0.4, rise: 14, blur: 4, color: P.ink2, out: { at: outAt } });
      // the stack: cards below the top one wait offset and a touch smaller
      const enter = styleSpring(lt + 0.02, { f: 1.7, z: 0.68 });
      const gone = ST.map(s => clamp((lt - s.off * B) / 0.4));
      const top = gone.findIndex(g => g < 1);
      const wk = wall ? Ease.ioC(clamp((lt - tw) / 0.55)) : 0;
      for (let i = ST.length - 1; i >= 0; i--) {
        const s = ST[i], g = gone[i]; if (g >= 1) continue;
        const depth = Math.max(0, i - top - (top >= 0 && i > top ? clamp((lt - ST[top].off * B) / 0.4) : 0));
        const ms = (lt - s.tap * B) * 1000;
        const sx = X0 + depth * 30 + (1 - enter) * 900, sy = Y0 + depth * 26;
        const fly = Ease.inC(g);
        let x = sx - fly * 1300, y = sy - fly * 160, rot = -0.22 * fly + depth * 0.025, sc = 1 - depth * 0.05;
        let a = (1 - depth * 0.25) * (depth > 1.5 ? 0 : 1);
        if (i === 2 && wk > 0) { const cell = slot(7); x = lerp(x, cell.x - (CW - cell.w) / 2, wk); y = lerp(y, cell.y - (CH - cell.h) / 2, wk); sc = lerp(sc, cell.w / CW, wk); a *= 1 - clamp((wk - 0.8) / 0.2); }
        stageCard(ctx, s, x, y, i === top || g > 0 ? ms : -1, { rot, sc, alpha: a });
      }
      // the wall of 27 (the 30 only)
      if (wall) for (let i = 0; i < 27; i++) {
        const c = slot(i), d = Math.hypot(i % 7 - 0, Math.floor(i / 7) - 1), at = tw + 0.3 + (i === 7 ? 0.25 : 0.04 * Math.abs(i - 7));
        const p = styleSpring(lt - at, { f: 2.6, z: 0.55 }); if (lt < at) continue;
        ctx.save(); ctx.globalAlpha *= clamp((lt - at) * 6); ctx.translate(c.x + c.w / 2, c.y + c.h / 2); ctx.scale(p, p);
        const im = IMG['captures/ui/app/cards_' + i]; if (im) { const h = im.height * c.w / im.width; ctx.drawImage(im, -c.w / 2, -h / 2, c.w, h); } ctx.restore();
      }
      // the cursor, tapping each stage's button in turn
      const pts = ST.map(s => [s.tap * B, X0 + 16 + (BTN[0] - CR[0]) * KZ, Y0 + 80 + (BTN[1] - CR[1]) * KZ]);
      let cx = 1500, cy = 1150, press = 0;
      if (lt < pts[0][0]) { const a = Ease.ioC(clamp((lt - 0.15) / (pts[0][0] - 0.15))); cx = lerp(1700, pts[0][1], a); cy = lerp(1100, pts[0][2], a); }
      else { let k = pts.findIndex((p, i) => i === pts.length - 1 || lt < pts[i + 1][0]); const p0 = pts[k], p1 = pts[k + 1];
        if (p1) { const a = Ease.ioC(clamp((lt - p0[0] - 0.4) / (p1[0] - p0[0] - 0.4))); cx = lerp(p0[1], p1[1], a) + Math.sin(a * Math.PI) * 120; cy = lerp(p0[2], p1[2], a) + Math.sin(a * Math.PI) * 140; }
        else { const a = Ease.ioC(clamp((lt - p0[0] - 0.8) / 0.8)); cx = lerp(p0[1], 1880, a); cy = lerp(p0[2], 1160, a); }
        press = pts.some(p => lt - p[0] > -0.05 && lt - p[0] < 0.12) ? 1 : 0; }
      if (!wall || lt < tw) M.cursor(ctx, cx + 4, cy + 6, 1.5, press);
    },
  };
  function slot(i) { const w = 118, h = 152, gx = 8, gy = 12, c = i % 7, r = Math.floor(i / 7); return { x: 980 + c * (w + gx), y: 252 + r * (h + gy), w, h }; }
})();
