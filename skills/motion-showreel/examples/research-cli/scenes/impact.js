// impact (the drop; 1 bar in the 15-s cut, 3 bars in the 30-s cut): the result lands. "4.1×" (spark vs dense at
// 64k tokens, from assets/data/results.json, DEMO DATA) slams on beat 0 while the compositor's impact transition
// punches the frame; computed blocks burst out of it; the p50 latency counts down from dense to spark (beats 1-3).
// Hold bar 1: the number moves up and the three kernels line up as a leaderboard; hold bar 2 (from its bar line, with
// the pop:3 cue): run-to-run spread per kernel, one row per quarter beat, and a scan over the winner across most of
// the bar (again on every later bar line in longer cuts). Behind everything the 674 computed blocks of the hook drift in 3D (dimmer
// under the leaderboard) and settle into a fixed pose over the out-phase, so the logo scene starts from the same
// picture.
(() => {
  const B = 60 / 128;
  const N = 64, HALF = 3, GLOBAL = 2;
  const kept = (i, j) => Math.abs(i - j) <= HALF || i < GLOBAL || j < GLOBAL;
  let G = null;

  function build(P) {
    const pts = [], glob = [];
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (kept(i, j)) { pts.push([(j - 31.5) / 32, 0, (i - 31.5) / 32]); glob.push(i < GLOBAL || j < GLOBAL); }
    const pos = new Float32Array(pts.length * 3);
    pts.forEach((p, k) => pos.set(p, k * 3));
    return { cloud: GL.cloud(pos, { colors: (i) => (glob[i] ? P.accent3 : P.accent), sizes: [7, 9] }), n: pts.length };
  }
  // the same camera the logo scene starts from (keep in sync with scenes/logo.js HANDOFF)
  const HANDOFF = { yaw: 0.78, pitch: 0.42, dist: 3.4, shiftX: 0.0, shiftY: 0.02 };

  function kicker(ctx, s, x, y, p, t, color) {
    if (p <= 0) return;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, p * 3);
    ctx.fillStyle = color; ctx.fillRect(x, y - 7, 26 * Ease.outExpo(p), 2);
    text(ctx, scramble(s, p, 17, t), x + 40, y, { size: 17, weight: 600, fam: 'mono', color, ls: 17 * 0.18 });
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

  SCENES['impact'] = {
    draw(ctx, t, env) {
      const P = env.palette, lt = env.lt, beat = env.beatSec || B, ph = env.phase;
      const b = (n) => n * beat;
      const D = ASSET('data/results.json');
      if (!G) G = build(P);
      const out = Ease.inC(ph.out);

      // ── stage + the computed blocks drifting behind; they settle into the hand-off pose on the out-phase
      ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
      softBlob(ctx, 620, 560, 700, rgba(P.accent, 0.1 + 0.08 * beatPulse(env, 5)));
      softBlob(ctx, 1500, 380, 620, rgba(P.accent2, 0.07));
      const drift = { yaw: 0.3 + lt * 0.11, pitch: 0.62 - 0.02 * lt, dist: 3.9, shiftX: 0.18, shiftY: 0.02 };
      const ho = Ease.ioC(ph.out);
      const cam = GL.camera({
        yaw: lerp(drift.yaw, HANDOFF.yaw, ho), pitch: lerp(drift.pitch, HANDOFF.pitch, ho), dist: lerp(drift.dist, HANDOFF.dist, ho),
        shiftX: lerp(drift.shiftX, HANDOFF.shiftX, ho), shiftY: lerp(drift.shiftY, HANDOFF.shiftY, ho), fov: 0.6,
      });
      // hold bar 1 moves the number up into a header; everything leaves on the out-phase
      const up = Ease.ioC(rm(ph.hold, 0, b(1)));
      const fade = 1 - out;
      GL.begin({ exposure: 1.25 });
      GL.drawCloud(G.cloud, { cam, time: lt, twinkle: 0.3, soft: 0.9,
        alpha: lerp(0.32 * (1 - 0.6 * up), 0.95, ho) + 0.25 * Math.exp(-lt * 3) });
      GL.blit(ctx);
      if (!D) return;

      const v = D.kernels.spark.relative['64k'], dense = D.kernels.dense.p50_ms, spark = D.kernels.spark.p50_ms;
      const big = v.toFixed(1) + '×';

      // ── blocks burst out of the number on the hit (deterministic shards, the hook's colours)
      const bt = lt;
      if (bt >= 0 && bt < 1.4) {
        ctx.save();
        const ga = ctx.globalAlpha;
        for (let i = 0; i < 46; i++) {
          const a = hash(i * 7.3) * TAU, sp = 380 + hash(i * 3.1) * 900, life = 0.6 + hash(i * 5.7) * 0.7;
          const k = bt / life;
          if (k >= 1) continue;
          const d = sp * (1 - Math.pow(1 - k, 2.2)) * 0.55, s = 5 + hash(i * 1.9) * 9;
          const x = 430 + Math.cos(a) * d * 1.25, y = 530 + Math.sin(a) * d * 0.85;
          ctx.globalAlpha = ga * (1 - k) * 0.9;
          ctx.fillStyle = i % 5 === 0 ? P.accent3 : i % 3 === 0 ? '#FFFFFF' : P.accent;
          ctx.save(); ctx.translate(x, y); ctx.rotate(k * (2 + hash(i) * 4)); ctx.fillRect(-s / 2, -s / 2, s, s); ctx.restore();
        }
        ctx.restore();
        for (let j = 0; j < 2; j++) {                              // two shockwave rings
          const k = rm(bt, j * 0.06, j * 0.06 + 0.42);
          if (k <= 0 || k >= 1) continue;
          ctx.save(); ctx.strokeStyle = rgba(j ? '#FFFFFF' : P.accent, 0.75 * Math.pow(1 - k, 1.5)); ctx.lineWidth = 5 * (1 - k) + 0.75;
          circle(ctx, 430, 530, 60 + 640 * Ease.outC(k)); ctx.stroke(); ctx.restore();
        }
      }

      // ── the number: slam on beat 0, glow breathes on the downbeats; moves up-left on hold bar 1
      const hp = clamp(lt / 0.26), sc = (1 + (1 - Ease.outExpo(hp)) * 0.55) * lerp(1, 0.42, up);
      const nx = 140, ny = lerp(640, 268, up);
      ctx.save();
      ctx.globalAlpha *= clamp(lt / 0.04) * fade;
      ctx.translate(nx, ny); ctx.scale(sc, sc);
      text(ctx, big, -8, 0, { size: 300, weight: 700, fam: 'display', color: P.ink, ls: -9,
        glow: rgba(P.accent, 0.5 + 0.3 * beatPulse(env, 4, 4)), glowBlur: 70 });
      ctx.restore();
      withAlpha(ctx, fade, () => {
        kicker(ctx, 'SPARK · 64K TOKENS · VS DENSE', lerp(140, 400, up), lerp(372, 238, up), rm(lt, b(0.25), b(1.1)), lt, P.accent);
        withAlpha(ctx, 1 - up, () => {
          revealLine(ctx, 'the dense throughput · median of 5 repeats', 146, 712, rm(lt, b(0.6), b(1.3)), { size: 32, weight: 500, fam: 'sans', color: P.ink2 });
          demoChip(ctx, 146, 768, rm(lt, b(1), b(1.5)), P);
        });
      });

      // ── latency panel (beats 1-3): p50 at 64k, dense vs spark, counting down
      const lp = Ease.outExpo(rm(lt, b(1), b(1.7)));
      if (lp > 0) {
        const px = 1160 + (1 - lp) * 60, py = 360, pw = 620, phh = 300;
        const pa = lp * (1 - up) * fade;
        withAlpha(ctx, pa, () => {
          card(ctx, px, py, pw, phh, 16, { fill: rgba(P.surface, 0.82), shadowBlur: 50, stroke: rgba(P.ink, 0.12) });
          text(ctx, 'P50 LATENCY @64K', px + 30, py + 48, { size: 16, weight: 700, fam: 'mono', color: P.accent, ls: 16 * 0.14 });
          text(ctx, 'ms · lower is better', px + pw - 30, py + 48, { size: 15, weight: 500, fam: 'mono', color: P.muted, align: 'right' });
          const cd = Ease.outC(rm(lt, b(1.25), b(3)));
          const rows = [['dense', dense, '#55657F', P.ink2], ['spark', lerp(dense, spark, cd), P.accent, P.ink]];
          rows.forEach(([name, val, c, tc], i) => {
            const ry = py + 112 + i * 92, bw0 = pw - 60, frac = val / dense;
            text(ctx, name, px + 30, ry, { size: 24, weight: 600, fam: 'mono', color: name === 'spark' ? P.accent : P.ink2 });
            text(ctx, val.toFixed(1) + ' ms', px + pw - 30, ry, { size: 34, weight: 700, fam: 'display', color: tc, align: 'right' });
            rr(ctx, px + 30, ry + 18, bw0, 10, 5); ctx.fillStyle = rgba(P.ink, 0.08); ctx.fill();
            ctx.save();
            if (name === 'spark') { ctx.shadowColor = rgba(P.accent, 0.7); ctx.shadowBlur = 16; }
            rr(ctx, px + 30, ry + 18, Math.max(10, bw0 * frac * Ease.outC(rm(lt, b(1.1), b(1.8)))), 10, 5); ctx.fillStyle = c; ctx.fill();
            ctx.restore();
          });
        });
      }

      // ── hold bar 1: leaderboard of the three kernels at 64k (ranked by throughput); hold bar 2: spread
      if (ph.hold > 0) {
        const ks = ['spark', 'block-sparse', 'dense'];
        const tags = { spark: 'band 7 + global 2', 'block-sparse': 'block mask', dense: 'baseline' };
        const cols = { spark: P.accent, 'block-sparse': P.accent2, dense: '#55657F' };
        const X0 = 140, X1 = 1780, top = 410, rh = 128;
        // hold bar 2 starts on the hold's second bar line (the `pop:3` cue): the spread values pop in one row per quarter
        // beat with it, and a scan re-reads the winning row across most of the bar (again on every later bar line)
        let w1 = -1, ls = -1;                                     // s since that bar line / since the latest one from it
        onBars(env, 1, (n, dt) => { if (n === 1) w1 = dt; if (n >= 1) ls = dt; });
        ks.forEach((k, i) => {
          const e = Ease.outExpo(rm(ph.hold, b(0.25) + i * b(0.25), b(0.25) + i * b(0.25) + b(1)));
          if (e <= 0) return;
          const K = D.kernels[k], rel = K.relative['64k'], y = top + i * rh;
          ctx.save();
          ctx.globalAlpha *= e * fade;
          ctx.translate((1 - e) * 120, 0);
          if (i === 0) { rr(ctx, X0 - 24, y - 52, X1 - X0 + 48, rh - 14, 14); ctx.fillStyle = rgba(P.accent, 0.06 + 0.05 * beatPulse(env, 4)); ctx.fill(); }
          text(ctx, String(i + 1).padStart(2, '0'), X0, y + 10, { size: 26, weight: 600, fam: 'mono', color: P.muted });
          text(ctx, k, X0 + 70, y + 12, { size: 40, weight: 700, fam: 'display', color: i === 0 ? P.ink : P.ink2 });
          const nw = measure(ctx, k, { size: 40, weight: 700, fam: 'display' });
          chip(ctx, X0 + 92 + nw, y, tags[k], { size: 15, fam: 'mono', weight: 600, bg: rgba(cols[k], 0.12), fg: k === 'dense' ? P.ink2 : cols[k], shadow: false, stroke: rgba(cols[k], 0.5) });
          const bx = 840, bwMax = 700, bwv = (bwMax * rel) / 4.5;
          rr(ctx, bx, y - 6, bwMax, 12, 6); ctx.fillStyle = rgba(P.ink, 0.06); ctx.fill();
          ctx.save();
          if (k !== 'dense') { ctx.shadowColor = rgba(cols[k], 0.75); ctx.shadowBlur = 18; }
          rr(ctx, bx, y - 6, bwv * Ease.outExpo(rm(ph.hold, b(0.4) + i * b(0.25), b(1.4) + i * b(0.25))), 12, 6); ctx.fillStyle = cols[k]; ctx.fill();
          ctx.restore();
          const wk = w1 < 0 ? 0 : Ease.outC(rm(w1, i * b(0.25), i * b(0.25) + b(0.6)));
          if (wk > 0) {                                           // run-to-run spread: (max - min) / median of the 5 repeats
            text(ctx, 'spread ' + K.spread_pct.toFixed(1) + '%', bx + bwv + 18, y + 6, { size: 17, weight: 600, fam: 'mono', color: k === 'dense' ? P.ink2 : cols[k], alpha: wk });
          }
          const q = ls < 0 ? 0 : rm(ls, 0, b(2.9)), sw = q > 0 && q < 1 ? q : 0;
          if (i === 0 && sw > 0) {
            const sx = lerp(X0 - 24, X1 + 24, Ease.ioQ(sw));
            ctx.save(); ctx.fillStyle = linear(ctx, sx - 220, 0, sx, 0, [[0, rgba(P.accent, 0)], [1, rgba(P.accent, 0.22)]]);
            ctx.fillRect(Math.max(X0 - 24, sx - 220), y - 52, Math.min(220, sx - X0 + 24), rh - 14); ctx.restore();
          }
          text(ctx, rel.toFixed(1) + '×', X1, y + 13, { size: 40, weight: 700, fam: 'display', color: k === 'dense' ? P.ink2 : cols[k], align: 'right' });
          text(ctx, K.p50_ms.toFixed(1) + ' ms p50', X1, y + 44, { size: 15, weight: 500, fam: 'mono', color: P.muted, align: 'right' });
          ctx.restore();
        });
        withAlpha(ctx, rm(ph.hold, b(0.5), b(1)) * fade, () => demoChip(ctx, X1 - 120, 236, 1, P));
      }
    },
  };
})();
