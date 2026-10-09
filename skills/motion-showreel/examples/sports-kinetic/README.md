# Example: sports-kinetic (VELMORA 42)

A race-timing app's README, brand guide and design tokens go in; a fast broadcast-graphics reel comes out: a countdown and the gun, real splits per kilometre, the one big number, the finish card. Nothing here picks a preset: palette, type, motion and music were derived from `source/` and written to `style.json` with the reasoning for every decision.

- Demo (short cut, with its music): [`assets/demo-sports-kinetic-v1.0.0.mp4`](../../../../assets/demo-sports-kinetic-v1.0.0.mp4)
- Web version with every cut: [`dist/velmora-42-v1.0.0.html`](dist/velmora-42-v1.0.0.html) ([play in the browser](https://raw.githack.com/AwesomeZun/Awesome-Showreels/main/skills/motion-showreel/examples/sports-kinetic/dist/velmora-42-v1.0.0.html))
- Cuts: `short` (12 bars = 16.4 s), `30` (22 bars = 30.0 s), all at 176 BPM.

> VELMORA 42 is fictional. Every name, number and screen is demo content made for this example.

## Folder

```
sports-kinetic/
  source/                 14 file(s)
    README.md
    app/race-card.html
    brand/BRAND.md
    brand/tokens.css
    data/bib-2417-splits.csv
    fonts/Barlow-Medium.ttf
    fonts/Barlow-SemiBold.ttf
    fonts/Barlow-SemiBoldItalic.ttf
    ... 6 more
  assets/                 1 file(s)
    data/bib-2417-splits.csv
  modules/                1 file(s)
    v42-kit.js
  scenes/                 4 file(s)
    finish.js
    gun.js
    slam.js
    splits.js
  style.json
  style-extract.md
  reel.config.json
  STORYBOARD.md
  dist/
```

## Run it

```bash
S=skills/motion-showreel; P=$S/examples/sports-kinetic
python3 $S/tools/extract_style.py --source $P/source --project $P --board      # draft style (review by hand)
python3 $S/timing/plan_cut.py --project $P --cut short,30
for c in short 30; do python3 $S/audio/arrange.py --project $P --cut $c; done
python3 $S/audio/verify_sync.py --wav $P/build/music-short.wav --cut $P/build/cut-short.json
node $S/runtime/render.mjs --project $P --cut short --out out/sports-kinetic-short.mp4
node $S/runtime/build.mjs --project $P --cuts short,30 --out out/velmora-42.html
```

## What the tone pass decided

- **palette.** Dark theme, every role authored: BRAND.md names the roles in prose ('Primary colour: Signal Orange #FF5A1F', 'Background: Track Black #0B0B0B. The stage, always.', 'Text: Bib White #F5F3EE') [E3, E4, E5], tokens.css repeats them as --color-bg/--color-text/--color-primary with color-scheme: dark [E17] and the race card sets theme-color #0B0B0B [E14]. The draft chose light only because the race card rendered unstyled in the snapshot (white page, Times) [E35, E36]: that render is renderer default, not material, and is dropped from the swatches. bg #0B0B0B is kept as authored (flat fields, no gradients, so no banding to fear); surface Asphalt #1A1A1A [E6]; line Lane Grey #3A3936 [E7]; muted Kerb Grey #8F8B84 'labels, meta, disclaimers' [E8] at 5.81:1; ink2 #BDB9B1 is derived (Bib White 55 % toward Kerb Grey, 10.1:1) for sublines, so sublines and meta stay two steps apart. The brand carries exactly one chromatic colour ('Three colours carry the brand'), so accent2 is Bib White (the white stripe between two orange ones) and accent3 is Signal Deep #C2410C [E9], used on screen only as the shade of orange plates and stripes on a Signal Orange field, never as text (its print rule is about orange text on white paper). The draft's accent2 #2FBF71 and accent3 #FFB800 were the app-only status colours [E10, E11]; BRAND.md forbids them in brand art, so they stay ok/warn/deny only. ok/deny are never used to mean ahead/behind: ahead = Signal Orange with a minus sign, behind = Bib White with a plus sign (BRAND.md 'Colour'; tokens --color-ahead/--color-behind), kept as palette extras ahead/behind. onAccent Track Black (--color-on-primary) at 6.31:1 on orange: the loud 'Signal field' (a full orange frame with black type) uses accent + onAccent. Contrast on bg: ink 17.75:1, ink2 10.1:1, muted 5.81:1, accent 6.31:1. Bib White on Signal Orange is only 2.81:1, so type on the Signal field is always Track Black. No paletteAlt: 'Bib White fields are for print, never on screen'.

- **type.** Barlow Condensed for display and numbers, Barlow for body (tokens --font-display/--font-body [E15, E16], @font-face [E18-E25], OFL files [E26-E33]). BRAND.md: 'Numbers and display: Barlow Condensed Black Italic, uppercase, tracking -1 %. Big. Then bigger.', so displayWeight 900 (draft 700) and tracking -0.01 em; labels Barlow Condensed SemiBold +12 % (trackingLabel 0.12); body Barlow Medium 500. Scenes request the italic with a weight string ('italic 900'). The draft's scale topped out at 134 px; 'Big. Then bigger.' asks for slam sizes, so the scale runs 16-480 px (ratio about 1.4). fonts.files lists each face with its real style (the draft registered the three italic files as upright, which would have collided with the upright 600/700 faces). mono points at Barlow Condensed: the material has no monospace face; its numbers are tabular Barlow Condensed (.num, 'A running clock never changes width'), which the reel reproduces with a fixed-advance digit helper (modules/v42-kit.js) because canvas cannot switch on tnum. The draft's JetBrains Mono came from no source and is not shipped.

- **motion.** Energetic, not the draft's medium: the draft's energy 0.48 counted '!' and emoji (0/1k) as calm, but BRAND.md bans exclamation marks on purpose ('The numbers are loud enough'); the loudness is in 193 numbers/1k, 11 % capitals, 8.3-word sentences and the motion rules [E1, E2]. BRAND.md 'Motion': 'A number never fades in. It lands. When it lands, the frame shakes once, for a quarter of a second.' and 'No dissolves, no soft blur-ins, no bounce' -> a fast, heavily damped spring (f 4.2, z 0.86), overshoot 0.3, outExpo, no blur on entrances, a 0.25 s frame shake through env.fx on every landing. 'Hard cuts, whip pans and stripe wipes' -> transitions cut, match (the stripe wipe is drawn identically on both sides of a cut), whip; the draft's zoomInto (no device window to fly into) and impact (the compositor's impact adds a chromatic split, a digital look the brand never shows) were dropped. 'Everything leans forward 12 degrees' and 'what is ahead enters from the right, what is behind leaves to the left' set the direction of every move.

- **sound.** BRAND.md 'Sound': 'drum & bass at 172 to 176 BPM: breakbeats under the splits, a half-time drop for the big numbers, the start horn, and a timing beep at every mat'; tokens --beat 341ms = 176 BPM. bpm 176 (draft 109): inside the brand's range, and 11 bars = 15.0 s, 22 bars = 30.0 s exactly. None of the six presets is a breakbeat kit (the draft's corporate scored 0.60 on warmth from the orange hue and light theme): preset dark-synth is a placeholder for its saw bass, stabs and full kit until a drum & bass preset exists; sound.intent records the genre, groove and the race SFX for the audio pass. Key G (orange in the hue map), minor; drums full; SFX digital (timing-chip beeps); energy high from the intro on.

- **narration.** Not recommended, as the draft said: a launch teaser with sparse slogan copy, cut for muted autoplay, and the 15-s cut is music-led by rule. If a voice is ever wanted, BRAND.md's 'Talk like the finish-line announcer: loud, exact, never cute' points to Fenrir [fast, energetic] (the draft's Schedar [clear, upbeat] is the even corporate voice), en-GB (kilometre, colour).

- **visuals.** No mascot, photo or capture asked for (characters false). The proof is the data: the 42 splits of BIB 2417 from source/data/bib-2417-splits.csv (ticker, finish-card bars), the race-day numbers from README.md (31,500 x 42 = 1,323,000) and the app's race card, redrawn in vector from source/app/race-card.html with the same tokens. Brand devices from BRAND.md are the vector carriers: race stripes (orange, white, orange, leaning 12 degrees), speed lines (Bib White, 2-6 px, right to left), number plates (parallelograms, radius 0), the Signal field. dataViz true; visualSources vector only (the draft's web-shots and app-ui would show the README page and a static capture; the race card is drawn so its clock can run).

## Same BPM, more bars

The 30-second cut is the same reel with longer holds (and optional scenes where they exist); the tempo never changes.

| Scene | short | 30 s |
|---|---|---|
| `gun` | 2 | 2 |
| `splits` | 3 | 8 |
| `slam` | 3 | 7 |
| `finish` | 4 | 5 |

## Scenes

**`gun`**: gun (hook, 2 bars in every cut): the start. Beats 0-2 count down 3, 2, 1: each numeral slams on its beat (timing beep) while the race stripes build one bar per beat (orange, white, orange: the brand mark). Beat 3 is the gun: a white muzzle flash and a shake, the stripes launch forward (left to right), the race clock slams in at 0:00:00.0 and runs in real time from the gun; speed lines start streaming. The last beat is the first half of the stripe stinger (race stripes, then a Track Black field) that the splits scene finishes after the cut.

**`splits`**: splits (the product; 3 bars in the short cut, 8 in the 30): "EVERY KILOMETRE. LIVE." The stripe stinger from the gun finishes under a Track Black stage, the headline slams on beats 1 and 2, the phone with the app's live race card (drawn after source/app/race-card.html, same tokens) enters from the right, and from beat 4 one mat lands per beat: BIB 2417's real split for that kilometre (source/data/bib-2417-splits.csv, DEMO DATA) rolls into the giant KM, the elapsed clock and the vs-plan plate, slides into the phone's split list and moves the course bar forward, with a timing beep (cue: holdBeat, every beat). The hold is the race going on, one kilometre per beat: the short cut reaches KM 7, the 30 reaches KM 27, where the plate has passed KM 21 "ON PLAN" and turned orange (ahead); the plate punches on its beat whenever its meaning changes. The last beat is the first half of the next stinger: race stripes, then a Signal Orange field.

**`slam`**: slam (the drop; 3 bars in the short cut, 7 in the 30): RACE DAY IN NUMBERS on the Signal field, the brand's loudest frame ("use it for the one number that matters"). The splits stinger ends on this orange, its trailing stripes run out under the type. The README's own sum lands one number per beat: 31,500 RUNNERS (beat 0) x 42 TIMING MATS (beats 1-2); on the bar line (beat 4) the sum moves up and 1,323,000 LIVE SPLITS slams in (the poster frame). Every number is black on orange (6.3:1), lands with a quarter-second shake and never fades. The hold brings one more figure of the README table per bar line: < 2 S MAT TO PHONE (both cuts), then in the 30-s cut 42.195 KM DISTANCE, 9 BRIDGES, 6:30:00 CUT-OFF and 1,323,000 again for the last bar; each new figure knocks the last one out to the left.

**`finish`**: finish (end card; 3 bars in the short cut, 5 in the 30): a hard cut from the Signal field back to Track Black on the final downbeat. The finish card of the app (source/app/race-card.html, screen 2) lands as broadcast type: 3:12:58 slams (beat 0), NEGATIVE SPLIT −2:02 plates in (beat 1), and BIB 2417's 42 splits draw on as bars (beats 1.5-3.5; height = pace per km from the CSV, the orange line = the 4:37 plan; the nine bridges are the tall bars). On the bar line (beat 4) the result leaves to the left and the logo lands: three race stripes in front of VELMORA 42 ("42" in Signal Orange), then the README's lead line one sentence per half beat, the subtitle, and the opening date (beat 7). On every bar line of the hold a second set of race stripes runs through the lockup. Speed lines slow down after the finish but never stop.

## Provenance and credits

- The material in `source/` was written for this example; the project is fictional and the reel says so on screen.
- Music and sound effects are synthesized by `audio/` (no samples).
- Fonts ship with their licences: `source/fonts/OFL.txt`.
