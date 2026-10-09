// pick: "Pick a block." The lilac "How it works" section of the landing page. The headline slams in word by word, the
// block library pops in tile by tile, the cursor flies in, presses the Link tile and lifts it out of the grid.
// Hold (2-bar version): the cursor wiggles the tile on every beat, the other tiles hop one per beat ("pick me"), the
// hero sticker slaps on at the hold's bar line. Out: slabs (mint, lemon, then the dotted editor canvas of `stack`)
// slide up underneath the cursor, which carries the tile to KB.HELD, exactly where `stack` starts.
(() => {
  const GRID = { x: 912, y: 286, w: 284, h: 224, gx: 30, gy: 30 };
  const tileRect = i => ({ x: GRID.x + (i % 3) * (GRID.w + GRID.gx), y: GRID.y + Math.floor(i / 3) * (GRID.h + GRID.gy) });
  const MARQ = ['No code', 'No sad link lists', 'No gatekeeping', 'Just blocks'];
  SCENES['pick'] = {
    draw(ctx, t, env) {
      const KB = window.KB, K = KB.K, lt = env.lt, b = env.beatSec;
      const compact = env.dur < 1.5 * env.barSec;                       // the 1-bar opener of the short cut
      const outT = lt - (env.dur - env.outSec);                         // s into the out-phase
      KB.field(ctx, K.LILAC);

      // ticker band along the bottom (index.html .marquee), always moving left
      KB.marquee(ctx, 974, 70, MARQ, (lt + 2) * K.MARQ, { size: 26 });

      // copy: kicker, headline word by word (each lands on its beat), subline when the scene has room
      KB.kicker(ctx, 96, 300, '01', 'Pick', KB.at(env, -0.2));
      KB.slamLine(ctx, env, [{ s: 'Pick', beat: 0 }], 90, 516, { size: 172 });
      KB.slamLine(ctx, env, [{ s: 'a block.', beat: 0.5, mark: true }], 90, 684, { size: 172 });
      if (!compact) {
        KB.slamLine(ctx, env, [{ s: '20+ chunky blocks: links, tips,', beat: 1 }], 96, 786, { size: 38, weight: 800, fall: 0.08 });
        KB.slamLine(ctx, env, [{ s: 'merch, drops, video.', beat: 1.25 }], 96, 836, { size: 38, weight: 800, fall: 0.08 });
      }

      // the cursor: flies in, hovers the Link tile, presses it on beat 2, lifts it on 2.25, carries it out
      const L0 = tileRect(0), G = { x: L0.x + KB.HELD.gx, y: L0.y + KB.HELD.gy };
      const pressT = KB.at(env, 2), pickT = KB.at(env, 2.25);
      let hand = KB.path(env, [[1, 2080, 1190], [1.75, G.x, G.y], [2.25, G.x, G.y], [2.75, G.x - 26, G.y - 34]], { sway: pickT > 0 ? 0 : 1 });
      // tile lift: pressed into its shadow on the press, then picked high (+18) with the brand pop
      let lift = KB.press(pressT, { stay: true });
      if (pickT > 0) lift = lerp(-K.PRESS, 18, KB.pop(pickT));
      // hold: a wiggle on every beat (snap left/right), no drifting
      let rot = pickT > 0 ? -0.05 * KB.pop(pickT) : 0;
      onBeats(env, 1, (i, dt) => { rot = (i % 2 ? -0.05 : -0.012) + (i % 2 ? 0.03 : -0.03) * Math.exp(-dt * 14) * Math.cos(dt * 30); });
      if (pickT > 0) hand = [hand[0] + Math.sin(lt * 2.3) * 4, hand[1] + Math.cos(lt * 1.9) * 3];
      // out: the hand carries the tile to the hand-off point while the slabs come up
      if (outT > 0) {
        const k = Ease.ioQuint(rm(outT, 0, env.outSec)), target = [KB.HELD.x + KB.HELD.gx, KB.HELD.y + KB.HELD.gy];
        hand = [lerp(hand[0], target[0], k), lerp(hand[1], target[1], k) - Math.sin(Math.PI * k) * 60];
        rot = lerp(rot, -0.05, k);
      }

      // tiles: pop in from the downbeat (reading order, 1/8 beat apart) and land with their shadow; in the hold one tile hops per beat
      let hopper = -1, hopDt = 9;
      onBeats(env, 1, (i, dt) => { hopper = 1 + (i % 5); hopDt = dt; });
      KB.TILES.forEach((tile, i) => {
        if (i === 0 && pickT > 0) return;                               // the picked tile is drawn on top below
        const r = tileRect(i), pt = KB.at(env, -0.02 + i * 0.125), s = KB.popScale(pt);   // tile 0 is already popping at frame 0
        if (s <= 0) return;
        let tl = 14 * (1 - KB.pop(pt));                                   // drops onto the page out of a lift
        if (i === 0) tl += (pressT < 0 ? K.LIFT * KB.pop(KB.at(env, 1.75)) : 0) + lift;   // hover lift, then the press
        if (i === hopper) tl += 16 * Math.sin(Math.PI * clamp(hopDt / 0.3));
        KB.box(ctx, r.x, r.y, GRID.w, GRID.h, { fill: tile.fill, sx: s, sy: s, lift: tl, content: KB.tileContent(tile) });
      });
      // the hero sticker slaps on at the hold's bar line (2-bar version)
      onBars(env, 1, (i, dt) => { if (i === 0) KB.sticker(ctx, 1590, 232, 'New: drop blocks', dt - KB.SLAP, { star: true, deg: 6, fill: K.WHITE, size: 22 }); },
        { offsetBeats: -KB.SLAP / b });                                  // starts 0.09 s early: lands on the bar line

      // out-phase slabs: mint, lemon, then the editor canvas of `stack` (paper + screen-fixed dots)
      if (outT > 0) KB.slabsUp(ctx, outT, env.outSec, [K.MINT, K.LEMON, K.PAPER], { inside: (g, i) => { if (i === 2) KB.dots(g); } });

      // the picked tile and the cursor ride on top of everything, through the wipe
      if (pickT > 0) {
        const tile = KB.TILES[0], x = hand[0] - KB.HELD.gx, y = hand[1] - KB.HELD.gy;
        KB.box(ctx, x, y, GRID.w, GRID.h, { fill: tile.fill, lift, rot, sx: 1 + 0.04 * KB.pop(pickT), sy: 1 + 0.04 * KB.pop(pickT), content: KB.tileContent(tile) });
        KB.cursor(ctx, hand[0] - lift, hand[1] - lift, { press: 0 });
      } else {
        const on = pressT > 0;                                            // pressed: the cursor sinks with the tile
        KB.cursor(ctx, hand[0] - (on ? lift : 0), hand[1] - (on ? lift : 0), { press: on ? Ease.outQ(clamp(pressT / K.PRESS_SEC)) : 0, click: pressT });
      }
    },
  };
})();
