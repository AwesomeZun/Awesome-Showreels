// card (finale; every cut): the invitation itself. The closed fan parts on the downbeat onto a sunburst rising from the
// middle of the bottom edge (house style); the stepped double frame is gilded from the top centre down both sides,
// the small fan mark opens at the head of the card, and the invitation's lines arrive on the swung beats in its own
// words: the spoken line in the hairline face, the date in gold leaf, the hour and the band in tracked capitals. Two
// coupes rise at the foot of the frame and are raised in a toast on beat 5. Hold (it grows in longer cuts): the sunburst turns, the
// rays breathe on the Charleston figure, a sheen crosses the date on every bar, the coupes lift on the 'and' of 2.
(() => {
  const at = (env, b) => env.lt - b * env.beatSec;
  const CX = W / 2, X0 = 250, X1 = W - 250, Y0 = 70, Y1 = H - 52;
  const DATE = 'THE NINTH OF OCTOBER';

  SCENES['card'] = {
    draw(ctx, t, env) {
      const P = env.palette, lt = env.lt, bs = env.beatSec, out = env.phase.out;
      const hl = STYLE.fonts.hairline, ch = FAN.charleston(env);
      FAN.ground(ctx, env, P, { liftY: 760, liftR: 1000, alpha: 0.05, rays: 40 });
      // the sunburst rising from the middle of the bottom edge, turning slowly, breathing on the Charleston figure
      const rise = Ease.outQuint(rm(at(env, 0.25), 0, 1.4 * bs));
      FAN.sunburst(ctx, CX, H + 30, 1250, P, { rays: 32, reveal: rise, rot: lt * 0.018, alpha: 0.16 + 0.06 * ch });
      softBlob(ctx, CX, H, 700, P.goldShade, 0.35 * rise);
      FAN.dust(ctx, lt + 3, P, { n: 40, y0: 90, y1: 1000, alpha: 0.75, seed: 77, speed: 15 });

      // lacquer card inside the frame so the type sits on calm black
      const fr = Ease.ioC(rm(at(env, 0.25), 0, 1.5 * bs));
      if (fr > 0) withAlpha(ctx, 0.78 * Ease.outC(fr), () => { ctx.fillStyle = P.bg; ctx.fillRect(X0 + 30, Y0 + 30, X1 - X0 - 60, Y1 - Y0 - 60); });
      FAN.steppedFrame(ctx, CX, X0, Y0, X1, Y1, fr, P, { step: 18, n: 3, lw: 2.4, gap: 14, glow: 0.25 });

      // the small fan mark at the head of the card
      const SP = env.style.motion.spring || {};
      const open = clamp(spring(at(env, 0.75), SP.f ?? 2.2, SP.z ?? 0.82), 0, 1.04);
      let glint = rm(at(env, 2), 0, 0.9);
      onBars(env, 1, (i, dt) => { glint = rm(dt - 0.5 * bs, 0, 0.9); });
      const mg = Ease.outBack(rm(at(env, 0.75), 0, 0.45), 1.6);
      if (mg > 0) FAN.mark(ctx, CX, 300, 118 * mg, Math.min(1, 0.18 + 0.82 * open), P, { inlay: [0.42, 0.7], glint });

      // the lines of the invitation
      withAlpha(ctx, 1, () => {
        const k1 = Ease.outQuint(rm(at(env, 1 + FAN.SWING), 0, 0.55));
        revealLine(ctx, 'request the pleasure of your company', CX, 404, k1, { size: 44, weight: 400, fam: hl, color: P.ink, align: 'center' });
      });
      const size = fitSize(ctx, DATE, 1180, { size: 112, weight: 400, fam: 'display', ls: 112 * 0.08 });
      let sheen = rm(at(env, 3), 0, 0.9);
      onBars(env, 1, (i, dt) => { sheen = rm(dt, 0, 0.9); });
      FAN.label(ctx, 'ON SATURDAY', CX, 478, { size: 24, color: P.ink2, lt: at(env, 2), stagger: 0.02, dur: 0.45 });
      FAN.text(ctx, DATE, CX, 600, { size, fam: 'display', ls: size * 0.08, gold: true, palette: P, lt: at(env, 2 + FAN.SWING), stagger: 0.045, dur: 0.6, squeeze: 0.8, sheen, glowA: 0.3 });
      FAN.label(ctx, 'NINETEEN TWENTY-SIX · NINE O’CLOCK IN THE EVENING', CX, 668, { size: 24, color: P.ink, lt: at(env, 3), stagger: 0.012, dur: 0.45 });
      FAN.rule(ctx, CX, 722, 420, Ease.ioC(rm(at(env, 3.5), 0, 0.9 * bs)), P, { lw: 1.4 });
      withAlpha(ctx, 1, () => {
        const k2 = Ease.outQuint(rm(at(env, 3 + FAN.SWING), 0, 0.55));
        revealLine(ctx, 'Dancing to Leo Halloran and His Emerald Seven', CX, 792, k2, { size: 40, weight: 400, fam: hl, color: P.ink, align: 'center' });
      });
      FAN.label(ctx, 'BLACK TIE', CX, 866, { size: 26, color: P.accent, lt: at(env, 4), stagger: 0.03, dur: 0.45 });
      FAN.label(ctx, 'KINDLY REPLY BY THE FIRST OF OCTOBER', CX, 924, { size: 19, color: P.ink2, lt: at(env, 4.5), stagger: 0.01, dur: 0.45 });

      // two coupes rise at the foot of the frame and tip toward each other in a toast on beat 5; they lift on the 'and' of 2 through the hold
      const up = Ease.outBack(rm(at(env, 4), 0, 0.7 * bs), 1.4);
      if (up > 0) {
        const clink = at(env, 5), lean = clink < 0 ? Ease.ioC(clamp(1 + clink / (0.8 * bs))) : 1 - 0.35 * Ease.outC(clamp(clink / (1.2 * bs)));
        const lift = 10 * ch;
        for (const s of [-1, 1]) {
          const x = CX + s * lerp(560, 480, lean), y = 1000 + (1 - up) * 120 - lift;
          ctx.save(); ctx.globalAlpha *= clamp(up);
          ctx.translate(x, y); ctx.rotate(-s * 0.32 * lean); ctx.translate(-x, -y);
          FAN.coupe(ctx, x, y, 44, 0.85, P, { t: lt, seed: s + 5, lw: 2.2 });
          ctx.restore();
        }
        if (clink >= 0 && clink < 0.8) {
          const a = 1 - clink / 0.8;
          for (const s of [-1, 1]) { const rx = CX + s * 436, ry = 924; sparkle(ctx, rx, ry, 30 * a + 8, a, clink * 5, '#FFF8E6'); softBlob(ctx, rx, ry, 90, P.goldLight, 0.4 * a); }
        }
      }

      // in: the closed fan parts on the downbeat (both fan and evening end on FAN.irisCover)
      FAN.irisPart(ctx, Ease.ioC(rm(lt, 0, 0.75 * bs)), P);
    },
  };
})();
