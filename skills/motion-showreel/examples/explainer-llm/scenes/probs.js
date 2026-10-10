// probs (2 bars, 3 in the 60): every word gets a score, then a probability. With the new arrow h in yellow the formula
// score(w) = h · w writes in. The whole plane turns until h points right, then squashes flat onto the line along h:
// every word's tip slides down to its projection (a dot product is a projection, times |h|). The line zooms in on the
// high end where the places land; each rises into a bar e^score tall, the formula morphs into softmax, and the bars
// settle into the chart: mat 55%, floor 23%, sofa 15%, bed 4.4%, roof 2.1%, the other ten words 0.5% together. In the
// 15, which has no attention scene, the arrow of the swings to h first; in the 60 the scores are read off the line.
(() => {
  const CT = { ox: 1010, oy: 440, u: 135 }, CP = { ox: 700, oy: 560, u: 118 }, CZ = { ox: -40, oy: 560, u: 400 };
  SCENES['probs'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, n = Math.round(env.dur / B), X = Math.max(0, n - 8), bo = b - X;
      const T = VM.toy(), all = Object.keys(T.vocab), h = T.h, hAng = Math.atan2(h[1], h[0]), hLen = Math.hypot(h[0], h[1]), smax = Math.max(...all.map(w => T.scores[w]));
      const fromAttend = VM.prev(env) === 'attend', ws = VM.chartWords(), P = VM.chartP(1);
      const sw = fromAttend ? 1 : Ease.ioC(clamp((b - 0.2) / 0.9)), hNow = VM.lerp2(VM.xy('the'), h, sw);
      // the plane's map: turn h to the right, squash onto the line, zoom in on the line's high end
      const rk = Ease.ioC(clamp((b - 1.4) / 1.5)), sk = Ease.ioC(clamp((b - 2.95) / 1.05));
      const zk = Ease.ioC(Math.max(clamp((b - 4.0) / 1.2), clamp((bo - 4.0) / 0.8)));
      const bk = Ease.ioC(clamp((bo - 4.5) / 0.8)), st = clamp((bo - 5.3) / 1.2);
      const M = VM.mul([1, 0, 0, 1 - sk], VM.rot(-hAng * rk));
      const c0 = VM.lerpCam(fromAttend ? { ...CT, u: CT.u * VM.pushOf('attend') } : VM.CAM, CP, Ease.ioC(clamp((b - 1.2) / 1.6))), cz = VM.lerpCam(c0, CZ, zk), cam = { ...cz, M };
      if (X) { const zd = 1 + 0.035 * Ease.ioSine(clamp((b - 4.6) / (X + 0.4))); cam.u *= zd; cam.ox = 980 + (cam.ox - 980) * zd; }
      VM.bg(ctx);
      VM.plane(ctx, cam, { a: (1 - 0.85 * sk) * (1 - zk), axes: 1 - sk });
      const lineA = clamp(sk * 3) * (1 - clamp(st * 2));
      // the line along h, with its score ticks
      if (lineA > 0) {
        ctx.save(); ctx.strokeStyle = rgba(VM.INK, 0.85 * lineA); ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(0, cam.oy); ctx.lineTo(W, cam.oy); ctx.stroke();
        for (let s = -6; s <= 8; s += 2) {
          const x = cam.ox + cam.u * (s / hLen); if (x < 20 || x > W - 20) continue;
          ctx.fillStyle = rgba(VM.INK, 0.7 * lineA * sk); ctx.fillRect(x - 1.2, cam.oy - 12, 2.4, 24);
          VM.txt(ctx, s < 0 ? '−' + -s : String(s), x, cam.oy - 24, { size: 24, align: 'center', color: VM.DIM, a: lineA * sk * (1 - bk) });
        }
        VM.txt(ctx, 'score', W - 60, cam.oy - 24, { size: 28, align: 'right', it: true, color: VM.DIM, a: lineA * sk * (1 - bk) });
        ctx.restore();
      }
      // the words: arrows, flattening into dots on the line
      const arrA = 1 - clamp((sk - 0.45) / 0.45), dotA = clamp((sk - 0.3) / 0.5), labA = 1 - clamp((sk - 0.35) / 0.4);
      const dotX = (w) => VM.S(cam, VM.xy(w))[0];
      all.forEach(w => {
        if (w === 'the' && !fromAttend && sw < 1) return;
        const pl = VM.kindOf(w) === 'place', a0 = pl ? 0.85 : 0.6;
        VM.vec(ctx, cam, VM.xy(w), VM.colOf(w), { w: 3.5, tip: 18, a: a0 * arrA });
        VM.tipLabel(ctx, cam, VM.xy(w), w, VM.colOf(w), { size: 27, a: a0 * labA });
      });
      if (!fromAttend) { const a = 1 - sw; VM.vec(ctx, cam, VM.xy('the'), VM.colOf('the'), { w: 5, a: a * arrA }); }
      // dots, then bars e^score tall, then the bars settle into the chart
      const inChart = new Set(ws), barH = (w) => Math.exp(T.scores[w] - smax) * 340 * bk;
      all.forEach(w => {
        const x = dotX(w); if (x < -40 || x > W + 40 || dotA <= 0) return;
        const a = dotA * (inChart.has(w) ? 1 : 1 - st), col = VM.colOf(w);
        if (bk > 0 && !inChart.has(w)) VM.bar(ctx, [x - 22, cam.oy - barH(w), 44, barH(w)], col, { a });
        if (st <= 0) { ctx.fillStyle = rgba(col, a); circle(ctx, x, cam.oy, 7); ctx.fill(); }
      });
      // labels under the line once it is zoomed (alternating rows where they crowd)
      const lk = clamp((zk - 0.55) / 0.45) * (1 - clamp(st * 3));
      if (lk > 0) ['on', 'roof', 'bed', 'sofa', 'floor', 'mat'].forEach((w, i) => { const x = dotX(w); VM.label(ctx, w, x, cam.oy + 46 + (i % 2) * 34, VM.colOf(w), { size: 28, a: lk }); });
      // (the 60) the scores read off the line
      if (X) ['roof', 'bed', 'sofa', 'floor', 'mat'].forEach((w, i) => { const x = dotX(w), k = clamp((b - 5.4 - i * 0.3) / 0.6) * (1 - bk); VM.txt(ctx, T.scores[w].toFixed(1), x, cam.oy - 58 - (i % 2) * 30, { size: 26, align: 'center', color: VM.colOf(w), a: k }); });
      ws.forEach((w, i) => {
        const to = VM.barRect(i, P[w]); let r;
        if (w === 'others') r = [VM.lerp(-80, to[0], Ease.ioC(st)), VM.lerp(cam.oy, to[1], Ease.ioC(st)), VM.lerp(44, to[2], Ease.ioC(st)), VM.lerp(0, to[3], Ease.ioC(st))];
        else { const x = dotX(w), hh = barH(w), from = [x - 22, cam.oy - hh, 44, hh], e = Ease.ioC(clamp(st * 1.25 - i * 0.05)); r = from.map((v, j) => VM.lerp(v, to[j], e)); if (bk <= 0) return; }
        if (st <= 0 && w === 'others') return;
        const hl = w === 'mat' ? Math.sin(clamp((bo - 7.0) / 1.0) * Math.PI) : 0;
        VM.bar(ctx, r, VM.chartCol(w), { a: w === 'others' ? clamp(st * 2) : 1, glow: hl * 20 });
        const lab = clamp((st - 0.5) * 2); if (lab > 0) VM.label(ctx, w === 'others' ? 'other 10' : w, to[0] + VM.CH.bw / 2, VM.CH.base + 46, VM.chartCol(w), { size: 32, a: lab, bg: false });
        const pk = clamp((bo - 6.4 - i * 0.08) / 0.5); if (pk > 0) VM.txt(ctx, VM.pct(P[w]), to[0] + VM.CH.bw / 2, to[1] - 16, { size: 30, align: 'center', color: hl > 0.05 ? VM.YELLOW : VM.INK, a: pk });
      });
      if (st > 0) { ctx.strokeStyle = rgba(VM.INK, 0.6 * clamp(st * 2)); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(VM.CH.x0 - 40, VM.CH.base); ctx.lineTo(VM.CH.x0 + ws.length * (VM.CH.bw + VM.CH.gap) - VM.CH.gap + 40, VM.CH.base); ctx.stroke(); }
      // h itself, until the line takes over
      const hA = 1 - clamp((zk - 0.2) / 0.5);
      if (hA > 0) { VM.vec(ctx, cam, hNow, VM.YELLOW, { w: 6, tip: 26, glow: 14, a: hA * (fromAttend ? 1 : clamp(sw * 3)) }); VM.tipLabel(ctx, cam, hNow, fromAttend ? 'the, in context' : 'the, after reading the context', VM.YELLOW, { size: 31, a: hA * labA * (fromAttend ? 1 : clamp((sw - 0.5) * 2)), dx: -40, dy: 4 }); }
      // the sentence along the top, and the formula under it
      ctx.fillStyle = linear(ctx, 0, 0, 0, 200, [[0, rgba(VM.BG, 0.9)], [0.7, rgba(VM.BG, 0.75)], [1, rgba(VM.BG, 0)]]); ctx.fillRect(0, 0, W, 200);
      VM.head(ctx);
      const F = VM.formulas(ctx), m1 = clamp((bo - 4.5) / 0.8), m2 = clamp((bo - 5.4) / 0.9);
      VM.panel(ctx, m2 > 0 ? F.p : m1 > 0 ? F.exp : F.score, clamp((b - 0.5) * 3));
      if (m2 > 0) VM.morph(ctx, F.exp, F.p, m2); else if (m1 > 0) VM.morph(ctx, F.score, F.exp, m1); else VM.drawF(ctx, F.score, clamp((b - 0.5) / 0.9));
      VM.caption(ctx, [['Each word’s score is how far its arrow reaches along ', VM.INK], ['h', VM.YELLOW], ['.', VM.INK]], clamp((b - 3.0) / 1.0), { a: 1 - clamp((bo - 5.0) / 0.4) });
      VM.caption(ctx, [['Softmax', VM.INK], [' turns scores into probabilities that add up to 1.', VM.INK]], clamp((bo - 5.5) / 1.0));
    },
  };
})();
