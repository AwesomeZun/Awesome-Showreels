# Maison Veyrande · Les Heures Blanches: storyboard and build contract

Guide: `references/storyboard.md`. Timing lives in `reel.config.json`; this file holds words and choreography.

## 1. Brief

- **One sentence:** A fictional couture house presents its night collection, made by hand between midnight and dawn.
- **One scene:** the croquis of look 31 drawn by an ink pen beside "1,240" in Bodoni Moda (poster frame: cut `30`, t = `13.5`).
- **One message:** "Between midnight and dawn, the atelier keeps its own hours."
- **Audience / purpose / venue:** fashion press and the house's clients / brand (collection launch) / screen with sound, also muted autoplay.
- **Languages:** en, with the house's French names (look titles, season, date).
- **Source material:**
  - `source/press-release.md`: the story, the 31 looks, look 31 at 1,240 hours, the show music, the disclaimer.
  - `source/identity-notes.md`: palette roles, faces, margins, the motion and sound rules, banned words.
  - `source/lookbook-notes.md`: captions for five selected looks, the colour story and the walk's tempo.
  - `source/lookbook/index.html` + `tokens.css`, `source/lookbook.pdf`: the digital and printed lookbook (tokens, faces).
  - `source/sketches/look-*.svg`: the atelier's croquis; the reel draws these paths.

## 2. Copy rules (violations are bugs)

### 2.1 Exact strings

| id | String (verbatim) | Scene | Role |
|---|---|---|---|
| c1 | MAISON VEYRANDE | soie, finale | wordmark (tracked caps 0.32 em) |
| c2 | HAUTE COUTURE | soie | label |
| c3 | LOOK 31 · LA DERNIÈRE HEURE | atelier | kicker |
| c4 | 1,240 | atelier | headline numeral |
| c5 | hours of hand embroidery | atelier | sub (italic) |
| c6 | BY SEVENTEEN HANDS, OVER ELEVEN WEEKS | atelier | credit (hold bar 1) |
| c7 | Thirty-one looks | regard | headline (italic) |
| c8 | SELECTED CROQUIS · I–V | regard | label |
| c9 | LOOK 01 / MANTEAU DU SOIR, LOOK 07 / ROBE COLONNE, LOOK 12 / CAPE DE MINUIT, LOOK 19 / TAILLEUR BLANC, LOOK 31 / LA DERNIÈRE HEURE | regard | plate captions |
| c10 | Les Heures Blanches | finale | title (italic) |
| c11 | Between midnight and dawn, the atelier keeps its own hours. | finale | line |
| c12 | HAUTE COUTURE · AUTOMNE–HIVER 2026–2027 | finale | label |
| c13 | PARIS · 6 JUILLET 2026 | finale | label |
| c14 | Maison Veyrande is a fictional couture house. All names, looks, dates and figures are invented. | finale | disclaimer |

### 2.2 Banned wording

Source: `source/identity-notes.md`, "Tone of voice" and "Type".

- `!`: no exclamation marks.
- `(?i)luxur|exclusive|iconic|must-have|trend|affordable|sale|deal|revolutionary`: words the house does not use.
- `(?i)fashion line|outfit|factory|workforce`: say couture, look, the atelier, the hand.
- "Veyrande" alone in a title, "MV" outside the monogram, the house name in italics.
- Per-letter animation (typewriter, scramble, single-letter bounce): type is revealed from behind a mask.

### 2.3 Disclaimers

| Text | Scenes | Position (px) | Size | Min on screen |
|---|---|---|---|---|
| c14 | finale | centred, y ≈ 1040 | 16 px Jost, muted | the whole hold (≥ 1.5 s) |

### 2.4 Provenance

| Number / claim on screen | Source | Rounding / unit |
|---|---|---|
| 1,240 hours | `source/press-release.md`, `source/lookbook-notes.md` (look 31) | integer hours, comma separator |
| seventeen hands, eleven weeks | `source/lookbook-notes.md` (look 31) | spelled out |
| thirty-one looks | `source/press-release.md` | spelled out |
| 6 juillet 2026, Automne–Hiver 2026–2027 | `source/press-release.md` | French date style |

## 3. Style summary (read-only; from `style.json`)

- **Theme / mood:** light / elegant, refined, quiet, calm, minimal, editorial
- **Palette roles:** bg `#F3EEE4` bg2 `#E8E0D2` surface `#FAF7F1` ink `#16130F` ink2 `#4A443B` muted `#675F54` accent `#C8AD7F` accent2 `#E6DCD3` accent3 `#9C7F52` accentInk `#76592E` (ok/warn/deny are in-family dark inks, unused)
- **Type:** display/serif Bodoni Moda (opsz follows size, regular 400 only), sans Jost 500 tracked caps 0.3 em; scale 16-232 px
- **Motion:** pace calm, spring f 1.1 z 0.92, overshoot 0, ease outQuint; scene changes are 2-beat cross-dissolves and one match cut
- **Carriers native to the material:** vector only (satin shader, ink croquis, type); characters no; data viz no
- **Sound:** 80 BPM (bar = 3.0 s), D-flat major, preset ambient, piano + strings, drums none, SFX minimal
- **Narration:** off (Algieba, [soft, elegant], en-US if ever wanted)
- **Post:** film grain 0.055, warm vignette 0.15, no bloom

### Reserved regions

- Safe margins: 160 px left/right (1/12 of the width, `style.layout.margin`), 90 px top/bottom.
- No HUD, no captions.

## 4. Files and contract

- `scenes/<id>.js`: IIFE assigning `SCENES['<id>'] = { draw(ctx, t, env) }`; pure in `(t, env)`; elastic through `env.phase` (in / hold / out) and `onBars` / beat indices.
- Project modules, loaded before every scene (`window.VEYRANDE`):
  - `modules/veyrande-silk.js`: ivory duchesse satin as a WebGL2 shader lit by one moving lamp, with dust in the light.
  - `modules/veyrande-croquis.js`: the paths of `source/sketches/*.svg` drawn by an ink pen (pressure-varying stroke), plus the embroidery sewn along look 31.
  - `modules/veyrande-type.js`: masked line reveals (`maskRise`), tracked caps with tracking that closes, hairline rules with a travelling glint.

### Assets

None. Everything is drawn in code from the source's own paths, colours and fonts.

## 5. Cuts

80 BPM, 4/4: one bar = 3.0 s = 180 frames at 60 fps.

| Scene | min | max | priority | optional | in | music | short (5 bars, 15 s) | 30 (10 bars) |
|---|---|---|---|---|---|---|---|---|
| soie | 2 | 2 | 1 | no | cut | intro | 1 (compact, inBeats 3) | 2 |
| atelier | 2 | 3 | 1 | no | dissolve 1+1 beat | groove | 2 | 3 |
| regard | 2 | 3 | 2 | yes | match (fallback dissolve) | groove | out | 3 |
| finale | 2 | 2 | 1 | no | dissolve 1+1 beat | outro | 2 | 2 |

## 6. Scenes

### 6.1 `soie`: the house on silk

- **Idea:** the house name, on the material it is known for.
- **Carrier:** satin shader (one lamp drifting), the wordmark on a champagne hairline.
- **In:** cut from black-free ivory (reel start), inBeats 5 (3 in the short cut). **Out:** 1 beat, under the atelier dissolve.

| Beat | Element | Motion | Copy | Cue |
|---|---|---|---|---|
| 0 | satin + lamp | slow fold drift, lamp travels left to right | - | air (0.5) |
| 0.35 | wordmark | masked rise, its tracking closes slowly like a breath | c1 | - |
| 1.5 | hairline | draws out from centre, champagne | - | - |
| 2.75 | label | masked rise | c2 | - |
| 4 | glint | a light runs along the hairline (30 cut only) | - | - |

- **Hold plan:** satin folds and lamp keep moving; tracking keeps breathing in.
- **Short cut:** compact schedule (name 0, rule 0.5, label 1.5 beats), no glint.

### 6.2 `atelier`: 1,240 hours

- **Idea:** one gown took 1,240 hours of hand embroidery.
- **Carrier:** the ink croquis of look 31 (right third), the number in the text column (left, x = 160).
- **In:** 2-beat cross-dissolve from the satin. **Out:** type sinks behind its masks; the croquis stays (match into `regard`).

| Beat | Element | Motion | Copy | Cue |
|---|---|---|---|---|
| 0 | guides, croquis | faint centre line and head ticks, then the ink pen draws the figure over 5 beats | - | drawon dur=5 soft |
| 1 | kicker | masked rise, champagne hairline under it (1.2) | c3 | - |
| 1.5 | numeral | masked rise per glyph from the left, Bodoni at 232 px (hairline cut) | c4 | - |
| 2.7 | unit | masked rise, italic | c5 | - |
| 4.2-7 | embroidery | beads sewn along the bodice, dissolving toward the hem; the guides fade | - | sparkle dur=3 soft (4) |
| hold bar 1 | credit | masked rise | c6 | sparkle dur=1 soft (every bar) |

- **Hold plan:** a travelling light crosses the sequins; dust in the lamplight.
- **Grows in longer cuts:** the credit line appears only when there is a hold bar (30 cut).

### 6.3 `regard`: thirty-one looks (30 cut only)

- **Idea:** the gown is one of thirty-one; five are shown as the lookbook shows them.
- **In:** match cut: the gown starts on the atelier's last pixels, then steps back into the lineup. inBeats 7.

| Beat | Element | Motion | Copy | Cue |
|---|---|---|---|---|
| 0-2.75 | gown | steps back (push-out from the atelier framing) and settles into plate 5 | - | - |
| 1, 1.5, 2, 2.5 | plates 1-4 | open from vertical slits, fastest on the beat | - | flip x4 gap=0.5 soft (1) |
| 2.75 | headline | masked rise, italic | c7 | - |
| 3.25 | label | masked rise | c8 | - |
| 3.5-4.5 | captions | rise one per quarter beat | c9 | - |

- **Hold plan:** the lamp passes along the lineup; the plate under it gets a champagne hairline frame, one plate per beat; air on each hold bar.
- **Out:** 1 beat under the finale dissolve.

### 6.4 `finale`: Les Heures Blanches

- **Idea:** the collection's name and its line; the reel closes on the silk where it opened.
- **In:** 2-beat cross-dissolve. **Out:** outBeats 0, the reel ends on this card.

| Beat | Element | Motion | Copy | Cue |
|---|---|---|---|---|
| 0 | title | masked rise, italic 150 px, already rising through the dissolve | c10 | air (0.25) |
| 1-2.4 | monogram | champagne foil ring appears, M over V; a light crosses it at 1.4 | - | - |
| 1.25 | wordmark | masked rise above the title, hairline at 1.6 | c1 | - |
| 2.25 | line | masked rise | c11 | - |
| 3, 3.5 | season, date | masked rise | c12, c13 | - |
| 4 | foil sweep + disclaimer | a light crosses the foil again; the disclaimer fades in | c14 | sparkle dur=1.5 soft |

- **Hold plan:** lamp keeps moving on the satin; on each hold bar a light crosses the foil again.

## 7. Audio (stage 2)

- Piano and string quartet nocturne, D-flat major, 80 BPM; no drums, no risers, no stings (identity notes).
- intro (soie): solo piano; groove (atelier, regard): strings enter under the piano; outro (finale): the last chord rings out to the end.
- SFX minimal and soft; cues are in `reel.config.json`.

## 8. Narration

Off. The reel is music-led; every idea is one line of type.

## 10. Open questions

- None for stage 1. Stage 2 needs a piano + strings bed in the audio library (the current `ambient` preset is the nearest).
