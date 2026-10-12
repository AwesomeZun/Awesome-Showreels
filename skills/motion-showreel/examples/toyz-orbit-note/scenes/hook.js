// hook (1 bar, 2 in the 30): in orbit. The app's holographic knot turns large at the centre of the blue space while
// the nine real cards of its sample space revolve around it on a tilted ellipse, the far ones small and soft. The
// name lands over it (Orbit Note) with the app's one-liner (생각이 연결되는 나만의 노트) by 0.8 s. On the last beat and
// a half the cards leave their orbit and settle into the app's own layout, the knot slides to its corner and the
// title fades: the next scene opens on that exact frame.
(() => {
  const O = ORBIT;
  const KNOT_HOME = { x: 218.8, y: 788.7 };
  SCENES['hook'] = {
    draw(ctx, t, env) {
      const lt = env.lt, P = env.palette, out = Ease.ioC(env.phase.out);
      const c = { x: 800, y: 500, z: lerp(1.08, 1, out) };
      O.space(ctx, c);
      const G = O.geo();
      // the knot: centre stage, then home
      const kz = styleSpring(lt + 0.1, { f: 1.4, z: 0.75 });
      O.drawLayer(ctx, 'knot', c, { cx: lerp(800, KNOT_HOME.x, out), cy: lerp(255, KNOT_HOME.y, out), k: lerp(0.92 * (0.8 + 0.2 * kz), 1, out), rot: (1 - out) * (Math.sin(lt * 0.5) * 0.12 - 0.15), alpha: clamp(kz * 1.5) });
      // cards on the orbit
      const items = G.cards.map((cd, i) => {
        const a = (i / G.cards.length) * Math.PI * 2 + lt * 0.42, depth = Math.sin(a);
        const ox = 800 + Math.cos(a) * 660, oy = 330 + depth * 210;
        const k = lerp(0.42 + 0.22 * (depth + 1) / 2, 1, out);
        return { i, cd, depth, x: lerp(ox, cd.x + cd.w / 2, out), y: lerp(oy, cd.y + cd.h / 2, out), k, a: lerp(0.45 + 0.55 * (depth + 1) / 2, 1, out), blur: (1 - out) * Math.max(0, -depth) * 3 };
      });
      items.sort((a, b) => a.depth - b.depth).forEach(it => O.drawLayer(ctx, 'card_' + it.i, c, { cx: it.x, cy: it.y, k: it.k, alpha: it.a * clamp(lt * 4 + 0.3), blur: it.blur }));
      // the title
      const ta = 1 - Ease.inQ(clamp(env.phase.out * 1.4));
      ctx.save(); ctx.globalAlpha *= ta; const tw = ctx.createLinearGradient(0, 520, 0, 1000); tw.addColorStop(0, 'rgba(3,11,74,0)'); tw.addColorStop(0.45, 'rgba(3,11,74,0.55)'); tw.addColorStop(1, 'rgba(3,11,74,0.7)'); ctx.fillStyle = tw; ctx.fillRect(0, 520, W, 560); ctx.restore();
      O.label(ctx, 'INFINITE CANVAS · NOTES', 960, 612, { size: 24, align: 'center', alpha: ta * clamp(rm(lt, 0.05, 0.3)) });
      kinetic(ctx, 'Orbit Note', 960, 778, lt - 0.1, { size: 176, fam: 'display', weight: 850, color: '#FFFFFF', ls: -8, align: 'center', stagger: 0.035, dur: 0.6, rise: 70, blur: 10, alpha: ta, glow: 'rgba(159,233,255,0.45)', glowBlur: 40 });
      kinetic(ctx, '생각이 연결되는 나만의 노트', 960, 878, lt - 0.45, { size: 58, fam: 'display', weight: 700, ls: -2, align: 'center', stagger: 0.025, dur: 0.5, rise: 22, blur: 6, alpha: ta,
        colorFn: (k) => O.holoAt(k / 12) });
    },
  };
})();
