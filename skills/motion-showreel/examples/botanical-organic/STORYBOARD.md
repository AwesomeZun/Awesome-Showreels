# Mistfold storyboard and build contract

Timing lives in `reel.config.json`; this file holds the words and the choreography. Violations of "Copy rules" are
bugs. Guide: `../../references/storyboard.md`.

## 1. Brief

- **One sentence:** Mistfold grows tea slowly on one misty hillside and makes two things from the same bushes: a cup
  for the morning and a balm for the night.
- **One scene:** a tea sprig grows from a single seed on oat paper, leaf by leaf on the beat, beside "Grown slowly."
  (poster frame: either cut, t = 3.75 s, the end of the grow scene's in-phase; `reel.config.json` `"poster": 3.75`).
- **One message:** "Tea and balm from one quiet hillside." (the story's subtitle; the end-card line).
- **Audience / purpose / venue:** tea and skin-care customers / brand film / the website header and social feeds
  (often muted first: every idea is on screen as type; sound is the walking-pace guitar the brand asks for).
- **Languages:** en (British spelling in the material). No CJK copy.
- **Source material** (`source/`, written for this example; Mistfold is fictional):
  - `story.md`: the long story; every headline is one of its section titles.
  - `brand-notes.md`: voice and banned words, colour roles, type (Fraunces Soft 100, Alegreya Sans labels),
    illustration ("a fine loam ink line, then watercolour washes that pool darker at their edges"), motion ("one leaf
    per beat ... no bounce, no overshoot, no flashes, no hard cuts"), sound (acoustic, about 96 BPM), the seal rules,
    the closing disclaimer.
  - `site/index.html`, `site/tokens.css`: the labels and steeping numbers, the light and evening schemes.
  - `label/harvest-card.pdf`: the steeping captions, the balm's ingredients.
  - `images/seal.svg`: the seal; the reel draws it from this path data.

## 2. Copy rules (violations are bugs)

### 2.1 Exact strings

| id | String (verbatim) | Scene | Role | Source |
|---|---|---|---|---|
| c1 | `Mistfold Tea Garden · since 1962` | grow | kicker (label caps, tracked +12 %) | site hero kicker |
| c2 | `Grown slowly.` | grow | headline | story.md section "Grown slowly" (+ full stop, as the site sets its headline) |
| c3 | `Camellia sinensis` | grow | specimen label, italic | story.md "Tea is a camellia, *Camellia sinensis*." |
| c4 | `Green tea · spring first flush` | steep | kicker | site card label |
| c5 | `A cup at first light.` | steep | headline, "first light." in moss | story.md section title (+ full stop); brand-notes essence |
| c6 | `We pick only the bud and the two young leaves below it.` | steep (hold, 30 only) | subline | story.md "Picked by hand at first light" |
| c7 | `80 °C` `3 min` `2 g` with `water, just off the boil` `then pour it all` `to a small cup` | steep (hold, 30 only) | steeping notes, one per beat | site "How we steep it" and harvest card |
| c8 | `Balm · tea seed oil, beeswax and shea` | balm | kicker | site card label |
| c9 | `A balm at dusk.` | balm | headline, "dusk." in warm terracotta | story.md section title (+ full stop) |
| c10 | `DUSK BALM` `50 ML` | balm | the tin's label (caps) | product name; harvest card "50 ml" |
| c11 | `Pressed from the seeds our bushes set in autumn.` | balm (hold, 30 only) | subline | site card text |
| c12 | `MISTFOLD` `TEA GARDEN · 1962` | balm (lid), finale | the seal's own lettering | images/seal.svg |
| c13 | `Mistfold` | finale | wordmark | brand name |
| c14 | `Tea and balm from one quiet hillside.` | finale | tagline | story.md subtitle |
| c15 | `Fictional brand · illustrative` | finale | disclaimer | brand-notes "Films end with ..." |

Sentence case everywhere (the labels are set in capitals by style, exactly as the site's CSS does). No other words
appear on screen.

### 2.2 Banned wording

From brand-notes.md "Words we never use" and "Voice". Grep the strings scene code draws and read every frame for:

- `\borganic\b`: "we are not certified". (The folder is called `botanical-organic` after the theme; that word never
  appears on screen.)
- `all-natural|chemical-free|\bclean\b|detox|superfood|miracle`: "the words mean nothing", "no plant does that".
- `anti-?age?ing|\bheals?\b|\bcures?\b|\brepairs?\b`: "a balm is a cosmetic, not a medicine".
- `luxury|premium|exclusive`: "we are a farm".
- `!` and emoji: "No exclamation marks. No emoji. No superlatives."

### 2.3 Disclaimers

| Text | Scenes | Position (px) | Size | Min on screen |
|---|---|---|---|---|
| `Fictional brand · illustrative` | finale | right-aligned x = 1792, baseline y = 1012 | 20 px Alegreya Sans 500, tracked, `muted` `#66654F` (4.91:1 on oat) | 2.5 s (short), 5.0 s (30) |

### 2.4 Provenance

| On screen | Source | Notes |
|---|---|---|
| `since 1962`, `TEA GARDEN · 1962` | story.md, seal.svg | fictional founding year |
| `80 °C`, `3 min`, `2 g` | site/index.html "How we steep it", label/harvest-card.pdf | the brand's steeping guide (fictional brand) |
| `50 ML` on the tin | label/harvest-card.pdf "50 ml" | |
| The seal | images/seal.svg path data, drawn by `modules/botanica.js` | Terracotta on Oat (finale), Terracotta on the oat lid (balm): the two colourways the notes allow |
| Tea plant, flower, seed, cup, tin | illustration, drawn in code after the brand's illustration rules and the site's sprig | the plant's structure is an L-system (`modules/botanica.js`); leaf shapes keep serrated margins and alternate up the stem |
| Numbers | only the three above | no data claims |

## 3. Style summary (read-only; from `style.json`)

- **Theme / mood:** light (oat paper), one dark scene on the evening palette (`balm`, `"dark": true`) / calm,
  unhurried, earthy, botanical, warm, hand-drawn.
- **Palette roles:** bg `#F1E9D8` bg2 `#E6DAC2` surface `#F9F5EC` ink `#2B2F23` ink2 `#4F5242` muted `#66654F`
  accent (Moss) `#4F6B3A` accent2 (Sage) `#9BAF86` accent3 (Terracotta) `#C2673F` ok `#4F6B3A` warn `#A87A1F`
  deny `#9A4A2A`; extras gold `#D4A24A`, clay `#9A4A2A`, leaf `#7F9868`, bud `#B9C6A4`, stem `#5B4A36`, nightMoss
  `#1B2318`. Evening (paletteAlt): bg `#1B2318`, ink `#EFE7D4`, ink2 `#CFC7B0`, muted `#A39F88`, accent `#A9BE92`,
  accent3 `#D9845A`, gold `#E3B65E`.
- **Type:** display and serif `Fraunces Soft` (instances of the shipped Fraunces at SOFT 100, WONK 0; italic WONK 1),
  sans `Alegreya Sans` 400/500 for labels and small print; display weight 380 (never bold), body 400; scale
  `16 20 24 30 38 48 62 80 104 136 176`; labels tracked +0.12 em.
- **Motion:** calm; critically damped (spring f 1.9, z 0.95), overshoot 0, outQuint. Leaves land one per beat.
  Transitions: `match` (grow to steep, on the picked flush) and `cut` between identical frames: the scenes paint the
  wet-colour bleeds themselves (dusk floods in from the edges; dawn blooms out of the seal).
- **Carriers:** code-drawn vector only (L-system plants, watercolour washes, ink lines, the seal from its SVG).
- **Sound:** 96 BPM, D major; acoustic (guitar, marimba, upright bass, shaker); SFX family organic; no transition
  whooshes (`"audio": {"transitionSfx": false}`). Music and mix are stage 2.
- **Narration:** off ("Voice-over: none").

### Reserved regions

- Safe margins: 128 px left/right, 64 px top/bottom (the end-card disclaimer sits 68 px above the bottom edge).
- HUD: none. Captions: none.

## 4. Files and contract

- `modules/botanica.js` (project module, global `MISTFOLD`): oat and night-moss paper (fibres, flecks, mottling),
  dappled leaf light, smooth value noise, watercolour sprites (wash layers, edge pooling, granulation), serrated tea
  leaves, the L-system tea plant and its turtle, the ink-soak text reveal, label and subline reveals, the dusk
  flood and dawn bloom, fireflies and pollen, the seal drawn from `seal.svg`'s path data. Every scene uses it; no
  scene relies on another scene.
- `scenes/<id>.js`: one IIFE per scene, pure in `(t, env)`, `env.lt` only (ambient drift may anchor to the scene end
  where a boundary must match), full opaque frame (the paper) first.
- Hand-offs:
  - `grow -> steep` (`match`, 0.2 s fade): grow's out-phase pulls focus onto the flush (bud and two young leaves), the
    rest of the plant softens into the paper, sway eases to zero; steep's first frame draws the same flush from the
    same plant data with the same camera.
  - `steep -> balm` (`cut`): steep's out-phase floods night moss in from the edges (with `env.fx.dark` ramping the
    post); at the boundary the frame is the night paper alone, which is balm's first frame.
  - `balm -> finale` (`cut`): balm's out-phase blooms oat paper out of the seal on the closed lid; at the boundary the
    frame is the oat paper alone, which is finale's first frame.

## 5. Cuts

Bars per scene from `build/cut-<cut>.json` (96 BPM, bar = 2.5 s, beat = 0.625 s).

| Scene | min | max | priority | in | music | in/out beats | short (15 s) | 30 (30 s) |
|---|---|---|---|---|---|---|---|---|
| grow | 2 | 2 | 1 | - | intro | 6 / 2 | 2 · 0-5 s | 2 · 0-5 s |
| steep | 1 | 4 | 1 | match (fade 0.2 s) | groove | 3 / 1 | 1 (pinned) · 5-7.5 s | 4 · 5-15 s |
| balm (dark) | 1 | 4 | 1 | cut | breakdown | 3 / 1 | 1 (pinned) · 7.5-10 s | 3 · 15-22.5 s |
| finale | 2 | 3 | 1 | cut | outro | 6 / 0 | 2 (pinned) · 10-15 s | 3 · 22.5-30 s |

The in-phase of every scene is the same in both cuts; the 30-s cut only adds hold beats (onBars).

## 6. Scenes

Beats count from the scene start (beat 0 = its first bar line).

### 6.1 `grow`: Grown slowly.

- **Idea:** everything starts as a seed, and it is not hurried.
- **Carrier:** an L-system tea plant drawn as a botanical plate: loam ink stem, serrated leaves in watercolour, roots
  under an ink soil line, on oat paper with dappled leaf light.

| Beat | Element | Motion | Copy | Cue |
|---|---|---|---|---|
| 0-1 | soil line, ground wash | the ink line draws left to right under the seed; a sage-gold wash pools under it | - | `drawon` at 0 |
| 0-1 | seed | rests on the line, breathing | - | |
| 1 | seed | the coat splits; the root reaches down with fine hairs | - | `tick` at 1 |
| 1-1.5 | shoot | rises as a hook and straightens; the cotyledons open on 1.5 | - | `pop` at 1.5 |
| 2, 3, 4, 5, 6 | leaves | the stem surges between nodes; one leaf unfurls onto each beat (two mature, one adult, two young) | - | `pop:4 gap=1` at 2 |
| 6 | bud | the bud tops the flush; a dew drop forms on it and glints | - | `plink` at 6 |
| 1.5 | kicker | letters settle in, moss | c1 | |
| 2 | headline | ink soaks into the paper glyph by glyph (120 px, loam) | c2 | |
| 3.5 | specimen label | italic, with a hairline rule | c3 | |

- **Hold:** none (in 6 + out 2 = 2 bars in both cuts). The plant sways, pollen drifts, the light moves.
- **Out-phase (2 beats):** the camera pulls focus onto the flush: zoom 2.3x toward it, the rest of the plant, the
  roots and the type soften and sink into the paper, the sway eases to zero. Ends on the flush alone.

### 6.2 `steep`: A cup at first light.

- **Idea:** the bud and two leaves become the morning cup.
- **Carrier:** a stoneware cup seen from above on the oat paper; the flush; a pale-gold liquor that blooms like wet
  watercolour; steam as drifting washes; warm first light.

| Beat | Element | Motion | Copy | Cue |
|---|---|---|---|---|
| 0 | flush | identical to grow's last frame | - | |
| 0.5 | flush | picked: a small snap at the stem, then it falls away from the camera (shrinks, turns a quarter) | - | `snap` at 0.5 |
| 0.2-1.4 | cup | comes into focus beneath it (blur to sharp) | - | |
| 1.5 | flush | lands on the water: rings spread | - | `plink` at 1.5 |
| 1.5-3 | liquor | gold blooms out from the leaves with darker wet edges, filling the cup | - | |
| 0.75 | kicker | | c4 | |
| 1 | headline | ink soak, 96 px; "first light." in moss | c5 | |
| 2+ | steam | washes drift up and curl | - | |

- **Hold (30 cut, 3 bars):** steam keeps drifting, the flush turns slowly, the light breathes, a ring every bar.
  Bar 1: the subline reveals (`tick`). Bar 2: the steeping notes land one per beat (`tick:3 gap=1`). Bar 3: the
  liquor deepens and one more ring (`plink`).
- **Out-phase (1 beat):** dusk: night moss floods in from every edge with a darker wet front; the post darkens with
  it (`env.fx.dark`). Ends on night paper alone.

### 6.3 `balm` (dark): A balm at dusk.

- **Idea:** the same bushes, at night: their seed becomes the balm.
- **Carrier:** a tea flower (white petals, gold stamens) on a branch from the top edge, a drop of gold oil, an oat
  enamel tin with its terracotta seal on the lid; fireflies.

| Beat | Element | Motion | Copy | Cue |
|---|---|---|---|---|
| 0 | night paper | identical to steep's last frame; fireflies wake | - | |
| 0-0.75 | branch | draws in from the top edge with two dark leaves | - | |
| 0.25-1 | flower | opens onto beat 1; the stamens spread | - | `reveal` at 1 |
| 0.5 | kicker | | c8 | |
| 0.75 | headline | ink soak, 104 px; "dusk." in warm terracotta | c9 | |
| 0.5-1.5 | tin | the ink outline draws, the wash fills; the lid waits above it | c10 | |
| 1.25-2 | oil | a gold drop swells in the flower's heart, falls, lands in the tin on 2 | - | `plink` at 2 |
| 2.2-3 | lid | lowers and closes on beat 3; the seal sits on top | c12 | `thud` at 3 |

- **Hold (30 cut, 2 bars):** fireflies drift and pulse, a petal falls on every beat, the tin glows. Bar 1: the
  subline reveals (`tick`). Bar 2: the fireflies brighten together (`sparkle`).
- **Out-phase (1 beat):** dawn: oat paper blooms out of the seal on the lid until it fills the frame; the post
  lightens with it. Ends on oat paper alone.

### 6.4 `finale`: Mistfold

- **Idea:** the mark, the name, the line.
- **Carrier:** the seal pressed like a stamp, two tea branches growing into a wreath (L-system along arcs), the
  wordmark.

| Beat | Element | Motion | Copy | Cue |
|---|---|---|---|---|
| 0 | oat paper | identical to balm's last frame; the light comes back | - | |
| 0-6 | wreath | two branches grow up from the lower corners; leaves land alternately left and right, one per beat (1-6) | - | |
| 1 | seal | pressed: comes down from 1.08x, the terracotta ink spreads into the paper, a soft ring | c12 | `stamp` at 1 |
| 2 | wordmark | ink soak, 176 px, loam | c13 | |
| 3 | tagline | soft reveal, 38 px, bark | c14 | |
| 4 | disclaimer | fades in | c15 | |

- **Hold:** the wreath sways; pollen drifts in the light; on the hold's bar line a bud at a branch tip opens into a
  small white flower (`plink`).
- **Out:** none, the reel ends on the end card.

## 7. Audio (stage 2)

- Music parts: grow `intro`, steep `groove`, balm `breakdown` (dusk: drums out), finale `outro` (the sound logo on
  the seal press). Acoustic only, as the brand notes say: nylon-string guitar (Karplus-Strong), marimba, upright bass,
  brushed shaker. No synthesisers, no risers or whooshes: `"transitionSfx": false`.
- Every cue is in `reel.config.json`; picture and sound read the same plan. The four leaf pops rise on the
  pentatonic one beat apart (`pop:4 gap=1`); the seal press is the `stamp` on finale beat 1, where the brand's
  "three plucked notes rising" belong.

## 8. Narration

None ("Voice-over: none. Let the garden speak").

## 9. Steal sheet

No reference video. Borrowed grammar: botanical plates and herbarium labels (the specimen label), flat-lay food
illustration (the cup from above), wet-in-wet watercolour (blooms, pooled edges), the stamp recipe (motion-recipes
14, made calm: no bounce, ink spreads instead of splattering).
