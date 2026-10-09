// victory (2 bars, 3 in the 30; the end card): the fanfare. The party raises its weapons in turn (beats 0-1) under
// VICTORY!; the spoils window types the release's numbers as experience (148 CONTRIBUTORS, 57 GAMES SHIPPED, 0.9 MS
// A FRAME) on beat 2, LEVEL UP: 2.0 flashes on beat 3; the end card on beat 4: the logo, the line, MIT and the
// fictional-project note. Hold: sparkles orbit the logo, the party bobs.
(() => {
  SCENES['victory'] = {
    draw(ctx, t, env) {
      const L = window.LF;
      L.present(ctx, env, (g, T, b) => {
        L.bands(g, 0, 0, L.GW, L.GH, ['night', 'deep', 'navy', 'deep', 'night']);
        for (let k = 0; k < 24; k++) { const a = T * 0.8 + k * 0.26, r = 60 + (k % 3) * 14; if (b >= 4 && (Math.floor(T * 6) + k) % 4) L.rect(g, 192 + Math.cos(a) * r * 1.6, 62 + Math.sin(a) * r * 0.5, 2, 2, k % 2 ? 'gold' : 'ice'); }
        if (b < 4) {
          L.text(g, 'VICTORY!', 192, 14, 'gold', { k: 2, align: 'center', outline: 'rust' });
          ['hero', 'mage', 'knight'].forEach((k, i) => L.hero(g, 150 + i * 32, 60 - (b > i * 0.4 && b < 4 ? 4 : 0), Math.floor(T * 4) + i, k, 1));
          if (b >= 2) {
            L.win(g, 40, 96, 304, 84);
            const rows = ['148 CONTRIBUTORS', '57 GAMES SHIPPED', '0.9 MS A FRAME'];
            rows.forEach((r, i) => { L.text(g, 'EXP', 56, 106 + i * 18, 'gold', { n: (b - 2 - i * 0.25) * 20 }); L.text(g, r, 100, 106 + i * 18, 'white', { n: (b - 2 - i * 0.25) * 30 }); });
            if (b >= 3 && Math.floor(b * 4) % 2 === 0) L.text(g, 'LEVEL UP: 2.0', 192, 186, 'lime', { align: 'center', outline: 'moss' });
          }
        } else {
          L.text(g, 'LANTERNFORGE', 192, 40, 'white', { k: 2, align: 'center', outline: 'amber' });
          L.text(g, '2.0', 192, 82, 'gold', { k: 2, align: 'center', outline: 'rust' });
          L.text(g, 'Make the RPG you grew up with.', 192, 128, 'ice', { align: 'center', n: (b - 4) * 40 });
          ['hero', 'mage', 'knight'].forEach((k, i) => L.hero(g, 156 + i * 26, 150, Math.floor(T * 3) + i, k, 1));
          if (b >= 5) L.text(g, 'OPEN SOURCE · MIT · FICTIONAL PROJECT', 192, 196, 'slate', { align: 'center' });
        }
      });
    },
  };
})();
