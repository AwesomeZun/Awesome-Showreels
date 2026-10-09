# Example: pixel-jrpg (Lanternforge 2.0)

An open-source RPG engine's release notes and 32-colour palette go in; a 16-bit trailer comes out, shaped like the games people make with it: a Mode-7 title screen, a town with a typewriter dialog, a turn-based battle where the release's features are the attacks and its numbers are the damage, and a victory fanfare. Nothing here picks a preset: palette, type, motion and music come from `source/` and are written to `style.json` with the reasoning for every decision.

- Web version with every cut: [`dist/lanternforge-v1.0.0.html`](dist/lanternforge-v1.0.0.html) ([play in the browser](https://raw.githack.com/AwesomeZun/Awesome-Showreels/main/skills/motion-showreel/examples/pixel-jrpg/dist/lanternforge-v1.0.0.html))
- Cuts: `short` (8 bars = 16.0 s), `30` (15 bars = 30.0 s), all at 120 BPM.

> Lanternforge 2.0 is fictional. Every name, number and screen is demo content made for this example.

## Folder

```
pixel-jrpg/
  source/                 4 file(s)
    RELEASE.md
    fonts/DotGothic16-Regular.ttf
    fonts/OFL.txt
    palette.txt
  modules/                1 file(s)
    jrpg.js
  scenes/                 4 file(s)
    battle.js
    title.js
    town.js
    victory.js
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
node $S/runtime/build.mjs --project $P --cuts short,30 --out out/lanternforge.html
```

## What the tone pass decided

- **palette.** The engine's 32 colours (palette.txt) in ramps of four; sky gradients and lights step through a ramp instead of blending. Windows use the classic navy-to-royal fill with a white double border.

- **type.** DotGothic16, the face the docs use, rendered on the 384 x 216 grid and thresholded so every glyph pixel is crisp.

- **motion.** A 16-bit trailer: a Mode-7 world map that rotates and tilts under the logo, a town walk with a typewriter dialog, a turn-based battle where the engine's features are the attacks and the numbers are damage, and a victory fanfare. Sprites animate on a 10-fps step clock.

- **sound.** 'A little dramatic' (RELEASE.md): cinematic strings, a saw lead motif, toms and a half-time snare at 120 BPM in D minor; the fanfare resolves on the end card.

- **visuals.** Everything is drawn in code on the grid: the Mode-7 plane samples a generated tilemap per scanline, sprites are pixel strings, windows and damage numbers are the UI of the games the engine makes.

## Same BPM, more bars

The 30-second cut is the same reel with longer holds (and optional scenes where they exist); the tempo never changes.

| Scene | short | 30 s |
|---|---|---|
| `title` | 2 | 3 |
| `town` | 2 | 3 |
| `battle` | 2 | 5 |
| `victory` | 2 | 4 |

## Scenes

**`title`**: title (2 bars, 3 in the 30): the title screen. A Mode-7 overworld rotates and tilts under a stepped dusk sky (beats 0-3, the camera sweeping in); on beat 3 LANTERNFORGE slams down letter by letter with a gold outline; 2.0 stamps beside it on beat 4; the subline types and PRESS START blinks from beat 5. 30-s hold: the world keeps turning, a lantern glow pulses on each beat behind the logo.

**`town`**: town (2 bars, 3 in the 30): a town square in three-quarter view (cobbles, roofs, a fountain, lanterns that flicker). The hero walks in from the left in two-frame steps and stops by the innkeeper; on beat 2 the dialog window opens (a stepped grow) with the innkeeper's portrait and the release news types on, a page per two beats, the blinking arrow waiting for the button. 30-s hold: the second page, a lantern lighting up with the new dynamic lights.

**`battle`**: battle (2 bars, up to 4 in the 30): the engine's features are the attacks. A screen-tear transition (beat 0) into a side-view battle: a giant BUG boss on the left, the party of three on the right over a battle backdrop. The command window's cursor picks HOT RELOAD (beat 2), the hero dashes, the boss flashes and 1,200 rises on beat 3; the mage casts 3x FASTER (beat 5) for 2,700; on beat 6.5 the boss breaks into pixels. 30-s hold: the knight's CLOUD SAVES heals the party (+57 games) and the enemy HP bar is shown empty.

**`victory`**: victory (2 bars, 3 in the 30; the end card): the fanfare. The party raises its weapons in turn (beats 0-1) under VICTORY!; the spoils window types the release's numbers as experience (148 CONTRIBUTORS, 57 GAMES SHIPPED, 0.9 MS A FRAME) on beat 2, LEVEL UP: 2.0 flashes on beat 3; the end card on beat 4: the logo, the line, MIT and the fictional-project note. Hold: sparkles orbit the logo, the party bobs.

## Provenance and credits

- The material in `source/` was written for this example; the project is fictional and the reel says so on screen.
- Music and sound effects are synthesized by `audio/` (no samples).
- Fonts ship with their licences: `source/fonts/OFL.txt`.
