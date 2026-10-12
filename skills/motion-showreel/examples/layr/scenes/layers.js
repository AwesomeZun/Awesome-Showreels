// layers (2 bars; 3 in the 30): five layers. The first project's ten notes wait in a column on the left under the
// headline (다섯 레이어로 / 나눠 쌓아요.); the glass stack opens up on the right into five plates, and from beat 2 the
// notes fly one by one onto the plate of the layer the app gave them, shrinking into chips, while each plate's count
// ticks up to the app's own split: 배경 · 문제 2, 아이디어 4, 할 일 2, 참고 1, 질문 1. In the 30 the plates light in turn.
(() => {
  const L = LAYR, K = 1.85, X0 = 1092, Y0 = 239, GAP = 34, NX = 120, NY = 470, NW = 560, PITCH = 50;
  const LI = { context: 0, idea: 1, todo: 2, reference: 3, question: 4 };
  const SPOTS = [[-0.42, -0.25], [0.3, -0.42], [0.1, 0.32], [-0.3, 0.48]];
  let N = null;
  function prep() { const S = L.state(), c = [0, 0, 0, 0, 0];
    return S.notes.filter(n => n.p === 0).sort((a, b) => LI[a.layer] - LI[b.layer] || a.order - b.order).map((n, k) => { const li = LI[n.layer]; return { n, k, li, uv: SPOTS[c[li]++ % 4] }; }); }
  SCENES['layers'] = {
    draw(ctx, t, env) {
      const lt = env.lt, B = env.beatSec, P = env.palette, outAt = env.dur - env.outSec;
      if (!N) N = prep();
      L.stage(ctx, t, { lightX: 1450, lightY: 520 });
      const sp = Ease.ioC(clamp((lt - 0.7 * B) / (1.1 * B))), o = { gap: GAP * sp };
      const fl = Math.sin(lt * 1.4) * 4;
      const chips = [[], [], [], [], []], cnt = [0, 0, 0, 0, 0], fly = [];
      N.forEach(q => {
        const at = 2 * B + q.k * 0.25 * B - 0.42, p = clamp((lt - at) / 0.42), e = Ease.ioC(p);
        const sx = NX, sy = NY + q.k * PITCH, [tx, ty] = L.onPlate(q.li, q.uv[0], q.uv[1], X0, Y0 + fl, K, o);
        if (p >= 1) { chips[q.li].push([q.uv[0], q.uv[1], 15, lt - at - 0.42 < 0.25 ? 1 : 0, 1]); cnt[q.li]++; }
        else fly.push({ q, e, x: lerp(sx + NW / 2, tx, e), y: lerp(sy + 23, ty, e) - Math.sin(Math.PI * e) * 120, w: lerp(NW, 30, e) });
      });
      const hot = env.dur > 10 * B && lt > 8 * B ? Math.floor((lt - 8 * B) / (0.5 * B)) % 5 : -1;
      L.stack(ctx, X0, Y0 + fl, K, { ...o, chips, hot, bright: true, label: (i) => L.LAYERS[i][1], count: (i) => cnt[i] });
      fly.forEach(f => L.note(ctx, f.q.n.short, f.x - f.w / 2, f.y - 23, f.w, { dot: L.LCOL[f.q.li], size: 20, alpha: 1 - clamp((f.e - 0.85) / 0.15) }));
      // the waiting column (a note leaves its slot when it flies)
      N.forEach(q => { const at = 2 * B + q.k * 0.25 * B - 0.42; if (lt >= at) return; const e = styleSpring(lt - 0.15 - q.k * 0.04, { f: 2.2, z: 0.75 });
        L.note(ctx, q.n.short, NX + (1 - e) * -60, NY + q.k * PITCH, NW, { dot: L.LCOL[q.li], size: 20, alpha: clamp(e * 1.5) }); });
      // the column becomes the app's legend of the five layers as it empties (row i takes the place of note rows 2i, 2i+1)
      for (let i = 0; i < 5; i++) {
        const at = 2 * B + (2 * i + 1) * 0.25 * B, e = styleSpring(lt - at, { f: 2.2, z: 0.75 }); if (lt < at) continue;
        const y = NY + i * 100;
        ctx.save(); ctx.globalAlpha *= clamp((lt - at) * 4) * (1 - env.phase.out); ctx.translate((1 - e) * -40, 0);
        ctx.fillStyle = L.LCOL[i]; rr(ctx, NX, y + 8, 6, 72, 3); ctx.fill();
        ctx.font = `500 22px ${FAM.mono}`; ctx.fillStyle = '#9FB0C8'; ctx.fillText(String(i + 1).padStart(2, '0'), NX + 24, y + 38);
        ctx.font = `750 34px ${FAM.display}`; ctx.fillStyle = '#F3F5F8'; ctx.fillText(L.LAYERS[i][1], NX + 64, y + 40);
        ctx.font = `500 24px ${FAM.sans}`; ctx.fillStyle = '#8D96A5'; ctx.fillText(L.LAYERS[i][3], NX + 24, y + 76);
        ctx.font = `600 34px ${FAM.mono}`; ctx.fillStyle = '#D9F55B'; ctx.textAlign = 'right'; ctx.fillText(String(cnt[i]), NX + NW, y + 40);
        ctx.restore();
      }
      // the headline and the project
      L.label(ctx, 'PROJECT / 01 · 러닝 · 크루 · 페이스', 148, 150, { size: 22, color: '#9FB0C8', dot: true, alpha: clamp(rm(lt, 0.05, 0.35)) * (1 - env.phase.out) });
      L.headline(ctx, ['다섯 레이어로', '나눠 쌓아요.'], 120, 262, lt - 0.12, { size: 78, gap: 88, out: { at: outAt } });
      kinetic(ctx, '배경 · 아이디어 · 할 일 · 참고 · 질문', 124, 414, lt - 0.7, { size: 36, fam: 'sans', weight: 600, color: P.ink2, ls: -0.5, stagger: 0.012, dur: 0.4, rise: 12, blur: 4, out: { at: outAt } });
    },
  };
})();
