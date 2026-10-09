// street (1 bar, 2 in the 30): Elm Street at dusk. The shop between the bakery and a house, trees and lamp posts;
// the palette swaps to its evening ramp a step per beat, the shop's windows glow first, then the neighbours', the
// lamps come on, two people walk along the pavement, and once it is dark string lights chase along the shop's roof edge.
(() => {
  SCENES['street'] = {
    draw(ctx, t, env) {
      const K = window.BEAN;
      K.present(ctx, env, (g, T, b) => {
        K.setDusk(b * 1.2);
        K.rect(g, 0, 0, K.GW, K.GH, 'sky');
        const cam = { ox: 150, oy: 34, S: 1 };
        for (let gx = -6; gx < 16; gx++) for (let gy = 4; gy < 7; gy++) K.top(g, cam, gx, gy, 0, gy === 5 ? 'latte' : 'sage');
        const lit = (start) => (i, s) => b > start + (i + s) * 0.3;
        SHOP.exterior(g, cam, -5, 0, 4, 3, 30, { roof: 'plum', wall: 'peach', wall2: 'rose', lit: lit(2.2), door: true });
        SHOP.exterior(g, cam, 0, 0, 5, 3, 30, { roof: 'brick', wall: 'cream', wall2: 'latte', lit: lit(1.2), door: true, awning: true });
        SHOP.exterior(g, cam, 6, 0, 3, 3, 44, { roof: 'dusk', wall: 'mint', wall2: 'sage', lit: lit(2.6) });
        const [sx, sy] = K.iso(cam, 0, 3, 34); K.text(g, 'PEBBLE & BEAN', sx + 6, sy - 4, 'espresso', 1, Infinity, true);
        for (const x of [-2, 5.5, 10]) {                                       // lamp posts
          const [lx, ly] = K.iso(cam, x, 4.2, 0); K.rect(g, lx, ly - 22, 1, 22, 'ink'); K.rect(g, lx - 2, ly - 25, 5, 3, b > 2.4 ? 'glow' : 'ink');
        }
        if (b > 3) for (let i = 0; i <= 20; i++) {                                // string lights along the shop's roof edge, chasing
          const [lx, ly] = K.iso(cam, i / 4, 3, 31); K.rect(g, lx, ly + 1, 1, 1, (i + Math.floor(T * 8)) % 4 === 0 ? 'glow' : 'peach');
        }
        for (let k = 0; k < 2; k++) { const u = ((T * 0.2 + k * 0.5) % 1), [px, py] = K.iso(cam, -5 + u * 16, 5.4, 12); K.person(g, px, py, Math.floor(T * 4) % 2, k ? 'sage' : 'plum', k ? 'espresso' : 'ink', 1, false); }
      });
    },
  };
})();
