# Example: motion-kit (Motion Kit)

A real web app goes in: **Motion Kit**, a toyz original, a showcase of 27 small interactions for buttons, cards,
inputs, text and feedback, each one a live demo with its controls and the vanilla HTML, CSS and JS that runs it. The
reel follows the brief GitReels gives its one-shot reel writer (a dynamic 15-second 2D motion-graphics reel in a style
tied to the core of the project; the name and what it is within 2 seconds; one core message; at most four scenes;
every text readable), in Korean like the app, and grows a 30-second cut at the same tempo. Every animation in it is
the app's own: replayed from its demo iframe, or ported from its source.

- Web version with every cut: [`dist/motion-kit-v1.0.0.html`](dist/motion-kit-v1.0.0.html) ([play in the browser](https://raw.githack.com/AwesomeZun/Awesome-Showreels/main/skills/motion-showreel/examples/motion-kit/dist/motion-kit-v1.0.0.html))
- Cuts: `short` (8 bars = 15.0 s), `30` (16 bars = 30.0 s), all at 128 BPM.

> Motion Kit is a real app (a toyz original, Play Objects collection). The demos, controls and code on screen are
> the app's own, captured from its production build or redrawn from its source.

## Folder

```
motion-kit/
  source/                 5 file(s)
    README.md
    fonts/JetBrainsMono-latin-wght.woff2
    fonts/OFL-JetBrainsMono.txt
    fonts/OFL-Pretendard.txt
    fonts/PretendardVariable.woff2
  assets/                 161 file(s)
    captures/ui/app/cards.json
    captures/ui/app/cards_0.webp
    captures/ui/app/cards_1.webp
    captures/ui/app/cards_10.webp
    captures/ui/app/cards_11.webp
    captures/ui/app/cards_12.webp
    captures/ui/app/cards_13.webp
    captures/ui/app/cards_14.webp
    ... 153 more
  modules/                1 file(s)
    motionkit.js
  scenes/                 5 file(s)
    code.js
    demos.js
    easing.js
    end.js
    hook.js
  capture/                1 file(s)
    app.json
  style.json
  reel.config.json
  STORYBOARD.md
  dist/
```

## Run it

```bash
S=skills/motion-showreel; P=$S/examples/motion-kit
python3 $S/tools/extract_style.py --source $P/source --project $P --board      # draft style (review by hand)
python3 $S/timing/plan_cut.py --project $P --cut short,30
for c in short 30; do python3 $S/audio/arrange.py --project $P --cut $c; done
python3 $S/audio/verify_sync.py --wav $P/build/music-short.wav --cut $P/build/cut-short.json
node $S/runtime/render.mjs --project $P --cut short --out out/motion-kit-short.mp4
node $S/runtime/build.mjs --project $P --cuts short,30 --out out/motion-kit.html
```

## How it was made

1. **The brief.** GitReels' one-shot prompt and its clarity rules (name and what it is in the first 2 s, one core
   message, at most four scenes in the 15-second cut, readable text). The core message is the app's own line:
   클릭 한 번에 작은 즐거움을, and its promise that the code you see is the code that runs.
2. **The real animations, frame by frame.** `capture/app.json` drives the app's production build (served locally;
   not committed): it presses the confetti, ripple and heart demos inside their iframes, pauses every animation with
   `document.getAnimations()` and steps it 50 ms at a time, so the reel replays the app's own motion. It also
   captures the 27 showcase cards, the confetti's control panel and its JS tab at 36 and at 72 pieces. Captures are
   stored as WebP.
3. **Ported, not imitated.** `modules/motionkit.js` carries the app's holographic ribbon knot (`src/lib/knot.ts`)
   line for line, its confetti recipe (count, spread, distance, spin, keyframes and curve from
   `interactions/buttons.ts`, with a seeded hash for the random numbers), its cubic-bezier editor and comparison
   lanes (`EasingPage.tsx` and their CSS), and a slider that moves between the two captured panels.

## What the tone pass decided

- **palette.** The app's tokens: electric blue #0B2FE6 (the hero, primary buttons) with #0925C4 / #050F52, paper #EEF0F7 / #F6F7FB, ink #0A0D1F / #353B5C, and the confetti colours its code uses (#0B2FE6, #C9B8FF, #FF6A2B, #FFFFFF, #7FE7FF): lilac and orange as accents.

- **type.** Pretendard Variable at 900 for headlines (the app's '클릭 한 번에 작은 즐거움을.' with its orange period), white on the blue stage and ink on paper; JetBrains Mono for code and labels.

- **motion.** Bouncy and exact: springs with a little overshoot (the app's own favourite curve, cubic-bezier(0.34, 1.56, 0.64, 1), drives the reel's entrances), a cursor that taps, and the app's animations played back frame by frame at their own timing.

- **sound.** Bright pop in F major at 128 BPM (8 bars in 15 s, 16 in 30 s): light and cheerful for a kit of small delights, with glassy SFX (a pop for every tap, sparkles for confetti).

- **visuals.** Four scenes in the 15 s cut: the name and the app's line over the blue stage as a tap bursts confetti made with the app's own recipe; the real demo stage playing the app's confetti, ripple and heart animations; the real code panel changing as its slider moves (count: 36 to 72); the end card. The 30 s cut adds the easing lab's bezier editor.

- **narration.** Not recommended: a short, muted launch reel with slogan-length Korean copy shown as type.

## Same BPM, more bars

The 30-second cut is the same reel with longer holds (and optional scenes where they exist); the tempo never changes.

| Scene | short | 30 s |
|---|---|---|
| `hook` | 2 | 2 |
| `demos` | 3 | 4 |
| `code` | 2 | 3 |
| `easing` | - | 4 |
| `end` | 1 | 3 |

## Scenes

**`hook`**: hook (2 bars): the app's hero, moving. Electric blue with the app's own holographic ribbon knot (src/lib/knot.ts, ported) turning on the right; the name lands in white at once and the app's one-line promise under it by 0.5 s. On beat 2 a cursor presses the name: it squashes like the app's jelly press and the app's confetti recipe bursts from the press. On bar 2 the facts from the hero's foot roll in: 27 interactions, 0 dependencies, vanilla HTML·CSS·JS.

**`demos`**: demos (3 bars; 4 in the 30): try them. A stack of the app's live demo stages on the right; a cursor taps each, and each plays its real animation from frames captured in the app (its iframe paused and stepped every 50 ms): the confetti burst, the ripple, the heart that ticks 128 to 129. After each one the top stage swipes away like the app's own stack swipe. The headline on the left: 인터랙션 27종을 / 직접 눌러 보세요. In the 30 the last stage settles into a wall of all 27 cards (captured from the app's showcase).

**`code`**: code (2 bars; 3 in the 30): what you see is what runs. The app's code view (the confetti's JS tab) and its control panel slam in. On beat 2 a cursor takes the first slider (조각 수); on beat 3 it drags it from 36 to 72 while the same number counts up inside the code (count: 36 → 72) and a dashed wire runs from the slider's row to it; on beat 4 that very code fires, 72 pieces, from the number. The headline: 보이는 코드가 / 곧 실행되는 코드. The panels are the captured app; only the moving thumb and the two numbers are redrawn in the app's own styles while they change.

**`easing`**: easing (4 bars, the 30 only): the curve decides the character. The app's cubic-bezier editor (EasingPage.tsx, its SVG drawn on canvas) walks through four of the app's presets on beats 1, 4, 7 and 10: ease, ease-in-out, 살짝 넘침, 뒤로 물렀다 출발. The handles glide to each preset, the orange dot rides the new curve, and on the left the app's side-by-side lanes run the same curve, each leaving its ghost dots at equal time steps (where they bunch, it is slow); on the last bar all four race once more, side by side.

**`end`**: end (1 bar; 3 in the 30): the end card on the app's electric blue. The knot turns at the top; a last confetti burst from behind the name; the name, the app's promise, the address in a white pill and, at the foot, where it comes from (toyz original, Play Objects collection). Everything is up by 0.4 s so the one-bar cut still reads.

## Provenance and credits

- The app, its design, its README (`source/README.md`) and its interactions belong to the toyz project (a toyz original); the captures are of its production build, and the knot, the confetti and the curve editor are ported from its source.
- Music and sound effects are synthesized by `audio/` (no samples).
- Fonts ship with their licences: `source/fonts/OFL-JetBrainsMono.txt`, `source/fonts/OFL-Pretendard.txt`.
