// graph (2 bars, 3 in the 30; the drop): thoughts in orbit. The whole sample space, the cards alone at first, the
// camera easing back. Then every link of the space draws itself along its real path, one after another (eight with
// the new wiki link), a light running at its head; each label pops as its line lands (찾기, 집중하기, 반대 방향) and the
// cards at both ends brighten. The knot turns in its corner. Headline over a deep-blue wash: 생각과 생각이 / 궤도로
// 이어져요. In the hold, pulses keep running along the lines.
(() => {
  const O = ORBIT;
  const ORDER = ['l_2', 'l_1', 'l_4', 'l_3', 'l_5', 'l_w1', 'l_w2'];
  SCENES['graph'] = {
    draw(ctx, t, env) {
      const lt = env.lt, P = env.palette, B = env.beatSec, out = env.phase.out;
      const z = lerp(1.1, 0.96, Ease.ioC(clamp(lt / (4 * B)))) * (1 + 0.04 * Ease.inC(out));
      const c = { x: 800, y: 470 + Math.sin(lt * 0.4) * 6, z };
      O.space(ctx, c);
      O.drawLayer(ctx, 'knot', c, { rot: Math.sin(t * 0.35) * 0.06 + lt * 0.02 });
      const G = O.geoLinked(), M = O.mapper(c);
      const links = G.links.slice().sort((a, b) => (ORDER.indexOf(a.id) + 99 * (ORDER.indexOf(a.id) < 0)) - (ORDER.indexOf(b.id) + 99 * (ORDER.indexOf(b.id) < 0)));
      const lit = {};
      links.forEach((L, i) => {
        const at = 0.75 * B + i * 0.375 * B, p = Ease.ioC(clamp((lt - at) / (0.7 * B)));
        O.link(ctx, L, c, p, { glow: L.kind === 'wiki' ? 'rgba(226,185,255,0.45)' : undefined });
        if (p >= 1) { lit[L.from] = Math.max(lit[L.from] || 0, clamp((lt - at - 0.7 * B) / 0.4)); lit[L.to] = Math.max(lit[L.to] || 0, clamp((lt - at - 0.7 * B) / 0.4)); }
        if (p >= 1) for (let j = 0; j < 2; j++) {                           // pulses in the hold
          const u = ((lt * 0.35 + i * 0.29 + j * 0.5) % 1), q = O.pointOnPath(L, u), X = M.x(q[0]), Y = M.y(q[1]);
          const g = ctx.createRadialGradient(X, Y, 0, X, Y, 14); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(159,233,255,0)');
          ctx.fillStyle = g; ctx.fillRect(X - 14, Y - 14, 28, 28);
        }
      });
      // labels pop when their line lands
      O.geo().labels.forEach((lb, i) => {
        const li = links.findIndex(L => L.id === lb.id), at = 0.75 * B + li * 0.375 * B + 0.7 * B, k = Ease.outBack(clamp((lt - at) / 0.3), 2);
        if (k > 0) O.drawLayer(ctx, 'label_' + i, c, { k, alpha: clamp((lt - at) / 0.15) });
      });
      G.cards.forEach((cd, i) => {
        const r = O.drawLayer(ctx, 'card_' + i, c, { alpha: 0.55 + 0.45 * (lit[cd.id] || 0) });
        if (lit[cd.id] && r) { ctx.save(); ctx.globalAlpha *= 0.5 * lit[cd.id] * (0.7 + 0.3 * Math.sin(lt * 3 + i)); ctx.strokeStyle = O.holoAt((i / 9 + lt * 0.1) % 1); ctx.lineWidth = 2; rr(ctx, M.x(cd.x) - 3, M.y(cd.y) - 3, cd.w * M.s + 6, cd.h * M.s + 6, 14); ctx.stroke(); ctx.restore(); }
      });
      O.wash(ctx, 700, 0.9, 1250);
      O.headline(ctx, ['생각과 생각이', '궤도로 이어져요.'], 114, 920, lt - 1.4, { size: 92, gap: 104, out: { at: env.dur - env.outSec } });
    },
  };
})();
