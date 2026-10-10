// lineage (2 bars, the 30 only): one founder, eighteen hours. From one cell at 6 hpf the tree grows downward with the
// clock, each division a fork. Until 8 hpf its branches are white; at the 8-hpf division one side turns notochord green
// and the other muscle magenta: that is the decision. The notochord marker only switches on at 10 hpf (a dashed line),
// two hours later; the gap is bracketed. Commitment times of all four lineages sit on the time axis.
(() => {
  const TOP = 190, BOT = 930, X0 = 760, X1 = 1780;
  const yOf = (h) => TOP + (h - 6) / 18 * (BOT - TOP);
  let LAY = null;
  function layout() {
    if (LAY) return LAY;
    const f = LS.data().founder, leaves = [];
    (function walk(n) { if (n.kids) n.kids.forEach(walk); else leaves.push(n); })(f);
    leaves.forEach((l, i) => { l.x = X0 + (i + 0.5) / leaves.length * (X1 - X0); });
    (function place(n) { if (n.kids) { n.kids.forEach(place); n.x = n.kids.reduce((s, k) => s + k.x, 0) / n.kids.length; } })(f);
    LAY = f; return f;
  }
  const COLOR = { uncommitted: '#F1F5F9', notochord: '#4BFF6A', muscle: '#FF3EC8' };
  SCENES['lineage'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, n = Math.round(env.dur / B), d = LS.data();
      const now = 6 + 18 * Ease.ioSine(clamp((b - 0.2) / (n - 1.6)));
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      LS.txt(ctx, 'd   The lineage of one notochord founder', 96, 96, { size: 26, weight: 600 });
      // the time axis with every lineage's commitment
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(700, TOP); ctx.lineTo(700, BOT); ctx.stroke();
      for (let h = 6; h <= 24; h += 3) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(694, yOf(h) - 1, 12, 2); LS.txt(ctx, `${h} hpf`, 680, yOf(h) + 7, { size: 18, mono: true, align: 'right', color: 'rgba(255,255,255,0.6)' }); }
      d.lineages.forEach((l, i) => { const y = yOf(d.commit[i]), a = clamp((now - d.commit[i]) * 2); ctx.fillStyle = rgba(LS.LINC[i], a); circle(ctx, 700, y, 7); ctx.fill(); LS.txt(ctx, `${l} ${d.commit[i].toFixed(1)}`, 560, y + 6, { size: 18, mono: true, align: 'right', color: LS.LINC[i], a }); });
      // the tree, grown up to now
      ctx.save(); ctx.lineCap = 'round'; ctx.globalCompositeOperation = 'lighter';
      (function draw(nd) {
        const y0 = yOf(nd.t0), y1 = yOf(Math.min(nd.t1, now)); if (now < nd.t0) return;
        const col = COLOR[nd.fate] || '#fff';
        ctx.strokeStyle = rgba(col, 0.9); ctx.lineWidth = 2.5; ctx.shadowColor = col; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.moveTo(nd.x, y0); ctx.lineTo(nd.x, y1); ctx.stroke();
        if (nd.kids && now >= nd.t1) { ctx.beginPath(); ctx.moveTo(nd.kids[0].x, y1); ctx.lineTo(nd.kids[1].x, y1); ctx.stroke(); nd.kids.forEach(draw); }
      })(layout());
      ctx.restore();
      // the decision and the marker
      const dk = clamp((now - 8) * 2), mk = clamp((now - 10) * 2);
      if (dk > 0) { LS.txt(ctx, 'commits · 8 hpf', X1 + 20, yOf(8) + 8, { size: 24, mono: true, color: LS.COL.noto, a: dk, glow: rgba(LS.COL.noto, 0.5) }); ctx.strokeStyle = rgba(LS.COL.noto, 0.6 * dk); ctx.setLineDash([2, 6]); ctx.beginPath(); ctx.moveTo(X0 - 20, yOf(8)); ctx.lineTo(X1 + 10, yOf(8)); ctx.stroke(); ctx.setLineDash([]); }
      if (mk > 0) {
        ctx.strokeStyle = rgba('#FFFFFF', 0.5 * mk); ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(X0 - 20, yOf(10)); ctx.lineTo(X1 + 10, yOf(10)); ctx.stroke(); ctx.setLineDash([]);
        LS.txt(ctx, 'marker on · 10 hpf', X1 + 20, yOf(10) + 8, { size: 24, mono: true, color: 'rgba(255,255,255,0.8)', a: mk });
        const e = Ease.outExpo(clamp((now - 10.4) * 1.5));
        if (e > 0) { ctx.strokeStyle = rgba(LS.COL.noto, e); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X1 + 300, yOf(8)); ctx.lineTo(X1 + 312, yOf(8)); ctx.lineTo(X1 + 312, yOf(10)); ctx.lineTo(X1 + 300, yOf(10)); ctx.stroke(); LS.txt(ctx, '2 h', X1 + 326, (yOf(8) + yOf(10)) / 2 + 8, { size: 26, weight: 700, color: LS.COL.noto, a: e }); }
      }
      LS.stamp(ctx, now, 1);
      LS.rise(ctx, 'One founder at 6 hpf.', 96, 300, (b - 0.4) / 0.6, { size: 34, weight: 600 });
      LS.rise(ctx, 'At 8 hpf its daughters part:', 96, 350, (b - 2) / 0.6, { size: 26, color: 'rgba(226,232,240,0.85)' });
      LS.rise(ctx, 'notochord on one side, muscle on the other.', 96, 386, (b - 2.2) / 0.6, { size: 26, color: 'rgba(226,232,240,0.85)' });
    },
  };
})();
