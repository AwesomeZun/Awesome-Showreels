# Example: academic-paper (A spatial multiome atlas of human alveolar repair)

A fictional single-cell and spatial omics manuscript and its simulated data go in; a reel that never lets go of
a single nucleus comes out (v2). The title page sits beside a generated illustration of the alveoli, its injured sac
pulsing; one tissue section shows all 4,900 nuclei in their places, then the tissue is dissociated and every nucleus
lifts off it; they fly into a three-dimensional UMAP the camera orbits, the repair path from AT2 through the KRT8+
transitional state to AT1 lights up by pseudotime; (30) the marker dot plot floats on a glass card; every nucleus
flies home, the injury niche is ringed at 175 µm and the enrichment bars rise; the claim, 3.2x, sits beside a
generated illustration of the niche's three cells. Nothing here picks a preset: palette, type, motion and music come
from `source/` and are written to `style.json` with the reasoning for every decision.

- Web version with every cut: [`dist/alveolar-repair-atlas-v2.0.0.html`](dist/alveolar-repair-atlas-v2.0.0.html) ([play in the browser](https://raw.githack.com/AwesomeZun/Awesome-Showreels/main/skills/motion-showreel/examples/academic-paper/dist/alveolar-repair-atlas-v2.0.0.html))
- Cuts: `short` (7 bars = 17.5 s), `30` (12 bars = 30.0 s), all at 96 BPM.

> A spatial multiome atlas of human alveolar repair is fictional. Every name, number and screen is demo content made for this example.

## Folder

```
academic-paper/
  source/                 8 file(s)
    data/cells.csv
    data/markers.csv
    fonts/Inter.ttf
    fonts/OFL-Inter.txt
    fonts/OFL-SourceSerif4.txt
    fonts/SourceSerif4.ttf
    gen/v2/prompt.txt
    manuscript.md
  assets/                 5 file(s)
    data/atlas.json
    ill/airspace.webp
    ill/alveoli.webp
    ill/meta.json
    ill/niche.webp
  modules/                1 file(s)
    lung.js
  scenes/                 6 file(s)
    finding.js
    markers.js
    niche.js
    tissue.js
    title.js
    umap.js
  paper-src/              1 file(s)
    simulate.py
  style.json
  reel.config.json
  STORYBOARD.md
  dist/
```

## Run it

```bash
S=skills/motion-showreel; P=$S/examples/academic-paper
python3 $S/tools/extract_style.py --source $P/source --project $P --board      # draft style (review by hand)
python3 $S/timing/plan_cut.py --project $P --cut short,30
for c in short 30; do python3 $S/audio/arrange.py --project $P --cut $c; done
python3 $S/audio/verify_sync.py --wav $P/build/music-short.wav --cut $P/build/cut-short.json
node $S/runtime/render.mjs --project $P --cut short --out out/academic-paper-short.mp4
node $S/runtime/build.mjs --project $P --cuts short,30 --out out/alveolar-repair-atlas-v2.html
```

## How it was made

1. **Data first, unchanged.** `paper-src/simulate.py` still makes the same 4,900 nuclei, dot plot and enrichment
   (3.2x, 1.9x, 1.8x); v2 only adds a third UMAP axis from its own random stream, drawn after everything else, so
   every earlier number is identical.
2. **Illustrations where the paper would draw.** Three GPT Image 2.5 images (`source/gen/v2/`, alpha from Codex
   image_gen's transparent_background option): the alveoli with an injured sac, the niche's three cells, an
   out-of-focus airspace. `gen-src/prep.py` trims them and records where the injured sac and each cell sit, so the
   pills point at them. Nothing that reads as data is generated.
3. **One sphere per nucleus.** `modules/lung.js` caches a shaded sphere sprite per colour and places every nucleus
   with one perspective camera, depth-sorted each frame, so the same object moves from tissue to atlas and back.

## What the tone pass decided

- **palette.** The inside of a lung: blush and warm white (#FBF4F1 to #F1E7EE), pale pink walls, soft daylight. The eight cell types keep the figure's colours (AT2 blue #2F6FDB, KRT8+ transitional coral #E8553A, AT1 teal #13A39A, basal violet, ciliated amber, fibroblast green, endothelial magenta, macrophage slate), so a viewer who has the paper open finds the same colour in the same place; ink is a deep blue-grey (#1F2433).

- **type.** Source Serif 4 for the title and the claim, as a journal sets them; Inter for panel letters, labels, axes and numbers, tabular; gene names in italics by convention.

- **motion.** Every nucleus is one shaded sphere for the whole reel: it sits in the tissue, lifts off when the tissue is dissociated, flies into a three-dimensional UMAP the camera orbits, lights up by pseudotime along the repair path, and flies home to its place in the section, where the injury niche is ringed. The camera is always moving (push, orbit, pull back); depth from three layers (out-of-focus airspace behind, data in the middle, drifting motes in front). Ease ioC and outExpo; labels spring open with a little overshoot.

- **sound.** A light, hopeful bed at 96 BPM in F major (corporate preset: piano broken chords, marimba, strings, glockenspiel, a light kit): glass ticks as nuclei arrive, a rising draw tone as the trajectory lights, pops for labels, a chime on 3.2x.

- **visuals.** Six moments: the title page beside a generated illustration of the alveoli; one tissue section with its 4,900 nuclei, dissociated; the 3D UMAP and the repair trajectory (Fig. 1a, b); (30) the marker dot plot as a floating card (Fig. 1d); back in the tissue, the injury niche ringed at 175 um and the enrichment bars (Fig. 1c, e); the claim, 3.2x, beside a generated illustration of the niche's three cells. Illustrations are drawn as illustrations; every data panel is computed from the simulated data.

## Same BPM, more bars

The 30-second cut is the same reel with longer holds (and optional scenes where they exist); the tempo never changes.

| Scene | short | 30 s |
|---|---|---|
| `title` | 1 | 2 |
| `tissue` | 1 | 2 |
| `umap` | 2 | 3 |
| `markers` | - | 1 |
| `niche` | 2 | 2 |
| `finding` | 1 | 2 |

## Scenes

**`title`**: title (1 bar, 2 in the 30): the article's first page beside the organ it is about. On the left, as a journal sets it: the ARTICLE tag and running head, the title rising line by line in Source Serif 4 (KRT8+ in coral), authors and affiliations. On the right a generated illustration of the alveoli floats in soft daylight over an out-of-focus airspace, motes drifting in front; its injured sac pulses coral and a pill names it. In the 30 three chips give the atlas's size and the abstract's first sentence follows. In the last beat the camera pushes toward the injury.

**`tissue`**: tissue (1 bar, 2 in the 30): Fig. 1c, the place. One section of repairing lung (1.6 x 0.9 mm) seen from above: alveolar airspaces cut out of pink walls, the airway at the left, the thickened injury niche; on it all 4,900 nuclei as grey shaded spheres, their identities not yet known. The camera pulls back from the niche to the whole section; panel label and a 200 um scale bar arrive. In the 30 pills name the airway, an alveolus and the injury and a caption says what is measured. In the last two beats the tissue is dissociated: the camera tilts away, the section fades and every nucleus lifts off it, each to its own height.

**`umap`**: umap (2 bars, 3 in the 30): Fig. 1a then 1b. The lifted nuclei fly into a three-dimensional UMAP (each on its own clock and a slight arc), turning from grey to their cell type's colour as they land, while the camera swings from the tilted tissue view into a slow orbit. A small axis triad, the panel label and a pill per cluster arrive. Then the repair path: everything outside the AT2, KRT8+ and AT1 continuum fades back, the continuum recolours by pseudotime (AT2 blue through coral to AT1 teal), and a lit path with travelling beads runs along it from AT2 to AT1, with a colour bar. The caption: AT2 cells become AT1 cells through a KRT8+ transitional state.

**`markers`**: markers (1 bar, the 30 only): Fig. 1d, the marker dot plot, on a glass card floating over the atlas (the UMAP still turning behind it, out of focus). Rows are the eight cell types with their colours, columns the sixteen marker genes in italics; each dot is a shaded sphere sized by the fraction of nuclei expressing the gene and darkened by its mean expression. The columns fill left to right; then the KRT8, CLDN4 and SFN block and the KRT8+ row are boxed in coral, with size and colour legends under the plot.

**`niche`**: niche (2 bars): Fig. 1c and 1e, back in the tissue. Every nucleus flies home from the UMAP to its place in the section, in its type's colour now, as the camera settles level over the tissue and the section fades in under them. The camera closes in on the injury: a dashed ring at 175 um draws round it, everything but the niche's three types (KRT8+ transitional cells, fibroblasts, macrophages) dims, and the transitional cells swell a little. On the right, panel e: enrichment inside the ring for each type, bars growing against a dashed line at 1x, the KRT8+ bar last and labelled 3.2x. The caption gives the claim with its numbers.

**`finding`**: finding (1 bar, 2 in the 30; the end): the claim beside the cells it is about. Left: 3.2x counting up in coral, the sentence in Source Serif 4 (KRT8+ transitional cells gather at the injury niche, where differentiation stalls), the figure reference and, at the foot, the citation and the notice that the manuscript is fictional and its data simulated. Right: a generated illustration of the niche's three cells, a stretched coral transitional cell between a sage fibroblast and a slate macrophage, floating in the airspace, each named by a pill. Slow push.

## Provenance and credits

- The material in `source/` was written for this example; the project is fictional and the reel says so on screen.
- Music and sound effects are synthesized by `audio/` (no samples).
- Fonts ship with their licences: `source/fonts/OFL-Inter.txt`, `source/fonts/OFL-SourceSerif4.txt`.
