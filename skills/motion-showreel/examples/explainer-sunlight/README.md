# Example: explainer-sunlight (Sunlight for Breakfast)

A question goes in (where does the energy in your toast come from?) and a flat vector science explainer comes
out: saturated rounded shapes on a dark violet universe. Two nuclei fuse in the Sun's core and the light is born;
the Sun's surface lets it go; a clock runs to 8:20 as it crosses space past Mercury and Venus; three rays in ten
bounce off the clouds and blue light paints the sky; a wheat leaf catches it and a chloroplast turns it into sugar;
a field grows gold, grain becomes flour becomes bread; the toast on the plate, and the whole journey in one row of
pictures. The 60-second cut adds the slow random walk out of the Sun and an aurora. Nothing here picks a preset:
palette, type, motion and music come from `source/` and are written to `style.json` with the reasoning for every
decision.

- Web version with every cut: [`dist/sunlight-for-breakfast-v1.0.0.html`](dist/sunlight-for-breakfast-v1.0.0.html) ([play in the browser](https://raw.githack.com/AwesomeZun/Awesome-Showreels/main/skills/motion-showreel/examples/explainer-sunlight/dist/sunlight-for-breakfast-v1.0.0.html))
- Cuts: `short` (8 bars = 15.0 s), `30` (16 bars = 30.0 s), `60` (32 bars = 60.0 s), all at 128 BPM.

> An explainer of a real journey. The numbers on screen are rounded textbook values (`source/notes.md`); where estimates differ, as for the time light takes to get out of the Sun, the range is shown. The pictures are drawings, not to scale.

## Folder

```
explainer-sunlight/
  source/                 3 file(s)
    fonts/Nunito-Variable.ttf
    fonts/OFL.txt
    notes.md
  modules/                2 file(s)
    fv.js
    things.js
  scenes/                 9 file(s)
    aurora.js
    core.js
    leaf.js
    sky.js
    space.js
    surface.js
    toast.js
    walk.js
    ... 1 more
  style.json
  reel.config.json
  STORYBOARD.md
  dist/
```

## Run it

```bash
S=skills/motion-showreel; P=$S/examples/explainer-sunlight
python3 $S/tools/extract_style.py --source $P/source --project $P --board      # draft style (review by hand)
python3 $S/timing/plan_cut.py --project $P --cut short,30,60
for c in short 30 60; do python3 $S/audio/arrange.py --project $P --cut $c; done
python3 $S/audio/verify_sync.py --wav $P/build/music-short.wav --cut $P/build/cut-short.json
node $S/runtime/render.mjs --project $P --cut short --out out/explainer-sunlight-short.mp4
node $S/runtime/build.mjs --project $P --cuts short,30,60 --out out/sunlight-for-breakfast.html
```

## How it was made

1. **Facts first.** `source/notes.md` holds every number the reel shows (15 million °C, about 4 million tonnes a
   second, 10,000 to 170,000 years, 5,500 °C, 300,000 km/s and 150 million km, about 30% reflected, about 1% kept
   by a field, about 80 kcal a slice, about 20 W for the brain), rounded, with ranges where estimates differ.
2. **A flat vector kit in code.** `modules/fv.js` draws the universe (stars at their own depths, nebulae), stepped
   halo rings and additive glows, round things shaded flat (a shadow crescent cut by an offset circle, a soft shine),
   the light itself, the Sun (close warm bands, drifting granulation, sunspots, prominences) and a turning Earth;
   `modules/things.js` the objects (a wheat plant that grows and ripens, a leaf blade, toast, a loaf, flour, grain,
   molecules, a brain, a bulb). No generated images.
3. **Depth from layers.** Every place is built back to front (hills, rows of wheat that grow larger toward the
   lens, haze between them); the camera dives through scales and the scenes hand over with short crossfades.

## What the tone pass decided

- **palette.** A dark violet universe (#140C2E to #3B2275) so every light source can glow; the Sun in bands of yellow, orange and red (#FFD84A, #FFA22B, #FF6A2B, #E8432E); the travelling light a warm white (#FFFBE8) with a gold halo; then the colours of the morning it ends in: ocean blue, leaf greens (#56BE45, #26742A), wheat gold (#F3C04C) and toast brown (#B8662B). Labels are white pills with violet ink.

- **type.** Nunito, a rounded sans whose terminals match the rounded shapes: Black (900) capitals with wide tracking for titles, ExtraBold for labels and captions, numbers set large where the number is the point (8:20).

- **motion.** Flat layers move at different speeds for depth (stars, planets, foreground bokeh); round things pop in with a little overshoot, labels spring open; the camera zooms through scales (core, Sun, space, Earth, leaf, cell, chloroplast, field, table) and each scene picks up the previous one's last move. Ease ioC and outBack.

- **sound.** A bright synth-pop bed at 128 BPM in E major (pad, plucked arpeggios, bells, a driving eighth-note bass, the full kit at the busy parts): a shimmer on the fusion flash, a whoosh as the light leaves the Sun, a tick on every beat while the clock runs, a chime at 8:20, pops for the labels.

- **visuals.** Nine moments: the Sun's core with nuclei fusing and the first light (title); (60) the random walk out through the dense interior; the Sun's surface; the trip through space past Mercury and Venus with a clock to 8:20; (60) the solar wind and an aurora; the sky, where 3 rays in 10 bounce back and blue scatters; a wheat leaf, its cells and a chloroplast where light becomes sugar; a field growing gold, grain, flour, bread; toast on a plate and the end card. No generated images, no characters: everything is drawn in code.

## Same BPM, more bars

The 30- and 60-second cuts are the same reel with longer holds and the scenes only they have; the tempo never changes.

| Scene | short | 30 s | 60 s |
|---|---|---|---|
| `core` | 1 | 2 | 2 |
| `walk` | - | - | 4 |
| `surface` | 1 | 2 | 2 |
| `space` | 2 | 3 | 4 |
| `aurora` | - | - | 4 |
| `sky` | - | 2 | 3 |
| `leaf` | 1 | 3 | 5 |
| `wheat` | 1 | 2 | 4 |
| `toast` | 2 | 2 | 4 |

## Scenes

**`core`**: core (1 bar, 2 in the 30 and 60): where the light is made. Inside the Sun's core, plasma in flat layers drifts at three depths while hydrogen nuclei dash about; two meet in the middle, a flash, and out of it comes the light the whole story follows: a warm white point with a gold halo. The title drops in letter by letter, and a pill says where we are: the Sun's core, about 15 million °C. In the longer cuts a line adds that the Sun turns about 4 million tonnes of matter into energy every second, with more flashes going off behind.

**`walk`**: walk (4 bars, the 60 only): the slow part. The Sun cut open like a cake: the yellow core, the orange layer where light only diffuses, the boiling outer third with its turning cells. A marker creeps out from the core while a magnifier shows what it is doing: absorbed and given off again, each time in a random direction, a zig-zag that barely gets anywhere, scattering flashes at every turn. A counter spins through the years and settles on the range of estimates (about 10,000 to 170,000 years); then a rising cell of hot gas carries the marker to the surface.

**`surface`**: surface (1 bar in the 15, 2 in the 30 and 60): the light gets out. The camera pulls back from the Sun's edge to the whole Sun: halo rings, banded body, drifting granulation, sunspots, prominences arching off the limb. A pill names the surface, about 5,500 °C; in the longer cuts a line says that from here the light is free. In the last beats the light launches off the right edge of the Sun with a streak.

**`space`**: space (2 bars in the 15, 3 in the 30, 4 in the 60): eight minutes and twenty seconds. The camera rides with the light: the Sun falls behind and shrinks, stars stream past at their own depths, Mercury and Venus slide by as the clock passes the time their orbits take (3:13, 6:01), and the Earth grows ahead. The clock along the top runs from 0:00 to 8:20 and the distance under it to 150 million km; a pill gives the speed, 300,000 km every second. When the clock lands on 8:20 it pulses and a pill spells it out.

**`aurora`**: aurora (4 bars, the 60 only): not everything the Sun sends is light. First the Earth in its magnetic field (cyan loops, squeezed on the Sun's side and stretched behind) while the solar wind, a stream of pink particles, arrives from the left, piles against an arc and slides around it, a few riding the field lines down to the poles, where green rings light up. Then down to a polar night: snowy ranges in layers, a frozen lake, and the curtains of an aurora waving across the sky, green below and red on top, reflected in the ice. Pills name the oxygen behind each colour.

**`sky`**: sky (2 bars in the 30, 3 in the 60): the air. The Earth's edge from space, its blue rim of air; ten rays of sunlight come down, and three of them bounce off the clouds straight back to space (pill: about 3 in 10). Then the camera drops through the air: the horizon flattens, the sky turns from violet to morning blue as the rays shed blue light in every direction, and a sunrise glows over a field of young wheat. In the 60 a line adds where the rest goes.

**`leaf`**: leaf (1 bar in the 15, 3 in the 30, 5 in the 60): light becomes sugar. A wheat leaf in morning light; the light dives into it and the camera follows. In the longer cuts: the leaf's cells, packed with green chloroplasts that stream around; one chloroplast up close, its stacked discs catching red and blue light while green bounces off (that's why leaves look green); the equation, 6 CO₂ + 6 H₂O + light, giving C₆H₁₂O₆ + 6 O₂, with the molecules drifting in and out; in the 60, the oxygen bubbling out of the leaf into the air. Every cut ends on a ring of sugar, glowing.

**`wheat`**: wheat (1 bar in the 15, 2 in the 30, 4 in the 60): a season in a few seconds. A field grows in time-lapse, green shoots to golden heads, swaying, while a small sun arcs over it again and again; a pill says a field keeps only about 1% of the sunlight that falls on it. In the longer cuts one wheat head fills the frame, its grains glowing (the sugar stored as starch), and in the 60 the field rolls in the wind at golden hour. It ends on grain, flour and bread popping in a row, joined by arrows.

**`toast`**: toast (2 bars in the 15 and 30, 4 in the 60): breakfast. A morning table in a shaft of window light; the light slides down the beam and soaks into a slice of toast on a plate, butter melting, steam curling. A pill: one slice is about 80 kcal; a line: sunlight, stored. In the 60 the toast moves aside for a glowing brain and a light bulb: your cells burn its sugar with oxygen, and the brain alone runs on about 20 watts. It ends on the journey in one line of pictures (the Sun, the Earth, a leaf, a wheat head, the toast) joined by a dashed path the light runs along, under the title and the line: made in the Sun more than ten thousand years ago, on your plate this morning.

## Provenance and credits

- The notes in `source/` were written for this example from standard values (the Sun, light, the atmosphere, photosynthesis, bread); no text, figure or frame is taken from any video, book or paper, and no character or mascot appears.
- Music and sound effects are synthesized by `audio/` (no samples).
- Fonts ship with their licences: `source/fonts/OFL.txt`.
