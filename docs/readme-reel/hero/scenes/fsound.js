// fsound (feat-sound.webp, 3 bars): scored on the beat, fourteen times. Six seconds of each example's real soundtrack
// (the loudness envelope of build/music-<cut>.wav, 60 points a second) as one row; a playhead runs through all rows
// in real time (the loop is exactly six seconds), the played part lit in the example's accent. Each row carries its
// preset, tempo, key and the sync check verify_sync.py measured: cues on time, the worst offset. The case studies'
// soundtracks are not part of this repo and are not drawn.
(() => {
  const X0 = 600, X1 = 1590;
  SCENES['fsound'] = {
    draw(ctx, t, env) {
      const P = env.palette, K = window.KIT, lp = K.loop(env), D = ASSET('data/features.json');
      K.stage(ctx, P);
      K.header(ctx, P, { index: '04', label: 'SOUND ON THE BEAT · 14 SCORES' });
      const rows = D.examples, RH = 60, Y0 = 160, frac = lp.u / lp.L, px = X0 + (X1 - X0) * frac;
      rows.forEach((d, i) => {
        const y = Y0 + i * RH, mid = y + RH / 2 - 4, acc = d.swatches[2], env_ = d.env, n = Math.min(360, env_.length);
        K.label(ctx, d.id, 96, mid + 7, { size: 20, track: 0.02, color: P.ink2 });
        K.label(ctx, `${d.preset} · ${d.bpm}`, 340, mid + 7, { size: 18, track: 0, color: P.muted });
        for (let k = 0; k < n; k += 2) {
          const x = X0 + (X1 - X0) * (k / 360), a = env_[k], h = 4 + a * (RH - 18);
          ctx.fillStyle = x <= px ? acc : rgba(P.ink, 0.22);
          ctx.fillRect(x, mid - h / 2, 4, h);
        }
        const s = d.sync, ok = s && s.fails === 0;
        K.label(ctx, s ? `${ok ? '✓' : '✗'} ${s.cues}/${s.cues} · ≤${Math.ceil(s.maxMs)} ms` : '-', 1620, mid + 7, { size: 19, track: 0, color: ok ? P.ok : P.deny });
      });
      // the playhead
      ctx.fillStyle = rgba('#FFFFFF', 0.9); ctx.fillRect(px - 1.5, Y0 - 10, 3, rows.length * RH + 6);
      ctx.save(); ctx.globalCompositeOperation = 'screen'; softBlob(ctx, px, Y0 + rows.length * RH / 2, 120, P.accent, 0.12); ctx.restore();
      K.label(ctx, 'first 6 s of each short cut, real time · every cue measured within one frame · -14 LUFS', 96, 1046, { size: 20, track: 0.02, color: P.muted });
    },
  };
})();
