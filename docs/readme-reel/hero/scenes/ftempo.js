// ftempo (feat-tempo.webp, 3 bars): any length, same BPM, fourteen times. Each example's real short-cut plan
// (build/cut-*.json, via assets/data/features.json) is one row on a shared seconds axis: scene blocks in the
// example's accent with the in-phase solid, the hold hatched and the out-phase pale, its own bar lines ticking at its
// own tempo (72 to 176 BPM) and a beat light pulsing at that tempo. The rows draw on left to right (beats 0-3), hold,
// and retract at the end of the loop so it is seamless. The case studies have no plan here and are not drawn.
(() => {
  const X0 = 520, X1 = 1824, MAXS = 22;
  SCENES['ftempo'] = {
    draw(ctx, t, env) {
      const P = env.palette, K = window.KIT, lp = K.loop(env), b = lp.b, D = ASSET('data/features.json');
      K.stage(ctx, P);
      K.header(ctx, P, { index: '03', label: 'ANY LENGTH, SAME BPM · 14 PLANS' });
      const pxs = (X1 - X0) / MAXS, rows = D.examples, RH = 60, Y0 = 176;
      // seconds axis
      for (let s = 0; s <= MAXS; s += 2) {
        const x = X0 + s * pxs;
        ctx.fillStyle = rgba(P.ink, s % 10 === 0 ? 0.25 : 0.1); ctx.fillRect(x, Y0 - 18, 1.5, rows.length * RH + 10);
        if (s % 4 === 0) K.label(ctx, `${s} s`, x, Y0 - 28, { size: 18, track: 0.04, align: 'center', color: P.muted });
      }
      const grow = Ease.ioC(clamp(b / 3)) * (1 - Ease.ioC(clamp((b - 10.5) / 1.5)));
      rows.forEach((d, i) => {
        const y = Y0 + i * RH, bar = 60 / d.bpm * 4, acc = d.swatches[2], show = clamp(grow * 1.15 - i * 0.012);
        const reach = X0 + d.dur * pxs * show;
        K.label(ctx, d.id, 96, y + 30, { size: 21, track: 0.02, color: P.ink2 });
        // the beat light at the row's own tempo (rounded to whole cycles per loop so the loop stays seamless)
        const cyc = Math.max(1, Math.round(d.bpm / 60 * lp.L)), ph = (lp.u / lp.L) * cyc % 1, pulse = Math.exp(-ph * 6);
        circle(ctx, 442, y + 23, 7 + 4 * pulse); ctx.fillStyle = rgba(acc, 0.35 + 0.65 * pulse); ctx.fill();
        K.label(ctx, `${d.bpm}`, 470, y + 30, { size: 20, track: 0, color: P.ink });
        ctx.save(); ctx.beginPath(); ctx.rect(X0, y, Math.max(0, reach - X0), RH); ctx.clip();
        d.scenes.forEach(([id, fb, tb, inB, outB], j) => {
          const xa = X0 + fb * bar * pxs, xb = X0 + tb * bar * pxs, w = xb - xa - 3, beat = bar / 4;
          const xin = Math.min(xb - 3, xa + inB * beat * pxs), xout = Math.max(xin, xb - 3 - outB * beat * pxs);
          rr(ctx, xa, y + 6, w, RH - 22, 6); ctx.fillStyle = rgba(acc, 0.22); ctx.fill();
          ctx.fillStyle = rgba(acc, 0.85); ctx.fillRect(xa, y + 6, xin - xa, RH - 22);
          ctx.save(); ctx.beginPath(); ctx.rect(xin, y + 6, xout - xin, RH - 22); ctx.clip();
          ctx.strokeStyle = rgba(acc, 0.55); ctx.lineWidth = 2;
          for (let hx = xin - 40 + ((lp.u * 30) % 12); hx < xout + 40; hx += 12) { ctx.beginPath(); ctx.moveTo(hx, y + 6 + RH - 22); ctx.lineTo(hx + 20, y + 6); ctx.stroke(); }
          ctx.restore();
          ctx.fillStyle = rgba(acc, 0.4); ctx.fillRect(xout, y + 6, xb - 3 - xout, RH - 22);
        });
        for (let k = 0; k <= d.bars; k++) { const x = X0 + k * bar * pxs; ctx.fillStyle = rgba(P.ink, 0.45); ctx.fillRect(x - 0.5, y + RH - 14, 1.5, 8); }
        ctx.restore();
        K.label(ctx, `${d.dur.toFixed(1)} s`, Math.min(X1 + 10, reach + 12), y + 30, { size: 17, track: 0, color: P.muted, alpha: show });
      });
      K.label(ctx, 'solid: in-phase   hatched: hold   pale: out   ticks: bar lines at each reel\'s own tempo', 96, 1046, { size: 20, track: 0.02, color: P.muted });
    },
  };
})();
