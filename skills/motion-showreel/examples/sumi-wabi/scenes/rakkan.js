// rakkan (落款): the end card. An ensō is drawn in one breath, open at the end (the tea room's scroll, 掛物 円相);
// the name 余白庵 soaks in as one vertical column; on beat 2 the seal 「余白」 is pressed once, small, at the lower
// left of the name: the only vermilion in the reel (shitsurae: 朱は落款ひとつだけ). The booking address and the
// fictional-inn note sit small at the foot. Hold (longer cuts): the ensō dries and its halo creeps, the paper breathes.
(() => {
  const at = (env, b) => env.lt - b * env.beatSec;
  const CX = 700, CY = 520, R = 250, A0 = (150 / 180) * Math.PI, SWEEP = (332 / 180) * Math.PI;
  const pts = [];
  for (let i = 0; i <= 36; i++) {
    const u = i / 36, a = A0 + u * SWEEP, r = R * (1 + 0.024 * Math.sin(2 * a + 0.7) + 0.011 * Math.sin(3 * a + 2.1)) * (1 - 0.035 * u);
    pts.push([CX + Math.cos(a) * r, CY + Math.sin(a) * r]);
  }
  const ENSO = { key: 'rakkan-enso', pts, w: 58, press: [1.3, 1.12, 1.0, 0.9, 0.82, 0.8, 0.86, 0.94, 0.96, 0.9, 0.8, 0.66],
    dur: 1.15, ease: 'ioSine', toneMode: 'conic', cx: CX, cy: CY, a0: A0, tone: 0.96, toneEnd: 0.8, dry: 0.85, dryFrom: 0.42, streak: 40,
    end: 'taper', tail: 0.1, headW: 0.9, head: 1, side: -1, bleed: 0.75, seed: 61 };
  const NAME = '余白庵', NSIZE = 120, NLS = 0.24, NX = 1296, NTOP = 292;
  const SEAL = { x: 1226, y: 800, size: 66 };
  SCENES['rakkan'] = {
    draw(ctx, t, env) {
      const P = env.palette, lt = env.lt, cam = SUMI.cam(env, { fx: 960, fy: 540, push: 0.0016 });
      ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
      SUMI.ground(ctx, env, cam);
      SUMI.stroke(ctx, ENSO, at(env, 0) - 0.08, env);
      SUMI.vtext(ctx, NAME, NX, NTOP, at(env, 1.25), { size: NSIZE, ls: NLS, color: P.ink, stagger: 0.16, dur: 0.95 });
      const stamp = env.cues.find(q => String(q.sfx).startsWith('stamp'));
      SUMI.seal(ctx, SEAL.x, SEAL.y, SEAL.size, stamp ? lt - stamp.lt : at(env, 2), env);
      // the foot: booking address (the only romaji the guide allows) and the fictional-inn note, small
      const foot = Ease.outQuint(rm(at(env, 1.5), 0, 0.9));
      if (foot > 0) {
        const lift = (1 - foot) * 6;
        text(ctx, 'yohaku-an.example', W - 152, 986 + lift, { size: 24, fam: 'display', color: P.ink2, align: 'right', ls: 1.2, alpha: foot });
        text(ctx, '※ 余白庵は、作例のための架空の宿です。', 152, 986 + lift, { size: 22, fam: 'display', color: P.muted, ls: 1, alpha: foot });
      }
      SUMI.end(ctx);
    },
  };
})();
