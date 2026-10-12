// hook (2 bars): the app's hero, in motion. The name and the app's own line on the left (LAYR, 흩어진 메모를 / 층으로
// 쌓아 프로젝트로.); on the right its glass layer stack drops in plate by plate from the bottom up (the app's own
// drop-in, a quarter beat apart), while real notes from its sample data drift across the dark and then fall into the
// stack, shrinking into chips on the plate of the layer the app gave them. The last beat zooms into the top plate.
(() => {
  const L = LAYR, X0 = 930, Y0 = 108, K = 2.32;
  const UV = [[-0.5, -0.3], [0.2, -0.5], [0.1, 0.3], [-0.2, 0.5], [0.5, 0.4], [-0.45, 0.1], [0.45, -0.1], [0.0, -0.1], [-0.1, -0.55], [0.35, 0.15]];
  const LI = { context: 0, idea: 1, todo: 2, reference: 3, question: 4 };
  function picks() {
    const S = L.state(), out = [], seen = {};
    S.notes.filter(n => n.p === 0).forEach((n, k) => { const li = LI[n.layer]; seen[li] = (seen[li] || 0) + 1; out.push({ n, li, uv: UV[(k * 3 + li) % UV.length] }); });
    return out;
  }
  let P = null;
  const drop = (i, lt, B) => (lt - ((0.5 + 0.25 * (4 - i)) * B - 0.12)) / 0.85;
  SCENES['hook'] = {
    portal(t, env) { const y = Y0 + (78 - 58) * K, x = X0 + (150 - 124) * K; return { x, y, w: 248 * K, h: 116 * K, r: 8 }; },
    draw(ctx, t, env) {
      const lt = env.lt, B = env.beatSec, out = Ease.inC(env.phase.out);
      if (!P) P = picks();
      L.stage(ctx, t, { lightX: 1350, lightY: 380 });
      // the notes: drifting, then falling into the stack
      const chips = [[], [], [], [], []];
      const fly = [];
      P.forEach((q, j) => {
        const h1 = hash(j * 7.3 + 1), h2 = hash(j * 3.1 + 5), at = (2.75 + 0.25 * j) * env.beatSec - 0.75, p = clamp((lt - at) / 0.75), e = Ease.ioC(p);
        let sx = 160 + h1 * 1600, sy = 140 + h2 * 820;
        if (sx < 900 && sy > 230 && sy < 740) sy = sy < 485 ? 150 + h2 * 60 : 800 + h2 * 160;           // keep the name and the line clear
        sx += Math.sin(lt * 0.5 + j) * 30; sy += Math.cos(lt * 0.45 + j * 1.7) * 20;
        const [tx, ty] = L.onPlate(q.li, q.uv[0], q.uv[1], X0, Y0, K);
        if (p >= 1) { chips[q.li].push([q.uv[0], q.uv[1], 13, 0, clamp((lt - at - 0.75) / 0.2)]); return; }
        fly.push({ q, x: lerp(sx, tx, e), y: lerp(sy, ty, e) - Math.sin(Math.PI * e) * 90, w: lerp(360, 30, e), a: (0.25 + 0.5 * clamp(lt / 0.4)) * (1 - clamp((p - 0.8) / 0.2)), rot: (h1 - 0.5) * 0.12 * (1 - e) });
      });
      // the stack (the app's default chips, plus the arrived notes), floating a little on the hold
      const fl = Math.sin(lt * 1.6) * 4;
      const base = [[[-0.5, -0.3, 14], [0.2, -0.5, 12], [0.1, 0.3, 16, 1]], [], [], [], []];
      const ch = base.map((c, i) => c.concat(chips[i]));
      L.stack(ctx, X0, Y0 + fl, K, { drop: (i) => drop(i, lt, B), chips: ch, hot: lt > 6 * B ? 0 : -1 });
      fly.forEach(f => L.note(ctx, f.q.n.short, f.x - f.w / 2, f.y - 23, f.w, { alpha: f.a, rot: f.rot, dot: L.PCOL[0], size: 20 }));
      // the name and the line
      ctx.save(); ctx.translate(-out * 140, 0); ctx.globalAlpha *= 1 - out;
      L.label(ctx, 'LAYR / ON-DEVICE AI WORKSPACE', 148, 300, { size: 22, color: '#9FB0C8', dot: true, alpha: clamp(rm(lt, 0.05, 0.35)) });
      const me = styleSpring(lt - 0.05, { f: 2.2, z: 0.7 });
      L.mark(ctx, 116, 336 + (1 - me) * 30, 132, { alpha: clamp(me * 1.6), spread: 1 + (1 - me) * 1.2, edge: clamp(rm(lt, 0.3, 0.8)) });
      ctx.save(); // the steel fill runs in each glyph's own frame (kinetic draws every glyph with its baseline at 0)
      const g = ctx.createLinearGradient(0, -124, 0, 0); g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.6, '#DCE3EE'); g.addColorStop(1, '#9FB0C8');
      kinetic(ctx, 'LAYR', 272, 466, lt - 0.1, { size: 168, fam: 'display', weight: 850, color: g, ls: 4, stagger: 0.05, dur: 0.5, rise: 50, blur: 8 }); ctx.restore();
      L.headline(ctx, ['흩어진 메모를', '층으로 쌓아 프로젝트로.'], 120, 616, lt - 0.35, { size: 70, gap: 80 });
      ctx.restore();
    },
  };
})();
