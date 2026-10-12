# Deploy Kit: storyboard and build contract

Generated from the project files (reel.config.json, the cut plans, the scene headers and style.json); the scene
headers are the authority for the beat-by-beat choreography.

## 1. Brief

- **Material:** `source/README.md` (readme); `assets/captures/ui/app/` (images); `source/fonts/` (other)
- **Mood:** fast, precise, launch-ready, clean, energetic
- **Purpose:** launch
- **Material:** the app is real (a toyz original, live at https://deploy-kit.toyz.kr); the kit 'Orbit Note' and its rename to 'Moss Timer' are fictional example data typed into it.

## 2. Style summary (read-only; from `style.json`)

- Theme light · bg `#ECEEF5` · ink `#0A0B10` · accent `#0B2FE6` · accent2 `#2748FF` · accent3 `#D4FF3A`
- Display `"Pretendard Variable"` · body `"Pretendard Variable"`
- Motion: energetic pace, `outC`, transitions whip, impact, cut
- Sound: dnb · 176 BPM · G minor · pad, reese, sub, stab, kick, snare, hats

## 3. Cuts

| Cut | Bars | Length |
|---|---|---|
| `short` | 11 | 15.0 s |
| `30` | 22 | 30.0 s |

One bar = 1.364 s at 176 BPM; every scene starts on a bar line in every cut.

## 4. Scenes

### 4.1 `hook`: Deploy Kit

- Bars: short 2 · 30 s 3 (min 2, max 3) · in 4 beats, out 1 beats · entrance `cut` · music part `intro`
- Cues: riser dur=1b @ start+0b, impact @ start+1b, blips dur=4b fast @ start+1b, reveal @ start+2b, whip @ outStart+0b

hook (2 bars, 3 in the 30): launch. The kit's real file names (README.md, LICENSE, ci.yml, vercel.json, og.png, favicon.svg and the rest of its 25 items) stream upward in two lanes like exhaust, faster on the beat. The app's logo lands in the middle on the first hit (beat 1), the kicker above, the app's line below by 0.6 s: 작은 제품을 세상에 내놓는 도구.

### 4.2 `live`: 적는 대로

- Bars: short 3 · 30 s 4 (min 3, max 4) · in 10 beats, out 1 beats · entrance `whip` · music part `groove`
- Cues: swish @ start+0.5b, keytap dur=1b fast @ start+2b, blip x4 gap=0.25b @ start+3b, keytap dur=2b fast @ start+4b, blips dur=2b @ start+6.5b, ding @ start+8.5b, blip x2 gap=0.5b @ holdBar+0b, whip @ outStart+0b

live (3 bars, 4 in the 30): what you type is what ships. Left, the app's real identity form; right, its real live output tray. The project name is cleared and retyped (Moss, then Moss Timer), each stage captured: the tray marks every file it re-made UPDATED, says so itself (방금 12개 파일이 다시 만들어졌어요) and its OG image and favicon follow the new name (Moss Timer, MT). Blue ticks pulse down the updated rows. Headline: 적는 대로 / 출시 파일이 바뀌어요.

### 4.3 `og`: OG 이미지 · 파비콘

- Bars: short - · 30 s 4 (min 4, max 4) · in 12 beats, out 1 beats · entrance `whip` · music part `groove`
- Cues: swish @ start+0.5b, flip x4 gap=1b @ start+4b, pop x5 gap=0.5b @ start+9b, whip @ outStart+0b

og (4 bars, the 30 only): the share card and the icons come along. The app's real OG image preview (1200 x 630, the kit's title over its brand blue and knot) on the left; its four layout cards light one by one on the beat (포스터, 분할, 그리드, 카드); then its favicon sizes pop in a row (16, 32, 180, 192, 512). Headline right: OG 이미지와 / 파비콘까지.

### 4.4 `ship`: ZIP 하나로

- Bars: short 4 · 30 s 5 (min 4, max 5) · in 13 beats, out 1 beats · entrance `impact` · music part `drop`
- Cues: impact @ start+0b, zap dur=6b @ start+1b, count dur=6b @ start+1b, stamp @ start+8b, confirm @ start+10b, blip @ holdBar+0b, swell @ outStart+0b

ship (4 bars, 5 in the 30; the drop): one ZIP. The app's real bench strip sits top right (입력 7/7 · 파일 19 · 이미지 6 · moss-timer-deploy-kit ZIP). From a column on the left the kit's 25 items fly one after another, a quarter beat apart, and arc into a blue ZIP crate whose counter climbs to 25; on beat 8 the crate's zipper closes with a stamp and its label reads moss-timer-deploy-kit.zip; a check confirms 25 files, one ZIP. Headline: 필요한 것만 골라 / ZIP 하나로 출시.

### 4.5 `check`: 출시 체크리스트

- Bars: short - · 30 s 3 (min 3, max 3) · in 9 beats, out 1 beats · entrance `whip` · music part `breakdown`
- Cues: scan dur=2b @ start+1b, count dur=2b @ start+5b, blip @ holdBar+0b, swell @ outStart+0b

check (3 bars, the 30 only): nothing forgotten. The app's real launch checklist: its dark progress panel (15%, seven categories with bars) and its first items drifting up; a light sweeps the panel on each bar. Headline: 출시 전 42가지, / 빠짐없이.

### 4.6 `end`: Deploy Kit

- Bars: short 2 · 30 s 3 (min 2, max 3) · in 6 beats, out 0 beats · entrance `cut` · music part `outro`
- Cues: sting @ start+0b, bloop @ start+2b

end (2 bars, 3 in the 30): the end card. The app's logo, its line, the address on the blue of its ZIP button, and the collection at the foot; a few file names still drift up the edges.

