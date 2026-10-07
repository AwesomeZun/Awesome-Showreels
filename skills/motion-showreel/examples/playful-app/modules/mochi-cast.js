// mochi-cast: the code-drawn cast of Mochi Notes, shared by every scene (a project module, P/modules/*.js).
//
// Mochi is drawn in code at load time (no image files): a REEL_MODULES hook renders plush sprites into canvases
// and registers them in IMG/META exactly like prep_assets.py cutouts, so drawChar/popChar (spring, squash, jelly,
// breathing, blink swap, contact shadow) work unchanged in any scene:
//   mochi, mochi_blink, mochi_happy, mochi_think, mochi_think_blink   (strawberry, the hero)
//   mochi_<flavor>, mochi_<flavor>_blink, mochi_<flavor>_happy        (flavor: matcha, ube, yuzu)
//   mochi_icon, mochi_icon_bg                                         (the app icon tile, with and without Mochi)
// Body colours come from style.json palette keys strawberry/matcha/ube/yuzu (the app's flavor tokens).
// Modules load after compositor.js and before the scenes; they may define globals and REEL_MODULES loaders, and
// never assign SCENES (that stays one scene per file).
(() => {
  // ───────── cast: plush mochi sprites ─────────
  const SPRITE_H = 720, SPRITE_W = 760;                  // ~1.9x the largest on-screen size (brand hero, h 380)
  const INK = '#2C1B24', MOUTH_IN = '#5E2436', TONGUE = '#FF7E9A', CHEEK = '#FF7C9C';
  const LEAF_D = '#3E9A62', LEAF_L = '#86D19A';

  function flavorColors(hex) {
    return {
      base: mix(hex, '#FFFFFF', 0.30), light: mix(hex, '#FFFFFF', 0.80), deep: mix(hex, '#46303D', 0.12),
      shade: mix(hex, '#46303D', 0.32), rim: mix(hex, '#FFFFFF', 0.90), hex,
    };
  }
  // Silhouette: a sagging dome (widest point low, flat bottom with soft corners). Returns a Path2D + key metrics.
  function bodyShape(cx, yb, bw, bh) {
    const a = bw / 2, bTop = bh * 0.74, bBot = bh * 0.26, cy = yb - bBot, pts = [];
    for (let i = 0; i < 240; i++) {
      const th = (i / 240) * TAU, c = Math.cos(th), s = Math.sin(th);
      const top = s >= 0, n = top ? 2.6 : 3.4, ex = 2 / n;
      const sag = top ? 1 : 1 + 0.035 * Math.pow(Math.abs(s), 0.6);      // the lower half bulges a little (gravity)
      pts.push([cx + a * sag * Math.sign(c) * Math.pow(Math.abs(c), ex), top ? cy - bTop * Math.pow(s, ex) : cy + bBot * Math.pow(-s, ex)]);
    }
    const p = new Path2D();
    pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
    p.closePath();
    return { path: p, top: yb - bh, cy, a };
  }
  let NOISE = null;
  function noiseTile() {
    if (NOISE) return NOISE;
    const b = makeBuf(192, 192), im = b.g.createImageData(192, 192);
    for (let i = 0; i < im.data.length; i += 4) {
      const v = Math.floor(70 + 115 * hash(i * 0.731 + 17.3));
      im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255;
    }
    b.g.putImageData(im, 0, 0);
    return (NOISE = b.c);
  }
  // Lens-shaped leaf from (x, y) along angle ang (radians, screen space), length L, width w, slight bend.
  function leafPath(g, x, y, ang, L, w, bend = 0.12) {
    g.save(); g.translate(x, y); g.rotate(ang);
    g.beginPath(); g.moveTo(0, 0);
    g.bezierCurveTo(L * 0.3, -w * 0.9 + bend * L, L * 0.75, -w * 0.55 + bend * L, L, bend * L * 0.6);
    g.bezierCurveTo(L * 0.72, w * 0.62 + bend * L, L * 0.28, w * 0.8 + bend * L * 0.4, 0, 0);
    g.closePath(); g.restore();
  }
  function fillLeaf(g, x, y, ang, L, w, bend, dark = LEAF_D, light = LEAF_L) {
    const ex = x + Math.cos(ang) * L, ey = y + Math.sin(ang) * L;
    leafPath(g, x, y, ang, L, w, bend);
    g.fillStyle = linear(g, x, y, ex, ey, [[0, dark], [1, light]]); g.fill();
    g.save(); g.globalAlpha = 0.45; g.strokeStyle = mix(light, '#FFFFFF', 0.5); g.lineWidth = Math.max(1.5, w * 0.12); g.lineCap = 'round';
    g.beginPath(); g.moveTo(x + Math.cos(ang) * L * 0.12, y + Math.sin(ang) * L * 0.12);
    g.quadraticCurveTo(x + Math.cos(ang) * L * 0.5 - Math.sin(ang) * bend * L * 0.4, y + Math.sin(ang) * L * 0.5 + Math.cos(ang) * bend * L * 0.4, x + Math.cos(ang) * L * 0.82, y + Math.sin(ang) * L * 0.82);
    g.stroke(); g.restore();
  }
  function topper(g, kind, cx, top, bw, fc) {
    const u = bw;
    g.save();
    g.filter = `blur(${(u * 0.012).toFixed(1)}px)`;                           // soft contact shadow on the dome
    g.fillStyle = rgba(fc.shade, 0.32);
    g.beginPath(); g.ellipse(cx + u * 0.01, top + u * 0.035, u * (kind === 'calyx' ? 0.16 : 0.07), u * 0.03, 0, 0, TAU); g.fill();
    g.filter = 'none';
    if (kind === 'calyx') {                                                  // strawberry sepals + stem
      const ox = cx + u * 0.005, oy = top + u * 0.012;
      const sep = [[Math.PI * 1.03, 0.175, 0.05, -0.1], [Math.PI * 0.8, 0.12, 0.046, -0.08], [Math.PI * 0.55, 0.085, 0.042, 0.05],
        [Math.PI * 0.24, 0.12, 0.046, 0.08], [-Math.PI * 0.03, 0.175, 0.05, 0.1]];
      for (const [ang, L, w, bend] of sep) fillLeaf(g, ox, oy, ang, u * L, u * w, bend);
      g.lineCap = 'round'; g.strokeStyle = linear(g, ox, oy, ox + u * 0.03, oy - u * 0.09, [[0, LEAF_D], [1, '#5DB777']]); g.lineWidth = u * 0.026;
      g.beginPath(); g.moveTo(ox, oy); g.quadraticCurveTo(ox - u * 0.004, oy - u * 0.06, ox + u * 0.034, oy - u * 0.088); g.stroke();
      circle(g, ox, oy, u * 0.022); g.fillStyle = LEAF_D; g.fill();
    } else if (kind === 'leaf') {                                            // matcha: a tea leaf and a smaller one
      fillLeaf(g, cx - u * 0.005, top + u * 0.02, -Math.PI * 0.62, u * 0.14, u * 0.05, -0.1, '#2F7F4C', '#78C489');
      fillLeaf(g, cx + u * 0.005, top + u * 0.02, -Math.PI * 0.3, u * 0.21, u * 0.072, 0.1, '#2F7F4C', '#8ED39C');
    } else if (kind === 'curl') {                                            // ube: a soft swirl on top
      const c1 = mix(fc.hex, '#5B3FB5', 0.42), c2 = mix(fc.hex, '#FFFFFF', 0.25);
      g.lineCap = 'round'; g.lineJoin = 'round';
      const curl = (gg) => { gg.beginPath(); gg.moveTo(cx - u * 0.03, top + u * 0.025); gg.bezierCurveTo(cx - u * 0.06, top - u * 0.07, cx + u * 0.07, top - u * 0.13, cx + u * 0.085, top - u * 0.05);
        gg.bezierCurveTo(cx + u * 0.095, top + u * 0.0, cx + u * 0.03, top - u * 0.0, cx + u * 0.035, top - u * 0.05); };
      g.strokeStyle = linear(g, cx - u * 0.05, top, cx + u * 0.09, top - u * 0.1, [[0, c1], [1, mix(c1, c2, 0.5)]]); g.lineWidth = u * 0.042; curl(g); g.stroke();
      g.strokeStyle = rgba('#FFFFFF', 0.5); g.lineWidth = u * 0.01; g.save(); g.translate(-u * 0.008, -u * 0.01); curl(g); g.restore(); g.stroke();
    } else if (kind === 'sprig') {                                           // yuzu: stem + one leaf
      g.lineCap = 'round'; g.strokeStyle = '#5E8F3E'; g.lineWidth = u * 0.022;
      g.beginPath(); g.moveTo(cx, top + u * 0.02); g.quadraticCurveTo(cx - u * 0.01, top - u * 0.03, cx + u * 0.02, top - u * 0.06); g.stroke();
      fillLeaf(g, cx + u * 0.015, top - u * 0.045, -Math.PI * 0.12, u * 0.17, u * 0.065, 0.12, '#3E8F4E', '#97D27E');
    }
    g.restore();
  }
  // One sprite. o = {color (flavor hex), topper, eyes: open|blink|happy|look, mouth: w|smile|o}
  function makeMochi(o) {
    const S = makeBuf(SPRITE_W, SPRITE_H), g = S.g, fc = flavorColors(o.color);
    const cx = SPRITE_W / 2, yb = SPRITE_H - 3, bh = SPRITE_H * 0.775, bw = Math.min(SPRITE_W - 24, bh * 1.3);
    const B = bodyShape(cx, yb, bw, bh), top = B.top;
    // fuzz: a soft halo of the body colour (plush edge)
    g.save(); g.filter = 'blur(2.4px)'; g.globalAlpha = 0.7; g.translate(cx, B.cy); g.scale(1.006, 1.008); g.translate(-cx, -B.cy);
    g.fillStyle = fc.base; g.fill(B.path); g.restore();
    // body shading, clipped to the silhouette
    g.save(); g.clip(B.path);
    g.fillStyle = linear(g, 0, top, 0, yb, [[0, mix(fc.base, fc.light, 0.55)], [0.42, fc.base], [1, mix(fc.base, fc.deep, 0.75)]]);
    g.fillRect(0, 0, SPRITE_W, SPRITE_H);
    g.fillStyle = radial(g, cx - bw * 0.2, top + bh * 0.24, 0, bw * 0.62, [[0, rgba(fc.light, 0.9)], [0.45, rgba(fc.light, 0.35)], [1, rgba(fc.light, 0)]]);
    g.fillRect(0, 0, SPRITE_W, SPRITE_H);
    g.fillStyle = radial(g, cx + bw * 0.36, yb - bh * 0.08, 0, bw * 0.72, [[0, rgba(fc.deep, 0.55)], [0.55, rgba(fc.deep, 0.18)], [1, rgba(fc.deep, 0)]]);
    g.fillRect(0, 0, SPRITE_W, SPRITE_H);
    g.fillStyle = linear(g, 0, yb - bh * 0.2, 0, yb, [[0, rgba(fc.shade, 0)], [0.7, rgba(fc.shade, 0.22)], [1, rgba(fc.shade, 0.5)]]);
    g.fillRect(0, 0, SPRITE_W, SPRITE_H);
    // translucent rim (rice cake glow), stronger toward the key light
    g.filter = `blur(${(bw * 0.022).toFixed(1)}px)`;
    g.strokeStyle = linear(g, cx - bw * 0.5, top, cx + bw * 0.5, yb, [[0, rgba(fc.rim, 0.95)], [0.55, rgba(fc.rim, 0.35)], [1, rgba(fc.rim, 0.12)]]);
    g.lineWidth = bw * 0.07; g.stroke(B.path);
    g.filter = 'none';
    // floor bounce under the belly
    g.fillStyle = radial(g, cx, yb + bh * 0.06, 0, bw * 0.42, [[0, 'rgba(255,255,255,0.28)'], [1, 'rgba(255,255,255,0)']]);
    g.fillRect(0, 0, SPRITE_W, SPRITE_H);
    // plush texture + rice-flour dust
    g.globalCompositeOperation = 'soft-light'; g.globalAlpha = 0.5;
    g.fillStyle = g.createPattern(noiseTile(), 'repeat'); g.fillRect(0, 0, SPRITE_W, SPRITE_H);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    for (let i = 0; i < 320; i++) {
      const v = hash(i * 3.17 + 5.1), x = cx + (hash(i * 1.73) - 0.5) * bw * 0.92, y = top + v * v * bh * 0.8;
      if (!g.isPointInPath(B.path, x, y)) continue;
      g.globalAlpha = (0.12 + 0.4 * hash(i * 7.7)) * (1 - v * 0.8);
      circle(g, x, y, 0.6 + 1.4 * hash(i * 5.3)); g.fillStyle = '#FFFFFF'; g.fill();
    }
    g.globalAlpha = 1;
    // specular: a broad soft sheen and a small glint
    g.filter = `blur(${(bw * 0.013).toFixed(1)}px)`;
    g.fillStyle = 'rgba(255,255,255,0.6)';
    g.beginPath(); g.ellipse(cx - bw * 0.2, top + bh * 0.19, bw * 0.13, bh * 0.07, -0.42, 0, TAU); g.fill();
    g.filter = 'blur(1.5px)'; g.fillStyle = 'rgba(255,255,255,0.85)';
    g.beginPath(); g.ellipse(cx - bw * 0.11, top + bh * 0.1, bw * 0.034, bh * 0.02, -0.3, 0, TAU); g.fill();
    g.filter = 'none';
    g.restore();
    topper(g, o.topper, cx, top, bw, fc);
    // face (part of the sprite, so squash and jelly carry it)
    const ey = top + bh * 0.585, edx = bw * 0.155, rx = bw * 0.041, ry = bw * 0.052, eyes = [];
    for (const s of [-1, 1]) {                                               // cheeks first (under the eyes' glints)
      const x = cx + s * bw * 0.258, y = ey + bh * 0.088;
      g.save(); g.translate(x, y); g.scale(1, 0.62);
      g.fillStyle = radial(g, 0, 0, 0, bw * 0.088, [[0, rgba(CHEEK, 0.62)], [0.55, rgba(CHEEK, 0.34)], [1, rgba(CHEEK, 0)]]);
      g.fillRect(-bw * 0.09, -bw * 0.09, bw * 0.18, bw * 0.18); g.restore();
    }
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const s of [-1, 1]) {
      const x = cx + s * edx, y = ey;
      eyes.push({ cx: Math.round(x), cy: Math.round(y), w: Math.round(rx * 2.4), h: Math.round(ry * 2.4) });
      if (o.eyes === 'blink') {                                              // gently closed: a soft downward arc
        g.strokeStyle = INK; g.lineWidth = bw * 0.012;
        g.beginPath(); g.moveTo(x - rx * 1.25, y - ry * 0.05); g.quadraticCurveTo(x, y + ry * 0.75, x + rx * 1.25, y - ry * 0.05); g.stroke();
      } else if (o.eyes === 'happy') {                                       // ^ ^
        g.strokeStyle = INK; g.lineWidth = bw * 0.0135;
        g.beginPath(); g.moveTo(x - rx * 1.25, y + ry * 0.3); g.quadraticCurveTo(x, y - ry * 1.05, x + rx * 1.25, y + ry * 0.3); g.stroke();
      } else {                                                               // glossy bead
        const lx = o.eyes === 'look' ? rx * 0.35 : 0, ly = o.eyes === 'look' ? -ry * 0.28 : 0, bx = x + lx, by = y + ly;
        g.save(); g.beginPath(); g.ellipse(bx, by, rx, ry, 0, 0, TAU);
        g.fillStyle = radial(g, bx - rx * 0.3, by - ry * 0.35, 0, ry * 1.25, [[0, '#6A4558'], [0.55, INK], [1, '#1A0F15']]); g.fill();
        g.clip(); g.filter = 'blur(1.2px)'; g.fillStyle = rgba(fc.light, 0.38);
        g.beginPath(); g.ellipse(bx + rx * 0.1, by + ry * 0.95, rx * 0.95, ry * 0.42, 0, 0, TAU); g.fill(); g.filter = 'none'; g.restore();
        circle(g, bx - rx * 0.3, by - ry * 0.36, rx * 0.34); g.fillStyle = 'rgba(255,255,255,0.96)'; g.fill();
        circle(g, bx + rx * 0.34, by + ry * 0.3, rx * 0.14); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fill();
      }
    }
    const my = ey + bh * 0.042, mw = bw * 0.05;
    if (o.mouth === 'smile') {                                               // open happy smile with a tongue
      g.beginPath(); g.moveTo(cx - mw, my - bw * 0.004); g.quadraticCurveTo(cx, my - bw * 0.012, cx + mw, my - bw * 0.004);
      g.bezierCurveTo(cx + mw * 0.85, my + bw * 0.05, cx - mw * 0.85, my + bw * 0.05, cx - mw, my - bw * 0.004); g.closePath();
      g.fillStyle = MOUTH_IN; g.fill();
      g.save(); g.clip(); g.fillStyle = TONGUE; g.beginPath(); g.ellipse(cx, my + bw * 0.036, mw * 0.62, bw * 0.02, 0, 0, TAU); g.fill(); g.restore();
    } else if (o.mouth === 'o') {
      g.fillStyle = MOUTH_IN; g.beginPath(); g.ellipse(cx, my + bw * 0.01, bw * 0.017, bw * 0.021, 0, 0, TAU); g.fill();
    } else {                                                                 // ω
      g.strokeStyle = INK; g.lineWidth = bw * 0.0125;
      g.beginPath(); g.moveTo(cx - mw, my); g.quadraticCurveTo(cx - mw / 2, my + bw * 0.034, cx, my + bw * 0.002);
      g.quadraticCurveTo(cx + mw / 2, my + bw * 0.034, cx + mw, my); g.stroke();
    }
    return { c: S.c, meta: { w: SPRITE_W, h: SPRITE_H, kind: 'character', ax: 0.5, eyes, source: 'code' } };
  }
  // App icon tile (the logo's icon): cream-to-peach squircle with Mochi inside. 'mochi_icon_bg' is the empty tile.
  const ICON = 600;                                                          // 2x the on-screen size (300 px)
  function makeIcon(withMochi) {
    const b = makeBuf(ICON, ICON), g = b.g, r = ICON * 0.27;
    g.imageSmoothingQuality = 'high';
    rr(g, 0, 0, ICON, ICON, r); g.fillStyle = linear(g, 0, 0, ICON, ICON, [[0, '#FFFBF7'], [0.5, '#FFF0E8'], [1, '#FFDCCD']]); g.fill();
    g.save(); rr(g, 0, 0, ICON, ICON, r); g.clip();
    g.fillStyle = radial(g, ICON * 0.3, ICON * 0.22, 0, ICON * 0.7, [[0, 'rgba(255,255,255,0.85)'], [1, 'rgba(255,255,255,0)']]); g.fillRect(0, 0, ICON, ICON);
    if (withMochi) {
      groundShadow(g, ICON / 2, ICON * 0.86 + 2, ICON * 0.62, 0.3, C.accentStrong || '#E2567D');
      drawChar(g, 'mochi', ICON / 2, ICON * 0.86, ICON * 0.7);
    }
    g.restore();
    rr(g, 2, 2, ICON - 4, ICON - 4, r - 2); g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 4; g.stroke();
    return { c: b.c, meta: { w: ICON, h: ICON, kind: 'prop', ax: 0.5, source: 'code' } };
  }
  const FLAVORS = [['strawberry', 'calyx'], ['matcha', 'leaf'], ['ube', 'curl'], ['yuzu', 'sprig']];
  const FALLBACK = { strawberry: '#FF8FAF', matcha: '#8FD1A3', ube: '#B9A3F3', yuzu: '#FFD066' };
  window.REEL_MODULES.push({
    name: 'mochi-mascot',
    load() {
      const reg = (name, s) => { IMG[name] = s.c; META[name] = s.meta; };
      for (const [fl, top] of FLAVORS) {
        const color = C[fl] || FALLBACK[fl], n = fl === 'strawberry' ? 'mochi' : 'mochi_' + fl;
        reg(n, makeMochi({ color, topper: top, eyes: 'open', mouth: 'w' }));
        reg(n + '_blink', makeMochi({ color, topper: top, eyes: 'blink', mouth: 'w' }));
        reg(n + '_happy', makeMochi({ color, topper: top, eyes: 'happy', mouth: 'smile' }));
      }
      const hero = C.strawberry || FALLBACK.strawberry;
      reg('mochi_think', makeMochi({ color: hero, topper: 'calyx', eyes: 'look', mouth: 'o' }));
      reg('mochi_think_blink', makeMochi({ color: hero, topper: 'calyx', eyes: 'blink', mouth: 'o' }));
      reg('mochi_icon', makeIcon(true));
      reg('mochi_icon_bg', makeIcon(false));
    },
  });
})();
