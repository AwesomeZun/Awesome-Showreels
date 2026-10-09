// inside (2 bars, 3 in the 30): the close-up at 2x. The roaster's drum turns and beans pour from the hopper, the
// barista works the machine and steam rises from the cups, a customer walks in, the menu board reads FLAT WHITE 4.5.
// A pixel caption types in on beat 1 (ROASTED IN THE WINDOW), then one on beat 4 (POURED AT THE COUNTER). The camera
// pans across in whole pixels from the roaster to the counter.
(() => {
  SCENES['inside'] = {
    draw(ctx, t, env) {
      const K = window.BEAN;
      K.present(ctx, env, (g, T, b) => {
        K.rect(g, 0, 0, K.GW, K.GH, 'sand');
        const pan = Math.min(90, Math.floor(T * 14));
        SHOP.cutaway(g, { ox: 210 - pan, oy: 30, S: 2 }, T, b, {});
        const cap = b < 4 ? ['ROASTED IN THE WINDOW', 1] : ['POURED AT THE COUNTER', 4];
        if (b >= cap[1]) { K.rect(g, 0, 160, K.GW, 20, 'cream'); K.textC(g, cap[0], 160, 166, 'espresso', 1, Math.floor((b - cap[1]) * 30), true); }
      });
    },
  };
})();
