// latte (1 bar, the 30 only): the flat white from above, at 6x, on the counter with a plant and a napkin. A stream of
// milk falls into the crema and a white disc opens where it lands, rings running out across the surface; on beat 2 the
// jug moves forward and the disc becomes a heart (the shape eases from a circle to the heart curve); on beat 2.6 the
// stream pulls through it and cuts the cleft. Every pixel is one of the 16 pastels: cream foam, a sand edge, caramel
// crema. The tag types in on beat 3.
(() => {
  const D = DIO, I = D.I;
  const OX = 160, OY = 90, C = [OX + 160, OY + 82], RC = 32;          // the photo fills the 6x view; the crema's centre and radius
  // signed distance-ish for a heart of size s centred at (0,0), y down: negative inside
  const heart = (x, y, s) => { const X = x / s, Y = -y / s + 0.25; const q = (X * X + Y * Y - 1) ** 3 - X * X * Y * Y * Y; return q; };
  SCENES['latte'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4;
      D.target('world'); D.fill(I.latte); D.layer('latte_wide', OX, OY);
      // the milk
      const grow = D.span(b, 0.4, 1.9), morph = D.span(b, 1.9, 2.6), pull = D.span(b, 2.6, 2.95);
      const cy = C[1] - 5 + 9 * morph, r = 3 + 17 * Math.sqrt(grow);
      for (let y = C[1] - RC; y <= C[1] + RC; y++) for (let x = C[0] - RC; x <= C[0] + RC; x++) {
        if ((x - C[0]) ** 2 + (y - C[1]) ** 2 > (RC - 1.5) ** 2) continue;
        const dx = x - C[0], dy = y - cy;
        const disc = Math.hypot(dx, dy) - r, h = heart(dx, dy, r * 0.78);
        const inside = grow > 0 && (morph < 1 ? (1 - morph) * disc + morph * (h > 0 ? 2 : -2) * Math.min(1, Math.abs(h) * 3) < 0 : h < 0);
        const edge = grow > 0 && !inside && (morph < 1 ? (1 - morph) * disc + morph * (h > 0 ? 2 : -2) * Math.min(1, Math.abs(h) * 3) < 1.2 : h < 0.12);
        if (inside) D.px(x, y, I.cream); else if (edge) D.px(x, y, I.sand);
      }
      // rings while the milk falls
      if (b > 0.5 && b < 2.6) for (let k = 0; k < 3; k++) {
        const life = (b * 1.5 + k / 3) % 1, rr = r + 3 + life * 9;
        for (let a = 0; a < 64; a++) { const x = C[0] + Math.cos(a / 64 * 6.283) * rr, y = cy + Math.sin(a / 64 * 6.283) * rr * 0.92; if ((x - C[0]) ** 2 + (y - C[1]) ** 2 < (RC - 2) ** 2 && D.hash(a + k * 7) > 0.45 + life * 0.4) D.px(x, y, I.peach); }
      }
      // the pull-through: the cleft, top to tip
      if (pull > 0) for (let y = Math.round(cy - r * 0.9); y < cy - r * 0.9 + r * 1.9 * pull; y++) D.px(C[0], y, I.sand);
      // the stream from the jug
      if (b > 0.25 && b < 2.95) {
        const sx = pull > 0 ? C[0] : C[0] + Math.round(Math.sin(b * 9) * 0.6), sy = pull > 0 ? cy - r * 0.9 + r * 1.9 * pull : cy;
        for (let y = OY; y < sy; y++) { D.px(sx, y, I.cream); D.px(sx + 1, y, I.sand); D.px(sx - 1, y, I.sand); }
      }
      // steam once it rests
      if (b > 3) for (let i = 0; i < 10; i++) { const life = (b * 0.7 + i / 10) % 1; D.px(C[0] - 12 + i * 3 + Math.sin(life * 6 + i) * 2, C[1] - RC - 6 - life * 22, life < 0.5 ? I.cream : I.sand); }
      D.target('ui');
      const k = D.span(b, 3, 3.3);
      if (k > 0) { const x = Math.round(-100 + 110 * k); D.win(x, 178, 92, 26); D.text('Flat white', x + 8, 183); D.text('4.5', x + 84, 183, { c: I.brick, shadow: null, align: 'r' }); }
      D.present(ctx, { s: 6, cx: 320, cy: 180 });
    },
  };
})();
