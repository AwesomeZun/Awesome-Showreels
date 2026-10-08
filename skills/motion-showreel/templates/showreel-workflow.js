export const meta = {
  name: 'motion-showreel',
  description: 'Produce a motion showreel for one reel project: tone pass, storyboard, assets, optional narration, per-scene build/review/fix with audio, integrator checks, renders',
  whenToUse: 'A motion-showreel project folder exists with its source material in P/source and the user wants the full multi-agent production (MP4 per cut + single-file HTML).',
  phases: [
    { title: 'Tone', detail: 'style.json derived from the source material, then an independent critic' },
    { title: 'Storyboard', detail: 'STORYBOARD.md, reel.config.json, cut plans, then an independent critic' },
    { title: 'Assets', detail: 'captures, cutouts, figures and data the storyboard needs (parallel with narration)' },
    { title: 'Narration', detail: 'optional: lines, TTS or dry run, VO timeline, re-planned cuts' },
    { title: 'Build', detail: 'one builder per scene plus music; draft render as soon as every first build lands' },
    { title: 'Review', detail: 'independent reviewer then fixer per scene and for audio, up to N rounds' },
    { title: 'Integrate', detail: 'merge requests, final audio, boundary stills, renders, single-file HTML, checks' },
    { title: 'Final review', detail: 'whole-reel review per cut, routed fixes, re-render' },
  ],
}

// motion-showreel production workflow (template). Copy it next to the project or run it from the skill folder.
// It spawns about 25-40 agents (tone, storyboard, assets, narration, a builder/reviewer/fixer per scene, audio,
// integrator): run it only after the user has agreed to a multi-agent production.
// args: { projectDir, skillDir, scenes?: [ids], cuts?: [names], narration?: bool,
//         mainCut?, liveTts?: bool, ttsEnvFile?, ttsApiKeyEnv?, ttsKeychainService?, allowImageGen?: bool,
//         reviewRounds?: 1-4, version?, slug?, brief?, styleApproved?: bool, storyboardApproved?: bool,
//         stopAfter?: 'tone' | 'storyboard', workers? }
// stopAfter: end after that stage so the user can approve the style board / storyboard (re-run with styleApproved /
// storyboardApproved). Paid calls are opt-in: narration runs as a TTS dry run (placeholder clips, no network) unless
// liveTts === true (the user has agreed to spend quota; legacy ttsDryRun: false means the same); image generation
// only when allowImageGen === true. Narration is BYOK: agents here cannot ask the user for a key, so set liveTts only
// after the user set up their own key and `tts_gemini.py key status` / `key check` passed in the main session; a file
// or variable NAME the user named goes in ttsEnvFile / ttsApiKeyEnv (never the key itself). Plain JS only: no
// Date.now(), Math.random(), or argless new Date() (they break resume).

const A = args || {}
if (!A.projectDir || !A.skillDir) throw new Error('motion-showreel workflow: args.projectDir and args.skillDir are required')
const P = String(A.projectDir).replace(/\/+$/, '')
const S = String(A.skillDir).replace(/\/+$/, '')
const CUTS = (Array.isArray(A.cuts) && A.cuts.length ? A.cuts : ['30']).map(String)
const MAIN = A.mainCut ? String(A.mainCut) : CUTS.includes('30') ? '30' : CUTS[0]
const NARRATION = A.narration === true
const TTS_DRY = !(A.liveTts === true || A.ttsDryRun === false)   // dry run unless live TTS is explicitly allowed
// BYOK key flags for every tts_gemini.py call: only a file, variable NAME or Keychain service the user named
const looksLikeKey = (v) => /AIza[0-9A-Za-z_-]{20,}/.test(String(v))
const shq = (v) => `'${String(v).replace(/'/g, `'\\''`)}'`
if ([A.ttsEnvFile, A.ttsApiKeyEnv, A.ttsKeychainService].some((v) => v && looksLikeKey(v))) {
  throw new Error('motion-showreel workflow: ttsEnvFile / ttsApiKeyEnv / ttsKeychainService take a file, a variable NAME or a Keychain service name, never the key itself (value not shown)')
}
if (A.ttsApiKeyEnv && !/^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(String(A.ttsApiKeyEnv))) {
  throw new Error('motion-showreel workflow: ttsApiKeyEnv must be an environment variable NAME (value not shown)')
}
const KEY_FLAGS = ['--no-prompt']
  .concat(A.ttsEnvFile ? ['--env-file', shq(A.ttsEnvFile)] : [])
  .concat(A.ttsApiKeyEnv ? ['--api-key-env', String(A.ttsApiKeyEnv)] : [])
  .concat(A.ttsKeychainService ? ['--keychain-service', shq(A.ttsKeychainService)] : [])
  .join(' ')
const STOP_AFTER = A.stopAfter === 'tone' || A.stopAfter === 'storyboard' ? A.stopAfter : null
const IMAGE_GEN = A.allowImageGen === true
const ROUNDS = Math.max(1, Math.min(4, Math.floor(Number(A.reviewRounds) || 2)))
const VERSION = A.version ? String(A.version) : '1.0.0'
const SLUG = (A.slug ? String(A.slug) : P.split('/').filter(Boolean).pop() || 'reel').toLowerCase().replace(/[^a-z0-9-]+/g, '-')
const WORKERS = Math.max(1, Math.floor(Number(A.workers) || 6))
const BRIEF = A.brief ? String(A.brief) : ''
const CUTLIST = CUTS.join(', ')
let VO_OK = false // set after the narration stage; later prompts use the VO timeline only when it exists
let VO_PLACEHOLDER = false // narration ran as a dry run (asked for, or no usable key): its mix and captions are placeholders

// ───────── shared prompt text ─────────
const RULES = [
  `Skill folder S = ${S}. Reel project folder P = ${P}. Read ${S}/SKILL.md first.`,
  'Never open, print, copy, or search for any .env file or API key, and never ask anyone for a key. Never copy images, fonts, audio, video, or data from other projects or a downloads folder into P.',
  'Write only the files your role owns (listed below); everything else is read-only for you.',
  'Report paths and numbers, not file contents. Keep shell output short.',
].join('\n')
const SCENE_CONTRACT = `The scene contract in ${S}/references/multi-agent.md section 2 is binding: one IIFE that only assigns SCENES['<id>'] = { draw(ctx, t, env), portal?(t, env) } with the recipes it uses pasted inside, pure in (t, env), opaque full frame, valid for [t0 - 0.7, t1 + 0.7], elastic via env.phase (looks right at minBars and maxBars), whole-frame flash/shake only through env.fx, no grain/vignette/HUD/captions/transitions, colors from env.palette, exact copy from STORYBOARD.md.`
const stillsCmd = (cut, range, out) => `node ${S}/runtime/stills.mjs --project ${P} --cut ${cut} --range ${range} --out ${out}`

// ───────── schemas ─────────
const STR = { type: 'string' }
const STRS = { type: 'array', items: STR }
const NUM = { type: 'number' }
const BOOL = { type: 'boolean' }
const obj = (properties, required) => ({ type: 'object', properties, required })

const TONE = obj({
  styleJson: STR, board: STR, mood: STRS, theme: { type: 'string', enum: ['light', 'dark'] }, bpm: NUM,
  visualSources: STRS, characters: BOOL, dataViz: BOOL, narrationRecommended: BOOL, evidence: STRS, openQuestions: STRS,
}, ['styleJson', 'mood', 'theme', 'bpm', 'visualSources', 'narrationRecommended', 'evidence'])
const CRITIC = obj({
  verdict: { type: 'string', enum: ['ok', 'revise'] }, observations: NUM,
  edits: { type: 'array', items: obj({ where: STR, problem: STR, fix: STR }, ['where', 'problem', 'fix']) },
}, ['verdict', 'observations', 'edits'])
const ASSET = obj({
  name: STR, kind: { type: 'string', enum: ['cutout', 'ui', 'cli', 'pdf', 'web', 'native', 'photo', 'data'] },
  spec: STR, scenes: STRS, status: { type: 'string', enum: ['ready', 'missing'] },
}, ['name', 'kind', 'spec', 'scenes', 'status'])
const STORYBOARD = obj({
  storyboard: STR, config: STR, narrationJson: STR, poster: obj({ cut: STR, t: NUM }, ['cut', 't']),
  scenes: { type: 'array', items: obj({ id: STR, idea: STR, minBars: NUM, maxBars: NUM, carrier: STR }, ['id', 'idea', 'minBars', 'maxBars', 'carrier']) },
  cuts: { type: 'array', items: obj({ cut: STR, bars: NUM, seconds: NUM }, ['cut', 'bars', 'seconds']) },
  assets: { type: 'array', items: ASSET }, openQuestions: STRS,
}, ['storyboard', 'config', 'scenes', 'cuts', 'assets'])
const ASSETS_DONE = obj({
  kind: STR, produced: STRS, notes: STR,
  blocked: { type: 'array', items: obj({ name: STR, reason: STR, nextStep: STR }, ['name', 'reason', 'nextStep']) },
}, ['kind', 'produced', 'blocked'])
const NARR = obj({
  mode: { type: 'string', enum: ['live', 'dry-run'] }, keyMissing: BOOL, lines: NUM, verified: NUM, failed: STRS,
  minBarsRaised: { type: 'array', items: obj({ scene: STR, minBars: NUM }, ['scene', 'minBars']) }, timeline: STR, issues: STRS,
}, ['mode', 'lines', 'minBarsRaised', 'timeline', 'issues'])
const REQUEST = obj({ kind: { type: 'string', enum: ['cue', 'asset', 'config', 'module'] }, scene: STR, detail: STR }, ['kind', 'scene', 'detail'])
const BUILD = obj({
  item: STR, files: STRS, stillsDirs: STRS, consoleErrors: NUM, cutsChecked: STRS,
  requests: { type: 'array', items: REQUEST }, notes: STR, openIssues: STRS,
}, ['item', 'files', 'stillsDirs', 'consoleErrors', 'cutsChecked', 'requests', 'notes'])
const DEFECT = obj({
  id: STR, severity: { type: 'string', enum: ['high', 'medium', 'low'] },
  category: { type: 'string', enum: ['copy', 'honesty', 'legibility', 'layout', 'timing', 'motion', 'continuity', 'elasticity', 'purity', 'style', 'audio'] },
  scene: STR, cut: STR, t: NUM, region: { type: 'array', items: NUM }, problem: STR, evidence: STR, fix: STR,
}, ['id', 'severity', 'category', 'scene', 'cut', 't', 'problem', 'evidence', 'fix'])
const REVIEW = obj({
  item: STR, verdict: { type: 'string', enum: ['pass', 'fix'] }, observations: NUM, framesRead: NUM, defects: { type: 'array', items: DEFECT },
}, ['item', 'verdict', 'observations', 'framesRead', 'defects'])
const FIX = obj({
  item: STR, fixed: STRS, notFixed: { type: 'array', items: obj({ id: STR, reason: STR }, ['id', 'reason']) },
  consoleErrors: NUM, requests: { type: 'array', items: REQUEST }, notes: STR,
}, ['item', 'fixed', 'notFixed', 'consoleErrors', 'requests', 'notes'])
const DRAFT = obj({ mp4: STR, sheet: STR, seconds: NUM, issues: STRS }, ['mp4', 'issues'])
const INTEGRATE = obj({
  appliedRequests: NUM,
  rejectedRequests: { type: 'array', items: obj({ detail: STR, reason: STR }, ['detail', 'reason']) },
  cuts: { type: 'array', items: obj({ cut: STR, bars: NUM, seconds: NUM, audio: STR, embedAudio: STR, syncMaxErrMs: NUM, lufs: NUM, truePeak: NUM }, ['cut', 'bars', 'seconds', 'audio', 'syncMaxErrMs', 'lufs', 'truePeak']) },
  issues: STRS,
}, ['appliedRequests', 'rejectedRequests', 'cuts', 'issues'])
const SWEEP = obj({ cut: STR, checked: NUM, framesRead: NUM, defects: { type: 'array', items: DEFECT } }, ['cut', 'checked', 'framesRead', 'defects'])
const RENDER = obj({
  mp4: { type: 'array', items: obj({ cut: STR, path: STR, share: STR, frames: NUM, seconds: NUM }, ['cut', 'path', 'frames', 'seconds']) },
  html: STR, covers: STRS, captions: STRS,
  checks: { type: 'array', items: obj({ name: STR, pass: BOOL, detail: STR }, ['name', 'pass', 'detail']) }, issues: STRS,
}, ['mp4', 'html', 'checks', 'issues'])

// ───────── prompts ─────────
const tonePrompt = (edits) => `${RULES}
ROLE: tone pass. You own P/style.json and P/build/style-board.png.
Read ${S}/references/tone-and-manner.md and ${S}/templates/style.schema.json.
1. Inventory everything in ${P}/source: claims, vocabulary, formality, humour, languages, audience, purpose, exact copy, banned wording, disclaimers, data provenance; logos, mascots, figures, screenshots, photos, light/dark dominance, density; existing design tokens (CSS variables, Tailwind config, pptx theme, PDF fonts, README style).
2. Measure: python3 ${S}/tools/extract_style.py --source ${P}/source --project ${P} --board
3. Interpret what cannot be measured (mood, pace, seriousness, whether characters or data carry the story, how claims must be qualified, narration) and edit P/style.json. Every rationale entry cites evidence from the source (file and what it shows). There are no preset looks: the style follows the material.
4. Open P/build/style-board.png at full resolution. Check contrast (ink on bg >= 7:1, muted on bg >= 4.5:1) and that every font role renders the languages the copy needs.
${edits ? 'Apply these critic edits first (JSON): ' + JSON.stringify(edits) + '\n' : ''}${BRIEF ? 'Client brief from the user: ' + BRIEF + '\n' : ''}Return the structured summary.`

const toneCriticPrompt = () => `${RULES}
ROLE: tone critic. Read-only. Independently check ${P}/style.json against ${P}/source, ${S}/references/tone-and-manner.md and ${S}/templates/style.schema.json:
- validates against the schema; every palette role, font role, motion, sound and narration field present;
- every rationale entry cites evidence that really exists in the source (open the files and images yourself);
- palette roles match the material (sample its screenshots, logos, figures yourself); contrast ink/bg >= 7:1, muted/bg >= 4.5:1;
- fonts exist or have fallbacks; CJK coverage when the copy needs it;
- pace, spring, transitions, sound and narration fit the mood and the purpose; nothing borrowed from a case study without evidence.
Verdict "revise" only for concrete, evidence-backed edits.`

const storyboardPrompt = (edits) => `${RULES}
ROLE: storyboard. You own P/STORYBOARD.md and P/reel.config.json${NARRATION ? ' and P/narration.json' : ''}.
Read ${S}/references/storyboard.md, ${S}/references/visual-sources.md, ${S}/references/timing-and-length.md, ${S}/references/motion-recipes.md (to know what is cheap and what sells) and ${P}/style.json (read-only).
Start from ${S}/templates/STORYBOARD.template.md and ${S}/templates/reel.config.template.json${NARRATION ? ' and ' + S + '/templates/narration.template.json' : ''}.
Scenes: ${Array.isArray(A.scenes) && A.scenes.length ? 'use exactly these ids in this order: ' + A.scenes.join(', ') : 'choose 6-9 scene ids (lowercase a-z, 0-9, -) following the proven structures in storyboard.md'}.
Cuts: ${CUTLIST} (main cut ${MAIN}); each cut in reel.config.json "cuts" ({"bars": n} or {"seconds": s}).
1. Extract the brief from ${P}/source: one sentence, one scene, one message, exact copy, banned wording, disclaimers, provenance of every number.
2. Choose carriers per scene with the decision procedure in visual-sources.md; list every asset with status ready or missing.
3. Write the bar-grid choreography per scene (in-phase beats, hold plan with secondary beats on bar lines, out-phase), cues in beats (SFX names and spec grammar: python3 ${S}/audio/synth.py list), minBars/maxBars/priority/optional, "dark" for night-stage scenes, "inFallback" for zoomInto/match/portalFlash${NARRATION ? ', and one narration line per scene in P/narration.json' : ''}.
4. Plan every cut until it succeeds with boundaries on bar lines and no scene below minBars: python3 ${S}/timing/plan_cut.py --project ${P} --cut <cut>
${edits ? 'Apply these critic edits first (JSON): ' + JSON.stringify(edits) + '\n' : ''}${BRIEF ? 'Client brief from the user: ' + BRIEF + '\n' : ''}Return the structured summary (poster = the cut and time of the "one scene" frame).`

const storyboardReadPrompt = () => `${RULES}
ROLE: storyboard reader. Read-only. ${P}/STORYBOARD.md and ${P}/reel.config.json are approved. Re-run python3 ${S}/timing/plan_cut.py --project ${P} --cut <cut> for every cut in ${CUTLIST} (it only writes P/build/cut-*.json) and return the structured summary of what is there; mark assets ready only if their files exist.`

const storyboardCriticPrompt = () => `${RULES}
ROLE: storyboard critic. Read-only. Check ${P}/STORYBOARD.md, ${P}/reel.config.json${NARRATION ? ', ' + P + '/narration.json' : ''} and ${P}/build/cut-*.json against ${P}/source, ${P}/style.json and ${S}/references/storyboard.md:
- every on-screen string is verbatim from the source or approved; banned wording and disclaimers complete; every number has provenance;
- carriers follow visual-sources.md (one hero carrier per scene; honesty rules);
- reading time fits each line after its entrance; hierarchy and size floors;
- every scene has minBars/maxBars, a hold plan with secondary beats, cues in beats, an "in" transition from style.motion.transitions;
- every cut plans; boundaries on bar lines; longer cuts add optional scenes or holds, never slower motion${NARRATION ? '; narration lines fit their scenes at the rate caps in ' + S + '/references/narration.md' : ''}.
Verdict "revise" only for concrete edits.`

const KIND_HOWTO = {
  cutout: `Follow ${S}/references/imagery.md: start from the client's character reference in P/source; cut out with python3 ${S}/tools/prep_assets.py --project ${P} (macOS Vision lift via ${S}/tools/lift.swift; --check lists the backends; one-off: --src <image> --name <name> --kind character) into P/assets/<name>.webp (+ _blink) and P/assets/meta.json. New poses via GPT-image-2 (${S}/tools/imagegen.md) are ${IMAGE_GEN ? 'ALLOWED for this run' : 'NOT allowed in this run: put each missing pose in "blocked" with the exact prompt as nextStep'}.`,
  ui: `Follow ${S}/references/capture.md: write a spec (node ${S}/tools/capture_ui.mjs --example prints one) and run node ${S}/tools/capture_ui.mjs --spec <spec.json> --out ${P}/assets/captures/ui; capture layers, not whole screens, on the reel-phone device at dpr 3, with textFree + rows for every text layer that types in; open sheet.png and the layers at full resolution.`,
  cli: `Follow ${S}/references/capture.md: python3 ${S}/tools/capture_cli.py --cmd "<command>" --out ${P}/assets/captures/term/<name>.cast [--cols 100 --rows 30]. Real runs only, in a clean environment (--clean-env); then python3 ${S}/tools/capture_cli.py scan <cast> must report no secrets or personal data.`,
  pdf: `Follow ${S}/references/capture.md: python3 ${S}/tools/pdf_figures.py <paper.pdf> --out ${P}/assets/captures/pdf --style ${P}/style.json --sheet ; keep figure numbers and captions in the sidecars.`,
  web: `Follow ${S}/references/capture.md and ${S}/references/tone-and-manner.md (source_snapshot.mjs / capture_ui.mjs): fixed viewport, banners hidden, light/dark as in the source.`,
  native: `Follow ${S}/tools/capture_native.md (macOS window capture); no private data on screen.`,
  photo: 'Photos come only from the client (P/source). If one is missing, put it in "blocked" with what to ask the client for.',
  data: 'Extract the real numbers into P/assets/data/<name>.json, each value with a "source" field (file, table, or run) and unit.',
}
const assetsPrompt = (kind, list) => `${RULES}
ROLE: assets (${kind}). You own only the files these assets produce under ${P}/assets/.
Assets (JSON): ${JSON.stringify(list)}
Read ${S}/references/visual-sources.md sections 6 and 8 (honesty and readiness). ${KIND_HOWTO[kind] || KIND_HOWTO.data}
Check every produced file (open images at full resolution). Return what you produced and what is blocked.`

const narrationPrompt = () => `${RULES}
ROLE: narration. You own P/narration.json (wording fixes only when a line breaks a rate cap), P/build/vo/, P/build/vo-timeline.json, P/build/vo-minbars.json, and the P/build/cut-*.json files that plan_cut.py rewrites.
Read ${S}/references/narration.md and follow its commands exactly (its section 9 steps that involve the user were done by the main session before this run).
Mode: ${TTS_DRY ? 'DRY RUN only: use --dry-run (placeholder clips of estimated length, no network).' : `LIVE Gemini TTS is allowed for this project. The key is BYOK (the user's own) and was set up before this run; getting it is the main session's job, never yours: never ask for, search for, open, print, or handle a key. First run python3 ${S}/narration/tts_gemini.py key status ${KEY_FLAGS} and then python3 ${S}/narration/tts_gemini.py key check ${KEY_FLAGS}. If either exits non-zero, do not look for another key (no .env files, shell history, dotfiles or configs, and no --env-file / --api-key-env beyond the flags given here): run every tts_gemini.py command with --dry-run instead and set keyMissing true. Otherwise pass ${KEY_FLAGS} to every tts_gemini.py command.`}
1. Check every line against the scene it belongs to and the rate caps. 2. Synthesize (batch), then verify and audit${TTS_DRY ? ' (skipped in dry run)' : ''}. 3. Build the VO timeline and minBars. 4. Re-plan every cut (${CUTLIST}) with python3 ${S}/timing/plan_cut.py --project ${P} --cut <cut> --vo ${P}/build/vo-minbars.json.`

const buildPrompt = (id) => `${RULES}
ROLE: scene builder for "${id}". You own only ${P}/scenes/${id}.js.
Read in order: ${S}/references/engine-api.md; ${S}/references/motion-recipes.md; ${S}/references/multi-agent.md section 2; ${P}/STORYBOARD.md sections 1-5 and the section for "${id}"; ${P}/style.json; ${P}/build/cut-<cut>.json for cuts ${CUTLIST} (your t0/t1 and neighbours); ${P}/assets/meta.json and ${P}/assets/captures/ when the storyboard uses them.
${SCENE_CONTRACT}
Build "${id}" exactly as storyboarded: verbatim copy, the planned carriers, beat choreography for the in-phase, the hold plan with secondary beats on bar lines, the out-phase hand-off. Quality bar: designed easing, springs and overshoot from style.motion, staggered reveals, contact shadows and depth, every beat lands, nothing static for more than 0.5 s.
Verify before returning, in every cut: ${stillsCmd('<cut>', '<t0-0.5>:<t1+0.5>:0.25', P + '/build/stills/' + id + '/<cut>')} (t0/t1 from that cut's plan), then the scene alone at minBars and at maxBars: node ${S}/runtime/stills.mjs --project ${P} --cut ${MAIN} --scene ${id} --dur <seconds> --out ${P}/build/stills/${id}/elastic --sheet. Zero console errors (stills.mjs exits 1 on any). Open the full-resolution PNGs, not only a sheet. Never re-run plan_cut.py without --no-write: the cut files are shared.
Do not edit shared files: return cue, asset, or config changes in "requests". "notes" must tell a fixer how the scene is organized (functions, timing constants, buffers).`

const reviewPrompt = (id, round, prev) => `${RULES}
ROLE: independent reviewer for scene "${id}", round ${round}. Read-only except your stills under ${P}/build/review/${id}/r${round}/.
Follow the reviewer rubric in ${S}/references/multi-agent.md section 4 exactly. Assume nothing works and never reuse the builder's stills.
Inputs: ${P}/STORYBOARD.md (copy rules and the section for "${id}"), ${P}/style.json, ${P}/build/cut-*.json, ${P}/scenes/${id}.js.
Render every 0.2 s over [t0 - 0.5, t1 + 0.5] in each cut (${CUTLIST}): ${stillsCmd('<cut>', '<a>:<b>:0.2', P + '/build/review/' + id + '/r' + round + '/<cut>')}; add the boundary, hold and cue frames from python3 ${S}/timing/plan_cut.py --project ${P} --cut <cut> --times all --no-write -q, and the scene alone at minBars and maxBars (stills.mjs --scene ${id} --dur <seconds>). Open full-resolution frames for every boundary, every cue, three hold samples, and every frame where a line of copy completes. Diff visible strings against STORYBOARD.md verbatim, grep the scene file for banned wording, and render one time twice in separate runs to compare bytes.
${prev ? 'Defects from the previous round (confirm each is really fixed and look for regressions around them): ' + JSON.stringify(prev) + '\n' : ''}Verdict "pass" only with zero high and zero medium defects. Each defect: scene "${id}", cut, t, evidence frame path, concrete code-level fix.`

const fixPrompt = (id, defects, notes, tag) => `${RULES}
ROLE: scene fixer for "${id}" (${tag}). You own only ${P}/scenes/${id}.js.
${SCENE_CONTRACT}
Builder notes: ${notes || '(none: read the file first and map its structure)'}
Fix every high and medium defect below; fix low ones when cheap and safe. Keep what works; do not rewrite the scene from scratch.
Defects (JSON): ${JSON.stringify(defects)}
Then re-render each defect time and its neighbours (+-0.5 s) in every affected cut, plus the shortest and the longest cut over the whole scene at 0.5 s steps (${stillsCmd('<cut>', '<a>:<b>:0.5', P + '/build/stills/' + id + '/fix')}); zero console errors; open the frames. Return cue, asset, or config needs in "requests".`

const audioBuildPrompt = () => `${RULES}
ROLE: audio. You own ${P}/build/music-<cut>.* (and stems). Read ${S}/references/audio.md and ${P}/style.json "sound".
For each cut in ${CUTLIST}: python3 ${S}/audio/arrange.py --project ${P} --cut <cut> ; then python3 ${S}/audio/verify_sync.py --wav ${P}/build/music-<cut>.wav --cut ${P}/build/cut-<cut>.json
Measure loudness and true peak (python3 ${S}/audio/synth.py loudness <wav>; -14 LUFS integrated, <= -1 dBTP). Render a spectrogram with the scene boundaries marked (python3 ${S}/audio/synth.py spectrogram <wav> --out <png> --marks <t0,t1,...>) and look at it: sections follow the planned music parts and the energy curve; the ending rings out; no clicks at section joins.
Cue names must exist in the SFX library (python3 ${S}/audio/synth.py list); return unknown or mistimed cues as "requests" (kind "cue", scene = the scene id).`

const audioReviewPrompt = (round, prev) => `${RULES}
ROLE: independent audio reviewer, round ${round}. Read-only except ${P}/build/review/audio/r${round}/.
Re-run python3 ${S}/audio/verify_sync.py for every cut (${CUTLIST}); measure loudness and true peak yourself (python3 ${S}/audio/synth.py loudness); render spectrograms with boundary marks (python3 ${S}/audio/synth.py spectrogram ... --marks) around every section join and scene boundary from ${P}/build/cut-<cut>.json and look at them.
Check: every cue within one frame; sections and energy follow the music parts per scene; SFX family and density fit style.sound (not every motion needs a sound); no clicks, clipping, or abrupt endings; same BPM in every cut.
${prev ? 'Previous defects (confirm the fixes): ' + JSON.stringify(prev) + '\n' : ''}Defects use scene "audio", category "audio" (or "timing"), cut, t, evidence path, concrete fix.`

const audioFixPrompt = (defects, notes, tag) => `${RULES}
ROLE: audio fixer (${tag}). You own ${P}/build/music-<cut>.* only. Read ${S}/references/audio.md.
Notes from the audio build: ${notes || '(none)'}
Fix every high and medium defect (JSON): ${JSON.stringify(defects)}
Re-run arrange.py and verify_sync.py for every affected cut and re-measure loudness. Cue changes that need reel.config.json go to "requests".`

const draftPrompt = () => `${RULES}
ROLE: draft render. You own only ${P}/build/draft/.
Every scene has a first build; reviews are still running, so other agents may be editing scene files: render whatever is on disk now.
node ${S}/runtime/render.mjs --project ${P} --cut ${MAIN} --out ${P}/build/draft/${SLUG}-${MAIN}-draft.mp4 --audio ${P}/build/music-${MAIN}.m4a --workers ${Math.max(1, Math.floor(WORKERS / 2))}
(If the music file is missing, render without --audio and say so.) Then a one-frame-per-second sheet: ${stillsCmd(MAIN, '0:<duration>:1', P + '/build/draft/sheet')} --sheet
Check with ffprobe that frames = fps x duration. Return the paths.`

const integratePrompt = (requests) => `${RULES}
ROLE: integrator (config, cut plans, final audio). You own ${P}/reel.config.json and ${P}/build/ except the stills and review folders.
Requests from scene and audio agents (JSON): ${JSON.stringify(requests)}
1. Apply each cue or config request that fits the beat grid, STORYBOARD.md and the SFX library; reject the rest with a reason. Asset requests: produce what you can per ${S}/references/visual-sources.md section 8 (image generation ${IMAGE_GEN ? 'allowed' : 'NOT allowed'}); otherwise reject with the next step.
2. Re-plan every cut (${CUTLIST}): python3 ${S}/timing/plan_cut.py --project ${P} --cut <cut>${VO_OK ? ' --vo ' + P + '/build/vo-minbars.json' : ''}
3. Final audio per cut: python3 ${S}/audio/arrange.py --project ${P} --cut <cut>${VO_OK ? ' (the music-only song), then the unmastered bed python3 ' + S + '/audio/arrange.py --project ' + P + ' --cut <cut> --stem (writes music-<cut>-stem.wav beside the song), then the ducked VO mix and captions exactly as in ' + S + '/references/narration.md (mix_vo.py picks the stem; captions.py)' : ''}; python3 ${S}/audio/verify_sync.py --wav <final wav or mix> --cut ${P}/build/cut-<cut>.json ; loudness -14 LUFS (+-1), true peak <= -1 dBTP.${VO_PLACEHOLDER ? ' The narration is a placeholder (TTS dry run): its mix and captions are placeholders that render.mjs/build.mjs refuse. Deliver music-only cuts: set "captions": {"enabled": false} in reel.config.json, never pass --allow-placeholder, and say so in "issues".' : ''}
Return per-cut numbers; "audio" = the m4a for the MP4, "embedAudio" = the smaller m4a for the HTML when one exists.`

const boundaryPrompt = (cut) => `${RULES}
ROLE: integrator boundary check for cut "${cut}". Read-only except ${P}/build/review/boundaries/${cut}/.
Render every boundary: node ${S}/runtime/stills.mjs --project ${P} --cut ${cut} --transitions --out ${P}/build/review/boundaries/${cut} --sheet (window edges, one frame either side), plus the cue frames from python3 ${S}/timing/plan_cut.py --project ${P} --cut ${cut} --times cues --no-write -q. Open every frame at full resolution.
Look for pops, doubled or missing elements, shared elements that do not match across the cut, brightness jumps that are not an intended flash, an empty stage seen through a zoomInto/portalFlash window, HUD or caption discontinuity, text cut off by a transition, visuals that miss their cue.
Attribute each defect to the scene id whose code draws the faulty element; use "config" when a transition type or inParams in reel.config.json is wrong and "compositor" for a runtime bug.`

const configFixPrompt = (defects, tag) => `${RULES}
ROLE: integrator fixer (${tag}). You own ${P}/reel.config.json and ${P}/build/ (plans and audio).
Defects not owned by a single scene (JSON): ${JSON.stringify(defects)}
Fix what reel.config.json can fix (transition type, inParams, inBeats/outBeats, cues, bars), re-plan the affected cuts, regenerate their audio, and verify sync. A runtime (compositor) bug cannot be fixed here: list it in notFixed with a minimal reproduction (cut, t, transition).`

const renderPrompt = (tag, posterHint) => `${RULES}
ROLE: integrator (renders and deliverables, ${tag}). You own ${P}/dist/ and ${P}/build/.
Read ${S}/references/render-pipeline.md first.
Poster frame: ${posterHint}. In other cuts use the same scene at the same local time (from each cut's plan).
1. Per cut in ${CUTLIST}: node ${S}/runtime/render.mjs --project ${P} --cut <cut> --out ${P}/dist/${SLUG}-<cut>-v${VERSION}.mp4 --workers ${WORKERS} --poster <poster time in that cut> --share (audio defaults to the narrated mix, else the music; stems and placeholder mixes are never picked; pass --audio only to override)
2. node ${S}/runtime/build.mjs --project ${P} --cuts ${CUTS.join(',')} --out ${P}/dist/${SLUG}-v${VERSION}.html --verify (audio per cut defaults to the 96k -embed copy of the mix, else of the music; --verify boots the file alone in an empty folder)
2b. python3 ${S}/tools/motion_qa.py --video <each MP4> --cut ${P}/build/cut-<cut>.json : no frozen run > 0.5 s, no unexplained one-frame pop, no near-static hold.
3. Checks, one entry each in "checks": ffprobe frames = fps x duration per cut; loudness and true peak per MP4 (python3 ${S}/audio/synth.py loudness); verify_sync.py per cut; build.mjs --verify passed (the HTML alone in an empty folder renders every cut, decodes fonts, images and audio, zero console errors; spot-check frames with node ${S}/runtime/stills.mjs --html <copy> --cut <cut> <times> --out <dir>); grep -nE '(src|href)="(https?:)?//|src="[^d]' on the HTML finds nothing; grep -nE 'Math\\.random|Date\\.now|performance\\.now|new Date' ${P}/scenes/*.js finds nothing; captions parse when narrated; covers and share copies exist.
Never overwrite a delivered file: if this version already exists in P/dist, bump the patch version and say so in "issues".${VO_PLACEHOLDER ? '\nThe narration is a placeholder (TTS dry run): deliver music-only cuts with captions off (the integrator set reel.config.json "captions": {"enabled": false}); never pass --allow-placeholder. If render.mjs or build.mjs still refuses placeholder captions, report it in "issues" instead of forcing it.' : ''}`

const finalReviewPrompt = (cut, round, prev) => `${RULES}
ROLE: whole-reel reviewer for cut "${cut}", round ${round}. Read-only except ${P}/build/review/reel/${cut}/r${round}/.
Read ${P}/STORYBOARD.md sections 1-2 first. Watch the cut as the audience will: render stills every 0.5 s over the whole cut (node ${S}/runtime/stills.mjs --project ${P} --cut ${cut} --range 0:<duration>:0.5 --out ${P}/build/review/reel/${cut}/r${round} --sheet) plus the boundaries (--transitions), open them in order at full resolution, and read the cue list in ${P}/build/cut-${cut}.json. Watch the rendered MP4 frames when they exist.
Check: the one sentence, one scene and one message land; order and pacing; continuity across every boundary; copy verbatim and no banned wording; disclaimers legible for >= 2 s where required; every number traceable; computed-vs-authored credits; one frame per carrier across the reel; energy follows the music parts; captions in sync and never over disclaimers; nothing static > 0.5 s; the last frame holds.
${prev ? 'Previous-round defects (confirm the fixes): ' + JSON.stringify(prev) + '\n' : ''}Rubric and defect format: ${S}/references/multi-agent.md section 4. Attribute each defect to the scene id whose code must change, or "audio", "config", "compositor".`

// ───────── 1. Tone ─────────
phase('Tone')
let tone = null
if (A.styleApproved === true) {
  log('Tone: style.json approved by the user; skipping the tone pass.')
} else {
  tone = await agent(tonePrompt(null), { label: 'tone pass', schema: TONE })
  if (!tone) throw new Error('Tone pass failed: no style.json, nothing downstream can run.')
  const critic = await agent(toneCriticPrompt(), { label: 'tone critic', schema: CRITIC })
  if (critic && critic.verdict === 'revise' && critic.edits.length) {
    tone = (await agent(tonePrompt(critic.edits), { label: 'tone revise', schema: TONE })) || tone
  }
  log(`Tone: ${tone.theme}, ${tone.bpm} BPM, mood ${tone.mood.join(' / ')}; carriers ${tone.visualSources.join(', ')}.`)
}

if (STOP_AFTER === 'tone') {
  log('Stopped after the tone pass (stopAfter: "tone"): show the user P/build/style-board.png, then re-run with styleApproved: true.')
  return { stoppedAfter: 'tone', style: tone ? tone.styleJson : P + '/style.json', board: tone && tone.board ? tone.board : P + '/build/style-board.png' }
}

// ───────── 2. Storyboard ─────────
phase('Storyboard')
let sb = await agent(A.storyboardApproved === true ? storyboardReadPrompt() : storyboardPrompt(null), { label: 'storyboard', schema: STORYBOARD })
if (!sb) throw new Error('Storyboard failed: no STORYBOARD.md / reel.config.json.')
if (A.storyboardApproved !== true) {
  const critic = await agent(storyboardCriticPrompt(), { label: 'storyboard critic', schema: CRITIC })
  if (critic && critic.verdict === 'revise' && critic.edits.length) {
    sb = (await agent(storyboardPrompt(critic.edits), { label: 'storyboard revise', schema: STORYBOARD })) || sb
  }
}
const SCENE_IDS = Array.isArray(A.scenes) && A.scenes.length ? A.scenes.map(String) : sb.scenes.map((s) => s.id)
if (!SCENE_IDS.length) throw new Error('Storyboard returned no scenes.')
const POSTER = sb.poster ? `cut ${sb.poster.cut}, t = ${sb.poster.t} s` : 'see STORYBOARD.md section 1 ("one scene")'
log(`Storyboard: ${SCENE_IDS.length} scenes (${SCENE_IDS.join(', ')}); cuts ${sb.cuts.map((c) => c.cut + '=' + c.bars + ' bars').join(', ')}.`)
if (STOP_AFTER === 'storyboard') {
  log('Stopped after the storyboard (stopAfter: "storyboard"): review STORYBOARD.md and the cut plans with the user, then re-run with styleApproved and storyboardApproved: true.')
  return { stoppedAfter: 'storyboard', storyboard: sb.storyboard, config: sb.config, scenes: SCENE_IDS, cuts: sb.cuts }
}

// ───────── 3. Assets and narration (independent of each other) ─────────
const missing = sb.assets.filter((a) => a.status === 'missing')
const byKind = {}
for (const a of missing) (byKind[a.kind] = byKind[a.kind] || []).push(a)
const [assetResults, narration] = await parallel([
  () => parallel(Object.keys(byKind).map((kind) => () =>
    agent(assetsPrompt(kind, byKind[kind]), { label: `assets ${kind}`, phase: 'Assets', schema: ASSETS_DONE }))),
  () => (NARRATION ? agent(narrationPrompt(), { label: 'narration', phase: 'Narration', schema: NARR }) : Promise.resolve(null)),
])
VO_OK = NARRATION && !!narration
VO_PLACEHOLDER = VO_OK && (TTS_DRY || narration.mode === 'dry-run' || narration.keyMissing === true)
const blocked = (assetResults || []).filter(Boolean).flatMap((r) => r.blocked.map((b) => `${r.kind}:${b.name}: ${b.reason} -> ${b.nextStep}`))
if (missing.length) log(`Assets: ${missing.length} requested, ${blocked.length} blocked.`)
if (NARRATION) log(narration ? `Narration: ${narration.mode}${narration.keyMissing ? ' (no usable key: dry run)' : ''}, ${narration.lines} lines, ${narration.minBarsRaised.length} scenes lengthened.` : 'Narration: FAILED; continuing without VO.')

// ───────── 4. Build -> review -> fix (draft render released when every first build lands) ─────────
const ITEMS = SCENE_IDS.map((id) => ({ kind: 'scene', id })).concat([{ kind: 'audio', id: 'audio' }])
const NOTES = {}
let built = 0
let releaseDraft = null
const allBuilt = new Promise((resolve) => { releaseDraft = resolve })

async function buildStage(prev, original) {
  const item = original && typeof original === 'object' ? original : prev
  try {
    const r = await agent(item.kind === 'audio' ? audioBuildPrompt() : buildPrompt(item.id), { label: `build ${item.id}`, phase: 'Build', schema: BUILD })
    if (r) NOTES[item.id] = r.notes
    return r
  } finally {
    built += 1
    if (built === ITEMS.length) releaseDraft()
  }
}

async function reviewStage(first, item) {
  if (!first) return { item: item.id, status: 'build-failed', rounds: 0, open: [], requests: [] }
  const requests = [...first.requests]
  let prev = null
  for (let round = 1; round <= ROUNDS; round++) {
    const rev = await agent(item.kind === 'audio' ? audioReviewPrompt(round, prev) : reviewPrompt(item.id, round, prev),
      { label: `review ${item.id} r${round}`, phase: 'Review', schema: REVIEW })
    if (!rev) return { item: item.id, status: 'review-failed', rounds: round, open: prev || [], requests }
    const open = rev.defects.filter((d) => d.severity !== 'low')
    if (rev.verdict === 'pass' && !open.length) return { item: item.id, status: 'pass', rounds: round, open: [], requests }
    const fx = await agent(item.kind === 'audio' ? audioFixPrompt(rev.defects, NOTES.audio, `round ${round}`) : fixPrompt(item.id, rev.defects, NOTES[item.id], `round ${round}`),
      { label: `fix ${item.id} r${round}`, phase: 'Review', schema: FIX })
    if (fx) { requests.push(...fx.requests); NOTES[item.id] = `${NOTES[item.id] || ''}\nround ${round} fix: ${fx.notes}` }
    prev = open
  }
  return { item: item.id, status: 'fixed-unreviewed', rounds: ROUNDS, open: prev || [], requests }
}

const [results, draft] = await parallel([
  () => pipeline(ITEMS, buildStage, reviewStage),
  async () => { await allBuilt; return agent(draftPrompt(), { label: `draft ${MAIN}`, phase: 'Build', schema: DRAFT }) },
])
const itemResults = (results || []).filter(Boolean)
if (draft) log(`Draft: ${draft.mp4}`)
log(`Scenes: ${itemResults.map((r) => r.item + '=' + r.status).join(', ')}`)

// ───────── 5. Integrate ─────────
async function fixRouted(defects, tag) {
  const groups = {}
  for (const d of defects) {
    const key = SCENE_IDS.includes(d.scene) || d.scene === 'audio' ? d.scene : 'config'
    ;(groups[key] = groups[key] || []).push(d)
  }
  const out = await parallel(Object.keys(groups).map((key) => () => {
    const list = groups[key]
    if (key === 'audio') return agent(audioFixPrompt(list, NOTES.audio, tag), { label: `fix audio ${tag}`, phase: 'Final review', schema: FIX })
    if (key === 'config') return agent(configFixPrompt(list, tag), { label: `fix config ${tag}`, phase: 'Final review', schema: FIX })
    return agent(fixPrompt(key, list, NOTES[key], tag), { label: `fix ${key} ${tag}`, phase: 'Final review', schema: FIX })
  }))
  return out.filter(Boolean)
}

phase('Integrate')
const requests = itemResults.flatMap((r) => r.requests || [])
const integ = await agent(integratePrompt(requests), { label: 'integrate', schema: INTEGRATE })
const sweeps = await parallel(CUTS.map((cut) => () => agent(boundaryPrompt(cut), { label: `boundaries ${cut}`, phase: 'Integrate', schema: SWEEP })))
const seamDefects = sweeps.filter(Boolean).flatMap((s) => s.defects).filter((d) => d.severity !== 'low')
if (seamDefects.length) {
  log(`Boundaries: ${seamDefects.length} defects; routing to owners.`)
  await fixRouted(seamDefects, 'boundaries')
}
let render = await agent(renderPrompt('first full render', POSTER), { label: 'render', schema: RENDER })

// ───────── 6. Final review ─────────
phase('Final review')
let finalOpen = []
let finalClean = false
let prevFinal = null
for (let round = 1; round <= ROUNDS; round++) {
  const reviews = await parallel(CUTS.map((cut) => () =>
    agent(finalReviewPrompt(cut, round, prevFinal), { label: `final ${cut} r${round}`, phase: 'Final review', schema: SWEEP })))
  finalOpen = reviews.filter(Boolean).flatMap((r) => r.defects).filter((d) => d.severity !== 'low')
  if (!finalOpen.length) { finalClean = reviews.every(Boolean); break }
  log(`Final review r${round}: ${finalOpen.length} defects; fixing.`)
  await fixRouted(finalOpen, `final r${round}`)
  render = (await agent(renderPrompt(`re-render after final review round ${round}`, POSTER), { label: `render r${round + 1}`, phase: 'Final review', schema: RENDER })) || render
  prevFinal = finalOpen
}
if (!finalClean && finalOpen.length) log(`Final review: fixes for ${finalOpen.length} defects applied in the last round are not re-reviewed.`)

const failedChecks = render ? render.checks.filter((c) => !c.pass).map((c) => `${c.name}: ${c.detail}`) : ['render failed']
const openIssues = []
  .concat(itemResults.filter((r) => r.status !== 'pass').map((r) => `${r.item}: ${r.status}${r.open.length ? ' (' + r.open.length + ' open defects)' : ''}`))
  .concat(blocked)
  .concat(narration ? narration.issues : [])
  .concat(integ ? integ.issues : ['integration failed'])
  .concat(finalClean ? [] : finalOpen.map((d) => `fixed in the last round, not re-reviewed: ${d.scene} @${d.cut} t=${d.t}: ${d.problem}`))
  .concat(failedChecks)
  .concat(render ? render.issues : [])
if (tone && tone.narrationRecommended && !NARRATION) openIssues.push('Tone pass recommends narration; rerun with narration: true to add it.')
if (VO_PLACEHOLDER) {
  openIssues.push(TTS_DRY
    ? 'Narration ran as a TTS dry run (liveTts not set): the cuts ship music-only. For the real voice, have the user set up their own Gemini key (BYOK, references/narration.md section 9), confirm key status / key check in the main session, then re-run with liveTts: true.'
    : 'Narration fell back to a dry run: no usable Gemini key (BYOK). Have the user set up their own key (references/narration.md section 9), confirm key status / key check in the main session, then re-run with liveTts: true.')
}

return {
  project: P,
  cuts: CUTS,
  mainCut: MAIN,
  scenes: SCENE_IDS,
  tone: tone ? { theme: tone.theme, bpm: tone.bpm, mood: tone.mood } : 'approved',
  narration: NARRATION ? (narration ? narration.mode : 'failed') : 'off',
  draft: draft ? draft.mp4 : null,
  deliverables: render ? { mp4: render.mp4, html: render.html, covers: render.covers || [], captions: render.captions || [] } : null,
  audio: integ ? integ.cuts : null,
  checks: render ? render.checks : [],
  openIssues,
}
