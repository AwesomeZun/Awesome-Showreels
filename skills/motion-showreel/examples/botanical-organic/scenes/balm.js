// balm (dark): "A balm at dusk." Opens on steep's last frame (night paper alone). The camera tilts down onto a tea
// branch hanging from the top edge, its flower already open; an oat-enamel tin (true cylinder perspective, the label
// lettering wrapped round it) is inked and washed beneath it; a drop of gold oil swells in
// the flower's heart and lands in the tin on 2; the lid lowers and closes on 3 with the seal on top. Fireflies all
// through. Hold (30 cut): the subline, petals falling one per beat, the fireflies brighten together. Out: oat paper
// blooms out of the seal until it fills the frame (dawn).
(() => {
  const MF = window.MISTFOLD;
  const at = (env, b) => env.lt - b * env.beatSec;
  const DROP = [1330, 730];                                      // where the oil lands on the balm
  const BRANCH = {
    x: 1540, y: -40, heading: Math.PI / 2 + 0.42, n: 2, lens: [190, 150], bends: [0.18, 0.12], bendJit: 0.04, leafAng: 1.05, seed: 11, first: '+',
    sizes: [[250, 66, 'mature', 0.1], [210, 56, 'mature', -0.05]],
    sched: { front: [[0, 0], [0.75, 340]], leaves: [0.6, 0.95] },
  };
  // ── the tin, in real perspective: a cylinder seen from slightly above. The eye sits above the tin, so every
  //    horizontal circle is an ellipse whose squash k(y) grows with depth below the eye (top 0.30, base 0.36);
  //    body, lid, label band and lettering all use the same k(y), so their curves agree.
  const TX = 1360, TOP = 712, TR = 188, TH = 178, BOT = TOP + TH;
  const kAt = (y) => 0.30 + 0.06 * (y - TOP) / TH;              // ellipse squash at height y
  const ell = (ctx, y, r, a0, a1, ccw = false) => ctx.ellipse(TX, y, r, r * kAt(y), 0, a0, a1, ccw);
  const LR = TR + 7, LH = 40, LID_CLOSED = TOP - 14;              // lid radius, skirt height, lid top when closed
  const BAND = [TOP + 58, TOP + 146];                             // label band (centre-line heights)
  const enamel = '#ECE4CF', enamelL = '#F8F3E6', enamelD = '#B6AB90', enamelDD = '#8E846C';
  // horizontal shading of a cylinder lit from the upper left, with a warm rim from the dusk glow on the right
  const cylFill = (ctx, x0, x1, base) => linear(ctx, x0, 0, x1, 0, [[0, mix(base, enamelDD, 0.55)], [0.12, mix(base, enamelD, 0.5)], [0.3, mix(base, enamelL, 0.6)], [0.38, enamelL], [0.55, base], [0.86, mix(base, enamelD, 0.55)], [0.95, mix(base, '#7A6448', 0.5)], [1, mix(base, '#E9B07A', 0.35)]]);
  // the tin's silhouette as one polyline (for the inked draw-on)
  const SIL = (() => {
    const pts = [], e = (y, a) => [TX + Math.cos(a) * TR, y + Math.sin(a) * TR * kAt(y)];
    for (let i = 0; i <= 64; i++) pts.push(e(TOP, Math.PI + (i / 64) * Math.PI));
    for (let i = 0; i <= 64; i++) pts.push(e(TOP, (i / 64) * Math.PI));
    pts.push([TX - TR, TOP]); pts.push([TX - TR, BOT]);
    for (let i = 0; i <= 64; i++) pts.push(e(BOT, Math.PI - (i / 64) * Math.PI));
    pts.push([TX + TR, TOP]);
    return pts;
  })();
  const SIL_LEN = SIL.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - SIL[i - 1][0], p[1] - SIL[i - 1][1]) : 0), 0);
  // the band between two heights, front half only (a closed path)
  function bandPath(ctx, y0, y1, r = TR) {
    ctx.beginPath(); ell(ctx, y0, r, Math.PI, 0, true); ctx.lineTo(TX + r, y1); ell(ctx, y1, r, 0, Math.PI, false); ctx.closePath();
  }
  // text wrapped around the cylinder at centre-line height y: each glyph sits at its arc position, foreshortened
  // by cos(theta) and sheared along the ellipse tangent, fading towards the edges
  function wrapText(ctx, str, y, size, weight, ls, col, a) {
    ctx.save();
    ctx.font = `${weight} ${size}px ${FAM.sans}`; ctx.letterSpacing = '0px'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = col;
    const chars = [...str], ws = chars.map(c => ctx.measureText(c).width), total = ws.reduce((x, w) => x + w, 0) + ls * (chars.length - 1);
    const k = kAt(y);
    let s0 = -total / 2;
    chars.forEach((ch, i) => {
      const sc = s0 + ws[i] / 2, th = sc / TR;                    // arc length -> angle from the front
      s0 += ws[i] + ls;
      if (ch === ' ' || Math.abs(th) > 1.35) return;
      const c = Math.cos(th), sn = Math.sin(th);
      const x = TX + TR * sn, yy = y + k * TR * c;
      ctx.save();
      ctx.globalAlpha *= a * clamp(0.35 + 0.75 * c);
      ctx.transform(c, -k * sn, 0, 1, x, yy);
      ctx.fillText(ch, -ws[i] / 2, 0);
      ctx.restore();
    });
    ctx.restore();
  }
  function tinBody(ctx, P, wash, open) {
    ctx.save(); ctx.globalAlpha *= wash;
    // contact shadow and a soft cast shadow away from the glow
    ctx.save(); ctx.filter = 'blur(24px)'; ctx.fillStyle = rgba('#050805', 0.5); ctx.beginPath(); ctx.ellipse(TX - 30, BOT + 22, TR * 1.15, TR * kAt(BOT) * 1.25, 0, 0, TAU); ctx.fill(); ctx.restore();
    ctx.save(); ctx.filter = 'blur(6px)'; ctx.fillStyle = rgba('#050805', 0.55); ctx.beginPath(); ell(ctx, BOT + 4, TR * 1.01, 0, TAU); ctx.fill(); ctx.restore();
    // body
    ctx.beginPath(); ctx.moveTo(TX - TR, TOP); ctx.lineTo(TX - TR, BOT); ell(ctx, BOT, TR, Math.PI, 0, true); ctx.lineTo(TX + TR, TOP); ell(ctx, TOP, TR, 0, Math.PI, false); ctx.closePath();
    const body = new Path2D(); body.moveTo(TX - TR, TOP); body.lineTo(TX - TR, BOT); body.ellipse(TX, BOT, TR, TR * kAt(BOT), 0, Math.PI, 0, true); body.lineTo(TX + TR, TOP); body.ellipse(TX, TOP, TR, TR * kAt(TOP), 0, 0, Math.PI, false); body.closePath();
    ctx.fillStyle = cylFill(ctx, TX - TR, TX + TR, enamel); ctx.fill(body);
    ctx.save(); ctx.clip(body);
    // the label: a paper band in terracotta, printed rules top and bottom, the wordmark wrapped on it
    bandPath(ctx, BAND[0], BAND[1], TR + 1);
    ctx.fillStyle = cylFill(ctx, TX - TR, TX + TR, mix(P.accent3, '#E9A27E', 0.25)); ctx.fill();
    ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.22; ctx.fillStyle = ctx.createPattern(MF.grainTile(), 'repeat'); ctx.fill();
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    for (const [y, w] of [[BAND[0] + 9, 1], [BAND[1] - 9, 1]]) { ctx.beginPath(); ell(ctx, y, TR, Math.PI * 0.04, Math.PI * 0.96); ctx.strokeStyle = rgba(P.bg, 0.55); ctx.lineWidth = w; ctx.stroke(); }
    // a soft specular streak down the enamel (upper left light) and a darker foot ring
    ctx.save(); ctx.filter = 'blur(10px)'; ctx.fillStyle = rgba('#FFFFFF', 0.28); ctx.fillRect(TX - TR * 0.62, TOP - 10, TR * 0.16, TH + 80); ctx.restore();
    ctx.beginPath(); ell(ctx, BOT - 14, TR, Math.PI * 0.02, Math.PI * 0.98); ctx.strokeStyle = rgba(enamelDD, 0.5); ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
    // the lettering (on the label, below the closed lid's skirt)
    wrapText(ctx, 'MISTFOLD', BAND[0] + 26, 15, 600, 5, rgba(P.bg, 0.85), 1);
    wrapText(ctx, 'DUSK BALM', BAND[0] + 58, 31, 600, 6, '#2A2019', 1);
    wrapText(ctx, 'TEA SEED OIL · 50 ML', BAND[0] + 80, 13, 600, 3.2, rgba('#2A2019', 0.8), 1);
    // the open top: the rolled lip, the inner wall in shade, the balm surface a little below the lip
    if (open > 0) {
      ctx.save(); ctx.globalAlpha *= open;
      ctx.beginPath(); ell(ctx, TOP, TR, 0, TAU); ctx.fillStyle = mix(enamelD, '#3A3326', 0.35); ctx.fill();
      const SY = TOP + 16, SR = TR - 9;
      ctx.save(); ctx.beginPath(); ell(ctx, TOP, TR - 3, 0, TAU); ctx.clip();
      ctx.beginPath(); ell(ctx, SY, SR, 0, TAU);
      ctx.fillStyle = radial(ctx, TX - 50, SY - 10, 4, TR, [[0, '#FFF0C4'], [0.55, mix('#EFD9A0', P.liquor, 0.3)], [1, mix(P.liquor, '#5E4E24', 0.35)]]); ctx.fill();
      ctx.beginPath(); ell(ctx, SY, SR * 0.55, Math.PI * 1.1, Math.PI * 1.75); ctx.strokeStyle = rgba('#FFF8E0', 0.5); ctx.lineWidth = 2; ctx.stroke();   // a swirl from the pour
      ctx.restore();
      ctx.restore();
    }
    ctx.beginPath(); ell(ctx, TOP, TR, 0, TAU); ctx.strokeStyle = rgba(enamelL, 0.9); ctx.lineWidth = 3; ctx.stroke();       // the rolled lip catches the light
    ctx.restore();
  }
  function tinInk(ctx, P, p) {
    if (p <= 0) return;
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.setLineDash([SIL_LEN * p, SIL_LEN + 10]); ctx.strokeStyle = rgba('#0B1009', 0.8); ctx.lineWidth = 1.8;
    ctx.beginPath(); SIL.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
    ctx.restore();
  }
  // the lid at top height y: a short skirt (same perspective as the body) and a gently domed top with the seal
  function lid(ctx, P, y, a) {
    if (a <= 0.003) return;
    ctx.save(); ctx.globalAlpha *= a;
    const gap = LID_CLOSED - y;
    if (gap > 2) { ctx.save(); ctx.filter = `blur(${(8 + gap * 0.05).toFixed(1)}px)`; ctx.fillStyle = rgba('#050805', 0.4 * clamp(1 - gap / 260)); ctx.beginPath(); ell(ctx, TOP + 4, LR, 0, TAU); ctx.fill(); ctx.restore(); }
    const yb = y + LH;
    const sk = new Path2D(); sk.moveTo(TX - LR, y); sk.lineTo(TX - LR, yb); sk.ellipse(TX, yb, LR, LR * kAt(yb), 0, Math.PI, 0, true); sk.lineTo(TX + LR, y); sk.ellipse(TX, y, LR, LR * kAt(y), 0, 0, Math.PI, false); sk.closePath();
    ctx.fillStyle = cylFill(ctx, TX - LR, TX + LR, enamel); ctx.fill(sk);
    ctx.save(); ctx.clip(sk); ctx.beginPath(); ctx.ellipse(TX, yb - 3, LR, LR * kAt(yb), 0, Math.PI * 0.02, Math.PI * 0.98); ctx.strokeStyle = rgba(enamelDD, 0.6); ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    ctx.strokeStyle = rgba('#0B1009', 0.75); ctx.lineWidth = 1.6; ctx.stroke(sk);
    // top: domed (lighter toward the upper-left light), a fine bevel ring at the edge
    const kt = kAt(y);
    ctx.beginPath(); ctx.ellipse(TX, y, LR, LR * kt, 0, 0, TAU);
    ctx.fillStyle = radial(ctx, TX - LR * 0.35, y - LR * kt * 0.5, 8, LR * 1.25, [[0, '#FCF8EC'], [0.6, '#EEE6D2'], [1, '#D4C9AE']]); ctx.fill();
    ctx.strokeStyle = rgba('#0B1009', 0.75); ctx.lineWidth = 1.6; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(TX, y, LR - 10, (LR - 10) * kt, 0, 0, TAU); ctx.strokeStyle = rgba(enamelD, 0.55); ctx.lineWidth = 1.2; ctx.stroke();
    // the seal printed on the top, projected with the same squash and kept inside the bevel
    ctx.save(); ctx.beginPath(); ctx.ellipse(TX, y, LR - 14, (LR - 14) * kt, 0, 0, TAU); ctx.clip();
    MF.seal(ctx, TX, y, LR * 0.58, { col: P.accent3, sy: kt, a: 0.92, multiply: true });
    ctx.restore();
    ctx.restore();
  }
  SCENES['balm'] = {
    draw(ctx, t, env) {
      const P = env.palette, lt = env.lt, bs = env.beatSec, ph = env.phase, T = lt / bs;
      MF.paper(ctx, 'night');
      MF.hills(ctx, env.lt, { night: true, a: Ease.outC(rm(env.lt, 0, 1.0)), y0: 700 });
      // a low glow behind the tin, the dusk still warm at the bottom of the sky
      softBlob(ctx, TX, TOP + 60, 520, mix(P.accent3, P.bg, 0.55), 0.22 * Ease.outC(rm(lt, 0, 2 * bs)) * (1 + 0.06 * Math.sin(lt * 0.8)));
      // the branch from the top edge; the flower at its tip
      // nothing grows: the branch hangs there already, flower open; the camera tilts down onto it (it slides in
      // from above with a little parallax lag) and it swings once, gently, as it settles
      const tilt = Ease.outQuint(rm(T, 0, 1.4)), dy = (1 - tilt) * -260, swing = 0.05 * wob(lt - 0.3, 0.45, 1.6);
      const sh = MF.shoot(BRANCH);
      ctx.save(); ctx.translate(BRANCH.x, BRANCH.y + dy); ctx.rotate(swing); ctx.translate(-BRANCH.x, -BRANCH.y);
      const out = MF.drawShoot(ctx, sh, 99, { night: true, sway: 0.022, t: lt, w0: 9, w1: 4 });
      const tip = MF.at(out.pts, out.front);
      MF.flower(ctx, tip[0] - 6, tip[1] + 20, 1, { r: 78, rot: 0.5, night: true, t: lt, sy: 0.86 });
      ctx.restore();
      // the flower's heart in screen space (for the oil drop): the same transform applied by hand
      const hx = tip[0] - 6 - BRANCH.x, hy = tip[1] + 20 - BRANCH.y;
      const FX = BRANCH.x + hx * Math.cos(swing) - hy * Math.sin(swing), FY = BRANCH.y + dy + hx * Math.sin(swing) + hy * Math.cos(swing);
      // the tin: ink first, then the wash fills it
      const inkP = Ease.ioC(rm(T, 0.5, 1.4)), wash = Ease.outC(rm(T, 0.95, 1.7));
      const lk = rm(T, 2.2, 3.0), ly = lerp(LID_CLOSED - 240, LID_CLOSED, Ease.outQuint(lk));
      tinBody(ctx, P, wash, lk < 1 ? 1 : 0);
      tinInk(ctx, P, inkP);
      // the oil: swells in the flower's heart (1.25), falls (1.6), lands in the tin on 2
      const sw = rm(T, 1.25, 1.6), fall = rm(T, 1.6, 2.0), landed = at(env, 2);
      if (sw > 0 && landed < 0) {
        const ef = Ease.inQ(fall), fx = lerp(FX, DROP[0], ef), fy = lerp(FY, DROP[1], ef), r = lerp(3, 11, Ease.outC(sw)) * (1 - 0.1 * fall);
        ctx.save(); ctx.globalCompositeOperation = 'screen'; softBlob(ctx, fx, fy, r * 4, P.liquor, 0.35); ctx.restore();
        ctx.beginPath(); ctx.ellipse(fx, fy, r * (1 - 0.2 * fall), r * (1 + 0.35 * fall), 0, 0, TAU);
        ctx.fillStyle = radial(ctx, fx - r * 0.3, fy - r * 0.3, 1, r * 1.3, [[0, '#FFF3C4'], [1, P.liquor]]); ctx.fill();
      }
      if (landed > 0 && landed < 1.6 && lk < 1) {
        ctx.save(); ctx.beginPath(); ctx.ellipse(TX, TOP + 16, TR - 10, (TR - 10) * kAt(TOP + 16), 0, 0, TAU); ctx.clip();   // rings stay on the balm
        for (let j = 0; j < 3; j++) {
          const q = (landed - j * 0.15) / 1.2; if (q <= 0 || q >= 1) continue;
          const rr = 8 + 150 * Ease.outC(q);
          ctx.strokeStyle = rgba('#FFF3C4', 0.7 * Math.pow(1 - q, 1.5)); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(DROP[0], DROP[1], rr, rr * kAt(DROP[1]), 0, 0, TAU); ctx.stroke();
        }
        softBlob(ctx, DROP[0], DROP[1], 60, P.liquor, 0.5 * Math.exp(-landed * 2));
        ctx.restore();
      }
      // the lid lowers (2.2) and closes on 3, critically damped: no bounce
      lid(ctx, P, ly, Ease.outC(rm(T, 1.6, 2.4)));
      // petals: in the hold, one falls on every beat
      onBars(env, 1, (i, dt) => {
        for (let j = 0; j < 4; j++) {
          const d = dt - j * bs; if (d <= 0 || d > 3.2) continue;
          const sd = i * 4 + j, u = d / 3.2, x = FX + (hash(sd * 3.1) - 0.5) * 60 + Math.sin(d * 2 + sd) * 40 - d * 30, y = FY + d * 120 + d * d * 6;
          MF.petal(ctx, x, y, 34, d * 1.3 + sd, Ease.outC(clamp(d / 0.2)) * (1 - Ease.inQ(clamp((u - 0.7) / 0.3))), true);
        }
      });
      // fireflies, brighter together on the hold's second bar line
      let boost = 0;
      onBars(env, 1, (i, dt) => { if (i === 1) boost = 1.2 * Math.exp(-dt * 1.2) * Ease.outC(clamp(dt / 0.25)); });
      MF.fireflies(ctx, lt, { n: 18, a: Ease.outC(rm(lt, 0, 1.5 * bs)), boost });
      // type
      MF.label(ctx, 'Balm · tea seed oil, beeswax and shea', 128, 404, at(env, 0.5), { size: 21, color: P.accent });
      MF.inkText(ctx, 'A balm at', 122, 522, at(env, 0.75), { size: 112, color: P.ink });
      MF.inkText(ctx, 'dusk.', 122, 642, at(env, 1), { size: 112, color: P.accent3 });
      onBars(env, 1, (i, dt) => {
        if (i !== 0) return;
        ['Pressed from the seeds our bushes', 'set in autumn.'].forEach((ln, j) => MF.softReveal(ctx, ln, 128, 736 + j * 44, rm(dt, j * 0.18, j * 0.18 + 1.1), { size: 32, color: P.ink2 }));
      });
      // out: dawn, oat paper blooms out of the seal on the lid
      if (ph.out > 0) {
        MF.bloom(ctx, ph.out, { x: TX, y: LID_CLOSED, seed: 9, r0: TR * 0.5 });
        env.fx.dark = 1 - Ease.ioQ(ph.out);
      }
    },
  };
})();
