// offgrid: the OFFGRID reel's shared kit (a project module). The map is the app's own: OpenStreetMap tiles under its
// dark mono filter, captured at three zooms with every panel and marker hidden (map_z14, map_z16, map_route) and
// registered to the world by the app's own marker positions (geo_*.txt; the pins fit to under a pixel). A camera
// (lat, lng, zoom) draws whichever captures cover it, the closer zoom fading in over the wider one with feathered
// edges, so one push can run from Seoul to an alley. Pins, the walk's line and the title slab are drawn from the app's
// CSS and icon paths. The places and walks are the app's sample data (fictional names, approximate Seoul coordinates).
(() => {
  const PLACES = [
    ["붉은벽돌 커피", "cafe", 37.5451, 127.0532, "visited", true],
    ["낮은지붕 식탁", "meal", 37.5432, 127.0521, "visited", false],
    ["서울숲 모퉁이 책방", "book", 37.5462, 127.0398, "wish", false],
    ["스틸앤우드 공방", "craft", 37.5416, 127.0562, "wish", false],
    ["골목 구두집", "shop", 37.5438, 127.0574, "none", false],
    ["서울숲 은행나무길", "walk", 37.5443, 127.0385, "visited", true],
    ["연무장길 옥상", "view", 37.5455, 127.0548, "wish", false],
    ["숲길 앞 커피", "cafe", 37.5622, 126.9256, "visited", false],
    ["골목 국숫집", "meal", 37.5638, 126.9231, "visited", true],
    ["동네 빵 공장", "bakery", 37.5613, 126.9274, "visited", false],
    ["창문 책방", "book", 37.5646, 126.9262, "wish", false],
    ["경의선 숲길 연남 구간", "walk", 37.5625, 126.9245, "visited", false],
    ["연남 도자기 공방", "craft", 37.5655, 126.924, "none", false],
    ["연남 골목 잡화점", "shop", 37.5608, 126.9232, "none", false],
    ["인쇄골목 다방", "cafe", 37.5668, 126.9918, "visited", true],
    ["노가리 골목 밥집", "meal", 37.5672, 126.9938, "visited", false],
    ["조명 상가 옥상", "view", 37.5686, 126.9932, "wish", true],
    ["타일 공방", "craft", 37.566, 126.995, "none", false],
    ["헌책 상가 2층", "book", 37.5694, 126.9946, "wish", false],
    ["을지로 찹쌀빵집", "bakery", 37.5658, 126.9905, "none", false],
    ["통인 골목 빵집", "bakery", 37.5802, 126.97, "visited", false],
    ["서촌 한옥 찻집", "cafe", 37.5818, 126.9712, "visited", true],
    ["수성동 계곡 전망", "view", 37.5841, 126.9667, "wish", false],
    ["서촌 골목 문구점", "shop", 37.579, 126.9718, "none", false],
    ["인왕산 자락길", "walk", 37.583, 126.964, "wish", false],
    ["골목 끝 작은 갤러리", "etc", 37.5786, 126.9694, "none", false],
  ].map(([name, cat, lat, lng, visit, fav], i) => ({ i, name, cat, lat, lng, visit, fav }));
  const ROUTES = [
    {"name": "성수 붉은벽돌 골목 한 바퀴", "color": "#D7F75B", "points": [[37.5455, 127.0548], [37.5451, 127.0532], [37.5441, 127.0526], [37.5432, 127.0521], [37.5424, 127.0543], [37.5416, 127.0562], [37.5428, 127.0578], [37.5438, 127.0574], [37.5448, 127.0562], [37.5455, 127.0548]], "places": [6, 0, 1, 3, 4]},
    {"name": "연남 숲길 따라 천천히", "color": "#7DF9FF", "points": [[37.5608, 126.9232], [37.5613, 126.9274], [37.5622, 126.9256], [37.5625, 126.9245], [37.5638, 126.9231], [37.5646, 126.9262], [37.5655, 126.924]], "places": [13, 9, 7, 11, 8, 10, 12]},
    {"name": "을지로 인쇄골목 산책", "color": "#FF7A59", "points": [[37.5658, 126.9905], [37.5668, 126.9918], [37.5672, 126.9938], [37.566, 126.995], [37.5686, 126.9932], [37.5694, 126.9946]], "places": [19, 14, 15, 17, 16, 18]},
    {"name": "서촌 한옥길과 인왕산 자락", "color": "#F5C4FF", "points": [[37.579, 126.9718], [37.5802, 126.97], [37.5818, 126.9712], [37.583, 126.9695], [37.5841, 126.9667], [37.583, 126.964]], "places": [23, 20, 21, 22, 24]},
  ];
  const ICON = {
    cafe: 'M4 8h11v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z M15 9.5h1.5a2 2 0 0 1 0 4H15 M6.5 4.5V6 M9.5 4.5V6 M12.5 4.5V6',
    meal: 'M3 11h18a9 9 0 0 1-18 0z M9 11V4 M15 11l4-7',
    bakery: 'M4 12a8 5 0 0 1 16 0v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z M8 9.5v2 M12 8.5v2 M16 9.5v2',
    book: 'M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 0-3 3z M17 20V7',
    craft: 'M14 4l6 6-3 3-6-6z M12.5 8.5l-8 8 3 3 8-8',
    shop: 'M6 8h12l1 12H5z M9 8V6a3 3 0 0 1 6 0v2',
    walk: 'M8 3c1.8 0 3 1.8 3 4s-1.2 4-3 4-3-1.8-3-4 1.2-4 3-4z M16 12c1.8 0 3 1.8 3 4s-1.2 4-3 4-3-1.8-3-4 1.2-4 3-4z',
    view: 'M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z',
    etc: 'M6 4v17 M6 4h11l-2 4 2 4H6',
  };
  const P2D = {}; const icon = (c) => P2D[c] || (P2D[c] = new Path2D(ICON[c]));
  const LIME = '#D7F75B';
  // Web Mercator: world pixels at zoom z
  function world(lat, lng, z) { const s = 256 * Math.pow(2, z), r = lat * Math.PI / 180; return [(lng + 180) / 360 * s, (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * s]; }
  // each capture: its zoom and the world pixel of its top-left, fitted from where the app put its pins
  const VIEWS = {};
  function view(name) {
    if (VIEWS[name]) return VIEWS[name];
    const g = JSON.parse(ASSET('captures/ui/app/geo_' + name.replace('map_', '') + '.txt')), z = g.zoom; let sx = 0, sy = 0, n = 0;
    g.pins.forEach(p => { const pl = PLACES.find(q => q.name === p.name); if (!pl || !p.pin) return; const ax = p.x + 18, ay = p.y + 40;
      if (ax < 0 || ay < 0 || ax > g.viewport[0] || ay > g.viewport[1]) return; const [wx, wy] = world(pl.lat, pl.lng, z); sx += wx - ax; sy += wy - ay; n++; });
    return (VIEWS[name] = { name, z, ox: sx / n, oy: sy / n, w: g.viewport[0], h: g.viewport[1] });
  }
  // a feathered copy of a capture (its edges fade over f px) so a closer zoom melts into a wider one
  const FEATHER = {};
  function feathered(name, f = 160) {
    if (FEATHER[name]) return FEATHER[name];
    const img = IMG['captures/ui/app/' + name]; if (!img) return null;
    const b = makeBuf(img.width, img.height), g = b.g; g.drawImage(img, 0, 0); g.globalCompositeOperation = 'destination-in';
    const m = makeBuf(img.width, img.height), mg = m.g; mg.fillStyle = '#000'; mg.filter = `blur(${f / 2}px)`; mg.fillRect(f, f, img.width - 2 * f, img.height - 2 * f);
    g.drawImage(m.c, 0, 0); return (FEATHER[name] = b.c);
  }
  // the camera: screen position of a lat/lng
  function project(cam, lat, lng) { const [wx, wy] = world(lat, lng, cam.z), [cx, cy] = world(cam.lat, cam.lng, cam.z); return [W / 2 + wx - cx, H / 2 + wy - cy]; }
  // draw the map for camera {lat, lng, z}: the widest capture always, closer ones fading in as the camera nears them
  function map(ctx, cam, o = {}) {
    ctx.fillStyle = '#121214'; ctx.fillRect(0, 0, W, H);
    ['map_z14', 'map_z16', 'map_route'].forEach((n, k) => {
      const v = view(n), a = k === 0 ? 1 : clamp((cam.z - (v.z - 1.15)) / 0.7); if (a <= 0) return;
      const s = Math.pow(2, cam.z - v.z), [cx, cy] = world(cam.lat, cam.lng, v.z);
      const img = k === 0 ? IMG['captures/ui/app/' + n] : feathered(n); if (!img) return;
      ctx.save(); ctx.globalAlpha *= a; ctx.imageSmoothingQuality = 'high';
      if (o.lift) ctx.filter = `brightness(${o.lift})`;
      ctx.drawImage(img, W / 2 + (v.ox - cx) * s, H / 2 + (v.oy - cy) * s, v.w * s, v.h * s); ctx.restore();
    });
  }
  // the app's place pin (map.css .og-pin) with its anchor at (x, y), k times its CSS size
  function pin(ctx, x, y, pl, o = {}) {
    const k = o.k ?? 1.6, sel = o.selected, pop = o.pop ?? 1, a = o.alpha ?? 1; if (pop <= 0 || a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(k, k);
    // tail and its dot
    ctx.fillStyle = sel ? '#FFFFFF' : LIME; ctx.fillRect(-1, -8, 2, 7); circle(ctx, 0, -1, 3); ctx.fill();
    // the chip (springs up from the tail)
    ctx.save(); ctx.translate(0, -8); const sc = pop * (sel ? 1.22 : 1); ctx.scale(sc, sc); ctx.translate(0, sel ? -4 / 1.22 : 0);
    ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6;
    rr(ctx, -16, -32, 32, 32, 10);
    if (sel) ctx.fillStyle = LIME; else { const g = ctx.createLinearGradient(-6, -36, 6, 4); g.addColorStop(0, '#202024'); g.addColorStop(0.6, '#0B0B0C'); ctx.fillStyle = g; }
    ctx.fill(); ctx.shadowColor = 'transparent';
    if (sel) { ctx.save(); ctx.globalAlpha *= 0.28; ctx.strokeStyle = LIME; ctx.lineWidth = 10; rr(ctx, -16, -32, 32, 32, 10); ctx.stroke(); ctx.restore(); }
    ctx.lineWidth = 1.5; ctx.strokeStyle = sel ? '#FFFFFF' : LIME; if (pl.visit === 'wish' && !sel) ctx.setLineDash([3, 2.5]); rr(ctx, -16, -32, 32, 32, 10); ctx.stroke(); ctx.setLineDash([]);
    ctx.save(); ctx.translate(-8, -24); ctx.scale(16 / 24, 16 / 24); ctx.strokeStyle = sel ? '#0B0B0C' : LIME; ctx.lineWidth = 1.9; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(icon(pl.cat)); ctx.restore();
    if (pl.fav) { ctx.fillStyle = LIME; circle(ctx, 16 + 5 - 5.5, -32 - 5 + 5.5, 5.5); ctx.fill(); if (sel) { ctx.strokeStyle = '#0B0B0C'; ctx.lineWidth = 1; ctx.stroke(); } }
    ctx.restore();
    // the label
    const la = o.label ?? 0; if (la > 0) {
      ctx.save(); ctx.globalAlpha *= la; ctx.font = `700 ${sel ? 13 : 12}px ${FAM.sans}`; const tw = ctx.measureText(pl.name).width, lx = sel ? 26 : 20, ly = sel ? -44 : -35;
      ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
      rr(ctx, lx, ly, tw + 14, 22, 6); ctx.fillStyle = sel ? LIME : 'rgba(11,11,12,0.88)'; ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.fillStyle = sel ? '#0B0B0C' : '#F3F3EE'; ctx.fillText(pl.name, lx + 7, ly + 15.5); ctx.restore();
    }
    ctx.restore();
  }
  // a walk's line as the app draws a selected route: dark casing, a wide soft glow, the line; drawn on up to fraction p
  function line(ctx, pts, p, o = {}) {
    if (p <= 0 || pts.length < 2) return; const color = o.color || LIME, k = o.k ?? 1.6;
    const seg = []; let L = 0; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
    const path = () => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); let left = L * clamp(p);
      for (let i = 1; i < pts.length && left > 0; i++) { const f = Math.min(1, left / seg[i - 1]); ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)); left -= seg[i - 1]; } };
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha *= o.alpha ?? 1;
    path(); ctx.strokeStyle = 'rgba(11,11,12,0.55)'; ctx.lineWidth = 9 * k; ctx.stroke();
    path(); ctx.strokeStyle = color; ctx.globalAlpha *= 0.28; ctx.lineWidth = 16 * k; ctx.stroke(); ctx.globalAlpha /= 0.28;
    path(); ctx.strokeStyle = color; ctx.lineWidth = 5 * k; ctx.stroke(); ctx.restore();
    // where the line has got to
    let left = L * clamp(p); for (let i = 1; i < pts.length; i++) { if (left <= seg[i - 1]) { const f = left / seg[i - 1]; return [lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)]; } left -= seg[i - 1]; }
    return pts[pts.length - 1];
  }
  // metres along a list of lat/lng (haversine, as the app measures)
  function metres(pts) { let m = 0; for (let i = 1; i < pts.length; i++) { const [a, b] = pts[i - 1], [c, d] = pts[i], R = 6371000, r = Math.PI / 180;
    const h = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; m += 2 * R * Math.asin(Math.sqrt(h)); } return m; }
  // the app's title slab (app.css .slab): lime with a white sheen and a 24 px grid, OFFGRID in black at 900
  function slab(ctx, x, y, w, h, k, o = {}) {
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
    ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 50 * k / 2; ctx.shadowOffsetY = 18 * k / 2;
    rr(ctx, x, y, w, h, 14 * k); ctx.fillStyle = LIME; ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.save(); rr(ctx, x, y, w, h, 14 * k); ctx.clip();
    ctx.strokeStyle = 'rgba(11,11,12,0.07)'; ctx.lineWidth = k; ctx.beginPath();
    for (let gx = x + 23.5 * k; gx < x + w; gx += 24 * k) { ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); }
    for (let gy = y + h - 23.5 * k; gy > y; gy -= 24 * k) { ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); } ctx.stroke();
    const a = 118 * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a), L = (Math.abs(w * dx) + Math.abs(h * dy)) / 2, cx = x + w / 2, cy = y + h / 2;
    const g = ctx.createLinearGradient(cx - dx * L, cy - dy * L, cx + dx * L, cy + dy * L); g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(0.32, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.restore();
    ctx.fillStyle = '#0B0B0C'; ctx.font = `600 ${11 * k}px ${FAM.mono}`;
    if (o.kicker !== false) { spaced(ctx, 'LOCAL MAP / SEOUL', x + 20 * k, y + 26 * k, 11 * k, 0.14); spaced(ctx, 'OFF THE TOURIST GRID', x + w - 20 * k, y + 26 * k, 11 * k, 0.14, 'right'); }
    ctx.restore();
  }
  function spaced(ctx, s, x, y, size, ls, align) { let w = 0; for (const ch of s) w += ctx.measureText(ch).width + size * ls; w -= size * ls; let cx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    for (const ch of s) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + size * ls; } return w; }
  function label(ctx, s, x, y, o = {}) { ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.font = `${o.weight || 600} ${o.size || 22}px ${FAM.mono}`; ctx.fillStyle = o.color || '#95958D';
    if (o.dot) { ctx.save(); ctx.fillStyle = LIME; ctx.shadowColor = LIME; ctx.shadowBlur = 10; circle(ctx, (o.align === 'center' ? x - 200 : x) - 18, y - (o.size || 22) * 0.34, 5); ctx.fill(); ctx.restore(); }
    const w = spaced(ctx, s, x, y, o.size || 22, 0.12, o.align); ctx.restore(); return w; }
  // a dark scrim from one side so headlines read over the map
  function scrim(ctx, side = 'left', a = 0.85, w = 980) { const g = side === 'left' ? ctx.createLinearGradient(0, 0, w, 0) : ctx.createLinearGradient(W, 0, W - w, 0);
    g.addColorStop(0, `rgba(11,11,12,${a})`); g.addColorStop(0.55, `rgba(11,11,12,${a * 0.6})`); g.addColorStop(1, 'rgba(11,11,12,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  // OpenStreetMap's attribution, always on screen with the map (as in the app)
  function credit(ctx, a = 1) { ctx.save(); ctx.globalAlpha *= a; ctx.font = `500 17px ${FAM.sans}`; ctx.textAlign = 'right'; const s = '© OpenStreetMap contributors', w = ctx.measureText(s).width;
    rr(ctx, W - 28 - w - 16, H - 50, w + 24, 30, 6); ctx.fillStyle = 'rgba(11,11,12,0.7)'; ctx.fill(); ctx.fillStyle = '#C4C4BC'; ctx.fillText(s, W - 32, H - 29); ctx.restore(); }
  function headline(ctx, lines, x, y, lt, o = {}) { const size = o.size || 84, gap = o.gap ?? size * 1.1;
    lines.forEach((s, i) => kinetic(ctx, s, x, y + i * gap, lt - (o.step ?? 0.2) * i, { size, fam: 'display', weight: 800, color: o.color || '#F3F3EE', ls: -0.04 * size, stagger: 0.024, dur: 0.5, rise: 0.38 * size, blur: 7, align: o.align, out: o.out })); }
  function draw(ctx, name, x, y, k = 1, o = {}) { const img = IMG['captures/ui/app/' + name]; if (!img) return; const j = ASSET('captures/ui/app/' + name + '.json'), d = img.width / j.rect.w;
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; if (o.crop) { const [cx, cy, cw, ch] = o.crop; ctx.drawImage(img, cx * d, cy * d, cw * d, ch * d, x, y, cw * k, ch * k); } else ctx.drawImage(img, x, y, j.rect.w * k, j.rect.h * k); ctx.restore(); }
  window.OG = { PLACES, ROUTES, LIME, world, view, project, map, pin, line, metres, slab, spaced, label, scrim, credit, headline, draw };
})();
