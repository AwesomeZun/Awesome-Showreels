# Light-sheet tracking of the zebrafish embryo: storyboard and build contract

Generated from the project files (reel.config.json, the cut plans, the scene headers and style.json); the scene
headers are the authority for the beat-by-beat choreography.

## 1. Brief

- **Material:** `source/manuscript.md` (paper); `source/data` (other); `source/fonts` (other); `source/gen/` (generated-art)
- **Mood:** luminous, patient, wondrous, precise, quiet
- **Purpose:** paper
- **Fiction:** every name, figure and claim is invented for this example and labelled on screen.

## 2. Style summary (read-only; from `style.json`)

- Theme dark · bg `#000000` · ink `#F2F4F8` · accent `#4BFF6A` · accent2 `#FF3EC8` · accent3 `#2EE6FF`
- Display `"Manrope"` · body `"Manrope"`
- Motion: calm pace, `ioSine`, transitions cut
- Sound: ambient · 92 BPM · E lydian · pad, glass, bell, sub, kick, shaker

## 3. Cuts

| Cut | Bars | Length |
|---|---|---|
| `short` | 8 | 20.9 s |
| `30` | 12 | 31.3 s |

One bar = 2.609 s at 92 BPM; every scene starts on a bar line in every cut.

## 4. Scenes

### 4.1 `optics`: A blade of light

- Bars: short 1 · 30 s 2 (min 1, max 2) · in 3 beats, out 1 beats · entrance `cut` · music part `intro`
- Cues: reveal @ start+0.4b, zap dur=0.6 @ start+1b, pulse @ start+1.6b, zoom @ end+-0.8b

optics (1 bar, 2 in the 30): a blade of light. The microscope's two objectives (a generated render with a real alpha channel) come out of the dark as a rim light sweeps their metal; on beat 1 a laser enters the illumination objective and leaves its tip as a thin sheet of light that narrows to its waist at the focus, under the detection objective; the embryo's first plane lights there. The title rises on the left. On the last beat the camera rushes into the focus (the next scene opens on the embryo).

### 4.2 `stack`: The sheet builds the embryo

- Bars: short 2 · 30 s 2 (min 2, max 2) · in 6 beats, out 1 beats · entrance `cut` · music part `groove`
- Cues: scan dur=6.4 @ start+0b, chime @ end+-1.4b

stack (2 bars): the sheet builds the embryo. A horizontal sheet of light sweeps down through the 10-hpf embryo from the animal pole; the nuclei inside the sheet flare, and every plane it has passed stays lit, so the embryo is stacked one section at a time (4,812 nuclei on the GPU, additive, HDR). On the right, the live section: the plane as the camera above sees it, a ring of nuclei that widens and closes as the sheet goes down, with its plane number and a 100 um scale bar. When the sheet leaves, the whole embryo hangs there and the count reads 4,812 cells.

### 4.3 `channels`: Three channels

- Bars: short 1 · 30 s 2 (min 1, max 2) · in 3 beats, out 0 beats · entrance `cut` · music part `groove`
- Cues: pulse @ start+0b, blip @ start+1b, blip step=4 @ start+2b

channels (1 bar, 2 in the 30): three colours, one embryo. The finished 10-hpf volume turns on its axis; the channels come on one after another: nuclei magenta, then membranes cyan, then the notochord reporter green, added on top of each other so where they overlap the light burns white. The channel list ticks on like the acquisition software's, and a leader names the notochord running down the dorsal side.

### 4.4 `tracks`: 6 to 24 hpf

- Bars: short 2 · 30 s 2 (min 2, max 2) · in 6 beats, out 0 beats · entrance `cut` · music part `drop`
- Cues: drawon dur=6 @ start+0.3b, lock @ start+1.75b

tracks (2 bars): 6 to 24 hours in one sweep. The clock runs and every one of the 4,812 cells moves along its own path (Catmull-Rom through the six time points): the cap of cells spreads over the yolk, gathers on the dorsal side and stretches into a body, its tail lifting off. Nine hundred of the tracks draw on behind their cells in their lineage's colour, with light pulsing along them; at 8 hpf the notochord's tracks flare once, the moment its precursors commit. The camera turns slowly to follow the axis.

### 4.5 `lineage`: One founder

- Bars: short - · 30 s 2 (min 2, max 2) · in 6 beats, out 0 beats · entrance `cut` · music part `breakdown`
- Cues: drawon dur=6 @ start+0.2b, chime @ start+1.6b, blip @ start+2.2b

lineage (2 bars, the 30 only): one founder, eighteen hours. From one cell at 6 hpf the tree grows downward with the clock, each division a fork. Until 8 hpf its branches are white; at the 8-hpf division one side turns notochord green and the other muscle magenta: that is the decision. The notochord marker only switches on at 10 hpf (a dashed line), two hours later; the gap is bracketed. Commitment times of all four lineages sit on the time axis.

### 4.6 `result`: 8 hpf

- Bars: short 2 · 30 s 2 (min 2, max 2) · in 4 beats, out 0 beats · entrance `cut` · music part `outro`
- Cues: reveal @ start+0.5b, tick:6 gap=0.06s soft @ start+1.2b

result (2 bars; the end): the notochord, glowing. The 24-hpf embryo turns slowly with every cell dimmed to a haze but the notochord's, a green rod along the body; the finding comes in very large (8 hpf), the claim in a sentence under it, then the authors, the open data and the honest note: a fictional article with simulated data.

