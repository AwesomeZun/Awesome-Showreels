// today (3 bars; 4 in the 30): one tap at a time. The app's check-in list (captured at each step) beside the date and
// the chrome ring. The cursor taps 물 8잔's + five times on the half beat (3 → 8 of 8) and that routine closes: the
// ring sweeps to 2/3; then it checks 책 20쪽 and the last loop closes: 3/3, and the ring does the app's own celebration,
// one glint round and a small pop, as the app's message turns to 오늘의 고리를 모두 이었어요. The headline: 탭 한 번으로 /
// 오늘의 고리를 이어요.
(() => {
  const L = LP, K = 1.08, PX = 1010, PY = 250;
  const PLUS = [564, 222], CHECK = [37, 398];
  const at = (b, B) => b * B;
  SCENES['today'] = {
    draw(ctx, t, env) {
      const lt = env.lt, B = env.beatSec, outAt = env.dur - env.outSec, out = env.phase.out;
      L.page(ctx, t, { gx: 600, gy: 640 }); L.strip(ctx);
      const taps = [1, 1.5, 2, 2.5, 3].filter(b => lt >= at(b, B)).length, checked = lt >= at(5, B);
      const v = (1 + Ease.ioC(clamp((lt - at(3, B)) / 0.5)) + Ease.ioC(clamp((lt - at(5, B)) / 0.5))) / 3;
      // the list: its state at this moment (a quick crossfade at each change)
      const e = styleSpring(lt + 0.05, { f: 2.2, z: 0.7 });
      ctx.save(); ctx.globalAlpha *= clamp(e * 1.6); ctx.translate((1 - e) * 200, 0);
      L.card(ctx, PX, PY, 665 * K, 677 * K, { r: 18 * K });
      const f2 = clamp((lt - at(3, B)) / 0.15), f3 = clamp((lt - at(5, B)) / 0.15);
      L.draw(ctx, 'list_1', PX, PY, K); if (f2 > 0) L.draw(ctx, 'list_2', PX, PY, K, { alpha: f2 }); if (f3 > 0) L.draw(ctx, 'list_3', PX, PY, K, { alpha: f3 });
      if (taps > 0 && taps < 5) { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(PX + 493 * K, PY + 210 * K, 13 * K, 20 * K); ctx.font = `800 ${17 * K}px ${FAM.display}`; ctx.fillStyle = '#16264A'; ctx.fillText(String(3 + taps), PX + 496 * K, PY + 227.5 * K); }
      ctx.restore();
      // the cursor: five taps on +, then the check
      let cx = PX + PLUS[0] * K, cy = PY + PLUS[1] * K;
      if (lt < at(1, B)) { const u = Ease.ioC(clamp((lt - 0.2) / (at(1, B) - 0.2))); cx = lerp(1900, cx, u); cy = lerp(1100, cy, u); }
      else if (lt > at(3.4, B)) { const u = Ease.ioC(clamp((lt - at(3.4, B)) / (at(1.5, B)))); cx = lerp(cx, PX + CHECK[0] * K, u); cy = lerp(cy, PY + CHECK[1] * K, u);
        if (lt > at(5.6, B)) { const w = Ease.ioC(clamp((lt - at(5.6, B)) / 0.7)); cx = lerp(cx, 1900, w); cy = lerp(cy, 1150, w); } }
      const press = [1, 1.5, 2, 2.5, 3, 5].some(b => lt > at(b, B) - 0.05 && lt < at(b, B) + 0.09) ? 1 : 0;
      ctx.save(); ctx.translate(cx + 4, cy + 6); ctx.scale(1.4 * (1 - 0.12 * press), 1.4 * (1 - 0.12 * press)); ctx.shadowColor = 'rgba(22,38,74,0.35)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 30); ctx.lineTo(8, 23); ctx.lineTo(13, 34); ctx.lineTo(18, 32); ctx.lineTo(13, 21); ctx.lineTo(23, 21); ctx.closePath(); ctx.fillStyle = '#16264A'; ctx.fill(); ctx.shadowColor = 'transparent'; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
      // the date, the ring and the app's message
      ctx.save(); ctx.globalAlpha *= clamp(rm(lt, 0.1, 0.4)) * (1 - out); ctx.fillStyle = '#16264A'; ctx.font = `400 84px ${FAM.display}`; if ('letterSpacing' in ctx) ctx.letterSpacing = '-4px'; ctx.fillText('10월', 120, 410); const mw = ctx.measureText('10월 ').width; ctx.font = `850 84px ${FAM.display}`; ctx.fillText('12일', 120 + mw, 410); ctx.restore();
      const g = lt - at(5, B) - 0.45, pop = g > 0 && g < 0.8 ? Math.sin(clamp(g / 0.8) * Math.PI) * 0.04 : 0, cx0 = 420, cy0 = 680, s = 430 * (1 + pop);
      L.ring(ctx, cx0, cy0, s, s * 0.16, v, { glint: g });
      ctx.save(); ctx.fillStyle = '#16264A'; ctx.textAlign = 'center'; ctx.font = `850 ${s * 0.2}px ${FAM.display}`; ctx.fillText(String(Math.round(v * 3)), cx0 - s * 0.04, cy0 + s * 0.04); ctx.font = `700 ${s * 0.07}px ${FAM.display}`; ctx.fillText('/3', cx0 + s * 0.07, cy0 + s * 0.04);
      L.label(ctx, `${Math.round(v * 100)}% DONE`, cx0, cy0 + s * 0.13, { size: 20, align: 'center' }); ctx.restore();
      const msg = checked ? '오늘의 고리를 모두 이었어요.' : taps >= 5 ? '고리 1개만 더 이으면 오늘이 완성돼요.' : '고리 2개만 더 이으면 오늘이 완성돼요.';
      ctx.save(); ctx.font = `700 30px ${FAM.display}`; ctx.fillStyle = '#16264A'; ctx.textAlign = 'center'; ctx.globalAlpha *= (1 - out); ctx.fillText(msg, cx0, 980); ctx.restore();
      kinetic(ctx, '탭 한 번으로', 116, 170, lt - 0.1, { size: 76, fam: 'display', weight: 800, color: '#16264A', ls: -3.2, stagger: 0.022, dur: 0.45, rise: 22, blur: 5, out: { at: outAt } });
      kinetic(ctx, '오늘의 고리를 이어요.', 116, 258, lt - 0.28, { size: 76, fam: 'display', weight: 800, color: '#16264A', ls: -3.2, stagger: 0.022, dur: 0.45, rise: 22, blur: 5, out: { at: outAt } });
    },
  };
})();
