// organize (2 bars; 3 in the 30): bundled for you. All 32 sample notes lie scattered in the dark; on beat 1 they glide
// into the three bundles the app proposed for them (the heads are the app's own: 러닝 · 크루 · 페이스 with 10 notes and
// cohesion 0.28, 물주기 · 식물 · 플랜티 9 and 0.27, 팟캐스트 · 에피소드 · 편집 8 and 0.35), lime similarity lines
// flashing between notes of a bundle as they meet; the five that fit nowhere stay in the inbox. In the 30 the app's
// 모두 수락 is pressed on the last bar and the bundles become projects.
(() => {
  const L = LAYR, HK = 1.12, HX = [700, 1093, 1486], HY = 120, NY = 384, PITCH = 52, NW = 328 * HK;
  let N = null;
  function layout() {
    const S = L.state(), cnt = [0, 0, 0]; let inbox = 0;
    return S.notes.map((n, j) => {
      const h1 = hash(j * 5.7 + 2), h2 = hash(j * 9.1 + 3);
      const sx = 640 + h1 * 1200, sy = 420 + h2 * 560;
      let tx, ty;
      if (n.p >= 0) { tx = HX[n.p]; ty = NY + cnt[n.p]++ * PITCH; } else { tx = 120; ty = 640 + inbox++ * PITCH; }
      return { n, j, sx, sy, tx, ty, rot: (h1 - 0.5) * 0.18, at: (n.p >= 0 ? 0.15 * cnt[n.p] + n.p * 0.08 : 0.5 + 0.1 * inbox) };
    });
  }
  SCENES['organize'] = {
    draw(ctx, t, env) {
      const lt = env.lt, B = env.beatSec, P = env.palette, outAt = env.dur - env.outSec;
      if (!N) N = layout();
      L.stage(ctx, t, { lightX: 1300, lightY: 200 });
      const acc = env.dur > 10 * B ? clamp((lt - 8 * B) / 0.3) : 0;            // 모두 수락 (the 30 only)
      // the bundle heads rise as their notes come
      [0, 1, 2].forEach(i => {
        const at = 2.5 * B + i * 0.5 * B - 0.2, e = styleSpring(lt - at, { f: 2, z: 0.72 }); if (lt < at) return;
        ctx.save(); ctx.globalAlpha *= clamp((lt - at) * 4); ctx.translate(0, (1 - e) * 40);
        ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18; rr(ctx, HX[i], HY, NW, 205 * HK, 14); ctx.fillStyle = '#121317'; ctx.fill(); ctx.shadowColor = 'transparent';
        L.draw(ctx, 'head_' + i, HX[i], HY, HK);
        if (acc > 0) { ctx.globalAlpha *= acc; rr(ctx, HX[i], HY, NW, 205 * HK, 14); ctx.strokeStyle = '#D9F55B'; ctx.lineWidth = 2; ctx.stroke();
          rr(ctx, HX[i] + NW - 128, HY + 168, 112, 36, 18); ctx.fillStyle = '#D9F55B'; ctx.fill(); ctx.fillStyle = '#11140A'; ctx.font = `700 19px ${FAM.sans}`; ctx.textAlign = 'center'; ctx.fillText('✓ 프로젝트', HX[i] + NW - 72, HY + 193); }
        ctx.restore();
      });
      // the notes glide from scattered to their bundle (or stay in the inbox)
      const pos = N.map(q => { const p = clamp((lt - 1 * B - q.at) / 0.9), e = Ease.ioC(p);
        return { q, p, e, x: lerp(q.sx + Math.sin(lt * 0.6 + q.j) * 14, q.tx, e), y: lerp(q.sy + Math.cos(lt * 0.5 + q.j) * 10, q.ty, e) }; });
      // lime similarity lines between neighbours of a bundle while they converge
      ctx.save(); ctx.lineWidth = 1.5;
      [0, 1, 2].forEach(b => { const m = pos.filter(d => d.q.n.p === b); for (let k = 1; k < m.length; k++) { const a = m[k - 1], c = m[k], f = Math.sin(Math.PI * Math.min(a.e, c.e));
        if (f < 0.02) continue; ctx.strokeStyle = `rgba(217,245,91,${0.55 * f})`; ctx.beginPath(); ctx.moveTo(a.x + 20, a.y + 23); ctx.lineTo(c.x + 20, c.y + 23); ctx.stroke(); } });
      ctx.restore();
      pos.forEach(d => { const inb = d.q.n.p < 0;
        L.note(ctx, d.q.n.short, d.x, d.y, NW, { rot: d.q.rot * (1 - d.e), alpha: inb ? lerp(0.85, 0.55, d.e) : 1, dot: inb ? L.INBOX : d.e > 0.95 ? L.PCOL[d.q.n.p] : L.INBOX,
          color: inb ? '#8D96A5' : '#B7BFCB', size: 20, stroke: !inb && d.p > 0.98 && d.p < 1.2 ? 'rgba(217,245,91,0.6)' : null }); });
      L.label(ctx, 'INBOX · 5', 124, 618, { size: 20, color: '#8D96A5', alpha: clamp(rm(lt, 2.2 * B, 2.8 * B)) * (1 - env.phase.out) });
      // the headline
      L.label(ctx, '02 / ORGANIZE', 124, 150, { size: 22, color: '#9FB0C8', dot: true, alpha: clamp(rm(lt, 0.05, 0.35)) * (1 - env.phase.out) });
      L.headline(ctx, ['비슷한 메모끼리', '알아서 묶어요.'], 120, 262, lt - 0.15, { size: 78, gap: 88, out: { at: outAt } });
      kinetic(ctx, '서버로 보내지 않고, 이 기기 안에서', 124, 444, lt - 0.8, { size: 36, fam: 'sans', weight: 600, color: P.ink2, ls: -0.5, stagger: 0.012, dur: 0.4, rise: 12, blur: 4, out: { at: outAt } });
      // 모두 수락 (the 30 only): the app's primary button, pressed on the bar line
      if (env.dur > 10 * B) {
        const bi = styleSpring(lt - 7 * B, { f: 2.4, z: 0.6 }); if (lt > 7 * B) {
          const press = lt > 8 * B - 0.05 && lt < 8 * B + 0.12 ? 0.94 : 1;
          ctx.save(); ctx.globalAlpha *= clamp((lt - 7 * B) * 4) * (1 - env.phase.out); ctx.translate(124 + 120, 520 + (1 - bi) * 20); ctx.scale(press, press);
          rr(ctx, -120, -30, 240, 60, 12); ctx.fillStyle = '#D9F55B'; ctx.fill(); ctx.fillStyle = '#11140A'; ctx.font = `750 26px ${FAM.sans}`; ctx.textAlign = 'center'; ctx.fillText('✓ 모두 수락 (3)', 0, 9); ctx.restore();
        }
      }
    },
  };
})();
