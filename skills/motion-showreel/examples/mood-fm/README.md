# Example: mood-fm (MOOD FM)

A real web app goes in: **MOOD FM**, a toyz original, a small radio tuned to your mood: drag a two-axis mood pad
or turn an FM dial across eight stations and the screen's colour and a generative soundtrack change together; the
moods you listened to are kept as a colour diary. The reel follows the brief GitReels gives its one-shot reel
writer (a dynamic 15-second 2D motion-graphics reel in a style tied to the core of the project; the name and what it
is within 2 seconds; one core message; at most four scenes; every text readable), in Korean like the app, and grows
a 30-second cut at the same tempo. Every colour on its stage is computed by the app's own code.

- Web version with every cut: [`dist/mood-fm-v1.0.0.html`](dist/mood-fm-v1.0.0.html) ([play in the browser](https://raw.githack.com/AwesomeZun/Awesome-Showreels/main/skills/motion-showreel/examples/mood-fm/dist/mood-fm-v1.0.0.html))
- Cuts: `short` (6 bars = 15.0 s), `30` (12 bars = 30.0 s), all at 96 BPM.

> MOOD FM is a real app (a toyz original, Chrome Club collection). Its stage colours, stations and track names come
> from its own code; the diary is its sample data, captured from its production build.

## Folder

```
mood-fm/
  source/                 5 file(s)
    README.md
    fonts/JetBrainsMono-latin-wght.woff2
    fonts/OFL-JetBrainsMono.txt
    fonts/OFL-Pretendard.txt
    fonts/PretendardVariable.woff2
  assets/                 6 file(s)
    captures/ui/app/cal_geo.txt
    captures/ui/app/calendar.json
    captures/ui/app/calendar.webp
    captures/ui/app/layers.json
    captures/ui/app/pixels.json
    captures/ui/app/pixels.webp
  modules/                2 file(s)
    moodfm.js
    onair.js
  scenes/                 5 file(s)
    diary.js
    end.js
    hook.js
    pad.js
    tune.js
  capture/                1 file(s)
    app.json
  style.json
  reel.config.json
  STORYBOARD.md
  dist/
```

## Run it

```bash
S=skills/motion-showreel; P=$S/examples/mood-fm
python3 $S/tools/extract_style.py --source $P/source --project $P --board      # draft style (review by hand)
python3 $S/timing/plan_cut.py --project $P --cut short,30
for c in short 30; do python3 $S/audio/arrange.py --project $P --cut $c; done
python3 $S/audio/verify_sync.py --wav $P/build/music-short.wav --cut $P/build/cut-short.json
node $S/runtime/render.mjs --project $P --cut short --out out/mood-fm-short.mp4
node $S/runtime/build.mjs --project $P --cuts short,30 --out out/mood-fm.html
```

## How it was made

1. **The brief.** GitReels' one-shot prompt and its clarity rules (name and what it is in the first 2 s, one core
   message, at most four scenes in the 15-second cut, readable text). The core message is the app's own line:
   오늘의 기분으로 고르는 플레이리스트, shown as its promise that colour and music follow the mood.
2. **The app's own colour.** `modules/moodfm.js` ports the app's OKLCH helpers (`domain/color.ts`), its eight
   stations and four corner anchors mixed by inverse distance in OKLab (`paletteAt` in `domain/mood.ts`), its ink
   choice, its dial (`dialToMood`, `dialToFrequency`), its pad's 40 x 40 colour map, its logo and its track names
   (`describeTrack`'s words and seeded picks); `modules/onair.js` draws the on-air stage, tuner and pad in its
   styles. Every frame's background is the app's stage gradient for the mood on screen.
3. **The real diary.** `capture/app.json` captures the app's archive (production build, served locally; not
   committed) on September 2026 with the position of every day; the reel drains it of colour and lights each
   day back to the app's own swatch. Captures are stored as WebP.

## What the tone pass decided

- **palette.** No fixed palette: the background is the app's stage gradient (radial m3 at 82% 18%, radial m1 at 12% 92%, linear 135deg m1 to m2 to m3) for the mood on screen, computed by the app's own paletteAt over its eight stations and four corner anchors in OKLab; text takes the app's ink (#0B0B0C or #F6F2EE) for contrast; coral #F08464 is the on-air lamp and the dial's needle.

- **type.** Pretendard Variable at 900 with -0.065em for the frequency (the app's 93.1), 800 for headlines and station names; JetBrains Mono capitals for the ticker and labels (MHz, STATION 03 OF 08).

- **motion.** A radio being tuned: the coral needle sweeps the FM scale and settles on stations, the frequency rolls, the whole frame's colour glides with it; the mood pad's puck is dragged and the colour follows; the diary's days light up one by one.

- **sound.** Lo-fi in F major at 96 BPM (6 bars in 15 s, 12 in 30 s): warm keys and dusty drums, a late-night radio under a mood dial, soft organic SFX for the needle and the lamp.

- **visuals.** Four scenes in the 15 s cut: the name and the app's line on the stage as the lamp goes on air; the dial swept from 비 to 들뜸 with the colour following; September's diary lighting up in its moods; the end card. The 30 s cut adds the mood pad.

- **narration.** Not recommended: a short, muted launch reel with slogan-length Korean copy shown as type.

## Same BPM, more bars

The 30-second cut is the same reel with longer holds (and optional scenes where they exist); the tempo never changes.

| Scene | short | 30 s |
|---|---|---|
| `hook` | 2 | 2 |
| `tune` | 2 | 3 |
| `pad` | - | 2 |
| `diary` | 1 | 2 |
| `end` | 1 | 3 |

## Scenes

**`hook`**: hook (2 bars): on air. The frame is the app's stage in the colour of its first station, 고요 88.1; on beat 1 the lamp goes coral (ON AIR) and the dial starts to turn, the needle sliding to 비 93.1 and the whole frame's colour following the app's own palette as it goes. The logo's needle turns with it; the name and the app's line sit in the middle: MOOD FM / 오늘의 기분으로 고르는 플레이리스트.

**`tune`**: tune (2 bars; 3 in the 30): tune your mood. The app's on-air stage, full frame: the needle leaves 비 93.1 for 몽글 98.3 and then 들뜸 106.1 (in the 30, 산책 103.5 on the way), the frequency rolling, the station and its mood words changing, a new track title each time (the app's own name generator), the puck crossing the mood pad, and the whole frame turning from wet teal to cloud pink to neon coral: every colour is the app's paletteAt for that point. The headline: 기분에 주파수를 맞추면, / 색과 음악이 함께 바뀌어요.

**`pad`**: pad (2 bars, the 30 only): drag your mood. The app's mood pad, large: a hand drags the chrome puck across it (dark to bright, calm to energetic) and the frame's colour follows the app's palette at every point while the mood words (the app's describeMood) and the nearest station change. The headline is the pad's own hint: 끌어서 기분에 / 주파수를 맞춰요.

**`diary`**: diary (1 bar; 2 in the 30): moods kept as colour. The app's archive for September 2026, captured: every day it was played is painted in that day's mood. It starts drained of colour and the days light up one by one in date order, each popping back to the app's own swatch. The headline: 들은 무드는 / 색으로 남아요.

**`end`**: end (1 bar; 3 in the 30): the end card on the stage, its colour drifting slowly between 몽글 and 맑음 by the app's palette: the logo with its needle easing round, the name, the app's line, the address and where it comes from (toyz original, Chrome Club collection).

## Provenance and credits

- The app, its design, its README (`source/README.md`), its station data and its sample diary belong to the toyz project (a toyz original); the capture is of its production build, and the colour, dial, pad, logo and track names are ported from its source.
- Music and sound effects are synthesized by `audio/` (no samples).
- Fonts ship with their licences: `source/fonts/OFL-JetBrainsMono.txt`, `source/fonts/OFL-Pretendard.txt`.
