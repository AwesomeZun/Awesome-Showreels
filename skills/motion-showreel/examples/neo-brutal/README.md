# Example: neo-brutal (kablok)

A neo-brutalist landing page for a fictional creator-tools SaaS goes in; a loud, flat, snappy reel comes out: paper,
lemon, lilac, mint and tomato blocks with thick ink borders and hard offset shadows, chunky Archivo Black type,
buttons that press into their shadows and cards that drop and stack on a funk groove. Nothing here picks a preset:
every value in `style.json` is traced to `source/` in its `rationale`.

- Cuts: `short` (7 bars = 15 s) and `30` (14 bars = 30 s), both at 112 BPM.
- Carriers: kinetic type, the page's own components redrawn in code (block library, Mara's page, toasts, marquee,
  logo slab), and a chunky cursor that carries one block through the whole reel.
- Music and previews: not made yet (stage 2, after the audio library gains a funk groove).

> kablok is fictional. Every creator, handle, price and notification is made up for this example.

- Demo (short cut, with its music): [`assets/demo-neo-brutal-v1.0.0.mp4`](../../../../assets/demo-neo-brutal-v1.0.0.mp4)
- Web version with every cut: [`dist/kablok-v1.0.0.html`](dist/kablok-v1.0.0.html) ([play in the browser](https://raw.githack.com/AwesomeZun/Awesome-Showreels/main/skills/motion-showreel/examples/neo-brutal/dist/kablok-v1.0.0.html))
- Cuts: `short` (9 bars = 19.3 s), `30` (14 bars = 30.0 s), all at 112 BPM.

## Folder

```
neo-brutal/
  source/                 the material (written for this example)
    index.html            landing page: hero, example page, toasts, marquee, steps, block library, pricing
    kablok.css            tokens --kb-*, 5 px borders, 8 px hard shadows, press/pop/drop keyframes, @font-face
    BRAND.md              voice, colour roles, shape, type, motion and sound rules
    logo.svg              the lemon wordmark slab
    fonts/                Archivo + Martian Mono variable TTFs (SIL OFL 1.1, OFL-*.txt), from google/fonts
  style.json              reviewed tone & manner spec
  reel.config.json        scenes, bars, cues, cuts
  STORYBOARD.md           brief, exact copy, banned wording, look rules, beat tables
  modules/kablok-kit.js   brutal box (border + hard shadow + press), pop/drop/squash springs, cursor, toasts,
                          starburst, marquee, Archivo width-axis registration
  scenes/                 pick.js stack.js ship.js logo.js
  build/                  generated (git-ignored): extraction, cut plans, style board
```

## Run it

From this folder, with `S=../..`. One-time setup: `(cd $S/runtime && npm install)`.

```
python3 $S/tools/extract_style.py --source source --project . --board   # draft -> build/style.draft.json, build/style-extract.*
python3 $S/timing/plan_cut.py --project . --cut short,30 --strict
node $S/runtime/stills.mjs --project . --cut short --range 0:15:0.5 --out build/review/short --sheet
node $S/runtime/stills.mjs --project . --cut 30 --serve
```

## What the extractor drafted, and what review changed

The draft (`build/style.draft.json`) got the measurable things right: light theme on paper `#FFF5E1`, ink `#111111`,
lemon / lilac / mint as accent / accent2 / accent3, Archivo + Martian Mono from the shipped files, energetic pace.

It got the manner wrong, and it leaned toward the old `playful-app` look:

- **Motion:** spring f 2.48 z 0.56 (a soft 240 ms bounce) and transitions `blobWipe` and `whip`; BRAND.md asks for
  80 ms presses, 180 ms pops that stop dead, no blur, no fades over 120 ms. Reviewed: f 4.5 z 0.55, transitions
  `cut` / `match` / `impact`, slab wipes drawn in scene code, `motion.ui` carries the brand numbers.
- **Sound:** `bright-pop` 120 BPM A major with pad, bell, marimba and glassy SFX (the pastel recipe). BRAND.md says
  slap-ish bass, dry claps on 2 and 4, clav stabs, 112-116 BPM, "every press is a click, every drop is a thunk".
  Reviewed: 112 BPM (inside the range; the only tempo there where 15 s and 30 s are whole bars), E minor standing in
  for E dorian, e-piano / pluck / bass / stab, organic SFX, swing 0.12, and a `sound.groove` block for stage 2.
- **Palette:** tomato `#FF5A36` ("the one button that matters") was dropped from the roles; kept as `tomato`.
  `accentInk` was derived olive `#817100` though the brand says text is always ink; set to ink. `muted` was derived
  instead of the authored `--kb-muted`; `line` was a pale grey, but every line in this world is ink.
- **Type:** display 800, body 500; the brand says Black 900 and heavy labels. Reviewed: 900 / 700 and a chunkier
  scale.
- **Visuals:** proposed `app-ui` and `web-shots` captures; a screenshot would freeze the components that have to
  move, so the reel redraws them from the tokens (`vector`).
- **Not read at all:** the border width and the offset shadow, the defining traits of the style, have no slot in the
  draft; `layout.border`, `layout.shadow` and `layout.radius` were added by hand.

## QA (stage 1, silent drafts)

`tools/motion_qa.py` passes on both cuts: short 92% of frames alive, 30-s cut 89%, no frozen runs, no pops, no
near-static holds.
