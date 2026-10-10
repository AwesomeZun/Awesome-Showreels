# Example: explainer-llm (How a language model picks the next word)

A question goes in (how does a language model pick the next word?) and a mathematical animation comes out, on a
dark navy page. Text is cut into tokens; tokens become arrows on a plane, words used alike pointing alike; king − man
+ woman lands next to queen; the last word looks back and adds up what the others suggest, tip to tail; the whole
plane turns and squashes onto that arrow to score every word; softmax turns the scores into bars and a needle draws
the word. The 60-second cut adds a stack of layers seen from the side and a temperature dial. Every number on screen
comes from a two-dimensional toy the reel names as one. Nothing here picks a preset: palette, type, motion and music
come from `source/` and are written to `style.json` with the reasoning for every decision.

- Web version with every cut: [`dist/next-word-explainer-v1.0.0.html`](dist/next-word-explainer-v1.0.0.html) ([play in the browser](https://raw.githack.com/AwesomeZun/Awesome-Showreels/main/skills/motion-showreel/examples/explainer-llm/dist/next-word-explainer-v1.0.0.html))
- Cuts: `short` (6 bars = 15.0 s), `30` (12 bars = 30.0 s), `60` (24 bars = 60.0 s), all at 96 BPM.

> An explainer of a real idea, drawn with a two-dimensional toy: its fifteen word arrows are placed by hand, and every attention weight, score and probability on screen is computed from them (`model-src/toy.py`). Real models use thousands of dimensions and learn their arrows from text; the reel says so on screen.

## Folder

```
explainer-llm/
  source/                 6 file(s)
    fonts/KaTeX_Main-Bold.ttf
    fonts/KaTeX_Main-Italic.ttf
    fonts/KaTeX_Main-Regular.ttf
    fonts/KaTeX_Math-Italic.ttf
    fonts/OFL.txt
    notes.md
  assets/                 1 file(s)
    data/toy.json
  modules/                1 file(s)
    vm.js
  scenes/                 9 file(s)
    arith.js
    arrows.js
    attend.js
    end.js
    layers.js
    probs.js
    sample.js
    sentence.js
    ... 1 more
  model-src/              1 file(s)
    toy.py
  style.json
  reel.config.json
  STORYBOARD.md
  dist/
```

## Run it

```bash
S=skills/motion-showreel; P=$S/examples/explainer-llm
python3 $S/tools/extract_style.py --source $P/source --project $P --board      # draft style (review by hand)
python3 $S/timing/plan_cut.py --project $P --cut short,30,60
for c in short 30 60; do python3 $S/audio/arrange.py --project $P --cut $c; done
python3 $S/audio/verify_sync.py --wav $P/build/music-short.wav --cut $P/build/cut-short.json
node $S/runtime/render.mjs --project $P --cut short --out out/explainer-llm-short.mp4
node $S/runtime/build.mjs --project $P --cuts short,30,60 --out out/next-word-explainer.html
```

## How it was made

1. **A toy you can see.** `model-src/toy.py` places fifteen words as arrows in two dimensions (small words, animals,
   actions, people, places) and computes everything else: the last word's attention weights from hand-set queries and
   keys, the new arrow h = x + Σ aⱼvⱼ, every word's score h · w, the softmax and the two draws (u = 0.31 gives mat,
   u = 0.62 gives floor). It writes `assets/data/toy.json`; `modules/vm.js` recomputes the probabilities at any
   temperature live.
2. **Mathematical animation in code.** The plane draws itself from the middle out and can be carried through any 2×2
   matrix, so turning it until h points right and then squashing it onto that line is the dot product shown as a
   projection. Text writes its outlines before it fills (a growing dash on every glyph contour); formulas are set in
   code and morph into the next one, matching terms gliding to their new places. No generated images.
3. **One reel, three lengths.** Each scene starts where the one before it left off (the camera's slow push carries
   across the cut) and only the overlays crossfade, so the 15-, 30- and 60-second cuts all read as one continuous
   animation at 96 BPM.

## What the tone pass decided

- **palette.** A dark navy page (#0C1424) where pastel inks read as light: one colour per kind of meaning, so the eye sorts before the words are read. Animals green (#83C167), actions red (#FC6255), people blue (#58C4DD), places gold (#F0AC5F), small words grey-blue (#A9B6C9); the arrow that context has bent is yellow (#F7D94C), and attention's messages are teal (#5CD0B3).

- **type.** KaTeX Main and KaTeX Math, the Computer Modern faces of typeset mathematics: words upright, variables in math italic, formulas set in code with fractions, sums, superscripts and subscripts so they can morph term by term.

- **motion.** Mathematical animation: a coordinate plane draws itself from the middle out, arrows grow from the origin, text writes its outlines before it fills, formulas morph with matching terms gliding to their new places, the whole plane rotates and then squashes onto a line (the dot product as a projection), vectors add tip to tail. Smooth in-out easing (ioC, ioSine) and outExpo for arrivals; no bounce. Scenes hand over without a jump: the plane and the sentence stay where they were, the camera's slow push carries across the cut, and only the overlays crossfade.

- **sound.** Soft pads, glass and bells playing broken chords at 96 BPM in D major (ambient preset, a soft kick, rim and shaker): a pop as each arrow grows, glassy ticks as text writes, a rising draw tone as the plane folds, a count-roll as the needle runs and a ding when it stops on mat.

- **visuals.** A question and a sentence; the sentence cut into tokens; tokens become arrows on a plane, words used alike pointing alike; king − man + woman landing near queen; (60) a stack of layers seen from the side, every arrow bent a little more at each; the last word looking back at the others and adding their messages tip to tail; the plane turned and squashed onto a line to score every word; softmax bars; (60) temperature sharpening and flattening them; a needle choosing mat; the sentence going on. No generated images: everything is drawn in code.

## Same BPM, more bars

The 30- and 60-second cuts are the same reel with longer holds and the scenes only they have; the tempo never changes.

| Scene | short | 30 s | 60 s |
|---|---|---|---|
| `sentence` | 1 | 1 | 2 |
| `arrows` | 1 | 2 | 2 |
| `arith` | - | 2 | 3 |
| `layers` | - | - | 4 |
| `attend` | - | 2 | 3 |
| `probs` | 2 | 2 | 3 |
| `temp` | - | - | 3 |
| `sample` | 1 | 2 | 2 |
| `end` | 1 | 1 | 2 |

## Scenes

**`sentence`**: sentence (1 bar, 2 in the 60): the question and the sentence. On the navy page the question writes itself in (each glyph traces its outline, then fills), then "The cat sat on the" and a yellow slot with a caret blinking on the beat where the next word will go. Thin boxes draw around the tokens the text is cut into. In the 60 each token also shows its two numbers (its arrow in the toy), and a line says that real models use thousands.

**`arrows`**: arrows (1 bar in the 15, 2 in the 30 and 60): tokens become arrows. The sentence rises to the top of the page as a coordinate plane draws itself from the middle out; each word of the sentence flies down to the tip of its arrow as the arrow grows from the origin (The and the land on the same arrow), then the rest of the vocabulary appears kind by kind: animals, actions, people, places, each in its colour. Soft halos gather each kind; in the longer cuts they are named and neighbours pulse together. Words used alike point alike.

**`arith`**: arith (2 bars, 3 in the 60): directions carry meaning. The camera moves to the people; the step from man to woman draws as a yellow arrow, then slides, unchanged, to start at king's tip and lands next to queen. The formula above morphs as it happens: woman − man, then king − man + woman, then ≈ queen. A parallelogram closes. In the 60 copies of the same step fill the plane: one direction, one meaning, wherever it starts.

**`layers`**: layers (4 bars, the 60 only): a stack of layers. The plane tilts back into space and becomes the floor of a stack; the sentence's arrows rise through three more planes, each bending its grid (a small network) and moving every arrow a little (attention), the arrow of the turning toward where the places are as it climbs. Dotted lines trace each word up the stack; dots above it say a large model has dozens of layers.

**`attend`**: attend (2 bars, 3 in the 60): attention pulls the arrow. The sentence comes back along the top; its last word, the, looks back at every word so far: arcs drawn from it as thick as its attention weights (3%, 18%, 32%, 41%, 6%, computed from the toy's queries and keys). Each word's suggestion, its value arrow scaled by its weight, is added tip to tail from the tip of the's own arrow; the sum is the new arrow h, yellow, pointing toward the places. The formula h = x + Σ aⱼvⱼ writes alongside. In the 60 the weights' own formula comes first: aⱼ = softmax(q·kⱼ/√2).

**`probs`**: probs (2 bars, 3 in the 60): every word gets a score, then a probability. With the new arrow h in yellow the formula score(w) = h · w writes in. The whole plane turns until h points right, then squashes flat onto the line along h: every word's tip slides down to its projection (a dot product is a projection, times |h|). The line zooms in on the high end where the places land; each rises into a bar e^score tall, the formula morphs into softmax, and the bars settle into the chart: mat 55%, floor 23%, sofa 15%, bed 4.4%, roof 2.1%, the other ten words 0.5% together. In the 15, which has no attention scene, the arrow of the swings to h first; in the 60 the scores are read off the line.

**`temp`**: temp (3 bars, the 60 only): temperature. The softmax formula gains a /T in both exponents (a morph), a thermometer for T rises beside the chart, and the chart follows it live: turned down to T = 0.4 the model nearly always says mat; turned up to T = 2.5 the rarer words rise and the other ten words together get a real share; then back to 1.

**`sample`**: sample (1 bar in the 15, 2 in the 30 and 60): drawing the word. The bars lie down end to end into one strip from 0 to 1, each word's slice as wide as its probability. A needle runs along the strip, slowing, and stops at u = 0.31, inside mat's slice; mat flies up into the sentence. In the longer cuts it runs again and stops at 0.62, in floor's slice: another time the same sentence could end on the floor.

**`end`**: end (1 bar, 2 in the 60): the loop goes on. The sentence comes down to the middle of the page and keeps going, a word at a time, each new word flashing yellow as it is drawn: "The cat sat on the mat and purred." Then the idea in three short lines (words are arrows, context bends them, the next word points the same way) and the note that this was a two-dimensional toy. In the 60 the whole loop is laid out first: tokens, arrows, attention, scores, softmax, a draw.

## Provenance and credits

- The notes in `source/` and the toy model in `model-src/` were written for this example. The ideas it explains (tokens, embeddings, attention, softmax, temperature, sampling) are standard; no text, figure or frame is taken from any video, course or paper.
- Music and sound effects are synthesized by `audio/` (no samples).
- Fonts ship with their licences: `source/fonts/OFL.txt`.
