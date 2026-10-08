// social (assets/readme/social-preview.png): the repository card GitHub shows when the link is shared. A still:
// make_webp.mjs renders it at 1920x1080, keeps the 1920x960 band between y 60 and 1020 (2:1) and saves 1280x640.
// Title, the README's tagline and a fan of real frames from both bundled examples (stills the runtime rendered
// from their projects). Built to read at thumbnail size: the title is 100 px tall in the 1280-px card.
(() => {
  const CARDS = [                                                   // [image, centre x, centre y, width, rotation]
    ['ex/mochi-frame-20_5', 1500, 300, 560, 0.05],
    ['ex/spark-frame-10_5', 1290, 560, 600, -0.045],
    ['ex/mochi-frame-13_5', 1640, 690, 540, 0.035],
    ['ex/spark-frame-28_5', 1380, 840, 520, -0.02],
  ];
  function frameCard(ctx, P, name, cx, cy, w, rot) {
    const im = IMG[name];
    if (!im) return;
    const h = Math.round(w * 9 / 16);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 22;
    rr(ctx, -w / 2 - 6, -h / 2 - 6, w + 12, h + 12, 16); ctx.fillStyle = '#26263A'; ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.save(); rr(ctx, -w / 2, -h / 2, w, h, 11); ctx.clip(); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore();
    rr(ctx, -w / 2 - 6, -h / 2 - 6, w + 12, h + 12, 16); ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }

  SCENES['social'] = {
    draw(ctx, t, env) {
      const P = env.palette;
      KIT.stage(ctx, P);
      softBlob(ctx, 1450, 560, 760, rgba(P.accent, 0.16));
      softBlob(ctx, 300, 900, 600, rgba(P.accent2, 0.08));
      for (const [n, x, y, w, r] of CARDS) frameCard(ctx, P, n, x, y, w, r);
      // a soft fade so the left column always reads over the collage
      ctx.fillStyle = linear(ctx, 0, 0, 1130, 0, [[0, rgba(P.bg, 0.98)], [0.72, rgba(P.bg, 0.9)], [1, rgba(P.bg, 0)]]);
      ctx.fillRect(0, 0, 1130, H);

      const x = 112;
      // kicker: the play glyph and what it is
      ctx.save(); ctx.fillStyle = linear(ctx, x, 180, x + 30, 210, [[0, P.accent], [1, P.accent2]]);
      ctx.beginPath(); ctx.moveTo(x, 186); ctx.lineTo(x + 30, 204); ctx.lineTo(x, 222); ctx.closePath(); ctx.fill(); ctx.restore();
      text(ctx, 'A CLAUDE CODE SKILL', x + 50, 215, { size: 30, weight: 700, fam: 'mono', color: P.ink2, ls: 30 * 0.14 });
      // title
      const ts = 156, opt = { size: ts, weight: 700, fam: 'display', ls: -ts * 0.025 };
      text(ctx, 'Awesome', x - 6, 380, { ...opt, color: KIT.bright() });
      const sw = measure(ctx, 'Showreels', opt);
      ctx.save(); ctx.font = font(ts, 700, 'display'); ctx.letterSpacing = opt.ls + 'px';
      ctx.fillStyle = linear(ctx, x, 400, x + sw, 540, [[0, P.accent], [0.55, P.accent2], [1, P.orange || P.accent2]]);
      ctx.fillText('Showreels', x - 6, 538); ctx.restore();
      // the tagline: the README's own line (the same one the sizzle's title card and the README's subtitle use)
      text(ctx, 'Any repo in.', x, 640, { size: 50, weight: 500, fam: 'sans', color: P.ink2, ls: -0.5 });
      text(ctx, 'A beat-synced showreel out.', x, 702, { size: 50, weight: 600, fam: 'sans', color: KIT.bright(), ls: -0.5 });
      // three proofs
      let cx = x;
      for (const [s, dot] of [['style from your source', P.accent], ['music on the beat', P.teal || P.accent3], ['MP4 + one HTML', P.ok]]) {
        cx += KIT.tag(ctx, s, cx, 820, { size: 27, h: 58, padX: 18, color: KIT.bright(), dot, fam: 'sans', weight: 600 }) + 16;
      }
      text(ctx, 'github.com/AwesomeZun/Awesome-Showreels', x, 948, { size: 26, weight: 600, fam: 'mono', color: P.muted });
    },
  };
})();
