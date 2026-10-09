// stack: "Stack it." The dotted editor canvas (the paper slab `pick` slid in). The toolbar and Mara's empty page drop
// in, then her blocks fall into the page one per beat, bottom up (Sunday Scraps, Merch drop, Tip jar): no easing in the
// air, a 6 % squash on landing, and the stack below thunks. The cursor, still holding the Link tile from `pick`,
// swings it over the top slot; it snaps into "My new zine" and lands on beat 4. The cursor moves to Publish and hovers
// while the blocks bob on the beat.
// Hold (longer cuts), one bar each: "Reorder with one hand": the cursor drags a block up past its neighbour, thinks
// again and drags it back, then returns to Publish (the order is the same at every bar line, so `ship` matches).
// Out: the cursor presses Publish and the button floods the frame tomato, which is where `ship` begins.
(() => {
  const DROPS = [{ kind: 'news', slot: 3, beat: 1 }, { kind: 'merch', slot: 2, beat: 2 }, { kind: 'tip', slot: 1, beat: 3 }];
  const LIFT_B = 3.25, REL_B = 3.85, LINK_B = 4;                       // the carried tile: lifted, released, landed
  const SWAPS = [[3, 2], [1, 0], [2, 1]];                               // hold bars: [lower slot, upper slot]
  SCENES['stack'] = {
    draw(ctx, t, env) {
      const KB = window.KB, K = KB.K, lt = env.lt, b = env.beatSec;
      const g = KB.pageGeom(KB.PAGE.x, KB.PAGE.y), s0 = g.slots[0], step = KB.PG.step, P = KB.PUBLISH, PUB = KB.PRESSED_AT;
      const outT = lt - (env.dur - env.outSec);

      // stage: the editor canvas (paper + dots, identical to the slab that ended `pick`)
      KB.field(ctx, K.PAPER);
      KB.dots(ctx);

      // ── block state: offsets from falls, thunks, hold swaps and the beat bob ──
      const st = {};
      KB.ORDER.forEach((kind) => (st[kind] = { dy: 0, lift: 0, sx: 1, sy: 1, hide: false }));
      const kindAt = s => KB.ORDER[s];
      const landings = DROPS.map(d => ({ slot: d.slot, t: KB.at(env, d.beat) })).concat([{ slot: 0, t: KB.at(env, LINK_B) }]);
      for (const d of DROPS) {                                            // falls from above the frame, lands on its beat
        const tl = KB.at(env, d.beat), f = KB.fall(tl, 1200, { dur: 0.3 });
        st[d.kind].hide = tl < -0.3;
        st[d.kind].dy -= f.y; st[d.kind].sx *= f.sx; st[d.kind].sy *= f.sy;
      }
      for (const L of landings) for (let s = L.slot + 1; s < 4; s++) {   // the stack below thunks, one frame apart
        const q = L.t - (s - L.slot) * 0.017;
        if (q > 0 && q < 0.4) st[kindAt(s)].dy += 5 * Math.exp(-q * 13) * Math.sin(q * 38 + 0.6);
      }
      let jolt = 0;                                                       // the page jolts on every landing
      for (const L of landings) if (L.t > 0 && L.t < 0.4) jolt += 3 * Math.exp(-L.t * 12) * Math.sin(L.t * 40 + 0.5);

      // ── the cursor: waits with the tile, swings it over slot 0, then goes to Publish ──
      const H0 = [KB.HELD.x + KB.HELD.gx, KB.HELD.y + KB.HELD.gy], over = [s0.x + s0.w * 0.62, s0.y - 92];
      let hand = KB.path(env, [[0, H0[0], H0[1]], [LIFT_B, H0[0], H0[1]], [REL_B, over[0], over[1], 'ioC'], [4.25, over[0], over[1]],
        [5.5, PUB.x, PUB.y, 'outQuint']]);
      let press = 0, click = -1, dragged = null;

      // hold: one swap-and-back per bar line (beats from the bar line: travel 0-0.5, press 0.5, drag up 0.625-1, land 1,
      // press 1.5, drag back 1.625-2, land 2, back to Publish 2-2.6)
      onBars(env, 1, (i, dt) => {
        const [lo, up] = SWAPS[i % SWAPS.length], A = kindAt(lo), B = kindAt(up), bt = dt / b, sa = g.slots[lo];
        const k = Ease.outQuint(rm(bt, 0.625, 1.0)) - Ease.outQuint(rm(bt, 1.625, 2.0));
        st[A].dy -= k * step;
        st[B].dy += (KB.pop((bt - 0.64) * b) - KB.pop((bt - 1.64) * b)) * step;  // the neighbour makes room as the drag passes halfway
        const picked = (bt >= 0.625 && bt < 1.0) || (bt >= 1.625 && bt < 2.0);
        const pressed = (bt >= 0.5 && bt < 0.625) || (bt >= 1.5 && bt < 1.625);
        st[A].lift += picked ? 16 : pressed ? -6 : 0;
        for (const lb of [1.0, 2.0]) { const q = (bt - lb) * b; if (q > 0 && q < 0.4) st[A].sy *= 1 - 0.05 * Math.exp(-q * 16) * Math.cos(q * 30); }
        const grab = [sa.x + sa.w * 0.7, sa.y + sa.h * 0.55 - k * step];
        if (bt < 0.5) hand = [lerp(PUB.x, grab[0], Ease.outQuint(bt / 0.5)), lerp(PUB.y, grab[1], Ease.outQuint(bt / 0.5))];
        else if (bt < 2.0) hand = [grab[0] - st[A].lift, grab[1] - st[A].lift];
        else { const q = Ease.outQuint(rm(bt, 2.0, 2.6)); hand = [lerp(grab[0], PUB.x, q), lerp(grab[1], PUB.y, q)]; }
        if (bt >= 0.5 && bt < 2.0) { press = picked || pressed ? 1 : 0; }
        for (const pb of [0.5, 1.5]) if (bt >= pb && bt < pb + 0.6) click = (bt - pb) * b;
        dragged = A;
      });

      // idle groove: once the page is complete, the blocks bob on every beat, top to bottom (1/16 beat apart)
      if (lt > (LINK_B + 0.5) * b) KB.ORDER.forEach((kind, i) => {
        const q = (((lt - (i * b) / 16) % b) + b) % b;
        st[kind].lift += 4 * Math.sin(Math.PI * clamp(q / 0.2));
      });

      // ── toolbar: drops in on beat 0.25; Publish lifts while the cursor hovers it, then is pressed in the out-phase ──
      const tb = KB.fall(KB.at(env, 0.25), 140, { dur: 0.2, squash: 0 });
      const near = clamp(1 - Math.hypot(hand[0] - PUB.x, hand[1] - PUB.y) / 80);
      const pk = clamp(outT / K.PRESS_SEC), pubPress = KB.press(outT, { stay: true });
      const pubLift = K.LIFT * near * (1 - pk) + pubPress;
      ctx.save(); ctx.translate(0, -tb.y);
      ctx.fillStyle = K.WHITE; ctx.fillRect(0, 0, W, 100); ctx.fillStyle = K.INK; ctx.fillRect(0, 100, W, K.BW);
      const lw = KB.measure(ctx, 'kablok', { size: 34, width: 'expanded' }) + 40;
      KB.box(ctx, 96, 22, lw, 58, { fill: K.LEMON, r: 12, bw: 5, sh: 6, content: (c) => KB.text(c, 'kablok', 20, 41, { size: 34, width: 'expanded' }) });
      const hx = 96 + lw + 40;
      KB.label(ctx, 'mara.makes', hx, 60, { size: 20 });
      KB.box(ctx, hx + KB.labelW(ctx, 'mara.makes', { size: 20 }) + 22, 33, 106, 38, { r: 19, bw: 4, sh: 4, fill: K.PAPER,
        content: (c) => KB.label(c, 'Draft', 17, 26, { size: 16 }) });
      KB.box(ctx, P.x, P.y, P.w, P.h, { fill: K.TOMATO, r: 12, bw: 5, sh: 8, lift: pubLift,
        content: (c) => KB.text(c, 'Publish', P.w / 2, 44, { size: 32, align: 'center' }) });
      ctx.restore();

      // ── copy ──
      KB.kicker(ctx, 96, 398, '02', 'Stack', KB.at(env, 0.25));
      KB.slamLine(ctx, env, [{ s: 'Stack', beat: 0.5 }, { s: 'it.', beat: 1, mark: true }], 90, 614, { size: 172, markColor: K.LEMON });
      KB.slamLine(ctx, env, [{ s: 'Drag it in. It snaps.', beat: 1.5 }], 96, 688, { size: 40, weight: 800, fall: 0.08 });
      KB.slamLine(ctx, env, [{ s: 'Reorder with one hand.', beat: 1.75 }], 96, 738, { size: 40, weight: 800, fall: 0.08 });

      // ── the page: drops in on beat 0.5 ──
      const pt = KB.at(env, 0.5), pf = KB.fall(pt, 1150, { dur: 0.3 }), py = -pf.y + jolt;
      if (pt > -0.3) {
        ctx.save(); ctx.translate(0, py);
        KB.pageFrame(ctx, g, { sx: pf.sx, sy: pf.sy });
        ctx.save(); ctx.setLineDash([14, 10]); ctx.lineWidth = 4; ctx.strokeStyle = K.DOTS;   // empty slots
        g.slots.forEach((s, i) => { if (landings.find(l => l.slot === i).t < 0.02) { rr(ctx, s.x + 4, s.y + 4, s.w - 8, s.h - 8, K.R); ctx.stroke(); } });
        ctx.restore();
        ctx.restore();
      }
      // snap guides around slot 0 while the Link comes in ("It snaps.")
      const sg = rm(lt, 3.55 * b, 3.75 * b) * (1 - rm(lt, 4.35 * b, 4.5 * b));
      if (sg > 0) {
        const ext = 140 * Ease.outExpo(sg);
        ctx.save(); ctx.translate(0, py); ctx.setLineDash([16, 10]); ctx.lineDashOffset = -lt * 60; ctx.lineWidth = 5; ctx.strokeStyle = K.INK;
        ctx.beginPath();
        ctx.moveTo(s0.x - ext, s0.y - 12); ctx.lineTo(s0.x + s0.w + ext, s0.y - 12);
        ctx.moveTo(s0.x - ext, s0.y + s0.h + 12); ctx.lineTo(s0.x + s0.w + ext, s0.y + s0.h + 12);
        ctx.stroke(); ctx.restore();
      }

      // ── blocks ──
      const timer = KB.timer(t);                                          // reel time: the countdown runs on across scenes
      const drawBlock = kind => {
        const s = st[kind], sl = g.slots[KB.ORDER.indexOf(kind)];
        if (!s.hide) KB.block(ctx, kind, sl.x, sl.y + s.dy + py, sl.w, sl.h, { lift: s.lift, sx: s.sx, sy: s.sy, timer });
      };
      ['tip', 'merch', 'news'].filter(k => k !== dragged).forEach(drawBlock);
      // the Link: the carried tile morphs into the page block over slot 0, is released, falls the last stretch
      const liftT = KB.at(env, LIFT_B), relT = KB.at(env, REL_B), landT = KB.at(env, LINK_B), fallDur = (LINK_B - REL_B) * b;
      const held = 18 + 8 * KB.pop(liftT);
      let cursorAt = hand;
      if (relT < 0) {
        const m = Ease.ioC(rm(lt, (LIFT_B + 0.05) * b, REL_B * b));
        const w = lerp(KB.TILE.w, s0.w, m), h = lerp(KB.TILE.h, s0.h, m);
        const gx = lerp(KB.HELD.gx, s0.w * 0.62, m), gy = lerp(KB.HELD.gy, s0.h * 0.5, m);
        const rot = lerp(-0.05, 0, m) + 0.025 * Math.sin(lt * 5) * (1 - m);
        const content = m < 0.5 ? KB.tileContent(KB.TILES[0]) : (c, ww, hh) => KB.blockContent(c, 'link', ww, hh, {});
        KB.box(ctx, hand[0] - gx, hand[1] - gy, w, h, { fill: K.LEMON, lift: held, rot, content });
        cursorAt = [hand[0] - held, hand[1] - held];
      } else {
        const drop = 92 + s0.h * 0.5;                                     // release height above slot 0 (block top)
        const f = landT < 0 ? { y: drop * (1 - Ease.inQ(clamp(relT / fallDur))), sx: 1, sy: 1 } : KB.fall(landT, drop);
        const lift = landT < 0 ? held * (1 - clamp(relT / fallDur)) : st.link.lift;
        KB.block(ctx, 'link', s0.x, s0.y - f.y + st.link.dy + py, s0.w, s0.h, { lift, sx: f.sx * st.link.sx, sy: f.sy * st.link.sy });
        if (relT < 0.3) click = relT;
      }
      if (dragged) drawBlock(dragged);                                     // a dragged block rides above its neighbours

      // ── out: the press, and the button floods the frame ──
      if (outT > 0) {
        press = Ease.outQ(pk); click = outT; cursorAt = [PUB.x - pubPress, PUB.y - pubPress];
        KB.flood(ctx, { x: P.x - pubPress, y: P.y - pubPress, w: P.w, h: P.h }, rm(outT, 0.1, env.outSec * 0.92), K.TOMATO);
      }
      KB.cursor(ctx, cursorAt[0], cursorAt[1], { press, click });
    },
  };
})();
