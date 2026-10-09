# 余白庵 (Yohaku-an) storyboard and build contract

Timing lives in `reel.config.json`, and this file holds the words and the choreography. Anything that breaks the
"Copy rules" is a bug. Guide: `../../references/storyboard.md`.

## 1. Brief

- **One sentence:** 余白庵 is a ten-room ryokan in a mountain valley that sells time left empty: ink-slow days, a bath
  and one bowl of tea.
- **One scene:** an ensō opens on bare washi, 余白庵 stands as one Mincho column and a small vermilion seal is
  pressed once (poster frame: cut `short`, t = 12.5 s; `reel.config.json` `"poster": 12.5`).
- **One message:** 墨がにじむ速さで、すごす宿。 (the site's tagline).
- **Audience / purpose / venue:** travellers / brand teaser / site hero loop and social autoplay. The reel works
  muted because every line is on screen.
- **Languages:** ja-JP only, set vertically (縦組み), read right to left.
- **Source material** (`source/`, written for this example):
  - `site/index.md`, `site/chaseki.md`: the inn's site and the tea-room guide (copy, register, the words the reel uses).
  - `site/index.html`, `site/style.css`: the rendered site. Its CSS tokens hold the eight traditional colours, the
    vertical writing mode and the single face.
  - `brand/shitsurae.md`: the house rules (しつらえ): one vermilion seal, no gradients/gold, Mincho only, three type
    sizes, motion "like ink soaking into paper, like mist clearing", sound "suikinkutsu drop, koto, shakuhachi breath,
    about 70 per minute".
  - `print/kaiki.pdf`: the printed 懐紙 card with the seal.
  - `fonts/ShipporiMinchoB1-Regular.ttf` + `OFL.txt`: the only face (SIL OFL 1.1, from google/fonts `ofl/shipporiminchob1`).

## 2. Copy rules (violations are bugs)

### 2.1 Exact strings

| id | String (verbatim, one column per item) | Scene | Role | Source |
|---|---|---|---|---|
| c1 | `墨がにじむ速さで、` / `すごす宿。` | shizuku | tagline (2 columns) | index.md line 3 |
| c2 | `山あいの谷に、` / `十の部屋だけの` / `小さな宿です。` | yama | place (3 columns) | index.md "山あいの谷に、十の部屋だけの小さな宿です。" |
| c3 | `この一服は、` / `二度とおなじには` / `なりません。` | chaseki | tea line (3 columns) | chaseki.md (一期一会 in the guide's own words) |
| c4 | `余白庵` | rakkan | name (1 column, 120 px) | everywhere |
| c5 | `「余白」` seal | rakkan | the one vermilion mark | shitsurae.md 落款 |
| c6 | `yohaku-an.example` | rakkan | foot, right | index.md ご予約 (fictional domain) |
| c7 | `※ 余白庵は、作例のための架空の宿です。` | rakkan | foot, left | fictional-inn note |

### 2.2 Rules

- Vertical Mincho only, three sizes (24 / 52 / 120 px). No horizontal Japanese headlines, no gothic fallback.
- Vermilion appears once in the whole reel, on the seal. No vermilion text, no gradients, no gold.
- Banned: exclamation marks, English taglines, "luxury"/"best", emoji, countdowns, prices.
- Line breaks and punctuation exactly as in 2.1 (the font's vertical 、 and 。 forms).

## 3. Scenes

Pace: 72 BPM, 4/4, bar = 3.333 s. Everything enters like ink soaking in (bleed reveals, brush strokes that dry)
and leaves like mist clearing. Scene changes are a slow dissolve with the scroll panning right to left
(`modules/sumi.js`). Paper grain and mist drift on every frame, so no hold is static.

| Scene | Bars (short / 30) | Beat choreography | Hold (when the cut grows) |
|---|---|---|---|
| shizuku 一滴 | 1 / 2 | b0 a shadow grows; b0.5 the drop lands and blooms (ring + spatter); b1, b1.5 the two columns soak in | the bloom creeps; a second drop lands on the bar line and the wet fronts meet |
| yama 山あい (30 only) | – / 2 | b0 mist; b0.5–2 far and near washes, right to left; b2 haboku slope; b2.5–3.5 three columns; b3–4 moss dots | mist drifts; dots tap on the beat |
| chaseki 茶席 | 2 / 3 | b0.5 the body is swept in as three wide strokes; b1.75 rim; foot; b2.5 tea settles; steam; b3+ three columns | steam rises; a fuller breath of steam on each bar line |
| rakkan 落款 | 1 / 2 | b0 the ensō in one breath; b1.25 name; b1.5 foot lines; b2 the seal is pressed (stamp cue) | the ensō dries and its halo creeps |

Cuts (planned by `timing/plan_cut.py`, see `build/cut-*.json`):

- `short`: 4 bars = 13.3 s (shizuku 0–1, chaseki 1–3, rakkan 3–4). `yama` is excluded.
- `30`: 9 bars = 30.0 s (shizuku 0–2, yama 2–4, chaseki 4–7, rakkan 7–9).

## 4. Sound (stage 2)

Not made yet. Brief from `style.json` `sound`: 72 BPM, D minor over hirajōshi (D E F A Bb), no drums, koto-like
plucks on the hits (drop, stroke ends, seal), a breathy shakuhachi-like pad underneath, a suikinkutsu drop for
`plink`, paper/wood SFX. The cues are already in `reel.config.json`.
