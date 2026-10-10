// layers (4 bars, the 60 only): a stack of layers. The plane tilts back into space and becomes the floor of a stack;
// the sentence's arrows rise through three more planes, each bending its grid (a small network) and moving every arrow
// a little (attention), the arrow of the turning toward where the places are as it climbs. Dotted lines trace each
// word up the stack; dots above it say a large model has dozens of layers.
(() => {
  const SW = ['the', 'cat', 'sat', 'on'], NL = 4, DZ = 1.8, HALF = 3.4, BL = [2.6, 4.8, 7.0];
  const pol = (p) => [Math.hypot(p[0], p[1]), Math.atan2(p[1], p[0])];
  // the arrows at layer l: the turns from its own arrow to h; the others turn a little
  function at(w, l) {
    const [r0, a0] = pol(VM.xy(w)), end = { the: pol(VM.toy().h), cat: [r0 * 1.06, a0 + 0.16], sat: [r0 * 0.94, a0 - 0.2], on: [r0 * 1.15, a0 + 0.45] }[w];
    let da = end[1] - a0; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
    const k = Ease.ioSine(clamp(l / (NL - 1))), r = r0 + (end[0] - r0) * k, a = a0 + da * k; return [r * Math.cos(a), r * Math.sin(a)];
  }
  const warp = (l, u, v, amp) => (l === 0 || amp <= 0 ? [u, v] : [u + amp * 0.34 * Math.sin(0.62 * v + l * 1.7), v + amp * 0.34 * Math.sin(0.55 * u - l * 2.3)]);
  function P3(c, u, v, z) { const cy = Math.cos(c.yaw), sy = Math.sin(c.yaw), u2 = u * cy - v * sy, v2 = u * sy + v * cy; return [c.cx + c.s * u2, c.cy - c.s * (v2 * Math.cos(c.pitch) + (z - c.zc) * Math.sin(c.pitch))]; }
  function plate(ctx, c, l, z, a, amp, gridA, fillA = 1) {
    if (a <= 0) return;
    const cs = [[-HALF, -HALF], [HALF, -HALF], [HALF, HALF], [-HALF, HALF]].map(([u, v]) => P3(c, u, v, z));
    ctx.save(); ctx.globalAlpha *= a;
    ctx.beginPath(); cs.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
    ctx.fillStyle = rgba('#13223D', 0.66 * fillA); ctx.fill(); ctx.save(); ctx.clip();
    const line = (f, style, lw) => { ctx.strokeStyle = style; ctx.lineWidth = lw; ctx.beginPath(); for (let s = 0; s <= 28; s++) { const [u, v] = f(-HALF + (2 * HALF * s) / 28), p = P3(c, ...warp(l, u, v, amp), z); s ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } ctx.stroke(); };
    for (let i = -4; i <= 4; i++) { const st = i ? rgba(VM.GRID, 0.32 * gridA) : rgba(VM.INK, 0.7 * gridA), lw = i ? 1.4 : 2.2; line(s => [i, s], st, lw); line(s => [s, i], st, lw); }
    ctx.restore();
    ctx.strokeStyle = rgba(VM.GRID, 0.75 * fillA); ctx.lineWidth = 2; ctx.beginPath(); cs.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.stroke();
    ctx.restore();
  }
  SCENES['layers'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4;
      const tilt = Ease.ioC(clamp((b - 0.5) / 2.1)), rise = Ease.ioC(clamp((b - 2.4) / 6.8)), push = Ease.ioSine(clamp((b - 9.5) / 6.5));
      const c = { cx: VM.lerp(600, 980, tilt), cy: VM.lerp(610, 575, tilt), s: VM.lerp(150 * (VM.prev(env) === 'arith' ? VM.pushOf('arith') : 1), 76, tilt) + push * 5, pitch: 1.0 * tilt, yaw: -1.1 * tilt - 0.12 * push, zc: 2.7 * rise };
      VM.bg(ctx);
      // the full plane hands over to the floor of the stack as it tilts
      const flat = 1 - clamp(tilt / 0.25);
      if (flat > 0) {
        const cam = { ox: c.cx, oy: c.cy, u: c.s }; VM.plane(ctx, cam, { a: flat });
        Object.keys(VM.toy().vocab).filter(w => !SW.includes(w)).forEach(w => { const a = flat * (1 - clamp(b / 0.8)) * 0.9; VM.vec(ctx, cam, VM.xy(w), VM.colOf(w), { w: 3.5, tip: 18, a }); VM.tipLabel(ctx, cam, VM.xy(w), w, VM.colOf(w), { size: 27, a }); });
      }
      const shown = (l) => (l === 0 ? 1 : clamp((b - BL[l - 1]) / 0.5));
      // the stack, bottom to top
      for (let l = 0; l < NL; l++) {
        const a = shown(l), z = l * DZ; if (a <= 0) continue;
        const amp = l ? Ease.ioC(clamp((b - BL[l - 1] - 0.35) / 1.1)) : 0;
        plate(ctx, c, l, z, a, amp, l ? 1 : clamp(tilt * 4), l ? 1 : clamp(tilt * 4));
        // the arrows that have arrived on this layer (dimmer once the next is in use)
        const here = l === 0 ? 1 : clamp((b - BL[l - 1] - 1.0) / 0.2), dim = l < NL - 1 && shown(l + 1) > 0 ? 0.45 : 1;
        if (here > 0) SW.forEach(w => {
          const p = at(w, l), O = P3(c, 0, 0, z), T = P3(c, ...p, z), top = dim === 1, hl = w === 'the' && l === NL - 1 ? clamp((b - 9.8) / 0.8) : 0;
          VM.arrowS(ctx, O[0], O[1], T[0], T[1], hl > 0 ? toHex(mix(VM.colOf(w), VM.YELLOW, hl)) : VM.colOf(w), { w: tilt > 0.5 ? 4 : 5.5, tip: tilt > 0.5 ? 17 : 24, a: dim * here, glow: hl * 16 });
          if (top) { const d = Math.hypot(T[0] - O[0], T[1] - O[1]) || 1, ux = (T[0] - O[0]) / d, uy = (T[1] - O[1]) / d; VM.label(ctx, w, T[0] + ux * 34, T[1] + uy * 26 + 10, hl > 0 ? toHex(mix(VM.colOf(w), VM.YELLOW, hl)) : VM.colOf(w), { size: VM.lerp(31, 26, tilt), a: here, glow: hl * 14 }); }
        });
        // the layer's name, left of its leftmost corner
        if (tilt > 0.6) {
          const cs = [[-HALF, -HALF], [HALF, -HALF], [HALF, HALF], [-HALF, HALF]].map(([u, v]) => P3(c, u, v, z)), lc = cs.reduce((m, p) => (p[0] < m[0] ? p : m));
          VM.write(ctx, l ? `layer ${l}` : 'the words’ own arrows', lc[0] - 22, lc[1] + 10, clamp(((l ? b - BL[l - 1] : b - 2.2) - 0.1) / 0.7), { size: 28, align: 'right', color: l ? VM.INK : VM.DIM, it: !l });
        }
      }
      // arrows rising from one layer to the next, turning on the way
      for (let l = 1; l < NL; l++) {
        const k = clamp((b - BL[l - 1]) / 1.0); if (k <= 0 || k >= 1) continue;
        const e = Ease.ioC(k), z = (l - 1 + e) * DZ;
        SW.forEach(w => { const p = VM.lerp2(at(w, l - 1), at(w, l), e), O = P3(c, 0, 0, z), T = P3(c, ...p, z); VM.arrowS(ctx, O[0], O[1], T[0], T[1], VM.colOf(w), { w: 4, tip: 17, glow: 10 }); });
      }
      // each word's path up the stack, and the spine through the origins
      if (tilt > 0.5) {
        const top = Math.min(NL - 1, BL.filter(x => b > x + 1.0).length);
        ctx.save(); ctx.setLineDash([3, 7]); ctx.lineWidth = 2;
        ctx.strokeStyle = rgba(VM.INK, 0.4); const o0 = P3(c, 0, 0, 0), o1 = P3(c, 0, 0, top * DZ + (top === NL - 1 ? 0.9 : 0)); ctx.beginPath(); ctx.moveTo(o0[0], o0[1]); ctx.lineTo(o1[0], o1[1]); ctx.stroke();
        SW.forEach(w => { ctx.strokeStyle = rgba(VM.colOf(w), 0.5); ctx.beginPath(); for (let l = 0; l <= top; l++) { const p = P3(c, ...at(w, l), l * DZ); l ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } ctx.stroke(); });
        ctx.restore();
      }
      // many more in a large model
      const mk = clamp((b - 9.2) / 0.8);
      if (mk > 0) {
        // three dots rising from the top layer's right corner, the note beside them
        const zt = (NL - 1) * DZ, rc = [[-HALF, -HALF], [HALF, -HALF], [HALF, HALF], [-HALF, HALF]].map(([u, v]) => P3(c, u, v, zt)).reduce((m, q) => (q[0] > m[0] ? q : m));
        for (let i = 0; i < 3; i++) { ctx.fillStyle = rgba(VM.INK, mk * (1 - i * 0.22)); circle(ctx, rc[0] + 10, rc[1] - 40 - i * 26, 5); ctx.fill(); }
        const p = [rc[0], rc[1] - 66], x = Math.min(rc[0] + 40, 1440), wk = clamp((b - 9.4) / 1.4);
        VM.write(ctx, 'a large model has', x, p[1] - 30, wk, { size: 28, color: VM.DIM, it: true });
        VM.write(ctx, 'dozens of layers,', x, p[1] + 8, clamp(wk * 1.2 - 0.1), { size: 30 });
        VM.write(ctx, 'thousands of numbers per arrow', x, p[1] + 46, clamp(wk * 1.2 - 0.2), { size: 30 });
      }
      VM.caption(ctx, [['Inside the model the arrows climb a ', VM.INK], ['stack of layers', VM.YELLOW], ['.', VM.INK]], clamp((b - 2.8) / 1.0), { a: 1 - clamp((b - 10.6) / 0.5) });
      VM.caption(ctx, [['Each layer moves every arrow a little: ', VM.INK], ['attention', VM.TEAL], [', then a small network that bends the space.', VM.INK]], clamp((b - 11.2) / 1.6));
    },
  };
})();
