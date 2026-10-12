// ship (4 bars, 5 in the 30; the drop): one ZIP. The app's real bench strip sits top right (입력 7/7 · 파일 19 · 이미지 6 ·
// moss-timer-deploy-kit ZIP). From a column on the left the kit's 25 items fly one after another, a quarter beat apart,
// and arc into a blue ZIP crate whose counter climbs to 25; on beat 8 the crate's zipper closes with a stamp and its
// label reads moss-timer-deploy-kit.zip; a check confirms 25 files, one ZIP. Headline: 필요한 것만 골라 / ZIP 하나로 출시.
(() => {
  const D = DK, CX = 1290, CY = 660;
  SCENES['ship'] = {
    draw(ctx, t, env) {
      const lt = env.lt, P = env.palette, B = env.beatSec, out = env.phase.out;
      D.stage(ctx, t, { glowX: 1300 });
      const F = D.files(), n = F.length, step = 0.24 * B;
      const { L } = D.layer('bench_2'), bk = 1.7, be = styleSpring(lt + 0.05, { f: 3, z: 0.6 });
      ctx.save(); ctx.globalAlpha *= clamp(be * 1.5); D.draw(ctx, 'bench_2', 1840 - L.rect.w * bk, 70 + (1 - be) * -40, bk); ctx.restore();
      // the crate
      const ce = styleSpring(lt + 0.15, { f: 2.6, z: 0.55 }), shut = 8 * B, sh = lt >= shut ? Math.exp(-(lt - shut) * 10) : 0;
      let landed = 0; for (let i = 0; i < n; i++) if (lt >= B + i * step + 0.42) landed++;
      ctx.save(); ctx.globalAlpha *= clamp(lt / 0.12 + 0.3);
      D.crate(ctx, CX + Math.sin(lt * 1.2) * 4, CY + (1 - ce) * 80 + sh * 12 + Math.cos(lt * 1.5) * 3, 0.95 + 0.06 * sh, { open: 1 - clamp((lt - shut) / 0.2), count: landed, name: lt >= shut ? 'moss-timer-deploy-kit.zip' : '' });
      ctx.restore();
      if (sh > 0.01) env.fx.shake = Math.max(env.fx.shake || 0, 10 * sh);
      // the files: a column on the left, each flies into the crate
      for (let i = 0; i < n; i++) {
        const at = B + i * step, p = clamp((lt - at) / 0.42);
        const sx = 330 + (i % 2) * 40, sy = 420 + (i % 13) * 46 + (i >= 13 ? 23 : 0);
        if (lt < at - 0.9 * B && i >= 10) continue;
        if (p >= 1) continue;
        const pre = clamp((lt - (at - 0.9 * B)) / (0.3 * B) + (i < 10 ? 1 : 0));
        const f = Ease.inC(p), x = lerp(sx, CX, f), y = lerp(sy, CY - 40, f) - Math.sin(Math.PI * f) * 180, s = lerp(0.9, 0.35, f);
        D.chip(ctx, F[i], x, y, s, { alpha: pre * (1 - clamp((p - 0.85) / 0.15)), rot: f * 0.4 * (i % 2 ? 1 : -1) });
      }
      // confirmation
      const ok = clamp((lt - 10 * B) / 0.3);
      if (ok > 0) { ctx.save(); ctx.globalAlpha *= ok * (1 - out); rr(ctx, CX - 190, CY + 210, 380, 64, 32); ctx.fillStyle = '#0A0B10'; ctx.fill();
        ctx.fillStyle = '#D4FF3A'; ctx.font = `800 26px ${FAM.mono}`; ctx.textAlign = 'center'; ctx.fillText('✓ 25 FILES · 1 ZIP', CX, CY + 251); ctx.restore(); }
      D.headline(ctx, ['필요한 것만 골라', 'ZIP 하나로 출시.'], 100, 214, lt + 0.2, { size: 88, gap: 100, out: { at: env.dur - env.outSec } });
    },
  };
})();
