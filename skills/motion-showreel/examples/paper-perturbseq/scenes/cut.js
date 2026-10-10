// cut (2 bars): one guide, one gene. Inside the nucleus (opening from the dive's cyan glow): a DNA double helix drawn
// in code turns slowly across the frame, chromatin threads drift behind it. Cas9 (a generated molecular surface with a
// real alpha channel) slides in on the helix, which passes through its open channel; the guide RNA's sequence types in,
// and the 20 base pairs it matches light amber on the DNA. On beat 4 Cas9 cuts: a flash at the break, sparks, and the
// two halves of the helix swing apart. Then the method in one line, and the count of regulators knocked out.
(() => {
  const GUIDE = 'GACCTTCAGCAATGTCTACG';
  SCENES['cut'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, lt = env.lt;
      ctx.fillStyle = '#04070E'; ctx.fillRect(0, 0, W, H);
      PS.glow(ctx, W * 0.5, H * 0.5, 1100, '#0E7490', 0.18);
      // chromatin threads behind
      ctx.save(); ctx.lineWidth = 2;
      for (let i = 0; i < 14; i++) {
        ctx.strokeStyle = rgba(i % 3 ? '#164E63' : '#4C1D95', 0.5); ctx.beginPath();
        for (let x = -40; x <= W + 40; x += 30) { const y = 120 + i * 62 + Math.sin(x * 0.006 + i * 1.7 + lt * 0.3) * 36 + Math.sin(x * 0.017 + i) * 10; x === -40 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
        ctx.stroke();
      }
      ctx.restore();
      PS.bokeh(ctx, lt, 18, { seed: 4, a: 0.08, c1: '#22D3EE', c2: '#A78BFA' });
      // the helix, cut on beat 4
      const cutK = clamp((b - 4) / 1.2), open = Ease.outExpo(cutK), m = PS.meta().cas9, S = 1;
      const cx = W / 2, cy = 560;
      const hl = b > 2.2 && b < 4.2 ? [cx - 160, cx + 160] : null;
      PS.helix(ctx, -60, W + 60, cy, { phase: lt * 1.3, cut: b >= 4 ? cx : undefined, gap: 90 * open, tilt: 0.1 * open, hl });
      // Cas9 slides in along the helix and grips it; after the cut it lets go upward
      const inK = Ease.outExpo(clamp(b / 1.4)), away = Ease.outExpo(clamp((b - 4.15) / 1.2));
      const ix = cx + (1 - inK) * 1300 + (m.size[0] / 2 - (m.channel.x0 + m.channel.x1) / 2) * S, iy = cy + (m.size[1] / 2 - m.channel.y) * S - away * 330;
      PS.layer(ctx, 'cas9', ix + away * 260, iy, S * (1 - 0.18 * away), { a: 1 - away * 0.55, blur: away * 3 });
      if (b >= 4) {                                                       // the break
        const f = Math.exp(-(b - 4) * 3.2);
        PS.glow(ctx, cx, cy, 260, '#FDE68A', f); PS.glow(ctx, cx, cy, 90, '#FFFFFF', f);
        for (let i = 0; i < 26; i++) {
          const a = hash(i) * TAU, sp = 120 + hash(i + 7) * 360, k = (b - 4) * B, x = cx + Math.cos(a) * sp * k, y = cy + Math.sin(a) * sp * k * 0.7 + 60 * k * k;
          if (k < 0.9) PS.glow(ctx, x, y, 10, i % 2 ? PS.AMBER : PS.MAG, (1 - k / 0.9) * 0.9);
        }
      }
      // the guide
      const gk = clamp((b - 1.2) / 1);
      if (gk > 0) {
        PS.txt(ctx, 'sgRNA · TOX', 1270, 200, { size: 26, mono: true, color: PS.AMBER, a: clamp(gk * 3), ls: 1 });
        PS.txt(ctx, `5′-${GUIDE}-3′`, 1270, 250, { size: 36, mono: true, color: '#FDE68A', n: 3 + GUIDE.length * gk, glow: rgba(PS.AMBER, 0.5) });
        if (hl) { ctx.save(); ctx.strokeStyle = rgba(PS.AMBER, 0.7); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hl[0], cy + 70); ctx.lineTo(hl[0], cy + 84); ctx.lineTo(hl[1], cy + 84); ctx.lineTo(hl[1], cy + 70); ctx.stroke(); ctx.restore(); PS.txt(ctx, 'target, 20 bp', cx, cy + 116, { size: 20, mono: true, color: PS.AMBER, align: 'center' }); }
      }
      // the method in a line, the count
      PS.rise(ctx, 'One guide RNA, one gene knocked out.', 110, 880, (b - 4.6) / 0.6, { size: 46, weight: 600 });
      const c = clamp((b - 5.2) / 1.6);
      if (c > 0) { PS.txt(ctx, String(Math.round(612 * Ease.outC(c))), 110, 960, { size: 40, mono: true, weight: 600, color: PS.MAG }); PS.txt(ctx, 'transcription factors and chromatin regulators, one per cell', 222, 958, { size: 26, color: C.ink2, a: clamp(c * 3) }); }
      PS.txt(ctx, 'a  Pooled CRISPR knockout', 110, 96, { size: 24, weight: 600, color: C.ink2, a: clamp(b * 2) });
      // in: out of the dive's glow
      if (b < 0.6) { ctx.fillStyle = rgba('#0B1A2A', 1 - b / 0.6); ctx.fillRect(0, 0, W, H); }
      PS.vignette(ctx, 0.5);
    },
  };
})();
