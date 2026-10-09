// end (2 bars): all eighteen reels drift behind a glass panel (6x3, dimmed); the title rises (beat 0.3), the promise
// (1), the install command types itself (1.8) and the address settles (2.5). The loop seam returns to the intro's
// empty stage.
(() => {
  SCENES['end'] = {
    draw(ctx, t, env) {
      const H_ = window.HERO, A = H_.ALL, B = env.beatSec, b = env.lt / B;
      H_.stage(ctx);
      const slots = H_.grid(6, 3, [-60, -40, 2040, 1160], 14), drift = env.lt * 14;
      const fin = Ease.outC(clamp(b / 1.2));
      A.forEach(([id], i) => {
        const [x, y, w, h] = slots[i], dx = (i % 2 ? -1 : 1) * drift * (Math.floor(i / 6) % 2 ? 1 : -1);
        H_.card(ctx, id, t, x + dx, y, w, h, { a: fin * 0.9, dim: 0.62, r: 10, shadow: false });
      });
      // glass panel
      const pw = 1240, ph = 460, px = 960 - pw / 2, py = 540 - ph / 2, pp = Ease.outQuint(clamp((b - 0.1) / 0.6));
      ctx.save(); ctx.globalAlpha *= pp;
      rr(ctx, px, py, pw, ph, 32); ctx.fillStyle = rgba(C.bg, 0.86); ctx.fill(); ctx.strokeStyle = rgba(C.accent, 0.45); ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
      ctx.save(); ctx.font = font(124, 700, 'D'); if ('letterSpacing' in ctx) ctx.letterSpacing = '-3px';
      const w1 = ctx.measureText('Awesome ').width, w2 = ctx.measureText('Showreels').width; ctx.restore();
      const x0 = 960 - (w1 + w2) / 2;
      H_.rise(ctx, 'Awesome', x0, 470, clamp((b - 0.3) / 0.4), { size: 124, weight: 700, ls: -3, color: mix(C.ink, '#FFFFFF', 0.5) });
      H_.rise(ctx, 'Showreels', x0 + w1, 470, clamp((b - 0.5) / 0.4), { size: 124, weight: 700, ls: -3, color: C.accent });
      H_.rise(ctx, 'Any repo in. A beat-synced showreel out.', 960, 548, clamp((b - 1) / 0.5), { size: 40, weight: 500, align: 'center', color: C.ink2, ls: -0.3 });
      const cmd = '/plugin install awesome-showreels@awesome-showreels', ty = clamp((b - 1.8) / 0.9);
      if (ty > 0) {
        const s = cmd.slice(0, Math.ceil(cmd.length * ty)), caret = Math.floor(env.lt * 3) % 2 === 0 || ty < 1;
        H_.chip(ctx, s + (caret ? '▍' : ' '), 960, 632, { size: 28, align: 'center', ring: rgba(C.accent3, 0.6), color: C.ink });
      }
      H_.txt(ctx, 'github.com/AwesomeZun/Awesome-Showreels', 960, 700, { size: 26, weight: 500, fam: 'M', align: 'center', color: C.muted, a: Ease.outC(clamp((b - 2.5) / 0.5)), ls: 0 });
    },
  };
})();
