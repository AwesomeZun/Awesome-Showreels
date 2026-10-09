# Lanternforge 2.0 — release notes

Lanternforge is an open-source engine for 16-bit-style role-playing games. Version 2.0 is the biggest release yet.

## Highlights

- **Tilemap editor.** Paint towns, dungeons and world maps in the browser; layers, autotiles, collision.
- **Dynamic lights.** Torches, lanterns and day/night, on a real 16-bit palette.
- **Depth & bloom.** Layers with depth of field, light shafts and bloom over crisp pixel art.
- **Mode-7 world map.** The rotating, tilting overworld everyone remembers, in 40 lines of your code.
- **Hot reload.** Change a map or a script and see it in the running game in under a second.
- **3x faster.** The renderer draws a full 384 x 216 screen in 0.9 ms on a 2018 laptop.
- **Cloud saves.** Optional, self-hostable.

## Numbers

| | 1.x | 2.0 |
|---|---|---|
| Frame time (full screen) | 2.7 ms | 0.9 ms |
| Contributors | 61 | 148 |
| Games shipped | 23 | 57 |

## Tone

We are a community of hobbyists. Our docs talk like a friendly innkeeper: warm, a little dramatic, never corporate.
Release trailers should feel like the opening of the games people make with it: a title screen, a town, a battle,
a victory fanfare.

## Look

- 384 x 216 canvas (16:9), whole-number scaling.
- 32-colour palette (palette.txt), ramps of 4 per hue, dithering allowed.
- Classic blue windows with a white double border; the DotGothic16 pixel face (SIL OFL 1.1, fonts/).

MIT licensed. Lanternforge is a fictional project made for this example; its numbers are demo data.
