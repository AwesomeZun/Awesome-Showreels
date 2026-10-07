'use strict';
// gl.js (optional module): WebGL2 layer for scenes.
// Point clouds with additive glow (HDR accumulate + tone map), morphs between point sets (particle logos from
// rasterized text/images), glowing line segments with travelling pulses, and perspective-correct textured panels
// (3D-tilted screenshots or terminals; an alternative to quad.js).
// One offscreen WebGL2 canvas (W x H, preserveDrawingBuffer) is composited into the scene's 2D context:
//   GL.begin(); GL.drawCloud(cloud, {cam}); GL.panel(img, {...}); GL.blit(ctx);
// Headless-safe (GPU or SwiftShader). Without WebGL2, GL.ok is false and draws fall back to plain Canvas2D.
const GL = (() => {
  let cv = null, gl = null, ok = null, aniso = null, maxAniso = 1, ptRange = [1, 64];
  const P = {};                       // programs
  let hdr = null, hdrOn = false, pending = false, fallback = [];
  const texCache = new WeakMap();
  const geomOf = new WeakMap();       // panel options object -> resolved geometry (w/h derived from the source)

  // ───────── mat4 (column-major) ─────────
  const M4 = {
    I: () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
    mul(a, b) {
      const o = new Float32Array(16);
      for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
        let s = 0;
        for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
        o[c * 4 + r] = s;
      }
      return o;
    },
    chain(...ms) { return ms.reduce((a, b) => M4.mul(a, b)); },
    T(x, y, z) { const m = M4.I(); m[12] = x; m[13] = y; m[14] = z; return m; },
    S(x, y = x, z = x) { const m = M4.I(); m[0] = x; m[5] = y; m[10] = z; return m; },
    rotX(a) { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]); },
    rotY(a) { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]); },
    rotZ(a) { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); },
    perspective(fovy, aspect, near, far) {
      const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
      return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
    },
    lookAt(eye, at, up) {
      let zx = eye[0] - at[0], zy = eye[1] - at[1], zz = eye[2] - at[2];
      let l = Math.hypot(zx, zy, zz) || 1; zx /= l; zy /= l; zz /= l;
      let xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx;
      l = Math.hypot(xx, xy, xz) || 1; xx /= l; xy /= l; xz /= l;
      const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
      return new Float32Array([xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0,
        -(xx * eye[0] + xy * eye[1] + xz * eye[2]), -(yx * eye[0] + yy * eye[1] + yz * eye[2]), -(zx * eye[0] + zy * eye[1] + zz * eye[2]), 1]);
    },
    apply(m, p) {
      const [x, y, z] = p, w = p[3] ?? 1;
      return [m[0] * x + m[4] * y + m[8] * z + m[12] * w, m[1] * x + m[5] * y + m[9] * z + m[13] * w,
        m[2] * x + m[6] * y + m[10] * z + m[14] * w, m[3] * x + m[7] * y + m[11] * z + m[15] * w];
    },
  };

  // Orbit camera. yaw/pitch (rad) around target at distance dist; fov vertical (rad); shiftX/Y = lens shift in NDC
  // (0.4 moves the subject right of centre without perspective change); roll (rad).
  function camera(o = {}) {
    const target = o.target || [0, 0, 0], yaw = o.yaw || 0, pitch = o.pitch || 0, dist = o.dist ?? 3;
    const eye = o.eye || [target[0] + dist * Math.sin(yaw) * Math.cos(pitch), target[1] + dist * Math.sin(pitch), target[2] + dist * Math.cos(yaw) * Math.cos(pitch)];
    let view = M4.lookAt(eye, target, o.up || [0, 1, 0]);
    if (o.roll) view = M4.mul(M4.rotZ(o.roll), view);
    const proj = M4.perspective(o.fov ?? 0.6, o.aspect ?? W / H, o.near ?? 0.01, o.far ?? 100);
    proj[8] -= o.shiftX || 0; proj[9] -= o.shiftY || 0;
    return { view, proj, eye, target, dist: Math.hypot(eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]), viewProj: M4.mul(proj, view) };
  }
  // World point -> [x, y, depth, visible] in canvas px (anchor 2D callouts to 3D points).
  function project(cam, p, model = null) {
    const wp = model ? M4.apply(model, p) : [p[0], p[1], p[2], 1];
    const c = M4.apply(cam.viewProj, wp);
    if (c[3] <= 1e-5) return [0, 0, 0, false];
    return [(c[0] / c[3] * 0.5 + 0.5) * W, (1 - (c[1] / c[3] * 0.5 + 0.5)) * H, c[3], Math.abs(c[0] / c[3]) < 1.2 && Math.abs(c[1] / c[3]) < 1.2];
  }

  // ───────── shaders ─────────
  const POINT_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aCol; layout(location=2) in float aSize;
layout(location=3) in float aSeed; layout(location=4) in vec3 aMorph;
uniform mat4 uModel, uView, uProj;
uniform float uSize, uAlpha, uTime, uTwinkle, uMorph, uSwirl, uStagger, uSizeRef, uMinSize, uMaxSize, uRevealSoft;
uniform vec4 uTint, uReveal;
out vec3 vCol; out float vA;
vec3 h3(float s) { return fract(sin(vec3(s * 91.7, s * 57.3 + 1.3, s * 23.1 + 2.7)) * vec3(4375.85, 2371.13, 7919.31)) - 0.5; }
void main() {
  vec3 p = aPos;
  if (uMorph > 0.0) {
    float mt = clamp(uMorph * (1.0 + uStagger) - aSeed * uStagger, 0.0, 1.0);
    float e = mt * mt * (3.0 - 2.0 * mt);
    vec3 mid = mix(aPos, aMorph, 0.5) + h3(aSeed) * uSwirl;
    p = mix(mix(aPos, mid, e), mix(mid, aMorph, e), e);
  }
  vec4 vp = uView * uModel * vec4(p, 1.0);
  gl_Position = uProj * vp;
  float depth = max(-vp.z, 1e-3);
  float size = aSize * uSize * (uSizeRef > 0.0 ? uSizeRef / depth : 1.0);
  gl_PointSize = clamp(size, uMinSize, uMaxSize);
  float tw = 1.0 - uTwinkle + uTwinkle * (0.5 + 0.5 * sin(uTime * (1.3 + aSeed * 3.7) + aSeed * 61.0));
  float vis = 1.0;
  if (uReveal.w >= 0.0) vis = 1.0 - smoothstep(uReveal.w - uRevealSoft, uReveal.w, length(aPos - uReveal.xyz));
  float sub = clamp(size / uMinSize, 0.0, 1.0);
  vA = uAlpha * tw * vis * sub * sub;
  vCol = mix(aCol, uTint.rgb, uTint.a);
}`;
  const POINT_FS = `#version 300 es
precision highp float;
in vec3 vCol; in float vA; uniform float uSoft, uAdd; out vec4 o;
void main() {
  vec2 d = gl_PointCoord - 0.5; float r2 = dot(d, d) * 4.0;
  if (r2 > 1.0) discard;
  float f = mix(1.0 - smoothstep(0.62, 1.0, r2), exp(-r2 * 3.2), uSoft) * vA;
  vec3 c = vCol * f;
  o = uAdd > 0.5 ? vec4(c, max(c.r, max(c.g, c.b))) : vec4(c, f);
}`;
  const LINE_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aA; layout(location=1) in vec3 aB; layout(location=2) in vec2 aU;
layout(location=3) in vec3 aC0; layout(location=4) in vec3 aC1; layout(location=5) in float aSeed;
uniform mat4 uModel, uView, uProj; uniform vec2 uRes; uniform float uWidth, uPersp, uSizeRef, uCap;
out float vSide; out float vAA; out float vU; out vec3 vCol; out float vSeed;
void main() {
  int id = gl_VertexID; float end = float(id >> 1); float side = (id & 1) == 0 ? -1.0 : 1.0;
  mat4 mvp = uProj * uView * uModel;
  vec4 ca = mvp * vec4(aA, 1.0), cb = mvp * vec4(aB, 1.0);
  vU = mix(aU.x, aU.y, end); vCol = mix(aC0, aC1, end); vSeed = aSeed;
  if (ca.w <= 1e-4 || cb.w <= 1e-4) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vSide = 0.0; vAA = 1.0; return; }
  vec2 sa = ca.xy / ca.w, sb = cb.xy / cb.w;
  vec2 dir = (sb - sa) * uRes * 0.5; float len = length(dir);
  dir = len > 1e-6 ? dir / len : vec2(1.0, 0.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  vec4 c = end < 0.5 ? ca : cb;
  float w = max(uWidth * (uPersp > 0.5 ? uSizeRef / c.w : 1.0), 0.35);
  float hw = w * 0.5 + 1.0;
  vec2 off = nrm * side * hw + dir * (end < 0.5 ? -1.0 : 1.0) * min(hw, len * 0.5) * uCap;
  gl_Position = vec4(c.xy + off / uRes * 2.0 * c.w, c.z, c.w);
  vSide = side * hw / (w * 0.5); vAA = 1.0 / (w * 0.5);
}`;
  const LINE_FS = `#version 300 es
precision highp float;
in float vSide; in float vAA; in float vU; in vec3 vCol; in float vSeed;
uniform float uAlpha, uGlow, uDraw, uDrawSoft, uStagger, uTime, uPulseAmt, uPulseSpeed, uPulseWidth, uPulseSpread, uAdd;
uniform vec3 uPulseCol; out vec4 o;
void main() {
  float d = abs(vSide);
  float prof = mix(1.0 - smoothstep(1.0 - vAA, 1.0 + vAA, d), exp(-d * d * 2.2), uGlow);
  float head = uDraw * (1.0 + uStagger) - vSeed * uStagger;
  float vis = uDraw >= 1.0 && uStagger == 0.0 ? 1.0 : 1.0 - smoothstep(head - uDrawSoft, head, vU);
  if (vis <= 0.0 || prof <= 0.0) discard;
  float ph = fract(uTime * uPulseSpeed + vSeed * uPulseSpread);
  float du = abs(vU - ph); du = min(du, 1.0 - du);
  float pu = uPulseAmt > 0.0 ? exp(-(du * du) / (uPulseWidth * uPulseWidth)) * uPulseAmt : 0.0;
  vec3 col = vCol + uPulseCol * pu;
  float a = prof * vis * uAlpha;
  vec3 c = col * a;
  o = uAdd > 0.5 ? vec4(c, max(c.r, max(c.g, c.b))) : vec4(c, a);
}`;
  const PANEL_VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aP; layout(location=1) in vec3 aUVQ;
uniform vec2 uRes; out vec3 vUVQ;
void main() { vUVQ = aUVQ; vec2 n = aP / uRes * 2.0 - 1.0; gl_Position = vec4(n.x, -n.y, 0.0, 1.0); }`;
  const PANEL_FS = `#version 300 es
precision highp float;
in vec3 vUVQ; uniform sampler2D uTex;
uniform vec2 uSize; uniform vec4 uCrop, uBorderCol, uShadowCol, uGlowCol;
uniform float uRadius, uAlpha, uBorderW, uShade, uSheen, uSheenW, uShadow, uSoft, uGlowW;
out vec4 o;
float sdRB(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main() {
  vec2 uv = vUVQ.xy / vUVQ.z;
  vec2 p = (uv - 0.5) * uSize;
  float d = sdRB(p, uSize * 0.5, uRadius);
  if (uShadow > 0.5) {
    float a = (1.0 - smoothstep(-uSoft, uSoft, d)) * uShadowCol.a * uAlpha;
    o = vec4(uShadowCol.rgb * a, a); return;
  }
  float aa = max(fwidth(d), 1e-3);
  float cover = 1.0 - smoothstep(-aa, aa, d);
  vec4 glow = vec4(0.0);
  if (uGlowW > 0.0 && d > 0.0) { float g = exp(-(d * d) / (uGlowW * uGlowW) * 1.2) * uGlowCol.a; glow = vec4(uGlowCol.rgb * g, g); }
  if (cover <= 0.0) { if (glow.a <= 0.002) discard; o = glow * uAlpha; return; }
  vec4 c = texture(uTex, mix(uCrop.xy, uCrop.zw, clamp(uv, 0.0, 1.0)));
  c.rgb *= 1.0 + uShade * ((0.5 - uv.y) * 0.22 + (0.5 - uv.x) * 0.08);
  if (uSheen > -0.5) { float s = (uv.x + uv.y * 0.55) - (uSheen * 2.3 - 0.4); c.rgb += vec3(exp(-(s * s) / (uSheenW * uSheenW)) * 0.22) * c.a; }
  if (uBorderW > 0.0) { float b = 1.0 - smoothstep(uBorderW - aa, uBorderW + aa, -d); c = mix(c, vec4(uBorderCol.rgb * uBorderCol.a, uBorderCol.a), b * uBorderCol.a); }
  o = (c * cover + glow * (1.0 - cover)) * uAlpha;
}`;
  const QUAD_VS = `#version 300 es
layout(location=0) in vec2 aP; out vec2 vUV; void main() { vUV = aP * 0.5 + 0.5; gl_Position = vec4(aP, 0.0, 1.0); }`;
  const RESOLVE_FS = `#version 300 es
precision highp float; in vec2 vUV; uniform sampler2D uTex; uniform float uExp; out vec4 o;
void main() {
  vec3 c = texture(uTex, vUV).rgb; float L = max(c.r, max(c.g, c.b));
  c *= (1.0 - exp(-L * uExp)) / max(L, 1e-4);
  float m = max(c.r, max(c.g, c.b));
  c = mix(c, vec3(m), smoothstep(0.75, 1.0, m) * 0.35);
  o = vec4(c, m);
}`;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function program(vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(p, info.name); }
    return { p, u };
  }
  function init() {
    if (ok !== null) return ok;
    ok = false;
    try {
      cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      gl = cv.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: true, preserveDrawingBuffer: true, depth: true, stencil: false });
      if (!gl) { console.warn('[gl] WebGL2 unavailable; GL draws fall back to Canvas2D'); return ok; }
      gl.getExtension('EXT_color_buffer_float');
      gl.getExtension('EXT_color_buffer_half_float');
      aniso = gl.getExtension('EXT_texture_filter_anisotropic');
      if (aniso) maxAniso = gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT) || 1;
      ptRange = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) || [1, 64];
      P.points = program(POINT_VS, POINT_FS);
      P.lines = program(LINE_VS, LINE_FS);
      P.panel = program(PANEL_VS, PANEL_FS);
      P.resolve = program(QUAD_VS, RESOLVE_FS);
      P.quadVAO = gl.createVertexArray(); gl.bindVertexArray(P.quadVAO);
      const qb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, qb);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      P.panelVAO = gl.createVertexArray(); gl.bindVertexArray(P.panelVAO);
      P.panelBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, P.panelBuf);
      gl.bufferData(gl.ARRAY_BUFFER, 4 * 5 * 4, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 20, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 20, 8);
      gl.bindVertexArray(null);
      const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, W, H, 0, gl.RGBA, gl.HALF_FLOAT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      hdr = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE ? { t, fb } : null;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      ok = true;
    } catch (e) {
      console.warn('[gl] init failed: ' + e.message);
      ok = false;
    }
    return ok;
  }

  // ───────── colour + point-set helpers (CPU) ─────────
  const rgb = c => { const v = parseColor(c); return [v[0] / 255, v[1] / 255, v[2] / 255]; };
  // Per-point colours: css string | [r,g,b] floats | array of css (picked by hash) | fn(i, x, y, z) -> css.
  function colors(n, spec, pos = null) {
    const out = new Float32Array(n * 3);
    if (spec instanceof Float32Array) return spec;
    for (let i = 0; i < n; i++) {
      let c;
      if (typeof spec === 'function') c = rgb(spec(i, pos ? pos[i * 3] : 0, pos ? pos[i * 3 + 1] : 0, pos ? pos[i * 3 + 2] : 0));
      else if (Array.isArray(spec) && typeof spec[0] === 'string') c = rgb(spec[Math.floor(hash(i * 1.37 + 0.5) * spec.length) % spec.length]);
      else if (Array.isArray(spec)) c = spec;
      else c = rgb(spec || '#FFFFFF');
      out[i * 3] = c[0]; out[i * 3 + 1] = c[1]; out[i * 3 + 2] = c[2];
    }
    return out;
  }
  function _pick(cands, n, seed, jitter) {
    // deterministic stratified pick of n candidates [x, y] (repeats with jitter when there are fewer)
    const out = [];
    if (!cands.length) return out;
    const order = cands.map((c, i) => [hash(i * 0.731 + seed * 17.3), i]).sort((a, b) => a[0] - b[0]);
    for (let k = 0; k < n; k++) {
      const c = cands[order[k % order.length][1]];
      out.push([c[0] + (hash(k * 3.1 + seed) - 0.5) * jitter, c[1] + (hash(k * 7.7 + seed) - 0.5) * jitter, c[2]]);
    }
    return out;
  }
  // Points sampled from rasterized text (particle logo). Returns Float32Array(n*3), centred, y up, width o.width.
  function textPoints(str, o = {}) {
    const n = o.n || 5000, size = o.size || 220;
    const fnt = o.font || font(size, o.weight || 900, o.fam || 'D');
    const c = document.createElement('canvas'), g = c.getContext('2d');
    g.font = fnt;
    g.letterSpacing = (o.ls || 0) + 'px';
    const lines = String(str).split('\n'), lh = size * (o.lineHeight || 1.08);
    const tw = Math.max(...lines.map(l => g.measureText(l).width), 1);
    c.width = Math.ceil(tw + size * 0.6); c.height = Math.ceil(lh * lines.length + size * 0.4);
    g.font = fnt; g.letterSpacing = (o.ls || 0) + 'px';
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach((l, i) => g.fillText(l, c.width / 2, size * 0.2 + lh * (i + 0.5)));
    const d = g.getImageData(0, 0, c.width, c.height).data, step = o.step || 2, cands = [];
    for (let y = 0; y < c.height; y += step) for (let x = 0; x < c.width; x += step) if (d[(y * c.width + x) * 4 + 3] > 128) cands.push([x, y, 0]);
    const pts = _pick(cands, n, o.seed || 1, step);
    const S = (o.width || 2) / c.width, out = new Float32Array(n * 3), depth = o.depth ?? 0.02;
    pts.forEach((p, i) => { out[i * 3] = (p[0] - c.width / 2) * S; out[i * 3 + 1] = -(p[1] - c.height / 2) * S; out[i * 3 + 2] = (hash(i * 5.3 + 2) - 0.5) * depth; });
    return out;
  }
  // Points (and colours) sampled from an image's alpha (o.mode 'alpha') or luminance (o.mode 'luma').
  function imagePoints(img, o = {}) {
    const n = o.n || 5000, iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const sc = Math.min(1, (o.maxSide || 600) / Math.max(iw, ih));
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(iw * sc)); c.height = Math.max(1, Math.round(ih * sc));
    const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height);
    const d = g.getImageData(0, 0, c.width, c.height).data, th = o.threshold ?? 0.5, cands = [];
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      const k = (y * c.width + x) * 4;
      const v = o.mode === 'luma' ? (0.2126 * d[k] + 0.7152 * d[k + 1] + 0.0722 * d[k + 2]) / 255 * (d[k + 3] / 255) : d[k + 3] / 255;
      if (o.invert ? v < th : v > th) cands.push([x, y, k]);
    }
    const pts = _pick(cands, n, o.seed || 2, 1);
    const S = (o.width || 2) / c.width, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), depth = o.depth ?? 0.02;
    pts.forEach((p, i) => {
      pos[i * 3] = (p[0] - c.width / 2) * S; pos[i * 3 + 1] = -(p[1] - c.height / 2) * S; pos[i * 3 + 2] = (hash(i * 5.3 + 4) - 0.5) * depth;
      const k = p[2]; col[i * 3] = d[k] / 255; col[i * 3 + 1] = d[k + 1] / 255; col[i * 3 + 2] = d[k + 2] / 255;
    });
    return { positions: pos, colors: col, n };
  }
  // Procedural point sets: sphere ball disc ring torus grid cube helix galaxy wave line. Radius/size via o.r (1).
  function shapePoints(kind, n, o = {}) {
    const out = new Float32Array(n * 3), r = o.r ?? 1, s = o.seed || 3, ga = Math.PI * (3 - Math.sqrt(5));
    const R = i => hash(i * 1.618 + s), R2 = i => hash(i * 2.414 + s + 11), R3 = i => hash(i * 3.303 + s + 23);
    for (let i = 0; i < n; i++) {
      let x = 0, y = 0, z = 0;
      const u = (i + 0.5) / n;
      if (kind === 'sphere') { const yy = 1 - 2 * u, rr0 = Math.sqrt(1 - yy * yy), a = i * ga; x = Math.cos(a) * rr0 * r; y = yy * r; z = Math.sin(a) * rr0 * r; }
      else if (kind === 'ball') { const yy = 1 - 2 * R(i), rr0 = Math.sqrt(1 - yy * yy), a = TAU * R2(i), k = Math.cbrt(R3(i)) * r; x = Math.cos(a) * rr0 * k; y = yy * k; z = Math.sin(a) * rr0 * k; }
      else if (kind === 'disc') { const k = Math.sqrt(u) * r, a = i * ga; x = Math.cos(a) * k; y = Math.sin(a) * k; }
      else if (kind === 'ring') { const a = TAU * u, k = r * (1 + (R(i) - 0.5) * (o.width ?? 0.08)); x = Math.cos(a) * k; y = Math.sin(a) * k; z = (R2(i) - 0.5) * (o.width ?? 0.08) * r; }
      else if (kind === 'torus') { const a = TAU * R(i), b = TAU * R2(i), rt = o.tube ?? 0.3; x = (r + rt * Math.cos(b)) * Math.cos(a); y = rt * Math.sin(b); z = (r + rt * Math.cos(b)) * Math.sin(a); }
      else if (kind === 'grid') { const side = Math.ceil(Math.sqrt(n)), gx = i % side, gy = Math.floor(i / side); x = (gx / (side - 1 || 1) - 0.5) * 2 * r; y = (gy / (side - 1 || 1) - 0.5) * 2 * r * (o.aspect ?? 1); }
      else if (kind === 'cube') { const f = Math.floor(R(i) * 6), a = (R2(i) - 0.5) * 2 * r, b = (R3(i) - 0.5) * 2 * r; [x, y, z] = [[r, a, b], [-r, a, b], [a, r, b], [a, -r, b], [a, b, r], [a, b, -r]][f]; }
      else if (kind === 'helix') { const a = u * TAU * (o.turns ?? 4), side = i % 2 ? Math.PI : 0; x = Math.cos(a + side) * r * 0.5; z = Math.sin(a + side) * r * 0.5; y = (u - 0.5) * 2 * r; }
      else if (kind === 'galaxy') { const arms = o.arms ?? 3, k = Math.pow(R(i), 0.6) * r, a = (i % arms) / arms * TAU + k * (o.twist ?? 3.2) + (R2(i) - 0.5) * 0.5; x = Math.cos(a) * k; z = Math.sin(a) * k; y = (R3(i) - 0.5) * 0.08 * r * (1 - k / r); }
      else if (kind === 'wave') { const side = Math.ceil(Math.sqrt(n)), gx = (i % side) / (side - 1 || 1), gz = Math.floor(i / side) / (side - 1 || 1); x = (gx - 0.5) * 2 * r; z = (gz - 0.5) * 2 * r; y = Math.sin(gx * 9 + gz * 5) * 0.08 * r; }
      else { x = (u - 0.5) * 2 * r; }
      out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z;
    }
    return out;
  }
  // Reorder b so that b[k] pairs with a[k] after sorting both by a key ('x' | 'y' | 'z' | 'angle' | 'radius' | 'hash').
  // Gives coherent sweeps instead of random criss-cross in morphs. Both must have the same count.
  function pairPoints(a, b, key = 'x') {
    const n = Math.min(a.length, b.length) / 3, kf = (p, i) => {
      const x = p[i * 3], y = p[i * 3 + 1], z = p[i * 3 + 2];
      return key === 'y' ? y : key === 'z' ? z : key === 'angle' ? Math.atan2(y, x) : key === 'radius' ? Math.hypot(x, y, z) : key === 'hash' ? hash(i * 0.917) : x;
    };
    const ia = Array.from({ length: n }, (_, i) => i).sort((p, q) => kf(a, p) - kf(a, q));
    const ib = Array.from({ length: n }, (_, i) => i).sort((p, q) => kf(b, p) - kf(b, q));
    const out = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) { const i = ia[k], j = ib[k]; out[i * 3] = b[j * 3]; out[i * 3 + 1] = b[j * 3 + 1]; out[i * 3 + 2] = b[j * 3 + 2]; }
    return out;
  }

  // ───────── point clouds ─────────
  // positions Float32Array(n*3). o: {colors, sizes (array | number | [min,max]), seeds, morph (positions n*3)}.
  function cloud(positions, o = {}) {
    const n = positions.length / 3;
    const col = colors(n, o.colors || '#FFFFFF', positions);
    const sizes = new Float32Array(n), seeds = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      sizes[i] = o.sizes instanceof Float32Array ? o.sizes[i] : Array.isArray(o.sizes) ? lerp(o.sizes[0], o.sizes[1], hash(i * 4.21 + 9)) : o.sizes ?? 2;
      seeds[i] = o.seeds ? o.seeds[i] : hash(i * 0.618 + 0.5);
    }
    const h = { n, positions, colors: col, sizes, seeds, morph: o.morph || null, vao: null, bufs: null, dirty: true };
    h.setPositions = p => { h.positions = p; h.dirty = true; };
    h.setMorph = p => { h.morph = p; h.dirty = true; };
    h.setColors = c => { h.colors = colors(n, c, h.positions); h.dirty = true; };
    return h;
  }
  function uploadCloud(h) {
    if (!h.vao) {
      h.vao = gl.createVertexArray(); gl.bindVertexArray(h.vao);
      h.bufs = [0, 1, 2, 3, 4].map(() => gl.createBuffer());
      const lay = [[0, 3], [1, 3], [2, 1], [3, 1], [4, 3]];
      for (const [loc, k] of lay) { gl.bindBuffer(gl.ARRAY_BUFFER, h.bufs[loc]); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, k, gl.FLOAT, false, 0, 0); }
      gl.bindVertexArray(null);
    }
    if (!h.dirty) return;
    const data = [h.positions, h.colors, h.sizes, h.seeds, h.morph || h.positions];
    data.forEach((arr, k) => { gl.bindBuffer(gl.ARRAY_BUFFER, h.bufs[k]); gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW); });
    h.dirty = false;
  }
  // o: {cam, model, size (multiplier, 1), alpha, additive (true), soft (glow 0..1; default 1 when additive),
  //     morph 0..1, swirl (0.35), stagger (0.6), time, twinkle (0.15), sizeRef (cam.dist; 0 = no attenuation),
  //     minSize (1), maxSize, tint css, tintAmt, reveal [x,y,z,r], revealSoft}
  function drawCloud(h, o = {}) {
    if (!h) return;
    if (!init()) { fallback.push(['cloud', h, o]); return; }
    begin.auto();
    uploadCloud(h);
    const { p, u } = P.points, cam = o.cam || camera();
    const add = o.additive ?? P.additive ?? true;
    gl.useProgram(p);
    gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND);
    if (add) gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ONE, gl.ONE); else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniformMatrix4fv(u.uModel, false, o.model || M4.I());
    gl.uniformMatrix4fv(u.uView, false, cam.view); gl.uniformMatrix4fv(u.uProj, false, cam.proj);
    gl.uniform1f(u.uSize, o.size ?? 1); gl.uniform1f(u.uAlpha, o.alpha ?? 1); gl.uniform1f(u.uTime, o.time ?? 0);
    gl.uniform1f(u.uTwinkle, o.twinkle ?? 0.15); gl.uniform1f(u.uMorph, h.morph ? o.morph ?? 0 : 0);
    gl.uniform1f(u.uSwirl, o.swirl ?? 0.35); gl.uniform1f(u.uStagger, o.stagger ?? 0.6);
    gl.uniform1f(u.uSizeRef, o.sizeRef ?? cam.dist ?? 0); gl.uniform1f(u.uMinSize, o.minSize ?? 1);
    gl.uniform1f(u.uMaxSize, Math.min(o.maxSize ?? 96, ptRange[1]));
    const tint = o.tint ? rgb(o.tint) : [1, 1, 1];
    gl.uniform4f(u.uTint, tint[0], tint[1], tint[2], o.tint ? o.tintAmt ?? 1 : 0);
    const rv = o.reveal || [0, 0, 0, -1];
    gl.uniform4f(u.uReveal, rv[0], rv[1], rv[2], rv[3]); gl.uniform1f(u.uRevealSoft, o.revealSoft ?? 0.15);
    gl.uniform1f(u.uSoft, o.soft ?? (add ? 1 : 0)); gl.uniform1f(u.uAdd, add ? 1 : 0);
    gl.bindVertexArray(h.vao); gl.drawArrays(gl.POINTS, 0, h.n); gl.bindVertexArray(null);
  }

  // ───────── lines ─────────
  // Segments: Float32Array(m*6) [ax,ay,az,bx,by,bz...] or [[a],[b]] pairs. o: {colors (per-segment css or fn(i)),
  // colorsEnd, u (Float32Array m*2 path params; default 0..1 per segment), seeds}.
  function lines(segs, o = {}) {
    let s = segs;
    if (!(s instanceof Float32Array)) { s = new Float32Array(segs.length * 6); segs.forEach((g, i) => { s.set(g[0], i * 6); s.set(g[1], i * 6 + 3); }); }
    const m = s.length / 6, A = new Float32Array(m * 3), B = new Float32Array(m * 3);
    for (let i = 0; i < m; i++) { A.set(s.subarray(i * 6, i * 6 + 3), i * 3); B.set(s.subarray(i * 6 + 3, i * 6 + 6), i * 3); }
    const U = o.u || (() => { const a = new Float32Array(m * 2); for (let i = 0; i < m; i++) { a[i * 2] = 0; a[i * 2 + 1] = 1; } return a; })();
    const c0 = colors(m, o.colors || '#FFFFFF', A), c1 = o.colorsEnd ? colors(m, o.colorsEnd, B) : c0;
    const seeds = o.seeds || Float32Array.from({ length: m }, (_, i) => hash(i * 0.618 + 1.5));
    return { m, A, B, U, c0, c1, seeds, vao: null };
  }
  // Polyline (array of [x,y,z]) -> segments whose path param runs 0..1 along the whole path (pulses travel along it).
  function path(points, o = {}) {
    const m = points.length - 1, s = new Float32Array(m * 6), U = new Float32Array(m * 2), L = [0];
    for (let i = 1; i < points.length; i++) L.push(L[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1], (points[i][2] || 0) - (points[i - 1][2] || 0)));
    const tot = L[L.length - 1] || 1;
    for (let i = 0; i < m; i++) {
      s.set([points[i][0], points[i][1], points[i][2] || 0, points[i + 1][0], points[i + 1][1], points[i + 1][2] || 0], i * 6);
      U[i * 2] = L[i] / tot; U[i * 2 + 1] = L[i + 1] / tot;
    }
    const seed = o.seed ?? 0.5;
    // colours run along the whole path: o.colors -> o.colorsEnd over u, or o.colors as fn(u) -> css
    const at = typeof o.colors === 'function' ? q => rgb(o.colors(q))
      : o.colorsEnd ? (() => { const a = rgb(o.colors || '#FFFFFF'), b = rgb(o.colorsEnd); return q => [lerp(a[0], b[0], q), lerp(a[1], b[1], q), lerp(a[2], b[2], q)]; })()
      : null;
    const extra = {};
    if (at) {
      const c0 = new Float32Array(m * 3), c1 = new Float32Array(m * 3);
      for (let i = 0; i < m; i++) { c0.set(at(U[i * 2]), i * 3); c1.set(at(U[i * 2 + 1]), i * 3); }
      extra.colors = c0; extra.colorsEnd = c1;
    }
    return lines(s, { ...o, ...extra, u: U, seeds: Float32Array.from({ length: m }, () => seed) });
  }
  // Graph edges between indexed points; o.bulge bends each edge away from o.center (arcs, connectome look),
  // o.segments subdivisions per edge (8 when bulging), o.colors per edge.
  function edges(positions, pairs, o = {}) {
    const k = o.bulge ? o.segments || 8 : 1, cen = o.center || [0, 0, 0];
    const flat = pairs instanceof Uint32Array || pairs instanceof Int32Array || (Array.isArray(pairs) && typeof pairs[0] === 'number');
    const E = flat ? pairs.length / 2 : pairs.length;
    const s = new Float32Array(E * k * 6), U = new Float32Array(E * k * 2), seeds = new Float32Array(E * k);
    const P3 = i => [positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]];
    for (let e = 0; e < E; e++) {
      const ia = flat ? pairs[e * 2] : pairs[e][0], ib = flat ? pairs[e * 2 + 1] : pairs[e][1];
      const a = P3(ia), b = P3(ib), mid = [(a[0] + b[0]) / 2 - cen[0], (a[1] + b[1]) / 2 - cen[1], (a[2] + b[2]) / 2 - cen[2]];
      const ml = Math.hypot(...mid) || 1, L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), sd = hash(e * 0.618 + 3.3);
      const at = q => { const bu = Math.sin(Math.PI * q) * L * (o.bulge || 0) / ml; return [lerp(a[0], b[0], q) + mid[0] * bu, lerp(a[1], b[1], q) + mid[1] * bu, lerp(a[2], b[2], q) + mid[2] * bu]; };
      for (let j = 0; j < k; j++) {
        const q0 = j / k, q1 = (j + 1) / k, idx = e * k + j;
        s.set([...at(q0), ...at(q1)], idx * 6); U[idx * 2] = q0; U[idx * 2 + 1] = q1; seeds[idx] = sd;
      }
    }
    const per = o.colors && typeof o.colors === 'function' ? i => o.colors(Math.floor(i / k)) : o.colors;
    return lines(s, { ...o, u: U, seeds, colors: per || '#FFFFFF' });
  }
  function uploadLines(h) {
    if (h.vao) return;
    h.vao = gl.createVertexArray(); gl.bindVertexArray(h.vao);
    const lay = [[0, h.A, 3], [1, h.B, 3], [2, h.U, 2], [3, h.c0, 3], [4, h.c1, 3], [5, h.seeds, 1]];
    for (const [loc, arr, k] of lay) {
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, k, gl.FLOAT, false, 0, 0); gl.vertexAttribDivisor(loc, 1);
    }
    gl.bindVertexArray(null);
  }
  // o: {cam, model, width px (1.5), persp (false: constant px), alpha, additive (true), glow 0..1 (0.6),
  //     draw 0..1 (draw-on progress along u), drawSoft (0.04), stagger (0), time,
  //     pulse: {amount, speed (cycles/s), width (in u), color, spread (per-seed phase offset)}}
  function drawLines(h, o = {}) {
    if (!h) return;
    if (!init()) { fallback.push(['lines', h, o]); return; }
    begin.auto();
    uploadLines(h);
    const { p, u } = P.lines, cam = o.cam || camera(), add = o.additive ?? P.additive ?? true, pl = o.pulse || {};
    gl.useProgram(p);
    gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND);
    if (add) gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ONE, gl.ONE); else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniformMatrix4fv(u.uModel, false, o.model || M4.I());
    gl.uniformMatrix4fv(u.uView, false, cam.view); gl.uniformMatrix4fv(u.uProj, false, cam.proj);
    gl.uniform2f(u.uRes, W, H); gl.uniform1f(u.uWidth, o.width ?? 1.5); gl.uniform1f(u.uPersp, o.persp ? 1 : 0);
    gl.uniform1f(u.uSizeRef, o.sizeRef ?? cam.dist ?? 3);
    gl.uniform1f(u.uAlpha, o.alpha ?? 1); gl.uniform1f(u.uGlow, o.glow ?? 0.6);
    gl.uniform1f(u.uDraw, o.draw ?? 1); gl.uniform1f(u.uDrawSoft, o.drawSoft ?? 0.04); gl.uniform1f(u.uStagger, o.stagger ?? 0);
    gl.uniform1f(u.uTime, o.time ?? 0);
    gl.uniform1f(u.uPulseAmt, pl.amount ?? 0); gl.uniform1f(u.uPulseSpeed, pl.speed ?? 0.5);
    gl.uniform1f(u.uPulseWidth, pl.width ?? 0.06); gl.uniform1f(u.uPulseSpread, pl.spread ?? 1);
    const pc = rgb(pl.color || '#FFFFFF'); gl.uniform3f(u.uPulseCol, pc[0], pc[1], pc[2]);
    // caps overlap neighbouring segments: only for hard opaque lines (soft or additive ends would double up at joints)
    gl.uniform1f(u.uAdd, add ? 1 : 0); gl.uniform1f(u.uCap, o.cap ?? (add || (o.glow ?? 0.6) > 0.2 ? 0 : 1));
    gl.bindVertexArray(h.vao); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, h.m); gl.bindVertexArray(null);
  }

  // ───────── textured panels ─────────
  function texFor(src, dynamic) {
    const w = src.naturalWidth || src.videoWidth || src.width, h = src.naturalHeight || src.videoHeight || src.height;
    let e = texCache.get(src);
    const fresh = !e;
    if (!e) { e = { tex: gl.createTexture(), w: 0, h: 0 }; texCache.set(src, e); }
    if (fresh || dynamic || e.w !== w || e.h !== h) {
      gl.bindTexture(gl.TEXTURE_2D, e.tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(16, maxAniso));
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      e.w = w; e.h = h;
    }
    return e;
  }
  // Panel geometry: centre (x, y) px, size (w, h) px, rotations rx (top recedes), ry (right edge recedes),
  // rz (clockwise), z (px, + = away), focal (px). Returns corners [[x, y, q] x4] TL, TR, BR, BL.
  function panelCorners(o, expand = 0) {
    o = geomOf.get(o) || o;
    if (o.corners) {
      const c = o.corners;
      // projective weights from the diagonal intersection (exact for a planar rectangle in perspective)
      const [p0, p1, p2, p3] = c, d1 = [p2[0] - p0[0], p2[1] - p0[1]], d2 = [p3[0] - p1[0], p3[1] - p1[1]];
      const den = d1[0] * d2[1] - d1[1] * d2[0];
      let q = [1, 1, 1, 1];
      if (Math.abs(den) > 1e-9) {
        const s = ((p1[0] - p0[0]) * d2[1] - (p1[1] - p0[1]) * d2[0]) / den, k = ((p1[0] - p0[0]) * d1[1] - (p1[1] - p0[1]) * d1[0]) / den;
        const ci = [p0[0] + d1[0] * s, p0[1] + d1[1] * s], dist = p => Math.hypot(p[0] - ci[0], p[1] - ci[1]);
        const dd = [dist(p0), dist(p1), dist(p2), dist(p3)];
        if (s > 0 && s < 1 && k > 0 && k < 1) q = [(dd[0] + dd[2]) / dd[2], (dd[1] + dd[3]) / dd[3], (dd[2] + dd[0]) / dd[0], (dd[3] + dd[1]) / dd[1]];
      }
      if (!expand) return c.map((p, i) => [p[0], p[1], q[i]]);
      const cx = (c[0][0] + c[1][0] + c[2][0] + c[3][0]) / 4, cy = (c[0][1] + c[1][1] + c[2][1] + c[3][1]) / 4;
      return c.map((p, i) => { const dx = p[0] - cx, dy = p[1] - cy, l = Math.hypot(dx, dy) || 1; return [p[0] + (dx / l) * expand * 1.41, p[1] + (dy / l) * expand * 1.41, q[i]]; });
    }
    const hw = o.w / 2 + expand, hh = o.h / 2 + expand, f = o.focal ?? 1600;
    return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([x, y]) => _proj(o, x, y, f));
  }
  function _proj(o, x, y, f) {
    const ax = o.rx || 0, ay = o.ry || 0, az = o.rz || 0;
    let X = x, Y = y * Math.cos(ax), Z = -y * Math.sin(ax);                       // tilt: top recedes for rx > 0
    const X2 = X * Math.cos(ay) - Z * Math.sin(ay), Z2 = X * Math.sin(ay) + Z * Math.cos(ay); // turn: right recedes
    X = X2; Z = Z2;
    const X3 = X * Math.cos(az) - Y * Math.sin(az), Y3 = X * Math.sin(az) + Y * Math.cos(az); // roll
    const s = f / Math.max(f + Z + (o.z || 0), 1);
    return [o.x + X3 * s, o.y + Y3 * s, s];
  }
  // Screen position of panel-space point (u, v in 0..1) for the same options (anchor carets, highlights, callouts).
  function panelPoint(o, u, v) {
    o = geomOf.get(o) || o;
    if (o.corners) {
      const c = panelCorners(o), q = [(1 - u) * (1 - v), u * (1 - v), u * v, (1 - u) * v];
      let x = 0, y = 0, w = 0;
      for (let i = 0; i < 4; i++) { const k = q[i] * c[i][2]; x += c[i][0] * k; y += c[i][1] * k; w += k; }
      return [x / w, y / w];
    }
    const p = _proj(o, (u - 0.5) * o.w, (v - 0.5) * o.h, o.focal ?? 1600);
    return [p[0], p[1]];
  }
  function _drawQuad(c, du = 0, dv = 0) {
    const uv = [[-du, -dv], [1 + du, -dv], [1 + du, 1 + dv], [-du, 1 + dv]], data = new Float32Array(20);
    c.forEach((p, i) => { data.set([p[0], p[1], uv[i][0] * p[2], uv[i][1] * p[2], p[2]], i * 5); });
    gl.bindBuffer(gl.ARRAY_BUFFER, P.panelBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
    gl.bindVertexArray(P.panelVAO); gl.drawArrays(gl.TRIANGLE_FAN, 0, 4); gl.bindVertexArray(null);
  }
  // Draw an image/canvas as a 3D-tilted panel. o: {x, y, w, h (default: source aspect at width w), rx, ry, rz, z,
  // focal, corners, radius (px, panel space), alpha, shade 0..1, sheen (0..1 sweep position; omit for none),
  // sheenWidth, border {width, color}, glow {width, color}, shadow {blur, alpha, dx, dy, color},
  // crop {x, y, w, h} (source px), dynamic (re-upload each call, e.g. a canvas redrawn every frame)}.
  // Returns the corners. Panels are drawn untone-mapped (exact colours) on top of anything resolved so far.
  function panel(src, o = {}) {
    if (!src) return null;
    const sw = src.naturalWidth || src.videoWidth || src.width, sh = src.naturalHeight || src.videoHeight || src.height;
    const cr = o.crop || { x: 0, y: 0, w: sw, h: sh };
    const w = o.w ?? cr.w, h = o.h ?? (w * cr.h) / cr.w;
    const g = { ...o, w, h, x: o.x ?? W / 2, y: o.y ?? H / 2 };
    geomOf.set(o, g);
    if (!init()) { fallback.push(['panel', src, g]); return panelCorners(g); }
    begin.auto();
    resolve();
    const { p, u } = P.panel, e = texFor(src, o.dynamic);
    gl.useProgram(p);
    gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform2f(u.uRes, W, H); gl.uniform2f(u.uSize, w, h);
    gl.uniform4f(u.uCrop, cr.x / sw, cr.y / sh, (cr.x + cr.w) / sw, (cr.y + cr.h) / sh);
    gl.uniform1f(u.uRadius, Math.min(o.radius ?? 0, w / 2, h / 2)); gl.uniform1f(u.uAlpha, o.alpha ?? 1);
    gl.uniform1f(u.uShade, o.shade ?? 0); gl.uniform1f(u.uSheen, o.sheen ?? -1); gl.uniform1f(u.uSheenW, o.sheenWidth ?? 0.18);
    const bc = o.border ? parseColor(o.border.color || '#FFFFFF') : [0, 0, 0, 0];
    gl.uniform1f(u.uBorderW, o.border ? o.border.width ?? 1.5 : 0); gl.uniform4f(u.uBorderCol, bc[0] / 255, bc[1] / 255, bc[2] / 255, bc[3]);
    const gc = o.glow ? parseColor(o.glow.color || C.accent) : [0, 0, 0, 0];
    gl.uniform1f(u.uGlowW, o.glow ? o.glow.width ?? 24 : 0); gl.uniform4f(u.uGlowCol, gc[0] / 255, gc[1] / 255, gc[2] / 255, o.glow ? o.glow.alpha ?? 0.6 : 0);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, e.tex); gl.uniform1i(u.uTex, 0);
    if (o.shadow) {
      const s = o.shadow, blur = s.blur ?? 40, sc = parseColor(s.color || '#000000');
      const c = panelCorners(g, blur).map(q => [q[0] + (s.dx ?? 0), q[1] + (s.dy ?? 24), q[2]]);
      gl.uniform1f(u.uShadow, 1); gl.uniform1f(u.uSoft, blur * 0.5);
      gl.uniform4f(u.uShadowCol, sc[0] / 255, sc[1] / 255, sc[2] / 255, s.alpha ?? 0.35);
      _drawQuad(c, blur / w, blur / h);
    }
    gl.uniform1f(u.uShadow, 0);
    const gw = o.glow ? (o.glow.width ?? 24) * 3 : 0;
    const corners = panelCorners(g, gw);
    _drawQuad(corners, gw / w, gw / h);
    return gw ? panelCorners(g) : corners;
  }

  // ───────── frame control ─────────
  // begin({hdr}): clear and start a GL layer. hdr (default true) accumulates additive light in RGBA16F and tone-maps
  // on resolve; panels always draw exact colours after a resolve.
  // Default blending: additive light when the scene being drawn is dark (or the theme is), normal otherwise.
  const sceneDark = () => THEME === 'dark' || (typeof REEL !== 'undefined' && REEL.drawing ? !!REEL.drawing.dark : false);
  function begin(o = {}) {
    fallback = [];
    P.additive = o.additive ?? o.dark ?? sceneDark();
    if (!init()) return false;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H); gl.disable(gl.SCISSOR_TEST);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    hdrOn = o.hdr !== false && !!hdr;
    if (hdrOn) { gl.bindFramebuffer(gl.FRAMEBUFFER, hdr.fb); gl.clear(gl.COLOR_BUFFER_BIT); }
    pending = true;
    P.exposure = o.exposure ?? 1.25;
    return true;
  }
  begin.auto = () => { if (!pending) begin(); };
  // Tone-map accumulated HDR light onto the layer (called by panel() and blit()).
  function resolve(exposure) {
    if (!ok || !hdrOn) return;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(P.resolve.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, hdr.t); gl.uniform1i(P.resolve.u.uTex, 0);
    gl.uniform1f(P.resolve.u.uExp, exposure ?? P.exposure ?? 1.25);
    gl.bindVertexArray(P.quadVAO); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.bindVertexArray(null);
    hdrOn = false;
  }
  // Composite the GL layer into a 2D context. o: {alpha, op (globalCompositeOperation), exposure, x, y, w, h}.
  function blit(ctx, o = {}) {
    if (!init()) { _fallbackDraw(ctx, o); fallback = []; return; }
    if (!pending) return;
    resolve(o.exposure);
    ctx.save();
    ctx.globalAlpha *= o.alpha ?? 1;
    if (o.op) ctx.globalCompositeOperation = o.op;
    ctx.drawImage(cv, 0, 0, W, H, o.x ?? 0, o.y ?? 0, o.w ?? W, o.h ?? H);
    ctx.restore();
    pending = false;
  }

  // ───────── Canvas2D fallback (no WebGL2) ─────────
  function _fallbackDraw(ctx, o) {
    ctx.save();
    ctx.globalAlpha *= o.alpha ?? 1;
    for (const [kind, h, d] of fallback) {
      if (kind === 'cloud') {
        const cam = d.cam || camera(), add = d.additive ?? sceneDark();
        ctx.globalCompositeOperation = add ? 'lighter' : 'source-over';
        const mt = h.morph ? d.morph || 0 : 0;
        for (let i = 0; i < h.n; i += Math.max(1, Math.floor(h.n / 6000))) {
          let p = [h.positions[i * 3], h.positions[i * 3 + 1], h.positions[i * 3 + 2]];
          if (mt > 0) { const e = clamp(mt * 1.6 - h.seeds[i] * 0.6); const k = e * e * (3 - 2 * e); p = [lerp(p[0], h.morph[i * 3], k), lerp(p[1], h.morph[i * 3 + 1], k), lerp(p[2], h.morph[i * 3 + 2], k)]; }
          const s = project(cam, p, d.model);
          if (!s[3]) continue;
          const r = Math.max(0.6, (h.sizes[i] * (d.size ?? 1) * ((d.sizeRef ?? cam.dist) / s[2])) / 2);
          ctx.fillStyle = `rgba(${h.colors[i * 3] * 255 | 0},${h.colors[i * 3 + 1] * 255 | 0},${h.colors[i * 3 + 2] * 255 | 0},${(d.alpha ?? 1) * 0.8})`;
          ctx.fillRect(s[0] - r, s[1] - r, r * 2, r * 2);
        }
      } else if (kind === 'lines') {
        const cam = d.cam || camera();
        ctx.globalCompositeOperation = d.additive ?? sceneDark() ? 'lighter' : 'source-over';
        ctx.lineWidth = d.width ?? 1.5;
        for (let i = 0; i < h.m; i++) {
          if (h.U[i * 2] > (d.draw ?? 1)) continue;
          const a = project(cam, [h.A[i * 3], h.A[i * 3 + 1], h.A[i * 3 + 2]], d.model), b = project(cam, [h.B[i * 3], h.B[i * 3 + 1], h.B[i * 3 + 2]], d.model);
          if (!a[3] && !b[3]) continue;
          ctx.strokeStyle = `rgba(${h.c0[i * 3] * 255 | 0},${h.c0[i * 3 + 1] * 255 | 0},${h.c0[i * 3 + 2] * 255 | 0},${d.alpha ?? 1})`;
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        }
      } else if (kind === 'panel') {
        ctx.globalCompositeOperation = 'source-over';
        const c = panelCorners(d), sw = h.naturalWidth || h.width, sh = h.naturalHeight || h.height;
        // two affine triangles (no perspective correction)
        for (const [i0, i1, i2, s0, s1, s2] of [[0, 1, 3, [0, 0], [sw, 0], [0, sh]], [2, 3, 1, [sw, sh], [0, sh], [sw, 0]]]) {
          const [x0, y0] = c[i0], [x1, y1] = c[i1], [x2, y2] = c[i2];
          const den = s0[0] * (s1[1] - s2[1]) + s1[0] * (s2[1] - s0[1]) + s2[0] * (s0[1] - s1[1]);
          if (!den) continue;
          const a = (x0 * (s1[1] - s2[1]) + x1 * (s2[1] - s0[1]) + x2 * (s0[1] - s1[1])) / den;
          const b = (y0 * (s1[1] - s2[1]) + y1 * (s2[1] - s0[1]) + y2 * (s0[1] - s1[1])) / den;
          const cc = (x0 * (s2[0] - s1[0]) + x1 * (s0[0] - s2[0]) + x2 * (s1[0] - s0[0])) / den;
          const dd = (y0 * (s2[0] - s1[0]) + y1 * (s0[0] - s2[0]) + y2 * (s1[0] - s0[0])) / den;
          const e = x0 - a * s0[0] - cc * s0[1], f = y0 - b * s0[0] - dd * s0[1];
          ctx.save();
          ctx.globalAlpha *= d.alpha ?? 1;
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.closePath(); ctx.clip();
          ctx.setTransform(a, b, cc, dd, e, f);
          ctx.drawImage(h, 0, 0);
          ctx.restore();
        }
      }
    }
    ctx.restore();
  }

  return {
    get ok() { return init(); },
    get canvas() { init(); return cv; },
    get gl() { init(); return gl; },
    M4, camera, project, rgb, colors,
    textPoints, imagePoints, shapePoints, pairPoints,
    cloud, drawCloud, lines, path, edges, drawLines,
    panel, panelCorners, panelPoint,
    begin, resolve, blit,
  };
})();
