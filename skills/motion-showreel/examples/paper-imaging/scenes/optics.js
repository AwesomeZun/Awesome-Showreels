// optics (1 bar, 2 in the 30): a blade of light. The microscope's two objectives (a generated render with a real alpha
// channel) come out of the dark as a rim light sweeps their metal; on beat 1 a laser enters the illumination objective
// and leaves its tip as a thin sheet of light that narrows to its waist at the focus, under the detection objective;
// the embryo's first plane lights there. The title rises on the left. On the last beat the camera rushes into the focus
// (the next scene opens on the embryo).
(() => {
  let HB = null;
  SCENES['optics'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, n = Math.round(env.dur / B), lt = env.lt;
      const m = ASSET('ill/meta.json').objectives, im = ASSET('ill/objectives.webp');
      const rush = Ease.inExpo(clamp((b - (n - 0.8)) / 0.8)), z = 1 + 0.04 * clamp(b / n) + 5 * rush;
      const F = [1420, 650];                                          // where the focus sits on screen
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.translate(F[0], F[1]); ctx.scale(z, z); ctx.translate(-m.focus[0], -m.focus[1]);
      const k = Ease.outC(clamp(b / 1));
      ctx.globalAlpha = k; ctx.drawImage(im, 0, 0, m.size[0], m.size[1]); ctx.globalAlpha = 1;
      // the rim light sweeping the metal: a band of light kept to the render's own pixels, added on top
      const sw = -400 + (b / n) * 2600, hb = HB || (HB = makeBuf(m.size[0], m.size[1]));
      hb.g.globalCompositeOperation = 'source-over'; hb.g.clearRect(0, 0, m.size[0], m.size[1]); hb.g.drawImage(im, 0, 0, m.size[0], m.size[1]);
      hb.g.globalCompositeOperation = 'source-in';
      hb.g.fillStyle = linear(hb.g, sw - 180, 0, sw + 180, 260, [[0, 'rgba(170,205,255,0)'], [0.5, 'rgba(170,205,255,0.85)'], [1, 'rgba(170,205,255,0)']]);
      hb.g.fillRect(0, 0, m.size[0], m.size[1]);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55 * k; ctx.drawImage(hb.c, 0, 0); ctx.restore();
      // the laser, and the sheet it becomes
      const on = clamp((b - 1) / 0.5), [tx, ty] = m.illTip, [fx, fy] = m.focus;
      if (on > 0) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const len = (fx + 520 - tx) * Ease.outExpo(on);
        for (let x = 0; x < len; x += 3) {
          const X = tx + x, dz = (X - fx) / 260, wv = 2 + 26 * Math.sqrt(1 + dz * dz) - 26, a = 0.9 * Math.exp(-Math.abs(X - fx) / 700);
          ctx.fillStyle = radial(ctx, X, ty, 0, wv + 18, [[0, `rgba(186,240,255,${a})`], [0.3, `rgba(46,230,255,${a * 0.45})`], [1, 'rgba(46,230,255,0)']]);
          ctx.fillRect(X - 2, ty - wv - 18, 4, (wv + 18) * 2);
        }
        // the sheet's extent in depth: a faint plane in perspective
        ctx.fillStyle = `rgba(46,230,255,${0.07 * on})`; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(fx + 520, ty - 46); ctx.lineTo(fx + 520, ty + 46); ctx.closePath(); ctx.fill();
        LS.glow(ctx, fx, fy, 70, '#FF3EC8', clamp((b - 1.6) / 0.6) * (0.75 + 0.25 * Math.sin(lt * 5)));
        ctx.restore();
      }
      ctx.restore();
      // the title
      const out = 1 - rush;
      LS.txt(ctx, 'ARTICLE', 110, 150, { size: 18, mono: true, color: 'rgba(46,230,255,0.9)', ls: 3, a: clamp((b - 0.2) * 2) * out });
      LS.rise(ctx, 'Light-sheet tracking of every cell', 110, 236, (b - 0.4) / 0.6, { size: 60, weight: 700, a: out });
      LS.rise(ctx, 'in the zebrafish embryo', 110, 308, (b - 0.6) / 0.6, { size: 60, weight: 700, a: out });
      LS.rise(ctx, 'reveals an early notochord decision', 110, 380, (b - 0.8) / 0.6, { size: 60, weight: 700, color: LS.COL.noto, a: out });
      LS.rise(ctx, 'One plane of light at a time, every 90 seconds, from 6 to 24 hours.', 112, 450, (b - 1.6) / 0.6, { size: 26, color: 'rgba(226,232,240,0.85)', a: out });
      if (rush > 0) { ctx.fillStyle = `rgba(0,0,0,${rush})`; ctx.fillRect(0, 0, W, H); }
    },
  };
})();
