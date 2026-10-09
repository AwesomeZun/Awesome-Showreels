# Example: pixel-pocket (Ridgeline Pocket)

A hiking app's README and brand notes go in; a handheld-console reel comes out, in the four greens the brand allows
and nothing else. One day on one trail: the screen powers on, dawn comes up over the trailhead a tone at a time, the
signal dies in the forest and the offline map takes over, the summit is stamped above the clouds, and the day ends at
a campfire whose light flickers in dithered rings. Nothing here picks a preset: palette, type, motion and music come
from `source/` and are written to `style.json` with the reasoning for every decision.

- Web version with every cut: [`dist/ridgeline-pocket-v2.0.0.html`](dist/ridgeline-pocket-v2.0.0.html) ([play in the browser](https://raw.githack.com/AwesomeZun/Awesome-Showreels/main/skills/motion-showreel/examples/pixel-pocket/dist/ridgeline-pocket-v2.0.0.html))
- Cuts: `short` (9 bars = 20.0 s), `30` (14 bars = 31.1 s), all at 108 BPM.

> Ridgeline Pocket is fictional. Every name, number and screen is demo content made for this example.

## Folder

```
pixel-pocket/
  source/                 5 file(s)
    README.md
    brand-notes.md
    gen/a/prompt.txt
    gen/b/prompt.txt
    gen/c/prompt.txt
  assets/                 10 file(s)
    px/camp.png
    px/cloud_sea.png
    px/dawn_far.png
    px/forest.png
    px/forest_near.png
    px/hiker_sheet.png
    px/meta.json
    px/summit.png
    ... 2 more
  modules/                1 file(s)
    pocket.js
  scenes/                 6 file(s)
    boot.js
    camp.js
    forest.js
    map.js
    summit.js
    trail.js
  style.json
  reel.config.json
  STORYBOARD.md
  dist/
```

## Run it

```bash
S=skills/motion-showreel; P=$S/examples/pixel-pocket
python3 $S/tools/extract_style.py --source $P/source --project $P --board      # draft style (review by hand)
python3 $S/timing/plan_cut.py --project $P --cut short,30
for c in short 30; do python3 $S/audio/arrange.py --project $P --cut $c; done
python3 $S/audio/verify_sync.py --wav $P/build/music-short.wav --cut $P/build/cut-short.json
node $S/runtime/render.mjs --project $P --cut short --out out/pixel-pocket-short.mp4
node $S/runtime/build.mjs --project $P --cuts short,30 --out out/ridgeline-pocket-v2.html
```

## How the pixel art was made

1. **Originals.** Nine images from GPT Image 2.5 through the Codex CLI (`source/gen/<job>/prompt.txt` holds every
   prompt; the PNGs themselves are not committed): the dawn valley, the trailhead, the forest and its foreground
   trunks, the topographic map, the summit, the cloud sea, the night camp and the hiker's 8-frame walk. Every prompt
   asks for the brand's four greens only, 6x6 art pixels, ordered dithering and no text.
2. **Exactly four greens.** `gen-src/pixelize.py` keys out the green screen and samples one art pixel per generated
   block, snapping each to the nearest of the four greens with a per-block majority vote (the dithering the original
   already has survives). The night camp and the map use the classic handheld conversion instead: block-mean
   luminance, stretched, pulled toward the four levels and ordered-dithered, because their originals are dark on dark
   and their contour lines are one block wide. Every PNG in `assets/px/` holds only those four colours.
3. **Light in four tones.** `modules/pocket.js` reads every layer back as tone indices 0-3 and builds each frame in a
   240 x 135 tone buffer. Light is a field in tone steps added through a 4x4 ordered dither: the dawn raises the whole
   valley a tone at a time, two shafts sway through the forest canopy, the sun's rings breathe on the beat, the summit
   falls to dusk and the campfire's radius flickers every step. The buffer is shown at 8x with the previous step
   ghosting under it, the pixels' small drop shadow and the LCD grid.

## What the tone pass decided

- **palette.** The brand allows exactly four greens (shadow #1B2B1A, moss #3E5E2E, lichen #8FAE3A, paper #D4E59A) and forbids a fifth. Every asset is stored in those four greens and read back as tone indices; light is a field in tone steps added through a 4x4 ordered dither, so a sunrise, a light shaft or a campfire raises and lowers tones in dithered rings instead of glowing.

- **type.** Its own 5x7 bitmap font, uppercase, tabular numbers, drawn pixel by pixel into the tone buffer (modules/pocket.js); the wordmark is the same font at 2x beside a two-peak mark. No anti-aliasing anywhere.

- **motion.** Everything steps at 9 fps on the 108-BPM grid (a beat is exactly 5 steps) and every hit lands on a whole beat, so picture and sound agree. The LCD keeps a faint ghost of the previous step and its pixels cast a small shadow. Screens change the handheld way: a dither dissolve, a five-step push, a window growing out of a notification, an iris from a map flag, a dusk that falls tone by tone, an iris closing on the fire.

- **sound.** Soft square-wave chiptune at 108 BPM in G major: pulse arps, a stepped triangle bass, a pulse lead and quiet noise drums, never loud ('a pocket toy, not a dashboard').

- **visuals.** A day hike in six screens: power-on; dawn at the trailhead with the trail card; the forest where the signal drops; the offline map with the route and the elevation profile; the summit check-in above the clouds; night camp with the day log and the end card. The scenery is GPT Image 2.5 pixel art (prompts in source/gen) converted to the four greens by gen-src/pixelize.py; the interface, the light and every animation are code.

## Same BPM, more bars

The 30-second cut is the same reel with longer holds (and optional scenes where they exist); the tempo never changes.

| Scene | short | 30 s |
|---|---|---|
| `boot` | 1 | 2 |
| `trail` | 2 | 3 |
| `forest` | - | 2 |
| `map` | 2 | 2 |
| `summit` | 2 | 3 |
| `camp` | 2 | 2 |

## Scenes

**`boot`**: boot (1 bar, 2 in the 30): the handheld powers on. The glass wakes one tone per step, shadow to paper; the logo (the two-peak mark, RIDGELINE, the POCKET tag) drops in whole-pixel steps and lands with a ding on beat 2, a glint crosses it, and the promise types itself in. In the 30 PRESS START blinks on the beat and is pressed on the last beat; the trail scene dissolves out of this screen.

**`trail`**: trail (2 bars, 3 in the 30): dawn at the trailhead. START is pressed and the boot screen dissolves, in dither order, into a dark valley; the light comes up in tone steps (the light field rises from -1.6 to 0 and the sun lights the far peaks in dithered rings). The hiker walks in to the signpost, the status bar slides down (05:48, full signal, 100%), and the trail card opens out of the sign: distance, climb, time and water count in row by row, then the turn people miss, with a blinking warning. Birds cross the sky in the hold, the sun ring breathes on the beat. In the 30 the card folds back into the sign and the hiker walks on (the forest pushes this screen away).

**`forest`**: forest (2 bars, the 30 only): into the trees. The forest pushes the trailhead screen off to the left in five whole steps, the way handheld games change screens, and the hiker keeps walking across it between the trunks and the ferns (a paper outline keeps the sprite apart from the busy undergrowth; the ferns cover the boots). The canopy is shady (light field -0.35) with two light shafts swaying a pixel or two and dust that shows only inside them. The signal bars drop one by one, NO SERVICE blinks in the status bar, then the app answers: OFFLINE MAP READY, 12 MB on this device. The offline map opens out of this screen next.

**`map`**: map (2 bars): the offline map. The map window grows out of the previous screen in whole steps until it fills the screen under the status bar (still no signal: OFFLINE). The topographic map (contour terraces, the lake, the river) is printed faded, with no shadow tone left, so the dark route with its paper halo reads on it: it draws on from the trailhead up the contours to the summit, a flag and PIKA POINT pop up there, the way back follows dashed, and YOU blinks where the hiker is. Then the elevation panel slides up and draws the profile left to right; the steep last 0.8 km before the summit fills dark and flashes, on the profile and on the map at once ("the steep part before you reach it").

**`summit`**: summit (2 bars, 3 in the 30): above the clouds. An iris opens from the map's summit flag onto a screen full of cloud; the cloud banks sink away in whole steps and the hiker climbs out of them onto the summit rocks (a paper rim keeps the dark sprite readable on dark rock) while the sun lights the cloud sea in dithered rings that breathe on the beat. SUMMIT! is stamped on beat 3 (one oversized step, then it settles), PIKA POINT 1,847 M under it, and the check-in types in: saved offline, syncs in range. Out: the windows fold, the clock runs to 19:52, the battery to 91%, and the light field falls to -2.2, so the summit goes to dusk tone by tone (the camp opens out of it).

**`camp`**: camp (2 bars, the last scene): night at the lake. The dusk summit dissolves in dither order into the camp; the fire is a light in the light field whose radius flickers every step, so its dithered rings breathe over the ground and the tent; the hiker stands by it as a dark figure with the fire catching the edge that faces it; sparks rise and step down from paper to moss as they cool, stars blink, the tent's lantern switches on (beat 2). The day log types in: 12.4 km, +860 m, one summit, 9% battery. On beat 4 an iris closes onto the fire; the end card is the logo in reverse under a blinking night sky, the promise typing in, the fire as a small two-frame icon still burning under it, the fictional-app note, and one shooting star.

## Provenance and credits

- The material in `source/` was written for this example; the project is fictional and the reel says so on screen.
- Music and sound effects are synthesized by `audio/` (no samples).
- No font files: the type is a bitmap font drawn in code.
