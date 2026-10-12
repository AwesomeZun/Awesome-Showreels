// paste (2 bars, 3 in the 30): the real "여러 개 붙여넣기" dialog. It is centred when the camera comes through the
// ring and slides right as the headline rises on the left: 대화째 붙여넣으면 / 링크만 골라 담아요. A chat fragment is
// pasted (three lines appear one after another), a lime scan runs down the box and boxes each URL the app found,
// the app's own summary line counts them (URL 3개를 찾았어요 · 새 링크 3개) and its three rows pop in with their
// "새 링크" badges. The cursor presses "새 링크 3개 추가"; on the last beat the three links fly off to the right.
// Everything inside the dialog is the captured app (capture/app.json); only the frame, scan, boxes and cursor are code.
(() => {
  const T = TROVE, K = 1.12;
  const LINES = [[200.5, 215], [223.5, 238], [246.5, 261]];                     // pasted lines (CSS px in the dialog)
  const URLS = [[106, 252], [126, 309], [134.5, 478]];                           // the URL inside each line
  const ROWS = [421.6, 475.3, 529.1], ROWH = 53.75;
  const BTN = { x: 568, y: 756.3, w: 132, h: 52 };
  const beat = (env, b) => b * env.beatSec;
  function frame(ctx, x, y, w, h, a) {
    ctx.save(); ctx.globalAlpha *= a;
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 30;
    rr(ctx, x, y, w, h, 16); ctx.fillStyle = '#111215'; ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  }
  function cursor(ctx, x, y, s, press) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s * (1 - 0.12 * press), s * (1 - 0.12 * press));
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 34); ctx.lineTo(9, 26); ctx.lineTo(15, 40); ctx.lineTo(21, 37); ctx.lineTo(15, 24); ctx.lineTo(26, 24); ctx.closePath();
    ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.strokeStyle = '#08090A'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  }
  SCENES['paste'] = {
    draw(ctx, t, env) {
      const lt = env.lt, P = env.palette, out = env.phase.out;
      T.stage(ctx, t, { glowX: 1450, glowY: 300 });
      const L = T.layer('bulk'), dw = L.w * K, dh = L.h * K;
      const slide = Ease.ioC(clamp(rm(lt, 0.05, 0.75)));
      const dx = lerp((W - dw) / 2, 1062, slide) + Math.sin(lt * 0.7) * 4, dy = (H - dh) / 2 + Math.cos(lt * 0.6) * 4;
      const mx = (x) => dx + x * K, my = (y) => dy + y * K;
      frame(ctx, dx, dy, dw, dh, 1);
      // the dialog without its live parts (pasted text, the summary line and the rows are revealed below)
      ctx.save(); ctx.beginPath(); ctx.rect(dx, dy, dw, my(380) - dy); ctx.rect(dx, my(590), dw, dy + dh - my(590)); ctx.clip();
      T.draw(ctx, 'bulk', dx, dy, K); ctx.restore();
      // the pasted text: each line wipes in, after a covered (empty) box
      const pasteAt = beat(env, 1.5);
      ctx.save(); ctx.fillStyle = '#0C0D0F'; ctx.fillRect(mx(27), my(192), (690 - 27) * K, (270 - 192) * K);
      LINES.forEach(([a, b], i) => {
        const p = Ease.outC(clamp((lt - pasteAt - i * 0.1) / 0.16)); if (p <= 0) return;
        ctx.save(); ctx.beginPath(); ctx.rect(mx(30), my(a - 4), (660 * p) * K, (b - a + 8) * K); ctx.clip();
        T.draw(ctx, 'bulk', dx, dy, K); ctx.restore();
      });
      ctx.restore();
      // the scan, then one lime box per URL the app found
      const scan = clamp((lt - beat(env, 2.5)) / beat(env, 1.2));
      if (scan > 0 && scan < 1) {
        const sy = my(lerp(195, 268, Ease.ioQ(scan)));
        const g = ctx.createLinearGradient(0, sy - 30, 0, sy + 4); g.addColorStop(0, 'rgba(198,244,50,0)'); g.addColorStop(1, 'rgba(198,244,50,0.32)');
        ctx.fillStyle = g; ctx.fillRect(mx(28), sy - 30, 660 * K, 34); ctx.fillStyle = P.accent; ctx.fillRect(mx(28), sy, 660 * K, 2);
      }
      URLS.forEach(([a, b], i) => {
        const at = beat(env, 3 + i * 0.5), p = Ease.outBack(clamp((lt - at) / 0.22), 2.2); if (lt < at) return;
        const [ya, yb] = LINES[i], cx = (a + b) / 2, w = (b - a + 8) * p, x = cx - w / 2;
        ctx.save(); rr(ctx, mx(x), my(ya - 4), w * K, (yb - ya + 8) * K, 5);
        ctx.fillStyle = 'rgba(198,244,50,0.16)'; ctx.fill(); ctx.strokeStyle = P.accent; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      });
      // the summary line and the rows, from the capture
      const sumP = clamp((lt - beat(env, 3.2)) / 0.25);
      if (sumP > 0) { ctx.save(); ctx.globalAlpha *= sumP; T.draw(ctx, 'bulk', mx(0), my(380) + (1 - sumP) * 8, K, { crop: [0, 380, 718, 34] }); ctx.restore(); }
      ROWS.forEach((ry, i) => {
        const at = beat(env, 4.5 + i * 0.25), p = clamp((lt - at) / 0.3); if (p <= 0) return;
        const e = styleSpring(lt - at, { f: 2.6, z: 0.55 }), flyK = Ease.inC(clamp((lt - (env.dur - env.outSec) - i * 0.06) / 0.35));
        ctx.save(); ctx.globalAlpha *= clamp(p * 2) * (1 - flyK);
        const ox = flyK * 900, oy = -flyK * (60 + i * 40);
        ctx.translate(mx(359) + ox, my(ry + ROWH / 2) + oy); ctx.scale(0.85 + 0.15 * e, 0.85 + 0.15 * e); ctx.translate(-mx(359), -my(ry + ROWH / 2));
        T.draw(ctx, 'bulk', mx(0), my(ry - 2), K, { crop: [0, ry - 2, 718, ROWH + 2] });
        ctx.restore();
      });
      // the button, pressed on beat 6
      const pressAt = beat(env, 6), press = Math.exp(-Math.max(0, lt - pressAt) * 9) * (lt >= pressAt ? 1 : 0);
      const ring = clamp((lt - pressAt) / 0.5);
      if (ring > 0 && ring < 1) { ctx.save(); ctx.globalAlpha *= 1 - ring; rr(ctx, mx(BTN.x) - 14 * ring, my(BTN.y) - 14 * ring, BTN.w * K + 28 * ring, BTN.h * K + 28 * ring, 12 + 10 * ring); ctx.strokeStyle = P.accent; ctx.lineWidth = 3; ctx.stroke(); ctx.restore(); }
      if (press > 0.01) { ctx.save(); ctx.globalAlpha *= press * 0.5; rr(ctx, mx(BTN.x), my(BTN.y), BTN.w * K, BTN.h * K, 10); ctx.fillStyle = '#E6FF8A'; ctx.fill(); ctx.restore(); }
      // the hold: each new row's badge lights in turn on the beat
      onBeats(env, 1, (i, dt) => {
        const k = clamp(dt / 0.5), ry = ROWS[i % 3]; ctx.save(); ctx.globalAlpha *= (1 - k) * (1 - out); ctx.shadowColor = P.accent; ctx.shadowBlur = 16;
        rr(ctx, mx(634) - 4 * k, my(ry + 14) - 4 * k, 56 * K + 8 * k, 26 * K + 8 * k, 6); ctx.strokeStyle = P.accent; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      }, { from: pressAt + 0.4, until: env.dur - env.outSec });
      const cu = Ease.ioC(clamp((lt - beat(env, 5)) / beat(env, 1)));
      if (lt > beat(env, 4.6)) cursor(ctx, lerp(mx(520), mx(BTN.x + 92), cu) + 900 * Ease.inC(out), lerp(my(640), my(BTN.y + 30), cu), 1.15, press);
      // the headline on the left
      T.label(ctx, 'PASTE ANYTHING', 124, 372, { size: 24, color: P.muted, alpha: clamp(rm(lt, 0.1, 0.4)) * (1 - out) });
      T.headline(ctx, ['대화째 붙여넣으면', '링크만 골라 담아요.'], 120, 500, lt - 0.15, { size: 88, colors: [P.ink, P.accent], out: { at: env.dur - env.outSec } });
      kinetic(ctx, '메모 · 메신저 대화 · 마크다운 목록 그대로', 124, 712, lt - 0.9, { size: 34, fam: 'sans', weight: 500, color: P.ink2, ls: -0.6, stagger: 0.018, dur: 0.45, rise: 14, blur: 4, out: { at: env.dur - env.outSec } });
    },
  };
})();
