#!/usr/bin/env node
// make_webp.mjs: render the README previews with the motion-showreel runtime and encode them.
//
//   node docs/readme-reel/tools/make_webp.mjs [--only style,carriers,tempo,sound,narration,ship,social] [--fps 24]
//        [--out assets/readme] [--work docs/readme-reel/build/webp] [--q 84] [--workers 6] [--no-qa]
//
// Each loop is one cut of this project (reel.config.json): plan it with timing/plan_cut.py, render every frame at
// 1920x1080 through the same page that render.mjs and the HTML player use (stills.mjs openReel + grabPNG, frame i at
// i / fps s, several pages in one browser), check the frames with the skill's own tools/motion_qa.py (--strict: no
// frozen run, no unexpected pop, no near-static hold; a FAIL makes the run exit 1), then tools/encode.py downsizes
// with Lanczos to 720x405 and encodes a lossy animated WebP that loops forever. A loop is 3 bars at 120 BPM = 6.000 s
// = 144 frames at 24 fps and the frame after the last one is frame 0 again. `start` picks the poster: the WebP opens
// on that frame and plays on from there (the loop is seamless, so only the first frame changes). The corners are
// rounded (14 px, transparent) so each loop reads as a card on the README's light and dark pages. The social preview
// is one frame of the `social` cut, cropped to 2:1 and saved as a 1280x640 PNG. Needs the runtime (npm install in
// skills/motion-showreel/runtime), Python 3 with numpy and Pillow, and cwebp and webpmux from libwebp.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const P = path.resolve(HERE, '..');
const ROOT = path.resolve(P, '../..');
const S = path.join(ROOT, 'skills/motion-showreel');
const { openReel, grabPNG, launchBrowser } = await import(pathToFileURL(path.join(S, 'runtime/stills.mjs')).href);

// cut -> output file, encoder quality (a busier picture gets a lower q to stay inside the README size budget) and the
// poster frame (start: the WebP's first frame, a finished state rather than an idle one)
const LOOPS = {
  style: { out: 'feat-style.webp', q: 70, start: 0 },
  carriers: { out: 'feat-carriers.webp', q: 70, start: 12 },
  tempo: { out: 'feat-tempo.webp', q: 70, start: 0 },
  sound: { out: 'feat-sound.webp', q: 70, start: 64 },
  narration: { out: 'feat-narration.webp', q: 70, start: 42 },
  ship: { out: 'feat-ship.webp', q: 70, start: 0 },
};
const SOCIAL = { cut: 'social', t: 1.0, out: 'social-preview.png', crop: '0,60,1920,960', size: '1280x640' };

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const only = opt('only') ? opt('only').split(',') : [...Object.keys(LOOPS), 'social'];
const fps = +opt('fps', 24);
const outDir = path.resolve(ROOT, opt('out', 'assets/readme'));
const work = path.resolve(ROOT, opt('work', path.join(path.relative(ROOT, P), 'build/webp')));
const qAll = opt('q') ? +opt('q') : null;
const workers = Math.max(1, +opt('workers', 6));
const qa = !argv.includes('--no-qa');
const rel = (p) => path.relative(ROOT, p);
const STAGE = JSON.parse(fs.readFileSync(path.join(P, 'style.json'), 'utf8')).palette.bg;   // WebP background colour

function run(cmd, args, o = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: ROOT });
  if (r.status !== 0 && !o.allowFail) throw new Error(`${cmd} ${args.slice(0, 2).join(' ')} exited with ${r.status}`);
  return r.status;
}
const cuts = only.filter(c => c in LOOPS || c === 'social');
const unknown = only.filter(c => !cuts.includes(c));
if (unknown.length) throw new Error(`unknown loop(s): ${unknown.join(', ')} (known: ${[...Object.keys(LOOPS), 'social'].join(', ')})`);
run('python3', [path.join(S, 'timing/plan_cut.py'), '--project', P, '--cut', cuts.join(','), '-q']);
fs.mkdirSync(outDir, { recursive: true });

const browser = await launchBrowser();
const failed = [];
try {
  for (const cut of cuts) {
    const t0 = Date.now();
    const dir = path.join(work, cut);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const errors = [];
    if (cut === 'social') {
      const reel = await openReel({ project: P, cut, browser });
      const f = path.join(dir, 'f0000.png');
      fs.writeFileSync(f, await grabPNG(reel.page, SOCIAL.t));
      errors.push(...reel.errors);
      await reel.close();
      run('python3', [path.join(HERE, 'encode.py'), 'poster', '--src', f, '--out', path.join(outDir, SOCIAL.out), '--crop', SOCIAL.crop, '--size', SOCIAL.size]);
    } else {
      // frames in parallel: each page renders an interleaved share (pure functions of time: order does not matter)
      const first = await openReel({ project: P, cut, browser });
      const n = Math.round(first.info.OUT * fps);
      const pages = [first];
      for (let k = 1; k < Math.min(workers, n); k++) pages.push(await openReel({ project: P, cut, browser }));
      await Promise.all(pages.map(async (reel, k) => {
        for (let i = k; i < n; i += pages.length) {
          fs.writeFileSync(path.join(dir, `f${String(i).padStart(4, '0')}.png`), await grabPNG(reel.page, i / fps));
        }
      }));
      for (const reel of pages) { errors.push(...reel.errors); await reel.close(); }
      if (qa) {                                         // the skill's own motion QA on the frames as rendered
        const st = run('python3', [path.join(S, 'tools/motion_qa.py'), '--frames', dir, '--fps', String(fps), '--cut',
          path.join(P, `build/cut-${cut}.json`), '--strict', '--json', path.join(work, `qa-${cut}.json`)], { allowFail: true });
        if (st !== 0) { failed.push(`${cut}: motion QA failed (${rel(path.join(work, `qa-${cut}.json`))})`); process.exitCode = 1; }
      }
      run('python3', [path.join(HERE, 'encode.py'), 'webp', '--frames', dir, '--out', path.join(outDir, LOOPS[cut].out),
        '--fps', String(fps), '--q', String(qAll ?? LOOPS[cut].q), '--bg', STAGE, '--start', String(LOOPS[cut].start || 0), '--radius', '14']);
    }
    if (errors.length) { failed.push(`${cut}: console errors\n` + [...new Set(errors)].join('\n')); process.exitCode = 1; }
    console.log(`${cut}: ${((Date.now() - t0) / 1000).toFixed(1)} s -> ${rel(path.join(outDir, cut === 'social' ? SOCIAL.out : LOOPS[cut].out))}`);
  }
} finally {
  await browser.close();
}
if (failed.length) console.error('\n' + failed.join('\n'));
