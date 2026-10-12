// route (2 bars; 3 in the 30): a walk. The camera settles at street level over the app's Seongsu walk (성수 붉은벽돌 골목
// 한 바퀴, its own ten points); the walk draws itself as the app draws a selected route (dark casing, soft glow, lime
// line) with a dot walking at its head, the five places on the way lighting as it passes them. On the left the walk's
// own card (captured): its distance and time count up with the walk to the app's figures, 1.39km and 19분, and its
// list of places lights in step. The headline: 걷고 싶은 길을 / 코스로 이어요.
(() => {
  const M = OG, R = M.ROUTES[0];
  const C0 = { lat: 37.5440, lng: 127.0472, z: 16.05 }, C1 = { lat: 37.5440, lng: 127.0524, z: 17.3 };
  const PK = 0.92, PX = 120, PY = 400, ROWS = [384.5, 426.5, 468.5, 510.5, 552.5];
  let FR = null;
  function fractions() { const L = M.metres(R.points), out = []; [0, 1, 3, 5, 7].forEach(i => out.push(M.metres(R.points.slice(0, i + 1)) / L)); return { L, at: out }; }
  SCENES['route'] = {
    cam(lt, B) { const p = Ease.ioC(clamp(lt / (2 * B))), z = lerp(C0.z, C1.z, p), f = (Math.pow(2, z - C0.z) - 1) / (Math.pow(2, C1.z - C0.z) - 1);
      return { lat: lerp(C0.lat, C1.lat, f), lng: lerp(C0.lng, C1.lng, f) - Math.max(0, lt - 2 * B) * 0.00004, z: z + Math.max(0, lt - 2 * B) * 0.03 }; },
    draw(ctx, t, env) {
      const lt = env.lt, B = env.beatSec, outAt = env.dur - env.outSec;
      if (!FR) FR = fractions();
      const cam = this.cam(lt, B);
      M.map(ctx, cam, { lift: 1.15 });
      const span = Math.min(5, env.dur / B - 3.2) * B, p = Ease.ioQ(clamp((lt - 1.5 * B) / span));
      const pts = R.points.map(([la, ln]) => M.project(cam, la, ln));
      const head = M.line(ctx, pts, p, { k: 1.7 });
      // the places on the walk (others dim), each lighting as the walker reaches it
      M.PLACES.forEach(pl => { const [x, y] = M.project(cam, pl.lat, pl.lng); if (x < -80 || x > W + 80 || y < -80 || y > H + 80) return;
        const k = R.places.indexOf(pl.i); if (k < 0) { M.pin(ctx, x, y, pl, { k: 1.5, alpha: lerp(1, 0.35, clamp(lt / 0.6)), label: 1 - clamp(lt / 0.4) }); return; }
        const reached = p >= FR.at[k] - 0.002, cur = reached && (k === 4 ? true : p < FR.at[k + 1]);
        M.pin(ctx, x, y, pl, { k: 1.6, label: 1, selected: cur && p > 0 && p < 1 || (k === 0 && p >= 1) }); });
      // the walker
      if (head && p > 0 && p < 1) { ctx.save(); const r = 10 + 4 * Math.sin(lt * 9); ctx.fillStyle = 'rgba(215,247,91,0.25)'; circle(ctx, head[0], head[1], r + 12); ctx.fill();
        ctx.fillStyle = M.LIME; ctx.shadowColor = M.LIME; ctx.shadowBlur = 20; circle(ctx, head[0], head[1], 11); ctx.fill(); ctx.shadowColor = 'transparent'; ctx.fillStyle = '#FFFFFF'; circle(ctx, head[0], head[1], 4.5); ctx.fill(); ctx.restore(); }
      M.scrim(ctx, 'left', 0.85, 860);
      // the walk's card: its numbers count with the walk, its places light in step
      const ce = styleSpring(lt - 0.3, { f: 2, z: 0.72 });
      ctx.save(); ctx.globalAlpha *= clamp(ce * 1.6) * (1 - env.phase.out); ctx.translate((1 - ce) * -420, 0);
      ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 20; rr(ctx, PX, PY, 396 * PK, 600 * PK, 14); ctx.fillStyle = '#0F0F11'; ctx.fill(); ctx.shadowColor = 'transparent';
      M.draw(ctx, 'route', PX, PY, PK, { crop: [0, 0, 396, 600] });
      if (p < 1) { const s = (x, y) => [PX + x * PK, PY + y * PK];
        ctx.fillStyle = '#0C0C0C'; let [a, b] = s(30, 181); ctx.fillRect(a, b, 84 * PK, 27 * PK); [a, b] = s(152, 181); ctx.fillRect(a, b, 56 * PK, 27 * PK);
        ctx.font = `800 ${24 * PK}px ${FAM.sans}`; ctx.fillStyle = '#F3F3EE'; [a, b] = s(33, 204.5); ctx.fillText((1.39 * p).toFixed(2) + 'km', a, b); [a, b] = s(155, 204.5); ctx.fillText(Math.round(19 * p) + '분', a, b); }
      R.places.forEach((pi, k) => { const on = clamp((p - FR.at[k] + 0.002) * 40); if (on <= 0) return; const [a, b] = [PX + 16 * PK, PY + (ROWS[k] - 13) * PK];
        ctx.save(); ctx.globalAlpha *= on * 0.14; ctx.fillStyle = M.LIME; ctx.fillRect(a, b, 364 * PK, 42 * PK); ctx.restore(); ctx.fillStyle = M.LIME; ctx.fillRect(a, b + 6 * PK, 3, 30 * PK); });
      ctx.restore();
      M.headline(ctx, ['걷고 싶은 길을', '코스로 이어요.'], 118, 252, lt - 0.1, { size: 84, gap: 94, out: { at: outAt } });
      M.label(ctx, 'DRAW MODE / 산책 코스', 148, 150, { size: 22, color: '#C4C4BC', dot: true, alpha: clamp(rm(lt, 0.05, 0.35)) * (1 - env.phase.out) });
      M.credit(ctx);
    },
  };
})();
