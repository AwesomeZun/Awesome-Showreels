// trail (2 bars, 3 in the 30): dawn at the trailhead. START is pressed and the boot screen dissolves, in dither order,
// into a dark valley; the light comes up in tone steps (the light field rises from -1.6 to 0 and the sun lights the far
// peaks in dithered rings). The hiker walks in to the signpost, the status bar slides down (05:48, full signal, 100%),
// and the trail card opens out of the sign: distance, climb, time and water count in row by row, then the turn people
// miss, with a blinking warning. Birds cross the sky in the hold, the sun ring breathes on the beat. In the 30 the card
// folds back into the sign and the hiker walks on (the forest pushes this screen away).
(() => {
  const P = POCKET, FEET = 118, SIGN = [48, 66], SPEED = 28;
  const CARD = { x: 102, y: 14, w: 132, h: 86 };
  const ROWS = [['path', 'DISTANCE', '12.4 KM'], ['up', 'CLIMB', '+860 M'], ['clock', 'TIME', '4H30'], ['drop', 'WATER', '3.4 KM']];
  const BIRD = [['0...0', '.0.0.'], ['.....', '00000'], ['.000.', '0...0']];
  // a value counting in: digits roll for a few steps, then settle
  const roll = (f, s, k, seed) => (k >= 1 ? s : s.replace(/[0-9]/g, (d, i) => String(Math.floor(f.hash(seed + i * 7.3 + Math.floor(k * 9)) * 10))));
  function hiker(b, D, B) {
    const close = D >= 9 ? D - 1.3 : 1e9;
    if (b < 0.6) return { x: 26, fr: P.STAND };
    if (b < 2.8) return { x: Math.round(26 + 36 * (b - 0.6) / 2.2), fr: 'walk' };
    if (b < close) return { x: 62, fr: P.STAND };
    return { x: Math.round(62 + (b - close) * B * SPEED), fr: 'walk' };
  }
  function paint(f, T, e) {
    const B = e.beatSec, b = T / B + 1e-4, D = e.dur / B;
    // ── the world, lit by the dawn
    f.layer('dawn_far', -15, -2);
    if (b > 3) for (let i = 0; i < 3; i++) {                              // birds, one pixel per step
      const bx = Math.round(-8 + (T - 3 * B - i * 0.5) * (13 + i * 3)), by = 20 + i * 6 + (Math.floor(T * 3 + i) % 2);
      if (bx > -6 && bx < 246) f.icon(BIRD[(Math.floor(T * P.STEP) + i) % 3], bx, by);
    }
    f.layer('trailhead', -3, -3);
    const h = hiker(b, D, B);
    if (e.prevOf !== 'forest') f.sprite('hiker_sheet', h.fr === 'walk' ? P.walkFrame(T) : h.fr, h.x, FEET);
    const dawn = f.span(b, 0, 3.5), pulse = b > 4 ? 0.22 * Math.max(0, 1 - (b % 1) * 2.5) : 0;
    f.ambient(-1.6 * (1 - dawn));
    f.lamp(126, 9, 96, 1.25 * f.span(b, 0.4, 3.5) + pulse, { pow: 1.5 });
    f.shade();
    // ── the status bar
    f.hud({ y: -9 + 9 * f.span(b, 1, 1.6), time: '05:48', sig: 4, bat: 100 });
    // ── the trail card, out of the signpost
    const closeAt = D >= 9 ? D - 1.7 : 1e9;
    const k = Math.min(f.span(b, 3, 3.6), 1 - f.span(b, closeAt, closeAt + 0.4));
    const open = f.winOpen(CARD.x, CARD.y, CARD.w, CARD.h, k, SIGN, { title: 'GRANITE SADDLE LOOP', titleN: Math.floor(f.span(b, 3.6, 4) * 19 + 1e-6) });
    if (open && b < closeAt) {
      ROWS.forEach(([ic, label, val], i) => {
        const r = f.span(b, 3.8 + i * 0.4, 4.1 + i * 0.4); if (r <= 0) return;
        const y = CARD.y + 16 + i * 11;
        f.icon(f.ICON[ic], CARD.x + 6, y); f.text(label, CARD.x + 15, y, 1);
        f.textR(roll(f, val, r, i * 13), CARD.x + CARD.w - 6, y, 0);
      });
      if (b >= 6) {
        for (let x = CARD.x + 6; x < CARD.x + CARD.w - 6; x += 2) f.px(x, CARD.y + 61, 2);
        if (b < 6.4 || b % 1 < 0.6) f.icon(f.ICON.warn, CARD.x + 6, CARD.y + 65);
        f.text('TURN LEFT AT 7.9 KM', CARD.x + 15, CARD.y + 65, 0, 1, Math.floor(f.span(b, 6, 6.4) * 19 + 1e-6));
        if (b >= 6.4) f.text('EASY TO MISS', CARD.x + 15, CARD.y + 75, 1);
      }
    }
    // ── in: START pressed, the boot screen dissolves away in dither order
    const d = f.span(b, 0, 0.9); if (d < 1 && !e.prevOf) f.dissolve(f.prev(), d);
  }
  P.screens.trail = paint;
  P.trailHiker = (e) => hiker(e.dur / e.beatSec, e.dur / e.beatSec, e.beatSec);
  SCENES['trail'] = { draw(ctx, t, env) { P.present(ctx, env, (f, T) => paint(f, T, env)); } };
})();
