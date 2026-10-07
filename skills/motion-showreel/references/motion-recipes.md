# Motion recipes

Style-agnostic building blocks for scene code. Every snippet uses the runtime helpers (`engine-api.md`), takes its
colors from `env.palette`, is pure in `(t, env)`, and is timed in **beats** so it lands on the music. Each recipe says
what it sells, its timing, and how it holds when a longer cut stretches the scene. Combine 2-4 recipes per scene; one
of them is the hero.

Conventions: `P = env.palette`, sizes in px at 1920x1080 (`W`, `H`), `since(env, b)` = local seconds since beat `b`.
For another frame size (a 1080x1920 vertical reel), lay out with `W`, `H`, `UNIT`, and `ts(i)` instead of literal px.
Fonts by role: `fam: 'display' | 'sans' | 'serif' | 'mono' | 'cjk'` (legacy `D P S M J` also work). Every code block
below is a self-contained definition, rendered with the runtime on a light and a dark palette as a test. They are
written as top-level functions only for that test: **paste the ones you use inside your scene IIFE** (scene files
define no top-level names). Function-property caches (`halo.buf`) then belong to that scene alone.

| # | Recipe | Sells | Timing (beats) | Holds by |
|---|---|---|---|---|
| 1 | Scene skeleton | contract, elastic phases | in / hold / out | design |
| 2 | Timing idioms | landing on the beat | - | `onBars`, `beatPulse` |
| 3 | Characters | personality from one still | pop 1, settle 1 | breathing, blink, beat bounce |
| 4 | Kinetic type | the claim | 0.5-1 per line | idle drift, keyword pulse |
| 5 | Camera and backdrop | depth, life | - | drift (always) |
| 6 | Drop + splash | a sensory hook | fall ends on beat 0 of the hit | ripples, re-drip every 2 bars |
| 7 | Emerging objects + reflections | premium product reveal | 1 each, 1/4-beat stagger | sheen on bar lines |
| 8 | Reticle lock-on | "the AI looks" | lock in 3/4 | scan line, beat pulse |
| 9 | Halo | the hero is special | fade 1 | rotation + downbeat pulse |
| 10 | Outline morph | one shape becomes another | 1.3 | n/a (one-shot) |
| 11 | Real UI in a device | the product works | bubble 2, steps 1/2 each | caret blink, next step per bar |
| 12 | Flying chips | structure extracted | 1/4 stagger, 3/4 flight | bob + highlight walk |
| 13 | Magnifier lens | scrutiny, evidence | 1 travel, 1/2 dwell | jitter, next target per bar |
| 14 | Beat stamps | verdicts | land on the beat | next card per bar |
| 15 | Map route rider | a plan in space | pins 1/2, legs 1-2 bars | marching dashes, rider beat bounce |
| 16 | Dark climax kit | stakes, protection | 3 bars | logs, neon breath, second attempt |
| 17 | Card flip-out | a deliverable | 1 | float, row highlights per bar |
| 18 | Beat-bouncing lineup | joy, community | 1/4 stagger | bounce every beat |
| 19 | Logo shine | brand payoff | glyphs 1.5, shine 1.5 | shine every 2 bars, twinkles |
| 20 | HUD chrome | system, telemetry | - | timecode, beat dots |
| 21 | Poster -> slices opener | thumbnail = frame 0 | hold 0.4 s, break 0.5 s | n/a |
| 22 | Point-cloud zoom | scale from one to all | zoom 4-8 | orbit |
| 23 | Counters | real magnitude | 2-4 | live tick |
| 24 | Tile wall | many real runs | hero 1, wave 1 | highlight walks per beat |
| 25 | Network pulses | connection, flow | per bar per edge | endless |
| 26 | 3D polylines | structure in space | draw-on 2-4 | orbit |
| 27 | Impact numbers | the result | slam on beat 1 | glow on the beat, next stat per bar |
| 28 | Cards loop | a process | 1 card per beat | dots flow, active card steps |
| 29 | CLI shot: tilted terminal + zoom to line | the CLI really runs | word 1, type 2-4, zoom 1 | caret, streaming output, next key line |
| 30 | Particle logo morph | data becomes brand | 2-3 | flicker, drift |
| 31 | Strobe, flash, glitch | rhythm, tension | per beat | per beat |
| 32 | Captions | narration on screen | narration times | n/a |
| 33 | Transitions (compositor) | continuity | in/out beats | n/a |
| 34 | 2.5D photo parallax | a real place, alive | camera from beat 0 | slow swing that never runs out |
| 35 | Paper figure: page, figure, detail | the paper's own evidence | sheet 1, zoom 1.25, sweep 1 | next panel or quote per bar |
| 36 | Web page in a browser frame | the real site or docs | window 1, scroll per bar | scroll one step per bar line |

## 0. Shared one-liners

```js
// Beats -> seconds, and local seconds since beat b (negative before it). Put both inside your scene IIFE.
const sec = (env, beats) => beats * env.beatSec;
const since = (env, b) => env.lt - b * env.beatSec;
```

## 1. Scene skeleton

`draw(ctx, t, env)`: `t` is reel time, `env.lt` local time, `env.dur` this cut's scene length. The in-phase
(`env.inSec`) and out-phase (`env.outSec`) are identical in every cut; the hold between them stretches.
`env.phase = {in, hold, holdDur, holdP, out, holdStart, holdEnd}` drives the three parts. Never scale an animation by
`env.dur`: anything normalized by the scene length plays slower in a longer cut. Use seconds or beats; let the hold
run idle loops. Other fields: `env.beatSec/barSec/bpm`, `env.beat`/`env.bar` (fractional, local), `env.dark`,
`env.palette` (roles + derived `shadow night line accentSoft onAccent`), `env.style`, `env.cues` (this scene's cues,
each with `lt`), `env.captions` (captions active now), `env.fx` (frame FX, section 5), `env.portal` (section 33).
A scene object may also define `portal(t, env) -> {x, y, w, h, r}`: the window that `zoomInto` and `portalFlash`
fly through. A scene that paints a night stage sets `"dark": true` in reel.config: the compositor switches to dark
post and HUD, and recipes read `env.dark` to choose blend modes and ink (`multiply` ink vanishes on a dark stage).

```js
(() => {
  const ID = 'skeleton';                          // = scenes/<id>.js = the reel.config scene id
  const at = (env, b) => env.lt - b * env.beatSec;
  SCENES[ID] = {
    draw(ctx, t, env) {
      const P = env.palette, ph = env.phase;
      // 1. opaque base + a backdrop that always moves (pure in t)
      ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
      softBlob(ctx, 420 + Math.sin(t * 0.4) * 60, 300 + Math.cos(t * 0.33) * 40, 560, rgba(P.accent, 0.18));
      softBlob(ctx, 1500 + Math.cos(t * 0.31) * 70, 780, 620, rgba(P.accent2, 0.14));
      // 2. in-phase: fixed choreography in beats; 4. out-phase: the group exits together
      const ex = Ease.inC(ph.out);
      ctx.save(); ctx.globalAlpha *= 1 - ex; ctx.translate(-60 * ex, 0);
      kinetic(ctx, 'Every claim, checked.', 120, 300, at(env, 1), { size: 72, weight: 800, fam: 'display', color: P.ink });
      revealLine(ctx, 'Sources first, answers second.', 124, 372, rm(at(env, 2), 0, 0.5), { size: 30, color: P.ink2 });
      // 3. hold: one secondary beat per bar line (fires only when the hold is long enough)
      onBars(env, 1, (i, dt) => chip(ctx, 124 + i * 250, 470, `check ${i + 1}`, { size: 22, alpha: Ease.outC(rm(dt, 0, 0.3)) }));
      ctx.restore();
    },
  };
})();
```

## 2. Timing idioms

- **Arrive on the beat.** The ear syncs to where motion *lands*. Start an entrance so it lands on beat `b`:
  `spring(since(env, b) + 0.18, ...)` lands near `b` for a typical f = 2.2 spring; `kinetic` glyphs read as "in"
  about 0.3 s after they start.
- **Stagger in fractions of a beat.** Lists step 1/4 or 1/8 beat (`env.beatSec / 4`), never arbitrary seconds.
- **Pulses.** `beatPulse(env, k, every)` is 1 on each beat and decays (k per second): glows, scale pops, flashes.
  `every = 4` pulses on downbeats (scenes start on bar lines).
- **Secondary beats in holds.** `onBars(env, every, fn)` calls `fn(i, dt)` for each bar line passed since the hold
  started; `onBeats` does the same per beat. In the shortest cut they never fire, so they cannot break it.
- **Springs from the style.** `styleSpring(lt)` uses `style.motion.spring`; `styleEase(p)` uses `style.motion.ease`.
- **Compact schedule for very short lengths.** A short cut may pin a scene to 1 bar; choreography authored for 2 bars
  then collides with the out-phase (a headline exits before it can be read). Switch schedules on the length the cut
  gives you, as the FDDD scenes did below 1.5 bars, so both versions are designed, not squeezed:
  `const T = env.dur < 1.5 * env.barSec ? { title: 0.5, hit: 1, stamp: 2 } : { title: 1, hit: 2, stamp: 4 };` (beats).
- **Layer long holds.** One secondary beat per bar keeps a 1-2-bar hold alive; beyond that, add new content every
  1-2 bars (the next state, a second example, a deeper zoom, a counter step), not only highlights on what is there.
- **One cue list.** `env.cues` holds this scene's resolved cues (`{t, lt, sfx, scene, from, offset, atBeat}`) from
  the same plan the audio is mixed from; keying a visual accent to it
  (`const q = env.cues.find(c => c.sfx.startsWith('stamp'))`) keeps picture and sound locked after the plan changes.
- **Motion blur for fast moves.** Flying chips, fast springs, and whips inside a scene read smoother with the
  runtime's exact shutter: `"motionBlur": true` (or `{samples, shutter}`) on that scene in reel.config. It costs
  `samples` x the scene's draw time, so set it per scene, not reel-wide.
- **Determinism.** Randomness only through `hash(n)` / `hsh2(a, b)` seeded by index and frame; never `Math.random`.

```js
// A hold that stays alive: one highlight per bar, a glow on every beat, a slow idle drift.
function holdPulse(ctx, env, items, x, y) {
  const P = env.palette, pulse = beatPulse(env, 6);
  let active = -1;
  onBars(env, 1, (i) => { active = i % items.length; });
  items.forEach((s, i) => {
    const on = i === active, dy = Math.sin(env.lt * 1.6 + i) * 3;
    chip(ctx, x, y + i * 64 + dy, s, { size: 22, bg: on ? P.accent : P.surface, fg: on ? P.onAccent : P.ink,
      shadowBlur: on ? 22 + 18 * pulse : 22 });
  });
}
```

## 3. Characters (one still, a lot of life)

A cutout (`P/assets/<name>.webp`, `meta.json {w, h, eyes?}`) cannot move its limbs, so the life comes from the
body: spring entrance (underdamped step), squash and stretch anchored at the feet, jelly (horizontal strips offset by
a damped sine growing toward the top), breathing (+-1.2 % scaleY), blink swap (`<name>_blink`), contact shadow that
shrinks in the air, beat bounce. Feet stay on a ground line; never upscale past ~1.0x of the source height.

```js
// Entrance, idle, anticipation and exit for a hero character; feet at (x, footY), h = on-screen height.
function heroCharacter(ctx, env, name, x, footY, h, enterBeat, o = {}) {
  const lt = since(env, enterBeat);
  if (lt < 0) return;
  const S = env.style.motion.spring || {};
  const ex = env.phase.out;                                              // anticipation squash, then leap up and out
  const squash = Math.sin(Math.PI * rm(ex, 0, 0.3)) * (1 - rm(ex, 0.3, 0.4)), jump = Ease.inC(rm(ex, 0.3, 1)) * 1250;
  ctx.save();
  ctx.translate(x, footY - jump); ctx.scale(1 + squash * 0.13, 1 - squash * 0.16 + (jump > 0 ? 0.12 : 0)); ctx.translate(-x, -footY);
  popChar(ctx, name, x, footY, h, lt, { fromY: o.fromY ?? 800, f: S.f ?? 2.2, z: S.z ?? 0.5, jelly: o.jelly ?? 18,
    seed: o.seed ?? 1, shadow: jump < 5 });
  ctx.restore();
}
```

Use `drawChar(ctx, name, x, y, h, {sx, sy, rot, flip, blink, jelly, jellyPhase})` when you drive the pose yourself
(riders, lineups). `blinkAt(t, seed)` gives each character its own blink period.

## 4. Kinetic type

| Helper | Use for |
|---|---|
| `kinetic(ctx, s, x, y, lt, {size, weight, fam, stagger, rise, blur, pop, colorFn, out})` | headlines: per-glyph rise + blur-in; `out: {at, stagger, dur}` exits glyph by glyph |
| `revealLine(ctx, s, x, y, p, o)` | sublines sliding up from behind a mask |
| `wipeText(ctx, s, x, y, p, {bar, out})` | titles revealed by a sweeping color bar |
| `scramble(s, p, seed, t)` | machine labels decoding left to right (draw at a fixed final width) |
| `typewriter(ctx, s, x, y, lt, {cps, caretAfter})` | commands, chat input, logs |
| `fitSize(ctx, s, maxW, {size, min})` | one size that fits the longest of several lines |

```js
// Headline lines with one accent keyword each; enters on beats, exits glyph by glyph at the out-phase.
function headline(ctx, env, lines, x, y, beat0, o = {}) {
  const P = env.palette, size = o.size || 72;
  lines.forEach((ln, i) => {
    const start = beat0 + i * (o.stepBeats ?? 0.5), lt = since(env, start);
    if (lt < 0) return;
    const chars = [...ln.s], k0 = ln.hi ? [...ln.s.slice(0, ln.s.indexOf(ln.hi))].length : -1, k1 = ln.hi ? k0 + [...ln.hi].length : -1;
    kinetic(ctx, ln.s, x, y + i * size * 1.18, lt, {
      size, weight: o.weight || 800, fam: o.fam || 'display', stagger: Math.min(0.035, 0.6 / chars.length), align: o.align,
      colorFn: (k) => (k >= k0 && k < k1 ? P.accent : P.ink),
      out: { at: env.dur - env.outSec - start * env.beatSec, stagger: 0.008, dur: 0.25 },
    });
  });
}
// One word per beat, weight 300 -> 900 as it lands; returns seconds since the beat for flashes and shakes.
function slamWords(ctx, env, words, x, y, o = {}) {
  const P = env.palette, b = Math.max(0, Math.floor(env.lt / env.beatSec)), bl = env.lt - b * env.beatSec;
  const w = words[Math.min(b, words.length - 1)];
  const pop = 1 + 0.14 * Math.exp(-bl * 16), weight = Math.round(lerp(300, 900, Ease.outExpo(clamp(bl / 0.2))));
  ctx.save(); ctx.translate(x, y); ctx.scale(pop, pop);
  text(ctx, w, 0, 0, { size: o.size || 190, weight, fam: o.fam || 'display', align: 'center', color: o.color || P.ink, ls: -(o.size || 190) * 0.03 });
  ctx.restore();
  return bl;
}
```

Weight animation needs a variable font (or several weights loaded). Keep scrambles at their final width (measure the
final string, left-align at `x - width / 2`) or the line jitters.

## 5. Camera and backdrop

Never leave a frame static: drift the camera, breathe the backdrop. Camera moves are transforms around a focus point
applied to the world layers; screen-fixed UI (titles, disclaimers) is drawn after `ctx.restore()`. Whole-frame
accents go through `env.fx` (reset every frame; take the max, multiply zoom): `flash` 0..1 + `flashColor`, `shake`
(px), `zoom` (multiplier), `ca` (chromatic split), `invert`, `hud` and `captions` (0..1 visibility), `bloom`,
`vignette`, `grain`, `dark`. The compositor applies them after the scene, so the HUD and captions stay steady.

```js
// World camera: tiny drift always + optional push-in over the out-phase + shake. Call inside save()/restore().
function worldCamera(ctx, env, fx, fy, o = {}) {
  const z = (1 + 0.012 * Math.sin(env.lt * 0.9)) * (1 + (o.push ?? 0) * Ease.ioC(env.phase.out));
  const [sx, sy] = o.shake ? shake(env.lt, o.shake, o.seed || 3) : [0, 0];
  ctx.translate(fx + sx + Math.sin(env.lt * 0.6) * (o.drift ?? 5), fy + sy + Math.cos(env.lt * 0.5) * (o.drift ?? 4));
  ctx.scale(z, z);
  ctx.translate(-fx, -fy);
}
// Beat punch: the whole frame kicks 1-2 % on every beat (data and energetic reels).
function kickPunch(env, amount = 0.012, every = 1) { if (env.fx) env.fx.zoom *= 1 + amount * beatPulse(env, 11, every); }
// Backdrop kit: drifting color blobs, bokeh, a glossy floor or a perspective grid. Dark scenes (env.dark, or a dark
// palette) get a night stage from P.night even inside a light-themed reel.
function backdrop(ctx, env, o = {}) {
  const P = env.palette, t = env.lt, dark = env.dark || luma(P.bg) < 0.2;
  const base = dark ? P.night : P.bg, centre = dark ? mix(P.night, P.accent, 0.14) : mix(P.bg, '#FFFFFF', 0.4);
  ctx.fillStyle = radial(ctx, W / 2, H * 0.43, 40, 1250, [[0, centre], [1, dark ? mix(base, '#000000', 0.35) : P.bg2]]);
  ctx.fillRect(0, 0, W, H);
  softBlob(ctx, 380 + Math.sin(t * 0.45) * 60, 300 + Math.cos(t * 0.38) * 40, 520, rgba(P.accent3, dark ? 0.1 : 0.35));
  softBlob(ctx, 1560 + Math.cos(t * 0.4) * 70, 360 + Math.sin(t * 0.5) * 50, 560, rgba(P.accent2, dark ? 0.12 : 0.28));
  for (let i = 0; i < (o.bokeh ?? 14); i++) {
    const h1 = hash(i * 3.7 + 11), h2 = hash(i * 5.3 + 2), x = ((h1 * 2200 + t * (14 + h2 * 22)) % 2200) - 140;
    softBlob(ctx, x, 80 + h2 * 640 + Math.sin(t + i) * 18, 10 + hash(i * 9.1) * 34, dark ? P.accent : '#FFFFFF', (0.12 + 0.2 * h1) * (dark ? 0.4 : 1));
  }
  if (o.floorY) {                                  // glossy floor + horizon highlight
    const hi = dark ? P.accent : '#FFFFFF';
    ctx.fillStyle = linear(ctx, 0, o.floorY, 0, H, dark ? [[0, rgba(P.accent, 0.06)], [1, rgba('#000000', 0.3)]] : [[0, rgba('#FFFFFF', 0.7)], [1, rgba(P.bg2, 0.6)]]);
    ctx.fillRect(0, o.floorY, W, H - o.floorY);
    ctx.fillStyle = linear(ctx, 0, 0, W, 0, [[0, rgba(hi, 0)], [0.2, rgba(hi, dark ? 0.35 : 0.9)], [0.8, rgba(hi, dark ? 0.35 : 0.9)], [1, rgba(hi, 0)]]);
    ctx.fillRect(0, o.floorY - 1, W, 2);
  }
  if (o.grid) {                                   // receding perspective floor grid; lines flow toward the camera
    const hz = o.grid, ph = (t * 0.55) % 1;
    ctx.save(); ctx.beginPath(); ctx.rect(0, hz, W, H - hz); ctx.clip();
    ctx.strokeStyle = rgba(P.accent, 0.1); ctx.lineWidth = 1.5; ctx.beginPath();
    for (let i = -16; i <= 16; i++) { ctx.moveTo(W / 2 + i * 14, hz); ctx.lineTo(W / 2 + i * 200, H); }
    ctx.stroke();
    for (let k = 0; k < 14; k++) {
      const s = (k + ph) / 14, y = hz + (H - hz) * Math.pow(s, 2.3);
      ctx.strokeStyle = rgba(P.accent, 0.16 * s); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.restore();
  }
}
```

## 6. Drop + splash

A drop falls (ease-in, stretched by speed, shadow growing under it), hits on a beat, and the floor answers: flash,
a liquid crown, droplets on ballistic arcs stretched along their velocity, three ripple ellipses (ry = 0.16 rx) in a
highlight plus an accent-tinted line so they read on light and dark floors. Land it on the floor plane a little in
front of the horizon line (`floorY` 20-60 px below it) so the ripples lie on the floor. Cue the hit on the beat.

```js
function dropSplash(ctx, env, x, floorY, hitBeat, o = {}) {
  const P = env.palette, col = o.color || P.accent, k = since(env, hitBeat), fall = o.fall ?? 0.65;
  if (k < -fall) return;
  if (k < 0) {                                              // falling: ends exactly on the beat
    const u = 1 + k / fall, y = lerp(-80, floorY, Ease.inQ(u)), r = 26, L = r * (2.7 + 1.4 * u);
    groundShadow(ctx, x, floorY, lerp(24, 100, u * u), 0.05 + 0.25 * u * u);
    ctx.save(); ctx.translate(x, y);
    ctx.beginPath(); ctx.moveTo(0, -L); ctx.bezierCurveTo(r * 0.3, -L * 0.62, r, -r * 1.55, r, -r);
    ctx.arc(0, -r, r, 0, Math.PI); ctx.bezierCurveTo(-r, -r * 1.55, -r * 0.3, -L * 0.62, 0, -L); ctx.closePath();
    ctx.fillStyle = linear(ctx, 0, -L, 0, 0, [[0, rgba(col, 0.5)], [1, rgba(col, 0.92)]]); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.ellipse(-r * 0.38, -r * 1.25, r * 0.17, r * 0.42, -0.35, 0, TAU); ctx.fill();
    ctx.restore();
    return;
  }
  for (let j = 0; j < 3; j++) {                             // ripples, staggered 0.12 s: highlight + tinted line
    const q = (k - j * 0.12) / 1.4;
    if (q <= 0 || q >= 1) continue;
    const rx = 24 + (560 - j * 90) * Ease.outC(q), a = Math.pow(1 - q, 1.6);
    ctx.strokeStyle = rgba('#FFFFFF', 0.9 * a); ctx.lineWidth = 3 * (1 - q) + 1;
    ctx.beginPath(); ctx.ellipse(x, floorY, rx, rx * 0.16, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = rgba(col, 0.5 * a); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(x, floorY + 3, rx * 0.97, rx * 0.155, 0, 0, TAU); ctx.stroke();
  }
  if (k < 0.34) {                                           // liquid crown: spikes rise and fall back
    const q = k / 0.34, rx = 20 + 62 * Ease.outC(q), ry = rx * 0.16, hgt = 58 * Math.sin(Math.PI * Math.pow(q, 0.7));
    ctx.save(); ctx.globalAlpha *= 1 - Ease.inQ(q); ctx.beginPath();
    for (let i = 0; i <= 96; i++) {
      const th = (i / 96) * TAU, sp = 0.45 + 0.55 * Math.pow(Math.abs(Math.cos(th * 5)), 6);
      ctx.lineTo(x + Math.cos(th) * rx * (1 + 0.12 * sp), floorY + Math.sin(th) * ry - hgt * sp);
    }
    for (let i = 96; i >= 0; i--) { const th = (i / 96) * TAU; ctx.lineTo(x + Math.cos(th) * rx * 0.8, floorY + Math.sin(th) * ry * 0.8); }
    ctx.closePath(); ctx.fillStyle = linear(ctx, 0, floorY - 60, 0, floorY + 10, [[0, rgba(mix('#FFFFFF', col, 0.35), 0.8)], [1, rgba(col, 0.6)]]); ctx.fill();
    ctx.restore();
  }
  const g = 2300;                                           // droplets: gravity in px/s^2, stretched along velocity
  for (let i = 0; i < 16; i++) {
    const vx = (i % 2 ? 1 : -1) * (90 + hash(i * 4.1) * 420), vy = -(380 + hash(i * 2.3) * 560), life = -2 * vy / g;
    if (k > life) continue;
    const r = (3 + hash(i * 6.7) * 6) * (1 - 0.65 * k / life), sp = Math.hypot(vx, vy + g * k), st = 1 + sp / 1400;
    ctx.beginPath(); ctx.ellipse(x + vx * k, floorY - 6 + vy * k + 0.5 * g * k * k, r * st, r / Math.sqrt(st), Math.atan2(vy + g * k, vx), 0, TAU);
    ctx.fillStyle = rgba(col, 0.85); ctx.fill();
  }
  const f = rm(k, 0, 0.28);                                 // flash + sparkle on the hit
  if (f < 1) { softBlob(ctx, x, floorY - 10, 60 + 260 * Ease.outC(f), '#FFFFFF', 0.85 * (1 - Ease.outQ(f))); sparkle(ctx, x, floorY - 14, 46 * (1 - f), 1, f, mix('#FFFFFF', col, 0.3)); }
}
```

Hold: the ripples finish in 1.5 s; in longer cuts schedule a smaller re-drip with `onBars(env, 2, ...)`.

## 7. Emerging objects with reflections

Objects rise through a glossy floor (clipped at the floor line), spring with overshoot turned into an upward stretch
anchored at the foot (they never hover), settle with a squash, then a reflection fades in under them.

```js
function emerge(ctx, env, key, x, floorY, h, beat, o = {}) {
  const k = since(env, beat);
  if (k <= 0) return;
  const p = spring(k, o.f ?? 1.7, o.z ?? 0.55), up = Math.min(p, 1), over = Math.max(0, p - 1);
  const sy = 1 + over * 0.7 - wob(k - 0.45, 2.6, 5.5) * 0.06, sx = 1 / Math.sqrt(sy);
  groundShadow(ctx, x, floorY, h * 0.9, 0.26 * up);
  ctx.save(); ctx.beginPath(); ctx.rect(x - 400, 0, 800, floorY); ctx.clip();          // rises through the floor slit
  drawProd(ctx, key, x, floorY + (1 - up) * (h + 30), h, { sx, sy });
  ctx.restore();
  drawReflection(ctx, key, x, floorY, h, 0.24 * Ease.outC(rm(k, 0.55, 1.1)));
  const glow = 1 - rm(k, 0.1, 0.6);                                                   // light at the slit while emerging
  if (glow > 0) { ctx.save(); ctx.translate(x, floorY); ctx.scale(1, 0.18); softBlob(ctx, 0, 0, h * 0.6, '#FFFFFF', glow * 0.9); ctx.restore(); }
}
// Specular sheen over any drawing (objects, logos, cards): k = 0..1 sweep progress.
function sheenOver(ctx, drawFn, box, k, o = {}) {
  if (!sheenOver.buf) sheenOver.buf = makeBuf();
  const g = sheenOver.buf.g;
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H);
  drawFn(g);
  if (k > 0 && k < 1) {
    const x = lerp(box.x - box.w * 0.4, box.x + box.w * 1.4, Ease.ioQ(k)), band = o.width ?? 80;
    g.globalCompositeOperation = 'source-atop';
    g.save(); g.translate(x, box.y); g.transform(1, 0, -0.35, 1, 0, 0);
    g.fillStyle = linear(g, -band / 2, 0, band / 2, 0, [[0, 'rgba(255,255,255,0)'], [0.5, `rgba(255,255,255,${o.a ?? 0.55})`], [1, 'rgba(255,255,255,0)']]);
    g.fillRect(-band / 2, -box.h, band, box.h * 3); g.restore();
  }
  ctx.drawImage(sheenOver.buf.c, 0, 0);
}
```

Hold: `onBars(env, 1, (i, dt) => k = rm(dt, 0, 0.8))` re-runs the sheen once per bar.

## 8. Reticle lock-on

Four corner brackets start 1.5x and rotated, snap onto the target with `outExpo` in 0.35 s, pulse once on lock; a
scan line ping-pongs inside; a callout decodes its label. Cue two soft beeps on the lock beat and 1/4 beat later.

```js
function reticle(ctx, env, bb, beat, label, sub) {
  const P = env.palette, k = since(env, beat);
  if (k <= 0) return;
  const p = Ease.outExpo(rm(k, 0, 0.35)), pulse = 1 + 0.035 * wob(k - 0.35, 4, 7) + 0.012 * beatPulse(env, 10);
  const cx = bb.x + bb.w / 2, cy = bb.y + bb.h / 2, sc = lerp(1.5, 1, p) * pulse, hw = (bb.w / 2) * sc, hh = (bb.h / 2) * sc, arm = 36;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(lerp(0.55, 0, p)); ctx.globalAlpha *= clamp(k / 0.12);
  ctx.strokeStyle = P.accent; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.shadowColor = rgba(P.accent, 0.6); ctx.shadowBlur = 12;
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    ctx.beginPath(); ctx.moveTo(sx * hw, sy * (hh - arm)); ctx.lineTo(sx * hw, sy * hh); ctx.lineTo(sx * (hw - arm), sy * hh); ctx.stroke();
  }
  ctx.restore();
  if (p > 0.95) {                                           // scan line, ping-pong every 0.62 s
    const ph = ((k - 0.35) / 0.62) % 2, y = lerp(bb.y + 8, bb.y + bb.h - 8, Ease.ioQ(ph < 1 ? ph : 2 - ph));
    ctx.save(); ctx.beginPath(); ctx.rect(bb.x, bb.y, bb.w, bb.h); ctx.clip();
    ctx.fillStyle = linear(ctx, bb.x, 0, bb.x + bb.w, 0, [[0, rgba(P.accent, 0)], [0.5, rgba(P.accent, 0.85)], [1, rgba(P.accent, 0)]]);
    ctx.fillRect(bb.x, y - 1, bb.w, 2); ctx.restore();
  }
  callout(ctx, bb.x + bb.w + 6, bb.y + 10, rm(k, 0.2, 0.9), { label, sub, dx: 1, dy: -1, len: 140, seed: 7, t: env.lt });
}
```

## 9. Halo

A blurred conic gradient built once (static, keyed by its radius), rotated slowly and pulsed on downbeats behind
the hero. Alive in any hold.

```js
function halo(ctx, env, x, y, r, a = 1) {
  const P = env.palette;
  if (!halo.buf || halo.r !== r) {
    const S = Math.ceil(r * 2.6), c = S / 2, b = makeBuf(S, S), g = b.g;
    const cg = g.createConicGradient(0, c, c), cols = [P.accent, P.accent3, P.accent2, mix(P.accent2, P.ok, 0.5), P.accent];
    cols.forEach((col, i) => cg.addColorStop(i / (cols.length - 1), mix('#FFFFFF', col, 0.55)));
    g.filter = 'blur(70px)'; circle(g, c, c, r); g.fillStyle = cg; g.fill(); g.filter = 'none';
    g.globalCompositeOperation = 'destination-in';
    g.fillStyle = radial(g, c, c, 0, r + 40, [[0, 'rgba(0,0,0,1)'], [0.5, 'rgba(0,0,0,0.9)'], [0.78, 'rgba(0,0,0,0.4)'], [1, 'rgba(0,0,0,0)']]);
    g.fillRect(0, 0, S, S);
    halo.buf = b; halo.r = r;
  }
  const S = halo.buf.c.width, pulse = 1 + 0.02 * Math.sin(env.lt * 1.6) + 0.05 * beatPulse(env, 4, 4);
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(env.lt * 0.35); ctx.scale(pulse, pulse);
  ctx.drawImage(halo.buf.c, -S / 2, -S / 2); ctx.restore();
}
```

## 10. Outline morph

One outline becomes another: both point lists have the same count, start point, and direction
(`archPoints`, `phonePoints`, `roundRectPoints`, `circlePoints` all start at the bottom centre and go left first).
For shapes with corners, resample per segment with matching counts so corners map to corners. The stroke thickens,
glows, and a glint travels along it. The new body must ride the outline, not pop in at its final place: draw it
through `apply(ctx)`, which maps the target's bounding box onto the morphing outline's box, and fade it in over the
last 20 %; the outline then fades so no double rim remains. Put the same outline in the outgoing scene's last frame
and this scene's first frame and use a `cut` or `match` transition.

```js
// Returns {m, apply}: m = morph progress 0..1; apply(ctx) maps target-shape coordinates onto the current outline.
function outlineMorph(ctx, env, fromPts, toPts, beat, o = {}) {
  const P = env.palette, D = o.dur ?? 0.65, lt = since(env, beat), k = rm(lt, 0, D), m = Ease.ioC(k);
  const pts = k <= 0 ? fromPts : morphPoints(fromPts, toPts, m), glow = Math.sin(Math.PI * k);
  const box = (q) => q.reduce((b, [x, y]) => [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)], [1e9, 1e9, -1e9, -1e9]);
  const cb = box(pts), tb = box(toPts);
  const apply = (c) => { c.translate(cb[0], cb[1]); c.scale((cb[2] - cb[0]) / (tb[2] - tb[0] || 1), (cb[3] - cb[1]) / (tb[3] - tb[1] || 1)); c.translate(-tb[0], -tb[1]); };
  const fade = 1 - Ease.outC(rm(lt, D, D + 0.15));
  if (fade > 0) {
    ctx.save(); ctx.globalAlpha *= fade; ctx.lineJoin = 'round';
    ctx.shadowColor = rgba(o.color || P.accent, 0.7); ctx.shadowBlur = 26 * glow;
    ctx.strokeStyle = o.color || P.accent; ctx.lineWidth = lerp(o.w0 ?? 3, o.w1 ?? 12, m);
    pathFrom(ctx, pts, true); ctx.stroke(); ctx.restore();
  }
  if (k > 0 && k < 1) { const g1 = pointAt(pts, m), g2 = pointAt(pts, (m + 0.5) % 1); sparkle(ctx, g1.x, g1.y, 22, glow, k * 3); sparkle(ctx, g2.x, g2.y, 16, glow * 0.8, -k * 3); }
  return { m, apply };
}
// Usage: const mo = outlineMorph(ctx, env, archPts, phonePts, 0);
// if (mo.m > 0.8) { ctx.save(); mo.apply(ctx); withAlpha(ctx, rm(mo.m, 0.8, 1), () => phoneFrame(ctx, env, R, drawScreen)); ctx.restore(); }
```

Draw the body before the outline in the same frame if the outline should sit on top while it fades.

## 11. Real UI in a device

Real captured layers (`capture_ui.mjs`, `capture.md`) animated inside a vector device frame. Capture layers, not
screens: the base, the welcome screen, each bubble (with `textFree` and `rows`), each state of a component (`states`
on a static clone). Every layer's json sidecar records its rect, radii, and text rows; captures are made at the
device's web-view size, so 1 CSS px = 1 reel px inside the drawn phone. Move only the content band when
cross-fading screens (header and tab bar are identical; moving them ghosts the text). Typing is revealed from the
real bubble raster, whole characters at a time, while the shell grows a row at a time.

```js
// Phone frame; drawScreen(ctx, s) paints inside the clipped screen rect s = {x, y, w, h, r}.
function phoneFrame(ctx, env, r, drawScreen, o = {}) {
  const P = env.palette, inset = o.inset ?? 14, rad = o.radius ?? r.w * 0.16;
  const s = { x: r.x + inset, y: r.y + inset, w: r.w - inset * 2, h: r.h - inset * 2, r: rad - inset };
  ctx.save(); ctx.shadowColor = rgba(P.shadow, 0.3); ctx.shadowBlur = 70; ctx.shadowOffsetY = 34;
  rr(ctx, r.x, r.y, r.w, r.h, rad); ctx.fillStyle = o.frame || linear(ctx, r.x, r.y, r.x + r.w, r.y + r.h, [[0, mix(P.surface, P.accent3, 0.35)], [1, mix(P.ink, P.accent3, 0.45)]]); ctx.fill();
  ctx.restore();
  ctx.save(); rr(ctx, s.x, s.y, s.w, s.h, s.r); ctx.clip();
  ctx.fillStyle = o.screen || '#FFFFFF'; ctx.fillRect(s.x, s.y, s.w, s.h);
  drawScreen(ctx, s);
  ctx.restore();
  rr(ctx, r.x + r.w / 2 - 56, s.y + 9, 112, 30, 15); ctx.fillStyle = '#111111'; ctx.fill();   // dynamic island
  return s;
}
// Typing from the real bubble: img = the captured layer (capture_ui.mjs `layer` with `rows: true, textFree: true`),
// bg = its `<name>.textfree.png`, r = on-screen rect of the captured image (1 CSS px = 1 reel px in the drawn device),
// rows = the layer json's `rows` [{x0, x1, y0, y1, cx: [right edge of each character]}] (CSS px of the captured box).
// Whole characters appear at o.cps; the shell grows a row at a time; o.radii = the layer json's corner radii.
// Capture the layer with pad 0 (the default) so the image is exactly the bubble's box.
function typedBubble(ctx, env, img, bg, r, rows, beat, o = {}) {
  const lt = since(env, beat);
  if (lt < 0 || !img || !bg || !rows || !rows.length) return;
  const s = r.w / (img.width / (o.dpr ?? 3)), cps = o.cps ?? 24, full = img.height * (r.w / img.width);
  const last = rows[rows.length - 1], padB = full / s - last.y1, at = [];
  let acc = 0;
  rows.forEach((q) => { at.push(acc / cps); acc += q.cx.length + 3; });              // each row starts after the previous (+3 chars pause)
  let ext = rows[0].y1;
  for (let i = 1; i < rows.length; i++) ext += Ease.outBack(rm(lt, at[i] - 0.03, at[i] + 0.17), 2.2) * (rows[i].y1 - rows[i - 1].y1);
  const h = Math.min(full, (ext + padB) * s), ax = r.x + r.w, ay = r.y + h, pop = lerp(0.55, 1, spring(lt, 3, 0.7));
  ctx.save(); ctx.globalAlpha *= Ease.outC(rm(lt, 0, 0.1));
  ctx.translate(ax, ay); ctx.scale(pop, pop); ctx.translate(-ax, -ay);                // pops from its tail corner
  ctx.save(); ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, h, (o.radii || [22, 22, 8, 22]).map((v) => v * s)); ctx.clip();
  ctx.drawImage(bg, r.x, r.y, r.w, full);
  let caret = null;
  ctx.save(); ctx.beginPath();
  rows.forEach((q, i) => {
    const k = Math.min(q.cx.length, Math.floor((lt - at[i]) * cps));
    if (k <= 0) return;
    ctx.rect(r.x, r.y + q.y0 * s - 2, k < q.cx.length ? q.cx[k - 1] * s + 1 : r.w, (q.y1 - q.y0) * s + 4);
    caret = [r.x + q.cx[k - 1] * s + 1.5, r.y + q.y0 * s, (q.y1 - q.y0) * s];
  });
  ctx.clip(); ctx.drawImage(img, r.x, r.y, r.w, full);
  ctx.restore();
  ctx.restore();
  const done = lt > at[at.length - 1] + last.cx.length / cps;
  if (caret && (!done || Math.floor(lt * 2.5) % 2 === 0)) { ctx.fillStyle = o.caret || env.palette.ink; ctx.fillRect(caret[0], caret[1], 1.8, caret[2]); }
  ctx.restore();
}
// Progress card stepping through captured states (state images from a static clone), one step per `every` beats.
function progressStates(ctx, env, states, r, beat, every = 0.5) {
  const k = since(env, beat);
  if (k < 0 || !states.length) return;
  const per = every * env.beatSec, i = Math.min(states.length - 1, Math.floor(k / per)), s = lerp(0.6, 1, spring(k, 2.6, 0.62));
  ctx.save(); ctx.globalAlpha *= Ease.outC(rm(k, 0, 0.12));
  ctx.translate(r.x, r.y + r.h); ctx.scale(s, s); ctx.translate(-r.x, -(r.y + r.h));
  drawImageFit(ctx, states[Math.max(0, i - 1)], r.x, r.y, r.w, r.h, { fit: 'fill', radius: 24 });
  withAlpha(ctx, Ease.outC(rm(k - i * per, 0, 0.1)), () => drawImageFit(ctx, states[i], r.x, r.y, r.w, r.h, { fit: 'fill', radius: 24 }));
  ctx.restore();
}
```

Hold: the caret blinks; with more bars, step to the next captured state or scroll the content band one row per bar.
Never pause CSS animations when capturing (entrances freeze at opacity 0); clone the element to beat app timers.

## 12. Flying chips

Chips leave a source (a bubble, a document) along curved paths and land in a grid with a scale wobble and a ring.
Land bottom-up so a flying chip never crosses a landed one; draw landed chips first, flying ones on top. Columns
align on their left edges (chips differ in width).

```js
// items: [{label, icon, color}], from: [x, y], slots: [[x, y]] = left edge and vertical centre of each chip.
function flyingChips(ctx, env, items, from, slots, beat, o = {}) {
  const P = env.palette, FL = o.flight ?? 0.36, step = o.step ?? env.beatSec / 4, size = o.size ?? 22;
  const chipW = (it) => measure(ctx, it.label, { size, weight: 600 }) + size * 1.5 + (it.icon ? size * 1.6 : 0);   // = chip()'s width
  const order = items.map((_, i) => i).sort((a, b) => slots[b][1] - slots[a][1] || slots[b][0] - slots[a][0]);
  const live = order.map((i, k) => ({ i, lt: since(env, beat) - k * step })).filter((c) => c.lt >= 0)
    .sort((a, b) => (a.lt < FL) - (b.lt < FL));
  let hi = -1;
  onBars(env, 1, (n) => { hi = n % items.length; });                      // hold: one chip glows per bar
  for (const c of live) {
    const it = items[c.i], to = [slots[c.i][0] + chipW(it) / 2, slots[c.i][1]], kf = clamp(c.lt / FL), e = Ease.outC(kf), land = c.lt - FL;
    const ctl = [lerp(from[0], to[0], 0.5), Math.min(from[1], to[1]) - 120];
    const [x, y] = kf < 1 ? qbez(from, ctl, to, e) : [to[0], to[1] + Math.sin(env.lt * 1.8 + c.i) * 2.2];
    if (kf < 1) for (let j = 1; j <= 4; j++) { const q = qbez(from, ctl, to, Ease.outC(clamp(kf - j * 0.06))); sparkle(ctx, q[0], q[1], 9 - j * 1.5, (1 - kf) * (1 - j / 5), j + env.lt * 4); }
    ctx.save(); ctx.translate(x, y);
    ctx.rotate(kf < 1 ? (1 - e) * (c.i % 2 ? 0.1 : -0.1) : 0.04 * wob(land, 2.5, 8));
    const sc = kf < 1 ? lerp(0.5, 0.94, e) : 1 + 0.1 * wob(land, 3.2, 9);
    ctx.scale(sc, sc);
    const w = chip(ctx, 0, 0, it.label, { align: 'center', size, icon: it.icon, iconColor: it.color || P.accent,
      stroke: c.i === hi ? P.accent : null, shadowBlur: c.i === hi ? 30 : 22 });
    if (land > 0 && land < 0.25) {
      const q = land / 0.25;
      ctx.strokeStyle = rgba(P.accent, 0.5 * (1 - q)); ctx.lineWidth = 2;
      const hh = size * 1.9; rr(ctx, -w / 2 - 10 * q, -hh / 2 - 10 * q, w + 20 * q, hh + 20 * q, hh / 2 + 10 * q); ctx.stroke();
    }
    ctx.restore();
  }
}
```

## 13. Magnifier lens

Draw the content (cards) into an offscreen layer, draw the layer to the screen, then draw the lens: a circular clip
of the same layer scaled by `mag` around the lens centre (true magnification, not blur), rim, glass highlight, handle.
The lens travels on an arc between keyframes and pauses over each target before its stamp lands.

```js
function magnifier(ctx, env, src, x, y, R = 110, mag = 1.6) {
  const P = env.palette;
  ctx.save();
  ctx.fillStyle = radial(ctx, x + 22, y + 34, R * 0.6, R * 1.35, [[0, rgba(P.shadow, 0.18)], [1, rgba(P.shadow, 0)]]);
  ctx.fillRect(x - R * 2, y - R * 2, R * 4.5, R * 4.5);
  ctx.translate(x, y); ctx.rotate(Math.PI / 4);                                   // handle
  rr(ctx, R + 4, -15, 150, 30, 15); ctx.fillStyle = linear(ctx, 0, -15, 0, 15, [[0, mix('#FFFFFF', P.accent3, 0.4)], [1, mix(P.ink, P.accent3, 0.5)]]); ctx.fill();
  ctx.restore();
  ctx.save(); circle(ctx, x, y, R); ctx.clip();                                    // the same pixels, magnified
  ctx.translate(x, y); ctx.scale(mag, mag); ctx.translate(-x, -y); ctx.drawImage(src, 0, 0);
  ctx.restore();
  ctx.save();
  ctx.lineWidth = 14; ctx.strokeStyle = linear(ctx, x - R, y - R, x + R, y + R, [[0, mix('#FFFFFF', P.accent3, 0.3)], [0.5, P.accent3], [1, mix(P.ink, P.accent3, 0.6)]]);
  circle(ctx, x, y, R + 7); ctx.stroke();
  ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath(); ctx.arc(x, y, R * 0.8, Math.PI * 1.08, Math.PI * 1.42); ctx.stroke();
  ctx.restore();
}
// keys: [[beat, x, y], ...]; equal consecutive x = dwell; travel arcs up by 80 px.
function lensAt(env, keys) {
  for (let i = 1; i < keys.length; i++) {
    const [b0, x0, y0] = keys[i - 1], [b1, x1, y1] = keys[i];
    if (env.lt <= b1 * env.beatSec) {
      const k = Ease.ioC(rm(env.lt, b0 * env.beatSec, b1 * env.beatSec)), lift = x0 === x1 ? 0 : Math.sin(Math.PI * k) * 80;
      return [lerp(x0, x1, k), lerp(y0, y1, k) - lift];
    }
  }
  const last = keys[keys.length - 1];
  return [last[1] + Math.cos(env.lt * 7) * 3, last[2] + Math.sin(env.lt * 9) * 2];        // hand jitter while it waits
}
```

## 14. Beat stamps

The stamp drops from 2.2x with `outBack`, rotated, casting a shadow only while falling, and lands exactly on the
beat (start 0.1 s early). On landing: ink blends into the paper (`multiply` on light themes; glow on dark), splatter
dots, a ring, a card squash, and a 3-px camera shake. The stamped card dims slightly.

```js
function stamp(ctx, env, label, x, y, beat, o = {}) {
  const P = env.palette, col = o.color || P.deny, tl = since(env, beat);   // tl = 0 when it lands
  if (tl < -0.1) return;
  const p = clamp((tl + 0.1) / 0.22), s = lerp(2.2, 1, Ease.outBack(p, 2.4)), ang = ((o.angle ?? -7) * Math.PI) / 180;
  const size = o.size || 30, w = measure(ctx, label, { size, weight: 800, fam: o.fam }) + size * 1.3, h = size * 1.8;
  const dark = o.dark ?? (env.dark || luma(P.bg) < 0.2);
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang - (1 - p) * 0.12); ctx.scale(s, s); ctx.globalAlpha *= clamp((tl + 0.1) / 0.06);
  if (p < 1) { ctx.shadowColor = rgba(col, 0.22 * (1 - p)); ctx.shadowBlur = 16 * (1 - p); ctx.shadowOffsetY = 6 * (1 - p); }
  rr(ctx, -w / 2, -h / 2, w, h, size * 0.45); ctx.fillStyle = rgba(col, dark ? 0.16 : 0.06); ctx.fill();
  ctx.shadowColor = dark ? rgba(col, 0.8) : 'transparent'; ctx.shadowBlur = dark ? 22 : 0; ctx.shadowOffsetY = 0;
  if (!dark) ctx.globalCompositeOperation = 'multiply';
  ctx.lineWidth = 4; ctx.strokeStyle = rgba(col, 0.92); ctx.stroke();
  text(ctx, label, 0, size * 0.35, { size, weight: 800, fam: o.fam, color: col, align: 'center' });
  ctx.restore();
  if (tl <= 0) return;
  const k = Ease.outC(clamp(tl / 0.16));
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.fillStyle = rgba(col, 0.5 * clamp(tl / 0.04));
  for (let j = 0; j < 6; j++) {                                           // splatter to the sides and below
    const an = lerp(-0.1, 1.1, (j + 0.15 + hsh2(o.seed || 1, j) * 0.7) / 6) * Math.PI, off = (4 + hsh2((o.seed || 1) + 3, j) * 9) * lerp(0.4, 1, k);
    circle(ctx, Math.cos(an) * (w / 2 + off), Math.sin(an) * (h / 2 + off), (2.2 + hsh2((o.seed || 1) + 7, j) * 2.6) * lerp(0.5, 1, k)); ctx.fill();
  }
  const rk = clamp(tl / 0.35), e = 1 + Ease.outC(rk) * 0.3;
  if (rk < 1) { ctx.strokeStyle = rgba(col, 0.45 * (1 - rk)); ctx.lineWidth = 3 * (1 - rk) + 0.5; rr(ctx, (-w / 2) * e, (-h / 2) * e, w * e, h * e, size * 0.45 * e); ctx.stroke(); }
  ctx.restore();
}
// Card squash and camera shake for a stamp that landed at `beat` (apply to the card / world transform).
function stampKick(env, beat) {
  const st = since(env, beat);
  if (st <= 0 || st > 0.5) return { sx: 1, sy: 1, dx: 0, dy: 0 };
  const q = Math.exp(-st * 10) * Math.cos(st * 34) * 0.055, e = Math.exp(-st * 16) * 3;
  return { sx: 1 + q * 0.6, sy: 1 - q, dx: Math.sin(st * 95) * e, dy: Math.cos(st * 120) * e };
}
```

Hold: in longer cuts the lens moves to the next card and the next stamp lands on the next bar line.

## 15. Map route rider

A static map (built once into a buffer), pins dropping with bounce, a route drawn leg by leg with marching dashes,
and a character riding the head: hops tied to the distance travelled, facing its direction, bouncing on the beat when
it arrives. Clock and budget counters follow the same progress function, so they stay in sync.

```js
function pinDrop(ctx, env, x, y, beat, o = {}) {
  const P = env.palette, lt = since(env, beat);
  if (lt < 0) return;
  const r = 22, fall = 0.22, d = r * 2.05, al = Math.acos(r / d);
  const off = lt < fall ? -95 * (1 - Ease.inQ(lt / fall)) : -26 * Math.abs(Math.sin((Math.PI * (lt - fall)) / 0.22)) * Math.exp(-(lt - fall) * 7);
  const sq = wob(lt - fall, 4, 7) * 0.22;
  groundShadow(ctx, x, y + 2, r * 2.4, 0.3 * (1 - clamp(-off / 95)));
  ctx.save(); ctx.translate(x, y + off); ctx.scale(1 + sq, 1 - sq); ctx.globalAlpha *= clamp(lt / 0.08);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, -d, r, Math.PI / 2 + al, Math.PI / 2 - al + TAU); ctx.closePath();
  ctx.fillStyle = linear(ctx, 0, -d - r, 0, 0, [[0, mix('#FFFFFF', o.color || P.accent, 0.7)], [1, o.color || P.accent]]); ctx.fill();
  circle(ctx, 0, -d, r * 0.4); ctx.fillStyle = '#FFFFFF'; ctx.fill();
  ctx.restore();
}
// legs: [[fromBeat, toBeat, u0, u1]] along pts (u = fraction of the route length). Returns the head progress u.
// Draw order: map -> routeRider -> pins and labels, so the stops stay on top of the rider.
function routeRider(ctx, env, pts, legs, name, h = 200, o = {}) {
  const P = env.palette, L = pathLen(pts), lag = o.lag ?? 45;               // the rider follows 45 px behind the glowing head
  const uAt = (lt) => { let u = 0; for (const [b0, b1, u0, u1] of legs) if (lt >= b0 * env.beatSec) u = lerp(u0, u1, Ease.ioC(rm(lt, b0 * env.beatSec, b1 * env.beatSec))); return u; };
  const u = uAt(env.lt);
  if (u <= 0) return 0;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  polyStroke(ctx, pts, u); ctx.strokeStyle = rgba(P.accent, 0.28); ctx.lineWidth = 24; ctx.stroke();
  polyStroke(ctx, pts, u); ctx.setLineDash([18, 14]); ctx.lineDashOffset = -env.lt * 40;
  ctx.strokeStyle = P.accent; ctx.lineWidth = 8; ctx.stroke();
  ctx.restore();
  const v = ((uAt(env.lt + 0.01) - uAt(env.lt - 0.01)) * L) / 0.02, moving = clamp(Math.abs(v) / 500);
  const tip = pointAt(pts, u);
  orb(ctx, tip.x, tip.y, 14 * (1 + 0.08 * Math.sin(env.lt * 9)), env.lt * 2.5, u < 1 ? Math.max(moving, 0.6) : moving);   // gone on arrival
  const sb = clamp(u * L - lag, Math.min(20, u * L), L - lag), head = pointAt(pts, sb / L), ph = sb / 62, rest = beatHop(env, 0);
  const hop = Math.abs(Math.sin(Math.PI * ph)) * 24 * moving + rest.hop * 8 * (1 - moving), c = Math.cos(TAU * ph) * moving;
  groundShadow(ctx, head.x, head.y + 3, h * 0.5 * (1 - hop / 160), 0.28);
  drawChar(ctx, name, head.x, head.y - hop, h, { flip: Math.cos(head.a) < 0, sx: 1 + 0.05 * c + rest.sq * (1 - moving), sy: 1 - 0.07 * c - rest.sq * (1 - moving),
    rot: Math.sin(TAU * ph) * 0.05 * moving, blink: blinkAt(env.lt, 5) });
  return u;
}
```

`flip` assumes the cutout faces right. Label every map that is not a real map ("not a real map").

## 16. Dark climax kit

The stakes scene: a threat decodes, a barrier rises, a guard lands, the attack hits it on a downbeat, the verdict
stamps, and real log lines type in. The scene sets `"dark": true` in reel.config (the compositor adds the dark post);
the music drops to a breakdown and the hit gets the biggest cue of the reel.

```js
// drawBarrier(ctx) draws the gate/wall/shield standing on floorY; it rises from under the floor with a heavy spring.
function riseFromFloor(ctx, env, floorY, beat, drawBarrier, o = {}) {
  const lt = since(env, beat);
  if (lt < 0) return;
  const dy = (1 - spring(lt, o.f ?? 1.7, o.z ?? 0.74)) * (o.depth ?? 560);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, floorY + (o.base ?? 40)); ctx.clip();
  ctx.translate(0, dy); drawBarrier(ctx); ctx.restore();
  const fog = rm(lt, 0, 0.1) * (1 - rm(lt, 0.4, 0.7));                    // mist hides the clip line
  if (fog > 0) { ctx.save(); ctx.translate(o.cx ?? W / 2, floorY + (o.base ?? 40)); ctx.scale(1, 0.12); softBlob(ctx, 0, 0, o.fogR ?? 470, env.palette.night, fog); ctx.restore(); }
}
// Shards, shockwave rings and a core flash at (x, y) on the hit beat.
function impactBurst(ctx, env, x, y, beat, o = {}) {
  const P = env.palette, lt = since(env, beat), col = o.color || P.deny;
  if (lt < 0 || lt > 1.2) return;
  for (let i = 0; i < 2; i++) {
    const k = rm(lt, i * 0.08, i * 0.08 + 0.55);
    if (k <= 0 || k >= 1) continue;
    ctx.strokeStyle = rgba(i ? '#FFFFFF' : col, 0.9 * (1 - k)); ctx.lineWidth = 8 * (1 - k) + 1;
    circle(ctx, x, y, 18 + 300 * Ease.outC(k)); ctx.stroke();
  }
  for (let i = 0; i < 24; i++) {
    const a = Math.PI + (hash(i * 4.1) - 0.5) * 2.6 + (i % 5 === 0 ? Math.PI : 0), sp = 300 + hash(i * 2.9) * 650;
    const al = 1 - clamp(lt / (0.7 + hash(i * 6.3) * 0.5)), s = 4 + hash(i * 1.7) * 9;
    if (al <= 0) continue;
    ctx.save(); ctx.globalAlpha *= al;
    ctx.translate(x + Math.cos(a) * sp * lt, y + Math.sin(a) * sp * lt + 900 * lt * lt); ctx.rotate(lt * (6 + hash(i) * 10) + i);
    ctx.fillStyle = i % 3 ? col : '#FFFFFF'; ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.7, s * 0.6); ctx.lineTo(-s * 0.6, s * 0.4); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  softBlob(ctx, x, y, 160, '#FFFFFF', 1 - rm(lt, 0, 0.25));
}
// Frame accents for the same hit through the compositor: flash, decaying shake, chromatic split.
function impactFX(env, beat, o = {}) {
  const lt = since(env, beat);
  if (!env.fx || lt < 0 || lt > 1.5) return;
  env.fx.flash = Math.max(env.fx.flash, (o.flash ?? 0.75) * Math.exp(-lt * 14));
  env.fx.shake = Math.max(env.fx.shake, (o.shake ?? 16) * Math.exp(-lt * 5.5));
  env.fx.ca = Math.max(env.fx.ca, (o.ca ?? 0.8) * Math.exp(-lt * 10));
}
// Terminal-style log panel: REAL lines only, typed fast, one per beat offset. lines: [{s, beat, color}].
function logPanel(ctx, env, lines, r, title) {
  const P = env.palette;
  card(ctx, r.x, r.y, r.w, r.h, 20, { fill: rgba(P.night, 0.86), shadowBlur: 40, stroke: rgba('#FFFFFF', 0.12) });
  [P.deny, P.warn, P.ok].forEach((c, i) => { circle(ctx, r.x + 32 + i * 22, r.y + 26, 6); ctx.fillStyle = c; ctx.fill(); });
  text(ctx, title, r.x + 108, r.y + 32, { size: 16, fam: 'mono', color: P.muted });
  const noLig = (s) => [...s].join('\u200C');                              // stops mono fonts turning -> into ligatures
  lines.forEach((ln, i) => {
    const lt = since(env, ln.beat), next = lines[i + 1] ? (lines[i + 1].beat - ln.beat) * env.beatSec : 1e9;
    if (lt < 0) return;
    const s = noLig(ln.s);
    typewriter(ctx, s, r.x + 40, r.y + 88 + i * 34, lt, { size: 21, fam: 'mono', color: ln.color || P.ink, cps: [...s].length / 0.35,
      caretAfter: next, glow: rgba(ln.color || P.ink, 0.45), glowBlur: 8 });
  });
}
```

Hold: logs keep their caret blinking, the barrier's neon rim breathes (`0.65 + 0.15 * Math.sin(t * 3.1)`), the guard
blinks; in longer cuts a second (smaller) attempt is denied on a later bar line. Doors that slam use
`Ease.inExpo` on their width factor plus a damped wobble. For a `portalFlash` into the next scene, the scene object
returns the door opening from `portal(t, env)` and, while the doors swing open, calls
`env.portal?.(ctx, x, y, w, h)` with that rect so the next scene already shows through (section 33).

## 17. Card flip-out

A deliverable leaves its source (a character's paws, a phone) small, flies on an arc to its final rect while
flipping one full turn (scaleX = |cos|, back face when cos < 0), settles with a little overshoot, and its lines
reveal one by one. Edge-on, a sheen hides the face swap.

```js
// from = {x, y, s}; to = {x, y, w, h}; drawFront/drawBack(ctx, w, h) draw the card centred at 0,0.
function cardFlipOut(ctx, env, from, to, beat, drawFront, drawBack, o = {}) {
  const lt = since(env, beat), D = o.dur ?? 0.52;
  if (lt < 0) return;
  const k = rm(lt, 0, D), e = Ease.ioC(k), settle = Math.sin(Math.PI * rm(lt, D * 0.85, D * 1.35));
  const x = lerp(from.x, to.x, e) + settle * 22, y = lerp(from.y, to.y, e) - Math.sin(Math.PI * e) * 140 + Math.sin(env.lt * 1.7) * 6 * rm(lt, D + 0.1, D + 0.5);
  const sc = lerp(from.s, 1, e) * (1 + settle * 0.04), c = Math.cos(TAU * Ease.ioC(rm(lt, 0.04, D + 0.02)));
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(Math.PI * e) * -0.15); ctx.scale(sc * Math.max(Math.abs(c), 0.02), sc);
  (c >= 0 ? drawFront : drawBack)(ctx, to.w, to.h);
  const sheen = (1 - Math.abs(c)) * (1 - k * 0.6);
  if (sheen > 0.02) { rr(ctx, -to.w / 2, -to.h / 2, to.w, to.h, o.radius ?? 40); ctx.fillStyle = `rgba(255,255,255,${0.5 * sheen})`; ctx.fill(); }
  ctx.restore();
}
```

Inside `drawFront`, reveal rows with `revealLine(..., rm(since(env, beat + 0.5 + i * 0.25), 0, 0.5), ...)`. Fading a
multi-layer card: render it into one buffer first and fade the buffer, or the layers ghost through each other.

## 18. Beat-bouncing lineup

Characters hop up from below into a lineup (spring, landing squash, sparkles), then bounce on the beat: squash at
the contact (first 20 % of the beat), airborne for the rest; neighbours alternate on the off-beat.

```js
function beatHop(env, i, alt = 0.5) {
  const per = env.beatSec, ph = ((((env.lt - (i % 2) * per * alt) % per) + per) % per) / per;
  if (ph < 0.2) return { hop: 0, sq: Math.sin((Math.PI * ph) / 0.2) * 0.07 };
  const u = (ph - 0.2) / 0.8;
  return { hop: Math.sin(Math.PI * u), sq: -Math.sin(Math.PI * u) * 0.03 };
}
// cast: [{name, x, beat, h, seed}] with feet on footY; draw order: outside in, so the centre is on top.
function lineup(ctx, env, cast, footY) {
  cast.forEach((c, i) => {
    const lt = since(env, c.beat);
    if (lt < 0) return;
    const p = spring(lt, 2.4, 0.6), on = rm(lt, 0.75, 1.05), b = beatHop(env, i);
    const hop = b.hop * 16 * on, sq = wob(lt - 0.16, 3.2, 5.5) * 0.11 + b.sq * on, br = Math.sin(TAU * (lt * 0.8 + c.seed * 0.1)) * 0.01;
    groundShadow(ctx, c.x, footY + 4, c.h * 0.6 * (1 - hop / 120), 0.26 * clamp(lt / 0.25));
    drawChar(ctx, c.name, c.x, footY + (1 - p) * 640 - hop, c.h, { sx: 1 + sq + br * 0.4, sy: 1 - sq + br, alpha: clamp(lt / 0.06),
      blink: blinkAt(lt + c.seed * 3, c.seed), jelly: 16 * Math.exp(-lt * 2.6) * Math.sin(lt * 15), jellyPhase: lt * 9 });
    const sl = lt - 0.2;
    if (sl > 0 && sl < 0.6) for (let j = 0; j < 3; j++) {
      const an = -Math.PI / 2 + (j - 1) * 0.75, d = 30 + Ease.outC(sl / 0.6) * 60;
      sparkle(ctx, c.x + Math.cos(an) * d, footY - c.h - 10 + Math.sin(an) * d * 0.7, 9 + j * 2, Math.sin((Math.PI * sl) / 0.6) * 0.9, sl * 3);
    }
  });
}
```

## 19. Logo shine

The wordmark enters per glyph into a buffer, then a skewed specular band sweeps across the letters only
(`source-atop`), every 2 bars in long holds; a flare blooms on one letter at the end.

```js
function logoShine(ctx, env, s, x, y, beat, o = {}) {
  const P = env.palette, size = o.size || 140;
  if (!logoShine.buf) logoShine.buf = makeBuf(W, Math.ceil(size * 2.2));
  const g = logoShine.buf.g, bh = logoShine.buf.c.height, base = Math.round(bh * 0.7);
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, bh);
  const tw = kinetic(g, s, x, base, since(env, beat), { size, weight: o.weight || 400, fam: o.fam || 'display', align: 'center',
    stagger: 0.04, rise: 70, blur: 12, dur: 0.6, color: o.color || P.ink });
  const sweep = (k) => {
    if (k <= 0 || k >= 1) return;
    const bx = lerp(x - tw / 2 - 160, x + tw / 2 + 160, Ease.ioC(k));
    g.globalCompositeOperation = 'source-atop';
    g.save(); g.translate(bx, base - size * 0.45); g.transform(1, 0, -0.35, 1, 0, 0);
    g.fillStyle = linear(g, -35, 0, 35, 0, [[0, rgba(P.accent3, 0)], [0.5, rgba(mix('#FFFFFF', P.accent3, 0.5), 0.95)], [1, rgba(P.accent3, 0)]]);
    g.fillRect(-35, -size, 70, size * 2); g.restore();
    g.globalCompositeOperation = 'source-over';
  };
  sweep(rm(since(env, beat + 2), 0, 0.6));
  onBars(env, 2, (i, dt) => sweep(rm(dt, 0, 0.6)));
  ctx.drawImage(logoShine.buf.c, 0, y - base);
  return tw;
}
```

Didot-style hairline hyphens or dots disappear at display sizes: hide the glyph (`colorFn` returns transparent) and
draw a bar in its place from measured ink bounds.

## 20. HUD chrome

The global HUD belongs to the compositor; scenes keep its region empty. Configure it in `reel.config.json`:
`"hud": {"steps": [labels], "map": {sceneId: stepIndex}, "look": "steps" | "frame", "label", "url", "darkAccent"}`.
`steps` draws a pill step bar top-right with a sliding active pill (keep `x > W - 740, y < 112` free); `frame` draws
corner brackets, title, timecode, beat dots, scene index and label, and a progress line (keep a 90-px border free).
Without `hud`, `style.layout.hud: true` gives the `frame` look; a scene sets `"hud": false` in reel.config to hide it,
or fades it for a moment with `env.fx.hud`. When a scene storyboards its own telemetry chrome, build it from these
parts (and hide the global HUD for that scene):

```js
function hudChrome(ctx, env, t, tag, label, o = {}) {
  const P = env.palette, m = o.margin ?? 44, a = o.alpha ?? 1;
  ctx.save(); ctx.globalAlpha *= a;
  brackets(ctx, m, m, W - m * 2, H - m * 2, 22, rgba(P.ink2, 0.5), 1.5, 0.7);
  text(ctx, tag, m + 34, m + 40, { size: 20, weight: 800, color: P.ink, ls: 3 });
  const fr = Math.floor(t * FPS + 1e-6), tc = [Math.floor(fr / FPS / 60), Math.floor(fr / FPS) % 60, fr % FPS].map((v) => String(v).padStart(2, '0')).join(':');
  text(ctx, 'TC ' + tc, W - m - 34, m + 39, { size: 15, fam: 'mono', color: P.muted, align: 'right' });
  const beat = Math.floor(t / env.beatSec + 1e-6) % 4;
  for (let k = 0; k < 4; k++) { ctx.fillStyle = k === beat ? P.accent : rgba(P.muted, 0.35); ctx.fillRect(W - m - 250 + k * 14, m + 29, 8, 8); }
  const fw = measure(ctx, label, { size: 16, weight: 600 });
  text(ctx, scramble(label, rm(env.lt, 0, 0.45), 7, env.lt), m + 34, H - m - 30, { size: 16, weight: 600, color: P.ink });
  ctx.fillStyle = rgba(P.muted, 0.4); ctx.fillRect(m + 34, H - m - 14, Math.max(240, fw), 2);
  ctx.fillStyle = P.accent; ctx.fillRect(m + 34, H - m - 14, Math.max(240, fw) * clamp(env.lt / env.dur), 2);   // scene progress: the one place dur is right
  ctx.restore();
}
```

## 21. Poster -> slices opener

Frame 0 is a poster composition (also the cover and thumbnail). After a short hold it breaks into horizontal slices
that slide out alternately, squash to a single line, and collapse into a dot: the first beat starts from that dot.

```js
// drawPoster(g) draws the static poster (deterministic); it is rendered once into a buffer.
function posterSlices(ctx, env, drawPoster, hold = 0.42, dur = 0.52) {
  if (!posterSlices.buf) { posterSlices.buf = makeBuf(); drawPoster(posterSlices.buf.g); }
  const p = rm(env.lt, hold, hold + dur), src = posterSlices.buf.c;
  if (p <= 0) { ctx.drawImage(src, 0, 0); return 0; }
  ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H);
  const N = 22, hh = H / N;
  for (let i = 0; i < N; i++) {
    const dir = i % 2 ? 1 : -1, delay = hash(i * 3.7) * 0.35, q = Ease.inExpo(clamp((p - delay) / (1 - delay)));
    const sq = lerp(1, 0.04, Ease.inQ(clamp(p * 1.3 - 0.2))), yc = lerp(i * hh + hh / 2, H / 2, Ease.inC(clamp(p * 1.4 - 0.35)));
    ctx.globalAlpha = 1 - Ease.inQ(clamp(p * 1.2 - 0.2));
    ctx.drawImage(src, 0, i * hh, W, hh, dir * q * W * (0.6 + hash(i * 1.3) * 0.9), yc - (hh * sq) / 2, W, hh * sq);
  }
  ctx.globalAlpha = 1;
  const lp = rm(p, 0.55, 1);
  if (lp > 0) {
    const lw = lerp(W * 0.9, 4, Ease.ioExpo(lp));
    ctx.fillStyle = linear(ctx, W / 2 - lw / 2, 0, W / 2 + lw / 2, 0, [[0, 'rgba(255,255,255,0)'], [0.5, '#FFFFFF'], [1, 'rgba(255,255,255,0)']]);
    ctx.fillRect(W / 2 - lw / 2, H / 2 - 1.5, lw, 3);
  }
  return p;
}
```

Render covers from the same `drawPoster` with a play icon and a duration badge (`render.mjs --poster`).

## 22. Point-cloud zoom

From one point to the whole cloud: the camera distance interpolates in log space over a fixed number of beats while a
counter runs in log space to the real count; afterwards the hold orbits. Canvas 2D handles ~20k points per frame;
larger clouds belong in WebGL (`gl.js`, `engine-api.md`).

```js
// cam = {target: [x, y, z], yaw, pitch, dist, fov}; returns p -> [sx, sy, depth] or null behind the camera.
function project3(cam) {
  const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch), f = H / 2 / Math.tan((cam.fov || 0.7) / 2);
  return (p) => {
    let x = p[0] - cam.target[0], y = p[1] - cam.target[1], z = p[2] - cam.target[2];
    [x, z] = [x * cy - z * sy, x * sy + z * cy];
    [y, z] = [y * cp - z * sp, y * sp + z * cp];
    z += cam.dist;
    return z > 1e-3 ? [W / 2 + (x * f) / z, H / 2 - (y * f) / z, z] : null;
  };
}
function cloudZoom(env, focus, center, beats) {
  const z = rm(env.lt, 0, beats * env.beatSec), e = Ease.ioC(z);
  return { target: focus.map((v, i) => lerp(v, center[i], e)), dist: 0.045 * Math.pow(3.1 / 0.045, e), fov: 0.72,
    yaw: -0.05 - Ease.inC(z) * 1.2 - env.phase.hold * 0.08, pitch: 0.04 + Ease.inC(z) * 0.3 };
}
// spike(i) -> 0..1 recorded activity for point i at this time (real data), or omit. o.hero: index of the point the zoom
// starts from, kept glowing (o.heroGlow 0..1, fade it out as the zoom opens).
function pointCloud(ctx, env, pts, cam, o = {}) {
  const P = env.palette, proj = project3(cam);
  ctx.save(); ctx.globalCompositeOperation = env.dark || luma(P.bg) < 0.2 ? 'lighter' : 'source-over';
  for (let i = 0; i < pts.length; i++) {
    const q = proj(pts[i]);
    if (!q || q[0] < -10 || q[0] > W + 10 || q[1] < -10 || q[1] > H + 10) continue;
    const s = clamp(((o.size ?? 1.6) * cam.dist) / q[2] * 2, 0.8, 7), spk = o.spike ? o.spike(i) : 0;
    ctx.fillStyle = spk > 0 ? rgba(P.accent2, 0.55 + 0.45 * spk) : rgba(P.accent, o.base ?? 0.4);
    ctx.fillRect(q[0] - s / 2, q[1] - s / 2, s + spk * 2, s + spk * 2);
  }
  ctx.restore();
  const hq = o.hero != null ? proj(pts[o.hero]) : null, ha = o.heroGlow ?? 1;
  if (hq && ha > 0) { softBlob(ctx, hq[0], hq[1], 70, P.accent, ha); circle(ctx, hq[0], hq[1], 5 + 4 * beatPulse(env, 7)); ctx.fillStyle = rgba('#FFFFFF', ha); ctx.fill(); }
}
```

Counter for the same zoom: `Math.exp(Math.log(N) * Math.pow(z, 1.5))` -> `rollNumber` (recipe 23).

With `gl.js` (WebGL2, additive HDR glow, Canvas2D fallback when WebGL2 is missing) the same shot takes 20k-200k real
points. Build the cloud once from the data, draw it every frame, blit it into the scene:

```js
// positions: Float32Array(n * 3) of real data (normalized to roughly -1..1). cam: {target, yaw, pitch, dist, fov}.
function glPointCloud(ctx, env, positions, cam, o = {}) {
  const P = env.palette;
  if (glPointCloud.src !== positions) {
    glPointCloud.h = GL.cloud(positions, { colors: o.colors || [P.accent, mix(P.accent, '#FFFFFF', 0.4), P.accent2], sizes: o.sizes || [1.4, 2.8] });
    glPointCloud.src = positions;
  }
  GL.begin({ additive: env.dark || luma(P.bg) < 0.2 });
  GL.drawCloud(glPointCloud.h, { cam: GL.camera(cam), time: env.lt, twinkle: o.twinkle ?? 0.2, size: o.size ?? 1, alpha: o.alpha ?? 1 });
  GL.blit(ctx);
}
```

## 23. Counters

Odometer digits for big real numbers, laid out at the final string's width so nothing jitters; log-space progress
for huge ranges; a pop when it lands on its beat.

```js
function counter(ctx, env, value, final, x, y, beat, beats, o = {}) {
  const p = Ease.outC(rm(since(env, beat), 0, beats * env.beatSec)), from = o.from ?? 0;
  const v = o.log ? Math.exp(Math.log(Math.max(from, 1)) + (Math.log(value) - Math.log(Math.max(from, 1))) * p) : lerp(from, value, p);
  const pop = 1 + 0.08 * wob(since(env, beat + beats), 4, 6);
  ctx.save(); ctx.translate(x, y); ctx.scale(pop, pop);
  rollNumber(ctx, v, final, 0, 0, { size: o.size || 160, align: o.align || 'center', color: o.color || env.palette.ink, fam: o.fam || 'display' });
  ctx.restore();
}
```

For short labels use `countUp(a, b, p, {decimals, prefix, suffix})` inside `text()`. Tick SFX on beats while it runs;
the value on screen must match the source exactly at rest.

## 24. Tile wall

Many real runs at once: the hero tile shrinks from full screen into its cell, the rest pop in on a diagonal wave,
every tile keeps animating, and a highlight walks across the wall on the beat during the hold.

```js
// drawTile(ctx, i, rect, highlighted) paints tile i inside rect = {x, y, w, h}.
function tileWall(ctx, env, n, cols, drawTile, o = {}) {
  const rows = Math.ceil(n / cols), mx = o.mx ?? 70, top = o.top ?? 110, bottom = o.bottom ?? 92, gap = o.gap ?? 14;
  const tw = (W - mx * 2 - gap * (cols - 1)) / cols, th = (H - top - bottom - gap * (rows - 1)) / rows;
  const e0 = Ease.ioExpo(clamp(env.lt / (o.intro ?? 0.45))), zoom = 1 + 0.01 * env.lt;    // constant-rate push: same speed in every cut
  const walker = env.phase.hold > 0 ? Math.floor(env.phase.hold / env.beatSec) % n : -1;
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(zoom, zoom); ctx.translate(-W / 2, -H / 2);
  for (let i = 0; i < n; i++) {
    const q = i % cols, r = Math.floor(i / cols);
    let x = mx + q * (tw + gap), y = top + r * (th + gap), w = tw, h = th, a = 1, sc = 1;
    if (i === 0) { x = lerp(0, x, e0); y = lerp(0, y, e0); w = lerp(W, w, e0); h = lerp(H, h, e0); }
    else { const e = clamp((env.lt - (0.22 + (q + r) * 0.045)) / 0.35); a = Ease.outC(e); sc = 0.86 + 0.14 * Ease.outBack(e); }
    if (a <= 0.01) continue;
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x + w / 2, y + h / 2); ctx.scale(sc, sc); ctx.translate(-(x + w / 2), -(y + h / 2));
    drawTile(ctx, i, { x, y, w, h }, i === walker);
    ctx.restore();
  }
  ctx.restore();
}
```

Behind a headline over the wall, lay a horizontal band gradient (transparent -> 86 % bg -> transparent) for legibility.

## 25. Network pulses

Faint edges, bright pulses: each edge fires on its own beat of the bar (from `hash`), a pulse with a short trail
crosses in a fixed number of beats, nodes flash on the beat. Pure in `t`, endless in any hold.

```js
// nodes: [[x, y]], edges: [[a, b]] node indices.
function networkPulses(ctx, env, nodes, edges, o = {}) {
  const P = env.palette, bar = env.barSec, travel = (o.beats ?? 1) * env.beatSec;
  ctx.save(); ctx.lineCap = 'round';
  edges.forEach(([a, b], k) => {
    const A = nodes[a], B = nodes[b], C = [(A[0] + B[0]) / 2 + (hash(k) - 0.5) * 120, (A[1] + B[1]) / 2 + (hash(k + 9) - 0.5) * 120];
    ctx.strokeStyle = rgba(P.accent, o.edgeA ?? 0.16); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.quadraticCurveTo(C[0], C[1], B[0], B[1]); ctx.stroke();
    const off = Math.floor(hash(k * 3.3) * 4) * env.beatSec, ph = (((env.lt - off) % bar) + bar) % bar;
    if (env.lt >= off && ph < travel) {
      const u = Ease.ioQ(ph / travel);
      for (let j = 0; j < 6; j++) { const q = qbez(A, C, B, clamp(u - j * 0.03)); circle(ctx, q[0], q[1], 4 - j * 0.5); ctx.fillStyle = rgba(P.accent2, 1 - j / 6); ctx.fill(); }
    }
  });
  nodes.forEach(([x, y], i) => { const f = beatPulse(env, 7) * (i % 3 === 0 ? 1 : 0.4); circle(ctx, x, y, 6 + 4 * f); ctx.fillStyle = mix(P.accent, '#FFFFFF', f * 0.6); ctx.fill(); });
  ctx.restore();
}
```

Pulses along connections are authored motion, not measured conduction: say so in the credits.

For thousands of real edges (a connectome, a dependency graph), `gl.js` draws glowing lines with travelling pulses
in one call; bulging edges read as arcs:

```js
// positions: Float32Array(n * 3); pairs: [[a, b], ...] real edges. Draw-on over `beats`, then pulses keep flowing.
function glNetwork(ctx, env, positions, pairs, cam, beat, beats, o = {}) {
  const P = env.palette;
  if (glNetwork.src !== pairs) { glNetwork.h = GL.edges(positions, pairs, { bulge: o.bulge ?? 0.25, colors: o.colors || rgba(P.accent, 0.5) }); glNetwork.src = pairs; }
  GL.begin({ additive: env.dark || luma(P.bg) < 0.2 });
  GL.drawLines(glNetwork.h, { cam: GL.camera(cam), width: o.width ?? 1.2, glow: 0.6, time: env.lt, draw: Ease.ioC(rm(since(env, beat), 0, beats * env.beatSec)),
    pulse: { amount: 1, speed: env.bpm / 120, width: 0.06, color: P.accent2 } });
  GL.blit(ctx);
}
```

## 26. 3D polylines

Ribbons, flight paths, molecules, 3D charts: project with `project3` (recipe 22), sort segments far to near, and
scale width and alpha by depth; draw on progressively and orbit the camera in the hold.

```js
function polyline3(ctx, env, pts3, cam, u = 1, o = {}) {
  const P = env.palette, proj = project3(cam), n = Math.max(2, Math.floor(pts3.length * clamp(u))), segs = [];
  for (let i = 1; i < n; i++) { const a = proj(pts3[i - 1]), b = proj(pts3[i]); if (a && b) segs.push([a, b, (a[2] + b[2]) / 2]); }
  if (!segs.length) return;
  segs.sort((s, q) => q[2] - s[2]);
  const z0 = segs[segs.length - 1][2], z1 = segs[0][2];
  ctx.save(); ctx.lineCap = 'round';
  for (const [a, b, z] of segs) {
    const near = 1 - (z - z0) / (z1 - z0 || 1);
    ctx.strokeStyle = rgba(o.color || P.accent, 0.25 + 0.75 * near); ctx.lineWidth = (o.width ?? 6) * (0.4 + 0.6 * near);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  }
  ctx.restore();
}
```

## 27. Impact numbers

The result slams in on a downbeat: scale 1.6 -> 1 with `outExpo` in 0.28 s, heavy weight, glow, a decaying shake,
and a white flash; the unit and the provenance line decode beside it. Two beats later it can hand off: shrink and fly
into its row of a leaderboard (lerp position and scale with `Ease.ioExpo`).

```js
function impactNumber(ctx, env, value, unit, note, x, y, beat, o = {}) {
  const P = env.palette, lt = since(env, beat);
  if (lt < 0) return;
  const hp = clamp(lt / 0.28), sc = 1 + (1 - Ease.outExpo(hp)) * 0.6, [dx, dy] = lt < 0.3 ? shake(env.lt, 14 * (1 - lt / 0.3), 13) : [0, 0];
  ctx.save(); ctx.translate(x + dx, y + dy); ctx.scale(sc, sc);
  text(ctx, value, 0, 0, { size: o.size || 260, weight: 900, fam: o.fam || 'display', color: P.ink, ls: -(o.size || 260) * 0.03,
    glow: rgba(P.accent, 0.35 + 0.25 * beatPulse(env, 5)), glowBlur: 60, alpha: clamp(hp * 3) });
  ctx.restore();
  text(ctx, unit, x + 10, y + 80, { size: 34, fam: 'mono', weight: 600, color: P.accent, ls: 2, alpha: rm(lt, 0.1, 0.4) });
  text(ctx, scramble(note, rm(lt, 0.2, 0.7), 41, env.lt), x + 10, y - (o.size || 260) * 0.85, { size: 24, weight: 600, color: P.ink2, alpha: rm(lt, 0.1, 0.3) });
  if (env.fx) env.fx.flash = Math.max(env.fx.flash, 0.8 * Math.exp(-lt * 22));
}
```

## 28. Cards loop

A process as cards: one card lands per beat (alternating from above and below), each with an index, a
"computed"/"authored" tag, a live mini visual, and a title; arrows draw between cards and dots keep flowing along
them; in the hold the active card steps around on each beat.

```js
// cards: [{n, title, tag, color, vis(ctx, w, h)}]; pos: [[x, y]] card centres in loop order.
function cardsLoop(ctx, env, cards, pos, o = {}) {
  const P = env.palette, cw = o.w ?? 300, ch = o.h ?? 340, scl = o.scale ?? 1;            // keep text >= 16 px after scaling
  const active = env.phase.hold > 0 ? Math.floor(env.phase.hold / env.beatSec) % cards.length : -1;
  for (let k = 0; k < cards.length - (o.closed ? 0 : 1); k++) {             // arrows + flowing dots
    const a = rm(env.lt, (k + 1) * env.beatSec - 0.05, (k + 1) * env.beatSec + 0.25);
    if (a <= 0) continue;
    const [x1, y1] = pos[k], [x2, y2] = pos[(k + 1) % cards.length], L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L;
    const sx = x1 + ux * cw * scl * 0.55, sy = y1 + uy * ch * scl * 0.3, ex = x2 - ux * cw * scl * 0.55, ey = y2 - uy * ch * scl * 0.3;
    ctx.strokeStyle = rgba(P.accent, 0.6); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(lerp(sx, ex, Ease.outC(a)), lerp(sy, ey, Ease.outC(a))); ctx.stroke();
    for (let j = 0; j < 2; j++) { const q = (env.lt * 1.4 + k * 0.2 + j * 0.5) % 1; circle(ctx, lerp(sx, ex, q * a), lerp(sy, ey, q * a), 3); ctx.fillStyle = P.accent; ctx.fill(); }
  }
  cards.forEach((c, k) => {
    const e = clamp((env.lt - k * env.beatSec) / 0.32);
    if (e <= 0) return;
    const fresh = Math.max(Math.exp(-(env.lt - k * env.beatSec) * 4), k === active ? 0.6 * beatPulse(env, 4) + 0.4 : 0);
    ctx.save(); ctx.translate(pos[k][0], pos[k][1] + (k % 2 ? 1 : -1) * (1 - Ease.outBack(e, 2.2)) * 220); ctx.scale(scl, scl);
    ctx.globalAlpha *= Ease.outC(e); ctx.translate(-cw / 2, -ch / 2);
    rr(ctx, 0, 0, cw, ch, 14); ctx.fillStyle = P.surface; ctx.fill();
    ctx.strokeStyle = rgba(c.color || P.accent, 0.3 + 0.7 * fresh); ctx.lineWidth = 1.5; ctx.stroke();
    text(ctx, c.n, 24, 66, { size: 50, weight: 700, fam: 'mono', color: c.color || P.accent });
    chip(ctx, cw - 24, 46, c.tag, { size: 16, align: 'right', bg: rgba(c.color || P.accent, 0.1), fg: c.color || P.accent, shadow: false });
    ctx.save(); ctx.translate(24, 96); ctx.beginPath(); ctx.rect(0, 0, cw - 48, 112); ctx.clip();
    ctx.fillStyle = rgba(P.ink, 0.04); ctx.fillRect(0, 0, cw - 48, 112);
    if (c.vis) c.vis(ctx, cw - 48, 112);
    ctx.restore();
    text(ctx, c.title, 24, 262, { size: fitSize(ctx, c.title, cw - 48, { size: 34, weight: 800 }), weight: 800, color: P.ink });
    ctx.restore();
  });
}
```

## 29. Tilted terminal + zoom to line

The CLI grammar (case study: CC-statusline): one giant command word decodes on beat 1; the **real** recording
(`capture_cli.py` -> `P/assets/captures/term/<name>.cast`) plays in a window tilted in 3D; when the key line appears
in the real output, the camera zooms to it, a highlight scans across it, the rest dims, and corner brackets lock on.
`term.js` emulates the cast as a pure function of time (`Term.get` memoizes the player), takes its colors from the
style or a named theme of the tool (`theme: 'catppuccin-mocha'`), and draws through `quad.js`. `Term.fitEnv(env)`
re-times the cast to fit the scene without ever slowing it below its natural speed. Words on screen and in the
narration come from `player.find(...)` on the real bytes, never retyped.

```js
// cast: recording name under P/assets/captures/term/; keyRe: RegExp of the key line in the real output.
function cliShot(ctx, env, cast, word, keyRe, beat, o = {}) {
  const P = env.palette, lt = since(env, beat);
  if (lt < 0) return null;
  const player = Term.get(cast, { play: Term.fitEnv(env, { at: beat * env.beatSec + 0.35 }), theme: o.theme });
  const night = env.dark || luma(P.bg) < 0.2;
  const hit = player.find(keyRe), tKey = hit ? player.when(keyRe) : null;
  const zk = tKey === null ? 0 : rm(env.lt, tKey + 0.35, tKey + 0.95);
  // the giant word steps aside (fades and slides left) while the camera zooms, so the panel never covers it half-way
  const aside = Ease.inC(rm(zk, 0, 0.6));
  withAlpha(ctx, 1 - aside, () => Term.giantWord(ctx, word, (o.wordX ?? 120) - 120 * aside, o.wordY ?? 330, Ease.outC(rm(lt, 0, 0.35)),
    { size: o.wordSize ?? 200, t: env.lt, color: o.wordColor || (night ? '#FFFFFF' : P.ink) }));
  const enter = Ease.outC(rm(lt, 0.15, 0.75));
  const base = { x: o.x ?? W * 0.62, y: (o.y ?? H * 0.56) + (1 - enter) * 220, s: o.s ?? 0.72, yaw: -0.36, pitch: 0.12, roll: -0.03 };
  const box = hit ? player.box(hit.line, env.lt) : null;
  // zoom target in the right part of the frame (o.zoomX), clear of the word's column until it has gone
  const pose = box && zk > 0 ? player.zoomPose(base, box, zk, { width: o.zoomWidth ?? 1400, x: o.zoomX ?? W * 0.56, y: o.zoomY ?? H * 0.5 }) : base;
  const panel = player.draw(ctx, env.lt, pose, {
    alpha: enter, sheen: { k: rm(lt, 0.2, 1.0), a: 0.16 }, glow: { color: P.accent, a: 0.3 * (1 - zk), blur: 40 }, reflection: { a: 0.12 * (1 - zk) },
    highlight: hit ? { lines: [{ line: hit.line, k: zk, color: P.accent, scan: rm(zk, 0.3, 1) }], spot: { k: 0.8 * zk } } : undefined,
  });
  if (panel && box && zk > 0.6) Quad.brackets(ctx, panel.rect(box), { color: P.accent, a: rm(zk, 0.6, 1), glow: rgba(P.accent, 0.8) });
  return player;
}
```

`player.cues()` lists typed keys and enters on the scene clock: candidates for `keytap` / `enter` cues. Hold: the
caret blinks and later output keeps streaming; in a longer cut, a second key line can take its own zoom on a bar
line. For a static capture without a cast, pose the image with `Quad.drawPanel` and the same zoom math
(`Quad.reanchor` + `Quad.focusPose` + `Quad.lerpPose`), rendered at `res: 2`.

## 30. Particle logo morph

Points (real data positions, or the previous scene's particles) fly to positions sampled from the rendered logo,
assigned left to right so the flow is coherent, with a swirl mid-flight; they keep flickering after landing.

```js
// n target points sampled from the rendered text (cached per text/size; fonts are loaded before the first draw).
function logoPoints(s, n, size = 360, fam = 'display') {
  const key = `${s}|${n}|${size}|${fam}`;
  if (logoPoints.key === key) return logoPoints.pts;
  const bw = Math.ceil(size * (s.length * 0.75 + 1)), bh = Math.ceil(size * 1.3), b = makeBuf(bw, bh);
  b.g.fillStyle = '#000000'; b.g.fillRect(0, 0, bw, bh);
  b.g.font = font(size, 900, fam); b.g.textAlign = 'center'; b.g.textBaseline = 'middle'; b.g.fillStyle = '#FFFFFF'; b.g.fillText(s, bw / 2, bh / 2);
  const img = b.g.getImageData(0, 0, bw, bh).data, cand = [];
  for (let y = 0; y < bh; y += 2) for (let x = 0; x < bw; x += 2) if (img[(y * bw + x) * 4] > 128) cand.push([x - bw / 2, y - bh / 2]);
  cand.sort((a, c) => a[0] - c[0]);
  logoPoints.pts = Array.from({ length: n }, (_, i) => cand[Math.floor((i / n) * cand.length)] || [0, 0]);
  logoPoints.key = key;
  return logoPoints.pts;
}
// src: [[x, y]] start positions (same length, sorted by x); logo: from logoPoints; morph over `beats` from `beat`.
function particleMorph(ctx, env, src, logo, beat, beats, o = {}) {
  const P = env.palette, m = Ease.ioC(rm(since(env, beat), 0, beats * env.beatSec)), cx = o.x ?? W / 2, cy = o.y ?? H / 2;
  ctx.save(); ctx.globalCompositeOperation = env.dark || luma(P.bg) < 0.2 ? 'lighter' : 'source-over';
  for (let i = 0; i < src.length; i++) {
    const sw = Math.sin(Math.PI * m) * (hash(i) - 0.5) * 180, jx = (hash(i * 1.7) - 0.5) * 2.2, jy = (hash(i * 3.1) - 0.5) * 2.2;
    const x = lerp(src[i][0], cx + logo[i][0] + jx, m) + sw, y = lerp(src[i][1], cy + logo[i][1] + jy, m) - sw * 0.3;
    const flick = 0.55 + 0.45 * Math.sin(env.lt * (3 + hash(i) * 4) + i);
    ctx.fillStyle = rgba(mix(P.accent2, P.accent, m), 0.5 + 0.45 * flick); ctx.fillRect(x - 1.3, y - 1.3, 2.6, 2.6);
  }
  ctx.restore();
}
```

With `gl.js`, `GL.textPoints(word, {n})` samples the logo, `GL.pairPoints(from, to, 'x')` pairs points left to right,
and the cloud's `morph` uniform flies them with a per-point stagger and swirl:

```js
// from: Float32Array(n * 3) start positions (real data points, or GL.shapePoints('ball', n)); 15-30k points make a
// solid word at 2 world units wide. Morph over `beats`.
function glLogoMorph(ctx, env, from, word, beat, beats, o = {}) {
  const P = env.palette;
  if (glLogoMorph.key !== word + from.length) {
    const to = GL.textPoints(word, { n: from.length / 3, width: o.width ?? 2.2, size: 220 });
    glLogoMorph.h = GL.cloud(from, { morph: GL.pairPoints(from, to, 'x'), colors: o.colors || [P.accent, mix(P.accent, '#FFFFFF', 0.5), P.accent2], sizes: o.sizes || [2.4, 4] });
    glLogoMorph.key = word + from.length;
  }
  GL.begin({ additive: env.dark || luma(P.bg) < 0.2 });
  GL.drawCloud(glLogoMorph.h, { cam: GL.camera({ dist: o.dist ?? 2.4, fov: 0.62 }), morph: Ease.ioC(rm(since(env, beat), 0, beats * env.beatSec)), swirl: 0.35, time: env.lt });
  GL.blit(ctx);
}
```

## 31. Strobe, flash, glitch (inside a scene)

Scene-to-scene `glitch`, `flash`, and `strobe` are compositor transitions (`in` in reel.config). Inside a scene, use
these accents for tension: a white flash on each beat, a slogan slammed one word per beat (recipe 4), an RGB split
plus slice displacement of a layer (best on dark stages; `lighter` blows out light backgrounds).

```js
function beatFlash(env, a = 0.18, k = 24) { if (env.fx) env.fx.flash = Math.max(env.fx.flash, a * beatPulse(env, k)); }
// src: a full-frame layer canvas; amt 0..1. Draws the split layer onto ctx (dark stages). Not the compositor's
// own rgbSplit (frame-level chromatic aberration via env.fx.ca); this one treats a single layer.
function glitchLayer(ctx, src, amt, t) {
  if (!glitchLayer.bufs) glitchLayer.bufs = [makeBuf(), makeBuf()];
  const off = 4 + amt * 26, f = Math.floor(t * FPS);
  glitchLayer.bufs.forEach((b, i) => {
    b.g.setTransform(1, 0, 0, 1, 0, 0); b.g.globalCompositeOperation = 'source-over'; b.g.clearRect(0, 0, W, H);
    b.g.drawImage(src, 0, 0); b.g.globalCompositeOperation = 'multiply'; b.g.fillStyle = i ? '#00FFFF' : '#FF0000'; b.g.fillRect(0, 0, W, H);
    b.g.globalCompositeOperation = 'destination-in'; b.g.drawImage(src, 0, 0);
  });
  ctx.save(); ctx.drawImage(glitchLayer.bufs[1].c, -off * 0.5, 0); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glitchLayer.bufs[0].c, off, 0); ctx.restore();
  for (let i = 0; i < 3 + amt * 9; i++) {
    const y = Math.floor(hsh2(i, f) * H), h = 6 + hsh2(i + 9, f) * 70 * amt, dx = (hsh2(i + 3, f) - 0.5) * 160 * amt;
    ctx.drawImage(src, 0, y, W, h, dx, y, W, h);
  }
}
```

## 32. Captions

When narrated, the compositor burns captions from `cut-<cut>.json` `captions` in the `style.layout.captions` look
(`drawCaptions`, enabled by `reel.config.captions.enabled` or the style); scenes keep that band clear. To tie a visual
to the voice (a keyword lights up as it is spoken), read `env.captions` (the lines active at `t`, reel-time
`t0`/`t1`, `text`) and key the emphasis to them:

```js
function captionEmphasis(ctx, env, t, word, x, y, o = {}) {
  const P = env.palette, cap = (env.captions || []).find((c) => t >= c.t0 && t < c.t1 && c.text.includes(word));
  const k = cap ? Ease.outC(rm(t, cap.t0, cap.t0 + 0.25)) * (1 - Ease.inC(rm(t, cap.t1 - 0.2, cap.t1))) : 0;
  text(ctx, word, x, y, { size: o.size || 64, weight: 800, fam: 'display', color: k > 0.5 ? P.accent : P.ink, glow: k > 0 ? rgba(P.accent, 0.6 * k) : null, glowBlur: 30 });
}
```

A scene that must show a full-screen statement without a caption under it can set `env.fx.captions = 0` for that
moment only when the same words are on screen.

## 33. Transitions (compositor-owned)

Set each scene's `in` (and `inParams`) in `reel.config.json`; the compositor renders both scenes into buffers and
blends them in a window around the incoming scene's first bar line (defaults below, in beats before/after the line;
override with `inParams.preBeats/postBeats` or `pre/post` seconds). Scenes only provide geometry:

| `in` | Window (beats) | `inParams` | The scenes provide |
|---|---|---|---|
| `cut` | 0 / 0 | - | land a hit on beat 0 |
| `blobWipe` | 1 / 0 | `x, y` (origin), `edge` (css) | a clean area of the outgoing frame at the origin |
| `zoomInto` | 1 / 0 | `rect {x, y, w, h, r}`, `zoom` | the outgoing scene keeps the device drawn and returns its screen from `portal(t, env)` (or `rect`) |
| `whip` | 0.3 / 0.3 | `dir`: left, right, up, down | motion in that direction on both sides |
| `glitch` | 0.2 / 0.44 | `amount` | dark stages read best |
| `flash` | 0 / 0 | `color, amount, decay` | a bright reveal on beat 0 of the incoming scene |
| `strobe` | 0 / 0 | `color, amount` (default: inverted frames) | 1-bar slogan scenes |
| `match` | 0 / 0 | `fade` (s, crossfade centred on the cut) | the same element at the same place in both frames |
| `impact` | 0 / 0 | `zoom, shake, flash, color` | the incoming scene slams something on beat 0 |
| `portalFlash` | 0.8 / 1.2 | `x, y, color` | the outgoing scene opens a window: `portal(t, env)` returns it, and the scene calls `env.portal?.(ctx, x, y, w, h, r)` to show the incoming scene through it before the burst |
| `dissolve`, `push` | 0.5 / 0.5, 0.5 / 0 | `dir` (push) | quiet material only |

```js
// A scene whose phone screen is the zoomInto / portalFlash window into the next scene.
(() => {
  const SCREEN = { x: 434, y: 104, w: 412, h: 872, r: 56 };
  SCENES['device'] = {
    draw(ctx, t, env) {
      const P = env.palette;
      ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
      phoneFrame(ctx, env, { x: SCREEN.x - 14, y: SCREEN.y - 14, w: SCREEN.w + 28, h: SCREEN.h + 28 }, (g, s) => {
        if (env.portal) env.portal(g, s.x, s.y, s.w, s.h, s.r);         // the next scene shows through the screen
        else { g.fillStyle = P.surface; g.fillRect(s.x, s.y, s.w, s.h); }
      });
    },
    portal: () => SCREEN,
  };
})();
```

`zoomInto` and `portalFlash` show the incoming scene through the window *before* its first bar line, at negative
`env.lt`: give that scene an establishing image for `lt < 0` (its backdrop plus the first title or object already in
place) instead of an empty stage. A transition that needs a specific predecessor (`zoomInto`, `match`,
`portalFlash`) also sets `inFallback` (any other type) for cuts where an optional scene is left out.

## 34. 2.5D photo parallax

A still photo becomes a shot: the subject layer and the subject-free plate (`prep_assets.py` with
`"parallax": true`: macOS Vision lifts the subject, OpenCV inpaints the hole) move at different depths while the
camera pushes in. The camera is a slow swing, so a hold of any length stays alive and bounded.

```js
// IMG[name]: full-frame subject layer; IMG[name + '_bg']: the plate (same size). Size caps maxW/maxH >= 1.2x the
// frame in assets.json leave room for the travel without upscaling.
function photoParallax(ctx, env, name, o = {}) {
  const fg = IMG[name], bg = IMG[name + '_bg'];
  if (!fg || !bg) return false;
  const t = env.lt, per = o.period ?? 24, amp = o.amp ?? 36;                          // s per swing, px at depth 1
  const sway = Math.sin((TAU * t) / per), push = (o.push ?? 0.06) * (1 - Math.cos((TAU * t) / (2 * per))) / 2;
  const cover = Math.max(W / bg.width, H / bg.height) * (1 + (o.margin ?? 0.06));
  const layer = (img, depth) => {
    const s = cover * (1 + push * depth), w = img.width * s, h = img.height * s;
    ctx.drawImage(img, (W - w) / 2 + sway * amp * depth, (H - h) / 2 - push * 140 * depth, w, h);
  };
  layer(bg, o.bgDepth ?? 0.5);
  layer(fg, o.fgDepth ?? 1.5);
  return true;
}
```

Keep the relative travel small (`amp` x the depth difference, about 2 % of the frame): the strip it uncovers is
inpainted, not photographed, and must never read as detail. Light sweeps, type, and vector callouts go on top; never
recolor the photo itself (`visual-sources.md` section 5).

## 35. Paper figure: page, figure, detail

A paper explainer proves its claim with the paper itself: the page lies on the stage, the camera pushes into the
figure, a bracket singles out one panel, and a highlighter sweeps the sentence the narration quotes. Inputs come
from `pdf_figures.py`: run it twice into two folders, `--mode paper` (figures, tables, `panels` per figure) into
`captures/pdf/` and `--mode pages --find "the quoted sentence"` into `captures/pdf-pages/` (page renders and the
`finds` with the sentence's bbox). Coordinates in the sidecars are PDF points; the page render maps them to pixels.

```js
// doc: the PDF's folder name; fig: 'fig-3'; o.panel: 'b' (bracket that panel); o.find: index into the pages finds.
function paperFigure(ctx, env, doc, fig, o = {}) {
  const P = env.palette, lt = env.lt, b = (x) => x * env.beatSec;
  const F = ASSET(`captures/pdf/${doc}/figures.json`), it = F && F.items.find((i) => i.file === fig + '.png');
  if (!it) return null;
  const pg = 'page-' + String(it.page).padStart(3, '0'), page = IMG[`captures/pdf-pages/${doc}/${pg}`];
  const G = ASSET(`captures/pdf-pages/${doc}/figures.json`) || { items: [], finds: [] };
  const pit = G.items.find((i) => i.file === pg + '.png'), ptW = pit ? pit.bbox[2] : 612, ptH = pit ? pit.bbox[3] : 792;
  // the sheet at rest (560 px wide), then a push that brings the figure to o.figWidth px at (o.cx, o.cy)
  const restW = o.restW ?? 560, restH = (restW * ptH) / ptW, rx = (o.cx ?? 1160) - restW / 2, ry = 540 - restH / 2;
  const k = Ease.ioC(rm(lt, b(1), b(2.25))), [bx0, by0, bx1, by1] = it.bbox;
  const pt = (x, y) => [rx + (x / ptW) * restW, ry + (y / ptH) * restH];       // PDF points -> resting sheet px
  const [fcx, fcy] = pt((bx0 + bx1) / 2, (by0 + by1) / 2), s = lerp(1, (o.figWidth ?? 1150) / (((bx1 - bx0) / ptW) * restW), k);
  const ox = lerp(0, (o.cx ?? 1160) - fcx, k), oy = lerp(0, (o.cy ?? 520) - fcy, k);
  const toScreen = (x, y) => { const [px, py] = pt(x, y); return [fcx + ox + (px - fcx) * s, fcy + oy + (py - fcy) * s]; };
  const find = (G.finds || [])[o.find ?? -1], pxPerPt = page ? (page.naturalWidth || page.width) / ptW : 1;
  ctx.save();
  ctx.translate(fcx + ox, fcy + oy); ctx.scale(s, s); ctx.translate(-fcx, -fcy);
  paperSheet(ctx, rx, ry + (1 - Ease.outExpo(rm(lt, 0, b(1)))) * 260, restW, restH, {
    img: page, rot: (1 - k) * (-0.035 + 0.01 * Math.sin(lt * 0.6)), alpha: Ease.outC(rm(lt, 0, b(0.5))), curl: 1 - k,
    highlights: find && find.page === it.page ? [{ rect: find.bbox.map((v) => v * pxPerPt), k: rm(lt, b(3.25), b(4.25)) }] : [] });
  ctx.restore();
  // panel bracket after the push lands (the sidecar's panels come from the figure's own "(a)", "(b)" letters)
  const pn = (it.panels || []).find((q) => q.panel === o.panel);
  if (pn && k > 0.95) {
    const [x0, y0] = toScreen(pn.bbox[0], pn.bbox[1]), [x1, y1] = toScreen(pn.bbox[2], pn.bbox[3]);
    Quad.brackets(ctx, { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, { color: P.accent, a: rm(lt, b(2.5), b(2.9)), pad: 10, len: 26, width: 3 });
  }
  return { item: it, toScreen };
}
```

Copy rules: the caption and the quoted sentence are the paper's own words (quote, never paraphrase); cite the paper
on screen (authors, venue, year) and in the credits; re-plot numbers only from `--tables` cells, labelled as such.
Light pages on a dark stage: keep the page white (a sheet on a dark desk), or use the figure's `.dark.png` variant
for full-frame figures. Hold: the bracket moves to the next panel, or the next quote sweeps, on each bar line.

## 36. Web page in a browser frame

A docs site, landing page or README on GitHub, shown as the real page: `capture_ui.mjs` takes a full-page shot on a
desktop device (`{"do": "shot", "name": "landing", "full": true}`, or `scrollShots`), and the scene frames it in
browser chrome with its own URL and scrolls it on the bar lines. `browserFrame()` returns the content rect and the
page scale, so callouts and a `zoomInto` portal can point at page coordinates.

```js
// img: IMG['captures/ui/web/landing'] (full-page shot, 1440 CSS px wide at dpr 2); o.step: CSS px per bar line.
function webPage(ctx, env, img, o = {}) {
  const lt = env.lt, b = (x) => x * env.beatSec, e = Ease.outExpo(rm(lt, 0, b(1)));
  let scroll = o.from ?? 0;                                                      // one viewport step per bar line
  onBars(env, 1, (i, dt) => { scroll = (o.from ?? 0) + (i + Ease.ioC(clamp(dt / b(0.75)))) * (o.step ?? 420); });
  const x = o.x ?? 380, y = (o.y ?? 140) + (1 - e) * 120, w = o.w ?? 1160, h = o.h ?? 800;
  return browserFrame(ctx, x, y, w, h, { img, url: o.url || 'example.com', scroll, cssWidth: o.cssWidth ?? 1440, dpr: o.dpr ?? 2, alpha: e });
}
// portal(t, env) for a zoomInto through the page: return the content rect from the same call.
```

Keep the URL the real one (or the docs' own path for a local site); hide cookie banners at capture time
(`hide` in the spec). Scroll in steps that land on bar lines, never continuously at a speed nobody can read; a hero
section deserves a 1-2 bar stop. For a page that animates, record states with `record` and swap them on the beat.
