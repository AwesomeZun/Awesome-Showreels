// grow (2 bars, 3 in the 30): panel b, days 0-7 in brightfield. One organoid in a large field of view grows on a
// continuous clock (the day counter in mono runs 0 -> 7 over beats 0-6): a single cell, a smooth cyst, then crypt
// buds pushing out of the wall from day 2, one more each day. Notes are written into the margin as the days pass
// (D2 first buds, D4 WNT pulse 24 h, D7 harvest), and the growth curve draws itself under the field.
(() => {
  const BUDS = [[0.4, 2.0], [2.3, 2.7], [4.1, 3.4], [1.3, 4.1], [5.3, 4.8], [3.2, 5.5], [0.9, 6.2]];   // [angle, day it starts]
  SCENES['grow'] = {
    draw(ctx, t, env) {
      const O = window.ORG, D = O.data(), B = env.beatSec, b = env.lt / B;
      O.page(ctx);
      O.txt(ctx, 'b', 200, 120, { size: 40, weight: 700, color: C.accent }); O.txt(ctx, 'Brightfield, every 6 hours', 244, 118, { size: 28, weight: 600 });
      const day = clamp(b / 6) * 7, FX = 200, FY = 160, FW = 980, FH = 640;
      O.field(ctx, FX, FY, FW, FH, () => {
        const r = 14 + 210 * (1 - Math.exp(-day / 3.2)), buds = BUDS.filter(([, d0]) => day > d0).map(([a, d0]) => [a, Math.min(1, (day - d0) / 1.2)]);
        O.organoid(ctx, FX + FW / 2, FY + FH / 2, r, buds, { wob: day });
        for (let i = 0; i < 4; i++) O.organoid(ctx, FX + 80 + i * 260 + Math.sin(i) * 30, FY + (i % 2 ? 560 : 90), 10 + day * 3 * (0.4 + i * 0.1), [], { wob: i });   // neighbours
      });
      O.txt(ctx, `DAY ${day.toFixed(1)}`, FX + 24, FY + 50, { size: 30, mono: true, weight: 600, color: C.ink });
      ctx.fillStyle = C.ink; ctx.fillRect(FX + FW - 170, FY + FH - 36, 140, 5); O.txt(ctx, '100 µm', FX + FW - 100, FY + FH - 48, { size: 18, mono: true, align: 'center' });
      // margin notes
      [['D2  first crypt buds', 2], ['D4  WNT pulse, 24 h', 4], ['D7  harvest + stain', 6.6]].forEach(([s, d], i) => O.note(ctx, s, 1240, 260 + i * 70, clamp((day - d) * 1.5), { size: 26, color: i === 1 ? C.accentInk : '#4E5A6E' }));
      // growth curve
      const GX = 1240, GY = 560, GW = 520, GH = 220;
      ctx.strokeStyle = rgba(C.ink, 0.5); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(GX, GY); ctx.lineTo(GX, GY + GH); ctx.lineTo(GX + GW, GY + GH); ctx.stroke();
      ctx.strokeStyle = C.accent3; ctx.lineWidth = 3; ctx.beginPath();
      D.growth.forEach(([d, dia], i) => { if (d > day) return; const x = GX + d / 7 * GW, y = GY + GH - dia / 600 * GH; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
      O.txt(ctx, 'diameter (µm)', GX, GY - 14, { size: 18, mono: true, color: C.muted });
      O.txt(ctx, 'days', GX + GW, GY + GH + 30, { size: 18, mono: true, color: C.muted, align: 'right' });
    },
  };
})();
