# spark-bench storyboard and build contract

Example project of the motion-showreel skill. Timing lives in `reel.config.json`; this file holds the words and the
choreography. Every scene file, the soundtrack and the narration follow it. Violations of section 2 are bugs.

## 1. Brief

- **One sentence:** spark-bench makes sparse-attention speedups comparable: one command pins the machine and runs
  every kernel the same way.
- **One scene:** the 64k-token attention matrix as 4,096 blocks; 3,422 sink away, 674 stay lit (poster frame: end of
  the hook's in-phase, cut `15` or `30`, t = 3.28 s).
- **One message:** "One command. Numbers you can compare."
- **Audience / purpose / venue:** ML-systems researchers and developers / developer-tool launch / README preview
  (muted autoplay: every number and keyword is on screen as type) and talks with sound. The shipped reel is
  music-led; captions are burned in once a real voice is synthesized (section 8).
- **Languages:** en (en-US). No CJK copy.
- **Source material** (`source/`, written for this example; every number in it is demo data):

| File | What it contributes |
|---|---|
| `README.md` | the copy: tagline, abstract (first sentence = the hook), install and usage lines, results table, method, the block pattern (band 7 + 2 global, 1,024-token blocks at 64k), disclaimers |
| `docs/index.html`, `docs/theme.css` | the design system: 12 colour tokens (`--sb-*`), Space Grotesk + JetBrains Mono (`docs/fonts/`, OFL), the 3x3 block mark, Figure 1 (the block mask) |
| `spark_bench/cli.py`, `bin/spark-bench`, `pyproject.toml` | the CLI that the reel captures for real (`spark-bench run` replays the demo run) |
| `results/demo-run.json` | the demo run (5 seeded repeats per kernel and length); the CLI computes every number from it; copied unchanged to `assets/data/demo-run.json` for the `repeats` scene |

## 2. Copy rules (violations are bugs)

### 2.1 Exact strings

| id | String (verbatim) | Scene | Role |
|---|---|---|---|
| c1 | `ATTENTION · 64K TOKENS · 1,024-TOKEN BLOCKS` | matrix | kicker |
| c2 | `4,096` then the count down to `674` | matrix | hero number |
| c3 | `BLOCKS COMPUTED · DENSE` → `BLOCKS COMPUTED · SPARK PATTERN` | matrix | label |
| c4 | `of 4,096` | matrix | label |
| c5 | `16.5% computed · 3,422 blocks never touched` | matrix | sub |
| c6 | `BAND · 7 BLOCKS` / `local window`; `GLOBAL · 2 BLOCKS` / `every row and column` | matrix | callouts |
| c7 | `RUN-TO-RUN VARIABLES` | problem | kicker |
| c8 | `hardware`, `clocks`, `warm-up`, `repeats` | problem | row labels |
| c9 | `fingerprint 437589 · GPU, driver, clocks` / `pinned` / `3 runs before timing` / `5 · seed 1234 · median + spread` | problem | locked values |
| c10 | `spark-bench fixes those variables.` (README sentence; `fixes` in accent) | problem | verdict |
| c11 | `ONE COMMAND · ONE TABLE` | cli | kicker |
| c12 | `RUN` | cli | giant command word |
| c13 | `real terminal capture · exit 0 · 1.8 s` (exit and seconds read from the capture sidecar) | cli | provenance |
| c14 | `replays results/demo-run.json · demo data` | cli | provenance |
| c15 | the terminal itself: real bytes of `spark-bench run`, never retyped | cli | capture |
| c16 | `THROUGHPUT VS DENSE · MEDIAN OF 5 SEEDED REPEATS` + `DEMO DATA` chip | results | kicker, disclaimer |
| c17 | legend `dense` `block-sparse` `spark`; axis `0×`…`4×`, `4k` `16k` `32k` `64k`, `tokens`, `1.0× dense` | results | labels |
| c18 | `spark: 1.3× → 4.1× as length grows 16×` | results | hold annotation |
| c19 | `p50 ms` + `47.6` `14.9` `11.6` | results | hold labels |
| c20 | `4.1×` | impact | hero number |
| c21 | `SPARK · 64K TOKENS · VS DENSE` | impact | kicker |
| c22 | `the dense throughput · median of 5 repeats` + `DEMO DATA` chip | impact | sub, disclaimer |
| c23 | `P50 LATENCY @64K`, `ms · lower is better`, `dense 47.6 ms`, `spark 11.6 ms` (counting down) | impact | panel |
| c24 | leaderboard `01 spark` `band 7 + global 2` `4.1×` `11.6 ms p50`; `02 block-sparse` `block mask` `3.2×` `14.9 ms p50`; `03 dense` `baseline` `1.0×` `47.6 ms p50`; `spread 1.8%` `1.6%` `1.2%` | impact | hold |
| c25 | `spark-bench` + the 3x3 block mark (particles) | logo | wordmark |
| c26 | `Reproducible benchmarks for sparse attention kernels.` (README tagline) | logo | tagline |
| c27 | `FICTIONAL EXAMPLE PROJECT · DEMO DATA` | logo | disclaimer |
| c28 | `$ pip install -e .` / `$ spark-bench run` | logo | hold: install |
| c29 | `pattern  computed from the README` / `numbers  results/demo-run.json · demo data` / `terminal real capture · music synthesized` | logo | hold: credits |
| c30 | HUD: `SPARK-BENCH`, timecode, beat dots, `NN / NN <label>`, `DEMO DATA · FICTIONAL PROJECT` (no cut label: `hud.showCut` is off) | all | chrome |
| c31 | `WHY THE GAIN GROWS · THE SAME PATTERN AT FOUR LENGTHS` + `DEMO DATA` chip | scaling (60 only) | kicker, disclaimer |
| c32 | `4k` `16k` `32k` `64k`; `4×4 blocks` `16×16 blocks` `32×32 blocks` `64×64 blocks`; share counting down from `100%` to `100%` `57.0%` `31.4%` `16.5%` + `computed` | scaling | panel labels |
| c33 | `1.3×` `2.4×` `3.3×` `4.1×` + `spark vs dense` | scaling | gains |
| c34 | `The gain grows with length.` (README sentence; `gain` in accent) | scaling | verdict |
| c35 | `P50 LATENCY @64K · 5 SEEDED REPEATS PER KERNEL` + `DEMO DATA` chip | repeats (60 only) | kicker, disclaimer |
| c36 | `spark` `block-sparse` `dense` + `p50 11.6 ms` `p50 14.9 ms` `p50 47.6 ms`; axis `−2%` `−1%` `median` `+1%` `+2%`; `spread 1.8%` `1.6%` `1.2%` | repeats | lane labels |
| c37 | the five raw p50 timings per kernel, typed on its focus bar (e.g. `11.63  ·  11.52  ·  11.54  ·  11.73  ·  11.60 ms`) | repeats | hold |
| c38 | `Median of 5 seeded repeats · spread 1.2–1.8%` (README method + the run's numbers; `Median` in accent) | repeats | verdict |

### 2.2 Banned wording

The README says every number is demo data and that the project is fictional. Regexes for the reviewer (scene code,
narration, captions, frames):

- `(?i)\bmeasur(ed|ement)s?\b` next to a number: the numbers are demo data, not measurements.
- `(?i)\breal (results?|data|numbers|speedups?)\b`: only the terminal capture is "real", and it says what it replays.
- `(?i)\b(SOTA|state[- ]of[- ]the[- ]art|fastest|best[- ]in[- ]class|guarantee[sd]?|proven)\b`: over-claims the source never makes.
- `(?i)apache|\bspark\s+(sql|streaming|cluster)\b`: spark-bench is not related to Apache Spark.
- Any GPU vendor or model name: the demo run has no hardware (`demo-gpu`).

### 2.3 Disclaimers

| Text | Scenes | Position | Size | On screen |
|---|---|---|---|---|
| `DEMO DATA · FICTIONAL PROJECT` | all (HUD) | bottom right, x = 1842 right-aligned, y = 1006 | 16 px mono | whole reel |
| `DEMO DATA` chip | results, impact | after the kicker (results), under the sub (impact), top right (impact hold) | 14 px mono, warn | whole scene |
| `… · DEMO DATA` in the CLI's own summary line | cli | inside the capture | terminal | from beat 6.7 |
| `replays results/demo-run.json · demo data` | cli | x = 126, y = 644 | 19 px mono, muted | beats 1.5–6.6 |
| `FICTIONAL EXAMPLE PROJECT · DEMO DATA` | logo | centred, y = 720 | 16 px mono, muted | from beat 2.8 |

### 2.4 Provenance

| Number / claim on screen | Source | Rounding / unit |
|---|---|---|
| 4,096 blocks | 64k tokens / 1,024-token blocks = 64 per side, 64² (README "How it works") | integer, thousands separator |
| 674 computed, 3,422 never touched, 16.5% | computed in `scenes/matrix.js` from the README's pattern (|i − j| ≤ 3 or i < 2 or j < 2); the same mask as Figure 1 in `docs/index.html` | integer; 1 decimal |
| the 4,096 → 674 count | the number of skipped blocks that have sunk, from the same stagger formula as the GPU morph | integer |
| 1.0× … 4.1× per kernel and length | `assets/data/results.json` (`spark-bench run --json`, computed from `source/results/demo-run.json`) = README table | 1 decimal + `×` |
| 47.6 / 14.9 / 11.6 ms | p50 (median) latency at 64k, same file | 1 decimal + ` ms` |
| spread 1.2 / 1.6 / 1.8% | (max − min) / median of the 5 repeats at 64k, same file | 1 decimal + `%` |
| 1.3× → 4.1×, "length grows 16×" | spark at 4k and 64k; 65,536 / 4,096 = 16 | as above |
| fingerprint 437589, seed 1234, 3 warm-ups, 5 repeats | printed by the CLI (sha256 of the demo run's fingerprint object) and README "How it works" | 6 hex digits |
| exit 0 · 1.8 s | `assets/captures/term/run.json` (exit, seconds 1.784) | 1 decimal |
| 16 / 146 / 322 / 674 kept blocks, 100 / 57.0 / 31.4 / 16.5% (scaling) | computed in `scenes/scaling.js` from the same README pattern at 4k, 16k, 32k and 64k (4² … 64² blocks) | 1 decimal |
| 1.3× / 2.4× / 3.3× / 4.1× (scaling) | spark's `relative` per length in `assets/data/results.json` | 1 decimal + `×` |
| five p50 timings per kernel at 64k (repeats) | `assets/data/demo-run.json` `latency_ms.<kernel>.64k` (a byte-identical copy of `source/results/demo-run.json`) | 2 decimals + ` ms` |
| medians and spreads (repeats) | median of those five; spread = `spread_pct` from `results.json` | 1 decimal |

## 3. Style summary (read-only; from `style.json`)

- **Theme / mood:** dark / technical, data-driven, cool, precise, nocturnal.
- **Palette roles:** bg `#0A0E17` bg2 `#0E1422` surface `#131B2B` ink `#E8EEF7` ink2 `#9AA8BF` muted `#6E7C94` accent
  `#2FE4F0` accent2 `#8B7CFF` accent3 `#FFB547` ok `#4ADE80` warn `#FFCC4D` deny `#FF5C7A`. Kernel colours follow the
  docs' results table: spark = accent, block-sparse = accent2, dense = slate `#55657F`; global blocks = accent3.
- **Type:** display and sans Space Grotesk 700/500, mono JetBrains Mono (both embedded from `source/docs/fonts`);
  scale `12 18 24 34 46 64 88 120 166 228`; kickers in mono, tracked 0.18 em, accent.
- **Motion:** pace medium (opens calm, builds to one impact), spring f 2.2 z 0.84, overshoot 0.15, ease outExpo;
  transitions from glitch, match, zoomInto, cut, impact.
- **Carriers native to the material:** vector data viz and a real CLI capture; no characters.
- **Sound:** 128 BPM, B minor, dark-synth, drums light (the drop switches to the full kit), SFX digital.
- **Narration:** recommended, voice Charon, `[confident, clear]`, en-US. Written and timed (dry run); the shipped
  reel is music-led with captions off (`reel.config.json` `"captions": {"enabled": false}`) until a real voice is
  synthesized, because dry-run clips and their timings are placeholders that the render and build tools refuse.

### Reserved regions (scene code keeps these empty)

- HUD `frame` look: a 90-px border (title top left, timecode and beat dots top right, scene index bottom left,
  `DEMO DATA · FICTIONAL PROJECT` bottom right). The zoomed terminal crosses it, so `cli` fades the top 190 px and the
  bottom 150 px toward bg while zoomed.
- Caption band (narrated builds only): y ≈ 880–985 (`layout.captions.y` = 930 px, two lines at 36 px). Text and data
  stay above y = 870; the logo credits sit bottom-left (x = 140) beside the centred caption.

## 4. Files and contract

- Scene `<id>` lives in `scenes/<id>.js`: an IIFE that only assigns `SCENES['<id>'] = { draw(ctx, t, env) }`
  (`cli` also has `portal(t, env)`: the result table is the `zoomInto` window into `results`).
- Pure in `(t, env)`; everything animates from `env.lt` (never `t`, never `env.dur`), so an in-phase is identical in
  every cut; opaque full frame; holds come from `env.phase.hold` and `onBars`; no grain, vignette, HUD, captions or
  transitions in scene code.
- Shared look across scenes without shared code: the same stage (bg, soft accent glow, a 60-px blueprint grid
  drifting 6 px/s), the same kicker (26-px accent rule + tracked mono), the same `DEMO DATA` chip.
- `impact` and `logo` share one camera pose (`HANDOFF`, copied in both files): the computed blocks settle into it over
  the impact's out-phase and the logo starts from it, so the cut between them is seamless.

| Name | Kind | File | Scenes | Status |
|---|---|---|---|---|
| run | cli (real capture) | `assets/captures/term/run.cast` + `.json` + `.screen.txt` | cli | ready |
| results | data | `assets/data/results.json` (`spark-bench run --json`) | results, impact, scaling, repeats | ready |
| demo run | data | `assets/data/demo-run.json` (copy of `source/results/demo-run.json`) | repeats | ready |
| fonts | OFL files | `source/docs/fonts/*.ttf` (style.json `fonts.files`) | all | ready |

## 5. Cuts

Same BPM (128) and the same in-phases in every cut; the 30-s cut adds the optional `problem` scene and 2 bars of
hold to `results`, `impact` and `logo`; the 60-s cut adds the optional `scaling` and `repeats` scenes (excluded from
15 and 30) and raises four caps for itself only (`"60": {"scenes": {"cli": {"maxBars": 5}, "results": {"maxBars": 5},
"impact": {"maxBars": 4}, "logo": {"maxBars": 4}}}`). Allocation from `timing/plan_cut.py` (fill balanced, no pins).

| Scene | min | max | priority | optional | in | music | 15 | 30 | 60 |
|---|---|---|---|---|---|---|---|---|---|
| matrix | 2 | 2 | 1 | no | (opener) | intro | 2 (0–2) | 2 (0–2) | 2 (0–2) |
| problem | 2 | 2 | 2 | yes | match, fade 0.4 s (fallback cut) | groove | – | 2 (2–4) | 2 (2–4) |
| cli | 3 | 3 (5 in 60) | 1 | no | glitch 0.9 | groove | 3 (2–5) | 3 (4–7) | 5 (4–9) |
| results | 1 | 3 (5 in 60) | 1 | no | zoomInto (cli's table; fallback glitch) | breakdown | 1 (5–6) | 3 (7–10) | 5 (9–14) |
| scaling | 2 | 5 | 3 | yes | glitch | groove | – | – | 5 (14–19) |
| repeats | 2 | 5 | 3 | yes | cut | breakdown | – | – | 5 (19–24) |
| impact | 1 | 3 (4 in 60) | 1 | no | impact (zoom 0.08, shake 18, flash 0.4) | drop | 1 (6–7) | 3 (10–13) | 4 (24–28) |
| logo | 1 | 3 (4 in 60) | 2 | no | cut | outro | 1 (7–8) | 3 (13–16) | 4 (28–32) |
| **total** | | | | | | | **8 bars = 15.0 s** | **16 bars = 30.0 s** | **32 bars = 60.0 s** |

## 6. Scenes

Beats count from the scene start (beat 0 = the bar line; 1 beat = 0.469 s). `inBeats`/`outBeats` are fixed in every
cut; only the hold between them grows.

### 6.1 `matrix`: most of it is empty (hook)

- **Bars:** 2..2 (never grows); priority 1; music intro. In 7 beats, out 1 beat.
- **Idea:** a 64k attention matrix is 4,096 blocks; the spark pattern computes 674.
- **Carrier:** gl.js point cloud, one point per block (4,096), plus glowing lines; left text column.

| Beat | Element | Motion | Copy | Cue |
|---|---|---|---|---|
| 0 | dense matrix, top-down | reveal sphere from the top-left corner (1.4 beats), first frame already half visible | – | `pulse` |
| 0.5 | kicker | 26-px rule grows, scramble decode | c1 | – |
| 1 | `4,096` | per-glyph rise + blur-in, 176 px, accent glow | c2 | `tick:6 gap=0.06s soft` |
| 1–3 | query scan line | one row at a time sweeps the dense matrix | – | – |
| 1.5 | `BLOCKS COMPUTED · DENSE` | fade | c3 | – |
| 2.9–5.4 | skipped blocks | sink below the plane, farthest from the band first; the number counts down with them | c2 | `bwoop` + `count dur=1.5 soft` at 3.5 |
| 3–5 | kept blocks | light up from the near corner: band cyan, global amber | – | – |
| 0–7 | camera | top-down (reads as a matrix) → tilted orbit (reads as depth) | – | – |
| 3.4 | matrix outline | hairline stays where the dense blocks were | – | – |
| 4.2 | band | light runs along it, pulses travel away from the camera | – | – |
| 5.1 | `of 4,096` | line reveal | c4 | `blip step=2` at 5 |
| 5.4 / 5.9 | callouts on 3D blocks (`GL.project`) | ring, elbow, scramble label | c6 | – |
| 5.6 | 16.5% ring + sub | ring fills to 16.5%, line reveal | c5 | – |

- **Hold plan:** none (the opener is fixed at 2 bars).
- **Out-phase:** camera pushes in 0.9 units; the text column slides 40 px left and fades.
- **Review focus:** the count and the sinking blocks agree; nothing enters the caption band; frame 0 is not empty.

### 6.2 `problem`: runs differ (30- and 60-s cuts)

- **Bars:** 2..2; priority 2; optional; music groove. In 7, out 1.
- **Idea:** speedups are hard to compare because runs differ in four variables; spark-bench fixes them.
- **Carrier:** vector type; uncontrolled values are glyph noise (no invented numbers).

| Beat | Element | Motion | Copy | Cue |
|---|---|---|---|---|
| −0.4 | kicker | decode (visible during the match crossfade) | c7 | (auto `air`) |
| −0.2…0.55 | four rows | slide in, noise flickers at 18 Hz in deny pink, `≠` blinks | c8 | `glitch dur=1 density=0.4 soft` at 0.25 |
| 1.5 / 2 / 2.5 / 3 | each value field | noise decodes into the fixed value, border flashes accent, lock pops, ring | c9 | `lock` x4 |
| 3.25 | verdict | per-glyph rise, `fixes` in accent | c10 | `confirm` at 3.5 |
| 3.5–7 | locks | pulse on the beat; verification sweeps at 4.25 and 5.75 | – | – |

- **Out-phase:** everything slides 50 px left and fades into the glitch of `cli`.

### 6.3 `cli`: one command, one table (real capture)

- **Bars:** 3..3; priority 1; music groove. In 11, out 1.
- **Idea:** the CLI really runs: one command prints the whole result.
- **Carrier:** `assets/captures/term/run.cast` (real, 68x15, exit 0) through term.js + quad.js; the window takes the
  style's `terminal` colours.

| Beat | Element | Motion | Copy | Cue |
|---|---|---|---|---|
| −0.25 | `RUN` | glyph-noise decode with RGB split (shows through the glitch-in) | c12 | (auto `glitch`) |
| 0.25 | kicker | decode | c11 | – |
| 0.25–2.6 | window | flies in from the right (yaw −1.05 → −0.34), sheen sweep | – | – |
| 0.76 | prompt | real cast plays from scene time 0.354 s | c15 | – |
| 1.29–2.29 | typing `spark-bench run` | 30 cps, deterministic jitter | c15 | `keytap:1 terminal soft` at 1.29 |
| 1.5 | provenance lines | fade | c13, c14 | – |
| 3 | enter | border glow pulse | – | `enter` |
| 3.65–6.85 | output | the recorded rhythm (warm-up, repeats, table, summary) | c15 | `blips:3.2 density=0.55 soft` at 3.65 |
| 6.6–7.6 | left column | steps aside (140 px, fade) | – | – |
| 7–8.5 | camera | zooms to the result table (keeps 42% of the tilt), then creeps 1.4%/s | – | `zoom` at 7.75 |
| 8 | spark row | highlight + scan, spotlight dims the rest, brackets lock | – | `lock big` at 8.25 |
| 9 | summary line | ok-green frame (it carries `DEMO DATA`) | – | – |
| 10 | spark row | second scan pass | – | – |

- **Out-phase:** the next scene zooms into this scene's result table (`portal()`), so the out-phase holds still.
- **Grows in longer cuts (60 s: 2 bars of hold):** the camera tours the run's own provenance lines, one per bar line
  (the `fingerprint` line, then `repeats 60/60`), and is back on the result table before the out-phase.
- **Review focus:** playback speed is the same in every cut (no `fitEnv`); the HUD corners stay readable while zoomed.

### 6.4 `results`: the gain grows with length

- **Bars:** 1..3; priority 1; music breakdown (build into the drop). In 3, out 1.
- **Idea:** throughput relative to dense, all kernels, all lengths.
- **Carrier:** grouped bar chart from `assets/data/results.json`.

| Beat | Element | Motion | Copy | Cue |
|---|---|---|---|---|
| < 0 | establishing image | chart frame and dashed ghost bars at their final heights (seen through the zoom window) | c16, c17 | (auto `zoom`) |
| 0–2.3 | 12 bars | grow left to right, 1/8-beat stagger, outExpo; spark bars glow | – | `drawon dur=2` |
| 2–2.75 | spark values | pop with a count-up, one per quarter beat | – | `pop:4 gap=0.25b soft` at 2 |
| 2.4 | block-sparse values | fade | – | – |

- **Hold plan (30-s cut):** constant push-in toward the 64k group (1.2%/s); bar 1: the spark trend line draws through
  the bar tops with a glowing head and its annotation (c18); bar 2: the 64k group takes focus, the others dim, p50
  pills appear (c19). `pulse` on each hold bar line.
- **Grows in longer cuts (60 s: 4 hold bars):** bar 3 opens the focus again and spark's lead over block-sparse pops
  per length on the beat (`+X×` brackets between the two bars); the 64k group takes focus again for the last bar.
- **Out-phase:** everything but the 64k spark bar dims; its glow grows into the drop.

### 6.5 `impact`: 4.1× (the drop)

- **Bars:** 1..3; priority 1; music drop. In 3, out 1.
- **Idea:** at 64k tokens, spark reaches 4.1x the dense throughput (demo run).

| Beat | Element | Motion | Copy | Cue |
|---|---|---|---|---|
| 0 | `4.1×` | slams 1.55 → 1 in 0.26 s with the compositor's impact (zoom punch, shake, flash, chroma); 46 block shards and two shockwave rings burst out | c20 | `impact:big` |
| 0.25 | kicker | decode | c21 | – |
| 0.6 / 1 | sub + `DEMO DATA` chip | line reveal, fade | c22 | – |
| 1–1.7 | latency panel | slides in | c23 | – |
| 1.25–3 | spark latency | counts down 47.6 → 11.6 ms, its bar shrinks to 24% | c23 | `count dur=1.75` at 1.25 |
| always | computed blocks (674) | drift behind everything at low alpha | – | – |

- **Hold plan (30-s cut):** bar 1: the number moves into a header and the three kernels line up as a leaderboard
  (`slam`, once); bar 2: from its bar line each row shows its run-to-run spread, one per quarter beat with `pop:3`,
  and a scan passes over the winner across most of the bar.
- **Grows in longer cuts:** the scan over the winner's row (2.9 beats from the bar line) repeats on every later hold
  bar line.
- **Out-phase:** text fades; the blocks settle into the `HANDOFF` pose the logo starts from.

### 6.6 `logo`: spark-bench

- **Bars:** 1..3; priority 2; music outro (the arranger's final hit lands on beat 0). In 4, out 0.
- **Idea:** the computed blocks become the brand.
- **Carrier:** gl.js morph: 674 blocks x 36 points → the docs' 3x3 block mark + `spark-bench` (Space Grotesk 700).

| Beat | Element | Motion | Copy | Cue |
|---|---|---|---|---|
| 0 | blocks at `HANDOFF` | swirl (0.42) with per-point stagger; camera to frontal; colours cross-fade from source (band cyan, global amber) to target (mark cyan, word white-cyan) | – | `sparkle dur=2 soft` at 0.25 |
| 2.2 | tagline | line reveal | c26 | – |
| 2.5 | wordmark lands | sheen sweep | c25 | `chime` at 2.5 |
| 2.8 | disclaimer | decode | c27 | – |

- **Hold plan (30-s cut):** bar 1: `$ pip install -e .` and `$ spark-bench run` type in a code block (`keytap` x2);
  bar 2: credits decode bottom left (c29); a sheen crosses the wordmark on every bar line.
- **Short cut (1 bar):** a compact schedule: the copy lands by beat 2 and stays readable.
- **End frame:** on the last downbeat the particles cross-fade into the vector mark and wordmark (projected through the
  same camera), so the final frame is crisp type.
- **Grows in longer cuts:** install line, credits.

### 6.7 `scaling`: why the gain grows (60-s cut only, after `results`)

- **Bars:** 2..5; priority 3; optional; music groove. **In:** `glitch`. In 6, out 1.
- **Idea:** the same pattern computes a shrinking share as the sequence grows, so the gain grows with length.
- **Carrier:** four block matrices (4k, 16k, 32k, 64k) computed from the README's pattern; spark's gains from
  `results.json`.

| Beat | Element | Motion | Copy | Cue |
|---|---|---|---|---|
| −0.4 | kicker + chip | decode | c31 | (auto `glitch`) |
| 0.5 + 0.5k | four panels | rise in left to right, every block dense | c32 | `drawon dur=2` at 0 |
| 2.4–4 | pattern | skipped blocks go dark, kept blocks light (band cyan, global amber); the shares count down | c32 | `count dur=1.5 soft` at 2.5 |
| 4 + 0.25k | gains | pop under each panel | c33 | `pop:4 gap=0.25b soft` at 4 |
| 5.25 | verdict | per-glyph rise | c34 | |

- **Hold:** a focus walks the lengths, one per bar line (the panel lifts; `pulse` every 4 beats); inside it a query
  band reads the matrix row by row across the bar while its kept blocks pulse on the beat; a rule grows under the
  four gains, dim at 4k and bright at 64k, and a pulse runs along it on every later bar line.
- **Out-phase:** everything slides 50 px left and fades.

### 6.8 `repeats`: five seeded repeats (60-s cut only, before `impact`)

- **Bars:** 2..5; priority 3; optional; music breakdown. **In:** `cut`. In 6, out 1.
- **Idea:** every number is the median of five seeded repeats, and the repeats agree to within 2 %.
- **Carrier:** three lanes (spark, block-sparse, dense), each scaled to its own median (±2.5 %), from the demo run.

| Beat | Element | Motion | Copy | Cue |
|---|---|---|---|---|
| −0.4 | kicker + chip | decode | c35 | `lock` at 0 |
| 0.2 + 0.2k | lanes | slide in with labels and p50 | c36 | |
| 1 + 0.5r | repeats | the five timings drop in per lane, a hair apart | | `tick:5 gap=0.5b` at 1 |
| 1.2 | axis | fades in over the lanes | c36 | |
| 3.75 | median | the median line locks in every lane | | `lock` |
| 4.25 | spread brackets | min-to-max bracket grows, the CLI's spread value fades in | c36 | `confirm` |
| 5 | verdict | per-glyph rise | c38 | |

- **Hold:** one lane takes focus per bar line (the others dim; `blip` every 4 beats), its dots pulse in order and
  its five raw timings type under it (c37); on every beat one of its repeats runs again, lifts and lands on the same
  value (same seed, same number).
- **Out-phase:** everything slides 50 px left and fades.

## 7. Audio

- dark-synth, B minor, 128 BPM; drums light in the grooves, full kit in the drop (energy 1.0).
- Sections follow the scenes: intro (matrix), groove (problem, cli), breakdown (results: drums stop, build bar with a
  riser into the drop), drop (impact: crash + sub on the downbeat), outro (logo: final hit, then a quiet tonic bed).
- Transition sounds: automatic for `glitch` (cli), `zoomInto` (results) and `match` (problem); the impact's own
  `impact:big` replaces the automatic one.
- Every cue in `reel.config.json` sits on a visual event; the cli cues follow the cast's real timing (typing starts on
  beat 1.29, enter on beat 3.0).

## 8. Narration (recommended; `narration.json`)

Written and timed with dry-run clips; not yet voiced. The shipped reel is music-led (captions off); turning it on
means a real `tts_gemini.py batch`, `vo_timeline.py`, a re-plan, captions on, `arrange.py --stem` and `mix_vo.py`
(`README.md`, "Narration on or off").

| Scene | Line (verbatim) | Words | Cuts | Fits in |
|---|---|---|---|---|
| matrix | Most of a long attention matrix is empty. | 8 | all | 2 bars (needs 3.3 s) |
| problem | Kernels skip it. Their speedups are hard to compare. | 9 | all (the scene plays in 30 and 60) | 2 bars (needs 3.6 s) |
| cli | spark-bench pins the machine, clocks and seed, then runs every kernel five times. | 14 | all | 3 bars (needs 4.7 s) |
| results | In the demo run, the gain grows with sequence length. | 10 | 30, 60 | 3 bars |
| scaling | The longer the sequence, the less of it is computed, and the bigger the gain. | 15 | 60 | 5 bars |
| repeats | Every number is the median of five seeded repeats. | 9 | 60 | 5 bars |
| impact | At 64k tokens, spark reaches 4.1× the dense throughput. | 9 | 30, 60 | 3 bars |
| logo | One command. Numbers you can compare. | 6 | 30, 60 | 3 bars |

The screen carries the numbers and keywords; the voice carries the sentence around them (the voice never reads a
headline that is on screen at the same time). Lexicon: `spark-bench` → "spark bench", `64k` → "sixty-four K",
`4.1×` → "four point one times".

## 9. Steal sheet (case studies: grammar, not assets)

- FDDD research reel: kicker in mono over one huge number, a data panel on the right, HUD frame chrome → matrix,
  impact.
- FDDD: impact number → leaderboard rows with tags and glowing bars → impact hold.
- FDDD: logo assembled from the reel's own data points → logo (the computed blocks).
- CC-statusline: one giant word per command, a real terminal tilted in 3D, zoom to the key line → cli.

## 10. Open questions

- Real narration: run `tts_gemini.py batch` without `--dry-run`, listen, `audit`, then re-plan and turn captions on;
  dry-run timings are placeholders and never ship.
- A vertical 1080x1920 cut would need its own layouts (the scenes are composed for 16:9; `../../references/storyboard.md`
  "Aspect variants").
