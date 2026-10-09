// fan: the room behind the door. The bandstand's shell of stepped gold arches is already lit when the door opens
// (portalFlash shows this scene in the doorway before the bar line); on the downbeat the mark opens, seven gold ribs
// spreading from one point with emerald between them, and the name lands in gold leaf from the centre outward, then
// the subline with its rules. The arches are "lit one after another, from the inside out, in time" (house style): a
// wave on every beat and a lighter one on the swung 'and'. Out-phase: the mark grows into the full-frame fan that
// closes over the cut (the next scene opens it again).
(() => {
  const at = (env, b) => env.lt - b * env.beatSec;
  const CX = W / 2, PIV = 604, MR = 236, APRON = 618;
  const ARCH_R = [296, 352, 408, 464, 520];
  const WORD = 'THE EMERALD FAN', SUB = 'SUPPER CLUB & JAZZ ROOM';

  // a light wave through the arches: on each beat from the inside out, a lighter one on the swung 'and'
  function archLight(env, i) {
    if (env.lt < -2 * env.beatSec) return 0;
    const b = env.lt / env.beatSec, f = b - Math.floor(b), d = i * 0.07;
    const w = (x) => (x >= 0 ? Math.exp(-x * 7) : 0);
    return Math.max(w((f - d) * env.beatSec * 4), 0.5 * w((f - FAN.SWING - d) * env.beatSec * 4), 0.35 * w((f + 1 - d) * env.beatSec * 4));
  }
  function spotlights(ctx, P, lt) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const s of [-1, 1]) {
      const ox = CX + s * 1060, oy = -80, a = Math.PI / 2 + s * (0.62 + 0.05 * Math.sin(lt * 0.9 + (s > 0 ? 1.2 : 0)));
      const len = 1500, spread = 0.13;
      ctx.beginPath(); ctx.moveTo(ox, oy);
      ctx.lineTo(ox + Math.cos(a - spread) * len, oy + Math.sin(a - spread) * len); ctx.lineTo(ox + Math.cos(a + spread) * len, oy + Math.sin(a + spread) * len); ctx.closePath();
      ctx.fillStyle = radial(ctx, ox, oy, 40, len, [[0, rgba(P.goldLight, 0.13)], [0.6, rgba(P.goldLight, 0.04)], [1, rgba(P.goldLight, 0)]]);
      ctx.fill();
    }
    ctx.restore();
  }

  SCENES['fan'] = {
    draw(ctx, t, env) {
      const P = env.palette, lt = env.lt, bs = env.beatSec, out = env.phase.out;
      FAN.ground(ctx, env, P, { liftY: PIV - 40, liftR: 900, alpha: 0.075, rays: 48 });
      // warm glow behind the shell, breathing with the music
      softBlob(ctx, CX, PIV - 80, 760, mix(P.goldShade, P.bg, 0.2), 0.55 + 0.1 * FAN.swingPulse(env, 6));
      spotlights(ctx, P, lt);
      FAN.dust(ctx, lt + 20, P, { n: 46, y0: 60, y1: 980, alpha: 0.8, seed: 21, speed: 18 });
      // the shell: stepped arches, drawn from the crown, lit from the inside out
      ARCH_R.forEach((r, i) => {
        const half = FAN.archHalf(CX, APRON, r, 0, 18);
        const L = archLight(env, i);
        FAN.gildMirror(ctx, half, CX, 1, P, { lw: 2.2, alpha: 0.38 + 0.62 * L, glow: 0.15 + 0.75 * L, glowBlur: 18, nib: false });
        if (i % 2 === 0) FAN.gildMirror(ctx, FAN.archHalf(CX, APRON, r + 12, 0, 8), CX, 1, P, { lw: 0.9, alpha: 0.3 + 0.4 * L, nib: false });
      });
      // stage apron: a stepped double rule
      const ua = Ease.outQuint(rm(lt, -1.6 * bs, -0.2 * bs));
      FAN.gildMirror(ctx, [[CX, APRON], [CX + 640, APRON], [CX + 640, APRON + 14], [CX + 676, APRON + 14]], CX, ua, P, { lw: 2.6, nib: false });
      FAN.gildMirror(ctx, [[CX, APRON + 12], [CX + 610, APRON + 12]], CX, ua, P, { lw: 1, nib: false });
      // the mark: a closed bundle through the doorway, opening on the downbeat (a firm spring: f 2.2, z 0.82)
      const SP = env.style.motion.spring || {}, open = clamp(0.035 + 0.965 * spring(at(env, 0.25), SP.f ?? 2.2, SP.z ?? 0.82), 0, 1.04);
      const grow = FAN.inQuint(out) * 0.75 + Ease.inC(out) * 0.25;        // out-phase: the mark becomes the full-frame fan
      const gy = lerp(PIV, FAN.IRIS.cy, grow), gr = lerp(MR, FAN.IRIS.R, grow);
      let glint = 0;
      onBars(env, 1, (i, dt) => { glint = rm(dt, 0, 0.9); });
      if (!glint) glint = rm(at(env, 3), 0, 0.9);
      softBlob(ctx, CX, PIV - MR * 0.45, MR * 1.5, P.accent, 0.12 * Ease.outC(rm(lt, 0, 0.6)));
      FAN.mark(ctx, CX, gy, gr, Math.min(1, open), P, { inlay: [0.34, 0.56, 0.78], ribW: lerp(MR * 0.04, 10, grow), glint: grow > 0.02 ? 0 : glint, base: 1 - grow });
      // the name in gold leaf, centre-out; the subline and its rules
      const size = fitSize(ctx, WORD, 1360, { size: 132, weight: 400, fam: 'display', ls: 132 * 0.08 });
      let sheen = rm(at(env, 3.5), 0, 0.9);
      onBars(env, 1, (i, dt) => { sheen = rm(dt - 0.25 * bs, 0, 0.9); });
      const fade = 1 - Ease.inQ(rm(out, 0, 0.7));
      FAN.text(ctx, WORD, CX, 790, { size, fam: 'display', ls: size * (STYLE.type.tracking || 0.08), gold: true, palette: P, lt: at(env, 1), stagger: 0.05, dur: 0.62, squeeze: 0.8, sheen, alpha: fade, glowA: 0.28 });
      const ls = FAN.label(ctx, SUB, CX, 868, { size: 26, color: P.ink, lt: at(env, 2.5), stagger: 0.025, dur: 0.5, alpha: fade });
      const ur = Ease.ioC(rm(at(env, 2.5), 0.1, 0.1 + 1.1 * bs));
      if (ur > 0) {
        FAN.gild(ctx, [[CX - ls.w / 2 - 30, 859], [CX - ls.w / 2 - 230, 859]], ur, P, { lw: 1.6, alpha: fade });
        FAN.gild(ctx, [[CX + ls.w / 2 + 30, 859], [CX + ls.w / 2 + 230, 859]], ur, P, { lw: 1.6, alpha: fade });
        for (const s of [-1, 1]) {
          const k = Ease.outBack(rm(ur, 0.85, 1), 2), x = CX + s * (ls.w / 2 + 238);
          if (k > 0) { ctx.save(); ctx.globalAlpha *= fade; ctx.translate(x, 859); ctx.rotate(Math.PI / 4); ctx.scale(k, k); ctx.fillStyle = P.accent; ctx.fillRect(-5, -5, 10, 10); ctx.restore(); }
        }
      }
      // the full-frame fan closes over the cut (identical to the next scene's first frame)
      if (out > 0.82) withAlpha(ctx, rm(out, 0.82, 1), () => FAN.irisCover(ctx, 1, P));
    },
  };
})();
