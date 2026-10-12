// paste (3 bars; 4 in the 30): smart paste. The app's own pad on the right; every two and a half beats a clipping lands
// in it (⌘V on the keys below) and the pad answers as the real app did: 감지 · JSON and the JSON tool offered with 01 lit
// in its table of formats, then a JWT (06), a colour (02) and a Unix time (11). The headline is the pad's own line:
// 붙여넣으면, / 알맞은 도구를 / 골라 드려요.
(() => {
  const T = TT, K = 1.42, PX = 1000, PY = 210;
  const CLIPS = [
    { s: 'smart_json', kind: 'JSON', text: '{"studio":"달빛 공방","project":"tiny.tools","version":"1.0.0","released":true,…' },
    { s: 'smart_jwt', kind: 'JWT', text: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMDI0Iiwi…' },
    { s: 'smart_color', kind: '색', text: '#5B45F0', swatch: '#5B45F0' },
    { s: 'smart_epoch', kind: '타임스탬프', text: '1791766800' },
  ];
  const AT = [1.5, 4, 6.5, 9];
  SCENES['paste'] = {
    draw(ctx, t, env) {
      const lt = env.lt, B = env.beatSec, P = env.palette, outAt = env.dur - env.outSec, n = 4;
      T.stage(ctx, t, { glowX: 1420, glowY: 520 });
      let k = -1; for (let i = 0; i < n; i++) if (lt >= AT[i] * B) k = i;
      // the pad: the state it is in, a quick flash as it changes
      const e = styleSpring(lt + 0.05, { f: 2.2, z: 0.66 }), py = PY + (1 - e) * 120;
      ctx.save(); ctx.globalAlpha *= clamp(e * 1.6);
      ctx.shadowColor = 'rgba(91,69,240,0.45)'; ctx.shadowBlur = 80; ctx.shadowOffsetY = 20; rr(ctx, PX, py, 591 * K, 477 * K, 18 * K / 1.4); ctx.fillStyle = '#0E0E18'; ctx.fill(); ctx.shadowColor = 'transparent';
      if (k < 0) T.draw(ctx, 'smart_idle', PX, py, K);
      else { const f = clamp((lt - AT[k] * B) / 0.12); if (f < 1) T.draw(ctx, k ? CLIPS[k - 1].s : 'smart_idle', PX, py, K); T.draw(ctx, CLIPS[k].s, PX, py, K, { alpha: f });
        const ring = clamp((lt - AT[k] * B - 0.08) / 0.6); if (ring < 1) { ctx.save(); ctx.globalAlpha *= 1 - ring; ctx.strokeStyle = '#A89BFF'; ctx.lineWidth = 3;
          rr(ctx, PX + 24 * K - 16 * ring, py + 272 * K - 16 * ring, 537 * K + 32 * ring, 60 * K + 32 * ring, 12 + 10 * ring); ctx.stroke(); ctx.restore(); } }
      ctx.restore();
      // the clipping that lands next, and the keys
      for (let i = 0; i < n; i++) {
        const c = CLIPS[i], t0 = (AT[i] - 1.25) * B, t1 = AT[i] * B - 0.04; if (lt < t0 || lt > t1 + 0.02) continue;
        const a = Ease.outC(clamp((lt - t0) / 0.25)), fly = Ease.inC(clamp((lt - (t1 - 0.32)) / 0.32));
        const x0 = 120, y0 = 760, x1 = PX + 24 * K, y1 = py + 120 * K, x = lerp(x0, x1, fly), y = lerp(y0, y1, fly), sc = lerp(1, 0.6, fly);
        ctx.save(); ctx.globalAlpha *= a * (1 - 0.3 * fly); ctx.translate(x, y); ctx.scale(sc, sc);
        ctx.font = `500 28px ${FAM.mono}`; const w = Math.min(780, ctx.measureText(c.text).width + (c.swatch ? 110 : 56));
        rr(ctx, 0, 0, w, 76, 14); ctx.fillStyle = '#13131C'; ctx.fill(); ctx.strokeStyle = 'rgba(168,155,255,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
        let tx = 28; if (c.swatch) { rr(ctx, 24, 18, 40, 40, 8); ctx.fillStyle = c.swatch; ctx.fill(); tx = 82; }
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w - 20, 76); ctx.clip(); ctx.fillStyle = '#CFC7FF'; ctx.fillText(c.text, tx, 48); ctx.restore(); ctx.restore();
      }
      if (k < n - 1 || lt < AT[n - 1] * B + 0.2) { const next = Math.min(n - 1, k + 1), dt = lt - (AT[next] * B - 0.3), press = dt > 0 && dt < 0.22 ? 1 : 0, ka = clamp(rm(lt, 0.4, 0.7));
        T.key(ctx, '⌘', 158, 900, 64, press, { alpha: ka }); T.key(ctx, 'V', 238, 900, 64, press, { alpha: ka }); T.label(ctx, 'PASTE', 290, 911, { size: 20, alpha: ka }); }
      // the headline and the formats it knows
      T.headline(ctx, ['붙여넣으면,', '알맞은 도구를', '골라 드려요.'], 114, 226, lt - 0.15, { size: 86, gap: 98, out: { at: outAt } });
      const kinds = ['JSON', 'JWT', '색', '타임스탬프'].slice(0, n); let cx = 120;
      kinds.forEach((s, i) => { const on = i === k, a = clamp(rm(lt, 0.7 + i * 0.06, 1.0 + i * 0.06)) * (1 - env.phase.out); ctx.save(); ctx.globalAlpha *= a; ctx.font = `600 26px ${FAM.sans}`; const w = ctx.measureText(s).width + 40;
        rr(ctx, cx, 512, w, 52, 26); ctx.fillStyle = on ? '#5B45F0' : 'rgba(255,255,255,0.05)'; ctx.fill(); ctx.strokeStyle = on ? '#A89BFF' : 'rgba(255,255,255,0.13)'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = on ? '#FFFFFF' : '#BDB9DC'; ctx.fillText(s, cx + 20, 547); ctx.restore(); cx += w + 14; });
    },
  };
})();
