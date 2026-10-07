# Timing and length

Every reel runs on one bar grid. The tempo is fixed for the project; a cut is a whole number of bars; every scene
starts and ends on a bar line; scenes are elastic (fixed in-phase, stretchable hold, fixed out-phase). A longer cut
adds bars (holds, extra beats on bar lines, optional scenes) and never plays animation slower. `timing/plan_cut.py`
turns `P/reel.config.json` into `P/build/cut-<cut>.json`, the single timeline that the runtime, the music, the SFX,
the narration mix and the captions all read.

```bash
python3 <skill>/timing/plan_cut.py --project P --cut 30            # target from reel.config.json "cuts"
python3 <skill>/timing/plan_cut.py --project P --cut all -v        # every cut, with the allocation trace
python3 <skill>/timing/plan_cut.py --project P --cut 60 --seconds 60   # or --bars 32; any cut name
```

## 1. The bar grid

```
bpm     = reel.config.bpm ?? style.sound.bpm      # one tempo for every cut of the project
beatSec = 60 / bpm
barSec  = beatsPerBar * beatSec                    # 4/4 unless reel.config.beatsPerBar says otherwise
seconds = bars * barSec                            # a {"seconds": s} cut is rounded to whole bars
```

| BPM | beat (s) | bar (s) | frames/bar @60 | bars in 15 s | 30 s | 60 s |
|---|---|---|---|---|---|---|
| 96 | 0.625 | 2.500 | 150 | 6 | 12 | 24 |
| 100 | 0.600 | 2.400 | 144 | 6.25 | 12.5 | 25 |
| 112 | 0.536 | 2.143 | 128.6 | 7 | 14 | 28 |
| 120 | 0.500 | 2.000 | 120 | 7.5 | 15 | 30 |
| 128 | 0.469 | 1.875 | 112.5 | 8 | 16 | 32 |
| 140 | 0.429 | 1.714 | 102.9 | 8.75 | 17.5 | 35 |
| 144 | 0.417 | 1.667 | 100 | 9 | 18 | 36 |

- **The tone pass owns the BPM** (`style.sound.bpm`, from the material's pace). Timing never picks a tempo for
  convenience. When an exact length matters, nudge within the mood: 15 s is whole bars at multiples of 16 BPM
  (96, 112, 128, 144), 30 s at multiples of 8, 60 s at multiples of 4. The planner prints the nearest such tempos
  when a `seconds` target is not whole.
- **Rounding.** `seconds` -> nearest whole bar, an exact half rounds *down* (120 BPM, 15 s -> 7 bars = 14 s), so a
  "15-second" cut never exceeds 15 s by accident. `--round up|down` or `"round"` in the cut overrides.
- **Frames.** At 60 fps a bar is frame-exact when 14400 / bpm is an integer (96, 100, 120, 144 ...). At 128 BPM a bar
  is 112.5 frames: every other boundary falls between two frames (the cut shows on the next frame, at most 8.3 ms
  late; inaudible). `frames` in the plan is `ceil(duration * fps)`.

## 2. Timing fields in reel.config.json

Per scene (`scenes[]`, in story order):

| Key | Default | Meaning |
|---|---|---|
| `id` | required | `[A-Za-z0-9][A-Za-z0-9_-]*`; names `P/scenes/<id>.js` |
| `minBars` | 1 | shortest length at which the scene still says its idea (render it there) |
| `maxBars` | 2 x `minBars` | where the hold stops feeling alive (render it there too) |
| `priority` | 2 | 1 = most important: kept and grown first (section 3) |
| `optional` | false | enters a cut only when there is room (section 3) |
| `inBeats` / `outBeats` | `min(beatsPerBar, minBars*beatsPerBar - out)` / 1 | fixed in-phase from the start / out-phase before the end; may be fractional |
| `in` | `cut` | transition into this scene: `cut blobWipe zoomInto whip glitch flash strobe match impact portalFlash` (+ runtime extras `dissolve push`) |
| `inParams` | `{}` | passed to the compositor (`preBeats`, `postBeats`, per-type keys) |
| `inFallback` | none | extension: transition used when a predecessor-specific `in` (`zoomInto`, `match`, `portalFlash`) loses its authored predecessor in a cut |
| `dark` | false | dark-mode scene (post, HUD, captions adapt) |
| `music` | inherited | music part: `intro groove breakdown drop outro` (section 8) |
| `cues` | `[]` | SFX in beats from a scene anchor (section 5) |
| anything else | | passed through to the plan's scene record (e.g. `label`, `hud`) |

Top level: `bpm` (override), `beatsPerBar` (4), `fps` (60), `fill` (`balanced` | `holdsFirst`), `hud`
(`{steps, map}`; the plan adds bar/time segments), `captions` (`{enabled}`), and `cuts`:

```json
"cuts": {
  "15": {"seconds": 15, "narration": false, "exclude": ["problem"],
         "scenes": {"demo": {"bars": 2, "inBeats": 3}}},
  "30": {"seconds": 30},
  "60": {"seconds": 60, "include": ["bench"]}
}
```

Cut keys: `bars` | `seconds`, `round`, `fill`, `include` (force optional scenes in), `exclude`, `only` (QA),
`narration: false` (no narration minimums or captions in this cut), `scenes: {id: {bars | minBars | maxBars |
priority | optional | inBeats | outBeats}}` (`bars` pins a length). Per-cut overrides are the editor's hand: use
them when the automatic plan is close but not right, and always for the 15-s edit.

## 3. The planner

1. Tempo from config/style; target bars from the cut (or `--bars` / `--seconds`; a numeric cut name is seconds).
2. Effective minimum per scene = max(`minBars`, bars needed for `inBeats + outBeats`, narration minimum).
3. Required (non-optional, non-excluded) scenes take their minimums. If they exceed the target: exit 2 with the
   numbers and the lowest-priority candidates to cut; `--grow` extends the cut to the minimum instead.
4. Spare bars are spent one decision at a time on the most valuable option (`fill: balanced`, default):

   | Option | Value | Ties |
   |---|---|---|
   | +1 bar of hold for scene s (below its `maxBars`) | 1 / (priority x (extra bars already + 1)) | lower priority number, fewer extra bars, story order |
   | add optional scene s (its minimum must fit the bars left) | 1 / priority | beats a hold of equal value |

   So with few spare bars the priority-1 scenes breathe first; with many, optional scenes enter roughly in priority
   order while holds keep growing in proportion (a priority-1 scene grows about twice as much as a priority-2 one).
   `fill: holdsFirst` adds optional scenes only after every hold reached `maxBars`.
5. If every scene is at `maxBars` and no optional scene fits, the rest *overflows* (warning, `OVER` in the table): it
   goes where designed hold capacity is largest (smallest bars/maxBars), never to the opening scene, pinned or
   fixed-length scenes unless nothing else can take it. Fix the config instead: more optional scenes or higher
   `maxBars` where a hold can carry more. `--strict` makes overflow exit 2 and any warning exit 3.
6. Bar ranges in story order; the opener's `in` becomes `cut`; a predecessor-specific `in` whose authored predecessor
   is missing uses `inFallback` (or warns). A note flags a transition window that reaches past the outgoing
   out-phase or the incoming in-phase.
7. Music sections, cues, captions, HUD segments; invariants (contiguous, on bar lines, cues and captions inside the
   reel) are asserted before writing (exit 4 = planner bug).

Read the printed table every time: `grow` shows `+n`, `max` or `OVER`; `vo` the narration minimum; the `bars` ruler
shows the edit at a glance; `note`/`WARN` lines explain every drop, fallback and overflow. `-v` prints the
allocation steps. Same inputs give byte-identical JSON (re-run and `git diff` to prove it).

**`P/build/cut-<cut>.json`** (derived; never hand-edit; `narration/captions.py` rewrites `captions`):

| Key | Content |
|---|---|
| `cut bpm beatsPerBar beatSec barSec bars duration` | the grid; `duration = bars * barSec` |
| `scenes[]` | `id fromBar toBar t0 t1 in inParams inBeats outBeats dark music` + `index bars dur inSec outSec holdSec holdStart outStart prev priority optional minBars maxBars` (+ `voBars`, `inAuthored`, passthrough keys) |
| `music[]` | `fromBar toBar part` + `bars t0 t1 occurrence scenes` |
| `cues[]` | `t sfx scene` + `from offset atBeat rep` + passthrough keys, sorted by `t` |
| `captions[]` | `t0 t1 text scene` (first-pass burn-in cues) |
| extras | `fps frames target bpmSource fill overflowBars vo hud excluded warnings notes planner` |
| `vo` | `used minBars timeline lines estimatedLines captions captionsEnabled` + `filteredOut` (lines per scene left out by their `cuts`), `placeholderCaptions` (captions timed from dry-run/estimated clips), `scriptDrift` (narration.json changed after `vo_timeline.py`) |

Other flags: `--vo FILE` / `--no-vo`, `--only id,id` and `--pin id=bars` (QA plans), `--times
boundaries|holds|cues|all` (frame times for stills), `--json`, `--out`, `--no-write`, `-q`.

## 4. Elastic scenes: in, hold, out

```
|<-- inBeats (fixed) -->|<------------ hold (stretches with the cut) ------------>|<- outBeats (fixed) ->|
t0                  holdStart                                               outStart                    t1
```

- **In-phase**: every entrance, timed in seconds or beats from the scene start, landing on beats. Identical in
  every cut.
- **Hold**: the idea is on screen and alive. Idle motion on everything (drift, breathing, blink, particles, sheen);
  secondary beats on the scene's bar lines (a callout, a highlight step, a counter tick, a scroll step, the next log
  line). Nothing is static for more than 0.5 s. In the shortest cut the hold may be zero: nothing essential may live
  only in the hold.
- **Out-phase**: exits, timed back from the end; the outgoing half of the transition borrows it.
- **Animations always run at 1x.** Anything with a visible speed (draw-on, typing, counters, camera moves, route
  riders) uses fixed seconds or beats. Never `lt / dur`: it plays slower in a longer cut. `env.phase.holdP` (hold
  progress 0..1) is only for ambient values nobody reads as speed (a backdrop hue, a slow vignette breath).

The runtime gives each scene `env = {lt, dur, beatSec, barSec, inSec, outSec, phase, cues, ...}` (`engine-api.md`):
`phase = {in, hold, holdDur, holdP, out, holdStart, holdEnd}`; `env.cues` = this scene's planned cues with `lt`.

```js
(() => {
  SCENES['demo'] = {
    draw(ctx, t, env) {
      const { lt, dur, beatSec, barSec, phase } = env, P = env.palette;
      ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
      // In-phase: absolute seconds/beats from the scene start.
      const card = spring(lt - beatSec + 0.18, 2.2, 0.5);          // lands on beat 1 (motion-recipes.md 2)
      const title = Ease.outC(rm(lt, beatSec, beatSec + 0.55));
      // Hold: idle life is a function of time, never of dur.
      const bob = Math.sin(TAU * lt * 0.5) * 6, drift = lt * 12;   // px and px/s: same pace in every cut
      // Secondary beats on the hold's bar lines (drawCallout / drawStamp are this scene's own helpers);
      // the matching SFX cue is {"from": "holdBar", "every": 4}.
      onBars(env, 1, (i, dt) => drawCallout(ctx, i, Ease.outBack(clamp(dt / 0.35))));
      const ticks = onBeats(env, 1);                               // counter = beats elapsed in the hold
      // Hits that must match a sound: read the planned cues, so picture and sound share one time.
      for (const q of env.cues) if (String(q.sfx).startsWith('stamp') && lt >= q.lt) drawStamp(ctx, lt - q.lt);
      // Out-phase: anchored to the end.
      const exit = Ease.inC(phase.out);                            // 0..1 over outSec
      const sinceOut = lt - (dur - env.outSec);                    // seconds into the out-phase (< 0 before)
    },
  };
})();
```

- **Short cuts.** When a cut gives a scene fewer bars than its comfortable length, compress the *choreography*,
  not the speed: `const short = dur < 1.5 * barSec;` then start fewer elements, earlier (the 15-s FDDD cut used
  one-bar variants of two-bar scenes). Per-cut `inBeats` can shorten the in-phase.
- **Where the hold leads.** A hold that has somewhere to go keeps attention: step through items on bar lines, let
  the last step land a bar before `outStart`, then idle. Design the hold for `maxBars`; check it at `minBars`.
- Drawing recipes, beat-landing idioms and holds by recipe: `motion-recipes.md` (sections 1, 2 and the "Holds by"
  column).

## 5. Cues

A cue is `{"beat": b, "from": anchor, "sfx": spec}` in a scene's `cues`; the plan resolves it to seconds.

| `from` | Scene-local anchor | Single cue exists when |
|---|---|---|
| `start` (default) | 0 | it lands no later than the scene end (negative beats = pre-roll into the previous scene) |
| `holdStart` | `inSec` | `beat` is 0, or the hold is longer than `beat` |
| `holdBar` | first scene bar line at/after `inSec` | that bar line is inside the hold |
| `holdBeat` | first beat line at/after `inSec` | that beat line is inside the hold |
| `outStart` (`holdEnd`) | `dur - outSec` | it lands no earlier than the scene start |
| `end` | `dur` (the next scene's first bar line) | as `outStart` |

A cue outside the reel `[0, duration)` is dropped with a warning; a dropped hold cue is a note (expected in short
cuts). **Repeats.** `"every": N` (beats), optional `"count"` and `"until"` (anchor; default `outStart` for the hold
anchors, else `end`): grid lines `anchor + k*N beats` strictly before `until`, each cue at its grid line + `beat`.
`{"from": "holdBar", "every": 4*n}` is exactly the runtime's `onBars(env, n)` and `{"from": "holdBeat", "every": n}`
is `onBeats(env, n)` (`beat` = their `offsetBeats`), checked frame-exact. A longer cut therefore gets more hits:
in the worked example below, `keytap` on the demo hold fires 1, 3 and 6 times in the 15, 30 and 60-s cuts.

**The SFX spec** is the audio grammar, verbatim (`audio.md`, `python3 <skill>/audio/synth.py list`): bare numbers
are beats (`"riser:2"`, `"keytap:1.5"`), layers join with `+`. The cue time lands on the SFX's own anchor: a riser
or swell *ends* on it, a whoosh/whip/zoom *peaks* on it, impacts and pops start on it. So cue a riser at the drop it
leads into, a whoosh at the cut. The planner warns about specs that `synth.py` cannot parse. Other cue keys
(`gain`, `pan`, ...) pass through untouched.

| Transition `in` | Typical cue on the incoming scene |
|---|---|
| `whip`, `push` | `{"beat": 0, "sfx": "whip:0.5"}` / `"swish"` |
| `zoomInto` | `{"beat": 0, "sfx": "zoom:1"}` |
| `glitch`, `strobe` | `"glitch"` / `"strobe"` at beat 0 |
| `flash`, `portalFlash` | `"shimmer"` at 0; a `"riser:2"` at 0 when it is a drop |
| `impact` | `"impact"` or `"boom"` at 0 |
| `blobWipe`, `match`, `dissolve` | `"swish"` / `"air"` at 0 (or nothing: let the music carry it) |

## 6. 15, 30 and 60 s at the same BPM and pace

- Same BPM, same groove, same in/out choreography in every cut; only bars change.
- A longer cut tells *more*: optional scenes (a second example, a deeper zoom, a data detail, a "how it works"
  beat) before ever-longer holds. Without optional scenes a 60-s cut is all holds; write them during storyboarding.
- The opener never grows (`maxBars = minBars`): attention is won in the first bar. Logo/end cards may grow a little.
- The 15-s cut is its own edit, not a trim: exclude scenes, pin lengths, compress in-phases per cut.
- A per-cut `maxBars` sets a hold's cap for one cut only: `"60": {"scenes": {"cli": {"maxBars": 5}}}` lets a terminal
  tour run 5 bars in the 60-s cut while the 30-s cut keeps the scene's own cap. Raise caps where a hold has more to
  show; keep the end card short and spend the rest on optional scenes.

**The bundled examples** (`examples/*/reel.config.json`, planner output):

| Example | BPM | Cuts (bars) | What the longest cut adds |
|---|---|---|---|
| research-cli | 128 | 15 (8), 30 (16), 60 (32) | `scaling` and `repeats` (optional, p3; excluded from 15 and 30); per-cut caps let `cli` and `results` tour for 5 bars and `impact`/`logo` hold 4 |
| playful-app | 120 | short (7 = 14 s), 30 (15), 60 (30) | `nudge` and `private` (optional; excluded from short and 30), `app` 6 and `flavors` 5 bars, `brand` 3, `finale` 4 |

**Extending a reel to a longer cut** (the order that avoids silent scenes and a long quiet tail):
1. Add the cut to `reel.config.json` `cuts` (`{"seconds": 60}`), with per-cut `maxBars` where a hold would run long.
2. Storyboard and write the optional scenes it needs (`optional: true`, a `priority`, `minBars`/`maxBars`) and
   exclude them from the shorter cuts if they must never appear there.
3. Narration: add the new cut to the `cuts` of every line that should play in it, write lines for the new scenes,
   re-run `narration/vo_timeline.py` (then TTS and `mix_vo.py`). The planner warns when a scene plays in a longer cut
   without its lines, and when `narration.json` changed after `vo_timeline.py` ran (section 7).
4. `plan_cut.py --cut 60 --strict`, then `audio/arrange.py --cut 60` (the outro cap, section 8), stills of every new
   hold at its first and last bar, `motion_qa.py` on the render.

**Worked example** (CLI-tool launch, 128 BPM, bar 1.875 s; numbers are the planner's own output):

| Scene | p | min..max | 15 s | 30 s | 60 s |
|---|---|---|---|---|---|
| `hook` | 1 | 1..1 | 1 (0-1) | 1 (0-1) | 1 (0-1) |
| `name` | 1 | 1..2 | 1 (1-2) | 2 (1-3) | 2 (1-3) |
| `problem` | 2 | 1..3 | 1 (2-3) | 1 (3-4) | 3 (3-6) |
| `demo` | 1 | 2..7 | 2 (3-5) | 4 (4-8) | 7 (6-13) |
| `detail` (optional) | 2 | 2..3 | - | 2 (8-10) | 3 (13-16) |
| `proof` | 1 | 1..3 | 1 (5-6) | 3 (10-13) | 3 (16-19) |
| `bench` (optional) | 3 | 2..4 | - | - | 4 (19-23) |
| `how` (optional) | 3 | 2..4 | - | - | 4 (23-27) |
| `payoff` | 1 | 1..2 | 1 (6-7) | 2 (13-15) | 2 (27-29) |
| `logo` | 2 | 1..3 | 1 (7-8) | 1 (15-16) | 3 (29-32) |
| **total** | | | **8 bars = 15 s** | **16 bars = 30 s** | **32 bars = 60 s** |

30-s allocation (`-v`): the 8 spare bars go `name, demo, proof, payoff` (+1 each, value 1/1), then the optional
`detail` enters (value 1/2, ties beat holds), then `demo` and `proof` again (1/2). At 60 s `bench` and `how` enter at
value 1/3 and the holds fill to `maxBars`. What grows with length, scene by scene:

| | 15 s | 30 s | 60 s |
|---|---|---|---|
| demo hold | 1.41 s, 1 `keytap` | 5.16 s, 3 | 10.78 s, 6 |
| proof hold (`count` every 2 beats from `holdBeat`) | 0 s, none | 3.75 s, 4 | 3.75 s, 4 |
| logo `sparkle` at `holdStart`+2 | dropped (hold 1 beat) | dropped | 4.22 s hold, fires |
| music | intro 1, drop 1, groove 3, breakdown 1, drop 1, outro 1 | intro 1, drop 2, groove 7, breakdown 3, drop 2, outro 1 | + a second groove (`how`) after the breakdown, outro 3 |

## 7. Narration quantization

Order: `narration.json` -> `narration/vo_timeline.py --project P [--estimate]` -> `plan_cut.py` -> `narration/
captions.py --project P --cut N` -> `audio/arrange.py` -> `narration/mix_vo.py` -> render (`narration.md`).

- A scene needs `lead + speech + gaps + tail` seconds; `vo_timeline.py` writes `ceil(need / barSec)` to
  `build/vo-minbars.json` (and `vo-minbars-<cut>.json` when lines are filtered per cut). The planner uses
  `vo-minbars-<cut>.json`, else `vo-minbars.json` (also when `--vo .../vo-minbars.json` is passed; `--no-vo` or
  `"narration": false` to ignore) and raises each scene's minimum: narration never changes the BPM or slows a frame;
  the extra time is hold.
- Line positions are scene-relative, so the voice keeps its place inside a scene in every cut; `mix_vo.py` places
  clips from the same timeline. Lines of scenes left out of a cut leave with them (check the story still reads).
- Captions in the plan are first-pass burn-in cues, present only when captions are enabled. The planner builds them
  with `narration/captions.py` itself when it can import it, else with the same rules (appear 0.3 s before the
  speech, hold up to 1.6 s but never past the next cue or the scene end, change on scene cuts). Still run
  `captions.py` after every `plan_cut.py`: it writes SRT/VTT and owns the final cues.
- Plan with estimates first (`--estimate`), then re-run `vo_timeline.py` and the planner once real clips exist: real
  durations differ. A changed BPM makes narration timing stale: the planner recomputes from `vo-timeline.json` and
  warns; re-run `vo_timeline.py`.
- Per-cut lines (`"cuts": ["30", "60"]` on a line). A shorter cut that drops lines written for longer ones is a
  normal edit (a note). A scene that plays in a cut LONGER than every cut its lines are tagged for is a WARN (the
  classic trap: lines tagged `["30"]` fall silent in a new 60-s cut, and the scene holds longer, in silence). The
  plan records the dropped lines per scene in `vo.filteredOut`.
- Script drift. When `narration.json` no longer matches `build/vo-timeline.json` (lines added, removed, re-worded or
  re-tagged since `vo_timeline.py` ran), the planner warns and records `vo.scriptDrift`; minimums, captions and the
  per-cut filter are from the old script until `vo_timeline.py` runs again.
- Captions timed from placeholder clips (dry-run or `--estimate`) set `vo.placeholderCaptions` and a WARN; the render
  and build tools refuse such a cut unless `--allow-placeholder` (`render-pipeline.md`).

The worked example with narration minimums (`name problem proof payoff logo` need 2 bars, `demo` 3) at 30 s:
`hook 1 | name 2 | problem 2 | demo 4 | proof 3 | payoff 2 | logo 2` = 16 bars. The narration took the spare bars, so
the optional `detail` no longer fits. The same narration cannot fit 15 s (needs 14 bars): the planner exits 2 and
names candidates; give the 15-s cut `"narration": false` (music-led, burned-in type) or a per-cut script.

## 8. Music sections

- Each scene names its part; consecutive scenes with the same part merge into one section:
  `music: [{fromBar, toBar, part, bars, t0, t1, occurrence, scenes}]`. `occurrence` counts repeats of a part (the
  second `drop` is usually the brightest).
- Typical mapping: hook = `intro`, brand reveal = `drop`, product and proof = `groove`, tension/dark climax =
  `breakdown`, payoff = `drop`, logo = `outro`. A scene without `music` inherits the previous part; if no scene sets
  one, the planner assigns intro / drop / groove / breakdown (dark scenes) / drop (after dark) / outro and says so.
- `audio/arrange.py --project P --cut N` builds the song from these sections at the same BPM: a longer cut is more
  bars per section, the same groove; drums stop on a breakdown's first bar line, a drop lands on its bar line.
  Risers into drops and hits on cuts are cues (section 5), so they move with the plan.
- Section changes sit on scene boundaries, i.e. bar lines. The reel ends on a bar line; a final chord rings out
  inside the last bar(s) of `outro` (no fade to silence before the end).
- Outro cap. A long end-card hold would make a long, quiet outro: when the final `outro` section is longer than
  `audio.outroMaxBars` (default 3), `arrange.py` keeps a 2-bar ring-out and lets the previous section carry the rest
  (a note in the run and in `music-<cut>.json` `notes`). Raise the cap for a deliberately long, ambient ending.

## 9. Comprehension slow-down variants

Only when a viewer must *read* something the 1x pace cannot carry: a dense UI or terminal walkthrough for a
non-expert audience, a kiosk or lecture screen, accessibility, or a client who says "too fast to follow". Never to
make a longer cut (add bars), never as the default, always labelled as a variant.

- `render.mjs` / `build.mjs` / `stills.mjs` take `--scale X` (uniform: output = scene x X) or `--warp "o:s,..."`
  (piecewise knots, output:scene). The cut plan stays the scene timeline; the variant maps output time to it.
- Keep the hook and the end card at 1x; slow only the dense middle: e.g. `--warp "0:0,7.5:7.5,37.5:22.5,45:30"`
  (128 BPM, bars 4-12 at half speed).
- Put knees on bar lines of both timelines and prefer slope 2 (each scene bar becomes two output bars) so the grid
  stays whole.
- Music is re-arranged on the output timeline at the same BPM (more bars), never time-stretched. A uniform scale may
  instead re-synthesize at `bpm / X`. SFX follow the mapped cue times.
- Narration is never stretched: `vo_timeline.py`, `captions.py` and `mix_vo.py` take the same `--scale`/`--warp`
  and move line starts only.

## 10. QA

- **Plan**: no `WARN` left unexplained; `OVER`, overflow, narration overruns, unknown SFX and a missing `inFallback`
  are fixed in the config, not accepted. `--strict` in CI.
- **Boundaries**: `node <skill>/runtime/stills.mjs --project P --cut 30 --transitions --out DIR --sheet`, or the
  planner's frame times: `stills.mjs --project P --cut 30 $(python3 <skill>/timing/plan_cut.py --project P --cut 30
  --times boundaries -q) --out DIR`. Inspect full-resolution frames, not only the sheet.
- **Holds**: `--times holds` (hold start, middle, last frame before the out-phase): nothing frozen, the last
  secondary beat lands before `outStart`.
- **Elasticity**: render each scene alone at both ends, `stills.mjs --project P --cut 30 --scene demo --dur
  <minBars*barSec>` and `--dur <maxBars*barSec>` with a `--range`; or plan a QA cut `--cut qa-demo --only demo
  --bars 7`.
- **Cue sync**: `python3 <skill>/audio/verify_sync.py --wav P/build/mix-30.wav --cut P/build/cut-30.json` (every cue
  within one frame); visual hits drawn from `env.cues` cannot drift.
- **Narration**: `vo_timeline.py --project P --cut 30` placement warnings (overlaps, overruns, rate) and the caption
  reading speed from `captions.py`.
- **Render**: `ffprobe` frame count = plan `frames`, duration = `bars * barSec`; audio length matches; the HTML
  player shows every cut at the same BPM.
- **Determinism**: re-plan every cut; `git diff P/build/cut-*.json` is empty.
