// hook (2 bars): scattered links. Link chips from the app's sample data (fictional domains and titles) and raw pasted
// fragments drift at different depths, out of focus, every which way. The chrome torus (the app's own drawing) spins
// up at the left; one by one the chips are pulled into its orbit, shrink and vanish into the ring, and the lime
// reflection runs round it. By 0.5 s the name lands on the right in chrome type, the kicker above it, and by 1.3 s
// the one-line promise below it: 흩어진 링크를 하나의 지식으로. On the last two beats the ring turns to face the
// camera and grows; the next scene opens inside its hole.
(() => {
  const T = TROVE;
  const CHIPS = [
    ['G', 'github.com', 'pado-labs/looplens'], ['NM', 'notes.mireu.dev', '리액트 상태 관리, 2026년에는'], ['BP', 'blog.pado.kr', '타입스크립트 제네릭을 그림으로'],
    ['DP', 'docs.pado.kr', 'Trove 북마크 교환 형식 명세 v1'], ['O', 'orbit-ui.design', '크롬 질감 버튼을 CSS만으로'], ['FO', 'field.ondo.co.kr', '에디토리얼 그리드 12가지 사례'],
    ['H', 'hanui.dev', 'Pretendard를 웹에서 가볍게'], ['R', 'readroom.pub', '천천히 읽기의 기술'], ['PL', 'paper.lumen.ac', '희소 어텐션으로 긴 문맥 처리하기'],
    ['H', 'hexa.tools', 'Hexa Palette'], ['KS', 'kit.solvo.app', '정규식 놀이터 Solvo Regex'], ['S', 'sori.fm', '소리FM 41화'],
    ['N', 'nabi.studio', '나비 스튜디오 — 토러스 연작'], ['MO', 'meetup.ondo.co.kr', '온도 밋업 2026 가을'],
  ];
  const FRAGS = ['https://notes.mireu.dev/react-state-2026?utm_source=newsletter', '[디자인 참고](https://field.ondo.co.kr/grid)', 'example.com/article?fbclid=…', 'www.hexa.tools/', 'readroom.pub/slow-reading#memo', 'kit.solvo.app/?ref=chat'];
  const TOR = { x: 560, y: 540, s: 3.3 };
  // where the ring sits and how it turns at local time lt
  function ring(env) {
    const lt = env.lt, out = Ease.ioC(env.phase.out), grow = styleSpring(lt - 0.12, { f: 1.6, z: 0.62 });
    return { cx: lerp(TOR.x, W / 2, out), cy: lerp(TOR.y, H / 2, out), s: TOR.s * (0.55 + 0.45 * grow) * (1 + 0.9 * out),
      tilt: lerp(0.62, 1, out), rot: -0.3 + 0.12 * Math.sin(lt * 0.9) + 0.3 * out, lime: 0.75 + lt * 1.6 };
  }
  SCENES['hook'] = {
    portal(t, env) { const r = ring(env), h = r.s * 34; return { x: r.cx - h, y: r.cy - h, w: 2 * h, h: 2 * h, r: h }; },
    draw(ctx, t, env) {
      const lt = env.lt, out = Ease.ioC(env.phase.out), P = env.palette;
      T.stage(ctx, t, { glowX: 560, glowY: 520, drift: 10 });
      const R = ring(env);
      // chips and fragments: drifting in depth, then pulled into the orbit (behind the torus first, then the front)
      const items = [];
      CHIPS.forEach((c, i) => items.push({ kind: 'chip', c, i }));
      FRAGS.forEach((s, i) => items.push({ kind: 'frag', s, i: i + CHIPS.length }));
      const drawn = items.map((it) => {
        const i = it.i, h1 = hash(i * 7.1), h2 = hash(i * 3.3 + 1), h3 = hash(i * 9.7 + 2);
        const z = 0.45 + h3 * 0.9;                                                   // depth: 0.45 far .. 1.35 near
        const sx = 120 + h1 * 1680, sy = 90 + h2 * 900;
        const drift = [Math.sin(lt * 0.6 + i) * 40 * z - lt * 30 * (h1 - 0.5) * 2, Math.cos(lt * 0.5 + i * 1.3) * 26 * z];
        const p = clamp(rm(lt, 0.25 + h1 * 0.9, 1.15 + h1 * 1.2));                    // 0 drifting .. 1 absorbed
        const e = Ease.inC(p);
        const ang = h2 * Math.PI * 2 + lt * 1.2 + e * 2.2;
        const ox = R.cx + Math.cos(ang) * 62 * R.s, oy = R.cy + Math.sin(ang) * 62 * R.s * 0.62;
        const x = lerp(sx + drift[0], ox, e), y = lerp(sy + drift[1], oy, e);
        const sc = lerp(z * 0.8, 0.12, e), a = (1 - Ease.inQ(clamp((p - 0.7) / 0.3))) * clamp(rm(lt, -0.3, 0.2) + 0.6);
        const inName = x > 860 && x < 1720 && y > 250 && y < 760 ? 1 - 0.85 * clamp(rm(lt, 0.25, 0.6)) : 1;   // keep the name clear
        return { it, x, y, sc, a: a * inName, z, rot: (h1 - 0.5) * 0.5 * (1 - e), front: Math.sin(ang) > 0, blur: Math.abs(z - 0.95) * 6 * (1 - e) };
      }).filter(d => d.a > 0.01);
      const paint = (d) => {
        ctx.save(); if (d.blur > 0.6) ctx.filter = `blur(${d.blur.toFixed(1)}px)`;
        if (d.it.kind === 'chip') T.linkChip(ctx, d.x, d.y, d.sc, { ini: d.it.c[0], domain: d.it.c[1], title: d.it.c[2], alpha: d.a, rot: d.rot, hot: d.z > 1.2 });
        else { ctx.translate(d.x, d.y); ctx.rotate(d.rot); ctx.globalAlpha *= d.a * 0.9; ctx.font = `500 ${Math.round(24 * d.sc)}px ${FAM.mono}`; ctx.fillStyle = '#8E929B'; ctx.textAlign = 'center'; ctx.fillText(d.it.s, 0, 0); }
        ctx.restore();
      };
      drawn.filter(d => !d.front).sort((a, b) => a.z - b.z).forEach(paint);
      const hole = T.torus(ctx, R.cx, R.cy, R.s, { tilt: R.tilt, rot: R.rot, lime: R.lime });
      drawn.filter(d => d.front).sort((a, b) => a.z - b.z).forEach(paint);
      // lime glints on the ring on every beat of the hold
      onBeats(env, 1, (i, dt) => { const k = Math.exp(-dt * 5); const a = 1.2 + i * 2.1; sparkle(ctx, R.cx + Math.cos(a) * 62 * R.s, R.cy + Math.sin(a) * 62 * R.s * R.tilt, 26 * k, k, a, '#E6FF8A'); }, { from: 'start', until: env.dur - env.outSec });
      // the name block (leaves to the right as the ring turns to the camera)
      const tx = 1010 + out * 300, ta = 1 - Ease.inQ(clamp(env.phase.out * 1.6));
      T.label(ctx, 'SCATTERED LINKS → ONE TROVE', tx, 372, { size: 24, color: P.muted, alpha: ta * clamp(rm(lt, 0.15, 0.45)) });
      const nameK = styleSpring(lt - 0.3, { f: 1.9, z: 0.7 });
      ctx.save(); ctx.globalAlpha *= ta * clamp(rm(lt, 0.3, 0.6)); ctx.translate(tx, 560 + (1 - nameK) * 60);
      T.chromeText(ctx, 'Trove', 0, 0, 230, { sheen: clamp(rm(lt, 0.9, 2.2)) });
      ctx.restore();
      kinetic(ctx, '흩어진 링크를 하나의 지식으로', tx + 6, 668, lt - 0.85, { size: 60, fam: 'display', weight: 700, color: P.ink, ls: -2.2, stagger: 0.025, dur: 0.5, rise: 26, blur: 6, alpha: ta });
      // a lime rule that draws under the line
      const rl = Ease.outC(clamp(rm(lt, 1.3, 1.9)));
      ctx.save(); ctx.globalAlpha *= ta; ctx.fillStyle = P.accent; ctx.fillRect(tx + 8, 712, 120 * rl, 4); ctx.restore();
    },
  };
})();
