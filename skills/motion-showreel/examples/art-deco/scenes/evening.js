// evening (optional, 30 s cut): "The programme for the evening". The closed fan parts on the downbeat (fan ended on
// FAN.irisCover); the title is drawn with a gilded rule, then the five hours of the invitation land one per swung
// beat on the centre line (hour to the left in tracked capitals, the event to the right in the spoken hairline face,
// a gold lozenge between them). Below, the champagne tower from the press-kit note fills from the top coupe down, one
// tier per beat. Hold: a sheen runs down the rows on each bar, the lozenges pulse on the Charleston figure, bubbles
// rise. Out-phase: the full-frame fan closes again (the next scene parts it).
(() => {
  const at = (env, b) => env.lt - b * env.beatSec;
  const CX = W / 2;
  const ROWS = [
    ['NINE O’CLOCK', 'The doors open'],
    ['TEN O’CLOCK', 'Supper is served'],
    ['ELEVEN O’CLOCK', 'Miss Celeste Arden sings'],
    ['MIDNIGHT', 'The Meridian Stomp', true],
    ['UNTIL THE SMALL HOURS', 'Dancing'],
  ];
  const ROW_Y0 = 300, ROW_DY = 74, GAP = 46;
  const TIERS = [1, 2, 3, 4], S = 40, TOWER_BASE = 1012;              // coupes per tier (top first), bowl half-width

  SCENES['evening'] = {
    draw(ctx, t, env) {
      const P = env.palette, lt = env.lt, bs = env.beatSec, out = env.phase.out;
      const hl = STYLE.fonts.hairline, sw = FAN.SWING;
      FAN.ground(ctx, env, P, { liftY: 820, liftR: 900, alpha: 0.06, rays: 44 });
      softBlob(ctx, CX, 880, 520, mix(P.goldShade, P.bg, 0.3), 0.5 + 0.12 * FAN.charleston(env));
      FAN.dust(ctx, lt + 7, P, { n: 34, y0: 120, y1: 1000, alpha: 0.7, seed: 41, speed: 16 });

      // frame: stepped double rule around the whole card, from the top centre down both sides
      FAN.steppedFrame(ctx, CX, 150, 70, W - 150, H - 40, Ease.ioC(rm(lt, 0.15 * bs, 1.6 * bs)), P, { step: 16, n: 3, lw: 2.2 });

      // title and its rule
      const tl = FAN.label(ctx, 'THE PROGRAMME FOR THE EVENING', CX, 176, { size: 30, color: P.accent, lt: at(env, 0.5), stagger: 0.02, dur: 0.5 });
      FAN.rule(ctx, CX, 214, tl.w / 2 + 40, Ease.ioC(rm(at(env, 1), 0, 0.9 * bs)), P, { lw: 1.4 });

      // the five hours: one per swung beat, sheen down the rows on each bar
      let sweep = -1;
      onBars(env, 1, (i, dt) => { sweep = dt / (1.4 * bs); });
      const pulse = FAN.charleston(env);
      ROWS.forEach(([hour, what, gold], i) => {
        const b = 1.5 + i * sw * 1.5, y = ROW_Y0 + i * ROW_DY, d = at(env, b);
        const k = Ease.outQuint(rm(d, 0, 0.45));
        if (k <= 0) return;
        const shine = sweep >= 0 ? Math.exp(-Math.pow((sweep * 6 - i) * 1.2, 2)) : 0;
        // the lozenge
        const dk = Ease.outBack(rm(d, 0, 0.3), 2.4) * (1 + 0.25 * pulse);
        ctx.save(); ctx.translate(CX, y - 10); ctx.rotate(Math.PI / 4); ctx.scale(dk, dk);
        ctx.fillStyle = FAN.goldGrad(ctx, 0, -8, 0, 8, P); ctx.fillRect(-6, -6, 12, 12); ctx.restore();
        if (shine > 0.02) softBlob(ctx, CX, y - 10, 40, P.goldLight, 0.5 * shine);
        // hour (right-aligned to the axis) slides in from the axis; event (left-aligned) likewise
        const off = (1 - k) * 40;
        FAN.label(ctx, hour, CX - GAP + off, y, { size: 22, em: 0.26, color: mix(P.ink2, P.goldLight, shine), align: 'right', alpha: k });
        if (gold) FAN.text(ctx, what, CX + GAP - off, y + 4, { size: 44, fam: hl, align: 'left', gold: true, palette: P, seams: false, ls: 1, glowA: 0.3 + 0.3 * shine, alpha: k, sheen: sweep >= 0 && sweep < 1 ? sweep : 0 });
        else FAN.text(ctx, what, CX + GAP - off, y + 4, { size: 40, fam: hl, align: 'left', color: mix(P.ink, P.goldLight, 0.5 * shine), ls: 0.5, alpha: k, blur: 0 });
      });

      // the champagne tower: drawn tier by tier (top first), then poured from the top down, one tier per beat
      const nT = TIERS.length;
      for (let ti = nT - 1; ti >= 0; ti--) {
        const n = TIERS[ti], fy = TOWER_BASE - (nT - 1 - ti) * S * 1.6;
        const appear = Ease.outBack(rm(at(env, 1 + (nT - 1 - ti) * 0.25), 0, 0.35), 1.6);
        const fill = rm(at(env, 2.5 + ti * 1.0), 0, 0.9 * bs);
        for (let j = 0; j < n; j++) {
          const x = CX + (j - (n - 1) / 2) * S * 2.1;
          if (appear <= 0) continue;
          ctx.save(); ctx.translate(x, fy); ctx.scale(appear, appear); ctx.translate(-x, -fy);
          FAN.coupe(ctx, x, fy, S, fill, P, { t: lt, seed: ti * 10 + j, lw: 2 });
          ctx.restore();
          // the overflow running down to the tier below while it fills
          if (ti < nT - 1 && fill > 0.8) {
            const run = rm(at(env, 2.5 + (ti + 1) * 1.0), -0.4 * bs, 0.6 * bs);
            if (run > 0 && run < 1) for (const s of [-1, 1]) {
              const rx = x + s * S, ry = fy - S * 1.6;
              ctx.save(); ctx.strokeStyle = rgba(P.goldLight, 0.75 * Math.sin(Math.PI * run)); ctx.lineWidth = 2.2;
              ctx.beginPath(); ctx.moveTo(rx, ry); ctx.quadraticCurveTo(rx + s * 10, ry + 30, rx + s * 6, ry + S * 1.6 - 6); ctx.stroke(); ctx.restore();
            }
          }
        }
      }
      // the pour from above into the top coupe
      const pour = rm(at(env, 2.25), 0, 1.4 * bs);
      if (pour > 0 && pour < 1) {
        const topY = TOWER_BASE - (nT - 1) * S * 1.6 - S * 1.6, a = Math.sin(Math.PI * pour);
        ctx.save(); ctx.strokeStyle = rgba(P.goldLight, 0.85 * a); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(CX, topY - 70); ctx.lineTo(CX, topY + S * 0.3); ctx.stroke(); ctx.restore();
        sparkle(ctx, CX, topY, 16 * a, a, lt * 3, '#FFF8E6');
      }
      // a glint crossing the full tower on each bar of the hold
      onBars(env, 1, (i, dt) => {
        const g = rm(dt, 0.25 * bs, 1.25 * bs);
        if (g > 0 && g < 1) { const gx = lerp(CX - 4 * S, CX + 4 * S, Ease.ioQ(g)); sparkle(ctx, gx, TOWER_BASE - S * 1.2 - Math.abs(gx - CX) * 0.2, 18, Math.sin(Math.PI * g), g * 4, '#FFF8E6'); }
      });

      // out: the full-frame fan closes over the cut
      if (out > 0) FAN.irisCover(ctx, FAN.inQuint(out) * 0.6 + Ease.inC(out) * 0.4, P);
      // in: the closed fan from the previous scene parts on the downbeat
      FAN.irisPart(ctx, Ease.ioC(rm(lt, 0, 0.75 * bs)), P);
    },
  };
})();
