// things: the objects of the story, drawn flat (a project module). A wheat plant that grows and ripens (stem, two
// leaves, a bearded head of paired grains), a wheat head alone, a grass leaf blade with parallel veins, a slice of
// toast with a butter pat, a scored loaf, a flour mound, a pile of grain, ball-and-stick molecules (carbon dioxide,
// water, oxygen and a ring of sugar), a brain and a light bulb. Every one is shaded the same way: a base colour, a
// darker side away from the light (upper left) and a soft shine. Exposes window.TH.
(() => {
  const { C } = FV;
  const lerp = FV.lerp, mixc = (a, b, k) => toHex(mix(a, b, clamp(k)));
  // a wheat head along direction ang (radians, -PI/2 = straight up) from its base (x, y); length L, ripeness 0..1
  function head(ctx, x, y, L, ripe, ang = -Math.PI / 2, o = {}) {
    const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux, gw = L * 0.072, gh = L * 0.118;
    const base = mixc('#8CCB4F', C.wheat, ripe), dark = mixc('#5E9E35', C.wheat2, ripe), awn = mixc('#A9D86A', '#E9C870', ripe);
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = dark; ctx.lineWidth = Math.max(1, L * 0.02); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + ux * L * 0.95, y + uy * L * 0.95); ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const s = 0.07 + i * 0.075, px = x + ux * L * s, py = y + uy * L * s, side = i % 2 ? 1 : -1, sc = 1 - i * 0.035;
      const gx = px + nx * side * gw * 0.95 * sc, gy = py + ny * side * gw * 0.95 * sc;
      if (o.awns !== false) { ctx.strokeStyle = rgba(awn, 0.9); ctx.lineWidth = Math.max(1, L * 0.012); ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + (ux * 1.0 + nx * side * 0.35) * L * 0.42, gy + (uy * 1.0 + ny * side * 0.35) * L * 0.42); ctx.stroke(); }
      ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(gx, gy, gw * sc, gh * sc, ang + Math.PI / 2 + side * 0.45, 0, TAU); ctx.fill();
      ctx.fillStyle = base; ctx.beginPath(); ctx.ellipse(gx - nx * gw * 0.18 - ux * gh * 0.1, gy - ny * gw * 0.18 - uy * gh * 0.1, gw * sc * 0.78, gh * sc * 0.82, ang + Math.PI / 2 + side * 0.45, 0, TAU); ctx.fill();
      if (o.glow) FV.glow(ctx, gx, gy, gh * 1.8, C.sun1, 0.22 * o.glow);
    }
    ctx.restore();
  }
  // a whole plant from its base (x, y), height h; o.grow 0..1, o.ripe 0..1, o.sway (radians at the top), o.alpha
  function stalk(ctx, x, y, h, o = {}) {
    const g = o.grow ?? 1, ripe = o.ripe ?? 1, sw = o.sway ?? 0, hh = h * g; if (hh < 2) return;
    const tx = x + Math.sin(sw) * hh, ty = y - Math.cos(sw) * hh, cx = x + Math.sin(sw) * hh * 0.35, cy = y - hh * 0.55;
    const stem = mixc('#6FB540', C.stalk, ripe), leaf = mixc('#5DAE3B', '#D7B04E', ripe * 0.9);
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.lineCap = 'round';
    for (const side of [-1, 1]) {   // two leaves from the lower stem, arching out and drooping
      const lx = x + Math.sin(sw) * hh * 0.25, ly = y - hh * (side < 0 ? 0.22 : 0.36), ex = lx + side * hh * 0.34, ey = ly - hh * 0.1;
      ctx.fillStyle = leaf; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.quadraticCurveTo(lx + side * hh * 0.14, ly - hh * 0.26, ex, ey); ctx.quadraticCurveTo(lx + side * hh * 0.12, ly - hh * 0.12, lx, ly + hh * 0.02); ctx.fill();
    }
    ctx.strokeStyle = stem; ctx.lineWidth = Math.max(1.5, h * 0.018); ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(cx, cy, tx, ty); ctx.stroke();
    if (g > 0.55) head(ctx, tx, ty, h * 0.24 * clamp((g - 0.55) / 0.45), ripe, -Math.PI / 2 + sw * 1.4, { glow: o.glow, awns: o.awns });
    ctx.restore();
  }
  // a grass leaf blade from (x0, y0) to (x1, y1), widest a third of the way along; parallel veins and a midrib
  function blade(ctx, x0, y0, x1, y1, w, o = {}) {
    const L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L, nx = -uy, ny = ux, N = 40, bend = o.bend || 0;
    const at = (s, off) => { const wd = w * Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.15)), 0.55) * (1 - s * 0.35), b = Math.sin(Math.PI * s) * bend; return [x0 + ux * L * s + nx * (off * wd + b), y0 + uy * L * s + ny * (off * wd + b)]; };
    ctx.save(); ctx.beginPath(); for (let i = 0; i <= N; i++) { const p = at(i / N, -1); i ? ctx.lineTo(...p) : ctx.moveTo(...p); } for (let i = N; i >= 0; i--) ctx.lineTo(...at(i / N, 1)); ctx.closePath();
    ctx.fillStyle = linear(ctx, x0 + nx * w, y0 + ny * w, x0 - nx * w, y0 - ny * w, [[0, o.light || C.leafL], [0.45, o.base || C.leaf], [1, o.dark || C.leaf2]]); ctx.fill(); ctx.clip();
    for (let v = -0.8; v <= 0.81; v += 0.2) { ctx.strokeStyle = rgba(Math.abs(v) < 0.05 ? '#E9FFC8' : C.leafL, Math.abs(v) < 0.05 ? 0.7 : 0.35); ctx.lineWidth = Math.abs(v) < 0.05 ? w * 0.06 : w * 0.02; ctx.beginPath(); for (let i = 0; i <= N; i++) { const p = at(i / N, v); i ? ctx.lineTo(...p) : ctx.moveTo(...p); } ctx.stroke(); }
    ctx.restore();
  }
  // a slice of bread (crust, crown, crumb), toasted by k, with an optional butter pat that melts (o.butter 0..1)
  function slice(ctx, x, y, w, o = {}) {
    const h = w * 1.05, k = o.toast ?? 1;
    const path = (s) => { const W2 = w / 2 * s, H2 = h / 2 * s; ctx.beginPath(); ctx.moveTo(-W2 + 14 * s, H2); ctx.lineTo(W2 - 14 * s, H2); ctx.quadraticCurveTo(W2, H2, W2, H2 - 14 * s); ctx.lineTo(W2 * 1.0, -H2 * 0.15); ctx.bezierCurveTo(W2 * 1.42, -H2 * 0.32, W2 * 1.3, -H2 * 1.08, 0, -H2 * 1.02); ctx.bezierCurveTo(-W2 * 1.3, -H2 * 1.08, -W2 * 1.42, -H2 * 0.32, -W2, -H2 * 0.15); ctx.lineTo(-W2, H2 - 14 * s); ctx.quadraticCurveTo(-W2, H2, -W2 + 14 * s, H2); ctx.closePath(); };
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0);
    ctx.save(); ctx.translate(10, 14); path(1); ctx.fillStyle = 'rgba(40,16,8,0.25)'; ctx.fill(); ctx.restore();
    path(1); ctx.fillStyle = mixc(C.crust, C.crust2, k * 0.6); ctx.fill();
    path(0.86); ctx.fillStyle = radial(ctx, -w * 0.08, -h * 0.05, 0, w * 0.75, [[0, mixc(C.crumb, '#E8B06A', k)], [0.7, mixc(C.crumb2, '#C98A45', k)], [1, mixc(C.crumb2, '#A8642E', k)]]); ctx.fill();
    ctx.save(); path(0.86); ctx.clip(); for (let i = 0; i < 26; i++) { ctx.fillStyle = rgba(mixc('#E2BC84', '#B97A3E', k), 0.5); circle(ctx, (FV.rnd(i, 71) - 0.5) * w * 0.8, (FV.rnd(i, 72) - 0.5) * h * 0.8, 2 + 4 * FV.rnd(i, 73)); ctx.fill(); } ctx.restore();
    if (o.butter) {
      const m = o.butter, bw = w * (0.34 + 0.12 * m), bh = w * (0.26 - 0.05 * m);
      ctx.fillStyle = rgba(C.butter, 0.55 * m); ctx.beginPath(); ctx.ellipse(0, w * 0.05, bw * 0.9, bh * 1.2, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = C.butter; rr(ctx, -bw / 2, -bh / 2, bw, bh, bh * 0.35 + m * bh * 0.3); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; rr(ctx, -bw / 2 + 6, -bh / 2 + 5, bw * 0.45, bh * 0.22, 4); ctx.fill();
    }
    ctx.restore();
  }
  // a loaf: a scored dome
  function loaf(ctx, x, y, w, o = {}) {
    const h = w * 0.55; ctx.save(); ctx.translate(x, y); ctx.globalAlpha *= o.a ?? 1;
    ctx.fillStyle = 'rgba(40,16,8,0.25)'; ctx.beginPath(); ctx.ellipse(0, h * 0.5, w * 0.55, h * 0.12, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-w / 2, h * 0.45); ctx.bezierCurveTo(-w * 0.58, -h * 0.4, -w * 0.25, -h * 0.62, 0, -h * 0.6); ctx.bezierCurveTo(w * 0.25, -h * 0.62, w * 0.58, -h * 0.4, w / 2, h * 0.45); ctx.closePath();
    ctx.fillStyle = linear(ctx, 0, -h * 0.6, 0, h * 0.45, [[0, '#D98A45'], [0.6, C.crust], [1, C.crust2]]); ctx.fill();
    ctx.save(); ctx.clip(); ctx.fillStyle = 'rgba(80,30,10,0.35)'; ctx.beginPath(); ctx.ellipse(w * 0.32, h * 0.1, w * 0.4, h * 0.6, 0, 0, TAU); ctx.fill(); ctx.restore();
    ctx.lineCap = 'round'; for (let i = -1; i <= 1; i++) { ctx.strokeStyle = C.crumb; ctx.lineWidth = w * 0.035; ctx.beginPath(); ctx.moveTo(i * w * 0.22 - w * 0.07, -h * 0.28); ctx.lineTo(i * w * 0.22 + w * 0.07, h * 0.02); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.ellipse(-w * 0.22, -h * 0.38, w * 0.12, h * 0.05, -0.4, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function flour(ctx, x, y, w, o = {}) {
    const h = w * 0.42; ctx.save(); ctx.translate(x, y); ctx.globalAlpha *= o.a ?? 1;
    ctx.fillStyle = 'rgba(40,16,8,0.2)'; ctx.beginPath(); ctx.ellipse(0, 4, w * 0.56, h * 0.16, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.bezierCurveTo(-w * 0.3, -h * 0.2, -w * 0.18, -h, 0, -h); ctx.bezierCurveTo(w * 0.18, -h, w * 0.3, -h * 0.2, w / 2, 0); ctx.closePath();
    ctx.fillStyle = '#FBF5EA'; ctx.fill(); ctx.save(); ctx.clip(); ctx.fillStyle = '#E6DCCB'; ctx.beginPath(); ctx.ellipse(w * 0.3, -h * 0.2, w * 0.35, h * 0.9, 0, 0, TAU); ctx.fill(); ctx.restore();
    for (let i = 0; i < 12; i++) { ctx.fillStyle = 'rgba(255,255,255,0.7)'; circle(ctx, (FV.rnd(i, 81) - 0.5) * w * 1.1, -h * (0.2 + FV.rnd(i, 82) * 1.0), 2 + 3 * FV.rnd(i, 83)); ctx.fill(); }
    ctx.restore();
  }
  function grain(ctx, x, y, w, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha *= o.a ?? 1;
    for (let i = 0; i < 46; i++) {
      const r = Math.sqrt(FV.rnd(i, 91)), a = FV.rnd(i, 92) * Math.PI, gx = Math.cos(a) * r * w * 0.5, gy = -Math.sin(a) * r * w * 0.32;
      ctx.save(); ctx.translate(gx, gy); ctx.rotate(FV.rnd(i, 93) * TAU); ctx.fillStyle = C.wheat2; ctx.beginPath(); ctx.ellipse(0, 0, w * 0.06, w * 0.035, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = C.wheat; ctx.beginPath(); ctx.ellipse(-w * 0.008, -w * 0.006, w * 0.045, w * 0.024, 0, 0, TAU); ctx.fill(); ctx.restore();
    }
    ctx.restore();
  }
  // ball-and-stick molecules. kind: co2 | h2o | o2 | sugar; s = atom radius
  const ATOM = { C: ['#4A4A5E', '#2C2C3C'], O: ['#F0533A', '#B8321F'], H: ['#FFFFFF', '#C9CFE6'] };
  function atom(ctx, x, y, r, el) { const [b, d] = ATOM[el]; FV.ball(ctx, x, y, r, b, d, { k: 0.3, shineA: 0.4 }); }
  function mol(ctx, kind, x, y, s, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.globalAlpha *= o.a ?? 1;
    const bond = (pts) => { ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = s * 0.28; ctx.lineCap = 'round'; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p))); ctx.stroke(); };
    if (kind === 'co2') { bond([[-s * 1.7, 0], [s * 1.7, 0]]); atom(ctx, -s * 1.7, 0, s * 0.9, 'O'); atom(ctx, s * 1.7, 0, s * 0.9, 'O'); atom(ctx, 0, 0, s, 'C'); }
    else if (kind === 'h2o') { bond([[-s * 1.3, s * 0.9], [0, 0], [s * 1.3, s * 0.9]]); atom(ctx, -s * 1.3, s * 0.9, s * 0.6, 'H'); atom(ctx, s * 1.3, s * 0.9, s * 0.6, 'H'); atom(ctx, 0, 0, s, 'O'); }
    else if (kind === 'o2') { bond([[-s * 0.8, 0], [s * 0.8, 0]]); atom(ctx, -s * 0.8, 0, s * 0.9, 'O'); atom(ctx, s * 0.8, 0, s * 0.9, 'O'); }
    else if (kind === 'sugar') {
      if (o.glow) FV.glow(ctx, 0, 0, s * 9, C.sun1, 0.45 * o.glow);
      const pts = Array.from({ length: 6 }, (_, i) => [Math.cos(i * Math.PI / 3 - Math.PI / 2) * s * 2.6, Math.sin(i * Math.PI / 3 - Math.PI / 2) * s * 2.6]);
      bond([...pts, pts[0]]); pts.forEach((p, i) => { if (i === 0) return; const out = [p[0] * 1.6, p[1] * 1.6]; bond([p, out]); atom(ctx, ...out, s * 0.55, i % 2 ? 'O' : 'H'); });
      pts.forEach((p, i) => atom(ctx, ...p, s * 0.85, i === 0 ? 'O' : 'C'));
    }
    ctx.restore();
  }
  // a brain seen from the side, and a light bulb (on = 0..1)
  function brain(ctx, x, y, s, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha *= o.a ?? 1; if (o.glow) FV.glow(ctx, 0, 0, s * 2.2, '#FF8FB1', 0.5 * o.glow);
    ctx.fillStyle = '#E0577F'; ctx.beginPath(); ctx.ellipse(s * 0.45, s * 0.5, s * 0.38, s * 0.24, 0.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#FF8FB1'; ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.72, 0, 0, TAU); ctx.fill();
    FV.shade(ctx, 0, 0, s, -2.4, 0.3, '#E0577F', 0.8);
    ctx.strokeStyle = '#C9446D'; ctx.lineWidth = s * 0.06; ctx.lineCap = 'round';
    for (const [a, b, c, d] of [[-0.7, -0.3, -0.2, -0.55], [-0.2, -0.1, 0.35, -0.45], [0.3, 0.05, 0.75, -0.2], [-0.75, 0.25, -0.15, 0.1], [-0.1, 0.35, 0.5, 0.25]]) { ctx.beginPath(); ctx.moveTo(a * s, b * s); ctx.quadraticCurveTo((a + c) / 2 * s, (b + d) / 2 * s - s * 0.25, c * s, d * s); ctx.stroke(); }
    ctx.restore();
  }
  function bulb(ctx, x, y, s, on = 1, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha *= o.a ?? 1; if (on > 0) { FV.rings(ctx, 0, 0, s, C.sun1, [1.3, 1.7, 2.2], 0.12 * on); FV.glow(ctx, 0, 0, s * 3, C.sun1, 0.55 * on); }
    ctx.fillStyle = mixc('#DDE3F5', '#FFF3B0', on); circle(ctx, 0, 0, s); ctx.fill(); ctx.beginPath(); ctx.moveTo(-s * 0.5, s * 0.75); ctx.lineTo(-s * 0.38, s * 1.25); ctx.lineTo(s * 0.38, s * 1.25); ctx.lineTo(s * 0.5, s * 0.75); ctx.fill();
    ctx.strokeStyle = mixc('#9AA3BF', C.sun2, on); ctx.lineWidth = s * 0.06; ctx.beginPath(); ctx.moveTo(-s * 0.2, s * 0.9); ctx.lineTo(-s * 0.2, s * 0.15); ctx.lineTo(0, -s * 0.15); ctx.lineTo(s * 0.2, s * 0.15); ctx.lineTo(s * 0.2, s * 0.9); ctx.stroke();
    ctx.fillStyle = '#8A93AD'; for (let i = 0; i < 3; i++) rr(ctx, -s * 0.4, s * (1.27 + i * 0.16), s * 0.8, s * 0.12, s * 0.06), ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(-s * 0.4, -s * 0.35, s * 0.16, s * 0.3, 0.5, 0, TAU); ctx.fill();
    ctx.restore();
  }
  window.TH = { head, stalk, blade, slice, loaf, flour, grain, mol, atom, brain, bulb };
})();
