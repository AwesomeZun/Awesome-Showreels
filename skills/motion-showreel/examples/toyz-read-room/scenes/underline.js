// underline (2 bars, 3 in the 30): underline it, talk in the margin. The app's real essay (느리게 읽는 방, its own
// fictional sample) lies on the desk; the camera reads down it. Blue draws on along the real line boxes of the first
// reader's highlight (느리게 읽는 사람은 한 글 안에 오래 머뭅니다), and her margin note slides in beside paragraph 04
// (민지 · 메모 2); further down a second reader's orange and a third's yellow draw on one after another. In the 30
// the green one and the note on paragraph 11 (태오) follow. Headline right: 밑줄 긋고, / 메모를 나눠요.
(() => {
  const R = RR, X = 110, Y0 = 0, S = 1.12;
  SCENES['underline'] = {
    draw(ctx, t, env) {
      const lt = env.lt, P = env.palette, B = env.beatSec, out = env.phase.out;
      R.desk(ctx, t);
      const cy = lerp(430, 470, clamp(lt / (3.5 * B))) + Ease.ioC(clamp((lt - 3.5 * B) / (1.2 * B))) * 380 + Ease.ioC(clamp((lt - 8.5 * B) / (1.5 * B))) * 300;
      const e = styleSpring(lt + 0.15, { f: 1.6, z: 0.8 });
      ctx.save(); ctx.translate(0, (1 - e) * 120);
      const prog = { 'sample-h1': clamp((lt - B) / (1.2 * B)), 'sample-h2': clamp((lt - 4 * B) / B), 'sample-h3': clamp((lt - 5 * B) / (0.8 * B)), 'sample-h4': clamp((lt - 9.5 * B) / B) };
      R.page(ctx, X, Y0, S, cy, H, prog);
      // margin notes, attached to the page
      [['card_0', 534, 2.5 * B], ['card_1', 1277, 10.5 * B]].forEach(([n, py, at]) => {
        const k = styleSpring(lt - at, { f: 2, z: 0.7 }); if (lt < at) return;
        const sy = Y0 + (py - cy) * S; ctx.save(); ctx.globalAlpha *= clamp((lt - at) / 0.25); ctx.translate((1 - k) * 80, 0);
        ctx.shadowColor = 'rgba(23,25,29,0.18)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12; R.draw(ctx, n, X + 848 * S - 16, sy, 1.18); ctx.restore();
      });
      ctx.restore();
      R.label(ctx, '밑줄 · 메모 · 함께 읽기', 1340, 346, { size: 22, color: P.muted, alpha: clamp(rm(lt, 0.2, 0.5)) * (1 - out) });
      kinetic(ctx, '밑줄 긋고,', 1334, 450, lt - 0.2, { size: 88, fam: 'display', weight: 900, color: P.ink, ls: -3.8, stagger: 0.03, dur: 0.55, rise: 36, blur: 6, out: { at: env.dur - env.outSec } });
      R.marker(ctx, '메모를 나눠요.', 1334, 554, 88, lt - 0.5, { markAt: 0.6, out: { at: env.dur - env.outSec }, alpha: 1 - Ease.inC(out) });
    },
  };
})();
