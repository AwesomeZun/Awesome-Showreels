// unpack (2 bars, 3 in the 30): one beat, one thing. Out of the open box, on every beat, the next piece of the shop
// hops to its place: it leaves the box at 40% of its size and grows on the way, lands on the off-beat with a squash and
// a stretch, and throws a little puff of dust (the rug first, then the counter, the espresso machine, the roaster and
// its sacks, the shelf, the pastry case, the monstera, the table and chairs, a stool and the menu easel, the pendant
// lamp and the pothos, a cactus and cups on the shelves, the record player). The short cut packs two or three into a
// beat. A progress card counts them in. On the last beat the empty boxes fold flat, and the sign paints itself on the
// wall letter by letter.
(() => {
  const D = DIO, I = D.I;
  const SHORT = [['rug', 'counter'], ['espresso', 'pastry'], ['roaster', 'sacks'], ['shelf', 'monstera'], ['table', 'chair_l', 'chair_r'],
    ['stool', 'easel', 'record'], ['pendant', 'pothos', 'cactus', 'cups']];
  const plan = (n) => (n - 1 >= ROOM.UNPACK.length ? ROOM.UNPACK : SHORT);
  window.UNPACKED = (n) => new Set(plan(n).flat());
  SCENES['unpack'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, n = Math.round(env.dur / B), groups = plan(n), total = groups.flat().length;
      const placed = new Set(), hops = []; let landed = 0;
      groups.forEach((g, k) => g.forEach((name, j) => {
        const at = k + j * 0.08;
        if (b >= at + 0.5) landed++;
        if (b >= at + 0.9) placed.add(name); else if (b >= at) hops.push([name, at]);
      }));
      const fold = D.span(b, n - 0.75, n - 0.5);
      D.target('world'); D.fill(I.cream); BACKDROP(b);
      const letters = Math.floor(D.span(b, n - 1, n - 0.3) * 13 + 1e-6);
      ROOM.draw(b, { placed, hops, boxes: 1 - fold, sign: letters });
      if (fold >= 1) { const [x, y] = ROOM.AT.box_open; ROOM.puff(x, y, (b - (n - 0.5)) / 0.5); }
      D.shade();
      // the progress card
      D.target('ui');
      D.win(10, 8, 110, 30);
      D.text(landed >= total ? 'All unpacked!' : 'Unpacking', 17, 12, { c: I.espresso });
      D.text(`${landed}/${total}`, 113, 12, { c: I.caramel, shadow: null, align: 'r' });
      D.rect(17, 27, 96, 5, I.sand); D.rect(17, 27, Math.round(96 * landed / total), 5, I.caramel); D.rect(17, 27, Math.round(96 * landed / total), 1, I.peach);
      D.present(ctx, { s: 4, cx: 320, cy: 186 });
    },
  };
})();
