# Render pipeline (runtime/stills.mjs, render.mjs, build.mjs)

From a reel project folder `P` (reel.config.json, style.json, scenes/, assets/, build/cut-<cut>.json) to stills,
MP4 masters, covers, share copies and a single-file HTML player. All three tools drive the same page
(`runtime/template.html` + engine/gl/quad/term/compositor + scenes) in headless Chromium, so a still, an MP4 frame
and the HTML player show the identical pixels for the same time.

## 1. Setup

```bash
cd <skill>/runtime && npm install            # playwright-core only (no browser download)
```

- Chromium is auto-detected: `CHROME_PATH`, else playwright-core's own build when installed, else any installed
  Playwright Chromium (newest), else Chrome/Chromium/Edge in the usual macOS, Linux and Windows locations. None:
  `npx playwright install chromium` or set `CHROME_PATH`. Other tools can reuse it:
  `import { findChrome, launchBrowser, openReel } from '<skill>/runtime/stills.mjs'`.
- ffmpeg/ffprobe (libx264; on macOS `aac_at` is used for AAC when present), python3 with fontTools + brotli for
  font subsetting (`pip install fonttools brotli`; without it fonts are embedded whole).
- Launch flags: sRGB colour profile, no background throttling, GPU allowed (`--ignore-gpu-blocklist`) with
  SwiftShader as the fallback for WebGL2 on GPU-less machines (`--enable-unsafe-swiftshader`).
- Prerequisite: `build/cut-<cut>.json` from `timing/plan_cut.py` (missing -> the tools print the exact command).

## 2. Commands

```bash
# stills (times are output seconds; equal to scene seconds unless --scale/--warp)
node <skill>/runtime/stills.mjs --project P --cut 30 1.0 2.5 --out DIR [--sheet] [--range a:b:step] [--cols N] [--thumb 480]
node <skill>/runtime/stills.mjs --project P --cut 30 --out DIR --sheet                 # no times: every scene midpoint
node <skill>/runtime/stills.mjs --project P --cut 30 --transitions --out DIR --sheet   # every boundary: window edges, +-1 frame
node <skill>/runtime/stills.mjs --project P --cut 30 --scene hook --bars 4 --range 0:8:0.25 --out DIR   # one scene alone at any length (--dur s; --post adds frame FX/post)
node <skill>/runtime/stills.mjs --html reel.html --cut 30 12.5 --out DIR               # from a built single file
node <skill>/runtime/stills.mjs --project P --serve [8737]                             # live player at http://127.0.0.1:8737/ (next free port)

# MP4 (master + optional covers and share copy)
node <skill>/runtime/render.mjs --project P --cut 30 --out reel.mp4 [--audio file | --no-audio] [--workers N]
     [--poster T] [--share] [--scale X | --warp "o:s,o:s,..."] [--from a --to b] [--crf 14] [--preset slow] [--title T]
     [--allow-placeholder] [--keep]

# single-file HTML player
node <skill>/runtime/build.mjs --project P --cuts short,30 --out reel.html [--no-audio] [--audio-<cut> file]
     [--scale X | --warp k] [--title T] [--poster T] [--default-cut name] [--exclude regex] [--no-subset]
     [--allow-placeholder] [--verify]

# motion QA of a rendered cut (frozen holds, one-frame pops, near-static holds; section 10)
python3 <skill>/tools/motion_qa.py --video reel.mp4 --cut P/build/cut-30.json [--json report.json] [--strict]
```

Leave the audio flags out: both tools pick each cut's audio from `P/build/` (order in sections 4 and 6), skip
unmastered stems and placeholder (dry-run) narration, and say which file they used and why others were skipped.
Pass `--audio`/`--audio-<cut>` only for a file outside that naming (a variant, an external master). Every tool
prints its usage with `--help`; a wrong flag or a missing input is one line, not a stack trace.

Exit code 1 on any console error, page error, failed request, wrong frame count or untagged colour; warnings
(missing scene -> placeholder, a font that failed to load, in+out phases longer than a scene) are printed.

Placeholder guard (render and build): narration from `tts_gemini.py --dry-run` or `--estimate` is a timing
placeholder. A mix made from it is never auto-picked, an explicit `--audio`/`--audio-<cut>` placeholder is refused,
and a cut whose captions are timed from placeholder narration is refused, all with the exact fix. `--allow-placeholder`
renders anyway for a test and marks the report (`PLACEHOLDER narration (allowed, not for delivery)`).

## 3. How a frame is made

1. The Node side reads the project into a manifest (config, style, cut plans, meta, image and asset URLs, font
   files, audio) and serves the page from disk through an intercepted origin (`http://reel.local/runtime/...`,
   `/project/...`); no web server, no `file://` CORS issues. `--serve` uses the same handler over HTTP for the live
   player (reload after editing a scene).
2. `?render=1` hides the player; the canvas is W x H at device scale 1. `window.__reel.renderOut(T)` maps output
   time to scene time, composes the frame (scenes into buffers, transition, FX, bloom, vignette, HUD, captions,
   grain) and the canvas is read back as PNG.
3. A built HTML carries the same manifest inline (data URIs), so `stills.mjs --html` renders it identically.

## 4. MP4 render

- The cut is split into contiguous frame ranges, one per worker; each worker is its own browser (separate renderer
  and GPU process) that renders frame f, starts its PNG encode with `canvas.toBlob` and collects frames in order 3
  frames later (drawing overlaps encoding), piping PNGs into its own ffmpeg: `libx264rgb -qp 0 -preset ultrafast`
  (lossless RGB chunk, ~2 MB per 1080p frame on disk under `P/build/.render-*`, deleted unless `--keep`).
- Chunks are concatenated and encoded once: `libx264 -preset slow -crf 14 -profile:v high -level:v 4.2 -tune
  animation -x264-params keyint=<fps>:min-keyint=<fps>`, RGB -> BT.709 limited-range yuv420p through `scale` with
  `setparams` tags (recent ffmpeg ignores plain `-color_primaries/-color_trc` for filtered frames and leaves them
  `unknown`), `-movflags +faststart`, `-t` = frames / fps exactly.
- Audio: `--audio file`, else the first of `P/build/mix-<cut>.m4a`, `mix-<cut>.wav`, `music-<cut>.m4a`,
  `music-<cut>.wav` that is neither a `-stem` file nor placeholder narration (resolved before any frame is rendered).
  An `.m4a` is stream-copied (arrange.py and mix_vo.py already checked its true peak: AAC 256k music-only, 192k
  narrated); a `.wav` is encoded to AAC 256k 48 kHz (`aac_at` when available: ffmpeg's native AAC overshoots on
  transients) and padded to the video length. Loudness is the mix's job (`audio.md`, `narration.md`), the renderer
  does not re-level.
- Verification after encode (printed per file): frames == fps x duration, bt709 tags, size, bitrate, audio, cover.
  The report says `ok` only with every frame, the colour tags, an audio stream (unless `--no-audio`) and the
  embedded cover (with `--poster`); anything else, or a console error, exits 1.
- Measured (1920x1080 @ 60, 1800 frames, 16-core Apple Silicon, GPU Chromium): one worker ~9 fps; 6-8 workers
  ~27-28 fps (frames in ~65 s), slow x264 master ~35 s, share copy ~35 s. More workers do not help: the page side
  (PNG encode of grain-heavy frames, readback) saturates first; 6-8 is the sweet spot. Plan ~2-3 min per 30 s of
  1080p60 including covers and the share copy; draft with `--preset ultrafast` and a subset of `--from/--to`.

## 5. Covers and share copies

`--poster T` (output seconds; usually the storyboard's "one scene" or the hook's landed frame):
- `<out>.poster.png`: clean frame at T (for `<video poster>`, READMEs).
- `<out>-cover.png` / `.jpg`: frame + play icon + duration badge; the JPEG is embedded in the MP4 as cover art
  (`attached_pic`, shown by Finder/QuickTime and many messengers).
- `<out>-card.jpg`: 1200x630 share card (cover-cropped frame + play icon + badge).

`--share`: `<out>-share.mp4` from the same lossless frames: CRF 21 capped at 10 Mbps (`-maxrate 10M -bufsize 20M`),
2 s GOP, the master's audio stream copied as is (no second lossy pass), same cover. For chat apps and slow links; the
master stays the reference.

## 6. Single-file HTML

- Inlined: runtime JS (missing optional modules dropped), scenes, manifest (JSON, `<` escaped), every top-level
  image and capture as base64 data URIs, JSON/text assets as data, fonts from `style.fonts.files` subset to every
  character the reel can draw (all code, config, style, cut plans incl. captions, narration, JSON/text assets, ASCII,
  common symbols) as WOFF2, audio per cut as base64 AAC.
- Audio per cut: `--audio-<cut> file`, else the first of `build/mix-<cut>-embed.m4a` (96k), `mix-<cut>.m4a`,
  `mix-<cut>.wav`, `music-<cut>-embed.m4a`, `music-<cut>.m4a`, `music-<cut>.wav` that is neither a `-stem` file nor
  placeholder narration (a `.wav` is encoded to AAC 96k). A cut without audio plays silently with a wall clock.
- Project modules (`P/modules/*.js`, shared painters) are inlined after the runtime and before the scenes.
- Fonts: subset with every name record kept (`--name-IDs=* --name-languages=* --name-legacy`), so the copyright and
  licence strings of an OFL font travel with it; a font whose `fsType` forbids embedding, or without a licence
  record, is reported in an HTML comment and on the console.
- Player: Space play/pause, Left/Right one frame, Shift+Left/Right one second, Home/End, 1-9 select a cut, F
  fullscreen, scrubber, cut buttons (labelled with real output length), poster frame under a play button, controls
  hide while playing. Audio is the master clock while it plays.
- Size: base64 adds ~33 %. Keep images at display size (WebP q 85-92), fonts subset, audio 96k; drop unused captures
  with `--exclude 'captures/raw/'` or keep work files in folders starting with `_` (never packaged). Typical: a
  mascot reel 3-8 MB, a vector/data reel < 2 MB.
- Verification: build.mjs always greps the result for external references (`(src|href)="(https?:)?//|src="[^d]` and
  dev URLs) and for local paths anywhere in the file (`/Users/<name>`, `/home/<name>`, `C:\Users\<name>`, `file://`:
  capture sidecars, run logs and data files carry them); either fails the build. Anonymize the asset
  (`capture_cli.py scan --fix`) or leave it out with `--exclude`. `--verify` copies the HTML alone into an empty temp
  folder, boots it headless, renders every cut and checks font faces, images and audio decode (audio length within
  0.25 s of the cut) with zero console errors and no placeholder narration (unless allowed). Do this for every
  delivered HTML; opening it from the project folder proves nothing.

## 7. Variants (comprehension slow-downs)

Longer cuts are planned at the same BPM (`timing-and-length.md`). Only when a viewer needs more time to read:
- `--scale X`: uniform; output = cut x X (`T -> T / X`).
- `--warp "o:s,o:s,..."`: piecewise-linear knots (output s : scene s), e.g. `0:0,7:7,53:30` keeps the hook at full
  speed and plays the rest at half speed. One cut per build (knots are tied to its length).
- Music is never time-stretched: re-synthesize it for the variant and pass it explicitly (variants never auto-pick
  the base cut's audio):

```bash
python3 <skill>/audio/arrange.py --project P --cut 30 --warp "0:0,7:7,53:30" --out P/build/music-30-warp
node <skill>/runtime/render.mjs --project P --cut 30 --warp "0:0,7:7,53:30" --audio P/build/music-30-warp.wav --out reel-30-warp.mp4
node <skill>/runtime/build.mjs --project P --cuts 30 --warp "0:0,7:7,53:30" --audio-30 P/build/music-30-warp.m4a --out reel-30-warp.html --verify
```

Stills accept the same flags (times are then output seconds).

## 8. QA checklist

- [ ] `stills.mjs --cut <each>` at scene midpoints and `--transitions` boundaries: zero console errors; inspect
  full-resolution PNGs (contact sheets are for navigation only; downscaled sheets can show fake banding).
- [ ] Elasticity: `--scene <id> --bars <minBars>` and `--bars <maxBars>`: same in-phase pixels, hold alive (a frame
  static > 0.5 s is a defect), out-phase ends on the scene end.
- [ ] Motion: `tools/motion_qa.py --video <mp4> --cut P/build/cut-<cut>.json` exits 0 (section 10).
- [ ] No placeholder or error card in any cut; HUD and caption bands clear; captions inside their scenes.
- [ ] Every transition boundary: no one-frame pop, no blank frame, darkness eases across dark/light cuts.
- [ ] MP4: render report says `ok` (frames == fps x duration, bt709, audio, cover); no PLACEHOLDER mark; audio in
  sync (`audio/verify_sync.py`); loudness from the mix (-14 LUFS, <= -1 dBTP).
- [ ] Covers: poster frame chosen on purpose (`--poster T`); card readable at thumbnail size.
- [ ] HTML: `build.mjs --verify` ok; every cut button plays with its own audio; file size reasonable.
- [ ] Determinism: two renders of the same frame are identical (purity); pin the reel version in file names
  (`<slug>-<cut>-v1.0.0.mp4`), never overwrite a delivered file.

## 9. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `No Chromium found` | set `CHROME_PATH` or `npx playwright install chromium` |
| `reel failed to boot` | read the first console error: a scene syntax error, a bad style/config JSON, a missing cut plan |
| Labelled placeholder in frames | `scenes/<id>.js` missing or not registering `SCENES['<id>']` (id typo) |
| Red error card | the scene threw; the message and stack are in the console output |
| `Failed to decode downloaded font` / OTS errors | the font file is invalid for browsers (legacy cmap, `.ttc`); use a TTF/OTF/WOFF2 of the family (`pyftsubset` can rewrite one) |
| Fonts differ between MP4 and HTML | a family only exists on the render machine; add it to `style.fonts.files` |
| GL scene renders flat dots | WebGL2 unavailable (`GL.ok` false): use a GPU machine or keep `--enable-unsafe-swiftshader` (default) |
| Colours slightly off in some players | colour tags missing: the render report flags it; re-encode with this runtime |
| Disk fills during render | lossless chunks ~2 MB/frame (1080p): 30 s needs ~4 GB free; use `--from/--to` ranges |
| `EADDRINUSE` for `--serve` | the next 20 ports are tried; pass another port |
| HTML audio length mismatch in `--verify` | wrong audio for the cut (or a variant without re-synthesized music) |
| `refusing placeholder narration` | the mix or captions come from a dry run or estimate: synthesize the voice, `mix_vo.py`, re-plan; `--allow-placeholder` only for a test |
| `local paths in the HTML` | an asset or data file carries `/Users/<name>` or `file://`: `capture_cli.py scan --fix`, edit the data, or `--exclude` it |
| Render report `no audio stream` | no mastered audio in `P/build/` for the cut (or only a stem): run `audio/arrange.py`, or pass `--no-audio` for a draft |

## 10. Motion QA (tools/motion_qa.py)

Frame differencing over the rendered MP4 (or a folder of stills: `--frames DIR --fps N`). Every frame is reduced to
320x180 grey with an area filter, which averages film grain away.

| Finding | Rule (defaults) | Usual fix |
|---|---|---|
| frozen | every `--still` 0.5 s window in a stretch is dead: fewer than `--alive-share` 0.05 % of the pixels vary by more than `--level` 4 levels inside it (one twinkle, a caret or a slow soft drift counts as alive) | give the hold a beat-locked idle (`motion-recipes.md`), or shorten the scene |
| pop | a frame whose mean change exceeds `--pop` 8 x the median of its +-6-frame neighbourhood and `--pop-min` 6 levels, away from the cut's boundaries and cues (+-2 frames) | an element appearing without an in-ease: ease it over >= 0.12 s or put it on a cue |
| near-static (with `--cut`) | a hold in which less than `--hold-area` 1 % of the picture changes per second (median of 1-s windows): it only drifts | add a focus walk, a beat-locked accent or a second layer of motion; fails with `--strict` |

`--cut P/build/cut-<cut>.json` adds the per-scene report and exempts boundaries and cues; `--json` writes the full
report. Exit 0 clean, 1 frozen runs or pops (or near-static holds with `--strict`), 2 bad input. Run it on the
delivered render of every cut; a stills sheet cannot show a freeze or a pop.
