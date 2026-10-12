// hook (1 bar, 2 in the 30): a quiet reading room. On the grey desk the name lands (Read Room, with the app's chrome
// X mark cropped from its first screen), the kicker above, and the room's one-liner below with an orange highlighter
// sweeping behind it, as the app marks its own headline: 함께 읽는 작은 열람실.
(() => {
  const R = RR;
  SCENES['hook'] = {
    draw(ctx, t, env) {
      const lt = env.lt, P = env.palette;
      R.desk(ctx, t);
      // the app's logo card (its chrome X), floating at the right
      const e = styleSpring(lt + 0.1, { f: 1.8, z: 0.75 });
      ctx.save(); ctx.globalAlpha *= clamp(e * 1.4); ctx.translate(1400, 540 + Math.sin(lt * 1.1) * 8 + (1 - e) * 40); ctx.rotate(-0.04 + Math.sin(lt * 0.7) * 0.01);
      ctx.shadowColor = 'rgba(23,25,29,0.22)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 26; R.draw(ctx, 'home', -300, -232, 1.12, { crop: [890, 128, 540, 416] }); ctx.restore();
      ctx.save(); ctx.translate(0, Math.sin(lt * 0.8) * 4);
      R.label(ctx, 'A QUIET READING ROOM', 150, 380, { size: 24, color: P.accent, alpha: clamp(rm(lt, 0.05, 0.3)) });
      kinetic(ctx, 'Read Room', 140, 540, lt - 0.05, { size: 168, fam: 'display', weight: 900, color: P.ink, ls: -7, stagger: 0.035, dur: 0.6, rise: 60, blur: 8 });
      R.marker(ctx, '함께 읽는 작은 열람실', 148, 680, 72, lt - 0.45, { markAt: 0.55, markDur: 0.55 });
      ctx.restore();
    },
  };
})();
