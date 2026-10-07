// flavors (optional; longer cuts): "Pick a flavor!" Entered by zooming into app's phone screen: the zoom lands on the
// app's real screen (establishing image drawn exactly where app's window is, via REEL.entryPortal), which then pulls back
// into the strawberry phone of a fan of four, each showing the REAL app in one flavor theme (captured with the app's
// own data-flavor switch); Mochi pops up in front of each in the matching colour. Hold: a spotlight walks the flavors
// on every second beat (the phone lifts, its Mochi cheers) while the cast bounces on the beat.
(() => {
  const at = (env, b) => env.lt - b * env.beatSec;
  const DIR = 'captures/ui/app/';
  const FL = [
    { key: 'strawberry', label: 'Strawberry', shot: 'flavor_strawberry', mochi: 'mochi' },
    { key: 'matcha', label: 'Matcha', shot: 'flavor_matcha', mochi: 'mochi_matcha' },
    { key: 'ube', label: 'Ube', shot: 'flavor_ube', mochi: 'mochi_ube' },
    { key: 'yuzu', label: 'Yuzu', shot: 'flavor_yuzu', mochi: 'mochi_yuzu' },
  ];
  const PH = { w: 440, h: 900, r: 70, inset: 14, s: 0.6 };                  // the app scene's phone at 0.6x
  const slot = (i) => { const c = i - 1.5; return { x: 960 + c * 330, y: 600 + c * c * 14, rot: (c * 6 * Math.PI) / 180, s: 1 - Math.abs(c) * 0.035 }; };
  // Phone with a captured full screen: pearl body, bezel, status bar strip taken from the capture's own top row.
  // Each flavor's phone (with its shadow) and its glow ring are baked once at the largest on-screen scale; per frame
  // a phone is one rotated drawImage (live shadowBlur on four 900-px phones was the scene's main cost).
  const RS = 0.66, PM = 90, PC = {};
  function phoneCanvas(P, f) {
    if (PC[f.key]) return PC[f.key];
    const im = IMG[DIR + f.shot], w = PH.w, h = PH.h, sw = w - 2 * PH.inset, sh = h - 2 * PH.inset;
    const bake = (draw) => { const b = makeBuf(Math.ceil((w + 2 * PM) * RS), Math.ceil((h + 2 * PM) * RS)); b.g.scale(RS, RS); b.g.translate(PM, PM); b.g.imageSmoothingQuality = 'high'; draw(b.g); return b.c; };
    const phoneC = bake((g) => {
      g.save(); g.shadowColor = rgba(P.shadow, 0.28); g.shadowBlur = 60; g.shadowOffsetY = 30;
      rr(g, 0, 0, w, h, PH.r); g.fillStyle = linear(g, 0, 0, w, h, [[0, '#FFF6F9'], [0.5, '#F8E4EB'], [1, '#EFD2DD']]); g.fill(); g.restore();
      rr(g, 1.5, 1.5, w - 3, h - 3, PH.r - 1.5); g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 2.5; g.stroke();
      rr(g, PH.inset - 6, PH.inset - 6, sw + 12, sh + 12, PH.r - PH.inset + 6); g.fillStyle = '#261B22'; g.fill();
      g.save(); rr(g, PH.inset, PH.inset, sw, sh, PH.r - PH.inset); g.clip();
      if (im) {
        const iw = im.naturalWidth || im.width;
        g.drawImage(im, 0, 0, iw, 3, PH.inset, PH.inset, sw, 44);
        g.drawImage(im, PH.inset, PH.inset + 44, sw, sh - 44);
        text(g, '9:41', PH.inset + 40, PH.inset + 30, { size: 16, weight: 800, fam: 'sans', color: P.ink });
      }
      g.restore();
      rr(g, w / 2 - 58, PH.inset + 10, 116, 33, 16.5); g.fillStyle = '#0D0A0C'; g.fill();
    });
    const col = P[f.key] || P.accent;
    const glowC = bake((g) => { g.shadowColor = rgba(col, 0.9); g.shadowBlur = 50; rr(g, 0, 0, w, h, PH.r); g.strokeStyle = rgba(col, 0.9); g.lineWidth = 8; g.stroke(); });
    return (PC[f.key] = { phoneC, glowC });
  }
  // The captured screen alone (status strip from its own top row + the UI), centred at (x, y): the establishing image.
  function screenOnly(ctx, P, f, x, y, w, h, r, rot) {
    const im = IMG[DIR + f.shot], sb = 44 * (w / (PH.w - 2 * PH.inset));
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    rr(ctx, -w / 2, -h / 2, w, h, r); ctx.fillStyle = P.bg; ctx.fill(); ctx.clip();
    if (im) {
      const iw = im.naturalWidth || im.width;
      ctx.drawImage(im, 0, 0, iw, 3, -w / 2, -h / 2, w, sb);
      ctx.drawImage(im, -w / 2, -h / 2 + sb, w, h - sb);
      text(ctx, '9:41', -w / 2 + 40 * (sb / 44), -h / 2 + 30 * (sb / 44), { size: 16 * (sb / 44), weight: 800, fam: 'sans', color: P.ink });
    }
    ctx.restore();
  }
  function miniPhone(ctx, P, f, x, y, sc, rot, glow) {
    const pc = phoneCanvas(P, f), k = sc / RS, cw = pc.phoneC.width * k, ch = pc.phoneC.height * k;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    const ox = -(PH.w / 2 + PM) * sc, oy = -(PH.h / 2 + PM) * sc;
    if (glow > 0.01) withAlpha(ctx, glow, () => ctx.drawImage(pc.glowC, ox, oy, cw, ch));
    ctx.drawImage(pc.phoneC, ox, oy, cw, ch);
    ctx.restore();
  }
  function beatHop(env, i) {                                                // recipe: lineup bounce, neighbours alternate
    const per = env.beatSec, ph = ((((env.lt - (i % 2) * per * 0.5) % per) + per) % per) / per;
    if (ph < 0.2) return { hop: 0, sq: Math.sin((Math.PI * ph) / 0.2) * 0.07 };
    const u = (ph - 0.2) / 0.8;
    return { hop: Math.sin(Math.PI * u), sq: -Math.sin(Math.PI * u) * 0.03 };
  }
  SCENES['flavors'] = {
    draw(ctx, t, env) {
      const P = env.palette, lt = env.lt, bs = env.beatSec, SP = env.style.motion.spring || {};
      ctx.imageSmoothingQuality = 'high';
      // spotlight: from beat 4, one flavor every 2 beats (keeps walking through any hold)
      const pick = lt >= 4 * bs ? Math.floor((lt - 4 * bs) / (2 * bs)) % 4 : -1, pickT = lt >= 4 * bs ? ((lt - 4 * bs) % (2 * bs)) : 0;
      // backdrop: cream, plus one wash per flavor that blooms as its phone lands
      ctx.fillStyle = linear(ctx, 0, 0, 0, H, [[0, P.bg2], [0.6, P.bg], [1, P.bg]]); ctx.fillRect(0, 0, W, H);
      FL.forEach((f, i) => {
        const k = Ease.outC(rm(lt, (i * 0.5) * bs, (i * 0.5) * bs + 0.6)), s0 = slot(i);
        softBlob(ctx, s0.x + Math.sin(lt * 0.6 + i) * 30, 520 + Math.cos(lt * 0.5 + i) * 26, 380 + 40 * k, P[f.key] || P.accent, 0.26 * k + (pick === i ? 0.12 * Ease.outC(clamp(pickT / 0.3)) : 0));
      });
      // entered by zoomInto: the app's screen where app's window is, then a pull-back into the strawberry phone
      // (beats 0..1); entered any other way, the strawberry phone springs up like the others
      const entry = REEL.entryPortal(env), pull = entry ? Ease.ioC(rm(lt, 0.1 * bs, 1.1 * bs)) : 1;
      // headline: after the pull-back has uncovered the top (or, without the zoom, while the scene arrives)
      const hs = 104, hOpt = { size: hs, weight: 900, fam: 'display', pop: true, stagger: 0.03, dur: 0.44, ls: -hs * 0.015, align: 'center' };
      const inks = [P.strawberryInk, P.matchaInk, P.ubeInk, P.yuzuInk].map((c) => c || P.accentStrong || P.accent);
      const headLt = entry ? lt - 0.7 * bs : lt + 0.42;
      // phones: spring up from below on half beats, settle into a fan; the picked one lifts
      FL.forEach((f, i) => {
        const k = at(env, i * 0.5), s0 = slot(i);
        if (entry && i === 0 && pull < 1) return;                           // drawn last, over the fan (below)
        if (k < -0.05) return;
        const e = spring(k + 0.05, SP.f ?? 2.6, (SP.z ?? 0.42) + 0.08), lift = pick === i ? Ease.outBack(clamp(pickT / 0.35), 2) * (1 - Ease.inC(rm(pickT, 2 * bs - 0.25, 2 * bs))) : 0;
        const y = s0.y + (1 - e) * 820 - lift * 34 + Math.sin(lt * 1.4 + i * 1.3) * 4, rot = s0.rot * e + (1 - e) * (i % 2 ? 0.3 : -0.3);
        miniPhone(ctx, P, f, s0.x, y, PH.s * s0.s * (1 + 0.06 * lift), rot, lift);
      });
      if (entry && pull < 1) {
        // the establishing screen, over the other phones while it is large: zoomed window -> the strawberry phone
        const f = FL[0], s0 = slot(0), sc = PH.s * s0.s, tw = (PH.w - 2 * PH.inset) * sc, th = (PH.h - 2 * PH.inset) * sc;
        const q = lt < 0 ? 0 : pull, lg = (a, b) => Math.exp(lerp(Math.log(a), Math.log(b), q));
        const cx = lerp(entry.x + entry.w / 2, s0.x, q), cy = lerp(entry.y + entry.h / 2, s0.y + Math.sin(lt * 1.4) * 4, q), rot = s0.rot * q;
        withAlpha(ctx, rm(q, 0.55, 1), () => miniPhone(ctx, P, f, cx, cy, (lg(entry.w, tw) / tw) * sc, rot, 0));
        screenOnly(ctx, P, f, cx, cy, lg(entry.w, tw), lg(entry.h, th), lerp(entry.r, (PH.r - PH.inset) * sc, q), rot);
      }
      kinetic(ctx, 'Pick a flavor!', 960, 178, headLt, { ...hOpt, colorFn: (i) => (i < 7 ? P.ink : inks[(i - 7) % 4]) });
      // the cast: one Mochi per flavor in front of its phone, bouncing on the beat after it lands
      FL.forEach((f, i) => {
        const k = at(env, i * 0.5 + 0.25), s0 = slot(i), x = s0.x + (i - 1.5) * 22, foot = 940;
        if (k < 0) return;
        const on = rm(k, 0.6, 0.9), b = beatHop(env, i), hop = b.hop * 18 * on, picked = pick === i && pickT < 1.6 * bs;
        groundShadow(ctx, x, foot + 4, 176 * (1 - hop / 120), 0.3 * clamp(k / 0.2), P.shadow);
        ctx.save(); ctx.translate(x, foot - hop); ctx.scale(1 + b.sq * on, 1 - b.sq * on); ctx.translate(-x, -(foot - hop));
        popChar(ctx, picked ? f.mochi + '_happy' : f.mochi, x, foot - hop, 190, k, { fromY: 420, f: SP.f ?? 2.6, z: SP.z ?? 0.42, squash: 0.12, jelly: 14, seed: 11 + i, shadow: false });
        ctx.restore();
        // label: the flavor name in its own ink, popping on its beat
        const lk = at(env, 2.5 + i * 0.25);
        if (lk > 0) {
          const pop = Ease.outBack(clamp(lk / 0.35), 2.2), col = inks[i];
          ctx.save(); ctx.translate(s0.x, 282 + Math.abs(i - 1.5) * 18); ctx.scale(pop, pop); ctx.globalAlpha *= clamp(lk / 0.1);
          chip(ctx, 0, 0, f.label, { size: 30, weight: 900, fam: 'sans', align: 'center', fg: col, bg: P.surface, stroke: pick === i ? rgba(col, 0.9) : null, shadowBlur: 20 });
          ctx.restore();
        }
        if (picked) for (let j = 0; j < 5; j++) {                          // cheer sparkles around the picked one
          const q = clamp(pickT / 0.7), an = -Math.PI / 2 + (j - 2) * 0.55, d = 70 + 60 * Ease.outC(q);
          sparkle(ctx, x + Math.cos(an) * d, foot - 140 + Math.sin(an) * d * 0.8, 10 + (j % 2) * 4, Math.sin(Math.PI * q), q * 3 + j, mix('#FFFFFF', P[f.key] || P.accent, 0.4));
        }
      });
    },
  };
})();
