# Example: paper-behaviour (A gut bacterial metabolite eases anxiety-like behaviour)

A fictional neuroscience article goes in; a reel that looks like the lab's tracking software comes out. A white
mouse and the gut bacteria pose the question; two mice run ten minutes of the open field side by side, the vehicle
mouse along the walls and the treated one across the centre, with live counters; the occupancy of all twelve mice
per group blooms into heatmaps and every mouse's centre time becomes a dot; the water maze shows they learn alike;
and the end states the finding next to the 3Rs of animal welfare. Nothing here picks a preset: palette, type, motion
and music come from `source/` and are written to `style.json` with the reasoning for every decision.

- Web version with every cut: [`dist/gut-metabolite-anxiety-v1.0.0.html`](dist/gut-metabolite-anxiety-v1.0.0.html) ([play in the browser](https://raw.githack.com/AwesomeZun/Awesome-Showreels/main/skills/motion-showreel/examples/paper-behaviour/dist/gut-metabolite-anxiety-v1.0.0.html))
- Cuts: `short` (8 bars = 18.5 s), `30` (13 bars = 30.0 s), all at 104 BPM.

> A gut bacterial metabolite eases anxiety-like behaviour is fictional. Every name, number and screen is demo content made for this example.

## Folder

```
paper-behaviour/
  source/                 9 file(s)
    data/open_field.csv
    data/water_maze.csv
    fonts/InstrumentSans-Variable.ttf
    fonts/JetBrainsMono-Variable.ttf
    fonts/OFL-InstrumentSans.txt
    fonts/OFL-JetBrainsMono.txt
    gen/a/prompt.txt
    gen/b/prompt.txt
    ... 1 more
  assets/                 5 file(s)
    data/behaviour.json
    ill/meta.json
    ill/microbes.webp
    ill/mouse_side.webp
    ill/mouse_top.webp
  modules/                1 file(s)
    beh.js
  scenes/                 5 file(s)
    end.js
    field.js
    heat.js
    maze.js
    title.js
  paper-src/              1 file(s)
    simulate.py
  style.json
  reel.config.json
  STORYBOARD.md
  dist/
```

## Run it

```bash
S=skills/motion-showreel; P=$S/examples/paper-behaviour
python3 $S/tools/extract_style.py --source $P/source --project $P --board      # draft style (review by hand)
python3 $S/timing/plan_cut.py --project $P --cut short,30
for c in short 30; do python3 $S/audio/arrange.py --project $P --cut $c; done
python3 $S/audio/verify_sync.py --wav $P/build/music-short.wav --cut $P/build/cut-short.json
node $S/runtime/render.mjs --project $P --cut short --out out/paper-behaviour-short.mp4
node $S/runtime/build.mjs --project $P --cuts short,30 --out out/gut-metabolite-anxiety.html
```

## How it was made

1. **The data, simulated.** `paper-src/simulate.py` runs every mouse as a correlated random walk in the 40 x 40 cm
   box for ten minutes, with pauses and a pull toward the walls whose strength is its anxiety; the pull was tuned so
   the groups land on the article's centre times. Occupancy maps, distances, the t-tests and the water-maze
   latencies come from the same run; the manuscript's numbers were then set to match the data, not the other way.
2. **Three illustrations.** The mouse from the side and from above and the gut bacteria are GPT Image 2.5
   illustrations made with a transparent background (`source/gen/<job>/prompt.txt`; the PNGs are not committed).
   `gen-src/prep.py` finds the mouse's body (not its tail) so it turns about its middle along a track.
3. **The software look.** `modules/beh.js` draws the arenas to scale (centimetres to pixels), smooth tracks, the
   heatmaps and the charts, and keeps a mouse running in every hold, so the panels never freeze.

## What the tone pass decided

- **palette.** The figure style's own: clean white panels on a faint grid, the treatment in blue (#2563EB) and the vehicle in slate grey (#64748B) in every panel; the occupancy heatmaps run from white through the group colour to deep navy; the water is a pale blue.

- **type.** Instrument Sans for words and JetBrains Mono for every number (times, percentages, the p value), as the manuscript asks.

- **motion.** Like the tracking software: mice run their simulated tracks with a clock and live counters, paths draw behind them, heatmaps bloom from the walls inward, curves draw day by day; ease outExpo, no bounce. The welfare note sits at the foot of every panel.

- **sound.** Careful and light: corporate preset at 104 BPM in A major, marimba and soft strings, light drums; blips for tracking, a lock on the statistics.

- **visuals.** Five scenes: the question with the mouse and the gut bacteria; the open field side by side; the occupancy heatmaps and every mouse's centre time; the water maze, day 1 and day 5 (30 only); the finding and the 3Rs. The mice and bacteria are GPT Image 2.5 illustrations with a real alpha channel; every track, bin and number comes from paper-src/simulate.py.

## Same BPM, more bars

The 30-second cut is the same reel with longer holds (and optional scenes where they exist); the tempo never changes.

| Scene | short | 30 s |
|---|---|---|
| `title` | 2 | 2 |
| `field` | 2 | 3 |
| `heat` | 2 | 2 |
| `maze` | - | 3 |
| `end` | 2 | 3 |

## Scenes

**`title`**: title (1 bar, 2 in the 30): the question. A white lab mouse (a generated illustration with a real alpha channel) walks in from the left and stops; the gut bacteria drift on the right, giving off the small molecules the paper is about; the title rises over them, then the design in one line. In the 30 the design is drawn out: antibiotics, vehicle or BXM-2 for 14 days, then behaviour.

**`field`**: field (2 bars, 3 in the 30): ten minutes in the open field, side by side. Two arenas seen from above, vehicle on the left and BXM-2 on the right; one mouse in each runs its simulated track (10 minutes in the scene's length, the clock running), turned to its heading, its path drawn behind it in the group's colour. The vehicle mouse hugs the walls; the BXM-2 mouse crosses the centre zone. Each arena counts its mouse's time in the centre as it goes.

**`heat`**: heat (2 bars): where they spent their time. The two example tracks give way to the occupancy heatmaps of all twelve mice per group, blooming from the walls inward (each 1-cm bin coloured by how long the mice stayed there): the vehicle group's heat lies along the walls, the BXM-2 group's reaches into the centre. Then every mouse's time in the centre is a dot, the means draw as bars (8.9% and 19.2%) with the t-test, and a note that both groups walked as far.

**`maze`**: maze (2 bars, the 30 only): memory, not anxiety. Two pools from above with the hidden platform: each group's day-1 swim draws as a long search around the wall, then its day-5 swim goes almost straight to the platform. Beside them the escape latencies over five days fall the same way for both groups (means of twelve mice with their spread), so the metabolite changed how they explore, not how they learn.

**`end`**: end (2 bars, 3 in the 30): the finding and the animals. A BXM-2 mouse explores its arena over its group's faint occupancy map, crossing the centre, and the finding rises beside it: BXM-2 brings back exploration, memory unchanged. Then the 3Rs, each in a line, the authors, and the note that the article and its data are fictional.

## Provenance and credits

- The material in `source/` was written for this example; the project is fictional and the reel says so on screen.
- Music and sound effects are synthesized by `audio/` (no samples).
- Fonts ship with their licences: `source/fonts/OFL-InstrumentSans.txt`, `source/fonts/OFL-JetBrainsMono.txt`.
