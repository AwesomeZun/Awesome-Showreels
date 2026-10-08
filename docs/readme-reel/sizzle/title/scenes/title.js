// scenes/title.js: the title card of the README sizzle, its first frame and its end card (the loop seam sits inside
// the hold). Image-led: the two example reels fill the frame, split on a diagonal and darkened (assets/bg-mochi and
// bg-spark are real frames of their reels, rendered by the runtime: tools/prepare.mjs --only title), with the title
// block in the upper half so the band a visitor sees first already carries the type. Style: ../../style.json, derived
// from this repository's README (Catppuccin Mocha, Space Grotesk, JetBrains Mono). Lays out with W, H and UNIT.
(() => {
  const SOURCES = ['repo', 'README', 'paper', 'deck', 'website'];
  const SHOW = ['#CBA6F7', '#DDB4EF', '#F5C2E7', '#F8BBC8', '#FAB387'];   // mauve -> pink -> peach (palette roles)
  const ramp = (cols, k) => {
    const x = clamp(k) * (cols.length - 1), i = Math.min(cols.length - 2, Math.floor(x));
    return mix(cols[i], cols[i + 1], x - i);
  };
  // the diagonal seam between the two reels: top x and bottom x as fractions of W
  const SEAM = [0.6, 0.4];

  function background(ctx, P, lt) {
    const u = UNIT, a = IMG['bg-mochi'], b = IMG['bg-spark'];
    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
    // the halves slide in from their sides, then rest (a static background costs an animated WebP nothing)
    const e = Ease.outExpo(rm(lt, -0.15, 0.55)), off = (1 - e) * 180 * u;
    const x0 = W * SEAM[0], x1 = W * SEAM[1];
    const half = (img, left, dx, dy, z, dark) => {
      if (!img) return;
      ctx.save(); ctx.beginPath();
      if (left) { ctx.moveTo(0, 0); ctx.lineTo(x0, 0); ctx.lineTo(x1, H); ctx.lineTo(0, H); }
      else { ctx.moveTo(x0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, H); ctx.lineTo(x1, H); }
      ctx.closePath(); ctx.clip();
      ctx.globalAlpha *= e;
      ctx.drawImage(img, dx - W * (z - 1) / 2, dy - H * (z - 1) / 2, W * z, H * z);
      ctx.globalAlpha = 1; ctx.fillStyle = rgba(P.bg, dark); ctx.fillRect(0, 0, W, H);
      ctx.restore();
    };
    // Mochi's lineup (its headline lifted out of frame) on the left, spark-bench's matrix on the right
    half(a, true, -off - W * 0.07, -H * 0.1, 1.2, 0.52);
    half(b, false, off, 0, 1.0, 0.18);
    // darken a band behind the title block, lighter toward the bottom so the reels show
    ctx.fillStyle = linear(ctx, 0, 0, 0, H, [[0, rgba(P.bg, 0.6)], [0.6, rgba(P.bg, 0.42)], [0.85, rgba(P.bg, 0.08)], [1, rgba(P.bg, 0)]]);
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = radial(ctx, W / 2, H * 0.38, 0, W * 0.5, [[0, rgba(P.bg, 0.55)], [1, rgba(P.bg, 0)]]); ctx.fillRect(0, 0, W, H);
    // the seam: a light line in the brand gradient
    const g = rm(lt, 0.15, 0.7);
    if (g > 0) {
      ctx.save(); ctx.globalAlpha *= Ease.outC(g);
      ctx.strokeStyle = linear(ctx, x0, 0, x1, H, [[0, P.accent], [0.5, P.accent2], [1, P.orange || P.accent2]]);
      ctx.lineWidth = 5 * u; ctx.shadowColor = rgba(P.accent2, 0.9); ctx.shadowBlur = 30 * u;
      ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(lerp(x0, x1, Ease.outExpo(g)), H * Ease.outExpo(g)); ctx.stroke();
      ctx.restore();
    }
  }

  SCENES['title'] = {
    draw(ctx, t, env) {
      const P = env.palette, lt = env.lt, u = UNIT, cx = W / 2;
      const beat = lt / env.beatSec, holdT = 1.3;
      background(ctx, P, lt);

      // kicker: rules grow out of the centre, the words decode (decoding glyphs: 3 frames at most)
      const kSize = 30 * u, kLs = 0.16 * kSize, kick = 'A CLAUDE CODE SKILL';
      const ky = H * 0.19, kp = rm(lt, 0.0, 0.13);
      if (lt > -0.01) {
        const kw = measure(ctx, kick, { size: kSize, weight: 700, fam: 'mono', ls: kLs });
        const rl = 90 * u * Ease.outExpo(rm(lt, 0.05, 0.6));
        ctx.save();
        ctx.strokeStyle = rgba(P.accent, 0.9); ctx.lineWidth = 3 * u; ctx.lineCap = 'round';
        for (const s of [-1, 1]) { const x = cx + s * (kw / 2 + 32 * u); ctx.beginPath(); ctx.moveTo(x, ky - kSize * 0.35); ctx.lineTo(x + s * rl, ky - kSize * 0.35); ctx.stroke(); }
        ctx.restore();
        text(ctx, scramble(kick, kp, 7, t), cx + kLs / 2, ky, { size: kSize, weight: 700, fam: 'mono', color: P.ink, ls: kLs, align: 'center', alpha: Ease.outC(rm(lt, 0, 0.2)) });
      }

      // title: per-glyph rise; "Showreels" in a mauve-pink-peach ramp with a sheen that crosses it on every bar line
      const tSize = 168 * u, tLs = -0.02 * tSize, title = 'Awesome Showreels', ty = H * 0.41;
      const split = title.indexOf('S'), n = title.length;
      const bar = env.barSec, sheenAt = lt < holdT ? -1 : ((lt - holdT) % bar) / 0.75;
      kinetic(ctx, title, cx, ty, lt - 0.08, {
        size: tSize, weight: 700, fam: 'display', ls: tLs, align: 'center', stagger: 0.024, dur: 0.55, rise: tSize * 0.42, blur: 12,
        glow: rgba(P.accent, 0.35), glowBlur: 50 * u,
        colorFn: i => {
          const base = i < split ? '#F2F4FF' : ramp(SHOW, (i - split) / (n - 1 - split));
          if (sheenAt < 0 || sheenAt > 1.3) return base;
          const k = Math.exp(-Math.pow(((i - split) / (n - split) - (sheenAt * 1.3 - 0.15)) / 0.09, 2));
          return i < split ? base : mix(base, '#FFFFFF', 0.55 * k);
        },
      });

      // the tagline: the README's own line
      const sSize = 60 * u, sy = H * 0.545, a = 'Any repo in.', b = 'A beat-synced showreel out.', gap = 26 * u;
      const wa = measure(ctx, a, { size: sSize, weight: 500, fam: 'sans' }), wb = measure(ctx, b, { size: sSize, weight: 600, fam: 'sans' });
      const x0 = cx - (wa + gap + wb) / 2;
      revealLine(ctx, a, x0, sy, rm(lt, 0.38, 0.9), { size: sSize, weight: 500, fam: 'sans', color: P.ink2 });
      revealLine(ctx, b, x0 + wa + gap, sy, rm(lt, 0.52, 1.05), { size: sSize, weight: 600, fam: 'sans', color: '#F2F4FF' });

      // sources: chips pop in, then one lights up per beat during the hold
      const cSize = 30 * u, cy = H * 0.69, padX = 26 * u, ch = 60 * u, cg = 18 * u;
      const ws = SOURCES.map(s => measure(ctx, s, { size: cSize, weight: 600, fam: 'mono' }) + padX * 2);
      let x = cx - (ws.reduce((p, c) => p + c, 0) + cg * (SOURCES.length - 1)) / 2;
      const on = lt >= holdT ? Math.floor(beat) % SOURCES.length : -1, onDt = (beat % 1) * env.beatSec;
      SOURCES.forEach((s, i) => {
        const e = styleSpring(lt - 0.72 - i * 0.06);
        if (e <= 0.001) { x += ws[i] + cg; return; }
        const lit = i === on ? Math.exp(-onDt * 2.2) * 0.85 + 0.15 : 0;
        const col = [P.accent, P.accent2, P.accent3, '#94E2D5', '#FAB387'][i];
        ctx.save();
        ctx.globalAlpha *= clamp(e);
        ctx.translate(x + ws[i] / 2, cy + (1 - e) * 30 * u);
        rr(ctx, -ws[i] / 2, -ch / 2, ws[i], ch, ch / 2);
        ctx.fillStyle = mix('#151522', col, 0.14 + 0.3 * lit); ctx.fill();
        ctx.strokeStyle = mix(P.line || '#313244', col, 0.35 + 0.65 * lit); ctx.lineWidth = 2.5 * u; ctx.stroke();
        text(ctx, s, 0, cSize * 0.36, { size: cSize, weight: 600, fam: 'mono', color: mix(P.ink2, '#FFFFFF', lit), align: 'center' });
        ctx.restore();
        x += ws[i] + cg;
      });

    },
  };
})();
