# Example: swiss-grid

An architecture studio's project brief and brand sheet go in; an International Typographic Style reel comes out:
paper, ink and one signal red, a strict 12-column grid, a neo-grotesk set flush left with huge numerals, and motion
that snaps along grid lines and cuts hard on the beat. Nothing was picked from a preset: every decision below traces
back to a line in `source/`.

Büro Zwölf Architekten and Haus für Musik are fictional; every number is demo data.

| Cut | Bars @ 124 BPM | Scenes |
|---|---|---|
| `short` | 8 = 15.48 s | raster · schnitt · programm · ende |
| `30` | 15 = 29.03 s | raster · schnitt (+3 bars) · programm (+2) · ende (+2) |

Music and previews are stage 2 (the audio library has no minimal-techno preset yet).

- Demo (short cut, with its music): [`assets/demo-swiss-grid-v1.0.0.mp4`](../../../../assets/demo-swiss-grid-v1.0.0.mp4)
- Web version with every cut: [`dist/haus-fur-musik-v1.0.0.html`](dist/haus-fur-musik-v1.0.0.html) ([play in the browser](https://raw.githack.com/AwesomeZun/Awesome-Showreels/main/skills/motion-showreel/examples/swiss-grid/dist/haus-fur-musik-v1.0.0.html))
- Cuts: `short` (8 bars = 15.5 s), `30` (15 bars = 29.0 s), all at 124 BPM.

## Source

| File | What it contributes |
|---|---|
| `source/brief.md` | the project and every number on screen: 12 axes at 7.20 m, four floors at 3.60 m, hall on axes 5-8, programme 24 / 2 / 1 |
| `source/brand-sheet.md` | three colours, one typeface in two weights, the grid, drawing conventions, motion rules, sound, language |
| `source/tokens.css` | `--zw-*` tokens: colours, type sizes 16-480, grid 122 / 24 / 96 / 72, snap 60 ms, tempo 124 |
| `source/projektblatt.html` | the studio's project sheet, laid out from the tokens |
| `source/fonts/` | Schibsted Grotesk variable, SIL OFL 1.1 (`OFL.txt`), from google/fonts |

## From the source to the style

`tools/extract_style.py source` drafted the style (`build/style-extract.json`, `build/style.draft.json`,
`build/style-extract.md`). An honest account of the draft:

| Area | Draft got right | Draft got wrong | Final (`style.json`) |
|---|---|---|---|
| Theme / palette | light theme, paper `#F4F3EF`, ink `#111111`, signal red `#D52B1E`, line `#D2D1CE` | invented accent2 olive `#7A7100` and accent3 magenta `#C22F9E` (accent hue ±60°), a pink bg2, green / orange / pink status colours | three colours only; accent2 = ink, accent3 = paper; bg2 = 6 % ink grid field; status as ink / ink 70 % / red |
| Type | Schibsted Grotesk, 700 / 500 | added Source Serif 4, JetBrains Mono, Pretendard and Helvetica / Arial fallbacks; a modular scale topping at 228 px; 0.088 em tracked labels | one family for every role; the brand's own scale 16-480 px; labels untracked |
| Motion | pace medium, dataViz true, revealLine | overshoot 0.41, spring z 0.75, transitions zoomInto / impact / whip, kinetic blur reveal, "app-ui" and "web-shots" visual sources (because an HTML page existed) | overshoot 0, outExpo, cut and match only, wipes drawn inside scenes, vector only |
| Post | bloom 0 | grain 0.036, a red-brown vignette | no grain, no vignette, no bloom |
| Sound | sfx minimal | corporate strings / piano at 109 BPM in G major; it never read the sheet's "minimal techno, 124 BPM" | 124 BPM, minimal techno brief, kick / sub / rim / hats / stab |
| Narration | off | tag `[clear, upbeat]` | `[calm, even]` (no exclamation marks, no superlatives) |

Bias check: the draft did **not** fall into the two old looks (no pastel mascot, no dark neon). Its errors lean the
other way, toward a generic "friendly corporate" brand: it fills every accent slot with hue rotations even when the
material says "three colours and nothing else", it adds texture (grain, vignette) by default, it scores springy and
zooming transitions from energy axes, and it derives the tempo and genre from tone axes while ignoring an explicit
written BPM and genre. Restraint stated in prose ("no", "never", "only") is invisible to it.

## Scenes

- `raster`: twelve black columns count the beat and retract to uncover a 616 px `12`; the dimension chain draws on.
- `schnitt`: match cut on the chain; the section builds one floor per beat while the level rolls `±0.00` > `+14.40`; the hall turns red.
- `programm`: a black page for numbers: `24`, `2`, red `1`, one per sub kick; one fact per bar in longer cuts.
- `ende`: the black page retracts column by column onto the red square and `büro zwölf`; the stance typesets on eighth notes.

`modules/zwoelf.js` holds the drawing system (grid, snaps, column wipes, rolling numerals, section marks). See
`STORYBOARD.md` for the strings and beat-level choreography.

## Rebuild

```bash
S=skills/motion-showreel; P=$S/examples/swiss-grid
python3 $S/tools/extract_style.py --project $P --board   # the draft (style.json is hand-refined)
python3 $S/timing/plan_cut.py --project $P --cut short,30 --strict
node $S/runtime/stills.mjs --project $P --cut 30 --range 0:29:0.5 --out $P/build/review/30 --sheet
```
