// connect (2 bars, 3 in the 30; the drop): links joined into knowledge. Nine real cards from the app's board (sample
// data, fictional) fly in from depth and settle around the pinned looplens card. Lime lines draw on between cards
// that really share something in that data: looplens to the three links the app lists as related (같은 주제 twice,
// the keyword 실험), and the tags two cards share (#프런트엔드, #타이포그래피, #검색, #도구). Pulses run along the lines.
// The app's own headline lands bottom left: 링크가 이어지면 / 지식이 돼요. (second line lime). The camera drifts.
(() => {
  const T = TROVE;
  // card: [layer, centre x, centre y, scale, depth 0 near .. 1 far]
  const CARDS = {
    c0: ['card_0', 960, 300, 1.0, 0], c1: ['card_1', 560, 230, 0.84, 0.25], c4: ['card_4', 1372, 236, 0.84, 0.25], c9: ['card_9', 1300, 600, 0.86, 0.2],
    c2: ['card_2', 214, 360, 0.7, 0.6], c3: ['card_3', 640, 588, 0.74, 0.45], c11: ['card_11', 260, 660, 0.66, 0.7],
    c6: ['card_6', 1726, 470, 0.7, 0.6], c7: ['card_7', 1716, 820, 0.66, 0.7], c10: ['card_10', 1000, 760, 0.62, 0.8],
  };
  const EDGES = [['c0', 'c1', '같은 주제'], ['c0', 'c4', '같은 주제'], ['c0', 'c9', '실험'], ['c1', 'c2', '#프런트엔드'], ['c6', 'c7', '#타이포그래피'],
    ['c3', 'c11', '#검색'], ['c11', 'c10', '#도구']];
  const ORDER = ['c0', 'c1', 'c4', 'c9', 'c3', 'c2', 'c6', 'c11', 'c7', 'c10'];
  function pos(env, id) {
    const [name, x, y, s, d] = CARDS[id], lt = env.lt, i = ORDER.indexOf(id);
    const e = styleSpring(lt + 0.32 - i * 0.06, { f: 1.8, z: 0.7 });
    const cam = [Math.sin(lt * 0.35) * 26, Math.cos(lt * 0.3) * 14];
    const par = 1 - d * 0.7;
    const fly = 1 - e, k = s * (0.55 + 0.45 * e) * (1 + 0.08 * Ease.inC(env.phase.out));
    return { name, x: x + cam[0] * par + (x - W / 2) * fly * 0.5, y: y + cam[1] * par + (y - H / 2) * fly * 0.4 + 40 * fly, k, a: clamp(e * 1.4), d };
  }
  function chipPill(ctx, s, x, y, a, P) {
    ctx.save(); ctx.globalAlpha *= a; ctx.font = `600 26px ${FAM.sans}`; const w = ctx.measureText(s).width + 32;
    rr(ctx, x - w / 2, y - 22, w, 44, 22); ctx.fillStyle = '#0D1100'; ctx.fill(); ctx.strokeStyle = P.accent; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = P.accent; ctx.textAlign = 'center'; ctx.fillText(s, x, y + 9); ctx.restore();
  }
  SCENES['connect'] = {
    draw(ctx, t, env) {
      const lt = env.lt, P = env.palette, out = env.phase.out, B = env.beatSec;
      T.stage(ctx, t, { glowX: 960, glowY: 320, drift: 14 });
      const pts = {}; for (const id of Object.keys(CARDS)) pts[id] = pos(env, id);
      // far cards first
      const drawCard = (id) => {
        const p = pts[id], { img, L } = T.layer(p.name); if (!img) return;
        const w = L.rect.w * p.k, h = L.rect.h * p.k;
        ctx.save(); ctx.globalAlpha *= p.a * (1 - 0.35 * p.d);
        if (p.d > 0.5) ctx.filter = `blur(${((p.d - 0.5) * 3).toFixed(1)}px)`;
        ctx.drawImage(img, p.x - w / 2, p.y - h / 2, w, h); ctx.restore();
        if (id === 'c0') {                                                   // the pinned card, lit
          const g = clamp(rm(lt, 0.6, 1.1)) * (0.75 + 0.25 * Math.sin(lt * 4));
          ctx.save(); ctx.globalAlpha *= g; ctx.shadowColor = 'rgba(198,244,50,0.7)'; ctx.shadowBlur = 30;
          rr(ctx, p.x - w / 2 - 3, p.y - h / 2 - 3, w + 6, h + 6, 13); ctx.strokeStyle = P.accent; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
        }
      };
      Object.keys(CARDS).sort((a, b) => pts[b].d - pts[a].d).forEach(drawCard);
      // the lines, drawn on one after another, then pulses
      EDGES.forEach(([a, b, why], i) => {
        const at = 2 * B + i * 0.5 * B * 0.8, p = Ease.ioC(clamp((lt - at) / 0.45)); if (p <= 0) return;
        const A = pts[a], Bp = pts[b], mx = (A.x + Bp.x) / 2, my = (A.y + Bp.y) / 2 - 60;
        const curve = []; for (let k = 0; k <= 40; k++) curve.push(qbez([A.x, A.y], [mx, my], [Bp.x, Bp.y], k / 40));
        const P2 = curve;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(198,244,50,0.85)'; ctx.lineWidth = 2.5; ctx.shadowColor = 'rgba(198,244,50,0.8)'; ctx.shadowBlur = 14;
        polyStroke(ctx, P2, p); ctx.stroke();
        if (p >= 1) for (let j = 0; j < 2; j++) {                               // pulses running both ways
          const u = ((lt * 0.55 + i * 0.37 + j * 0.5) % 1), q = pointAt(P2, j ? u : 1 - u);
          ctx.fillStyle = '#F2FFC4'; ctx.shadowBlur = 20; circle(ctx, q.x, q.y, 4.5); ctx.fill();
        }
        ctx.restore();
        // where the line meets each card: a lime dot
        [A, Bp].forEach((c, k) => { if (k === 1 && p < 1) return; ctx.save(); ctx.fillStyle = P.accent; circle(ctx, c.x, c.y, 6); ctx.fill(); ctx.restore(); });
        const cp = pointAt(P2, 0.5), ca = clamp((lt - at - 0.25) / 0.25);
        if (ca > 0) chipPill(ctx, why, cp.x, cp.y, ca * (1 - Ease.inC(out)), P);
      });
      // the headline, with a dark wash behind it for contrast
      const wash = ctx.createLinearGradient(0, 700, 0, 1080); wash.addColorStop(0, 'rgba(8,9,10,0)'); wash.addColorStop(0.45, 'rgba(8,9,10,0.88)'); wash.addColorStop(1, 'rgba(8,9,10,0.95)');
      ctx.fillStyle = wash; ctx.fillRect(0, 700, 1180, 380);
      T.headline(ctx, ['링크가 이어지면', '지식이 돼요.'], 116, 868, lt - 1.05, { size: 112, step: 0.42, colors: [P.ink, P.accent], out: { at: env.dur - env.outSec + 0.15 } });
      onBars(env, 1, (i, dt) => { const k = Math.exp(-dt * 3); ctx.save(); ctx.globalAlpha *= 0.5 * k; ctx.fillStyle = P.accent; ctx.fillRect(116, 1000, 520 * (1 - k * 0.3), 3); ctx.restore(); });
    },
  };
})();
