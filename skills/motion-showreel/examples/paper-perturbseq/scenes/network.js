// network (2 bars, 3 in the 30): panel c. The 60 regulators as nodes coloured by programme (layout precomputed in
// paper-src/simulate.py), sized by total effect; the strong shared-effect edges draw on (beats 1-3: magenta for
// positive, cyan for negative). On beat 4 the hub (TOX, NR4A1, ARID1A) pulls to the centre of attention: the rest
// dims, the hub pulses on the beat with its names. The graph turns very slowly.
(() => {
  SCENES['network'] = {
    draw(ctx, t, env) {
      const S = window.PS, B = env.beatSec, b = env.lt / B, D = S.data();
      S.bg(ctx); S.chrome(ctx, 'c', 'Regulators that share effects, and the hub that holds exhaustion');
      const CX = 960, CY = 600, R = 400, rot = env.lt * 0.03, ca = Math.cos(rot), sa = Math.sin(rot);
      const P = D.pos.map(([x, y]) => [CX + (x * ca - y * sa) * R * 1.35, CY + (x * sa + y * ca) * R]);
      const hubI = D.hub.map((h) => D.perts.indexOf(h)), focus = Ease.outExpo(clamp((b - 4) / 0.6));
      const gw = Ease.outExpo(clamp((b - 1) / 2));
      D.strong.forEach(([a, c, r], k) => {
        const p = clamp(gw * D.strong.length - k); if (p <= 0) return;
        const hub = hubI.includes(a) || hubI.includes(c), al = (hub ? 0.85 : 0.45) * (1 - 0.7 * focus * (hub ? 0 : 1));
        ctx.strokeStyle = rgba(r > 0 ? '#E879F9' : '#22D3EE', al); ctx.lineWidth = hub ? 2.5 : 1.4;
        ctx.beginPath(); ctx.moveTo(P[a][0], P[a][1]); ctx.lineTo(lerp(P[a][0], P[c][0], p), lerp(P[a][1], P[c][1], p)); ctx.stroke();
      });
      D.perts.forEach((name, i) => {
        const e = D.effects[i].reduce((s, v) => s + Math.abs(v), 0), r = 5 + e * 0.32, hub = hubI.includes(i);
        const app = clamp((b - i * 0.012) * 3), pulse = hub && b > 4 ? 1 + 0.25 * Math.exp(-((b % 1) * 4)) : 1;
        ctx.globalAlpha = app * (hub ? 1 : 1 - 0.6 * focus); ctx.fillStyle = S.PROG[D.module[i]]; circle(ctx, P[i][0], P[i][1], r * pulse); ctx.fill(); ctx.globalAlpha = 1;
        if (hub && b > 4) S.txt(ctx, name, P[i][0] + r + 10, P[i][1] + 7, { size: 24, mono: true, weight: 600, color: C.accent3, a: focus });
      });
      // legend
      D.programs.forEach((p, k) => { ctx.fillStyle = S.PROG[k]; circle(ctx, 1560, 220 + k * 34, 8); ctx.fill(); S.txt(ctx, p, 1580, 227 + k * 34, { size: 18, color: C.ink2 }); });
      ctx.fillStyle = '#E879F9'; ctx.fillRect(1552, 410, 18, 3); S.txt(ctx, 'positive', 1580, 418, { size: 18, color: C.ink2 });
      ctx.fillStyle = '#22D3EE'; ctx.fillRect(1552, 444, 18, 3); S.txt(ctx, 'negative', 1580, 452, { size: 18, color: C.ink2 });
    },
  };
})();
