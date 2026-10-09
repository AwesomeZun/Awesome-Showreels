// press (the hook; 2 bars in every cut): Page A1 of the Sunday Courier comes off the press.
// Beat 0: an inked cylinder rolls down a blank sheet and leaves the page behind it (nameplate, Oxford rule, folio,
// the halftone photo, columns, the By the numbers rail) while the camera eases back from the masthead. Beat 1.5:
// the red plate lays the folio rule. Beats 2 and 3: the two headline lines land as cast slugs. Beat 3.5: the deck.
// Beat 4: the red LOCAL flag. Beat 4.5: the byline types. Then the camera drifts toward the photo, which is the
// zoomInto window into the next scene (portal()). All copy is verbatim from source/front-page.md.
(() => {
  const ID = 'press';
  const BLACK = '#1D1B18', RED = '#B9202A';
  const M = 72, COL = 276, GUT = 24, colX = (i) => M + i * (COL + GUT), RIGHT = 1848;
  const PHOTO = { x: M, y: 548, w: 876, h: 876 * 9 / 16 };
  const BODY = [
    { dateline: 'WICKHAM FERRY —', text: 'At noon Saturday, the clock in the Wickham Ferry Town Hall tower struck 12 for the first time since an ice storm stopped it in January 1995.' },
    { text: 'About 300 people stood in Ferry Street to hear it. Some counted the strikes out loud. When the 12th one faded, the crowd applauded, and a few people cried.' },
    { text: '“I wound that clock every Saturday when I was 14,” said Walter Pruitt, 81, a retired machinist who led the restoration. “When it stopped, it felt like the town stopped listening to itself.”' },
    { text: 'The clock went silent on Jan. 7, 1995, when ice snapped the cable that holds its drive weight. The falling weight cracked the escapement wheel, the part that lets the gears turn one tooth at a time. Repair estimates over the years ran as high as $90,000, and the town never budgeted for one.' },
    { text: 'The restoration took 14 months and 46 volunteers, ages 16 to 86, who logged about 1,400 hours in the tower, according to the Wickham Ferry Clock Committee’s records. They cleaned and rebuilt the 1904 movement, rehung the 1,100-pound bell and reglazed all four 6-foot dials.' },
    { text: 'Students in the Tamsin Valley High School robotics club cut a replacement escapement wheel on the school’s milling machine, working from measurements of the cracked original.' },
    { text: '“We had to make a part nobody has made in 120 years,” said Priya Raman, 17, who ran the mill. “The first four came out wrong. The fifth one ticks.”' },
    { text: 'The committee raised $18,250. About $11,200 of it came from 312 pies sold at the Saturday market by bakers from the Wickham Ferry Grange.' },
  ].map((p) => ({ ...p, text: NP.hy(p.text) }));
  const SPEC = { paras: BODY, x: colX(3), y: 638, colW: COL, gutter: GUT, cols: 2, lineH: 22, size: 16, weight: 400, fam: 'serif',
    maxLines: 26, indent: 14, dateline: { fam: 'sans', weight: 800, size: 12.5, ls: 0.6 } };
  const NUMBERS = [['31', 'years the clock stood silent'], ['46', 'volunteers, ages 16 to 86'], ['1,400', 'hours logged in the tower'],
    ['312', 'pies sold at the Saturday market'], ['$18,250', 'raised in all']];
  const BRIEFS = [
    { head: ['School board adds', 'second morning bus', 'route'], dateline: 'HARLOW —', text: 'The Tamsin County School Board voted 5-2 Thursday to add a second morning bus route on the east side of the county.' },
    { head: ['Mill Road covered', 'bridge reopens', 'Monday'], dateline: 'ASHGROVE —', text: 'The Mill Road covered bridge reopens to bicycles and pedestrians Monday after a two-week repair of its deck.' },
  ].map((b) => ({ ...b, text: NP.hy(b.text) }));

  // camera: eases back from the masthead (beats 0-4), then a slow constant push toward the photo
  function camera(env) {
    const b = env.beatSec, lt = env.lt, e = Ease.outQuint(clamp(lt / (4 * b)));
    const s = Math.max(0, lt - 4 * b);
    const k = lerp(1.085, 1.0, e) * (1 + 0.009 * s);
    const fx = 960 - 16 * s, fy = lerp(500, 540, e) + 12 * s;
    return NP.cam(k, fx, fy);
  }
  const lab = (g, s, x, y, o = {}) => {                       // Libre Franklin capitals, tracked +80
    g.font = font(o.size ?? 13.5, o.weight ?? 800, 'sans'); g.letterSpacing = (o.size ?? 13.5) * (o.track ?? 0.08) + 'px';
    g.fillStyle = o.color || NP.ink(BLACK); g.textAlign = o.align || 'left'; g.fillText(s, x, y);
    const w = g.measureText(s).width; g.letterSpacing = '0px'; g.textAlign = 'left'; return w;
  };
  const ser = (g, s, x, y, o = {}) => {                       // Newsreader
    g.font = `${o.italic ? 'italic ' : ''}${o.weight ?? 400} ${o.size ?? 16}px ${FAM.serif}`; g.letterSpacing = (o.ls ?? 0) + 'px';
    g.fillStyle = o.color || NP.ink(BLACK); g.textAlign = o.align || 'left'; g.fillText(s, x, y);
    const w = g.measureText(s).width; g.letterSpacing = '0px'; g.textAlign = 'left'; return w;
  };

  function page(g, env, lt) {
    const b = env.beatSec, K = NP.ink(BLACK), R = NP.ink(RED), K70 = NP.ink('#4A4640'), K55 = NP.ink('#625D55');
    // skybox
    let x = M;
    x += lab(g, 'OUR VIEW: ', x, 34);
    x += ser(g, 'A town that listens to itself', x, 34, { italic: true, size: 17 }) + 8;
    lab(g, 'A8', x, 34);
    x = RIGHT - lab(g, 'B1', RIGHT, 34, { align: 'right' }) - 8;
    g.font = `italic 400 17px ${FAM.serif}`; const pw = g.measureText('Pie contest results').width;
    ser(g, 'Pie contest results', x - pw, 34, { italic: true, size: 17 });
    lab(g, 'HARVEST FAIR: ', x - pw - 4, 34, { align: 'right' });
    NP.rule(g, M, 50, RIGHT - M, 1);
    // ears
    for (const [ex, head, lines] of [[M, 'WEATHER', ['Sunny and crisp. High', '61, low 38. Details, A2.']],
      [RIGHT - 236, 'INSIDE', ['Valley Life B1 · Sports B4 ·', 'Obituaries A7 · Opinion A8 ·', 'Puzzles C6 · Classifieds C3']]]) {
      g.strokeStyle = K; g.lineWidth = 1; g.strokeRect(ex + 0.5, 70.5, 236, lines.length > 2 ? 100 : 86);
      lab(g, head, ex + 14, 96, { size: 12.5 });
      lines.forEach((s, i) => ser(g, s, ex + 14, 120 + i * 20, { size: 15.5 }));
    }
    // nameplate, Oxford rule, folio, red folio rule (the red plate prints on beat 1.5)
    g.font = `700 104px ${env.style.fonts.nameplate}`; g.textAlign = 'center'; g.fillStyle = K; g.letterSpacing = '0px';
    g.fillText('The Tamsin Valley Courier', 960, 160); g.textAlign = 'left';
    NP.oxford(g, M, 186, RIGHT - M, 1, K);
    const fy = 218;
    lab(g, 'VOL. 135, NO. 284', M, fy, { weight: 700 });
    lab(g, 'HARLOW, TAMSIN COUNTY', 640, fy, { weight: 700, align: 'center' });
    lab(g, 'SUNDAY, OCTOBER 11, 2026', 1280, fy, { weight: 700, align: 'center' });
    lab(g, '$2.00', RIGHT, fy, { weight: 700, align: 'right' });
    NP.rule(g, M, 232, RIGHT - M, 3, Ease.outQuint(rm(lt, 1.5 * b, 2.1 * b)), R);
    // the red LOCAL flag lands on beat 4
    const fk = lt - 4 * b;
    if (fk > -0.1) {
      g.save(); const s = lerp(1.06, 1, Ease.inQ(clamp((fk + 0.1) / 0.1)));
      g.translate(M + 34, 266); g.scale(s, s); g.translate(-(M + 34), -266); g.globalAlpha = clamp((fk + 0.1) / 0.05);
      NP.flag(g, 'LOCAL', M, 280, { size: 14, color: R }); g.restore();
    }
    // headline slugs (beats 2 and 3), deck (beat 3.5), byline (types from beat 4.5)
    const hs = { size: 94, weight: 800, fam: 'display', ls: -94 * 0.012, color: K };
    NP.slug(g, 'Clock tower ticks again', M - 4, 376, lt - 2 * b, hs);
    NP.slug(g, 'after 31 silent years', M - 4, 466, lt - 3 * b, hs);
    const dp = Ease.outQuint(rm(lt, 3.5 * b, 4.2 * b));
    if (dp > 0) {
      g.save(); g.beginPath(); g.rect(M - 10, 488, 1500, 40); g.clip();
      ser(g, 'Volunteers spent 14 months and 1,400 hours restoring Wickham Ferry’s 1904 Town Hall clock', M, 518 + (1 - dp) * 34, { italic: true, size: 31, color: K });
      g.restore();
    }
    const by = 'BY INES CALLOWAY', byn = Math.floor(clamp((lt - 4.5 * b) / (1.25 * b)) * by.length);
    if (byn > 0) lab(g, by.slice(0, byn), colX(3), 572, { size: 13.5 });
    if (lt > 5.25 * b) lab(g, 'COURIER STAFF WRITER', colX(3), 592, { size: 12, weight: 600, color: K55 });
    // the photo (an 85-line screen at 45 degrees) and its cutline
    NP.halftone(g, NP.photo.luma(null, 480, 'still'), PHOTO, { pitch: 11, color: K });
    lab(g, 'NOON, SATURDAY —', M, PHOTO.y + PHOTO.h + 26, { size: 13 });
    ser(g, 'The Wickham Ferry Town Hall clock strikes 12 as about 300 people watch', M + 152, PHOTO.y + PHOTO.h + 26, { size: 15.5, color: K70 });
    // the story in two justified columns, column rules between the stories
    NP.drawColumns(g, NP.columns(g, SPEC), SPEC, { color: K });
    for (const xr of [colX(3) - GUT / 2, colX(4) - GUT / 2]) NP.vrule(g, xr, 548, 760, 1, 1, K);
    NP.vrule(g, colX(5) - GUT / 2, 248, 1060, 1, 1, K);
    // the rail: By the numbers on a Black 15 tint box, then the briefs
    const rx = colX(5);
    g.fillStyle = NP.ink('#CDC8BD'); g.fillRect(rx, 252, COL, 370);
    lab(g, 'BY THE NUMBERS', rx + 14, 280, { size: 12.5 });
    NUMBERS.forEach(([n, s], i) => {
      const y = 330 + i * 66;
      ser(g, n, rx + 14, y, { size: 34, weight: 800 });
      ser(g, s, rx + 14, y + 22, { size: 14.5 });
      if (i < NUMBERS.length - 1) NP.rule(g, rx + 14, y + 36, COL - 28, 0.75, 1, NP.ink('#9A958B'));
    });
    let y = 700;
    for (const br of BRIEFS) {
      NP.rule(g, rx, y - 26, COL, 1, 1, K);
      br.head.forEach((s, i) => ser(g, s, rx, y + i * 23, { size: 21, weight: 700 }));
      y += br.head.length * 23 + 4;
      const spec = { paras: [{ dateline: br.dateline, text: br.text }], x: rx, y, colW: COL, gutter: 0, cols: 1, lineH: 19, size: 14.5, weight: 400, fam: 'serif', maxLines: 12,
        dateline: { fam: 'sans', weight: 800, size: 12, ls: 0.7 } };
      const ls = NP.columns(g, spec);
      NP.drawColumns(g, ls, spec, { color: K });
      y += ls.length * 19 + 46;
    }
  }

  SCENES[ID] = {
    portal(t, env) {                                           // the photo is the window the next scene zooms into
      const m = camera(env), [x0, y0] = NP.apply(m, PHOTO.x, PHOTO.y), [x1, y1] = NP.apply(m, PHOTO.x + PHOTO.w, PHOTO.y + PHOTO.h);
      return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, r: 0 };
    },
    draw(ctx, t, env) {
      const P = env.palette, b = env.beatSec, lt = env.lt, m = camera(env);
      ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
      NP.paper(ctx, m);
      const L = NP.layer(ID), g = L.g;
      g.setTransform(m);
      page(g, env, lt);
      g.setTransform(1, 0, 0, 1, 0, 0);
      const cyl = NP.pressIn(env, { at: -0.18, beats: 1.6, from: -46, to: H + 130 });
      NP.print(ctx, L, { m, clipY: cyl.clipY });
      if (!cyl.done) NP.cylinder(ctx, cyl.y, { t: cyl.t, k: m.a });
      // the slugs press the page: a 2-px shudder on each headline line
      for (const at of [2, 3]) { const k = lt - at * b; if (k >= 0 && k < 0.3) env.fx.shake = Math.max(env.fx.shake || 0, 2.4 * Math.exp(-k * 18)); }
    },
  };
})();
