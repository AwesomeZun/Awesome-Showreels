# LAYR: storyboard and build contract

Generated from the project files (reel.config.json, the cut plans, the scene headers and style.json); the scene
headers are the authority for the beat-by-beat choreography.

## 1. Brief

- **Material:** `source/README.md` (readme); `assets/captures/ui/app/` (images); `source/fonts/` (other)
- **Mood:** calm, structured, metallic, precise, quiet
- **Purpose:** launch
- **Material:** the app is real (a toyz original, live at https://layr.toyz.kr); its 32 sample notes (a plant-watering app, a neighbourhood running crew, a side-project podcast and a few stray notes) are its own fictional data, and the bundles, layers and brief are what the app made of them.

## 2. Style summary (read-only; from `style.json`)

- Theme dark · bg `#0B0B0C` · ink `#F3F5F8` · accent `#D9F55B` · accent2 `#9FB0C8` · accent3 `#C9D3E3`
- Display `"Pretendard Variable"` · body `"Pretendard Variable"`
- Motion: medium pace, `outC`, transitions cut, zoomInto, whip
- Sound: dark-synth · 112 BPM · E minor · pad, saw-pluck, saw-bass, stab, lead, kick, clap, hats

## 3. Cuts

| Cut | Bars | Length |
|---|---|---|
| `short` | 7 | 15.0 s |
| `30` | 14 | 30.0 s |

One bar = 2.143 s at 112 BPM; every scene starts on a bar line in every cut.

## 4. Scenes

### 4.1 `hook`: LAYR

- Bars: short 2 · 30 s 2 (min 2, max 2) · in 6 beats, out 1 beats · entrance `cut` · music part `intro`
- Cues: thud x5 gap=0.25b @ start+0.5b, tick x10 gap=0.25b @ start+2.75b, whoosh @ outStart+0b

hook (2 bars): the app's hero, in motion. The name and the app's own line on the left (LAYR, 흩어진 메모를 / 층으로 쌓아 프로젝트로.); on the right its glass layer stack drops in plate by plate from the bottom up (the app's own drop-in, a quarter beat apart), while real notes from its sample data drift across the dark and then fall into the stack, shrinking into chips on the plate of the layer the app gave them. The last beat zooms into the top plate.

### 4.2 `organize`: 비슷한 메모끼리

- Bars: short 2 · 30 s 3 (min 2, max 3) · in 6 beats, out 1 beats · entrance `zoomInto` · music part `groove`
- Cues: swish @ start+1b, blip x3 gap=0.5b @ start+2.5b, click @ holdBar+0b, confirm @ holdBar+0b

organize (2 bars; 3 in the 30): bundled for you. All 32 sample notes lie scattered in the dark; on beat 1 they glide into the three bundles the app proposed for them (the heads are the app's own: 러닝 · 크루 · 페이스 with 10 notes and cohesion 0.28, 물주기 · 식물 · 플랜티 9 and 0.27, 팟캐스트 · 에피소드 · 편집 8 and 0.35), lime similarity lines flashing between notes of a bundle as they meet; the five that fit nowhere stay in the inbox. In the 30 the app's 모두 수락 is pressed on the last bar and the bundles become projects.

### 4.3 `layers`: 다섯 레이어

- Bars: short 2 · 30 s 3 (min 2, max 3) · in 6 beats, out 1 beats · entrance `cut` · music part `drop`
- Cues: impact @ start+0b, swell @ start+1b, blip x10 gap=0.25b @ start+2b, sparkle dur=2b @ holdBar+0b

layers (2 bars; 3 in the 30): five layers. The first project's ten notes wait in a column on the left under the headline (다섯 레이어로 / 나눠 쌓아요.); the glass stack opens up on the right into five plates, and from beat 2 the notes fly one by one onto the plate of the layer the app gave them, shrinking into chips, while each plate's count ticks up to the app's own split: 배경 · 문제 2, 아이디어 4, 할 일 2, 참고 1, 질문 1. In the 30 the plates light in turn.

### 4.4 `brief`: 한 장짜리 브리프

- Bars: short - · 30 s 3 (min 3, max 3) · in 9 beats, out 1 beats · entrance `whip` · music part `breakdown`
- Cues: swish @ start+0.5b, tick @ start+3b, tick @ start+4.5b, tick @ start+6b, tick @ start+7.5b, whoosh @ outStart+0b

brief (3 bars, the 30 only): one page. The one-page brief the app wrote for the project (its own sheet, captured: 목표 요약, 핵심 아이디어, 다음 할 일, 열린 질문) slides up on the right; its four sections light in turn on the beat, a lime bar at their edge and their ↗ source links pulsing (every line in the brief points back to the note it came from). The headline: 한 장짜리 브리프로 / 바로 정리돼요.

### 4.5 `end`: LAYR

- Bars: short 1 · 30 s 3 (min 1, max 3) · in 3 beats, out 0 beats · entrance `cut` · music part `outro`
- Cues: sting @ start+0b, shimmer dur=2b @ start+1b

end (1 bar; 3 in the 30): the end card. The brand mark (Brand.tsx) large at the top: its three plates part and settle and its lime edge draws on; the name in steel, the app's line, the address in a dark pill with the lime dot and, at the foot, where it comes from (toyz original, Chrome Club collection). Everything is up by 0.45 s.

