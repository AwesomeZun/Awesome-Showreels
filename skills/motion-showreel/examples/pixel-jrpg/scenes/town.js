// town (2 bars, 3 in the 30): a town square in three-quarter view (cobbles, roofs, a fountain, lanterns that flicker).
// The hero walks in from the left in two-frame steps and stops by the innkeeper; on beat 2 the dialog window opens
// (a stepped grow) with the innkeeper's portrait and the release news types on, a page per two beats, the blinking
// arrow waiting for the button. 30-s hold: the second page, a lantern lighting up with the new dynamic lights.
(() => {
  const PAGES = [['INNKEEPER', 'Traveller! Lanternforge 2.0 has arrived.', 'Tilemaps, lights and saves, all in one engine.'],
                 ['INNKEEPER', 'Change a map and see it in under a second.', 'They call it hot reload. Strange magic.']];
  SCENES['town'] = {
    draw(ctx, t, env) {
      const L = window.LF;
      L.present(ctx, env, (g, T, b) => {
        // cobbles and grass
        for (let y = 0; y < L.GH; y += 8) for (let x = 0; x < L.GW; x += 8) L.rect(g, x, y, 8, 8, (x / 8 + y / 8) % 2 ? 'grass' : 'leaf');
        for (let y = 96; y < 168; y += 6) for (let x = (y / 6) % 2 ? 3 : 0; x < L.GW; x += 12) { L.rect(g, x, y, 11, 5, 'stone'); L.rect(g, x, y, 11, 1, 'slate'); }
        // houses with roofs and windows (the windows light from beat 4 in the hold: dynamic lights)
        for (const [hx, roof] of [[20, 'crimson'], [130, 'royal'], [250, 'rust']]) {
          L.rect(g, hx, 40, 96, 48, 'bone'); L.rect(g, hx, 84, 96, 4, 'sand');
          L.poly(g, [[hx - 8, 42], [hx + 48, 12], [hx + 104, 42]], roof); L.rect(g, hx - 8, 42, 112, 2, 'ink');
          for (const wx of [hx + 14, hx + 66]) { L.rect(g, wx, 54, 16, 14, 'ink'); L.rect(g, wx + 1, 55, 14, 12, b > 8 ? 'gold' : 'navy'); L.rect(g, wx + 7, 55, 1, 12, 'ink'); }
          L.rect(g, hx + 40, 62, 16, 26, 'bark'); L.rect(g, hx + 52, 74, 2, 2, 'gold');
        }
        // fountain
        L.rect(g, 168, 116, 48, 18, 'slate'); L.rect(g, 170, 118, 44, 12, 'azure');
        for (let i = 0; i < 6; i++) { const a = (T * 2 + i / 6) % 1; L.rect(g, 191 + Math.round(Math.sin(i * 1.7) * 8 * a), 112 - Math.round(Math.sin(a * Math.PI) * 14), 2, 2, 'ice'); }
        // lanterns on posts, flickering on the step clock
        for (const lx of [110, 236, 350]) { L.rect(g, lx, 100, 2, 34, 'ink'); L.rect(g, lx - 3, 94, 8, 8, 'ink'); L.rect(g, lx - 2, 95, 6, 6, (Math.floor(T * 10) + lx) % 3 ? 'gold' : 'amber'); }
        // the hero walks in and stops; the innkeeper waits
        const hx = Math.min(140, -20 + Math.floor(T * 60)), walking = hx < 140;
        L.hero(g, hx, 128, walking ? Math.floor(T * 5) : 0, 'hero', 1);
        L.hero(g, 164, 126, Math.floor(T * 2), 'knight', -1);
        // dialog
        if (b >= 2) {
          const grow = Math.min(1, (b - 2) * 4), h = Math.round(64 * grow);
          L.win(g, 12, 212 - h - 2, 360, h);
          if (grow >= 1) {
            const pg = b >= 8 ? PAGES[1] : PAGES[0], b0 = b >= 8 ? 8 : 2.3, n = (b - b0) * 26;
            L.rect(g, 22, 156, 36, 40, 'ink'); L.rect(g, 23, 157, 34, 38, 'sky'); L.hero(g, 32, 168, Math.floor(T * 2), 'knight', -1);
            L.text(g, pg[0], 68, 156, 'gold');
            L.text(g, pg[1], 68, 174, 'white', { n });
            L.text(g, pg[2], 68, 192, 'white', { n: n - pg[1].length });
            if (n > pg[1].length + pg[2].length && Math.floor(T * 4) % 2) L.poly(g, [[352, 198], [360, 198], [356, 203]], 'white');
          }
        }
      });
    },
  };
})();
