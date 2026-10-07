# Multi-agent production

A 30-s reel is 6-10 scenes of 300-900 lines of drawing code each, plus music, SFX, optional narration, and a render
pipeline. One context cannot hold that at quality. A team of agents with hard contracts can: the K-BeautyGate reel
went from harness to first full render in about 25 minutes with 24 agents and zero failed agents. The pattern:

```
harness (you) -> tone pass -> storyboard (+ narration timing) ->
pipeline(scenes + audio): build -> independent review -> fix      (draft MP4 as soon as all first builds land)
-> integrator: merge requests, re-plan cuts, final audio, boundary stills, renders, HTML, numeric checks
-> whole-reel review -> fix -> ship
```

`templates/showreel-workflow.js` implements this as a ready-to-run Claude Code Workflow script.

## 1. Harness first

Before any fan-out, the integrator (the main agent) makes the reel render end to end:

1. `P/style.json` from the tone pass, rationale complete (`tone-and-manner.md`).
2. `P/STORYBOARD.md` and `P/reel.config.json` (`storyboard.md`); `plan_cut.py` succeeds for every cut.
3. Assets for every carrier exist (`visual-sources.md` section 8). Builders never generate, download, or capture.
4. A stub per scene, or rely on the compositor's placeholder for missing scenes (scene id, label, bars, an
   in/hold/out timeline with a playhead, beat dots). A stub that shows the scene's headline copy makes the timing
   draft far more useful:

   ```js
   (() => {
     SCENES['ask'] = {
       draw(ctx, t, env) {
         const P = env.palette;
         ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
         text(ctx, 'ask · ' + (env.dur / env.barSec).toFixed(1) + ' bars', 120, 160, { size: 28, color: P.muted, fam: 'mono' });
         kinetic(ctx, 'Ask the agent like a friend.', 120, 300, env.lt, { size: 72, weight: 700, color: P.ink });
       },
     };
   })();
   ```
5. Smoke test: `node <skill>/runtime/stills.mjs --project P --cut <main>` (no times = every scene midpoint); it exits
   1 on any console error. `stills.mjs --project P --serve` opens a live dev player for the client.
6. Timing draft: draft music (`arrange.py`) + `render.mjs` of the main cut. Locks length and rhythm with the client.

## 2. Contracts every scene agent gets (paste verbatim)

- **Ownership.** You write only `P/scenes/<id>.js`. Never edit the runtime, `style.json`, `reel.config.json`,
  `STORYBOARD.md`, assets, project modules (`P/modules/*.js`, shared code the integrator owns, such as a code-drawn
  cast) or other scenes. Need something changed? Return it as a request
  `{kind: "cue" | "asset" | "config" | "module", scene, detail}`; the integrator applies or rejects it with a reason.
- **Shape.** An IIFE that only assigns `SCENES['<id>'] = { draw(ctx, t, env) {...} }` (plus `portal(t, env)` when the
  storyboard flies a `zoomInto`/`portalFlash` through this scene). No top-level names outside the IIFE; recipes are
  pasted inside it. Offscreen buffers are created lazily inside it with `makeBuf()`.
- **Purity.** `draw` is a pure function of `(t, env)`: no `Math.random`, `Date`, `performance.now`, no state carried
  between calls (caching a static drawing keyed by its inputs is fine). Use `hash()`/`hsh2()` for randomness.
- **Full frame.** Paint an opaque background first. Valid for `t` in `[t0 - 0.7 s, t1 + 0.7 s]` because transitions
  render neighbours outside their range; elements whose local time is negative are simply not drawn.
- **Elastic.** In-phase, hold, out-phase via `env.phase`; animations at 1x; must look right at `minBars` and at
  `maxBars` (render both). Holds keep idle motion and add secondary beats on bar lines.
- **Transforms.** Never rely on a transform surviving `draw`; the compositor composites scene buffers as images.
- **Owned elsewhere.** No grain, vignette, HUD, captions, or scene transitions in scene code (compositor); whole-frame
  flashes, shakes, and kicks go through `env.fx`. A scene that paints a night stage is `"dark": true` in reel.config
  (a config request). Keep the reserved regions in STORYBOARD.md empty.
- **Style.** Colors from `env.palette` (alpha variants via `rgba()`; a `"dark": true` scene on a light reel receives
  the style's paletteAlt there automatically), fonts from the style font roles, spring and easing from
  `env.style.motion`. New literal colors only where STORYBOARD.md allows (for example a real brand mark).
- **Copy.** Strings exactly as in STORYBOARD.md; banned wording and missing disclaimers are bugs.
- **Verification duty.** Render stills every 0.25 s over the scene in every cut, plus the scene alone at `minBars`
  and `maxBars` (`stills.mjs --scene <id> --dur <s>`), zero console errors, and look at the full-resolution PNGs
  (contact sheets downscale and show fake banding).

## 3. Roles

| Role | Inputs | Writes | Returns (structured) |
|---|---|---|---|
| Tone | `P/source/`, `tone-and-manner.md` | `P/style.json`, `P/build/style-board.png` | mood, theme, bpm, visual sources, narration recommendation, evidence, open questions |
| Storyboard | style.json, source, `storyboard.md`, templates | `P/STORYBOARD.md`, `P/reel.config.json`, `P/narration.json` (if narrated) | scene list with bars, copy rules, cut table, asset needs |
| Narration | narration.json, `narration.md` | `P/build/vo/`, `vo-timeline.json`, `vo-minbars.json` | per-line durations, verification result, scenes whose `minBars` grew |
| Scene builder (x N) | its STORYBOARD section, style.json, `engine-api.md`, `motion-recipes.md` | `P/scenes/<id>.js` | stills dirs, console error count, cuts checked, cue/asset/config requests, notes |
| Scene reviewer (x N) | same, read-only | `P/build/review/<id>/` stills only | verdict + structured defects |
| Scene fixer (x N) | builder notes + defects | `P/scenes/<id>.js` | per-defect status, re-verification |
| Audio | `cut-*.json`, style.sound, `audio.md` | `P/build/music-<cut>.*` | loudness, true peak, sync errors per cue |
| Integrator | everything | `reel.config.json` (merged requests), `P/build/*`, deliverables | checks table, files, open issues |
| Whole-reel reviewer | final renders | `P/build/review/reel/` | defects across boundaries, copy, honesty, audio |

Give the fixer the builder's notes and the defects; a fixer that re-derives the scene from scratch regresses it.

## 4. Reviewer rubric

The reviewer is independent: it renders its own stills, never reuses the builder's, and assumes nothing works.

**Process.**
1. Read the scene's STORYBOARD section and the global rules; read the scene file only to locate problems.
2. Render every 0.2 s over `[t0 - 0.5, t1 + 0.5]` in every cut:
   `node <skill>/runtime/stills.mjs --project P --cut <cut> --range a:b:0.2 --out P/build/review/<id>/<cut>`, plus the
   boundary, hold, and cue frames the planner lists:
   `python3 <skill>/timing/plan_cut.py --project P --cut <cut> --times all --no-write -q` (pass them to stills.mjs;
   `--no-write` keeps parallel agents from rewriting the shared cut files). Render the scene alone at `minBars` and
   `maxBars`: `stills.mjs --project P --cut <cut> --scene <id> --dur <seconds> --out ... --sheet`.
3. Open full-resolution frames: every boundary frame, every cue frame, at least three hold samples, every frame where
   a line of copy is complete.
4. Diff every visible string against STORYBOARD.md; grep the scene file for banned wording.
5. Purity: render one time twice in separate runs; the PNGs must be byte-identical.

**Severity.**

| Severity | Meaning | Examples |
|---|---|---|
| high | ships wrong or broken; must fix | wrong or paraphrased copy, banned wording, missing disclaimer, console error, blank or black frame, one-frame pop, seam at a boundary, text clipped or overlapping, illegible text (contrast < 4.5:1 body, < 3:1 display, or under the size floor), static frame > 0.5 s, broken at minBars or maxBars, drawing in a reserved region, own grain/vignette/HUD, non-deterministic frames |
| medium | visibly below the bar; fix unless the integrator waives it with a reason | event > 1 frame off its beat or cue, linear or undesigned easing, missing overshoot/settle, reading time not met, crowding, collisions with characters, subpixel shimmer or scramble width jitter, light/color mismatch with neighbours, weak hierarchy, a hold that feels dead |
| low | polish | sheen angle, sparkle placement, shadow softness, micro-timing taste |

**Defect format.** Reproducible or it does not count:

```json
{ "id": "ask-03", "severity": "high", "category": "copy|honesty|legibility|layout|timing|motion|continuity|elasticity|purity|style",
  "cut": "30", "t": 8.40, "region": [1060, 250, 700, 90],
  "problem": "Headline reads 'Ask the agent' but STORYBOARD says 'Ask the agent like a friend.'",
  "evidence": "P/build/review/ask/30/t08.40.png",
  "fix": "Use the exact string from STORYBOARD section 'ask'; keep kinetic() stagger 0.03." }
```

A pass is zero high and zero un-waived medium defects. A reviewer that reports no observations has not reviewed:
require an `observations` count and at least one frame path per checked moment.

## 5. Integrator boundary checks

After all scenes pass, for every cut:

- **Seams.** `node <skill>/runtime/stills.mjs --project P --cut <cut> --transitions --out DIR --sheet` renders every
  boundary (window edges, one frame either side, the window middle); add `b +- 2f` where a hard cut needs it. Look for
  pops, doubled elements, shared elements that do not match (the arch that becomes a phone), an empty stage seen
  through a `zoomInto`/`portalFlash` window (the incoming scene needs an establishing image before its first bar),
  brightness jumps that are not an intended flash, HUD discontinuity. This check caught the case-study zoom-through
  bug: the outgoing scene reset transforms internally, so a ctx-transform zoom silently failed; compositing scene
  buffers as images fixed it.
- **Sync.** `verify_sync.py --wav P/build/mix-<cut>.wav --cut P/build/cut-<cut>.json`: every cue within one frame.
- **Loudness.** -14 LUFS integrated (+-1), true peak <= -1 dBTP after AAC: `python3 <skill>/audio/synth.py loudness FILE`.
- **Frames.** `ffprobe` frame count = fps x duration; duration matches the cut plan.
- **HTML.** `build.mjs ... --verify` copies the HTML alone into an empty temp folder, boots it, renders every cut,
  and checks fonts, images, and audio decode with zero console errors; spot-check frames from such a copy with
  `stills.mjs --html <copy> --cut <cut> <times> --out DIR`; `grep -nE '(src|href)="(https?:)?//|src="[^d]' reel.html`
  finds nothing.
- **Purity and ownership.** `grep -nE 'Math\.random|Date\.now|performance\.now|new Date' P/scenes/*.js` is empty;
  `git status` shows each agent touched only its own files.
- **Captions.** When narrated: caption times inside their scenes, no caption over a disclaimer, SRT/VTT parse.

## 6. Drafts early

Ship a timing draft right after the harness and a first-pass draft as soon as every scene has a first build, while
the reviews are still running. In a Workflow script, release a draft-render agent from inside the build stage when
the last first build lands (no barrier; reviews keep flowing):

```js
let built = 0, release; const allBuilt = new Promise(r => (release = r));
const buildStage = async (item) => {
  try { return await agent(buildPrompt(item), { schema: BUILD }); }
  finally { if (++built === items.length) release(); }
};
const [results, draft] = await parallel([
  () => pipeline(items, buildStage, reviewStage, fixStage),
  async () => { await allBuilt; return agent(draftPrompt, { schema: DRAFT }); },
]);
```

## 7. Case-study numbers

- **K-BeautyGate (30 s, 120 BPM, 7 scenes + audio).** 8 pipeline items x 3 stages = 24 agents, 0 failures, ~25 min.
  Builders self-checked with stills every 0.25 s; reviewers rendered every 0.2 s and returned structured defects;
  fixers fixed all high and medium and re-verified. 1,800 frames rendered in ~2.3 min with 8 parallel pages on a
  16-core Mac. The integrator's boundary stills found the only shipped-blocking bug.
- **FDDD (30 s and 15 s, 128 BPM).** Each scene exposed its own event list (`events(dur)`) next to `draw`, so the audio
  used exactly the video's events; the 15-s cut was edited independently at 8 bars.
- **FlyGate (250 s narrated, 28 scenes).** Narration synthesized in batches of up to 8 sentences joined with
  `[long pause]`, split at the long gaps, every clip verified by speech-to-text and matched by clip number; scene
  lengths followed the verified clip durations.

## 8. Failure modes

| Failure | Prevention |
|---|---|
| An agent edits a shared file | ownership in every prompt; integrator checks `git status` per role |
| Zoom transition silently does nothing | compositor composites scene buffers as images; boundary stills |
| "Fixing" banding that is not there | inspect full-resolution frames, never only contact sheets (`montage` bands) |
| Looks fine at 30 s, broken at 60 s | builders and reviewers render the shortest and the longest cut |
| Long holds read as freezes | hold plan per scene: idle motion + secondary beats on bar lines; static > 0.5 s is high |
| Copy drifts into paraphrase | exact strings in STORYBOARD.md; reviewer diffs copy; banned-word grep |
| Reviewer rubber-stamps | independent renders, required observation count, frame paths as evidence |
| Fixer regresses the scene or a neighbour | fixer gets builder notes; integrator re-runs boundary stills after fixes |
| Audio drifts off the picture | cues authored in beats, one cue list for both; `verify_sync.py` |
| Non-deterministic frames | purity grep + render-twice byte comparison |
| Missing CJK glyphs or font fallback | font roles in style.json include a CJK stack; check rendered frames, not code |
| Mid-build asset needs | builders return `asset` requests; the integrator batches them between rounds |
| Background jobs left running | avoid `&`; check `ps` before re-rendering |
| Render workers starve the machine | `--workers` <= cores / 2 while other agents render stills |
| Live paid API calls by accident | only the narration role calls TTS and only the asset role generates images, each with explicit opt-in; `--dry-run` everywhere else |
| A 1-bar short-cut scene loses its title to the out-phase | compact schedule below ~1.5 bars (`motion-recipes.md` section 2); render the short cut too |
| An empty stage shows through a `zoomInto`/`portalFlash` window | the incoming scene draws an establishing image at negative `env.lt` |
| Ink, stamps, or titles vanish on a night stage | the scene is `"dark": true`; recipes switch blend modes and ink from `env.dark` |
| A typing wipe slices glyphs in half | capture bubbles with `rows` (per-character edges) and reveal whole characters |
| Client waits for perfection | timing draft after the harness; first-pass draft as soon as every scene is built |
