# Example: paper-organoid (A timed WNT pulse doubles mature enterocytes)

A fictional stem-cell article goes in; its lab notebook comes out, keeping itself. The notebook opens on the title
page, a cross-section of an organoid taped in and the title written by the pen; seven days of brightfield play in a
taped print while the pen keeps the log; the protocol and the 96-well plate fill in; and the result is drawn as a
bar chart, two times the mature enterocytes. Nothing here picks a preset: palette, type, motion and music come from
`source/` and are written to `style.json` with the reasoning for every decision.

- Web version with every cut: [`dist/wnt-pulse-organoids-v2.0.0.html`](dist/wnt-pulse-organoids-v2.0.0.html) ([play in the browser](https://raw.githack.com/AwesomeZun/Awesome-Showreels/main/skills/motion-showreel/examples/paper-organoid/dist/wnt-pulse-organoids-v2.0.0.html))
- Cuts: `short` (8 bars = 19.2 s), `30` (13 bars = 31.2 s), all at 100 BPM.

> A timed WNT pulse doubles mature enterocytes is fictional. Every name, number and screen is demo content made for this example.

## Folder

```
paper-organoid/
  source/                 10 file(s)
    data/growth.csv
    data/plate.csv
    fonts/Literata-Variable.ttf
    fonts/OFL.txt
    fonts/SplineSansMono-Variable.ttf
    fonts/caveat/Caveat-Variable.ttf
    fonts/caveat/OFL.txt
    gen/a/prompt.txt
    ... 2 more
  assets/                 8 file(s)
    data/organoid.json
    ill/cover.webp
    ill/dish.webp
    ill/meta.json
    ill/pen.webp
    ill/pipette.webp
    ill/plate.webp
    ill/stained.webp
  modules/                2 file(s)
    book.js
    ink.js
  scenes/                 4 file(s)
    cover.js
    grow.js
    plate.js
    result.js
  paper-src/              1 file(s)
    simulate.py
  style.json
  reel.config.json
  STORYBOARD.md
  dist/
```

## Run it

```bash
S=skills/motion-showreel; P=$S/examples/paper-organoid
python3 $S/tools/extract_style.py --source $P/source --project $P --board      # draft style (review by hand)
python3 $S/timing/plan_cut.py --project $P --cut short,30
for c in short 30; do python3 $S/audio/arrange.py --project $P --cut $c; done
python3 $S/audio/verify_sync.py --wav $P/build/music-short.wav --cut $P/build/cut-short.json
node $S/runtime/render.mjs --project $P --cut short --out out/paper-organoid-short.mp4
node $S/runtime/build.mjs --project $P --cuts short,30 --out out/wnt-pulse-organoids-v2.html
```

## How it was made

1. **Prints and props.** Four GPT Image 2.5 images (`source/gen/<job>/prompt.txt`; the PNGs are not committed): the
   cover cross-section, a stained organoid (labelled an illustration on the page), and, with transparent backgrounds,
   the tools sketched in the margin and the pen. `gen-src/prep.py` sizes them, cuts the sketch sheet into its three
   drawings and finds the pen's tip in the alpha, so the pen writes exactly where the ink appears.
2. **Handwriting that writes itself.** `modules/ink.js` is the sketchnote example's ink kit: each glyph of the
   handwriting font is thinned to its centre line and drawn stroke by stroke. `modules/book.js` lays out the notebook
   (paper, grid, header fields, tape, the page turn) and puts the pen at the head of whatever is being written.
3. **The organoid, in code.** The brightfield print is drawn from `paper-src/simulate.py`'s growth data: one stem cell,
   a cluster, a hollow cyst, then crypt buds pushing out on the days the data gives, with the phase halo of a
   brightfield image; the plate map fills from the plate data.

## What the tone pass decided

- **palette.** Notebook paper (#F4EFE4) with a faint blue grid, brightfield greys for the images (#D9D4CA field, #6E665C cell walls, white phase halos), and the stains only where the figure uses them: villin magenta (#C2185B) and LGR5 green (#2E7D32). Pencil graphite for annotations.

- **type.** Literata for the printed parts, Spline Sans Mono for days, doses and well IDs, as the figure style says; the notes themselves are handwriting (Caveat, OFL), written stroke by stroke by the pen.

- **motion.** A lab notebook that keeps itself: each scene is one spread, prints drop in and are taped down, the pen writes the notes and draws the charts at handwriting speed (the sketchnote example's self-writing ink), the brightfield print plays its seven days, the plate fills well by well, and the right page turns over the gutter between scenes. Ease ioSine; the only hits are the tape and the page.

- **sound.** Bench-side warmth: corporate preset at 100 BPM in D major with marimba and soft strings, light drums.

- **visuals.** Four spreads: the title page with the cover illustration (a generated watercolour-and-ink cross-section) and the tools sketched in the margin; seven days of brightfield, drawn in code from the growth data (one cell, a cyst, crypt buds on the right days) beside the handwritten log and growth curve; the protocol and the 96-well plate map; the result, a stained organoid illustration and the 2x bar chart. Prompts in source/gen; every number from paper-src/simulate.py.

## Same BPM, more bars

The 30-second cut is the same reel with longer holds (and optional scenes where they exist); the tempo never changes.

| Scene | short | 30 s |
|---|---|---|
| `cover` | 2 | 3 |
| `grow` | 2 | 4 |
| `plate` | 2 | 3 |
| `result` | 2 | 3 |

## Scenes

**`cover`**: cover (2 bars, 3 in the 30): the notebook opens on the project. A print of the organoid in cross-section (a generated watercolour-and-ink illustration) drops onto the right page and two strips of tape slap on; the pen fills the header and writes the title on the left page in its own hand. In the 30 it adds the authors, the question, and the margin sketches of the tools (pipette, plate, dome). On the last beat the right page turns.

**`grow`**: grow (2 bars, 4 in the 30): seven days in a taped print. The brightfield print on the left page is alive: one stem cell divides into a cluster, the cluster hollows into a cyst, and from day 2 crypt buds push out on the days the growth data gives, under a phase halo, with the day stamp running. On the right the pen keeps the log as the days pass, and draws the growth curve (diameter by day) as far as today. On the last beat the page turns.

**`plate`**: plate (2 bars, 3 in the 30): the protocol and the plate. On the left page the pen draws the week as a line and the four ways to give the 24-hour WNT pulse (day 2, 3, 4 or 5) as bars under it, with seeding and the day-7 readout. On the right a 96-well plate map fills column by column from the plate data (deeper magenta = more mature enterocytes) while the pipette sketch moves from well to well; then the pen rings the day-4 columns. The page turns at the end.

**`result`**: result (2 bars, 3 in the 30; the end): two times the enterocytes. A stained organoid drops onto the left page (a generated illustration in the style of immunofluorescence, and labelled as an illustration); on the right the pen draws the result as a bar chart (control 21%, day-4 pulse 42%, every well a dot), writes 2x and rings it, and notes that stem cells hold. The last lines are the article's: the authors, and that it is fictional with simulated data.

## Provenance and credits

- The material in `source/` was written for this example; the project is fictional and the reel says so on screen.
- Music and sound effects are synthesized by `audio/` (no samples).
- Fonts ship with their licences: `source/fonts/OFL.txt`, `source/fonts/caveat/OFL.txt`.
