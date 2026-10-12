// motionkit: the Motion Kit reel's shared kit (a project module). It plays the app's own animations back from frames
// captured in its demo iframe (paused and stepped every 50 ms through document.getAnimations()), and it ports the
// app's confetti recipe (buttons.ts: count, spread around straight up, distance, spin, the three keyframes and the
// curve cubic-bezier(0.2, 0.7, 0.3, 1)) with a seeded hash instead of Math.random, so a tap in the reel bursts the way
// a tap in the app does. Also: a cursor, labels, headlines.
(() => {
  const meta = {};
  function layer(name) {
    const has = (n) => ('captures/ui/app/' + n + '.json') in ASSETS;
    if (!meta[name]) meta[name] = has(name) ? ASSET('captures/ui/app/' + name + '.json') : null;
    const j = meta[name], L = j && j.layers ? j.layers[0] : j;
    return { img: IMG['captures/ui/app/' + name], L };
  }
  function draw(ctx, name, x, y, k = 1, o = {}) {
    const { img, L } = layer(name); if (!img) return;
    const d = L ? img.width / L.rect.w : 2;
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
    if (o.crop) { const [cx, cy, cw, ch] = o.crop; ctx.drawImage(img, cx * d, cy * d, cw * d, ch * d, x, y, cw * k, ch * k); }
    else ctx.drawImage(img, x, y, img.width / d * k, img.height / d * k);
    ctx.restore();
  }
  // the app's holographic ribbon knot (src/lib/knot.ts, ported line for line): a trefoil curve swept into a thin ribbon
// that twists twice per lap, cut into 420 quads painted far to near, each one coloured by where its face points (lit
// holo palette, chrome sky and ground, a specular white, deep blue on the edge-on and far parts). Centre (cx, cy), S
// screen px per knot unit (the app uses min(w, h) / 8.4).
  const KN = (() => {
    const N = 420, TAU = Math.PI * 2, TW = 2, HW = 0.56;
    const PAL = [[146, 176, 255], [255, 162, 242], [150, 250, 228], [255, 232, 150], [190, 164, 255]];
    const WH = [255, 255, 255], SH = [24, 58, 225], DEEP = [8, 26, 170], GN = [24, 50, 200], GF = [110, 130, 255], SKY = [196, 206, 255];
    const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    const smooth = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
    const rgb = (c) => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
    const pal = (x) => { const n = PAL.length, f = ((x % n) + n) % n, i = Math.floor(f), t = f - i; return mix(PAL[i], PAL[(i + 1) % n], t * t * (3 - 2 * t)); };
    const curve = (t) => [Math.sin(t) + 2 * Math.sin(2 * t), Math.cos(t) - 2 * Math.cos(2 * t), -Math.sin(3 * t) * 1.35];
    const MODEL = Array.from({ length: N }, (_, i) => { const t = i / N * TAU, a = curve(t - 0.001), b = curve(t + 0.001);
      const T = norm([b[0] - a[0], b[1] - a[1], b[2] - a[2]]), Nn = norm([T[1], -T[0], 0]); return { P: curve(t), N: Nn, B: cross(T, Nn) }; });
    const L = norm([-0.5, -0.65, 0.75]), HF = norm([L[0], L[1], L[2] + 1]);
    return function knot(ctx, cx, cy, S, pose = {}) {
      const { yaw = Math.PI, pitch = 0.22, roll = 0, twist = 1.2, flow = 0, alpha = 1 } = pose;
      const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
      const rot = (v) => { const x1 = v[0] * cyw + v[2] * syw, z1 = -v[0] * syw + v[2] * cyw, y1 = v[1] * cp - z1 * sp, z2 = v[1] * sp + z1 * cp; return [x1 * cr - y1 * sr, x1 * sr + y1 * cr, z2]; };
      const proj = (v) => { const s = 9 / (9 - v[2]); return [cx + v[0] * S * s, cy + v[1] * S * s, v[2]]; };
      const A = [], B = [], F = [];
      for (let i = 0; i < N; i++) {
        const { P, N: Nn, B: Bn } = MODEL[i], th = TW * i * TAU / N + twist, c = Math.cos(th), s = Math.sin(th);
        const Wv = [(Nn[0] * c + Bn[0] * s) * HW, (Nn[1] * c + Bn[1] * s) * HW, (Nn[2] * c + Bn[2] * s) * HW];
        A.push(proj(rot([P[0] + Wv[0], P[1] + Wv[1], P[2] + Wv[2]]))); B.push(proj(rot([P[0] - Wv[0], P[1] - Wv[1], P[2] - Wv[2]])));
        F.push(rot([Bn[0] * c - Nn[0] * s, Bn[1] * c - Nn[1] * s, Bn[2] * c - Nn[2] * s]));
      }
      const order = Array.from({ length: N }, (_, i) => { const j = (i + 1) % N; return { i, j, z: (A[i][2] + A[j][2] + B[i][2] + B[j][2]) / 4 }; }).sort((a, b) => a.z - b.z);
      ctx.save(); ctx.globalAlpha *= alpha; ctx.lineJoin = 'round'; const ew = Math.max(1, S / 74);
      for (const { i, j, z } of order) {
        let n = norm([F[i][0] + F[j][0], F[i][1] + F[j][1], F[i][2] + F[j][2]]); const back = n[2] < 0; if (back) n = [-n[0], -n[1], -n[2]];
        const facing = n[2], diffuse = Math.max(0, dot(n, L)), spec = Math.pow(Math.max(0, dot(n, HF)), 24);
        const holo = pal(i / N * 3 + (1 - facing) * 1.4 + flow + (back ? 0.5 : 0)), lit = mix(SH, holo, 0.3 + 0.7 * diffuse);
        const hz = 2 * facing * n[1] + 0.25 * 2 * facing * n[0], skyT = smooth(0, -0.9, hz);
        const sky = mix(mix(WH, SKY, skyT), holo, 0.58 + 0.2 * skyT), gr = mix(mix(GN, GF, smooth(0, 0.9, hz)), holo, 0.15);
        let col = mix(lit, mix(sky, gr, smooth(-0.12, 0.12, hz)), 0.55);
        col = mix(col, WH, Math.min(1, spec * 1.2)); col = mix(DEEP, col, smooth(0, 0.4, facing)); col = mix(DEEP, col, 0.78 + 0.22 * Math.max(0, Math.min(1, (z + 1.8) / 3.6)));
        const a = A[i], b = A[j], c = B[j], d = B[i], fill = rgb(col);
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath();
        ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = fill; ctx.lineWidth = 1; ctx.stroke();
        ctx.strokeStyle = rgb(mix(col, WH, 0.55)); ctx.lineWidth = ew; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.moveTo(d[0], d[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
      }
      ctx.restore();
    };
  })();
  // the app's hero stage: electric blue, a lilac-white light from the top right, a fine drifting grid
  function blueStage(ctx, t, o = {}) {
    ctx.fillStyle = '#0B2FE6'; ctx.fillRect(0, 0, W, H);
    const lx = o.lightX ?? 1500, r = ctx.createRadialGradient(lx, 80, 0, lx, 80, 1100); r.addColorStop(0, 'rgba(201,184,255,0.42)'); r.addColorStop(1, 'rgba(201,184,255,0)');
    ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
    const d = ctx.createRadialGradient(300, 1100, 0, 300, 1100, 900); d.addColorStop(0, 'rgba(6,25,166,0.7)'); d.addColorStop(1, 'rgba(6,25,166,0)'); ctx.fillStyle = d; ctx.fillRect(0, 0, W, H);
    const off = (t * 14) % 96; ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = -96 + off; x < W; x += 96) { ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, H); }
    for (let y = -96 + off * 0.5; y < H; y += 96) { ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(W, Math.round(y) + 0.5); }
    ctx.stroke(); ctx.restore();
  }
  // the app's paper stage: paper, a lilac light (the curve editor's background) and a fine dot grid
  function paperStage(ctx, t, o = {}) {
    ctx.fillStyle = '#EEF0F7'; ctx.fillRect(0, 0, W, H);
    const lx = o.lightX ?? 1800, r = ctx.createRadialGradient(lx, 0, 0, lx, 0, 1300); r.addColorStop(0, 'rgba(201,184,255,0.45)'); r.addColorStop(1, 'rgba(201,184,255,0)');
    ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.fillStyle = 'rgba(10,13,31,0.09)'; const off = (t * 10) % 48;
    for (let y = 24 - off; y < H; y += 48) for (let x = 24 - off; x < W; x += 48) ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
    ctx.restore();
  }
  // a captured flipbook: prefix_0..n-1, one frame per 50 ms of the app's own timeline
  function flip(ctx, prefix, n, ms, x, y, k, o = {}) {
    const i = ms < 0 ? -1 : Math.min(n - 1, Math.floor(ms / 50));
    draw(ctx, i < 0 ? prefix + '_still' : prefix + '_' + i, x, y, k, o);
  }
  // cubic-bezier(x1, y1, x2, y2) as an easing function
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const X = (t) => ((ax * t + bx) * t + cx) * t, Y = (t) => ((ay * t + by) * t + cy) * t, dX = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return (x) => { let t = x; for (let i = 0; i < 8; i++) { const d = X(t) - x, s = dX(t); if (Math.abs(d) < 1e-5 || Math.abs(s) < 1e-6) break; t -= d / s; } return Y(clamp(t)); };
  }
  const EASE = bezier(0.2, 0.7, 0.3, 1);
  const RECIPE = { count: 36, spread: 150, distance: 150, duration: 1200, colors: ['#0B2FE6', '#C9B8FF', '#FF6A2B', '#FFFFFF', '#7FE7FF'] };
  // the burst at (x, y), ms after the tap, scale k (px per CSS px of the app's stage), seed picks the "random" numbers
  function confetti(ctx, x, y, ms, k = 1, seed = 1, o = {}) {
    if (ms < 0) return;
    const R = { ...RECIPE, ...o };
    for (let i = 0; i < R.count; i++) {
      const h = (n) => hash(seed * 101.3 + i * 7.77 + n);
      const ang = (-90 + (h(1) - 0.5) * R.spread) * Math.PI / 180, dist = R.distance * (0.45 + h(2) * 0.75);
      const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist, spin = (h(3) - 0.5) * 900, dur = R.duration * (0.75 + h(4) * 0.5);
      const p = EASE(clamp(ms / dur)); if (ms > dur) continue;
      let tx, ty, rot, sc, op;
      if (p < 0.45) { const q = p / 0.45; tx = dx * q; ty = dy * q; rot = spin * 0.6 * q; sc = 1; op = 1; }
      else { const q = (p - 0.45) / 0.55; tx = lerp(dx, dx * 1.15, q); ty = lerp(dy, dy + dist * 0.9, q); rot = lerp(spin * 0.6, spin, q); sc = lerp(1, 0.6, q); op = 1 - q; }
      ctx.save(); ctx.globalAlpha *= op; ctx.translate(x + tx * k, y + ty * k); ctx.rotate(rot * Math.PI / 180); ctx.scale(sc, sc);
      ctx.fillStyle = R.colors[i % R.colors.length]; ctx.fillRect(-4 * k, -6 * k, 8 * k, 12 * k); ctx.restore();
    }
  }
  function cursor(ctx, x, y, s = 1, press = 0) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s * (1 - 0.14 * press), s * (1 - 0.14 * press));
    ctx.shadowColor = 'rgba(10,13,31,0.3)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 34); ctx.lineTo(9, 26); ctx.lineTo(15, 40); ctx.lineTo(21, 37); ctx.lineTo(15, 24); ctx.lineTo(26, 24); ctx.closePath();
    ctx.fillStyle = '#0A0D1F'; ctx.fill(); ctx.shadowColor = 'transparent'; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  }
  function label(ctx, s, x, y, o = {}) {
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.font = `${o.weight || 600} ${o.size || 22}px ${FAM.mono}`; ctx.fillStyle = o.color || '#555B7C';
    const ls = (o.size || 22) * 0.16; let w = 0; for (const ch of s) w += ctx.measureText(ch).width + ls; w -= ls;
    let cx = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x; for (const ch of s) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + ls; }
    ctx.restore(); return w;
  }
  // headline lines that pop in per glyph (the app's bouncy curve), the last glyph of the last line orange if it is "."
  function headline(ctx, lines, x, y, lt, o = {}) {
    const size = o.size || 100, gap = o.gap ?? size * 1.14, colors = o.colors || ['#0A0D1F', '#0B2FE6'];
    lines.forEach((s, i) => { const n = [...s].length; kinetic(ctx, s, x, y + i * gap, lt - (o.step ?? 0.25) * i, { size, fam: 'display', weight: 900, ls: -0.045 * size,
      colorFn: (k, ch) => (o.dot && i === lines.length - 1 && k === n - 1 && ch === '.') ? '#FF6A2B' : colors[i], pop: true,
      stagger: 0.03, dur: 0.5, rise: 0.4 * size, blur: 4, align: o.align, out: o.out, alpha: o.alpha }); });
  }
  // the confetti control panel with its first slider (조각 수, 8..80) at value v: the filled track comes from the 72
  // capture left of the thumb and the empty track from the 36 capture right of it; the thumb is the 36 capture's own
  // thumb, stamped where the value puts it, and the value is redrawn in the app's style (600 13px mono, blue-deep).
  const CROP_CTL = [0, 0, 404, 262];
  function controls(ctx, x, y, k, v, o = {}) {
    const c = CROP_CTL, at = (n, cr, a = 1) => draw(ctx, n, x + cr[0] * k, y + cr[1] * k, k, { crop: cr, alpha: a });
    if (v >= 72) { at('controls_72', c); return; }
    at('controls_36', c); if (v <= 36) return;
    const X = 166.25 + (v - 36) * (158 / 36);
    at('controls_72', [0, 126, X, 30]);
    ctx.save(); ctx.translate((X - 166.25) * k, 0); draw(ctx, 'controls_36', x + 155 * k, y + 129 * k, k, { crop: [155, 129, 22.5, 22.5] }); ctx.restore();
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x + 336 * k, y + 97 * k, 40 * k, 16 * k);
    ctx.save(); ctx.font = `600 ${13 * k}px ${FAM.mono}`; ctx.fillStyle = '#0619A6'; ctx.textAlign = 'right'; ctx.fillText(String(Math.round(v)), x + 370 * k, y + 110 * k); ctx.restore();
  }
  // the thumb's centre for value v, in panel CSS px
  const thumbX = (v) => 166.25 + (v - 36) * (158 / 36), THUMB_Y = 140.25;
  // the app's cubic-bezier editor (EasingPage.tsx, its SVG drawn on canvas): viewBox 320 x 430, x 0..1 over 34..286,
  // value 0 at y 318 and 1 at 148; frame, grid, axis labels, dashed arms, the blue curve (drawn on to p), the two knobs
  // and the orange dot riding the curve at time u. (x, y) is the top left, k screen px per SVG unit.
  const PX = 34, PW = 252, Y0 = 318, UNIT = 170;
  function editor(ctx, x, y, k, b, o = {}) {
    const tx = (v) => x + (PX + v * PW) * k, ty = (v) => y + (Y0 - v * UNIT) * k, p = o.draw ?? 1;
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
    rr(ctx, x, y, 320 * k, 430 * k, 18 * k); ctx.fillStyle = '#F6F7FB'; ctx.fill();
    ctx.save(); ctx.clip(); const g = ctx.createRadialGradient(x + 320 * k, y, 0, x + 320 * k, y, 380 * k); g.addColorStop(0, 'rgba(201,184,255,0.35)'); g.addColorStop(1, 'rgba(201,184,255,0)'); ctx.fillStyle = g; ctx.fillRect(x, y, 320 * k, 430 * k); ctx.restore();
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(tx(0), ty(1), PW * k, UNIT * k); ctx.strokeStyle = 'rgba(10,13,31,0.18)'; ctx.lineWidth = 1; ctx.strokeRect(tx(0), ty(1), PW * k, UNIT * k);
    ctx.strokeStyle = 'rgba(10,13,31,0.07)'; ctx.beginPath();
    for (const v of [0, 0.25, 0.5, 0.75, 1]) { ctx.moveTo(tx(v), ty(-0.6)); ctx.lineTo(tx(v), ty(1.85)); ctx.moveTo(tx(0), ty(v)); ctx.lineTo(tx(1), ty(v)); }
    ctx.stroke();
    ctx.font = `600 ${11 * k}px ${FAM.mono}`; ctx.fillStyle = '#555B7C'; ctx.textAlign = 'right';
    ctx.fillText('0', tx(0) - 8 * k, ty(0) + 4 * k); ctx.fillText('1', tx(0) - 8 * k, ty(1) + 4 * k); ctx.font = `600 ${11 * k}px ${FAM.sans}`; ctx.fillText('시간 →', tx(1), ty(0) + 22 * k);
    ctx.setLineDash([3 * k, 4 * k]); ctx.strokeStyle = '#555B7C'; ctx.lineWidth = 1.5 * k; ctx.beginPath();
    ctx.moveTo(tx(0), ty(0)); ctx.lineTo(tx(b[0]), ty(b[1])); ctx.moveTo(tx(1), ty(1)); ctx.lineTo(tx(b[2]), ty(b[3])); ctx.stroke(); ctx.setLineDash([]);
    // the curve, drawn on from its start
    const pt = (s) => { const m = 1 - s; return [3 * m * m * s * b[0] + 3 * m * s * s * b[2] + s * s * s, 3 * m * m * s * b[1] + 3 * m * s * s * b[3] + s * s * s]; };
    if (p > 0) { ctx.strokeStyle = '#0B2FE6'; ctx.lineWidth = 4 * k; ctx.lineCap = 'round'; ctx.beginPath();
      for (let i = 0; i <= 80 * p; i++) { const [u, v] = pt(i / 80); i ? ctx.lineTo(tx(u), ty(v)) : ctx.moveTo(tx(u), ty(v)); } ctx.stroke(); }
    [[b[0], b[1], '#0B2FE6'], [b[2], b[3], '#0A0D1F']].forEach(([u, v, c], i) => { const r = (9 + 3 * (o.hot === i ? 1 : 0)) * k;
      circle(ctx, tx(u), ty(v), r); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.strokeStyle = c; ctx.lineWidth = 3 * k; ctx.stroke(); });
    if (o.u != null) { const f = bezier(...b), u = clamp(o.u); circle(ctx, tx(u), ty(f(u)), 6 * k); ctx.fillStyle = '#FF6A2B'; ctx.fill(); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2 * k; ctx.stroke(); }
    ctx.restore();
    return { tx, ty };
  }
  // a ball with the app's radial shading (blue, orange or ink)
  const BALLS = { blue: ['#8fa6ff', '#0B2FE6', '#0619A6'], orange: ['#ffc2a6', '#FF6A2B', '#c94410'], ink: ['#4a4f6e', '#0A0D1F', '#0A0D1F'] };
  function ball(ctx, x, y, r, kind = 'blue', a = 1) {
    const [c0, c1, c2] = BALLS[kind], g = ctx.createRadialGradient(x - r * 0.36, y - r * 0.44, 0, x, y, r * 1.05);
    g.addColorStop(0, c0); g.addColorStop(0.6, c1); g.addColorStop(1, c2); ctx.save(); ctx.globalAlpha *= a; circle(ctx, x, y, r); ctx.fillStyle = g; ctx.fill(); ctx.restore();
  }
  window.MK = { layer, draw, flip, bezier, confetti, cursor, label, headline, RECIPE, knot: KN, blueStage, paperStage, controls, thumbX, THUMB_Y, editor, ball };
})();
