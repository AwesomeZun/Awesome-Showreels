// stack (2 bars): the sheet builds the embryo. A horizontal sheet of light sweeps down through the 10-hpf embryo from
// the animal pole; the nuclei inside the sheet flare, and every plane it has passed stays lit, so the embryo is stacked
// one section at a time (4,812 nuclei on the GPU, additive, HDR). On the right, the live section: the plane as the
// camera above sees it, a ring of nuclei that widens and closes as the sheet goes down, with its plane number and a 100
// um scale bar. When the sheet leaves, the whole embryo hangs there and the count reads 4,812 cells.
(() => {
  const PANEL = { x: 1250, y: 210, s: 560 };
  SCENES['stack'] = {
    draw(ctx, t, env) {
      const B = env.beatSec, b = env.lt / B + 1e-4, n = Math.round(env.dur / B), lt = env.lt;
      const CL = LS.clouds(), pos = LS.at(10), N = pos.length / 3;
      const ys = 1.1 - 2.25 * Ease.ioSine(clamp(b / (n - 1.6))), done = clamp((b - (n - 1.4)) / 0.6), w = 0.04;
      const cam = LS.cam({ yaw: 0.55 + lt * 0.05, pitch: 0.34, shiftX: -0.34 });
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      // the planes already passed (a reveal sphere so big it is a plane), and the plane in the sheet
      const reveal = [0, 1000, 0, 1000 - ys];
      const sheet = new Float32Array(N * 3).fill(LS.FAR); let k = 0; const section = [];
      for (let c = 0; c < N; c++) { const y = pos[c * 3 + 1]; if (Math.abs(y - ys) < w && done < 1) { sheet[k * 3] = pos[c * 3]; sheet[k * 3 + 1] = y; sheet[k * 3 + 2] = pos[c * 3 + 2]; k++; section.push(c); } }
      CL.sheet.setPositions(sheet); CL.nuc.setPositions(pos); CL.mem.setPositions(LS.membranes(pos));
      GL.begin({ hdr: true, exposure: 1.35 });
      GL.drawCloud(CL.mem, { cam, alpha: 0.32, twinkle: 0, reveal: done >= 1 ? undefined : reveal, revealSoft: 0.02 });
      GL.drawCloud(CL.nuc, { cam, alpha: 0.95, twinkle: 0, reveal: done >= 1 ? undefined : reveal, revealSoft: 0.02 });
      GL.drawCloud(CL.sheet, { cam, alpha: 1.6 * (1 - done), size: 1.15, twinkle: 0 });
      GL.blit(ctx);
      // the sheet itself, in perspective
      if (done < 1) {
        const P = [[-1.6, -1.6], [1.6, -1.6], [1.6, 1.6], [-1.6, 1.6]].map(([x, z]) => GL.project(cam, [x, ys, z]));
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - done;
        ctx.beginPath(); P.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
        ctx.fillStyle = 'rgba(46,230,255,0.07)'; ctx.fill(); ctx.strokeStyle = 'rgba(46,230,255,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.restore();
      }
      // the live section
      const pk = Ease.outExpo(clamp((b - 0.4) / 0.8));
      if (pk > 0) {
        const { x, y, s } = PANEL;
        ctx.save(); ctx.globalAlpha = pk;
        ctx.fillStyle = '#020306'; ctx.fillRect(x, y, s, s); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, s, s);
        ctx.beginPath(); ctx.rect(x, y, s, s); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
        for (const c of section) {
          const px = x + s / 2 + pos[c * 3] / 1.25 * s / 2, py = y + s / 2 - pos[c * 3 + 2] / 1.25 * s / 2;
          ctx.fillStyle = radial(ctx, px, py, 0, 13, [[0, 'rgba(255,170,230,0.95)'], [0.35, 'rgba(255,62,200,0.55)'], [1, 'rgba(255,62,200,0)']]); ctx.fillRect(px - 13, py - 13, 26, 26);
          ctx.fillStyle = 'rgba(46,230,255,0.18)'; circle(ctx, px, py, 16); ctx.fill();
        }
        ctx.restore();
        const plane = Math.round(clamp((1.1 - ys) / 2.25) * 360);
        LS.txt(ctx, 'LIVE SECTION', x, y - 18, { size: 18, mono: true, color: 'rgba(46,230,255,0.9)', ls: 2, a: pk });
        LS.txt(ctx, `plane ${String(plane).padStart(3, '0')} / 360   Δz 2 µm`, x + s, y - 18, { size: 18, mono: true, align: 'right', color: 'rgba(255,255,255,0.75)', a: pk });
        LS.scaleBar(ctx, x + 30, y + s - 30, 100, s / 2 / 1.25, pk);
      }
      LS.txt(ctx, 'b   A sheet of light scans the embryo', 96, 96, { size: 26, weight: 600, a: clamp(b * 2) });
      LS.rise(ctx, 'Every plane it passes stays lit.', 96, 960, (b - 1.2) / 0.6, { size: 34, weight: 600 });
      const cnt = Math.round(4812 * clamp((1.1 - ys) / 2.25));
      LS.txt(ctx, cnt.toLocaleString('en-US') + ' cells', 96, 1012, { size: 26, mono: true, color: LS.COL.nuc, a: clamp((b - 1.2) * 2) });
      LS.stamp(ctx, 10, clamp(b * 2));
    },
  };
})();
