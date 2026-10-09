# Example: pixel-jrpg (Lanternforge 2.0)

An open-source RPG engine's release notes go in; a 16-bit trailer comes out, shaped like the games people make with it
and lit the way its 2.0 release promises: pixel art under real light. A lantern catches in a dark corridor and burns
the logo in, a town's windows light up one house at a time, an airship crosses a Mode-7 world map, a brass bug boss
takes the release's numbers as damage and breaks into its own pixels, and the party celebrates. Nothing here picks a
preset: palette, type, motion and music come from `source/` and are written to `style.json` with the reasoning for
every decision.

- Web version with every cut: [`dist/lanternforge-v2.0.0.html`](dist/lanternforge-v2.0.0.html) ([play in the browser](https://raw.githack.com/AwesomeZun/Awesome-Showreels/main/skills/motion-showreel/examples/pixel-jrpg/dist/lanternforge-v2.0.0.html))
- Cuts: `short` (9 bars = 18.0 s), `30` (15 bars = 30.0 s), all at 120 BPM.

> Lanternforge 2.0 is fictional. Every name, number and screen is demo content made for this example.

## Folder

```
pixel-jrpg/
  source/                 26 file(s)
    RELEASE.md
    fonts/DotGothic16-Regular.ttf
    fonts/OFL-PixelifySans.txt
    fonts/OFL.txt
    fonts/PixelifySans-Variable.ttf
    gen/a/codex.log
    gen/a/corridor_bg.png
    gen/a/corridor_fg.png
    ... 18 more
  assets/                 14 file(s)
    px/airship.png
    px/battle_bg.png
    px/boss.png
    px/clouds.png
    px/corridor_bg.png
    px/corridor_fg.png
    px/hero_sheet.png
    px/meta.json
    ... 6 more
  modules/                1 file(s)
    hd.js
  scenes/                 5 file(s)
    battle.js
    finale.js
    flight.js
    ignite.js
    town.js
  style.json
  reel.config.json
  STORYBOARD.md
  dist/
```

## Run it

```bash
S=skills/motion-showreel; P=$S/examples/pixel-jrpg
python3 $S/tools/extract_style.py --source $P/source --project $P --board      # draft style (review by hand)
python3 $S/timing/plan_cut.py --project $P --cut short,30
for c in short 30; do python3 $S/audio/arrange.py --project $P --cut $c; done
python3 $S/audio/verify_sync.py --wav $P/build/music-short.wav --cut $P/build/cut-short.json
node $S/runtime/render.mjs --project $P --cut short --out out/pixel-jrpg-short.mp4
node $S/runtime/build.mjs --project $P --cuts short,30 --out out/lanternforge-v2.html
```

## How the pixel art was made

1. **Originals.** Twelve images from gpt-image-2 through the Codex CLI (`source/gen/<job>/prompt.txt` holds every
   prompt; the PNGs themselves are not committed): the corridor and its foreground pillars, the hero's 8-frame sheet,
   the town's sky, houses and foreground roofs, the overworld map, the airship, clouds, the battle backdrop, the boss
   and the party. Every prompt asks for the same SNES-era style, about 32 colours, 4x4 art pixels, no text.
2. **True pixel art.** `gen-src/pixelize.py` keys out the green, downsamples to the art grid with a per-block
   majority vote (no in-between colours), and quantizes all twelve assets to one shared 40-colour palette, so every
   scene sits in the same world. It also reads back what the scenes need: the hero's lantern position per frame,
   the party's three frames, and the town's 188 lit windows (plus an unlit copy of the houses).
3. **Light on top.** `modules/hd.js` keeps the pixels crisp (each layer pre-scaled 5x with nearest neighbour) and
   adds what the engine's 2.0 adds: a light map multiplied over the frame, bloom, dust that only shows inside the
   light, depth-of-field blur per layer and a teal-and-amber grade. The camera moves smoothly over the layers.

## What the tone pass decided

- **palette.** One 40-colour palette shared by every asset (median cut over all of them), so every scene sits in the same 16-bit world; lighting is a light map multiplied over the pixels (cool navy ambient, amber lights), bloom adds on top, and a teal/amber grade ties it together.

- **type.** Pixelify Sans (bold, gold stepped fill, dark outline) for the logo and numbers; DotGothic16 for dialog. Both are drawn at art size, thresholded and scaled 5x, so every glyph pixel is square.

- **motion.** A 16-bit trailer: a Mode-7 world map that rotates and tilts under the logo, a town walk with a typewriter dialog, a turn-based battle where the engine's features are the attacks and the numbers are damage, and a victory fanfare. Sprites animate on a 10-fps step clock.

- **sound.** 'A little dramatic' (RELEASE.md): cinematic strings, a saw lead motif, toms and a half-time snare at 120 BPM in D minor; the fanfare resolves on the end card.

- **visuals.** Pixel art from source/gen (gpt-image-2 originals, prompts kept beside them) turned into true pixel art on one shared 40-colour palette; the camera, light map, bloom, shafts, dust and depth of field are code (modules/hd.js). Scenes: a lantern lit in a dark corridor that lights the logo, a town at dusk whose windows light up, a Mode-7 flight, a boss battle whose damage numbers are the release numbers, a victory card.

## Same BPM, more bars

The 30-second cut is the same reel with longer holds (and optional scenes where they exist); the tempo never changes.

| Scene | short | 30 s |
|---|---|---|
| `ignite` | 2 | 3 |
| `town` | 2 | 3 |
| `flight` | 1 | 2 |
| `battle` | 2 | 4 |
| `finale` | 2 | 3 |

## Scenes

**`ignite`**: ignite (2 bars, 3 in the 30): a lantern in the dark. Black; on beat 0.5 a spark, and the hero's lantern catches: its light grows with a flicker and reveals a stone corridor (the light map multiplies the pixels, so only what the lantern reaches has colour). On 1.5 and 2 the two wall sconces catch from it, one each side (dynamic lights), dust turns in the light, near pillars sit blurred in the foreground. From beat 3 LANTERNFORGE is burned in left to right in gold with sparks at the burning edge; 2.0 stamps on 4.5; the line types on 5.5. The camera pushes in all the while. Out: the lantern flares until the frame is warm white (the next scene opens from it).

**`town`**: town (2 bars, 3 in the 30): every window lights. Opens on the warm white the lantern flared into, which fades to a town at dusk. The camera rises from the foreground rooftops (blurred, near, fast) up past the houses (sharp) to the sky (soft, far): three depths. From beat 1 the windows light, house by house from left to right, each lighting the wall around it (light map) and blooming; chimneys smoke in stepped puffs, fireflies drift over the roofs. On 4.5 the window opens with the feature: DYNAMIC LIGHTS. Out: clouds rush up past the camera.

**`flight`**: flight (1 bar, 2 in the 30): the Mode-7 world map. Opens from the clouds' white; the overworld (256 x 256 art pixels) is projected scanline by scanline at art resolution and shown at 5x, turning and gliding under a sunset sky; the airship rides on the left with its shadow on the ground and a little engine smoke; near clouds sweep past in front (blurred), far clouds behind. A window names the feature. Out: the battle transition takes over.

**`battle`**: battle (2 bars, up to 4 in the 30): the boss is a bug. The world map shatters into blocks that spin away (the classic battle transition) to a moonlit clearing: the brass beetle on the left breathing a pixel at a time with its runes pulsing violet, the party on the right. The command window picks HOT RELOAD (1.5): the hero dashes in, a gold slash, the boss flashes and shakes, 1,200 (2.5). The mage charges 3X FASTER (4) and the orb bursts in bloom, 2,700 (4.6). On 6 the whole party's 0.9 MS lands and on 6.5 the beetle breaks into its own pixels, flung out and fading. In the 30-s cut CLOUD SAVES heals the party (+57 GAMES) before the finish.

**`finale`**: finale (2 bars, 3 in the 30; the end card): victory. Rays of light turn slowly behind the logo; the party jumps on the downbeats (beats 0-2) in the clearing; LANTERNFORGE burns in gold with its 2.0 badge (1.5), the line and the facts type on (2-3): OPEN SOURCE · MIT, and the fictional-project note. Hold: fireflies, a lantern glow that breathes on the beat, the party keeps bobbing.

## Provenance and credits

- The material in `source/` was written for this example; the project is fictional and the reel says so on screen.
- Music and sound effects are synthesized by `audio/` (no samples).
- Fonts ship with their licences: `source/fonts/OFL-PixelifySans.txt`, `source/fonts/OFL.txt`.
