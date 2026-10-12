# Example: orbit-note (Orbit Note)

A real web app goes in: **Orbit Note**, a toyz original, an infinite-canvas note app where cards link by
themselves when you write `[[a card title]]`, entirely in the browser. The reel follows the brief GitReels gives its
one-shot reel writer (a dynamic 15-second 2D motion-graphics reel in a style tied to the core of the project; the
name and what it is within 2 seconds; one core message; at most four scenes; every text readable), in Korean like the
app, and grows a 30-second cut at the same tempo. Every card, panel and link in it is the app's own, captured from its
production build with its own fictional sample space; the look comes from the app's own design tokens.

- Web version with every cut: [`dist/orbit-note-v1.0.1.html`](dist/orbit-note-v1.0.1.html) ([play in the browser](https://raw.githack.com/AwesomeZun/Awesome-Showreels/main/skills/motion-showreel/examples/orbit-note/dist/orbit-note-v1.0.1.html))
- Cuts: `short` (6 bars = 15.0 s), `30` (12 bars = 30.0 s), all at 96 BPM.

> Orbit Note is a real app (a toyz original, Play Objects collection). The cards and links on screen are its fictional
> sample space, captured as the app shows it.

## Folder

```
orbit-note/
  source/                 5 file(s)
    README.md
    fonts/JetBrainsMono-latin-wght.woff2
    fonts/OFL-JetBrainsMono.txt
    fonts/OFL-Pretendard.txt
    fonts/PretendardVariable.woff2
  assets/                 29 file(s)
    captures/ui/app/card.json
    captures/ui/app/card_0.webp
    captures/ui/app/card_1.webp
    captures/ui/app/card_2.webp
    captures/ui/app/card_3.webp
    captures/ui/app/card_4.webp
    captures/ui/app/card_5.webp
    captures/ui/app/card_6.webp
    ... 21 more
  modules/                1 file(s)
    orbit.js
  scenes/                 5 file(s)
    end.js
    graph.js
    hook.js
    search.js
    wiki.js
  capture/                2 file(s)
    app.json
    explore.json
  style.json
  reel.config.json
  STORYBOARD.md
  dist/
```

## Run it

```bash
S=skills/motion-showreel; P=$S/examples/orbit-note
python3 $S/tools/extract_style.py --source $P/source --project $P --board      # draft style (review by hand)
python3 $S/timing/plan_cut.py --project $P --cut short,30
for c in short 30; do python3 $S/audio/arrange.py --project $P --cut $c; done
python3 $S/audio/verify_sync.py --wav $P/build/music-short.wav --cut $P/build/cut-short.json
node $S/runtime/render.mjs --project $P --cut short --out out/orbit-note-short.mp4
node $S/runtime/build.mjs --project $P --cuts short,30 --out out/orbit-note.html
```

## How it was made

1. **The brief.** GitReels' one-shot prompt and its clarity rules (name and what it is in the first 2 s, one core
   message, at most four scenes in the 15-second cut, readable text). The core idea is the app's own: write
   `[[제목]]` and the thoughts link up, and linked thoughts form an orbit.
2. **The real app, taken apart.** `capture/app.json` drives the app's production build (served locally; not
   committed): the empty space with every card and link hidden, each card and link label as an alpha layer at its
   own box, the holographic knot, the inspector before `[[포`, with the app's suggestion list, and after Enter, and
   the search palette. A DOM pass writes the geometry to `geo.txt` and `geo_linked.txt`: every link's SVG path,
   its screen matrix and length, before and after the new wiki link. The captures are stored as WebP.
3. **Rebuilt in code.** `modules/orbit.js` puts the parts back under a moving camera: the space (mirrored past its
   edges), the cards, and each link stroked from the app's own path so it can draw on with a light at its head;
   wiki links keep the app's dashes. The headlines' second lines run through the app's holographic gradient.

## What the tone pass decided

- **palette.** The app's canvas: electric blue #0B2FE6 deepening to #0720B0 and #030B4A, white for text and links, silver #F0F2F7 for panels, and its holographic gradient (#9FE9FF, #B9C4FF, #E2B9FF, #FFC6E6, #FFF1B8, #B2F7DD) as the accent, used for the second line of each headline and for glows.

- **type.** Pretendard Variable bold to heavy, white on blue with tight tracking; the second line of each headline runs through the holographic gradient glyph by glyph; monospaced capitals for labels like the app's 'N°01' and 'CARD / N°09'.

- **motion.** Fluid, orbital: cards revolve before they settle, the camera glides and zooms like the app's own search flight, links draw on along their real curves with a light pulse running ahead, the knot turns slowly. Nothing snaps; everything eases.

- **sound.** Cinematic lite in D minor at 96 BPM (6 bars in 15 s, 12 in 30 s): spacious strings and a steady ostinato for an orbit, with glassy SFX (chimes as links land, swells into the drop).

- **visuals.** Four scenes in the 15 s cut: cards orbiting the holographic knot as the name lands, then settling into the app's own layout; [[ typed in the real inspector, the app's suggestion chosen and a dashed wiki link drawing itself on the canvas; every link of the sample space drawing on along its real path; the end card. The 30 s cut adds search, where the camera flies to the card.

- **narration.** Not recommended: a short, muted launch reel with slogan-length Korean copy shown as type.

## Same BPM, more bars

The 30-second cut is the same reel with longer holds (and optional scenes where they exist); the tempo never changes.

| Scene | short | 30 s |
|---|---|---|
| `hook` | 1 | 2 |
| `wiki` | 2 | 3 |
| `search` | - | 2 |
| `graph` | 2 | 3 |
| `end` | 1 | 2 |

## Scenes

**`hook`**: hook (1 bar, 2 in the 30): in orbit. The app's holographic knot turns large at the centre of the blue space while the nine real cards of its sample space revolve around it on a tilted ellipse, the far ones small and soft. The name lands over it (Orbit Note) with the app's one-liner (생각이 연결되는 나만의 노트) by 0.8 s. On the last beat and a half the cards leave their orbit and settle into the app's own layout, the knot slides to its corner and the title fades: the next scene opens on that exact frame.

**`wiki`**: wiki (2 bars, 3 in the 30): [[ ]] links by itself. The app's own layout from the hook; its seven links fade in along their real paths. The camera glides toward the lower cards while the real inspector slides in on the right with card N°09 (다음 아이디어). [[포 is typed: the app's own suggestion list pops (포커스 모드); Enter, and the inspector shows 나가는 연결 1 while on the canvas a dashed wiki link draws itself from 다음 아이디어 to 포커스 모드, both cards ringed. Headline: [[제목]]만 적으면 / 저절로 이어져요. The inspector states and the cards are captures; the link is the path the app drew after Enter (geo_linked.txt).

**`search`**: search (2 bars, the 30 only): / flies you there. The canvas at rest; "/" is pressed, the app's real search palette drops in at the top with its result for 정렬 (자동 정렬); Enter, the palette leaves and the camera flies to that card, as the app does, until it fills the middle of the frame and a holographic ring lights it. Headline: / 한 번이면 / 그 카드로 날아가요.

**`graph`**: graph (2 bars, 3 in the 30; the drop): thoughts in orbit. The whole sample space, the cards alone at first, the camera easing back. Then every link of the space draws itself along its real path, one after another (eight with the new wiki link), a light running at its head; each label pops as its line lands (찾기, 집중하기, 반대 방향) and the cards at both ends brighten. The knot turns in its corner. Headline over a deep-blue wash: 생각과 생각이 / 궤도로 이어져요. In the hold, pulses keep running along the lines.

**`end`**: end (1 bar, 2 in the 30): the end card. The holographic knot turns at the centre top; the name, the app's one-liner in the holographic gradient, the address in a white pill and, at the foot, where it comes from (toyz original).

## Provenance and credits

- The app, its design, its README (`source/README.md`) and its sample data belong to the toyz project (a toyz original); the captures are of its production build.
- The holographic knot is the app's own HoloKnot drawing, captured from the running app; the link curves are the app's own SVG paths.
- Music and sound effects are synthesized by `audio/` (no samples).
- Fonts ship with their licences: `source/fonts/OFL-JetBrainsMono.txt`, `source/fonts/OFL-Pretendard.txt`.
