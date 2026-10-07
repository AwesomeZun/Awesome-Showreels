// hook: "Too many thoughts?" A flurry of paper scraps (the messy notes from the README) tumbles in from every edge
// in three depth layers and piles up around a two-line headline. Hold: everything flutters, one more scrap slaps
// on per bar, the "?" wiggles on the beat. Out: the scraps are blown outward while brand's blob wipe grows.
(() => {
  const at = (env, b) => env.lt - b * env.beatSec;
  let PAP = null;                                                           // paper colours from the flavor swatches
  const PAPERS = (P) => PAP || (PAP = {
    yuzu: mix(P.yuzu || '#FFD066', '#FFFFFF', 0.48), pink: mix(P.strawberry || P.accent, '#FFFFFF', 0.6),
    mint: mix(P.matcha || P.accent3, '#FFFFFF', 0.56), lilac: mix(P.ube || P.accent2, '#FFFFFF', 0.56), white: P.surface,
  });
  // Mid layer, hand-placed: [text, x, y, rotation deg, kind, paper, launch s]. Kinds: sticky, card, bubble, pill.
  const MID = [
    ['oat milk??', 235, 205, -9, 'sticky', 'yuzu', -0.55],
    ['call mom', 610, 150, 6, 'card', 'white', -0.32],
    ['fri 3pm!', 1040, 118, -3, 'bubble', 'pink', -0.46],
    ['reply to Sam', 1420, 150, 4, 'pill', 'mint', -0.12],
    ['dentist?', 1735, 260, 9, 'sticky', 'mint', -0.4],
    ['water plants', 150, 500, 7, 'card', 'white', -0.22],
    ['pay rent', 1790, 520, -8, 'pill', 'lilac', -0.5],
    ['buy stamps', 360, 700, -11, 'pill', 'yuzu', 0.02],
    ['passwords??', 1565, 700, 10, 'pill', 'pink', 0.08],
    ['idea: pastel calendar', 360, 905, 4, 'bubble', 'lilac', -0.28],
    ['laundry', 780, 950, -6, 'sticky', 'pink', -0.36],
    ["Jo's bday!!", 1200, 935, 7, 'sticky', 'yuzu', 0.14],
    ['yoga 7am', 1640, 905, -5, 'card', 'white', -0.05],
    ['book club', 1395, 345, -10, 'sticky', 'lilac', 0.22],
    ["don't forget!!", 545, 330, 8, 'bubble', 'yuzu', 0.28],
  ];
  // Far layer (small, soft, drifting) and near layer (big, out of focus, partly off frame).
  const FAR_TXT = ['milk', 'keys?', 'gym', 'bills', 'plan trip', 'taxes', 'mail', 'meds', 'snacks', 'rsvp', 'call Jo', 'ideas'];
  const farY = (x, y) => (x > 520 && x < 1400 && y > 340 && y < 720 ? (y < 530 ? 300 : 790) : y);   // keep the headline box clear
  const FAR = FAR_TXT.map((s, i) => {
    const x = 120 + ((i * 523) % 1700) + hash(i * 3.1) * 60, y = farY(x, 90 + ((i * 337) % 900) + hash(i * 7.3) * 40);
    return [s, x, y, (hash(i * 5.7) - 0.5) * 30, ['pill', 'card', 'sticky'][i % 3], ['pink', 'mint', 'lilac', 'yuzu', 'white'][i % 5], -0.7 + hash(i * 9.1) * 0.8];
  });
  const NEAR = [['oat milk', -30, 990, 12, 'sticky', 'pink', -0.42], ['!!', 1960, 130, -14, 'sticky', 'yuzu', -0.3],
    ['call mom', 1880, 1050, -8, 'card', 'white', -0.12], ['to-do', -50, 70, 10, 'sticky', 'mint', -0.5]];
  const EXTRA = [['tea refill', 1785, 400, -6, 'card', 'white'], ['rsvp!!', 170, 300, 9, 'sticky', 'pink'], ['umbrella?', 1460, 1010, 4, 'pill', 'lilac']];
  const LAYERS = { far: { s: 0.62, blur: 2.6, a: 0.55, FL: 0.95, par: 0.6 }, mid: { s: 1.22, blur: 0, a: 1, FL: 0.8, par: 1 }, near: { s: 2.1, blur: 5, a: 0.92, FL: 0.7, par: 1.6 } };

  const cache = {};
  function scrapCanvas(env, key, s, kind, paperCol, blur) {
    if (cache[key]) return cache[key];
    const P = env.palette, size = kind === 'pill' ? 30 : 32, padX = kind === 'pill' ? 26 : 30;
    const tw = measure(makeBuf(4, 4).g, s, { size, weight: 800, fam: 'sans' });
    const w = Math.max(kind === 'sticky' ? 196 : 120, Math.ceil(tw + padX * 2)), h = kind === 'sticky' ? Math.max(168, w * 0.82) : kind === 'pill' ? 66 : kind === 'card' ? 112 : 96;
    const m = blur ? 16 + blur * 3 : 44, b = makeBuf(w + m * 2, h + m * 2 + (kind === 'bubble' ? 18 : 0)), g = b.g;
    if (blur) g.filter = `blur(${blur}px)`;
    else { g.shadowColor = rgba(P.shadow, 0.2); g.shadowBlur = 20; g.shadowOffsetY = 12; }   // baked once (mid layer)
    g.translate(m, m);
    const fill = linear(g, 0, 0, 0, h, [[0, mix(paperCol, '#FFFFFF', 0.35)], [1, paperCol]]), edge = mix(paperCol, P.ink, 0.28);
    if (kind === 'sticky') {                                                // sticky note with a curled corner and tape
      g.beginPath(); g.moveTo(4, 0); g.lineTo(w, 0); g.lineTo(w, h - 26); g.quadraticCurveTo(w - 4, h - 6, w - 30, h); g.lineTo(4, h); g.quadraticCurveTo(0, h, 0, h - 4); g.lineTo(0, 4); g.closePath();
      g.fillStyle = fill; g.fill(); g.shadowColor = 'transparent';
      g.fillStyle = linear(g, w - 30, h - 26, w, h, [[0, rgba(edge, 0)], [1, rgba(edge, 0.5)]]);
      g.beginPath(); g.moveTo(w, h - 26); g.quadraticCurveTo(w - 6, h - 8, w - 30, h); g.lineTo(w - 26, h - 22); g.closePath(); g.fill();
      g.fillStyle = rgba('#FFFFFF', 0.6); g.save(); g.translate(w / 2, -2); g.rotate(-0.05); g.fillRect(-38, -9, 76, 25); g.restore();
    } else if (kind === 'card') {                                           // index card with a pink rule
      rr(g, 0, 0, w, h, 10); g.fillStyle = fill; g.fill(); g.shadowColor = 'transparent';
      g.strokeStyle = rgba(P.accent, 0.6); g.lineWidth = 2.5; g.beginPath(); g.moveTo(14, 28); g.lineTo(w - 14, 28); g.stroke();
      g.strokeStyle = rgba(P.accent2, 0.28); g.lineWidth = 1.5;
      for (let y = 56; y < h - 8; y += 26) { g.beginPath(); g.moveTo(14, y); g.lineTo(w - 14, y); g.stroke(); }
    } else if (kind === 'bubble') {                                         // thought bubble with a tail
      rr(g, 0, 0, w, h, 34); g.fillStyle = fill; g.fill();
      g.beginPath(); g.moveTo(28, h - 6); g.quadraticCurveTo(22, h + 16, 6, h + 18); g.quadraticCurveTo(40, h + 10, 52, h - 6); g.closePath(); g.fill();
    } else { rr(g, 0, 0, w, h, h / 2); g.fillStyle = fill; g.fill(); }
    g.shadowColor = 'transparent';
    const o = { size, weight: 800, fam: 'sans', color: P.ink, align: 'center' };
    if (kind === 'sticky') {
      const lines = wrapText(g, s, w - padX * 1.4, o);
      lines.forEach((ln, i) => text(g, ln, w / 2, h * 0.56 + (i - (lines.length - 1) / 2) * size * 1.18 + size * 0.34, o));
    } else text(g, s, w / 2, kind === 'card' ? h * 0.66 : h * 0.5 + size * 0.36, o);
    return (cache[key] = { c: b.c, w, h, m });
  }
  // One scrap: launched at k0 = 0 from beyond the frame edge, tumbling and fluttering along a curve, lands with a wobble.
  function drawScrap(ctx, env, sc, i, k0, L, o = {}) {
    const [s, tx, ty, rotDeg, kind, paper] = sc;
    if (k0 < 0) return;
    const P = env.palette, cv = scrapCanvas(env, `${L === LAYERS.far ? 'f' : L === LAYERS.near ? 'n' : 'm'}${i}`, s, kind, PAPERS(P)[paper], L.blur);
    const k = k0 / L.FL, e = Ease.outQuint(clamp(k)), side = i % 2 ? 1 : -1;
    const dx = tx - 960, dy = ty - 540, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
    const sx = tx + ux * 900 + uy * 200 * side, sy = ty + uy * 640 - ux * 140 * side;
    const ctl = [lerp(sx, tx, 0.5) - uy * 200 * side, lerp(sy, ty, 0.5) + ux * 150 * side];
    let [x, y] = k < 1 ? qbez([sx, sy], ctl, [tx, ty], e) : [tx, ty];
    const land = k0 - L.FL, spins = 1 + (i % 3);
    let rot = (rotDeg * Math.PI) / 180 + (1 - e) * spins * Math.PI * side;
    const flut = k < 1 ? 0.3 + 0.7 * Math.abs(Math.cos((1 - e) * spins * Math.PI * 1.5)) : 1;
    let sc0 = L.s * (k < 1 ? lerp(0.75, 1, e) : 1 + 0.07 * wob(land, 3.2, 7));
    x += Math.cos(env.lt * 0.9 * L.par + i) * 3 * L.par; y += Math.sin(env.lt * 1.3 + i * 1.7) * 4 * L.par;   // idle flutter
    rot += Math.sin(env.lt * 1.2 + i * 2.1) * 0.02;
    if (o.blow > 0) {                                                       // out-phase: blown away from the blob origin
      const bx = tx - 960, by = ty - 760, bl = Math.hypot(bx, by) || 1, q = Ease.inC(o.blow);
      x += (bx / bl) * 1250 * q * L.par; y += (by / bl) * 950 * q * L.par - 140 * Math.sin(Math.PI * o.blow);
      rot += q * 2.4 * side; sc0 *= 1 + 0.25 * q;
    }
    if (o.slap !== undefined) sc0 *= lerp(1.6, 1, Ease.outBack(clamp(o.slap / 0.24), 2.4));
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc0 * flut, sc0);
    ctx.globalAlpha *= clamp(k0 / 0.05) * L.a;
    ctx.drawImage(cv.c, -cv.w / 2 - cv.m, -cv.h / 2 - cv.m);
    ctx.restore();
  }
  SCENES['hook'] = {
    draw(ctx, t, env) {
      const P = env.palette, lt = env.lt, ph = env.phase, out = ph.out;
      ctx.imageSmoothingQuality = 'high';
      // backdrop: blush-to-cream like the app, soft flavour blobs drifting
      ctx.fillStyle = linear(ctx, 0, 0, 0, H, [[0, P.bg2], [0.6, P.bg], [1, P.bg]]);
      ctx.fillRect(0, 0, W, H);
      softBlob(ctx, 330 + Math.sin(lt * 0.5) * 50, 260 + Math.cos(lt * 0.4) * 30, 560, rgba(P.accent, 0.24));
      softBlob(ctx, 1620 + Math.cos(lt * 0.45) * 60, 760 + Math.sin(lt * 0.5) * 40, 640, rgba(P.accent2, 0.22));
      softBlob(ctx, 980 + Math.sin(lt * 0.3) * 80, 1040, 560, rgba(P.accent3, 0.18));
      // camera: a small push that settles, then drift (scene-local time only)
      const z = 1.06 - 0.06 * Ease.outC(rm(lt, 0, 1.5)) + 0.004 * Math.sin(lt * 0.9);
      ctx.save();
      ctx.translate(960, 540); ctx.scale(z, z); ctx.translate(-960 + Math.sin(lt * 0.6) * 4, -540 + Math.cos(lt * 0.5) * 3);
      FAR.forEach((sc, i) => drawScrap(ctx, env, sc, i, lt - sc[6], LAYERS.far, { blow: out }));
      MID.forEach((sc, i) => drawScrap(ctx, env, sc, i, lt - sc[6], LAYERS.mid, { blow: out }));
      onBars(env, 1, (n, dt) => drawScrap(ctx, env, EXTRA[n % EXTRA.length], 40 + n, 9, LAYERS.mid, { slap: dt, blow: out }));
      // a soft pool of light keeps the headline clear of the pile
      softBlob(ctx, 960, 560, 640, rgba(P.bg, 0.92));
      softBlob(ctx, 960, 560, 420, rgba('#FFFFFF', 0.5));
      // headline: the question in the strong accent; "?" lands last and wiggles on the beat in the hold
      const size = 156, y1 = 500, y2 = 658, ex = Ease.inBack(clamp(out * 1.5), 1.6);
      ctx.save();
      ctx.translate(960, 560); ctx.scale(1 - 0.14 * ex, 1 - 0.14 * ex); ctx.translate(-960, -560);
      ctx.globalAlpha *= 1 - clamp(out * 1.4);
      const kOpt = { size, weight: 900, fam: 'display', align: 'center', pop: true, stagger: 0.028, dur: 0.4, ls: -size * 0.015, glow: rgba(P.bg, 0.9), glowBlur: 30 };
      kinetic(ctx, 'Too many', 960, y1, at(env, 0.25), { ...kOpt, color: P.ink });
      const tw = kinetic(ctx, 'thoughts', 960 - 30, y2, at(env, 0.75), { ...kOpt, color: P.accentStrong || P.accent });
      const qk = at(env, 0.75) - 8 * 0.028, q = beatPulse(env, 9) * (lt > ph.inSec ? 1 : 0);
      if (qk > 0) {
        const pop = Ease.outBack(clamp(qk / 0.4), 2.6);
        ctx.save(); ctx.translate(960 - 30 + tw / 2 + 48, y2 - size * 0.32); ctx.rotate(0.2 * q * Math.sin(lt * 38) + (1 - pop) * 0.6); ctx.scale(pop * (1 + 0.14 * q), pop * (1 + 0.14 * q));
        text(ctx, '?', 0, size * 0.32, { size, weight: 900, fam: 'display', align: 'center', color: P.accentStrong || P.accent, glow: rgba(P.bg, 0.9), glowBlur: 30 });
        ctx.restore();
      }
      ctx.restore();
      NEAR.forEach((sc, i) => drawScrap(ctx, env, sc, i, lt - sc[6], LAYERS.near, { blow: out }));
      ctx.restore();
    },
  };
})();
