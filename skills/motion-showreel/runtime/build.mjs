#!/usr/bin/env node
// build.mjs: one self-contained HTML player with every requested cut and its audio. All JS inline; images, fonts
// (subset to the characters the reel can show, WOFF2 via pyftsubset when available, licence name records kept) and
// audio as base64; JSON/text assets inline. Opens from any folder with no server and no network.
//
//   node build.mjs --project P --cuts short,30 --out reel.html [--audio-<cut> file] [--no-audio] [--scale X | --warp k]
//                  [--title T] [--poster T] [--default-cut name] [--exclude regex] [--no-subset] [--allow-placeholder]
//                  [--verify]
//
// Audio per cut (unless --audio-<cut>): build/mix-<cut>-embed.m4a, mix-<cut>.m4a, mix-<cut>.wav, then
// music-<cut>-embed.m4a, music-<cut>.m4a, music-<cut>.wav (a .wav is encoded to AAC 96k). Unmastered stems and
// placeholder (dry-run) narration mixes are skipped; an explicit placeholder needs --allow-placeholder.
// The build fails on external src/href references and on local paths (/Users/, /home/, C:\Users\, file://).
// --verify copies the HTML alone into an empty temp folder, boots it headless, renders every cut and checks fonts,
// images and audio decode with zero console errors (and no placeholder narration unless allowed).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { RUNTIME, SKILL, IMAGE_EXT, loadProject, runtimeScripts, jsonForScript, escHtml, parseArgs, rel, openReel, audioStatus, placeholderCaptions, printHelp, fail, userError } from './stills.mjs';

const FONT_MIME = { '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf' };
const b64 = buf => buf.toString('base64');
const dataURI = (mime, buf) => `data:${mime};base64,${b64(buf)}`;
const kb = n => (n / 1024).toFixed(0) + ' KB';
const EXTRA_GLYPHS = '·×÷°±²³µ¶§©®™€£¥₩¢•…–—‘’“”«»‹›¡¿←↑→↓↗↘↔⇒✓✔✕✗★☆●○■□▲△▼▽◆◇▶❚│─┃━┌┐└┘├┤┬┴┼█▌▐░▒▓';

let SUBSET = undefined;
function subsetter() {
  if (SUBSET !== undefined) return SUBSET;
  for (const [cmd, pre] of [['pyftsubset', []], ['python3', ['-m', 'fontTools.subset']]]) {
    try { execFileSync(cmd, [...pre, '--help'], { stdio: 'ignore' }); return (SUBSET = { cmd, pre }); } catch { /* next */ }
  }
  return (SUBSET = null);
}
function subsetFont(abs, textFile, tmp, i) {
  const s = subsetter();
  if (!s) return null;
  const out = path.join(tmp, `font${i}.woff2`);
  try {
    // --name-IDs/--name-languages keep every name record: OFL 1.1 requires the copyright, licence description (13) and
    // licence URL (14) to travel with every copy, subsets included.
    execFileSync(s.cmd, [...s.pre, abs, `--text-file=${textFile}`, `--output-file=${out}`, '--flavor=woff2', '--layout-features=*',
      '--name-IDs=*', '--name-languages=*', '--name-legacy', '--no-hinting', '--desubroutinize', '--notdef-outline'], { stdio: ['ignore', 'ignore', 'pipe'] });
    return fs.readFileSync(out);
  } catch (e) {
    console.warn(`warning: subsetting failed for ${path.basename(abs)} (${String(e.stderr || e.message).trim().split('\n').pop()}); embedding the full font`);
    return null;
  }
}
// Licence facts of a font file (fontTools when available): family, copyright, licence text/URL, embedding bits.
const FONT_INFO_PY = `
import json, sys
from fontTools.ttLib import TTFont
f = TTFont(sys.argv[1], lazy=True, fontNumber=0)
def name(i):
    n = f["name"].getDebugName(i) if "name" in f else None
    return (n or "").strip()
fs = f["OS/2"].fsType if "OS/2" in f else 0
print(json.dumps({"family": name(16) or name(1), "copyright": name(0), "licence": name(13), "licenceUrl": name(14), "fsType": fs}))
`;
function fontInfo(abs) {
  try { return JSON.parse(execFileSync('python3', ['-c', FONT_INFO_PY, abs], { stdio: ['ignore', 'pipe', 'ignore'] }).toString()); }
  catch { return null; }
}
const OPEN_LICENCE = /SIL Open Font License|OFL|Apache License|Ubuntu Font Licence|MIT License|Bitstream Vera|GUST Font License|public domain|CC0/i;
function aacEncoder() {
  try { return /\baac_at\b/.test(execFileSync('ffmpeg', ['-hide_banner', '-encoders'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString()) ? 'aac_at' : 'aac'; }
  catch { return 'aac'; }
}
const escScript = code => code.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

async function main() {
  const a = parseArgs(process.argv.slice(2), { flags: ['no-audio', 'no-subset', 'verify', 'allow-placeholder', 'help'] });
  if (a.help || !a.project || !a.out) {
    printHelp(import.meta.url);
    process.exit(a.help ? 0 : 2);
  }
  const t0 = Date.now();
  const allowPh = !!a['allow-placeholder'];
  const cuts = a.cuts ? String(a.cuts).split(',').map(s => s.trim()).filter(Boolean) : null;
  const variantArgs = (a.scale && +a.scale !== 1) || a.warp;
  const proj = loadProject(a.project, { cuts, allowPlaceholder: allowPh,
    skipAudio: c => !!a['no-audio'] || !!a[`audio-${c}`] || !!variantArgs });
  for (const w of proj.warnings) console.warn('warning: ' + w);
  if (a.warp && proj.cuts.length > 1) throw userError('--warp is tied to one cut\'s duration: build one cut at a time (--cuts <name>)');
  // captions timed from placeholder narration would be burned into the player: refuse them like placeholder audio
  const capPh = proj.cuts.filter(c => placeholderCaptions(proj.config, proj.style, proj.cutData[c]));
  if (capPh.length && !allowPh) throw userError(`cuts ${capPh.join(', ')} burn in captions timed from placeholder narration (estimate / dry-run). Synthesize the real voice and re-plan, turn captions off for a music-only cut (reel.config "captions": {"enabled": false}), or pass --allow-placeholder for a test build.`);
  // explicit audio first: refuse a placeholder before any work
  const explicit = {};
  if (!a['no-audio']) for (const c of proj.cuts) {
    if (!a[`audio-${c}`]) continue;
    const f = path.resolve(a[`audio-${c}`]);
    if (!fs.existsSync(f)) throw userError(`--audio-${c} not found: ${a[`audio-${c}`]}`);
    const st = audioStatus(f);
    if (st.placeholder && !allowPh) throw userError(`--audio-${c} ${a[`audio-${c}`]} is ${st.label}. Synthesize the real voice (narration/tts_gemini.py batch, then mix_vo.py), or pass --allow-placeholder for a test build.`);
    if (st.stem) console.warn(`warning: --audio-${c} ${a[`audio-${c}`]} is ${st.label}`);
    explicit[c] = { file: f, status: st };
  }
  const exclude = a.exclude ? new RegExp(a.exclude) : null;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'reel-build-'));
  const sizes = { js: 0, fonts: 0, images: 0, data: 0, audio: 0 };

  // code
  const runtime = runtimeScripts().filter(f => fs.existsSync(path.join(RUNTIME, f)));
  const code = Object.fromEntries(runtime.map(f => [f, fs.readFileSync(path.join(RUNTIME, f), 'utf8')]));
  const modules = proj.moduleFiles.map(m => ({ name: m.name, code: fs.readFileSync(m.abs, 'utf8') }));
  const scenes = proj.sceneFiles.map(s => ({ id: s.id, code: fs.readFileSync(s.abs, 'utf8') }));
  for (const c of [...Object.values(code), ...modules.map(m => m.code), ...scenes.map(s => s.code)]) sizes.js += Buffer.byteLength(c);

  // images + assets
  const images = {}, assets = {};
  for (const [k, v] of Object.entries(proj.images)) {
    if (exclude && exclude.test(path.basename(v.abs))) continue;
    const buf = fs.readFileSync(v.abs); sizes.images += buf.length;
    images[k] = dataURI(IMAGE_EXT[v.ext], buf);
  }
  let glyphText = '';
  for (const [k, v] of Object.entries(proj.assets)) {
    if (exclude && exclude.test(k)) continue;
    const buf = fs.readFileSync(v.abs);
    if (v.type === 'image') { sizes.images += buf.length; assets[k] = { type: 'image', url: dataURI(IMAGE_EXT[v.ext], buf) }; }
    else {
      const txt = buf.toString('utf8'); sizes.data += buf.length; glyphText += txt;
      assets[k] = { type: v.type, data: v.type === 'json' ? JSON.parse(txt) : txt };
    }
  }

  // fonts: subset to every character the reel can draw
  const chars = new Set();
  const add = s => { for (const ch of String(s)) chars.add(ch); };
  for (let i = 32; i < 127; i++) chars.add(String.fromCharCode(i));
  add(EXTRA_GLYPHS); add(glyphText);
  for (const c of Object.values(code)) add(c);
  for (const s of [...modules, ...scenes]) add(s.code);
  add(JSON.stringify(proj.config)); add(JSON.stringify(proj.style)); add(JSON.stringify(proj.cutData));
  if (proj.narration) add(JSON.stringify(proj.narration));
  if (a.title) add(a.title);
  const textFile = path.join(tmp, 'glyphs.txt');
  fs.writeFileSync(textFile, [...chars].filter(c => c >= ' ').join(''));
  const fonts = [], fontNotes = [];
  const fontCache = new Map();
  proj.fonts.forEach((f, i) => {
    let entry = fontCache.get(f.abs);
    if (!entry) {
      const sub = a['no-subset'] ? null : subsetFont(f.abs, textFile, tmp, i);
      const buf = sub || fs.readFileSync(f.abs);
      const mime = sub ? 'font/woff2' : FONT_MIME[path.extname(f.abs).toLowerCase()] || 'font/ttf';
      entry = { uri: dataURI(mime, buf), bytes: buf.length, full: fs.statSync(f.abs).size, sub: !!sub };
      fontCache.set(f.abs, entry);
      sizes.fonts += buf.length;
      console.log(`font ${f.family} ${f.weight}: ${path.basename(f.abs)} ${kb(entry.full)} -> ${entry.sub ? 'subset ' : ''}${kb(buf.length)}`);
      const info = fontInfo(f.abs);
      if (info) {
        // fsType bit 1 (0x2) = restricted licence embedding; bit 9 (0x200) = bitmap embedding only
        if (info.fsType & 0x0202) console.warn(`warning: ${path.basename(f.abs)} restricts embedding (OS/2 fsType ${info.fsType}); check its licence before shipping the HTML`);
        if (!OPEN_LICENCE.test(`${info.licence} ${info.licenceUrl}`)) console.warn(`warning: ${path.basename(f.abs)} names no open licence (name ID 13: "${(info.licence || '').slice(0, 60)}"); check that it may be embedded`);
        const clean = v => String(v || '').replace(/--/g, '-').replace(/[\r\n]+/g, ' ').slice(0, 300);
        fontNotes.push(`font: ${clean(info.family || f.family)} (${path.basename(f.abs)}${entry.sub ? ', subset' : ''}). ${clean(info.copyright)}${info.licenceUrl ? ' Licence: ' + clean(info.licenceUrl) : info.licence ? ' Licence: ' + clean(info.licence) : ''}`);
      } else fontNotes.push(`font: ${f.family} (${path.basename(f.abs)})`);
    }
    fonts.push([f.family, entry.uri, f.weight, f.style]);
  });
  if (proj.fonts.length && !subsetter() && !a['no-subset']) console.warn('warning: pyftsubset (fontTools) not found; fonts embedded in full (pip install fonttools brotli)');

  // audio
  const audio = {}, placeholders = [];
  const variant = (a.scale && +a.scale !== 1) || a.warp;
  if (!a['no-audio']) {
    for (const c of proj.cuts) {
      let f = explicit[c] ? explicit[c].file : !variant ? proj.audio[c] || null : null;
      const st = explicit[c] ? explicit[c].status : !variant ? proj.audioInfo[c] || null : null;
      if (st && st.placeholder) { placeholders.push(c); console.warn(`warning: audio ${c} is ${st.label} (allowed by --allow-placeholder)`); }
      if (!f && variant) { console.log(`audio ${c}: none. A time-mapped variant needs re-synthesized music (never a stretched mix): python3 ${rel(path.join(SKILL, 'audio/arrange.py'))} --project ${rel(proj.P)} --cut ${c} ${a.warp ? `--warp "${a.warp}"` : `--scale ${a.scale}`} --out <base>, then --audio-${c} <base>.m4a`); continue; }
      if (!f) { console.log(`audio ${c}: none (silent cut)`); continue; }
      if (/\.wav$/i.test(f)) {
        const m4a = path.join(tmp, `audio-${c}.m4a`), enc = aacEncoder();
        execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', f, '-c:a', enc, '-b:a', '96k', '-ar', '48000', m4a]);
        console.log(`audio ${c}: ${rel(f)} -> AAC 96k (${enc})`);
        f = m4a;
      } else console.log(`audio ${c}: ${rel(f)}`);
      const buf = fs.readFileSync(f); sizes.audio += buf.length;
      audio[c] = dataURI('audio/mp4', buf);
    }
  }

  // manifest + page
  const title = a.title || proj.config.title || 'Showreel';
  const manifest = {
    mode: 'built', title, config: proj.config, style: proj.style, cuts: proj.cutData, cutOrder: proj.cuts,
    defaultCut: a['default-cut'] || proj.cuts[0], meta: proj.meta, images, assets, fonts, audio,
    scale: a.scale ? +a.scale : undefined, warp: a.warp ? { [proj.cuts[0]]: a.warp } : undefined,
    posterT: a.poster !== undefined ? +a.poster : proj.config.poster,
  };
  let html = fs.readFileSync(path.join(RUNTIME, 'template.html'), 'utf8');
  html = html.replace(/<title>[^<]*<\/title>/, () => `<title>${escHtml(title)}</title>`);
  const notes = fontNotes.length ? `\n<!--\n${fontNotes.map(n => '  ' + n).join('\n')}\n-->` : '';
  html = html.replace('<!--HEAD-->', () => `<meta name="generator" content="motion-showreel">\n<meta name="description" content="${escHtml(title)}: motion showreel (${proj.cuts.join(', ')})">${notes}`);
  html = html.replace('<script id="manifest">window.MANIFEST = null;</script>', () => `<script id="manifest">window.MANIFEST = ${jsonForScript(manifest)};</script>`);
  html = html.replace(/<script src="([\w.-]+\.js)"( data-optional)?><\/script>/g, (m, f) => (code[f] !== undefined ? `<script>/* ${f} */\n${escScript(code[f])}\n</script>` : ''));
  html = html.replace('<!--SCENES-->', () => [
    ...modules.map(m => `<script>/* modules/${m.name}.js */\n${escScript(m.code)}\n</script>`),
    ...scenes.map(s => `<script>/* scenes/${s.id}.js */\n${escScript(s.code)}\n</script>`)].join('\n'));
  const out = path.resolve(a.out);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  fs.rmSync(tmp, { recursive: true, force: true });
  const total = Buffer.byteLength(html);
  console.log(`wrote ${rel(out)}: ${(total / 1048576).toFixed(2)} MB (js ${kb(sizes.js)}, fonts ${kb(sizes.fonts)}, images ${kb(sizes.images)}, data ${kb(sizes.data)}, audio ${kb(sizes.audio)}; base64 adds ~33%) · cuts ${proj.cuts.join(', ')} · ${((Date.now() - t0) / 1000).toFixed(1)} s`);

  // self-containment checks
  const bad = [];
  html.split('\n').forEach((l, i) => {
    if (/(src|href)="(https?:)?\/\/|src="[^d]/.test(l)) bad.push(`line ${i + 1}: ${l.trim().slice(0, 120)}`);
  });
  if (/http:\/\/reel\.local|"\/project\//.test(html)) bad.push('dev URLs (reel.local or /project/) left in the manifest');
  if (bad.length) { console.log('--- external references ---\n' + bad.join('\n')); process.exitCode = 1; }
  else console.log('self-contained: no external src/href references');
  // local paths and user names must not ship inside the HTML (capture sidecars, run logs, data files)
  const leaks = [];
  const LOCAL = /\/Users\/[^/\s"'\\]+|\/home\/[^/\s"'\\]+|[A-Za-z]:\\\\?Users\\\\?[^\\\s"']+|file:\/\/\/?[^\s"']+/g;
  for (const m of html.matchAll(LOCAL)) { if (leaks.length < 8) leaks.push(`${m[0].slice(0, 80)} at offset ${m.index}`); }
  if (leaks.length) { console.log('--- local paths in the HTML (anonymize the asset or exclude it with --exclude) ---\n' + leaks.join('\n')); process.exitCode = 1; }
  if (placeholders.length) console.log(`!! cuts ${placeholders.join(', ')} embed PLACEHOLDER narration (allowed by --allow-placeholder): not for delivery`);
  if (capPh.length) console.log(`!! cuts ${capPh.join(', ')} burn in PLACEHOLDER captions (allowed by --allow-placeholder): not for delivery`);

  if (a.verify) await verify(out, proj.cuts, Object.keys(audio), fonts.length, { placeholders, allowPh });
}

// Copy the HTML alone into an empty folder, boot it headless, render every cut, decode its audio.
async function verify(file, cuts, audioCuts, nFonts, o = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'reel-verify-'));
  const copy = path.join(dir, path.basename(file));
  fs.copyFileSync(file, copy);
  console.log(`verify: ${copy} (alone in an empty folder)`);
  const errs = [];
  for (const c of cuts) {
    const reel = await openReel({ html: copy, cut: c });
    const r = await reel.page.evaluate(async ([cut, hasAudio]) => {
      const R = window.__reel, out = { cut: R.cut, OUT: R.OUT, frames: 0 };
      for (const f of [0, 0.25, 0.5, 0.75, 0.999]) { R.renderOut(R.OUT * f); out.frames++; }
      const faces = [...document.fonts].map(f => `${f.family}:${f.status}`);
      out.fontsLoaded = faces.filter(s => s.endsWith(':loaded')).length;
      out.fontsFailed = faces.filter(s => s.endsWith(':error'));
      out.images = Object.keys(IMG).length;
      if (hasAudio) {
        const a = new Audio(window.MANIFEST.audio[cut]);
        out.audio = await new Promise(res => { a.onloadedmetadata = () => res(a.duration); a.onerror = () => res('decode error'); setTimeout(() => res('timeout'), 15000); });
      }
      return out;
    }, [c, audioCuts.includes(c)]);
    const audioNote = r.audio === undefined ? 'no audio' : typeof r.audio === 'number' ? `audio ${r.audio.toFixed(2)} s` : `audio ${r.audio}`;
    console.log(`  cut ${r.cut}: ${r.OUT.toFixed(2)} s · ${r.frames} frames rendered · fonts loaded ${r.fontsLoaded}/${nFonts ? '≥' + nFonts : 0} · images ${r.images} · ${audioNote}`);
    if (r.fontsFailed.length) errs.push(`cut ${c}: fonts failed ${r.fontsFailed.join(', ')}`);
    if (typeof r.audio === 'string') errs.push(`cut ${c}: audio ${r.audio}`);
    else if (typeof r.audio === 'number' && Math.abs(r.audio - r.OUT) > 0.25) errs.push(`cut ${c}: audio is ${r.audio.toFixed(2)} s but the cut is ${r.OUT.toFixed(2)} s`);
    errs.push(...reel.errors.map(e => `cut ${c}: ${e}`));
    await reel.close();
  }
  fs.rmSync(dir, { recursive: true, force: true });
  for (const c of o.placeholders || []) if (!o.allowPh) errs.push(`cut ${c}: embeds placeholder narration`);
  if (errs.length) { console.log('--- verify failed ---\n' + errs.join('\n')); process.exitCode = 1; }
  else console.log('verify: ok' + ((o.placeholders || []).length ? ` (but cuts ${o.placeholders.join(', ')} carry PLACEHOLDER narration: not for delivery)` : ''));
}
main().catch(fail);
