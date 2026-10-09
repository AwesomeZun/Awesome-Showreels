// splits (the product; 3 bars in the short cut, 8 in the 30): "EVERY KILOMETRE. LIVE." The stripe stinger from the
// gun finishes under a Track Black stage, the headline slams on beats 1 and 2, the phone with the app's live race card
// (drawn after source/app/race-card.html, same tokens) enters from the right, and from beat 4 one mat lands per beat:
// BIB 2417's real split for that kilometre (source/data/bib-2417-splits.csv, DEMO DATA) rolls into the giant KM, the
// elapsed clock and the vs-plan plate, slides into the phone's split list and moves the course bar forward, with a
// timing beep (cue: holdBeat, every beat). The hold is the race going on, one kilometre per beat: the short cut reaches
// KM 7, the 30 reaches KM 27, where the plate has passed KM 21 "ON PLAN" and turned orange (ahead); the plate punches
// on its beat whenever its meaning changes.
// The last beat is the first half of the next stinger: race stripes, then a Signal Orange field.
(() => {
  const STING_IN = (P) => ({ field: P.bg, lead: [[P.accent, 74], [P.accent2, 36], [P.accent, 36]], trail: [[P.accent, 18]] });
  const STING_OUT = (P) => ({ field: P.accent, lead: [[P.accent2, 40], [P.accent, 40]], trail: [[P.onAccent, 46], [P.accent2, 26]] });
  const FIRST = 4;                                              // KM 1 lands on beat 4
  const PH = { cx: 1452, cy: 540, w: 390, h: 844, bez: 13, rot: 0.05 };

  const sign = (r) => (r.vs_plan_s < 0 ? 'ahead' : r.vs_plan_s > 0 ? 'behind' : 'even');

  function phoneScreen(g, P, K, S, m, since, lt) {
    const r = m >= 1 ? S[m - 1] : null;
    g.fillStyle = P.bg; g.fillRect(0, 0, PH.w, PH.h);
    // header: wordmark + LIVE
    text(g, 'VELMORA', 20, 46, { size: 26, weight: K.BLACK, fam: 'display', color: P.ink, ls: -0.3 });
    const vw = measure(g, 'VELMORA ', { size: 26, weight: K.BLACK, fam: 'display', ls: -0.3 });
    text(g, '42', 20 + vw, 46, { size: 26, weight: K.BLACK, fam: 'display', color: P.accent });
    const blink = 0.55 + 0.45 * Math.cos(lt * 5.2);
    g.fillStyle = rgba(P.ok, blink); g.fillRect(320, 33, 8, 8);
    text(g, 'LIVE', 370, 42, { size: 12, weight: K.LABEL, fam: 'display', color: P.muted, align: 'right', ls: 1.5 });
    // stripes band (tokens.css .stripes: 14 px bars, 6 px gaps, orange / white), drifting left to right
    g.save(); g.beginPath(); g.rect(0, 62, PH.w, 18); g.clip();
    const off = (lt * 60) % 40;
    for (let x = -60; x < PH.w + 40; x += 40) {
      K.plate(g, x + off, 80, 14, 18); g.fillStyle = P.accent; g.fill();
      K.plate(g, x + off + 20, 80, 14, 18); g.fillStyle = P.accent2; g.fill();
    }
    g.restore();
    text(g, 'BIB 2417 · PLAN 3:15:00 · 4:37 /KM', 20, 118, { size: 12, weight: K.LABEL, fam: 'display', color: P.muted, ls: 1.4 });
    // clock: elapsed at the last mat (rolls on each mat)
    const prev = m >= 2 ? S[m - 2].elapsed : '0:00:00', now = r ? r.elapsed : '0:00:00';
    K.roll(g, prev, now, since / 0.14, 16, 214, { size: 96, weight: K.BLACK, color: P.ink, ls: -1 });
    // where
    text(g, r ? 'KM ' + m : 'START', 20, 250, { size: 22, weight: K.BOLDI, fam: 'display', color: P.ink });
    const ww = measure(g, r ? 'KM ' + m : 'START', { size: 22, weight: K.BOLDI, fam: 'display' });
    text(g, (r ? m : 0) + ' OF 42 SPLITS', 28 + ww, 250, { size: 14, weight: K.LABEL, fam: 'display', color: P.muted, ls: 1.6 });
    // plate
    if (r) {
      const s = sign(r), fill = s !== 'behind';
      K.plate(g, 20, 318, 210, 48);
      if (fill) { g.fillStyle = P.accent; g.fill(); } else { g.strokeStyle = P.ink; g.lineWidth = 2; g.stroke(); }
      text(g, r.vs_plan, 38, 356, { size: 38, weight: K.BLACK, fam: 'display', color: fill ? P.onAccent : P.ink });
      text(g, s === 'even' ? 'ON PLAN' : 'VS PLAN', 140, 352, { size: 13, weight: K.LABEL, fam: 'display', color: fill ? P.onAccent : P.ink2, ls: 1.5 });
    }
    // split list: newest on top in Signal Orange; the list slides down one row per mat
    const TY = 408, RH = 44;
    ['MAT', 'SPLIT', 'ELAPSED', 'VS PLAN'].forEach((h, i) => text(g, h, [20, 92, 160, 370][i], TY, { size: 11, weight: K.LABEL, fam: 'display', color: P.muted, ls: 1.3, align: i === 3 ? 'right' : 'left' }));
    g.fillStyle = P.line; g.fillRect(20, TY + 8, 350, 1);
    g.save(); g.beginPath(); g.rect(0, TY + 10, PH.w, RH * 5 + 2); g.clip();
    const slide = (1 - Ease.outExpo(clamp(since / 0.16))) * RH;
    for (let j = 0; j < 6; j++) {
      const idx = m - 1 - j;
      if (idx < 0) break;
      const row = S[idx], y = TY + 10 + RH * j - slide + 32, top = j === 0;
      const c = top ? P.accent : P.ink;
      text(g, row.mat, 20, y, { size: 18, weight: K.BOLDI, fam: 'display', color: c });
      K.tab(g, row.split, 92, y, { size: 22, weight: K.XBOLD, color: c });
      K.tab(g, row.elapsed, 160, y, { size: 22, weight: K.XBOLD, color: c });
      K.tab(g, row.vs_plan, 370, y, { size: 22, weight: K.XBOLD, color: top ? P.accent : row.vs_plan_s < 0 ? P.ahead : P.behind, align: 'right' });
      g.fillStyle = P.line; g.fillRect(20, y + 12, 350, 1);
    }
    g.restore();
    // next mat
    g.fillStyle = P.surface; g.fillRect(20, 650, 350, 50);
    text(g, 'NEXT MAT', 34, 680, { size: 12, weight: K.LABEL, fam: 'display', color: P.muted, ls: 1.5 });
    const nx = S[Math.min(m, S.length - 1)];
    const nxt = (nx.mat === 'FINISH' ? 'FINISH' : nx.mat) + (nx.course ? ' · ' + nx.course.toUpperCase() : '');
    text(g, nxt, 356, 684, { size: 20, weight: K.XBOLD, fam: 'display', color: P.ink, align: 'right' });
    text(g, 'Fictional race and app · demo data', 20, 826, { size: 11, weight: 500, fam: 'sans', color: P.muted });
  }

  function phone(ctx, P, K, S, m, since, lt, enter) {
    const x = lerp(W + 360, PH.cx, enter), rot = PH.rot + (1 - enter) * 0.12;
    const fw = PH.w + PH.bez * 2, fh = PH.h + PH.bez * 2;
    ctx.save();
    ctx.translate(x, PH.cy); ctx.rotate(rot);
    rr(ctx, -fw / 2, -fh / 2, fw, fh, 58); ctx.fillStyle = '#050505'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = P.line; ctx.stroke();
    ctx.save();
    rr(ctx, -PH.w / 2, -PH.h / 2, PH.w, PH.h, 46); ctx.clip();
    ctx.translate(-PH.w / 2, -PH.h / 2);
    phoneScreen(ctx, P, K, S, m, since, lt);
    ctx.restore();
    rr(ctx, -56, -fh / 2 + 22, 112, 30, 15); ctx.fillStyle = '#000000'; ctx.fill();   // camera island
    ctx.restore();
  }

  SCENES['splits'] = {
    draw(ctx, t, env) {
      const P = env.palette, K = window.V42, b = env.beatSec, lt = env.lt, S = K.splits();
      const at = (n) => lt - n * b;
      const outStart = env.dur - env.outSec;
      // mats landed so far: KM 1 on beat 4, one per beat, none during the out-phase (the hold cues fire on the same beats)
      const tm = Math.min(lt, outStart - 1e-6);
      const m = S ? clamp(Math.floor(tm / b + 1e-6) - (FIRST - 1), 0, S.length) : 0;
      const since = m >= 1 ? lt - (m + FIRST - 1) * b : 9;       // seconds since that mat landed

      ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
      // the gun's stinger finishes under the stage (its field is the same black)
      K.stinger(ctx, K.stingerIn(env, b), STING_IN(P));
      // speed lines: a steady stream with a surge on every mat
      const surge = m >= 1 ? Math.exp(-since * 7) : 0;
      K.speedLines(ctx, lt, { color: P.ink, alpha: 0.55 + 0.35 * surge, seed: 11, speed: 1 + 0.6 * surge, n: 30 });

      if (!S) return;
      const r = m >= 1 ? S[m - 1] : null, pr = m >= 2 ? S[m - 2] : null;

      // ── headline: EVERY KILOMETRE. (beat 1) LIVE. (beat 2)
      const HX = 96, HY = 300, HS = 100;
      K.slam(ctx, at(1), HX, HY, (g) => text(g, 'EVERY KILOMETRE.', 0, 0, { size: HS, weight: K.BLACK, fam: 'display', color: P.ink, ls: -1 }), { from: 1.5, dx: 180 });
      K.impact(env, at(1), { shake: 10 });
      const hw = measure(ctx, 'EVERY KILOMETRE. ', { size: HS, weight: K.BLACK, fam: 'display', ls: -1 });
      K.slam(ctx, at(2), HX + hw, HY, (g) => text(g, 'LIVE.', 0, 0, { size: HS, weight: K.BLACK, fam: 'display', color: P.accent, ls: -1 }), { from: 1.8, dx: 220 });
      K.impact(env, at(2), { shake: 12 });

      // ── kicker (beat 3): the runner and the plan (race card), DEMO DATA tag
      const ke = Ease.outExpo(clamp(at(3) / 0.35));
      if (at(3) > 0) {
        ctx.save(); ctx.beginPath(); ctx.rect(HX - 6, 140, 1100, 50); ctx.clip();
        const dx = (1 - ke) * 300;
        text(ctx, 'BIB 2417 · PLAN 3:15:00 · 4:37 /KM', HX + dx, 176, { size: 28, weight: K.LABEL, fam: 'display', color: P.ink2, ls: 28 * 0.12 });
        const tw = measure(ctx, 'BIB 2417 · PLAN 3:15:00 · 4:37 /KM', { size: 28, weight: K.LABEL, fam: 'display', ls: 28 * 0.12 });
        K.plate(ctx, HX + dx + tw + 26, 182, 168, 36); ctx.strokeStyle = P.muted; ctx.lineWidth = 2; ctx.stroke();
        text(ctx, 'DEMO DATA', HX + dx + tw + 26 + 36 * K.LEAN + 84, 172, { size: 20, weight: K.LABEL, fam: 'display', color: P.muted, ls: 20 * 0.12, align: 'center' });
        ctx.restore();
      }

      // ── phone with the app's live race card (enters from the right, half a beat after LIVE.)
      const pe = Ease.outExpo(clamp(at(2.5) / 0.5));
      if (at(2.5) > 0) phone(ctx, P, K, S, m, since, lt, pe);

      // ── the giant KM, the elapsed clock and the vs-plan plate (from KM 1 on beat 4)
      if (m >= 1) {
        const first = at(FIRST);
        const kmDraw = (g) => {
          text(g, 'KM', 0, 0, { size: 120, weight: K.XBOLD, fam: 'display', color: P.muted });
          K.roll(g, pr ? String(m - 1) : '', String(m), since / 0.13, 168, 0, { size: 340, weight: K.BLACK, color: P.ink, ls: -6 });
        };
        if (first < 0.3) K.slam(ctx, first, HX, 700, kmDraw, { from: 1.4, dx: 200 });
        else { ctx.save(); ctx.translate(HX, 700); kmDraw(ctx); ctx.restore(); }
        K.impact(env, first, { shake: 14 });
        // elapsed
        text(ctx, 'ELAPSED', HX, 768, { size: 22, weight: K.LABEL, fam: 'display', color: P.muted, ls: 22 * 0.12 });
        K.roll(ctx, pr ? pr.elapsed : '0:00:00', r.elapsed, since / 0.14, HX - 4, 862, { size: 104, weight: K.XBOLD, color: P.ink2, ls: -1 });
        // plate: behind = Bib White outline with +, ahead = Signal Orange with −, even = orange "ON PLAN"
        const s = sign(r), fill = s !== 'behind', PY = 972, PW = 430, PHh = 86;
        const flip = pr && sign(pr) !== s ? since : 9;          // the plate punches when its meaning changes (on its beep)
        const plateDraw = (g) => {
          K.plate(g, 0, 0, PW, PHh);
          if (fill) { g.fillStyle = P.accent; g.fill(); } else { g.strokeStyle = P.ink; g.lineWidth = 4; g.stroke(); }
          const col = fill ? P.onAccent : P.ink;
          K.roll(g, pr ? pr.vs_plan : '', r.vs_plan, since / 0.14, 26 + PHh * K.LEAN * 0.5, -18, { size: 72, weight: K.BLACK, color: col, ls: -1 });
          text(g, s === 'even' ? 'ON PLAN' : 'VS PLAN', PW - 20, -30, { size: 26, weight: K.LABEL, fam: 'display', color: col, ls: 26 * 0.12, align: 'right' });
        };
        const punch = flip < 0.3 ? 1 + 0.1 * Math.exp(-flip * 16) : 1;
        ctx.save(); ctx.translate(HX + PW / 2, PY - PHh / 2); ctx.scale(punch, punch); ctx.translate(-PW / 2, PHh / 2); plateDraw(ctx); ctx.restore();
      }

      // ── course bar: 42.195 km left to right along the bottom, the runner's plate moves one km per mat
      const cb = Ease.outExpo(clamp(at(3) / 0.5));
      if (cb > 0) {
        const X0 = 96, X1 = 1824, Y = 1040, km2x = (km) => lerp(X0, X1, km / 42.195);
        ctx.save();
        ctx.beginPath(); ctx.rect(0, Y - 30, lerp(X0, X1 + 40, cb), 60); ctx.clip();
        ctx.fillStyle = P.line; ctx.fillRect(X0, Y, X1 - X0, 3);
        for (let k = 0; k <= 42; k++) { const tall = k % 5 === 0; ctx.fillRect(km2x(k) - 1, Y - (tall ? 16 : 8), 2, tall ? 16 : 8); }
        const pos = m >= 1 ? lerp(m - 1, m, Ease.outExpo(clamp(since / 0.22))) : 0;
        ctx.fillStyle = P.accent; ctx.fillRect(X0, Y - 1, km2x(pos) - X0, 5);
        K.plate(ctx, km2x(pos) - 10, Y - 4, 20, 26); ctx.fill();
        ctx.restore();
      }

      // ── out-phase: race stripes and the Signal Orange field cover the frame (the slam scene starts on that orange)
      K.stinger(ctx, K.stingerOut(env, b), STING_OUT(P));
    },
  };
})();
