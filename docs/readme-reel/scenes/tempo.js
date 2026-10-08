// tempo (feat-tempo.webp): any length, same BPM. One large row holds the research-cli example's real cut plan
// (timing/plan_cut.py -> cut-15/30/60.json, assets/data/plans.json) on a fixed bar grid at 128 BPM, so a bar is the
// same width in every cut. The row morphs 60 -> 15 -> 30 -> 60 s: every scene's in-phase (solid) keeps its width,
// because it renders the same in every cut; holds (hatched, flowing: a hold is alive, never a freeze) stretch in whole
// bars; optional scenes (dashed edge) slide in and out. The BPM chip pulses on the example's own beat (128 BPM, real
// time). Loop: 12 beats; frame 0 (the poster) is the full 60-s plan.
(() => {
  const X0 = 96, X1 = 1824, ROW = { y: 470, h: 360 };
  const ORDER = ['matrix', 'problem', 'cli', 'results', 'scaling', 'repeats', 'impact', 'logo'];
  const COLOR = { matrix: 'accent3', problem: 'lavender', cli: 'accent', results: 'teal', scaling: 'ok', repeats: 'orange', impact: 'accent2', logo: 'warn' };
  const SEQ = [{ at: 1.5, from: '60', to: '15' }, { at: 3.0, from: '15', to: '30' }, { at: 4.5, from: '30', to: '60' }];
  const DUR = 0.62, STAG = 0.05;                                  // one scene's morph, and the cascade between scenes
  let HATCH = null;

  function hatch(ctx) {
    if (HATCH) return HATCH;
    const b = makeBuf(24, 24), g = b.g;
    g.strokeStyle = 'rgba(255,255,255,1)'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(-6, 30); g.lineTo(30, -6); g.moveTo(-6, 6); g.lineTo(6, -6); g.moveTo(18, 30); g.lineTo(30, 18); g.stroke();
    HATCH = ctx.createPattern(b.c, 'repeat');
    return HATCH;
  }
  // geometry of scene id in cut c (in bars and beats); an optional scene the cut leaves out collapses to zero width
  // where it would enter
  function geo(D, c, id) {
    const sc = D.cuts[c].scenes, s = sc.find(x => x.id === id);
    if (s) return { a: s.fromBar, b: s.toBar, inB: s.inBeats, outB: s.outBeats, on: 1, optional: s.optional };
    const i = ORDER.indexOf(id), next = sc.find(x => ORDER.indexOf(x.id) > i);
    const at = next ? next.fromBar : D.cuts[c].bars;
    const any = Object.values(D.cuts).map(cc => cc.scenes.find(x => x.id === id)).find(Boolean) || {};
    return { a: at, b: at, inB: any.inBeats || 4, outB: any.outBeats || 1, on: 0, optional: true };
  }
  // the plan on screen at loop time u: which cuts, and each scene's morph progress (cascading left to right)
  function stateAt(u) {
    let cur = SEQ[SEQ.length - 1];
    for (const s of SEQ) if (u >= s.at) cur = s;
    const since = u >= SEQ[0].at ? u - cur.at : u + 6 - cur.at;
    return { from: cur.from, to: cur.to, k: (i) => Ease.ioC(clamp((since - i * STAG) / DUR)), since };
  }

  function block(ctx, P, id, g, bw, act, flow) {
    const col = P[COLOR[id]] || P.accent;
    const x = X0 + g.a * bw + 3, w = Math.max(0, (g.b - g.a) * bw - 6);
    if (w < 1 || g.on < 0.01) return;
    const y = ROW.y + (1 - g.on) * 80, h = ROW.h, alpha = clamp(g.on * 1.4);
    const inW = Math.min(w, (g.inB / 4) * bw), outW = Math.min(w - inW, (g.outB / 4) * bw);
    ctx.save(); ctx.globalAlpha *= alpha;
    rr(ctx, x, y, w, h, 12); ctx.clip();
    ctx.fillStyle = rgba(col, 0.16 + 0.1 * act); ctx.fillRect(x, y, w, h);
    if (w - inW - outW > 0.5) {                                     // hold: hatched, and the hatch flows
      ctx.save(); ctx.beginPath(); ctx.rect(x + inW, y, w - inW - outW, h); ctx.clip();
      ctx.translate(x + inW - flow, y); ctx.globalAlpha *= 0.34 + 0.1 * act; ctx.fillStyle = hatch(ctx);
      ctx.fillRect(flow - 2, 0, w - inW - outW + 4, h); ctx.restore();
    }
    ctx.fillStyle = col; ctx.fillRect(x, y, inW, h);                // in-phase: solid, the same in every cut
    ctx.fillStyle = rgba(col, 0.6); ctx.fillRect(x + w - outW, y, outW, h);
    ctx.restore();
    ctx.save(); ctx.globalAlpha *= alpha;
    rr(ctx, x + 1, y + 1, w - 2, h - 2, 12);
    if (g.optional) ctx.setLineDash([12, 9]);
    ctx.strokeStyle = mix(col, '#FFFFFF', 0.25 + 0.35 * act); ctx.lineWidth = 3 + 2 * act; ctx.stroke(); ctx.setLineDash([]);
    // the scene's name, vertical, on its in-phase colour
    if (inW > 30 && g.on > 0.5) {
      ctx.save(); ctx.translate(x + Math.min(inW, 54) / 2 + 12, y + h - 22); ctx.rotate(-Math.PI / 2);
      text(ctx, id, 0, 0, { size: 34, weight: 700, fam: 'mono', color: P.bg });
      ctx.restore();
    }
    ctx.restore();
  }

  SCENES['tempo'] = {
    draw(ctx, t, env) {
      const P = env.palette, L = KIT.loop(env), u = L.u;
      const D = ASSET('data/plans.json');
      KIT.stage(ctx, P);
      KIT.header(ctx, P, { index: '03', label: 'ANY LENGTH, SAME BPM' });
      if (!D) return;
      const bars = D.cuts['60'].bars, bw = (X1 - X0) / bars;
      const st = stateAt(u), kAll = st.k(ORDER.length - 1), kTot = Ease.ioC(clamp(st.since / (DUR + STAG * 4)));

      // the cut on screen: big duration and bar count, rolling from the old cut to the new one
      const A = D.cuts[st.from], B = D.cuts[st.to];
      const secs = lerp(A.duration, B.duration, kTot), nb = lerp(A.bars, B.bars, kTot);
      rollNumber(ctx, secs, '88', X0, 330, { size: 168, weight: 700, fam: 'display', color: KIT.bright(), align: 'left', pad: 2 });
      const sw = measure(ctx, '88', { size: 168, weight: 700, fam: 'display' });
      text(ctx, 's', X0 + sw + 14, 330, { size: 96, weight: 700, fam: 'display', color: P.accent });
      text(ctx, `= ${Math.round(nb)} bars`, X0 + sw + 92, 322, { size: 64, weight: 600, fam: 'display', color: P.ink2 });
      // the BPM chip pulses on the example's beat (128 BPM, real time)
      const beat = 60 / D.bpm, ph = (u % beat) / beat, pulse = Math.exp(-ph * 5);
      ctx.save();
      const cw = KIT.tag(ctx, `${D.bpm} BPM`, X1, 238, { align: 'right', size: 44, h: 78, padX: 26, color: KIT.bright(), dot: P.accent,
        bg: mix(P.surface, P.accent, 0.12 + 0.3 * pulse), stroke: rgba(P.accent, 0.4 + 0.6 * pulse) });
      ctx.restore();
      circle(ctx, X1 - cw + 33, 238, 9 + 7 * pulse); ctx.fillStyle = rgba(P.accent, 0.25 * pulse); ctx.fill();
      text(ctx, `1 bar = ${D.barSec} s in every cut`, X1, 320, { size: 34, weight: 600, fam: 'mono', color: P.ink2, align: 'right' });

      // the bar grid: a tick per bar, a label every 8 bars (= 15 s at 128 BPM); the cut's end is marked
      const endBar = lerp(A.bars, B.bars, kTot);
      for (let i = 0; i <= bars; i++) {
        const x = X0 + i * bw, major = i % 8 === 0, inside = i <= endBar + 0.01;
        ctx.fillStyle = rgba(P.ink, (major ? 0.55 : 0.22) * (inside ? 1 : 0.45));
        ctx.fillRect(Math.round(x) - 1, ROW.y - (major ? 34 : 20), 2, major ? 22 : 12);
        if (major) text(ctx, i ? `${Math.round(i * D.barSec)} s` : '0', x, ROW.y + ROW.h + 58, { size: 34, weight: 600, fam: 'mono', color: inside ? P.ink2 : P.muted, align: i === bars ? 'right' : i ? 'center' : 'left' });
      }
      // empty bars past the cut's end: ghost cells, the room a longer cut grows into
      ctx.save(); ctx.setLineDash([8, 10]); ctx.strokeStyle = rgba(P.ink, 0.12); ctx.lineWidth = 2;
      for (let i = Math.ceil(endBar); i < bars; i++) { rr(ctx, X0 + i * bw + 3, ROW.y, bw - 6, ROW.h, 10); ctx.stroke(); }
      ctx.restore();

      // the row: each scene interpolated between the two plans (in-phase widths pinned, holds stretch)
      const flow = (u * 48) % 24;
      ORDER.forEach((id, i) => {
        const g0 = geo(D, st.from, id), g1 = geo(D, st.to, id), k = st.k(i);
        if (!g0.on && !g1.on) return;
        const g = { a: lerp(g0.a, g1.a, k), b: lerp(g0.b, g1.b, k), inB: g1.on ? g1.inB : g0.inB, outB: g1.on ? g1.outB : g0.outB,
          on: lerp(g0.on, g1.on, k), optional: g0.optional || g1.optional };
        const act = k > 0 && k < 1 ? Math.sin(Math.PI * k) : 0;
        block(ctx, P, id, g, bw, act, flow);
      });
      // the end marker: a handle at the cut's last bar line, pulled out to the new length
      const ex = X0 + endBar * bw;
      ctx.save(); ctx.fillStyle = P.accent; ctx.shadowColor = P.accent; ctx.shadowBlur = 24 * (0.4 + Math.sin(Math.PI * kTot));
      ctx.fillRect(ex - 3, ROW.y - 44, 6, ROW.h + 70); rr(ctx, ex - 16, ROW.y - 64, 32, 32, 8); ctx.fill(); ctx.restore();

      // legend
      const ly = 998;
      const swatch = (x, kind) => {
        rr(ctx, x, ly - 30, 60, 40, 8);
        if (kind === 'in') { ctx.fillStyle = P.accent; ctx.fill(); }
        else if (kind === 'hold') { ctx.fillStyle = rgba(P.accent, 0.18); ctx.fill(); ctx.save(); ctx.clip(); ctx.translate(x - flow, 0); ctx.fillStyle = hatch(ctx); ctx.globalAlpha = 0.4; ctx.fillRect(flow - 2, ly - 30, 64, 40); ctx.restore(); }
        else { ctx.setLineDash([9, 7]); ctx.strokeStyle = P.accent; ctx.lineWidth = 3; ctx.stroke(); ctx.setLineDash([]); }
      };
      swatch(96, 'in'); text(ctx, 'in-phase: the same in every cut', 174, ly, { size: 34, weight: 600, fam: 'sans', color: P.ink2 });
      swatch(770, 'hold'); text(ctx, 'hold: grows in bars', 848, ly, { size: 34, weight: 600, fam: 'sans', color: P.ink2 });
      swatch(1240, 'opt'); text(ctx, 'optional scene', 1318, ly, { size: 34, weight: 600, fam: 'sans', color: P.ink2 });
    },
  };
})();
