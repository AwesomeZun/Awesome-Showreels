// room: the Pebble & Bean shop as a layout (a project module). The empty room (assets/px/shell.png) sets the floor: an
// isometric diamond whose edges climb 0.46 pixels per pixel, so a point on the floor is fp(u, v), u along the window
// wall (0 at the back corner, 1 at the left corner) and v along the right wall. Every item stands with its foot (the
// lowest pixel of its sprite, its front corner) on such a point; what stands on the counter or a shelf names the
// surface it stands on. UNPACK lists the order things come out of the boxes, one beat each. ROOM.draw composes the shop
// for any moment: which items are in place, the ones in flight (a hop out of the open box that grows from 40% to full
// size, a squash on landing, a puff of dust), people and the cat, sorted far to near.
(() => {
  const D = DIO, I = D.I;
  const OX = 30, OY = 17;                                             // the shell's corner in the 640 x 360 world
  const B = [291, 147], LA = [-174, 80], RA = [174, 80];
  const fp = (u, v) => [OX + B[0] + u * LA[0] + v * RA[0], OY + B[1] + u * LA[1] + v * RA[1]];
  const add = (p, dx, dy) => [p[0] + dx, p[1] + dy];
  // where everything stands (foot points in the world)
  const AT = {
    rug: fp(0.58, 0.5), monstera: fp(0.1, 0.07), sacks: fp(0.34, 0.1), roaster: fp(0.55, 0.12),
    shelf: fp(0.08, 0.42), pastry: fp(0.32, 0.36), counter: fp(0.42, 0.78), espresso: add(fp(0.36, 0.6), 0, -34),
    stool: fp(0.62, 0.64), table: fp(0.84, 0.72), chair_l: fp(0.84, 0.58), chair_r: fp(0.93, 0.82), easel: fp(0.97, 0.12),
    pendant: add(fp(0.36, 0.6), 0, -92), pothos: add(fp(0.16, 0.02), 0, -96), cactus: [OX + 326, OY + 80], cups: [OX + 374, OY + 103],
    record: fp(0.2, 0.92), box: fp(0.62, 0.34), box2: fp(0.66, 0.42), box_open: fp(0.6, 0.38),
  };
  const ON = { espresso: 'counter', cups: 'wall', cactus: 'wall', pendant: 'air', pothos: 'air' };
  // the unpacking order: one beat each (the short cut packs two to a beat where it needs to)
  const UNPACK = [['rug'], ['counter'], ['espresso'], ['roaster', 'sacks'], ['shelf'], ['pastry'], ['monstera'], ['table', 'chair_l', 'chair_r'],
    ['stool', 'easel'], ['pendant', 'pothos'], ['cactus', 'cups', 'record']];
  const DOOR = fp(0.82, 0);
  // an item's state at beat b if it comes out on beat k: hop 0.5 beat from the box, land, squash, settle
  function hop(name, b, k, from) {
    const to = AT[name], p = (b - k) / 0.5;
    if (p < 0) return null;
    if (p >= 1) { const s = b - k - 0.5; const sq = s < 1 / 6 ? [1.14, 0.84] : s < 2 / 6 ? [0.96, 1.06] : [1, 1]; return { x: to[0], y: to[1], sx: sq[0], sy: sq[1], landed: s }; }
    const e = p, x = from[0] + (to[0] - from[0]) * e, y = from[1] + (to[1] - from[1]) * e - Math.sin(Math.PI * e) * (46 + Math.abs(to[0] - from[0]) * 0.15);
    const g = 0.4 + 0.6 * e; return { x, y, sx: g * (1 - 0.12 * Math.sin(Math.PI * e)), sy: g * (1 + 0.16 * Math.sin(Math.PI * e)), flying: true };
  }
  function puff(x, y, s) {                                              // dust: eight pixels thrown out and settling
    if (s < 0 || s > 0.9) return;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.3, r = 4 + s * 18, px = x + Math.cos(a) * r * 1.6, py = y + Math.sin(a) * r * 0.55 - s * 4;
      D.px(px, py, s < 0.45 ? I.sand : I.latte);
    }
  }
  // the whole shop at beat b of a scene: o.placed (a set of names already in place), o.hops ([name, beat] pairs in
  // flight), o.boxes (0..1 how much of the box pile is left), o.people (a list of {sprite, x, y, flip}), o.cat
  function draw(b, o = {}) {
    D.layer('shell', OX, OY);
    if (o.sign !== undefined) signBoard(o.sign, o.signLit);
    const list = [];
    const placed = o.placed || new Set();
    const depth = (n, y) => (ON[n] === 'counter' ? AT.counter[1] + 0.5 : ON[n] === 'wall' || ON[n] === 'air' ? (n === 'pendant' ? 1e4 : -1) : y);
    for (const n of placed) list.push({ d: n === 'rug' ? -2 : depth(n, AT[n][1]), f: () => D.item(n, AT[n][0], AT[n][1]) });
    for (const [n, k] of o.hops || []) {
      const h = hop(n, b, k, AT.box_open);
      if (!h) continue;
      list.push({ d: h.flying ? 9e3 : n === 'rug' ? -2 : depth(n, h.y), f: () => { D.item(n, h.x, h.y, { sx: h.sx, sy: h.sy }); if (!h.flying && ON[n] !== 'air') puff(h.x, h.y, h.landed / 0.6); } });
    }
    if ((o.boxes ?? 0) > 0) {
      const k = o.boxes, sq = k < 1 ? k : 1;
      list.push({ d: AT.box[1], f: () => D.item('box', AT.box[0], AT.box[1], { sy: sq }) });
      list.push({ d: AT.box2[1], f: () => D.item('box', AT.box2[0], AT.box2[1], { sy: sq }) });
      list.push({ d: AT.box_open[1] + 0.2, f: () => D.item('box_open', AT.box_open[0] + (o.boxShift || 0), AT.box_open[1], { sy: sq }) });
    }
    for (const p of o.people || []) list.push({ d: p.y + (p.dz || 0), f: () => D.item(p.sprite, p.x, p.y, { flip: p.flip }) });
    if (o.cat) list.push({ d: o.cat.y, f: () => D.item(o.cat.sprite, o.cat.x, o.cat.y, { flip: o.cat.flip }) });
    list.sort((a, c) => a.d - c.d).forEach(e => e.f());
  }
  // the room's window glass (for rain and the evening glow), in world pixels
  const S = (x, y) => [OX + x, OY + y];
  const GLASS = [[S(173, 100), S(281, 50), S(281, 150), S(173, 200)], [S(136, 114), S(163, 102), S(163, 196), S(136, 208)]];
  // the house sign, painted on a board along the right wall (sheared 0.46 like the wall): n letters written so far
  const SIGN = { x: OX + 346, y: OY + 58, w: 74, h: 17, skew: 0.46 };
  function signBoard(n, lit) {
    const { x, y, w, h, skew } = SIGN;
    for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) {
      const edge = i === 0 || i === w - 1 || j === 0 || j === h - 1;
      D.px(x + i, y + j + Math.round(i * skew), edge ? I.espresso : j === 1 ? I.cream : I.latte);
    }
    if (n > 0) D.text('Pebble & Bean', x + w / 2, y + 4, { align: 'c', skew, n, c: lit ? I.glow : I.espresso, shadow: lit ? I.caramel : I.caramel, em: !!lit });
  }
  window.ROOM = { OX, OY, fp, AT, UNPACK, DOOR, GLASS, SIGN, draw, hop, puff };
})();
