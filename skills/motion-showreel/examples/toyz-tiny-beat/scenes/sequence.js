// sequence (2 bars, 3 in the 30): press it and it grooves. The app's real sequencer, today's lo-fi beat, drops in large
// and starts to play in time with the reel's music: a playhead sweeps the 16 steps once a bar and every pad the app
// shows lit (kick, snare, hat, bass, lead; accents brighter) flashes as it passes. The line above it: 찍으면 바로
// 그루브가 돼요. In the hold the view leans in slowly toward the pads.
(() => {
  const T = TINY, K = 1.55, X = 152, Y = 268;
  SCENES['sequence'] = {
    draw(ctx, t, env) {
      const lt = env.lt, P = env.palette, out = env.phase.out;
      T.stage(ctx, t, { glowX: 960, glowY: 640 });
      const z = 1 + Math.min(0.06, 0.012 * Math.max(0, lt - 2));
      ctx.save(); ctx.translate(960, 640); ctx.scale(z, z); ctx.translate(-960, -640);
      const e = styleSpring(lt + 0.08, { f: 2.6, z: 0.55 });
      ctx.save(); ctx.translate(0, (1 - e) * 80); ctx.globalAlpha *= clamp(e * 1.4);
      T.sequencer(ctx, 'seq_lofi', X, Y, K, t, env, { genre: 'lofi', play: clamp((lt - 0.25) / 0.2) });
      ctx.restore(); ctx.restore();
      const w1 = kinetic(ctx, '찍으면 바로', 156, 198, lt - 0.1, { size: 84, fam: 'display', weight: 850, color: P.ink, ls: -3.4, stagger: 0.03, dur: 0.5, rise: 36, blur: 6, out: { at: env.dur - env.outSec } });
      kinetic(ctx, '그루브가 돼요.', 156 + w1 + 28, 198, lt - 0.4, { size: 84, fam: 'display', weight: 850, color: P.accent, ls: -3.4, stagger: 0.03, dur: 0.5, rise: 36, blur: 6, glow: 'rgba(198,244,50,0.35)', glowBlur: 26, out: { at: env.dur - env.outSec } });
      T.label(ctx, '02 SEQUENCE · 16 STEPS · 6 TRACKS', 1764, 120, { size: 20, align: 'right', alpha: clamp(rm(lt, 0.3, 0.6)) * (1 - out) });
    },
  };
})();
