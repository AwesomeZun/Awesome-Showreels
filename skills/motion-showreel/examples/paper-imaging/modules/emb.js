// emb: the light-sheet figure kit (a project module). Nuclei, membranes and the notochord reporter are drawn as
// glowing dots added together ('lighter'), so overlaps glow white like a fluorescence composite; a small 3D
// projection turns the embryo; microscope UI (scale bars, time stamps, channel chips) is white at low opacity in
// DM Mono. Exposes window.EMB. Pure in its arguments.
(() => {
  let D = null;
  const data = () => (D || (D = ASSET('data/embryo.json')));
  const CH = { nuc: '#FF3EC8', mem: '#2EE6FF', noto: '#4BFF6A', white: '#F2F4F8' };
  const LIN = ['#4BFF6A', '#FF3EC8', '#2EE6FF', '#C9CED8'];
  const dots = new Map();
  function dot(color, r) {
    const key = color + r; let s = dots.get(key);
    if (!s) { const R = Math.ceil(r * 3), b = makeBuf(R * 2, R * 2), g = b.g; g.fillStyle = radial(g, R, R, 0, R, [[0, rgba(color, 0.95)], [0.25, rgba(color, 0.55)], [1, rgba(color, 0)]]); g.fillRect(0, 0, R * 2, R * 2); s = { c: b.c, R }; dots.set(key, s); }
    return s;
  }
  function glow(ctx, x, y, color, r, a = 1) { if (a <= 0.01) return; const s = dot(color, r); ctx.globalAlpha = a; ctx.drawImage(s.c, x - s.R, y - s.R); }
  // yaw about y, pitch about x; returns screen x, y and depth
  function proj(p, yaw, pitch, cx, cy, sc) {
    const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const x1 = p[0] * cyw + p[2] * syw, z1 = -p[0] * syw + p[2] * cyw, y2 = p[1] * cp - z1 * sp, z2 = p[1] * sp + z1 * cp;
    const f = 1 / (1 + z2 * 0.18);
    return [cx + x1 * sc * f, cy - y2 * sc * f, z2];
  }
  function txt(ctx, s, x, y, o = {}) {
    ctx.save(); ctx.font = `${o.weight || 400} ${o.size || 24}px ${o.mono ? FAM.mono : FAM.sans}`; if ('letterSpacing' in ctx) ctx.letterSpacing = `${o.ls ?? 0}px`;
    ctx.textAlign = o.align || 'left'; ctx.fillStyle = o.color || C.ink; ctx.globalAlpha *= o.a ?? 1; ctx.fillText(String(s), x, y); ctx.restore();
  }
  function rise(ctx, s, x, y, p, o = {}) { if (p <= 0) return; const e = Ease.ioSine(clamp(p)), size = o.size || 24; ctx.save(); ctx.beginPath(); ctx.rect(0, y - size * 1.1, W, size * 1.45); ctx.clip(); txt(ctx, s, x, y + (1 - e) * size * 0.8, { ...o, a: (o.a ?? 1) * clamp(p * 2.5) }); ctx.restore(); }
  // microscope UI
  function scalebar(ctx, x, y, px, label, a = 1) { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x, y, px, 6); ctx.restore(); txt(ctx, label, x + px / 2, y - 12, { size: 18, mono: true, align: 'center', color: '#FFFFFF', a }); }
  function stamp(ctx, s, x, y, a = 1) { txt(ctx, s, x, y, { size: 26, mono: true, color: '#FFFFFF', a }); }
  function chips(ctx, x, y, a = 1) {
    [['H2B-mCherry', CH.nuc], ['membrane-CFP', CH.mem], ['noto:GFP', CH.noto]].forEach(([n, c], i) => {
      ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = c; ctx.fillRect(x, y + i * 34 - 12, 14, 14); ctx.restore();
      txt(ctx, n, x + 26, y + i * 34, { size: 18, mono: true, color: C.ink2, a });
    });
  }
  function label(ctx, letter, title, a = 1) { txt(ctx, letter, 96, 96, { size: 40, weight: 800, color: '#FFFFFF', a }); txt(ctx, title, 140, 94, { size: 26, weight: 600, color: C.ink, a }); }
  window.EMB = { data, CH, LIN, glow, proj, txt, rise, scalebar, stamp, chips, label };
})();
