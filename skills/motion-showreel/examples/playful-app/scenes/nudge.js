// nudge (optional; the 60-s cut): "Gentle nudges. Friendly reminders, never naggy." (README). The reminder is the
// app's REAL output: the "Call Mom · Fri 3:00 PM" row is cut from the captured result card (captures/ui/app/result,
// row 4 of its measured text rows) and grows into a reminder card. A clock face sweeps to 3:00 (an illustration), the
// row's bell rings on the beat and Mochi pops up beside it. Hold: the bell rings on every bar line, Mochi bobs on the
// beat, the clock's second hand ticks. Everything is a function of env.lt.
(() => {
  const at = (env, b) => env.lt - b * env.beatSec;
  const DIR = 'captures/ui/app/';
  const CARD = { x: 1010, y: 430, w: 760, h: 150, r: 34 };                 // the reminder card (row x 2.4)
  const CLOCK = { x: 1180, y: 760, r: 118 };
  const L = () => (ASSET(DIR + 'layers.json') || { layers: {} }).layers;
  let ROW = null;                                                           // the real row, cut once from the capture
  function rowImage() {
    if (ROW) return ROW;
    const l = L().result, im = IMG[DIR + 'result'];
    if (!l || !im || !l.rows || !l.rows[3]) return null;
    const r = l.rows[3], k = (im.naturalWidth || im.width) / l.screen.w;   // image px per CSS px (dpr)
    const x0 = 80, y0 = r.y0 - 13, x1 = l.element.x + l.element.w - 10, y1 = r.y1 + 13;  // bell icon .. the time pill
    const b = makeBuf(Math.round((x1 - x0) * k), Math.round((y1 - y0) * k));
    b.g.drawImage(im, x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k, 0, 0, b.c.width, b.c.height);
    // the bell glyph itself (CSS x 83..103 of the card, left of the label): it swings as a cut-out of the capture
    const bx0 = 83, bx1 = Math.min(r.x0 - 3, 104), bb = makeBuf(Math.round((bx1 - bx0) * k), b.c.height);
    bb.g.drawImage(im, bx0 * k, y0 * k, (bx1 - bx0) * k, (y1 - y0) * k, 0, 0, bb.c.width, bb.c.height);
    return (ROW = { c: b.c, w: x1 - x0, h: y1 - y0, bell: { c: bb.c, x: bx0 - x0, w: bx1 - bx0 } });
  }
  function beatHop(env, ph = 0) {                                           // recipe: lineup bounce
    const per = env.beatSec, q = ((((env.lt - ph * per) % per) + per) % per) / per;
    if (q < 0.2) return { hop: 0, sq: Math.sin((Math.PI * q) / 0.2) * 0.07 };
    const u = (q - 0.2) / 0.8;
    return { hop: Math.sin(Math.PI * u), sq: -Math.sin(Math.PI * u) * 0.03 };
  }
  SCENES['nudge'] = {
    draw(ctx, t, env) {
      const P = env.palette, lt = env.lt, bs = env.beatSec, ph = env.phase, SP = env.style.motion.spring || {};
      const out = Ease.inC(ph.out);
      ctx.imageSmoothingQuality = 'high';
      // backdrop: the app's cream stage with drifting pastel blobs (the yuzu wash leads: a warm, calm moment)
      ctx.fillStyle = linear(ctx, 0, 0, 0, H, [[0, P.bg2], [0.6, P.bg], [1, P.bg]]); ctx.fillRect(0, 0, W, H);
      softBlob(ctx, 1420 + Math.sin(lt * 0.5) * 60, 420 + Math.cos(lt * 0.4) * 40, 640, rgba(P.yuzu || P.accent3, 0.22));
      softBlob(ctx, 360 + Math.cos(lt * 0.45) * 50, 860, 560, rgba(P.accent, 0.16));
      softBlob(ctx, 1700, 980, 520, rgba(P.accent2, 0.14));

      ctx.save();
      ctx.globalAlpha *= 1 - out;
      ctx.translate(0, -30 * out);
      // headline + subline (README copy)
      const hs = 104;
      kinetic(ctx, 'Gentle nudges.', 140, 420, at(env, 0.25), { size: hs, weight: 900, fam: 'display', pop: true, stagger: 0.03, dur: 0.44,
        ls: -hs * 0.015, colorFn: (i) => (i < 6 ? P.accentStrong || P.accent : P.ink) });
      revealLine(ctx, 'Friendly reminders, never naggy.', 144, 500, rm(at(env, 1.25), 0, 0.5), { size: 40, weight: 800, fam: 'sans', color: P.ink2 });

      // the reminder card: the real row pops in at 1x, then grows into the card (beats 0.5 .. 1.5)
      const R = rowImage();
      const k0 = at(env, 0.5), grow = Ease.outBack(rm(k0, 0.25, 0.9), 1.4);
      if (R && k0 > 0) {
        const sc = lerp(1, CARD.w / (R.w + 40), grow), cw = (R.w + 40) * sc, ch = (R.h + 24) * sc;
        const cx = CARD.x + CARD.w / 2, cy = CARD.y + CARD.h / 2 - 6 * Math.sin(lt * 1.3) * rm(k0, 0.9, 1.6);
        const pop = Ease.outBack(clamp(k0 / 0.4), 1.8);
        ctx.save();
        ctx.translate(cx, cy); ctx.scale(lerp(0.6, 1, pop), lerp(0.6, 1, pop)); ctx.globalAlpha *= clamp(k0 / 0.15);
        ctx.shadowColor = rgba(P.shadow, 0.22); ctx.shadowBlur = 50; ctx.shadowOffsetY = 18;
        rr(ctx, -cw / 2, -ch / 2, cw, ch, CARD.r * lerp(0.5, 1, grow)); ctx.fillStyle = P.surface; ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.drawImage(R.c, -cw / 2 + 20 * sc, -ch / 2 + 12 * sc, R.w * sc, R.h * sc);
        // the bell rings: on beat 2 (with the cue), then on every bar line of the hold
        let ring = rm(at(env, 2), 0, 0.9);
        onBars(env, 1, (n, dt) => { if (dt < 0.9) ring = dt / 0.9; });
        if (ring > 0 && ring < 1) {
          const Bl = R.bell, bw = Bl.w * sc, bh = R.h * sc, bx = -cw / 2 + (20 + Bl.x) * sc + bw / 2, by = 0;
          const swing = Math.sin(ring * 22) * 0.45 * (1 - ring);
          ctx.save(); ctx.fillStyle = P.surface; ctx.fillRect(bx - bw / 2, by - bh / 2 + 6 * sc, bw, bh - 12 * sc); ctx.restore();
          ctx.save(); ctx.translate(bx, by - bh * 0.18); ctx.rotate(swing); ctx.translate(0, bh * 0.18);
          ctx.drawImage(Bl.c, -bw / 2, -bh / 2, bw, bh); ctx.restore();
          for (let j = 0; j < 2; j++) {
            const q = rm(ring, j * 0.15, 0.6 + j * 0.15);
            if (q > 0 && q < 1) { ctx.save(); ctx.strokeStyle = rgba(P.accentStrong || P.accent, 0.5 * (1 - q)); ctx.lineWidth = 3; circle(ctx, bx, by, 24 * sc * (0.6 + q)); ctx.stroke(); ctx.restore(); }
          }
        }
        ctx.restore();
      }
      // clock face (illustration): the hands sweep to 3:00 on beats 2.5 .. 3.5; the second hand ticks every beat
      const ck = Ease.outBack(rm(at(env, 1.5), 0, 0.45), 1.6);
      if (ck > 0) {
        const { x, y, r } = CLOCK, sw = Ease.ioC(rm(at(env, 2.5), 0, 0.5 * bs * 2));
        ctx.save(); ctx.translate(x, y); ctx.scale(ck, ck);
        ctx.shadowColor = rgba(P.shadow, 0.2); ctx.shadowBlur = 36; ctx.shadowOffsetY = 12;
        circle(ctx, 0, 0, r); ctx.fillStyle = P.surface; ctx.fill(); ctx.shadowColor = 'transparent';
        ctx.strokeStyle = rgba(P.accent, 0.55); ctx.lineWidth = 6; circle(ctx, 0, 0, r - 8); ctx.stroke();
        for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; circle(ctx, Math.sin(a) * (r - 30), -Math.cos(a) * (r - 30), i % 3 ? 3 : 6); ctx.fillStyle = rgba(P.ink, i % 3 ? 0.3 : 0.6); ctx.fill(); }
        const hand = (ang, len, w, col) => { ctx.save(); ctx.rotate(ang); rr(ctx, -w / 2, -len, w, len + 12, w / 2); ctx.fillStyle = col; ctx.fill(); ctx.restore(); };
        hand(lerp(-TAU * 0.3, TAU * 0.25, sw), r * 0.48, 12, P.ink);          // hour hand to 3
        hand(lerp(-TAU * 0.9, 0, sw), r * 0.72, 8, P.ink);                    // minute hand to 12
        const tick = Math.floor(Math.max(0, lt) / bs);
        hand((tick / 60) * TAU + Ease.outBack(clamp((Math.max(0, lt) % bs) / 0.12), 2) * (TAU / 60), r * 0.78, 3, P.accentStrong || P.accent);
        circle(ctx, 0, 0, 9); ctx.fillStyle = P.accentStrong || P.accent; ctx.fill();
        ctx.restore();
        text(ctx, 'Fri 3:00 PM', x + r + 34, y + 14, { size: 40, weight: 800, fam: 'sans', color: P.ink, alpha: rm(at(env, 3), 0, 0.3) });
      }
      // Mochi pops up beside the clock and bobs on the beat
      const mk = at(env, 1.75);
      if (mk > 0) {
        const bh = beatHop(env), on = rm(mk, 0.6, 0.9), hop = bh.hop * 16 * on, x = 820, foot = 930;
        let name = 'mochi';
        onBars(env, 1, (n, dt) => { if (dt < 0.6) name = 'mochi_happy'; });
        if (mk < 0.7) name = 'mochi_happy';
        groundShadow(ctx, x, foot + 4, 200 * (1 - hop / 120), 0.28 * clamp(mk / 0.2), P.shadow);
        ctx.save(); ctx.translate(x, foot - hop); ctx.scale(1 + bh.sq * on, 1 - bh.sq * on); ctx.translate(-x, -(foot - hop));
        popChar(ctx, name, x, foot - hop, 230, mk, { fromY: 400, f: SP.f ?? 2.6, z: SP.z ?? 0.42, squash: 0.12, jelly: 14, seed: 31, shadow: false });
        ctx.restore();
      }
      ctx.restore();
    },
  };
})();
