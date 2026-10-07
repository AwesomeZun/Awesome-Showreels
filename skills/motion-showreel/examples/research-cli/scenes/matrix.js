// matrix (hook, 2 bars in every cut): the 64k-token attention matrix as 4,096 points, one per 1,024-token block.
// The spark pattern (README: a band of 7 blocks around the diagonal + 2 global blocks) is computed here, not drawn
// by hand: 674 blocks light up (band cyan, global amber), the other 3,422 sink away, and the number counts down in
// step with the sinking blocks. All copy numbers come from the computed mask. Every animation is a function of
// env.lt only, so the scene is identical in every cut.
(() => {
  const N = 64, HALF = 3, GLOBAL = 2;
  const kept = (i, j) => Math.abs(i - j) <= HALF || i < GLOBAL || j < GLOBAL;
  const B = 60 / 128;                                        // fallback beat (the plan's beat is used when present)
  let G = null;                                              // GPU handles + CPU tables, built once per page

  function build(P) {
    const keepIdx = [], skipIdx = [];
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) (kept(i, j) ? keepIdx : skipIdx).push([i, j]);
    const pos = ([i, j]) => [(j - 31.5) / 32, 0, (i - 31.5) / 32];
    // skipped blocks: sink below the plane when the pattern applies; far from the band first
    const sP = new Float32Array(skipIdx.length * 3), sM = new Float32Array(skipIdx.length * 3), sSeed = new Float32Array(skipIdx.length);
    skipIdx.forEach((b, k) => {
      const [x, y, z] = pos(b), d = Math.abs(b[0] - b[1]) / 63;
      sP.set([x, y, z], k * 3);
      sM.set([x * 1.04, -0.55 - hash(k * 1.7) * 0.5, z * 1.04], k * 3);
      sSeed[k] = clamp(1 - d + (hash(k * 3.3) - 0.5) * 0.12);   // far from the band -> small seed -> moves first
    });
    const kP = new Float32Array(keepIdx.length * 3);
    keepIdx.forEach((b, k) => kP.set(pos(b), k * 3));
    const isGlobal = keepIdx.map(([i, j]) => i < GLOBAL || j < GLOBAL);
    const skip = GL.cloud(sP, { colors: ['#33445F', '#3A4D6B', '#2C3B55'], sizes: [6.5, 8], seeds: sSeed, morph: sM });
    const keep = GL.cloud(kP, { colors: (i) => (isGlobal[i] ? P.accent3 : P.accent), sizes: [9.5, 11] });
    const keepDim = GL.cloud(kP, { colors: '#3A4D6B', sizes: [6.5, 8] });
    // lighting order: distance from the near corner (block 63, 63) -> the band lights up running away from the camera
    const near = [1, 0, 1];
    const dist = keepIdx.map((b) => { const [x, , z] = pos(b); return Math.hypot(x - near[0], z - near[2]); }).sort((a, b) => a - b);
    const diag = [];
    for (let i = 0; i < N; i++) diag.push(pos([i, i]));
    const band = GL.path(diag.reverse(), { colors: P.accent });
    const c = 1.0;
    const outline = GL.lines([[[-c, 0, -c], [c, 0, -c]], [[c, 0, -c], [c, 0, c]], [[c, 0, c], [-c, 0, c]], [[-c, 0, c], [-c, 0, -c]]], { colors: P.ink2 });
    const scan = GL.lines([[[-1.0, 0, 0], [1.0, 0, 0]]], { colors: P.accent });
    return { skip, keep, keepDim, dist, near, band, outline, scan, seeds: sSeed, total: N * N, nKeep: keepIdx.length, nSkip: skipIdx.length };
  }

  function kicker(ctx, s, x, y, p, t, color) {
    if (p <= 0) return;
    const shown = scramble(s, p, 3, t);
    ctx.save();
    ctx.globalAlpha *= Math.min(1, p * 3);
    ctx.fillStyle = color; ctx.fillRect(x, y - 7, 26 * Ease.outExpo(p), 2);
    text(ctx, shown, x + 40, y, { size: 17, weight: 600, fam: 'mono', color, ls: 17 * 0.18 });
    ctx.restore();
  }

  // Number with fixed digit slots (no jitter while it counts), left-aligned at x. Returns the width; o.measure only
  // measures.
  function tabNum(ctx, v, x, y, o) {
    const str = Math.round(v).toLocaleString('en-US');
    ctx.save();
    ctx.font = font(o.size, o.weight, o.fam);
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'center';
    let dw = 0;
    for (let d = 0; d < 10; d++) dw = Math.max(dw, ctx.measureText(String(d)).width);
    dw *= o.tight ?? 0.92;
    if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowBlur || 30; }
    ctx.fillStyle = o.color;
    let cx = x;
    for (const ch of str) {
      const w = /\d/.test(ch) ? dw : ctx.measureText(ch).width * 0.86;
      if (!o.measure) ctx.fillText(ch, cx + w / 2, y);
      cx += w;
    }
    ctx.restore();
    return cx - x;
  }
  const fmt = (n) => n.toLocaleString('en-US');

  SCENES['matrix'] = {
    draw(ctx, t, env) {
      const P = env.palette, lt = env.lt, beat = env.beatSec || B;
      const b = (n) => n * beat;
      if (!G) G = build(P);

      // ── stage: deep navy, a faint glow where the matrix sits, a blueprint grid that drifts very slowly
      ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
      softBlob(ctx, 1260, 520, 760, rgba(P.accent, 0.07));
      softBlob(ctx, 420, 760, 620, rgba(P.accent2, 0.05));
      ctx.save();
      ctx.strokeStyle = rgba(P.ink, 0.035); ctx.lineWidth = 1;
      const off = (lt * 6) % 60;
      ctx.beginPath();
      for (let x = -60 + off; x < W + 60; x += 60) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
      for (let y = 0; y < H; y += 60) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
      ctx.stroke();
      ctx.restore();

      // ── camera: top-down (reads as a matrix) -> low orbit (reads as depth); push in over the out-phase
      const cm = Ease.ioC(rm(lt, 0, b(7)));
      const push = Ease.inC(env.phase.out);
      const cam = GL.camera({
        target: [0, 0, 0], yaw: lerp(-0.08, 0.4, cm), pitch: lerp(1.25, 0.9, cm),
        dist: lerp(4.85, 4.75, cm) - 0.9 * push, fov: 0.6, shiftX: lerp(0.36, 0.42, cm), shiftY: lerp(0.14, 0.17, cm),
      });

      // ── the pattern applies from beat 3: skipped blocks sink (far from the band first), kept blocks light up
      const fadeIn = lerp(0.45, 1, Ease.outC(rm(lt, 0, b(0.6))));      // frame 0 already shows the matrix arriving
      const sp = rm(lt, b(2.9), b(5.4));                       // 0..1 sparsify progress (linear: the count spreads evenly)
      const reach = lerp(0, 2.95, Ease.ioC(rm(lt, b(3), b(5))));   // lighting radius from the near corner (world units)
      GL.begin({ exposure: 1.3 });
      const rin = lerp(0.85, 3.2, Ease.outC(rm(lt, 0, b(1.4))));         // dense matrix appears from the top-left corner
      const R0 = [-1, 0, -1, rin];
      GL.drawCloud(G.skip, { cam, morph: sp, swirl: 0.08, stagger: 0.85, alpha: fadeIn * lerp(1, 0.16, Ease.inQ(sp)),
        time: lt, twinkle: 0.25, soft: 0.6, reveal: R0, revealSoft: 0.5 });
      GL.drawCloud(G.keepDim, { cam, alpha: fadeIn * (1 - Ease.inQ(rm(lt, b(3), b(5.4)))), time: lt, twinkle: 0.25, soft: 0.6,
        reveal: R0, revealSoft: 0.5 });
      if (reach > 0) {
        GL.drawCloud(G.keep, { cam, time: lt, twinkle: 0.12, soft: 0.85, alpha: 1.15, size: 1 + 0.12 * beatPulse(env, 6, 4),
          reveal: [G.near[0], 0, G.near[2], reach], revealSoft: 0.22 });
      }
      // dense phase: one query row at a time attends to every key block (a scan line sweeps the rows)
      const sc = rm(lt, b(1), b(3));
      if (sc > 0 && sc < 1) {
        const z = lerp(-1, 1, Ease.ioQ(sc)), a = Math.sin(Math.PI * sc);
        GL.drawLines(G.scan, { cam, width: 2.5, glow: 0.8, alpha: 0.9 * a, time: lt, model: GL.M4.T(0, 0.002, z) });
        GL.drawLines(G.scan, { cam, width: 22, glow: 1, alpha: 0.18 * a, time: lt, model: GL.M4.T(0, 0.002, z) });
      }
      // the matrix bounds stay as a hairline once the dense blocks are gone
      const ol = Ease.outC(rm(lt, b(3.4), b(5)));
      if (ol > 0) GL.drawLines(G.outline, { cam, width: 1.2, glow: 0.3, alpha: 0.28 * ol, time: lt });
      // light running along the band once it is lit; pulses travel away from the camera
      const runA = Ease.outC(rm(lt, b(4.2), b(6)));
      if (runA > 0) {
        GL.drawLines(G.band, { cam, width: 26, glow: 1, alpha: 0.16 * runA, time: lt });
        GL.drawLines(G.band, { cam, width: 3, glow: 0.7, alpha: 0.55 * runA, time: lt,
          pulse: { amount: 1.6, speed: 0.55, width: 0.05, color: '#FFFFFF' } });
      }
      GL.blit(ctx);

      // pattern callouts anchored on the 3D blocks (the README's definition, in its words)
      const outA = 1 - Ease.inC(env.phase.out);
      const blk = (i, j) => GL.project(cam, [(j - 31.5) / 32, 0, (i - 31.5) / 32]);
      const [bx, by] = blk(30, 30), [gx, gy] = blk(38, 0);          // band mid-way; the global column (left edge)
      callout(ctx, bx, by, rm(lt, b(5.4), b(6.4)), { label: 'BAND · 7 BLOCKS', sub: 'local window', dx: 1, dy: -1, len: 120,
        color: P.accent, labelColor: P.ink, size: 18, t: lt, seed: 3, alpha: outA, fam: 'mono' });
      callout(ctx, gx, gy, rm(lt, b(5.9), b(6.9)), { label: 'GLOBAL · 2 BLOCKS', sub: 'every row and column', dx: 1, dy: 1, len: 110,
        color: P.accent3, labelColor: P.ink, size: 18, t: lt, seed: 9, alpha: outA, fam: 'mono' });

      // ── type: left column; legibility gradient behind it
      ctx.save();
      ctx.fillStyle = linear(ctx, 0, 0, 900, 0, [[0, rgba(P.bg, 0.86)], [0.62, rgba(P.bg, 0.5)], [1, rgba(P.bg, 0)]]);
      ctx.fillRect(0, 0, 900, H);
      ctx.restore();
      const out = Ease.inC(env.phase.out);
      ctx.save();
      ctx.globalAlpha *= 1 - out;
      ctx.translate(-40 * out, 0);
      kicker(ctx, 'ATTENTION · 64K TOKENS · 1,024-TOKEN BLOCKS', 140, 352, rm(lt, b(0.5), b(1.6)), lt, P.accent);

      // number: the blocks a 64k attention computes. Dense: all 4,096. As the pattern applies, the count drops in step
      // with the skipped blocks that have sunk (same stagger formula as the GPU morph), down to exactly 674.
      const X = 136, Y = 566, S = 176, NUM = { size: S, weight: 700, fam: 'display', color: P.ink, glow: rgba(P.accent, 0.3), glowBlur: 44 };
      let fallen = 0;
      if (sp > 0) for (let k = 0; k < G.seeds.length; k++) if (sp * 1.85 - 0.85 * G.seeds[k] > 0.5) fallen++;
      if (lt < b(1.4)) kinetic(ctx, fmt(G.total), X, Y, lt - b(1), { ...NUM, stagger: 0.035, rise: 46, blur: 12 });
      else tabNum(ctx, G.total - fallen, X, Y, NUM);
      const lab = rm(lt, b(2.8), b(3.2));
      withAlpha(ctx, rm(lt, b(1.4), b(2)) * (1 - lab), () =>
        text(ctx, 'BLOCKS COMPUTED · DENSE', X + 6, Y + 62, { size: 20, weight: 600, fam: 'mono', color: P.ink2, ls: 20 * 0.14 }));
      withAlpha(ctx, lab, () =>
        text(ctx, 'BLOCKS COMPUTED · SPARK PATTERN', X + 6, Y + 62, { size: 20, weight: 600, fam: 'mono', color: P.accent, ls: 20 * 0.14 }));
      const k2 = rm(lt, b(5.1), b(5.7));
      if (k2 > 0) {
        const nw = tabNum(ctx, G.nKeep, X, Y, { ...NUM, measure: true });
        revealLine(ctx, 'of ' + fmt(G.total), X + nw + 22, Y - 6, k2, { size: 54, weight: 500, fam: 'display', color: P.ink2 });
      }
      const k3 = rm(lt, b(5.6), b(6.3));
      if (k3 > 0) {
        const rk = Ease.outC(rm(lt, b(5.6), b(6.8))), frac = G.nKeep / G.total;
        donut(ctx, X + 22, Y + 118, 15, frac * rk, { lw: 5, color: P.accent, track: rgba(P.ink, 0.14), glow: true });
        revealLine(ctx, `${(frac * 100).toFixed(1)}% computed · ${fmt(G.nSkip)} blocks never touched`, X + 50, Y + 127, k3,
          { size: 25, weight: 500, fam: 'sans', color: P.ink2 });
      }
      ctx.restore();
    },
  };
})();
