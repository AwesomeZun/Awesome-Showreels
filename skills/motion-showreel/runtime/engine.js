'use strict';
// motion-showreel engine: shared Canvas2D helpers for scenes.
// Every drawing is a pure function of time: the same t gives the same frame (frame-exact render, scrubbing, time maps).
// Scenes are classic scripts, so everything here is a global by design. Size, palette and fonts come from
// window.MANIFEST (reel.config.json + style.json), which the page sets before this file loads.

// ───────── project bootstrap ─────────
const MANIFEST0 = (typeof window !== 'undefined' && window.MANIFEST) || {};
const CONFIG = MANIFEST0.config || {};
const W = (CONFIG.size && +CONFIG.size[0]) || 1920, H = (CONFIG.size && +CONFIG.size[1]) || 1080;
const FPS = +CONFIG.fps || 60;
const UNIT = Math.min(W, H) / 1080;  // style sizes are px at 1080p: multiply by UNIT for other frame sizes
let DUR = 30;                 // active cut duration in scene seconds (the compositor sets it; prefer env.dur)
const TAU = Math.PI * 2;
const IMG = {};               // name -> HTMLImageElement: assets/<name>.webp and '<dir>/<file>' aliases for captures
let META = {};                // name -> {w, h, eyes?} (meta.json; natural size filled in for every other image)
const ASSETS = {};            // path under assets/ -> Image | parsed JSON | text (.cast, .txt, .csv)
if (typeof window !== 'undefined') window.REEL_MODULES = window.REEL_MODULES || [];

// ───────── math ─────────
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const rm = (t, a, b) => clamp((t - a) / (b - a));
const Ease = {
  lin: t => t,
  inQ: t => t * t,
  outQ: t => 1 - (1 - t) * (1 - t),
  ioQ: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inC: t => t * t * t,
  outC: t => 1 - Math.pow(1 - t, 3),
  ioC: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuint: t => 1 - Math.pow(1 - t, 5),
  ioQuint: t => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2),
  inExpo: t => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outExpo: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  ioExpo: t => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
  outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  inBack: (t, s = 1.70158) => (s + 1) * t * t * t - s * t * t,
  // additions
  outSine: t => Math.sin((t * Math.PI) / 2),
  ioSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  outElastic: t => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1),
};
// Damped spring step response (0 -> 1, overshoots, settles). f: Hz, z: damping ratio.
function spring(t, f = 2.4, z = 0.42) {
  if (t <= 0) return 0;
  const w = TAU * f, wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t));
}
// Damped oscillation (wobble after a landing).
const wob = (t, f = 3, d = 5) => (t <= 0 ? 0 : Math.sin(TAU * f * t) * Math.exp(-d * t));
function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
const hsh2 = (a, b) => hash(a * 57.31 + b * 13.17);

// ───────── colour ─────────
const _colCache = new Map();
let _colCtx = null;
// Any CSS colour (#rgb, #rrggbb, #rrggbbaa, rgb(), rgba(), names, hsl(), legacy 'r,g,b') -> [r, g, b, a] (0-255, a 0-1).
function parseColor(c) {
  if (Array.isArray(c)) return [c[0], c[1], c[2], c[3] ?? 1];
  if (typeof c !== 'string') return [0, 0, 0, 1];
  const key = c.trim();
  let v = _colCache.get(key);
  if (v) return v;
  let m;
  if ((m = /^#([0-9a-f]{3,8})$/i.exec(key))) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map(x => x + x).join('');
    const n = parseInt(h.slice(0, 6), 16);
    v = [(n >> 16) & 255, (n >> 8) & 255, n & 255, h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1];
  } else if ((m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+)(%?))?\s*\)$/i.exec(key))) {
    v = [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : m[5] ? +m[4] / 100 : +m[4]];
  } else if ((m = /^(\d+)\s*,\s*(\d+)\s*,\s*(\d+)$/.exec(key))) {
    v = [+m[1], +m[2], +m[3], 1];
  } else if (typeof document !== 'undefined') {
    if (!_colCtx) _colCtx = document.createElement('canvas').getContext('2d');
    _colCtx.fillStyle = '#000';
    _colCtx.fillStyle = key;
    const n = _colCtx.fillStyle;
    v = n === key ? [0, 0, 0, 1] : parseColor(n);
  } else v = [0, 0, 0, 1];
  _colCache.set(key, v);
  return v;
}
const _hex2 = n => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0');
function toHex(c) { const [r, g, b] = parseColor(c); return '#' + _hex2(r) + _hex2(g) + _hex2(b); }
// 'r,g,b' string for the legacy `rgba(${color},${a})` pattern.
function rgbTriplet(c) { const [r, g, b] = parseColor(c); return `${Math.round(r)},${Math.round(g)},${Math.round(b)}`; }
// Colour with a new alpha. Accepts any CSS colour (the reference only took #rrggbb).
const rgba = (hex, a) => {
  const [r, g, b, a0] = parseColor(hex);
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a === undefined ? a0 : a})`;
};
// sRGB mix of two colours -> #rrggbb.
function mix(a, b, t) {
  const A = parseColor(a), B = parseColor(b);
  return '#' + _hex2(lerp(A[0], B[0], t)) + _hex2(lerp(A[1], B[1], t)) + _hex2(lerp(A[2], B[2], t));
}
// WCAG relative luminance (0..1) and contrast ratio.
function luma(c) {
  const ch = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const [r, g, b] = parseColor(c);
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}
function contrast(a, b) { const x = luma(a), y = luma(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
// Readable text colour on a background: whichever of `light`/`dark` contrasts more.
function onColor(bg, light = '#FFFFFF', dark = null) {
  dark = dark || (typeof C !== 'undefined' ? C.ink : '#111111');
  if (luma(dark) > luma(light)) [light, dark] = [dark, light];
  return contrast(bg, light) >= contrast(bg, dark) ? light : dark;
}

// ───────── style (style.json merged over defaults) ─────────
function deepMerge(a, b) {
  if (b === undefined || b === null) return a;
  if (Array.isArray(b) || typeof b !== 'object' || typeof a !== 'object' || a === null || Array.isArray(a)) return b;
  const o = { ...a };
  for (const k of Object.keys(b)) o[k] = deepMerge(a[k], b[k]);
  return o;
}
function defaultStyle(theme) {
  const dark = theme === 'dark';
  return {
    source: [], mood: [], rationale: {},
    palette: dark
      ? { bg: '#0B0F17', bg2: '#121A28', surface: '#18213A', ink: '#EEF2F8', ink2: '#B7C1D3', muted: '#7A869A',
          accent: '#4CC9F0', accent2: '#F72585', accent3: '#FFD166', ok: '#06D6A0', warn: '#FFB703', deny: '#EF476F' }
      : { bg: '#F7F6F3', bg2: '#ECEAE4', surface: '#FFFFFF', ink: '#15161A', ink2: '#3F424A', muted: '#6E717B',
          accent: '#3D5AFE', accent2: '#00A6A6', accent3: '#FF7A45', ok: '#1F9D55', warn: '#E3A008', deny: '#E5484D' },
    fonts: {
      display: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      sans: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      serif: '"New York", Georgia, "Times New Roman", serif',
      mono: '"SF Mono", "JetBrains Mono", Menlo, Consolas, "Liberation Mono", monospace',
      cjk: '"Apple SD Gothic Neo", "Noto Sans KR", "Noto Sans CJK KR", "Hiragino Sans", "PingFang SC", "Malgun Gothic", sans-serif',
      files: [],
    },
    type: { scale: [14, 18, 24, 32, 44, 60, 80, 108, 144], displayWeight: 800, bodyWeight: 500, tracking: 0 },
    layout: {
      theme: dark ? 'dark' : 'light', margin: 120, grid: 12, hud: false,
      captions: { enabled: false, font: 'sans', size: 40, fg: '#FFFFFF', bg: 'rgba(0,0,0,0.58)', y: 0.88 },
    },
    motion: {
      pace: 'medium', spring: { f: 2.4, z: 0.42 }, overshoot: 1.70158, ease: 'outC', transitions: ['cut'],
      characters: false, dataViz: false, visualSources: ['vector'],
    },
    post: { grain: 0.04, vignette: { a: dark ? 0.42 : 0.16, color: null }, bloom: dark ? 0.3 : 0 },
    sound: {}, narration: {},
  };
}
const STYLE = (() => {
  const s = MANIFEST0.style || {};
  let theme = s.layout && s.layout.theme;
  if (!theme && s.palette && s.palette.bg) theme = luma(s.palette.bg) < 0.2 ? 'dark' : 'light';
  return deepMerge(defaultStyle(theme || 'light'), s);
})();
const THEME = STYLE.layout.theme === 'dark' ? 'dark' : 'light';

// ───────── palette ─────────
// Contract roles (bg, bg2, surface, ink, ink2, muted, accent, accent2, accent3, ok, warn, deny) + derived helpers
// + the reference's named keys as aliases, so older scene code keeps working on any palette.
function buildPalette(p, theme) {
  const dark = theme === 'dark';
  const P = { ...p };
  const out = { ...P };
  const white = '#FFFFFF', black = '#000000';
  // derived
  out.shadow = dark ? '#000000' : mix(P.ink, P.accent, 0.3);          // tint for drop shadows
  out.night = dark ? P.bg : mix(P.ink, black, 0.35);                  // darkest stage colour
  out.line = rgba(P.ink, dark ? 0.16 : 0.12);                         // hairlines, grids
  out.accentSoft = mix(P.bg, P.accent, dark ? 0.22 : 0.16);           // tinted fills
  out.accent2Soft = mix(P.bg, P.accent2, dark ? 0.22 : 0.18);
  out.accent3Soft = mix(P.bg, P.accent3, dark ? 0.22 : 0.2);
  out.onAccent = onColor(P.accent, white, P.ink);
  // reference aliases (K-BeautyGate key names)
  out.cream = P.bg; out.cream2 = P.bg2;
  out.blush = mix(P.bg, P.accent, dark ? 0.2 : 0.16); out.blush2 = mix(P.bg, P.accent, dark ? 0.3 : 0.28);
  out.rose = mix(dark ? P.ink : P.bg, P.accent, 0.62); out.rose2 = mix(dark ? P.ink : P.bg, P.accent, 0.8);
  out.berry = P.accent; out.berryD = mix(P.accent, black, 0.28);
  out.mute = P.muted;
  out.lilac = mix(P.bg, P.accent2, dark ? 0.5 : 0.4); out.sky = mix(P.bg, P.accent2, dark ? 0.35 : 0.24);
  out.peach = mix(P.bg, P.accent3, dark ? 0.5 : 0.4); out.mint = mix(P.bg, P.ok, dark ? 0.45 : 0.32);
  out.night2 = dark ? P.bg2 : mix(out.night, P.accent, 0.14); out.plum = mix(out.night, P.accent, 0.32);
  out.nv = P.ok; out.gold = P.accent3;
  return out;
}
const C = buildPalette(STYLE.palette, THEME);
// The opposite-theme palette (style.paletteAlt, written by the tone pass) with the same derived helpers, or null.
// The compositor hands it to scenes flagged "dark": true on a light reel as env.palette (env.paletteMain stays C).
const ALT_THEME = STYLE.paletteAlt && STYLE.paletteAlt.theme ? STYLE.paletteAlt.theme : THEME === 'dark' ? 'light' : 'dark';
const C2 = STYLE.paletteAlt && STYLE.paletteAlt.bg ? buildPalette({ ...STYLE.palette, ...STYLE.paletteAlt }, ALT_THEME) : null;

// ───────── fonts ─────────
const _GENERIC = /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-sans-serif|ui-serif|ui-monospace|ui-rounded|math|emoji|fangsong)$/i;
// Join CSS font stacks: families first (deduped, quoted when needed), generic keywords last.
function joinStack(...stacks) {
  const fams = [], gens = [], seen = new Set();
  for (const s of stacks) {
    for (let f of String(s || '').split(',')) {
      f = f.trim();
      if (!f) continue;
      const bare = f.replace(/^["']|["']$/g, '');
      const key = bare.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      if (_GENERIC.test(bare)) gens.push(bare);
      else fams.push(/^["']/.test(f) || /^-?[A-Za-z][\w-]*$/.test(f) ? f : `"${bare}"`);
    }
  }
  return [...fams, ...gens].join(', ');
}
// Font roles. Every stack falls back through the CJK stack so Korean/Japanese/Chinese never renders as tofu.
// Old keys: P (sans), D (display), J (cjk), M (mono); new: S (serif) and the role names.
const FAM = (() => {
  const F = STYLE.fonts;
  const f = {
    display: joinStack(F.display, F.cjk, 'sans-serif'),
    sans: joinStack(F.sans, F.cjk, 'sans-serif'),
    serif: joinStack(F.serif, F.cjk, 'serif'),
    mono: joinStack(F.mono, F.cjk, 'monospace'),
    cjk: joinStack(F.cjk, F.sans, 'sans-serif'),
  };
  return { ...f, P: f.sans, D: f.display, J: f.cjk, M: f.mono, S: f.serif };
})();
// CSS font string. fam: a role key (P D J M S display sans serif mono cjk) or a raw CSS stack.
const font = (size, weight = 400, fam = 'P') => `${weight} ${size}px ${FAM[fam] || fam}`;
const TYPE = STYLE.type;
// Type-scale step i (0 = smallest) from style.type.scale (px at 1080p, scaled by UNIT).
function ts(i) { const s = TYPE.scale || []; if (!s.length) return 32 * UNIT; return s[Math.round(clamp(i, 0, s.length - 1))] * UNIT; }
// Letter spacing in px for a size from style.type.tracking (|v| <= 0.15 is em, larger is px).
function track(size, v = TYPE.tracking) { v = +v || 0; return Math.abs(v) <= 0.15 ? v * size : v; }
// Style motion: spring with style.motion.spring, easing named by style.motion.ease (Ease key).
function styleSpring(t, o = {}) { const s = STYLE.motion.spring || {}; return spring(t, o.f ?? s.f ?? 2.4, o.z ?? s.z ?? 0.42); }
function styleEase(t) { const e = Ease[STYLE.motion.ease] || Ease.outC; return e(clamp(t), STYLE.motion.overshoot); }

// ───────── basic shapes ─────────
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(r, 0), 0, TAU); }
function withAlpha(ctx, a, fn) { if (a <= 0.001) return; ctx.save(); ctx.globalAlpha *= a; fn(); ctx.restore(); }
function radial(ctx, x, y, r0, r1, stops) {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}
function linear(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}
// Soft radial colour blob (any CSS colour; the reference required an rgba() string).
function softBlob(ctx, x, y, r, color, a = 1) {
  withAlpha(ctx, a, () => {
    ctx.fillStyle = radial(ctx, x, y, 0, r, [[0, rgba(color)], [1, rgba(color, 0)]]);
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  });
}
// Card with a soft drop shadow.
function card(ctx, x, y, w, h, r, o = {}) {
  ctx.save();
  if (o.shadow !== false) {
    ctx.shadowColor = o.shadowColor || rgba(C.shadow, THEME === 'dark' ? 0.45 : 0.16);
    ctx.shadowBlur = o.shadowBlur ?? 40;
    ctx.shadowOffsetY = o.shadowY ?? 18;
  }
  rr(ctx, x, y, w, h, r);
  ctx.fillStyle = o.fill || C.surface;
  ctx.fill();
  ctx.restore();
  if (o.stroke) {
    ctx.save(); rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, r);
    ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw || 1.5; ctx.stroke(); ctx.restore();
  }
}

// ───────── type ─────────
function text(ctx, s, x, y, o = {}) {
  ctx.save();
  ctx.font = font(o.size || 32, o.weight || TYPE.bodyWeight || 400, o.fam || 'P');
  ctx.fillStyle = o.color || C.ink;
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = o.base || 'alphabetic';
  ctx.letterSpacing = (o.ls || 0) + 'px';
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowBlur || 24; }
  ctx.fillText(s, x, y);
  ctx.restore();
}
function measure(ctx, s, o = {}) {
  ctx.save();
  ctx.font = font(o.size || 32, o.weight || TYPE.bodyWeight || 400, o.fam || 'P');
  ctx.letterSpacing = (o.ls || 0) + 'px';
  const w = ctx.measureText(s).width;
  ctx.restore();
  return w;
}
// Per-glyph staggered rise with blur-in. lt: seconds since this line starts. Kerning-preserving positions.
function kinetic(ctx, s, x, y, lt, o = {}) {
  const chars = [...s];
  const size = o.size || 48, ls = o.ls || 0;
  ctx.save();
  ctx.font = font(size, o.weight || TYPE.displayWeight || 600, o.fam || 'P');
  ctx.letterSpacing = '0px';
  const total = ctx.measureText(s).width + ls * (chars.length - 1);
  let x0 = x;
  if (o.align === 'center') x0 = x - total / 2;
  else if (o.align === 'right') x0 = x - total;
  const stagger = o.stagger ?? 0.028, dur = o.dur ?? 0.55, rise = o.rise ?? size * 0.6;
  const outT = o.out; // {at, stagger, dur}
  let acc = '';
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const px = x0 + ctx.measureText(acc).width + ls * i;
    acc += ch;
    if (ch === ' ') continue;
    let p = Ease.outC(rm(lt, i * stagger, i * stagger + dur));
    let q = 0;
    if (outT) q = Ease.inC(rm(lt, outT.at + i * (outT.stagger ?? 0.012), outT.at + i * (outT.stagger ?? 0.012) + (outT.dur ?? 0.35)));
    const a = p * (1 - q);
    if (a <= 0.002) continue;
    const blur = (1 - p) * (o.blur ?? 10) + q * 8;
    const dy = (1 - p) * rise - q * rise * 0.6;
    const sc = o.pop ? lerp(0.4, 1, Ease.outBack(rm(lt, i * stagger, i * stagger + dur))) : 1;
    ctx.save();
    ctx.globalAlpha *= a;
    if (blur > 0.4) ctx.filter = `blur(${blur.toFixed(1)}px)`;
    const cw = ctx.measureText(ch).width;
    ctx.translate(px + cw / 2, y + dy);
    ctx.scale(sc, sc);
    ctx.fillStyle = (o.colorFn ? o.colorFn(i, ch) : o.color) || C.ink;
    if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowBlur || 20; }
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(ch, -cw / 2, 0);
    ctx.restore();
  }
  ctx.restore();
  return total;
}
// Line reveal: the line slides up from behind a mask. p: 0..1.
function revealLine(ctx, s, x, y, p, o = {}) {
  if (p <= 0) return;
  const size = o.size || 32;
  const w = measure(ctx, s, o) + 40;
  let x0 = x - 10;
  if (o.align === 'center') x0 = x - w / 2;
  if (o.align === 'right') x0 = x - w + 10;
  ctx.save();
  ctx.beginPath(); ctx.rect(x0, y - size * 1.15, w + 20, size * 1.5); ctx.clip();
  text(ctx, s, x, y + (1 - Ease.outQuint(p)) * size * 1.3, o);
  ctx.restore();
}
const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#$%&*+=<>/\\';
// Scramble decode: characters resolve left to right as p goes 0 -> 1.
function scramble(s, p, seed = 1, t = 0) {
  let out = '';
  const n = s.length;
  for (let i = 0; i < n; i++) {
    const th = (i / n) * 0.75;
    if (p >= th + 0.25 || s[i] === ' ') out += s[i];
    else if (p >= th) out += GLYPHS[Math.floor(hsh2(i + seed, Math.floor(t * 40)) * GLYPHS.length)];
  }
  return out;
}
// Word-wrap into lines that fit maxW. Chinese/Japanese break between characters; Korean and Latin break at spaces
// (CSS keep-all). Explicit '\n' is honoured.
function wrapText(ctx, s, maxW, o = {}) {
  const lines = [];
  for (const para of String(s).split('\n')) {
    const tokens = para.match(/[⺀-鿿豈-﫿＀-￯]|[^\s⺀-鿿豈-﫿＀-￯]+|\s+/g) || [''];
    let line = '';
    for (const tok of tokens) {
      const cand = line + tok;
      if (line && !/^\s+$/.test(tok) && measure(ctx, cand.trimEnd(), o) > maxW) { lines.push(line.trimEnd()); line = tok.trimStart(); }
      else line = cand;
    }
    lines.push(line.trimEnd());
  }
  return lines;
}
// Largest size <= o.size whose text fits maxW on one line (never below o.min, default 0.6 x size).
function fitSize(ctx, s, maxW, o = {}) {
  const size = o.size || 48, min = o.min ?? size * 0.6;
  const w = measure(ctx, s, { ...o, size });
  return w <= maxW ? size : Math.max(min, Math.floor((size * maxW) / w));
}
// Title revealed by a colour bar that sweeps across (and covers again on the way out). p, o.out: 0..1.
function wipeText(ctx, s, x, y, p, o = {}) {
  const size = o.size || 88, q = o.out || 0;
  if (p <= 0 || q >= 1) return 0;
  ctx.save();
  ctx.font = font(size, o.weight || TYPE.displayWeight || 800, o.fam || 'D');
  ctx.letterSpacing = (o.ls || 0) + 'px';
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  const tw = ctx.measureText(s).width;
  const x0 = o.align === 'center' ? x - tw / 2 : o.align === 'right' ? x - tw : x;
  const top = y - size * 0.86, hh = size * 1.08;
  const a = Ease.ioExpo(clamp(p / 0.5)), b = Ease.ioExpo(clamp((p - 0.45) / 0.55));
  const qa = Ease.ioExpo(clamp(q / 0.5)), qb = Ease.ioExpo(clamp((q - 0.4) / 0.6));
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  const visL = x0 + tw * qb, visR = x0 + tw * b;
  if (visR - visL > 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(visL, top - size * 0.3, visR - visL, hh + size * 0.6); ctx.clip();
    ctx.fillStyle = o.color || C.ink; ctx.fillText(s, x0, y); ctx.restore();
  }
  const bl = q > 0 ? x0 + tw * qb : x0 + tw * b, br = q > 0 ? x0 + tw * qa : x0 + tw * a;
  if (br - bl > 0.5) { ctx.fillStyle = o.bar || C.accent; ctx.fillRect(bl, top, br - bl, hh); }
  ctx.restore();
  return tw;
}
// Typing reveal with a blinking caret. lt: seconds since typing starts; o.cps: characters per second.
function typewriter(ctx, s, x, y, lt, o = {}) {
  const chars = [...s], cps = o.cps ?? 28;
  const n = clamp(Math.floor(lt * cps), 0, chars.length);
  if (lt < 0) return 0;
  const shown = chars.slice(0, n).join('');
  text(ctx, shown, x, y, o);
  const w = measure(ctx, shown, o);
  const done = n >= chars.length, blinkOn = !done || Math.floor((lt - chars.length / cps) * 2.2) % 2 === 0;
  if (o.caret !== false && blinkOn && (o.caretAfter === undefined || lt < o.caretAfter)) {
    const size = o.size || 32;
    ctx.save();
    ctx.fillStyle = o.caretColor || o.color || C.accent;
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    const ax = o.align === 'center' ? x + w / 2 : o.align === 'right' ? x : x + w;
    ctx.fillRect(ax + size * 0.08, y - size * 0.78, Math.max(2, size * 0.07), size * 0.95);
    ctx.restore();
  }
  return w;
}
// Count-up string: v from a to b at progress p, with separators and fixed decimals.
function countUp(a, b, p, o = {}) {
  const v = lerp(a, b, clamp(p));
  const d = o.decimals ?? 0;
  const s = Math.abs(v).toLocaleString(o.locale || 'en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  return (v < 0 ? '-' : '') + (o.prefix || '') + s + (o.suffix || '');
}
// Odometer number: each digit rolls when the digit below wraps. value: current number; finalStr fixes the layout.
function rollNumber(ctx, value, finalStr, x, y, o = {}) {
  const size = o.size || 160, ls = o.ls ?? -size * 0.01;
  ctx.save();
  ctx.font = font(size, o.weight || TYPE.displayWeight || 800, o.fam || 'D');
  ctx.letterSpacing = '0px';
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'center';
  let dw = 0;
  for (let d = 0; d < 10; d++) dw = Math.max(dw, ctx.measureText(String(d)).width);
  const chars = [...finalStr], isD = ch => ch >= '0' && ch <= '9';
  const widths = chars.map(ch => (isD(ch) ? dw * 0.94 : ctx.measureText(ch).width * 0.92) + ls);
  const total = widths.reduce((a, b) => a + b, 0);
  let cx = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
  const nDig = chars.filter(isD).length;
  const dot = finalStr.indexOf('.'), decimals = dot >= 0 ? finalStr.length - dot - 1 : 0;
  const v = Math.abs(value) * 10 ** decimals;
  ctx.beginPath(); ctx.rect(cx - size, y - size * 0.92, total + size * 2, size * 1.04); ctx.clip();
  ctx.fillStyle = o.color || C.ink;
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowBlur || 30; }
  let place = nDig - 1;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i], cw = widths[i];
    if (isD(ch)) {
      const pv = 10 ** place;
      let d0, roll;
      if (place === 0) { const dv = v % 10; d0 = Math.floor(dv); roll = dv - d0; }
      else { d0 = Math.floor(v / pv) % 10; const lower = (v % pv) / pv; roll = lower > 0.9 ? Ease.ioQ((lower - 0.9) / 0.1) : 0; }
      const lead = place > decimals && v < pv && !o.pad;
      if (!lead) ctx.fillText(String(d0), cx + cw / 2, y - roll * size);
      if (roll > 0.001) ctx.fillText(String((d0 + 1) % 10), cx + cw / 2, y + (1 - roll) * size);
      place--;
    } else if (o.pad || v >= 10 ** (place + 1) || place < decimals) ctx.fillText(ch, cx + cw / 2, y);
    cx += cw;
  }
  ctx.restore();
  return total;
}

// ───────── characters ─────────
function blinkAt(t, seed) {
  const period = 2.4 + hash(seed) * 1.8;
  const ph = (t + hash(seed + 7) * period) % period;
  return ph < 0.1;
}
// x, y: feet centre. h: on-screen height in px.
function drawChar(ctx, name, x, y, h, o = {}) {
  const m = META[name];
  if (!m) return;
  let img = IMG[name];
  if (o.blink && IMG[name + '_blink']) img = IMG[name + '_blink'];
  if (!img) return;
  const s = h / m.h, w = m.w * s;
  ctx.save();
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale((o.flip ? -1 : 1) * (o.sx ?? 1), o.sy ?? 1);
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.filter) ctx.filter = o.filter;
  const ox = (o.ax ?? 0.5) * w;
  if (o.jelly && Math.abs(o.jelly) > 0.05) {
    const N = 40, ph = o.jellyPhase || 0;
    for (let i = 0; i < N; i++) {
      const v = i / N;
      const k = Math.pow(1 - v, 2.2);
      const dx = o.jelly * k * Math.sin(ph - v * 2.2);
      const sy0 = (m.h * i) / N, sh = m.h / N + 1.5;
      ctx.drawImage(img, 0, sy0, m.w, Math.min(sh, m.h - sy0), -ox + dx, -h + h * v, w, Math.min(sh, m.h - sy0) * s);
    }
  } else {
    ctx.drawImage(img, -ox, -h, w, h);
  }
  ctx.restore();
  return w;
}
function groundShadow(ctx, x, y, w, a = 0.22, color = null) {
  if (a <= 0) return;
  const c = rgbTriplet(color || C.shadow);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, 0.16);
  ctx.fillStyle = radial(ctx, 0, 0, 0, w / 2, [[0, `rgba(${c},${a})`], [0.55, `rgba(${c},${a * 0.45})`], [1, `rgba(${c},0)`]]);
  ctx.fillRect(-w / 2, -w / 2, w, w);
  ctx.restore();
}
// Character that springs in. lt: seconds since its entrance. Squash, jelly, breathing, blink, contact shadow.
function popChar(ctx, name, x, y, h, lt, o = {}) {
  if (lt < 0) return;
  const p = spring(lt, o.f ?? 2.2, o.z ?? 0.45);
  const fromY = o.fromY ?? 0;
  const sc = o.scaleIn ? lerp(0.2, 1, Ease.outBack(clamp(lt / 0.45))) : 1;
  const sq = wob(lt - (o.land ?? 0.18), 3.2, 5.5) * (o.squash ?? 0.09);
  const yy = y + (1 - p) * fromY;
  const idle = o.idle ?? 1;
  const breathe = Math.sin(TAU * (lt * 0.8 + (o.seed || 0))) * 0.012 * idle;
  const hop = o.bounce ? Math.max(0, Math.sin(TAU * (o.bounceT ?? lt) * (o.bounceF ?? 2))) * o.bounce : 0;
  if (o.shadow !== false) groundShadow(ctx, x, y + 4, h * 0.55 * (1 - hop / 200), (o.shadowA ?? 0.25) * clamp(lt / 0.25) * (o.alpha ?? 1), o.shadowColor);
  drawChar(ctx, name, x, yy - hop, h * sc, {
    sx: 1 + sq + breathe * 0.4,
    sy: 1 - sq + breathe,
    rot: o.rot || 0,
    flip: o.flip,
    alpha: (o.alpha ?? 1) * clamp(lt / 0.06),
    blink: o.blink !== false && blinkAt(lt + (o.seed || 0) * 3, o.seed || 1),
    jelly: (o.jelly ?? 14) * Math.exp(-lt * 2.6) * Math.sin(lt * 15) + (o.sway ?? 0) * Math.sin(lt * 3.1 + (o.seed || 0)),
    jellyPhase: lt * 9,
    filter: o.filter,
  });
}

// ───────── decoration ─────────
function sparkle(ctx, x, y, r, a = 1, rot = 0, color = '#fff') {
  if (a <= 0 || r <= 0) return;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = radial(ctx, 0, 0, 0, r * 1.4, [[0, rgba(color, 0.55)], [1, rgba(color, 0)]]);
  ctx.fillRect(-r * 1.4, -r * 1.4, r * 2.8, r * 2.8);
  ctx.beginPath();
  const k = r * 0.16;
  ctx.moveTo(0, -r);
  ctx.quadraticCurveTo(k, -k, r, 0);
  ctx.quadraticCurveTo(k, k, 0, r);
  ctx.quadraticCurveTo(-k, k, -r, 0);
  ctx.quadraticCurveTo(-k, -k, 0, -r);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}
function petalPath(ctx, s) {
  ctx.beginPath();
  ctx.moveTo(0, s);
  ctx.bezierCurveTo(-s * 0.95, s * 0.35, -s * 0.75, -s * 0.75, -s * 0.18, -s * 0.92);
  ctx.lineTo(0, -s * 0.62);
  ctx.lineTo(s * 0.18, -s * 0.92);
  ctx.bezierCurveTo(s * 0.75, -s * 0.75, s * 0.95, s * 0.35, 0, s);
  ctx.closePath();
}
function petal(ctx, x, y, s, rot, flip, a = 1, tint = 0) {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(flip, 1);
  petalPath(ctx, s);
  const top = mix('#FFFFFF', C.accent, tint ? 0.1 : 0.06), bot = mix('#FFFFFF', C.accent, tint ? 0.48 : 0.3);
  ctx.fillStyle = linear(ctx, 0, -s, 0, s, [[0, top], [1, bot]]);
  ctx.fill();
  ctx.restore();
}
// Deterministic drifting petals (any small shape: pass o.draw(ctx, x, y, s, rot, flip, a, i) to replace the petal).
function petals(ctx, t, n, o = {}) {
  const seed = o.seed || 0, a = o.alpha ?? 1;
  for (let i = 0; i < n; i++) {
    const h1 = hash(i * 3.1 + seed), h2 = hash(i * 7.7 + seed), h3 = hash(i * 1.3 + seed + 5);
    const sp = (o.speed ?? 60) * (0.6 + h2 * 0.8);
    const yy = ((h1 * (H + 300) + t * sp) % (H + 300)) - 150;
    const xx = ((h3 * (W + 300) + t * (o.drift ?? -30) * (0.5 + h1)) % (W + 300) + W + 300) % (W + 300) - 150 + Math.sin(t * (1 + h2) + i) * 40;
    const s = (o.size ?? 14) * (0.55 + h2 * 0.9);
    const rot = t * (0.6 + h1) + i, flip = Math.cos(t * (1.5 + h3 * 2) + i), al = a * (0.55 + 0.45 * h3);
    if (o.draw) o.draw(ctx, xx, yy, s, rot, flip, al, i);
    else petal(ctx, xx, yy, s, rot, flip, al, i % 3 === 0);
  }
}
// Living gradient orb ("AI" presence).
function blobPath(ctx, x, y, r, t, amp = 0.07, n = 120) {
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU;
    const k = 1 + amp * (Math.sin(3 * a + t * 2.1) * 0.5 + Math.sin(5 * a - t * 1.7) * 0.3 + Math.sin(2 * a + t * 1.3) * 0.35);
    const px = x + Math.cos(a) * r * k, py = y + Math.sin(a) * r * k;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
}
function orb(ctx, x, y, r, t, a = 1, cols = null) {
  if (a <= 0 || r <= 1) return;
  cols = cols || [C.accent, C.accent3, C.accent2, mix(C.accent2, C.ok, 0.5)];
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.fillStyle = radial(ctx, x, y, r * 0.3, r * 2.2, [[0, rgba(cols[0], 0.4)], [0.5, rgba(cols[2], 0.16)], [1, rgba(cols[0], 0)]]);
  ctx.fillRect(x - r * 2.2, y - r * 2.2, r * 4.4, r * 4.4);
  blobPath(ctx, x, y, r, t);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = mix('#FFFFFF', cols[0], 0.25);
  ctx.fillRect(x - r * 1.5, y - r * 1.5, r * 3, r * 3);
  const al = [0.95, 0.9, 0.9, 0.8];
  for (let i = 0; i < 4; i++) {
    const ang = t * (0.9 + i * 0.35) + i * 1.7;
    const cx = x + Math.cos(ang) * r * 0.55, cy = y + Math.sin(ang * 1.2) * r * 0.55;
    ctx.fillStyle = radial(ctx, cx, cy, 0, r * 1.1, [[0, rgba(cols[i % cols.length], al[i])], [1, rgba(cols[i % cols.length], 0)]]);
    ctx.fillRect(x - r * 1.5, y - r * 1.5, r * 3, r * 3);
  }
  ctx.fillStyle = radial(ctx, x - r * 0.35, y - r * 0.45, 0, r * 0.7, [[0, 'rgba(255,255,255,0.85)'], [1, 'rgba(255,255,255,0)']]);
  ctx.fillRect(x - r * 1.5, y - r * 1.5, r * 3, r * 3);
  ctx.restore();
  ctx.restore();
}
// Small vector icons: clock pin won drop ban check x search lock globe shield spark
// + additions: play arrow plus minus star bolt heart doc code chart user cloud gear terminal
function icon(ctx, kind, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color; ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.6, s * 0.12); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const r = s / 2;
  if (kind === 'clock') {
    circle(ctx, 0, 0, r * 0.9); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r * 0.55); ctx.moveTo(0, 0); ctx.lineTo(r * 0.4, r * 0.2); ctx.stroke();
  } else if (kind === 'pin') {
    ctx.beginPath(); ctx.arc(0, -r * 0.2, r * 0.62, Math.PI * 0.85, Math.PI * 2.15); ctx.lineTo(0, r * 0.95); ctx.closePath(); ctx.stroke();
    circle(ctx, 0, -r * 0.2, r * 0.2); ctx.fill();
  } else if (kind === 'won') {
    circle(ctx, 0, 0, r * 0.9); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r * 0.45, -r * 0.4); ctx.lineTo(-r * 0.2, r * 0.4); ctx.lineTo(0, -r * 0.1); ctx.lineTo(r * 0.2, r * 0.4); ctx.lineTo(r * 0.45, -r * 0.4);
    ctx.moveTo(-r * 0.55, -r * 0.02); ctx.lineTo(r * 0.55, -r * 0.02); ctx.stroke();
  } else if (kind === 'drop') {
    ctx.beginPath(); ctx.moveTo(0, -r * 0.9); ctx.bezierCurveTo(r * 0.2, -r * 0.5, r * 0.75, 0, r * 0.75, r * 0.3);
    ctx.arc(0, r * 0.3, r * 0.75, 0, Math.PI); ctx.bezierCurveTo(-r * 0.75, 0, -r * 0.2, -r * 0.5, 0, -r * 0.9); ctx.stroke();
  } else if (kind === 'ban') {
    circle(ctx, 0, 0, r * 0.85); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r * 0.6, r * 0.6); ctx.lineTo(r * 0.6, -r * 0.6); ctx.stroke();
  } else if (kind === 'check') {
    ctx.beginPath(); ctx.moveTo(-r * 0.6, 0); ctx.lineTo(-r * 0.15, r * 0.45); ctx.lineTo(r * 0.65, -r * 0.5); ctx.stroke();
  } else if (kind === 'x') {
    ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.5); ctx.lineTo(r * 0.5, r * 0.5); ctx.moveTo(r * 0.5, -r * 0.5); ctx.lineTo(-r * 0.5, r * 0.5); ctx.stroke();
  } else if (kind === 'search') {
    circle(ctx, -r * 0.15, -r * 0.15, r * 0.55); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r * 0.25, r * 0.25); ctx.lineTo(r * 0.8, r * 0.8); ctx.stroke();
  } else if (kind === 'lock') {
    rr(ctx, -r * 0.65, -r * 0.1, r * 1.3, r * 0.95, r * 0.18); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -r * 0.1, r * 0.42, Math.PI, 0); ctx.stroke();
  } else if (kind === 'globe') {
    circle(ctx, 0, 0, r * 0.85); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.38, r * 0.85, 0, 0, TAU); ctx.moveTo(-r * 0.85, 0); ctx.lineTo(r * 0.85, 0); ctx.stroke();
  } else if (kind === 'shield') {
    ctx.beginPath(); ctx.moveTo(0, -r * 0.9); ctx.lineTo(r * 0.75, -r * 0.55); ctx.lineTo(r * 0.65, r * 0.25); ctx.quadraticCurveTo(r * 0.4, r * 0.7, 0, r * 0.95);
    ctx.quadraticCurveTo(-r * 0.4, r * 0.7, -r * 0.65, r * 0.25); ctx.lineTo(-r * 0.75, -r * 0.55); ctx.closePath(); ctx.stroke();
  } else if (kind === 'spark') {
    ctx.restore(); sparkle(ctx, x, y, r * 0.9, 1, 0, color); return;
  } else if (kind === 'play') {
    ctx.beginPath(); ctx.moveTo(-r * 0.4, -r * 0.6); ctx.lineTo(r * 0.65, 0); ctx.lineTo(-r * 0.4, r * 0.6); ctx.closePath(); ctx.fill();
  } else if (kind === 'arrow') {
    ctx.beginPath(); ctx.moveTo(-r * 0.7, 0); ctx.lineTo(r * 0.7, 0); ctx.moveTo(r * 0.25, -r * 0.45); ctx.lineTo(r * 0.7, 0); ctx.lineTo(r * 0.25, r * 0.45); ctx.stroke();
  } else if (kind === 'plus' || kind === 'minus') {
    ctx.beginPath(); ctx.moveTo(-r * 0.6, 0); ctx.lineTo(r * 0.6, 0);
    if (kind === 'plus') { ctx.moveTo(0, -r * 0.6); ctx.lineTo(0, r * 0.6); }
    ctx.stroke();
  } else if (kind === 'star') {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr0 = i % 2 ? r * 0.4 : r * 0.92; ctx.lineTo(Math.cos(a) * rr0, Math.sin(a) * rr0); }
    ctx.closePath(); ctx.fill();
  } else if (kind === 'bolt') {
    ctx.beginPath(); ctx.moveTo(r * 0.15, -r * 0.95); ctx.lineTo(-r * 0.55, r * 0.12); ctx.lineTo(-r * 0.02, r * 0.12); ctx.lineTo(-r * 0.15, r * 0.95); ctx.lineTo(r * 0.55, -r * 0.15); ctx.lineTo(r * 0.02, -r * 0.15); ctx.closePath(); ctx.fill();
  } else if (kind === 'heart') {
    ctx.beginPath(); ctx.moveTo(0, r * 0.8); ctx.bezierCurveTo(-r * 1.1, 0, -r * 0.6, -r * 0.95, 0, -r * 0.4); ctx.bezierCurveTo(r * 0.6, -r * 0.95, r * 1.1, 0, 0, r * 0.8); ctx.fill();
  } else if (kind === 'doc') {
    ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.9); ctx.lineTo(r * 0.25, -r * 0.9); ctx.lineTo(r * 0.6, -r * 0.55); ctx.lineTo(r * 0.6, r * 0.9); ctx.lineTo(-r * 0.6, r * 0.9); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 0.1); ctx.lineTo(r * 0.3, -r * 0.1); ctx.moveTo(-r * 0.3, r * 0.25); ctx.lineTo(r * 0.3, r * 0.25); ctx.stroke();
  } else if (kind === 'code') {
    ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 0.55); ctx.lineTo(-r * 0.85, 0); ctx.lineTo(-r * 0.3, r * 0.55); ctx.moveTo(r * 0.3, -r * 0.55); ctx.lineTo(r * 0.85, 0); ctx.lineTo(r * 0.3, r * 0.55);
    ctx.moveTo(r * 0.12, -r * 0.75); ctx.lineTo(-r * 0.12, r * 0.75); ctx.stroke();
  } else if (kind === 'terminal') {
    rr(ctx, -r * 0.9, -r * 0.75, r * 1.8, r * 1.5, r * 0.2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.25); ctx.lineTo(-r * 0.15, 0); ctx.lineTo(-r * 0.5, r * 0.25); ctx.moveTo(0, r * 0.3); ctx.lineTo(r * 0.45, r * 0.3); ctx.stroke();
  } else if (kind === 'chart') {
    ctx.beginPath(); ctx.moveTo(-r * 0.85, r * 0.85); ctx.lineTo(r * 0.85, r * 0.85); ctx.stroke();
    for (const [i, hh] of [[-0.55, 0.6], [0, 1.2], [0.55, 0.9]]) { rr(ctx, r * i - r * 0.17, r * 0.7 - r * hh, r * 0.34, r * hh, r * 0.06); ctx.fill(); }
  } else if (kind === 'user') {
    circle(ctx, 0, -r * 0.35, r * 0.38); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, r * 0.95, r * 0.75, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
  } else if (kind === 'cloud') {
    ctx.beginPath(); ctx.arc(-r * 0.35, r * 0.1, r * 0.4, Math.PI * 0.5, Math.PI * 1.5); ctx.arc(r * 0.05, -r * 0.2, r * 0.5, Math.PI, Math.PI * 1.95);
    ctx.arc(r * 0.45, r * 0.15, r * 0.35, Math.PI * 1.5, Math.PI * 0.5); ctx.closePath(); ctx.stroke();
  } else if (kind === 'gear') {
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55); ctx.lineTo(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9); ctx.stroke(); }
    circle(ctx, 0, 0, r * 0.55); ctx.stroke(); circle(ctx, 0, 0, r * 0.18); ctx.fill();
  }
  ctx.restore();
}
// Pill chip with optional icon. Returns its width.
function chip(ctx, x, y, label, o = {}) {
  const size = o.size || 24, padX = o.padX ?? size * 0.75, hh = o.h || size * 1.9;
  const ic = o.icon ? size * 1.15 : 0;
  const tw = measure(ctx, label, { size, weight: o.weight || 600, fam: o.fam || 'P', ls: o.ls || 0 });
  const w = tw + padX * 2 + (ic ? ic + size * 0.45 : 0);
  let x0 = x;
  if (o.align === 'center') x0 = x - w / 2;
  if (o.align === 'right') x0 = x - w;
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.shadow !== false) { ctx.shadowColor = o.shadowColor || rgba(C.shadow, THEME === 'dark' ? 0.4 : 0.14); ctx.shadowBlur = o.shadowBlur ?? 22; ctx.shadowOffsetY = 8; }
  rr(ctx, x0, y - hh / 2, w, hh, hh / 2);
  ctx.fillStyle = o.bg || C.surface;
  ctx.fill();
  ctx.restore();
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.stroke) { rr(ctx, x0 + 0.75, y - hh / 2 + 0.75, w - 1.5, hh - 1.5, hh / 2); ctx.strokeStyle = o.stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
  let tx = x0 + padX;
  if (ic) { icon(ctx, o.icon, tx + ic / 2, y, ic, o.iconColor || o.fg || C.berry); tx += ic + size * 0.45; }
  text(ctx, label, tx, y + size * 0.36, { size, weight: o.weight || 600, color: o.fg || C.ink, fam: o.fam || 'P', ls: o.ls || 0 });
  ctx.restore();
  return w;
}
// Corner brackets (HUD frames, focus reticles).
function brackets(ctx, x, y, w, h, len = 18, color = null, lw = 1.5, alpha = 1) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha; ctx.strokeStyle = color || C.ink2; ctx.lineWidth = lw; ctx.lineCap = 'square';
  ctx.beginPath();
  ctx.moveTo(x, y + len); ctx.lineTo(x, y); ctx.lineTo(x + len, y);
  ctx.moveTo(x + w - len, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + len);
  ctx.moveTo(x + w, y + h - len); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - len, y + h);
  ctx.moveTo(x + len, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - len);
  ctx.stroke();
  ctx.restore();
}
// Callout: ring on an anchor, elbow leader, label + sub (scramble-decoded). p: 0..1 build progress.
function callout(ctx, ax, ay, p, o = {}) {
  if (p <= 0) return;
  const dx = o.dx ?? 1, dy = o.dy ?? -1, len = o.len ?? 150, color = o.color || C.accent;
  const e1 = Ease.outC(rm(p, 0, 0.35)), e2 = Ease.outC(rm(p, 0.25, 0.65)), e3 = rm(p, 0.45, 1);
  const x1 = ax + dx * 56, y1 = ay + dy * 56, x2 = x1 + dx * len;
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.strokeStyle = color; ctx.lineWidth = o.lw || 1.5;
  circle(ctx, ax, ay, 5 + 6 * (1 - e1)); ctx.stroke();
  ctx.fillStyle = color; circle(ctx, ax, ay, 2.2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(ax + dx * 4, ay + dy * 4); ctx.lineTo(lerp(ax, x1, e1), lerp(ay, y1, e1));
  if (e2 > 0) ctx.lineTo(lerp(x1, x2, e2), y1);
  ctx.stroke();
  if (e3 > 0) {
    const tx = dx > 0 ? x1 + 6 : x2 + 6;
    if (o.label) text(ctx, scramble(o.label, e3, o.seed || 1, o.t || 0), tx, y1 - 12, { size: o.size || 22, weight: 700, color: o.labelColor || C.ink, fam: o.fam || 'P' });
    if (o.sub) text(ctx, scramble(o.sub, e3, (o.seed || 1) + 5, o.t || 0), tx, y1 + 22, { size: (o.size || 22) * 0.68, weight: 500, color, fam: 'M', ls: 1 });
  }
  ctx.restore();
}
// Point on a quadratic Bezier.
function qbez(p0, p1, p2, t) {
  const u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
}
// Resample a polyline to n points spaced evenly by length (the last input point is not repeated).
function resample(pts, n) {
  const d = [0];
  for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = d[d.length - 1], out = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const s = (i / n) * L;
    while (j < d.length - 2 && d[j + 1] < s) j++;
    const k = (s - d[j]) / (d[j + 1] - d[j] || 1);
    out.push([lerp(pts[j][0], pts[j + 1][0], k), lerp(pts[j][1], pts[j + 1][1], k)]);
  }
  return out;
}
function pathLen(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
function pointAt(pts, u) {
  const L = pathLen(pts) * clamp(u);
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (acc + seg >= L) {
      const k = (L - acc) / (seg || 1);
      return { x: lerp(pts[i - 1][0], pts[i][0], k), y: lerp(pts[i - 1][1], pts[i][1], k), a: Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]) };
    }
    acc += seg;
  }
  const n = pts.length - 1;
  return { x: pts[n][0], y: pts[n][1], a: 0 };
}
// Stroke-draw a polyline up to fraction u of its length (builds the path; call ctx.stroke() after).
function polyStroke(ctx, pts, u = 1) {
  const L = pathLen(pts) * clamp(u);
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (acc + seg >= L) {
      const k = (L - acc) / (seg || 1);
      ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k));
      break;
    }
    ctx.lineTo(pts[i][0], pts[i][1]);
    acc += seg;
  }
}
// Outline-morph helpers: point lists with the same count and start, lerped point by point.
function morphPoints(a, b, k) { const n = Math.min(a.length, b.length), out = new Array(n); for (let i = 0; i < n; i++) out[i] = [lerp(a[i][0], b[i][0], k), lerp(a[i][1], b[i][1], k)]; return out; }
function pathFrom(ctx, pts, close = true) { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); if (close) ctx.closePath(); }
// Rounded-rect outline starting at the bottom centre, clockwise on screen (left side first), like phonePoints().
function roundRectPoints(rect, n = 260) {
  const { x, y, w, h } = rect, r = Math.min(rect.r ?? 0, w / 2, h / 2);
  const cx = x + w / 2, x0 = x, x1 = x + w, y0 = y, y1 = y + h;
  const pts = [[cx, y1], [x0 + r, y1]];
  const arc = (ox, oy, a0) => { for (let i = 1; i <= 16; i++) { const a = a0 + (i / 16) * (Math.PI / 2); pts.push([ox + Math.cos(a) * r, oy + Math.sin(a) * r]); } };
  arc(x0 + r, y1 - r, Math.PI / 2);
  pts.push([x0, y0 + r]);
  arc(x0 + r, y0 + r, Math.PI);
  pts.push([x1 - r, y0]);
  arc(x1 - r, y0 + r, Math.PI * 1.5);
  pts.push([x1, y1 - r]);
  arc(x1 - r, y1 - r, 0);
  pts.push([cx, y1]);
  return resample(pts, n);
}
// Circle outline starting at the bottom, same direction as roundRectPoints().
function circlePoints(cx, cy, r, n = 260) {
  const out = [];
  for (let i = 0; i < n; i++) { const a = Math.PI / 2 + (i / n) * TAU; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return out;
}

// ───────── motion helpers ─────────
// Deterministic camera shake offset [dx, dy] in px (amp px, freq Hz).
function shake(t, amp = 6, seed = 1, freq = 30) {
  const f = Math.floor(t * freq), k = t * freq - f;
  const sm = q => q * q * (3 - 2 * q);
  const n = (s, i) => hsh2(s, i) - 0.5;
  return [lerp(n(seed, f), n(seed, f + 1), sm(k)) * 2 * amp, lerp(n(seed + 9, f), n(seed + 9, f + 1), sm(k)) * 2 * amp];
}
// Staggered local time for item i: lt - i * step (feed into kinetic/popChar/spring).
const stagger = (lt, i, step = 0.08) => lt - i * step;

// ───────── elastic timing (scenes look right at any duration) ─────────
// Phases of a scene: in (0..1 over inSec), hold (s since in-phase ended, 0..holdDur), out (0..1 over outSec).
// Override the phase lengths with o.inBeats / o.outBeats / o.inSec / o.outSec. Animations run at 1x in every cut.
function phaseOf(env, o = {}) {
  const lt = env.lt, dur = env.dur, beat = env.beatSec || 0.5;
  const inSec = o.inBeats != null ? o.inBeats * beat : o.inSec ?? env.inSec ?? 0;
  const outSec = o.outBeats != null ? o.outBeats * beat : o.outSec ?? env.outSec ?? 0;
  const holdEnd = Math.max(inSec, dur - outSec), holdDur = holdEnd - inSec;
  const hold = clamp(lt - inSec, 0, holdDur);
  return {
    in: inSec > 0 ? clamp(lt / inSec) : lt >= 0 ? 1 : 0,
    hold, holdDur, holdP: holdDur > 0 ? hold / holdDur : 1,
    out: outSec > 0 ? clamp((lt - (dur - outSec)) / outSec) : lt >= dur ? 1 : 0,
    inSec, outSec, holdStart: inSec, holdEnd: dur - outSec, lt, dur,
  };
}
// Secondary beats on bar lines during the hold: calls fn(i, dt, tBar, bar) for every `every`-th bar line that has
// passed, from the first bar line at/after the hold start (o.from: seconds or 'start') until the out-phase
// (o.until seconds). dt = seconds since that bar line. Returns how many have fired.
function onBars(env, every = 1, fn = null, o = {}) {
  return _onGrid(env, env.barSec, every, fn, o);
}
// Same on the beat grid.
function onBeats(env, every = 1, fn = null, o = {}) {
  return _onGrid(env, env.beatSec, every, fn, o);
}
function _onGrid(env, step, every, fn, o) {
  const from = o.from === 'start' ? 0 : o.from ?? env.inSec ?? 0;
  const until = o.until ?? env.dur - (env.outSec || 0);
  const off = (o.offsetBeats || 0) * env.beatSec;
  let n = 0;
  for (let b = Math.ceil((from - 1e-6) / step); b * step < until - 1e-6; b += Math.max(1, every)) {
    const tb = b * step + off;
    if (tb > env.lt) break;
    if (fn) fn(n, env.lt - tb, tb, b);
    n++;
  }
  return n;
}
// 1 on each beat, decaying exponentially (k per second). every: beats between pulses.
function beatPulse(env, k = 8, every = 1) {
  const per = env.beatSec * every, lt = env.lt;
  if (lt < 0) return 0;
  return Math.exp(-k * (((lt % per) + per) % per));
}

// ───────── data viz (animated, palette-driven) ─────────
// Bars growing from a baseline. data: numbers or {v, label, color}. rect {x,y,w,h}. p: 0..1 (staggered).
function barChart(ctx, data, rect, p, o = {}) {
  const items = data.map(d => (typeof d === 'number' ? { v: d } : d));
  const max = o.max ?? Math.max(...items.map(d => d.v), 1e-9);
  const n = items.length, gap = o.gap ?? 0.28, bw = rect.w / (n + (n - 1) * gap) || rect.w;
  const st = o.stagger ?? 0.08, span = 1 + st * (n - 1);
  items.forEach((d, i) => {
    const q = Ease.outC(clamp(p * span - i * st));
    const h = (rect.h * d.v * q) / max, x = rect.x + i * bw * (1 + gap);
    if (q <= 0) return;
    ctx.save();
    ctx.fillStyle = d.color || (o.highlight === i ? C.accent : o.color || rgba(C.ink, 0.22));
    rr(ctx, x, rect.y + rect.h - h, bw, h, Math.min(o.radius ?? 6, bw / 2, h / 2)); ctx.fill();
    ctx.restore();
    if (d.label) text(ctx, d.label, x + bw / 2, rect.y + rect.h + (o.labelGap ?? 30), { size: o.labelSize || 18, align: 'center', color: C.muted, alpha: q });
    if (o.values) text(ctx, o.format ? o.format(d.v * q) : String(Math.round(d.v * q)), x + bw / 2, rect.y + rect.h - h - 12, { size: o.valueSize || 20, weight: 700, align: 'center', color: C.ink, alpha: q, fam: 'M' });
  });
}
// Line chart drawn on with progress p; glowing head dot. pts: values (equal spacing) or [x, y] in data units.
function lineChart(ctx, values, rect, p, o = {}) {
  const pts = values.map((v, i) => (Array.isArray(v) ? v : [i, v]));
  const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
  const x0 = o.xMin ?? Math.min(...xs), x1 = o.xMax ?? Math.max(...xs), y0 = o.yMin ?? Math.min(...ys), y1 = o.yMax ?? Math.max(...ys);
  const sp = pts.map(([x, y]) => [rect.x + ((x - x0) / (x1 - x0 || 1)) * rect.w, rect.y + rect.h - ((y - y0) / (y1 - y0 || 1)) * rect.h]);
  const u = clamp(p);
  if (u <= 0) return null;
  ctx.save();
  if (o.fill !== false) {
    const head = pointAt(sp, u), part = [];
    const L = pathLen(sp) * u;
    let acc = 0;
    part.push(sp[0]);
    for (let i = 1; i < sp.length; i++) { const seg = Math.hypot(sp[i][0] - sp[i - 1][0], sp[i][1] - sp[i - 1][1]); if (acc + seg >= L) break; part.push(sp[i]); acc += seg; }
    part.push([head.x, head.y]);
    ctx.beginPath(); part.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
    ctx.lineTo(head.x, rect.y + rect.h); ctx.lineTo(sp[0][0], rect.y + rect.h); ctx.closePath();
    ctx.fillStyle = linear(ctx, 0, rect.y, 0, rect.y + rect.h, [[0, rgba(o.color || C.accent, 0.28)], [1, rgba(o.color || C.accent, 0)]]);
    ctx.fill();
  }
  ctx.strokeStyle = o.color || C.accent; ctx.lineWidth = o.lw || 4; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (o.glow) { ctx.shadowColor = o.color || C.accent; ctx.shadowBlur = 18; }
  polyStroke(ctx, sp, u); ctx.stroke();
  ctx.restore();
  const hd = pointAt(sp, u);
  if (o.dot !== false) { ctx.save(); ctx.fillStyle = o.color || C.accent; circle(ctx, hd.x, hd.y, (o.lw || 4) * 1.8); ctx.fill(); ctx.restore(); }
  return hd;
}
// Donut/progress ring. frac 0..1 (already eased by the caller).
function donut(ctx, x, y, r, frac, o = {}) {
  const lw = o.lw ?? r * 0.18, a0 = -Math.PI / 2;
  ctx.save();
  ctx.lineCap = o.cap || 'round'; ctx.lineWidth = lw;
  ctx.strokeStyle = o.track || rgba(C.ink, 0.1); circle(ctx, x, y, r); ctx.stroke();
  if (frac > 0) {
    ctx.strokeStyle = o.color || C.accent;
    if (o.glow) { ctx.shadowColor = o.color || C.accent; ctx.shadowBlur = 20; }
    ctx.beginPath(); ctx.arc(x, y, r, a0, a0 + TAU * clamp(frac)); ctx.stroke();
  }
  ctx.restore();
}

// ───────── captions (burned in by the compositor; style.layout.captions) ─────────
// list: [{t0, t1, text}] in scene time. o overrides style.layout.captions {font, size, fg, bg, y, maxWidth}.
// y <= 1 is a fraction of H for the caption block centre, otherwise px.
// One caption at a time: a cue fades in over [t0-0.12, t0+0.06] and out over [t1-0.06, t1+0.12], except at a hand-off
// (the next cue starts less than 0.24 s after this one ends, e.g. cues meeting at a scene cut): this cue then fades
// out over [next.t0-0.12, next.t0] and the next fades in over [next.t0, next.t0+0.12], so two lines never share the band.
const CAP_IN = 0.12, CAP_OUT = 0.12, CAP_HANDOFF = CAP_IN + CAP_OUT;
function captionAlpha(t, c, prev, next) {
  const inFrom = prev && c.t0 - prev.t1 < CAP_HANDOFF ? c.t0 : c.t0 - CAP_IN;
  const inTo = prev && c.t0 - prev.t1 < CAP_HANDOFF ? c.t0 + CAP_IN : c.t0 + 0.06;
  const handoff = next && next.t0 - c.t1 < CAP_HANDOFF;
  const outFrom = handoff ? next.t0 - CAP_OUT : c.t1 - 0.06, outTo = handoff ? next.t0 : c.t1 + CAP_OUT;
  if (t < inFrom || t > outTo) return 0;
  return Ease.outC(rm(t, inFrom, inTo)) * (1 - Ease.inC(rm(t, outFrom, outTo)));
}
function drawCaptions(ctx, t, list, o = {}) {
  if (!list || !list.length) return;
  const cs = { ...STYLE.layout.captions, ...o };
  let L = list;
  for (let i = 1; i < L.length; i++) if (L[i].t0 < L[i - 1].t0) { L = list.slice().sort((a, b) => a.t0 - b.t0); break; }
  for (let i = 0; i < L.length; i++) {
    const c = L[i];
    if (t < c.t0 - CAP_IN || t > c.t1 + CAP_HANDOFF) continue;
    const a = captionAlpha(t, c, L[i - 1], L[i + 1]);
    if (a <= 0.003) continue;
    const base = (cs.size || 40) * UNIT;
    let size = base;
    const fam = cs.font || 'sans', weight = cs.weight || 600;
    const maxW = cs.maxWidth ? cs.maxWidth * UNIT : W - 2 * Math.max((STYLE.layout.margin || 120) * UNIT, W * 0.08);
    let lines = wrapText(ctx, c.text, maxW, { size, weight, fam });
    while (lines.length > 2 && size > base * 0.72) { size = Math.floor(size * 0.92); lines = wrapText(ctx, c.text, maxW, { size, weight, fam }); }
    const lh = size * 1.32, padX = size * 0.6, padY = size * 0.32;
    const yc = (cs.y ?? 0.88) <= 1 ? (cs.y ?? 0.88) * H : cs.y * UNIT;
    const top = yc - (lines.length * lh) / 2 + (1 - a) * 8;
    ctx.save();
    ctx.globalAlpha *= a;
    for (let i = 0; i < lines.length; i++) {
      const lw = measure(ctx, lines[i], { size, weight, fam });
      if (cs.bg && cs.bg !== 'none' && cs.bg !== 'transparent') {
        ctx.fillStyle = cs.bg;
        rr(ctx, W / 2 - lw / 2 - padX, top + i * lh - padY * 0.2, lw + padX * 2, lh + padY * 0.4 - 2, size * 0.32); ctx.fill();
      }
      text(ctx, lines[i], W / 2, top + i * lh + lh * 0.72, { size, weight, fam, color: cs.fg || '#FFFFFF', align: 'center', glow: cs.bg && cs.bg !== 'none' ? null : 'rgba(0,0,0,0.65)', glowBlur: 10 });
    }
    ctx.restore();
  }
}

// ───────── post ─────────
let GRAIN = [];
function makeGrain() {
  GRAIN = [];
  for (let k = 0; k < 4; k++) {
    const c = document.createElement('canvas');
    c.width = c.height = 384;
    const g = c.getContext('2d');
    const im = g.createImageData(384, 384);
    for (let i = 0; i < im.data.length; i += 4) {
      const v = Math.floor(hash(i * 0.37 + k * 911.3) * 255);
      im.data[i] = im.data[i + 1] = im.data[i + 2] = v;
      im.data[i + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    GRAIN.push(c);
  }
}
function grain(ctx, t, a = 0.05) {
  if (a <= 0 || !GRAIN.length) return;
  const f = Math.floor(t * FPS);
  const c = GRAIN[f % GRAIN.length];
  ctx.save();
  ctx.globalAlpha = a;
  ctx.globalCompositeOperation = 'overlay';
  const ox = Math.floor(hash(f) * 384), oy = Math.floor(hash(f + 0.5) * 384);
  ctx.fillStyle = ctx.createPattern(c, 'repeat');
  ctx.translate(-ox, -oy);
  ctx.fillRect(0, 0, W + 384, H + 384);
  ctx.restore();
}
// color: 'r,g,b' (legacy) or any CSS colour; default from style.post.vignette.color or the palette shadow.
function vignette(ctx, a = 0.25, color = null) {
  if (a <= 0) return;
  const c = rgbTriplet(color || (STYLE.post.vignette && STYLE.post.vignette.color) || (THEME === 'dark' ? '#000000' : mix(C.shadow, '#000000', 0.45)));
  ctx.save();
  // radii from the short side and the half-diagonal: identical to the reference at 16:9, correct in portrait/square
  ctx.fillStyle = radial(ctx, W / 2, H / 2, Math.min(W, H) * 0.45, Math.hypot(W, H) * 0.6275, [[0, `rgba(${c},0)`], [1, `rgba(${c},${a})`]]);
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
// Offscreen buffer.
function makeBuf(w = W, h = H) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return { c, g: c.getContext('2d') };
}

// ───────── legacy layout constants (case-study shapes, scaled to the frame) ─────────
// Kept for compatibility; pass your own shapes to archPoints(arch, n) / phonePoints(phone, n).
const ARCH = { cx: W * (1330 / 1920), base: H * (1010 / 1080), w: H * (600 / 1080), h: H * (880 / 1080) };
const PHONE = { cx: W * (640 / 1920), cy: H / 2, w: H * (440 / 1080), h: H * (900 / 1080), r: H * (70 / 1080), inset: 14 };
const GATE = { cx: W * (1300 / 1920), ground: H * (800 / 1080), halfW: 200, doorTop: H * (486 / 1080) };
// Arch outline (bottom centre -> left -> over the top -> right -> back to bottom centre).
function archPoints(arch = ARCH, n = 260) {
  if (typeof arch === 'number') { n = arch; arch = ARCH; }
  const { cx, base, w, h } = arch, r = w / 2, cy = base - h + r;
  const pts = [[cx, base], [cx - r, base], [cx - r, cy]];
  for (let i = 1; i < 60; i++) { const a = Math.PI + (i / 60) * Math.PI; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  pts.push([cx + r, cy], [cx + r, base], [cx, base]);
  return resample(pts, n);
}
// Phone outline (same start point and direction as archPoints, so the two morph cleanly).
function phonePoints(phone = PHONE, n = 260) {
  if (typeof phone === 'number') { n = phone; phone = PHONE; }
  const { cx, cy, w, h, r } = phone;
  return roundRectPoints({ x: cx - w / 2, y: cy - h / 2, w, h, r }, n);
}
// Product/object cutout with no shadow, anchored at its bottom centre.
function drawProd(ctx, key, x, y, h, o = {}) {
  const m = META[key]; if (!m || !IMG[key]) return 0;
  const w = (m.w * h) / m.h;
  ctx.save();
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale(o.sx ?? 1, o.sy ?? 1);
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.filter) ctx.filter = o.filter;
  ctx.drawImage(IMG[key], -w / 2, -h, w, h);
  ctx.restore();
  return w;
}
// Floor reflection (flipped under the object, fading downward).
const _refl = {};
function drawReflection(ctx, key, x, y, h, a = 0.22) {
  const m = META[key]; if (!m || a <= 0 || !IMG[key]) return;
  if (!_refl[key]) {
    const b = makeBuf(m.w, m.h);
    b.g.translate(0, m.h); b.g.scale(1, -1); b.g.drawImage(IMG[key], 0, 0);
    b.g.setTransform(1, 0, 0, 1, 0, 0);
    b.g.globalCompositeOperation = 'destination-in';
    b.g.fillStyle = linear(b.g, 0, 0, 0, m.h, [[0, 'rgba(0,0,0,1)'], [0.45, 'rgba(0,0,0,0.25)'], [1, 'rgba(0,0,0,0)']]);
    b.g.fillRect(0, 0, m.w, m.h);
    _refl[key] = b.c;
  }
  const w = (m.w * h) / m.h;
  ctx.save(); ctx.globalAlpha *= a; ctx.drawImage(_refl[key], x - w / 2, y, w, h); ctx.restore();
}
// Draw any image fitted into a rect: o.fit 'cover' | 'contain' | 'fill', o.radius clips to a rounded rect.
function drawImageFit(ctx, img, x, y, w, h, o = {}) {
  if (!img) return;
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const fit = o.fit || 'cover';
  let dw = w, dh = h;
  if (fit !== 'fill') { const s = fit === 'contain' ? Math.min(w / iw, h / ih) : Math.max(w / iw, h / ih); dw = iw * s; dh = ih * s; }
  const ax = o.ax ?? 0.5, ay = o.ay ?? 0.5;
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.radius) { rr(ctx, x, y, w, h, o.radius); ctx.clip(); }
  else if (fit === 'cover') { ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, x + (w - dw) * ax, y + (h - dh) * ay, dw, dh);
  ctx.restore();
}
// ───────── carriers: a web page in a browser window, a paper page ─────────
// Browser window around a web capture (capture_ui.mjs `shot {full: true}` or `scrollShots`): rounded frame, three
// lights, a URL pill, the page clipped inside and scrolled by o.scroll (page CSS px from the top), a thin scrollbar.
// o: {img, url, title, scroll = 0, cssWidth (the capture's CSS width; default the image width / o.dpr), dpr = 2,
// dark (chrome colours), radius = 18, bar = 52, shadow = true, alpha}. Returns {x, y, w, h, k} of the content area
// (k = screen px per page CSS px) so callouts can point at page coordinates: px = x + cssX * k, py = y + (cssY - scroll) * k.
function browserFrame(ctx, x, y, w, h, o = {}) {
  const dark = o.dark ?? THEME === 'dark', bar = o.bar ?? 52, r = o.radius ?? 18, img = o.img;
  const chrome = dark ? '#1C2230' : '#F3F1F4', line = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.shadow !== false) { ctx.shadowColor = rgba(C.shadow, dark ? 0.55 : 0.22); ctx.shadowBlur = 60; ctx.shadowOffsetY = 26; }
  rr(ctx, x, y, w, h, r); ctx.fillStyle = chrome; ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = line; ctx.lineWidth = 1; rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, r); ctx.stroke();
  ['#FF5F57', '#FEBC2E', '#28C840'].forEach((c, i) => { circle(ctx, x + 26 + i * 22, y + bar / 2, 7); ctx.fillStyle = c; ctx.fill(); });
  const pw = Math.min(w * 0.56, 720), px = x + (w - pw) / 2, py = y + bar / 2 - 15;
  rr(ctx, px, py, pw, 30, 15); ctx.fillStyle = dark ? 'rgba(255,255,255,0.07)' : '#FFFFFF'; ctx.fill();
  icon(ctx, 'lock', px + 20, y + bar / 2, 13, dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)');
  if (o.url) text(ctx, o.url, px + pw / 2, y + bar / 2 + 6, { size: 16, weight: 500, fam: 'sans', align: 'center', color: dark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.62)' });
  const cx = x, cy = y + bar, cw = w, ch = h - bar;
  ctx.save();
  ctx.beginPath(); ctx.roundRect(cx, cy, cw, ch, [0, 0, r, r]); ctx.clip();
  ctx.fillStyle = dark ? '#0E121A' : '#FFFFFF'; ctx.fillRect(cx, cy, cw, ch);
  let k = 1;
  if (img) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height, dpr = o.dpr ?? 2;
    const cssW = o.cssWidth ?? iw / dpr, pxPerCss = iw / cssW;
    k = cw / cssW;
    const sc = Math.max(0, Math.min(o.scroll || 0, ih / pxPerCss - ch / k));
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, sc * pxPerCss, iw, Math.min(ih - sc * pxPerCss, (ch / k) * pxPerCss), cx, cy, cw, Math.min(ch, (ih / pxPerCss - sc) * k));
    const total = ih / pxPerCss, view = ch / k;
    if (total > view + 1) {                                         // scrollbar
      const th = Math.max(40, (ch * view) / total), ty = cy + 6 + ((ch - 12 - th) * sc) / Math.max(1, total - view);
      rr(ctx, cx + cw - 10, ty, 5, th, 2.5); ctx.fillStyle = dark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.25)'; ctx.fill();
    }
  }
  ctx.restore();
  ctx.restore();
  return { x: cx, y: cy, w: cw, h: ch, k };
}
// A paper page (a PDF page render from pdf_figures.py --mode pages, or blank paper with o.lines), lying on the stage
// with a soft shadow and an optional curl; o.highlights [{rect: [x0, y0, x1, y1] in image px (pdf_figures.py --find
// gives them), k: 0..1 sweep progress, color}] are drawn as highlighter strokes that sweep left to right. o: {img,
// rot (rad), alpha, curl 0..1, paper colour, lines (blank paper rows)}. Returns map(ix, iy) -> [screen x, y] for
// callouts anchored on the page.
function paperSheet(ctx, x, y, w, h, o = {}) {
  const img = o.img, iw = img ? img.naturalWidth || img.width : w, ih = img ? img.naturalHeight || img.height : h;
  const rot = o.rot || 0, cx = x + w / 2, cy = y + h / 2;
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.translate(cx, cy); ctx.rotate(rot); ctx.translate(-w / 2, -h / 2);
  ctx.shadowColor = rgba('#000000', THEME === 'dark' ? 0.5 : 0.18); ctx.shadowBlur = 40; ctx.shadowOffsetY = 16;
  ctx.fillStyle = o.paper || '#FFFFFF'; ctx.fillRect(0, 0, w, h);
  ctx.shadowColor = 'transparent';
  if (img) { ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img, 0, 0, w, h); }
  else if (o.lines) for (let i = 0; i < o.lines; i++) { ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(w * 0.1, h * 0.12 + i * h * 0.05, w * (i % 5 === 4 ? 0.5 : 0.8), h * 0.012); }
  for (const hl of o.highlights || []) {
    const k = clamp(hl.k ?? 1);
    if (k <= 0) continue;
    const [x0, y0, x1, y1] = hl.rect, sx = w / iw, sy = h / ih;
    ctx.save(); ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = rgba(hl.color || C.accent3, 0.55);
    rr(ctx, x0 * sx - 4, y0 * sy - 2, (x1 - x0) * sx * Ease.ioC(k) + 8, (y1 - y0) * sy + 4, 4); ctx.fill();
    ctx.restore();
  }
  if (o.curl) {                                                     // a lifted corner: shaded triangle at bottom right
    const c = Math.min(w, h) * 0.12 * clamp(o.curl);
    ctx.fillStyle = linear(ctx, w - c, h - c, w, h, [[0, 'rgba(0,0,0,0.12)'], [1, 'rgba(255,255,255,0.9)']]);
    ctx.beginPath(); ctx.moveTo(w - c, h); ctx.lineTo(w, h - c); ctx.lineTo(w - c * 0.85, h - c * 0.85); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  const cs = Math.cos(rot), sn = Math.sin(rot);
  return (ix, iy) => { const px = (ix / iw) * w - w / 2, py = (iy / ih) * h - h / 2; return [cx + px * cs - py * sn, cy + px * sn + py * cs]; };
}
// Asset lookup by path under P/assets (e.g. 'captures/ui/chat.png', 'captures/term/demo.cast').
const _assetWarned = new Set();
function ASSET(path) {
  const v = ASSETS[path];
  if (v === undefined && !_assetWarned.has(path)) { _assetWarned.add(path); console.warn('[engine] missing asset: ' + path); }
  return v;
}
ASSET.list = (prefix = '') => Object.keys(ASSETS).filter(k => k.startsWith(prefix)).sort();
