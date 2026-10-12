# Example: frame (Frame)

A real web app goes in: **Frame**, a toyz original, the fastest portfolio: an editor on the left, the finished
portfolio live on the right, exported as one self-contained HTML file, entirely in the browser. The reel follows the
brief GitReels gives its one-shot reel writer (a dynamic 15-second 2D motion-graphics reel in a style tied to the core
of the project; the name and what it is within 2 seconds; one core message; at most four scenes; every text
readable), in Korean like the app, and grows a 30-second cut at the same tempo. Every screen in it is the app itself,
captured from its production build with its own fictional sample portfolio; the look comes from the app's own tokens.

- Web version with every cut: [`dist/frame-v1.0.1.html`](dist/frame-v1.0.1.html) ([play in the browser](https://raw.githack.com/AwesomeZun/Awesome-Showreels/main/skills/motion-showreel/examples/frame/dist/frame-v1.0.1.html))
- Cuts: `short` (7 bars = 15.0 s), `30` (14 bars = 30.0 s), all at 112 BPM.

> Frame is a real app (a toyz original, Play Objects collection). The portfolio on screen (이로아 and six works) is its
> fictional sample data, captured as the app shows it.

## Folder

```
frame/
  source/                 5 file(s)
    README.md
    fonts/JetBrainsMono-latin-wght.woff2
    fonts/OFL-JetBrainsMono.txt
    fonts/OFL-Pretendard.txt
    fonts/PretendardVariable.woff2
  assets/                 29 file(s)
    captures/ui/app/export_card.json
    captures/ui/app/export_card.webp
    captures/ui/app/field_0.json
    captures/ui/app/field_0.webp
    captures/ui/app/field_1.json
    captures/ui/app/field_1.webp
    captures/ui/app/field_2.json
    captures/ui/app/field_2.webp
    ... 21 more
  modules/                1 file(s)
    frame.js
  scenes/                 5 file(s)
    end.js
    export.js
    hook.js
    live.js
    templates.js
  capture/                3 file(s)
    app.json
    explore.json
    explore2.json
  style.json
  reel.config.json
  STORYBOARD.md
  dist/
```

## Run it

```bash
S=skills/motion-showreel; P=$S/examples/frame
python3 $S/tools/extract_style.py --source $P/source --project $P --board      # draft style (review by hand)
python3 $S/timing/plan_cut.py --project $P --cut short,30
for c in short 30; do python3 $S/audio/arrange.py --project $P --cut $c; done
python3 $S/audio/verify_sync.py --wav $P/build/music-short.wav --cut $P/build/cut-short.json
node $S/runtime/render.mjs --project $P --cut short --out out/frame-short.mp4
node $S/runtime/build.mjs --project $P --cuts short,30 --out out/frame.html
```

## How it was made

1. **The brief.** GitReels' one-shot prompt and its clarity rules (name and what it is in the first 2 s, one core
   message, at most four scenes in the 15-second cut, readable text). The core message: what you type is the
   portfolio, and it leaves as one HTML file (적는 즉시 포트폴리오가 돼요 · 이미지까지 담아 HTML 파일 하나로).
2. **The real app, stage by stage.** `capture/app.json` drives the app's production build (served locally; not
   committed): the name field and the live preview captured at each typing stage (empty, 이, 이로, 이로아), the
   same portfolio in its three templates and two tones, and the export card with its real estimate (2.02 MB, HTML
   1, 12 images, 0 external references). Captures are stored as WebP.
3. **Drawn in code.** The studio stage and its 12-column guide, the orange viewfinder corners, the browser window
   around the preview (with the filename the app gives the export), the file tile that flies out of the export
   button, and the template wipes.

## What the tone pass decided

- **palette.** The app's tokens: studio grey #E6E7EA and #F5F5F6, white surfaces, ink #0B0B0D / #3F4047 / #62636B, and its hot orange #FF5A1F (the period in 'Frame.', the live dot, the selected template). The portfolio's own blue (#2B3BFF in the sample work) only appears inside the captured preview.

- **type.** Pretendard Variable at 900 for the wordmark and headlines (the app sets '프로필', '내보내기' and the portfolio name heavy and tight); monospaced capitals for its labels ('PORTFOLIO BUILDER', 'ESTIMATED SIZE', 'GRID / EDITORIAL / MONO').

- **motion.** Quick and exact, like framing a shot: orange viewfinder corners snap onto what matters, windows slide in on a spring with little overshoot, the preview changes the instant a letter is typed, template faces wipe one into the next on the beat. Holds keep a slow camera drift and a blinking live dot.

- **sound.** Corporate in G major at 112 BPM (7 bars in 15 s, 14 in 30 s): warm piano and strings for a tidy, professional tool, with glassy SFX (key taps, a click on export, a pop as the file lands).

- **visuals.** Four scenes in the 15 s cut: viewfinder corners frame the name; a name typed in the real editor appears letter by letter in the real live preview; the real export card (2.02 MB, HTML 1, 12 images, 0 external references) sends out one HTML file that opens as the finished portfolio; the end card. The 30 s cut adds the three templates of the same portfolio.

- **narration.** Not recommended: a short, muted launch reel with slogan-length Korean copy shown as type.

## Same BPM, more bars

The 30-second cut is the same reel with longer holds (and optional scenes where they exist); the tempo never changes.

| Scene | short | 30 s |
|---|---|---|
| `hook` | 1 | 2 |
| `live` | 2 | 3 |
| `templates` | - | 3 |
| `export` | 2 | 3 |
| `end` | 2 | 3 |

## Scenes

**`hook`**: hook (1 bar, 2 in the 30): framed. Four orange viewfinder corners fly in from the frame's edges and lock around the centre, where the name lands (Frame, its square orange period dropping in last) with the kicker above and the app's one-liner below: 내 작업을 담는 가장 빠른 포트폴리오. A chrome ball (the portfolio's own avatar image) floats beside it. The corners breathe on each beat of the hold.

**`live`**: live (2 bars, 3 in the 30): what you type is the portfolio. The headline lands top left (적는 즉시 / 포트폴리오가 돼요.), the app's real name field below it; on the right a window holds the app's real live preview. The name is typed one syllable per beat (이, 이로, 이로아): each time the field and the preview change together, captured at that very stage, and orange corners snap onto the name in the preview. A click lands on the last letter.

**`templates`**: templates (3 bars, the 30 only): same portfolio, another face. One window holds the app's real preview; on every other beat it wipes to the next template of the same content, as the app renders it: GRID, EDITORIAL with its big orange sphere, MONO as a list, then MONO and EDITORIAL in the dark tone. An orange tab under the window names the face. Headline: 템플릿 하나에 / 얼굴이 바뀌어요.

**`export`**: export (2 bars, 3 in the 30; the drop): one file. The app's real export card lands on the left, its estimated size 2.02 MB and the line under it (HTML 1 · 이미지 12장 (985 KB) · 외부 참조 0) ringed in orange. Its "HTML 파일 내려받기" button is pressed: a single file tile (이로아-portfolio.html) springs out of it, arcs to the right and lands; a window opens from the tile and shows the finished portfolio (the app's preview, which is the exported HTML). Headline: 이미지까지 담아 / HTML 파일 하나로.

**`end`**: end (2 bars, 3 in the 30): the end card. Orange corners frame the centre; the name with its period, the app's one-liner, the address in a black pill and, at the foot, where it comes from (toyz original, Play Objects).

## Provenance and credits

- The app, its design, its README (`source/README.md`) and its sample portfolio belong to the toyz project (a toyz original); the captures are of its production build.
- Music and sound effects are synthesized by `audio/` (no samples).
- Fonts ship with their licences: `source/fonts/OFL-JetBrainsMono.txt`, `source/fonts/OFL-Pretendard.txt`.
