// finale: the end card as a flat lay. Opens on balm's last frame (oat paper alone); the leaf light comes back.
// Nothing grows: fresh-picked leaves are laid on the paper by hand around the seal, one per half beat from beat 1,
// each dropping the last centimetre (its shadow tightens under it, a small settle in rotation), in two loose
// clusters (left, right), like leaves set out on a tasting table. The
// seal is pressed on 1, the wordmark soaks in on 2, the tagline on 3, the disclaimer on 4. Hold: the light breathes
// over the table and loose leaves drift down across the card.
(() => {
  const MF = window.MISTFOLD;
  const at = (env, b) => env.lt - b * env.beatSec;
  const SX = 960, SY = 330, SR = 118, WR = 206;               // the seal and the wreath's radius
  // [x, y, angle, length, width, young?, beat]: leaf bases sit just outside the seal and point away from it
  const LAY = [
    [742, 402, 2.72, 236, 64, 0, 1.0], [768, 268, 3.44, 214, 58, 1, 1.5], [812, 478, 2.5, 172, 50, 0, 2.5],
    [1176, 258, -0.42, 230, 62, 0, 1.25], [1152, 382, 0.3, 206, 57, 1, 2.0], [1104, 182, -0.8, 186, 52, 0, 3.0],
  ];
  function laid(ctx, P, spr, x, y, ang, beatT, alpha) {
    const u = clamp(beatT / 0.45), e = Ease.outC(u);
    if (u <= 0) return;
    const lift = 1 - e, settle = (1 - e) * 0.16 + (u >= 1 ? 0 : 0) + wob(beatT, 1.4, 6) * 0.03;
    // shadow: wide and soft while the leaf is in the air, tight and dark once it lies on the paper
    ctx.save(); ctx.globalAlpha *= alpha * (0.18 + 0.1 * e); ctx.filter = `brightness(0.25) blur(${(3 + 12 * lift).toFixed(1)}px)`;
    MF.drawLeaf(ctx, spr, x + 5 + 26 * lift, y + 7 + 30 * lift, ang + settle, 1, 1, 1);
    ctx.restore();
    MF.drawLeaf(ctx, spr, x - 4 * lift, y - 14 * lift, ang + settle, 1 + 0.07 * lift, 1 + 0.07 * lift, alpha * Ease.outC(clamp(u * 2.5)));
  }
  SCENES['finale'] = {
    draw(ctx, t, env) {
      const P = env.palette, lt = env.lt, bs = env.beatSec, T = lt / bs;
      MF.paper(ctx, 'oat');
      const back = Ease.outC(rm(lt, 0, 2 * bs));
      MF.light(ctx, lt, { a: 0.075 * back, sun: [960, 300, 820], sunA: 0.14 * back });
      MF.hills(ctx, lt, { a: 0.55 * back, y0: 780 });
      // a sage wash pooled behind the wreath
      const wa = Ease.outC(rm(T, 0.5, 3));
      if (wa > 0) {
        ctx.save(); ctx.globalAlpha = wa;
        ctx.drawImage(MF.memo('finale:pool', () => {
          const b = makeBuf(W, H);
          MF.wcWash(b.g, MF.washPath(SX, SY + 10, WR * 1.25, 31, 0, { amp: 0.12, fringe: 0.04 }), mix(P.accent2, P.liquor, 0.2), { a: 0.2, box: [SX - 320, SY - 320, 640, 640], seed: 5, edge: mix(P.accent2, P.accent, 0.5), edgeA: 0.35 });
          return b.c;
        }), 0, 0);
        ctx.restore();
      }
      // the flat lay: leaves laid around the seal
      const look = MF.look(false);
      LAY.forEach(([x, y, ang, L, w, young, b], i) => {
        const spr = MF.leafSprite(`finale:lay:${i}`, L, w, {
          fill: young ? look.young : look.leaf, fill2: young ? look.young2 : look.leaf2, edge: young ? look.leaf : look.edge, ink: look.ink, inkA: look.inkA,
          seed: 60 + i, hairs: !!young, teeth: young ? 10 : 13, serr: young ? 0.05 : 0.06, bend: (i % 2 ? -1 : 1) * 0.05,
        });
        laid(ctx, P, spr, x, y, ang, (lt - b * bs) / bs, 1);
      });
      // the seal is pressed on 1: down from 1.08x, the ink spreads, a soft ring in the paper
      const press = at(env, 1), come = rm(T, 0.4, 1);
      if (come > 0) {
        const s = lerp(1.08, 1, Ease.ioC(come)), a = Ease.outC(clamp(come * 1.6));
        if (press < 0) { ctx.save(); ctx.filter = 'blur(10px)'; ctx.fillStyle = rgba(P.stem, 0.2 * a); circle(ctx, SX + 10, SY + 14, SR * s); ctx.fill(); ctx.restore(); }
        MF.seal(ctx, SX, SY, SR * s, { col: P.accent3, a: press < 0 ? 0.35 * a : 0.96, press: press >= 0 ? press : undefined, multiply: true });
        if (press > 0 && press < 1.4) {
          const q = press / 1.4;
          ctx.strokeStyle = rgba(P.accent3, 0.35 * Math.pow(1 - q, 1.6)); ctx.lineWidth = 2;
          circle(ctx, SX, SY, SR + 8 + 90 * Ease.outC(q)); ctx.stroke();
        }
      }
      MF.motes(ctx, lt + 7, { n: 24, a: 0.8 * back });
      // hold: one loose leaf per beat drifts down across the card, turning as it falls
      const fall = Math.max(0, lt - 3 * bs);
      if (fall > 0) {
        const spr = MF.leafSprite('finale:fall', 64, 22, { fill: P.young || '#7E9868', fill2: P.young2 || '#A9BE92', edge: P.leaf || '#4A6139', ink: P.ink, inkA: 0.5, seed: 41, teeth: 8, serr: 0.06, tip: 0.3, bend: 0.06, bite: 0 });
        for (let k = 0; k <= Math.floor(fall / bs); k++) {
          const u = (fall - k * bs) / (4.5 * bs);
          if (u < 0 || u > 1) continue;
          const side = hash(k * 3.1) > 0.5 ? 1 : -1, x0 = 960 + side * (380 + 300 * hash(k * 7.3));
          const x = x0 + Math.sin(u * 5 + k) * 60 - side * 120 * u, y = -40 + u * 1180;
          MF.drawLeaf(ctx, spr, x, y, u * 4 + k, 1, Math.cos(u * 7 + k), 0.85 * Math.sin(Math.PI * Math.min(1, u * 1.4)));
        }
      }
      // type
      MF.inkText(ctx, 'Mistfold', 960, 736, at(env, 2), { size: 176, color: P.ink, align: 'center' });
      MF.softReveal(ctx, 'Tea and balm from one quiet hillside.', 960, 812, rm(at(env, 3), 0, 1.2), { size: 38, color: P.ink2, align: 'center' });
      MF.label(ctx, 'Fictional brand · illustrative', 1792, 1012, at(env, 4), { size: 20, color: P.muted, align: 'right' });
    },
  };
})();
