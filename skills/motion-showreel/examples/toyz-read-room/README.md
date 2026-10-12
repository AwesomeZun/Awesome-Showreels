# Example: toyz-read-room (Read Room)

A real web app goes in: **Read Room**, a toyz original, a small reading room where a few people underline one
text and talk in its margins, shared by link or file without a server. The reel follows the brief GitReels gives its
one-shot reel writer (a dynamic 15-second 2D motion-graphics reel in a style tied to the core of the project; the name
and what it is within 2 seconds; one core message; at most four scenes; every text readable), in Korean like the
app, and grows a 30-second cut at the same tempo. The essay, its highlights and its notes are the app's own,
captured from its production build with its fictional sample room.

- Web version with every cut: [`dist/read-room-v1.0.1.html`](dist/read-room-v1.0.1.html) ([play in the browser](https://raw.githack.com/AwesomeZun/Awesome-Showreels/main/skills/motion-showreel/examples/toyz-read-room/dist/read-room-v1.0.1.html))
- Cuts: `short` (6 bars = 15.0 s), `30` (12 bars = 30.0 s), all at 96 BPM.

> Read Room is a real app (a toyz original, Play Objects collection). The essay and the readers on screen are its
> fictional sample room, captured as the app shows it.

## Folder

```
toyz-read-room/
  source/                 5 file(s)
    README.md
    fonts/JetBrainsMono-latin-wght.woff2
    fonts/OFL-JetBrainsMono.txt
    fonts/OFL-Pretendard.txt
    fonts/PretendardVariable.woff2
  assets/                 15 file(s)
    captures/ui/app/card.json
    captures/ui/app/card_0.webp
    captures/ui/app/card_1.webp
    captures/ui/app/geo.txt
    captures/ui/app/home.json
    captures/ui/app/home.webp
    captures/ui/app/layers.json
    captures/ui/app/paper.json
    ... 7 more
  modules/                1 file(s)
    readroom.js
  scenes/                 5 file(s)
    end.js
    hook.js
    questions.js
    together.js
    underline.js
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
S=skills/motion-showreel; P=$S/examples/toyz-read-room
python3 $S/tools/extract_style.py --source $P/source --project $P --board      # draft style (review by hand)
python3 $S/timing/plan_cut.py --project $P --cut short,30
for c in short 30; do python3 $S/audio/arrange.py --project $P --cut $c; done
python3 $S/audio/verify_sync.py --wav $P/build/music-short.wav --cut $P/build/cut-short.json
node $S/runtime/render.mjs --project $P --cut short --out out/toyz-read-room-short.mp4
node $S/runtime/build.mjs --project $P --cuts short,30 --out out/read-room.html
```

## How it was made

1. **The brief.** GitReels' one-shot prompt and its clarity rules (name and what it is in the first 2 s, one core
   message, at most four scenes in the 15-second cut, readable text). The core message is the app's own line:
   읽고 싶은 글을, 함께 읽을 사람과.
2. **The real page, twice.** `capture/app.json` drives the app's production build (served locally; not committed)
   in a tall window: the essay page as the app shows it, the same page with the highlights and tools hidden, the
   margin notes, the discussion and read-together panels and the first screen. A DOM pass writes the line boxes of
   every highlight (`geo.txt`). Captures are stored as WebP.
3. **Drawn on.** `modules/readroom.js` lays the plain page on the desk and reveals the real page inside each
   highlight's line boxes, left to right at pen speed, so every highlight in the reel is one the app drew. The
   orange marker behind the headlines echoes the app's own hero.

## What the tone pass decided

- **palette.** The app's desk and paper: desk #E3E4E7 / #D6D8DC, paper #FBFBFA, ink #17191D / #4B4F57, and the readers' highlighter colours (orange #FF9A3D, yellow #FFD23F, green #45D08B, blue #6FB2FF). The orange highlighter is the accent, swept behind a line as the app's own hero does; text never sits in a light colour.

- **type.** Pretendard Variable at 900 for headlines, ink on the desk, the key line marked with an orange highlighter sweep like the app's '함께 읽을 사람과.'; the essay itself is the captured page in the app's own reading type; JetBrains Mono capitals for labels ('A QUIET READING ROOM').

- **motion.** The pace of reading: the camera moves down the page slowly, highlights draw on at pen speed along the real line boxes, margin notes slide in from the right and settle. Nothing jumps.

- **sound.** Ambient in E major at 96 BPM (6 bars in 15 s, 12 in 30 s): a quiet room with soft pads and sparse bells, light drums, minimal SFX (a soft pen stroke for each highlight, a page swish).

- **visuals.** Four scenes in the 15 s cut: the name and the room's one-liner over the desk; real highlights drawn on in the real essay by two readers and their margin notes; the whole page with every reader's highlights beside the app's read-together panel (link, file, participants); the end card with the app's own line. The 30 s cut adds the discussion questions.

- **narration.** Not recommended: a short, muted launch reel; the reading happens on screen.

## Same BPM, more bars

The 30-second cut is the same reel with longer holds (and optional scenes where they exist); the tempo never changes.

| Scene | short | 30 s |
|---|---|---|
| `hook` | 1 | 2 |
| `underline` | 2 | 3 |
| `questions` | - | 2 |
| `together` | 2 | 3 |
| `end` | 1 | 2 |

## Scenes

**`hook`**: hook (1 bar, 2 in the 30): a quiet reading room. On the grey desk the name lands (Read Room, with the app's chrome X mark cropped from its first screen), the kicker above, and the room's one-liner below with an orange highlighter sweeping behind it, as the app marks its own headline: 함께 읽는 작은 열람실.

**`underline`**: underline (2 bars, 3 in the 30): underline it, talk in the margin. The app's real essay (느리게 읽는 방, its own fictional sample) lies on the desk; the camera reads down it. Blue draws on along the real line boxes of the first reader's highlight (느리게 읽는 사람은 한 글 안에 오래 머뭅니다), and her margin note slides in beside paragraph 04 (민지 · 메모 2); further down a second reader's orange and a third's yellow draw on one after another. In the 30 the green one and the note on paragraph 11 (태오) follow. Headline right: 밑줄 긋고, / 메모를 나눠요.

**`questions`**: questions (2 bars, the 30 only): bring a question. The page dims behind; the app's real discussion panel rises on the right with its three questions, each linked to a paragraph (문단 8, 11, 15), the last already ticked 다뤘어요; each question lights on the beat. Headline left: 질문을 올리고, / 모임에서 다뤄요.

**`together`**: together (2 bars, 3 in the 30; the drop): together without a server. The camera pulls back to the whole essay with every reader's highlights in four colours; the app's real read-together panel rises beside it: share the room as one link (the button is pressed and a link chip flies off carrying its compressed hash), or as a .readroom.json file, and its two participants (민지, 태오). Headline: 서버 없이, / 링크 하나로 함께.

**`end`**: end (1 bar, 2 in the 30): the end card. The app's own line in two parts, the second marked in orange as its hero does (읽고 싶은 글을, / 함께 읽을 사람과.), the name and address below and the collection at the foot.

## Provenance and credits

- The app, its design, its README (`source/README.md`) and its sample room belong to the toyz project (a toyz original); the captures are of its production build.
- Music and sound effects are synthesized by `audio/` (no samples).
- Fonts ship with their licences: `source/fonts/OFL-JetBrainsMono.txt`, `source/fonts/OFL-Pretendard.txt`.
