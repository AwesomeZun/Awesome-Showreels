// boot (1 bar, 2 in the 30): the handheld powers on. The glass wakes one tone per step, shadow to paper; the logo (the
// two-peak mark, RIDGELINE, the POCKET tag) drops in whole-pixel steps and lands with a ding on beat 2, a glint crosses
// it, and the promise types itself in. In the 30 PRESS START blinks on the beat and is pressed on the last beat; the
// trail scene dissolves out of this screen.
(() => {
  const P = POCKET, TAG = 'TRAIL MAPS THAT WORK WITHOUT SIGNAL';
  function paint(f, T, e) {
    const b = T / e.beatSec + 1e-4, D = e.dur / e.beatSec;
    if (b < 0.6) { f.fill(Math.min(3, Math.floor(b / 0.2 + 1e-6))); return; }   // the LCD wakes a tone per step
    f.fill(3);
    const y = Math.round(-46 + 72 * f.span(b, 0.6, 2));                   // lands at y 26 on beat 2
    const box = f.logo(120, y, { k: 2 });
    const g = f.span(b, 2, 2.7);                                          // the glint after the landing
    if (g > 0 && g < 1) {
      const gx = box.x0 - 24 + (box.x1 - box.x0 + 48) * g;
      for (let yy = box.y0; yy < box.y1; yy++) for (let xx = box.x0 - 16; xx < box.x1 + 16; xx++) {
        const d = xx + (yy - box.y0) * 0.6 - gx;
        if (d >= 0 && d < 5 && f.get(xx, yy) === 0) f.px(xx, yy, 2);
      }
    }
    f.textC(TAG, 120, 86, 1, 1, Math.floor(f.span(b, 2.6, 3.6) * TAG.length + 1e-6));
    if (D >= 6 && b >= 4.4) {                                             // the 30: PRESS START
      const pressed = b >= D - 0.8;
      if (pressed) { const w = f.textW('PRESS START') + 8; f.rect(120 - w / 2, 104, w, 11, 0); f.textC('PRESS START', 120, 106, 3); }
      else if (b % 1 < 0.6) f.textC('PRESS START', 120, 106, 0);
    }
  }
  P.screens.boot = paint;
  SCENES['boot'] = { draw(ctx, t, env) { P.present(ctx, env, (f, T) => paint(f, T, env)); } };
})();
