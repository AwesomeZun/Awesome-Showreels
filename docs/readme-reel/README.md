# README reel

The animated previews on the repository's README and its social card are rendered here, by a real motion-showreel
project: a style derived from the README with `tools/extract_style.py`, a `reel.config.json` planned with
`timing/plan_cut.py`, scenes on the skill's own runtime, and the bundled examples' real files as carriers. Nothing in
the previews is drawn by hand or rendered by another tool.

| Output (in `assets/readme/`) | Cut | What it shows | Size |
|---|---|---|---|
| [`feat-style.webp`](../../assets/readme/feat-style.webp) | `style` | the slab takes on the style of the source it reads: README render, measured rates, palette, face, BPM, style board flipping to a reel frame; a diagonal wipe switches Mochi Notes (light) and spark-bench (dark) | 720x405, 6 s |
| [`feat-carriers.webp`](../../assets/readme/feat-carriers.webp) | `carriers` | six carriers on a grid, each expanding to 70% of the frame in turn (FLIP): the real CLI cast zooming to its key line, a PDF figure, a GPU point cloud, code-drawn shapes and type, the Mochi cutout (Vision lift, blink, jelly), real app UI layers | 720x405, 6 s |
| [`feat-tempo.webp`](../../assets/readme/feat-tempo.webp) | `tempo` | one row morphing between the research-cli 60, 15 and 30-s plans on a fixed bar grid: in-phases keep their width, holds stretch (hatched, flowing), optional scenes slide in; the 128 BPM chip pulses in real time | 720x405, 6 s |
| [`feat-sound.webp`](../../assets/readme/feat-sound.webp) | `sound` | three bars of the Mochi soundtrack at 1x: waveform, spectrum, every cue firing with its measured offset and a light from its hit, loudness | 720x405, 6 s |
| [`feat-narration.webp`](../../assets/readme/feat-narration.webp) | `narration` | two script lines on the grid at 1.25x: the research-cli 30-s cut playing with its captions burned in, the line being read, the music bed ducked behind the playhead; BYOK, dry run | 720x405, 6 s |
| [`feat-ship.webp`](../../assets/readme/feat-ship.webp) | `ship` | the two MP4s (ffprobe) and the single-file player playing its 15, 30 and 60-s cuts as its own number keys switch them | 720x405, 6 s |
| [`social-preview.png`](../../assets/readme/social-preview.png) | `social` | the repository card (upload it in Settings → Social preview) | 1280x640 |

Each loop is 3 bars at 120 BPM, 144 frames at 24 fps, built around one large element that moves on every beat; the
frame after the last is frame 0 again. Everything meant to be read is at least 32 px on the 1920-px canvas (12 CSS px
at the README's 720 px); the README's bold line above each loop carries the headline, so the frames hold only a short
index label. `STORYBOARD.md` has the exact copy, the beat-by-beat choreography and the provenance of every element.

The README's other previews come from [`sizzle/`](sizzle/): the sizzle at the top (`hero.webp`, 1200x675, 9.5 s), the
two example loops (`twin-playful.webp`, `twin-research.webp`) and the eight `moment-*.webp`. They are ranges of the
examples' real cut plans, rendered frame by frame through the runtime (`frames.mjs`), edited by the runtime's own
compositor (`composite/`) and framed by a title card that is a project of its own (`title/`, styled by `style.json`
above, over two real frames of the examples). `edit.json` holds every cut decision; `python3
docs/readme-reel/sizzle/build.py` rebuilds all eleven files and `--list` prints every shot. Film grain is off in these
renders to keep the WebPs small, and the edits keep a 16:9 safe area when they downscale, so the channel shift of the
glitch and whip transitions never shows at the frame edge.

## Regenerate

```bash
(cd skills/motion-showreel/runtime && npm install)    # once (playwright-core)
node docs/readme-reel/tools/make_webp.mjs --out out/previews                       # every loop and the social card
node docs/readme-reel/tools/make_webp.mjs --only sound,ship --out out/previews     # some of them
```

Without `--out`, both `make_webp.mjs` and `sizzle/build.py` write into `assets/readme/` (the tracked files).

`make_webp.mjs` plans each cut with `plan_cut.py`, renders every frame through the same page as `render.mjs` and the
HTML player (`runtime/stills.mjs` `openReel` + `grabPNG`, frame i at i / 24 s, six pages in one browser), then runs the
skill's own `tools/motion_qa.py --strict` on the frames: a frozen run, an unexpected pop or a near-static hold makes
the run exit 1. `tools/encode.py` downsizes with Lanczos and encodes the way `sizzle/build.py` does: each frame sends
only the box that changed (compared with the source pixels last sent, so slow changes never ghost), every box is
encoded on its own by `cwebp` (lossy q 70, `-m 6`, `-sharp_yuv`) in parallel and `webpmux` assembles the animation,
which loops forever. A loop's `start` frame is its poster: the WebP opens on that frame and plays on through the seam.
Needs Python 3 with numpy and Pillow and the libwebp tools (`brew install webp`, `apt install webp`). A full run takes
about 2 minutes on Apple Silicon (16 cores).

`assets/` is committed, so the step above needs only this folder. When the examples change, rebuild it first:

```bash
node docs/readme-reel/tools/prepare.mjs               # or --only examples,data,mochi,snap,frames,players,cast,paper,title
```

`prepare.mjs` reads the examples and writes display-sized copies and data into `assets/` (intermediates in
`build/prep/`): README renders (`tools/source_snapshot.mjs`), style boards, reel stills and the research-cli 30-s
cut's first 7.5 s (`runtime/stills.mjs`), the Mochi cutout (`tools/prep_assets.py` with `assets.json`: Vision lift of
the logo's icon, blink twin from the measured eye boxes), app captures, the single-file player playing (headless
Chromium pressing the player's own keys and stepping it frame by frame), the CLI cast (`capture_cli.py scan` must
pass), a demo note for `tools/pdf_figures.py`, the sizzle title card's two background frames, and through
`tools/readme_data.py` the waveform, spectrum and cue offsets (`audio/verify_sync.py --json`), the narration timeline
and duck curve, the cut plans, both style specs with the rates their tone passes measured, and the MP4 facts
(`ffprobe`). It generates missing example outputs (plans, music, the narration dry run) with the skill's own commands
and never touches existing ones.

## The tour cut

The same scenes also play as one 36-s reel with transitions and music:

```bash
S=skills/motion-showreel; P=docs/readme-reel
python3 $S/timing/plan_cut.py --project $P --cut tour --strict
python3 $S/audio/arrange.py --project $P --cut tour             # dark-synth, 120 BPM
python3 $S/audio/verify_sync.py --wav $P/build/music-tour.wav --cut $P/build/cut-tour.json
node $S/runtime/render.mjs --project $P --cut tour --out out/readme-tour.mp4
node $S/runtime/stills.mjs --project $P --serve                # live player: keys 1-8 switch cuts
```

## Notes

- **Style.** `style.json` was drafted by `extract_style.py` from `source/readme-v1.1.0.md` (the v1.1.0 README, text
  and badges only, frozen under a name GitHub does not render as this folder's README, so the previews this project
  renders never feed back into its own style; its image links are not meant to resolve) and reviewed: Catppuccin
  Mocha from the README's six badge colours, Space Grotesk and JetBrains Mono (OFL, loaded from the research-cli
  example's font files), 120 BPM so every loop is a whole number of frames. The extraction log is `style-extract.md`,
  the board `style-board.jpg`.
- **Motion.** Every loop passes `motion_qa.py --strict`: hard changes sit on the cues in `reel.config.json` (which
  also score the tour cut), and the big moves between them ease over several frames.
- **Honesty.** Mochi Notes and spark-bench are fictional examples and their numbers are demo data. The narration loop
  shows a dry run (no voice exists until someone brings their own Gemini key). The PDF in the carriers loop is a demo
  note generated from spark-bench's README and demo data; its figure is real `pdf_figures.py` output. The player in
  the ship loop is the example's real player, screenshotted. Playheads that are not real time say their speed on
  screen.
- **Fonts.** Space Grotesk, JetBrains Mono and Nunito are under the SIL Open Font License 1.1; their license files
  ship next to them in `skills/motion-showreel/examples/`.
