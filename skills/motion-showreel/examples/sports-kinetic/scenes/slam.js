// slam (the drop; 3 bars in the short cut, 7 in the 30): RACE DAY IN NUMBERS on the Signal field, the brand's
// loudest frame ("use it for the one number that matters"). The splits stinger ends on this orange, its trailing
// stripes run out under the type. The README's own sum lands one number per beat: 31,500 RUNNERS (beat 0) x 42
// TIMING MATS (beats 1-2); on the bar line (beat 4) the sum moves up and 1,323,000 LIVE SPLITS slams in (the poster
// frame). Every number is black on orange (6.3:1), lands with a quarter-second shake and never fades. The hold brings
// one more figure of the README table per bar line: < 2 S MAT TO PHONE (both cuts), then in the 30-s cut 42.195 KM
// DISTANCE, 9 BRIDGES, 6:30:00 CUT-OFF and 1,323,000 again for the last bar; each new figure knocks the last one out
// to the left.
(() => {
  const STING_IN = (P) => ({ field: P.accent, lead: [[P.accent2, 40], [P.accent, 40]], trail: [[P.onAccent, 46], [P.accent2, 26]] });
  const HERO = { n: '1,323,000', l: 'LIVE SPLITS' };
  const EXTRA = [{ n: '< 2 S', l: 'MAT TO PHONE' }, { n: '42.195 KM', l: 'DISTANCE' }, { n: '9', l: 'BRIDGES' }, { n: '6:30:00', l: 'CUT-OFF' }, HERO];

  SCENES['slam'] = {
    draw(ctx, t, env) {
      const P = env.palette, K = window.V42, b = env.beatSec, lt = env.lt;
      const at = (n) => lt - n * b;
      const ink = P.onAccent, field = P.accent;
      const outStart = env.dur - env.outSec;
      env.fx.vignette = 0.08;                                   // flat field: keep the corners orange

      ctx.fillStyle = field; ctx.fillRect(0, 0, W, H);
      // tone-on-tone race stripes drifting left to right across the field (flat bars, no gradient)
      ctx.save();
      ctx.globalAlpha = 0.16;
      const drift = (lt * 140) % 420;
      for (let x = -900; x < W + 600; x += 420) { K.plate(ctx, x + drift, H + 10, 110, H + 20); ctx.fillStyle = P.accent3; ctx.fill(); }
      ctx.restore();
      K.stinger(ctx, K.stingerIn(env, b), STING_IN(P));
      K.speedLines(ctx, lt, { color: ink, alpha: 0.32, seed: 23, n: 18, minLen: 120, maxLen: 640 });

      // kicker
      const ke = Ease.outExpo(clamp((at(0.25)) / 0.35));
      if (at(0.25) > 0) {
        ctx.save(); ctx.beginPath(); ctx.rect(80, 70, 1000, 80); ctx.clip();
        K.plate(ctx, 96 + (1 - ke) * 300, 136, 14, 40); ctx.fillStyle = ink; ctx.fill();
        text(ctx, 'RACE DAY IN NUMBERS', 136 + (1 - ke) * 300, 132, { size: 34, weight: K.LABEL, fam: 'display', color: ink, ls: 34 * 0.12 });
        ctx.restore();
      }
      text(ctx, 'FICTIONAL RACE · DEMO DATA', W - 96, H - 48, { size: 20, weight: K.LABEL, fam: 'display', color: ink, ls: 20 * 0.12, align: 'right' });

      // ── the sum: 31,500 x 42 (beats 0-2), moving up into a sub-line on the bar line (beat 4)
      const up = Ease.ioExpo(clamp(at(3.7) / 0.32));            // lands just before the hero number
      const SY = lerp(560, 300, up), SS = lerp(1, 0.4, up), SX = 96;
      const big = 300;
      const n1 = K.tabWidth(ctx, '31,500', { size: big, weight: K.BLACK, ls: -4 });
      const xw = measure(ctx, '×', { size: big * 0.7, weight: K.BLACK, fam: 'display' });
      // one more figure lands on every bar line of the hold (beats 8, 12, 16, 20, 24) that comes before the out-phase:
      // the same rule as the cue {"beat": 0, "from": "holdBar", "every": 4}, so picture and sound agree in every cut
      const extraAt = (i) => 8 + 4 * i, hasExtra = (i) => extraAt(i) * b < outStart - 1e-6;
      const exitSum = hasExtra(0) ? clamp((at(8) + 0.12) / 0.2) : 0;   // the first extra clears the sum
      if (exitSum < 1) {
        ctx.save();
        ctx.translate(SX - Ease.inExpo(exitSum) * 1600, SY); ctx.scale(SS, SS);
        K.slam(ctx, at(0), 0, 0, (g) => K.tab(g, '31,500', 0, 0, { size: big, weight: K.BLACK, color: ink, ls: -4 }), { from: 1.6, dx: 200 });
        K.slam(ctx, at(1), n1 + 40, -20, (g) => text(g, '×', 0, 0, { size: big * 0.7, weight: K.BLACK, fam: 'display', color: ink }), { from: 2, dx: 120 });
        K.slam(ctx, at(2), n1 + 80 + xw, 0, (g) => K.tab(g, '42', 0, 0, { size: big, weight: K.BLACK, color: ink, ls: -4 }), { from: 1.7, dx: 200 });
        const lab = (s, x, n, a) => { if (a <= 0) return; ctx.save(); ctx.beginPath(); ctx.rect(x - 4, 14, 800, 70); ctx.clip(); text(ctx, s, x, 70 - (1 - Ease.outExpo(a)) * 60, { size: 46, weight: K.LABEL, fam: 'display', color: ink, ls: 46 * 0.12 }); ctx.restore(); };
        lab('RUNNERS', 8, 0, clamp(at(0.5) / 0.3));
        lab('TIMING MATS', n1 + 88 + xw, 0, clamp(at(2.5) / 0.3));
        if (up > 0.6) text(ctx, '=', n1 + 80 + xw + K.tabWidth(ctx, '42', { size: big, weight: K.BLACK, ls: -4 }) + 50, -20, { size: big * 0.7, weight: K.BLACK, fam: 'display', color: ink, alpha: rm(up, 0.6, 1) });
        ctx.restore();
      }
      K.impact(env, at(0), { shake: 16 }); K.impact(env, at(1), { shake: 8 }); K.impact(env, at(2), { shake: 16 });

      // ── the figure: 1,323,000 LIVE SPLITS on beat 4; in a long hold, one more figure per bar line from bar 3
      const BY = 830, BS = 400;
      let cur = -1, curT = 0;                                    // index into EXTRA of the figure on screen
      for (let i = 0; i < EXTRA.length; i++) { const s = at(extraAt(i)); if (hasExtra(i) && s >= -0.12) { cur = i; curT = s; } }
      const figure = (f, tl, x0) => {
        const size = f.n.length > 7 ? BS : 440;
        const draw = (g) => K.tab(g, f.n, 0, 0, { size, weight: K.BLACK, color: ink, ls: -6 });
        const r = K.slam(ctx, tl, x0, BY, draw, { from: 1.55, dx: 260 });
        if (r) {
          const la = clamp((tl - 0.5 * b) / 0.3);                // the label lands half a beat later
          if (la > 0) {
            ctx.save(); ctx.beginPath(); ctx.rect(x0 - 4, BY + 22, 1600, 90); ctx.clip();
            const lx = x0 + 6;
            K.plate(ctx, lx, BY + 104 - (1 - Ease.outExpo(la)) * 90, measure(ctx, f.l, { size: 54, weight: K.LABEL, fam: 'display', ls: 54 * 0.12 }) + 40, 70);
            ctx.fillStyle = ink; ctx.fill();
            text(ctx, f.l, lx + 70 * K.LEAN + 20, BY + 88 - (1 - Ease.outExpo(la)) * 90, { size: 54, weight: K.LABEL, fam: 'display', color: field, ls: 54 * 0.12 });
            ctx.restore();
          }
        }
        K.impact(env, tl, { shake: 22, zoom: 0.03 });
      };
      if (cur < 0) figure(HERO, at(4), 96);
      else {
        const prevF = cur === 0 ? HERO : EXTRA[cur - 1];
        const ko = clamp((curT + 0.12) / 0.2);                   // the previous figure is knocked out to the left
        if (ko < 1) { ctx.save(); ctx.translate(-Ease.inExpo(ko) * 1900, 0); figure(prevF, 9, 96); ctx.restore(); }
        figure(EXTRA[cur], curT, 96);
      }
    },
  };
})();
