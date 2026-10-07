# Storyboard: from brief to reel

The storyboard (`P/STORYBOARD.md`, from `templates/STORYBOARD.template.md`) is the contract every builder,
reviewer, and the sound all follow. Write it after the tone pass (`P/style.json` exists) and before any scene code.
Its timing lives in `P/reel.config.json` (bars, beats, cues); its words live in `STORYBOARD.md` (exact copy, rules,
choreography). Keep the two consistent; the planner output `P/build/cut-<cut>.json` is derived, never hand-edited.

## 1. Extract the brief (top of STORYBOARD.md)

Read every source file in `P/source/`. Write, in this order:

- **One sentence.** What it is and why it matters, <= 20 words. Every scene must serve it.
- **One scene.** The single image people remember. It becomes the poster frame (`render.mjs --poster T`) and
  usually the climax or the hook.
- **One message.** The line people repeat. Usually the end-card line.
- **Audience, purpose, venue.** Launch, pitch, paper explainer, hackathon demo, portfolio. Big screen with sound,
  social autoplay (muted: the story must read without sound; narration needs captions), README preview (silent loop).
- **Exact copy.** Every on-screen string verbatim, with exact spelling, casing, punctuation, and language. Product
  names, commands, numbers, URLs.
- **Banned wording.** Words the source forbids or that over-claim (the source says "screening", the reel never says
  "diagnosis"). Treat each as a regex the reviewer greps for.
- **Disclaimers.** "Fictional persona", "demo data", "not a real map", "sped up", "illustrative", plus where and
  when each appears (`visual-sources.md` section 6).
- **Provenance table.** Every number on screen -> file, table, or run that produced it.

Copy rules found in the source are bugs if violated, exactly like a crash. The case-study pitch outline listed
required phrasings and forbidden ones; the storyboard copied them verbatim into a "Terminology rules" section, and
the reviewers checked every frame against it.

## 2. Tone and manner first

The storyboard inherits everything from `P/style.json`; it does not choose a look. Translate, do not override:

| style.json | Storyboard decision |
|---|---|
| `mood`, `rationale.*` | adjectives in the scene notes; what a scene must *feel* like |
| `motion.pace` | beats per idea: calm 2-4 beats, medium 1-2 beats, energetic 0.5-1 beat |
| `motion.spring {f, z}`, `overshoot`, `ease` | entrance character (bouncy vs exact) |
| `motion.transitions` | the menu for each scene's `in` |
| `motion.characters`, `dataViz`, `visualSources` | which carriers are native (`visual-sources.md`) |
| `layout.theme`, `hud`, `captions` | light/dark scenes, reserved regions |
| `sound.bpm`, `energy` | the bar grid and the music part per scene |
| `narration.recommended` | whether lines are written now |

If the storyboard needs something style.json does not allow, change style.json through the tone pass with evidence.

## 3. The bar grid

```
bpm      = reel.config.bpm ?? style.sound.bpm
beatSec  = 60 / bpm
barSec   = beatsPerBar * beatSec          # 4/4 by default
```

| BPM | bar (s) | bars in 15 s | bars in 30 s | bars in 60 s |
|---|---|---|---|---|
| 96 | 2.500 | 6 | 12 | 24 |
| 100 | 2.400 | 6.25 | 12.5 | 25 |
| 112 | 2.143 | 7 | 14 | 28 |
| 120 | 2.000 | 7.5 | 15 | 30 |
| 124 | 1.935 | 7.75 | 15.5 | 31 |
| 128 | 1.875 | 8 | 16 | 32 |
| 140 | 1.714 | 8.75 | 17.5 | 35 |

The planner rounds a `{"seconds": s}` cut to whole bars. When an exact length matters, the tone pass picks a BPM that
divides it (a multiple of 8 for 30 s, of 16 for 15 s), but never against the material's character.

- **Scenes are whole bars**, boundaries on bar lines. One idea per scene. At 112-128 BPM most scenes are 2 bars
  (3.75-4.3 s); a hook is 1-2 bars and never grows (`maxBars = minBars`); a slogan or logo sting can be 1 bar; a
  climax or finale 2-3 bars. Below about 92 BPM a bar lasts 2.6 s or more: plan in 1-bar units.
- **Beats are the unit of choreography inside a scene.** Big hits on beat 1, secondary entrances on beats 2-4,
  type lands on a beat (the *end* of an entrance is what the ear syncs to), stamps and pops on beats or half beats.
- **Transitions straddle the bar line.** The outgoing scene owns `outBeats` before the line, the incoming scene owns
  `inBeats` after it; the compositor runs the `in` transition across that window.
- **Cues are authored in beats** from a scene anchor (`start`, `holdStart`, `holdBar`, `holdBeat`, `outStart`, `end`;
  `reel.config.json` `cues`), so they move with the plan: `{"beat": 2, "from": "start", "sfx": "stamp"}`.
  `{"beat": 0, "from": "holdBar", "every": 4}` repeats a cue on every bar line of the hold, exactly where
  `onBars(env, 1)` draws its secondary beats (`holdBeat` with `"every": n` matches `onBeats(env, n)`); `"count"` and
  `"until"` bound it, and hold cues fire only when the hold is long enough. A cue that lands past its scene's end is
  a warning (`--strict` fails): keep single cues inside the shortest version of the scene. The `sfx` string
  uses the audio library's grammar (`python3 <skill>/audio/synth.py list`): `name[:arg] key=value flag xN`, layers
  joined with `+`, bare durations in beats (`"pop x3"`, `"riser dur=1bar"`, `"impact:big+shimmer"`). Each SFX lands
  by its own anchor: an `impact` starts on the cue, a `whoosh` peaks on it, a `riser` ends on it. The planner turns
  cues into absolute times in `cut-<cut>.json`; music, SFX, and the visuals (`env.cues`) all read that one list.
  The arranger adds a transition sound at each scene's `in` (`whip` -> whip, `blobWipe` -> swish, `glitch` ->
  glitch, ...) unless a transition, impact, or build cue of your own sits within 3/4 beat of that bar line; cue one
  there only to change it (`"audio": {"transitionSfx": false}` in reel.config turns them off).
- **Music parts per scene** (`intro`, `groove`, `breakdown`, `drop`, `outro`) shape the energy curve: hook = intro,
  brand reveal = drop, product = groove, tension = breakdown, payoff = drop, logo = outro.

### Elastic scenes

Each scene is an in-phase (`inBeats`, fixed), a hold (stretches), and an out-phase (`outBeats`, fixed). Animations run
at 1x in every cut; only the hold length changes. In `draw`, `env.phase.in` (0..1), `env.phase.hold` (seconds since
the in-phase ended), `env.phase.holdDur`, and `env.phase.out` (0..1) drive this (`motion-recipes.md` section 1).
`minBars` is the shortest length at which the scene still says its idea; `maxBars` is where a hold stops feeling
alive.

## 4. Writing copy for motion

- **Reading time.** After an entrance *completes*, a line stays readable for >= 0.5 s + 0.25 s per word (Latin) or
  0.5 s + 0.08 s per character (CJK). Count it against the beat grid; if it does not fit, cut words, not time.
- **Line length.** Headline <= 6 words or <= 18 CJK characters; at most 2 lines per beat group; one accent-colored
  keyword per headline (via `colorFn`).
- **Hierarchy.** Kicker (mono or caps, tracked out, small) -> headline (display) -> subline (sans, `ink2`) -> meta
  and disclaimers (`muted`). Sizes at 1080p: headline 52-96 px, subline 26-40 px, body >= 22 px, captions 40-48 px,
  disclaimers 14-16 px for >= 2 s.
- **Native language.** Each language reads as if written by a native copywriter: no machine-translation stiffness,
  Korean in a consistent polite register (for example "조건은 에이전트가 정리합니다."), CJK set in `fonts.cjk`.
- **Numbers.** Use the source's precision and units; thousands separators in the reel's locale; the same rounding
  everywhere the number appears.
- **Muted autoplay.** If the reel will autoplay muted, every scene's idea must be on screen as type or captions.

## 5. Proven 30-second structures (case studies)

Timings are from the shipped reels; reuse the *shape*, not the content.

**A. Product tour with characters (K-BeautyGate, 120 BPM, bar 2.0 s).** Shipped with two half-bar boundaries; on
today's whole-bar grid it maps to 2|2|2|2|2|3|2 bars.

| Time (s) | Bars | Scene | Carrier | In | Music |
|---|---|---|---|---|---|
| 0-4 | 2 | Hook: drop, splash, 3 products emerge, question, AI reticle locks on, push-in | vector + product cutouts | - | intro (2 bars) |
| 4-7 | 1.5 | Brand: mascot springs up, halo, arch outline draws, logo per glyph, credits scramble | mascot + type | `blobWipe` | drop at 4.0 |
| 7-11 | 2 | Ask: the shared arch morphs into a phone inside the scene, real UI, user bubble types, progress card, chips fly to a grid | real UI | `match` (same arch on both sides of the cut) | groove |
| 11-15 | 2 | Evidence: 4 source cards, magnifier lens, 4 stamps on the beat, products filtered | vector + cutouts | `zoomInto` (the phone screen) | groove |
| 15-18 | 1.5 | Plan: pastel map, pins drop, closed store struck out, route rider, clock and budget count up | vector + mascot | `whip` | groove |
| 18-24 | 3 | Climax (dark): hidden instruction decodes, gate rises, guard lands, DENIED, real logs, allowed packet | vector + real logs | `glitch` | breakdown 18, impact 21, riser into 24 |
| 24-30 | 3 | Resolution: doors burst into light, card flips out, 7 mascots bounce on the beat, logo, line, credits | mascots + type | `portalFlash` (through the opening doors) | second drop 24, final chord 28 |

**B. Data-first research reel (FDDD, 128 BPM, bar 1.875 s, 16 bars).** Two bars per scene, then two one-bar stings.
The 15-s cut is edited independently at 8 bars (one bar per scene, the learning loop dropped), not trimmed.

| Bars | Scene | In | Music |
|---|---|---|---|
| 0-2 | One neuron: poster frame -> slices -> pulsing neuron -> zoom out, counter to the real count | - | intro |
| 2-4 | Connectome: real points, computed spikes, callouts, connection count | flash | drop A |
| 4-6 | 20 brains: tile wall of real runs with real spike counts | match | drop A |
| 6-8 | Real docking: protein ribbon draws, ligand lands in its pose | whip | breakdown |
| 8-10 | Score: impact number -> leaderboard -> reward conversion | impact | drop B |
| 10-12 | Stay or leave: mesh flies through habitats; decoded output | zoom | drop B |
| 12-14 | Learning loop: 5 cards with mini real-data visuals, "computed"/"authored" tags | glitch | build |
| 14-15 | Principles: "Real docking scores. Real spikes. Nothing faked." one slam per beat | strobe | slam |
| 15-16 | Logo assembled from the real points, URL, credits | flash | outro |

The names in this table are that reel's own: its `zoom` was a blurred push between full frames (here: `zoomInto` with
a rect, or `impact`), and `drop A/B`, `build`, `slam` were parts of its soundtrack (here: `drop`, `groove`,
`breakdown`, `outro`).

**C. Narrated explainer (FlyGate).** Scene length follows the narration: 28 scenes over 250 s, 3.9-23.1 s each,
about 2.1 words/s overall; the CLI section used 4-5 s scenes of 7-10 words each; a 30-s vertical short used 6
one-sentence scenes of about 5 s. Korean narration is capped at 6.3 syllables/s, lead 0.3 s, tail <= 0.8 s
(`narration.md`). In this skill, VO-driven lengths are quantized *up* to whole bars at the fixed BPM.

**D. CLI tool reel (CC-statusline grammar).** Per command, 1-2 bars: a giant command word slams on beat 1, a real
terminal cast types in a window tilted in 3D, the camera zooms to the key line by beat 3, a glitch or typing transition
carries into the next command. End card: install line typed in, repo URL.

**Generic 30-s skeleton** (adapt the bars to the BPM): Hook 2 -> Name/brand 1-2 -> Problem or ask 1-2 -> Proof 2 ->
Proof or how 2 -> Climax 2-3 -> Payoff + logo + call to action 2-3. **15 s:** Hook 1 -> Brand 1 -> Proof 1-2 ->
Climax 1-2 -> Logo 1-2, edited on its own and music-led. `templates/reel.config.template.json` encodes both:

- `problem` is optional with priority 1: it enters whenever its minimum fits and gives way only when narration at a
  calm tempo leaves no room. `how` and `detail` are optional (priority 3 and 4) and fill the 60-s cut.
- The `15` cut is its own edit: `"seconds": 15, "round": "down"`, `"narration": false` (a teaser of 20 s or less
  is music-led), `problem`, `how`, and `detail` excluded, hook and brand pinned to 1 bar, and the other scenes
  allowed down to 1 bar with shorter in-phases. It lands on 5-8 bars (13-15 s) from 80 to 140 BPM, so its scenes
  need compact schedules (`motion-recipes.md` section 2).
- Hold cues use `holdBar`/`holdBeat`, and every single cue fits the 1-bar versions of its scene.
- Its 15-, 30-, and 60-s cuts fit at every tempo from 80 to 140 BPM under `plan_cut.py --strict`, music-only and with
  the narration template's lines, and its cue specs are valid in the audio library.

## 6. Longer cuts at the same BPM and pace

A 60-s cut is a longer *story* at the same speed, never the 30-s cut played slower.

1. `plan_cut.py` grows holds and adds `optional` scenes by `priority`, keeping every boundary on a bar line and the
   BPM unchanged (`timing-and-length.md`). Shorter cuts are edited, not trimmed: per-cut overrides in
   `reel.config.json` `cuts` (`"exclude": [...]`, `"scenes": {"hook": {"bars": 1, "inBeats": 3}}`) give the 15-s cut its
   own structure, and scenes switch to a compact schedule below about 1.5 bars (`motion-recipes.md` section 2).
2. Write optional scenes during storyboarding (`priority` 3+, `"optional": true`): a second example, a deeper zoom, a
   data detail, a testimonial-free "how it works" beat. Without them a 60-s cut is all holds. An optional scene
   with priority 1 means "keep it whenever it fits" (the template's `problem`).
3. Design every hold: idle motion on everything (drift, breathing, blink, particles), plus secondary beats on bar lines
   (a callout, a counter tick, a scroll step, a second highlight) so a long hold never reads as a freeze. A frame that
   is static for > 0.5 s is a defect.
4. Music keeps the BPM and groove; the arranger lengthens sections (more groove bars, a second drop).
5. Narration: `vo-minbars.json` raises `minBars` where the voice needs time; the extra time is a living hold. A
   15-s cut is usually music-only (`"narration": false` in the cut). To narrate it, drop that flag, limit the long
   lines to the long cuts (`"cuts": ["30", "60"]`), and add short lines with `"cuts": ["15"]` (`narration.md`).
6. Comprehension slow-downs (`render.mjs --scale` / `--warp`) exist for a client who says "too fast to follow"; they
   are a variant, never the default way to change length.

## 7. Reference-video study (optional, 15 minutes)

```bash
yt-dlp --js-runtimes node -f "bv*[height<=720][ext=mp4]" -o 'ref.%(ext)s' "URL"     # quote templates in zsh
ffmpeg -i ref.mp4 -vf "fps=1/3,scale=320:-1,tile=6x9" -frames:v 1 sheet.png
ffmpeg -i ref.mp4 -vf "select='gt(scene,0.3)',showinfo" -f null - 2>&1 | grep -o 'pts_time:[0-9.]*'   # cut times
```

Measure, then write a 5-8 line "steal sheet" in `STORYBOARD.md`: average shot length versus the bar, transition
vocabulary, type treatment (size, weight, tracking, how long a line stays), camera language, how holds stay alive,
palette and density. Map each move to a recipe in `motion-recipes.md`. Borrow rhythm and grammar, never assets.
Inspect full-resolution frames before concluding anything about color: contact sheets show fake banding.

## 8. Delivery set

| Deliverable | Spec |
|---|---|
| MP4 per cut | 1920x1080, 60 fps, H.264 High yuv420p bt709, CRF 14, `-tune animation`, keyint 60, `+faststart`, AAC 256k, -14 LUFS integrated, <= -1 dBTP, embedded cover (`render.mjs --poster T`) |
| Share copy per cut | same, video capped near 10 Mbps (`render.mjs --share`) |
| Single-file HTML | all cuts with a selector; Space play/pause, Left/Right one frame, Shift+Left/Right one second, number keys select a cut; subset fonts, WebP images, 96k audio, all inline; verified by booting a copy alone in an empty folder (`build.mjs --verify`) |
| Covers | 1920x1080 cover with play icon and duration badge; 1200x630 share card; frame 0 is a poster composition that the opener breaks apart (`--poster T`) |
| Captions | SRT and VTT per cut when narrated; burn-in per `style.layout.captions` |
| Preview | silent GIF or animated WebP of the 15-s cut for READMEs |
| Credits | computed vs authored, data sources and licenses, fonts and licenses, "music synthesized" |

Use semantic-versioned file names (`<slug>-<cut>-v1.0.0.mp4`) and never overwrite a delivered version.

### Aspect variants (vertical 9:16, square 1:1)

A vertical or square deliverable is a re-layout, not a crop: a 1920-wide composition cropped to 1080 loses the
copy at its edges. Make it a sibling project folder (`P-vertical/`) that shares `style.json`, `assets/`,
`captures/` and `narration.json` (copy them, or point to them) and sets `"size": [1080, 1920]` (or `[1080, 1080]`) in
its `reel.config.json`.
- Size-agnostic already: the planner, music, SFX, narration and mixes (same bars, same BPM), the compositor and its
  transitions, the HUD (laid out at 1080p proportions x `UNIT`), captions (`style.layout.captions.y` is a fraction
  of H), stills, render (H.264 level 4.2 up to 1920x1088 pixels) and the HTML player (the stage follows the aspect).
- Scenes are not: write layouts with `W`, `H`, `UNIT` (`min(W, H) / 1080`) and `ts(i)` instead of literal 1920x1080
  pixels, or keep a scene file per aspect. Stack what sat side by side (headline above the device, panels in a
  column), raise type a step (phones are viewed small), and keep one idea per frame.
- Safe zones: platform UI covers roughly the top 10 % and bottom 20 % of a 9:16 frame and a strip on the right
  (likes, captions, the handle). Put captions at `y` 0.70-0.75 and keep every essential string inside the middle
  70 % of the height and 900 px of the width; the HUD stays a thin frame or turns off (`hud` omitted).
- Covers: `render.mjs --poster T` writes the poster and cover at the frame size; the 1200x630 card is cover-cropped
  around the centre, i.e. only the middle third of a vertical frame. Compose that frame with its key content in the
  middle, or make the card from the 16:9 project.
- Editors who want frames rather than an MP4 can extract a PNG sequence from the master
  (`ffmpeg -i reel-30.mp4 seq/%05d.png`) or render a range with `stills.mjs --range a:b:step`.
- QA every aspect separately (stills at boundaries and holds, `motion_qa.py`, `build.mjs --verify`): the same scene
  code at another size is a different picture.

## 9. Draft early

Clients are impatient and early drafts catch structural problems cheaply.

1. **Timing draft** (minutes after the storyboard): stub scenes (labeled cards) + the planned cut + draft music.
   Locks length and rhythm. `stills.mjs --project P --serve` gives the client a live player before any MP4.
2. **First-pass draft** as soon as every scene has a first build, while reviews still run.
3. **Final** after review, fix, and integrator checks. Send a stills sheet with every draft.

## 10. STORYBOARD.md structure

Use `templates/STORYBOARD.template.md`. Required sections: brief, copy rules (exact strings, banned wording,
disclaimers, provenance), style summary (from style.json, read-only), file contract, cut table, one section per
scene (id, bars min/max, priority, carrier, beat-by-beat choreography for the in-phase, hold plan, out-phase, exact
copy with position/size/role, cues, transition in, disclaimers, what grows in longer cuts), audio and narration notes.

### Checklist before builders start

- [ ] Every string on screen appears verbatim in STORYBOARD.md; banned list and disclaimers present.
- [ ] Every number has a provenance row.
- [ ] Every scene has min/max bars, a hold plan, and at least one secondary beat for long holds.
- [ ] Every scene's carrier is ready (`visual-sources.md` section 8) or stubbed with a request.
- [ ] `plan_cut.py` succeeds for every cut; boundaries on bar lines; no scene below `minBars`.
- [ ] Reserved regions (margins, HUD, caption band) are stated with pixel values: the compositor's `steps` HUD needs
      `x > W - 740, y < 112`, its `frame` HUD a 90-px border; captions sit around `style.layout.captions.y`.
- [ ] Night-stage scenes are `"dark": true`; scenes entered through `zoomInto`/`portalFlash` have an establishing
      image before their first bar line.
