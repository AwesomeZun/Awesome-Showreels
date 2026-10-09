# Example: academic-paper (Alveolar repair atlas)

A fictional 2026 single-cell and spatial omics manuscript and its figure data go in; a precise, data-first reel comes out: 4,900 cells keep their identity from the title page through a UMAP, a tissue section and a dot plot to the one claim. Nothing here picks a preset: palette, type, motion and music were derived from `source/` and written to `style.json` with the reasoning for every decision.

- Demo (short cut, with its music): [`assets/demo-academic-paper-v1.0.0.mp4`](../../../../assets/demo-academic-paper-v1.0.0.mp4)
- Web version with every cut: [`dist/alveolar-repair-atlas-v1.0.0.html`](dist/alveolar-repair-atlas-v1.0.0.html) ([play in the browser](https://raw.githack.com/AwesomeZun/Awesome-Showreels/main/skills/motion-showreel/examples/academic-paper/dist/alveolar-repair-atlas-v1.0.0.html))
- Cuts: `short` (9 bars = 21.6 s), `30` (12 bars = 28.8 s), all at 100 BPM.

> Alveolar repair atlas is fictional. Every name, number and screen is demo content made for this example.

## Folder

```
academic-paper/
  source/                 7 file(s)
    data/cells.csv
    data/markers.csv
    fonts/Inter.ttf
    fonts/OFL-Inter.txt
    fonts/OFL-SourceSerif4.txt
    fonts/SourceSerif4.ttf
    manuscript.md
  assets/                 1 file(s)
    data/atlas.json
  modules/                1 file(s)
    atlas.js
  scenes/                 5 file(s)
    finding.js
    markers.js
    spatial.js
    title.js
    umap.js
  paper-src/              1 file(s)
    simulate.py
  style.json
  style-extract.md
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
node $S/runtime/build.mjs --project $P --cuts short,30 --out out/alveolar-repair-atlas.html
```

## What the tone pass decided

- **palette.** A current life-science article reads white page, near-black ink, and the figure's categorical palette as the only colour. bg is the page (#FFFFFF) and bg2 a cool figure-panel grey (#F3F5F8). The eight cell-type colours come from the figure data (atlas.json) and carry all chroma; the accent is the hero population's colour, the KRT8+ transitional vermillion (#E8553A), used for the claim and the niche. accent2 is the AT2 blue (#2F6FDB) for the trajectory start, accent3 the AT1 teal (#13A39A) for its end. Rules and axes are a cool grey (#C9CFD8).

- **type.** Modern journals set headlines and figure labels in a grotesque and the abstract in a text serif: Inter (600-700, tight -0.02 em tracking) for title, panel letters (bold lowercase a-e, as in the legend) and axis labels; Source Serif 4 for the abstract and author line; tabular figures for counts.

- **motion.** Data-first and exact: points move on purpose (dissociated cells -> UMAP -> tissue), no bounce, outQuint, short staggers by cell type. Every scene is one figure panel; transitions are match cuts on the same points.

- **sound.** Clean, modern, slightly luminous: ambient preset at 100 BPM in D dorian (open, curious, not dark). Marimba for the precise motion line (cells landing), glass top, soft pad, sub, light kick/rim/shaker. SFX minimal: blips and ticks for points and labels, drawon for trajectories.

- **narration.** Recommended for a paper explainer; this example ships music-led with captions off.

- **visuals.** No photos or characters. The figure is the hero: 4,900 cells drawn as dots that keep their identity across UMAP, pseudotime, the tissue section and the dot plot.

## Same BPM, more bars

The 30-second cut is the same reel with longer holds (and optional scenes where they exist); the tempo never changes.

| Scene | short | 30 s |
|---|---|---|
| `title` | 2 | 2 |
| `umap` | 2 | 3 |
| `spatial` | 2 | 3 |
| `markers` | 1 | 2 |
| `finding` | 2 | 2 |

## Scenes

**`title`**: title (2 bars): the article's first page as a modern journal sets it. Running head and the ARTICLE tag tick in (beat 0); the title rises line by line out of a mask (beats 1-2.5), the author line and affiliations follow (3-3.5), then the first sentence of the abstract. On the right the 4,900 dissociated nuclei of the atlas hang in a loose field, drifting, all one neutral grey: from beat 4 their identities light up type by type (the colours of Fig. 1a), which is what the next scene sorts. Out: the text column slides away; the cells stay (match cut).

**`umap`**: umap (2 bars): Fig. 1a then 1b. The dissociated cells from the title page fly into their UMAP positions (beats 0-2, staggered by a per-cell hash so clusters condense out of the field rather than marching); the panel letter, axis arrows and the legend arrive with them; cluster names land on the plot one per eighth (2-3.75). Hold (from beat 4): panel b. Everything outside the epithelium dims; the AT2 -> KRT8+ -> AT1 continuum recolours by pseudotime in a sweep from its root, and the trajectory arrow draws along it with a colour bar. Out: the pseudotime colours give way to cell types again (the next scene starts from this exact frame).

**`spatial`**: spatial (2 bars): Fig. 1c and 1e. Opens on the UMAP exactly as the last scene left it; on beat 0 every nucleus leaves its UMAP position for its place in the tissue section (beats 0-2, staggered by distance so the section fills in from the injury niche outward). The section's frame, scale bar and the alveolar sac outlines draw on (beat 2); on beat 3 the injury niche is ringed (dashed) and everything but the niche's three cell types dims. Hold: panel e, the niche enrichment per cell type, bars growing one per eighth with the KRT8+ bar last and labelled 3.2x. Out (1 beat): cut to the dot plot.

**`markers`**: markers (1 bar): Fig. 1d, the marker dot plot. Rows are the eight cell types, columns the sixteen marker genes in italics (gene-name convention). The columns fill left to right, one per sixteenth (beats 0-2), each dot growing to its fraction-expressing size and darkening with mean expression; on beat 2.5 the KRT8 / CLDN4 / SFN block is boxed in the accent and its row label lights up. Size and colour legends sit under the plot.

**`finding`**: finding (2 bars, end card): the claim, as big as the data allows. The KRT8+ nuclei from the niche come back as a slowly orbiting cluster on the right (their tissue positions, magnified, breathing); the number counts up to 3.2x on beat 1 in the accent, the sentence rises under it (2), the hedge line in the serif (2.5), and the citation block with the fictional-data notice settles at the foot (3). Hold: the cluster keeps drifting; nothing else moves.

## Provenance and credits

- The material in `source/` was written for this example; the project is fictional and the reel says so on screen.
- Music and sound effects are synthesized by `audio/` (no samples).
- Fonts ship with their licences: `source/fonts/OFL-Inter.txt`, `source/fonts/OFL-SourceSerif4.txt`.
