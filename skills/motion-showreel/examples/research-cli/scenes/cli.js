// cli (3 bars in the 15/30-s cuts, up to 5 in the 60-s cut): the REAL `spark-bench run` recording (tools/
// capture_cli.py -> assets/captures/term/run.cast) played by term.js in a window tilted in 3D (quad.js). One giant
// command word decodes on beat 1, the command types (enter on beat 3), the real output streams at its recorded pace,
// then the camera zooms to the result table and locks on the spark row. Hold (longer cuts): the camera tours the
// run's own provenance lines (fingerprint, warm-up, 60/60 repeats) and is back on the table before the out-phase.
// Playback options are constants (never fitted to env.dur), so typing and output run at the same speed in every cut.
// portal() hands the result table to the next scene (zoomInto).
(() => {
  const CAST = 'captures/term/run.cast';
  const B = 60 / 128;
  const ROW = /^spark\s+1\.3×/, SUM = /^▲ spark/, HEAD = /^kernel\s+4k/, FP = /^fingerprint\s/, REP = /^repeats\s/;
  let theme = null;

  function player() {
    if (!theme) {
      const T = STYLE.terminal || {};
      theme = T.ansi ? { bg: T.bg, fg: T.fg, ansi: T.ansi, cursor: C.accent, boldBright: false, titleBar: mix(T.bg, '#000000', 0.28) } : 'style';
    }
    return Term.get(CAST, {
      theme, fontSize: 20, lineHeight: 1.34, res: 2.6, title: 'spark-bench run', radius: 14, pad: [24, 16],
      chrome: { kind: 'mac', lights: 'mono' }, smoothScroll: 0.1,
      play: { at: 0.354, typing: { cps: 30, jitter: 0.3, before: 0.25, after: 0.3 }, idleLimit: 0.4 },
    });
  }

  // Hold tour (longer cuts): 0 on the table, 1 on the provenance lines; back on the table before the out-phase.
  function tourK(env, beat) {
    const ph = env && env.phase;
    if (!ph || ph.holdDur < 4 * beat) return 0;
    const h = ph.hold, hd = ph.holdDur;
    return Ease.ioC(rm(h, 0.25 * beat, 1.5 * beat)) * (1 - Ease.ioC(rm(h, hd - 1.75 * beat, hd - 0.5 * beat)));
  }
  // home pose: flies in from the right, then drifts; the zoom frames the result table (header -> summary)
  function poseAt(lt, pl, beat, env) {
    const fly = Ease.outExpo(rm(lt, 0.12, 0.12 + 1.1));
    const home = { x: 1215 - 9 * lt, y: 498 + 6 * Math.sin(lt * 0.9), s: 1.36, yaw: -0.34 + 0.018 * Math.sin(lt * 0.7), pitch: 0.07, roll: -0.016 };
    const base = Quad.lerpPose({ ...home, x: home.x + 760, yaw: -1.05, z: 520 }, home, fly);
    let pose = base;
    const zk = rm(lt, 7 * beat, 8.5 * beat), tk = tourK(env, beat);
    const h = pl.find(HEAD), s = pl.find(SUM);
    if (zk > 0 && h && s) {
      const b0 = pl.box(h.line, lt, { cols: [0, 62] }), b1 = pl.box(s.line, lt, { cols: [0, 62] });
      const creep = 1 + 0.014 * Math.max(0, lt - 8.5 * beat);          // slow push while the key line is read
      const opt = { width: 1450 * creep, x: W / 2 + 20, y: 452, keep: 0.42 };
      if (b0 && b1) pose = pl.zoomPose(base, [b0[0], b0[1], b1[2], b1[3]], zk, opt);
      const f = pl.find(FP), r = pl.find(REP);
      if (tk > 0 && f && r) {
        const p0 = pl.box(f.line, lt, { cols: [0, 62] }), p1 = pl.box(r.line, lt, { cols: [0, 62] });
        if (p0 && p1) pose = Quad.lerpPose(pose, pl.zoomPose(base, [p0[0], p0[1], p1[2], p1[3]], 1, opt), tk);
      }
    }
    return { pose, zk, tk };
  }

  function kicker(ctx, s, x, y, p, t, color) {
    if (p <= 0) return;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, p * 3);
    ctx.fillStyle = color; ctx.fillRect(x, y - 7, 26 * Ease.outExpo(p), 2);
    text(ctx, scramble(s, p, 5, t), x + 40, y, { size: 17, weight: 600, fam: 'mono', color, ls: 17 * 0.18 });
    ctx.restore();
  }

  SCENES['cli'] = {
    // the result table (header + three kernel rows): the zoomInto window into the results chart
    portal(t, env) {
      const pl = player(), lt = t - env.t0;
      const h = pl.find(HEAD), r = pl.find(ROW);
      if (!h || !r) return null;
      const { pose } = poseAt(lt, pl, env.beatSec || B, env);
      const b0 = pl.box(h.line, lt, { cols: [0, 62] }), b1 = pl.box(r.line, lt, { cols: [0, 62] });
      if (!b0 || !b1) return null;
      const q = Quad.projRect(Quad.poseMap(pose, pl.size), [b0[0], b0[1], b1[2], b1[3]]);
      return { x: q.x - 10, y: q.y - 8, w: q.w + 20, h: q.h + 16, r: 12 };
    },
    draw(ctx, t, env) {
      const P = env.palette, lt = env.lt, beat = env.beatSec || B;
      const b = (n) => n * beat;
      const pl = player();

      // ── stage
      ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
      softBlob(ctx, 1260, 470, 820, rgba(P.accent, 0.06));
      softBlob(ctx, 300, 820, 640, rgba(P.accent2, 0.06));
      Term.dotGrid(ctx, lt, { color: P.ink2, a: 0.09, step: 36, size: 2, drift: [7, 3] });

      const { pose, zk, tk } = poseAt(lt, pl, beat, env);

      // ── left column: kicker, giant word, provenance from the capture's sidecar; steps aside for the zoom
      const aside = Ease.inC(rm(lt, b(6.6), b(7.6)));
      if (aside < 1) {
        ctx.save();
        ctx.globalAlpha *= 1 - aside;
        ctx.translate(-140 * aside, 0);
        kicker(ctx, 'ONE COMMAND · ONE TABLE', 124, 330, rm(lt, b(0.25), b(1.25)), lt, P.accent);
        Term.giantWord(ctx, 'RUN', 112, 548, Ease.outC(rm(lt, -0.12, b(1))), { size: 236, weight: 700, font: FAM.display, color: P.ink, t: lt,
          c1: P.deny, c2: P.accent, track: -236 * 0.03 });
        const meta = (pl.cast && pl.cast.meta) || {};
        const prov = `real terminal capture · exit ${meta.exit ?? 0} · ${(+meta.seconds || 0).toFixed(1)} s`;
        withAlpha(ctx, rm(lt, b(1.5), b(2.2)), () => {
          text(ctx, prov, 126, 612, { size: 19, weight: 500, fam: 'mono', color: P.muted, ls: 0.5 });
          text(ctx, 'replays results/demo-run.json · demo data', 126, 644, { size: 19, weight: 500, fam: 'mono', color: P.muted, ls: 0.5 });
        });
        ctx.restore();
      }

      // ── the window: real recording, highlight + spotlight once the camera has arrived
      const row = pl.find(ROW), sum = pl.find(SUM), fpl = pl.find(FP), rpl = pl.find(REP);
      const hk = Ease.outC(rm(lt, b(8), b(8.6)));
      const scan = (k) => (k > 0 && k < 1 ? k : 0);
      const hl = row && hk > 0 ? {
        lines: [
          { line: row.line, k: hk * (1 - tk), color: P.accent, cols: [0, 62], scan: scan(rm(lt, b(8.1), b(9.3))) },
          { line: sum.line, k: 0.55 * Ease.outC(rm(lt, b(9), b(9.6))) * (1 - tk), color: P.ok, cols: [0, 58], bar: false },
          ...(fpl && rpl && tk > 0 ? [
            { line: fpl.line, k: tk, color: P.accent, cols: [0, 62], scan: scan(rm(env.phase.hold, b(1.5), b(2.7))) },
            { line: rpl.line, k: tk * Ease.outC(rm(env.phase.hold, b(2), b(2.6))), color: P.accent, cols: [0, 62], bar: false },
          ] : []),
        ],
        spot: { k: 0.7 * hk, lines: tk > 0.5 && fpl && rpl ? [fpl.line, rpl.line] : [row.line, sum.line] },
      } : undefined;
      const enter = Ease.outC(rm(lt, 0.1, 0.5));
      const r = pl.draw(ctx, lt, pose, {
        highlight: hl, alpha: enter,
        sheen: { k: rm(lt, b(1.2), b(3.4)), a: 0.12, width: 220 },
        glow: { color: P.accent, a: (0.2 + 0.45 * Math.exp(-Math.max(0, lt - b(3)) * 5) * (lt >= b(3) ? 1 : 0)) * (1 - zk), blur: 54, width: 2 },
        reflection: { a: 0.09 * (1 - zk), frac: 0.35 },
        shadow: { color: 'rgba(0,0,0,0.6)', blur: 70, y: 34 },
      });

      // ── the zoomed window reaches the frame edges: keep the HUD corners readable with a soft top/bottom fade
      if (zk > 0) {
        const a = Ease.outC(zk);
        ctx.save();
        ctx.fillStyle = linear(ctx, 0, 0, 0, 190, [[0, rgba(P.bg, 0.92 * a)], [0.55, rgba(P.bg, 0.6 * a)], [1, rgba(P.bg, 0)]]);
        ctx.fillRect(0, 0, W, 190);
        ctx.fillStyle = linear(ctx, 0, H - 150, 0, H, [[0, rgba(P.bg, 0)], [1, rgba(P.bg, 0.9 * a)]]);
        ctx.fillRect(0, H - 150, W, 150);
        ctx.restore();
      }

      // ── lock-on: brackets on the spark row (beat 8), a second scan pass on beat 10
      if (r && row && zk > 0.6) {
        const tl = tk > 0.5 && fpl && rpl ? fpl : row;                    // brackets follow the tour
        const bx = tl === row ? pl.box(row.line, lt, { cols: [0, 62], pad: 0.6 }) : (() => {
          const a0 = pl.box(fpl.line, lt, { cols: [0, 62], pad: 0.6 }), a1 = pl.box(rpl.line, lt, { cols: [0, 62], pad: 0.6 });
          return a0 && a1 ? [a0[0], a0[1], a1[2], a1[3]] : null;
        })();
        if (bx) {
          const rect = r.rect(bx);
          const lk = tl === row ? rm(lt, b(8), b(8.35)) * clamp((1 - tk) * 2) : rm(env.phase.hold, b(1.4), b(1.75)), sq = 1 + 0.35 * (1 - Ease.outExpo(lk));
          const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
          Quad.brackets(ctx, { x: cx - (rect.w / 2) * sq, y: cy - (rect.h / 2) * sq, w: rect.w * sq, h: rect.h * sq },
            { color: P.accent, a: lk, glow: rgba(P.accent, 0.85), pad: 14, len: 24, width: 3 });
          const s2 = rm(lt, b(10), b(10.9));
          if (s2 > 0 && s2 < 1) {
            const x = lerp(rect.x, rect.x + rect.w, Ease.ioQ(s2));
            ctx.save();
            ctx.fillStyle = linear(ctx, x - 160, 0, x, 0, [[0, rgba(P.accent, 0)], [1, rgba(P.accent, 0.35)]]);
            ctx.fillRect(Math.max(rect.x, x - 160), rect.y, Math.min(160, x - rect.x), rect.h);
            ctx.restore();
          }
        }
      }
    },
  };
})();
