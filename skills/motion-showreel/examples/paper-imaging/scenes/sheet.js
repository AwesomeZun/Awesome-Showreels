// sheet (2 bars, 3 in the 30): panel b, one plane at a time. The embryo turns slowly; a thin light sheet (a bright
// vertical plane from the left) scans across it and back on an even pace; the nuclei inside the sheet light up full,
// the rest stay dim. The inset (right) shows that plane as a 2D section, updating as the sheet moves, with a 50 um
// scale bar and the plane's position in DM Mono. Hold: the scan keeps going, the section keeps redrawing.
(() => {
  SCENES['sheet'] = {
    draw(ctx, t, env) {
      const E = window.EMB, D = E.data(), B = env.beatSec, b = env.lt / B;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      E.label(ctx, 'b', 'A light sheet images one plane at a time', clamp(b * 2));
      const yaw = -0.6 + t * 0.06, CX = 700, CY = 580, SC = 360, sx = Math.sin(env.lt / (4 * B) * Math.PI) * 1.15;   // the sheet's x in embryo units
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const sect = [];
      D.nuclei.forEach((n) => {
        const [x, y, z] = E.proj(n, yaw, 0.3, CX, CY, SC), inside = Math.abs(n[0] - sx) < 0.06, depth = clamp(0.5 - z * 0.3, 0.25, 0.9);
        E.glow(ctx, x, y, E.CH.nuc, inside ? 4.5 : 2.6, inside ? 1 : 0.22 * depth);
        if (n[4]) E.glow(ctx, x, y, E.CH.noto, 4, inside ? 1 : 0.3);
        if (inside) sect.push(n);
      });
      // the sheet itself: a translucent plane drawn through the projected corners at x = sx
      const corners = [[sx, -1.2, -1.2], [sx, 1.2, -1.2], [sx, 1.2, 1.2], [sx, -1.2, 1.2]].map((p) => E.proj(p, yaw, 0.3, CX, CY, SC));
      ctx.fillStyle = rgba('#9FD8FF', 0.07); ctx.beginPath(); corners.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgba('#CFEAFF', 0.35); ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore(); ctx.globalAlpha = 1;
      // the inset section
      const IX = 1300, IY = 300, IW = 520, IH = 520, ia = clamp((b - 1) * 2);
      ctx.save(); ctx.globalAlpha = ia; ctx.strokeStyle = rgba('#FFFFFF', 0.35); ctx.lineWidth = 1.5; ctx.strokeRect(IX, IY, IW, IH); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.rect(IX, IY, IW, IH); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
      sect.forEach((n) => { const x = IX + IW / 2 + n[2] * 200, y = IY + IH / 2 - n[1] * 200; E.glow(ctx, x, y, E.CH.nuc, 7, ia); if (n[3]) E.glow(ctx, x + 2, y - 2, E.CH.mem, 6, 0.6 * ia); if (n[4]) E.glow(ctx, x, y, E.CH.noto, 8, ia); });
      ctx.restore(); ctx.globalAlpha = 1;
      E.scalebar(ctx, IX + IW - 150, IY + IH - 30, 120, '50 µm', ia);
      E.txt(ctx, `section x = ${(sx * 280).toFixed(0).padStart(4, ' ')} µm`, IX, IY - 20, { size: 20, mono: true, color: '#FFFFFF', a: ia });
      E.stamp(ctx, '10.0 hpf', 96, 1000, clamp(b));
    },
  };
})();
