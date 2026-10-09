// shop: the Pebble & Bean diorama itself (a project module, after bean.js).
// SHOP.cutaway(g, cam, T, b, o) draws the shop with its two back walls and no front, the way a building game shows a
// room: checkered floor, the roaster in the window corner with its drum turning, the counter with the espresso
// machine and the barista, tables, plants, the menu board and the sign. Every item has a build order; o.build(k)
// returns its 0..1 progress so the build scene can drop items in one by one. SHOP.exterior draws a closed building
// (front-left and front-right walls with windows, a striped awning) for the street. Pure in T.
(() => {
  const B = () => window.BEAN;
  const ORDER = { floor: 0, wallR: 1, wallL: 2, windows: 3, counter: 4, machine: 5, roaster: 6, tables: 7, plants: 8, menu: 9, sign: 10 };
  function face(g, cam, pts, c) { B().poly(g, pts.map(([x, y, z]) => B().iso(cam, x, y, z)), c); }
  function cutaway(g, cam, T, b, o = {}) {
    const K = B(), S = cam.S, pr = (name) => (o.build ? o.build(ORDER[name]) : 1), drop = (p) => (1 - p) * 18;
    // floor: tiles appear in a diagonal wave
    for (let gx = 0; gx < 8; gx++) for (let gy = 0; gy < 6; gy++) {
      const p = o.build ? o.build(0, (gx + gy) / 12) : 1; if (p <= 0) continue;
      K.top(g, cam, gx, gy, -drop(p) * 0.5, (gx + gy) % 2 ? 'sand' : 'latte');
    }
    // back walls (right-hand along x at y = 0, left-hand along y at x = 0)
    const pw = pr('wallR'), pl = pr('wallL'), WH = 30;
    if (pw > 0) K.box(g, cam, 0, -0.3, 0, 8, 0.3, WH * pw, 'sand', 'cream', 'latte');
    if (pl > 0) K.box(g, cam, -0.3, -0.3, 0, 0.3, 6.3, WH * pl, 'sand', 'latte', 'cream');
    if (pw >= 1) { face(g, cam, [[0, 0, 0], [8, 0, 0], [8, 0, 4], [0, 0, 4]], 'brick'); }
    if (pl >= 1) { face(g, cam, [[0, 0, 0], [0, 6, 0], [0, 6, 4], [0, 0, 4]], 'brick'); }
    // windows on the right-hand wall (sky by day, glow at dusk)
    if (pr('windows') > 0) for (const a of [1, 3.2, 5.4]) {
      const wc = o.dusk >= 2 ? 'glow' : 'sky';
      face(g, cam, [[a, 0, 9], [a + 1.6, 0, 9], [a + 1.6, 0, 24], [a, 0, 24]], 'caramel');
      face(g, cam, [[a + 0.15, 0, 10], [a + 1.45, 0, 10], [a + 1.45, 0, 23], [a + 0.15, 0, 23]], wc);
    }
    // menu board on the left-hand wall
    const pm = pr('menu');
    if (pm > 0) {
      face(g, cam, [[0, 1.2, 11], [0, 3.6, 11], [0, 3.6, 25], [0, 1.2, 25]], 'ink');
      const [mx, my] = K.iso(cam, 0, 1.45, 24);
      if (S >= 2 && pm >= 1) { K.text(g, 'FLAT WHITE 4.5', mx + 2 * S, my + 3 * S, 'cream', 1); K.text(g, 'FILTER     3.0', mx + 2 * S, my + 12 * S, 'cream', 1); K.text(g, 'BUN        3.5', mx + 2 * S, my + 21 * S, 'cream', 1); }
    }
    // the roaster in the window corner: body, hopper, the drum turning, beans pouring in the hold
    const prs = pr('roaster');
    if (prs > 0) {
      const z = drop(prs);
      K.box(g, cam, 0.6, 0.6, z, 1.6, 1.3, 15, 'brick', 'espresso', 'brick');
      K.box(g, cam, 1.1, 0.8, z + 15, 0.6, 0.5, 6, 'latte', 'caramel', 'latte');
      const [cx, cy] = K.iso(cam, 1.4, 1.9, z + 8), r = 4 * S;
      for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) K.rect(g, cx + x, cy + y, 1, 1, 'ink');
      const sp = Math.floor(T * 8) % 4, ang = sp * Math.PI / 4;
      for (let k = -r + S; k < r; k += 1) K.rect(g, cx + Math.round(Math.cos(ang) * k), cy + Math.round(Math.sin(ang) * k), S, S, 'caramel');
      if (prs >= 1 && b > 2) for (let i = 0; i < 5; i++) { const a = (T * 1.6 + i / 5) % 1, [hx, hy] = K.iso(cam, 1.4, 1.05, z + 21); K.rect(g, hx + ((i * 3) % 4 - 2) * S, hy - Math.round((1 - a) * 6) * S, S, S, 'espresso'); }
    }
    // counter, machine (steam), barista behind it
    const pc = pr('counter');
    if (pc > 0) {
      const z = drop(pc);
      if (b > 0.5 || !o.build) K.person(g, ...K.iso(cam, 5.6, 0.6, z + 22), Math.floor(T * 4) % 2, 'sage', 'ink', S);
      K.box(g, cam, 3.6, 1.2, z, 3.6, 0.8, 11, 'caramel', 'espresso', 'brick');
      const pmc = pr('machine');
      if (pmc > 0) { K.box(g, cam, 5.0, 1.3, z + 11 + drop(pmc), 1.0, 0.6, 8, 'plum', 'ink', 'plum'); if (pmc >= 1) K.steam(g, ...K.iso(cam, 5.4, 1.5, 22), T, 6, S); }
    }
    // tables with cups, plants
    const pt = pr('tables');
    if (pt > 0) for (const [x, y] of [[2.4, 3.6], [4.6, 3.8]]) {
      const z = drop(pt); K.box(g, cam, x, y, z, 1, 1, 7, 'latte', 'caramel', 'latte');
      K.box(g, cam, x + 0.35, y + 0.35, z + 7, 0.3, 0.3, 3, 'cream', 'sand', 'cream');
      if (pt >= 1) K.steam(g, ...K.iso(cam, x + 0.5, y + 0.5, 12), T + x, 4, S);
    }
    const pp = pr('plants');
    if (pp > 0) for (const [x, y] of [[0.3, 4.4], [7.1, 0.4]]) {
      const z = drop(pp); K.box(g, cam, x, y, z, 0.6, 0.6, 5, 'caramel', 'brick', 'caramel');
      const [px, py] = K.iso(cam, x + 0.3, y + 0.3, z + 5), sway = Math.floor(T * 2) % 2;
      for (const [dx, dy, c] of [[-3, -3, 'leaf'], [1, -5, 'sage'], [3, -2, 'leaf'], [-1, -7, 'sage'], [sway, -9, 'leaf']]) K.rect(g, px + dx * S, py + dy * S, 3 * S, 2 * S, c);
    }
    // the sign on top of the left-hand wall
    const ps = pr('sign');
    if (ps > 0) { const [sx, sy] = K.iso(cam, -0.3, 2.4, 33 + drop(ps)); K.text(g, 'PEBBLE & BEAN', sx - 4 * S, sy - 2 * S, 'espresso', S, ps >= 1 ? Infinity : 0, true); }
    // customers: one walks in from the front, one sits
    if (!o.build || b > 5) {
      const u = ((T * 0.25) % 1), [wx, wy] = K.iso(cam, 6.5 - u * 2.2, 5.6 - u * 3.4, 12);
      K.person(g, wx, wy, Math.floor(T * 4) % 2, 'rose', 'plum', S, true);
      K.person(g, ...K.iso(cam, 2.2, 4.4, 13), 1, 'dusk', 'espresso', S);
    }
  }
  // a closed building for the street: w x d tiles, h px; walls, windows (glow at dusk), awning, door
  function exterior(g, cam, gx, gy, w, d, h, o = {}) {
    const K = B();
    K.box(g, cam, gx, gy, 0, w, d, h, o.roof || 'brick', o.wall || 'cream', o.wall2 || 'latte');
    const lit = o.lit || (() => false);
    for (let i = 0; i < Math.floor(w); i++) for (let s = 0; s < Math.floor(h / 14); s++) {          // windows on the front-left face
      const z0 = 5 + s * 14; if (o.door && s === 0 && i === 0) continue;
      face(g, cam, [[gx + i + 0.25, gy + d, z0], [gx + i + 0.75, gy + d, z0], [gx + i + 0.75, gy + d, z0 + 8], [gx + i + 0.25, gy + d, z0 + 8]], lit(i, s) ? 'glow' : 'dusk');
    }
    if (o.door) face(g, cam, [[gx + 0.3, gy + d, 0], [gx + 0.8, gy + d, 0], [gx + 0.8, gy + d, 11], [gx + 0.3, gy + d, 11]], 'espresso');
    if (o.awning) for (let i = 0; i < w * 4; i++) face(g, cam, [[gx + i / 4, gy + d, 14], [gx + (i + 1) / 4, gy + d, 14], [gx + (i + 1) / 4, gy + d + 0.5, 11], [gx + i / 4, gy + d + 0.5, 11]], i % 2 ? 'cream' : 'rose');
  }
  window.SHOP = { cutaway, exterior, ORDER };
})();
