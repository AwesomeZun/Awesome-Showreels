// battle (2 bars, up to 4 in the 30): the boss is a bug. The world map shatters into blocks that spin away (the
// classic battle transition) to a moonlit clearing: the brass beetle on the left breathing a pixel at a time with its
// runes pulsing violet, the party on the right. The command window picks HOT RELOAD (1.5): the hero dashes in, a gold
// slash, the boss flashes and shakes, 1,200 (2.5). The mage charges 3X FASTER (4) and the orb bursts in bloom, 2,700
// (4.6). On 6 the whole party's 0.9 MS lands and on 6.5 the beetle breaks into its own pixels, flung out and fading.
// In the 30-s cut CLOUD SAVES heals the party (+57 GAMES) before the finish.
(() => {
  let BOSSPX = null, SNAP = null;
  function bossPixels() {
    if (BOSSPX) return BOSSPX;
    const im = HD.img('boss'), c = makeBuf(im.width, im.height); c.g.drawImage(im, 0, 0);
    const d = c.g.getImageData(0, 0, im.width, im.height).data, px = [];
    for (let y = 0; y < im.height; y++) for (let x = 0; x < im.width; x++) { const k = (y * im.width + x) * 4; if (d[k + 3] > 0) px.push([x, y, `rgb(${d[k]},${d[k + 1]},${d[k + 2]})`]); }
    BOSSPX = { px, w: im.width, h: im.height }; return BOSSPX;
  }
  const BX = 230, BY = 180;                                    // boss top-left (screen)
  SCENES['battle'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, lt = env.lt, b = lt / B, S = HD.S, nb = env.dur / B;
      const long = nb >= 14, healAt = 8, finAt = long ? nb - 4 : 6;           // beats of the beats
      const hit = (b0) => b > b0 && b < b0 + 0.35;
      const shake = hit(2.5) || hit(4.6) || hit(finAt) ? Math.round((hash(Math.floor(lt * 30)) - 0.5) * 6) * S : 0;
      ctx.save(); ctx.translate(shake, Math.round((hash(Math.floor(lt * 30) + 7) - 0.5) * 4) * (shake ? S : 0));
      ctx.imageSmoothingEnabled = true;
      HD.layer(ctx, 'battle_bg', -40, -40, { blur: 3 });
      // the boss: breathes one art pixel per beat, flashes white when hit, breaks into pixels at the end
      const dead = b >= finAt + 0.5, bob = Math.round(Math.sin(b * Math.PI) * 1) * S, flash = hit(2.5) || hit(4.6) || hit(finAt);
      if (!dead) {
        ctx.save(); ctx.imageSmoothingEnabled = false; const Bo = HD.scaled('boss', 0);
        ctx.drawImage(Bo.c, BX, BY + bob);
        if (flash) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.85; ctx.drawImage(Bo.c, BX, BY + bob); ctx.drawImage(Bo.c, BX, BY + bob); }
        ctx.restore();
      } else {
        const P = bossPixels(), u = Math.min(1.4, (b - finAt - 0.5) * 0.9);
        ctx.save();
        P.px.forEach(([x, y, c], i) => {
          if (hash(i * 0.37) < u * 0.45) return;
          const dx = x - P.w / 2, dy = y - P.h / 2, sp = 0.6 + hash(i * 1.7) * 1.4;
          const px = BX + x * S + dx * u * 26 * sp, py = BY + y * S + dy * u * 18 * sp + u * u * 260;
          ctx.fillStyle = c; ctx.globalAlpha = Math.max(0, 1 - u * 0.75); ctx.fillRect(Math.round(px / S) * S, Math.round(py / S) * S, S, S);
        });
        ctx.restore();
      }
      // the party: idle bob (one art pixel), the hero dashes on 1.8-3
      const dash = b > 1.8 && b < 3.1 ? Math.sin(clamp((b - 1.8) / 1.3) * Math.PI) : 0;
      const party = [[1380 - dash * 760, 700, 0], [1580, 730, 1], [1760, 750, 2]];
      party.forEach(([x, y, f], i) => { const jump = b > finAt - 0.6 && b < finAt ? -Math.sin((b - finAt + 0.6) / 0.6 * Math.PI) * 60 : 0; HD.sprite(ctx, 'party', f, x, y + Math.round(Math.sin(b * Math.PI + i) * 1) * S + jump); });
      ctx.restore();
      // lights: moon, runes, lantern, spells
      const lights = [{ x: 1500, y: 120, r: 1300, color: '#C9D6FF', i: 0.5 }];
      if (!dead) lights.push({ x: BX + 400, y: BY + 330, r: 420, color: '#B9A0FF', i: 0.5 + 0.3 * Math.sin(lt * 4) });
      lights.push({ x: party[0][0] - 70, y: 610, r: 260, color: '#FFD9A0', i: 0.8 });
      const orbU = clamp((b - 4) / 0.6), ox = lerp(1520, BX + 420, Ease.inQ(orbU)), oy = lerp(560, BY + 360, orbU) - Math.sin(orbU * Math.PI) * 120;
      if (b > 3.6 && b < 4.6) lights.push({ x: ox, y: oy, r: 300, color: '#E0C0FF', i: 0.9 });
      HD.lightmap(ctx, '#5E6AA6', lights);
      if (!dead) HD.glow(ctx, BX + 400, BY + 330, 300, '#9B6BFF', 0.35 + 0.2 * Math.sin(lt * 4));
      HD.glow(ctx, party[0][0] - 70, 610, 120, '#FFB050', 0.9);
      // the slash: a gold crescent of art pixels on 2.5
      if (b > 2.4 && b < 3.0) {
        const u = (b - 2.4) / 0.6; ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 60; i++) { const a = -1.2 + i / 60 * 2.4 * Math.min(1, u * 2.5), r = 260 + Math.sin(i / 60 * Math.PI) * 30; ctx.fillStyle = rgba(i % 4 ? '#FFD27A' : '#FFFFFF', (1 - u)); ctx.fillRect(Math.round((BX + 470 + Math.cos(a) * r * 0.6) / S) * S, Math.round((BY + 380 + Math.sin(a) * r) / S) * S, 2 * S, 2 * S); }
        ctx.restore(); HD.glow(ctx, BX + 470, BY + 380, 260, '#FFD27A', 1 - u);
      }
      // the orb: charges at the mage, flies, bursts on 4.6
      if (b > 3.6 && b < 4.6) { HD.glow(ctx, ox, oy, 120, '#C9A0FF', 1); HD.glow(ctx, ox, oy, 40, '#FFFFFF', 1); for (let i = 0; i < 12; i++) { const a = lt * 8 + i; ctx.fillStyle = '#E8E0FF'; ctx.fillRect(Math.round((ox + Math.cos(a) * 50) / S) * S, Math.round((oy + Math.sin(a) * 50) / S) * S, S, S); } }
      if (b > 4.6 && b < 5.4) { const u = (b - 4.6) / 0.8; HD.glow(ctx, BX + 420, BY + 360, 200 + u * 600, '#E0C0FF', 1.4 * (1 - u)); }
      if (b > finAt && b < finAt + 0.8) { const u = (b - finAt) / 0.8; HD.glow(ctx, BX + 400, BY + 360, 300 + u * 900, '#FFF4DC', 1.6 * (1 - u)); }
      // heal (30-s cut)
      if (long && b > healAt && b < healAt + 1.5) { const u = (b - healAt) / 1.5; party.forEach(([x, y]) => HD.glow(ctx, x, y - 150, 200, '#8CFFB0', Math.sin(u * Math.PI))); }
      HD.grade(ctx, { top: '#3050A0', bottom: '#C07040', a: 0.22, vig: 0.7 });
      // damage numbers: pop up with a bounce, hang, fade
      const dmg = (txt, b0, x, y, col = '#FFFFFF') => { if (b < b0 || b > b0 + 1.6) return; const u = (b - b0) / 1.6, bounce = Math.round(Math.abs(Math.sin(Math.min(1, u * 3) * Math.PI)) * 8 * (1 - u)) * S; HD.ptext(ctx, txt, x, y - bounce - u * 40, { fam: 'DotGothic16', size: 16, k: 2, fill: col, outline: '#2A1208', align: 'center', a: 1 - Math.max(0, u - 0.7) / 0.3 }); };
      dmg('1,200', 2.55, BX + 420, BY + 120); dmg('2,700', 4.65, BX + 480, BY + 160);
      if (long) dmg('+57 GAMES', healAt + 0.2, 1580, 300, '#8CFFB0');
      dmg('0.9 MS', finAt + 0.05, BX + 420, BY + 100, '#F7C948');
      // windows: commands (left) and the boss's HP (right)
      const ui = Ease.outC(clamp((b - 0.5) / 0.4)); ctx.save(); ctx.translate(0, (1 - ui) * 340);
      HD.win(ctx, 60, 760, 640, 300); HD.win(ctx, 740, 760, 1120, 300);
      const cmds = ['HOT RELOAD', '3X FASTER', long ? 'CLOUD SAVES' : 'ALL TOGETHER'], sel = b < 3.6 ? 0 : b < (long ? healAt - 0.5 : finAt - 0.5) ? 1 : 2;
      cmds.forEach((c, i) => HD.ptext(ctx, c, 140, 786 + i * 84, { fam: 'DotGothic16', size: 16, fill: i === sel ? '#F7C948' : '#FFFFFF' }));
      if (b > 1 && Math.floor(lt * 6) % 2) { const y = 808 + sel * 84; ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.moveTo(90, y); ctx.lineTo(120, y + 15); ctx.lineTo(90, y + 30); ctx.closePath(); ctx.fill(); }
      const hp = Math.max(0, 9999 - (b > 2.5 ? 1200 : 0) - (b > 4.6 ? 2700 : 0) - (b > finAt ? 6099 : 0));
      HD.ptext(ctx, 'BUG BOSS', 800, 786, { fam: 'DotGothic16', size: 16, fill: '#FFFFFF' });
      HD.ptext(ctx, `HP ${hp}`, 1800, 786, { fam: 'DotGothic16', size: 16, fill: hp ? '#FFFFFF' : '#F0607A', align: 'right' });
      HD.ptext(ctx, 'FRAME TIME 0.9 MS', 800, 960, { fam: 'DotGothic16', size: 16, fill: '#8EC5FF' });
      ctx.fillStyle = '#141420'; ctx.fillRect(800, 885, 1000, 30); ctx.fillStyle = hp > 3000 ? '#7CE36A' : '#F0607A'; ctx.fillRect(805, 890, Math.round(990 * hp / 9999 / S) * S, 20);
      ctx.restore();
      // the transition in: the world map shatters into spinning blocks
      if (b < 0.5) {
        if (!SNAP) { SNAP = makeBuf(W, H); SNAP.g.imageSmoothingEnabled = false; SNAP.g.drawImage(window.FLIGHT_M7({ hz: 66, h: 34, x: 128 + Math.sin(1.9 * 0.3) * 20, y: 200 - 1.9 * 26, a: 2.6 + 1.9 * 0.16 }), 0, 0, W, H); }
        const u = Ease.inQ(b / 0.5), BS = 120;
        for (let y = 0; y < H; y += BS) for (let x = 0; x < W; x += BS) {
          const h = hash(x * 0.13 + y * 0.71), a = u * (2 + h * 4) * (h > 0.5 ? 1 : -1), dx = (x - W / 2) * u * 1.4, dy = (y - H / 2) * u * 1.4;
          ctx.save(); ctx.globalAlpha = 1 - u; ctx.translate(x + BS / 2 + dx, y + BS / 2 + dy); ctx.rotate(a); ctx.scale(1 - u * 0.6, 1 - u * 0.6);
          ctx.drawImage(SNAP.c, x, y, BS, BS, -BS / 2, -BS / 2, BS, BS); ctx.restore();
        }
      }
    },
  };
})();
