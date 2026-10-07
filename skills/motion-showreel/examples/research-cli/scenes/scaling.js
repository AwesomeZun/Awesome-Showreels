// scaling (optional; the 60-s cut): why the gain grows with length. The README's pattern (band 7 + 2 global, 1,024-
// token blocks) is computed at all four lengths of the demo run: 4k is 4x4 blocks and keeps every one, 64k keeps 674
// of 4,096. Four matrices light up their pattern side by side while the computed share counts down, and spark's
// throughput vs dense (assets/data/results.json, DEMO DATA) pops under each one. Hold: a focus walks the lengths on
// every bar line; inside the focused matrix a query band reads the pattern row by row across the bar while its kept
// blocks pulse on the beat; a rule grows under the four gains and a pulse runs along it once per bar. Everything is a
// function of env.lt.
(() => {
  const B = 60 / 128;
  const HALF = 3, GLOBAL = 2, BLOCK = 1024;
  const kept = (i, j) => Math.abs(i - j) <= HALF || i < GLOBAL || j < GLOBAL;
  const LENS = [['4k', 4096], ['16k', 16384], ['32k', 32768], ['64k', 65536]];
  const SIZE = 280, TOP = 236, XS = [250, 650, 1050, 1450];          // panel left edges (clear of the HUD border)
  const M = LENS.map(([name, tok]) => {
    const n = tok / BLOCK;
    let keep = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (kept(i, j)) keep++;
    return { name, n, keep, share: keep / (n * n) };
  });
  const CELLS = {};                                                  // per-panel baked cell layers (static images)

  function kicker(ctx, s, x, y, p, t, color) {
    if (p <= 0) return;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, p * 3);
    ctx.fillStyle = color; ctx.fillRect(x, y - 7, 26 * Ease.outExpo(p), 2);
    text(ctx, scramble(s, p, 37, t), x + 40, y, { size: 17, weight: 600, fam: 'mono', color, ls: 17 * 0.18 });
    ctx.restore();
  }
  function demoChip(ctx, x, y, a, P) {
    if (a <= 0) return 0;
    const s = 'DEMO DATA', size = 14, w = measure(ctx, s, { size, weight: 600, fam: 'mono', ls: size * 0.12 }) + 22;
    ctx.save(); ctx.globalAlpha *= a;
    rr(ctx, x, y - 13, w, 26, 13); ctx.strokeStyle = rgba(P.warn, 0.55); ctx.lineWidth = 1.2; ctx.stroke();
    text(ctx, s, x + 11, y + 5, { size, weight: 600, fam: 'mono', color: P.warn, ls: size * 0.12 });
    ctx.restore();
    return w;
  }
  // Two baked layers per panel: every block dim (dense), and the pattern lit (band cyan, global amber).
  function cells(P, k) {
    if (CELLS[k]) return CELLS[k];
    const { n } = M[k], gap = n >= 32 ? 0.6 : n >= 16 ? 1.5 : 6, c = (SIZE - gap * (n - 1)) / n;
    const mk = (fill) => {
      const b = makeBuf(SIZE, SIZE), g = b.g;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const col = fill(i, j);
        if (!col) continue;
        g.fillStyle = col; g.fillRect(j * (c + gap), i * (c + gap), c, c);
      }
      return b.c;
    };
    const dense = mk(() => '#2E3D57');
    const lit = mk((i, j) => (!kept(i, j) ? null : i < GLOBAL || j < GLOBAL ? P.accent3 : P.accent));
    const skip = mk((i, j) => (kept(i, j) ? null : '#1A2333'));
    return (CELLS[k] = { dense, lit, skip, c, gap });
  }

  SCENES['scaling'] = {
    draw(ctx, t, env) {
      const P = env.palette, lt = env.lt, beat = env.beatSec || B, ph = env.phase;
      const b = (x) => x * beat;
      const D = ASSET('data/results.json');
      const out = Ease.inC(ph.out);

      // ── stage: the shared look (bg, soft glows, drifting blueprint grid)
      ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
      softBlob(ctx, 1500, 420, 760, rgba(P.accent, 0.06));
      softBlob(ctx, 280, 860, 620, rgba(P.accent3, 0.04));
      ctx.save();
      ctx.strokeStyle = rgba(P.ink, 0.035); ctx.lineWidth = 1;
      const off = (lt * 6) % 60;
      ctx.beginPath();
      for (let x = -60 + off; x < W + 60; x += 60) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
      for (let y = 0; y < H; y += 60) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha *= 1 - out;
      ctx.translate(-50 * out, 0);
      const ktxt = 'WHY THE GAIN GROWS · THE SAME PATTERN AT FOUR LENGTHS';
      kicker(ctx, ktxt, 140, 176, rm(lt, -b(0.4), b(0.8)), lt, P.accent);
      demoChip(ctx, 140 + 40 + measure(ctx, ktxt, { size: 17, weight: 600, fam: 'mono', ls: 17 * 0.18 }) + 24, 170, rm(lt, b(0.6), b(1.1)), P);

      // hold: one length takes focus per bar line (left to right, then again)
      const hd = ph.hold;
      let focus = -1, fk = 0, fdt = 0;
      if (hd > 0) onBars(env, 1, (i, dt) => { focus = i % 4; fk = Ease.outC(clamp(dt / 0.35)); fdt = dt; });
      const bp = hd > 0 ? beatPulse(env, 5) : 0;                       // kept blocks of the focused matrix pulse on the beat
      const sk = Ease.ioC(rm(lt, b(2.4), b(4)));                          // the pattern applies
      M.forEach((m, k) => {
        const x = XS[k], cl = cells(P, k), ap = Ease.outExpo(rm(lt, b(0.5 + 0.5 * k), b(1.5 + 0.5 * k)));
        if (ap <= 0) return;
        const on = focus === k ? fk : focus >= 0 ? -0.35 * fk : 0;     // focused panel lifts, the others step back
        ctx.save();
        ctx.globalAlpha *= ap * (1 + Math.min(0, on));
        ctx.translate(x + SIZE / 2, TOP + SIZE / 2 + (1 - ap) * 40 - 10 * Math.max(0, on));
        ctx.scale(1 + 0.03 * Math.max(0, on), 1 + 0.03 * Math.max(0, on));
        ctx.translate(-SIZE / 2, -SIZE / 2);
        // frame + cells: dense first, then the skipped blocks go dark and the kept ones light up
        rr(ctx, -14, -14, SIZE + 28, SIZE + 28, 12); ctx.fillStyle = rgba(P.surface, 0.7); ctx.fill();
        ctx.strokeStyle = rgba(focus === k ? P.accent : P.ink, focus === k ? 0.35 + 0.4 * fk : 0.1); ctx.lineWidth = 1.5; ctx.stroke();
        ctx.drawImage(cl.dense, 0, 0);
        withAlpha(ctx, sk, () => ctx.drawImage(cl.skip, 0, 0));
        ctx.save();
        const glow = focus === k ? 14 + 22 * bp : 14;
        if (sk > 0) { ctx.shadowColor = rgba(P.accent, 0.6 + (focus === k ? 0.3 * bp : 0)); ctx.shadowBlur = glow * sk; }
        withAlpha(ctx, sk, () => ctx.drawImage(cl.lit, 0, 0));
        ctx.restore();
        // focus: a query band reads the matrix row by row across the bar (the same rows the pattern keeps light up)
        if (focus === k) {
          const q = clamp(fdt / (env.barSec * 0.94));
          if (q < 1) {
            const sy = lerp(-10, SIZE + 10, q), band = 46;
            ctx.save();
            ctx.fillStyle = linear(ctx, 0, sy - band, 0, sy, [[0, rgba(P.accent, 0)], [1, rgba(P.accent, 0.3)]]);
            ctx.fillRect(0, Math.max(0, sy - band), SIZE, Math.max(0, Math.min(band, sy) - Math.max(0, sy - SIZE)));
            if (sy >= 0 && sy <= SIZE) { ctx.globalAlpha *= 0.85; ctx.fillStyle = rgba('#FFFFFF', 0.75); ctx.fillRect(0, sy - 1, SIZE, 2); }
            ctx.restore();
          }
        }
        ctx.restore();
        // labels under the panel: length, computed share (counts down as the pattern applies), spark vs dense
        const cx = x + SIZE / 2, la = ap * (1 + 0.6 * Math.min(0, on));
        text(ctx, m.name, cx, TOP + SIZE + 50, { size: 28, weight: 600, fam: 'mono', color: P.ink, align: 'center', alpha: la });
        text(ctx, `${m.n}×${m.n} blocks`, cx, TOP + SIZE + 76, { size: 15, weight: 500, fam: 'mono', color: P.muted, align: 'center', alpha: la });
        const share = lerp(1, m.share, sk) * 100;
        text(ctx, share.toFixed(share >= 99.95 ? 0 : 1) + '%', cx, TOP + SIZE + 130, { size: 46, weight: 700, fam: 'display', color: P.ink, align: 'center', alpha: la });
        text(ctx, 'computed', cx, TOP + SIZE + 154, { size: 15, weight: 500, fam: 'mono', color: P.muted, align: 'center', alpha: la * rm(lt, b(2), b(2.6)) });
        if (D) {
          const g = D.kernels.spark.relative[m.name], pv = rm(lt, b(4 + 0.25 * k), b(4 + 0.25 * k) + 0.22);
          if (pv > 0) {
            const sc = 1 + 0.25 * (1 - Ease.outBack(pv, 2.2));
            ctx.save(); ctx.globalAlpha *= la * Math.min(1, pv * 2);
            ctx.translate(cx, TOP + SIZE + 214); ctx.scale(sc, sc);
            text(ctx, g.toFixed(1) + '×', 0, 0, { size: 42, weight: 700, fam: 'display', color: P.accent, align: 'center', glow: rgba(P.accent, 0.4), glowBlur: 16 });
            ctx.restore();
            text(ctx, 'spark vs dense', cx, TOP + SIZE + 240, { size: 15, weight: 500, fam: 'mono', color: P.muted, align: 'center', alpha: la * pv });
          }
        }
      });
      // hold bar 1: a rule grows under the four gains, left to right (dim at 4k, bright at 64k)
      const tr = Ease.ioC(rm(hd, 0, b(2)));
      if (tr > 0) {
        const x0 = XS[0] + SIZE / 2 - 60, x1 = XS[3] + SIZE / 2 + 60, y = TOP + SIZE + 258, xe = lerp(x0, x1, tr);
        ctx.save();
        ctx.fillStyle = linear(ctx, x0, 0, x1, 0, [[0, rgba(P.accent, 0.15)], [1, rgba(P.accent, 0.95)]]);
        rr(ctx, x0, y - 1.5, xe - x0, 3, 1.5); ctx.fill();
        softBlob(ctx, xe, y, 26, P.accent, 0.7);
        circle(ctx, xe, y, 4.5); ctx.fillStyle = '#FFFFFF'; ctx.fill();
        // once the rule is drawn, a pulse runs along it on every bar line (4k to 64k: the gain grows)
        if (tr >= 1) onBars(env, 1, (i, dt) => {
          const u = clamp(dt / (env.barSec * 0.8));
          if (u > 0 && u < 1) { const xp = lerp(x0, x1, Ease.ioC(u)); softBlob(ctx, xp, y, 34 + 20 * u, P.accent, 0.55 * Math.sin(Math.PI * u)); circle(ctx, xp, y, 3.5); ctx.fillStyle = rgba('#FFFFFF', Math.sin(Math.PI * u)); ctx.fill(); }
        });
        ctx.restore();
      }
      // the README's own sentence
      kinetic(ctx, 'The gain grows with length.', 140, 840, lt - b(5.25), { size: 46, weight: 700, fam: 'display', stagger: 0.014, rise: 22,
        colorFn: (i) => (i >= 4 && i < 8 ? P.accent : P.ink) });
      ctx.restore();
    },
  };
})();
