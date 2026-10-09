// gather (2 bars, 3 in the 30): the embryo gathers. 2,400 nuclei drift in from a loose cloud and settle onto the
// embryo's shell (beats 0-3) while the three channels arrive misregistered (each offset in its own direction) and
// slide into register on beat 3, where the overlaps flash white; the embryo turns slowly on the right; the title
// rises on the left (4-5), the authors and the fictional-data note (5.5). Hold: the turntable continues.
(() => {
  SCENES['gather'] = {
    draw(ctx, t, env) {
      const E = window.EMB, D = E.data(), B = env.beatSec, b = env.lt / B;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      const g = Ease.ioSine(clamp(b / 3)), reg = 1 - Ease.ioSine(clamp((b - 1.5) / 1.5)), yaw = t * 0.25, CX = 1260, CY = 540, SC = 330;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      D.nuclei.forEach((n, i) => {
        const h = hash(i * 1.37), loose = [Math.cos(h * 40) * 2.6, Math.sin(h * 77) * 1.6, Math.cos(h * 91) * 2.2];
        const p = [lerp(loose[0], n[0], g), lerp(loose[1], n[1], g), lerp(loose[2], n[2], g)];
        const [x, y, z] = E.proj(p, yaw, 0.35, CX, CY, SC), depth = clamp(0.55 - z * 0.35, 0.25, 1);
        E.glow(ctx, x - 26 * reg, y + 8 * reg, E.CH.nuc, 3.2, 0.7 * depth);
        if (n[3]) E.glow(ctx, x + 22 * reg, y - 12 * reg, E.CH.mem, 3.6, 0.55 * depth);
        if (n[4]) E.glow(ctx, x + 6 * reg, y + 24 * reg, E.CH.noto, 4.2, 0.9 * depth);
      });
      ctx.restore(); ctx.globalAlpha = 1;
      if (b > 3 && b < 3.6) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba('#FFFFFF', 0.25 * (1 - (b - 3) / 0.6)); ctx.beginPath(); ctx.ellipse(CX, CY, SC * 1.25, SC, 0, 0, TAU); ctx.fill(); ctx.restore(); }
      E.chips(ctx, 1580, 860, clamp(b - 3));
      E.stamp(ctx, '10.0 hpf', 1580, 820, clamp(b - 3));
      E.rise(ctx, 'Light-sheet tracking of every', 96, 430, clamp((b - 4) * 1.5), { size: 60, weight: 700, ls: -1 });
      E.rise(ctx, 'cell in the zebrafish embryo', 96, 500, clamp((b - 4.3) * 1.5), { size: 60, weight: 700, ls: -1 });
      E.rise(ctx, 'reveals an early notochord decision', 96, 570, clamp((b - 4.6) * 1.5), { size: 60, weight: 700, ls: -1, color: E.CH.noto });
      E.rise(ctx, 'Albrecht, Rivera, Sato & Mensah · 2026', 96, 640, clamp((b - 5.3) * 1.5), { size: 24, color: C.ink2 });
      E.rise(ctx, 'FICTIONAL MANUSCRIPT · SIMULATED DATA', 96, 680, clamp((b - 5.6) * 1.5), { size: 17, mono: true, color: C.muted, ls: 1.5 });
    },
  };
})();
