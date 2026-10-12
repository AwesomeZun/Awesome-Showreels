# Example: toyz-loop (LOOP)

A real web app goes in: **LOOP**, a toyz original, a habit app where each day is a ring: check small routines
off, keep streaks, and keep going together with a crew through invite links and check-in cards, without a server.
The reel follows the brief GitReels gives its one-shot reel writer (a dynamic 15-second 2D motion-graphics reel in a
style tied to the core of the project; the name and what it is within 2 seconds; one core message; at most four
scenes; every text readable), in Korean like the app, and grows a 30-second cut at the same tempo.

- Web version with every cut: [`dist/loop-v1.0.0.html`](dist/loop-v1.0.0.html) ([play in the browser](https://raw.githack.com/AwesomeZun/Awesome-Showreels/main/skills/motion-showreel/examples/toyz-loop/dist/loop-v1.0.0.html))
- Cuts: `short` (8 bars = 15.0 s), `30` (16 bars = 30.0 s), all at 128 BPM.

> LOOP is a real app (a toyz original, Chrome Club collection). The routines and the crew on screen are its fictional
> sample data; the lists, cards and heatmap are captured from its production build.

## Folder

```
toyz-loop/
  source/                 5 file(s)
    README.md
    fonts/JetBrainsMono-latin-wght.woff2
    fonts/OFL-JetBrainsMono.txt
    fonts/OFL-Pretendard.txt
    fonts/PretendardVariable.woff2
  assets/                 18 file(s)
    captures/ui/app/cheer.json
    captures/ui/app/cheer.webp
    captures/ui/app/crew_head.json
    captures/ui/app/crew_head.webp
    captures/ui/app/heatmap.json
    captures/ui/app/heatmap.webp
    captures/ui/app/layers.json
    captures/ui/app/list_1.json
    ... 10 more
  modules/                1 file(s)
    loop.js
  scenes/                 5 file(s)
    crew.js
    end.js
    hook.js
    records.js
    today.js
  capture/                1 file(s)
    app.json
  style.json
  reel.config.json
  STORYBOARD.md
  dist/
```

## Run it

```bash
S=skills/motion-showreel; P=$S/examples/toyz-loop
python3 $S/tools/extract_style.py --source $P/source --project $P --board      # draft style (review by hand)
python3 $S/timing/plan_cut.py --project $P --cut short,30
for c in short 30; do python3 $S/audio/arrange.py --project $P --cut $c; done
python3 $S/audio/verify_sync.py --wav $P/build/music-short.wav --cut $P/build/cut-short.json
node $S/runtime/render.mjs --project $P --cut short --out out/toyz-loop-short.mp4
node $S/runtime/build.mjs --project $P --cuts short,30 --out out/loop.html
```

## How it was made

1. **The brief.** GitReels' one-shot prompt and its clarity rules (name and what it is in the first 2 s, one core
   message, at most four scenes in the 15-second cut, readable text). The core message is the app's own line:
   혼자 시작해서 함께 완성하는 루틴.
2. **The real check-ins.** `capture/app.json` drives the app's production build (served locally; not committed):
   it captures today's list as it opens, after 물 8잔 is counted up to 8 and after 책 20쪽 is checked, then the
   example crew's board, a cheer and the sixteen-week heatmap. Captures are stored as WebP.
3. **The app's ring.** `modules/loop.js` draws the chrome ring from the app's own code (its conic chrome from
   205deg, highlights, shade, navy inlay and arc, and its celebration glint and pop), its wordmark with the two
   linked rings, and its periwinkle page; the ring fills in step with the captured list.

## What the tone pass decided

- **palette.** The app's tokens: periwinkle #B9CCF0 / #D3DFF6 / #E7EDF9 and its page #E6ECF7, paper #F7F9FD, navy #1F3566 / #2A4580, ink #16264A / #3D4F78 / #56668C; the chrome torus (conic, from 205deg, white to #2B3656) with its navy inlay #2B4A8C to #14254A.

- **type.** Pretendard Variable at 900 for the wordmark (L, the two linked chrome rings, P) and 800 for headlines in ink; mono capitals for the app's labels (TODAY / W42, TOGETHER / CREW BOARD).

- **motion.** A day closing like a ring: taps on the beat, a counter climbing, the navy inlay sweeping round the chrome torus, and when the last loop closes the app's own celebration, a single glint round the ring and a small pop.

- **sound.** Corporate in C major at 128 BPM (8 bars in 15 s, 16 in 30 s): bright, steady and encouraging, with a soft tap for each check-in.

- **visuals.** Four scenes in the 15 s cut: the name and the app's line beside its chrome ring; today's routines checked off as the ring fills to 3/3 and glints; the example crew's board and a cheer; the end card. The 30 s cut adds the sixteen-week heatmap.

- **narration.** Not recommended: a short, muted launch reel with slogan-length Korean copy shown as type.

## Same BPM, more bars

The 30-second cut is the same reel with longer holds (and optional scenes where they exist); the tempo never changes.

| Scene | short | 30 s |
|---|---|---|
| `hook` | 2 | 2 |
| `today` | 3 | 4 |
| `records` | - | 3 |
| `crew` | 2 | 4 |
| `end` | 1 | 3 |

## Scenes

**`hook`**: hook (2 bars): the name and the ring. On the app's periwinkle page, its wordmark (the O O are two linked chrome rings) and its line, 혼자 시작해서 함께 완성하는 루틴; on the right the app's chrome ring, drawn from its own code, fills its first third on beat 1 (1/3 · 33% DONE), as the app's today screen opens.

**`today`**: today (3 bars; 4 in the 30): one tap at a time. The app's check-in list (captured at each step) beside the date and the chrome ring. The cursor taps 물 8잔's + five times on the half beat (3 → 8 of 8) and that routine closes: the ring sweeps to 2/3; then it checks 책 20쪽 and the last loop closes: 3/3, and the ring does the app's own celebration, one glint round and a small pop, as the app's message turns to 오늘의 고리를 모두 이었어요. The headline: 탭 한 번으로 / 오늘의 고리를 이어요.

**`records`**: records (3 bars, the 30 only): the days add up. The app's sixteen-week heatmap (captured): it sweeps in from June to today, the days that were filled in navy, the rest day hatched, today ringed; the app's own footnote counts them (35일 중 20일을 모두 채웠어요). The headline: 이어 온 날들이 / 기록으로 쌓여요.

**`crew`**: crew (2 bars; 4 in the 30): together, with links. The example crew 새벽 루프's board as the app shows it this week (captured): me at 100% and three members from their latest check-in cards (하늘 100%, 도윤 50%, 서아 75%), popping in one by one; then a cheer from 서아 arrives (the app's own cheer card). The headline: 서버 없이, 링크로 / 크루와 함께 이어요.

**`end`**: end (1 bar; 3 in the 30): the end card: the wordmark, its rings settling with a turn, the app's line, the address and where it comes from (toyz original, Chrome Club collection).

## Provenance and credits

- The app, its design, its README (`source/README.md`) and its sample data belong to the toyz project (a toyz original); the captures are of its production build, and the ring and wordmark are drawn from its source.
- Music and sound effects are synthesized by `audio/` (no samples).
- Fonts ship with their licences: `source/fonts/OFL-JetBrainsMono.txt`, `source/fonts/OFL-Pretendard.txt`.
