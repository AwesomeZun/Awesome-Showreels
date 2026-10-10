# Example: pixel-isometric (Pebble & Bean)

A neighbourhood roastery's one-page README and its 16-colour palette go in; a cosy building game comes out. Moving day:
the empty shop wakes up in the morning light, and on every beat the next piece of the shop hops out of the moving box
to its place until the sign paints itself on the wall; then the shop opens (a customer walks in, the barista pours,
the roaster turns, the cat stretches), a flat white gets its heart, and the corner sits in the rain at night while
the sign lights letter by letter. Nothing here picks a preset: palette, type, motion and music come from `source/`
and are written to `style.json` with the reasoning for every decision.

- Web version with every cut: [`dist/pebble-and-bean-v2.0.0.html`](dist/pebble-and-bean-v2.0.0.html) ([play in the browser](https://raw.githack.com/AwesomeZun/Awesome-Showreels/main/skills/motion-showreel/examples/pixel-isometric/dist/pebble-and-bean-v2.0.0.html))
- Cuts: `short` (7 bars = 19.5 s), `30` (11 bars = 30.7 s), all at 86 BPM.

> Pebble & Bean is fictional. Every name, number and screen is demo content made for this example.

## Folder

```
pixel-isometric/
  source/                 8 file(s)
    README.md
    fonts/Jersey10-Regular.ttf
    fonts/OFL.txt
    gen/a/prompt.txt
    gen/b/prompt.txt
    gen/c/prompt.txt
    gen/d/prompt.txt
    palette.txt
  assets/                 40 file(s)
    px/barista_0.png
    px/barista_1.png
    px/barista_2.png
    px/barista_3.png
    px/box.png
    px/box_open.png
    px/cactus.png
    px/chair_l.png
    ... 32 more
  modules/                2 file(s)
    diorama.js
    room.js
  scenes/                 6 file(s)
    day.js
    evening.js
    latte.js
    lights.js
    opening.js
    unpack.js
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
node $S/runtime/build.mjs --project $P --cuts short,30 --out out/pebble-and-bean-v2.html
```

## How the pixel art was made

1. **Originals.** Seven images from GPT Image 2.5 through the Codex CLI (`source/gen/<job>/prompt.txt` holds every
   prompt; the PNGs themselves are not committed): the empty room, two sheets of furniture and small things, a sheet of
   people and the cat, the street corner outside, and the cup from above. Every prompt asks for the shop's 16 pastels,
   2:1 isometric drawing, shadows as darker tiles and no text.
2. **Exactly the 16 pastels.** `gen-src/pixelize.py` keys out the green screen, snaps every pixel to the nearest of the
   16 colours by CIELAB distance (RGB distance turned the wood into peach blotches) and samples one art pixel per
   generated block with a majority vote. The empty room sets the scale (its 3 m wall is 137 art pixels): the sheets are
   cut into one sprite per item and every item is sampled again from the original at the size it has in the room; the
   people sheet is cut into rows of frames, and the cat gets its own, much smaller, scale.
3. **Light inside the palette.** `modules/diorama.js` composes each frame as palette indices in a 640 x 360 world
   buffer. Dusk moves every colour one stop along a cool ramp and lamplight one stop along a warm one, through a 4x4
   ordered dither, so the night and the lamp pools never leave the 16 colours; glow pixels are lamps and stay lit, and
   only soft halos add light on top. The camera shows the world at whole-number scales; the interface has its own
   layer at 5x.

## What the tone pass decided

- **palette.** The shop's 16 pastels (palette.txt) and nothing else: every asset is stored in them and read back as palette indices. Dusk does not tint; it moves each colour one stop along a hand-made cool ramp (cream to sky, latte to dusk, caramel to plum), and lamplight one stop along a warm one (latte to sand, sand to cream, cream to glow), through a 4x4 ordered dither, so evenings and lamp pools stay inside the palette. Glow pixels are lamps and never darken; only soft halos on bulbs, windows and the sign add light on top.

- **type.** Jersey 10 (OFL), a soft pixel face with lower case, drawn at art size and thresholded, with the house sign's one-pixel caramel shadow. The sign on the wall and on the facade is sheared along the wall like paint; the interface (cards, the menu, progress) sits on its own layer at 5x.

- **motion.** A cosy building game: one thing out of the box per beat (a hop that grows from 40% to full size, a squash and stretch on the off-beat landing, a puff of dust), people and the cat on a step clock of six steps per beat, the camera stepping between whole-number scales (4x, 5x, 6x) and drifting a whole art pixel at a time.

- **sound.** Slow lo-fi with game-console sounds (README): 86 BPM in F major, a soft pad, pulse-wave comping, a stepped triangle bass, boom-bap drums with swing and tape.

- **visuals.** Six scenes: moving day in the dark, empty shop; the unpacking; the shop open for business; a flat white poured from above (30 only); the corner in the rain at night, the sign lighting letter by letter; the opening card. The room, the furniture, the people, the street corner and the cup are GPT Image 2.5 pixel art (prompts in source/gen) converted to the 16 pastels by gen-src/pixelize.py; the layout, the light, the rain, the milk and the interface are code.

## Same BPM, more bars

The 30-second cut is the same reel with longer holds (and optional scenes where they exist); the tempo never changes.

| Scene | short | 30 s |
|---|---|---|
| `lights` | 1 | 1 |
| `unpack` | 2 | 3 |
| `day` | 2 | 2 |
| `latte` | - | 1 |
| `evening` | 1 | 2 |
| `opening` | 1 | 2 |

## Scenes

**`lights`**: lights (1 bar): moving day. The empty shop in the blue before morning: every colour sits three stops down the dusk ramp, the box pile waits in the middle of the floor, and a game-style card names the day (14 Elm Street, moving day). On beat 1 the morning comes in through the window: the light field climbs back to zero in dithered stops, the room turns from plum and dusk to cream and caramel. The open box's flaps twitch on beat 3; the unpacking starts on the next bar.

**`unpack`**: unpack (2 bars, 3 in the 30): one beat, one thing. Out of the open box, on every beat, the next piece of the shop hops to its place: it leaves the box at 40% of its size and grows on the way, lands on the off-beat with a squash and a stretch, and throws a little puff of dust (the rug first, then the counter, the espresso machine, the roaster and its sacks, the shelf, the pastry case, the monstera, the table and chairs, a stool and the menu easel, the pendant lamp and the pothos, a cactus and cups on the shelves, the record player). The short cut packs two or three into a beat. A progress card counts them in. On the last beat the empty boxes fold flat, and the sign paints itself on the wall letter by letter.

**`day`**: day (2 bars): open for business, everything happening at once like a cosy building game. The barista waves from behind the counter, then tamps and pours on the beats; a customer in a sage sweater walks in from the door to the counter; one in a plum coat sips at the table; the cat sits on the rug and stretches on beat 4; the roaster's drum turns its beans and smokes, cups steam in single pixels. The camera steps in on whole-number scales (4x, 5x on beat 2, 6x on beat 5, onto the counter and the roaster) and drifts a whole art pixel at a time between the steps. The menu card slides in on beat 2 with its four prices, and a note points at the roaster: roasted here, 7 to 9 every morning.

**`latte`**: latte (1 bar, the 30 only): the flat white from above, at 6x, on the counter with a plant and a napkin. A stream of milk falls into the crema and a white disc opens where it lands, rings running out across the surface; on beat 2 the jug moves forward and the disc becomes a heart (the shape eases from a circle to the heart curve); on beat 2.6 the stream pulls through it and cuts the cleft. Every pixel is one of the 16 pastels: cream foam, a sand edge, caramel crema. The tag types in on beat 3.

**`evening`**: evening (1 bar, 2 in the 30): rain on Elm Street. The outside of the shop at night: the light field takes everything two stops down the dusk ramp, while the windows stay warm (the lit room behind them is lifted a stop) and the street lamp throws a warm pool on the wet pavement, its glow mirrored in the puddle. Rain falls in pale streaks, rings open in the puddle. The house sign lights letter by letter (beats 1 to 2.5, glow pixels with the caramel shadow), and the camera steps in to 6x on it. Halos sit on the lamp, the windows and the sign.

**`opening`**: opening (1 bar, 2 in the 30; the end card): the camera steps back to the whole corner in the rain, sign lit, and a card rises in whole steps: Pebble & Bean, then on the half beats the opening in large type (Saturday, 8 am), the address (14 Elm Street, by the bakery) and the offer (the first 50 cups are on us). The rain keeps falling and the windows keep glowing on the hold; a line at the foot says the shop is fictional.

## Provenance and credits

- The material in `source/` was written for this example; the project is fictional and the reel says so on screen.
- Music and sound effects are synthesized by `audio/` (no samples).
- Fonts ship with their licences: `source/fonts/OFL.txt`.
