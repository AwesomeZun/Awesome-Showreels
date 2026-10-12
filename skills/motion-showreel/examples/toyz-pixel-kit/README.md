# Example: toyz-pixel-kit (PIXEL KIT)

A real web app goes in: **PIXEL KIT**, a toyz original, an image tool for small brands: set a brand kit (colours,
type, logo) once and its thirteen templates come out in every size with the same face, from a square post to a wide
banner, all in the browser. The reel follows the brief GitReels gives its one-shot reel writer (a dynamic 15-second
2D motion-graphics reel in a style tied to the core of the project; the name and what it is within 2 seconds; one
core message; at most four scenes; every text readable), in Korean like the app, and grows a 30-second cut at the
same tempo. Every design on screen was drawn by the app's own renderer.

- Web version with every cut: [`dist/pixel-kit-v1.0.0.html`](dist/pixel-kit-v1.0.0.html) ([play in the browser](https://raw.githack.com/AwesomeZun/Awesome-Showreels/main/skills/motion-showreel/examples/toyz-pixel-kit/dist/pixel-kit-v1.0.0.html))
- Cuts: `short` (8 bars = 15.0 s), `30` (16 bars = 30.0 s), all at 128 BPM.

> PIXEL KIT is a real app (a toyz original, Chrome Club collection). The kits and designs on screen are its fictional
> sample data, rendered by the app itself and captured from its production build.

## Folder

```
toyz-pixel-kit/
  source/                 5 file(s)
    README.md
    fonts/JetBrainsMono-latin-wght.woff2
    fonts/OFL-JetBrainsMono.txt
    fonts/OFL-Pretendard.txt
    fonts/PretendardVariable.woff2
  assets/                 40 file(s)
    captures/ui/app/kitcards.json
    captures/ui/app/kitcards_0.webp
    captures/ui/app/kitcards_1.webp
    captures/ui/app/kitcards_2.webp
    captures/ui/app/layers.json
    captures/ui/app/morae.json
    captures/ui/app/morae_0.webp
    captures/ui/app/morae_1.webp
    ... 32 more
  modules/                1 file(s)
    pixelkit.js
  scenes/                 5 file(s)
    end.js
    hook.js
    kits.js
    sizes.js
    templates.js
  capture/                1 file(s)
    app.json
  style.json
  reel.config.json
  STORYBOARD.md
  dist/
```

## Run it

```bash
S=skills/motion-showreel; P=$S/examples/toyz-pixel-kit
python3 $S/tools/extract_style.py --source $P/source --project $P --board      # draft style (review by hand)
python3 $S/timing/plan_cut.py --project $P --cut short,30
for c in short 30; do python3 $S/audio/arrange.py --project $P --cut $c; done
python3 $S/audio/verify_sync.py --wav $P/build/music-short.wav --cut $P/build/cut-short.json
node $S/runtime/render.mjs --project $P --cut short --out out/toyz-pixel-kit-short.mp4
node $S/runtime/build.mjs --project $P --cuts short,30 --out out/pixel-kit.html
```

## How it was made

1. **The brief.** GitReels' one-shot prompt and its clarity rules (name and what it is in the first 2 s, one core
   message, at most four scenes in the 15-second cut, readable text). The core message is the app's own heading on
   its consistency board: 같은 얼굴, 모든 크기.
2. **The app's own renders.** `capture/app.json` drives the production build (served locally; not committed) in a
   wide window: it opens three sample designs from the library, one per kit, and captures the consistency board's six
   canvases for each (the app's renderer laying the same design out for 1080×1080 to 1500×500), then its thirteen
   template thumbnails and its three kit cards. Captures are stored as WebP.
3. **The wall.** `modules/pixelkit.js` lays the six frames out like the board, draws the app's mark from its SVG,
   and the kit change turns the wall over frame by frame to the next kit's own renders.

## What the tone pass decided

- **palette.** The app's tokens: grounds #0B0A0C / #111013 / #17151A, text #F3EFF4 / #BDB5C1 / #958C9B, orchid #E5B5E0 / #F0CDEB and plum #6B1F5C, the chrome of its mark (#FBFBFD to #6F6F7A); everything else is the sample kits' own colours, drawn by the app.

- **type.** Pretendard Variable at 800 for headlines and the name (the app's own heading 같은 얼굴, 모든 크기.), mono capitals for its labels (02 · CONSISTENCY BOARD, sizes like 1080×1350).

- **motion.** A layout snapping into place: six frames of different proportions fly in and settle on a grid on the beat, then the whole wall turns over to the next kit together; templates deal out like cards.

- **sound.** Swing in Bb major at 128 BPM (8 bars in 15 s, 16 in 30 s): a lively shuffle for a tool that makes small brands look put together, with crisp glassy SFX for every frame that lands.

- **visuals.** Four scenes in the 15 s cut: the name and the app's line with its mark; one design dealt into six sizes (같은 얼굴, 모든 크기); the wall turning over to the bakery and the coffee kits; the end card. The 30 s cut adds the thirteen templates.

- **narration.** Not recommended: a short, muted launch reel with slogan-length Korean copy shown as type.

## Same BPM, more bars

The 30-second cut is the same reel with longer holds (and optional scenes where they exist); the tempo never changes.

| Scene | short | 30 s |
|---|---|---|
| `hook` | 2 | 2 |
| `sizes` | 3 | 4 |
| `kits` | 2 | 3 |
| `templates` | - | 4 |
| `end` | 1 | 3 |

## Scenes

**`hook`**: hook (2 bars): the name. The app's mark assembles pixel by pixel, PIXEL KIT and the app's line, 작은 브랜드를 위한 이미지 제작 도구, while on the right the three sample kits' portrait designs (the app's own renders) fan out like cards.

**`sizes`**: sizes (3 bars; 4 in the 30): same face, every size. One design (숨결 요가 스튜디오's 10월 저녁 클래스 소개, the app's split layout) is dealt into the six sizes of the app's consistency board one per half beat, each frame the app's own render for that size, its size in the corner. The headline is the board's own heading: 같은 얼굴, / 모든 크기.

**`kits`**: kits (2 bars; 3 in the 30): change the kit, everything follows. The wall of six turns over frame by frame (a card flip a sixteenth apart) from 숨결 요가 스튜디오 to 모래알 베이커리 on beat 1 and to PADO Coffee Roasters on beat 5: every size redrawn by the app in the new kit's colours, type and logo, with that kit's own design. The kit's card from the app sits top right. The headline: 킷을 바꾸면 전부 함께 바뀌어요.

**`templates`**: templates (4 bars, the 30 only): thirteen templates. The app's thirteen templates (its own thumbnails, drawn in the 숨결 kit) are dealt onto the table one per quarter beat from the first, in two rows, each landing with a small bounce; on the last bar they light in turn. The headline: 템플릿 13종이 / 비율에 맞춰 알아서.

**`end`**: end (1 bar; 3 in the 30): the end card: the mark, PIXEL KIT, the app's promise (브랜드 킷 하나로 모든 크기를 같은 얼굴로), the address and where it comes from (toyz original, Chrome Club collection).

## Provenance and credits

- The app, its design, its README (`source/README.md`) and its sample kits and designs belong to the toyz project (a toyz original); the captures are of its production build, and the mark is drawn from its source.
- Music and sound effects are synthesized by `audio/` (no samples).
- Fonts ship with their licences: `source/fonts/OFL-JetBrainsMono.txt`, `source/fonts/OFL-Pretendard.txt`.
