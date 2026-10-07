// brand: Mochi springs up in front of its halo, the wordmark pops in per glyph, then everything folds into the app
// icon that the next scene (app) morphs into the phone. The cast sprites (mochi*, mochi_icon*) come from
// modules/mochi-cast.js.
(() => {
  // ───────── scene ─────────
  const at = (env, b) => env.lt - b * env.beatSec;
  const ICON_AT = { x: 960, y: 540, s: 300 };                              // where app.js starts its morph (keep in sync)
  // Backdrop shared in spirit with app.js: blobs drift, and converge on their home positions over the out-phase,
  // where app.js starts them, so the match cut is seamless in every cut.
  const BLOBS = [[360, 300, 560, 'accent', 0.2], [1600, 790, 640, 'accent2', 0.18], [960, 1060, 560, 'accent3', 0.14]];
  function backdrop(ctx, P, lt, home) {
    ctx.fillStyle = linear(ctx, 0, 0, 0, H, [[0, P.bg2], [0.6, P.bg], [1, P.bg]]);
    ctx.fillRect(0, 0, W, H);
    BLOBS.forEach(([x, y, r, key, a], i) => {
      const dx = (Math.sin(lt * 0.5 + i * 2) - Math.sin(i * 2)) * 70, dy = (Math.cos(lt * 0.4 + i) - Math.cos(i)) * 44;
      softBlob(ctx, x + dx * (1 - home), y + dy * (1 - home), r, rgba(P[key], a));
    });
  }
  // Conic pastel halo built once (recipe: halo), rotating, pulsing on downbeats.
  let HALO = null;
  function halo(ctx, env, x, y, r, a) {
    if (a <= 0.002) return;
    const P = env.palette;
    if (!HALO) {
      const S = Math.ceil(r * 2.6), c = S / 2, b = makeBuf(S, S), g = b.g;
      const cg = g.createConicGradient(0, c, c), cols = [P.strawberry || P.accent, P.yuzu || P.accent3, P.matcha || P.accent3, P.ube || P.accent2, P.strawberry || P.accent];
      cols.forEach((col, i) => cg.addColorStop(i / (cols.length - 1), mix('#FFFFFF', col, 0.62)));
      g.filter = 'blur(60px)'; circle(g, c, c, r); g.fillStyle = cg; g.fill(); g.filter = 'none';
      g.globalCompositeOperation = 'destination-in';
      g.fillStyle = radial(g, c, c, 0, r + 40, [[0, 'rgba(0,0,0,1)'], [0.5, 'rgba(0,0,0,0.9)'], [0.8, 'rgba(0,0,0,0.4)'], [1, 'rgba(0,0,0,0)']]);
      g.fillRect(0, 0, S, S);
      HALO = b.c;
    }
    const S = HALO.width, pulse = 1 + 0.025 * Math.sin(env.lt * 1.6) + 0.06 * beatPulse(env, 5, 4);
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(env.lt * 0.4); ctx.scale(pulse, pulse);
    ctx.drawImage(HALO, -S / 2, -S / 2); ctx.restore();
  }
  function iconShadow(ctx, P) { ctx.shadowColor = rgba(P.accentStrong || P.accent, 0.28); ctx.shadowBlur = 34; ctx.shadowOffsetY = 12; }

  SCENES['brand'] = {
    draw(ctx, t, env) {
      const P = env.palette, lt = env.lt, ph = env.phase, out = ph.out, SP = env.style.motion.spring || {};
      ctx.imageSmoothingQuality = 'high';
      backdrop(ctx, P, lt, Ease.ioC(out));
      softBlob(ctx, 960, 760, 980, rgba(P.accent, 0.42 * (1 - Ease.outC(rm(lt, -0.3, 0.9))) + 0.1));   // pink pool the blob wipe reveals first
      softBlob(ctx, 960, 480, 760, rgba('#FFFFFF', 0.6 * (1 - Ease.inC(out))));
      for (let i = 0; i < 14; i++) {                                        // pastel bokeh drifting up
        const h1 = hash(i * 3.7 + 1), h2 = hash(i * 5.3 + 2), y = ((h2 * 1300 - lt * (26 + h1 * 30)) % 1300 + 1300) % 1300 - 110;
        softBlob(ctx, 120 + h1 * 1680 + Math.sin(lt * 0.7 + i) * 20, y, 18 + h2 * 40, [P.strawberry, P.matcha, P.ube, P.yuzu][i % 4] || P.accent, 0.32 * (1 - out));
      }
      halo(ctx, env, 960, 480, 320, Ease.outC(rm(lt, 0.05, 0.45)) * (1 - Ease.inC(rm(out, 0, 0.6))));
      // twinkles around the halo, always moving
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * TAU + lt * 0.35, rad = 330 + 40 * Math.sin(lt * 1.3 + i), tw = 0.5 + 0.5 * Math.sin(lt * 3.1 + i * 2.3);
        sparkle(ctx, 960 + Math.cos(a) * rad, 470 + Math.sin(a) * rad * 0.62, 9 + 11 * tw, Ease.outC(rm(lt, 0.3 + i * 0.03, 0.7 + i * 0.03)) * (1 - out) * (0.5 + 0.5 * tw), a,
          mix('#FFFFFF', [P.strawberry, P.matcha, P.ube, P.yuzu][i % 4] || P.accent, 0.6));
      }
      // Mochi: springs up on beat 0; a happy hop on each bar line of the hold; dives into the icon in the out-phase
      const FEET = 660, HH = 400;
      let hop = 0, sq = 0, pose = 'mochi';
      onBars(env, 1, (i, dt) => { const k = clamp(dt / 0.42); hop = Math.sin(Math.PI * k) * 46; sq = wob(dt - 0.42, 3.4, 7) * 0.1 - (k < 0.12 ? Math.sin((Math.PI * k) / 0.12) * 0.06 : 0); if (dt < 0.6) pose = 'mochi_happy'; });
      const anti = Math.sin(Math.PI * rm(out, 0, 0.32)) * (1 - rm(out, 0.32, 0.4)), dive = Ease.ioC(rm(out, 0.25, 1));
      const h = lerp(HH, ICON_AT.s * 0.7, dive), feet = lerp(FEET, ICON_AT.y - ICON_AT.s / 2 + ICON_AT.s * 0.86, dive) - Math.sin(Math.PI * dive) * 70;
      groundShadow(ctx, 960, FEET + 6, HH * 0.6 * (1 - hop / 160) * (1 - dive), 0.3 * clamp(lt / 0.2), P.shadow);
      // the icon tile pops in behind Mochi during the out-phase
      const tile = Ease.outBack(rm(out, 0.12, 0.7), 1.6);
      if (tile > 0) {
        const s = ICON_AT.s * tile;
        ctx.save(); iconShadow(ctx, P); ctx.globalAlpha *= clamp(tile * 3);
        ctx.drawImage(IMG.mochi_icon_bg, ICON_AT.x - s / 2, ICON_AT.y - s / 2, s, s); ctx.restore();
      }
      ctx.save();
      ctx.translate(960, feet - hop); ctx.scale(1 + anti * 0.14 + sq, 1 - anti * 0.16 - sq); ctx.translate(-960, -(feet - hop));
      popChar(ctx, out > 0 ? 'mochi' : pose, 960, feet - hop, h, at(env, -0.24), {   // rises inside the blob, arrives on beat 0
        fromY: 760, f: SP.f ?? 2.6, z: SP.z ?? 0.42, squash: 0.12, jelly: 18, seed: 2, shadow: false, blink: out > 0 ? false : undefined });
      ctx.restore();
      if (out > 0.82) {                                                     // settle on the exact icon pixels app.js starts with
        const s = ICON_AT.s;
        withAlpha(ctx, rm(out, 0.82, 1), () => ctx.drawImage(IMG.mochi_icon, ICON_AT.x - s / 2, ICON_AT.y - s / 2, s, s));
      }
      // landing sparkles
      const sl = lt - 0.2;
      if (sl > 0 && sl < 0.7) for (let j = 0; j < 7; j++) {
        const an = -Math.PI / 2 + (j - 3) * 0.42, d = 190 + Ease.outC(sl / 0.7) * 120;
        sparkle(ctx, 960 + Math.cos(an) * d * 1.25, 460 + Math.sin(an) * d, 10 + (j % 3) * 4, Math.sin((Math.PI * sl) / 0.7), sl * 3 + j, '#FFFFFF');
      }
      // wordmark: per-glyph pop, two-tone like the logo; exits glyph by glyph at the out-phase
      const wm = 'Mochi Notes', size = 144;
      kinetic(ctx, wm, 960, 885, at(env, 0.25), {
        size, weight: 900, fam: 'display', align: 'center', pop: true, stagger: 0.026, dur: 0.44, ls: -size * 0.015,
        colorFn: (i) => (i < 6 ? P.ink : P.accentStrong || P.accent), glow: rgba('#FFFFFF', 0.7), glowBlur: 22,
        out: { at: env.dur - env.outSec - 0.25 * env.beatSec, stagger: 0.01, dur: 0.26 },
      });
    },
  };
})();
