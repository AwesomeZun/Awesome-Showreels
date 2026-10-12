// find (2 bars, the 30 only): found again. The real app after a search: the "/" key pops on the left, 시각화 types into
// the app's search box, its count (1건) appears, and the view pans down from the search box to the one card it kept,
// where the app's own highlight marks sit on the matched word in the memo and the tag; lime pulses ring them. The
// headline: / 한 번이면 / 다시 찾아요. The window is the captured screen (capture/app.json, step "search").
(() => {
  const T = TROVE;
  const VIEW = { x: 700, y: 150, w: 1140, h: 780 };
  const A = [330, 0, 900, 616], Bc = [262, 380, 1132, 774];                   // crop windows in CSS px (same aspect)
  const MARKS = [[480, 624, 517, 641], [432, 655, 467, 674]];                // 시각화 in the memo and in the tag (CSS px)
  function keycap(ctx, x, y, s, press, P) {
    ctx.save(); ctx.translate(x, y + press * 6); ctx.scale(s, s);
    const g = ctx.createLinearGradient(0, -60, 0, 60); g.addColorStop(0, '#f4f5f6'); g.addColorStop(0.45, '#c9ccd1'); g.addColorStop(0.55, '#7d8086'); g.addColorStop(1, '#dfe1e4');
    ctx.fillStyle = '#050506'; rr(ctx, -62, -54, 124, 124, 22); ctx.fill();
    rr(ctx, -62, -62 , 124, 118, 22); ctx.fillStyle = g; ctx.fill();
    rr(ctx, -50, -52, 100, 92, 16); ctx.fillStyle = '#16181c'; ctx.fill();
    ctx.fillStyle = P.accent; ctx.font = `700 64px ${FAM.mono}`; ctx.textAlign = 'center'; ctx.fillText('/', 0, 16);
    ctx.restore();
  }
  SCENES['find'] = {
    draw(ctx, t, env) {
      const lt = env.lt, P = env.palette, B = env.beatSec, out = env.phase.out;
      T.stage(ctx, t, { glowX: 1250, glowY: 300 });
      const { img } = T.layer('search'); if (!img) return;
      const pan = Ease.ioC(clamp((lt - 1.5 * B) / (2.2 * B)));
      const crop = A.map((v, i) => lerp(v, Bc[i], pan));
      const kx = VIEW.w / crop[2], d = 2;
      const e = styleSpring(lt + 0.05, { f: 1.8, z: 0.7 });
      ctx.save(); ctx.globalAlpha *= clamp(e * 1.4); ctx.translate(0, (1 - e) * 60);
      ctx.shadowColor = 'rgba(0,0,0,0.65)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 26;
      rr(ctx, VIEW.x, VIEW.y, VIEW.w, VIEW.h, 18); ctx.fillStyle = '#08090A'; ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.save(); rr(ctx, VIEW.x, VIEW.y, VIEW.w, VIEW.h, 18); ctx.clip();
      ctx.drawImage(img, crop[0] * d, crop[1] * d, crop[2] * d, crop[3] * d, VIEW.x, VIEW.y, VIEW.w, VIEW.h);
      const map = (x, y) => [VIEW.x + (x - crop[0]) * kx, VIEW.y + (y - crop[1]) * kx];
      // the query types in (the app's own text is hidden until each character lands), then the count
      const typed = clamp((lt - 0.5 * B) / (0.75 * B)), qx = 563, qw = 598 - 563 + 3;
      const [, ay] = map(qx, 22);
      ctx.fillStyle = '#0C0D0F';
      const [hx0] = map(qx + qw * typed, 0), [hx1, hy1] = map(qx + qw, 42);
      if (typed < 1) ctx.fillRect(hx0, ay, hx1 - hx0, hy1 - ay);
      const cnt = clamp((lt - 1.4 * B) / 0.15); if (cnt < 1) { const [c0x, c0y] = map(1018, 20), [c1x, c1y] = map(1040, 42); ctx.globalAlpha *= 1; ctx.fillRect(c0x, c0y, c1x - c0x, c1y - c0y); }
      if (typed > 0 && typed < 1 && Math.floor(lt * 6) % 2 === 0) { const [cx, cy] = map(qx + qw * typed + 1, 24), [, cy2] = map(0, 40); ctx.fillStyle = P.accent; ctx.fillRect(cx, cy, 2.5, cy2 - cy); }
      // pulses on the app's highlight marks once the card is in view
      MARKS.forEach(([x0, y0, x1, y1], i) => {
        const at = 3.2 * B + i * 0.2, p = clamp((lt - at) / 0.5); if (p <= 0) return;
        const [p0x, p0y] = map(x0, y0), [p1x, p1y] = map(x1, y1);
        onBeats(env, 1, (j, dt) => { const k = clamp(dt / 0.6); ctx.save(); ctx.globalAlpha *= (1 - k) * 0.9; ctx.strokeStyle = P.accent; ctx.lineWidth = 3; rr(ctx, p0x - 6 - 18 * k, p0y - 6 - 12 * k, p1x - p0x + 12 + 36 * k, p1y - p0y + 12 + 24 * k, 8); ctx.stroke(); ctx.restore(); }, { from: at });
        ctx.save(); ctx.globalAlpha *= p; ctx.strokeStyle = P.accent; ctx.lineWidth = 2.5; rr(ctx, p0x - 5, p0y - 5, p1x - p0x + 10, p1y - p0y + 10, 7); ctx.stroke(); ctx.restore();
      });
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1.5; rr(ctx, VIEW.x, VIEW.y, VIEW.w, VIEW.h, 18); ctx.stroke();
      ctx.restore();
      // the key and the headline
      const kp = styleSpring(lt - 0.1, { f: 2.4, z: 0.5 }), press = Math.exp(-Math.max(0, lt - 0.45 * B) * 10) * (lt > 0.45 * B ? 1 : 0);
      ctx.save(); ctx.globalAlpha *= clamp(kp * 1.5) * (1 - out); keycap(ctx, 190, 300, 0.8 + 0.2 * kp, press, P); ctx.restore();
      T.headline(ctx, ['/ 한 번이면', '다시 찾아요.'], 120, 560, lt - 0.35, { size: 96, colors: [P.ink, P.accent], out: { at: env.dur - env.outSec } });
      kinetic(ctx, '제목 · 메모 · 태그 · 도메인을 한꺼번에', 124, 770, lt - 1.0, { size: 32, fam: 'sans', weight: 500, color: P.ink2, ls: -0.5, stagger: 0.018, dur: 0.45, rise: 14, blur: 4, out: { at: env.dur - env.outSec } });
    },
  };
})();
