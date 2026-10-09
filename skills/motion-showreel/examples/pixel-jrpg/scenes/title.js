// title (2 bars, 3 in the 30): the title screen. A Mode-7 overworld rotates and tilts under a stepped dusk sky
// (beats 0-3, the camera sweeping in); on beat 3 LANTERNFORGE slams down letter by letter with a gold outline; 2.0
// stamps beside it on beat 4; the subline types and PRESS START blinks from beat 5. 30-s hold: the world keeps
// turning, a lantern glow pulses on each beat behind the logo.
(() => {
  SCENES['title'] = {
    draw(ctx, t, env) {
      const L = window.LF;
      L.present(ctx, env, (g, T, b) => {
        L.bands(g, 0, 0, L.GW, 80, ['night', 'deep', 'plum', 'wine', 'rust', 'amber']);
        for (let k = 0; k < 18; k++) { const x = (k * 53) % L.GW, y = (k * 29) % 40; if ((Math.floor(T * 3) + k) % 5) L.rect(g, x, y, 1, 1, 'ice'); }
        const sweep = Math.min(1, b / 3);
        L.mode7(g, { x: 128 + T * 9, y: 64 + T * 4, angle: 0.6 - sweep * 0.5 + T * 0.05, horizon: 78, height: 900 - sweep * 300 });
        if (b >= 3) {
          const pulse = b > 6 ? Math.exp(-((b % 1) * 4)) : 0;
          if (pulse > 0.05) L.rect(g, 92, 40 + Math.round(2 - pulse * 2), 200, 2, 'gold');
          const word = 'LANTERNFORGE', n = Math.min(word.length, Math.floor((b - 3) * 24) + 1);
          for (let i = 0; i < n; i++) { const drop = Math.max(0, 12 - Math.floor(((b - 3) * 24 - i) * 3)); L.text(g, word[i], 70 + i * 21, 46 - drop, 'white', { k: 2, outline: 'amber' }); }
        }
        if (b >= 4) { L.rect(g, 302, 44, 40, 24, 'crimson'); L.rect(g, 304, 46, 36, 20, 'rose'); L.text(g, '2.0', 322, 49, 'white', { align: 'center', outline: 'wine' }); }
        if (b >= 5) L.text(g, 'AN OPEN-SOURCE 16-BIT RPG ENGINE', 192, 82, 'ice', { align: 'center', n: (b - 5) * 40, outline: 'night' });
        if (b >= 5.5 && Math.floor(b * 2) % 2 === 0) L.text(g, 'PRESS START', 192, 186, 'gold', { align: 'center', outline: 'night' });
      });
    },
  };
})();
