// summit (2 bars, up to 3 in the 30; the end card): Pika Point. A dithered sun rises behind a big ridge (lit face in
// lichen, shade in moss); the hiker climbs the last switchbacks a pixel at a time (beats 0-2), the flag goes in and a
// SUMMIT! stamp lands on beat 2; the summit name and height type on (3); the end card: wordmark, promise and the
// fictional-app note (4). Hold: the flag waves in two frames, clouds pass below the summit, the sun's rays blink, CHECK-IN SAVED blinks on every other beat.
(() => {
  const FLAG = [['0222', '0222', '0...', '0...', '0...'], ['022.', '0222', '0...', '0...', '0...']];
  SCENES['summit'] = {
    draw(ctx, t, env) {
      const P = window.POCKET;
      P.present(ctx, env, (g, T, b) => {
        P.cls(g, 3);
        // the sun, rising until beat 2
        const sy = Math.max(34, 70 - Math.floor(T * P.STEP * 0.8));
        for (let y = -14; y <= 14; y++) for (let x = -14; x <= 14; x++) { const d = Math.hypot(x, y); if (d < 14) P.px(g, 120 + x, sy + y, d < 9 || P.dith(x + 120, y + sy, (14 - d) / 5) ? 2 : 3); }
        if (b > 4 && Math.floor(b * 2) % 2 === 0) for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; P.px(g, 120 + Math.cos(a) * 18, sy + Math.sin(a) * 18, 2); }
        // the ridge
        const peak = [120, 44];
        P.poly(g, [[0, 135], [0, 104], [60, 82], [peak[0], peak[1]], [176, 78], [240, 98], [240, 135]], 1, (x, y) => (x < peak[0] + (y - peak[1]) * 0.15 ? (P.dith(x, y, 0.25) ? 1 : 2) : (P.dith(x, y, 0.2) ? 0 : 1)));
        // clouds below the summit in the hold
        if (b > 4.5) for (let k = 0; k < 3; k++) { const cx = ((T * 16 + k * 100) % 330) - 70; P.dither(g, cx, 84 + k * 7, 40, 6, 3, 2, 0.6); P.dither(g, cx + 8, 81 + k * 7, 22, 3, 3, 2, 0.6); }
        // the climb: along the slope from (64, 82) to the peak
        const u = Math.min(1, T / (2 * env.beatSec)), hx = Math.round(70 + (peak[0] - 74) * u), hy = Math.round(80 + (peak[1] - 80) * u) - 12;
        P.hiker(g, hx, hy, T, u >= 1);
        if (b >= 2) P.sprite(g, FLAG[Math.floor(T * 4.5) % 2], peak[0] + 4, peak[1] - 5);
        // stamp, name, end card
        if (b >= 2 && b < 4) { P.box(g, 150, 20, 70, 18); P.textC(g, 'SUMMIT!', 185, 26, 0); }
        if (b >= 3 && b < 4) { P.textC(g, 'PIKA POINT  1,847 M', 120, 118, 0, 1, Math.floor((b - 3) * 40)); }
        if (b >= 4) {
          P.box(g, 30, 100, 180, 31);
          P.textC(g, 'RIDGELINE POCKET', 120, 104, 0, 1);
          P.textC(g, 'TRAIL MAPS THAT WORK WITHOUT SIGNAL', 120, 113, 1, 1, Math.floor((b - 4) * 40));
          if (b >= 5) P.textC(g, 'FICTIONAL APP ` DEMO DATA', 120, 122, 2, 1);
          if (b >= 6 && Math.floor(b) % 2 === 0) { P.box(g, 6, 6, 98, 13); P.text(g, 'CHECK-IN SAVED *', 10, 9, 0); }
        }
      });
    },
  };
})();
