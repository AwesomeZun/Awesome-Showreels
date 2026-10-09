// hiscore (2 bars in the short cut, 4 in the 30-s cut): the entry's HIGH SCORE table, then the jam's end card.
// Opens inside the cabinet screen play zoomed into: full-screen raster bars (README "Every entry gets its own HIGH
// SCORE table"). Beat 0 the bars squeeze into a band; HIGH SCORES falls and slams on beat 1 (whole-pixel shake).
// Rows 1ST-3RD (fictional initials) drop in on beats 2, 2.5 and 3; on beat 3.5 the YOU row's initials spin like reels
// and lock on beat 4 while its score counts up from 0 (CLINK + coin pops).
// Hold (30-s cut): each bar line lights the next row and types one line of the jam's dates into the ticker.
// Out (3 beats, the same in every cut): the table closes in blinds, the ONE CREDIT JAM lockup slams with the date
// FRI 13 NOV · 18:00 UTC and a blinking INSERT COIN, and the CRT powers off over the last 0.34 s.
(() => {
  const ROWS = [
    { r: '1ST', n: 'ZIP', v: 72016, c: 'GOLD' },
    { r: '2ND', n: 'MOX', v: 64200, c: 'SKY' },
    { r: '3RD', n: 'KAI', v: 51850, c: 'LIME' },
  ];
  const TICKER = ['ENTRIES CLOSE MON 16 NOV 18:00 UTC', 'PLAYING WEEK: MON 16 → MON 23 NOV', 'TOP 3 GET THE GOLDEN TOKEN'];
  const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  SCENES['hiscore'] = {
    draw(ctx, t, env) {
      const P = OCJ, N = P.N, scr = P.screen(), g = scr.g;
      const s = Math.max(0, P.step(env.lt)), B = b => P.sb(env, b), out = P.outStep(env), end = P.endStep(env);
      const youScore = env.cut === 'short' ? 1260 : 1400;
      const [wx, wy] = s >= out ? P.shakeAt(s - out - B(1), 1.4) : P.shakeAt(s - B(1), 1.2);
      // ── backdrop: raster bars squeeze from full screen into a 40-px band behind the title (beat 0 .. 1)
      P.rect(g, 0, 0, P.W, P.H, N.VOID);
      P.stars(g, s, { n: 60, y0: 0, y1: P.H, speed: 0.5 });
      const sq = Math.min(1, s / B(1));
      const bh = Math.round(P.H - (P.H - 40) * sq), by = Math.round(4 * sq);
      P.raster(g, 0, by, P.W, bh, s, { unit: sq < 1 ? 3 : 1, n: 4, amp: bh * 0.32, dim: sq >= 1 ? 1 : 0 });
      g.save(); g.translate(wx, wy);
      if (s < out) {
        // title: falls in, slams on beat 1
        const head = P.bigWord('HIGH SCORES', 2, { ramp: 'gold', depth: 3 });
        const dy = P.fall(s, B(1), 70, B(1)), ds = s - B(1);
        const dip = ds >= 0 && ds < 3 ? [3, 1, 0][ds] : 0;
        P.drawWord(g, head, 160 - head.tw / 2, 17 - dy + dip, { shine: ds >= 8 && ds < 16 ? (ds - 8) * 22 - 10 : null, width: 4 });
        if (ds >= 0) P.burst(g, 160, 32, ds, { n: 14, spread: 2.8, up: true, speed: 2.6, colors: [N.GOLD, N.BONE, N.EMBER], seed: 21, life: 7 });
        // header row
        if (s >= B(1.5)) {
          P.text(g, 'RANK', 52, 58, { font: 'S', color: N.FOG });
          P.text(g, 'NAME', 132, 58, { font: 'S', color: N.FOG });
          P.text(g, 'SCORE', 268, 58, { font: 'S', color: N.FOG, align: 'right' });
          P.rect(g, 48, 66, 224, 1, N.SLATE);
        }
        // the lit row in the hold, one per bar line
        let active = -1, since = 99, ti = -1;
        onBars(env, 1, (i, dt) => { active = i % 4; ti = i % TICKER.length; since = Math.floor(dt * P.STEP_FPS + 1e-3); });
        const rows = [...ROWS, { r: '4TH', n: 'YOU', v: youScore, c: 'BUBBLE', you: true }];
        rows.forEach((row, i) => {
          const at = B(2 + i * 0.5), ds2 = s - at;
          if (ds2 < 0) return;
          const y = 76 + i * 18 - (ds2 < 3 ? [-8, 3, 0][ds2] : 0);
          const on = active === i;
          if (on) P.rect(g, 44, y - 3, 232, 13, since < 4 && since % 2 === 0 ? N.SLATE : N.NIGHT);
          const colr = on ? N.BONE : N[row.c];
          P.text(g, row.r, 52, y, { color: colr, shadow: N.VOID });
          let name = row.n;
          if (row.you && s < B(4)) name = [0, 1, 2].map(k => ABC[Math.floor(P.rnd(s, k) * 26)]).join('');
          P.text(g, name, 132, y, { color: row.you ? (s < B(4) ? N.FOG : N.BUBBLE) : colr, shadow: N.VOID });
          let v = row.v;
          if (row.you) v = s < B(4) ? 0 : Math.min(row.v, Math.round(row.v * Math.min(1, (s - B(4)) / 6) / 10) * 10);
          P.text(g, P.pad(v), 268, y, { color: on ? N.BONE : row.you ? N.BONE : N.FOG, shadow: N.VOID, align: 'right' });
          if (row.you && s >= B(4)) {
            const k = s - B(4);
            P.burst(g, 150, y + 3, k, { n: 12, up: true, spread: 2.4, speed: 2.6, colors: [N.BUBBLE, N.GOLD, N.BONE], seed: 31 });
            P.pop(g, 'NEW!', 296, y + 1, k, { color: N.GOLD, life: 14 });
            if (P.blink(s, 6, 4)) P.blit(g, `coin16_${s % 8}of8_plain`, 24, y - 4);
          }
          if (on && since < 8) P.blit(g, `spark${[2, 1, 0, 0, 1, 2, 2, 2][since]}`, 40, y - 2);
        });
        // ticker
        P.rect(g, 0, 150, P.W, 30, N.NIGHT); P.rect(g, 0, 150, P.W, 1, N.SLATE);
        if (ti >= 0) P.text(g, P.typed(TICKER[ti], since, 3), 160, 160, { align: 'center', color: N.SKY, shadow: N.VOID });
        else if (s >= B(4)) P.text(g, P.blink(s, 10, 6) ? 'ENTER YOUR INITIALS' : '', 160, 161, { align: 'center', font: 'S', color: N.FOG });
      } else {
        // ── end card: logo slams one beat into the out-phase, date types, INSERT COIN blinks
        const k = s - out, land = B(1);
        const dy = P.fall(k, land, 120, 3), dk = k - land;
        const dip = dk >= 0 && dk < 3 ? [2, 1, 0][dk] : 0, hop = dk >= 0 && dk < 4 ? [0, -3, -2, -1][dk] : 0;
        P.logo(g, 160, 40, { dyTop: -dy + hop, dyJam: -dy + dip, shine: dk >= 3 && dk < 10 ? (dk - 3) * 32 - 20 : null });
        if (dk >= 0) {
          P.burst(g, 112, 90, dk, { n: 8, spread: 1.2, up: true, speed: 2, colors: [N.FOG, N.SLATE, N.BONE], seed: 41, life: 6 });
          P.burst(g, 208, 90, dk, { n: 8, spread: 1.2, up: true, speed: 2, colors: [N.FOG, N.SLATE, N.BONE], seed: 47, life: 6 });
          P.text(g, P.typed('FRI 13 NOV · 18:00 UTC', dk, 4), 160, 112, { align: 'center', color: N.GOLD, shadow: N.RUST });
          if (P.blink(s, 6, 4)) P.text(g, 'INSERT COIN', 160, 130, { align: 'center', font: 'B', scale: 1, color: N.BONE });
        }
        P.text(g, 'PHOSPHOR CLUB · FICTIONAL', 160, 170, { font: 'S', align: 'center', color: N.SLATE });
      }
      g.restore();
      // the end card keeps the HUD row (the table's title replaces it)
      if (s >= out) P.hudTop(g, { score: youScore, hi: 72016 });
      // ── present: blinds close the table on the out-phase's first beat; CRT power-off at the end
      let cut = null;
      const kb = s - out;
      if (kb >= 0 && kb < B(1)) {
        const h = Math.round(((kb + 1) / B(1)) * 12);
        cut = (x, y) => (y % 12) < h;
      }
      const po = P.powerOff(env.lt, env.dur);
      const flash = s === B(1) || s === out + B(1) ? 0.25 : s < 2 ? 0.5 - s * 0.25 : 0;
      void end;
      P.present(ctx, scr, env, { cut, flash, power: po.power, boost: po.boost, spot: po.spot });
    },
  };
})();
