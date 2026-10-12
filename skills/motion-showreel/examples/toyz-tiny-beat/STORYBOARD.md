# Tiny Beat: storyboard and build contract

Generated from the project files (reel.config.json, the cut plans, the scene headers and style.json); the scene
headers are the authority for the beat-by-beat choreography.

## 1. Brief

- **Material:** `source/README.md` (readme); `assets/captures/ui/app/` (images); `source/fonts/` (other)
- **Mood:** nocturnal, tactile, groovy, hardware, playful
- **Purpose:** launch
- **Material:** the app is real (a toyz original, live at https://tiny-beat.toyz.kr); today's beats are what the app generates for 2026-10-12 (the capture pins the date), and the archive and streak are its sample data.

## 2. Style summary (read-only; from `style.json`)

- Theme dark · bg `#060607` · ink `#F3F3F1` · accent `#C6F432` · accent2 `#E2FF7A` · accent3 `#D4D4D8`
- Display `"Pretendard Variable"` · body `"Pretendard Variable"`
- Motion: medium pace, `outC`, transitions cut, whip, impact
- Sound: lofi · 80 BPM · A minor · epiano, bass, kick, snare, hats, crackle

## 3. Cuts

| Cut | Bars | Length |
|---|---|---|
| `short` | 5 | 15.0 s |
| `30` | 10 | 30.0 s |

One bar = 3.000 s at 80 BPM; every scene starts on a bar line in every cut.

## 4. Scenes

### 4.1 `hook`: Tiny Beat.

- Bars: short 1 · 30 s 1 (min 1, max 1) · in 2.5 beats, out 0.5 beats · entrance `cut` · music part `intro`
- Cues: thud @ start+0b, reveal @ start+0.5b, tick x8 gap=0.25b @ start+2b, swish @ outStart+0b

hook (1 bar): the device wakes. On black, the app's own chrome wordmark (Tiny Beat. with its lime dot, as captured) lands large, the kicker above it, and the app's line below it: 매일 한 곡, 나만의 리듬. Under it a row of sixteen LEDs counts the steps of the reel's own music, one step per sixteenth, the current one hot.

### 4.2 `sequence`: 찍으면 바로

- Bars: short 2 · 30 s 3 (min 2, max 3) · in 3 beats, out 0.5 beats · entrance `cut` · music part `groove`
- Cues: thud @ start+0b, click x4 gap=0.25b @ start+0.5b, pop @ holdBar+0b, swish @ outStart+0b

sequence (2 bars, 3 in the 30): press it and it grooves. The app's real sequencer, today's lo-fi beat, drops in large and starts to play in time with the reel's music: a playhead sweeps the 16 steps once a bar and every pad the app shows lit (kick, snare, hat, bass, lead; accents brighter) flashes as it passes. The line above it: 찍으면 바로 그루브가 돼요. In the hold the view leans in slowly toward the pads.

### 4.3 `daily`: 오늘의 비트

- Bars: short 1 · 30 s 2 (min 1, max 2) · in 3.5 beats, out 0.5 beats · entrance `whip` · music part `drop`
- Cues: impact @ start+0b, click @ start+1b, click @ start+2b, click @ start+3b, click x4 gap=1b @ holdBar+0b, swell @ outStart+0b

daily (1 bar, 2 in the 30; the drop): today's beat. The app's real "오늘의 비트" panel on the left: on every beat its genre switches (로파이, 하우스, 브레이크, 앰비언트, round again in the 30) and on the right the app's real console and sequencer switch with it, each to the beat the app made for that genre today (its LCD shows the name and tempo, 073 for lo-fi, 125 for house), still playing in time. Headline: 매일 다른 / 오늘의 비트.

### 4.4 `mix`: WAV

- Bars: short - · 30 s 2 (min 2, max 2) · in 6 beats, out 1 beats · entrance `whip` · music part `groove`
- Cues: swish @ start+0.5b, drawon dur=2b @ start+2b, click @ start+4.5b, confirm @ start+5b, swell @ outStart+0b

mix (2 bars, the 30 only): out as a WAV. The app's real mixer rises along the foot (six strips, sends, master) with its level meters breathing on the beat; top right a WAV card draws its waveform on (the loop rendered offline, in the app's words 16-bit PCM stereo 44.1 kHz) and its button is pressed. Headline: 만든 비트는 / WAV 한 파일로.

### 4.5 `end`: Tiny Beat.

- Bars: short 1 · 30 s 2 (min 1, max 2) · in 3 beats, out 0 beats · entrance `cut` · music part `outro`
- Cues: sting @ start+0b, bloop @ start+1.5b

end (1 bar, 2 in the 30): the end card. The chrome wordmark, the app's line, the address in a lime pill, the collection at the foot, and the LED row still counting the music.

