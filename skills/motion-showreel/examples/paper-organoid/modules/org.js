// org: the lab-notebook figure kit (a project module). Warm paper with a faint grid, brightfield images with their
// phase halos, Literata for sentences and notes, Spline Sans Mono for days, doses and wells. ORG.organoid() draws a
// budding organoid as brightfield: a dark cell wall with a bright halo outside, a lighter lumen with debris, crypt
// buds pushing out of the wall. Exposes window.ORG. Pure in its arguments.
(() => {
  let D = null;
  const data = () => (D || (D = ASSET('data/organoid.json')));
  let pageBuf = null;
  function page(ctx) {
    if (!pageBuf) {
      const b = makeBuf(W, H), g = b.g; g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
      g.strokeStyle = rgba('#7FA3D1', 0.16); g.lineWidth = 1;
      for (let x = 0; x < W; x += 32) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); g.stroke(); }
      for (let y = 0; y < H; y += 32) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); g.stroke(); }
      g.strokeStyle = rgba('#D06A6A', 0.35); g.beginPath(); g.moveTo(150.5, 0); g.lineTo(150.5, H); g.stroke();        // the margin rule
      for (let i = 0; i < 2500; i++) { g.fillStyle = rgba('#8A7350', 0.04 + hash(i) * 0.05); g.fillRect(hash(i * 3.1) * W, hash(i * 7.3) * H, 1.5, 1.5); }
      pageBuf = b.c;
    }
    ctx.drawImage(pageBuf, 0, 0);
  }
  function txt(ctx, s, x, y, o = {}) {
    ctx.save(); ctx.font = `${o.italic ? 'italic ' : ''}${o.weight || 400} ${o.size || 24}px ${o.mono ? FAM.mono : FAM.serif}`; if ('letterSpacing' in ctx) ctx.letterSpacing = `${o.ls ?? 0}px`;
    ctx.textAlign = o.align || 'left'; ctx.fillStyle = o.color || C.ink; ctx.globalAlpha *= o.a ?? 1;
    const str = o.n !== undefined ? String(s).slice(0, Math.max(0, Math.floor(o.n))) : String(s); ctx.fillText(str, x, y); ctx.restore();
  }
  function rise(ctx, s, x, y, p, o = {}) { if (p <= 0) return; const e = Ease.ioSine(clamp(p)), size = o.size || 24; ctx.save(); ctx.beginPath(); ctx.rect(0, y - size * 1.1, W, size * 1.45); ctx.clip(); txt(ctx, s, x, y + (1 - e) * size * 0.8, { ...o, a: (o.a ?? 1) * clamp(p * 2.5) }); ctx.restore(); }
  // a note written into the margin area: types on like handwriting, a pencil tick beside it
  function note(ctx, s, x, y, p, o = {}) { if (p <= 0) return; txt(ctx, s, x, y, { size: o.size || 22, italic: true, color: o.color || '#4E5A6E', n: p * s.length }); }
  // brightfield field of view with grain
  function field(ctx, x, y, w, h, fn) {
    ctx.save(); rr(ctx, x, y, w, h, 10); ctx.clip();
    ctx.fillStyle = radial(ctx, x + w / 2, y + h / 2, 0, Math.max(w, h) * 0.7, [[0, '#E2DDD3'], [1, '#C9C3B7']]); ctx.fillRect(x, y, w, h);
    for (let i = 0; i < 900; i++) { ctx.fillStyle = rgba(hash(i) > 0.5 ? '#FFFFFF' : '#6E665C', 0.08); ctx.fillRect(x + hash(i * 2.3) * w, y + hash(i * 5.9) * h, 2, 2); }
    fn(); ctx.restore();
    ctx.strokeStyle = rgba(C.ink, 0.35); ctx.lineWidth = 1.5; rr(ctx, x, y, w, h, 10); ctx.stroke();
  }
  // wall path: a circle with bumps where buds push out; buds: [[angle, size 0..1], ...]
  function wallPts(cx, cy, r, buds, wob = 0) {
    const pts = [];
    for (let i = 0; i <= 160; i++) {
      const a = (i / 160) * TAU; let rr_ = r * (1 + 0.025 * Math.sin(a * 7 + wob));
      for (const [ba, bs] of buds) { const d = Math.atan2(Math.sin(a - ba), Math.cos(a - ba)); rr_ += r * 0.42 * bs * Math.exp(-(d * d) / 0.035); }
      pts.push([cx + Math.cos(a) * rr_, cy + Math.sin(a) * rr_]);
    }
    return pts;
  }
  function organoid(ctx, cx, cy, r, buds, o = {}) {
    const pts = wallPts(cx, cy, r, buds, o.wob || 0), path = () => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); };
    ctx.save(); ctx.filter = `blur(${Math.max(3, r * 0.06)}px)`; path(); ctx.strokeStyle = rgba('#FFFFFF', 0.85); ctx.lineWidth = Math.max(6, r * 0.18); ctx.stroke(); ctx.restore();   // phase halo
    path(); ctx.fillStyle = '#B9B2A5'; ctx.fill();                                                                                                                   // the cell layer
    ctx.save(); path(); ctx.clip();
    const lr = r * 0.62; ctx.beginPath(); ctx.ellipse(cx, cy, lr, lr * 0.95, 0, 0, TAU); ctx.fillStyle = '#D8D2C6'; ctx.fill();                                     // lumen
    for (let i = 0; i < 26; i++) { const a = hash(i * 3.3) * TAU, d = Math.sqrt(hash(i * 5.1)) * lr * 0.8; ctx.fillStyle = rgba('#5E574D', 0.5); circle(ctx, cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1.5 + hash(i) * 2.5); ctx.fill(); }
    for (let i = 0; i < 70; i++) { const a = (i / 70) * TAU; const [x, y] = [cx + Math.cos(a) * r * 0.8, cy + Math.sin(a) * r * 0.8]; ctx.strokeStyle = rgba('#6E665C', 0.35); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(cx + Math.cos(a) * r * 1.3, cy + Math.sin(a) * r * 1.3); ctx.stroke(); }   // cell borders
    if (o.stain) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = rgba(o.stain, o.stainA ?? 0.5); ctx.fillRect(cx - r * 2, cy - r * 2, r * 4, r * 4); }
    ctx.restore();
    path(); ctx.strokeStyle = '#4F483F'; ctx.lineWidth = Math.max(1.5, r * 0.025); ctx.stroke();
  }
  window.ORG = { data, page, txt, rise, note, field, organoid };
})();
