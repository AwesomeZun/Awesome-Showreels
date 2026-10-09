// schnitt (2 bars in the short cut, up to 5 in the 30): the section of Haus für Musik, drawn at true scale on the
// same 12 axes the hook counted (axis k on the left edge of column k; a bay of 7.20 m is one column pitch, a floor of
// 3.60 m half of it). The dimension chain is already in place (match cut from raster). Beat 0: the ground line and
// ±0.00; the twelve axes rise from the chain a sixty-fourth apart. Beats 1-4: one floor per beat (walls grow, the
// slab snaps on, the level is marked) while the level number rolls ±0.00 > +3.60 > +7.20 > +10.80 > +14.40.
// The text lands with the first floor (beats 1-1.25). Beat 5: the hall on axes 5-8 fills red, the page's one red
// element. From beat 6 the beat walks the axis circles.
// Hold (30 s): bar 1 numbers the 24 practice rooms one per 32nd, bar 2 seats 240 in the hall row by row, bar 3 names
// the rooms.
// Out (last beat): the columns fall black from the top, twelve within the beat: the next page is black.
(() => {
  const ID = 'schnitt';
  const LEVELS = ['±0.00', '+3.60', '+7.20', '+10.80', '+14.40'];
  SCENES[ID] = {
    draw(ctx, t, env) {
      const P = env.palette, G = ZW.geo(), B = env.beatSec, lt = env.lt, at = (b) => lt - b * B;
      const snap = (b, d = 0.25) => ZW.snap(at(b), d * B);
      ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);

      // ── geometry: axes, levels, chain rows
      const ax = (i) => G.x(i);
      const fh = (G.x(1) - G.x(0)) / 2;
      const g0 = G.y(5), lv = (k) => g0 - k * fh;
      const bubY = lv(4) - 40, c1 = G.y(5) + 64, c2 = G.y(5) + 112;
      const xs = Array.from({ length: G.n }, (_, i) => ax(i));

      // ── the dimension chain, complete from frame 0 (identical to raster's last frame)
      ZW.chain(ctx, xs, c1, 1, Array(G.n - 1).fill('7.20'), 1, { palette: P });
      ZW.chain(ctx, [xs[0], xs[G.n - 1]], c2, 1, ['79.20 m'], 1, { palette: P, weight: 700 });

      // ── axes: rise from the chain on beat 0, one per 64th; once the building stands (beat 6) the beat fills one
      //    circle after the other, the same column the strip marks
      const cursor = at(6) >= 0 ? ((ZW.beatIndex(env) % G.n) + G.n) % G.n : -1;
      for (let i = 0; i < G.n; i++) {
        const dt = lt - (i * B) / 16;
        ZW.axis(ctx, ax(i), bubY, c2 + 14, Ease.outQuint(clamp(dt / (B / 4))), String(i + 1), ZW.snap(dt - B / 5, B / 8),
          { palette: P, active: i === cursor ? 1 : 0 });
      }

      // ── hold: one new layer of information per bar line (hb[n] = seconds since hold bar n)
      const hb = [];
      onBars(env, 1, (n, dt) => { hb[n] = dt; });
      const room = (b, k) => [ax(b) + 3, ax(b + 1) - 3, lv(k) + 6, lv(k - 1)];
      // bar 1: the 24 practice rooms, numbered one per 32nd note (storey by storey, left to right)
      if (hb[0] !== undefined) {
        const ROOMS = [];
        for (let k = 2; k <= 4; k++) for (const b of [0, 1, 2, 3, 7, 8, 9, 10]) ROOMS.push([b, k]);
        const shown = Math.min(24, Math.floor(hb[0] / (B / 8)) + 1);
        for (let r = 0; r < shown; r++) {
          const [x0, x1, y0, y1] = room(...ROOMS[r]);
          ctx.fillStyle = P.bg2; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
          ZW.text(ctx, String(r + 1).padStart(2, '0'), x0 + 9, y0 + 24, { size: 18, weight: 500, color: P.ink });
        }
      }
      // ── the hall void (red, beat 5); bar 2 of the hold seats 240, twelve rows of twenty, one row per 32nd note
      const hallP = ZW.snap(at(5), B / 4);
      if (hallP > 0) {
        const hx0 = ax(4) + 3, hx1 = ax(7) - 3, hy0 = lv(2) + 6, hy1 = g0;
        ctx.fillStyle = P.accent; ctx.fillRect(hx0, hy1 - (hy1 - hy0) * hallP, hx1 - hx0, (hy1 - hy0) * hallP);
        ZW.reveal(ctx, 'Saal / Hall', hx0 + 14, hy0 + 26, snap(5.25), { size: 20, weight: 700, color: P.bg });
        if (hb[1] !== undefined) {
          const rows = Math.min(12, Math.floor(hb[1] / (B / 8)) + 1), sx = (hx1 - hx0 - 28) / 20;
          ctx.fillStyle = P.bg;
          for (let r = 0; r < rows; r++) for (let c = 0; c < 20; c++) ctx.fillRect(hx0 + 14 + c * sx + (sx - 6) / 2, hy0 + 44 + r * 7.5, 6, 4);
          ZW.reveal(ctx, '240 Plätze / seats', hx0 + 32 + ZW.width(ctx, 'Saal / Hall', { size: 20, weight: 700 }), hy0 + 26,
            ZW.snap(hb[1] - 1.5 * B, B / 4), { size: 20, weight: 500, color: P.bg });
        }
      }
      // bar 3: the other rooms by name, one per 32nd note
      if (hb[2] !== undefined) {
        const NAMES = [['Foyer', 0, 1], ['Büro, Lager', 7, 1], ['Ensemble', 4, 3], ['Ensemble', 5.5, 3], ['Bibliothek / Library', 4, 4]];
        NAMES.forEach(([s, b, k], i) => {
          const x0 = ax(0) + b * (ax(1) - ax(0)) + 12, y0 = lv(k) + 6;
          ZW.reveal(ctx, s, x0, y0 + 26, ZW.snap(hb[2] - (i * B) / 8, B / 8), { size: 18, weight: 500, color: P.ink });
        });
      }

      // ── structure: ground on beat 0, then one storey per beat (walls rise, the slab snaps on, the level is marked)
      ZW.hrule(ctx, G.mx, G.right, g0 + 4, Ease.outQuint(clamp(lt / (B / 2))), 8, P.ink);
      const WALLS = (k) => {
        const w = [[0, 6], [4, 6], [7, 6], [11, 6]];
        if (k >= 2) for (const b of [1, 2, 3, 8, 9, 10]) w.push([b, 3]);
        return w;
      };
      for (let k = 1; k <= 4; k++) {
        const pw = Ease.outQuint(clamp(at(k - 0.5) / (B / 4)));
        if (pw > 0) {
          for (const [b, wd] of WALLS(k)) ZW.vrule(ctx, ax(b), lv(k - 1), lv(k), pw, wd, P.ink);
          if (k === 3) ZW.vrule(ctx, ax(4) + 1.5 * (ax(1) - ax(0)), lv(2), lv(3), pw, 3, P.ink);   // between the two ensemble rooms
        }
        const ps = ZW.snap(at(k), B / 8);
        if (ps > 0) {
          const spans = k === 1 ? [[0, 4], [7, 11]] : [[0, 11]];
          for (const [a, b] of spans) { ctx.fillStyle = P.ink; ctx.fillRect(ax(a) - 3, lv(k), (ax(b) - ax(a) + 6) * ps, k === 4 ? 8 : 6); }
        }
      }
      for (let k = 0; k <= 4; k++) ZW.level(ctx, ax(11) + 24, lv(k), LEVELS[k], snap(k, 0.125), { palette: P });

      // ── the level number rolls one storey per beat
      const step = clamp(Math.floor(lt / B + 1e-6), 0, 4);
      const NUM = 320, nx = G.x(0) + ZW.inkLeft(ctx, '+', { size: NUM }), ny = G.y(1) + NUM * 0.703;
      const nls = -0.01 * NUM;                                              // the flag of the 1 needs air next to the +
      if (step === 0) ZW.numeral(ctx, LEVELS[0], nx, ny, lt, { size: NUM, ls: nls, color: P.ink, stagger: B / 16, dur: B / 8 });
      else ZW.rollText(ctx, LEVELS[step - 1], LEVELS[step], nx, ny, at(step), { size: NUM, ls: nls, color: P.ink, stagger: B / 16, dur: B / 8 });

      // ── kicker, running head, text
      ZW.kicker(ctx, '02', 'Schnitt / Section', G.x(0), G.my + 14, ZW.snap(lt, B / 4), { color: P.ink });
      ZW.head(ctx, env, 1);
      ZW.reveal(ctx, 'Vier Geschosse à 3.60 m.', G.x(8), ny - 40, snap(1), { size: 32, weight: 700, color: P.ink });
      ZW.reveal(ctx, 'Four floors, 3.60 m each.', G.x(8), ny, snap(1.25), { size: 32, weight: 500, color: P.ink2 });

      ZW.strip(ctx, env, { on: P.ink, off: P.line });
      // ── out: the columns fall black, twelve within the last beat
      ZW.wipe(ctx, env, lt - (env.dur - env.outSec), { color: P.ink });
    },
  };
})();
