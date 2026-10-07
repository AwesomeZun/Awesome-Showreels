#!/usr/bin/env node
// render.mjs: render a cut to MP4. N headless pages render frames in parallel, each piping PNGs into a lossless
// chunk (libx264rgb -qp 0); the chunks are concatenated and encoded once (x264 high, bt709, faststart, AAC).
//
//   node render.mjs --project P --cut 30 --out reel.mp4 [--audio file | --no-audio] [--workers N] [--poster T] [--share]
//                   [--scale X | --warp "o:s,o:s,..."] [--from a --to b] [--html reel.html] [--crf 14]
//                   [--preset slow|medium|ultrafast] [--title T] [--allow-placeholder] [--keep]
//
// --poster T   cover images from output time T: <out>.poster.png (clean frame), <out>-cover.png/.jpg (play icon +
//              duration badge, embedded in the MP4 as cover art) and <out>-card.jpg (1200x630 share card).
// --share      also writes <out>-share.mp4 capped near 10 Mbps for messengers (audio copied from the master).
// --preset     x264 preset of the master (default slow; ultrafast for timing drafts). --crf default 14.
// --title      MP4 title metadata (default reel.config title); the cut name is appended.
// Audio default: P/build/mix-<cut>.m4a|.wav, else music-<cut>.m4a|.wav (an .m4a is copied as encoded and true-peak
//              checked by arrange.py / mix_vo.py; a .wav is encoded to AAC 256k). Unmastered stems and placeholder
//              (dry-run) mixes are skipped; an explicit --audio placeholder needs --allow-placeholder.
// The report line per file says ok only with every frame, bt709 tags, an audio stream (unless --no-audio) and the
// embedded cover (with --poster); exit code 1 otherwise or on console errors.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { openReel, parseArgs, rel, readJSON, SKILL, pickAudio, audioStatus, placeholderCaptions, printHelp, fail, userError } from './stills.mjs';

const ff = (args, o = {}) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['ignore', 'inherit', 'inherit'], ...o });
const probe = f => JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=index,codec_type,codec_name,nb_frames,r_frame_rate,width,height,pix_fmt,bit_rate,duration,color_space,color_primaries,color_transfer:stream_disposition=attached_pic:format=duration,bit_rate,size', '-of', 'json', f]).toString());
let AAC = null;
function aacEncoder() {
  if (AAC) return AAC;
  try { AAC = /\baac_at\b/.test(execFileSync('ffmpeg', ['-hide_banner', '-encoders'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString()) ? 'aac_at' : 'aac'; }
  catch { AAC = 'aac'; }
  return AAC;
}
// AudioToolbox AAC avoids the transient overshoot of ffmpeg's native encoder when available (macOS).
const aacArgs = kbps => (aacEncoder() === 'aac_at' ? ['-c:a', 'aac_at', '-b:a', `${kbps}k`, '-ar', '48000'] : ['-c:a', 'aac', '-b:a', `${kbps}k`, '-ar', '48000']);
function fmtDur(s) { return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`; }

async function main() {
  const a = parseArgs(process.argv.slice(2), { flags: ['share', 'keep', 'no-audio', 'allow-placeholder', 'help'] });
  if (a.help || (!a.project && !a.html) || !a.out) {
    printHelp(import.meta.url);
    process.exit(a.help ? 0 : 2);
  }
  const out = path.resolve(a.out), base = out.replace(/\.mp4$/i, '');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const P = a.project ? path.resolve(a.project) : null;
  const bail = msg => { throw userError(msg); };
  const openOpts = { project: P, html: a.html, cut: a.cut, scale: a.scale, warp: a.warp };
  const t0 = Date.now();

  // probe: duration, size, fps and a clean boot before spawning workers
  const pr = await openReel(openOpts);
  const { W, H, fps, OUT, cut } = pr.info;
  await pr.close();
  if (pr.errors.length) console.log('probe console errors:\n' + pr.errors.join('\n'));
  const F0 = Math.max(0, Math.round((+a.from || 0) * fps)), F1 = Math.min(Math.round(OUT * fps), a.to !== undefined ? Math.round(+a.to * fps) : Infinity);
  const nFrames = F1 - F0;
  if (nFrames <= 0) bail('nothing to render (check --from/--to)');
  const workers = Math.max(1, Math.min(+a.workers || Math.min(8, Math.max(2, Math.floor(os.cpus().length / 2))), nFrames));
  console.log(`render cut ${cut}: ${W}x${H} @ ${fps} fps, ${nFrames} frames (${(nFrames / fps).toFixed(3)} s), ${workers} workers`);

  // audio (resolved before rendering, so a refused placeholder costs nothing)
  let audio = null, audioSt = null;
  const variant = (a.scale && +a.scale !== 1) || a.warp;
  const allowPh = !!a['allow-placeholder'];
  if (P) {
    const cf = path.join(P, 'build', `cut-${cut}.json`), cfgF = path.join(P, 'reel.config.json');
    const tryJSON = f => { try { return readJSON(f); } catch { return null; } };
    const plan = tryJSON(cf), cfg = tryJSON(cfgF) || {}, style = tryJSON(path.resolve(P, cfg.style || 'style.json')) || {};
    if (plan && placeholderCaptions(cfg, style, plan) && !allowPh) bail(`cut ${cut} burns in captions timed from placeholder narration (estimate / dry-run). Synthesize the real voice and re-plan, turn captions off for a music-only cut, or pass --allow-placeholder for a test render.`);
  }
  if (!a['no-audio']) {
    if (a.audio) {
      audio = path.resolve(a.audio);
      if (!fs.existsSync(audio)) bail(`--audio not found: ${a.audio}`);
      audioSt = audioStatus(audio);
      if (audioSt.placeholder && !allowPh) bail(`--audio ${a.audio} is ${audioSt.label}. Synthesize the real voice (narration/tts_gemini.py batch, then mix_vo.py), or pass --allow-placeholder for a test render.`);
    } else if (P && !variant) {
      const pick = pickAudio(P, cut, { target: 'mp4', allowPlaceholder: allowPh });
      for (const sk of pick.skipped) console.log(`audio: skipped build/${sk}`);
      audio = pick.file; audioSt = pick.status;
    }
    if (audioSt && audioSt.unverified.length) console.log(`audio: !! narration clips not verified by speech-to-text: ${audioSt.unverified.join(', ')}`);
    if (audio) console.log(`audio: ${rel(audio)}` + (audioSt && audioSt.label ? `  !! ${audioSt.label}` : ''));
    else if (variant) console.log(`audio: none. A time-mapped variant needs re-synthesized music (never a stretched mix):\n  python3 ${rel(path.join(SKILL, 'audio/arrange.py'))} --project ${P ? rel(P) : 'P'} --cut ${cut} ${a.warp ? `--warp "${a.warp}"` : `--scale ${a.scale}`} --out <base>  then  --audio <base>.wav`);
    else console.log('audio: none found (silent MP4); pass --audio, run audio/arrange.py, or --no-audio for an intended silent draft');
  }

  // frames -> lossless chunks
  if (P) fs.mkdirSync(path.join(P, 'build'), { recursive: true });
  const tmp = fs.mkdtempSync(path.join(P ? path.join(P, 'build') : os.tmpdir(), '.render-'));
  let done = 0, lastLog = 0;
  const errors = [];
  const per = Math.ceil(nFrames / workers);
  const chunk = async k => {
    const a0 = F0 + k * per, b0 = Math.min(F0 + (k + 1) * per, F1);
    if (a0 >= b0) return null;
    const reel = await openReel(openOpts);
    const file = path.join(tmp, `chunk${String(k).padStart(2, '0')}.mkv`);
    const enc = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
      '-c:v', 'libx264rgb', '-qp', '0', '-preset', 'ultrafast', file], { stdio: ['pipe', 'inherit', 'inherit'] });
    const closed = new Promise((res, rej) => enc.on('close', c => (c === 0 ? res() : rej(new Error(`ffmpeg chunk ${k} exited ${c}`)))));
    try {
      // Pipelined capture: render frame f, start its async PNG encode (toBlob copies the bitmap at call time), and
      // collect frames in order DEPTH frames later, so drawing overlaps encoding.
      await reel.page.evaluate(() => {
        const q = new Map();
        window.__grabStart = (f, T) => {
          const r = window.__reel;
          r.renderOut(T);
          q.set(f, new Promise((res, rej) => r.canvas.toBlob(b => {
            if (!b) return rej(new Error('toBlob failed'));
            const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => rej(fr.error); fr.readAsDataURL(b);
          }, 'image/png')));
        };
        window.__grabTake = async f => { const d = await q.get(f); q.delete(f); return d; };
      });
      const DEPTH = 3, inflight = [];
      const take = async f => {
        const data = await reel.page.evaluate(f => window.__grabTake(f), f);
        const buf = Buffer.from(data.slice(data.indexOf(',') + 1), 'base64');
        if (!enc.stdin.write(buf)) await new Promise(r => enc.stdin.once('drain', r));
        done++;
        const now = Date.now();
        if (now - lastLog > 2000) {
          lastLog = now;
          const el = (now - t0) / 1000, rate = done / el;
          console.log(`  ${done}/${nFrames} frames · ${rate.toFixed(1)} fps · eta ${((nFrames - done) / rate).toFixed(0)} s`);
        }
      };
      for (let f = a0; f < b0; f++) {
        await reel.page.evaluate(([f, T]) => window.__grabStart(f, T), [f, f / fps]);
        inflight.push(f);
        if (inflight.length >= DEPTH) await take(inflight.shift());
      }
      while (inflight.length) await take(inflight.shift());
    } finally {
      enc.stdin.end();
      await closed;
      errors.push(...reel.errors.map(e => `worker ${k}: ${e}`));
      await reel.close();
    }
    return file;
  };
  const files = (await Promise.all(Array.from({ length: workers }, (_, k) => chunk(k)))).filter(Boolean);
  const list = path.join(tmp, 'list.txt');
  fs.writeFileSync(list, files.map(f => `file '${f.replace(/'/g, "'\\''")}'`).join('\n'));
  console.log(`frames done in ${((Date.now() - t0) / 1000).toFixed(1)} s`);

  const dur = nFrames / fps;
  // audio input, seeked to the first rendered frame so partial renders (--from) stay in sync
  const audioIn = audio ? [...(F0 > 0 ? ['-ss', (F0 / fps).toFixed(6)] : []), '-i', audio] : [];
  const audioArgs = (kbps, copyOk) => {
    if (!audio) return [];
    const isAac = /\.(m4a|aac|mp4)$/i.test(audio);
    return isAac && copyOk ? ['-map', '1:a', '-c:a', 'copy'] : ['-map', '1:a', ...aacArgs(kbps), '-af', 'apad'];
  };
  const colour = ['-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv'];
  // RGB -> BT.709 limited-range 4:2:0 with the matching tags (setparams; plain -color_* flags are ignored for filtered
  // frames by recent ffmpeg, which leaves primaries/transfer 'unknown' and shifts colours in some players).
  const vfilter = ['-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int,format=yuv420p,setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv'];
  const level = W * H <= 1920 * 1088 && fps <= 60 ? ['-level:v', '4.2'] : [];
  const title = a.title || pr.info.title || '';
  const meta = ['-metadata', `title=${title ? `${title} · ${cut}` : cut}`, '-metadata', 'comment=Made with motion-showreel'];

  // master encode
  const master = path.join(tmp, 'master.mp4');
  ff(['-f', 'concat', '-safe', '0', '-i', list, ...audioIn, '-map', '0:v', ...vfilter,
    '-c:v', 'libx264', '-preset', a.preset || 'slow', '-crf', String(a.crf ?? 14), '-profile:v', 'high', ...level, '-tune', 'animation',
    '-x264-params', `keyint=${fps}:min-keyint=${fps}`, ...colour, ...audioArgs(256, true), '-t', dur.toFixed(6), ...meta, '-movflags', '+faststart', master]);

  // covers
  let coverJpg = null;
  if (a.poster !== undefined) {
    const T = Math.min(Math.max(0, +a.poster || 0), Math.max(0, OUT - 1 / fps));
    const reel = await openReel(openOpts);
    const grab = async o => { const d = await reel.page.evaluate(([T, o]) => window.__reel.renderPoster(T, o), [T, o]); return Buffer.from(d.slice(d.indexOf(',') + 1), 'base64'); };
    fs.writeFileSync(`${base}.poster.png`, await grab({}));
    fs.writeFileSync(`${base}-cover.png`, await grab({ play: true, badge: true }));
    fs.writeFileSync(`${base}-card.jpg`, await grab({ play: true, badge: true, w: 1200, h: 630, type: 'image/jpeg', quality: 0.9 }));
    await reel.close();
    coverJpg = `${base}-cover.jpg`;
    ff(['-i', `${base}-cover.png`, '-q:v', '2', coverJpg]);
    console.log(`covers: ${rel(base + '.poster.png')}, ${rel(base + '-cover.png')} (+ .jpg, embedded), ${rel(base + '-card.jpg')}`);
  }
  const attach = (src, dst) => {
    if (!coverJpg) { fs.copyFileSync(src, dst); return; }
    ff(['-i', src, '-i', coverJpg, '-map', '0', '-map', '1', '-c', 'copy', '-c:v:1', 'mjpeg', '-disposition:v:1', 'attached_pic', '-movflags', '+faststart', dst]);
  };
  attach(master, out);

  // share copy (10 Mbps ceiling) from the same lossless frames; the master's AAC stream is copied, so the share copy
  // keeps the master's measured loudness and true peak (a second lossy encode can overshoot -1 dBTP).
  if (a.share) {
    const sm = path.join(tmp, 'share.mp4');
    ff(['-f', 'concat', '-safe', '0', '-i', list, ...(audio ? ['-i', master] : []), '-map', '0:v', ...vfilter,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-maxrate', '10M', '-bufsize', '20M', '-profile:v', 'high', ...level,
      '-x264-params', `keyint=${fps * 2}:min-keyint=${fps}`, ...colour, ...(audio ? ['-map', '1:a', '-c:a', 'copy'] : []), '-t', dur.toFixed(6), ...meta, '-movflags', '+faststart', sm]);
    attach(sm, `${base}-share.mp4`);
  }

  // verify
  const report = f => {
    const pj = probe(f), v = pj.streams.find(s => s.codec_type === 'video' && !(s.disposition && s.disposition.attached_pic)), au = pj.streams.find(s => s.codec_type === 'audio');
    const frames = +v.nb_frames, want = nFrames;
    const tagged = v.color_space === 'bt709' && v.color_primaries === 'bt709' && v.color_transfer === 'bt709';
    const cover = pj.streams.some(s => s.disposition && s.disposition.attached_pic);
    const audioOk = !!au || !!a['no-audio'], coverOk = cover || a.poster === undefined;
    const placeholder = !!(au && audioSt && audioSt.placeholder);
    const ok = frames === want && tagged && audioOk && coverOk && (!placeholder || allowPh);
    console.log(`${ok ? 'ok ' : 'BAD'} ${rel(f)}: ${v.width}x${v.height} ${v.codec_name} ${v.pix_fmt} ${tagged ? 'bt709' : `colour tags ${v.color_space}/${v.color_primaries}/${v.color_transfer}`} · ${frames}/${want} frames · ${fmtDur(+pj.format.duration)} · ${(+pj.format.size / 1048576).toFixed(1)} MB · ${(+pj.format.bit_rate / 1e6).toFixed(1)} Mbps` +
      (au ? ` · audio ${au.codec_name}${au.bit_rate ? ' ' + Math.round(au.bit_rate / 1000) + 'k' : ''}` : a['no-audio'] ? ' · no audio (--no-audio)' : ' · NO AUDIO') +
      (cover ? ' · cover' : a.poster !== undefined ? ' · NO COVER' : '') + (placeholder ? ' · PLACEHOLDER narration' + (allowPh ? ' (allowed, not for delivery)' : '') : ''));
    return ok;
  };
  let good = report(out);
  if (a.share) good = report(`${base}-share.mp4`) && good;
  if (!a.keep) fs.rmSync(tmp, { recursive: true, force: true });
  else console.log('kept', rel(tmp));
  const uniq = [...new Set(errors.map(e => e.replace(/^worker \d+: /, '')))];
  if (uniq.length) { console.log('--- console errors ---\n' + uniq.join('\n')); process.exitCode = 1; }
  if (!good) process.exitCode = 1;
  console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
main().catch(fail);
