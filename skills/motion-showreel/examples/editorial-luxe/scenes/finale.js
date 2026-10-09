// finale: "Les Heures Blanches". Back on the satin (the reel opens and closes on the silk): the champagne-foil
// monogram, the house name on its hairline, the collection's title in italics, the press release's first line, the
// season and the date, and the fictional-house disclaimer. Hold: the lamp keeps moving and a light crosses the foil.
// outBeats 0: the reel ends on this card.
(() => {
  const NAME = 'MAISON VEYRANDE', TITLE = 'Les Heures Blanches', LINE = 'Between midnight and dawn, the atelier keeps its own hours.';
  const SEASON = 'HAUTE COUTURE · AUTOMNE–HIVER 2026–2027', DATE = 'PARIS · 6 JUILLET 2026';
  const NOTE = 'Maison Veyrande is a fictional couture house. All names, looks, dates and figures are invented.';
  // the monogram: M over V in the house Didone, parted by a hairline, in a double hairline ring
  function monogram(g, cx, cy, r) {
    g.font = font(r * 0.64, 400, 'display');
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.fillText('M', cx, cy - r * 0.09);
    g.fillText('V', cx, cy + r * 0.57);
    g.fillRect(cx - r * 0.26, cy + r * 0.025 - 0.6, r * 0.52, 1.2);
    g.lineWidth = 1.6;
    g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 0.9;
    g.beginPath(); g.arc(cx, cy, r - 6, 0, Math.PI * 2); g.stroke();
  }
  SCENES['finale'] = {
    draw(ctx, t, env) {
      const P = env.palette, lt = env.lt, B = env.beatSec, VY = window.VEYRANDE, T = VY.type;
      // the lamp crosses the card from right to left for as long as it is held: its pool and the satin's sheen travel
      // over the folds at the edges, the type stays perfectly still
      const lampX = 0.86 - 0.075 * lt + 0.015 * Math.sin(lt * 0.37), lampY = 0.18 + 0.03 * Math.sin(lt * 0.29);
      VY.silk.draw(ctx, lt + 31, { P, lampX, lampY, bump: 0.1, zoom: 1.05 - 0.004 * lt, panX: 16 * lt, lamp: 1 });
      ctx.fillStyle = radial(ctx, W / 2, 540, 0, 1000, [[0, rgba(P.bg, 0.86)], [0.45, rgba(P.bg, 0.62)], [1, rgba(P.bg, 0.08)]]);
      ctx.fillRect(0, 0, W, H);
      T.motes(ctx, lt + 5, { n: 30, alpha: 0.55, lx: lampX, ly: lampY + 0.2, lr: 760 });

      const cx = W / 2;
      // the monogram fades in on its foil (no scale bounce), then a light crosses it at beat 4 and on every later bar
      const mA = Ease.ioQ(rm(lt, 1.0 * B, 2.4 * B)), mr = 50, my = 236;
      let sweep = rm(lt, 1.4 * B, 1.4 * B + 1.5);
      if (lt > 4 * B) sweep = rm(lt, 4 * B, 4 * B + 1.6);
      onBars(env, 1, (i, dt) => { sweep = rm(dt, 0, 1.6); });
      if (mA > 0) T.foil(ctx, g => monogram(g, cx, my, mr), { x: cx - mr - 4, y: my - mr - 4, w: 2 * mr + 8, h: 2 * mr + 8 }, sweep, { P, alpha: mA });
      // the house name and its rule
      const sizeN = 28;
      T.maskRise(ctx, NAME, cx, 350, lt - 1.25 * B, { size: sizeN, fam: 'display', weight: 400, ls: sizeN * (STYLE.type.trackingName || 0.32), align: 'center', color: P.ink, stagger: 0.03, dur: 1.0 });
      T.hairline(ctx, cx, 384, 260, rm(lt, 1.6 * B, 1.6 * B + 1.2), { color: P.accent, lw: 1.4 });
      // the title: the hero, rising from the centre outward; it starts inside the dissolve and its centre lands on beat 1
      T.maskRise(ctx, TITLE, cx, 560, lt + 0.5, { size: 150, fam: 'display', weight: 'italic 400', align: 'center', stagger: 0.035, dur: 1.25, color: P.ink, above: 1.05, below: 0.42 });
      T.maskRise(ctx, LINE, cx, 640, lt - 2.25 * B, { size: 34, fam: 'display', weight: 400, align: 'center', from: 'left', stagger: 0.006, dur: 0.9, color: P.ink2 });
      T.caps(ctx, SEASON, cx, 744, { size: 20, align: 'center', color: P.muted, rise: rm(lt, 3.0 * B, 3.0 * B + 1.1) });
      T.caps(ctx, DATE, cx, 786, { size: 20, align: 'center', color: P.accentInk, rise: rm(lt, 3.5 * B, 3.5 * B + 1.1) });
      withAlpha(ctx, Ease.ioQ(rm(lt, 4 * B, 4 * B + 1.0)), () =>
        T.caps(ctx, NOTE, cx, 1030, { size: 16, track: 0.04, weight: 400, align: 'center', color: P.muted }));
    },
  };
})();
