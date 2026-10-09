// gun (hook, 2 bars in every cut): the start. Beats 0-2 count down 3, 2, 1: each numeral slams on its beat (timing
// beep) while the race stripes build one bar per beat (orange, white, orange: the brand mark). Beat 3 is the gun:
// a white muzzle flash and a shake, the stripes launch forward (left to right), the race clock slams in at 0:00:00.0
// and runs in real time from the gun; speed lines start streaming. The last beat is the first half of the stripe
// stinger (race stripes, then a Track Black field) that the splits scene finishes after the cut.
(() => {
  const STINGER = (P) => ({ field: P.bg, lead: [[P.accent, 74], [P.accent2, 36], [P.accent, 36]], trail: [[P.accent, 18]] });

  SCENES['gun'] = {
    draw(ctx, t, env) {
      const P = env.palette, K = window.V42, b = env.beatSec, lt = env.lt;
      const at = (n) => lt - n * b;
      const gun = at(3);                                        // seconds since the gun (negative before)

      ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);

      // world camera: still during the countdown, a steady push from the gun (constant rate: same speed in any cut)
      const push = 1 + 0.035 * Math.max(0, gun);
      ctx.save();
      ctx.translate(W / 2, H / 2); ctx.scale(push, push); ctx.translate(-W / 2, -H / 2);

      // speed lines stream from the gun on (density ramps over half a second)
      K.speedLines(ctx, lt, { density: clamp(gun / 0.45), color: P.ink, alpha: 0.85, seed: 3, speed: 1.15 });

      // ── race stripes: one bar per countdown beat, launched forward by the gun
      const SX = 300, SY = 842, SH = 560, SW = 82, SG = 40;
      const cols = [P.accent, P.accent2, P.accent];
      for (let i = 0; i < 3; i++) {
        const k = at(i);                                        // bar i lands on beat i
        if (k < -0.1) continue;
        const drop = k < 0 ? Ease.inQ(clamp((k + 0.1) / 0.1)) : 1;
        const launch = gun > -0.02 ? Ease.inExpo(clamp((gun + 0.02 - i * 0.025) / 0.3)) : 0;
        const x = SX + i * (SW + SG) + launch * 2600, y = SY - (1 - drop) * 380;
        const stretch = 1 + launch * 5;                         // the bar stretches into a streak as it launches
        ctx.save();
        if (launch > 0) { ctx.globalAlpha *= 1 - Ease.inQ(clamp(launch * 1.4 - 0.4)); }
        K.plate(ctx, x - (stretch - 1) * SW, y, SW * stretch, SH); ctx.fillStyle = cols[i]; ctx.fill();
        ctx.restore();
        if (k >= 0 && k < 0.18 && launch === 0) {                 // landing tick: a short brake mark under the bar
          const q = k / 0.18;
          ctx.fillStyle = rgba(cols[i], 0.9 * (1 - q));
          ctx.fillRect(x - 60 * Ease.outExpo(q), SY + 14, 60 * Ease.outExpo(q) + SW, 6);
        }
      }

      // ── countdown numerals: 3, 2, 1 slam on beats 0, 1, 2; each is knocked out to the left by the next
      const NX = 1110, NY = 842, NS = 860;
      ['3', '2', '1'].forEach((s, i) => {
        const tl = at(i), exitT = at(i + 1) + 0.05;             // the next numeral (or the gun) knocks it out
        if (tl < -0.12) return;
        if (exitT > 0.16) return;
        let x = NX, sx = 1, fade = 1;
        // exit: fly fully past the left edge and fade over the last stretch, so nothing vanishes on screen (QA pop)
        if (exitT > 0) { const q = clamp(exitT / 0.16), e = Ease.inQ(q); x -= e * 2900; sx = 1 + e * 0.8; fade = 1 - Ease.inQ(clamp((q - 0.45) / 0.55)); }
        const draw = (g) => {
          if (exitT > 0) for (let j = 1; j <= 3; j++) {            // motion trail while it flies out
            withAlpha(g, 0.16 / j, () => K.tab(g, s, j * 70, 0, { size: NS, weight: K.BLACK, color: P.ink, align: 'center' }));
          }
          g.scale(sx, 1);
          K.tab(g, s, 0, 0, { size: NS, weight: K.BLACK, color: P.ink, align: 'center' });
        };
        if (exitT > 0) { ctx.save(); ctx.globalAlpha *= fade; ctx.translate(x, NY); draw(ctx); ctx.restore(); }
        else K.slam(ctx, tl, x, NY, draw, { from: 1.75, dx: 260 });
        if (tl >= 0 && exitT <= 0) K.impact(env, tl, { shake: 9 });
      });

      // ── the gun: muzzle flash, shake, the race clock slams in and runs in real time
      if (gun > -0.12) {
        K.impact(env, gun, { shake: 26, zoom: 0.05, flash: 0.75, flashColor: '#FFFFFF' });
        const run = Math.max(0, gun);
        const clockDraw = (g) => K.tab(g, K.hmsT(run), 0, 0, { size: 300, weight: K.BLACK, color: P.ink, align: 'center', ls: -3 });
        K.slam(ctx, gun, W / 2, 610, clockDraw, { from: 1.6, dx: 0 });
        // the start line shoots out from the centre, the distance plate lands under it
        const sl = Ease.outExpo(clamp(gun / 0.3));
        if (gun >= 0) {
          ctx.fillStyle = P.ink;
          ctx.fillRect(W / 2 - 860 * sl, 676, 1720 * sl, 8);
          const pt = gun - b * 0.5;                             // half a beat after the gun
          if (pt > -0.1) {
            const e = Ease.outExpo(clamp((pt + 0.1) / 0.3)), px = lerp(W + 200, W / 2 - 190, e);
            K.plate(ctx, px, 812, 380, 92); ctx.fillStyle = P.accent; ctx.fill();
            K.tab(ctx, '42.195 KM', px + 92 * K.LEAN + 190, 885, { size: 76, weight: K.BLACK, color: P.onAccent, align: 'center' });
          }
        }
      }
      ctx.restore();

      // ── kicker (screen-fixed): the race, the date, the gun time and the start (README line, verbatim)
      const kx = 96, ke = Ease.outExpo(clamp((lt + 0.25) / 0.45));  // already moving at frame 0, settled by beat 0.6
      ctx.save();
      ctx.beginPath(); ctx.rect(kx - 10, 60, 1100, 140); ctx.clip();
      const kdx = (1 - ke) * 420;
      K.plate(ctx, kx + kdx, 140, 14, 42); ctx.fillStyle = P.accent; ctx.fill();
      text(ctx, 'VELMORA CITY MARATHON', kx + 40 + kdx, 136, { size: 34, weight: K.LABEL, fam: 'display', color: P.ink, ls: 34 * 0.12 });
      text(ctx, 'SUN 18 APR 2027 · GUN 07:00 · HARBOUR GATE', kx + 40 + kdx * 1.3, 176, { size: 24, weight: K.LABEL, fam: 'display', color: P.muted, ls: 24 * 0.12 });
      ctx.restore();

      // ── out-phase: the stripe stinger covers the frame (the splits scene uncovers it after the cut)
      K.stinger(ctx, K.stingerOut(env, b), STINGER(P));
    },
  };
})();
