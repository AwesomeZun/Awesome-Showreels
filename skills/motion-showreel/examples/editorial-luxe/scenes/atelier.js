// atelier: "1,240 hours of hand embroidery". On the ivory page, an ink pen draws the croquis of look 31 (the paths of
// source/sketches/look-31.svg); the number rises in the text column; then the embroidery is sewn along the lines of
// the first sketch, bodice first, dissolving toward the hem (lookbook notes, press release). Hold: the sequins catch
// a travelling light, and on the hold's bar line the credit "by seventeen hands, over eleven weeks" rises.
// Out: the type sinks away; the croquis stays exactly where it is (the lineup scene starts on the same pixels).
(() => {
  const KICK = 'LOOK 31 · LA DERNIÈRE HEURE', NUM = '1,240', UNIT = 'hours of hand embroidery';
  const CREDIT = 'BY SEVENTEEN HANDS, OVER ELEVEN WEEKS';
  // the first sketch's guides: a centre line and ten head-unit ticks in faint graphite (viewBox units)
  function guides(ctx, P, H0, a) {
    if (a <= 0.003) return;
    const K = window.VEYRANDE.croquis, s = H0.h / K.VBH, x = H0.cx;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.strokeStyle = rgba(P.ink2, 0.22); ctx.lineWidth = 1;
    ctx.setLineDash([2, 7]);
    ctx.beginPath(); ctx.moveTo(x, H0.top + 30 * s); ctx.lineTo(x, H0.top + 1450 * s); ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 0; i <= 10; i++) {
      const y = H0.top + (44 + i * 140) * s;
      ctx.beginPath(); ctx.moveTo(x - 14, y); ctx.lineTo(x + 14, y); ctx.stroke();
      if (i % 2 === 0) text(ctx, String(i), x - 24, y + 4, { size: 11, fam: 'sans', weight: 400, color: rgba(P.ink2, 0.5), align: 'right' });
    }
    ctx.restore();
  }
  SCENES['atelier'] = {
    draw(ctx, t, env) {
      const P = env.palette, lt = env.lt, B = env.beatSec, VY = window.VEYRANDE, T = VY.type, K = VY.croquis, H0 = K.HERO;
      // hold: a slow push toward the gown (the whole page; nothing moves on its own)
      const z = K.pushAt(lt, env.inSec);
      ctx.save();
      ctx.translate(K.PUSH.fx, K.PUSH.fy); ctx.scale(z, z); ctx.translate(-K.PUSH.fx, -K.PUSH.fy);
      // the page, lit from the upper right where the lamp hangs; the warm pool drifts slowly
      T.paper(ctx, P, { lx: 0.66 + 0.03 * Math.sin(lt * 0.23), ly: 0.12 + 0.02 * Math.cos(lt * 0.19) });
      T.motes(ctx, lt + 11, { n: 18, alpha: 0.42, lx: 0.66, ly: 0.3, lr: 640 });
      // guides appear first and leave as the embroidery is finished
      guides(ctx, P, H0, Ease.outC(rm(lt, -0.75, 0.2)) * (1 - Ease.ioQ(rm(lt, 4.6 * B, 6.8 * B))));
      // the pen: starts inside the dissolve (the head is being drawn as the satin fades) and finishes on beat 5
      const u = Ease.ioSine(rm(lt, -0.5, 5.0 * B));
      const tip = K.draw(ctx, H0.look, H0.cx, H0.top, H0.h, u, { P });
      if (tip && u < 1) softBlob(ctx, tip[0], tip[1], 46, mix(P.bg, '#FFFFFF', 0.6), 0.55);   // the lamp follows the hand
      // the embroidery: sewn over 3 beats from beat 4.2, bodice first, then down the folds
      const k = Ease.ioSine(rm(lt, 4.2 * B, 7.0 * B));
      K.sequins(ctx, H0.look, H0.cx, H0.top, H0.h, k, lt, { P });

      // the text column (left), exits by sinking behind its masks over the out-phase
      const out = env.phase.out, x0 = (STYLE.layout.margin || 160);
      const kick = rm(lt, 1.0 * B, 1.0 * B + 1.1);
      ctx.save();
      ctx.globalAlpha *= 1 - Ease.ioQ(out);
      T.caps(ctx, KICK, x0, 352, { size: 20, color: P.accentInk, rise: kick });
      T.hairline(ctx, x0 + 60, 382, 120, rm(lt, 1.2 * B, 1.2 * B + 0.9), { color: P.accent, lw: 1.4 });
      T.maskRise(ctx, NUM, x0 - 8, 612, lt - 1.5 * B, { size: 232, fam: 'display', weight: 400, from: 'left', stagger: 0.085, dur: 1.2, color: P.ink });
      T.maskRise(ctx, UNIT, x0, 700, lt - 2.7 * B, { size: 54, fam: 'display', weight: 'italic 400', from: 'left', stagger: 0.012, dur: 1.0, color: P.ink2, above: 1.0, below: 0.36 });
      // hold: the credit rises on the hold's first bar line (30-s cut), then stays
      onBars(env, 1, (i, dt) => { if (i === 0) T.caps(ctx, CREDIT, x0, 790, { size: 18, color: P.muted, rise: rm(dt, 0, 1.1) }); });
      ctx.restore();
      ctx.restore();
    },
  };
})();
