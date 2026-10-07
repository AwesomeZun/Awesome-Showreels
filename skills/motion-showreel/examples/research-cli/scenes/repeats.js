// repeats (optional; the 60-s cut): what "median of 5 seeded repeats" looks like. The five p50 timings of every
// kernel at 64k come straight from the demo run (assets/data/demo-run.json, the file `spark-bench run` replays; DEMO
// DATA). Each lane is scaled to its own median (+-2.5 %), so the spread is visible for a 47 ms and an 11 ms kernel
// alike: the repeats drop in on the beat, the median locks, the spread bracket reads the CLI's own value. Hold: one
// lane takes focus per bar line and types its five raw timings, and on every beat one of its repeats runs again and
// lands on the same value (same seed, same number). Everything is a function of env.lt.
(() => {
  const B = 60 / 128;
  const ORDER = ['spark', 'block-sparse', 'dense'];
  const LANE = { x0: 560, x1: 1620, y0: 400, dy: 168, span: 0.025 };   // +-2.5 % around each median

  function kicker(ctx, s, x, y, p, t, color) {
    if (p <= 0) return;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, p * 3);
    ctx.fillStyle = color; ctx.fillRect(x, y - 7, 26 * Ease.outExpo(p), 2);
    text(ctx, scramble(s, p, 43, t), x + 40, y, { size: 17, weight: 600, fam: 'mono', color, ls: 17 * 0.18 });
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
  const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

  SCENES['repeats'] = {
    draw(ctx, t, env) {
      const P = env.palette, lt = env.lt, beat = env.beatSec || B, ph = env.phase;
      const b = (x) => x * beat;
      const RUN = ASSET('data/demo-run.json'), D = ASSET('data/results.json');
      const col = { dense: '#7D8BA6', 'block-sparse': P.accent2, spark: P.accent };
      const out = Ease.inC(ph.out);

      ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
      softBlob(ctx, 1200, 360, 760, rgba(P.accent, 0.06));
      softBlob(ctx, 360, 840, 620, rgba(P.accent2, 0.05));
      ctx.save();
      ctx.strokeStyle = rgba(P.ink, 0.035); ctx.lineWidth = 1;
      const off = (lt * 6) % 60;
      ctx.beginPath();
      for (let x = -60 + off; x < W + 60; x += 60) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
      for (let y = 0; y < H; y += 60) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
      ctx.stroke();
      ctx.restore();
      if (!RUN) return;

      ctx.save();
      ctx.globalAlpha *= 1 - out;
      ctx.translate(-50 * out, 0);
      const ktxt = 'P50 LATENCY @64K · 5 SEEDED REPEATS PER KERNEL';
      kicker(ctx, ktxt, 140, 196, rm(lt, -b(0.4), b(0.8)), lt, P.accent);
      demoChip(ctx, 140 + 40 + measure(ctx, ktxt, { size: 17, weight: 600, fam: 'mono', ls: 17 * 0.18 }) + 24, 190, rm(lt, b(0.6), b(1.1)), P);

      // hold: one lane per bar line takes focus and types its raw timings
      let focus = -1, fdt = 0, rerun = -1, rdt = 0;
      if (ph.hold > 0) onBars(env, 1, (i, dt) => { focus = i % 3; fdt = dt; });
      if (ph.hold > 0) onBeats(env, 1, (i, dt) => { rerun = i % 5; rdt = dt; });   // one repeat re-runs per beat
      const xc = (LANE.x0 + LANE.x1) / 2, half = (LANE.x1 - LANE.x0) / 2;
      ORDER.forEach((k, li) => {
        const vals = RUN.latency_ms[k]['64k'], med = median(vals), y = LANE.y0 + li * LANE.dy;
        const la = Ease.outExpo(rm(lt, b(0.2 + 0.2 * li), b(1.2 + 0.2 * li)));
        if (la <= 0) return;
        const dim = focus >= 0 && focus !== li ? 1 - 0.45 * Ease.outC(clamp(fdt / 0.3)) : 1;
        ctx.save();
        ctx.globalAlpha *= la * dim;
        ctx.translate((1 - la) * -60, 0);
        // label column: kernel and its p50
        text(ctx, k, 140, y + 12, { size: 40, weight: 700, fam: 'display', color: k === 'dense' ? P.ink2 : col[k] });
        text(ctx, `p50 ${med.toFixed(1)} ms`, 142, y + 46, { size: 19, weight: 500, fam: 'mono', color: P.ink2 });
        // lane: track, ticks at -2 % .. +2 %, the median line once it locks
        rr(ctx, LANE.x0, y - 30, LANE.x1 - LANE.x0, 60, 30); ctx.fillStyle = rgba(P.surface, 0.62); ctx.fill();
        ctx.strokeStyle = rgba(P.ink, 0.06); ctx.lineWidth = 1;
        for (let p = -2; p <= 2; p++) {
          const x = xc + (p / 100 / LANE.span) * half;
          ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, y - 22); ctx.lineTo(Math.round(x) + 0.5, y + 22); ctx.stroke();
        }
        const mk = Ease.outExpo(rm(lt, b(3.75), b(4.25)));
        if (mk > 0) {
          ctx.save();
          ctx.strokeStyle = rgba(col[k], 0.9); ctx.lineWidth = 3; ctx.shadowColor = rgba(col[k], 0.8); ctx.shadowBlur = 12;
          ctx.beginPath(); ctx.moveTo(xc, y - 30 * mk); ctx.lineTo(xc, y + 30 * mk); ctx.stroke();
          ctx.restore();
        }
        // the five repeats: drop in on beats 1, 1.5, ... (all lanes together, a hair apart)
        vals.forEach((v, r) => {
          const x = xc + ((v / med - 1) / LANE.span) * half;
          const k0 = b(1 + 0.5 * r) + li * 0.05, e = rm(lt, k0, k0 + 0.32);
          if (e <= 0) return;
          let drop = (1 - Ease.outBack(e, 2.0)) * -70;
          const again = focus === li && r === rerun && rdt < 0.38 ? rdt / 0.38 : 0;   // lift and land on the same value
          if (again > 0) drop -= Math.sin(Math.PI * again) * 30;
          const pulse = focus === li ? Math.exp(-Math.max(0, fdt - (0.15 + r * 0.12)) * 8) * (fdt > 0.15 + r * 0.12 ? 1 : 0) : 0;
          ctx.save();
          ctx.shadowColor = rgba(col[k], 0.85); ctx.shadowBlur = 16 + 18 * pulse;
          circle(ctx, x, y + drop, 9 + 5 * pulse); ctx.fillStyle = col[k]; ctx.globalAlpha *= Math.min(1, e * 3); ctx.fill();
          ctx.restore();
        });
        // spread bracket: min to max, with the CLI's own spread value
        const sp = Ease.outC(rm(lt, b(4.25), b(4.9)));
        if (sp > 0) {
          const xs = vals.map((v) => xc + ((v / med - 1) / LANE.span) * half), a0 = Math.min(...xs), a1 = Math.max(...xs);
          const yb = y - 40;
          ctx.save();
          ctx.strokeStyle = rgba(col[k], 0.85); ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(lerp(xc, a0, sp), yb + 8); ctx.lineTo(lerp(xc, a0, sp), yb); ctx.lineTo(lerp(xc, a1, sp), yb); ctx.lineTo(lerp(xc, a1, sp), yb + 8);
          ctx.stroke();
          ctx.restore();
          const spread = D && D.kernels[k] ? D.kernels[k].spread_pct : ((Math.max(...vals) - Math.min(...vals)) / med) * 100;
          text(ctx, `spread ${spread.toFixed(1)}%`, LANE.x1 + 28, y + 9, { size: 22, weight: 600, fam: 'mono', color: k === 'dense' ? P.ink2 : col[k], alpha: sp });
        }
        // hold focus: the raw timings type under the lane
        if (focus === li) {
          const s = vals.map((v) => v.toFixed(2)).join('  ·  ') + ' ms';
          typewriter(ctx, s, LANE.x0 + 28, y + 62, fdt - 0.1, { size: 19, weight: 500, fam: 'mono', color: P.ink, cps: 48, caretColor: col[k] });
        }
        ctx.restore();
      });
      // axis over the lanes (shared: each lane is relative to its own median)
      const ax = rm(lt, b(1.2), b(2));
      if (ax > 0) {
        const y = LANE.y0 - 52;
        [[-2, '−2%'], [-1, '−1%'], [0, 'median'], [1, '+1%'], [2, '+2%']].forEach(([p, s]) =>
          text(ctx, s, xc + (p / 100 / LANE.span) * half, y, { size: 15, weight: 500, fam: 'mono', color: P.muted, align: 'center', alpha: ax }));
      }
      // verdict: the README's method, with the demo run's numbers
      const sp0 = D ? Math.min(...ORDER.map((k) => D.kernels[k].spread_pct)) : 1.2, sp1 = D ? Math.max(...ORDER.map((k) => D.kernels[k].spread_pct)) : 1.8;
      kinetic(ctx, `Median of 5 seeded repeats · spread ${sp0.toFixed(1)}–${sp1.toFixed(1)}%`, 140, 848, lt - b(5), { size: 40, weight: 700, fam: 'display',
        stagger: 0.012, rise: 20, colorFn: (i) => (i < 6 ? P.accent : P.ink) });
      ctx.restore();
    },
  };
})();
