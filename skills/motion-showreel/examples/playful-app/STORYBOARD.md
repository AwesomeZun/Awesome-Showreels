# Mochi Notes storyboard and build contract

Timing lives in `reel.config.json`; this file holds the words and the choreography. Violations of "Copy rules" are
bugs. Guide: `../../references/storyboard.md`.

## 1. Brief

- **One sentence:** Mochi Notes is a cheerful note app whose squishy helper turns one messy jot into tidy to-dos,
  reminders and tags.
- **One scene:** Mochi springs up in front of its pastel halo above the two-tone wordmark (poster frame: cut `short`,
  t = 3.0 s; `reel.config.json` `"poster": 3.0`).
- **One message:** "Jot it down. Mochi tidies up!" (the README tagline; the end-card line).
- **Audience / purpose / venue:** consumers / launch teaser / README loop and social autoplay (muted first: every idea
  is on screen as type; sound is a bonus).
- **Languages:** en (US). No CJK copy.
- **Source material** (`source/`, written for this example):
  - `README.md`: tagline, feature lines, the example note, flavors table, the fictional-project disclaimer, tone
    (emoji, '!', second person, 6 words per sentence).
  - `logo.png`: the app-icon tile with the plush strawberry mochi and the two-tone Nunito Black wordmark.
  - `app.html`: the demo app. Its CSS tokens are the palette; its flavor blocks give the four flavor colours; it is
    captured as real UI (`capture/app.json`).
  - `fonts/Nunito.ttf` (+ `OFL.txt`): the app's and the logo's face, embedded in every output.

## 2. Copy rules (violations are bugs)

### 2.1 Exact strings

| id | String (verbatim) | Scene | Role | Source |
|---|---|---|---|---|
| c1 | `Too many` / `thoughts?` | hook | headline (2 lines) | README "Too many thoughts?" |
| c2 | `Mochi Notes` | brand, finale | wordmark ("Mochi" ink, "Notes" accentStrong) | logo.png |
| c3 | `Jot it down.` | app | headline line 1 | README tagline |
| c4 | `Type anything. Messy is fine!` | app | subline (typing phase only) | README feature line |
| c5 | `Mochi tidies up!` | app | headline line 2, "tidies up!" in accentStrong | README tagline |
| c6 | `Oat milk` | app | chip (check icon) | app output (result card row 1) |
| c7 | `Call Mom · Fri 3:00 PM` | app | chip (clock icon) | app output (row 2: "Call Mom" + "Fri 3:00 PM") |
| c8 | `Pastel calendar` | app | chip (spark icon) | app output (row 3) |
| c9 | `#errands #family #ideas` | app | tag chip | app output (tags) |
| c10 | `Pick a flavor!` | flavors | headline; "flavor!" letters in the four flavor inks | README feature line |
| c11 | `Strawberry` `Matcha` `Ube` `Yuzu` | flavors | labels, each in its flavor ink | README flavors table |
| c12 | `Jot it down. Mochi tidies up!` | finale | tagline | README tagline |
| c13 | `Fictional app · demo content` | finale | disclaimer | README disclaimer |
| c15 | `Gentle nudges.` | nudge (60 only) | headline, "Gentle" in accentStrong | README feature line |
| c16 | `Friendly reminders, never naggy.` | nudge | subline | README feature line |
| c17 | `Fri 3:00 PM` | nudge | label beside the clock | app output (result card row 2) |
| c18 | `Yours only.` | private (60 only) | headline, "only." in accentStrong | README feature line |
| c19 | `Notes stay on your phone.` | private | subline | README feature line |
| c20 | `Works offline, too!` | private | second subline, matcha ink | README feature line |
| c14 | messy scraps: `oat milk??` `call mom` `fri 3pm!` `reply to Sam` `dentist?` `water plants` `pay rent` `buy stamps` `passwords??` `idea: pastel calendar` `laundry` `Jo's bday!!` `yoga 7am` `book club` `don't forget!!`; far layer `milk` `keys?` `gym` `bills` `plan trip` `taxes` `mail` `meds` `snacks` `rsvp` `call Jo` `ideas`; near layer `oat milk` `!!` `call mom` `to-do`; hold extras `tea refill` `rsvp!!` `umbrella?` | hook | illustrative scraps (authored, from the README's "Groceries, birthdays, that big idea at 2 a.m.") | authored |

The phone status bar shows `9:41` (decorative, drawn in vector). Everything inside the phone is the captured app.

### 2.2 Banned wording

The source never calls Mochi an AI and says there is nothing to download. Grep the strings scene code draws and read every frame for:

- `\bAI\b|artificial intelligence|machine learning|\bLLM\b|\bGPT\b`: Mochi is "your squishy little helper"; the demo
  is an on-device rule-based tidier.
- `download|App Store|Google Play|available now|get it on`: "There is no app to download".
- `\bfree\b|\$\d|price`: the source names no price.
- `secure|encrypt|private by design|privacy`: the source says "Notes stay on your phone. Works offline", nothing more.
  The `private` scene says exactly c18-c20; its lock badge is the README's own 🔒 for that line, and the bubble and
  the bouncing clouds illustrate "stays on your phone", not a security claim.

### 2.3 Disclaimers

| Text | Scenes | Position (px) | Size | Min on screen |
|---|---|---|---|---|
| `Fictional app · demo content` | finale | right-aligned x = 1856, baseline y = 1036 | 18 px, Nunito 700, `muted` (`#7F6E73`, 4.5:1 on bg) | 2.5 s (short), 4.5 s (30), 6.5 s (60) |

### 2.4 Provenance

| On screen | Source | Notes |
|---|---|---|
| Phone screens, bubble, tidy card, result card, flavor screens | `source/app.html` captured with `tools/capture_ui.mjs` (`capture/app.json`, 2026-10-07) | layers at 1 CSS px = 1 reel px, dpr 3 |
| Typing | the captured bubble raster (`note.png` + `note.textfree.png` + rows) revealed at 36 characters/s | re-timed (the capture typed at 20 ms per key) |
| Tidy card states | the app's five states set on a static clone (`steps_0..4`) | re-timed: 3/4 beat (375 ms) per step; the app's own timing is 600 ms per step (`tidying.json`) |
| Ticked "Oat milk" (holds, flavors) | the app's own click handler (`result_checked`, `flavor_*`) | reachable state |
| Chips c6-c9 | the app's real output for the README's example note | redrawn in vector at reel size, same strings |
| Mochi and the app icon | drawn in code (`modules/mochi-cast.js`) after `source/logo.png` | colours = `style.json` flavor swatches |
| Reminder card (nudge) | the real "Call Mom · Fri 3:00 PM" item cut from the captured result card (`result`, its second item = measured text row 4); its bell glyph is cut from the same raster and swings | scaled 2.4x; the card shape is drawn |
| Clock face (nudge) | illustration | hands sweep to 3:00, the time the app produced |
| Phone screen (private) | the app's final captured screen (`final`) | the bubble, clouds, lock and offline badges are illustrations |
| Numbers | only `Fri 3:00 PM` (app output) and `9:41` (status bar) | no data claims |

## 3. Style summary (read-only; from `style.json`)

- **Theme / mood:** light / playful, bouncy, friendly, energetic, warm.
- **Palette roles:** bg `#FFF7F2` bg2 `#FDEBEF` surface `#FFFFFF` ink `#46303D` ink2 `#856B7A` muted `#7F6E73`
  accent `#FF8FAF` accent2 `#B9A3F3` accent3 `#92D2A6` ok `#28A36D` warn `#C68200` deny `#EC5D73`; extras
  accentStrong `#E2567D`, accentInk `#B84F71`, flavors strawberry/matcha/ube/yuzu `#FF8FAF #8FD1A3 #B9A3F3 #FFD066` and
  their inks `#E2567D #3A9861 #7A5CD6 #C2850B`.
- **Type:** Nunito for display and sans (`source/fonts/Nunito.ttf`, wght 200-1000); display 900, body 700; scale
  `18 22 26 32 40 52 68 88 112 144`.
- **Motion:** energetic; spring f 2.86 z 0.41; overshoot 1.8; outBack; transitions used: blobWipe, match, zoomInto.
- **Carriers native to the material:** vector, mascot-cutouts (code-drawn), app-ui; characters yes; data viz no.
- **Sound:** 120 BPM, C major, bright-pop, full drums, glassy SFX.
- **Narration:** off by default (playful launch, music-led). Optional: Puck, `[bright, playful]`, en-US, captions on.

### Reserved regions

- Safe margins: 96 px left/right, 54 px top/bottom (the end-card disclaimer sits at 44 px from the bottom on purpose).
- HUD: none.
- Caption band (narration on only): one line centred at y = 1040 (style `layout.captions.y`), 36 px. Scenes keep
  y > 1010 free of essential content, except the phone's lower edge while the camera is pushed in.

## 4. Files and contract

- `scenes/<id>.js` is an IIFE that only assigns `SCENES['<id>']` (plus `portal` for `app`). The cast lives in the
  project module `modules/mochi-cast.js`: a `window.REEL_MODULES` entry (`mochi-mascot`) that draws Mochi into
  canvases at load time and registers them in `IMG`/`META` like `prep_assets.py` cutouts. Modules load before every
  scene in every cut, so any scene can be renamed, dropped or given to another builder without losing the cast.
- Pure in `(t, env)`; scene-local time (`env.lt`) only, never reel time, so the in-phase is identical in every cut;
  opaque full frame; no grain, vignette, HUD, captions or transitions in scene code.
- Hand-offs: `brand` ends on the app icon at (960, 540), 300 px (`IMG.mochi_icon`), and `app` starts on the same
  pixels (`match`). `app.portal()` returns the phone screen for `zoomInto`.

### Assets

| Name | Kind | File | Scenes | Status |
|---|---|---|---|---|
| `mochi`, `mochi_blink`, `mochi_happy`, `mochi_think`, `mochi_think_blink` | cutout (code-drawn) | `modules/mochi-cast.js`, 760x720 canvases | brand, app, finale, icon | ready |
| `mochi_<matcha|ube|yuzu>` (+ `_blink`, `_happy`) | cutout (code-drawn) | same | flavors, finale | ready |
| `mochi_icon`, `mochi_icon_bg` | prop (code-drawn) | same, 600x600 | brand, app | ready |
| app UI layers | ui | `assets/captures/ui/app/` (`welcome`, `base`, `note`(+`textfree`, rows), `steps_0..4`, `mini`, `result`, `result_checked`, `flavor_*`, `final`) | app, flavors, nudge (`result`), private (`final`) | ready |

## 5. Cuts

Bars per scene from `build/cut-<cut>.json` (120 BPM, bar = 2.0 s). Longer cuts add holds and optional scenes
(`flavors` from 30 s; `nudge` and `private` only in 60 s, excluded from the others); tempo, in-phases and out-phases
are the same in every cut. The 60-s cut raises four caps for itself only (brand 3, app 6, flavors 5, finale 4).

| Scene | min | max | priority | optional | in | music | in/out beats | short (14 s) | 30 (30 s) | 60 (60 s) |
|---|---|---|---|---|---|---|---|---|---|---|
| hook | 2 | 2 | 1 | no | - | intro | 3 / 1 | 1 (pinned) 0-2 s | 2 · 0-4 s | 2 · 0-4 s |
| brand | 1 | 2 | 2 | no | blobWipe | drop | 3 / 1 | 1 · 2-4 s | 2 · 4-8 s | 3 · 4-10 s |
| app | 3 | 5 | 1 | no | match | groove | 10 / 1 | 3 · 4-10 s | 5 · 8-18 s | 6 · 10-22 s |
| flavors | 2 | 3 | 2 | yes | zoomInto (fallback whip) | drop | 6 / 1 | - | 3 · 18-24 s | 5 · 22-32 s |
| nudge | 2 | 5 | 3 | yes | whip | breakdown | 6 / 1 | - | - | 5 · 32-42 s |
| private | 2 | 5 | 3 | yes | blobWipe | drop | 6 / 1 | - | - | 5 · 42-52 s |
| finale | 2 | 3 | 1 | no | blobWipe | outro | 6 / 0 | 2 · 10-14 s | 3 · 24-30 s | 4 · 52-60 s |

## 6. Scenes

Beats count from the scene start (beat 0 = the bar line; 1 beat = 0.5 s).

### 6.1 `hook`: Too many thoughts?

- **Bars:** 2 (pinned to 1 in `short`); priority 1; music intro.
- **Idea:** a head full of loose notes.
- **Carrier:** vector paper scraps in three depth layers (far: small, blurred; mid: hand-placed pile; near: big, out
  of focus at the corners) + kinetic type.
- **In:** first scene. inBeats 3. **Out:** outBeats 1, brand's blob wipe grows from (960, 760).

| Beat | Element | Motion | Copy | Cue |
|---|---|---|---|---|
| -1.4-0.7 | 31 scraps | fly in from beyond the edges on curved paths, tumbling and fluttering, land with a wobble (launches from -0.7 s, so frame 0 is already a storm) | c14 | `tick x12 gap=0.125` at 0.5 |
| 0.25 | "Too many" | kinetic pop per glyph, 156 px, ink, soft cream glow; pool of light behind the headline | c1 | `pop x2 gap=0.5`, `swish` at 0.25 |
| 0.75 | "thoughts?" | same in accentStrong; "?" lands last with a twist | c1 | |

- **Hold:** scraps flutter; one more scrap slaps on per bar line (`tea refill`, then `rsvp!!`, `umbrella?`) with a
  `pop`; the "?" wiggles on every beat; camera drifts.
- **Out-phase:** scraps blown away from the blob origin, headline shrinks and fades.
- **Grows in longer cuts:** one slap per extra bar.

### 6.2 `brand`: Meet Mochi

- **Bars:** 1..2; priority 2; music drop. **In:** `blobWipe` from (960, 760), pink edge. inBeats 3, outBeats 1.
- **Idea:** the helper has a face and a name.
- **Carrier:** the code-drawn plush mascot + wordmark.
- **Establishing image (inside the blob):** pink pool and bokeh; Mochi already rising from below.

| Beat | Element | Motion | Copy | Cue |
|---|---|---|---|---|
| -0.24 | Mochi (h 400, feet y 660) | springs up from below (style spring), arrives on beat 0, squash, jelly, blink | - | `bloop` at 0 |
| 0.1 | halo | conic pastel halo fades in, rotates, pulses on downbeats; nine twinkles orbit | - | |
| 0.4 | landing sparkles | burst around the head | - | |
| 0.25 | wordmark | per-glyph pop, 144 px, two-tone, baseline y 885 | c2 | `chime` at 0.75 |

- **Hold:** breathing, blink, halo spin, twinkles; per bar line a happy hop (pose swap to `mochi_happy` during the
  hop) with `sparkle dur=1`.
- **Out-phase (1 beat):** wordmark exits glyph by glyph; Mochi squashes and dives into the app-icon tile, which pops
  in at (960, 540); the frame ends on `IMG.mochi_icon` exactly (`pop` at outStart).

### 6.3 `app`: Jot it down. Mochi tidies up!

- **Bars:** 3..5; priority 1; music groove. **In:** `match` (the icon is identical on both sides). inBeats 10,
  outBeats 1.
- **Idea:** one messy note in, a tidy list out: the product works.
- **Carrier:** real app UI in a drawn phone (440x900, 1 CSS px = 1 reel px) + kinetic type + vector chips; Mochi as
  the supporting carrier.

| Beat | Element | Motion | Copy | Cue |
|---|---|---|---|---|
| 0-1.4 | icon -> phone | outline morph from the 300-px tile to the phone at x 1120, glowing rim and glints; the welcome screen rides the box | - | `drawon dur=1.3` |
| 0.5 | headline 1 | kinetic pop, fitted size (about 104 px) | c3 | |
| 1.0-1.6 | camera | pushes to 1.6x onto the bubble | - | |
| 1.2 | screen | welcome cross-fades to the empty feed | - | |
| 1.4 | subline | reveal line, 44 px | c4 | |
| 1.5-4.3 | note bubble | types from the real raster at 36 characters/s, shell grows a row at a time, pink caret | - | `keytap dur=2.8` |
| 4.2-4.8 | camera | glides to 1.4x on the tidy card | - | |
| 4.5 | tidy card | pops with the app's own entrance curve (overshoot, 14 px rise); subline hands its place to line 2 | c5 | `send` |
| 4.75 | Mochi (thinking) | springs up beside the phone at x 930 | - | |
| 5.25-7.5 | tidy card | states 1-4, one per 3/4 beat | - | `ding x4 gap=0.75` |
| 7.6-8.2 | camera | pulls back to the full phone | - | |
| 8.0 | result card | pops (alpha layer with its real shadow); Mochi hops and swaps to happy behind a sparkle burst | - | `confirm` |
| 8.28-9.75 | chips | fly from their own result-card rows to a left-aligned list, landing bottom-up a quarter beat apart (no flight crosses a landed chip), each with a ring | c6-c9 | `pop x4` at 9 |

- **Hold (30 cut: 4.5 s):** phone floats; chips bob; a highlight walks the chips every 2 beats; headline keyword
  glows on downbeats. Bar 1: the real ticked state cross-fades in with a tap ripple on the checkbox, the "Oat milk"
  chip strikes through (`click` + `ding`). Bar 2: the reminder chip rings, Mochi hops (`notify`).
- **Out-phase:** `short`: the finale's blob wipe grows from the phone side, so the chips stay readable longest.
  `30`: the camera flies into the phone screen (`zoomInto`, `portal` = the screen).

### 6.4 `flavors` (optional): Pick a flavor!

- **Bars:** 2..3; priority 2; optional; music drop. **In:** `zoomInto` from app's screen (`inFallback: whip`).
  inBeats 6, outBeats 1.
- **Idea:** four flavors, one app.
- **Carrier:** the real app captured in each flavor theme on four phones + the four Mochis.
- **Establishing image (inside the zooming screen):** the headline already popping in on cream.

| Beat | Element | Motion | Copy | Cue |
|---|---|---|---|---|
| -0.84 | headline | kinetic pop, 104 px, "flavor!" in the four inks | c10 | |
| 0, 0.5, 1, 1.5 | phones | spring up from below into a shallow arc (0.6x, tilted ±9°), a colour wash blooms behind each | - | `pop x4 gap=0.5` at 0.25 |
| 0.25 + 0.5k | Mochis | pop in front of their phones (h 190) | - | |
| 2.5 + 0.25k | labels | pop above the phones, each in its ink | c11 | `chime` at 2.5 |
| 3+ | Mochis | bounce on every beat, neighbours alternating | - | |
| 4+ | spotlight | every 2 beats the next flavor lifts, glows, its label outlines, its Mochi cheers | - | |

- **Hold:** the spotlight keeps walking (`sparkle dur=1` per bar line); bounce never stops.
- **Out-phase:** covered by the finale's blob wipe.

### 6.5 `nudge` (optional, 60 only): Gentle nudges.

- **Bars:** 2..5; priority 3; optional; music breakdown. **In:** `whip` left. inBeats 6, outBeats 1.
- **Idea:** the reminder the app made is a gentle one.
- **Carrier:** the real result-card row "Call Mom · Fri 3:00 PM" (cut from the capture) growing into a reminder card;
  an illustrated clock; Mochi.

| Beat | Element | Motion | Copy | Cue |
|---|---|---|---|---|
| 0.25 | headline | kinetic pop, 104 px, "Gentle" in accentStrong | c15 | |
| 0.5-1.5 | reminder card | the real row pops in at 1x, then grows into the card (x 2.4) | c7 | `pop` at 0.5 |
| 1.25 | subline | reveal line, 40 px, ink2 | c16 | |
| 1.5 | clock | pops in; hands sweep to 3:00 on beats 2.5-3.5; the second hand ticks every beat | - | `tick x4 gap=0.25` at 2.5 |
| 1.75 | Mochi | pops up beside the clock (happy), then bobs on the beat | - | `bloop` |
| 2 | bell | the row's own bell glyph swings, two rings spread | - | `ding x2 gap=0.5` |
| 3 | label | fades in beside the clock | c17 | |

- **Hold:** the bell rings on every bar line (`ding`, `every` 4 beats), Mochi turns happy on each bar line, the card
  floats, the second hand ticks.
- **Out-phase:** everything lifts and fades over 1 beat under the next scene's blob wipe.

### 6.6 `private` (optional, 60 only): Yours only.

- **Bars:** 2..5; priority 3; optional; music drop. **In:** `blobWipe` from the phone (1240, 560). inBeats 6,
  outBeats 1.
- **Idea:** the notes stay with you.
- **Carrier:** the app's real final screen in the pearl phone; a soft bubble, lock and offline badges (illustration).

| Beat | Element | Motion | Copy | Cue |
|---|---|---|---|---|
| 0 | phone | rises with the style spring, then floats | - | `swish` |
| 0.5 | headline | kinetic pop, 112 px, "only." in accentStrong | c18 | |
| 1 | bubble | forms around the phone (outBack), then breathes | - | `bloop` |
| 1.5 | subline | reveal line, 40 px, ink2 | c19 | |
| 2 | lock badge | pops on the phone's top right | - | `pop` |
| 2.25 | Mochi | hugs the phone from the left, bounces on the beat | - | `pop` |
| 3 | offline badge, second subline | pop / reveal line in matcha ink | c20 | `pop` |
| 2+ | clouds | one per beat drifts in from the right, squashes against the bubble with a spark and drifts away | - | |

- **Hold:** clouds keep bouncing off the bubble (one per beat, by beat index), the lock pulses on every bar line
  (`chime` every 4 beats), Mochi bounces.
- **Out-phase:** covered by the finale's blob wipe.

### 6.7 `finale`: Mochi Notes

- **Bars:** 2..3; priority 1; music outro. **In:** `blobWipe` from (1340, 560). inBeats 6, outBeats 0 (the reel ends
  on the end card).
- **Idea:** the family, the name, the line people repeat.

| Beat | Element | Motion | Copy | Cue |
|---|---|---|---|---|
| -0.11, 0.14, 0.39, 0.64 | lineup | Strawberry (h 276), Matcha, Ube, Yuzu hop up from below, land a quarter beat apart with sparkles | - | `pop x4` at 0.25 |
| 1 | wordmark | per-glyph pop, 150 px, two-tone, baseline y 398 | c2 | `sting` |
| 1.6 | confetti | burst from the wordmark in the four flavor colours | - | |
| 2 | tagline | reveal line, 48 px, ink2 | c12 | |
| 2.5+ | lineup | bounces on every beat, neighbours alternating | - | |
| 3 | disclaimer | fades in | c13 | |
| 3.5 | logo shine | specular band sweeps across the letters | - | `sparkle dur=1.5` |

- **Hold:** bounce; shine every 2 bars (`chime`); on each bar line a wave runs through the lineup left to right
  (a 38-px hop, 0.11 s apart) while the hero cheers; bokeh drifts.

## 7. Audio

- Music parts: hook intro, brand drop (lands on the reveal), app groove, flavors second drop, finale outro with the
  final chord. Glassy SFX family; the arranger adds a transition sound per `in` (swish for blob wipes, air for the
  match, zoom for the zoom) unless an authored cue sits within 3/4 beat.
- Every cue is in `reel.config.json`; picture and sound read the same plan (`build/cut-<cut>.json`). Hold cues use
  `holdBar` (with `every` where they repeat) and drop out of the short cut automatically.

## 8. Narration (optional; off by default)

Lines live in `narration.json` (Puck, `[bright, playful]`). The `short` cut stays music-only (`"narration": false`);
`nudge` and `private` have no lines, so in a narrated 60-s cut they are music-led beats between voiced scenes.
With dry-run estimates every line fits the bars the plan already gives (hook 1, brand 1, app 3, flavors 1,
finale 2), so the 30-s edit does not change when narration is turned on.

| Scene | Line (verbatim) | Words | Fits in |
|---|---|---|---|
| hook | Too many thoughts? | 3 | 1 bar |
| brand | Meet Mochi Notes! | 3 | 1 bar |
| app | Jot it down. Mochi tidies it into to-dos, reminders and tags. | 11 | 3 bars |
| flavors | Pick a flavor! | 3 | 1 bar |
| finale | Jot it down. Mochi tidies up! | 6 | 2 bars |

## 9. Steal sheet

No reference video. Grammar borrowed from the K-BeautyGate case study (`../../references/storyboard.md` 5A): blob
wipe reveal, outline morph into a phone, real UI typing, progress states on the beat, chips flying to a grid,
beat-bouncing lineup, logo shine.

## 10. Open questions

- Motion blur: the runtime's exact shutter (`"motionBlur": {"samples": 5}` per scene) makes the flurry, springs and
  morph look filmic in the MP4 but multiplies draw cost in the real-time HTML player too; left off by default.
