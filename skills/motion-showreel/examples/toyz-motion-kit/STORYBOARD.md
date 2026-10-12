# Motion Kit: storyboard and build contract

Generated from the project files (reel.config.json, the cut plans, the scene headers and style.json); the scene
headers are the authority for the beat-by-beat choreography.

## 1. Brief

- **Material:** `source/README.md` (readme); `assets/captures/ui/app/` (images); `source/fonts/` (other)
- **Mood:** playful, crisp, bouncy, delightful, precise
- **Purpose:** launch
- **Material:** the app is real (a toyz original, live at https://motion-kit.toyz.kr); the demos, their labels and the code are the app's own, captured from its production build.

## 2. Style summary (read-only; from `style.json`)

- Theme light · bg `#EEF0F7` · ink `#0A0D1F` · accent `#0B2FE6` · accent2 `#C9B8FF` · accent3 `#FF6A2B`
- Display `"Pretendard Variable"` · body `"Pretendard Variable"`
- Motion: energetic pace, `outBack`, transitions cut, whip, impact
- Sound: bright-pop · 128 BPM · F major · pad, marimba, bell, bass, kick, clap, hats, shaker

## 3. Cuts

| Cut | Bars | Length |
|---|---|---|
| `short` | 8 | 15.0 s |
| `30` | 16 | 30.0 s |

One bar = 1.875 s at 128 BPM; every scene starts on a bar line in every cut.

## 4. Scenes

### 4.1 `hook`: Motion Kit

- Bars: short 2 · 30 s 2 (min 2, max 2) · in 3 beats, out 0.5 beats · entrance `cut` · music part `intro`
- Cues: click @ start+2b, sparkle dur=2b @ start+2b, pop x3 gap=0.25b @ start+2.25b, count dur=1b @ start+4b, whip @ outStart+0b

hook (2 bars): the app's hero, moving. Electric blue with the app's own holographic ribbon knot (src/lib/knot.ts, ported) turning on the right; the name lands in white at once and the app's one-line promise under it by 0.5 s. On beat 2 a cursor presses the name: it squashes like the app's jelly press and the app's confetti recipe bursts from the press. On bar 2 the facts from the hero's foot roll in: 27 interactions, 0 dependencies, vanilla HTML·CSS·JS.

### 4.2 `demos`: 만져 보고

- Bars: short 3 · 30 s 4 (min 3, max 4) · in 11 beats, out 1 beats · entrance `whip` · music part `groove`
- Cues: click @ start+1b, sparkle dur=2b @ start+1b, swish @ start+3.5b, click @ start+4.5b, bloop @ start+4.5b, swish @ start+6.5b, click @ start+7.5b, pop x4 gap=0.125b @ start+7.5b, pop x6 gap=0.125b @ holdBar+0b, whip @ outStart+0b

demos (3 bars; 4 in the 30): try them. A stack of the app's live demo stages on the right; a cursor taps each, and each plays its real animation from frames captured in the app (its iframe paused and stepped every 50 ms): the confetti burst, the ripple, the heart that ticks 128 to 129. After each one the top stage swipes away like the app's own stack swipe. The headline on the left: 인터랙션 27종을 / 직접 눌러 보세요. In the 30 the last stage settles into a wall of all 27 cards (captured from the app's showcase).

### 4.3 `code`: 보이는 코드가 곧 실행되는 코드

- Bars: short 2 · 30 s 3 (min 2, max 3) · in 7 beats, out 1 beats · entrance `impact` · music part `drop`
- Cues: impact @ start+0b, count dur=1b @ start+3b, pop x4 gap=0.125b @ start+4b, sparkle dur=2b @ start+4b, sparkle dur=2b @ holdBar+0b, swell @ outStart+0b

code (2 bars; 3 in the 30): what you see is what runs. The app's code view (the confetti's JS tab) and its control panel slam in. On beat 2 a cursor takes the first slider (조각 수); on beat 3 it drags it from 36 to 72 while the same number counts up inside the code (count: 36 → 72) and a dashed wire runs from the slider's row to it; on beat 4 that very code fires, 72 pieces, from the number. The headline: 보이는 코드가 / 곧 실행되는 코드. The panels are the captured app; only the moving thumb and the two numbers are redrawn in the app's own styles while they change.

### 4.4 `easing`: 이징 놀이터

- Bars: short - · 30 s 4 (min 4, max 4) · in 13 beats, out 1 beats · entrance `whip` · music part `breakdown`
- Cues: drawon dur=1b @ start+1b, drawon dur=1b @ start+4b, drawon dur=1b @ start+7b, drawon dur=1b @ start+10b, swish @ start+12.4b, swell @ outStart+0b

easing (4 bars, the 30 only): the curve decides the character. The app's cubic-bezier editor (EasingPage.tsx, its SVG drawn on canvas) walks through four of the app's presets on beats 1, 4, 7 and 10: ease, ease-in-out, 살짝 넘침, 뒤로 물렀다 출발. The handles glide to each preset, the orange dot rides the new curve, and on the left the app's side-by-side lanes run the same curve, each leaving its ghost dots at equal time steps (where they bunch, it is slow); on the last bar all four race once more, side by side.

### 4.5 `end`: Motion Kit

- Bars: short 1 · 30 s 3 (min 1, max 3) · in 3 beats, out 0 beats · entrance `cut` · music part `outro`
- Cues: sting @ start+0b, sparkle dur=2b @ start+0b, bloop @ start+3b

end (1 bar; 3 in the 30): the end card on the app's electric blue. The knot turns at the top; a last confetti burst from behind the name; the name, the app's promise, the address in a white pill and, at the foot, where it comes from (toyz original, Play Objects collection). Everything is up by 0.4 s so the one-bar cut still reads.

