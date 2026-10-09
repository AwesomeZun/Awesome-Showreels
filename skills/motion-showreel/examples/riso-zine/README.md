# Example: riso-zine (PAPER JAM #07)

A zine's README, house style and flyer go in; a loud, hand-made reel comes out: two riso drums printing off register, stamps, a mixtape and the release-show poster. Nothing here picks a preset: palette, type, motion and music were derived from `source/` and written to `style.json` with the reasoning for every decision.

- Demo (short cut, with its music): [`assets/demo-riso-zine-v1.0.0.mp4`](../../../../assets/demo-riso-zine-v1.0.0.mp4)
- Web version with every cut: [`dist/paper-jam-07-v1.0.0.html`](dist/paper-jam-07-v1.0.0.html) ([play in the browser](https://raw.githack.com/AwesomeZun/Awesome-Showreels/main/skills/motion-showreel/examples/riso-zine/dist/paper-jam-07-v1.0.0.html))
- Cuts: `short` (10 bars = 15.0 s), `30` (20 bars = 30.0 s), all at 160 BPM.

> PAPER JAM #07 is fictional. Every name, number and screen is demo content made for this example.

## Folder

```
riso-zine/
  source/                 15 file(s)
    README.md
    flyer.html
    fonts/AlfaSlabOne-Regular.ttf
    fonts/Anton-Regular.ttf
    fonts/CourierPrime-Bold.ttf
    fonts/CourierPrime-Regular.ttf
    fonts/CoveredByYourGrace.ttf
    fonts/OFL-AlfaSlabOne.txt
    ... 7 more
  modules/                1 file(s)
    riso-press.js
  scenes/                 4 file(s)
    cover.js
    inside.js
    show.js
    tape.js
  style.json
  style-extract.md
  reel.config.json
  STORYBOARD.md
  dist/
```

## Run it

```bash
S=skills/motion-showreel; P=$S/examples/riso-zine
python3 $S/tools/extract_style.py --source $P/source --project $P --board      # draft style (review by hand)
python3 $S/timing/plan_cut.py --project $P --cut short,30
for c in short 30; do python3 $S/audio/arrange.py --project $P --cut $c; done
python3 $S/audio/verify_sync.py --wav $P/build/music-short.wav --cut $P/build/cut-short.json
node $S/runtime/render.mjs --project $P --cut short --out out/riso-zine-short.mp4
node $S/runtime/build.mjs --project $P --cuts short,30 --out out/paper-jam-07.html
```

## What the tone pass decided

- **palette.** Light theme on newsprint: bg #F2EDE3 is the paper in every source (--paper and <meta theme-color> [E17, E12], body background [E23], README and house style [E5, E10]). The material allows exactly two inks, so the roles are built from the print model, not picked: accent #FF48B0 is drum 1 fluoro pink (--pink [E17], README and house style [E2, E7]), accent2 #3D5588 is drum 2 federal blue (--blue [E17, E3, E8]) and accent3 #3A1654 is their overprint (--overprint [E17, E4, E9]; the flyer render measures #3D195E where blue multiplies the pink flood [E43]). Text is blue as the material says ('words you have to read', --text [E17, E24]): ink #394E78 is federal blue multiplied on the paper (#3A4F79, 6.99:1) taken a hair darker to clear 7:1 (7.1:1; the draft's #364E81 was the same idea), ink2 #536384 is that blue as the phone scan reads it through the mottled ink (measured [E40], 5.2:1), muted #5E6A87 a slightly starved blue (4.6:1). accent is 2.6:1 on paper: floods, stamps and display only ('pink type on bare paper is hard to read. if it's small, make it blue'); accentInk #A7338B is the pink overprinted with a blue halftone, measured in the flyer render [E43] (5.2:1), the deepest pink two drums can print. onAccent #3A1654 (overprint on the pink flood, 4.8:1). ok/warn/deny stay inside the two inks (blue, deep pink, overprint) instead of the draft's derived green, orange and red, which the press cannot print; the reel signals with stamped words, never colour alone. bg2 #E7E3D8 is the paper as the scan sees it [E40]; surface is the same newsprint (scraps read by their torn edges and printed shadows, not by a lighter fill). The draft's #FFFFFF bg2/surface and #000000 swatches came from the grayscale riso master [E26, E27, E33, E34], which is a separation, not the look; dropped. paletteAlt removed: the zine has no dark scheme; its dark pages are blue floods on the same paper, drawn with these inks, and no scene uses the compositor's night stage. Extra keys paper/pink/blue/overprint feed the riso press module; pinkOnPaper/blueOnPaper are the inks multiplied on the newsprint.

- **type.** Four OFL faces, each with the job the house style gives it (E13-E16 tokens, E18-E22 @font-face, E35-E39 files): display Anton (headlines, all caps), serif and stamp Alfa Slab One (rubber-stamp lettering), sans and mono Courier Prime (typewriter: the flyer's body rule is var(--font-type) [E15]; interviews, dates, small print), hand Covered By Your Grace (marker scribbles). The draft made the scrawl face the body font (its computed-style probe sampled the scrawl [E42]) and put it in the grotesk category with Helvetica/Arial fallbacks, read the PDF's Courier Prime as 'Courier New' [E31], and left serif as Source Serif 4: all corrected. Fallbacks are generic families only (no system faces). displayWeight 400 (Anton and Alfa Slab One ship one weight; the draft's 700 would have synthesized a faux bold), bodyWeight 700 (Courier Prime Bold survives the ink texture on video). Scale 18-400 px: the zine shouts (masthead and numbers 300-400 px), typed lines 32-44 px, disclaimers 18-24 px. Tracking +0.01 em on Anton (flyer h1 [E25]), 0.08 em on stamps (the flyer stamp letter-spacing).

- **motion.** The house style decides the motion and the extractor could not read it (it does not parse prose rules): 'stop-motion only. about 10 to 12 frames a second', 'things SLAP onto the page: one frame in the air, one frame squashed, then still (ish)', 'hard cuts on the beat. no fades. no swooshes. no glow. no 3D' [E6]. So: energetic pace at 160 BPM; every element is posed on a stop-motion clock of a quarter beat (motion.stopMotion.stepBeats 0.25 = 10.7 fps at 160 BPM) with a re-printed boil per step; slaps are three poses (in the air, squashed, down) landing on the beat; spring f 3.2 z 0.55 and outExpo with overshoot 0.9 only shape those poses. Transitions: cut (hard cuts on the bar line) and match (a torn sheet that both scenes draw at the same place); the draft's zoomInto, whip and impact were swooshes, a 3D dive into a 'website' and an RGB chroma kick, all banned or digital. Text reveals: typing (Courier Prime strikes) and kineticPop (ransom letters slapped one by one). characters false (no mascot), dataViz false (the draft's 0.55 data score came from prices, page numbers, dates and hex codes, not data). Energy was underestimated by the draft (0.53): it counts '!' and marketing words but not CAPS shouting or the 160 bpm in the house style.

- **sound.** House style: 'tempo: 160 bpm, downstrokes only, like the fastest song on the tape', 'music only' [E6]; README: a garage tape comp, 'side A is fast. side B is faster', tape hiss is 'the sound' [E1]. The draft's corporate 109 BPM, F major, light drums, glassy SFX is the opposite of the material: the library has no garage or punk family, so loud DIY copy fell into the most neutral preset. Set: 160 BPM (bar 1.5 s, 90 frames at 60 fps; 10 bars = 15 s, 20 bars = 30 s), E major (open-E garage power chords; mixolydian, with its bVII, is the intended colour, but extract_style.py --validate accepts only major/minor although the schema and arrange.py allow church modes), full drums, organic SFX (paper, stamps, hand-made), energy high throughout. preset lofi is a stand-in until the audio library has a garage kit: it is the only family built for hand-made material (tape crackle, organic SFX); its swing, e-piano and boom-bap do not fit and stage 2 replaces them (saw-bass and stabs stand in for bass and guitar, crackle for tape hiss).

- **narration.** Off. The house style says 'music only. nobody wants to hear us talk' [E6]; the reel is a 15-30 s punk teaser that must read muted, and every idea is on screen as stamped or typed words. If a voice is ever wanted: Fenrir, [fast, energetic], en-US, conversational lowercase register (README [E1]), captions on.

- **visuals.** Carriers: code-drawn vector only, but as print: every frame is two separations (pink, blue) multiplied onto newsprint with halftone screens, mottled ink, specks and misregistration, re-printed every stop-motion step (modules/riso-press.js). The cover, flyer, numbers, tape and band strips are redrawn in code after source/issue07-cover-scan.jpg [E40] and source/flyer.html [E43]. The draft's app-ui and web-shots came from treating flyer.html as an app to capture; there is no product UI in this world, and a browser frame would be the wrong object (the flyer is paper). No photos, no glow, no gradients, no soft shadows: shadows are printed halftone offsets.

- **print.** house-style.md [E6]: two drums, 'tints are halftones, never opacity: round dots, about 45 lpi. pink screen at 15°, blue at 75°', 'registration is about 1 mm off and changes from sheet to sheet', 'ink is uneven. big floods come out mottled with tiny white specks'. At the reel's magnification (an A5 cover fills the frame height, 1 mm = 5 px) that is a 9 px screen pitch, a blue drum about 5 px off with 1.5 px of jitter per step, ink density 0.82-1.0 with about 2.5 % paper specks; the scan shows the same [E40].

## Same BPM, more bars

The 30-second cut is the same reel with longer holds (and optional scenes where they exist); the tempo never changes.

| Scene | short | 30 s |
|---|---|---|
| `cover` | 2 | 2 |
| `inside` | 2 | 6 |
| `tape` | 3 | 6 |
| `show` | 3 | 6 |

## Scenes

**`cover`**: cover (hook, 2 bars): "PAPER JAM #07" prints in front of you. The pink drum sweeps across the newsprint (beat 0), the blue drum follows off register (beat 1), the #07 stamp slams (2), the strip types (2.5), the marker scrawls "the basement issue!!" (3), and "IT'S OUT!!" is stamped on a pasted scrap (4). Every quarter beat is a new print (registration, ink and paper re-rolled), so the finished cover boils. The speaker pulses on every beat; the out-phase jumps the camera in toward the masthead before the hard cut.

**`inside`**: inside (2..6 bars): "40 pages. 2 inks. 0 ads." The hard cut lands on a federal-blue flood; the three numbers are knocked out of it one per beat (paper letters with an off-register pink screen), each label stamped on a pasted scrap half a beat later, and the facts strip types in. Hold: every bar line a new fact is stamped into the gaps (the README's own words) and the camera jump-zooms onto it for half a beat; the numbers kick in turn on every beat. Out: a fresh newsprint sheet is pasted up over the page (the next scene starts on it: a match).

**`tape`**: tape (3..7 bars): "6 BANDS. 1 TAPE." The page is the zine's centerfold (fold shadow, two staples). The headline double-hits in pink and blue on the cut, the tape comp cassette slaps down (beat 1) and keeps turning its reels on the stop-motion clock, the six bands land on torn strips one per half beat (side A left, side B right, 1.5-4), then SIDE A / SIDE B are stamped (4.5, 5). Hold: on every bar line the marker annotates one band (README words), the cassette hops on every downbeat. Out: a sheet of pink-flooded paper is pasted over from the right (the finale is printed on it: a match).

**`show`**: show (finale, 2..6 bars): "RELEASE SHOW!!" The tape's pasted pink sheet is the page (match). The headline is printed in blue over the pink flood (overprint, beat 0), the date is knocked out of a pasted paper scrap (1), 8PM is stamped (1.5), the venue types on a blue strip (2-2.5), "knock twice" is scrawled with an arrow (3), and the end card lands on beat 4: "PAPER JAM #07" stamped big plus "OUT NOW". Hold: every bar line one "bring ..." line from the README is scrawled and stamped into the margin, the date hops on every downbeat, and the whole page re-prints on the stop-motion clock. Out: a last "SEE YOU THERE!!" stamp slams over everything (no transition after).

## Provenance and credits

- The material in `source/` was written for this example; the project is fictional and the reel says so on screen.
- Music and sound effects are synthesized by `audio/` (no samples).
- Fonts ship with their licences: `source/fonts/OFL-AlfaSlabOne.txt`, `source/fonts/OFL-Anton.txt`, `source/fonts/OFL-CourierPrime.txt`, `source/fonts/OFL-CoveredByYourGrace.txt`.
