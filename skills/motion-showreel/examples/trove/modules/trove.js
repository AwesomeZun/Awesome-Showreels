// trove: the Trove reel's shared kit (a project module). The chrome torus is the app's own drawing (lib/torus.ts in
// the app: tube cross-sections on a tilted elliptical orbit, each filled with a linear gradient along the orbit's
// outer normal, painted back to front), ported to canvas so it can turn. The rest draws the real captures at their
// CSS size, the app's monospaced labels and its two-line headline (second line in lime).
(() => {
  const FRONT = [[0, '#020203'], [0.12, '#2a2c30'], [0.3, '#c3c6cb'], [0.4, '#ffffff'], [0.52, '#8b8e93'], [0.66, '#1a1b1e'], [0.78, '#0a0a0b'], [0.9, '#8a8d92'], [0.96, '#e8eaed'], [1, '#3c3f43']];
  const BACK = [[0, '#6f7277'], [0.12, '#d9dce0'], [0.3, '#ffffff'], [0.4, '#c4c7cc'], [0.52, '#6d7075'], [0.66, '#1f2124'], [0.78, '#0c0d0e'], [0.9, '#76797e'], [0.96, '#e0e2e5'], [1, '#44474b']];
  const LIME = [[0, '#030401'], [0.12, '#2e3a0a'], [0.3, '#b5d44b'], [0.4, '#f6ffd9'], [0.52, '#91b21c'], [0.66, '#1d2507'], [0.78, '#0a0c03'], [0.9, '#a6d21f'], [0.96, '#e6ff8a'], [1, '#3e4f0b']];
  const hex = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mixh = (a, b, t) => { if (t <= 0) return a; const A = hex(a), B = hex(b), k = Math.min(1, t); return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',') + ')'; };
  const toHexStr = (c) => c.startsWith('#') ? c : '#' + c.slice(4, -1).split(',').map(v => (+v).toString(16).padStart(2, '0')).join('');

  // the torus at (cx, cy) (centre of the orbit), s screen px per app unit (the app draws it in a 200 x 150 box),
  // o.rot (in-plane rotation, the app uses -0.3), o.tilt (0.62 in the app; 1 faces the camera), o.lime (where the lime
  // reflection sits on the orbit), o.alpha, o.seg (cross-sections)
  function torus(ctx, cx, cy, s, o = {}) {
    const R = 62, r = 24, tilt = o.tilt ?? 0.62, rot = o.rot ?? -0.3, limeAt = o.lime ?? 0.75, seg = o.seg || 220;
    const cosR = Math.cos(rot), sinR = Math.sin(rot), items = [];
    for (let i = 0; i < seg; i++) {
      const t = (i / seg) * Math.PI * 2, x = Math.cos(t) * R, y = Math.sin(t) * R * tilt, depth = Math.sin(t);
      const nx0 = Math.cos(t) * tilt, ny0 = Math.sin(t);
      let nx = nx0 * cosR - ny0 * sinR, ny = nx0 * sinR + ny0 * cosR; const len = Math.hypot(nx, ny) || 1; nx /= len; ny /= len;
      items.push({ t, depth, nx, ny, x: x * cosR - y * sinR, y: x * sinR + y * cosR, rr: r * (1 + depth * 0.07 * tilt / 0.62) });
    }
    items.sort((a, b) => a.depth - b.depth);
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
    // the contact shadow the app draws under it
    const sh = ctx.createRadialGradient(cx, cy + (R * tilt + r * 0.95) * s, 0, cx, cy + (R * tilt + r * 0.95) * s, (R + r) * s);
    sh.addColorStop(0, 'rgba(198,244,50,0.10)'); sh.addColorStop(0.5, 'rgba(0,0,0,0.25)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save(); ctx.translate(0, cy + (R * tilt + r * 0.95) * s); ctx.scale(1, 0.16); ctx.translate(0, -(cy + (R * tilt + r * 0.95) * s));
    ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(cx, cy + (R * tilt + r * 0.95) * s, (R + r) * s, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    for (const it of items) {
      const back = Math.max(0, -it.depth) ** 0.8, lime = Math.max(0, Math.cos(it.t - limeAt)) ** 4, shade = Math.max(0, it.depth) * 0.5;
      const px = cx + it.x * s, py = cy + it.y * s, rad = it.rr * s;
      const g = ctx.createLinearGradient(px - it.nx * rad, py - it.ny * rad, px + it.nx * rad, py + it.ny * rad);
      FRONT.forEach(([off, col], k) => {
        let v = mixh(col, BACK[k][1], back);
        if (lime > 0.02) v = mixh(toHexStr(v), LIME[k][1], lime);
        v = mixh(toHexStr(v), '#000000', shade * (off > 0.5 ? 0.2 : 0.6));
        g.addColorStop(off, v);
      });
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, rad, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    // the hole, for a zoom through it: centre and radii in screen px
    return { cx, cy, rx: (R - r) * s, ry: Math.max(1, (R * tilt - r)) * s };
  }

  // a capture layer: image + its sidecar (CSS rect, dpr)
  const meta = {};
  function layer(name) {
    const base = name.replace(/_\d+$/, ''), m = name.match(/_(\d+)$/);
    if (!meta[base]) meta[base] = ASSET('captures/ui/app/' + base + '.json');
    const j = meta[base], L = j && j.layers ? (m ? j.layers.find(l => l.file === name + '.png') : j.layers[0]) : j;
    return { img: IMG['captures/ui/app/' + name], L, w: L ? L.rect.w : 0, h: L ? L.rect.h : 0 };
  }
  // draw it at (x, y) with k screen px per CSS px; o.crop = [x, y, w, h] in CSS px of the layer
  function draw(ctx, name, x, y, k = 1, o = {}) {
    const { img, L } = layer(name); if (!img) return;
    const d = (L && L.dpr) || 2;
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
    if (o.crop) { const [cx, cy, cw, ch] = o.crop; ctx.drawImage(img, cx * d, cy * d, cw * d, ch * d, x, y, cw * k, ch * k); }
    else ctx.drawImage(img, x, y, img.width / d * k, img.height / d * k);
    ctx.restore();
  }

  // monospaced capitals with wide tracking, the app's label style
  function label(ctx, s, x, y, o = {}) {
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
    ctx.font = `${o.weight || 500} ${o.size || 22}px ${FAM.mono}`; ctx.fillStyle = o.color || C.muted; ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left'; const ls = (o.size || 22) * (o.ls ?? 0.18);
    let w = 0; for (const ch of s) w += ctx.measureText(ch).width + ls; w -= ls;
    let cx = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
    for (const ch of s) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + ls; }
    ctx.restore(); return w;
  }

  // chrome text: the app's --chrome-text gradient over a glyph run, drawn once into its own buffer; o.sheen (0..1)
  // sweeps a lime glint across the glyphs only (composited inside a scratch copy of that buffer)
  const CT = {};
  function chromeText(ctx, s, x, y, size, o = {}) {
    const wt = o.weight || 850, key = s + '|' + size + '|' + wt;
    let c = CT[key];
    if (!c) {
      const m = makeBuf(4, 4).g; m.font = `${wt} ${size}px ${FAM.display}`; if ('letterSpacing' in m) m.letterSpacing = `${-0.045 * size}px`;
      const w = Math.ceil(m.measureText(s).width), pad = Math.ceil(size * 0.2), bw = w + 2 * pad, bh = Math.ceil(size * 1.35), oy = Math.ceil(size * 1.02);
      const b = makeBuf(bw, bh), g = b.g; g.font = m.font; if ('letterSpacing' in g) g.letterSpacing = `${-0.045 * size}px`; g.textBaseline = 'alphabetic';
      const gr = g.createLinearGradient(0, oy - size * 0.8, 0, oy + size * 0.08);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.44, '#e8eaed'); gr.addColorStop(0.6, '#a4a8ae'); gr.addColorStop(1, '#f4f5f6');
      g.fillStyle = gr; g.fillText(s, pad, oy);
      c = CT[key] = { b, scratch: makeBuf(bw, bh), w, pad, oy, bw, bh };
    }
    let src = c.b.c;
    if (o.sheen !== undefined && o.sheen > 0 && o.sheen < 1) {
      const g = c.scratch.g; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, c.bw, c.bh); g.drawImage(c.b.c, 0, 0);
      g.globalCompositeOperation = 'source-atop'; const gx = c.pad - 200 + (c.w + 400) * o.sheen;
      const sg = g.createLinearGradient(gx - 140, 0, gx + 140, 0);
      sg.addColorStop(0, 'rgba(198,244,50,0)'); sg.addColorStop(0.5, 'rgba(230,255,138,0.6)'); sg.addColorStop(1, 'rgba(198,244,50,0)');
      g.fillStyle = sg; g.fillRect(0, 0, c.bw, c.bh); g.globalCompositeOperation = 'source-over'; src = c.scratch.c;
    }
    const x0 = (o.align === 'center' ? x - c.w / 2 : x) - c.pad;
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.drawImage(src, x0, y - c.oy); ctx.restore();
    return c.w;
  }

  // the two-line headline: each line rises per glyph; o.colors per line, o.size, o.gap, o.at (start beats or s)
  function headline(ctx, lines, x, y, lt, o = {}) {
    const size = o.size || 104, gap = o.gap ?? size * 1.16;
    lines.forEach((s, i) => kinetic(ctx, s, x, y + i * gap, lt - (o.step ?? 0.32) * i, {
      size, fam: 'display', weight: o.weight || 800, color: (o.colors || [])[i] || C.ink, ls: -0.04 * size,
      stagger: o.stagger ?? 0.03, dur: 0.6, rise: 0.5 * size, blur: 8, align: o.align, out: o.out, alpha: o.alpha,
    }));
  }

  // the stage: near-black with the app's faint lime glow and a hairline grid that drifts
  function stage(ctx, t, o = {}) {
    ctx.fillStyle = '#08090A'; ctx.fillRect(0, 0, W, H);
    const gx = o.glowX ?? 1500, gy = o.glowY ?? 140;
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 1100); g.addColorStop(0, 'rgba(198,244,50,0.075)'); g.addColorStop(1, 'rgba(198,244,50,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (o.grid !== false) {
      ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.035)'; ctx.lineWidth = 1; const step = 96, off = ((t * (o.drift ?? 8)) % step);
      ctx.beginPath(); for (let x = -step + off; x < W + step; x += step) { ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, H); }
      for (let y = 0; y < H + step; y += step) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); } ctx.stroke(); ctx.restore();
    }
  }

  // a link chip in the app's card language: domain initials in a chrome square, the domain in mono, a title
  function linkChip(ctx, x, y, s, o) {
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(s, s);
    ctx.font = `600 22px ${FAM.sans}`; const tw = Math.min(420, ctx.measureText(o.title).width);
    const w = 96 + tw, h = 74;
    rr(ctx, -w / 2, -h / 2, w, h, 12); ctx.fillStyle = '#111215'; ctx.fill(); ctx.strokeStyle = o.hot ? 'rgba(198,244,50,0.55)' : 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1.5; ctx.stroke();
    const ax = -w / 2 + 16, ay = -h / 2 + 16;
    const g = ctx.createLinearGradient(0, ay, 0, ay + 42); g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, '#c9ccd1'); g.addColorStop(0.55, '#6f7277'); g.addColorStop(1, '#e6e8eb');
    rr(ctx, ax, ay, 42, 42, 9); ctx.fillStyle = g; ctx.fill();
    ctx.fillStyle = '#0d0e10'; ctx.font = `800 17px ${FAM.sans}`; ctx.textAlign = 'center'; ctx.fillText(o.ini, ax + 21, ay + 27);
    ctx.textAlign = 'left'; ctx.font = `500 15px ${FAM.mono}`; ctx.fillStyle = '#8E929B'; ctx.fillText(o.domain, ax + 58, ay + 15);
    ctx.font = `600 22px ${FAM.sans}`; ctx.fillStyle = '#EEEFF1';
    let t = o.title; while (ctx.measureText(t).width > 420 && t.length > 2) t = t.slice(0, -2) + '…';
    ctx.fillText(t, ax + 58, ay + 41);
    ctx.restore();
  }

  window.TROVE = { torus, layer, draw, label, chromeText, headline, stage, linkChip };
})();
