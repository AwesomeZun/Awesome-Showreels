// app: "Jot it down. Mochi tidies up!" The app icon from brand morphs into a phone that shows REAL captured UI
// (source/app.html via tools/capture_ui.mjs): the note bubble types in from its own raster, the tidy card steps
// through its five real states on the beat, the result card pops with the app's own entrance curve, and the
// app's actual outputs fly out as chips. Mochi watches (thinking), then cheers. Hold (longer cuts): the first
// to-do is ticked with the app's real checked state, the reminder chip rings, a highlight walks the chips every two
// beats. Portal = the phone screen (zoomInto).
(() => {
  const at = (env, b) => env.lt - b * env.beatSec;
  const DIR = 'captures/ui/app/';
  const ICON_AT = { x: 960, y: 540, s: 300 };                              // brand.js ends on this icon (keep in sync)
  const PHONE = { x: 1120, y: 90, w: 440, h: 900, r: 70 }, INSET = 14;
  const SCR = { x: PHONE.x + INSET, y: PHONE.y + INSET, w: PHONE.w - 2 * INSET, h: PHONE.h - 2 * INSET, r: PHONE.r - INSET };
  // beats from the scene start (identical in every cut)
  const B = { morph: 0, head1: 0.5, clear: 1.2, type: 1.5, card: 4.5, step: 0.75, mochi: 4.75, head2: 4.5, result: 8.0, chips: 8.28 };
  const CPS = 36;
  const CHIPS = [                                                           // the app's own output (result card rows)
    { label: 'Oat milk', icon: 'check', row: 2 },
    { label: 'Call Mom · Fri 3:00 PM', icon: 'clock', row: 3 },
    { label: 'Pastel calendar', icon: 'spark', row: 4 },
    { label: '#errands #family #ideas', icon: null, row: 5 },
  ];
  const SLOT = { x: 166, y: 604, dy: 96, size: 40 };
  // Camera on the phone (world layer): push into the bubble while it types, glide to the tidy card, pull back for
  // the result. Poses: zoom z, world focus f placed at screen point a. Keys in beats, eased between.
  const POSE = {
    wide: { z: 1, f: [1340, 540], a: [1340, 540] },
    note: { z: 1.6, f: [SCR.x + 250, SCR.y + 160], a: [1300, 330] },
    card: { z: 1.4, f: [SCR.x + 222, SCR.y + 300], a: [1360, 470] },
  };
  const CAM = [[0, 'wide'], [1.0, 'wide'], [1.6, 'note'], [4.2, 'note'], [4.8, 'card'], [7.6, 'card'], [8.2, 'wide']];
  function camera(lt, bs) {
    let p = POSE.wide;
    for (let i = 1; i < CAM.length; i++) {
      const [b0, n0] = CAM[i - 1], [b1, n1] = CAM[i];
      if (lt < b1 * bs) { const k = Ease.ioC(rm(lt, b0 * bs, b1 * bs)), A = POSE[n0], Bp = POSE[n1];
        return { z: Math.exp(lerp(Math.log(A.z), Math.log(Bp.z), k)), f: [lerp(A.f[0], Bp.f[0], k), lerp(A.f[1], Bp.f[1], k)], a: [lerp(A.a[0], Bp.a[0], k), lerp(A.a[1], Bp.a[1], k)] }; }
      p = POSE[n1];
    }
    return p;
  }
  const BLOBS = [[360, 300, 560, 'accent', 0.2], [1600, 790, 640, 'accent2', 0.18], [960, 1060, 560, 'accent3', 0.14]];

  const L = () => (ASSET(DIR + 'layers.json') || { layers: {} }).layers;
  const img = (name) => IMG[DIR + name];
  const floatY = (lt) => Math.sin(lt * 1.5) * 5 * rm(lt, 0.7, 1.6);        // idle float once the phone has formed
  function backdrop(ctx, P, lt) {
    ctx.fillStyle = linear(ctx, 0, 0, 0, H, [[0, P.bg2], [0.6, P.bg], [1, P.bg]]);
    ctx.fillRect(0, 0, W, H);
    BLOBS.forEach(([x, y, r, key, a], i) => softBlob(ctx, x + (Math.sin(lt * 0.5 + i * 2) - Math.sin(i * 2)) * 70, y + (Math.cos(lt * 0.4 + i) - Math.cos(i)) * 44, r, rgba(P[key], a)));
    softBlob(ctx, 960, 760, 980, rgba(P.accent, 0.1 * (1 - Ease.outC(rm(lt, 0, 0.8)))));     // brand's pink pool, fading out
  }
  function statusBar(ctx, P, s) {
    ctx.fillStyle = P.bg2; ctx.fillRect(s.x, s.y, s.w, 44);
    text(ctx, '9:41', s.x + 40, s.y + 30, { size: 16, weight: 800, fam: 'sans', color: P.ink });
    const x = s.x + s.w - 34, y = s.y + 24;                                  // battery, wifi, signal
    rr(ctx, x - 22, y - 7, 25, 13, 4); ctx.strokeStyle = rgba(P.ink, 0.85); ctx.lineWidth = 1.4; ctx.stroke();
    rr(ctx, x - 20, y - 5, 18, 9, 2.5); ctx.fillStyle = P.ink; ctx.fill(); ctx.fillRect(x + 4, y - 2.5, 2, 5);
    ctx.lineCap = 'round'; ctx.lineWidth = 2.2; ctx.strokeStyle = P.ink;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x - 38, y + 5, 3 + i * 4, -Math.PI * 0.75, -Math.PI * 0.25); ctx.stroke(); }
    for (let i = 0; i < 4; i++) { rr(ctx, x - 70 + i * 5.2, y + 4 - (3 + i * 2.6), 3.4, 3 + i * 2.6, 1.2); ctx.fill(); }
  }
  // Pearl-pink phone body, black bezel, island. drawScreen(ctx, s) paints inside the clipped screen. The static body
  // (shadow, casing, buttons, rim, bezel) is baked once into a canvas: live shadowBlur on a 900-px shape is costly.
  let BODY = null;
  function phoneBody(P) {
    if (BODY) return BODY;
    const m = 120, o = { x: m, y: m, w: PHONE.w, h: PHONE.h, r: PHONE.r }, b = makeBuf(PHONE.w + 2 * m, PHONE.h + 2 * m), g = b.g;
    const s = { x: o.x + INSET, y: o.y + INSET, w: o.w - 2 * INSET, h: o.h - 2 * INSET, r: o.r - INSET };
    g.save(); g.shadowColor = rgba(P.shadow, 0.3); g.shadowBlur = 70; g.shadowOffsetY = 34;
    rr(g, o.x, o.y, o.w, o.h, o.r); g.fillStyle = linear(g, o.x, o.y, o.x + o.w, o.y + o.h, [[0, '#FFF6F9'], [0.5, '#F8E4EB'], [1, '#EFD2DD']]); g.fill();
    g.restore();
    for (const [bx, by, bh] of [[o.x - 3, o.y + 190, 64], [o.x - 3, o.y + 270, 64], [o.x + o.w - 1, o.y + 220, 96]]) { rr(g, bx, by, 4, bh, 2); g.fillStyle = '#EBCBD7'; g.fill(); }
    rr(g, o.x + 1.5, o.y + 1.5, o.w - 3, o.h - 3, o.r - 1.5); g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 2.5; g.stroke();
    rr(g, s.x - 6, s.y - 6, s.w + 12, s.h + 12, s.r + 6); g.fillStyle = '#261B22'; g.fill();
    return (BODY = { c: b.c, m });
  }
  function phone(ctx, P, o, drawScreen) {
    const s = { x: o.x + INSET, y: o.y + INSET, w: o.w - 2 * INSET, h: o.h - 2 * INSET, r: o.r - INSET }, B0 = phoneBody(P);
    ctx.drawImage(B0.c, o.x - B0.m, o.y - B0.m);
    ctx.save(); rr(ctx, s.x, s.y, s.w, s.h, s.r); ctx.clip();
    ctx.fillStyle = P.bg; ctx.fillRect(s.x, s.y, s.w, s.h);
    drawScreen(ctx, s);
    ctx.fillStyle = linear(ctx, s.x, s.y, s.x + s.w, s.y + s.h * 0.6, [[0, 'rgba(255,255,255,0.10)'], [0.45, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,0)']]);
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.restore();
    rr(ctx, s.x + s.w / 2 - 58, s.y + 10, 116, 33, 16.5); ctx.fillStyle = '#0D0A0C'; ctx.fill();
    return s;
  }
  // Baked soft shadow for a card of size w x h with corner radii rad (keyed by size), drawn under clipped card layers.
  const CARD_SH = {};
  function cardShadow(w, h, rad) {
    const k = `${w}x${h}`;
    if (CARD_SH[k]) return CARD_SH[k];
    const m = 60, b = makeBuf(Math.ceil(w + 2 * m), Math.ceil(h + 2 * m)), g = b.g;
    g.shadowColor = 'rgba(226,86,125,0.14)'; g.shadowBlur = 28; g.shadowOffsetY = 10;
    g.beginPath(); g.roundRect(m, m, w, h, rad); g.fillStyle = '#FFFFFF'; g.fill();
    return (CARD_SH[k] = { c: b.c, m });
  }
  // A captured layer at its sidecar rect (1 CSS px = 1 reel px). o.pop = 0..1 entrance with the app's pop curve.
  function layer(ctx, s, name, o = {}) {
    const l = L()[name], im = img(name);
    if (!l || !im) return;
    const x = s.x + l.screen.x, y = s.y + l.screen.y, w = l.screen.w, h = l.screen.h;
    const k = o.pop ?? 1;
    if (k <= 0) return;
    const e = Ease.outBack(clamp(k), 1.6), ax = x + (o.ax ?? 0) * w, ay = y + h;
    ctx.save();
    ctx.globalAlpha *= clamp(k / 0.45) * (o.alpha ?? 1);
    ctx.translate(ax, ay + 14 * (1 - e)); ctx.scale(lerp(0.92, 1, e), lerp(0.92, 1, e)); ctx.translate(-ax, -ay);
    if (o.clipEl && l.element) {                                           // card only: clip to the element, baked shadow
      const ex = x + l.element.x, ey = y + l.element.y, rad = l.radius || 0;
      const sh = cardShadow(l.element.w, l.element.h, rad);
      ctx.drawImage(sh.c, ex - sh.m, ey - sh.m);
      ctx.beginPath(); ctx.roundRect(ex, ey, l.element.w, l.element.h, rad); ctx.clip();
    }
    ctx.drawImage(im, x, y, w, h);
    ctx.restore();
  }
  // Typing from the real bubble raster: whole characters at CPS, shell grows a row at a time (recipe: typedBubble).
  function typedNote(ctx, env, s, lt) {
    const l = L().note, im = img('note'), bg = img('note.textfree');
    if (!l || !im || !bg || lt < 0) return;
    const r = { x: s.x + l.screen.x, y: s.y + l.screen.y, w: l.screen.w, h: l.screen.h }, rows = l.rows, at0 = [];
    let acc = 0;
    rows.forEach((q) => { at0.push(acc / CPS); acc += q.cx.length + 3; });
    let ext = rows[0].y1;
    for (let i = 1; i < rows.length; i++) ext += Ease.outBack(rm(lt, at0[i] - 0.03, at0[i] + 0.17), 2.2) * (rows[i].y1 - rows[i - 1].y1);
    const padB = r.h - rows[rows.length - 1].y1, hh = Math.min(r.h, ext + padB), ax = r.x + r.w, ay = r.y + hh, pop = lerp(0.55, 1, spring(lt, 3, 0.7));
    ctx.save(); ctx.globalAlpha *= Ease.outC(rm(lt, 0, 0.1));
    ctx.translate(ax, ay); ctx.scale(pop, pop); ctx.translate(-ax, -ay);
    ctx.save(); ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, hh, l.radius); ctx.clip();
    ctx.drawImage(bg, r.x, r.y, r.w, r.h);
    let caret = null;
    ctx.save(); ctx.beginPath();
    rows.forEach((q, i) => {
      const k = Math.min(q.cx.length, Math.floor((lt - at0[i]) * CPS));
      if (k <= 0) return;
      ctx.rect(r.x, r.y + q.y0 - 2, k < q.cx.length ? q.cx[k - 1] + 1 : r.w, q.y1 - q.y0 + 4);
      caret = [r.x + q.cx[k - 1] + 1.5, r.y + q.y0, q.y1 - q.y0];
    });
    ctx.clip(); ctx.drawImage(im, r.x, r.y, r.w, r.h); ctx.restore();
    ctx.restore();
    const done = lt > at0[at0.length - 1] + rows[rows.length - 1].cx.length / CPS;
    if (caret && (!done || Math.floor(lt * 2.5) % 2 === 0) && lt < (B.card - B.type) * env.beatSec) { ctx.fillStyle = env.palette.accentStrong || env.palette.ink; ctx.fillRect(caret[0], caret[1] + 1, 2, caret[2] - 2); }
    ctx.restore();
  }
  function screenUI(ctx, env, s, lt) {
    const P = env.palette, bs = env.beatSec;
    statusBar(ctx, P, s);
    // welcome -> empty feed (header and composer are identical in both, so only the feed band changes)
    layer(ctx, s, 'base');
    withAlpha(ctx, 1 - Ease.ioC(rm(lt, B.clear * bs, B.clear * bs + 0.3)), () => layer(ctx, s, 'welcome'));
    typedNote(ctx, env, s, lt - B.type * bs);
    // tidy card: the five captured states, one per 3/4 beat, popping in like the app does; avatar beside it
    const kc = (lt - B.card * bs) / 0.42;                                  // 0.42 s = the app's own .pop animation
    if (kc > 0) {
      layer(ctx, s, 'mini', { pop: kc });
      const i = Math.min(4, Math.floor((lt - B.card * bs) / (B.step * bs)));
      layer(ctx, s, 'steps_' + Math.max(0, i - 1), { pop: kc, clipEl: true });
      if (i > 0) withAlpha(ctx, Ease.outC(rm(lt - (B.card + i * B.step) * bs, 0, 0.12)), () => layer(ctx, s, 'steps_' + i, { clipEl: true }));
    }
    // result card (alpha layer with its own shadow); the real ticked state cross-fades in on the hold's first bar line
    const kr = (lt - B.result * bs) / 0.42;
    if (kr > 0) {
      layer(ctx, s, 'result', { pop: kr, ax: 0.1 });
      onBars(env, 1, (n, dt) => { if (n === 0) withAlpha(ctx, Ease.outC(clamp(dt / 0.15)), () => layer(ctx, s, 'result_checked')); });
    }
  }
  // Chip canvases (chip() with its drop shadow) cached per label and icon colour.
  const CHIP_C = {};
  function chipCanvas(c, iconColor, P) {
    const k = c.label + '|' + iconColor;
    if (CHIP_C[k]) return CHIP_C[k];
    const z = SLOT.size, w = measure(makeBuf(4, 4).g, c.label, { size: z, weight: 800, fam: 'sans' }) + z * 1.5 + (c.icon ? z * 1.6 : 0);   // = engine chip() width
    const m = 48, hh = z * 1.9, b = makeBuf(Math.ceil(w + 2 * m), Math.ceil(hh + 2 * m));
    chip(b.g, m + w / 2, m + hh / 2, c.label, { size: z, weight: 800, fam: 'sans', align: 'center', icon: c.icon || undefined, iconColor,
      fg: c.icon ? P.ink : P.ink2, bg: c.icon ? P.surface : P.bg2, shadowBlur: c.icon ? 28 : 14 });
    return (CHIP_C[k] = { c: b.c, m, w, hh });
  }
  SCENES['app'] = {
    portal(t, env) { return { x: SCR.x, y: SCR.y + floatY(env.lt), w: SCR.w, h: SCR.h, r: SCR.r }; },
    draw(ctx, t, env) {
      const P = env.palette, lt = env.lt, bs = env.beatSec, SP = env.style.motion.spring || {};
      ctx.imageSmoothingQuality = 'high';
      backdrop(ctx, P, lt);
      // ── the icon outline morphs into the phone (recipe: outline morph) ──
      const k = rm(lt, B.morph * bs, B.morph * bs + 0.7), m = Ease.ioC(k), fy = floatY(lt), cam = camera(lt, bs);
      ctx.save();
      ctx.translate(cam.a[0], cam.a[1]); ctx.scale(cam.z, cam.z); ctx.translate(-cam.f[0], -cam.f[1]);
      softBlob(ctx, 1340, 560 + fy, 600, rgba(P.accent, 0.16 * Ease.outC(rm(k, 0.4, 1))));   // colour field behind the phone
      const tile = { x: ICON_AT.x - ICON_AT.s / 2, y: ICON_AT.y - ICON_AT.s / 2, w: ICON_AT.s, h: ICON_AT.s, r: ICON_AT.s * 0.27 };
      const ph = { ...PHONE, y: PHONE.y + fy };
      const box = { x: lerp(tile.x, ph.x, m), y: lerp(tile.y, ph.y, m), w: lerp(tile.w, ph.w, m), h: lerp(tile.h, ph.h, m), r: lerp(tile.r, ph.r, m) };
      if (k < 1) {
        ctx.save(); ctx.shadowColor = rgba(P.accentStrong || P.accent, 0.28 * (1 - m)); ctx.shadowBlur = 34; ctx.shadowOffsetY = 12;
        rr(ctx, box.x, box.y, box.w, box.h, box.r); ctx.fillStyle = linear(ctx, box.x, box.y, box.x + box.w, box.y + box.h, [[0, '#FFFBF7'], [0.5, '#FFF0E8'], [1, '#FFDCCD']]); ctx.fill();
        ctx.restore();
        const ia = 1 - Ease.inC(rm(k, 0, 0.45));                            // Mochi inside the icon zooms toward the camera and fades
        if (ia > 0) withAlpha(ctx, ia, () => { const s = ICON_AT.s * (1 + 0.5 * Ease.inC(rm(k, 0, 0.45))); ctx.drawImage(IMG.mochi_icon, ICON_AT.x - s / 2 + (box.x + box.w / 2 - ICON_AT.x), ICON_AT.y - s / 2 + (box.y + box.h / 2 - ICON_AT.y), s, s); });
      }
      const pa = Ease.outC(rm(k, 0.45, 1));
      if (pa > 0) {                                                          // the phone rides the morphing box
        ctx.save(); ctx.globalAlpha *= pa;
        ctx.translate(box.x, box.y); ctx.scale(box.w / ph.w, box.h / ph.h); ctx.translate(-ph.x, -ph.y);
        phone(ctx, P, ph, (g, s) => screenUI(g, env, s, lt));
        ctx.restore();
      }
      if (k > 0 && k < 1) {                                                  // glowing outline + glints along it
        const pts = roundRectPoints(box, 220), glow = Math.sin(Math.PI * k);
        ctx.save(); ctx.lineJoin = 'round'; ctx.shadowColor = rgba(P.accent, 0.8); ctx.shadowBlur = 24 * glow;
        ctx.strokeStyle = rgba(P.accent, 0.9 * (1 - rm(k, 0.75, 1))); ctx.lineWidth = lerp(3, 9, glow); pathFrom(ctx, pts, true); ctx.stroke(); ctx.restore();
        const g1 = pointAt(pts, m), g2 = pointAt(pts, (m + 0.5) % 1);
        sparkle(ctx, g1.x, g1.y, 24, glow, k * 3, '#FFFFFF'); sparkle(ctx, g2.x, g2.y, 18, glow * 0.8, -k * 3, '#FFFFFF');
      }
      ctx.restore();
      // ── Mochi, watching the phone (thinking) then cheering ──
      const mx = 930, mfeet = 1000, mh = 214, ml = at(env, B.mochi);
      if (ml > 0) {
        let hop = 0, happy = lt > B.result * bs;
        const r1 = lt - B.result * bs;                                        // cheer: hop on the result
        if (r1 > 0 && r1 < 0.5) hop = Math.sin(Math.PI * r1 / 0.5) * 60;
        onBars(env, 1, (n, dt) => { if (dt < 0.42) hop = Math.max(hop, Math.sin(Math.PI * dt / 0.42) * 44); });
        groundShadow(ctx, mx, mfeet + 4, mh * 0.62 * (1 - hop / 200), 0.3 * clamp(ml / 0.2), P.shadow);
        popChar(ctx, happy ? 'mochi_happy' : 'mochi_think', mx, mfeet - hop, mh, ml, { fromY: 260, f: SP.f ?? 2.6, z: SP.z ?? 0.42, squash: 0.12, jelly: 16, seed: 4, shadow: false, flip: true });
        if (r1 > 0 && r1 < 0.6) for (let j = 0; j < 6; j++) {               // the swap hides behind a sparkle burst
          const an = -Math.PI / 2 + (j - 2.5) * 0.5, d = 70 + Ease.outC(r1 / 0.6) * 70;
          sparkle(ctx, mx + Math.cos(an) * d, mfeet - mh * 0.75 + Math.sin(an) * d * 0.8, 11 + (j % 2) * 5, Math.sin(Math.PI * r1 / 0.6), r1 * 4 + j, mix('#FFFFFF', P.accent, 0.35));
        }
      }
      // ── kinetic headline ──
      const hsz = fitSize(ctx, 'Mochi tidies up!', 800, { size: 104, weight: 900, fam: 'display', ls: -1.5 });
      const hOpt = { size: hsz, weight: 900, fam: 'display', pop: true, stagger: 0.026, dur: 0.42, ls: -hsz * 0.015 };
      kinetic(ctx, 'Jot it down.', 166, 330, at(env, B.head1), { ...hOpt, color: P.ink });
      const subIn = rm(lt, 1.4 * bs, 1.4 * bs + 0.5), subOut = Ease.inC(rm(lt, (B.head2 - 0.3) * bs, B.head2 * bs));   // README line; hands its place to line 2
      if (subIn > 0 && subOut < 1) withAlpha(ctx, 1 - subOut, () => revealLine(ctx, 'Type anything. Messy is fine!', 170, 330 + hsz * 1.06 - 24 * subOut, subIn, { size: 44, weight: 800, fam: 'sans', color: P.ink2 }));
      const pulse = beatPulse(env, 7, 4) * rm(lt, env.inSec, env.inSec + 0.01);
      kinetic(ctx, 'Mochi tidies up!', 166, 330 + hsz * 1.16, at(env, B.head2), { ...hOpt, colorFn: (i) => (i >= 6 ? P.accentStrong || P.accent : P.ink), glow: pulse > 0.02 ? rgba(P.accent, 0.5 * pulse) : undefined, glowBlur: 26 });
      // ── chips fly from the result card rows to a tidy list ──
      const lay = L(), res = lay.result;
      if (res && res.rows) {
        const sY = SCR.y + fy, FL = 0.36;
        let ticked = -1, ring = -1, walk = -1, walkT = 0;
        onBars(env, 1, (n, dt) => { if (n === 0) ticked = dt; if (n === 1) ring = dt; });
        onBeats(env, 2, (n, dt) => { walk = n % CHIPS.length; walkT = dt; });   // hold: a highlight walks the list
        [...CHIPS.keys()].reverse().map((i) => [CHIPS[i], i]).forEach(([c, i]) => {
          const kl = lt - (B.chips + (CHIPS.length - 1 - i) * 0.25) * bs;      // land bottom-up: a flight never crosses a landed chip
          if (kl < 0) return;
          const row = res.rows[c.row], from = [SCR.x + res.screen.x + (row.x0 + row.x1) / 2, sY + res.screen.y + (row.y0 + row.y1) / 2];
          const done = i === 0 && ticked >= 0, dk = done ? Ease.outC(clamp(ticked / 0.3)) : 0;
          const cc = chipCanvas(c, done ? P.ok : P.accentStrong || P.accent, P), w = cc.w;
          const to = [SLOT.x + w / 2, SLOT.y + i * SLOT.dy], kf = clamp(kl / FL), e = Ease.outC(kf), land = kl - FL;
          const ctl = [lerp(from[0], to[0], 0.5), Math.min(from[1], to[1]) - 150];
          let [x, y] = kf < 1 ? qbez(from, ctl, to, e) : [to[0], to[1] + Math.sin(lt * 1.8 + i) * 2.4];
          if (kf < 1) for (let j = 1; j <= 4; j++) { const q = qbez(from, ctl, to, Ease.outC(clamp(kf - j * 0.07))); sparkle(ctx, q[0], q[1], 10 - j * 1.6, (1 - kf) * (1 - j / 5), j + lt * 4, mix('#FFFFFF', P.accent, 0.3)); }
          let rot = kf < 1 ? (1 - e) * (i % 2 ? 0.12 : -0.12) : 0.04 * wob(land, 2.6, 8), sc = kf < 1 ? lerp(0.5, 1, e) : 1 + 0.1 * wob(land, 3.2, 9);
          if (i === 1 && ring >= 0) rot += 0.06 * Math.sin(ring * 34) * Math.exp(-ring * 3.5);
          const hl = walk === i ? Math.exp(-walkT * 3.2) : 0;
          sc *= 1 + 0.045 * hl;
          ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc);
          ctx.drawImage(cc.c, -cc.w / 2 - cc.m, -cc.hh / 2 - cc.m);
          const strokeA = (i === 1 && ring >= 0 && ring < 0.8) ? 1 - ring / 0.8 : 0.85 * hl;
          if (strokeA > 0.03) { rr(ctx, -cc.w / 2 + 0.75, -cc.hh / 2 + 0.75, cc.w - 1.5, cc.hh - 1.5, cc.hh / 2); ctx.strokeStyle = rgba(P.accent, strokeA); ctx.lineWidth = 2.5; ctx.stroke(); }
          if (done) {                                                         // strike-through draws across the label
            const tw = measure(ctx, c.label, { size: SLOT.size, weight: 800, fam: 'sans' }), x0 = -w / 2 + SLOT.size * 0.75 + SLOT.size * 1.6;
            ctx.strokeStyle = rgba(P.ink, 0.75); ctx.lineWidth = 3; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(x0 - 2, 2); ctx.lineTo(x0 + (tw + 4) * dk, 2); ctx.stroke();
          }
          if (land > 0 && land < 0.25) { const q = land / 0.25, hh = SLOT.size * 1.9; ctx.strokeStyle = rgba(P.accent, 0.55 * (1 - q)); ctx.lineWidth = 2; rr(ctx, -w / 2 - 10 * q, -hh / 2 - 10 * q, w + 20 * q, hh + 20 * q, hh / 2 + 10 * q); ctx.stroke(); }
          ctx.restore();
        });
        if (ticked >= 0 && ticked < 0.5) {                                   // tap ripple on the real checkbox
          const row = res.rows[2], cx = SCR.x + res.screen.x + row.x0 - 23, cy = sY + res.screen.y + (row.y0 + row.y1) / 2, q = ticked / 0.5;
          ctx.save(); ctx.strokeStyle = rgba(P.accentStrong || P.accent, 0.7 * (1 - q)); ctx.lineWidth = 3; circle(ctx, cx, cy, 10 + 34 * Ease.outC(q)); ctx.stroke();
          circle(ctx, cx, cy, 16 * (1 - q)); ctx.fillStyle = rgba(P.accentStrong || P.accent, 0.25 * (1 - q)); ctx.fill(); ctx.restore();
        }
      }
    },
  };
})();
