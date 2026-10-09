// chaseki (茶席): the tea. A black raku bowl is painted in three gestures: a broad wet body (mokkotsu, the glaze
// highlight left as bare paper) with its contour, the rim, the foot. Pale 利休鼠 tea settles inside, steam rises, and
// the tea-room words soak in as three columns: この一服は、/ 二度とおなじには / なりません。 Hold: the steam keeps
// rising and a fuller breath of steam leaves the bowl on every bar line (its cue). Out: words clear like mist; the
// scroll pans on.
(() => {
  const at = (env, b) => env.lt - b * env.beatSec;
  const CX = 846, RIM = 598, RX = 172, RY = 31;                         // the bowl: rim ellipse, hand-formed body
  const BODY = [[676, 602], [672, 646], [680, 702], [697, 752], [721, 789], [762, 807], [850, 813], [938, 808], [978, 790],
    [1001, 750], [1014, 692], [1021, 636], [1020, 600]];
  const ell = (a0, a1, n, rx = RX, ry = RY, cx = CX, cy = RIM, wob = 0) => {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const a = lerp(a0, a1, i / n), k = 1 + wob * Math.sin(a * 3 + 0.7);
      out.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
    }
    return out;
  };
  const CONTOUR = { key: 'chaseki-contour', pts: BODY, w: 12, press: [0.9, 1.15, 1.2, 1.1, 1.25, 0.95, 0.8, 0.85, 1.1, 0.95, 0.75, 0.6],
    dur: 1.0, ease: 'ioSine', tone: 0.95, toneEnd: 0.82, dry: 0.55, dryFrom: 0.55, streak: 22, end: 'taper', tail: 0.12, head: 0.7, side: -1, bleed: 0.7, seed: 31 };
  const RIMS = { key: 'chaseki-rim', pts: ell(Math.PI * 1.02, Math.PI * 2.86, 26, RX, RY, CX, RIM, 0.025), w: 7, press: [1.2, 1.0, 0.85, 0.75, 0.9, 1.05, 0.8, 0.55],
    dur: 0.55, ease: 'ioSine', tone: 0.95, toneEnd: 0.85, dry: 0.3, dryFrom: 0.6, end: 'taper', tail: 0.18, head: 0.5, bleed: 0.6, seed: 37 };
  const FOOT = { key: 'chaseki-foot', pts: [[786, 818], [850, 823], [916, 818]], w: 12, press: [1.1, 1.0, 0.95], dur: 0.32, ease: 'outQuint',
    tone: 0.93, dry: 0.45, dryFrom: 0.5, end: 'stop', head: 0.8, bleed: 0.5, seed: 41 };
  // The body: three broad side-brush strokes (sokuhitsu) laid across the bowl, clipped to its hand-formed silhouette,
  // the glaze highlight left as bare paper. Kasure comes from the strokes themselves (the ink running out to the
  // right). Built once into a layer that the scene sweeps in like a wide brush.
  const BAND = (key, y, sag, w, dry, dryFrom, seed) => ({ key, pts: [[664, y - 4], [756, y + sag * 0.75], [850, y + sag], [944, y + sag * 0.7], [1032, y - 8]],
    w, press: [0.85, 1.05, 1.0, 0.95, 0.8], tone: 0.93, toneEnd: 0.86, dry, dryFrom, streak: 34, end: 'stop', head: 0.25, side: 1, bleed: 0.35, edge: 0.15, hair: 0.86, seed });
  const BANDS = [BAND('chaseki-b1', 646, 16, 96, 0.45, 0.62, 51), BAND('chaseki-b2', 706, 18, 98, 0.6, 0.5, 52), BAND('chaseki-b3', 764, 22, 88, 0.85, 0.38, 53)];
  function bodyLayer(env) {
    const P = env.palette;
    return SUMI.layer('chaseki-body|' + P.ink, 620, 560, 460, 300, (g) => {
      const path = () => {
        g.beginPath(); g.moveTo(BODY[0][0], BODY[0][1]);
        SUMI.spline(BODY, 10).forEach(q => g.lineTo(q[0], q[1]));
        ell(0, Math.PI, 40).forEach(q => g.lineTo(q[0], q[1] + 2));      // the front lip, right to left
        g.closePath();
      };
      g.save(); path(); g.clip();
      for (const b of BANDS) { const st = SUMI.strokeInfo(b, env); g.drawImage(st.core, st.x0, st.y0); }   // cores only: wet bands merge
      g.globalCompositeOperation = 'destination-out';                   // the glaze catching the window light
      g.save(); g.translate(748, 690); g.scale(0.26, 1); softBlob(g, 0, 0, 130, '#000', 0.42); g.restore();
      g.restore();
    });
  }
  // Inside the rim: the dark inner wall at the back, then the tea with its fine foam.
  function teaLayer(P) {
    return SUMI.layer('chaseki-tea|' + P.accent2, 660, 560, 380, 80, (g) => {
      g.filter = 'blur(1px)';
      g.beginPath(); ell(0, TAU, 60, RX - 6, RY - 4).forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.closePath();
      g.fillStyle = rgba(P.ink, 0.86); g.fill();
      g.beginPath(); ell(0, Math.PI, 40, RX - 1, RY + 1).forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])));
      ell(Math.PI, 0, 40, RX - 8, RY - 5).forEach(q => g.lineTo(q[0], q[1])); g.closePath(); g.fillStyle = rgba(P.ink, 0.55); g.fill();
      g.beginPath(); ell(0, TAU, 60, RX - 22, RY - 9, CX, RIM + 5).forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.closePath();
      g.fillStyle = rgba(P.accent2, 0.95); g.fill(); g.filter = 'none';
      g.save(); g.clip();
      softBlob(g, CX - 30, RIM + 2, 120, mix(P.accent2, P.surface, 0.55), 0.55);
      for (let i = 0; i < 140; i++) {                                     // usucha foam
        const a = hash(i * 1.3 + 50) * TAU, rr = Math.sqrt(hash(i * 2.1 + 51));
        g.fillStyle = rgba(mix(P.accent2, P.surface, 0.45), 0.18 + hash(i * 3.7) * 0.25);
        circle(g, CX + Math.cos(a) * rr * (RX - 26), RIM + 5 + Math.sin(a) * rr * (RY - 11), 0.5 + hash(i * 4.9) * 1.1); g.fill();
      }
      g.restore();
    });
  }
  // Steam: three wisps whose shapes travel upward with time (alive in any hold), plus one fuller breath per bar line.
  function steam(ctx, env, s) {
    const P = env.palette, k = SUMI.sstep(0, 1.6, s);
    if (k <= 0) return;
    for (let w = 0; w < 3; w++) {
      const bx = CX - 50 + w * 48, y0 = RIM - 4, Hh = 300 + w * 30, seed = 3 + w * 11, pts = [];
      for (let j = 0; j <= 36; j++) {
        const v = j / 36, ph = v * 3.0 - s * 0.5 + w * 1.7;
        const sway = (10 + 70 * v) * (SUMI.vn(ph, seed) - 0.5) * 2 + 24 * v * Math.sin(ph * 1.4 + seed);
        pts.push([bx + sway + v * (w - 1) * 30, y0 - v * Hh * Math.min(1, k * 1.3)]);
      }
      const breath = 0.75 + 0.25 * Math.sin(s * 0.9 + w * 2.1);
      const grad = (a) => linear(ctx, 0, y0, 0, y0 - Hh, [[0, rgba(P.ink, 0)], [0.12, rgba(P.ink, a)], [0.5, rgba(P.ink, a * 0.6)], [1, rgba(P.ink, 0)]]);
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
      ctx.filter = 'blur(9px)'; ctx.strokeStyle = grad(0.075 * k * breath); ctx.lineWidth = 30; ctx.stroke();
      ctx.filter = 'blur(2.2px)'; ctx.strokeStyle = grad(0.11 * k * breath); ctx.lineWidth = 3.2; ctx.stroke();
      ctx.restore();
    }
    onBars(env, 1, (i, dt) => {                                         // a fuller breath of steam on the bar line
      if (dt > 3.2) return;
      const u = dt / 3.2, y = RIM - 20 - u * 330, x = CX - 10 + Math.sin(dt * 1.3 + i) * 26 * u;
      ctx.save(); ctx.filter = 'blur(14px)'; ctx.fillStyle = rgba(P.ink, 0.07 * Math.sin(Math.PI * Math.min(1, u * 1.15)));
      ctx.beginPath(); ctx.ellipse(x, y, 40 + 60 * u, 26 + 40 * u, 0.3, 0, TAU); ctx.fill(); ctx.restore();
    });
  }
  const C1 = 'この一服は、', C2 = '二度とおなじには', C3 = 'なりません。';
  const SIZE = 52, LS = 0.22, TOP = 232;
  SCENES['chaseki'] = {
    draw(ctx, t, env) {
      const P = env.palette, lt = env.lt, cam = SUMI.cam(env, { fx: 880, fy: 640 });
      ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
      SUMI.ground(ctx, env, cam);
      // a soft shadow grounds the bowl as the body is painted
      const bodyP = Ease.ioSine(rm(at(env, 0.5), 0, 0.95));
      withAlpha(ctx, bodyP, () => { ctx.save(); ctx.filter = 'blur(14px)'; ctx.fillStyle = rgba(P.ink, 0.09); ctx.beginPath(); ctx.ellipse(CX + 14, 828, 236, 22, 0, 0, TAU); ctx.fill(); ctx.restore(); });
      const L = bodyLayer(env);
      SUMI.sweep(ctx, L.c, L.x, L.y, bodyP, { dir: 1, feather: 160 });
      SUMI.stroke(ctx, CONTOUR, at(env, 0.5), env);
      const teaK = Ease.outQuint(rm(at(env, 2.5), 0, 0.7));
      if (teaK > 0) { const T = teaLayer(P); withAlpha(ctx, teaK, () => ctx.drawImage(T.c, T.x, T.y)); }
      SUMI.stroke(ctx, RIMS, at(env, 1.75), env);
      SUMI.stroke(ctx, FOOT, at(env, 2.25), env);
      steam(ctx, env, at(env, 2.75));
      // the words, three columns right to left, each starting one character lower
      const outAt = env.dur - env.outSec, step = SIZE * (1 + LS), o = { size: SIZE, ls: LS, color: P.ink, stagger: 0.075, dur: 0.75 };
      [[C1, 1512, 3], [C2, 1424, 3.5], [C3, 1336, 4]].forEach(([s, x, b], i) =>
        SUMI.vtext(ctx, s, x, TOP + i * step, at(env, b), { ...o, out: { at: outAt - b * env.beatSec + i * 0.12, stagger: 0.03, dur: 0.9 } }));
      SUMI.end(ctx);
    },
  };
})();
