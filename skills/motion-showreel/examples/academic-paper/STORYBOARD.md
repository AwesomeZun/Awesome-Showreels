# Alveolar repair atlas: storyboard and build contract

Generated from the project files (reel.config.json, the cut plans, the scene headers and style.json); the scene
headers are the authority for the beat-by-beat choreography.

## 1. Brief

- **Material:** `source/manuscript.md` (paper); `source/data` (other); `source/fonts` (other)
- **Mood:** precise, contemporary, data-dense, luminous, confident
- **Purpose:** paper
- **Fiction:** every name, figure and claim is invented for this example and labelled on screen.

## 2. Style summary (read-only; from `style.json`)

- Theme light · bg `#FFFFFF` · ink `#111418` · accent `#E8553A` · accent2 `#2F6FDB` · accent3 `#13A39A`
- Display `"Inter"` · body `"Inter"`
- Motion: medium pace, `outQuint`, transitions match, cut
- Sound: ambient · 100 BPM · D dorian · pad, marimba, glass, sub, kick, rim, shaker

## 3. Cuts

| Cut | Bars | Length |
|---|---|---|
| `short` | 9 | 21.6 s |
| `30` | 12 | 28.8 s |

One bar = 2.400 s at 100 BPM; every scene starts on a bar line in every cut.

## 4. Scenes

### 4.1 `title`: The article

- Bars: short 2 · 30 s 2 (min 2, max 2) · in 5 beats, out 1 beats · entrance `cut` · music part `intro`
- Cues: tick:6 gap=0.05s soft @ start+0b, swish @ start+1b, blips @ start+3b, ding soft @ start+5b

title (2 bars): the article's first page as a modern journal sets it. Running head and the ARTICLE tag tick in (beat 0); the title rises line by line out of a mask (beats 1-2.5), the author line and affiliations follow (3-3.5), then the first sentence of the abstract. On the right the 4,900 dissociated nuclei of the atlas hang in a loose field, drifting, all one neutral grey: from beat 4 their identities light up type by type (the colours of Fig. 1a), which is what the next scene sorts. Out: the text column slides away; the cells stay (match cut).

### 4.2 `umap`: a  Cell types

- Bars: short 2 · 30 s 3 (min 2, max 3) · in 4 beats, out 1 beats · entrance `match` · music part `groove`
- Cues: whoosh @ start+0b, blip step=0 @ start+2b, blip step=1 @ start+2.5b, blip step=2 @ start+3b, blip step=3 @ start+3.5b, drawon dur=0.9 @ holdBar+0b

umap (2 bars): Fig. 1a then 1b. The dissociated cells from the title page fly into their UMAP positions (beats 0-2, staggered by a per-cell hash so clusters condense out of the field rather than marching); the panel letter, axis arrows and the legend arrive with them; cluster names land on the plot one per eighth (2-3.75). Hold (from beat 4): panel b. Everything outside the epithelium dims; the AT2 -> KRT8+ -> AT1 continuum recolours by pseudotime in a sweep from its root, and the trajectory arrow draws along it with a colour bar. Out: the pseudotime colours give way to cell types again (the next scene starts from this exact frame).

### 4.3 `spatial`: c  In tissue

- Bars: short 2 · 30 s 3 (min 2, max 3) · in 4 beats, out 1 beats · entrance `match` · music part `drop`
- Cues: zoom @ start+0b, drawon dur=0.6 @ start+2b, pop @ start+3b, count @ holdBar+0b

spatial (2 bars): Fig. 1c and 1e. Opens on the UMAP exactly as the last scene left it; on beat 0 every nucleus leaves its UMAP position for its place in the tissue section (beats 0-2, staggered by distance so the section fills in from the injury niche outward). The section's frame, scale bar and the alveolar sac outlines draw on (beat 2); on beat 3 the injury niche is ringed (dashed) and everything but the niche's three cell types dims. Hold: panel e, the niche enrichment per cell type, bars growing one per eighth with the KRT8+ bar last and labelled 3.2x. Out (1 beat): cut to the dot plot.

### 4.4 `markers`: d  Markers

- Bars: short 1 · 30 s 2 (min 1, max 2) · in 3 beats, out 1 beats · entrance `cut` · music part `groove`
- Cues: tick:16 gap=0.075s soft @ start+0b, blip step=2 @ start+2.5b

markers (1 bar): Fig. 1d, the marker dot plot. Rows are the eight cell types, columns the sixteen marker genes in italics (gene-name convention). The columns fill left to right, one per sixteenth (beats 0-2), each dot growing to its fraction-expressing size and darkening with mean expression; on beat 2.5 the KRT8 / CLDN4 / SFN block is boxed in the accent and its row label lights up. Size and colour legends sit under the plot.

### 4.5 `finding`: The finding

- Bars: short 2 · 30 s 2 (min 2, max 2) · in 5 beats, out 0 beats · entrance `cut` · music part `outro`
- Cues: swell @ start+0b, count @ start+1b, ding soft @ start+3b

finding (2 bars, end card): the claim, as big as the data allows. The KRT8+ nuclei from the niche come back as a slowly orbiting cluster on the right (their tissue positions, magnified, breathing); the number counts up to 3.2x on beat 1 in the accent, the sentence rises under it (2), the hedge line in the serif (2.5), and the citation block with the fictional-data notice settles at the foot (3). Hold: the cluster keeps drifting; nothing else moves.

