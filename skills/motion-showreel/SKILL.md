---
name: motion-showreel
description: >-
  Produce premium 2D motion-graphics showreels (an MP4 per cut plus a single-file HTML player) from any source
  material: a GitHub repo or README, markdown, a paper or PDF, a slide deck, a website, a brand guide, screenshots.
  It derives the material's tone and manner into style.json; picks the visual carriers the story needs (code-drawn
  vector always; mascot cutouts via GPT-image-2, macOS Vision and OpenCV; real app UI, terminal and CLI captures; PDF
  figures, web shots, data viz); plans 15/30/60-s cuts on one fixed-BPM bar grid; synthesizes beat-synced music; adds
  optional Gemini TTS narration; and verifies sync, loudness and self-containment. Use for a showreel, sizzle reel,
  teaser, launch or pitch video, an explainer reel from a repo, paper or deck, "make a 30-second reel", to re-cut or
  lengthen such a reel at the same tempo, or 쇼릴, 모션그래픽, 홍보 영상. Not for making slide decks or static
  posters, or for editing camera footage or screen recordings.
---

# motion-showreel

You are the motion designer and the producer. Every frame is code: a Canvas2D/WebGL2 runtime renders pure
functions of time, so stills, the MP4 and the HTML player show identical pixels. Real captures, cutouts and data
are carriers inside that code-drawn world. `S` below is this skill's base directory (the folder holding this file);
`P` is the reel project folder.

## The designer's mindset

- **The material decides the look.** There are no presets. Palette, type, pace, transitions, sound and voice come
  from the source (`tools/extract_style.py` measures, you interpret). Two sources about the same subject must give
  two different reels when their tone differs (compare `examples/playful-app` and `examples/research-cli`).
- **One sentence, one scene, one message.** Write them before any code. The scene becomes the poster frame, the
  message becomes the end card. Every scene serves the sentence; cut what does not.
- **Prove, do not decorate.** Each scene has one hero carrier, and for claims it is the real thing: the app's own UI,
  the command's own output, the paper's own figure, the run's own numbers. Code-drawn vector frames and connects them.
- **Rhythm is the grid.** One BPM per project, scenes on bar lines, entrances landing on beats, every SFX a cue in
  the same plan the picture reads. Sound and picture cannot drift because they share one cue list.
- **Elastic, never slow.** A longer cut adds bars (living holds, secondary beats, optional scenes). Animations
  always run at 1x; nothing is static for more than 0.5 s.
- **Every frame is a poster.** Opaque background, clear hierarchy (kicker, headline, subline, meta), one accent
  keyword, generous margins, readable for the time it is on screen.
- **Evidence over intuition.** Judge full-resolution frames, measured sync, loudness and motion, and a copy of the
  HTML opened alone; contact sheets are for navigation only. Show drafts early.

## Setup (once per machine; on first use, and again after a plugin update replaces the skill folder)

```bash
(cd "$S/runtime" && npm install)    # playwright-core only; Chromium: CHROME_PATH, Playwright's, or system Chrome/Edge
python3 -m pip install numpy scipy pillow opencv-python pymupdf fonttools brotli   # in a venv if pip refuses
```

Required: Node 20+, Python 3.9+ with numpy, scipy, Pillow and opencv-python (cutouts, text-free UI plates),
ffmpeg with libx264. Optional: PyMuPDF (PDFs), fontTools + brotli (font subsets in the HTML), macOS 14+ with
`swiftc` (Vision cutouts), `soffice` (pptx/odp), poppler, the Codex CLI with a ChatGPT login (GPT-image-2 poses),
`GEMINI_API_KEY` (narration). Regression tests: `python3 -B -m unittest discover -s tests` and
`node --test tests/*.test.mjs` from the repo root.

## Project folder `P`

```
P/source/            the material (or pointers to it)
P/style.json         tone & manner spec, derived from the source (schema: templates/style.schema.json)
P/STORYBOARD.md      brief, exact copy, banned wording, disclaimers, provenance, beat tables
P/reel.config.json   scenes (bars, in/out beats, transitions, music parts, cues), cuts, HUD, captions
P/scenes/<id>.js     one IIFE per scene: SCENES['<id>'] = { draw(ctx, t, env), portal?(t, env) }
P/modules/*.js       optional shared code several scenes use (a code-drawn cast, a data loader); loads before scenes
P/capture/*.json     capture specs for tools/capture_ui.mjs
P/assets/            *.webp cutouts + meta.json; captures/ui|term|pdf/ with json sidecars; data files (all ship)
P/assets.json        cutout recipe for tools/prep_assets.py (optional)
P/narration.json     voice-over lines (optional)
P/build/             generated, never hand-edited: cut-<cut>.json, music, stems, mixes, captions, style board, QA
```

## Decide four things first

Ask the user only what the material cannot answer (audience and venue, the cuts they need, narration, consent
for paid generation); otherwise default to a 30-s and a 15-s cut, music-led unless the tone pass recommends a voice.

1. **Tone & manner -> `P/style.json`.** Run the extractor, read `P/build/style-extract.md` and the board, then read
   the material yourself and overrule the draft wherever the evidence says otherwise (hex codes in prose or tables
   may describe other things than the project; the extractor flags accents that come only from text). Keep each
   `rationale` true, clear `review`, set `meta.draft` to `false`. Copy the source's exact copy, register, banned
   wording and disclaimers into the storyboard. (`references/tone-and-manner.md`)
2. **Visual carriers per scene.** Vector and kinetic type always. Then ask: what is the proof (real UI, terminal
   cast, figure, data), what is the face (mascot, logo, one giant number), where does it live (phone, terminal,
   paper, browser)? Use `references/visual-sources.md` section 4. Mascot poses only extend the client's own mascot,
   only with the user's consent (each image spends their ChatGPT quota): `tools/imagegen.md`.
3. **Narration on or off.** On for papers, docs, explainers, pitches and data-heavy claims; off for playful launch
   and brand teasers, 20-s-or-shorter cuts and muted autoplay. `style.narration.recommended` is a draft; ask the
   user when it matters. Real TTS needs `GEMINI_API_KEY` and spends quota: plan with `--dry-run` first. Dry-run
   clips and the captions timed from them are placeholders: render and build refuse them in deliverables.
   (`references/narration.md`)
4. **Length.** Default 30 s, plus a 15-s cut edited on its own (not trimmed). 60 s or more only with optional scenes
   written for it (see "Extend to a longer cut"). Same BPM and the same in/out choreography in every cut; the planner
   adds bars. Slow-down variants (`--scale`, `--warp`) exist only for viewers who must read dense material, and are
   labelled as variants. (`references/timing-and-length.md`)

| Request | Read first |
|---|---|
| app or product with a mascot | visual-sources §4, imagery, capture §2, recipes 3, 11, 18 |
| paper or PDF explainer | narration, capture §5, recipes 23, 27, 35 |
| CLI tool or developer repo | capture §3, recipes 29, 36, timing §6 |
| website or docs | capture §2, recipe 36 |
| lengthen or re-cut a reel | "Extend to a longer cut" below, timing §6, storyboard §6 |
| a reference video to match | storyboard §7 |

## Procedure

```bash
# 0. Project from templates (narration.template.json leaves voice/style/lang to style.json on purpose)
mkdir -p P/source P/scenes P/assets
cp "$S/templates/reel.config.template.json" P/reel.config.json
cp "$S/templates/STORYBOARD.template.md" P/STORYBOARD.md       # + templates/narration.template.json if narrated

# 1. Tone pass (add --purpose/--audience/--lang/--theme/--narration hints from the brief; --offline without network)
python3 "$S/tools/extract_style.py" --source P/source [more files|dirs|urls] --project P --board
python3 "$S/tools/extract_style.py" --validate P/style.json
python3 "$S/tools/extract_style.py" --project P --board-only           # after editing style.json

# 2. Storyboard + plan (STORYBOARD.md and reel.config.json per references/storyboard.md), then every cut
python3 "$S/timing/plan_cut.py" --project P --cut 15,30 --strict        # read the table: grow/max/OVER, notes, WARN

# 3. Carriers (only the ones the storyboard needs; see references/capture.md and references/imagery.md)
node "$S/tools/capture_ui.mjs" --spec P/capture/app.json               # real web/app UI as layers (--example prints a spec)
python3 "$S/tools/capture_cli.py" --cmd "tool run" --out P/assets/captures/term/run.cast --cols 100 --rows 30 --cwd <demo dir>
python3 "$S/tools/capture_cli.py" scan P/assets/captures/term/run.cast # must exit 0: no secret, home path, user or host name
python3 "$S/tools/pdf_figures.py" paper.pdf --out P/assets/captures/pdf --style P/style.json --sheet [--find "quoted sentence"]
python3 "$S/tools/prep_assets.py" --project P                          # P/assets.json -> cutouts, blinks, QA sheets

# 4. Scenes: write P/scenes/<id>.js (references/engine-api.md, references/motion-recipes.md), then look
node "$S/runtime/stills.mjs" --project P --cut 30 --range 0:30:0.25 --out P/build/review/30 --sheet
node "$S/runtime/stills.mjs" --project P --cut 30 --transitions --out P/build/review/30-tr --sheet
node "$S/runtime/stills.mjs" --project P --cut 30 --scene <id> --bars <minBars> --range 0:8:0.25 --out P/build/review/<id>
node "$S/runtime/stills.mjs" --project P --serve                       # live player for the client
node "$S/runtime/render.mjs" --project P --cut 30 --out P/build/draft-30.mp4 --preset ultrafast --no-audio   # timing draft

# 5. Sound from the same plan, then prove the sync (every cut)
python3 "$S/audio/arrange.py" --project P --cut 30                     # music-30.wav/.m4a/-embed.m4a/.json
python3 "$S/audio/verify_sync.py" --wav P/build/music-30.wav --cut P/build/cut-30.json

# 6. Deliver: an MP4 per cut, one HTML with every cut (versioned names; never overwrite a delivered file)
node "$S/runtime/render.mjs" --project P --cut 30 --out <slug>-30-v1.0.0.mp4 --poster <T> --share
python3 "$S/tools/motion_qa.py" --video <slug>-30-v1.0.0.mp4 --cut P/build/cut-30.json       # frozen runs, pops, holds
node "$S/runtime/build.mjs" --project P --cuts 15,30 --out <slug>-v1.0.0.html --verify      # picks each cut's 96k audio
ffmpeg -i <slug>-15-v1.0.0.mp4 -vf "fps=12,scale=600:-1:flags=lanczos,hqdn3d=3:2:5:4,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle" <slug>-15-v1.0.0.gif   # README loop < 5 MB (the light denoise drops film grain, which doubles a GIF)
```

**Narrated cuts** replace step 5 (`references/narration.md`):

```bash
python3 "$S/narration/vo_timeline.py" --project P --estimate           # plan from text estimates, no network
python3 "$S/narration/tts_gemini.py" batch --project P --dry-run       # placeholder clips: test the chain offline
python3 "$S/narration/tts_gemini.py" batch --project P                 # real voice, verified by STT (user consent)
python3 "$S/narration/vo_timeline.py" --project P                      # real durations -> vo-minbars.json
python3 "$S/timing/plan_cut.py" --project P --cut 30                   # minimums grow in whole bars, BPM unchanged
python3 "$S/narration/captions.py" --project P --cut 30                # after EVERY plan_cut.py run
python3 "$S/audio/arrange.py" --project P --cut 30 --stem              # unmastered bed: music-30-stem.wav (song kept)
python3 "$S/narration/mix_vo.py" --project P --cut 30                  # ducked mix-30.wav/.m4a/-embed.m4a (+ .json)
python3 "$S/audio/verify_sync.py" --wav P/build/mix-30.wav --cut P/build/cut-30.json
node "$S/runtime/render.mjs" --project P --cut 30 --out <slug>-30-vo-v1.0.0.mp4    # picks the mix (never a placeholder)
```

Captions burn in when reel.config `captions.enabled` is true, or, when reel.config does not set it,
`style.layout.captions.enabled` is true (the tone pass turns it on for narrated reels). `narration.json` `voice`,
`style` and `lang` override `style.json` narration: set them there only on purpose.

**Extend to a longer cut** (same BPM, same pace):

1. Add the cut to reel.config `cuts` (`"60": {"seconds": 60}`), exclude the new scenes from the shorter cuts, and
   raise `maxBars` per cut (`"scenes": {"results": {"maxBars": 5}}`) only where the hold has scheduled beats.
2. `plan_cut.py --cut 60 --strict`: an `OVER` or "bars left" warning means content is missing. Write optional
   scenes (priority 3+) and hold beats (`onBars`), never a slower animation.
3. Render every changed scene alone at its new length (`stills.mjs --scene <id> --bars <n>`) and run `motion_qa.py`
   on the cut: no frozen run, no near-static hold.
4. Narration: add the cut to the lines' `cuts` lists and write lines for the new scenes, then re-run
   `vo_timeline.py`, `plan_cut.py`, `captions.py` (the planner warns when a longer cut drops lines, and when
   narration.json changed after `vo_timeline.py` last ran).
5. `arrange.py --cut 60`, then `verify_sync.py`: the BPM must equal the shorter cuts'. A long end card keeps a
   2-bar ring-out (`audio.outroMaxBars`).
6. Render, then build the HTML with every cut under a new version. An MP4 without its project cannot be
   lengthened at the same pace: rebuild the project, never time-stretch the video or the music.

**Many scenes or a deadline:** offer the multi-agent production in `templates/showreel-workflow.js` (a Claude Code
Workflow script: tone, storyboard, assets, narration, build/review/fix per scene, integrator checks; about 25-40
agents) and run it only with the user's go-ahead; `stopAfter: "tone"` or `"storyboard"` pauses for approval, and
narration stays a TTS dry run unless `liveTts: true`. Or follow `references/multi-agent.md` with subagents. Build the
harness first (style, storyboard, plan, assets, stub scenes, a rendering timing draft), then fan out.

## Scene rules (binding for every scene file)

- An IIFE that only assigns `SCENES['<id>']`; helpers and recipes live inside it; code several scenes share goes
  into a project module (`P/modules/*.js`), never into another scene. Pure in `(t, env)`: no `Math.random`, `Date`,
  `performance.now` or carried state (use `hash()`). Paint the full opaque frame first.
- Valid for local time `[-0.7 s, dur + 0.7 s]`; transitions draw neighbours outside their range. A scene entered by
  `zoomInto` draws an establishing image where the outgoing window is (`REEL.entryPortal(env)`), never an empty stage.
- Elastic: entrances from `env.lt` in beats (in-phase), idle life plus `onBars`/`onBeats` beats in the hold, exits
  from `env.phase.out`. Never time a visible speed with `lt / dur`. Check it at `minBars` and `maxBars`.
- Grain, vignette, bloom, HUD, captions and transitions belong to the compositor; whole-frame flash, shake and zoom
  go through `env.fx`. A night-stage scene is `"dark": true` in reel.config; on a light reel it then receives
  `style.paletteAlt` as `env.palette`.
- Colours from `env.palette`, fonts from the style roles, springs and easing from `env.style.motion`, copy
  verbatim from STORYBOARD.md. Keep the HUD and caption bands free.

## Quality bar

- **Design:** composition and hierarchy hold at every sampled frame; text meets its reading time (0.5 s + 0.25 s per
  word, CJK 0.08 s per character) and contrast (every text role, muted and disclaimers included, >= 4.5:1; display
  >= 3:1); one hero carrier per scene.
- **Motion:** springs and eases from the style, landings on beats, overshoot and settle, no one-frame pops, no
  seams or blank frames at boundaries, darkness eases across dark/light cuts, holds alive (`motion_qa.py` clean).
- **Honesty:** real captures stay real (`capture_cli.py`, `capture_ui.mjs`, `pdf_figures.py`); every number has a
  provenance row; staged data says "demo data" or "illustrative" on screen; credits separate computed from authored.
- **Sound:** every cue within one frame (`verify_sync.py` PASS), -14 LUFS integrated, true peak <= -1 dBTP after AAC.
- **Delivery:** MP4 per cut (1920x1080, 60 fps, H.264 CRF 14, bt709, AAC 256k music-only or the 192k narrated mix,
  cover embedded), a share copy, covers and a 1200x630 card, a single-file HTML with every cut that passes
  `build.mjs --verify`, SRT/VTT when narrated.

## QA checklist (integrator, every cut)

- [ ] `plan_cut.py --strict` clean; every WARN or note understood; boundaries on bar lines.
- [ ] Stills every 0.25 s and `--transitions` with zero console errors; full-resolution frames inspected at every
      boundary, cue, hold sample and completed line of copy.
- [ ] Elasticity: each scene alone at `minBars` and `maxBars`; same in-phase pixels, living hold.
- [ ] `motion_qa.py` on every MP4: no frozen run > 0.5 s, no unexplained pop, no near-static hold.
- [ ] Copy diffed against STORYBOARD.md; banned-wording regexes grep clean; disclaimers visible >= 2 s.
- [ ] `grep -nE 'Math\.random|Date\.now|performance\.now|new Date' P/scenes/*.js P/modules/*.js` is empty.
- [ ] `verify_sync.py` PASS on the file that ships (WAV, mix or the MP4 itself); loudness from its report.
- [ ] Narrated: no dry-run clip or placeholder caption left (render/build refuse them), every clip verified by STT
      (`tts_gemini.py audit`), captions inside their scenes, SRT/VTT written.
- [ ] Render report `ok` for the master and the share copy (frames = fps x duration, bt709 tags, an audio stream
      unless `--no-audio`, the cover with `--poster`).
- [ ] `build.mjs --verify` ok; no external references or local paths; every cut plays its own audio from an empty folder.

## Pitfalls that already cost time

- Contact sheets and `montage` show fake banding: inspect full-resolution PNGs before fixing colour.
- Scenes that reset transforms break ctx-transform zooms; the compositor composites scene buffers as images, so
  never rely on a transform surviving `draw`.
- UI capture: never pause CSS animations to freeze a state (entrance animations freeze at opacity 0); set states
  on a static clone (`capture_ui.mjs` does both). Cross-fade only the content band between two app screens.
- CLI capture runs the command for real: capture in a throwaway copy or demo folder (`--cwd`), with demo
  credentials, prefer the tool's own `--dry-run`, and ask before anything that deploys, publishes, migrates,
  deletes or spends quota (`capture_cli.py` refuses such commands without `--allow-side-effects`).
- Gemini TTS reads plain-text instructions aloud: use bracket tags (`[fast, energetic]`). Extract only the WAV
  `data` chunk; verify every clip by speech-to-text, matched by clip number. Never print or log the key.
- Codex image generation: `-i` is variadic, so put `--` before the prompt and close stdin with `</dev/null`.
- AAC decodes about one frame longer than the cut; when muxing by hand use `ffmpeg ... -c copy -shortest`.
- zsh: quote `yt-dlp` output templates; macOS: `sed -i ''`; check `ps` for background jobs before re-rendering.

## References (read on demand)

| File | Read when |
|---|---|
| `references/tone-and-manner.md` | deriving or reviewing style.json; interpretation tables; source kinds; case studies |
| `references/visual-sources.md` | choosing carriers; decision matrix; honesty rules; readiness checklists |
| `references/storyboard.md` | brief, copy rules, bar grid, 30/15-s structures, longer cuts, aspect variants, delivery set |
| `references/timing-and-length.md` | reel.config timing keys, the planner, elastic scenes, cues, 15/30/60 s, variants |
| `references/engine-api.md` | writing scenes: globals, `env`, helpers, modules, gl.js, transitions, FX, HUD, captions |
| `references/motion-recipes.md` | 36 tested recipes (characters, kinetic type, UI in a device, CLI shot, paper figure, web page...) |
| `references/capture.md` | real UI, terminal casts (`term.js`), perspective panels (`quad.js`), PDF figures |
| `references/imagery.md` | cutouts with Vision/OpenCV, blinks, products, photos, character motion |
| `references/audio.md` | presets, instruments, SFX grammar, arrangement, mastering, sync verification |
| `references/narration.md` | when to narrate, script writing, voices, TTS pipeline, captions, mix |
| `references/render-pipeline.md` | stills, MP4, covers, share copies, single-file HTML, motion QA, troubleshooting |
| `references/multi-agent.md` | contracts, roles, reviewer rubric, integrator checks, drafts |
| `tools/imagegen.md`, `tools/capture_native.md` | GPT-image-2 poses via Codex; native app and simulator captures |
| `templates/` | style schema, STORYBOARD, reel.config, narration and Workflow templates |

## Examples

- `examples/playful-app/`: a cheerful product README, pastel logo and small web app -> a bouncy pastel reel
  (120 BPM, bright-pop, a plush mascot drawn in code as a project module, real app UI in a phone, music-led; cuts
  `short`, `30` and `60`).
- `examples/research-cli/`: a terse research-CLI README, dark docs and a real CLI -> a dark data-first reel
  (128 BPM, dark-synth, GPU point cloud, real terminal capture tilted in 3D, data viz from the CLI's own JSON;
  narration script dry-run tested; cuts `15`, `30` and `60`).

Each has its source, reviewed `style.json` with the extraction log, STORYBOARD, scenes and a built player in
`dist/`. Re-plan before rendering (`build/` is generated): `python3 "$S/timing/plan_cut.py" --project
"$S/examples/playful-app" --cut short,30,60`.
