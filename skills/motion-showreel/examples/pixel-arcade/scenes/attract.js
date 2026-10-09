// attract (2 bars, fixed; the hook and the poster): the jam's attract screen comes to life.
// Beat 0 the CRT powers on into a starfield under the 1UP / HI-SCORE / 2UP row; the GOLD token drops in and spins over
// a blinking INSERT COIN (lands on beat 1). Beat 2 it falls into the coin slot: CLINK on beat 3, CREDIT 00 -> 01. The
// lockup ONE CREDIT / JAM falls from above and slams on the bar-2 downbeat (beat 4) with a whole-pixel world shake;
// PRESS START from beat 5, a shine across the logo on beat 6, and on beat 7 the start is pressed: the screen walks up
// the palette to BONE (the rules scene opens from that white).
// Everything moves on the 12-fps step clock (5 steps a beat); the CRT power-on runs at 60 fps.
(() => {
  SCENES['attract'] = {
    draw(ctx, t, env) {
      const P = OCJ, N = P.N, scr = P.screen(), g = scr.g;
      const s = Math.max(0, P.step(env.lt)), B = b => P.sb(env, b);
      const [wx, wy] = P.shakeAt(s - B(4), 1.4);                     // the world shakes, the HUD row stays
      // ── stage
      g.save(); g.translate(wx, wy);
      P.stars(g, s, { n: 96, y0: 24, y1: 160 });
      // the coin slot (a little coin door under the prompt)
      const slot = { x: 160, y: 132 };
      const lit = s >= B(3) && s < B(3) + 3;
      P.rect(g, slot.x - 11, slot.y - 6, 22, 16, N.NIGHT);
      P.rect(g, slot.x - 10, slot.y - 5, 20, 14, N.SLATE);
      P.rect(g, slot.x - 10, slot.y - 5, 20, 1, N.FOG);
      P.rect(g, slot.x - 2, slot.y - 3, 4, 10, N.VOID);
      P.rect(g, slot.x - 1, slot.y - 2, 2, 8, lit ? (s - B(3) < 1 ? N.BONE : N.GOLD) : N.EMBER);
      // the token: drops in (lands on beat 1, one bounce), hovers and spins, falls into the slot on beat 3
      if (s < B(3)) {
        let y = 52, frame = s % 8;
        if (s < B(1)) y = 52 - P.fall(s, B(1), 90, B(1));
        else if (s < B(1) + 3) y = 52 - [0, 4, 2][s - B(1)];
        else if (s < B(2)) y = 52 + [0, -1, -1, 0, 1, 1][(s - B(1) - 3) % 6];
        else {                                                         // the fall into the slot, spinning faster
          const k = s - B(2);
          y = 52 + Math.round(74 * Math.pow(k / 5, 2));
          frame = (s * 2) % 8;
        }
        const top = y - 18;
        g.save(); g.beginPath(); g.rect(0, 0, P.W, slot.y - 3); g.clip();   // it disappears into the slot
        P.blit(g, `coin32_${frame}of8`, 160 - 18, top);
        g.restore();
      }
      if (lit) P.burst(g, slot.x, slot.y - 4, s - B(3), { n: 12, up: true, spread: 2.2, speed: 2.4, colors: [N.GOLD, N.BONE, N.EMBER], seed: 3 });
      // the lockup: ONE CREDIT / JAM fall together and slam on beat 4; JAM dips, ONE CREDIT bounces
      if (s >= B(4) - 4) {
        const dy = P.fall(s, B(4), 120, 4), ds = s - B(4);
        const dip = ds >= 0 && ds < 3 ? [2, 1, 0][ds] : 0, hop = ds >= 0 && ds < 4 ? [0, -3, -2, -1][ds] : 0;
        const shine = s >= B(6) && s < B(6) + 7 ? (s - B(6)) * 32 - 20 : null;
        P.logo(g, 160, 42, { dyTop: -dy + hop, dyJam: -dy + dip, shine });
        if (ds >= 0) {                                                  // dust off the slam
          P.burst(g, 112, 92, ds, { n: 8, spread: 1.2, up: true, speed: 2, colors: [N.FOG, N.SLATE, N.BONE], seed: 11, life: 6 });
          P.burst(g, 208, 92, ds, { n: 8, spread: 1.2, up: true, speed: 2, colors: [N.FOG, N.SLATE, N.BONE], seed: 17, life: 6 });
        }
        if (shine !== null) {                                           // glints at the corners while the shine passes
          const k = s - B(6);
          P.blit(g, `spark${[2, 1, 0, 0, 1, 2, 2][k]}`, 222, 46);
          P.blit(g, `spark${[2, 2, 1, 0, 0, 1, 2][k]}`, 96, 86);
        }
      }
      g.restore();
      // ── prompts (fixed to the screen like the HUD)
      if (s < B(3) && P.blink(s, 10, 6)) P.text(g, 'INSERT COIN', 160, 108, { align: 'center', color: N.BONE, shadow: N.NIGHT });
      if (s >= B(5)) {
        const pressed = s >= B(7);
        if (pressed ? s % 2 === 0 : P.blink(s - B(5), 4, 3)) P.text(g, 'PRESS START', 160, 108, { align: 'center', color: pressed ? N.BONE : N.GOLD, shadow: N.RUST });
      }
      // ── HUD row and credits
      P.hudTop(g, { score: 0, hi: 72016 });
      const credit = s >= B(3) ? 1 : 0;
      const flashC = s >= B(3) && s < B(3) + 6 && s % 2 === 0;
      P.text(g, `CREDIT ${P.pad(credit, 2)}`, 312, 168, { align: 'right', color: flashC ? N.GOLD : N.FOG });
      P.text(g, 'PHOSPHOR CLUB', 8, 170, { font: 'S', color: N.FOG });
      // ── present: power-on at 60 fps, white-out from beat 7 (one palette step per step)
      const po = P.powerOn(env.lt);
      const flash = s >= B(7) ? Math.min(1, (s - B(7) + 1) / 4) : s === B(4) ? 0.25 : 0;
      P.present(ctx, scr, env, { flash, power: po.power, boost: po.boost, spot: po.spot });
    },
  };
})();
