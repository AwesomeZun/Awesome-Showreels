// build (2 bars, 3 in the 30): the shop builds itself like a cosy building game. The floor arrives in a diagonal
// wave of tiles (beats 0-1), the two back walls rise (1.5-2.5), then each piece drops in on the half beat: windows,
// counter, espresso machine, roaster, tables, plants, menu board; the sign lands on beat 6 with a chime. The barista
// steps behind the counter, steam starts; a customer walks in during the 30-s hold.
(() => {
  SCENES['build'] = {
    draw(ctx, t, env) {
      const K = window.BEAN;
      K.present(ctx, env, (g, T, b) => {
        K.rect(g, 0, 0, K.GW, K.GH, 'mint');
        for (let y = 0; y < K.GH; y += 4) for (let x = (y / 4) % 2 ? 2 : 0; x < K.GW; x += 8) K.rect(g, x, y, 1, 1, 'sage');   // a soft dotted ground
        const at = [0, 1.5, 2, 3, 3.5, 4, 4.5, 5, 5.25, 5.5, 6];
        const cam = { ox: 176, oy: 62, S: 2 };
        SHOP.cutaway(g, cam, T, b, { build: (k, extra = 0) => Math.min(1, Math.max(0, Math.floor(((b - at[k] - extra * 1.2) / 0.5) * 4) / 4)) });
        if (b >= 6.5) { K.rect(g, 0, 166, K.GW, 14, 'cream'); K.textC(g, 'A NEW ROASTERY ON ELM STREET', 160, 170, 'espresso', 1, Math.floor((b - 6.5) * 30), true); }
      });
    },
  };
})();
