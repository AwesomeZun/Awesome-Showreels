# README reel storyboard and build contract

The project that renders the README previews of this repository. Timing lives in `reel.config.json`; this file holds
the words, the choreography and the provenance of every element. Violations of section 2 or section 5 are bugs.

## 1. Brief

- **One sentence:** motion-showreel turns any source into a reel whose look comes from the source, whose proof is
  captured for real and whose every hit lands on the beat; each preview shows one of those claims with the bundled
  examples' real files.
- **One scene per preview:** six seamless 3-bar loops (6.0 s at 120 BPM, 144 frames at 24 fps) and one still for the
  social card. Each loop is built around one large element (at least half the frame) that moves on every beat; its
  poster (`make_webp.mjs` `start`) is the finished state of the idea, readable without motion.
- **Audience / venue:** developers scrolling the GitHub README (muted autoplay, 720x405 animated WebP shown at the
  README's full column width, 354 px on a phone), and anyone who receives the repository link (1280x640 social card).
- **Source material:** `source/readme-v1.1.0.md`, the repository README at v1.1.0 (commit 9c19853), text and badges
  only. Everything shown on screen is the examples' own material (section 5); this project draws the frame around it.
- **Sound:** none in the README loops (animated WebP has no audio). The 36-s `tour` cut strings the six scenes with
  transitions and has a synthesized soundtrack (`audio/arrange.py`), for anyone who renders it.

## 2. Copy rules

### 2.1 Exact strings

The README's bold line above each loop is its headline, so a loop carries no headline and no provenance footer
(the provenance lives in the README's captions and in section 5). Type floor: 32 px on the 1920-px canvas for anything
meant to be read; three sizes per slab (display numbers 64 px and up, names and labels 34-58 px, labels 32 px).

| Loop | Index label | On-screen honesty labels |
|---|---|---|
| style | `01` `TONE & MANNER` | `per 1,000 words of source text` |
| carriers | `02` `VISUAL CARRIERS` | the terminal's own `DEMO DATA`; `Figure 2 · caption kept` |
| tempo | `03` `ANY LENGTH, SAME BPM` | `1 bar = 1.875 s in every cut` |
| sound | `04` `SOUND ON THE BEAT` | `PASS` only when `verify_sync.py` passed |
| narration | `05` `NARRATION · OPTIONAL · BYOK` | `Charon · dry run, no voice`, `your own Gemini key`, `playhead ×1.25` |
| ship | `06` `DELIVERY, VERIFIED` | `plays offline, from any folder` (what `build.mjs --verify` checks) |
| social | `A CLAUDE CODE SKILL` | title `Awesome` / `[Showreels]`, tagline `Any repo in.` / `A beat-synced showreel out.`, tags `style from your source`, `music on the beat`, `MP4 + one HTML`, `github.com/AwesomeZun/Awesome-Showreels` |

Every loop carries the brand mark `AWESOME SHOWREELS` with the play glyph, top right. The sizzle's title card
(`sizzle/title/`) uses the same tagline as the social card and the README's subtitle: `Any repo in. A beat-synced
showreel out.`, under the kicker `A CLAUDE CODE SKILL`.

### 2.2 Labels drawn from data (never typed by hand)

- style: swatches `bg ink accent accent2 accent3`, the display family, ease and spring character, BPM, preset and key
  from `assets/data/styles.json` (the two reviewed `style.json` files); the measured rates (emoji and '!' for Mochi
  Notes, numbers and citations for spark-bench, per 1,000 words) from the same file's `metrics`, which
  `tools/readme_data.py styles` copies from each example's `build/style-extract.json`.
- carriers: tile names and tools; the PDF caption chip reads the figure's own label from its sidecar.
- tempo: scene ids, bar counts and durations from `assets/data/plans.json`; `128 BPM`, `1 bar = 1.875 s`.
- sound: cue names from the arranger's cue list, offsets and `28/28`, `6.0 ms`, `-14.0 LUFS`, `-1.5 dBTP`, `PASS`
  from `assets/data/sound.json`.
- narration: script lines, caption cues, scene ids, `Charon`, `-9.9 dB` and the music gain readout from
  `assets/data/narration.json`.
- ship: file names, resolution, frame rate, audio, lengths and sizes from `assets/data/ship.json`.

### 2.3 Wording rules

- Say `demo data` or `fictional` where the examples' numbers appear in text; never present them as measurements.
- Never draw a voice waveform or say a voice exists: the narration shown is a dry run (`dry run, no voice`).
- Every playhead that is not real time says its speed on screen (`playhead ×1.25`). The sound loop and the ship
  player run in real time; the tempo loop's BPM chip pulses at the example's real 128 BPM.
- Call the PDF a demo note; call the mascot a cutout of the example's logo (it was lifted, not generated).
- Decoding text (scramble) lasts 3 frames at most; no garbage glyphs on a poster.

## 3. Look

`style.json` (reviewed; `style-extract.md` is the extraction log, `style-board.jpg` the board). Catppuccin Mocha
from the README's six badge colours, crust `#11111B` stage, mauve to pink accent gradient, Space Grotesk and JetBrains
Mono (both OFL, already in the repository), tight corners after the README's flat-square badges, no film grain
(animated WebP). The style loop is the one exception: it takes on each example's own palette and faces while it reads
that example. Shared parts live in `modules/kit.js`: the static stage, the index label and brand mark, panels, tags,
keycaps, arrows.

## 4. Choreography (seconds from the loop start; 1 beat = 0.5 s)

| Loop | 0-6 s |
|---|---|
| style | 0: Mochi pipeline complete (poster) · a scan line measures the README once per bar · 1.25-1.75: diagonal wipe to spark-bench, centred on beat 3 · rates count up, swatches pop one by one, Aa rises, BPM rolls 120 → 128 · the style board lands, then flips to the reel frame with a zoom punch · the numbers, face and BPM pulse on spark-bench's own beat · 4.25-4.75: the wipe back to Mochi Notes |
| carriers | a turn per 2 beats, starting with the terminal: the tile expands from its cell to 1344x756 over 8 frames, plays its move (zoom to the `spark` row with brackets · figure lifted off the PDF page · galaxy and back to `REEL` · shape morph and kinetic word · Mochi hops, jellies and blinks · the result-card layer leaves the phone and re-seats), and returns as the next one leaves its cell; every cell idles on the grid behind (poster: frame 12, the terminal zoomed) |
| tempo | 0-1.5: the 60-s plan (poster) · 1.5, 3.0, 4.5: the row morphs to 15, 30 and back to 60 s, scene by scene; in-phases keep their width, holds stretch, optional scenes slide in and out, the end handle is pulled to the new length, the duration and bar count roll; the hatching flows in every hold; the BPM chip pulses at 128 BPM |
| sound | the playhead crosses bars 5-7 at 1x and wraps on bar 5 (loop region); each cue flag fires on its hits and a light runs out from each hit; the offset shows for the last cue that fired; the spectrum follows the playhead (poster: frame 64, the first ding) |
| narration | the playhead crosses the first two scenes (4 bars, 7.5 s) at 1.25x and wraps; the 30-s cut plays in the preview with its caption, the script card being read lights up with its progress, the music bed is drawn ducked behind the playhead and the gain readout shows the duck (poster: frame 42, line 1 with its caption and its dip) |
| ship | key 2 at beat 3, key 3 at beat 7, key 1 at beat 11: a 3-frame wipe to that cut, which plays in real time with a slow push-in |

Every loop is seamless: the frame after the last is frame 0 again.

## 5. Provenance (what is real)

| Element | Source | Made by |
|---|---|---|
| README renders (Mochi light, spark-bench dark) | `examples/*/source/README.md` | `tools/source_snapshot.mjs` (the tone pass's own renderer) |
| Style boards | `examples/*/style-board.jpg` | `tools/extract_style.py` |
| Swatches, faces, BPM, springs | `examples/*/style.json` | the reviewed tone passes |
| Measured rates per 1,000 words | `examples/*/build/style-extract.json` (`metrics`) | `tools/extract_style.py` |
| Reel frames | the examples' projects, cut 30 | `runtime/stills.mjs` (`openReel` + `grabPNG`) |
| Narration preview | `examples/research-cli`, cut 30, 0-7.5 s, 72 frames | `runtime/stills.mjs` (`openReel` + `grabPNG`) |
| Title card background | `examples/playful-app` cut 30 at 20.5 s, `examples/research-cli` cut 15 at 3.55 s | `runtime/stills.mjs`, into `sizzle/title/assets/` |
| Mochi cutout and blink twin | `examples/playful-app/source/logo.png` (icon crop) | `tools/prep_assets.py`: macOS Vision lift, blink from the measured eye boxes |
| App screen and result-card layer | `examples/playful-app/assets/captures/ui/app/` | `tools/capture_ui.mjs` (captured by the example) |
| Terminal cast | `examples/research-cli/assets/captures/term/run.cast` | `tools/capture_cli.py` (real PTY recording; `scan` clean) |
| PDF page and Figure 2 | a one-page demo note written by `tools/readme_data.py paper` from spark-bench's README and `results.json` (fictional project, demo data) | `tools/pdf_figures.py` (paper mode and `--mode pages`, `--find`) |
| Cut plans | `examples/research-cli/build/cut-15/30/60.json` | `timing/plan_cut.py` |
| Waveform, spectrum, cues, offsets, loudness | `examples/playful-app/build/music-30.wav`, `music-30.json`, `cut-30.json` | `audio/arrange.py`; offsets by `audio/verify_sync.py --json` |
| Script, line timing, captions, duck | `examples/research-cli/narration.json`, `build/mix-30.json` (dry run), `captions-30.json`, `music-30-stem.wav` | `narration/vo_timeline.py`, `captions.py`, `mix_vo.py`'s duck envelope (recomputed) |
| MP4 facts | `assets/demo-research-cli-v1.1.0.mp4`, `assets/demo-playful-app-v1.1.0.mp4` | `ffprobe` |
| Player playing | `examples/research-cli/dist/spark-bench-v1.1.0.html`, 48 screenshots per cut, 1/24 s apart | headless Chromium: the player's own keys 1-3, Shift+Right and Right |
| Particles, shapes, type, charts, timelines | code | `runtime/` (Canvas2D, `gl.js`, `term.js`, `quad.js`) |

The examples (Mochi Notes, spark-bench) are fictional projects written for this repository; their numbers are demo
data. `tools/prepare.mjs` rebuilds every derived file in `assets/` (and the title card's two frames) from the sources
above.
