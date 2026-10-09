// hero: the shared kit of the README hero (a project module). The eighteen reels it shows are short clips prepared
// from the examples' own renders and the four case-study reels (assets/clips/<id>/00..23.webp, 2 s at 12 fps); a clip
// plays from the reel clock, so a card that moves between scenes keeps playing the same frames. Pure in t.
// Exposes window.HERO.
(() => {
  const STYLES = [
    ['playful-app', 'Mochi Notes', 'cheerful app README', 'plush mascot, real app UI'],
    ['research-cli', 'spark-bench', 'terse research CLI', 'GPU points, real terminal'],
    ['editorial-luxe', 'Maison Veyrande', 'fashion press release', 'Bodoni hairlines, piano'],
    ['riso-zine', 'PAPER JAM #07', 'zine house style', 'riso inks off register'],
    ['swiss-grid', 'Haus für Musik', 'competition brief', '12 columns, one red'],
    ['botanical-organic', 'Mistfold', 'tea-garden story', 'watercolour time-lapse'],
    ['pixel-arcade', 'ONE CREDIT JAM', 'game-jam README', 'pixel art, chiptune'],
    ['sumi-wabi', '余白庵', 'ryokan site', 'sumi ink, koto'],
    ['academic-paper', 'Alveolar repair atlas', 'single-cell paper', '4,900 cells, UMAP to tissue'],
    ['sketchnote', 'Visual Notes Lab', 'workshop handout', 'self-writing markers'],
    ['neo-brutal', 'kablok', 'landing-page CSS', 'hard shadows, funk'],
    ['art-deco', 'THE EMERALD FAN', 'jazz-age invitation', 'gilded frames, swing'],
    ['newsprint', 'Tamsin Valley Courier', 'front page', 'printing press, halftone'],
    ['sports-kinetic', 'VELMORA 42', 'race-timing app', 'broadcast type, drum and bass'],
  ];
  const CASES = [
    ['fddd', 'FDDD', 'research data reel', 'fly-brain point clouds, docking scores'],
    ['cc-statusline', 'CC-statusline', 'terminal tool reel', 'Catppuccin, real terminal captures'],
    ['kbeautygate', 'K-BeautyGate', 'hackathon pitch reel', 'plush mascots, real app UI'],
    ['flygate', 'FlyGate', 'narrated research reels', 'voice-led scenes, burned-in captions'],
  ];
  const ALL = [...STYLES, ...CASES];
  const N_FR = 24, CLIP_FPS = 12;

  function frame(id, t) {
    const k = ((Math.floor(t * CLIP_FPS) % N_FR) + N_FR) % N_FR;
    return ASSET(`clips/${id}/${String(k).padStart(2, '0')}.webp`);
  }
  // a clip in a rounded card with a soft shadow and a hairline; o: {r, a, dim, shadow, ring}
  function card(ctx, id, t, x, y, w, h, o = {}) {
    const a = o.a ?? 1;
    if (a <= 0.003 || w < 2) return;
    const r = o.r ?? Math.min(w, h) * 0.04;
    ctx.save(); ctx.globalAlpha *= a;
    if (o.shadow !== false) { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = Math.max(8, w * 0.05); ctx.shadowOffsetY = w * 0.015; rr(ctx, x, y, w, h, r); ctx.fillStyle = C.surface; ctx.fill(); ctx.restore(); }
    ctx.save(); rr(ctx, x, y, w, h, r); ctx.clip();
    const img = frame(id, t);
    if (img) ctx.drawImage(img, x, y, w, h); else { ctx.fillStyle = C.surface; ctx.fillRect(x, y, w, h); }
    if (o.dim) { ctx.fillStyle = rgba(C.bg, o.dim); ctx.fillRect(x, y, w, h); }
    ctx.restore();
    rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, r); ctx.strokeStyle = o.ring || rgba(C.ink, 0.16); ctx.lineWidth = o.ringW || 1.5; ctx.stroke();
    ctx.restore();
  }
  // the stage: crust, two soft glows, a fine dot grid (the README reel's look), cached
  let stageBuf = null;
  function stage(ctx) {
    if (!stageBuf) {
      const b = makeBuf(W, H), g = b.g, P = C;
      g.fillStyle = P.bg; g.fillRect(0, 0, W, H);
      g.fillStyle = radial(g, W * 0.12, H * 0.02, 0, W * 0.62, [[0, rgba(P.accent, 0.14)], [0.55, rgba(P.accent, 0.035)], [1, rgba(P.accent, 0)]]); g.fillRect(0, 0, W, H);
      g.fillStyle = radial(g, W * 0.96, H * 1.02, 0, W * 0.55, [[0, rgba(P.accent3, 0.12)], [0.6, rgba(P.accent3, 0.025)], [1, rgba(P.accent3, 0)]]); g.fillRect(0, 0, W, H);
      for (let y = 20; y < H; y += 40) for (let x = 20; x < W; x += 40) {
        g.fillStyle = rgba(P.ink, 0.05 + 0.05 * (1 - Math.min(1, Math.hypot(x / W, y / H)))); g.fillRect(x, y, 2, 2);
      }
      stageBuf = b.c;
    }
    ctx.drawImage(stageBuf, 0, 0);
  }
  function txt(ctx, s, x, y, o = {}) {
    ctx.save();
    ctx.font = font(o.size || 32, o.weight || 600, o.fam || 'D');
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${o.ls ?? (o.size || 32) * -0.02}px`;
    ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'alphabetic';
    ctx.globalAlpha *= o.a ?? 1; ctx.fillStyle = o.color || C.ink;
    ctx.fillText(s, x, y);
    const w = ctx.measureText(s).width; ctx.restore(); return w;
  }
  // a word that rises out of a mask; p 0..1
  function rise(ctx, s, x, y, p, o = {}) {
    if (p <= 0) return;
    const size = o.size || 32, e = Ease.outQuint(clamp(p));
    ctx.save(); ctx.beginPath(); ctx.rect(0, y - size * 1.1, W, size * 1.45); ctx.clip();
    txt(ctx, s, x, y + (1 - e) * size * 1.15, { ...o, a: (o.a ?? 1) * clamp(p * 2.5) });
    ctx.restore();
  }
  function chip(ctx, s, x, y, o = {}) {
    const size = o.size || 26, padX = size * 0.7, h = size * 1.75;
    ctx.save(); ctx.font = font(size, o.weight || 600, o.fam || 'M'); if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    const w = ctx.measureText(s).width + padX * 2;
    const x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
    ctx.globalAlpha *= o.a ?? 1;
    rr(ctx, x0, y - h / 2, w, h, h / 2); ctx.fillStyle = o.bg || rgba(C.surface, 0.92); ctx.fill();
    ctx.strokeStyle = o.ring || rgba(C.accent, 0.55); ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = o.color || C.ink; ctx.textBaseline = 'middle'; ctx.fillText(s, x0 + padX, y + 1);
    ctx.restore(); return w;
  }
  // grid slots: n tiles of 16:9 in cols x rows centred in a box
  function grid(cols, rows, box, gap) {
    const [bx, by, bw, bh] = box, w = (bw - gap * (cols - 1)) / cols, h = w * 9 / 16, H2 = rows * h + gap * (rows - 1);
    const y0 = by + (bh - H2) / 2, out = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push([bx + c * (w + gap), y0 + r * (h + gap), w, h]);
    return out;
  }
  window.HERO = { STYLES, CASES, ALL, frame, card, stage, txt, rise, chip, grid };
})();
