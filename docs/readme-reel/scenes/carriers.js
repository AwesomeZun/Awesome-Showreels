// carriers (feat-carriers.webp): every visual tool, when the story needs it. Six carriers on a 3x2 grid; every two
// beats one of them expands from its cell to 70% of the frame (FLIP: the tile is laid out once at its large size and
// drawn scaled into any rect), plays its move big, and returns to its cell as the next one grows. All material is
// real: the terminal replays the real `spark-bench run` cast (capture_cli.py -> term.js on a quad.js panel), Mochi was
// lifted from the playful-app logo by macOS Vision (tools/prep_assets.py, blink twin from the measured eyes), the
// phone shows the app's own captured screen and result-card layer (capture_ui.mjs), the PDF tile shows a page and a
// figure that pdf_figures.py extracted (from the spark-bench demo note that tools/readme_data.py writes from the
// example's README and demo data), and the particles are a gl.js point cloud. Loop: 12 beats; frame 0 (the poster)
// is the terminal at full size, zoomed to its key line.
(() => {
  const TW = 1344, TH = 756;                                         // a tile's own layout size (16:9)
  const CW = 560, CH = 315, XS = [96, 680, 1264], YS = [176, 586];    // grid cells (scale 560 / 1344)
  const BIG = { x: (1920 - TW) / 2, y: 196, w: TW, h: TH };           // the expanded tile
  const TILES = [
    { label: 'Code-drawn 2D', tool: 'Canvas2D + WebGL2' },
    { label: 'Mascot cutout', tool: 'macOS Vision lift' },
    { label: 'Real app UI', tool: 'capture_ui.mjs' },
    { label: 'Real terminal', tool: 'capture_cli.py' },
    { label: 'PDF figures', tool: 'pdf_figures.py' },
    { label: 'GPU particles', tool: 'gl.js' },
  ];
  const FIRST = 3, PER = 1.0;                                       // the terminal's turn starts the loop
  const cellOf = (i) => ({ x: XS[i % 3], y: YS[Math.floor(i / 3)], w: CW, h: CH });
  const lerpR = (a, b, k) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), w: lerp(a.w, b.w, k), h: lerp(a.h, b.h, k) });

  // turn of tile i at loop time u: tau in [0, 6) seconds since its turn began (turns start on every other beat);
  // q = tau / PER while it is the focus
  function turn(i, u) {
    const s = ((i - FIRST + 6) % 6) * PER;
    const tau = (((u - s) % 6) + 6) % 6;
    return { tau, q: tau < PER ? tau / PER : -1 };
  }
  // 0 in the cell .. 1 expanded: out over a third of the turn (with a small settle), back in over the last third, so
  // the size changes over 8 frames each way and the hand-off to the next tile lands on the beat
  function grow(tau) {
    if (tau >= PER) return 0;
    if (tau < 0.66) return Ease.ioC(clamp(tau / 0.33)) + 0.035 * Math.sin(Math.PI * clamp((tau - 0.26) / 0.3));
    return 1 - Ease.ioC(clamp((tau - 0.66) / 0.34));
  }

  // ───────── 0: code-drawn vector (shape morph + kinetic type), in tile coordinates ─────────
  function starPoints(cx, cy, r, n) {
    return circlePoints(cx, cy, r, n).map(([x, y]) => { const a = Math.atan2(y - cy, x - cx), k = 0.74 + 0.26 * Math.cos(5 * a); return [cx + (x - cx) * k, cy + (y - cy) * k]; });
  }
  function tileVector(ctx, P, q, u) {
    const cx = 330, cy = 378, R = 190, n = 240;
    const A = circlePoints(cx, cy, R, n), B = roundRectPoints({ x: cx - R * 0.86, y: cy - R * 0.86, w: R * 1.72, h: R * 1.72, r: R * 0.42 }, n), S = starPoints(cx, cy, R * 1.12, n);
    // idle: one morph per bar (star -> circle -> rounded square -> star ...), so the cell is never still
    const ph = ((u / 2) % 3 + 3) % 3, step = Math.floor(ph), k = Ease.ioC(clamp((ph - step - 0.35) / 0.5));
    const seq = [[S, A], [A, B], [B, S]][step];
    let pts = morphPoints(seq[0], seq[1], k), rot = 0.25 * Math.sin(TAU * u / 6);
    if (q >= 0) rot += 0.9 * Math.sin(Math.PI * Ease.ioC(q));
    const pop = q >= 0 ? 1 + 0.12 * Math.sin(Math.PI * clamp(q / 0.5)) : 1;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(pop, pop); ctx.translate(-cx, -cy);
    ctx.shadowColor = rgba(P.accent, 0.5); ctx.shadowBlur = 40;
    pathFrom(ctx, pts, true); ctx.fillStyle = linear(ctx, cx - R, cy - R, cx + R, cy + R, [[0, P.accent], [1, P.accent2]]); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = rgba('#FFFFFF', 0.22); circle(ctx, cx - R * 0.3, cy - R * 0.32, R * 0.22); ctx.fill();
    ctx.restore();
    for (let i = 0; i < 3; i++) {                                   // orbiting dots, one turn per bar, never in front
      const a = TAU * (u / 2) + i * TAU / 3 + 0.9;
      circle(ctx, cx + Math.cos(a) * (R + 70), cy + Math.sin(a) * (R + 70) * 0.42, 14); ctx.fillStyle = [P.accent3, P.teal || P.accent, P.orange || P.accent2][i]; ctx.fill();
    }
    // kinetic word: re-enters glyph by glyph on every bar, and on the focus beat
    const x = 640, y = 410, s = 'kinetic', o = { size: 190, weight: 700, fam: 'display', ls: -4, color: KIT.bright(), stagger: 0.04, dur: 0.36, blur: 10 };
    const bt = q >= 0 ? q * PER : ((u % 2) + 2) % 2;
    if (bt < 0.16) kinetic(ctx, s, x, y, 9 + bt, { ...o, out: { at: 9, stagger: 0.02, dur: 0.14 } });
    else kinetic(ctx, s, x, y, bt - 0.16, { ...o, pop: true });
    ctx.save(); ctx.strokeStyle = rgba(P.accent3, 0.9); ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath();
    const amp = 18 + 16 * Math.sin(Math.PI * clamp(bt / 0.9));
    for (let i = 0; i <= 120; i++) { const xx = x + i * 5.4, yy = y + 80 + Math.sin(i * 0.2 + TAU * u) * amp; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
    ctx.stroke(); ctx.restore();
  }

  // ───────── 1: mascot cutout (Vision lift of the logo icon, blink twin, hop with squash and jelly) ─────────
  function tileMascot(ctx, P, q, u) {
    const logo = IMG['ex/mochi-logo'];
    if (logo) {                                                     // the source: the logo's icon tile
      const sx = logo.width / 1438;
      ctx.save(); rr(ctx, 70, 200, 330, 330, 56); ctx.clip();
      ctx.drawImage(logo, 40 * sx, 40 * sx, 380 * sx, 380 * sx, 70, 200, 330, 330); ctx.restore();
      rr(ctx, 70, 200, 330, 330, 56); ctx.strokeStyle = rgba(P.ink, 0.18); ctx.lineWidth = 3; ctx.stroke();
      text(ctx, 'logo.png', 235, 600, { size: 40, weight: 600, fam: 'mono', color: P.ink2, align: 'center' });
    }
    const fl = ((u % 2) + 2) % 2;                                    // a pulse runs down the arrow every bar
    KIT.arrow(ctx, 440, 365, 560, 365, { color: rgba(P.accent, 0.85), head: 26, lw: 6 });
    circle(ctx, lerp(440, 552, Ease.ioC(clamp(fl / 0.6))), 365, 10); ctx.fillStyle = rgba('#FFFFFF', 1 - clamp((fl - 0.4) / 0.3)); ctx.fill();
    // the cutout on a transparency checkerboard
    const bx = 600, by = 60, bw = 680, bh = 640;
    ctx.save(); rr(ctx, bx, by, bw, bh, 30); ctx.clip();
    const cs = 40;
    for (let yy = 0; yy < bh; yy += cs) for (let xx = 0; xx < bw; xx += cs) {
      ctx.fillStyle = ((xx + yy) / cs) % 2 ? '#2A2A3C' : '#1E1E2D'; ctx.fillRect(bx + xx, by + yy, cs, cs);
    }
    ctx.restore();
    const fx = bx + bw / 2, fy = by + bh - 40, h = 430;
    let lift = 0, sx = 1, sy = 1, jelly = 0, jp = 0;
    const hop = q >= 0 ? q * PER : ((u + 1) % 2 + 2) % 2 - 1;         // a small hop every bar, a big one on the focus
    const big = q >= 0 ? 1 : 0.35;
    if (hop >= 0 && hop < 0.12) { const k = Math.sin(Math.PI * hop / 0.12); sy -= 0.12 * k; sx += 0.08 * k; }
    else if (hop >= 0.12 && hop < 0.5) { const k = (hop - 0.12) / 0.38; lift = 230 * big * Math.sin(Math.PI * k); sy += 0.07 * Math.sin(Math.PI * k); sx -= 0.05 * Math.sin(Math.PI * k); }
    else if (hop >= 0.5) { const d = hop - 0.5, w = wob(d, 3.2, 6) * 0.15 * (0.5 + big / 2); sy -= w; sx += w * 0.8; jelly = 22 * Math.exp(-d * 5) * Math.sin(d * 34); jp = d * 9; }
    const br = Math.sin(TAU * u / 1.5) * 0.015;
    sy += br; sx -= br * 0.4;
    groundShadow(ctx, fx, fy + 8, h * 0.9 * (1 - lift / 600), 0.55 * (1 - lift / 700), '#000000');
    const blink = [0.55, 2.3, 3.3, 4.75].some(t0 => u >= t0 && u < t0 + 0.1) || (q > 0.62 && q < 0.72);
    drawChar(ctx, 'mochi', fx, fy - lift, h, { sx, sy, jelly, jellyPhase: jp, blink });
    if (q > 0.45 && q < 0.9) for (let j = 0; j < 6; j++) {
      const k = (q - 0.45) / 0.45, a = -Math.PI / 2 + (j - 2.5) * 0.5, d = 150 + 160 * Ease.outC(k);
      sparkle(ctx, fx + Math.cos(a) * d, fy - 220 + Math.sin(a) * d * 0.7, 22 + (j % 2) * 10, Math.sin(Math.PI * k), k * 3 + j, mix('#FFFFFF', P.accent2, 0.4));
    }
  }

  // ───────── 2: real app UI (captured screen + the result-card layer, exploded and re-seated) ─────────
  function phoneBody(ctx, x, y, w, h) {
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 20;
    rr(ctx, x, y, w, h, 62); ctx.fillStyle = linear(ctx, x, y, x + w, y + h, [[0, '#4A4B63'], [0.5, '#2E2F42'], [1, '#232435']]); ctx.fill();
    ctx.restore();
    rr(ctx, x + 2, y + 2, w - 4, h - 4, 60); ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 3; ctx.stroke();
    rr(ctx, x + 12, y + 12, w - 24, h - 24, 50); ctx.fillStyle = '#0B0B12'; ctx.fill();
  }
  function tileApp(ctx, P, q, u) {
    const s = 0.76, sw = 412 * s, sh = 872 * s;                      // the captured screen is 412 x 872 CSS px
    // 1 = the result-card layer seated in the phone, 0 = exploded out beside it. Focus: out on the beat, back in
    // before the turn ends; idle: the layer lifts a little on every bar.
    let k;
    if (q >= 0) k = q < 0.1 ? 1 : q < 0.26 ? 1 - Ease.ioC((q - 0.1) / 0.16) : q < 0.62 ? 0 : Ease.outBack(clamp((q - 0.62) / 0.22), 1.4);
    else { const b = ((u % 2) + 2) % 2; k = 1 - 0.16 * Math.sin(Math.PI * clamp((b - 1) / 0.6)); }
    const px = lerp(880, (TW - sw - 40) / 2, clamp(k)), py = (TH - sh) / 2 - 28, scr = { x: px + 20, y: py + 20, w: sw, h: sh };
    const bob = 6 * Math.sin(TAU * u / 3);
    ctx.save(); ctx.translate(0, bob);
    phoneBody(ctx, px, py, sw + 40, sh + 40);
    ctx.save(); rr(ctx, scr.x, scr.y, scr.w, scr.h, 44); ctx.clip();
    ctx.fillStyle = '#FFF7F2'; ctx.fillRect(scr.x, scr.y, scr.w, scr.h);
    if (IMG['ex/app-final']) ctx.drawImage(IMG['ex/app-final'], scr.x, scr.y + 44 * s, sw, 828 * s);
    ctx.fillStyle = '#FFF7F2'; ctx.fillRect(scr.x, scr.y, scr.w, 44 * s);
    text(ctx, '9:41', scr.x + 34, scr.y + 26, { size: 20, weight: 700, fam: 'sans', color: '#46303D' });
    // layer: result card (CSS rect x 0, y 378.28, 412 x 319 incl. its 16/28 px shadow pad)
    const slot = { x: scr.x, y: scr.y + 378.28 * s, w: 412 * s, h: 319 * s };
    if (k < 0.98) {
      ctx.fillStyle = rgba('#46303D', 0.12 * (1 - k)); ctx.fillRect(slot.x + 16 * s, slot.y + 28 * s, 380 * s, 263 * s);
      ctx.setLineDash([12, 9]); ctx.strokeStyle = rgba('#E2567D', 0.6 * (1 - k)); ctx.lineWidth = 4;
      ctx.strokeRect(slot.x + 16 * s, slot.y + 28 * s, 380 * s, 263 * s); ctx.setLineDash([]);
    }
    ctx.restore();
    const fl = q >= 0 ? 10 * Math.sin(TAU * q * 1.5) : 0;            // the free layer floats while it is out
    const out = { x: 70, y: 120 + fl, w: 412 * 1.6, h: 319 * 1.6 };
    const L = lerpR(out, slot, clamp(k)), tilt = lerp(-0.05, 0, clamp(k));
    if (IMG['ex/app-result']) {
      ctx.save(); ctx.translate(L.x + L.w / 2, L.y + L.h / 2); ctx.rotate(tilt);
      ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 60 * (1 - k); ctx.shadowOffsetY = 26 * (1 - k);
      ctx.drawImage(IMG['ex/app-result'], -L.w / 2, -L.h / 2, L.w, L.h);
      ctx.restore();
      if (k < 0.6) {                                                // leader to its slot
        ctx.save(); ctx.setLineDash([14, 12]); ctx.strokeStyle = rgba(P.accent, 0.7 * (1 - k / 0.6)); ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(L.x + L.w - 30, L.y + L.h * 0.55); ctx.lineTo(slot.x + 16, slot.y + slot.h * 0.5); ctx.stroke(); ctx.restore();
        text(ctx, 'layer', out.x + 6, out.y - 24, { size: 44, weight: 700, fam: 'mono', color: P.accent, alpha: 1 - k / 0.6 });
      }
    }
    ctx.restore();
  }

  // ───────── 3: real terminal cast, tilted, zoom to the key line ─────────
  const CAST = 'captures/term/run.cast', ROW = /^spark\s+1\.3×/;
  function tileTerm(ctx, P, q, u) {
    const pl = Term.get(CAST, { theme: 'style', fontSize: 15, lineHeight: 1.32, res: 4, title: 'spark-bench run', radius: 12, pad: [18, 12],
      chrome: { kind: 'mac', lights: 'mono' }, cursor: { blink: 0.5 }, play: { at: 0, typing: false } });
    const tp = pl.end + 2 + u;                                      // finished output; the caret blinks
    const base = { x: TW / 2 + 10, y: TH / 2 + 10, s: 1.62, yaw: -0.3 + 0.05 * Math.sin(TAU * u / 6), pitch: 0.08, roll: -0.02 };
    const row = pl.find(ROW);
    let pose = base, zk = 0;
    // focus: zoom to the spark row, hold, and ease back out as the tile returns; idle: a slow drift of the tilt
    if (row) {
      const tz = q >= 0 ? q * PER : -1;
      zk = tz < 0 ? 0 : tz < 0.12 ? 0 : tz < 0.42 ? Ease.ioC((tz - 0.12) / 0.3) : tz < 0.7 ? 1 : 1 - Ease.ioC((tz - 0.7) / 0.26);
      const bx = pl.box(row.line, tp, { cols: [0, 62] });
      if (bx) pose = pl.zoomPose(base, bx, zk, { width: 1180, x: TW / 2, y: TH / 2 + 10, keep: 0.35 });
    }
    const hk = q >= 0 ? Ease.outC(rm(q, 0.3, 0.42)) * (1 - Ease.inC(rm(q, 0.72, 0.9))) : 0;
    const hl = row ? { lines: [{ line: row.line, k: 0.35 + 0.65 * hk, color: P.accent, cols: [0, 62], scan: q >= 0 ? rm(q, 0.36, 0.72) : 0 }], spot: { k: 0.6 * hk, lines: [row.line] } } : undefined;
    const res = pl.draw(ctx, tp, pose, { highlight: hl, glow: { color: P.accent, a: 0.18 + 0.3 * hk, blur: 60, width: 3 }, shadow: { color: 'rgba(0,0,0,0.55)', blur: 60, y: 26 } });
    if (res && row && hk > 0.05) {
      const b = pl.box(row.line, tp, { cols: [0, 62], pad: 0.6 });
      if (b) { const rc = res.rect(b); Quad.brackets(ctx, rc, { color: P.accent, a: hk, glow: rgba(P.accent, 0.8), pad: 14, len: 30, width: 5 }); }
    }
  }

  // ───────── 4: PDF figure (page -> extracted Figure 2, caption kept, highlighter on the quoted line) ─────────
  function tilePdf(ctx, P, q, u) {
    const page = IMG['captures/pdf/spark-note/page-1'], fig = IMG['captures/pdf/spark-note/fig-2'];
    const meta = ASSET('captures/pdf/spark-note/fig-2.json') || {}, idx = ASSET('captures/pdf/spark-note/figures.json') || {};
    if (!page) return;
    const pw = 420, ph = Math.round(pw * page.height / page.width), ppx = 70, ppy = 44 + 6 * Math.sin(TAU * u / 3);
    const sc = page.width / 612;                                     // page image px per PDF point
    const find = (idx.finds || []).find(f => f.bbox && f.bbox[0] > 306 && /4\.1/.test(f.text));
    const b2 = ((u % 2) + 2) % 2;                                    // idle: the highlighter re-draws every bar
    const hlK = q >= 0 ? (q < 0.12 ? 1 - Ease.ioC(q / 0.12) : q < 0.45 ? 0 : Ease.ioC(rm(q, 0.45, 0.8))) : Ease.ioC(clamp((b2 - 0.2) / 0.6));
    const hlRect = find ? find.pagePx.map(v => (v / (find.pageZoom || 3)) * sc) : null;
    const map = paperSheet(ctx, ppx, ppy, pw, ph, { img: page, rot: -0.035, highlights: hlRect ? [{ rect: hlRect, k: hlK, color: P.warn }] : [] });
    const lk = q >= 0 ? Ease.outC(rm(q, 0.12, 0.3)) * (1 - Ease.inC(rm(q, 0.7, 0.88))) : 0;
    const fw = 600, fh = fig ? Math.round(fw * fig.height / fig.width) : 400, fx = 640, fy = 64;
    if (meta.bbox && lk > 0) {
      const [x0, y0, x1, y1] = meta.bbox.map(v => v * sc), a = map(x0, y0), b = map(x1, y1);
      const sq = 1 + 0.4 * (1 - lk), cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2, w = Math.abs(b[0] - a[0]) * sq, h = Math.abs(b[1] - a[1]) * sq;
      brackets(ctx, cx - w / 2 - 10, cy - h / 2 - 10, w + 20, h + 20, 26, P.accent, 5, lk);
      ctx.save(); ctx.strokeStyle = rgba(P.accent, 0.8 * lk); ctx.lineWidth = 5; ctx.setLineDash([16, 12]);
      ctx.beginPath(); ctx.moveTo(cx + w / 2 + 10, cy); ctx.lineTo(fx - 16, fy + fh / 2); ctx.stroke(); ctx.restore();
    }
    // the extracted figure on a paper card: lifts toward the camera when the brackets lock, settles every bar
    const lift = q >= 0 ? Ease.outBack(rm(q, 0.22, 0.46), 1.6) * (1 - Ease.ioC(rm(q, 0.7, 0.92))) : 0;
    const pop = 1 + 0.12 * lift + 0.02 * wob(b2, 2.6, 7);
    ctx.save(); ctx.translate(fx + fw / 2, fy + fh / 2); ctx.scale(pop, pop); ctx.rotate(-0.02 * lift); ctx.translate(-fx - fw / 2, -fy - fh / 2);
    KIT.panel(ctx, fx - 18, fy - 18, fw + 36, fh + 36, { r: 20, fill: '#FFFFFF', stroke: rgba('#FFFFFF', 0.4), glow: 0.8 * lk });
    if (fig) ctx.drawImage(fig, fx, fy, fw, fh);
    ctx.restore();
    KIT.tag(ctx, (meta.label || 'Figure 2') + ' · caption kept', fx - 18, fy + fh + 74, { size: 38, h: 70, padX: 22, color: P.ink, r: 12 });
  }

  // ───────── 5: GPU particles (a point cloud that explodes and re-forms the word) ─────────
  let CLOUD = null;
  function tileParticles(ctx, P, q, u) {
    if (!CLOUD) {
      const n = 4200, G = GL.shapePoints('galaxy', n, { r: 1.5 }), A = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { A[i * 3] = G[i * 3]; A[i * 3 + 1] = -G[i * 3 + 2]; A[i * 3 + 2] = G[i * 3 + 1]; }   // face the camera
      const Bp = GL.textPoints('REEL', { n, size: 220, weight: 700, fam: 'D', width: 2.2, seed: 4 });
      const M = GL.pairPoints(A, Bp, 'x'), c0 = GL.rgb(P.accent3), c1 = GL.rgb(P.accent), c2 = GL.rgb(P.accent2);
      const col = (i) => { const k = clamp((M[i * 3] + 1.1) / 2.2), a = k < 0.5 ? c0 : c1, b = k < 0.5 ? c1 : c2, f = k < 0.5 ? k * 2 : k * 2 - 1;
        return [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)]; };
      const C3 = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) C3.set(hash(i * 0.73) < 0.12 ? [1, 1, 1] : col(i), i * 3);
      CLOUD = GL.cloud(A, { morph: M, colors: C3, sizes: [5.5, 9.5] });
    }
    // idle: the word breathes apart a little every bar; focus: it bursts into the galaxy and re-forms
    const b2 = ((u % 2) + 2) % 2;
    const m = q >= 0 ? 1 - 0.95 * Math.sin(Math.PI * Ease.ioQ(clamp(q / 0.92))) : 1 - 0.12 * Math.sin(Math.PI * clamp(b2 / 2));
    const yaw = q >= 0 ? 0.6 * Math.sin(Math.PI * Ease.ioQ(clamp(q))) : 0.1 * Math.sin(TAU * u / 6);
    const cam = GL.camera({ yaw, pitch: 0.05 * Math.sin(TAU * u / 6), dist: 4.3, fov: 0.6, shiftX: 2 * (TW / 2) / W - 1, shiftY: 1 - 2 * (TH / 2) / H });
    ctx.fillStyle = radial(ctx, TW / 2, TH / 2, 0, 640, [[0, rgba(P.accent, 0.14)], [1, rgba(P.accent, 0)]]); ctx.fillRect(0, 0, TW, TH);
    GL.begin({ exposure: 1.4 });
    GL.drawCloud(CLOUD, { cam, morph: m, swirl: 0.5, stagger: 0.5, time: 2 + 0.6 * Math.sin(TAU * u / 6), twinkle: 0.12, soft: 0.55, size: 1.1 });
    GL.blit(ctx);
  }

  const DRAW = [tileVector, tileMascot, tileApp, tileTerm, tilePdf, tileParticles];

  // one tile drawn into rect R (FLIP: the tile's own TW x TH layout, scaled)
  function drawTile(ctx, P, i, R, q, u, g) {
    const k = R.w / TW;
    ctx.save();
    if (g > 0.01) { ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 80 * g; ctx.shadowOffsetY = 30 * g; }
    rr(ctx, R.x, R.y, R.w, R.h, 24 * Math.max(0.5, k)); ctx.fillStyle = mix(P.surface, P.bg2 || P.bg, 0.25); ctx.fill();
    ctx.restore();
    ctx.save();
    rr(ctx, R.x, R.y, R.w, R.h, 24 * Math.max(0.5, k)); ctx.clip();
    ctx.translate(R.x, R.y); ctx.scale(k, k);
    ctx.fillStyle = radial(ctx, TW * 0.3, 0, 0, TW, [[0, rgba(P.accent, 0.08)], [1, rgba(P.accent, 0)]]); ctx.fillRect(0, 0, TW, TH);
    DRAW[i](ctx, P, q, u);
    ctx.restore();
    ctx.save(); rr(ctx, R.x + 1, R.y + 1, R.w - 2, R.h - 2, 24 * Math.max(0.5, k));
    ctx.strokeStyle = g > 0.01 ? rgba(P.accent, 0.5 + 0.5 * g) : rgba(P.ink, 0.12); ctx.lineWidth = 2 + 2 * g; ctx.stroke(); ctx.restore();
  }

  SCENES['carriers'] = {
    draw(ctx, t, env) {
      const P = env.palette, L = KIT.loop(env), u = L.u;
      KIT.stage(ctx, P);
      const st = TILES.map((_, i) => { const tn = turn(i, u); return { ...tn, g: grow(tn.tau) }; });
      const focus = st.reduce((a, s, i) => (s.g > st[a].g ? i : a), 0), gMax = st[focus].g;
      // the grid: every cell keeps its own idle life; numbers and labels at reading size
      for (let i = 0; i < 6; i++) {
        const c = cellOf(i);
        drawTile(ctx, P, i, c, -1, u, 0);
        text(ctx, String(i + 1).padStart(2, '0'), c.x, c.y + CH + 50, { size: 34, weight: 700, fam: 'mono', color: P.accent });
        text(ctx, TILES[i].label, c.x + 62, c.y + CH + 50, { size: 34, weight: 700, fam: 'display', color: P.ink2 });
      }
      // the grid dims under the expanded tile
      ctx.fillStyle = rgba(P.bg, 0.5 + 0.12 * clamp(gMax)); ctx.fillRect(0, 0, W, H);   // the grid is the background layer
      KIT.header(ctx, P, { index: '02', label: 'VISUAL CARRIERS' });
      // expanded tiles (two overlap for a moment while one returns and the next grows)
      const order = st.map((s, i) => [s.g, i]).filter(([g]) => g > 0.001).sort((a, b) => a[0] - b[0]);
      for (const [g, i] of order) {
        const R = lerpR(cellOf(i), BIG, g);
        drawTile(ctx, P, i, R, st[i].q, u, clamp(g));
        // the tile's name and tool, on a scrim at the bottom of the expanded tile
        const la = clamp((g - 0.55) / 0.3);
        if (la > 0) {
          ctx.save(); ctx.globalAlpha *= la;
          rr(ctx, R.x, R.y + R.h - 120, R.w, 120, 0);
          ctx.save(); ctx.beginPath(); ctx.roundRect(R.x, R.y + R.h - 130, R.w, 130, [0, 0, 24, 24]); ctx.clip();
          ctx.fillStyle = linear(ctx, 0, R.y + R.h - 130, 0, R.y + R.h, [[0, rgba(P.bg, 0)], [0.45, rgba(P.bg, 0.86)], [1, rgba(P.bg, 0.94)]]);
          ctx.fillRect(R.x, R.y + R.h - 130, R.w, 130); ctx.restore();
          const nw = measure(ctx, String(i + 1).padStart(2, '0') + '  ', { size: 54, weight: 700, fam: 'mono' });
          text(ctx, String(i + 1).padStart(2, '0'), R.x + 40, R.y + R.h - 38, { size: 54, weight: 700, fam: 'mono', color: P.accent });
          text(ctx, TILES[i].label, R.x + 40 + nw, R.y + R.h - 38, { size: 58, weight: 700, fam: 'display', color: KIT.bright() });
          text(ctx, TILES[i].tool, R.x + R.w - 40, R.y + R.h - 42, { size: 38, weight: 600, fam: 'mono', color: P.ink2, align: 'right' });
          ctx.restore();
        }
      }
    },
  };
})();
