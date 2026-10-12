// search (2 bars, the 30 only): / flies you there. The canvas at rest; "/" is pressed, the app's real search palette
// drops in at the top with its result for 정렬 (자동 정렬); Enter, the palette leaves and the camera flies to that card,
// as the app does, until it fills the middle of the frame and a holographic ring lights it. Headline: / 한 번이면 /
// 그 카드로 날아가요.
(() => {
  const O = ORBIT;
  SCENES['search'] = {
    draw(ctx, t, env) {
      const lt = env.lt, P = env.palette, B = env.beatSec, out = env.phase.out;
      const G = O.geoLinked(), target = G.cards.find(c => c.title === '자동 정렬') || G.cards[4];
      const fly = Ease.ioC(clamp((lt - 2.6 * B) / (1.6 * B)));
      const z = lerp(1, 1.7, fly), half = W / 2 / (z * O.K);                // the camera stays inside the captured space
      const c = { x: Math.min(lerp(800, target.x + target.w / 2, fly), 1600 - half), y: lerp(500, target.y + target.h / 2, fly), z };
      O.space(ctx, c); O.drawLayer(ctx, 'knot', c);
      G.links.forEach(L => O.link(ctx, L, c, 1, { spark: false }));
      O.geo().labels.forEach((lb, i) => O.drawLayer(ctx, 'label_' + i, c));
      G.cards.forEach((cd, i) => O.drawLayer(ctx, 'card_' + i, c, { alpha: cd === target ? 1 : 1 - 0.45 * fly }));
      if (fly > 0.9) {
        const M = O.mapper(c), k = clamp((fly - 0.9) / 0.1) * (0.75 + 0.25 * Math.sin(lt * 4));
        ctx.save(); ctx.globalAlpha *= k; ctx.strokeStyle = O.holoAt((lt * 0.4) % 1); ctx.lineWidth = 4; ctx.shadowColor = '#9FE9FF'; ctx.shadowBlur = 30;
        rr(ctx, M.x(target.x) - 8, M.y(target.y) - 8, target.w * M.s + 16, target.h * M.s + 16, 22); ctx.stroke(); ctx.restore();
      }
      // the palette: drops at "/", leaves at Enter
      const inP = styleSpring(lt - 0.25 * B, { f: 2.2, z: 0.7 }), leave = Ease.inC(clamp((lt - 2.5 * B) / 0.3));
      if (lt > 0.25 * B && leave < 1) {
        const { img } = O.layer('palette'); if (img) { const k = 1.25, w = img.width / 2 * k, h = img.height / 2 * k;
          ctx.save(); ctx.globalAlpha *= clamp((lt - 0.25 * B) / 0.15) * (1 - leave); ctx.shadowColor = 'rgba(3,11,74,0.5)'; ctx.shadowBlur = 50;
          ctx.drawImage(img, 960 - w / 2, 70 + (1 - inP) * -40 - leave * 30, w, h); ctx.restore(); }
      }
      O.wash(ctx, 700, 0.9, 1250);
      O.label(ctx, 'SEARCH  /  ⌘K', 120, 846, { size: 22, alpha: clamp(rm(lt, 0.2, 0.5)) * (1 - out) });
      O.headline(ctx, ['/ 한 번이면', '그 카드로 날아가요.'], 114, 940, lt - 0.3, { size: 84, gap: 96, out: { at: env.dur - env.outSec } });
    },
  };
})();
