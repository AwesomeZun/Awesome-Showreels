# Tone & manner: the reel's style comes from its material

There are no style presets. Every reel takes its palette, type, motion, sound and voice from the material it is made
from: a repo, README, docs site, paper, deck, brand guide, website, screenshots, or a mix. The result is one spec,
`P/style.json` (schema: `templates/style.schema.json`), which every other part reads: the runtime (`env.style`,
`env.palette`), scenes, timing (`sound.bpm`), audio (`sound.*`), narration (`narration.*`, `layout.captions`) and
capture (`terminal`). Each decision in it carries a rationale that cites evidence from the material.

Contents: 1 workflow · 2 inventory · 3 measurements · 4 interpretation tables · 5 source kinds · 6 using the spec ·
7 case studies · 8 pitfalls · 9 review checklist.

## 1. Workflow: inventory → measure → interpret → spec → board

```bash
S=<skill>                                   # skills/motion-showreel
python3 $S/tools/extract_style.py --source <files|dirs|urls...> --project P --board
#   hints when the brief says so: --purpose pitch --audience investors --lang ko-KR --theme dark --narration on
#   no network: --offline        no Chromium: --no-snapshot (HTML/CSS/markdown are still parsed)
# read P/build/style-extract.md and look at P/build/style-board.png, then edit P/style.json
python3 $S/tools/extract_style.py --validate P/style.json
python3 $S/tools/extract_style.py --project P --board-only        # re-render the board after edits
python3 $S/tools/extract_style.py --tables                         # the exact interpretation tables
```

1. **Inventory.** Collect everything the material offers: copy, claims, rules, images, design tokens (section 2).
   The extractor walks folders, follows README/HTML image links and skips secrets (`.env*`, private keys) and build
   folders; a source you pass explicitly and it skips is named in a warning.
2. **Measure.** Palette, contrast, fonts, type ratios, language, register, text density and tone rates (section 3).
   Web pages, local HTML and markdown are rendered by `tools/source_snapshot.mjs` (Chromium, light and dark when
   the page supports both). PDFs are rasterised with PyMuPDF (poppler as fallback). Slides are read from their
   theme XML and rendered through `soffice` to PDF when it is installed. Keynote (`.key`) decks give their preview
   and placed images directly; export them to PDF from Keynote for the text, fonts and every slide.
3. **Interpret.** Measurements become eight tone axes, and the axes become parameters through fixed tables
   (section 4). The draft is a starting point. Read the material yourself and overrule the draft when the evidence
   says otherwise.
4. **Spec.** The draft goes to `P/style.json` with `meta.draft: true` and a `review` list. Edit it, keep the
   rationale truthful, then set `meta.draft` to `false`. A reviewed spec is never overwritten; reruns write
   `P/build/style.draft.json` unless you pass `--force` (the old file is saved as `build/style.prev.json`).
5. **Board.** `P/build/style-board.png` shows the swatches with contrast, the five font stacks set in real text, a
   sample title card with grain and vignette, motion/sound/narration facts and source thumbnails. Show it to the
   client before building scenes.

| output | content |
|---|---|
| `P/style.json` | the spec (draft until reviewed) |
| `P/build/style-extract.md` | readable log: sources, palette table with contrast, fonts seen, axes, metrics, inventory, review, warnings, evidence |
| `P/build/style-extract.json` | the same as data (evidence ids `E1…` are what rationale strings cite) |
| `P/build/snapshots/` | page renders `<slug>-light.png` / `-dark.png` / `-full.png`, GitHub README crops, PDF and slide pages, collected CSS, `index.json` |
| `P/build/style-board.html` / `.png` | the board (self-contained HTML; PNG rendered by Chromium, Pillow fallback) |

Requirements: Python 3 with numpy and Pillow. Optional: PyMuPDF, jsonschema, fontTools, Node with `playwright-core`
(resolved from `runtime/node_modules`, the working directory, `SHOWREEL_MODULES` or the global npm root) and a
Chromium (`CHROME_PATH`, Playwright's own, a Playwright cache, or a system Chrome/Chromium/Edge), `soffice`,
poppler, `fc-list`.

## 2. Inventory: what to collect and where it goes

| item | how it is found | goes to |
|---|---|---|
| Title, taglines, slogans | first H1 / `<title>`, meta description, bold lead line, title-slide subtitle, first sentence of an abstract | STORYBOARD (verbatim) |
| Claims with numbers | sentences with %, ×, ms, units, currency | STORYBOARD; each needs its source on screen or in credits |
| Provenance | "measured", "computed", "data from", "pilot data", "n =" | STORYBOARD credits: what is computed vs authored |
| Disclaimers | "fictional", "demo data", "not affiliated", 가상, 데모 | STORYBOARD: keep visible (small, `muted` or `ink2`, ≥ 4.5:1) |
| Wording rules | "never say", "instead of", "do not use", 금지, 대신, 표기 | STORYBOARD terminology rules. Violations are bugs |
| Register | 합쇼체 / 해요체 / plain; です·ます; conversational / formal English | all on-screen copy and narration lines |
| Commands | `$ …` lines and shell code blocks | `tools/capture_cli.py` candidates |
| Links | non-badge URLs | `tools/capture_ui.mjs` / web-shot candidates |
| Speaker notes (pptx) | notes slides | narration hints |
| Logos, mascots, screenshots, figures, photos | image class from name + pixels (cutout, flatness, colour count, EXIF) | `motion.visualSources`, imagery/capture work |
| Design tokens | CSS custom properties, Tailwind config, `<meta theme-color>`, web manifest, pptx/docx theme XML, PDF fonts, terminal/editor themes (kitty, ghostty, alacritty, iTerm, Windows Terminal, VS Code, base16) | `palette`, `fonts`, `terminal` |

The extractor fills the inventory into the log. Reading the material yourself remains mandatory for exact copy and
for rules it cannot see (tone of a brief, what the client said).

## 3. Measurements

**Palette.** Every image and page render is reduced to an area-weighted histogram in CIE Lab and clustered with
weighted k-means. Near-duplicates are merged by CIEDE2000, transparent pixels are ignored, and the share of each
cluster on the image border marks backgrounds. Each image class weighs differently (logo and mascot colours define
accents, page renders define backgrounds and text, photos count little). Exact authored colours (CSS tokens with
role names, computed page styles, slide theme colours and slide backgrounds, terminal configs, `theme-color`) outrank
measured clusters. Hex codes written in text are weighed by context: a role spec in prose ("Primary: #…", "--brand:
#…" in a code block) counts most, plain prose less, a table cell or a long listing of colours least (such text
usually describes something else: a comparison, an example), and a word right before the code names its role ("light
#FFF7F2", "stage #0A0E17" → bg). Badge colours the author picked by hex count as the README's palette; shields'
named defaults barely count. When the chosen accents come only from text hex codes, the draft adds a review item. Renderer chrome is masked: the neutral markdown stylesheet, GitHub's own UI (on a GitHub repo URL
only the README text, badges, its own images and a README crop count), and white PDF paper (treated as paper, not
as brand).

**Roles.**
- `bg`: the largest low-chroma area in the decided theme. Pure white is softened to about L*98, and pure black is
  lifted to about L*5.5, because both read badly on video. The rationale records the original.
- `ink`: a declared or computed text colour (translucent values are composited over their background), else dark
  (or light) details of logos and mascots, else an accent-tinted near-black or near-white. Pure black or white text
  is softened slightly; `ink2` never out-contrasts `ink`.
- `accent` … `accent3`: chromatic colours with brand/theme tokens first. What the material names wins its slot:
  "Primary colour: #…" in a guide, a token named primary/brand, a slide theme's `accent1`. Each accent must differ
  from the others in hue (> 28°) or lightness (> 22) and by ΔE00 > 10. Missing ones are derived: halfway between
  two measured accents, or by hue offsets chosen by tone.
- `ok`/`warn`/`deny`: named tokens or theme colours first, then a non-primary accent already in the right hue
  window, else derived at a hue that keeps them apart from the accents.
- Optional extras: `accentInk` (accent hue at ≥ 4.5:1 for text), `onAccent` (text on accent fills; a measured brand
  pair ≥ 3:1 is kept), `line`.
- `paletteAlt`: the opposite theme for contrast scenes. It is taken from the material's other scheme, else a sibling
  theme (Catppuccin Latte ↔ Mocha, Solarized, GitHub), else derived.

**Contrast (WCAG 2.x ratio on `bg`).** `ink` ≥ 7:1 (9:1 when inferred from imagery); `ink2` and `muted` ≥ 4.5:1
(both are text roles: secondary copy, labels, meta lines, disclaimers); display type ≥ 3:1; semantic colours ≥ 3:1.
`line` is the decoration role (rules, grids, outlines) and carries no text. `ok` against `deny` is checked under
deuteranopia and protanopia simulation (Machado 2009); a warning means: pair them with icons or words.

**Fonts.** Declared families (CSS, `@font-face`, Google Fonts links, Tailwind, slide/docx theme fonts, PDF fonts via
PyMuPDF or pdffonts) and actually rendered families (Chromium `CSS.getPlatformFontsForNode`). A declared family
outranks the fallback that rendered it. Installed families come from `fc-list` (else a fontTools scan). Each stack is
built as: the source family, then its installed alias (`JetBrains Mono` → `JetBrainsMono NF`), then two installed
alternatives of the same category (grotesk, geometric, rounded, humanist, serif, display-serif, mono, handwriting),
then the generic family. Font files found inside the material are listed in `fonts.files` (project-relative; copy
them into `P/assets/fonts` with `--copy-fonts` only if their licence allows embedding; the log names the licence).
Family names are normalized (a variable font's default instance such as "Nunito ExtraLight" becomes "Nunito") and
each font file is listed once. When the copy is mostly Korean, Japanese or Chinese and the source face is Latin-only,
the CJK face is placed second in the display and sans stacks and the pairing is flagged for review.

**Type.** The heading/body size ratio of the source sets the modular step. Source heading weights inform
`displayWeight`.

**Text.** Language is found by script counts plus stop words and written as BCP-47 (`ko-KR`, `en-US`, `ja-JP`).
Register is detected per language. Density is words per section, page or slide. Rates per 1,000 words are counted
for '!', emoji (including `:shortcodes:`), marketing, playful, warm and luxe words, hedges, citations, technical
terms, code-like tokens, numbers and data words.

## 4. Interpretation tables

Eight axes in 0..1 drive everything: **energy, playful, technical, serious, warm, luxe, dark, data**
(`calm` = 1 − energy, `light` = 1 − dark). In short:

| axis | raised by | lowered by |
|---|---|---|
| energy | '!', emoji, marketing words, many numbers, saturated or neon accents, loud badges, sparse slogan copy | hedges, citations, long sentences |
| playful | emoji (cute ones most), '!', playful words, pastel palette, mascot or cutout logo, rounded type | citations, hedges, technical density |
| technical | technical vocabulary, code tokens, code blocks, shell commands, mono type, terminal themes | — |
| serious | hedges, citations, serif type, long sentences, formal register | playful, '!' |
| warm | warm hues (the primary accent counts half), warm words, cute emoji | cool hues |
| luxe | display serif, luxury words, low-chroma accents, sparse copy | playful, technical |
| dark | the decided theme | — |
| data | numbers, data words, tables, figures and charts | — |

The theme follows measured background area. If the material supports both schemes, its default (un-prefixed)
scheme wins. A named theme decides when nothing is measured. As a last resort a technical, non-playful tone leans
dark (flagged for review).

### Pace and motion

| parameter | rule |
|---|---|
| pace | calm < 0.35 ≤ medium ≤ 0.62 < energetic (energy) |
| spring (engine `spring(t, f, z)`) | f = lerp(1.6, 3.0, energy); z = lerp(0.85, 0.38, 0.7·playful + 0.3·energy) + 0.1·serious, clamped 0.35–0.9 |
| overshoot (Back `s`) | lerp(0, 1.9, 0.75·playful + 0.25·energy) · (1 − 0.5·serious) |
| ease | outBack when playful; outExpo when technical and fast; outQuint when serious or luxe; outC otherwise |
| text reveal | kinetic (default), kineticPop (playful), revealLine (serious, luxe), scramble (technical, data), typing (terminal/CLI) |
| grain | 0.03 + 0.03·dark + 0.015·playful·light + 0.01·warm − 0.01·serious (0.015–0.08) |
| vignette / bloom | a = lerp(0.12, 0.5, dark), colour = deep tint of the accent (light) or bg (dark); bloom only on dark stages with saturated accents |
| margin | lerp(96, 144, 0.5·serious + 0.3·luxe + 0.3·calm) px, rounded to 8 |
| radius | the material's button/card radius, else lerp(4, 32, playful) − 6·technical |
| HUD | technical and not calm, or purpose pitch/demo/tool, or data-heavy and not calm |
| type scale | 24 px · m^k for k = −2…7 (26 px base for serious or CJK), m = clamp(headingRatio^¼, 1.18, 1.38) |
| display face | the material's heading face; otherwise mono for terminal tools, rounded for playful, display serif for luxe, serif for scholarly, grotesk for technical, geometric for energetic |

### Transitions (best 3–5 with score ≥ 0.3; names as in reel.config `in`)

| transition | wins when |
|---|---|
| match | almost always useful; more so for serious, data and luxe material |
| cut | serious or luxe material; editorial calm |
| blobWipe | playful, warm, light, non-technical |
| zoomInto | there are app/web/terminal captures to dive into |
| whip | energetic, not serious |
| glitch | technical on a dark stage; terminal tools |
| flash | energetic dark material with data (keep ≤ 3 flashes/s) |
| strobe | rare: energetic, dark and technical at once |
| impact | numbers that land (big claims) at medium or high energy |
| portalFlash | playful, warm reveals (doors, portals) |

### Sound (`sound.preset` is an instrument family for `audio/arrange.py`, not a visual style)

The highest-scoring preset that fits the pace wins. BPM sits inside the preset's range by energy. The key is a free
choice; the extractor maps the accent hue to a key in Scriabin's spirit (red C, orange G, yellow D, green A, cyan E,
blue B, violet F#, purple Db, pink Ab, deep red F). The mode is minor when dark, serious, technical and cool outweigh
playful, warm and light. Drums are full at energy ≥ 0.55, light at ≥ 0.25, otherwise none.

| preset | chosen for | BPM | instruments (synth.py names) | typical SFX family |
|---|---|---|---|---|
| bright-pop | playful, warm, light, energetic consumer material (never luxe) | 112–124 | pad pluck bell marimba bass + kick clap hats shaker | glassy |
| dark-synth | dark, technical, data-heavy, energetic | 118–130 | pad saw-pluck arp saw-bass sub stab + kick clap snare hats | digital |
| ambient | calm, serious, scholarly, luxe | 84–100 | pad strings piano glass bell sub (+ rim shaker) | minimal |
| corporate | mid energy, light, pitch/launch, trustworthy | 100–118 | strings piano pluck bell bass + kick clap/rim hats shaker | minimal / glassy |
| lofi | warm, calm-ish, indie/maker, a little playful | 80–92 | epiano pad bass crackle + kick snare/rim hats | organic |
| cinematic-lite | serious + luxe or dark, dramatic claims | 88–110 | strings piano pad sub + toms kick snare | minimal |

Calm reels use ambient, lofi, cinematic-lite or corporate; energetic reels use bright-pop, dark-synth, corporate or
cinematic-lite. Below 90 BPM a bar is longer than 2.6 s (84 BPM → 2.86 s), so plan calm reels in 1-bar scene
units. Energy per music part: intro 0.25 + 0.15·e, groove 0.45 + 0.35·e, breakdown 0.25 + 0.2·e, drop 0.6 + 0.4·e,
outro 0.3 + 0.2·e.

### Narration (Gemini prebuilt voices; `styleTag` is a bracket audio tag, never read aloud)

Narration is recommended for papers, docs, explainers, serious material, or data-heavy technical material. It is
not recommended for playful launch, brand or portfolio material, or for material under 80 words. The user decides.
Captions follow the narration decision; for CJK languages they use the CJK stack.

| material | voice (character) | tag |
|---|---|---|
| energetic, playful launch | Puck (upbeat), Laomedeia (upbeat), Achird (friendly) | `[bright, playful]` |
| energetic | Puck, Fenrir (excitable) | `[fast, energetic]` |
| developer docs, explainers | Charon (informative), Iapetus (clear), Kore (firm) | `[confident, clear]` |
| research paper | Sadaltager (knowledgeable), Charon, Iapetus | `[calm, measured]` |
| warm consumer, calm | Sulafat (warm), Aoede (breezy), Achird | `[warm, friendly]` / `[warm, gentle]` |
| corporate pitch | Kore, Schedar (even), Laomedeia | `[clear, upbeat]` |
| luxury, brand | Algieba (smooth), Achernar (soft) | `[soft, elegant]` (calm) / `[smooth, confident]` (medium) |

### Mood words

Each word has a signature over the axes. It is scored by how far those axes deviate from neutral; on/off signals
(dark, pastel, neon, terminal, citations, heavy headings) count half. The five best words above 0.05 are kept, for
example "playful, bouncy, energetic, friendly", "technical, cool, futuristic, precise, nocturnal", "calm, credible,
trustworthy, scholarly", "bold, confident, punchy, data-driven". Gated words (pastel, neon, hacker, scholarly) need
their signal.

### Purpose and audience at a glance

| purpose / audience | what the reel should feel like | typical outcome |
|---|---|---|
| consumer launch (consumers) | music-led, characters if the brand has them, short copy, big type | energetic · blobWipe/zoomInto/whip · bright-pop 116–124 · no VO |
| developer tool / docs (developers) | real captures, mono labels, crisp | medium · glitch/zoomInto/match · dark-synth 120–126 · VO Charon + captions |
| research paper (researchers) | provenance first, figures, generous whitespace | calm · match/cut · ambient 84–92 · VO Sadaltager + captions · dataViz |
| pitch deck (investors, judges) | one claim per scene, numbers that land, the template's colours | medium · match/whip/impact · corporate or bright-pop 108–120 · VO optional |
| brand guide (designers, marketers) | the guide's exact colours and type, its do's and don'ts | calm–medium · match/cut · cinematic-lite or ambient |
| terminal tool (developers) | real terminal recordings, giant command words | medium–energetic · glitch/zoomInto/match/impact · dark-synth 122–128 · typing reveals |

## 5. Source kinds

- **README (GitHub style).** Badges show tooling and loudness (`style=for-the-badge` reads loud; badge colours are
  weak evidence). Emoji kind and density set playfulness. The logo and mascot images define the accents; screenshots
  and GIFs define the stage. With `<picture>` or `#gh-dark-mode-only`, both logo variants exist. The rendered
  snapshot is for review only; its stylesheet is not evidence. For a `github.com/owner/repo` URL only the README
  counts: its images are downloaded (online only), analysed and never copied into the repo.
- **Docs site / web app.** Computed styles and resolved CSS custom properties give the exact roles (`--bg`,
  `--text`, `--primary`, `--success`…). Light and dark schemes are both captured, the default one becomes the theme
  and the other becomes `paletteAlt`. Prefer `app-ui` and `web-shots` captures over redrawing the UI.
- **Research paper (PDF).** White paper is not a brand colour. The vector figure palette (matplotlib or ggplot
  series colours) supplies the accents. Text colours and embedded fonts give ink and a serif. Hedges and citations
  make the reel calm and credible. Claims need provenance on screen. Use `pdf-figures`
  (`tools/pdf_figures.py`), real numbers in data viz, narration with captions.
- **Pitch deck (pptx/odp; Keynote via its PDF export).** The template's theme colours (`accent1…6`, `dk1/lt1/dk2/lt2`) and fonts
  (major/minor) are the material's own design system, and their actual usage in the slides weights them. Slide
  backgrounds decide light vs dark; a minority of dark slides becomes `paletteAlt` for climax scenes. Slogans and
  big numbers drive `impact` transitions. Speaker notes are narration hints.
- **Brand guide (PDF/docx/markdown).** Hex values and font names written in the text are exact evidence. Each
  colour takes its role from the words just before it ("Primary colour: #1F3A2E", "Background: #F5F1E8"), and
  font names come from lines like "Typeface: Inter". Stock office themes (default Office, LibreOffice or Google
  palettes in a .docx/.pptx) are ignored. Copy the guide's do's and don'ts, including logo rules (never recolour,
  clear space, minimum size), into STORYBOARD.
- **Terminal / CLI tool.** Named themes (Catppuccin, Dracula, Nord, Gruvbox, Solarized, Tokyo Night, One Dark,
  Monokai, Rosé Pine, Everforest, Kanagawa, GitHub) and terminal configs give the palette and an exact ANSI table
  in `style.terminal`. Use mono display type, real recordings (`tools/capture_cli.py` → `runtime/term.js`), and
  typing or scramble reveals.
- **Images only (mascot art, product shots, photos).** Cutouts with transparency are logos or mascots (by name, else
  by colour count and flatness). `characters: true` only when a mascot image exists. Generate extra poses only from
  the client's own mascot (`references/imagery.md`). Photos weigh little for palette; use them as `photos`
  sources.
- **Mixed sources.** Pass them all in one call. Exact tokens beat measured colours. The log shows which source each
  role came from.

## 6. Using the spec

- **Palette.** `env.palette` carries the twelve roles. Use `accentInk` for text in the accent hue, because pastel or
  neon accents are fills and glows. `swatches` lists the measured colours for decoration beyond the roles. For a
  scene whose reel.config sets `dark` against the layout theme, draw with `paletteAlt`.
- **Terminal.** Pass `style.terminal` (`{bg, fg, ansi[16]}`), or its `theme` name, as the `term.js` theme so
  recordings match the material's terminal.
- **Fonts.** The stacks work directly in `ctx.font` and CSS. List embeddable font files in `fonts.files` for the
  single-file HTML. System fonts render locally but are not embedded.
- **Type.** `type.scale` steps are px at 1080p. `tracking` is the headline letter-spacing in em; `trackingLabel` is
  for HUD tags and credits.
- **Sound.** Edit `sound` freely (BPM, key, mode including church modes, instruments from `python3 audio/synth.py
  list`, drums, SFX family, energy). The BPM stays the same across all cuts.
- **Review.** Clear the `review` list as you decide each item. Keep `rationale` strings true: they are the answer to
  "why does it look like this?"

## 7. Case studies (worked examples, not presets)

**K-BeautyGate (cosmetics × AI agent hackathon pitch).** Material: a Korean pitch outline (warm, consumer-facing,
strict wording rules and disclaimers), plush pastel bunny mascot images and the app's pastel pink UI.
- Palette: cream `#FFF8F6`, blush `#F9DDE2`, rose `#EC9AB0` from the mascot and app. Brand berry `#A74762` served as
  the text-safe accent (what `accentInk` captures); ink `#2E2228` is berry-tinted. A dark climax used a night/plum
  stage (what `paletteAlt` captures).
- Type: Pretendard for Korean, a Didot-style serif for the logo (cosmetics premium).
- Motion: springy character work (spring, squash, jelly, blink), blobWipe, zoom into the phone, whip, glitch into
  the dark climax, portal light burst.
- Sound: 120 BPM bright pop in F major, music-led, no narration.
- Visuals: real app UI captured as layers in a phone. The wording rules ("쇼핑 계획", never "정품 확인") and
  disclaimers ("가상 인물", "데모용 가상 자료") lived in the STORYBOARD. NVIDIA green `#76B900` appeared only on
  the NVIDIA node, never as the identity.

**FlyGate / FDDD (research-heavy repos with dark dashboards and real computed data).**
- Palette: near-black navy stage (`#03060A`/`#0A1622`, ink `#EEF5F2`), neon accents (cyan `#00D9FF`, amber, violet,
  lime).
- Type: Pretendard + JetBrains Mono labels.
- Motion: point clouds, connectome lines, huge counters, HUD chrome (project tag top-left, step tag top-right), and
  flash, match, whip, impact, zoom, glitch and strobe cuts.
- Sound: 128 BPM minor synth; the 15-s cut was edited to 8 bars rather than trimmed. FlyGate added Gemini narration
  (Puck, `[fast, energetic]`) with burned-in captions.
- Credits state what is computed versus authored ("Real docking scores. Real spikes. Nothing faked.").

**CC-statusline (terminal tool themed with Catppuccin).** The Catppuccin palette and its ANSI table, mono "one giant
word per command" titles, real terminal captures tilted in 3D with zooms to the key line, and glitch and typing
transitions. The extractor reproduces this from a README that names the theme or ships a kitty/ghostty config.

**Same method, five different materials** (synthetic test sources; drafts straight from the extractor):

| material | theme · bg · accent | display | pace · motion | sound · voice |
|---|---|---|---|---|
| playful README + pastel logo | light `#FFF5F9` · `#F7B9D3` / `#CDB8F0` / `#BDE8D8` (the logo's own) | rounded (Nunito → Arial Rounded) | energetic · blobWipe, zoomInto, whip | bright-pop 123 F · no VO |
| dark docs page with CSS tokens | dark `#0B1020` · `#7C5CFF` / `#22D3EE` | Inter | medium · glitch, zoomInto, match | dark-synth 124 D♭m · Charon |
| 2-page paper PDF | light `#F8F9FC` · figure navy/orange/green | Times → serif stack | calm · match, cut | ambient 84 F#m · Sadaltager |
| pitch deck pptx (custom theme) | light `#F4F1EA` (2/5 slides navy → paletteAlt) · `#FCA311` | Montserrat → Avenir Next | medium · match, whip, impact | bright-pop 118 D · no VO |
| CLI README + Catppuccin kitty theme | dark `#1E1E2E` · `#CBA6F7` (Mocha), Latte as paletteAlt | JetBrains Mono | medium · glitch, zoomInto, match | dark-synth 125 D♭m · Fenrir |

## 8. Pitfalls

- **Third-party brands.** Logos and colours of tools or partners named in the material are not the reel's
  identity. Use them only for their own marks. The extractor warns when an accent sits within ΔE00 4 of a
  well-known brand colour that the material names.
- **Renderer chrome is not material.** The GitHub UI, a neutral markdown stylesheet, white PDF paper, browser
  defaults and slide placeholders are not the material's design.
- **Contrast.** Pastel and neon accents usually fail as text; use `accentInk`. Keep `ink` ≥ 7:1 because video
  compression and small screens eat contrast. Every text role (`ink2`, `muted`, captions, disclaimers) reaches
  4.5:1; only `line` and fills may sit lower.
- **Colour-blind safety.** Never signal ok/deny by colour alone; add ✓/✕, stamps or words.
- **Photosensitivity.** At most 3 flashes per second, and no full-frame saturated red flashes (WCAG 2.3.1).
- **Words.** Keep the source's register (해요체 stays 해요체), its exact copy, its banned words and its
  disclaimers. Claims need provenance; never invent numbers.
- **Fonts and licences.** A font that is not installed falls back silently; install it or ship its file. Embed
  only fonts whose licence allows it (OFL is fine; many commercial fonts are not). Never copy fonts, images or audio
  from reference projects into this repo.
- **Mood words are heuristics.** Read the material. A children's reading app can be playful and calm at once; the
  numbers only start the conversation.
- **Dual-scheme material.** Pick one theme for the reel and use `paletteAlt` for contrast scenes. Do not average
  the two schemes.
- **Tempo and length.** A calm BPM means long bars; check that the scene minimums fit the cut (`timing/plan_cut.py`
  reports it).
- **Secrets.** The extractor never opens `.env*` or key files. Do not paste keys into the material folder.

## 9. Review checklist (before the storyboard)

- [ ] The board matches the material at a glance (open both side by side).
- [ ] Palette roles are right; contrast badges are AA/AAA where text sits; `paletteAlt` is usable for dark scenes.
- [ ] Fonts are installed or `fonts.files` lists licensed files; the CJK stack fits the language.
- [ ] Mood words, pace and BPM fit the purpose and the target length.
- [ ] The narration decision is made with the user (voice, tag, language).
- [ ] `visualSources` names the captures to make (app UI, terminal, CLI, PDF figures, web shots, mascot poses).
- [ ] Wording rules, register, disclaimers and provenance are copied into STORYBOARD.
- [ ] `review` is empty or resolved, rationale is still true, `meta.draft` is `false`, `--validate` passes.
