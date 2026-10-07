// finale: the whole flavor family hops into a lineup and bounces on the beat under the two-tone wordmark; the
// README tagline reveals below it and a logo shine sweeps across. Hold: the bounce never stops, the shine repeats
// every two bars, and on each bar line a wave runs through the lineup left to right while the hero cheers (so a long
// end card in the 60-s cut keeps moving). Ends on the end card (no out-phase).
(() => {
  const at = (env, b) => env.lt - b * env.beatSec;
  const CAST = [                                                            // outside in draw order: the hero is drawn last
    { name: 'mochi_matcha', x: 552, h: 236, beat: 0.14, seed: 21 },          // beat = jump start; each lands a quarter beat
    { name: 'mochi_yuzu', x: 1368, h: 236, beat: 0.64, seed: 24 },            // later (0.25, 0.5, 0.75, 1.0 incl. the hero)
    { name: 'mochi_ube', x: 1098, h: 250, beat: 0.39, seed: 23 },
    { name: 'mochi', x: 822, h: 276, beat: -0.11, seed: 22, hero: true },
  ];
  const RANK = { mochi_matcha: 0, mochi: 1, mochi_ube: 2, mochi_yuzu: 3 };    // left to right, for the hold wave
  const FOOT = 884;
  function beatHop(env, i) {                                                // recipe: lineup bounce, neighbours alternate
    const per = env.beatSec, ph = ((((env.lt - (i % 2) * per * 0.5) % per) + per) % per) / per;
    if (ph < 0.2) return { hop: 0, sq: Math.sin((Math.PI * ph) / 0.2) * 0.07 };
    const u = (ph - 0.2) / 0.8;
    return { hop: Math.sin(Math.PI * u), sq: -Math.sin(Math.PI * u) * 0.03 };
  }
  // Wordmark into a buffer so a specular band can sweep across the letters only (recipe: logo shine).
  let LB = null;
  function wordmark(ctx, env, x, y, lt0) {
    const P = env.palette, size = 150;
    if (!LB) LB = makeBuf(W, 300);
    const g = LB.g, base = 220;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, 300);
    const tw = kinetic(g, 'Mochi Notes', x, base, lt0, { size, weight: 900, fam: 'display', align: 'center', pop: true, stagger: 0.03, dur: 0.46,
      ls: -size * 0.015, colorFn: (i) => (i < 6 ? P.ink : P.accentStrong || P.accent) });
    const sweep = (k) => {
      if (k <= 0 || k >= 1) return;
      const bx = lerp(x - tw / 2 - 180, x + tw / 2 + 180, Ease.ioC(k));
      g.globalCompositeOperation = 'source-atop';
      g.save(); g.translate(bx, base - size * 0.4); g.transform(1, 0, -0.35, 1, 0, 0);
      g.fillStyle = linear(g, -42, 0, 42, 0, [[0, 'rgba(255,255,255,0)'], [0.5, 'rgba(255,255,255,0.9)'], [1, 'rgba(255,255,255,0)']]);
      g.fillRect(-42, -size, 84, size * 2); g.restore();
      g.globalCompositeOperation = 'source-over';
    };
    sweep(rm(at(env, 3.5), 0, 0.7));
    onBars(env, 2, (i, dt) => sweep(rm(dt, 0, 0.7)));
    ctx.drawImage(LB.c, 0, y - base);
    return tw;
  }
  SCENES['finale'] = {
    draw(ctx, t, env) {
      const P = env.palette, lt = env.lt, bs = env.beatSec, SP = env.style.motion.spring || {};
      ctx.imageSmoothingQuality = 'high';
      ctx.fillStyle = linear(ctx, 0, 0, 0, H, [[0, P.bg2], [0.55, P.bg], [1, P.bg]]); ctx.fillRect(0, 0, W, H);
      softBlob(ctx, 960, 760, 980, rgba(P.accent, 0.3 * (1 - Ease.outC(rm(lt, -0.3, 1.0))) + 0.08));  // the blob wipe's pink pool settling
      softBlob(ctx, 320 + Math.sin(lt * 0.5) * 50, 250 + Math.cos(lt * 0.4) * 30, 560, rgba(P.accent2, 0.2));
      softBlob(ctx, 1620 + Math.cos(lt * 0.45) * 60, 300 + Math.sin(lt * 0.5) * 40, 600, rgba(P.accent3, 0.2));
      for (let i = 0; i < 18; i++) {                                         // pastel bokeh drifting up
        const h1 = hash(i * 3.7 + 9), h2 = hash(i * 5.3 + 4), y = ((h2 * 1300 - lt * (24 + h1 * 30)) % 1300 + 1300) % 1300 - 110;
        softBlob(ctx, 80 + h1 * 1760 + Math.sin(lt * 0.7 + i) * 20, y, 16 + h2 * 38, [P.strawberry, P.matcha, P.ube, P.yuzu][i % 4] || P.accent, 0.3);
      }
      softBlob(ctx, 960, 380, 760, rgba('#FFFFFF', 0.55));
      // stage: a soft floor glow under the lineup
      ctx.save(); ctx.translate(960, FOOT + 8); ctx.scale(1, 0.12); softBlob(ctx, 0, 0, 640, rgba(P.accent, 0.22)); ctx.restore();
      // lineup: hop up from below (outside in), then bounce on every beat, neighbours alternating
      CAST.forEach((c, i) => {
        const k = at(env, c.beat);
        if (k < 0) return;
        const p = spring(k, SP.f ?? 2.6, (SP.z ?? 0.42) + 0.12), on = rm(k, 0.6, 0.9), b = beatHop(env, i);
        let wave = 0;                                                        // hold: a wave on each bar line, left to right
        onBars(env, 1, (n, dt) => { const d = dt - RANK[c.name] * 0.11; if (d > 0 && d < 0.42) wave = Math.sin((Math.PI * d) / 0.42); });
        const hop = b.hop * 20 * on + wave * 38;
        const sq = wob(k - 0.2, 3.2, 5.5) * 0.11 + b.sq * on, br = Math.sin(TAU * (k * 0.8 + c.seed * 0.1)) * 0.01;
        let name = c.name;
        if (c.hero) onBars(env, 1, (n, dt) => { if (dt < 0.7) name = 'mochi_happy'; });
        if (k > 0.25 && k < 0.95 && !c.hero) name = c.name + '_happy';
        groundShadow(ctx, c.x, FOOT + 4, c.h * 0.62 * (1 - hop / 140), 0.28 * clamp(k / 0.25), P.shadow);
        drawChar(ctx, name, c.x, FOOT + (1 - p) * 700 - hop, c.h, {
          sx: 1 + sq + br * 0.4, sy: 1 - sq + br, alpha: clamp(k / 0.06), blink: name.endsWith('_happy') ? false : blinkAt(k + c.seed * 3, c.seed),
          jelly: 16 * Math.exp(-k * 2.6) * Math.sin(k * 15), jellyPhase: k * 9,
        });
        const sl = k - 0.22;                                                 // landing sparkles
        if (sl > 0 && sl < 0.6) for (let j = 0; j < 3; j++) {
          const an = -Math.PI / 2 + (j - 1) * 0.8, d = 40 + Ease.outC(sl / 0.6) * 60;
          sparkle(ctx, c.x + Math.cos(an) * d, FOOT - c.h - 10 + Math.sin(an) * d * 0.7, 10 + j * 2, Math.sin((Math.PI * sl) / 0.6) * 0.9, sl * 3, mix('#FFFFFF', P.accent, 0.3));
        }
      });
      // wordmark + tagline (the README's own line) + confetti burst when the name lands
      wordmark(ctx, env, 960, 398, at(env, 1));
      revealLine(ctx, 'Jot it down. Mochi tidies up!', 960, 490, rm(at(env, 2), 0, 0.55), { size: 48, weight: 800, fam: 'sans', color: P.ink2, align: 'center' });
      const cb = at(env, 1.6);
      if (cb > 0 && cb < 1.4) for (let j = 0; j < 22; j++) {
        const an = (j / 22) * TAU + hash(j) * 0.3, sp = 380 + hash(j * 3.3) * 420, x = 960 + Math.cos(an) * sp * cb, y = 368 + Math.sin(an) * sp * cb * 0.6 + 520 * cb * cb;
        const col = [P.strawberry, P.matcha, P.ube, P.yuzu][j % 4] || P.accent;
        ctx.save(); ctx.globalAlpha *= 1 - rm(cb, 0.7, 1.4); ctx.translate(x, y); ctx.rotate(cb * (4 + hash(j * 7) * 6) + j);
        ctx.scale(Math.cos(cb * 9 + j), 1); rr(ctx, -9, -5, 18, 10, 3); ctx.fillStyle = col; ctx.fill(); ctx.restore();
      }
      // small print: the material says the app is fictional; keep it visible on the end card
      withAlpha(ctx, Ease.outC(rm(at(env, 3), 0, 0.4)), () => text(ctx, 'Fictional app · demo content', W - 64, H - 44, { size: 18, weight: 700, fam: 'sans', color: P.muted, align: 'right' }));
    },
  };
})();
