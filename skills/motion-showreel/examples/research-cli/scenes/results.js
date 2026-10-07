// results (1 bar in the 15-s cut, 3 bars in the 30-s cut, up to 5 in the 60-s cut): throughput relative to dense,
// from assets/data/results.json (written by `spark-bench run --json`, i.e. computed from the demo run; DEMO DATA).
// Entered by zoomInto through the spark row of the terminal: before beat 0 the chart frame is already in place.
// In-phase (3 beats): bars grow, values pop. Hold: the spark trend line draws on bar 1, the 64k group takes focus on
// bar 2 with its p50 latencies; with 3+ hold bars the focus opens again on bar 3 and spark's lead over block-sparse
// pops per length on the beat, and the 64k group takes focus again for the last bar. Out: everything but the 64k
// spark bar dims, handing off to the next scene.
(() => {
  const B = 60 / 128;
  const ORDER = ['dense', 'block-sparse', 'spark'];
  const CH = { x: 220, y: 300, w: 1480, h: 470 };              // plot area (y grows down)
  const YMAX = 4.5;

  function kicker(ctx, s, x, y, p, t, color) {
    if (p <= 0) return;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, p * 3);
    ctx.fillStyle = color; ctx.fillRect(x, y - 7, 26 * Ease.outExpo(p), 2);
    text(ctx, scramble(s, p, 11, t), x + 40, y, { size: 17, weight: 600, fam: 'mono', color, ls: 17 * 0.18 });
    ctx.restore();
  }
  function demoChip(ctx, x, y, a, P) {
    if (a <= 0) return;
    const s = 'DEMO DATA', size = 14, w = measure(ctx, s, { size, weight: 600, fam: 'mono', ls: size * 0.12 }) + 22;
    ctx.save(); ctx.globalAlpha *= a;
    rr(ctx, x, y - 13, w, 26, 13); ctx.strokeStyle = rgba(P.warn, 0.55); ctx.lineWidth = 1.2; ctx.stroke();
    text(ctx, s, x + 11, y + 5, { size, weight: 600, fam: 'mono', color: P.warn, ls: size * 0.12 });
    ctx.restore();
    return w;
  }

  SCENES['results'] = {
    draw(ctx, t, env) {
      const P = env.palette, lt = env.lt, beat = env.beatSec || B, ph = env.phase;
      const b = (n) => n * beat;
      const D = ASSET('data/results.json');
      const col = { dense: '#55657F', 'block-sparse': P.accent2, spark: P.accent };

      // ── stage
      ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
      softBlob(ctx, 1500, 420, 760, rgba(P.accent, 0.06));
      softBlob(ctx, 300, 900, 600, rgba(P.accent2, 0.05));
      if (!D) return;

      // hold: slow constant-rate push toward the 64k group (same speed in every cut), dims on the out-phase
      const hold = ph.hold, out = Ease.inQ(ph.out);
      const push = 1 + 0.012 * hold;
      const fx = CH.x + CH.w * 0.875, fy = CH.y + CH.h * 0.5;
      ctx.save();
      ctx.translate(fx, fy); ctx.scale(push, push); ctx.translate(-fx, -fy);

      // ── frame: gridlines at 1x steps, the dense = 1.0x reference, axis labels (present before beat 0)
      const y = (v) => CH.y + CH.h - (v / YMAX) * CH.h;
      ctx.save();
      for (let v = 0; v <= 4; v++) {
        ctx.strokeStyle = v === 0 ? rgba(P.ink, 0.35) : rgba(P.ink, 0.07); ctx.lineWidth = v === 0 ? 1.5 : 1;
        ctx.beginPath(); ctx.moveTo(CH.x, Math.round(y(v)) + 0.5); ctx.lineTo(CH.x + CH.w, Math.round(y(v)) + 0.5); ctx.stroke();
        text(ctx, v + '×', CH.x - 22, y(v) + 6, { size: 17, weight: 500, fam: 'mono', color: P.muted, align: 'right' });
      }
      ctx.setLineDash([6, 8]); ctx.strokeStyle = rgba(P.ink2, 0.55); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(CH.x, y(1)); ctx.lineTo(CH.x + CH.w, y(1)); ctx.stroke();
      ctx.restore();
      text(ctx, '1.0× dense', CH.x + CH.w + 14, y(1) + 6, { size: 16, weight: 500, fam: 'mono', color: P.ink2 });

      const G = D.lengths.length, gw = CH.w / G, bw = 86, gap = 16;
      const hd = ph.holdDur, long = hd >= b(12) - 1e-6;
      const focus = long                                           // hold bar 2: the 64k group takes focus
        ? Math.max(Ease.ioC(rm(hold, b(4), b(5))) * (1 - Ease.ioC(rm(hold, b(8), b(9)))), Ease.ioC(rm(hold, hd - b(3), hd - b(2))))
        : Ease.ioC(rm(hold, b(4), b(5)));
      const dimOut = out;                                          // out-phase: all but the 64k spark bar dims
      D.lengths.forEach((L, gi) => {
        const gx = CH.x + gw * gi + gw / 2;
        const gDim = gi === G - 1 ? 1 : 1 - 0.55 * focus;
        text(ctx, L, gx, CH.y + CH.h + 44, { size: 26, weight: 600, fam: 'mono', color: P.ink, align: 'center', alpha: gDim * (1 - 0.6 * dimOut) });
        if (gi === 0) text(ctx, 'tokens', gx, CH.y + CH.h + 74, { size: 15, weight: 500, fam: 'mono', color: P.muted, align: 'center', alpha: 1 - dimOut });
        ORDER.forEach((k, ki) => {
          const v = D.kernels[k].relative[L];
          const st = b(0.125 * (gi * 3 + ki) * 0.55);                // left to right, then within the group
          const g = Ease.outExpo(rm(lt, st, st + b(1.5)));
          const x = gx - (bw * 3 + gap * 2) / 2 + ki * (bw + gap);
          const ghost = 1 - rm(lt, st, st + b(0.6));                   // outlines at full height until the bar grows
          if (ghost > 0) {
            ctx.save(); ctx.globalAlpha *= 0.28 * ghost * gDim;
            ctx.setLineDash([4, 6]); ctx.strokeStyle = col[k]; ctx.lineWidth = 1.5;
            rr(ctx, x + 0.75, y(v) + 0.75, bw - 1.5, y(0) - y(v) - 1.5, [6, 6, 0, 0]); ctx.stroke();
            ctx.restore();
          }
          if (g <= 0) return;
          const top = y(v * g), hh = y(0) - top;
          const hero = k === 'spark' && gi === G - 1;
          const a = gDim * (hero ? 1 : 1 - 0.75 * dimOut);
          ctx.save();
          ctx.globalAlpha *= a;
          if (k === 'spark') { ctx.shadowColor = rgba(P.accent, 0.55 + (hero ? 0.4 * out : 0)); ctx.shadowBlur = 26 + (hero ? 40 * out : 0); }
          ctx.fillStyle = k === 'spark' ? linear(ctx, 0, top, 0, y(0), [[0, mix(P.accent, '#FFFFFF', 0.25)], [1, rgba(P.accent, 0.55)]]) : col[k];
          rr(ctx, x, top, bw, hh, [6, 6, 0, 0]); ctx.fill();
          ctx.restore();
          // values: spark labels pop on beat 2 (the cue), block-sparse small, dense none
          if (k === 'spark') {
            const pv = rm(lt, b(2) + gi * b(0.25), b(2) + gi * b(0.25) + 0.22);
            if (pv > 0) {
              const sc = 1 + 0.25 * (1 - Ease.outBack(pv, 2.2));
              ctx.save(); ctx.globalAlpha *= a * Math.min(1, pv * 2);
              ctx.translate(x + bw / 2, top - 18); ctx.scale(sc, sc);
              text(ctx, countUp(1, v, Ease.outC(pv), { decimals: 1 }) + '×', 0, 0, { size: 34, weight: 700, fam: 'display', color: P.accent, align: 'center',
                glow: rgba(P.accent, 0.45), glowBlur: 18 });
              ctx.restore();
            }
          } else if (k === 'block-sparse') {
            const pv = rm(lt, b(2.4) + gi * b(0.25), b(2.6) + gi * b(0.25));
            if (pv > 0) text(ctx, v.toFixed(1) + '×', x + bw / 2, top - 14, { size: 20, weight: 600, fam: 'mono', color: P.accent2, align: 'center', alpha: a * pv });
          }
          // hold bar 2: the 64k group shows its p50 latencies under the bars
          if (gi === G - 1 && focus > 0) {
            const ms = D.kernels[k].p50_ms.toFixed(1), pw = 70, py = y(0) - 44 - ki * 0;
            ctx.save(); ctx.globalAlpha *= focus * (1 - out);
            rr(ctx, x + bw / 2 - pw / 2, py - 16, pw, 32, 8); ctx.fillStyle = rgba(P.bg, 0.82); ctx.fill();
            text(ctx, ms, x + bw / 2, py + 6, { size: 17, weight: 700, fam: 'mono', color: k === 'dense' ? P.ink2 : col[k], align: 'center' });
            ctx.restore();
            if (ki === 0) text(ctx, 'p50 ms', x - 16, py + 6, { size: 15, weight: 600, fam: 'mono', color: P.muted, align: 'right', alpha: focus * (1 - out) });
          }
        });
      });

      // hold bar 3 (long holds): spark's lead over block-sparse per length, one per half beat
      if (long) {
        const gk = rm(hold, b(8), b(8.4)) * (1 - Ease.inC(rm(hold, hd - b(3), hd - b(2.4))));
        if (gk > 0) D.lengths.forEach((L, gi) => {
          const p = Ease.outBack(rm(hold, b(8.5 + 0.5 * gi), b(8.5 + 0.5 * gi) + 0.3), 1.8) * gk;
          if (p <= 0) return;
          const gx = CH.x + gw * gi + gw / 2, x1 = gx - (bw * 3 + gap * 2) / 2 + 1 * (bw + gap) + bw / 2, x2 = x1 + bw + gap;
          const v1 = D.kernels['block-sparse'].relative[L], v2 = D.kernels.spark.relative[L], top = y(v2) - 76;
          ctx.save(); ctx.globalAlpha *= Math.min(1, p);
          ctx.strokeStyle = rgba(P.accent, 0.8); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(x1, y(v1) - 44); ctx.lineTo(x1, top); ctx.lineTo(x2, top); ctx.lineTo(x2, y(v2) - 56); ctx.stroke();
          ctx.translate((x1 + x2) / 2, top - 16); ctx.scale(0.6 + 0.4 * p, 0.6 + 0.4 * p);
          text(ctx, '+' + (v2 - v1).toFixed(1) + '×', 0, 0, { size: 22, weight: 700, fam: 'mono', color: P.accent, align: 'center' });
          ctx.restore();
        });
        const lab = rm(hold, b(8.3), b(8.9)) * gk;
        if (lab > 0) text(ctx, 'spark vs block-sparse', CH.x + 30, CH.y + 112, { size: 19, weight: 600, fam: 'mono', color: P.ink2, alpha: lab });
      }
      // hold bar 1: the spark trend draws on through the bar tops, ending on the 64k bar
      const tr = Ease.ioC(rm(hold, 0, b(2)));
      if (tr > 0) {
        const pts = D.lengths.map((L, gi) => {
          const gx = CH.x + gw * gi + gw / 2 - (bw * 3 + gap * 2) / 2 + 2 * (bw + gap) + bw / 2;
          return [gx, y(D.kernels.spark.relative[L]) - 66];
        });
        ctx.save();
        ctx.globalAlpha *= 1 - 0.7 * out;
        ctx.setLineDash([2, 9]); ctx.lineCap = 'round';
        polyStroke(ctx, pts, tr); ctx.strokeStyle = rgba(P.accent, 0.9); ctx.lineWidth = 3; ctx.stroke();
        ctx.setLineDash([]);
        const head = pointAt(pts, tr);
        softBlob(ctx, head.x, head.y, 34, P.accent, 0.8);
        circle(ctx, head.x, head.y, 5); ctx.fillStyle = '#FFFFFF'; ctx.fill();
        const lab = rm(hold, b(1.5), b(2.2));
        if (lab > 0) {
          ctx.save(); ctx.globalAlpha *= lab * (1 - out);
          ctx.setLineDash([2, 7]); ctx.strokeStyle = P.accent; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(CH.x + 30, CH.y + 70); ctx.lineTo(CH.x + 78, CH.y + 70); ctx.stroke(); ctx.setLineDash([]);
          text(ctx, 'spark: 1.3× → 4.1× as length grows 16×', CH.x + 96, CH.y + 77, { size: 21, weight: 600, fam: 'mono', color: P.ink });
          ctx.restore();
        }
        ctx.restore();
      }
      ctx.restore();

      // ── type: kicker, legend, demo label (screen-fixed)
      const ex = 1 - 0.8 * out;
      withAlpha(ctx, ex, () => {
        kicker(ctx, 'THROUGHPUT VS DENSE · MEDIAN OF 5 SEEDED REPEATS', 140, 196, rm(lt, -b(0.6), b(0.6)), lt, P.accent);
        const cw = demoChip(ctx, 140 + 40 + measure(ctx, 'THROUGHPUT VS DENSE · MEDIAN OF 5 SEEDED REPEATS', { size: 17, weight: 600, fam: 'mono', ls: 17 * 0.18 }) + 24, 190,
          rm(lt, b(0.5), b(1)), P);
        let lx = CH.x + CH.w;
        [['spark', P.accent], ['block-sparse', P.accent2], ['dense', col.dense]].forEach(([k, c]) => {
          const w = measure(ctx, k, { size: 19, weight: 600, fam: 'mono' });
          lx -= w;
          text(ctx, k, lx, 196, { size: 19, weight: 600, fam: 'mono', color: k === 'dense' ? P.ink2 : c });
          rr(ctx, lx - 26, 184, 16, 16, 3); ctx.fillStyle = c; ctx.fill();
          lx -= 52;
        });
        return cw;
      });
    },
  };
})();
