# VELMORA 42: storyboard and build contract

Generated from the project files (reel.config.json, the cut plans, the scene headers and style.json); the scene
headers are the authority for the beat-by-beat choreography.

## 1. Brief

- **Material:** `source/README.md` (readme); `source/brand/BRAND.md` (brand-guide); `source/brand/tokens.css` (website); `source/app/race-card.html` (website); `source/data/bib-2417-splits.csv` (other); `source/fonts` (other)
- **Mood:** energetic, punchy, loud, exact, forward-leaning
- **Purpose:** launch
- **Fiction:** every name, figure and claim is invented for this example and labelled on screen.

## 2. Style summary (read-only; from `style.json`)

- Theme dark · bg `#0B0B0B` · ink `#F5F3EE` · accent `#FF5A1F` · accent2 `#F5F3EE` · accent3 `#C2410C`
- Display `"Barlow Condensed"` · body `"Barlow"`
- Motion: energetic pace, `outExpo`, transitions cut, match, whip
- Sound: dnb · 176 BPM · G minor · pad, stab, reese, kick, snare, hats

## 3. Cuts

| Cut | Bars | Length |
|---|---|---|
| `short` | 12 | 16.4 s |
| `30` | 22 | 30.0 s |

One bar = 1.364 s at 176 BPM; every scene starts on a bar line in every cut.

## 4. Scenes

### 4.1 `gun`: The gun

- Bars: short 2 · 30 s 2 (min 2, max 2) · in 7 beats, out 1 beats · entrance `cut` · music part `intro`
- Cues: beep @ start+0b, beep @ start+1b, beep @ start+2b, impact:big @ start+3b, swish @ start+3.5b

gun (hook, 2 bars in every cut): the start. Beats 0-2 count down 3, 2, 1: each numeral slams on its beat (timing beep) while the race stripes build one bar per beat (orange, white, orange: the brand mark). Beat 3 is the gun: a white muzzle flash and a shake, the stripes launch forward (left to right), the race clock slams in at 0:00:00.0 and runs in real time from the gun; speed lines start streaming. The last beat is the first half of the stripe stinger (race stripes, then a Track Black field) that the splits scene finishes after the cut.

### 4.2 `splits`: Every kilometre

- Bars: short 3 · 30 s 8 (min 3, max 8) · in 8 beats, out 1 beats · entrance `cut` · music part `groove`
- Cues: whoosh @ start+0b, slam @ start+1b, slam @ start+2b, swish @ start+2.5b, slam @ start+4b, beep @ start+4b, beep @ start+5b, beep @ start+6b, beep @ start+7b, beep @ holdBeat+0b

splits (the product; 3 bars in the short cut, 8 in the 30): "EVERY KILOMETRE. LIVE." The stripe stinger from the gun finishes under a Track Black stage, the headline slams on beats 1 and 2, the phone with the app's live race card (drawn after source/app/race-card.html, same tokens) enters from the right, and from beat 4 one mat lands per beat: BIB 2417's real split for that kilometre (source/data/bib-2417-splits.csv, DEMO DATA) rolls into the giant KM, the elapsed clock and the vs-plan plate, slides into the phone's split list and moves the course bar forward, with a timing beep (cue: holdBeat, every beat). The hold is the race going on, one kilometre per beat: the short cut reaches KM 7, the 30 reaches KM 27, where the plate has passed KM 21 "ON PLAN" and turned orange (ahead); the plate punches on its beat whenever its meaning changes. The last beat is the first half of the next stinger: race stripes, then a Signal Orange field.

### 4.3 `slam`: Race day in numbers

- Bars: short 3 · 30 s 7 (min 3, max 7) · in 8 beats, out 1 beats · entrance `cut` · music part `drop`
- Cues: whoosh @ start+0b, slam big @ start+0b, slam @ start+1b, slam big @ start+2b, impact:big @ start+4b, slam big @ holdBar+0b

slam (the drop; 3 bars in the short cut, 7 in the 30): RACE DAY IN NUMBERS on the Signal field, the brand's loudest frame ("use it for the one number that matters"). The splits stinger ends on this orange, its trailing stripes run out under the type. The README's own sum lands one number per beat: 31,500 RUNNERS (beat 0) x 42 TIMING MATS (beats 1-2); on the bar line (beat 4) the sum moves up and 1,323,000 LIVE SPLITS slams in (the poster frame). Every number is black on orange (6.3:1), lands with a quarter-second shake and never fades. The hold brings one more figure of the README table per bar line: < 2 S MAT TO PHONE (both cuts), then in the 30-s cut 42.195 KM DISTANCE, 9 BRIDGES, 6:30:00 CUT-OFF and 1,323,000 again for the last bar; each new figure knocks the last one out to the left.

### 4.4 `finish`: VELMORA 42

- Bars: short 4 · 30 s 5 (min 3, max 5) · in 8 beats, out 0 beats · entrance `cut` · music part `outro`
- Cues: impact:big @ start+0b, swish @ start+1b, drawon dur=2 @ start+1.5b, whoosh @ start+4b, sting @ start+4b, hit @ start+5b, hit soft @ start+5.5b, hit @ start+6b, hit soft @ start+6.5b, slam @ start+7b, whoosh @ holdBar+0.5b

finish (end card; 3 bars in the short cut, 5 in the 30): a hard cut from the Signal field back to Track Black on the final downbeat. The finish card of the app (source/app/race-card.html, screen 2) lands as broadcast type: 3:12:58 slams (beat 0), NEGATIVE SPLIT −2:02 plates in (beat 1), and BIB 2417's 42 splits draw on as bars (beats 1.5-3.5; height = pace per km from the CSV, the orange line = the 4:37 plan; the nine bridges are the tall bars). On the bar line (beat 4) the result leaves to the left and the logo lands: three race stripes in front of VELMORA 42 ("42" in Signal Orange), then the README's lead line one sentence per half beat, the subtitle, and the opening date (beat 7). On every bar line of the hold a second set of race stripes runs through the lockup. Speed lines slow down after the finish but never stop.

