// yama (山あい): the place (30-s cut and longer). Wet washes lay the mountain folds from right to left, far range
// first and paler (淡墨), the near ridge darker; a stand of cedars is tapped in, then the near slope in one dry
// stroke (haboku), a roof among the cedars, and moss dots on the beats. Mist drifts across the folds all the while.
// The words soak in as three columns: 山あいの谷に、/ 十の部屋だけの / 小さな宿です。 Out: the scroll pans on.
(() => {
  const at = (env, b) => env.lt - b * env.beatSec;
  const FAR = { key: 'yama-far', x0: -260, x1: 1300, fadeL: 120, fadeR: 360, base: 632, amp: 168, scale: 330, seed: 3, tone: 0.2, fade: 270,
    bumps: [[300, 150, 150], [690, 70, 120], [1010, 40, 160]] };
  const MID = { key: 'yama-mid', x0: 20, x1: 1150, fadeL: 200, fadeR: 300, base: 724, amp: 120, scale: 220, seed: 9, tone: 0.42, fade: 230, texture: 0.5,
    bumps: [[470, 96, 110], [860, 58, 90]] };
  const NEAR = { key: 'yama-near', pts: [[-40, 948], [150, 866], [330, 820], [470, 836], [640, 902], [760, 968]], w: 64,
    press: [0.6, 1.0, 1.15, 1.05, 0.9, 0.7], dur: 0.62, ease: 'ioSine', tone: 0.9, toneEnd: 0.72, dry: 0.95, dryFrom: 0.25, streak: 28,
    end: 'taper', tail: 0.2, head: 0.6, side: -1, bleed: 0.7, edge: 0.6, seed: 71 };
  const NEAR2 = { key: 'yama-near2', pts: [[180, 900], [300, 872], [420, 884]], w: 26, press: [0.7, 1.0, 0.6], dur: 0.3, ease: 'ioSine',
    tone: 0.85, dry: 0.7, dryFrom: 0.3, end: 'taper', tail: 0.3, head: 0.5, bleed: 0.6, seed: 73 };
  // cedars (杉木立) on the mid ridge: vertical dabs, pointed tops, a 1/16-beat stagger
  const CEDARS = [[738, 58, 0.5], [758, 74, 0.62], [779, 52, 0.48], [797, 66, 0.66], [816, 46, 0.5], [884, 50, 0.55], [903, 64, 0.68], [921, 44, 0.5],
    [939, 38, 0.42], [770, 40, 0.8], [905, 36, 0.82]].map(([x, h, tone], i) => ({
    key: 'yama-cedar' + i, x, h, w: 11 + (i % 3) * 2.5 + h * 0.06, press: [0.12, 0.7, 1.0], dur: 0.2, ease: 'outQuint', tone, toneEnd: tone * 0.5,
    dry: 0, end: 'taper', tail: 0.35, head: 0, bleed: 1, bleedBlur: 2.4, edge: 0.4, seed: 80 + i }));
  // the inn among the cedars: a hip roof as one small mass of dark wash (ridge short, eaves long, ends lifting),
  // two posts under the eaves
  function roofLayer(P) {
    return SUMI.layer('yama-roof|' + P.ink, 800, 720, 140, 80, (g) => {
      g.filter = 'blur(1.5px)'; g.fillStyle = rgba(P.ink, 0.16); g.fillRect(828, 752, 88, 30);       // the pale wall under the eaves
      g.filter = 'blur(0.8px)';
      g.beginPath(); g.moveTo(846, 733); g.quadraticCurveTo(870, 729, 896, 733);
      g.lineTo(921, 752); g.quadraticCurveTo(928, 749, 933, 744); g.quadraticCurveTo(873, 761, 811, 744); g.quadraticCurveTo(816, 749, 822, 752); g.closePath();
      g.fillStyle = linear(g, 0, 728, 0, 760, [[0, rgba(P.ink, 0.92)], [1, rgba(P.ink, 0.72)]]); g.fill();
      g.filter = 'none';
    });
  }
  const POSTS = [[832, 758, 784], [912, 758, 784]].map(([x, y0, y1], i) => ({ key: 'yama-post' + i, pts: [[x, y0], [x + 0.5, (y0 + y1) / 2], [x, y1]],
    w: 4, press: [1, 0.9, 0.8], dur: 0.16, ease: 'outQuint', tone: 0.8, dry: 0.2, end: 'stop', head: 0.3, bleed: 0.4, seed: 95 + i }));
  // moss dots (点苔) on beats 3, 3.5 and 4: little blooms on the ridges
  const DOTS = [[[214, 872, 7], [262, 860, 5]], [[540, 680, 6], [585, 672, 8], [612, 690, 5]], [[372, 836, 9], [410, 830, 6]]].map((g, b) =>
    g.map(([x, y, R], i) => ({ key: `yama-dot${b}-${i}`, x, y, R: R * 0.8, seed: 120 + b * 7 + i, tone: 0.86, sat: 0, fall: 0.001, creep: 0.4, tau: 0.18, beat: 3 + b * 0.5 + i * 0.06 })));
  const COLS = [['山あいの谷に、', 1532, 2.5], ['十の部屋だけの', 1444, 3], ['小さな宿です。', 1356, 3.5]];
  const SIZE = 52, LS = 0.22, TOP = 214;
  SCENES['yama'] = {
    draw(ctx, t, env) {
      const P = env.palette, lt = env.lt, cam = SUMI.cam(env, { fx: 700, fy: 720 });
      ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
      SUMI.ground(ctx, env, cam);
      // far and mid ranges: wet washes swept right to left (a slow brush, so the wet edge is seen travelling)
      SUMI.ridge(ctx, FAR, Ease.ioSine(rm(at(env, 0), 0, 1.9)), env, { dir: -1, feather: 420 });
      SUMI.mist(ctx, env, { y: 610, h: 190, a: 0.75, v: 12, phase: 300 });
      SUMI.ridge(ctx, MID, Ease.ioSine(rm(at(env, 0.6), 0, 1.5)), env, { dir: -1, feather: 360 });
      CEDARS.forEach((c, i) => {
        const base = SUMI.ridgeY(MID, env, c.x) + 22, spec = c.spec || (c.spec = { ...c, pts: [[c.x, base - c.h], [c.x + 1.2, base - c.h * 0.5], [c.x, base + 6]] });
        SUMI.stroke(ctx, spec, at(env, 1.25 + i * 0.0625), env);
      });
      const roofK = Ease.outQuint(rm(at(env, 2.6), 0, 0.35));
      if (roofK > 0) { const R = roofLayer(P); SUMI.sweep(ctx, R.c, R.x, R.y, roofK, { dir: 1, feather: 60 }); }
      POSTS.forEach((p, i) => SUMI.stroke(ctx, p, at(env, 2.85 + i * 0.125), env));
      SUMI.mist(ctx, env, { y: 770, h: 170, a: 0.6, v: -8, phase: 900 });
      SUMI.stroke(ctx, NEAR, at(env, 2), env);
      SUMI.stroke(ctx, NEAR2, at(env, 2.45), env);
      DOTS.flat().forEach(d => SUMI.drop(ctx, d, at(env, d.beat), env));
      SUMI.mist(ctx, env, { y: 930, h: 220, a: 0.55, v: 16, phase: 1500 });
      const outAt = env.dur - env.outSec, step = SIZE * (1 + LS), o = { size: SIZE, ls: LS, color: P.ink, stagger: 0.075, dur: 0.75 };
      COLS.forEach(([s, x, b], i) => SUMI.vtext(ctx, s, x, TOP + i * step, at(env, b), { ...o, out: { at: outAt - b * env.beatSec + i * 0.12, stagger: 0.03, dur: 0.9 } }));
      SUMI.end(ctx);
    },
  };
})();
