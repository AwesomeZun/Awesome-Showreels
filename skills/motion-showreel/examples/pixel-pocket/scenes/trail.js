// trail (2 bars, up to 4 in the 30): on the Granite Saddle Loop. Side-scrolling in whole pixels: a dithered sky with
// clouds, the far ridge (1/4 speed), the near ridge (1/2), a row of pines and the trail itself (full speed) with a
// marker post every 64 px. The hiker walks in four stepped frames. The HUD counts distance and climb live; on beat 2
// the trail card drops in (12.4 KM, +860 M), and an elevation profile draws itself bottom right with a dot riding
// it. 30-s hold: a bird flaps across, and a WATER IN 1.2 KM card replaces the trail card.
(() => {
  const ridge = (k, amp, base, seed) => (x) => base - amp * (0.55 * Math.sin((x + seed) * 0.021 * k) + 0.3 * Math.sin((x + seed) * 0.053 * k + 1.7) + 0.15 * Math.sin((x + seed) * 0.11 * k));
  const FAR = ridge(1, 16, 64, 30), NEAR = ridge(1.4, 12, 84, 200);
  const PINE = ['...0...', '..010..', '..010..', '.01110.', '.01110.', '0111110', '...0...'];
  const BIRD = [['0...0', '.0.0.', '..0..'], ['.....', '0000.', '..0..']];
  SCENES['trail'] = {
    draw(ctx, t, env) {
      const P = window.POCKET;
      P.present(ctx, env, (g, T, b) => {
        const s = Math.floor(T * 24);                                       // the world scrolls 24 px a second
        P.cls(g, 3);
        P.dither(g, 0, 12, 240, 22, 3, 2, 0.12);                             // haze at the horizon
        for (let k = 0; k < 4; k++) { const cx = ((k * 70 - s * 0.15) % 280 + 280) % 280 - 30; P.dither(g, cx, 18 + (k % 2) * 7, 20, 3, 3, 2, 0.5); }
        // far and near ridges (columns of whole pixels; the near ridge has a dithered sunlit face)
        for (let x = 0; x < 240; x++) {
          const fy = Math.round(FAR(x + s * 0.25)); P.rect(g, x, fy, 1, 135 - fy, 2);
          const ny = Math.round(NEAR(x + s * 0.5)); for (let y = ny; y < 135; y++) P.px(g, x, y, P.dith(x, y, 0.35) ? 2 : 1);
        }
        // pines and the ground
        P.rect(g, 0, 104, 240, 31, 1);
        for (let k = -1; k < 9; k++) { const x = k * 32 - (s % 32) + ((k * 13) % 7); P.sprite(g, PINE, x, 96 - (k % 3)); }
        P.rect(g, 0, 110, 240, 2, 2);                                         // the trail
        for (let x = -(s % 6); x < 240; x += 6) P.rect(g, x, 113, 3, 1, 2);
        for (let k = 0; k < 6; k++) {                                         // marker posts every 64 px
          const x = k * 64 - (s % 64) + 20; P.rect(g, x, 100, 2, 10, 0); P.rect(g, x - 2, 99, 6, 3, 0);
        }
        P.hiker(g, 70, 98, T);
        // a bird in the hold
        if (b > 8) { const bx = 240 - Math.floor((b - 8) * 22) % 300; P.sprite(g, BIRD[Math.floor(T * 4.5) % 2], bx, 30 + Math.round(Math.sin(b) * 3)); }
        // HUD
        P.rect(g, 0, 0, 240, 11, 0);
        const km = (3.2 + T * 0.18).toFixed(1).padStart(4, '0'), up = Math.round(412 + T * 14);
        P.text(g, `KM ${km}`, 4, 2, 3); P.text(g, `^ +${up}M`, 70, 2, 3);
        P.text(g, '91%', 216, 2, 3); P.rect(g, 208, 3, 5, 5, 3); P.rect(g, 209, 4, 3, 3, 0); P.rect(g, 212, 5, 1, 1, 3);
        // the trail card (beat 2), the water card later in the hold
        const card = b >= 2 && b < 8 ? ['GRANITE SADDLE LOOP', '12.4 KM  +860 M  4H30'] : b >= 9 ? ['WATER IN 1.2 KM', 'SPRING AT THE SADDLE'] : null;
        if (card) {
          const k0 = b >= 9 ? 9 : 2, drop = Math.min(0, -30 + Math.floor((b - k0) * 30));
          P.box(g, 8, 16 + drop, 128, 25); P.text(g, card[0], 13, 20 + drop, 0); P.text(g, card[1], 13, 31 + drop, 1);
        }
        // elevation profile (bottom right): draws on, then a dot rides it
        if (b >= 1) {
          P.box(g, 150, 16, 84, 34);
          const prof = (u) => 44 - Math.round(20 * (Math.sin(u * 3.1) * 0.5 + u * 0.7) * (u < 0.55 ? 1 : 1.25 - u * 0.45));
          const nmax = Math.min(76, Math.floor((b - 1) * 30));
          for (let i = 0; i < nmax; i++) { const y = prof(i / 76); P.rect(g, 154 + i, y, 1, 46 - y, i % 2 ? 2 : 1); }
          if (nmax >= 76) { const i = Math.floor((T * 6) % 76); P.rect(g, 153 + i, prof(i / 76) - 2, 3, 3, 0); }
          P.text(g, 'ELEV', 155, 19, 1);
        }
      });
    },
  };
})();
