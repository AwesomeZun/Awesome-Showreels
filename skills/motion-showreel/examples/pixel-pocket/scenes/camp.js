// camp (2 bars, the last scene): night at the lake. The dusk summit dissolves in dither order into the camp; the fire
// is a light in the light field whose radius flickers every step, so its dithered rings breathe over the ground and the
// tent; the hiker stands by it as a dark figure with the fire catching the edge that faces it; sparks rise and step
// down from paper to moss as they cool, stars blink, the tent's lantern switches on (beat 2). The day log types in:
// 12.4 km, +860 m, one summit, 9% battery. On beat 4 an iris closes onto the fire; the end card is the logo in reverse
// under a blinking night sky, the promise typing in, the fire as a small two-frame icon still burning under it, the
// fictional-app note, and one shooting star.
(() => {
  const P = POCKET, FIRE = [133, 101], TENT = [176, 94];
  const LOG = [['12.4 KM', 'WALKED'], ['+860 M', 'CLIMBED'], ['1', 'SUMMIT'], ['9%', 'BATTERY']];
  const FLAME = [
    ['....3....', '...33....', '...323...', '..3223.3.', '..32223..', '.3222223.', '1.11111.1', '.1.....1.'],
    ['....3....', '....33...', '...323...', '.3.3223..', '..32223..', '.3222223.', '1.11111.1', '.1.....1.'],
  ];
  const TAG = 'TRAIL MAPS THAT WORK WITHOUT SIGNAL';
  function paint(f, T, e) {
    const B = e.beatSec, b = T / B + 1e-4, st = Math.floor(T * P.STEP + 1e-6);
    if (b >= 5) {                                                        // ── the end card
      f.fill(0);
      for (let i = 0; i < 46; i++) {                                       // the night sky carries on behind the card
        const x = Math.floor(f.hash(i * 2.3 + 7) * 240), y = 2 + Math.floor(f.hash(i * 4.1 + 1) * 131);
        if (Math.abs(x - 120) < 76 && y > 16 && y < 112) continue;
        if (f.hash(i + st * 0.29) > 0.3) f.px(x, y, f.hash(i * 7.7) > 0.75 ? 2 : 1);
      }
      f.logo(120, 22, { k: 2, ink: 3, paper: 0, map: [3, 2, 1, 0] });
      f.textC(TAG, 120, 82, 2, 1, Math.floor(f.span(b, 5.4, 6.2) * TAG.length + 1e-6));
      if (b >= 6.2) { f.icon(FLAME[st % 2], 111, 96, { k: 2 }); f.textC('A FICTIONAL APP · DEMO CONTENT', 120, 122, 1); }
      const s = f.span(b, 6.6, 7.4);                                      // a shooting star crosses the corner
      if (s > 0 && s < 1) for (let k = 0; k < 6; k++) { const q = s - k * 0.035; if (q > 0) f.px(212 - 70 * q, 8 + 30 * q, k < 2 ? 3 : k < 4 ? 2 : 1); }
      return;
    }
    // ── the world
    f.layer('camp', -5, -3);
    for (let i = 0; i < 40; i++) {                                         // stars: a few blink each step
      const x = Math.floor(f.hash(i * 3.7) * 240), y = 2 + Math.floor(f.hash(i * 5.1 + 2) * 40);
      if (f.hash(i + st * 0.37) > 0.25) f.px(x, y, f.hash(i * 9.1) > 0.7 ? 3 : 2);
    }
    
    const fl = 0.85 + 0.3 * f.hash(st * 3.1 + 0.5);
    f.ambient(-0.55);
    f.lamp(FIRE[0], FIRE[1], 48 * fl, 1.45, { pow: 1.2, sy: 0.75 });
    if (b >= 2) f.lamp(TENT[0], TENT[1], 15, 1.6, { sy: 1.2 });
    f.shade();
    // the hiker as a dark figure against the fire, the edge that faces it caught by the light
    f.sprite('hiker_sheet', P.STAND, 110, 106, { outline: 0, map: [0, 0, 1, 1], rim: [1, fl > 1 ? 3 : 2] });
    for (let i = 0; i < 9; i++) {                                         // sparks: rise, drift, cool 3 -> 2 -> 1
      const life = ((T * 1.6 + f.hash(i) * 3) % 1.6) / 1.6, x = FIRE[0] + 2 + Math.round((f.hash(i + 9) - 0.5) * 10 + Math.sin(T * 3 + i) * 2 * life), y = FIRE[1] - 6 - Math.round(life * 34);
      f.px(x, y, life < 0.45 ? 3 : life < 0.8 ? 2 : 1);
    }
    f.hud({ time: '19:52', sig: 0, bat: 91, tag: 'OFFLINE', tagInv: true });
    // ── the day log
    if (f.winOpen(8, 14, 108, 52, f.span(b, 0.6, 0.9), [8, 14], { title: 'DAY LOG', titleN: 7 })) {
      LOG.forEach(([v, l], i) => {
        const r = f.span(b, 1 + i * 0.3, 1.25 + i * 0.3); if (r <= 0) return;
        const y = 28 + i * 9; f.textR(v, 52, y, 0); f.text(l, 57, y, 1, 1, Math.floor(r * l.length + 1e-6));
      });
    }
    // ── out: an iris closes onto the fire
    const c = f.span(b, 4, 5); if (c > 0) f.iris(FIRE[0], FIRE[1] - 2, 280 * (1 - c) * (1 - c), 0);
    // ── in: the dusk summit dissolves away in dither order
    const d = f.span(b, 0, 1); if (d < 1 && !e.prevOf) f.dissolve(f.prev(), d);
  }
  P.screens.camp = paint;
  SCENES['camp'] = { draw(ctx, t, env) { P.present(ctx, env, (f, T) => paint(f, T, env)); } };
})();
