// fstyle (feat-style.webp, 3 bars): the style follows the source, eighteen times. A wall of the eighteen reels, each
// card painted in its own reviewed palette (stage, ink, accent), its display face set in that face, its tempo and
// sound preset under it (assets/data/features.json, read from each example's style.json; the four case studies show
// a palette sampled from their own reels, k-means over the clip frames). A light runs across the wall, three cards
// per beat, lifting each card and ringing it in its own accent. Loop: 12 beats, seamless.
(() => {
  const FACE = {
    'playful-app': '"Nunito"', 'research-cli': '"Space Grotesk"', 'editorial-luxe': '"Bodoni Moda"', 'riso-zine': '"Anton"',
    'swiss-grid': '"Schibsted Grotesk"', 'botanical-organic': '"Fraunces Soft"', 'pixel-arcade': '"Press Start 2P"',
    'sumi-wabi': '"Hiragino Mincho ProN", serif', 'academic-paper': '"Inter"', 'sketchnote': '"Shantell Sans"', 'neo-brutal': '"Archivo"',
    'art-deco': '"Limelight"', 'newsprint': '"Newsreader"', 'sports-kinetic': '"Barlow Condensed"',
  };
  SCENES['fstyle'] = {
    draw(ctx, t, env) {
      const P = env.palette, K = window.KIT, H_ = window.HERO, lp = K.loop(env), D = ASSET('data/features.json');
      K.stage(ctx, P);
      K.header(ctx, P, { index: '01', label: 'TONE & MANNER · 18 SOURCES' });
      const ex = Object.fromEntries(D.examples.map((d) => [d.id, d])), cs = Object.fromEntries(D.cases.map((d) => [d.id, d]));
      const slots = H_.grid(6, 3, [96, 150, 1728, 0], 22).map(([x, y, w]) => [x, y, w]);
      const CW = slots[0][2], CH = CW * 9 / 16, CARD_H = CH + 104, GAP = 18, Y0 = 150;
      const lit = (lp.u / lp.L) * 18;                                    // the light's position along the wall
      H_.ALL.forEach(([id, name], i) => {
        const r = Math.floor(i / 6), c = i % 6, x = 96 + c * (CW + 22), y = Y0 + r * (CARD_H + GAP);
        const d = ex[id], k = cs[id], sw = d ? d.swatches : k.swatches;
        const bg = sw[0], ink = d ? sw[1] : (luma(sw[0]) > 0.5 ? '#2A2024' : '#E6E9EF'), acc = d ? sw[2] : sw[2] || sw[1];
        let dl = Math.abs(lit - (i + 0.5)); dl = Math.min(dl, 18 - dl);
        const on = clamp(1 - dl / 1.2), lift = Ease.outC(on);
        ctx.save(); ctx.translate(x + CW / 2, y + CARD_H / 2); ctx.scale(1 + 0.06 * lift, 1 + 0.06 * lift); ctx.translate(-(x + CW / 2), -(y + CARD_H / 2));
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 24 + 24 * lift; ctx.shadowOffsetY = 8 + 8 * lift;
        rr(ctx, x, y, CW, CARD_H, 14); ctx.fillStyle = bg; ctx.fill(); ctx.restore();
        ctx.save(); rr(ctx, x, y, CW, CARD_H, 14); ctx.clip();
        const img = H_.frame(id, t); if (img) ctx.drawImage(img, x, y, CW, CH);
        // the palette strip
        sw.slice(0, 5).forEach((s, j) => { ctx.fillStyle = s; ctx.fillRect(x + j * CW / 5, y + CH, CW / 5 + 0.5, 14); });
        ctx.restore();
        // the face and the tempo
        const fam = d ? FACE[id] : '"Space Grotesk"', label = d ? fam.split(',')[0].replace(/"/g, '') : 'real production';
        ctx.save(); ctx.fillStyle = ink; ctx.textBaseline = 'alphabetic';
        let fs = id === 'pixel-arcade' ? 17 : 30; ctx.font = `${id === 'editorial-luxe' ? 500 : 650} ${fs}px ${fam}, sans-serif`;
        while (ctx.measureText(label).width > CW - 32 && fs > 12) { fs -= 1; ctx.font = `${id === 'editorial-luxe' ? 500 : 650} ${fs}px ${fam}, sans-serif`; }
        ctx.fillText(label, x + 16, y + CH + 52);
        ctx.font = `600 17px ${FAM.mono}`; ctx.globalAlpha = 0.85;
        const meta = d ? `${d.bpm} BPM · ${d.preset}` : (k.bpm ? `${k.bpm} BPM · ${name}` : name);
        ctx.fillText(meta, x + 16, y + CH + 86);
        ctx.restore();
        rr(ctx, x + 0.75, y + 0.75, CW - 1.5, CARD_H - 1.5, 14);
        ctx.strokeStyle = on > 0.02 ? rgba(acc, 0.35 + 0.65 * on) : rgba('#FFFFFF', 0.08); ctx.lineWidth = 1.5 + 3 * on; ctx.stroke();
        ctx.restore();
      });
      K.label(ctx, 'Each card: its own palette, display face and tempo, read from its style.json. Cases: palette sampled from the reel.', 96, 1046, { size: 21, track: 0.02, color: P.muted });
    },
  };
})();
