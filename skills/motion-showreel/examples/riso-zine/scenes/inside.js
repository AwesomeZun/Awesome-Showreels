// inside (2..6 bars): "40 pages. 2 inks. 0 ads." The hard cut lands on a federal-blue flood; the three numbers are
// knocked out of it one per beat (paper letters with an off-register pink screen), each label stamped on a pasted
// scrap half a beat later, and the facts strip types in. Hold: every bar line a new fact is stamped into the gaps
// (the README's own words) and the camera jump-zooms onto it for half a beat; the numbers kick in turn on every beat.
// Out: a fresh newsprint sheet is pasted up over the page (the next scene starts on it: a match).
(() => {
  const NUMS = [
    { s: '40', x: 352, label: 'PAGES', lx: 352, rot: -2 },
    { s: '2', x: 962, label: 'INKS', lx: 962, rot: 2 },
    { s: '0', x: 1568, label: 'ADS', lx: 1568, rot: -1 },
  ];
  const NUM_SIZE = 520, NUM_BASE = 676;
  // hold facts, one per bar line (README: "$4 or a trade", "stapled by hand", the tape, "3am", "trades welcome")
  const FACTS = [
    { s: '$4 OR A TRADE', x: 352, y: 132, rot: -6 },
    { s: 'STAPLED BY HAND', x: 1540, y: 126, rot: 5 },
    { s: '+ A TAPE!!', x: 962, y: 150, rot: -3 },
    { s: 'PRINTED AT 3AM', x: 400, y: 150, rot: 4 },                               // later facts are pasted over earlier ones
    { s: 'TRADES WELCOME', x: 1530, y: 142, rot: -4 },
  ];
  const STRIP = '300 copies · hand-numbered · no reprints. ever.';

  SCENES['inside'] = {
    draw(ctx, t, env) {
      const n = (beat) => PJ.stepsSince(env, beat), b = env.beatSec;
      const items = [PJ.flood('blue')];
      const cap = PJ.capH('shout', NUM_SIZE), cy = NUM_BASE - cap / 2;
      const holdBeat = env.lt >= env.inSec ? PJ.stepOf(env) : -1;                  // which number kicks on this beat
      NUMS.forEach((N, i) => {
        const ps = PJ.slap(env, i, { amp: 1.1, from: [i - 1, -1], seed: 10 + i });
        if (!ps) return;
        const kick = holdBeat >= 0 && holdBeat % 4 === 0 && (holdBeat / 4) % 3 === i ? 1.045 : 1;
        items.push((g, ink) => {
          g.translate(N.x + ps.dx, cy + ps.dy); g.rotate(N.rot * PJ.DEG + ps.r); g.scale(ps.s * kick, ps.s * kick);
          if (ink === 'blue') PJ.text(g, N.s, 0, cap / 2, { size: NUM_SIZE, fam: 'shout', align: 'center', knock: true });
          else PJ.text(g, N.s, 16, cap / 2 + 16, { size: NUM_SIZE, fam: 'shout', align: 'center', fill: PJ.tint(g, 'pink', 0.32) });
        });
        // the label, stamped in blue on a pasted scrap half a beat later
        const lp = PJ.slap(env, i + 0.5, { amp: 1.2, from: [0.4, 1], seed: 20 + i });
        if (lp) {
          const w = PJ.stampCanvas(N.label, { size: 74, seed: 30 + i, border: 1 }).w + 70;
          items.push(PJ.scrap({ x: N.lx, y: 806, w, h: 136, rot: [-5, 4, -3][i], seed: 50 + i, fill: 'paper', pose: lp, shadowInk: 'pink', shadow: 0.55,
            content: (g, ink) => { if (ink === 'blue') PJ.stampAt(g, N.label, 0, 2, { size: 74, seed: 30 + i, border: 1 }); } }));
        }
      });
      // facts strip: pasted at beat 3, typed from 3.25 (16 characters a step)
      const sp = PJ.slap(env, 3, { amp: 0.8, from: [0, 1], seed: 41 });
      if (sp) {
        const nt = n(3.25) < 0 ? 0 : (n(3.25) + 1) * 16;
        items.push(PJ.scrap({ x: 960, y: 992, w: 1500, h: 112, rot: -0.8, seed: 61, fill: 'paper', pose: sp, shadowInk: 'pink', shadow: 0.55,
          content: (g, ink) => { if (ink === 'blue') PJ.typed(g, STRIP, 0, 16, nt, { size: 46, align: 'center', seed: 9 }); } }));
      }
      // hold: one fact per bar line, stamped in blue on a pink scrap; the camera jumps onto it for half a beat
      let jump = null;
      onBars(env, 1, (i, dt, tb) => {
        if (i >= FACTS.length) return;
        const F = FACTS[i], beat = Math.round((tb / b) * 4) / 4;
        const fp = PJ.slap(env, beat, { amp: 1.3, from: [i % 2 ? 1 : -1, -1], seed: 70 + i });
        if (!fp) return;
        const w = PJ.stampCanvas(F.s, { size: 56, seed: 90 + i, border: 0 }).w + 60;
        items.push(PJ.scrap({ x: F.x, y: F.y, w, h: 128, rot: F.rot, seed: 80 + i, fill: 'pink', pose: fp, shadow: 0.5,
          content: (g, ink) => { if (ink === 'blue') PJ.stampAt(g, F.s, 0, 2, { size: 56, seed: 90 + i, border: 0 }); } }));
        if (fp.n < 2) jump = PJ.zoomAt(F.x, F.y, 1.12);
      }, { until: env.dur - env.outSec });
      // out: a newsprint sheet pasted up from the bottom, one step at a time
      const ko = PJ.stepOf(env) - PJ.stepOf(env, env.dur - env.outSec);
      if (env.lt >= env.dur - env.outSec) items.push(PJ.sheet([0.3, 0.58, 0.82, 1][Math.min(ko, 3)], { side: 'bottom', fill: 'paper', seed: 7, rot: -3 }));
      PJ.print(ctx, env, items, { view: jump });
    },
  };
})();
