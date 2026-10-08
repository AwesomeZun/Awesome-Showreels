// ship (feat-ship.webp): an MP4 per cut, one HTML for all. Left: the two MP4s this repository ships, described by
// ffprobe (assets/data/ship.json). Right: the research-cli example's single-file HTML player, playing: tools/prepare.mjs
// pressed the player's own keys (1, 2, 3 select the 15, 30 and 60-s cuts) and stepped it with ArrowRight, so every
// picture in the window, its scrubber and its timecode are the player's own screenshots, 1/24 s apart, shown in real
// time. A key goes down on beats 3, 7 and 11 and the window switches to that cut; the loop starts and ends inside
// the 15-s cut.
(() => {
  const WIN = { x: 544, y: 150, w: 1280 }, BAR = 60, LCOL = { x: 96, w: 408 };
  const PRESS = [{ u: 1.5, k: 1 }, { u: 3.5, k: 2 }, { u: 5.5, k: 0 }];   // loop seconds -> cut index
  const SEG = 2.0, RATE = 24, LAST = 47;                                // seconds per cut; screenshots per second
  const mb = (b) => (b / 1e6).toFixed(1) + ' MB';

  function cutAt(u) {                                                   // the active cut, seconds since its key press
    for (let j = PRESS.length - 1; j >= 0; j--) if (u >= PRESS[j].u) return { k: PRESS[j].k, since: u - PRESS[j].u, prev: PRESS[(j + 2) % 3].k };
    return { k: PRESS[2].k, since: u + 6 - PRESS[2].u, prev: PRESS[1].k };
  }
  function shot(ctx, cut, s, x, y, w, h) {                               // the player at s seconds into its segment
    const i = Math.max(0, Math.min(LAST, Math.floor(s * RATE + 1e-6))), im = IMG[`ex/play/${cut}-${String(i).padStart(2, '0')}`];
    if (im) ctx.drawImage(im, x, y, w, h);
  }

  SCENES['ship'] = {
    portal(t, env) { return { x: WIN.x, y: WIN.y + BAR, w: WIN.w, h: Math.round(WIN.w * 9 / 16), r: 12 }; },
    draw(ctx, t, env) {
      const P = env.palette, L = KIT.loop(env), u = L.u;
      const D = ASSET('data/ship.json');
      KIT.stage(ctx, P);
      KIT.header(ctx, P, { index: '06', label: 'DELIVERY, VERIFIED' });
      if (!D) return;
      const pl = D.players[0], cuts = pl.cuts, st = cutAt(u);

      // ── left: the MP4s (ffprobe of the committed files), exact names
      text(ctx, 'MP4 per cut', LCOL.x, 196, { size: 32, weight: 700, fam: 'mono', color: P.ink2, ls: 3 });
      D.mp4.forEach((m, i) => {
        const x = LCOL.x, y = 220 + i * 218, w = LCOL.w, h = 198, cut = m.name.indexOf('-v');
        KIT.panel(ctx, x, y, w, h, { r: 18 });
        text(ctx, m.name.slice(0, cut + 1), x + 26, y + 52, { size: 32, weight: 700, fam: 'mono', color: KIT.bright() });
        text(ctx, m.name.slice(cut + 1), x + 26, y + 92, { size: 32, weight: 700, fam: 'mono', color: KIT.bright() });
        text(ctx, `${m.height}p${Math.round(m.fps)} · AAC ${m.audioKbps}k`, x + 26, y + 140, { size: 32, weight: 500, fam: 'mono', color: P.ink2 });
        text(ctx, `${m.seconds.toFixed(0)} s · ${mb(m.bytes)}`, x + 26, y + 180, { size: 32, weight: 500, fam: 'mono', color: P.ink2 });
        const sh = (((u - 0.4 - i * 0.3) % 3) + 3) % 3;                    // a sheen every 1.5 bars
        if (sh < 1) { ctx.save(); rr(ctx, x, y, w, h, 18); ctx.clip(); const sx = lerp(x - 240, x + w + 240, Ease.ioQ(sh));
          ctx.fillStyle = linear(ctx, sx - 140, 0, sx + 140, 0, [[0, 'rgba(255,255,255,0)'], [0.5, 'rgba(255,255,255,0.09)'], [1, 'rgba(255,255,255,0)']]); ctx.fillRect(x, y, w, h); ctx.restore(); }
      });

      // ── the player's keys: 1 2 3 select a cut
      text(ctx, 'player keys', LCOL.x, 712, { size: 32, weight: 700, fam: 'mono', color: P.ink2, ls: 3 });
      const beat = L.beat, pulse = Math.exp(-(((u % beat) + beat) % beat) * 8);
      cuts.forEach((c, i) => {
        const x = LCOL.x + 52 + i * 152, y = 800;
        const down = st.k === i && st.since < 0.18 ? 1 - st.since / 0.18 : 0, lit = st.k === i ? 0.8 + 0.2 * pulse : 0;
        KIT.keycap(ctx, String(i + 1), x, y, down, { lit, w: 104, h: 104 });
        text(ctx, `${c} s`, x, y + 106, { size: 34, weight: 700, fam: 'mono', color: st.k === i ? P.accent : P.muted, align: 'center' });
      });

      // ── right: the real player, window chrome drawn around its own screenshots
      const ih = Math.round(WIN.w * 9 / 16), H0 = BAR + ih;
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 70; ctx.shadowOffsetY = 30;
      rr(ctx, WIN.x, WIN.y, WIN.w, H0, 18); ctx.fillStyle = '#1B1B29'; ctx.fill(); ctx.restore();
      rr(ctx, WIN.x + 1, WIN.y + 1, WIN.w - 2, H0 - 2, 18); ctx.strokeStyle = rgba(P.ink, 0.16); ctx.lineWidth = 2; ctx.stroke();
      ['#F38BA8', '#F9E2AF', '#A6E3A1'].forEach((c, i) => { circle(ctx, WIN.x + 30 + i * 26, WIN.y + BAR / 2, 8); ctx.fillStyle = c; ctx.fill(); });
      text(ctx, pl.name, WIN.x + 116, WIN.y + BAR / 2 + 11, { size: 32, weight: 600, fam: 'mono', color: P.ink2 });
      KIT.tag(ctx, `${cuts[st.k]} s cut`, WIN.x + WIN.w - 18, WIN.y + BAR / 2, { align: 'right', size: 32, h: 46, padX: 14, color: KIT.bright(), bg: rgba(P.accent, 0.24), stroke: rgba(P.accent, 0.7) });
      ctx.save(); ctx.beginPath(); ctx.roundRect(WIN.x, WIN.y + BAR, WIN.w, ih, [0, 0, 18, 18]); ctx.clip();
      // the switch is a fast wipe with a lit edge; the outgoing cut keeps playing under it
      // a slow push-in on each cut while it plays (the camera, not the player: the screenshots stay unaltered)
      const wk = Ease.ioC(clamp(st.since / 0.12)), ex = WIN.x + WIN.w * wk;          // a 3-frame snap on the key press
      const push = (s) => { const z = 1 + 0.05 * Ease.outQ(clamp(s / SEG)); ctx.translate(WIN.x + WIN.w / 2, WIN.y + BAR + ih / 2); ctx.scale(z, z); ctx.translate(-WIN.x - WIN.w / 2, -WIN.y - BAR - ih / 2); };
      if (wk < 1) { ctx.save(); push(SEG); shot(ctx, cuts[st.prev], SEG + st.since, WIN.x, WIN.y + BAR, WIN.w, ih); ctx.restore(); }
      ctx.save(); ctx.beginPath(); ctx.rect(WIN.x, WIN.y + BAR, Math.max(0, ex - WIN.x), ih); ctx.clip();
      push(st.since); shot(ctx, cuts[st.k], st.since, WIN.x, WIN.y + BAR, WIN.w, ih); ctx.restore();
      if (wk > 0 && wk < 1) { ctx.save(); ctx.fillStyle = P.accent; ctx.shadowColor = P.accent; ctx.shadowBlur = 30; ctx.fillRect(ex - 3, WIN.y + BAR, 6, ih); ctx.restore(); }
      ctx.restore();

      // ── verified: what the build checks
      const ok = (x, s) => { icon(ctx, 'check', x + 16, 1000, 34, P.ok); text(ctx, s, x + 48, 1012, { size: 34, weight: 600, fam: 'sans', color: P.ink }); return measure(ctx, s, { size: 34, weight: 600, fam: 'sans' }) + 48; };
      const w1 = ok(WIN.x, `${cuts.length} cuts + their music in one ${mb(pl.bytes)} HTML`);
      ok(WIN.x + w1 + 40, 'plays offline, from any folder');
    },
  };
})();
