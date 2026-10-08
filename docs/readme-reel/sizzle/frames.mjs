#!/usr/bin/env node
// frames.mjs: render exact frames of a motion-showreel project to PNG with the skill's own runtime (openReel from
// runtime/stills.mjs), several headless pages in one browser. build.py writes the job files; nothing here is
// specific to one reel.
//
//   node frames.mjs job.json
//
// job.json: {project, cut, mode: "out" | "scene", scene, dur, post, prepare, grain, workers, items: [[t, "file.png"], ...]}
//   t             a time in seconds, or a list of sub-frame times whose renders are averaged into the frame.
//   mode "out"    renders output time t of the cut (window.__reel.renderOut), exactly what render.mjs encodes.
//   mode "scene"  renders one scene alone at local time t (window.__reel.renderScene(scene, t, dur, {post})).
//   prepare       awaits window.SIZZLE.prepare(t) before each frame (the composite project's footage loader).
//   grain         film-grain amount for these frames (style.post.grain), e.g. 0 for animated WebP previews: grain
//                 is new noise in every frame, which an animated WebP pays for in full (the skill's own GIF recipe
//                 removes it with a denoise instead). Everything else renders exactly as the project defines it.
// Exit code 1 on console errors in any page.
import fs from 'node:fs';
import path from 'node:path';
import { openReel, launchBrowser, fail } from '../../../skills/motion-showreel/runtime/stills.mjs';

async function main() {
  const jobFile = process.argv[2];
  if (!jobFile) { console.log('usage: node frames.mjs job.json'); process.exit(2); }
  const job = JSON.parse(fs.readFileSync(jobFile, 'utf8'));
  const items = job.items || [];
  if (!items.length) { console.log('frames: nothing to render'); return; }
  for (const [, f] of items) fs.mkdirSync(path.dirname(path.resolve(f)), { recursive: true });
  const workers = Math.max(1, Math.min(job.workers || 6, items.length));
  const browser = await launchBrowser();
  const errors = [], t0 = Date.now();
  let done = 0, last = 0;
  try {
    const per = Math.ceil(items.length / workers);
    await Promise.all(Array.from({ length: workers }, async (_, k) => {
      const slice = items.slice(k * per, (k + 1) * per);
      if (!slice.length) return;
      const reel = await openReel({ project: path.resolve(job.project), cut: job.cut, browser });
      try {
        if (job.grain !== undefined) await reel.page.evaluate(g => { STYLE.post.grain = g; }, job.grain);
        for (const [t, file] of slice) {
          // t may be a list of sub-frame times: the frame is their average (an exact shutter for fast transitions)
          const data = await reel.page.evaluate(async ([ts, o]) => {
            const r = window.__reel, list = Array.isArray(ts) ? ts : [ts];
            let acc = null, w = 0, h = 0;
            for (const t of list) {
              if (o.prepare) await window.SIZZLE.prepare(t);
              if (o.mode === 'scene') r.renderScene(o.scene, t, o.dur, { post: o.post !== false });
              else r.renderOut(t);
              if (list.length === 1) return r.canvas.toDataURL('image/png');
              w = r.canvas.width; h = r.canvas.height;
              const px = r.canvas.getContext('2d').getImageData(0, 0, w, h).data;
              if (!acc) acc = new Float32Array(px.length);
              for (let i = 0; i < px.length; i++) acc[i] += px[i];
            }
            const out = document.createElement('canvas'); out.width = w; out.height = h;
            const g = out.getContext('2d'), im = g.createImageData(w, h);
            for (let i = 0; i < acc.length; i++) im.data[i] = Math.round(acc[i] / list.length);
            g.putImageData(im, 0, 0);
            return out.toDataURL('image/png');
          }, [t, { mode: job.mode || 'out', scene: job.scene, dur: job.dur, post: job.post, prepare: !!job.prepare }]);
          fs.writeFileSync(path.resolve(file), Buffer.from(data.slice(data.indexOf(',') + 1), 'base64'));
          done++;
          if (Date.now() - last > 3000) { last = Date.now(); console.log(`  ${done}/${items.length} frames`); }
        }
      } finally {
        errors.push(...reel.errors);
        await reel.close();
      }
    }));
  } finally {
    await browser.close();
  }
  console.log(`frames: ${done} in ${((Date.now() - t0) / 1000).toFixed(1)} s (${path.basename(job.project)} ${job.mode === 'scene' ? 'scene ' + job.scene : 'cut ' + job.cut})`);
  if (errors.length) {
    console.log('--- console errors ---');
    for (const e of [...new Set(errors)].slice(0, 20)) console.log(e);
    process.exitCode = 1;
  }
}
main().catch(fail);
