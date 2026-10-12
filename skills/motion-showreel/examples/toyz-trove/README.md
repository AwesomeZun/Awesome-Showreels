# Example: toyz-trove (Trove)

A real web app goes in: **Trove**, a toyz original that turns scattered links into one archive, entirely in the
browser. The reel follows the brief GitReels gives its one-shot reel writer (a dynamic 15-second 2D motion-graphics
reel in a style tied to the core of the project; the name and what it is within 2 seconds; one core message; at most
four scenes; every text readable), in Korean like the app, and grows a 30-second cut at the same tempo. Every screen
in it is the app itself, captured from its production build with its own fictional sample data; the look comes from
the app's own design tokens.

- Web version with every cut: [`dist/trove-v1.0.1.html`](dist/trove-v1.0.1.html) ([play in the browser](https://raw.githack.com/AwesomeZun/Awesome-Showreels/main/skills/motion-showreel/examples/toyz-trove/dist/trove-v1.0.1.html))
- Cuts: `short` (8 bars = 15.0 s), `30` (16 bars = 30.0 s), all at 128 BPM.

> Trove is a real app (a toyz original, Play Objects collection). The links, domains and titles on screen are its
> fictional sample data, captured as the app shows them.

## Folder

```
toyz-trove/
  source/                 5 file(s)
    README.md
    fonts/JetBrainsMono-latin-wght.woff2
    fonts/OFL-JetBrainsMono.txt
    fonts/OFL-Pretendard.txt
    fonts/PretendardVariable.woff2
  assets/                 18 file(s)
    captures/ui/app/bulk.json
    captures/ui/app/bulk.webp
    captures/ui/app/card.json
    captures/ui/app/card_0.webp
    captures/ui/app/card_1.webp
    captures/ui/app/card_10.webp
    captures/ui/app/card_11.webp
    captures/ui/app/card_2.webp
    ... 10 more
  modules/                1 file(s)
    trove.js
  scenes/                 6 file(s)
    connect.js
    end.js
    find.js
    hook.js
    paste.js
    tags.js
  capture/                2 file(s)
    app.json
    explore.json
  style.json
  reel.config.json
  STORYBOARD.md
  dist/
```

## Run it

```bash
S=skills/motion-showreel; P=$S/examples/toyz-trove
python3 $S/tools/extract_style.py --source $P/source --project $P --board      # draft style (review by hand)
python3 $S/timing/plan_cut.py --project $P --cut short,30
for c in short 30; do python3 $S/audio/arrange.py --project $P --cut $c; done
python3 $S/audio/verify_sync.py --wav $P/build/music-short.wav --cut $P/build/cut-short.json
node $S/runtime/render.mjs --project $P --cut short --out out/toyz-trove-short.mp4
node $S/runtime/build.mjs --project $P --cuts short,30 --out out/trove.html
```

## How it was made

1. **The brief.** GitReels' one-shot prompt (`renderer/oneshot/reel.mjs` there: a dynamic 15-second 2D motion-graphics
   reel in a style tied to the project's core, made like a résumé reel) and its clarity rules: name and what it is in
   the first 2 s, one core message, at most four scenes in the 15-second cut, body text at 40 px or more, each sentence
   on screen for 1.5 s or longer, one colour per sentence. The core message is the app's own headline:
   링크가 이어지면 지식이 돼요.
2. **The real app.** `capture/app.json` drives the app's production build (served locally; not committed) through
   its own flows: the sample board's cards as alpha layers, the link form after a memo (the app's own title draft,
   summary and tag suggestions), the multi-paste dialog after a chat fragment (the URLs it found, its count line and
   badges), and a search. Nothing inside those frames is redrawn; scenes crop, reveal and move them. The captures are stored as WebP.
3. **Drawn in code.** The chrome torus is the app's own drawing (its `lib/torus.ts`: tube sections on a tilted orbit,
   each with a gradient along the orbit's normal, painted back to front), ported to canvas so it can turn and open to
   the camera. The link chips, lime scan and URL boxes, the connection lines and the end card are code on the app's
   palette; the lines join cards that really share a tag or that the app lists as related.

## What the tone pass decided

- **palette.** The app's dark theme tokens as they are: bg #08090A, surface #111215/#17191D, text #EEEFF1/#B7BAC1/#8E929B and the single lime #C6F432 that marks what is new or important (the second line of its headline, 'new link' badges, the add button). The topic colours of the sample board (sky #8FD3FF, yellow #FFC94D, lilac #C9A8FF, mint #7EF0C4) are the supporting hues, used only where a topic is meant.

- **type.** Pretendard Variable, as in the app: headlines at 800 with -0.04em tracking, the second line in lime like the app's own masthead ('링크가 이어지면 / 지식이 돼요.'); labels in monospace capitals with wide tracking ('SCATTERED LINKS → ONE TROVE').

- **motion.** Precise and weighty rather than bouncy: things are pulled, not thrown. Link chips drift in depth and get drawn into the torus's orbit; real cards settle with a short damped spring; connection lines draw on with a lime pulse travelling along them. Camera pushes are slow and continuous so no hold sits still.

- **sound.** Dark synth in A minor at 128 BPM (exactly 8 bars in 15 s, 16 in 30 s): a cool, minor-ish pulse that suits a black-and-lime tool, with digital SFX (ticks for chips, blips for found URLs, draw-on tones for the connections).

- **visuals.** Four scenes in the 15 s cut: scattered links pulled into the chrome torus as the name lands; the real paste dialog finding the URLs in a chat; real cards joined by lime lines through the tags they share; the end card. The 30 s cut adds auto tags and summary from the real link form, and the real search.

- **narration.** Not recommended: a short launch reel for a personal tool whose copy is slogan-length Korean, shown as type; it plays muted at the top of a README or a market card.

## Same BPM, more bars

The 30-second cut is the same reel with longer holds (and optional scenes where they exist); the tempo never changes.

| Scene | short | 30 s |
|---|---|---|
| `hook` | 2 | 2 |
| `paste` | 2 | 3 |
| `tags` | - | 3 |
| `connect` | 2 | 3 |
| `find` | - | 2 |
| `end` | 2 | 3 |

## Scenes

**`hook`**: hook (2 bars): scattered links. Link chips from the app's sample data (fictional domains and titles) and raw pasted fragments drift at different depths, out of focus, every which way. The chrome torus (the app's own drawing) spins up at the left; one by one the chips are pulled into its orbit, shrink and vanish into the ring, and the lime reflection runs round it. By 0.5 s the name lands on the right in chrome type, the kicker above it, and by 1.3 s the one-line promise below it: 흩어진 링크를 하나의 지식으로. On the last two beats the ring turns to face the camera and grows; the next scene opens inside its hole.

**`paste`**: paste (2 bars, 3 in the 30): the real "여러 개 붙여넣기" dialog. It is centred when the camera comes through the ring and slides right as the headline rises on the left: 대화째 붙여넣으면 / 링크만 골라 담아요. A chat fragment is pasted (three lines appear one after another), a lime scan runs down the box and boxes each URL the app found, the app's own summary line counts them (URL 3개를 찾았어요 · 새 링크 3개) and its three rows pop in with their "새 링크" badges. The cursor presses "새 링크 3개 추가"; on the last beat the three links fly off to the right. Everything inside the dialog is the captured app (capture/app.json); only the frame, scan, boxes and cursor are code.

**`tags`**: tags (3 bars, the 30 only): auto tags and summary, from the real link form. A memo is already typed (three sentences); the six words the app picked light up one after another, its own one-sentence summary sweeps in under the memo (요약 · 지식 그래프 입문 글이에요.), and each picked word flies down into its suggestion chip. The headline on the right says it plainly: 태그와 요약은 / 알아서 붙어요. Everything inside the card is the captured form.

**`connect`**: connect (2 bars, 3 in the 30; the drop): links joined into knowledge. Nine real cards from the app's board (sample data, fictional) fly in from depth and settle around the pinned looplens card. Lime lines draw on between cards that really share something in that data: looplens to the three links the app lists as related (같은 주제 twice, the keyword 실험), and the tags two cards share (#프런트엔드, #타이포그래피, #검색, #도구). Pulses run along the lines. The app's own headline lands bottom left: 링크가 이어지면 / 지식이 돼요. (second line lime). The camera drifts.

**`find`**: find (2 bars, the 30 only): found again. The real app after a search: the "/" key pops on the left, 시각화 types into the app's search box, its count (1건) appears, and the view pans down from the search box to the one card it kept, where the app's own highlight marks sit on the matched word in the memo and the tag; lime pulses ring them. The headline: / 한 번이면 / 다시 찾아요. The window is the captured screen (capture/app.json, step "search").

**`end`**: end (2 bars, 3 in the 30): the end card. The chrome torus lands at the top centre and keeps turning, its lime reflection running round; the name in chrome type below it, the app's one-liner (흩어진 링크를 하나의 지식으로), the address in a lime-ruled pill and, at the foot, where it comes from (toyz original, Play Objects collection).

## Provenance and credits

- The app, its design, its README (`source/README.md`) and its sample data belong to the toyz project (a toyz original); the captures are of its production build.
- The chrome torus is the app's own drawing (`lib/torus.ts` in the app), ported to canvas for the reel.
- Music and sound effects are synthesized by `audio/` (no samples).
- Fonts ship with their licences: `source/fonts/OFL-JetBrainsMono.txt`, `source/fonts/OFL-Pretendard.txt`.
