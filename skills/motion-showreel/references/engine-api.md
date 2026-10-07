# Engine API (runtime/engine.js, gl.js, compositor.js)

Everything a scene can call. Scenes are classic scripts; the runtime exposes globals by design.
Load order (template.html and build.mjs): `engine.js`, `gl.js`, `quad.js`, `term.js`, `compositor.js`, then the
project modules `P/modules/*.js` (file-name order), then `P/scenes/<id>.js` in reel.config order. Missing optional
modules (gl, quad, term) are skipped without error.

**Project modules** (`P/modules/<name>.js`): code that several scenes share, owned by the integrator, not by a scene
builder: a code-drawn cast that registers sprites in `IMG`/`META` from a `window.REEL_MODULES` loader
(`examples/playful-app/modules/mochi-cast.js`), a data loader, shared layout helpers. An IIFE that may define globals
(prefix them with the project name) and loaders, and never assigns `SCENES`. Scenes may rely on modules; no scene may
rely on another scene.
`quad.js` (`window.Quad`) and `term.js` (`window.Term`) are documented in `capture.md`.

## 1. Scene file contract

```js
// P/scenes/<id>.js
(() => {
  let cache = null;                                  // lazy, keyed by inputs only (never by time)
  SCENES['<id>'] = {
    draw(ctx, t, env) { /* paint the FULL frame, opaque background first */ },
    portal(t, env) { return { x, y, w, h, r }; },    // optional: window rect for zoomInto / portalFlash
  };
})();
```

- Pure function of `(t, env)`: no `Math.random`, `Date`, `performance.now`, no state carried between calls. Use
  `hash()`/`hsh2()`. Frames are rendered out of order by parallel workers; purity is what makes that exact.
- `t` is scene time in seconds (after any `--scale`/`--warp` map); `env.lt = t - sceneStart`. Valid for
  `lt` in `[-0.7 s, dur + 0.7 s]` (transitions draw neighbours outside their range); draw nothing for negative local
  times of an element.
- Never rely on a transform surviving `draw`; the compositor renders every scene into a buffer and composites images.
  Leaked `save()`/clips are wiped per buffer, but they still corrupt your own later drawing: balance them.
- No grain, vignette, HUD, captions or transitions in scenes (compositor-owned). Keep reserved regions free (section 9).
- Colours from `env.palette`, fonts from the font roles, spring/ease from `env.style.motion`.

## 2. Project globals

| Name | Meaning |
|---|---|
| `W`, `H`, `FPS` | `reel.config.size`, `fps` (defaults 1920x1080, 60) |
| `UNIT` | `min(W, H) / 1080`: style sizes are px at 1080p. `ts()`, captions and the HUD apply it; scenes meant to work at several frame sizes lay out with `W`, `H`, `UNIT`, `ts()` instead of literal px |
| `DUR` | active cut duration (scene s); prefer `env.dur` |
| `CONFIG`, `STYLE`, `THEME` | reel.config.json; style.json merged over defaults; `'light'` or `'dark'` |
| `C` | main palette (style.json `palette`, = `env.paletteMain`), see below |
| `C2`, `ALT_THEME` | alternate palette built the same way from `style.paletteAlt` (null without one) and its theme |
| `FAM`, `font(size, weight = 400, fam = 'P')` | CSS font string; `fam` = role key or a raw CSS stack |
| `TYPE`, `ts(i)`, `track(size)` | `style.type`; `ts(i)` = type-scale step i (0 smallest, clamped) x `UNIT`; `track` = letter spacing px from `style.type.tracking` (abs <= 0.15 means em, else px) |
| `IMG[name]`, `META[name]` | `assets/<name>.webp` (any top-level image) and `{w, h, eyes?}` (meta.json, else natural size). Captures are also aliased as `IMG['captures/ui/chat']` (path without extension) |
| `ASSETS[path]`, `ASSET(path)`, `ASSET.list(prefix)` | everything under `assets/` except top-level images: images -> `Image`, `.json` -> parsed object, `.cast .txt .csv .tsv .md .log .ansi` -> string. Folders starting with `_` or `.` are skipped |
| `SCENES`, `REEL` | scene registry; compositor state (`REEL.plan`, `REEL.cut`, `REEL.drawing` = scene being drawn) |

**Palette `C`** (style.json `palette` roles): `bg bg2 surface ink ink2 muted accent accent2 accent3 ok warn deny`.
Derived: `shadow` (drop-shadow tint), `night` (darkest stage colour, for dark scenes inside light reels), `line`
(hairline rgba), `accentSoft accent2Soft accent3Soft` (tinted fills), `onAccent` (readable text on accent).
Reference aliases (case-study key names, mapped onto the roles so older code works on any palette):
`cream=bg cream2=bg2 blush/blush2` (soft accent tints) `rose/rose2` (mid accent tints) `berry=accent`
`berryD` (accent darkened) `mute=muted lilac/sky` (accent2 tints) `peach` (accent3 tint) `mint` (ok tint)
`night2 plum` (dark stage tints) `nv=ok gold=accent3 deny`.

**Alternate palette.** A scene marked `"dark": true` in reel.config on a light reel receives `env.palette = C2`
(style.paletteAlt with every derived helper above) when the style has a dark paletteAlt; every other scene receives
`C`. Draw with `env.palette` (never the global `C`) and a night-stage scene changes palette with no extra code.
`env.paletteMain` is always `C`; `env.paletteAlt` is `C2` (or null) for scenes that blend both.

**Font roles** (`FAM`): `display sans serif mono cjk` plus the reference keys `D=display P=sans S=serif M=mono
J=cjk`. Every stack falls back through the CJK stack, so Hangul/kana/hanzi never render as tofu. Faces listed in
`style.fonts.files` are loaded with `FontFace` before the first frame.

## 3. `env` (third argument of `draw`)

| Field | Meaning |
|---|---|
| `id`, `index`, `label` | scene id, position in the cut, label |
| `lt`, `dur`, `t`, `t0`, `t1` | local time, scene length (s), scene time, start/end in the cut |
| `bpm`, `beatSec`, `barSec`, `beat`, `bar` | tempo; `beat = lt / beatSec`, `bar = lt / barSec` (scene starts are on bar lines, so fractional parts match the music) |
| `inSec`, `outSec` | in-phase and out-phase lengths (`inBeats`/`outBeats` x beatSec; defaults 1 bar / 1 beat) |
| `phase` | `{in 0..1, hold s (0..holdDur), holdDur, holdP 0..1, out 0..1, inSec, outSec, holdStart, holdEnd, lt, dur}` |
| `cut`, `dark`, `music` | cut name, dark flag, music part of this scene |
| `style`, `palette` | merged style.json; the scene's palette: `C`, or `C2` for a `"dark": true` scene on a light reel |
| `paletteMain`, `paletteAlt` | always `C`; `C2` (from `style.paletteAlt`) or null |
| `cues` | this scene's cues from the plan, each `{t, sfx, scene, lt, ...}` (`lt` = time from scene start) |
| `captions` | captions active at `t` (`[{t0, t1, text, scene}]`), to keep text clear of them |
| `fx` | per-frame FX request object (section 8) |
| `portal` | only during an outgoing `zoomInto` / `portalFlash`: `env.portal(ctx, x, y, w, h, r?)` draws the incoming scene through that window |

## 4. Elastic timing

Every scene is in-phase (fixed) + hold (stretches) + out-phase (fixed, anchored to the scene end). Animations run at
1x in every cut; only the hold length changes, so the in-phase is pixel-identical at any length.

- `phaseOf(env, o)`: the phase object for custom lengths (`o.inBeats`, `o.outBeats`, `o.inSec`, `o.outSec`). The
  out-phase always ends at `dur`; if `in + out > dur` they overlap (still 1x, the compositor warns).
- `onBars(env, every = 1, fn, o)`: secondary beats on bar lines during the hold. Calls `fn(i, dt, tBar, bar)` for
  every `every`-th bar line that has passed, from the first bar line at/after the hold start (`o.from`: seconds or
  `'start'`) until the out-phase (`o.until`), shifted by `o.offsetBeats`. `dt` = seconds since that line. Returns
  the count fired. Draw decaying accents from `dt`; persistent ones from `i`.
- `onBeats(env, every, fn, o)`: same on the beat grid.
- `beatPulse(env, k = 8, every = 1)`: 1 on each (every-th) beat, decaying `exp(-k s)`. Idle bounce: `y -= 12 * beatPulse(env)`.
- `stagger(lt, i, step = 0.08)`: `lt - i * step`.

```js
const n = onBars(env, 1, (i, dt) => { circle(ctx, 160 + i * 44, 660, 12 * Ease.outBack(clamp(dt / 0.35))); ctx.fill(); });
text(ctx, countUp(0, 1000 * n, 1) + ' frames', 140, 740, { size: 28 });          // ticks on every bar line
const out = Ease.inC(env.phase.out); ctx.globalAlpha *= 1 - out;                  // exit, anchored to the end
```

## 5. Helpers (engine.js)

**Math and motion**
- `clamp(x, a = 0, b = 1)`, `lerp(a, b, t)`, `rm(t, a, b)` (clamped remap to 0..1).
- `Ease`: `lin inQ outQ ioQ inC outC ioC outQuint ioQuint inExpo outExpo ioExpo outBack(t, s) inBack(t, s) outSine
  ioSine outElastic`.
- `spring(t, f = 2.4, z = 0.42)` damped step 0 -> 1 with overshoot; `wob(t, f = 3, d = 5)` damped wobble;
  `styleSpring(t, {f, z})` / `styleEase(t)` use `style.motion.spring` / `style.motion.ease`.
- `hash(n)` -> 0..1, `hsh2(a, b)`; `shake(t, amp = 6, seed = 1, freq = 30)` -> `[dx, dy]` smooth noise.

**Colour**
- `parseColor(css)` -> `[r, g, b, a]` (any CSS colour or legacy `'r,g,b'`), `toHex(css)`, `rgbTriplet(css)` -> `'r,g,b'`.
- `rgba(color, a)` any colour with a new alpha; `mix(a, b, t)` sRGB mix -> hex.
- `luma(c)` WCAG luminance, `contrast(a, b)` ratio, `onColor(bg, light = '#FFF', dark = C.ink)` readable text colour.

**Paint**
- `rr(ctx, x, y, w, h, r)` (path), `circle(ctx, x, y, r)` (path), `withAlpha(ctx, a, fn)`.
- `radial(ctx, x, y, r0, r1, stops)`, `linear(ctx, x0, y0, x1, y1, stops)` -> gradients; stops `[[0, css], [1, css]]`.
- `softBlob(ctx, x, y, r, color, a = 1)` radial colour blob (any CSS colour).
- `card(ctx, x, y, w, h, r, {fill = C.surface, shadow, shadowColor, shadowBlur = 40, shadowY = 18, stroke, lw})`.
- `makeBuf(w = W, h = H)` -> `{c, g}` offscreen canvas; create lazily once per scene.
- `drawImageFit(ctx, img, x, y, w, h, {fit: 'cover'|'contain'|'fill', ax, ay, radius, alpha})`.

**Type** (all take `o.size`, `o.weight`, `o.fam`, `o.color`, `o.align`, `o.ls` px, `o.alpha`, `o.glow`, `o.glowBlur`)
- `text(ctx, s, x, y, o)` (`o.base` baseline; default weight `style.type.bodyWeight`), `measure(ctx, s, o)` -> px.
- `kinetic(ctx, s, x, y, lt, o)` per-glyph rise + blur-in, kerning-preserving: `stagger = 0.028`, `dur = 0.55`,
  `rise = 0.6 size`, `blur = 10`, `pop` (scale-in), `colorFn(i, ch)`, `out: {at, stagger = 0.012, dur = 0.35}`
  (exit), default weight `style.type.displayWeight`. Returns the width.
- `revealLine(ctx, s, x, y, p, o)` line slides up from a mask (p 0..1).
- `scramble(s, p, seed = 1, t = 0)` -> string decoding left to right (draw it with `text`).
- `wipeText(ctx, s, x, y, p, {bar = C.accent, out, ...})` colour bar sweeps the title in (and out with `o.out`).
- `typewriter(ctx, s, x, y, lt, {cps = 28, caret, caretColor, caretAfter, ...})` typing with a blinking caret.
- `countUp(a, b, p, {decimals, locale = 'en-US', prefix, suffix})` -> formatted string.
- `rollNumber(ctx, value, finalStr, x, y, {size = 160, fam = 'D', pad, glow, ...})` odometer digits; `finalStr`
  fixes the layout (`'1,800'`, `'98.6%'`).
- `wrapText(ctx, s, maxW, o)` -> lines (Latin and Korean break at spaces, Chinese/Japanese between characters).
- `fitSize(ctx, s, maxW, {size, min})` -> the largest size <= `size` that fits on one line.

**UI bits**
- `chip(ctx, x, y, label, {size = 24, icon, iconColor, bg = C.surface, fg = C.ink, stroke, align, shadow})` -> width.
- `icon(ctx, kind, x, y, s, color)`: `clock pin won drop ban check x search lock globe shield spark play arrow plus
  minus star bolt heart doc code terminal chart user cloud gear`.
- `brackets(ctx, x, y, w, h, len = 18, color = C.ink2, lw = 1.5, alpha = 1)` corner brackets.
- `callout(ctx, ax, ay, p, {label, sub, dx = 1, dy = -1, len = 150, color = C.accent, t, seed})` ring, elbow leader,
  scramble-decoded label. Pair with `GL.project` / `GL.panelPoint` to anchor on 3D points or tilted screens.

**Carriers** (a capture in its natural frame; recipes 35 and 36 in `motion-recipes.md`)
- `browserFrame(ctx, x, y, w, h, {img, url, title, scroll = 0, cssWidth, dpr = 2, dark, radius = 18, bar = 52,
  shadow = true, alpha})` -> `{x, y, w, h, k}` of the content area. A browser window around a web capture
  (`capture_ui.mjs` `shot {full: true}` or `scrollShots`): lights, a URL pill (pass the sanitized URL, never a local
  path), the page clipped inside and scrolled by `scroll` (page CSS px), a scrollbar. `k` = screen px per page CSS
  px, so a callout on a page element lands at `x + cssX * k, y + (cssY - scroll) * k` (element boxes come from the
  capture's `layers.json`).
- `paperSheet(ctx, x, y, w, h, {img, rot, alpha, curl = 0..1, paper, lines, highlights: [{rect: [x0, y0, x1, y1],
  k, color}]})` -> `map(ix, iy)`. A paper page (a `pdf_figures.py --mode pages` render, or blank ruled paper with
  `lines`) lying on the stage with a shadow and an optional lifted corner; `highlights` (rects in image px, e.g. from
  `pdf_figures.py --find TEXT`) sweep as highlighter strokes over `k` 0..1. `map` turns image px into screen px with
  the rotation applied, for callouts anchored on the page.

**Characters and products** (cutouts from `imagery.md`; `x, y` = feet/bottom centre, `h` = on-screen height)
- `drawChar(ctx, name, x, y, h, {blink, flip, rot, sx, sy, alpha, filter, ax, jelly, jellyPhase})` -> width.
  `jelly` = strip-sliced wobble (ears move, feet stay planted).
- `popChar(ctx, name, x, y, h, lt, o)` spring entrance + squash + jelly + breathing + blink + contact shadow:
  `f = 2.2, z = 0.45, fromY, scaleIn, squash = 0.09, jelly = 14, sway, bounce, bounceT, bounceF = 2, seed, flip, rot,
  alpha, shadow, shadowA = 0.25, shadowColor, blink`.
- `blinkAt(t, seed)` -> true for ~0.1 s per character period (uses `IMG[name + '_blink']`).
- `groundShadow(ctx, x, y, w, a = 0.22, color = C.shadow)`.
- `drawProd(ctx, key, x, y, h, {rot, sx, sy, alpha, filter})` -> width; `drawReflection(ctx, key, x, y, h, a = 0.22)`.

**Decoration**
- `sparkle(ctx, x, y, r, a = 1, rot = 0, color = '#fff')` 4-point glint.
- `petal(ctx, x, y, s, rot, flip, a, tint)`, `petalPath(ctx, s)`, `petals(ctx, t, n, {seed, size = 14, speed = 60,
  drift = -30, alpha, draw(ctx, x, y, s, rot, flip, a, i)})` deterministic drift; `draw` swaps the particle shape.
- `blobPath(ctx, x, y, r, t, amp = 0.07, n = 120)` living blob path; `orb(ctx, x, y, r, t, a = 1, cols)` gradient
  orb (accent colours by default).

**Paths and outline morphs**
- `qbez(p0, p1, p2, t)`, `resample(pts, n)` (even spacing, drops the closing point), `pathLen(pts)`,
  `pointAt(pts, u)` -> `{x, y, a}`, `polyStroke(ctx, pts, u = 1)` (builds the partial path; call `ctx.stroke()`).
- `morphPoints(a, b, k)`, `pathFrom(ctx, pts, close = true)`.
- Same start point and direction, so any pair morphs cleanly: `roundRectPoints({x, y, w, h, r}, n = 260)`,
  `circlePoints(cx, cy, r, n = 260)`, `archPoints(arch = ARCH, n = 260)`, `phonePoints(phone = PHONE, n = 260)`
  (the reference `archPoints(n)` / `phonePoints(n)` calls still work). `ARCH PHONE GATE` are the case-study shapes
  scaled to the frame; pass your own.

**Data viz** (palette-driven; `p` is build progress 0..1)
- `barChart(ctx, data, {x, y, w, h}, p, {max, gap = 0.28, stagger = 0.08, highlight, color, values, format})`;
  `data` = numbers or `{v, label, color}`.
- `lineChart(ctx, values, rect, p, {color, lw = 4, fill = true, glow, dot = true, xMin, xMax, yMin, yMax})` -> the
  head point `{x, y, a}` (anchor a callout on it).
- `donut(ctx, x, y, r, frac, {lw, color, track, cap, glow})`.

**Compositor-owned** (do not call in scenes): `drawCaptions`, `grain`, `makeGrain`, `vignette`.

## 6. gl.js: WebGL2 layer (`GL`)

One offscreen WebGL2 canvas (W x H, `preserveDrawingBuffer`) drawn into the scene's 2D context. Works headless (GPU
or SwiftShader). Without WebGL2, `GL.ok` is false and clouds, lines and panels fall back to plain Canvas2D (flat
dots, 1-px lines, affine panels); scenes keep working.

```js
GL.begin();                                   // clear; HDR accumulate for additive light
GL.drawCloud(cloud, { cam, morph: m, time: t });
GL.panel(img, { x: 700, y: 520, w: 900, ry: 0.4, radius: 18, shadow: {} });
GL.blit(ctx);                                 // tone-map, composite into ctx; call before further 2D drawing
```

- Frame: `GL.begin({hdr = true, exposure = 1.25, additive})`, `GL.resolve(exposure)`, `GL.blit(ctx, {alpha, op,
  exposure, x, y, w, h})`. Draw calls auto-begin. Blending defaults to additive light when the scene being drawn is
  dark (`env.dark` or a dark theme) and to normal alpha otherwise; override per call with `additive`. Panels always
  draw exact (untone-mapped) colours on top of the light resolved so far; for light over a panel, blit and begin again.
- Camera: `GL.camera({target = [0,0,0], yaw, pitch, dist = 3, fov = 0.6, roll, shiftX, shiftY, eye, up, near, far,
  aspect})` -> `{view, proj, viewProj, eye, dist}`. Orbit with yaw/pitch, zoom with dist or fov, frame off-centre with
  lens shift (NDC). `GL.project(cam, [x, y, z], model?)` -> `[px, py, depth, visible]`. `GL.M4`: `I mul chain T S
  rotX rotY rotZ perspective lookAt apply` (column-major).
- Point sets (Float32Array n x 3): `GL.textPoints(str, {n = 5000, size = 220, fam = 'D', weight = 900, width = 2,
  step, depth, seed})` (particle logo from rasterized text, multi-line with `\n`), `GL.imagePoints(img, {n, mode:
  'alpha'|'luma', threshold = 0.5, width})` -> `{positions, colors, n}`, `GL.shapePoints(kind, n, {r = 1, seed, ...})`
  with `sphere ball disc ring torus grid cube helix galaxy wave line`, `GL.pairPoints(a, b, key = 'x')` (reorders b to
  pair with a by `x y z angle radius hash` rank: coherent sweeps, no criss-cross).
- Clouds: `GL.cloud(positions, {colors, sizes, seeds, morph})` -> handle (`setPositions`, `setMorph`, `setColors`);
  `colors`: CSS string, `[r,g,b]`, list of CSS (picked per point) or `fn(i, x, y, z)`; `sizes`: px, `[min, max]` or
  Float32Array. `GL.drawCloud(h, {cam, model, size = 1, alpha, additive, soft (glow 0..1), morph 0..1, swirl = 0.35,
  stagger = 0.6, time, twinkle = 0.15, sizeRef = cam.dist, minSize = 1, maxSize = 96, tint, tintAmt, reveal: [x, y,
  z, r], revealSoft})`. Morph = per-point staggered smoothstep along a swirl curve.
- Lines (instanced screen-space quads with soft glow and travelling pulses): `GL.lines(segments, {colors,
  colorsEnd, u, seeds})` with segments Float32Array m x 6 or `[[a], [b]]` pairs; `GL.path(points, o)` (path param u
  runs 0..1 along the whole polyline); `GL.edges(positions, pairs, {bulge, segments, center, colors})` (graph arcs).
  `GL.drawLines(h, {cam, model, width = 1.5 px, persp, alpha, additive, glow = 0.6, draw = 1 (draw-on along u),
  drawSoft = 0.04, stagger, time, pulse: {amount, speed = 0.5, width = 0.06, color, spread = 1}})`.
- Panels (perspective-correct texture with mipmaps + anisotropic filtering, crisp text when tilted):
  `GL.panel(src, {x, y, w, h, rx (top recedes), ry (right edge recedes), rz, z, focal = 1600, corners [TL, TR, BR,
  BL], radius, alpha, shade, sheen 0..1, sheenWidth, border: {width, color}, glow: {width, color, alpha}, shadow:
  {blur = 40, alpha = 0.35, dx, dy = 24, color}, crop: {x, y, w, h}, dynamic})` -> screen corners. `dynamic: true`
  re-uploads a canvas redrawn every frame (a live terminal). `GL.panelPoint(o, u, v)` -> screen `[x, y]` of a point on
  the panel (anchor carets, highlights, callouts); `GL.panelCorners(o)`.
- Colours: `GL.rgb(css)` -> `[r, g, b]` 0..1; `GL.colors(n, spec, positions)`.
- Build GPU handles lazily once (`if (!cl) cl = GL.cloud(...)`); they are reused by every frame in that page.

```js
// particle wordmark: galaxy -> text, orbiting camera (dark scene: additive glow by default)
if (!cl) {
  const n = 9000, A = GL.shapePoints('galaxy', n, { r: 1.4 });
  cl = GL.cloud(A, { morph: GL.pairPoints(A, GL.textPoints('REEL', { n, width: 2.4 })), colors: [P.accent, P.accent2, '#FFFFFF'], sizes: [1.6, 3.2] });
}
const m = Ease.ioC(rm(env.lt, 0.6, 2.6));
GL.begin();
GL.drawCloud(cl, { cam: GL.camera({ yaw: lerp(-0.9, 0, m), pitch: lerp(0.55, 0.05, m), dist: lerp(3.6, 2.6, m) }), morph: m, time: t });
GL.blit(ctx, { exposure: 1.4 });
```

## 7. Transitions (compositor)

The incoming scene's `in` (+ `inParams`) runs in a window around its first bar line `[t0 - pre, t0 + post]`.
Defaults in beats; override with `inParams.preBeats/postBeats` (beats) or `pre/post` (seconds). The first scene's
`in` is ignored. Both scenes render into buffers, so any scene works with any transition.

| `in` | pre / post (beats) | Look | `inParams` |
|---|---|---|---|
| `cut` | 0 / 0 | hard cut | |
| `blobWipe` | 1 / 0 | wobbly circle reveals the next scene, glowing edge | `x, y` centre px, `edge` colour |
| `zoomInto` | 1 / 0 | camera zooms into a window of the outgoing scene; the incoming scene grows inside it | `rect {x,y,w,h,r}` (else the outgoing `portal(t, env)`), `zoom` |
| `whip` | 0.3 / 0.3 | whip pan with 12-sample motion blur and a chroma kick | `dir`: `left right up down` |
| `glitch` | 0.2 / 0.44 | RGB split + slice displacement out of A and into B | `amount` |
| `flash` | 0 / 0 | cut + exposure flash decaying ~0.3 s | `color`, `amount = 0.85`, `decay = 9` |
| `strobe` | 0 / 0 | 2-frame pulses at -4, 0, +6 frames: inverted frames (or flashes of `color`) | `color`, `amount` |
| `match` | 0 / 0 | match cut (same layout across the cut); optional centred crossfade | `fade` seconds |
| `impact` | 0 / 0 | cut + zoom punch, shake, flash, chroma kick | `zoom = 0.07`, `shake = 16`, `flash = 0.35`, `color` |
| `portalFlash` | 0.8 / 1.2 | the outgoing scene shows the next one through `env.portal`, then a light burst | `x, y` burst centre (else `portal()` rect centre), `color` |
| `dissolve` (extra) | 0.5 / 0.5 | soft crossfade | |
| `push` (extra) | 0.5 / 0 | slide without blur | `dir` |

Geometry hand-offs: `zoomInto` and `portalFlash` read the outgoing scene's `portal(t, env)` rect (or `inParams.rect`
/ `x, y`), and pass `env.portal` to it so it can already show the next scene inside its screen, door or card.

**Establishing image for `zoomInto`** (`REEL.entryPortal(env)`): during a `zoomInto` the camera flies into the
outgoing scene's window while the incoming scene is drawn inside it. An incoming scene that starts on an empty
stage makes the window go blank mid-zoom. Call `REEL.entryPortal(env)` in the incoming scene: it returns where the
outgoing portal sits in this scene's frame at `env.t`, `{x, y, w, h, r, k, from}` (`k` = zoom progress, 1 once the
window fills the frame), or `null` for any other entry. Draw the same content the window showed (the same capture)
at that rect, so the zoom lands on identical pixels, then animate from the rect into the scene's own layout
(`examples/playful-app/scenes/flavors.js` pulls back out of the phone it zoomed into). Without a `portal()` or
`inParams.rect` the rect is a centred default proportional to the frame.

## 8. Frame FX, post, captions, HUD

**`env.fx`** (reset every frame; take the max, multiply zoom; applied to the whole composed frame after the scene):
`zoom` (multiplier), `shake` (px), `ca` (chroma split 0..1, ~12 px at 1), `flash` 0..1 + `flashColor` (light colours
lift exposure, dark colours dip), `invert` 0..1, `hud` and `captions` (0..1 visibility), `bloom`, `vignette`,
`grain` (override `style.post` for this frame), `dark` (0..1 override of the dark blend).

**Post** from `style.post`: `bloom` (soft highlight glow, Canvas2D), `vignette {a, color}`, `grain` (overlay
alpha). Dark scenes in a light reel blend toward stronger vignette (>= 0.5, night colour), grain x1.5 and bloom
>= 0.25 across the boundary.

**Captions**: burned in when `reel.config.captions.enabled` is true, or, when reel.config does not set it,
`style.layout.captions.enabled` is true; from the cut's `captions` list (scene time). Look: `style.layout.captions
{font (role), size, fg, bg ('none' = shadow only), y (<= 1 fraction of H for the block centre, else px at 1080p),
weight, maxWidth}` (sizes x `UNIT`); wraps to 2 lines, shrinking to 72 % if needed; 0.12 s fades. One caption at a
time: when the next cue starts within 0.24 s of this one's end (cues meeting at a scene cut), this one fades out over
the 0.12 s before the next cue's start and the next fades in over the 0.12 s after it. Keep the caption band (around
`y`) free when captions are on.

**HUD** (`reel.config.hud`; without it `style.layout.hud: true` draws the frame look; laid out at 1080p proportions x `UNIT`):
- `steps` look: `{steps: ['Ask', 'Check', ...], map: {sceneId: stepIndex}, darkAccent}`: pill step bar top-right
  with a sliding active pill; visible on mapped scenes; light or dark glass per scene. Reserved: `x > W - 740, y < 112`.
- `frame` look: `{look: 'frame', label, subtitle, showCut, url}`: corner brackets, title (+ `subtitle`, or the cut name
  with `showCut: true` for review slates; off by default so deliverables carry no production labels), timecode, beat
  dots, scene index/label (scramble-decoded at each cut), progress line. Reserved: a 90 px border.
- Per scene `"hud": false` in reel.config hides it; `env.fx.hud = 0` hides it for a frame range.

**Motion blur** (opt-in; scenes are pure in t, so the shutter is exact): scene key `"motionBlur": true | {samples
= 5, shutter = 0.5}` in reel.config (passed through the plan), or reel-wide `CONFIG.motionBlur`. `shutter` is the
fraction of a frame (0.5 = 180 degrees); subframes are averaged around `t`, only the centre sample's `env.fx` counts.
Costs `samples` x the scene's draw time (also in the HTML player): use it for fast springs, flying chips, whips inside
a scene; 8-12 samples for very fast high-contrast motion.

**reel.config scene extras read by the runtime** (besides contract C): `label` (HUD/placeholder), `hud: false`,
`motionBlur`, and `poster` (output s) at the top level.

## 9. Compositor behaviour and page API

- Missing scene: a labelled placeholder (id, label, bars, in/hold/out timeline, playhead, beat dot) and a warning.
  A scene that throws: a red error card with the message, `console.error` (stills/render exit 1).
- Optional modules may register `window.REEL_MODULES.push({name, load(manifest)})`; `load` is awaited after assets.
- `window.__reel`: `ready`, `error`, `renderFrame(t)` (scene time), `renderOut(T)` (output time), `toScene(T)`,
  `OUT`, `cut`, `cuts`, `setCut(name, {scale, warp})`, `setTimeMap(scale, warp)`, `plan`, `canvas`, `W`, `H`, `fps`,
  `renderScene(id, lt, dur, {post})` (one scene alone at any length), `renderPoster(T, {play, badge, w, h, type,
  quality})` -> data URL, `frameInfo(t)` -> `{scene, lt, dur, transition}`, `boundaryTimes()`.
- URL parameters: `?cut=30&t=4.5&scale=1.5&warp=0:0,7:7,53:30&autoplay&render`.
- Player keys: Space play/pause, Left/Right one frame, Shift+Left/Right one second, Home/End, 1-9 select a cut, F
  fullscreen. The poster frame under the play button is `reel.config.poster` (output s) or the end of the first
  scene's in-phase.
- `window.MANIFEST` (written by stills.mjs/build.mjs): `{mode, title, config, style, cuts {name: cut json}, cutOrder,
  defaultCut, meta, images {name: url}, assets {path: {type, url | data}}, fonts [[family, url, weight, style]],
  audio {cut: url}, scale, warp, posterT}`.

## 10. Full example

```js
// P/scenes/proof.js: elastic, style-driven, real UI capture on a 3D panel, secondary beats, exit on the out-phase.
(() => {
  SCENES['proof'] = {
    portal(t, env) { return { x: 1180, y: 300, w: 560, h: 420, r: 28 }; },     // the next scene zooms into this card
    draw(ctx, t, env) {
      const P = env.palette, { lt, phase } = env, out = Ease.inC(phase.out);
      ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
      softBlob(ctx, 420 + Math.sin(lt * 0.4) * 60, 300, 520, P.accentSoft);       // living backdrop
      // in-phase: headline per glyph, then the subline wipes in (depends on lt only)
      kinetic(ctx, 'Real captures.', 140, 380, lt - 0.15, { size: ts(7), fam: 'display', color: P.ink, out: { at: env.dur - env.outSec } });
      wipeText(ctx, 'Tilted in 3D.', 140, 480, rm(lt, 0.6, 1.6), { size: ts(5), fam: 'sans', color: P.ink, bar: P.accent, out: phase.out });
      // a captured UI layer on a perspective panel, idle sway, sheen on the beat
      const e = styleSpring(lt - 0.3), o = { x: 1460, y: 510 + (1 - e) * 600, w: 560, ry: -0.45 + 0.03 * Math.sin(t * 0.7), radius: 22,
        shadow: { blur: 40, alpha: 0.3 }, sheen: rm(lt, 0.8, 2.0), alpha: 1 - out };
      GL.begin(); GL.panel(IMG['captures/ui/chat'], o); GL.blit(ctx);
      const [ax, ay] = GL.panelPoint(o, 0.3, 0.42);
      callout(ctx, ax, ay, rm(lt, 1.6, 2.4), { label: 'Real app UI', sub: 'captured, not drawn', dx: -1, len: 160, t, alpha: 1 - out });
      // hold: one highlight per bar line, so a long hold never freezes
      onBars(env, 1, (i, dt) => withAlpha(ctx, 1 - clamp(dt / 1.2), () => { rr(ctx, 130, 520 + (i % 3) * 56, 520, 44, 22); ctx.strokeStyle = P.accent; ctx.lineWidth = 3; ctx.stroke(); }));
      const stamp = env.cues.find(c => c.sfx === 'stamp');                         // sync an accent to the shared cue list
      if (stamp && lt >= stamp.lt) env.fx.shake = Math.max(env.fx.shake, 10 * Math.exp(-(lt - stamp.lt) * 8));
    },
  };
})();
```

```js
// reel.config.json scene entry and the planner's cut-30.json view of it
{"id": "proof", "minBars": 2, "maxBars": 4, "priority": 1, "inBeats": 4, "outBeats": 1, "in": "whip", "inParams": {"dir": "left"},
 "music": "groove", "cues": [{"beat": 2, "from": "start", "sfx": "stamp"}]}
{"id": "proof", "fromBar": 6, "toBar": 8, "t0": 12.0, "t1": 16.0, "in": "whip", "inParams": {"dir": "left"}, "inBeats": 4, "outBeats": 1, "dark": false, "music": "groove"}
```
