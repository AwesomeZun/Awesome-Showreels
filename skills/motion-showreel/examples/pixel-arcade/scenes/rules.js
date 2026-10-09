// rules (2 bars in the short cut, 6 in the 30-s cut): THE RULES as four slot reels.
// Opens from attract's white (the palette walks back down in 4 steps) onto the jam page's "info" screen: a COBALT field
// with a NIGHT checker drifting one pixel per step. Four reels spin from beat 0 and lock one per beat: 72 HOURS (beat 1),
// 16 COLOURS (2), 4 CHANNELS (3), 1 CREDIT (4, the biggest hit: whole-pixel shake and a burst). Each column carries a
// living icon (hourglass, the CREDIT-16 grid cycling, a pulse wave, the token blinking). Beat 5: rule 3 types in under the
// reels, "320 × 180 · SQUARE PIXELS · NO SMOOTHING" (this canvas is exactly that).
// Hold (30-s cut): one rule per bar line, its reel lit and its detail typed into the ticker (the jam page's own small
// print, source/site/index.html). Out: the last beat mosaics up into 32-px blocks; play opens from them.
(() => {
  const COLS = [
    { n: '72', label: 'HOURS', ramp: 'gold', icon: 'hourglass', detail: ['FRI 18:00 → MON 18:00 UTC'], c: 'GOLD' },
    { n: '16', label: 'COLOURS', ramp: 'candy', icon: 'palette', detail: ['CREDIT-16 ONLY.', 'DITHER YOUR GRADIENTS.'], c: 'BUBBLE' },
    { n: '4', label: 'CHANNELS', ramp: 'ice', icon: 'wave', detail: ['2 PULSE · TRIANGLE · NOISE'], c: 'SKY' },
    { n: '1', label: 'CREDIT', ramp: 'fire', icon: 'token', detail: ['NO SAVES.', 'NO CONTINUES.'], c: 'CHERRY' },
  ];
  const DIGITS = '0123456789';

  function checker(P, g, s) {
    const N = P.N, off = s % 16;
    P.rect(g, 0, 0, P.W, P.H, N.COBALT);
    g.fillStyle = P.HEX[N.NIGHT];
    for (let y = -16; y < P.H + 16; y += 16) for (let x = -16; x < P.W + 16; x += 16) {
      if (((x + y) / 16) % 2 === 0) g.fillRect(x + off, y + off, 16, 16);
    }
  }

  function icon(P, g, col, x, y, s) {
    const N = P.N;
    if (col.icon === 'hourglass') P.blit(g, `hourglass${Math.floor(s / 3) % 4}`, x, y);
    else if (col.icon === 'palette') P.blit(g, `palette${Math.floor(s / 2) % 16}`, x, y);
    else if (col.icon === 'wave') P.blit(g, `wave${s % 8}`, x, y);
    else P.blit(g, P.blink(s, 23, 2, 7) ? 'token_frontBlink' : 'token_front', x, y);
    void N;
  }

  SCENES['rules'] = {
    draw(ctx, t, env) {
      const P = OCJ, N = P.N, scr = P.screen(), g = scr.g;
      const s = Math.max(0, P.step(env.lt)), B = b => P.sb(env, b), out = P.outStep(env);
      const lockAt = i => B(i + 1);
      const [wx, wy] = P.shakeAt(s - B(4), 1.6);
      checker(P, g, s);
      // header
      P.rect(g, 0, 0, P.W, 22, N.NIGHT);
      P.rect(g, 0, 22, P.W, 1, N.SLATE);
      const head = P.bigWord('THE RULES', 2, { ramp: 'gold', depth: 2 });
      P.drawWord(g, head, 160 - head.tw / 2, 4);
      P.text(g, 'READ THEM, PLAYER 1', 312, 8, { font: 'S', align: 'right', color: N.FOG });
      P.text(g, 'JAM #07', 8, 8, { font: 'S', color: N.SKY });
      // the active rule in the hold: one per bar line, from the first bar line of the hold
      let active = -1, since = 99;
      onBars(env, 1, (i, dt) => { active = i % 4; since = Math.floor(dt * P.STEP_FPS + 1e-3); });
      g.save(); g.translate(wx, wy);
      COLS.forEach((col, i) => {
        const cx = 40 + i * 80, wx0 = cx - 34, wy0 = 52, ww = 68, wh = 40;
        const locked = s >= lockAt(i), ds = s - lockAt(i);
        const on = active === i, ring = on ? (since < 6 && since % 2 === 0 ? N.BONE : N[col.c]) : locked && ds < 2 ? N.BONE : N.SLATE;
        // icon above the window (bobs once when its reel locks)
        const iy = 30 - (ds >= 0 && ds < 3 ? [2, 3, 1][ds] : 0);
        icon(P, g, col, cx - 8, iy, s);
        // window + frame
        P.rect(g, wx0 - 2, wy0 - 2, ww + 4, wh + 4, N.NIGHT);
        P.rect(g, wx0 - 1, wy0 - 1, ww + 2, wh + 2, ring);
        P.rect(g, wx0, wy0, ww, wh, N.VOID);
        g.save(); g.beginPath(); g.rect(wx0, wy0, ww, wh); g.clip();
        if (!locked) {
          // spinning strip: digits stream down 9 px per step, a fresh random digit pair each cell
          const off = (s * 9) % 26;
          for (let k = -1; k < 3; k++) {
            const seed = Math.floor(s * 9 / 26) - k;
            const str = col.n.length === 2 ? DIGITS[Math.floor(P.rnd(seed, i) * 10)] + DIGITS[Math.floor(P.rnd(seed, i + 7) * 10)] : DIGITS[Math.floor(P.rnd(seed, i) * 10)];
            const w = P.bigWord(str, 3, { ramp: 'bone', depth: 2 });
            P.drawWord(g, w, cx - w.tw / 2, wy0 + 9 + k * 26 + off);
          }
          P.rect(g, wx0, wy0, ww, 3, N.NIGHT); P.rect(g, wx0, wy0 + wh - 3, ww, 3, N.NIGHT);
        } else {
          const w = P.bigWord(col.n, 3, { ramp: col.ramp, depth: 2 });
          const bounce = ds < 4 ? [-7, 3, -1, 0][ds] : 0;
          P.drawWord(g, w, cx - w.tw / 2, wy0 + 9 + bounce, { shine: on && since < 6 ? since * 12 - 6 : null, width: 3 });
        }
        g.restore();
        // label: pops on the lock, its colour from the jam page's rule cards
        if (locked) P.text(g, col.label, cx, wy0 + wh + 7, { align: 'center', color: on ? N.BONE : N[col.c], shadow: N.NIGHT });
        if (locked && ds < 6) P.burst(g, cx, wy0 + 4, ds, { n: i === 3 ? 18 : 8, up: true, spread: 2.6, speed: i === 3 ? 3.2 : 2.2, colors: [N[col.c], N.BONE], seed: 5 + i });
      });
      g.restore();
      // footer: rule 3 (this canvas is exactly that), then the active rule's small print in the hold
      P.rect(g, 0, 132, P.W, 48, N.NIGHT);
      P.rect(g, 0, 132, P.W, 1, N.SLATE);
      if (s >= B(4) + 1) P.text(g, P.typed('RULE 3: 320 \u00d7 180 \u00b7 SQUARE PIXELS \u00b7 NO SMOOTHING', s - B(4) - 1, 8), 160, 139, { align: 'center', font: 'S', color: N.FOG });
      if (active >= 0) {
        const col = COLS[active], ax = 40 + active * 80;
        P.rect(g, ax - 3, 128, 7, 1, N[col.c]); P.rect(g, ax - 2, 129, 5, 1, N[col.c]); P.rect(g, ax - 1, 130, 3, 1, N[col.c]); P.rect(g, ax, 131, 1, 1, N[col.c]);
        let typedSoFar = 0;
        col.detail.forEach((ln, j) => {
          const shown = P.typed(ln, since - typedSoFar / 3, 3);
          typedSoFar += ln.length;
          if (since - (typedSoFar - ln.length) / 3 >= 0) P.text(g, shown, 160, 152 + j * 12, { align: 'center', color: j ? N.BONE : N[col.c], shadow: N.VOID });
        });
      }
      // present: open from attract's white, mosaic out on the last beat
      const flash = s < 4 ? 1 - s / 4 : 0;
      const mos = s >= out ? [2, 4, 8, 16, 32][Math.min(4, s - out)] : 1;
      P.present(ctx, scr, env, { flash, mosaic: mos });
    },
  };
})();
