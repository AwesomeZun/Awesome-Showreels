// sentence (1 bar, 2 in the 60): the question and the sentence. On the navy page the question writes itself in (each
// glyph traces its outline, then fills), then "The cat sat on the" and a yellow slot with a caret blinking on the beat
// where the next word will go. Thin boxes draw around the tokens the text is cut into. In the 60 each token also shows
// its two numbers (its arrow in the toy), and a line says that real models use thousands.
(() => {
  const Q = [['How does a language model pick the ', VM.INK], ['next word', VM.YELLOW], ['?', VM.INK]];
  const TOK = ['the', 'cat', 'sat', 'on', 'the'];
  SCENES['sentence'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, n = Math.round(env.dur / B);
      VM.bg(ctx);
      const z = 1 + VM.PUSH * b; ctx.save(); ctx.translate(W / 2, 540); ctx.scale(z, z); ctx.translate(-W / 2, -540);
      VM.writeSeg(ctx, Q, W / 2, 300, clamp(b / 1.6), { size: 56, align: 'center' });
      const pos = VM.headPos(ctx, 540, 76);
      for (let i = 0; i < 5; i++) VM.write(ctx, VM.SENT[i], pos[i].x, 540, clamp((b - 0.9 - i * 0.22) / 0.55), { size: 76 });
      // the slot: an underline that draws, and a caret on the beat
      const s = pos[5], u = Ease.ioC(clamp((b - 2.0) / 0.5));
      ctx.fillStyle = rgba(VM.YELLOW, 0.9); ctx.fillRect(s.x - 4, 552, (s.w + 8) * u, 4);
      if (u >= 1 && b % 1 < 0.55) { ctx.fillStyle = VM.YELLOW; ctx.fillRect(s.x + 2, 478, 4, 70); }
      // the tokens: a box draws around each
      for (let i = 0; i < 5; i++) {
        const k = Ease.ioC(clamp((b - 2.3 - i * 0.14) / 0.6)); if (k <= 0) continue;
        const r = pos[i], x = r.x - 10, y = 540 - 64, w = r.w + 20, h = 88, per = 2 * (w + h);
        ctx.save(); ctx.fillStyle = rgba(VM.GRID, 0.1 * k); rr(ctx, x, y, w, h, 10); ctx.fill();
        ctx.setLineDash([per * k, per]); ctx.strokeStyle = rgba(VM.GRID, 0.95); ctx.lineWidth = 2.5; rr(ctx, x, y, w, h, 10); ctx.stroke(); ctx.restore();
      }
      const c1 = n >= 8 ? 1 - clamp((b - 5.0) / 0.5) : 1;
      VM.write(ctx, 'Text is cut into tokens.', W / 2, 720, clamp((b - 2.8) / 0.9), { size: 34, align: 'center', color: VM.DIM, a: c1 });
      if (n < 8) { ctx.restore(); return; }
      // (the 60) each token's two numbers: its arrow in the toy
      for (let i = 0; i < 5; i++) {
        const w = TOK[i], k = clamp((b - 4.1 - i * 0.22) / 0.8);
        VM.colVec(ctx, VM.xy(w), pos[i].c, 636, k, { size: 25, color: VM.colOf(w) });
      }
      VM.writeSeg(ctx, [['Each token becomes a list of numbers: an ', VM.INK], ['arrow', VM.YELLOW], ['. Ours have two; real models, thousands.', VM.INK]], W / 2, 770, clamp((b - 5.4) / 1.4), { size: 34, align: 'center' });
      ctx.restore();
    },
  };
})();
