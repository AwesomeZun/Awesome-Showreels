# Example: focus-space (FOCUS SPACE)

A real web app goes in: **FOCUS SPACE**, a toyz original, a small room where only one task and the time remain: a
pomodoro timer inside an arched door, a task list, ambient sound synthesised in the browser and a weekly log, offline
as a PWA. The reel follows the brief GitReels gives its one-shot reel writer (a dynamic 15-second 2D motion-graphics
reel in a style tied to the core of the project; the name and what it is within 2 seconds; one core message; at most
four scenes; every text readable), in Korean like the app, and grows a 30-second cut at the same tempo.

- Web version with every cut: [`dist/focus-space-v1.0.0.html`](dist/focus-space-v1.0.0.html) ([play in the browser](https://raw.githack.com/AwesomeZun/Awesome-Showreels/main/skills/motion-showreel/examples/focus-space/dist/focus-space-v1.0.0.html))
- Cuts: `short` (6 bars = 15.0 s), `30` (12 bars = 30.0 s), all at 96 BPM.

> FOCUS SPACE is a real app (a toyz original, Chrome Club collection). The tasks and the log on screen are its
> fictional sample data, captured from its production build.

## Folder

```
focus-space/
  source/                 5 file(s)
    README.md
    fonts/JetBrainsMono-latin-wght.woff2
    fonts/OFL-JetBrainsMono.txt
    fonts/OFL-Pretendard.txt
    fonts/PretendardVariable.woff2
  assets/                 14 file(s)
    captures/ui/app/arch_ready.json
    captures/ui/app/arch_ready.webp
    captures/ui/app/arch_run.json
    captures/ui/app/arch_run.webp
    captures/ui/app/layers.json
    captures/ui/app/logcards.json
    captures/ui/app/logcards_0.webp
    captures/ui/app/logcards_1.webp
    ... 6 more
  modules/                1 file(s)
    focus.js
  scenes/                 5 file(s)
    end.js
    focus.js
    hook.js
    log.js
    sound.js
  capture/                1 file(s)
    app.json
  style.json
  reel.config.json
  STORYBOARD.md
  dist/
```

## Run it

```bash
S=skills/motion-showreel; P=$S/examples/focus-space
python3 $S/tools/extract_style.py --source $P/source --project $P --board      # draft style (review by hand)
python3 $S/timing/plan_cut.py --project $P --cut short,30
for c in short 30; do python3 $S/audio/arrange.py --project $P --cut $c; done
python3 $S/audio/verify_sync.py --wav $P/build/music-short.wav --cut $P/build/cut-short.json
node $S/runtime/render.mjs --project $P --cut short --out out/focus-space-short.mp4
node $S/runtime/build.mjs --project $P --cuts short,30 --out out/focus-space.html
```

## How it was made

1. **The brief.** GitReels' one-shot prompt and its clarity rules (name and what it is in the first 2 s, one core
   message, at most four scenes in the 15-second cut, readable text). The core message is the app's own line:
   해야 할 일 하나에 집중하는 작은 방, and its sentence 화면에는 지금 할 일 하나와 시간만 남습니다.
2. **The real room.** `capture/app.json` drives the app's production build (served locally; not committed): the
   arched room ready and running with its ring and clock hidden, the ambient mixer off, on and with its sliders moved
   through the inputs' own events, and the log's seven days and twelve weeks; `gen-src/uncomposite.py` lifts the
   app's translucent backdrop off the room and mixer captures. Captures are stored as WebP.
3. **The app's ring.** `modules/focus.js` draws the timer ring from the app's own SVG (glass disc, sixty ticks,
   track, chrome tube with its edge and shine, knob) and its clock on the captured room, so the session can run in
   time-lapse from 25:00 to 00:00; the stacked wordmark uses its chrome gradient for SPACE.

## What the tone pass decided

- **palette.** The app's deep green dark theme: grounds #14241A / #0E1A12 / #1A2E20, text #E9EDE3 / #D6DCCD / #BCC7B6, the ring's chrome (#FFFFFF, #99A296, #F7F9F4, #5F6A5E, #E2E6DD) and SPACE's chrome gradient, the heat scale #4B6F4F / #82A17D / #D0DCC5.

- **type.** Pretendard Variable at 900 with -0.06em for the stacked FOCUS / SPACE (SPACE in chrome), 750 with -0.05em for the clock (the app's 25:00), 800 for headlines; mono capitals for its labels (FOCUS / READY, AMBIENT / 배경 소리).

- **motion.** Slow and steady: a door that opens onto one task, a clock that runs in time-lapse while the chrome ring closes round it, sliders easing up one by one, the log filling in.

- **sound.** Ambient in F major at 96 BPM (6 bars in 15 s, 12 in 30 s): pads, glass and a soft pulse, a quiet room for one task.

- **visuals.** Four scenes in the 15 s cut: the name and the app's line beside its arched room at 25:00; the session starting and running in time-lapse as the ring closes; the log of days and weeks; the end card. The 30 s cut adds the ambient mixer.

- **narration.** Not recommended: a short, muted launch reel with slogan-length Korean copy shown as type.

## Same BPM, more bars

The 30-second cut is the same reel with longer holds (and optional scenes where they exist); the tempo never changes.

| Scene | short | 30 s |
|---|---|---|
| `hook` | 2 | 2 |
| `focus` | 2 | 3 |
| `sound` | - | 2 |
| `log` | 1 | 2 |
| `end` | 1 | 3 |

## Scenes

**`hook`**: hook (2 bars): the room. The app's stacked wordmark on the left (생산성 · TOYZ, FOCUS, SPACE in its chrome) with its line, 해야 할 일 하나에 집중하는 작은 방; on the right its arched room rises out of the dark, its chrome ring empty at 25:00 and one task pinned in the middle (모래섬 스튜디오 제안서 다듬기). On the last beat the camera moves into the door.

**`focus`**: focus (2 bars; 3 in the 30): only one task and the time. The room, closer: 시작 is pressed on beat 1 and the app's own running state takes over (FOCUS / RUNNING, 일시정지); the clock runs in time-lapse from 25:00 to 00:00 while the chrome ring closes round the task, the knob riding its tip; at the end the ring glows once. The headline is the app's own sentence: 지금 할 일 하나와 / 시간만 남아요.

**`sound`**: sound (2 bars, the 30 only): a room that sounds like rain. The app's ambient mixer (captured off, on, and with its sliders moved): the switch turns on on beat 1, then rain, wind and cafe ease up one row at a time on the beat (fire stays at 25), each row's change a quick crossfade between the app's own states. The headline: 빗소리와 모닥불, / 직접 섞어 켜요.

**`log`**: log (1 bar; 2 in the 30): the days add up. The app's log (captured): the last seven days' bars rise from the floor and the twelve-week heatmap fills in from July to today. The headline: 집중한 시간은 / 기록으로 남아요.

**`end`**: end (1 bar; 3 in the 30): the end card: the stacked wordmark beside a small ring turning slowly to full, the app's line, the address and where it comes from (toyz original, Chrome Club collection).

## Provenance and credits

- The app, its design, its README (`source/README.md`) and its sample data belong to the toyz project (a toyz original); the captures are of its production build, and the ring and wordmark are drawn from its source.
- Music and sound effects are synthesized by `audio/` (no samples).
- Fonts ship with their licences: `source/fonts/OFL-JetBrainsMono.txt`, `source/fonts/OFL-Pretendard.txt`.
