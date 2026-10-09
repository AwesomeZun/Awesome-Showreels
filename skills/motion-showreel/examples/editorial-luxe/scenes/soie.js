// soie: "MAISON VEYRANDE". Ivory duchesse satin, lit by one lamp that drifts across it; the house name rises from
// behind a mask on its hairline and its tracking closes slowly, like a breath. 1 bar in the short cut (compact
// schedule), 2 bars in the 30-s cut (the label and a light along the rule join, then the frame is simply held).
(() => {
  const NAME = 'MAISON VEYRANDE', LABEL = 'HAUTE COUTURE';
  SCENES['soie'] = {
    draw(ctx, t, env) {
      const P = env.palette, lt = env.lt, B = env.beatSec, VY = window.VEYRANDE, T = VY.type;
      const short = env.dur < 1.5 * env.barSec;
      const S = short ? { name: 0, rule: 0.5, label: 1.5, glint: -1 } : { name: 0.35, rule: 1.5, label: 2.75, glint: 4 };
      // the satin and its lamp: both drift for as long as the scene lasts (pure in lt, the same pace in every cut)
      const lampX = 0.2 + 0.035 * lt + 0.03 * Math.sin(lt * 0.4), lampY = 0.22 + 0.025 * Math.sin(lt * 0.31 + 1);
      VY.silk.draw(ctx, lt + 4, { P, lampX, lampY, bump: 0.1, zoom: 1.02 + 0.0045 * lt, panX: -18 * lt, lamp: 1 });
      // a calm field behind the type (the satin stays legible at the edges, quiet where the name sits)
      ctx.fillStyle = radial(ctx, W / 2, 560, 0, 820, [[0, rgba(P.bg, 0.72)], [0.42, rgba(P.bg, 0.46)], [1, rgba(P.bg, 0)]]);
      ctx.fillRect(0, 0, W, H);
      T.motes(ctx, lt, { n: 34, alpha: 0.6, lx: lampX + 0.05, ly: lampY + 0.2, lr: 720 });

      // type: stays through the out-phase so the dissolve carries it into the next scene; it only settles a little
      const out = Ease.ioQuint(env.phase.out);
      ctx.save();
      ctx.globalAlpha *= 1 - 0.3 * out;
      ctx.translate(0, 8 * out);
      const size = 78, y = 556;
      const tr = lerp(0.46, (STYLE.type.trackingName || 0.32), Ease.outQuint(rm(lt, S.name * B, S.name * B + 4.2)));
      T.maskRise(ctx, NAME, W / 2, y, lt - S.name * B, { size, fam: 'display', weight: 400, ls: size * tr, align: 'center', color: P.ink, stagger: 0.045, dur: 1.15 });
      const rp = rm(lt, S.rule * B, S.rule * B + 1.3);
      const glint = S.glint > 0 ? rm(lt, S.glint * B, S.glint * B + 1.6) : 0;
      T.hairline(ctx, W / 2, 606, 420, rp, { color: P.accent, lw: 1.6, glint });
      T.caps(ctx, LABEL, W / 2, 660, { size: 20, align: 'center', color: P.muted, rise: rm(lt, S.label * B, S.label * B + 1.1) });
      ctx.restore();
    },
  };
})();
