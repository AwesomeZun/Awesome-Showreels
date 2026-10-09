// cover (hook, 2 bars): "PAPER JAM #07" prints in front of you. The pink drum sweeps across the newsprint
// (beat 0), the blue drum follows off register (beat 1), the #07 stamp slams (2), the strip types (2.5), the marker
// scrawls "the basement issue!!" (3), and "IT'S OUT!!" is stamped on a pasted scrap (4). Every quarter beat is a
// new print (registration, ink and paper re-rolled), so the finished cover boils. The speaker pulses on every beat;
// the out-phase jumps the camera in toward the masthead before the hard cut.
(() => {
  // landscape layout of the cover (source/issue07-cover-scan.jpg, re-composed for 16:9)
  const ROW1 = { y: 262, h: 270, xs: [196, 398, 600, 802, 1004], ws: [186, 196, 178, 172, 196], rots: [-4, 5, -3, 4, -6] };
  const ROW2 = { y: 570, h: 290, xs: [212, 420, 640], ws: [176, 186, 214], rots: [6, -5, 3] };
  const SPK = { x: 1478, y: 512, R: 300 };
  const ARROW = [[560, 846], [660, 878], [790, 884], [930, 856], [1060, 800], [1150, 742]];
  const wob = (pts, s) => pts.map(([x, y], i) => [x + (hash(s + i * 3.1) - 0.5) * 6, y + (hash(s + i * 5.7) - 0.5) * 6]);
  const ARROW_W = wob(ARROW, 7);

  SCENES['cover'] = {
    draw(ctx, t, env) {
      const b = env.beatSec, n = (beat) => PJ.stepsSince(env, beat);          // steps since a beat
      const sweep = (beat) => { const k = n(beat); return k < 0 ? 0 : k === 0 ? 0.42 : k === 1 ? 0.78 : 1; };
      const items = [];
      // printer's registration targets: printed by both drums, so the misregistration shows from the first frame
      items.push(PJ.regMark(58, 56, 13), PJ.regMark(1862, 56, 13));
      // masthead: ransom letters, each boiling on its own
      const letters = [];
      ROW1.xs.forEach((x, i) => letters.push({ i, x, y: ROW1.y, w: ROW1.ws[i], h: ROW1.h, rot: ROW1.rots[i] }));
      ROW2.xs.forEach((x, i) => letters.push({ i: 5 + i, x, y: ROW2.y, w: ROW2.ws[i], h: ROW2.h, rot: ROW2.rots[i] }));
      for (const L of letters) {
        const bo = PJ.boil(env, 20 + L.i, 1.2);
        items.push(PJ.ransom({ ...L, pose: { n: 9, s: 1, r: bo.br * 1.5, dx: bo.bx, dy: bo.by, sh: 1 } }));
      }
      // speaker: a step-long pulse on every beat once both passes are down
      const onBeat = env.lt >= 2 * b && PJ.stepOf(env) % 4 === 0 ? 1.028 : 1;
      items.push(PJ.speaker({ ...SPK, pulse: onBeat }));
      // #07 stamp (pink), beat 2
      const st = PJ.slap(env, 2, { amp: 1.3, from: [1, -1], seed: 3 });
      if (st) items.push((g, ink) => { if (ink === 'pink') PJ.stampAt(g, '#07', 958, 600, { size: 96, rot: -8, pose: st, seed: 7 }); });
      // the strip: blue flood, words knocked out, typed from beat 2.5 (14 characters a step)
      const strip = '40 pages · 2 inks · 0 ads · $4 or a trade';
      const nt = n(2.5) < 0 ? 0 : (n(2.5) + 1) * 14;
      items.push(PJ.scrap({ x: 960, y: 992, w: 2010, h: 124, rot: 0.7, seed: 31, fill: 'blue', rough: 7, rim: 4, shadow: 0.35,
        content: (g, ink) => { if (ink === 'blue' && nt > 0) PJ.typed(g, strip, 0, 17, nt, { size: 50, align: 'center', knock: true, seed: 5 }); } }));
      // marker scrawl and arrow (pink), beats 3-4
      const p1 = n(3) < 0 ? 0 : n(3) === 0 ? 0.55 : 1, p2 = n(3.5) < 0 ? 0 : 1, pa = n(3.5) < 0 ? 0 : n(3.5) === 0 ? 0.45 : n(3.5) === 1 ? 0.8 : 1;
      items.push((g, ink) => {
        if (ink !== 'pink') return;
        PJ.scrawl(g, 'the basement', 120, 812, p1, { size: 82, rot: -6 });
        PJ.scrawl(g, 'issue!!', 236, 890, p2, { size: 88, rot: -6 });
        PJ.marker(g, ARROW_W, pa, { w: 10 });
        if (pa >= 1) PJ.arrowHead(g, ARROW_W, { w: 10, len: 34 });
      });
      // "IT'S OUT!!" stamped in blue on a pasted scrap, beat 4
      const os = PJ.slap(env, 4, { amp: 1.4, from: [1, 1], seed: 9 });
      if (os) items.push(PJ.scrap({ x: 1500, y: 846, w: 600, h: 150, rot: 6, seed: 77, fill: 'paper', pose: os, rough: 6,
        content: (g, ink) => { if (ink === 'blue') PJ.stampAt(g, "IT'S OUT!!", 0, 2, { size: 62, seed: 4, border: 1 }); } }));
      // out-phase: two jump-zoom steps toward the masthead (hard cut follows)
      const ko = env.lt >= env.dur - env.outSec ? PJ.stepOf(env) - PJ.stepOf(env, env.dur - env.outSec) : -1;
      const view = ko >= 0 ? PJ.zoomAt(600, 430, [1.06, 1.06, 1.13, 1.13][Math.min(ko, 3)]) : null;
      PJ.print(ctx, env, items, { sweep: { pink: sweep(0), blue: sweep(1) }, view });
    },
  };
})();
