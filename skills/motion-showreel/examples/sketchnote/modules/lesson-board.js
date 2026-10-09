// modules/lesson-board.js: the one big whiteboard of the sketchnote example (global LB).
// The reel is one board and one take: every scene is a camera shot on it. The board is laid out per cut (a panel per
// part of the lesson, joined by big blue arrows, as in the lesson notes' board plan), and every panel draws itself
// from its own scene's local time, so any shot can see any panel in the right state (a camera flight between two
// panels shows both). Panels register in LB.panels from their own modules (panel-*.js); scenes only own cameras.
(() => {
  const LB = (window.LB = { panels: {} });
  const PW = 1920, PH = 1080;                          // one panel = one frame of board at zoom 1
  LB.PW = PW; LB.PH = PH;
  LB.PANEL = { wall: 'notes', rescue: 'notes', kit: 'kit', endcard: 'title' };
  const at = (b, env) => b * env.beatSec;
  LB.FLIGHT_BEATS = 1.5;                              // each side of the cut: the outgoing out-phase, the incoming arrival

  // Copy: verbatim from STORYBOARD.md section 2 (ids in comments).
  LB.COPY = {
    hook: 'Notes nobody reads?',                                         // c1
    hookCircle: 'nobody',                                                // c2 (circled in orange)
    wall: [                                                              // c3: the exercise, line for line
      'Weekly sync, Tue. Talked about the support inbox again.',
      'Customers wait 3 days for a reply, sometimes more, and',
      'nobody knows who is on the inbox today. It is a shared',
      'inbox, so five of us look at it and nobody owns it. Sam',
      'says shared inbox = no owner. Lena asked about a rota.',
      'Idea: one owner per day, on a simple rota. Try it for',
      'two weeks, then check the wait time again. Also the',
      'printer is broken again. Next sync: Tue.',
    ],
    phrases: [                                                           // c4: boxed, then the diagram
      { line: 1, text: 'Customers wait 3 days' },
      { line: 4, text: 'shared inbox = no owner' },
      { line: 5, text: 'one owner per day' },
    ],
    why: 'why?', so: 'so',                                               // c5
    moves: ['BOX IT', 'ARROW IT', 'STAR IT'],                            // c6
    see: 'Notes people see.',                                            // c7
    margin: 'try it for two weeks',                                      // c8
    kitHead: '3 markers. 3 jobs.',                                       // c9
    jobs: ['words', 'structure', 'the ONE thing'],                       // c10
    kitNote: 'if everything is orange → nothing is!!',                   // c11
    toKit: 'all it takes:',                                              // c12
    toTitle: 'try it Thursday',                                          // c13
    kicker: 'Visual Notes Lab · Lesson 3',                               // c14
    title: 'Box it. Arrow it. Star it.',                                 // c15
    when: 'Thursday 10:00 · Studio room 2',                              // c16
    bring: 'bring your 3 markers',                                       // c17
    signoff: 'see you there! — Mara',                                    // c18
    fiction: 'Scribblewell Studio is fictional · example notes are made up',   // c19
  };

  // ───────── layout and time ─────────
  const LAYOUTS = new Map();
  LB.layout = (env) => {
    const ids = REEL.plan.scenes.map(s => s.id);
    if (env && !ids.includes(env.id)) ids.push(env.id);        // a scene rendered alone that this cut leaves out
    const key = ids.join(',');
    if (LAYOUTS.has(key)) return LAYOUTS.get(key);
    const kit = ids.includes('kit');
    const P = { notes: { x: 0, y: 0 } };
    if (kit) { P.kit = { x: 2000, y: 0 }; P.title = { x: 1000, y: 1100 }; }
    else P.title = { x: 2000, y: 0 };
    for (const p of Object.values(P)) { p.cx = p.x + PW / 2; p.cy = p.y + PH / 2; }
    const xs = Object.values(P).map(p => p.x), ys = Object.values(P).map(p => p.y);
    const board = { x0: Math.min(...xs) - 140, y0: Math.min(...ys) - 140, x1: Math.max(...xs) + PW + 140, y1: Math.max(...ys) + PH + 120 };
    const order = [];
    for (const id of ids) { const p = LB.PANEL[id]; if (p && !order.includes(p)) order.push(p); }
    const r = { P, board, order, kit, key };
    LAYOUTS.set(key, r);
    return r;
  };
  // Start and length of every scene of the cut on env.t's clock. Anchored on env, so a scene rendered alone at any
  // length still sees the others in the right state (earlier ones finished, later ones not started).
  LB.times = (env) => {
    const S = REEL.plan.scenes, j = S.findIndex(s => s.id === env.id), base = env.t - env.lt, out = {};
    const pack = (s, t0, dur) => ({ t0, dur, inSec: s.inSec, outSec: s.outSec, beat: env.beatSec, bar: env.barSec });
    if (j < 0) { out[env.id] = { t0: base, dur: env.dur, inSec: env.inSec, outSec: env.outSec, beat: env.beatSec, bar: env.barSec }; return out; }
    S.forEach((s, i) => {
      if (i < j) out[s.id] = pack(s, base - (S[j].t0 - s.t0), s.dur);
      else if (i === j) out[s.id] = { t0: base, dur: env.dur, inSec: env.inSec, outSec: env.outSec, beat: env.beatSec, bar: env.barSec };
      else out[s.id] = pack(s, base + env.dur + (s.t0 - S[j].t1), s.dur);
    });
    return out;
  };
  // Scene-local time of `id` at env.t (null when the cut has no such scene).
  LB.lt = (T, id, t) => (T[id] ? t - T[id].t0 : null);

  // ───────── cameras ─────────
  LB.rest = (p) => SN.view(p.cx, p.cy, 1);
  // A flight from panel A to panel B, q = 0..1 across the window around the cut: zoom out, travel, zoom in.
  LB.flightView = (A, B, q) => {
    q = clamp(q);
    const e = Ease.ioC(q), s = Math.sin(Math.PI * q), zmin = 0.6;
    const z = 1 / (1 + (1 / zmin - 1) * Math.pow(s, 1.2));
    return SN.view(lerp(A.cx, B.cx, e), lerp(A.cy, B.cy, e), z);
  };
  // The flight into scene `id` (tb = its start): q at time t, or null outside the window.
  LB.flightQ = (T, id, t, beatSec) => {
    if (!T[id]) return null;
    const half = LB.FLIGHT_BEATS * beatSec, tb = T[id].t0;
    return (t - (tb - half)) / (2 * half);
  };
  // Pairs of consecutive panels with their flight: [{a, b, into (scene id that starts at the cut)}].
  LB.flights = (T, lay) => {
    const S = REEL.plan.scenes.map(s => s.id).filter(id => T[id]), out = [];
    for (let i = 1; i < S.length; i++) {
      const a = LB.PANEL[S[i - 1]], b = LB.PANEL[S[i]];
      if (a !== b && lay.P[a] && lay.P[b]) out.push({ a, b, into: S[i], from: S[i - 1] });
    }
    return out;
  };
  // The camera of the frame for a scene during a flight it takes part in (else null): the outgoing scene's
  // out-phase and the incoming scene's first beats share one function, so the cut lands on identical pixels.
  LB.flightCam = (env) => {
    const T = LB.times(env), lay = LB.layout(env);
    for (const f of LB.flights(T, lay)) {
      if (f.into !== env.id && f.from !== env.id) continue;
      const q = LB.flightQ(T, f.into, env.t, env.beatSec);
      if (q > 0 && q < 1) return LB.flightView(lay.P[f.a], lay.P[f.b], q);
    }
    return null;
  };

  // ───────── connectors: the big blue arrows between panels ─────────
  function connectorCtrl(A, B) {
    if (Math.abs(B.y - A.y) < 10) {             // to the right
      return [[A.x + 1770, A.y + 840], [A.x + 1990, A.y + 960], [B.x - 230, B.y + 520], [B.x - 40, B.y + 330], [B.x + 110, B.y + 300]];
    }
    // down and to the left, with a loop ("and back again")
    return [[A.x + 820, A.y + 1010], [A.x + 640, A.y + 1150], [A.x + 520, A.y + 1100], [A.x + 560, A.y + 1030], [A.x + 660, A.y + 1090],
      [A.x + 520, A.y + 1240], [B.x + 1180, B.y - 90], [B.x + 1010, B.y + 80]];
  }
  const CONN = new Map();
  function connector(A, B, boil) {
    const k = `${A.x},${A.y}>${B.x},${B.y}|${boil}`;
    if (CONN.has(k)) return CONN.get(k);
    if (CONN.size > 64) CONN.clear();
    const r = SN.arrow(connectorCtrl(A, B), { seed: Math.round(A.x + B.y) % 97 + 3, amp: 3, boil, head: 46, spread: 0.5 });
    CONN.set(k, r);
    return r;
  }
  LB.connectorInk = (g, T, lay, t, beatSec, boil) => {
    const heads = [];
    for (const f of LB.flights(T, lay)) {
      const q = LB.flightQ(T, f.into, t, beatSec);
      if (q === null || q <= 0.02) continue;
      const A = lay.P[f.a], B = lay.P[f.b], ar = connector(A, B, boil);
      const u = Ease.ioC(rm(q, 0.04, 0.84)), hk = rm(q, 0.84, 0.95);
      const head = SN.stroke(g, ar.shaft, u, { color: C.accent2, width: 13 });
      if (hk > 0) SN.stroke(g, ar.head, hk, { color: C.accent2, width: 13 });
      // its label, in pen, near the tail (written as the arrow leaves)
      const lab = f.into === 'kit' ? LB.COPY.toKit : LB.COPY.toTitle, p0 = ar.shaft[0];
      const lx = Math.abs(B.y - A.y) < 10 ? A.x + 1450 : A.x + 300, ly = Math.abs(B.y - A.y) < 10 ? A.y + 1010 : A.y + 1000;
      SN.write(g, lab, lx, ly, SN.kAt(q * 3 * LB.FLIGHT_BEATS * beatSec, 0.05, 22), { size: 58, weight: 600, fam: 'pen', color: C.ink2, seed: 41, boil });
      if (q < 1.15) heads.push({ q, head: hk > 0 ? ar.tip : head && [head.x, head.y], start: p0, end: ar.tip, f });
    }
    return heads;
  };

  // ───────── the board ─────────
  const GHOSTS = new Map();
  function ghostLayer(id) {
    if (GHOSTS.has(id)) return GHOSTS.get(id);
    const s = 0.5, b = makeBuf(Math.ceil(PW * s), Math.ceil(PH * s)), g = b.g, seed = [...id].reduce((a, c) => a + c.charCodeAt(0), 0);
    g.scale(s, s);
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = C.ghost || C.line; g.globalAlpha = 0.55; g.filter = 'blur(2px)';
    for (let i = 0; i < 7; i++) {                                    // old handwriting, wiped
      const x0 = 120 + hash(seed + i * 3.1) * 1300, y0 = 120 + hash(seed + i * 5.7) * 860, L = 220 + hash(seed + i) * 520, P = [];
      for (let x = 0; x <= L; x += 6) P.push([x0 + x, y0 + Math.sin(x / 9 + i) * 9 * (0.6 + 0.4 * Math.sin(x / 41)) + Math.sin(x / 70) * 6]);
      g.lineWidth = 6 + hash(seed + i * 9) * 3; g.beginPath(); P.forEach((p, k) => (k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
    }
    for (let i = 0; i < 3; i++) {                                    // an old box, a loop, an arrow
      const x = 140 + hash(seed + 40 + i) * 1400, y = 140 + hash(seed + 50 + i) * 760;
      g.lineWidth = 8;
      const P = i === 0 ? SN.box(x, y, 260 + hash(seed + i) * 200, 110, { seed: seed + i }) : i === 1 ? SN.loop(x, y, 150, 60, { seed: seed + i }) : SN.arrow([[x, y], [x + 140, y - 60], [x + 300, y + 10]], { seed: seed + i }).shaft;
      g.beginPath(); P.forEach((p, k) => (k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
    }
    g.filter = 'none';
    const r = { b, s };
    GHOSTS.set(id, r);
    return r;
  }
  // Wall, board surface (with its frame and tray) and ghosts, through the camera.
  LB.drawBoard = (ctx, cam, lay) => {
    const B = lay.board, z = cam.z, sx = cam.sx, sy = cam.sy;
    const wallVisible = sx(B.x0) > 0 || sx(B.x1) < W || sy(B.y0) > 0 || sy(B.y1 + 120) < H;
    if (wallVisible) {
      ctx.fillStyle = linear(ctx, 0, 0, 0, H, [[0, '#E9E6E0'], [1, '#DDD9D2']]);
      ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.filter = `blur(${Math.max(4, 40 * z)}px)`; ctx.fillStyle = 'rgba(60,56,50,0.22)';
      ctx.fillRect(sx(B.x0) + 10 * z, sy(B.y0) + 40 * z, (B.x1 - B.x0) * z, (B.y1 - B.y0 + 60) * z); ctx.restore();
      const f = 34 * z;                                              // aluminium frame
      ctx.fillStyle = linear(ctx, 0, sy(B.y0) - f, 0, sy(B.y1) + f, [[0, '#C9CED4'], [0.5, C.boardFrame || '#AEB4BC'], [1, '#9AA1A9']]);
      rr(ctx, sx(B.x0) - f, sy(B.y0) - f, (B.x1 - B.x0) * z + 2 * f, (B.y1 - B.y0) * z + 2 * f, 10 * z); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(sx(B.x0) - f + 4 * z, sy(B.y0) - f + 4 * z, (B.x1 - B.x0) * z + 2 * f - 8 * z, 3 * z);
    } else { ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H); }
    // board surface: the paper-white of the kit, a soft glossy fall-off toward the frame
    const x0 = Math.max(0, sx(B.x0)), y0 = Math.max(0, sy(B.y0)), x1 = Math.min(W, sx(B.x1)), y1 = Math.min(H, sy(B.y1));
    ctx.fillStyle = C.bg; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    if (wallVisible) {
      ctx.save(); ctx.beginPath(); ctx.rect(sx(B.x0), sy(B.y0), (B.x1 - B.x0) * z, (B.y1 - B.y0) * z); ctx.clip();
      const cx = sx((B.x0 + B.x1) / 2), cy = sy((B.y0 + B.y1) / 2), R = Math.hypot(B.x1 - B.x0, B.y1 - B.y0) * z * 0.62;
      ctx.fillStyle = radial(ctx, cx, cy, R * 0.55, R, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(60,64,72,0.07)']]); ctx.fillRect(sx(B.x0), sy(B.y0), (B.x1 - B.x0) * z, (B.y1 - B.y0) * z);
      ctx.restore();
    }
    // ghosts of old sessions, per panel (fixed: residue does not boil)
    for (const id of Object.keys(lay.P)) {
      const p = lay.P[id];
      if (sx(p.x + PW) < 0 || sx(p.x) > W || sy(p.y + PH) < 0 || sy(p.y) > H) continue;
      const gl = ghostLayer(id);
      ctx.save(); ctx.globalAlpha = 0.9; ctx.drawImage(gl.b.c, sx(p.x), sy(p.y), PW * z, PH * z); ctx.restore();
    }
    // tray under the board
    if (sy(B.y1) < H + 10) {
      const ty = sy(B.y1) + 34 * z, tx0 = sx(B.x0) - 60 * z, tx1 = sx(B.x1) + 60 * z;
      ctx.fillStyle = linear(ctx, 0, ty - 6 * z, 0, ty + 58 * z, [[0, '#D7DBE0'], [0.35, '#B7BDC5'], [1, '#8D949D']]);
      rr(ctx, tx0, ty - 6 * z, tx1 - tx0, 64 * z, 8 * z); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(tx0 + 6 * z, ty - 4 * z, tx1 - tx0 - 12 * z, 3 * z);
    }
  };

  // ───────── pens: one marker following a list of jobs ─────────
  // jobs: [{t0, t1, at: (t) => [x, y] world}] in time order. Returns {x, y, lift, ang} in world px, or null.
  LB.penPose = (jobs, t, o = {}) => {
    if (!jobs.length) return null;
    const enter = o.enter ?? 0.32, exit = o.exit ?? 0.42, home = o.home || [jobs[0].at(jobs[0].t0)[0] + 900, jobs[0].at(jobs[0].t0)[1] + 700];
    const away = o.away || home, first = jobs[0], last = jobs[jobs.length - 1];
    const travel = (a, b, k, hop) => { const e = Ease.ioC(k); return { x: lerp(a[0], b[0], e), y: lerp(a[1], b[1], e) - Math.sin(Math.PI * k) * hop, lift: Math.sin(Math.PI * k) }; };
    if (t < first.t0 - enter || t > last.t1 + exit) return null;
    if (t < first.t0) { const p = travel(home, first.at(first.t0), Ease.outC(rm(t, first.t0 - enter, first.t0)), 0); return { ...p, lift: 1 - rm(t, first.t0 - enter, first.t0) }; }
    for (let i = 0; i < jobs.length; i++) {
      const j = jobs[i];
      if (t <= j.t1) {
        if (t >= j.t0) { const p = j.at(t); return { x: p[0], y: p[1], lift: 0 }; }
        const pj = jobs[i - 1], a = pj.at(pj.t1), b = j.at(j.t0);
        return travel(a, b, rm(t, pj.t1, j.t0), Math.min(60, Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.15));
      }
    }
    const a = last.at(last.t1), k = Ease.inC(rm(t, last.t1, last.t1 + exit));
    return { x: lerp(a[0], away[0], k), y: lerp(a[1], away[1], k), lift: rm(t, last.t1, last.t1 + 0.12) };
  };
  LB.drawPen = (ctx, cam, pose, color, o = {}) => {
    if (!pose) return;
    SN.marker(ctx, cam.sx(pose.x), cam.sy(pose.y) - pose.lift * 14 * cam.z, { color, lift: pose.lift, scale: cam.z * (o.scale ?? 1) * (1 + pose.lift * 0.04), ang: (o.ang ?? -0.95) + (pose.lift - 0.5) * 0.06 });
  };

  // ───────── one frame of the board ─────────
  // cam: SN.view. Draws the wall/board, every visible panel's ink (multiplied on as marker ink), the connectors, then
  // props (pens, eraser, lifted cards) and screen overlays.
  LB.render = (ctx, env, cam) => {
    const T = LB.times(env), lay = LB.layout(env), t = env.t, boil = SN.boilStep(t);
    const S = { env, T, lay, t, boil, cam, beat: env.beatSec, bar: env.barSec };
    LB.drawBoard(ctx, cam, lay);
    const b = SN.beginInk(), g = b.g;
    cam.apply(g);
    const vis = (p) => !(cam.sx(p.x + PW) < -40 || cam.sx(p.x) > W + 40 || cam.sy(p.y + PH) < -40 || cam.sy(p.y) > H + 40);
    for (const id of lay.order) {
      const pnl = LB.panels[id];
      if (pnl && lay.P[id] && vis(lay.P[id])) { g.save(); g.translate(lay.P[id].x, lay.P[id].y); pnl.ink(g, S, lay.P[id]); g.restore(); }
    }
    LB.connectorInk(g, T, lay, t, env.beatSec, boil);
    SN.endInk(ctx, b, cam);
    for (const id of lay.order) {
      const pnl = LB.panels[id];
      if (pnl && pnl.props && lay.P[id] && vis(lay.P[id])) pnl.props(ctx, S, lay.P[id]);
    }
    for (const f of LB.flights(T, lay)) {                            // the blue pen draws each connector
      const tb = T[f.into].t0, half = LB.FLIGHT_BEATS * env.beatSec;
      if (t < tb - half - 0.4 || t > tb + half + 0.6) continue;
      const A = lay.P[f.a], B = lay.P[f.b];
      const jobs = [{ t0: tb - half + 0.04 * 2 * half, t1: tb - half + 0.95 * 2 * half, at: (tt) => {
        const q = (tt - (tb - half)) / (2 * half), ar = connector(A, B, boil);
        if (q > 0.84) { const hp = pointAt(ar.head, rm(q, 0.84, 0.95)); return [hp.x, hp.y]; }
        const p = pointAt(ar.shaft, Ease.ioC(rm(q, 0.04, 0.84))); return [p.x, p.y];
      } }];
      const pose = LB.penPose(jobs, t, { enter: 0.3, exit: 0.45, home: [A.x + 2050, A.y + 1450], away: [B.x + 1400, B.y + 1500] });
      LB.drawPen(ctx, cam, pose, C.accent2);
    }
    for (const id of lay.order) { const pnl = LB.panels[id]; if (pnl && pnl.overlay) pnl.overlay(ctx, S, lay.P[id]); }
    return S;
  };
})();
