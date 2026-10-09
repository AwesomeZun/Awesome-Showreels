// veyrande-silk.js (project module): ivory duchesse satin, draped in long folds and lit by one warm lamp.
// A WebGL2 fragment shader on its own offscreen canvas (the shared gl.js has no custom-shader entry point), drawn
// into the scene's 2D context. Pure in its inputs: the same (t, o) gives the same pixels. Without WebGL2 it falls
// back to a Canvas2D gradient sheen.
//   VEYRANDE.silk.draw(ctx, t, {P, x, y, w, h, zoom, panX, panY, lampX, lampY, lamp, fold, alpha})
//     x, y, w, h: target rect in px (default: full frame); zoom/pan: camera on the cloth (the cloth is re-rendered,
//     never an upscaled image); lampX/lampY: lamp position in frame fractions; lamp: 0..1 lamp strength.
(() => {
  const V = (window.VEYRANDE = window.VEYRANDE || {});
  let cv = null, gl = null, prog = null, U = {}, ok = null;
  const VS = `#version 300 es
in vec2 p; out vec2 uv;
void main() { uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;
  // Height field: radial folds that fan out from a gather point above the frame (fabric pinned and falling), a slow
  // billow travelling along them, two fold frequencies. Satin = wrapped diffuse + an anisotropic sheen along the folds.
  const FS = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform vec2 res; uniform float t; uniform float zoom; uniform vec2 pan; uniform vec2 lampPos; uniform float lampAmt;
uniform float foldAmt; uniform float bump; uniform vec3 cDeep, cShadow, cMid, cHigh, cLamp;
const vec2 G = vec2(-1.2, -2.6);                       // the gather point, far above the frame: long, slightly fanned folds
float ridge(float u) { float c = 0.5 + 0.5 * cos(u); return c * c * (3.0 - 2.0 * c); }
float height(vec2 q) {
  vec2 d = q - G; float r = length(d); float a = atan(d.y, d.x);
  float A = a + 0.055 * sin(r * 1.3 + 0.7 - t * 0.05) + 0.03 * sin(r * 2.9 + t * 0.08);
  float h = 0.80 * ridge(A * 40.0 + 0.8 * sin(r * 0.9 + t * 0.07))
          + 0.16 * ridge(A * 103.0 + 1.7 + 1.1 * sin(r * 1.6 - t * 0.09))
          + 0.04 * ridge(A * 231.0 + 0.4 * sin(r * 3.0));
  h += 0.30 * sin(r * 1.6 - A * 6.0 - t * 0.12);
  return h * foldAmt;
}
void main() {
  vec2 frag = vec2(uv.x, 1.0 - uv.y) * res;
  vec2 q = ((frag - 0.5 * res) / zoom + 0.5 * res + pan) / res.y;
  float e = 1.0 / res.y;
  float h0 = height(q), hx = height(q + vec2(e, 0.0)), hy = height(q + vec2(0.0, e));
  vec3 N = normalize(vec3(-vec2(hx - h0, hy - h0) / e * bump, 1.0));
  vec2 lp = vec2(lampPos.x * res.x / res.y, lampPos.y);
  vec3 L = normalize(vec3(lp - q, 0.0) * 0.9 + vec3(-0.35, -0.45, 0.62));
  vec3 Hh = normalize(L + vec3(0.0, 0.0, 1.0));
  float ndl = dot(N, L), NH = max(dot(N, Hh), 0.0);
  float pool = exp(-dot(q - lp, q - lp) * 0.9);
  float diff = clamp(ndl * 0.85 + 0.22, 0.0, 1.0);
  vec3 col = mix(cDeep, cShadow, smoothstep(0.0, 0.38, diff));
  col = mix(col, cMid, smoothstep(0.32, 0.86, diff));
  float spec = 0.30 * pow(NH, 7.0) + 0.75 * pow(NH, 48.0);
  col = mix(col, cHigh, clamp(spec * lampAmt * (0.55 + 0.45 * pool), 0.0, 0.88));
  col = mix(col, col * cLamp / max(max(cLamp.r, cLamp.g), cLamp.b), 0.10 * pool * lampAmt);
  col *= mix(0.94, 1.03, pool * lampAmt);
  o = vec4(col, 1.0);
}`;
  function init() {
    if (ok !== null) return ok;
    ok = false;
    try {
      cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      gl = cv.getContext('webgl2', { alpha: false, antialias: false, preserveDrawingBuffer: true, depth: false, stencil: false });
      if (!gl) { console.warn('[veyrande-silk] WebGL2 unavailable: satin falls back to a Canvas2D sheen'); return ok; }
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
      prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
      gl.bindAttribLocation(prog, 0, 'p');
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      for (const n of ['res', 't', 'zoom', 'pan', 'lampPos', 'lampAmt', 'foldAmt', 'bump', 'cDeep', 'cShadow', 'cMid', 'cHigh', 'cLamp']) U[n] = gl.getUniformLocation(prog, n);
      const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      ok = true;
    } catch (e) { console.warn('[veyrande-silk] shader failed, Canvas2D fallback: ' + (e.message || e)); ok = false; }
    return ok;
  }
  const rgb = c => { const [r, g, b] = parseColor(c); return [r / 255, g / 255, b / 255]; };
  // Satin tones from the palette: the ivory paper lit by a champagne lamp, shadows in warm greige.
  function tones(P) {
    return { deep: mix(P.bg2, P.ink2, 0.42), shadow: mix(P.bg2, P.accent3, 0.22), mid: mix(P.bg, '#FFFFFF', 0.25), high: mix('#FFFFFF', P.accent, 0.12), lamp: P.accent };
  }
  function draw(ctx, t, o = {}) {
    const P = o.P || C, x = o.x ?? 0, y = o.y ?? 0, w = o.w ?? W, h = o.h ?? H, T = tones(P);
    if (!init()) {                                                             // Canvas2D fallback: a moving sheen
      ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
      ctx.fillStyle = T.mid; ctx.fillRect(x, y, w, h);
      for (let i = 0; i < 9; i++) {
        const cx = x + ((i / 9 + t * 0.01) % 1) * w * 1.3 - w * 0.15;
        ctx.fillStyle = linear(ctx, cx - 90, 0, cx + 90, 0, [[0, rgba(T.shadow, 0)], [0.5, rgba(i % 2 ? T.high : T.shadow, 0.5)], [1, rgba(T.shadow, 0)]]);
        ctx.fillRect(cx - 90, y, 180, h);
      }
      ctx.restore();
      return;
    }
    gl.viewport(0, 0, W, H);
    gl.useProgram(prog);
    gl.uniform2f(U.res, W, H);
    gl.uniform1f(U.t, t);
    gl.uniform1f(U.zoom, o.zoom ?? 1);
    gl.uniform2f(U.pan, o.panX ?? 0, o.panY ?? 0);
    gl.uniform2f(U.lampPos, o.lampX ?? 0.3, o.lampY ?? 0.25);
    gl.uniform1f(U.lampAmt, o.lamp ?? 1);
    gl.uniform1f(U.foldAmt, o.fold ?? 1);
    gl.uniform1f(U.bump, o.bump ?? 0.06);
    gl.uniform3fv(U.cDeep, rgb(T.deep)); gl.uniform3fv(U.cShadow, rgb(T.shadow)); gl.uniform3fv(U.cMid, rgb(T.mid));
    gl.uniform3fv(U.cHigh, rgb(T.high)); gl.uniform3fv(U.cLamp, rgb(T.lamp));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    ctx.save();
    ctx.globalAlpha *= o.alpha ?? 1;
    ctx.drawImage(cv, x, y, w, h, x, y, w, h);
    ctx.restore();
  }
  V.silk = { draw, ok: () => init() };
})();
