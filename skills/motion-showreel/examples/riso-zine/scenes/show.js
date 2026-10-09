// show (finale, 2..6 bars): "RELEASE SHOW!!" The tape's pasted pink sheet is the page (match). The headline is
// printed in blue over the pink flood (overprint, beat 0), the date is knocked out of a pasted paper scrap (1),
// 8PM is stamped (1.5), the venue types on a blue strip (2-2.5), "knock twice" is scrawled with an arrow (3), and the
// end card lands on beat 4: "PAPER JAM #07" stamped big plus "OUT NOW". Hold: every bar line one "bring ..." line
// from the README is scrawled and stamped into the margin, the date hops on every downbeat, and the whole page
// re-prints on the stop-motion clock. Out: a last "SEE YOU THERE!!" stamp slams over everything (no transition after).
(() => {
  const BRING = [
    { s: 'bring earplugs.', x: 1450, y: 400, rot: 4 },
    { s: 'bring a friend.', x: 1470, y: 492, rot: -3 },
    { s: 'bring a tape.', x: 1450, y: 584, rot: 3 },
    { s: 'all ages!!', x: 1490, y: 676, rot: -4 },
    { s: 'mind the stairs.', x: 1440, y: 330, rot: -2 },
  ];
  const ARROW = [[1180, 744], [1260, 770], [1340, 760], [1400, 720]];

  SCENES['show'] = {
    draw(ctx, t, env) {
      const n = (beat) => PJ.stepsSince(env, beat), items = [];
      items.push(PJ.flood('pink'));
      items.push(PJ.regMark(58, 56, 13), PJ.regMark(1862, 56, 13));
      // headline: blue on the pink flood = overprint; a paper "drop shadow" knocked out under it
      const hp = PJ.slap(env, 0, { amp: 1, from: [-1, -0.6], seed: 4 });
      if (hp) items.push((g, ink) => {
        g.translate(110 + hp.dx, 236 + hp.dy); g.rotate(-2 * PJ.DEG + hp.r); g.scale(hp.s, hp.s);
        if (ink === 'pink') PJ.text(g, 'RELEASE SHOW!!', 10, 10, { size: 210, fam: 'shout', ls: 3, knock: true });
        else PJ.text(g, 'RELEASE SHOW!!', 0, 0, { size: 210, fam: 'shout', ls: 3 });
      });
      // date on a pasted newsprint scrap, letters in blue; hops one step on every downbeat of the hold
      const dp = PJ.slap(env, 1, { amp: 1.2, from: [-0.6, 1], seed: 11 });
      if (dp) {
        const hop = env.lt >= env.inSec && PJ.stepOf(env) % 16 === 0 ? { ...dp, dy: dp.dy - 12, sh: 1.8 } : dp;
        items.push(PJ.scrap({ x: 560, y: 480, w: 960, h: 250, rot: -3, seed: 21, fill: 'paper', pose: hop, rough: 8,
          content: (g, ink) => {
            if (ink === 'pink') PJ.text(g, 'FRI OCT 23', 8, 84, { size: 220, fam: 'shout', align: 'center', ls: 4 });
            else PJ.text(g, 'FRI OCT 23', 0, 76, { size: 220, fam: 'shout', align: 'center', ls: 4 });
          } }));
      }
      // 8PM, stamped in blue
      const sp = PJ.slap(env, 1.5, { amp: 1.4, from: [1, -1], seed: 13 });
      if (sp) items.push((g, ink) => { if (ink === 'blue') PJ.stampAt(g, '8PM', 1236, 470, { size: 96, rot: 8, pose: sp, seed: 6 }); });
      // venue: blue strip, typed and knocked out to paper, 12 characters a step from beat 2
      const venue = 'THE LAUNDROMAT BASEMENT';
      const nt = n(2) < 0 ? 0 : (n(2) + 1) * 12;
      if (nt > 0) items.push(PJ.scrap({ x: 640, y: 720, w: 1180, h: 112, rot: 1.2, seed: 41, fill: 'blue', rough: 6, rim: 4, shadow: 0.35,
        content: (g, ink) => { if (ink === 'blue') PJ.typed(g, venue, 0, 18, nt, { size: 58, align: 'center', knock: true, seed: 9, weight: 700 }); } }));
      // scrawl, beat 3 (blue marker on the pink flood reads as overprint)
      const p1 = n(3) < 0 ? 0 : n(3) === 0 ? 0.5 : 1, pa = n(3.25) < 0 ? 0 : n(3.25) === 0 ? 0.5 : 1;
      items.push((g, ink) => {
        if (ink !== 'blue') return;
        PJ.scrawl(g, 'round the back, knock twice', 170, 850, p1, { size: 64, rot: -3 });
        PJ.marker(g, ARROW, pa, { w: 9 });
        if (pa >= 1) PJ.arrowHead(g, ARROW, { w: 9, len: 30 });
      });
      // end card, beat 4: the masthead stamp on a torn paper scrap + OUT NOW
      const ep = PJ.slap(env, 4, { amp: 1.3, from: [0, 1], seed: 17 });
      if (ep) items.push(PJ.scrap({ x: 1370, y: 900, w: 1000, h: 236, rot: -4, seed: 55, fill: 'paper', pose: ep, rough: 7, shadow: 0.5,
        content: (g, ink) => {
          if (ink === 'blue') PJ.stampAt(g, 'PAPER JAM #07', 0, -14, { size: 86, seed: 2, border: 2 });
          if (ink === 'pink') PJ.text(g, 'out now · $4 or a trade', 0, 84, { size: 40, fam: 'type', align: 'center', weight: 700 });
        } }));
      // hold: one "bring ..." line per bar line, scrawled over two steps then underlined
      onBars(env, 1, (i, dt, tb) => {
        const B = BRING[i];
        if (!B) return;
        const beat = Math.round((tb / env.beatSec) * 4) / 4, s = PJ.stepsSince(env, beat), p = s < 0 ? 0 : s === 0 ? 0.5 : 1;
        items.push((g, ink) => { if (ink === 'blue') PJ.scrawl(g, B.s, B.x, B.y, p, { size: 74, rot: B.rot }); });
      }, { until: env.dur - env.outSec });
      // out: SEE YOU THERE!! slams over the page
      if (env.outSec > 0 && env.lt >= env.dur - env.outSec) {
        const op = PJ.slap(env, (env.dur - env.outSec) / env.beatSec, { amp: 1.6, from: [0, -1], seed: 23 });
        if (op) items.push(PJ.scrap({ x: 960, y: 560, w: 1500, h: 300, rot: -6, seed: 71, fill: 'blue', pose: op, rough: 9, shadow: 0.6,
          content: (g, ink) => { if (ink === 'blue') PJ.stampAt(g, 'SEE YOU THERE!!', 0, 0, { size: 130, seed: 8, border: 2, knock: true }); } }));
      }
      PJ.print(ctx, env, items);
    },
  };
})();
