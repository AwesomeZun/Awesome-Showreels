// mix (2 bars, the 30 only): out as a WAV. The app's real mixer rises along the foot (six strips, sends, master) with
// its level meters breathing on the beat; top right a WAV card draws its waveform on (the loop rendered offline, in
// the app's words 16-bit PCM stereo 44.1 kHz) and its button is pressed. Headline: 만든 비트는 / WAV 한 파일로.
(() => {
  const T = TINY;
  SCENES['mix'] = {
    draw(ctx, t, env) {
      const lt = env.lt, P = env.palette, B = env.beatSec, out = env.phase.out;
      T.stage(ctx, t, { glowX: 1400, glowY: 300 });
      const e = styleSpring(lt + 0.05, { f: 2.4, z: 0.62 });
      ctx.save(); ctx.globalAlpha *= clamp(e * 1.4); ctx.translate(0, (1 - e) * 100); T.draw(ctx, 'mix', 96, 560, 1.34); ctx.restore();
      // the WAV card
      const cx = 1060, cy = 150, cw = 760, ch = 330, ce = styleSpring(lt - 0.2, { f: 2.4, z: 0.6 });
      ctx.save(); ctx.globalAlpha *= clamp((lt - 0.2) / 0.2); ctx.translate(0, (1 - ce) * -40);
      rr(ctx, cx, cy, cw, ch, 16); ctx.fillStyle = '#111113'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1.5; ctx.stroke();
      T.label(ctx, 'WAV EXPORT', cx + 32, cy + 52, { size: 22, color: P.accent });
      T.label(ctx, '16-BIT · STEREO · 44.1 KHZ', cx + cw - 32, cy + 52, { size: 20, align: 'right' });
      const wp = clamp((lt - 2 * B) / (2 * B)), mid = cy + 170, ww = cw - 64;
      ctx.save(); ctx.beginPath(); ctx.rect(cx + 32, cy + 80, ww * wp, 180); ctx.clip();
      for (let i = 0; i < 180; i++) {
        const x = cx + 32 + i * ww / 180, s = i % 45, env1 = Math.exp(-s / 9) * 0.95 + 0.12 + 0.18 * hash(i * 1.7), hh = 78 * env1 * (0.55 + 0.45 * hash(i * 3.1));
        ctx.fillStyle = s < 4 ? '#E2FF7A' : '#9EC424'; ctx.fillRect(x, mid - hh, ww / 180 * 0.6, hh * 2);
      }
      ctx.restore();
      if (wp > 0 && wp < 1) { ctx.fillStyle = '#F3F3F1'; ctx.fillRect(cx + 32 + ww * wp, cy + 80, 2, 180); }
      const pr = 4.5 * B, press = lt >= pr ? Math.exp(-(lt - pr) * 6) : 0;
      rr(ctx, cx + cw - 220, cy + ch - 62, 188, 44, 10); ctx.fillStyle = press > 0.05 ? '#E2FF7A' : '#C6F432'; ctx.fill();
      ctx.fillStyle = '#0D1100'; ctx.font = `800 22px ${FAM.mono}`; ctx.textAlign = 'center'; ctx.fillText('WAV ↓', cx + cw - 126, cy + ch - 33); ctx.textAlign = 'left';
      ctx.restore();
      T.headline(ctx, ['만든 비트는', 'WAV 한 파일로.'], 100, 220, lt - 0.2, { size: 88, gap: 100, out: { at: env.dur - env.outSec } });
    },
  };
})();
