# Example: pixel-isometric (Pebble & Bean)

A neighbourhood roastery's opening notes and its 16-colour palette go in; a cosy isometric pixel diorama comes out: the shop builds itself tile by tile like a building game, a 2x close-up of the roaster and the counter, Elm Street swapping to its evening palette, and the opening card. Nothing here picks a preset: palette, type, motion and music come from `source/` and are written to `style.json` with the reasoning for every decision.

- Web version with every cut: [`dist/pebble-and-bean-v1.0.0.html`](dist/pebble-and-bean-v1.0.0.html) ([play in the browser](https://raw.githack.com/AwesomeZun/Awesome-Showreels/main/skills/motion-showreel/examples/pixel-isometric/dist/pebble-and-bean-v1.0.0.html))
- Cuts: `short` (7 bars = 19.5 s), `30` (10 bars = 27.9 s), all at 86 BPM.

> Pebble & Bean is fictional. Every name, number and screen is demo content made for this example.

## Folder

```
pixel-isometric/
  source/                 2 file(s)
    README.md
    palette.txt
  modules/                2 file(s)
    bean.js
    shop.js
  scenes/                 4 file(s)
    build.js
    inside.js
    opening.js
    street.js
  style.json
  reel.config.json
  STORYBOARD.md
  dist/
```

## Run it

```bash
S=skills/motion-showreel; P=$S/examples/pixel-isometric
python3 $S/tools/extract_style.py --source $P/source --project $P --board      # draft style (review by hand)
python3 $S/timing/plan_cut.py --project $P --cut short,30
for c in short 30; do python3 $S/audio/arrange.py --project $P --cut $c; done
python3 $S/audio/verify_sync.py --wav $P/build/music-short.wav --cut $P/build/cut-short.json
node $S/runtime/render.mjs --project $P --cut short --out out/pixel-isometric-short.mp4
node $S/runtime/build.mjs --project $P --cuts short,30 --out out/pebble-and-bean.html
```

## What the tone pass decided

- **palette.** The shop's 16 pastels (palette.txt), never black: shadows are darker tiles of the same family. At dusk the whole palette swaps to its evening ramp step by step and the windows glow (glow #FFE8A3).

- **type.** A 5x7 pixel face with the house sign's one-pixel caramel shadow (modules/bean.js).

- **motion.** A cosy building game: the shop assembles tile by tile in a diagonal wave, people and the roaster animate in two-frame loops on an 8-fps step clock (86 BPM: about 5.6 steps per beat), steam rises in single pixels.

- **sound.** Slow lo-fi with game-console sounds (README): 86 BPM in F major, a soft pad, pulse-wave comping, a stepped triangle bass, boom-bap drums with swing and tape.

- **visuals.** An isometric diorama on a 320 x 180 grid at 6x: the lot builds itself, the cutaway interior with the roaster and the counter, the street at dusk, the opening card.

## Same BPM, more bars

The 30-second cut is the same reel with longer holds (and optional scenes where they exist); the tempo never changes.

| Scene | short | 30 s |
|---|---|---|
| `build` | 2 | 3 |
| `inside` | 2 | 3 |
| `street` | 1 | 2 |
| `opening` | 2 | 2 |

## Scenes

**`build`**: build (2 bars, 3 in the 30): the shop builds itself like a cosy building game. The floor arrives in a diagonal wave of tiles (beats 0-1), the two back walls rise (1.5-2.5), then each piece drops in on the half beat: windows, counter, espresso machine, roaster, tables, plants, menu board; the sign lands on beat 6 with a chime. The barista steps behind the counter, steam starts; a customer walks in during the 30-s hold.

**`inside`**: inside (2 bars, 3 in the 30): the close-up at 2x. The roaster's drum turns and beans pour from the hopper, the barista works the machine and steam rises from the cups, a customer walks in, the menu board reads FLAT WHITE 4.5. A pixel caption types in on beat 1 (ROASTED IN THE WINDOW), then one on beat 4 (POURED AT THE COUNTER). The camera pans across in whole pixels from the roaster to the counter.

**`street`**: street (1 bar, 2 in the 30): Elm Street at dusk. The shop between the bakery and a house, trees and lamp posts; the palette swaps to its evening ramp a step per beat, the shop's windows glow first, then the neighbours', the lamps come on, two people walk along the pavement, and once it is dark string lights chase along the shop's roof edge.

**`opening`**: opening (2 bars; the end card): a big pixel cup with a latte-art heart and steam on the left; the sign, the opening day and address, the first-50-cups line type on; the fictional-shop note. Hold: steam keeps rising, the heart's foam shimmers a pixel each beat.

## Provenance and credits

- The material in `source/` was written for this example; the project is fictional and the reel says so on screen.
- Music and sound effects are synthesized by `audio/` (no samples).
- Fonts ship with their licences: see `source/fonts/`.
