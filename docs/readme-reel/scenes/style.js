// style (feat-style.webp): the style follows the source. One pipeline reads two sources, and the whole slab takes on
// the style of the one it is reading: the source as the tone pass rendered it, what the pass measured in its text,
// the reviewed palette, face and tempo, the style board, and a frame of the reel. A diagonal wipe switches from the
// playful-app example (Mochi Notes, light) to the research-cli example (spark-bench, dark) and back. Every image is
// the example's own file (README renders by tools/source_snapshot.mjs, the style boards extract_style.py drew, reel
// stills rendered by the runtime); every swatch, face, BPM, spring and measured rate comes from the two reviewed
// style.json files and their extraction logs (assets/data/styles.json). Loop: 12 beats; frame 0 (the poster) is the
// finished Mochi pipeline.
(() => {
  const SIDES = [
    { key: 'mochi', name: 'Mochi Notes', src: 'ex/mochi-readme', board: 'ex/mochi-board', frame: 'ex/mochi-frame-5_5', light: true,
      stats: (m) => [[Math.round(m.emojiPer1k), 'emoji'], [Math.round(m.exclaimPer1k), '“!”']] },
    { key: 'spark', name: 'spark-bench', src: 'ex/spark-readme', board: 'ex/spark-board', frame: 'ex/spark-frame-19_5', light: false,
      stats: (m) => [[Math.round(m.numbersPer1k), 'numbers'], [Math.round(m.citationsPer1k), 'citations']] },
  ];
  const WIPE = 0.5, WIPES = [{ at: 1.5 - WIPE / 2, to: 1 }, { at: 4.5 - WIPE / 2, to: 0 }];   // centred on beats 3 and 9
  const SRC = { x: 96, y: 206, w: 744, h: 520 }, CARD = { x: 896, y: 206, w: 928, h: 522 };
  const spec = (k) => ((ASSET('data/styles.json') || {}).styles || {})[k];
  const cache = {};

  // the side on screen and the seconds since its wipe began (the incoming side's entrance clock)
  function sideAt(u) {
    if (u >= WIPES[0].at && u < WIPES[1].at) return { k: 1, tau: u - WIPES[0].at };
    return { k: 0, tau: u >= WIPES[1].at ? u - WIPES[1].at : u + 6 - WIPES[1].at };
  }
  function stageOf(k, S) {
    const key = 'stage' + k;
    if (!cache[key]) {
      const b = makeBuf(W, H), g = b.g, p = S.palette;
      g.fillStyle = p.bg; g.fillRect(0, 0, W, H);
      g.fillStyle = radial(g, W * 0.1, H * 0.05, 0, W * 0.6, [[0, rgba(p.accent, k ? 0.16 : 0.2)], [1, rgba(p.accent, 0)]]); g.fillRect(0, 0, W, H);
      g.fillStyle = radial(g, W * 0.95, H, 0, W * 0.55, [[0, rgba(p.accent2, k ? 0.14 : 0.18)], [1, rgba(p.accent2, 0)]]); g.fillRect(0, 0, W, H);
      const step = 40;
      for (let y = step / 2; y < H; y += step) for (let x = step / 2; x < W; x += step) { g.fillStyle = rgba(p.ink, 0.05); g.fillRect(x, y, 2, 2); }
      cache[key] = b.c;
    }
    return cache[key];
  }
  function card(ctx, x, y, w, h, light, o = {}) {
    ctx.save(); ctx.shadowColor = light ? 'rgba(70,48,61,0.22)' : 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 20;
    rr(ctx, x, y, w, h, 20); ctx.fillStyle = o.fill || (light ? '#FFFFFF' : '#131B2B'); ctx.fill(); ctx.restore();
    rr(ctx, x + 1, y + 1, w - 2, h - 2, 20); ctx.strokeStyle = o.stroke || (light ? 'rgba(70,48,61,0.12)' : 'rgba(232,238,247,0.14)'); ctx.lineWidth = 2; ctx.stroke();
  }

  // one side's full frame: tau = seconds since its wipe began (entrances), u = loop seconds (idle life)
  function drawSide(ctx, k, tau, u) {
    const S = spec(SIDES[k].key), D = SIDES[k];
    if (!S) return;
    const p = S.palette, light = D.light, ink = p.ink, sub = mix(p.ink, p.bg, 0.35);
    ctx.drawImage(stageOf(k, S), 0, 0);
    KIT.header(ctx, p, { index: '01', label: 'TONE & MANNER', light, ink, accent: p.accent, accent2: p.accent2, onAccent: light ? '#FFFFFF' : p.bg });
    const lab = (s, x, y) => text(ctx, s, x, y, { size: 32, weight: 700, fam: 'mono', color: sub, ls: 4.5 });

    // ── SOURCE: the README as the tone pass rendered it, a scan line measuring it once per bar
    lab('SOURCE', SRC.x, SRC.y - 22);
    card(ctx, SRC.x, SRC.y, SRC.w, SRC.h, light);
    KIT.image(ctx, D.src, SRC.x + 10, SRC.y + 10, SRC.w - 20, SRC.h - 20, { r: 12, ay: 0 });
    const sc = ((u % 2) + 2) % 2 / 2;                                 // one pass per bar, at a steady speed
    {
      const y = SRC.y + 10 + (SRC.h - 20) * sc, a = clamp(Math.min(sc, 1 - sc) / 0.08);
      ctx.save(); rr(ctx, SRC.x + 10, SRC.y + 10, SRC.w - 20, SRC.h - 20, 12); ctx.clip(); ctx.globalAlpha *= a;
      ctx.fillStyle = linear(ctx, 0, y - 70, 0, y, [[0, rgba(p.accent, 0)], [1, rgba(p.accent, 0.35)]]); ctx.fillRect(SRC.x, y - 70, SRC.w, 70);
      ctx.fillStyle = p.accent; ctx.shadowColor = p.accent; ctx.shadowBlur = 20; ctx.fillRect(SRC.x, y - 2, SRC.w, 4); ctx.restore();
    }
    // ── MEASURED: two rates from the source text, counting up after the wipe
    const m = S.metrics ? D.stats(S.metrics) : [];
    const bt = 60 / S.sound.bpm, bp = tau > 1.2 ? Math.exp(-((((u % bt) + bt) % bt)) * 9) : 0;   // the source's own beat
    m.forEach(([v, label], i) => {
      const x = SRC.x + i * 300, y = 862, e = Ease.outC(clamp((tau - 0.45 - i * 0.12) / 0.6)), b = 1 + 0.05 * bp * (i ? 0.6 : 1);
      ctx.save(); ctx.translate(x, y); ctx.scale(b, b);
      text(ctx, String(Math.round(v * e)), 0, 0, { size: 112, weight: 800, fam: light ? '"Nunito"' : 'display', color: i ? ink : p.accent, ls: -2 });
      ctx.restore();
      text(ctx, label, x + 4, y + 52, { size: 34, weight: 700, fam: 'mono', color: ink });
    });
    if (m.length) text(ctx, 'per 1,000 words of source text', SRC.x + 4, 1004, { size: 32, weight: 600, fam: 'mono', color: sub });

    // ── STYLE BOARD, then a card flip to the REEL FRAME the style produced
    const boardIn = Ease.outBack(clamp((tau - 0.45) / 0.4), 1.2), f = Ease.ioC(clamp((tau - 0.95) / 0.35));
    const showFrame = f >= 0.5, flipX = Math.max(0.02, Math.abs(Math.cos(Math.PI * f)));
    lab(showFrame ? 'REEL FRAME' : 'STYLE BOARD', CARD.x, CARD.y - 22);
    const z = 1.03 + 0.025 * Math.sin(TAU * u / 6) + (tau > 1.3 ? 0.06 * Math.exp(-(tau - 1.3) * 7) : 0);
    ctx.save();
    ctx.translate(CARD.x + CARD.w / 2, CARD.y + CARD.h / 2 + (showFrame ? 0 : (1 - boardIn) * 70)); ctx.scale(flipX, 1);
    ctx.globalAlpha *= showFrame ? 1 : clamp(boardIn * 1.5);
    card(ctx, -CARD.w / 2, -CARD.h / 2, CARD.w, CARD.h, light);
    ctx.save(); rr(ctx, -CARD.w / 2 + 8, -CARD.h / 2 + 8, CARD.w - 16, CARD.h - 16, 12); ctx.clip();
    if (showFrame) ctx.scale(z, z);
    KIT.image(ctx, showFrame ? D.frame : D.board, -CARD.w / 2 + 8, -CARD.h / 2 + 8, CARD.w - 16, CARD.h - 16, { r: 0, ay: 0.5 });
    ctx.restore(); ctx.restore();

    // ── the reviewed spec: palette, face, tempo
    const roles = ['bg', 'ink', 'accent', 'accent2', 'accent3'], sy = 800, sz = 92;
    roles.forEach((r, i) => {
      const e = Ease.outBack(clamp((tau - 0.5 - i * 0.07) / 0.35), 1.6), x = CARD.x + i * (sz + 14);
      if (e <= 0.001) return;
      ctx.save(); ctx.translate(x + sz / 2, sy + sz / 2); ctx.scale(e, e);
      rr(ctx, -sz / 2, -sz / 2, sz, sz, 16); ctx.fillStyle = p[r]; ctx.fill();
      ctx.strokeStyle = light ? 'rgba(70,48,61,0.35)' : 'rgba(232,238,247,0.35)'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    });
    const ty = Ease.outC(clamp((tau - 0.65) / 0.4));
    withAlpha(ctx, ty, () => {
      ctx.save(); ctx.translate(CARD.x, 1004 + 30 * (1 - ty)); ctx.scale(1 + 0.05 * bp, 1 + 0.05 * bp);
      text(ctx, 'Aa', 0, 0, { size: 120, weight: S.displayWeight, fam: `"${S.display}"`, color: p.accent }); ctx.restore();
      text(ctx, S.display, CARD.x + 170, 968 + 30 * (1 - ty), { size: 44, weight: 700, fam: `"${S.display}"`, color: ink });
      text(ctx, `${S.motion.ease} · ${S.motion.spring.z < 0.6 ? 'springy' : 'damped'}`, CARD.x + 172, 1012 + 30 * (1 - ty), { size: 32, weight: 600, fam: 'mono', color: sub });
    });
    // tempo: the BPM rolls in, then pulses on the source's own beat
    const bx = CARD.x + CARD.w, bpm = S.sound.bpm, be = Ease.outC(clamp((tau - 0.7) / 0.45));
    const pulse = bp;
    ctx.save(); ctx.translate(bx - 120, 900); ctx.scale(1 + 0.07 * pulse, 1 + 0.07 * pulse);
    text(ctx, String(Math.round(lerp(k ? 120 : 128, bpm, be))), 0, 0, { size: 128, weight: 800, fam: light ? '"Nunito"' : 'display', color: ink, align: 'right', ls: -3 });
    ctx.restore();
    text(ctx, 'BPM', bx, 900, { size: 40, weight: 700, fam: 'mono', color: p.accent, align: 'right' });
    text(ctx, `${S.sound.preset} · ${S.sound.key} ${S.sound.mode}`, bx, 960, { size: 32, weight: 600, fam: 'mono', color: sub, align: 'right' });
  }

  SCENES['style'] = {
    draw(ctx, t, env) {
      const L = KIT.loop(env), u = L.u;
      const st = sideAt(u);
      if (st.tau >= WIPE) { drawSide(ctx, st.k, st.tau, u); return; }
      // the wipe: the outgoing side in full, the incoming one revealed behind a diagonal edge with a glow
      const out = 1 - st.k, outTau = st.tau + 3;
      drawSide(ctx, out, outTau, u);
      const q = st.tau / WIPE, e = 0.75 * q + 0.25 * Ease.ioC(q), slant = 420, x = lerp(-slant - 40, W + 40, e);
      ctx.save(); ctx.beginPath(); ctx.moveTo(-10, -10); ctx.lineTo(x + slant, -10); ctx.lineTo(x, H + 10); ctx.lineTo(-10, H + 10); ctx.closePath(); ctx.clip();
      drawSide(ctx, st.k, st.tau, u);
      ctx.restore();
      const S = spec(SIDES[st.k].key), c = S ? S.palette.accent : '#FFFFFF';
      ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = 8; ctx.shadowColor = c; ctx.shadowBlur = 40;
      ctx.beginPath(); ctx.moveTo(x + slant, -10); ctx.lineTo(x, H + 10); ctx.stroke(); ctx.restore();
    },
  };
})();
