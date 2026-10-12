// tinybeat: the Tiny Beat reel's shared kit (a project module). The device stage (near black, a soft lime glow),
// the captured panels, and the sequencer played in time: the playhead is locked to the reel's own bar grid (16 steps
// per bar, from the scene time), and each pad the app shows lit (pads.json, read from the captures) flashes as it
// passes. A row of LEDs counts steps like the device's beat lights.
(() => {
  const meta = {};
  function layer(name) {
    const has = (n) => ('captures/ui/app/' + n + '.json') in ASSETS;
    if (!meta[name]) meta[name] = has(name) ? ASSET('captures/ui/app/' + name + '.json') : null;
    const j = meta[name], L = j && j.layers ? j.layers[0] : j;
    return { img: IMG['captures/ui/app/' + name], L, w: L ? L.rect.w : 0, h: L ? L.rect.h : 0 };
  }
  function draw(ctx, name, x, y, k = 1, o = {}) {
    const { img, L } = layer(name); if (!img) return;
    const d = L ? img.width / L.rect.w : 2;                                 // image px per CSS px (2 as captured, less once resized)
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
    if (o.crop) { const [cx, cy, cw, ch] = o.crop; ctx.drawImage(img, cx * d, cy * d, cw * d, ch * d, x + cx * k, y + cy * k, cw * k, ch * k); }
    else ctx.drawImage(img, x, y, img.width / d * k, img.height / d * k);
    ctx.restore();
  }
  let PADS = null; const pads = () => (PADS || (PADS = ASSET('captures/ui/app/pads.json')));
  function stage(ctx, t, o = {}) {
    ctx.fillStyle = '#060607'; ctx.fillRect(0, 0, W, H);
    const gx = o.glowX ?? 960, gy = o.glowY ?? 600, g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 1000);
    g.addColorStop(0, `rgba(198,244,50,${o.glow ?? 0.07})`); g.addColorStop(1, 'rgba(198,244,50,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // the device's fine top line and screws
    if (o.frame !== false) { ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1; ctx.strokeRect(40.5, 40.5, W - 81, H - 81);
      for (const [x, y] of [[58, 58], [W - 58, 58], [58, H - 58], [W - 58, H - 58]]) { const sg = ctx.createRadialGradient(x - 2, y - 2, 0, x, y, 8); sg.addColorStop(0, '#f4f4f5'); sg.addColorStop(1, '#5d5d62'); ctx.fillStyle = sg; circle(ctx, x, y, 6); ctx.fill(); } }
  }
  // the step (0..15) and the fraction within it, from the scene time: one bar = 16 steps
  const stepAt = (t, env) => { const s = t / env.beatSec * 4; return { i: Math.floor(s) % 16, f: s - Math.floor(s), n: Math.floor(s) }; };
  // the captured sequencer at (x, y) with k px per CSS px, played: o.genre picks the pad states; o.play 0..1 fades it in
  function sequencer(ctx, name, x, y, k, t, env, o = {}) {
    draw(ctx, name, x, y, k, { alpha: o.alpha });
    const P = pads(); if (!P || o.play === 0) return;
    const st = P.states[o.genre || 'lofi'], { i, f } = stepAt(t, env), a = (o.play ?? 1) * (o.alpha ?? 1);
    const col = P.rows[0].pads[i], top = P.rows[0].pads[i][1], bot = P.rows[P.rows.length - 1].pads[i][1] + P.rows[P.rows.length - 1].pads[i][3];
    const X = (px) => x + (px + 16) * k, Y = (py) => y + (py + 16) * k;
    ctx.save(); ctx.globalAlpha *= a * 0.9;
    const g = ctx.createLinearGradient(0, Y(top) - 10, 0, Y(bot) + 10); g.addColorStop(0, 'rgba(226,255,122,0.06)'); g.addColorStop(0.5, 'rgba(226,255,122,0.16)'); g.addColorStop(1, 'rgba(226,255,122,0.06)');
    ctx.fillStyle = g; rr(ctx, X(col[0]) - 4 * k, Y(top) - 8 * k, (col[2] + 8) * k, (bot - top + 16) * k, 8 * k); ctx.fill();
    ctx.strokeStyle = 'rgba(243,243,241,0.75)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    P.rows.forEach((r, ri) => {
      const v = st[ri][i]; if (!v) return;
      const p = r.pads[i], hit = Math.exp(-f * 3.2) * (v === 2 ? 1 : 0.75);
      ctx.save(); ctx.globalAlpha *= a * hit; ctx.globalCompositeOperation = 'lighter';
      const cx = X(p[0] + p[2] / 2), cy = Y(p[1] + p[3] / 2), R = p[2] * k * (0.9 + 0.5 * (1 - f));
      const gg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R); gg.addColorStop(0, 'rgba(242,255,196,0.95)'); gg.addColorStop(0.45, 'rgba(198,244,50,0.55)'); gg.addColorStop(1, 'rgba(198,244,50,0)');
      ctx.fillStyle = gg; ctx.fillRect(cx - R, cy - R, R * 2, R * 2); ctx.restore();
    });
  }
  // sixteen LEDs; lit up to the current step, the current one hot
  function leds(ctx, x, y, w, t, env, o = {}) {
    const { i, f } = stepAt(t, env), gap = w / 16;
    for (let k = 0; k < 16; k++) {
      const on = k === i, past = o.fill ? k < i : false, cx = x + gap * (k + 0.5);
      ctx.fillStyle = on ? '#E2FF7A' : past ? '#5B7412' : (k % 4 === 0 ? '#2A2A30' : '#1A1A1E'); rr(ctx, cx - gap * 0.3, y - 7, gap * 0.6, 14, 4); ctx.fill();
      if (on) { ctx.save(); ctx.globalAlpha *= 0.6 * Math.exp(-f * 2); ctx.shadowColor = '#C6F432'; ctx.shadowBlur = 24; rr(ctx, cx - gap * 0.3, y - 7, gap * 0.6, 14, 4); ctx.fill(); ctx.restore(); }
    }
  }
  function label(ctx, s, x, y, o = {}) {
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.font = `${o.weight || 600} ${o.size || 22}px ${FAM.mono}`; ctx.fillStyle = o.color || '#8F8F97';
    const ls = (o.size || 22) * 0.16; let w = 0; for (const ch of s) w += ctx.measureText(ch).width + ls; w -= ls;
    let cx = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x; for (const ch of s) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + ls; }
    ctx.restore(); return w;
  }
  function headline(ctx, lines, x, y, lt, o = {}) {
    const size = o.size || 100, gap = o.gap ?? size * 1.14;
    lines.forEach((s, i) => kinetic(ctx, s, x, y + i * gap, lt - (o.step ?? 0.3) * i, { size, fam: 'display', weight: 850, color: (o.colors || ['#F3F3F1', '#C6F432'])[i], ls: -0.04 * size,
      stagger: 0.026, dur: 0.5, rise: 0.45 * size, blur: 6, align: o.align, out: o.out, alpha: o.alpha, glow: i === 1 ? 'rgba(198,244,50,0.35)' : undefined, glowBlur: 26 }));
  }
  window.TINY = { layer, draw, pads, stage, stepAt, sequencer, leds, label, headline };
})();
