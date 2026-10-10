// arrows (1 bar in the 15, 2 in the 30 and 60): tokens become arrows. The sentence rises to the top of the page as a
// coordinate plane draws itself from the middle out; each word of the sentence flies down to the tip of its arrow as
// the arrow grows from the origin (The and the land on the same arrow), then the rest of the vocabulary appears kind by
// kind: animals, actions, people, places, each in its colour. Soft halos gather each kind; in the longer cuts they are
// named and neighbours pulse together. Words used alike point alike.
(() => {
  const SW = ['the', 'cat', 'sat', 'on'];
  const KINDS = [['animal', 'animals', [-4.3, 2.55]], ['action', 'actions', [1.85, 3.35]], ['person', 'people', [4.75, 0.35]], ['place', 'places', [-3.55, -3.15]]];
  const TOK = ['the', 'cat', 'sat', 'on', 'the'];
  SCENES['arrows'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, n = Math.round(env.dur / B), X = Math.max(0, n - 4), bo = b - X;
      const cam = VM.CAM, T = VM.toy(), all = Object.keys(T.vocab);
      VM.bg(ctx);
      // what the sentence scene left on the page leaves it
      const out = 1 - clamp(b / 0.5), zs = VM.pushOf('sentence');
      if (out > 0) {
        ctx.save(); ctx.translate(W / 2, 540); ctx.scale(zs, zs); ctx.translate(-W / 2, -540);
        VM.writeSeg(ctx, [['How does a language model pick the ', VM.INK], ['next word', VM.YELLOW], ['?', VM.INK]], W / 2, 300 - (1 - out) * 40, 1, { size: 56, align: 'center', a: out });
        const longSent = (REEL.plan.scenes.find(s => s.id === 'sentence') || { dur: 0 }).dur / B > 6;
        if (longSent) {
          const big = VM.headPos(ctx, 540, 76);
          TOK.forEach((w, i) => VM.colVec(ctx, VM.xy(w), big[i].c, 636, 1, { size: 25, color: VM.colOf(w), a: out }));
          VM.writeSeg(ctx, [['Each token becomes a list of numbers: an ', VM.INK], ['arrow', VM.YELLOW], ['. Ours have two; real models, thousands.', VM.INK]], W / 2, 770, 1, { size: 34, align: 'center', a: out });
        } else VM.txt(ctx, 'Text is cut into tokens.', W / 2, 720, { size: 34, align: 'center', color: VM.DIM, a: out });
        ctx.restore();
      }
      VM.plane(ctx, cam, { k: clamp((b - 0.25) / 1.5) });
      // halos behind each kind
      const hk = Ease.ioC(clamp((b - 2.9) / 0.8));
      if (hk > 0) for (const [kind] of KINDS) {
        const ws = all.filter(w => VM.kindOf(w) === kind), ps = ws.map(w => VM.S(cam, VM.xy(w))), cx = ps.reduce((a, p) => a + p[0], 0) / ps.length, cy = ps.reduce((a, p) => a + p[1], 0) / ps.length;
        const r = Math.max(...ps.map(p => Math.hypot(p[0] - cx, p[1] - cy))) + 90;
        ctx.fillStyle = radial(ctx, cx, cy, 0, r, [[0, rgba(VM.KIND[kind], 0.16 * hk)], [0.7, rgba(VM.KIND[kind], 0.07 * hk)], [1, rgba(VM.KIND[kind], 0)]]); ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      }
      // neighbours pulse together (the longer cuts)
      const pulse = (w) => { if (!X) return 0; const p1 = ['cat', 'dog'].includes(w) ? b - 4.4 : ['mat', 'sofa', 'floor', 'bed', 'roof'].includes(w) ? b - 5.3 : ['king', 'queen', 'man', 'woman'].includes(w) ? b - 6.2 : -1; return p1 > 0 && p1 < 1 ? Math.sin(p1 * Math.PI) : 0; };
      // the vocabulary, kind by kind
      KINDS.forEach(([kind], c) => {
        const k = clamp((b - 1.95 - c * 0.22) / 0.7);
        all.filter(w => VM.kindOf(w) === kind && !SW.includes(w)).forEach((w, j) => {
          const kk = clamp(k * 1.3 - j * 0.08), pu = pulse(w); if (kk <= 0) return;
          VM.vec(ctx, cam, VM.xy(w), VM.colOf(w), { k: kk, w: 3.5 + pu * 2, tip: 18, a: 0.9, glow: pu * 16 });
          VM.tipLabel(ctx, cam, VM.xy(w), w, VM.colOf(w), { size: 27, a: clamp(kk * 2 - 1), glow: pu * 14 });
        });
      });
      // the sentence's words: arrows grow, labels fly from the sentence to the tips
      const m = Ease.ioC(clamp(b / 0.9)), big = VM.headPos(ctx, 540, 76).map(r => ({ ...r, x: W / 2 + (r.x - W / 2) * zs, w: r.w * zs })), top = VM.headPos(ctx);
      SW.forEach((w, i) => {
        const k = clamp((b - 1.0 - i * 0.32) / 0.8), pu = pulse(w);
        VM.vec(ctx, cam, VM.xy(w), VM.colOf(w), { k, w: 5.5 + pu * 2, glow: pu * 16 });
        if (k >= 1) VM.tipLabel(ctx, cam, VM.xy(w), w, VM.colOf(w), { size: 31, glow: pu * 14 });
      });
      // the sentence along the top, and the copies flying down
      for (let i = 0; i < 6; i++) {
        const x = VM.lerp(big[i].x, top[i].x, m), y = VM.lerp(540, VM.HEAD.y, m), size = VM.lerp(76 * zs, VM.HEAD.size, m);
        if (i < 5) VM.txt(ctx, VM.SENT[i], x, y, { size });
        else { ctx.fillStyle = rgba(VM.YELLOW, 0.9); ctx.fillRect(x - 4 * zs, y + 12 * zs - m * 4, VM.lerp(big[i].w, top[i].w, m) + 8, 4 - m); }
        if (i < 5) { const w = VM.lerp(big[i].w, top[i].w, m) + 20 - m * 6, hh = size * 1.16; ctx.save(); ctx.strokeStyle = rgba(VM.GRID, 0.95 - m * 0.55); ctx.lineWidth = 2.5 - m; rr(ctx, x - 10 + m * 3, y - size * 0.84, w, hh, 10 - m * 3); ctx.stroke(); ctx.restore(); }
      }
      TOK.forEach((w, j) => {
        const i = SW.indexOf(w), st = j === 4 ? 2.25 : 1.0 + i * 0.32, k = clamp((b - st) / 0.8); if (k <= 0 || k >= 1) return;
        const e = Ease.ioC(k), [tx, ty] = VM.tipPos(ctx, cam, VM.xy(w), w, { size: 31 }), sx = top[j].c, sy = VM.HEAD.y - 14;
        const cx = (sx + tx) / 2 + (tx > sx ? 60 : -60), cy = Math.min(sy, ty) - 40, x = (1 - e) * (1 - e) * sx + 2 * (1 - e) * e * cx + e * e * tx, y = (1 - e) * (1 - e) * sy + 2 * (1 - e) * e * cy + e * e * ty;
        VM.label(ctx, w, x, y + 10, toHex(mix(VM.INK, VM.colOf(w), e)), { size: VM.lerp(40, 31, e) });
      });
      // the kinds' names (the longer cuts), and the line
      if (X) KINDS.forEach(([kind, name, at], c) => { const k = clamp((b - 3.3 - c * 0.2) / 0.8), [x, y] = VM.S(cam, at); VM.write(ctx, name, x, y, k, { size: 34, it: true, align: 'center', color: VM.KIND[kind] }); });
      VM.caption(ctx, [['Words used alike ', VM.INK], ['point alike', VM.YELLOW], ['.', VM.INK]], clamp((bo - 3.0) / 0.75));
    },
  };
})();
