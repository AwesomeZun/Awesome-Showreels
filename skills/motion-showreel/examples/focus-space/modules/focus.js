// focus: the FOCUS SPACE reel's shared kit (a project module). The room's background (the app's deep green with its
// soft top light and fine noise), the stacked wordmark (FOCUS in sage, SPACE in its chrome gradient), and the timer
// ring drawn from the app's own SVG (TimerCard.tsx Ring, viewBox 400: glass disc r152, sixty ticks from r183/187 to
// r193, track r168 at 13, the progress tube in its chrome gradient with a darker edge and a fine shine, the knob) on
// the arched room the app draws (captured with its ring and clock hidden), and its clock (21cqi, 750, -0.05em).
(() => {
  const ARCH = { pad: 40, w: 472, ring: [22.734, 22.734, 426.53], time: [115.92, 172.48, 240.16, 82.41] };
  function draw(ctx, name, x, y, k = 1, o = {}) { const img = IMG['captures/ui/app/' + name]; if (!img) return; const has = ('captures/ui/app/' + name + '.json') in ASSETS;
    let r = has ? ASSET('captures/ui/app/' + name + '.json').rect : null; if (!r) { const g = ASSET('captures/ui/app/' + name.replace(/_\d+$/, '') + '.json'); r = (g.layers.find(l => l.file === name + '.png') || g.layers[0]).rect; }
    const d = img.width / r.w; ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; if (o.crop) { const [cx, cy, cw, ch] = o.crop; ctx.drawImage(img, cx * d, cy * d, cw * d, ch * d, x + (o.cropAt ? cx * k : 0), y + (o.cropAt ? cy * k : 0), cw * k, ch * k); } else ctx.drawImage(img, x, y, r.w * k, r.h * k); ctx.restore(); }
  let noise = null; function noiseTile() { if (noise) return noise; const b = makeBuf(180, 180), id = b.g.createImageData(180, 180);
    for (let i = 0; i < 32400; i++) { const v = hash(i * 1.93 + 11) * 255; id.data[i * 4] = v * 0.84; id.data[i * 4 + 1] = v * 0.86; id.data[i * 4 + 2] = v * 0.8; id.data[i * 4 + 3] = 13; } b.g.putImageData(id, 0, 0); return (noise = b.c); }
  function room(ctx, t, o = {}) { ctx.fillStyle = '#14241A'; ctx.fillRect(0, 0, W, H);
    const gx = (o.gx ?? 960) + Math.sin(t * 0.3) * 60, g = ctx.createRadialGradient(gx, -130, 0, gx, -130, 1150); g.addColorStop(0, 'rgba(214,220,205,0.1)'); g.addColorStop(0.62, 'rgba(214,220,205,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const v = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.3, W / 2, H * 0.55, H * 1.1); v.addColorStop(0, 'rgba(14,26,18,0)'); v.addColorStop(1, 'rgba(14,26,18,0.85)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.fillStyle = ctx.createPattern(noiseTile(), 'repeat'); ctx.fillRect(0, 0, W, H); ctx.restore(); }
  const EM = [[0, '#ffffff'], [0.36, '#e2e8dc'], [0.52, '#b4c0ae'], [0.57, '#ffffff'], [0.585, '#6e7d6a'], [0.76, '#a6b3a1'], [1, '#e9eee3']];
  // the stacked wordmark at (x, y) = top-left of FOCUS's cap height, font size s
  function wordmark(ctx, x, y, s, lt, o = {}) {
    const ls = -0.06 * s, gap = s * 0.86;
    kinetic(ctx, 'FOCUS', x, y + s * 0.74, lt, { size: s, fam: 'display', weight: 900, color: '#D6DCCD', ls, stagger: 0.04, dur: 0.5, rise: s * 0.3, blur: 6, align: o.align, out: o.out });
    const g = ctx.createLinearGradient(0, -s * 0.74, 0, s * 0.26); EM.forEach(([p, c]) => g.addColorStop(p, c));
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowOffsetY = 1;
    kinetic(ctx, 'SPACE', x, y + gap + s * 0.74, lt - 0.12, { size: s, fam: 'display', weight: 900, color: g, ls, stagger: 0.04, dur: 0.5, rise: s * 0.3, blur: 6, align: o.align, out: o.out }); ctx.restore();
  }
  // the ring at (x, y) top-left, scale k (px per viewBox unit), progress p (0..1)
  function ring(ctx, x, y, k, p, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    const gl = ctx.createRadialGradient(200, 200 - 152 * 0.44, 0, 200, 200 - 152 * 0.44, 152 * 1.5); gl.addColorStop(0, 'rgba(214,220,205,0.1)'); gl.addColorStop(1, 'rgba(214,220,205,0)');
    circle(ctx, 200, 200, 152); ctx.fillStyle = gl; ctx.fill(); ctx.strokeStyle = 'rgba(214,220,205,0.08)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.lineCap = 'round'; for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2 - Math.PI / 2, major = i % 5 === 0, r1 = major ? 183 : 187;
      ctx.strokeStyle = major ? 'rgba(214,220,205,0.5)' : 'rgba(214,220,205,0.2)'; ctx.lineWidth = major ? 1.6 : 1.2; ctx.beginPath(); ctx.moveTo(200 + r1 * Math.cos(a), 200 + r1 * Math.sin(a)); ctx.lineTo(200 + 193 * Math.cos(a), 200 + 193 * Math.sin(a)); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(214,220,205,0.08)'; ctx.lineWidth = 13; ctx.beginPath(); ctx.arc(200, 200, 168, 0, Math.PI * 2); ctx.stroke();
    if (p > 0.001) { const e = -Math.PI / 2 + Math.PI * 2 * Math.min(1, p);
      ctx.strokeStyle = 'rgba(4,10,6,0.55)'; ctx.lineWidth = 16.5; ctx.beginPath(); ctx.arc(200, 200, 168, -Math.PI / 2, e); ctx.stroke();
      const g = ctx.createLinearGradient(40, 30, 360, 370); [[0, '#ffffff'], [0.2, '#99a296'], [0.4, '#f7f9f4'], [0.58, '#5f6a5e'], [0.76, '#e2e6dd'], [1, '#99a296']].forEach(([q, c]) => g.addColorStop(q, c));
      ctx.save(); ctx.shadowColor = 'rgba(20,36,26,0.25)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 2; ctx.strokeStyle = g; ctx.lineWidth = 13; ctx.beginPath(); ctx.arc(200, 200, 168, -Math.PI / 2, e); ctx.stroke(); ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(200, 200, 166.5, -Math.PI / 2, e); ctx.stroke(); }
    const a = -Math.PI / 2 + Math.PI * 2 * p, kx = 200 + 168 * Math.cos(a), ky = 200 + 168 * Math.sin(a);
    ctx.save(); ctx.shadowColor = 'rgba(20,36,26,0.4)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 3; const kg = ctx.createRadialGradient(kx - 12 * 0.3, ky - 12 * 0.4, 0, kx, ky, 12 * 1.2);
    kg.addColorStop(0, '#ffffff'); kg.addColorStop(0.45, '#dfe4da'); kg.addColorStop(1, '#7c867a'); circle(ctx, kx, ky, 12); ctx.fillStyle = kg; ctx.fill(); ctx.restore();
    ctx.strokeStyle = 'rgba(39,64,43,0.35)'; ctx.lineWidth = 1; circle(ctx, kx, ky, 12); ctx.stroke();
    if (o.glow) { ctx.save(); ctx.globalAlpha *= o.glow; ctx.shadowColor = 'rgba(214,220,205,0.8)'; ctx.shadowBlur = 30; ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(200, 200, 168, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
    ctx.restore();
  }
  const clock = (s) => { s = Math.max(0, Math.round(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
  // the room (arch capture) at (x, y), scale k, with the ring at progress p and the clock showing secs
  // the arch frame (index.css .arch__frame: 50cqi round top, 30px bottom corners), in capture CSS px
  function framePath(ctx, x, y, k) { const L = 40, R = 512, T = 40, Bt = 698, r = 236, c = 30;
    ctx.beginPath(); ctx.moveTo(x + L * k, y + (T + r) * k); ctx.arc(x + (L + r) * k, y + (T + r) * k, r * k, Math.PI, 0); ctx.lineTo(x + R * k, y + (Bt - c) * k);
    ctx.quadraticCurveTo(x + R * k, y + Bt * k, x + (R - c) * k, y + Bt * k); ctx.lineTo(x + (L + c) * k, y + Bt * k); ctx.quadraticCurveTo(x + L * k, y + Bt * k, x + L * k, y + (Bt - c) * k); ctx.closePath(); }
  function arch(ctx, name, x, y, k, p, secs, o = {}) {
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.shadowColor = 'rgba(0,0,0,0.75)'; ctx.shadowBlur = 80 * k; ctx.shadowOffsetY = 40 * k; framePath(ctx, x, y, k); ctx.fillStyle = '#17291D'; ctx.fill(); ctx.restore();
    ctx.save(); framePath(ctx, x, y, k); ctx.rect(x + 40 * k, y + 700 * k, 472 * k, 60 * k); ctx.clip(); draw(ctx, name, x, y, k, { alpha: o.alpha }); ctx.restore();
    const R = ARCH.ring, P = ARCH.pad; ring(ctx, x + (P + R[0]) * k, y + (P + R[1]) * k, R[2] / 400 * k, p, { glow: o.glow });
    const T = ARCH.time, size = 0.21 * ARCH.w * k; ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.font = `750 ${size}px ${FAM.display}`; if ('letterSpacing' in ctx) ctx.letterSpacing = `${-0.05 * size}px`;
    ctx.fillStyle = '#D6DCCD'; ctx.textAlign = 'center'; ctx.fillText(clock(secs), x + (P + T[0] + T[2] / 2) * k, y + (P + T[1] + T[3] * 0.83) * k); ctx.restore();
  }
  function spaced(ctx, s, x, y, size, ls, align) { let w = 0; for (const ch of s) w += ctx.measureText(ch).width + size * ls; w -= size * ls; let cx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x; for (const ch of s) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + size * ls; } return w; }
  function label(ctx, s, x, y, o = {}) { ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.font = `${o.weight || 600} ${o.size || 20}px ${FAM.mono}`; ctx.fillStyle = o.color || '#BCC7B6'; const w = spaced(ctx, s, x, y, o.size || 20, 0.14, o.align); ctx.restore(); return w; }
  function headline(ctx, lines, x, y, lt, o = {}) { const size = o.size || 76, gap = o.gap ?? size * 1.16;
    lines.forEach((s, i) => kinetic(ctx, s, x, y + i * gap, lt - (o.step ?? 0.24) * i, { size, fam: 'display', weight: 800, color: o.color || '#E9EDE3', ls: -0.04 * size, stagger: 0.026, dur: 0.6, rise: 0.3 * size, blur: 8, align: o.align, out: o.out })); }
  window.FS = { ARCH, draw, room, wordmark, ring, arch, clock, label, headline, spaced };
})();
