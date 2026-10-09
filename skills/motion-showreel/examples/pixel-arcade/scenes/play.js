// play (3 bars in the short cut, 6 in the 30-s cut): PLAYER 1 builds a game in 72 hours, as a side-scroller.
// Opens out of rules' 32-px mosaic. The token runs right along a dusk street (the jam's own mock-up, source/media/
// level.png: NIGHT -> GRAPE -> BUBBLE -> PEACH sky, a skyline with lit windows, SLATE pavers); the world scrolls
// 4 px per step (far skyline 1, near skyline 2). HUD: SCORE, the CREDIT-16 meter, HOUR (the jam clock, +1 per step,
// held at 71 and blinking HURRY in a long cut).
// In-phase: beat 2 the token jumps (and flips like a coin) through a 4 x 4 grid of the 16 palette gems; it takes a
// column a step (beats 2.4-3.2) and the meter fills colour by colour; it lands on beat 4: "16/16 COLOURS!".
// Beat 5 a bug crawls in; the token jumps on beat 5.8 and stomps it on beat 6 (+100, whole-pixel shake).
// Hold (30-s cut): a coin row on the first hold bar line, then a bug stomp on every later bar line.
// Out-phase (4 beats, the same in every cut): the arcade cabinet rolls in (the entry: "YOUR GAME HERE"), the token
// flips into its coin slot on beat 2 (CLINK, the cabinet's screen wakes up with raster bars), and the camera zooms into
// that screen in whole-number steps (x1 .. x10) so the next scene, the HIGH SCORES, starts inside it.
(() => {
  const SPEED = 4;                // px per step (world)
  const GROUND = 150;             // y of the curb line
  const HERO_X = 72;              // the token's x on screen while the world scrolls
  const GEM_COL0 = 2.4;           // beat: the first gem column is taken
  // ── the dusk backdrop (cached; it only scrolls)
  let SKY = null, FAR = null, NEAR = null;
  function sky(P) {
    if (SKY) return SKY;
    const N = P.N, c = document.createElement('canvas'); c.width = P.W; c.height = P.H;
    const g = c.getContext('2d');
    P.bands(g, 0, 0, P.W, GROUND, [[0, N.NIGHT], [30, N.GRAPE], [66, N.BUBBLE], [104, N.PEACH]], 12);
    // the low sun
    for (let y = 84; y < GROUND; y++) for (let x = 210; x < 270; x++) {
      const d = (x - 240) * (x - 240) + (y - 120) * (y - 120);
      if (d < 28 * 28) { g.fillStyle = P.HEX[y < 104 ? N.GOLD : N.EMBER]; g.fillRect(x, y, 1, 1); }
    }
    return (SKY = c);
  }
  function skyline(P, seed, base, hMin, hMax, colour, windows) {
    const N = P.N, w = P.W * 2, c = document.createElement('canvas'); c.width = w; c.height = P.H;
    const g = c.getContext('2d');
    let x = 0, k = 0;
    while (x < w) {
      const bw = 14 + Math.floor(P.rnd(seed, k) * 24), bh = hMin + Math.floor(P.rnd(seed + 1, k) * (hMax - hMin));
      g.fillStyle = P.HEX[colour]; g.fillRect(x, base - bh, bw, bh);
      if (P.rnd(seed + 2, k) > 0.6) g.fillRect(x + Math.floor(bw / 2) - 1, base - bh - 6, 2, 6);   // an antenna
      if (windows) for (let wy = base - bh + 4; wy < base - 6; wy += 6) for (let wx = x + 3; wx < x + bw - 3; wx += 5) {
        if (P.rnd(wx * 7 + seed, wy) < 0.38) { g.fillStyle = P.HEX[P.rnd(wx, wy + 3) < 0.15 ? N.PEACH : N.GOLD]; g.fillRect(wx, wy, 2, 1); }
      }
      x += bw + 2; k++;
    }
    return c;
  }
  function backdrop(P, g, cam) {
    if (!FAR) { FAR = skyline(P, 3, GROUND, 24, 58, P.N.GRAPE, false); NEAR = skyline(P, 9, GROUND, 18, 44, P.N.NIGHT, true); }
    g.drawImage(sky(P), 0, 0);
    const fx = -Math.floor(cam / 4) % (P.W * 2), nx = -Math.floor(cam / 2) % (P.W * 2);
    g.drawImage(FAR, fx, 0); g.drawImage(FAR, fx + P.W * 2, 0);
    g.drawImage(NEAR, nx, 0); g.drawImage(NEAR, nx + P.W * 2, 0);
    // street: FOG curb, SLATE pavers with NIGHT joints (staggered rows), scrolling with the world
    const N = P.N;
    P.rect(g, 0, GROUND, P.W, 1, N.FOG);
    P.rect(g, 0, GROUND + 1, P.W, P.H - GROUND - 1, N.SLATE);
    g.fillStyle = P.HEX[N.NIGHT];
    for (let row = 0; row < 3; row++) {
      const y = GROUND + 2 + row * 10;
      g.fillRect(0, y + 9, P.W, 1);
      const off = ((-cam + row * 8) % 16 + 16) % 16;
      for (let x = off; x < P.W; x += 16) g.fillRect(x, y, 1, 9);
    }
  }
  // ── HUD: SCORE, the CREDIT-16 meter, HOUR
  function hud(P, g, score, filled, hour, s, hurry) {
    const N = P.N;
    P.text(g, 'SCORE', 8, 5, { color: N.BONE, shadow: N.VOID });
    P.text(g, P.pad(score), 8, 15, { color: N.GOLD, shadow: N.VOID });
    const mx = 96, my = 6;
    P.rect(g, mx - 2, my - 2, 16 * 8 + 3, 12, N.VOID);
    for (let i = 0; i < 16; i++) {
      const x = mx + i * 8;
      if (i < filled) P.rect(g, x, my, 7, 8, i === 0 ? N.NIGHT : i);
      else P.rect(g, x, my, 7, 8, N.NIGHT);
      if (i === 0 && i < filled) P.rect(g, x + 1, my + 1, 5, 6, N.VOID);
    }
    P.text(g, 'CREDIT-16', 160, my + 12, { font: 'S', align: 'center', color: filled >= 16 ? N.GOLD : N.FOG, shadow: N.VOID });
    P.text(g, 'HOUR', 312, 5, { align: 'right', color: hurry && s % 4 < 2 ? N.CHERRY : N.BONE, shadow: N.VOID });
    P.text(g, P.pad(hour, 2), 312, 15, { align: 'right', color: hurry ? N.CHERRY : N.GOLD, shadow: N.VOID });
    if (hurry && s % 6 < 4) P.text(g, 'HURRY UP!', 312, 26, { font: 'S', align: 'right', color: N.CHERRY, shadow: N.VOID });
  }

  SCENES['play'] = {
    draw(ctx, t, env) {
      const P = OCJ, N = P.N, scr = P.screen(), g = scr.g;
      const s = Math.max(0, P.step(env.lt)), B = b => P.sb(env, b);
      const out = P.outStep(env), end = P.endStep(env), so = s - out;      // steps into the out-phase
      // camera: the world scrolls until the cabinet sits in front of the token (out + 1 beat), then stops
      const stopAt = out + B(1.2);
      const cam = Math.min(s, stopAt) * SPEED;
      // hold events: bar lines of the hold (k = 0 coin row, k >= 1 a bug stomped on the bar line)
      const holdBars = [];
      onBars(env, 1, (i, dt, tb) => holdBars.push({ i, s0: Math.round(tb * P.STEP_FPS) }));
      // the hold's bar lines that are still ahead (for bugs that must be walking in before them)
      const ahead = [];
      for (let k = 0; k < 8; k++) {
        const tb = Math.ceil((env.inSec - 1e-6) / env.barSec) * env.barSec + k * env.barSec;
        if (tb >= env.dur - env.outSec - 1e-6) break;
        ahead.push({ i: k, s0: Math.round(tb * P.STEP_FPS) });
      }
      // ── events in steps
      const J1 = B(2), J1d = B(2);                       // gem jump: takeoff beat 2, 10 steps, lands beat 4
      const STOMP = B(6), J2 = STOMP - 4;                // stomp jump: takeoff beat 5.2, lands on the bug at beat 6
      // jumps: [takeoff step, duration, height]; the token is airborne inside any of them
      const jumps = [[J1, J1d, 44], [J2, 4, 22], [STOMP, 4, 12]];
      for (const b of ahead) if (b.i >= 1) jumps.push([b.s0 - 4, 4, 22], [b.s0, 4, 12]);
      const finalJump = out + B(2) - 4;                  // the flip into the coin slot: in it on beat 2 of the out-phase
      // ── world
      const [shx, shy] = (() => {
        let best = [0, 0];
        for (const st of [STOMP, ...ahead.filter(b => b.i >= 1).map(b => b.s0), out + B(1)]) { const v = P.shakeAt(s - st, 1.2); if (v[0] || v[1]) best = v; }
        return best;
      })();
      g.save(); g.translate(shx, shy);
      backdrop(P, g, cam);
      // the 16 gems: a 4 x 4 grid in world space; column c is taken at beat GEM_COL0 + c * 0.2
      const gridX = HERO_X + B(GEM_COL0) * SPEED;        // world x of column 0 (under the token's centre when taken)
      let filled = 0;
      for (let c = 0; c < 4; c++) {
        const takenAt = B(GEM_COL0) + 2 * c;            // 8 px apart at 4 px per step: one column every 2 steps
        for (let r = 0; r < 4; r++) {
          const idx = r * 4 + c;
          if (s >= takenAt) { filled++; continue; }
          const x = gridX + c * 8 - cam + 4, y = 70 + r * 9 + (P.blink(s + idx, 6, 3) ? 0 : -1);
          P.blit(g, `gem${idx}`, x, y);
        }
        if (s >= takenAt && s < takenAt + 6) {
          P.burst(g, HERO_X + 8, 84, s - takenAt, { n: 6, speed: 2, colors: [c * 4, c * 4 + 1, c * 4 + 2, c * 4 + 3].map(x => (x === 0 ? N.FOG : x)), seed: 21 + c, life: 5 });
        }
      }
      filled = Math.min(16, filled);
      // bugs. The in-phase bug lives in the world from the start (walks 1 px per step, stomped on beat 6); a hold bug pops
      // out of the street 2 beats before its bar line, ahead of the token, so nothing of the hold shows in the in-phase.
      const bugs = [{ at: STOMP, pop: null }];
      for (const b of ahead) if (b.i >= 1) bugs.push({ at: b.s0, pop: b.s0 - B(2) });
      for (const bug of bugs) {
        if (bug.pop !== null && s < bug.pop) continue;
        const dsq = s - bug.at;
        const x = HERO_X + 1 + Math.max(0, bug.at - s) * (SPEED + 1) - (dsq > 0 ? Math.min(dsq, 8) * SPEED : 0);
        const rise = bug.pop !== null ? Math.max(0, 3 - (s - bug.pop)) * 4 : 0;           // climbs out of the street
        const alert = bug.pop === null && s >= B(5) && s < B(5) + 3;                       // notices the token on beat 5
        g.save(); g.beginPath(); g.rect(0, 0, P.W, GROUND + 1); g.clip();
        if (dsq < 0) P.blit(g, `bug${s % 2}`, x, GROUND - 13 + rise, { tint: alert && s % 2 === 0 ? N.CHERRY : null });
        else if (dsq < 8) P.blit(g, 'bugFlat', x, GROUND - 12);
        g.restore();
        if (bug.pop !== null && s - bug.pop < 4) P.burst(g, x + 8, GROUND, s - bug.pop, { n: 6, up: true, spread: 1.6, speed: 1.6, colors: [N.FOG, N.SLATE], seed: 41 + bug.at, life: 4 });
        if (dsq >= 0 && dsq < 6) { P.pop(g, '+100', x + 8, GROUND - 26, dsq, { color: N.GOLD }); P.burst(g, x + 8, GROUND - 6, dsq, { n: 10, up: true, spread: 2.4, speed: 2.4, colors: [N.LIME, N.BONE, N.PINE], seed: 31 + bug.at }); }
      }
      // the coin row of the first hold bar line: four coins sparkle in ahead of the token, taken one every 3 steps
      for (const b of holdBars) if (b.i === 0) {
        for (let k = 0; k < 4; k++) {
          const at = b.s0 + 6 + 3 * k, x = HERO_X + 2 + (at - s) * SPEED, ds0 = s - b.s0;
          if (s < at) {
            if (ds0 < 2) P.blit(g, `spark${1 - ds0}`, x + 3, GROUND - 38);
            else P.blit(g, `coin12_${(s + k) % 8}of8_plain`, x, GROUND - 40);
          } else if (s < at + 5) P.pop(g, '+10', HERO_X + 8, GROUND - 46, s - at, { color: N.BONE, life: 5 });
        }
      }
      // the cabinet (the entry): drops out of the sky on the first beat of the out-phase, then scrolls with the street
      // until the camera stops in front of it. Before the out-phase it does not exist, so every cut's in-phase matches.
      const cabWorldX = HERO_X + stopAt * SPEED + 26;
      const cabX = cabWorldX - cam;
      const cabDrop = so >= 0 ? P.fall(so, B(1), 120, B(1)) : 999;
      const cabY = GROUND - P.CAB.h + 1 - cabDrop;
      if (so >= 0) {
        P.blit(g, 'cabinet', cabX, cabY);
        const sc = P.CAB.screen, awake = so >= B(2);
        if (awake) P.raster(g, cabX + sc.x, cabY + sc.y, sc.w, sc.h, s, { unit: 1, amp: 5 });
        else for (let k = 0; k < 6; k++) if (P.blink(s + k * 3, 7, 3)) P.px(g, cabX + sc.x + 3 + k * 5, cabY + sc.y + 4 + (k % 3) * 5, N.FOG);
        if (so >= B(2) && so < B(2) + 3) P.rect(g, cabX + P.CAB.slot.x, cabY + P.CAB.slot.y, 4, 6, N.BONE);
        if (so >= B(1) && so < B(1) + 6) P.burst(g, cabX + 24, GROUND, so - B(1), { n: 14, up: true, spread: 2.8, speed: 2.6, colors: [N.FOG, N.SLATE, N.BONE], seed: 51 });
        if (so >= B(1) && so < B(2)) {
          P.text(g, 'YOUR GAME', cabX + 24, cabY - 18, { font: 'S', align: 'center', color: N.BONE, shadow: N.VOID });
          P.text(g, 'HERE', cabX + 24, cabY - 10, { font: 'S', align: 'center', color: N.GOLD, shadow: N.VOID });
        }
      }
      // ── the token
      let air = 0, airJump = null;
      for (const [a, d, h] of jumps) if (s >= a && s <= a + d) { air = P.arc(s - a, d, h); airJump = [a, d]; }
      let pose = `token_${P.RUN[s % 4]}`, hx = HERO_X, hy = GROUND - 16 - air, flip = false, visible = true;
      if (airJump) {
        const k = s - airJump[0];
        pose = airJump[1] >= 8 ? ['token_jump', 'spin'][k >= 2 && k <= airJump[1] - 3 ? 1 : 0] : 'token_jump';
      }
      const landed = jumps.some(([a, d]) => s === a + d + 1);
      if (landed && !airJump) pose = 'token_land';
      if (so >= 0 && s >= finalJump) {                   // the flip into the slot: up, over, spinning, into the slot
        const k = s - finalJump, slot = { x: cabX + P.CAB.slot.x - 6, y: cabY + P.CAB.slot.y - 4 };
        if (k <= 4) {
          hx = Math.round(lerp(HERO_X, slot.x, k / 4));
          hy = Math.round(lerp(GROUND - 16, slot.y - 8, k / 4) - P.arc(k, 4, 18));
          pose = 'spin';
        } else visible = false;
      }
      if (visible) {
        if (pose === 'spin') P.blit(g, `coin16_${s % 8}of8_plain`, hx - 2, hy - 2);
        else P.blit(g, pose, hx, hy, { flip });
      }
      // banner: 16/16 COLOURS! on beat 4
      const bn = s - B(4);
      if (bn >= 0 && bn < 12) {
        const by = 40 - (bn < 3 ? [6, 2, 0][bn] : 0);
        if (bn < 9 || bn % 2) {
          P.text(g, '16/16 COLOURS!', 160, by, { align: 'center', color: bn % 4 < 2 ? N.GOLD : N.BUBBLE, outline: N.VOID, shadow: N.RUST });
          P.pop(g, '+1000', 160, by + 18, bn, { color: N.BONE, life: 10 });
        }
      }
      g.restore();
      // ── HUD (fixed)
      let score = 0;
      score += filled * 10 + (s >= B(4) ? 1000 : 0);
      for (const bug of bugs) if (s >= bug.at) score += 100;
      for (const b of holdBars) if (b.i === 0) for (let k = 0; k < 4; k++) if (s >= b.s0 + 6 + 3 * k) score += 10;
      const hour = Math.min(71, s);
      hud(P, g, score, filled, hour, s, s >= 66 && so < 0);
      // ── present: mosaic in from rules, stepped zoom into the cabinet screen at the end
      const mos = s < 5 ? [32, 16, 8, 4, 2][s] : 1;
      let zoom = 1;
      const zs = so - B(2.2);
      if (so >= 0 && zs >= 0) zoom = [1, 2, 2, 3, 4, 5, 6, 8, 10, 10][Math.min(9, zs)];
      if (zoom > 1) {
        const sc = P.CAB.screen, zx = cabX + sc.x + sc.w / 2, zy = cabY + sc.y + sc.h / 2;
        scr.tg.setTransform(1, 0, 0, 1, 0, 0); scr.tg.imageSmoothingEnabled = false;
        scr.tg.clearRect(0, 0, P.W, P.H); scr.tg.drawImage(scr.c, 0, 0);
        g.imageSmoothingEnabled = false;
        P.rect(g, 0, 0, P.W, P.H, N.VOID);
        g.drawImage(scr.t, Math.round(P.W / 2 - zx * zoom), Math.round(P.H / 2 - zy * zoom), P.W * zoom, P.H * zoom);
      }
      P.present(ctx, scr, env, { mosaic: mos });
    },
  };
})();
