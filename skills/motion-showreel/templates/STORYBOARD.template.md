# <TITLE> storyboard and build contract

> Copy to `P/STORYBOARD.md`. Replace every `<...>`; delete every line that starts with `>`.
> Guide: `references/storyboard.md`. Timing lives in `P/reel.config.json`; this file holds words and choreography.
> Every builder, reviewer, the audio, and the narration follow this file. Violations of "Copy rules" are bugs.

## 1. Brief

- **One sentence:** <what it is and why it matters, <= 20 words>
- **One scene:** <the image people remember> (poster frame: cut `<30>`, t = `<s>`)
- **One message:** <the line people repeat; usually the end-card line>
- **Audience / purpose / venue:** <who> / <launch | pitch | explainer | demo | portfolio> / <screen with sound | muted autoplay | README loop>
- **Languages:** <en | ko | ...> (CJK font role: `fonts.cjk`)
- **Source material:** <P/source/... files and what each contributes>

## 2. Copy rules (violations are bugs)

### 2.1 Exact strings

> Every on-screen string, verbatim. Scene code must use these strings character for character.

| id | String (verbatim) | Scene | Role (kicker / headline / sub / label / disclaimer / credit) |
|---|---|---|---|
| c1 | <...> | <hook> | <headline> |
| c2 | <...> | <...> | <...> |

### 2.2 Banned wording

> Regexes the reviewer greps for in scene code and reads for in frames. Source: <where the rule comes from>.

- `<regex>`: <why it is banned / what to say instead>

### 2.3 Disclaimers

| Text | Scenes | Position (px) | Size | Min on screen |
|---|---|---|---|---|
| <Demo data> | <proof, plan> | <right-aligned x=1880, y=1058> | <14-16 px, muted> | <2 s> |

### 2.4 Provenance

| Number / claim on screen | Source (file, table, run) | Rounding / unit |
|---|---|---|
| <167,122 neurons> | <data/meta.json: neurons> | <integer, thousands separator> |

## 3. Style summary (read-only; from `P/style.json`)

- **Theme / mood:** <light | dark> / <mood words>
- **Palette roles:** bg `<#...>` bg2 `<#...>` surface `<#...>` ink `<#...>` ink2 `<#...>` muted `<#...>` accent `<#...>` accent2 `<#...>` accent3 `<#...>` ok `<#...>` warn `<#...>` deny `<#...>`
- **Type:** display `<family>`, sans `<family>`, mono `<family>`, cjk `<family>`; scale `<px list>`
- **Motion:** pace `<calm | medium | energetic>`, spring f `<n>` z `<n>`, overshoot `<n>`, transitions `<list>`
- **Carriers native to the material:** `<visualSources>`; characters `<yes/no>`; data viz `<yes/no>`
- **Sound:** `<bpm>` BPM, `<key> <mode>`, preset `<preset>`, drums `<...>`, SFX family `<...>`
- **Narration:** `<on | off>`, voice `<Puck>`, style `<[fast, energetic]>`, lang `<en>`

### Reserved regions (scene code keeps these empty)

- Safe margins: `<96>` px left/right, `<54>` px top/bottom (`style.layout.margin`).
- HUD: `<x > 1180, y < 112>` for the `steps` look, a `<90>`-px border for the `frame` look, in scenes `<...>` (if
  `reel.config.hud` or `style.layout.hud`).
- Caption band: `<y > 900>` (if captions are enabled; centred on `style.layout.captions.y`).

## 4. Files and contract

- Scene `<id>` lives in `P/scenes/<id>.js`: an IIFE that only assigns `SCENES['<id>'] = { draw(ctx, t, env) }`
  (plus `portal(t, env)` when a `zoomInto` / `portalFlash` flies through its window).
- Pure in `(t, env)`; opaque full frame; valid for `[t0 - 0.7, t1 + 0.7]`; elastic via `env.phase`; looks right at
  `minBars` and `maxBars`; no grain, vignette, HUD, captions, or transitions in scene code.
- Owners write only their files; requests go back as `cueRequests` / `assetRequests` / `configRequests`.
- Full contract: `references/multi-agent.md` section 2. Helpers: `references/engine-api.md`.

### Assets

| Name | Kind (cutout / ui / cli / pdf / web / native / photo) | File | Scenes | Status |
|---|---|---|---|---|
| <hero> | <cutout> | <P/assets/hero.webp (+ _blink)> | <brand, finale> | <ready / missing / requested> |

## 5. Cuts

> Bars per scene per cut from `P/build/cut-<cut>.json` after `plan_cut.py`. Never hand-edit cut files.

| Scene | min | max | priority | optional | in | music | <15> | <30> | <60> |
|---|---|---|---|---|---|---|---|---|---|
| <hook> | <2> | <3> | <1> | <no> | <-> | <intro> | <1> | <2> | <3> |

## 6. Scenes

> One section per scene, in order. Beats count from the scene start (beat 0 = the bar line).
> `inBeats` and `outBeats` are fixed in every cut; the hold between them stretches.

### 6.<n> `<id>`: <short title>

- **Bars:** min `<n>`, max `<n>`; priority `<n>`; optional `<no>`; music `<groove>`; dark `<no>` (yes for night stages)
- **Idea (one line):** <the single thing this scene says>
- **Carrier:** hero `<real UI in phone>`; support `<mascot peeks>`; assets `<names>`
- **In:** `<transition>` (`<inParams>`; `inFallback` `<type>` when the predecessor can be left out), inBeats `<n>`.
  **Out:** outBeats `<n>` (the next scene's `in` runs across it). Entered through a window (`zoomInto`/`portalFlash`)?
  Describe the establishing image shown before beat 0.
- **Layout:** <regions in px: title block x/y, hero rect, support position>

| Beat | Element | Motion (recipe) | Copy id | Cue (sfx) |
|---|---|---|---|---|
| 0 | <phone outline> | <outline morph, ioC, 0.65 s> | - | <swoosh> |
| 1 | <headline> | <kinetic per glyph, stagger 0.03> | <c4> | - |
| 1.5 | <chip row> | <flying chips, 0.115 s stagger, spring land> | <c5..c8> | <pop x4> |

- **Hold plan:** <what keeps moving (idle drift, breathing, blink, particles)> + <secondary beats on bar lines
  in longer cuts: e.g. bar 2: second highlight; bar 3: counter tick>
- **Out-phase:** <what exits or hands off, and how it matches the next scene's `in`>
- **Disclaimers:** <text, position, size>
- **Grows in longer cuts:** <extra callouts, second example, deeper zoom>
- **Review focus:** <what a reviewer must check first: e.g. typing caret never leaves the bubble>

## 7. Audio

- Music parts by scene follow section 5. Hits: <drop at scene `<id>` beat 0>, <breakdown at `<id>`>, <final chord>.
- SFX family `<glassy | digital | organic | minimal>`; cue list lives in `reel.config.json`, one cue per visual event
  that the ear should feel; no cue for decorative motion. Cue `sfx` strings use the library grammar
  (`python3 <skill>/audio/synth.py list`), e.g. `"pop x3"`, `"riser dur=1bar"`, `"impact:big+shimmer"`. Hold
  accents anchor to `holdBar` / `holdBeat` with `"every"`, so they land with the scene's `onBars` / `onBeats`.

## 8. Narration (only if `style.narration.recommended` or the client asks)

> Lines live in `P/narration.json`, one entry per scene id. Rate caps and timing: `references/narration.md`.

| Scene | Line (verbatim) | Words / syllables | Fits in (s) |
|---|---|---|---|
| <hook> | <...> | <...> | <...> |

## 9. Steal sheet (reference study, optional)

- <move from the reference video> -> <recipe> -> <scene>

## 10. Open questions

- <question for the client, with the default you will use if there is no answer>
