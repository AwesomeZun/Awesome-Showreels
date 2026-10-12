// end (1 bar, 2 in the 30): the end card. The app's own line in two parts, the second marked in orange as its hero
// does (읽고 싶은 글을, / 함께 읽을 사람과.), the name and address below and the collection at the foot.
(() => {
  const R = RR;
  SCENES['end'] = {
    draw(ctx, t, env) {
      const lt = env.lt, P = env.palette;
      R.desk(ctx, t);
      ctx.save(); ctx.translate(0, Math.sin(lt * 0.9) * 5);                    // the block floats gently through the hold
      kinetic(ctx, '읽고 싶은 글을,', 960, 390, lt - 0.05, { size: 104, fam: 'display', weight: 900, color: P.ink, ls: -4.6, align: 'center', stagger: 0.03, dur: 0.55, rise: 40, blur: 6 });
      R.marker(ctx, '함께 읽을 사람과.', 960, 512, 104, lt - 0.3, { align: 'center', markAt: 0.45 });
      const up = Ease.outC(clamp(rm(lt, 0.8, 1.2)));
      ctx.save(); ctx.globalAlpha *= up; ctx.font = `900 54px ${FAM.display}`; ctx.fillStyle = P.ink; ctx.textAlign = 'center'; if ('letterSpacing' in ctx) ctx.letterSpacing = '-2px'; ctx.fillText('Read Room', 960, 690 + (1 - up) * 12); ctx.restore();
      ctx.save(); ctx.globalAlpha *= up; ctx.font = `600 28px ${FAM.mono}`; const url = 'read-room.toyz.kr', w = ctx.measureText(url).width + 60;
      rr(ctx, 960 - w / 2, 740 + (1 - up) * 12, w, 56, 28); ctx.fillStyle = P.ink; ctx.fill(); ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.fillText(url, 960, 777 + (1 - up) * 12); ctx.restore();
      ctx.restore();
      R.label(ctx, 'TOYZ ORIGINAL · PLAY OBJECTS', 960, 960, { size: 22, align: 'center', alpha: clamp(rm(lt, 1.0, 1.4)) });
    },
  };
})();
