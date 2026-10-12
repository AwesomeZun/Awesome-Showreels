// json (2 bars; 3 in the 30): it stays in the browser. The app's JSON tool with the pasted JSON on one minified line
// (its tree already reads it: root Object(6), members Array(3), and ✓ 유효한 JSON · 객체 · 키 6개 · 1ms 미만); ⌘↵ is
// pressed on beat 3 and the line unfolds into formatted JSON under a lilac scan line, as the app's 정리하기 does. The
// headline is the app's own promise: 입력한 내용은 이 브라우저 / 밖으로 나가지 않아요.
(() => {
  const T = TT, K = 1.0, GX = 330, GY = 380;
  SCENES['json'] = {
    draw(ctx, t, env) {
      const lt = env.lt, B = env.beatSec, outAt = env.dur - env.outSec;
      T.stage(ctx, t, { glowX: 960, glowY: 700, glowR: 1200 });
      const e = styleSpring(lt + 0.04, { f: 2.2, z: 0.68 }), gy = GY + (1 - e) * 160, fx = 3 * B;
      ctx.save(); ctx.globalAlpha *= clamp(e * 1.6);
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 24; rr(ctx, GX, gy, 1260 * K, 621 * K, 14); ctx.fillStyle = '#0B0B12'; ctx.fill(); ctx.shadowColor = 'transparent';
      T.draw(ctx, 'json_before', GX, gy, K);
      const s = Ease.ioC(clamp((lt - fx) / 0.7));                                  // the scan: formatted above, minified below
      if (s > 0) { ctx.save(); ctx.beginPath(); ctx.rect(GX, gy, 622 * K, (47 + 454 * s) * K); ctx.clip(); T.draw(ctx, 'json_after', GX, gy, K); ctx.restore();
        if (s < 1) { const ly = gy + (47 + 454 * s) * K; ctx.save(); ctx.fillStyle = '#A89BFF'; ctx.shadowColor = '#A89BFF'; ctx.shadowBlur = 16; ctx.fillRect(GX, ly - 1.5, 622 * K, 3); ctx.restore(); } }
      // the button answers the keys
      const press = lt > fx - 0.08 && lt < fx + 0.12; if (press) { ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.25)'; rr(ctx, GX + 503 * K, gy + 526 * K, 106 * K, 40 * K, 10); ctx.fill(); ctx.restore(); }
      const ring = clamp((lt - fx) / 0.5); if (ring > 0 && ring < 1) { ctx.save(); ctx.globalAlpha *= 1 - ring; ctx.strokeStyle = '#A89BFF'; ctx.lineWidth = 3; rr(ctx, GX + 503 * K - 12 * ring, gy + 526 * K - 12 * ring, 106 * K + 24 * ring, 40 * K + 24 * ring, 12); ctx.stroke(); ctx.restore(); }
      ctx.restore();
      const ka = clamp(rm(lt, 1.6 * B, 2 * B)) * (1 - clamp((lt - fx - 0.8) / 0.3)), kp = press ? 1 : 0;
      T.key(ctx, '⌘', GX + 470 * K, gy + 452 * K, 56, kp, { alpha: ka }); T.key(ctx, '↵', GX + 540 * K, gy + 452 * K, 56, kp, { alpha: ka });
      T.headline(ctx, ['입력한 내용은 이 브라우저', '밖으로 나가지 않아요.'], 114, 190, lt - 0.12, { size: 80, gap: 92, out: { at: outAt } });
    },
  };
})();
