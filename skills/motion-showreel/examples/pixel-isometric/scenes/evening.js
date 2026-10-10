// evening (1 bar, 2 in the 30): rain on Elm Street. The outside of the shop at night: the light field takes everything
// two stops down the dusk ramp, while the windows stay warm (the lit room behind them is lifted a stop) and the street
// lamp throws a warm pool on the wet pavement, its glow mirrored in the puddle. Rain falls in pale streaks, rings open
// in the puddle. The house sign lights letter by letter (beats 1 to 2.5, glow pixels with the caramel shadow), and the
// camera steps in to 6x on it. Halos sit on the lamp, the windows and the sign.
(() => {
  const D = DIO, I = D.I;
  const OX = 10, OY = 6, E = (x, y) => [OX + x, OY + y];
  const WINDOWS = [[E(200, 178), E(281, 186), E(281, 240), E(200, 232)], [E(325, 197), E(371, 199), E(371, 238), E(325, 236)],
    [E(292, 197), E(322, 197), E(322, 256), E(292, 256)], [E(400, 187), E(446, 185), E(446, 230), E(400, 232)]];
  const LAMP = E(156, 133), PUDDLE = E(312, 296), SIGN = { x: E(296, 0)[0], y: E(0, 146)[1], skew: 0.09 };
  function rain(b, n = 170) {
    for (let i = 0; i < n; i++) {
      const sp = 0.9 + D.hash(i) * 0.4, life = (b * sp * 1.4 + D.hash(i + 99)) % 1;
      const x = D.hash(i * 3.1) * 700 - 30 + life * -40, y = -20 + life * 400;
      for (let k = 0; k < 5; k++) D.px(x - k * 0.5, y - k, k < 2 ? I.sky : I.dusk);
    }
  }
  window.EVENING = (b, o = {}) => {
    D.target('world'); D.fill(I.dusk);
    for (let y = 0; y < D.AH; y++) for (let x = 0; x < D.AW; x++) if (D.TH[y * D.AW + x] < y / D.AH * 0.8) D.px(x, y, I.plum);
    D.layer('exterior', OX, OY);
    const n = o.letters ?? 13;
    D.text('Pebble & Bean', SIGN.x, SIGN.y, { align: 'c', skew: SIGN.skew, n, c: I.glow, shadow: I.caramel, em: true });
    D.ambient(-2);
    for (const P of WINDOWS) D.lightPoly(P, 3);
    D.lamp(LAMP[0], LAMP[1] + 30, 48, 2.3, { sy: 0.55 });
    D.lamp(LAMP[0], LAMP[1], 10, 2.5, { sy: 1 });
    D.shade();
    // the lamp mirrored in the puddle, rings, rain
    for (let k = 0; k < 7; k++) D.px(PUDDLE[0] - 10 + Math.round(Math.sin(b * 4 + k) * 1), PUDDLE[1] - 3 + k, k % 2 ? I.glow : I.peach);
    for (let k = 0; k < 3; k++) {
      const life = (b * 1.1 + k * 0.37) % 1, cx = PUDDLE[0] + (D.hash(k + Math.floor(b * 1.1 + k * 0.37)) - 0.5) * 30, rr = 1 + life * 7;
      for (let a = 0; a < 24; a++) D.px(cx + Math.cos(a / 24 * 6.283) * rr * 1.6, PUDDLE[1] + Math.sin(a / 24 * 6.283) * rr * 0.5, life < 0.6 ? I.sky : I.dusk);
    }
    rain(b);
    const halos = [{ x: LAMP[0], y: LAMP[1], r: 42, a: 0.32 }];
    for (const P of WINDOWS) { const cx = P.reduce((s, p) => s + p[0], 0) / 4, cy = P.reduce((s, p) => s + p[1], 0) / 4; halos.push({ x: cx, y: cy, r: 40, a: 0.16 }); }
    if (n > 0) halos.push({ x: SIGN.x, y: SIGN.y + 5, r: 18 + 4 * n, a: 0.12 + 0.012 * n });
    return halos;
  };
  window.EVENING_SIGN = SIGN;
  SCENES['evening'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4;
      const letters = Math.floor(D.span(b, 1, 2.5) * 13 + 1e-6);
      const halos = EVENING(b, { letters });
      const cam = b < 2 ? { s: 3, cx: 320, cy: 180 } : { s: 6, cx: SIGN.x, cy: SIGN.y + 16 };
      D.present(ctx, cam, halos);
    },
  };
})();
