# Example: toyz-tiny-beat (Tiny Beat)

A real web app goes in: **Tiny Beat**, a toyz original, a groovebox in the browser: 16-step drums and melody
synthesized with Web Audio, and a new beat every day seeded by the date. The reel follows the brief GitReels gives
its one-shot reel writer (a dynamic 15-second 2D motion-graphics reel in a style tied to the core of the project; the
name and what it is within 2 seconds; one core message; at most four scenes; every text readable), in Korean like the
app, and grows a 30-second cut at the same tempo. Its sequencer plays in time with the reel's own music; every panel
is the app itself, captured from its production build with the date pinned.

- Web version with every cut: [`dist/tiny-beat-v1.0.1.html`](dist/tiny-beat-v1.0.1.html) ([play in the browser](https://raw.githack.com/AwesomeZun/Awesome-Showreels/main/skills/motion-showreel/examples/toyz-tiny-beat/dist/tiny-beat-v1.0.1.html))
- Cuts: `short` (5 bars = 15.0 s), `30` (10 bars = 30.0 s), all at 80 BPM.

> Tiny Beat is a real app (a toyz original, Play Objects collection). The beats on screen are the ones the app makes
> for 2026-10-12 in its four genres; the reel's music is synthesized separately, in the same genre and key as the
> lo-fi beat (A minor), and the sequencer's playhead is drawn in time with it.

## Folder

```
toyz-tiny-beat/
  source/                 5 file(s)
    README.md
    fonts/JetBrainsMono-latin-wght.woff2
    fonts/OFL-JetBrainsMono.txt
    fonts/OFL-Pretendard.txt
    fonts/PretendardVariable.woff2
  assets/                 30 file(s)
    captures/ui/app/console.json
    captures/ui/app/console.webp
    captures/ui/app/console_ambient.json
    captures/ui/app/console_ambient.webp
    captures/ui/app/console_break.json
    captures/ui/app/console_break.webp
    captures/ui/app/console_house.json
    captures/ui/app/console_house.webp
    ... 22 more
  modules/                1 file(s)
    tinybeat.js
  scenes/                 5 file(s)
    daily.js
    end.js
    hook.js
    mix.js
    sequence.js
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
S=skills/motion-showreel; P=$S/examples/toyz-tiny-beat
python3 $S/tools/extract_style.py --source $P/source --project $P --board      # draft style (review by hand)
python3 $S/timing/plan_cut.py --project $P --cut short,30
for c in short 30; do python3 $S/audio/arrange.py --project $P --cut $c; done
python3 $S/audio/verify_sync.py --wav $P/build/music-short.wav --cut $P/build/cut-short.json
node $S/runtime/render.mjs --project $P --cut short --out out/toyz-tiny-beat-short.mp4
node $S/runtime/build.mjs --project $P --cuts short,30 --out out/tiny-beat.html
```

## How it was made

1. **The brief.** GitReels' one-shot prompt and its clarity rules (name and what it is in the first 2 s, one core
   message, at most four scenes in the 15-second cut, readable text). The core message is the app's own line:
   매일 한 곡, 나만의 리듬.
2. **The real app, four genres.** `capture/app.json` drives the app's production build (served locally; not
   committed) with the date pinned to 2026-10-12: its wordmark, the daily-seed panel, the console with its LCD and
   the sequencer, once for today's lo-fi beat and once after loading each of house, break and ambient, plus the
   mixer. A DOM pass writes the pad boxes; `gen-src/pads.py` reads each pad's state (off, on, accent) from the
   captured images into `pads.json`. Captures are stored as WebP, the ones drawn small at reduced resolution.
3. **Played in code.** `modules/tinybeat.js` locks a playhead to the reel's bar grid (16 steps a bar, from the
   scene time) and flashes every lit pad it passes, so the real pattern plays in time with the reel's lo-fi music.
   The LED row, the WAV card's waveform (an illustration of the export, not the app's audio) and the stage are code.

## What the tone pass decided

- **palette.** The app's device: near-black #060607 and #111113 panels, chrome for knobs and keys, text #F3F3F1 / #B9B9BF / #8F8F97, and the lime LED #C6F432 with its hot #E2FF7A and deep #5B7412 steps for lit pads, the LCD and anything that sounds.

- **type.** Pretendard Variable for headlines, heavy and tight, white with the second line lime; the app's chrome wordmark ('Tiny Beat.' with a lime dot) is used as captured; JetBrains Mono capitals for labels and readouts, as on the device ('WEB AUDIO GROOVEBOX', 'BPM 073').

- **motion.** Clocked: a playhead sweeps the 16 steps once per bar in time with the reel's music, and every lit pad it passes flashes; LED rows count the beats; panels drop in with a short damped spring like hardware being set down. Between hits the device breathes with the beat.

- **sound.** Lo-fi in A minor at 80 BPM (5 bars in 15 s, 10 in 30 s): today's beat in the app is a lo-fi in A minor, so the reel's music is the same genre in the same key, with organic SFX (taps on pads, a soft click for the dice).

- **visuals.** Four scenes in the 15 s cut: the chrome wordmark lands over a row of LEDs counting the steps; the real sequencer plays today's lo-fi beat, each pad flashing as the playhead passes; the daily seed rolls through lo-fi, house, break and ambient, the real sequencer changing pattern with it; the end card. The 30 s cut adds the mixer and WAV export.

- **narration.** Not recommended: a short, muted launch reel with slogan-length Korean copy shown as type.

## Same BPM, more bars

The 30-second cut is the same reel with longer holds (and optional scenes where they exist); the tempo never changes.

| Scene | short | 30 s |
|---|---|---|
| `hook` | 1 | 1 |
| `sequence` | 2 | 3 |
| `daily` | 1 | 2 |
| `mix` | - | 2 |
| `end` | 1 | 2 |

## Scenes

**`hook`**: hook (1 bar): the device wakes. On black, the app's own chrome wordmark (Tiny Beat. with its lime dot, as captured) lands large, the kicker above it, and the app's line below it: 매일 한 곡, 나만의 리듬. Under it a row of sixteen LEDs counts the steps of the reel's own music, one step per sixteenth, the current one hot.

**`sequence`**: sequence (2 bars, 3 in the 30): press it and it grooves. The app's real sequencer, today's lo-fi beat, drops in large and starts to play in time with the reel's music: a playhead sweeps the 16 steps once a bar and every pad the app shows lit (kick, snare, hat, bass, lead; accents brighter) flashes as it passes. The line above it: 찍으면 바로 그루브가 돼요. In the hold the view leans in slowly toward the pads.

**`daily`**: daily (1 bar, 2 in the 30; the drop): today's beat. The app's real "오늘의 비트" panel on the left: on every beat its genre switches (로파이, 하우스, 브레이크, 앰비언트, round again in the 30) and on the right the app's real console and sequencer switch with it, each to the beat the app made for that genre today (its LCD shows the name and tempo, 073 for lo-fi, 125 for house), still playing in time. Headline: 매일 다른 / 오늘의 비트.

**`mix`**: mix (2 bars, the 30 only): out as a WAV. The app's real mixer rises along the foot (six strips, sends, master) with its level meters breathing on the beat; top right a WAV card draws its waveform on (the loop rendered offline, in the app's words 16-bit PCM stereo 44.1 kHz) and its button is pressed. Headline: 만든 비트는 / WAV 한 파일로.

**`end`**: end (1 bar, 2 in the 30): the end card. The chrome wordmark, the app's line, the address in a lime pill, the collection at the foot, and the LED row still counting the music.

## Provenance and credits

- The app, its design, its README (`source/README.md`) and its sample data belong to the toyz project (a toyz original); the captures are of its production build.
- The wordmark is the app's own chrome type, captured and keyed off its black panel.
- Music and sound effects are synthesized by `audio/` (no samples).
- Fonts ship with their licences: `source/fonts/OFL-JetBrainsMono.txt`, `source/fonts/OFL-Pretendard.txt`.
