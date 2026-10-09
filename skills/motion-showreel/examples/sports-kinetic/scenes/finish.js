// finish (end card; 3 bars in the short cut, 5 in the 30): a hard cut from the Signal field back to Track Black on the
// final downbeat. The finish card of the app (source/app/race-card.html, screen 2) lands as broadcast type: 3:12:58
// slams (beat 0), NEGATIVE SPLIT −2:02 plates in (beat 1), and BIB 2417's 42 splits draw on as bars (beats 1.5-3.5;
// height = pace per km from the CSV, the orange line = the 4:37 plan; the nine bridges are the tall bars). On the bar
// line (beat 4) the result leaves to the left and the logo lands: three race stripes in front of VELMORA 42 ("42" in
// Signal Orange), then the README's lead line one sentence per half beat, the subtitle, and the opening date
// (beat 7). On every bar line of the hold a second set of race stripes runs through the lockup. Speed lines slow down
// after the finish but never stop.
(() => {
  SCENES['finish'] = {
    draw(ctx, t, env) {
      const P = env.palette, K = window.V42, b = env.beatSec, lt = env.lt, S = K.splits();
      const at = (n) => lt - n * b;
      const outStart = env.dur - env.outSec;

      ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
      // speed lines: full stream at the finish, settling to a slow drift over two beats (never stopping)
      const slow = lerp(1, 0.18, Ease.outC(clamp(lt / (2 * b))));
      K.speedLines(ctx, lt * slow + 0.3 * lt, { color: P.ink, alpha: lerp(0.7, 0.35, Ease.outC(clamp(lt / (2 * b)))), seed: 41, n: 26 });

      // ── the result (beats 0-3), leaving to the left on the bar line
      const away = Ease.inExpo(clamp(at(3.8) / 0.24));
      if (S && away < 1) {
        ctx.save();
        ctx.translate(-away * 2100, 0);
        // kicker (finish card)
        const ke = Ease.outExpo(clamp(at(0.25) / 0.35));
        if (at(0.25) > 0) {
          ctx.save(); ctx.beginPath(); ctx.rect(80, 100, 1200, 60); ctx.clip();
          K.plate(ctx, 96 + (1 - ke) * 300, 150, 14, 40); ctx.fillStyle = P.accent; ctx.fill();
          text(ctx, 'BIB 2417 · 42.195 KM · SUN 18 APR 2027', 136 + (1 - ke) * 300, 146, { size: 32, weight: K.LABEL, fam: 'display', color: P.ink2, ls: 32 * 0.12 });
          ctx.restore();
        }
        // 3:12:58
        const fin = S[S.length - 1];
        K.slam(ctx, at(0), 96, 452, (g) => K.tab(g, fin.elapsed, 0, 0, { size: 380, weight: K.BLACK, color: P.ink, ls: -6 }), { from: 1.6, dx: 260 });
        // NEGATIVE SPLIT −2:02 (beat 1), enters from the right
        const pe = Ease.outExpo(clamp(at(1) / 0.32));
        if (at(1) > 0) {
          const px = lerp(W + 100, 96, pe), lab = 'NEGATIVE SPLIT ' + fin.vs_plan;
          const tw = measure(ctx, lab, { size: 64, weight: K.BLACK, fam: 'display' });
          K.plate(ctx, px, 590, tw + 76, 96); ctx.fillStyle = P.accent; ctx.fill();
          text(ctx, lab, px + 96 * K.LEAN + 36, 566, { size: 64, weight: K.BLACK, fam: 'display', color: P.onAccent });
          // halves (finish card), right of the plate
          const he = Ease.outExpo(clamp(at(1.5) / 0.3));
          if (at(1.5) > 0) {
            const hx = px + tw + 140;
            [['FIRST HALF', '1:37:30'], ['SECOND HALF', '1:35:28']].forEach(([l, v], i) => {
              const x = hx + i * 330 + (1 - he) * 200;
              text(ctx, l, x, 532, { size: 22, weight: K.LABEL, fam: 'display', color: P.muted, ls: 22 * 0.12 });
              K.tab(ctx, v, x, 590, { size: 58, weight: K.XBOLD, color: i ? P.ink : P.ink2 });
            });
          }
        }
        // 42 splits as bars (finish card): pace per km, slower = taller; the orange line is the 4:37 plan
        const X0 = 96, X1 = 1824, Y0 = 968, CH = 230, gap = 8, n = S.length, bw = (X1 - X0 - gap * (n - 1)) / n;
        const lo = 255, hi = 290, pace = (r) => { const [mm, ss] = r.pace_per_km.split(':'); return +mm * 60 + +ss; };
        const plan = 11700 / 42.195;
        for (let i = 0; i < n; i++) {
          const g = Ease.outExpo(clamp((at(1.5) - (i * 2 * b) / n) / 0.16));
          if (g <= 0) continue;
          const h = Math.max(8, ((pace(S[i]) - lo) / (hi - lo)) * CH) * g;
          ctx.fillStyle = S[i].course && S[i].course.startsWith('Bridge') ? P.ink : P.ink2;
          ctx.fillRect(X0 + i * (bw + gap), Y0 - h, bw, h);
        }
        const pl = Ease.outExpo(clamp(at(3) / 0.3));
        if (pl > 0) {
          const py = Y0 - ((plan - lo) / (hi - lo)) * CH;
          ctx.fillStyle = P.accent; ctx.fillRect(X0, py - 2, (X1 - X0) * pl, 5);
          text(ctx, 'PLAN 4:37 /KM', X0 + (X1 - X0) * pl, py - 14, { size: 22, weight: K.LABEL, fam: 'display', color: P.accent, ls: 22 * 0.12, align: 'right', alpha: rm(pl, 0.6, 1) });
        }
        if (at(1.5) > 0) {
          text(ctx, 'KM 1', X0, Y0 + 34, { size: 20, weight: K.LABEL, fam: 'display', color: P.muted, ls: 20 * 0.12 });
          text(ctx, 'FINISH', X1, Y0 + 34, { size: 20, weight: K.LABEL, fam: 'display', color: P.muted, ls: 20 * 0.12, align: 'right' });
        }
        ctx.restore();
        K.impact(env, at(0), { shake: 24, zoom: 0.04 });
      }

      // ── the logo (beat 4): three race stripes in front of VELMORA 42
      const LS = 230, LY = 520;
      const wv = measure(ctx, 'VELMORA ', { size: LS, weight: K.BLACK, fam: 'display', ls: -4 });
      const w42 = measure(ctx, '42', { size: LS, weight: K.BLACK, fam: 'display', ls: -4 });
      const SW = 44, SG = 22, sh = LS * 0.72, stripesW = 3 * SW + 2 * SG + sh * K.LEAN;
      const total = stripesW + 34 + wv + w42, LX = (W - total) / 2;
      const lg = at(4);
      if (lg > -0.15) {
        // stripes sweep in from the right, one after another, and land on beat 4
        const cols = [P.accent, P.accent2, P.accent], cols2 = cols;
        for (let i = 0; i < 3; i++) {
          const s = lg + 0.04 * (2 - i), e = Ease.outExpo(clamp((s + 0.15) / 0.3));
          const x = lerp(W + 300 + i * 120, LX + i * (SW + SG), e);
          K.plate(ctx, x, LY, SW, sh); ctx.fillStyle = cols[i]; ctx.fill();
        }
        const word = (g) => {
          text(g, 'VELMORA', 0, 0, { size: LS, weight: K.BLACK, fam: 'display', color: P.ink, ls: -4 });
          text(g, '42', wv, 0, { size: LS, weight: K.BLACK, fam: 'display', color: P.accent, ls: -4 });
        };
        K.slam(ctx, lg, LX + stripesW + 34, LY, word, { from: 1.5, dx: 300 });
        K.impact(env, lg, { shake: 20, zoom: 0.03 });

        // README lead line, one sentence per half beat (beats 5-6.5); "42" in Signal Orange
        const SL = ['42 KILOMETRES.', '42 TIMING MATS.', '42 SPLITS.', 'LIVE.'], SS = 58, SY = 650;
        const sp = measure(ctx, ' ', { size: SS, weight: K.BLACK, fam: 'display' }) * 1.4;
        const ws = SL.map((s) => measure(ctx, s, { size: SS, weight: K.BLACK, fam: 'display' }));
        let x = (W - (ws.reduce((a, c) => a + c, 0) + sp * (SL.length - 1))) / 2;
        SL.forEach((s, i) => {
          const tl = at(5 + 0.5 * i), xi = x;
          K.slam(ctx, tl, xi, SY, (g) => {
            if (s.startsWith('42 ')) {
              text(g, '42', 0, 0, { size: SS, weight: K.BLACK, fam: 'display', color: P.accent });
              text(g, s.slice(2), measure(g, '42', { size: SS, weight: K.BLACK, fam: 'display' }), 0, { size: SS, weight: K.BLACK, fam: 'display', color: P.ink });
            } else text(g, s, 0, 0, { size: SS, weight: K.BLACK, fam: 'display', color: P.ink });
          }, { from: 1.6, dx: 120, approach: 0.1 });
          K.impact(env, tl, { shake: 5 });
          x += ws[i] + sp;
        });
        // subtitle (beat 6.75) and the opening date (beat 7)
        const st = clamp(at(6.75) / 0.3);
        if (st > 0) {
          ctx.save(); ctx.beginPath(); ctx.rect(0, 690, W, 60); ctx.clip();
          text(ctx, 'The official race app of the Velmora City Marathon.', W / 2, 734 + (1 - Ease.outExpo(st)) * 50, { size: 34, weight: 500, fam: 'sans', color: P.ink2, align: 'center' });
          ctx.restore();
        }
        const op = at(7);
        if (op > -0.12) {
          const lab = 'OPENS MON 15 MAR 2027', ow = measure(ctx, lab, { size: 40, weight: K.LABEL, fam: 'display', ls: 40 * 0.12 }) + 60;
          K.slam(ctx, op, W / 2 - ow / 2 - 8, 866, (g) => {
            K.plate(g, 0, 0, ow, 66); g.fillStyle = P.accent; g.fill();
            text(g, lab, 66 * K.LEAN + ow / 2, -20, { size: 40, weight: K.LABEL, fam: 'display', color: P.onAccent, ls: 40 * 0.12, align: 'center' });
          }, { from: 1.4, dx: 160 });
          K.impact(env, op, { shake: 8 });
        }
        // hold: on every bar line (beat 8, 12, 16 ...) before the end, a second set of race stripes runs through the
        // lockup left to right, fastest half a beat after the line (= the whoosh cue, holdBar + 0.5, every 4)
        for (let k = 0; (8 + 4 * k) * b < outStart - 1e-6; k++) {
          for (let i = 0; i < 3; i++) {
            const q = clamp((at(8 + 4 * k + 0.5) + 0.21 - i * 0.035) / 0.42);
            if (q <= 0 || q >= 1) continue;
            const x = lerp(LX - 300, W + 160, Ease.ioC(q));
            K.plate(ctx, x + i * (SW + SG), LY + 24, SW, sh + 48); ctx.fillStyle = cols2[i]; ctx.fill();
          }
        }
        // disclaimer from the logo on (README / race card wording)
        text(ctx, 'Fictional race and app · demo data', W - 96, H - 40, { size: 20, weight: 500, fam: 'sans', color: P.muted, align: 'right', alpha: clamp(lg / 0.2) });
      }
    },
  };
})();
