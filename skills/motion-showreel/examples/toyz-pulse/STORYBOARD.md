# Pulse: storyboard and build contract

Generated from the project files (reel.config.json, the cut plans, the scene headers and style.json); the scene
headers are the authority for the beat-by-beat choreography.

## 1. Brief

- **Material:** `source/README.md` (readme); `assets/captures/ui/app/` (images); `source/fonts/` (other)
- **Mood:** precise, mechanical, bright, metallic, confident
- **Purpose:** launch
- **Material:** the app is real (a toyz original, live at https://pulse.toyz.kr); the projects, to-dos and releases on screen are the app's own fictional sample data.

## 2. Style summary (read-only; from `style.json`)

- Theme light · bg `#E9EAEE` · ink `#0D0E11` · accent `#F05A28` · accent2 `#1A44C4` · accent3 `#0E9F6E`
- Display `"Pretendard Variable"` · body `"Pretendard Variable"`
- Motion: medium pace, `outC`, transitions cut, whip, impact
- Sound: bright-pop · 112 BPM · G major · pad, pulse, marimba, bass, bell, kick, clap, hats, shaker

## 3. Cuts

| Cut | Bars | Length |
|---|---|---|
| `short` | 7 | 15.0 s |
| `30` | 14 | 30.0 s |

One bar = 2.143 s at 112 BPM; every scene starts on a bar line in every cut.

## 4. Scenes

### 4.1 `hook`: Pulse

- Bars: short 1 · 30 s 2 (min 1, max 2) · in 3 beats, out 1 beats · entrance `cut` · music part `intro`
- Cues: charge @ start+0b, thud @ start+0.25b, tick x10 gap=0.03 @ start+0.5b, reveal @ start+1b, blips dur=1b @ holdBar+0b, swish @ outStart+0b

hook (1 bar, 2 in the 30): the panel powers on. The app's chrome X drops in from above spinning, lands with a thud and settles; its floor shadow tightens. On the left the name lands (Pulse, with the orange dot), the kicker above it and by 0.6 s the app's own one-liner below: 메이커를 위한 작고 선명한 대시보드. A ten-step level meter under the line sweeps up and then pulses on every beat, like a meter reading the music; a tick ruler runs along the foot.

### 4.2 `quick`: 한 줄로 적으면

- Bars: short 2 · 30 s 3 (min 2, max 3) · in 7 beats, out 1 beats · entrance `push` · music part `groove`
- Cues: keytap dur=2.5b @ start+0.5b, blip step=0 @ start+1.25b, blip step=2 @ start+1.75b, blip step=4 @ start+2.5b, blip step=6 @ start+3b, drawon dur=1b @ start+4b, enter @ start+5.5b, tick x4 gap=0.06 @ holdBar+0b, whip @ outStart+0b

quick (2 bars, 3 in the 30): one line in, four fields out. The app's real quick-add box, large. A line types itself in (로그인 버그 고치기 !높음 @Loopdeck 내일); as each token completes, the app's parser chip for it drops into the row below (제목 · 우선순위 높음 · Loopdeck · 마감 10/13 (화)) and an orange lead joins the token to its chip. Enter presses the orange 추가 button. The headline above: 한 줄로 적으면 / 알아서 나눠 담아요. Inside the box everything is the captured app at four typing stages (capture/app.json); the leads, the caret and the press are code.

### 4.3 `palette`: ⌘K

- Bars: short - · 30 s 2 (min 2, max 2) · in 6 beats, out 1 beats · entrance `whip` · music part `groove`
- Cues: click @ start+0.25b, click @ start+0.5b, swish @ start+0.75b, tick x6 gap=0.25b @ start+2b, whip @ outStart+0b

palette (2 bars, the 30 only): ⌘K. Two keycaps press on the left (⌘ then K) and the app's real command palette drops in on the right; an orange selection ring steps down its rows on the beat (대시보드, 프로젝트 목록, 전체 할 일, 배포 타임라인, 설정과 데이터, then the projects). The headline: ⌘K 하나로 / 어디든 바로. The palette is the capture.

### 4.4 `gauge`: 할 일과 배포가 계기판 하나에

- Bars: short 2 · 30 s 3 (min 2, max 3) · in 7 beats, out 1 beats · entrance `impact` · music part `drop`
- Cues: impact @ start+0b, thud x6 gap=0.25b @ start+0.5b, count dur=2b @ start+2b, swish x3 gap=0.5b @ start+3.5b, drawon dur=1.5b @ start+4b, pulse @ holdBar+0b, swell @ outStart+0b

gauge (2 bars, 3 in the 30; the drop): today's instrument panel. The headline lands first: 할 일과 배포가 / 계기판 하나에. Then the app's six real gauges (지난 마감 3, 오늘 마감 2, 이번 주 마감 7, 진행 중 3, 이번 주 완료 1, 배포·30일 9) snap into a row one per half beat, and three real panels rise under them: progress rings per project, the 12-week activity heatmap (revealed week by week) and the latest releases. A scan line sweeps the gauges on every bar of the hold and the overdue gauge's dot blinks in orange. Every gauge and panel is the captured app (sample data).

### 4.5 `releases`: 배포 메모

- Bars: short - · 30 s 2 (min 2, max 2) · in 6 beats, out 1 beats · entrance `whip` · music part `breakdown`
- Cues: swish x5 gap=0.25b @ start+0.5b, count dur=1b @ start+2.5b, confirm @ start+3.5b, swell @ outStart+0b

releases (2 bars, the 30 only): release notes that know the next version. The app's real release log panel rises on the left, its rows (v1.4.2 Moss Timer, v0.9.0 Kite Forms, v0.6.1 Loopdeck, the v1.4.1 rollback, v1.4.0) lit one by one; on the right an odometer rolls Moss Timer's last version v1.4.2 to the one the app suggests, v1.4.3 (the largest version's patch plus one, as the README says). Headline: 배포 메모는 / 다음 버전까지.

### 4.6 `end`: Pulse

- Bars: short 2 · 30 s 2 (min 2, max 2) · in 6 beats, out 0 beats · entrance `push` · music part `outro`
- Cues: sting @ start+0b, tick x10 gap=0.03 @ start+1.5b, chime @ start+3b

end (2 bars): the end card. The chrome X turns slowly at the top centre; the name with its orange dot below it, the app's one-liner, the address in a black pill and, at the foot, where it comes from (toyz original, Play Objects).

