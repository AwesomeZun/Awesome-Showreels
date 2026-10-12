# Example: offgrid (OFFGRID)

A real web app goes in: **OFFGRID**, a toyz original, a local map off the tourist grid: alley cafés, bakeries,
bookshops and workshops left by locals, walks drawn between them point by point, shared in one link. The reel
follows the brief GitReels gives its one-shot reel writer (a dynamic 15-second 2D motion-graphics reel in a style
tied to the core of the project; the name and what it is within 2 seconds; one core message; at most four scenes;
every text readable), in Korean like the app, and grows a 30-second cut at the same tempo. The map is the app's own
(OpenStreetMap under its dark filter), the places and the walk are its fictional sample data.

- Web version with every cut: [`dist/offgrid-v1.0.0.html`](dist/offgrid-v1.0.0.html) ([play in the browser](https://raw.githack.com/AwesomeZun/Awesome-Showreels/main/skills/motion-showreel/examples/offgrid/dist/offgrid-v1.0.0.html))
- Cuts: `short` (6 bars = 15.0 s), `30` (12 bars = 30.0 s), all at 96 BPM.

> OFFGRID is a real app (a toyz original, Chrome Club collection). The places and the walk are its fictional sample
> data; the map is OpenStreetMap (© OpenStreetMap contributors) under the app's own dark filter.

## Folder

```
offgrid/
  source/                 5 file(s)
    README.md
    fonts/JetBrainsMono-latin-wght.woff2
    fonts/OFL-JetBrainsMono.txt
    fonts/OFL-Pretendard.txt
    fonts/PretendardVariable.woff2
  assets/                 20 file(s)
    captures/ui/app/detail.json
    captures/ui/app/detail.webp
    captures/ui/app/geo_route.txt
    captures/ui/app/geo_z14.txt
    captures/ui/app/geo_z16.txt
    captures/ui/app/hoods.json
    captures/ui/app/hoods.webp
    captures/ui/app/layers.json
    ... 12 more
  modules/                1 file(s)
    offgrid.js
  scenes/                 5 file(s)
    end.js
    hook.js
    places.js
    route.js
    share.js
  capture/                2 file(s)
    map.json
    ui.json
  style.json
  reel.config.json
  STORYBOARD.md
  dist/
```

## Run it

```bash
S=skills/motion-showreel; P=$S/examples/offgrid
python3 $S/tools/extract_style.py --source $P/source --project $P --board      # draft style (review by hand)
python3 $S/timing/plan_cut.py --project $P --cut short,30
for c in short 30; do python3 $S/audio/arrange.py --project $P --cut $c; done
python3 $S/audio/verify_sync.py --wav $P/build/music-short.wav --cut $P/build/cut-short.json
node $S/runtime/render.mjs --project $P --cut short --out out/offgrid-short.mp4
node $S/runtime/build.mjs --project $P --cuts short,30 --out out/offgrid.html
```

## How it was made

1. **The brief.** GitReels' one-shot prompt and its clarity rules (name and what it is in the first 2 s, one core
   message, at most four scenes in the 15-second cut, readable text). The core message is the app's own line:
   관광지 밖에서 찾는 나만의 로컬 지도.
2. **The real map, registered.** `capture/map.json` drives the app's production build (served locally; not
   committed) with reduced motion, so it jumps rather than flies: Seoul at zoom 14, Seongsu at 16 and the Seongsu
   walk at 17, each with the app's panels, pins and lines hidden and the pins' screen positions dumped
   (`geo_*.txt`); the reel fits each capture to Web Mercator from those pins (to under a pixel). `capture/ui.json`
   captures the app's title slab, a place's card, the walk's card and its share dialog (its link shown with the
   deployed address). Captures are stored as WebP.
3. **One camera.** `modules/offgrid.js` draws whichever captures cover a camera (lat, lng, zoom), the closer zoom
   feathered in over the wider one, so the hook is one push from Seoul into an alley; pins, the walk's line and the
   slab are drawn from the app's CSS and icon paths, and the walk's distance and time count up to the app's own
   figures (1.39km, 19분).

## What the tone pass decided

- **palette.** The app's two colours: lime #D7F75B (pins, the walk, the title slab) on near-black #0B0B0C / #141416 / #1B1B1E, text #F3F3EE / #C4C4BC / #95958D; the second walk's cyan #7DF9FF appears only on the overview.

- **type.** Pretendard Variable at 900 for the name in the app's slab (black on lime, -0.062em) and 800 for headlines in warm white over the dark map; JetBrains Mono capitals for the app's labels (LOCAL MAP / SEOUL, 01 SEONGSU).

- **motion.** A camera over a real map: one continuous push from Seoul to an alley in Seongsu across three captured zoom levels, pins that drop in, a walk that draws itself at walking pace while a dot walks it and the distance counts up.

- **sound.** Swing in Bb major at 96 BPM (6 bars in 15 s, 12 in 30 s): an unhurried walking groove for a map of strolls, with soft organic SFX for pins and steps.

- **visuals.** Four scenes in the 15 s cut: the push from Seoul into Seongsu under the name and the app's line; the alley places dropping onto the map with a place's own card; the Seongsu walk drawing itself with its distance and time; the end card. The 30 s cut adds the share link.

- **narration.** Not recommended: a short, muted launch reel with slogan-length Korean copy shown as type.

## Same BPM, more bars

The 30-second cut is the same reel with longer holds (and optional scenes where they exist); the tempo never changes.

| Scene | short | 30 s |
|---|---|---|
| `hook` | 2 | 2 |
| `places` | 1 | 2 |
| `route` | 2 | 3 |
| `share` | - | 2 |
| `end` | 1 | 3 |

## Scenes

**`hook`**: hook (2 bars): from Seoul to an alley. The app's dark map of Seoul with its four neighbourhoods (01 성수 · 02 연남 · 03 을지로 · 04 서촌, each a cluster of lime dots); the camera pushes east and down into Seongsu in one continuous move across the captured zooms while the dots become pins. On the left the app's lime title slab drops in at once: OFFGRID, and the app's line, 관광지 밖에서 찾는 / 나만의 로컬 지도.

**`places`**: places (1 bar; 2 in the 30): alley places. The push goes on into Seongsu at street level; the app's seven Seongsu places stand on the map as its own pins and bounce in turn (category icon, dashed for 가고 싶어요, a lime dot for favourites) with their names; 붉은벽돌 커피 lights up as selected and its card (the app's own, captured) slides in on the left. The headline: 골목 가게를 / 지도에 남겨요.

**`route`**: route (2 bars; 3 in the 30): a walk. The camera settles at street level over the app's Seongsu walk (성수 붉은벽돌 골목 한 바퀴, its own ten points); the walk draws itself as the app draws a selected route (dark casing, soft glow, lime line) with a dot walking at its head, the five places on the way lighting as it passes them. On the left the walk's own card (captured): its distance and time count up with the walk to the app's figures, 1.39km and 19분, and its list of places lights in step. The headline: 걷고 싶은 길을 / 코스로 이어요.

**`share`**: share (2 bars, the 30 only): one link. The walk stays drawn on the map, the camera easing back a little; the app's own share dialog rises (코스 1개 · 장소 5곳을 링크 하나에 담았어요), its link (as it reads on the deployed app) is swept in lime, and 링크 복사 is pressed on the beat. The headline: 링크 하나로 / 그대로 나눠요.

**`end`**: end (1 bar; 3 in the 30): the end card over the app's dark map of Seoul, drifting slowly: its lime title slab with the name and the app's line, the address in a dark pill and, at the foot, where it comes from (toyz original, Chrome Club collection). Up by 0.4 s so the one-bar cut still reads.

## Provenance and credits

- The app, its design, its README (`source/README.md`) and its sample data belong to the toyz project (a toyz original); the captures are of its production build.
- Map data and map tiles © OpenStreetMap contributors, available under the Open Database License (https://www.openstreetmap.org/copyright); the attribution stays on screen whenever the map is visible.
- Music and sound effects are synthesized by `audio/` (no samples).
- Fonts ship with their licences: `source/fonts/OFL-JetBrainsMono.txt`, `source/fonts/OFL-Pretendard.txt`.
