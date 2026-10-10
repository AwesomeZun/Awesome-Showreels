# Example: paper-imaging (Light-sheet tracking of the zebrafish embryo)

A fictional developmental-biology article goes in; a reel built the way the microscope builds its data comes out. The
two objectives turn a laser into a sheet of light; the sheet sweeps down through the embryo and every plane it passes
stays lit, so the volume is stacked one section at a time; three channels come on; then the clock runs from 6 to 24
hours and every one of the 4,812 tracked cells moves, leaving its track; one founder's lineage parts at 8 hpf, and the
notochord glows. Nothing here picks a preset: palette, type, motion and music come from `source/` and are written to
`style.json` with the reasoning for every decision.

- Web version with every cut: [`dist/zebrafish-light-sheet-v2.0.0.html`](dist/zebrafish-light-sheet-v2.0.0.html) ([play in the browser](https://raw.githack.com/AwesomeZun/Awesome-Showreels/main/skills/motion-showreel/examples/paper-imaging/dist/zebrafish-light-sheet-v2.0.0.html))
- Cuts: `short` (8 bars = 20.9 s), `30` (12 bars = 31.3 s), all at 92 BPM.

> Light-sheet tracking of the zebrafish embryo is fictional. Every name, number and screen is demo content made for this example.

## Folder

```
paper-imaging/
  source/                 7 file(s)
    data/nuclei_10hpf.csv
    data/tracks_sample.csv
    fonts/DMMono-Regular.ttf
    fonts/Manrope-Variable.ttf
    fonts/OFL.txt
    gen/a/prompt.txt
    manuscript.md
  assets/                 3 file(s)
    data/embryo.json
    ill/meta.json
    ill/objectives.webp
  modules/                1 file(s)
    ls.js
  scenes/                 6 file(s)
    channels.js
    lineage.js
    optics.js
    result.js
    stack.js
    tracks.js
  paper-src/              1 file(s)
    simulate.py
  style.json
  reel.config.json
  STORYBOARD.md
  dist/
```

## Run it

```bash
S=skills/motion-showreel; P=$S/examples/paper-imaging
python3 $S/tools/extract_style.py --source $P/source --project $P --board      # draft style (review by hand)
python3 $S/timing/plan_cut.py --project $P --cut short,30
for c in short 30; do python3 $S/audio/arrange.py --project $P --cut $c; done
python3 $S/audio/verify_sync.py --wav $P/build/music-short.wav --cut $P/build/cut-short.json
node $S/runtime/render.mjs --project $P --cut short --out out/paper-imaging-short.mp4
node $S/runtime/build.mjs --project $P --cuts short,30 --out out/zebrafish-light-sheet-v2.html
```

## How it was made

1. **The data, computed.** `paper-src/simulate.py` places every one of the 4,812 cells at six time points (6, 8, 10,
   13, 17 and 24 hpf): a cap of cells over half the yolk spreads over all of it and gathers on the dorsal side, then
   the axial cells extend into the body (notochord, neural tube, muscle) while skin covers it. Lineage is read from
   where a cell sits at 10 hpf, and one founder's lineage tree parts at 8 hpf.
2. **Drawn by the GPU.** `modules/ls.js` moves every cell along Catmull-Rom curves through its six positions, so any
   hpf has a position for every cell, and hands the points to `gl.js`: additive glow with HDR tone mapping, so the
   channels add up and overlaps burn white. The light sheet's reveal is a sphere so large it acts as a plane.
3. **One render.** The two objectives are a GPT Image 2.5 render with a real alpha channel (`source/gen/a/prompt.txt`;
   the PNG is not committed); `gen-src/prep.py` finds each objective's axis and tip in the alpha, so the beam leaves the
   illumination objective exactly and focuses under the detection objective.

## What the tone pass decided

- **palette.** Microscopy on black: nuclei magenta (#FF3EC8), membranes cyan (#2EE6FF), the notochord reporter green (#4BFF6A), added together so overlaps glow white; UI in white at reduced opacity, never coloured.

- **type.** Manrope for sentences, DM Mono for every scale bar, time stamp and channel name, as the figure style says.

- **motion.** Patient and smooth, the way the instrument works: the sheet of light sweeps down at an even pace and every plane it passes stays lit, the volume turns on a slow turntable while the channels come on one by one, and the clock runs from 6 to 24 hpf with every cell moving on its own track (Catmull-Rom between six time points). Easing ioSine; the only hits are the channels registering and the notochord's tracks flaring at 8 hpf.

- **sound.** Wonder, not tension: ambient at 92 BPM in E lydian, pad, glass and bell, soft kick.

- **visuals.** Six scenes: the two objectives (a generated render with a real alpha channel) and the laser becoming a sheet; the sheet stacking the embryo plane by plane beside a live section; three channels on a turning volume; 4,812 cells tracked from 6 to 24 hpf with 900 lineage-coloured tracks (GPU, additive, HDR); one founder's lineage tree parting at 8 hpf (30 only); the 24-hpf notochord glowing under '8 hpf'. Every position comes from paper-src/simulate.py.

## Same BPM, more bars

The 30-second cut is the same reel with longer holds (and optional scenes where they exist); the tempo never changes.

| Scene | short | 30 s |
|---|---|---|
| `optics` | 1 | 2 |
| `stack` | 2 | 2 |
| `channels` | 1 | 2 |
| `tracks` | 2 | 2 |
| `lineage` | - | 2 |
| `result` | 2 | 2 |

## Scenes

**`optics`**: optics (1 bar, 2 in the 30): a blade of light. The microscope's two objectives (a generated render with a real alpha channel) come out of the dark as a rim light sweeps their metal; on beat 1 a laser enters the illumination objective and leaves its tip as a thin sheet of light that narrows to its waist at the focus, under the detection objective; the embryo's first plane lights there. The title rises on the left. On the last beat the camera rushes into the focus (the next scene opens on the embryo).

**`stack`**: stack (2 bars): the sheet builds the embryo. A horizontal sheet of light sweeps down through the 10-hpf embryo from the animal pole; the nuclei inside the sheet flare, and every plane it has passed stays lit, so the embryo is stacked one section at a time (4,812 nuclei on the GPU, additive, HDR). On the right, the live section: the plane as the camera above sees it, a ring of nuclei that widens and closes as the sheet goes down, with its plane number and a 100 um scale bar. When the sheet leaves, the whole embryo hangs there and the count reads 4,812 cells.

**`channels`**: channels (1 bar, 2 in the 30): three colours, one embryo. The finished 10-hpf volume turns on its axis; the channels come on one after another: nuclei magenta, then membranes cyan, then the notochord reporter green, added on top of each other so where they overlap the light burns white. The channel list ticks on like the acquisition software's, and a leader names the notochord running down the dorsal side.

**`tracks`**: tracks (2 bars): 6 to 24 hours in one sweep. The clock runs and every one of the 4,812 cells moves along its own path (Catmull-Rom through the six time points): the cap of cells spreads over the yolk, gathers on the dorsal side and stretches into a body, its tail lifting off. Nine hundred of the tracks draw on behind their cells in their lineage's colour, with light pulsing along them; at 8 hpf the notochord's tracks flare once, the moment its precursors commit. The camera turns slowly to follow the axis.

**`lineage`**: lineage (2 bars, the 30 only): one founder, eighteen hours. From one cell at 6 hpf the tree grows downward with the clock, each division a fork. Until 8 hpf its branches are white; at the 8-hpf division one side turns notochord green and the other muscle magenta: that is the decision. The notochord marker only switches on at 10 hpf (a dashed line), two hours later; the gap is bracketed. Commitment times of all four lineages sit on the time axis.

**`result`**: result (2 bars; the end): the notochord, glowing. The 24-hpf embryo turns slowly with every cell dimmed to a haze but the notochord's, a green rod along the body; the finding comes in very large (8 hpf), the claim in a sentence under it, then the authors, the open data and the honest note: a fictional article with simulated data.

## Provenance and credits

- The material in `source/` was written for this example; the project is fictional and the reel says so on screen.
- Music and sound effects are synthesized by `audio/` (no samples).
- Fonts ship with their licences: `source/fonts/OFL.txt`.
