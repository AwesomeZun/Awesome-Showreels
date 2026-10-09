# Example: art-deco (THE EMERALD FAN)

A 1920s invitation, a menu and a house style go in; a gilded, nocturnal reel comes out: an emerald door drawn in gold, a fan of gold ribs, a sunburst invitation and a small swing band. Nothing here picks a preset: palette, type, motion and music were derived from `source/` and written to `style.json` with the reasoning for every decision.

- Demo (short cut, with its music): [`assets/demo-art-deco-v1.0.0.mp4`](../../../../assets/demo-art-deco-v1.0.0.mp4)
- Web version with every cut: [`dist/the-emerald-fan-v1.0.0.html`](dist/the-emerald-fan-v1.0.0.html) ([play in the browser](https://raw.githack.com/AwesomeZun/Awesome-Showreels/main/skills/motion-showreel/examples/art-deco/dist/the-emerald-fan-v1.0.0.html))
- Cuts: `short` (7 bars = 15.0 s), `30` (14 bars = 30.0 s), all at 112 BPM.

> THE EMERALD FAN is fictional. Every name, number and screen is demo content made for this example.

## Folder

```
art-deco/
  source/                 15 file(s)
    README.md
    fonts/JosefinSans[wght].ttf
    fonts/Limelight-Regular.ttf
    fonts/OFL-JosefinSans.txt
    fonts/OFL-Limelight.txt
    fonts/OFL-PoiretOne.txt
    fonts/PoiretOne-Regular.ttf
    house-style.md
    ... 7 more
  modules/                1 file(s)
    deco-kit.js
  scenes/                 4 file(s)
    card.js
    door.js
    evening.js
    fan.js
  style.json
  style-extract.md
  reel.config.json
  STORYBOARD.md
  dist/
```

## Run it

```bash
S=skills/motion-showreel; P=$S/examples/art-deco
python3 $S/tools/extract_style.py --source $P/source --project $P --board      # draft style (review by hand)
python3 $S/timing/plan_cut.py --project $P --cut short,30
for c in short 30; do python3 $S/audio/arrange.py --project $P --cut $c; done
python3 $S/audio/verify_sync.py --wav $P/build/music-short.wav --cut $P/build/cut-short.json
node $S/runtime/render.mjs --project $P --cut short --out out/art-deco-short.mp4
node $S/runtime/build.mjs --project $P --cuts short,30 --out out/the-emerald-fan.html
```

## What the tone pass decided

- **palette.** Dark theme: every page of the material is lacquer black [E17, E44, E46]. All roles are the material's own tokens, named by material rather than role in print/deco.css [E13] and repeated in the house-style colour table [E3-E9]: bg --lacquer #0E0C09, bg2 --lacquer-raised #17140F, ink --ivory #F2E8D3 (16.1:1; 'ivory for small type'), ink2 --ivory-dim #B9AC8E (8.7:1, 'the second line of small type'; the draft derived #A69F90 instead), accent --gold #C9A24A (8.1:1, gold carries the name, rules and frames), accent2 --emerald #0F6B53 (3.0:1, fill only: 'emerald never carries small type'), accent3 --gold-burnished #F3E2A9 (the leaf catching the light; the draft took --gold-shaded #7A5A1E, a shadow tone, which stays as the extra goldShade). surface #1C1812 is derived (lacquer one step above bg2) for panels. muted #8C8170 is derived from ivory-dim toward the lacquer at 5.1:1 for the disclaimer. The house style allows no other colours ('Nothing else: no silver, no chrome, no pastel tints' [E2]); the draft's derived warn #FFC4B3 and deny #FF7577 were pastel and coral, so the semantic roles reuse material inks (ok emerald, warn gold, deny gold-shaded); the reel never signals allowed or denied. Extras for the gold-leaf and lacquer rendering: goldLight #F3E2A9, goldShade #7A5A1E, emerald #0F6B53, emeraldDeep #0A3D31 [E13]. Gold text on mid emerald is only 2.7:1, so type on an emerald band is set in goldLight on emeraldDeep (9.4:1), never gold on emerald. No paletteAlt: the material has one scheme.

- **type.** Three faces, all shipped as OFL files [E40-E42] and declared in print/deco.css [E14-E16]. display: Limelight for the name, the headlines and the date, capitals only, set a little open (house style [E2]; --open 0.08em [E13]) -> tracking +0.08 em. sans: Josefin Sans, the body face of the masters (body font-family, [E19]) and of the house style ('details, the menu and the programme'); the draft put Poiret One here because the invitation's longest text runs are set in it [E36, E44, E46]. hairline (extra role): Poiret One, 'for the lines of the invitation that are spoken rather than announced' [E2]. Labels are capitals tracked about a third of an em (--tracked 0.33em [E13]): trackingLabel is capped at 0.15 by the schema, so the full value lives in trackingWide 0.33. displayWeight 400: Limelight has one weight, and the draft's 700 made the browser fake a bold. serif and mono: the material has neither; serif points at the display face so nothing off-brand can render, mono is an unused system fallback. Scale 18-168 px at 1080p: labels 22-26, hairline lines 40-52, headlines 92-124, the wordmark 168.

- **motion.** The band plays 'an easy, medium tempo for dancing' [E1], so the pace is medium, not the draft's calm (energy 0.25 came from the absence of '!', emoji and marketing words, which a 1926 invitation never has). The house style is machine-age and exact: 'symmetry about the centre line, always', 'gold rules are drawn, never stamped: thin, unbroken, meeting exactly on the centre line', sunbursts that 'rise from the middle of the bottom edge', a door whose fan 'is whole only while the door is shut', bandstand arches 'lit one after another, from the inside out, in time' [E2]. Hence: a firm spring (f 2.2, z 0.82), a small overshoot (0.4) only for things that swing, outQuint for entrances, symmetric centre-out reveals, gilded line draws, and secondary beats on the swung eighth. Transitions: portalFlash for the emerald door opening onto the room, cut on the downbeat behind the scene-drawn fan iris (the mark's seven ribs open across the frame and fold away), and match where the gold frame stays. The draft's zoomInto and whip were scored from 'app/web captures to dive into' (the HTML print masters) and generic energy; there is no app here, and a whip pan has no place in this material. dataViz false: the seven tables are a menu and a programme, not data (the draft's data 0.44). characters false.

- **sound.** The press-kit note describes the sound exactly [E1]: a seven-piece hot dance band (trumpet, clarinet, trombone, piano, banjo, string bass, drums) playing foxtrots and stomps 'at an easy, medium tempo for dancing, the string bass walking four to the bar, the piano comping, the drummer on brushes after midnight'. That is a swung medium tempo: 112 BPM (inside 'medium', and 7 bars = 15.0 s, 14 bars = 30.0 s exactly), major mode (an opening night), key Bb (a horn key; the draft's A came from the gold hue and its minor mode from 'dark'), light drums (brushes). No preset of audio/arrange.py plays swing yet: lofi (the draft's choice, the only preset with a swing setting) is the stand-in with swing raised to 0.33 (a triplet feel) until the audio library has a swing-band preset; the draft's 83 BPM and drums none came from the calm misreading. SFX family glassy: champagne coupes, gold leaf glints and crystal; knocks use thud.

- **narration.** Not recommended: a music-led invitation film of 15 and 30 s whose every line is on screen as type, in the invitation's own words. The draft recommended narration because the extractor read the kit as developer docs (the word 'example' in the disclaimers and the bandstand's 'shell' scored as docs and tool vocabulary). If a voice is wanted, a smooth announcer: Algieba with [smooth, confident], en-GB, because the material spells programme, colours and centre the British way.

- **visuals.** Everything is code-drawn vector and type, in the material's own tokens and faces: the stepped double frame, the sunburst ground and the fan mark of the PDF proofs [E33, E38], the emerald door from the house style, the bandstand arches, and the champagne tower from the press-kit note ('a champagne tower on the bandstand on the opening night' [E1]). The PDFs are print artwork, not figures to excerpt (the draft's pdf-figures), and the HTML files are print masters, not an app or a website (the draft's app-ui and web-shots): the reel redraws their ornament at video resolution so every line can move on the beat.

## Same BPM, more bars

The 30-second cut is the same reel with longer holds (and optional scenes where they exist); the tempo never changes.

| Scene | short | 30 s |
|---|---|---|
| `door` | 2 | 2 |
| `fan` | 2 | 3 |
| `evening` | - | 4 |
| `card` | 3 | 5 |

## Scenes

**`door`**: door: the hook. Gold rules draw the stepped architrave of the emerald door from its keystone down both sides, the sconces come on, the door rises out of the dark; two knocks land on beats 2 and 3 ("KNOCK" left of the door, "TWICE." right of it), the word is given on the downbeat of bar 2, light shows at the seam, and in the out-phase the two leaves swing inward while the camera walks to the doorway: the next scene (fan) is already the room behind the door (portalFlash: env.portal draws it in the doorway, the gold burst lands on the bar line). House style: the fan is inlaid across both leaves "so that it is whole only while the door is shut"; "two brass studs, one on each leaf, take the knocks"; everything symmetric about the centre line.

**`fan`**: fan: the room behind the door. The bandstand's shell of stepped gold arches is already lit when the door opens (portalFlash shows this scene in the doorway before the bar line); on the downbeat the mark opens, seven gold ribs spreading from one point with emerald between them, and the name lands in gold leaf from the centre outward, then the subline with its rules. The arches are "lit one after another, from the inside out, in time" (house style): a wave on every beat and a lighter one on the swung 'and'. Out-phase: the mark grows into the full-frame fan that closes over the cut (the next scene opens it again).

**`evening`**: evening (optional, 30 s cut): "The programme for the evening". The closed fan parts on the downbeat (fan ended on FAN.irisCover); the title is drawn with a gilded rule, then the five hours of the invitation land one per swung beat on the centre line (hour to the left in tracked capitals, the event to the right in the spoken hairline face, a gold lozenge between them). Below, the champagne tower from the press-kit note fills from the top coupe down, one tier per beat. Hold: a sheen runs down the rows on each bar, the lozenges pulse on the Charleston figure, bubbles rise. Out-phase: the full-frame fan closes again (the next scene parts it).

**`card`**: card (finale; every cut): the invitation itself. The closed fan parts on the downbeat onto a sunburst rising from the middle of the bottom edge (house style); the stepped double frame is gilded from the top centre down both sides, the small fan mark opens at the head of the card, and the invitation's lines arrive on the swung beats in its own words: the spoken line in the hairline face, the date in gold leaf, the hour and the band in tracked capitals. Two coupes rise at the foot of the frame and are raised in a toast on beat 5. Hold (it grows in longer cuts): the sunburst turns, the rays breathe on the Charleston figure, a sheen crosses the date on every bar, the coupes lift on the 'and' of 2.

## Provenance and credits

- The material in `source/` was written for this example; the project is fictional and the reel says so on screen.
- Music and sound effects are synthesized by `audio/` (no samples).
- Fonts ship with their licences: `source/fonts/OFL-JosefinSans.txt`, `source/fonts/OFL-Limelight.txt`, `source/fonts/OFL-PoiretOne.txt`.
