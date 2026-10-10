// ps: the Perturb-seq preprint's kit (a project module). Two worlds share one palette: the illustrated one (GPT Image
// 2.5 renders with real alpha in assets/ill/, laid out in depth and moved as 2.5D layers with parallax, bokeh and depth
// of field) and the figure one (dark panels, a diverging cyan-slate-magenta scale, one colour per programme, Plex Sans
// for sentences and Plex Mono for genes and numbers). The DNA is drawn in code so it can be cut. Exposes window.PS.
// Pure in its arguments.
(() => {
  let D = null, M = null;
  const data = () => (D || (D = ASSET('data/screen.json')));
  const meta = () => (M || (M = ASSET('ill/meta.json')));
  const ill = (name) => ASSET('ill/' + name + '.webp');
  const PROG = ['#FB7185', '#FBBF24', '#34D399', '#60A5FA', '#A78BFA'];
  const CYAN = '#22D3EE', MAG = '#E879F9', AMBER = '#FBBF24';
  // diverging: -2 cyan .. 0 slate .. +2 magenta
  function div(v) { const u = clamp(v / 2, -1, 1); return u < 0 ? toHex(mix('#1E293B', CYAN, Math.pow(-u, 0.8))) : toHex(mix('#1E293B', MAG, Math.pow(u, 0.8))); }
  function txt(ctx, s, x, y, o = {}) {
    ctx.save(); ctx.font = `${o.weight || 400} ${o.size || 24}px ${o.mono ? FAM.mono : FAM.sans}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${o.ls ?? 0}px`;
    ctx.textAlign = o.align || 'left'; ctx.fillStyle = o.color || C.ink; ctx.globalAlpha *= o.a ?? 1;
    if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowR || 18; }
    const str = o.n !== undefined ? String(s).slice(0, Math.max(0, Math.floor(o.n))) : String(s);
    ctx.fillText(str, x, y); const w = ctx.measureText(String(s)).width; ctx.restore(); return w;
  }
  // a line that rises out of a mask (outExpo)
  function rise(ctx, s, x, y, p, o = {}) {
    if (p <= 0) return; const e = Ease.outExpo(clamp(p)), size = o.size || 24;
    ctx.save(); ctx.beginPath(); ctx.rect(0, y - size * 1.15, W, size * 1.5); ctx.clip();
    txt(ctx, s, x, y + (1 - e) * size * 1.1, { ...o, a: (o.a ?? 1) * clamp(p * 3) }); ctx.restore();
  }
  // an illustration layer centred at (x, y), scale s; o.blur (px), o.a, o.filter, o.rot
  function layer(ctx, name, x, y, s, o = {}) {
    const im = ill(name); if (!im) return;
    const w = im.naturalWidth * s, h = im.naturalHeight * s;
    ctx.save(); ctx.globalAlpha *= o.a ?? 1;
    const f = [o.blur ? `blur(${o.blur}px)` : '', o.filter || ''].join(' ').trim(); if (f) ctx.filter = f;
    if (o.op) ctx.globalCompositeOperation = o.op;
    ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot);
    ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore();
  }
  // soft out-of-focus discs drifting through the tissue (deterministic); depth 0 far .. 1 near
  function bokeh(ctx, t, n, o = {}) {
    for (let i = 0; i < n; i++) {
      const d = hash(i * 1.7 + (o.seed || 0)), r = (o.r || 10) + d * d * (o.rMax || 40);
      const x = ((hash(i * 3.1) * 1.3 - 0.15) * W + t * (8 + d * 30) * (o.dx ?? 1) + (o.px || 0) * d) % (W * 1.3) - W * 0.15;
      const y = hash(i * 5.3) * H + Math.sin(t * 0.4 + i) * 12 + (o.py || 0) * d;
      const col = hash(i * 9.1) > 0.55 ? (o.c1 || '#2DD4BF') : (o.c2 || '#FB7185');
      ctx.fillStyle = radial(ctx, x, y, 0, r, [[0, rgba(col, (o.a ?? 0.18) * (0.5 + d))], [0.6, rgba(col, (o.a ?? 0.18) * 0.35)], [1, rgba(col, 0)]]);
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
  function glow(ctx, x, y, r, col, a = 1) {
    if (a <= 0.003) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = radial(ctx, x, y, 0, r, [[0, rgba(col, 0.9 * a)], [0.25, rgba(col, 0.35 * a)], [1, rgba(col, 0)]]);
    ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
  }
  // a lab-style label: a dot on the target, a leader, the words in mono
  function label(ctx, tx, ty, lx, ly, s, p, o = {}) {
    if (p <= 0) return; const e = Ease.outExpo(clamp(p)), col = o.color || C.ink2;
    ctx.save(); ctx.strokeStyle = rgba(col, 0.8); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + (lx - tx) * e, ty + (ly - ty) * e); ctx.stroke();
    ctx.fillStyle = col; circle(ctx, tx, ty, 4 * e); ctx.fill();
    ctx.restore();
    txt(ctx, s, lx + (o.align === 'right' ? -10 : 10), ly + 6, { size: o.size || 20, mono: true, color: col, align: o.align || 'left', n: s.length * clamp(p * 1.4), ls: 0.5 });
  }
  // DNA: two backbones with depth and base-pair rungs, along x from x0 to x1 around y; o.amp, o.pitch, o.phase,
  // o.cut (x of a break), o.gap (how far the halves have moved apart), o.tilt (radians the halves swing), o.hl [xa, xb]
  function helix(ctx, x0, x1, y, o = {}) {
    const amp = o.amp || 28, pitch = o.pitch || 110, ph = o.phase || 0, cut = o.cut ?? 1e9, gap = o.gap || 0, tilt = o.tilt || 0;
    const place = (x, yy) => {                                       // the two halves move apart about the cut
      if (x < cut) { const dx = x - cut; return [cut - gap + dx * Math.cos(-tilt) , y + (yy - y) + dx * Math.sin(-tilt)]; }
      const dx = x - cut; return [cut + gap + dx * Math.cos(tilt), y + (yy - y) + dx * Math.sin(tilt)];
    };
    const strand = (off, front) => {
      ctx.beginPath();
      for (let x = x0; x <= x1; x += 4) {
        if (Math.abs(x - cut) < 3) { ctx.stroke(); ctx.beginPath(); continue; }
        const a = (x / pitch) * TAU + ph + off, yy = y + Math.sin(a) * amp, z = Math.cos(a), [px, py] = place(x, yy);
        if ((z > 0) !== front) { ctx.stroke(); ctx.beginPath(); continue; }
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    };
    ctx.save(); ctx.lineCap = 'round'; ctx.globalAlpha *= o.a ?? 1;
    // back strands, rungs, front strands
    ctx.strokeStyle = rgba('#7DD3FC', 0.28); ctx.lineWidth = 5; strand(0, false); strand(Math.PI * 0.8, false);
    for (let x = x0; x <= x1; x += pitch / 10) {
      if (Math.abs(x - cut) < pitch / 12) continue;
      const a = (x / pitch) * TAU + ph, [ax, ay] = place(x, y + Math.sin(a) * amp), [bx, by] = place(x, y + Math.sin(a + Math.PI * 0.8) * amp);
      const k = Math.round(x / (pitch / 10)), hl = o.hl && x > o.hl[0] && x < o.hl[1];
      ctx.strokeStyle = hl ? rgba(AMBER, 0.95) : rgba(k % 2 ? CYAN : MAG, 0.55); ctx.lineWidth = hl ? 4 : 3;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    }
    ctx.strokeStyle = '#BAE6FD'; ctx.lineWidth = 6; ctx.shadowColor = rgba('#38BDF8', 0.8); ctx.shadowBlur = 14;
    strand(0, true); strand(Math.PI * 0.8, true);
    ctx.restore();
  }
  // panel chrome: letter + title, top left; a thin rule; the preprint tag top right
  function chrome(ctx, letter, title, a = 1) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a;
    txt(ctx, 'PREPRINT · FICTIONAL · SIMULATED DATA', W - 96, 84, { size: 16, mono: true, color: C.muted, align: 'right', ls: 1.5 });
    if (letter) txt(ctx, letter, 96, 92, { size: 40, weight: 700, color: MAG });
    txt(ctx, title, letter ? 140 : 96, 90, { size: 26, weight: 600, color: C.ink });
    ctx.fillStyle = rgba('#94A3B8', 0.25); ctx.fillRect(96, 112, W - 192, 1.5);
    ctx.restore();
  }
  function bg(ctx) {
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = radial(ctx, W * 0.78, H * 0.18, 0, W * 0.7, [[0, rgba(MAG, 0.07)], [1, rgba(MAG, 0)]]); ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = radial(ctx, W * 0.12, H * 0.92, 0, W * 0.6, [[0, rgba(CYAN, 0.06)], [1, rgba(CYAN, 0)]]); ctx.fillRect(0, 0, W, H);
  }
  function vignette(ctx, a = 0.55) {
    ctx.fillStyle = radial(ctx, W / 2, H / 2, H * 0.35, W * 0.75, [[0, 'rgba(0,0,0,0)'], [1, `rgba(3,6,12,${a})`]]); ctx.fillRect(0, 0, W, H);
  }
  window.PS = { data, meta, ill, PROG, CYAN, MAG, AMBER, div, txt, rise, layer, bokeh, glow, label, helix, chrome, bg, vignette };
})();
