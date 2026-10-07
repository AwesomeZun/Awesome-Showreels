# Visual sources: what carries the story

A reel is code-drawn 2D motion first. Everything else is a **carrier**: a source chosen per scene because it
*proves* a claim or gives the material a *face*. Pick carriers from the material and its purpose, never from habit.
The material's look is already decided in `P/style.json` (see `tone-and-manner.md`); this file decides *what is on
screen*. `style.motion.visualSources` lists the carriers the tone pass found native to the material; it is the
default menu, not a quota.

## 1. The layers

| Layer | Always? | Job |
|---|---|---|
| Code-drawn vector | **always** | Backgrounds, frames (device, window, paper), shapes, icons, diagrams, transitions, HUD, captions, highlights, callouts. Infinitely elastic, resolution-independent, pure in `t`. |
| Kinetic type | almost always | Claims, names, numbers, commands. The fastest carrier of meaning. |
| One hero carrier per scene | per scene | The proof or the face: real UI, real terminal, real figure, real data, character, photo. |
| At most one supporting carrier | optional | Context for the hero (a mascot peeking at the UI, a chip row of real values next to a capture). |

Two raster carriers fighting for attention in one frame is the most common amateur mistake. If a scene needs two
proofs, it is two scenes (or one scene with a match cut on the beat).

## 2. Carrier catalog

| Carrier | Proves / gives | Cost | Main risk | Produce with -> output | Animate with (`motion-recipes.md`) |
|---|---|---|---|---|---|
| **Kinetic type** | the claim, the name, the number | minutes | too many words for the on-screen time | storyboard copy | per-glyph rise, reveal line, scramble decode, wipe bar, beat slam |
| **Data viz (real numbers)** | scale, results, rankings, change | low-medium | decorative charts with invented values | numbers from the source (JSON, table, run log) with a provenance note; `gl.js` for 20k+ points or edges | counters, impact numbers, bars, sparklines, tile wall, point cloud, network pulses |
| **Mascot / character cutouts** | personality, emotion, "who" | ~1.5 min per generated pose + lift | off-model poses, licensing, kitsch in serious material | client mascot -> GPT-image-2 poses -> macOS Vision lift -> trim/blink (`imagery.md`) -> `P/assets/<name>.webp` + `meta.json` | spring pop, squash, jelly, blink, beat bounce, ride a path, guard/hop |
| **Real app UI** | the product exists and works; "how" | low if deployed | ghosted cross-fades, frozen blank states, unreachable states | `tools/capture_ui.mjs --spec spec.json` (`--example` prints one): layers, component states on a static clone, `textFree` + `rows` for typing, at the device's web-view size and dpr 3 (`capture.md`) -> `P/assets/captures/ui/` + json sidecars | device frame, character-accurate typing, progress states, zoom-through via `portal()`, scroll |
| **Real terminal / CLI** | the tool runs; the exact output | low | fake output, unreadable density | `tools/capture_cli.py --cmd "..." --out P/assets/captures/term/<name>.cast` (real run, secrets masked, home paths anonymized) -> `term.js` | giant command word, tilted window, typing, zoom to the key line |
| **PDF / paper figures** | the evidence in its own form | low | illegible at 1080p, altered data | `tools/pdf_figures.py paper.pdf --out P/assets/captures/pdf` (figures, `panels` per figure, `--mode pages`, `--find TEXT` for highlight rects) | paper sheet, zoom into panel, highlight, re-plot from the table (recipe 35, `paperSheet`) |
| **Web shots** | context: the site, docs, README, launch page | low | cookie banners, stale pages, third-party rights | `capture_ui.mjs` with a desktop device (full page or element, banners hidden); `source_snapshot.mjs` renders source material for the tone pass | browser frame, slow scroll, zoom-through, tile wall (recipe 36, `browserFrame`) |
| **Native app captures** | desktop app in use | medium | private data on screen | `tools/capture_native.md` (macOS window capture); `capture_ui.mjs --textfree shot.png --out shot.textfree.png --roi x,y,w,h` adds a text-free copy and text rows to any raster | window frame, zoom to control, cursor path |
| **Photos** | real people, places, physical products | client-provided | licensing, mismatch with the vector world | client files; optional Vision lift for cutouts or a 2.5D subject + plate pair (`"parallax": true`) | 2.5D parallax push-in, cutout pop, masked reveal, duotone only if the brand does it |

Assets are prepared **before** scene builders start (`multi-agent.md`). A builder that needs a new asset returns
an `assetRequests` entry; it never generates or downloads one itself.

### Machine vision in the pipeline (macOS Vision, OpenCV)

Both prepare rasters so that code can animate them; neither invents or edits evidence.

| Job | Tool | What it gives the motion |
|---|---|---|
| Lift a character, product, or photo subject off its background | macOS Vision foreground instance masks (`tools/lift.swift`, macOS 14+), run by `prep_assets.py` (`--backend auto` picks Vision on macOS; `--check` lists backends) | cutouts that pop, squash, and stand on a contact shadow |
| Flat or chroma backgrounds on any OS (generated poses come on a flat color: GPT-image-2 has no transparency) | OpenCV GrabCut (`prep_assets.py --backend flatbg`) | the same cutouts without macOS |
| Clean, trimmed alpha; a sheet split into one file per item (`"split": true`) | OpenCV matte refinement and connected components in `prep_assets.py` | crisp edges at 1080p, product lineups |
| Eyes-closed twin (`<name>_blink.webp`, `meta.eyes`) | eye-blob detection and inpainting in `prep_assets.py` | blinks (`blinkAt`, `popChar`) |
| 2.5D photo: subject layer plus a subject-free plate (`"parallax": true`) | Vision lift + OpenCV Telea inpainting | parallax drift and push-ins on a still |
| Text-free plate plus measured text rows of a UI or native capture | OpenCV text mask + median or Telea fill (`capture_ui.mjs --textfree ... --fill median\|telea`, or `"inpaintText": true` in `prep_assets.py`) | character-accurate typing over the real bubble |

Each job writes a QA image (`P/build/qa/`, `<name>.rows.png`, `sheet.png`): open it at full resolution before a
builder uses the asset. Settings and QA protocol: `imagery.md` (cutouts) and `capture.md` (captures).

## 3. Decision procedure (run it once per reel, then once per scene)

1. **What is the proof?** The thing a skeptic must see to believe the one-sentence claim. That source is the hero
   carrier of the proof scenes. A deployed app -> real UI. A CLI -> real terminal. A paper -> its figure and its
   number. A repo with results -> real data viz.
2. **What is the face?** What makes the material memorable: a mascot, a logo, a signature color, one giant number,
   a person. It owns the hook and the finale.
3. **Where does it live?** Phone, browser, terminal, paper, slide, shelf. That decides the frame device every capture
   of that source sits in, for the whole reel.
4. **What can be measured?** Every measurable value becomes a candidate counter, bar, or impact number, with its
   source written next to it in `STORYBOARD.md`.
5. **What does the material itself look like?** Check `style.motion.visualSources`, `style.motion.characters`,
   `style.motion.dataViz`. A carrier the material never uses must earn its place (a mascot in a clinical paper reel
   usually does not).
6. **Budget.** Captures of a deployed app or a CLI: under an hour. Character poses: ~1.5 min per image plus lift and
   review; 6-10 poses is a normal set. Real-data point clouds and networks: the data preparation is the cost; drawing
   them with `gl.js` is quick. Draft with vector placeholders first.
7. **Honesty.** Run section 6 against the plan before anyone builds.

## 4. Decision matrix

| Material / purpose | Hero carrier | Support | Usually avoid | Signature moves |
|---|---|---|---|---|
| **Consumer app / product launch** | real UI in a device | mascot or product cutouts, kinetic type, chips of real values | dense charts, terminal | outline morph into the phone, typing wipe, chips fly to a grid, beat stamps, mascot lineup finale |
| **Dev tool / CLI / library** | real terminal casts | kinetic type (one giant word per command), code snippets drawn as type | mascots unless the project has one, stock photos | tilted window + zoom to the key line, typing transitions, glitch cuts, install-line end card |
| **Research repo (computational)** | real data viz (point clouds, networks, tables of results) | counters, figure captures, honest provenance chips | characters, playful stamps on serious claims | poster -> slices opener, counter zoom-out, tile wall of real runs, impact number, "computed vs authored" credits |
| **Paper / preprint explainer** | the paper's figures and its key numbers | rebuilt vector method diagram, equations as type | invented visuals of the method, mascots | paper sheet -> zoom into panel, re-plot from the table, highlight the key row, citation end card |
| **Pitch deck / startup pitch** | product capture + one market/traction number | deck theme colors and fonts, team photos if provided | data the deck does not contain | problem number impact, product in a device, traction counter, ask card |
| **Hackathon demo** | the demo flow (real UI or CLI) | honest tech-stack chip row, one climax moment | anything that takes longer than the hack itself | hook question, demo in 3 beats, "why it is safe/fast" climax, team credits, demo-data labels |
| **Portfolio / personal brand** | the work itself (screens, renders, stills) | name as logo, 1-2 real numbers | generic tech motifs | tile wall -> zoom-through into one piece, match cuts between pieces, signature transition |
| **Brand / campaign / physical product** | product cutouts or photos | mascot, tagline type, sensory details (liquid, light) | dashboards, logs | drop + splash, emerging products with reflections, sheen sweeps, halo, logo shine |
| **Data product / dashboard** | real dashboard UI | the real metric as an impact number | fake "live" numbers | counter roll, chart builds on the beat, zoom into a widget, before/after match cut |
| **Open-source project (README, docs site)** | README/docs web shots + whatever the project does (CLI, UI, data) | badges and emoji style from the README, contributor count | features the repo does not have | README scroll in a browser frame, star/contributor counters (real), install line |

Read the matrix as a starting point; a dev tool with a strong mascot gets the mascot; a research repo with a
beautiful web demo gets the UI.

## 5. Mixing rules

- **One hero carrier per scene.** Vector and type are free; a second raster carrier needs a reason.
- **One frame per source, for the whole reel.** Same phone, same terminal chrome, same paper sheet, same browser
  frame, drawn in vector from `style.palette`. Consistency reads as production value.
- **Integrate, do not paste.** Every capture gets a frame, depth (soft shadow, reflection, slight tilt), light (a sheen
  on entrance), and motion (drift, parallax, zoom). Never recolor, filter, or redraw the *content* of a real capture;
  dim or blur it only to focus attention, and say so in the credits if the dimming hides something material.
- **Bridge sources with motion, not cross-fades.** Outline morph (vector shape -> device frame), zoom-through (into a
  screen, a terminal line, a figure panel), match cut (same shape and position in two sources on the beat), data
  hand-off (a number in the capture becomes a giant kinetic number, then a chart).
- **Resolution budget.** Capture at 2-3x device scale; at the most zoomed moment a capture should map close to 1
  source px per screen px. Never upscale past ~1.2x of its source pixels.
- **Density.** A full capture is unreadable in two beats. Give it 2+ bars, or zoom to the one line, row, or element
  that carries the claim and mark it (brackets, lens, highlight bar, dimming the rest).
- **Characters are actors.** Give each character an action that advances the story (asks, checks, guards, rides,
  celebrates). Two characters on screen at most, except a finale lineup. Feet on a ground line; contact shadow always.
- **Real beats illustrative.** If a number is illustrative, it is labeled as such on screen; prefer a smaller real
  number to a bigger invented one.
- **Color.** Vector elements take `style.palette` roles; captures keep their own colors. When a capture's palette
  clashes, change the surrounding vector (frame, background tint, HUD), not the capture.

## 6. Honesty rules (violations are bugs, reviewed like copy errors)

1. **Label staged data.** "Demo data", "fictional persona", "fictional stores", "not a real map", "illustrative" in
   `style.palette.muted` or `ink2` (>= 4.5:1 on its background), 18-22 px at 1080p, visible >= 2 s wherever it
   applies, never covered by motion.
2. **Computed vs authored.** The end card or README lists what is computed from real data (and from where) versus
   authored animation (cameras, paths, pulses, morphs, timing). Case study: the FDDD reel's credits separate measured
   soma positions, computed spikes, and docking scores from authored cameras and connection pulses, and close with
   "Nothing faked." only because that is literally true.
3. **Reachable states only.** UI captures must be states the real product can produce. Staging (a chosen persona,
   pre-filled input, a frozen progress step captured from a static clone) is fine; composing a state the product
   cannot reach is not. A typing animation revealed from a real captured bubble is fine.
4. **Terminal output is real.** Run the command (`capture_cli.py`). Speed up typing and waits if needed and say
   "sped up" when timing is a claim. Elide with "..." without reordering or rewriting lines. Values on screen come from
   the bytes the command printed.
5. **Every number has a source.** Path or table in `STORYBOARD.md` next to the number. Keep units and rounding
   consistent. Do not mix a runtime/model count with an official count without saying which (FDDD: "167,122 is the
   runtime model's selected neuron count, not the official traced count").
6. **Figures stay the paper's figures.** Cite "Fig. N, Author et al., year". Re-plotting is allowed only from the
   paper's numbers and labeled "re-plotted from Table N".
7. **Qualify claims the way the source does.** If the material says "candidate", "screening", "signal", the reel
   does not say "proven", "cure", "detects". Banned wording comes from the source (`storyboard.md`).
8. **No impersonation.** Do not fake another company's UI, logo, or endorsement. Third-party names and logos appear
   only as honest attribution ("built on X") and per that brand's rules.
9. **Generated imagery stays a character.** GPT-image-2 poses extend the client's own mascot from its reference and
   keep its identity (a brand without a mascot gets one only if the client agrees). Never generate photoreal people,
   products, or places presented as real, logos or text, or anything that stands in for evidence (screenshots,
   charts, figures, logs). Generation spends the user's quota: only with their consent (`tools/imagegen.md`).
10. **Rights.** Mascots, photos, fonts, and screenshots come from the client or are licensed. Never ship assets from
    another project, from case studies, or from a downloads folder in a public repo.

## 7. Worked examples (carrier plan per scene)

**Consumer app, 30 s (case study: K-BeautyGate, 120 BPM).** Hook: vector serum drop + product cutouts emerging from
a glossy floor, question in kinetic type, AI reticle locks on. Brand: mascot pops up, halo, logo per-glyph. Ask: the
arch outline morphs into a phone; real captured UI layers inside; the real user bubble types in; chips of the
extracted conditions fly out. Evidence: vector source cards, magnifier lens, beat stamps; "demo data" label. Plan:
vector pastel map, pins, route, mascot rides the route head; "not a real map". Climax (dark): vector palace gate,
guard character, DENIED stamp, and the **real** sandbox log lines typed in. Finale: mascot lineup bouncing on the
beat, logo shine, credits, disclaimers.

**Dev tool / CLI (case study: CC-statusline reel grammar).** Palette from the tool's own theme (Catppuccin). Per
command, 1-2 bars: one giant command word lands on the downbeat; a real terminal cast in a window tilted in 3D types
the command and output; the camera zooms to the one line that matters; glitch or typing transition to the next
command. End card: the install line typed in, repo URL.

**Research repo (case study: FDDD, 128 BPM, 16 bars).** Frame 0 is a poster that breaks into slices. One neuron
pulses on the beat, zooms out to a real point cloud while a counter runs to the real count. Tile wall of 20 real runs
with real spike counts. Real docking ribbon and ligand pose. Impact number (-13.09 kcal/mol) slams, then becomes a
leaderboard row. Cards loop with tiny real-data visuals, each tagged "computed" or "authored". Slogan strobe. Logo
assembled from the real points. Credits: data sources, licenses, computed vs authored.

**Paper explainer, 30-45 s.** Title in the paper's own typography over a slow paper-sheet drift. Problem as one line
of type. Method: the paper's figure 1 extracted, zoom into the panel that matters, the rest dimmed. Result: the key
number from the results table as an impact number with its confidence interval, then a bar re-plotted from the table
(labeled). Limitation line in the paper's own words. End card: citation, DOI, code URL.

**Pitch deck, 30 s.** Deck theme fonts and colors (`extract_style.py` reads the pptx theme). Problem: one market
number with source. Product: real UI capture in a device, two beats of the core flow. Traction: real counters only
(projections labeled "projected"). Team: photos only if provided, else names in type. Ask: one card.

**Hackathon demo, 30 s.** Built in hours, so: kinetic type + real captures + vector. Hook question -> the demo flow
in 3 beats (input, agent work, result) -> the one technical wow (security block, speed, accuracy) as a climax with real
logs -> honest stack chips naming only what the demo actually calls -> team credit. Labels for demo data and
fictional personas.

**Portfolio, 30-60 s.** Tile wall of the real work on the beat -> zoom-through into one piece per 1-2 bars -> match
cuts between pieces sharing a shape or color -> name as logo with a signature shine -> one or two real numbers (years,
shipped projects). No generic tech motifs; the work is the carrier.

## 8. Per-carrier readiness checklist

- **Cutouts:** transparent WebP, trimmed to alpha, height <= ~980 px for 1080p, `meta.json {name:{w,h,eyes?}}`,
  blink variants where eyes were found, consistent lighting and floor shadow, each group member generated alone.
- **App UI:** layers (base, welcome, each bubble, each progress state) not whole screens; captured at the phone's
  web-view size (`reel-phone` device: 412 x 828 under a drawn 44-px status bar) with dpr 3, mobile UA, persona locale
  and a fixed clock; no paused CSS animations (blank captures); component states set on a static clone; `textFree` +
  `rows` on every bubble that types; json sidecars with rects, radii, and rows.
- **Terminal:** `.cast` from a real run at the target cols/rows under `P/assets/captures/term/`; the key line given as a
  RegExp in `STORYBOARD.md` (matched in the real output by `term.js`); `capture_cli.py scan` shows no secrets or
  personal data; the sidecar records the command, exit code, and provenance.
- **PDF figures:** extracted at >= 2x display size; caption and figure number in the json sidecar; license allows reuse.
- **Web shots:** cookie banners and chat widgets hidden; fixed viewport; light/dark matches the source; date noted.
- **Photos:** license confirmed; cropped to subject; no faces of people who did not consent.
- **Data:** every value traced to a file or table; units; rounding rule; "illustrative" flag where true.
