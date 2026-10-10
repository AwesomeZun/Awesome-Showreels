// lights (1 bar): moving day. The empty shop in the blue before morning: every colour sits three stops down the dusk
// ramp, the box pile waits in the middle of the floor, and a game-style card names the day (14 Elm Street, moving day).
// On beat 1 the morning comes in through the window: the light field climbs back to zero in dithered stops, the room
// turns from plum and dusk to cream and caramel. The open box's flaps twitch on beat 3; the unpacking starts on the
// next bar.
(() => {
  const D = DIO, I = D.I;
  SCENES['lights'] = {
    draw(ctx, t, env) {
      const b = env.lt / env.beatSec + 1e-4, st = D.step(b);
      D.target('world'); D.fill(I.cream);
      BACKDROP(b);
      const twitch = b >= 3 && b < 3.5 ? (st % 2 ? 1 : -1) : 0;
      ROOM.draw(b, { boxes: 1, boxShift: twitch });
      D.ambient(-3 * (1 - D.span(b, 1, 2.2)));
      D.shade();
      D.target('ui');
      const k = D.span(b, 0.2, 0.6);
      if (k > 0) { const y = Math.round(-32 + 40 * k); D.win(10, y, 92, 30); D.text('14 Elm Street', 17, y + 5, { c: I.espresso }); D.text('Moving day', 17, y + 16, { c: I.caramel, shadow: null }); }
      D.present(ctx, { s: 4, cx: 320, cy: 186 });
    },
  };
  // the backdrop around the diorama: cream, with the room's soft shadow in dithered latte under it
  window.BACKDROP = (b) => {
    const [cx, cy] = ROOM.fp(0.5, 0.5);
    for (let y = 0; y < D.AH; y++) for (let x = 0; x < D.AW; x++) {
      const d = Math.hypot((x - cx) / 300, (y - cy - 34) / 120);
      if (d < 1) D.px(x, y, D.TH[y * D.AW + x] < (1 - d) * 0.9 ? I.sand : I.cream);
    }
  };
})();
