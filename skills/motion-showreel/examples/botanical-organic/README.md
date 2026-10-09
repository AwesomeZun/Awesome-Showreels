# Example: botanical-organic (Mistfold)

A tea garden's README, story and brand notes go in; a calm watercolour reel comes out: mist over tea terraces, a new flush that grows the way tea really grows, a cup at first light, a balm at dusk. Nothing here picks a preset: palette, type, motion and music were derived from `source/` and written to `style.json` with the reasoning for every decision.

- Demo (short cut, with its music): [`assets/demo-botanical-organic-v1.0.0.mp4`](../../../../assets/demo-botanical-organic-v1.0.0.mp4)
- Web version with every cut: [`dist/mistfold-v1.0.0.html`](dist/mistfold-v1.0.0.html) ([play in the browser](https://raw.githack.com/AwesomeZun/Awesome-Showreels/main/skills/motion-showreel/examples/botanical-organic/dist/mistfold-v1.0.0.html))
- Cuts: `short` (6 bars = 15.0 s), `30` (12 bars = 30.0 s), all at 96 BPM.

> Mistfold is fictional. Every name, number and screen is demo content made for this example.

## Folder

```
botanical-organic/
  source/                 16 file(s)
    README.md
    brand-notes.md
    fonts/alegreya-sans/AlegreyaSans-Italic.ttf
    fonts/alegreya-sans/AlegreyaSans-Medium.ttf
    fonts/alegreya-sans/AlegreyaSans-Regular.ttf
    fonts/alegreya-sans/OFL.txt
    fonts/fraunces/Fraunces-Italic[SOFT,WONK,opsz,wght].ttf
    fonts/fraunces/Fraunces[SOFT,WONK,opsz,wght].ttf
    ... 8 more
  assets/                 3 file(s)
    fonts/FrauncesSoft-Italic[opsz,wght].ttf
    fonts/FrauncesSoft[opsz,wght].ttf
    fonts/OFL.txt
  modules/                1 file(s)
    botanica.js
  scenes/                 4 file(s)
    balm.js
    finale.js
    grow.js
    steep.js
  style.json
  style-extract.md
  reel.config.json
  STORYBOARD.md
  dist/
```

## Run it

```bash
S=skills/motion-showreel; P=$S/examples/botanical-organic
python3 $S/tools/extract_style.py --source $P/source --project $P --board      # draft style (review by hand)
python3 $S/timing/plan_cut.py --project $P --cut short,30
for c in short 30; do python3 $S/audio/arrange.py --project $P --cut $c; done
python3 $S/audio/verify_sync.py --wav $P/build/music-short.wav --cut $P/build/cut-short.json
node $S/runtime/render.mjs --project $P --cut short --out out/botanical-organic-short.mp4
node $S/runtime/build.mjs --project $P --cuts short,30 --out out/mistfold.html
```

## What the tone pass decided

- **palette.** Light theme on oat paper: the brand notes say 'Background: Oat #F1E9D8 (paper, always)' [E4] and the site, manifest and harvest card measure the same [E18, E23, E30, E35, E44]. Roles follow the material's own names, not the measured weights: accent = Moss #4F6B3A, the 'Primary colour' [E5] and --primary/theme_color [E23, E29] (the draft put Terracotta first because the all-terracotta seal [E2, E42] outweighed the spec); accent2 = Sage #9BAF86, 'Secondary colour ... washes, young leaves, fills; never text' [E6]; accent3 = Terracotta #C2673F, 'Accent colour: the seal and one detail per page; never body text' [E7]. bg2 is the material's --paper-deep #E6DAC2 [E23] (the draft derived #E8DDC7); muted is the material's 'Small print: Stone #66654F' [E9, E10] at 4.91:1 (the draft derived #6B6A5C). ink Loam #2B2F23 11.34:1 [E8], ink2 Bark #4F5242 6.64:1 [E9]; Moss is text-safe (4.97:1), so accentInk = accent and Oat on Moss (onAccent) is 4.97:1. ok/warn/deny are the --success/--warning/--danger tokens [E23]; ok (moss) and deny (clay) are close for deutan viewers, so the reel never signals by colour alone (it signals nothing by colour). Extras for the illustration, all from the material: liquor #D4A24A ('Gold, for tea liquor and oil only' [E11]; the key is the site's --liquor token, because the engine reserves 'gold' as an alias of accent3), clay #9A4A2A (terracotta text, 5.13:1), and the illustration's own washes leaf #7F9868, bud #B9C6A4 and stem #5B4A36 [E34]. paletteAlt is the site's evening scheme token for token [E12, E13, E19, E23, E46]: Night moss #1B2318, Oat ink #EFE7D4, ink2 #CFC7B0, muted #A39F88 (6.05:1), accent = the evening --primary #A9BE92 (8.05:1), accent3 = the warmer Terracotta #D9845A [E13]; the draft had derived most of these from the light accents instead of reading the evening tokens.

- **type.** Fraunces for headlines and the serif role, Alegreya Sans for labels and small print, as the brand notes and tokens say [E14, E15, E20, E21, E22]. The notes specify 'the Soft axis at 100 and Wonk at 0' (italic: Soft 100) [E3], which canvas cannot set, so the reel loads 'Fraunces Soft', two partial instances of the shipped OFL variable fonts [E37, E38] made with fontTools (SOFT=100, WONK=0 roman / WONK=1 italic; opsz and wght stay variable, and Chrome applies optical sizing in canvas automatically) in assets/fonts with the OFL. The draft's fallbacks were Didot and Bodoni (high-contrast fashion serifs, because the extractor files Fraunces with them as 'display-serif') and Inter for sans (it filed Alegreya Sans under serif); both replaced with old-style and humanist stacks from the material's own CSS (Iowan Old Style, Georgia; Gill Sans, Trebuchet MS) [E20, E22]. displayWeight 380 and bodyWeight 400: the notes say 'weight 300 to 450 at display sizes. Never bold' and the site sets h1 at 380 [E3, E17] (the draft said 600). Scale 16-176 px at 1080p; headline tracking -0.012 em (the site sets -0.015 em); labels +0.12 em, 'letter-spaced capitals (+12 %)' [E3, E23].

- **motion.** Energy 0.30: no '!', no emoji, 0.59 marketing words per 1k, short plain sentences [E1, E3, E16] -> calm pace. The notes are explicit: 'Things grow; they do not pop ... one leaf per beat, never faster. Ease out softly. No bounce, no overshoot, no flashes, no hard cuts' [E3]. So the spring is critically damped (f 1.9, z 0.95; the draft's z 0.72 and overshoot 0.56 would bounce) with overshoot 0 and outQuint. Transitions: match and cut only, and every boundary joins identical frames because the scenes paint their own wet-colour bleeds (modules/botanica.js): the outgoing scene floods the frame with a wash and the incoming scene starts from that same wash. zoomInto was dropped (it came from 'app-ui', and there is no app). Text arrives as ink soaking into paper (kinetic per glyph with a long blur-in, no rise bounce) and sublines slide up softly (revealLine). characters false (no mascot; the seal is a mark). dataViz false: the draft's data 0.58 came from steeping numbers, a founding year, an ingredient list and two tables (a file index and the banned-words table), not from data.

- **sound.** The notes name the sound: 'Acoustic and unhurried, at walking pace: about 96 beats per minute. Fingerpicked nylon-string guitar and a wooden marimba carry the tune; a soft upright bass and a brushed shaker keep time. No synthesisers, no drum machines, no whooshes. Our sound logo is three plucked notes rising' [E3]. BPM 96 (the draft's 89 came from the ambient range; 96 is the stated tempo and gives whole bars: 15 s = 6 bars, 30 s = 12). The draft's ambient instruments (pad, glass, sub) are synthesisers the brand forbids; instruments are the brand's: guitar (a Karplus-Strong nylon guitar, not in audio/synth.py yet: stage 2 adds it), marimba, bass (upright), shaker. preset stays 'ambient' only as the closest pace/energy bundle (84-100 BPM, light drums, long reverb) until an acoustic preset exists. Key D major (free choice: open D and A strings ring on a nylon guitar, and major for a morning ritual). SFX family organic (paper, wood, hand-made, nature) instead of glassy, which the extractor chose from 'beauty' words that are negations here ('We will not add perfume') [E16]. Energy stays low: the reel never drops hard.

- **narration.** Off: 'Voice-over: none. Let the garden speak, and set the words on screen, small' [E3]; brand purpose, short headlines. If a client ever asks for a voice: Sulafat (warm) with [warm, gentle], en-GB (the material spells colour, recolour, synthesisers, ageing) [E3, E16]. Captions stay off.

- **visuals.** Code-drawn vector only, in the brand's illustration rules: 'a fine loam ink line, then watercolour washes that pool darker at their edges and let the oat paper show through. Leaves keep their real serrated margins and alternate up the stem' [E3, E34]. Carriers: procedurally grown tea branches (an L-system), watercolour washes with edge darkening and granulation, a hand-drawn cup and balm tin, the seal drawn from its own SVG path data [E42], oat paper with fibres and flecks. The draft's app-ui, pdf-figures and web-shots were dropped: there is no app, the harvest card is not a paper figure, and the reel tells the story rather than showing the website.

## Same BPM, more bars

The 30-second cut is the same reel with longer holds (and optional scenes where they exist); the tempo never changes.

| Scene | short | 30 s |
|---|---|---|
| `grow` | 2 | 2 |
| `steep` | 1 | 4 |
| `balm` | 1 | 3 |
| `finale` | 2 | 3 |

## Scenes

**`grow`**: grow: "Grown slowly." Dawn on the hillside, as a time-lapse. Two banks of mist part on beats 0-3 and the sun wash warms in. On last year's wood above the bush the winter bud breaks (its scales peel back, 0.4-1.3) and the new season's flush grows the way tea really does (MF.drawGrowing): three internodes stretch on overlapping curves and carry the leaves up, each leaf comes out folded along its midrib and pressed to the stem, then lengthens, swings out and opens like a book while it widens and darkens; the growing tip nods in slow circles. The flush ends as 'two leaves and a bud' (the top leaf still half folded), a dew drop gathers at the bud and glints on beat 6. Kicker, headline and the Latin name soak into the paper on the right. Out (2 beats): the camera pulls focus onto the flush, everything else softens into the paper and the sway stills, so steep can pick the same flush.

**`steep`**: steep: "A cup at first light." Opens on grow's last frame (the flush, same plant data, same camera). The flush is picked on beat 0.5 and falls away from the camera into a stoneware cup seen from above; it lands on 1.5, rings spread, and the liquor blooms pale gold like wet-in-wet watercolour; steam drifts up in washes. Hold (30 cut): the subline, then the steeping notes one per beat, then the cup deepens. Out: night floods in from every edge.

**`balm`**: balm (dark): "A balm at dusk." Opens on steep's last frame (night paper alone). The camera tilts down onto a tea branch hanging from the top edge, its flower already open; an oat-enamel tin (true cylinder perspective, the label lettering wrapped round it) is inked and washed beneath it; a drop of gold oil swells in the flower's heart and lands in the tin on 2; the lid lowers and closes on 3 with the seal on top. Fireflies all through. Hold (30 cut): the subline, petals falling one per beat, the fireflies brighten together. Out: oat paper blooms out of the seal until it fills the frame (dawn).

**`finale`**: finale: the end card as a flat lay. Opens on balm's last frame (oat paper alone); the leaf light comes back. Nothing grows: fresh-picked leaves are laid on the paper by hand around the seal, one per half beat from beat 1, each dropping the last centimetre (its shadow tightens under it, a small settle in rotation), in two loose clusters (left, right), like leaves set out on a tasting table. The seal is pressed on 1, the wordmark soaks in on 2, the tagline on 3, the disclaimer on 4. Hold: the light breathes over the table and loose leaves drift down across the card.

## Provenance and credits

- The material in `source/` was written for this example; the project is fictional and the reel says so on screen.
- Music and sound effects are synthesized by `audio/` (no samples).
- Fonts ship with their licences: `assets/fonts/OFL.txt`, `source/fonts/alegreya-sans/OFL.txt`, `source/fonts/fraunces/OFL.txt`.
