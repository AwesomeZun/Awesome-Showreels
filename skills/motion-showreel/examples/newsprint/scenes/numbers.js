// numbers (2 bars in the short cut, up to 4 in the 30-s cut): the By the numbers sidebar, set at poster size.
// The cylinder prints a fresh sheet (pressIn, beats 0-1.2): the red flag, the Oxford rule and the six-column rules.
// Then one figure lands per beat as a cast slug, beats 1-6, its label typing under it; 312 (pies) is the one red
// figure and hits hardest. The Valley Wire tape steps along the foot one character per 16th note the whole time.
// Hold: a slow push; when the hold has a full bar, Priya Raman's quote lands on its first bar line. Out: the sheet
// is pulled off the press. Copy verbatim from source/front-page.md (sidebar, lead story, Valley Wire).
(() => {
  const ID = 'numbers';
  const BLACK = '#1D1B18', RED = '#B9202A';
  const M = 96, CW = (1920 - 2 * M) / 3;
  const FIG = [
    ['31', 'YEARS THE CLOCK STOOD SILENT'],
    ['46', 'VOLUNTEERS, AGES 16 TO 86'],
    ['1,400', 'HOURS LOGGED IN THE TOWER'],
    ['5', 'TRIES TO CUT THE NEW ESCAPEMENT WHEEL'],
    ['312', 'PIES SOLD AT THE SATURDAY MARKET'],
    ['$18,250', 'RAISED IN ALL'],
  ];
  const WIRE = 'WICKHAM FERRY — Town Hall clock strikes noon for first time since 1995 · HARLOW — School board adds second morning bus route · ASHGROVE — Mill Road covered bridge reopens to bikes Monday · WEATHER — Sunny, high 61';

  const lab = (g, s, x, y, o = {}) => {
    g.font = font(o.size ?? 17, o.weight ?? 800, 'sans'); g.letterSpacing = (o.size ?? 17) * 0.08 + 'px';
    g.fillStyle = o.color || NP.ink(BLACK); g.textAlign = o.align || 'left'; g.fillText(s, x, y);
    const w = g.measureText(s).width; g.letterSpacing = '0px'; g.textAlign = 'left'; return w;
  };
  const camera = (env) => {
    const s = Math.max(0, env.lt - 1 * env.beatSec);
    return NP.cam(1 + 0.006 * s, 960, 520 + 4 * s);
  };

  function page(g, env) {
    const b = env.beatSec, lt = env.lt, K = NP.ink(BLACK), R = NP.ink(RED);
    // head: flag, kicker line, Oxford rule
    NP.flag(g, 'BY THE NUMBERS', M, 132, { size: 20 });
    g.font = `italic 400 34px ${FAM.serif}`; g.fillStyle = NP.ink('#4A4640'); g.textAlign = 'right';
    g.fillText('Restoring the Town Hall clock, 2025-26', 1920 - M, 124); g.textAlign = 'left';
    NP.oxford(g, M, 156, 1920 - 2 * M, Ease.outQuint(rm(lt, 0.2 * b, 1.1 * b)), K, { k: 1.3 });
    // the grid: three columns, two rows, 0.5-pt column rules
    for (let c = 1; c < 3; c++) NP.vrule(g, M + c * CW, 210, 600, 1.2, Ease.outQuint(rm(lt, 0.4 * b, 1.4 * b)), K);
    NP.rule(g, M, 510, 1920 - 2 * M, 1.2, Ease.outQuint(rm(lt, 0.5 * b, 1.5 * b)), K);
    FIG.forEach(([n, s], i) => {
      const at = (1 + i) * b, col = i % 3, row = Math.floor(i / 3);
      const x = M + col * CW + (col ? 34 : 0), y = 400 + row * 300, red = i === 4;
      const k = lt - at;
      g.font = font(168, 800, 'display'); g.letterSpacing = -168 * 0.02 + 'px';
      const fz = Math.min(168, 168 * (CW - 70) / g.measureText(n).width); g.letterSpacing = '0px';
      NP.slug(g, n, x - 4, y, k, { size: fz, weight: 800, fam: 'display', ls: -fz * 0.02, color: red ? R : K, spread: red ? 5 : 3, from: 0.1 });
      const tp = clamp((k - 0.05) / (0.8 * b));                      // label types under the figure, Libre Franklin caps
      if (tp > 0) {
        const words = s.length > 26 ? [s.slice(0, s.lastIndexOf(' ', 26)), s.slice(s.lastIndexOf(' ', 26) + 1)] : [s];
        const total = words.join('').length, shown = Math.ceil(tp * total);
        let left = shown;
        words.forEach((wd, j) => { if (left > 0) lab(g, wd.slice(0, left), x, y + 46 + j * 26, { size: 18, color: red ? R : K }); left -= wd.length; });
      }
    });
    // the hold's quote (only when the hold has a full bar): Priya Raman, set as a pull quote under a red rule
    const longHold = env.phase.holdDur >= env.barSec - 1e-3, qp = Ease.outQuint(rm(lt, env.inSec, env.inSec + 0.6 * b));
    if (longHold && qp > 0) {
      g.save(); g.fillStyle = NP.ink('#EFECE4'); g.fillRect(M + CW + 2, 512, 2 * CW, 330 * qp); g.restore();
      NP.rule(g, M + CW + 34, 560, 2 * CW - 34 - 10, 4, qp, R);
      g.save(); g.beginPath(); g.rect(M + CW + 20, 566, 2 * CW, 260); g.clip();
      NP.slug(g, '“The first four came out wrong.', M + CW + 34, 650 + (1 - qp) * 40, lt - env.inSec, { size: 58, weight: 600, fam: 'serif', color: K, from: 0.08, scale0: 1 });
      NP.slug(g, 'The fifth one ticks.”', M + CW + 34, 718 + (1 - qp) * 40, lt - env.inSec - 0.5 * b, { size: 58, weight: 800, fam: 'serif', color: R, from: 0.1 });
      const by = '— PRIYA RAMAN, 17, WHO RAN THE MILL', bn = Math.ceil(clamp((lt - env.inSec - 1 * b) / (1.2 * b)) * by.length);
      if (bn > 0) lab(g, by.slice(0, bn), M + CW + 34, 782, { size: 17, color: NP.ink('#625D55') });
      g.restore();
    }
    lab(g, 'SOURCE: WICKHAM FERRY CLOCK COMMITTEE RECORDS', M, 892, { size: 14, weight: 600, color: NP.ink('#625D55') });
    // the Valley Wire along the foot
    NP.tape(g, 0, 930, 1920, WIRE, lt + 0.5 * b, { size: 30, beatSec: b, label: 'VALLEY WIRE', labelW: 250, lead: 64 });
  }

  SCENES[ID] = {
    draw(ctx, t, env) {
      const P = env.palette, b = env.beatSec, lt = env.lt, m = camera(env);
      ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
      const L = NP.layer(ID), g = L.g;
      const paint = (c) => {
        NP.paper(c, m);
        g.setTransform(m); page(g, env); g.setTransform(1, 0, 0, 1, 0, 0);
      };
      if (env.phase.out > 0) {
        NP.paper(ctx);
        NP.pullSheet(ctx, (c) => { paint(c); NP.print(c, L, { m }); }, NP.pressOut(env));
      } else {
        paint(ctx);
        const cyl = NP.pressIn(env, { at: -0.15, beats: 1.25 });
        NP.print(ctx, L, { m, clipY: cyl.clipY });
        if (!cyl.done) NP.cylinder(ctx, cyl.y, { t: cyl.t });
      }
      for (let i = 0; i < 6; i++) {                                   // each figure presses the page
        const k = lt - (1 + i) * b, amp = i === 4 ? 4 : 2;
        if (k >= 0 && k < 0.3) env.fx.shake = Math.max(env.fx.shake || 0, amp * Math.exp(-k * 18));
      }
    },
  };
})();
