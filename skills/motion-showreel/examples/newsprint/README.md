# Example: newsprint (The Tamsin Valley Courier)

A small-town front page, its stylebook and the e-edition go in; a steady, civic reel comes out: page A1 rolls off the press, a halftone photo, numbers set as cast slugs, one red plate. Nothing here picks a preset: palette, type, motion and music were derived from `source/` and written to `style.json` with the reasoning for every decision.

- Demo (short cut, with its music): [`assets/demo-newsprint-v1.0.0.mp4`](../../../../assets/demo-newsprint-v1.0.0.mp4)
- Web version with every cut: [`dist/tamsin-valley-courier-v1.0.0.html`](dist/tamsin-valley-courier-v1.0.0.html) ([play in the browser](https://raw.githack.com/AwesomeZun/Awesome-Showreels/main/skills/motion-showreel/examples/newsprint/dist/tamsin-valley-courier-v1.0.0.html))
- Cuts: `short` (7 bars = 17.5 s), `30` (12 bars = 30.0 s), all at 96 BPM.

> The Tamsin Valley Courier is fictional. Every name, number and screen is demo content made for this example.

## Folder

```
newsprint/
  source/                 16 file(s)
    e-edition/a1-clocktower.png
    e-edition/courier.css
    e-edition/index.html
    fonts/CourierPrime-Bold.ttf
    fonts/CourierPrime-Regular.ttf
    fonts/GrenzeGotisch-Variable.ttf
    fonts/LibreFranklin-Variable.ttf
    fonts/Newsreader-Italic-Variable.ttf
    ... 8 more
  assets/                 0 file(s)
  modules/                2 file(s)
    np-kit.js
    np-photo.js
  scenes/                 4 file(s)
    end.js
    numbers.js
    photo.js
    press.js
  style.json
  style-extract.md
  reel.config.json
  STORYBOARD.md
  dist/
```

## Run it

```bash
S=skills/motion-showreel; P=$S/examples/newsprint
python3 $S/tools/extract_style.py --source $P/source --project $P --board      # draft style (review by hand)
python3 $S/timing/plan_cut.py --project $P --cut short,30
for c in short 30; do python3 $S/audio/arrange.py --project $P --cut $c; done
python3 $S/audio/verify_sync.py --wav $P/build/music-short.wav --cut $P/build/cut-short.json
node $S/runtime/render.mjs --project $P --cut short --out out/newsprint-short.mp4
node $S/runtime/build.mjs --project $P --cuts short,30 --out out/tamsin-valley-courier.html
```

## What the tone pass decided

- **palette.** Light theme: newsprint covers 80-82 % of both page renders [E36, E44] and is the page's own token and theme colour (--courier-newsprint, theme-color #E4E0D6) [E13, E19, E28]. The draft took bg from the e-edition's html background #D6D1C5 [E26, E43], which is the desk around the page, not the paper: bg and bg2 are swapped back (bg #E4E0D6 newsprint, bg2 #D6D1C5 newsprint shade). Every role is a token or a row of the stylebook's colour table [E3-E11, E19]: surface #EFECE4 newsprint light (the draft's derived #FFFFFF does not exist on newsprint), ink #1D1B18 Courier Black, ink2 #4A4640 Black 70, muted #625D55 Black 55, accent #B9202A Courier Red, line #9A958B Black 40. The stylebook allows two inks and one spot colour [E2: 'Two inks, one paper. Red is a signal'], so the draft's derived accent2 #725E00 (olive) and accent3 #9B3491 (magenta) and its derived green, orange and pink semantic colours are removed: accent2 is Black 40 #9A958B (rules and screens) and accent3 Black 15 #CDC8BD (tint boxes), both fills only; ok is Courier Black, warn Black 70, deny Courier Red (the reel signals nothing by colour; a verdict would be a word). onAccent is newsprint light reversed out of red (5.39:1), as the e-edition's flags do. Contrast on bg: ink 13.04:1, ink2 7.11:1, muted 4.95:1, accent 4.82:1, so accentInk equals accent (on the draft's bg muted was 4.29:1 and accent 4.17:1). muted on the Black 15 tint is only 3.92:1: small text never sits on a tint box. No paletteAlt: the paper has no dark scheme and no scene goes dark (the draft derived a red-black night palette).

- **type.** Five families, all declared in courier.css and named in the stylebook's type table [E2, E14-E18], all shipped as OFL files [E37-E42] and embedded by name in the press PDF [E33]. display and serif: Newsreader (A1 banners ExtraBold 800, body 400; Chromium applies its optical size axis automatically per font size, so a 100-px banner gets the display cut and 16-px body copy the text cut). sans: Libre Franklin, the stylebook's label face for flags, folios, credits and the sidebar [E17]; the draft put Inter here, a face the material never names. mono: Courier Prime, the wire and agate face [E18], with the CSS's own fallback Courier New; the draft's JetBrains Mono and Fira Code fallbacks belong to a code editor, not a teletype. nameplate (extra key): Grenze Gotisch, the stylebook's nameplate face [E14]; the extractor has no blackletter category and filed it as a grotesk. The draft listed the italic variable file without style: italic, so the runtime would have registered it as a second upright Newsreader; fixed. displayWeight 800 as the A1 banner [E2], bodyWeight 400 as the text cut (the draft's 600/500 were tuned for compression on glossy light stages); headline tracking -0.012 em as the CSS headline; labels tracked 0.08 em (the stylebook's '+80'). Scale steps follow the page's hierarchy: agate 14, label 18, body 22, deck 28, 36, 48, 64, banner 88, figure 116, nameplate 152.

- **motion.** Energy 0.40 with no '!', no emoji and 0.66 marketing words per 1,000 [E1, E2] → medium pace, kept. The stylebook's video section decides the character [E2]: 'Type is set, not thrown: lines land like slugs of cast metal, firmly and on the beat, without bounce. Pages change the way the press changes them, by rolling.' So overshoot 0 (draft 0.28), a near-critical spring (f 2.6, z 0.92; draft z 0.79) and outQuint, the deceleration of a press stopping (draft outC). Transitions: cut (the compositor cuts while the scenes run the press roll themselves: the outgoing page leaves on the paper web, the incoming page comes off an inked cylinder; modules/np-kit.js) and zoomInto (into the A1 picture); match kept for same-layout hand-offs; the draft's impact (zoom punch, shake, flash) is not something a press can print. Reveals: revealLine for slugs, typing for datelines and the wire. HUD off: the draft turned the frame HUD on for 'pitch' and data, but brackets and a timecode are not print. radius 0: newspaper boxes are square (draft 6). Six-column grid with a 24-px gutter as the broadsheet [E2]; margin 96. dataViz false: the numbers are set as type in a sidebar, never charted; characters false.

- **sound.** The stylebook names its own sound [E2]: 'typewriter keys, the teletype and the press, over a steady walking pulse of about 96 beats per minute.' The extractor does not read tempo from prose and drafted corporate at 107 BPM, G major, minimal SFX. Reviewed: 96 BPM (also 6 bars = 15.0 s and 12 bars = 30.0 s exactly), lofi as the nearest instrument family (organic SFX: paper, stamps, keys; piano bed, round bass, rim and hats) with swing 0 because the pulse is steady, not swung; drums full so the 16th-note hats can carry the typewriter figure. Key C (Scriabin red: the extractor read the accent's 31° hue as orange and chose G), major for a good-news story. The teletype, typewriter and press voices are not in audio/synth.py yet: stage 2 adds them (README 'needs').

- **narration.** Not recommended, and the material says why [E2]: 'No voice-over on teasers under 20 seconds; the type tells the story.' Every idea is on screen as type for muted autoplay. The draft reached the same answer for the wrong reason (it read the page as a 'pitch' for 'investors and judges' from its prices and page numbers). If a 30-s cut is narrated later: Schedar (even), [measured, warm], en-US, captions on a newsprint-light band.

- **visuals.** Every carrier is code-drawn vector, printed the way the page is printed: type in columns, column and Oxford rules, the nameplate, a teletype tape, and the A1 picture as a round-dot halftone at 45° (black plate) with sound rings on a 15° red plate. The picture is an illustration drawn in code (modules/np-photo.js; source/e-edition/a1-clocktower.png is that drawing screened once), so visualSources is vector only. The draft's app-ui, pdf-figures and web-shots came from classifying the halftone PNG and the PDF's image as screenshots [E30, E31]: the reel shows neither an app nor a web page, and it re-sets the page rather than screenshotting the PDF.

## Same BPM, more bars

The 30-second cut is the same reel with longer holds (and optional scenes where they exist); the tempo never changes.

| Scene | short | 30 s |
|---|---|---|
| `press` | 2 | 2 |
| `photo` | 1 | 3 |
| `numbers` | 2 | 4 |
| `end` | 2 | 3 |

## Scenes

**`press`**: press (the hook; 2 bars in every cut): Page A1 of the Sunday Courier comes off the press. Beat 0: an inked cylinder rolls down a blank sheet and leaves the page behind it (nameplate, Oxford rule, folio, the halftone photo, columns, the By the numbers rail) while the camera eases back from the masthead. Beat 1.5: the red plate lays the folio rule. Beats 2 and 3: the two headline lines land as cast slugs. Beat 3.5: the deck. Beat 4: the red LOCAL flag. Beat 4.5: the byline types. Then the camera drifts toward the photo, which is the zoomInto window into the next scene (portal()). All copy is verbatim from source/front-page.md.

**`photo`**: photo (1 bar in the short cut, 3 bars in the 30-s cut): the camera has dived into the A1 picture (zoomInto from press; the window shows the same halftone at the same place, then the picture settles onto its page with the cutline beneath). The Town Hall bell strikes on every beat from beat 0: the hammer meets the rim, red sound rings spread on the 15-degree red plate, the strike tally in the cutline row stamps red; on strike 1 the pigeons lift off and the crowd raises its arms. At 96 BPM a 3-bar scene is exactly the 12 strikes of noon. Hold: a slow push into the dots; the cutline sentence appears on the hold's first bar line (only when the hold has one). Out-phase: the sheet is pulled off the press (NP.pressOut). All copy verbatim from source/front-page.md.

**`numbers`**: numbers (2 bars in the short cut, up to 4 in the 30-s cut): the By the numbers sidebar, set at poster size. The cylinder prints a fresh sheet (pressIn, beats 0-1.2): the red flag, the Oxford rule and the six-column rules. Then one figure lands per beat as a cast slug, beats 1-6, its label typing under it; 312 (pies) is the one red figure and hits hardest. The Valley Wire tape steps along the foot one character per 16th note the whole time. Hold: a slow push; when the hold has a full bar, Priya Raman's quote lands on its first bar line. Out: the sheet is pulled off the press. Copy verbatim from source/front-page.md (sidebar, lead story, Valley Wire).

**`end`**: end (1 bar in the short cut, up to 3 in the 30-s cut; last scene, no out-phase): the end card from the approved social copy. The cylinder prints a fresh sheet (beats 0-1.1); beat 1: the nameplate lands; beat 1.5: the Oxford rule draws from the centre; beat 2: the headline slug; beat 3: the red rule and the tagline. A small Town Hall clock face ticks its minute hand once per beat in red, and the Valley Wire keeps stepping along the foot, so the card is never static. When the hold has a full bar, the copy desk's end mark -30- types under the tagline.

## Provenance and credits

- The material in `source/` was written for this example; the project is fictional and the reel says so on screen.
- Music and sound effects are synthesized by `audio/` (no samples).
- Fonts ship with their licences: `source/fonts/OFL-CourierPrime.txt`, `source/fonts/OFL-GrenzeGotisch.txt`, `source/fonts/OFL-LibreFranklin.txt`, `source/fonts/OFL-Newsreader.txt`.
