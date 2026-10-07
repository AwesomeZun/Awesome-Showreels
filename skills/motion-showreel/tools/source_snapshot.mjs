#!/usr/bin/env node
// source_snapshot.mjs — render source material to PNG snapshots + JSON sidecars for tone & manner analysis.
//
// Inputs: http(s) URLs (websites, GitHub repo pages), local .html/.htm files, local .md/.markdown files.
// PDFs and slide decks are rasterized by extract_style.py (PyMuPDF / pdftoppm / soffice), not here.
//
// Usage:
//   node source_snapshot.mjs [options] <url|file.html|file.md> ...
//     --out DIR          output directory (default ./snapshots); writes DIR/index.json + PNGs
//     --schemes S        auto (default) | light | dark | light,dark
//                        auto = light always, plus dark when the page reacts to prefers-color-scheme
//                        or to a common dark-mode toggle (class/data attribute)
//     --width N          viewport width in CSS px (default 1280)
//     --height N         viewport height in CSS px (default 800)
//     --scale N          deviceScaleFactor (default 1)
//     --full-max N       max full-page screenshot height in CSS px (default 4000; 0 = viewport only)
//     --wait MS          settle time after load (default 700)
//     --timeout MS       navigation timeout (default 30000)
//     --offline          block every request that is not a local file (URL inputs are skipped)
//   One-shot screenshot of a local page (used for the style board):
//     node source_snapshot.mjs --page board.html --png board.png [--size 1920x1080] [--scale 1]
//
// Chromium: env CHROME_PATH, else playwright-core's chromium.executablePath() when installed, else any
// Playwright-cached Chromium (newest first), else common Chrome/Chromium/Edge locations (macOS/Linux/Windows).
// playwright-core is resolved from: this folder upward, <skill>/runtime, the current directory, env
// SHOWREEL_MODULES (a folder containing node_modules), and the global npm root.
//
// index.json (paths relative to DIR; "input" is the URL, or the file relative to the current folder, else its base
// name; "n" is the input's position on the command line):
// {"tool":"source_snapshot","version":1,"browser":"...","items":[{
//    "input","n","type":"url|html|markdown","slug","ok","error"?,"renderer":"page|markdown-neutral",
//    "rendererColors"?: {"light":[hex...],"dark":[hex...]},   // neutral markdown stylesheet colours (not evidence)
//    "title","lang","meta":{...},"darkSupport":"media|toggle|none|forced",
//    "text","headings":[{"level","text"}],"images":[{"src","alt","w","h","nw","nh"}],"links":[...],
//    "fontFaces":[{"family","weight","style","status"}],"cssFiles":["<slug>-css-01.css",...],
//    "schemes":{"light"|"dark":{"shot","full"?,"readme"?,"bodyBg":[r,g,b,a],
//        "computed":{role:{color,bg,fontFamily,fontSize,fontWeight,letterSpacing,lineHeight,textTransform,
//                           borderRadius,borderColor,shadow,tag}},
//        "vars":{"--name":{"value","rgba"?}},"platformFonts":{role:[{"familyName","glyphCount","isCustomFont"}]},
//        "themeColor"?: "..."}}}]}

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL = path.resolve(HERE, '..');
const HOST = 'source.local';

// ───────────────────────── playwright + chromium discovery ─────────────────────────
async function loadChromium() {
  const bases = [path.join(HERE, 'x.js'), path.join(SKILL, 'runtime', 'x.js'), path.join(process.cwd(), 'x.js')];
  const env = process.env.SHOWREEL_MODULES;
  if (env) bases.push(path.join(path.basename(env) === 'node_modules' ? path.dirname(env) : env, 'x.js'));
  try { bases.push(path.join(execFileSync('npm', ['root', '-g'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(), 'x.js')); } catch {}
  for (const base of bases) {
    for (const name of ['playwright-core', 'playwright']) {
      try {
        const p = createRequire(base).resolve(name);
        const mod = await import(pathToFileURL(p).href);
        const chromium = mod.chromium || (mod.default && mod.default.chromium);
        if (chromium) return chromium;
      } catch {}
    }
  }
  throw new Error('playwright-core not found. Install it, e.g. `npm install --prefix <skill>/runtime playwright-core`, or set SHOWREEL_MODULES.');
}

export function findChrome(chromium) {
  const c = [];
  if (process.env.CHROME_PATH) c.push(process.env.CHROME_PATH);
  try { if (chromium) c.push(chromium.executablePath()); } catch {}
  const home = os.homedir();
  const caches = [process.env.PLAYWRIGHT_BROWSERS_PATH, path.join(home, 'Library/Caches/ms-playwright'), path.join(home, '.cache/ms-playwright'),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'ms-playwright')].filter(Boolean);
  const rels = ['chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
    'chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
    'chrome-mac/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
    'chrome-linux64/chrome', 'chrome-linux/chrome', 'chrome-win64/chrome.exe', 'chrome-win/chrome.exe',
    'chrome-headless-shell-mac-arm64/chrome-headless-shell', 'chrome-headless-shell-mac-x64/chrome-headless-shell',
    'chrome-headless-shell-linux64/chrome-headless-shell', 'chrome-headless-shell-win64/chrome-headless-shell.exe'];
  for (const dir of caches) {
    let ds = [];
    try { ds = fs.readdirSync(dir).filter(d => /^chromium(_headless_shell)?-\d+$/.test(d)); } catch { continue; }
    ds.sort((a, b) => Number(b.split('-').pop()) - Number(a.split('-').pop()) || Number(a.includes('headless')) - Number(b.includes('headless')));
    for (const d of ds) for (const r of rels) c.push(path.join(dir, d, r));
  }
  c.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser', path.join(home, 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium', '/usr/bin/microsoft-edge');
  for (const v of [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean)) {
    c.push(path.join(v, 'Google/Chrome/Application/chrome.exe'), path.join(v, 'Microsoft/Edge/Application/msedge.exe'), path.join(v, 'Chromium/Application/chrome.exe'));
  }
  return c.find(p => { try { return p && fs.statSync(p).isFile(); } catch { return false; } }) || null;
}

async function launch() {
  const chromium = await loadChromium();
  const executablePath = findChrome(chromium);
  if (!executablePath) throw new Error('No Chromium found. Set CHROME_PATH or run `npx playwright install chromium`.');
  return chromium.launch({ executablePath, headless: true, args: ['--force-color-profile=srgb', '--hide-scrollbars', '--font-render-hinting=none'] });
}

// ───────────────────────── helpers ─────────────────────────
const MIME = { '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.bmp': 'image/bmp', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.mp4': 'video/mp4', '.webm': 'video/webm' };
const mimeOf = p => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = s => esc(s).replace(/"/g, '&quot;');
const isUrl = s => /^https?:\/\//i.test(s);

function slugOf(input) {
  let base = isUrl(input) ? input.replace(/^https?:\/\//i, '').replace(/[?#].*$/, '') : path.basename(input).replace(/\.[^.]+$/, '');
  base = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'page';
  return `${base}-${crypto.createHash('sha1').update(input).digest('hex').slice(0, 6)}`;
}

// Deny secrets even when a page asks for them.
const SECRET = /(^|[\\/])(\.env[^\\/]*|\.git|\.ssh|id_rsa[^\\/]*|id_ed25519[^\\/]*|[^\\/]*\.pem|[^\\/]*\.key|\.npmrc|\.netrc|credentials[^\\/]*)([\\/]|$)/i;

function findRoot(file) {
  // Serve from the repository root when the file lives in one (README images often point to ../assets);
  // otherwise from the file's own folder.
  let d = path.dirname(path.resolve(file));
  for (let i = 0; i < 4; i++) {
    if (fs.existsSync(path.join(d, '.git')) || (i > 0 && fs.existsSync(path.join(d, 'package.json')))) return d;
    const up = path.dirname(d);
    if (up === d) break;
    d = up;
  }
  return path.dirname(path.resolve(file));
}

// ───────────────────────── minimal GitHub-flavoured markdown renderer ─────────────────────────
const EMOJI = { rocket: '🚀', sparkles: '✨', tada: '🎉', fire: '🔥', heart: '❤️', star: '⭐', star2: '🌟', zap: '⚡', white_check_mark: '✅',
  heavy_check_mark: '✔️', x: '❌', warning: '⚠️', bulb: '💡', package: '📦', wrench: '🔧', hammer: '🔨', gear: '⚙️', art: '🎨', bug: '🐛',
  books: '📚', book: '📖', memo: '📝', pencil2: '✏️', lock: '🔒', key: '🔑', cat: '🐱', dog: '🐶', rabbit: '🐰', rabbit2: '🐇', cherry_blossom: '🌸',
  rainbow: '🌈', balloon: '🎈', gift: '🎁', cake: '🍰', coffee: '☕', computer: '💻', robot: '🤖', brain: '🧠', chart_with_upwards_trend: '📈',
  bar_chart: '📊', mag: '🔍', link: '🔗', globe_with_meridians: '🌐', sunny: '☀️', crescent_moon: '🌙', ghost: '👻', eyes: '👀', wave: '👋',
  clap: '👏', raised_hands: '🙌', pray: '🙏', '+1': '👍', thumbsup: '👍', ok_hand: '👌', smile: '😄', smiley: '😃', grin: '😁', joy: '😂',
  heart_eyes: '😍', sunglasses: '😎', thinking: '🤔', boom: '💥', muscle: '💪', '100': '💯', construction: '🚧', hourglass: '⌛', calendar: '📅',
  bell: '🔔', mega: '📣', trophy: '🏆', crown: '👑', gem: '💎', shield: '🛡️', test_tube: '🧪', microscope: '🔬', dna: '🧬', seedling: '🌱',
  herb: '🌿', sparkling_heart: '💖', two_hearts: '💕', purple_heart: '💜', blue_heart: '💙', green_heart: '💚', yellow_heart: '💛', unicorn: '🦄',
  penguin: '🐧', snake: '🐍', crab: '🦀', whale: '🐳', octopus: '🐙', butterfly: '🦋', honeybee: '🐝', turtle: '🐢', panda_face: '🐼', bear: '🐻',
  hatching_chick: '🐣', star_struck: '🤩', partying_face: '🥳', hugs: '🤗', wink: '😉', blush: '😊', point_right: '👉', point_down: '👇',
  arrow_right: '➡️', new: '🆕', recycle: '♻️', battery: '🔋', satellite: '📡', telescope: '🔭', hammer_and_wrench: '🛠️', magic_wand: '🪄',
  crystal_ball: '🔮', video_game: '🎮', musical_note: '🎵', headphones: '🎧', camera: '📷', clapper: '🎬', lipstick: '💄', ribbon: '🎀',
  bouquet: '💐', tulip: '🌷', hibiscus: '🌺', sunflower: '🌻', strawberry: '🍓', peach: '🍑', candy: '🍬', lollipop: '🍭', doughnut: '🍩',
  cookie: '🍪', ice_cream: '🍨', bubble_tea: '🧋', cloud: '☁️', snowflake: '❄️', umbrella: '☂️', earth_asia: '🌏', sparkle: '❇️' };

function renderMarkdown(src, defs = null) {
  src = String(src).replace(/\r\n?/g, '\n').replace(/^\uFEFF/, '');
  if (!defs) {
    defs = {};
    src = src.replace(/^---\n[\s\S]*?\n---\n/, '');
    src = src.replace(/^ {0,3}\[([^\]]+)\]:\s*<?(\S+?)>?(?:\s+["'(][^\n]*)?\s*$/gm, (_, k, u) => { defs[k.toLowerCase()] = u; return ''; });
  }
  const lines = src.split('\n');
  const out = [];
  const blank = l => /^\s*$/.test(l);
  const startsBlock = l => /^\s{0,3}(#{1,6}\s|```|~~~|>|[-*+]\s|\d+[.)]\s|<[a-zA-Z/!])/.test(l);
  let i = 0, m;
  while (i < lines.length) {
    const line = lines[i];
    if ((m = line.match(/^\s{0,3}(```+|~~~+)\s*([\w+#.-]*)/))) {
      const fence = m[1], lang = m[2], buf = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence)) buf.push(lines[i++]);
      i++;
      out.push(`<pre><code class="language-${attr(lang)}">${esc(buf.join('\n'))}</code></pre>`);
      continue;
    }
    if (blank(line)) { i++; continue; }
    if ((m = line.match(/^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/))) { out.push(`<h${m[1].length}>${inline(m[2], defs)}</h${m[1].length}>`); i++; continue; }
    if (i + 1 < lines.length && !blank(line) && /^\s{0,3}(=+|-+)\s*$/.test(lines[i + 1]) && !startsBlock(line)) {
      const lv = lines[i + 1].trim()[0] === '=' ? 1 : 2;
      out.push(`<h${lv}>${inline(line.trim(), defs)}</h${lv}>`); i += 2; continue;
    }
    if (/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(line)) { out.push('<hr>'); i++; continue; }
    if (/^\s{0,3}<(\/?[a-zA-Z][\w-]*|!--)/.test(line)) {
      const buf = [];
      while (i < lines.length && !blank(lines[i])) buf.push(lines[i++]);
      out.push(buf.join('\n'));
      continue;
    }
    if (/^\s{0,3}>/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s{0,3}>/.test(lines[i])) buf.push(lines[i++].replace(/^\s{0,3}>\s?/, ''));
      out.push(`<blockquote>${renderMarkdown(buf.join('\n'), defs)}</blockquote>`);
      continue;
    }
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)+\|?\s*$/.test(lines[i + 1])) {
      const row = l => l.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map(c => c.trim());
      const head = row(line);
      const al = row(lines[i + 1]).map(c => (c.startsWith(':') && c.endsWith(':') ? 'center' : c.endsWith(':') ? 'right' : ''));
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && !blank(lines[i])) rows.push(row(lines[i++]));
      const cell = (tag, c, k) => `<${tag}${al[k] ? ` align="${al[k]}"` : ''}>${inline(c, defs)}</${tag}>`;
      out.push(`<table><thead><tr>${head.map((c, k) => cell('th', c, k)).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, k) => cell('td', c, k)).join('')}</tr>`).join('')}</tbody></table>`);
      continue;
    }
    if ((m = line.match(/^(\s*)([-*+]|\d+[.)])\s+/))) {
      const ordered = /\d/.test(m[2]), base = m[1].length, items = [];
      let cur = null;
      while (i < lines.length) {
        const l = lines[i], mm = l.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
        if (mm && mm[1].length <= base + 1 && /\d/.test(mm[2]) === ordered) { cur = [mm[3]]; items.push(cur); i++; continue; }
        if (blank(l)) {
          const nx = lines[i + 1] || '';
          if (cur && (/^\s{2,}\S/.test(nx) || /^(\s*)([-*+]|\d+[.)])\s+/.test(nx))) { cur.push(''); i++; continue; }
          break;
        }
        if (cur && /^\s{2,}/.test(l)) { cur.push(l.replace(new RegExp(`^\\s{0,${base + 4}}`), '')); i++; continue; }
        if (cur && !startsBlock(l)) { cur.push(l); i++; continue; }
        break;
      }
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>${items.map(it => {
        let body = renderMarkdown(it.join('\n'), defs).replace(/^<p>([\s\S]*?)<\/p>/, '$1');
        body = body.replace(/^\[ \]\s*/, '☐ ').replace(/^\[[xX]\]\s*/, '☑ ');
        return `<li>${body}</li>`;
      }).join('')}</${tag}>`);
      continue;
    }
    const buf = [line];
    i++;
    while (i < lines.length && !blank(lines[i]) && !startsBlock(lines[i])) buf.push(lines[i++]);
    out.push(`<p>${inline(buf.join('\n'), defs)}</p>`);
  }
  return out.join('\n');
}

function inline(s, defs) {
  const codes = [], tags = [];
  s = s.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (_, __, c) => `\u0000${codes.push(`<code>${esc(c.trim())}</code>`) - 1}\u0000`);
  s = s.replace(/<\/?[a-zA-Z][^>]*>|<!--[\s\S]*?-->/g, t => `\u0001${tags.push(t) - 1}\u0001`);
  s = esc(s);
  const ref = (k, alt) => defs[(k || alt || '').toLowerCase()] || '';
  // link/image destinations may be wrapped in <...> (escaped to &lt;...&gt; above)
  s = s.replace(/!\[([^\]]*)\]\(\s*(?:&lt;)?([^)\s]+?)(?:&gt;)?(?:\s+&quot;[^)]*&quot;|\s+"[^"]*")?\s*\)/g, (_, alt, src) => `<img src="${attr(src)}" alt="${attr(alt)}">`);
  s = s.replace(/!\[([^\]]*)\]\[([^\]]*)\]/g, (_, alt, k) => `<img src="${attr(ref(k, alt))}" alt="${attr(alt)}">`);
  s = s.replace(/\[((?:[^\[\]]|<img[^>]*>)+)\]\(\s*(?:&lt;)?([^)\s]+?)(?:&gt;)?(?:\s+"[^"]*")?\s*\)/g, (_, t, href) => `<a href="${attr(href)}">${t}</a>`);
  s = s.replace(/\[((?:[^\[\]]|<img[^>]*>)+)\]\[([^\]]*)\]/g, (_, t, k) => `<a href="${attr(ref(k, t))}">${t}</a>`);
  s = s.replace(/&lt;(https?:\/\/[^\s&]+)&gt;/g, '<a href="$1">$1</a>');
  s = s.replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, (_, a, b) => `<strong>${a || b}</strong>`);
  s = s.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<em>$2</em>');
  s = s.replace(/(^|[^_\w])_([^_\s][^_]*?)_(?!\w)/g, '$1<em>$2</em>');
  s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  s = s.replace(/(^|[^\w:/]):([a-z0-9_+-]{1,32}):(?![\w/])/g, (mm, pre, k) => (EMOJI[k] ? pre + EMOJI[k] : mm));
  s = s.replace(/( {2,}|\\)\n/g, '<br>\n');
  s = s.replace(/\u0001(\d+)\u0001/g, (_, k) => tags[+k]).replace(/\u0000(\d+)\u0000/g, (_, k) => codes[+k]);
  return s;
}

const NEUTRAL = {
  light: { bg: '#ffffff', fg: '#1f2328', muted: '#59636e', border: '#d1d9e0', code: '#f6f8fa', link: '#0969da' },
  dark: { bg: '#0d1117', fg: '#e6edf3', muted: '#9198a1', border: '#3d444d', code: '#151b23', link: '#4493f8' },
};
function markdownPage(body, title) {
  const v = k => `--bg:${NEUTRAL[k].bg};--fg:${NEUTRAL[k].fg};--muted:${NEUTRAL[k].muted};--border:${NEUTRAL[k].border};--code:${NEUTRAL[k].code};--link:${NEUTRAL[k].link};`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="color-scheme" content="light dark"><title>${esc(title)}</title><style>
:root{${v('light')}}
@media (prefers-color-scheme: dark){:root{${v('dark')}}}
html,body{margin:0;background:var(--bg);color:var(--fg)}
body{font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji"}
.markdown-body{box-sizing:border-box;max-width:980px;margin:0 auto;padding:45px}
h1,h2,h3,h4,h5,h6{font-weight:600;line-height:1.25;margin:24px 0 16px}
h1{font-size:2em;padding-bottom:.3em;border-bottom:1px solid var(--border)}h2{font-size:1.5em;padding-bottom:.3em;border-bottom:1px solid var(--border)}h3{font-size:1.25em}
p,ul,ol,blockquote,pre,table{margin:0 0 16px}a{color:var(--link);text-decoration:none}
code{font-family:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace;font-size:85%;background:var(--code);padding:.2em .4em;border-radius:6px}
pre{background:var(--code);padding:16px;border-radius:6px;overflow:auto;line-height:1.45}pre code{background:none;padding:0}
blockquote{color:var(--muted);border-left:.25em solid var(--border);padding:0 1em;margin-left:0}
table{border-collapse:collapse}td,th{border:1px solid var(--border);padding:6px 13px}img{max-width:100%;box-sizing:content-box}
hr{border:0;height:.25em;background:var(--border);margin:24px 0}
img[src$="#gh-dark-mode-only"]{display:none}
@media (prefers-color-scheme: dark){img[src$="#gh-dark-mode-only"]{display:inline}img[src$="#gh-light-mode-only"]{display:none}}
</style></head><body><article class="markdown-body">${body}</article></body></html>`;
}

// ───────────────────────── in-page collector ─────────────────────────
// Runs inside the page. Marks one element per role, returns computed styles, variables and text.
const COLLECT = ({ varNames, maxText }) => {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 1;
  const g = cv.getContext('2d', { willReadFrequently: true });
  const rgba = v => {
    if (!v) return null;
    v = String(v).trim();
    if (!v || /^(transparent|none|inherit|initial|unset|currentcolor|auto)$/i.test(v)) return null;
    if (/^\d{1,3}(\s*,\s*|\s+)\d{1,3}(\s*,\s*|\s+)\d{1,3}$/.test(v)) v = `rgb(${v.split(/[\s,]+/).join(',')})`;
    g.fillStyle = '#010203'; g.fillStyle = v; const a = g.fillStyle;
    g.fillStyle = '#030201'; g.fillStyle = v; const b = g.fillStyle;
    if (a !== b) return null;
    g.clearRect(0, 0, 1, 1); g.fillRect(0, 0, 1, 1);
    const d = g.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], Math.round((d[3] / 255) * 1000) / 1000];
  };
  const visible = el => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05;
  };
  const directText = el => [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
  const effBg = el => {
    for (let e = el; e; e = e.parentElement) {
      const c = rgba(getComputedStyle(e).backgroundColor);
      if (c && c[3] > 0.5) return c;
    }
    const darkCanvas = /dark/.test(getComputedStyle(document.documentElement).colorScheme || '') && matchMedia('(prefers-color-scheme: dark)').matches;
    return darkCanvas ? [18, 18, 18, 1] : [255, 255, 255, 1];
  };
  const pick = sels => {
    for (const s of sels) {
      for (const el of document.querySelectorAll(s)) if (visible(el) && (directText(el).length > 0 || el.tagName === 'BUTTON')) return el;
    }
    return null;
  };
  const roles = {
    body: ['main p', 'article p', '[role=main] p', 'p', 'li', 'td', 'div'],
    h1: ['h1'], h2: ['h2'], h3: ['h3'],
    link: ['main a', 'article a', 'p a', 'a'],
    button: ['button', '[role=button]', 'a.btn', 'a.button', '.btn', '.button', 'input[type=submit]', 'a[class*=button]', 'a[class*=btn]'],
    code: ['p code', 'li code', 'code', 'pre'], pre: ['pre'],
    nav: ['nav a', 'header a', 'header'], card: ['[class*=card]', '[class*=Card]', '[class*=panel]'],
  };
  const computed = {};
  for (const [role, sels] of Object.entries(roles)) {
    const el = pick(sels);
    if (!el) continue;
    el.setAttribute('data-snap-role', (el.getAttribute('data-snap-role') ? el.getAttribute('data-snap-role') + ' ' : '') + role);
    const cs = getComputedStyle(el);
    computed[role] = {
      tag: el.tagName.toLowerCase(), color: rgba(cs.color), bg: effBg(el), ownBg: rgba(cs.backgroundColor),
      fontFamily: cs.fontFamily, fontSize: parseFloat(cs.fontSize), fontWeight: cs.fontWeight, letterSpacing: cs.letterSpacing,
      lineHeight: cs.lineHeight, textTransform: cs.textTransform, borderRadius: cs.borderTopLeftRadius,
      borderColor: cs.borderTopWidth !== '0px' ? rgba(cs.borderTopColor) : null, shadow: cs.boxShadow !== 'none', bgImage: cs.backgroundImage !== 'none' ? cs.backgroundImage.slice(0, 300) : null,
    };
  }
  const rootCs = getComputedStyle(document.documentElement), bodyCs = getComputedStyle(document.body);
  const vars = {};
  let nv = 0;
  for (const name of varNames) {
    if (nv > 1500) break;
    let v = rootCs.getPropertyValue(name).trim() || bodyCs.getPropertyValue(name).trim();
    if (!v || v.length > 300) continue;
    const isFont = /["']|\b(serif|sans-serif|monospace|system-ui|ui-monospace|ui-sans-serif|ui-serif|cursive)\b/.test(v) && /font|family|mono|sans|serif|display|heading|body|text/i.test(name);
    const isRadius = /radius|rounded/i.test(name);
    const c = !isFont && !isRadius ? rgba(v) : null;
    if (c || isFont || isRadius) { vars[name] = c ? { value: v, rgba: c } : { value: v }; nv++; }
  }
  const meta = {};
  for (const m of document.querySelectorAll('meta[name],meta[property]')) {
    const k = (m.getAttribute('name') || m.getAttribute('property') || '').toLowerCase();
    if (/^(description|theme-color|color-scheme|generator|og:title|og:description|og:site_name|og:image|twitter:title|twitter:description|keywords|application-name)$/.test(k)) {
      const v = (m.getAttribute('content') || '').slice(0, 400);
      if (k === 'theme-color') (meta[k] = meta[k] || []).push({ content: v, media: m.getAttribute('media') || '', rgba: rgba(v) });
      else meta[k] = v;
    }
  }
  const headings = [...document.querySelectorAll('h1,h2,h3')].filter(visible).slice(0, 200).map(h => ({ level: +h.tagName[1], text: h.innerText.trim().slice(0, 200) }));
  const images = [...document.images].slice(0, 200).map(im => {
    const r = im.getBoundingClientRect();
    return { src: im.getAttribute('src') || '', abs: im.currentSrc || im.src || '', alt: (im.alt || '').slice(0, 200), w: Math.round(r.width), h: Math.round(r.height), nw: im.naturalWidth, nh: im.naturalHeight };
  });
  const links = [...document.querySelectorAll('a[href]')].slice(0, 300).map(a => a.getAttribute('href')).filter(h => /^https?:/i.test(h));
  let fontFaces = [];
  try { fontFaces = [...document.fonts].filter(f => f.status === 'loaded').slice(0, 60).map(f => ({ family: f.family.replace(/^["']|["']$/g, ''), weight: f.weight, style: f.style, status: f.status })); } catch {}
  const scrollH = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
  return {
    title: document.title, lang: document.documentElement.lang || '', meta, headings, images, links: [...new Set(links)].slice(0, 120), fontFaces,
    text: (document.body.innerText || '').slice(0, maxText), computed, vars, bodyBg: effBg(document.body), scrollH,
    colorScheme: rootCs.colorScheme || '', htmlClass: document.documentElement.className.toString().slice(0, 200),
    dataTheme: document.documentElement.getAttribute('data-theme') || document.documentElement.getAttribute('data-color-mode') || '',
  };
};

const DARK_TOGGLE = () => {
  const h = document.documentElement, b = document.body;
  h.classList.add('dark', 'dark-mode', 'theme-dark');
  b && b.classList.add('dark', 'dark-mode', 'theme-dark');
  h.setAttribute('data-theme', 'dark'); h.setAttribute('data-bs-theme', 'dark'); h.setAttribute('data-mode', 'dark');
  h.setAttribute('data-color-mode', 'dark'); h.setAttribute('data-dark-theme', 'dark'); h.style.colorScheme = 'dark';
};

// ───────────────────────── capture ─────────────────────────
const lum = c => {
  if (!c) return 1;
  const f = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
};

function makeRouter(target, opts) {
  return async route => {
    const req = route.request();
    let u;
    try { u = new URL(req.url()); } catch { return route.abort(); }
    if (u.hostname !== HOST) {
      if (opts.offline || req.resourceType() === 'media') return route.abort();
      return route.continue();
    }
    const rel = decodeURIComponent(u.pathname).replace(/^\/+/, '');
    if (target.virtual && target.virtual[rel] !== undefined) return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: target.virtual[rel] });
    const p = path.resolve(target.root, rel);
    if ((p !== target.root && !p.startsWith(target.root + path.sep)) || SECRET.test(path.relative(target.root, p))) return route.fulfill({ status: 403, body: 'forbidden' });
    let st = null;
    try { st = fs.statSync(p); } catch {}
    if (!st || !st.isFile()) return route.fulfill({ status: 404, body: 'not found' });
    return route.fulfill({ status: 200, path: p, contentType: mimeOf(p) });
  };
}

function prepareTarget(input) {
  if (isUrl(input)) return { url: input, type: 'url', renderer: 'page' };
  const file = path.resolve(input);
  if (!fs.existsSync(file)) throw new Error(`not found: ${input}`);
  const ext = path.extname(file).toLowerCase();
  const root = findRoot(file);
  const relDir = path.relative(root, path.dirname(file)).split(path.sep).filter(Boolean).map(encodeURIComponent).join('/');
  const prefix = relDir ? `${relDir}/` : '';
  if (ext === '.md' || ext === '.markdown' || ext === '.mdx') {
    const md = fs.readFileSync(file, 'utf8');
    const name = `${prefix}${encodeURIComponent(`__snapshot__${path.basename(file)}.html`)}`;
    return { url: `http://${HOST}/${name}`, type: 'markdown', renderer: 'markdown-neutral', root, virtual: { [decodeURIComponent(name)]: markdownPage(renderMarkdown(md), path.basename(file)) } };
  }
  if (ext === '.html' || ext === '.htm') {
    return { url: `http://${HOST}/${prefix}${encodeURIComponent(path.basename(file))}`, type: 'html', renderer: 'page', root };
  }
  throw new Error(`unsupported input (use URL, .html or .md): ${input}`);
}

async function autoScroll(page, maxH) {
  await page.evaluate(async lim => {
    const H = Math.min(document.documentElement.scrollHeight, lim || 4000);
    for (let y = 0; y < H; y += Math.round(innerHeight * 0.8)) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); }
    scrollTo(0, 0);
  }, maxH).catch(() => {});
}

async function capture(browser, target, scheme, o, { toggle = false, collectCss = false, slug, outDir, tag }) {
  const ctx = await browser.newContext({ viewport: { width: o.width, height: o.height }, deviceScaleFactor: o.scale, colorScheme: scheme, reducedMotion: 'reduce', ignoreHTTPSErrors: true });
  await ctx.route('**/*', makeRouter(target, o));
  const page = await ctx.newPage();
  const css = [];
  if (collectCss) {
    page.on('response', async r => {
      try {
        if (r.request().resourceType() !== 'stylesheet' || css.length >= 40) return;
        const t = await r.text();
        if (t && t.length < 3_000_000) css.push({ url: r.url(), text: t });
      } catch {}
    });
  }
  try {
    await page.goto(target.url, { waitUntil: 'load', timeout: o.timeout });
    await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
    await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
    if (o.fullMax > 0) await autoScroll(page, o.fullMax);
    await page.waitForTimeout(o.wait);
    if (toggle) { await page.evaluate(DARK_TOGGLE); await page.waitForTimeout(300); }
    const inlineCss = await page.evaluate(() => [...document.querySelectorAll('style')].map(s => s.textContent).join('\n').slice(0, 2_000_000)).catch(() => '');
    const allCss = css.map(c => c.text).join('\n') + '\n' + inlineCss;
    const inlineStyles = await page.evaluate(() => [...document.querySelectorAll('[style]')].slice(0, 3000).map(e => e.getAttribute('style')).join(';')).catch(() => '');
    const varNames = [...new Set((allCss + ';' + inlineStyles).match(/--[A-Za-z0-9_-]+(?=\s*:)/g) || [])].slice(0, 5000);
    const data = await page.evaluate(COLLECT, { varNames, maxText: 120000 });
    const platformFonts = {};
    try {
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
      const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
      for (const role of Object.keys(data.computed)) {
        const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: `[data-snap-role~="${role}"]` });
        if (!nodeId) continue;
        const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
        if (fonts && fonts.length) platformFonts[role] = fonts.map(f => ({ familyName: f.familyName, glyphCount: f.glyphCount, isCustomFont: f.isCustomFont }));
      }
    } catch {}
    const shot = `${slug}-${tag}.png`;
    await page.screenshot({ path: path.join(outDir, shot) });
    let full = null;
    if (o.fullMax > 0 && data.scrollH > o.height + 40) {
      full = `${slug}-${tag}-full.png`;
      const h = Math.min(data.scrollH, o.fullMax);
      await page.screenshot({ path: path.join(outDir, full), fullPage: true, clip: { x: 0, y: 0, width: o.width, height: h } });
    }
    let readme = null, github = null;
    if (target.type === 'url' && /(^|\.)github\.com$/i.test(new URL(target.url).hostname)) {
      // On GitHub only the README is the project's own material; the page chrome is GitHub's brand.
      github = await page.evaluate(() => {
        const el = document.querySelector('article.markdown-body');
        if (!el) return null;
        const canon = im => im.getAttribute('data-canonical-src') || im.currentSrc || im.src || '';
        const all = [...el.querySelectorAll('img')];
        const isBadge = s => /shields\.io|badgen|badge\.fury|forthebadge|\/badge\.svg|codecov\.io|actions\/workflows/i.test(s);
        const images = all.map(im => { const r = im.getBoundingClientRect(); return { src: im.currentSrc || im.src, canonical: canon(im), alt: (im.alt || '').slice(0, 200), w: Math.round(r.width), h: Math.round(r.height) }; })
          .filter(i => i.src && !isBadge(i.canonical)).slice(0, 40);
        return { text: (el.innerText || '').slice(0, 120000), images, badges: all.map(canon).filter(isBadge).slice(0, 40),
          headings: [...el.querySelectorAll('h1,h2,h3')].map(h => ({ level: +h.tagName[1], text: h.innerText.trim().slice(0, 200) })).slice(0, 200) };
      }).catch(() => null);
      const box = await page.evaluate(() => {
        const el = document.querySelector('article.markdown-body');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height };
      }).catch(() => null);
      if (box && box.w > 50 && box.h > 50) {
        readme = `${slug}-${tag}-readme.png`;
        await page.screenshot({ path: path.join(outDir, readme), fullPage: true, clip: { x: Math.max(0, box.x), y: Math.max(0, box.y), width: Math.min(box.w, o.width), height: Math.min(box.h, 3000) } }).catch(() => { readme = null; });
      }
    }
    return { data, css: collectCss ? css : [], inlineCss, platformFonts, shot, full, readme, github };
  } finally {
    await ctx.close().catch(() => {});
  }
}

const dist = (a, b) => (a && b ? Math.abs(lum(a) - lum(b)) : 0);

// index.json never carries absolute local paths (user names): files are recorded relative to the current folder when
// inside it, else by base name. Items keep the order of the inputs ("n"), which is how callers match them.
function shownInput(input) {
  if (isUrl(input)) return input;
  const abs = path.resolve(input), r = path.relative(process.cwd(), abs);
  return r && !r.startsWith('..') && !path.isAbsolute(r) ? r.split(path.sep).join('/') : path.basename(abs);
}
async function snapInput(browser, input, o, outDir, n = 0) {
  const slug = slugOf(input);
  const item = { input: shownInput(input), n, slug, ok: false };
  try {
    if (isUrl(input) && o.offline) throw new Error('offline: URL skipped');
    const target = prepareTarget(input);
    item.type = target.type;
    item.renderer = target.renderer;
    if (target.renderer === 'markdown-neutral') item.rendererColors = { light: Object.values(NEUTRAL.light), dark: Object.values(NEUTRAL.dark) };
    const wantLight = o.schemes.includes('light') || o.schemes.includes('auto');
    const wantDark = o.schemes.includes('dark') || o.schemes.includes('auto');
    const base = await capture(browser, target, 'light', o, { collectCss: true, slug, outDir, tag: 'light' });
    Object.assign(item, {
      title: base.data.title, lang: base.data.lang, meta: base.data.meta, text: base.data.text, headings: base.data.headings,
      images: base.data.images, links: base.data.links, fontFaces: base.data.fontFaces,
    });
    if (base.github) {
      item.github = base.github;
      item.renderer = 'github';
      item.rendererColors = { light: ['#ffffff', '#1f2328', '#59636e', '#d1d9e0', '#f6f8fa', '#0969da', '#d1d9e0b3'.slice(0, 7)],
        dark: ['#0d1117', '#f0f6fc', '#9198a1', '#3d444d', '#151b23', '#4493f8', '#262c36'] };
    }
    item.cssFiles = [];
    let k = 0, total = 0;
    for (const c of base.css) {
      if (total > 6_000_000) break;
      const f = `${slug}-css-${String(++k).padStart(2, '0')}.css`;
      fs.writeFileSync(path.join(outDir, f), `/* ${c.url.replace(/\*\//g, '')} */\n${c.text}`);
      item.cssFiles.push(f);
      total += c.text.length;
    }
    if (base.inlineCss && base.inlineCss.trim()) {
      const f = `${slug}-css-inline.css`;
      fs.writeFileSync(path.join(outDir, f), base.inlineCss);
      item.cssFiles.push(f);
    }
    const pack = r => ({ shot: r.shot, full: r.full, readme: r.readme, bodyBg: r.data.bodyBg, computed: r.data.computed, vars: r.data.vars,
      platformFonts: r.platformFonts, themeColor: r.data.meta['theme-color'] || null, colorScheme: r.data.colorScheme });
    item.schemes = {};
    const lightLum = lum(base.data.bodyBg);
    if (lightLum < 0.2) {
      // Dark by default: name the files after the scheme they show.
      for (const k of ['shot', 'full', 'readme']) {
        if (!base[k]) continue;
        const nf = base[k].replace(`${slug}-light`, `${slug}-dark`);
        fs.renameSync(path.join(outDir, base[k]), path.join(outDir, nf));
        base[k] = nf;
      }
    }
    if (wantLight || lightLum < 0.2) item.schemes[lightLum < 0.2 ? 'dark' : 'light'] = pack(base);
    item.darkSupport = 'none';
    if (wantDark && lightLum >= 0.2) {
      const dk = await capture(browser, target, 'dark', o, { slug, outDir, tag: 'dark' });
      if (dist(dk.data.bodyBg, base.data.bodyBg) > 0.25) { item.schemes.dark = pack(dk); item.darkSupport = 'media'; }
      else {
        for (const f of [dk.shot, dk.full, dk.readme]) if (f) fs.rmSync(path.join(outDir, f), { force: true });
        const tg = await capture(browser, target, 'light', o, { toggle: true, slug, outDir, tag: 'dark' });
        if (dist(tg.data.bodyBg, base.data.bodyBg) > 0.25 && lum(tg.data.bodyBg) < 0.2) { item.schemes.dark = pack(tg); item.darkSupport = 'toggle'; }
        else {
          for (const f of [tg.shot, tg.full, tg.readme]) if (f) fs.rmSync(path.join(outDir, f), { force: true });
          if (o.schemes.includes('dark')) { item.schemes.dark = pack(dk); item.darkSupport = 'forced'; }
        }
      }
    } else if (lightLum < 0.2) item.darkSupport = 'default-dark';
    item.ok = true;
  } catch (e) {
    item.error = String(e && e.message ? e.message : e).split('\n')[0].slice(0, 300);
  }
  return item;
}

// ───────────────────────── CLI ─────────────────────────
function usage(code = 0) {
  const lines = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 22).map(l => l.replace(/^\/\/ ?/, ''));
  (code ? console.error : console.log)(lines.join('\n'));
  process.exit(code);
}

function parseArgs(argv) {
  const o = { out: 'snapshots', schemes: ['auto'], width: 1280, height: 800, scale: 1, fullMax: 4000, wait: 700, timeout: 30000, offline: false, inputs: [], page: null, png: null, size: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const nx = () => { if (i + 1 >= argv.length) usage(2); return argv[++i]; };
    if (a === '--help' || a === '-h') usage(0);
    else if (a === '--out') o.out = nx();
    else if (a === '--schemes') o.schemes = nx().split(',').map(s => s.trim());
    else if (a === '--width') o.width = +nx();
    else if (a === '--height') o.height = +nx();
    else if (a === '--scale') o.scale = +nx();
    else if (a === '--full-max') o.fullMax = +nx();
    else if (a === '--wait') o.wait = +nx();
    else if (a === '--timeout') o.timeout = +nx();
    else if (a === '--offline') o.offline = true;
    else if (a === '--page') o.page = nx();
    else if (a === '--png') o.png = nx();
    else if (a === '--size') o.size = nx();
    else if (a.startsWith('--')) { console.error(`unknown option ${a}`); usage(2); }
    else o.inputs.push(a);
  }
  return o;
}

async function shootPage(o) {
  const [w, h] = (o.size || '1920x1080').split('x').map(Number);
  const file = path.resolve(o.page);
  const root = path.dirname(file);
  const target = { url: `http://${HOST}/${encodeURIComponent(path.basename(file))}`, root, type: 'html' };
  const browser = await launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: o.scale || 1, colorScheme: 'light' });
    await ctx.route('**/*', makeRouter(target, { ...o, offline: true }));
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto(target.url, { waitUntil: 'load', timeout: o.timeout });
    await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
    await page.waitForTimeout(200);
    fs.mkdirSync(path.dirname(path.resolve(o.png)), { recursive: true });
    await page.screenshot({ path: path.resolve(o.png) });
    console.log(`wrote ${o.png}${errs.length ? ` (page errors: ${errs.join('; ')})` : ''}`);
  } finally {
    await browser.close();
  }
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (o.page) {
    if (!o.png) usage(2);
    await shootPage(o);
    return;
  }
  if (!o.inputs.length) usage(2);
  const outDir = path.resolve(o.out);
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await launch();
  const index = { tool: 'source_snapshot', version: 1, browser: browser.version(), items: [] };
  try {
    for (const [n, input] of o.inputs.entries()) {
      const t0 = Date.now();
      const item = await snapInput(browser, input, o, outDir, n);
      index.items.push(item);
      fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(index, null, 1));
      const sch = item.schemes ? Object.keys(item.schemes).join('+') : '-';
      console.log(`${item.ok ? 'ok ' : 'ERR'} ${input} -> ${item.slug} [${sch}] ${item.ok ? '' : item.error} (${Date.now() - t0} ms)`);
    }
  } finally {
    await browser.close();
  }
  console.log(`index ${path.join(outDir, 'index.json')}`);
  if (!index.items.some(i => i.ok)) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(e => { console.error(`source_snapshot: ${e.message || e}`); process.exit(1); });
}

export { renderMarkdown, markdownPage, slugOf };
