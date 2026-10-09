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
- Display `"Pixelify Sans"` · body `"DotGothic16"`
- Motion: energetic pace, `lin`, transitions cut
- Sound: cinematic-lite · 120 BPM · D minor · strings, lead, sub, toms, kick, snare, hats

## 3. Cuts

| Cut | Bars | Length |
|---|---|---|
| `short` | 9 | 18.0 s |
| `30` | 15 | 30.0 s |

One bar = 2.000 s at 120 BPM; every scene starts on a bar line in every cut.

## 4. Scenes

### 4.1 `ignite`: A lantern in the dark

- Bars: short 2 · 30 s 3 (min 2, max 3) · in 7 beats, out 1 beats · entrance `cut` · music part `intro`
- Cues: click @ start+0.5b, swell @ start+0.6b, pop soft @ start+1.5b, pop soft @ start+2b, sparkle dur=1 @ start+3b, stamp @ start+4.5b, tick:10 gap=0.05s soft @ start+5.5b

ignite (2 bars, 3 in the 30): a lantern in the dark. Black; on beat 0.5 a spark, and the hero's lantern catches: its light grows with a flicker and reveals a stone corridor (the light map multiplies the pixels, so only what the lantern reaches has colour). On 1.5 and 2 the two wall sconces catch from it, one each side (dynamic lights), dust turns in the light, near pillars sit blurred in the foreground. From beat 3 LANTERNFORGE is burned in left to right in gold with sparks at the burning edge; 2.0 stamps on 4.5; the line types on 5.5. The camera pushes in all the while. Out: the lantern flares until the frame is warm white (the next scene opens from it).

### 4.2 `town`: Every window lights

- Bars: short 2 · 30 s 3 (min 2, max 3) · in 6 beats, out 1 beats · entrance `cut` · music part `groove`
- Cues: whoosh up @ start+0b, sparkle dur=4 soft @ start+1b, notify @ start+4.5b, tick:12 gap=0.05s soft @ start+5b

town (2 bars, 3 in the 30): every window lights. Opens on the warm white the lantern flared into, which fades to a town at dusk. The camera rises from the foreground rooftops (blurred, near, fast) up past the houses (sharp) to the sky (soft, far): three depths. From beat 1 the windows light, house by house from left to right, each lighting the wall around it (light map) and blooming; chimneys smoke in stepped puffs, fireflies drift over the roofs. On 4.5 the window opens with the feature: DYNAMIC LIGHTS. Out: clouds rush up past the camera.

### 4.3 `flight`: Mode-7 world map

- Bars: short 1 · 30 s 2 (min 1, max 2) · in 2 beats, out 1 beats · entrance `cut` · music part `groove`
- Cues: whoosh @ start+0b, blip step=3 @ start+1b

flight (1 bar, 2 in the 30): the Mode-7 world map. Opens from the clouds' white; the overworld (256 x 256 art pixels) is projected scanline by scanline at art resolution and shown at 5x, turning and gliding under a sunset sky; the airship rides on the left with its shadow on the ground and a little engine smoke; near clouds sweep past in front (blurred), far clouds behind. A window names the feature. Out: the battle transition takes over.

### 4.4 `battle`: The boss is a bug

- Bars: short 2 · 30 s 4 (min 2, max 4) · in 7 beats, out 1 beats · entrance `cut` · music part `drop`
- Cues: glitch @ start+0b, confirm @ start+1.5b, hit @ start+2.5b, charge @ start+4b, impact @ start+4.6b, slam big @ start+6b, shatter @ start+6.5b

battle (2 bars, up to 4 in the 30): the boss is a bug. The world map shatters into blocks that spin away (the classic battle transition) to a moonlit clearing: the brass beetle on the left breathing a pixel at a time with its runes pulsing violet, the party on the right. The command window picks HOT RELOAD (1.5): the hero dashes in, a gold slash, the boss flashes and shakes, 1,200 (2.5). The mage charges 3X FASTER (4) and the orb bursts in bloom, 2,700 (4.6). On 6 the whole party's 0.9 MS lands and on 6.5 the beetle breaks into its own pixels, flung out and fading. In the 30-s cut CLOUD SAVES heals the party (+57 GAMES) before the finish.

### 4.5 `finale`: Victory

- Bars: short 2 · 30 s 3 (min 2, max 3) · in 5 beats, out 0 beats · entrance `cut` · music part `outro`
- Cues: sting @ start+0b, stamp @ start+1.5b, chime @ start+3b

finale (2 bars, 3 in the 30; the end card): victory. Rays of light turn slowly behind the logo; the party jumps on the downbeats (beats 0-2) in the clearing; LANTERNFORGE burns in gold with its 2.0 badge (1.5), the line and the facts type on (2-3): OPEN SOURCE · MIT, and the fictional-project note. Hold: fireflies, a lantern glow that breathes on the beat, the party keeps bobbing.

