// templates (3 bars, the 30 only): same portfolio, another face. One window holds the app's real preview; on every
// other beat it wipes to the next template of the same content, as the app renders it: GRID, EDITORIAL with its
// big orange sphere, MONO as a list, then MONO and EDITORIAL in the dark tone. An orange tab under the window names
// the face. Headline: 템플릿 하나에 / 얼굴이 바뀌어요.
(() => {
  const F = FRAME, FACES = [['tpl_grid', 'GRID'], ['tpl_editorial', 'EDITORIAL'], ['tpl_mono', 'MONO'], ['tpl_mono_dark', 'MONO · DARK'], ['tpl_editorial_dark', 'EDITORIAL · DARK']];
  SCENES['templates'] = {
    draw(ctx, t, env) {
      const lt = env.lt, P = env.palette, B = env.beatSec, out = env.phase.out;
      F.stage(ctx, t, { lightX: 1300 });
      const e = styleSpring(lt + 0.05, { f: 2.2, z: 0.66 });
      const wx = 830, wy = 140 + (1 - e) * 80, k = 0.92, vw = 1044 * k, vh = 760 * k;
      ctx.save(); ctx.globalAlpha *= clamp(e * 1.5);
      const c = F.windowFrame(ctx, wx, wy, vw, vh, { title: '이로아-portfolio.html' });
      const idx = Math.max(0, Math.min(FACES.length - 1, Math.floor((lt - 2 * B) / (2 * B)) + 1)), prev = Math.max(0, idx - 1);
      const sw = idx === 0 ? 1 : Ease.ioC(clamp((lt - (idx * 2) * B) / (0.6 * B)));
      ctx.save(); ctx.beginPath(); ctx.rect(c.x, c.y, c.w, c.h); ctx.clip();
      F.draw(ctx, FACES[prev][0], c.x - 20 * k, c.y - 20 * k, k);
      if (idx > 0) { ctx.beginPath(); ctx.rect(c.x, c.y, c.w * sw, c.h); ctx.clip(); F.draw(ctx, FACES[idx][0], c.x - 20 * k, c.y - 20 * k, k); }
      ctx.restore();
      if (idx > 0 && sw < 1) { ctx.fillStyle = P.accent; ctx.fillRect(c.x + c.w * sw - 3, c.y, 6, c.h); }
      ctx.restore();
      // the face's name
      const tag = FACES[idx][1]; ctx.save(); ctx.font = `700 26px ${FAM.mono}`; const tw = ctx.measureText(tag).width + 40;
      rr(ctx, wx, wy + vh + 70, tw, 50, 6); ctx.fillStyle = P.accent; ctx.fill(); ctx.fillStyle = '#FFFFFF'; ctx.fillText(tag, wx + 20, wy + vh + 104); ctx.restore();
      FACES.forEach((f, i) => { ctx.fillStyle = i === idx ? P.accent : 'rgba(11,11,13,0.18)'; ctx.fillRect(wx + vw - (FACES.length - i) * 34, wy + vh + 90, 24, 8); });
      F.label(ctx, '03 DESIGN', 120, 300, { size: 22, color: P.accent, alpha: clamp(rm(lt, 0.05, 0.3)) * (1 - out) });
      F.headline(ctx, ['템플릿 하나에', '얼굴이 바뀌어요.'], 114, 410, lt - 0.1, { size: 84, out: { at: env.dur - env.outSec } });
      kinetic(ctx, 'GRID · EDITORIAL · MONO, 밝게 · 어둡게', 120, 650, lt - 0.9, { size: 30, fam: 'sans', weight: 600, color: P.ink2, ls: -0.4, stagger: 0.015, dur: 0.4, rise: 12, blur: 3, out: { at: env.dur - env.outSec } });
    },
  };
})();
