// px-sprites: the ONE CREDIT JAM cast as pixel sprites, drawn in code (a project module).
//
// Hand maps ('.' = transparent, '0'..'f' = CREDIT-16 index) follow the jam's own mock-ups (source/media/level.png):
//   TOKEN   the player: a GOLD token with an embossed ring, eyes and CHERRY sneakers (README: "GOLD: coins, credits,
//           the player"). Poses: stand, front, smile, blink, run0..3, jump, land, spin0..3 (a coin flip mid-air).
//   BUG     a LIME beetle (README: "Squash bugs"), walk0/1 and squashed.
// Painters (procedural, shaded on the palette ramps): coins of any size and spin phase with a reeded edge, the 16
// palette gems, the GOLDEN TOKEN, the rule icons (hourglass, CREDIT-16 grid, pulse wave), the arcade cabinet.
// Sprites are canvases built on first use and cached by name. OCJ.blit(g, name, x, y, {flip, tint}) draws one with
// its top-left at (x, y) in whole pixels; tint repaints every opaque pixel in one palette index (hit flashes).
(() => {
  const N = OCJ.N, HEX = OCJ.HEX;
  const CACHE = new Map();
  function fromMap(rows) {
    const h = rows.length, w = Math.max(...rows.map(r => r.length));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    rows.forEach((r, y) => [...r].forEach((ch, x) => {
      if (ch === '.' || ch === ' ') return;
      g.fillStyle = HEX[parseInt(ch, 16)]; g.fillRect(x, y, 1, 1);
    }));
    return c;
  }
  function mk(w, h, paint) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    paint((x, y, ci) => { if (x >= 0 && y >= 0 && x < w && y < h) { g.fillStyle = HEX[ci]; g.fillRect(x, y, 1, 1); } }, g);
    return c;
  }

  // ───────── the token (player) ─────────
  const BODY = [
    '.....111111.....',
    '...1144888811...',
    '..144877778871..',
    '.14877888877871.',
    '.18788888888781.',
    '1487888888888781',
    '1487888888888771',
    '1487888888888771',
    '1487888888888771',
    '.18788888888771.',
    '.17877888877771.',
    '..177877778771..',
    '...1177777711...',
    '.....111111.....',
  ];
  const SHOE = ['166.', '6665'];
  function token(o = {}) {
    const rows = BODY.map(r => [...r]);
    const eyes = o.eyes || [[7, 5], [11, 5]];
    for (const [x, y] of eyes) {
      if (o.blink) rows[y + 1][x] = '0';
      else { rows[y][x] = '0'; rows[y + 1][x] = '0'; }
    }
    for (const [x, y] of o.mouth || []) rows[y][x] = '5';
    while (rows.length < 16) rows.push([...'................']);
    for (const [fx, fy, flip] of o.feet || [[3, 14], [9, 14]]) {
      SHOE.forEach((ln, j) => [...(flip ? [...ln].reverse().join('') : ln)].forEach((ch, i) => {
        if (ch !== '.' && fy + j < 16 && fx + i < 16 && fx + i >= 0) rows[fy + j][fx + i] = ch;
      }));
    }
    return rows.map(r => r.join(''));
  }
  const TOKEN = {
    stand: token(),
    blink: token({ blink: true }),
    front: token({ eyes: [[5, 5], [10, 5]], mouth: [[7, 8], [8, 8]], feet: [[3, 14, true], [9, 14]] }),
    frontBlink: token({ eyes: [[5, 5], [10, 5]], mouth: [[7, 8], [8, 8]], blink: true, feet: [[3, 14, true], [9, 14]] }),
    smile: token({ eyes: [[5, 5], [10, 5]], mouth: [[6, 8], [7, 9], [8, 9], [9, 8]], feet: [[3, 14, true], [9, 14]] }),
    run0: token({ feet: [[1, 13, true], [10, 14]] }),
    run1: token({ feet: [[5, 14], [8, 13]] }),
    run2: token({ feet: [[4, 14, true], [11, 13]] }),
    run3: token({ feet: [[7, 13], [6, 14]] }),
    jump: token({ mouth: [[10, 8]], feet: [[2, 13, true], [11, 12]] }),
    land: token({ feet: [[2, 14, true], [10, 14]] }),
  };

  // ───────── coins / tokens of any size, turning ─────────
  // d: diameter (px), phase: turn angle (0 = face on; the reeded edge shows as the coin turns), emblem: '1' or none
  const ONE = ['.11', '111', '.11', '.11', '.11', '.11', '1111'];       // the embossed "1" (4 x 7)
  function coin(d, phase = 0, o = {}) {
    const pad = 2, S = d + pad * 2, r = d / 2, cx = S / 2, cy = S / 2;
    const cs = Math.cos(phase), sx = Math.max(0.1, Math.abs(cs)), side = cs >= 0 ? 1 : -1;
    const edge = Math.max(0, Math.round((1 - sx) * Math.max(2, d * 0.12)));   // visible edge thickness
    return mk(S, S, (put) => {
      const rx = r * sx;
      // reeded edge band on the trailing side
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const ey = (y + 0.5 - cy) / r;
        if (Math.abs(ey) > 1) continue;
        const half = rx * Math.sqrt(Math.max(0, 1 - ey * ey));
        const ex = x + 0.5 - cx;
        const lo = side > 0 ? half : -half - edge, hi = side > 0 ? half + edge : -half;
        if (edge > 0 && ex >= lo && ex < hi) put(x, y, (y % 2) ? N.EMBER : N.RUST);
      }
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const nx = (x + 0.5 - cx) / Math.max(rx, 0.5), ny = (y + 0.5 - cy) / r;
        const dd = Math.sqrt(nx * nx + ny * ny);
        if (dd > 1) continue;
        const light = -(nx * 0.55 + ny * 0.8);
        let ci = N.GOLD;
        if (dd > 1 - 1.6 / Math.max(rx, 1) && Math.abs(nx) > 0.2 || dd > 1 - 1.6 / r) {
          ci = light > 0.45 ? N.BONE : light > -0.25 ? N.GOLD : light > -0.7 ? N.EMBER : N.RUST;
        } else if (d >= 12 && Math.abs(dd - 0.72) < 0.9 / (r * 0.72) * 0.75) {
          ci = light < 0.2 ? N.EMBER : N.GOLD;
        } else {
          ci = light < -0.6 ? N.EMBER : N.GOLD;
          if (light > 0.62 && dd > 0.42 && dd < 0.9) ci = N.BONE;
        }
        put(x, y, ci);
      }
      // outline
      const occ = (x, y) => { const nx = (x + 0.5 - cx) / Math.max(rx, 0.5), ny = (y + 0.5 - cy) / r; return nx * nx + ny * ny <= 1; };
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        if (occ(x, y)) continue;
        if (occ(x + 1, y) || occ(x - 1, y) || occ(x, y + 1) || occ(x, y - 1)) {
          const ex = x + 0.5 - cx;
          if (edge > 0 && (side > 0 ? ex > 0 : ex < 0)) continue;
          put(x, y, N.NIGHT);
        }
      }
      if (o.emblem !== false && d >= 24 && sx > 0.55) {
        // a raised "1": EMBER body, BONE light on its top-left edges, RUST shadow one pixel down-right
        const k = d >= 28 ? 2 : 1, gw = 4 * k, gh = 7 * k;
        const ox = Math.round(cx - (gw * sx) / 2) - 1, oy = Math.round(cy - gh / 2);
        const cells = new Set();
        ONE.forEach((ln, j) => [...ln].forEach((ch, i) => {
          if (ch !== '1') return;
          for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) cells.add(`${ox + Math.floor((i * k + a) * sx)},${oy + j * k + b}`);
        }));
        const has = (x, y) => cells.has(`${x},${y}`);
        for (const key of cells) { const [x, y] = key.split(',').map(Number); if (!has(x + 1, y + 1)) put(x + 1, y + 1, N.RUST); }
        for (const key of cells) {
          const [x, y] = key.split(',').map(Number);
          put(x, y, !has(x, y - 1) || !has(x - 1, y) ? N.BONE : N.EMBER);
        }
      }
    });
  }

  // ───────── the 16 palette gems ─────────
  const GEM = ['...11...', '..1cc1..', '.1c4cc1.', '1c4cccc1', '1cccccb1', '.1cccb1.', '..1cb1..', '...11...'];
  function gem(ci) {
    const shade = OCJ.DARKER[ci] === ci ? N.NIGHT : OCJ.DARKER[ci];
    const dark = [N.VOID, N.NIGHT, N.SLATE, N.RUST, N.PINE, N.COBALT, N.GRAPE].includes(ci);
    const rim = dark ? N.FOG : N.NIGHT, hi = ci === N.BONE ? N.FOG : N.BONE;
    return fromMap(GEM.map(r => [...r].map(ch => ({ 1: rim.toString(16), c: ci.toString(16), 4: hi.toString(16), b: shade.toString(16) })[ch] || ch).join('')));
  }

  // ───────── the bug ─────────
  const BUG = [
    '..1.........1...',
    '...1.......1....',
    '....1.....1.....',
    '....11111111....',
    '...1aaaaaaaa1...',
    '..1aa4aaaaaaa1..',
    '.1aa44aaa9aaaa1.',
    '.1aaaaaa9aaaaa1.',
    '1aaaaaaa9aaaaaa1',
    '1999999999999991',
    '1440410000144041',
  ];
  const LEGS0 = ['.10001....10001.', '.1.1.1....1.1.1.'];
  const LEGS1 = ['.10001....10001.', '1.1.1......1.1.1'];
  const BUG_FLAT = [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '...1111111111...',
    '.11aaa4aaaaaa11.',
    '1aaaaaaa9aaaaaa1',
    '1999999999999991',
    '1330330000330331',
    '.1111......1111.',
  ];

  // ───────── rule icons (16 x 16) ─────────
  function hourglass(k) {                 // k: 0..3 sand level (top empties into the bottom)
    return mk(16, 16, (put) => {
      for (let x = 2; x < 14; x++) { put(x, 0, N.RUST); put(x, 1, N.EMBER); put(x, 14, N.EMBER); put(x, 15, N.RUST); }
      const glass = [[3, 12], [3, 12], [4, 11], [5, 10], [6, 9], [7, 8], [7, 8], [6, 9], [5, 10], [4, 11], [3, 12], [3, 12]];
      glass.forEach(([a, b], i) => {
        const y = 2 + i;
        put(a - 1, y, N.FOG); put(b + 1, y, N.FOG);
        for (let x = a; x <= b; x++) put(x, y, N.NIGHT);
      });
      const top = [2, 3, 4, 5][3 - k] ?? 2;          // rows of sand left in the top bulb (from the neck up)
      for (let i = 0; i < 6; i++) {
        const [a, b] = glass[i], y = 2 + i;
        if (5 - i < top) for (let x = a; x <= b; x++) put(x, y, N.GOLD);
      }
      for (let i = 6; i < 12; i++) {
        const [a, b] = glass[i], y = 2 + i;
        if (i - 6 >= 6 - (k + 2)) for (let x = a; x <= b; x++) put(x, y, N.GOLD);
      }
      if (k < 3) { put(7 + (k % 2), 8, N.GOLD); put(8 - (k % 2), 9, N.GOLD); }  // the falling stream
      put(4, 3, N.BONE); put(4, 4, N.BONE);
    });
  }
  function paletteIcon(shift) {           // the 16 colours of CREDIT-16 as a 4 x 4 grid; shift cycles the order
    return mk(16, 16, (put) => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) put(x, y, N.NIGHT);
      for (let i = 0; i < 16; i++) {
        const ci = (i + shift) % 16, gx = 1 + (i % 4) * 4 - 0, gy = 1 + Math.floor(i / 4) * 4 - 0;
        for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) put(gx + x, gy + y, ci === N.NIGHT ? N.SLATE : ci);
      }
    });
  }
  function waveIcon(ph) {                 // a pulse wave scrolling through a 16 x 16 scope
    return mk(16, 16, (put) => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) put(x, y, (x + y) % 4 === 0 && (y === 8) ? N.SLATE : N.NIGHT);
      for (let x = 0; x < 16; x++) put(x, 8, N.SLATE);
      let last = null;
      for (let x = 0; x < 16; x++) {
        const v = ((x + ph) % 8) < 3 ? 3 : 12;      // 37.5 % duty
        if (last !== null && last !== v) for (let y = Math.min(last, v); y <= Math.max(last, v); y++) put(x, y, N.SKY);
        put(x, v, N.SKY);
        last = v;
      }
    });
  }

  // ───────── the arcade cabinet (play's goal): 48 x 80, screen 32 x 18 at (8, 18) ─────────
  const CAB = { w: 48, h: 80, screen: { x: 8, y: 18, w: 32, h: 18 }, slot: { x: 22, y: 62 } };
  function cabinet() {
    return mk(CAB.w, CAB.h, (put, g) => {
      const R = (x, y, w, h, ci) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) put(xx, yy, ci); };
      // body: GRAPE sides with a NIGHT outline, a BUBBLE lip
      R(2, 0, 44, 80, N.GRAPE);
      R(0, 2, 2, 78, N.NIGHT); R(46, 2, 2, 78, N.NIGHT); R(2, 0, 44, 1, N.NIGHT);
      R(3, 1, 1, 78, N.BUBBLE);
      // marquee (lit)
      R(4, 3, 40, 10, N.NIGHT); R(5, 4, 38, 8, N.GOLD); R(5, 4, 38, 2, N.BONE); R(5, 10, 38, 2, N.EMBER);
      // tiny lettering on the marquee: three tokens
      for (const mx of [13, 22, 31]) { R(mx, 6, 4, 4, N.EMBER); R(mx + 1, 7, 2, 2, N.GOLD); }
      // bezel + screen (screen left empty: the scene paints it)
      R(5, 15, 38, 24, N.NIGHT); R(6, 16, 36, 22, N.SLATE);
      R(CAB.screen.x, CAB.screen.y, CAB.screen.w, CAB.screen.h, N.VOID);
      // control panel
      R(2, 40, 44, 2, N.BUBBLE); R(4, 42, 40, 10, N.NIGHT); R(5, 43, 38, 8, N.SLATE);
      R(12, 44, 2, 4, N.FOG); R(11, 43, 4, 2, N.CHERRY);                  // stick
      R(26, 45, 4, 3, N.GOLD); R(32, 45, 4, 3, N.SKY);                    // buttons
      // coin door with a lit slot
      R(14, 56, 20, 18, N.NIGHT); R(15, 57, 18, 16, N.SLATE); R(16, 58, 16, 1, N.FOG);
      R(CAB.slot.x, CAB.slot.y, 4, 6, N.VOID); R(CAB.slot.x + 1, CAB.slot.y + 1, 2, 4, N.EMBER);
      R(17, 70, 14, 2, N.FOG);
      // base
      R(0, 76, 48, 4, N.NIGHT);
    });
  }

  // ───────── sparkle (5 x 5 cross), 3 sizes ─────────
  const SPARK = [
    ['..4..', '.....', '4.4.4', '.....', '..4..'],
    ['.....', '..4..', '.444.', '..4..', '.....'],
    ['.....', '.....', '..4..', '.....', '.....'],
  ];

  const BUILD = {
    bug0: () => fromMap([...BUG, ...LEGS0]), bug1: () => fromMap([...BUG, ...LEGS1]), bugFlat: () => fromMap(BUG_FLAT),
    cabinet,
  };
  for (const [k, rows] of Object.entries(TOKEN)) BUILD['token_' + k] = () => fromMap(rows);
  for (let i = 0; i < 3; i++) BUILD['spark' + i] = () => fromMap(SPARK[i]);
  function spr(name) {
    let c = CACHE.get(name);
    if (c) return c;
    let m;
    if (BUILD[name]) c = BUILD[name]();
    else if ((m = /^coin(\d+)_(\d+)of(\d+)(_plain)?$/.exec(name))) c = coin(+m[1], (TAU * +m[2]) / +m[3], { emblem: !m[4] });
    else if ((m = /^gem(\d+)$/.exec(name))) c = gem(+m[1]);
    else if ((m = /^hourglass(\d)$/.exec(name))) c = hourglass(+m[1]);
    else if ((m = /^palette(\d+)$/.exec(name))) c = paletteIcon(+m[1]);
    else if ((m = /^wave(\d+)$/.exec(name))) c = waveIcon(+m[1]);
    else throw new Error('unknown sprite ' + name);
    CACHE.set(name, c);
    return c;
  }
  const TINT = new Map();
  function tinted(name, ci) {
    const key = name + '|' + ci;
    let c = TINT.get(key);
    if (c) return c;
    const s = spr(name);
    c = document.createElement('canvas'); c.width = s.width; c.height = s.height;
    const g = c.getContext('2d');
    g.drawImage(s, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = HEX[ci]; g.fillRect(0, 0, c.width, c.height);
    TINT.set(key, c);
    return c;
  }
  function blit(g, name, x, y, o = {}) {
    const c = o.tint !== undefined && o.tint !== null ? tinted(name, o.tint) : spr(name);
    g.save();
    g.imageSmoothingEnabled = false;
    if (o.flip) { g.translate(Math.round(x) + c.width, Math.round(y)); g.scale(-1, 1); g.drawImage(c, 0, 0); }
    else g.drawImage(c, Math.round(x), Math.round(y));
    g.restore();
    return c;
  }
  // the token hero's run cycle: 4 frames, one per step
  const RUN = ['run0', 'run1', 'run2', 'run3'];
  OCJ.spr = spr;
  OCJ.blit = blit;
  OCJ.CAB = CAB;
  OCJ.RUN = RUN;
})();
