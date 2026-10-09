# Lanternforge 2.0: storyboard and build contract

Generated from the project files (reel.config.json, the cut plans, the scene headers and style.json); the scene
headers are the authority for the beat-by-beat choreography.

## 1. Brief

- **Material:** `source/RELEASE.md` (markdown); `source/palette.txt` (brand-guide); `source/fonts` (other)
- **Mood:** heroic, warm, nostalgic, playful, dramatic
- **Purpose:** launch
- **Fiction:** every name, figure and claim is invented for this example and labelled on screen.

## 2. Style summary (read-only; from `style.json`)

- Theme dark · bg `#0D0B1E` · ink `#FFFFFF` · accent `#F2B33D` · accent2 `#4A86E8` · accent3 `#5DB547`
- Display `"DotGothic16"` · body `"DotGothic16"`
- Motion: energetic pace, `lin`, transitions cut
- Sound: cinematic-lite · 120 BPM · D minor · strings, lead, sub, toms, kick, snare, hats

## 3. Cuts

| Cut | Bars | Length |
|---|---|---|
| `short` | 8 | 16.0 s |
| `30` | 15 | 30.0 s |

One bar = 2.000 s at 120 BPM; every scene starts on a bar line in every cut.

## 4. Scenes

### 4.1 `title`: Title screen

- Bars: short 2 · 30 s 3 (min 2, max 3) · in 6 beats, out 1 beats · entrance `cut` · music part `intro`
- Cues: whoosh @ start+0b, impact @ start+3b, stamp @ start+4b

title (2 bars, 3 in the 30): the title screen. A Mode-7 overworld rotates and tilts under a stepped dusk sky (beats 0-3, the camera sweeping in); on beat 3 LANTERNFORGE slams down letter by letter with a gold outline; 2.0 stamps beside it on beat 4; the subline types and PRESS START blinks from beat 5. 30-s hold: the world keeps turning, a lantern glow pulses on each beat behind the logo.

### 4.2 `town`: The town

- Bars: short 2 · 30 s 3 (min 2, max 3) · in 5 beats, out 1 beats · entrance `cut` · music part `groove`
- Cues: swish @ start+0b, keytap dur=2 soft @ start+2b

town (2 bars, 3 in the 30): a town square in three-quarter view (cobbles, roofs, a fountain, lanterns that flicker). The hero walks in from the left in two-frame steps and stops by the innkeeper; on beat 2 the dialog window opens (a stepped grow) with the innkeeper's portrait and the release news types on, a page per two beats, the blinking arrow waiting for the button. 30-s hold: the second page, a lantern lighting up with the new dynamic lights.

### 4.3 `battle`: Battle

- Bars: short 2 · 30 s 5 (min 2, max 5) · in 7 beats, out 1 beats · entrance `cut` · music part `drop`
- Cues: glitch @ start+0b, confirm @ start+2b, hit @ start+3b, hit @ start+5b, shatter @ start+6.5b

battle (2 bars, up to 4 in the 30): the engine's features are the attacks. A screen-tear transition (beat 0) into a side-view battle: a giant BUG boss on the left, the party of three on the right over a battle backdrop. The command window's cursor picks HOT RELOAD (beat 2), the hero dashes, the boss flashes and 1,200 rises on beat 3; the mage casts 3x FASTER (beat 5) for 2,700; on beat 6.5 the boss breaks into pixels. 30-s hold: the knight's CLOUD SAVES heals the party (+57 games) and the enemy HP bar is shown empty.

### 4.4 `victory`: Victory

- Bars: short 2 · 30 s 4 (min 2, max 4) · in 5 beats, out 0 beats · entrance `cut` · music part `outro`
- Cues: sting @ start+0b, blips @ start+2b, chime @ start+4b

victory (2 bars, 3 in the 30; the end card): the fanfare. The party raises its weapons in turn (beats 0-1) under VICTORY!; the spoils window types the release's numbers as experience (148 CONTRIBUTORS, 57 GAMES SHIPPED, 0.9 MS A FRAME) on beat 2, LEVEL UP: 2.0 flashes on beat 3; the end card on beat 4: the logo, the line, MIT and the fictional-project note. Hold: sparkles orbit the logo, the party bobs.

