// easing (4 bars, the 30 only): the curve decides the character. The app's cubic-bezier editor (EasingPage.tsx, its SVG
// drawn on canvas) walks through four of the app's presets on beats 1, 4, 7 and 10: ease, ease-in-out, 살짝 넘침,
// 뒤로 물렀다 출발. The handles glide to each preset, the orange dot rides the new curve, and on the left the app's
// side-by-side lanes run the same curve, each leaving its ghost dots at equal time steps (where they bunch, it is slow);
// on the last bar all four race once more, side by side.
(() => {
  const M = MK;
  const PRE = [
    { ko: 'ease', b: [0.25, 0.1, 0.25, 1], ball: 'blue' },
    { ko: 'ease-in-out', b: [0.42, 0, 0.58, 1], ball: 'orange' },
    { ko: '살짝 넘침', b: [0.34, 1.56, 0.64, 1], ball: 'ink' },
    { ko: '뒤로 물렀다 출발', b: [0.68, -0.55, 0.27, 1.55], ball: 'ink' },
  ];
  const AT = [1, 4, 7, 10], RUN = 1.1, EK = 1.62, EX = 1260, EY = 150, LX = 120, LY = 430, LW = 1030, LH = 118;
  const css = (b) => `cubic-bezier(${b.join(', ')})`;
  SCENES['easing'] = {
    draw(ctx, t, env) {
      const lt = env.lt, B = env.beatSec, P = env.palette, outAt = env.dur - env.outSec;
      M.paperStage(ctx, t, { lightX: 1900 });
      // which preset, and the handles gliding between them
      let k = 0; for (let i = 0; i < 4; i++) if (lt >= AT[i] * B - 0.3) k = i;
      const g = Ease.ioC(clamp((lt - (AT[k] * B - 0.3)) / 0.35)), prev = PRE[Math.max(0, k - 1)].b, cur = PRE[k].b;
      const b = k === 0 ? cur : cur.map((v, i) => lerp(prev[i], v, g));
      const run = (i) => (lt - AT[i] * B - 0.1) / RUN;
      // the editor
      const ee = styleSpring(lt + 0.02, { f: 1.8, z: 0.66 });
      ctx.save(); ctx.translate((1 - ee) * 700, 0); ctx.globalAlpha *= clamp(ee * 1.5);
      ctx.shadowColor = 'rgba(10,13,31,0.16)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 22; rr(ctx, EX, EY, 320 * EK, 430 * EK, 18 * EK); ctx.fillStyle = '#F6F7FB'; ctx.fill(); ctx.shadowColor = 'transparent';
      const u = run(k);
      M.editor(ctx, EX, EY, EK, b, { draw: k === 0 ? Ease.outC(clamp((lt - 0.2) / 0.5)) : 1, u: u > 0 ? u : null, hot: g < 1 && k > 0 ? (lt % 0.6 < 0.3 ? 0 : 1) : -1 });
      // the preset chip and its CSS line under the editor
      const pc = styleSpring(lt - (AT[k] * B - 0.3), { f: 2.6, z: 0.5 });
      ctx.save(); ctx.font = `600 30px ${FAM.mono}`; const s = css(cur), w = ctx.measureText(s).width + 60;
      rr(ctx, EX + 160 * EK - w / 2, EY + 430 * EK + 26, w, 60, 30); ctx.fillStyle = '#0A0D1F'; ctx.fill();
      ctx.globalAlpha *= clamp(pc * 1.4); ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.fillText(s, EX + 160 * EK, EY + 430 * EK + 66); ctx.restore();
      ctx.restore();
      // the lanes
      const le = styleSpring(lt - 0.1, { f: 1.8, z: 0.7 });
      ctx.save(); ctx.globalAlpha *= clamp(le * 1.5); ctx.translate(0, (1 - le) * 80);
      rr(ctx, LX, LY, LW, LH * 4 + 3, 20); ctx.fillStyle = 'rgba(10,13,31,0.1)'; ctx.fill();
      PRE.forEach((p, i) => {
        const y = LY + i * (LH + 1), active = i === k && lt >= AT[i] * B - 0.3;
        ctx.save(); if (i === 0) { rr(ctx, LX, LY, LW, LH * 4 + 3, 20); ctx.clip(); }
        ctx.save(); rr(ctx, LX, LY, LW, LH * 4 + 3, 20); ctx.clip(); ctx.fillStyle = active ? '#E4E9FF' : '#FFFFFF'; ctx.fillRect(LX, y, LW, LH); ctx.restore();
        ctx.restore();
        if (active) { ctx.fillStyle = P.accent; ctx.fillRect(LX, y + 14, 5, LH - 28); }
        ctx.font = `800 36px ${FAM.display}`; ctx.fillStyle = P.ink; ctx.fillText(p.ko, LX + 34, y + 58);
        ctx.font = `500 16px ${FAM.mono}`; ctx.fillStyle = '#555B7C'; ctx.fillText(css(p.b), LX + 35, y + 92);
        const tx = LX + 470, tw = LW - 500, ty = y + LH / 2;
        rr(ctx, tx, ty - 28, tw, 56, 28); ctx.fillStyle = '#F6F7FB'; ctx.fill();
        const f = M.bezier(...p.b), r0 = tx + 28, r1 = tx + tw - 28, q = clamp(run(i));
        if (lt > AT[i] * B) for (let j = 0; j <= 12; j++) { if (j / 12 > q + 1e-6) break; const m = clamp(f(j / 12), -0.15, 1.15);
          ctx.fillStyle = '#C9B8FF'; circle(ctx, lerp(r0, r1, m), ty, 6); ctx.fill(); }
        // after the last preset, all four race again side by side
        const race = (lt - 12.4 * B) / RUN, qq = race > 0 ? clamp(race) : q;
        const m = clamp(f(qq), -0.15, 1.15);
        M.ball(ctx, lerp(r0, r1, m), ty, 25, p.ball, lt > AT[i] * B - 0.3 ? 1 : 0.35);
      });
      ctx.restore();
      // the headline
      kinetic(ctx, '움직임의 성격은', 118, 200, lt - 0.2, { size: 92, fam: 'display', weight: 900, ls: -4, stagger: 0.03, dur: 0.45, rise: 36, blur: 5, color: P.ink, out: { at: outAt } });
      kinetic(ctx, '곡선이 정해요.', 118, 310, lt - 0.42, { size: 92, fam: 'display', weight: 900, ls: -4, stagger: 0.03, dur: 0.45, rise: 36, blur: 5,
        colorFn: (i, ch) => ch === '.' ? '#FF6A2B' : P.ink, out: { at: outAt } });
    },
  };
})();
