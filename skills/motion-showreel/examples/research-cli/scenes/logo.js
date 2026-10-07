// logo (outro; 1 bar in the 15-s cut, 3 bars in the 30-s cut): the 674 computed blocks of the hook (36 points each)
// start where the impact scene left them (same camera, HANDOFF) and swirl into the spark-bench mark and wordmark
// (gl.js textPoints + pairPoints). The tagline is the README's own; the install line types on hold bar 1 and the
// credits (what is computed, what is authored) decode on hold bar 2. On the last downbeat the particles cross-fade
// into the vector mark and wordmark (projected through the same camera), so the final frame is crisp type. A 1-bar
// logo (the 15-s cut) runs a compact schedule: the copy lands by beat 2 and stays readable. All a function of env.lt.
(() => {
  const B = 60 / 128;
  const N = 64, HALF = 3, GLOBAL = 2, PER = 36;
  const kept = (i, j) => Math.abs(i - j) <= HALF || i < GLOBAL || j < GLOBAL;
  const HANDOFF = { yaw: 0.78, pitch: 0.42, dist: 3.4, shiftX: 0.0, shiftY: 0.02 };   // = scenes/impact.js
  const FRONT = { yaw: 0, pitch: 0, dist: 2.75, shiftX: 0.032, shiftY: 0.13 };
  let G = null;

  function build(P) {
    const blocks = [];
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (kept(i, j)) blocks.push([i, j]);
    const n = blocks.length * PER, from = new Float32Array(n * 3), isG = new Uint8Array(n);
    blocks.forEach(([i, j], k) => {
      for (let q = 0; q < PER; q++) {
        const o = (k * PER + q);
        from.set([(j - 31.5 + (hash(o * 1.3) - 0.5) * 0.8) / 32, (hash(o * 2.9) - 0.5) * 0.012, (i - 31.5 + (hash(o * 4.7) - 0.5) * 0.8) / 32], o * 3);
        isG[o] = i < GLOBAL || j < GLOBAL ? 1 : 0;
      }
    });
    // target: the docs' mark (3x3 blocks: bright diagonal, dim band, empty corners) left of the wordmark
    const nMark = Math.round(n * 0.12), nText = n - nMark;
    const textPts = GL.textPoints('spark-bench', { n: nText, size: 220, weight: 700, width: 1.86, seed: 5 });
    const cells = [[0, 0, 1], [1, 1, 1], [2, 2, 1], [0, 1, 0.4], [1, 0, 0.4], [1, 2, 0.4], [2, 1, 0.4]];
    const wsum = cells.reduce((a, c) => a + c[2], 0), mark = new Float32Array(nMark * 3);
    const cs = 0.078, gap = 0.018, mx0 = -1.1, my0 = 0.142;            // cell size, gap, top-left of the mark
    const MX1 = mx0 + 3 * cs + 2 * gap;
    let m = 0;
    cells.forEach(([r, c, w], ci) => {
      const cnt = ci === cells.length - 1 ? nMark - m : Math.round((nMark * w) / wsum);
      for (let q = 0; q < cnt && m < nMark; q++, m++) {
        mark.set([mx0 + c * (cs + gap) + hash(m * 3.1 + 7) * cs, my0 - r * (cs + gap) - hash(m * 5.3 + 1) * cs, (hash(m * 1.1) - 0.5) * 0.01], m * 3);
      }
    });
    const to = new Float32Array(n * 3);
    textPts.forEach((v, i) => { to[i] = i % 3 === 0 ? v + 0.16 : v; });   // the wordmark sits right of the mark
    to.set(mark, nText * 3);
    const morph = GL.pairPoints(from, to, 'x');
    // colours fly with the points: where they come from (band cyan, global amber) -> where they land (mark, word)
    const white = GL.rgb('#EAFBFF'), cy = GL.rgb(P.accent), am = GL.rgb(P.accent3);
    const cA = new Float32Array(n * 3), cB = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const w = hash(i * 0.37) < 0.35;
      cA.set(isG[i] ? am : w ? white : cy, i * 3);
      const x = morph[i * 3], y = morph[i * 3 + 1];
      if (x < MX1 + 0.01) {                                             // the mark: bright diagonal, dim band
        const c = Math.floor((x - mx0) / (cs + gap)), r = Math.floor((my0 - y) / (cs + gap));
        const k = r === c ? 1 : 0.42;
        cB.set([cy[0] * k, cy[1] * k, cy[2] * k], i * 3);
      } else cB.set(hash(i * 0.91) < 0.5 ? white : [lerp(white[0], cy[0], 0.5), lerp(white[1], cy[1], 0.5), lerp(white[2], cy[2], 0.5)], i * 3);
    }
    const cloudA = GL.cloud(from, { morph, colors: cA, sizes: [2.0, 3.2] });
    const cloudB = GL.cloud(from, { morph, colors: cB, sizes: [2.0, 3.2] });
    // the same wordmark as vector type, in the world units textPoints used (centre (0.16, 0), font size in units)
    const probe = document.createElement('canvas').getContext('2d');
    probe.font = font(220, 700, 'D'); probe.letterSpacing = '0px';
    const tw = probe.measureText('spark-bench').width, cw = Math.ceil(tw + 220 * 0.6), S = 1.86 / cw;
    const word = { x: 0.16, y: 0, size: 220 * S, w: tw * S };
    return { cloudA, cloudB, n, word, cells, cs, gap, mx0, my0 };
  }
  // Crisp mark + wordmark drawn through the current camera: an affine map from three projected world points (the
  // camera only drifts by a degree here, so the affine part of the projection is exact to a fraction of a pixel).
  function vectorLogo(ctx, cam, P, a) {
    if (a <= 0.002) return;
    const pr = (x, y) => GL.project(cam, [x, y, 0]);
    const o = pr(0, 0), ex = pr(1, 0), ey = pr(0, 1);
    ctx.save(); ctx.globalAlpha *= a;
    ctx.setTransform(ex[0] - o[0], ex[1] - o[1], -(ey[0] - o[0]), -(ey[1] - o[1]), o[0], o[1]);   // world units, y up -> canvas y down
    const { word, cells, cs, gap, mx0, my0 } = G;
    cells.forEach(([r, c, w]) => {
      ctx.fillStyle = w >= 1 ? P.accent : rgba(P.accent, 0.42);
      ctx.fillRect(mx0 + c * (cs + gap), -(my0 - r * (cs + gap)), cs, cs);
    });
    ctx.font = font(word.size, 700, 'D'); ctx.letterSpacing = '0px';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = mix(P.ink, P.accent, 0.12);
    ctx.fillText('spark-bench', word.x, -word.y);
    ctx.restore();
  }

  SCENES['logo'] = {
    draw(ctx, t, env) {
      const P = env.palette, lt = env.lt, beat = env.beatSec || B, ph = env.phase;
      const b = (n) => n * beat;
      if (!G) G = build(P);
      const compact = env.dur < 1.5 * env.barSec;                       // 1-bar end card (15-s cut)
      // particles -> vector type on the last downbeat (never before the morph has landed)
      const crisp = Ease.ioC(rm(lt, Math.max(b(2.6), env.dur - env.barSec), Math.max(b(2.6), env.dur - env.barSec) + b(0.6)));

      ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
      const glow = Ease.outC(rm(lt, b(1.5), b(3)));
      softBlob(ctx, W / 2, 470, 900, rgba(P.accent, 0.05 + 0.07 * glow));

      // camera from the hand-off pose to a frontal view while the points fly (the morph uses its own stagger)
      const m = Ease.ioC(rm(lt, b(0.15), b(2.5)));
      const k = Ease.ioC(rm(lt, 0, b(2.3)));
      const cam = GL.camera({
        yaw: lerp(HANDOFF.yaw, FRONT.yaw, k) + 0.02 * Math.sin(lt * 0.6) * k, pitch: lerp(HANDOFF.pitch, FRONT.pitch, k) + 0.012 * Math.sin(lt * 0.45) * k,
        dist: lerp(HANDOFF.dist, FRONT.dist, k), fov: 0.6, shiftX: lerp(HANDOFF.shiftX, FRONT.shiftX, k), shiftY: lerp(HANDOFF.shiftY, FRONT.shiftY, k),
      });
      GL.begin({ exposure: 1.3 });
      const cx = Ease.ioC(rm(m, 0.25, 0.85));                          // colour hand-over while they fly
      const base = { cam, morph: m, swirl: 0.42, stagger: 0.55, time: lt, twinkle: lerp(0.3, 0.16, m), soft: 0.75, size: lerp(1.6, 1, m) };
      const al = lerp(0.95, 1.15, m) * (1 - 0.88 * crisp);               // a faint dust of points stays alive under the type
      if (cx < 1) GL.drawCloud(G.cloudA, { ...base, alpha: al * (1 - cx) });
      if (cx > 0) GL.drawCloud(G.cloudB, { ...base, alpha: al * cx });
      GL.blit(ctx);
      vectorLogo(ctx, cam, P, crisp);

      // a sheen across the word on every bar line of the hold (and once when it lands)
      const sheen = (q) => {
        if (q <= 0 || q >= 1) return;
        const x = lerp(330, 1700, Ease.ioQ(q));
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = linear(ctx, x - 90, 0, x + 90, 0, [[0, 'rgba(255,255,255,0)'], [0.5, rgba(P.accent, 0.16)], [1, 'rgba(255,255,255,0)']]);
        ctx.transform(1, 0, -0.3, 1, 0, 0); ctx.fillRect(x - 90 + 0.3 * 470, 330, 180, 260); ctx.restore();
      };
      sheen(rm(lt, b(2.6), b(3.8)));
      onBars(env, 1, (i, dt) => sheen(rm(dt, 0, b(1.2))));

      // tagline (README) and the honesty line, centred under the wordmark
      revealLine(ctx, 'Reproducible benchmarks for sparse attention kernels.', W / 2, 666, compact ? rm(lt, b(1.3), b(2.0)) : rm(lt, b(2.2), b(3)),
        { size: 36, weight: 500, fam: 'sans', color: P.ink2, align: 'center' });
      const hn = compact ? rm(lt, b(1.2), b(2.0)) : rm(lt, b(2.8), b(3.5));
      if (hn > 0) text(ctx, scramble('FICTIONAL EXAMPLE PROJECT · DEMO DATA', hn, 23, lt), W / 2, 720,
        { size: 16, weight: 600, fam: 'mono', color: P.muted, align: 'center', ls: 16 * 0.16 });

      // hold bar 1: the install line types; hold bar 2: credits decode
      const h1 = ph.hold;
      if (h1 > 0) {
        const x = W / 2 - 150, y = 790;
        withAlpha(ctx, Ease.outC(rm(h1, 0, 0.3)), () => {
          rr(ctx, W / 2 - 200, y - 38, 400, 108, 12); ctx.fillStyle = rgba(P.surface, 0.8); ctx.fill();
          ctx.strokeStyle = rgba(P.ink, 0.12); ctx.lineWidth = 1; ctx.stroke();
        });
        const L1 = 'pip install -e .', L2 = 'spark-bench run';
        const t1 = h1 - b(0.25), t2 = h1 - b(1.85);               // = the two keytap cues (holdBar + 0.25 / + 1.85 beats)
        if (t1 > 0) { text(ctx, '$', x, y, { size: 24, weight: 600, fam: 'mono', color: P.accent }); typewriter(ctx, L1, x + 28, y, t1, { size: 24, weight: 500, fam: 'mono', color: P.ink, cps: 26, caretAfter: b(1.6), caretColor: P.accent }); }
        if (t2 > 0) { text(ctx, '$', x, y + 40, { size: 24, weight: 600, fam: 'mono', color: P.accent }); typewriter(ctx, L2, x + 28, y + 40, t2, { size: 24, weight: 500, fam: 'mono', color: P.ink, cps: 26, caretColor: P.accent }); }
        const cr = rm(h1, b(4), b(5.2));                               // credits: computed vs authored, bottom-left
        if (cr > 0) {
          ['pattern  computed from the README', 'numbers  results/demo-run.json · demo data', 'terminal real capture · music synthesized'].forEach((s, i) =>
            text(ctx, scramble(s, clamp(cr * 1.4 - i * 0.2), 31 + i, lt), 140, 846 + i * 27, { size: 15, weight: 500, fam: 'mono', color: P.muted, alpha: Math.min(1, cr * 2) }));
        }
      }
    },
  };
})();
