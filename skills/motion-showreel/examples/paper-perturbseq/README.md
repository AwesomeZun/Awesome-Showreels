# Example: paper-perturbseq (Perturb-seq of exhaustion)

A fictional Perturb-seq preprint and its simulated data go in; a dark, exact genomics reel comes out in the preprint's own figure style: the guide is typed and the DNA is cut on the beat, the pooled screen flows into droplets, the effect heatmap builds and clusters, the regulatory network finds its hub, and the killing assay makes the claim. Nothing here picks a preset: palette, type, motion and music come from `source/` and are written to `style.json` with the reasoning for every decision.

- Web version with every cut: [`dist/perturb-seq-exhaustion-v1.0.0.html`](dist/perturb-seq-exhaustion-v1.0.0.html) ([play in the browser](https://raw.githack.com/AwesomeZun/Awesome-Showreels/main/skills/motion-showreel/examples/paper-perturbseq/dist/perturb-seq-exhaustion-v1.0.0.html))
- Cuts: `short` (10 bars = 20.7 s), `30` (14 bars = 29.0 s), all at 116 BPM.

> Perturb-seq of exhaustion is fictional. Every name, number and screen is demo content made for this example.

## Folder

```
paper-perturbseq/
  source/                 7 file(s)
    data/effects.csv
    data/network.csv
    fonts/IBMPlexMono-Regular.ttf
    fonts/IBMPlexMono-SemiBold.ttf
    fonts/IBMPlexSans-Variable.ttf
    fonts/OFL.txt
    manuscript.md
  assets/                 1 file(s)
    data/screen.json
  modules/                1 file(s)
    ps.js
  scenes/                 5 file(s)
    cut.js
    finding.js
    heatmap.js
    network.js
    screen.js
  paper-src/              1 file(s)
    simulate.py
  style.json
  reel.config.json
  STORYBOARD.md
  dist/
```

## Run it

```bash
S=skills/motion-showreel; P=$S/examples/paper-perturbseq
python3 $S/tools/extract_style.py --source $P/source --project $P --board      # draft style (review by hand)
python3 $S/timing/plan_cut.py --project $P --cut short,30
for c in short 30; do python3 $S/audio/arrange.py --project $P --cut $c; done
python3 $S/audio/verify_sync.py --wav $P/build/music-short.wav --cut $P/build/cut-short.json
node $S/runtime/render.mjs --project $P --cut short --out out/paper-perturbseq-short.mp4
node $S/runtime/build.mjs --project $P --cuts short,30 --out out/perturb-seq-exhaustion.html
```

## What the tone pass decided

- **palette.** The preprint's figure style: a near-black panel (#0B0F17) with a diverging scale, cyan (#22D3EE) for down, magenta (#E879F9) for up, and a slate midpoint; each of the five programmes keeps one colour across every panel (exhaustion rose, effector amber, memory green, cycling blue, stress violet).

- **type.** IBM Plex Sans for sentences, Plex Mono for every gene, guide sequence and number, as the manuscript asks.

- **motion.** Laboratory exact and quick: guides are typed, the cut happens on the beat, matrices build row by row, the network draws edge by edge; no bounce, outExpo.

- **sound.** A night in the genomics core: dark synth at 116 BPM in A minor, plucked arps and glassy blips for the data.

- **visuals.** The sgRNA and the cut, the pooled screen into droplets, the clustered effect heatmap with its dendrogram, the regulatory network with its hub, and the killing assay with every donor as a dot.

## Same BPM, more bars

The 30-second cut is the same reel with longer holds (and optional scenes where they exist); the tempo never changes.

| Scene | short | 30 s |
|---|---|---|
| `cut` | 2 | 3 |
| `screen` | 2 | 3 |
| `heatmap` | 2 | 3 |
| `network` | 2 | 3 |
| `finding` | 2 | 2 |

## Scenes

**`cut`**: cut (2 bars, 3 in the 30): the guide and the cut. A DNA double helix scrolls across the frame (two strands and their rungs); the 20-nt guide types above its target (beats 0-2) with the NGG PAM lit in amber; on beat 3 two blades close and the helix breaks with a flash and the two halves spring apart; the title rises line by line (4-5), then the authors. 30-s hold: the cut ends keep fraying, the guide blinks its PAM on the beat.

**`screen`**: screen (2 bars, 3 in the 30): panel a, the pooled screen. A field of T cells in a well (left); one guide per cell, each cell taking its barcode colour in a sweep (beats 0-2); the cells stream right through a microfluidic channel and are caught one by one in droplets (2-4), counters for 612 regulators, 9 donors and 1.2 M cells rolling up.

**`heatmap`**: heatmap (2 bars, 3 in the 30): panel b. 60 perturbations (rows, clustered by programme) x 40 programme genes (columns, five blocks of eight). Rows fill top to bottom on a scan (beats 0-3), the programme bars above the columns and the module stripes at the left draw on; on beat 3 a dendrogram grows at the left; on beat 4 the three hub rows lock with a bracket and their names (TOX, NR4A1, ARID1A). Hold: a scan line keeps passing over the matrix.

**`network`**: network (2 bars, 3 in the 30): panel c. The 60 regulators as nodes coloured by programme (layout precomputed in paper-src/simulate.py), sized by total effect; the strong shared-effect edges draw on (beats 1-3: magenta for positive, cyan for negative). On beat 4 the hub (TOX, NR4A1, ARID1A) pulls to the centre of attention: the rest dims, the hub pulses on the beat with its names. The graph turns very slowly.

**`finding`**: finding (2 bars; the end card): panel d. Two bars of tumour-cell killing, control guides vs the triple knockout, with each of the nine donors as a dot dropping onto its bar (beats 0-1.5); +45% counts up between them (1); the claim rises (2-3) and the citation block with the fictional-preprint note settles (3). Hold: the dots breathe.

## Provenance and credits

- The material in `source/` was written for this example; the project is fictional and the reel says so on screen.
- Music and sound effects are synthesized by `audio/` (no samples).
- Fonts ship with their licences: `source/fonts/OFL.txt`.
