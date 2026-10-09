// summit (2 bars, 3 in the 30): above the clouds. An iris opens from the map's summit flag onto a screen full of cloud;
// the cloud banks sink away in whole steps and the hiker climbs out of them onto the summit rocks (a paper rim keeps
// the dark sprite readable on dark rock) while the sun lights the cloud sea in dithered rings that breathe on the beat.
// SUMMIT! is stamped on beat 3 (one oversized step, then it settles), PIKA POINT 1,847 M under it, and the check-in
// types in: saved offline, syncs in range. Out: the windows fold, the clock runs to 19:52, the battery to 91%, and the
// light field falls to -2.2, so the summit goes to dusk tone by tone (the camp opens out of it).
(() => {
  const P = POCKET, SUN = [215, 44];
  const STAMP = { x: 122, y: 16, w: 112, h: 44 }, CHECK = { x: 122, y: 64, w: 112, h: 30 };
  const clock = (k, f, T) => {                                            // 08:37 -> 19:52, digits rolling
    if (k <= 0) return '08:37'; if (k >= 1) return '19:52';
    const m = Math.round(8 * 60 + 37 + k * (11 * 60 + 15)); return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  };
  function paint(f, T, e) {
    const B = e.beatSec, b = T / B + 1e-4, D = e.dur / B;
    const dusk = f.span(b, D - 1.8, D);
    // ── the world
    f.layer('summit', -5, -3);
    const climb = f.span(b, 1, 2.2), hy = Math.round(122 - 42 * climb), hx = Math.round(80 + 8 * climb);
    f.sprite('hiker_sheet', climb > 0 && climb < 1 ? P.walkFrame(T) : P.STAND, hx, hy, { outline: 3 });
    const sink = f.span(b, 0.6, 2.6), cy = Math.round(-80 + 150 * sink);
    if (cy < 135) { f.layer('cloud_sea', -2, cy); f.layer('cloud_sea', -8, cy + 58); }
    const pulse = b > 3 && dusk === 0 ? 0.25 * Math.max(0, 1 - (b % 1) * 2.5) : 0;
    f.ambient(-2.2 * dusk);
    f.lamp(SUN[0], SUN[1] + 30 * dusk, 76, (1.1 + pulse) * (1 - dusk * 0.8), { pow: 1.3 });
    f.shade();
    // ── the stamp and the check-in
    const fold = f.span(b, D - 2.3, D - 1.9), stamped = b >= 3 && fold < 1;
    if (stamped) {
      const first = b < 3.2, s = first ? 3 : 0, x = STAMP.x - s + (first ? 2 : 0), y = STAMP.y - s, w = (STAMP.w + 2 * s) * (1 - fold), h = (STAMP.h + 2 * s) * (1 - fold);
      if (w > 6 && h > 6) {
        f.rect(x + 2, y + 2, w, h, 1); f.rect(x, y, w, h, 0); f.rect(x + 2, y + 2, w - 4, h - 4, 3); f.frame(x + 3, y + 3, w - 6, h - 6, 0);
        if (fold === 0) {
          f.textC('SUMMIT!', x + w / 2, y + 8, 0, 2);
          f.textC('PIKA POINT', x + w / 2, y + 25, 1); f.textC('1,847 M', x + w / 2, y + 34, 0);
        }
      }
    }
    if (b >= 3.6 && fold < 1) {
      if (f.winOpen(CHECK.x, CHECK.y, CHECK.w, CHECK.h * (1 - fold), f.span(b, 3.6, 3.8)) && fold === 0 && b >= 4) {
        f.icon(f.ICON.check, CHECK.x + 6, CHECK.y + 7); f.text('SAVED OFFLINE', CHECK.x + 15, CHECK.y + 5, 0, 1, Math.floor(f.span(b, 4, 4.4) * 13 + 1e-6));
        if (b >= 4.4) { f.icon(f.ICON.sync, CHECK.x + 6, CHECK.y + 17); f.text('SYNCS IN RANGE', CHECK.x + 15, CHECK.y + 16, 1, 1, Math.floor(f.span(b, 4.4, 4.8) * 14 + 1e-6)); }
      }
    }
    // ── the status bar: the day runs on
    const run = f.span(b, D - 1.8, D - 0.4);
    f.hud({ time: clock(run, f, T), sig: 0, bat: Math.round(97 - 6 * run), tag: 'OFFLINE', tagInv: true });
    // ── in: an iris from the map's summit flag
    const r = f.span(b, 0, 1);
    if (r < 1 && !e.prevOf) { const [fx, fy] = P.mapFlag || [139, 28]; f.iris(fx, fy, 4 + 280 * r * r, f.prev()); }
  }
  P.screens.summit = paint;
  SCENES['summit'] = { draw(ctx, t, env) { P.present(ctx, env, (f, T) => paint(f, T, env)); } };
})();
