// opening (1 bar, 2 in the 30; the end card): the camera steps back to the whole corner in the rain, sign lit, and a
// card rises in whole steps: Pebble & Bean in double-size type, then on the half beats the opening (Saturday, 8 am), the
// address (14 Elm Street, by the bakery) and the offer (the first 50 cups are on us). The rain keeps falling and the
// windows keep glowing on the hold; a line at the foot says the shop is fictional.
(() => {
  const D = DIO, I = D.I;
  const LINES = [['14 Elm Street, by the bakery', I.espresso], ['The first 50 cups are on us', I.brick]];
  SCENES['opening'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4;
      const halos = EVENING(b + 8, { letters: 13 });
      D.target('ui');
      const k = D.span(b, 0, 0.5), y = Math.round(216 - 176 * (1 - (1 - k) * (1 - k)));
      if (k > 0) {
        D.win(56, y, 272, 134);
        D.text('Pebble & Bean', 192, y + 11, { x2: true, align: 'c', c: I.espresso, shadow: I.caramel });
        for (let i = 96; i < 288; i += 3) D.px(i, y + 41, I.latte);
        if (b >= 0.5) D.text('Opening Saturday, 8 am', 192, y + 50, { align: 'c', c: I.brick, shadow: I.peach, n: D.span(b, 0.5, 0.9) * 22 });
        LINES.forEach(([s, c], i) => { if (b >= 1 + i * 0.5) D.text(s, 192, y + 72 + i * 15, { align: 'c', c, shadow: null, n: D.span(b, 1 + i * 0.5, 1.4 + i * 0.5) * s.length }); });
        if (b >= 2) D.text('A fictional shop made for this example', 192, y + 112, { align: 'c', c: I.caramel, shadow: null });
      }
      D.present(ctx, { s: 3, cx: 320, cy: 180 }, halos);
    },
  };
})();
