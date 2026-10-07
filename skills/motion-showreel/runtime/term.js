'use strict';
// term.js (optional module) — real terminal recordings drawn on canvas, synced to the reel timeline.
//
// Input: asciicast v1/v2/v3 (tools/capture_cli.py writes v2 plus an `x_showreel` header block with the command
// segments), raw ANSI text, or a parsed cast. Casts arrive through the runtime's assets (ASSETS['captures/term/
// demo.cast'] -> text) or Term.register(name, text).
// Emulator: xterm-compatible subset — cursor addressing, erase, insert/delete, scroll regions, alt screen,
// SGR (16/256/truecolor, bold, dim, italic, underline, inverse, strike, hidden, overline), wide CJK/emoji,
// combining marks, DEC line drawing, tabs, scrollback, OSC title, DECSCUSR cursor shape.
// Renderer: window chrome + exact cell grid; block elements, box drawing, braille and powerline glyphs are drawn
// as shapes, so progress bars and frames are seamless in any font. Theme: the tool's own (THEMES, e.g.
// catppuccin-mocha) or derived from style.json (hue-anchored ANSI colours with guaranteed contrast).
// Player: re-times the cast onto scene time — typed command (cps + deterministic jitter), idle cap, speed or
// fit-to-window, optional line streaming, elision of long runs behind one "…" line, smooth scroll — and renders any
// t as a pure function (checkpoints give random access). CC-statusline grammar helpers: giant command word, tilted window (quad.js), zoom to the key
// line, line highlight / spotlight, glitch slices, dot grid.
// Exports window.Term. Uses engine.js globals (ASSETS, FAM, STYLE, hash, ...) when present; works without them.
(function (root) {
  const TAU = Math.PI * 2;
  // engine.js globals (top-level const/function of a classic script) when present
  const G = {
    assets: () => (typeof ASSETS !== 'undefined' ? ASSETS : {}),
    fam: () => (typeof FAM !== 'undefined' ? FAM : null),
    style: () => (typeof STYLE !== 'undefined' ? STYLE : null),
    palette: () => (typeof C !== 'undefined' ? C : null),
    parseColor: () => (typeof parseColor === 'function' ? parseColor : null),
  };
  const H32 = typeof hash === 'function' ? hash : n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, k) => a + (b - a) * k;
  const E = {
    outC: t => 1 - Math.pow(1 - t, 3),
    ioC: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  };
  const fam = role => {
    const F = G.fam();
    if (F && F[role]) return F[role];
    return { mono: '"JetBrains Mono", "SF Mono", Menlo, Consolas, "DejaVu Sans Mono", monospace', sans: '-apple-system, "Segoe UI", Roboto, Arial, sans-serif', display: '-apple-system, "Segoe UI", Roboto, Arial, sans-serif' }[role];
  };
  const warned = new Set();
  const warnOnce = (k, m, err) => { if (warned.has(k)) return; warned.add(k); (err ? console.error : console.warn)('[term] ' + m); };

  // ───────── colour (sRGB <-> OKLab/OKLCH, contrast) ─────────
  function rgbOf(c) {
    if (Array.isArray(c)) return c.slice(0, 3);
    const pc = G.parseColor();
    if (typeof pc === 'function' && typeof c === 'string' && !/^#[0-9a-f]{3,8}$/i.test(c)) { const v = pc(c); return [v[0], v[1], v[2]]; }
    let h = String(c || '#000').replace('#', '');
    if (h.length === 3 || h.length === 4) h = h.split('').map(x => x + x).join('');
    const n = parseInt(h.slice(0, 6), 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const hex = ([r, g, b]) => '#' + [r, g, b].map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
  const mixc = (a, b, k) => { const A = rgbOf(a), B = rgbOf(b); return hex([lerp(A[0], B[0], k), lerp(A[1], B[1], k), lerp(A[2], B[2], k)]); };
  const rgbaS = (c, a) => { const [r, g, b] = rgbOf(c); return `rgba(${r},${g},${b},${a})`; };
  const s2l = v => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const l2s = v => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
  function lab(c) {
    const [r, g, b] = rgbOf(c).map(v => s2l(v / 255));
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
  }
  function fromLab(L, a, b) {
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  }
  // OKLCH -> hex, chroma reduced until the colour fits sRGB
  function oklch(L, C, hDeg) {
    const h = (hDeg * Math.PI) / 180;
    for (let c = C; c >= 0; c -= 0.005) {
      const lin = fromLab(L, c * Math.cos(h), c * Math.sin(h));
      if (lin.every(v => v >= -1e-4 && v <= 1 + 1e-4)) return hex(lin.map(v => l2s(clamp(v, 0, 1)) * 255));
    }
    return hex(fromLab(L, 0, 0).map(v => l2s(clamp(v, 0, 1)) * 255));
  }
  const lch = c => { const [L, a, b] = lab(c); return [L, Math.hypot(a, b), ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360]; };
  const lum = c => { const [r, g, b] = rgbOf(c).map(v => s2l(v / 255)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const contrastOf = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  // move OKLCH lightness away from bg until contrast >= min
  function withContrast(c, bg, min) {
    let [L, C, h] = lch(c);
    const up = lum(bg) < 0.25;
    let out = oklch(L, C, h);
    for (let i = 0; i < 60 && contrastOf(out, bg) < min; i++) { L = clamp(L + (up ? 0.01 : -0.01), 0, 1); out = oklch(L, C, h); }
    return out;
  }

  // ───────── themes ─────────
  // ANSI order: black red green yellow blue magenta cyan white, then the bright eight.
  const THEMES = {
    'catppuccin-mocha': { bg: '#1e1e2e', fg: '#cdd6f4', cursor: '#f5e0dc', titleBar: '#181825', ansi: ['#45475a', '#f38ba8', '#a6e3a1', '#f9e2af', '#89b4fa', '#f5c2e7', '#94e2d5', '#bac2de', '#585b70', '#f38ba8', '#a6e3a1', '#f9e2af', '#89b4fa', '#f5c2e7', '#94e2d5', '#a6adc8'] },
    'catppuccin-macchiato': { bg: '#24273a', fg: '#cad3f5', cursor: '#f4dbd6', titleBar: '#1e2030', ansi: ['#494d64', '#ed8796', '#a6da95', '#eed49f', '#8aadf4', '#f5bde6', '#8bd5ca', '#b8c0e0', '#5b6078', '#ed8796', '#a6da95', '#eed49f', '#8aadf4', '#f5bde6', '#8bd5ca', '#a5adcb'] },
    'catppuccin-frappe': { bg: '#303446', fg: '#c6d0f5', cursor: '#f2d5cf', titleBar: '#292c3c', ansi: ['#51576d', '#e78284', '#a6d189', '#e5c890', '#8caaee', '#f4b8e4', '#81c8be', '#b5bfe2', '#626880', '#e78284', '#a6d189', '#e5c890', '#8caaee', '#f4b8e4', '#81c8be', '#a5adce'] },
    'catppuccin-latte': { bg: '#eff1f5', fg: '#4c4f69', cursor: '#dc8a78', titleBar: '#e6e9ef', ansi: ['#5c5f77', '#d20f39', '#40a02b', '#df8e1d', '#1e66f5', '#ea76cb', '#179299', '#acb0be', '#6c6f85', '#d20f39', '#40a02b', '#df8e1d', '#1e66f5', '#ea76cb', '#179299', '#bcc0cc'] },
    dracula: { bg: '#282a36', fg: '#f8f8f2', cursor: '#f8f8f2', titleBar: '#21222c', ansi: ['#21222c', '#ff5555', '#50fa7b', '#f1fa8c', '#bd93f9', '#ff79c6', '#8be9fd', '#f8f8f2', '#6272a4', '#ff6e6e', '#69ff94', '#ffffa5', '#d6acff', '#ff92df', '#a4ffff', '#ffffff'] },
    'tokyo-night': { bg: '#1a1b26', fg: '#c0caf5', cursor: '#c0caf5', titleBar: '#16161e', ansi: ['#15161e', '#f7768e', '#9ece6a', '#e0af68', '#7aa2f7', '#bb9af7', '#7dcfff', '#a9b1d6', '#414868', '#f7768e', '#9ece6a', '#e0af68', '#7aa2f7', '#bb9af7', '#7dcfff', '#c0caf5'] },
    'one-dark': { bg: '#282c34', fg: '#abb2bf', cursor: '#528bff', titleBar: '#21252b', ansi: ['#3f4451', '#e06c75', '#98c379', '#e5c07b', '#61afef', '#c678dd', '#56b6c2', '#d7dae0', '#4f5666', '#e06c75', '#98c379', '#e5c07b', '#61afef', '#c678dd', '#56b6c2', '#ffffff'] },
    'github-dark': { bg: '#0d1117', fg: '#e6edf3', cursor: '#2f81f7', titleBar: '#010409', ansi: ['#484f58', '#ff7b72', '#3fb950', '#d29922', '#58a6ff', '#bc8cff', '#39c5cf', '#b1bac4', '#6e7681', '#ffa198', '#56d364', '#e3b341', '#79c0ff', '#d2a8ff', '#56d4dd', '#ffffff'] },
    'github-light': { bg: '#ffffff', fg: '#1f2328', cursor: '#0969da', titleBar: '#f6f8fa', ansi: ['#24292f', '#cf222e', '#116329', '#4d2d00', '#0969da', '#8250df', '#1b7c83', '#6e7781', '#57606a', '#a40e26', '#1a7f37', '#633c01', '#218bff', '#a475f9', '#3192aa', '#8c959f'] },
    'solarized-dark': { bg: '#002b36', fg: '#93a1a1', cursor: '#93a1a1', titleBar: '#00222b', ansi: ['#073642', '#dc322f', '#859900', '#b58900', '#268bd2', '#d33682', '#2aa198', '#eee8d5', '#586e75', '#cb4b16', '#93a1a1', '#b58900', '#839496', '#6c71c4', '#2aa198', '#fdf6e3'] },
    'solarized-light': { bg: '#fdf6e3', fg: '#586e75', cursor: '#586e75', titleBar: '#eee8d5', ansi: ['#073642', '#dc322f', '#859900', '#b58900', '#268bd2', '#d33682', '#2aa198', '#eee8d5', '#002b36', '#cb4b16', '#586e75', '#657b83', '#839496', '#6c71c4', '#93a1a1', '#fdf6e3'] },
    nord: { bg: '#2e3440', fg: '#d8dee9', cursor: '#d8dee9', titleBar: '#272c36', ansi: ['#3b4252', '#bf616a', '#a3be8c', '#ebcb8b', '#81a1c1', '#b48ead', '#88c0d0', '#e5e9f0', '#4c566a', '#bf616a', '#a3be8c', '#ebcb8b', '#81a1c1', '#b48ead', '#8fbcbb', '#eceff4'] },
    'gruvbox-dark': { bg: '#282828', fg: '#ebdbb2', cursor: '#ebdbb2', titleBar: '#1d2021', ansi: ['#282828', '#cc241d', '#98971a', '#d79921', '#458588', '#b16286', '#689d6a', '#a89984', '#928374', '#fb4934', '#b8bb26', '#fabd2f', '#83a598', '#d3869b', '#8ec07c', '#ebdbb2'] },
    xterm: { bg: '#000000', fg: '#e5e5e5', cursor: '#e5e5e5', titleBar: '#1a1a1a', ansi: ['#000000', '#cd0000', '#00cd00', '#cdcd00', '#0000ee', '#cd00cd', '#00cdcd', '#e5e5e5', '#7f7f7f', '#ff0000', '#00ff00', '#ffff00', '#5c5cff', '#ff00ff', '#00ffff', '#ffffff'] },
  };
  // Semantic hue anchors (OKLCH degrees) for ANSI slots 1-6.
  const SLOTS = [[1, 'red', 25], [2, 'green', 145], [3, 'yellow', 92], [4, 'blue', 258], [5, 'magenta', 330], [6, 'cyan', 205]];
  // Theme derived from style.json: deep stage tone, readable fg, ANSI hues anchored to their meaning but tinted
  // with the material's own accents (a palette colour within +-30 deg of a slot's hue takes that slot).
  function themeFromStyle(style, o = {}) {
    const P = (style && style.palette) || {};
    const lightReel = ((style && style.layout && style.layout.theme) || (lum(P.bg || '#000') > 0.35 ? 'light' : 'dark')) === 'light';
    const variant = o.variant || 'dark';
    let bg, fg;
    if (variant === 'light') {
      bg = [P.surface, P.bg, P.bg2].find(c => c && lum(c) > 0.6) || (P.ink && lum(P.ink) > 0.6 ? mixc(P.ink, '#ffffff', 0.7) : '#ffffff');
      fg = withContrast(P.ink || '#1f2328', bg, 12);
    } else {
      let base = lightReel ? (P.ink || '#15161a') : (P.bg2 || P.surface || P.bg || '#111318');
      if (!lightReel && P.bg && Math.abs(lch(base)[0] - lch(P.bg)[0]) < 0.025) base = mixc(P.bg, '#ffffff', 0.05);
      let [L, C, h] = lch(base);
      bg = oklch(Math.min(L, lightReel ? 0.2 : 0.26), Math.min(C, 0.05), h);
      fg = withContrast(lightReel ? (P.bg || '#f4f4f4') : (P.ink || '#e8e8e8'), bg, 11);
    }
    const dark = lum(bg) < 0.25;
    const cands = [['ok', P.ok], ['warn', P.warn], ['deny', P.deny], ['accent', P.accent], ['accent2', P.accent2], ['accent3', P.accent3]].filter(x => x[1]);
    const ansi = new Array(16);
    for (const [i, name, hue] of SLOTS) {
      const pref = { red: 'deny', green: 'ok', yellow: 'warn' }[name];
      let pick = null, best = 1e9;
      for (const [k, c] of cands) {
        const [, C, h] = lch(c);
        const d = Math.min(Math.abs(h - hue), 360 - Math.abs(h - hue));
        const score = d - (k === pref ? 25 : 0);
        if (C > 0.06 && d < 30 && score < best) { best = score; pick = c; }
      }
      const [, pc, ph] = pick ? lch(pick) : [0, dark ? 0.13 : 0.15, hue];
      const Ln = dark ? 0.76 : 0.5, Lb = dark ? 0.84 : 0.42;
      ansi[i] = withContrast(oklch(Ln, clamp(pc, 0.08, 0.2), ph), bg, 4.5);
      ansi[i + 8] = withContrast(oklch(Lb, clamp(pc * 1.05, 0.08, 0.21), ph), bg, 4.5);
    }
    if (dark) {
      ansi[0] = mixc(bg, fg, 0.22); ansi[8] = withContrast(mixc(bg, fg, 0.45), bg, 3);
      ansi[7] = mixc(fg, bg, 0.12); ansi[15] = fg;
    } else {
      ansi[0] = fg; ansi[8] = withContrast(mixc(fg, bg, 0.42), bg, 3.2);
      ansi[7] = withContrast(mixc(fg, bg, 0.55), bg, 2.4); ansi[15] = withContrast(mixc(fg, bg, 0.35), bg, 3);
    }
    return { name: 'style', bg, fg, cursor: P.accent ? withContrast(P.accent, bg, 3) : fg, ansi };
  }
  // Resolve a theme spec: undefined / 'style' (from style.json), a THEMES name, or an object (merged over its
  // `base`, default the style theme). Fills chrome colours and the 256-colour table.
  function theme(spec, style) {
    const st = style || G.style();
    let t;
    if (!spec || spec === 'style') t = themeFromStyle(st);
    else if (typeof spec === 'string') {
      if (THEMES[spec]) t = { name: spec, ...THEMES[spec] };
      else { warnOnce('theme:' + spec, `unknown theme "${spec}" (known: ${Object.keys(THEMES).join(', ')}); using the style theme`); t = themeFromStyle(st); }
    } else {
      const base = spec.base ? theme(spec.base, st) : spec.variant ? themeFromStyle(st, { variant: spec.variant }) : themeFromStyle(st);
      t = { ...base, ...spec, ansi: spec.ansi || base.ansi };
    }
    const dark = lum(t.bg) < 0.25;
    t.dark = dark;
    t.cursor = t.cursor || t.fg;
    t.cursorText = t.cursorText || t.bg;
    t.titleBar = t.titleBar || mixc(t.bg, dark ? '#000000' : t.fg, dark ? 0.25 : 0.05);
    t.titleFg = t.titleFg || mixc(t.titleBar, t.fg, 0.55);
    t.border = t.border || mixc(t.bg, t.fg, dark ? 0.16 : 0.18);
    t.selection = t.selection || rgbaS(t.cursor, 0.28);
    t.boldBright = t.boldBright ?? true;
    const pal = t.ansi.slice(0, 16);
    const lv = [0, 95, 135, 175, 215, 255];
    for (let i = 0; i < 216; i++) pal.push(hex([lv[Math.floor(i / 36)], lv[Math.floor(i / 6) % 6], lv[i % 6]]));
    for (let i = 0; i < 24; i++) { const v = 8 + i * 10; pal.push(hex([v, v, v])); }
    t.pal = pal;
    return t;
  }

  // The recording's own colours: asciicast header theme {fg, bg, palette: '#..:#..'} or a THEMES name that
  // capture_cli.py stored (--theme). Returns a theme spec for theme(), or null.
  function castTheme(cast) {
    const h = cast && cast.themeHint;
    if (h && h.bg && h.fg) {
      const pal = String(h.palette || '').split(':').filter(Boolean);
      const ansi = pal.length >= 16 ? pal.slice(0, 16) : pal.length >= 8 ? [...pal.slice(0, 8), ...pal.slice(0, 8)] : null;
      return ansi ? { base: 'xterm', bg: h.bg, fg: h.fg, ansi } : { base: 'xterm', bg: h.bg, fg: h.fg };
    }
    const name = cast && cast.header && cast.header.x_showreel && cast.header.x_showreel.theme;
    return name && THEMES[name] ? name : null;
  }

  // ───────── cast parsing ─────────
  // -> { version, cols, rows, title, command, events: [{t, c ('o'|'i'|'m'|'r'|'x'), d}], duration, header, segments }
  function parse(src) {
    if (src && typeof src === 'object' && Array.isArray(src.events)) return src;
    if (src && typeof src === 'object') return fromObject(src);
    const text = String(src ?? '');
    const first = text.slice(0, text.indexOf('\n') < 0 ? text.length : text.indexOf('\n')).trim();
    let header = null;
    if (first.startsWith('{')) { try { header = JSON.parse(first); } catch (e) { header = null; } }
    if (!header) {
      try { const whole = JSON.parse(text); if (whole && whole.version === 1) return fromObject(whole); } catch (e) { /* raw text */ }
      return finish({ version: 0, width: 80, height: 24 }, [{ t: 0, c: 'o', d: text.replace(/\r?\n/g, '\r\n') }]);
    }
    const v = header.version || 2, events = [];
    let acc = 0;
    for (const line of text.split('\n').slice(1)) {
      const s = line.trim();
      if (!s || s[0] !== '[') continue;
      let e;
      try { e = JSON.parse(s); } catch (err) { continue; }
      if (!Array.isArray(e) || e.length < 2) continue;
      let t = +e[0] || 0;
      if (v >= 3) { acc += t; t = acc; }
      events.push({ t, c: String(e[1]), d: e.length > 2 ? String(e[2]) : '' });
    }
    return finish(header, events);
  }
  function fromObject(o) {
    if (o.version === 1 && Array.isArray(o.stdout)) {
      let t = 0; const ev = [];
      for (const [dt, d] of o.stdout) { t += +dt || 0; ev.push({ t, c: 'o', d: String(d) }); }
      return finish({ version: 1, width: o.width, height: o.height, title: o.title, command: o.command }, ev);
    }
    return finish({ version: 0, width: 80, height: 24 }, []);
  }
  function finish(h, events) {
    events.sort((a, b) => a.t - b.t);
    const term = h.term || {};
    const cols = +(h.width || term.cols) || 80, rows = +(h.height || term.rows) || 24;
    const xs = h.x_showreel || {};
    return {
      version: h.version, cols, rows, title: h.title || '', command: h.command || '', header: h, events,
      duration: events.length ? events[events.length - 1].t : 0, segments: Array.isArray(xs.segments) ? xs.segments : [],
      themeHint: h.theme || term.theme || null,
    };
  }

  // ───────── character width (wcwidth subset) ─────────
  const WIDE = [[0x1100, 0x115f], [0x2329, 0x232a], [0x2e80, 0x303e], [0x3041, 0x33ff], [0x3400, 0x4dbf], [0x4e00, 0x9fff], [0xa000, 0xa4cf], [0xa960, 0xa97f], [0xac00, 0xd7a3], [0xf900, 0xfaff], [0xfe10, 0xfe19], [0xfe30, 0xfe6f], [0xff00, 0xff60], [0xffe0, 0xffe6], [0x1f200, 0x1f2ff], [0x20000, 0x2fffd], [0x30000, 0x3fffd]];
  let RE_EMO = null, RE_ZW = null;
  try { RE_EMO = new RegExp('\\p{Emoji_Presentation}', 'u'); RE_ZW = new RegExp('[\\p{Mn}\\p{Me}\\p{Cf}]', 'u'); } catch (e) { /* old engines */ }
  const WCACHE = new Map();
  function cwidth(cp) {
    if (cp < 0x300) return cp < 0x20 || (cp >= 0x7f && cp < 0xa0) ? 0 : 1;
    let w = WCACHE.get(cp);
    if (w !== undefined) return w;
    const ch = String.fromCodePoint(cp);
    w = 1;
    if (cp === 0xad) w = 1;
    else if ((RE_ZW && RE_ZW.test(ch)) || (cp >= 0x1160 && cp <= 0x11ff) || (cp >= 0xd7b0 && cp <= 0xd7ff) || (cp >= 0x200b && cp <= 0x200f)) w = 0;
    else if (RE_EMO && RE_EMO.test(ch)) w = 2;
    else for (const [a, b] of WIDE) if (cp >= a && cp <= b) { w = 2; break; }
    WCACHE.set(cp, w);
    return w;
  }
  const DEC_GFX = { '`': '◆', a: '▒', f: '°', g: '±', j: '┘', k: '┐', l: '┌', m: '└', n: '┼', o: '⎺', p: '⎻', q: '─', r: '⎼', s: '⎽', t: '├', u: '┤', v: '┴', w: '┬', x: '│', y: '≤', z: '≥', '{': 'π', '|': '≠', '}': '£', '~': '·' };

  // ───────── emulator ─────────
  // style record: fg/bg -1 default, 0..255 palette, >= 0x1000000 truecolor (0x1000000 | rgb);
  // b bold, d dim, i italic, u underline, v inverse, h hidden, s strike, o overline, k blink.
  const DEF = Object.freeze({ fg: -1, bg: -1, b: 0, d: 0, i: 0, u: 0, v: 0, h: 0, s: 0, o: 0, k: 0 });
  class Styles {
    constructor() { this.list = [DEF]; this.map = new Map([[Styles.key(DEF), 0]]); }
    static key(s) { return `${s.fg},${s.bg},${s.b},${s.d},${s.i},${s.u},${s.v},${s.h},${s.s},${s.o},${s.k}`; }
    id(s) { const k = Styles.key(s); let i = this.map.get(k); if (i === undefined) { i = this.list.length; this.list.push(Object.freeze({ ...s })); this.map.set(k, i); } return i; }
  }
  const blankLine = (cols, a) => ({ c: new Array(cols).fill(' '), a: new Int32Array(cols).fill(a), w: false });
  const cloneLine = l => ({ c: l.c.slice(), a: l.a.slice(), w: l.w });
  const GROUND = 0, ESC = 1, ESCI = 2, CSI = 3, OSC = 4, OSCE = 5, STR = 6, STRE = 7;

  class VT {
    constructor(cols = 80, rows = 24, o = {}) {
      this.cols = Math.max(2, cols | 0); this.rows = Math.max(1, rows | 0);
      this.maxSb = o.scrollback ?? 2000;
      this.S = o.styles || new Styles();
      this.reset(true);
    }
    reset(hard) {
      this.lines = Array.from({ length: this.rows }, () => blankLine(this.cols, 0));
      if (hard) { this.sb = []; this.scrolled = 0; }
      this.cx = 0; this.cy = 0; this.wrapPending = false;
      this.cur = { ...DEF }; this.st = 0; this._ers = -1;
      this.top = 0; this.bot = this.rows - 1;
      this.autowrap = true; this.cursorOn = true; this.origin = false; this.insert = false; this.lnm = false;
      this.altSave = null; this.saved = null;
      this.tabs = []; for (let i = 8; i < this.cols; i += 8) this.tabs.push(i);
      this.gset = ['B', 'B']; this.gl = 0; this.desig = 0;
      this.title = this.title || ''; this.cursorShape = this.cursorShape || null; this.lastCh = ' ';
      this.ps = GROUND; this.pbuf = ''; this.priv = ''; this.inter = ''; this.sbuf = '';
    }
    clone() {
      const v = Object.create(VT.prototype);
      Object.assign(v, this);
      v.lines = this.lines.map(cloneLine);
      v.sb = this.sb.slice();
      v.cur = { ...this.cur };
      v.saved = this.saved ? { ...this.saved, cur: { ...this.saved.cur }, gset: this.saved.gset.slice() } : null;
      v.altSave = this.altSave ? { ...this.altSave, lines: this.altSave.lines.map(cloneLine) } : null;
      v.tabs = this.tabs.slice(); v.gset = this.gset.slice();
      return v;
    }
    // absolute line index: 0 = first line ever scrolled into history; screen row r = scrolled + r
    lineAbs(L) {
      const drop = this.scrolled - this.sb.length;
      if (L < drop) return null;
      if (L < this.scrolled) return this.sb[L - drop];
      const r = L - this.scrolled;
      return r >= 0 && r < this.rows ? this.lines[r] : null;
    }
    get firstAbs() { return this.scrolled - this.sb.length; }
    _setStyle() { this.st = this.S.id(this.cur); this._ers = -1; }
    _erase() { if (this._ers < 0) this._ers = this.cur.bg === -1 ? 0 : this.S.id({ ...DEF, bg: this.cur.bg }); return this._ers; }
    _blank() { return blankLine(this.cols, this._erase()); }
    write(s) {
      for (const ch of s) {
        const cp = ch.codePointAt(0);
        switch (this.ps) {
          case GROUND:
            if (cp < 0x20 || cp === 0x7f) this.ctrl(cp);
            else if (cp === 0x9b) { this.ps = CSI; this.pbuf = ''; this.priv = ''; this.inter = ''; }
            else if (cp === 0x9d) { this.ps = OSC; this.sbuf = ''; }
            else if (cp >= 0x80 && cp < 0xa0) { /* other C1: ignore */ }
            else this.print(ch, cp);
            break;
          case ESC: this.esc(ch, cp); break;
          case ESCI:
            if (this.desig >= 0) this.gset[this.desig] = ch === '0' ? '0' : 'B';
            else if (this.desig === -2 && ch === '8') { for (const l of this.lines) { l.c.fill('E'); l.a.fill(0); } }
            this.ps = GROUND; break;
          case CSI:
            if (cp >= 0x30 && cp <= 0x3f) { if ('<=>?'.includes(ch) && this.pbuf === '') this.priv += ch; else this.pbuf += ch; }
            else if (cp >= 0x20 && cp <= 0x2f) this.inter += ch;
            else if (cp >= 0x40 && cp <= 0x7e) { this.ps = GROUND; this.csi(ch); }
            else if (cp === 0x1b) this.ps = ESC;
            else if (cp < 0x20) this.ctrl(cp);
            else this.ps = GROUND;
            break;
          case OSC:
            if (cp === 7) { this.ps = GROUND; this.osc(this.sbuf); }
            else if (cp === 0x1b) this.ps = OSCE;
            else if (this.sbuf.length < 4096) this.sbuf += ch;
            break;
          case OSCE: this.ps = GROUND; this.osc(this.sbuf); if (ch !== '\\') this.esc(ch, cp); break;
          case STR: if (cp === 0x1b) this.ps = STRE; else if (cp === 7) this.ps = GROUND; break;
          case STRE: this.ps = ch === '\\' ? GROUND : STR; break;
        }
      }
    }
    ctrl(cp) {
      switch (cp) {
        case 8: if (this.cx > 0) this.cx--; this.wrapPending = false; break;
        case 9: { let x = this.cols - 1; for (const s of this.tabs) if (s > this.cx) { x = s; break; } this.cx = Math.min(x, this.cols - 1); this.wrapPending = false; break; }
        case 10: case 11: case 12: this.lf(); if (this.lnm) this.cx = 0; break;
        case 13: this.cx = 0; this.wrapPending = false; break;
        case 14: this.gl = 1; break;
        case 15: this.gl = 0; break;
        case 27: this.ps = ESC; break;
        default: break;
      }
    }
    esc(ch) {
      this.ps = GROUND;
      switch (ch) {
        case '[': this.ps = CSI; this.pbuf = ''; this.priv = ''; this.inter = ''; break;
        case ']': this.ps = OSC; this.sbuf = ''; break;
        case 'P': case '_': case '^': case 'X': this.ps = STR; break;
        case '(': case ')': case '*': case '+': this.desig = '()*+'.indexOf(ch) > 1 ? -1 : '()'.indexOf(ch); this.ps = ESCI; break;
        case '#': this.desig = -2; this.ps = ESCI; break;
        case '7': this.saveCursor(); break;
        case '8': this.restoreCursor(); break;
        case 'D': this.lf(); break;
        case 'E': this.cx = 0; this.lf(); break;
        case 'M': this.ri(); break;
        case 'H': if (!this.tabs.includes(this.cx)) { this.tabs.push(this.cx); this.tabs.sort((a, b) => a - b); } break;
        case 'c': this.reset(false); for (let i = 0; i < this.rows; i++) this.lines[i] = blankLine(this.cols, 0); break;
        case '\\': case '=': case '>': default: break;
      }
    }
    osc(s) {
      const i = s.indexOf(';'), n = i < 0 ? s : s.slice(0, i), v = i < 0 ? '' : s.slice(i + 1);
      if (n === '0' || n === '2') this.title = v;
    }
    print(ch, cp) {
      if (this.gset[this.gl] === '0' && DEC_GFX[ch]) { ch = DEC_GFX[ch]; cp = ch.codePointAt(0); }
      const w = cwidth(cp);
      if (w === 0) {   // combining mark: attach to the previous cell
        let x = this.wrapPending ? this.cx : this.cx - 1;
        const l = this.lines[this.cy];
        if (x >= 0 && l.c[x] === '' && x > 0) x--;
        if (x >= 0) l.c[x] += ch;
        return;
      }
      if (this.wrapPending && this.autowrap) { this.lines[this.cy].w = true; this.cx = 0; this.lf(); }
      this.wrapPending = false;
      if (w === 2 && this.cx >= this.cols - 1) {
        if (this.autowrap) { this.lines[this.cy].w = true; this.cx = 0; this.lf(); } else this.cx = this.cols - 2;
      }
      const l = this.lines[this.cy];
      if (this.insert) { for (let k = 0; k < w; k++) { l.c.splice(this.cx, 0, ' '); l.c.length = this.cols; } const a = Array.from(l.a); for (let k = 0; k < w; k++) a.splice(this.cx, 0, this.st); l.a = Int32Array.from(a.slice(0, this.cols)); }
      this.fixWide(l, this.cx); if (w === 2) this.fixWide(l, this.cx + 1);
      l.c[this.cx] = ch; l.a[this.cx] = this.st;
      if (w === 2) { l.c[this.cx + 1] = ''; l.a[this.cx + 1] = this.st; }
      this.lastCh = ch;
      this.cx += w;
      if (this.cx >= this.cols) { this.cx = this.cols - 1; this.wrapPending = this.autowrap; }
    }
    // overwriting half of a wide character blanks its other half
    fixWide(l, x) {
      if (x < 0 || x >= this.cols) return;
      if (l.c[x] === '' && x > 0) l.c[x - 1] = ' ';
      else if (x + 1 < this.cols && l.c[x + 1] === '') l.c[x + 1] = ' ';
    }
    lf() {
      this.wrapPending = false;
      if (this.cy === this.bot) this.scrollUp(1);
      else if (this.cy < this.rows - 1) this.cy++;
    }
    ri() {
      this.wrapPending = false;
      if (this.cy === this.top) this.scrollDown(1);
      else if (this.cy > 0) this.cy--;
    }
    scrollUp(n) {
      n = Math.min(n, this.bot - this.top + 1);
      for (let i = 0; i < n; i++) {
        const gone = this.lines.splice(this.top, 1)[0];
        this.lines.splice(this.bot, 0, this._blank());
        if (this.top === 0 && this.bot === this.rows - 1 && !this.altSave && this.maxSb > 0) {
          this.sb.push(gone); this.scrolled++;
          if (this.sb.length > this.maxSb) this.sb.shift();
        }
      }
    }
    scrollDown(n) {
      n = Math.min(n, this.bot - this.top + 1);
      for (let i = 0; i < n; i++) { this.lines.splice(this.bot, 1); this.lines.splice(this.top, 0, this._blank()); }
    }
    eraseCells(l, x0, x1) {
      x0 = Math.max(0, x0); x1 = Math.min(this.cols, x1);
      if (x0 >= x1) return;
      if (x0 > 0 && l.c[x0] === '') l.c[x0 - 1] = ' ';
      if (x1 < this.cols && l.c[x1] === '') l.c[x1] = ' ';
      const e = this._erase();
      for (let x = x0; x < x1; x++) { l.c[x] = ' '; l.a[x] = e; }
    }
    saveCursor() { this.saved = { cx: this.cx, cy: this.cy, cur: { ...this.cur }, origin: this.origin, wrap: this.wrapPending, gset: this.gset.slice(), gl: this.gl }; }
    restoreCursor() {
      const s = this.saved;
      if (!s) { this.cx = 0; this.cy = 0; this.cur = { ...DEF }; this._setStyle(); return; }
      this.cx = Math.min(s.cx, this.cols - 1); this.cy = Math.min(s.cy, this.rows - 1); this.cur = { ...s.cur }; this.origin = s.origin;
      this.wrapPending = s.wrap; this.gset = s.gset.slice(); this.gl = s.gl; this._setStyle();
    }
    altScreen(on, clear) {
      if (on && !this.altSave) {
        this.altSave = { lines: this.lines, top: this.top, bot: this.bot };
        this.lines = Array.from({ length: this.rows }, () => blankLine(this.cols, 0));
      } else if (!on && this.altSave) {
        this.lines = this.altSave.lines; this.altSave = null;
      } else if (on && clear) this.lines = Array.from({ length: this.rows }, () => blankLine(this.cols, 0));
    }
    resize(cols, rows) {
      cols = Math.max(2, cols | 0); rows = Math.max(1, rows | 0);
      const fit = l => { if (l.c.length < cols) { const n = cols - l.c.length; l.c.push(...new Array(n).fill(' ')); const a = new Int32Array(cols); a.set(l.a); l.a = a; } else if (l.c.length > cols) { l.c.length = cols; l.a = l.a.slice(0, cols); } return l; };
      this.lines.forEach(fit);
      while (this.lines.length > rows) {
        if (this.cy > 0 && !this.altSave) { const gone = this.lines.shift(); this.sb.push(gone); this.scrolled++; this.cy--; }
        else this.lines.pop();
      }
      while (this.lines.length < rows) this.lines.push(blankLine(cols, 0));
      this.cols = cols; this.rows = rows; this.top = 0; this.bot = rows - 1;
      this.cx = Math.min(this.cx, cols - 1); this.cy = Math.min(this.cy, rows - 1);
      this.tabs = []; for (let i = 8; i < cols; i += 8) this.tabs.push(i);
    }
    csi(f) {
      const P = this.pbuf.length ? this.pbuf.split(';').map(g => g.split(':').map(x => (x === '' ? -1 : parseInt(x, 10)))) : [];
      const p = (i, d) => (P[i] && P[i][0] > 0 ? P[i][0] : d);
      const p0 = (i, d) => (P[i] && P[i][0] >= 0 ? P[i][0] : d);
      const priv = this.priv, inter = this.inter;
      const l = this.lines[this.cy];
      const top = this.origin ? this.top : 0, bot = this.origin ? this.bot : this.rows - 1;
      if ('ABCDEFGHIZadef`rsuLM'.includes(f) && !(f === 'r' && priv) && !((f === 's' || f === 'u') && priv)) this.wrapPending = false;
      switch (f) {
        case '@': { const n = Math.min(p(0, 1), this.cols - this.cx); const e = this._erase(); l.c.splice(this.cx, 0, ...new Array(n).fill(' ')); l.c.length = this.cols; const a = Array.from(l.a); a.splice(this.cx, 0, ...new Array(n).fill(e)); l.a = Int32Array.from(a.slice(0, this.cols)); break; }
        case 'A': this.cy = Math.max(this.cy >= this.top ? this.top : 0, this.cy - p(0, 1)); break;
        case 'B': this.cy = Math.min(this.cy <= this.bot ? this.bot : this.rows - 1, this.cy + p(0, 1)); break;
        case 'C': case 'a': this.cx = Math.min(this.cols - 1, this.cx + p(0, 1)); break;
        case 'D': this.cx = Math.max(0, this.cx - p(0, 1)); break;
        case 'E': this.cy = Math.min(this.bot, this.cy + p(0, 1)); this.cx = 0; break;
        case 'F': this.cy = Math.max(this.top, this.cy - p(0, 1)); this.cx = 0; break;
        case 'G': case '`': this.cx = clamp(p(0, 1) - 1, 0, this.cols - 1); break;
        case 'H': case 'f': this.cy = clamp(top + p(0, 1) - 1, top, bot); this.cx = clamp(p(1, 1) - 1, 0, this.cols - 1); break;
        case 'I': for (let k = 0; k < p(0, 1); k++) this.ctrl(9); break;
        case 'Z': for (let k = 0; k < p(0, 1); k++) { let x = 0; for (const s of this.tabs) if (s < this.cx) x = s; this.cx = x; } break;
        case 'J': {
          const m = p0(0, 0);
          if (m === 0) { this.eraseCells(l, this.cx, this.cols); for (let y = this.cy + 1; y < this.rows; y++) this.lines[y] = this._blank(); }
          else if (m === 1) { this.eraseCells(l, 0, this.cx + 1); for (let y = 0; y < this.cy; y++) this.lines[y] = this._blank(); }
          else if (m === 2) { for (let y = 0; y < this.rows; y++) this.lines[y] = this._blank(); }
          else if (m === 3) { this.sb = []; }
          break;
        }
        case 'K': { const m = p0(0, 0); if (m === 0) this.eraseCells(l, this.cx, this.cols); else if (m === 1) this.eraseCells(l, 0, this.cx + 1); else this.eraseCells(l, 0, this.cols); l.w = false; break; }
        case 'L': if (this.cy >= this.top && this.cy <= this.bot) { const n = Math.min(p(0, 1), this.bot - this.cy + 1); for (let k = 0; k < n; k++) { this.lines.splice(this.bot, 1); this.lines.splice(this.cy, 0, this._blank()); } this.cx = 0; } break;
        case 'M': if (this.cy >= this.top && this.cy <= this.bot) { const n = Math.min(p(0, 1), this.bot - this.cy + 1); for (let k = 0; k < n; k++) { this.lines.splice(this.cy, 1); this.lines.splice(this.bot, 0, this._blank()); } this.cx = 0; } break;
        case 'P': { const n = Math.min(p(0, 1), this.cols - this.cx); this.fixWide(l, this.cx); l.c.splice(this.cx, n); l.c.push(...new Array(n).fill(' ')); const a = Array.from(l.a); a.splice(this.cx, n); a.push(...new Array(n).fill(this._erase())); l.a = Int32Array.from(a); break; }
        case 'S': if (!priv) this.scrollUp(p(0, 1)); break;
        case 'T': if (!priv && P.length <= 1) this.scrollDown(p(0, 1)); break;
        case 'X': this.eraseCells(l, this.cx, this.cx + p(0, 1)); break;
        case 'b': { const n = Math.min(p(0, 1), 4096); for (let k = 0; k < n; k++) this.print(this.lastCh, this.lastCh.codePointAt(0)); break; }
        case 'd': this.cy = clamp(top + p(0, 1) - 1, top, bot); break;
        case 'e': this.cy = Math.min(this.rows - 1, this.cy + p(0, 1)); break;
        case 'g': { const m = p0(0, 0); if (m === 0) this.tabs = this.tabs.filter(x => x !== this.cx); else if (m === 3) this.tabs = []; break; }
        case 'h': case 'l': this.modes(priv, P.map(x => x[0]), f === 'h'); break;
        case 'm': if (!priv) this.sgr(P); break;
        case 'r': if (!priv) { const t0 = p(0, 1) - 1, b0 = p(1, this.rows) - 1; if (t0 < b0 && b0 < this.rows) { this.top = t0; this.bot = b0; } else { this.top = 0; this.bot = this.rows - 1; } this.cx = 0; this.cy = this.origin ? this.top : 0; } break;
        case 's': if (!priv) this.saveCursor(); break;
        case 'u': if (!priv) this.restoreCursor(); break;
        case 'q': if (inter === ' ') { const m = p0(0, 1); this.cursorShape = m <= 2 ? 'block' : m <= 4 ? 'underline' : 'bar'; } break;
        case 'p': if (inter === '!') { const keepT = this.title; this.cur = { ...DEF }; this._setStyle(); this.top = 0; this.bot = this.rows - 1; this.origin = false; this.insert = false; this.autowrap = true; this.cursorOn = true; this.title = keepT; } break;
        default: break;
      }
    }
    modes(priv, list, on) {
      for (const m of list) {
        if (priv === '?') {
          if (m === 6) { this.origin = on; this.cx = 0; this.cy = on ? this.top : 0; }
          else if (m === 7) this.autowrap = on;
          else if (m === 25) this.cursorOn = on;
          else if (m === 47 || m === 1047) this.altScreen(on, m === 1047);
          else if (m === 1048) { if (on) this.saveCursor(); else this.restoreCursor(); }
          else if (m === 1049) { if (on) { this.saveCursor(); this.altScreen(true, true); } else { this.altScreen(false); this.restoreCursor(); } }
        } else if (!priv) {
          if (m === 4) this.insert = on;
          else if (m === 20) this.lnm = on;
        }
      }
    }
    sgr(P) {
      if (!P.length) P = [[0]];
      const c = this.cur;
      for (let i = 0; i < P.length; i++) {
        const g = P[i], n = g[0] < 0 ? 0 : g[0];
        if (n === 38 || n === 48 || n === 58) {
          let col = null;
          if (g.length > 1) {   // colon form: 38:5:n or 38:2:[cs]:r:g:b
            if (g[1] === 5) col = clamp(g[2] | 0, 0, 255);
            else if (g[1] === 2) { const v = g.slice(2).filter(x => x >= 0); const [r, gg, b] = v.length >= 4 ? v.slice(1) : v; col = 0x1000000 | ((r & 255) << 16) | ((gg & 255) << 8) | (b & 255); }
          } else {
            const mode = P[i + 1] && P[i + 1][0];
            if (mode === 5) { col = clamp(P[i + 2] ? P[i + 2][0] : 0, 0, 255); i += 2; }
            else if (mode === 2) { const r = P[i + 2] ? P[i + 2][0] : 0, gg = P[i + 3] ? P[i + 3][0] : 0, b = P[i + 4] ? P[i + 4][0] : 0; col = 0x1000000 | ((r & 255) << 16) | ((gg & 255) << 8) | (b & 255); i += 4; }
          }
          if (col !== null && n === 38) c.fg = col; else if (col !== null && n === 48) c.bg = col;
          continue;
        }
        if (n === 0) Object.assign(c, DEF);
        else if (n === 1) c.b = 1; else if (n === 2) c.d = 1; else if (n === 3) c.i = 1;
        else if (n === 4) c.u = g.length > 1 ? (g[1] > 0 ? 1 : 0) : 1;
        else if (n === 5 || n === 6) c.k = 1; else if (n === 7) c.v = 1; else if (n === 8) c.h = 1; else if (n === 9) c.s = 1;
        else if (n === 21) c.u = 1; else if (n === 22) { c.b = 0; c.d = 0; } else if (n === 23) c.i = 0; else if (n === 24) c.u = 0;
        else if (n === 25) c.k = 0; else if (n === 27) c.v = 0; else if (n === 28) c.h = 0; else if (n === 29) c.s = 0;
        else if (n >= 30 && n <= 37) c.fg = n - 30; else if (n === 39) c.fg = -1;
        else if (n >= 40 && n <= 47) c.bg = n - 40; else if (n === 49) c.bg = -1;
        else if (n === 53) c.o = 1; else if (n === 55) c.o = 0;
        else if (n >= 90 && n <= 97) c.fg = n - 90 + 8; else if (n >= 100 && n <= 107) c.bg = n - 100 + 8;
      }
      this._setStyle();
    }
    // plain text of an absolute line (wide chars once), and the start column of each code unit
    static text(l) {
      if (!l) return { s: '', col: [] };
      let s = ''; const col = [];
      for (let x = 0; x < l.c.length; x++) { const ch = l.c[x]; if (ch === '') continue; for (let k = 0; k < ch.length; k++) col.push(x); s += ch; }
      return { s, col };
    }
    screenText() { return this.lines.map(l => VT.text(l).s.replace(/\s+$/, '')).join('\n'); }
  }

  // ───────── elision: hide a run of output lines behind one "…" line (never reorders or rewrites lines) ─────────
  const toRx = r => (r instanceof RegExp ? r : new RegExp(String(r).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  // visible text of a raw stream + map from visible index to raw offset (escape sequences removed)
  function visible(S) {
    let text = ''; const map = [];
    const re = /\x1b\[[0-9;:?<=>]*[ -\/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[()#][0-9A-Za-z]|\x1b./g;
    let last = 0, m;
    while ((m = re.exec(S))) { for (let i = last; i < m.index; i++) { map.push(i); text += S[i]; } last = m.index + m[0].length; }
    for (let i = last; i < S.length; i++) { map.push(i); text += S[i]; }
    map.push(S.length);
    return { text, map };
  }
  // rules: [{after: RegExp|string, before: RegExp|string} | {after, lines: n}, mark?: '…'] — hides the lines strictly
  // between the line matching `after` and the line matching `before` (or the next n lines).
  function elide(evs, skip, rules) {
    const idx = []; evs.forEach((e, i) => { if (e.c === 'o' && !skip.has(i)) idx.push(i); });
    const chunks = idx.map(i => evs[i].d);
    const S = chunks.join('');
    const { text, map } = visible(S);
    const cuts = [];
    for (const r of rules) {
      const ma = toRx(r.after).exec(text);
      if (!ma) continue;
      const a = text.indexOf('\n', ma.index + ma[0].length);
      if (a < 0) continue;
      let b = -1;
      if (r.before) {
        const rb = toRx(r.before); rb.lastIndex = 0;
        const tail = text.slice(a + 1), mb = rb.exec(tail);
        if (mb) { const ls = tail.lastIndexOf('\n', mb.index); b = a + 1 + (ls < 0 ? 0 : ls + 1); }
      } else if (r.lines) {
        b = a + 1;
        for (let k = 0; k < r.lines && b < text.length; k++) { const n = text.indexOf('\n', b); b = n < 0 ? text.length : n + 1; }
      }
      if (b > a + 1) cuts.push([map[a + 1], map[b], `\x1b[0m\x1b[2m${r.mark ?? '  …'}\x1b[0m\r\n`]);
    }
    if (!cuts.length) return 0;
    cuts.sort((x, y) => x[0] - y[0]);
    // rewrite the joined stream; chunk boundaries move with the text (a boundary inside a cut moves to the end of
    // its mark), emptied chunks are dropped from timing
    let acc = 0, last = 0, delta = 0, newS = '';
    const ends = chunks.map(c => (acc += c.length)), marks = [];
    for (const [a, b, mark] of cuts) {
      if (a < last) continue;
      newS += S.slice(last, a) + mark;
      marks.push([a, b, delta, mark.length]);
      delta += mark.length - (b - a); last = b;
    }
    newS += S.slice(last);
    const mp = x => { let d = 0; for (const [a, b, dd, ml] of marks) { if (x <= a) break; if (x < b) return a + dd + ml; d = dd + ml - (b - a); } return x + d; };
    const nb = ends.map(mp), ns = [0, ...nb.slice(0, -1)];
    const out = nb.map((e, k) => newS.slice(ns[k], e));
    idx.forEach((i, k) => { evs[i] = { ...evs[i], d: out[k] ?? '' }; if (!evs[i].d) evs[i].drop = true; });
    return cuts.length;
  }

  // ───────── re-timing: cast time -> scene time ─────────
  // play: { at: 0 (scene time of the first prompt), typing: {cps: 26, jitter: 0.35, before: 0.25, after: 0.3} | false,
  //         idleLimit: 0.8 (cap on recorded gaps, s), speed: 1 (output playback rate), fit: end time | [t0, t1]
  //         (scene time), fitMode: 'max' (only speed up when needed) | 'exact', stream: {lps: 45} (split bursts
  //         line by line), elide: [{after, before} | {after, lines}] (hide a run of lines behind one '…' line), seed }
  function buildTimeline(cast, p = {}) {
    const at = p.at ?? 0, idle = p.idleLimit ?? 0.8, seed = p.seed ?? 7;
    const ty = p.typing === false ? null : { cps: 26, jitter: 0.35, before: 0.25, after: 0.3, ...(p.typing || {}) };
    const evs = cast.events.filter(e => e.c === 'o' || e.c === 'r');
    const segs = cast.segments || [];
    // mark synthetic echo events (prompt + command + CRLF written by capture_cli at each segment start)
    const echoOf = new Map();
    for (const s of segs) {
      if (!s || typeof s.echo !== 'string') continue;
      const i = evs.findIndex((e, k) => !echoOf.has(k) && e.c === 'o' && e.d === s.echo && Math.abs(e.t - (s.t ?? e.t)) < 1e-3);
      if (i >= 0) echoOf.set(i, s);
    }
    let elided = 0;
    if (p.elide && p.elide.length) { evs.splice(0, evs.length, ...evs.map(e => ({ ...e }))); elided = elide(evs, new Set(echoOf.keys()), p.elide); }
    const run = (speed, typeScale) => {
      const out = [], typed = [];
      let cur = at, prev = null, Ttype = 0, G = 0;
      evs.forEach((e, i) => {
        if (e.drop) return;
        const gap = prev === null ? 0 : Math.min(Math.max(0, e.t - prev), idle);
        G += gap; cur += gap / speed; prev = e.t;
        if (e.c === 'r') { const m = /^(\d+)x(\d+)$/.exec(e.d.trim()); if (m) out.push({ t: cur, r: [+m[1], +m[2]] }); return; }
        const s = echoOf.get(i);
        if (!s) { out.push({ t: cur, d: e.d }); return; }
        const prompt = s.prompt ?? '', cmd = s.cmd ?? '', tail = s.echo.slice(prompt.length + cmd.length) || '\r\n';
        if (!ty || !s.echo.startsWith(prompt + cmd)) { out.push({ t: cur, d: s.echo }); typed.push({ t0: cur, t1: cur, cmd, seg: s }); return; }
        out.push({ t: cur, d: prompt });
        const t0 = cur;
        let tt = ty.before * typeScale;
        const chars = [...cmd];
        chars.forEach((ch, k) => {
          out.push({ t: cur + tt, d: ch, typed: true });
          const j = 1 + ty.jitter * (2 * H32(seed * 13.7 + k * 7.31 + i) - 1);
          tt += ((ch === ' ' || ch === '/' ? 1.3 : 1) * j * typeScale) / ty.cps;
        });
        tt += ty.after * typeScale;
        out.push({ t: cur + tt, d: tail, enter: true });
        typed.push({ t0, t1: cur + tt, cmd, seg: s });
        cur += tt; Ttype += tt;
      });
      return { out, typed, end: cur, Ttype, G };
    };
    let speed = p.speed ?? 1, typeScale = 1;
    let r = run(speed, 1);
    if (p.fit !== undefined && p.fit !== null) {
      const end = Array.isArray(p.fit) ? p.fit[1] : p.fit;
      const avail = Math.max(0.05, end - at);
      const natural = r.Ttype + r.G / speed;
      if ((p.fitMode === 'exact' && Math.abs(natural - avail) > 1e-3) || natural > avail) {
        if (r.Ttype > 0.45 * avail) typeScale = (0.45 * avail) / r.Ttype;
        const rest = avail - r.Ttype * typeScale;
        if (r.G > 0) speed = p.fitMode === 'exact' ? Math.max(0.1, r.G / Math.max(0.05, rest)) : Math.max(speed, r.G / Math.max(0.05, rest));
        r = run(speed, typeScale);
      }
    }
    // optional streaming: split multi-line bursts and spread them before the next event
    let ev = r.out;
    if (p.stream) {
      const lps = p.stream.lps || 45, out = [];
      for (let i = 0; i < ev.length; i++) {
        const e = ev[i];
        if (e.r || e.typed || e.enter || !e.d || e.d.indexOf('\n') < 0) { out.push(e); continue; }
        const parts = e.d.split(/(?<=\n)/);
        if (parts.length < 2) { out.push(e); continue; }
        const next = i + 1 < ev.length ? ev[i + 1].t : e.t + parts.length / lps;
        const dt = Math.min(1 / lps, Math.max(0, next - e.t) / parts.length);
        parts.forEach((d, k) => out.push({ t: e.t + k * dt, d }));
      }
      ev = out;
    }
    return { ev, typed: r.typed, at, end: ev.length ? Math.max(ev[ev.length - 1].t, r.end) : at, speed, typeScale, elided };
  }

  // ───────── special glyphs drawn as shapes (seamless in any font) ─────────
  // box drawing arms: [up, right, down, left], 1 light, 2 heavy, 3 double
  const BOX = {
    '─': [0, 1, 0, 1], '━': [0, 2, 0, 2], '│': [1, 0, 1, 0], '┃': [2, 0, 2, 0], '┌': [0, 1, 1, 0], '┐': [0, 0, 1, 1], '└': [1, 1, 0, 0], '┘': [1, 0, 0, 1],
    '├': [1, 1, 1, 0], '┤': [1, 0, 1, 1], '┬': [0, 1, 1, 1], '┴': [1, 1, 0, 1], '┼': [1, 1, 1, 1], '┏': [0, 2, 2, 0], '┓': [0, 0, 2, 2], '┗': [2, 2, 0, 0], '┛': [2, 0, 0, 2],
    '┣': [2, 2, 2, 0], '┫': [2, 0, 2, 2], '┳': [0, 2, 2, 2], '┻': [2, 2, 0, 2], '╋': [2, 2, 2, 2], '═': [0, 3, 0, 3], '║': [3, 0, 3, 0], '╔': [0, 3, 3, 0], '╗': [0, 0, 3, 3],
    '╚': [3, 3, 0, 0], '╝': [3, 0, 0, 3], '╠': [3, 3, 3, 0], '╣': [3, 0, 3, 3], '╦': [0, 3, 3, 3], '╩': [3, 3, 0, 3], '╬': [3, 3, 3, 3], '╴': [0, 0, 0, 1], '╵': [1, 0, 0, 0],
    '╶': [0, 1, 0, 0], '╷': [0, 0, 1, 0], '╸': [0, 0, 0, 2], '╹': [2, 0, 0, 0], '╺': [0, 2, 0, 0], '╻': [0, 0, 2, 0], '╼': [0, 2, 0, 1], '╾': [0, 1, 0, 2], '╽': [1, 0, 2, 0], '╿': [2, 0, 1, 0],
    '┍': [0, 2, 1, 0], '┑': [0, 0, 1, 2], '┕': [1, 2, 0, 0], '┙': [1, 0, 0, 2], '┝': [1, 2, 1, 0], '┥': [1, 0, 1, 2], '┯': [0, 2, 1, 2], '┷': [1, 2, 0, 2], '┿': [1, 2, 1, 2],
  };
  const ROUND = { '╭': [1, 1], '╮': [-1, 1], '╯': [-1, -1], '╰': [1, -1] };   // arc towards +x/-x, +y/-y
  function drawSpecial(g, ch, x, y, w, h, color, lw) {
    const cp = ch.codePointAt(0);
    if (ch.length > 2) return false;
    // block elements U+2580-259F
    if (cp >= 0x2580 && cp <= 0x259f) {
      g.fillStyle = color;
      const fr = (x0, y0, x1, y1) => g.fillRect(x + x0 * w, y + y0 * h, (x1 - x0) * w, (y1 - y0) * h);
      if (cp === 0x2580) fr(0, 0, 1, 0.5);
      else if (cp >= 0x2581 && cp <= 0x2588) fr(0, 1 - (cp - 0x2580) / 8, 1, 1);
      else if (cp >= 0x2589 && cp <= 0x258f) fr(0, 0, (0x2590 - cp) / 8, 1);
      else if (cp === 0x2590) fr(0.5, 0, 1, 1);
      else if (cp >= 0x2591 && cp <= 0x2593) { g.save(); g.globalAlpha *= [0.25, 0.5, 0.75][cp - 0x2591]; fr(0, 0, 1, 1); g.restore(); }
      else if (cp === 0x2594) fr(0, 0, 1, 1 / 8);
      else if (cp === 0x2595) fr(7 / 8, 0, 1, 1);
      else {
        const Q = { 0x2596: [0, 0, 1, 0], 0x2597: [0, 0, 0, 1], 0x2598: [1, 0, 0, 0], 0x2599: [1, 0, 1, 1], 0x259a: [1, 0, 0, 1], 0x259b: [1, 1, 1, 0], 0x259c: [1, 1, 0, 1], 0x259d: [0, 1, 0, 0], 0x259e: [0, 1, 1, 0], 0x259f: [0, 1, 1, 1] }[cp];
        if (!Q) return false;   // [tl, tr, bl, br]
        if (Q[0]) fr(0, 0, 0.5, 0.5); if (Q[1]) fr(0.5, 0, 1, 0.5); if (Q[2]) fr(0, 0.5, 0.5, 1); if (Q[3]) fr(0.5, 0.5, 1, 1);
      }
      return true;
    }
    // braille U+2800-28FF: 2x4 dots
    if (cp >= 0x2800 && cp <= 0x28ff) {
      const bits = cp - 0x2800;
      if (!bits) return true;
      const map = [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [0, 3], [1, 3]];
      const r = Math.min(w / 2, h / 4) * 0.33;
      g.fillStyle = color;
      g.beginPath();
      for (let b = 0; b < 8; b++) if (bits & (1 << b)) { const [cx, cy] = map[b]; const px = x + w * (0.27 + cx * 0.46), py = y + h * (0.14 + cy * 0.24); g.moveTo(px + r, py); g.arc(px, py, r, 0, TAU); }
      g.fill();
      return true;
    }
    // powerline separators
    if (cp >= 0xe0b0 && cp <= 0xe0b7) {
      g.fillStyle = color; g.strokeStyle = color; g.lineWidth = Math.max(1, lw);
      g.beginPath();
      const k = cp - 0xe0b0;
      if (k === 0) { g.moveTo(x, y); g.lineTo(x + w, y + h / 2); g.lineTo(x, y + h); g.closePath(); g.fill(); }
      else if (k === 1) { g.moveTo(x, y); g.lineTo(x + w, y + h / 2); g.lineTo(x, y + h); g.stroke(); }
      else if (k === 2) { g.moveTo(x + w, y); g.lineTo(x, y + h / 2); g.lineTo(x + w, y + h); g.closePath(); g.fill(); }
      else if (k === 3) { g.moveTo(x + w, y); g.lineTo(x, y + h / 2); g.lineTo(x + w, y + h); g.stroke(); }
      else if (k === 4) { g.moveTo(x, y); g.ellipse(x, y + h / 2, w, h / 2, 0, -Math.PI / 2, Math.PI / 2); g.closePath(); g.fill(); }
      else if (k === 6) { g.moveTo(x + w, y); g.ellipse(x + w, y + h / 2, w, h / 2, 0, Math.PI / 2, Math.PI * 1.5); g.closePath(); g.fill(); }
      else return false;
      return true;
    }
    // box drawing
    const arms = BOX[ch];
    const rnd = ROUND[ch];
    if (!arms && !rnd) return false;
    const cx = x + w / 2, cy = y + h / 2;
    const t1 = Math.max(1, Math.round(lw)), t2 = Math.max(2, Math.round(lw * 2.2));
    g.fillStyle = color; g.strokeStyle = color;
    if (rnd) {
      g.lineWidth = t1; g.beginPath();
      const [sx, sy] = rnd, r = Math.min(w, h) / 2;
      // from the cell edge along y to the centre, round corner, out along x
      g.moveTo(cx, sy > 0 ? y + h : y);
      g.lineTo(cx, cy + sy * r);
      g.arcTo(cx, cy, cx + sx * r, cy, r);
      g.lineTo(sx > 0 ? x + w : x, cy);
      g.stroke();
      return true;
    }
    const seg = (dir, kind) => {
      if (!kind) return;
      const th = kind === 2 ? t2 : t1;
      const offs = kind === 3 ? [-Math.max(1.5, t1 * 1.2), Math.max(1.5, t1 * 1.2)] : [0];
      for (const o of offs) {
        if (dir === 0) g.fillRect(Math.round(cx - th / 2 + o), y, th, cy - y + th / 2);
        if (dir === 2) g.fillRect(Math.round(cx - th / 2 + o), cy - th / 2, th, y + h - cy + th / 2);
        if (dir === 1) g.fillRect(cx - th / 2, Math.round(cy - th / 2 + o), x + w - cx + th / 2, th);
        if (dir === 3) g.fillRect(x, Math.round(cy - th / 2 + o), cx - x + th / 2, th);
      }
    };
    for (let d = 0; d < 4; d++) seg(d, arms[d]);
    return true;
  }

  // ───────── player ─────────
  const CASTS = new Map();
  function lookup(ref) {
    if (ref && typeof ref === 'object') return parse(ref);
    if (typeof ref !== 'string') return null;
    if (CASTS.has(ref)) return CASTS.get(ref);
    if (ref.indexOf('\n') >= 0 || ref.indexOf('\x1b') >= 0 || /^\s*\{/.test(ref)) return parse(ref);
    const A = G.assets();
    const cands = [ref, ref + '.cast', 'captures/' + ref, 'captures/' + ref + '.cast', 'captures/term/' + ref, 'captures/term/' + ref + '.cast'];
    let key = cands.find(k => typeof A[k] === 'string');
    if (!key) key = Object.keys(A).find(k => typeof A[k] === 'string' && (k.endsWith('/' + ref) || k.endsWith('/' + ref + '.cast')));
    if (!key) return null;
    const c = parse(A[key]);
    c.key = key;
    c.meta = A[key.replace(/\.cast$/, '.json')] || null;
    CASTS.set(ref, c);
    return c;
  }
  function register(name, data) { const c = parse(data); c.key = c.key || name; CASTS.set(name, c); return c; }

  class Player {
    constructor(ref, o = {}) { this.ref = ref; this.o = o; this.ok = false; this.err = null; }
    init() {
      if (this.ok || this.err) return this.ok;
      const cast = lookup(this.ref);
      if (!cast) { this.err = `cast not found: ${typeof this.ref === 'string' ? this.ref.slice(0, 80) : '(object)'}`; warnOnce('nf:' + this.ref, this.err + ' (put it under P/assets/captures/term/ or Term.register it)', true); return false; }
      const o = this.o;
      this.cast = cast;
      this.cols = o.cols || cast.cols; this.rows = o.rows || cast.rows;
      this.tl = buildTimeline(cast, o.play || {});
      this.ev = this.tl.ev;
      let spec = o.theme;
      if (spec === 'cast') { spec = castTheme(cast); if (!spec) warnOnce('casttheme:' + this.ref, `cast ${cast.key || ''} carries no theme; using the style theme`); }
      this.T = theme(spec, o.style);
      this.res = o.res ?? 2;
      this.fontSize = o.fontSize ?? 15;
      this.lineHeight = o.lineHeight ?? 1.32;
      this.weight = o.weight ?? 400; this.boldWeight = o.boldWeight ?? 700;
      this.family = o.font || fam('mono');
      const ch = o.chrome === undefined ? 'mac' : o.chrome;
      this.chrome = typeof ch === 'string' ? { kind: ch } : { kind: 'mac', ...(ch || { kind: 'none' }) };
      if (ch === false || ch === null) this.chrome = { kind: 'none' };
      this.radius = o.radius ?? 14;
      this.pad = o.pad ?? [22, 16];
      this.smooth = o.smoothScroll ?? 0.12;
      this.cursorOpt = { blink: 0.53, shape: null, ...(o.cursor || {}) };
      // emulate once, keeping checkpoints and scroll stats
      this.styles = new Styles();
      const vt = new VT(this.cols, this.rows, { styles: this.styles, scrollback: o.scrollback ?? 1500 });
      this.ck = [{ i: -1, vt: vt.clone() }];
      const n = this.ev.length;
      this.scr = new Int32Array(n); this.alt = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        const e = this.ev[i];
        if (e.r) vt.resize(e.r[0], e.r[1]); else vt.write(e.d);
        this.scr[i] = vt.scrolled; this.alt[i] = vt.altSave ? 1 : 0;
        if ((i + 1) % 48 === 0) this.ck.push({ i, vt: vt.clone() });
      }
      this.final = vt;
      this.work = { i: n - 1, vt, own: false };
      this.metrics();
      this.ok = true;
      return true;
    }
    get end() { this.init(); return this.ok ? this.tl.end : 0; }
    get start() { this.init(); return this.ok ? this.tl.at : 0; }
    get duration() { return this.end - this.start; }
    get speed() { this.init(); return this.ok ? this.tl.speed : 1; }
    get typed() { this.init(); return this.ok ? this.tl.typed : []; }
    // index of the last event at or before t
    idx(t) { let lo = 0, hi = this.ev.length - 1, r = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (this.ev[m].t <= t + 1e-9) { r = m; lo = m + 1; } else hi = m - 1; } return r; }
    vtAt(t) {
      const i = this.idx(t), w = this.work;
      if (i === w.i) return { vt: w.vt, i };
      if (w.own && i > w.i && i - w.i < 400) {
        for (let k = w.i + 1; k <= i; k++) { const e = this.ev[k]; if (e.r) w.vt.resize(e.r[0], e.r[1]); else w.vt.write(e.d); }
        w.i = i; return { vt: w.vt, i };
      }
      let lo = 0, hi = this.ck.length - 1, c = 0;
      while (lo <= hi) { const m = (lo + hi) >> 1; if (this.ck[m].i <= i) { c = m; lo = m + 1; } else hi = m - 1; }
      const vt = this.ck[c].vt.clone();
      for (let k = this.ck[c].i + 1; k <= i; k++) { const e = this.ev[k]; if (e.r) vt.resize(e.r[0], e.r[1]); else vt.write(e.d); }
      this.work = { i, vt, own: true };
      return { vt, i };
    }
    // fractional view top (absolute line) with smooth scrolling
    viewTop(t, vt, i) {
      let top = vt.scrolled;
      if (this.smooth > 0 && i >= 0 && !this.alt[i]) {
        let lag = 0;
        for (let j = i; j >= 0; j--) {
          const dt = t - this.ev[j].t;
          if (dt >= this.smooth) break;
          const n = this.scr[j] - (j ? this.scr[j - 1] : 0);
          if (n > 0) lag += n * (1 - E.outC(clamp(dt / this.smooth)));
        }
        top -= Math.min(lag, vt.sb.length);
      }
      if (this.o.scroll) top -= Math.max(0, typeof this.o.scroll === 'function' ? this.o.scroll(t) : this.o.scroll);
      return Math.max(vt.firstAbs, top);
    }
    cursorAt(t, vt, i) {
      if (!vt.cursorOn) return { on: false };
      const last = i >= 0 ? this.ev[i].t : this.tl.at;
      const since = t - last, b = this.cursorOpt.blink;
      const on = since < 0.5 || !b || Math.floor((since - 0.5) / b) % 2 === 1;
      return { on, x: vt.cx, y: vt.cy, shape: this.cursorOpt.shape || vt.cursorShape || 'block' };
    }
    metrics() {
      const c = document.createElement('canvas'); c.width = c.height = 8;
      const g = c.getContext('2d');
      const r = this.res, fs = this.fontSize * r;
      g.font = `${this.weight} ${fs}px ${this.family}`;
      const cellW = g.measureText('M'.repeat(64)).width / 64;
      const lineH = Math.round(fs * this.lineHeight);
      const m = g.measureText('Mg│█');
      const asc = m.fontBoundingBoxAscent || fs * 0.8, desc = m.fontBoundingBoxDescent || fs * 0.2;
      const padX = Math.round(this.pad[0] * r), padY = Math.round(this.pad[1] * r);
      const bar = this.chrome.kind === 'none' ? 0 : Math.round((this.chrome.height ?? Math.max(30, this.fontSize * 2.3)) * r);
      const gw = Math.ceil(this.cols * cellW), gh = this.rows * lineH;
      this.M = { fs, cellW, lineH, base: Math.round((lineH - (asc + desc)) / 2 + asc), padX, padY, bar, gx: padX, gy: bar + padY, gw, gh, w: gw + padX * 2, h: bar + gh + padY * 2 };
      this.size = [this.M.w / r, this.M.h / r];
      this.base = document.createElement('canvas'); this.base.width = this.M.w; this.base.height = this.M.h;
      this.bkey = null; this.fontCache = new Map();
    }
    fgOf(st) {
      const T = this.T;
      let c = st.v ? st.bg : st.fg;
      if (c === -1) return st.v ? T.bg : T.fg;
      if (c >= 0x1000000) return '#' + (c & 0xffffff).toString(16).padStart(6, '0');
      if (!st.v && st.b && T.boldBright && c < 8) c += 8;
      return T.pal[c];
    }
    bgOf(st) {
      const T = this.T;
      const c = st.v ? st.fg : st.bg;
      if (c === -1) return st.v ? T.fg : null;
      if (c >= 0x1000000) return '#' + (c & 0xffffff).toString(16).padStart(6, '0');
      return T.pal[c];
    }
    fontOf(st) { return `${st.i ? 'italic ' : ''}${st.b ? this.boldWeight : this.weight} ${this.M.fs}px ${this.family}`; }
    title(vt) { return this.chrome.title ?? this.o.title ?? (vt.title || this.cast.title || (this.cast.segments[0] && this.cast.segments[0].cmd) || this.cast.command || ''); }
    drawBase(vt, top, cur) {
      const M = this.M, T = this.T, r = this.res, g = this.base.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      g.clearRect(0, 0, M.w, M.h);
      g.save();
      g.beginPath(); g.roundRect(0, 0, M.w, M.h, this.radius * r); g.clip();
      g.fillStyle = T.bg; g.fillRect(0, 0, M.w, M.h);
      if (M.bar) {
        g.fillStyle = T.titleBar; g.fillRect(0, 0, M.w, M.bar);
        g.fillStyle = T.border; g.fillRect(0, M.bar - Math.max(1, r), M.w, Math.max(1, r));
        const kind = this.chrome.kind, cy = M.bar / 2;
        let tx = M.w / 2, align = 'center';
        if (kind === 'mac') {
          const lr = M.bar * 0.13, sp = M.bar * 0.42, x0 = M.bar * 0.5;
          const cols = this.chrome.lights === 'mono' ? [T.border, T.border, T.border] : ['#ff5f57', '#febc2e', '#28c840'];
          cols.forEach((c, k) => { g.beginPath(); g.arc(x0 + k * sp, cy, lr, 0, TAU); g.fillStyle = c; g.fill(); });
        } else { tx = M.padX; align = 'left'; }
        const title = this.title(vt);
        if (title) {
          g.font = `500 ${Math.round(M.bar * 0.36)}px ${this.chrome.font || fam('sans')}`;
          g.fillStyle = T.titleFg; g.textAlign = align; g.textBaseline = 'middle';
          let s = title; const maxW = M.w - M.bar * 3.2;
          while (s.length > 4 && g.measureText(s).width > maxW) s = s.slice(0, -2);
          g.fillText(s === title ? s : s + '…', tx, cy + r * 0.5);
        }
      }
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.beginPath(); g.rect(M.gx, M.gy, M.gw, M.gh); g.clip();
      const L0 = Math.floor(top), L1 = Math.ceil(top + this.rows);
      for (let L = L0; L <= L1; L++) {
        const line = vt.lineAbs(L);
        if (line) this.drawLine(g, line, M.gy + (L - top) * M.lineH, line === vt.lines[vt.cy] && cur.on ? cur : null);
      }
      g.restore();
    }
    drawLine(g, l, y, cur) {
      const M = this.M, S = this.styles.list, cols = Math.min(l.c.length, this.cols), cw = M.cellW;
      const X = c => Math.round(M.gx + c * cw);
      for (let c = 0; c < cols;) {
        const bg = this.bgOf(S[l.a[c]]);
        let c2 = c + 1;
        while (c2 < cols && this.bgOf(S[l.a[c2]]) === bg) c2++;
        if (bg) { g.fillStyle = bg; g.fillRect(X(c), Math.floor(y), X(c2) - X(c), Math.ceil(M.lineH + 0.5)); }
        c = c2;
      }
      let font = '';
      const lw = Math.max(1, this.res * 1.05);
      const a0 = g.globalAlpha;
      for (let c = 0; c < cols; c++) {
        const ch = l.c[c];
        const isCur = cur && c === cur.x;
        if (isCur && cur.shape === 'block') { g.globalAlpha = a0; g.fillStyle = this.T.cursor; g.fillRect(X(c), Math.floor(y), Math.max(X(c + 1) - X(c), 1), Math.ceil(M.lineH)); }
        if (!ch || ch === ' ') continue;
        const st = S[l.a[c]];
        if (st.h) continue;
        const wide = c + 1 < cols && l.c[c + 1] === '';
        const x = M.gx + c * cw, w = (wide ? 2 : 1) * cw;
        const fg = isCur && cur.shape === 'block' ? this.T.cursorText : this.fgOf(st);
        g.globalAlpha = st.d ? a0 * 0.55 : a0;
        // shape glyphs on whole texture pixels so neighbouring cells meet without seams (bars, frames)
        const sx0 = X(c), sx1 = X(c + (wide ? 2 : 1)), sy0 = Math.round(y), sy1 = Math.round(y + M.lineH);
        if (!drawSpecial(g, ch, sx0, sy0, sx1 - sx0, sy1 - sy0, fg, lw)) {
          const f = this.fontOf(st);
          if (f !== font) { g.font = f; font = f; }
          g.fillStyle = fg;
          const cp = ch.codePointAt(0);
          if (cp < 0x80 && ch.length === 1 && !wide) g.fillText(ch, x, y + M.base);
          else {
            const key = f + '|' + ch;
            let mw = this.fontCache.get(key);
            if (mw === undefined) { mw = g.measureText(ch).width; this.fontCache.set(key, mw); }
            if (mw > w * 1.02) { g.save(); g.translate(x, y + M.base); g.scale(w / mw, 1); g.fillText(ch, 0, 0); g.restore(); g.font = font; }
            else g.fillText(ch, x + (w - mw) / 2, y + M.base);
          }
        }
        g.globalAlpha = a0;
        if (st.u || st.s || st.o) {
          g.fillStyle = this.fgOf(st);
          const th = Math.max(1, Math.round(this.res));
          if (st.u) g.fillRect(x, Math.round(y + M.base + th * 2), w, th);
          if (st.s) g.fillRect(x, Math.round(y + M.lineH * 0.52), w, th);
          if (st.o) g.fillRect(x, Math.round(y + th), w, th);
        }
      }
      if (cur && cur.shape !== 'block') {
        g.fillStyle = this.T.cursor;
        const th = Math.max(2, Math.round(this.res * 1.6));
        if (cur.shape === 'bar') g.fillRect(X(cur.x), Math.floor(y), th, Math.ceil(M.lineH));
        else g.fillRect(X(cur.x), Math.round(y + M.lineH - th), Math.round(cw), th);
      }
      if (cur && cur.shape === 'block' && cur.x >= cols) { g.fillStyle = this.T.cursor; g.fillRect(X(cur.x), Math.floor(y), Math.round(cw), Math.ceil(M.lineH)); }
    }
    // texture canvas for scene time t (texture px = panel px * res). o.highlight: see highlight()
    texture(t, o = {}) {
      if (!this.init()) return this.placeholder();
      const { vt, i } = this.vtAt(t);
      const top = this.viewTop(t, vt, i);
      const cur = this.cursorAt(t, vt, i);
      const key = `${i}|${top.toFixed(3)}|${cur.on ? 1 : 0}|${vt.title}`;
      if (key !== this.bkey) { this.drawBase(vt, top, cur); this.bkey = key; }
      const hl = o.highlight;
      if (!hl || (!(hl.lines && hl.lines.length) && !hl.spot)) return this.base;
      if (!this.workC) { this.workC = document.createElement('canvas'); this.workC.width = this.M.w; this.workC.height = this.M.h; }
      const g = this.workC.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'copy';
      g.drawImage(this.base, 0, 0);
      g.globalCompositeOperation = 'source-over';
      this.highlight(g, vt, top, hl, t);
      return this.workC;
    }
    // highlight: { lines: [{line (abs) | find: RegExp, k: 0..1, color, scan: 0..1, cols: [c0, c1], bar: true}],
    //              spot: {k: 0..1, color: 'rgba(0,0,0,0.62)', lines: [abs...] (default: the highlighted lines)} }
    highlight(g, vt, top, hl, t) {
      const M = this.M, r = this.res;
      const boxes = [];
      for (const h of hl.lines || []) {
        const L = h.line ?? (h.find ? (this.find(h.find, { t }) || {}).line : undefined);
        if (L === undefined || L === null) continue;
        const b = this.texBox(L, top, h.cols, h.pad ?? 0.5, vt);
        if (b) boxes.push([b, h]);
      }
      if (hl.spot && hl.spot.k > 0.002) {
        const S = hl.spot, sel = S.lines ? S.lines.map(L => this.texBox(L, top, null, 0.5, vt)).filter(Boolean) : boxes.map(x => x[0]);
        g.save();
        g.fillStyle = S.color || (this.T.dark ? 'rgba(2,4,8,0.62)' : 'rgba(255,255,255,0.66)');
        g.globalAlpha *= clamp(S.k);
        g.beginPath(); g.rect(M.gx - M.padX, M.gy - M.padY * 0.5, M.gw + M.padX * 2, M.gh + M.padY);
        for (const b of sel) g.roundRect(b[0] - 6 * r, b[1] - 2 * r, b[2] - b[0] + 12 * r, b[3] - b[1] + 4 * r, 8 * r);
        g.fill('evenodd');
        g.restore();
      }
      for (const [b, h] of boxes) {
        const k = clamp(h.k ?? 1);
        if (k <= 0.002) continue;
        const col = h.color || this.T.cursor;
        const [x0, y0, x1, y1] = [b[0] - 6 * r, b[1] - 2 * r, b[2] + 6 * r, b[3] + 2 * r];
        g.save();
        g.globalAlpha = 0.16 * k; g.fillStyle = col; g.beginPath(); g.roundRect(x0, y0, x1 - x0, y1 - y0, 8 * r); g.fill();
        if (h.bar !== false) { g.globalAlpha = 0.95 * k; g.fillRect(x0 - 2 * r, y0 + 3 * r, 4 * r, y1 - y0 - 6 * r); }
        g.globalAlpha = 0.8 * k; g.strokeStyle = col; g.lineWidth = 1.6 * r; g.beginPath(); g.roundRect(x0, y0, x1 - x0, y1 - y0, 8 * r); g.stroke();
        const sc = h.scan;
        if (sc > 0 && sc < 1) {
          const sx = lerp(x0, x1, sc), L = 140 * r;
          const gr = g.createLinearGradient(sx - L, 0, sx, 0); gr.addColorStop(0, rgbaS(col, 0)); gr.addColorStop(1, rgbaS(col, 0.55));
          g.globalAlpha = k; g.fillStyle = gr; g.fillRect(Math.max(x0, sx - L), y0, Math.min(L, sx - x0), y1 - y0);
        }
        g.restore();
      }
    }
    // box of an absolute line in TEXTURE px at view top; cols [c0, c1) or the text extent
    texBox(L, top, cols, pad = 0.5, vt) {
      const M = this.M, line = (vt || this.final).lineAbs(L);
      const y0 = M.gy + (L - top) * M.lineH, y1 = y0 + M.lineH;
      if (y1 < M.gy - M.lineH || y0 > M.gy + M.gh + M.lineH) return null;
      let c0 = 0, c1 = this.cols;
      if (cols) [c0, c1] = cols;
      else if (line) {
        let a = 0, b = line.c.length;
        while (a < b && (line.c[a] === ' ' || line.c[a] === '')) a++;
        while (b > a && (line.c[b - 1] === ' ' || line.c[b - 1] === '')) b--;
        if (b > a) { c0 = a; c1 = b; }
      }
      return [M.gx + (c0 - pad) * M.cellW, y0, M.gx + (c1 + pad) * M.cellW, y1];
    }
    // Box of an absolute line in PANEL px (texture px / res) as shown at time t: [x0, y0, x1, y1] or null.
    box(L, t, o = {}) {
      if (!this.init()) return null;
      const { vt, i } = this.vtAt(t ?? this.end);
      const top = this.viewTop(t ?? this.end, vt, i);
      const b = this.texBox(L, top, o.cols, o.pad ?? 0.5, vt);
      return b && b.map(v => v / this.res);
    }
    // Find a line by RegExp (or string) in the buffer at time t (default: the end). Returns {line (absolute),
    // col0, col1, text, match} for the last match (o.first for the first).
    find(re, o = {}) {
      if (!this.init()) return null;
      const rx = typeof re === 'string' ? new RegExp(re.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) : re;
      const vt = o.t === undefined ? this.final : this.vtAt(o.t).vt;
      const A = vt.firstAbs, B = vt.scrolled + vt.rows;
      const order = o.first ? [A, B, 1] : [B - 1, A - 1, -1];
      for (let L = order[0]; L !== order[1]; L += order[2]) {
        const { s, col } = VT.text(vt.lineAbs(L));
        const m = rx.exec(s);
        if (m) { const c0 = col[m.index] ?? 0, c1 = (col[m.index + m[0].length - 1] ?? c0) + 1; return { line: L, col0: c0, col1: c1, text: s.replace(/\s+$/, ''), match: m }; }
      }
      return null;
    }
    // Lines to scroll back at time t so absolute line L sits `margin` rows inside the view (0 if visible).
    // Use with the `scroll` option (a function of t), e.g. scroll: t => k(t) * P.scrollNeeded(L, tKey).
    scrollNeeded(L, t, margin = 2) {
      if (!this.init()) return 0;
      const { vt } = this.vtAt(t ?? this.end);
      return Math.max(0, vt.scrolled + margin - L);
    }
    // Scene time when `re` first appears anywhere on screen (or null). Binary search over events.
    when(re) {
      if (!this.init()) return null;
      const rx = typeof re === 'string' ? new RegExp(re.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) : re;
      const has = i => { if (i < 0) return false; const { vt } = this.vtAt(this.ev[i].t); for (let L = vt.firstAbs; L < vt.scrolled + vt.rows; L++) if (rx.test(VT.text(vt.lineAbs(L)).s)) return true; return false; };
      let lo = 0, hi = this.ev.length - 1, r = -1;
      if (!has(hi)) return null;
      while (lo <= hi) { const m = (lo + hi) >> 1; if (has(m)) { r = m; hi = m - 1; } else lo = m + 1; }
      return r >= 0 ? this.ev[r].t : null;
    }
    // visible text at t (QA), and the timeline of typed characters / enters (SFX cue candidates)
    text(t) { if (!this.init()) return ''; return this.vtAt(t ?? this.end).vt.screenText(); }
    cues() { if (!this.init()) return []; return this.ev.filter(e => e.typed || e.enter).map(e => ({ t: e.t, kind: e.enter ? 'enter' : 'key' })); }
    // last output activity before t (seconds since), e.g. for pulses when lines arrive
    since(t) { if (!this.init()) return Infinity; const i = this.idx(t); return i < 0 ? Infinity : t - this.ev[i].t; }
    progress(t) { if (!this.init()) return 0; return clamp((t - this.tl.at) / Math.max(1e-3, this.tl.end - this.tl.at)); }
    // Draw the window in 3D with quad.js: pose (see Quad.poseMap), o: {highlight, shadow, glow, reflection, sheen,
    // alpha, border}. Returns Quad.drawPanel's result ({map, quad, rect(b)}) or null.
    draw(ctx, t, pose, o = {}) {
      const tex = this.texture(t, o);
      const Q = root.Quad;
      const size = this.size || [tex.width / (this.res || 1), tex.height / (this.res || 1)];
      if (!Q) { this.drawFlat(ctx, t, (pose.x ?? 960) - size[0] * (pose.s ?? 1) / 2, (pose.y ?? 540) - size[1] * (pose.s ?? 1) / 2, { ...o, scale: pose.s ?? 1 }); return null; }
      return Q.drawPanel(ctx, tex, pose, {
        res: this.res || 1, size, radius: this.radius, clip: false, opaque: true,
        shadow: o.shadow === undefined ? { color: this.T && !this.T.dark ? 'rgba(20,24,40,0.28)' : 'rgba(0,0,0,0.6)', blur: 60, y: 28 } : o.shadow,
        glow: o.glow, reflection: o.reflection, sheen: o.sheen, alpha: o.alpha, border: o.border === undefined ? { color: this.T ? rgbaS(this.T.fg, 0.14) : 'rgba(255,255,255,0.14)', width: 1 } : o.border,
        tol: o.tol, filter: o.filter,
      });
    }
    drawFlat(ctx, t, x, y, o = {}) {
      const tex = this.texture(t, o), s = o.scale ?? 1;
      const size = this.size || [tex.width, tex.height];
      ctx.save();
      if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
      if (o.shadow !== null) { ctx.shadowColor = (o.shadow && o.shadow.color) || 'rgba(0,0,0,0.5)'; ctx.shadowBlur = (o.shadow && o.shadow.blur) ?? 50; ctx.shadowOffsetY = (o.shadow && o.shadow.y) ?? 22; }
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(tex, x, y, size[0] * s, size[1] * s);
      ctx.restore();
      return { x, y, w: size[0] * s, h: size[1] * s, s };
    }
    // Pose for zoom-to-line: k 0 -> base pose, 1 -> line box centred and `width` px wide (o: x, y, width, maxH,
    // keep (fraction of the base tilt kept, 0.35), ease). box: panel-px box from this.box().
    zoomPose(base, box, k, o = {}) {
      const Q = root.Quad;
      if (!Q || !box) return base;
      const size = this.size;
      const ax = (box[0] + box[2]) / 2, ay = (box[1] + box[3]) / 2;
      const from = Q.reanchor(base, size, ax, ay);
      const to = Q.focusPose(base, size, box, o);
      return Q.lerpPose(from, to, (o.ease || E.ioC)(clamp(k)));
    }
    placeholder() {
      if (!this._ph) {
        const c = document.createElement('canvas'); c.width = 900; c.height = 300;
        const g = c.getContext('2d');
        g.fillStyle = '#1b1b1f'; g.beginPath(); g.roundRect(0, 0, 900, 300, 18); g.fill();
        g.fillStyle = '#ff6b6b'; g.font = `600 26px ${fam('mono')}`; g.fillText('term.js: ' + (this.err || 'no cast'), 36, 160);
        this._ph = c; this.size = this.size || [900, 300]; this.res = this.res || 1;
      }
      return this._ph;
    }
  }

  // memoized players: Term.get(ref, opts) inside draw() returns the same player while opts are equal
  const MEMO = new Map();
  function get(ref, o = {}) {
    const key = (typeof ref === 'string' ? ref : 'obj') + '|' + JSON.stringify(o, (k, v) => (v instanceof RegExp ? String(v) : typeof v === 'function' ? String(v) : v));
    let p = MEMO.get(key);
    if (!p) { p = new Player(ref, o); MEMO.set(key, p); }
    return p;
  }
  // play options for an elastic scene: start `lead` s after the scene starts (default: half the in-phase), finish
  // with `hold` s of readable final screen before the out-phase (default one bar).
  function fitEnv(env, o = {}) {
    const at = o.at ?? (o.lead ?? Math.min(0.6, (env.inSec || 0.4) * 0.5));
    const hold = o.hold ?? (env.barSec || 2);
    const end = Math.max(at + 0.4, (env.dur || 4) - (env.outSec || 0) - hold);
    return { at, fit: end, fitMode: o.fitMode || 'max', idleLimit: o.idleLimit ?? 0.6, typing: o.typing, speed: o.speed, stream: o.stream, elide: o.elide };
  }

  // ───────── CC-statusline grammar helpers ─────────
  const GLITCH_GLYPHS = '#%&@$<>/\\=+*?01';
  // One giant command word that decodes from glyph noise (p 0 -> 1). o: {size, weight, font, color, align, t
  // (scene time, drives the noise at 30 fps), rgb (0..1 split amount, default 1 - p), seed, track (px)}.
  function giantWord(ctx, word, x, y, p, o = {}) {
    if (p <= 0) return 0;
    const size = o.size ?? 220, weight = o.weight ?? 900, family = o.font || fam('display'), track = o.track ?? -size * 0.02;
    const chars = [...word], n = chars.length, f = Math.floor((o.t ?? 0) * 30), seed = o.seed ?? 1;
    ctx.save();
    ctx.font = `${weight} ${size}px ${family}`;
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    const xs = []; let acc = 0;
    for (const ch of chars) { xs.push(acc); acc += ctx.measureText(ch).width + track; }
    const full = acc - track;
    const x0 = o.align === 'center' ? x - full / 2 : o.align === 'right' ? x - full : x;
    const shown = chars.map((ch, i) => {
      if (ch === ' ') return ' ';
      const r = clamp((p - (i / n) * 0.55) / 0.45);
      if (r >= 1) return ch;
      if (r <= 0) return '';
      return GLITCH_GLYPHS[Math.floor(H32(f * 7.1 + i * 3.3 + seed) * GLITCH_GLYPHS.length)];
    });
    const rgb = o.rgb ?? (1 - p);
    const put = (dx, dy, col, a) => {
      ctx.globalAlpha = a; ctx.fillStyle = col;
      shown.forEach((s, i) => { if (s && s !== ' ') { const w0 = ctx.measureText(chars[i]).width, w1 = ctx.measureText(s).width; ctx.fillText(s, x0 + xs[i] + (w0 - w1) / 2 + dx, y + dy); } });
    };
    const base = ctx.globalAlpha;
    if (rgb > 0.01) {
      ctx.globalCompositeOperation = o.blend || 'lighter';
      put(-size * 0.045 * rgb, 0, o.c1 || '#ff2f6d', base * 0.55 * rgb);
      put(size * 0.045 * rgb, size * 0.01 * rgb, o.c2 || '#2fe6ff', base * 0.55 * rgb);
      ctx.globalCompositeOperation = 'source-over';
    }
    put(0, 0, o.color || '#ffffff', base);
    ctx.restore();
    return full;
  }
  // RGB split + horizontal slice displacement of src drawn at (x, y, w, h). amt 0..1; noise at o.fps (30).
  const GL_BUF = {};
  function glitch(ctx, src, amt, t, o = {}) {
    const sw = src.width || src.naturalWidth, sh = src.height || src.naturalHeight;
    const x = o.x ?? 0, y = o.y ?? 0, w = o.w ?? sw, h = o.h ?? sh;
    if (amt <= 0.001) { ctx.drawImage(src, x, y, w, h); return; }
    const f = Math.floor(t * (o.fps ?? 30)), seed = o.seed ?? 3;
    const chan = (key, color) => {
      let b = GL_BUF[key];
      if (!b) { b = GL_BUF[key] = document.createElement('canvas'); }
      if (b.width !== sw || b.height !== sh) { b.width = sw; b.height = sh; }
      const g = b.getContext('2d');
      g.globalCompositeOperation = 'copy'; g.drawImage(src, 0, 0);
      g.globalCompositeOperation = 'multiply'; g.fillStyle = color; g.fillRect(0, 0, sw, sh);
      g.globalCompositeOperation = 'destination-in'; g.drawImage(src, 0, 0);
      g.globalCompositeOperation = 'source-over';
      return b;
    };
    const off = (o.split ?? 18) * amt * (w / sw);
    const tmp = GL_BUF.tmp || (GL_BUF.tmp = document.createElement('canvas'));
    if (tmp.width !== ctx.canvas.width || tmp.height !== ctx.canvas.height) { tmp.width = ctx.canvas.width; tmp.height = ctx.canvas.height; }
    const tg = tmp.getContext('2d');
    tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, tmp.width, tmp.height);
    tg.setTransform(ctx.getTransform());
    tg.globalCompositeOperation = 'lighter';
    tg.drawImage(chan('r', '#ff0000'), x + off, y, w, h);
    tg.drawImage(chan('gb', '#00ffff'), x - off * 0.6, y, w, h);
    tg.globalCompositeOperation = 'source-over';
    const n = Math.floor(3 + amt * 9);
    for (let i = 0; i < n; i++) {
      const sy = Math.floor(H32(i * 3.1 + f * 0.37 + seed) * sh), shh = Math.max(2, Math.floor((0.01 + H32(i + f * 1.7 + seed) * 0.08 * amt) * sh));
      const dx = (H32(i * 7.7 + f * 0.11 + seed) - 0.5) * 0.18 * amt * w;
      tg.clearRect(x, y + (sy * h) / sh, w, (shh * h) / sh);
      tg.drawImage(src, 0, sy, sw, shh, x + dx, y + (sy * h) / sh, w, (shh * h) / sh);
    }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(tmp, 0, 0); ctx.restore();
  }
  // Drifting dot grid (CC-statusline backdrop). o: {step 34, size 2, color, a 0.13, drift [9, 4] px/s}
  function dotGrid(ctx, t, o = {}) {
    const step = o.step ?? 34, sz = o.size ?? 2, a = o.a ?? 0.13;
    const Wc = ctx.canvas.width, Hc = ctx.canvas.height;
    const [dx, dy] = o.drift || [9, 4];
    const ox = (((t * dx) % step) + step) % step, oy = (((t * dy) % step) + step) % step;
    const cx = Wc / 2, cy = Hc / 2, R = Math.hypot(cx, cy);
    ctx.save();
    ctx.fillStyle = o.color || (G.palette() && G.palette().ink) || '#8fa6ff';
    for (let y = -step; y < Hc + step; y += step) for (let x = -step; x < Wc + step; x += step) {
      const xx = x + ox, yy = y + oy, d = Math.hypot(xx - cx, yy - cy) / R;
      ctx.globalAlpha = a * (1 - d * 0.75);
      ctx.fillRect(xx, yy, sz, sz);
    }
    ctx.restore();
  }

  const Term = { parse, register, lookup, get, castTheme, player: (ref, o) => new Player(ref, o), fitEnv, theme, themeFromStyle, THEMES, VT, Styles, buildTimeline, cwidth, giantWord, glitch, dotGrid, drawSpecial, contrast: contrastOf, oklch };
  root.Term = Term;
  // runtime hook: pre-parse every .cast asset before the reel is marked ready
  if (root.REEL_MODULES) root.REEL_MODULES.push({ name: 'term', load: async () => { const A = G.assets(); for (const k of Object.keys(A)) if (/\.cast$/.test(k) && typeof A[k] === 'string') lookup(k); } });
})(typeof window !== 'undefined' ? window : globalThis);
