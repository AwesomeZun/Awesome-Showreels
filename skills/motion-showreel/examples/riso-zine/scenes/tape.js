// tape (3..7 bars): "6 BANDS. 1 TAPE." The page is the zine's centerfold (fold shadow, two staples). The headline
// double-hits in pink and blue on the cut, the tape comp cassette slaps down (beat 1) and keeps turning its reels on
// the stop-motion clock, the six bands land on torn strips one per half beat (side A left, side B right, 1.5-4),
// then SIDE A / SIDE B are stamped (4.5, 5). Hold: on every bar line the marker annotates one band (README words),
// the cassette hops on every downbeat. Out: a sheet of pink-flooded paper is pasted over from the right (the
// finale is printed on it: a match).
(() => {
  // [name, strip fill, face, letter treatment, x, y, rot, size]; order = landing order (alternating sides)
  const BANDS = [
    { s: 'MOTH CHOIR', fill: 'pink', f: 'shout', how: 'knock', x: 312, y: 336, rot: -6, size: 92, beat: 1.5 },
    { s: 'DOGEAR', fill: 'paper', f: 'shout', how: 'double', x: 1608, y: 330, rot: 5, size: 104, beat: 2 },
    { s: 'BAD KERNING', fill: 'paper', f: 'type', how: 'blue', x: 300, y: 566, rot: 4, size: 54, beat: 2.5 },
    { s: 'LUNCHBOX RIOT', fill: 'blue', f: 'type', how: 'knock', x: 1618, y: 560, rot: -4, size: 50, beat: 3 },
    { s: 'SISTER STATIC', fill: 'blue', f: 'stamp', how: 'knock', x: 306, y: 792, rot: -3, size: 50, beat: 3.5 },
    { s: 'THE TIN CANS', fill: 'pink', f: 'stamp', how: 'knock', x: 1612, y: 790, rot: 3, size: 54, beat: 4 },
  ];
  const CAS = { x: 960, y: 588, w: 720, h: 452, rot: -4 };
  // hold annotations in marker (README: interview p.4, "three chords and one of them is wrong", the centerfold, "they're 15", "side B is faster")
  const NOTES = [
    { band: 0, mark: 'ring', text: 'interview p.4', tx: 92, ty: 214, trot: -5 },
    { band: 2, mark: 'under', text: '3 chords, 1 wrong', tx: 96, ty: 676, trot: -3 },
    { band: 1, mark: 'stars', text: 'the centerfold!', tx: 1470, ty: 214, trot: 4 },
    { band: 3, mark: 'ring', text: "they're 15.", tx: 1500, ty: 676, trot: 3 },
    { band: 5, mark: 'under', text: 'side B is faster', tx: 1420, ty: 1002, trot: -2 },
  ];
  const wobble = (pts, seed, a = 4) => pts.map(([x, y], i) => [x + (hash(seed + i * 1.7) - 0.5) * a, y + (hash(seed + i * 2.9) - 0.5) * a]);
  const ellipse = (cx, cy, rx, ry, rot, seed) => {
    const pts = [];
    for (let i = 0; i <= 44; i++) {
      const a = -0.4 + (i / 40) * TAU * 1.06, c = Math.cos(rot), s = Math.sin(rot), x = Math.cos(a) * rx * (1 + 0.05 * Math.sin(i * 0.7)), y = Math.sin(a) * ry;
      pts.push([cx + x * c - y * s, cy + x * s + y * c]);
    }
    return wobble(pts, seed, 5);
  };
  const stripW = (B) => PJ.measureT(B.s, B.size, B.f, B.f === 'type' ? 4 : 2) + (B.f === 'type' ? 90 : 110);

  function cassette(env, pose) {
    const reel = PJ.stepOf(env) * 0.42;                                              // reels turn a little every step
    return (g, ink) => {
      const ps = pose || PJ.REST, w = CAS.w, h = CAS.h;
      g.translate(CAS.x + ps.dx, CAS.y + ps.dy); g.rotate(CAS.rot * PJ.DEG + ps.r); g.scale(ps.s, ps.s);
      if (ink === 'blue') { g.save(); g.translate(10 * ps.sh, 12 * ps.sh); g.fillStyle = PJ.tint(g, 'blue', 0.45); rr(g, -w / 2, -h / 2, w, h, 26); g.fill(); g.restore(); }
      rr(g, -w / 2, -h / 2, w, h, 26); PJ.knock(g);
      if (ink === 'blue') {
        rr(g, -w / 2, -h / 2, w, h, 26); g.fill();                                     // the shell
        rr(g, -w / 2 + 44, -h / 2 + 36, w - 88, 250, 14); PJ.knock(g);                 // label area
        g.beginPath(); g.moveTo(-w * 0.3, h / 2); g.lineTo(-w * 0.24, h / 2 - 92); g.lineTo(w * 0.24, h / 2 - 92); g.lineTo(w * 0.3, h / 2); g.closePath(); PJ.knock(g);
        for (const sx of [-1, 1]) { circle(g, sx * (w / 2 - 24), -h / 2 + 24, 9); PJ.knock(g); circle(g, sx * (w / 2 - 24), h / 2 - 24, 9); PJ.knock(g); }
        for (const sx of [-1, 1]) { circle(g, sx * 64, h / 2 - 44, 15); PJ.knock(g); }
        // label: typed title, side letter, lines
        PJ.typed(g, 'PAPER JAM TAPE COMP #07', -w / 2 + 70, -h / 2 + 96, 99, { size: 34, seed: 3 });
        g.lineWidth = 2.5; g.beginPath(); g.moveTo(-w / 2 + 70, -h / 2 + 116); g.lineTo(w / 2 - 70, -h / 2 + 116); g.stroke();
        // window with the two reels
        rr(g, -150, -h / 2 + 150, 300, 104, 18); g.fill();
        for (const sx of [-1, 1]) {
          const cx = sx * 92, cy = -h / 2 + 202;
          circle(g, cx, cy, 46); PJ.knock(g);
          g.save(); g.translate(cx, cy); g.rotate(reel * sx);
          g.lineWidth = 7; circle(g, 0, 0, 30); g.stroke();
          for (let k = 0; k < 6; k++) { g.rotate(TAU / 6); g.fillRect(-4, 14, 8, 15); }
          g.restore();
        }
      } else {
        // pink label band and the pink tape between the reels
        g.fillStyle = '#000'; rr(g, -w / 2 + 44, -h / 2 + 128, w - 88, 158, 10); g.fill();
        rr(g, -150, -h / 2 + 150, 300, 104, 18); PJ.knock(g);
        g.fillStyle = PJ.tint(g, 'pink', 0.35); rr(g, -w / 2, h / 2 - 92, w, 92, 20); g.fill();
        g.fillStyle = '#000';
        PJ.text(g, 'A', w / 2 - 92, -h / 2 + 238, { size: 96, fam: 'stamp', align: 'center', knock: true });
      }
    };
  }

  SCENES['tape'] = {
    draw(ctx, t, env) {
      const items = [];
      // centerfold: the fold's printed shadow and two staples
      items.push((g, ink) => {
        if (ink !== 'blue') return;
        for (const [x0, x1, l0, l1] of [[960 - 70, 960, 0, 0.5], [960, 960 + 46, 0.5, 0]]) {
          for (let k = 0; k < 6; k++) {
            const a = x0 + ((x1 - x0) * k) / 6, lv = lerp(l0, l1, (k + 0.5) / 6);
            g.fillStyle = PJ.tint(g, 'blue', lv); g.fillRect(a, -60, (x1 - x0) / 6 + 1, H + 120);
          }
        }
      });
      items.push(PJ.staple(960, 214, 90), PJ.staple(960, 958, 90));
      // headline: pink and blue double hit, on the cut
      const hp = PJ.slap(env, 0, { amp: 1, from: [0, -1], seed: 2 });
      if (hp) items.push((g, ink) => {
        g.translate(960 + hp.dx, 178 + hp.dy); g.rotate(-1.5 * PJ.DEG + hp.r); g.scale(hp.s, hp.s);
        if (ink === 'pink') PJ.text(g, '6 BANDS. 1 TAPE.', 9, 9, { size: 156, fam: 'shout', align: 'center', ls: 3 });
        else PJ.text(g, '6 BANDS. 1 TAPE.', 0, 0, { size: 156, fam: 'shout', align: 'center', ls: 3 });
      });
      // the cassette, beat 1; hops one step on every downbeat of the hold
      const cp = PJ.slap(env, 1, { amp: 1.2, from: [0.3, -1], seed: 5 });
      if (cp) {
        const hop = env.lt >= env.inSec && PJ.stepOf(env) % 16 === 0 ? { ...cp, dy: cp.dy - 14, sh: 1.8 } : cp;
        items.push(cassette(env, hop));
      }
      // band strips
      BANDS.forEach((B, i) => {
        const ps = PJ.slap(env, B.beat, { amp: 1.15, from: [B.x < 960 ? -1 : 1, -0.5], seed: 30 + i });
        if (!ps) return;
        const w = stripW(B), ls = B.f === 'type' ? 4 : 2, base = PJ.capH(B.f, B.size) / 2;
        items.push(PJ.scrap({ x: B.x, y: B.y, w, h: B.size * 1.75, rot: B.rot, seed: 60 + i, fill: B.fill, pose: ps, rough: 6,
          content: (g, ink) => {
            const o = { size: B.size, fam: B.f, align: 'center', ls, weight: B.f === 'type' ? 700 : 400 };
            if (B.how === 'knock') { if (ink === B.fill) PJ.text(g, B.s, 0, base, { ...o, knock: true }); }
            else if (B.how === 'blue') { if (ink === 'blue') PJ.typed(g, B.s, 0, base, 99, { size: B.size, align: 'center', seed: 8, ls }); }
            else if (B.how === 'double') { if (ink === 'pink') PJ.text(g, B.s, 7, base + 6, o); else PJ.text(g, B.s, 0, base, o); }
          } }));
      });
      // SIDE A / SIDE B stamps
      [['SIDE A', 300, 948, -4, 4.5], ['SIDE B', 1620, 940, 5, 5]].forEach(([s, x, y, rot, beat], i) => {
        const ps = PJ.slap(env, beat, { amp: 1.3, from: [0, 1], seed: 90 + i });
        if (ps) items.push((g, ink) => { if (ink === 'blue') PJ.stampAt(g, s, x, y, { size: 58, rot, pose: ps, seed: 12 + i }); });
      });
      // hold: marker notes, one per bar line, written over three steps
      onBars(env, 1, (i, dt, tb) => {
        const N = NOTES[i];
        if (!N) return;
        const beat = Math.round((tb / env.beatSec) * 4) / 4, k = PJ.stepsSince(env, beat), p = k < 0 ? 0 : k === 0 ? 0.35 : k === 1 ? 0.7 : 1;
        const B = BANDS[N.band], w = stripW(B), h = B.size * 1.75;
        let pts;
        if (N.mark === 'ring') pts = ellipse(B.x, B.y, w * 0.6, h * 0.85, B.rot * PJ.DEG, 40 + i);
        else if (N.mark === 'under') pts = wobble([[B.x - w * 0.48, B.y + h * 0.66], [B.x - w * 0.1, B.y + h * 0.72], [B.x + w * 0.3, B.y + h * 0.66], [B.x + w * 0.5, B.y + h * 0.7]], 50 + i, 6);
        items.push((g, ink) => {
          if (ink !== 'pink') return;
          if (pts) PJ.marker(g, pts, p, { w: 9 });
          else if (p > 0) for (let s = 0; s < Math.ceil(p * 3); s++) {                  // three scribbled stars
            const sx = B.x - w * 0.55 + s * w * 0.55, sy = B.y - h * 0.95 - (s % 2) * 18;
            PJ.text(g, '*', sx, sy + 40, { size: 96, fam: 'hand', align: 'center' });
          }
          PJ.scrawl(g, N.text, N.tx, N.ty, p, { size: 62, rot: N.trot });
        });
      }, { until: env.dur - env.outSec });
      // out: pink-flooded sheet pasted over from the right
      if (env.lt >= env.dur - env.outSec) {
        const ko = PJ.stepOf(env) - PJ.stepOf(env, env.dur - env.outSec);
        items.push(PJ.sheet([0.3, 0.58, 0.82, 1][Math.min(ko, 3)], { side: 'right', fill: 'pink', seed: 9, rot: 2.5, shadow: 0.55 }));
      }
      PJ.print(ctx, env, items);
    },
  };
})();
