#!/usr/bin/env node
// stills.mjs: render frames of a reel project to PNG (plus a labelled contact sheet), or serve a live dev player.
// Also exports the shared Node helpers used by render.mjs and build.mjs (Chromium detection, project loader,
// dev page handler, openReel).
//
//   node stills.mjs --project P --cut 30 1.0 2.5 --out DIR [--sheet] [--range a:b:step] [--scale X | --warp "o:s,..."]
//   node stills.mjs --project P --cut 30 --transitions --out DIR --sheet      # every boundary (window edges, +-1 frame)
//   node stills.mjs --project P --cut 30 --scene hook --dur 8 --range 0:8:0.5 --out DIR   # one scene alone, any length
//   node stills.mjs --html reel.html --cut 30 1.0 --out DIR                    # from a built single-file HTML
//   node stills.mjs --project P --serve [8737]                                 # live player at http://127.0.0.1:8737/
// Times are output seconds (equal to scene seconds unless --scale/--warp). Exit code 1 on console errors.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const RUNTIME = path.dirname(fileURLToPath(import.meta.url));
export const SKILL = path.resolve(RUNTIME, '..');

// playwright-core is loaded on first use, so --help and the project loader work before `npm install` and a missing
// install gives one actionable line instead of a module-resolution stack trace.
let PW = null;
export async function playwright() {
  if (PW) return PW;
  try { PW = await import('playwright-core'); }
  catch (e) {
    if (e && (e.code === 'ERR_MODULE_NOT_FOUND' || /Cannot find (package|module) 'playwright-core'/.test(String(e.message)))) {
      const err = new Error(`playwright-core is not installed. Run once:  (cd "${RUNTIME}" && npm install)`);
      err.friendly = true;
      throw err;
    }
    throw e;
  }
  return PW;
}
// Print the leading // comment block of a CLI file (its usage), skipping the shebang.
export function printHelp(fileUrl) {
  const lines = fs.readFileSync(fileURLToPath(fileUrl), 'utf8').split('\n');
  const out = [];
  for (const l of lines.slice(lines[0].startsWith('#!') ? 1 : 0)) {
    if (!/^\s*\/\//.test(l)) break;
    out.push(l.replace(/^\s*\/\/ ?/, ''));
  }
  console.log(out.join('\n'));
}
// An error the user can act on: the CLIs print its message without a stack trace.
export const userError = msg => Object.assign(new Error(msg), { friendly: true });
// Last-resort error printer for the CLIs: friendly errors print their message only.
export function fail(e) {
  console.error(e && e.friendly ? e.message : (e && (e.stack || e.message)) || e);
  process.exit(1);
}
const OPTIONAL_MODULES = new Set(['gl.js', 'quad.js', 'term.js']);
export const IMAGE_EXT = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.avif': 'image/avif' };
const DATA_EXT = { '.json': 'json', '.cast': 'text', '.txt': 'text', '.csv': 'text', '.tsv': 'text', '.md': 'text', '.log': 'text', '.ansi': 'text' };
export const MIME = {
  ...IMAGE_EXT, '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.cast': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.csv': 'text/csv; charset=utf-8',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.m4a': 'audio/mp4', '.mp4': 'video/mp4', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.webm': 'video/webm',
};
export const rel = p => path.relative(process.cwd(), p) || '.';
export const readJSON = f => JSON.parse(fs.readFileSync(f, 'utf8'));

// ───────── Chromium ─────────
// CHROME_PATH, else playwright-core's own build when installed, else any installed Playwright Chromium (newest),
// else common Chrome/Chromium/Edge locations on macOS, Linux and Windows.
export function findChrome(chromium = PW && PW.chromium) {
  const ok = p => { try { return p && fs.statSync(p).isFile(); } catch { return false; } };
  if (process.env.CHROME_PATH) {
    if (ok(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
    console.warn(`CHROME_PATH does not exist: ${process.env.CHROME_PATH}`);
  }
  try { const p = chromium && chromium.executablePath(); if (ok(p)) return p; } catch { /* not installed */ }
  const home = os.homedir(), plat = process.platform;
  const caches = [process.env.PLAYWRIGHT_BROWSERS_PATH,
    plat === 'darwin' ? path.join(home, 'Library/Caches/ms-playwright') : null,
    plat === 'linux' ? path.join(home, '.cache/ms-playwright') : null,
    plat === 'win32' && process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'ms-playwright') : null].filter(Boolean);
  const builds = [];
  for (const c of caches) {
    let names = [];
    try { names = fs.readdirSync(c); } catch { continue; }
    for (const n of names) {
      const m = /^chromium(_headless_shell)?-(\d+)$/.exec(n);
      if (m) builds.push({ dir: path.join(c, n), rev: +m[2], shell: !!m[1] });
    }
  }
  builds.sort((a, b) => b.rev - a.rev || a.shell - b.shell);
  for (const b of builds) {
    let subs = [];
    try { subs = fs.readdirSync(b.dir).filter(s => s.startsWith('chrome')); } catch { continue; }
    for (const s of subs) {
      const d = path.join(b.dir, s);
      for (const exe of [
        'Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing', 'Chromium.app/Contents/MacOS/Chromium',
        'chrome-headless-shell', 'chrome', 'chrome.exe', 'chrome-headless-shell.exe']) if (ok(path.join(d, exe))) return path.join(d, exe);
    }
  }
  const pf = process.env.PROGRAMFILES || 'C:\\Program Files', pf86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', la = process.env.LOCALAPPDATA || '';
  const sys = plat === 'darwin' ? [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', path.join(home, 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
    '/Applications/Chromium.app/Contents/MacOS/Chromium', '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  ] : plat === 'win32' ? [
    path.join(pf, 'Google/Chrome/Application/chrome.exe'), path.join(pf86, 'Google/Chrome/Application/chrome.exe'),
    path.join(la, 'Google/Chrome/Application/chrome.exe'), path.join(pf86, 'Microsoft/Edge/Application/msedge.exe'), path.join(pf, 'Microsoft/Edge/Application/msedge.exe'),
  ] : ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium', '/usr/bin/microsoft-edge'];
  for (const p of sys) if (ok(p)) return p;
  throw userError('No Chromium found. Set CHROME_PATH, or install one: npx playwright install chromium');
}
export const CHROME_ARGS = ['--force-color-profile=srgb', '--font-render-hinting=none', '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader',
  '--hide-scrollbars', '--mute-audio', '--autoplay-policy=no-user-gesture-required'];
export async function launchBrowser(o = {}) {
  const { chromium } = await playwright();
  return chromium.launch({ executablePath: findChrome(chromium), headless: o.headless !== false, args: [...CHROME_ARGS, ...(o.args || [])] });
}

// ───────── project ─────────
function walk(dir, base = dir, out = []) {
  let ents = [];
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of ents) {
    if (e.name.startsWith('.') || e.name.startsWith('_') || e.name === 'node_modules') continue;
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f, base, out);
    else out.push(path.relative(base, f).split(path.sep).join('/'));
  }
  return out;
}
// ───────── audio per cut ─────────
// Candidates in P/build, best first. A narrated mix beats the music; within a kind the HTML takes the smallest
// encode (96k -embed) and the MP4 takes the true-peak-checked AAC encode (copied, never re-encoded) before the WAV.
// Never auto-picked: unmastered stems (arrange.py --stem) and placeholder mixes built from dry-run narration.
export const AUDIO_ORDER = {
  html: c => [`mix-${c}-embed.m4a`, `mix-${c}.m4a`, `mix-${c}.wav`, `music-${c}-embed.m4a`, `music-${c}.m4a`, `music-${c}.wav`],
  mp4: c => [`mix-${c}.m4a`, `mix-${c}.wav`, `music-${c}.m4a`, `music-${c}.wav`],
};
// What an audio file is, from its sidecar (mix_vo.py writes mix-<x>.json, arrange.py music-<x>.json; -embed and
// -stem encodes share it) and, for a mix without the flag, the narration manifest build/vo/manifest.json.
export function audioStatus(file) {
  const dir = path.dirname(file), base = path.basename(file).replace(/\.(wav|m4a|aac|mp4|mp3)$/i, '');
  const kind = /^mix-/.test(base) ? 'mix' : /^music-/.test(base) ? 'music' : 'other';
  const st = { file, kind, placeholder: false, stem: /-stem$/.test(base), unverified: [], sidecar: null };
  const side = path.join(dir, base.replace(/-embed$/, '') + '.json');
  let j = null;
  if (fs.existsSync(side)) { try { j = readJSON(side); st.sidecar = side; } catch { /* unreadable: treat as unknown */ } }
  if (j) {
    if (j.placeholder === true) st.placeholder = true;
    if (j.stem === true || j.mastered === false) st.stem = true;
    if (Array.isArray(j.unverified)) st.unverified = j.unverified;
  }
  if (kind === 'mix' && (!j || j.placeholder === undefined)) {
    const man = path.join(dir, 'vo', 'manifest.json');
    if (fs.existsSync(man)) {
      try { const m = readJSON(man); if (m.dryRun || (m.lines || []).some(l => l.source === 'dry-run')) st.placeholder = true; } catch { /* ignore */ }
    }
  }
  st.label = st.placeholder ? 'PLACEHOLDER narration (dry-run clips, not for delivery)' : st.stem ? 'unmastered stem (a bed for mix_vo.py, not for delivery)' : '';
  return st;
}
// Burned-in captions of a planned cut that were timed from placeholder narration (text estimates or dry-run clips)
// and would be drawn (reel.config captions.enabled when set, else style.layout.captions.enabled).
export function placeholderCaptions(config, style, cutPlan) {
  const rc = config && config.captions && config.captions.enabled !== undefined ? config.captions.enabled
    : !!(style && style.layout && style.layout.captions && style.layout.captions.enabled);
  return !!(rc && cutPlan && cutPlan.vo && cutPlan.vo.placeholderCaptions && (cutPlan.captions || []).length);
}
// Pick the audio for one cut. o.target 'html' | 'mp4'; o.allowPlaceholder accepts dry-run mixes (dev player, tests).
export function pickAudio(P, cut, o = {}) {
  const build = path.join(path.resolve(P), 'build'), skipped = [];
  for (const n of AUDIO_ORDER[o.target || 'html'](cut)) {
    const f = path.join(build, n);
    if (!fs.existsSync(f)) continue;
    const st = audioStatus(f);
    if (st.stem) { skipped.push(`${n}: ${st.label}`); continue; }
    if (st.placeholder && !o.allowPlaceholder) { skipped.push(`${n}: ${st.label}`); continue; }
    return { file: f, status: st, skipped };
  }
  return { file: null, status: null, skipped };
}
// Read a reel project folder into a manifest (contract B/C/D/F). o.cuts: names (default: every build/cut-*.json,
// in reel.config cuts order). o.url(absPath, kind) maps files to URLs (dev) or the caller inlines them (build).
// o.skipAudio(cut) -> true leaves that cut's audio to the caller (explicit file, --no-audio, a time-mapped variant).
export function loadProject(P, o = {}) {
  P = path.resolve(P);
  const warnings = [];
  const cfgFile = path.join(P, 'reel.config.json');
  if (!fs.existsSync(cfgFile)) throw userError(`no reel.config.json in ${rel(P)}`);
  const config = readJSON(cfgFile);
  const styleFile = path.resolve(P, config.style || 'style.json');
  let style = {};
  if (fs.existsSync(styleFile)) style = readJSON(styleFile);
  else warnings.push(`style file missing (${rel(styleFile)}): engine defaults are used`);
  const build = path.join(P, 'build');
  let cuts = o.cuts && o.cuts.length ? o.cuts.map(String) : null;
  if (!cuts) {
    const have = fs.existsSync(build) ? fs.readdirSync(build).map(f => /^cut-(.+)\.json$/.exec(f)).filter(Boolean).map(m => m[1]) : [];
    const order = Object.keys(config.cuts || {});
    cuts = [...order.filter(c => have.includes(c)), ...have.filter(c => !order.includes(c)).sort()];
  }
  if (!cuts.length) throw userError(`no planned cuts in ${rel(build)}: run python3 ${rel(path.join(SKILL, 'timing/plan_cut.py'))} --project ${rel(P)} --cut <name>`);
  const cutData = {};
  for (const c of cuts) {
    const f = path.join(build, `cut-${c}.json`);
    if (!fs.existsSync(f)) throw userError(`missing ${rel(f)}: run python3 ${rel(path.join(SKILL, 'timing/plan_cut.py'))} --project ${rel(P)} --cut ${c}`);
    cutData[c] = readJSON(f);
  }
  // assets: top-level images -> IMG by name; everything else (captures/...) -> ASSETS by relative path
  const adir = path.join(P, 'assets');
  const files = fs.existsSync(adir) ? walk(adir) : [];
  const metaFile = path.join(adir, 'meta.json');
  const meta = fs.existsSync(metaFile) ? readJSON(metaFile) : {};
  const images = {}, assets = {};
  for (const r of files.sort()) {
    const ext = path.extname(r).toLowerCase(), abs = path.join(adir, r);
    if (r === 'meta.json') continue;
    if (!r.includes('/') && IMAGE_EXT[ext]) {
      const name = r.slice(0, -ext.length);
      if (images[name]) { if (ext === '.webp') images[name] = { abs, ext }; warnings.push(`two images named '${name}' in assets/: using the .webp`); }
      else images[name] = { abs, ext };
    } else if (IMAGE_EXT[ext]) assets[r] = { type: 'image', abs, ext };
    else if (DATA_EXT[ext]) assets[r] = { type: DATA_EXT[ext], abs, ext };
  }
  for (const k of Object.keys(meta)) if (!images[k]) warnings.push(`meta.json lists '${k}' but assets/${k}.webp is missing`);
  // fonts: style.fonts.files [{family, path, weight, style}] relative to P (or to style.json)
  const fonts = [];
  for (const f of (style.fonts && style.fonts.files) || []) {
    const cands = [path.resolve(P, f.path), path.resolve(path.dirname(styleFile), f.path)];
    const abs = cands.find(c => fs.existsSync(c));
    if (!abs) { warnings.push(`font file not found: ${f.path} (${f.family}); the CSS stack falls back`); continue; }
    fonts.push({ family: f.family, abs, weight: String(f.weight ?? '400'), style: f.style || 'normal' });
  }
  // scenes (config order first, then any extra ids used by the cuts)
  const ids = [];
  for (const s of config.scenes || []) if (!ids.includes(s.id)) ids.push(s.id);
  for (const c of Object.values(cutData)) for (const s of c.scenes || []) if (!ids.includes(s.id)) ids.push(s.id);
  const sceneFiles = [];
  for (const id of ids) {
    const f = path.join(P, 'scenes', `${id}.js`);
    if (fs.existsSync(f)) sceneFiles.push({ id, abs: f });
    else warnings.push(`scenes/${id}.js is missing: the compositor draws a labelled placeholder`);
  }
  // project modules: P/modules/*.js (shared code several scenes use: a code-drawn cast, a data loader), loaded after
  // compositor.js and before the scenes, in file-name order
  const mdir = path.join(P, 'modules');
  const moduleFiles = fs.existsSync(mdir) ? fs.readdirSync(mdir).filter(f => f.endsWith('.js') && !f.startsWith('.') && !f.startsWith('_')).sort()
    .map(f => ({ name: f.slice(0, -3), abs: path.join(mdir, f) })) : [];
  const audio = {}, audioInfo = {};
  for (const c of cuts) {
    if (o.skipAudio && o.skipAudio(c)) continue;          // the caller brings its own audio (or none) for this cut
    const pick = pickAudio(P, c, { target: 'html', allowPlaceholder: o.allowPlaceholder });
    for (const sk of pick.skipped) warnings.push(`audio ${c}: skipped ${sk}`);
    if (pick.file) {
      audio[c] = pick.file; audioInfo[c] = pick.status;
      if (pick.status.placeholder) warnings.push(`audio ${c}: ${path.basename(pick.file)} is ${pick.status.label}`);
      if (pick.status.unverified.length) warnings.push(`audio ${c}: narration clips not verified by speech-to-text: ${pick.status.unverified.join(', ')}`);
    }
  }
  const narrationFile = path.join(P, 'narration.json');
  return {
    P, config, style, styleFile, cuts, cutData, meta, images, assets, fonts, moduleFiles, sceneFiles, audio, audioInfo, warnings,
    narration: fs.existsSync(narrationFile) ? readJSON(narrationFile) : null,
  };
}
const RUNTIME_SCRIPTS = ['engine.js', 'gl.js', 'quad.js', 'term.js', 'compositor.js'];
export function runtimeScripts() {
  return RUNTIME_SCRIPTS.filter(f => fs.existsSync(path.join(RUNTIME, f)) || !OPTIONAL_MODULES.has(f));
}
// Dev manifest: same shape as the built one, with root-relative URLs served by devHandler.
export function devManifest(proj, o = {}) {
  const P = proj.P, url = abs => '/project/' + path.relative(P, abs).split(path.sep).map(encodeURIComponent).join('/');
  const extra = o.extra || new Map();
  const ext = abs => { if (abs.startsWith(P + path.sep)) return url(abs); const id = String(extra.size); extra.set(id, abs); return `/x/${id}/${encodeURIComponent(path.basename(abs))}`; };
  return {
    mode: 'dev', title: proj.config.title || '', config: proj.config, style: proj.style,
    cuts: proj.cutData, cutOrder: proj.cuts, defaultCut: o.cut || proj.cuts[0],
    meta: proj.meta,
    images: Object.fromEntries(Object.entries(proj.images).map(([k, v]) => [k, url(v.abs)])),
    assets: Object.fromEntries(Object.entries(proj.assets).map(([k, v]) => [k, { type: v.type, url: url(v.abs) }])),
    fonts: proj.fonts.map(f => [f.family, ext(f.abs), f.weight, f.style]),
    audio: Object.fromEntries(Object.entries(proj.audio).map(([k, v]) => [k, url(v)])),
    scale: o.scale ? +o.scale : undefined, warp: o.warp || undefined, posterT: o.posterT ?? proj.config.poster,
  };
}
export const jsonForScript = v => JSON.stringify(v).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
// HTTP-like handler for the dev page: /runtime/*, /project/*, /x/<id>/* (font files outside the project).
export function devHandler(projectDir, o = {}) {
  const P = path.resolve(projectDir), state = { extra: new Map() };
  return pathname => {
    let p;
    try { p = decodeURIComponent(pathname); } catch { return { status: 400, body: 'bad url' }; }
    if (p === '/favicon.ico') return { status: 204, body: '' };
    if (p === '/' || p === '/index.html' || p === '/runtime/template.html') {
      // dev preview: dry-run mixes are fine (warned); headless renders (o.noAudio) never play audio, so skip the pick
      const proj = loadProject(P, { cuts: o.cuts, allowPlaceholder: true, skipAudio: o.noAudio ? () => true : undefined });
      state.extra = new Map();
      const M = devManifest(proj, { ...o, extra: state.extra });
      let html = fs.readFileSync(path.join(RUNTIME, 'template.html'), 'utf8');
      if (p !== '/runtime/template.html') html = html.replace('<head>', '<head><base href="/runtime/">');
      html = html.replace('<script id="manifest">window.MANIFEST = null;</script>', () => `<script id="manifest">window.MANIFEST = ${jsonForScript(M)};</script>`);
      html = html.replace('<!--SCENES-->', () => [
        ...proj.moduleFiles.map(m => `<script src="/project/modules/${encodeURIComponent(m.name)}.js"></script>`),
        ...proj.sceneFiles.map(s => `<script src="/project/scenes/${encodeURIComponent(s.id)}.js"></script>`)].join('\n'));
      html = html.replace(/<title>[^<]*<\/title>/, () => `<title>${escHtml(proj.config.title || 'Showreel')}</title>`);
      for (const w of proj.warnings) if (!o.quiet) (o.onWarn || console.warn)('warning: ' + w);
      return { status: 200, type: MIME['.html'], body: html };
    }
    if (p.startsWith('/runtime/')) {
      const name = p.slice(9);
      const f = path.join(RUNTIME, name);
      if (!f.startsWith(RUNTIME + path.sep)) return { status: 403, body: 'forbidden' };
      if (fs.existsSync(f) && fs.statSync(f).isFile()) return { status: 200, type: MIME[path.extname(f)] || 'application/octet-stream', file: f };
      if (OPTIONAL_MODULES.has(name)) return { status: 200, type: MIME['.js'], body: `/* optional module ${name} is not installed */` };
      return { status: 404, body: 'not found' };
    }
    if (p.startsWith('/project/')) {
      const f = path.join(P, p.slice(9));
      if (!f.startsWith(P + path.sep)) return { status: 403, body: 'forbidden' };
      if (fs.existsSync(f) && fs.statSync(f).isFile()) return { status: 200, type: MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', file: f };
      return { status: 404, body: 'not found' };
    }
    const m = /^\/x\/(\d+)\//.exec(p);
    if (m && state.extra.has(m[1])) { const f = state.extra.get(m[1]); return { status: 200, type: MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', file: f }; }
    return { status: 404, body: 'not found' };
  };
}
export const escHtml = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ───────── page ─────────
// Open the reel in headless Chromium (render mode) and wait until it is ready.
// o: {project, html, cut, scale, warp, cuts, browser (reuse), quiet}
export async function openReel(o = {}) {
  let W = 1920, H = 1080;
  if (o.project && !o.html) {
    const cfg = readJSON(path.join(path.resolve(o.project), 'reel.config.json'));
    if (cfg.size) [W, H] = cfg.size;
  }
  const own = !o.browser, browser = o.browser || (await launchBrowser());
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const errors = [], warnings = [];
  page.on('console', m => {
    const tx = m.text();
    if (m.type() === 'error') errors.push('[console.error] ' + tx);
    else if (m.type() === 'warning' || m.type() === 'warn') warnings.push(tx);
  });
  page.on('pageerror', e => errors.push('[pageerror] ' + (e.stack || e.message)));
  page.on('requestfailed', r => { if (!r.url().startsWith('data:')) errors.push(`[requestfailed] ${r.url()} ${r.failure() ? r.failure().errorText : ''}`); });
  const q = new URLSearchParams({ render: '1' });
  if (o.cut) q.set('cut', String(o.cut));
  if (o.scale) q.set('scale', String(o.scale));
  if (o.warp) q.set('warp', String(o.warp));
  if (o.html) {
    await page.goto(pathToFileURL(path.resolve(o.html)).href + '?' + q.toString());
  } else {
    const handle = devHandler(o.project, { cuts: o.cuts || (o.cut ? [String(o.cut)] : null), cut: o.cut, noAudio: true, onWarn: w => warnings.push(w.replace(/^warning: /, '')), quiet: false });
    await page.route('http://reel.local/**', route => {
      const u = new URL(route.request().url());
      let r;
      try { r = handle(u.pathname); } catch (e) { errors.push('[project] ' + e.message); r = { status: 500, body: e.message }; }
      if (r.file) return route.fulfill({ status: r.status, path: r.file, headers: { 'content-type': r.type } });
      return route.fulfill({ status: r.status, body: r.body, headers: { 'content-type': r.type || 'text/plain' } });
    });
    await page.goto('http://reel.local/runtime/template.html?' + q.toString());
  }
  try {
    await page.waitForFunction(() => window.__reel && (window.__reel.ready || window.__reel.error), null, { timeout: o.timeout || 120000 });
  } catch (e) { errors.push('[timeout] the reel did not become ready: ' + e.message); }
  const info = await page.evaluate(() => {
    const r = window.__reel;
    if (!r) return { error: 'window.__reel missing' };
    const M = window.MANIFEST || {};
    return { error: r.error, W: r.W, H: r.H, fps: r.fps, OUT: r.ready ? r.OUT : 0, cut: r.cut, cuts: r.ready ? r.cuts : [], duration: r.ready ? r.plan.duration : 0, title: M.title || (M.config && M.config.title) || '' };
  }).catch(e => ({ error: e.message }));
  if (info.error) {
    const msg = `reel failed to boot: ${String(info.error).split('\n')[0]}` + (errors.length ? '\n' + errors.join('\n') : '');
    if (own) await browser.close(); else await page.close();
    throw userError(msg);
  }
  if (info.W !== W || info.H !== H) await page.setViewportSize({ width: info.W, height: info.H });
  const close = async () => { if (own) await browser.close(); else await page.close(); };
  return { browser, page, errors, warnings, info, close };
}
// Render output time T (time map applied in the page) and return PNG bytes.
export async function grabPNG(page, T, scene = false) {
  const data = await page.evaluate(([tt, sc]) => {
    const r = window.__reel;
    if (sc) r.renderFrame(tt); else r.renderOut(tt);
    return r.canvas.toDataURL('image/png');
  }, [T, scene]);
  return Buffer.from(data.slice(data.indexOf(',') + 1), 'base64');
}

// ───────── CLI ─────────
export function parseArgs(argv, spec = {}) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      const k = (eq > 0 ? a.slice(2, eq) : a.slice(2));
      const next = argv[i + 1], hasVal = next !== undefined && !next.startsWith('--');
      if (eq > 0) o[k] = a.slice(eq + 1);
      else if ((spec.flags && spec.flags.includes(k)) || !hasVal) o[k] = true;
      else if (spec.optionalValue && spec.optionalValue.includes(k)) { if (/^\d+$/.test(next)) o[k] = argv[++i]; else o[k] = true; }
      else o[k] = argv[++i];
    } else o._.push(a);
  }
  return o;
}
const fmtT = (t, w = 6) => t.toFixed(2).padStart(w, '0');
async function serve(project, port, o) {
  const handle = devHandler(project, { cuts: o.cuts, cut: o.cut, scale: o.scale, warp: o.warp });
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    let r;
    try { r = handle(u.pathname === '/' ? '/' : u.pathname); } catch (e) { r = { status: 500, type: 'text/plain', body: 'Error: ' + e.message }; }
    if (r.file) { res.writeHead(r.status, { 'content-type': r.type, 'cache-control': 'no-store' }); fs.createReadStream(r.file).pipe(res); }
    else { res.writeHead(r.status, { 'content-type': r.type || 'text/plain', 'cache-control': 'no-store' }); res.end(r.body); }
  });
  for (let i = 0; ; i++) {
    try { await new Promise((ok, bad) => { srv.once('error', bad); srv.listen(port + i, '127.0.0.1', ok); }); port += i; break; }
    catch (e) { if (e.code !== 'EADDRINUSE' || i >= 20) throw e; }
  }
  console.log(`dev player: http://127.0.0.1:${port}/  (reload the page after editing scenes; Ctrl+C to stop)`);
}
async function main() {
  const a = parseArgs(process.argv.slice(2), { flags: ['sheet', 'transitions', 'post', 'help', 'quiet'], optionalValue: ['serve'] });
  if (a.help || (!a.project && !a.html)) {
    printHelp(import.meta.url);
    process.exit(a.help ? 0 : 2);
  }
  if (a.serve) return serve(a.project, a.serve === true ? 8737 : +a.serve, { cut: a.cut, cuts: a.cuts ? a.cuts.split(',') : null, scale: a.scale, warp: a.warp });
  const times = [];
  // times: positionals, each may hold several separated by spaces or commas (a quoted shell variable); never ignored
  for (const x of a._) for (const tok of String(x).split(/[\s,]+/)) {
    if (tok === '') continue;
    if (isNaN(+tok)) throw userError(`not a time in seconds: ${tok} (times are output seconds, e.g. 1.5 3 4.5)`);
    times.push(+tok);
  }
  if (a.range) {
    const [s, e, st] = String(a.range).split(':').map(Number);
    if (!(st > 0)) throw userError('--range a:b:step needs a positive step');
    for (let t = s; t <= e + 1e-9; t += st) times.push(Math.round(t * 1e4) / 1e4);
  }
  const out = path.resolve(a.out || path.join(a.project ? path.join(a.project, 'build') : '.', 'stills'));
  fs.mkdirSync(out, { recursive: true });
  const reel = await openReel({ project: a.project, html: a.html, cut: a.cut, scale: a.scale, warp: a.warp });
  const { page, info } = reel;
  const isScene = !!a.scene;
  let dur = null;
  if (isScene) {
    const plan = await page.evaluate(() => ({ barSec: window.__reel.plan.barSec, scenes: window.__reel.plan.scenes.map(s => ({ id: s.id, dur: s.dur })) }));
    const s = plan.scenes.find(x => x.id === a.scene);
    dur = a.dur ? +a.dur : a.bars ? +a.bars * plan.barSec : s ? s.dur : 2 * plan.barSec;
    if (!times.length) for (let t = 0; t <= dur + 1e-9; t += 0.25) times.push(Math.round(t * 1e4) / 1e4);
  } else if (a.transitions) {
    const bt = await page.evaluate(() => window.__reel.boundaryTimes());
    for (const t of bt) times.push(t);
  }
  if (!times.length) {
    console.log(`no times given: rendering scene midpoints of cut ${info.cut}`);
    const mids = await page.evaluate(() => window.__reel.plan.scenes.map(s => (s.t0 + s.t1) / 2));
    times.push(...mids.map(t => Math.round(t * 1e4) / 1e4));
  }
  const cols = +a.cols || (times.length <= 4 ? times.length : times.length <= 9 ? 3 : 4), thumb = +a.thumb || 480;
  const wide = Math.max(...times.map(t => Math.abs(t))) >= 100 ? 7 : 6;
  if (a.sheet) await page.evaluate(([n, cols, tw]) => {
    const r = window.__reel, th = Math.round((tw * r.H) / r.W), lab = 26, gap = 8, rows = Math.ceil(n / cols);
    const c = document.createElement('canvas'); c.width = cols * (tw + gap) + gap; c.height = rows * (th + lab + gap) + gap;
    const g = c.getContext('2d'); g.fillStyle = '#1b1d22'; g.fillRect(0, 0, c.width, c.height);
    window.__sheet = { c, g, tw, th, lab, gap, cols };
  }, [times.length, cols, thumb]);
  const files = [];
  const t0 = Date.now();
  for (let i = 0; i < times.length; i++) {
    const T = times[i];
    const scT = a.transitions && !isScene;
    let buf;
    try {
      if (isScene) {
        const d = await page.evaluate(([id, lt, du, post]) => { window.__reel.renderScene(id, lt, du, { post }); return window.__reel.canvas.toDataURL('image/png'); }, [a.scene, T, dur, !!a.post]);
        buf = Buffer.from(d.slice(d.indexOf(',') + 1), 'base64');
      } else buf = await grabPNG(page, T, scT);
    } catch (e) { reel.errors.push(`[t=${T}] ${e.message}`); continue; }
    const name = isScene ? `${a.scene}_d${dur.toFixed(2)}_lt${fmtT(T, 5)}.png` : `${scT ? 'b' : 't'}${fmtT(T, wide)}.png`;
    const f = path.join(out, name);
    fs.writeFileSync(f, buf);
    files.push(f);
    if (a.sheet) {
      await page.evaluate(([i, T, isScene, scT, sceneId]) => {
        const r = window.__reel, s = window.__sheet, x = s.gap + (i % s.cols) * (s.tw + s.gap), y = s.gap + Math.floor(i / s.cols) * (s.th + s.lab + s.gap);
        s.g.imageSmoothingQuality = 'high';
        s.g.drawImage(r.canvas, x, y + s.lab, s.tw, s.th);
        let label;
        if (isScene) label = `${sceneId}  lt ${T.toFixed(2)}`;
        else {
          const t = scT ? T : r.toScene(T), fi = r.frameInfo(t);
          label = `${scT ? 'scene ' : ''}${T.toFixed(2)}s  ${fi.scene} +${fi.lt.toFixed(2)}` + (fi.transition ? `  ${fi.transition.type} ${(fi.transition.k * 100).toFixed(0)}%` : '');
        }
        s.g.fillStyle = '#e8eaef'; s.g.font = '600 15px ui-monospace, Menlo, Consolas, monospace'; s.g.textBaseline = 'middle';
        s.g.fillText(label, x + 2, y + s.lab / 2);
      }, [i, T, isScene, scT, a.scene || '']);
    }
    if (!a.quiet) console.log('wrote', rel(f));
  }
  if (a.sheet && files.length) {
    const d = await page.evaluate(() => window.__sheet.c.toDataURL('image/png'));
    const f = path.join(out, 'sheet.png');
    fs.writeFileSync(f, Buffer.from(d.slice(d.indexOf(',') + 1), 'base64'));
    console.log('sheet', rel(f));
  }
  console.log(`${files.length} frame(s) in ${((Date.now() - t0) / 1000).toFixed(1)} s · cut ${info.cut} · ${info.W}x${info.H} · ${info.OUT.toFixed(3)} s`);
  await reel.close();
  const warns = [...new Set(reel.warnings)];
  if (warns.length) { console.log('--- warnings ---'); for (const w of warns) console.log(w); }
  if (reel.errors.length) { console.log('--- console errors ---'); for (const e of [...new Set(reel.errors)]) console.log(e); process.exitCode = 1; }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(fail);
}
