// lung: the atlas reel's kit (a project module, v2). The inside of a lung sets the look: blush and warm white, soft
// light from the upper left, an out-of-focus airspace behind, motes drifting in front. Every nucleus of the simulated
// atlas (assets/data/atlas.json, paper-src/simulate.py) is a shaded sphere (a cached sprite per colour) placed by one
// three-dimensional camera, so a nucleus can sit in the tissue section, lift off, fly into the UMAP (three axes) and
// fly home without ever being redrawn as something else. Also here: the tissue section (alveolar airspaces cut out of
// pink walls, the airway, the injury niche), white pills with a coloured dot, glass cards, rising serif text.
// Exposes window.LG.
(() => {
  const INK = '#1F2433', INK2 = '#4A5163', MUTED = '#7D8496', CORAL = '#E8553A', BG0 = '#FBF4F1', BG1 = '#F1E7EE', GREY = '#A3A8B6';
  const SERIF = '"Source Serif 4", "Inter", Georgia, serif', SANS = '"Inter", "Helvetica Neue", Arial, sans-serif';
  let D = null;
  const data = () => D || (D = ASSET('data/atlas.json'));
  const ill = (n) => ASSET('ill/' + n + '.webp');
  const colOf = (k) => data().clusters[k].color;
  const lerp = (a, b, k) => a + (b - a) * k;
  // ───────── the page: daylight through blush walls, out-of-focus chambers far behind, motes in front
  function bg(ctx, t, o = {}) {
    ctx.fillStyle = linear(ctx, 0, 0, 0, H, [[0, BG0], [1, BG1]]); ctx.fillRect(0, 0, W, H);
    const im = ill('airspace'); const air = o.air ?? 0.55;
    if (im && air > 0) { ctx.save(); ctx.globalAlpha = air; const z = 1.08 + 0.02 * Math.sin(t * 0.2); ctx.translate(W / 2 + (o.px || 0) * 0.25, H / 2); ctx.scale(z, z); ctx.drawImage(im, -W / 2, -H / 2, W, H); ctx.restore(); }
    for (let i = 0; i < 8; i++) {
      const x = (hash(i * 3.7) * W + t * (6 + 4 * hash(i)) + (o.px || 0) * 0.15) % (W + 600) - 300, y = hash(i * 5.1) * H + Math.sin(t * 0.3 + i) * 20, r = 160 + 200 * hash(i * 7.3);
      ctx.fillStyle = radial(ctx, x, y, 0, r, [[0, rgba('#F6D3DA', 0.32)], [0.7, rgba('#F6D3DA', 0.14)], [1, rgba('#F6D3DA', 0)]]); ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
    ctx.fillStyle = radial(ctx, W * 0.2, -H * 0.1, 0, W * 0.9, [[0, 'rgba(255,250,240,0.55)'], [1, 'rgba(255,250,240,0)']]); ctx.fillRect(0, 0, W, H);
  }
  function motes(ctx, t, a = 1, px = 0) {
    for (let i = 0; i < 26; i++) {
      const sp = 14 + 26 * hash(i * 1.9), x = ((hash(i * 2.3) * W - px * (0.4 + hash(i)) + Math.sin(t * 0.4 + i) * 30) % W + W) % W, y = ((hash(i * 4.1) * H - t * sp) % (H + 80) + H + 80) % (H + 80) - 40, r = 3 + 9 * hash(i * 6.7) ** 2;
      ctx.fillStyle = radial(ctx, x, y, 0, r * 2.4, [[0, rgba('#FFFFFF', 0.7 * a)], [0.5, rgba('#FFE9EE', 0.35 * a)], [1, 'rgba(255,233,238,0)']]); ctx.fillRect(x - r * 2.4, y - r * 2.4, r * 4.8, r * 4.8);
    }
  }
  // ───────── nuclei: one shaded sphere sprite per colour (lit from the upper left), and a soft shadow sprite
  const SPR = {};
  function sprite(color) {
    if (SPR[color]) return SPR[color];
    const S = 64, b = makeBuf(S, S), g = b.g, r = S / 2 - 1.5;
    g.fillStyle = radial(g, S * 0.38, S * 0.33, 0, r * 1.2, [[0, toHex(mix(color, '#FFFFFF', 0.6))], [0.32, toHex(mix(color, '#FFFFFF', 0.12))], [0.78, color], [1, toHex(mix(color, INK, 0.45))]]);
    g.beginPath(); g.arc(S / 2, S / 2, r, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.ellipse(S * 0.36, S * 0.29, r * 0.24, r * 0.14, -0.6, 0, TAU); g.fill();
    return (SPR[color] = b.c);
  }
  let SHADOW = null;
  function shadowSprite() { if (SHADOW) return SHADOW; const S = 64, b = makeBuf(S, S), g = b.g; g.fillStyle = radial(g, S / 2, S / 2, 0, S / 2, [[0, 'rgba(90,40,60,0.35)'], [1, 'rgba(90,40,60,0)']]); g.fillRect(0, 0, S, S); return (SHADOW = b.c); }
  function nuc(ctx, x, y, r, color, a = 1) { if (a <= 0 || r <= 0.3) return; ctx.globalAlpha = a; ctx.drawImage(sprite(color), x - r, y - r, 2 * r, 2 * r); }
  function nucShadow(ctx, x, y, r, a = 1) { if (a <= 0) return; ctx.globalAlpha = a; ctx.drawImage(shadowSprite(), x - r * 1.1 + r * 0.45, y - r * 0.7 + r * 0.8, r * 2.6, r * 1.6); }
  // ───────── one camera for everything: world units (UMAP units; the tissue is 60 um per unit), yaw then pitch
  const F = 1800, DIST = 30, UM = 60;
  function camera(o = {}) {
    const yaw = o.yaw || 0, pitch = o.pitch || 0, dist = o.dist ?? DIST, f = o.f ?? F, T = o.target || [0, 0, 0], cx = o.cx ?? W / 2, cy = o.cy ?? H / 2;
    const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const project = (p) => { const x = p[0] - T[0], y = p[1] - T[1], z = p[2] - T[2], x1 = x * cyw + z * syw, z1 = -x * syw + z * cyw, y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp, d = dist - z2, s = f / d; return [cx + x1 * s, cy - y2 * s, d, s]; };
    return { project, yaw, pitch, dist, f, T, cx, cy };
  }
  const lerpCam = (a, b, k) => ({ yaw: lerp(a.yaw || 0, b.yaw || 0, k), pitch: lerp(a.pitch || 0, b.pitch || 0, k), dist: lerp(a.dist ?? DIST, b.dist ?? DIST, k), cx: lerp(a.cx ?? W / 2, b.cx ?? W / 2, k), cy: lerp(a.cy ?? H / 2, b.cy ?? H / 2, k), target: [0, 1, 2].map(i => lerp((a.target || [0, 0, 0])[i], (b.target || [0, 0, 0])[i], k)) });
  // where a nucleus is: in the tissue, lifted off it, in the UMAP
  const tissueW = (c) => [(c[3] - 800) / UM, -(c[4] - 450) / UM, 0];
  const liftOf = (i) => 1.2 + 5.5 * hash(i * 1.37 + 0.2);
  const UC = [-0.6, -1.4, 0.6];
  const umapW = (c) => [(c[1] - UC[0]) * 1.08, (c[2] - UC[1]) * 1.08, (c[6] - UC[2]) * 1.08];
  // draw nuclei: pos(i, c) gives a world point, look(i, c) gives {color, a, r (world), color2, mix}; depth-sorted
  function cloud(ctx, cam, pos, look, o = {}) {
    const cells = data().cells, pts = new Array(cells.length);
    for (let i = 0; i < cells.length; i++) { const p = cam.project(pos(i, cells[i])); pts[i] = [p[0], p[1], p[2], p[3], i]; }
    pts.sort((a, b) => b[2] - a[2]);
    ctx.save();
    if (o.shadow) for (const [x, y, , s, i] of pts) { const L = look(i, cells[i]); nucShadow(ctx, x, y, (L.r ?? 0.085) * s, o.shadow * (L.a ?? 1)); }
    for (const [x, y, , s, i] of pts) {
      const L = look(i, cells[i]); const r = (L.r ?? 0.085) * s;
      if (L.mix !== undefined && L.mix > 0 && L.mix < 1) { nuc(ctx, x, y, r, L.color, (L.a ?? 1) * (1 - L.mix)); nuc(ctx, x, y, r, L.color2, (L.a ?? 1) * L.mix); }
      else nuc(ctx, x, y, r, L.mix >= 1 ? L.color2 : L.color, L.a ?? 1);
    }
    ctx.restore();
  }
  // ───────── the tissue section, drawn under the same camera (o.a fades it); airspaces are cut out of pink walls
  function section(ctx, cam, a = 1, t = 0) {
    if (a <= 0) return; const d = data(), P = (sx, sy) => cam.project([(sx - 800) / UM, -(sy - 450) / UM, 0]), sq = Math.cos(cam.pitch);
    ctx.save(); ctx.globalAlpha *= a;
    const c0 = P(0, 0), c1 = P(1600, 0), c2 = P(1600, 900), c3 = P(0, 900);
    ctx.shadowColor = 'rgba(120,60,80,0.25)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18;
    ctx.beginPath(); [c0, c1, c2, c3].forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fillStyle = '#F0BFC8'; ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.save(); ctx.clip();
    // wall texture: fine fibres
    for (let i = 0; i < 260; i++) { const p = P(hash(i * 1.3) * 1600, hash(i * 2.9) * 900), l = 20 * p[3] / UM, an = hash(i * 4.7) * TAU; ctx.strokeStyle = rgba('#E3A3B1', 0.35); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] + Math.cos(an) * l, p[1] + Math.sin(an) * l * sq); ctx.stroke(); }
    // the injury niche: thickened, darker, fibrous
    const nc = P(d.niche[0], d.niche[1]), ns = nc[3] / UM;
    ctx.fillStyle = radial(ctx, nc[0], nc[1], 0, d.niche[2] * 1.5 * ns, [[0, 'rgba(190,90,120,0.55)'], [0.7, 'rgba(200,110,135,0.25)'], [1, 'rgba(200,110,135,0)']]); ctx.beginPath(); ctx.ellipse(nc[0], nc[1], d.niche[2] * 1.5 * ns, d.niche[2] * 1.5 * ns * sq, 0, 0, TAU); ctx.fill();
    // airspaces (alveoli) and the airway
    const hole = (x, y, r, rr0) => { const p = P(x, y), s = p[3] / UM; ctx.fillStyle = '#FFF8F6'; ctx.beginPath(); ctx.ellipse(p[0], p[1], r * s, (rr0 ?? r) * s * sq, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = rgba('#E7A9B6', 0.9); ctx.lineWidth = Math.max(1, 3 * s); ctx.stroke(); ctx.fillStyle = radial(ctx, p[0] - r * s * 0.3, p[1] - r * s * 0.3 * sq, 0, r * s * 1.1, [[0, 'rgba(255,255,255,0.9)'], [1, 'rgba(255,255,255,0)']]); ctx.beginPath(); ctx.ellipse(p[0], p[1], r * s * 0.9, (rr0 ?? r) * s * 0.9 * sq, 0, 0, TAU); ctx.fill(); };
    for (const [x, y, r] of d.alveoli) hole(x, y, r - 4);
    hole(250, 450, 186, 116);
    ctx.restore();
    ctx.restore();
  }
  // ───────── type and furniture
  function font(ctx, size, weight = 500, fam = SANS, it = false) { ctx.font = `${it ? 'italic ' : ''}${weight} ${size}px ${fam}`; }
  function txt(ctx, s, x, y, o = {}) {
    ctx.save(); font(ctx, o.size || 24, o.weight || 500, o.serif ? SERIF : SANS, o.it); ctx.textAlign = o.align || 'left'; ctx.fillStyle = o.color || INK; ctx.globalAlpha *= o.a ?? 1;
    if ('letterSpacing' in ctx) ctx.letterSpacing = (o.ls || 0) + 'px'; ctx.fillText(s, x, y); ctx.restore();
  }
  function width(ctx, s, size, weight = 500, serif = false, it = false) { ctx.save(); font(ctx, size, weight, serif ? SERIF : SANS, it); const w = ctx.measureText(s).width; ctx.restore(); return w; }
  // text that rises out of a mask
  function rise(ctx, s, x, y, p, o = {}) {
    if (p <= 0) return; const e = Ease.outExpo(clamp(p)), size = o.size || 24;
    ctx.save(); ctx.beginPath(); ctx.rect(0, y - size * 1.1, W, size * 1.45); ctx.clip(); txt(ctx, s, x, y + (1 - e) * size * 1.1, { ...o, a: (o.a ?? 1) * clamp(p * 3) }); ctx.restore();
  }
  // a white pill with a coloured dot; o.to draws a leader to what it names
  function pill(ctx, s, x, y, k, o = {}) {
    if (k <= 0) return; const size = o.size || 24, dot = o.dot, w = width(ctx, s, size, 600, false, o.it) + size * 1.1 + (dot ? size * 0.9 : 0), h = size * 1.7, e = Ease.outBack(clamp(k)), a = (o.a ?? 1) * clamp(k * 3);
    if (o.to) { ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = rgba(INK, 0.55); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(lerp(x, o.to[0], clamp(k * 1.5)), lerp(y, o.to[1], clamp(k * 1.5))); ctx.stroke(); ctx.fillStyle = INK; circle(ctx, o.to[0], o.to[1], 3.5 * clamp(k * 2 - 0.5)); ctx.fill(); ctx.restore(); }
    ctx.save(); ctx.translate(x, y); ctx.scale(e, e); ctx.globalAlpha *= a;
    ctx.shadowColor = 'rgba(90,40,60,0.18)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 5; ctx.fillStyle = o.bg || 'rgba(255,255,255,0.94)'; rr(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.fill(); ctx.shadowColor = 'transparent';
    let tx = -w / 2 + size * 0.55; if (dot) { ctx.fillStyle = dot; circle(ctx, tx + size * 0.3, 0, size * 0.3); ctx.fill(); tx += size * 0.9; }
    font(ctx, size, 600, SANS, o.it); ctx.fillStyle = o.color || INK; ctx.textAlign = 'left'; ctx.fillText(s, tx, size * 0.36); ctx.restore();
  }
  // a glass card: white, a little see-through, a soft lifted shadow; k rises it in
  function card(ctx, x, y, w, h, k = 1) {
    if (k <= 0) return; const e = Ease.outExpo(clamp(k));
    ctx.save(); ctx.globalAlpha *= clamp(k * 2.5); ctx.translate(0, (1 - e) * 30);
    ctx.shadowColor = 'rgba(90,40,60,0.18)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 16; ctx.fillStyle = 'rgba(255,255,255,0.88)'; rr(ctx, x, y, w, h, 22); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
  }
  // a panel's letter and title, as the figure labels them
  function panel(ctx, letter, title, x, y, a = 1) { txt(ctx, letter, x, y, { size: 30, weight: 800, a }); txt(ctx, title, x + 34, y, { size: 26, weight: 500, color: INK2, a }); }
  // a caption across the bottom on a soft plate
  function caption(ctx, s, p, o = {}) {
    if (p <= 0) return; const size = o.size || 32, y = o.y ?? 1012, w = width(ctx, s, size, 500, !!o.serif);
    ctx.save(); ctx.globalAlpha *= (o.a ?? 1) * clamp(p * 3); ctx.fillStyle = 'rgba(255,255,255,0.72)'; rr(ctx, W / 2 - w / 2 - 30, y - size * 1.05, w + 60, size * 1.6, size * 0.8); ctx.fill(); ctx.restore();
    rise(ctx, s, W / 2, y, p, { size, weight: 500, align: 'center', a: o.a, serif: o.serif });
  }
  function prev(env) { const S = REEL.plan.scenes, j = S.findIndex(s => s.id === env.id); return j > 0 ? S[j - 1].id : null; }
  window.LG = { INK, INK2, MUTED, CORAL, GREY, SERIF, SANS, data, ill, colOf, lerp, bg, motes, sprite, nuc, camera, lerpCam, tissueW, liftOf, umapW, cloud, section, font, txt, width, rise, pill, card, panel, caption, prev, UM };
})();
