// surface (1 bar in the 15, 2 in the 30 and 60): the light gets out. The camera pulls back from the Sun's edge to the
// whole Sun: halo rings, banded body, drifting granulation, sunspots, prominences arching off the limb. A pill names
// the surface, about 5,500 °C; in the longer cuts a line says that from here the light is free. In the last beats the
// light launches off the right edge of the Sun with a streak.
(() => {
  const { C } = FV;
  const X = 820, Y = 560, R = 330, A = -0.32, LX = X + Math.cos(A) * R, LY = Y + Math.sin(A) * R;
  SCENES['surface'] = {
    X, Y, R,
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, n = Math.round(env.dur / B), X2 = Math.max(0, n - 4), bo = b - X2;
      const z = 1 + 2.4 * (1 - Ease.ioC(clamp(b / 2.0))) + 0.01 * b;
      FV.space(ctx, { t });
      FV.zoom(ctx, LX, LY, z, () => FV.sun(ctx, X, Y, R, t));
      // the light: at the edge, then launched
      const go = Ease.inC(clamp((bo - 2.2) / 1.6)), px = FV.lerp(LX + 30, W + 200, go), py = FV.lerp(LY - 10, LY - 120, go);
      if (go > 0) FV.streak(ctx, Math.max(LX, px - 600 * go - 40), py + 40 * go, px, py, '#FFF2C4', 14, 0.8);
      FV.photon(ctx, px, py, 1.2, t);
      FV.pill(ctx, 'The surface · about 5,500 °C', 1290, 230, clamp((b - 1.3) / 0.6) * (1 - clamp((bo - 2.6) / 0.4)), { size: 30, to: [X + Math.cos(-0.9) * R * 0.98, Y + Math.sin(-0.9) * R * 0.98] });
      if (X2) FV.caption(ctx, 'From here, the light is free.', clamp((b - 2.4) / 1.2), { a: 1 - clamp((bo - 2.6) / 0.4) });
    },
  };
})();
