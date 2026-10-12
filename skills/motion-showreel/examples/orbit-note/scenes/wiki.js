// wiki (2 bars, 3 in the 30): [[ ]] links by itself. The app's own layout from the hook; its seven links fade in
// along their real paths. The camera glides toward the lower cards while the real inspector slides in on the right
// with card N°09 (다음 아이디어). [[포 is typed: the app's own suggestion list pops (포커스 모드); Enter, and the inspector
// shows 나가는 연결 1 while on the canvas a dashed wiki link draws itself from 다음 아이디어 to 포커스 모드, both cards
// ringed. Headline: [[제목]]만 적으면 / 저절로 이어져요. The inspector states and the cards are captures; the link is
// the path the app drew after Enter (geo_linked.txt).
(() => {
  const O = ORBIT;
  SCENES['wiki'] = {
    draw(ctx, t, env) {
      const lt = env.lt, P = env.palette, B = env.beatSec, out = env.phase.out;
      const g = Ease.ioC(clamp((lt - 0.2) / (3.2 * B)));
      const c = { x: lerp(800, 860, g), y: lerp(500, 600, g), z: lerp(1, 1.28, g) };
      O.space(ctx, c);
      O.drawLayer(ctx, 'knot', c, { rot: Math.sin(t * 0.3) * 0.04 });
      const G = O.geo(), GL = O.geoLinked();
      G.links.forEach((L, i) => O.link(ctx, L, c, 1, { alpha: clamp((lt + 0.1 - i * 0.04) / 0.35), spark: false }));
      G.labels.forEach((lb, i) => O.drawLayer(ctx, 'label_' + i, c, { alpha: clamp((lt - 0.1) / 0.3) }));
      G.cards.forEach((cd, i) => O.drawLayer(ctx, 'card_' + i, c));
      // the new wiki link and its two cards
      const nl = GL.links.find(L => !G.links.some(x => x.id === L.id));
      const at = 4.25 * B, p = Ease.ioC(clamp((lt - at) / (1.5 * B)));
      if (nl && p > 0) {
        O.link(ctx, nl, c, p, { glow: 'rgba(226,185,255,0.5)' });
        const M = O.mapper(c);
        [nl.from, nl.to].forEach((id, j) => {
          const cd = G.cards.find(x => x.id === id); if (!cd || (j === 1 && p < 1)) return;
          const k = clamp((lt - at - (j ? 1.5 * B : 0)) / 0.4), pulse = 0.6 + 0.4 * Math.sin(lt * 4);
          ctx.save(); ctx.globalAlpha *= k * pulse; ctx.strokeStyle = O.holoAt((lt * 0.3 + j * 0.5) % 1); ctx.lineWidth = 3; ctx.shadowColor = '#9FE9FF'; ctx.shadowBlur = 24;
          rr(ctx, M.x(cd.x) - 6, M.y(cd.y) - 6, cd.w * M.s + 12, cd.h * M.s + 12, 16); ctx.stroke(); ctx.restore();
        });
      }
      // the inspector, fixed on screen
      const si = styleSpring(lt - 0.25, { f: 1.8, z: 0.8 }), ix = 1440 + (1 - si) * 520, iy = 22, ik = 1.16;
      const state = lt < 2.5 * B ? 'insp' : lt < 4 * B ? 'insp_suggest' : 'insp_linked';
      const { img } = O.layer(state);
      if (img) {
        ctx.save(); ctx.shadowColor = 'rgba(3,11,74,0.5)'; ctx.shadowBlur = 50; ctx.shadowOffsetX = -10;
        ctx.drawImage(img, ix, iy, img.width / 2 * ik, img.height / 2 * ik); ctx.restore();
        if (state === 'insp_suggest') {                                      // the suggestion pops
          const k = clamp((lt - 2.5 * B) / 0.25); ctx.save(); ctx.globalAlpha *= 1 - k;
          ctx.fillStyle = '#F4F6FB'; ctx.fillRect(ix + 30 * ik, iy + 268 * ik, 360 * ik, 92 * ik); ctx.restore();
        }
      }
      // the headline, with a deep-blue wash
      O.wash(ctx, 640, 0.92, 1100);
      O.label(ctx, 'WIKI LINK', 120, 846, { size: 22, alpha: clamp(rm(lt, 0.2, 0.5)) * (1 - out) });
      O.headline(ctx, ['[[제목]]만 적으면', '저절로 이어져요.'], 114, 940, lt - 0.35, { size: 84, gap: 96, out: { at: env.dur - env.outSec } });
    },
  };
})();
