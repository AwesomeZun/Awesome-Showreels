// boot (2 bars, 3 in the 30): the handheld powers on. Two steps of dark glass, then the paper-green screen; the
// RIDGELINE wordmark scrolls down one pixel per step (beats 0-3) and stops with a chime on beat 3, a pixel ridge
// icon blinks in above it, POCKET types under it one letter per step (4), the promise types in small (5), and
// PRESS START blinks on the half beat from beat 6. 30-s hold: tiny clouds drift across, PRESS START keeps blinking.
(() => {
  SCENES['boot'] = {
    draw(ctx, t, env) {
      const P = window.POCKET;
      P.present(ctx, env, (g, T, b) => {
        if (T < 2 / P.STEP) { P.cls(g, 0); return; }                      // the glass before the LCD wakes
        P.cls(g, 3);
        if (b > 4) for (let k = 0; k < 3; k++) {                             // clouds, one pixel per step
          const cx = ((T * 6 + k * 90) % 300) - 40, cy = 18 + k * 9;
          P.dither(g, cx, cy, 22, 4, 3, 2, 0.5); P.dither(g, cx + 5, cy - 2, 12, 2, 3, 2, 0.5);
        }
        const yLogo = Math.min(46, -16 + Math.floor(T * P.STEP));        // 1 px per step, stops at 46
        P.textC(g, 'RIDGELINE', 120, yLogo, 0, 3);
        if (b >= 3 && (b < 3.4 || b >= 3.6)) {                              // the ridge icon, blinks in on beat 3
          P.poly(g, [[104, 38], [114, 26], [120, 32], [126, 24], [136, 38]], 1);
          P.poly(g, [[123, 27], [126, 24], [129, 28], [126, 27]], 3);
        }
        if (b >= 4) P.textC(g, 'POCKET', 120, 72, 1, 2, Math.floor((b - 4) * 5) + 1);
        if (b >= 5) {
          const n = Math.floor((b - 5) * 20);
          P.textC(g, 'TRAIL MAPS THAT WORK', 120, 92, 1, 1, n);
          P.textC(g, 'WITHOUT SIGNAL', 120, 101, 1, 1, Math.max(0, n - 20));
        }
        if (b >= 6 && Math.floor(b * 2) % 2 === 0) P.textC(g, 'PRESS START', 120, 118, 0, 1);
      });
    },
  };
})();
