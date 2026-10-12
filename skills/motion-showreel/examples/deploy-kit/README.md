# Example: deploy-kit (Deploy Kit)

A real web app goes in: **Deploy Kit**, a toyz original, a launch bench: one form makes a side project's README,
LICENSE, CI, deploy config, SEO tags, OG image and favicon, live, and packs the chosen ones in one ZIP, entirely in the
browser. The reel follows the brief GitReels gives its one-shot reel writer (a dynamic 15-second 2D motion-graphics
reel in a style tied to the core of the project; the name and what it is within 2 seconds; one core message; at most
four scenes; every text readable), in Korean like the app, and grows a 30-second cut at the same tempo. Every panel in
it is the app itself, captured from its production build with its own fictional example kit.

- Web version with every cut: [`dist/deploy-kit-v1.0.1.html`](dist/deploy-kit-v1.0.1.html) ([play in the browser](https://raw.githack.com/AwesomeZun/Awesome-Showreels/main/skills/motion-showreel/examples/deploy-kit/dist/deploy-kit-v1.0.1.html))
- Cuts: `short` (11 bars = 15.0 s), `30` (22 bars = 30.0 s), all at 176 BPM.

> Deploy Kit is a real app (a toyz original, Play Objects collection). The kit on screen is its fictional example,
> renamed once during the capture; every file name is one the app actually generated.

## Folder

```
deploy-kit/
  source/                 5 file(s)
    README.md
    fonts/JetBrainsMono-latin-wght.woff2
    fonts/OFL-JetBrainsMono.txt
    fonts/OFL-Pretendard.txt
    fonts/PretendardVariable.woff2
  assets/                 26 file(s)
    captures/ui/app/bench_2.json
    captures/ui/app/bench_2.webp
    captures/ui/app/brand.json
    captures/ui/app/brand.webp
    captures/ui/app/check_page.json
    captures/ui/app/check_page.webp
    captures/ui/app/fav_page.json
    captures/ui/app/fav_page.webp
    ... 18 more
  modules/                1 file(s)
    deploykit.js
  scenes/                 6 file(s)
    check.js
    end.js
    hook.js
    live.js
    og.js
    ship.js
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
S=skills/motion-showreel; P=$S/examples/deploy-kit
python3 $S/tools/extract_style.py --source $P/source --project $P --board      # draft style (review by hand)
python3 $S/timing/plan_cut.py --project $P --cut short,30
for c in short 30; do python3 $S/audio/arrange.py --project $P --cut $c; done
python3 $S/audio/verify_sync.py --wav $P/build/music-short.wav --cut $P/build/cut-short.json
node $S/runtime/render.mjs --project $P --cut short --out out/deploy-kit-short.mp4
node $S/runtime/build.mjs --project $P --cuts short,30 --out out/deploy-kit.html
```

## How it was made

1. **The brief.** GitReels' one-shot prompt and its clarity rules (name and what it is in the first 2 s, one core
   message, at most four scenes in the 15-second cut, readable text). The core message: what you type ships, as one
   ZIP (적는 대로 출시 파일이 바뀌어요 · 필요한 것만 골라 ZIP 하나로 출시).
2. **The real app, before and after.** `capture/app.json` drives the app's production build (served locally; not
   committed): its logo, the identity form and the live output tray while the project name is cleared and retyped
   (the tray marks the files it re-made UPDATED and says how many), the bench stats, the OG image page, the favicon
   page and the launch checklist. The tray's file list is read as text (`files.txt`), so every flying file name is
   one the app made. Captures are stored as WebP.
3. **Drawn in code.** The launch-bench stage, the file chips streaming and flying, the ZIP crate with its counter and
   zipper, the highlights on updated rows.

## What the tone pass decided

- **palette.** The app's tokens: bench #ECEEF5 / #F6F7FB, white panels, ink #0A0B10 / #3A3E4C / #5C6172, electric blue #0B2FE6 (the ZIP button, the ZIP tile, the selected stack) with #2748FF and #0720B0, the navy output tray, and lime #D4FF3A for the live dot.

- **type.** Pretendard Variable at 900 for headlines, black with the second line blue; JetBrains Mono for every file name and label, as the app's tray and stamps use mono ('SHIP CLUB — DEPLOY KIT · LAUNCH BENCH', 'LIVE OUTPUT').

- **motion.** Launch speed: file names stream upward like exhaust, rows flash UPDATED as the app re-makes them, twenty-five files arc into one ZIP crate on the beat and the crate stamps shut. Fast but readable: every headline holds for most of its scene.

- **sound.** Drum and bass in G minor at 176 BPM (11 bars in 15 s, 22 in 30 s): the energy of shipping, with digital SFX (key taps, blips as files update, a stamp as the ZIP closes).

- **visuals.** Four scenes in the 15 s cut: file names stream past the app's logo; a renamed project re-makes twelve files live in the app's real output tray; twenty-five files pack into one ZIP under the app's real bench stats; the end card. The 30 s cut adds the OG image and favicon generators and the launch checklist.

- **narration.** Not recommended: a short, muted launch reel with slogan-length Korean copy shown as type.

## Same BPM, more bars

The 30-second cut is the same reel with longer holds (and optional scenes where they exist); the tempo never changes.

| Scene | short | 30 s |
|---|---|---|
| `hook` | 2 | 3 |
| `live` | 3 | 4 |
| `og` | - | 4 |
| `ship` | 4 | 5 |
| `check` | - | 3 |
| `end` | 2 | 3 |

## Scenes

**`hook`**: hook (2 bars, 3 in the 30): launch. The kit's real file names (README.md, LICENSE, ci.yml, vercel.json, og.png, favicon.svg and the rest of its 25 items) stream upward in two lanes like exhaust, faster on the beat. The app's logo lands in the middle on the first hit (beat 1), the kicker above, the app's line below by 0.6 s: 작은 제품을 세상에 내놓는 도구.

**`live`**: live (3 bars, 4 in the 30): what you type is what ships. Left, the app's real identity form; right, its real live output tray. The project name is cleared and retyped (Moss, then Moss Timer), each stage captured: the tray marks every file it re-made UPDATED, says so itself (방금 12개 파일이 다시 만들어졌어요) and its OG image and favicon follow the new name (Moss Timer, MT). Blue ticks pulse down the updated rows. Headline: 적는 대로 / 출시 파일이 바뀌어요.

**`og`**: og (4 bars, the 30 only): the share card and the icons come along. The app's real OG image preview (1200 x 630, the kit's title over its brand blue and knot) on the left; its four layout cards light one by one on the beat (포스터, 분할, 그리드, 카드); then its favicon sizes pop in a row (16, 32, 180, 192, 512). Headline right: OG 이미지와 / 파비콘까지.

**`ship`**: ship (4 bars, 5 in the 30; the drop): one ZIP. The app's real bench strip sits top right (입력 7/7 · 파일 19 · 이미지 6 · moss-timer-deploy-kit ZIP). From a column on the left the kit's 25 items fly one after another, a quarter beat apart, and arc into a blue ZIP crate whose counter climbs to 25; on beat 8 the crate's zipper closes with a stamp and its label reads moss-timer-deploy-kit.zip; a check confirms 25 files, one ZIP. Headline: 필요한 것만 골라 / ZIP 하나로 출시.

**`check`**: check (3 bars, the 30 only): nothing forgotten. The app's real launch checklist: its dark progress panel (15%, seven categories with bars) and its first items drifting up; a light sweeps the panel on each bar. Headline: 출시 전 42가지, / 빠짐없이.

**`end`**: end (2 bars, 3 in the 30): the end card. The app's logo, its line, the address on the blue of its ZIP button, and the collection at the foot; a few file names still drift up the edges.

## Provenance and credits

- The app, its design, its README (`source/README.md`) and its example kit belong to the toyz project (a toyz original); the captures are of its production build.
- Music and sound effects are synthesized by `audio/` (no samples).
- Fonts ship with their licences: `source/fonts/OFL-JetBrainsMono.txt`, `source/fonts/OFL-Pretendard.txt`.
