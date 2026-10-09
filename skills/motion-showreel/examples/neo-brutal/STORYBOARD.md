# kablok storyboard and build contract

Timing lives in `reel.config.json`; this file holds the words and the choreography. Violations of "Copy rules" are
bugs. Guide: `../../references/storyboard.md`.

## 1. Brief

- **One sentence:** kablok is a creator-tools page builder: pick chunky blocks, stack them into a page, hit Publish.
- **One scene:** the Ship stage: tomato floor, "Ship it." slammed in Archivo Black, Mara's stacked page with the
  LIVE sticker, live-activity toasts dropping in (poster: `"poster": 9.4`, cut `short`).
- **One message:** "Stack blocks. Ship your page." (the hero H1 of `source/index.html`; the end-card line).
- **Audience / purpose / venue:** creators / launch teaser / README loop and social autoplay (muted first: every idea
  is on screen as type).
- **Languages:** en (US). No CJK copy.
- **Source material** (`source/`, written for this example):
  - `index.html`: the landing page (hero, Mara's example page, toasts, ink marquee, Pick/Stack/Ship steps, block
    library, pricing, fictional-product footer). Every on-screen string comes from here.
  - `kablok.css`: tokens `--kb-*`, 5 px ink borders, 8 px hard offset shadows, press/pop/drop keyframes.
  - `BRAND.md`: voice, colour roles, shape, type, motion and sound rules.
  - `logo.svg`: the lemon wordmark slab.
  - `fonts/`: Archivo (variable, wdth 62-125) and Martian Mono, both SIL OFL 1.1 with their licence files.

## 2. Copy rules (violations are bugs)

### 2.1 Exact strings

| id | String (verbatim) | Scene | Role |
|---|---|---|---|
| c1 | `Pick` / `a block.` | pick | headline, slams in word by word |
| c2 | `20+ chunky blocks: links, tips,` / `merch, drops, video.` | pick (30 only) | subline |
| c3 | `Link` `Tip jar` `Merch drop` `Newsletter` `Video` `Countdown` | pick | block library cards |
| c4 | `New: drop blocks` | pick (30 only) | sticker |
| c5 | `Stack it.` | stack | headline |
| c6 | `Drag it in. It snaps.` / `Reorder with one hand.` | stack | subline |
| c7 | `@mara.makes` / `zines, prints & tiny comics` | stack, ship | example page header |
| c8 | `My new zine` `Tip jar` `Merch drop` `Sunday Scraps` `Subscribe` | stack, ship | page blocks |
| c9 | `Draft` `Publish` | stack | editor toolbar (illustrative) |
| c10 | `Ship it.` / `One button.` / `Your page is live.` | ship | headline + subline |
| c11 | `LIVE` | ship | starburst sticker |
| c12 | `Zine #4 sold out` `Sam subscribed` `Jo sent a tip` | ship | live-activity toasts |
| c13 | `kablok` | logo | wordmark, always lowercase |
| c14 | `Stack blocks. Ship your page.` | logo | tagline |
| c15 | `Free for one page.` `No card. No code.` | logo (30 only) | stickers |
| c16 | `No sad link lists` `No gatekeeping` `Just blocks` `No code` | pick, logo | ink marquee |
| c17 | `kablok is fictional. Every creator, handle and notification here is made up.` | logo | disclaimer (condensed from the footer) |

### 2.2 Banned (BRAND.md "Voice")

Exclamation marks (the page allows one; the reel uses none), "users", "website", "widgets", seamless, leverage,
synergy, solution, AI-powered, revolutionary, best-in-class, world-class. The name is never capitalised.

## 3. Look rules

- Flat fills only, ink `#111111` text on every colour; no gradients, glows, blur or transparency on brand colours.
- Every component is a box with a 6 px ink border, a 10 px hard ink shadow, 16 px radius (the CSS scaled 1.33x).
- Presses translate into the shadow (80 ms); pops grow from 60% with one overshoot (about 180 ms) and stop dead;
  drops fall linearly, squash 6%, and the stack below thunks. Stickers tilt within 8 degrees.
- Transitions are drawn in scene code: slabs that slide or drop like stacked cards, and the Publish button flooding
  the frame in tomato. Hard cuts on bar lines in between.

## 4. Beat tables (112 BPM, 4/4, bar 2.143 s)

### pick (1 bar in `short`, 2 in `30`) - lilac stage

| beat | action |
|---|---|
| 0 | "Pick" slams in (squash), the first block card pops |
| 0.25-1.5 | the other five library cards pop on sixteenths |
| 1.75-2.25 | chunky cursor swings in, grabs Link (press into shadow) |
| hold | cards bob on the beat, "New: drop blocks" sticker stamps (30), marquee runs |
| out (last beat) | lemon and mint slabs slide up carrying the Link card |

### stack (2 bars / 4 bars) - paper stage with editor toolbar

| beat | action |
|---|---|
| 0-3 | page frame drops, blocks fall into slots one per beat (thunk, squash) |
| 3.25-4 | cursor drops Link into the gap, guides flash, snap |
| hold | cursor reorders a block (lift, swap, land) every bar; timers tick |
| out | cursor presses Publish; it floods the frame tomato |

### ship (2 bars / 4 bars) - tomato stage

| beat | action |
|---|---|
| 0 | "Ship it." slams; "it." on a paper slab |
| 1 | LIVE starburst stamps on the page |
| 3, 4, 5 | toasts drop in: Sam subscribed, Jo sent a tip, Zine #4 sold out |
| hold | arrow draws, toasts re-stack each bar, tip chips press, merch timer counts down |
| out | mint and lilac slabs wipe up |

### logo (2 bars / 4 bars) - paper stage

| beat | action |
|---|---|
| 0-0.75 | lemon slab drops, "kablok" letters pop in on sixteenths (Expanded 900) |
| 1.5-2 | tagline lands word by word |
| 4 | cursor clicks the slab (press) |
| hold | slab presses on every bar, stickers stamp (30), marquee runs, disclaimer at the foot |

## 5. Cuts

- `short`: 7 bars = 15.0 s (pick 1, stack 2, ship 2, logo 2).
- `30`: 14 bars = 30.0 s, planned by `timing/plan_cut.py` (pick 2, stack 4, ship 4, logo 4); longer holds add the
  reorder loop, more toasts and the stickers.
