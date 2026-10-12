// quick (2 bars, 3 in the 30): one line in, four fields out. The app's real quick-add box, large. A line types itself
// in (로그인 버그 고치기 !높음 @Loopdeck 내일); as each token completes, the app's parser chip for it drops into the row
// below (제목 · 우선순위 높음 · Loopdeck · 마감 10/13 (화)) and an orange lead joins the token to its chip. Enter
// presses the orange 추가 button. The headline above: 한 줄로 적으면 / 알아서 나눠 담아요. Inside the box everything is
// the captured app at four typing stages (capture/app.json); the leads, the caret and the press are code.
(() => {
  const K = PULSE, S = 2.0, X0 = 110, Y0 = 540;
  const TEXT = [33, 300], TY = [58, 80];
  const TOKENS = [[33, 148], [151, 184], [186, 269], [272, 300]];         // title, !높음, @Loopdeck, 내일 (CSS px in the box)
  const CHIPS = [[17, 154], [160, 265], [271, 367], [373, 496]], CY = [102, 131];
  const AT = [1.25, 1.75, 2.5, 3.0];                                       // beats at which each token completes
  const BTN = [753, 43, 84, 51];
  SCENES['quick'] = {
    draw(ctx, t, env) {
      const lt = env.lt, P = env.palette, B = env.beatSec, out = env.phase.out;
      K.stage(ctx, t, { lightX: 600 });
      env.fx.zoom = (env.fx.zoom || 1) * (1 + Math.min(0.03, 0.006 * Math.max(0, lt)));
      const sx = (x) => X0 + x * S, sy = (y) => Y0 + y * S;
      const e = styleSpring(lt + 0.1, { f: 2.4, z: 0.6 });
      ctx.save(); ctx.globalAlpha *= clamp(e * 1.5); ctx.translate(0, (1 - e) * 40);
      // the box without its hint row, the input emptied
      ctx.save(); ctx.beginPath(); ctx.rect(sx(0), sy(0), 860 * S, 98 * S); ctx.clip(); K.draw(ctx, 'qa_empty', X0, Y0, S); ctx.restore();
      ctx.fillStyle = '#FDFDFD'; ctx.fillRect(sx(22), sy(47), 715 * S, 43 * S);
      // typing: the captured text revealed up to the caret
      const p = clamp((lt - 0.5 * B) / ((3.0 - 0.5) * B));
      const xs = [TOKENS[0][0], ...TOKENS.map(k => k[1])], bs = [0.5, ...AT];
      let cx = TEXT[0];
      for (let i = 0; i < bs.length - 1; i++) { const a = bs[i] * B, b = bs[i + 1] * B; if (lt >= a) cx = lerp(xs[i], xs[i + 1], clamp((lt - a) / (b - a))); }
      if (lt > 0.5 * B) { ctx.save(); ctx.beginPath(); ctx.rect(sx(TEXT[0] - 2), sy(TY[0] - 4), (cx - TEXT[0] + 2) * S, (TY[1] - TY[0] + 8) * S); ctx.clip(); K.draw(ctx, 'qa_3', X0, Y0, S); ctx.restore(); }
      if (Math.floor(lt * 3.6) % 2 === 0 || (p > 0 && p < 1)) { ctx.fillStyle = P.accent; ctx.fillRect(sx(cx + 1.5), sy(TY[0] - 2), 3, (TY[1] - TY[0] + 4) * S); }
      // once there is text, the app enables its orange button (from the typed capture)
      if (lt > 0.5 * B) { ctx.save(); ctx.globalAlpha *= clamp((lt - 0.5 * B) / 0.12); ctx.beginPath(); ctx.rect(sx(BTN[0] - 6), sy(BTN[1] - 6), (BTN[2] + 12) * S, (BTN[3] + 14) * S); ctx.clip(); K.draw(ctx, 'qa_3', X0, Y0, S); ctx.restore(); }
      // parsed: token box, lead and chip
      TOKENS.forEach(([a, b], i) => {
        const at = AT[i] * B, q = clamp((lt - at) / 0.25); if (q <= 0) return;
        const pop = styleSpring(lt - at, { f: 3, z: 0.5 });
        if (i > 0) { ctx.save(); ctx.globalAlpha *= q; rr(ctx, sx(a - 3), sy(TY[0] - 5), (b - a + 6) * S, (TY[1] - TY[0] + 10) * S, 6); ctx.fillStyle = 'rgba(240,90,40,0.12)'; ctx.fill(); ctx.strokeStyle = P.accent; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); }
        const [c0, c1] = CHIPS[i], fx = sx((a + b) / 2), fy = sy(TY[1] + 6), tx = sx((c0 + c1) / 2), ty = sy(CY[0]);
        const lead = Ease.outC(clamp((lt - at) / 0.3));
        ctx.save(); ctx.strokeStyle = P.accent; ctx.lineWidth = 2.5; ctx.setLineDash([]);
        const pts = []; for (let k = 0; k <= 20; k++) pts.push(qbez([fx, fy], [fx, (fy + ty) / 2 + 20], [tx, ty], k / 20));
        polyStroke(ctx, pts, lead); ctx.stroke(); ctx.fillStyle = P.accent; circle(ctx, fx, fy, 4); ctx.fill(); ctx.restore();
        ctx.save(); ctx.globalAlpha *= q; const cxm = sx((c0 + c1) / 2), cym = sy((CY[0] + CY[1]) / 2);
        ctx.translate(cxm, cym + (1 - pop) * -18); ctx.scale(0.8 + 0.2 * pop, 0.8 + 0.2 * pop); ctx.translate(-cxm, -cym);
        ctx.beginPath(); ctx.rect(sx(c0 - 2), sy(CY[0] - 2), (c1 - c0 + 4) * S, (CY[1] - CY[0] + 4) * S); ctx.clip(); K.draw(ctx, 'qa_3', X0, Y0, S); ctx.restore();
      });
      // enter: the button presses and glows
      const pr = 5.5 * B, press = lt >= pr ? Math.exp(-(lt - pr) * 7) : 0, ring = clamp((lt - pr) / 0.5);
      if (press > 0.01) { ctx.save(); ctx.globalAlpha *= press * 0.45; rr(ctx, sx(BTN[0]), sy(BTN[1]), BTN[2] * S, BTN[3] * S, 10); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.restore(); }
      if (ring > 0 && ring < 1) { ctx.save(); ctx.globalAlpha *= 1 - ring; ctx.strokeStyle = P.accent; ctx.lineWidth = 3; rr(ctx, sx(BTN[0]) - 16 * ring, sy(BTN[1]) - 16 * ring, BTN[2] * S + 32 * ring, BTN[3] * S + 32 * ring, 12 + 10 * ring); ctx.stroke(); ctx.restore(); }
      ctx.restore();
      // the hold: the chips light in turn
      onBeats(env, 1, (i, dt) => { const c = CHIPS[i % 4], k = clamp(dt / 0.5); ctx.save(); ctx.globalAlpha *= (1 - k) * 0.9; ctx.strokeStyle = P.accent; ctx.lineWidth = 2.5; rr(ctx, sx(c[0]) - 5 - 8 * k, sy(CY[0]) - 5 - 6 * k, (c[1] - c[0]) * S + 10 + 16 * k, (CY[1] - CY[0]) * S + 10 + 12 * k, 10); ctx.stroke(); ctx.restore(); }, { from: 6.5 * B, until: env.dur - env.outSec });
      // the headline
      K.label(ctx, 'QUICK ADD', 118, 230, { size: 24, color: P.accent, alpha: clamp(rm(lt, 0.05, 0.3)) * (1 - out) });
      K.headline(ctx, ['한 줄로 적으면', '알아서 나눠 담아요.'], 112, 340, lt - 0.1, { size: 92, colors: [P.ink, P.accent], out: { at: env.dur - env.outSec } });
    },
  };
})();
