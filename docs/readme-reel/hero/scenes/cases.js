// cases (2 bars): "Distilled from four real productions." The mosaic gives way to the four reels the method came
// from, on a 2x2 grid that settles in (beats 0-1); each takes the light in turn for a beat and a half (FDDD,
// CC-statusline, K-BeautyGate, FlyGate) while the others dim, its name and kind on a plate in its corner.
(() => {
  SCENES['cases'] = {
    draw(ctx, t, env) {
      const H_ = window.HERO, CS = H_.CASES, B = env.beatSec, b = env.lt / B;
      H_.stage(ctx);
      H_.rise(ctx, 'Distilled from four real productions.', 96, 108, clamp(b / 0.5), { size: 46, weight: 700, ls: -1 });
      const slots = H_.grid(2, 2, [250, 160, 1420, 880], 26);
      const act = clamp(Math.floor((b - 0.5) / 1.5), 0, 3);
      CS.forEach(([id, name, kind, line], i) => {
        const e = Ease.outQuint(clamp((b - i * 0.15) / 0.6)), on = i === act && b >= 0.5;
        const lift = on ? Ease.outQuint(clamp((b - 0.5 - i * 1.5) / 0.4)) : 0;
        let [x, y, w, h] = slots[i];
        const s = (0.92 + 0.08 * e) * (1 + 0.035 * lift);
        const cx = x + w / 2, cy = y + h / 2; w *= s; h *= s; x = cx - w / 2; y = cy - h / 2;
        H_.card(ctx, id, t, x, y, w, h, { a: e, dim: on ? 0 : 0.5 * clamp(b - 0.5), r: 16, ring: on ? rgba(C.accent, 0.85) : null, ringW: on ? 3 : 1.5 });
        // the plate
        const pa = e * (on ? 1 : 0.75);
        ctx.save(); ctx.globalAlpha *= pa;
        ctx.save(); rr(ctx, x, y, w, h, 16); ctx.clip();
        ctx.fillStyle = linear(ctx, 0, y + h * 0.62, 0, y + h, [[0, 'rgba(17,17,27,0)'], [1, 'rgba(17,17,27,0.88)']]); ctx.fillRect(x, y + h * 0.6, w, h * 0.4);
        ctx.restore();
        H_.txt(ctx, name, x + 28, y + h - 58, { size: 40, weight: 700, color: on ? mix(C.ink, '#FFFFFF', 0.5) : C.ink, ls: -0.8 });
        H_.txt(ctx, `${kind} · ${line}`, x + 28, y + h - 24, { size: 22, weight: 500, fam: 'M', color: on ? C.accent2 : C.muted, ls: 0 });
        ctx.restore();
      });
    },
  };
})();
