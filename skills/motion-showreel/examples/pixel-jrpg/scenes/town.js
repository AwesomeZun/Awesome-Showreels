// town (2 bars, 3 in the 30): every window lights. Opens on the warm white the lantern flared into, which fades to a
// town at dusk. The camera rises from the foreground rooftops (blurred, near, fast) up past the houses (sharp) to the
// sky (soft, far): three depths. From beat 1 the windows light, house by house from left to right, each lighting
// the wall around it (light map) and blooming; chimneys smoke in stepped puffs, fireflies drift over the roofs. On
// 4.5 the window opens with the feature: DYNAMIC LIGHTS. Out: clouds rush up past the camera.
(() => {
  let SMOKE = null;
  function chimneys() {                                  // local peaks of the roof line, read from the art
    if (SMOKE) return SMOKE;
    const im = HD.img('town_mid'), c = makeBuf(im.width, im.height); c.g.drawImage(im, 0, 0);
    const d = c.g.getImageData(0, 0, im.width, im.height).data, top = [];
    for (let x = 0; x < im.width; x++) { let y = 0; while (y < im.height && d[(y * im.width + x) * 4 + 3] === 0) y++; top.push(y); }
    const peaks = [];
    for (let x = 6; x < im.width - 6; x++) { const y = top[x]; if (y < im.height * 0.55 && y <= Math.min(...top.slice(x - 6, x + 7)) && !peaks.some(p => Math.abs(p[0] - x) < 30)) peaks.push([x, y]); }
    SMOKE = peaks.slice(0, 8); return SMOKE;
  }
  SCENES['town'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, lt = env.lt, b = lt / B, S = HD.S, M = HD.meta();
      const rise = Ease.ioC(clamp(b / 4.2)), out = Ease.inQ(env.phase.out), cam = (1 - rise) * 420 - out * 260;
      ctx.fillStyle = '#10142A'; ctx.fillRect(0, 0, W, H);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      HD.layer(ctx, 'town_sky', -80 - lt * 4, -70 + cam * 0.15, { blur: 2 });
      const mx = -240 - lt * 14, my = 1080 - 1350 + 150 + cam * 0.6;
      HD.layer(ctx, 'town_mid_unlit', mx, my);
      // windows: on from beat 1, left to right, a little jitter per house
      const lit = HD.scaled('town_mid', 0), lights = [];
      M.town_windows.forEach(([x, y, w, h], i) => {
        const tOn = 1 + (x / 480) * 3.6 + (hash(Math.floor(x / 40)) - 0.5) * 0.4;
        if (b < tOn) return;
        const k = clamp((b - tOn) / 0.15), sx = mx + x * S, sy = my + y * S;
        ctx.save(); ctx.globalAlpha = k; ctx.drawImage(lit.c, x * S, y * S, w * S, h * S, sx, sy, w * S, h * S); ctx.restore();
        if (w * h >= 4) lights.push({ x: sx + w * S / 2, y: sy + h * S / 2, r: 150 + w * h * 3, color: '#FFE2B0', i: 0.75 * k });
      });
      HD.layer(ctx, 'town_near', -240 - lt * 30, 1080 - 1350 + 380 + cam * 1.35, { blur: 8 });
      HD.lightmap(ctx, toHex(mix('#5A5E9A', '#3B3F72', rise)), lights.concat([{ x: 1500, y: 140 + cam * 0.15, r: 900, color: '#FFB98A', i: 0.35 }]));
      lights.forEach((L) => HD.glow(ctx, L.x, L.y, 60, '#FFB050', 0.55 * L.i));
      // chimney smoke: stepped puffs rising and drifting right
      ctx.save();
      chimneys().forEach(([x, y], k) => {
        for (let j = 0; j < 6; j++) {
          const u = ((lt * 0.35 + j / 6 + k * 0.13) % 1), px = mx + x * S + u * 120 + Math.sin(u * 6 + k) * 12, py = my + y * S - u * 260, r = Math.round((2 + u * 5)) * S;
          ctx.fillStyle = rgba('#C9CEDF', 0.35 * (1 - u)); ctx.fillRect(Math.round(px / S) * S - r / 2, Math.round(py / S) * S - r / 2, r, r);
        }
      });
      ctx.restore();
      // fireflies over the roofs
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 30; i++) { const x = (hash(i * 3.3) * W + Math.sin(lt * 0.6 + i) * 60) % W, y = 640 + hash(i * 5.7) * 360 + Math.cos(lt * 0.8 + i * 2) * 30 + cam * 1.1; const a = 0.5 + 0.5 * Math.sin(lt * 3 + i * 1.7); ctx.fillStyle = rgba('#FFE680', a); ctx.fillRect(Math.round(x / S) * S, Math.round(y / S) * S, S, S); HD.glow(ctx, x, y, 22, '#FFD24A', a * 0.6); }
      ctx.restore();
      HD.grade(ctx, { top: '#3B4C9A', bottom: '#E07A3F', a: 0.25, vig: 0.65 });
      // the feature window
      if (b >= 4.5) {
        const k = Ease.outC(clamp((b - 4.5) / 0.3)) * (1 - Ease.inQ(env.phase.out)), y = 1080 - 320 * k;
        HD.win(ctx, 260, y, 1400, 300, k);
        HD.ptext(ctx, 'NEW IN 2.0   DYNAMIC LIGHTS', 320, y + 34, { fam: 'DotGothic16', size: 16, fill: '#F7C948', outline: '#141420', a: k });
        HD.ptext(ctx, 'Every lantern and window', 320, y + 116, { fam: 'DotGothic16', size: 16, fill: '#FFFFFF', reveal: clamp((b - 4.8) * 1.6), a: k });
        HD.ptext(ctx, 'lights the world around it.', 320, y + 196, { fam: 'DotGothic16', size: 16, fill: '#FFFFFF', reveal: clamp((b - 5.4) * 1.6), a: k });
        if (b > 6.1 && Math.floor(lt * 4) % 2) { ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.moveTo(1590, y + 250); ctx.lineTo(1620, y + 250); ctx.lineTo(1605, y + 270); ctx.closePath(); ctx.fill(); }
      }
      // opening: the warm white from the lantern fades out; out: clouds rush up past the camera
      if (b < 0.6) { ctx.fillStyle = rgba('#FFF4DC', 1 - Ease.outC(b / 0.6)); ctx.fillRect(0, 0, W, H); }
      if (out > 0) { ctx.save(); ctx.imageSmoothingEnabled = true; HD.layer(ctx, 'clouds', -80, 1080 - out * 1500, { blur: 6 }); HD.layer(ctx, 'clouds', -300, 1500 - out * 1900, { blur: 10 }); ctx.restore(); ctx.fillStyle = rgba('#F5E6FF', Math.max(0, out * 1.4 - 0.4)); ctx.fillRect(0, 0, W, H); }
    },
  };
})();
