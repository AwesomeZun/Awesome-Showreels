// intro (2 bars): "Any source in." Eight kinds of source drop onto the stage one per half beat (a README, a paper, a
// brief, a deck, a site, a CLI run, a brand guide, design tokens), then are pulled into one point (beat 3) that
// flashes; the title lands word by word on the bar line (4), the promise rises under it (5) and the count of what
// this page shows (5.5). Out: the title lifts away as the first reel slides in.
(() => {
  const SRC = ['README.md', 'paper.pdf', 'brief.md', 'deck.pptx', 'site/index.html', '$ cli run', 'BRAND.md', 'tokens.css'];
  const SPOT = SRC.map((_, i) => [260 + (i % 4) * 470 + (i >= 4 ? 230 : 0) - 120, 380 + (i >= 4 ? 230 : 0) + ((i * 37) % 50) - 25, ((i * 53) % 7 - 3) * 0.025]);
  SCENES['intro'] = {
    draw(ctx, t, env) {
      const H_ = window.HERO, B = env.beatSec, b = env.lt / B, out = Ease.inQ(env.phase.out);
      H_.stage(ctx);
      // the sources fall in, then are pulled into the centre
      const pull = Ease.inExpo(clamp((b - 3) / 0.75));
      SRC.forEach((s, i) => {
        const p = Ease.outQuint(clamp((b - i * 0.4) / 0.5));
        if (p <= 0 || pull >= 1) return;
        const [x0, y0, rot] = SPOT[i];
        const x = lerp(x0, 960, pull), y = lerp(y0 - (1 - p) * 140, 540, pull);
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot * (1 - pull)); ctx.scale(1 - 0.7 * pull, 1 - 0.7 * pull);
        H_.chip(ctx, s, 0, 0, { size: 34, align: 'center', a: p * (1 - pull * 0.6), ring: rgba(i % 2 ? C.accent3 : C.accent, 0.6) });
        ctx.restore();
      });
      // the point and its flash on beat 3.75
      const fl = clamp((b - 3.6) / 0.6);
      if (pull > 0.2 && fl < 1) softBlob(ctx, 960, 540, 40 + 380 * Ease.outC(fl), mix(C.accent, '#FFFFFF', 0.4), 0.55 * (1 - fl) * clamp(pull * 2));
      if (fl > 0 && fl < 1) { ctx.strokeStyle = rgba(C.accent2, 0.8 * (1 - fl)); ctx.lineWidth = 3; circle(ctx, 960, 540, 30 + 900 * Ease.outC(fl)); ctx.stroke(); }
      // title, promise, count
      const push = 1 + 0.03 * Ease.ioSine(clamp((b - 4) / 3)) + 0.06 * out;                    // a slow push-in while it holds
      ctx.save(); ctx.translate(960, 540); ctx.scale(push, push); ctx.translate(-960, -540); ctx.globalAlpha *= 1 - out;
      ctx.save(); ctx.font = font(150, 700, 'D'); if ('letterSpacing' in ctx) ctx.letterSpacing = '-4px';
      const w1 = ctx.measureText('Awesome ').width, w2 = ctx.measureText('Showreels').width; ctx.restore();
      const x0 = 960 - (w1 + w2) / 2;
      H_.rise(ctx, 'Awesome', x0, 520, clamp((b - 4) / 0.4), { size: 150, weight: 700, ls: -4, color: mix(C.ink, '#FFFFFF', 0.5) });
      H_.rise(ctx, 'Showreels', x0 + w1, 520, clamp((b - 4.25) / 0.4), { size: 150, weight: 700, ls: -4, color: C.accent });
      H_.rise(ctx, 'Any source in. A beat-synced showreel out.', 960, 610, clamp((b - 5) / 0.5), { size: 46, weight: 500, align: 'center', color: C.ink2, ls: -0.5 });
      const c = clamp((b - 5.6) / 0.4);
      if (c > 0) H_.chip(ctx, '14 looks · 4 real productions · 0 presets', 960, 700, { size: 28, align: 'center', a: Ease.outC(c), ring: rgba(C.accent2, 0.6), color: C.accent2 });
      ctx.restore();
    },
  };
})();
