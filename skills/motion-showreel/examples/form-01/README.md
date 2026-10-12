# Example: form-01 (FORM / 01)

A real web app goes in: **FORM / 01**, a toyz original, a light feedback board for designers: upload work, drop
numbered pins and regions on the same screen, answer in threads, keep versions and compare them, export a report,
all in the browser without a server or a login. The reel follows the brief GitReels gives its one-shot reel writer (a
dynamic 15-second 2D motion-graphics reel in a style tied to the core of the project; the name and what it is within
2 seconds; one core message; at most four scenes; every text readable), in Korean like the app, and grows a
30-second cut at the same tempo. The board on screen is the app's own sample board, its mockups the app's own SVGs.

- Web version with every cut: [`dist/form-01-v1.0.0.html`](dist/form-01-v1.0.0.html) ([play in the browser](https://raw.githack.com/AwesomeZun/Awesome-Showreels/main/skills/motion-showreel/examples/form-01/dist/form-01-v1.0.0.html))
- Cuts: `short` (7 bars = 15.0 s), `30` (14 bars = 30.0 s), all at 112 BPM.

> FORM / 01 is a real app (a toyz original, Chrome Club collection). The board, mockups and comments on screen are its
> fictional sample data; the comment cards, thread and version bar are captured from its production build.

## Folder

```
form-01/
  source/                 9 file(s)
    README.md
    fonts/JetBrainsMono-latin-wght.woff2
    fonts/OFL-JetBrainsMono.txt
    fonts/OFL-Pretendard.txt
    fonts/PretendardVariable.woff2
    mockups/dashboard.svg
    mockups/landing-v1.svg
    mockups/landing-v2.svg
    ... 1 more
  assets/                 24 file(s)
    captures/ui/app/cards_v1.json
    captures/ui/app/cards_v1_0.webp
    captures/ui/app/cards_v1_1.webp
    captures/ui/app/cards_v1_2.webp
    captures/ui/app/cards_v1_3.webp
    captures/ui/app/cards_v2.json
    captures/ui/app/cards_v2_0.webp
    captures/ui/app/cards_v2_1.webp
    ... 16 more
  modules/                1 file(s)
    form01.js
  scenes/                 5 file(s)
    end.js
    hook.js
    pins.js
    thread.js
    versions.js
  capture/                1 file(s)
    app.json
  style.json
  reel.config.json
  STORYBOARD.md
  dist/
```

## Run it

```bash
S=skills/motion-showreel; P=$S/examples/form-01
python3 $S/tools/extract_style.py --source $P/source --project $P --board      # draft style (review by hand)
python3 $S/timing/plan_cut.py --project $P --cut short,30
for c in short 30; do python3 $S/audio/arrange.py --project $P --cut $c; done
python3 $S/audio/verify_sync.py --wav $P/build/music-short.wav --cut $P/build/cut-short.json
node $S/runtime/render.mjs --project $P --cut short --out out/form-01-short.mp4
node $S/runtime/build.mjs --project $P --cuts short,30 --out out/form-01.html
```

## How it was made

1. **The brief.** GitReels' one-shot prompt and its clarity rules (name and what it is in the first 2 s, one core
   message, at most four scenes in the 15-second cut, readable text). The core message is the app's own line:
   디자이너를 위한 가벼운 피드백 보드, as its promise of pins on the same screen and versions side by side.
2. **The app's own material.** The sample mockups are the SVGs the app writes in `domain/sample.ts`
   (`source/mockups`), rendered with Pretendard by `gen-src/render_mockups.json`; `capture/app.json` drives the
   production build (served locally; not committed) to capture the real comment cards on v1 and v2, a thread, the
   version bar and the panel's stats. Captures are stored as WebP.
3. **Drawn from its styles.** `modules/form01.js` draws the app's metal plate and rulers, crop marks and dimension
   lines, its teardrop pins (anchored at the sharp corner, number in white or black for contrast) and regions, and
   FORM / 01 with its light slash; every pin sits at the normalised position the app stores for it.

## What the tone pass decided

- **palette.** The app's tokens: ink #0B0B0C / #101012 / #1C1C20, text #EDEDEF / #B6B7BC / #8C8D93, the metal plate (118deg #E7E8EA to #8E9096 with a white sheen), and the three reviewers' pin colours, orange #FF5A1F, blue #3D7BFF and lime #C6FF3D, the only vivid colour on screen.

- **type.** Pretendard Variable at 860 with -0.058em for FORM / 01 (its slash at 300 in half-black), 800 for headlines; mono capitals for the app's labels (DESIGN REVIEW BOARD — PIN · THREAD · VERSION, VER, OPEN, RESOLVED) and the dimension lines.

- **motion.** An inspection desk: rulers and crop marks, dimension lines that measure the artboard, pins that drop and settle on their anchor corner, a region drawn by dragging, a comparison divider that sweeps between versions.

- **sound.** Cinematic-lite in E minor at 112 BPM (7 bars in 15 s, 14 in 30 s): piano and soft strings over toms, measured and calm, with a soft tick for every pin.

- **visuals.** Four scenes in the 15 s cut: the app's metal hero with its mockups, dimension lines and pins under the name; three reviewers' pins and region landing on the real landing page with their real comment cards; v1 and v2 compared under a sweeping divider; the end card. The 30 s cut adds a thread being answered and resolved.

- **narration.** Not recommended: a short, muted launch reel with slogan-length Korean copy shown as type.

## Same BPM, more bars

The 30-second cut is the same reel with longer holds (and optional scenes where they exist); the tempo never changes.

| Scene | short | 30 s |
|---|---|---|
| `hook` | 2 | 2 |
| `pins` | 2 | 3 |
| `thread` | - | 3 |
| `versions` | 2 | 3 |
| `end` | 1 | 3 |

## Scenes

**`hook`**: hook (2 bars): the app's own hero, the metal plate. Rulers along its edges, its eyebrow (DESIGN REVIEW BOARD — PIN · THREAD · VERSION), FORM / 01 in black with the light slash, and the app's line, 디자이너를 위한 가벼운 피드백 보드. On the right the app's sample landing page and phone screen land with their dimension lines (1440, 390), and four reviewers' pins drop onto them on the beat, as on the app's front page.

**`pins`**: pins (2 bars; 3 in the 30): pins on the work. The app's sample landing page (v2) on the dark desk with its crop marks and width. A cursor drags out a region over the metal card and 준서's blue pin 5 drops on its corner; then 하은's orange 6 lands on the client logos and 민지's lime 7 on the login button. Each brings its real comment card (captured from the app's panel) into the column on the left. The headline: 같은 화면 위에 / 핀을 찍어 모아요.

**`thread`**: thread (3 bars, the 30 only): answer and close. The landing page v1 with 하은's pin 1 on the headline, selected; on the right the app's own panel with that comment's thread (captured): her question, 준서's answer revealed line by line, and the comment marked 해결됨; the pin turns to the app's resolved style. The headline: 답글로 이어 가고, / 해결로 닫아요.

**`versions`**: versions (2 bars; 3 in the 30): compare. The app's version bar (v1, v2, 새 버전, 비교, v1 핀 가져오기) over the two real versions of the landing page; a divider sweeps from v1 across to v2 and settles in the middle, so the new headline, the trial CTA and the lime login button show against the old ones. The headline: 버전을 쌓아 / 나란히 비교해요.

**`end`**: end (1 bar; 3 in the 30): the end card on the metal plate: FORM / 01, the app's line, a lime pin dropping onto the name, the address and where it comes from (toyz original, Chrome Club collection).

## Provenance and credits

- The app, its design, its README (`source/README.md`) and its sample board belong to the toyz project (a toyz original); the captures are of its production build and the mockups are rendered from its own source.
- Music and sound effects are synthesized by `audio/` (no samples).
- Fonts ship with their licences: `source/fonts/OFL-JetBrainsMono.txt`, `source/fonts/OFL-Pretendard.txt`.
