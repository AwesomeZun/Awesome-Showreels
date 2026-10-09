# Visual Notes Lab storyboard and build contract

Timing lives in `reel.config.json`; this file holds the words and the choreography. Violations of "Copy rules" are
bugs. Guide: `../../references/storyboard.md`.

## 1. Brief

- **One sentence:** Lesson 3 of a hand-drawn note-taking workshop teaches three moves (box, arrow, star) that turn a
  wall of meeting notes into one page people actually look at.
- **One scene:** the rescued wall: three blue boxes joined by "why?" and "so" arrows, ONE orange star, "Notes people
  see." written over the ghost of the old question (poster frame: cut `short`, t = 7.6 s; `"poster": 7.6`).
- **One message:** "Box it. Arrow it. Star it." (the lesson title; the end-card banner).
- **Audience / purpose / venue:** workshop sign-ups (team leads, PMs, teachers) / session teaser / chat and social
  autoplay, muted first: every idea is on the board as handwriting.
- **Languages:** en. No CJK copy.
- **Source material** (`source/`, written for this example):
  - `lesson-03-notes.md`: the facilitator's lesson notes: plan, timings, board plan, the three moves, marker jobs,
    the exercise wall, arrows (→), ALL-CAPS ONE, "Overshoot = alive.", "squeak = good marker".
  - `README.md`: the workshop page: sessions table, kit list (black / blue / orange and their jobs), disclaimer.
  - `handout/lesson-03-handout.html` + `handout.css` + `.pdf`: the printed handout; its CSS tokens are the palette and
    its two fonts are the type.
  - `fonts/shantell-sans/`, `fonts/caveat/` (each with `OFL.txt`): the marker voice and the pen voice.

## 2. Copy rules (violations are bugs)

### 2.1 Exact strings (mirrored in `modules/lesson-board.js` `LB.COPY`)

| id | String (verbatim) | Scene | Role | Source |
|---|---|---|---|---|
| c1 | `Notes nobody reads?` | wall | headline, black marker | README tagline "Notes nobody reads" |
| c2 | `nobody` | wall | circled in orange | notes: "orange → circles" |
| c3 | the 8-line "Weekly sync, Tue. ..." wall | wall, rescue | exercise text, body marker | notes: exercise 3a |
| c4 | `Customers wait 3 days` / `shared inbox = no owner` / `one owner per day` | rescue | boxed phrases, then the diagram | notes: worked answer |
| c5 | `why?` / `so` | rescue | arrow labels, pen | notes: "label every arrow" |
| c6 | `BOX IT` `ARROW IT` `STAR IT` | rescue | method tags, caps | notes: the three moves |
| c7 | `Notes people see.` | rescue | new headline over the ghost of c1 | README tagline |
| c8 | `try it for two weeks` | rescue hold (30) | margin note, pen | exercise text |
| c9 | `3 markers. 3 jobs.` | kit (30) | headline | README kit list |
| c10 | `words` / `structure` / `the ONE thing` | kit (30) | marker jobs | README kit list |
| c11 | `if everything is orange → nothing is!!` | kit (30) | margin note | notes |
| c12 | `all it takes:` | arrow to kit (30) | pen label | authored |
| c13 | `try it Thursday` | arrow to title | pen label | README schedule |
| c14 | `Visual Notes Lab · Lesson 3` | endcard | kicker, pen | README |
| c15 | `Box it. Arrow it. Star it.` | endcard | banner title | session 3 title |
| c16 | `Thursday 10:00 · Studio room 2` | endcard | details | README schedule |
| c17 | `bring your 3 markers` | endcard | pen line + three dots | README kit |
| c18 | `see you there! — Mara` | endcard hold (30) | sign-off, pen | facilitator name |
| c19 | `Scribblewell Studio is fictional · example notes are made up` | endcard | disclaimer label | README disclaimer |

### 2.2 Rules

- Every word is written on with the marker (stroke order, `modules/ink.js`); nothing fades or blurs in.
- Orange marks exactly ONE thing per panel (the circle, the star, the kit's "the ONE thing"). Blue is structure only.
- Nothing is a real brand, product or person. No emoji on the board (the README's ✏️ stays in the README).

## 3. Grammar

One whiteboard, one take. Each scene is a camera shot on a panel of the board (`modules/lesson-board.js`); scene
changes are camera flights that follow a drawn blue arrow (the board plan's "zones joined by big blue arrows"), and
the eraser wipes in short zig-zag passes leaving a ghost. The compositor only cuts (`in: cut` / `match`).

## 4. Beats (104 BPM, bar = 2.308 s)

| Scene | short (6 bars, 13.85 s) | 30 (13 bars, 30.0 s) | Beats on screen |
|---|---|---|---|
| wall | 1 bar | 2 bars (+ sleepy reader, z z z) | wall writes line by line; c1 written; "nobody" circled on beat 2-2.5; camera pulls back to rest |
| rescue | 3 bars | 5 bars (+ icons, reader wakes, c8, dot votes) | eraser wipes c1 (b0-1); three boxes (b1-2.5); lift (b2.75); wall erased, ghost stays (b3-4); cards land with a thump (b4.5); arrows + labels (b5-6); ONE star (b6.35-7, pop); c7 written (b7.25); camera follows a big blue arrow out |
| kit | cut out | 3 bars | three markers drop on the beat, caps pop, each draws its job; c11 margin note |
| endcard | 2 bars | 3 bars (+ markers drop in tray, c18) | banner drawn, c15 written, star lands on "Star it." (b4, chime), c16/c17 written, camera steps back to the whole board (b5.5-7) |

Cues per scene are in `reel.config.json` (draw-on squeaks, cap pops, eraser swishes, thumps). Every scene keeps a
moving element in its hold (camera breathing, boil on the strokes, hold-only doodles), checked by `tools/motion_qa.py`.
