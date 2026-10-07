// private (optional; the 60-s cut): "Yours only. Notes stay on your phone. Works offline, too!" (README). The phone
// shows the app's REAL final screen (captures/ui/app/final); a soft bubble forms around it, a lock and an offline badge
// pop on the beat, and little clouds drift in and bounce off the bubble (an illustration of "stays on your phone").
// Mochi hugs the phone. Hold: a cloud arrives on every beat and bounces away, the lock pulses on each bar line.
// Everything is a function of env.lt (clouds are spawned by beat index, never by random state).
(() => {
  const at = (env, b) => env.lt - b * env.beatSec;
  const DIR = 'captures/ui/app/';
  const PH = { cx: 1240, cy: 560, w: 352, h: 720, r: 56, inset: 11 };      // the app's phone at 0.8x
  const BUB = { r: 470 };
  let BODY = null;
  function body(P) {                                                         // pearl phone body, baked once
    if (BODY) return BODY;
    const m = 100, b = makeBuf(PH.w + 2 * m, PH.h + 2 * m), g = b.g;
    g.save(); g.shadowColor = rgba(P.shadow, 0.3); g.shadowBlur = 60; g.shadowOffsetY = 28;
    rr(g, m, m, PH.w, PH.h, PH.r); g.fillStyle = linear(g, m, m, m + PH.w, m + PH.h, [[0, '#FFF6F9'], [0.5, '#F8E4EB'], [1, '#EFD2DD']]); g.fill();
    g.restore();
    rr(g, m + 1.5, m + 1.5, PH.w - 3, PH.h - 3, PH.r - 1.5); g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 2.5; g.stroke();
    rr(g, m + PH.inset - 5, m + PH.inset - 5, PH.w - 2 * PH.inset + 10, PH.h - 2 * PH.inset + 10, PH.r - PH.inset + 5); g.fillStyle = '#261B22'; g.fill();
    const sw = PH.w - 2 * PH.inset, sh = PH.h - 2 * PH.inset, im = IMG[DIR + 'final'];
    g.save(); rr(g, m + PH.inset, m + PH.inset, sw, sh, PH.r - PH.inset); g.clip();
    g.fillStyle = P.bg; g.fillRect(m + PH.inset, m + PH.inset, sw, sh);
    if (im) {
      const iw = im.naturalWidth || im.width, sb = 44 * (sw / 412);
      g.drawImage(im, 0, 0, iw, 3, m + PH.inset, m + PH.inset, sw, sb);
      g.drawImage(im, m + PH.inset, m + PH.inset + sb, sw, sh - sb);
      text(g, '9:41', m + PH.inset + 32, m + PH.inset + 25, { size: 13, weight: 800, fam: 'sans', color: P.ink });
    }
    g.restore();
    rr(g, m + PH.w / 2 - 46, m + PH.inset + 8, 92, 26, 13); g.fillStyle = '#0D0A0C'; g.fill();
    return (BODY = { c: b.c, m });
  }
  function cloud(ctx, x, y, s, col, a) {
    ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x - s * 0.35, y + s * 0.05, s * 0.32, 0, TAU); ctx.arc(x, y - s * 0.14, s * 0.4, 0, TAU); ctx.arc(x + s * 0.38, y + s * 0.06, s * 0.3, 0, TAU);
    ctx.fill();
    rr(ctx, x - s * 0.66, y + s * 0.02, s * 1.32, s * 0.34, s * 0.17); ctx.fill();
    ctx.restore();
  }
  function badge(ctx, x, y, s, k, P, draw) {                                 // a round badge that pops in
    if (k <= 0) return;
    const e = Ease.outBack(clamp(k), 2.2);
    ctx.save(); ctx.translate(x, y); ctx.scale(e, e);
    ctx.shadowColor = rgba(P.shadow, 0.25); ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
    circle(ctx, 0, 0, s); ctx.fillStyle = P.surface; ctx.fill(); ctx.shadowColor = 'transparent';
    draw(ctx, s);
    ctx.restore();
  }
  SCENES['private'] = {
    draw(ctx, t, env) {
      const P = env.palette, lt = env.lt, bs = env.beatSec, ph = env.phase, SP = env.style.motion.spring || {};
      const out = Ease.inC(ph.out), acc = P.accentStrong || P.accent;
      ctx.imageSmoothingQuality = 'high';
      ctx.fillStyle = linear(ctx, 0, 0, 0, H, [[0, P.bg2], [0.6, P.bg], [1, P.bg]]); ctx.fillRect(0, 0, W, H);
      softBlob(ctx, 360 + Math.sin(lt * 0.5) * 50, 300, 600, rgba(P.ube || P.accent2, 0.2));
      softBlob(ctx, 1660, 860 + Math.cos(lt * 0.4) * 30, 560, rgba(P.matcha || P.accent3, 0.18));

      ctx.save();
      ctx.globalAlpha *= 1 - out;
      ctx.translate(0, -30 * out);
      // the bubble forms around the phone (beats 1 .. 2), then breathes
      const bk = Ease.outBack(rm(at(env, 1), 0, 0.6), 1.3), br = BUB.r * bk * (1 + 0.012 * Math.sin(lt * 2.2));
      if (bk > 0) {
        ctx.save();
        ctx.fillStyle = radial(ctx, PH.cx, PH.cy, br * 0.55, br, [[0, rgba('#FFFFFF', 0)], [0.82, rgba(P.accent, 0.1)], [1, rgba(P.accent, 0.22)]]);
        circle(ctx, PH.cx, PH.cy, br); ctx.fill();
        ctx.strokeStyle = rgba('#FFFFFF', 0.85); ctx.lineWidth = 3; ctx.stroke();
        ctx.restore();
      }
      // clouds: one per beat from beat 2, drifting in from the right edge, bouncing off the bubble, drifting away
      if (bk > 0.5) {
        const n0 = 2, last = Math.floor(lt / bs);
        for (let i = n0; i <= last; i++) {
          const age = lt - i * bs, life = 2.4;
          if (age < 0 || age > life) continue;
          const yy = PH.cy + (hash(i * 3.7) - 0.5) * 640, dir = hash(i * 1.3) < 0.5 ? -1 : 1;
          const sx = W + 120, ang = Math.atan2(yy - PH.cy, 1), hitX = PH.cx + Math.cos(ang) * BUB.r * 1.02 + 80, hitY = yy;
          const tin = 0.9, k = age < tin ? age / tin : 1, kb = age > tin ? (age - tin) / (life - tin) : 0;
          let x = lerp(sx, hitX, Ease.outQ(k)), y = hitY;
          if (kb > 0) { x = hitX + Ease.outC(kb) * 520; y = hitY + dir * Ease.outC(kb) * 220 - Math.sin(Math.PI * kb) * 60; }
          const squash = age > tin - 0.04 && age < tin + 0.18 ? Math.sin(Math.PI * (age - tin + 0.04) / 0.22) * 0.25 : 0;
          ctx.save(); ctx.translate(x, y); ctx.scale(1 - squash, 1 + squash * 0.6);
          cloud(ctx, 0, 0, 64 + hash(i * 9.1) * 30, mix('#FFFFFF', P.ube || P.accent2, 0.25), (1 - Ease.inC(kb)) * clamp(age / 0.15));
          ctx.restore();
          if (age > tin && age < tin + 0.35) {                               // a small spark where it bounces
            const q = (age - tin) / 0.35;
            sparkle(ctx, PH.cx + Math.cos(ang) * BUB.r, hitY, 14, Math.sin(Math.PI * q), q * 4 + i, mix('#FFFFFF', P.accent, 0.4));
          }
        }
      }
      // the phone: rises with the style spring, floats
      const pk = at(env, 0), up = spring(pk + 0.05, SP.f ?? 2.6, (SP.z ?? 0.42) + 0.1);
      if (pk > -0.05) {
        const B0 = body(P), y = PH.cy - PH.h / 2 + (1 - up) * 760 + Math.sin(lt * 1.4) * 5 * rm(lt, 0.8, 1.6);
        ctx.drawImage(B0.c, PH.cx - PH.w / 2 - B0.m, y - B0.m);
      }
      // badges: lock on beat 2, offline on beat 3; the lock pulses on every bar line of the hold
      let pulse = 0;
      onBars(env, 1, (n, dt) => { pulse = Math.max(pulse, Math.exp(-dt * 6)); });
      badge(ctx, PH.cx + PH.w / 2 + 6, PH.cy - PH.h / 2 + 90, 54 * (1 + 0.12 * pulse), rm(at(env, 2), 0, 0.4), P, (g, s) => icon(g, 'lock', 0, 2, s * 0.9, acc));
      badge(ctx, PH.cx - PH.w / 2 - 6, PH.cy + 120, 50, rm(at(env, 3), 0, 0.4), P, (g, s) => {
        g.save(); g.strokeStyle = P.matchaInk || P.ok; g.lineWidth = 5; g.lineCap = 'round';
        for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(0, s * 0.32, s * (0.22 + i * 0.2), -Math.PI * 0.78, -Math.PI * 0.22); g.stroke(); }
        g.strokeStyle = acc; g.beginPath(); g.moveTo(-s * 0.5, -s * 0.4); g.lineTo(s * 0.5, s * 0.5); g.stroke(); g.restore();
      });
      // copy (README): headline, sublines
      const hs = 112;
      kinetic(ctx, 'Yours only.', 140, 430, at(env, 0.5), { size: hs, weight: 900, fam: 'display', pop: true, stagger: 0.035, dur: 0.44, ls: -hs * 0.015,
        colorFn: (i) => (i < 5 ? P.ink : acc) });
      revealLine(ctx, 'Notes stay on your phone.', 144, 512, rm(at(env, 1.5), 0, 0.45), { size: 40, weight: 800, fam: 'sans', color: P.ink2 });
      revealLine(ctx, 'Works offline, too!', 144, 568, rm(at(env, 3), 0, 0.45), { size: 40, weight: 800, fam: 'sans', color: P.matchaInk || P.ink2 });
      // Mochi hugs the phone from the left and bounces on the beat
      const mk = at(env, 2.25);
      if (mk > 0) {
        const per = bs, q = ((((lt) % per) + per) % per) / per, hop = q < 0.2 ? 0 : Math.sin(Math.PI * (q - 0.2) / 0.8) * 14 * rm(mk, 0.6, 0.9);
        const x = PH.cx - PH.w / 2 - 70, foot = PH.cy + PH.h / 2 + 30;
        groundShadow(ctx, x, foot + 4, 170 * (1 - hop / 120), 0.26 * clamp(mk / 0.2), P.shadow);
        popChar(ctx, mk < 0.8 ? 'mochi_happy' : 'mochi', x, foot - hop, 200, mk, { fromY: 380, f: SP.f ?? 2.6, z: SP.z ?? 0.42, squash: 0.12, jelly: 14, seed: 41, shadow: false });
      }
      ctx.restore();
    },
  };
})();
