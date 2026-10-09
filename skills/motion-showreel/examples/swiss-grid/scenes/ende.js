// ende (end card; 2 bars in the short cut, up to 4 in the 30, no out-phase: the reel ends on it). The page cuts in
// black on the bar line and its columns retract into the top edge, twelve within the first beat, uncovering the
// wordmark (the red square on axis 1, then büro zwölf). Then the card typesets itself on eighth notes: the project
// title (beat 0.5), the competition line (0.75), the studio's stance, German first (1), English second (1.5), and the
// small print the brand sheet asks for (1.5), so every line has its reading time even in the short cut.
// Hold (from beat 2): the beat lights one column at a time; one colophon line per bar line (jury, further
// development, the studio).
(() => {
  const ID = 'ende';
  const COLOPHON = [
    'Jury Juni 2026 / jury June 2026',
    'Weiterbearbeitung ab Herbst 2026 / further development from autumn 2026',
    'Büro Zwölf Architekten, Zürich',
  ];
  SCENES[ID] = {
    draw(ctx, t, env) {
      const P = env.palette, G = ZW.geo(), B = env.beatSec, lt = env.lt, at = (b) => lt - b * B;
      const snap = (b, d = 0.25) => ZW.snap(at(b), d * B);
      ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < G.n; i++) {                                      // the grid draws itself, one axis per eighth
        const p = Ease.outQuint(clamp(at(2 + i * 0.5) / (B / 2)));
        if (p > 0) ZW.vrule(ctx, G.x(i), G.my, G.bottom, p, 1, P.line);
      }

      // ── the wordmark: the red square on axis 1, büro zwölf flush left on column 2, ascenders on the square's top
      const WM = 168;
      ZW.square(ctx, G.x(0), G.my, G.cw, P.accent);
      ZW.text(ctx, 'büro zwölf', G.x(1) + ZW.inkLeft(ctx, 'b', { size: WM }), G.my + G.cw, { size: WM, weight: 700, color: P.ink, ls: Z_TRACK(WM) });

      // ── project title on the row-3 line, the competition line under it, the small print on the bottom margin
      const base = G.yb(2), lead = 36;
      ZW.reveal(ctx, 'Haus für Musik', G.x(0) + ZW.inkLeft(ctx, 'H', { size: 120 }), base, snap(0.5), { size: 120, weight: 700, color: P.ink, ls: Z_TRACK(120), desc: 0.28 });
      ZW.reveal(ctx, 'Wettbewerb 2026, 1. Rang / Competition 2026, first prize', G.x(0), base + 52, snap(0.75), { size: 24, weight: 500, color: P.ink2 });
      ZW.reveal(ctx, 'Fictional studio and project, demo content.', G.x(0), G.bottom - 4, snap(1.5), { size: 16, weight: 500, color: P.muted });

      // ── the stance on columns 8-12, German first (Bold), English second (Medium); its first line shares the title's
      //    baseline. Typeset on eighth notes so it reads for the rest of the card.
      const sx = G.x(7);
      ZW.reveal(ctx, 'Ein Raster für den Raum.', sx, base, snap(1), { size: 48, weight: 700, color: P.ink, ls: Z_TRACK(48) });
      ZW.reveal(ctx, 'Ein Takt für die Zeit.', sx, base + 56, snap(1.125), { size: 48, weight: 700, color: P.ink, ls: Z_TRACK(48) });
      ZW.reveal(ctx, 'A grid for space.', sx, base + 136, snap(1.5), { size: 48, weight: 500, color: P.ink2, ls: Z_TRACK(48) });
      ZW.reveal(ctx, 'A beat for time.', sx, base + 192, snap(1.625), { size: 48, weight: 500, color: P.ink2, ls: Z_TRACK(48) });

      // ── hold: one colophon line per bar line, listed under the competition line
      onBars(env, 1, (n, dt) => {
        if (n >= COLOPHON.length) return;
        ZW.reveal(ctx, COLOPHON[n], G.x(0), base + 52 + (n + 1) * lead, ZW.snap(dt, B / 4), { size: 24, weight: 500, color: P.ink2 });
      });

      ZW.strip(ctx, env, { on: P.ink, off: P.line });
      // ── in: the black page retracts into the top edge, column by column, within the first beat
      ZW.wipe(ctx, env, lt, { mode: 'uncover', color: P.ink });
    },
  };
  function Z_TRACK(size) { return ZW.track(size, 'display'); }
})();
