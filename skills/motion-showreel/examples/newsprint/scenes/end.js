// end (1 bar in the short cut, up to 3 in the 30-s cut; last scene, no out-phase): the end card from the approved
// social copy. The cylinder prints a fresh sheet (beats 0-1.1); beat 1: the nameplate lands; beat 1.5: the Oxford
// rule draws from the centre; beat 2: the headline slug; beat 3: the red rule and the tagline. A small Town Hall
// clock face ticks its minute hand once per beat in red, and the Valley Wire keeps stepping along the foot, so the
// card is never static. When the hold has a full bar, the copy desk's end mark -30- types under the tagline.
(() => {
  const ID = 'end';
  const BLACK = '#1D1B18', RED = '#B9202A';
  const WIRE = 'WICKHAM FERRY — Town Hall clock strikes noon for first time since 1995 · WEATHER — Sunny, high 61 · HARVEST FAIR — Pie contest draws 140 entries, a record';
  const lab = (g, s, x, y, o = {}) => {
    g.font = font(o.size ?? 17, o.weight ?? 800, 'sans'); g.letterSpacing = (o.size ?? 17) * 0.08 + 'px';
    g.fillStyle = o.color || NP.ink(BLACK); g.textAlign = o.align || 'left'; g.fillText(s, x, y);
    const w = g.measureText(s).width; g.letterSpacing = '0px'; g.textAlign = 'left'; return w;
  };

  function clock(g, x, y, r, lt, b) {                                  // ticks on every beat: hand jumps, then settles
    const K = NP.ink(BLACK), R = NP.ink(RED);
    g.save(); g.translate(x, y);
    g.strokeStyle = K; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
    g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, r - 8, 0, TAU); g.stroke();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU, l = i % 3 ? 6 : 12;
      g.lineWidth = i % 3 ? 2 : 4; g.beginPath();
      g.moveTo(Math.sin(a) * (r - 12), -Math.cos(a) * (r - 12)); g.lineTo(Math.sin(a) * (r - 12 - l), -Math.cos(a) * (r - 12 - l)); g.stroke();
    }
    const n = Math.max(0, Math.floor(lt / b)), f = lt < 0 ? 0 : lt / b - n;
    const step = n + Ease.outQuint(clamp(f / 0.18));
    const ma = (step / 60) * TAU, ha = (-0.02 + step / 720) * TAU;      // noon, the minute hand walking off it
    g.lineCap = 'square';
    g.strokeStyle = K; g.lineWidth = 6; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.sin(ha) * r * 0.5, -Math.cos(ha) * r * 0.5); g.stroke();
    g.strokeStyle = R; g.lineWidth = 4; g.beginPath(); g.moveTo(-Math.sin(ma) * 10, Math.cos(ma) * 10); g.lineTo(Math.sin(ma) * r * 0.78, -Math.cos(ma) * r * 0.78); g.stroke();
    g.fillStyle = K; g.beginPath(); g.arc(0, 0, 6, 0, TAU); g.fill();
    g.restore();
  }

  function page(g, env) {
    const b = env.beatSec, lt = env.lt, K = NP.ink(BLACK), R = NP.ink(RED);
    clock(g, 960, 196, 74, lt, b);
    // the nameplate, Grenze Gotisch, lands as one slug on beat 1
    NP.slug(g, 'The Tamsin Valley Courier', 960, 460, lt - 1 * b, { size: 176, weight: 700, fam: env.style.fonts.nameplate, align: 'center', color: K, spread: 4 });
    NP.oxford(g, 220, 504, 1480, Ease.outQuint(rm(lt, 1.5 * b, 2.2 * b)), K, { k: 1.4, from: 'center' });
    NP.slug(g, 'Wickham Ferry’s clock is ticking again', 960, 640, lt - 2 * b, { size: 82, weight: 800, fam: 'display', align: 'center', ls: -82 * 0.012, color: K });
    NP.rule(g, 760, 700, 400, 4, Ease.outQuint(rm(lt, 3 * b, 3.5 * b)), R, { from: 'center' });
    const tg = 'COVERING THE VALLEY SINCE 1891', tn = Math.ceil(clamp((lt - 3 * b) / (0.75 * b)) * tg.length);
    if (tn > 0) {                                                      // centre on the whole line so typing grows rightward
      g.font = font(24, 800, 'sans'); g.letterSpacing = 24 * 0.08 + 'px'; const fw = g.measureText(tg).width; g.letterSpacing = '0px';
      lab(g, tg.slice(0, tn), 960 - fw / 2, 752, { size: 24, color: R });
    }
    const longHold = env.phase.holdDur >= env.barSec - 1e-3;
    if (longHold) {
      const s = '-30-', n = Math.ceil(clamp((lt - env.inSec) / (0.5 * b)) * s.length);
      if (n > 0) { g.font = font(30, 700, 'mono'); g.fillStyle = K; g.textAlign = 'center'; g.fillText(s.slice(0, n).padEnd(4, ' '), 960, 836); g.textAlign = 'left'; }
    }
    NP.tape(g, 0, 930, 1920, WIRE, lt, { size: 30, beatSec: b, label: 'VALLEY WIRE', labelW: 250, lead: 40 });
  }

  SCENES[ID] = {
    draw(ctx, t, env) {
      const P = env.palette, b = env.beatSec, lt = env.lt;
      const s = Math.max(0, lt - 1 * b), m = NP.cam(1.03 - 0.03 * Ease.outQuint(clamp(lt / (2 * b))) + 0.004 * s, 960, 500);
      ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
      NP.paper(ctx, m);
      const L = NP.layer(ID), g = L.g;
      g.setTransform(m); page(g, env); g.setTransform(1, 0, 0, 1, 0, 0);
      const cyl = NP.pressIn(env, { at: -0.15, beats: 1.2 });
      NP.print(ctx, L, { m, clipY: cyl.clipY });
      if (!cyl.done) NP.cylinder(ctx, cyl.y, { t: cyl.t, k: m.a });
      for (const at of [1, 2]) { const k = lt - at * b; if (k >= 0 && k < 0.3) env.fx.shake = Math.max(env.fx.shake || 0, 3 * Math.exp(-k * 18)); }
    },
  };
})();
