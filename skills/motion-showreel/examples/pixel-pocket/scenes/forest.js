// forest (2 bars, the 30 only): into the trees. The forest pushes the trailhead screen off to the left in five whole
// steps, the way handheld games change screens, and the hiker keeps walking across it between the trunks and the ferns
// (a paper outline keeps the sprite apart from the busy undergrowth; the ferns cover the boots). The canopy is shady
// (light field -0.35) with two light shafts swaying a pixel or two and dust that shows only inside them. The signal
// bars drop one by one, NO SERVICE blinks in the status bar, then the app answers: OFFLINE MAP READY, 12 MB on this
// device. The offline map opens out of this screen next.
(() => {
  const P = POCKET, FEET = 129, SPEED = 28, DIR = [-0.42, 1];
  const SHAFTS = [[150, 9, 1.05], [186, 6, 0.8]];                            // x at the top, half-width, strength
  function startX(e) {
    const S = REEL.plan ? REEL.plan.scenes : [], i = S.findIndex(s => s.id === e.id), p = i > 0 ? S[i - 1] : null;
    return p && p.id === 'trail' && P.trailHiker ? P.trailHiker({ dur: p.dur, beatSec: e.beatSec }).x : 82;
  }
  function paint(f, T, e) {
    const B = e.beatSec, b = T / B + 1e-4, st = Math.floor(T * P.STEP + 1e-6);
    const hx = Math.round(startX(e) + T * SPEED), p = f.span(b, 0, 0.9), pushing = p < 1 && !e.prevOf;
    const nx = Math.max(-16, -Math.floor(st / 3));
    f.layer('forest', Math.max(-10, -2 - Math.floor(st / 6)), -3);
    f.layer('forest_near', nx, -5);
    const sway = Math.round(Math.sin(T * 1.4) * 2);
    f.ambient(-0.35);
    for (const [x, w, s] of SHAFTS) f.shaft(x + sway, 0, DIR[0], DIR[1], w, s * (0.85 + 0.15 * Math.sin(T * 0.9 + x)));
    f.shade();
    // the hiker: a sprite with a paper outline (the forest is too busy for a bare sprite), the ferns back in front
    if (!pushing) { const lit = f.snap(); f.sprite('hiker_sheet', P.walkFrame(T), hx, FEET, { outline: 3 }); f.restore(lit, 'forest_near', nx, -5); }
    // dust: drifting down the shafts, visible only inside them
    for (let i = 0; i < 26; i++) {
      const [x0, w] = SHAFTS[i % 2], along = (T * 5 + f.hash(i) * 150) % 150, off = (f.hash(i + 40) - 0.5) * 1.6 * w;
      const x = Math.round(x0 + sway + DIR[0] * along / Math.hypot(...DIR) + off), y = Math.round(DIR[1] * along / Math.hypot(...DIR));
      if (y > 10 && y < 120 && Math.floor(T * P.STEP + i) % 7) f.px(x, y, 3);
    }
    // ── the status bar loses the signal bar by bar
    const sig = b < 1.8 ? 4 : b < 2.2 ? 3 : b < 2.6 ? 2 : b < 3 ? 1 : 0;
    const tag = b < 3 ? null : b < 4 ? 'NO SERVICE' : 'OFFLINE';
    f.hud({ time: '06:31', sig, bat: 99, tag, tagInv: true, tagOn: b >= 4 || b % 0.5 < 0.3 });
    // ── the app's answer
    const k = f.span(b, 4, 4.4);
    if (f.winOpen(8, 14, 152, 29, k, [84, 28])) {
      f.icon(f.ICON.check, 14, 22); f.text('OFFLINE MAP READY', 23, 20, 0, 1, Math.floor(f.span(b, 4.4, 4.9) * 17 + 1e-6));
      if (b >= 4.9) f.text('12 MB · ON THIS DEVICE', 23, 31, 1, 1, Math.floor(f.span(b, 4.9, 5.4) * 22 + 1e-6));
    }
    // ── in: push the previous screen away to the left, five whole steps
    if (pushing) {
      const a = f.prev(); f.push(a, 240 * p);
      f.sprite('hiker_sheet', P.walkFrame(T), hx, FEET, { outline: 3 });   // the hiker stays on top while the screens move
    }
  }
  P.screens.forest = paint;
  SCENES['forest'] = { draw(ctx, t, env) { P.present(ctx, env, (f, T) => paint(f, T, env)); } };
})();
