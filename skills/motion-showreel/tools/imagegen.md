# Image generation: GPT-image-2 through the Codex CLI

How to make extra character poses, per-member renders, product/prop sheets and eyes-closed twins that match the
source material. This is a recipe, not a tool: nothing here runs on its own.

- **Ask first.** Every image spends the user's ChatGPT usage, and generated imagery has rights implications. Generate
  only when the user (or the run's settings) allows it; otherwise write the exact prompt into the plan as a blocked
  step.
- **No API key.** The Codex CLI's built-in image tool (gpt-image-2 backend) runs on the user's ChatGPT login. Never
  call an image API directly, never read or print keys or `.env` files, never switch to a paid API when the
  ChatGPT usage limit is reached. Wait for the reset instead.
- **Transparent backgrounds are not supported.** Always generate on a flat background and lift it afterwards
  (`prep_assets.py`, see `../references/imagery.md`).

## 1. When to generate (and when not)

| Generate | Do not generate |
|---|---|
| extra poses of the client's **existing** mascot, from its reference image | a new mascot for a brand that has none (propose it, let the client decide) |
| each member of a group mascot, alone, from the group reference | photoreal people, places or products presented as real |
| a product/prop sheet in the material's render style (illustrative objects) | anything that stands in for evidence: screenshots, charts, figures, logs, data |
| an eyes-closed twin of a pose (for `blinkFrom`) | third-party characters, brands, logos, celebrities, real people's likeness |
| spot illustrations in the style the source already uses | logos and text (logos come from the client as vector files; type is drawn in code) |

## 2. Setup check

```bash
codex --version          # Codex CLI installed
codex login status       # must report a ChatGPT login (no API key is used)
```

## 3. The command

Run each job in its own folder, with the reference image copied into it:

```bash
mkdir -p P/source/gen/poses-a && cp P/source/mascot.png P/source/gen/poses-a/ref.png
cd P/source/gen/poses-a
codex exec --skip-git-repo-check --sandbox workspace-write \
  -i ref.png -- "$(cat prompt.txt)" </dev/null > codex.log 2>&1
grep '^SAVED:' codex.log
```

- `--` is mandatory: `-i/--image` takes several files, so without `--` the prompt is swallowed as another image
  path.
- `</dev/null` is mandatory: with a piped or non-terminal stdin Codex waits for more input ("Reading additional
  input from stdin...") and never starts.
- `--sandbox workspace-write` lets Codex write only in the current folder (plus temp). Run from the job folder,
  or pass `-C <job folder>`.
- `--skip-git-repo-check` allows folders outside a git repository.
- Several references: repeat the flag (`-i ref.png -i pose_hint.png --`). Put the identity reference first.
- `-o last.txt` also writes Codex's final message to a file. Avoid `--ephemeral`: it skips persisting session
  files, and the session id is your recovery path (section 4).
- Expect about 1.5 min per image. Output sizes vary (often not exactly 1024 px); `prep_assets.py` normalizes.

## 4. The SAVED protocol

Generated files land in `~/.codex/generated_images/<session id>/` with version-dependent names (`exec-*.png`,
`call_*.png`, `ig_*.png`). Make Codex copy each image into the job folder as soon as it exists, so an
interrupted job still leaves its results. Start every prompt file with this preamble, verbatim:

```text
Generate each image with your image generation tool one at a time. Immediately after each image is generated,
copy the PNG from ~/.codex/generated_images into the current working directory using the exact filename given,
then print a line "SAVED: <path>". Do not edit any other files. Do not stop until all images are saved.
```

Then list the images: `Image 1, filename <name>.png: <prompt>`, `Image 2, ...`. Three images per job is a good
size.

Recovery when SAVED lines are missing: the log header prints `session id: <id>`. Look in
`~/.codex/generated_images/<id>/` (newest `*.png` first), copy the files out and name them after the prompt
list. Compare the count with the plan, because Codex can produce one image more or fewer than asked.

## 5. Parallel jobs

Run 2-4 jobs at once, each in its own folder with its own `prompt.txt`. (Case study: the K-BeautyGate reel made
about 16 mascot poses and a product sheet this way, in batches of three images per job.)

```bash
for job in P/source/gen/poses-a P/source/gen/poses-b P/source/gen/members; do
  ( cd "$job" && codex exec --skip-git-repo-check --sandbox workspace-write \
      -i ref.png -- "$(cat prompt.txt)" </dev/null > codex.log 2>&1 ) &
done
wait
grep -h '^SAVED:' P/source/gen/*/codex.log
```

In Claude Code, launch long batches with the Bash tool's `run_in_background` and check the logs, or keep each job
under the 10-minute tool timeout. Shell `&` jobs outlive the tool call; check with `ps` before starting more.

## 6. Prompt templates

Fill the angle brackets from the reference image and `P/style.json`. Write the **identity sentence** once (shape,
material and render style, colours as hex, eye shape and colour, nose, mouth, cheeks, outfit and accessories) and
paste it unchanged into every prompt for that character.

**A. New pose from the reference** (one per story beat; the pose must read as a silhouette)

```text
Image 1, filename <name>_<pose>.png: Use the attached image as the exact character reference: <identity
sentence>. Keep the same proportions, face, colors, lighting and rendering style exactly. The character is
<one clear action, e.g. "waving hello with one paw raised">, <expression>, <facing the viewer | three-quarter view
facing left>, full body, feet flat on the floor. <Light: soft key light from the upper left, gentle fill.> Plain
flat <background name> (<#hex>) background, very subtle floor shadow. Square 1024x1024, character centered, full
body with generous margin on all sides, ears, tail and props not cropped. No text, letters, logos or watermark.
```

**B. One member of a group, alone.** Never cut members out of a group image: subject lifting merges overlapping
characters and crops include neighbours.

```text
Image 1, filename <member>.png: The attached image shows <k> characters together. Draw ONLY the <position, e.g.
"second from the left"> character (<identity sentence of that member>) ALONE: same proportions, face, colors,
outfit, lighting and rendering style. Full body, standing, facing the viewer. No other characters and nothing
overlapping it. Plain flat <background> (<#hex>) background, very subtle floor shadow. Square 1024x1024,
centered, generous margin, nothing cropped. No text, letters, logos or watermark.
```

**C. Product or prop sheet** (split later with `"split": true`)

```text
Image 1, filename <sheet>.png: In the same <render style words, e.g. "soft 3D render, matte pastel materials,
soft studio lighting"> as the attached reference image (but WITHOUT the character), a clean <r> by <c> grid of
<n> separate <objects>, each object centered in its own equal cell with lots of empty space between cells, all
objects similar size, front view, no overlapping, nothing touching the image border. Row 1: <object>; <object>;
<object>. Row 2: ... Colors limited to <#hex list from style.json>. Plain flat <background> (<#hex>) background.
Absolutely no text, letters, labels with writing, logos or watermark anywhere.
```

**D. Eyes-closed twin** (for `"blinkFrom"` when the eyes are not simple dark dots, e.g. anime eyes with whites)

```text
Image 1, filename <name>_closed.png: Recreate the attached image exactly: same character, pose, framing, camera,
lighting, colors and background. Change ONE thing only: both eyes gently closed, relaxed, as in the middle of a
blink. Everything else stays identical. No text, letters, logos or watermark.
```

**E. Spot illustration in the material's style**

```text
Image 1, filename <thing>.png: A single <object or scene element> in <the source's own illustration style,
e.g. "flat vector with 2 px dark outlines and no gradients">, colors limited to <#hex list>. Isolated on a plain
flat <background> (<#hex>) background, centered, generous margin. No text, letters, logos or watermark.
```

One change per image. If a pose comes back off-model, regenerate with a sharper identity sentence. Do not pile
corrections into one prompt.

## 7. Backgrounds that lift cleanly

| Situation | Background to ask for | Why |
|---|---|---|
| macOS (Vision lifting) | a flat pastel close to the reel's own backdrop (`style.palette.bg` or `bg2`) | any residual fringe is already the reel's colour |
| subject has large areas of that pastel | a complementary flat tint (white plush: soft pink, mint or sky; pink product: mint) | lifters cut holes where subject and backdrop match |
| no macOS (`flatbg` backend) | a saturated key colour absent from the subject: `#00B140` green or `#0047BB` blue | colour keying needs distance; prep_assets despills the edge |
| dark subject | light neutral `#EDEDED` | contrast on every edge |
| always | flat: no gradient, vignette, texture, bokeh, props or floor line | the lift and the edge snap assume a smooth backdrop |

"Very subtle floor shadow" keeps poses grounded and feet flat. Vision leaves it out of the cutout, and the reel
draws its own contact shadow (`groundShadow`). When a shadow does get baked in, `prep_assets.py` warns and
`"shadow": "remove"` takes it out.

## 8. Matching `style.json`

- Colours: hex values from `style.palette` for props, clothing, backgrounds and sheets. Never recolour the
  client's mascot to fit a palette. The palette was derived from the material, mascot included, so it adapts
  around the mascot.
- Rendering: borrow the words from the source's own imagery ("soft 3D plush render", "flat vector, 2 px
  outlines", "risograph texture") and from `style.mood`. One rendering style per reel unless the source mixes
  them.
- Consistency: same light direction ("soft key light from the upper left"), same camera ("eye level, full body"),
  same framing in every prompt. Attach the original reference to every job, and optionally the best pose so far as
  a second reference.
- Leave out text, logos and UI. They are drawn in code from the real copy, or captured from the real product.

## 9. QA right after generation

Open every image (Read tool) next to the reference before running `prep_assets.py`:

- on-model: eye shape, size and spacing; ear and limb length; colours; accessory placement; finger and paw
  count; proportions at the same height;
- framing: full body with margin (prep_assets warns "touches the frame edge" when ears or feet are cut);
- backdrop: flat, with no vignette, no extra objects and no floor line;
- no text, glyph-like marks or watermarks;
- light direction consistent across the set.

Reject and regenerate rather than fix. Ask for 2-3 variants of a pose that carries the story.

## 10. Rights and provenance

- The reference character must belong to the client or be licensed to them. Generated poses are derivatives
  made for this client's reel. They do not go into public repositories unless the client says so. (The skill's
  own examples use art made from scratch.)
- Record provenance per image: tool (Codex CLI image generation, gpt-image-2 backend), date, prompt file,
  reference images. Put it in the asset's `"prov"` field in `P/assets.json`. `prep_assets.py` copies it to
  `P/build/provenance.json` for the credits.
- Credits say what is generated, e.g. "Character poses generated with GPT-image-2 from <client>'s mascot". Some
  platforms and campaigns require an AI-imagery disclosure; follow the client's rules.
- Check OpenAI's current terms and usage policies for output ownership and permitted use before shipping.
- Keep prompts, references and `codex.log` in the reel project (`P/source/gen/<job>/`), not in the skill
  repository.

## 11. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Hangs; log says "Reading additional input from stdin" | stdin left open | add `</dev/null` |
| "No such file" for the prompt text, or no prompt | `-i` swallowed it | put `--` before the prompt |
| No `SAVED:` lines | job interrupted, or Codex skipped the copy | section 4 recovery via the session id |
| Permission denied while saving | wrong working folder | run inside the job folder with `--sandbox workspace-write` |
| Usage limit message | ChatGPT plan limit | wait for the reset; never fall back to a paid API |
| Off-model face or colours | vague identity sentence | exact identity sentence with hex colours, reference attached, one change per image |
| Ears or feet cut; prep_assets warns about the frame edge | tight framing | "full body with generous margin on all sides" |
| Two characters merged in one cutout | group image used as a source | template B, one member per image |
| Blink looks wrong on detailed eyes | eyes are not simple dark dots | template D plus `"blinkFrom"` |
