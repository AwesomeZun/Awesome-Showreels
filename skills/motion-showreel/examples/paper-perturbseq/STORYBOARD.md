# Perturb-seq: regulators of T-cell exhaustion: storyboard and build contract

Generated from the project files (reel.config.json, the cut plans, the scene headers and style.json); the scene
headers are the authority for the beat-by-beat choreography.

## 1. Brief

- **Material:** `source/manuscript.md` (paper); `source/data` (other); `source/fonts` (other); `source/gen/` (generated-art)
- **Mood:** precise, nocturnal, technical, decisive, data-dense
- **Purpose:** paper
- **Fiction:** every name, figure and claim is invented for this example and labelled on screen.

## 2. Style summary (read-only; from `style.json`)

- Theme dark · bg `#0B0F17` · ink `#E6EDF3` · accent `#E879F9` · accent2 `#22D3EE` · accent3 `#FBBF24`
- Display `"IBM Plex Sans"` · body `"IBM Plex Sans"`
- Motion: medium pace, `outExpo`, transitions cut, match
- Sound: dark-synth · 116 BPM · A minor · pad, saw-pluck, saw-bass, glass, kick, snare, hats

## 3. Cuts

| Cut | Bars | Length |
|---|---|---|
| `short` | 9 | 18.6 s |
| `30` | 15 | 31.0 s |

One bar = 2.069 s at 116 BPM; every scene starts on a bar line in every cut.

## 4. Scenes

### 4.1 `dive`: Into the tumour

- Bars: short 1 · 30 s 2 (min 1, max 2) · in 3 beats, out 1 beats · entrance `cut` · music part `intro`
- Cues: reveal @ start+0.3b, blip @ start+1.6b, blip step=2 @ start+2b, zoom @ end+-0.2b

dive (1 bar, 2 in the 30): into the tumour. The camera pushes slowly into the tissue: the backdrop, a far T cell (soft), the tumour cluster and, nearest, an exhausted T cell move at their own depths, with bokeh drifting through. The tired cell's receptors pulse magenta on the beat. The preprint's title rises line by line, then the problem in one sentence, and two lab labels name the cells. On the last beat the camera dives into the T cell's nucleus and the frame goes to a cyan glow (the DNA scene opens from it).

### 4.2 `cut`: One guide, one gene

- Bars: short 2 · 30 s 2 (min 2, max 2) · in 6 beats, out 0 beats · entrance `cut` · music part `groove`
- Cues: whoosh @ start+0.2b, keytap dur=1 @ start+1.2b, scan dur=1.5 @ start+2.2b, impact @ start+4b, swish @ start+4.6b, count dur=1.5 @ start+5.2b

cut (2 bars): one guide, one gene. Inside the nucleus (opening from the dive's cyan glow): a DNA double helix drawn in code turns slowly across the frame, chromatin threads drift behind it. Cas9 (a generated molecular surface with a real alpha channel) slides in on the helix, which passes through its open channel; the guide RNA's sequence types in, and the 20 base pairs it matches light amber on the DNA. On beat 4 Cas9 cuts: a flash at the break, sparks, and the two halves of the helix swing apart. Then the method in one line, and the count of regulators knocked out.

### 4.3 `screen`: Pooled screen

- Bars: short - · 30 s 2 (min 2, max 2) · in 4 beats, out 0 beats · entrance `cut` · music part `groove`
- Cues: blips dur=4 @ start+0b, count dur=4 @ start+1b

screen (2 bars, the 30 only): the pooled screen. A microfluidic chip as a glass slab with glowing channels: edited T cells (each with a dot in its guide's programme colour) flow in from the left, barcode beads come down from the top, and at the junction the oil pinches off one droplet per cell and bead; the droplets squeeze along the outlet and are read, each read leaving a barcode line that scrolls up the right edge. The count runs up to 1.2 million cells; 612 guides, 9 donors.

### 4.4 `heatmap`: Clustered effects

- Bars: short 2 · 30 s 3 (min 2, max 3) · in 6 beats, out 0 beats · entrance `cut` · music part `drop`
- Cues: blips dur=1.5 @ start+0b, whoosh @ start+1.9b, drawon dur=0.9 @ start+3.5b, pop:5 gap=0.15 @ start+4.4b, lock @ start+5.6b

heatmap (2 bars, 3 in the 30): the screen's result, sorted by the real clustering. Sixty knockouts (rows, in library order: the order they were screened) against forty programme genes (columns, five programmes under coloured bands) fill in row by row in the diverging scale. Then every row slides to its place in the clustering computed in paper-src/simulate.py (average linkage on correlation distance), top rows settling first; the dendrogram grows out of the leaves to the root; the five programmes are bracketed; and the three rows of the hub (TOX, NR4A1, ARID1A) are outlined. In the 30 the hold reads them: exhaustion genes down, effector genes up.

### 4.5 `network`: The hub

- Bars: short 2 · 30 s 3 (min 2, max 3) · in 4 beats, out 0 beats · entrance `cut` · music part `drop`
- Cues: swish @ start+0b, zap dur=1 @ start+0.5b, drawon dur=2 @ start+1.4b, chime @ start+3.4b

network (2 bars, 3 in the 30): the heatmap becomes the network (a match cut). Each sorted row collapses into a dot at its left end, and the sixty dots fly to the force layout computed in paper-src/simulate.py; edges draw in, strongest first, magenta where two knockouts change the same genes the same way and cyan where they oppose. Node colour is the programme, node size the number of links. The three hub nodes (TOX, NR4A1, ARID1A) light up with rings on the beat and their names; signals travel their edges. In the 30 the camera leans in on the hub.

### 4.6 `attack`: They kill again

- Bars: short 2 · 30 s 3 (min 2, max 3) · in 5 beats, out 2 beats · entrance `cut` · music part `outro`
- Cues: whoosh @ start+0b, thud @ start+1b, sparkle dur=2 @ start+1.2b, swish @ start+3b, count dur=1.2 @ start+4.2b, sting @ end+-2.2b

attack (2 bars, 3 in the 30; the end): back in the tissue, with the hub knocked out. A healthy T cell (a generated render, its granules gathered at a flattened contact face) reaches the tumour cell on beat 1; magenta granules stream across the synapse, and the tumour cell dies: it shrinks, darkens and throws off blebs that drift away. The result slides in: killing in co-culture, control against the triple knockout, every donor a dot, +45% counting up. The end card holds the title, the authors and the honest note: a fictional manuscript with simulated data.

