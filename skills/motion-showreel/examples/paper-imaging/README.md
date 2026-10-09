# Example: paper-imaging (Every cell of the zebrafish embryo)

A fictional light-sheet imaging article and its simulated embryo go in; a luminous microscopy reel comes out in the article's own figure style: 2,400 nuclei gather and the three fluorescence channels slide into register, a light sheet slices the embryo with a live 2D section, 300 lineage tracks grow from 6 to 24 hpf, and the commitment timeline makes the claim. Nothing here picks a preset: palette, type, motion and music come from `source/` and are written to `style.json` with the reasoning for every decision.

- Web version with every cut: [`dist/zebrafish-light-sheet-v1.0.0.html`](dist/zebrafish-light-sheet-v1.0.0.html) ([play in the browser](https://raw.githack.com/AwesomeZun/Awesome-Showreels/main/skills/motion-showreel/examples/paper-imaging/dist/zebrafish-light-sheet-v1.0.0.html))
- Cuts: `short` (8 bars = 20.9 s), `30` (11 bars = 28.7 s), all at 92 BPM.

> Every cell of the zebrafish embryo is fictional. Every name, number and screen is demo content made for this example.

## Folder

```
paper-imaging/
  source/                 6 file(s)
    data/nuclei_10hpf.csv
    data/tracks.csv
    fonts/DMMono-Regular.ttf
    fonts/Manrope-Variable.ttf
    fonts/OFL.txt
    manuscript.md
  assets/                 1 file(s)
    data/embryo.json
  modules/                1 file(s)
    emb.js
  scenes/                 4 file(s)
    decision.js
    gather.js
    sheet.js
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
node $S/runtime/build.mjs --project $P --cuts short,30 --out out/zebrafish-light-sheet.html
```

## What the tone pass decided

- **palette.** Microscopy on black: nuclei magenta (#FF3EC8), membranes cyan (#2EE6FF), the notochord reporter green (#4BFF6A), added together so overlaps glow white; UI in white at reduced opacity, never coloured.

- **type.** Manrope for sentences, DM Mono for every scale bar, time stamp and channel name, as the figure style says.

- **motion.** Patient and smooth: a slow turntable, a light sheet that scans at an even pace, tracks that grow with a running hpf clock; easing ioSine, no hits except the moment the three channels register.

- **sound.** Wonder, not tension: ambient at 92 BPM in E lydian, pad, glass and bell, soft kick.

- **visuals.** The embryo as 2,400 glowing nuclei: they gather and the channels register; the light sheet slices it with a live 2D section; 300 lineage tracks from 6 to 24 hpf; the commitment timeline makes the claim.

## Same BPM, more bars

The 30-second cut is the same reel with longer holds (and optional scenes where they exist); the tempo never changes.

| Scene | short | 30 s |
|---|---|---|
| `gather` | 2 | 3 |
| `sheet` | 2 | 3 |
| `tracks` | 2 | 3 |
| `decision` | 2 | 2 |

## Scenes

**`gather`**: gather (2 bars, 3 in the 30): the embryo gathers. 2,400 nuclei drift in from a loose cloud and settle onto the embryo's shell (beats 0-3) while the three channels arrive misregistered (each offset in its own direction) and slide into register on beat 3, where the overlaps flash white; the embryo turns slowly on the right; the title rises on the left (4-5), the authors and the fictional-data note (5.5). Hold: the turntable continues.

**`sheet`**: sheet (2 bars, 3 in the 30): panel b, one plane at a time. The embryo turns slowly; a thin light sheet (a bright vertical plane from the left) scans across it and back on an even pace; the nuclei inside the sheet light up full, the rest stay dim. The inset (right) shows that plane as a 2D section, updating as the sheet moves, with a 50 um scale bar and the plane's position in DM Mono. Hold: the scan keeps going, the section keeps redrawing.

**`tracks`**: tracks (2 bars, 3 in the 30): panel c. The embryo seen from the back (dorsal view); 300 lineage tracks grow from 6 to 24 hpf with a running clock (beats 0-4.5), each a fading trail with a bright head, coloured by lineage (notochord green, muscle magenta, neural cyan, skin grey), converging on the midline. On beat 5 the notochord tracks lock (the others dim) and the commitment timeline below marks 8 hpf. Hold: the heads keep breathing.

**`decision`**: decision (2 bars; the end card): panel d. The claim at full size: 8 hpf in reporter green with the two-hour lead counting up beside it, the four lineages' commitment times as a dot plot with marker onset shown as hollow rings (the gap is the finding), the sentence and the citation. Hold: a few notochord nuclei glow and drift at the edge.

## Provenance and credits

- The material in `source/` was written for this example; the project is fictional and the reel says so on screen.
- Music and sound effects are synthesized by `audio/` (no samples).
- Fonts ship with their licences: `source/fonts/OFL.txt`.
