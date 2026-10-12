# Example: pulse (Pulse)

A real web app goes in: **Pulse**, a toyz original, a small and sharp dashboard where makers keep the to-dos and
release notes of several projects, entirely in the browser. The reel follows the brief GitReels gives its one-shot
reel writer (a dynamic 15-second 2D motion-graphics reel in a style tied to the core of the project; the name and
what it is within 2 seconds; one core message; at most four scenes; every text readable), in Korean like the app,
and grows a 30-second cut at the same tempo. Every screen in it is the app itself, captured from its production
build with its own fictional sample data; the look comes from the app's own design tokens.

- Web version with every cut: [`dist/pulse-v1.0.1.html`](dist/pulse-v1.0.1.html) ([play in the browser](https://raw.githack.com/AwesomeZun/Awesome-Showreels/main/skills/motion-showreel/examples/pulse/dist/pulse-v1.0.1.html))
- Cuts: `short` (7 bars = 15.0 s), `30` (14 bars = 30.0 s), all at 112 BPM.

> Pulse is a real app (a toyz original, Play Objects collection). The projects, to-dos and releases on screen are its
> fictional sample data, captured as the app shows them.

## Folder

```
pulse/
  source/                 5 file(s)
    README.md
    fonts/JetBrainsMono-latin-wght.woff2
    fonts/OFL-JetBrainsMono.txt
    fonts/OFL-Pretendard.txt
    fonts/PretendardVariable.woff2
  assets/                 20 file(s)
    captures/ui/app/blob.json
    captures/ui/app/blob.webp
    captures/ui/app/kpi.json
    captures/ui/app/kpi_0.webp
    captures/ui/app/kpi_1.webp
    captures/ui/app/kpi_2.webp
    captures/ui/app/kpi_3.webp
    captures/ui/app/kpi_4.webp
    ... 12 more
  modules/                1 file(s)
    pulse.js
  scenes/                 6 file(s)
    end.js
    gauge.js
    hook.js
    palette.js
    quick.js
    releases.js
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
S=skills/motion-showreel; P=$S/examples/pulse
python3 $S/tools/extract_style.py --source $P/source --project $P --board      # draft style (review by hand)
python3 $S/timing/plan_cut.py --project $P --cut short,30
for c in short 30; do python3 $S/audio/arrange.py --project $P --cut $c; done
python3 $S/audio/verify_sync.py --wav $P/build/music-short.wav --cut $P/build/cut-short.json
node $S/runtime/render.mjs --project $P --cut short --out out/pulse-short.mp4
node $S/runtime/build.mjs --project $P --cuts short,30 --out out/pulse.html
```

## How it was made

1. **The brief.** GitReels' one-shot prompt and its clarity rules (name and what it is in the first 2 s, one core
   message, at most four scenes in the 15-second cut, readable text). The core message: 할 일과 배포가 계기판 하나에
   (to-dos and releases on one instrument panel), from the README's own '숫자와 상태가 한눈에 들어오는 계기판'.
2. **The real app.** `capture/app.json` drives the app's production build (served locally; not committed): its chrome
   X (the ChromeBlob SVG) as an alpha layer, the six gauges, three dashboard panels, the command palette and the
   quick-add box before and after typing one line, where the app's own parser shows title, priority, project and
   due date as chips. Scenes reveal the typed text and the chips token by token; nothing inside them is redrawn. The captures are stored as WebP.
3. **Drawn in code.** The aluminium stage, the tick ruler, the ten-step level meter that pulses on the beat, the leads
   from tokens to chips, the keycaps and the version odometer (v1.4.2 to the v1.4.3 the app would suggest).

## What the tone pass decided

- **palette.** The app's light tokens: aluminium bg #E9EAEE / #DFE1E6, panels #F4F5F7, ink #0D0E11 / #30333A / #555963, and the single hot orange #F05A28 it uses for what needs attention (overdue counts, the add button, the live dot). Its status colours stay where status is meant: ok green #0E9F6E, info blue #1A44C4, warn #D9A400, danger #D12F2F.

- **type.** Pretendard Variable at 900 for the big numbers and headlines with tight tracking, as the app sets '오늘의 계기판'; monospaced capitals for the labels the app stamps everywhere ('PULSE · 2026.10.12 MON · W42', 'QUICK ADD', 'DUE RADAR').

- **motion.** Mechanical and exact: parts snap into slots with a short overshoot, needles and level meters jump to their value and settle, a tick ruler runs along the panel. The meters pulse on the beat, so the reel itself has a pulse; holds keep a scanning line and meter flicker alive.

- **sound.** Bright pop at 112 BPM in G major (7 bars in 15 s, 14 in 30 s): a clean, confident groove for a light, orderly tool, with digital SFX (ticks for typed tokens, blips for parsed chips, counts for the numbers).

- **visuals.** Four scenes in the 15 s cut: the chrome X spins in as the name lands; one typed line split into title, priority, project and due date by the app's own parser; the real gauges and panels assembling into today's instrument panel; the end card. The 30 s cut adds the command palette and the release log with its next-version suggestion.

- **narration.** Not recommended: a short, muted launch reel with slogan-length Korean copy shown as type.

## Same BPM, more bars

The 30-second cut is the same reel with longer holds (and optional scenes where they exist); the tempo never changes.

| Scene | short | 30 s |
|---|---|---|
| `hook` | 1 | 2 |
| `quick` | 2 | 3 |
| `palette` | - | 2 |
| `gauge` | 2 | 3 |
| `releases` | - | 2 |
| `end` | 2 | 2 |

## Scenes

**`hook`**: hook (1 bar, 2 in the 30): the panel powers on. The app's chrome X drops in from above spinning, lands with a thud and settles; its floor shadow tightens. On the left the name lands (Pulse, with the orange dot), the kicker above it and by 0.6 s the app's own one-liner below: 메이커를 위한 작고 선명한 대시보드. A ten-step level meter under the line sweeps up and then pulses on every beat, like a meter reading the music; a tick ruler runs along the foot.

**`quick`**: quick (2 bars, 3 in the 30): one line in, four fields out. The app's real quick-add box, large. A line types itself in (로그인 버그 고치기 !높음 @Loopdeck 내일); as each token completes, the app's parser chip for it drops into the row below (제목 · 우선순위 높음 · Loopdeck · 마감 10/13 (화)) and an orange lead joins the token to its chip. Enter presses the orange 추가 button. The headline above: 한 줄로 적으면 / 알아서 나눠 담아요. Inside the box everything is the captured app at four typing stages (capture/app.json); the leads, the caret and the press are code.

**`palette`**: palette (2 bars, the 30 only): ⌘K. Two keycaps press on the left (⌘ then K) and the app's real command palette drops in on the right; an orange selection ring steps down its rows on the beat (대시보드, 프로젝트 목록, 전체 할 일, 배포 타임라인, 설정과 데이터, then the projects). The headline: ⌘K 하나로 / 어디든 바로. The palette is the capture.

**`gauge`**: gauge (2 bars, 3 in the 30; the drop): today's instrument panel. The headline lands first: 할 일과 배포가 / 계기판 하나에. Then the app's six real gauges (지난 마감 3, 오늘 마감 2, 이번 주 마감 7, 진행 중 3, 이번 주 완료 1, 배포·30일 9) snap into a row one per half beat, and three real panels rise under them: progress rings per project, the 12-week activity heatmap (revealed week by week) and the latest releases. A scan line sweeps the gauges on every bar of the hold and the overdue gauge's dot blinks in orange. Every gauge and panel is the captured app (sample data).

**`releases`**: releases (2 bars, the 30 only): release notes that know the next version. The app's real release log panel rises on the left, its rows (v1.4.2 Moss Timer, v0.9.0 Kite Forms, v0.6.1 Loopdeck, the v1.4.1 rollback, v1.4.0) lit one by one; on the right an odometer rolls Moss Timer's last version v1.4.2 to the one the app suggests, v1.4.3 (the largest version's patch plus one, as the README says). Headline: 배포 메모는 / 다음 버전까지.

**`end`**: end (2 bars): the end card. The chrome X turns slowly at the top centre; the name with its orange dot below it, the app's one-liner, the address in a black pill and, at the foot, where it comes from (toyz original, Play Objects).

## Provenance and credits

- The app, its design, its README (`source/README.md`) and its sample data belong to the toyz project (a toyz original); the captures are of its production build.
- The chrome X is the app's own ChromeBlob drawing, captured from the running app.
- Music and sound effects are synthesized by `audio/` (no samples).
- Fonts ship with their licences: `source/fonts/OFL-JetBrainsMono.txt`, `source/fonts/OFL-Pretendard.txt`.
