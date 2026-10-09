// fcarriers (feat-carriers.webp, 3 bars): every visual tool, when the story needs it. Three pages of six reels (one
// page per bar), each tile playing its clip with the carrier that proves its claim on a tag: a mascot drawn in code,
// a real terminal, a croquis drawn on, riso overprint, ink bleeding into washi, 4,900 cells as data... Pages slide in
// from the right on the bar line and the tags type on, one per eighth. Loop: 12 beats, seamless.
(() => {
  const CAR = {
    'playful-app': 'mascot drawn in code + real app UI', 'research-cli': 'GPU point cloud + real terminal', 'editorial-luxe': 'SVG croquis drawn on, embroidery',
    'riso-zine': 'riso overprint off register', 'swiss-grid': 'true-scale section on 12 axes', 'botanical-organic': 'watercolour + growth model',
    'pixel-arcade': 'pixel art on a CRT', 'sumi-wabi': 'sumi ink bleeding into washi', 'academic-paper': '4,900 cells as live data',
    'sketchnote': 'handwriting that writes itself', 'neo-brutal': 'UI blocks + a pressing cursor', 'art-deco': 'gilded vector ornament',
    'newsprint': 'halftone + printing press', 'sports-kinetic': 'real splits as bars', fddd: 'brain point clouds, docking scores',
    'cc-statusline': 'real terminal captures', kbeautygate: 'Vision cutouts + real app UI', flygate: 'narration + burned-in captions',
  };
  const ORDER = ['playful-app', 'research-cli', 'sumi-wabi', 'academic-paper', 'sketchnote', 'kbeautygate',
    'editorial-luxe', 'riso-zine', 'botanical-organic', 'pixel-arcade', 'cc-statusline', 'newsprint',
    'swiss-grid', 'neo-brutal', 'art-deco', 'sports-kinetic', 'fddd', 'flygate'];
  SCENES['fcarriers'] = {
    draw(ctx, t, env) {
      const P = env.palette, K = window.KIT, H_ = window.HERO, lp = K.loop(env), b = lp.b;
      K.stage(ctx, P);
      K.header(ctx, P, { index: '02', label: 'VISUAL CARRIERS · 18 REELS' });
      const name = Object.fromEntries(H_.ALL.map(([id, n]) => [id, n]));
      const slots = H_.grid(3, 2, [96, 150, 1728, 860], 28);
      for (let pg = 0; pg < 3; pg++) {
        // page pg is on screen from beat 4*pg; it slides in during the half beat before, out during the half beat before the next
        const bin = 4 * pg - 0.5, local = ((b - bin) % 12 + 12) % 12;
        if (local > 4.5) continue;
        const enter = Ease.outQuint(clamp(local / 0.5)), leave = Ease.inQ(clamp((local - 4) / 0.5));
        const dx = (1 - enter) * W * 0.6 - leave * W * 0.6, a = enter * (1 - leave);
        for (let j = 0; j < 6; j++) {
          const id = ORDER[pg * 6 + j], [x, y, w, h] = slots[j], st = Ease.outQuint(clamp((local - 0.5 - j * 0.08) / 0.5));
          H_.card(ctx, id, t, x + dx * (1 + j * 0.06), y, w, h, { a: a * (0.4 + 0.6 * st), r: 16 });
          const ty = clamp((local - 0.6 - j * 0.25) / 0.6), s = CAR[id];
          if (ty > 0 && a > 0.05) {
            const shown = s.slice(0, Math.ceil(s.length * ty));
            ctx.save(); ctx.globalAlpha *= a;
            K.tag(ctx, shown, x + dx + 18, y + h - 40, { size: 24, h: 46, bg: rgba(P.bg, 0.86), color: P.ink, stroke: rgba(P.accent, 0.6) });
            K.label(ctx, name[id], x + dx + 20, y + 40, { size: 20, track: 0.04, color: '#FFFFFF', alpha: 0.9 });
            ctx.restore();
          }
        }
      }
      // page dots
      const cur = Math.floor(((b + 0.5) % 12) / 4);
      for (let i = 0; i < 3; i++) { circle(ctx, W / 2 - 24 + i * 24, 1046, i === cur ? 7 : 5); ctx.fillStyle = i === cur ? P.accent : rgba(P.ink, 0.25); ctx.fill(); }
    },
  };
})();
