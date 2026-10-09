// opening (2 bars; the end card): a big pixel cup with a latte-art heart and steam on the left; the sign, the
// opening day and address, the first-50-cups line type on; the fictional-shop note. Hold: steam keeps rising, the
// heart's foam shimmers a pixel each beat.
(() => {
  const CUP = [
    '..eeeeeeeeeeee....', '.ecccccccccccce...', '.ecccchhcchhcce...', '.ecccchhhhhhcce...', '.eccccchhhhccce.ll',
    '.ecccccchhcccce.l.l', '.ecccccccccccce.l.l', '..eccccccccccce.ll.', '..ewwwwwwwwwwwe....', '...ewwwwwwwwwe.....', '....eeeeeeeee......',
  ];
  SCENES['opening'] = {
    draw(ctx, t, env) {
      const K = window.BEAN;
      K.present(ctx, env, (g, T, b) => {
        K.rect(g, 0, 0, K.GW, K.GH, 'cream');
        for (let y = 0; y < K.GH; y += 6) for (let x = (y / 6) % 2 ? 3 : 0; x < K.GW; x += 12) K.rect(g, x, y, 1, 1, 'latte');
        const sh = Math.floor(b) % 2 ? 'cream' : 'sand';
        K.sprite(g, CUP, { e: 'espresso', c: 'caramel', h: sh, w: 'cream', l: 'espresso' }, 26, 70, 4);
        K.steam(g, 50, 66, T, 8, 4); K.steam(g, 74, 62, T + 0.5, 8, 4);
        K.text(g, 'PEBBLE & BEAN', 112, 40, 'espresso', 3, Math.floor(b * 26) + 1, true);
        if (b >= 1) K.text(g, 'OPENING SATURDAY 8 AM', 114, 78, 'brick', 1, Math.floor((b - 1) * 40), true);
        if (b >= 1.6) K.text(g, '14 ELM STREET', 114, 92, 'espresso', 1, Math.floor((b - 1.6) * 40));
        if (b >= 2.2) K.text(g, 'FIRST 50 CUPS ON US', 114, 106, 'espresso', 1, Math.floor((b - 2.2) * 40));
        if (b >= 3) K.text(g, 'FICTIONAL SHOP ` DEMO', 114, 160, 'plum', 1);
      });
    },
  };
})();
