// narration (feat-narration.webp): narration on your own key, planned without claiming a voice. Two lines of the
// research-cli example's narration as the skill plans them: the script is narration.json, the line timing comes from
// the TTS dry run (placeholder clips: vo_timeline.py), the caption preview burns captions.py's cues for the 30-s cut
// into that cut's own frames (rendered by the runtime, tools/prepare.mjs: 72 frames over these 7.5 s), and the music
// lane is the real unmastered bed (music-30-stem.wav) under the duck
// envelope mix_vo.py applies (gain 0.32 from 0.12 s before a line to 0.15 s after it, 0.25-s smoothing): behind the
// playhead the bed is drawn ducked, ahead of it as composed. The playhead crosses the first two scenes (4 bars,
// 7.5 s) at 1.25x and wraps with the loop. Real speech needs the viewer's own Gemini key (BYOK); the frame says so and
// draws no voice waveform. make_webp.mjs opens the WebP on line 1 with its caption and its duck (the poster).
(() => {
  const PV = { x: 96, y: 160, w: 1184, h: 666 };                     // caption preview (16:9)
  const RC = { x: 1328, w: 496 };                                    // the script column
  const BAND = { x: 96, y: 862, w: 1728, h: 168 }, TL = { x0: 126, x1: 1440 };
  const SPAN = 7.5;                                                  // cut seconds on screen: scenes matrix + problem
  const SC = { matrix: 'accent3', problem: 'lavender' };

  function keyIcon(ctx, x, y, s, color) {
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = s * 0.16; ctx.lineCap = 'round';
    circle(ctx, x - s * 0.35, y, s * 0.3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - s * 0.05, y); ctx.lineTo(x + s * 0.62, y); ctx.moveTo(x + s * 0.42, y); ctx.lineTo(x + s * 0.42, y + s * 0.24);
    ctx.moveTo(x + s * 0.6, y); ctx.lineTo(x + s * 0.6, y + s * 0.3); ctx.stroke(); ctx.restore();
  }

  SCENES['narration'] = {
    draw(ctx, t, env) {
      const P = env.palette, L = KIT.loop(env), u = L.u;
      const D = ASSET('data/narration.json');
      KIT.stage(ctx, P);
      KIT.header(ctx, P, { index: '05', label: 'NARRATION · OPTIONAL · BYOK' });
      if (!D) return;
      const speed = SPAN / L.L, tp = u * speed;                       // cut seconds under the playhead
      const lines = D.lines.filter(l => l.t0 < SPAN), scenes = D.scenes.filter(s => s.t0 < SPAN);
      const live = lines.find(l => tp >= l.t0 && tp < l.t1);

      // ── caption preview: the scene being narrated with its caption burned in, as captions.py times it
      KIT.panel(ctx, PV.x, PV.y, PV.w, PV.h, { r: 20 });
      // the cut itself, playing at the playhead (its frames 0.104 s apart, neighbours blended)
      const fi = clamp(tp / SPAN) * 72, i0 = Math.min(71, Math.floor(fi)), fk = fi - i0;
      const fr = (i) => IMG[`ex/narr/${String(Math.min(71, i)).padStart(2, '0')}`];
      ctx.save(); rr(ctx, PV.x + 8, PV.y + 8, PV.w - 16, PV.h - 16, 14); ctx.clip();
      if (fr(i0)) ctx.drawImage(fr(i0), PV.x + 8, PV.y + 8, PV.w - 16, PV.h - 16);
      if (fr(i0 + 1) && fk > 0.01 && i0 < 71) withAlpha(ctx, fk, () => ctx.drawImage(fr(i0 + 1), PV.x + 8, PV.y + 8, PV.w - 16, PV.h - 16));
      ctx.restore();
      const cap = D.captions.find(c => tp >= c.t0 && tp < c.t1);
      if (cap) {
        const rows = cap.text.split('\n'), cs = 46, lh = 60, ch = rows.length * lh + 30, cy = PV.y + PV.h - 44 - ch;
        const age = Math.min(tp - cap.t0, 99) / speed, a = clamp(age / 0.12);
        const cw = Math.max(...rows.map(s => measure(ctx, s, { size: cs, weight: 600, fam: 'sans' }))) + 56;
        ctx.save(); ctx.globalAlpha *= a; ctx.translate(0, 14 * (1 - Ease.outC(clamp(age / 0.2))));
        rr(ctx, PV.x + PV.w / 2 - cw / 2, cy, cw, ch, 12); ctx.fillStyle = 'rgba(10,14,23,0.82)'; ctx.fill();
        rows.forEach((s, i) => text(ctx, s, PV.x + PV.w / 2, cy + 58 + i * lh, { size: cs, weight: 600, fam: 'sans', color: '#FFFFFF', align: 'center' }));
        ctx.restore();
      }
      KIT.tag(ctx, 'captions burned in', PV.x + 28, PV.y + 60, { size: 32, h: 56, padX: 16, color: P.ink, bg: 'rgba(17,17,27,0.84)' });

      // ── the script (narration.json): the line being read lights up
      text(ctx, 'narration.json', RC.x, PV.y + 30, { size: 32, weight: 700, fam: 'mono', color: P.ink2 });
      let y = PV.y + 56;
      const fo = { size: 38, weight: 600, fam: 'sans' };
      lines.forEach((ln) => {
        const on = ln === live, rows = wrapText(ctx, ln.text, RC.w - 56, fo), h = 74 + rows.length * 48;
        const since = on ? (tp - ln.t0) / speed : 99, pop = on ? Ease.outBack(clamp(since / 0.25), 2) : 0;
        ctx.save(); ctx.translate(RC.x + RC.w / 2, y + h / 2); ctx.scale(1 + 0.03 * pop * Math.exp(-since * 3), 1 + 0.03 * pop * Math.exp(-since * 3)); ctx.translate(-RC.x - RC.w / 2, -y - h / 2);
        rr(ctx, RC.x, y, RC.w, h, 16); ctx.fillStyle = on ? rgba(P.accent, 0.2) : rgba(P.surface, 0.92); ctx.fill();
        ctx.strokeStyle = on ? P.accent : rgba(P.ink, 0.12); ctx.lineWidth = on ? 4 : 2; ctx.stroke();
        text(ctx, ln.scene, RC.x + 28, y + 50, { size: 32, weight: 700, fam: 'mono', color: P[SC[ln.scene]] || P.accent });
        rows.forEach((r, i) => text(ctx, r, RC.x + 28, y + 100 + i * 48, { ...fo, color: on ? KIT.bright() : P.ink2 }));
        if (on) {                                                    // reading progress along the card's edge
          const q = clamp((tp - ln.t0) / (ln.t1 - ln.t0));
          ctx.save(); ctx.fillStyle = P.accent; ctx.shadowColor = P.accent; ctx.shadowBlur = 16; ctx.fillRect(RC.x + 16, y + h - 10, (RC.w - 32) * q, 5); ctx.restore();
        }
        ctx.restore();
        y += h + 22;
      });
      KIT.tag(ctx, '    your own Gemini key', RC.x, PV.y + PV.h - 34, { size: 32, h: 60, padX: 18, color: KIT.bright(), stroke: rgba(P.ok, 0.7) });
      keyIcon(ctx, RC.x + 38, PV.y + PV.h - 34, 34, P.ok);
      text(ctx, `${D.voice.voice} · dry run, no voice`, RC.x, PV.y + PV.h - 106, { size: 32, weight: 600, fam: 'mono', color: P.ink2 });

      // ── music lane: the bed (RMS dB), ducked behind the playhead under each line; the gain it reads, big
      KIT.panel(ctx, BAND.x, BAND.y, BAND.w, BAND.h, { r: 18, fill: rgba(P.bg2, 0.94) });
      const xOf = (s) => TL.x0 + (s / SPAN) * (TL.x1 - TL.x0), px = xOf(tp);
      const top = BAND.y + 18, bot = BAND.y + BAND.h - 18, dbTo = (db) => bot - clamp((db + 44) / 32) * (bot - top);
      for (const ln of lines) {                                      // voice lines (dashed: dry-run timing, no audio)
        const x0 = xOf(ln.t0), x1 = xOf(Math.min(SPAN, ln.t1)), on = ln === live;
        ctx.save(); rr(ctx, x0, top, x1 - x0, bot - top, 10); ctx.fillStyle = rgba(P.accent, on ? 0.2 : 0.09); ctx.fill();
        ctx.setLineDash([12, 9]); ctx.strokeStyle = rgba(P.accent, on ? 0.95 : 0.5); ctx.lineWidth = on ? 3 : 2; ctx.stroke(); ctx.restore();
      }
      const bed = D.bed.db, g = D.gain.values, hop = D.bed.hop, n = Math.min(bed.length, g.length, Math.round(SPAN / hop));
      const duck = (i) => bed[i] + 20 * Math.log10(Math.max(1e-3, g[i]));
      ctx.save(); ctx.beginPath(); ctx.rect(TL.x0, top, TL.x1 - TL.x0, bot - top); ctx.clip();
      const area = (i0, i1, fn, fill) => {
        if (i1 <= i0) return;
        ctx.beginPath(); ctx.moveTo(xOf(i0 * hop), bot);
        for (let i = i0; i <= i1 && i < n; i++) ctx.lineTo(xOf(i * hop), dbTo(fn(i)));
        ctx.lineTo(xOf(Math.min(i1, n - 1) * hop), bot); ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
      };
      const ip = Math.min(n - 1, Math.floor(tp / hop));
      area(ip, n - 1, i => bed[i], rgba(P.ink, 0.16));                                   // ahead: the bed as composed
      area(0, ip, i => bed[i], rgba(P.ink, 0.07));
      area(0, ip, duck, linear(ctx, 0, top, 0, bot, [[0, rgba(P.accent3, 0.95)], [1, rgba(P.accent3, 0.3)]]));   // behind: ducked
      ctx.restore();
      for (const ln of lines) if (tp > ln.t0) {
        const x = xOf((ln.t0 + Math.min(SPAN, ln.t1)) / 2), a = clamp((tp - ln.t0) / (0.3 * speed));
        text(ctx, `${D.duck.db} dB`, x, top + 40, { size: 32, weight: 700, fam: 'mono', color: P.ok, align: 'center', alpha: a });
      }
      ctx.save(); ctx.shadowColor = P.accent; ctx.shadowBlur = 22; ctx.fillStyle = KIT.bright(); ctx.fillRect(px - 2.5, BAND.y + 8, 5, BAND.h - 16); ctx.restore();
      // the music gain under the playhead, as a readout
      const gi = Math.min(n - 1, Math.round(tp / hop)), gdb = 20 * Math.log10(Math.max(1e-3, g[gi]));
      const rx = BAND.x + BAND.w - 30;
      text(ctx, 'music', TL.x1 + 46, BAND.y + 60, { size: 32, weight: 700, fam: 'mono', color: P.ink2 });
      text(ctx, `${gdb > -0.05 ? '0.0' : gdb.toFixed(1)} dB`, rx, BAND.y + 132, { size: 68, weight: 700, fam: 'display', color: gdb < -1 ? P.ok : KIT.bright(), align: 'right' });
      KIT.tag(ctx, `playhead ×${speed.toFixed(2)}`, PV.x + PV.w - 28, PV.y + 60, { size: 32, h: 56, padX: 16, align: 'right', color: P.accent, bg: 'rgba(17,17,27,0.84)', weight: 700 });
    },
  };
})();
