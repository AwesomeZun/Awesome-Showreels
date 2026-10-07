# Capture: real UI, real terminals, real figures

Real captures are the proof carriers of a reel: the app exists, the command runs, the paper says so. This file is the
how-to for every capture source, the API of `runtime/term.js` (`window.Term`) and `runtime/quad.js` (`window.Quad`),
and the provenance rules. Which carrier a scene needs is decided in `visual-sources.md`; animation recipes that use
these captures are in `motion-recipes.md` (sections "Real UI in a device" and "Tilted terminal + zoom to line").

| Source | Tool | Lands in `P/assets/captures/` | Drawn with |
|---|---|---|---|
| Web / web-app UI (phone, tablet, desktop) | `tools/capture_ui.mjs --spec spec.json` | `ui/<name>/*.png` + `<step>.json` + `layers.json` | `drawImage` at the sidecar rect; `Quad.drawPanel` when tilted |
| Terminal / CLI | `tools/capture_cli.py --cmd "..." --out ...` | `term/<name>.cast` + `.screen.txt` + `.json` | `Term.get(...)` -> `player.draw(...)` |
| Papers, slide decks | `tools/pdf_figures.py paper.pdf --out ...` | `pdf/<doc>/*.png` (+ `.dark.png`) + `.json` + `figures.json` | `drawImage` / paper card / `Quad.drawPanel` |
| Native apps, simulators, devices | `tools/capture_native.md` (+ `capture_ui.mjs --textfree`) | `ui/<screen>/` with hand-written sidecars | as web UI |
| Web shots (sites, docs, README) | `capture_ui.mjs` with a desktop device | `ui/<site>/` | browser frame in vector |

The runtime loads everything under `P/assets/captures/`: images become `IMG['captures/ui/app/bubble']` (path without
extension) and `ASSETS['captures/ui/app/bubble.png']`; `.json` is parsed (`ASSET('captures/ui/app/layers.json')`);
`.cast`/`.txt` arrive as text. `build.mjs` inlines all of it (cast text also feeds the font subset).

## 1. Capture or recreate?

Capture when the claim is "this is real": the product's own screens, the command's own output, the paper's own
figure. Recreate in vector when the thing does not exist yet, when it must be re-laid-out (translated copy, a
simplified diagram), when only a few numbers matter (re-plot them from the source table and say so), or when the
capture would carry private data. Most strong scenes are hybrids: real layers + vector frame, cursor, highlights,
callouts and typed reveals of the real text.

Readability: text the viewer must read needs ~18 px or more on screen at 1080p for the time it is shown (one word per
~0.25 s, never less than 1.2 s per line). Dense UI or 120-column logs are texture: zoom to the region that matters
(`zoomPose`, `focusPose`) and put the takeaway in kinetic type.

## 2. Web and web-app UI: `capture_ui.mjs`

One JSON spec drives one page through steps and captures **layers** (base screen, each bubble/card, each component
state, timed sequences), not finished screens. `node tools/capture_ui.mjs --example` prints an annotated spec.

```json
{
  "name": "app", "url": "https://app.example.com/chat", "out": "../assets/captures/ui/app",
  "device": "reel-phone", "locale": "ko-KR", "timezone": "Asia/Seoul", "colorScheme": "light",
  "fixedTime": "2026-10-07T18:02:00+09:00", "wait": {"until": "networkidle", "settle": 800},
  "hide": ["#cookie-banner", ".chat-widget"], "block": ["**/analytics/**"],
  "steps": [
    {"do": "shot", "name": "welcome"},
    {"do": "click", "text": "예시 질문 보기"},
    {"do": "wait", "selector": ".card", "state": "visible"},
    {"do": "record", "name": "progress", "selector": ".card", "until": "stable:6", "pad": 24},
    {"do": "states", "name": "steps", "selector": ".card", "count": 6, "pad": 24,
     "js": "(el, k) => el.querySelectorAll('.steps li').forEach((li, i) => { li.className = i < k ? 'done' : i === k ? 'on' : '' })"},
    {"do": "layer", "name": "bubble", "selector": ".msg.user .bubble", "nth": -1, "textFree": true, "rows": true},
    {"do": "hide", "id": "msgs", "selector": ".msg, .card"},
    {"do": "shot", "name": "base"},
    {"do": "show", "id": "msgs"}
  ]
}
```

Top-level keys: `url` (absolute, or a path with `serve`), `serve` (local folder served at `http://capture.local/`, so
fonts and fetches work without file:// CORS), `out` (relative to the spec), `device` (preset or object), `viewport`
(override), `locale`, `timezone`, `colorScheme`, `fixedTime` (Date is pinned, timers keep running), `wait`
(`until`, `timeout`, `settle` ms), `css` (injected after load), `hide` (selectors set `visibility:hidden`),
`block` (URL patterns aborted), `cookies`, `localStorage` (set before the page's scripts), `init` (JS run before the
page's scripts), `webp` (also write WebP copies; quality), `keepGoing`.

**Devices** (CSS px; viewport = screen minus the status bar and home indicator the reel draws; dpr 3 leaves zoom room):

| preset | screen | status bar | dpr | note |
|---|---|---|---|---|
| `reel-phone` | 412x872 | 44 | 3 | matches engine `PHONE` at 1080p (440x900, inset 14): viewport 412x828 |
| `iphone` / `iphone-pro-max` / `iphone-se` | 393x852 / 440x956 / 375x667 | 54 / 62 / 20 | 3 | iOS Safari UA |
| `android` | 412x915 | 28 | 3 | Chrome Android UA |
| `ipad` | 820x1180 | 24 | 2 | |
| `laptop` / `desktop` / `desktop-hd` | 1280x800 / 1440x900 / 1920x1080 | 0 | 2 | web shots, desktop web apps |

Custom: `"device": {"screen": [w, h], "statusBar": 44, "homeIndicator": 0, "dpr": 3, "mobile": true, "touch": true,
"ua": "ios"}`. Draw the device in vector so its screen is exactly `screen` reel px (1 CSS px = 1 reel px).

**Steps** (`do`): `goto {url}` · `wait {ms | selector,state | text | fn | network}` · `click {selector | text | role,
nth}` · `hover` · `fill {selector, value}` · `type {selector, value, delay}` (real keystrokes) · `press {key}` ·
`scroll {y | to, within}` · `eval {js}` · `css {css, id}` / `uncss {id}` · `hide {selector, id}` / `show {id}` ·
`stopApp` (clears timers, rAF and network: freezes the DOM as it is) · `freeze {selector, as}` (static clone; later
steps target it as `"@as"`) · `shot {name, full}` (viewport or full page) · `layer {name, selector, nth, all, pad,
alpha, textFree, rows}` · `states {name, selector, count | list, js, settle, clone, pad, keep}` · `record {name, selector,
every, ms, until, dedupe, pad, trigger}` · `scrollShots {name, step, max, within}` · `text {name, selector}` (innerText)
· `dom {name}` (HTML). Any step may set `optional: true` and `note`.

- `layer` captures the element's box (plus `pad` px, clamped to the viewport). `alpha: true` isolates it (everything
  else hidden, page background transparent): the element's own drop shadow survives as alpha, so floating cards
  composite over any background. `all: true` captures every match (`name_0`, `name_1`, ...).
- `rows: true` measures each text line from the DOM (per-character client rects): `rows: [{x0, x1, y0, y1, text, cx}]`
  in CSS px of the captured image, `cx` = right edge of every character (spaces included) for character-accurate
  typing. `textFree: true` (DOM mode) re-shoots the element with its text made transparent (exact background, emoji
  removed too), writes `<name>.textfree.png`, `<name>.mask.png` (the text pixels) and `<name>.rows.png` (QA overlay);
  `textFree: "inpaint"` rebuilds the background from the raster instead (text drawn in canvas or images). Text-free
  plates need `opencv-python`; everything else in the tool needs numpy and Pillow only.
- `states` sets each state with `js(el, k)` on a **static clone** (cloned, inserted after the original, original
  hidden, the clone's animations and transitions off), so app timers cannot race the state changes. Never pause CSS
  animations to freeze a state: entrance animations freeze at opacity 0 and the capture comes out blank. After the
  step the clone is removed and the original shown again, so later steps find the live element; `"keep": true` leaves
  the clone in place for later steps that target it as `"@<as>"`.
- `record` captures the **real** sequence of states with the app's own timing: a frame whenever the element's DOM
  changes (CSS spinners do not count), shot after its finite animations/transitions settle, stamped with the time the
  change was seen. `until`: `stable:N` (N quiet polls), `gone`, `selector:<css>`; `dedupe: "pixels"` for canvas UIs.
  Its json (`frames: [{file, t, rect, screen}]`) is the timing reference; scenes may compress it, and say so if timing
  is a claim. Start the action with `record.trigger` (a step object, e.g. `{"do": "click", "selector": "#send"}`) so
  it fires inside the recording: a separate `click` step settles for 300 ms and the first state can pass unseen.

**Outputs.** Per step `<name>.png` (+ `_k` for states/all/record frames) and `<name>.json`; `layers.json` indexes the
run (device, viewport, statusBar, dpr, url, capturedAt, every layer); `sheet.png` is a contact sheet. The recorded
`url` never ships a local path or a token: a `file:` page is recorded relative to the spec, a served one as
`(served)/path`, and a web URL keeps its origin, path and query parameter names only. Layer fields:

| field | meaning |
|---|---|
| `screen` {x, y, w, h} | where the captured image sits inside the device screen, CSS px; y includes the status bar |
| `rect`, `page` | the same in viewport and document coordinates |
| `element` | the element box inside the captured image (differs from the image when `pad` > 0) |
| `px`, `dpr` | image size in px (= CSS px x dpr) |
| `radius` [tl, tr, br, bl] | the element's border radii (clip with `ctx.roundRect(x, y, w, h, radius)`) |
| `rows`, `textFree`, `mask` | text rows and the text-free copy (see above) |
| `bg`, `color`, `font`, `text` | computed style and innerText (copy for captions; check it before quoting) |

**Placing layers** (phone screen origin `S` = top-left of the drawn screen, status bar drawn by the scene):

```js
const idx = ASSET('captures/ui/app/layers.json'), L = idx.layers;
const put = (name, alpha = 1) => { const l = L[name]; withAlpha(ctx, alpha, () =>
  ctx.drawImage(IMG['captures/ui/app/' + l.file.replace(/\.png$/, '')], S.x + l.screen.x, S.y + l.screen.y, l.screen.w, l.screen.h)); };
put('base'); put('bubble');
```

Typing from a real bubble, progress states and device frames: `motion-recipes.md` "Real UI in a device". Cross-fade
only the content band between screens (identical header/tab bar layers ghost otherwise).

**Pitfalls.** Capture at the final web-view size (re-scaling text rasters blurs them); keep `pad` large enough for
shadows (24 px) on cards you place over a different base; hide cookie banners and chat widgets; pin the clock and
locale; wait for fonts (done) and for images (`wait {network: true}`); a layer taller than the viewport is clipped
(use `shot {full: true}` or scroll inside); app re-renders can drop a clone (add `stopApp` before `states`).

**QA.** Look at `sheet.png` and every `*.rows.png` (boxes hug each line, mask covers the glyphs only). Recompose the
screen from its layers and difference it against a full `shot` of the same state at 1x: mean error should be about
1/255 (only glyph-edge resampling); a doubled image means a wrong rect.

## 3. Terminal: `capture_cli.py` + `term.js`

**Side effects first.** The command really runs, by default in the user's own folder. Capture in a throwaway copy
or a demo directory (`--cwd /tmp/demo-copy`), with demo credentials and data, and prefer the tool's own `--dry-run`
or demo mode. Ask the user before any command that deploys, publishes, pushes, migrates or deletes data, writes
outside that directory, or calls a paid API. `capture_cli.py` refuses commands that look like that (`git push`,
`npm publish`, `kubectl apply`, `terraform apply`, `rm -rf`, `sudo`, `<tool> deploy|publish|migrate|release` ...)
unless `--allow-side-effects` is passed, which you pass only after the user agreed.

**Record** a real run in a pseudo-terminal of the size the reel will show:

```bash
python3 tools/capture_cli.py --cmd "npm test" --out P/assets/captures/term/tests.cast --cols 92 --rows 26 \
  --key 'Tests:' --prompt '\e[38;5;111m~/app\e[0m \e[1;35m❯\e[0m ' --title 'npm test' --cwd /tmp/demo-copy
```

- Several `--cmd` run in sequence (fresh shell each; chain with `&&` for shared state). `--until REGEX` stops a
  server/watcher once its "ready" line appears (`--until-grace`), `--idle-exit S` after S quiet seconds,
  `--timeout`; `--send 'DELAY:TEXT'` types into interactive tools (`\r`, `\e`, `\x04`); `--cwd`, `--env K=V`,
  `--force-color` (FORCE_COLOR/CLICOLOR_FORCE for tools that colour only on a TTY they recognise); `--theme NAME` or
  `--theme '{"fg": ..., "bg": ..., "palette": "#..:#.."}'` stores the tool's own colours for `theme: 'cast'`.
  POSIX only (pty); on Windows record inside WSL.
- Outputs: `<name>.cast` (asciicast v2: exact bytes + timing; header `x_showreel.segments` tells term.js which echo to
  type), `<name>.screen.txt` (final buffer with scrollback), `<name>.json` (cmd, exit, signal, seconds, when, cols, rows,
  the number of env variables dropped, redactions, key lines with absolute line numbers, provenance). The prompt line before each
  command and the final ready prompt are synthesized (and say so); everything else is the program's output.
- **Secrets.** Secret-looking environment variables are dropped before the command runs (the sidecar keeps only
  their number; the names go to the console). The output, the command lines (echoed or `--no-echo`), `--title`, keys
  sent with `--send`, and the values of secret-looking variables (inherited, `--keep-env`, or `--env NAME=VALUE`)
  are scanned for key formats (OpenAI/Anthropic/GitHub/AWS/Google/Slack/Stripe/HF/npm tokens, JWTs, private keys,
  bearer tokens, URL credentials, `key=value` assignments); hits are masked with same-length dots (`--on-secret
  redact`, default; `fail` writes nothing). Home path, `user@`, the user name inside paths (`/Users/<name>`,
  flattened `-Users-<name>-`, `C:\Users\<name>`) and the host name become `~`, `user`, `host`; `--redact WORD[=REPL]`
  masks anything else; `--redact-emails`. Warnings never contain the values. Before shipping run `capture_cli.py
  scan <cast>`: it checks everything that ships (output and input events, the header's command, title and segments,
  the `.json` sidecar and `.screen.txt`) and exits 1 on a secret, the home path, the user name or the host name;
  `scan --fix` masks them in place.
- Check: `capture_cli.py screen <cast> [--at T] [--all]` (emulated screen; `--all` prints absolute line numbers),
  `capture_cli.py play <cast> [--speed 2 | --fit 6] [--idle-limit 0.5]`, `capture_cli.py retime` writes a re-timed copy.

**Play** it in a scene. Player time is the scene's local time (`env.lt`); everything is a pure function of it.

```js
const P = Term.get('tests', {                       // name, 'captures/term/tests.cast', raw cast text or a parsed cast
  theme: 'catppuccin-mocha',                        // the tool's own theme; omit -> derived from style.json
  fontSize: 21, res: 2.5, title: 'npm test', chrome: 'mac',
  play: Term.fitEnv(env, { lead: 0.9, hold: env.barSec, elide: [{ after: /Installing/, before: /added \d+ packages/ }] }),
});
const r = P.draw(ctx, env.lt, pose, { highlight, glow: { color: C.accent, a: 0.3 }, reflection: { a: 0.1 }, sheen: k });
```

`Term.get(ref, opts)` memoizes one player per (ref, opts) — call it inside `draw()` (assets load after scenes).

| option | default | meaning |
|---|---|---|
| `theme` | style-derived | THEMES name (`catppuccin-mocha/macchiato/frappe/latte`, `dracula`, `tokyo-night`, `one-dark`, `github-dark/light`, `solarized-dark/light`, `nord`, `gruvbox-dark`, `xterm`), `'cast'` (the recording's own colours: asciicast header theme, or the name given to `capture_cli.py --theme`), `'style'`, or an object `{base or variant: 'light', bg, fg, cursor, ansi[16], titleBar, titleFg, border, boldBright}` |
| `fontSize`, `lineHeight`, `font`, `weight`, `boldWeight` | 15, 1.32, `FAM.mono`, 400, 700 | cell metrics in panel px; the mono stack from style.json |
| `res` | 2 | texture px per panel px (2.5-3 for deep zooms) |
| `chrome` | `'mac'` | `'mac'` (traffic lights + centred title), `'bar'` (title left), `'none'`, or `{kind, title, height, lights: 'mono', font}` |
| `title`, `radius`, `pad`, `cols`, `rows`, `scrollback` | cast values, 14, [22, 16] | window details |
| `smoothScroll` | 0.12 | seconds for new lines to glide in (0 = jump like a real terminal) |
| `cursor` | `{blink: 0.53}` | `shape`: `'block'`, `'bar'` or `'underline'` overrides the cast's DECSCUSR |
| `scroll` | none | lines scrolled back, number or `t => n` (with `scrollNeeded`) |
| `play.at` | 0 | scene time of the first prompt |
| `play.typing` | `{cps: 26, jitter: 0.35, before: 0.25, after: 0.3}` | the echoed command is typed (deterministic jitter); `false` = instant |
| `play.idleLimit` | 0.8 | cap on recorded pauses (s) |
| `play.speed` / `play.fit` / `play.fitMode` | 1 / none / `'max'` | output rate; `fit` = scene time by which playback must end; `'max'` only speeds up, `'exact'` also slows down |
| `play.stream` | none | `{lps: 45}` spreads a burst of lines (re-timed, label if timing is claimed) |
| `play.elide` | none | `[{after, before}]` or `[{after, lines}]`: lines between are replaced by one dim `…` line |

`Term.fitEnv(env, {at | lead, hold, idleLimit, typing, speed, stream, elide})` fits playback between the in-phase and
a readable hold (default one bar) before the out-phase, never slower than recorded: longer cuts lengthen the hold.

Player members: `end`, `start`, `duration`, `speed` (applied output rate), `typed`, `size` ([w, h] panel px), `res`,
`cast` (`.meta` = the sidecar json), `texture(t, {highlight})` (canvas), `draw(ctx, t, pose, o)` (3D via quad.js;
returns `{map, quad, front, size, rect(box)}`), `drawFlat(ctx, t, x, y, {scale, alpha, shadow})`, `find(re, {t,
first})` -> `{line, col0, col1, text, match}` (absolute line; the last match unless `first`), `when(re)` -> scene time
it first appears, `box(line, t, {cols, pad})` -> [x0, y0, x1, y1] panel px or null when scrolled out, `scrollNeeded(line,
t)`, `zoomPose(base, box, k, {width, maxH, x, y, keep, ease})`, `cues()` -> typed keys and enters `[{t, kind}]` (SFX
candidates), `since(t)` (s since the last output), `progress(t)`, `text(t)` (visible text, for QA).

`highlight`: `{lines: [{line | find: RegExp, k, color, scan (0..1), cols: [c0, c1], pad, bar}], spot: {k, color,
lines}}` — drawn in texture space, so it tilts with the window; `spot` dims everything but the highlighted lines.

Helpers: `Term.giantWord(ctx, word, x, y, p, {size, weight, font, color, align, t, rgb, seed, track})` (decodes from
glyph noise with an RGB split; one per command, on the downbeat), `Term.glitch(ctx, src, amt, t, {x, y, w, h, split,
fps})` (RGB split + slice displacement of any canvas, e.g. a frame copy for an in-scene cut), `Term.dotGrid(ctx, t,
{step, size, color, a, drift})` (CC-statusline backdrop), `Term.theme(spec, style)`, `Term.themeFromStyle(style,
{variant})`, `Term.register(name, text)`, `Term.parse(text)` (asciicast v1/v2/v3 or raw ANSI), `Term.VT` (emulator).

Emulation covers what real CLIs print: cursor addressing, erase/insert/delete, scroll regions, alternate screen,
SGR 16/256/truecolor + bold/dim/italic/underline/inverse/strike, wide CJK and emoji, combining marks, DEC line drawing,
OSC titles, DECSCUSR. Block elements, box drawing, braille and powerline glyphs are drawn as shapes, so bars and
frames are seamless in any font. The style-derived theme keeps ANSI hues recognisable (red/green/yellow anchored to
`deny`/`ok`/`warn`, other slots to the nearest palette accent within 30 degrees) with every colour at >= 4.5:1.

**CC-statusline grammar** (one command per 1-2 bars): giant command word on beat 1 -> window flies in tilted (yaw
about -0.4, slight pitch and roll, slow drift) -> command types -> real output streams -> `when(keyRe)` -> camera
zooms to the key line (`zoomPose`), highlight scans it, `spot` dims the rest, `Quad.brackets` lock on -> hold (caret
blinks, a scan pass on each bar line) -> glitch or typing cut to the next command. Code: `motion-recipes.md` section
"Tilted terminal + zoom to line".

## 4. Perspective panels: `quad.js`

`Quad.drawQuad(ctx, src, [[x, y] TL, TR, BR, BL], o)` draws any image or canvas into a quadrilateral with a true
projective map: an adaptive per-axis grid of affine triangles (error < `tol` = 0.35 px), rendered into a buffer and
blitted once (so `alpha`, `filter`, `shadow` apply to the warped silhouette). It is seam-free and alpha-exact: opaque
textures use overlapping inner edges; translucent ones (`opaque: false`, or detected by the default `'auto'` probe)
use a matte path (`dst * (1 - a)` then `+ colour`) that needs an opaque destination (scene frames are);
`dest: 'transparent'` falls back to an additive partition. Parallelograms take one exact affine draw.
Options: `src: [sx, sy, sw, sh]`, `opaque`, `tol`, `maxN`, `ss` (supersampling 1-3), `quality`, `alpha`, `composite`,
`filter`, `shadow: {color, blur, x, y}`, `cull`. Returns `{H, map(u, v), inv(x, y), front, grid, mode}`.

`Quad.drawPanel(ctx, tex, pose, {res, size, radius, clip, border, sheen, shadow, glow, reflection, alpha, ...})`
poses a flat panel in 3D: `pose = {x, y (anchor position at depth 0), ax, ay (anchor in panel px, default centre), s
(screen px per panel px), z (+ away), yaw (+ right edge away), pitch (+ top edge away), roll (+ clockwise), focal
(1800), cx, cy (vanishing point)}`; reflection mirrors the panel below its bottom edge on the same plane and fades it;
returns `{map, quad, front, size, rect(b)}` where `rect([x0, y0, x1, y1])` projects a panel-px box to a screen box
for brackets and labels. Pose tools: `poseMap(pose, size)`, `poseQuad(pose, w, h)`, `lerpPose(a, b, k)`,
`reanchor(pose, size, ax, ay)` (same placement, new anchor — start of every zoom), `focusPose(base, size, box, {width,
maxH, x, y, keep})` (the pose that frames a detail), `projRect(map, box)`, `brackets(ctx, rect, {len, pad, color,
width, glow, a})`, `floorShadow(ctx, map, w, h, o)`. A tilted 1600x1000 texture costs ~20-30 ms per frame
(more for translucent textures); flat poses cost one `drawImage`. `gl.js` `GL.panel` is the WebGL alternative.

## 5. Papers and slides: `pdf_figures.py`

```bash
python3 tools/pdf_figures.py paper.pdf --out P/assets/captures/pdf --tables --sheet --style P/style.json
python3 tools/pdf_figures.py deck.pptx --out P/assets/captures/pdf            # slides mode via LibreOffice
```

- Paper mode finds numbered captions (`Figure/Fig./Table/Chart/Scheme/Algorithm/그림/표/図/表 N`), takes the vector
  drawings and placed images above a figure caption (below a table caption) in the same column with no running text
  in between, grows the region by its axis labels, legends and panel letters, renders at `--zoom 3` (216 dpi) and
  trims to the ink. Uncaptioned large graphics come out as `graphic`. `--tables` adds `cells` (as printed) to table
  sidecars: re-plot from these, label "re-plotted from Table N".
- Slides mode (landscape pages, or `.pptx/.ppt/.odp/.docx` converted with LibreOffice; export Keynote to PDF first)
  renders every slide with its long side >= 2400 px and its title, and extracts large photos losslessly. `--mode images`
  extracts every embedded image at its original pixels; `--mode pages` renders pages.
- Sidecar: `kind, label, caption` (the paper's own words), `page`, `bbox` (PDF points), `px`, `dpi`,
  `rasterFraction`, `cells`, `panels` (`[{panel: "a", bbox}]` from the figure's own panel letters), `source {file,
  title, author}`, `sha1`; `figures.json` indexes the document. Filled boxes of running text (an abstract, a
  sidebar) are not figures, and section headings never become captions.
- `--find "the quoted sentence"` (repeatable) adds `finds` to `figures.json`: page, `bbox` in PDF points, `pagePx`
  for a `--mode pages` render, and the px rect inside every extracted image that contains it. Render pages into a
  separate folder (`--mode pages --out P/assets/captures/pdf-pages`; each run rewrites its folder's `figures.json`)
  and use recipe 35 "Paper figure" to push into a figure, bracket a panel and sweep a highlighter over the quote.
- Dark stages: `--dark on` (or `auto` with a dark `--style`) writes `<name>.dark.png`: paper removed to alpha,
  neutral ink inverted, colours keep their hue and are lifted for contrast. Raster-dominant figures (photos, heat
  maps) get no dark variant: their colours carry meaning — put the original on a light paper card instead. Say
  "recoloured for a dark background" in the credits when a dark variant is used.

## 6. Native apps and devices

macOS windows (`screencapture -l`), iOS Simulator (`xcrun simctl io ... screenshot --mask=alpha`, status bar
override), Android (`adb exec-out screencap -p`, demo mode), and how to turn those rasters into placed layers with
text-free copies and rows: `tools/capture_native.md`.

## 7. Provenance: what "real capture" means

A capture is real when every pixel or byte on screen came from the product, the command or the document, unmodified
except for what the sidecar lists. Allowed and recorded: choosing the state (demo account, persona, chosen input),
setting states on a static clone (reachable states only), hiding UI chrome (banners, widgets), masking secrets and
personal data, synthesized prompt lines, re-timing (typing speed, idle caps, fit, streaming, elision with "…"),
cropping, scaling, perspective, highlights and callouts drawn on top, dark variants of figures (labelled).
Not allowed: editing values, text or output lines; composing states the product cannot reach; splicing several runs
into one as if it were one; presenting a recreation as a capture. If a value had to change, the scene is a
recreation: draw it in vector and label it "illustrative".

Credits come from the sidecars, e.g. "Real app UI captured 2026-10-07 (demo account)", "Terminal: real output of
`npm test` (exit 0, 3.2 s; playback sped up 2x)", "Fig. 3 from Author et al., 2026 (CC BY 4.0)". When timing is
part of a claim ("in 1.9 s"), show the real number from the sidecar or the output itself, not the playback length.

## 8. QA checklist (every capture)

- Contact sheet reviewed at full resolution; no blank or half-faded layers (entrance animations), no carets, no
  scrollbars, no cookie banners, correct locale, clock and theme.
- Rects verified (recomposition diff ~1/255); radii and rows overlays checked; text-free copies show no ghosts.
- Terminal: `capture_cli.py scan` exits 0; `screen` output matches expectations; key line found (`--key`, `find`);
  readable size at the zoom used; nothing elided that the claim depends on; recorded in a demo folder.
- Figures: caption and number in the sidecar; >= 2x the displayed size; licence allows reuse; dark variants labelled.
- No secrets, personal data, real customer data, absolute paths or user names in any file under `P/assets/captures/`
  (`grep -rn "$HOME\|$USER" P/assets/captures` returns nothing). `capture_ui.mjs` records `file:` URLs relative to
  the spec and drops query values and fragments of web URLs; `build.mjs` fails on `/Users/`, `/home/`,
  `C:\Users\` or `file://` anywhere in the built HTML.
- Sidecar provenance fields filled; the credits line is written from them.
