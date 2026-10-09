// raster (hook; 2 bars in every cut): "12 axes, 7.20 m apart." The film opens on the construction frame the brand
// sheet allows (the 12 grid fields at 6 % ink, column numbers, the red square on axis 1). Bar 1: the columns fill
// black one per sixteenth note, counting to twelve; on beat 3 they retract into the top edge a sixty-fourth apart and
// uncover the number they were hiding, 12, set across six columns. Bar 2: kicker and text snap in on the downbeat,
// the dimension chain draws along the bottom row (beat 5), its bay labels pop (beat 6) and the overall 79.20 m lands
// (beat 7). The chain stays exactly where schnitt starts, so the hard cut into the section is a match.
(() => {
  const ID = 'raster';
  SCENES[ID] = {
    draw(ctx, t, env) {
      const P = env.palette, G = ZW.geo(), B = env.beatSec, lt = env.lt, at = (b) => lt - b * B;
      const snap = (b, d = 0.25) => ZW.snap(at(b), d * B);
      ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);

      // ── the number, 616 px of digit height across rows 2-5, flush left on column 1 (under the black columns)
      const NUM = (G.yb(4) - G.y(1)) / 0.703;
      if (at(3) >= 0) ZW.numeral(ctx, '12', G.x(0), G.yb(4), 1, { size: NUM, color: P.ink, optical: true });

      // ── bar 1: construction frame (fields + column numbers) until the retract starts on beat 3
      if (at(3) < 0) ZW.fields(ctx, P.bg2);
      if (at(4) < 0) for (let i = 0; i < G.n; i++) ZW.text(ctx, String(i + 1), G.x(i), G.my - 18, { size: 16, weight: 500, color: P.muted });
      if (at(3) < 0) ZW.wipe(ctx, env, lt, { columns: true, step: B / 4, dur: B / 8, color: P.ink });         // one column per 16th
      else ZW.wipe(ctx, env, at(3), { columns: true, mode: 'uncover', step: B / 16, dur: B / 4, color: P.ink }); // 12 in under a beat

      // ── bar 2: kicker and text on the downbeat
      ZW.kicker(ctx, '01', 'Raster / Grid', G.x(1), G.my + 14, snap(4), { color: P.ink });
      ZW.head(ctx, env, snap(4));
      ZW.reveal(ctx, 'Achsen, 7.20 m Achsmass.', G.x(8), G.yb(4) - 40, snap(4), { size: 32, weight: 700, color: P.ink });
      ZW.reveal(ctx, '12 axes, 7.20 m apart.', G.x(8), G.yb(4), snap(4.25), { size: 32, weight: 500, color: P.ink2 });

      // ── the dimension chain under the number: line on beat 5, bay labels on beat 6, the overall length on beat 7
      const xs = Array.from({ length: G.n }, (_, i) => G.x(i));
      const c1 = G.y(5) + 64, c2 = G.y(5) + 112;
      ZW.chain(ctx, xs, c1, Ease.outQuint(clamp(at(5) / (0.5 * B))), Array(G.n - 1).fill('7.20'), clamp(at(6) / ((11 / 16) * B)), { palette: P });
      ZW.chain(ctx, [xs[0], xs[G.n - 1]], c2, snap(7), ['79.20 m'], snap(7), { palette: P, weight: 700 });

      // ── hold: a red axis line walks the twelve axes, one per beat from beat 4, lighting its number
      if (at(4) >= 0) {
        const k = Math.min(G.n - 1, Math.floor(at(4) / B)), f = (at(4) / B) % 1;
        const ax = G.x(k), y0 = G.my + 8, y1 = c2 + 20;
        ZW.vrule(ctx, ax, y0, y1, Ease.outQuint(clamp(f / 0.35)), 3, P.accent);
        for (let i = 0; i <= k; i++) ZW.text(ctx, String(i + 1), G.x(i), G.my - 18, { size: 20, weight: 700, color: i === k ? P.accent : P.ink2 });
      }

      // ── the red square marks axis 1 from the first frame to the last
      ZW.square(ctx, G.x(0), G.my, G.cw, P.accent);
      ZW.strip(ctx, env, { on: P.ink, off: P.line });
    },
  };
})();
