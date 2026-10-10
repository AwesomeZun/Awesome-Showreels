// sample (1 bar in the 15, 2 in the 30 and 60): drawing the word. The bars lie down end to end into one strip from 0
// to 1, each word's slice as wide as its probability. A needle runs along the strip, slowing, and stops at u = 0.31,
// inside mat's slice; mat flies up into the sentence. In the longer cuts it runs again and stops at 0.62, in floor's
// slice: another time the same sentence could end on the floor.
(() => {
  const X0 = 360, SWD = 1200, SY = 600, SH = 84;
  const LAB = { mat: null, floor: null, sofa: null, bed: [1395, 770], roof: [1528, 812], others: [1662, 770] };
  SCENES['sample'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, n = Math.round(env.dur / B);
      const ws = VM.chartWords(), P = VM.chartP(1), T = VM.toy(), [u1, w1] = T.samples[0], [u2, w2] = T.samples[1];
      const cum = []; let acc = 0; ws.forEach(w => { cum.push(acc); acc += P[w]; });
      const seg = (i) => [X0 + cum[i] * SWD, SY, P[ws[i]] * SWD, SH];
      VM.bg(ctx);
      // bars lie down into the strip
      const lay = (i) => Ease.ioC(clamp((b - 0.2 - i * 0.07) / 1.0));
      const fl1 = Math.sin(clamp((b - 2.7) / 0.9) * Math.PI), fl2 = n > 4 ? Math.sin(clamp((b - 5.7) / 0.9) * Math.PI) : 0;
      ws.forEach((w, i) => {
        const r0 = VM.barRect(i, P[w]), r1 = seg(i), e = lay(i), r = r0.map((v, j) => VM.lerp(v, r1[j], e)), col = VM.chartCol(w);
        VM.bar(ctx, r, col, { glow: w === w1 ? fl1 * 24 : w === w2 ? fl2 * 18 : 0 });
        if (w === w1 && fl1 > 0) { ctx.fillStyle = rgba(col, 0.25 * fl1); ctx.fillRect(r[0], r[1], r[2], r[3]); }
        // the word: under its bar, then inside its slice (or below it on a leader when the slice is thin)
        const L0 = [r0[0] + VM.CH.bw / 2, VM.CH.base + 46], inside = !LAB[w], L1 = inside ? [r1[0] + r1[2] / 2, SY + SH / 2 + 2] : LAB[w], L = VM.lerp2(L0, L1, e);
        if (!inside && e > 0.6) { ctx.strokeStyle = rgba(col, 0.7 * clamp((e - 0.6) * 3)); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(r1[0] + r1[2] / 2, SY + SH + 4); ctx.lineTo(L1[0], L1[1] - 30); ctx.stroke(); }
        VM.label(ctx, w === 'others' ? 'other 10' : w, L[0], L[1], col, { size: VM.lerp(32, inside ? 34 : 28, e), bg: false });
        VM.txt(ctx, VM.pct(P[w]), L1[0], inside ? SY + SH - 12 : L1[1] + 32, { size: inside ? 24 : 26, align: 'center', color: inside ? VM.INK : VM.DIM, a: clamp((e - 0.7) * 3.3) * (inside ? 0.8 : 1) });
        VM.txt(ctx, VM.pct(P[w]), r0[0] + VM.CH.bw / 2, r0[1] - 16, { size: 30, align: 'center', a: 1 - clamp(e * 4) });
      });
      const ax = clamp((b - 0.9) * 3);
      if (ax > 0) {
        ctx.strokeStyle = rgba(VM.INK, 0.6 * (1 - clamp(b * 2))); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(VM.CH.x0 - 40, VM.CH.base); ctx.lineTo(VM.CH.x0 + 6 * 180 - 20, VM.CH.base); ctx.stroke();
        for (let v = 0; v <= 1.0001; v += 0.25) { const x = X0 + v * SWD; ctx.fillStyle = rgba(VM.INK, 0.6 * ax); ctx.fillRect(x - 1, SY + SH + 4, 2, v % 0.5 ? 8 : 14); }
        VM.txt(ctx, '0', X0, SY + SH + 44, { size: 28, align: 'center', color: VM.DIM, a: ax }); VM.txt(ctx, '1', X0 + SWD, SY + SH + 44, { size: 28, align: 'center', color: VM.DIM, a: ax });
      }
      // the needle: a random number u between 0 and 1, run along the strip, slowing to a stop
      const needle = (b0, u, ghost) => {
        const k = clamp((b - b0) / 1.4); if (k <= 0) return null;
        const travel = 2 + u, pos = (travel * (1 - Math.pow(1 - k, 3))) % 1, x = X0 + pos * SWD, a = ghost ? 0.75 : 1, col = ghost ? VM.INK : VM.YELLOW;
        if (k < 1) { ctx.fillStyle = linear(ctx, x - 160, 0, x, 0, [[0, rgba(col, 0)], [1, rgba(col, 0.35 * a)]]); ctx.fillRect(Math.max(X0, x - 160), SY, Math.min(160, x - X0), SH); }
        ctx.fillStyle = rgba(col, a); ctx.beginPath(); ctx.moveTo(x, SY - 4); ctx.lineTo(x - 13, SY - 28); ctx.lineTo(x + 13, SY - 28); ctx.closePath(); ctx.fill();
        ctx.fillRect(x - 1.5, SY - 4, 3, SH + 8);
        if (k >= 1) VM.txt(ctx, 'u = ' + u.toFixed(2), x, SY - 44, { size: 30, align: 'center', color: col, a: clamp((b - b0 - 1.4) * 3) * a });
        return x;
      };
      needle(1.3, u1, false);
      if (n > 4) needle(4.3, u2, true);
      // the chosen word flies up into the sentence
      const fk = clamp((b - 3.0) / 0.7), i1 = ws.indexOf(w1), s1 = seg(i1), hp = VM.headPos(ctx);
      const fill = clamp((b - 3.55) / 0.45);
      if (fk > 0 && fk < 1) { const e = Ease.ioC(fk), x = VM.lerp(s1[0] + s1[2] / 2, hp[5].c, e), y = VM.lerp(SY + SH / 2 + 2, VM.HEAD.y, e) - Math.sin(e * Math.PI) * 60; VM.label(ctx, w1, x, y, toHex(mix(VM.colOf(w1), VM.YELLOW, e)), { size: VM.lerp(34, 46, e), bg: false, glow: 12 }); }
      VM.head(ctx, { fill, caret: b % 1 < 0.55 ? 1 : 0.3, settle: n > 4 ? clamp((b - 4.4) / 0.6) : 0 });
      // another time: floor
      if (n > 4) {
        const gk = clamp((b - 5.8) / 1.0);
        VM.writeSeg(ctx, [['another time: ', VM.DIM], ['The cat sat on the ', VM.DIM], [w2, VM.colOf(w2)], ['.', VM.DIM]], W / 2, 206, gk, { size: 34, align: 'center', it: true });
        VM.caption(ctx, [['It doesn’t always take the top word: it ', VM.INK], ['draws', VM.YELLOW], [' one, by its probability.', VM.INK]], clamp((b - 6.3) / 1.2));
      }
    },
  };
})();
