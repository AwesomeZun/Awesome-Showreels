# Example: paper-perturbseq (Perturb-seq: regulators of T-cell exhaustion)

A fictional preprint goes in; a reel that moves the way the paper argues comes out. It starts inside a tumour, with an
exhausted T cell beside the tumour cells; dives into the cell's nucleus, where Cas9 cuts one gene out of the DNA; follows
the pooled screen into droplets; sorts the screen's heatmap into its real clustering; folds the rows into a network
and finds the hub; and goes back into the tissue, where the freed T cell kills. Nothing here picks a preset: palette,
type, motion and music come from `source/` and are written to `style.json` with the reasoning for every decision.

- Web version with every cut: [`dist/perturb-seq-exhaustion-v2.0.0.html`](dist/perturb-seq-exhaustion-v2.0.0.html) ([play in the browser](https://raw.githack.com/AwesomeZun/Awesome-Showreels/main/skills/motion-showreel/examples/paper-perturbseq/dist/perturb-seq-exhaustion-v2.0.0.html))
- Cuts: `short` (9 bars = 18.6 s), `30` (15 bars = 31.0 s), all at 116 BPM.

> Perturb-seq: regulators of T-cell exhaustion is fictional. Every name, number and screen is demo content made for this example.

## Folder

```
paper-perturbseq/
  source/                 11 file(s)
    data/effects.csv
    data/network.csv
    fonts/IBMPlexMono-Regular.ttf
    fonts/IBMPlexMono-SemiBold.ttf
    fonts/IBMPlexSans-Variable.ttf
    fonts/OFL.txt
    gen/a/prompt.txt
    gen/b/prompt.txt
    ... 3 more
  assets/                 9 file(s)
    data/screen.json
    ill/cas9.webp
    ill/meta.json
    ill/tcell.webp
    ill/tcell_attack.webp
    ill/tcell_tired.webp
    ill/tme_bg.webp
    ill/tumor_cluster.webp
    ... 1 more
  modules/                1 file(s)
    ps.js
  scenes/                 6 file(s)
    attack.js
    cut.js
    dive.js
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
node $S/runtime/build.mjs --project $P --cuts short,30 --out out/perturb-seq-exhaustion-v2.html
```

## How the illustrations were made

1. **Renders with real alpha.** Seven images from GPT Image 2.5 through the Codex CLI (`source/gen/<job>/prompt.txt`
   holds every prompt; the PNGs themselves are not committed): the tissue backdrop, a tumour cluster, an exhausted T
   cell, a healthy and an attacking T cell, a tumour cell, and Cas9 with an open channel and no DNA. All but the
   backdrop were made with the image tool's transparent background, so they are layered without keying.
2. **Fitted to the scenes.** `gen-src/prep.py` trims each render to its visible pixels, sizes it for how big it is
   drawn and saves it as WebP with alpha; it also measures Cas9's open channel, so the DNA drawn in code runs through it.
3. **Data from the simulation.** `paper-src/simulate.py` writes the screen: 60 knockouts by 40 genes, the real
   clustering of their profiles (average linkage on correlation distance), the network and its layout, and the
   killing assay. The heatmap rows move to exactly that clustering; the network's edges are its correlations.

## What the tone pass decided

- **palette.** Two worlds share one palette. The illustrated one: cyan and teal T cells, rose and magenta tumour cells, deep navy tissue (the renders were asked for exactly this). The figure one: the preprint's near-black panels (#0B0F17) with a diverging scale, cyan (#22D3EE) for down and magenta (#E879F9) for up over a slate midpoint, and one colour per programme across every panel (exhaustion rose, effector amber, memory green, cycling blue, stress violet).

- **type.** IBM Plex Sans for sentences, Plex Mono for every gene, guide sequence and number, as the manuscript asks.

- **motion.** From the tissue into the data and back. A slow 2.5D push through layered renders (parallax, bokeh, depth of field), a dive into the T cell's nucleus, the cut on the beat; then lab-exact data motion (outExpo): rows fill in and slide into the computed clustering, the dendrogram grows from its leaves, rows fold into network nodes (a match cut), edges draw strongest first; back in the tissue for the result.

- **sound.** A night in the genomics core: dark synth at 116 BPM in A minor, plucked arps and glassy blips for the data.

- **visuals.** Six scenes: into the tumour; Cas9 cuts a DNA helix drawn in code, which passes through the render's open channel; the pooled screen in droplets (30 only); the effect heatmap re-sorted by its real clustering; the regulatory network and its hub; a T cell freed of the hub killing a tumour cell, with the co-culture result. The cells and Cas9 are GPT Image 2.5 renders with a real alpha channel (prompts in source/gen); every number, row and edge comes from paper-src/simulate.py.

## Same BPM, more bars

The 30-second cut is the same reel with longer holds (and optional scenes where they exist); the tempo never changes.

| Scene | short | 30 s |
|---|---|---|
| `dive` | 1 | 2 |
| `cut` | 2 | 2 |
| `screen` | - | 2 |
| `heatmap` | 2 | 3 |
| `network` | 2 | 3 |
| `attack` | 2 | 3 |

## Scenes

**`dive`**: dive (1 bar, 2 in the 30): into the tumour. The camera pushes slowly into the tissue: the backdrop, a far T cell (soft), the tumour cluster and, nearest, an exhausted T cell move at their own depths, with bokeh drifting through. The tired cell's receptors pulse magenta on the beat. The preprint's title rises line by line, then the problem in one sentence, and two lab labels name the cells. On the last beat the camera dives into the T cell's nucleus and the frame goes to a cyan glow (the DNA scene opens from it).

**`cut`**: cut (2 bars): one guide, one gene. Inside the nucleus (opening from the dive's cyan glow): a DNA double helix drawn in code turns slowly across the frame, chromatin threads drift behind it. Cas9 (a generated molecular surface with a real alpha channel) slides in on the helix, which passes through its open channel; the guide RNA's sequence types in, and the 20 base pairs it matches light amber on the DNA. On beat 4 Cas9 cuts: a flash at the break, sparks, and the two halves of the helix swing apart. Then the method in one line, and the count of regulators knocked out.

**`screen`**: screen (2 bars, the 30 only): the pooled screen. A microfluidic chip as a glass slab with glowing channels: edited T cells (each with a dot in its guide's programme colour) flow in from the left, barcode beads come down from the top, and at the junction the oil pinches off one droplet per cell and bead; the droplets squeeze along the outlet and are read, each read leaving a barcode line that scrolls up the right edge. The count runs up to 1.2 million cells; 612 guides, 9 donors.

**`heatmap`**: heatmap (2 bars, 3 in the 30): the screen's result, sorted by the real clustering. Sixty knockouts (rows, in library order: the order they were screened) against forty programme genes (columns, five programmes under coloured bands) fill in row by row in the diverging scale. Then every row slides to its place in the clustering computed in paper-src/simulate.py (average linkage on correlation distance), top rows settling first; the dendrogram grows out of the leaves to the root; the five programmes are bracketed; and the three rows of the hub (TOX, NR4A1, ARID1A) are outlined. In the 30 the hold reads them: exhaustion genes down, effector genes up.

**`network`**: network (2 bars, 3 in the 30): the heatmap becomes the network (a match cut). Each sorted row collapses into a dot at its left end, and the sixty dots fly to the force layout computed in paper-src/simulate.py; edges draw in, strongest first, magenta where two knockouts change the same genes the same way and cyan where they oppose. Node colour is the programme, node size the number of links. The three hub nodes (TOX, NR4A1, ARID1A) light up with rings on the beat and their names; signals travel their edges. In the 30 the camera leans in on the hub.

**`attack`**: attack (2 bars, 3 in the 30; the end): back in the tissue, with the hub knocked out. A healthy T cell (a generated render, its granules gathered at a flattened contact face) reaches the tumour cell on beat 1; magenta granules stream across the synapse, and the tumour cell dies: it shrinks, darkens and throws off blebs that drift away. The result slides in: killing in co-culture, control against the triple knockout, every donor a dot, +45% counting up. The end card holds the title, the authors and the honest note: a fictional manuscript with simulated data.

## Provenance and credits

- The material in `source/` was written for this example; the project is fictional and the reel says so on screen.
- Music and sound effects are synthesized by `audio/` (no samples).
- Fonts ship with their licences: `source/fonts/OFL.txt`.
