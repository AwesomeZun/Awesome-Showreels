// hook (2 bars, 3 in the 30): launch. The kit's real file names (README.md, LICENSE, ci.yml, vercel.json, og.png,
// favicon.svg and the rest of its 25 items) stream upward in two lanes like exhaust, faster on the beat. The app's
// logo lands in the middle on the first hit (beat 1), the kicker above, the app's line below by 0.6 s: 작은 제품을
// 세상에 내놓는 도구.
(() => {
  const D = DK;
  SCENES['hook'] = {
    draw(ctx, t, env) {
      const lt = env.lt, P = env.palette, B = env.beatSec;
      D.stage(ctx, t, { drift: 120 });
      const F = D.files(), speed = 760 + 260 * beatPulse(env, 6);
      for (let i = 0; i < 36; i++) {
        const lane = i % 2, col = (i >> 1) % 3, name = F[i % F.length];
        const x = lane ? 1420 + col * 150 + (hash(i) - 0.5) * 60 : 500 - col * 150 + (hash(i) - 0.5) * 60;
        const y = H + 80 - (((lt + 2) * speed + i * 137 + hash(i * 7) * 300) % (H + 260));
        const a = clamp((lt + 0.3) * 3) * (0.55 + 0.45 * hash(i * 3)), s = 0.75 + 0.3 * hash(i * 5);
        ctx.save(); ctx.globalAlpha *= a * 0.5; ctx.fillStyle = '#0B2FE6'; ctx.fillRect(x - 1, y + 24, 2, 120 * s); ctx.restore();
        D.chip(ctx, name, x, y, s, { alpha: a, dark: i % 5 === 0 });
      }
      // a soft clearing behind the name
      const cg = ctx.createRadialGradient(960, 500, 0, 960, 500, 560); cg.addColorStop(0, 'rgba(236,238,245,0.97)'); cg.addColorStop(0.7, 'rgba(236,238,245,0.85)'); cg.addColorStop(1, 'rgba(236,238,245,0)');
      ctx.fillStyle = cg; ctx.fillRect(0, 0, W, H);
      const land = B, e = lt < land ? 0 : styleSpring(lt - land, { f: 3.4, z: 0.5 }), pre = clamp(lt / land);
      const { L } = D.layer('brand'), k = 4.0 * (lt < land ? 0.7 + 0.3 * Ease.inC(pre) : 0.92 + 0.08 * e);
      ctx.save(); ctx.globalAlpha *= lt < land ? 0.35 * pre : 1; D.draw(ctx, 'brand', 960 - L.rect.w * k / 2, 440 - L.rect.h * k / 2, k); ctx.restore();
      D.label(ctx, 'SIDE PROJECT STARTER · LAUNCH BENCH', 960, 296, { size: 24, align: 'center', color: P.accent, alpha: clamp(rm(lt, land, land + 0.2)) });
      kinetic(ctx, '작은 제품을 세상에 내놓는 도구.', 960, 690, lt - land - 0.15, { size: 60, fam: 'display', weight: 800, color: P.ink, ls: -2.4, align: 'center', stagger: 0.02, dur: 0.4, rise: 22, blur: 5 });
    },
  };
})();
