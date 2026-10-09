// flight (1 bar, 2 in the 30): the Mode-7 world map. Opens from the clouds' white; the overworld (256 x 256 art
// pixels) is projected scanline by scanline at art resolution and shown at 5x, turning and gliding under a sunset
// sky; the airship rides on the left with its shadow on the ground and a little engine smoke; near clouds sweep past
// in front (blurred), far clouds behind. A window names the feature. Out: the battle transition takes over.
(() => {
  let TEX = null, buf = null, img = null;
  function tex() {
    if (TEX) return TEX;
    const im = HD.img('overworld'), c = makeBuf(im.width, im.height); c.g.drawImage(im, 0, 0);
    TEX = { w: im.width, h: im.height, d: c.g.getImageData(0, 0, im.width, im.height).data }; return TEX;
  }
  function mode7(o) {
    const GW = 384, GH = 216, T = tex();
    if (!buf) { buf = makeBuf(GW, GH); img = buf.g.createImageData(GW, GH); }
    const out = img.data, hz = o.hz, ca = Math.cos(o.a), sa = Math.sin(o.a), sky = parseColor('#F6B27A');
    // classic Mode 7: a camera o.h texels above the plane, focal length F; each scanline below the horizon is a
    // row of the plane at distance h * F / (y - hz), rotated by o.a around the camera
    const F = 150;
    for (let y = 0; y < GH; y++) {
      const dy = y - hz;
      for (let x = 0; x < GW; x++) {
        const k = (y * GW + x) * 4;
        if (dy <= 0) { out[k + 3] = 0; continue; }
        const dist = o.h * F / dy, lat = (x - GW / 2) * dist / F;
        const wx = o.x + ca * lat - sa * dist, wy = o.y + sa * lat + ca * dist;
        const tx = ((Math.floor(wx) % T.w) + T.w) % T.w, ty = ((Math.floor(wy) % T.h) + T.h) % T.h, si = (ty * T.w + tx) * 4;
        const f = dy < 6 ? 0.7 : dy < 14 ? 0.45 : dy < 28 ? 0.2 : 0;
        out[k] = T.d[si] + (sky[0] - T.d[si]) * f; out[k + 1] = T.d[si + 1] + (sky[1] - T.d[si + 1]) * f; out[k + 2] = T.d[si + 2] + (sky[2] - T.d[si + 2]) * f; out[k + 3] = 255;
      }
    }
    buf.g.putImageData(img, 0, 0); return buf.c;
  }
  SCENES['flight'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, lt = env.lt, b = lt / B, S = HD.S;
      ctx.imageSmoothingEnabled = true; HD.layer(ctx, 'town_sky', -80, -400);
      HD.layer(ctx, 'clouds', -200 - lt * 40, -260, { blur: 4, a: 0.8 });
      const m7 = mode7({ hz: 66, h: 34, x: 128 + Math.sin(lt * 0.3) * 20, y: 200 - lt * 26, a: 2.6 + lt * 0.16 });
      ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(m7, 0, 0, W, H); ctx.restore();
      // the airship: bobs by whole art pixels, its shadow on the ground, engine smoke
      const ax = 700, ay = 470 + Math.round(Math.sin(lt * 2.2) * 2) * S;
      ctx.save(); ctx.fillStyle = 'rgba(20,20,40,0.28)'; ctx.beginPath(); ctx.ellipse(ax + 30, 900, 150, 26, 0, 0, TAU); ctx.fill(); ctx.restore();
      for (let j = 0; j < 7; j++) { const u = (lt * 1.4 + j / 7) % 1, r = Math.round(2 + u * 4) * S; ctx.fillStyle = rgba('#E8E0FF', 0.5 * (1 - u)); ctx.fillRect(Math.round((ax - 230 - u * 260) / S) * S, Math.round((ay - 40 - u * 30) / S) * S, r, r); }
      ctx.save(); ctx.imageSmoothingEnabled = false; const A = HD.scaled('airship', 0); ctx.drawImage(A.c, ax - A.w / 2, ay - A.h / 2); ctx.restore();
      HD.lightmap(ctx, '#E9D2C8', [{ x: 1700, y: 120, r: 1400, color: '#FFFFFF', i: 0.6 }]);
      HD.glow(ctx, 1650, 160, 700, '#FFB070', 0.5);
      HD.layer(ctx, 'clouds', 1900 - lt * 520, 300, { blur: 12, a: 0.95 });
      HD.grade(ctx, { top: '#4A5AB0', bottom: '#F09040', a: 0.22, vig: 0.6 });
      const k = Ease.outC(clamp((b - 0.5) / 0.4));
      HD.win(ctx, 120, 90, 640, 120, k); HD.ptext(ctx, 'WORLD MAP · MODE 7', 170, 120, { size: 12, weight: 700, fill: '#F7C948', outline: '#141420', a: k });
      if (b < 0.4) { ctx.fillStyle = rgba('#F5E6FF', 1 - b / 0.4); ctx.fillRect(0, 0, W, H); }
    },
  };
  window.FLIGHT_M7 = mode7;
})();
