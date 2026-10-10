// heads (3 bars): the sentence looks at itself. The ten words sit on a baseline and the toy model's eight heads draw
// their attention as arcs over them, one head a beat, each in its own ink (arc weight = attention weight): one word
// back, one word on, the same kind of word, pronoun to noun, verb to nouns, adjective to noun, the first word,
// everywhere. Then all eight together, and then only what "it" looks at: the vermilion head carries it to "ball", and
// the German line below shows why that matters: der Ball, so "it" becomes "er".
(() => {
  SCENES['heads'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, n = Math.round(env.dur / B), cam = { z: 1.0 + 0.025 * clamp(b / n), dx: -10 * clamp(b / n) };
      const each = Math.min(1, (n - 4) / 8), focus = b > n - 3.2;
      TX.page(ctx, cam);
      TX.onPage(ctx, cam, (g) => {
        TX.txt(g, '3  Eight heads, one sentence', 140, 150, { size: 30, weight: 600, color: TX.RED });
        const pos = TX.wordsAt(330, 1700, 700, 54);
        pos.forEach((p, i) => TX.txt(g, TX.WORDS[i], p.x, p.y, { size: 54, color: focus && i === 7 ? TX.RED : TX.INK, weight: focus && (i === 7 || i === 5) ? 600 : 400 }));
        TX.HEADS.forEach((hd, h) => {
          const t0 = 0.4 + h * each, k = clamp((b - t0) / 0.9), on = b >= t0, cur = !focus && b < 0.4 + 8 * each && b >= t0 && b < t0 + each;
          TX.txt(g, `${h + 1}  ${hd.name}`, 140, 260 + h * 40, { size: 26, color: hd.ink, a: on ? (cur || b >= 0.4 + 8 * each ? 1 : 0.45) : 0.15, weight: cur ? 600 : 400 });
          if (k <= 0) return;
          const alpha = focus ? (h === 3 ? 1 : 0.18) : (b < 0.4 + 8 * each ? (cur ? 1 : 0.35) : 0.75);
          TX.arcs(g, pos, h, k, { a: alpha, only: focus ? 7 : undefined, lift: 56 });
        });
        if (focus) {
          const k = clamp((b - (n - 3.2)) / 0.8);
          TX.txt(g, 'it  →  ball', 330, 840, { size: 40, it: true, color: TX.RED, a: k });
          TX.typeset(g, 'Der Roboter hob den Ball auf, weil er leicht war.', 330, 930, clamp((b - (n - 2.6)) / 1.4), { size: 44, it: true });
          TX.txt(g, 'der Ball, so it becomes er', 330, 990, { size: 28, color: '#5A554C', a: clamp((b - (n - 1.2)) * 2) });
        }
      });
    },
  };
})();
