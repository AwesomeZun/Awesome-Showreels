# Example: toyz-tiny-tools (tiny.tools)

A real web app goes in: **tiny.tools**, a toyz original, fourteen small developer tools in one place (JSON,
colours, text diff, Base64, URL, JWT, hashes, regex, case, character count, timestamps, cron, UUID, Korean lorem),
all running inside the browser, with a smart paste pad that recognises what you paste and offers the right tool. The
reel follows the brief GitReels gives its one-shot reel writer (a dynamic 15-second 2D motion-graphics reel in a
style tied to the core of the project; the name and what it is within 2 seconds; one core message; at most four
scenes; every text readable), in Korean like the app, and grows a 30-second cut at the same tempo.

- Web version with every cut: [`dist/tiny-tools-v1.0.0.html`](dist/tiny-tools-v1.0.0.html) ([play in the browser](https://raw.githack.com/AwesomeZun/Awesome-Showreels/main/skills/motion-showreel/examples/toyz-tiny-tools/dist/tiny-tools-v1.0.0.html))
- Cuts: `short` (8 bars = 15.0 s), `30` (16 bars = 30.0 s), all at 128 BPM.

> tiny.tools is a real app (a toyz original, Chrome Club collection). The pastes and tools on screen are captured from
> its production build; the JSON is its own example data.

## Folder

```
toyz-tiny-tools/
  source/                 5 file(s)
    README.md
    fonts/JetBrainsMono-latin-wght.woff2
    fonts/OFL-JetBrainsMono.txt
    fonts/OFL-Pretendard.txt
    fonts/PretendardVariable.woff2
  assets/                 23 file(s)
    captures/ui/app/json_after.json
    captures/ui/app/json_after.webp
    captures/ui/app/json_before.json
    captures/ui/app/json_before.webp
    captures/ui/app/layers.json
    captures/ui/app/smart_color.json
    captures/ui/app/smart_color.webp
    captures/ui/app/smart_epoch.json
    ... 15 more
  modules/                1 file(s)
    tinytools.js
  scenes/                 5 file(s)
    end.js
    hook.js
    json.js
    paste.js
    tools.js
  capture/                1 file(s)
    app.json
  style.json
  reel.config.json
  STORYBOARD.md
  dist/
```

## Run it

```bash
S=skills/motion-showreel; P=$S/examples/toyz-tiny-tools
python3 $S/tools/extract_style.py --source $P/source --project $P --board      # draft style (review by hand)
python3 $S/timing/plan_cut.py --project $P --cut short,30
for c in short 30; do python3 $S/audio/arrange.py --project $P --cut $c; done
python3 $S/audio/verify_sync.py --wav $P/build/music-short.wav --cut $P/build/cut-short.json
node $S/runtime/render.mjs --project $P --cut short --out out/toyz-tiny-tools-short.mp4
node $S/runtime/build.mjs --project $P --cuts short,30 --out out/tiny-tools.html
```

## How it was made

1. **The brief.** GitReels' one-shot prompt and its clarity rules (name and what it is in the first 2 s, one core
   message, at most four scenes in the 15-second cut, readable text). The core message is the app's own line:
   필요한 만큼만, 매일 쓰는 도구, with its smart paste (붙여넣으면, 알맞은 도구를 골라 드려요.) and its promise
   (입력한 내용은 이 브라우저 밖으로 나가지 않아요.).
2. **The real answers.** `capture/app.json` drives the app's production build (served locally; not committed): it
   fills the smart paste pad with a JSON, a JWT, a colour and a Unix time and captures how the app answers each,
   then fills the JSON tool with the app's own example on one minified line and captures it before and after
   정리하기, and four more tools. Captures are stored as WebP.
3. **Drawn from its source.** `modules/tinytools.js` draws the app's logo from its SVG, its top strip and its hero
   type with the lilac caret; the JSON unfolds under a scan line between the two real captures.

## What the tone pass decided

- **palette.** The app's tokens: #07070B / #0E0E15 grounds, text #F4F3FF / #BDB9DC / #908CB1, violet #5B45F0 and #7A66FF, lilac #A89BFF / #CFC7FF (its gradient and its caret), mint #58E3A6 for a valid result.

- **type.** Pretendard Variable at 800 with -0.055em for headlines (the app's hero: 필요한 만큼만, / 매일 쓰는 도구. with its lilac caret), JetBrains Mono for code, numbers and labels.

- **motion.** Quick and exact, like a good tool: tiles snap into a grid on the beat, a paste lands and the pad answers at once, a minified line unfolds into formatted JSON under a scan line.

- **sound.** Chiptune in D major at 128 BPM (8 bars in 15 s, 16 in 30 s): tiny square-wave bleeps for a box of tiny tools, digital SFX for pastes and key presses.

- **visuals.** Four scenes in the 15 s cut: the name and the app's line beside the fourteen tools snapping into place; the real smart paste pad recognising a JSON, a JWT and a colour; the JSON tool formatting a minified line in the browser; the end card. The 30 s cut adds four more tools.

- **narration.** Not recommended: a short, muted launch reel with slogan-length Korean copy shown as type.

## Same BPM, more bars

The 30-second cut is the same reel with longer holds (and optional scenes where they exist); the tempo never changes.

| Scene | short | 30 s |
|---|---|---|
| `hook` | 2 | 2 |
| `paste` | 3 | 4 |
| `json` | 2 | 3 |
| `tools` | - | 4 |
| `end` | 1 | 3 |

## Scenes

**`hook`**: hook (2 bars): the app's own front page, in motion. Its logo and name, its eyebrow (SMALL TOOLS. NOTHING MORE.) and its line typed in with the lilac caret: 필요한 만큼만, / 매일 쓰는 도구. Its three facts count up (14 도구 · 0 서버 요청 · 100% 브라우저 처리) while on the right the fourteen tools snap into a grid an eighth of a beat apart, grouped as the app groups them; on the last beat 01 JSON lights, the tool the next scene opens.

**`paste`**: paste (3 bars; 4 in the 30): smart paste. The app's own pad on the right; every two and a half beats a clipping lands in it (⌘V on the keys below) and the pad answers as the real app did: 감지 · JSON and the JSON tool offered with 01 lit in its table of formats, then a JWT (06), a colour (02) and a Unix time (11). The headline is the pad's own line: 붙여넣으면, / 알맞은 도구를 / 골라 드려요.

**`json`**: json (2 bars; 3 in the 30): it stays in the browser. The app's JSON tool with the pasted JSON on one minified line (its tree already reads it: root Object(6), members Array(3), and ✓ 유효한 JSON · 객체 · 키 6개 · 1ms 미만); ⌘↵ is pressed on beat 3 and the line unfolds into formatted JSON under a lilac scan line, as the app's 정리하기 does. The headline is the app's own promise: 입력한 내용은 이 브라우저 / 밖으로 나가지 않아요.

**`tools`**: tools (4 bars, the 30 only): fourteen in one place. On the left the headline (14가지 도구가 / 한곳에.) over the app's list of tools, two columns, the one on screen lit; on the right four more of the app's tools, a bar each, slide in as captured: 02 컬러 (conversions, WCAG contrast, palettes), 03 텍스트 비교, 08 정규식, 12 cron 설명.

**`end`**: end (1 bar; 3 in the 30): the end card. The app's logo, its name with the lilac dot, its README's one-liner, the address in a dark pill and, at the foot, where it comes from (toyz original, Chrome Club collection).

## Provenance and credits

- The app, its design, its README (`source/README.md`) and its example data belong to the toyz project (a toyz original); the captures are of its production build.
- Music and sound effects are synthesized by `audio/` (no samples).
- Fonts ship with their licences: `source/fonts/OFL-JetBrainsMono.txt`, `source/fonts/OFL-Pretendard.txt`.
