# tiny.tools: storyboard and build contract

Generated from the project files (reel.config.json, the cut plans, the scene headers and style.json); the scene
headers are the authority for the beat-by-beat choreography.

## 1. Brief

- **Material:** `source/README.md` (readme); `assets/captures/ui/app/` (images); `source/fonts/` (other)
- **Mood:** crisp, nimble, nerdy, compact, friendly
- **Purpose:** launch
- **Material:** the app is real (a toyz original, live at https://tiny-tools.toyz.kr); the JSON is the app's own example (a fictional studio, 달빛 공방), the JWT is made up for the reel, and every answer on screen is the app's own.

## 2. Style summary (read-only; from `style.json`)

- Theme dark · bg `#07070B` · ink `#F4F3FF` · accent `#A89BFF` · accent2 `#5B45F0` · accent3 `#58E3A6`
- Display `"Pretendard Variable"` · body `"Pretendard Variable"`
- Motion: energetic pace, `outQuint`, transitions cut, whip, glitch
- Sound: chiptune · 128 BPM · D major · pulse, tri-bass, pulse-lead, kick, snare, hats

## 3. Cuts

| Cut | Bars | Length |
|---|---|---|
| `short` | 8 | 15.0 s |
| `30` | 16 | 30.0 s |

One bar = 1.875 s at 128 BPM; every scene starts on a bar line in every cut.

## 4. Scenes

### 4.1 `hook`: tiny.tools

- Bars: short 2 · 30 s 2 (min 2, max 2) · in 6 beats, out 0.5 beats · entrance `cut` · music part `intro`
- Cues: pop @ start+0b, blips x14 gap=0.125b @ start+1b, beep @ start+6b

hook (2 bars): the app's own front page, in motion. Its logo and name, its eyebrow (SMALL TOOLS. NOTHING MORE.) and its line typed in with the lilac caret: 필요한 만큼만, / 매일 쓰는 도구. Its three facts count up (14 도구 · 0 서버 요청 · 100% 브라우저 처리) while on the right the fourteen tools snap into a grid an eighth of a beat apart, grouped as the app groups them; on the last beat 01 JSON lights, the tool the next scene opens.

### 4.2 `paste`: 스마트 붙여넣기

- Bars: short 3 · 30 s 4 (min 3, max 4) · in 11 beats, out 1 beats · entrance `whip` · music part `groove`
- Cues: click @ start+1.25b, lock @ start+1.5b, click @ start+3.75b, lock @ start+4b, click @ start+6.25b, lock @ start+6.5b, click @ start+8.75b, lock @ start+9b

paste (3 bars; 4 in the 30): smart paste. The app's own pad on the right; every two and a half beats a clipping lands in it (⌘V on the keys below) and the pad answers as the real app did: 감지 · JSON and the JSON tool offered with 01 lit in its table of formats, then a JWT (06), a colour (02) and a Unix time (11). The headline is the pad's own line: 붙여넣으면, / 알맞은 도구를 / 골라 드려요.

### 4.3 `json`: JSON

- Bars: short 2 · 30 s 3 (min 2, max 3) · in 6 beats, out 1 beats · entrance `glitch` · music part `drop`
- Cues: glitch @ start+0b, enter @ start+3b, scan @ start+3b

json (2 bars; 3 in the 30): it stays in the browser. The app's JSON tool with the pasted JSON on one minified line (its tree already reads it: root Object(6), members Array(3), and ✓ 유효한 JSON · 객체 · 키 6개 · 1ms 미만); ⌘↵ is pressed on beat 3 and the line unfolds into formatted JSON under a lilac scan line, as the app's 정리하기 does. The headline is the app's own promise: 입력한 내용은 이 브라우저 / 밖으로 나가지 않아요.

### 4.4 `tools`: 14가지

- Bars: short - · 30 s 4 (min 4, max 4) · in 13 beats, out 1 beats · entrance `whip` · music part `breakdown`
- Cues: swish @ start+0b, swish @ start+4b, swish @ start+8b, swish @ start+12b

tools (4 bars, the 30 only): fourteen in one place. On the left the headline (14가지 도구가 / 한곳에.) over the app's list of tools, two columns, the one on screen lit; on the right four more of the app's tools, a bar each, slide in as captured: 02 컬러 (conversions, WCAG contrast, palettes), 03 텍스트 비교, 08 정규식, 12 cron 설명.

### 4.5 `end`: tiny.tools

- Bars: short 1 · 30 s 3 (min 1, max 3) · in 3 beats, out 0 beats · entrance `cut` · music part `outro`
- Cues: sting @ start+0b, coin @ start+0.5b

end (1 bar; 3 in the 30): the end card. The app's logo, its name with the lilac dot, its README's one-liner, the address in a dark pill and, at the foot, where it comes from (toyz original, Chrome Club collection).

