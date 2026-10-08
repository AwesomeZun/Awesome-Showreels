#!/usr/bin/env node
// prepare.mjs: rebuild docs/readme-reel/assets/ from the bundled examples' real material. The outputs are committed,
// so run this only when the examples change. Everything it writes is either a display-sized copy of an example's own
// file (README renders, style boards, app captures, reel stills, player screenshots, the CLI cast) or data computed
// from the examples' generated files (cut plans, music, captions, the duck curve), plus the Vision cutout of the
// Mochi logo and the spark-bench demo note for pdf_figures.py. Intermediates go to docs/readme-reel/build/prep/.
//
//   node docs/readme-reel/tools/prepare.mjs [--only examples,data,mochi,snap,frames,players,cast,paper,title]
//
// Needs the runtime (cd skills/motion-showreel/runtime && npm install), Python 3 with numpy, scipy, Pillow,
// opencv-python and PyMuPDF, ffmpeg/ffprobe, and macOS 14+ for the Vision lift (prep_assets.py uses OpenCV elsewhere).
// Missing example outputs (cut plans, music, the narration dry run) are generated with the skill's own tools first.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const P = path.resolve(HERE, '..');                                   // docs/readme-reel
const ROOT = path.resolve(P, '../..');
const S = path.join(ROOT, 'skills/motion-showreel');
const EX = path.join(S, 'examples');
const PA = path.join(EX, 'playful-app'), RC = path.join(EX, 'research-cli');
const PREP = path.join(P, 'build/prep');
const A = path.join(P, 'assets');
const { launchBrowser, openReel, grabPNG } = await import(pathToFileURL(path.join(S, 'runtime/stills.mjs')).href);

const args = process.argv.slice(2);
const only = (() => { const i = args.indexOf('--only'); return i >= 0 ? new Set(args[i + 1].split(',')) : null; })();
const want = (step) => !only || only.has(step);
const r = (p) => path.relative(ROOT, p);

function run(cmd, argv, o = {}) {
  console.log(`$ ${cmd} ${argv.map(a => (a.startsWith(ROOT) ? r(a) : a)).join(' ')}`);
  const res = spawnSync(cmd, argv, { stdio: 'inherit', cwd: o.cwd || ROOT });
  if (res.status !== 0 && !o.allowFail) throw new Error(`${cmd} exited with ${res.status}`);
  return res.status;
}
const py = (script, argv, o) => run('python3', [script, ...argv], o);
const data = (argv) => py(path.join(HERE, 'readme_data.py'), argv);
const exists = (p) => fs.existsSync(p);
fs.mkdirSync(PREP, { recursive: true });

// ───────── 1. the examples' generated files (only when missing: they are deterministic) ─────────
if (want('examples')) {
  const plan = (proj, cuts) => { if (cuts.some(c => !exists(path.join(proj, `build/cut-${c}.json`)))) py(path.join(S, 'timing/plan_cut.py'), ['--project', proj, '--cut', cuts.join(',')]); };
  const music = (proj, c) => { if (!exists(path.join(proj, `build/music-${c}.wav`))) py(path.join(S, 'audio/arrange.py'), ['--project', proj, '--cut', c]); };
  plan(PA, ['short', '30', '60']); music(PA, '30');
  if (!exists(path.join(RC, 'build/mix-30.json'))) {                  // the narration dry run (no key, no network)
    py(path.join(S, 'narration/vo_timeline.py'), ['--project', RC, '--estimate']);
    py(path.join(S, 'narration/tts_gemini.py'), ['batch', '--project', RC, '--dry-run']);
    py(path.join(S, 'narration/vo_timeline.py'), ['--project', RC]);
    py(path.join(S, 'timing/plan_cut.py'), ['--project', RC, '--cut', '15,30,60']);
    py(path.join(S, 'narration/captions.py'), ['--project', RC, '--cut', '30']);
    py(path.join(S, 'audio/arrange.py'), ['--project', RC, '--cut', '30', '--stem']);
    py(path.join(S, 'narration/mix_vo.py'), ['--project', RC, '--cut', '30']);
  }
  plan(RC, ['15', '30', '60']); music(RC, '30');
  // sync proof of the Mochi soundtrack: every cue measured against the plan the picture reads
  py(path.join(S, 'audio/verify_sync.py'), ['--wav', path.join(PA, 'build/music-30.wav'), '--cut', path.join(PA, 'build/cut-30.json'),
    '--json', path.join(PREP, 'sync-mochi-30.json'), '--quiet'], { allowFail: true });
}

// ───────── 2. data: music, narration, plans, styles ─────────
if (want('data')) {
  data(['sound', '--wav', path.join(PA, 'build/music-30.wav'), '--music-json', path.join(PA, 'build/music-30.json'),
    '--cut', path.join(PA, 'build/cut-30.json'), '--sync', path.join(PREP, 'sync-mochi-30.json'), '--window', '8,14',
    '--out', path.join(A, 'data/sound.json')]);
  data(['narration', '--narration', path.join(RC, 'narration.json'), '--mix-json', path.join(RC, 'build/mix-30.json'),
    '--captions', path.join(RC, 'build/captions-30.json'), '--stem', path.join(RC, 'build/music-30-stem.wav'),
    '--cut', path.join(RC, 'build/cut-30.json'), '--window', '0,15', '--out', path.join(A, 'data/narration.json')]);
  data(['plans', '--cut', `15=${path.join(RC, 'build/cut-15.json')}`, '--cut', `30=${path.join(RC, 'build/cut-30.json')}`,
    '--cut', `60=${path.join(RC, 'build/cut-60.json')}`, '--out', path.join(A, 'data/plans.json')]);
  data(['styles', '--style', `mochi=${path.join(PA, 'style.json')}`, '--style', `spark=${path.join(RC, 'style.json')}`,
    '--out', path.join(A, 'data/styles.json')]);
}

const jobs = [];
const job = (src, out, o = {}) => jobs.push({ src, out: path.join(A, out), ...o });

// ───────── 3. Mochi: lifted from the playful-app logo by Vision, blink twin from the measured eyes ─────────
if (want('mochi')) {
  data(['images', '--jobs', writeJobs('mochi-crop', [{ src: path.join(PA, 'source/logo.png'), out: path.join(PREP, 'mochi-icon.png'), crop: [70, 110, 390, 390], alpha: true }])]);
  py(path.join(S, 'tools/prep_assets.py'), ['--project', P, '--force']);
}

// ───────── 4. source renders (the tone pass's own snapshot tool), boards, app captures, logo ─────────
if (want('snap')) {
  const snap = path.join(PREP, 'snap');
  run('node', [path.join(S, 'tools/source_snapshot.mjs'), '--out', snap, '--schemes', 'light,dark', '--full-max', '0',
    path.join(PA, 'source/README.md'), path.join(RC, 'source/README.md')]);
  const idx = JSON.parse(fs.readFileSync(path.join(snap, 'index.json'), 'utf8')).items;
  const shot = (n, scheme) => path.join(snap, idx.find(it => it.n === n).schemes[scheme].shot);
  job(shot(0, 'light'), 'ex/mochi-readme.webp', { width: 960 });
  job(shot(1, 'dark'), 'ex/spark-readme.webp', { width: 960 });
  job(path.join(PA, 'source/logo.png'), 'ex/mochi-logo.webp', { width: 720, alpha: true });
  job(path.join(PA, 'style-board.jpg'), 'ex/mochi-board.webp', { width: 960 });
  job(path.join(RC, 'style-board.jpg'), 'ex/spark-board.webp', { width: 960 });
  job(path.join(PA, 'assets/captures/ui/app/final.png'), 'ex/app-final.webp', { width: 412, quality: 90 });      // the screen
  job(path.join(PA, 'assets/captures/ui/app/result.png'), 'ex/app-result.webp', { width: 618, quality: 90, alpha: true });   // one layer
}

// ───────── 5. reel stills: the examples' own frames, rendered by the runtime ─────────
const FRAMES = { 'playful-app': [5.5, 13.5, 20.5], 'research-cli': [10.5, 19.5, 28.5] };   // the stills the scenes use
if (want('frames')) {
  for (const [name, times] of Object.entries(FRAMES)) {
    const reel = await openReel({ project: path.join(EX, name), cut: '30' });
    for (const t of times) {
      const f = path.join(PREP, `frames/${name}-${t}.png`);
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, await grabPNG(reel.page, t));
      job(f, `ex/${name === 'playful-app' ? 'mochi' : 'spark'}-frame-${String(t).replace('.', '_')}.webp`, { width: 960, quality: 84 });
    }
    if (reel.errors.length) console.warn(reel.errors.join('\n'));
    await reel.close();
  }
  // the narration loop's preview: the research-cli 30-s cut over its first two scenes (bars 1-4, 7.5 s), 72 frames
  const reel = await openReel({ project: RC, cut: '30' });
  for (let i = 0; i < 72; i++) {
    const t = +(i * 7.5 / 72).toFixed(5), f = path.join(PREP, `frames/narr-${String(i).padStart(2, '0')}.png`);
    fs.writeFileSync(f, await grabPNG(reel.page, t));
    job(f, `ex/narr/${String(i).padStart(2, '0')}.webp`, { width: 640, quality: 60 });
  }
  if (reel.errors.length) console.warn(reel.errors.join('\n'));
  await reel.close();
}

// ───────── 6. the real single-file player, playing: its own keys switch cuts, ArrowRight steps one of its frames ─────────
// For each cut, a run of screenshots 1/24 s apart (2 and 3 of the player's 60-fps frames, alternating): the picture,
// the scrubber and the timecode are the player's own. The ship loop plays them back in real time.
const PLAY = { 15: 1.0, 30: 13.15, 60: 27.0 }, SHOTS = 48;            // seconds into each cut; shots per cut (2 s)
if (want('players')) {
  const players = [];
  const b = await launchBrowser();
  for (const file of [path.join(RC, 'dist/spark-bench-v1.1.0.html')]) {
    const page = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(file).href);
    await page.waitForFunction(() => window.__reel && window.__reel.ready, null, { timeout: 60000 });
    const info = await page.evaluate(() => ({ cuts: window.__reel.cuts, title: (window.MANIFEST || {}).title, fps: window.__reel.fps }));
    const name = path.basename(file, '.html').split('-v')[0], shots = {};
    for (const [i, cut] of info.cuts.entries()) {
      await page.mouse.move(640, 400);
      await page.keyboard.press(String(i + 1));                         // the player's own key: 1-9 select a cut
      await page.waitForTimeout(300);
      await page.keyboard.press('Home');
      const at = PLAY[cut] ?? 1, sec = Math.floor(at), frac = Math.round((at - sec) * info.fps);
      for (let k = 0; k < sec; k++) await page.keyboard.press('Shift+ArrowRight');
      for (let k = 0; k < frac; k++) await page.keyboard.press('ArrowRight');
      const times = [];
      for (let n = 0; n < SHOTS; n++) {
        if (n) for (let k = 0; k < (n % 2 ? 2 : 3); k++) await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(150);
        await page.mouse.move(640, 410 + (n % 2));                     // keep the controls visible
        await page.waitForTimeout(100);
        const f = path.join(PREP, `players/${name}-${cut}-${String(n).padStart(2, '0')}.png`);
        fs.mkdirSync(path.dirname(f), { recursive: true });
        await page.screenshot({ path: f });
        times.push(await page.evaluate(() => document.getElementById('time').textContent));
        job(f, `ex/play/${cut}-${String(n).padStart(2, '0')}.webp`, { width: 640, quality: 60 });
      }
      const st = await page.evaluate(() => ({ cut: window.__reel.cut, out: window.__reel.OUT }));
      shots[cut] = { ...st, from: at, shots: SHOTS, step: 2.5 / info.fps, images: `ex/play/${cut}-NN.webp`, time: [times[0], times[times.length - 1]] };
    }
    players.push({ file: r(file), name: path.basename(file), bytes: fs.statSync(file).size, title: info.title, fps: info.fps, cuts: info.cuts, shots });
    await page.close();
  }
  await b.close();
  fs.writeFileSync(path.join(PREP, 'players.json'), JSON.stringify(players, null, 1));
  data(['ship', '--mp4', path.join(ROOT, 'assets/demo-research-cli-v1.1.0.mp4'), '--mp4', path.join(ROOT, 'assets/demo-playful-app-v1.1.0.mp4'),
    '--players', path.join(PREP, 'players.json'), '--out', path.join(A, 'data/ship.json')]);
}

// ───────── 6b. the sizzle's title card: two real frames, one from each example, for its split background ─────────
if (want('title')) {
  const T = path.join(P, 'sizzle/title/assets');
  for (const [proj, cut, t, out] of [[PA, '30', 20.5, 'bg-mochi'], [RC, '15', 3.55, 'bg-spark']]) {
    const reel = await openReel({ project: proj, cut });
    const f = path.join(PREP, `title-${out}.png`);
    fs.writeFileSync(f, await grabPNG(reel.page, t));
    if (reel.errors.length) console.warn(reel.errors.join('\n'));
    await reel.close();
    jobs.push({ src: f, out: path.join(T, `${out}.webp`), width: 1920, quality: 80 });
  }
}

// ───────── 7. the real `spark-bench run` capture (scanned for secrets, home paths and user names) ─────────
if (want('cast')) {
  const d = path.join(A, 'captures/term');
  fs.mkdirSync(d, { recursive: true });
  for (const f of ['run.cast', 'run.json']) fs.copyFileSync(path.join(RC, 'assets/captures/term', f), path.join(d, f));
  py(path.join(S, 'tools/capture_cli.py'), ['scan', path.join(d, 'run.cast')]);
}

// ───────── 8. PDF figures: the spark-bench demo note, extracted by pdf_figures.py ─────────
if (want('paper')) {
  const pdf = path.join(PREP, 'spark-note.pdf');
  data(['paper', '--readme', path.join(RC, 'source/README.md'), '--results', path.join(RC, 'assets/data/results.json'), '--out', pdf]);
  const out = path.join(A, 'captures/pdf');
  fs.rmSync(out, { recursive: true, force: true });
  py(path.join(S, 'tools/pdf_figures.py'), [pdf, '--out', out, '--find', '4.1× the dense throughput', '--find', '674 of 4,096 blocks (16.5%)']);
  py(path.join(S, 'tools/pdf_figures.py'), [pdf, '--out', path.join(PREP, 'pdf-pages'), '--mode', 'pages']);
  job(path.join(PREP, 'pdf-pages/spark-note/page-001.png'), 'captures/pdf/spark-note/page-1.webp', { width: 918, quality: 88 });
}

if (jobs.length) data(['images', '--jobs', writeJobs('images', jobs)]);
console.log('prepare: done');

function writeJobs(name, list) {
  const f = path.join(PREP, `${name}.json`);
  fs.writeFileSync(f, JSON.stringify(list, null, 1));
  return f;
}
