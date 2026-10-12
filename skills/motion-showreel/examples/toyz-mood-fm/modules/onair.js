// onair: the drawing shared by the hook, tune and pad scenes (a project module): the app's on-air stage at a dial
// position t (0 = 고요 88.1 … 7 = 들뜸 106.1): the whole frame in that mood's stage gradient, the ticker, the FM tuner
// along the foot with its coral needle, and (o.full) the frequency, the station, the track and the mood pad.
(() => {
  const M = MF;
  const FX0 = 150, FX1 = 1770, fx = (f) => FX0 + (f - 87.5) / (108 - 87.5) * (FX1 - FX0);
  function tuner(ctx, f, ink, o = {}) {
    const y0 = 868, y1 = 1012;
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
    rr(ctx, 120, y0, 1680, y1 - y0, 22); ctx.fillStyle = 'rgba(11,11,12,0.28)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = ink; ctx.globalAlpha *= 0.55; ctx.beginPath();
    for (let v = 88; v <= 108.001; v += 0.5) { const x = Math.round(fx(v)) + 0.5, major = Math.abs(v - Math.round(v / 2) * 2) < 0.01; ctx.moveTo(x, y0 + 46); ctx.lineTo(x, y0 + 46 - (major ? 18 : 9)); }
    ctx.stroke(); ctx.globalAlpha /= 0.55;
    ctx.font = `600 17px ${FAM.mono}`; ctx.fillStyle = ink; ctx.textAlign = 'center';
    for (let v = 88; v <= 108; v += 2) { ctx.globalAlpha *= 0.7; ctx.fillText(String(v), fx(v), y0 + 70); ctx.globalAlpha /= 0.7; }
    const cur = M.nearest(...Object.values(M.dialToMood(o.t ?? 0)));
    M.STATIONS.forEach(s => { const on = s.id === cur.id, x = fx(s.freq);
      if (on) { rr(ctx, x - 44, y0 + 84, 88, 50, 10); ctx.fillStyle = 'rgba(246,242,238,0.92)'; ctx.fill(); }
      ctx.font = `800 22px ${FAM.display}`; ctx.fillStyle = on ? '#0b0b0c' : ink; ctx.fillText(s.name, x, y0 + 110); ctx.font = `500 14px ${FAM.mono}`; ctx.globalAlpha *= on ? 1 : 0.7; ctx.fillText(s.freq.toFixed(1), x, y0 + 127); ctx.globalAlpha /= on ? 1 : 0.7; });
    // the needle
    const x = fx(f); ctx.save(); ctx.shadowColor = 'rgba(240,132,100,0.8)'; ctx.shadowBlur = 14; ctx.fillStyle = '#F08464'; ctx.fillRect(x - 2, y0 + 10, 4, 74); circle(ctx, x, y0 + 10, 7); ctx.fill(); ctx.restore();
    ctx.restore();
  }
  function pad(ctx, px, py, size, mood, ink, o = {}) {
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
    ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18; rr(ctx, px, py, size, size, 24 * size / 500); ctx.fillStyle = '#222'; ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.save(); rr(ctx, px, py, size, size, 24 * size / 500); ctx.clip(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(M.padMap(), px, py, size, size);
    const g = ctx.createLinearGradient(px, py, px + size * 0.6, py + size); g.addColorStop(0, 'rgba(255,255,255,0.3)'); g.addColorStop(0.32, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(px, py, size, size);
    const mx = px + mood.x * size, my = py + (1 - mood.y) * size;
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(mx, py); ctx.lineTo(mx, py + size); ctx.moveTo(px, my); ctx.lineTo(px + size, my); ctx.stroke();
    M.STATIONS.forEach(s => { const x = px + s.x * size, y = py + (1 - s.y) * size, k = size / 500; ctx.strokeStyle = 'rgba(11,11,12,0.6)'; ctx.lineWidth = 1.5; circle(ctx, x, y, 4 * k); ctx.stroke();
      ctx.font = `700 ${15 * k}px ${FAM.display}`; const w = ctx.measureText(s.name).width + 14 * k; rr(ctx, x - w / 2, y + 7 * k, w, 22 * k, 11 * k); ctx.fillStyle = 'rgba(11,11,12,0.55)'; ctx.fill(); ctx.fillStyle = '#F6F2EE'; ctx.textAlign = 'center'; ctx.fillText(s.name, x, y + 23 * k); });
    ctx.restore();
    // the puck: a chrome ball
    const qx = px + mood.x * size, qy = py + (1 - mood.y) * size, r = 22 * (o.puck ?? 1) * size / 500;
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6; const b = ctx.createRadialGradient(qx - r * 0.35, qy - r * 0.45, 0, qx, qy, r * 1.05);
    b.addColorStop(0, '#ffffff'); b.addColorStop(0.35, '#d9d9de'); b.addColorStop(0.7, '#6d6d73'); b.addColorStop(1, '#e8e8ec'); circle(ctx, qx, qy, r); ctx.fillStyle = b; ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(240,132,100,0.9)'; ctx.lineWidth = 2; circle(ctx, qx, qy, r + 3); ctx.stroke();
    ctx.restore();
  }
  // the frequency as the app sets it: 900, -0.065em, tabular, the dot is the on-air lamp
  function freq(ctx, f, x, y, size, ink, on) {
    ctx.save(); ctx.font = `900 ${size}px ${FAM.display}`; if ('letterSpacing' in ctx) ctx.letterSpacing = `${-0.065 * size}px`; ctx.fillStyle = ink;
    const s = f.toFixed(1), [a, b] = s.split('.'); ctx.fillText(a, x, y); const wa = ctx.measureText(a).width;
    ctx.save(); if (on > 0.5) { ctx.strokeStyle = ink; ctx.lineWidth = size * 0.07; ctx.lineJoin = 'round'; ctx.strokeText('.', x + wa, y);   // the app's ink outline (text-stroke 0.035em, painted under)
      ctx.fillStyle = '#F08464'; ctx.shadowColor = 'rgba(240,132,100,0.75)'; ctx.shadowBlur = size * 0.2; } ctx.fillText('.', x + wa, y); ctx.restore();
    const wd = ctx.measureText('.').width; ctx.fillText(b, x + wa + wd, y); const w = wa + wd + ctx.measureText(b).width;
    ctx.font = `600 ${size * 0.15}px ${FAM.mono}`; if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'; ctx.fillText('MHz', x + w + size * 0.08, y - size * 0.55); ctx.restore(); return w; }
  MF.tuner = tuner; MF.pad = pad; MF.freq = freq; MF.fxOf = fx;
})();
