// np-photo: the A1 picture of the Tamsin Valley Courier, drawn in code, and the halftone screen that prints it.
//
//   NP.photo.draw(g, st)        paints the scene as grey values in photo space (PW x PH = 1600 x 900, 16:9):
//                               the Wickham Ferry Town Hall clock tower at noon, Ferry Street, the crowd, bunting,
//                               pigeons. st = {lt (s since the first strike), beatSec, strikes} drives the hammer,
//                               the bell shiver, raised arms and the pigeons taking off. With no st it is the
//                               moment before the first strike, as printed on Page A1 (and in
//                               source/e-edition/a1-clocktower.png): pigeons perched, crowd waiting, phones up.
//   NP.photo.luma(st, res)      renders that scene into a small canvas and returns its grey bytes (cached per key).
//   NP.halftone(g, L, map, o)   prints a luma field as round dots on a 45-degree screen. The lattice is fixed in
//                               photo space, so the dots stay glued to the picture when the camera moves (they
//                               grow as the camera pushes in, as a real printed photo would).
//   NP.ringScreen(g, map, o)    the red plate: expanding sound rings from the bell, screened at 15 degrees.
//
// Pure functions of their arguments (hash() for every random choice). No scene state.
(() => {
  const NP = (window.NP = window.NP || {});
  const PW = 1600, PH = 900;
  const grey = (v) => { const c = Math.round(clamp(v) * 255); return `rgb(${c},${c},${c})`; };

  // ───────── the scene ─────────
  const TOWER = { cx: 1060, x0: 902, x1: 1218, side: 1296, top: 256, base: 900 };
  const CLOCK = { x: 1060, y: 392, r: 118 };
  const BELL = { x: 1060, y: 122 };

  function sky(g) {
    g.fillStyle = linear(g, 0, 0, 0, 700, [[0, grey(0.8)], [0.6, grey(0.9)], [1, grey(0.94)]]);
    g.fillRect(0, 0, PW, PH);
    // sun from the upper left, soft clouds with darker bellies
    g.fillStyle = radial(g, 260, -80, 0, 820, [[0, 'rgba(255,255,255,0.6)'], [1, 'rgba(255,255,255,0)']]);
    g.fillRect(0, 0, PW, PH);
    const clouds = [[430, 210, 250, 46], [640, 150, 190, 36], [1460, 250, 220, 44], [1360, 186, 140, 30], [170, 330, 210, 38]];
    for (const [x, y, rx, ry] of clouds) {
      g.fillStyle = radial(g, x, y + ry * 0.5, 0, rx, [[0, 'rgba(60,60,60,0.12)'], [1, 'rgba(60,60,60,0)']]);
      g.beginPath(); g.ellipse(x, y + ry * 0.5, rx, ry * 1.05, 0, 0, TAU); g.fill();
      g.fillStyle = radial(g, x - rx * 0.2, y - ry * 0.3, 0, rx * 0.95, [[0, 'rgba(255,255,255,0.7)'], [1, 'rgba(255,255,255,0)']]);
      g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill();
    }
  }
  function trees(g) {
    // a leafy mass low on the left (discs fixed by hash), darker inside, lit from the upper left
    for (let i = 0; i < 170; i++) {
      const a = hash(i * 1.37), b = hash(i * 2.91 + 4), x = -60 + a * 640 - b * b * 40, y = 500 + b * 420 - (1 - Math.abs(a - 0.45) * 2) * 70;
      const r = 26 + hash(i * 4.13) * 48;
      g.fillStyle = grey(0.18 + 0.12 * hash(i * 7.7) + 0.08 * (1 - b));
      circle(g, x, y, r); g.fill();
    }
    for (let i = 0; i < 90; i++) {
      const a = hash(i * 3.3 + 1), b = hash(i * 5.1 + 2), x = -20 + a * 560, y = 470 + b * 200;
      g.fillStyle = 'rgba(255,255,255,0.11)'; circle(g, x - 6, y - 8, 12 + hash(i * 9.3) * 20); g.fill();
    }
  }
  function street(g) {
    // Ferry Street on the right: a gabled block with two rows of windows and a striped shop awning
    g.fillStyle = grey(0.64); g.fillRect(1310, 520, 330, 420);
    g.fillStyle = grey(0.46); g.beginPath(); g.moveTo(1296, 524); g.lineTo(1470, 440); g.lineTo(1650, 524); g.closePath(); g.fill();
    g.fillStyle = grey(0.72); g.beginPath(); g.moveTo(1318, 520); g.lineTo(1470, 452); g.lineTo(1626, 520); g.closePath(); g.fill();
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
      g.fillStyle = grey(0.24); g.fillRect(1346 + c * 94, 566 + r * 88, 48, 62);
      g.fillStyle = grey(0.52); g.fillRect(1346 + c * 94, 566 + r * 88, 48, 6);
    }
    for (let i = 0; i < 9; i++) { g.fillStyle = grey(i % 2 ? 0.88 : 0.42); g.fillRect(1310 + i * 37, 744, 37, 30); }
    g.fillStyle = grey(0.22); g.fillRect(1310, 774, 330, 8);
    // the hall's low wing, left of the tower
    g.fillStyle = grey(0.6); g.fillRect(640, 610, 262, 320);
    g.fillStyle = grey(0.36); g.fillRect(630, 598, 272, 16);
    for (let c = 0; c < 3; c++) { g.fillStyle = grey(0.22); g.fillRect(672 + c * 78, 652, 40, 84); }
  }
  function tower(g, st) {
    const T = TOWER, cx = T.cx;
    // side face in shade, front face in sun, quoins at the corners
    g.fillStyle = grey(0.28);
    g.beginPath(); g.moveTo(T.x1, T.top); g.lineTo(T.side, T.top + 24); g.lineTo(T.side, T.base); g.lineTo(T.x1, T.base); g.closePath(); g.fill();
    g.fillStyle = linear(g, T.x0, 0, T.x1, 0, [[0, grey(0.62)], [1, grey(0.5)]]);
    g.fillRect(T.x0, T.top, T.x1 - T.x0, T.base - T.top);
    for (let k = 0; k < 22; k++) {
      const y = T.top + 22 + k * 30, w = k % 2 ? 26 : 40;
      g.fillStyle = grey(0.76); g.fillRect(T.x0, y, w, 26); g.fillStyle = grey(0.4); g.fillRect(T.x1 - w * 0.6, y, w * 0.6, 26);
    }
    // a tall arched window under the clock
    g.fillStyle = grey(0.72); g.beginPath(); g.moveTo(cx - 44, 760); g.lineTo(cx - 44, 600); g.arc(cx, 600, 44, Math.PI, 0); g.lineTo(cx + 44, 760); g.closePath(); g.fill();
    g.fillStyle = grey(0.1); g.beginPath(); g.moveTo(cx - 35, 752); g.lineTo(cx - 35, 602); g.arc(cx, 602, 35, Math.PI, 0); g.lineTo(cx + 35, 752); g.closePath(); g.fill();
    g.fillStyle = grey(0.55); g.fillRect(cx - 2, 570, 4, 182); g.fillRect(cx - 35, 676, 70, 4);
    // cornice over the clock stage
    g.fillStyle = grey(0.84); g.fillRect(T.x0 - 22, T.top - 18, T.x1 - T.x0 + 44, 22);
    g.fillStyle = grey(0.2); g.fillRect(T.x0 - 22, T.top + 4, T.x1 - T.x0 + 44, 8);
    g.fillStyle = grey(0.34); g.beginPath(); g.moveTo(T.x1 + 22, T.top - 18); g.lineTo(T.side + 14, T.top - 4); g.lineTo(T.side + 14, T.top + 16); g.lineTo(T.x1 + 22, T.top + 4); g.closePath(); g.fill();
    // belfry: an arcade open on the front, the bell inside, then the pyramid roof
    g.fillStyle = grey(0.68); g.fillRect(T.x0 + 18, 62, T.x1 - T.x0 - 36, T.top - 80);
    g.fillStyle = grey(0.3); g.beginPath(); g.moveTo(T.x1 - 18, 62); g.lineTo(T.side - 16, 80); g.lineTo(T.side - 16, T.top - 4); g.lineTo(T.x1 - 18, T.top - 18); g.closePath(); g.fill();
    g.fillStyle = grey(0.07);
    g.beginPath(); g.moveTo(cx - 104, T.top - 22); g.lineTo(cx - 104, 126); g.arc(cx, 126, 104, Math.PI, 0); g.lineTo(cx + 104, T.top - 22); g.closePath(); g.fill();
    const hit = st ? st.hit : 0, shiver = hit * 3 * Math.sin(st ? st.lt * 70 : 0);
    g.save(); g.translate(BELL.x + shiver, BELL.y);                     // the bell is fixed; a hammer strikes its rim
    g.fillStyle = grey(0.52 + 0.28 * hit);
    g.beginPath(); g.moveTo(-15, 0); g.bezierCurveTo(-42, 6, -40, 54, -62, 104); g.lineTo(62, 104); g.bezierCurveTo(40, 54, 42, 6, 15, 0); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.moveTo(-11, 8); g.bezierCurveTo(-30, 20, -32, 62, -44, 98); g.lineTo(-30, 98); g.bezierCurveTo(-20, 58, -17, 24, -4, 8); g.closePath(); g.fill();
    g.fillStyle = grey(0.18); g.fillRect(-66, 102, 132, 8);
    g.restore();
    const ham = st ? Math.exp(-Math.max(0, st.since) * 12) : 0;           // the hammer meets the rim on each strike
    g.save(); g.translate(cx + 100, 214); g.rotate(-0.5 * (1 - ham));
    g.fillStyle = grey(0.18); g.fillRect(-44, -4, 44, 8); circle(g, -46, 0, 10); g.fill();
    g.restore();
    g.fillStyle = grey(0.64); for (const x of [cx - 112, cx + 98]) g.fillRect(x, 72, 14, T.top - 94);
    g.fillStyle = grey(0.82); g.fillRect(T.x0 + 4, 46, T.x1 - T.x0 - 8, 18);
    g.fillStyle = grey(0.58); g.beginPath(); g.moveTo(T.x0 - 2, 48); g.lineTo(cx, -70); g.lineTo(cx, 48); g.closePath(); g.fill();
    g.fillStyle = grey(0.32); g.beginPath(); g.moveTo(cx, -70); g.lineTo(T.x1 + 2, 48); g.lineTo(T.side - 10, 62); g.closePath(); g.fill();
    g.fillStyle = grey(0.44); g.beginPath(); g.moveTo(cx, -70); g.lineTo(cx, 48); g.lineTo(T.x1 + 2, 48); g.closePath(); g.fill();
  }
  function clockFace(g) {
    const { x, y, r } = CLOCK;
    g.fillStyle = grey(0.16); circle(g, x, y, r + 17); g.fill();           // bezel
    g.fillStyle = grey(0.64); circle(g, x, y, r + 9); g.fill();
    g.fillStyle = radial(g, x - 34, y - 38, 10, r, [[0, grey(0.99)], [1, grey(0.88)]]);
    circle(g, x, y, r); g.fill();
    g.strokeStyle = grey(0.24); g.lineWidth = 3; circle(g, x, y, r - 26); g.stroke();
    for (let i = 0; i < 12; i++) {                                      // hour marks, heavier at 12, 3, 6, 9
      const a = (i / 12) * TAU - Math.PI / 2, big = i % 3 === 0;
      g.save(); g.translate(x + Math.cos(a) * (r - 13), y + Math.sin(a) * (r - 13)); g.rotate(a + Math.PI / 2);
      g.fillStyle = grey(0.1); g.fillRect(big ? -7 : -4, -11, big ? 14 : 8, big ? 24 : 19); g.restore();
    }
    // noon: both hands up (the minute hand longer and thinner), a boss in the middle
    g.fillStyle = grey(0.06);
    g.beginPath(); g.moveTo(x - 9, y + 14); g.lineTo(x - 6, y - 60); g.lineTo(x, y - 72); g.lineTo(x + 6, y - 60); g.lineTo(x + 9, y + 14); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(x - 5, y + 20); g.lineTo(x - 3.5, y - r + 22); g.lineTo(x, y - r + 10); g.lineTo(x + 3.5, y - r + 22); g.lineTo(x + 5, y + 20); g.closePath(); g.fill();
    circle(g, x, y, 11); g.fill();
  }
  function bunting(g, st) {
    // a string of pennants from the tower to the shop block, lifted by the breeze
    const sway = st ? Math.sin(st.lt * 1.3) * 4 : 0;
    const a = [TOWER.side, 560], b = [1660, 610], n = 9;
    const at = (u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u) + Math.sin(Math.PI * u) * (34 + sway)];
    g.strokeStyle = grey(0.2); g.lineWidth = 3;
    g.beginPath();
    for (let i = 0; i <= 30; i++) { const [x, y] = at(i / 30); i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
    for (let i = 0; i < n; i++) {
      const [x, y] = at((i + 0.5) / n), flap = st ? Math.sin(st.lt * 3.1 + i * 0.9) * 4 : 0;
      g.fillStyle = grey(i % 2 ? 0.9 : 0.3);
      g.beginPath(); g.moveTo(x - 14, y); g.lineTo(x + 14, y); g.lineTo(x + flap, y + 36); g.closePath(); g.fill();
    }
  }
  // the crowd on Ferry Street: heads and shoulders in three rows, phones held up, arms raised on the first strike
  const CROWD = (() => {
    const out = [];
    for (let row = 0; row < 3; row++) {
      const n = [16, 14, 12][row];
      for (let i = 0; i < n; i++) {
        const k = row * 31 + i, x = -50 + ((i + 0.5 + (hash(k * 1.9) - 0.5) * 0.7) / n) * 1720;
        out.push({ x, y: 806 + row * 50 + (hash(k * 2.3) - 0.5) * 16, r: 30 + row * 6 + hash(k * 3.7) * 7, row, k,
          arm: hash(k * 5.9) < 0.3 ? (hash(k * 6.1) < 0.5 ? -1 : 1) : 0, phone: hash(k * 8.3) < 0.34, tone: 0.05 + 0.16 * hash(k * 4.4) });
      }
    }
    return out;
  })();
  function crowd(g, st) {
    const lt = st ? st.lt : -1, up = Ease.outQuint(clamp((lt + 0.05) / 0.5));
    for (const p of CROWD) {
      const sway = Math.sin(lt * (1.1 + hash(p.k) * 0.8) + p.k) * 3 * (st ? 1 : 0), x = p.x + sway, y = p.y;
      if (p.arm) {                                   // phones are up already (filming); other arms rise on the first strike
        const raise = p.phone ? 1 : up, wave = Math.sin(lt * 5 + p.k) * 0.12 * raise * (st ? 1 : 0);
        const ang = lerp(2.5, p.phone ? 0.3 : 0.16, raise) * p.arm + wave;
        g.save(); g.translate(x + p.arm * p.r * 0.7, y + p.r * 0.7); g.rotate(ang);
        g.fillStyle = grey(p.tone + 0.05); g.fillRect(-9, -p.r * 2.7, 18, p.r * 2.7);
        circle(g, 0, -p.r * 2.8, 13); g.fill();
        if (p.phone) { g.fillStyle = grey(0.9); g.fillRect(-13, -p.r * 2.8 - 34, 26, 40); g.fillStyle = grey(0.3); g.fillRect(-13, -p.r * 2.8 - 34, 26, 4); }
        g.restore();
      }
      g.fillStyle = grey(p.tone);
      g.beginPath(); g.ellipse(x, y + p.r * 2.1, p.r * 1.9, p.r * 1.6, 0, Math.PI, 0); g.lineTo(x + p.r * 1.9, PH + 40); g.lineTo(x - p.r * 1.9, PH + 40); g.closePath(); g.fill();
      circle(g, x, y, p.r); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.09)'; circle(g, x - p.r * 0.3, y - p.r * 0.35, p.r * 0.55); g.fill();
    }
  }
  // pigeons on the cornice; on the first strike they lift off to the upper left, flapping
  function pigeons(g, st) {
    const lt = st ? st.lt : -1;
    const perch = [TOWER.x0 + 18, TOWER.x0 + 74, TOWER.x0 + 140, TOWER.x0 + 196, TOWER.x1 - 60, TOWER.x1 - 14];
    perch.forEach((x0, i) => {
      const y0 = TOWER.top - 30, ft = lt - 0.05 - hash(i * 2.2) * 0.2, s = 1 - 0.22 * hash(i * 9.7);
      let x = x0, y = y0, wing = 0.2, sc = s;
      if (ft > 0) {
        const vx = -(330 + hash(i * 4.4) * 250), vy = -(160 + hash(i * 5.5) * 130);
        x = x0 + vx * ft + Math.sin(ft * 2 + i) * 18; y = y0 + vy * ft - 50 * ft * ft + Math.sin(ft * 9 + i) * 5;
        wing = Math.sin(ft * (17 + hash(i) * 5) + i); sc = s * (1 - Math.min(0.4, ft * 0.12));
      }
      if (x < -90 || y < -90) return;
      g.save(); g.translate(x, y); g.scale(sc * (i % 2 ? -1 : 1), sc);
      g.fillStyle = grey(0.12);
      g.beginPath(); g.ellipse(0, 0, 21, 10, -0.1, 0, TAU); g.fill();
      circle(g, -17, -7, 7); g.fill();
      if (ft > 0) {
        g.beginPath(); g.moveTo(-8, -2); g.quadraticCurveTo(4, -30 * wing - 6, 24, -46 * wing); g.lineTo(12, -2); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(-4, 0); g.quadraticCurveTo(-14, -26 * wing - 4, -28, -38 * wing); g.lineTo(-14, 0); g.closePath(); g.fill();
      }
      g.restore();
    });
  }
  function draw(g, st) {
    sky(g); trees(g); street(g); tower(g, st); clockFace(g); bunting(g, st); pigeons(g, st); crowd(g, st);
  }

  // Grey bytes of the scene at res px wide (16:9). Cached by key, so a still frame is rendered once.
  const lumaCache = new Map();
  function luma(st, res = 400, key = null) {
    const k = key != null ? `${key}|${res}` : null;
    if (k && lumaCache.has(k)) return lumaCache.get(k);
    const w = res, h = Math.round((res * PH) / PW);
    if (!luma.buf || luma.buf.c.width !== w) luma.buf = makeBuf(w, h);
    const g = luma.buf.g;
    g.setTransform(w / PW, 0, 0, h / PH, 0, 0);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.filter = 'none';
    draw(g, st);
    g.setTransform(1, 0, 0, 1, 0, 0);
    const d = g.getImageData(0, 0, w, h).data, L = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) L[i] = d[i * 4] / 255;
    const out = { L, w, h };
    if (k) { lumaCache.set(k, out); if (lumaCache.size > 24) lumaCache.delete(lumaCache.keys().next().value); }
    return out;
  }
  const sample = (F, u, v) => {
    const x = clamp(u, 0, 1) * (F.w - 1), y = clamp(v, 0, 1) * (F.h - 1), x0 = Math.floor(x), y0 = Math.floor(y);
    const x1 = Math.min(F.w - 1, x0 + 1), y1 = Math.min(F.h - 1, y0 + 1), fx = x - x0, fy = y - y0, L = F.L;
    return lerp(lerp(L[y0 * F.w + x0], L[y0 * F.w + x1], fx), lerp(L[y1 * F.w + x0], L[y1 * F.w + x1], fx), fy);
  };

  // Print a luma field F as halftone dots. map = {x, y, w, h}: where the photo (1600 x 900 photo units) sits on the
  // canvas, in the current transform; o.pitch = screen pitch in photo units (default 11: an 85-line screen at A1
  // size); o.clip = {x, y, w, h} in photo units (default the whole photo); o.color; o.gain (dot gain, 1 = none);
  // o.grow 0..1 develops the dots (they grow from nothing). Returns the number of dots.
  function halftone(g, F, map, o = {}) {
    const P = o.pitch ?? 11, ang = ((o.angle ?? 45) * Math.PI) / 180, ca = Math.cos(ang), sa = Math.sin(ang);
    const sx = map.w / PW, sy = map.h / PH, cl = o.clip || { x: 0, y: 0, w: PW, h: PH }, grow = o.grow ?? 1;
    if (grow <= 0) return 0;
    const gain = o.gain ?? 1.08, rMax = P * 0.74;
    // lattice indices covering the clip box (rotated grid: project the corners)
    const cs = [[cl.x, cl.y], [cl.x + cl.w, cl.y], [cl.x, cl.y + cl.h], [cl.x + cl.w, cl.y + cl.h]];
    let i0 = 1e9, i1 = -1e9, j0 = 1e9, j1 = -1e9;
    for (const [x, y] of cs) { const i = (x * ca + y * sa) / P, j = (-x * sa + y * ca) / P; i0 = Math.min(i0, i); i1 = Math.max(i1, i); j0 = Math.min(j0, j); j1 = Math.max(j1, j); }
    g.save();
    g.beginPath(); g.rect(map.x + cl.x * sx, map.y + cl.y * sy, cl.w * sx, cl.h * sy); g.clip();
    g.beginPath();
    let n = 0;
    for (let j = Math.floor(j0) - 1; j <= Math.ceil(j1) + 1; j++) {
      for (let i = Math.floor(i0) - 1; i <= Math.ceil(i1) + 1; i++) {
        const px = (i * ca - j * sa) * P, py = (i * sa + j * ca) * P;
        if (px < cl.x - P || px > cl.x + cl.w + P || py < cl.y - P || py > cl.y + cl.h + P) continue;
        const d = Math.pow(1 - sample(F, px / PW, py / PH), 1.12) * gain;
        if (d < 0.02) continue;
        const r = Math.min(rMax, P * Math.sqrt(d / Math.PI)) * grow * (1 + (hsh2(i, j) - 0.5) * 0.06);
        if (r < 0.15 * P * 0.5) continue;
        const X = map.x + px * sx, Y = map.y + py * sy, R = r * sx;
        g.moveTo(X + R, Y); g.arc(X, Y, R, 0, TAU);
        n++;
      }
    }
    g.fillStyle = o.color || '#1D1B18';
    g.fill();
    g.restore();
    return n;
  }
  // The red plate: rings of sound from the bell, one set per strike, screened at 15 degrees. strikes = [{since}]
  // (seconds since each strike). Field value 0..1 -> dot size, the same way as the black plate.
  function ringScreen(g, map, strikes, o = {}) {
    const P = o.pitch ?? 11, ang = ((o.angle ?? 15) * Math.PI) / 180, ca = Math.cos(ang), sa = Math.sin(ang);
    const sx = map.w / PW, sy = map.h / PH, rMax = P * 0.7, cx = BELL.x, cy = BELL.y + 50;
    const live = strikes.filter((s) => s.since >= 0 && s.since < 1.6);
    if (!live.length) return 0;
    const field = (x, y) => {
      const d = Math.hypot(x - cx, (y - cy) * 1.08);
      let v = 0;
      for (const s of live) {
        const R = 90 + s.since * 760, w = 46 + s.since * 30, a = Math.pow(1 - s.since / 1.6, 1.4);
        v = Math.max(v, a * Math.exp(-Math.pow((d - R) / w, 2)));
        const R2 = R * 0.64;
        v = Math.max(v, 0.55 * a * Math.exp(-Math.pow((d - R2) / (w * 0.7), 2)));
      }
      return v;
    };
    const cl = o.clip || { x: 0, y: 0, w: PW, h: PH };
    const reach = Math.max(...live.map((s) => 90 + s.since * 760 + 160));
    const bx0 = Math.max(cl.x, cx - reach), bx1 = Math.min(cl.x + cl.w, cx + reach), by0 = Math.max(cl.y, cy - reach), by1 = Math.min(cl.y + cl.h, cy + reach);
    if (bx1 <= bx0 || by1 <= by0) return 0;
    const cs = [[bx0, by0], [bx1, by0], [bx0, by1], [bx1, by1]];
    let i0 = 1e9, i1 = -1e9, j0 = 1e9, j1 = -1e9;
    for (const [x, y] of cs) { const i = (x * ca + y * sa) / P, j = (-x * sa + y * ca) / P; i0 = Math.min(i0, i); i1 = Math.max(i1, i); j0 = Math.min(j0, j); j1 = Math.max(j1, j); }
    g.save();
    g.beginPath(); g.rect(map.x + cl.x * sx, map.y + cl.y * sy, cl.w * sx, cl.h * sy); g.clip();
    g.beginPath();
    let n = 0;
    for (let j = Math.floor(j0) - 1; j <= Math.ceil(j1) + 1; j++) {
      for (let i = Math.floor(i0) - 1; i <= Math.ceil(i1) + 1; i++) {
        const px = (i * ca - j * sa) * P, py = (i * sa + j * ca) * P;
        if (px < bx0 - P || px > bx1 + P || py < by0 - P || py > by1 + P) continue;
        const v = field(px, py) * (o.amount ?? 0.62);
        if (v < 0.03) continue;
        const r = Math.min(rMax, P * Math.sqrt(v / Math.PI));
        const X = map.x + px * sx, Y = map.y + py * sy, R = r * sx;
        g.moveTo(X + R, Y); g.arc(X, Y, R, 0, TAU);
        n++;
      }
    }
    g.fillStyle = o.color || '#B9202A';
    g.fill();
    g.restore();
    return n;
  }

  NP.photo = { PW, PH, TOWER, CLOCK, BELL, draw, luma };
  NP.halftone = halftone;
  NP.ringScreen = ringScreen;
})();
