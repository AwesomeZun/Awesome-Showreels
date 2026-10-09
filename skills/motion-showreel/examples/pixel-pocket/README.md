# Example: pixel-pocket (Ridgeline Pocket)

An offline hiking app's README and brand notes go in; a calm handheld-pixel reel comes out: four greens on a 240 x 135 grid, a 5x7 bitmap font drawn in code, motion that steps at 9 fps, and an LCD that ghosts and shows its grid. Nothing here picks a preset: palette, type, motion and music come from `source/` and are written to `style.json` with the reasoning for every decision.

- Web version with every cut: [`dist/ridgeline-pocket-v1.0.0.html`](dist/ridgeline-pocket-v1.0.0.html) ([play in the browser](https://raw.githack.com/AwesomeZun/Awesome-Showreels/main/skills/motion-showreel/examples/pixel-pocket/dist/ridgeline-pocket-v1.0.0.html))
- Cuts: `short` (8 bars = 17.8 s), `30` (13 bars = 28.9 s), all at 108 BPM.

> Ridgeline Pocket is fictional. Every name, number and screen is demo content made for this example.

## Folder

```
pixel-pocket/
  source/                 2 file(s)
    README.md
    brand-notes.md
  modules/                1 file(s)
    pocket.js
  scenes/                 4 file(s)
    boot.js
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
node $S/runtime/build.mjs --project $P --cuts short,30 --out out/ridgeline-pocket.html
```

## What the tone pass decided

- **palette.** The brand allows exactly four greens (shadow #1B2B1A, moss #3E5E2E, lichen #8FAE3A, paper #D4E59A) and forbids a fifth; gradients become ordered dithering between two neighbours.

- **type.** Its own 5x7 bitmap font, uppercase, tabular numbers, drawn pixel by pixel in code (modules/pocket.js); no anti-aliasing anywhere.

- **motion.** Everything steps at 9 fps on the 108-BPM grid (a beat is exactly 5 steps). The LCD keeps a faint ghost of the previous step. No smooth zooms; scrolling moves whole pixels.

- **sound.** Soft square-wave chiptune at 108 BPM in G major: pulse arps, a stepped triangle bass, a pulse lead and quiet noise drums, never loud ('a pocket toy, not a dashboard').

- **visuals.** A trail told in four screens: power-on, the side-scrolling trail with live distance and climb, the offline map drawing the route, the summit check-in.

## Same BPM, more bars

The 30-second cut is the same reel with longer holds (and optional scenes where they exist); the tempo never changes.

| Scene | short | 30 s |
|---|---|---|
| `boot` | 2 | 3 |
| `trail` | 2 | 4 |
| `map` | 2 | 3 |
| `summit` | 2 | 3 |

## Scenes

**`boot`**: boot (2 bars, 3 in the 30): the handheld powers on. Two steps of dark glass, then the paper-green screen; the RIDGELINE wordmark scrolls down one pixel per step (beats 0-3) and stops with a chime on beat 3, a pixel ridge icon blinks in above it, POCKET types under it one letter per step (4), the promise types in small (5), and PRESS START blinks on the half beat from beat 6. 30-s hold: tiny clouds drift across, PRESS START keeps blinking.

**`trail`**: trail (2 bars, up to 4 in the 30): on the Granite Saddle Loop. Side-scrolling in whole pixels: a dithered sky with clouds, the far ridge (1/4 speed), the near ridge (1/2), a row of pines and the trail itself (full speed) with a marker post every 64 px. The hiker walks in four stepped frames. The HUD counts distance and climb live; on beat 2 the trail card drops in (12.4 KM, +860 M), and an elevation profile draws itself bottom right with a dot riding it. 30-s hold: a bird flaps across, and a WATER IN 1.2 KM card replaces the trail card.

**`map`**: map (2 bars, up to 3 in the 30): "No signal? No problem." A top-down map of the loop in four greens: dithered meadow, contour lines, a winding creek and stands of trees. The signal icon shows crossed bars and NO SIGNAL blinks (beat 1); the route draws itself a few pixels per step behind a blinking you-are-here cursor; on beat 3 a stamp lands: OFFLINE MAP *. The map pans one pixel every other step. Footer: the region size and the trail name.

**`summit`**: summit (2 bars, up to 3 in the 30; the end card): Pika Point. A dithered sun rises behind a big ridge (lit face in lichen, shade in moss); the hiker climbs the last switchbacks a pixel at a time (beats 0-2), the flag goes in and a SUMMIT! stamp lands on beat 2; the summit name and height type on (3); the end card: wordmark, promise and the fictional-app note (4). Hold: the flag waves in two frames, clouds pass below the summit, the sun's rays blink, CHECK-IN SAVED blinks on every other beat.

## Provenance and credits

- The material in `source/` was written for this example; the project is fictional and the reel says so on screen.
- Music and sound effects are synthesized by `audio/` (no samples).
- Fonts ship with their licences: see `source/fonts/`.
