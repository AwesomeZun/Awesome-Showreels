// grow: "Grown slowly." Dawn on the hillside, as a time-lapse. Two banks of mist part on beats 0-3 and the sun wash
// warms in. On last year's wood above the bush the winter bud breaks (its scales peel back, 0.4-1.3) and the new
// season's flush grows the way tea really does (MF.drawGrowing): three internodes stretch on overlapping curves and
// carry the leaves up, each leaf comes out folded along its midrib and pressed to the stem, then lengthens, swings
// out and opens like a book while it widens and darkens; the growing tip nods in slow circles. The flush ends as
// 'two leaves and a bud' (the top leaf still half folded), a dew drop gathers at the bud and glints on beat 6. Kicker,
// headline and the Latin name soak into the paper on the right. Out (2 beats): the camera pulls focus onto the
// flush, everything else softens into the paper and the sway stills, so steep can pick the same flush.
(() => {
  const MF = window.MISTFOLD;
  const at = (env, b) => env.lt - b * env.beatSec;
  function dew(ctx, out, T, a) {
    const u = rm(T, 5.8, 6.15);
    if (!out.bud || u <= 0) return;
    const { x, y, ang } = out.bud, px = x - Math.cos(ang) * 14, py = y - Math.sin(ang) * 14 + 4, r = 5.2 * Ease.outQuint(u);
    ctx.save(); ctx.globalAlpha *= a;
    ctx.fillStyle = rgba('#FFFFFF', 0.55); circle(ctx, px, py, r); ctx.fill();
    ctx.strokeStyle = rgba(C.accent, 0.5); ctx.lineWidth = 0.8; ctx.stroke();
    ctx.fillStyle = '#FFFFFF'; circle(ctx, px - r * 0.35, py - r * 0.35, r * 0.32); ctx.fill();
    const g = rm(T, 6.0, 6.7);                              // the glint on beat 6
    if (g > 0 && g < 1) sparkle(ctx, px - r * 0.3, py - r * 0.4, 16 * Math.sin(Math.PI * g), 0.9 * Math.sin(Math.PI * g), g * 1.5, '#FFFFFF');
    ctx.restore();
  }
  SCENES['grow'] = {
    draw(ctx, t, env) {
      const P = env.palette, lt = env.lt, bs = env.beatSec, T = lt / bs, ph = env.phase;
      const e = Ease.ioC(ph.out), tl = lt - env.dur;        // tl: ambient clock anchored to the scene end (steep starts at 0)
      MF.paper(ctx, 'oat');
      const dawn = Ease.ioSine(rm(T, 0.4, 4.5));
      MF.light(ctx, tl, { a: 0.03 + 0.045 * dawn, sun: [1560, 110 + 60 * (1 - dawn), 760], sunA: 0.04 + 0.12 * dawn });
      const bgA = (1 - Ease.ioC(ph.out));
      MF.hills(ctx, lt, { a: bgA, y0: 520 });
      MF.terraces(ctx, lt, { a: bgA * Ease.outC(rm(lt, 0, 1.2)) });
      // camera: a slow push in the in-phase, then focus onto the flush (the same view steep opens on)
      const fa = MF.flushAnchor(), FV = MF.FLUSH_VIEW, A0 = [720, 560];
      const z0 = 1.12 + 0.08 * Ease.ioSine(clamp(lt / (6 * bs))), drift = 1 - e;
      const z = lerp(z0, FV.z, e), ax = lerp(A0[0], fa[0], e), ay = lerp(A0[1], fa[1], e);
      const sx = lerp(A0[0], FV.x, e) + Math.sin(lt * 0.5) * 4 * drift, sy = lerp(A0[1], FV.y, e) + Math.cos(lt * 0.4) * 3 * drift;
      ctx.save();
      ctx.translate(sx, sy); ctx.scale(z, z); ctx.translate(-ax, -ay);
      const fade = 1 - e, part = Ease.ioC(rm(T, 0, 3.4));
      // the plant comes into focus as the mist thins, then softens again only for the out-phase rack focus
      const blur = Math.max(5 * (1 - Ease.outC(rm(T, 0.3, 2.6))), 6 * e);
      // breeze: two gusts, each a quick bend that rings out
      const gust = (b) => { const d = (lt - b * bs) / bs; return d > 0 ? Math.sin(d * 2.4) * Math.exp(-d * 1.1) : 0; };
      const sway = (0.016 + 0.03 * (gust(2.5) + 0.8 * gust(4.5))) * (1 - e) * Ease.outC(rm(T, 4.5, 6));
      ctx.save(); if (blur > 0.3) ctx.filter = `blur(${blur.toFixed(2)}px)`;
      MF.drawGrowing(ctx, MF.TEA_PLANT, T, { sway, t: tl, to: MF.FLUSH_CUT, alpha: fade, w0: 10, w1: 3 });
      ctx.restore();
      MF.foreBush(ctx, 602, 1000, 1.0, fade, tl);
      ctx.save(); const fb = Math.max(5 * (1 - Ease.outC(rm(T, 0.3, 2.6))), 0); if (fb > 0.3) ctx.filter = `blur(${fb.toFixed(2)}px)`;
      const out = MF.drawGrowing(ctx, MF.TEA_PLANT, T, { sway, t: tl, from: MF.FLUSH_CUT, w0: 10, w1: 3 });
      ctx.restore();
      dew(ctx, out, T, 1);
      ctx.restore();
      // the mist parts: two banks drift apart and thin out; a light residue keeps hanging over the far rows
      MF.mistVeil(ctx, -W * 0.35 - part * W * 0.75 + Math.sin(lt * 0.3) * 20, (1 - part) * 0.95 + 0.06 * fade, 0);
      MF.mistVeil(ctx, -W * 0.65 + part * W * 0.7, (1 - part) * 0.9, 1);
      MF.motes(ctx, tl, { n: 22, a: 0.85 * (1 - e) * Ease.outC(rm(T, 0.5, 2)) });
      // type: kicker, headline, the Latin name; exits glyph by glyph as the camera moves
      const outAt = env.dur - env.outSec;
      MF.label(ctx, 'Mistfold Tea Garden · since 1962', 1046, 452, at(env, 1.5), { size: 21, color: P.accent, out: { at: outAt - 1.5 * bs, dur: 0.35 } });
      MF.inkText(ctx, 'Grown slowly.', 1040, 574, at(env, 2), { size: 128, color: P.ink, out: { at: outAt - 2 * bs, dur: 0.45, stagger: 0.015 } });
      const rp = Ease.outQuint(rm(lt, 3.25 * bs, 3.9 * bs)) * (1 - Ease.inQ(rm(lt, outAt, outAt + 0.4)));
      if (rp > 0) { ctx.fillStyle = rgba(P.accent, 0.6); ctx.fillRect(1046, 622, 64 * rp, 1.5); }
      MF.inkText(ctx, 'Camellia sinensis', 1044, 684, at(env, 3.5), { size: 40, weight: 400, italic: true, fam: 'serif', color: P.accent, ls: 0, out: { at: outAt - 3.5 * bs, dur: 0.4 } });
    },
  };
})();
