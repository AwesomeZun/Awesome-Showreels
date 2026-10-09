// styles (4 bars): "Fourteen sources. Fourteen looks." The fourteen example reels pass on a carousel, one per beat
// (each card glides in during the last 0.3 beat before its beat and plays its own clip), its name and its
// source -> look line rising under it with a 01/14 counter. On beat 14 every card flies into a 5x3 mosaic around the
// count: fourteen reels, no two alike.
(() => {
  const GAP = 760, CW = 1100, CH = CW * 9 / 16, CY = 450;
  SCENES['styles'] = {
    draw(ctx, t, env) {
      const H_ = window.HERO, S = H_.STYLES, B = env.beatSec, b = env.lt / B;
      H_.stage(ctx);
      const n = Math.floor(b + 0.3), f = clamp((b + 0.3 - n) / 0.3);
      const pos = clamp(n - 1 + Ease.outQuint(f), 0, S.length - 1);
      const mz = clamp((b - 14) / 1.4);                                     // carousel -> mosaic
      const slots = H_.grid(5, 3, [96, 170, 1728, 860], 18).filter((_, k) => k !== 7);
      const rect = (i) => {
        const d = i - pos, ad = Math.abs(d), s = 1 - 0.4 * Math.min(1, ad);
        const w = CW * s, h = CH * s, x = 960 + d * GAP * (ad > 1 ? 0.92 : 1) - w / 2, y = CY - h / 2;
        return { x, y, w, h, ad };
      };
      const order = S.map((_, i) => i).sort((a, c) => Math.abs(c - pos) - Math.abs(a - pos));
      for (const i of order) {
        const r = rect(i), m = Ease.ioC(clamp(mz * 1.25 - i * 0.02));
        const [gx, gy, gw, gh] = slots[i];
        const x = lerp(r.x, gx, m), y = lerp(r.y, gy, m), w = lerp(r.w, gw, m), h = lerp(r.h, gh, m);
        const a = lerp(r.ad > 2.4 ? 0 : 1 - 0.35 * Math.min(1, r.ad), 1, m);
        H_.card(ctx, S[i][0], t, x, y, w, h, { a, dim: lerp(0.5 * Math.min(1, r.ad), 0, m), r: lerp(22, 12, m), ring: r.ad < 0.5 && m < 0.5 ? rgba(C.accent, 0.7) : null, ringW: r.ad < 0.5 ? 3 : 1.5 });
      }
      // heading and counter
      const lab = 1 - Ease.inQ(clamp((b - 13.9) / 0.5));
      H_.rise(ctx, 'Fourteen sources. Fourteen looks.', 96, 108, clamp(b / 0.5), { size: 46, weight: 700, a: lab, ls: -1 });
      const k = Math.round(pos);
      H_.chip(ctx, `${String(k + 1).padStart(2, '0')} / 14`, W - 96, 92, { size: 28, a: lab, align: 'right', ring: rgba(C.accent2, 0.6), color: C.accent2 });
      // name and line of the current card, rising on its beat
      const p = clamp((b + 0.3 - n) / 0.45) * lab, cur = S[k];
      if (p > 0) {
        H_.rise(ctx, cur[1], 960, 860, p, { size: 66, weight: 700, align: 'center', color: mix(C.ink, '#FFFFFF', 0.4), ls: -1.5 });
        H_.rise(ctx, `${cur[2]}  →  ${cur[3]}`, 960, 918, clamp(p * 1.2 - 0.1), { size: 32, weight: 500, align: 'center', color: C.ink2, ls: 0 });
        H_.rise(ctx, cur[0], 960, 966, clamp(p * 1.2 - 0.2), { size: 24, weight: 500, fam: 'M', align: 'center', color: C.accent, ls: 0 });
      }
      // the count in the mosaic's centre
      const cc = Ease.outQuint(clamp((b - 14.6) / 0.6));
      if (cc > 0) {
        const [gx, gy, gw, gh] = H_.grid(5, 3, [96, 170, 1728, 860], 18)[7];
        H_.txt(ctx, '14', gx + gw / 2, gy + gh * 0.62, { size: 150 * (0.85 + 0.15 * cc), weight: 700, align: 'center', color: C.accent, a: cc, ls: -6 });
        H_.txt(ctx, 'looks, 0 presets', gx + gw / 2, gy + gh * 0.9, { size: 30, weight: 600, align: 'center', color: C.ink2, a: cc, ls: 0 });
      }
    },
  };
})();
