// finale (2 bars, 3 in the 30; the end card): victory. Rays of light turn slowly behind the logo; the party jumps
// on the downbeats (beats 0-2) in the clearing; LANTERNFORGE burns in gold with its 2.0 badge (1.5), the line and
// the facts type on (2-3): OPEN SOURCE · MIT, and the fictional-project note. Hold: fireflies, a lantern glow that
// breathes on the beat, the party keeps bobbing.
(() => {
  SCENES['finale'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, lt = env.lt, b = lt / B, S = HD.S;
      ctx.imageSmoothingEnabled = true;
      HD.layer(ctx, 'battle_bg', -40, -40, { blur: 8 });
      // light rays
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(960, 330);
      for (let i = 0; i < 14; i++) { ctx.rotate(TAU / 14); const a = 0.06 + 0.04 * Math.sin(lt * 1.3 + i); ctx.fillStyle = linear(ctx, 0, 0, 1200, 0, [[0, rgba('#FFD27A', a)], [1, rgba('#FFD27A', 0)]]); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1200, -90); ctx.lineTo(1200, 90); ctx.closePath(); ctx.fill(); }
      ctx.restore(); ctx.save(); ctx.translate(960, 330); ctx.rotate(lt * 0.05); ctx.restore();
      // the party, jumping on the downbeats of the first two bars
      [[760, 0], [960, 1], [1160, 2]].forEach(([x, f], i) => { const ph = (b + i * 0.15) % 1, jump = b < 4 ? -Math.sin(ph * Math.PI) * 70 : -Math.abs(Math.sin(b * Math.PI)) * 12; HD.sprite(ctx, 'party', f, x, 1010 + Math.round(jump / S) * S); });
      HD.lightmap(ctx, '#6070B0', [{ x: 960, y: 330, r: 1100, color: '#FFE9C8', i: 0.9 }, { x: 960, y: 900, r: 500, color: '#FFD9A0', i: 0.6 }]);
      HD.glow(ctx, 960, 330, 620, '#FF9A3C', 0.35 * (0.85 + 0.15 * Math.sin(b * Math.PI * 2)));
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 36; i++) { const x = (hash(i * 2.1) * W + Math.sin(lt * 0.5 + i) * 80) % W, y = 500 + hash(i * 4.4) * 520 + Math.cos(lt * 0.7 + i) * 40, a = 0.5 + 0.5 * Math.sin(lt * 3 + i); ctx.fillStyle = rgba('#FFE680', a); ctx.fillRect(Math.round(x / S) * S, Math.round(y / S) * S, S, S); }
      ctx.restore();
      HD.grade(ctx, { top: '#3050A0', bottom: '#E09040', a: 0.25, vig: 0.7 });
      if (b < 2) HD.ptext(ctx, 'VICTORY!', 960, 120, { size: 30, weight: 700, gold: true, outline: '#2A1208', shadow: '#120804', align: 'center', a: clamp(b * 3) * (1 - clamp((b - 1.5) * 2)) });
      if (b >= 1.5) {
        const p = clamp((b - 1.5) / 0.9), w = HD.ptext(ctx, 'LANTERNFORGE', 900, 210, { size: 30, weight: 700, gold: true, outline: '#2A1208', shadow: '#120804', align: 'center', reveal: Ease.outC(p) });
        if (p >= 1) {
          const x = 900 + w / 2 + 120, y = 280; ctx.fillStyle = '#2A1208'; ctx.fillRect(x - 95, y - 60, 190, 120); ctx.fillStyle = '#B8203C'; ctx.fillRect(x - 90, y - 55, 180, 110); ctx.fillStyle = '#F0607A'; ctx.fillRect(x - 90, y - 55, 180, 10);
          HD.ptext(ctx, '2.0', x, y - 44, { fam: 'DotGothic16', size: 16, fill: '#FFFFFF', outline: '#5A1F3A', align: 'center' });
        }
      }
      if (b >= 2) HD.ptext(ctx, 'Make the RPG you grew up with.', 960, 400, { size: 12, weight: 500, fill: '#F4EBD9', outline: '#120804', align: 'center', reveal: clamp((b - 2) * 1.5) });
      if (b >= 3) { HD.ptext(ctx, 'OPEN SOURCE · MIT', 960, 480, { fam: 'DotGothic16', size: 16, fill: '#F7C948', outline: '#120804', align: 'center' }); HD.ptext(ctx, 'FICTIONAL PROJECT · DEMO NUMBERS', 1820, 1030, { size: 8, weight: 500, fill: '#9AA3B8', outline: '#120804', align: 'right', a: 0.85 }); }
    },
  };
})();
