# Haus für Musik storyboard and build contract

Timing lives in `reel.config.json`; this file holds words and choreography. Every builder, reviewer and the audio
follow it. Violations of "Copy rules" are bugs.

## 1. Brief

- **One sentence:** Büro Zwölf won the Haus für Musik competition with one structural grid: 12 axes, 7.20 m apart.
- **One scene:** the black columns retract into the top edge and uncover a 616 px "12" (poster frame: t = 3.6 s, both cuts).
- **One message:** "Ein Raster für den Raum. Ein Takt für die Zeit." / "A grid for space. A beat for time."
- **Audience / purpose / venue:** architects, clients, competition juries / portfolio and brand film / screen with sound, also muted.
- **Languages:** German headings with English second (as the brand sheet sets them); no CJK.
- **Source material:**
  - `source/brief.md`: the project (12 axes at 7.20 m, four floors at 3.60 m, hall on axes 5-8, programme 24 / 2 / 1, 600 pupils, areas).
  - `source/brand-sheet.md`: three colours, one typeface, the 12-column screen grid, drawing conventions, motion and sound rules, language rules.
  - `source/tokens.css`: `--zw-*` colours, type sizes 16-480, grid 122 / 24 / 96 / 72, snap 60 ms, tempo 124.
  - `source/projektblatt.html`: the studio's project sheet built from the tokens (layout evidence for the extractor).
  - `source/fonts/`: Schibsted Grotesk variable (OFL 1.1, `OFL.txt`).

## 2. Copy rules (violations are bugs)

### 2.1 Exact strings

| id | String (verbatim) | Scene | Role |
|---|---|---|---|
| c1 | `Raster / Grid` | raster | kicker (with `01`) |
| c2 | `12` | raster | headline numeral |
| c3 | `Achsen, 7.20 m Achsmass.` | raster | sub (German) |
| c4 | `12 axes, 7.20 m apart.` | raster | sub (English) |
| c5 | `7.20`, `79.20 m` | raster, schnitt | dimension labels |
| c6 | `Schnitt / Section` | schnitt | kicker (with `02`) |
| c7 | `±0.00`, `+3.60`, `+7.20`, `+10.80`, `+14.40` | schnitt | rolling level numeral |
| c8 | `Vier Geschosse à 3.60 m.` / `Four floors, 3.60 m each.` | schnitt | sub |
| c9 | `Saal / Hall`, `Ensemble`, `Bibliothek / Library`, `Foyer`, `Büro, Lager` | schnitt (hold) | room labels |
| c10 | `Programm / Programme` | programm | kicker (with `03`) |
| c11 | `24`, `2`, `1` | programm | numerals (the `1` red) |
| c12 | `Übungsräume / practice rooms`, `Ensembleräume / ensemble rooms`, `Saal, 240 Plätze / hall, 240 seats` | programm | labels |
| c13 | `600` `Schülerinnen und Schüler / pupils`; `4’562` m² `Geschossfläche / gross floor area`; `1’980` m² `Grundstück / plot` | programm (hold) | facts |
| c14 | `büro zwölf` | ende | wordmark (with the red square) |
| c15 | `Haus für Musik` | ende | title |
| c16 | `Wettbewerb 2026, 1. Rang / Competition 2026, first prize` | ende | sub |
| c17 | `Ein Raster für den Raum.` / `Ein Takt für die Zeit.` | ende | stance (Bold) |
| c18 | `A grid for space.` / `A beat for time.` | ende | stance (Medium, ink 70 %) |
| c19 | `Jury Juni 2026 / jury June 2026`; `Weiterbearbeitung ab Herbst 2026 / further development from autumn 2026` | ende (hold) | colophon |
| c20 | `Fictional studio and project, demo content.` | ende | disclaimer |

### 2.2 Banned wording

Source: `source/brand-sheet.md` (language).

- `!`: no exclamation marks.
- `ß`: Swiss spelling, always `ss` (`Achsmass`).
- `\b(best|unique|revolutionary|stunning|iconic|einzigartig)\b`: no superlatives.

### 2.3 Disclaimers

| Text | Scenes | Position (px) | Size | Min on screen |
|---|---|---|---|---|
| Fictional studio and project, demo content. | ende | flush left x = 96, y ≈ 998 | 16 px, muted | whole card (≥ 3 s) |

### 2.4 Provenance

Every number on screen is computed from `source/brief.md`; the drawing is vector, drawn in code by
`modules/zwoelf.js`. No captures, no photos, no generated images.

## 3. Look rules (from the brand sheet)

- Paper `#F4F3EF`, ink `#111111`, signal red `#D52B1E`; ink tints only for grid fields and secondary text. One red element per page.
- 12 columns of 122 px, 24 px gutters, 96 / 72 px margins, 6 rows; everything flush left, ragged right, on a column edge.
- Snap in one eighth of a beat (outExpo), stop dead: no overshoot, rotation, zoom, blur, glow or fade. Numbers roll digit by digit.
- Wipes run along the columns a sixteenth (or sixty-fourth) apart; scene changes are hard cuts on the bar line.
- The column strip at the bottom marks the current beat: it is the reel's metronome and keeps every hold alive.

## 4. Scenes

Bars at 124 BPM (bar 1.935 s). Short cut: 8 bars = 15.48 s. Cut `30`: 15 bars = 29.03 s.

| # | id | short | 30 | In | Choreography | Hold (longer cuts) | Out |
|---|---|---|---|---|---|---|---|
| 1 | raster | 2 | 2 | cut | Bar 1: grid fields + red square; columns fill black one per sixteenth (count to 12); beat 3 they retract a 64th apart and uncover `12`. Bar 2: kicker and sub snap on the downbeat; dimension chain on beat 5, bay labels on 6, `79.20 m` on 7. | none (fixed 2 bars) | chain stays put |
| 2 | schnitt | 2 | 5 | match (chain) | Beat 0 ground line, 12 axes rise a 64th apart; beats 1-4 one floor per beat while the level rolls `±0.00` > `+14.40`; beat 5 the hall on axes 5-8 fills red; from beat 6 the beat walks the axis circles. | bar 1: 24 practice rooms numbered per 32nd; bar 2: 240 seats fill row by row; bar 3: rooms named | columns fall black from the top, 12 within the last beat |
| 3 | programm | 2 | 4 | cut (black to black) | One numeral per beat on the sub kick: `24`, `2`, red `1`; rule across the columns on beat 3. | one fact per bar line: 600, 4’562 m², 1’980 m² | nothing leaves; hard cut |
| 4 | ende | 2 | 4 | cut | Black page retracts column by column within beat 1, uncovering the red square + `büro zwölf`; title, sub, stance and disclaimer typeset on eighth notes. | beat strip walks; one colophon line per bar line | the reel ends on it |

## 5. Sound (stage 2)

Minimal techno, 124 BPM, 4/4: dry sub kick on every beat, clicks on the sixteenths, one short stab per bar, no pads,
no reverb tails, no vocals. Cues in `reel.config.json`: a tick per column fill, a thud on the uncover and on every
numeral, clicks on every snap. Music sections: intro (raster), groove (schnitt), drop (programm), outro (ende).

## 6. QA record (stage 1)

- `plan_cut.py --cut short,30 --strict`: both clean, boundaries on bar lines (short 8 bars, 30 = 15 bars).
- Stills: both cuts at 0.25 s / 0.5 s steps, sheets reviewed.
- `motion_qa.py` on silent ultrafast drafts: PASS for both cuts (no frozen run > 0.5 s; the flagged "pops" in the
  hook are the intended column snaps on sixteenths).
