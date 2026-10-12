# Read Room: storyboard and build contract

Generated from the project files (reel.config.json, the cut plans, the scene headers and style.json); the scene
headers are the authority for the beat-by-beat choreography.

## 1. Brief

- **Material:** `source/README.md` (readme); `assets/captures/ui/app/` (images); `source/fonts/` (other)
- **Mood:** quiet, warm, literary, unhurried, together
- **Purpose:** launch
- **Material:** the app is real (a toyz original, live at https://read-room.toyz.kr); the essay 느리게 읽는 방, its author and the readers 민지 and 태오 are the app's own fictional sample data.

## 2. Style summary (read-only; from `style.json`)

- Theme light · bg `#E3E4E7` · ink `#17191D` · accent `#C2410C` · accent2 `#2563EB` · accent3 `#15803D`
- Display `"Pretendard Variable"` · body `"Pretendard Variable"`
- Motion: calm pace, `ioC`, transitions match, cut, flash
- Sound: ambient · 96 BPM · E major · pad, bell, piano, sub, kick, rim, shaker

## 3. Cuts

| Cut | Bars | Length |
|---|---|---|
| `short` | 6 | 15.0 s |
| `30` | 12 | 30.0 s |

One bar = 2.500 s at 96 BPM; every scene starts on a bar line in every cut.

## 4. Scenes

### 4.1 `hook`: Read Room

- Bars: short 1 · 30 s 2 (min 1, max 2) · in 3 beats, out 1 beats · entrance `cut` · music part `intro`
- Cues: swish @ start+0b, reveal @ start+0.5b, drawon dur=1b @ start+1.5b, ding @ holdBar+0b, flip @ outStart+0b

hook (1 bar, 2 in the 30): a quiet reading room. On the grey desk the name lands (Read Room, with the app's chrome X mark cropped from its first screen), the kicker above, and the room's one-liner below with an orange highlighter sweeping behind it, as the app marks its own headline: 함께 읽는 작은 열람실.

### 4.2 `underline`: 밑줄 긋고, 메모를 나눠요

- Bars: short 2 · 30 s 3 (min 2, max 3) · in 7 beats, out 1 beats · entrance `dissolve` · music part `groove`
- Cues: swish @ start+0.5b, drawon dur=1.2b @ start+1b, pop @ start+2.5b, drawon dur=1b @ start+4b, drawon dur=0.8b @ start+5b, pop @ start+6b, drawon dur=1b @ holdBar+0b, flip @ outStart+0b

underline (2 bars, 3 in the 30): underline it, talk in the margin. The app's real essay (느리게 읽는 방, its own fictional sample) lies on the desk; the camera reads down it. Blue draws on along the real line boxes of the first reader's highlight (느리게 읽는 사람은 한 글 안에 오래 머뭅니다), and her margin note slides in beside paragraph 04 (민지 · 메모 2); further down a second reader's orange and a third's yellow draw on one after another. In the 30 the green one and the note on paragraph 11 (태오) follow. Headline right: 밑줄 긋고, / 메모를 나눠요.

### 4.3 `questions`: 질문

- Bars: short - · 30 s 2 (min 2, max 2) · in 6 beats, out 1 beats · entrance `dissolve` · music part `breakdown`
- Cues: swish @ start+0.5b, pop x3 gap=0.5b @ start+2b, ding @ start+4.5b, flip @ outStart+0b

questions (2 bars, the 30 only): bring a question. The page dims behind; the app's real discussion panel rises on the right with its three questions, each linked to a paragraph (문단 8, 11, 15), the last already ticked 다뤘어요; each question lights on the beat. Headline left: 질문을 올리고, / 모임에서 다뤄요.

### 4.4 `together`: 링크 하나로 함께

- Bars: short 2 · 30 s 3 (min 2, max 3) · in 7 beats, out 1 beats · entrance `dissolve` · music part `drop`
- Cues: shimmer @ start+0b, swish @ start+1b, click @ start+2.5b, zap dur=1.5b @ start+3b, bloop @ start+5b, ding @ holdBar+0b, swell @ outStart+0b

together (2 bars, 3 in the 30; the drop): together without a server. The camera pulls back to the whole essay with every reader's highlights in four colours; the app's real read-together panel rises beside it: share the room as one link (the button is pressed and a link chip flies off carrying its compressed hash), or as a .readroom.json file, and its two participants (민지, 태오). Headline: 서버 없이, / 링크 하나로 함께.

### 4.5 `end`: Read Room

- Bars: short 1 · 30 s 2 (min 1, max 2) · in 3 beats, out 0 beats · entrance `dissolve` · music part `outro`
- Cues: sting @ start+0b, drawon dur=1b @ start+1b

end (1 bar, 2 in the 30): the end card. The app's own line in two parts, the second marked in orange as its hero does (읽고 싶은 글을, / 함께 읽을 사람과.), the name and address below and the collection at the foot.

