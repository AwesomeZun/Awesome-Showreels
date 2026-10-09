// photo (1 bar in the short cut, 3 bars in the 30-s cut): the camera has dived into the A1 picture (zoomInto from
// press; the window shows the same halftone at the same place, then the picture settles onto its page with the
// cutline beneath). The Town Hall bell strikes on every beat from beat 0: the hammer meets the rim, red sound rings
// spread on the 15-degree red plate, the strike tally in the cutline row stamps red; on strike 1 the pigeons lift
// off and the crowd raises its arms. At 96 BPM a 3-bar scene is exactly the 12 strikes of noon. Hold: a slow push
// into the dots; the cutline sentence appears on the hold's first bar line (only when the hold has one). Out-phase:
// the sheet is pulled off the press (NP.pressOut). All copy verbatim from source/front-page.md.
(() => {
  const ID = 'photo';
  const BLACK = '#1D1B18', RED = '#B9202A';
  const LAY = { x: 115, y: 26, w: 1690, h: 1690 * 9 / 16 };
  const FULL = { x: 0, y: 0, w: W, h: H };
  const lerpRect = (a, b, k) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), w: lerp(a.w, b.w, k), h: lerp(a.h, b.h, k) });

  function photoRect(env) {
    const b = env.beatSec, lt = env.lt, ep = typeof REEL !== 'undefined' && REEL.entryPortal ? REEL.entryPortal(env) : null;
    const from = ep ? { x: ep.x, y: ep.y, w: ep.w, h: ep.h } : { x: -0.01 * W, y: -0.01 * H, w: W * 1.02, h: H * 1.02 };
    if (lt < 0) return from;
    const r = lerpRect(from, LAY, Ease.outQuint(rm(lt, 0, 1.5 * b)));
    const push = 1 + 0.0065 * Math.max(0, lt - 1.5 * b);             // a slow push into the dots, same rate in every cut
    const cx = r.x + r.w * 0.6, cy = r.y + r.h * 0.42;
    return { x: cx - (cx - r.x) * push, y: cy - (cy - r.y) * push, w: r.w * push, h: r.h * push };
  }
  function strikes(env) {                                         // one strike per beat from beat 0, twelve at most
    const b = env.beatSec, lt = env.lt, n = lt < 0 ? 0 : Math.min(12, Math.floor(lt / b + 1e-6) + 1);
    const list = [];
    for (let i = 0; i < n; i++) list.push({ since: lt - i * b });
    const since = n ? lt - (n - 1) * b : 99;
    return { n, list, since, hit: n ? Math.exp(-since * 7) : 0 };
  }
  const lab = (g, s, x, y, o = {}) => {
    g.font = font(o.size ?? 17, o.weight ?? 800, 'sans'); g.letterSpacing = (o.size ?? 17) * (o.track ?? 0.08) + 'px';
    g.fillStyle = o.color || NP.ink(BLACK); g.textAlign = o.align || 'left'; g.fillText(s, x, y);
    const w = g.measureText(s).width; g.letterSpacing = '0px'; g.textAlign = 'left'; return w;
  };

  function page(ctx, env, lt) {
    const b = env.beatSec, r = photoRect(env), S = strikes(env), K = NP.ink(BLACK), R = NP.ink(RED);
    NP.paper(ctx, NP.cam(r.w / LAY.w, LAY.x + LAY.w / 2, LAY.y + LAY.h / 2, r.x + r.w / 2, r.y + r.h / 2));
    const L = NP.layer(ID), g = L.g;
    const st = { lt, since: S.since, hit: S.hit };
    const F = NP.photo.luma(st, 480);
    const pitch = 11;
    NP.halftone(g, F, r, { pitch, color: K });
    NP.ringScreen(g, r, S.list, { pitch, color: R, amount: 0.62 });
    // the cutline row under the picture: lead-in, tally of strikes, credit (they ride with the page scale)
    const k = r.w / LAY.w, row = (y) => r.y + (y - LAY.y) * k;
    g.save();
    g.translate(r.x, row(LAY.y + LAY.h)); g.scale(k, k);
    const lead = 'NOON, SATURDAY —', la = rm(lt, 1 * b, 1.5 * b);
    if (la > 0) lab(g, lead.slice(0, Math.ceil(lead.length * la)), 0, 44, { size: 17 });
    const cut = 'The Wickham Ferry Town Hall clock strikes 12 as about 300 people watch from Ferry Street.';
    const longHold = env.phase.holdDur >= env.barSec - 1e-3, cp = Ease.outQuint(rm(lt, env.inSec, env.inSec + 0.7 * b));
    if (longHold && cp > 0) {
      g.save(); g.beginPath(); g.rect(198, 14, 1160, 42); g.clip();
      g.font = `400 21px ${FAM.serif}`; g.fillStyle = NP.ink('#4A4640'); g.fillText(cut, 204, 44 + (1 - cp) * 30);
      g.restore();
    }
    const ca = rm(lt, 1.5 * b, 2 * b);
    if (ca > 0) { g.globalAlpha = ca; lab(g, 'COURIER PHOTO / BEN ADEYEMI', 0, 74, { size: 12.5, weight: 600, color: NP.ink('#625D55') }); g.globalAlpha = 1; }
    // tally: twelve numerals, each stamped red on its strike
    const tx = LAY.w - 12 * 31 + 6;
    const ta = clamp(lt / (0.5 * b) + 1);
    if (ta > 0) {
      g.globalAlpha = ta;
      lab(g, 'STRIKES', tx - 16, 44, { size: 13, align: 'right', color: NP.ink('#625D55') });
      for (let i = 0; i < 12; i++) {
        const on = i < S.n, since = lt - i * b, x = tx + i * 31;
        g.font = font(19, on ? 800 : 500, 'sans'); g.textAlign = 'center'; g.letterSpacing = '0px';
        g.fillStyle = on ? R : NP.ink('#9A958B');
        const s = on && since < 0.12 ? lerp(1.35, 1, Ease.outQuint(since / 0.12)) : 1;
        g.save(); g.translate(x, 37); g.scale(s, s); g.fillText(String(i + 1), 0, 7); g.restore();
      }
      g.textAlign = 'left'; g.globalAlpha = 1;
    }
    g.restore();
    NP.print(ctx, L, { m: NP.cam(r.w / LAY.w, LAY.x + LAY.w / 2, LAY.y + LAY.h / 2, r.x + r.w / 2, r.y + r.h / 2) });
  }

  SCENES[ID] = {
    draw(ctx, t, env) {
      const P = env.palette, lt = env.lt;
      ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
      if (env.phase.out > 0) {                                     // the sheet is pulled off the press
        NP.paper(ctx);
        NP.pullSheet(ctx, (g) => page(g, env, lt), NP.pressOut(env));
      } else page(ctx, env, lt);
      const S = strikes(env);                                     // the strike is felt: a one-pixel shudder
      if (S.n && S.since < 0.2) env.fx.shake = Math.max(env.fx.shake || 0, 1.6 * Math.exp(-S.since * 20));
    },
  };
})();
