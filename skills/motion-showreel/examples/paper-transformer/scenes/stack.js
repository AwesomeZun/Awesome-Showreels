// stack (2 bars, the 30 only): the model, block by block. Drawn new for this reel, not the paper's figure: two towers
// of six layers stack up from the bottom as paper cards, the encoder (self-attention, feed-forward) on the left and the
// decoder (masked self-attention, attention to the encoder, feed-forward) on the right; fine lines carry the encoder's
// output into every decoder layer; the English goes in under the encoder and the German comes out of the decoder a word
// at a time. The paper's sizes sit in the margin.
(() => {
  const DE = ['Der', 'Roboter', 'hob', 'den', 'Ball', 'auf,', 'weil', 'er', 'leicht', 'war.'];
  function card(g, x, y, w, h, lines, k, ink) {
    if (k <= 0) return; const e = Ease.outExpo(clamp(k));
    g.save(); g.globalAlpha = clamp(k * 2); g.translate(0, (1 - e) * -40);
    g.fillStyle = 'rgba(40,30,15,0.12)'; g.fillRect(x + 6, y + 6, w, h);
    g.fillStyle = '#FBF8F1'; g.fillRect(x, y, w, h); g.strokeStyle = ink; g.lineWidth = 1.6; g.strokeRect(x, y, w, h);
    lines.forEach((s, i) => TX.txt(g, s, x + 16, y + 28 + i * 24, { size: 20, color: i ? '#5A554C' : TX.INK, it: i > 0 }));
    g.restore();
  }
  SCENES['stack'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, n = Math.round(env.dur / B), cam = { z: 1 + 0.04 * Ease.ioSine(clamp(b / n)), dx: 20 * clamp(b / n) };
      TX.page(ctx, cam);
      TX.onPage(ctx, cam, (g) => {
        TX.txt(g, '4  Encoder and decoder, six layers each', 140, 150, { size: 30, weight: 600, color: TX.RED });
        const EX = 520, DX = 1060, CW = 380, CH = 92, Y0 = 860;
        for (let l = 0; l < 6; l++) {
          const y = Y0 - (l + 1) * (CH + 10), ke = clamp((b - 0.3 - l * 0.32) / 0.4), kd = clamp((b - 0.5 - l * 0.32) / 0.4);
          card(g, EX, y, CW, CH, [`encoder layer ${l + 1}`, 'self-attention', 'feed-forward'], ke, '#2C4A9A');
          card(g, DX, y, CW, CH, [`decoder layer ${l + 1}`, 'masked self-attention', 'encoder attention · feed-forward'], kd, TX.RED);
          if (kd >= 1 && b > 2.6) {
            const k = clamp((b - 2.6 - l * 0.1) / 0.5), P0 = [EX + CW, Y0 - 6 * (CH + 10) + 20], P1 = [EX + CW + 80, P0[1]], P2 = [DX - 80, y + CH / 2], P3 = [DX, y + CH / 2];
            g.strokeStyle = rgba('#2C4A9A', 0.5 * k); g.lineWidth = 1.4; g.beginPath(); g.moveTo(...P0); g.bezierCurveTo(...P1, ...P2, ...P3); g.stroke();
            // the encoder's output travelling into this decoder layer
            for (let q = 0; q < 2; q++) {
              const u = ((env.lt * 0.8 + l * 0.17 + q * 0.5) % 1), v = 1 - u, bx = v ** 3 * P0[0] + 3 * v * v * u * P1[0] + 3 * v * u * u * P2[0] + u ** 3 * P3[0], by = v ** 3 * P0[1] + 3 * v * v * u * P1[1] + 3 * v * u * u * P2[1] + u ** 3 * P3[1];
              g.fillStyle = rgba('#2C4A9A', 0.8 * k); circle(g, bx, by, 4); g.fill();
            }
          }
        }
        TX.typeset(g, 'The robot picked up the ball because it was light.', EX - 40, Y0 + 70, clamp((b - 0.1) / 1.2), { size: 30, it: true });
        const out = Math.floor(clamp((b - 3.4) / 3.2) * DE.length + 1e-6);
        TX.txt(g, DE.slice(0, out).join(' '), DX - 40, 168 + 30, { size: 34, it: true, color: TX.RED });
        [['N = 6 layers', 0], ['d_model = 512', 1], ['h = 8 heads', 2], ['d_ff = 2048', 3]].forEach(([s, i]) => TX.txt(g, s, 140, 360 + i * 48, { size: 28, a: clamp((b - 1.2 - i * 0.3) * 2) }));
        TX.txt(g, 'values from the paper', 140, 560, { size: 22, it: true, color: '#5A554C', a: clamp((b - 2.4) * 2) });
      });
    },
  };
})();
