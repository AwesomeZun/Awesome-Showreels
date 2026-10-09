// ps: the Perturb-seq preprint's figure kit (a project module). Dark panels, a diverging cyan-slate-magenta scale,
// one colour per programme across every panel, Plex Sans for sentences and Plex Mono for genes and numbers.
// Exposes window.PS. Pure in its arguments.
(() => {
  let D = null;
  const data = () => (D || (D = ASSET('data/screen.json')));
  const PROG = ['#F472B6', '#FBBF24', '#34D399', '#60A5FA', '#A78BFA'];
  // diverging: -2 cyan .. 0 slate .. +2 magenta
  function div(v) { const u = clamp(v / 2, -1, 1); return u < 0 ? toHex(mix('#1E293B', '#22D3EE', Math.pow(-u, 0.8))) : toHex(mix('#1E293B', '#E879F9', Math.pow(u, 0.8))); }
  function txt(ctx, s, x, y, o = {}) {
    ctx.save(); ctx.font = `${o.weight || 400} ${o.size || 24}px ${o.mono ? FAM.mono : FAM.sans}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${o.ls ?? 0}px`;
    ctx.textAlign = o.align || 'left'; ctx.fillStyle = o.color || C.ink; ctx.globalAlpha *= o.a ?? 1;
    const str = o.n !== undefined ? String(s).slice(0, Math.max(0, Math.floor(o.n))) : String(s);
    ctx.fillText(str, x, y); const w = ctx.measureText(String(s)).width; ctx.restore(); return w;
  }
  function rise(ctx, s, x, y, p, o = {}) {
    if (p <= 0) return; const e = Ease.outExpo(clamp(p)), size = o.size || 24;
    ctx.save(); ctx.beginPath(); ctx.rect(0, y - size * 1.1, W, size * 1.45); ctx.clip();
    txt(ctx, s, x, y + (1 - e) * size, { ...o, a: (o.a ?? 1) * clamp(p * 3) }); ctx.restore();
  }
  // panel chrome: label letter + title, top left; a thin rule; the preprint tag top right
  function chrome(ctx, letter, title, a = 1) {
    ctx.save(); ctx.globalAlpha *= a;
    txt(ctx, 'PREPRINT · 2026', W - 96, 84, { size: 18, mono: true, color: C.muted, align: 'right', ls: 1.5 });
    if (letter) { txt(ctx, letter, 96, 92, { size: 40, weight: 700, color: C.accent }); }
    txt(ctx, title, letter ? 140 : 96, 90, { size: 26, weight: 600, color: C.ink });
    ctx.fillStyle = C.line; ctx.fillRect(96, 112, W - 192, 1.5);
    ctx.restore();
  }
  function bg(ctx) {
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = radial(ctx, W * 0.75, H * 0.2, 0, W * 0.7, [[0, rgba('#E879F9', 0.06)], [1, rgba('#E879F9', 0)]]); ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = radial(ctx, W * 0.15, H * 0.9, 0, W * 0.6, [[0, rgba('#22D3EE', 0.05)], [1, rgba('#22D3EE', 0)]]); ctx.fillRect(0, 0, W, H);
  }
  window.PS = { data, PROG, div, txt, rise, chrome, bg };
})();
