// problem (optional, 2 bars; only the 30-s cut has room): why speedups are hard to compare. The README names the
// variables runs differ in (hardware, clocks, warm-up, repeats); here they flicker as uncontrolled noise and lock one
// by one on the beat into what spark-bench fixes (fingerprint, pinned clocks, 3 warm-ups, 5 seeded repeats). The
// verdict line is the README's own sentence. The voice carries "hard to compare"; the screen carries the variables.
(() => {
  const B = 60 / 128;
  const ROWS = [
    { name: 'hardware', value: (D) => `fingerprint ${D ? D.fingerprint : '437589'} · GPU, driver, clocks` },   // the CLI's own hash
    { name: 'clocks', value: 'pinned' },
    { name: 'warm-up', value: '3 runs before timing' },
    { name: 'repeats', value: '5 · seed 1234 · median + spread' },
  ];
  const NOISE = '#%&*+=<>/\\?01~^';

  function noise(n, seed, f) {
    let s = '';
    for (let i = 0; i < n; i++) s += hash(seed * 13.1 + i * 7.7 + f * 0.37) < 0.18 ? ' ' : NOISE[Math.floor(hash(seed + i * 3.3 + f * 1.91) * NOISE.length)];
    return s;
  }
  function kicker(ctx, s, x, y, p, t, color) {
    if (p <= 0) return;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, p * 3);
    ctx.fillStyle = color; ctx.fillRect(x, y - 7, 26 * Ease.outExpo(p), 2);
    text(ctx, scramble(s, p, 29, t), x + 40, y, { size: 17, weight: 600, fam: 'mono', color, ls: 17 * 0.18 });
    ctx.restore();
  }

  SCENES['problem'] = {
    draw(ctx, t, env) {
      const P = env.palette, lt = env.lt, beat = env.beatSec || B;
      const b = (n) => n * beat;
      const out = Ease.inC(env.phase.out);

      ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
      softBlob(ctx, 1450, 300, 700, rgba(P.deny, 0.05 * (1 - rm(lt, b(1.5), b(3.5)))));
      softBlob(ctx, 1300, 620, 760, rgba(P.accent, 0.04 + 0.05 * rm(lt, b(1.5), b(3.5))));
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
      kicker(ctx, 'RUN-TO-RUN VARIABLES', 140, 236, rm(lt, -b(0.4), b(0.6)), lt, P.accent);
      const f = Math.floor(lt * 18);                              // noise refresh rate (pure in lt)
      ROWS.forEach((r, i) => {
        const e = Ease.outExpo(rm(lt, b(-0.2 + i * 0.25), b(0.8 + i * 0.25)));
        if (e <= 0) return;
        const y = 352 + i * 112, lockAt = b(1.5 + i * 0.5), lk = rm(lt, lockAt, lockAt + 0.26), locked = lt >= lockAt;
        ctx.save();
        ctx.globalAlpha *= e;
        ctx.translate((1 - e) * -70, 0);
        text(ctx, r.name, 140, y + 20, { size: 62, weight: 700, fam: 'display', color: locked ? P.ink : P.ink2, ls: -1 });
        // the value field: uncontrolled noise until it locks, then the value spark-bench fixes
        const fx = 640, fw = 900, fh = 70, fy = y - 30;
        const jit = locked ? 0 : (hsh2(i + 3, f) - 0.5) * 10;
        rr(ctx, fx, fy, fw, fh, 12);
        ctx.fillStyle = rgba(P.surface, 0.72); ctx.fill();
        ctx.strokeStyle = locked ? rgba(P.accent, 0.35 + 0.65 * Math.exp(-(lt - lockAt) * 5)) : rgba(P.deny, 0.35);
        ctx.lineWidth = locked ? 2 : 1.5; ctx.stroke();
        if (!locked || lk < 1) {
          const nz = noise(26, i * 5 + 1, f);
          withAlpha(ctx, 1 - lk, () => text(ctx, nz, fx + 28 + jit, fy + 45, { size: 28, weight: 500, fam: 'mono', color: P.deny, alpha: 0.7 }));
          if (!locked) text(ctx, '≠', fx + fw - 46, fy + 47, { size: 36, weight: 600, fam: 'mono', color: P.deny, alpha: 0.8 + 0.2 * Math.sin(lt * 20 + i) });
        }
        if (locked) {
          const val = typeof r.value === 'function' ? r.value(ASSET('data/results.json')) : r.value;
          text(ctx, scramble(val, Ease.outC(lk), 41 + i, lt), fx + 28, fy + 45, { size: 28, weight: 500, fam: 'mono', color: P.ink });
          const ps = Ease.outBack(rm(lt, lockAt, lockAt + 0.3), 2.4) * (1 + 0.12 * beatPulse(env, 7) * rm(lt, b(3.5), b(4)));
          ctx.save();
          ctx.translate(fx + fw - 40, fy + fh / 2); ctx.scale(ps, ps);
          icon(ctx, 'lock', 0, 0, 30, P.accent);
          ctx.restore();
          // once all four are fixed, a verification pass sweeps every field (beats 4.25 and 5.75)
          for (const sb of [4.25, 5.75]) {
            const q = rm(lt, b(sb + i * 0.12), b(sb + i * 0.12 + 1));
            if (q > 0 && q < 1) {
              const sx = lerp(fx, fx + fw, Ease.ioQ(q));
              ctx.save(); rr(ctx, fx, fy, fw, fh, 12); ctx.clip();
              ctx.fillStyle = linear(ctx, sx - 180, 0, sx, 0, [[0, rgba(P.accent, 0)], [1, rgba(P.accent, 0.22)]]);
              ctx.fillRect(sx - 180, fy, 180, fh); ctx.restore();
            }
          }
          const rk = rm(lt, lockAt, lockAt + 0.45);
          if (rk < 1) { ctx.save(); ctx.strokeStyle = rgba(P.accent, 0.7 * (1 - rk)); ctx.lineWidth = 2; circle(ctx, fx + fw - 40, fy + fh / 2, 20 + 44 * Ease.outC(rk)); ctx.stroke(); ctx.restore(); }
        }
        ctx.restore();
      });
      // verdict: the README's sentence, after the last lock
      const v = since => lt - since;
      kinetic(ctx, 'spark-bench fixes those variables.', 140, 806, v(b(3.25)), { size: 52, weight: 700, fam: 'display', stagger: 0.012, rise: 24,
        colorFn: (k) => (k >= 12 && k < 17 ? P.accent : P.ink) });
      ctx.restore();
    },
  };
})();
