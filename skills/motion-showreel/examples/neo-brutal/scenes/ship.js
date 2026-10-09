// ship: "Ship it." We are inside the Publish button: the tomato it flooded the frame with is the stage. On the drop's
// downbeat Mara's page pops back up where it was, now live; the lemon LIVE burst slaps onto its corner; the copy slams
// in; the live-activity toasts from the landing page drop onto a pile one per beat.
// Hold (longer cuts), one bar each: the cursor comes back and presses something on the live page ($5 on the tip jar,
// then Subscribe); a beat later its toast drops on top of the pile while the oldest toast is kicked out to the left.
// Out: cards stacking from the top (lilac, mint, then the paper of `logo`) land on the bar line.
(() => {
  const PILE = { x: 96, y0: 906, step: 98, rot: [-0.035, 0.026, -0.017], fall: 84 };   // pile slots bottom-up (index.html .toast)
  const TARGETS = [{ kind: 'tip', chip: 1 }, { kind: 'news', sub: true }];    // hold bars: what the cursor presses
  SCENES['ship'] = {
    draw(ctx, t, env) {
      const KB = window.KB, K = KB.K, lt = env.lt, b = env.beatSec;
      const g = KB.pageGeom(KB.PAGE.x, KB.PAGE.y), outT = lt - (env.dur - env.outSec);
      const beatQ = (off = 0) => ((((lt - off) % b) + b) % b);            // seconds since the last beat
      KB.field(ctx, K.TOMATO);

      // ── page state: the groove bob, the countdown, presses from the hold ──
      const blocks = {};
      KB.ORDER.forEach((kind, i) => { blocks[kind] = { lift: lt > 0.6 * b ? 4 * Math.sin(Math.PI * clamp(beatQ((i * b) / 16) / 0.2)) : 0 }; });
      blocks.merch.timer = KB.timer(t);

      // ── the cursor: still pressing Publish at the cut (we are inside it), flicked away at once ──
      const start = [KB.PRESSED_AT.x + K.PRESS, KB.PRESSED_AT.y + K.PRESS];
      let hand = [2120, 760], press = 0, click = -1, lastI = -1, lastQ = 0;
      if (lt < 0.6 * b) {
        const k = Ease.inQ(rm(lt, 0.05 * b, 0.55 * b));
        hand = [lerp(start[0], 2100, k), lerp(start[1], -160, k)];
        press = 1 - clamp(lt / 0.05);
      }
      // hold bars: fly in (0-0.6 beats), press on beat 1, toast lands on beat 2, fly out (2.2-2.8)
      onBars(env, 1, (i, dt) => {
        const bt = dt / b, tg = TARGETS[i % TARGETS.length], sl = g.slots[KB.ORDER.indexOf(tg.kind)];
        const aim = tg.chip !== undefined ? [sl.x + sl.w - 152, sl.y + sl.h / 2 + 10] : [sl.x + sl.w - 92, sl.y + sl.h / 2 + 12];
        if (bt < 0.6) { const k = Ease.outQuint(bt / 0.6); hand = [lerp(2120, aim[0], k), lerp(760, aim[1], k)]; }
        else if (bt < 2.2) hand = aim;
        else { const k = Ease.inQ(rm(bt, 2.2, 2.8)); hand = [lerp(aim[0], 2120, k), lerp(aim[1], 900, k)]; }
        const pt = (bt - 1) * b, pl = KB.press(pt, { hold: 0.12 });
        if (pt > 0 && pt < 0.4) { press = pt < 0.2 ? 1 : 0; click = pt; }
        if (tg.chip !== undefined) Object.assign(blocks.tip, { chip: tg.chip, chipLift: pl, chipOn: pt > 0 && bt < 3.5 });
        else blocks.news.sub = pl;
        if (pt > 0 && bt < 2.2) hand = [hand[0] - pl, hand[1] - pl];
        lastI = i; lastQ = bt;
      });

      // ── copy ──
      KB.kicker(ctx, 96, 276, '03', 'Ship', KB.at(env, 0.25));
      KB.slamLine(ctx, env, [{ s: 'Ship', beat: 0.5 }, { s: 'it.', beat: 0.75, mark: true }], 90, 492, { size: 172 });
      KB.slamLine(ctx, env, [{ s: 'One button.', beat: 1.5 }], 96, 566, { size: 40, weight: 800, fall: 0.08 });
      KB.slamLine(ctx, env, [{ s: 'Your page is live.', beat: 1.75 }], 96, 616, { size: 40, weight: 800, fall: 0.08 });

      // ── a chunky ink arrow (the page's own ↗ / →) draws from the copy to the live page on beat 2 ──
      const au = Ease.outQuint(rm(lt, 2 * b, 2.45 * b));
      if (au > 0) {
        const pts = [];
        for (let i = 0; i <= 40; i++) pts.push(qbez([548, 604], [860, 770], [1150, 560], i / 40));
        ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = K.INK; ctx.lineWidth = 11;
        polyStroke(ctx, pts, au); ctx.stroke();
        const hk = KB.popScale(lt - 2.4 * b);
        if (hk > 0) {
          const e = pts[40], a = Math.atan2(e[1] - pts[37][1], e[0] - pts[37][0]), L = 44 * hk;
          ctx.beginPath(); ctx.moveTo(e[0] + Math.cos(a + 2.55) * L, e[1] + Math.sin(a + 2.55) * L); ctx.lineTo(e[0], e[1]);
          ctx.lineTo(e[0] + Math.cos(a - 2.55) * L, e[1] + Math.sin(a - 2.55) * L); ctx.stroke();
        }
        ctx.restore();
      }

      // ── the page pops back up on the downbeat, the LIVE burst slaps on its corner on beat 1 ──
      const up = KB.pop(lt + 0.06, 4.2, 0.5), py = (1 - up) * 760;
      if (up > 0.001) { ctx.save(); ctx.translate(0, py); KB.page(ctx, g, { blocks }); ctx.restore(); }
      KB.burst(ctx, g.x + g.w - 10, g.y + 6 + py, 96, 'LIVE', KB.at(env, 1), { deg: 10, wiggle: lt > 1.5 * b ? 0.05 * Math.exp(-beatQ() * 9) : 0 });

      // ── the toast pile ──
      const toastAt = (idx, slot, o = {}) => {
        const s0 = Math.floor(slot), f = slot - s0, rot = lerp(PILE.rot[s0 % 3], PILE.rot[Math.min(s0 + 1, 2) % 3], f);
        KB.toast(ctx, KB.TOASTS[idx], PILE.x + (o.dx || 0), PILE.y0 - slot * PILE.step - (o.dy || 0), { rot, sx: o.sx, sy: o.sy, lift: o.lift });
      };
      const bob = j => (lt > 5.5 * b ? 3 * Math.sin(Math.PI * clamp(beatQ((j * b) / 8) / 0.2)) : 0);
      const settled = k => { for (let j = 0; j < 3; j++) toastAt((k + j) % 3, j, { lift: bob(j) }); };
      if (lastI < 0) {                                                     // in-phase: drop in on beats 3, 4, 5
        for (let j = 0; j < 3; j++) {
          const tl = KB.at(env, 3 + j), f = KB.fall(tl, PILE.fall, { dur: 0.13 });
          if (tl >= -0.13) toastAt(j, j, { dy: f.y, sx: f.sx, sy: f.sy, lift: f.air ? 0 : bob(j) });
        }
      } else if (lastQ < 1.7 || lastQ > 2.6) settled(lastQ < 1.7 ? lastI : lastI + 1);
      else {                                                               // a rotation in progress
        const q = lastQ, k0 = lastI;
        const kick = Ease.inC(rm(q, 1.7, 2.0));
        if (kick < 1) toastAt(k0 % 3, 0, { dx: -760 * kick });
        for (let j = 1; j < 3; j++) {
          const down = Ease.inQ(rm(q, 1.82, 2.0)), f = q >= 2 ? KB.fall((q - 2) * b, 0) : { sx: 1, sy: 1 };
          toastAt((k0 + j) % 3, j - down, { sx: f.sx, sy: f.sy });
        }
        const nt = (q - 2) * b, f = KB.fall(nt, PILE.fall, { dur: 0.13 });
        if (nt >= -0.13) toastAt(k0 % 3, 2, { dy: f.y, sx: f.sx, sy: f.sy });
      }

      // ── out: cards stacking from the top; the last one is the paper of `logo` ──
      if (outT > 0) KB.slabsDown(ctx, outT, env.outSec, [K.LILAC, K.MINT, K.PAPER]);
      if (hand[0] < W + 120 && hand[1] > -140) KB.cursor(ctx, hand[0], hand[1], { press, click });
    },
  };
})();
