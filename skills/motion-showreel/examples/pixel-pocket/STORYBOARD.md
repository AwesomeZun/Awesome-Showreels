# Ridgeline Pocket: storyboard and build contract

Generated from the project files (reel.config.json, the cut plans, the scene headers and style.json); the scene
headers are the authority for the beat-by-beat choreography.

## 1. Brief

- **Material:** `source/README.md` (readme); `source/brand-notes.md` (brand-guide); `source/gen/` (generated-art)
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
| `short` | 9 | 20.0 s |
| `30` | 14 | 31.1 s |

One bar = 2.222 s at 108 BPM; every scene starts on a bar line in every cut.

## 4. Scenes

### 4.1 `boot`: Power on

- Bars: short 1 · 30 s 2 (min 1, max 2) · in 3.6 beats, out 0 beats · entrance `cut` · music part `intro`
- Cues: blip step=0 @ start+0.2b, ding @ start+2b, tick:6 gap=0.09s soft @ start+2.6b

boot (1 bar, 2 in the 30): the handheld powers on. The glass wakes one tone per step, shadow to paper; the logo (the two-peak mark, RIDGELINE, the POCKET tag) drops in whole-pixel steps and lands with a ding on beat 2, a glint crosses it, and the promise types itself in. In the 30 PRESS START blinks on the beat and is pressed on the last beat; the trail scene dissolves out of this screen.

### 4.2 `trail`: Dawn at the trailhead

- Bars: short 2 · 30 s 3 (min 2, max 3) · in 6.5 beats, out 1.5 beats · entrance `cut` · music part `groove`
- Cues: click @ start+0b, swish @ start+1b, pop step=2 @ start+3b, tick:4 gap=0.4 @ start+3.8b, beep @ start+6b

trail (2 bars, 3 in the 30): dawn at the trailhead. START is pressed and the boot screen dissolves, in dither order, into a dark valley; the light comes up in tone steps (the light field rises from -1.6 to 0 and the sun lights the far peaks in dithered rings). The hiker walks in to the signpost, the status bar slides down (05:48, full signal, 100%), and the trail card opens out of the sign: distance, climb, time and water count in row by row, then the turn people miss, with a blinking warning. Birds cross the sky in the hold, the sun ring breathes on the beat. In the 30 the card folds back into the sign and the hiker walks on (the forest pushes this screen away).

### 4.3 `forest`: No service

- Bars: short - · 30 s 2 (min 2, max 2) · in 5.5 beats, out 0 beats · entrance `cut` · music part `breakdown`
- Cues: whoosh @ start+0.4b, bwoop @ start+1.8b, buzz @ start+3b, confirm @ start+4b

forest (2 bars, the 30 only): into the trees. The forest pushes the trailhead screen off to the left in five whole steps, the way handheld games change screens, and the hiker keeps walking across it between the trunks and the ferns (a paper outline keeps the sprite apart from the busy undergrowth; the ferns cover the boots). The canopy is shady (light field -0.35) with two light shafts swaying a pixel or two and dust that shows only inside them. The signal bars drop one by one, NO SERVICE blinks in the status bar, then the app answers: OFFLINE MAP READY, 12 MB on this device. The offline map opens out of this screen next.

### 4.4 `map`: The offline map

- Bars: short 2 · 30 s 2 (min 2, max 2) · in 6 beats, out 0 beats · entrance `cut` · music part `groove`
- Cues: swish @ start+0.4b, drawon dur=2.6 @ start+1b, blip step=4 @ start+3.6b, swish @ start+4b, drawon dur=1.4 @ start+4.2b, beep:2 @ start+6b

map (2 bars): the offline map. The map window grows out of the previous screen in whole steps until it fills the screen under the status bar (still no signal: OFFLINE). The topographic map (contour terraces, the lake, the river) is printed faded, with no shadow tone left, so the dark route with its paper halo reads on it: it draws on from the trailhead up the contours to the summit, a flag and PIKA POINT pop up there, the way back follows dashed, and YOU blinks where the hiker is. Then the elevation panel slides up and draws the profile left to right; the steep last 0.8 km before the summit fills dark and flashes, on the profile and on the map at once ("the steep part before you reach it").

### 4.5 `summit`: Summit check-in

- Bars: short 2 · 30 s 3 (min 2, max 3) · in 4.5 beats, out 2 beats · entrance `cut` · music part `drop`
- Cues: whoosh up @ start+0.6b, stamp @ start+3b, ding @ start+4b, tick:4 gap=0.1 @ start+4.4b, downlifter @ end+-1.8b

summit (2 bars, 3 in the 30): above the clouds. An iris opens from the map's summit flag onto a screen full of cloud; the cloud banks sink away in whole steps and the hiker climbs out of them onto the summit rocks (a paper rim keeps the dark sprite readable on dark rock) while the sun lights the cloud sea in dithered rings that breathe on the beat. SUMMIT! is stamped on beat 3 (one oversized step, then it settles), PIKA POINT 1,847 M under it, and the check-in types in: saved offline, syncs in range. Out: the windows fold, the clock runs to 19:52, the battery to 91%, and the light field falls to -2.2, so the summit goes to dusk tone by tone (the camp opens out of it).

### 4.6 `camp`: Night camp

- Bars: short 2 · 30 s 2 (min 2, max 2) · in 6 beats, out 0 beats · entrance `cut` · music part `outro`
- Cues: air @ start+0b, tick:4 gap=0.3 @ start+1b, click @ start+2b, swish @ start+4.4b, reveal @ start+5b, tick:6 gap=0.13 @ start+5.4b

camp (2 bars, the last scene): night at the lake. The dusk summit dissolves in dither order into the camp; the fire is a light in the light field whose radius flickers every step, so its dithered rings breathe over the ground and the tent; the hiker stands by it as a dark figure with the fire catching the edge that faces it; sparks rise and step down from paper to moss as they cool, stars blink, the tent's lantern switches on (beat 2). The day log types in: 12.4 km, +860 m, one summit, 9% battery. On beat 4 an iris closes onto the fire; the end card is the logo in reverse under a blinking night sky, the promise typing in, the fire as a small two-frame icon still burning under it, the fictional-app note, and one shooting star.

