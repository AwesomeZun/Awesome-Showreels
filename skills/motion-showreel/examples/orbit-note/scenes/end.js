// end (1 bar, 2 in the 30): the end card. The holographic knot turns at the centre top; the name, the app's one-liner
// in the holographic gradient, the address in a white pill and, at the foot, where it comes from (toyz original).
(() => {
  const O = ORBIT;
  SCENES['end'] = {
    draw(ctx, t, env) {
      const lt = env.lt, P = env.palette;
      O.space(ctx, { x: 800, y: 500, z: 1.04 + 0.01 * Math.sin(lt * 0.5) });
      ctx.fillStyle = 'rgba(3,11,74,0.38)'; ctx.fillRect(0, 0, W, H);
      const e = styleSpring(lt + 0.2, { f: 1.5, z: 0.75 });
      O.drawLayer(ctx, 'knot', { x: 800, y: 500, z: 1 }, { cx: 800, cy: 270, k: 0.86 * (0.85 + 0.15 * e), rot: Math.sin(lt * 0.45) * 0.1 + (1 - e) * 0.4, alpha: clamp(e * 1.4) });
      kinetic(ctx, 'Orbit Note', 960, 690, lt - 0.15, { size: 150, fam: 'display', weight: 850, color: '#FFFFFF', ls: -6, align: 'center', stagger: 0.03, dur: 0.55, rise: 50, blur: 8, glow: 'rgba(159,233,255,0.4)', glowBlur: 30 });
      kinetic(ctx, '생각이 연결되는 나만의 노트', 960, 780, lt - 0.4, { size: 48, fam: 'display', weight: 700, ls: -1.6, align: 'center', stagger: 0.022, dur: 0.45, rise: 18, blur: 5, colorFn: (k) => O.holoAt(k / 12) });
      const up = Ease.outC(clamp(rm(lt, 0.75, 1.15)));
      ctx.save(); ctx.globalAlpha *= up; ctx.font = `600 30px ${FAM.mono}`; const url = 'orbit-note.toyz.kr', w = ctx.measureText(url).width + 64;
      rr(ctx, 960 - w / 2, 838 + (1 - up) * 14, w, 60, 30); ctx.fillStyle = '#FFFFFF'; ctx.fill();
      ctx.fillStyle = '#0B2FE6'; ctx.textAlign = 'center'; ctx.fillText(url, 960, 878 + (1 - up) * 14); ctx.restore();
      O.label(ctx, 'TOYZ ORIGINAL · PLAY OBJECTS', 960, 1000, { size: 22, align: 'center', alpha: clamp(rm(lt, 1.0, 1.4)) });
    },
  };
})();
