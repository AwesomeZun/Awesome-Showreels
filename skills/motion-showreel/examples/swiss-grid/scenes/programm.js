// programm (2 bars in the short cut, up to 4 in the 30): "Black pages are for numbers." The page arrives black (the
// section's columns fell on the bar line). One number per beat, each rolling in digit by digit on the sub kick:
// 24 practice rooms (beat 0), 2 ensemble rooms (beat 1), 1 hall (beat 2, the page's one red element); a rule draws
// across the twelve columns on beat 3. Hold: one fact from the brief per bar line, number large and unit small
// (600 pupils, 4’562 m² gross floor area, 1’980 m² plot). Out: nothing leaves; the end card cuts in on the bar line
// as a black page and uncovers itself.
(() => {
  const ID = 'programm';
  const MAIN = [
    ['24', 'Übungsräume / practice rooms'],
    ['2', 'Ensembleräume / ensemble rooms'],
    ['1', 'Saal, 240 Plätze / hall, 240 seats'],
  ];
  const FACTS = [
    ['600', '', 'Schülerinnen und Schüler / pupils'],
    ['4’562', 'm²', 'Geschossfläche / gross floor area'],
    ['1’980', 'm²', 'Grundstück / plot'],
  ];
  SCENES[ID] = {
    draw(ctx, t, env) {
      const P = env.palette, G = ZW.geo(), B = env.beatSec, lt = env.lt, at = (b) => lt - b * B;
      const snap = (b, d = 0.25) => ZW.snap(at(b), d * B);
      ctx.fillStyle = P.ink; ctx.fillRect(0, 0, W, H);
      const paper = P.bg, paper2 = P.paper65 || mix(P.ink, P.bg, 0.65);

      ZW.kicker(ctx, '03', 'Programm / Programme', G.x(0), G.my + 14, ZW.snap(lt, B / 4), { color: paper });
      ZW.head(ctx, env, ZW.snap(lt, B / 4), { color: paper, muted: paper2 });

      // ── the three numbers of the programme, one per beat; 480 px, flush left on columns 1, 6 and 10 (5 + 4 + 3
      //    columns: the two-digit number gets the widest field, so 24, 2 and 1 never read as one figure)
      const NUM = 480, base = G.y(1) + 0.703 * NUM + 31, COLS = [0, 5, 9];
      MAIN.forEach(([n, label], i) => {
        const x = G.x(COLS[i]), col = i === 2 ? P.accent : paper;
        ZW.numeral(ctx, n, x + ZW.inkLeft(ctx, n, { size: NUM }), base, at(i), { size: NUM, color: col, stagger: B / 16, dur: B / 8 });
        ZW.reveal(ctx, label, x, base + 52, snap(i + 0.25), { size: 24, weight: 500, color: paper2 });
      });
      // ── the rule across the twelve columns (beat 3)
      const ry = G.y(4);
      ZW.hrule(ctx, G.x(0), G.right, ry, Ease.outQuint(clamp(at(3) / (B / 2))), 2, paper);

      // ── hold: one fact per bar line (number rolls in, the unit and the label follow a sixteenth later)
      FACTS.forEach(([num, unit, label], n) => {
        const dt = at(4 + n);
        if (dt < 0) return;
        const x = G.x(COLS[n]), y = ry + 128, S = 96;
        const w = ZW.numeral(ctx, num, x + ZW.inkLeft(ctx, num, { size: S }), y, dt, { size: S, ls: -0.02 * S, color: paper, stagger: B / 16, dur: B / 8 });
        if (unit) ZW.reveal(ctx, unit, x + w + 12, y, ZW.snap(dt - B / 4, B / 4), { size: 40, weight: 500, color: paper });
        ZW.reveal(ctx, label, x, y + 52, ZW.snap(dt - B / 4, B / 4), { size: 26, weight: 500, color: paper2 });
      });

      ZW.strip(ctx, env, { on: paper, off: rgba(paper, 0.16) });
    },
  };
})();
