// map (2 bars): the offline map. The map window grows out of the previous screen in whole steps until it fills the
// screen under the status bar (still no signal: OFFLINE). The topographic map (contour terraces, the lake, the river)
// is printed faded, with no shadow tone left, so the dark route with its paper halo reads on it: it draws on from the
// trailhead up the contours to the summit, a flag and PIKA POINT pop up there, the way back follows dashed, and YOU
// blinks where the hiker is. Then the elevation panel slides up and draws the profile left to right; the steep last 0.8
// km before the summit fills dark and flashes, on the profile and on the map at once ("the steep part before you reach
// it").
(() => {
  const P = POCKET, OX = -8, OY = -2;
  const at = (pts) => pts.map(([x, y]) => [x + OX, y + OY]);
  const ROUTE = at([[100, 132], [108, 121], [120, 112], [131, 103], [136, 92], [134, 80], [140, 70], [146, 58], [150, 47], [148, 37], [147, 30]]);
  const BACK = at([[147, 30], [160, 36], [176, 50], [186, 66], [180, 84], [160, 100], [140, 116], [118, 128], [100, 132]]);
  const STEEP = ROUTE.slice(7);
  const PROFILE = [[0, 987], [1, 1010], [2, 1150], [3, 1240], [4, 1380], [5, 1500], [5.4, 1560], [6.2, 1847], [7, 1600], [7.9, 1420], [9, 1300], [10, 1150], [11, 1060], [12.4, 987]];
  const elev = (km) => { for (let i = 1; i < PROFILE.length; i++) if (km <= PROFILE[i][0]) { const [a, p] = PROFILE[i - 1], [c, q] = PROFILE[i]; return p + (q - p) * (km - a) / (c - a); } return 987; };
  const plen = (pts) => pts.reduce((s, p, i) => (i ? s + Math.max(Math.abs(p[0] - pts[i - 1][0]), Math.abs(p[1] - pts[i - 1][1])) + 1 : s), 0);
  const LEN = plen(ROUTE);
  const FLAG = ROUTE[ROUTE.length - 1];
  function route(f, pts, n, v, dash) {                                       // a two-pixel line with a one-pixel paper halo
    const sh = (dx, dy) => pts.map(([x, y]) => [x + dx, y + dy]);
    for (const [dx, dy] of [[2, 0], [-1, 0], [0, 1], [1, 1], [0, -1], [1, -1]]) f.path(sh(dx, dy), 3, n, dash);
    f.path(sh(1, 0), v, n, dash);
    return f.path(pts, v, n, dash);
  }
  function paint(f, T, e) {
    const B = e.beatSec, b = T / B + 1e-4;
    f.layer('topo_map', OX, OY, { map: [1, 2, 2, 3] });                   // faded like printed paper: no shadow tone left
    // compass
    f.text('N', 226, 13, 3); f.icon(['..3..', '.333.', '33333'], 226, 21);
    // the route
    const head = route(f, ROUTE, LEN * f.span(b, 1, 3.6), 0);
    if (b > 1 && b < 3.6) f.disc(head[0], head[1], 1, 0);
    if (b >= 3.6) route(f, BACK, plen(BACK) * f.span(b, 3.6, 4.6), 1, [2, 2]);
    const flash = b >= 6 && b % 0.5 < 0.3;
    if (b >= 6) for (const [dx, dy] of [[1, 0], [0, 1]]) f.path(STEEP.map(([x, y]) => [x + dx, y + dy]), flash ? 3 : 0);
    if (b >= 3.6) {                                                       // the summit flag and its label
      f.icon(f.ICON.flag, FLAG[0], FLAG[1] - 7);
      const w = f.textW('PIKA POINT') + 6; f.win(FLAG[0] + 8, FLAG[1] - 12, w, 11, { shadow: 0 }); f.text('PIKA POINT', FLAG[0] + 11, FLAG[1] - 10, 0);
    }
    if (b >= 3.6 && b % 1 < 0.65) {                                       // YOU, where the hiker is
      const [x, y] = ROUTE[4]; f.icon(f.ICON.pin, x - 2, y - 8); f.win(x - 28, y - 9, 22, 11, { shadow: 0 }); f.text('YOU', x - 25, y - 7, 0);
    }
    // ── the elevation panel
    const py = Math.round(135 - 41 * f.span(b, 3.8, 4.2));
    if (py < 135) {
      f.win(6, py, 228, 39);
      const steepOn = b >= 6;
      if (steepOn && b % 1 < 0.65) f.textC('▼ STEEP 0.8 KM', 120, py + 3, 0);
      else f.text('ELEVATION', 11, py + 3, 1);
      f.textR('+860 M', 229, py + 3, 0);
      const xmax = 12 + 216 * f.span(b, 4.2, 5.6);
      let last = null;
      for (let x = 12; x < xmax; x++) {
        const km = (x - 12) / 216 * 12.4, y = Math.round(py + 33 - (elev(km) - 987) / 860 * 20), steep = km >= 5.4 && km <= 6.2;
        for (let yy = y + 1; yy < py + 35; yy++) f.px(x, yy, steep && steepOn ? (flash ? 0 : 1) : f.TH[yy * f.GW + x] < 0.5 ? 2 : 3);
        f.px(x, y, 0); if (last !== null) for (let yy = Math.min(last, y); yy <= Math.max(last, y); yy++) f.px(x, yy, 0);
        last = y;
      }
    }
    // ── the status bar: still no signal, and the map works
    f.hud({ time: '06:32', sig: 0, bat: 99, tag: 'OFFLINE', tagInv: true });
    // ── in: the map window grows out of the previous screen in whole steps
    const g = f.span(b, 0, 0.8);
    if (g < 1 && !e.prevOf) {
      const M = f.snap(), e2 = 1 - Math.pow(1 - g, 2);
      const x0 = Math.round(84 - 84 * e2), y0 = Math.round(28 - 19 * e2), x1 = Math.round(84 + 156 * e2), y1 = Math.round(28 + 107 * e2);
      f.put(f.prev());
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) f.px(x, y, M[y * f.GW + x]);
      f.frame(x0 - 1, y0 - 1, x1 - x0 + 2, y1 - y0 + 2, 0);
    }
  }
  P.screens.map = paint;
  P.mapFlag = FLAG;
  SCENES['map'] = { draw(ctx, t, env) { P.present(ctx, env, (f, T) => paint(f, T, env)); } };
})();
