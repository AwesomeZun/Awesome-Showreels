// logo: the end card. The last card of `ship`'s stack (paper) has just landed. The wordmark slab drops onto it
// (lemon, ink border, hard shadow; it never rotates), its letters pop in one by one, the H1 of the landing page slams
// in under it with its white highlight, and the ink marquee comes up along the bottom. On beat 4 the cursor presses the
// logo into its shadow: kablok. Hold: the slab presses again on every bar line and a sticker with the page's fine
// print slaps on; the marquee never stops. No out-phase: the reel ends on this frame.
(() => {
  const SIZE = 232, CX = 960, SY = 236;                                  // wordmark size, centre x, slab top
  const MARQ = ['No code', 'No sad link lists', 'No gatekeeping', 'Just blocks'];
  const STICKERS = [{ s: 'Free for one page.', x: 410, y: 214, deg: -6, fill: 'mint' }, { s: 'No card. No code.', x: 1520, y: 548, deg: 5, fill: 'lilac' }];
  SCENES['logo'] = {
    draw(ctx, t, env) {
      const KB = window.KB, K = KB.K, lt = env.lt, b = env.beatSec;
      const beatQ = ((lt % b) + b) % b;
      KB.field(ctx, K.PAPER);
      KB.thunk(env, lt, 1.2);                                             // the last card landed on the cut

      // ── the slab: falls in, lands on beat 0.5; the cursor presses it on beat 4 and on every hold bar line ──
      const opt = { size: SIZE, width: 'expanded', weight: 900 };
      const tw = KB.measure(ctx, 'kablok', opt), sw = tw + 2 * 70, sh = Math.round(SIZE * 0.74) + 2 * 52, sx0 = CX - sw / 2;
      const FALL = SY + sh + 30, ft = KB.at(env, 0.5), f = KB.fall(ft, FALL, { dur: 0.24, squash: 0.08 });   // from just above the frame: in view for the whole fall
      let lift = 0, click = -1, press = 0;
      const presses = [KB.at(env, 4)];
      onBars(env, 1, (i, dt) => presses.push(dt));
      for (const pt of presses) if (pt > 0) { lift = KB.press(pt, { hold: 0.1 }); if (pt < 0.35) { click = pt; press = pt < 0.2 ? 1 : 0; } }
      if (ft > 0 && presses[0] < 0) lift += 3 * Math.sin(Math.PI * clamp(beatQ / 0.2)) * (lt > 1.5 * b ? 1 : 0);   // bob on the beat
      if (ft > -0.24) {
        KB.box(ctx, sx0, SY - f.y, sw, sh, { fill: K.LEMON, r: 24, bw: 8, sh: 14, lift, sx: f.sx, sy: f.sy, ax: 0.5, ay: 1,
          content: (c) => {
            // letters pop in one by one (1/8 beat apart from beat 0.75), each from 60 % with one overshoot
            // letters pop in one by one (1/8 beat apart from beat 0.75): from 60 % with one overshoot, stepping through
            // Archivo's width axis (condensed -> expanded, the wordmark's own width) as they grow
            const WIDTHS = ['extra-condensed', 'condensed', 'semi-condensed', 'normal', 'semi-expanded', 'expanded'];
            let acc = '';
            [...'kablok'].forEach((ch, i) => {
              const x = KB.measure(c, acc, opt); acc += ch;
              const lt0 = KB.at(env, 0.75 + i * 0.125), s = KB.popScale(lt0);
              if (s <= 0) return;
              const wk = WIDTHS[Math.min(5, Math.floor(clamp(lt0 / 0.1) * 5.999))], cw = KB.measure(c, ch, opt);
              const o2 = { ...opt, width: wk }, w2 = KB.measure(c, ch, o2);
              c.save(); c.translate(70 + x + cw / 2, sh - 52 - SIZE * 0.3); c.scale(s, s);
              KB.text(c, ch, -w2 / 2, SIZE * 0.3, o2);
              c.restore();
            });
          } });
      }

      // ── the H1 of the landing page, with its highlight ──
      KB.slamLine(ctx, env, [{ s: 'Stack blocks.', beat: 1.5 }, { s: 'Ship your page.', beat: 2, mark: true, anchor: 'left' }], CX, 676, { size: 92, align: 'center', markColor: K.LEMON });

      // ── stickers with the page's fine print, one per hold bar ──
      onBars(env, 1, (i, dt) => { const s = STICKERS[i % STICKERS.length]; KB.sticker(ctx, s.x, s.y, s.s, dt - KB.SLAP, { deg: s.deg, fill: K[s.fill.toUpperCase()], size: 24 }); },
        { offsetBeats: 0.25 - KB.SLAP / b });                            // lands a quarter beat after the press

      // ── the marquee comes up on beat 1 and keeps scrolling ──
      const mk = KB.fall(KB.at(env, 1), -230, { dur: 0.18, squash: 0 });
      KB.marquee(ctx, 860 - mk.y, 76, MARQ, (t + 4) * K.MARQ, { size: 28 });

      // ── small print: the material says the product is fictional ──
      if (KB.at(env, 3) > 0) KB.text(ctx, 'kablok is fictional. Every creator, handle and notification here is made up.', W - 96, 1012,
        { size: 20, weight: 700, fam: 'sans', align: 'right', color: K.MUTED });

      // ── the cursor: comes in for the press on beat 4, rests beside the slab, comes back for each hold press ──
      const tip = [sx0 + sw - 46 - lift, SY + sh - 40 - lift];
      let hand = KB.path(env, [[2.75, 2120, 1150], [3.75, tip[0], tip[1], 'outQuint']]);
      if (lt < 2.75 * b) hand = [2200, 1200];
      onBars(env, 1, (i, dt) => { const q = dt / b; if (q > 2.2) { const k = Ease.ioC(rm(q, 2.2, 3.0)); hand = [lerp(tip[0], tip[0] + 260, k), lerp(tip[1], tip[1] + 150, k)]; } });
      const lastBar = (() => { let d = -1; onBars(env, 1, (i, dt) => { d = dt; }); return d; })();
      if (lastBar >= 0 && lastBar / b > 3.0) {                             // back in for the next bar's press
        const k = Ease.outQuint(rm(lastBar / b, 3.0, 3.8));
        hand = [lerp(tip[0] + 260, tip[0], k), lerp(tip[1] + 150, tip[1], k)];
      }
      if (lt > 2.75 * b) KB.cursor(ctx, hand[0], hand[1], { press, click });
    },
  };
})();
