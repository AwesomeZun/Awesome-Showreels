// steep: "A cup at first light." Opens on grow's last frame (the flush, same plant data, same camera). The flush is
// picked on beat 0.5 and falls away from the camera into a stoneware cup seen from above; it lands on 1.5, rings
// spread, and the liquor blooms pale gold like wet-in-wet watercolour; steam drifts up in washes. Hold (30 cut): the
// subline, then the steeping notes one per beat, then the cup deepens. Out: night floods in from every edge.
(() => {
  const MF = window.MISTFOLD;
  const at = (env, b) => env.lt - b * env.beatSec;
  const CX = 1250, CY = 592, R = 286, RL = 236;                 // the cup (screen space): rim and liquor radius
  const LAND = [CX - 30, CY + 8];                               // where the flush comes to rest on the water
  // the rim is hand-thrown: a slightly irregular circle
  const rimPath = (r, seed, amp = 3) => {
    const p = new Path2D();
    for (let i = 0; i <= 160; i++) {
      const a = (i / 160) * TAU, rr = r + (MF.vnoise(Math.cos(a) * 2 + seed, Math.sin(a) * 2, seed) - 0.5) * 2 * amp;
      const x = CX + Math.cos(a) * rr, y = CY + Math.sin(a) * rr;
      if (i) p.lineTo(x, y); else p.moveTo(x, y);
    }
    p.closePath(); return p;
  };
  // the cup without its liquor, cached: a sage wash pooled under it, a soft shadow, celadon-oat glaze with iron
  // speckles, the inner wall in shade on the light's side, a breaking-glaze lip, ink rims
  function cupSprite() {
    return MF.memo('steep:cup', () => {
      const b = makeBuf(W, H), g = b.g, P = C;
      const pool = MF.washPath(CX - 70, CY + 30, R * 1.36, 21, 0, { amp: 0.13, fringe: 0.03 }), pool2 = MF.washPath(CX - 50, CY + 18, R * 1.3, 24, 0, { amp: 0.14, fringe: 0.04 });
      MF.wcWash(g, pool, mix(P.accent2, P.liquor, 0.25), { a: 0.26, path2: pool2, col2: mix(P.accent2, P.accent, 0.3), box: [CX - R * 1.6, CY - R * 1.5, R * 3.2, R * 3.1], seed: 3, edge: mix(P.accent2, P.accent, 0.55), edgeA: 0.45 });
      g.save(); g.filter = 'blur(26px)'; g.fillStyle = rgba(mix(P.stem, P.ink, 0.45), 0.32);
      g.beginPath(); g.ellipse(CX + 32, CY + 40, R + 8, R + 4, 0, 0, TAU); g.fill(); g.restore();
      const glazeL = '#F5F3E8', glaze = '#E4E7D7', glazeD = '#C8D0BB';
      const body = rimPath(R, 1, 3), wall = rimPath(R - 24, 2, 2.5);
      g.fillStyle = linear(g, CX - R, CY - R, CX + R, CY + R, [[0, glazeL], [0.5, glaze], [1, glazeD]]); g.fill(body);
      g.save(); g.clip(wall);
      g.fillStyle = linear(g, CX - R, CY - R, CX + R, CY + R, [[0, mix(glazeD, P.stem, 0.24)], [0.45, glazeD], [1, glazeL]]); g.fillRect(CX - R, CY - R, R * 2, R * 2);
      for (let k = 1; k <= 3; k++) { g.strokeStyle = rgba(P.stem, 0.07); g.lineWidth = 1.2; g.stroke(rimPath(R - 24 - k * 5, 9 + k, 1.5)); }   // throwing rings
      g.restore();
      g.save(); g.clip(body); g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.14;
      g.fillStyle = g.createPattern(MF.grainTile(), 'repeat'); g.fillRect(CX - R - 10, CY - R - 10, R * 2 + 20, R * 2 + 20); g.restore();
      for (let i = 0; i < 110; i++) {                          // iron speckles in the glaze
        const a = hash(i * 3.31) * TAU, rr = lerp(RL + 6, R - 3, hash(i * 5.17)), r0 = 0.5 + Math.pow(hash(i * 7.7), 3) * 1.6;
        g.fillStyle = rgba(mix(P.stem, '#2A1E12', 0.4), 0.35 + hash(i * 2.2) * 0.4); circle(g, CX + Math.cos(a) * rr, CY + Math.sin(a) * rr, r0); g.fill();
      }
      g.lineJoin = 'round';
      g.strokeStyle = rgba(mix(P.accent3, P.stem, 0.45), 0.36); g.lineWidth = 3.2; g.stroke(rimPath(R - 11, 3, 2));     // the glaze breaks at the lip
      g.strokeStyle = rgba(P.ink, 0.62); g.lineWidth = 1.7; g.stroke(body);
      g.strokeStyle = rgba(P.ink, 0.42); g.lineWidth = 1.2; g.stroke(wall);
      return b.c;
    });
  }
  // the falling flush: a camera on the plant data, from grow's close-up to resting on the water
  function flushPose(env) {
    const bs = env.beatSec, FV = MF.FLUSH_VIEW, lt = env.lt;
    const snap = at(env, 0.5), fall = rm(lt, 0.5 * bs, 1.5 * bs), e = Ease.ioC(fall);
    const jolt = snap > 0 && snap < 0.16 ? Math.sin((snap / 0.16) * Math.PI) * 5 : 0;          // the stem gives
    const landed = at(env, 1.5), drift = landed > 0 ? 1 - Math.exp(-landed * 0.6) : 0;          // then it floats
    return {
      x: lerp(FV.x, LAND[0], e) + Math.sin(e * Math.PI) * 70 + drift * 10 * Math.sin(lt * 0.4),
      y: lerp(FV.y, LAND[1], e) - jolt + drift * 8 * Math.cos(lt * 0.33),
      z: lerp(FV.z, 0.96, e), rot: lerp(0, 0.95, e) + (landed > 0 ? landed * 0.045 : 0), fall, landed,
    };
  }
  function drawFlush(ctx, env, pose, wet) {
    const fa = MF.flushAnchor(), sh = MF.shoot(MF.TEA_PLANT);
    ctx.save();
    ctx.translate(pose.x, pose.y); ctx.rotate(pose.rot); ctx.scale(pose.z, pose.z); ctx.translate(-fa[0], -fa[1]);
    if (wet > 0) {                                             // a soft shadow on the water once it floats
      ctx.save(); ctx.globalAlpha *= 0.22 * wet; ctx.filter = 'brightness(0.2) blur(5px)'; ctx.translate(7, 9);
      MF.drawShoot(ctx, sh, 99, { from: MF.FLUSH_CUT, w0: 10, w1: 3 });
      ctx.restore();
    }
    const sway = pose.fall <= 0 ? 0.02 * Ease.outC(rm(env.lt, 0, 0.5 * env.beatSec)) : 0;
    MF.drawShoot(ctx, sh, 99, { from: MF.FLUSH_CUT, sway, t: env.lt, w0: 10, w1: 3 });
    if (wet > 0) {                                             // wet leaves read darker and richer on the tea
      ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.3 * wet;
      MF.drawShoot(ctx, sh, 99, { from: MF.FLUSH_CUT, w0: 10, w1: 3 });
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }
  // wet-in-wet liquor: clear water, then gold blooms out from the leaves and settles with depth, a meniscus and the
  // morning window on the water
  function liquor(ctx, env, P) {
    const lt = env.lt, bs = env.beatSec, land = at(env, 1.5);
    const k = land > 0 ? Ease.outQuint(clamp(land / (1.8 * bs))) : 0, deepen = Ease.outC(rm(lt, 12 * bs, 14 * bs));
    const lp = rimPath(RL, 4, 2);
    ctx.save(); ctx.clip(lp);
    ctx.fillStyle = radial(ctx, CX - RL * 0.3, CY - RL * 0.35, 10, RL * 1.45, [[0, '#F7F6EC'], [1, '#D5DCC8']]);
    ctx.fillRect(CX - RL, CY - RL, RL * 2, RL * 2);
    if (k > 0) {
      const teaL = mix(P.liquor, '#F4EDC4', 0.62), teaD = mix(mix(P.liquor, P.accent2, 0.35), P.stem, 0.06 + 0.16 * deepen), r = lerp(12, RL * 1.85, k);
      const blob = MF.washPath(LAND[0] + 8, LAND[1], r, 13, 0.3, { amp: 0.22, fringe: 0.07 });
      ctx.save(); ctx.clip(blob); ctx.globalAlpha = 0.86;
      ctx.fillStyle = radial(ctx, CX - RL * 0.38, CY - RL * 0.42, 0, RL * 1.6, [[0, teaL], [0.55, mix(teaL, teaD, 0.55)], [1, teaD]]);
      ctx.fillRect(CX - RL, CY - RL, RL * 2, RL * 2);
      ctx.globalAlpha = 1; ctx.filter = 'blur(4px)'; ctx.lineWidth = 14; ctx.strokeStyle = rgba(teaD, 0.55 * (1 - 0.75 * k)); ctx.stroke(blob);
      ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.12 * k; ctx.fillStyle = ctx.createPattern(MF.grainTile(), 'repeat'); ctx.fillRect(CX - RL, CY - RL, RL * 2, RL * 2); ctx.restore();
      ctx.save(); ctx.filter = 'blur(9px)'; ctx.lineWidth = 26; ctx.strokeStyle = rgba(teaD, 0.4 * k); ctx.stroke(lp); ctx.restore();
    }
    // rings: when the flush lands, and one gentle ring on each bar of the hold
    const ring = (dt, a0) => {
      for (let j = 0; j < 3; j++) {
        const q = (dt - j * 0.16) / 1.5;
        if (q <= 0 || q >= 1) continue;
        const rr = 20 + (RL * 1.1 - j * 30) * Ease.outC(q), a = a0 * Math.pow(1 - q, 1.5);
        ctx.strokeStyle = rgba('#FFFFFF', 0.75 * a); ctx.lineWidth = 2.4 * (1 - q) + 0.8; circle(ctx, LAND[0], LAND[1], rr); ctx.stroke();
        ctx.strokeStyle = rgba(mix(P.liquor, P.stem, 0.55), 0.4 * a); ctx.lineWidth = 1.1; circle(ctx, LAND[0] + 1.5, LAND[1] + 2.5, rr * 0.985); ctx.stroke();
      }
    };
    if (land > 0) ring(land, 1);
    onBars(env, 1, (i, dt) => ring(dt, 0.5));
    // first light on the water: the window, and a bright arc along the wall nearest the light
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    softBlob(ctx, CX - RL * 0.44 + Math.sin(lt * 0.5) * 4, CY - RL * 0.44, RL * 0.34, '#FFF7E2', 0.6 + 0.08 * Math.sin(lt * 0.9));
    ctx.filter = 'blur(1.5px)'; ctx.strokeStyle = rgba('#FFFFFF', 0.55 + 0.1 * Math.sin(lt * 0.7)); ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(CX, CY, RL - 12, Math.PI * 1.08, Math.PI * 1.42); ctx.stroke();
    ctx.restore();
    ctx.restore();
  }
  // steam: veils rising off the tea and curling away up-left, a continuous flow (pure in t); bright over the tea
  function steam(ctx, env, a0) {
    if (a0 <= 0.003) return;
    const t = env.lt;
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (let w = 0; w < 5; w++) {
      const bx = CX - 80 + w * 44, by = CY + 60 - (w % 3) * 50, life = 3.6 + w * 0.45, n = 26;
      for (let j = 0; j < n; j++) {
        const age = ((t * 0.85 + j * (life / n) + w * 1.37) % life + life) % life, u = age / life;
        const x = bx - age * 34 + Math.sin(age * 1.4 + w * 2) * 30 * u + (MF.vnoise(age * 0.9, w * 3, 5) - 0.5) * 60 * u;
        const y = by - age * 78;
        softBlob(ctx, x, y, 20 + 64 * u, '#FFFDF4', a0 * Math.sin(Math.PI * u) * (0.11 + 0.05 * Math.sin(w + age * 2)));
      }
    }
    ctx.restore();
  }
  SCENES['steep'] = {
    draw(ctx, t, env) {
      const P = env.palette, lt = env.lt, bs = env.beatSec, ph = env.phase;
      MF.paper(ctx, 'oat');
      MF.light(ctx, lt, { a: 0.075, sun: [1560, 110, 760], sunA: 0.13 });
      // the cup comes into focus beneath the falling flush
      const cupK = Ease.outC(rm(lt, 0.25 * bs, 1.35 * bs)), blur = (1 - cupK) * 9;
      if (cupK > 0) {
        ctx.save(); ctx.globalAlpha = cupK; if (blur > 0.3) ctx.filter = `blur(${blur.toFixed(2)}px)`;
        ctx.drawImage(cupSprite(), 0, 0);
        ctx.restore();
        ctx.save(); ctx.globalAlpha = cupK; if (blur > 0.3) ctx.filter = `blur(${blur.toFixed(2)}px)`;
        liquor(ctx, env, P);
        ctx.restore();
      }
      const pose = flushPose(env), wet = pose.landed > 0 ? Ease.outC(clamp(pose.landed / 0.4)) : 0;
      drawFlush(ctx, env, pose, wet);
      steam(ctx, env, Ease.outC(rm(lt, 1.8 * bs, 3.2 * bs)));
      MF.motes(ctx, lt + 3, { n: 18, a: 0.75 * Ease.outC(rm(lt, 0.3, 1.5)) });
      // type
      MF.label(ctx, 'Green tea · spring first flush', 128, 404, at(env, 0.75), { size: 21, color: P.accent });
      MF.inkText(ctx, 'A cup at', 122, 522, at(env, 1), { size: 112, color: P.ink });
      MF.inkText(ctx, 'first light.', 122, 642, at(env, 1.25), { size: 112, color: P.accent });
      // hold, 30 cut: the subline on the first bar line, the steeping notes one per beat on the second
      onBars(env, 1, (i, dt) => {
        if (i !== 0) return;
        const lines = ['We pick only the bud and the two young', 'leaves below it.'];
        lines.forEach((ln, j) => MF.softReveal(ctx, ln, 128, 736 + j * 44, rm(dt, j * 0.18, j * 0.18 + 1.1), { size: 32, color: P.ink2 }));
      });
      onBars(env, 1, (i, dt) => {
        if (i !== 1) return;
        [['80 °C', 'water, just off the boil'], ['3 min', 'then pour it all'], ['2 g', 'to a small cup']].forEach(([num, cap], j) => {
          const x = 128 + j * 236, d = dt - j * bs;
          if (d < -0.05) return;
          const rp = Ease.outQuint(rm(d, -0.05, 0.5));
          ctx.fillStyle = rgba(P.accent, 0.5); ctx.fillRect(x, 838, 196 * rp, 1.5);
          MF.inkText(ctx, num, x - 2, 902, d, { size: 58, color: P.accent, stagger: 0.03, dur: 0.6 });
          MF.softReveal(ctx, cap, x, 940, rm(d, 0.15, 0.9), { size: 20, fam: 'sans', weight: 400, color: P.ink2 });
        });
      });
      // out: dusk floods in from every edge; the post darkens with it
      if (ph.out > 0) {
        MF.flood(ctx, ph.out, { x: CX, y: CY, seed: 5 });
        env.fx.dark = Ease.ioQ(ph.out);
      }
    },
  };
})();
