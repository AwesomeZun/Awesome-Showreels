// together (2 bars, 3 in the 30; the drop): together without a server. The camera pulls back to the whole essay with
// every reader's highlights in four colours; the app's real read-together panel rises beside it: share the room as one
// link (the button is pressed and a link chip flies off carrying its compressed hash), or as a .readroom.json file,
// and its two participants (민지, 태오). Headline: 서버 없이, / 링크 하나로 함께.
(() => {
  const R = RR, PX = 1170, PY = 60, PK = 1.3;
  SCENES['together'] = {
    draw(ctx, t, env) {
      const lt = env.lt, P = env.palette, B = env.beatSec, out = env.phase.out;
      R.desk(ctx, t);
      const z = Ease.ioC(clamp(lt / (1.2 * B))), s = lerp(0.9, 0.5, z), cy = lerp(700, 0, z);
      R.page(ctx, lerp(-20, 728, z), lerp(0, 30, z), s, cy, H * 2, {}, { full: true });
      const e = styleSpring(lt - B, { f: 1.8, z: 0.75 });
      if (lt > B) { ctx.save(); ctx.globalAlpha *= clamp((lt - B) / 0.25); ctx.translate((1 - e) * 120, 0);
        ctx.shadowColor = 'rgba(23,25,29,0.22)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 20; R.draw(ctx, 'together', PX, PY, PK, { crop: [1160, 65, 440, 730] }); ctx.restore();
        const pr = 2.5 * B, press = lt >= pr ? Math.exp(-(lt - pr) * 6) : 0;
        if (press > 0.02) { ctx.save(); ctx.globalAlpha *= press * 0.4; rr(ctx, PX + 24 * PK, PY + (298 - 65) * PK, 392 * PK, 44 * PK, 22 * PK); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.restore(); }
        const fl = clamp((lt - 3 * B) / (1.5 * B)); if (fl > 0 && fl < 1) { const f = Ease.ioC(fl), x = lerp(PX + 220 * PK, 900, f), y = lerp(PY + 320 * PK, 120, f) - Math.sin(Math.PI * f) * 120;
          ctx.save(); ctx.globalAlpha *= 1 - clamp((fl - 0.8) / 0.2); ctx.font = `600 24px ${FAM.mono}`; const txt = '#/i/d.H4sIAAAA…', w = ctx.measureText(txt).width + 40;
          rr(ctx, x - w / 2, y - 24, w, 48, 24); ctx.fillStyle = '#17191D'; ctx.fill(); ctx.fillStyle = '#FFD23F'; ctx.textAlign = 'center'; ctx.fillText(txt, x, y + 8); ctx.restore(); }
      }
      kinetic(ctx, '서버 없이,', 120, 430, lt - 0.3, { size: 80, fam: 'display', weight: 900, color: P.ink, ls: -3.4, stagger: 0.03, dur: 0.55, rise: 36, blur: 6, out: { at: env.dur - env.outSec } });
      R.marker(ctx, '링크 하나로 함께.', 126, 526, 80, lt - 0.6, { markAt: 0.6, out: { at: env.dur - env.outSec }, alpha: 1 - Ease.inC(out) });
    },
  };
})();
