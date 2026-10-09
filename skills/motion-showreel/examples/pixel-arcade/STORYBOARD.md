# ONE CREDIT JAM storyboard and build contract

Timing lives in `reel.config.json`; this file holds the words and the choreography. Violations of "Copy rules" are
bugs. Guide: `../../references/storyboard.md`.

## 1. Brief

- **One sentence:** ONE CREDIT JAM #07 is a 72-hour game jam with five rules that fit on one screen: make a tiny
  arcade game a stranger can finish on one credit.
- **One scene:** the GOLD token drops into the coin slot and the ONE CREDIT / JAM lockup slams onto the attract
  screen (poster frame: both cuts, t = 2.6 s; `reel.config.json` `"poster": 2.6`).
- **One message:** "INSERT COIN. MAKE A GAME. 72 HOURS." (the README's tagline; the end card shows the start date and
  INSERT COIN).
- **Audience / purpose / venue:** game makers and players / jam launch teaser / the jam page's attract screen and
  social feeds (often muted first: every idea is on screen as type).
- **Languages:** en (British spelling: "colours"). No CJK copy.
- **Source material** (`source/`, written for this example; the jam and the Phosphor Club are fictional):
  - `README.md`: the jam README (tagline, dates, the five rules, how it works, WORDS WE USE, credits, disclaimer).
  - `palette/credit16.{hex,gpl,pal,png}`: the CREDIT-16 palette in index order.
  - `site/index.html`, `site/style.css`, `site/site.webmanifest`: the jam page (indexed colour tokens, pixel faces,
    scanline overlay, `steps()` blink, the 1UP / HI-SCORE / 2UP row).
  - `jam-kit/SOUND.md`: four chip channels, 60-Hz tick, 144 BPM, the attract tune INSERT COIN in D mixolydian.
  - `media/attract.png`, `logo.png`, `level.png`: the jam's own pixel mock-ups (320 x 180, CREDIT-16 only).
  - `fonts/`: Press Start 2P and Silkscreen with their OFL.txt.

## 2. Copy rules (violations are bugs)

### 2.1 Exact strings

| id | String (verbatim) | Scene | Role | Source |
|---|---|---|---|---|
| c1 | `1UP` `HI-SCORE` `072016` `2UP` | attract, hiscore end card | HUD row | site HUD row |
| c2 | `INSERT COIN` | attract, hiscore end card | blinking prompt | README tagline, site |
| c3 | `ONE CREDIT` / `JAM` | attract, hiscore end card | logo lockup | media/logo.png |
| c4 | `PRESS START` | attract | prompt | site attract screen |
| c5 | `CREDIT 00` -> `CREDIT 01`, `PHOSPHOR CLUB` | attract | footer | site footer, README credits |
| c6 | `THE RULES`, `READ THEM, PLAYER 1`, `JAM #07` | rules | header | README "THE RULES" |
| c7 | `72 HOURS` `16 COLOURS` `4 CHANNELS` `1 CREDIT` | rules | four slot reels | README rules 1, 2, 4, 5 |
| c8 | `RULE 3: 320 × 180 · SQUARE PIXELS · NO SMOOTHING` | rules | ticker | README rule 3 |
| c9 | `FRI 18:00 → MON 18:00 UTC`, `CREDIT-16 ONLY.` `DITHER YOUR GRADIENTS.`, `2 PULSE · TRIANGLE · NOISE`, `NO SAVES.` `NO CONTINUES.` | rules (hold, 30 only) | rule details, one per bar | README rules, site small print |
| c10 | `SCORE` `HOUR` `CREDIT-16` `16/16 COLOURS!` `+1000` `+100` `HURRY UP!` `YOUR GAME HERE` | play | game HUD and pops | media/level.png mock-up |
| c11 | `HIGH SCORES`, `RANK` `NAME` `SCORE`, `ZIP` `MOX` `KAI` `YOU`, `NEW!`, `ENTER YOUR INITIALS` | hiscore | table | README "Every entry gets its own HIGH SCORE table" |
| c12 | `ENTRIES CLOSE MON 16 NOV 18:00 UTC`, `PLAYING WEEK: MON 16 → MON 23 NOV`, `TOP 3 GET THE GOLDEN TOKEN` | hiscore (hold, 30 only) | ticker, one per bar | README dates table and HALL OF FAME |
| c13 | `FRI 13 NOV · 18:00 UTC` | hiscore end card | start date | README dates table |
| c14 | `PHOSPHOR CLUB · FICTIONAL` | hiscore end card | disclaimer | README closing note |

ALL CAPS everywhere, as the README and jam page set it. The initials ZIP, MOX and KAI are invented players.

### 2.2 Banned wording

From README "WORDS WE USE": `users`, `submissions`, `content`, `Credit16`, `credit 16`, `retro-inspired`,
`pixel-perfect`, `AAA` (the YOU row's spinning initials never stop on AAA: they lock on `YOU`), `you lose`.

### 2.3 Provenance

| On screen | Source |
|---|---|
| Every colour | CREDIT-16 only: `OCJ.finish()` snaps each frame of the 320 x 180 canvas to the 16 colours before the CRT |
| The token hero, bug, gems, cabinet | drawn in code (`modules/px-sprites.js`) after `media/level.png` |
| Dates, rules, channel names | README and `jam-kit/SOUND.md` |
| Scores | invented demo values (the jam is fictional) |

## 3. Style summary (read-only; from `style.json`)

- **Theme / mood:** dark (VOID), arcade, chunky, punchy, cheeky, electric.
- **Palette:** the 16 CREDIT-16 colours (style.json `pixel.palette`); roles bg VOID `#0B0A16`, ink BONE `#FFF6E3`,
  accent GOLD `#FFD93D`, accent2 CHERRY `#F0263E`, accent3 SKY `#62C3FF`.
- **Type:** Press Start 2P (titles, HUD, numbers) and Silkscreen (small print), whole-number multiples of the 8-px
  cell; big words get the logo's banded ramp and a stepped extrusion.
- **Motion:** 12-fps stepped sprites on the 60-fps timeline (5 steps a beat at 144 BPM), whole-pixel moves, gravity
  arcs and hard landings, whole-pixel screen shake with the HUD fixed. Display effects (CRT power on/off, scanlines,
  curvature, bloom) run at 60 fps.
- **Transitions:** hard cuts that the scenes paint themselves: palette walk to white (attract -> rules), mosaic
  32 px (rules -> play), stepped whole-number zoom into the cabinet screen (play -> hiscore), blinds then CRT
  power-off (end).
- **Sound (stage 2):** 144 BPM, D (mixolydian), chip channels (2 pulse, triangle, noise).
- **Narration:** none.

## 4. Files and contract

- `modules/px-core.js` (global `OCJ`): 320 x 180 canvas, palette snap, step clock, pixel text, logo ramps, HUD row,
  stars, particles, raster bars. `modules/px-sprites.js`: token, coin, gems, bug, icons, cabinet. `modules/px-crt.js`:
  the WebGL CRT (`OCJ.present`, `powerOn`, `powerOff`).
- `scenes/<id>.js`: pure in `env.lt`; every scene draws a full frame on the console canvas and ends with
  `OCJ.present`.

## 5. Cuts

144 BPM, bar = 1.667 s (100 frames), beat = 0.417 s (5 steps).

| Scene | min | max | in/out beats | music | short (9 bars, 15 s) | 30 (18 bars, 30 s) |
|---|---|---|---|---|---|---|
| attract | 2 | 2 | 7 / 1 | intro | 2 · 0-3.33 s | 2 · 0-3.33 s |
| rules | 2 | 6 | 6 / 1 | drop | 2 · 3.33-6.67 s | 6 · 3.33-13.33 s |
| play | 3 | 6 | 8 / 4 | groove | 3 · 6.67-11.67 s | 6 · 13.33-23.33 s |
| hiscore | 2 | 4 | 5 / 3 | outro | 2 · 11.67-15 s | 4 · 23.33-30 s |

## 6. Scenes (beats from the scene start)

### 6.1 `attract`: INSERT COIN
0 CRT powers on into a starfield under the HUD row; the token drops, lands on 1 and spins over a blinking INSERT COIN;
2 it falls into the coin slot, CLINK on 3, CREDIT 00 -> 01; 4 the lockup slams (whole-pixel shake, dust); 5 PRESS
START blinks; 6 a shine crosses the logo; 7 START is pressed and the palette walks up to BONE.

### 6.2 `rules`: THE RULES
Opens from white. Four slot reels spin from 0 and lock one per beat: 72 HOURS (1), 16 COLOURS (2), 4 CHANNELS (3),
1 CREDIT (4, the biggest hit). 5 rule 3 types into the ticker. Hold (30): each bar line lights the next reel and types
its small print. Last beat: mosaic up to 32-px blocks.

### 6.3 `play`: PLAYER 1
Mosaic in onto a dusk street from `level.png`; the token runs right. 2 it jumps through the 16 gems, a column a step,
the CREDIT-16 meter fills; 4 "16/16 COLOURS! +1000"; 5-6 a bug crawls in and gets stomped (+100, shake). Hold (30):
a coin row, then a stomp per bar; the HOUR clock stops at 71 with HURRY UP!. Out (4 beats): the cabinet rolls in
(YOUR GAME HERE), the token flips into its slot on 2, the screen wakes with raster bars and the camera zooms x1 .. x10
in whole steps into them.

### 6.4 `hiscore`: HIGH SCORES and end card
Opens inside the raster bars. 0-1 the bars squeeze into a band; HIGH SCORES slams on 1. Rows 1ST, 2ND, 3RD drop on 2,
2.5, 3; 3.5 the YOU row's initials spin; 4 they lock on YOU, the score counts up, NEW! and coin pops. Hold (30): each
bar lights a row and types a date line. Out (3 beats): blinds close the table on beat 0, the lockup slams on 1 with
FRI 13 NOV · 18:00 UTC typing in and INSERT COIN blinking; the CRT powers off over the last 0.34 s.
