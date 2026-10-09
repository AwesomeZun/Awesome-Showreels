// ignite (2 bars, 3 in the 30): a lantern in the dark. Black; on beat 0.5 a spark, and the hero's lantern catches:
// its light grows with a flicker and reveals a stone corridor (the light map multiplies the pixels, so only what the
// lantern reaches has colour). On 1.5 and 2 the two wall sconces catch from it, one each side (dynamic lights), dust
// turns in the light, near pillars sit blurred in the foreground. From beat 3 LANTERNFORGE is burned in left to
// right in gold with sparks at the burning edge; 2.0 stamps on 4.5; the line types on 5.5. The camera pushes in all
// the while. Out: the lantern flares until the frame is warm white (the next scene opens from it).
(() => {
  const CAM = (lt, dur) => { const p = Ease.ioSine(clamp(lt / dur)); return { z: 1 + 0.08 * p, dx: -36 * p, dy: -10 * p }; };
  SCENES['ignite'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, lt = env.lt, b = lt / B, M = HD.meta().sheets.hero_sheet, S = HD.S;
      const cam = CAM(lt, env.dur), CX = 960, CY = 600;
      const T = (x, y) => [(x + cam.dx - CX) * cam.z + CX, (y + cam.dy - CY) * cam.z + CY];
      ctx.fillStyle = '#04050B'; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.translate(CX, CY); ctx.scale(cam.z, cam.z); ctx.translate(-CX + cam.dx, -CY + cam.dy);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      HD.layer(ctx, 'corridor_bg', -80, -60);
      // the hero: idle (breathing) until beat 6.5, then walks right
      const walk = Math.max(0, b - 6.5), hx = 960 + walk * B * 70, feet = 892;
      const frame = walk > 0 ? 2 + (Math.floor(lt * 10) % 6) : Math.floor(lt * 2.2) % 2;
      HD.sprite(ctx, 'hero_sheet', frame, hx, feet);
      ctx.restore();
      // the foreground pillars: nearer, so they move more and sit out of focus
      ctx.save(); ctx.translate(CX, CY); ctx.scale(cam.z * 1.06, cam.z * 1.06); ctx.translate(-CX + cam.dx * 1.8, -CY + cam.dy * 1.4);
      HD.layer(ctx, 'corridor_fg', -80, -60, { blur: 10 });
      ctx.restore();
      // ── lights
      const lan = M.lantern[frame], [lx, ly] = T(hx + lan[0] * S, feet + lan[1] * S);
      const flick = 1 + 0.07 * Math.sin(lt * 23) + 0.05 * Math.sin(lt * 37 + 1) + 0.03 * Math.sin(lt * 61);
      const on = Ease.outC(clamp((b - 0.55) / 1.1)), lights = [];
      if (b >= 0.5) lights.push({ x: lx, y: ly, r: (160 + 760 * on) * flick, color: '#FFEBCB', i: 1 });
      const sconces = [[520, 318, 1.5], [1480, 318, 2]];
      sconces.forEach(([x, y, b0]) => { const k = Ease.outC(clamp((b - b0) / 0.6)); if (k > 0) { const [sx, sy] = T(x, y); lights.push({ x: sx, y: sy, r: 520 * k * (1 + 0.05 * Math.sin(lt * 19 + x)), color: '#FFD9A8', i: 0.95 * k }); } });
      HD.lightmap(ctx, b < 0.5 ? '#000000' : toHex(mix('#05060D', '#1A2140', clamp((b - 0.5) / 3))), lights);
      // the flames and their bloom, the spark on 0.5, dust in the light
      if (b >= 0.5) { HD.glow(ctx, lx, ly, 420 * flick * on, '#FF9A3C', 0.55); HD.glow(ctx, lx, ly, 120 * flick, '#FFC070', 1); HD.glow(ctx, lx, ly, 36, '#FFF6DA', 1); }
      sconces.forEach(([x, y, b0]) => { const k = clamp((b - b0) / 0.4); if (k > 0) { const [sx, sy] = T(x, y); HD.glow(ctx, sx, sy, 300 * k, '#FF8A30', 0.5); HD.glow(ctx, sx, sy, 90 * k, '#FFB050', 1); HD.glow(ctx, sx, sy, 26, '#FFF3D0', k); } });
      if (b > 0.45 && b < 1.2) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 24; i++) { const a = hash(i * 7.1) * TAU, u = (b - 0.45) / 0.75, d = u * (40 + hash(i) * 120); ctx.fillStyle = rgba('#FFE0A0', 1 - u); ctx.fillRect(Math.round((lx + Math.cos(a) * d) / S) * S, Math.round((ly + Math.sin(a) * d + u * u * 60) / S) * S, S, S); }
        ctx.restore();
      }
      HD.dust(ctx, lt, lights, { n: 160 });
      HD.grade(ctx, { top: '#2A6F8F', bottom: '#E0902F', a: 0.28, vig: 0.7 });
      // ── the logo burns in left to right (from beat 3), sparks at the burning edge
      if (b >= 3) {
        const p = clamp((b - 3) / 1.2), w = HD.ptext(ctx, 'LANTERNFORGE', 900, 110, { size: 30, weight: 700, gold: true, outline: '#2A1208', shadow: '#120804', align: 'center', reveal: Ease.outC(p) });
        HD.glow(ctx, 900, 185, 560, '#FF9A3C', 0.22 * clamp((b - 3) * 2) * (0.85 + 0.15 * Math.sin(lt * 3)));
        if (p < 1) {
          const ex = 900 - w / 2 + w * Ease.outC(p);
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          for (let i = 0; i < 18; i++) { const a = hash(i * 3.3 + Math.floor(lt * 20)) * TAU, d = hash(i * 5.1 + Math.floor(lt * 20)) * 50; ctx.fillStyle = rgba(i % 3 ? '#FFD27A' : '#FFFFFF', 0.9); ctx.fillRect(Math.round((ex + Math.cos(a) * d) / S) * S, Math.round((185 + Math.sin(a) * d * 1.4) / S) * S, S, S); }
          ctx.restore(); HD.glow(ctx, ex, 185, 90, '#FFE2A0', 1);
        }
      }
      if (b >= 4.5) {                                                      // the 2.0 stamp: drops in, flashes
        const k = clamp((b - 4.5) / 0.25), s = lerp(1.6, 1, Ease.outC(k)), lw = HD.ptext(ctx, 'LANTERNFORGE', -9999, -9999, { size: 30, weight: 700, gold: true, outline: '#2A1208', shadow: '#120804' }), x = 900 + lw / 2 + 120, y = 180;
        ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha = clamp(k * 3);
        ctx.fillStyle = '#2A1208'; ctx.fillRect(-95, -60, 190, 120); ctx.fillStyle = '#B8203C'; ctx.fillRect(-90, -55, 180, 110); ctx.fillStyle = '#F0607A'; ctx.fillRect(-90, -55, 180, 10);
        ctx.restore();
        HD.ptext(ctx, '2.0', x, y - 44 * s, { fam: 'DotGothic16', size: 16, weight: 400, fill: '#FFFFFF', outline: '#5A1F3A', align: 'center', a: clamp(k * 3) });
        if (k < 1) HD.glow(ctx, x, y, 260, '#FFFFFF', 1 - k);
      }
      if (b >= 5.5) HD.ptext(ctx, 'An open-source 16-bit RPG engine', 960, 292, { size: 12, weight: 500, fill: '#F4EBD9', outline: '#120804', align: 'center', reveal: clamp((b - 5.5) * 1.6) });
      // out: the lantern flares to warm white
      if (env.phase.out > 0) { const k = Ease.inQ(env.phase.out); HD.glow(ctx, lx, ly, 200 + 2400 * k, '#FFF4DC', 1.6 * k); ctx.fillStyle = rgba('#FFF4DC', Math.max(0, k * 1.3 - 0.3)); ctx.fillRect(0, 0, W, H); }
    },
  };
})();
