# Ridgeline Pocket: storyboard and build contract

Generated from the project files (reel.config.json, the cut plans, the scene headers and style.json); the scene
headers are the authority for the beat-by-beat choreography.

## 1. Brief

- **Material:** `source/README.md` (readme); `source/brand-notes.md` (brand-guide)
- **Mood:** calm, outdoorsy, nostalgic, pocket-sized, confident
- **Purpose:** launch
- **Fiction:** every name, figure and claim is invented for this example and labelled on screen.

## 2. Style summary (read-only; from `style.json`)

- Theme light · bg `#D4E59A` · ink `#1B2B1A` · accent `#3E5E2E` · accent2 `#8FAE3A` · accent3 `#1B2B1A`
- Display `monospace` · body `monospace`
- Motion: medium pace, `lin`, transitions cut
- Sound: chiptune · 108 BPM · G major · pulse, tri-bass, pulse-lead, kick, snare, hats

## 3. Cuts

| Cut | Bars | Length |
|---|---|---|
| `short` | 8 | 17.8 s |
| `30` | 13 | 28.9 s |

One bar = 2.222 s at 108 BPM; every scene starts on a bar line in every cut.

## 4. Scenes

### 4.1 `boot`: Power on

- Bars: short 2 · 30 s 3 (min 2, max 3) · in 6 beats, out 1 beats · entrance `cut` · music part `intro`
- Cues: blip step=0 @ start+0b, ding @ start+3b, tick:8 gap=0.06s soft @ start+4b

boot (2 bars, 3 in the 30): the handheld powers on. Two steps of dark glass, then the paper-green screen; the RIDGELINE wordmark scrolls down one pixel per step (beats 0-3) and stops with a chime on beat 3, a pixel ridge icon blinks in above it, POCKET types under it one letter per step (4), the promise types in small (5), and PRESS START blinks on the half beat from beat 6. 30-s hold: tiny clouds drift across, PRESS START keeps blinking.

### 4.2 `trail`: On the trail

- Bars: short 2 · 30 s 4 (min 2, max 4) · in 4 beats, out 1 beats · entrance `cut` · music part `groove`
- Cues: swish @ start+0b, blip step=2 @ start+2b, blip step=4 @ holdBar+0b

trail (2 bars, up to 4 in the 30): on the Granite Saddle Loop. Side-scrolling in whole pixels: a dithered sky with clouds, the far ridge (1/4 speed), the near ridge (1/2), a row of pines and the trail itself (full speed) with a marker post every 64 px. The hiker walks in four stepped frames. The HUD counts distance and climb live; on beat 2 the trail card drops in (12.4 KM, +860 M), and an elevation profile draws itself bottom right with a dot riding it. 30-s hold: a bird flaps across, and a WATER IN 1.2 KM card replaces the trail card.

### 4.3 `map`: Offline map

- Bars: short 2 · 30 s 3 (min 2, max 3) · in 5 beats, out 1 beats · entrance `cut` · music part `groove`
- Cues: swish @ start+0b, buzz @ start+1b, confirm @ start+3b

map (2 bars, up to 3 in the 30): "No signal? No problem." A top-down map of the loop in four greens: dithered meadow, contour lines, a winding creek and stands of trees. The signal icon shows crossed bars and NO SIGNAL blinks (beat 1); the route draws itself a few pixels per step behind a blinking you-are-here cursor; on beat 3 a stamp lands: OFFLINE MAP *. The map pans one pixel every other step. Footer: the region size and the trail name.

### 4.4 `summit`: Summit

- Bars: short 2 · 30 s 3 (min 2, max 3) · in 6 beats, out 0 beats · entrance `cut` · music part `outro`
- Cues: swish @ start+0b, stamp @ start+2b, chime @ start+4b

summit (2 bars, up to 3 in the 30; the end card): Pika Point. A dithered sun rises behind a big ridge (lit face in lichen, shade in moss); the hiker climbs the last switchbacks a pixel at a time (beats 0-2), the flag goes in and a SUMMIT! stamp lands on beat 2; the summit name and height type on (3); the end card: wordmark, promise and the fictional-app note (4). Hold: the flag waves in two frames, clouds pass below the summit, the sun's rays blink, CHECK-IN SAVED blinks on every other beat.

