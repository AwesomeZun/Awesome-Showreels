# Imagery: characters, products, photos and UI layers

What raster imagery is for in a reel, how to prepare it (`tools/prep_assets.py`), how to check it, and how a
still character is made to move. Related files:
- `../tools/imagegen.md` makes new poses and sheets;
- `visual-sources.md` picks the carrier for each scene;
- `engine-api.md` has the drawing API;
- `motion-recipes.md` has the scene code (§3 characters, §7 products and reflections, §15 route rider, §18 lineup).

## 1. When images help, and when they hurt

| Helps | Hurts |
|---|---|
| The material has a face (mascot, character, product, a person who consents). The face owns the hook and the finale. | Serious technical material without a face (security, infrastructure, research claims). A cute character reads as unserious; carry it with real data, type and captures. |
| Consumer, brand or community tone: a playful README, emoji, a mascot in the docs, product shots. | The image fights the claim's text inside the same two beats. Keep one hero carrier per scene. |
| A persona makes an abstract system concrete: the agent asks, checks, guards. | Generated imagery standing in for reality: photoreal people, products or places, fake screenshots or charts. |
| Physical products, places, people: the client's photos. | Off-model poses. A mascot whose face changes between scenes looks cheap; three good poses beat ten mixed ones. |
| Papers: the paper's own figures are the evidence (capture them, do not redraw). | Mixed rendering styles (plush 3D + flat vector + photo) when the source does not mix them. |
| | Stock clichés (glowing brains, handshakes) and anything with unknown rights. |

The tone pass already recorded the default in `style.motion.characters` and `style.motion.visualSources`.
Deviate only for a reason, and write that reason in `STORYBOARD.md`.

## 2. Pipeline

1. **Inventory** `P/source/`: mascot sheets, products, logos, photos, captures. Note who owns each one.
2. **Plan poses.** Use one pose per story beat, each a single action that reads as a black silhouette at 20%
   size (waves, points, thinks, holds the phone, guards, jumps). Six to ten poses is a normal set. List
   name -> action -> scene in `STORYBOARD.md`.
3. **Generate the missing ones** if allowed (`../tools/imagegen.md`) into `P/source/gen/<job>/`.
4. **Describe them** in `P/assets.json` (section 3).
5. **Prepare**: `python3 <skill>/tools/prep_assets.py --project P`.
6. **QA** (section 5) before any scene uses an asset.
7. **Animate** (sections 6-9).

```bash
python3 <skill>/tools/prep_assets.py --check                         # which backends work here
python3 <skill>/tools/prep_assets.py --project P --dry-run           # resolved settings per asset
python3 <skill>/tools/prep_assets.py --project P [--only hero,wave] [--backend auto|vision|flatbg|rembg] [--force]
python3 <skill>/tools/prep_assets.py --project P --src P/source/x.png --name x [--kind character] [--split]
# The vision backend runs <skill>/tools/lift.swift, compiled on first use into ~/.cache/motion-showreel/.
# Standalone: swiftc -O lift.swift -o lift && ./lift in.png out/prefix --masks --json [--instances] [--crop]
```

**Outputs** (the runtime loads every top-level image in `P/assets/`):
- `P/assets/<name>.webp` for every asset;
- `<name>_blink.webp` when eyes were found; it exists exactly when `meta[name].eyes` does;
- `<name>_bg.webp` for text-free UI plates and photo backplates;
- `P/assets/meta.json`, merged with other entries: `{name: {w, h, kind, ax?, eyes?, plate?, textRows?, sheet?, idx?}}`.

Generated files stay outside `assets/`, because everything in `assets/` ships inside the HTML:
- `P/build/provenance.json`;
- `P/build/qa/` with `cutouts.png` (or `cutouts-N.png`), `blink.png` and `report.json`, describing the last run;
- `P/build/lift/`, the mask cache (`--force` ignores it).

When an asset is re-run, outputs its earlier run made but this run no longer makes (fewer sheet parts, no more
eyes) are deleted.

| `meta.json` field | Meaning |
|---|---|
| `w`, `h` | pixel size of the WebP |
| `kind` | the asset kind (section 3) |
| `ax` | horizontal foot anchor, 0..1 of the width: the centre of the lowest opaque rows. Pass `ax: META[n].ax` to `drawChar` for asymmetric poses (`popChar` uses the centre). |
| `eyes` | `[{cx, cy, w, h}]` in pixels, present when `<name>_blink.webp` exists |
| `plate` | name of the matching `_bg` image (text-free UI, photo backplate) |
| `textRows` | `[[x0, y0, x1, y1], ...]` text rows of a UI layer, for typing wipes |
| `sheet`, `idx` | the sheet this part came from and its reading-order index |

## 3. `P/assets.json`

```json
{
  "defaults": {"quality": 92},
  "kinds": {"product": {"maxH": 480}},
  "assets": {
    "hero":   {"src": "source/mascot.png", "prov": "client mascot (brand kit 2026)"},
    "wave":   {"src": "source/gen/poses-a/hero_wave.png", "match": {"to": "hero", "strength": 0.5},
               "prov": "GPT-image-2 via Codex CLI from source/mascot.png, prompt source/gen/poses-a/prompt.txt"},
    "guard":  {"src": "source/gen/poses-a/hero_guard.png", "blinkFrom": "source/gen/poses-a/hero_guard_closed.png"},
    "prod":   {"src": "source/gen/sheet/products.png", "split": true, "names": ["toner", "jar", "tube"]},
    "logo":   {"src": "source/logo.jpg", "kind": "logo"},
    "bubble": {"src": "source/design/chat_bubble.png", "kind": "ui", "inpaintText": true},
    "street": {"src": "source/street.jpg", "kind": "photo", "parallax": true}
  }
}
```

A string value is shorthand for `{"src": ...}`. Settings merge in this order: base < kind defaults < `defaults` <
`kinds[kind]` < the asset. Paths are relative to `P`. Unknown keys are reported, not silently ignored.

| Kind (default) | Defaults |
|---|---|
| `character` (default; `product` when `split`) | lift auto, `maxH` 980, blink auto |
| `product`, `prop` | lift auto, `maxH` 600 |
| `illustration` | lift auto, `maxH` 980 (set `"blink": "auto"` for drawn characters) |
| `logo` | flat-colour key (`flatbg`), holes kept transparent, lossless WebP, `maxH` 600 |
| `ui` | no lift, no trim, q95, edges untouched; for UI-like rasters (section 9) |
| `photo` | no lift (unless `parallax`), no trim, fitted into 1920x1080, q88 |

Size caps assume a 1920x1080 frame and scale with `reel.config.json` `"size"` (`maxH` x H/1080, `maxW` x W/1920).
Nothing is ever upscaled.

| Key | Values | Use |
|---|---|---|
| `src` | path | required |
| `kind` | see above | |
| `lift` | `"auto"` \| `true` \| `false` | auto = lift unless the source already has alpha |
| `backend` | `"auto"` \| `"vision"` \| `"flatbg"` \| `"rembg"` | auto = Vision on macOS, else rembg if installed, else flatbg |
| `trim`, `pad` | bool, px (6) | crop to the alpha box plus padding |
| `maxH`, `maxW` | px | caps, never upscale |
| `quality`, `lossless` | 0-100, bool | WebP encoding |
| `edge` | `"snap"` \| `"keep"` | snap the lifter's soft edge onto the real edge (section 4) |
| `defringe` | bool (true) | remove backdrop colour from edge pixels |
| `choke`, `feather` | px | shrink or soften the edge (stubborn halos; usually 0) |
| `holes` | `"auto"` \| `"fill"` \| `"keep"` | refill holes the lifter cut into the subject; `fill` = all enclosed holes |
| `shadow` | `"auto"` \| `"remove"` \| `"keep"` | auto only warns about a baked floor shadow; remove takes it out |
| `islands` | fraction (0.002) | drop specks smaller than this x the largest part; 0 = off |
| `blink` | `"auto"` \| `true` \| `false` | find eyes and make `_blink`; true also warns when none are found |
| `eyes` | `[[cx, cy, w, h], ...]` | manual eye boxes in source pixels (overrides detection) |
| `eyeParams` | `{upper, minArea, maxArea, maxSpan, lum, rel, fill, aspect, ring, contrast}` | detector overrides |
| `blinkFrom` | path | eyes-closed twin of the same pose: registered and transplanted (detailed eyes) |
| `blinkColor` | hex | closed-eye stroke colour (default: the eye's own colour, darkened) |
| `split`, `names`, `scale`, `minArea` | bool, list, `"shared"` \| `"each"`, fraction | product sheets: one asset per object in reading order (`<name>0..`), shared scale keeps relative sizes |
| `match` | `"palette"` \| `"<asset>"` \| `{"to", "strength"}` | white-balance toward the style (0.35) or pull colours toward a reference cutout (0.6) |
| `inpaintText`, `textColor`, `textSize`, `textBoxes` | bool, auto\|dark\|light, px, `[[x, y, w, h]]` | UI: text-free `_bg` plate plus `textRows` |
| `parallax` | bool | photo: full-frame subject layer plus a subject-free `_bg` plate |
| `prov` | text or object | provenance, copied to `P/build/provenance.json` |

## 4. What `prep_assets.py` does, and why

1. **Load** with EXIF orientation applied and ICC profiles (Display P3 etc.) converted to sRGB. HEIC goes through
   `sips` on macOS.
2. **Lift** at <= 2048 px. Vision (`lift.swift`, `VNGenerateForegroundInstanceMaskRequest`) returns soft masks for
   all instances plus one per instance. Then the image is cropped to the subject and refined at ~1.5x its final
   size, so 12 MP sources cost seconds, not minutes.
3. **Holes**: lifters cut holes where a subject part matches the backdrop (pink inner ears or a white heart on a
   pink backdrop). An enclosed hole whose colour differs from the backdrop is refilled; a gap that shows the
   backdrop (between arm and body) stays. On busy backgrounds the test is whether the hole's colour is common in
   the backdrop right around the silhouette.
4. **Frame leaks**: when the subject leaves the frame (ears cut by the top edge), Vision keeps the backdrop between
   the cut parts. That region is removed, and a "touches the frame edge" warning is raised.
5. **Edge snap**: Vision's mask ramps over ~10 px, while the real edge is 1-2 px. Left alone, that ramp is a
   backdrop-coloured halo on any other background. On flat backdrops a colour model (alpha = |I - B| / |F - B|) is
   blended with a sharpened copy of the mask. Near the contour both decide; deeper inside the subject the alpha
   only grows, so pink shading never turns transparent. On busy backdrops a guided filter does it (then a level
   stretch, a median, and removal of detached specks).
6. **Shadow**: a floor shadow is only taken out with `"shadow": "remove"`, or flagged in auto. It must be
   backdrop-hued, darker, smooth and wide, sit at the bottom of its object, and spread beyond the object's
   footprint, so a pink cap on a pink tube is never mistaken for it.
7. **Islands, choke, feather**, then **defringe**: solve `I = aF + (1 - a)B` for the edge colour F, using the local
   backdrop, for edge pixels near real background. The QA metric `bleed` (0 = clean, 1 = edge pixels are pure
   backdrop) is reported before and after.
8. **Trim, cap, resize** (premultiplied Lanczos) and **WebP** (method 5).
9. **Match** (optional) and the **foot anchor** `ax`.
10. **Eyes**, in three passes. (1) Dark vertical ellipses: luminance < 120, fill >= 0.5, h >= 1.2 w, in the upper
    62%, bright ring around them; these are the thresholds proven on the plush mascot of the K-BeautyGate case
    study (blinks for every pose with open eyes). (2) Lash eyes:
    fill >= 0.35. (3) Coloured or round eyes: darker than the local envelope. Pairs must be level (dy < 1.1 x eye
    height), separated, and similar in size, shape and colour. A second valid pair raises the group-shot warning.
    Characters with already closed or happy eyes get no blink.
11. **Blink**: the convex hull of each eye plus attached lashes is inpainted (TELEA), the surface texture is
    restored with matched noise, and a gently curved closed-eye stroke is drawn. The stroke is 4x supersampled,
    ~0.28 x eye width thick, sags h x 0.16, and is rotated to the head tilt. `blinkFrom` instead aligns an
    eyes-closed twin (silhouette box, then affine ECC on the face) and transplants only the eye regions.
12. **UI text removal**: the text-free fill is a morphological close (dark text) or open (light text), with
    polarity taken from the element's own fill; glyphs thicker than the kernel get a TELEA pass. Text rows come
    from a horizontal projection.
13. **Parallax**: the subject is lifted and the backplate inpainted at quarter resolution under a dilated mask.
    It is soft, but always hidden behind the subject except at small offsets.

## 5. QA protocol (before any scene uses an asset)

Read `P/build/qa/cutouts.png`. Each row shows the asset on the dark tile (the halo test), on the reel's light
background, on a checkerboard, and a 4x zoom of the softest stretch of the edge.

| Look for | Usually means | Fix |
|---|---|---|
| light or coloured rim on the dark tile | backdrop left in edge pixels | check `bleed` in the label; `"choke": 1`; regenerate on a backdrop closer to the reel's |
| missing chunks or holes (inner ears, a white heart) | subject matched the backdrop | `"holes": "fill"`; regenerate on a contrasting backdrop (`imagegen.md` §7) |
| a soft blob at the feet | baked floor shadow | `"shadow": "remove"`, then check again |
| cut ears, feet or props, or a straight edge | subject left the frame | regenerate with "generous margin" |
| two characters in one cutout | group image used as source | one member per image (`imagegen.md` template B) |
| specks or stray pieces | backdrop texture or a stray sparkle | raise `"islands"`; clean the source |

Then read `P/build/qa/blink.png` (open with eye boxes | blink, zoomed on the face):
- each stroke sits on its eye, follows the head tilt, and is about as wide as the eye;
- no leftover highlight, lash or smudge, and the fur texture continues;
- with `blinkFrom`, no ghosting. A wrong pair or a stroke on the nose means detection failed: set `"eyes"`
  manually, or `"blink": false`.

`P/build/qa/report.json` holds, per asset: `backend`, `flatBg`, `bg`, `instances`, `holesFilledPx`, `holesKeptPx`,
`frameLeakPx`, `shadowRemovedPx`, `islandsRemovedPx`, `bleedBefore`, `bleedAfter`, `scale` (source -> output),
`eyes` (`pass N` | `manual` | `blinkFrom` | `none`), `warnings` and `seconds`. Resolve every warning or accept it in
`STORYBOARD.md`.

Finally, in context: render stills (`runtime/stills.mjs`) at the entrance, the landing, mid-hold, a blink frame
and the exit of every character scene. Check that the feet sit on the ground line, the contact shadow touches
the feet, the on-screen height does not exceed `META[name].h`, and there is no halo against the reel's real
background.

## 6. Character motion in 2D

A cutout cannot bend its limbs. All the life comes from the body as a whole and from timing. The engine
helpers (`engine-api.md`) take `x, y` = feet centre and `h` = on-screen height, and all scale around the feet, so
squash never lifts a character off the ground.

| Ingredient | How | Typical values |
|---|---|---|
| Spring entrance | `y + (1 - spring(lt, f, z)) * fromY`, an underdamped step that overshoots and settles | `styleSpring` reads `style.motion.spring`; `fromY` 600-800 from below the frame |
| Squash and stretch | `sx = 1 + s, sy = 1 - s`, with `s = wob(lt - land, 3.2, 5.5) * k` after landing; anticipation = squash before a jump, stretch in the air | k 0.07-0.13 |
| Jelly | 40 horizontal strips, each offset by `jelly * (1 - v)^2.2 * sin(phase - 2.2 v)` (v = 0 at the top): ears wobble, feet stay planted | 10-18 px decaying `exp(-2.6 lt)`; `sway` for an idle drift |
| Breathing | `sy += 0.012 sin(2 pi 0.8 lt)`, `sx` gets 0.4 of it | never stop it during a hold |
| Blink | swap to `<name>_blink` while `blinkAt(t, seed)` (0.1 s every 2.4-4.2 s, different per seed) | one seed per character |
| Beat bounce | per beat: squash in the first 20% (contact), arc for the rest; neighbours alternate on the off-beat | 12-24 px hop, squash 0.07 (`motion-recipes.md` §18) |
| Contact shadow | `groundShadow(x, footY, w * (1 - hop / k), a)` on the ground line: shrinks and fades in the air | w ~ 0.55-0.6 x h, alpha 0.22-0.28 |
| Hop-walk | position advances per step; each step is a hop with squash at contact and a slight `rot` alternating with direction; face the travel direction (`flip`) | step = 0.5-1 beat, rot +-0.06 (`motion-recipes.md` §15) |
| Smear | for very fast moves, draw 2-3 ghost copies at earlier positions (alpha 0.15-0.3) and stretch along the velocity | only for 1-3 frames |

`popChar` combines spring, squash, jelly, breathing, blink and contact shadow. Use `drawChar` when the scene drives
the pose (riders, lineups, guards).

**Pace.** Map `style.motion.pace` to amplitudes; the spring itself comes from `style.motion.spring`.

| pace | squash k | jelly | beat bounce | idle |
|---|---|---|---|---|
| calm | 0.04-0.06 | 4-8, slow (`jellyPhase = lt * 6`) | every bar, 8-12 px | breathing, blink, slow sway |
| medium | 0.07-0.09 | 10-14 | every 2 beats, 12-16 px | plus a small hop every bar |
| energetic | 0.10-0.13 | 14-20 | every beat, 16-24 px, alternating neighbours | plus a sparkle or prop wiggle per bar |

**Staging rules**
- One ground line per scene. Feet on it, contact shadow under every grounded character.
- Anchor at the feet. For asymmetric poses (a wand, a big prop) pass `ax: META[name].ax` so the support stays
  at `x`.
- Never draw taller than `META[name].h`, and prepare assets for the reel's real frame size.
- Rotation up to about +-8 degrees; beyond that the flat sticker shows.
- Flip (`flip: true`) only symmetric designs without text, logos or one-sided details, and remember that the light
  flips too.
- Characters look at what they react to: pick the pose or flip toward the subject of the scene.
- At most two characters on screen, except a finale lineup. Draw back to front; the shadow goes under its
  character.
- Every pose in a set shares one light direction (state it in the generation prompt). Light added in the scene
  (halo, rim, back-light) should agree with it.

**Acting with pose swaps.** A new emotion or action is a new pose. Swap on a beat and hide the swap:
- at the bottom of a squash (sy ~0.85 on the swap frame);
- at the peak of a hop;
- behind a sparkle burst, a whip or a flash.

Keep the feet at the same `x` (use `ax`). Never cross-dissolve two poses; the double image reads as a mistake.

**Holds** (longer cuts stretch scenes, `timing-and-length.md`):
- Idle never stops: breathing, blink, a slow sway.
- Secondary actions land on bar lines (`onBars`): a small hop, a look-around (flip or a +-4 degree lean), a sparkle,
  a prop wiggle, a pose swap. Keep them smaller than the entrance.
- Never replay the entrance.

**Limits, and what to do instead**

| A cutout cannot | Instead |
|---|---|
| move limbs independently | a pose per action, swapped on beats; props that must move separately become their own cutout |
| turn its head or rotate in 3D | pose variants (front, three-quarter, side). A "turn" squashes `sx` to ~0.1, swaps pose at the narrowest frame, and springs back. |
| lip-sync | the character reacts on beats (hop, lean) while captions carry the words |
| walk | hop-walk (above) |
| scale up cleanly | prepare at the reel size; for a big close-up, generate a close-up pose |
| relight | generate poses with matching light. In dark scenes, a mild `filter: 'brightness(0.85)'` and a soft back-glow (`softBlob` behind) sit it in the scene. |
| act with the eyes beyond a blink | `blinkFrom` twins, or a happy-eyes pose swapped on a beat |

Jelly and squash are for soft characters (plush, blobs, cartoon bodies). Robots, products, logos and people in
photos move rigidly.

## 7. Products and props

- Rigid motion: spring in from below or drop onto the floor; at most a 2-3% settle squash. No jelly.
- `drawProd` anchors at the bottom centre. `drawReflection` adds a floor reflection fading downward
  (`motion-recipes.md` §7). A sheen sweep across the product, clipped to its alpha, sells "premium".
- Sheets split with `"scale": "shared"` keep true relative sizes: `META[a].h / META[b].h` is the real ratio, so
  derive on-screen heights from it.
- A turntable is fake: `sx = cos(theta)`, swapping to a back view at the edge-on frame only if you have one.
- Illustrative products are labelled as such when the reel could be read as showing real ones
  (`visual-sources.md` §6).

## 8. Photos

- Fit with `drawImageFit(ctx, IMG[name], x, y, w, h, {fit: 'cover', radius})`, inside a frame from
  `style.palette`: rounded rect and soft shadow.
- Ken Burns: scale from 1.00 to 1.06-1.10 across the hold with a slow drift. At the most zoomed frame the photo
  should map to at most ~1 source pixel per screen pixel; raise `maxW` and `maxH` if needed.
- Parallax (`"parallax": true`): `<name>` (subject, full frame, transparent around it) and `<name>_bg`
  (backplate) have the same size. Draw the plate with offset `dx * 0.4` and the subject with `dx * 1.0`, plus a
  slight scale on the subject. Keep `|dx|` within ~3% of the width: the plate behind the subject is inpainted and
  soft.
- Colour: duotone or tint only if the brand does it (`visual-sources.md`), never on evidence photos. Credit the
  photographer; people need consent.

## 9. UI layers and other captures

Real captures belong to `capture.md`, which keeps their geometry in sidecars under `P/assets/captures/`:
- web UI layers come from the DOM, and `textFree: true` gives an exact text-free copy with text rows;
- native or other rasters use `capture_ui.mjs --textfree`.

Use `prep_assets.py` only for UI-like rasters that should become a named asset:
- a design export, a client screenshot of a single element, a sticker-like device photo;
- `"kind": "ui", "inpaintText": true` writes `<name>_bg` (text-free, from a morphological close or open on the
  raster) and `meta[name].textRows`, for the typing wipe of `motion-recipes.md` §11 (reveal `<name>` over
  `<name>_bg` row by row while the shell grows);
- UI assets keep their geometry (no trim, no resize); q95 or `"lossless": true` keeps text crisp.

Never alter the content of a real capture beyond removing text for a typing effect that then shows that text.

## 10. Without macOS

- `flatbg` (OpenCV) is automatic on Linux and Windows. It floods the backdrop from the frame through soft
  transitions (cast shadows go, crisp pastel objects stay), settles the rest with GrabCut, then snaps the edge and
  defringes. It needs contrast: generate on a chroma-key colour absent from the subject (`#00B140` or `#0047BB`)
  and it decontaminates the green or blue spill.
- `rembg` (`pip install rembg`; downloads model weights on first use; `REMBG_MODEL` picks the model) is the
  automatic choice when installed and Vision is unavailable. It handles busy backgrounds better than `flatbg`.
- Sources that already have alpha skip lifting and still get trim, caps, eyes and blink.
- On macOS, `--check` reports whether Vision works (macOS 14+, `swiftc` from the Xcode command line tools).
  `LIFT_BIN` or `--lift-bin` points to a prebuilt `lift` binary.
