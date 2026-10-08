# Narration: when, what to say, how to voice it, how to prove it is right

Narration is optional. When it is on, it uses Gemini TTS (`gemini-3.8-flash-tts`, configurable) through
`narration/tts_gemini.py`, it drives scene lengths in whole bars at the reel's fixed BPM (`narration/vo_timeline.py`),
it is mixed over the music with ducking (`narration/mix_vo.py`), and it is captioned (`narration/captions.py`).
Every clip is checked by speech-to-text before it is used. No paid call is needed to build and test the whole chain:
`--dry-run` makes placeholder clips of the estimated length.

## 1. Decide: narration or music-only

Narrate when the material makes an argument that pictures cannot finish on their own:
- claims with numbers and provenance (papers, benchmarks, research repos), multi-step product tours, pitches to
  decision makers, explainer cuts of 45 s or longer;
- the reel will play with sound (pitch, demo day, website hero with a play button);
- the source itself speaks to the viewer (a talk, a narrated demo, a founder's voice).

Stay music-only when:
- it is a mood/brand teaser of about 20 s or less, or the scenes change faster than one per bar;
- kinetic type already carries the copy and a voice would only read it again;
- the main channel autoplays muted (social feeds); spend the effort on on-screen type instead.

Record the decision in `style.json` `narration.recommended` with a one-line rationale in `rationale.narration`
(`tools/extract_style.py` drafts it from the source; the user can override). Never let the voice read the same sentence the screen is typing at the same moment: the screen
carries the keyword or number, the voice carries the sentence around it.

## 2. Write the script per scene beat

- One idea per scene, usually one sentence (two short ones at most). Say what the picture cannot: why it matters,
  what the number means, what happens next. Do not describe what is visible.
- Budget against the density ceiling: narration units per second of scene, Korean 6.3 syllables/s, English
  3.0 words/s (`timing.maxRate` overrides). At 120 BPM a 2-bar scene (4 s) holds about 3.2 s of speech: roughly
  22 Korean syllables or 10 English words. `vo_timeline.py` flags scenes above the ceiling.
- Open with something concrete (a number, a question, a pain); close with the name and a one-line promise.
- Sync to visuals with beats: `"beat": 8` starts a line no earlier than beat 8 of its scene, where the scene's own
  callout appears (scene cues are authored in beats too, so both move together when the plan changes).
- The source's copy rules apply to narration: exact product names, banned words, required disclaimers
  ("demo data", "fictional persona") are bugs if violated.
- Korean: keep one register throughout (합쇼체, e.g. "…줄었습니다."), give each sentence a subject, explain an
  abbreviation at its first use, avoid stacked modifiers. English: active voice, present tense, short words.
- Lengths: lines play in every cut by default. `"cuts": ["60"]` limits a line to listed cuts (planned with
  `build/vo-minbars-<cut>.json`). `"optional": true` makes a line best-effort: it never raises bar minimums and plays
  only where the planned scene has room (longer cuts naturally say more at the same pace).

## 3. Numbers, names and terms spoken right

Write `text` exactly as captions should show it; put pronunciations in the `lexicon` (display -> spoken, applied to
whole Latin words) or in a line's `say`. The TTS gets the spoken form, captions get the display form, verification
accepts either.

The first rows were found by listening in the FlyGate case study:

| Problem heard | Fix |
| --- | --- |
| CamelCase name glued to a Korean particle misread ("FlyGate는" heard as 플레이게이트) | `"FlyGate": "Fly Gate"` |
| Gene/model IDs read as words ("PARP1") | `"PARP1": "P-A-R-P 1"` |
| Korean counter read with the wrong numeral system ("7문항" -> 칠 문항) | `say`: "일곱 문항" (native numerals for 개/명/가지/시간/살/문항 and 번 as "times"; Sino-Korean for 건/원/년/%/위 and 번 as "number") |
| Symbols and units (Å, →, ×, 3x, v2.1) | spell out: "옹스트롬"/"angstroms", "에서 … 으로"/"from … to", "three times", "version two point one" |
| URLs, paths, flags | say the domain or the idea only; show the exact string on screen |
| Acronym said as a word or spelled the wrong way (NIH as "nih", SQL as "sequel") | lexicon `"NIH": "N-I-H"`; the TTS decides, so listen to every acronym once |

Numbers in digits are fine in both languages ("4,600건" -> 사천육백 건; "0.71" -> zero point seven one); the
verifier reads digits and words alike. Add `"verify": {"fold": {"트레일믹스": "trailmix"}}` when the STT writes a
name in another script.

## 4. Voice and delivery follow the source's tone

`style.json` `narration` {voice, styleTag, lang} (from the tone pass) is the default; `narration.json` `voice`,
`style`, `lang` and `model` override it, so set them there only on purpose (`templates/narration.template.json` leaves
them out); a line may override `voice` or `style` (lines are batched per voice/style). When neither file sets them:
Puck, `[fast, energetic]`, the detected language, gemini-3.8-flash-tts.

| Source tone | Voices to audition | Style tag |
| --- | --- | --- |
| Playful consumer, launch hype, hackathon demo | Puck (upbeat), Fenrir (excitable), Laomedeia (upbeat), Sadachbia (lively) | `[fast, energetic]`, `[bright, playful]` |
| Research, data, engineering, evidence-first | Charon (informative), Iapetus (clear), Sadaltager (knowledgeable), Erinome (clear) | `[confident, clear]`, `[measured]` |
| Premium, wellness, calm brand | Sulafat (warm), Achernar (soft), Vindemiatrix (gentle), Algieba (smooth) | `[calm, warm]` |
| Authority, security, enterprise | Kore (firm), Orus (firm), Alnilam (firm), Gacrux (mature) | `[serious, confident]` |
| Friendly tutorial, community | Achird (friendly), Zubenelgenubi (casual), Callirrhoe (easy-going), Aoede (breezy) | `[friendly, relaxed]` |

All 30 prebuilt voices and their documented character are in `tts_gemini.py` `VOICES`; availability can change, so
audition before committing: `tts_gemini.py sample --project P --out P/build/vo/samples --voices Puck,Charon,Kore
--styles "[fast, energetic]|[confident, clear]"` writes one clip per voice x style plus `audition.wav` and
`samples.md` (one TTS call each). Style tags must be bracket tags of one to three words: plain-text instructions in
front of a line are read aloud. The model has no system instruction; the language follows the text (set `lang` for
estimates and verification).

## 5. Pipeline

```bash
S=<skill>; P=<project>
python3 $S/narration/vo_timeline.py --project $P --estimate        # plan from text estimates, no API call
python3 $S/narration/tts_gemini.py batch --project $P --dry-run     # placeholder clips: test everything offline
python3 $S/narration/tts_gemini.py key status                       # BYOK (section 9): source only; exit 1: no key, stay on --dry-run
python3 $S/narration/tts_gemini.py key check                        # free model lookup that validates the key
python3 $S/narration/tts_gemini.py batch --project $P [--env-file <file the user named>]   # real clips: batched, verified, cached
python3 $S/narration/vo_timeline.py --project $P                    # real durations -> vo-timeline.json, vo-minbars*.json
python3 $S/timing/plan_cut.py --project $P --cut 30                 # picks up the minimums (bars grow; BPM never changes)
python3 $S/audio/arrange.py --project $P --cut 30 --stem            # unmastered bed: build/music-30-stem.wav (song kept)
python3 $S/narration/mix_vo.py --project $P --cut 30                # ducked mix -> build/mix-30.wav/.m4a/-embed.m4a/.json
python3 $S/narration/captions.py --project $P --cut 30              # SRT/VTT + burn-in cues into build/cut-30.json
python3 $S/narration/vo_timeline.py --project $P --cut 30           # build/script-30.md for client review
python3 $S/audio/verify_sync.py --wav $P/build/mix-30.wav --cut $P/build/cut-30.json
node $S/runtime/render.mjs --project $P --cut 30 --out reel.mp4     # picks build/mix-30.m4a
node $S/runtime/build.mjs --project $P --cuts 30 --out reel.html    # picks build/mix-30-embed.m4a
```

Order: narration timing -> plan -> music -> mix and captions -> render. Re-run `captions.py` after every
`plan_cut.py` (it rewrites the cut JSON). `mix_vo.py` reads `build/music-<cut>-stem.wav`, else the mastered
`music-<cut>.wav` (the sum is re-normalized either way); its report records `placeholder` (dry-run clips),
`unverified` (clips not confirmed by STT) and `bedStem`. `render.mjs` and `build.mjs` pick the mix automatically,
skip a placeholder mix (falling back to the music, with a warning), refuse an explicit placeholder `--audio` and
refuse captions timed from placeholder narration (the plan's `vo.placeholderCaptions`) unless `--allow-placeholder`
is passed for a test. Lines tagged with `"cuts"` play only in those cuts: when a longer cut is added later, add it
to the lines (the planner warns when a scene of a longer cut loses all its lines that way). A cut with `"narration": false` in `reel.config.json` is music-only:
the mix is the bed alone and there are no cues. Slow-down variants (`--scale X` / `--warp "o:s,..."` on
`vo_timeline.py --cut`, `mix_vo.py`, `captions.py`) move line starts only; speech is never stretched; the
variant's own bed from `arrange.py --scale/--warp` (`music-<cut>-x<scale>.wav`, `music-<cut>-warp.wav`) is picked
up automatically.

## 6. Timing model

- A scene needs `lead` (0.3 s) + speech + `gap` (0.12 s) between its lines + `tail` (0.5 s), rounded UP to whole
  bars: `vo-minbars.json` {sceneId: bars}. The planner takes max(config minBars, narration bars); the rest of the
  scene is a living hold. Narration never changes the tempo or slows animation.
- Lines stack from the scene start. `beat` anchors, `gapAfter` (seconds after a line) and per-scene
  `"scenes": {"<id>": {"lead", "gap", "tail"}}` adjust the layout; the planner relays out cut-specific line sets
  with the same rule.
- Durations, best first: a line's `file` (a human recording, any format), the TTS cache, the dry-run cache, the
  text estimate (calibrated on real Puck/Aoede clips: median within 5%, mean error about 0.35 s per line, slightly
  long on purpose so plans rarely need more bars after synthesis).
- Rates: "rate" in tables is the speaking rate of a line; "density" is narration per second of scene and is what
  the ceiling checks. Real clips far faster than the voice's normal pace (> 1.3x) are flagged as possibly missing
  words; far slower as possibly containing extra speech.

## 7. Verification

- During `batch`, each request (up to 8 lines sharing voice/style/model) is: style tag + throw-away lead sentence +
  lines joined with ` [long pause] `. The audio is cut at the longest pauses (>= 0.35 s; "clear" when they are
  >= 1.5x the longest pause inside sentences), each piece is trimmed (0.04 s / 0.12 s kept; stray clicks dropped),
  and all pieces plus their head/tail fragments are transcribed in ONE `gemini-3.8-flash` call (JSON schema
  `[{clip, text}]`, matched by clip number). A piece fails on: wrong sentence (closer to a neighbour than to its
  own line), style tag words heard, lead sentence heard, extra words, missing words. Passing pieces are kept when the
  cut points are unambiguous; the rest retry (3 attempts), then the batch is halved, down to single lines; a line
  that still fails is kept, marked `verified: false`, retried on the next `batch`, and reported.
- `tts_gemini.py audit --project P [--fix]`: re-transcribe every cached clip (12 lines per call). `--fix` deletes
  failing clips so `batch` regenerates only those; it refuses when most clips fail (that is usually the STT, not the
  clips; add `--force` after listening). `verify --wav F --text T ...` checks any clips.
- A line whose STT is reliably wrong (an invented name) gets `"verify": false` after you listened to it.
- Listen anyway: `build/vo/<key>.wav` per line. Then read `build/script-<cut>.md`, the mix report
  (`build/mix-<cut>.json`: LUFS, true peak, voice over the ducked bed in LU, 10 LU or more is good) and the caption
  stats (reading speed: warn above 20 chars/s Latin, 14 chars/s CJK).
- Before delivery: no dry-run clips or captions timed from them (`vo_timeline.py`, `plan_cut.py` and `mix_vo.py`
  warn; `render.mjs` and `build.mjs` refuse them), no failed or unverified clips.
- Offline self-check of parsing, splitting and comparison: `tts_gemini.py selftest`.

## 8. Rate limits and cost

- Calls: TTS about ceil(lines / 8) per voice/style group plus retries; STT one per TTS request; audit
  ceil(lines / 12); samples one per voice x style. Each batch ends with a call and token count (a dry run reports
  the calls a real run would make, marked "simulated: no network, nothing billed").
- Cache key: sha1(model|voice|style|spoken text). Changing one line re-synthesizes only that line; changing the voice,
  style tag or model re-synthesizes everything (on purpose: they change the sound).
- Per-minute limits return 429 with `retryDelay`; the client waits retryDelay + 2 s (12 retries per request) and
  `--rpm N` paces requests (FlyGate ran into about 10 TTS requests per minute on a free tier). A daily-quota 429
  stops at once.
- Never transcribe clip by clip with a separate transcribe model (one had a 100 requests/day limit); batch the clips.
- Prices change; check current Gemini pricing before large jobs. Tests and CI use `--dry-run` only.

## 9. API key (BYOK)

Narration is **bring your own key**: the skill ships no key, never goes looking for one, and every request is billed
to the user's own Google account. The key is taken from the first source that has one; an explicit `--env-file` or
`--api-key-env` must yield a key (it never falls back to the next source):

| Order | Source | Notes |
|---|---|---|
| 1 | `--env-file FILE` | a file the user names; only its key lines are parsed, and a `GEMINI_API_KEY=` line wins over a `GOOGLE_API_KEY=` line wherever each sits |
| 2 | `--api-key-env NAME` | the NAME of the user's own variable (never the key itself) |
| 3 | `GEMINI_API_KEY` | exported in the terminal that starts Claude Code, before it starts (or in the shell profile) |
| 4 | macOS Keychain item `motion-showreel-gemini` | written by `key save` in the user's own terminal (`--keychain-service` to rename) |
| 5 | `GOOGLE_API_KEY` | a generic name other Google tools use too, so it ranks below the Keychain item saved on purpose |
| 6 | hidden terminal prompt | only when a person runs the command in a terminal; kept in memory for that run; `--no-prompt` disables it |

`key status` names the source in use and every other source that also holds a key (names only); a real batch logs
the same line once.

```bash
python3 $S/narration/tts_gemini.py key status    # which source would be used (never prints the key); exit 1 if none
python3 $S/narration/tts_gemini.py key check     # validates it with a free model lookup (no quota)
python3 $S/narration/tts_gemini.py key save      # macOS, in the user's own terminal: typed hidden into the login Keychain
python3 $S/narration/tts_gemini.py key forget    # removes that Keychain item (save / forget with --dry-run change nothing)
```

Rules for Claude:
- Never look for a key yourself: never open, cat, grep or print an env file (this project's `.env` included), shell
  history, dotfiles or configs, and never reuse a key you happen to see. When the user names a file, pass it to the
  tool as `--env-file FILE` (the tool reads only the key line).
- Never ask the user to paste the key into the chat, and never suggest a `!` command for it. Claude Code keeps `!`
  command lines in the transcript and runs them without a terminal: `key save` cannot ask for hidden input there,
  and an `! export ...` is gone before the next command. Instead, ask the user to do one of these, then tell you:
  - macOS: open a separate terminal window (Terminal, iTerm) and run
    `python3 <absolute path of S>/narration/tts_gemini.py key save` there (write out the real path);
  - export `GEMINI_API_KEY` in the terminal they start Claude Code from, before starting it (or in their shell
    profile, then restart Claude Code);
  - name a file or a variable for `--env-file` / `--api-key-env`.
- Then run `key status` and `key check` yourself. If either fails, stay on `--dry-run` and tell the user; do not look
  for another key. Workflow sub-agents cannot ask the user: set the key up before running a workflow with
  `liveTts: true`.

The key travels only in the `x-goog-api-key` header, and only to Google's https endpoint or a loopback mock: a
`--api-base` / `GEMINI_API_BASE` on any other host is refused unless `--allow-custom-api-base`, plain http only
reaches loopback (never through a proxy), and redirects are never followed. It is never printed, logged, cached,
written to sidecars or put in a URL; logs name the source only. A key passed as an argument (`--api-key`, `--key`)
is refused without being shown, and so is a key with spaces, line breaks or non-ASCII characters.

## 10. Pitfalls already paid for

- Plain-text style directions are spoken. Use bracket tags only.
- The TTS payload is a WAV file with trailing C2PA metadata; using anything but the `data` chunk ticks at
  sentence edges.
- (FlyGate case study) Synthesizing a whole script in one call and cutting at silences picked wrong boundaries
  (words leaked between sentences). Batches of up to 8 with `[long pause]`, a throw-away lead sentence and STT checks fixed it.
- A multi-clip STT reply once shifted by one clip: match by clip number, never by order.
- Whole-sentence transcripts drop a leaked "Fast. Energetic." at the start; head/tail fragments are checked.
- Cutting clips mid-waveform clicks; `mix_vo.py` fades 10 ms in and 40 ms out.
- Placing narration by stretching the timeline breaks the music grid; quantize up to bars instead.
- Captions that bridge a scene cut by a few frames look sloppy; `captions.py` snaps cue edges to cuts.
- `plan_cut.py` regenerates the cut JSON: run `captions.py` again afterwards.
- Dry-run clips are murmuring placeholders: never deliver them.

## 11. File formats

`P/narration.json` (contract G; every key other than `lines`, `scene` and `text` is optional; `lang`, `voice`, `style`
and `model` override `style.json` narration, so omit them unless you mean to; the third line shows all optional line
keys at once for reference: a line with `file` is a human recording and is never synthesized):

```json
{
  "lang": "ko", "voice": "Puck", "style": "[fast, energetic]", "model": "gemini-3.8-flash-tts",
  "lexicon": {"TrailMix": "Trail Mix", "GPU": "지피유"},
  "timing": {"lead": 0.3, "gap": 0.12, "tail": 0.5, "maxRate": 6.3},
  "scenes": {"cta": {"lead": 0.6, "tail": 0.9}},
  "captions": {"maxChars": 22, "maxLines": 2, "lead": 0.3, "hold": 1.6, "minDur": 0.9},
  "mix": {"duck": 0.32, "pre": 0.12, "post": 0.15, "smooth": 0.25, "voRel": 1.0, "lufs": -14, "truePeak": -1.0},
  "verify": {"fold": {"트레일믹스": "trailmix"}},
  "lines": [
    {"scene": "hook", "text": "매일 4,600건의 리뷰가 쏟아집니다.", "visual": "counter to 4,600"},
    {"scene": "demo", "text": "TrailMix는 꼭 읽어야 할 리뷰만 먼저 보여 줍니다.", "beat": 8, "cuts": ["60"]},
    {"scene": "demo", "text": "…", "say": "spoken form", "caption": "shown form (\"\" = no caption)",
     "optional": true, "gapAfter": 0.4, "voice": "Kore", "style": "[calm]", "gain": -1.5, "verify": false,
     "file": "assets/vo/take3.wav", "id": "demo-close"}
  ]
}
```

Generated (all under `P/build/`):
- `vo/cache/{tts|dry}/<voice>/<sha>.wav` + `.json` (text, say, verified, problem, transcript); `vo/<key>.wav` named
  copies; `vo/manifest.json` {cache, lang, dryRun, lines: [{key, scene, text, say, sha, file, clip, dur, verified,
  problem, transcript, source}]}.
- `vo-timeline.json`: {bpm, beatsPerBar, beatSec, barSec, lang, voice, style, model, timing {lead, gap, tail,
  maxRate, unit}, sceneTiming, source, lines: [{key, scene, index, order, text, say, caption, sha, beat, gapAfter,
  cuts, file, source (clip|custom|dry-run|estimate), dur, est, units, unit, start, end, rate, verified, problem}],
  optionalLines: [same], scenes: {id: {lines: [{key, start, end}], need, minBars, minBeats, speech, units, density,
  captions: [{t0, t1, text}] (scene-relative)}}, cuts: {cut: {id: {lines, need, minBars}}}, warnings}.
  `scenes` and `vo-minbars.json` cover lines without a `cuts` filter and without `optional`.
- `vo-minbars.json` {sceneId: bars}; `vo-minbars-<cut>.json` only when some line has a `cuts` filter.
- `vo-<cut>.json` (placed: lines with absolute t0/t1, per-scene density and tail, warnings, notes),
  `vo-script.md`, `script-<cut>.md`.
- `captions-<cut>.srt`, `.vtt` (STYLE from `style.json` layout.captions fg/bg/font, `line:` from y), `.json`
  {cues: [{t0, t1, text, scene, key}], stats}; the cut JSON `captions` [{t0, t1, text, scene}] with "\n" between
  lines when captions are enabled (`reel.config.json` captions.enabled, else `style.json` layout.captions.enabled,
  else on). The runtime draws them only when one of those two switches is explicitly true, so set it for a narrated
  reel. Line width follows the runtime: `layout.captions.maxWidth`, else W - 2 x max(`layout.margin` or 120, 0.08 W)
  at `layout.captions.size` (default 40 px), capped at about 22 CJK / 42 Latin characters per line.
- `mix-<cut>.wav` (48 kHz, 16-bit, exactly the cut length), `mix-<cut>.m4a` (AAC 192k), `mix-<cut>-embed.m4a`
  (AAC 96k, faststart), `mix-<cut>.json` (lufs, truePeak, voOverDuckedBedLU, per-line level, encodes, bed, bedStem,
  placeholder, unverified).
