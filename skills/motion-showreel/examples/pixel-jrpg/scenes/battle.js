// battle (2 bars, up to 4 in the 30): the engine's features are the attacks. A screen-tear transition (beat 0) into
// a side-view battle: a giant BUG boss on the left, the party of three on the right over a battle backdrop. The
// command window's cursor picks HOT RELOAD (beat 2), the hero dashes, the boss flashes and 1,200 rises on beat 3;
// the mage casts 3x FASTER (beat 5) for 2,700; on beat 6.5 the boss breaks into pixels. 30-s hold: the knight's
// CLOUD SAVES heals the party (+57 games) and the enemy HP bar is shown empty.
(() => {
  const BUG = ['....pp......pp....', '.....p......p.....', '...wwwwwwwwwwww...', '..wvvvvvvvvvvvvw..', '.wvvvvvvvvvvvvvvw.', '.wvveevvvvvveevvw.', 'wvvveevvvvvveevvvw',
    'wvvvvvvvvvvvvvvvvw', 'wvvvvvvrrrrvvvvvvw', '.wvvvvvvvvvvvvvvw.', '.wwvvvvvvvvvvvvww.', 'w.wwvvvvvvvvvvww.w', 'w...wwwwwwwwww...w', '.w..w..w..w..w..w.'];
  const MAP = { p: 'ink', w: 'ink', v: 'violet', e: 'gold', r: 'crimson' };
  SCENES['battle'] = {
    draw(ctx, t, env) {
      const L = window.LF;
      L.present(ctx, env, (g, T, b) => {
        L.bands(g, 0, 0, L.GW, 140, ['deep', 'plum', 'violet', 'lilac']);
        L.poly(g, [[0, 140], [60, 96], [130, 128], [220, 86], [300, 124], [384, 100], [384, 216], [0, 216]], 'moss');
        L.bands(g, 0, 140, L.GW, 76, ['grass', 'moss', 'grass', 'moss']);
        // the tear-in on beat 0
        if (b < 0.5) for (let y = 0; y < L.GH; y += 4) L.rect(g, (y % 8 ? 1 : -1) * (1 - b * 2) * 200, y, L.GW, 2, 'night');
        // the boss: flashes when hit, breaks into pixels on 6.5
        const hit = (b > 3 && b < 3.3) || (b > 5 && b < 5.3), dead = b >= 6.5, bx = 40 + (hit ? 3 : 0), by = 70;
        if (!dead) BUG.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] !== '.') L.rect(g, bx + i * 6, by + j * 6, 6, 6, hit ? 'white' : MAP[r[i]]); });
        else { const u = Math.min(1, (b - 6.5) * 1.5); BUG.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] !== '.' && ((i * 7 + j * 3) % 10) / 10 > u) L.rect(g, bx + i * 6 + (i - 9) * u * 20, by + j * 6 - u * 30 + (j % 3) * u * 10, 6, 6, MAP[r[i]]); }); }
        // the party
        const dash = b > 2.6 && b < 3.2 ? -150 * Math.sin((b - 2.6) / 0.6 * Math.PI) : 0;
        L.hero(g, 280 + dash, 96, Math.floor(T * 4), 'hero', -1);
        L.hero(g, 304, 120, Math.floor(T * 4) + 1, 'mage', -1);
        L.hero(g, 286, 144, Math.floor(T * 4), 'knight', -1);
        if (b > 4.6 && b < 5.2) for (let i = 0; i < 8; i++) L.rect(g, 300 - (b - 4.6) * 400 + i * 6, 124 + Math.sin(i + T * 20) * 4, 4, 4, i % 2 ? 'gold' : 'ember');   // the spell
        // damage numbers rising
        const dmg = (v, b0, x) => { if (b > b0 && b < b0 + 1.5) L.text(g, v, x, 70 - Math.floor((b - b0) * 16), 'white', { k: 2, outline: 'crimson' }); };
        dmg('1200', 3, 60); dmg('2700', 5, 70);
        if (b > 9 && b < 11) L.text(g, '+57 GAMES', 260, 84 - Math.floor((b - 9) * 10), 'lime', { outline: 'moss' });
        // command and status windows
        L.win(g, 6, 160, 150, 52);
        const cmds = ['HOT RELOAD', '3X FASTER', 'CLOUD SAVES'], sel = b < 4 ? 0 : b < 8 ? 1 : 2;
        cmds.forEach((c, i) => L.text(g, c, 26, 166 + i * 14, i === sel ? 'gold' : 'white'));
        if (b >= 1) L.cursor(g, 12, 170 + sel * 14, T);
        L.win(g, 162, 160, 216, 52);
        const hp = Math.max(0, 9999 - (b > 3 ? 1200 : 0) - (b > 5 ? 2700 : 0) - (b > 6.5 ? 6099 : 0));
        L.text(g, 'BUG BOSS', 172, 166, 'white'); L.text(g, `HP ${String(hp).padStart(4, ' ')}`, 280, 166, hp ? 'white' : 'rose');
        L.rect(g, 172, 186, 196, 6, 'ink'); L.rect(g, 173, 187, Math.round(194 * hp / 9999), 4, hp > 3000 ? 'lime' : 'rose');
        L.text(g, 'FRAME 0.9 MS', 172, 194, 'ice');
      });
    },
  };
})();
