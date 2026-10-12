# Example: toyz-layr (LAYR)

A real web app goes in: **LAYR**, a toyz original, a note app that turns scattered notes into projects: it bundles
similar notes, sorts a project's notes into five layers (배경·문제, 아이디어, 할 일, 참고, 질문) and writes a one-page
brief, all with local algorithms inside the browser. The reel follows the brief GitReels gives its one-shot reel
writer (a dynamic 15-second 2D motion-graphics reel in a style tied to the core of the project; the name and what it
is within 2 seconds; one core message; at most four scenes; every text readable), in Korean like the app, and grows
a 30-second cut at the same tempo. The notes, bundles, layers and brief on screen are the app's own result on its
fictional sample notes.

- Web version with every cut: [`dist/layr-v1.0.0.html`](dist/layr-v1.0.0.html) ([play in the browser](https://raw.githack.com/AwesomeZun/Awesome-Showreels/main/skills/motion-showreel/examples/toyz-layr/dist/layr-v1.0.0.html))
- Cuts: `short` (7 bars = 15.0 s), `30` (14 bars = 30.0 s), all at 112 BPM.

> LAYR is a real app (a toyz original, Chrome Club collection). The notes on screen are its fictional sample notes;
> the bundles, layers and brief are the app's own output on them.

## Folder

```
toyz-layr/
  source/                 5 file(s)
    README.md
    fonts/JetBrainsMono-latin-wght.woff2
    fonts/OFL-JetBrainsMono.txt
    fonts/OFL-Pretendard.txt
    fonts/PretendardVariable.woff2
  assets/                 11 file(s)
    captures/ui/app/brief.json
    captures/ui/app/brief.webp
    captures/ui/app/head_0.json
    captures/ui/app/head_0.webp
    captures/ui/app/head_1.json
    captures/ui/app/head_1.webp
    captures/ui/app/head_2.json
    captures/ui/app/head_2.webp
    ... 3 more
  modules/                1 file(s)
    layr.js
  scenes/                 5 file(s)
    brief.js
    end.js
    hook.js
    layers.js
    organize.js
  capture/                1 file(s)
    app.json
  style.json
  reel.config.json
  STORYBOARD.md
  dist/
```

## Run it

```bash
S=skills/motion-showreel; P=$S/examples/toyz-layr
python3 $S/tools/extract_style.py --source $P/source --project $P --board      # draft style (review by hand)
python3 $S/timing/plan_cut.py --project $P --cut short,30
for c in short 30; do python3 $S/audio/arrange.py --project $P --cut $c; done
python3 $S/audio/verify_sync.py --wav $P/build/music-short.wav --cut $P/build/cut-short.json
node $S/runtime/render.mjs --project $P --cut short --out out/toyz-layr-short.mp4
node $S/runtime/build.mjs --project $P --cuts short,30 --out out/layr.html
```

## How it was made

1. **The brief.** GitReels' one-shot prompt and its clarity rules (name and what it is in the first 2 s, one core
   message, at most four scenes in the 15-second cut, readable text). The core message is the app's own line:
   흩어진 메모를 층으로 쌓아 프로젝트로.
2. **The app's own result.** `capture/app.json` drives the app's production build (served locally; not committed)
   on its first run: it opens 정리하기, captures the three bundles it proposes (cut to their heads), presses 모두 수락
   and dumps the app's state (which note went to which project and layer, `state_projects.txt`), then captures the
   one-page brief it writes for the first project. Captures are stored as WebP.
3. **Ported, not imitated.** `modules/layr.js` draws the app's glass layer stack from its own SVG code
   (`LayerStack.tsx`: plates, glass and edge gradients, chips, numbered labels) with its drop-in timing, and its
   brand mark (`Brand.tsx`); every note in the reel lands on the plate of the layer the app gave it.

## What the tone pass decided

- **palette.** The app's tokens: near-black #0B0B0C / #0E0F11 with surfaces #121317 / #17191E, text #F3F5F8 / #B7BFCB / #8D96A5, steel #9FB0C8 / #C9D3E3 and its metal gradient (#14171D, #2A2F3A, #56637A, #9FB0C8), lime #D9F55B only for the one thing that matters; the project colours #9FB0C8, #E2C69A, #8CCFDB; the five layers from light to dark.

- **type.** Pretendard Variable at 800 for headlines (the app's hero: 흩어진 메모를 / 층으로 쌓아 프로젝트로.), white on near-black; JetBrains Mono capitals for the app's numbered labels (01 / INBOX, BUNDLE / 01).

- **motion.** Calm and exact: things settle rather than bounce. Notes drift, then glide into place; the glass plates drop in from the bottom up the way the app's hero does; a low camera and slow parallax. Springs are well damped.

- **sound.** Dark synth in E minor at 112 BPM (7 bars in 15 s, 14 in 30 s): a soft pulse and plucks under the steel and glass, digital SFX for the drops.

- **visuals.** Four scenes in the 15 s cut: the name and the app's line beside its glass layer stack, scattered notes falling into it; the sample notes gliding into the three bundles the app proposes (their real heads); one project's ten notes sorted onto five exploded layers; the end card. The 30 s cut adds the one-page brief the app writes.

- **narration.** Not recommended: a short, muted launch reel with slogan-length Korean copy shown as type.

## Same BPM, more bars

The 30-second cut is the same reel with longer holds (and optional scenes where they exist); the tempo never changes.

| Scene | short | 30 s |
|---|---|---|
| `hook` | 2 | 2 |
| `organize` | 2 | 3 |
| `layers` | 2 | 3 |
| `brief` | - | 3 |
| `end` | 1 | 3 |

## Scenes

**`hook`**: hook (2 bars): the app's hero, in motion. The name and the app's own line on the left (LAYR, 흩어진 메모를 / 층으로 쌓아 프로젝트로.); on the right its glass layer stack drops in plate by plate from the bottom up (the app's own drop-in, a quarter beat apart), while real notes from its sample data drift across the dark and then fall into the stack, shrinking into chips on the plate of the layer the app gave them. The last beat zooms into the top plate.

**`organize`**: organize (2 bars; 3 in the 30): bundled for you. All 32 sample notes lie scattered in the dark; on beat 1 they glide into the three bundles the app proposed for them (the heads are the app's own: 러닝 · 크루 · 페이스 with 10 notes and cohesion 0.28, 물주기 · 식물 · 플랜티 9 and 0.27, 팟캐스트 · 에피소드 · 편집 8 and 0.35), lime similarity lines flashing between notes of a bundle as they meet; the five that fit nowhere stay in the inbox. In the 30 the app's 모두 수락 is pressed on the last bar and the bundles become projects.

**`layers`**: layers (2 bars; 3 in the 30): five layers. The first project's ten notes wait in a column on the left under the headline (다섯 레이어로 / 나눠 쌓아요.); the glass stack opens up on the right into five plates, and from beat 2 the notes fly one by one onto the plate of the layer the app gave them, shrinking into chips, while each plate's count ticks up to the app's own split: 배경 · 문제 2, 아이디어 4, 할 일 2, 참고 1, 질문 1. In the 30 the plates light in turn.

**`brief`**: brief (3 bars, the 30 only): one page. The one-page brief the app wrote for the project (its own sheet, captured: 목표 요약, 핵심 아이디어, 다음 할 일, 열린 질문) slides up on the right; its four sections light in turn on the beat, a lime bar at their edge and their ↗ source links pulsing (every line in the brief points back to the note it came from). The headline: 한 장짜리 브리프로 / 바로 정리돼요.

**`end`**: end (1 bar; 3 in the 30): the end card. The brand mark (Brand.tsx) large at the top: its three plates part and settle and its lime edge draws on; the name in steel, the app's line, the address in a dark pill with the lime dot and, at the foot, where it comes from (toyz original, Chrome Club collection). Everything is up by 0.45 s.

## Provenance and credits

- The app, its design, its README (`source/README.md`) and its sample notes belong to the toyz project (a toyz original); the captures are of its production build, and the layer stack and the brand mark are drawn from its source.
- Music and sound effects are synthesized by `audio/` (no samples).
- Fonts ship with their licences: `source/fonts/OFL-JetBrainsMono.txt`, `source/fonts/OFL-Pretendard.txt`.
