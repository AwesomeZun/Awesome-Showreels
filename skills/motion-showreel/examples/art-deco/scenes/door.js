// door: the hook. Gold rules draw the stepped architrave of the emerald door from its keystone down both sides, the
// sconces come on, the door rises out of the dark; two knocks land on beats 2 and 3 ("KNOCK" left of the door,
// "TWICE." right of it), the word is given on the downbeat of bar 2, light shows at the seam, and in the out-phase
// the two leaves swing inward while the camera walks to the doorway: the next scene (fan) is already the room behind
// the door (portalFlash: env.portal draws it in the doorway, the gold burst lands on the bar line).
// House style: the fan is inlaid across both leaves "so that it is whole only while the door is shut"; "two brass
// studs, one on each leaf, take the knocks"; everything symmetric about the centre line.
(() => {
  const at = (env, b) => env.lt - b * env.beatSec;
  const CX = W / 2, FLOOR = 930;
  const DOOR = { x: 712, y: 360, w: 496, h: FLOOR - 360 };          // the two leaves
  const LEAF_W = DOOR.w / 2, FAN_R = 248;                            // fanlight radius = half the doorway
  const STUD_Y = 528, STUD_DX = 46;
  // right half of the stepped architrave (crown setbacks, then down to the floor), outer and inner rules
  const ARCH_OUT = [[CX, 72], [1056, 72], [1056, 96], [1132, 96], [1132, 132], [1196, 132], [1196, 196], [1252, 196], [1252, FLOOR]];
  const ARCH_IN = [[CX, 86], [1042, 86], [1042, 110], [1118, 110], [1118, 146], [1182, 146], [1182, 210], [1238, 210], [1238, FLOOR]];
  const JAMB = [[CX, DOOR.y], [DOOR.x + DOOR.w, DOOR.y], [DOOR.x + DOOR.w, FLOOR]];

  // ── one leaf as a texture (2x), drawn once: lacquer, stepped gold border, the half fan, chevrons, a top panel ──
  const TEX = {};
  function leafTexture(P, side) {
    const key = side + P.accent + P.emerald;
    if (TEX[key]) return TEX[key];
    const S = 2, w = LEAF_W, h = DOOR.h, b = makeBuf(Math.round(w * S), Math.round(h * S)), g = b.g;
    g.scale(S, S);
    const seam = side < 0 ? w : 0;                                   // x of the centre seam inside this leaf
    g.fillStyle = FAN.lacquerGrad(g, 0, 0, w, 0, P); g.fillRect(0, 0, w, h);
    g.fillStyle = linear(g, 0, 0, 0, h, [[0, 'rgba(255,255,255,0.10)'], [0.35, 'rgba(255,255,255,0)'], [0.75, 'rgba(0,0,0,0.15)'], [1, 'rgba(0,0,0,0.38)']]);
    g.fillRect(0, 0, w, h);
    // stepped double border
    const gold = (lw, a = 1) => { g.strokeStyle = rgba(P.accent, a); g.lineWidth = lw; g.lineJoin = 'miter'; };
    const stepped = (x0, y0, x1, y1, st) => {
      g.beginPath(); g.moveTo(x0 + st, y0); g.lineTo(x1 - st, y0); g.lineTo(x1 - st, y0 + st); g.lineTo(x1, y0 + st); g.lineTo(x1, y1 - st);
      g.lineTo(x1 - st, y1 - st); g.lineTo(x1 - st, y1); g.lineTo(x0 + st, y1); g.lineTo(x0 + st, y1 - st); g.lineTo(x0, y1 - st);
      g.lineTo(x0, y0 + st); g.lineTo(x0 + st, y0 + st); g.closePath(); g.stroke();
    };
    gold(2.2); stepped(14, 14, w - 14, h - 14, 12);
    gold(1, 0.8); stepped(24, 24, w - 24, h - 24, 10);
    // top panel: stepped tablet with vertical reeds
    gold(1.4); stepped(42, 40, w - 42, 136, 9);
    for (let i = 0; i < 9; i++) { const x = 60 + i * ((w - 120) / 8); g.strokeStyle = rgba(P.accent, 0.55); g.lineWidth = 1; g.beginPath(); g.moveTo(x, 56); g.lineTo(x, 120); g.stroke(); }
    // the half fan, pivot on the seam: three emerald panels and three and a half ribs on this leaf
    const fy = 352, R = 150, a0 = side < 0 ? Math.PI : 1.5 * Math.PI, a1 = side < 0 ? 1.5 * Math.PI : 2 * Math.PI;
    for (let i = 0; i < 3; i++) {
      const b0 = lerp(a0, a1, i / 3), b1 = lerp(a0, a1, (i + 1) / 3);
      g.beginPath(); g.moveTo(seam, fy); g.arc(seam, fy, R, b0, b1); g.closePath();
      g.fillStyle = (i + (side < 0 ? 0 : 1)) % 2 ? rgba(P.emeraldDeep || '#0A3D31', 0.65) : rgba('#FFFFFF', 0.05); g.fill();
    }
    for (const f of [0.38, 0.66]) { g.beginPath(); g.arc(seam, fy, R * f, a0, a1); gold(1.2, 0.9); g.stroke(); }
    g.beginPath(); g.arc(seam, fy, R, a0, a1); gold(3.2); g.stroke();
    g.beginPath(); g.arc(seam, fy, R + 12, a0, a1); gold(1.2, 0.85); g.stroke();
    for (let i = 0; i <= 3; i++) {
      const a = lerp(a0, a1, i / 3), ex = seam + Math.cos(a) * R, ey = fy + Math.sin(a) * R;
      g.beginPath(); g.moveTo(seam, fy); g.lineTo(ex, ey); gold(i === (side < 0 ? 3 : 0) ? 1.8 : 3); g.stroke();
      g.strokeStyle = rgba(P.goldLight || '#FFF', 0.6); g.lineWidth = 0.9; g.stroke();
    }
    g.beginPath(); g.moveTo(side < 0 ? seam - R - 22 : seam, fy); g.lineTo(side < 0 ? seam : seam + R + 22, fy); gold(2.4); g.stroke();
    g.beginPath(); g.arc(seam, fy, 20, a0, a1); g.lineTo(seam, fy); g.closePath(); g.fillStyle = P.accent; g.fill();
    // chevrons below the fan, meeting on the seam
    for (let k = 0; k < 4; k++) {
      const y = 392 + k * 22, dx = w - 46;
      g.beginPath(); g.moveTo(seam, y); g.lineTo(side < 0 ? seam - dx : seam + dx, y + dx * 0.24); gold(k === 0 ? 2.2 : 1.3, k === 0 ? 1 : 0.75); g.stroke();
    }
    // kick plate
    g.fillStyle = FAN.goldGrad(g, 0, h - 64, 0, h - 30, P); g.globalAlpha = 0.85; g.fillRect(30, h - 62, w - 60, 26); g.globalAlpha = 1;
    g.strokeStyle = rgba(P.goldShade || '#000', 0.9); g.lineWidth = 1; g.strokeRect(30, h - 62, w - 60, 26);
    TEX[key] = b.c;
    return b.c;
  }

  // ── fanlight above the leaves: amber panes between gold mullions, glowing with the room's light ──
  function fanlight(ctx, P, rays, glow, t) {
    const cx = CX, cy = DOOR.y, R = FAN_R, n = 14, vis = Ease.outC(clamp(rays * 1.4));
    if (vis <= 0.002) return;
    ctx.save(); ctx.globalAlpha *= vis;
    ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI, 2 * Math.PI); ctx.closePath(); ctx.clip();
    ctx.fillStyle = radial(ctx, cx, cy, 10, R, [[0, rgba(mix(P.goldLight, '#FFFFFF', 0.3), 0.18 + 0.75 * glow)], [0.5, rgba(P.accent, 0.1 + 0.45 * glow)], [1, rgba(P.goldShade, 0.08 + 0.25 * glow)]]);
    ctx.fillRect(cx - R, cy - R, R * 2, R);
    for (let i = 0; i < n; i++) {                                     // flicker of the room behind the glass
      const a = Math.PI + (i + 0.5) * Math.PI / n, f = 0.5 + 0.5 * Math.sin(t * (2.2 + hash(i) * 2) + i * 1.3);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a - Math.PI / n / 2, a + Math.PI / n / 2); ctx.closePath();
      ctx.fillStyle = rgba(P.goldLight, 0.05 * glow * f); ctx.fill();
    }
    ctx.restore();
    ctx.save(); ctx.globalAlpha *= vis;
    // mullions radiate centre-out (rays 0..1), then the rims
    const mid = n / 2;
    ctx.save(); ctx.lineCap = 'butt';
    for (let i = 1; i < n; i++) {
      const d = Math.abs(i - mid) / mid, k = Ease.outQuint(clamp((rays - d * 0.55) / 0.45));
      if (k <= 0) continue;
      const a = Math.PI + (i * Math.PI) / n;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 34, cy + Math.sin(a) * 34); ctx.lineTo(cx + Math.cos(a) * (34 + (R - 34) * k), cy + Math.sin(a) * (34 + (R - 34) * k));
      ctx.strokeStyle = P.accent; ctx.lineWidth = 2.4; ctx.stroke();
    }
    const rk = Ease.outQuint(clamp(rays * 1.2));
    if (rk > 0) {
      ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2 - (Math.PI / 2) * rk, -Math.PI / 2 + (Math.PI / 2) * rk); ctx.strokeStyle = P.accent; ctx.lineWidth = 4; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.62, -Math.PI / 2 - (Math.PI / 2) * rk, -Math.PI / 2 + (Math.PI / 2) * rk); ctx.lineWidth = 1.6; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, 34, Math.PI, 2 * Math.PI); ctx.closePath(); ctx.fillStyle = FAN.goldGrad(ctx, 0, cy - 34, 0, cy, P); ctx.globalAlpha *= rk; ctx.fill();
    }
    ctx.restore();
    ctx.restore();
  }

  // ── wall sconce: an upturned half fan of frosted glass on a stepped bracket, washing the wall with light ──
  function sconce(ctx, P, x, y, on, t) {
    if (on > 0.01) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = radial(ctx, x, y - 30, 0, 300, [[0, rgba(P.accent, 0.32 * on)], [0.45, rgba(P.goldShade, 0.12 * on)], [1, rgba(P.goldShade, 0)]]);
      ctx.fillRect(x - 300, y - 330, 600, 600);
      ctx.beginPath(); ctx.moveTo(x - 46, y - 8); ctx.lineTo(x - 150, y - 420); ctx.lineTo(x + 150, y - 420); ctx.lineTo(x + 46, y - 8); ctx.closePath();
      ctx.fillStyle = linear(ctx, 0, y, 0, y - 420, [[0, rgba(P.goldLight, 0.13 * on)], [1, rgba(P.goldLight, 0)]]); ctx.fill();
      ctx.restore();
    }
    const r = 48;
    ctx.save(); ctx.globalAlpha *= 0.35 + 0.65 * Math.min(1, on * 1.5);
    ctx.beginPath(); ctx.arc(x, y, r, Math.PI, 2 * Math.PI); ctx.closePath();
    ctx.fillStyle = radial(ctx, x, y, 4, r, [[0, mix(P.bg2, '#FFF6DE', 0.25 + 0.7 * on)], [1, mix(P.bg2, P.goldLight, 0.12 + 0.55 * on)]]); ctx.fill();
    ctx.strokeStyle = P.accent; ctx.lineWidth = 2.6; ctx.stroke();
    for (let i = 1; i < 6; i++) { const a = Math.PI + (i * Math.PI) / 6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.lineWidth = 1.6; ctx.stroke(); }
    ctx.fillStyle = FAN.goldGrad(ctx, 0, y, 0, y + 46, P);
    ctx.fillRect(x - 30, y, 60, 10); ctx.fillRect(x - 20, y + 10, 40, 12); ctx.fillRect(x - 10, y + 22, 20, 22);
    ctx.restore();
  }

  // camera for the out-phase walk to the doorway (zEnd puts the portal's drawing of the next scene at 1:1)
  const PORTAL = { x: DOOR.x, y: DOOR.y, w: DOOR.w, h: DOOR.h };
  const PSC = Math.max(PORTAL.w / W, PORTAL.h / H) * 1.15, Z_END = 1 / PSC;
  function camera(env) {
    const o = env.phase.out;
    return { z: lerp(1, Z_END, Ease.inQ(o) * 0.55 + Ease.ioC(o) * 0.45), tx: CX, ty: lerp(H / 2, PORTAL.y + PORTAL.h / 2, Ease.ioC(o)) };
  }
  const toScreen = (cam, x, y) => [W / 2 + (x - cam.tx) * cam.z, H / 2 + (y - cam.ty) * cam.z];

  SCENES['door'] = {
    portal(t, env) {
      const cam = camera(env), [x0, y0] = toScreen(cam, PORTAL.x, PORTAL.y), [x1, y1] = toScreen(cam, PORTAL.x + PORTAL.w, PORTAL.y + PORTAL.h);
      return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, r: 0 };
    },
    draw(ctx, t, env) {
      const P = env.palette, lt = env.lt, bs = env.beatSec, out = env.phase.out;
      const cam = camera(env);
      // ---------- world (under the camera) ----------
      ctx.save();
      ctx.translate(W / 2, H / 2); ctx.scale(cam.z, cam.z); ctx.translate(-cam.tx, -cam.ty);
      FAN.ground(ctx, env, P, { liftY: 560, liftR: 1000, alpha: 0.05, rays: 40, fluting: Ease.outC(rm(lt, 0.3 * bs, 1.4 * bs)) });
      // sconces: flicker on, then breathe
      const fl = (b) => { const s = rm(lt, b * bs, (b + 0.7) * bs); if (s >= 1) return 1; if (s <= 0) return 0; return s * (0.55 + 0.45 * (hash(Math.floor(lt * 30) + b * 31) > 0.35 ? 1 : 0.2)); };
      const breathe = 0.92 + 0.08 * Math.sin(lt * 2.1);
      sconce(ctx, P, 430, 340, fl(0.35) * breathe, lt);
      sconce(ctx, P, W - 430, 340, fl(0.45) * breathe, lt);
      // doorway interior: the next scene when the compositor offers it (portalFlash window), else the lit room
      const theta = (Math.PI / 2) * 0.9 * Ease.ioC(rm(out, 0.02, 1));
      if (theta > 0.001) {
        if (env.portal) env.portal(ctx, PORTAL.x, PORTAL.y, PORTAL.w, PORTAL.h);
        else { ctx.fillStyle = radial(ctx, CX, 640, 20, 420, [[0, mix(P.goldLight, P.accent, 0.4)], [1, P.goldShade]]); ctx.fillRect(DOOR.x, DOOR.y, DOOR.w, DOOR.h); }
      }
      // the leaves: come out of the dark from the lintel down as the light finds them, jolt on each knock, then
      // swing inward on their hinges
      const lit = Ease.outC(rm(lt, 0.45 * bs, 1.6 * bs)), wipe = rm(lt, 0.45 * bs, 1.6 * bs);
      let jolt = 0;
      for (const b of [2, 3]) { const d = at(env, b); if (d >= 0 && d < 0.5) jolt += Math.sin(d * 70) * 3.2 * Math.exp(-d * 11); }
      const texL = leafTexture(P, -1), texR = leafTexture(P, 1);
      if (wipe >= 1) {
        ctx.save(); ctx.translate(jolt * 0.4, 0);
        FAN.leaf(ctx, texL, DOOR.x, DOOR.y, FLOOR, LEAF_W, -1, theta, { horizon: 560, shade: 0.8 * Math.sin(theta) });
        FAN.leaf(ctx, texR, DOOR.x + DOOR.w, DOOR.y, FLOOR, LEAF_W, 1, theta, { horizon: 560, shade: 0.8 * Math.sin(theta) });
        ctx.restore();
      } else if (wipe > 0) {                                            // light falls from the lintel downward
        const B = FAN.buf('doorwipe', DOOR.w, DOOR.h), g = B.g, yy = lerp(-140, DOOR.h + 60, Ease.ioC(wipe));
        g.drawImage(texL, 0, 0, LEAF_W, DOOR.h); g.drawImage(texR, LEAF_W, 0, LEAF_W, DOOR.h);
        g.globalCompositeOperation = 'destination-in';
        g.fillStyle = linear(g, 0, yy - 160, 0, yy + 20, [[0, 'rgba(0,0,0,1)'], [1, 'rgba(0,0,0,0)']]); g.fillRect(0, 0, DOOR.w, DOOR.h);
        g.globalCompositeOperation = 'source-over';
        ctx.save(); ctx.globalAlpha *= lit; ctx.drawImage(B.c, DOOR.x, DOOR.y); ctx.restore();
      }
      // light at the seam once the word is given, breathing
      const seam = Ease.outQuint(rm(lt, 4 * bs, 4.6 * bs)) * (1 - rm(out, 0, 0.25));
      if (seam > 0.01 && theta < 0.01) {
        const hh = (FLOOR - DOOR.y) * 0.5 * seam, my = (DOOR.y + FLOOR) / 2, br = 0.8 + 0.2 * Math.sin(lt * 5.3);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = linear(ctx, CX - 18, 0, CX + 18, 0, [[0, rgba(P.goldLight, 0)], [0.5, rgba('#FFF4D6', 0.85 * br)], [1, rgba(P.goldLight, 0)]]);
        ctx.fillRect(CX - 18, my - hh, 36, hh * 2);
        ctx.fillStyle = rgba('#FFFBEF', 0.9 * br); ctx.fillRect(CX - 1.2, my - hh, 2.4, hh * 2);
        softBlob(ctx, CX, FLOOR - 4, 160 * seam, P.goldLight, 0.25 * br);
        ctx.restore();
      }
      // fanlight
      const rays = rm(lt, 0.8 * bs, 1.9 * bs), glow = 0.2 * Ease.outC(rm(lt, 0.8 * bs, 1.8 * bs)) + 0.55 * seam + 0.6 * Ease.ioC(out);
      fanlight(ctx, P, rays, clamp(glow + 0.12 * Math.max(...[2, 3].map(b => { const d = at(env, b); return d >= 0 ? Math.exp(-d * 6) : 0; }))), lt);
      // architrave: two gold rules drawn from the keystone down both sides; the jamb and lintel; the floor line
      const ua = Ease.ioC(rm(lt, 0, 1.6 * bs));
      FAN.gildMirror(ctx, ARCH_OUT, CX, ua, P, { lw: 3, glow: 0.35 });
      FAN.gildMirror(ctx, ARCH_IN, CX, Ease.ioC(rm(lt, 0.12 * bs, 1.75 * bs)), P, { lw: 1.4, nib: false });
      FAN.gildMirror(ctx, JAMB, CX, Ease.ioC(rm(lt, 0.4 * bs, 1.6 * bs)), P, { lw: 2.2, nib: false });
      const uf = Ease.outQuint(rm(lt, 1.0 * bs, 2.0 * bs));
      FAN.gildMirror(ctx, [[CX, FLOOR], [CX + 820, FLOOR]], CX, uf, P, { lw: 2, nib: false });
      if (uf > 0) {                                                    // polished floor: the door's reflection
        ctx.save(); ctx.globalAlpha *= 0.18 * uf * lit;
        ctx.translate(0, FLOOR * 2); ctx.scale(1, -1);
        if (theta < 0.01) {
          const B = FAN.buf('doorrefl', DOOR.w, 200), g = B.g;
          g.drawImage(texL, 0, -(DOOR.h - 200), LEAF_W, DOOR.h); g.drawImage(texR, LEAF_W, -(DOOR.h - 200), LEAF_W, DOOR.h);
          g.globalCompositeOperation = 'destination-in';
          g.fillStyle = linear(g, 0, 0, 0, 200, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,1)']]); g.fillRect(0, 0, DOOR.w, 200);
          g.globalCompositeOperation = 'source-over';
          ctx.drawImage(B.c, DOOR.x, FLOOR - 200);
        }
        ctx.restore();
      }
      // brass studs: pop in, flash on their knock
      for (const [i, b] of [[-1, 2], [1, 3]]) {
        const pk = Ease.outBack(rm(lt, 1.6 * bs, 1.6 * bs + 0.3), 2.4), d = at(env, b), fl2 = d >= 0 ? Math.exp(-d * 7) : 0;
        if (pk <= 0 || theta > 0.05) continue;
        const x = CX + i * STUD_DX + jolt * 0.4, y = STUD_Y;
        circle(ctx, x, y, 11 * pk); ctx.fillStyle = radial(ctx, x - 3, y - 4, 0, 13, [[0, '#FFF8E2'], [0.5, P.goldLight], [1, P.goldShade]]); ctx.fill();
        if (fl2 > 0.01) { softBlob(ctx, x, y, 90, P.goldLight, 0.7 * fl2); sparkle(ctx, x, y, 34 * fl2 + 8, fl2, d * 4, '#FFF8E6'); }
      }
      // gold dust in the sconce light and puffing from the seam on the knocks
      FAN.dust(ctx, lt, P, { n: 26, x0: 220, x1: 640, y0: 80, y1: 560, alpha: fl(0.35) * 0.9, seed: 3 });
      FAN.dust(ctx, lt, P, { n: 26, x0: 1280, x1: 1700, y0: 80, y1: 560, alpha: fl(0.45) * 0.9, seed: 9 });
      for (const b of [2, 3]) {
        const d = at(env, b);
        if (d < 0 || d > 1.2) continue;
        for (let i = 0; i < 14; i++) {
          const a = -Math.PI / 2 + (hash(i * 3.1 + b) - 0.5) * 2.6, sp = 60 + hash(i * 7.7 + b) * 160, x = CX + Math.cos(a) * sp * d, y = STUD_Y + Math.sin(a) * sp * d + 40 * d * d;
          circle(ctx, x, y, 1.6 + hash(i) * 1.8); ctx.fillStyle = rgba(P.goldLight, 0.85 * (1 - d / 1.2)); ctx.fill();
        }
      }
      // dim the walls as the room's light takes over
      if (out > 0) {
        ctx.save(); ctx.fillStyle = rgba(P.bg, 0.72 * Ease.inQ(out));
        ctx.beginPath(); ctx.rect(-W, -H, W * 3, H * 3); ctx.rect(DOOR.x, DOOR.y, DOOR.w, DOOR.h); ctx.fill('evenodd'); ctx.restore();
      }
      ctx.restore();
      // ---------- type (screen space, slides apart as the camera walks in) ----------
      const sideOut = Ease.inC(rm(out, 0.1, 0.8)), fadeOut = 1 - Ease.inQ(rm(out, 0.15, 0.75));
      const size = Math.min(fitSize(ctx, 'KNOCK', 470, { size: 124, weight: 400, fam: 'display', ls: 124 * 0.08 }), fitSize(ctx, 'TWICE.', 470, { size: 124, weight: 400, fam: 'display', ls: 124 * 0.08 }));
      const slam = (b) => { const d = at(env, b); if (d < 0) return null; return { s: 1 + 0.22 * (1 - Ease.outExpo(clamp(d / 0.24))), a: clamp(d / 0.05), flash: Math.exp(-d * 9) }; };
      const yW = 646, shine = rm(lt, 5 * bs, 5 * bs + 0.9);
      for (const [word, b, x, align] of [['KNOCK', 2, 610 - 300 * sideOut, 'right'], ['TWICE.', 3, 1310 + 300 * sideOut, 'left']]) {
        const s = slam(b);
        if (!s) continue;
        ctx.save(); ctx.globalAlpha *= s.a * fadeOut;
        const ax = x, ay = yW - size * 0.36;
        ctx.translate(ax, ay); ctx.scale(s.s, s.s); ctx.translate(-ax, -ay);
        FAN.text(ctx, word, x, yW, { size, fam: 'display', ls: size * 0.08, align, gold: true, palette: P, sheen: shine, glowA: 0.3 + 0.5 * s.flash, glowBlur: 26 + 40 * s.flash });
        ctx.restore();
        if (s.flash > 0.02) env.fx.shake = Math.max(env.fx.shake, 5 * s.flash);
      }
      // the word, on the downbeat of bar 2: spoken (hairline), "Sunburst." in gold
      const hl = STYLE.fonts.hairline, ys = 742;
      withAlpha(ctx, fadeOut, () => {
        revealLine(ctx, 'The word is', 604 - 300 * sideOut, ys, Ease.outQuint(rm(at(env, 4), 0, 0.55)), { size: 52, weight: 400, fam: hl, color: P.ink, align: 'right' });
        const pw = rm(at(env, 4.33), 0, 0.55);
        if (pw > 0) {
          ctx.save(); ctx.beginPath(); ctx.rect(1300 + 300 * sideOut, ys - 62, 560, 84); ctx.clip();
          FAN.text(ctx, 'Sunburst.', 1316 + 300 * sideOut, ys + (1 - Ease.outQuint(pw)) * 66, { size: 52, fam: hl, align: 'left', gold: true, palette: P, seams: false, glowA: 0.25, ls: 1 });
          ctx.restore();
        }
      });
      // footer: the line printed above it on the card
      FAN.label(ctx, 'PRESENT THIS CARD AT THE EMERALD DOOR', CX, 1012, { size: 21, color: P.ink2, lt: at(env, 1.1), stagger: 0.022, dur: 0.5, alpha: 1 - Ease.inQ(rm(out, 0, 0.5)) });
    },
  };
})();
