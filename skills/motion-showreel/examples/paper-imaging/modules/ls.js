// ls: the light-sheet article's kit (a project module). Microscopy on black: every one of the 4,812 tracked cells is a
// point drawn by the GPU (gl.js) with additive glow and HDR tone mapping, so channels add up and overlaps burn white:
// nuclei magenta, membranes cyan (three dim points around each nucleus), the notochord reporter green. Cells move
// between the six time points of assets/data/embryo.json on Catmull-Rom curves, so any hpf between 6 and 24 has a
// position for every cell. UI is white at reduced opacity in DM Mono (scale bars, time stamps, channel names), text in
// Manrope. Exposes window.LS. Pure in its arguments.
(() => {
  let D = null;
  const data = () => (D || (D = ASSET('data/embryo.json')));
  const COL = { nuc: '#FF3EC8', mem: '#2EE6FF', noto: '#4BFF6A' };
  const LINC = ['#4BFF6A', '#FF3EC8', '#2EE6FF', '#8FA3C8'];      // notochord, muscle, neural, skin
  const UM = 300;                                                   // micrometres per world unit
  // every cell's position at hpf t (Catmull-Rom through the keyframes), cached per step of 0.02 h
  const POS = new Map();
  function at(t) {
    const d = data(), H = d.hpf, n = d.pos.length;
    t = clamp(t, H[0], H[H.length - 1]); const key = Math.round(t * 50);
    if (POS.has(key)) return POS.get(key);
    let k = 0; while (k < H.length - 2 && t > H[k + 1]) k++;
    const u = (t - H[k]) / (H[k + 1] - H[k]), u2 = u * u, u3 = u2 * u;
    const i0 = Math.max(0, k - 1), i1 = k, i2 = k + 1, i3 = Math.min(H.length - 1, k + 2);
    const out = new Float32Array(n * 3);
    for (let c = 0; c < n; c++) {
      const p = d.pos[c];
      for (let a = 0; a < 3; a++) {
        const p0 = p[i0 * 3 + a], p1 = p[i1 * 3 + a], p2 = p[i2 * 3 + a], p3 = p[i3 * 3 + a];
        out[c * 3 + a] = 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3);
      }
    }
    if (POS.size > 400) POS.clear();
    POS.set(key, out); return out;
  }
  // membranes: three points around each nucleus, at fixed offsets (deterministic)
  const OFF = [];
  function membranes(pos, sel = null) {
    const n = pos.length / 3;
    if (!OFF.length) for (let i = 0; i < n * 3; i++) { const a = hash(i * 1.31) * TAU, b = Math.acos(2 * hash(i * 2.17 + 3) - 1); OFF.push([Math.sin(b) * Math.cos(a) * 0.024, Math.cos(b) * 0.024, Math.sin(b) * Math.sin(a) * 0.024]); }
    const out = new Float32Array(n * 9);
    for (let c = 0; c < n; c++) for (let k = 0; k < 3; k++) { const o = OFF[c * 3 + k]; for (let a = 0; a < 3; a++) out[(c * 3 + k) * 3 + a] = pos[c * 3 + a] + o[a]; }
    return out;
  }
  // the clouds, made once (positions are replaced every frame; points parked at 'FAR' are not drawn)
  const FAR = 9999;
  let CL = null;
  function clouds() {
    if (CL) return CL;
    const d = data(), n = d.pos.length, p0 = at(10);
    const sz = (k, a, b) => Float32Array.from({ length: k }, (_, i) => a + (b - a) * hash(i * 4.21 + 9));
    const solid = (k, hex) => { const c = parseColor(hex), out = new Float32Array(k * 3); for (let i = 0; i < k; i++) { out[i * 3] = c[0] / 255; out[i * 3 + 1] = c[1] / 255; out[i * 3 + 2] = c[2] / 255; } return out; };
    const notoIdx = d.lineage.map((l, i) => (l === 0 ? i : -1)).filter(i => i >= 0);
    CL = {
      nuc: GL.cloud(p0, { colors: solid(n, COL.nuc), sizes: sz(n, 5.5, 8.5) }),
      mem: GL.cloud(membranes(p0), { colors: solid(n * 3, COL.mem), sizes: sz(n * 3, 3, 5) }),
      noto: GL.cloud(new Float32Array(notoIdx.length * 3), { colors: solid(notoIdx.length, COL.noto), sizes: sz(notoIdx.length, 9, 12) }),
      sheet: GL.cloud(new Float32Array(n * 3).fill(FAR), { colors: solid(n, '#FFD6F4'), sizes: sz(n, 10, 14) }),
      lin: GL.cloud(p0, { colors: Float32Array.from(d.lineage.flatMap(l => { const c = parseColor(LINC[l]); return [c[0] / 255, c[1] / 255, c[2] / 255]; })), sizes: sz(n, 5, 8) }),
      notoIdx,
    };
    return CL;
  }
  const notoPos = (pos) => { const I = clouds().notoIdx, out = new Float32Array(I.length * 3); I.forEach((c, k) => { out[k * 3] = pos[c * 3]; out[k * 3 + 1] = pos[c * 3 + 1]; out[k * 3 + 2] = pos[c * 3 + 2]; }); return out; };
  const cam = (o = {}) => GL.camera({ target: [0, 0, 0], dist: 4.4, fov: 0.6, ...o });
  // ───────── UI and text
  function txt(ctx, s, x, y, o = {}) {
    ctx.save(); ctx.font = `${o.weight || 400} ${o.size || 24}px ${o.mono ? FAM.mono : FAM.sans}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${o.ls ?? 0}px`;
    ctx.textAlign = o.align || 'left'; ctx.fillStyle = o.color || '#F1F5F9'; ctx.globalAlpha *= o.a ?? 1;
    if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowR || 20; }
    const str = o.n !== undefined ? String(s).slice(0, Math.max(0, Math.floor(o.n))) : String(s);
    ctx.fillText(str, x, y); ctx.restore();
  }
  function rise(ctx, s, x, y, p, o = {}) {
    if (p <= 0) return; const e = Ease.outExpo(clamp(p)), size = o.size || 24;
    ctx.save(); ctx.beginPath(); ctx.rect(0, y - size * 1.15, W, size * 1.5); ctx.clip();
    txt(ctx, s, x, y + (1 - e) * size * 1.1, { ...o, a: (o.a ?? 1) * clamp(p * 3) }); ctx.restore();
  }
  // a scale bar: um micrometres at pxPerUnit screen pixels per world unit
  function scaleBar(ctx, x, y, um, pxPerUnit, a = 1) {
    if (a <= 0) return; const w = um / UM * pxPerUnit;
    ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(x, y, w, 5);
    txt(ctx, `${um} µm`, x + w / 2, y - 12, { size: 20, mono: true, align: 'center', color: 'rgba(255,255,255,0.85)' }); ctx.restore();
  }
  // the time stamp and channel names, top right, like the microscope software
  function stamp(ctx, t, a = 1, chans = null) {
    if (a <= 0) return;
    txt(ctx, `${t.toFixed(1)} hpf`, W - 96, 98, { size: 30, mono: true, align: 'right', color: 'rgba(255,255,255,0.92)', a });
    if (chans) chans.forEach(([name, col, on], i) => txt(ctx, name, W - 96, 138 + i * 30, { size: 19, mono: true, align: 'right', color: col, a: a * on }));
  }
  function glow(ctx, x, y, r, col, a = 1) {
    if (a <= 0.003) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = radial(ctx, x, y, 0, r, [[0, rgba(col, 0.9 * a)], [0.3, rgba(col, 0.3 * a)], [1, rgba(col, 0)]]);
    ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
  }
  window.LS = { data, COL, LINC, UM, at, membranes, clouds, notoPos, cam, FAR, txt, rise, scaleBar, stamp, glow };
})();
