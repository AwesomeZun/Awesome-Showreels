'use strict';
// quad.js — perspective drawing for Canvas2D.
//
// Draws any image / canvas into an arbitrary quadrilateral with a true projective (perspective) map, plus helpers
// for 3D-posed panels (tilted terminal windows, phones, paper sheets) with shadow, glow, sheen and reflection.
//
// How: the projective map is approximated by affine triangles on an adaptive per-axis grid (error < `tol` px).
// Triangles render into an offscreen buffer that is blitted once, so globalAlpha, filters and shadows apply to the
// warped silhouette. Seam-free and alpha-exact (tested: 0 seam pixels, silhouette within 1/255 of a polygon fill):
//   - inner triangle edges are pushed out 0.75 px and drawn source-over, so neighbours overlap (no hairline gaps;
//     a clip-only partition leaves AA dots, and Chrome's 'copy' under a clip clears-then-draws, leaving holes);
//   - the texture gets an edge-clamped border, outer edges are pushed out too, and ONE antialiased polygon cut
//     ('destination-in') defines the silhouette (no c^2 darkening, no bumps at cell junctions);
//   - translucent textures (glass, reflections, cutouts) would double-blend in the overlaps, so they take a matte
//     path: out = dst * (1 - a) + premultiplied colour, i.e. a (1 - a) grey matte blitted with 'multiply' and the
//     colour over black blitted with 'lighter' — two opaque (exact) warps. Needs an opaque destination (scene
//     frames are opaque); otherwise an additive partition fallback is used (sparse dots, see drawQuad).
// Parallelograms skip all of this: one exact affine drawImage.
//
// Pure functions of their arguments (no carried state besides reusable scratch canvases).
// Quads are in the ctx's current user space (the current transform is honoured).
// Exports window.Quad and the aliases drawQuad / poseMap / poseQuad / drawPanel (only when those names are free).
(function (root) {
  const DEFAULTS = { tol: 0.35, maxN: 48, inner: 0.75, outer: 1.5, quality: 'high', ss: 1 };

  // ───────── homography: unit square (u,v) -> quad [TL, TR, BR, BL] (Heckbert) ─────────
  function homography(q) {
    const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
    const sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
    let g = 0, h = 0;
    if (Math.abs(sx) > 1e-9 || Math.abs(sy) > 1e-9) {
      const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2;
      const den = dx1 * dy2 - dx2 * dy1;
      if (Math.abs(den) > 1e-12) { g = (sx * dy2 - dx2 * sy) / den; h = (dx1 * sy - sx * dy1) / den; }
    }
    return { a: x1 - x0 + g * x1, b: x3 - x0 + h * x3, c: x0, d: y1 - y0 + g * y1, e: y3 - y0 + h * y3, f: y0, g, h };
  }
  function mapH(Hm, u, v) {
    const w = Hm.g * u + Hm.h * v + 1;
    return [(Hm.a * u + Hm.b * v + Hm.c) / w, (Hm.d * u + Hm.e * v + Hm.f) / w];
  }
  // quad -> unit square (hit tests, placing things by screen position)
  function invertH(Hm) {
    const { a, b, c, d, e, f, g, h } = Hm;
    const A = e - f * h, B = c * h - b, C = b * f - c * e;
    const D = f * g - d, E = a - c * g, F = c * d - a * f;
    const G = d * h - e * g, Hh = b * g - a * h, I = a * e - b * d;
    return (x, y) => { const w = G * x + Hh * y + I; return [(A * x + B * y + C) / w, (D * x + E * y + F) / w]; };
  }
  const isAffine = Hm => Math.abs(Hm.g) < 1e-9 && Math.abs(Hm.h) < 1e-9;
  // Grid [nu, nv] so every triangle's affine approximation deviates < tol px from the true map.
  // Errors: along u ~ 1/nu^2, along v ~ 1/nv^2, cross term ~ 1/(nu nv) — e.g. a pure yaw needs many columns, few rows.
  function grid(Hm, tol = DEFAULTS.tol, maxN = DEFAULTS.maxN) {
    if (isAffine(Hm)) return [1, 1];
    const dev = (u0, v0, u1, v1) => {
      const a = mapH(Hm, u0, v0), b = mapH(Hm, u1, v1), m = mapH(Hm, (u0 + u1) / 2, (v0 + v1) / 2);
      return Math.hypot(m[0] - (a[0] + b[0]) / 2, m[1] - (a[1] + b[1]) / 2);
    };
    const eu = Math.max(dev(0, 0, 1, 0), dev(0, 1, 1, 1), dev(0, 0.5, 1, 0.5));
    const ev = Math.max(dev(0, 0, 0, 1), dev(1, 0, 1, 1), dev(0.5, 0, 0.5, 1));
    let nu = Math.max(1, Math.min(maxN, Math.ceil(Math.sqrt(eu / tol))));
    let nv = Math.max(1, Math.min(maxN, Math.ceil(Math.sqrt(ev / tol))));
    for (let it = 0; it < 24; it++) {
      let wu = 0, wv = 0, wd = 0;
      for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
        const u0 = i / nu, u1 = (i + 1) / nu, v0 = j / nv, v1 = (j + 1) / nv;
        wu = Math.max(wu, dev(u0, v0, u1, v0)); wv = Math.max(wv, dev(u0, v0, u0, v1));
        wd = Math.max(wd, dev(u0, v0, u1, v1), dev(u1, v0, u0, v1));
      }
      if (Math.max(wu, wv, wd) <= tol || (nu >= maxN && nv >= maxN)) break;
      // refine the axis that carries the error; the cross term goes to the axis with the larger cell extent
      const p00 = mapH(Hm, 0, 0), pu = mapH(Hm, 1 / nu, 0), pv = mapH(Hm, 0, 1 / nv);
      const cu = Math.hypot(pu[0] - p00[0], pu[1] - p00[1]), cv = Math.hypot(pv[0] - p00[0], pv[1] - p00[1]);
      const up = wu > tol || (wd > tol && wv <= tol && cu >= cv), vp = wv > tol || (wd > tol && wu <= tol && cv > cu);
      if (up && nu < maxN) nu = Math.min(maxN, Math.max(nu + 1, Math.ceil(nu * 1.2)));
      if (vp && nv < maxN) nv = Math.min(maxN, Math.max(nv + 1, Math.ceil(nv * 1.2)));
      if ((!up || nu >= maxN) && (!vp || nv >= maxN)) { if (nu < maxN) nu++; else if (nv < maxN) nv++; else break; }
    }
    return [nu, nv];
  }
  const area2 = q => { let s = 0; for (let i = 0; i < q.length; i++) { const [x0, y0] = q[i], [x1, y1] = q[(i + 1) % q.length]; s += x0 * y1 - x1 * y0; } return s / 2; };

  // ───────── scratch canvases (grow-only, reused every frame) ─────────
  const POOL = {};
  function scratch(key, w, h) {
    let c = POOL[key];
    if (!c) { c = POOL[key] = document.createElement('canvas'); c.width = 2; c.height = 2; }
    if (c.width < w || c.height < h) { c.width = Math.max(c.width, Math.ceil(w)); c.height = Math.max(c.height, Math.ceil(h)); }
    const g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
    g.shadowBlur = 0; g.shadowColor = 'transparent'; g.shadowOffsetX = 0; g.shadowOffsetY = 0;
    g.clearRect(0, 0, Math.ceil(w) + 2, Math.ceil(h) + 2);
    return { c, g };
  }
  const srcSize = s => [s.videoWidth || s.naturalWidth || s.width || 0, s.videoHeight || s.naturalHeight || s.height || 0];
  // Edge-clamped copy of the sub-rect with `p` px of replicated border texels, so triangles can overdraw the
  // silhouette and one exact antialiased polygon cut defines the edge. Immutable sources are cached.
  const PADCACHE = typeof WeakMap === 'function' ? new WeakMap() : null;
  function padded(src, sr, p) {
    const immutable = (typeof HTMLImageElement !== 'undefined' && src instanceof HTMLImageElement) || (typeof ImageBitmap !== 'undefined' && src instanceof ImageBitmap);
    const key = sr.join(',') + '|' + p;
    if (immutable && PADCACHE) { const hit = PADCACHE.get(src); if (hit && hit.key === key) return hit.v; }
    const [sx, sy, sw, sh] = sr, w = Math.ceil(sw) + 2 * p, h = Math.ceil(sh) + 2 * p;
    const c = immutable ? document.createElement('canvas') : null;
    let g;
    if (c) { c.width = w; c.height = h; g = c.getContext('2d'); } else ({ g } = scratch('pad', w, h));
    const cv = c || POOL.pad;
    g.imageSmoothingEnabled = false;
    g.drawImage(src, sx, sy, sw, sh, p, p, sw, sh);
    g.drawImage(src, sx, sy, sw, 1, p, 0, sw, p);                       // top
    g.drawImage(src, sx, sy + sh - 1, sw, 1, p, p + sh, sw, p);         // bottom
    g.drawImage(src, sx, sy, 1, sh, 0, p, p, sh);                       // left
    g.drawImage(src, sx + sw - 1, sy, 1, sh, p + sw, p, p, sh);         // right
    g.drawImage(src, sx, sy, 1, 1, 0, 0, p, p); g.drawImage(src, sx + sw - 1, sy, 1, 1, p + sw, 0, p, p);
    g.drawImage(src, sx, sy + sh - 1, 1, 1, 0, p + sh, p, p); g.drawImage(src, sx + sw - 1, sy + sh - 1, 1, 1, p + sw, p + sh, p, p);
    const v = { img: cv, sr: [p, p, sw, sh], full: [0, 0, w, h] };
    if (immutable && PADCACHE) PADCACHE.set(src, { key, v });
    return v;
  }

  // push flagged triangle edges outward by e px (miter-limited) and return the new vertices
  function expandTri(A, B, C, eAB, eBC, eCA) {
    if (!eAB && !eBC && !eCA) return [A, B, C];
    const P = [A, B, C], E = [eAB, eBC, eCA];
    const sgn = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]) > 0 ? 1 : -1;
    const L = [];
    for (let i = 0; i < 3; i++) {
      const p = P[i], q = P[(i + 1) % 3];
      let nx = (q[1] - p[1]) * sgn, ny = -(q[0] - p[0]) * sgn;
      const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      L.push([nx, ny, nx * p[0] + ny * p[1] + E[i]]);
    }
    const out = [];
    for (let i = 0; i < 3; i++) {
      const [a1, b1, c1] = L[(i + 2) % 3], [a2, b2, c2] = L[i];
      const det = a1 * b2 - a2 * b1;
      let x = P[i][0], y = P[i][1];
      const lim = 4 * Math.max(E[i], E[(i + 2) % 3]);
      if (Math.abs(det) > 1e-9 && lim > 0) {
        x = (c1 * b2 - c2 * b1) / det; y = (a1 * c2 - a2 * c1) / det;
        const dx = x - P[i][0], dy = y - P[i][1], m = Math.hypot(dx, dy);
        if (m > lim) { x = P[i][0] + (dx / m) * lim; y = P[i][1] + (dy / m) * lim; }
      }
      out.push([x, y]);
    }
    return out;
  }
  // draw source triangle (s0,s1,s2; source px) onto destination triangle (d0,d1,d2), clipped to clipTri
  function tri(g, src, sr, s0, s1, s2, d0, d1, d2, clipTri, margin) {
    const [x0, y0] = s0, [x1, y1] = s1, [x2, y2] = s2;
    const den = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    if (Math.abs(den) < 1e-12) return;
    const [u0, v0] = d0, [u1, v1] = d1, [u2, v2] = d2;
    const a = ((u1 - u0) * (y2 - y0) - (u2 - u0) * (y1 - y0)) / den;
    const c = ((u2 - u0) * (x1 - x0) - (u1 - u0) * (x2 - x0)) / den;
    const b = ((v1 - v0) * (y2 - y0) - (v2 - v0) * (y1 - y0)) / den;
    const d = ((v2 - v0) * (x1 - x0) - (v1 - v0) * (x2 - x0)) / den;
    const e = u0 - a * x0 - c * y0, f = v0 - b * x0 - d * y0;
    g.save();
    g.beginPath(); g.moveTo(clipTri[0][0], clipTri[0][1]); g.lineTo(clipTri[1][0], clipTri[1][1]); g.lineTo(clipTri[2][0], clipTri[2][1]); g.closePath();
    g.clip();
    g.setTransform(a, b, c, d, e, f);
    // the triangle's source rect + margin (clamped to the source region) so expanded inner edges stay covered
    const mx0 = Math.max(sr[0], Math.min(x0, x1, x2) - margin), my0 = Math.max(sr[1], Math.min(y0, y1, y2) - margin);
    const mx1 = Math.min(sr[0] + sr[2], Math.max(x0, x1, x2) + margin), my1 = Math.min(sr[1] + sr[3], Math.max(y0, y1, y2) + margin);
    if (mx1 > mx0 && my1 > my0) g.drawImage(src, mx0, my0, mx1 - mx0, my1 - my0, mx0, my0, mx1 - mx0, my1 - my0);
    g.restore();
  }
  function applyBlit(ctx, o) {
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    if (o.composite) ctx.globalCompositeOperation = o.composite;
    if (o.filter) ctx.filter = o.filter;
    if (o.shadow) {
      ctx.shadowColor = o.shadow.color || 'rgba(0,0,0,0.5)'; ctx.shadowBlur = o.shadow.blur ?? 30;
      ctx.shadowOffsetX = o.shadow.x || 0; ctx.shadowOffsetY = o.shadow.y ?? 0;
    }
    ctx.imageSmoothingEnabled = o.smoothing !== false;
    ctx.imageSmoothingQuality = o.quality || DEFAULTS.quality;
  }

  // Warp src sub-rect sr onto device-space quad q into the 'warp' scratch buffer (silhouette cut exactly).
  // mode 'overlap' (opaque texels, source-over with overlapping inner edges) or 'partition' (exact inner edges, lighter).
  function warp(src, sr, q, Hd, o, mode, cw, ch) {
    const pad = o.shadow ? Math.abs(o.shadow.blur ?? 30) * 2 + Math.max(Math.abs(o.shadow.x || 0), Math.abs(o.shadow.y || 0)) : 0;
    const bx0 = Math.max(Math.floor(Math.min(...q.map(p => p[0]))) - 3, -pad - 3), by0 = Math.max(Math.floor(Math.min(...q.map(p => p[1]))) - 3, -pad - 3);
    const bx1 = Math.min(Math.ceil(Math.max(...q.map(p => p[0]))) + 3, cw + pad + 3), by1 = Math.min(Math.ceil(Math.max(...q.map(p => p[1]))) + 3, ch + pad + 3);
    const bw = bx1 - bx0, bh = by1 - by0;
    if (bw <= 0 || bh <= 0) return null;
    const [nu, nv] = o.n ? [o.n, o.n] : grid(Hd, o.tol ?? DEFAULTS.tol, o.maxN ?? DEFAULTS.maxN);
    const ss = Math.max(1, Math.min(3, o.ss ?? DEFAULTS.ss));
    const BW = bw * ss, BH = bh * ss;
    // source px per device px (worst edge) -> how much edge-clamped border the pushed-out outer edges need
    const el = (a, b) => Math.max(1e-3, Math.hypot(q[b][0] - q[a][0], q[b][1] - q[a][1]));
    const spd = Math.max(sr[2] / Math.min(el(0, 1), el(3, 2)), sr[3] / Math.min(el(0, 3), el(1, 2)));
    const eout = (o.outer ?? DEFAULTS.outer) * ss, ein = mode === 'overlap' ? (o.inner ?? DEFAULTS.inner) * ss : 0;
    const pd = padded(src, sr, Math.max(4, Math.min(96, Math.ceil(spd * (o.outer ?? DEFAULTS.outer) * 2) + 3)));
    const img = pd.img, full = pd.full, [sx, sy, sw, sh] = pd.sr;
    const { c: buf, g } = scratch('warp', BW, BH);
    g.imageSmoothingEnabled = o.smoothing !== false;
    g.imageSmoothingQuality = o.quality || DEFAULTS.quality;
    g.globalCompositeOperation = mode === 'overlap' ? 'source-over' : 'lighter';
    const P = new Array((nu + 1) * (nv + 1));
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const p = mapH(Hd, i / nu, j / nv);
      P[j * (nu + 1) + i] = [(p[0] - bx0) * ss, (p[1] - by0) * ss];
    }
    for (let j = 0; j < nv; j++) {
      for (let i = 0; i < nu; i++) {
        const d00 = P[j * (nu + 1) + i], d10 = P[j * (nu + 1) + i + 1], d11 = P[(j + 1) * (nu + 1) + i + 1], d01 = P[(j + 1) * (nu + 1) + i];
        const minx = Math.min(d00[0], d10[0], d11[0], d01[0]), maxx = Math.max(d00[0], d10[0], d11[0], d01[0]);
        const miny = Math.min(d00[1], d10[1], d11[1], d01[1]), maxy = Math.max(d00[1], d10[1], d11[1], d01[1]);
        if (maxx < -4 || maxy < -4 || minx > BW + 4 || miny > BH + 4) continue;   // off-buffer cell
        const s00 = [sx + (sw * i) / nu, sy + (sh * j) / nv], s10 = [sx + (sw * (i + 1)) / nu, sy + (sh * j) / nv];
        const s11 = [sx + (sw * (i + 1)) / nu, sy + (sh * (j + 1)) / nv], s01 = [sx + (sw * i) / nu, sy + (sh * (j + 1)) / nv];
        const dcw = Math.max(Math.hypot(d10[0] - d00[0], d10[1] - d00[1]), Math.hypot(d11[0] - d01[0], d11[1] - d01[1]), 1e-3);
        const dch = Math.max(Math.hypot(d01[0] - d00[0], d01[1] - d00[1]), Math.hypot(d11[0] - d10[0], d11[1] - d10[1]), 1e-3);
        const margin = Math.ceil(Math.max(ein, eout) * 4 * Math.max(sw / nu / dcw, sh / nv / dch)) + 2;
        const L = i === 0 ? eout : ein, R = i === nu - 1 ? eout : ein, Tp = j === 0 ? eout : ein, B = j === nv - 1 ? eout : ein;
        // alternate the diagonal (checkerboard) so the approximation error does not drift one way
        if ((i + j) % 2 === 0) {
          tri(g, img, full, s00, s10, s11, d00, d10, d11, expandTri(d00, d10, d11, Tp, R, ein), margin);
          tri(g, img, full, s00, s11, s01, d00, d11, d01, expandTri(d00, d11, d01, ein, B, L), margin);
        } else {
          tri(g, img, full, s00, s10, s01, d00, d10, d01, expandTri(d00, d10, d01, Tp, ein, L), margin);
          tri(g, img, full, s10, s11, s01, d10, d11, d01, expandTri(d10, d11, d01, R, B, ein), margin);
        }
      }
    }
    // one exact antialiased silhouette cut (the triangles overdrew it with edge-clamped texels)
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'destination-in';
    g.fillStyle = '#000';
    g.beginPath();
    q.forEach(([x, y], i) => (i ? g.lineTo((x - bx0) * ss, (y - by0) * ss) : g.moveTo((x - bx0) * ss, (y - by0) * ss)));
    g.closePath();
    g.fill();
    g.globalCompositeOperation = 'source-over';
    return { buf, bx0, by0, bw, bh, BW, BH, grid: [nu, nv] };
  }
  // Does the source look opaque? Samples the central 80 % (rounded corners do not count) through a small
  // GPU-side downscale, then reads back 8x8 px from a CPU canvas (no full-texture readback, no console warning).
  // Immutable sources are cached; pass o.opaque explicitly to skip the probe.
  const OPQ = typeof WeakMap === 'function' ? new WeakMap() : null;
  let PROBE = null;
  function looksOpaque(src, sr) {
    const immutable = (typeof HTMLImageElement !== 'undefined' && src instanceof HTMLImageElement) || (typeof ImageBitmap !== 'undefined' && src instanceof ImageBitmap);
    const key = sr.join(',');
    if (immutable && OPQ) { const hit = OPQ.get(src); if (hit && hit.key === key) return hit.v; }
    if (!PROBE) {
      const a = document.createElement('canvas'); a.width = a.height = 64;
      const b = document.createElement('canvas'); b.width = b.height = 8;
      PROBE = { a, ga: a.getContext('2d'), gb: b.getContext('2d', { willReadFrequently: true }) };
    }
    const { a, ga, gb } = PROBE;
    ga.globalCompositeOperation = 'copy'; ga.imageSmoothingEnabled = true; ga.imageSmoothingQuality = 'medium';
    ga.drawImage(src, sr[0] + sr[2] * 0.1, sr[1] + sr[3] * 0.1, sr[2] * 0.8, sr[3] * 0.8, 0, 0, 64, 64);
    gb.globalCompositeOperation = 'copy'; gb.imageSmoothingEnabled = true;
    gb.drawImage(a, 0, 0, 8, 8);
    const d = gb.getImageData(0, 0, 8, 8).data;
    let v = true;
    for (let i = 3; i < d.length; i += 4) if (d[i] < 250) { v = false; break; }
    if (immutable && OPQ) OPQ.set(src, { key, v });
    return v;
  }
  function blit(ctx, w, o, composite) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    applyBlit(ctx, o);
    if (composite) ctx.globalCompositeOperation = composite;
    ctx.drawImage(w.buf, 0, 0, w.BW, w.BH, w.bx0, w.by0, w.bw, w.bh);
    ctx.restore();
  }

  // ───────── drawQuad ─────────
  // ctx: target context. src: image / canvas / video / ImageBitmap. quad: [[x,y] TL, TR, BR, BL] (user space).
  // o: { src: [sx,sy,sw,sh] sub-rect,
  //      opaque: 'auto' (default: probes the central 80 % of the texture) | true — opaque texels (windows, UI
  //              shots, pages; rounded corners are fine): exact, fastest | false — translucent texels (glass,
  //              reflections, cutouts): exact matte path on an opaque
  //              destination (scene frames are opaque); with o.dest = 'transparent' or a custom composite it
  //              falls back to an additive partition (sparse <= 25 % dots on some diagonals; ss: 2 halves them).
  //      tol (px, 0.35), maxN (48), ss (1..3 supersampling), quality ('high'), alpha, composite, filter,
  //      shadow: {color, blur, x, y}, cull (skip when back-facing) }
  // Returns { H, map(u,v) -> [x,y] (u,v in 0..1 of the source rect), inv(x,y) -> [u,v], front, grid, mode } or null.
  function drawQuad(ctx, src, quad, o = {}) {
    const [W0, H0] = srcSize(src);
    if (!W0 || !H0 || !quad || quad.length !== 4) return null;
    const sr = o.src || [0, 0, W0, H0];
    const Hu = homography(quad);
    const front = area2(quad) > 0;
    const res = { H: Hu, map: (u, v) => mapH(Hu, u, v), inv: invertH(Hu), front, grid: [1, 1] };
    if ((o.cull && !front) || (o.alpha ?? 1) <= 0.001 || sr[2] <= 0 || sr[3] <= 0) return res;
    const T = ctx.getTransform();
    const q = quad.map(([x, y]) => [T.a * x + T.c * y + T.e, T.b * x + T.d * y + T.f]);
    if (!q.every(p => isFinite(p[0]) && isFinite(p[1]))) return res;
    const Hd = homography(q);
    // parallelogram: one exact affine draw (alpha-exact for any texture)
    if (isAffine(Hd)) {
      ctx.save();
      applyBlit(ctx, o);
      ctx.setTransform(Hd.a / sr[2], Hd.d / sr[2], Hd.b / sr[3], Hd.e / sr[3], Hd.c, Hd.f);
      ctx.drawImage(src, sr[0], sr[1], sr[2], sr[3], 0, 0, sr[2], sr[3]);
      ctx.restore();
      return res;
    }
    const cw = ctx.canvas.width, ch = ctx.canvas.height;
    const opaque = o.opaque === true || (o.opaque !== false && looksOpaque(src, sr));
    res.mode = opaque ? 'opaque' : (o.dest === 'transparent' || (o.composite && o.composite !== 'source-over')) ? 'partition' : 'matte';
    if (opaque) {
      const w = warp(src, sr, q, Hd, o, 'overlap', cw, ch);
      if (w) { blit(ctx, w, o); res.grid = w.grid; }
      return res;
    }
    if (o.dest === 'transparent' || (o.composite && o.composite !== 'source-over')) {
      const w = warp(src, sr, q, Hd, o, 'partition', cw, ch);
      if (w) { blit(ctx, w, o); res.grid = w.grid; }
      return res;
    }
    // exact translucent path: out = dst * (1 - a) + P (P = premultiplied colour), as two seam-free opaque warps:
    // a (1 - a) grey matte blitted with 'multiply', then P over black blitted with 'lighter'.
    const tw = Math.ceil(sr[2]), th = Math.ceil(sr[3]);
    const { c: mz, g: gz } = scratch('matteZ', tw, th);
    gz.fillStyle = '#fff'; gz.fillRect(0, 0, tw, th);
    gz.globalCompositeOperation = 'destination-out'; gz.drawImage(src, sr[0], sr[1], sr[2], sr[3], 0, 0, tw, th);
    gz.globalCompositeOperation = 'destination-over'; gz.fillStyle = '#000'; gz.fillRect(0, 0, tw, th);
    const { c: mx, g: gx } = scratch('matteX', tw, th);
    gx.fillStyle = '#000'; gx.fillRect(0, 0, tw, th);
    gx.drawImage(src, sr[0], sr[1], sr[2], sr[3], 0, 0, tw, th);
    const oo = { ...o, shadow: null };
    const wz = warp(mz, [0, 0, tw, th], q, Hd, oo, 'overlap', cw, ch);
    if (!wz) return res;
    res.grid = wz.grid;
    if (o.shadow) {
      // shadow only: draw the silhouette far off-canvas and let the shadow offset bring the shadow back
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); applyBlit(ctx, o);
      const off = 4 * (cw + ch);
      ctx.shadowOffsetX = (o.shadow.x || 0) + off;
      ctx.drawImage(wz.buf, 0, 0, wz.BW, wz.BH, wz.bx0 - off, wz.by0, wz.bw, wz.bh);
      ctx.restore();
    }
    blit(ctx, wz, oo, 'multiply');
    const wx = warp(mx, [0, 0, tw, th], q, Hd, oo, 'overlap', cw, ch);
    if (wx) blit(ctx, wx, oo, 'lighter');
    return res;
  }

  // ───────── 3D pose of a flat panel ─────────
  // pose: { x, y: anchor position before perspective (= its screen position when z = 0),
  //         ax, ay: anchor in panel px (default: panel centre), s: screen px per panel px at depth 0,
  //         z: depth (+ = away), yaw (+ = right edge away), pitch (+ = top edge away), roll (+ = clockwise),
  //         focal: px (default 1800, ~33 deg vertical FOV at 1080p), cx, cy: vanishing point (default canvas centre) }
  function poseParts(p, size) {
    const s = p.s ?? 1, focal = p.focal ?? 1800;
    const ax = p.ax ?? (size ? size[0] / 2 : 0), ay = p.ay ?? (size ? size[1] / 2 : 0);
    const cy0 = Math.cos(p.yaw || 0), sy0 = Math.sin(p.yaw || 0), cp = Math.cos(p.pitch || 0), sp = Math.sin(p.pitch || 0);
    const cr = Math.cos(p.roll || 0), sr = Math.sin(p.roll || 0);
    const vx = p.cx ?? (typeof W === 'number' ? W / 2 : 960), vy = p.cy ?? (typeof H === 'number' ? H / 2 : 540);
    // offset of panel point (u, v) from the anchor after rotation (screen px at depth 0, z = depth)
    const rot = (u, v) => {
      let x = (u - ax) * s, y = (v - ay) * s, z = 0;
      [x, y] = [x * cr - y * sr, x * sr + y * cr];          // roll (screen plane)
      [y, z] = [y * cp, -y * sp];                            // pitch: points above the anchor recede when pitch > 0
      [x, z] = [x * cy0 - z * sy0, x * sy0 + z * cy0];       // yaw: the right side recedes when yaw > 0
      return [x, y, z];
    };
    return { rot, focal, vx, vy, X: p.x ?? vx, Y: p.y ?? vy, Z: p.z || 0 };
  }
  // map(u, v) -> [x, y, k] for panel px (u, v); k = depth scale (> 1 = farther, smaller)
  function poseMap(p, size) {
    const { rot, focal, vx, vy, X, Y, Z } = poseParts(p, size);
    return (u, v) => {
      const [x, y, z] = rot(u, v);
      const k = Math.max(0.15, (focal + Z + z) / focal);
      return [vx + (X + x - vx) / k, vy + (Y + y - vy) / k, k];
    };
  }
  function poseQuad(p, w, h) {
    const m = poseMap(p, [w, h]);
    return [m(0, 0), m(w, 0), m(w, h), m(0, h)].map(([x, y]) => [x, y]);
  }
  // interpolate two poses key by key (missing keys fall back to the other pose)
  function lerpPose(a, b, k) {
    const out = {};
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const va = a[key] ?? b[key], vb = b[key] ?? a[key];
      out[key] = typeof va === 'number' && typeof vb === 'number' ? va + (vb - va) * k : (k < 0.5 ? va : vb);
    }
    return out;
  }
  // The same placement anchored at another panel point (ax, ay). Lerp from the re-anchored pose to a zoom pose
  // (anchor = the detail) and the move starts exactly where the panel is (no jump).
  function reanchor(p, size, ax, ay) {
    const { rot, X, Y, Z } = poseParts(p, size);
    const [x, y, z] = rot(ax, ay);
    return { ...p, ax, ay, x: X + x, y: Y + y, z: Z + z };
  }
  // A pose that brings panel rect b = [x0, y0, x1, y1] to screen point (fx, fy) at `width` screen px wide,
  // keeping a little of the base pose's tilt (o.keep, default 0.35). Use with reanchor + lerpPose for zoom-to-line.
  function focusPose(base, size, b, o = {}) {
    const keep = o.keep ?? 0.35, bw = Math.max(1, b[2] - b[0]), bh = Math.max(1, b[3] - b[1]);
    let s = (o.width ?? 1500) / bw;
    if (o.maxH) s = Math.min(s, o.maxH / bh);
    return {
      ...base, ax: (b[0] + b[2]) / 2, ay: (b[1] + b[3]) / 2, x: o.x ?? (typeof W === 'number' ? W / 2 : 960), y: o.y ?? (typeof H === 'number' ? H / 2 : 540),
      z: 0, s, yaw: (base.yaw || 0) * keep, pitch: (base.pitch || 0) * keep, roll: (base.roll || 0) * keep,
    };
  }

  // rounded-rect outline in panel px as a polyline (projects to the exact rounded silhouette)
  function roundRectPts(w, h, r, seg = 8) {
    r = Math.max(0, Math.min(r || 0, w / 2, h / 2));
    if (r <= 0) return [[0, 0], [w, 0], [w, h], [0, h]];
    const pts = [];
    const arc = (cx, cy, a0) => { for (let i = 0; i <= seg; i++) { const a = a0 + (i / seg) * (Math.PI / 2); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
    arc(w - r, r, -Math.PI / 2); arc(w - r, h - r, 0); arc(r, h - r, Math.PI / 2); arc(r, r, Math.PI);
    return pts;
  }
  function pathPts(ctx, pts) { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); }
  // axis-aligned screen bbox of panel rect b = [x0, y0, x1, y1] (panel px) under map; .pts = projected corners
  function projRect(map, b) {
    const pts = [map(b[0], b[1]), map(b[2], b[1]), map(b[2], b[3]), map(b[0], b[3])].map(([x, y]) => [x, y]);
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const x = Math.min(...xs), y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y, pts };
  }

  // ───────── drawPanel: a 3D-posed flat panel ─────────
  // src: the panel texture. Panel size (panel px) = o.size || [srcW / res, srcH / res].
  // o: { res: texture px per panel px (default 1), radius (panel px; clip: false when the texture is already
  //      rounded — the radius then only shapes border and glow), border: {color, width},
  //      sheen: k (0..1) | {k, width, a, angle}, shadow: {color, blur, x, y}, glow: {color, blur, a, width},
  //      reflection: {a: 0.18, frac: 0.45, gap: 6, blur}, alpha, tol, ss, opaque (default 'auto'), cull, filter }
  // Returns { map, quad, front, size, rect(b) } — rect projects a panel-px rect to screen (for brackets/labels).
  function drawPanel(ctx, src, pose, o = {}) {
    const [sw0, sh0] = srcSize(src);
    if (!sw0 || !sh0) return null;
    const res = o.res || 1;
    const size = o.size || [sw0 / res, sh0 / res];
    const [w, h] = size;
    const map = poseMap(pose, size);
    const quad = [map(0, 0), map(w, 0), map(w, h), map(0, h)].map(([x, y]) => [x, y]);
    const front = area2(quad) > 0;
    const out = { map, quad, front, size, rect: b => projRect(map, b) };
    const alpha = o.alpha ?? 1;
    if (alpha <= 0.001 || (o.cull && !front)) return out;
    // 1) texture: rounded corners, sheen, border (texture px)
    const tw = Math.round(w * res), th = Math.round(h * res);
    let tex = src, srcRect = [0, 0, sw0, sh0];
    const sheenK = o.sheen == null ? -1 : (typeof o.sheen === 'number' ? o.sheen : o.sheen.k);
    const clipR = o.radius && o.clip !== false;
    if (clipR || o.border || (sheenK > 0 && sheenK < 1)) {
      const { c, g } = scratch('panelTex', tw, th);
      g.save();
      if (clipR) { g.beginPath(); g.roundRect(0, 0, tw, th, o.radius * res); g.clip(); }
      g.drawImage(src, 0, 0, sw0, sh0, 0, 0, tw, th);
      if (sheenK > 0 && sheenK < 1) {
        const so = typeof o.sheen === 'object' ? o.sheen : {};
        const bw = (so.width ?? 180) * res, x = -bw * 2 + (tw + bw * 4) * sheenK;
        g.translate(x, th / 2); g.rotate(so.angle ?? 0.35);
        const gr = g.createLinearGradient(-bw / 2, 0, bw / 2, 0);
        gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, `rgba(255,255,255,${so.a ?? 0.16})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.fillRect(-bw / 2, -th * 1.5, bw, th * 3);
      }
      g.restore();
      if (o.border) {
        const bw = (o.border.width ?? 1.5) * res;
        g.save(); g.beginPath(); g.roundRect(bw / 2, bw / 2, tw - bw, th - bw, Math.max(0, (o.radius || 0) * res - bw / 2));
        g.strokeStyle = o.border.color || 'rgba(255,255,255,0.12)'; g.lineWidth = bw; g.stroke(); g.restore();
      }
      tex = c; srcRect = [0, 0, tw, th];
    }
    // 2) reflection: the panel mirrored below its bottom edge on the same plane, fading out (translucent)
    if (o.reflection && front) {
      const R = o.reflection, frac = R.frac ?? 0.45, gap = R.gap ?? 6, ra = (R.a ?? 0.18) * alpha;
      const rh = Math.max(2, Math.round(th * frac));
      const { c: rc, g: rg } = scratch('panelRefl', tw, rh);
      const srh = rh * (srcRect[3] / th);
      rg.save(); rg.translate(0, rh); rg.scale(1, -1);
      rg.drawImage(tex, srcRect[0], srcRect[1] + srcRect[3] - srh, srcRect[2], srh, 0, 0, tw, rh);
      rg.restore();
      rg.globalCompositeOperation = 'destination-in';
      const gr = rg.createLinearGradient(0, 0, 0, rh);
      gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      rg.fillStyle = gr; rg.fillRect(0, 0, tw, rh);
      rg.globalCompositeOperation = 'source-over';
      const y0 = h + gap, y1 = h + gap + rh / res;
      const rq = [map(0, y0), map(w, y0), map(w, y1), map(0, y1)].map(([x, y]) => [x, y]);
      drawQuad(ctx, rc, rq, { src: [0, 0, tw, rh], alpha: ra, tol: o.tol, opaque: false, filter: R.blur ? `blur(${R.blur}px)` : undefined });
    }
    // 3) glow: projected rounded outline stroked with a coloured shadow, behind the panel
    if (o.glow) {
      const outline = roundRectPts(w, h, o.radius || 0).map(([u, v]) => map(u, v));
      ctx.save();
      ctx.globalAlpha *= (o.glow.a ?? 0.6) * alpha;
      pathPts(ctx, outline);
      ctx.strokeStyle = o.glow.color || '#7aa2f7'; ctx.lineWidth = o.glow.width ?? 2;
      ctx.shadowColor = o.glow.color || '#7aa2f7'; ctx.shadowBlur = o.glow.blur ?? 40;
      ctx.stroke();
      ctx.restore();
    }
    // 4) the panel (its shadow follows the warped silhouette)
    const r = drawQuad(ctx, tex, quad, { src: srcRect, alpha, shadow: o.shadow, tol: o.tol, ss: o.ss, opaque: o.opaque, quality: o.quality, filter: o.filter });
    if (r) { out.H = r.H; out.grid = r.grid; }
    return out;
  }

  // corner brackets around a screen rect {x, y, w, h} (e.g. projRect of the key line)
  function brackets(ctx, r, o = {}) {
    const len = o.len ?? 26, pad = o.pad ?? 14, a = o.a ?? 1;
    if (a <= 0.001 || !r) return;
    const x0 = r.x - pad, y0 = r.y - pad, x1 = r.x + r.w + pad, y1 = r.y + r.h + pad;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.strokeStyle = o.color || '#fff'; ctx.lineWidth = o.width ?? 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowBlur ?? 18; }
    ctx.beginPath();
    ctx.moveTo(x0, y0 + len); ctx.lineTo(x0, y0); ctx.lineTo(x0 + len, y0);
    ctx.moveTo(x1 - len, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y0 + len);
    ctx.moveTo(x1, y1 - len); ctx.lineTo(x1, y1); ctx.lineTo(x1 - len, y1);
    ctx.moveTo(x0 + len, y1); ctx.lineTo(x0, y1); ctx.lineTo(x0, y1 - len);
    ctx.stroke();
    ctx.restore();
  }
  // soft contact shadow on an imaginary floor under a posed panel (screen-space ellipse)
  function floorShadow(ctx, map, w, h, o = {}) {
    const [x0, y0] = map(0, h), [x1, y1] = map(w, h);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2 + (o.drop ?? 18), rw = Math.abs(x1 - x0) * (o.scale ?? 0.55);
    if (rw <= 1) return;
    ctx.save();
    ctx.globalAlpha *= o.a ?? 0.35;
    ctx.translate(cx, cy); ctx.scale(1, o.squash ?? 0.12);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rw);
    g.addColorStop(0, o.color || 'rgba(0,0,0,0.8)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(-rw, -rw, rw * 2, rw * 2);
    ctx.restore();
  }

  const Quad = { drawQuad, drawPanel, homography, mapH, invertH, grid, poseMap, poseQuad, lerpPose, reanchor, focusPose, projRect, brackets, floorShadow, roundRectPts, DEFAULTS };
  root.Quad = Quad;
  for (const [k, v] of [['drawQuad', drawQuad], ['poseMap', poseMap], ['poseQuad', poseQuad], ['drawPanel', drawPanel]]) if (!(k in root)) root[k] = v;
})(typeof window !== 'undefined' ? window : globalThis);
