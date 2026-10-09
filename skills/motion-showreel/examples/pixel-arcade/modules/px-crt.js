// px-crt: shows the 320 x 180 console canvas through a CRT, full frame, in every scene (a project module).
//
// Why a CRT: the jam page itself lays a 4-px scanline overlay over pixelated art (source/site/style.css), and the
// brief asks for scanlines and bloom. The tube is a display, not the game, so it runs on the 60-fps timeline while
// the game steps at 12 fps. It is drawn by each scene (OCJ.present) because the compositor composites scene buffers;
// glow comes from the compositor's bloom (style.post.bloom), never from here.
//
// WebGL2 pass: barrel curvature (style.pixel.crt.curvature), rounded glass corners (corner), sharp-bilinear sampling
// across x (crisp pixels, no shimmer on the curve), a gaussian beam per source row whose width grows with brightness
// (dark rows show the scanline gap, bright rows bloom into it: scanline), a faint aperture grille (mask), a slow
// refresh band (roll) and power on/off (a line, then a dot). Linear-light maths, sRGB out. Without WebGL2 the same
// look is approximated in Canvas2D (nearest upscale + scanline pattern + rounded corners).
// Pure: the output depends only on the canvas pixels and the arguments (t, power).
(() => {
  const SPEC = (STYLE.pixel && STYLE.pixel.crt) || {};
  const PAR = {
    curvature: SPEC.curvature ?? 0.045, scanline: SPEC.scanline ?? 0.42, mask: SPEC.mask ?? 0.1,
    corner: SPEC.corner ?? 0.05, roll: SPEC.roll ?? 0.03,
  };
  const VS = `#version 300 es
in vec2 aPos; out vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;
  const FS = `#version 300 es
precision highp float;
uniform sampler2D uSrc;
uniform vec2 uSrcSize, uOutSize, uPower;
uniform float uCurve, uScan, uMask, uCorner, uRoll, uTime, uBoost, uBezel, uSpot;
in vec2 vUv; out vec4 o;
vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }
vec3 texel(vec2 ij) { return lin(texture(uSrc, (ij + 0.5) / uSrcSize).rgb); }
float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
// beam weight at distance d (texels) from a row centre; brighter rows are wider
float beam(float d, float l) { float s = mix(0.27, 0.46, sqrt(clamp(l, 0.0, 1.0))); return exp(-0.5 * d * d / (s * s)); }
// rounded-rect signed distance (p, half size b, radius r), all in uv units
float rbox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main() {
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);                 // top-left origin, like the canvas
  vec2 c = uv * 2.0 - 1.0;
  c *= vec2(1.0 + c.y * c.y * uCurve * 0.85, 1.0 + c.x * c.x * uCurve * 1.2);
  vec2 w = c * 0.5 + 0.5;                              // warped screen uv
  vec2 p = (w - 0.5) / max(uPower, vec2(1e-4)) + 0.5; // power on/off squeezes the raster around the centre
  float aspect = uOutSize.x / uOutSize.y;
  vec2 e = (w - 0.5) * vec2(aspect, 1.0);
  float edge = rbox(e, vec2(0.5 * aspect, 0.5), uCorner);
  float px = 1.5 / uOutSize.y;
  float inside = 1.0 - smoothstep(-px, px, edge);      // anti-aliased glass edge
  vec3 col = vec3(0.0);
  if (p.x >= 0.0 && p.x <= 1.0 && p.y >= 0.0 && p.y <= 1.0) {
    vec2 tc = p * uSrcSize;
    float x0 = floor(tc.x - 0.5), fx = tc.x - 0.5 - x0;
    float sharp = uOutSize.x / uSrcSize.x * 0.75;     // output px per texel: soft only right at a pixel edge
    fx = clamp((fx - 0.5) * sharp + 0.5, 0.0, 1.0);
    float y0 = floor(tc.y - 0.5), fy = tc.y - 0.5 - y0;
    vec3 r0 = mix(texel(vec2(x0, y0)), texel(vec2(x0 + 1.0, y0)), fx);
    vec3 r1 = mix(texel(vec2(x0, y0 + 1.0)), texel(vec2(x0 + 1.0, y0 + 1.0)), fx);
    vec3 rm = mix(texel(vec2(x0, y0 - 1.0)), texel(vec2(x0 + 1.0, y0 - 1.0)), fx);
    vec3 rp = mix(texel(vec2(x0, y0 + 2.0)), texel(vec2(x0 + 1.0, y0 + 2.0)), fx);
    vec3 beamCol = r0 * beam(fy, lum(r0)) + r1 * beam(1.0 - fy, lum(r1)) + rm * beam(fy + 1.0, lum(rm)) + rp * beam(2.0 - fy, lum(rp));
    vec3 flat_ = fy < 0.5 ? r0 : r1;
    col = mix(flat_, beamCol * 1.38, uScan);
    // aperture grille: a faint RGB triad across the output columns
    float m = mod(floor(gl_FragCoord.x), 3.0);
    vec3 mask = vec3(1.0 - uMask);
    if (m < 0.5) mask.r = 1.0 + uMask * 0.6; else if (m < 1.5) mask.g = 1.0 + uMask * 0.6; else mask.b = 1.0 + uMask * 0.6;
    col *= mask;
    // slow refresh band rolling down the tube
    float band = fract(uv.y * 0.85 - uTime * 0.11);
    col *= 1.0 + uRoll * exp(-pow((band - 0.5) * 7.0, 2.0));
    // inner edge falloff of the glass (the tube is darker at its rim)
    float rim = smoothstep(0.0, 0.07, -edge);
    col *= mix(0.72, 1.0, rim);
    col = col * uBoost + vec3(uBoost - 1.0) * 0.08;
  }
  // power-on/off spot: a hot line (raster squeezed in y) or dot (squeezed in both), uSpot = its intensity
  if (uSpot > 0.0) {
    vec2 ext = vec2(max(uPower.x * 0.5, 0.0), max(uPower.y * 0.5, 0.0));
    vec2 q = abs(w - 0.5);
    float gx = q.x < ext.x ? 1.0 : exp(-0.5 * pow((q.x - ext.x) / 0.0035, 2.0));
    float gy = q.y < ext.y ? 1.0 : exp(-0.5 * pow((q.y - ext.y) / 0.0045, 2.0));
    col += vec3(0.96, 0.94, 0.88) * gx * gy * uSpot;
  }
  // glass: a whisper of reflection, strongest top-left
  vec3 glass = vec3(1.0) * 0.022 * smoothstep(0.9, 0.0, length(uv - vec2(0.18, 0.12)));
  vec3 bezel = vec3(uBezel);
  col = mix(bezel, col + glass, inside);
  o = vec4(pow(max(col, 0.0), vec3(1.0 / 2.2)), 1.0);
}`;
  let GLS = null;   // {canvas, gl, prog, tex, loc} or {fail: true}
  function init() {
    if (GLS) return GLS;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const gl = canvas.getContext('webgl2', { premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: false });
      if (!gl) throw new Error('no webgl2');
      const sh = (type, src) => {
        const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        return s;
      };
      const prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
      const aPos = gl.getAttribLocation(prog, 'aPos');
      gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const loc = {};
      for (const n of ['uSrc', 'uSrcSize', 'uOutSize', 'uPower', 'uCurve', 'uScan', 'uMask', 'uCorner', 'uRoll', 'uTime', 'uBoost', 'uBezel', 'uSpot']) loc[n] = gl.getUniformLocation(prog, n);
      GLS = { canvas, gl, prog, tex, vao, loc };
    } catch (e) {
      console.warn('[px-crt] WebGL2 CRT unavailable, using the Canvas2D tube: ' + (e.message || e));
      GLS = { fail: true };
    }
    return GLS;
  }
  // Canvas2D fallback: nearest upscale, scanline gaps, rounded glass
  let FB = null;
  function fallback(ctx, src, o) {
    if (!FB) {
      const p = document.createElement('canvas'); p.width = 6; p.height = 6;
      const pg = p.getContext('2d');
      pg.fillStyle = 'rgba(0,0,0,0)'; pg.fillRect(0, 0, 6, 6);
      pg.fillStyle = 'rgba(0,0,0,0.42)'; pg.fillRect(0, 5, 6, 1);
      pg.fillStyle = 'rgba(0,0,0,0.18)'; pg.fillRect(0, 0, 6, 1);
      FB = p;
    }
    ctx.save();
    ctx.fillStyle = '#050409'; ctx.fillRect(0, 0, W, H);
    const sx = o.power ? o.power[0] : 1, sy = o.power ? o.power[1] : 1;
    const w = W * sx, h = H * Math.max(sy, 0.004);
    rr(ctx, (W - w) / 2, (H - h) / 2, w, h, 40 * UNIT * Math.min(sx, sy)); ctx.clip();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, (W - w) / 2, (H - h) / 2, w, h);
    ctx.fillStyle = ctx.createPattern(FB, 'repeat'); ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  // power: [sx, sy] raster scale (1, 1 = on). boost: brightness overdrive (power-on flash).
  function present(ctx, scr, env, o = {}) {
    OCJ.finish(scr, o);
    const G = init();
    const power = o.power || [1, 1];
    if (G.fail) { fallback(ctx, scr.c, { power }); return; }
    const { gl, loc } = G;
    gl.viewport(0, 0, W, H);
    gl.useProgram(G.prog);
    gl.bindVertexArray(G.vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, G.tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, scr.c);
    gl.uniform1i(loc.uSrc, 0);
    gl.uniform2f(loc.uSrcSize, OCJ.W, OCJ.H);
    gl.uniform2f(loc.uOutSize, W, H);
    gl.uniform2f(loc.uPower, power[0], power[1]);
    gl.uniform1f(loc.uCurve, o.curvature ?? PAR.curvature);
    gl.uniform1f(loc.uScan, o.scanline ?? PAR.scanline);
    gl.uniform1f(loc.uMask, o.mask ?? PAR.mask);
    gl.uniform1f(loc.uCorner, o.corner ?? PAR.corner);
    gl.uniform1f(loc.uRoll, o.roll ?? PAR.roll);
    gl.uniform1f(loc.uTime, o.time ?? env.t);
    gl.uniform1f(loc.uBoost, o.boost ?? 1);
    gl.uniform1f(loc.uBezel, 0.012);
    gl.uniform1f(loc.uSpot, o.spot ?? 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    ctx.drawImage(G.canvas, 0, 0, W, H);
    ctx.restore();
  }
  // CRT power-on over `dur` s from lt = 0: a hot horizontal line opens into the picture, slightly overdriven.
  function powerOn(lt, dur = 0.22) {
    if (lt >= dur + 0.3) return { power: [1, 1], boost: 1, spot: 0 };
    const sx = lerp(0.55, 1, Ease.outC(clamp(lt / 0.08)));
    const sy = lt < 0.05 ? 0.004 : Math.max(0.004, Ease.outExpo(clamp((lt - 0.05) / (dur - 0.05))));
    const boost = 1 + 0.8 * (1 - clamp((lt - 0.03) / (dur + 0.25)));
    const spot = 1.4 * (1 - clamp((lt - 0.05) / 0.12));
    return { power: [sx, sy], boost, spot: Math.max(0, spot) };
  }
  // CRT power-off over the last `dur` s before `end`: the picture collapses to a line, then to a dot that fades.
  function powerOff(lt, end, dur = 0.34) {
    const u = clamp((lt - (end - dur)) / dur);
    if (u <= 0) return { power: [1, 1], boost: 1, spot: 0 };
    const sy = Math.max(0, 1 - Ease.inExpo(clamp(u / 0.4)));
    const sx = u < 0.4 ? 1 : Math.max(0, 1 - Ease.inC(clamp((u - 0.4) / 0.35)));
    const boost = 1 + 1.1 * clamp(u / 0.4);
    const spot = 1.5 * clamp((u - 0.25) / 0.15) * (1 - clamp((u - 0.75) / 0.25));
    return { power: [sx, sy], boost, spot };
  }
  OCJ.present = present;
  OCJ.powerOn = powerOn;
  OCJ.powerOff = powerOff;
  OCJ.CRT = PAR;
})();
