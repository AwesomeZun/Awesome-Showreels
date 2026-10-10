// day (2 bars): open for business, everything happening at once like a cosy building game. The barista waves from
// behind the counter, then tamps and pours on the beats; a customer in a sage sweater walks in from the door to the
// counter; one in a plum coat sips at the table; the cat sits on the rug and stretches on beat 4; the roaster's drum
// turns its beans and smokes, cups steam in single pixels. The camera steps in on whole-number scales (4x, 5x on beat
// 2, 6x on beat 5, onto the counter and the roaster) and drifts a whole art pixel at a time between the steps. The menu
// card slides in on beat 2 with its four prices, and a note points at the roaster: roasted here, 7 to 9 every morning.
(() => {
  const D = DIO, I = D.I, R = ROOM;
  const MENU = [['Flat white', '4.5'], ['House filter', '3.0'], ['Cardamom bun', '3.5'], ['Beans, 250 g', '12']];
  const lerp = (a, c, k) => [a[0] + (c[0] - a[0]) * k, a[1] + (c[1] - a[1]) * k];
  function steam(x, y, b, seed) {                                     // a wisp: pixels rising and swaying, sand then cream
    for (let i = 0; i < 6; i++) {
      const life = ((b * 0.9 + seed * 0.37 + i / 6) % 1), yy = y - life * 16, xx = x + Math.sin(life * 6 + seed + i) * 1.6;
      if (D.hash(i + seed) > 0.2) D.px(xx, yy, life < 0.5 ? I.cream : I.sand);
    }
  }
  window.DAYSCENE = (b, o = {}) => {                                   // the busy shop at beat b (also used by the evening)
    const st = D.step(b), placed = UNPACKED(99);
    const people = [];
    const bar = R.fp(0.2, 0.6);
    const bFrame = b < 1 ? 3 : [0, 1, 1, 2, 2, 0][Math.floor(b * 2) % 6];
    people.push({ sprite: 'barista_' + bFrame, x: bar[0], y: bar[1] });
    const walk = D.span(b, 0.5, 3.2), from = R.fp(0.84, 0.02), to = R.fp(0.66, 0.46), p = lerp(from, to, walk);
    people.push({ sprite: walk > 0 && walk < 1 ? 'walk_r_' + (st % 4) : 'walk_r_0', x: p[0], y: p[1] });
    const seat = R.fp(0.95, 0.64);
    people.push({ sprite: 'misc_0', x: seat[0], y: seat[1], dz: 0.6 });
    const rug = R.fp(0.55, 0.52), cat = { sprite: b >= 4 && b < 5 ? 'misc_3' : 'misc_2', x: rug[0], y: rug[1] };
    R.draw(b, { placed, people, cat, sign: 13, signLit: o.signLit });
    // the roaster's drum turning its beans, and its smoke
    const ro = R.AT.roaster, drum = [ro[0] - 2, ro[1] - 30];
    for (let k = 0; k < 5; k++) { const a = b * 2.2 + k * 1.25; D.px(drum[0] + Math.cos(a) * 5, drum[1] + Math.sin(a) * 3, k % 2 ? I.espresso : I.brick); }
    steam(ro[0] + 8, ro[1] - 78, b, 1); steam(ro[0] + 11, ro[1] - 76, b + 0.4, 2);
    steam(R.AT.espresso[0] + 4, R.AT.espresso[1] - 46, b, 3);
    steam(seat[0] + 10, seat[1] - 46, b, 4);
  };
  SCENES['day'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4;
      D.target('world'); D.fill(I.cream); BACKDROP(b);
      DAYSCENE(b);
      D.shade();
      // the note at the roaster
      if (b >= 5.5) {
        const ro = R.AT.roaster, x = ro[0] - 70, y = ro[1] - 112, n = Math.floor(D.span(b, 5.5, 6.3) * 30 + 1e-6);
        D.win(x, y, 96, 26); D.text('Roasted here', x + 6, y + 3, { n }); D.text('7-9 every morning', x + 6, y + 13, { c: I.caramel, shadow: null, n: n - 12 });
        D.line(x + 70, y + 25, ro[0] - 6, ro[1] - 86, I.caramel);
      }
      // the menu card, fixed on screen
      D.target('ui');
      const k = D.span(b, 2, 2.5);
      if (k > 0) {
        const x = Math.round(384 - 128 * k);
        D.win(x, 46, 118, 86); D.text('Menu', x + 8, 51, { c: I.espresso });
        MENU.forEach(([name, price], i) => {
          if (b < 2.5 + i * 0.5) return;
          D.text(name, x + 8, 68 + i * 14, { c: I.espresso, shadow: null }); D.text(price, x + 110, 68 + i * 14, { c: I.brick, shadow: null, align: 'r' });
        });
      }
      const cam = b < 2 ? { s: 4, cx: 320 - 3 * b, cy: 186 } : b < 5 ? { s: 5, cx: 304 - 5 * (b - 2), cy: 190 } : { s: 6, cx: 256 - 4 * (b - 5), cy: 175 };
      D.present(ctx, cam);
    },
  };
})();
