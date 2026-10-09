# Perturb-seq of exhaustion: storyboard and build contract

Generated from the project files (reel.config.json, the cut plans, the scene headers and style.json); the scene
headers are the authority for the beat-by-beat choreography.

## 1. Brief

- **Material:** `source/manuscript.md` (paper); `source/data` (other); `source/fonts` (other)
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
| `short` | 10 | 20.7 s |
| `30` | 14 | 29.0 s |

One bar = 2.069 s at 116 BPM; every scene starts on a bar line in every cut.

## 4. Scenes

### 4.1 `cut`: The guide and the cut

- Bars: short 2 · 30 s 3 (min 2, max 3) · in 6 beats, out 1 beats · entrance `cut` · music part `intro`
- Cues: keytap dur=2 fast soft @ start+0b, snap @ start+3b, impact @ start+3.05b, drawon dur=0.5 @ start+4.5b

cut (2 bars, 3 in the 30): the guide and the cut. A DNA double helix scrolls across the frame (two strands and their rungs); the 20-nt guide types above its target (beats 0-2) with the NGG PAM lit in amber; on beat 3 two blades close and the helix breaks with a flash and the two halves spring apart; the title rises line by line (4-5), then the authors. 30-s hold: the cut ends keep fraying, the guide blinks its PAM on the beat.

### 4.2 `screen`: a  The pooled screen

- Bars: short 2 · 30 s 3 (min 2, max 3) · in 5 beats, out 1 beats · entrance `cut` · music part `groove`
- Cues: whoosh @ start+0b, blips dur=2 @ start+1b, count @ start+3b

screen (2 bars, 3 in the 30): panel a, the pooled screen. A field of T cells in a well (left); one guide per cell, each cell taking its barcode colour in a sweep (beats 0-2); the cells stream right through a microfluidic channel and are caught one by one in droplets (2-4), counters for 612 regulators, 9 donors and 1.2 M cells rolling up.

### 4.3 `heatmap`: b  Effects

- Bars: short 2 · 30 s 3 (min 2, max 3) · in 6 beats, out 1 beats · entrance `cut` · music part `drop`
- Cues: scan dur=1 @ start+0b, drawon dur=0.75 @ start+3b, lock @ start+4b

heatmap (2 bars, 3 in the 30): panel b. 60 perturbations (rows, clustered by programme) x 40 programme genes (columns, five blocks of eight). Rows fill top to bottom on a scan (beats 0-3), the programme bars above the columns and the module stripes at the left draw on; on beat 3 a dendrogram grows at the left; on beat 4 the three hub rows lock with a bracket and their names (TOX, NR4A1, ARID1A). Hold: a scan line keeps passing over the matrix.

### 4.4 `network`: c  The hub

- Bars: short 2 · 30 s 3 (min 2, max 3) · in 5 beats, out 1 beats · entrance `cut` · music part `drop`
- Cues: zoom @ start+0b, drawon dur=1 @ start+2b, lock big @ start+4b

network (2 bars, 3 in the 30): panel c. The 60 regulators as nodes coloured by programme (layout precomputed in paper-src/simulate.py), sized by total effect; the strong shared-effect edges draw on (beats 1-3: magenta for positive, cyan for negative). On beat 4 the hub (TOX, NR4A1, ARID1A) pulls to the centre of attention: the rest dims, the hub pulses on the beat with its names. The graph turns very slowly.

### 4.5 `finding`: d  Killing restored

- Bars: short 2 · 30 s 2 (min 2, max 2) · in 5 beats, out 0 beats · entrance `cut` · music part `outro`
- Cues: swell @ start+0b, count @ start+1b, ding @ start+3b

finding (2 bars; the end card): panel d. Two bars of tumour-cell killing, control guides vs the triple knockout, with each of the nine donors as a dot dropping onto its bar (beats 0-1.5); +45% counts up between them (1); the claim rises (2-3) and the citation block with the fictional-preprint note settles (3). Hold: the dots breathe.

