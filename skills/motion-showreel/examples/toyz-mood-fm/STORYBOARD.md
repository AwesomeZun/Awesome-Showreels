# MOOD FM: storyboard and build contract

Generated from the project files (reel.config.json, the cut plans, the scene headers and style.json); the scene
headers are the authority for the beat-by-beat choreography.

## 1. Brief

- **Material:** `source/README.md` (readme); `assets/captures/ui/app/` (images); `source/fonts/` (other)
- **Mood:** warm, nocturnal, dreamy, intimate, chromatic
- **Purpose:** launch
- **Material:** the app is real (a toyz original, live at https://mood-fm.toyz.kr); its stations, taglines and track-name words are its own, and the diary month is its own sample data (six weeks of fictional entries).

## 2. Style summary (read-only; from `style.json`)

- Theme dark · bg `#0B0B0C` · ink `#F6F2EE` · accent `#F08464` · accent2 `#5D8FA8` · accent3 `#E3B04B`
- Display `"Pretendard Variable"` · body `"Pretendard Variable"`
- Motion: calm pace, `ioC`, transitions cut, flash, zoomInto
- Sound: lofi · 96 BPM · F major · epiano, pad, bass, kick, snare, hats, rim, crackle

## 3. Cuts

| Cut | Bars | Length |
|---|---|---|
| `short` | 6 | 15.0 s |
| `30` | 12 | 30.0 s |

One bar = 2.500 s at 96 BPM; every scene starts on a bar line in every cut.

## 4. Scenes

### 4.1 `hook`: MOOD FM

- Bars: short 2 · 30 s 2 (min 2, max 2) · in 6 beats, out 0.5 beats · entrance `cut` · music part `intro`
- Cues: pulse @ start+1b, scan @ start+1b

hook (2 bars): on air. The frame is the app's stage in the colour of its first station, 고요 88.1; on beat 1 the lamp goes coral (ON AIR) and the dial starts to turn, the needle sliding to 비 93.1 and the whole frame's colour following the app's own palette as it goes. The logo's needle turns with it; the name and the app's line sit in the middle: MOOD FM / 오늘의 기분으로 고르는 플레이리스트.

### 4.2 `tune`: 주파수

- Bars: short 2 · 30 s 3 (min 2, max 3) · in 6 beats, out 1 beats · entrance `cut` · music part `groove`
- Cues: scan @ start+1b, plink @ start+2.5b, scan @ start+4.5b, plink @ start+6b, scan @ holdBar+0b

tune (2 bars; 3 in the 30): tune your mood. The app's on-air stage, full frame: the needle leaves 비 93.1 for 몽글 98.3 and then 들뜸 106.1 (in the 30, 산책 103.5 on the way), the frequency rolling, the station and its mood words changing, a new track title each time (the app's own name generator), the puck crossing the mood pad, and the whole frame turning from wet teal to cloud pink to neon coral: every colour is the app's paletteAt for that point. The headline: 기분에 주파수를 맞추면, / 색과 음악이 함께 바뀌어요.

### 4.3 `pad`: 무드 패드

- Bars: short - · 30 s 2 (min 2, max 2) · in 6 beats, out 1 beats · entrance `flash` · music part `breakdown`
- Cues: swish @ start+0.5b, air @ start+4b

pad (2 bars, the 30 only): drag your mood. The app's mood pad, large: a hand drags the chrome puck across it (dark to bright, calm to energetic) and the frame's colour follows the app's palette at every point while the mood words (the app's describeMood) and the nearest station change. The headline is the pad's own hint: 끌어서 기분에 / 주파수를 맞춰요.

### 4.4 `diary`: 감정 일기

- Bars: short 1 · 30 s 2 (min 1, max 2) · in 3 beats, out 0.5 beats · entrance `cut` · music part `drop`
- Cues: reveal @ start+0b, sparkle dur=2b @ start+0.25b

diary (1 bar; 2 in the 30): moods kept as colour. The app's archive for September 2026, captured: every day it was played is painted in that day's mood. It starts drained of colour and the days light up one by one in date order, each popping back to the app's own swatch. The headline: 들은 무드는 / 색으로 남아요.

### 4.5 `end`: MOOD FM

- Bars: short 1 · 30 s 3 (min 1, max 3) · in 3 beats, out 0 beats · entrance `cut` · music part `outro`
- Cues: sting @ start+0b

end (1 bar; 3 in the 30): the end card on the stage, its colour drifting slowly between 몽글 and 맑음 by the app's palette: the logo with its needle easing round, the name, the app's line, the address and where it comes from (toyz original, Chrome Club collection).

