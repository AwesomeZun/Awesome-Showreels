// sound (feat-sound.webp): every hit is a cue in the plan. Three bars of the playful-app example's real 30-s
// soundtrack (bars 5-7, the app scene: music-30.wav from audio/arrange.py), decoded to a waveform and a spectrum by
// tools/readme_data.py, played as a DAW loop region at 1x (real time). Each SFX cue of the cut plan (cut-30.json) is
// a flag; it fires when the playhead reaches its hits and shows the offset audio/verify_sync.py measured for it. The
// loop is the window itself (6.0 s = 3 bars at 120 BPM, the same tempo as this reel), so the playhead wraps on bar 5.
// make_webp.mjs opens the WebP on a frame just after the first cue pop (its poster).
(() => {
  const WX = 96, WW = 1728, WY = 150, WH = 470, MID = 418, AMP = 150;
  const SPX = 96, SPY = 660, SPW = 1004, SPH = 372;
  const STX = 1132, STW = 692;
  const LABEL = { drawon: 'drawon', keytap: 'keytap', send: 'send', ding: 'ding ×4', confirm: 'confirm', pop: 'pop ×4' };

  SCENES['sound'] = {
    draw(ctx, t, env) {
      const P = env.palette, L = KIT.loop(env), u = L.u;
      const D = ASSET('data/sound.json');
      KIT.stage(ctx, P);
      KIT.header(ctx, P, { index: '04', label: 'SOUND ON THE BEAT' });
      if (!D) return;
      const dur = D.window[1] - D.window[0], xOf = (s) => WX + 40 + (s / dur) * (WW - 80);

      // ── waveform panel: bar lines, beat ticks, the loop region, the lit trail behind the playhead
      KIT.panel(ctx, WX, WY, WW, WH, { r: 20, fill: rgba(P.bg2, 0.94) });
      const px = xOf(u);
      for (let b = 0; b <= dur / D.beatSec + 1e-6; b++) {
        const x = xOf(b * D.beatSec), bar = b % 4 === 0;
        ctx.fillStyle = rgba(P.ink, bar ? 0.18 : 0.07); ctx.fillRect(Math.round(x) - 1, WY + 150, bar ? 3 : 2, WH - 190);
        if (bar && b < dur / D.beatSec) text(ctx, `bar ${Math.round(D.window[0] / D.barSec) + b / 4 + 1}`, x + 14, WY + WH - 26, { size: 32, weight: 600, fam: 'mono', color: P.muted });
      }
      const env0 = D.env, n = env0.peak.length, step = (WW - 80) / n, TRAIL = 1.6;
      // every hit sends a light through the waveform from where it lands (it fades over 0.45 s)
      const recent = D.cues.flatMap(c => c.hits).map(h => [h, u - h]).filter(([, d]) => d >= 0 && d < 0.45);
      for (const [arr, scale, aLit, aRest] of [[env0.peak, 1, 0.45, 0.14], [env0.rms, 1.35, 1, 0.3]]) {
        for (let i = 0; i < n; i++) {
          const ti = i * env0.hop, x = WX + 40 + i * step, a = Math.min(1, (arr[i] / 1000) * scale) * AMP;
          const behind = (((u - ti) % dur) + dur) % dur, k = behind < TRAIL ? Ease.inQ(1 - behind / TRAIL) : 0;
          let fl = 0;
          for (const [h, d] of recent) fl = Math.max(fl, Math.exp(-d * 6) * Math.exp(-Math.abs(ti - h) / (0.12 + 0.9 * d)));
          const col = mix(mix(mix(P.accent3, P.accent, i / n), mix(P.accent, P.accent2, i / n), k), '#FFFFFF', 0.55 * fl);
          ctx.fillStyle = rgba(col, Math.min(1, lerp(aRest, aLit, k) + 0.6 * fl));
          ctx.fillRect(x, MID - a * (1 + 0.12 * fl), Math.max(1.5, step - 0.6), 2 * a * (1 + 0.12 * fl));
        }
      }
      // cue flags: a tag per cue on two rows, a diamond per hit on the baseline; a hit fires when the playhead reaches
      // it. The measured offset is shown for the cue that fired last only, so labels never stack.
      const fired = D.cues.map(c => { const ds = c.hits.map(h => u - h).filter(d => d >= 0); return ds.length ? Math.min(...ds) : 99; });
      const last = fired.reduce((a, d, i) => (d < fired[a] ? i : a), 0);
      D.cues.forEach((c, i) => {
        const x = xOf(c.t), row = i % 2, fy = WY + 52 + row * 62;
        const since = fired[i], pop = since < 0.6 ? Math.exp(-since * 5) : 0;
        ctx.fillStyle = rgba(P.accent3, 0.3 + 0.55 * pop); ctx.fillRect(Math.round(x) - 1.5, fy + 24, 3, WY + WH - 92 - fy);
        const w = KIT.tag(ctx, LABEL[c.name] || c.name, x - 2, fy, { size: 34, h: 52, padX: 14, r: 8, color: pop > 0.05 ? P.bg : KIT.bright(),
          bg: pop > 0.05 ? mix(P.accent3, '#FFFFFF', 0.2 * pop) : rgba(P.surface, 0.96), stroke: rgba(P.accent3, 0.5 + 0.5 * pop) });
        if (pop > 0.02) {
          ctx.save(); ctx.shadowColor = P.accent3; ctx.shadowBlur = 36 * pop; rr(ctx, x - 2, fy - 26, w, 52, 8); ctx.strokeStyle = rgba(P.accent3, pop); ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
        }
        if (i === last && since < 99 && c.offsetMs !== null && c.offsetMs !== undefined) {
          const off = Math.abs(c.offsetMs) < 0.05 ? 0 : c.offsetMs, a = clamp(since / 0.08) * (since < 1.6 ? 1 : 1 - clamp((since - 1.6) / 0.3));
          text(ctx, `${off >= 0 ? '+' : ''}${off.toFixed(1)} ms`, x + w + 14, fy + 12, { size: 34, weight: 700, fam: 'mono', color: P.ok, alpha: a });
        }
        for (const h of c.hits) {
          const hx = xOf(h), d = u - h, k = d >= 0 && d < 0.5 ? 1 - d / 0.5 : 0, hy = WY + WH - 82;
          ctx.save(); ctx.translate(hx, hy); ctx.rotate(Math.PI / 4);
          ctx.fillStyle = k > 0 ? mix(P.accent3, '#FFFFFF', 0.5 * k) : P.accent3; ctx.fillRect(-9, -9, 18, 18); ctx.restore();
          if (k > 0) { ctx.save(); ctx.strokeStyle = rgba(P.accent3, k); ctx.lineWidth = 3.5; circle(ctx, hx, hy, 14 + 56 * (1 - k)); ctx.stroke(); ctx.restore(); }
        }
      });
      // loop brackets and the playhead (wraps on the bar line: the window is the loop)
      ctx.fillStyle = rgba(P.ok, 0.75);
      for (const [x, d] of [[xOf(0), 1], [xOf(dur), -1]]) { ctx.fillRect(x - 2, WY + 26, 4, WH - 52); ctx.fillRect(d > 0 ? x : x - 22, WY + 26, 22, 4); ctx.fillRect(d > 0 ? x : x - 22, WY + WH - 30, 22, 4); }
      ctx.save(); ctx.shadowColor = P.accent; ctx.shadowBlur = 26; ctx.fillStyle = KIT.bright();
      ctx.fillRect(px - 2, WY + 20, 4, WH - 40); ctx.restore();

      // ── spectrum: 36 log bands of the same audio at the playhead (20 ms STFT frames), with decaying peak caps
      KIT.panel(ctx, SPX, SPY, SPW, SPH, { r: 20, fill: rgba(P.bg2, 0.94) });
      KIT.label(ctx, 'SPECTRUM', SPX + 30, SPY + 54, { size: 32, color: P.ink2 });
      text(ctx, '40 Hz → 16 kHz', SPX + SPW - 30, SPY + 54, { size: 32, weight: 600, fam: 'mono', color: P.muted, align: 'right' });
      const S = D.spec, nb = S.bands.length, bw = (SPW - 60) / nb, base = SPY + SPH - 30, maxH = SPH - 110;
      const fr = (tt, j) => { const nf = S.frames.length, f = ((tt / S.hop) % nf + nf) % nf, i = Math.floor(f), k = f - i; return S.frames[i][j] * (1 - k) + S.frames[(i + 1) % nf][j] * k; };
      for (let j = 0; j < nb; j++) {
        const v = fr(u, j) / 100, x = SPX + 30 + j * bw;
        let peak = 0;
        for (let d = 0; d <= 0.6; d += 0.02) peak = Math.max(peak, (fr(u - d, j) / 100) - d * 0.9);
        const h = Math.max(4, v * maxH);
        ctx.fillStyle = linear(ctx, 0, base - maxH, 0, base, [[0, P.accent2], [0.5, P.accent], [1, P.accent3]]);
        rr(ctx, x + 3, base - h, bw - 6, h, 4); ctx.fill();
        ctx.fillStyle = KIT.bright(); ctx.fillRect(x + 3, base - Math.max(h, peak * maxH) - 8, bw - 6, 4);
      }

      // ── measured: sync and loudness from verify_sync.py and the arranger's sidecar
      KIT.panel(ctx, STX, SPY, STW, SPH, { r: 20, fill: rgba(P.bg2, 0.94) });
      const sy = D.sync, pass = sy.pass;
      KIT.label(ctx, `${D.bpm} BPM · ${D.preset}`, STX + 30, SPY + 54, { size: 32, color: P.ink2, track: 0.06 });
      KIT.tag(ctx, pass ? 'PASS' : 'FAIL', STX + STW - 30, SPY + 44, { align: 'right', size: 34, h: 56, padX: 18, color: P.bg, bg: pass ? P.ok : P.deny, stroke: false, weight: 700 });
      const stat = (x, y, big, unit, sub) => {
        text(ctx, big, x, y, { size: 76, weight: 700, fam: 'display', color: KIT.bright(), ls: -1 });
        const bw2 = measure(ctx, big, { size: 76, weight: 700, fam: 'display', ls: -1 });
        text(ctx, unit, x + bw2 + 10, y, { size: 34, weight: 700, fam: 'mono', color: P.accent });
        text(ctx, sub, x, y + 46, { size: 32, weight: 500, fam: 'mono', color: P.muted });
      };
      stat(STX + 30, SPY + 166, `${sy.measured}/${sy.cues}`, 'cues', 'in sync');
      stat(STX + 372, SPY + 166, sy.maxMs.toFixed(1), 'ms', 'max offset');
      stat(STX + 30, SPY + 300, D.loudness.lufs.toFixed(1), 'LUFS', 'loudness');
      stat(STX + 372, SPY + 300, D.loudness.truePeak.toFixed(1), 'dBTP', 'true peak');
    },
  };
})();
