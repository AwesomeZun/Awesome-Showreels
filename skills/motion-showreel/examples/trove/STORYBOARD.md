# Trove: storyboard and build contract

Generated from the project files (reel.config.json, the cut plans, the scene headers and style.json); the scene
headers are the authority for the beat-by-beat choreography.

## 1. Brief

- **Material:** `source/README.md` (readme); `assets/captures/ui/app/` (images); `source/fonts/` (other)
- **Mood:** dark, metallic, precise, quietly clever, nocturnal
- **Purpose:** launch
- **Material:** the app is real (a toyz original, live at https://trove.toyz.kr); the links, domains, titles and people on screen are the app's own fictional sample data.

## 2. Style summary (read-only; from `style.json`)

- Theme dark · bg `#08090A` · ink `#EEEFF1` · accent `#C6F432` · accent2 `#8FD3FF` · accent3 `#FFC94D`
- Display `"Pretendard Variable"` · body `"Pretendard Variable"`
- Motion: medium pace, `outC`, transitions match, zoomInto, cut
- Sound: dark-synth · 128 BPM · A minor · pad, saw-pluck, saw-bass, stab, lead, kick, clap, hats

## 3. Cuts

| Cut | Bars | Length |
|---|---|---|
| `short` | 8 | 15.0 s |
| `30` | 16 | 30.0 s |

One bar = 1.875 s at 128 BPM; every scene starts on a bar line in every cut.

## 4. Scenes

### 4.1 `hook`: Trove

- Bars: short 2 · 30 s 2 (min 2, max 2) · in 5 beats, out 2 beats · entrance `cut` · music part `intro`
- Cues: drone dur=2b @ start+0b, tick x10 gap=0.08 @ start+0.25b, swell @ start+1b, chime @ start+1b, reveal @ start+1.5b, zoom dur=2b @ outStart+0b

hook (2 bars): scattered links. Link chips from the app's sample data (fictional domains and titles) and raw pasted fragments drift at different depths, out of focus, every which way. The chrome torus (the app's own drawing) spins up at the left; one by one the chips are pulled into its orbit, shrink and vanish into the ring, and the lime reflection runs round it. By 0.5 s the name lands on the right in chrome type, the kicker above it, and by 1.3 s the one-line promise below it: 흩어진 링크를 하나의 지식으로. On the last two beats the ring turns to face the camera and grows; the next scene opens inside its hole.

### 4.2 `paste`: 붙여넣기

- Bars: short 2 · 30 s 3 (min 2, max 3) · in 7 beats, out 1 beats · entrance `zoomInto` · music part `groove`
- Cues: swish @ start+0.5b, keytap dur=1b fast @ start+1.5b, scan dur=1b @ start+2.5b, blip x3 gap=0.5b @ start+3b, pop x3 gap=0.25b @ start+4.5b, click @ start+6b, blip @ holdBar+0b, whip @ outStart+0b

paste (2 bars, 3 in the 30): the real "여러 개 붙여넣기" dialog. It is centred when the camera comes through the ring and slides right as the headline rises on the left: 대화째 붙여넣으면 / 링크만 골라 담아요. A chat fragment is pasted (three lines appear one after another), a lime scan runs down the box and boxes each URL the app found, the app's own summary line counts them (URL 3개를 찾았어요 · 새 링크 3개) and its three rows pop in with their "새 링크" badges. The cursor presses "새 링크 3개 추가"; on the last beat the three links fly off to the right. Everything inside the dialog is the captured app (capture/app.json); only the frame, scan, boxes and cursor are code.

### 4.3 `tags`: 자동 태그와 요약

- Bars: short - · 30 s 3 (min 3, max 3) · in 8 beats, out 1 beats · entrance `whip` · music part `groove`
- Cues: swish @ start+0.5b, drawon dur=1b @ start+2b, blips dur=1.5b @ start+3.5b, pop x6 gap=0.25b @ start+5b, tick @ holdBar+0b, whip @ outStart+0b

tags (3 bars, the 30 only): auto tags and summary, from the real link form. A memo is already typed (three sentences); the six words the app picked light up one after another, its own one-sentence summary sweeps in under the memo (요약 · 지식 그래프 입문 글이에요.), and each picked word flies down into its suggestion chip. The headline on the right says it plainly: 태그와 요약은 / 알아서 붙어요. Everything inside the card is the captured form.

### 4.4 `connect`: 링크가 이어지면 지식이 돼요

- Bars: short 2 · 30 s 3 (min 2, max 3) · in 7 beats, out 1 beats · entrance `impact` · music part `drop`
- Cues: impact @ start+0b, swish x2 gap=0.5b @ start+0.5b, drawon dur=2b @ start+2b, blip x5 gap=0.5b @ start+2b, lock @ start+4.5b, zap @ holdBar+0b, swell @ outStart+0b

connect (2 bars, 3 in the 30; the drop): links joined into knowledge. Nine real cards from the app's board (sample data, fictional) fly in from depth and settle around the pinned looplens card. Lime lines draw on between cards that really share something in that data: looplens to the three links the app lists as related (같은 주제 twice, the keyword 실험), and the tags two cards share (#프런트엔드, #타이포그래피, #검색, #도구). Pulses run along the lines. The app's own headline lands bottom left: 링크가 이어지면 / 지식이 돼요. (second line lime). The camera drifts.

### 4.5 `find`: 검색

- Bars: short - · 30 s 2 (min 2, max 2) · in 6 beats, out 1 beats · entrance `whip` · music part `breakdown`
- Cues: keytap dur=0.75b @ start+0.5b, scan dur=1b @ start+1.5b, ding x3 gap=0.25b @ start+2.5b, swell @ outStart+0b

find (2 bars, the 30 only): found again. The real app after a search: the "/" key pops on the left, 시각화 types into the app's search box, its count (1건) appears, and the view pans down from the search box to the one card it kept, where the app's own highlight marks sit on the matched word in the memo and the tag; lime pulses ring them. The headline: / 한 번이면 / 다시 찾아요. The window is the captured screen (capture/app.json, step "search").

### 4.6 `end`: Trove

- Bars: short 2 · 30 s 3 (min 2, max 3) · in 6 beats, out 0 beats · entrance `flash` · music part `outro`
- Cues: sting @ start+0b, chime @ start+2b, tick x8 gap=0.06 @ start+3b, sparkle dur=1b @ holdBar+0b

end (2 bars, 3 in the 30): the end card. The chrome torus lands at the top centre and keeps turning, its lime reflection running round; the name in chrome type below it, the app's one-liner (흩어진 링크를 하나의 지식으로), the address in a lime-ruled pill and, at the foot, where it comes from (toyz original, Play Objects collection).

