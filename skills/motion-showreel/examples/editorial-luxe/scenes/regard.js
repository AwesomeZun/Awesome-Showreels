// regard: "Thirty-one looks". The closing gown starts where the atelier scene left it (match cut), then steps back into
// a lineup of five plates, the way the lookbook shows its selected croquis; the four other looks open from vertical
// slits, one per half beat, and their captions rise. Hold: the lamp passes along the lineup and the plate under it is
// framed by a champagne hairline, one plate per beat. Out: 1 beat, under the finale's dissolve.
(() => {
  const HEAD = 'Thirty-one looks', SIDE = 'SELECTED CROQUIS · I–V';
  const LOOKS = [['01', 'MANTEAU DU SOIR'], ['07', 'ROBE COLONNE'], ['12', 'CAPE DE MINUIT'], ['19', 'TAILLEUR BLANC'], ['31', 'LA DERNIÈRE HEURE']];
  const PW = 272, PH = 600, GAP = 54, TOP = 236;
  const X0 = (W - (5 * PW + 4 * GAP)) / 2;
  const plateRect = i => ({ x: X0 + i * (PW + GAP), y: TOP, w: PW, h: PH });
  const FIG = 0.9;                                                    // croquis height inside a plate, of the plate height
  SCENES['regard'] = {
    draw(ctx, t, env) {
      const P = env.palette, lt = env.lt, B = env.beatSec, VY = window.VEYRANDE, T = VY.type, K = VY.croquis, H0 = K.HERO;
      // ambient clocks continue the atelier scene's (its length comes from this cut's plan), so the match cut keeps the
      // light, the dust and the sequin glints exactly where they were
      const prev = ((REEL.plan && REEL.plan.scenes) || []).find(s => s.id === 'atelier'), tc = lt + (prev ? prev.dur : 0);
      // the atelier ended on a slow push: start from that pose and ease it back over the first two beats
      const z0 = prev ? K.pushAt(prev.dur, prev.inSec) : 1, z = lerp(z0, 1, Ease.ioQuint(rm(lt, 0, 2 * B)));
      ctx.save();
      ctx.translate(K.PUSH.fx, K.PUSH.fy); ctx.scale(z, z); ctx.translate(-K.PUSH.fx, -K.PUSH.fy);
      T.paper(ctx, P, { lx: 0.66 + 0.03 * Math.sin(tc * 0.23), ly: 0.12 + 0.02 * Math.cos(tc * 0.19) });
      T.motes(ctx, tc + 11, { n: 18, alpha: 0.42, lx: 0.66, ly: 0.3, lr: 640 });
      // the lamp travels along the lineup during the hold (one plate per beat)
      const holdBeats = env.phase.hold / B, lampI = env.phase.hold > 0 ? Math.floor(holdBeats) % 5 : -1;
      const out = env.phase.out;
      // plates 0-3 open from slits, the opening fastest on beats 1, 1.5, 2, 2.5; plate 4 (look 31) receives the gown
      for (let i = 0; i < 5; i++) {
        const r = plateRect(i), id = LOOKS[i][0];
        const open = i < 4 ? rm(lt, (1 + i * 0.5) * B - 0.5, (1 + i * 0.5) * B + 0.5) : rm(lt, 1.6 * B, 2.6 * B);   // fastest on the beat
        if (open <= 0) continue;
        if (i < 4) {
          T.aperture(ctx, r, open, g => {
            g.fillStyle = P.bg2; g.fillRect(r.x, r.y, r.w, r.h);
            const ph = r.h * FIG, img = K.plate(id, ph, P);
            g.drawImage(img, r.x + (r.w - img.width) / 2, r.y + (r.h - ph) / 2);
          }, { zoom: 1.06 });
        } else {                                                      // the hero's plate fades in under the gown
          withAlpha(ctx, Ease.ioQ(open), () => { ctx.fillStyle = P.bg2; ctx.fillRect(r.x, r.y, r.w, r.h); });
        }
        if (i === lampI) {                                            // hold: the plate under the lamp is framed
          const dt = env.phase.hold - Math.floor(holdBeats) * B, k = Ease.outQuint(clamp(dt / 0.6));
          ctx.save(); ctx.strokeStyle = rgba(P.accent, 0.9 * (1 - Ease.inC(clamp((dt - 0.45) / 0.3)))); ctx.lineWidth = 1.5;
          const m = 10, L = (r.w + r.h + 4 * m) * 2 * k;
          ctx.setLineDash([L, 1e5]); ctx.strokeRect(r.x - m, r.y - m, r.w + 2 * m, r.h + 2 * m); ctx.setLineDash([]);
          ctx.restore();
          softBlob(ctx, r.x + r.w / 2, r.y + r.h * 0.42, 240, mix(P.bg, '#FFFFFF', 0.7), 0.35 * Math.sin(Math.PI * clamp(dt / B)));
        }
      }
      // the gown: from the atelier's pixels into plate 4 (beats 0.25 - 2.75, no overshoot)
      const r4 = plateRect(4), g = Ease.ioQuint(rm(lt, 0.25 * B, 2.75 * B));
      const hh = lerp(H0.h, r4.h * FIG, g), cx = lerp(H0.cx, r4.x + r4.w / 2, g), top = lerp(H0.top, r4.y + (r4.h - r4.h * FIG) / 2, g);
      K.draw(ctx, H0.look, cx, top, hh, 1, { P });
      K.sequins(ctx, H0.look, cx, top, hh, 1, tc, { P });
      ctx.restore();
      // type
      ctx.save();
      ctx.globalAlpha *= 1 - Ease.ioQ(out);
      const x0 = STYLE.layout.margin || 160;
      T.maskRise(ctx, HEAD, X0, 168, lt - 2.75 * B, { size: 84, fam: 'display', weight: 'italic 400', from: 'left', stagger: 0.02, dur: 1.0, color: P.ink, above: 1.05, below: 0.4 });
      T.caps(ctx, SIDE, X0 + 5 * PW + 4 * GAP, 160, { size: 17, align: 'right', color: P.muted, rise: rm(lt, 3.25 * B, 3.25 * B + 1) });
      LOOKS.forEach(([id, name], i) => {
        const r = plateRect(i), c0 = (3.5 + i * 0.25) * B, on = i === lampI;
        T.caps(ctx, 'LOOK ' + id, r.x, r.y + r.h + 46, { size: 17, color: P.accentInk, rise: rm(lt, c0, c0 + 0.9) });
        T.caps(ctx, name, r.x, r.y + r.h + 78, { size: 15, track: 0.2, color: on ? P.ink : P.ink2, rise: rm(lt, c0 + 0.12, c0 + 1.0) });
      });
      ctx.restore();
    },
  };
})();
